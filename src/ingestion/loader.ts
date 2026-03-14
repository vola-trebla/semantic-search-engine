import fs from 'node:fs';
import path from 'node:path';
import { chunkText } from './chunker.js';
import type { Chunk } from '../types.js';
import { getParser, getSupportedExtensions } from '../parsers/index.js';

export async function loadFromDirectory(dirPath: string): Promise<Chunk[]> {
  const supported = getSupportedExtensions();
  const files = fs
    .readdirSync(dirPath)
    .filter((f) => supported.includes(path.extname(f).toLowerCase()));

  const allChunks: Chunk[] = [];

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const parser = getParser(filePath);
    if (!parser) continue;

    const text = await parser(filePath);
    const chunks = chunkText(text, file);
    allChunks.push(...chunks);
    console.log(`  ${file} → ${chunks.length} chunks`);
  }

  return allChunks;
}
