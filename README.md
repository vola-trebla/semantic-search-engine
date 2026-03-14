# Semantic Search Engine

Vector search engine that converts text into embeddings and finds semantically similar content using pgvector.

You load documents, ask a question in plain text, and get back the most relevant chunks ranked by meaning — not by keyword matching.

### Example

Ingest a document about search, databases and ML. Then query "how does login work":

```
 id |                      preview                       | similarity
----+----------------------------------------------------+-----------
  1 | Authentication in modern web applications relies   |     0.872
  2 | Database indexing improves query performance...    |     0.614
  3 | Machine learning models require large datasets...  |     0.580
```

The engine found the auth chunk even though the query "login" never appears in the text. That's the difference between keyword search and semantic search — it matches by meaning.

### How similarity works

Each text chunk becomes a 768-dimensional vector (a list of 768 numbers). Similar meanings produce vectors that point in similar directions. Cosine similarity measures this: `1.0` = identical, `0.0` = unrelated. In the example above, "how does login work" is closest to the authentication chunk (0.87) because they share the same semantic space, even without common words.

### How it works under the hood

1. **Ingest**: Load `.md`/`.txt` files → split into chunks → send to Gemini `gemini-embedding-001` → store vectors in pgvector
2. **Search**: Query text → Gemini embedding → cosine similarity search in pgvector → ranked results

## Tech Stack

- TypeScript, Node.js
- PostgreSQL + pgvector (via Docker)
- Gemini Embedding API (`gemini-embedding-001`, 768 dimensions)
- Hono (HTTP server)
- Vitest (integration tests)

## Setup

```bash
npm install
cp .env.example .env  # add your GEMINI_API_KEY
docker compose up -d
npm run db:migrate
npm run db:verify
```

## Usage

### Ingest documents

```bash
npm run ingest -- ./docs
```

### Search via CLI

```bash
npm run search -- "how does authentication work"
```

### Start the server

```bash
npm run dev      # watch mode
npm start        # production
```

### Search via API

```bash
curl -X POST http://localhost:3420/search \
  -H "Content-Type: application/json" \
  -d '{"query": "how does authentication work", "topK": 5, "threshold": 0.3}'
```

### API endpoints

- `GET /health` — service status and document count
- `POST /search` — semantic search. Body: `{ query, topK?, threshold?, source? }`

## Project Structure

```
src/
  types.ts               — Chunk and EmbeddedChunk interfaces
  cli.ts                 — CLI for ingest and search commands
  server.ts              — Hono HTTP server
  db/
    pool.ts              — PostgreSQL connection pool
    migrate.ts           — Schema migration (pgvector + documents table)
    verify.ts            — Database health check
    repository.ts        — Insert, delete, count operations
  ingestion/
    loader.ts            — Load files from directory
    chunker.ts           — Split text into chunks
  providers/
    gemini.ts            — Gemini embedding API client
  search/
    search.ts            — Vector similarity search
tests/
  search.test.ts         — Integration tests verifying semantic relevance
scripts/
  cheatsheet.sql         — Useful SQL queries for debugging
```

## Key decisions

- **pgvector over Pinecone/Weaviate** — runs locally, no vendor lock-in, standard SQL for filtering
- **768 dimensions** — Gemini `gemini-embedding-001` supports Matryoshka embeddings, truncated from 3072 to 768 for pgvector ivfflat index compatibility
- **taskType separation** — `RETRIEVAL_DOCUMENT` for ingestion, `RETRIEVAL_QUERY` for search queries, improves relevance
- **ivfflat index** — tradeoff between speed and recall, suitable for <1M vectors

## Part of

[LLM Infrastructure Portfolio](https://github.com/vola-trebla/llm-infrastructure) — Project #6 (Tier 2). Builds on RAG Ingestion (#1), feeds into AI Chat App (#10).
