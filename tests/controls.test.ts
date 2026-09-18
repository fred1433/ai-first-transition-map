/**
 * The controls the page claims, exercised on recorded answers. Each check looks
 * at the stored record before and after, not at the message a screen displayed.
 */
import { describe, expect, it } from "vitest";
import { PROBE_IDS, runProbe, runAllProbes } from "../lib/prototype/probes";
import { ACTORS, LOG_ID, scenario, seedLogs } from "../lib/prototype/scenario";
import { recordedAnswer } from "../lib/prototype/fixtures";
import { Workspace } from "../lib/prototype/workspace";
import { Refused } from "../lib/prototype/types";

describe("controls of the demonstration", () => {
  it("has a probe for every claim the page makes", () => {
    expect(PROBE_IDS).toEqual([
      "read-only-role",
      "other-company",
      "apply-without-acceptance",
      "edit-after-acceptance",
      "apply-twice",
      "instruction-in-notes",
      "invented-figures",
    ]);
  });

  for (const id of PROBE_IDS) {
    it(`${id}: the attempt gets the expected answer`, () => {
      const result = runProbe(id);
      expect(result.observed).toBeTruthy();
      expect(result.passed, `${result.title}: ${result.observed}`).toBe(true);
    });
  }

  it("leaves the record untouched on every refused attempt", () => {
    const refusals = runAllProbes().filter((probe) =>
      ["read-only-role", "other-company", "apply-without-acceptance", "edit-after-acceptance"].includes(probe.id),
    );
    for (const probe of refusals) {
      expect(probe.narrativeAfter, probe.id).toBe("(empty)");
      expect(probe.recordVersionAfter, probe.id).toBe(probe.recordVersionBefore);
      expect(probe.statusAfter, probe.id).toBe(probe.statusBefore);
    }
  });

  it("records every refusal in the audit trail with the reason", () => {
    const probe = runProbe("apply-without-acceptance");
    const refused = probe.audit.filter((entry) => entry.outcome === "refused");
    expect(refused.length).toBeGreaterThan(0);
    expect(refused.at(-1)?.reason).toContain("not_accepted");
    expect(refused.at(-1)?.logVersionBefore).toBe(refused.at(-1)?.logVersionAfter);
  });
});

describe("the accepted path", () => {
  const acceptAndApply = () => {
    const workspace = new Workspace(seedLogs(), "accepted-path");
    const seed = scenario("site-notes");
    const proposal = workspace.propose(ACTORS.dana, {
      logId: LOG_ID,
      sourceNotes: seed.notes,
      raw: recordedAnswer(seed.id).raw,
      origin: "recorded",
      id: "proposal-accepted-path",
    });
    workspace.accept(ACTORS.dana, proposal.id, proposal.contentHash);
    return { workspace, applied: workspace.apply(ACTORS.dana, proposal.id), proposal };
  };

  it("writes the narrative fields and nothing else", () => {
    const before = new Workspace(seedLogs(), "before").log(ACTORS.dana, LOG_ID);
    const { applied } = acceptAndApply();
    expect(applied.log.narrative.workPerformed).toContain("Tile setting");
    expect(applied.log.status).toBe(before.status);
    expect(applied.log.structured).toEqual(before.structured);
    expect(applied.log.version).toBe(before.version + 1);
  });

  it("ties the audit trail to the accepted version", () => {
    const { workspace, proposal } = acceptAndApply();
    const trail = workspace.auditTrail();
    expect(trail.map((entry) => entry.action)).toEqual(["propose", "accept", "apply"]);
    for (const entry of trail) expect(entry.contentHash).toBe(proposal.contentHash);
    expect(trail.at(-1)?.actorId).toBe("dana");
  });

  it("refuses an acceptance that names a version that is not on screen", () => {
    const workspace = new Workspace(seedLogs(), "stale-accept");
    const seed = scenario("site-notes");
    const proposal = workspace.propose(ACTORS.dana, {
      logId: LOG_ID,
      sourceNotes: seed.notes,
      raw: recordedAnswer(seed.id).raw,
      origin: "recorded",
    });
    expect(() => workspace.accept(ACTORS.dana, proposal.id, "0000000000000000")).toThrowError(Refused);
    expect(workspace.log(ACTORS.dana, LOG_ID).narrative.workPerformed).toBe("");
  });
});

/**
 * An acceptance names a proposal, a version and a hash. Going back to a text
 * that was accepted earlier is a new version, so it needs a new acceptance.
 */
describe("an acceptance is bound to a version, not only to a text", () => {
  const draft = () => {
    const workspace = new Workspace(seedLogs(), "version-binding");
    const seed = scenario("site-notes");
    const proposal = workspace.propose(ACTORS.dana, {
      logId: LOG_ID,
      sourceNotes: seed.notes,
      raw: recordedAnswer(seed.id).raw,
      origin: "recorded",
      id: "proposal-version-binding",
    });
    return { workspace, proposal };
  };

  it("refuses to apply after A becomes B and B becomes A again", () => {
    const { workspace, proposal } = draft();
    const originalWeather = proposal.fields.find((field) => field.field === "weather")!.text;
    workspace.accept(ACTORS.dana, proposal.id, proposal.contentHash);

    const b = workspace.edit(ACTORS.dana, proposal.id, [{ field: "weather", text: "Heavy rain after lunch." }]);
    expect(b.contentVersion).toBe(2);

    const backToA = workspace.edit(ACTORS.dana, proposal.id, [{ field: "weather", text: originalWeather }]);
    expect(backToA.contentVersion).toBe(3);
    expect(backToA.contentHash).toBe(proposal.contentHash);

    expect(() => workspace.apply(ACTORS.dana, proposal.id)).toThrowError(Refused);
    try {
      workspace.apply(ACTORS.dana, proposal.id);
    } catch (error) {
      expect((error as Refused).code).toBe("acceptance_is_for_another_version");
      expect((error as Refused).message).toContain("version 1");
      expect((error as Refused).message).toContain("version 3");
    }
    expect(workspace.log(ACTORS.dana, LOG_ID).narrative.workPerformed).toBe("");
  });

  it("keeps the acceptance that was given, as history, and applies only after a new one", () => {
    const { workspace, proposal } = draft();
    workspace.accept(ACTORS.dana, proposal.id, proposal.contentHash);
    const edited = workspace.edit(ACTORS.dana, proposal.id, [{ field: "weather", text: "Heavy rain after lunch." }]);

    expect(edited.acceptance).toBeUndefined();
    expect(edited.acceptanceHistory).toHaveLength(1);
    expect(edited.acceptanceHistory[0].contentVersion).toBe(1);
    expect(edited.acceptanceHistory[0].supersededBy).toBe(2);

    workspace.accept(ACTORS.dana, proposal.id, edited.contentHash);
    const applied = workspace.apply(ACTORS.dana, proposal.id);
    expect(applied.log.narrative.weather).toBe("Heavy rain after lunch.");
    expect(applied.proposal.acceptance?.contentVersion).toBe(2);
  });
});

/**
 * A hash lets you compare two texts. It does not give back a text that is gone.
 * The trail has to carry the notes, every version proposed, what changed, and
 * the version that was accepted.
 */
describe("the trail can reconstruct what happened", () => {
  it("carries the source notes, each version, the edits and the accepted version", () => {
    const workspace = new Workspace(seedLogs(), "reconstruction");
    const seed = scenario("site-notes");
    const proposal = workspace.propose(ACTORS.dana, {
      logId: LOG_ID,
      sourceNotes: seed.notes,
      raw: recordedAnswer(seed.id).raw,
      origin: "recorded",
      id: "proposal-reconstruction",
    });
    workspace.edit(ACTORS.dana, proposal.id, [{ field: "weather", text: "Heavy rain after lunch." }]);
    const accepted = workspace.proposal(proposal.id);
    workspace.accept(ACTORS.dana, proposal.id, accepted.contentHash);
    workspace.apply(ACTORS.dana, proposal.id);

    const trail = workspace.auditTrail();
    const notes = workspace.sourceNotes(proposal.id);
    expect(notes.text).toBe(seed.notes);
    expect(trail.every((entry) => entry.sourceNotesHash === notes.hash)).toBe(true);

    const versions = workspace.versions(proposal.id);
    expect(versions.map((version) => version.contentVersion)).toEqual([1, 2]);
    expect(versions[0].fields.find((field) => field.field === "weather")?.text).toBe("Rain after lunch.");
    expect(versions[1].fields.find((field) => field.field === "weather")?.text).toBe("Heavy rain after lunch.");

    const edit = trail.find((entry) => entry.action === "edit");
    expect(edit?.changes).toEqual([
      { field: "weather", from: "Rain after lunch.", to: "Heavy rain after lunch." },
    ]);

    const applied = trail.find((entry) => entry.action === "apply");
    expect(applied?.acceptedVersion).toBe(2);
  });
});

/**
 * What the page displays about a scenario has to be what the scenario did. A
 * verdict that ignores the state of the record is a label, not a check.
 */
describe("what a scenario reports", () => {
  it("says what was expected, what kind of outcome it is, and where the answer came from", () => {
    for (const id of PROBE_IDS) {
      const result = runProbe(id);
      expect(result.expected, id).toBeTruthy();
      expect(["operation_blocked", "fields_withheld"], id).toContain(result.outcomeKind);
      expect(["model", "constructed"], id).toContain(result.answerOrigin);
    }
  });

  it("carries the state invariants in the same verdict the page reads", () => {
    for (const id of PROBE_IDS) {
      const result = runProbe(id);
      expect(result.invariants.length, id).toBeGreaterThan(0);
      expect(result.invariants.every((invariant) => invariant.held), `${id}: ${result.invariants.map((i) => i.name)}`).toBe(true);
      expect(result.passed, id).toBe(true);
    }
  });

  it("refuses a read only role on the apply call itself, not only on the acceptance", () => {
    const result = runProbe("read-only-role");
    expect(result.attempt).toContain("applies");
    expect(result.observed).toContain("role_cannot_write");
    expect(result.observed.toLowerCase()).toContain("apply");
    expect(result.narrativeAfter).toBe("(empty)");
  });

  it("refuses another company on the read as well as on the write", () => {
    const result = runProbe("other-company");
    expect(result.observed.toLowerCase()).toContain("open");
    expect(result.observed).toContain("other_company");
    expect(result.narrativeAfter).toBe("(empty)");
  });

  it("marks the two scenarios where permitted text is applied and unauthorised fields are withheld", () => {
    expect(runProbe("instruction-in-notes").outcomeKind).toBe("fields_withheld");
    expect(runProbe("invented-figures").outcomeKind).toBe("fields_withheld");
    expect(runProbe("apply-twice").outcomeKind).toBe("operation_blocked");
  });
});
