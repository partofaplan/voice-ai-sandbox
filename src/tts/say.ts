import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { TMP_DIR } from "../config.js";
import type { TTSEngine } from "../types.js";

/**
 * Zero-setup TTS using the macOS built-in `say` command. Great for a first
 * light before wiring a neural TTS engine. Writes an AIFF that `afplay` reads.
 */
export class SayEngine implements TTSEngine {
  readonly name = "say";
  private counter = 0;

  async synth(text: string, voice?: string): Promise<string> {
    await fs.mkdir(TMP_DIR, { recursive: true });
    const out = path.join(TMP_DIR, `say-${Date.now()}-${this.counter++}.aiff`);
    // macOS `say` voices (`say -v ?`) differ from Kokoro's; pass through if given.
    const args = voice ? ["-v", voice, "-o", out, text] : ["-o", out, text];

    await new Promise<void>((resolve, reject) => {
      const proc = spawn("say", args, { stdio: "ignore" });
      proc.on("error", reject);
      proc.on("close", (code) =>
        code === 0 ? resolve() : reject(new Error(`say exited ${code}`)),
      );
    });

    return out;
  }
}
