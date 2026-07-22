import { spawn } from "node:child_process";

/**
 * Play an audio file through the default output device using macOS `afplay`
 * (built in — no npm audio dependency). Resolves when playback finishes.
 */
export function play(filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("afplay", [filePath], { stdio: "ignore" });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`afplay exited with code ${code}`));
    });
  });
}
