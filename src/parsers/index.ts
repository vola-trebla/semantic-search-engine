import path from 'node:path';
import { parseText } from './text.js';
import { parseHtml } from './html.js';
import { parsePdf } from './pdf.js';

export type Parser = (filePath: string) => string | Promise<string>;

const PARSERS: Record<string, Parser> = {
  '.txt': parseText,
  '.md': parseText,
  '.html': parseHtml,
  '.htm': parseHtml,
  '.pdf': parsePdf,
};

export function getParser(filePath: string): Parser | undefined {
  const ext = path.extname(filePath).toLowerCase();
  return PARSERS[ext];
}

export function getSupportedExtensions(): string[] {
  return Object.keys(PARSERS);
}
