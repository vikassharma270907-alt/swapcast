import {
  findPeerShows,
  findSponsorBrands,
  findTopPopularPeers,
  getEntity,
  getListenerTags,
  hasQlooKey,
  reverseRank,
  searchPodcasts,
} from "./qloo";
import {
  buildPartner,
  buildPopularityBaseline,
  rankCandidates,
  splitBrands,
  templatePitch,
} from "./scoring";
import type { Candidate, Entity, Plan, Trace } from "./types";
import type { TraceEvent } from "./types";
import {
  DEMO_HOSTS,
  demoBrands,
  demoPeers,
  demoReverseRank,
  demoTags,
} from "./demo";

export async function searchHosts(query: string, trace?: Trace): Promise<Entity[]> {
  if (!hasQlooKey()) {
    const q = query.toLowerCase();
    const match = DEMO_HOSTS.filter((h) => h.name.toLowerCase().includes(q));
    const rest = DEMO_HOSTS.filter((h) => !h.name.toLowerCase().includes(q));
    return [...match, ...rest];
  }
  return searchPodcasts(query, trace);
}

function emit(trace: Trace | undefined, e: TraceEvent) {
  trace?.(e);
}

export async function runPipeline(hostId: string, trace?: Trace): Promise<Plan> {
  const notes: string[] = [];

  // ---- DEMO MODE (no key) ----
  if (!hasQlooKey()) {
    emit(trace, { kind: "step", text: "No API key set - running in demo mode with synthetic data." });
    const base = DEMO_HOSTS.find((h) => h.entity_id === hostId) ?? DEMO_HOSTS[0];
    const host = { ...base, tags: demoTags() };
    emit(trace, { kind: "step", text: `Resolved host: ${host.name} (popularity ${host.popularity}).` });

    emit(trace, { kind: "step", text: "Pulled listener taste tags." });
    const peers = demoPeers(host.entity_id);
    emit(trace, { kind: "step", text: `Found ${peers.length} peer shows in the size band.` });

    const candidates: Candidate[] = peers.map((p, i) => ({
      ...p,
      fwdRank: i + 1,
      revRank: demoReverseRank(p.entity_id),
    }));
    emit(trace, { kind: "step", text: "Checked two-way fit for each candidate." });

    const ranked = rankCandidates(host, candidates).slice(0, 5);
    const partners = ranked.map((c) => {
      const base = buildPartner(host, c);
      return { ...base, pitch: templatePitch(host, base) };
    });

    emit(trace, { kind: "step", text: "Pulled sponsor-lead brands." });
    const brands = splitBrands(demoBrands());

    const topPopular = [...peers].sort(
      (a, b) => (b.popularity ?? 0) - (a.popularity ?? 0)
    );
    const baseline = buildPopularityBaseline(topPopular, partners);

    notes.push("Demo mode: data is synthetic, not from Qloo. Set QLOO_API_KEY for live results.");
    const plan: Plan = {
      host,
      profileTags: host.tags ?? [],
      partners,
      brands,
      mode: "demo",
      notes,
      ...(baseline ? { baseline } : {}),
    };
    emit(trace, { kind: "plan", plan });
    return plan;
  }

  // ---- LIVE QLOO MODE ----
  emit(trace, { kind: "step", text: "Resolving host show from Qloo." });
  let host = await getEntity(hostId, trace);
  if (!host) {
    // fall back to a minimal entity if /entities is unavailable
    host = { entity_id: hostId, name: "Selected show", tags: [] };
    notes.push("Could not fetch full host entity; using the selected ID.");
  }
  const p = host.popularity ?? 0.5;
  emit(trace, { kind: "step", text: `Host popularity ~${p.toFixed(2)}.` });

  emit(trace, { kind: "step", text: "Fetching listener taste profile." });
  const profileTags = await getListenerTags(hostId, trace).catch(() => []);
  if ((host.tags?.length ?? 0) === 0 && profileTags.length > 0) {
    host.tags = profileTags;
  }

  // band widening
  let band = 0.05;
  let peers = await findPeerShows(hostId, p - band, p + band, trace);
  for (const next of [0.1, 0.2]) {
    if (peers.length >= 8) break;
    band = next;
    emit(trace, { kind: "step", text: `Only ${peers.length} peers found; widening size band to +/-${band}.` });
    peers = await findPeerShows(hostId, p - band, p + band, trace);
  }
  emit(trace, { kind: "step", text: `Found ${peers.length} peer shows in the size band.` });

  // two-way checks on top 8
  const top = peers.slice(0, 8);
  emit(trace, { kind: "step", text: `Running reverse two-way checks on ${top.length} candidates.` });
  const revRanks = await Promise.all(
    top.map((c) => reverseRank(c.entity_id, hostId, p - band, p + band, trace).catch(() => null))
  );
  const candidates: Candidate[] = top.map((c, i) => ({
    ...c,
    fwdRank: peers.findIndex((x) => x.entity_id === c.entity_id) + 1,
    revRank: revRanks[i],
  }));

  const ranked = rankCandidates(host, candidates).slice(0, 5);
  const partners = ranked.map((c) => {
    const base = buildPartner(host as Entity, c);
    return { ...base, pitch: templatePitch(host as Entity, base) };
  });

  emit(trace, { kind: "step", text: "Fetching sponsor-lead brands." });
  const brandEntities = await findSponsorBrands(hostId, trace).catch(() => []);
  const brands = splitBrands(brandEntities).slice(0, 10);

  emit(trace, { kind: "step", text: "Building popularity-only baseline for comparison." });
  const topPopular = await findTopPopularPeers(hostId, trace).catch(() => []);
  const baseline = buildPopularityBaseline(topPopular, partners);

  const plan: Plan = {
    host,
    profileTags,
    partners,
    brands,
    mode: "qloo-only",
    notes,
    ...(baseline ? { baseline } : {}),
  };
  emit(trace, { kind: "plan", plan });
  return plan;
}
