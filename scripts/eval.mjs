import { readFile } from 'node:fs/promises';
import { search, MIN_SCORE } from '../server/utils/search.ts';

const { chunks } = JSON.parse(await readFile(new URL('../data/corpus.json', import.meta.url), 'utf8'));

const positive = [
  ['How does the booking platform avoid double payments?', 'booking-platform'],
  ['Does the booking site take card payments online?', 'booking-platform'],
  ['What Drupal upgrade work was done?', 'site-migrations'],
  ['Tell me about the client portal migration to WordPress', 'site-migrations'],
  ['How does the approval gate for edits work?', 'approved-edits-demo'],
  ['What happens if the file changed after the proposal?', 'approved-edits-demo'],
  ['Which project used Vue?', 'hcp-website'],
  ['How does the release method verify uploaded files?', 'release-method'],
  ['How do you handle Outlook email rendering problems?', 'delivery-automation'],
  ['What does the evidence-gated build refuse to handle?', 'evidence-gated-builds'],
  ['How were the event games packaged?', 'delivery-automation'],
  ['Does the question-answering app work without a language model key?', 'ask-the-portfolio'],
];
const negative = ['What is the capital of France?', 'Give me a lasagna recipe', 'Who won the 2022 world cup?'];

for (const preferred of ['lexical', 'vector']) {
  let top1 = 0;
  let top3 = 0;
  const misses = [];
  for (const [q, slug] of positive) {
    const { hits, mode } = await search(q, chunks, preferred);
    if (mode !== preferred) throw new Error(`${preferred} search was not available`);
    const urls = hits.map((h) => h.chunk.url);
    if (urls[0]?.includes(slug)) top1++;
    if (urls.slice(0, 3).some((u) => u.includes(slug))) top3++;
    else misses.push(q);
  }
  let refused = 0;
  for (const q of negative) {
    const { hits, mode } = await search(q, chunks, preferred);
    if (hits.filter((h) => h.score >= MIN_SCORE[mode]).length === 0) refused++;
  }
  console.log(`${preferred.padEnd(8)} hit@1 ${top1}/${positive.length}  hit@3 ${top3}/${positive.length}  off-topic refused ${refused}/${negative.length}`);
  for (const m of misses) console.log(`  miss: ${m}`);
}
