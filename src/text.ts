/**
 * Re-chunk a stream of arbitrary text deltas into complete sentences, so TTS
 * can start speaking the first sentence while the model is still generating the
 * rest. Flushes on sentence-ending punctuation followed by whitespace/end.
 */
export async function* sentences(
  chunks: AsyncIterable<string>,
): AsyncIterable<string> {
  let buffer = "";
  const boundary = /([.!?]+)(\s+|$)/;

  for await (const chunk of chunks) {
    buffer += chunk;
    let m: RegExpMatchArray | null;
    // Emit every complete sentence currently in the buffer.
    while ((m = buffer.match(boundary)) && m.index !== undefined) {
      const end = m.index + (m[1]?.length ?? 0);
      const sentence = buffer.slice(0, end).trim();
      buffer = buffer.slice(end).trimStart();
      if (sentence) yield sentence;
    }
  }

  const tail = buffer.trim();
  if (tail) yield tail;
}
