import type { Baseline, Brand, Candidate, Entity, Partner } from "./types";

export function tagSet(e: Entity | undefined): Set<string> {
  const s = new Set<string>();
  for (const t of e?.tags ?? []) if (t.id) s.add(t.id);
  return s;
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  a.forEach((x) => {
    if (b.has(x)) inter++;
  });
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

export function sharedTagNames(host: Entity, cand: Entity, limit = 4): string[] {
  const hostIds = tagSet(host);
  const out: string[] = [];
  for (const t of cand.tags ?? []) {
    if (t.id && hostIds.has(t.id)) out.push(t.name);
    if (out.length >= limit) break;
  }
  return out;
}

export function sizeMatchLabel(hostPop?: number, candPop?: number): string {
  if (hostPop == null || candPop == null) return "size unknown";
  const diff = Math.abs(hostPop - candPop);
  if (diff <= 0.05) return "very close in size";
  if (diff <= 0.12) return "similar size";
  return "different size";
}

/** weakest-link ranking: worse of forward/reverse rank; missing reverse treated as 51 */
export function weakestLink(fwdRank: number, revRank: number | null): number {
  return Math.max(fwdRank, revRank ?? 51);
}

export function buildPartner(host: Entity, c: Candidate): Omit<Partner, "pitch"> {
  const shared = sharedTagNames(host, c);
  const lane: "same" | "adjacent" =
    jaccard(tagSet(host), tagSet(c)) >= 0.5 ? "same" : "adjacent";
  const format: Partner["format"] = lane === "same" ? "guest swap" : "promo swap";
  const twoWay = c.fwdRank <= 15 && c.revRank != null && c.revRank <= 15;
  return {
    entity_id: c.entity_id,
    name: c.name,
    image: c.image ?? null,
    popularity: c.popularity,
    fwdRank: c.fwdRank,
    revRank: c.revRank,
    weakest: weakestLink(c.fwdRank, c.revRank),
    twoWay,
    sizeMatch: sizeMatchLabel(host.popularity, c.popularity),
    lane,
    format,
    sharedTags: shared,
  };
}

export function rankCandidates(host: Entity, candidates: Candidate[]): Candidate[] {
  return [...candidates].sort((a, b) => {
    const wa = weakestLink(a.fwdRank, a.revRank);
    const wb = weakestLink(b.fwdRank, b.revRank);
    if (wa !== wb) return wa - wb;
    const ga = Math.abs((host.popularity ?? 0) - (a.popularity ?? 0));
    const gb = Math.abs((host.popularity ?? 0) - (b.popularity ?? 0));
    return ga - gb;
  });
}

export function splitBrands(brands: Entity[]): Brand[] {
  return brands.map((b) => ({
    entity_id: b.entity_id,
    name: b.name,
    popularity: b.popularity,
    tier: (b.popularity ?? 0) >= 0.95 ? "household" : "reachable",
  }));
}

/**
 * Popularity-only counterfactual baseline. Takes the host's peers ranked purely
 * by popularity (no size band, no two-way check) — the naive "biggest names"
 * list — and returns the top 5 names. This is the deterministic stand-in for a
 * plain-LLM baseline, so the counterfactual panel works without an LLM key.
 * Pure function; safe to unit-test.
 */
export function buildPopularityBaseline(
  topPopular: Entity[],
  chosen: Pick<Partner, "entity_id">[]
): Baseline | null {
  const names = topPopular
    .map((e) => e.name)
    .filter(Boolean)
    .slice(0, 5);
  if (names.length === 0) return null;
  const top5 = topPopular.slice(0, 5);
  const overlap = chosen.filter((p) =>
    top5.some((e) => e.entity_id === p.entity_id)
  ).length;
  const note =
    overlap === 0
      ? "Popularity-only. These are the biggest shows whose listeners overlap yours — none made Swapcast's size-banded, two-way-verified list. They're the classic popularity trap: too large to swap and direct competitors."
      : "Popularity-only. The biggest shows whose listeners overlap yours, ranked by raw popularity with no size band and no two-way check.";
  return { partners: names, note, source: "popularity" };
}

export function templatePitch(host: Entity, p: Omit<Partner, "pitch">): string {
  const overlap =
    p.sharedTags.length > 0
      ? `We share listener tastes around ${p.sharedTags.slice(0, 3).join(", ")}.`
      : `Qloo shows our audiences overlap strongly.`;
  const evidence = p.twoWay
    ? `Qloo ranks you #${p.fwdRank} for my listeners, and me #${p.revRank} for yours, so the fit goes both ways.`
    : `Qloo ranks you #${p.fwdRank} for my listeners.`;
  const ask =
    p.format === "guest swap"
      ? `Want to trade guest spots in the next 2-3 week window?`
      : `Want to run a promo swap in the next 2-3 week window?`;
  const give = p.twoWay
    ? ``
    : ` I'm happy to lead with extra value, say a guest read plus the promo.`;
  return `Hi [Partner host], I'm [Host name] from "${host.name}". ${overlap} ${evidence} ${ask}${give} I'll send a unique tracking link so we can both measure lift. No pressure either way, thanks for considering it.`;
}
