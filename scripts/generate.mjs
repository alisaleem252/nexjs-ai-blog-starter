#!/usr/bin/env node
// Usage: npm run generate -- "topic" [--publish] [--keyword k] [--words 1500] [--tone t] [--type guide]
import { parseArgs } from 'node:util';
import { readFileSync } from 'node:fs';
import { generateAndPublish } from '../lib/publish.js';

// Load .env.local / .env without a dependency (real environment variables win).
for (const f of ['.env.local', '.env']) {
  try {
    for (const line of readFileSync(f, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  } catch {}
}

const { values: v, positionals } = parseArgs({
  allowPositionals: true,
  options: { publish: { type: 'boolean' }, keyword: { type: 'string', short: 'k' }, words: { type: 'string', short: 'w' }, tone: { type: 'string', short: 't' }, language: { type: 'string', short: 'l' }, audience: { type: 'string', short: 'a' }, type: { type: 'string' }, cta: { type: 'string' }, help: { type: 'boolean', short: 'h' } },
});
const topic = positionals.join(' ').trim();
if (v.help || !topic) {
  console.log('Usage: npm run generate -- "<topic>" [--publish] [-k keyword] [-w words] [-t tone] [-l language] [-a audience] [--type guide|how-to|listicle|comparison|review|pillar|news] [--cta text]\n\nSaves a DRAFT in WordPress unless --publish is given. Costs 6 RapidTextAI request units.');
  process.exit(v.help ? 0 : 2);
}

const params = { topic, publish: v.publish };
if (v.keyword) params.keyword = v.keyword;
if (v.words) params.word_count = Number(v.words);
if (v.tone) params.tone = v.tone;
if (v.language) params.language = v.language;
if (v.audience) params.audience = v.audience;
if (v.type) params.article_type = v.type;
if (v.cta) params.cta = v.cta;

try {
  console.error(`Generating "${topic}" (1-3 minutes)...`);
  const { article, post } = await generateAndPublish(params, { onEvent: (e) => e.type === 'stage' && e.status === 'start' && console.error(`  • ${e.stage}`) });
  console.log(`\n${post.status === 'publish' ? 'Published' : 'Saved as draft'}: "${article.title}" (${article.word_count} words, quality ${article.quality?.score ?? 'n/a'})\n${post.link}`);
} catch (e) { console.error(e.message); process.exit(1); }
