const azure = process.env.NITRO_PRESET === 'azure';

export default defineNuxtConfig({
  compatibilityDate: '2026-11-01',
  devtools: { enabled: false },
  runtimeConfig: {
    retrieval: '',
    llmApiKey: '',
    llmBaseUrl: '',
    llmModel: '',
  },
  nitro: {
    // Azure's function bundle has a size limit and cannot load the native embedding runtime, so it is left out and search falls back to lexical.
    externals: { external: ['@huggingface/transformers', 'onnxruntime-node'], ...(azure ? { trace: false } : {}) },
  },
  app: { head: { title: 'Ask the portfolio', htmlAttrs: { lang: 'en' } } },
});
