import fs from 'node:fs';
import path from 'node:path';
import { chunkText } from './chunker.js';
import type { Chunk } from '../types.js';

export function loadFromDirectory(dirPath: string): Chunk[] {
  const files = fs.readdirSync(dirPath).filter((f) => ['.md', '.txt'].includes(path.extname(f)));

  const allChunks: Chunk[] = [];

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const text = fs.readFileSync(filePath, 'utf-8');
    const chunks = chunkText(text, file);
    allChunks.push(...chunks);
    console.log(`  ${file} → ${chunks.length} chunks`);
  }

  return allChunks;
}
