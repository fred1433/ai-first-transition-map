/**
 * The one place that calls a model.
 *
 * Everything about this call is bounded on purpose: the model comes from the
 * environment, the output length is capped, the static instruction is marked
 * for caching, and the answer is parsed as data, never executed. The key stays
 * on the server; nothing here ever reaches the browser.
 */
import Anthropic, { APIError } from "@anthropic-ai/sdk";
import { DRAFT_SYSTEM_PROMPT, draftUserMessage } from "./prompt";

export const MAX_OUTPUT_TOKENS = 1200;

export interface GenerationResult {
  raw: unknown;
  model: string;
  usage: { inputTokens: number; outputTokens: number; cacheReadInputTokens: number; cacheCreationInputTokens: number };
  stopReason: string | null;
}

export class ModelNotConfigured extends Error {}

/** The call did not come back: no credit left, no key accepted, no route, no answer. */
export class ProviderUnavailable extends Error {}

/** The call came back, and the answer held nothing this page can read. */
export class ModelAnswerUnusable extends Error {}

function readModelId(): string {
  const model = process.env.ANTHROPIC_MODEL;
  if (!model) {
    throw new ModelNotConfigured("ANTHROPIC_MODEL is not set. The model is configuration, never a literal in the code.");
  }
  return model;
}

/** Pulls the JSON object out of an answer, without running anything it contains. */
export function parseModelJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("The answer contained no JSON object.");
  }
  return JSON.parse(text.slice(start, end + 1));
}

export async function generateDraft(notes: string): Promise<GenerationResult> {
  const model = readModelId();
  const client = new Anthropic();

  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model,
      max_tokens: MAX_OUTPUT_TOKENS,
      // The instruction never varies, so it is the part worth caching.
      system: [{ type: "text", text: DRAFT_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      // The task is extraction against a contract, not reasoning: the whole
      // output budget goes to the answer.
      thinking: { type: "disabled" },
      messages: [{ role: "user", content: draftUserMessage(notes) }],
    });
  } catch (error) {
    // What the provider says can name the account, the key or the balance, so it
    // stays in the log of this deployment and never travels to a browser.
    console.error("The model call failed.", error);
    if (error instanceof APIError) throw new ProviderUnavailable("The model provider did not answer the call.");
    throw error;
  }

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  let raw: unknown;
  try {
    raw = parseModelJson(text);
  } catch (error) {
    console.error("The model answer could not be read.", error);
    throw new ModelAnswerUnusable("The answer held no JSON object this page can read.");
  }

  return {
    raw,
    model: response.model,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      cacheReadInputTokens: response.usage.cache_read_input_tokens ?? 0,
      cacheCreationInputTokens: response.usage.cache_creation_input_tokens ?? 0,
    },
    stopReason: response.stop_reason,
  };
}
