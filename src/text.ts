const BOUNDARY = /([.!?]+)(\s+|$)/;

/**
 * Incremental sentence splitter. Feed it text deltas; it returns any complete
 * sentences available so far, and `flush()` returns the trailing remainder.
 * Lets a caller both stream raw tokens and chunk sentences from one pass.
 */
export class SentenceSplitter {
  private buffer = "";

  push(chunk: string): string[] {
    this.buffer += chunk;
    const out: string[] = [];
    let m: RegExpMatchArray | null;
    while ((m = this.buffer.match(BOUNDARY)) && m.index !== undefined) {
      const end = m.index + (m[1]?.length ?? 0);
      const sentence = this.buffer.slice(0, end).trim();
      this.buffer = this.buffer.slice(end).trimStart();
      if (sentence) out.push(sentence);
    }
    return out;
  }

  flush(): string | null {
    const tail = this.buffer.trim();
    this.buffer = "";
    return tail || null;
  }
}

/**
 * Re-chunk a stream of text deltas into complete sentences, so TTS can start
 * speaking the first sentence while the model is still generating the rest.
 */
export async function* sentences(
  chunks: AsyncIterable<string>,
): AsyncIterable<string> {
  const splitter = new SentenceSplitter();
  for await (const chunk of chunks) {
    for (const s of splitter.push(chunk)) yield s;
  }
  const tail = splitter.flush();
  if (tail) yield tail;
}
