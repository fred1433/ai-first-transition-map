"use client";

import { useCallback, useState } from "react";
import type { AuditEntry, DailyLog, NarrativeField, Proposal } from "@/lib/prototype/types";

interface Scenario {
  id: string;
  label: string;
  description: string;
  notes: string;
}

interface Props {
  scenario: Scenario;
  initialLog: DailyLog;
  /** False when this deployment declares no spend limit, so the server refuses live calls. */
  liveEnabled: boolean;
}

interface Replay {
  kind: "recorded" | "live";
  note: string;
  usage?: { inputTokens: number; outputTokens: number; cacheReadInputTokens: number };
}

const FIELD_LABEL: Record<string, string> = {
  workPerformed: "Tasks performed",
  weather: "Weather",
  notes: "Notes",
};

const PRIMARY =
  "cursor-pointer rounded-md bg-ink px-5 py-3 text-[14px] font-medium text-paper transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40";
const SECONDARY =
  "cursor-pointer rounded-md border border-rule-strong bg-paper-raised px-5 py-3 text-[14px] font-medium text-ink-soft transition-colors hover:bg-paper-sunk disabled:cursor-not-allowed disabled:opacity-40";
const QUIET =
  "cursor-pointer text-[13px] text-bronze underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-40";

export function Demonstration({ scenario, initialLog, liveEnabled }: Props) {
  const [caseId, setCaseId] = useState<string | null>(null);
  const [log, setLog] = useState<DailyLog>(initialLog);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [replay, setReplay] = useState<Replay | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState<NarrativeField | null>(null);
  const [editText, setEditText] = useState("");

  const call = useCallback(async (body: Record<string, unknown>) => {
    const response = await fetch("/api/demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "The server refused that step.");
    return payload;
  }, []);

  const run = async (name: string, body: Record<string, unknown>) => {
    setBusy(name);
    setMessage(null);
    try {
      const payload = await call({ ...body, caseId });
      if (payload.caseId) setCaseId(payload.caseId);
      if (payload.log) setLog(payload.log);
      if (payload.proposal) setProposal(payload.proposal);
      if (payload.replay) setReplay(payload.replay);
      if (payload.audit) setAudit(payload.audit);
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const applied = Boolean(proposal?.appliedAt);
  const acceptedHere =
    proposal?.acceptance !== undefined &&
    proposal.acceptance.contentVersion === proposal.contentVersion &&
    proposal.acceptance.contentHash === proposal.contentHash;
  const endedAcceptance = proposal?.acceptanceHistory?.at(-1);

  return (
    <div className="mt-14">
      <div className="rounded-xl border border-rule bg-paper-raised p-6 md:p-8">
        <p className="label">Site notes, typed on a phone. Synthetic.</p>
        <pre className="mt-4 overflow-x-auto font-mono text-[13px] leading-[1.9] whitespace-pre-wrap text-ink-soft">
          {scenario.notes}
        </pre>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className={PRIMARY}
            disabled={busy !== null}
            onClick={() => run("recorded", { action: "draft", scenarioId: scenario.id, mode: "recorded" })}
          >
            {busy === "recorded" ? "Replaying" : "Replay the recorded draft"}
          </button>
          {liveEnabled ? (
            <button
              type="button"
              className={SECONDARY}
              disabled={busy !== null}
              onClick={() => run("live", { action: "draft", scenarioId: scenario.id, mode: "live" })}
            >
              {busy === "live" ? "Generating" : "Generate a new one"}
            </button>
          ) : null}
          <span className="text-[13px] text-ink-faint">
            {liveEnabled
              ? "The recorded run calls nothing. A new one calls the model, under the limits stated below."
              : "Live generation is switched off on this deployment, in the server and not only here. This is the recorded demonstration."}
          </span>
        </div>
      </div>

      {message ? (
        <p className="mt-5 rounded-md border border-rule-strong bg-paper-sunk px-5 py-4 text-[14px] text-ink-soft">
          {message}
        </p>
      ) : null}

      {proposal && replay ? (
        <div className="mt-6 rounded-xl border border-rule bg-paper-raised p-6 md:p-8">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <p className="label">Proposed draft, version {proposal.contentVersion}</p>
            <p className="text-[12px] text-ink-faint">{replay.note}</p>
          </div>

          <div className="mt-6 space-y-7">
            {proposal.fields.map((field) => (
              <div key={field.field}>
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <p className="text-[13px] font-medium text-ink-faint">{FIELD_LABEL[field.field] ?? field.field}</p>
                  {!applied ? (
                    <button
                      type="button"
                      className={QUIET}
                      disabled={busy !== null}
                      onClick={() => {
                        setEditing(editing === field.field ? null : field.field);
                        setEditText(field.text);
                      }}
                    >
                      {editing === field.field ? "Cancel" : "Correct this text"}
                    </button>
                  ) : null}
                </div>

                {editing === field.field ? (
                  <div className="mt-3">
                    <textarea
                      className="w-full rounded-md border border-rule-strong bg-paper px-4 py-3 text-[16px] leading-[1.7] text-ink"
                      rows={3}
                      value={editText}
                      onChange={(event) => setEditText(event.target.value)}
                    />
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        className={SECONDARY}
                        disabled={busy !== null || editText.trim().length === 0}
                        onClick={async () => {
                          await run("edit", {
                            action: "edit",
                            proposalId: proposal.id,
                            edits: [{ field: field.field, text: editText }],
                          });
                          setEditing(null);
                        }}
                      >
                        {busy === "edit" ? "Saving" : "Save the change"}
                      </button>
                      <span className="text-[13px] text-ink-faint">
                        Your wording becomes a new version and ends any acceptance already given.
                      </span>
                    </div>
                  </div>
                ) : (
                  <>
                    <p
                      className={`mt-2 text-[16px] leading-[1.7] ${field.withheld ? "text-ink-faint line-through decoration-rule-strong" : "text-ink"}`}
                    >
                      {field.text}
                    </p>
                    {field.withheld ? (
                      <p className="mt-2 text-[13px] text-bronze">Held back, not applied. {field.withheld.detail}</p>
                    ) : (
                      <ul className="mt-2 space-y-1">
                        {field.parts.map((part, index) => (
                          <li key={`${field.field}-${index}`} className="text-[13px] leading-relaxed text-ink-faint">
                            {field.parts.length > 1 ? <span className="text-ink-soft">{part.text} </span> : null}
                            {part.provenance.length > 0
                              ? `From the notes: ${part.provenance.map((entry) => `"${entry.quote}"`).join("  ")}`
                              : "Written by a reviewer, no excerpt from the notes."}
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          <p className="mt-6 border-t border-rule pt-5 text-[13px] leading-relaxed text-ink-faint">
            Source excerpts are checked against the notes. Factual fidelity still requires review.
          </p>

          {proposal.missing.length > 0 ? (
            <div className="mt-6 border-t border-rule pt-6">
              <p className="label">Not stated in the notes</p>
              <ul className="mt-3 space-y-2">
                {proposal.missing.map((item) => (
                  <li key={item.topic} className="text-[15px] leading-relaxed text-ink-soft">
                    {item.topic}. <span className="text-ink-faint">{item.why}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {proposal.refusals.length > 0 ? (
            <div className="mt-6">
              <p className="label">Deliberately not written</p>
              <ul className="mt-3 space-y-2">
                {proposal.refusals.map((item) => (
                  <li key={item} className="text-[15px] leading-relaxed text-ink-soft">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-rule pt-6">
            <button
              type="button"
              className={PRIMARY}
              disabled={busy !== null || acceptedHere || applied}
              onClick={() =>
                run("accept", { action: "accept", proposalId: proposal.id, contentHash: proposal.contentHash })
              }
            >
              {acceptedHere ? `Accepted by Dana, version ${proposal.acceptance?.contentVersion}` : "Accept as Dana, project manager"}
            </button>
            <button
              type="button"
              className={SECONDARY}
              disabled={busy !== null || !acceptedHere || applied}
              onClick={() => run("apply", { action: "apply", proposalId: proposal.id })}
            >
              {applied ? "Written to the log" : "Write it to the log"}
            </button>
            <span className="text-[13px] text-ink-faint">
              An acceptance names this proposal, version {proposal.contentVersion} and its exact text. The server
              checks all three, not the button.
            </span>
          </div>

          {!acceptedHere && endedAcceptance ? (
            <p className="mt-4 text-[13px] text-bronze">
              An acceptance was given to version {endedAcceptance.contentVersion} and ended when the draft changed at
              version {endedAcceptance.supersededBy}. It is kept in the record below, and version{" "}
              {proposal.contentVersion} needs its own.
            </p>
          ) : null}
        </div>
      ) : null}

      {proposal ? (
        <div className="mt-6 rounded-xl border border-rule bg-paper-sunk p-6 md:p-8">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <p className="label">The daily log record, synthetic</p>
            <p className="text-[12px] text-ink-faint">
              {log.projectName}, {log.date}, version {log.version}
            </p>
          </div>

          <dl className="mt-5 space-y-4">
            {(["workPerformed", "weather", "notes"] as const).map((field) => (
              <div key={field}>
                <dt className="text-[13px] font-medium text-ink-faint">{FIELD_LABEL[field]}</dt>
                <dd className="mt-1 text-[16px] leading-[1.7] text-ink">
                  {log.narrative[field] || <span className="text-ink-faint">empty</span>}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 grid gap-3 border-t border-rule pt-5 text-[14px] text-ink-soft md:grid-cols-3">
            <p>
              Status <span className="text-ink-faint">{log.status}, never set by the assistance</span>
            </p>
            <p>
              Hours from time cards <span className="text-ink-faint">{log.structured.timeCardHours}, out of reach</span>
            </p>
            <p>
              Equipment <span className="text-ink-faint">{log.structured.equipment.length} items, out of reach</span>
            </p>
          </div>

          {audit.length > 0 ? (
            <div className="mt-6 border-t border-rule pt-5">
              <p className="label">What was recorded</p>
              <p className="mt-2 text-[13px] text-ink-faint">
                Notes {proposal.sourceNotesHash}, kept as read. Every version of the draft is stored, so the trail
                gives back the text and not only a way to compare two of them.
              </p>
              <ul className="mt-3 space-y-2 font-mono text-[12px] leading-[1.6] text-ink-faint">
                {audit.map((entry, index) => (
                  <li key={`${entry.at}-${index}`}>
                    {entry.action} by {entry.actorId} ({entry.actorRole}) on draft {entry.contentHash.slice(0, 8)} v
                    {entry.contentVersion}, record {entry.logVersionBefore} to {entry.logVersionAfter}, {entry.outcome}
                    {entry.acceptedVersion ? `, acceptance names v${entry.acceptedVersion}` : ""}
                    {entry.changes?.length
                      ? entry.changes.map((change) => (
                          <span key={change.field} className="block pl-4 text-ink-faint">
                            {change.field}: &quot;{change.from}&quot; to &quot;{change.to}&quot;
                          </span>
                        ))
                      : null}
                  </li>
                ))}
              </ul>
              {proposal.versions.length > 1 ? (
                <ul className="mt-4 space-y-1 text-[13px] leading-relaxed text-ink-faint">
                  {proposal.versions.map((version) => (
                    <li key={version.contentVersion}>
                      Version {version.contentVersion} ({version.contentHash.slice(0, 8)}):{" "}
                      {version.fields.map((field) => field.text).join(" ")}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
