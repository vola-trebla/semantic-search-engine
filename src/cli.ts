import { requireApiKey } from './config.js';
import { loadFromDirectory } from './ingestion/loader.js';
import { embedChunks } from './providers/gemini.js';
import { insertChunks, getDocumentCount } from './db/repository.js';
import { searchByVector } from './search/search.js';

async function ingest(dirPath: string): Promise<void> {
  const apiKey = requireApiKey();

  console.log(`\nLoading files from ${dirPath}...`);
  const chunks = await loadFromDirectory(dirPath);
  console.log(`Total chunks: ${chunks.length}\n`);

  if (chunks.length === 0) {
    console.log('No chunks to process');
    return;
  }

  console.log('Generating embeddings via Gemini...');
  const embedded = await embedChunks(chunks, apiKey);
  console.log(`\nWriting to pgvector...`);

  const inserted = await insertChunks(embedded);
  const total = await getDocumentCount();

  console.log(`\nDone! Inserted ${inserted} chunks. Total in DB: ${total}`);
}

async function search(query: string): Promise<void> {
  const apiKey = requireApiKey();

  console.log(`\nSearching: "${query}"\n`);

  const [embedded] = await embedChunks(
    [{ content: query, source: 'query', chunkIndex: 0, metadata: {} }],
    apiKey,
    'RETRIEVAL_QUERY',
  );

  if (!embedded) {
    console.error('Embedding failed');
    process.exit(1);
  }

  const results = await searchByVector(embedded.embedding);

  if (results.length === 0) {
    console.log('No results found');
    return;
  }

  for (const r of results) {
    console.log(`[${r.similarity.toFixed(3)}] (${r.source})`);
    console.log(`  ${r.content.slice(0, 120)}...\n`);
  }
}

const command = process.argv[2];
const arg = process.argv[3];

if (command === 'ingest' && arg) {
  ingest(arg).catch((err) => {
    console.error('Ingest failed:', err);
    process.exit(1);
  });
} else if (command === 'search' && arg) {
  search(arg).catch((err) => {
    console.error('Search failed:', err);
    process.exit(1);
  });
} else {
  console.log('Usage:');
  console.log('  npm run ingest -- ./docs         Ingest files from directory');
  console.log('  npm run search -- "your query"    Search documents');
}
