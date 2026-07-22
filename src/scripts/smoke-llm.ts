import { config } from "../config.js";
import { makeEngines } from "../engines.js";

/**
 * Confirms the configured LLM engine (LLM_ENGINE in .env) can stream a reply.
 * Claude → verifies API auth; Ollama → verifies the local server + model.
 */
async function main() {
  const { llm } = makeEngines();
  const model = llm.name === "ollama" ? config.ollamaModel : config.anthropicModel;
  console.log(`Testing LLM engine "${llm.name}" (${model})…\n`);

  process.stdout.write("🤖 ");
  for await (const chunk of llm.respond([
    { role: "user", content: "Say hello and tell me one fun fact in one sentence." },
  ])) {
    process.stdout.write(chunk);
  }
  console.log("\n\n✅ LLM stream OK");
}

main().catch((err) => {
  console.error("❌", err instanceof Error ? err.message : err);
  process.exit(1);
});
