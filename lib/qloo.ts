import type { Entity, Tag, Trace } from "./types";
export type { Trace } from "./types";

const BASE = process.env.QLOO_BASE_URL || "https://hackathon.api.qloo.com";
const RAW_KEY = (process.env.QLOO_API_KEY ?? "").trim();
// Header values must be printable ASCII. A bad paste (e.g. a line break) makes
// fetch throw an error that quotes the key, so treat a malformed key as "no key".
const KEY = /^[\x21-\x7E]+$/.test(RAW_KEY) ? RAW_KEY : "";
if (RAW_KEY && !KEY) {
  console.error("QLOO_API_KEY has invalid characters; falling back to demo mode.");
}

export function hasQlooKey(): boolean {
  return KEY.trim().length > 0;
}

type CacheEntry = { at: number; data: any };
const cache = new Map<string, CacheEntry>();
const TTL_MS = 6 * 60 * 60 * 1000; // 6h

async function qlooGet(
  path: string,
  params: Record<string, string | number | undefined>,
  trace?: Trace
): Promise<any> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && String(v).length > 0) qs.set(k, String(v));
  }
  const url = `${BASE}${path}?${qs.toString()}`;
  const cacheKey = url;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < TTL_MS) {
    trace?.({ kind: "qloo_call", endpoint: path, params: qs.toString(), status: 200, ms: 0 });
    return cached.data;
  }

  const maxAttempts = 3;
  let lastErr: any = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const started = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(url, {
        headers: { "X-Api-Key": KEY },
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(timer);
      const ms = Date.now() - started;
      trace?.({ kind: "qloo_call", endpoint: path, params: qs.toString(), status: res.status, ms });

      if (res.status === 429 || res.status >= 500) {
        lastErr = new Error(`Qloo ${res.status}`);
        await new Promise((r) => setTimeout(r, 300 * attempt));
        continue;
      }
      // Other non-OK statuses (400/401/403) will not change on retry; fail fast.
      if (!res.ok) {
        lastErr = new Error(`Qloo ${res.status}`);
        break;
      }
      const data = await res.json();
      cache.set(cacheKey, { at: Date.now(), data });
      return data;
    } catch (err) {
      clearTimeout(timer);
      // Never keep a raw fetch error: its message can quote the key (invalid
      // header value) or other internals. Keep only our own "Qloo <status>".
      lastErr =
        err instanceof Error && /^Qloo \d{3}$/.test(err.message)
          ? err
          : new Error("Qloo request failed");
      await new Promise((r) => setTimeout(r, 300 * attempt));
    }
  }
  throw lastErr ?? new Error("Qloo request failed");
}

function mapEntity(e: any): Entity {
  const tags: Tag[] = Array.isArray(e?.tags)
    ? e.tags.map((t: any) => ({ name: t?.name ?? t?.tag ?? "", id: t?.tag_id ?? t?.id ?? "", type: t?.type }))
    : [];
  return {
    entity_id: e?.entity_id ?? e?.id ?? "",
    name: e?.name ?? "",
    popularity: typeof e?.popularity === "number" ? e.popularity : undefined,
    subtype: e?.subtype,
    image: e?.properties?.image?.url ?? e?.properties?.image ?? null,
    tags,
  };
}

export async function searchPodcasts(query: string, trace?: Trace): Promise<Entity[]> {
  const data = await qlooGet(
    "/search",
    { query, types: "urn:entity:podcast", take: 8 },
    trace
  );
  const arr = data?.results ?? data?.entities ?? [];
  return (Array.isArray(arr) ? arr : []).map(mapEntity).filter((e) => e.entity_id && e.name);
}

export async function getEntity(id: string, trace?: Trace): Promise<Entity | null> {
  const data = await qlooGet("/entities", { entity_ids: id }, trace).catch(() => null);
  const arr = data?.results ?? data?.entities ?? [];
  const first = Array.isArray(arr) ? arr[0] : null;
  return first ? mapEntity(first) : null;
}

export async function getListenerTags(hostId: string, trace?: Trace): Promise<Tag[]> {
  const data = await qlooGet(
    "/v2/insights",
    { "filter.type": "urn:tag", "signal.interests.entities": hostId, take: 15 },
    trace
  );
  const arr = data?.results?.tags ?? data?.results?.entities ?? [];
  return (Array.isArray(arr) ? arr : [])
    .map((t: any) => ({ name: t?.name ?? "", id: t?.tag_id ?? t?.entity_id ?? t?.id ?? "", type: t?.type }))
    .filter((t: Tag) => t.name);
}

export async function findPeerShows(
  hostId: string,
  pMin: number,
  pMax: number,
  trace?: Trace
): Promise<Entity[]> {
  const data = await qlooGet(
    "/v2/insights",
    {
      "filter.type": "urn:entity:podcast",
      "signal.interests.entities": hostId,
      "filter.exclude.entities": hostId,
      // Round to 3 decimals: full-precision float edges appear to shrink results.
      "filter.popularity.min": clamp01(pMin).toFixed(3),
      "filter.popularity.max": clamp01(pMax).toFixed(3),
      take: 20,
    },
    trace
  );
  const arr = data?.results?.entities ?? [];
  return (Array.isArray(arr) ? arr : []).map(mapEntity).filter((e) => e.entity_id);
}

/**
 * Peers WITHOUT a size band and WITHOUT a two-way check, sorted by raw
 * popularity. This is the naive "biggest names in the genre" list an
 * unassisted recommender produces — the popularity trap. Used only to build the
 * counterfactual baseline, never for the real Swap Board.
 */
export async function findTopPopularPeers(
  hostId: string,
  trace?: Trace
): Promise<Entity[]> {
  const data = await qlooGet(
    "/v2/insights",
    {
      "filter.type": "urn:entity:podcast",
      "signal.interests.entities": hostId,
      "filter.exclude.entities": hostId,
      take: 20,
    },
    trace
  );
  const arr = data?.results?.entities ?? [];
  const peers = (Array.isArray(arr) ? arr : []).map(mapEntity).filter((e) => e.entity_id);
  return peers.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
}

export async function reverseRank(
  candidateId: string,
  hostId: string,
  pMin: number,
  pMax: number,
  trace?: Trace
): Promise<number | null> {
  const data = await qlooGet(
    "/v2/insights",
    {
      "filter.type": "urn:entity:podcast",
      "signal.interests.entities": candidateId,
      "filter.popularity.min": clamp01(pMin).toFixed(3),
      "filter.popularity.max": clamp01(pMax).toFixed(3),
      take: 50,
    },
    trace
  );
  const arr: any[] = data?.results?.entities ?? [];
  const idx = arr.findIndex((e) => (e?.entity_id ?? e?.id) === hostId);
  return idx === -1 ? null : idx + 1;
}

export async function findSponsorBrands(hostId: string, trace?: Trace): Promise<Entity[]> {
  const data = await qlooGet(
    "/v2/insights",
    { "filter.type": "urn:entity:brand", "signal.interests.entities": hostId, take: 20 },
    trace
  );
  const arr = data?.results?.entities ?? [];
  return (Array.isArray(arr) ? arr : []).map(mapEntity).filter((e) => e.entity_id);
}

export function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
