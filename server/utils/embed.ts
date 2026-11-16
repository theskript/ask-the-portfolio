type Extractor = (text: string, options: { pooling: 'mean'; normalize: boolean }) => Promise<{ data: Float32Array }>;

let extractor: Promise<Extractor> | undefined;

/** Returns null when the local model cannot be loaded, so callers can fall back to lexical search. */
export async function embedQuery(text: string): Promise<number[] | null> {
  try {
    extractor ??= import('@huggingface/transformers').then((m) => m.pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2') as unknown as Promise<Extractor>);
    const result = await (await extractor)(text, { pooling: 'mean', normalize: true });
    return Array.from(result.data);
  } catch {
    extractor = undefined;
    return null;
  }
}
