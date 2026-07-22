import { config } from "../config.js";
import { loadOptional } from "../optional.js";
import type { STTEngine } from "../types.js";

/** Strip whisper.cpp `[00:00:00.000 --> 00:00:02.000]` timestamp prefixes. */
function cleanTranscript(raw: string): string {
  return raw
    .split("\n")
    .map((line) => line.replace(/^\s*\[[^\]]*\]\s*/, "").trim())
    .filter(Boolean)
    .join(" ")
    .trim();
}

/**
 * Local STT via nodejs-whisper (whisper.cpp). The model is auto-downloaded on
 * first run and cached inside the package. Input must be 16kHz mono WAV — which
 * is exactly what the capture stage produces.
 */
export class WhisperEngine implements STTEngine {
  readonly name = "whisper";

  async transcribe(wavPath: string): Promise<string> {
    const { nodewhisper } = await loadOptional("nodejs-whisper");
    const raw: string = await nodewhisper(wavPath, {
      modelName: config.whisperModel,
      autoDownloadModelName: config.whisperModel,
      removeWavFileAfterTranscription: false,
      withCuda: false,
      whisperOptions: {
        outputInText: false,
        outputInVtt: false,
        outputInSrt: false,
        splitOnWord: false,
      },
    });
    return cleanTranscript(raw ?? "");
  }
}
