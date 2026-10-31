import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPartner,
  buildPopularityBaseline,
  jaccard,
  rankCandidates,
  sizeMatchLabel,
  splitBrands,
  tagSet,
  weakestLink,
} from "./scoring";
import type { Candidate, Entity } from "./types";

function entity(id: string, name: string, pop: number, tags: string[] = []): Entity {
  return {
    entity_id: id,
    name,
    popularity: pop,
    tags: tags.map((t) => ({ name: t, id: `t:${t}` })),
  };
}

function candidate(
  id: string,
  name: string,
  pop: number,
  fwdRank: number,
  revRank: number | null,
  tags: string[] = []
): Candidate {
  return { ...entity(id, name, pop, tags), fwdRank, revRank };
}

test("jaccard: identical sets = 1, disjoint = 0", () => {
  const a = new Set(["x", "y"]);
  const b = new Set(["x", "y"]);
  const c = new Set(["z"]);
  assert.equal(jaccard(a, b), 1);
  assert.equal(jaccard(a, c), 0);
  assert.equal(jaccard(new Set(), a), 0); // empty guard
});

test("jaccard: partial overlap", () => {
  const a = new Set(["x", "y", "z"]);
  const b = new Set(["y", "z", "w"]);
  // intersection 2, union 4 => 0.5
  assert.equal(jaccard(a, b), 0.5);
});

test("tagSet pulls ids and ignores empties", () => {
  const e = entity("h", "Host", 0.5, ["a", "b"]);
  const s = tagSet(e);
  assert.ok(s.has("t:a") && s.has("t:b"));
  assert.equal(tagSet(undefined).size, 0);
});

test("weakestLink: missing reverse rank treated as 51", () => {
  assert.equal(weakestLink(3, 9), 9);
  assert.equal(weakestLink(3, null), 51);
  assert.equal(weakestLink(20, 5), 20);
});

test("sizeMatchLabel thresholds", () => {
  assert.equal(sizeMatchLabel(0.8, 0.8), "very close in size");
  assert.equal(sizeMatchLabel(0.8, 0.72), "similar size");
  assert.equal(sizeMatchLabel(0.8, 0.5), "different size");
  assert.equal(sizeMatchLabel(undefined, 0.5), "size unknown");
});

test("buildPartner: two-way match + same lane => guest swap", () => {
  const host = entity("h", "Host", 0.8, ["startups", "interview"]);
  const c = candidate("p1", "Peer", 0.78, 2, 4, ["startups", "interview"]);
  const p = buildPartner(host, c);
  assert.equal(p.twoWay, true);
  assert.equal(p.lane, "same");
  assert.equal(p.format, "guest swap");
  assert.deepEqual(p.sharedTags.sort(), ["interview", "startups"]);
});

test("buildPartner: one-sided + adjacent lane => promo swap", () => {
  const host = entity("h", "Host", 0.8, ["startups", "interview"]);
  const c = candidate("p2", "Peer", 0.6, 3, null, ["design"]);
  const p = buildPartner(host, c);
  assert.equal(p.twoWay, false);
  assert.equal(p.lane, "adjacent");
  assert.equal(p.format, "promo swap");
  assert.equal(p.weakest, 51);
});

test("rankCandidates: best weakest-link first, popularity gap breaks ties", () => {
  const host = entity("h", "Host", 0.8, []);
  const strong = candidate("a", "Strong", 0.79, 2, 3); // weakest 3
  const weak = candidate("b", "Weak", 0.78, 1, 40); // weakest 40
  const tieClose = candidate("c", "Close", 0.8, 5, 5); // weakest 5, gap 0
  const tieFar = candidate("d", "Far", 0.6, 5, 5); // weakest 5, gap 0.2
  const ranked = rankCandidates(host, [weak, tieFar, tieClose, strong]);
  assert.deepEqual(
    ranked.map((c) => c.entity_id),
    ["a", "c", "d", "b"]
  );
});

test("splitBrands: tiered at 0.95", () => {
  const brands = splitBrands([
    entity("b1", "Big", 0.97),
    entity("b2", "Small", 0.6),
    entity("b3", "Edge", 0.95),
  ]);
  const byId = Object.fromEntries(brands.map((b) => [b.entity_id, b.tier]));
  assert.equal(byId["b1"], "household");
  assert.equal(byId["b2"], "reachable");
  assert.equal(byId["b3"], "household"); // >= 0.95 is household
});

test("buildPopularityBaseline: empty input => null", () => {
  assert.equal(buildPopularityBaseline([], []), null);
});

test("buildPopularityBaseline: top 5 names, no overlap note", () => {
  const top = [
    entity("x1", "Giant A", 0.99),
    entity("x2", "Giant B", 0.98),
    entity("x3", "Giant C", 0.97),
    entity("x4", "Giant D", 0.96),
    entity("x5", "Giant E", 0.95),
    entity("x6", "Giant F", 0.94),
  ];
  const chosen = [{ entity_id: "small1" }, { entity_id: "small2" }];
  const b = buildPopularityBaseline(top, chosen);
  assert.ok(b);
  assert.equal(b!.source, "popularity");
  assert.equal(b!.partners.length, 5);
  assert.equal(b!.partners[0], "Giant A");
  assert.ok(b!.note.includes("none made"));
});

test("buildPopularityBaseline: overlap => softer note", () => {
  const top = [entity("x1", "Giant A", 0.99), entity("x2", "Giant B", 0.98)];
  const chosen = [{ entity_id: "x1" }];
  const b = buildPopularityBaseline(top, chosen);
  assert.ok(b);
  assert.ok(!b!.note.includes("none made"));
});
