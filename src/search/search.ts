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
  mode?: 'vector' | 'text' | 'hybrid';
}

export async function searchByVector(
  embedding: number[],
  options: SearchOptions = {},
): Promise<SearchResult[]> {
  const {
    topK = config.search.defaultTopK,
    threshold = config.search.defaultThreshold,
    source,
    mode = 'hybrid',
  } = options;

  if (mode === 'text') {
    return fullTextSearch(options);
  }

  if (mode === 'vector') {
    return vectorSearch(embedding, { topK, threshold, source });
  }

  return hybridSearch(embedding, { topK, threshold, source });
}

async function vectorSearch(
  embedding: number[],
  opts: { topK: number; threshold: number; source?: string | undefined },
): Promise<SearchResult[]> {
  const vectorStr = toVectorString(embedding);

  let query = `
    SELECT id, content, source, chunk_index, metadata,
           1 - (embedding <=> $1::vector) AS similarity
    FROM documents
    WHERE 1 - (embedding <=> $1::vector) >= $2
  `;
  const params: unknown[] = [vectorStr, opts.threshold];

  if (opts.source) {
    params.push(opts.source);
    query += ` AND source = $${params.length}`;
  }

  query += ` ORDER BY embedding <=> $1::vector LIMIT $${params.length + 1}`;
  params.push(opts.topK);

  const result = await pool.query(query, params);
  return mapRows(result.rows);
}

async function fullTextSearch(opts: SearchOptions & { query?: string }): Promise<SearchResult[]> {
  const { topK = config.search.defaultTopK, source, query: textQuery } = opts;

  if (!textQuery) return [];

  let sql = `
    SELECT id, content, source, chunk_index, metadata,
           ts_rank(tsv, plainto_tsquery('english', $1)) AS similarity
    FROM documents
    WHERE tsv @@ plainto_tsquery('english', $1)
  `;
  const params: unknown[] = [textQuery];

  if (source) {
    params.push(source);
    sql += ` AND source = $${params.length}`;
  }

  sql += ` ORDER BY similarity DESC LIMIT $${params.length + 1}`;
  params.push(topK);

  const result = await pool.query(sql, params);
  return mapRows(result.rows);
}

async function hybridSearch(
  embedding: number[],
  opts: { topK: number; threshold: number; source?: string | undefined },
): Promise<SearchResult[]> {
  const vectorStr = toVectorString(embedding);
  const { vectorWeight, textWeight } = config.search;

  let query = `
    WITH vector_results AS (
      SELECT id, content, source, chunk_index, metadata,
             1 - (embedding <=> $1::vector) AS vec_score
      FROM documents
      WHERE 1 - (embedding <=> $1::vector) >= $2
      ${opts.source ? 'AND source = $4' : ''}
      ORDER BY embedding <=> $1::vector
      LIMIT $3
    ),
    text_results AS (
      SELECT id,
             ts_rank(tsv, plainto_tsquery('english', '')) AS text_score
      FROM documents
      WHERE false
    ),
    combined AS (
      SELECT v.id, v.content, v.source, v.chunk_index, v.metadata,
             v.vec_score * ${vectorWeight} +
             COALESCE(t.text_score, 0) * ${textWeight} AS similarity
      FROM vector_results v
      LEFT JOIN text_results t ON v.id = t.id
    )
    SELECT * FROM combined
    ORDER BY similarity DESC
  `;
  const params: unknown[] = [vectorStr, opts.threshold, opts.topK];
  if (opts.source) params.push(opts.source);

  const result = await pool.query(query, params);
  return mapRows(result.rows);
}

export async function hybridSearchWithQuery(
  embedding: number[],
  textQuery: string,
  options: SearchOptions = {},
): Promise<SearchResult[]> {
  const {
    topK = config.search.defaultTopK,
    threshold = config.search.defaultThreshold,
    source,
  } = options;
  const vectorStr = toVectorString(embedding);
  const { vectorWeight, textWeight } = config.search;

  const fetchLimit = topK * 3;

  let query = `
    WITH vector_results AS (
      SELECT id, content, source, chunk_index, metadata,
             1 - (embedding <=> $1::vector) AS vec_score
      FROM documents
      WHERE 1 - (embedding <=> $1::vector) >= $3
      ${source ? 'AND source = $5' : ''}
      ORDER BY embedding <=> $1::vector
      LIMIT $4
    ),
    text_results AS (
      SELECT id,
             ts_rank(tsv, plainto_tsquery('english', $2)) AS text_score
      FROM documents
      WHERE tsv @@ plainto_tsquery('english', $2)
      ${source ? 'AND source = $5' : ''}
    ),
    combined AS (
      SELECT
        COALESCE(v.id, t_doc.id) AS id,
        COALESCE(v.content, t_doc.content) AS content,
        COALESCE(v.source, t_doc.source) AS source,
        COALESCE(v.chunk_index, t_doc.chunk_index) AS chunk_index,
        COALESCE(v.metadata, t_doc.metadata) AS metadata,
        COALESCE(v.vec_score, 0) * ${vectorWeight} +
        COALESCE(t.text_score, 0) * ${textWeight} AS similarity
      FROM vector_results v
      FULL OUTER JOIN text_results t ON v.id = t.id
      LEFT JOIN documents t_doc ON t.id = t_doc.id
    )
    SELECT DISTINCT ON (id) * FROM combined
    WHERE similarity > 0
    ORDER BY id, similarity DESC
  `;

  const params: unknown[] = [vectorStr, textQuery, threshold, fetchLimit];
  if (source) params.push(source);

  const result = await pool.query(query, params);
  const rows = mapRows(result.rows);

  rows.sort((a, b) => b.similarity - a.similarity);
  return rows.slice(0, topK);
}

function mapRows(rows: Record<string, unknown>[]): SearchResult[] {
  return rows.map((row) => ({
    id: row.id as number,
    content: row.content as string,
    source: row.source as string,
    chunkIndex: row.chunk_index as number,
    metadata: row.metadata as Record<string, unknown>,
    similarity: parseFloat(String(row.similarity)),
  }));
}
