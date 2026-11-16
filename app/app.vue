<script setup lang="ts">
interface Source { n: number; page: string; heading: string; url: string; score: number }
interface Reply { answer: string; mode: 'llm' | 'extractive'; retrieval: 'vector' | 'lexical'; sources: Source[]; llmError?: string }

const examples = [
  'How does the booking platform avoid double payments?',
  'What did you build for Drupal?',
  'How does the approval gate for edits work?',
  'Which work uses Vue?',
];

const question = ref('');
const reply = ref<Reply | null>(null);
const error = ref('');
const loading = ref(false);

async function ask(q = question.value) {
  question.value = q;
  loading.value = true;
  error.value = '';
  reply.value = null;
  try {
    reply.value = await $fetch<Reply>('/api/ask', { method: 'POST', body: { question: q } });
  } catch (e: any) {
    error.value = e?.statusMessage ?? e?.data?.statusMessage ?? 'Something went wrong.';
  } finally {
    loading.value = false;
  }
}

const route = useRoute();
onMounted(() => {
  if (typeof route.query.q === 'string') ask(route.query.q);
});
</script>

<template>
  <main class="wrap">
    <h1>Ask the portfolio</h1>
    <p class="lede">Answers come only from the case studies on theskript.com, with the passages cited.</p>
    <form @submit.prevent="ask()">
      <label for="q">Your question</label>
      <div class="row">
        <input id="q" v-model="question" maxlength="300" placeholder="e.g. How does the booking platform avoid double payments?" required>
        <button :disabled="loading">{{ loading ? 'Searching' : 'Ask' }}</button>
      </div>
    </form>
    <ul class="examples">
      <li v-for="e in examples" :key="e"><button type="button" @click="ask(e)">{{ e }}</button></li>
    </ul>
    <p v-if="error" role="alert" class="error">{{ error }}</p>
    <section v-if="reply" aria-live="polite">
      <p class="badge">{{ reply.mode === 'llm' ? 'Written by a language model from the passages' : 'Matching passages, no language model' }} · {{ reply.retrieval }} search</p>
      <p v-if="reply.llmError" class="note">The language model was unavailable ({{ reply.llmError }}); showing the passages instead.</p>
      <p class="answer">{{ reply.answer }}</p>
      <ol v-if="reply.sources.length" class="sources">
        <li v-for="s in reply.sources" :key="s.n">
          <a :href="`https://www.theskript.com${s.url}`">{{ s.page }}</a>: {{ s.heading }} <span class="score">{{ s.score }}</span>
        </li>
      </ol>
    </section>
  </main>
</template>

<style>
body { margin: 0; font: 16px/1.6 system-ui, sans-serif; color: #0f172a; background: #f8f7f4; }
.wrap { max-width: 44rem; margin: 0 auto; padding: 2.5rem 1.25rem; }
h1 { font-size: 2rem; margin: 0 0 .25rem; }
.lede { color: #475569; margin-top: 0; }
label { display: block; font-weight: 600; margin-bottom: .25rem; }
.row { display: flex; gap: .5rem; }
input { flex: 1; padding: .65rem .8rem; border: 1px solid #cbd5e1; border-radius: .6rem; font: inherit; }
button { padding: .65rem 1rem; border: 0; border-radius: .6rem; background: #0f172a; color: #fff; font: inherit; cursor: pointer; }
button:disabled { opacity: .6; }
.examples { list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: .5rem; margin: 1rem 0; }
.examples button { background: #fff; color: #0f172a; border: 1px solid #cbd5e1; font-size: .875rem; }
.badge { font: 600 .8rem ui-monospace, monospace; color: #0e7490; }
.answer { white-space: pre-line; background: #fff; border: 1px solid #e2e8f0; border-radius: .8rem; padding: 1rem; }
.sources { color: #475569; font-size: .9rem; }
.score { font-family: ui-monospace, monospace; color: #94a3b8; }
.error { color: #b91c1c; }
.note { color: #92400e; font-size: .9rem; }
</style>
