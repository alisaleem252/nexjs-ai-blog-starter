import { getPosts } from '../lib/wordpress.js';
export default async function sitemap() {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/+$/, '');
  const posts = await getPosts(100);
  return [{ url: site, changeFrequency: 'daily' }, ...posts.map((p) => ({ url: `${site}/blog/${p.slug}`, lastModified: p.date }))];
}
