/** Build a canonical 44-byte PCM WAV header for the given data length. */
export function wavHeader(
  dataLength: number,
  sampleRate: number,
  channels: number,
  bitsPerSample = 16,
): Buffer {
  const blockAlign = (channels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const header = Buffer.alloc(44);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataLength, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // fmt chunk size
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataLength, 40);

  return header;
}

/** Wrap raw 16-bit PCM samples in a WAV container. */
export function pcmToWav(
  pcm: Buffer,
  sampleRate: number,
  channels: number,
): Buffer {
  return Buffer.concat([wavHeader(pcm.length, sampleRate, channels), pcm]);
}
