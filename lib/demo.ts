import type { Entity } from "./types";

// Synthetic, hand-authored demo data. NOT from Qloo. Used only when no API key
// is configured so the live app still demonstrates the full flow end to end.
export const DEMO_HOSTS: Entity[] = [
  {
    entity_id: "demo:twist",
    name: "This Week in Startups",
    popularity: 0.82,
    subtype: "podcast",
    image: null,
    tags: [
      { name: "startups", id: "t:startups" },
      { name: "venture capital", id: "t:vc" },
      { name: "technology", id: "t:tech" },
      { name: "interview", id: "t:interview" },
    ],
  },
  {
    entity_id: "demo:lenny",
    name: "Lenny's Podcast",
    popularity: 0.74,
    subtype: "podcast",
    image: null,
    tags: [
      { name: "product management", id: "t:pm" },
      { name: "growth", id: "t:growth" },
      { name: "startups", id: "t:startups" },
      { name: "interview", id: "t:interview" },
    ],
  },
  {
    entity_id: "demo:99pi",
    name: "99% Invisible",
    popularity: 0.78,
    subtype: "podcast",
    image: null,
    tags: [
      { name: "design", id: "t:design" },
      { name: "storytelling", id: "t:story" },
      { name: "architecture", id: "t:arch" },
      { name: "culture", id: "t:culture" },
    ],
  },
];

function tag(name: string, id: string) {
  return { name, id };
}

export function demoPeers(hostId: string): Entity[] {
  const common = [tag("startups", "t:startups"), tag("interview", "t:interview")];
  return [
    { entity_id: "demo:p1", name: "The Twenty Minute VC", popularity: 0.8, tags: [tag("venture capital", "t:vc"), ...common] },
    { entity_id: "demo:p2", name: "Acquired", popularity: 0.79, tags: [tag("technology", "t:tech"), tag("business", "t:biz"), ...common] },
    { entity_id: "demo:p3", name: "My First Million", popularity: 0.77, tags: [tag("startups", "t:startups"), tag("business", "t:biz")] },
    { entity_id: "demo:p4", name: "The Pitch", popularity: 0.72, tags: [tag("startups", "t:startups"), tag("venture capital", "t:vc")] },
    { entity_id: "demo:p5", name: "Indie Hackers", popularity: 0.7, tags: [tag("startups", "t:startups"), tag("product management", "t:pm")] },
    { entity_id: "demo:p6", name: "SaaS Open Mic", popularity: 0.66, tags: [tag("startups", "t:startups"), tag("growth", "t:growth")] },
    { entity_id: "demo:p7", name: "Below the Line", popularity: 0.63, tags: [tag("technology", "t:tech"), tag("interview", "t:interview")] },
    { entity_id: "demo:p8", name: "Founder Real Talk", popularity: 0.6, tags: [tag("startups", "t:startups"), tag("storytelling", "t:story")] },
  ];
}

export function demoReverseRank(candidateId: string): number | null {
  const map: Record<string, number | null> = {
    "demo:p1": 3,
    "demo:p2": 9,
    "demo:p3": null,
    "demo:p4": 6,
    "demo:p5": 12,
    "demo:p6": 21,
    "demo:p7": null,
    "demo:p8": 18,
  };
  return map[candidateId] ?? null;
}

export function demoTags(): Entity["tags"] {
  return [
    tag("startups", "t:startups"),
    tag("venture capital", "t:vc"),
    tag("technology", "t:tech"),
    tag("product management", "t:pm"),
    tag("business", "t:biz"),
    tag("entrepreneurship", "t:entre"),
  ];
}

export function demoBrands(): Entity[] {
  return [
    { entity_id: "demo:b1", name: "Notion", popularity: 0.9, tags: [] },
    { entity_id: "demo:b2", name: "Linear", popularity: 0.72, tags: [] },
    { entity_id: "demo:b3", name: "Vanta", popularity: 0.68, tags: [] },
    { entity_id: "demo:b4", name: "Mercury", popularity: 0.7, tags: [] },
    { entity_id: "demo:b5", name: "Ramp", popularity: 0.74, tags: [] },
    { entity_id: "demo:b6", name: "Stripe", popularity: 0.97, tags: [] },
    { entity_id: "demo:b7", name: "AWS", popularity: 0.98, tags: [] },
    { entity_id: "demo:b8", name: "Webflow", popularity: 0.69, tags: [] },
    { entity_id: "demo:b9", name: "Retool", popularity: 0.64, tags: [] },
    { entity_id: "demo:b10", name: "Apple", popularity: 0.99, tags: [] },
  ];
}
