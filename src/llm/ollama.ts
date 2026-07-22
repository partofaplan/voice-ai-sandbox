import { config, SYSTEM_PROMPT } from "../config.js";
import { loadOptional } from "../optional.js";
import type { LLMEngine, Msg } from "../types.js";

/**
 * Local Ollama LLM engine (fully offline). Requires the ollama daemon running
 * and the model pulled: `ollama pull llama3.2`.
 */
export class OllamaEngine implements LLMEngine {
  readonly name = "ollama";

  async *respond(history: Msg[]): AsyncIterable<string> {
    // Import lazily so the app still starts without the optional `ollama` dep.
    const { default: ollama } = await loadOptional("ollama");

    const stream = await ollama.chat({
      model: config.ollamaModel,
      stream: true,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...history.map((m) => ({ role: m.role, content: m.content })),
      ],
    });

    for await (const part of stream) {
      if (part.message?.content) yield part.message.content;
    }
  }
}
