To: ian@qloo.com
Subject: Late Submission — Swapcast (Qloo Hackathon) — Request to Consider

Hi Ian,

I'm writing to submit my project, Swapcast, for the Qloo Hackathon. I sincerely
apologize for sending this past the deadline, and I'm sharing it in the hope you
can still consider it.

Reason for the late submission:
The project itself was finished within the hackathon scope, but I ran into a
last-minute problem when deploying and verifying the live build. Fixing the
deployment and confirming the demo worked end to end took longer than expected,
and by the time everything was stable and verified I had missed the cutoff by a
short margin. I didn't want to submit a broken or unverified link, so I chose to
make sure the demo was fully working first. I take full responsibility for the
timing and would be grateful for any look you can give it.

Here are the full project details:

Project name: Swapcast

Elevator pitch:
Swapcast finds podcasts your size whose listeners like yours, checks that yours
like them back, drafts the promo-swap pitch with Qloo evidence, and lists sponsor
leads.

What it does:
- Finds partner podcasts your size — pulls shows whose listeners overlap yours,
  filtered to a popularity band around your own size so suggestions are reachable.
- Checks fit both ways — runs each query in reverse to see where your show ranks
  in their listeners' list, flagging true two-way matches vs one-sided ones.
- Drafts the pitch — an editable, copyable promo-swap or guest-swap pitch with
  Qloo evidence baked in.
- Surfaces sponsor leads — brands your listeners already favor, split into
  reachable vs household names.
- Streams a live trace so you can watch each Qloo call happen.

How it's Qloo-powered (five call types):
1. /search to resolve a show name into an entity ID the user confirms.
2. /v2/insights with filter.type=urn:tag to build the listener taste profile.
3. /v2/insights on urn:entity:podcast with a filter.popularity.min/max band to
   find peers your size (band widens 0.05 -> 0.10 -> 0.20 when peers are thin).
4. Reverse insights queries per candidate to compute a two-way rank.
5. /v2/insights on urn:entity:brand for cross-domain sponsor leads.

How it's built:
Next.js (App Router) + TypeScript + Tailwind, deployed on Vercel. Server-only
Qloo client with retries, timeout, and TTL cache; an agent pipeline with band
widening and parallel reverse-rank checks; rank-based weakest-link scoring; and a
streaming NDJSON trace. Keys are server-only and no Qloo response data is committed.

Built with: Next.js, TypeScript, Tailwind CSS, Vercel, Qloo

Links:
- Live demo: https://swapcast-tau.vercel.app/
- Demo video: https://www.youtube.com/watch?v=B9qAJ9D5XDQ
- Public repo: https://github.com/vikassharma270907-alt/swapcast (MIT license)

I completely understand if the late timing means it can't be formally judged.
Either way, thank you for organizing the hackathon and for taking the time to look
at this. I'm happy to provide anything else you need.

Best regards,
Vikas Sharma
GitHub: https://github.com/vikassharma270907-alt
(Solo project — no additional team members)
