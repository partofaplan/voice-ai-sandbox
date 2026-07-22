/** A single conversational turn. Roles map directly to LLM chat roles. */
export interface Msg {
  role: "user" | "assistant";
  content: string;
}

/** Speech-to-text: a 16kHz mono WAV file path in, transcript text out. */
export interface STTEngine {
  readonly name: string;
  transcribe(wavPath: string): Promise<string>;
}

/**
 * Language model: full conversation history in, a stream of text chunks out.
 * Chunks are arbitrary token spans; the orchestrator reassembles sentences.
 */
export interface LLMEngine {
  readonly name: string;
  respond(history: Msg[]): AsyncIterable<string>;
}

/**
 * Text-to-speech: text in, a playable WAV/AIFF file path out. `voice` optionally
 * overrides the engine's default voice (used by the web UI's voice picker;
 * engines that don't support named voices ignore it).
 */
export interface TTSEngine {
  readonly name: string;
  synth(text: string, voice?: string): Promise<string>;
}
