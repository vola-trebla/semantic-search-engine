import pg from 'pg';
import { config } from '../config.js';
import { toVectorString } from '../utils/vector.js';

async function verify(): Promise<void> {
  const client = new pg.Client(config.databaseUrl);
  await client.connect();

  try {
    const extResult = await client.query(
      "SELECT extversion FROM pg_extension WHERE extname = 'vector';",
    );
    console.log(`✓ pgvector version: ${extResult.rows[0].extversion}`);

    const tableResult = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'documents'
      ORDER BY ordinal_position;
    `);
    console.log(`✓ documents table: ${tableResult.rows.length} columns`);
    for (const row of tableResult.rows) {
      console.log(`  - ${row.column_name} (${row.data_type})`);
    }

    const testVector = Array(config.embedding.dimensions)
      .fill(0)
      .map((_, i) => (i % 2 === 0 ? 0.1 : -0.1));
    const vectorStr = toVectorString(testVector);

    await client.query(
      `INSERT INTO documents (content, embedding, source, chunk_index)
       VALUES ($1, $2, $3, $4)`,
      ['test content', vectorStr, 'verify-script', 0],
    );
    console.log('✓ test vector inserted');

    const searchResult = await client.query(
      `SELECT content, 1 - (embedding <=> $1::vector) AS similarity
       FROM documents
       ORDER BY embedding <=> $1::vector
       LIMIT 1`,
      [vectorStr],
    );
    console.log(`✓ cosine search works — similarity: ${searchResult.rows[0].similarity}`);

    await client.query("DELETE FROM documents WHERE source = 'verify-script';");
    console.log('✓ test data cleaned up');

    console.log('\nAll checks passed ✓');
  } finally {
    await client.end();
  }
}

verify().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
