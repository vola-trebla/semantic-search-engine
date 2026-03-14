import { pool } from './pool.js';
import type { EmbeddedChunk } from '../types.js';
import { toVectorString } from '../utils/vector.js';

const BATCH_SIZE = 50;

export async function insertChunks(chunks: EmbeddedChunk[]): Promise<number> {
  let inserted = 0;

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const values: unknown[] = [];
    const placeholders: string[] = [];

    for (let j = 0; j < batch.length; j++) {
      const chunk = batch[j];
      if (!chunk) continue;
      const offset = j * 5;
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`,
      );
      values.push(
        chunk.content,
        toVectorString(chunk.embedding),
        chunk.source,
        chunk.chunkIndex,
        JSON.stringify(chunk.metadata),
      );
    }

    if (placeholders.length === 0) continue;

    await pool.query(
      `INSERT INTO documents (content, embedding, source, chunk_index, metadata)
       VALUES ${placeholders.join(', ')}`,
      values,
    );
    inserted += batch.length;
  }

  return inserted;
}

export async function clearBySource(source: string): Promise<number> {
  const result = await pool.query('DELETE FROM documents WHERE source = $1', [source]);
  return result.rowCount ?? 0;
}

export async function getDocumentCount(): Promise<number> {
  const result = await pool.query('SELECT COUNT(*) FROM documents');
  return parseInt(result.rows[0].count, 10);
}
