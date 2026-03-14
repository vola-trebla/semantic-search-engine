import type { Chunk } from '../types.js';
import { config } from '../config.js';

export function chunkText(
  text: string,
  source: string,
  maxChunkSize = config.chunking.maxChunkSize,
): Chunk[] {
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0);
  const chunks: Chunk[] = [];
  let current = '';
  let index = 0;

  for (const paragraph of paragraphs) {
    if (current.length + paragraph.length > maxChunkSize && current.length > 0) {
      chunks.push({
        content: current.trim(),
        source,
        chunkIndex: index++,
        metadata: {},
      });
      current = '';
    }
    current += paragraph + '\n\n';
  }

  if (current.trim().length > 0) {
    chunks.push({
      content: current.trim(),
      source,
      chunkIndex: index,
      metadata: {},
    });
  }

  return chunks;
}
