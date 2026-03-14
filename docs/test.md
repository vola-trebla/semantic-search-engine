# Semantic Search Overview

Semantic search goes beyond keyword matching by understanding the meaning behind queries. Instead of looking for exact word matches, it converts text into numerical vectors (embeddings) that capture semantic relationships between concepts.

When a user submits a search query, the system converts it into an embedding using the same model that was used during ingestion. It then compares this query vector against all stored document vectors using cosine similarity, returning the most relevant results regardless of whether they share exact words with the query.

The ingestion pipeline breaks documents into smaller chunks before generating embeddings. This chunking strategy is important because embedding models have token limits and because smaller, focused passages tend to produce more precise search results than entire documents embedded as a single vector.

Vector databases like pgvector extend PostgreSQL with efficient similarity search capabilities. They store embeddings alongside metadata and support indexing strategies such as IVFFlat and HNSW that make nearest-neighbor lookups fast even across millions of vectors.
