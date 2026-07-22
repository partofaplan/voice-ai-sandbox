import { play } from "../audio/play.js";
import { config } from "../config.js";
import { KokoroEngine } from "../tts/kokoro.js";
import { SayEngine } from "../tts/say.js";
import type { TTSEngine } from "../types.js";

/** Synthesizes a line and plays it, using whichever TTS engine is configured. */
async function main() {
  const tts: TTSEngine =
    config.ttsEngine === "kokoro" ? new KokoroEngine() : new SayEngine();
  console.log(`Testing TTS (${tts.name})…`);
  const wav = await tts.synth(
    "Hello! This is the voice AI sandbox speaking. Setup looks good.",
  );
  await play(wav);
  console.log("✅ TTS + playback OK");
}

main().catch((err) => {
  console.error("❌", err instanceof Error ? err.message : err);
  process.exit(1);
});
