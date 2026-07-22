import fs from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { config, TMP_DIR } from "../config.js";
import { loadOptional } from "../optional.js";
import type { TTSEngine } from "../types.js";

/**
 * Cloud TTS via ElevenLabs (`@elevenlabs/elevenlabs-js`, an optional dep).
 * Writes an MP3 — `afplay` plays it fine. Needs ELEVENLABS_API_KEY and
 * ELEVENLABS_VOICE_ID in .env.
 */
export class ElevenLabsEngine implements TTSEngine {
  readonly name = "elevenlabs";
  private clientPromise?: Promise<any>;
  private counter = 0;

  private client(): Promise<any> {
    if (!this.clientPromise) {
      if (!config.elevenLabsApiKey || !config.elevenLabsVoiceId) {
        throw new Error(
          "ElevenLabs TTS needs ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID in .env",
        );
      }
      this.clientPromise = loadOptional("@elevenlabs/elevenlabs-js").then(
        ({ ElevenLabsClient }) =>
          new ElevenLabsClient({ apiKey: config.elevenLabsApiKey }),
      );
    }
    return this.clientPromise;
  }

  async synth(text: string, voice?: string): Promise<string> {
    const client = await this.client();
    await fs.mkdir(TMP_DIR, { recursive: true });
    const out = path.join(TMP_DIR, `eleven-${Date.now()}-${this.counter++}.mp3`);

    // `eleven_flash_v2_5` is the low-latency model — best fit for a voice loop.
    const audio = await client.textToSpeech.convert(voice ?? config.elevenLabsVoiceId, {
      text,
      modelId: "eleven_flash_v2_5",
      outputFormat: "mp3_44100_128",
    });

    // The SDK returns a web ReadableStream; pipe it to disk.
    await fs.writeFile(out, Readable.fromWeb(audio as any));
    return out;
  }
}
