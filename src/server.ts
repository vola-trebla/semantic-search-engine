import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config, requireApiKey } from './config.js';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { searchByVector, hybridSearchWithQuery } from './search/search.js';
import type { SearchOptions } from './search/search.js';
import { embedChunks } from './providers/gemini.js';
import { getDocumentCount } from './db/repository.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dashboardHtml = fs.readFileSync(path.join(__dirname, 'dashboard/index.html'), 'utf-8');

const app = new Hono();

app.get('/', (c) => {
  return c.html(dashboardHtml);
});

app.get('/health', async (c) => {
  const count = await getDocumentCount();
  return c.json({ status: 'ok', documents: count });
});

app.post('/search', async (c) => {
  const body = await c.req.json();
  const { query, topK, threshold, source, mode } = body;

  if (!query || typeof query !== 'string') {
    return c.json({ error: 'query is required' }, 400);
  }

  const apiKey = requireApiKey();

  const [embedded] = await embedChunks(
    [{ content: query, source: 'query', chunkIndex: 0, metadata: {} }],
    apiKey,
    'RETRIEVAL_QUERY',
  );

  if (!embedded) return c.json({ error: 'embedding failed' }, 500);

  const options: SearchOptions = { topK, threshold, source, mode };
  const results =
    mode === 'hybrid'
      ? await hybridSearchWithQuery(embedded.embedding, query, options)
      : await searchByVector(embedded.embedding, options);

  return c.json({
    query,
    mode: mode ?? 'hybrid',
    count: results.length,
    results: results.map((r) => ({
      content: r.content,
      source: r.source,
      similarity: Math.round(r.similarity * 1000) / 1000,
      metadata: r.metadata,
    })),
  });
});

app.post('/v1/context', async (c) => {
  const body = await c.req.json();
  const { query, topK = 3, threshold, source } = body;

  if (!query || typeof query !== 'string') {
    return c.json({ error: 'query is required' }, 400);
  }

  const apiKey = requireApiKey();

  const [embedded] = await embedChunks(
    [{ content: query, source: 'query', chunkIndex: 0, metadata: {} }],
    apiKey,
    'RETRIEVAL_QUERY',
  );

  if (!embedded) return c.json({ error: 'embedding failed' }, 500);

  const results = await hybridSearchWithQuery(embedded.embedding, query, {
    topK,
    threshold,
    source,
  });

  const context = results.map((r) => r.content).join('\n\n---\n\n');
  const sources = [...new Set(results.map((r) => r.source))];

  return c.json({ query, context, sources, chunks: results.length });
});

serve({ fetch: app.fetch, port: config.port }, () => {
  console.log(`Semantic search server running on http://localhost:${config.port}`);
});
