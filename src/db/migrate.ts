import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const EMBEDDING_DIMENSIONS = 768; // Gemini text-embedding-004

async function migrate(): Promise<void> {
  const client = new pg.Client(process.env.DATABASE_URL);
  await client.connect();

  try {
    console.log('Running migrations...');

    await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
    console.log('✓ pgvector extension enabled');

    await client.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id            SERIAL PRIMARY KEY,
        content       TEXT NOT NULL,
        embedding     vector(${EMBEDDING_DIMENSIONS}),
        source        TEXT NOT NULL,
        chunk_index   INTEGER NOT NULL,
        metadata      JSONB DEFAULT '{}',
        created_at    TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✓ documents table created');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_embedding
      ON documents
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100);
    `);
    console.log('✓ ivfflat index created');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_source
      ON documents (source);
    `);
    console.log('✓ source index created');

    console.log('\nAll migrations completed ✓');
  } finally {
    await client.end();
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
