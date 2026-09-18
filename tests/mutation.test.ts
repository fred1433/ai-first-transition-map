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
import { ACTORS, LOG_ID, scenario, seedLogs } from "../lib/prototype/scenario";
import { Workspace } from "../lib/prototype/workspace";
import { Refused } from "../lib/prototype/types";

const ORIGINAL_LINE =
  "const bound = accepted !== undefined && accepted.contentHash === proposal.contentHash; /* mutation target */";
const NEUTRALISED_LINE = "const bound = true; /* control neutralised by the mutation test */";

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

  it("the mutated copy writes it, and the control test catches the difference", async () => {
    const mutatedEntry = buildMutatedCopy();
    const mutated = (await import(pathToFileURL(mutatedEntry).href)) as { Workspace: typeof Workspace };

    const record = applyWithoutAccepting(mutated.Workspace);

    // The forbidden effect, on the same code path the demonstration uses.
    expect(record.narrative.workPerformed).toContain("Tile setting");
    expect(record.version).toBe(2);

    // And what the control suite would report on that copy.
    let refusedByOriginal = false;
    try {
      applyWithoutAccepting(Workspace);
    } catch {
      refusedByOriginal = true;
    }
    expect(refusedByOriginal).toBe(true);
  });
});
