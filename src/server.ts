import dotenv from 'dotenv';
dotenv.config();
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { searchByVector } from './search/search.js';
import type { SearchOptions } from './search/search.js';
import { embedChunks } from './providers/gemini.js';
import { getDocumentCount } from './db/repository.js';

const app = new Hono();

app.get('/health', async (c) => {
  const count = await getDocumentCount();
  return c.json({ status: 'ok', documents: count });
});

app.post('/search', async (c) => {
  const body = await c.req.json();
  const { query, topK, threshold, source } = body;

  if (!query || typeof query !== 'string') {
    return c.json({ error: 'query is required' }, 400);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return c.json({ error: 'GEMINI_API_KEY not configured' }, 500);

  const [embedded] = await embedChunks(
    [{ content: query, source: 'query', chunkIndex: 0, metadata: {} }],
    apiKey,
    'RETRIEVAL_QUERY',
  );

  if (!embedded) return c.json({ error: 'embedding failed' }, 500);

  const options: SearchOptions = { topK, threshold, source };
  const results = await searchByVector(embedded.embedding, options);

  return c.json({
    query,
    count: results.length,
    results: results.map((r) => ({
      content: r.content,
      source: r.source,
      similarity: Math.round(r.similarity * 1000) / 1000,
      metadata: r.metadata,
    })),
  });
});

const port = parseInt(process.env.PORT || '3420');

serve({ fetch: app.fetch, port }, () => {
  console.log(`Semantic search server running on http://localhost:${port}`);
});
