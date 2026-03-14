import pg from 'pg';
import { config } from '../config.js';

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  max: config.db.poolMax,
});

pool.on('error', (err) => {
  console.error('Unexpected pool error:', err);
  process.exit(1);
});
