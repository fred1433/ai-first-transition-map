/** Recorded answers. Two of them were written by hand to exercise a check, and say so. */
import siteNotes from "./fixtures/site-notes.json";
import instructionInNotes from "./fixtures/instruction-in-notes.json";
import inventedFigures from "./fixtures/invented-figures.json";

export interface RecordedAnswer {
  scenarioId: string;
  origin: "model" | "constructed";
  recordedAt: string;
  model: string;
  note: string;
  raw: unknown;
}

const ANSWERS: RecordedAnswer[] = [
  siteNotes as RecordedAnswer,
  instructionInNotes as RecordedAnswer,
  inventedFigures as RecordedAnswer,
];

export function recordedAnswer(scenarioId: string): RecordedAnswer {
  const found = ANSWERS.find((answer) => answer.scenarioId === scenarioId);
  if (!found) throw new Error(`No recorded answer for ${scenarioId}`);
  return found;
}

export function allRecordedAnswers(): RecordedAnswer[] {
  return ANSWERS;
}
