import { pool } from '../db/pool.js';
import { config } from '../config.js';
import { toVectorString } from '../utils/vector.js';

export interface SearchResult {
  id: number;
  content: string;
  source: string;
  chunkIndex: number;
  metadata: Record<string, unknown>;
  similarity: number;
}

export interface SearchOptions {
  topK?: number;
  threshold?: number;
  source?: string;
}

export async function searchByVector(
  embedding: number[],
  options: SearchOptions = {},
): Promise<SearchResult[]> {
  const {
    topK = config.search.defaultTopK,
    threshold = config.search.defaultThreshold,
    source,
  } = options;
  const vectorStr = toVectorString(embedding);

  let query = `
    WITH ranked AS (
      SELECT
        id, content, source, chunk_index, metadata,
        1 - (embedding <=> $1::vector) AS similarity
      FROM documents
    )
    SELECT * FROM ranked
    WHERE similarity >= $2
  `;
  const params: unknown[] = [vectorStr, threshold];

  if (source) {
    params.push(source);
    query += ` AND source = $${params.length}`;
  }

  query += ` ORDER BY similarity DESC LIMIT $${params.length + 1}`;
  params.push(topK);

  const result = await pool.query(query, params);

  return result.rows.map((row) => ({
    id: row.id,
    content: row.content,
    source: row.source,
    chunkIndex: row.chunk_index,
    metadata: row.metadata,
    similarity: parseFloat(row.similarity),
  }));
}
