import { play } from "./audio/play.js";
import { recordUtterance } from "./capture/record.js";
import { config } from "./config.js";
import { makeEngines } from "./engines.js";
import { sentences } from "./text.js";
import type { Msg } from "./types.js";

async function main() {
  const { stt, llm, tts } = makeEngines();

  console.log("🎙️  voice-ai-sandbox");
  console.log(`    STT: ${stt.name}  |  LLM: ${llm.name}  |  TTS: ${tts.name}`);
  console.log(`    LLM model: ${config.anthropicModel}`);
  console.log("    Start talking — pause when done. Ctrl+C to quit.\n");

  const history: Msg[] = [];

  // Loop forever: record -> transcribe -> LLM -> speak, one turn at a time.
  for (;;) {
    console.log("… listening");
    const wav = await recordUtterance();
    if (!wav) continue; // only silence — listen again

    const userText = await stt.transcribe(wav);
    if (!userText) {
      console.log("   (didn't catch that)\n");
      continue;
    }
    console.log(`🧑 ${userText}`);
    history.push({ role: "user", content: userText });

    // Stream the reply, speaking each sentence as it completes.
    process.stdout.write("🤖 ");
    let reply = "";
    for await (const sentence of sentences(llm.respond(history))) {
      process.stdout.write(sentence + " ");
      reply += (reply ? " " : "") + sentence;
      const audio = await tts.synth(sentence);
      await play(audio);
    }
    process.stdout.write("\n\n");

    history.push({ role: "assistant", content: reply });
  }
}

main().catch((err) => {
  console.error("\nFatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
