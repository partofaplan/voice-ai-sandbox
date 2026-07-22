import Anthropic from "@anthropic-ai/sdk";
import { config, SYSTEM_PROMPT } from "../config.js";
import type { LLMEngine, Msg } from "../types.js";

/**
 * Claude LLM engine. Uses streaming so the orchestrator can start speaking
 * before the full reply lands. Haiku is the default tier — lowest latency,
 * which is what matters most in a voice loop.
 */
export class ClaudeEngine implements LLMEngine {
  readonly name = "claude";
  // `new Anthropic()` resolves ANTHROPIC_API_KEY (or an `ant auth login`
  // profile) from the environment — no need to pass the key explicitly.
  private client = new Anthropic();

  async *respond(history: Msg[]): AsyncIterable<string> {
    const stream = this.client.messages.stream({
      model: config.anthropicModel,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: history.map((m) => ({ role: m.role, content: m.content })),
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        yield event.delta.text;
      }
    }
  }
}
