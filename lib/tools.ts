import {
  findPeerShows,
  findSponsorBrands,
  getListenerTags,
  reverseRank,
} from "./qloo";
import type { Candidate, Entity, Trace } from "./types";

/**
 * Server-side tool layer for the Swapcast agent.
 *
 * Each tool wraps a Qloo call in lib/qloo.ts and records every entity_id it
 * returns into a whitelist. The agent's final plan is validated against this
 * whitelist so the LLM can never cite a show or brand that did not come from a
 * real Qloo result.
 */

export type ToolContext = {
  hostId: string;
  hostPopularity: number;
  trace?: Trace;
  /** IDs that came from a Qloo tool result this run. */
  whitelist: Set<string>;
  /** Peer entities seen this run, keyed by id, for scoring/enrichment. */
  seenPeers: Map<string, Entity>;
  /** Forward-rank order of peers as first returned, for fwdRank. */
  peerOrder: string[];
  /** Sponsor-lead brands fetched this run. */
  brands: Entity[];
  band: number;
};

export function newToolContext(
  hostId: string,
  hostPopularity: number,
  trace?: Trace
): ToolContext {
  const ctx: ToolContext = {
    hostId,
    hostPopularity,
    trace,
    whitelist: new Set<string>([hostId]),
    seenPeers: new Map<string, Entity>(),
    peerOrder: [],
    brands: [],
    band: 0.05,
  };
  return ctx;
}

function remember(ctx: ToolContext, entities: Entity[]) {
  for (const e of entities) {
    if (!e.entity_id) continue;
    ctx.whitelist.add(e.entity_id);
    ctx.seenPeers.set(e.entity_id, e);
  }
}

/** JSON-schema tool definitions in the OpenAI-compatible "tools" format. */
export const TOOL_SCHEMAS = [
  {
    type: "function",
    function: {
      name: "get_listener_profile",
      description:
        "Return the top taste tags of the host show's listeners. Call once early.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "find_peer_shows",
      description:
        "Find candidate partner podcasts in the host's size band. band is the +/- popularity window (0.05, 0.10 or 0.20). Returns candidates with forward rank, popularity and shared tags.",
      parameters: {
        type: "object",
        properties: {
          band: {
            type: "number",
            enum: [0.05, 0.1, 0.2],
            description: "popularity window around the host, +/- this value",
          },
        },
        required: ["band"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_two_way_fit",
      description:
        "For up to 8 candidate ids, run the reverse query from each candidate and return where the host ranks in their list (revRank, or null if outside top 50). Only pass ids returned by find_peer_shows.",
      parameters: {
        type: "object",
        properties: {
          ids: {
            type: "array",
            items: { type: "string" },
            maxItems: 8,
            description: "candidate entity_ids from find_peer_shows",
          },
        },
        required: ["ids"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_sponsor_leads",
      description:
        "Return brands the host's listeners favor, as sponsor leads. Call once.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
] as const;

export type ToolResult = {
  ok: boolean;
  data?: unknown;
  error?: string;
};

/** Execute a tool call by name. Updates the whitelist as a side effect. */
export async function runTool(
  ctx: ToolContext,
  name: string,
  args: Record<string, unknown>
): Promise<ToolResult> {
  try {
    switch (name) {
      case "get_listener_profile": {
        const tags = await getListenerTags(ctx.hostId, ctx.trace);
        return { ok: true, data: { tags } };
      }
      case "find_peer_shows": {
        const bandRaw = Number(args.band ?? 0.05);
        const band = [0.05, 0.1, 0.2].includes(bandRaw) ? bandRaw : 0.05;
        ctx.band = band;
        const p = ctx.hostPopularity;
        const peers = await findPeerShows(
          ctx.hostId,
          p - band,
          p + band,
          ctx.trace
        );
        remember(ctx, peers);
        // Record forward order the first time we see each peer.
        for (const peer of peers) {
          if (peer.entity_id && !ctx.peerOrder.includes(peer.entity_id)) {
            ctx.peerOrder.push(peer.entity_id);
          }
        }
        return {
          ok: true,
          data: {
            band,
            count: peers.length,
            candidates: peers.map((peer, i) => ({
              entity_id: peer.entity_id,
              name: peer.name,
              popularity: peer.popularity,
              fwdRank: ctx.peerOrder.indexOf(peer.entity_id) + 1 || i + 1,
              tags: (peer.tags ?? []).map((t) => t.name).slice(0, 6),
            })),
          },
        };
      }
      case "check_two_way_fit": {
        const ids = Array.isArray(args.ids)
          ? (args.ids as unknown[]).map(String).slice(0, 8)
          : [];
        const valid = ids.filter((id) => ctx.whitelist.has(id));
        const p = ctx.hostPopularity;
        const results = await Promise.all(
          valid.map(async (id) => {
            const revRank = await reverseRank(
              id,
              ctx.hostId,
              p - ctx.band,
              p + ctx.band,
              ctx.trace
            ).catch(() => null);
            return { entity_id: id, revRank };
          })
        );
        return { ok: true, data: { results } };
      }
      case "find_sponsor_leads": {
        const brands = await findSponsorBrands(ctx.hostId, ctx.trace);
        remember(ctx, brands);
        ctx.brands = brands;
        return {
          ok: true,
          data: {
            brands: brands.map((b) => ({
              entity_id: b.entity_id,
              name: b.name,
              popularity: b.popularity,
            })),
          },
        };
      }
      default:
        return { ok: false, error: `Unknown tool: ${name}` };
    }
  } catch (err) {
    return { ok: false, error: String((err as Error)?.message ?? err) };
  }
}

/** Build Candidate objects from the ids the agent chose, using remembered peers. */
export function candidatesFromIds(
  ctx: ToolContext,
  ids: string[],
  revRanks: Map<string, number | null>
): Candidate[] {
  const out: Candidate[] = [];
  for (const id of ids) {
    const peer = ctx.seenPeers.get(id);
    if (!peer) continue;
    const fwdRank = ctx.peerOrder.indexOf(id) + 1 || out.length + 1;
    out.push({ ...peer, fwdRank, revRank: revRanks.get(id) ?? null });
  }
  return out;
}
