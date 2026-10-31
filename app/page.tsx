"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Plan, TraceEvent } from "@/lib/types";

type SearchItem = {
  entity_id: string;
  name: string;
  popularity?: number;
  image?: string | null;
  subtype?: string;
};

const EXAMPLES: SearchItem[] = [
  { entity_id: "demo:twist", name: "This Week in Startups" },
  { entity_id: "demo:lenny", name: "Lenny's Podcast" },
  { entity_id: "demo:99pi", name: "99% Invisible" },
];

export default function Home() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchItem[]>([]);
  const [selected, setSelected] = useState<SearchItem | null>(null);
  const [trace, setTrace] = useState<TraceEvent[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePitch, setActivePitch] = useState<number | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    debounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.results ?? []);
      } catch {
        setResults([]);
      }
    }, 220);
  }, [query]);

  const run = useCallback(async (item: SearchItem) => {
    setSelected(item);
    setResults([]);
    setQuery(item.name);
    setPlan(null);
    setTrace([]);
    setError(null);
    setRunning(true);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostId: item.entity_id }),
      });
      if (!res.body) throw new Error("No stream");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const ev = JSON.parse(line) as TraceEvent;
          if (ev.kind === "plan") setPlan(ev.plan);
          else if (ev.kind === "error") setError(ev.message);
          else setTrace((t) => [...t, ev]);
        }
      }
    } catch (err: any) {
      setError(String(err?.message ?? err));
    } finally {
      setRunning(false);
    }
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <header className="mb-8">
        <div className="flex items-center gap-2 text-sm text-accent">
          <span className="inline-block h-2 w-2 rounded-full bg-accent" />
          Swapcast
        </div>
        <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
          Find the podcasts that should be promoting yours.
        </h1>
        <p className="mt-3 max-w-2xl text-slate-400">
          The median podcast episode gets 27 downloads in its first week. The best free way to grow is a
          promo swap. Swapcast finds partners your size whose listeners like your show, checks that fit
          both ways with Qloo, and drafts the pitch.
        </p>
      </header>

      {/* Picker */}
      <section className="rounded-xl border border-edge bg-panel p-4">
        <label className="mb-2 block text-sm text-slate-300">Your show</label>
        <div className="relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search podcasts, e.g. This Week in Startups"
            className="w-full rounded-lg border border-edge bg-ink px-4 py-3 outline-none focus:border-accent2"
          />
          {results.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-edge bg-panel shadow-xl">
              {results.map((r) => (
                <li key={r.entity_id}>
                  <button
                    onClick={() => run(r)}
                    className="flex w-full items-center justify-between px-4 py-2 text-left hover:bg-edge"
                  >
                    <span>{r.name}</span>
                    {typeof r.popularity === "number" && (
                      <span className="text-xs text-slate-500">
                        size {Math.round(r.popularity * 100)}%
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="text-xs text-slate-500">Try:</span>
          {EXAMPLES.map((e) => (
            <button
              key={e.entity_id}
              onClick={() => run(e)}
              className="rounded-full border border-edge px-3 py-1 text-xs text-slate-300 hover:border-accent2"
            >
              {e.name}
            </button>
          ))}
        </div>
      </section>

      {(running || trace.length > 0) && (
        <section className="mt-6 rounded-xl border border-edge bg-panel p-4">
          <h2 className="mb-2 text-sm font-medium text-slate-300">
            Agent trace {running && <span className="text-accent">running…</span>}
          </h2>
          <ol className="space-y-1 font-mono text-xs text-slate-400">
            {trace.map((t, i) => (
              <li key={i}>
                {t.kind === "step" && <span className="text-accent">▸ {t.text}</span>}
                {t.kind === "qloo_call" && (
                  <span>
                    <span className="text-accent2">Qloo</span> GET {t.endpoint} · {t.status} · {t.ms}ms
                  </span>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {error && (
        <div className="mt-6 rounded-xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {plan && (
        <>
          <ModeBadge mode={plan.mode} />

          {/* Taste chips */}
          {plan.profileTags.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-2 text-sm font-medium text-slate-300">
                Qloo says · your listeners&apos; tastes
              </h2>
              <div className="flex flex-wrap gap-2">
                {plan.profileTags.slice(0, 12).map((t) => (
                  <span key={t.id || t.name} className="rounded-full bg-edge px-3 py-1 text-xs text-slate-200">
                    {t.name}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Swap board */}
          <section className="mt-8">
            <h2 className="mb-3 text-lg font-semibold">Swap Board</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {plan.partners.map((p, i) => (
                <article key={p.entity_id} className="rounded-xl border border-edge bg-panel p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium">{p.name}</h3>
                    {p.twoWay ? (
                      <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] text-accent">
                        Two-way match
                      </span>
                    ) : (
                      <span className="rounded-full bg-accent2/15 px-2 py-0.5 text-[11px] text-accent2">
                        One-sided
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-slate-300">
                    Qloo says: #{p.fwdRank} for your listeners
                    {p.revRank != null ? ` · you're #${p.revRank} for theirs` : " · not in their top 50"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {p.sizeMatch} · {p.lane === "same" ? "same lane" : "adjacent lane"} ·{" "}
                    <span className="text-slate-300">Swapcast suggests a {p.format}</span>
                  </p>
                  {p.sharedTags.length > 0 && (
                    <p className="mt-2 text-xs text-slate-500">Shared: {p.sharedTags.join(", ")}</p>
                  )}
                  <button
                    onClick={() => setActivePitch(i)}
                    className="mt-3 rounded-lg border border-accent2 px-3 py-1.5 text-sm text-accent2 hover:bg-accent2/10"
                  >
                    View pitch
                  </button>
                </article>
              ))}
            </div>
          </section>

          {/* Counterfactual: naive baseline vs Swapcast */}
          {plan.baseline && (
            <section className="mt-8">
              <h2 className="mb-3 text-lg font-semibold">
                {plan.baseline.source === "llm"
                  ? "Plain LLM vs Swapcast"
                  : "Popularity-only vs Swapcast"}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-red-900/60 bg-red-950/20 p-4">
                  <h3 className="mb-1 text-sm font-medium text-red-300">
                    {plan.baseline.source === "llm"
                      ? "Unassisted LLM"
                      : "Popularity-only"}
                  </h3>
                  <p className="mb-3 text-xs text-red-300/70">{plan.baseline.note}</p>
                  <ul className="space-y-1 text-sm text-slate-300">
                    {plan.baseline.partners.map((name, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="text-red-400/70">?</span>
                        {name}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-accent/40 bg-accent/5 p-4">
                  <h3 className="mb-1 text-sm font-medium text-accent">
                    Qloo-grounded Swapcast
                  </h3>
                  <p className="mb-3 text-xs text-slate-400">
                    Every show below is a verified Qloo entity, in your size band, with a
                    two-way rank check.
                  </p>
                  <ul className="space-y-1 text-sm text-slate-200">
                    {plan.partners.map((p) => (
                      <li key={p.entity_id} className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2">
                          <span className="text-accent">✓</span>
                          {p.name}
                        </span>
                        <span className="text-xs text-slate-500">
                          #{p.fwdRank}
                          {p.revRank != null ? ` · #${p.revRank}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          )}

          {/* Sponsors */}
          {plan.brands.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-3 text-lg font-semibold">Sponsor leads</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <BrandCol title="Reachable" brands={plan.brands.filter((b) => b.tier === "reachable")} />
                <BrandCol title="Household names" brands={plan.brands.filter((b) => b.tier === "household")} />
              </div>
            </section>
          )}

          {activePitch != null && plan.partners[activePitch] && (
            <PitchModal
              partnerName={plan.partners[activePitch].name}
              pitch={plan.partners[activePitch].pitch}
              onClose={() => setActivePitch(null)}
            />
          )}
        </>
      )}

      <footer className="mt-12 border-t border-edge pt-6 text-xs text-slate-500">
        <p className="font-medium text-slate-400">Limitations</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Qloo results describe aggregate audience affinities, not individual listeners.</li>
          <li>Popularity is a proxy for size, not download counts.</li>
          <li>Brand affinity is not ad-buying intent.</li>
          <li>LLM-drafted pitches are starting points — edit before sending.</li>
        </ul>
        <p className="mt-4">MIT licensed · Built with Next.js + Qloo.</p>
      </footer>
    </main>
  );
}

function ModeBadge({ mode }: { mode: Plan["mode"] }) {
  const label =
    mode === "demo" ? "Demo data (no key)" : mode === "qloo-only" ? "Live Qloo" : "Live Qloo + LLM";
  const color = mode === "demo" ? "bg-yellow-500/15 text-yellow-300" : "bg-accent/15 text-accent";
  return (
    <div className={`mt-6 inline-block rounded-full px-3 py-1 text-xs ${color}`}>{label}</div>
  );
}

function BrandCol({ title, brands }: { title: string; brands: Plan["brands"] }) {
  return (
    <div className="rounded-xl border border-edge bg-panel p-4">
      <h3 className="mb-2 text-sm font-medium text-slate-300">{title}</h3>
      {brands.length === 0 ? (
        <p className="text-xs text-slate-500">None found.</p>
      ) : (
        <ul className="space-y-1 text-sm text-slate-200">
          {brands.map((b) => (
            <li key={b.entity_id} className="flex items-center justify-between">
              <span>{b.name}</span>
              {typeof b.popularity === "number" && (
                <span className="text-xs text-slate-500">{Math.round(b.popularity * 100)}%</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PitchModal({
  partnerName,
  pitch,
  onClose,
}: {
  partnerName: string;
  pitch: string;
  onClose: () => void;
}) {
  const [text, setText] = useState(pitch);
  const [copied, setCopied] = useState(false);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-edge bg-panel p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-medium">Pitch to {partnerName}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200">
            ✕
          </button>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          className="w-full rounded-lg border border-edge bg-ink p-3 text-sm outline-none focus:border-accent2"
        />
        <p className="mt-2 text-xs text-slate-500">
          Tip: add a unique tracking link or code per partner so you can both measure lift.
        </p>
        <div className="mt-3 flex justify-end gap-2">
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(text);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-ink"
          >
            {copied ? "Copied" : "Copy pitch"}
          </button>
        </div>
      </div>
    </div>
  );
}
