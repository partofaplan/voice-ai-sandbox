import fs from "node:fs/promises";
import path from "node:path";
import { config, TMP_DIR } from "../config.js";
import { loadOptional } from "../optional.js";
import { pcmToWav } from "./wav.js";

/** Root-mean-square amplitude of a buffer of 16-bit signed LE samples. */
function rms(chunk: Buffer): number {
  const samples = chunk.length >> 1; // 2 bytes per sample
  if (samples === 0) return 0;
  let sumSquares = 0;
  for (let i = 0; i + 1 < chunk.length; i += 2) {
    const s = chunk.readInt16LE(i);
    sumSquares += s * s;
  }
  return Math.sqrt(sumSquares / samples);
}

export interface RecordOptions {
  /** Hard cap so a stuck mic can't record forever. */
  maxMs?: number;
}

/**
 * Record one utterance from the default mic. Waits for speech to start (a frame
 * above the RMS threshold), then stops after `silenceMs` of continuous silence.
 * Writes a 16kHz mono WAV and returns its path. Returns null if only silence
 * was captured (nothing to transcribe).
 *
 * Requires `sox` on PATH (`brew install sox`) — node-record-lpcm16 shells out to it.
 */
export async function recordUtterance(
  opts: RecordOptions = {},
): Promise<string | null> {
  const { maxMs = 30_000 } = opts;
  // node-record-lpcm16 ships no types; load as any.
  const recorder = (await loadOptional("node-record-lpcm16")).default;

  const chunks: Buffer[] = [];
  let speechStarted = false;
  let lastVoiceAt = Date.now();
  const startedAt = Date.now();

  const recording = recorder.record({
    sampleRate: config.sampleRate,
    channels: config.channels,
    audioType: "raw",
    recorder: "sox",
  });

  const stream = recording.stream();

  await new Promise<void>((resolve, reject) => {
    const stop = () => {
      recording.stop();
      resolve();
    };

    stream.on("error", reject);
    stream.on("data", (chunk: Buffer) => {
      const level = rms(chunk);
      const now = Date.now();

      if (level >= config.silenceThreshold) {
        speechStarted = true;
        lastVoiceAt = now;
      }

      // Only buffer once the user has actually started talking.
      if (speechStarted) chunks.push(chunk);

      if (speechStarted && now - lastVoiceAt >= config.silenceMs) stop();
      else if (now - startedAt >= maxMs) stop();
    });
  });

  if (!speechStarted || chunks.length === 0) return null;

  const pcm = Buffer.concat(chunks);
  const wav = pcmToWav(pcm, config.sampleRate, config.channels);
  await fs.mkdir(TMP_DIR, { recursive: true });
  const out = path.join(TMP_DIR, `utterance-${Date.now()}.wav`);
  await fs.writeFile(out, wav);
  return out;
}
