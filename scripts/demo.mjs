// Offline demo: runs the site against a fake WordPress and a fake RapidTextAI API (sample content, no key, no units).
// Usage: npm run demo            (dev server)      MODE=start npm run demo   (production server, after `npm run build`)
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';

const posts = [
  { id: 1, slug: 'choosing-project-management-software', date: '2026-10-28T09:00:00', title: 'Choosing Project Management Software: A Guide for Small Teams', excerpt: 'A practical way to compare tools by setup effort and total cost, not just features.', tags: ['Productivity', 'Software'], body: '<p>Every small team eventually outgrows spreadsheets. This guide shows a simple way to choose a tool without getting lost in feature lists.</p><h2>What matters most</h2><p>Start with how long onboarding takes and what the plan really costs once you add a few teammates.</p><h2>A simple scorecard</h2><p>Score each tool from one to five on setup, price, integrations and reporting, then weigh what your team uses daily.</p><h2>Frequently asked questions</h2><h3>Is free software enough?</h3><p>Often, for very small teams.</p>' },
  { id: 2, slug: 'remote-team-budgeting', date: '2026-10-21T09:00:00', title: 'Remote Team Budgeting: Five Habits That Keep Spending Honest', excerpt: 'Monthly reviews, shared categories and a small buffer go a long way.', tags: ['Finance'], body: '<p>A budget only works if the whole team looks at it.</p><h2>Review monthly</h2><p>A fifteen-minute check keeps surprises small.</p>' },
  { id: 3, slug: 'writing-a-content-brief', date: '2026-10-14T09:00:00', title: 'How to Write a Content Brief Writers Actually Follow', excerpt: 'Keep it to one page: audience, angle, outline and sources.', tags: ['Content', 'SEO'], body: '<p>The best briefs are short and specific.</p><h2>Start with the reader</h2><p>Say who it is for and what they should do next.</p>' },
];
const rest = (p) => ({ id: p.id, slug: p.slug, date: p.date, link: `http://localhost:3000/blog/${p.slug}`, title: { rendered: p.title }, excerpt: { rendered: `<p>${p.excerpt}</p>` }, content: { rendered: p.body }, _embedded: { 'wp:term': [p.tags.map((t) => ({ taxonomy: 'post_tag', name: t }))] } });
const generated = { title: 'Sample Generated Article', slug: 'sample-generated-article', meta_description: 'A sample article from the demo API.', tags: ['Demo'], body_html: '<h2>Overview</h2><p>This is sample text from the fake API.</p>', faq: [], sources: [], word_count: 1200, quality: { score: 93 } };

const mock = createServer((req, res) => {
  let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => {
    const j = (o, s = 200) => { res.writeHead(s, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
    if (req.url.includes('/v2/article/generate')) { res.writeHead(200, { 'Content-Type': 'text/event-stream' }); res.write(`data: ${JSON.stringify({ type: 'result', data: generated })}\n\n`); return res.end('data: [DONE]\n\n'); }
    if (req.url.startsWith('/wp-json/wp/v2/posts?slug=')) { const s = new URL(req.url, 'http://x').searchParams.get('slug'); return j(posts.filter((p) => p.slug === s).map(rest)); }
    if (req.url.startsWith('/wp-json/wp/v2/posts?') && req.method === 'GET') return j(posts.map(rest));
    if (req.url.startsWith('/wp-json/wp/v2/tags')) return req.method === 'POST' ? j({ id: 99 }) : j([]);
    if (req.url === '/wp-json/wp/v2/posts' && req.method === 'POST') { const p = JSON.parse(b); return j({ id: 9, slug: p.slug, status: p.status, link: `http://localhost:3000/blog/${p.slug}` }, 201); }
    j({ message: 'not found' }, 404);
  });
}).listen(Number(process.env.MOCK_PORT || 0), '127.0.0.1', () => {
  const base = `http://127.0.0.1:${mock.address().port}`;
  const env = { ...process.env, WP_URL: base, WP_USER: 'demo', WP_APP_PASSWORD: 'demo', RAPIDTEXTAI_API_KEY: 'demo-key', RAPIDTEXTAI_BASE_URL: `${base}/openai`, GENERATE_SECRET: 'demo-secret', NEXT_PUBLIC_SITE_NAME: process.env.NEXT_PUBLIC_SITE_NAME || 'Field Notes' };
  console.log('DEMO MODE: fake WordPress and fake RapidTextAI API with sample content. No key or units needed.');
  const cmd = process.env.MODE === 'start' ? 'start' : 'dev';
  spawn(process.execPath, ['node_modules/next/dist/bin/next', cmd], { env, stdio: 'inherit' }).on('exit', (c) => process.exit(c ?? 0));
});
