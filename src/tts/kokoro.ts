import fs from "node:fs/promises";
import path from "node:path";
import { config, TMP_DIR } from "../config.js";
import { loadOptional } from "../optional.js";
import type { TTSEngine } from "../types.js";

const MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";

/**
 * Local neural TTS via kokoro-js (82M ONNX model, CPU-friendly, no API keys).
 * The model (~300MB) downloads once on first use and is cached by transformers.js.
 */
export class KokoroEngine implements TTSEngine {
  readonly name = "kokoro";
  private ttsPromise?: Promise<any>;
  private counter = 0;

  private load(): Promise<any> {
    if (!this.ttsPromise) {
      this.ttsPromise = loadOptional("kokoro-js").then(({ KokoroTTS }) =>
        KokoroTTS.from_pretrained(MODEL_ID, { dtype: "q8" }),
      );
    }
    return this.ttsPromise;
  }

  async synth(text: string, voice?: string): Promise<string> {
    const tts = await this.load();
    await fs.mkdir(TMP_DIR, { recursive: true });
    const out = path.join(TMP_DIR, `kokoro-${Date.now()}-${this.counter++}.wav`);

    const audio = await tts.generate(text, { voice: voice ?? config.kokoroVoice });
    await audio.save(out);
    return out;
  }
}
