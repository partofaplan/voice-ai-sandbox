import { recordUtterance } from "../capture/record.js";
import { config } from "../config.js";
import { DeepgramEngine } from "../stt/deepgram.js";
import { WhisperEngine } from "../stt/whisper.js";
import type { STTEngine } from "../types.js";

/** Records one utterance from the mic and prints the transcript. */
async function main() {
  const stt: STTEngine =
    config.sttEngine === "deepgram" ? new DeepgramEngine() : new WhisperEngine();
  console.log(`Testing STT (${stt.name}). Speak now, then pause…`);
  const wav = await recordUtterance();
  if (!wav) {
    console.log("Heard only silence — try again and speak up.");
    return;
  }
  const text = await stt.transcribe(wav);
  console.log(`\n🧑 Transcript: ${text || "(empty)"}`);
  console.log("✅ Capture + STT OK");
}

main().catch((err) => {
  console.error("❌", err instanceof Error ? err.message : err);
  process.exit(1);
});
