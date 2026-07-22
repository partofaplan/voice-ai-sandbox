import { config } from "./config.js";
import { ClaudeEngine } from "./llm/claude.js";
import { OllamaEngine } from "./llm/ollama.js";
import { DeepgramEngine } from "./stt/deepgram.js";
import { WhisperEngine } from "./stt/whisper.js";
import { ElevenLabsEngine } from "./tts/elevenlabs.js";
import { KokoroEngine } from "./tts/kokoro.js";
import { SayEngine } from "./tts/say.js";
import type { LLMEngine, STTEngine, TTSEngine } from "./types.js";

/** Select the STT/LLM/TTS engines from env config (see .env.example). */
export function makeEngines(): {
  stt: STTEngine;
  llm: LLMEngine;
  tts: TTSEngine;
} {
  const stt: STTEngine =
    config.sttEngine === "deepgram" ? new DeepgramEngine() : new WhisperEngine();

  const llm: LLMEngine =
    config.llmEngine === "ollama" ? new OllamaEngine() : new ClaudeEngine();

  let tts: TTSEngine;
  if (config.ttsEngine === "kokoro") tts = new KokoroEngine();
  else if (config.ttsEngine === "elevenlabs") tts = new ElevenLabsEngine();
  else tts = new SayEngine();

  return { stt, llm, tts };
}
