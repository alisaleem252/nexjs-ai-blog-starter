import { generateArticle, articleToHtml } from './rapidtextai.js';
import { createPost } from './wordpress.js';

/** Generate an article and store it in WordPress. Returns {article, post}. */
export async function generateAndPublish({ topic, publish = false, ...options }, hooks = {}) {
  if (!String(topic || '').trim()) throw new Error('topic is required.');
  const article = await generateArticle({ topic, ...options }, hooks);
  const post = await createPost({
    title: article.title, html: articleToHtml(article), excerpt: article.meta_description,
    slug: article.slug, tags: article.tags, status: publish ? 'publish' : 'draft',
  });
  return { article, post };
}
