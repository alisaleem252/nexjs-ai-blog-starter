import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { articleToHtml, generateArticle } from '../lib/rapidtextai.js';
import { createPost, getPosts, getPost } from '../lib/wordpress.js';
import { generateAndPublish } from '../lib/publish.js';

const article = { title: 'Hello', slug: 'hello', meta_description: 'Desc', tags: ['SEO'], body_html: '<h2>A</h2><p>b</p>', faq: [{ q: 'Q?', a: 'A.' }], sources: [{ title: 'S', url: 'https://x.y' }], word_count: 900 };

function fake() {
  const log = []; let tagId = 10;
  const srv = createServer((req, res) => {
    let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => {
      log.push({ m: req.method, u: req.url, auth: req.headers.authorization, body: b ? JSON.parse(b) : null });
      const j = (o, s = 200) => { res.writeHead(s, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
      if (req.url.includes('/v2/article/generate')) { res.writeHead(200, { 'Content-Type': 'text/event-stream' }); res.write(`data: ${JSON.stringify({ type: 'result', data: article })}\n\n`); return res.end('data: [DONE]\n\n'); }
      if (req.url.startsWith('/wp-json/wp/v2/tags?search')) return j([]);
      if (req.url === '/wp-json/wp/v2/tags' && req.method === 'POST') return j({ id: ++tagId });
      if (req.url === '/wp-json/wp/v2/posts' && req.method === 'POST') return j({ id: 5, link: 'http://wp/hello', status: JSON.parse(b).status, slug: JSON.parse(b).slug }, 201);
      if (req.url.startsWith('/wp-json/wp/v2/posts?slug=')) return j([{ id: 1, slug: 'hello', date: '2026-01-01', title: { rendered: 'Hello' }, excerpt: { rendered: '<p>e</p>' }, content: { rendered: '<p>c</p>' }, _embedded: { 'wp:term': [[{ taxonomy: 'post_tag', name: 'SEO' }]] } }]);
      if (req.url.startsWith('/wp-json/wp/v2/posts?_embed')) return j([{ id: 1, slug: 'hello', date: '2026-01-01', title: { rendered: 'Hello' }, excerpt: { rendered: '' }, content: { rendered: '' } }]);
      j({ message: 'nope' }, 404);
    });
  }).listen(0);
  const url = `http://127.0.0.1:${srv.address().port}`;
  Object.assign(process.env, { WP_URL: url, WP_USER: 'u', WP_APP_PASSWORD: 'p p', RAPIDTEXTAI_API_KEY: 'k', RAPIDTEXTAI_BASE_URL: `${url}/openai` });
  return { log, close: () => srv.close() };
}

test('articleToHtml appends FAQ and sources, escaping text', () => {
  const html = articleToHtml({ ...article, faq: [{ q: '<b>', a: 'x' }] });
  assert.match(html, /<h2>A<\/h2>[\s\S]*Frequently asked[\s\S]*&lt;b&gt;[\s\S]*Sources[\s\S]*nofollow/);
});

test('generateArticle sends bearer auth and returns the result', async () => {
  const f = fake();
  const a = await generateArticle({ topic: 't' });
  assert.equal(a.title, 'Hello');
  assert.equal(f.log[0].auth, 'Bearer k');
  assert.equal(f.log[0].body.stream, true);
  f.close();
});

test('generateAndPublish saves a draft by default, with tags created', async () => {
  const f = fake();
  const { post } = await generateAndPublish({ topic: 't' });
  assert.equal(post.status, 'draft');
  const create = f.log.find((l) => l.u === '/wp-json/wp/v2/posts' && l.m === 'POST');
  assert.equal(create.body.status, 'draft');
  assert.deepEqual(create.body.tags, [11]);
  assert.equal(create.auth, 'Basic ' + Buffer.from('u:p p').toString('base64'));
  assert.equal((await generateAndPublish({ topic: 't', publish: true })).post.status, 'publish');
  await assert.rejects(generateAndPublish({ topic: ' ' }), /topic is required/);
  f.close();
});

test('reads normalise posts and tolerate a missing WordPress', async () => {
  const f = fake();
  const posts = await getPosts();
  assert.equal(posts[0].slug, 'hello');
  assert.deepEqual((await getPost('hello')).tags, ['SEO']);
  await assert.rejects(createPost({ title: 't', html: 'h', slug: 's', status: 'bogus' }), /Invalid status/);
  f.close();
  process.env.WP_URL = '';
  assert.deepEqual(await getPosts(), []);
  assert.equal(await getPost('x'), null);
});
