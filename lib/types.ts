export type Tag = { name: string; id: string; type?: string };

export type Entity = {
  entity_id: string;
  name: string;
  popularity?: number;
  subtype?: string;
  image?: string | null;
  tags?: Tag[];
};

export type Candidate = Entity & {
  fwdRank: number;
  revRank: number | null;
};

export type Partner = {
  entity_id: string;
  name: string;
  image?: string | null;
  popularity?: number;
  fwdRank: number;
  revRank: number | null;
  weakest: number;
  twoWay: boolean;
  sizeMatch: string;
  lane: "same" | "adjacent";
  format: "guest swap" | "promo swap";
  sharedTags: string[];
  pitch: string;
};

export type Brand = {
  entity_id: string;
  name: string;
  popularity?: number;
  tier: "reachable" | "household";
};

/**
 * Unassisted-LLM baseline: what a model suggests with NO Qloo data and NO
 * verification. Rendered side-by-side with the grounded Swap Board to show the
 * gap. Never trusted — these names are not checked against any Qloo result.
 */
export type Baseline = {
  partners: string[];
  note: string;
  /** How the baseline was produced: a tool-free LLM, or popularity-only ranking. */
  source: "llm" | "popularity";
};

export type Plan = {
  host: Entity;
  profileTags: Tag[];
  partners: Partner[];
  brands: Brand[];
  mode: "qloo+llm" | "qloo-only" | "demo";
  notes: string[];
  /** Only present in qloo+llm mode when the counterfactual panel is enabled. */
  baseline?: Baseline;
};

export type TraceEvent =
  | { kind: "step"; text: string }
  | { kind: "qloo_call"; endpoint: string; params: string; status: number; ms: number }
  | { kind: "plan"; plan: Plan }
  | { kind: "error"; message: string };

/** Callback that receives trace events as the pipeline/agent runs. */
export type Trace = (e: TraceEvent) => void;
