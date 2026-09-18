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
 * An acceptance is given to one exact draft. Editing the draft afterwards
 * invalidates it, and applying an unaccepted draft is refused by the server,
 * whatever the browser displays.
 */
export function assertAcceptanceBindsDraft(proposal: Proposal): void {
  const accepted = proposal.acceptance;
  const bound = accepted !== undefined && accepted.contentHash === proposal.contentHash; /* mutation target */
  if (!bound) {
    throw new Refused(
      accepted === undefined ? "not_accepted" : "acceptance_is_for_another_version",
      accepted === undefined
        ? "This draft has not been accepted."
        : "This draft changed after it was accepted. It has to be accepted again.",
    );
  }
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
