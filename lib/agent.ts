import {
  findSponsorBrands,
  getEntity,
  getListenerTags,
  hasQlooKey,
} from "./qloo";
import { runPipeline } from "./pipeline";
import {
  buildPartner,
  rankCandidates,
  splitBrands,
  templatePitch,
} from "./scoring";
import {
  candidatesFromIds,
  newToolContext,
  runTool,
  TOOL_SCHEMAS,
} from "./tools";
import type { Baseline, Entity, Partner, Plan, Tag, Trace } from "./types";

const RAW_LLM_KEY = (process.env.OPENAI_API_KEY || process.env.LLM_API_KEY || "").trim();
// Same guard as the Qloo key: a key with non-ASCII/whitespace chars makes fetch
// throw an error that quotes the key value. Treat a malformed key as "no key".
const LLM_KEY = /^[\x21-\x7E]+$/.test(RAW_LLM_KEY) ? RAW_LLM_KEY : "";
const LLM_BASE =
  process.env.LLM_BASE_URL || "https://api.openai.com/v1";
const LLM_MODEL = process.env.LLM_MODEL || "gpt-4o-mini";
const MAX_STEPS = 8;
const LLM_TIMEOUT_MS = 25_000;

export function hasLlmKey(): boolean {
  return LLM_KEY.trim().length > 0;
}

const SYSTEM_PROMPT = `You are Swapcast, a growth agent for independent podcasters.
Goal: find 5 promo-swap partners for the host show and sponsor leads, using ONLY tool results.
Rules:
- Every partner/brand you cite must come from a tool result. Never invent shows, numbers, or facts.
- Prefer partners with strong two-way fit (both ranks <= 15) and similar size.
- Same-lane shows (shared genre tags) -> suggest a guest swap; adjacent lanes -> promo swap.
- If peers are too few (< 8), widen the popularity band (0.05 -> 0.10 -> 0.20) and say why.
- Qloo affinities are aggregate audience tendencies, not facts about individual listeners. Never claim causation or download numbers.
- Pitches: <= 90 words, specific about the overlap evidence, one concrete ask (format + episode window), a tracking link placeholder, "[Host name]" placeholder (no personal names).
Process:
1. Call get_listener_profile.
2. Call find_peer_shows(0.05); widen the band if fewer than 8 candidates.
3. Call check_two_way_fit on up to 8 candidate ids.
4. Call find_sponsor_leads.
5. Finish by calling submit_plan exactly once with 5 chosen partner ids (best two-way fit first) and a pitch for each.`;

const SUBMIT_SCHEMA = {
  type: "function",
  function: {
    name: "submit_plan",
    description: "Submit the final plan. Call exactly once at the end.",
    parameters: {
      type: "object",
      properties: {
        partners: {
          type: "array",
          maxItems: 5,
          items: {
            type: "object",
            properties: {
              entity_id: { type: "string" },
              pitch: { type: "string" },
            },
            required: ["entity_id", "pitch"],
            additionalProperties: false,
          },
        },
      },
      required: ["partners"],
      additionalProperties: false,
    },
  },
} as const;

type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: {
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }[];
  tool_call_id?: string;
};

async function llmChat(messages: ChatMessage[]): Promise<ChatMessage> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
  try {
    const res = await fetch(`${LLM_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LLM_KEY}`,
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        temperature: 0.3,
        messages,
        tools: [...TOOL_SCHEMAS, SUBMIT_SCHEMA],
        tool_choice: "auto",
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`LLM ${res.status}`);
    const data = await res.json();
    const msg = data?.choices?.[0]?.message;
    if (!msg) throw new Error("LLM returned no message");
    return msg as ChatMessage;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Unassisted-LLM baseline: ask the model to name swap partners with NO Qloo
 * data and NO tools. Used only for the counterfactual panel to show the gap.
 * Returns null on any error so it never blocks the real plan.
 */
async function getBaseline(hostName: string): Promise<Baseline | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(`${LLM_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LLM_KEY}`,
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content:
              "You are a plain language model with no external data. Answer only from memory.",
          },
          {
            role: "user",
            content: `Name 5 podcasts that "${hostName}" should do a promo swap with. Reply with ONLY a JSON array of 5 show-name strings, nothing else.`,
          },
        ],
      }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text: string = data?.choices?.[0]?.message?.content ?? "";
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return null;
    const partners = parsed
      .map((x) => String(x).trim())
      .filter(Boolean)
      .slice(0, 5);
    if (partners.length === 0) return null;
    return {
      partners,
      note: "No evidence. These are the model's guesses from memory, not checked against Qloo. They tend to be the biggest names in the genre — too large to say yes, and direct competitors.",
      source: "llm",
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Agentic run. Uses the LLM to drive tool calls and draft pitches, but all
 * ranks, numbers and the ID whitelist are enforced server-side. Falls back to
 * the deterministic pipeline on any error, timeout, or missing key.
 */
export async function runAgent(hostId: string, trace?: Trace): Promise<Plan> {
  if (!hasQlooKey() || !hasLlmKey()) {
    return runPipeline(hostId, trace);
  }

  try {
    trace?.({ kind: "step", text: "Resolving host show from Qloo." });
    let host = await getEntity(hostId, trace);
    if (!host) host = { entity_id: hostId, name: "Selected show", tags: [] };
    const p = host.popularity ?? 0.5;

    const profileTags: Tag[] = await getListenerTags(hostId, trace).catch(
      () => []
    );
    if ((host.tags?.length ?? 0) === 0 && profileTags.length > 0) {
      host.tags = profileTags;
    }

    const ctx = newToolContext(hostId, p, trace);
    const revRanks = new Map<string, number | null>();

    // Kick off the unassisted baseline in parallel; it only needs the host name
    // and must never sit on the critical path or block the real plan.
    const baselinePromise = getBaseline(host.name).catch(() => null);

    trace?.({ kind: "step", text: `Starting agent (model ${LLM_MODEL}).` });
    const messages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Host show id: ${hostId}. Name: ${host.name}. Popularity: ${p.toFixed(
          2
        )}. Find promo-swap partners and sponsor leads.`,
      },
    ];

    let submitted: { entity_id: string; pitch: string }[] | null = null;

    for (let step = 0; step < MAX_STEPS && !submitted; step++) {
      const reply = await llmChat(messages);
      messages.push(reply);
      const calls = reply.tool_calls ?? [];
      if (calls.length === 0) {
        // No tool call and no submit: nudge once, then stop.
        messages.push({
          role: "user",
          content:
            "Continue by calling a tool, or call submit_plan with 5 partners if you have enough data.",
        });
        continue;
      }

      for (const call of calls) {
        const name = call.function.name;
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(call.function.arguments || "{}");
        } catch {
          args = {};
        }

        if (name === "submit_plan") {
          const partners = Array.isArray(args.partners)
            ? (args.partners as { entity_id: string; pitch: string }[])
            : [];
          submitted = partners
            .filter(
              (x) => x && typeof x.entity_id === "string" && ctx.whitelist.has(x.entity_id)
            )
            .slice(0, 5);
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify({ ok: true }),
          });
          continue;
        }

        const result = await runTool(ctx, name, args);
        if (name === "check_two_way_fit" && result.ok) {
          const rows =
            (result.data as { results?: { entity_id: string; revRank: number | null }[] })
              ?.results ?? [];
          for (const r of rows) revRanks.set(r.entity_id, r.revRank);
        }
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result.ok ? result.data : { error: result.error }),
        });
      }
    }

    // If the LLM never submitted valid partners, fall back.
    if (!submitted || submitted.length === 0) {
      trace?.({
        kind: "step",
        text: "Agent produced no valid plan; using deterministic pipeline.",
      });
      return runPipeline(hostId, trace);
    }

    // Build the plan server-side. Ranks/numbers from the server; pitch from LLM.
    const chosenIds = submitted.map((s) => s.entity_id);
    const candidates = candidatesFromIds(ctx, chosenIds, revRanks);
    const ranked = rankCandidates(host, candidates);
    const pitchById = new Map(submitted.map((s) => [s.entity_id, s.pitch]));

    const partners: Partner[] = ranked.slice(0, 5).map((c) => {
      const base = buildPartner(host as Entity, c);
      const llmPitch = pitchById.get(c.entity_id)?.trim();
      return { ...base, pitch: llmPitch || templatePitch(host as Entity, base) };
    });

    // Sponsors come from the agent's tool call if it made one; otherwise fetch now.
    const sponsorSource =
      ctx.brands.length > 0
        ? ctx.brands
        : await findSponsorBrands(hostId, trace).catch(() => []);
    const brands = splitBrands(sponsorSource).slice(0, 10);

    const baseline = await baselinePromise;

    const plan: Plan = {
      host,
      profileTags,
      partners,
      brands,
      mode: "qloo+llm",
      notes: [],
      ...(baseline ? { baseline } : {}),
    };
    trace?.({ kind: "plan", plan });
    return plan;
  } catch (err) {
    // Do not surface the raw error: it can quote a key from a bad header value.
    console.error("Agent error:", (err as Error)?.message ?? err);
    trace?.({
      kind: "step",
      text: "Agent error; using deterministic pipeline.",
    });
    return runPipeline(hostId, trace);
  }
}
