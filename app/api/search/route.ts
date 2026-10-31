import { NextRequest, NextResponse } from "next/server";
import { searchHosts } from "@/lib/pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });
  try {
    const results = await searchHosts(q);
    return NextResponse.json({
      results: results.slice(0, 8).map((e) => ({
        entity_id: e.entity_id,
        name: e.name,
        popularity: e.popularity,
        image: e.image ?? null,
        subtype: e.subtype,
      })),
    });
  } catch {
    // Generic message only: the raw error can quote the key from a bad header.
    return NextResponse.json({ results: [], error: "Search failed" }, { status: 200 });
  }
}
