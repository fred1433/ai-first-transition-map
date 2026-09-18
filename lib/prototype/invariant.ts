/**
 * One invariant, written once, runnable against any implementation of the
 * workspace: the one the demonstration uses, and the mutated copy the mutation
 * test builds. Running it against both is what turns "a control exists" into
 * "removing the control is detected by this harness".
 *
 * Nothing here uses instanceof: the mutated copy carries its own copy of the
 * error class, so a refusal is recognised by its name and its code, the way a
 * caller on the other side of a boundary would have to.
 */
import { recordedAnswer } from "./fixtures";
import { ACTORS, LOG_ID, scenario } from "./scenario";
import type { DailyLog, Proposal } from "./types";

export interface WorkspaceLike {
  auditTrail(): unknown[];
  propose(
    actor: (typeof ACTORS)[string],
    input: { logId: string; sourceNotes: string; raw: unknown; origin: "recorded" | "live"; id?: string },
  ): Proposal;
  apply(actor: (typeof ACTORS)[string], proposalId: string): { log: DailyLog; proposal: Proposal };
  log(actor: (typeof ACTORS)[string], logId: string): DailyLog;
}

export interface InvariantCheck {
  name: string;
  expected: string;
  observed: string;
  held: boolean;
}

export interface InvariantReport {
  held: boolean;
  checks: InvariantCheck[];
}

interface RefusalLike {
  name?: string;
  code?: string;
  message?: string;
}

function refusalOf(error: unknown): { code: string; message: string } | null {
  const candidate = error as RefusalLike;
  if (candidate?.name !== "Refused" || typeof candidate.code !== "string") return null;
  return { code: candidate.code, message: candidate.message ?? "" };
}

const narrativeOf = (log: DailyLog) =>
  [log.narrative.workPerformed, log.narrative.weather, log.narrative.notes].filter(Boolean).join(" ").trim();

/**
 * A draft nobody accepted must not reach the record, and the record must be
 * exactly where it was. Both halves matter: a refusal that writes anyway, or a
 * silent write, fail the same invariant.
 */
export function acceptanceRequiredInvariant(make: () => WorkspaceLike): InvariantReport {
  const workspace = make();
  const before = workspace.log(ACTORS.dana, LOG_ID);
  const seed = scenario("site-notes");

  const proposal = workspace.propose(ACTORS.dana, {
    logId: LOG_ID,
    sourceNotes: seed.notes,
    raw: recordedAnswer(seed.id).raw,
    origin: "recorded",
    id: "invariant-proposal",
  });

  let refusal: { code: string; message: string } | null = null;
  let wentThrough = false;
  try {
    workspace.apply(ACTORS.dana, proposal.id);
    wentThrough = true;
  } catch (error) {
    refusal = refusalOf(error);
    if (!refusal) throw error;
  }

  const after = workspace.log(ACTORS.dana, LOG_ID);
  const unchanged =
    after.version === before.version &&
    narrativeOf(after) === narrativeOf(before) &&
    after.status === before.status;

  const checks: InvariantCheck[] = [
    {
      name: "the apply call is refused",
      expected: "Refused with not_accepted.",
      observed: wentThrough
        ? "the write went through, which it must not"
        : `${refusal?.code}: ${refusal?.message}`,
      held: !wentThrough && refusal?.code === "not_accepted",
    },
    {
      name: "the record is unchanged",
      expected: `Record stays at version ${before.version}, narrative empty, status ${before.status}.`,
      observed: unchanged
        ? `record version ${after.version}, narrative ${narrativeOf(after) || "(empty)"}, status ${after.status}`
        : `record version ${before.version} to ${after.version}, narrative ${narrativeOf(after) || "(empty)"}, status ${after.status}`,
      held: unchanged,
    },
  ];

  return { held: checks.every((check) => check.held), checks };
}
