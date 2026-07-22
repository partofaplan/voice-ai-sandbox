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

```bash
npm run smoke:llm    # 1. confirm Claude API auth works
npm run smoke:tts    # 2. hear a spoken line (macOS `say`)
npm run smoke:stt    # 3. record 4s, print transcript
npm run dev          # 4. full conversational loop — press Ctrl+C to stop
```

Default config keeps audio on-device (local whisper + local TTS); only the text turn goes to
Claude. Flip `LLM_ENGINE=ollama`, `TTS_ENGINE=kokoro` in `.env` for a fully offline loop.
