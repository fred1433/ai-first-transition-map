/**
 * The controls the demonstration claims to have. They live in one file so that
 * the mutation test can neutralise one of them in the same code path the demo
 * uses, and show that the suite turns red for the right reason.
 */
import { Refused, type Actor, type DailyLog, type Proposal, type Role } from "./types";

export const ROLE_MAY_WRITE_DAILY_LOG: Record<Role, boolean> = {
  project_manager: true,
  field_supervisor: true,
  read_only_viewer: false,
};

export function assertSameCompany(actor: Actor, record: { companyId: string }): void {
  if (actor.companyId !== record.companyId) {
    throw new Refused("other_company", "This record belongs to another company.");
  }
}

export function assertMayWriteDailyLog(actor: Actor): void {
  if (!ROLE_MAY_WRITE_DAILY_LOG[actor.role]) {
    throw new Refused("role_cannot_write", `The role ${actor.role} cannot write a daily log.`);
  }
}

/**
 * An acceptance names a proposal, the version of the draft it was given to, and
 * the exact text of that version. All three have to still hold. Editing the
 * draft ends the acceptance in force, so going back to a text that was accepted
 * earlier does not revive it: the version has moved on.
 */
export function acceptanceBinds(proposal: Proposal): boolean {
  const accepted = proposal.acceptance;
  // One line, deliberately: it is the whole decision, and it is what the
  // mutation test neutralises.
  return accepted !== undefined && accepted.proposalId === proposal.id && accepted.contentVersion === proposal.contentVersion && accepted.contentHash === proposal.contentHash; /* mutation target */
}

export function assertAcceptanceBindsDraft(proposal: Proposal): void {
  if (acceptanceBinds(proposal)) return;
  if (proposal.acceptance !== undefined) {
    throw new Refused(
      "acceptance_is_for_another_version",
      "This draft changed after it was accepted. It has to be accepted again.",
    );
  }
  const ended = proposal.acceptanceHistory.at(-1);
  if (ended) {
    throw new Refused(
      "acceptance_is_for_another_version",
      `An acceptance was given to version ${ended.contentVersion} and ended when the draft changed. The draft on screen is version ${proposal.contentVersion} and needs its own acceptance.`,
    );
  }
  throw new Refused("not_accepted", "This draft has not been accepted.");
}

export function assertNotAlreadyApplied(proposal: Proposal): void {
  if (proposal.appliedAt) {
    throw new Refused("already_applied", "This proposal was already applied to the log.");
  }
}

/** Fields that survived the checks. A withheld field never reaches the record. */
export function applicableFields(proposal: Proposal) {
  return proposal.fields.filter((field) => !field.withheld);
}

/** The structured side of a log that an assisted step never writes. */
export function structuredSnapshot(log: DailyLog) {
  return JSON.stringify({ status: log.status, structured: log.structured });
}
