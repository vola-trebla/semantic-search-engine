export function toVectorString(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}
