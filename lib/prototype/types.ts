/** Types of the demonstration workspace. Every record here is synthetic. */

export type NarrativeField = "workPerformed" | "weather" | "notes";
export const NARRATIVE_FIELDS: NarrativeField[] = ["workPerformed", "weather", "notes"];

/** Business status of a daily log record. The assistance never sets it. */
export type LogStatus = "In Progress" | "Deferred" | "Complete";

export type Role = "project_manager" | "field_supervisor" | "read_only_viewer";

export interface Actor {
  id: string;
  name: string;
  role: Role;
  companyId: string;
}

export interface DailyLog {
  id: string;
  companyId: string;
  projectName: string;
  date: string;
  status: LogStatus;
  /** The only fields an accepted proposal can write. */
  narrative: Record<NarrativeField, string>;
  /** Kept to show what stays out of reach: hours, items and linked records. */
  structured: {
    timeCardHours: number;
    equipment: string[];
    linkedIncidents: number;
  };
  version: number;
}

export interface ProvenanceQuote {
  /** Verbatim fragment of the source notes. Checked, not trusted. */
  quote: string;
}

export interface Withheld {
  reason: "no_provenance" | "quote_not_in_notes" | "quantity_not_in_notes";
  detail: string;
}

/**
 * One sentence of a draft with the excerpts it rests on. A model often answers
 * with one entry per sentence; the form has one field. The texts are joined for
 * the record, the excerpts stay attached to the sentence that cited them.
 */
export interface ProposedPart {
  text: string;
  provenance: ProvenanceQuote[];
  withheld?: Withheld;
}

export interface ProposedField {
  field: NarrativeField;
  /** The sentences joined, which is what an accepted draft writes. */
  text: string;
  parts: ProposedPart[];
  /** Every excerpt of every sentence, kept for display of the whole field. */
  provenance: ProvenanceQuote[];
  /** Set when a check refused the field. A withheld field is never applied. */
  withheld?: Withheld;
}

export interface MissingInformation {
  topic: string;
  why: string;
}

export interface Acceptance {
  by: string;
  at: string;
  /** An acceptance names a proposal, a version and the exact text of it. */
  proposalId: string;
  contentVersion: number;
  contentHash: string;
  /** Set when a later edit ended this acceptance. */
  supersededBy?: number;
}

export interface DraftVersion {
  contentVersion: number;
  contentHash: string;
  at: string;
  fields: { field: NarrativeField; text: string }[];
}

export interface FieldChange {
  field: NarrativeField;
  from: string;
  to: string;
}

export interface Proposal {
  id: string;
  caseId: string;
  companyId: string;
  logId: string;
  /** Increases on every edit of the draft. */
  contentVersion: number;
  /** What an acceptance is bound to, together with the version above. */
  contentHash: string;
  /** Immutable reference to the notes the draft was made from. */
  sourceNotesHash: string;
  fields: ProposedField[];
  missing: MissingInformation[];
  /** What the draft deliberately does not state. */
  refusals: string[];
  origin: "recorded" | "live";
  createdAt: string;
  /** Keys the model returned that the contract does not allow. Kept as evidence. */
  rejectedKeys: string[];
  /** Every version proposed, so a hash is not the only trace of a text. */
  versions: DraftVersion[];
  /** The acceptance in force, if the draft has not changed since. */
  acceptance?: Acceptance;
  /** Acceptances that an edit ended. Kept, never deleted. */
  acceptanceHistory: Acceptance[];
  appliedAt?: string;
}

export interface AuditEntry {
  at: string;
  actorId: string;
  actorRole: Role;
  action: "propose" | "edit" | "accept" | "apply";
  proposalId: string;
  logId: string;
  contentVersion: number;
  contentHash: string;
  /** The notes the draft came from, the same value on every entry of a proposal. */
  sourceNotesHash: string;
  /** The text of every field at this point, so the trail gives back the draft. */
  snapshot?: { field: NarrativeField; text: string }[];
  /** What an edit changed, field by field. */
  changes?: FieldChange[];
  /** The version an acceptance named, carried on accept and on apply. */
  acceptedVersion?: number;
  outcome: "recorded" | "refused";
  reason?: string;
  logVersionBefore: number;
  logVersionAfter: number;
}

export type RefusalCode =
  | "unknown_case"
  | "unknown_proposal"
  | "other_company"
  | "role_cannot_write"
  | "not_accepted"
  | "acceptance_is_for_another_version"
  | "already_applied";

export class Refused extends Error {
  constructor(
    public code: RefusalCode,
    message: string,
  ) {
    super(message);
    this.name = "Refused";
  }
}
