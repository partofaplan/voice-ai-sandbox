import fs from "node:fs/promises";
import { config } from "../config.js";
import { loadOptional } from "../optional.js";
import type { STTEngine } from "../types.js";

/**
 * Cloud STT via Deepgram (`@deepgram/sdk`, an optional dep). Transcribes the
 * captured WAV via the pre-recorded endpoint. Needs DEEPGRAM_API_KEY in .env.
 */
export class DeepgramEngine implements STTEngine {
  readonly name = "deepgram";
  private clientPromise?: Promise<any>;

  private client(): Promise<any> {
    if (!this.clientPromise) {
      if (!config.deepgramApiKey) {
        throw new Error("Deepgram STT needs DEEPGRAM_API_KEY in .env");
      }
      this.clientPromise = loadOptional("@deepgram/sdk").then(
        ({ createClient }) => createClient(config.deepgramApiKey),
      );
    }
    return this.clientPromise;
  }

  async transcribe(wavPath: string): Promise<string> {
    const dg = await this.client();
    const buffer = await fs.readFile(wavPath);
    const { result, error } = await dg.listen.prerecorded.transcribeFile(
      buffer,
      { model: "nova-3", smart_format: true, mimetype: "audio/wav" },
    );
    if (error) throw error;
    return (
      result?.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() ?? ""
    );
  }
}
