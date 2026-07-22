import "dotenv/config";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

/** Repo root (one level up from src/). Used for the models/ cache dir. */
export const ROOT = path.resolve(here, "..");
export const MODELS_DIR = path.join(ROOT, "models");
/** Temp dir for the throwaway WAV/AIFF files the loop produces each turn. */
export const TMP_DIR = path.join(os.tmpdir(), "voice-ai-sandbox");

function str(name: string, fallback: string): string {
  const v = process.env[name];
  return v && v.trim() !== "" ? v.trim() : fallback;
}

function int(name: string, fallback: number): number {
  const v = process.env[name];
  const n = v ? Number.parseInt(v, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export const config = {
  sttEngine: str("STT_ENGINE", "whisper"),
  llmEngine: str("LLM_ENGINE", "claude"),
  ttsEngine: str("TTS_ENGINE", "say"),

  anthropicModel: str("ANTHROPIC_MODEL", "claude-haiku-4-5"),
  whisperModel: str("WHISPER_MODEL", "base.en"),
  ollamaModel: str("OLLAMA_MODEL", "llama3.2"),
  kokoroVoice: str("KOKORO_VOICE", "af_heart"),

  deepgramApiKey: str("DEEPGRAM_API_KEY", ""),
  elevenLabsApiKey: str("ELEVENLABS_API_KEY", ""),
  elevenLabsVoiceId: str("ELEVENLABS_VOICE_ID", ""),

  // Audio capture at 16kHz mono — the format whisper.cpp expects directly.
  sampleRate: 16_000,
  channels: 1,
  silenceMs: int("SILENCE_MS", 1200),
  silenceThreshold: int("SILENCE_THRESHOLD", 500),
} as const;

/** Spoken-reply system prompt: short, plain, no markdown (it gets read aloud). */
export const SYSTEM_PROMPT =
  "You are a friendly voice assistant. Reply in 1-3 short conversational " +
  "sentences. Never use markdown, bullet points, code blocks, or emoji — your " +
  "response is spoken aloud. If asked for a list, say it as a natural sentence.";
