-- ============================================
-- Semantic Search Engine — SQL Cheatsheet
-- Connect: psql $DATABASE_URL
-- ============================================

-- All documents (without embeddings to keep output clean)
SELECT id, source, chunk_index, LEFT(content, 80) AS preview, created_at
FROM documents
ORDER BY source, chunk_index;

-- Stats by source
SELECT source, COUNT(*) AS chunks, MIN(created_at) AS ingested_at
FROM documents
GROUP BY source
ORDER BY ingested_at DESC;

-- Total count
SELECT COUNT(*) AS total_chunks FROM documents;

-- Semantic search (replace with your vector)
-- Get a vector via: npm run search -- "your query"
-- Or manually via Gemini API
SELECT id, source, chunk_index, LEFT(content, 100) AS preview,
       1 - (embedding <=> '[0.1, 0.2, ...]') AS similarity
FROM documents
ORDER BY embedding <=> '[0.1, 0.2, ...]'
LIMIT 5;

-- Full-text search (no embeddings, plain LIKE)
SELECT id, source, chunk_index, LEFT(content, 100) AS preview
FROM documents
WHERE content ILIKE '%search term%'
ORDER BY source, chunk_index;

-- Delete all chunks for a specific file
DELETE FROM documents WHERE source = 'test.md';

-- Clear everything
TRUNCATE documents RESTART IDENTITY;

-- Show table structure
\d documents

-- Check embedding dimensions
SELECT vector_dims(embedding) AS dims FROM documents LIMIT 1;

-- Table and index size
SELECT pg_size_pretty(pg_total_relation_size('documents')) AS total_size;
