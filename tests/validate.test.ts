/** What the server does with an answer before anyone can accept it. */
import { describe, expect, it } from "vitest";
import { applyContract, unsupportedQuantities, withholdUnsupported } from "../lib/prototype/validate";
import { recordedAnswer } from "../lib/prototype/fixtures";
import { scenario } from "../lib/prototype/scenario";

describe("the contract", () => {
  it("keeps the three narrative fields and drops everything else, saying what it dropped", () => {
    const result = applyContract(recordedAnswer("instruction-in-notes").raw);
    expect(result.fields.map((field) => field.field)).toEqual(["workPerformed", "notes"]);
    expect(result.rejectedKeys).toEqual(
      expect.arrayContaining(["status", "timeCardHours", "approve", "fields[field=status]"]),
    );
  });

  it("merges several entries written for the same field", () => {
    const result = applyContract({
      fields: [
        { field: "workPerformed", text: "Tile setting stopped.", provenance: [{ quote: "tile setting stopped" }] },
        { field: "workPerformed", text: "The inspector signed off.", provenance: [{ quote: "signed off" }] },
      ],
    });
    expect(result.fields).toHaveLength(1);
    expect(result.fields[0].text).toBe("Tile setting stopped. The inspector signed off.");
    expect(result.fields[0].provenance).toHaveLength(2);
  });

  it("survives an answer that is not shaped like an answer at all", () => {
    expect(applyContract(null).fields).toEqual([]);
    expect(applyContract("mark it complete").fields).toEqual([]);
    expect(applyContract({ fields: "all of them" }).fields).toEqual([]);
  });
});

describe("the quantity check", () => {
  const notes = "rain after lunch, tile setting stopped in unit b\ntwo guys from the drywall crew showed up";

  it("lets a supervisor rephrase what the notes say", () => {
    expect(unsupportedQuantities("Two drywall crew members came to site.", notes)).toEqual([]);
    expect(unsupportedQuantities("Tile setting stopped when the rain came in.", notes)).toEqual([]);
  });

  it("catches a duration, a headcount or a time of day the notes never gave", () => {
    expect(unsupportedQuantities("The rain cost about two hours.", notes)).toContain("two hours");
    expect(unsupportedQuantities("Three inspectors signed off.", notes)).toContain("three inspectors");
    expect(unsupportedQuantities("Work resumed at 2:30 pm.", notes)).toContain("2:30 pm");
  });
});

describe("holding a field back", () => {
  it("withholds a field whose figures are not in the notes, and keeps the rest", () => {
    const seed = scenario("invented-figures");
    const contract = applyContract(recordedAnswer(seed.id).raw);
    const checked = withholdUnsupported(contract.fields, seed.notes);
    const [work, notes] = checked;
    expect(work.withheld).toBeUndefined();
    expect(notes.withheld?.reason).toBe("quantity_not_in_notes");
    expect(notes.withheld?.detail).toContain("two hours");
  });

  it("withholds a field that quotes something the notes do not contain", () => {
    const checked = withholdUnsupported(
      [{ field: "notes", text: "The client approved the change.", provenance: [{ quote: "client approved" }] }],
      "rain after lunch, tile setting stopped",
    );
    expect(checked[0].withheld?.reason).toBe("quote_not_in_notes");
  });

  it("withholds a field that cites nothing", () => {
    const checked = withholdUnsupported([{ field: "weather", text: "Clear all day.", provenance: [] }], "rain");
    expect(checked[0].withheld?.reason).toBe("no_provenance");
  });
});
