/**
 * What a model returns is a claim, not a result.
 *
 * Three checks run on every draft, recorded or live:
 *  1. contract: only the three narrative fields survive, anything else is dropped
 *     and reported (a note that carries an instruction cannot widen the contract);
 *  2. provenance: every quote a field relies on must appear verbatim in the notes;
 *  3. quantities: a number in the draft must be traceable to the notes, so a
 *     shower of rain does not become two hours of delay.
 *
 * A field that fails a check is withheld. A withheld field is never applied.
 */
import { NARRATIVE_FIELDS, type MissingInformation, type NarrativeField, type ProposedField } from "./types";

export interface DraftShape {
  fields: ProposedField[];
  missing: MissingInformation[];
  refusals: string[];
  rejectedKeys: string[];
}

const ALLOWED_TOP_LEVEL = new Set(["fields", "missing", "refusals"]);
const ALLOWED_FIELD_KEYS = new Set(["field", "text", "provenance"]);

const NUMBER_WORDS = [
  "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "half", "dozen", "couple",
];

export function normaliseForComparison(value: string): string {
  return value
    .toLowerCase()
    .replace(/[‘’“”]/g, "'")
    .replace(/[^a-z0-9:.,'%/\- ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Keeps the allowed shape, drops the rest, and says what it dropped. */
export function applyContract(raw: unknown): DraftShape {
  const rejectedKeys: string[] = [];
  const source = (raw ?? {}) as Record<string, unknown>;

  for (const key of Object.keys(source)) {
    if (!ALLOWED_TOP_LEVEL.has(key)) rejectedKeys.push(key);
  }

  const fields: ProposedField[] = [];
  const rawFields = Array.isArray(source.fields) ? source.fields : [];
  for (const entry of rawFields) {
    const item = (entry ?? {}) as Record<string, unknown>;
    for (const key of Object.keys(item)) {
      if (!ALLOWED_FIELD_KEYS.has(key)) rejectedKeys.push(`fields[].${key}`);
    }
    const field = item.field as NarrativeField;
    if (!NARRATIVE_FIELDS.includes(field)) {
      if (typeof item.field === "string") rejectedKeys.push(`fields[field=${item.field}]`);
      continue;
    }
    const text = typeof item.text === "string" ? item.text.trim() : "";
    if (!text) continue;
    const provenance = Array.isArray(item.provenance)
      ? item.provenance
          .map((quote) => {
            const value = (quote ?? {}) as Record<string, unknown>;
            const text = typeof value.quote === "string" ? value.quote.trim() : "";
            return text ? { quote: text } : null;
          })
          .filter((quote): quote is { quote: string } => quote !== null)
      : [];
    // A model often answers with one entry per sentence. The form has one field,
    // so entries for the same field are merged rather than silently overwriting
    // each other when the draft is applied.
    const existing = fields.find((entry) => entry.field === field);
    if (existing) {
      existing.text = `${existing.text} ${text}`.trim();
      existing.provenance = [...existing.provenance, ...provenance];
    } else {
      fields.push({ field, text, provenance });
    }
  }

  const missing = (Array.isArray(source.missing) ? source.missing : [])
    .map((entry) => {
      const item = (entry ?? {}) as Record<string, unknown>;
      const topic = typeof item.topic === "string" ? item.topic.trim() : "";
      const why = typeof item.why === "string" ? item.why.trim() : "";
      return topic ? { topic, why } : null;
    })
    .filter((entry): entry is MissingInformation => entry !== null);

  const refusals = (Array.isArray(source.refusals) ? source.refusals : [])
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean);

  return { fields, missing, refusals, rejectedKeys: [...new Set(rejectedKeys)] };
}

/**
 * Units that carry a commitment: a duration, a sum, a headcount. For those, the
 * number and what it counts have to be in the notes together, so that two men on
 * site never become two hours of delay. For anything else, the number itself has
 * to appear in the notes, which leaves a supervisor free to rephrase.
 *
 * Known limit, stated rather than hidden: outside the list below the check reads
 * the number, not what the number counts.
 */
export const COMMITMENT_UNITS = [
  "hour", "hours", "minute", "minutes", "day", "days", "week", "weeks", "month", "months",
  "dollar", "dollars", "usd", "percent", "people", "person", "worker", "workers", "men",
  "man", "crew", "crews", "inspector", "inspectors", "visitor", "visitors", "truck", "trucks",
];

const singular = (word: string) => (word.endsWith("s") ? word.slice(0, -1) : word);

/** Quantities in a draft that the notes do not support. */
export function unsupportedQuantities(text: string, supporting: string): string[] {
  const haystack = normaliseForComparison(supporting);
  const needle = normaliseForComparison(text);
  const pattern = new RegExp(`\\b(\\d+(?:[.,:]\\d+)*|${NUMBER_WORDS.join("|")})\\s+([a-z]+)`, "g");
  const unsupported: string[] = [];
  for (const match of needle.matchAll(pattern)) {
    const quantity = match[1];
    const unit = match[2];
    const phrase = `${quantity} ${unit}`;
    const commits = COMMITMENT_UNITS.includes(unit);
    const supported = commits
      ? haystack.includes(phrase) || haystack.includes(`${quantity} ${singular(unit)}`)
      : haystack.includes(quantity);
    if (!supported) unsupported.push(phrase);
  }
  return [...new Set(unsupported)];
}

/** Marks every field the notes do not support. Returns a new list, nothing is mutated. */
export function withholdUnsupported(fields: ProposedField[], sourceNotes: string): ProposedField[] {
  const notes = normaliseForComparison(sourceNotes);
  return fields.map((field) => {
    if (field.provenance.length === 0) {
      return { ...field, withheld: { reason: "no_provenance", detail: "The draft cites nothing from the notes." } };
    }
    const unquoted = field.provenance.filter((entry) => !notes.includes(normaliseForComparison(entry.quote)));
    if (unquoted.length > 0) {
      return {
        ...field,
        withheld: {
          reason: "quote_not_in_notes",
          detail: `Cited but absent from the notes: ${unquoted.map((entry) => `"${entry.quote}"`).join(", ")}`,
        },
      };
    }
    const supporting = `${sourceNotes} ${field.provenance.map((entry) => entry.quote).join(" ")}`;
    const quantities = unsupportedQuantities(field.text, supporting);
    if (quantities.length > 0) {
      return {
        ...field,
        withheld: {
          reason: "quantity_not_in_notes",
          detail: `Stated but absent from the notes: ${quantities.join(", ")}`,
        },
      };
    }
    return { ...field };
  });
}
