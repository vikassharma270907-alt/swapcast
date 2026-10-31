# Screenshots for Swapcast

Drop three PNGs in this folder with these exact names so the links in the
root `README.md` resolve:

| File | What to capture | Why it matters to judges |
|---|---|---|
| `swap-board.png` | The **Swap Board** after running an example show — the 5 partner cards with their "Two-way match" / "One-sided" badges and `#fwdRank · #revRank` evidence lines. | Shows the core output: size-matched, two-way-verified partners with Qloo evidence. |
| `agent-trace.png` | The **Agent trace** panel mid- or post-run, showing the `▸ step` lines and `Qloo GET /v2/insights · 200 · NNms` call log. | Proves the run is grounded in real, live Qloo calls — not invented. |
| `pitch-modal.png` | The **pitch modal** open for one partner, showing the drafted outreach text and the Copy button. | Shows the actionable deliverable the podcaster actually sends. |

## Capture tips

- Use the **live deployment** (mode badge reading "Live Qloo" or "Live Qloo + LLM"),
  not demo mode, so the data is real.
- Run one of the example chips — "This Week in Startups" produces a strong board.
- Capture at a normal browser width (~1200px) so text stays legible when scaled
  down in the README.
- PNG, not JPG, to keep the dark-theme UI crisp. Keep each under ~1 MB
  (the pre-commit hook blocks anything over 5 MB).
- Crop to the relevant panel; avoid capturing the whole desktop.

Once the three files are here, the Screenshots section in the root README will
render them automatically. Then commit:

```bash
git add docs/ README.md
git commit -m "Add screenshots"
git push
```
