# voice-ai-sandbox

A local/hybrid **voice loop** in TypeScript/Node: talk into your mic → transcribed → an LLM
answers → it speaks back. Each stage is a swappable engine (local or cloud) selected by env var.

```
mic (record) → silence-gated capture → STT → LLM → TTS → afplay
                                         ↑            ↑
                                   swappable (local | cloud)
```

| Stage    | Local (offline)                     | Cloud (hybrid)              |
| -------- | ----------------------------------- | --------------------------- |
| Capture  | `node-record-lpcm16` (needs `sox`)  | —                           |
| STT      | `nodejs-whisper` (whisper.cpp)      | Deepgram                    |
| LLM      | Ollama (`llama3.2`)                 | **Claude Haiku 4.5** (default) |
| TTS      | `kokoro-js` (or macOS `say`)        | ElevenLabs                  |
| Playback | macOS `afplay`                      | —                           |

## Setup (macOS)

```bash
brew install sox              # required for mic capture
npm install
cp .env.example .env          # then set ANTHROPIC_API_KEY

# optional, for fully-offline mode:
brew install ollama && ollama pull llama3.2
```

## Run

Two front-ends share the same engines:

### Web UI (browser mic + voice picker)

```bash
npm run serve        # → http://localhost:5173
```

Open it, pick a voice, click **Talk**, speak, click **Stop**. The browser captures the mic and
plays the reply; Node runs STT → LLM → TTS and streams transcript text + per-sentence audio back
over WebSocket. The voice dropdown lists Kokoro's ~28 English voices (`TTS_ENGINE` is forced to
Kokoro for the web UI so the picker matches). No `sox` needed — the browser does capture.

`smoke:llm`/`smoke:stt` still use the terminal path. First web turn downloads the Kokoro model
(~300 MB) and the whisper model on first transcribe.

### Terminal loop

```bash
npm run smoke:llm    # 1. confirm the configured LLM engine streams (Claude auth / Ollama)
npm run smoke:tts    # 2. hear a spoken line (macOS `say`)
npm run smoke:stt    # 3. record one utterance, print transcript (needs `sox`)
npm run dev          # 4. full conversational loop — press Ctrl+C to stop
```

Default config keeps audio on-device (local whisper + local TTS); only the text turn goes to the
LLM. With `LLM_ENGINE=ollama`, `TTS_ENGINE=kokoro` the whole loop is fully offline.
