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
          return; // the finally block closes the stream; closing twice throws
        }
        // The example chips carry synthetic demo IDs. With a live key, those
        // IDs are not valid Qloo entities, so resolve the real ID by name.
        if (hostId.startsWith("demo:") && hasQlooKey()) {
          const name = DEMO_HOSTS.find((h) => h.entity_id === hostId)?.name ?? "";
          const hits = name ? await searchPodcasts(name, send).catch(() => []) : [];
          const match = hits.find((h) =>
            h.name.toLowerCase().startsWith(name.toLowerCase())
          );
          if (!match) {
            send({
              kind: "error",
              message:
                "Couldn't find that example in Qloo. Search for the show instead.",
            });
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
