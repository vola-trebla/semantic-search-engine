import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function verify(): Promise<void> {
  const client = new pg.Client(process.env.DATABASE_URL);
  await client.connect();

  try {
    // Check pgvector extension
    const extResult = await client.query(
      "SELECT extversion FROM pg_extension WHERE extname = 'vector';",
    );
    console.log(`✓ pgvector version: ${extResult.rows[0].extversion}`);

    // Check documents table exists
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

    // Insert and search a test vector
    const testVector = Array(768)
      .fill(0)
      .map((_, i) => (i % 2 === 0 ? 0.1 : -0.1));
    const vectorStr = `[${testVector.join(',')}]`;

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

    // Cleanup
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
