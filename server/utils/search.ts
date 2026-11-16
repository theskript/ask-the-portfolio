import { bm25Search, vectorSearch, type Chunk, type Hit } from './retrieve.ts';
import { embedQuery } from './embed.ts';

export type Mode = 'vector' | 'lexical';

export const MIN_SCORE: Record<Mode, number> = { vector: 0.3, lexical: 2.5 };

export async function search(query: string, chunks: Chunk[], preferred: Mode | 'auto' = 'auto', k = 4): Promise<{ hits: Hit[]; mode: Mode }> {
  if (preferred !== 'lexical') {
    const embedding = await embedQuery(query);
    if (embedding) return { hits: vectorSearch(chunks, embedding, k), mode: 'vector' };
  }
  return { hits: bm25Search(chunks, query, k), mode: 'lexical' };
}
