import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import dotenv from 'dotenv';
import pg from 'pg';
import { chunkText } from '../src/ingestion/chunker.js';
import { embedChunks } from '../src/providers/gemini.js';
import { insertChunks, clearBySource, getDocumentCount } from '../src/db/repository.js';
import { searchByVector } from '../src/search/search.js';

dotenv.config();

const TEST_SOURCE = 'integration-test';

const TEST_TEXT = `
Authentication in modern web applications relies on JWT tokens.
The server generates a signed token containing user claims and sends it to the client.

Database indexing improves query performance significantly.
PostgreSQL supports B-tree, GIN, and GiST index types for different use cases.

Machine learning models require large datasets for training.
The quality of training data directly impacts model accuracy and generalization.
`;

describe('search integration', () => {
  let apiKey: string;

  beforeAll(async () => {
    apiKey = process.env.GEMINI_API_KEY!;
    if (!apiKey) throw new Error('GEMINI_API_KEY required for tests');

    await clearBySource(TEST_SOURCE);

    const chunks = chunkText(TEST_TEXT, TEST_SOURCE);
    const embedded = await embedChunks(chunks, apiKey, 'RETRIEVAL_DOCUMENT');
    await insertChunks(embedded);
  });

  afterAll(async () => {
    await clearBySource(TEST_SOURCE);
  });

  it('finds auth-related chunk for auth query', async () => {
    const [q] = await embedChunks(
      [{ content: 'how does login work', source: 'q', chunkIndex: 0, metadata: {} }],
      apiKey,
      'RETRIEVAL_QUERY',
    );
    const results = await searchByVector(q.embedding, { source: TEST_SOURCE });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].content).toContain('JWT');
  });

  it('finds database chunk for index query', async () => {
    const [q] = await embedChunks(
      [{ content: 'how to speed up SQL queries', source: 'q', chunkIndex: 0, metadata: {} }],
      apiKey,
      'RETRIEVAL_QUERY',
    );
    const results = await searchByVector(q.embedding, { source: TEST_SOURCE });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].content).toContain('indexing');
  });

  it('respects topK limit', async () => {
    const [q] = await embedChunks(
      [{ content: 'data', source: 'q', chunkIndex: 0, metadata: {} }],
      apiKey,
      'RETRIEVAL_QUERY',
    );
    const results = await searchByVector(q.embedding, { topK: 1, source: TEST_SOURCE });

    expect(results.length).toBe(1);
  });
});
