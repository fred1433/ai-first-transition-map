/**
 * A small synthetic workspace: one company, one project, one daily log, and the
 * steps an assisted draft goes through. Everything is held in memory and every
 * record is fictional.
 *
 * The point of the file is the order of the checks: a draft is only a claim
 * until the server has verified it against the notes, a human has accepted that
 * exact version, and the write has been limited to the narrative fields.
 */
import { createHash, randomUUID } from "node:crypto";
import {
  applicableFields,
  assertAcceptanceBindsDraft,
  assertMayWriteDailyLog,
  assertNotAlreadyApplied,
  assertSameCompany,
} from "./controls";
import { applyContract, withholdUnsupported, type DraftShape } from "./validate";
import {
  Refused,
  type Actor,
  type AuditEntry,
  type DailyLog,
  type NarrativeField,
  type Proposal,
} from "./types";

export function hashFields(fields: { field: NarrativeField; text: string }[]): string {
  const canonical = JSON.stringify(fields.map((entry) => [entry.field, entry.text]).sort());
  return createHash("sha256").update(canonical).digest("hex").slice(0, 16);
}

export interface ProposeInput {
  logId: string;
  sourceNotes: string;
  /** Raw model output, trusted for nothing. */
  raw: unknown;
  origin: "recorded" | "live";
  /** Only for reproducible tests. */
  id?: string;
}

export class Workspace {
  readonly caseId: string;
  private readonly logs = new Map<string, DailyLog>();
  private readonly proposals = new Map<string, Proposal>();
  private readonly audit: AuditEntry[] = [];

  constructor(logs: DailyLog[], caseId: string = randomUUID()) {
    this.caseId = caseId;
    for (const log of logs) this.logs.set(log.id, structuredClone(log));
  }

  log(actor: Actor, logId: string): DailyLog {
    const log = this.logs.get(logId);
    if (!log) throw new Refused("unknown_case", "No such daily log in this demonstration.");
    assertSameCompany(actor, log);
    return structuredClone(log);
  }

  proposal(proposalId: string): Proposal {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) throw new Refused("unknown_proposal", "No such proposal in this demonstration.");
    return structuredClone(proposal);
  }

  auditTrail(): AuditEntry[] {
    return structuredClone(this.audit);
  }

  propose(actor: Actor, input: ProposeInput): Proposal {
    const log = this.logs.get(input.logId);
    if (!log) throw new Refused("unknown_case", "No such daily log in this demonstration.");
    const before = log.version;
    try {
      assertSameCompany(actor, log);
      const contract: DraftShape = applyContract(input.raw);
      const fields = withholdUnsupported(contract.fields, input.sourceNotes);
      const proposal: Proposal = {
        id: input.id ?? randomUUID(),
        caseId: this.caseId,
        companyId: log.companyId,
        logId: log.id,
        contentVersion: 1,
        contentHash: hashFields(fields),
        fields,
        missing: contract.missing,
        refusals: contract.refusals,
        rejectedKeys: contract.rejectedKeys,
        origin: input.origin,
        createdAt: new Date().toISOString(),
      };
      this.proposals.set(proposal.id, proposal);
      this.record(actor, "propose", proposal, "recorded", undefined, before, log.version);
      return structuredClone(proposal);
    } catch (error) {
      this.recordRefusal(actor, "propose", input.logId, error, before);
      throw error;
    }
  }

  /** Editing a draft produces a new version and cancels any acceptance. */
  edit(actor: Actor, proposalId: string, edits: { field: NarrativeField; text: string }[]): Proposal {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) throw new Refused("unknown_proposal", "No such proposal in this demonstration.");
    const log = this.logs.get(proposal.logId)!;
    const before = log.version;
    try {
      assertSameCompany(actor, proposal);
      assertMayWriteDailyLog(actor);
      assertNotAlreadyApplied(proposal);
      const fields = proposal.fields.map((field) => {
        const edit = edits.find((entry) => entry.field === field.field);
        return edit ? { ...field, text: edit.text } : field;
      });
      proposal.fields = fields;
      proposal.contentVersion += 1;
      proposal.contentHash = hashFields(fields);
      // The acceptance is deliberately kept, bound to the version it was given
      // to. It becomes visibly out of date rather than quietly disappearing.
      this.record(actor, "edit", proposal, "recorded", undefined, before, log.version);
      return structuredClone(proposal);
    } catch (error) {
      this.recordRefusal(actor, "edit", proposal.logId, error, before, proposal);
      throw error;
    }
  }

  /** Accepting names the exact draft that was read. */
  accept(actor: Actor, proposalId: string, contentHash: string): Proposal {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) throw new Refused("unknown_proposal", "No such proposal in this demonstration.");
    const log = this.logs.get(proposal.logId)!;
    const before = log.version;
    try {
      assertSameCompany(actor, proposal);
      assertMayWriteDailyLog(actor);
      assertNotAlreadyApplied(proposal);
      if (contentHash !== proposal.contentHash) {
        throw new Refused(
          "acceptance_is_for_another_version",
          "The draft changed since it was displayed. Read it again before accepting.",
        );
      }
      proposal.acceptance = { by: actor.id, at: new Date().toISOString(), contentHash };
      this.record(actor, "accept", proposal, "recorded", undefined, before, log.version);
      return structuredClone(proposal);
    } catch (error) {
      this.recordRefusal(actor, "accept", proposal.logId, error, before, proposal);
      throw error;
    }
  }

  /** Writes the accepted narrative fields, and nothing else. */
  apply(actor: Actor, proposalId: string): { log: DailyLog; proposal: Proposal } {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) throw new Refused("unknown_proposal", "No such proposal in this demonstration.");
    const log = this.logs.get(proposal.logId)!;
    const before = log.version;
    try {
      assertSameCompany(actor, proposal);
      assertMayWriteDailyLog(actor);
      assertNotAlreadyApplied(proposal);
      assertAcceptanceBindsDraft(proposal);
      for (const field of applicableFields(proposal)) {
        log.narrative[field.field] = field.text;
      }
      log.version += 1;
      proposal.appliedAt = new Date().toISOString();
      this.record(actor, "apply", proposal, "recorded", undefined, before, log.version);
      return { log: structuredClone(log), proposal: structuredClone(proposal) };
    } catch (error) {
      this.recordRefusal(actor, "apply", proposal.logId, error, before, proposal);
      throw error;
    }
  }

  private record(
    actor: Actor,
    action: AuditEntry["action"],
    proposal: Proposal,
    outcome: AuditEntry["outcome"],
    reason: string | undefined,
    logVersionBefore: number,
    logVersionAfter: number,
  ): void {
    this.audit.push({
      at: new Date().toISOString(),
      actorId: actor.id,
      actorRole: actor.role,
      action,
      proposalId: proposal.id,
      logId: proposal.logId,
      contentVersion: proposal.contentVersion,
      contentHash: proposal.contentHash,
      outcome,
      reason,
      logVersionBefore,
      logVersionAfter,
    });
  }

  private recordRefusal(
    actor: Actor,
    action: AuditEntry["action"],
    logId: string,
    error: unknown,
    logVersion: number,
    proposal?: Proposal,
  ): void {
    const reason = error instanceof Refused ? `${error.code}: ${error.message}` : "unexpected_error";
    this.audit.push({
      at: new Date().toISOString(),
      actorId: actor.id,
      actorRole: actor.role,
      action,
      proposalId: proposal?.id ?? "none",
      logId,
      contentVersion: proposal?.contentVersion ?? 0,
      contentHash: proposal?.contentHash ?? "none",
      outcome: "refused",
      reason,
      logVersionBefore: logVersion,
      logVersionAfter: logVersion,
    });
  }
}
