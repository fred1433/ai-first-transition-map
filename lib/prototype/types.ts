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

export interface ProposedField {
  field: NarrativeField;
  text: string;
  provenance: ProvenanceQuote[];
  /** Set when a check refused the field. A withheld field is never applied. */
  withheld?: { reason: string; detail: string };
}

export interface MissingInformation {
  topic: string;
  why: string;
}

export interface Proposal {
  id: string;
  caseId: string;
  companyId: string;
  logId: string;
  /** Increases on every edit of the draft. */
  contentVersion: number;
  /** What an acceptance is bound to. */
  contentHash: string;
  fields: ProposedField[];
  missing: MissingInformation[];
  /** What the draft deliberately does not state. */
  refusals: string[];
  origin: "recorded" | "live";
  createdAt: string;
  /** Keys the model returned that the contract does not allow. Kept as evidence. */
  rejectedKeys: string[];
  acceptance?: {
    by: string;
    at: string;
    /** The exact draft that was accepted. */
    contentHash: string;
  };
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
