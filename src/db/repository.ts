import { pool } from './pool.js';
import type { EmbeddedChunk } from '../types.js';
import { toVectorString } from '../utils/vector.js';

export async function insertChunks(chunks: EmbeddedChunk[]): Promise<number> {
  let inserted = 0;

  for (const chunk of chunks) {
    await pool.query(
      `INSERT INTO documents (content, embedding, source, chunk_index, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        chunk.content,
        toVectorString(chunk.embedding),
        chunk.source,
        chunk.chunkIndex,
        JSON.stringify(chunk.metadata),
      ],
    );
    inserted++;
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
