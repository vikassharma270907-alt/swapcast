# Qloo API key integration: blueprint for Swapcast

Checked on Oct 31, 2026, 08:14–08:50 IST, against the live API and this folder's code.
This file holds no key and no Qloo response data, so it is safe to commit.

---

## 0. The clock

- The Devpost deadline is **09:15 IST**. BLUEPRINT.md set the freeze at 08:45.
- Changing the deployed demo after the deadline may break the rules. Check https://qloo.devpost.com/rules before you deploy anything after 09:15.
- **Don't set the key in Vercel without fixes 1 and 2 below.** With a key and without the fixes, the example chips fail with a Qloo 400, and every live run searches the wrong size band.
- This folder is not a git repo and has no `node_modules`. I couldn't run the app, and I can't tell whether it has been pushed or deployed.

---

## 1. What the two URLs are

### docs.qloo.com developer guide
This is the official rulebook for the key. The points that matter for integration:
- The key works only on `https://hackathon.api.qloo.com`. Staging and production return 401.
- Send the key in the `X-Api-Key` header. A Bearer token or a query parameter doesn't work.
- `/v2/insights` is GET with query-string parameters, and it needs `filter.type`.
- Invalid parameters are dropped silently. You get a 200 with empty results, not an error.
- Private server-side caching is allowed for any length of time. Qloo data must not go into a public repo.
- Keys stay active through judging (to Nov 16) and are turned off afterwards. To get a higher quota, ask in Discord `#api-help`.

### hackathon.api.qloo.com
This is the API host, not a website. Its root returns a 401 JSON error. Observed responses:

| Request | Response |
|---|---|
| No key | 401 `No API key found in request` |
| Wrong key | 401 `API keys mismatch` |
| `Authorization: Bearer …` | 401 `No API key found in request` |
| Your key, `/search?types=urn:entity:podcast` | 200 in about 1 s |
| `/entities?filter.ids=…` | 400 `provide at least one of: "entity_ids" or any "external.*.ids"` |
| `/v2/insights` with `signal.interests.entities=demo:twist` | 400 `contains invalid entity ids` |

- Every response carries an `x-qloo-request-id` header. It isn't secret, so quote it when you ask for help in `#api-help`.
- CORS is open: `Access-Control-Allow-Origin: *` with all headers allowed. The API won't stop a browser from calling it, so keeping the key on the server is up to the app.
- Error bodies are JSON sent as `Content-Type: text/plain`. `res.json()` still parses them.

### Open questions from BLUEPRINT §0.2 and RESEARCH §9 that this check settled
- `/search` accepts `types=urn:entity:podcast`. Results are in `results[]`, with `entity_id`, `name`, `popularity`, `disambiguation`, `tags` and `types`.
- `/v2/insights` entities are in `results.entities[]`, and **`query.affinity` exists**.
- Taste-tag results are in `results.tags[]`, with `tag_id`, `name`, `popularity` and `query`.
- `/entities` takes `entity_ids`, not `filter.ids`.
- "This Week in Startups" and "99% Invisible" resolve by exact name. Lenny's show is listed as "Lenny's Podcast: Product | Growth | Career", so match on the start of the name.

---

## 2. Where the key stands now

- `.env.local` has `QLOO_API_KEY` (45 characters, printable ASCII, no quotes or spaces) and `QLOO_BASE_URL=https://hackathon.api.qloo.com`. **The key works.**
- I scanned the other 44 files in this folder and found no copy of the key.
- `.gitignore` covers `.env`, `.env.local` and `.env*.local`. It does **not** cover `.env.production` or `.env.development` (tested with `git check-ignore`).
- **Data flow.** The key goes from `.env.local` (or a Vercel env var) to `process.env.QLOO_API_KEY`, then to `KEY` in `lib/qloo.ts`, then into the `X-Api-Key` header in `qlooGet`. Only server routes import `lib/qloo.ts`. `app/page.tsx` imports types only, and those are removed at build time. Trace events carry the endpoint and parameters, never headers. The key stays on the server today.
- **Mode switch.** `hasQlooKey()` picks demo or live mode. `hasLlmKey()` picks `qloo-only` or `qloo+llm`.

---

## 3. Fixes, in order

### Before 09:15 (they block a live key)

**Fix 1. Host lookup sends the wrong parameter.** File: `lib/qloo.ts`, in `getEntity`.
Today Qloo answers this call with a 400. The `.catch` hides the error, so the host becomes "Selected show" with popularity 0.5, and peers are searched in the 0.45–0.55 band. "This Week in Startups" sits far above that. The LLM prompt also receives the name "Selected show".

```ts
const data = await qlooGet("/entities", { entity_ids: id }, trace).catch(() => null);
```

**Fix 2. Example chips send demo IDs to Qloo.** File: `app/api/plan/route.ts`. Replace the whole file:

```ts
import { NextRequest } from "next/server";
import { runAgent } from "@/lib/agent";
import { hasQlooKey, searchPodcasts } from "@/lib/qloo";
import { DEMO_HOSTS } from "@/lib/demo";
import type { TraceEvent } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  let hostId: string = typeof body?.hostId === "string" ? body.hostId : "";

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: TraceEvent) => {
        controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
      };
      try {
        if (!hostId) {
          send({ kind: "error", message: "Missing hostId." });
          return; // finally closes the stream; closing twice throws
        }
        // Example chips carry demo IDs. With a live key, swap in the real Qloo ID by name.
        if (hostId.startsWith("demo:") && hasQlooKey()) {
          const name = DEMO_HOSTS.find((h) => h.entity_id === hostId)?.name ?? "";
          const hits = name ? await searchPodcasts(name, send).catch(() => []) : [];
          const match = hits.find((h) => h.name.toLowerCase().startsWith(name.toLowerCase()));
          if (!match) {
            send({ kind: "error", message: "Couldn't find that example in Qloo. Search for the show instead." });
            return;
          }
          hostId = match.entity_id;
        }
        await runAgent(hostId, send);
      } catch {
        send({ kind: "error", message: "Something went wrong. Please try again." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
```

This version also fixes an existing bug: with a missing `hostId`, the old code called `controller.close()` twice. The generic error message in the `catch` is part of fix 3.

**Fix 3 (if time allows). Keep key text out of error messages.**
Node's `fetch` throws `Headers.append: "<value>" is an invalid header value` when a header value contains a line break. I tested this with a fake key. The app sends `err.message` to the browser in `/api/search`, `/api/plan`, and the "Agent error (…)" trace step in `lib/agent.ts`. A key pasted with a line break would therefore be shown to every visitor. The same applies to the LLM key in the `Authorization` header. Your current Qloo key passes the check below.

In `lib/qloo.ts`:
```ts
const RAW_KEY = (process.env.QLOO_API_KEY ?? "").trim();
// Header values must be printable ASCII. A bad paste makes fetch throw an error
// that quotes the key, so treat a malformed key as "no key".
const KEY = /^[\x21-\x7E]+$/.test(RAW_KEY) ? RAW_KEY : "";
if (RAW_KEY && !KEY) console.error("QLOO_API_KEY has invalid characters; using demo mode.");
```
In the `catch` inside `qlooGet`, replace `lastErr = err;` with:
```ts
lastErr = err instanceof Error && /^Qloo \d{3}$/.test(err.message) ? err : new Error("Qloo request failed");
```
In `lib/agent.ts`, check `LLM_KEY` with the same regex. In the final `catch` of `runAgent`, change the trace text to `"Agent error; using deterministic pipeline."`. In `app/api/search/route.ts`, return `error: "Search failed"` instead of `err.message`.

**Fix 4 (cheap, unverified). Round the band edges.** File: `lib/qloo.ts`, in `findPeerShows` and `reverseRank`:
```ts
"filter.popularity.min": clamp01(pMin).toFixed(3),
"filter.popularity.max": clamp01(pMax).toFixed(3),
```
For "This Week in Startups", band edges with 3 decimals returned 20 peers. A later call with full-precision edges, which is what `String(number)` sends today, returned 1. Two A/B retries timed out, so the cause is unconfirmed. Rounding does no harm, and it may decide whether the Swap Board fills up.

### Set the key in Vercel

1. Copy the key without printing it. Then paste it into Vercel and clear the clipboard:
   ```powershell
   ((Get-Content .env.local | Where-Object { $_ -match '^\s*QLOO_API_KEY\s*=' }) -replace '^\s*QLOO_API_KEY\s*=\s*', '').Trim() | Set-Clipboard
   # after pasting into Vercel:
   Set-Clipboard -Value " "
   ```
   If Windows clipboard history (Win+V) is on, delete the entry there too.
2. In Vercel, open Project → Settings → Environment Variables:
   - `QLOO_API_KEY`: type **Secret**, for Production (and Preview if you use preview URLs). Secret values can't be viewed after saving.
   - `QLOO_BASE_URL=https://hackathon.api.qloo.com`: type Config. This is optional because the code defaults to it.
3. **Redeploy.** Env var changes apply only to new deployments. Go to Deployments → latest → Redeploy, or push a commit.
4. Check in a private window. Run each example chip. The trace should show `Qloo GET /search · 200` and `/entities · 200`.
   The badge says "Live Qloo" whenever a key is set, even if every call fails. Trust the status codes in the trace, not the badge.

### Secret checks before any push

- In `.gitignore`, replace the three env lines with the following. I tested it: it ignores `.env`, `.env.local`, `.env.production` and `.env.development`, and keeps `.env.example`.
  ```
  .env*
  !.env.example
  ```
- `git grep` searches tracked files only, so before `git add` it finds nothing even when the key is in a file (tested). Scan the staged files instead:
  ```powershell
  $k = ((Get-Content .env.local | Where-Object { $_ -match '^\s*QLOO_API_KEY\s*=' }) -replace '^\s*QLOO_API_KEY\s*=\s*', '').Trim()
  if (-not $k) { throw "Could not read QLOO_API_KEY from .env.local" }
  git grep --cached -n -F -e $k; if ($LASTEXITCODE -eq 1) { "clean" }   # run after git add
  git log --all -S $k --oneline                                           # history: must print nothing
  Remove-Variable k
  ```
- The kit forbids credentials in recordings. Don't screenshot `.env.local` or Vercel's env var page.

### After 09:15 (only if the rules allow changes during judging)

- **Retry only on 429 and 5xx.** In `qlooGet`, the `throw` for other non-OK statuses lands in its own `catch`, so 400 and 401 responses are retried 3 times. A bad key triples every call. Use `if (!res.ok) { lastErr = new Error(\`Qloo ${res.status}\`); break; }`.
- **Settle fix 4.** For any host, run the same peer query once with band edges rounded to 3 decimals and once at full precision, then compare the counts.
- **Add `/api/health`.** One `/search?query=test&take=1` call that returns `{ qloo: "ok" | "unauthorized" | "missing" }`. This confirms the Vercel key without reading logs.
- **Add `import "server-only"`** at the top of `lib/qloo.ts` and `lib/agent.ts`, after `npm i server-only`. The build then fails if a client component ever imports them.
- **Log failures by status and `x-qloo-request-id` only.** Never log headers.
- **Fix the README.** Keys come from the API Key Request Form linked in the developer guide, not from a "developer dashboard".

### If the key leaks

Email ian@qloo.com. The kit's SUPPORT.md routes exposed credentials there, not to public channels. Request a new key, replace the Vercel Secret, redeploy, and remove the old key from git history. Never post the key or full request headers in Discord or GitHub discussions.

---

## Sources

- [Qloo Agentic Hackathon Developer Guide](https://docs.qloo.com/reference/qloo-llm-hackathon-developer-guide)
- [Kit: API access](https://github.com/qloo/qloo-hackathon-kit/blob/main/docs/API_ACCESS.md), [Safe use](https://github.com/qloo/qloo-hackathon-kit/blob/main/docs/SAFE_USE.md), [Support](https://github.com/qloo/qloo-hackathon-kit/blob/main/SUPPORT.md)
- [Qloo `/entities` parameters](https://github.com/qloo/docs-public/blob/main/reference/get-entities.md)
- [Next.js environment variables](https://nextjs.org/docs/app/guides/environment-variables), [server-only](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [Vercel: Config and Secret env var types](https://vercel.com/changelog/environment-variables-now-use-config-and-secret-types), [changes need a redeploy](https://vercel.com/docs/environment-variables/managing-environment-variables)
- Live checks against `hackathon.api.qloo.com` from this machine, 08:16–08:45 IST

*Content from these sources was paraphrased for licensing compliance.*
