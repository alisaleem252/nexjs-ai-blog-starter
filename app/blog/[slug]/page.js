import { notFound } from 'next/navigation';
import { getPost, getPosts } from '../../../lib/wordpress.js';

export const revalidate = 300;
export const dynamicParams = true;

const strip = (html) => html.replace(/<[^>]+>/g, '').replace(/&#8217;/g, '’').replace(/&amp;/g, '&').trim();

export async function generateStaticParams() {
  return (await getPosts(50)).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};
  const description = strip(post.excerpt).slice(0, 160);
  return {
    title: strip(post.title), description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: { title: strip(post.title), description, type: 'article', publishedTime: post.date, images: post.image ? [post.image] : [] },
  };
}

export default async function PostPage({ params }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Article', headline: strip(post.title),
    datePublished: post.date, description: strip(post.excerpt).slice(0, 200), image: post.image || undefined,
  };
  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <h1 dangerouslySetInnerHTML={{ __html: post.title }} />
      <p className="muted">{new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      {post.image && /* eslint-disable-next-line @next/next/no-img-element */ <img src={post.image} alt="" />}
      <div dangerouslySetInnerHTML={{ __html: post.content }} />
    </article>
  );
}
