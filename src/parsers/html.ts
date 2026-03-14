import fs from 'node:fs';
import * as cheerio from 'cheerio';

const NOISE_TAGS = ['script', 'style', 'nav', 'footer', 'header', 'aside', 'noscript', 'iframe'];

export function parseHtml(filePath: string): string {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const $ = cheerio.load(raw);

  for (const tag of NOISE_TAGS) {
    $(tag).remove();
  }

  const text = $('body').text() || $.text();

  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n\n');
}
