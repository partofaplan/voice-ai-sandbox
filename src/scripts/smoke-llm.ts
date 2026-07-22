import { ClaudeEngine } from "../llm/claude.js";
import { config } from "../config.js";

/** Confirms Claude API auth + streaming work before any audio is wired up. */
async function main() {
  console.log(`Testing Claude (${config.anthropicModel})…\n`);
  const llm = new ClaudeEngine();
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
