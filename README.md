# Swapcast

**Find the podcasts that should be promoting yours.**

[![CI](https://github.com/vikassharma270907-alt/swapcast/actions/workflows/ci.yml/badge.svg)](https://github.com/vikassharma270907-alt/swapcast/actions/workflows/ci.yml)

Repo: https://github.com/vikassharma270907-alt/swapcast · Live demo: https://swapcast-tau.vercel.app/ · License: MIT

> Add screenshots (Swap Board, pitch modal, agent trace) to `docs/` and link
> them here before submitting — judges look for a working visual.

Swapcast finds podcasts your size whose listeners like your show, checks that
the fit goes both ways with Qloo, drafts the promo-swap pitch with the evidence
baked in, and lists the brands your listeners already favor as sponsor leads.

---

## Screenshots

> Capture these from the live deployment (mode badge "Live Qloo"), save them in
> `docs/` with the names below, then push. See [`docs/README.md`](docs/README.md)
> for a capture checklist.

**Swap Board** — five size-matched partners, each with a two-way / one-sided badge and the Qloo rank evidence (`#fwdRank · #revRank`):

![Swapcast Swap Board showing five recommended partner podcasts, each with a two-way-match or one-sided badge and the Qloo forward and reverse rank evidence](docs/swap-board.png)

**Agent trace** — the live log of every Qloo call the run makes, proving the results are grounded:

![Swapcast agent trace panel listing step messages and live Qloo GET /v2/insights calls with HTTP 200 status and response times](docs/agent-trace.png)

**Pitch modal** — the drafted outreach the podcaster sends, with a one-click copy:

![Swapcast pitch modal showing a drafted promo-swap outreach message for one partner with a Copy pitch button](docs/pitch-modal.png)

---

## Problem

The median podcast episode gets about **27 downloads in its first week**
([Buzzsprout, Sep 2026](https://www.buzzsprout.com/stats)). The best free way to
grow a show is a **promo swap**: two shows promote each other. Swaps only work
when the partner's audience overlaps yours without competing head-on, and when
the partner is roughly your size. Finding that partner is guesswork today, and
an LLM on its own just names the famous shows in your genre, which are too big
to say yes and compete with you directly.

**User:** independent podcasters and small networks.

## How it works

```
Browser ──> GET  /api/search?q=   ──> Qloo /search (podcasts)
        └─> POST /api/plan {hostId}──> agent (LLM + tools) ──> Qloo /v2/insights x N
              streams NDJSON: {step} {qloo_call} {plan}
```

The agent runs a bounded tool loop (max 8 steps, 16 Qloo calls), streaming a
live trace of every call it makes:

1. **Resolve** the host show and read its popularity percentile.
2. **Listener profile** — top taste tags (`/v2/insights?filter.type=urn:tag`).
3. **Peer shows** in the host's popularity band
   (`filter.popularity.min/max`), widening the band `0.05 → 0.10 → 0.20` if
   there are too few.
4. **Two-way fit** — for each candidate, run the query in reverse and find where
   the host ranks in _their_ list.
5. **Sponsor leads** — brands the listeners favor
   (`filter.type=urn:entity:brand`), split into reachable vs. household names.
6. **Plan** — pick 5 partners, choose a format per partner, and draft a pitch.

The UI also shows a **counterfactual panel** next to the grounded Swap Board so
the gap is visible. There are two flavors, picked automatically:

- **`qloo+llm` mode** → "Plain LLM vs Swapcast": one extra, tool-free LLM call
  names partners from memory with no Qloo data.
- **`qloo-only` and `demo` modes** → "Popularity-only vs Swapcast": the host's
  overlapping peers ranked by raw popularity, with no size band and no two-way
  check (`lib/qloo.ts#findTopPopularPeers`).

Both represent the naive recommendation — the biggest names in the genre, too
large to say yes and direct competitors — against Swapcast's size-banded,
two-way-verified picks. The baseline is never trusted or cited; it exists only
to demonstrate what Qloo grounding adds.

### Qloo calls

| Tool | Qloo request (`GET`, `X-Api-Key`) |
|---|---|
| `get_listener_profile` | `/v2/insights?filter.type=urn:tag&signal.interests.entities={host}` |
| `find_peer_shows` | `/v2/insights?filter.type=urn:entity:podcast&signal.interests.entities={host}&filter.exclude.entities={host}&filter.popularity.min/max=…` |
| `check_two_way_fit` | per candidate: `/v2/insights?…&signal.interests.entities={candidate}`, then find the host's position |
| `find_sponsor_leads` | `/v2/insights?filter.type=urn:entity:brand&signal.interests.entities={host}` |

### Scoring

Qloo normalizes affinity _within_ each query, so raw scores are not comparable
across queries. Swapcast ranks instead:

- `fwdRank` — the candidate's position in the host's list.
- `revRank` — the host's position in the candidate's list (null if outside top 50).
- `weakest = max(fwdRank, revRank ?? 51)`, sorted ascending, ties broken by the
  popularity gap.
- **Two-way match**: both ranks ≤ 15. **One-sided**: only `fwdRank` is strong;
  the pitch then offers more (e.g. a guest read plus the promo).
- **Lane**: Jaccard overlap of genre tags. Same lane → guest swap; adjacent lane
  → promo swap.

## Why Qloo

**Without Qloo there is nothing left to show.** The ranking, the two-way check,
the size band, and the cross-domain brand leads all come from Qloo's taste
graph. Rephonic already does show-to-show overlap from Apple data; Qloo adds a
popularity band to find peers your size, two-way reverse checks, and a
cross-domain listener profile (brands, tags) for sponsor leads and pitch
evidence.

**Without the LLM it still works.** You lose the drafted pitch prose, but every
ranking, badge and lead stays. That is the `qloo-only` mode, and the app falls
back to it automatically if the model errors, times out, or no LLM key is set.

## Modes

| Mode | When | What you get |
|---|---|---|
| `qloo+llm` | `QLOO_API_KEY` **and** an LLM key set | Live rankings + LLM-drafted pitches |
| `qloo-only` | `QLOO_API_KEY` set, no LLM key | Live rankings + template pitches |
| `demo` | no `QLOO_API_KEY` | Synthetic, clearly-labeled sample data so the UI still runs end to end |

## Run locally

Requires Node 18.17+ (Node 20+ recommended).

```bash
npm install
cp .env.example .env.local   # then fill in QLOO_API_KEY
npm run dev                  # http://localhost:3000
```

Request a Qloo hackathon API key via the Qloo developer dashboard / the
hackathon Discord `#api-help`. Keys are issued by hand. The base URL must be
`https://hackathon.api.qloo.com` and the key goes in the `X-Api-Key` header.

Without a key the app boots in **demo mode** with synthetic data, so you can see
the full flow before a key arrives.

### Tests

Pure scoring and baseline logic have unit tests that run on Node's built-in test
runner with no extra dependencies (needs Node 22.6+ for native TypeScript
stripping):

```bash
npm test
```

They cover `jaccard`, `weakestLink`, `sizeMatchLabel`, `buildPartner`,
`rankCandidates`, `splitBrands`, and `buildPopularityBaseline` in
`lib/scoring.test.ts`.

## Deploy (Vercel)

### 1. Confirm no secrets are committed

`.env*` (except `.env.example`) and `probe-*.json` / `qloo-*.json` are already
in `.gitignore`. Before the first push, scan the working tree for your keys:

```powershell
# PowerShell — should print nothing
git grep -n -F $env:QLOO_API_KEY
git grep -n -F $env:OPENAI_API_KEY
```

### 2. Push to a public GitHub repo

```bash
git add .
git commit -m "Swapcast"
git branch -M main
git remote add origin https://github.com/vikassharma270907-alt/swapcast.git
git push -u origin main
```

> Already pushed to https://github.com/vikassharma270907-alt/swapcast — this
> section is kept for reference / re-cloning.

Make sure the repo visibility is **Public** and that GitHub's About box shows
"MIT license".

### 3. Import in Vercel and set env vars

1. In Vercel, "Add New → Project" and import the GitHub repo. It autodetects
   Next.js; no build settings to change.
2. Under Settings → Environment Variables (Production + Preview), add:
   - `QLOO_API_KEY` — your hackathon key (required for live results)
   - `QLOO_BASE_URL` = `https://hackathon.api.qloo.com`
   - `OPENAI_API_KEY` — optional, enables `qloo+llm` mode and the counterfactual panel
   - `LLM_BASE_URL` / `LLM_MODEL` — optional, for a non-OpenAI provider
3. Deploy. The `/api/plan` route sets `maxDuration = 60` for the streamed agent run.

Vercel Hobby is free and doesn't sleep, which matters because judging runs for
days. After the first deploy, every push to `main` redeploys automatically.

### 4. Verify the live deployment

- Open the Vercel URL in a **private window** (no login needed).
- Run one of the example chips end to end.
- Confirm the mode badge reads "Live Qloo" or "Live Qloo + LLM" (not "Demo").
- Paste the URL into the README header and your Devpost submission.

## Responsible data use

- The API key is **server-only**. It is never sent to the browser, never
  prefixed `NEXT_PUBLIC_`, and never logged in the trace.
- Only public show names and entity IDs go to Qloo — **no user personal data**.
- **No Qloo response data is stored in this repo.** `lib/demo.ts` is
  hand-authored synthetic data, clearly labeled as not from Qloo.
- "Qloo says" labels in the UI are kept separate from "Swapcast suggests".

## Known limitations

- Qloo results describe **aggregate** audience affinities, not individual listeners.
- Popularity is a **proxy for size**, not download counts.
- Brand affinity is **not ad-buying intent**.
- LLM-drafted pitches are **starting points** — edit before sending.
- Coverage of some shows in the hackathon dataset may be thin.

## Project layout

```
app/page.tsx              UI: picker → run → results
app/api/search/route.ts   GET autocomplete
app/api/plan/route.ts     POST agent run, streams NDJSON events
lib/qloo.ts               base URL, X-Api-Key, timeout, retries, TTL cache, trace hook
lib/tools.ts              agent tool definitions + server-side executors + ID whitelist
lib/agent.ts              LLM tool loop, whitelist enforcement, deterministic fallback
lib/pipeline.ts           deterministic runPipeline (qloo-only and demo modes)
lib/scoring.ts            ranks, weakest-link, Jaccard lane, brand tiers, template pitches
lib/demo.ts               synthetic sample data (NOT from Qloo)
lib/types.ts              shared types
```

## License

MIT. See [LICENSE](LICENSE).
