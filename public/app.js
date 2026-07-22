// Browser side of the voice loop: capture mic -> 16kHz PCM -> WebSocket,
// and play back the per-sentence WAV audio the server streams in reply.

const TARGET_RATE = 16000;

const els = {
  engines: document.getElementById("engines"),
  voice: document.getElementById("voice"),
  transcript: document.getElementById("transcript"),
  status: document.getElementById("status"),
  talk: document.getElementById("talk"),
  reset: document.getElementById("reset"),
};

let ws;
let recording = false;
let audioCtx, sourceNode, processor, micStream;
let captured = []; // Float32Array chunks at the mic's native rate
let assistantBubble = null;

// ---- audio playback queue (keeps sentences in order) ----
const playQueue = [];
let playing = false;

function enqueueAudio(base64, mime) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  playQueue.push(new Blob([bytes], { type: mime }));
  if (!playing) playNext();
}

async function playNext() {
  const blob = playQueue.shift();
  if (!blob) {
    playing = false;
    return;
  }
  playing = true;
  setStatus("speaking", true);
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.onended = audio.onerror = () => {
    URL.revokeObjectURL(url);
    playNext();
  };
  try {
    await audio.play();
  } catch {
    URL.revokeObjectURL(url);
    playNext();
  }
}

// ---- UI helpers ----
function setStatus(text, active = false) {
  els.status.textContent = text;
  els.status.classList.toggle("active", active);
}

function clearTranscript() {
  els.transcript.innerHTML =
    '<div class="empty">Click Talk and say something.</div>';
  assistantBubble = null;
}

function addBubble(role, text) {
  const empty = els.transcript.querySelector(".empty");
  if (empty) empty.remove();
  const div = document.createElement("div");
  div.className = `bubble ${role}`;
  div.innerHTML = `<span class="who">${role}</span>`;
  const body = document.createElement("span");
  body.textContent = text;
  div.appendChild(body);
  els.transcript.appendChild(div);
  els.transcript.scrollTop = els.transcript.scrollHeight;
  return body;
}

// ---- WebSocket ----
function connect() {
  ws = new WebSocket(`ws://${location.host}`);

  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    switch (msg.type) {
      case "ready":
        els.engines.textContent = `stt: ${msg.engines.stt} · llm: ${msg.engines.llm} · tts: ${msg.engines.tts}`;
        populateVoices(msg.voices, msg.voice);
        els.talk.disabled = false;
        els.voice.disabled = false;
        setStatus("idle");
        break;
      case "status":
        setStatus(msg.text, msg.text !== "idle");
        break;
      case "transcript":
        addBubble("user", msg.text);
        assistantBubble = null;
        break;
      case "delta":
        if (!assistantBubble) assistantBubble = addBubble("assistant", "");
        assistantBubble.textContent += msg.text;
        els.transcript.scrollTop = els.transcript.scrollHeight;
        break;
      case "audio":
        enqueueAudio(msg.data, msg.mime);
        break;
      case "done":
        assistantBubble = null;
        break;
      case "error":
        addBubble("assistant", `⚠️ ${msg.message}`);
        setStatus("error");
        break;
    }
  };

  ws.onclose = () => {
    els.engines.textContent = "disconnected — retrying…";
    els.talk.disabled = true;
    setStatus("offline");
    setTimeout(connect, 1500);
  };
}

function populateVoices(voices, current) {
  const saved = localStorage.getItem("voice") || current;
  els.voice.innerHTML = "";
  for (const v of voices) {
    const opt = document.createElement("option");
    opt.value = v.id;
    opt.textContent = v.label;
    if (v.id === saved) opt.selected = true;
    els.voice.appendChild(opt);
  }
  if (saved !== current) sendVoice(saved);
}

function sendVoice(voice) {
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "setVoice", voice }));
}

els.voice.onchange = () => {
  localStorage.setItem("voice", els.voice.value);
  sendVoice(els.voice.value);
};

els.reset.onclick = () => {
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "reset" }));
  clearTranscript();
};

// ---- recording ----
els.talk.onclick = () => (recording ? stopRecording() : startRecording());

async function startRecording() {
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    setStatus("mic permission denied");
    return;
  }
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  sourceNode = audioCtx.createMediaStreamSource(micStream);
  processor = audioCtx.createScriptProcessor(4096, 1, 1);
  captured = [];

  processor.onaudioprocess = (e) => {
    captured.push(new Float32Array(e.inputBuffer.getChannelData(0)));
    // output stays silent (we never write to outputBuffer) — no echo
  };
  sourceNode.connect(processor);
  processor.connect(audioCtx.destination);

  recording = true;
  els.talk.textContent = "Stop";
  els.talk.classList.add("recording");
  setStatus("listening", true);
}

async function stopRecording() {
  recording = false;
  els.talk.textContent = "Talk";
  els.talk.classList.remove("recording");

  const inRate = audioCtx.sampleRate;
  processor.disconnect();
  sourceNode.disconnect();
  micStream.getTracks().forEach((t) => t.stop());
  await audioCtx.close();

  const merged = mergeFloat32(captured);
  const pcm16 = floatToInt16(downsample(merged, inRate, TARGET_RATE));
  if (pcm16.length === 0) {
    setStatus("idle");
    return;
  }
  ws.send(
    JSON.stringify({
      type: "utterance",
      sampleRate: TARGET_RATE,
      pcm: base64FromBytes(new Uint8Array(pcm16.buffer)),
    }),
  );
}

// ---- DSP helpers ----
function mergeFloat32(chunks) {
  const len = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Float32Array(len);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

function downsample(input, inRate, outRate) {
  if (outRate >= inRate) return input;
  const ratio = inRate / outRate;
  const outLen = Math.floor(input.length / ratio);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) out[i] = input[Math.floor(i * ratio)];
  return out;
}

function floatToInt16(f32) {
  const out = new Int16Array(f32.length);
  for (let i = 0; i < f32.length; i++) {
    const s = Math.max(-1, Math.min(1, f32[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

function base64FromBytes(bytes) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

clearTranscript();
connect();
