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
