export interface Chunk {
  id: number;
  url: string;
  page: string;
  heading: string;
  text: string;
  embedding: number[];
}

export interface Hit {
  chunk: Chunk;
  score: number;
}

const STOP = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'is', 'are', 'was', 'were', 'it', 'its', 'with', 'as', 'by', 'at', 'how', 'what', 'did', 'do', 'does', 'you', 'your', 'i', 'me', 'my', 'that', 'this', 'from', 'be', 'about', 'work', 'done', 'tell', 'which', 'who', 'when', 'give']);

export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9][a-z0-9.+#-]*/g) ?? []).filter((t) => t.length > 1 && !STOP.has(t));
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

export function vectorSearch(chunks: Chunk[], queryEmbedding: number[], k = 4): Hit[] {
  return chunks
    .map((chunk) => ({ chunk, score: cosine(chunk.embedding, queryEmbedding) }))
    .sort((x, y) => y.score - x.score)
    .slice(0, k);
}

export function bm25Search(chunks: Chunk[], query: string, k = 4): Hit[] {
  const k1 = 1.5;
  const b = 0.75;
  const docs = chunks.map((chunk) => tokenize(`${chunk.page} ${chunk.heading} ${chunk.text}`));
  const avg = docs.reduce((sum, d) => sum + d.length, 0) / docs.length;
  const df = new Map<string, number>();
  for (const doc of docs) for (const term of new Set(doc)) df.set(term, (df.get(term) ?? 0) + 1);
  const terms = [...new Set(tokenize(query))];
  const hits = chunks.map((chunk, i) => {
    const tf = new Map<string, number>();
    for (const term of docs[i]) tf.set(term, (tf.get(term) ?? 0) + 1);
    let score = 0;
    for (const term of terms) {
      const f = tf.get(term) ?? 0;
      if (!f) continue;
      const n = df.get(term) ?? 0;
      const idf = Math.log(1 + (docs.length - n + 0.5) / (n + 0.5));
      score += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * docs[i].length) / avg)));
    }
    return { chunk, score };
  });
  return hits.filter((h) => h.score > 0).sort((x, y) => y.score - x.score).slice(0, k);
}
