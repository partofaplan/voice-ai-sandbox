import fs from "node:fs/promises";
import type { WebSocket } from "ws";
import { pcmToWav } from "../capture/wav.js";
import { config, TMP_DIR } from "../config.js";
import { makeEngines } from "../engines.js";
import { SentenceSplitter } from "../text.js";
import { KOKORO_VOICES } from "../tts/kokoroVoices.js";
import { KokoroEngine } from "../tts/kokoro.js";
import type { LLMEngine, Msg, STTEngine, TTSEngine } from "../types.js";

/** Messages the client sends us. */
type ClientMsg =
  | { type: "setVoice"; voice: string }
  | { type: "reset" }
  | { type: "utterance"; pcm: string; sampleRate: number };

/**
 * Drives one browser connection: receives recorded PCM, runs STT → LLM → TTS,
 * and streams transcript text + per-sentence WAV audio back over the socket.
 * STT and LLM come from env config; TTS is Kokoro so the voice picker matches.
 */
export class Session {
  private stt: STTEngine;
  private llm: LLMEngine;
  private tts: TTSEngine = new KokoroEngine();
  private history: Msg[] = [];
  private voice = config.kokoroVoice;
  private audioSeq = 0;
  private busy = false;

  constructor(private ws: WebSocket) {
    const engines = makeEngines();
    this.stt = engines.stt;
    this.llm = engines.llm;

    this.send({
      type: "ready",
      voices: KOKORO_VOICES,
      voice: this.voice,
      engines: { stt: this.stt.name, llm: this.llm.name, tts: this.tts.name },
    });

    ws.on("message", (raw) => this.onMessage(raw.toString()));
  }

  private send(msg: unknown) {
    if (this.ws.readyState === this.ws.OPEN) this.ws.send(JSON.stringify(msg));
  }

  private async onMessage(raw: string) {
    let msg: ClientMsg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    if (msg.type === "setVoice") {
      if (KOKORO_VOICES.some((v) => v.id === msg.voice)) this.voice = msg.voice;
      return;
    }
    if (msg.type === "reset") {
      this.history = [];
      return;
    }
    if (msg.type === "utterance") {
      if (this.busy) return; // ignore overlapping turns
      this.busy = true;
      try {
        await this.handleUtterance(msg.pcm, msg.sampleRate);
      } catch (err) {
        this.send({
          type: "error",
          message: err instanceof Error ? err.message : String(err),
        });
      } finally {
        this.busy = false;
      }
    }
  }

  private async handleUtterance(pcmBase64: string, sampleRate: number) {
    // 1. PCM (Int16LE mono) -> WAV -> STT
    this.send({ type: "status", text: "transcribing" });
    const pcm = Buffer.from(pcmBase64, "base64");
    const wav = pcmToWav(pcm, sampleRate, 1);
    await fs.mkdir(TMP_DIR, { recursive: true });
    const wavPath = `${TMP_DIR}/in-${Date.now()}.wav`;
    await fs.writeFile(wavPath, wav);

    const userText = (await this.stt.transcribe(wavPath)).trim();
    await fs.unlink(wavPath).catch(() => {});
    if (!userText) {
      this.send({ type: "status", text: "idle" });
      this.send({ type: "done" });
      return;
    }
    this.send({ type: "transcript", role: "user", text: userText });
    this.history.push({ role: "user", content: userText });

    // 2. Stream the LLM reply: forward tokens for live text, and synth each
    //    completed sentence to audio as it lands.
    this.send({ type: "status", text: "thinking" });
    const splitter = new SentenceSplitter();
    let reply = "";

    for await (const chunk of this.llm.respond(this.history)) {
      reply += chunk;
      this.send({ type: "delta", text: chunk });
      for (const sentence of splitter.push(chunk)) await this.speak(sentence);
    }
    const tail = splitter.flush();
    if (tail) await this.speak(tail);

    this.history.push({ role: "assistant", content: reply });
    this.send({ type: "status", text: "idle" });
    this.send({ type: "done" });
  }

  /** Synthesize one sentence with the current voice and send the WAV bytes. */
  private async speak(sentence: string) {
    const filePath = await this.tts.synth(sentence, this.voice);
    const bytes = await fs.readFile(filePath);
    await fs.unlink(filePath).catch(() => {});
    this.send({
      type: "audio",
      seq: this.audioSeq++,
      mime: "audio/wav",
      data: bytes.toString("base64"),
    });
  }
}
