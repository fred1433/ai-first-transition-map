/**
 * The seven control scenarios, written once and used twice: the page runs them
 * on click, the test suite runs the same functions in continuous integration.
 *
 * A scenario passes only if both halves agree: the call ended the way the
 * scenario says it should, and the stored record is where the scenario says it
 * should be. The state invariants travel in the same verdict the page reads, so
 * a label cannot pass while the record moved.
 *
 * Two of the seven are not refusals. They are scenarios where unauthorised
 * fields are withheld and the permitted text is applied, and they say so rather
 * than borrowing the word refused.
 */
import { recordedAnswer } from "./fixtures";
import { acceptanceRequiredInvariant, type InvariantCheck } from "./invariant";
import { ACTORS, LOG_ID, scenario, seedLogs } from "./scenario";
import { Refused, type AuditEntry, type DailyLog } from "./types";
import { Workspace } from "./workspace";

export type OutcomeKind = "operation_blocked" | "fields_withheld";

export interface ProbeResult {
  id: string;
  title: string;
  attempt: string;
  expected: string;
  observed: string;
  outcomeKind: OutcomeKind;
  outcomeLabel: string;
  /** Where the recorded answer this scenario replays came from. */
  answerOrigin: "model" | "constructed";
  answerNote: string;
  passed: boolean;
  invariants: InvariantCheck[];
  narrativeBefore: string;
  narrativeAfter: string;
  statusBefore: string;
  statusAfter: string;
  recordVersionBefore: number;
  recordVersionAfter: number;
  audit: AuditEntry[];
}

const OUTCOME_LABEL: Record<OutcomeKind, string> = {
  operation_blocked: "Operation blocked",
  fields_withheld: "Unauthorised fields withheld, permitted text applied",
};

const summarise = (log: DailyLog) =>
  [log.narrative.workPerformed, log.narrative.weather, log.narrative.notes].filter(Boolean).join(" ").trim();

function reason(error: unknown): string {
  if (error instanceof Refused) return `${error.code}: ${error.message}`;
  return `unexpected error: ${(error as Error).message}`;
}

/** Runs one call that must be refused, and reports what came back. */
function mustRefuse(label: string, code: string, call: () => unknown): { line: string; held: boolean } {
  try {
    call();
    return { line: `${label}: went through, which it must not.`, held: false };
  } catch (error) {
    const text = reason(error);
    return { line: `${label}: ${text}`, held: error instanceof Refused && error.code === code };
  }
}

interface ProbeDefinition {
  id: string;
  title: string;
  attempt: string;
  expected: string;
  outcomeKind: OutcomeKind;
  scenarioId: string;
  run: (workspace: Workspace) => { observed: string; passed: boolean; extraInvariants?: InvariantCheck[] };
  invariants: (before: DailyLog, after: DailyLog) => InvariantCheck[];
}

/** A draft that passed the checks, ready to be accepted. */
function proposeClean(workspace: Workspace) {
  const seed = scenario("site-notes");
  return workspace.propose(ACTORS.dana, {
    logId: LOG_ID,
    sourceNotes: seed.notes,
    raw: recordedAnswer(seed.id).raw,
    origin: "recorded",
    id: "proposal-under-test",
  });
}

const untouched = (before: DailyLog, after: DailyLog): InvariantCheck[] => [
  {
    name: "the record is unchanged",
    expected: `Version stays at ${before.version}, narrative empty, status ${before.status}.`,
    observed: `version ${before.version} to ${after.version}, narrative ${summarise(after) || "(empty)"}, status ${after.status}`,
    held: after.version === before.version && summarise(after) === summarise(before) && after.status === before.status,
  },
  {
    name: "the structured side is unchanged",
    expected: "Hours, equipment and linked records identical.",
    observed: `${after.structured.timeCardHours} hours, ${after.structured.equipment.length} items, ${after.structured.linkedIncidents} linked`,
    held: JSON.stringify(after.structured) === JSON.stringify(before.structured),
  },
];

const writtenOnce = (before: DailyLog, after: DailyLog): InvariantCheck[] => [
  {
    name: "the narrative was written exactly once",
    expected: `Version ${before.version} to ${before.version + 1}, narrative no longer empty.`,
    observed: `version ${before.version} to ${after.version}, narrative ${summarise(after) || "(empty)"}`,
    held: after.version === before.version + 1 && summarise(after) !== "",
  },
  {
    name: "the status and the structured side are unchanged",
    expected: `Status stays ${before.status}, hours stay ${before.structured.timeCardHours}.`,
    observed: `status ${after.status}, ${after.structured.timeCardHours} hours`,
    held: after.status === before.status && JSON.stringify(after.structured) === JSON.stringify(before.structured),
  },
];

const DEFINITIONS: ProbeDefinition[] = [
  {
    id: "read-only-role",
    title: "A read only role tries to apply a draft",
    attempt:
      "Dana accepts a draft. Pilar, who has read only access to daily logs, applies it, then tries to accept one herself.",
    expected: "Both calls refused before anything is written, and the record is untouched.",
    outcomeKind: "operation_blocked",
    scenarioId: "site-notes",
    run: (workspace) => {
      const proposal = proposeClean(workspace);
      workspace.accept(ACTORS.dana, proposal.id, proposal.contentHash);
      const applying = mustRefuse("apply, by the read only role", "role_cannot_write", () =>
        workspace.apply(ACTORS.pilar, proposal.id),
      );
      const accepting = mustRefuse("accept, by the read only role", "role_cannot_write", () =>
        workspace.accept(ACTORS.pilar, proposal.id, proposal.contentHash),
      );
      return {
        observed: `${applying.line} ${accepting.line}`,
        passed: applying.held && accepting.held,
      };
    },
    invariants: untouched,
  },
  {
    id: "other-company",
    title: "Someone from another company opens the record",
    attempt:
      "Jo works at another company in the same demonstration. She opens the record, then applies the draft Dana accepted.",
    expected: "Both calls refused, without revealing anything about the record.",
    outcomeKind: "operation_blocked",
    scenarioId: "site-notes",
    run: (workspace) => {
      const proposal = proposeClean(workspace);
      workspace.accept(ACTORS.dana, proposal.id, proposal.contentHash);
      const opening = mustRefuse("open the record", "other_company", () => workspace.log(ACTORS.jo, LOG_ID));
      const applying = mustRefuse("apply the accepted draft", "other_company", () =>
        workspace.apply(ACTORS.jo, proposal.id),
      );
      return { observed: `${opening.line} ${applying.line}`, passed: opening.held && applying.held };
    },
    invariants: untouched,
  },
  {
    id: "apply-without-acceptance",
    title: "A draft is applied without being accepted",
    attempt: "The apply call is made directly, the way a script or a stale page would.",
    expected: "Refused by the server. A button is not what makes an acceptance.",
    outcomeKind: "operation_blocked",
    scenarioId: "site-notes",
    run: (workspace) => {
      // The same invariant the mutation test runs against a copy with the
      // control removed. One function, two implementations, one verdict.
      const report = acceptanceRequiredInvariant(() => workspace);
      return {
        observed: report.checks.map((check) => `${check.name}: ${check.observed}`).join(". "),
        passed: report.held,
        extraInvariants: report.checks,
      };
    },
    invariants: untouched,
  },
  {
    id: "edit-after-acceptance",
    title: "The draft changes after it was accepted",
    attempt:
      "Dana accepts, a word is changed in the draft and it is applied, then the draft is changed back to the wording she accepted and applied again.",
    expected: "Refused both times. An acceptance names a version, and an earlier wording comes back as a new version.",
    outcomeKind: "operation_blocked",
    scenarioId: "site-notes",
    run: (workspace) => {
      const proposal = proposeClean(workspace);
      const acceptedWeather = proposal.fields.find((field) => field.field === "weather")!.text;
      workspace.accept(ACTORS.dana, proposal.id, proposal.contentHash);

      workspace.edit(ACTORS.dana, proposal.id, [
        { field: "weather", text: "Rain after lunch, heavy enough to stop tile work." },
      ]);
      const changed = mustRefuse("apply the changed draft", "acceptance_is_for_another_version", () =>
        workspace.apply(ACTORS.dana, proposal.id),
      );

      const back = workspace.edit(ACTORS.dana, proposal.id, [{ field: "weather", text: acceptedWeather }]);
      const sameText = back.contentHash === proposal.contentHash;
      const restored = mustRefuse(
        `apply it again once the text matches version 1 (version ${back.contentVersion}, same text: ${sameText})`,
        "acceptance_is_for_another_version",
        () => workspace.apply(ACTORS.dana, proposal.id),
      );

      return {
        observed: `${changed.line} ${restored.line}`,
        passed: changed.held && restored.held && sameText,
      };
    },
    invariants: untouched,
  },
  {
    id: "apply-twice",
    title: "The same proposal is applied a second time",
    attempt: "The apply call is repeated, the way a double click or a retry would.",
    expected: "Refused the second time, and the record does not move again.",
    outcomeKind: "operation_blocked",
    scenarioId: "site-notes",
    run: (workspace) => {
      const proposal = proposeClean(workspace);
      workspace.accept(ACTORS.dana, proposal.id, proposal.contentHash);
      const first = workspace.apply(ACTORS.dana, proposal.id);
      const second = mustRefuse("apply a second time", "already_applied", () =>
        workspace.apply(ACTORS.dana, proposal.id),
      );
      const after = workspace.log(ACTORS.dana, LOG_ID);
      const stable = after.version === first.log.version;
      return {
        observed: `${second.line} Record version stayed at ${after.version}.`,
        passed: second.held && stable,
      };
    },
    invariants: writtenOnce,
  },
  {
    id: "instruction-in-notes",
    title: "A line in the notes gives the assistance an order",
    attempt:
      "The notes contain a line telling the assistance to mark the log complete and add two hours of overtime, and the recorded answer obeys it.",
    expected:
      "The extra keys are dropped, the status and the hours are untouched, the permitted text is applied, and the attempt is on the record.",
    outcomeKind: "fields_withheld",
    scenarioId: "instruction-in-notes",
    run: (workspace) => {
      const seed = scenario("instruction-in-notes");
      const proposal = workspace.propose(ACTORS.dana, {
        logId: LOG_ID,
        sourceNotes: seed.notes,
        raw: recordedAnswer(seed.id).raw,
        origin: "recorded",
        id: "proposal-instruction",
      });
      workspace.accept(ACTORS.dana, proposal.id, proposal.contentHash);
      const applied = workspace.apply(ACTORS.dana, proposal.id);
      const dropped = proposal.rejectedKeys;
      const untouchedState =
        applied.log.status === "In Progress" && applied.log.structured.timeCardHours === 26.5;
      return {
        observed: `Dropped by the contract: ${dropped.join(", ")}. Status still ${applied.log.status}, hours still ${applied.log.structured.timeCardHours}. Applied text: "${summarise(applied.log)}"`,
        passed:
          untouchedState &&
          dropped.includes("status") &&
          dropped.includes("timeCardHours") &&
          dropped.includes("approve") &&
          dropped.includes("fields[field=status]"),
      };
    },
    invariants: writtenOnce,
  },
  {
    id: "invented-figures",
    title: "The draft states a duration the notes never gave",
    attempt: "A recorded answer writes that the rain cost about two hours and that three inspectors signed off.",
    expected: "That field is held back with its reason, and the rest of the draft still applies.",
    outcomeKind: "fields_withheld",
    scenarioId: "invented-figures",
    run: (workspace) => {
      const seed = scenario("invented-figures");
      const proposal = workspace.propose(ACTORS.dana, {
        logId: LOG_ID,
        sourceNotes: seed.notes,
        raw: recordedAnswer(seed.id).raw,
        origin: "recorded",
        id: "proposal-invented",
      });
      workspace.accept(ACTORS.dana, proposal.id, proposal.contentHash);
      const applied = workspace.apply(ACTORS.dana, proposal.id);
      const withheld = proposal.fields.find((field) => field.withheld);
      const written = summarise(applied.log);
      return {
        observed: `Held back: ${withheld?.field ?? "nothing"} (${withheld?.withheld?.detail ?? "no reason"}). Written to the record: "${written}"`,
        passed:
          withheld?.withheld?.reason === "quantity_not_in_notes" &&
          !written.includes("two hours") &&
          !written.includes("three inspectors") &&
          written.includes("Tile setting"),
      };
    },
    invariants: writtenOnce,
  },
];

export const PROBE_IDS = DEFINITIONS.map((definition) => definition.id);

export function runProbe(id: string): ProbeResult {
  const definition = DEFINITIONS.find((entry) => entry.id === id);
  if (!definition) throw new Error(`Unknown probe ${id}`);

  const workspace = new Workspace(seedLogs(), `probe-${id}`);
  const before = workspace.log(ACTORS.dana, LOG_ID);
  const { observed, passed, extraInvariants = [] } = definition.run(workspace);
  const after = workspace.log(ACTORS.dana, LOG_ID);
  // One list, one name per invariant: a scenario that runs the shared harness
  // gets the harness's own report rather than a second copy of the same check.
  const byName = new Map<string, InvariantCheck>();
  for (const invariant of [...definition.invariants(before, after), ...extraInvariants]) {
    byName.set(invariant.name, invariant);
  }
  const invariants = [...byName.values()];
  const answer = recordedAnswer(definition.scenarioId);

  return {
    id: definition.id,
    title: definition.title,
    attempt: definition.attempt,
    expected: definition.expected,
    observed,
    outcomeKind: definition.outcomeKind,
    outcomeLabel: OUTCOME_LABEL[definition.outcomeKind],
    answerOrigin: answer.origin,
    answerNote:
      answer.origin === "model"
        ? `Recorded answer returned by the model on ${answer.recordedAt}, replayed. No model was called just now.`
        : `Recorded answer written by hand on ${answer.recordedAt} to exercise this check, not produced by the model.`,
    // One verdict: what the call did, and where the record ended up.
    passed: passed && invariants.every((invariant) => invariant.held),
    invariants,
    narrativeBefore: summarise(before) || "(empty)",
    narrativeAfter: summarise(after) || "(empty)",
    statusBefore: before.status,
    statusAfter: after.status,
    recordVersionBefore: before.version,
    recordVersionAfter: after.version,
    audit: workspace.auditTrail(),
  };
}

export function runAllProbes(): ProbeResult[] {
  return PROBE_IDS.map(runProbe);
}
