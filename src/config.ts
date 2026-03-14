import dotenv from 'dotenv';

dotenv.config();

export const config = {
  databaseUrl: process.env.DATABASE_URL ?? '',
  geminiApiKey: process.env.GEMINI_API_KEY ?? '',
  port: parseInt(process.env.PORT || '3420'),

  embedding: {
    model: 'gemini-embedding-001',
    dimensions: 768,
    batchSize: 5,
    delayMs: 200,
  },

  search: {
    defaultTopK: 5,
    defaultThreshold: 0.3,
  },

  chunking: {
    maxChunkSize: 500,
  },

  db: {
    poolMax: 10,
    ivfflatLists: 100,
  },
};

export function requireApiKey(): string {
  if (!config.geminiApiKey) {
    throw new Error('GEMINI_API_KEY not set in .env');
  }
  return config.geminiApiKey;
}
