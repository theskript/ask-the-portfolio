import { describe, expect, it } from 'vitest';
import { bm25Search, cosine, tokenize, vectorSearch, type Chunk } from '../server/utils/retrieve.ts';
import { answer, NOT_FOUND, parseQuestion } from '../server/utils/answer.ts';

const chunk = (id: number, text: string, embedding: number[]): Chunk => ({ id, url: `/work/p${id}/`, page: `Page ${id}`, heading: 'H', text, embedding });
const chunks = [
  chunk(0, 'Stripe payments are confirmed by a webhook and a reconcile job.', [1, 0]),
  chunk(1, 'The Drupal upgrade moved three sites from version 7 to 11.', [0, 1]),
  chunk(2, 'Emails are tested in Outlook with conditional comments.', [0.7, 0.7]),
];

describe('retrieval', () => {
  it('tokenizes without stop words', () => {
    expect(tokenize('How does the Drupal upgrade work?')).toEqual(['drupal', 'upgrade']);
  });
  it('ranks by cosine similarity', () => {
    expect(vectorSearch(chunks, [0, 1], 2)[0].chunk.id).toBe(1);
    expect(cosine([1, 0], [1, 0])).toBe(1);
  });
  it('ranks by BM25 and drops zero-score chunks', () => {
    const hits = bm25Search(chunks, 'drupal upgrade', 3);
    expect(hits.map((h) => h.chunk.id)).toEqual([1]);
  });
});

describe('question validation', () => {
  it('accepts a normal question and trims it', () => {
    expect(parseQuestion({ question: '  How does it work?  ' })).toBe('How does it work?');
  });
  it.each([[{}], [{ question: 5 }], [{ question: 'hi' }], [{ question: 'x'.repeat(301) }], [null]])('rejects %j', (body) => {
    expect(() => parseQuestion(body)).toThrow();
  });
});

describe('answering', () => {
  const hits = bm25Search(chunks, 'drupal upgrade', 3);

  it('refuses when nothing clears the threshold', async () => {
    const result = await answer('anything', hits, 999);
    expect(result.answer).toBe(NOT_FOUND);
    expect(result.sources).toEqual([]);
  });

  it('returns cited passages without an API key', async () => {
    const result = await answer('drupal', hits, 0);
    expect(result.mode).toBe('extractive');
    expect(result.answer).toContain('[1]');
  });

  it('calls the model with numbered passages and returns its answer', async () => {
    let sent: any;
    const fake = (async (_url: string, init: RequestInit) => {
      sent = JSON.parse(init.body as string);
      return new Response(JSON.stringify({ choices: [{ message: { content: 'Three sites [1].' } }] }), { status: 200 });
    }) as unknown as typeof fetch;
    const result = await answer('drupal', hits, 0, { apiKey: 'test' }, fake);
    expect(result.mode).toBe('llm');
    expect(result.answer).toBe('Three sites [1].');
    expect(sent.messages[1].content).toContain('[1] (Page 1: H)');
    expect(sent.temperature).toBe(0);
  });

  it('falls back to passages and reports the error when the model fails', async () => {
    const fake = (async () => new Response('nope', { status: 500 })) as unknown as typeof fetch;
    const result = await answer('drupal', hits, 0, { apiKey: 'test' }, fake);
    expect(result.mode).toBe('extractive');
    expect(result.llmError).toContain('500');
  });

  it('falls back when the model call times out', async () => {
    const fake = ((_url: string, init: RequestInit) => new Promise((_, reject) => {
      init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
    })) as unknown as typeof fetch;
    const result = await answer('drupal', hits, 0, { apiKey: 'test', timeoutMs: 20 }, fake);
    expect(result.mode).toBe('extractive');
    expect(result.llmError).toBe('aborted');
  });
});
