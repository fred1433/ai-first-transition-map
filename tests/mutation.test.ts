/**
 * A test suite that stays green when a control is removed proves nothing.
 *
 * This test copies the prototype, neutralises one line inside the same file the
 * demonstration runs through, and checks two things: the forbidden effect now
 * happens, and the control test catches it. If the copy still refuses the
 * attempt, the control was not where the code says it is.
 */
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import { recordedAnswer } from "../lib/prototype/fixtures";
import { acceptanceRequiredInvariant } from "../lib/prototype/invariant";
import { ACTORS, LOG_ID, scenario, seedLogs } from "../lib/prototype/scenario";
import { Workspace } from "../lib/prototype/workspace";
import { Refused } from "../lib/prototype/types";

const ORIGINAL_LINE =
  "return accepted !== undefined && accepted.proposalId === proposal.id && accepted.contentVersion === proposal.contentVersion && accepted.contentHash === proposal.contentHash; /* mutation target */";
const NEUTRALISED_LINE = "return true; /* control neutralised by the mutation test */";

const workDir = resolve(process.cwd(), "mutation-run");

function buildMutatedCopy(): string {
  rmSync(workDir, { recursive: true, force: true });
  mkdirSync(workDir, { recursive: true });
  cpSync(resolve(process.cwd(), "lib/prototype"), join(workDir, "prototype"), { recursive: true });

  const controlsPath = join(workDir, "prototype", "controls.ts");
  const source = readFileSync(controlsPath, "utf8");
  expect(source, "the mutation target line moved, the test would be neutering nothing").toContain(ORIGINAL_LINE);
  writeFileSync(controlsPath, source.replace(ORIGINAL_LINE, NEUTRALISED_LINE));
  return join(workDir, "prototype", "workspace.ts");
}

function applyWithoutAccepting(WorkspaceClass: typeof Workspace) {
  const workspace = new WorkspaceClass(seedLogs(), "mutation-subject");
  const seed = scenario("site-notes");
  const proposal = workspace.propose(ACTORS.dana, {
    logId: LOG_ID,
    sourceNotes: seed.notes,
    raw: recordedAnswer(seed.id).raw,
    origin: "recorded",
  });
  workspace.apply(ACTORS.dana, proposal.id);
  return workspace.log(ACTORS.dana, LOG_ID);
}

describe("neutralising the acceptance control", () => {
  afterAll(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  it("the untouched code refuses to write a draft nobody accepted", () => {
    expect(() => applyWithoutAccepting(Workspace)).toThrowError(Refused);
    try {
      applyWithoutAccepting(Workspace);
    } catch (error) {
      expect((error as Refused).code).toBe("not_accepted");
    }
  });

  it("holds the invariant on the untouched code", () => {
    const report = acceptanceRequiredInvariant(() => new Workspace(seedLogs(), "invariant-original"));
    expect(report.held).toBe(true);
    expect(report.checks.map((check) => check.name)).toEqual([
      "the apply call is refused",
      "the record is unchanged",
    ]);
  });

  it("the mutated copy writes it, and the same invariant fails for the right reason", async () => {
    const mutatedEntry = buildMutatedCopy();
    const mutated = (await import(pathToFileURL(mutatedEntry).href)) as { Workspace: typeof Workspace };

    // The forbidden effect, on the same code path the demonstration uses.
    const record = applyWithoutAccepting(mutated.Workspace);
    expect(record.narrative.workPerformed).toContain("Tile setting");
    expect(record.version).toBe(2);

    // And the harness itself, run against the mutated implementation.
    const report = acceptanceRequiredInvariant(() => new mutated.Workspace(seedLogs(), "invariant-mutated"));
    expect(report.held).toBe(false);
    const refusal = report.checks.find((check) => check.name === "the apply call is refused")!;
    expect(refusal.held).toBe(false);
    expect(refusal.observed).toContain("the write went through");
    const state = report.checks.find((check) => check.name === "the record is unchanged")!;
    expect(state.held).toBe(false);
    expect(state.observed).toContain("version 1 to 2");

    // The original still holds it, so the difference is the mutation and nothing else.
    expect(acceptanceRequiredInvariant(() => new Workspace(seedLogs(), "invariant-original-again")).held).toBe(true);
  });
});
