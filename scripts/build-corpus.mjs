import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pipeline } from '@huggingface/transformers';

const dist = resolve(process.argv[2] ?? '../../portfolio/dist');
const out = resolve('data/corpus.json');
const MAX_CHARS = 700;

const entities = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ', '&rarr;': '→' };
const decode = (s) => s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d))).replace(/&[a-z]+;|&#39;/g, (e) => entities[e] ?? e);
const text = (html) => decode(html.replace(/<(script|style|svg)[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

function splitLong(body) {
  const parts = [];
  let current = '';
  for (const sentence of body.split(/(?<=[.!?])\s+/)) {
    if (current && (current + ' ' + sentence).length > MAX_CHARS) {
      parts.push(current);
      current = sentence;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  }
  if (current) parts.push(current);
  return parts;
}

async function pageChunks(slug) {
  const html = await readFile(join(dist, 'work', slug, 'index.html'), 'utf8');
  const main = html.match(/<main[\s\S]*?<\/main>/)?.[0] ?? html;
  const title = text(main.match(/<h1[\s\S]*?<\/h1>/)?.[0] ?? slug);
  const sections = main.split(/<h2/).slice(1);
  const chunks = [];
  for (const section of sections) {
    const heading = text(section.match(/^[^>]*>([\s\S]*?)<\/h2>/)?.[1] ?? '');
    const body = text(section.replace(/^[\s\S]*?<\/h2>/, ''));
    if (body.length < 40) continue;
    for (const piece of splitLong(body)) {
      chunks.push({ url: `/work/${slug}/`, page: title, heading, text: piece });
    }
  }
  return chunks;
}

const slugs = (await readdir(join(dist, 'work'), { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name).sort();
const chunks = [];
for (const slug of slugs) chunks.push(...(await pageChunks(slug)));
chunks.forEach((chunk, i) => { chunk.id = i; });

const embed = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
for (const chunk of chunks) {
  const result = await embed(`${chunk.page}. ${chunk.heading}. ${chunk.text}`, { pooling: 'mean', normalize: true });
  chunk.embedding = Array.from(result.data, (v) => Math.round(v * 1e4) / 1e4);
}

await mkdir('data', { recursive: true });
await writeFile(out, JSON.stringify({ model: 'Xenova/all-MiniLM-L6-v2', chunks }));
console.log(`${chunks.length} chunks from ${slugs.length} pages -> ${out}`);
