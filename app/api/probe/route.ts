/**
 * Runs one of the refusal checks on demand. The function called here is the
 * same one the test suite calls in continuous integration, so what the page
 * shows and what the tests assert cannot drift apart.
 */
import { NextResponse } from "next/server";
import { PROBE_IDS, runProbe } from "@/lib/prototype/probes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { id?: string };
  const id = String(body.id ?? "");
  if (!PROBE_IDS.includes(id)) {
    return NextResponse.json({ error: "Unknown check." }, { status: 400 });
  }
  return NextResponse.json({ result: runProbe(id) });
}
