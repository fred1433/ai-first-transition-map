/**
 * What a model returns is a claim, not a result.
 *
 * Three checks run on every draft, recorded or live:
 *  1. contract: only the three narrative fields survive, anything else is dropped
 *     and reported (a note that carries an instruction cannot widen the contract);
 *  2. provenance: every excerpt a sentence relies on must appear verbatim in the
 *     notes, and stays attached to that sentence rather than to the field;
 *  3. quantities: a number, a clock time or a sum in a sentence must be traceable
 *     to the notes that sentence cites, so a shower of rain does not become two
 *     hours of delay.
 *
 * What these checks are, and what they are not: they compare words. Source
 * excerpts are checked against the notes. Factual fidelity still requires review,
 * and the counter-examples in tests/validate.test.ts show where a lexical check
 * ends, with an invented responsibility that carries an authentic excerpt.
 *
 * A sentence that fails a check withholds its field. A withheld field is never
 * applied.
 */
import {
  NARRATIVE_FIELDS,
  type MissingInformation,
  type NarrativeField,
  type ProposedField,
  type ProposedPart,
  type Withheld,
} from "./types";

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
    .replace(/[^a-z0-9:.,'%/$€£\- ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const joinParts = (parts: ProposedPart[]) => parts.map((part) => part.text).join(" ").trim();
const allQuotes = (parts: ProposedPart[]) => parts.flatMap((part) => part.provenance);

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
    // so the texts are joined rather than silently overwriting each other, and
    // each sentence keeps the excerpts it cited: a fact and its excerpt stay
    // together, which is what a reviewer needs in order to check either one.
    const part: ProposedPart = { text, provenance };
    const existing = fields.find((entry) => entry.field === field);
    if (existing) {
      existing.parts.push(part);
      existing.text = joinParts(existing.parts);
      existing.provenance = allQuotes(existing.parts);
    } else {
      fields.push({ field, text, parts: [part], provenance: [...provenance] });
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
 * Known limit, stated rather than hidden: outside the list below, and outside the
 * clock times and sums read separately, the check reads the number, not what the
 * number counts. And a sentence with no number at all, an invented cause or an
 * invented responsibility, is not something words can catch.
 */
export const COMMITMENT_UNITS = [
  "hour", "hours", "minute", "minutes", "day", "days", "week", "weeks", "month", "months",
  "dollar", "dollars", "usd", "percent", "people", "person", "worker", "workers", "men",
  "man", "crew", "crews", "inspector", "inspectors", "visitor", "visitors", "truck", "trucks",
];

const CURRENCY_WORDS = ["dollar", "dollars", "usd", "euro", "euros", "eur", "pound", "pounds", "gbp"];

const singular = (word: string) => (word.endsWith("s") ? word.slice(0, -1) : word);

/**
 * Clock times, read wherever they sit in the sentence. A time of day commits the
 * record to a moment, and it needs no unit behind it to do so: "resumed at 14:30"
 * has to come from the notes, whether or not another word follows it.
 */
function unsupportedTimes(needle: string, haystack: string): string[] {
  const found: string[] = [];
  for (const match of needle.matchAll(/\b(\d{1,2}[:h]\d{2})\s*(am|pm)?/g)) {
    const time = match[1];
    const suffix = match[2] ? ` ${match[2]}` : "";
    if (!haystack.includes(time)) found.push(`${time}${suffix}`);
  }
  return found;
}

/**
 * Sums of money, read from the symbol as well as from the word. A number at the
 * end of a sentence has no unit after it, which is exactly where a cost slips
 * through if the check only looks for "number then word".
 */
function unsupportedAmounts(needle: string, haystack: string): string[] {
  const found: string[] = [];
  for (const match of needle.matchAll(/([$€£])\s?(\d[\d.,]*)/g)) {
    const [symbol, digits] = [match[1], match[2].replace(/[.,]$/, "")];
    const withSymbol = haystack.includes(`${symbol}${digits}`) || haystack.includes(`${symbol} ${digits}`);
    const withWord = CURRENCY_WORDS.some((word) => haystack.includes(`${digits} ${word}`));
    if (!withSymbol && !withWord) found.push(`${symbol}${digits}`);
  }
  return found;
}

/** Quantities in a sentence that the notes do not support. */
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
  return [...new Set([...unsupported, ...unsupportedTimes(needle, haystack), ...unsupportedAmounts(needle, haystack)])];
}

/** Checks one sentence against the notes and the excerpts that sentence cites. */
function checkPart(part: ProposedPart, notes: string, normalisedNotes: string): ProposedPart {
  if (part.provenance.length === 0) {
    return { ...part, withheld: { reason: "no_provenance", detail: "The sentence cites nothing from the notes." } };
  }
  const unquoted = part.provenance.filter((entry) => !normalisedNotes.includes(normaliseForComparison(entry.quote)));
  if (unquoted.length > 0) {
    return {
      ...part,
      withheld: {
        reason: "quote_not_in_notes",
        detail: `Cited but absent from the notes: ${unquoted.map((entry) => `"${entry.quote}"`).join(", ")}`,
      },
    };
  }
  const supporting = `${notes} ${part.provenance.map((entry) => entry.quote).join(" ")}`;
  const quantities = unsupportedQuantities(part.text, supporting);
  if (quantities.length > 0) {
    return {
      ...part,
      withheld: { reason: "quantity_not_in_notes", detail: `Stated but absent from the notes: ${quantities.join(", ")}` },
    };
  }
  return { text: part.text, provenance: part.provenance };
}

/** A field on its way in: the sentences may not have been separated yet. */
export type UncheckedField = Omit<ProposedField, "parts" | "withheld"> & { parts?: ProposedPart[] };

/**
 * Marks every sentence the notes do not support, and withholds the field that
 * carries it. Returns a new list, nothing is mutated.
 */
export function withholdUnsupported(fields: UncheckedField[], sourceNotes: string): ProposedField[] {
  const normalisedNotes = normaliseForComparison(sourceNotes);
  return fields.map((field) => {
    const parts = (field.parts ?? [{ text: field.text, provenance: field.provenance }]).map((part) =>
      checkPart(part, sourceNotes, normalisedNotes),
    );
    const failed = parts.find((part) => part.withheld);
    const base: ProposedField = {
      field: field.field,
      text: joinParts(parts),
      parts,
      provenance: allQuotes(parts),
    };
    if (!failed) return base;
    const detail: Withheld =
      parts.length > 1
        ? { reason: failed.withheld!.reason, detail: `${failed.withheld!.detail} In: "${failed.text}"` }
        : failed.withheld!;
    return { ...base, withheld: detail };
  });
}
