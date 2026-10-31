# Deploy Swapcast (fast path)

Run these from `d:\qloo hackathon`. You need Node 18.17+ and a GitHub account. The sandbox blocks npm/node for the agent, so run these yourself in a normal terminal.

## 1. Verify it compiles (do this first)

```powershell
npm install
npm run build
```

If the build fails, paste the error back and it gets fixed. Do not skip this.

## 2. Try it locally (optional, 1 min)

```powershell
npm run dev
# open http://localhost:3000, click the "This Week in Startups" chip
```

It runs in demo mode with no key. Add a key later for live Qloo data.

## 3. Secret check before pushing (must print nothing)

```powershell
git grep -n -F $env:QLOO_API_KEY 2>$null
# If you have an LLM key set, check it too. Both must return nothing.
```

## 4. Push to a PUBLIC GitHub repo

```powershell
git init
git add .
git commit -m "Swapcast: Qloo-powered promo-swap finder for podcasters"
git branch -M main
# Create an EMPTY public repo on github.com named "swapcast", then:
git remote add origin https://github.com/<you>/swapcast.git
git push -u origin main
```

Confirm on GitHub that the repo **About** box shows "MIT license" (it reads the LICENSE file at root).

## 5. Deploy on Vercel

Option A - dashboard (simplest):
1. vercel.com -> Add New -> Project -> Import the `swapcast` repo.
2. Framework preset: Next.js (auto-detected). No build-setting changes needed.
3. Environment Variables -> add:
   - `QLOO_API_KEY` = your hackathon key
   - `QLOO_BASE_URL` = `https://hackathon.api.qloo.com`
4. Deploy. Copy the production URL.

Option B - CLI:

```powershell
npm i -g vercel
vercel            # first run links the project; accept defaults
vercel env add QLOO_API_KEY production
vercel env add QLOO_BASE_URL production   # value: https://hackathon.api.qloo.com
vercel --prod
```

## 6. Final check in a private/incognito window

- [ ] Demo URL loads without logging in
- [ ] Clicking an example chip returns a Swap Board in under ~30s
- [ ] Pitch modal copies text
- [ ] Repo is public, "MIT license" shows in About
- [ ] No secrets or Qloo JSON in the repo

## 7. Paste into Devpost

Use `DEVPOST_SUBMISSION.md`. Fill the two links (demo URL + repo URL), upload 3 screenshots, add team members, and click **Submit** (not Save).

## If the build breaks and the clock is almost out

The app is designed to run with zero config in demo mode. As long as `npm run build` passes and the Vercel URL loads, you have a qualifying live demo even before the Qloo key is wired in. Add the key via env vars and redeploy (Vercel does this in ~1 min) any time before the deadline.
