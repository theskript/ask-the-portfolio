# Ask the portfolio

A small Nuxt 4 app that answers questions about the case studies on theskript.com using retrieval-augmented generation (RAG). Built in 2026 as a demonstration; it is not client work and has no users.

## What it does

1. `npm run corpus -- <path to the built portfolio dist>` reads the case-study pages, splits them by heading into passages of at most 700 characters and embeds each passage with a local model (`Xenova/all-MiniLM-L6-v2`, 384 dimensions, no API key). The result is `data/corpus.json` (90 passages from 8 pages).
2. `POST /api/ask` embeds the question with the same model and returns the closest passages by cosine similarity. If the model cannot load (for example in the Azure function bundle) it falls back to BM25 lexical search.
3. With no language-model key, the answer is the top two passages with citations. With `NUXT_LLM_API_KEY` set, the passages go to any OpenAI-compatible chat endpoint (`NUXT_LLM_BASE_URL`, `NUXT_LLM_MODEL`), at temperature 0, with a system prompt that allows only the numbered passages and tells the model to treat the question as untrusted. A failure or a 20-second timeout falls back to the passages and reports the error.
4. If no passage clears a similarity threshold (0.3 for vector search, 2.5 for BM25) the app says it could not find the answer instead of guessing.

The route validates the question (3 to 300 characters) and allows 10 questions a minute per client address (in memory, so per server instance).

## Measured

`npm run eval` runs 12 on-topic and 3 off-topic questions against the corpus:

| Search | hit@1 | hit@3 | off-topic refused |
|---|---|---|---|
| lexical (BM25) | 10/12 | 12/12 | 3/3 |
| vector | 11/12 | 12/12 | 3/3 |

The question set is small. The BM25 stop words and thresholds were tuned against an earlier version of it. The corpus was rebuilt from the current site and the questions about pages that no longer exist were replaced with questions about the pages now in the corpus, without further tuning, so treat these figures as a smoke test, not a benchmark. The two keyword misses and the one vector miss at rank 1 still have the right page in the top three. `npm test` runs 14 unit tests (ranking, validation, refusal, a mocked model call, an HTTP error and a timeout).

Not measured: answer quality from a real language model (no key was used) and latency under load.

## Azure

`infra/main.bicep` defines a free-tier Azure Static Web App and sets `NUXT_RETRIEVAL=lexical`, because the serverless bundle leaves out the native embedding runtime. `.github/workflows/azure-static-web-apps.yml` runs the tests on every push, and deploys with the Azure preset only when started by hand. `npm run build:azure` produces the static site (180 KB) and the function bundle (824 KB). The template and workflow have been written and the build checked, but not deployed or validated against Azure.

To deploy: create the resource group and app from the Bicep file, add the deployment token to the repository as `AZURE_STATIC_WEB_APPS_API_TOKEN`, push to `main`, and add the model key as an application setting if you want generated answers.

## Run locally

```
npm install
npm run corpus -- <path to the built portfolio dist folder>
npm run dev
```

The corpus is committed in `data/corpus.json`, so `npm run dev` works without rebuilding it. `npm run corpus` needs a built copy of the site, which is not included; the committed `data/corpus.json` is enough to run the app.

## Licence

MIT, see `LICENSE`.
