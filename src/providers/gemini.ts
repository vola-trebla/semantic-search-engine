import type { Chunk, EmbeddedChunk } from '../types.js';
import { config } from '../config.js';

const GEMINI_EMBED_URL = `https://generativelanguage.googleapis.com/v1beta/models/${config.embedding.model}:embedContent`;

async function embedSingle(text: string, apiKey: string, taskType: string): Promise<number[]> {
  const response = await fetch(`${GEMINI_EMBED_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: { parts: [{ text }] },
      outputDimensionality: config.embedding.dimensions,
      taskType,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${error}`);
  }

  const data = await response.json();
  return data.embedding.values;
}

export async function embedChunks(
  chunks: Chunk[],
  apiKey: string,
  taskType = 'RETRIEVAL_DOCUMENT',
  batchSize = config.embedding.batchSize,
  delayMs = config.embedding.delayMs,
): Promise<EmbeddedChunk[]> {
  const results: EmbeddedChunk[] = [];

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);

    const embeddings = await Promise.all(
      batch.map((chunk) => embedSingle(chunk.content, apiKey, taskType)),
    );

    for (let j = 0; j < batch.length; j++) {
      const chunk = batch[j];
      const embedding = embeddings[j];
      if (!chunk || !embedding) continue;
      results.push({ ...chunk, embedding });
    }

    console.log(`  Embedded ${Math.min(i + batchSize, chunks.length)}/${chunks.length}`);

    if (i + batchSize < chunks.length) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  return results;
}
