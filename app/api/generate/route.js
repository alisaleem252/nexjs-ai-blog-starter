import { timingSafeEqual } from 'node:crypto';
import { revalidatePath, revalidateTag } from 'next/cache';
import { generateAndPublish } from '../../../lib/publish.js';

// Articles take 1-3 minutes. On Vercel this needs a plan that allows long functions; for long runs use `npm run generate`.
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const same = (a, b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };

export async function POST(request) {
  const secret = process.env.GENERATE_SECRET;
  if (!secret) return Response.json({ error: 'GENERATE_SECRET is not set; this endpoint is disabled.' }, { status: 503 });
  if (!same(request.headers.get('x-generate-secret') || '', secret)) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try { body = await request.json(); } catch { return Response.json({ error: 'Body must be JSON.' }, { status: 400 }); }
  const ALLOWED = ['topic', 'keyword', 'word_count', 'tone', 'language', 'audience', 'article_type', 'cta', 'brand_id', 'model', 'outline_hint'];
  const params = Object.fromEntries(Object.entries(body).filter(([k]) => ALLOWED.includes(k)));
  try {
    const { article, post } = await generateAndPublish({ ...params, publish: body.publish === true });
    revalidateTag('posts', 'max');
    revalidatePath('/');
    return Response.json({ title: article.title, words: article.word_count, quality: article.quality?.score ?? null, post });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 502 });
  }
}
