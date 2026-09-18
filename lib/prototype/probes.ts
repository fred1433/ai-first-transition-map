/**
 * The checks the demonstration claims to pass, written once and used twice: the
 * page runs them on click, the test suite runs the same functions in CI. A
 * claim on the page and a test in the repository cannot drift apart, because
 * they are the same code.
 *
 * Every probe builds its own workspace, states what should happen, and reports
 * the state of the record before and after, not only the message displayed.
 */
import { recordedAnswer } from "./fixtures";
import { ACTORS, LOG_ID, scenario, seedLogs } from "./scenario";
import { Refused, type AuditEntry, type DailyLog } from "./types";
import { Workspace } from "./workspace";

export interface ProbeResult {
  id: string;
  title: string;
  attempt: string;
  expected: string;
  observed: string;
  passed: boolean;
  narrativeBefore: string;
  narrativeAfter: string;
  statusBefore: string;
  statusAfter: string;
  recordVersionBefore: number;
  recordVersionAfter: number;
  audit: AuditEntry[];
}

const summarise = (log: DailyLog) =>
  [log.narrative.workPerformed, log.narrative.weather, log.narrative.notes].filter(Boolean).join(" ").trim();

function reason(error: unknown): string {
  if (error instanceof Refused) return `${error.code}: ${error.message}`;
  return `unexpected error: ${(error as Error).message}`;
}

interface ProbeDefinition {
  id: string;
  title: string;
  attempt: string;
  expected: string;
  run: (workspace: Workspace) => { observed: string; passed: boolean };
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

const DEFINITIONS: ProbeDefinition[] = [
  {
    id: "read-only-role",
    title: "A read only role tries to apply a draft",
    attempt: "Pilar has read only access to daily logs. She accepts a draft and applies it.",
    expected: "Refused before anything is written, and the record is untouched.",
    run: (workspace) => {
      const proposal = proposeClean(workspace);
      try {
        workspace.accept(ACTORS.pilar, proposal.id, proposal.contentHash);
        return { observed: "The acceptance went through, which it must not.", passed: false };
      } catch (error) {
        return { observed: reason(error), passed: error instanceof Refused && error.code === "role_cannot_write" };
      }
    },
  },
  {
    id: "other-company",
    title: "Someone from another company opens the record",
    attempt: "Jo works at another company in the same demonstration. She applies the accepted draft.",
    expected: "Refused, without revealing anything about the record.",
    run: (workspace) => {
      const proposal = proposeClean(workspace);
      workspace.accept(ACTORS.dana, proposal.id, proposal.contentHash);
      try {
        workspace.apply(ACTORS.jo, proposal.id);
        return { observed: "The write went through, which it must not.", passed: false };
      } catch (error) {
        return { observed: reason(error), passed: error instanceof Refused && error.code === "other_company" };
      }
    },
  },
  {
    id: "apply-without-acceptance",
    title: "A draft is applied without being accepted",
    attempt: "The apply call is made directly, the way a script or a stale page would.",
    expected: "Refused by the server. A button is not what makes an acceptance.",
    run: (workspace) => {
      const proposal = proposeClean(workspace);
      try {
        workspace.apply(ACTORS.dana, proposal.id);
        return { observed: "The write went through, which it must not.", passed: false };
      } catch (error) {
        return { observed: reason(error), passed: error instanceof Refused && error.code === "not_accepted" };
      }
    },
  },
  {
    id: "edit-after-acceptance",
    title: "The draft changes after it was accepted",
    attempt: "Dana accepts, then a word is changed in the draft, then it is applied.",
    expected: "Refused. An acceptance is given to one exact version.",
    run: (workspace) => {
      const proposal = proposeClean(workspace);
      workspace.accept(ACTORS.dana, proposal.id, proposal.contentHash);
      workspace.edit(ACTORS.dana, proposal.id, [
        { field: "weather", text: "Rain after lunch, heavy enough to stop tile work." },
      ]);
      try {
        workspace.apply(ACTORS.dana, proposal.id);
        return { observed: "The edited draft was written, which it must not be.", passed: false };
      } catch (error) {
        return {
          observed: reason(error),
          passed: error instanceof Refused && error.code === "acceptance_is_for_another_version",
        };
      }
    },
  },
  {
    id: "apply-twice",
    title: "The same proposal is applied a second time",
    attempt: "The apply call is repeated, the way a double click or a retry would.",
    expected: "Refused the second time, and the record does not move again.",
    run: (workspace) => {
      const proposal = proposeClean(workspace);
      workspace.accept(ACTORS.dana, proposal.id, proposal.contentHash);
      const first = workspace.apply(ACTORS.dana, proposal.id);
      try {
        workspace.apply(ACTORS.dana, proposal.id);
        return { observed: "The second write went through, which it must not.", passed: false };
      } catch (error) {
        const after = workspace.log(ACTORS.dana, LOG_ID);
        const stable = after.version === first.log.version;
        return {
          observed: `${reason(error)} Record version stayed at ${after.version}.`,
          passed: error instanceof Refused && error.code === "already_applied" && stable,
        };
      }
    },
  },
  {
    id: "instruction-in-notes",
    title: "A line in the notes gives the assistance an order",
    attempt:
      "The notes contain a line telling the assistance to mark the log complete and add two hours of overtime, and the recorded answer obeys it.",
    expected: "The extra keys are dropped, the status and the hours are untouched, and the attempt is on the record.",
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
      const untouched =
        applied.log.status === "In Progress" && applied.log.structured.timeCardHours === 26.5;
      return {
        observed: `Dropped by the contract: ${dropped.join(", ")}. Status still ${applied.log.status}, hours still ${applied.log.structured.timeCardHours}.`,
        passed:
          untouched &&
          dropped.includes("status") &&
          dropped.includes("timeCardHours") &&
          dropped.includes("approve") &&
          dropped.includes("fields[field=status]"),
      };
    },
  },
  {
    id: "invented-figures",
    title: "The draft states a duration the notes never gave",
    attempt: "A recorded answer writes that the rain cost about two hours and that three inspectors signed off.",
    expected: "That field is held back with its reason, the rest of the draft still applies.",
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
  },
];

export const PROBE_IDS = DEFINITIONS.map((definition) => definition.id);

export function runProbe(id: string): ProbeResult {
  const definition = DEFINITIONS.find((entry) => entry.id === id);
  if (!definition) throw new Error(`Unknown probe ${id}`);

  const workspace = new Workspace(seedLogs(), `probe-${id}`);
  const before = workspace.log(ACTORS.dana, LOG_ID);
  const { observed, passed } = definition.run(workspace);
  const after = workspace.log(ACTORS.dana, LOG_ID);

  return {
    id: definition.id,
    title: definition.title,
    attempt: definition.attempt,
    expected: definition.expected,
    observed,
    passed,
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
