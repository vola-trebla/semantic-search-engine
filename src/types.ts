export interface Chunk {
  content: string;
  source: string;
  chunkIndex: number;
  metadata: Record<string, unknown>;
}

export interface EmbeddedChunk extends Chunk {
  embedding: number[];
}
