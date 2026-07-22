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

  async synth(text: string): Promise<string> {
    await fs.mkdir(TMP_DIR, { recursive: true });
    const out = path.join(TMP_DIR, `say-${Date.now()}-${this.counter++}.aiff`);

    await new Promise<void>((resolve, reject) => {
      const proc = spawn("say", ["-o", out, text], { stdio: "ignore" });
      proc.on("error", reject);
      proc.on("close", (code) =>
        code === 0 ? resolve() : reject(new Error(`say exited ${code}`)),
      );
    });

    return out;
  }
}
