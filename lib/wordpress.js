// Headless WordPress via the built-in REST API. Reads are public; writes use an Application Password.
const base = () => (process.env.WP_URL || '').replace(/\/+$/, '');
export const wpConfigured = () => Boolean(base());

const authHeader = () => {
  const { WP_USER, WP_APP_PASSWORD } = process.env;
  if (!WP_USER || !WP_APP_PASSWORD) throw new Error('WP_USER and WP_APP_PASSWORD are required to publish.');
  return `Basic ${Buffer.from(`${WP_USER}:${WP_APP_PASSWORD}`).toString('base64')}`;
};

const normalise = (p) => ({
  id: p.id, slug: p.slug, date: p.date, link: p.link,
  title: p.title?.rendered || '',
  excerpt: p.excerpt?.rendered || '',
  content: p.content?.rendered || '',
  image: p._embedded?.['wp:featuredmedia']?.[0]?.source_url || null,
  tags: (p._embedded?.['wp:term']?.flat() || []).filter((t) => t.taxonomy === 'post_tag').map((t) => t.name),
});

/** Latest published posts. Returns [] when WordPress isn't configured or is unreachable, so the site still builds. */
export async function getPosts(perPage = 20) {
  if (!wpConfigured()) return [];
  try {
    const res = await fetch(`${base()}/wp-json/wp/v2/posts?_embed&per_page=${perPage}&status=publish`, { next: { revalidate: 300, tags: ['posts'] } });
    if (!res.ok) return [];
    return (await res.json()).map(normalise);
  } catch { return []; }
}

export async function getPost(slug) {
  if (!wpConfigured()) return null;
  try {
    const res = await fetch(`${base()}/wp-json/wp/v2/posts?slug=${encodeURIComponent(slug)}&_embed`, { next: { revalidate: 300, tags: ['posts'] } });
    if (!res.ok) return null;
    const [p] = await res.json();
    return p ? normalise(p) : null;
  } catch { return null; }
}

async function wp(path, init = {}) {
  const res = await fetch(`${base()}/wp-json/wp/v2${path}`, { ...init, headers: { 'Content-Type': 'application/json', Authorization: authHeader(), ...(init.headers || {}) } });
  if (!res.ok) {
    let msg = `WordPress ${res.status}`;
    try { msg = (await res.json()).message || msg; } catch {}
    throw new Error(`${msg} (${init.method || 'GET'} ${path})`);
  }
  return res.json();
}

/** Find or create tags by name; returns their ids. */
async function tagIds(names = []) {
  const ids = [];
  for (const name of names.slice(0, 10)) {
    const found = await wp(`/tags?search=${encodeURIComponent(name)}&per_page=5`);
    const exact = found.find((t) => t.name.toLowerCase() === name.toLowerCase());
    ids.push(exact ? exact.id : (await wp('/tags', { method: 'POST', body: JSON.stringify({ name }) })).id);
  }
  return ids;
}

/** Create a post from a generated article. status: 'draft' (default, safe) or 'publish'. */
export async function createPost({ title, html, excerpt, slug, tags, status = 'draft' }) {
  if (!['draft', 'publish', 'pending'].includes(status)) throw new Error(`Invalid status "${status}".`);
  const post = await wp('/posts', { method: 'POST', body: JSON.stringify({ title, content: html, excerpt: excerpt || '', slug, status, tags: await tagIds(tags) }) });
  return { id: post.id, link: post.link, status: post.status, slug: post.slug };
}
