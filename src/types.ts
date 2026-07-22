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

/** Text-to-speech: text in, a playable WAV/AIFF file path out. */
export interface TTSEngine {
  readonly name: string;
  synth(text: string): Promise<string>;
}
