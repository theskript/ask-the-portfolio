import corpus from '~~/data/corpus.json';
import type { Chunk } from '../utils/retrieve';
import { answer, parseQuestion } from '../utils/answer';
import { MIN_SCORE, search } from '../utils/search';

const WINDOW_MS = 60_000;
const LIMIT = 10;
const seen = new Map<string, number[]>();

function allow(ip: string): boolean {
  const now = Date.now();
  const recent = (seen.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  seen.set(ip, recent);
  return recent.length <= LIMIT;
}

export default defineEventHandler(async (event) => {
  if (!allow(getRequestIP(event, { xForwardedFor: true }) ?? 'unknown')) {
    throw createError({ statusCode: 429, statusMessage: 'Too many questions, try again in a minute.' });
  }
  let question: string;
  try {
    question = parseQuestion(await readBody(event));
  } catch (error) {
    throw createError({ statusCode: 400, statusMessage: error instanceof Error ? error.message : 'Bad request' });
  }
  const config = useRuntimeConfig(event);
  const { hits, mode } = await search(question, (corpus as { chunks: Chunk[] }).chunks, config.retrieval === 'lexical' ? 'lexical' : 'auto');
  const result = await answer(question, hits, MIN_SCORE[mode], { apiKey: config.llmApiKey, baseUrl: config.llmBaseUrl || undefined, model: config.llmModel || undefined });
  return { ...result, retrieval: mode };
});
