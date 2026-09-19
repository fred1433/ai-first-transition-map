/**
 * The server side of the demonstration.
 *
 * Every decision that matters happens here: what the contract allows, whether
 * the notes support the draft, who may accept, and whether an acceptance still
 * names the draft on screen. The browser can ask for anything; it decides
 * nothing.
 */
import { NextResponse } from "next/server";
import { generateDraft, ModelAnswerUnusable, ModelNotConfigured, ProviderUnavailable } from "@/lib/prototype/generate";
import { recordedAnswer } from "@/lib/prototype/fixtures";
import { inspect, takeLiveCall } from "@/lib/prototype/limits";
import { ACTORS, LOG_ID, scenario } from "@/lib/prototype/scenario";
import { getSession, SessionExpired, startSession } from "@/lib/prototype/sessions";
import { NARRATIVE_FIELDS, Refused, type NarrativeField } from "@/lib/prototype/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const actorOf = (id: unknown) => ACTORS[typeof id === "string" && id in ACTORS ? id : "dana"];

function clientId(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return (forwarded?.split(",")[0] ?? "local").trim();
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Send a JSON body." }, { status: 400 });
  }

  const action = body.action;

  try {
    // The first draft opens the session. Nothing is called before a visitor asks
    // for something.
    const workspace = body.caseId ? getSession(String(body.caseId)) : startSession();

    if (action === "draft") {
      const seed = scenario(String(body.scenarioId ?? "site-notes"));
      const live = body.mode === "live";

      if (!live) {
        const answer = recordedAnswer(seed.id);
        const proposal = workspace.propose(ACTORS.dana, {
          logId: LOG_ID,
          sourceNotes: seed.notes,
          raw: answer.raw,
          origin: "recorded",
        });
        return NextResponse.json({
          caseId: workspace.caseId,
          proposal,
          log: workspace.log(ACTORS.dana, LOG_ID),
          replay: {
            kind: "recorded",
            note: `Recorded answer, ${answer.origin === "model" ? "returned by the model on" : "written by hand on"} ${answer.recordedAt}. No model was called just now.`,
          },
          limits: inspect(new Date(), clientId(request)),
        });
      }

      // The durable limit is the monthly spend limit on the provider workspace
      // this deployment calls. If none is declared, live generation is off here,
      // and it is the server that refuses it, not a hidden button.
      if (!process.env.NEXT_PUBLIC_DEMO_SPEND_LIMIT) {
        return NextResponse.json(
          {
            error:
              "Live generation is switched off on this deployment. What this page shows is the recorded demonstration.",
          },
          { status: 503 },
        );
      }

      const decision = takeLiveCall(clientId(request));
      if (!decision.allowed) {
        return NextResponse.json(
          {
            error:
              decision.reason === "per_instance_daily_cap"
                ? "This instance of the demonstration has reached its cap of live generations for today. The recorded runs still work, and the cap lifts at midnight UTC."
                : "You have used your live generations for today. The recorded runs still work, and the cap lifts at midnight UTC.",
            limits: decision,
          },
          { status: 429, headers: { "Retry-After": "3600" } },
        );
      }

      const generated = await generateDraft(seed.notes);
      const proposal = workspace.propose(ACTORS.dana, {
        logId: LOG_ID,
        sourceNotes: seed.notes,
        raw: generated.raw,
        origin: "live",
      });
      return NextResponse.json({
        caseId: workspace.caseId,
        proposal,
        log: workspace.log(ACTORS.dana, LOG_ID),
        replay: {
          kind: "live",
          note: `Generated just now by ${generated.model}, then checked against the notes before being shown.`,
          usage: generated.usage,
        },
        limits: inspect(new Date(), clientId(request)),
      });
    }

    if (action === "edit") {
      // A reviewer correcting the draft is part of the path, not a detour: the
      // edit produces a new version and ends the acceptance in force.
      const edits = (Array.isArray(body.edits) ? body.edits : [])
        .map((entry) => (entry ?? {}) as Record<string, unknown>)
        .filter((entry) => NARRATIVE_FIELDS.includes(entry.field as NarrativeField) && typeof entry.text === "string")
        .map((entry) => ({ field: entry.field as NarrativeField, text: String(entry.text).trim() }))
        .filter((entry) => entry.text.length > 0);
      if (edits.length === 0) {
        return NextResponse.json({ error: "Send at least one field to change." }, { status: 400 });
      }
      const proposal = workspace.edit(actorOf(body.actorId), String(body.proposalId ?? ""), edits);
      return NextResponse.json({
        proposal,
        log: workspace.log(ACTORS.dana, LOG_ID),
        audit: workspace.auditTrail(),
      });
    }

    if (action === "accept") {
      const proposal = workspace.accept(
        actorOf(body.actorId),
        String(body.proposalId ?? ""),
        String(body.contentHash ?? ""),
      );
      return NextResponse.json({
        proposal,
        log: workspace.log(ACTORS.dana, LOG_ID),
        audit: workspace.auditTrail(),
      });
    }

    if (action === "apply") {
      const applied = workspace.apply(actorOf(body.actorId), String(body.proposalId ?? ""));
      return NextResponse.json({
        proposal: applied.proposal,
        log: applied.log,
        audit: workspace.auditTrail(),
      });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    if (error instanceof SessionExpired) {
      return NextResponse.json({ error: error.message, expired: true }, { status: 409 });
    }
    if (error instanceof Refused) {
      return NextResponse.json({ error: error.message, code: error.code, refused: true }, { status: 403 });
    }
    if (error instanceof ModelNotConfigured) {
      return NextResponse.json({ error: "Live generation is not configured on this deployment." }, { status: 503 });
    }
    // The two ways the model call can fail while everything else here works. The
    // page keeps its recorded demonstration either way, so that is what the
    // visitor is told, in the same terms as the daily caps above.
    if (error instanceof ProviderUnavailable) {
      return NextResponse.json(
        {
          error:
            "Live generation is unavailable right now: the model provider did not answer. The recorded run still works.",
        },
        { status: 503, headers: { "Retry-After": "600" } },
      );
    }
    if (error instanceof ModelAnswerUnusable) {
      return NextResponse.json(
        { error: "The model answered with something this page could not read. The recorded run still works." },
        { status: 502 },
      );
    }
    console.error(error);
    return NextResponse.json({ error: "Something went wrong on the server." }, { status: 500 });
  }
}
