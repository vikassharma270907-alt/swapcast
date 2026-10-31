# Swapcast — Devpost Submission

## Project name
Swapcast

## Elevator pitch (≤200 characters)
Swapcast finds podcasts your size whose listeners like yours, checks that yours like them back, drafts the promo-swap pitch with Qloo evidence, and lists sponsor leads.

---

## Inspiration
The median podcast episode gets about 27 downloads in its first week (Buzzsprout, Sep 2026). We kept hearing the same advice for growing a small show: do a promo swap, where two shows promote each other. It is the best free growth tactic, and platforms like Spotify recommend it. But it only works with the right partner, one who is roughly your size, sits in an adjacent lane instead of competing head-on, and whose audience actually likes your show back. Finding that partner is pure guesswork today. A plain LLM just lists the famous shows in your genre, and those shows are too big to say yes and compete with you directly. We wanted a tool that uses a real taste graph to answer the question a podcaster actually has: "Who should I swap with, what do I offer, and how do I ask?"

## What it does
- **Finds partners your size.** You pick your show (you confirm the exact match, the agent never guesses). Swapcast pulls podcasts whose listeners overlap yours, filtered to a popularity band around your own size so the suggestions are reachable.
- **Checks the fit both ways.** For each candidate it runs the query in reverse to see where *your* show ranks in *their* listeners' list. A two-way match (strong in both directions) is flagged separately from a one-sided one.
- **Drafts the pitch.** Each partner gets an editable, copyable promo-swap or guest-swap pitch with the Qloo evidence baked in and a tracking-link reminder so both sides can measure lift.
- **Surfaces sponsor leads.** It lists brands your listeners already favor, split into reachable vs household names.

The whole run streams a live trace so you can watch each Qloo call happen.

**The agent loop:** resolve show → listener taste profile → peer shows in your size band (widen the band if too few) → reverse two-way rank checks on the top candidates → sponsor brands → rank by weakest-link and draft pitches.

## What makes it Qloo-powered
Swapcast uses five kinds of Qloo calls, and it would not work without them:
1. **`/search`** to resolve a show name into an entity ID the user confirms.
2. **`/v2/insights` with `filter.type=urn:tag`** to build the listener taste profile.
3. **`/v2/insights` on `urn:entity:podcast` with a `filter.popularity.min/max` band** to find peers your size, not just the biggest shows in the genre. The agent widens the band (0.05 → 0.10 → 0.20) when peers are thin and logs that decision.
4. **Reverse insights queries** per candidate to compute a two-way rank — a non-obvious use of the taste graph that checks whether their listeners like you back, not just the other way around.
5. **`/v2/insights` on `urn:entity:brand`** for a cross-domain sponsor-lead list.

Scoring uses ranks inside a shared size band rather than raw affinity scores, because Qloo normalizes affinity within each query, so ranks compare cleanly while raw scores across queries do not. We sort by `weakest = max(fwdRank, revRank ?? 51)`.

**If it would work the same without Qloo, it is the wrong thing.** Remove Qloo and there is nothing left: no size band, no two-way check, no cross-domain brands. (Remove the LLM and it still works — the deterministic pipeline produces every ranking and falls back to template pitches. Only the pitch prose is lost.)

## How we built it
- **Next.js (App Router) + TypeScript + Tailwind**, one repo for UI and server routes, deployed on Vercel.
- **Server-only Qloo client** (`lib/qloo.ts`): `X-Api-Key` header, 8s timeout, two retries with backoff on 429/5xx, a 6-hour in-memory TTL cache keyed by request, and a trace callback that never logs the key.
- **Agent pipeline** (`lib/pipeline.ts`): the tool loop with band widening, parallel reverse-rank checks, and a deterministic fallback that runs the same steps if the model is slow or unavailable.
- **Scoring** (`lib/scoring.ts`): weakest-link ranking, Jaccard on genre tags to decide same-lane (guest swap) vs adjacent-lane (promo swap), size-match labels.
- **Streaming trace**: `/api/plan` streams NDJSON events (`step`, `qloo_call`, `plan`) that the UI renders live.
- **Guards**: every cited ID comes from a Qloo result; numbers shown in the UI come from the server, never from LLM free text. Keys are server-only, `.env*` is gitignored, and no Qloo response data is committed.

## Challenges we ran into
- **Comparing affinity across queries.** Qloo normalizes affinity within each query, so raw scores are not comparable across calls. We switched to rank-based scoring inside a shared popularity band, which is both correct and easier for a user to read.
- **Thin peer results for some shows.** Small or niche shows returned few peers in a tight band, so the agent widens the band in steps and records why in the trace.
- **Latency inside a serverless timeout.** Reverse checks multiply the number of calls, so we run them in parallel, cap `take`, cache aggressively, and stream partial progress to stay well under the limit.
- **Keeping evidence honest.** We separated "Qloo says" (ranks, tags, brands) from "Swapcast suggests" (format, pitch) throughout the UI so nothing reads as a claim about an individual listener.

## What we learned
- Two-way (reverse) querying turns a recommendation API into a genuine matching tool — it is the single most useful thing we did with Qloo.
- Popularity bands are the difference between "name-drop the biggest show in the genre" and "find a partner who might actually say yes."
- A deterministic fallback is not just a safety net; it forced a clean separation between facts (from Qloo) and prose (from the LLM), which made the whole product more trustworthy.

## What's next
- Per-partner tracking links and a lightweight dashboard to measure swap lift.
- A "Plain LLM vs Swapcast" panel showing judges the gap between a model's guess and evidence-backed matches.
- Shared-ground detail per partner via `/v2/analysis/compare`.
- A white-label "Grow" tab for podcast hosting platforms, and later an opt-in swap-and-sponsor marketplace.

## Limitations
- Qloo results describe aggregate audience affinities, not facts about individual listeners.
- Popularity is a proxy for size, not download counts.
- Brand affinity is not ad-buying intent.
- LLM-drafted pitches are starting points — edit before sending.

---

## Built with
nextjs, typescript, tailwindcss, vercel, qloo

## Links
- **Live demo:** https://swapcast-tau.vercel.app/
- **Public repo:** https://github.com/vikassharma270907-alt/swapcast

## Screenshots to upload (3)
1. The Swap Board with two-way match badges.
2. The pitch modal with the copy button.
3. The live agent trace listing Qloo calls.

---

## Submission checklist (verify in a private window)
- [x] Repo is public — https://github.com/vikassharma270907-alt/swapcast
- [x] No secrets committed — `.env.local` gitignored; `git ls-files` confirms the key file is untracked; `git grep` against the committed tree found no key
- [x] No Qloo response JSON committed — `probe-*.json` / `qloo-*.json` gitignored; only hand-authored `lib/demo.ts` sample data is in the repo
- [x] Production build passes — `next build` green (compile + type-check + static gen)
- [x] Qloo API verified live — `/search` and `/v2/insights` both return real data with the committed parsing
- [x] Live demo deployed — https://swapcast-tau.vercel.app/
- [ ] Demo works end to end without logging in — **verify in a private window (see check below)**
- [ ] MIT license visible in the repo About section — confirm GitHub detected `LICENSE` (set license in repo Settings → General if the About box is blank)
- [ ] Live demo URL added to this file and the README header
- [ ] Description filled in (all sections above)
- [ ] Every team member added on Devpost
- [ ] Clicked **Submit**, not just Save
