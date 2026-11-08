import Link from 'next/link';
import { getPosts, wpConfigured } from '../lib/wordpress.js';

export const revalidate = 300;

const strip = (html) => html.replace(/<[^>]+>/g, '').replace(/&hellip;|\[…\]|\[&hellip;\]/g, '…').replace(/&#8217;/g, '’').trim();
const fmt = (d) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

export default async function Home() {
  const posts = await getPosts();
  return (
    <>
      <h1>Latest articles</h1>
      <p className="muted">Written with live research and sources, stored in WordPress.</p>
      {!wpConfigured() && (
        <div className="setup" style={{ marginTop: 28 }}>
          <strong>Almost there.</strong> Set <code>WP_URL</code> in <code>.env.local</code> to show posts from your WordPress site, then run <code>npm run generate -- "your topic" --publish</code> to write the first one.
        </div>
      )}
      {wpConfigured() && posts.length === 0 && <p className="muted" style={{ marginTop: 28 }}>No published posts yet. Run <code>npm run generate -- "your topic" --publish</code>.</p>}
      <div className="grid">
        {posts.map((p) => (
          <Link key={p.id} href={`/blog/${p.slug}`} className="card">
            {p.image && /* eslint-disable-next-line @next/next/no-img-element */ <img src={p.image} alt="" />}
            <div className="body">
              <span className="muted">{fmt(p.date)}</span>
              <h2 dangerouslySetInnerHTML={{ __html: p.title }} />
              <p>{strip(p.excerpt)}</p>
              {p.tags.length > 0 && <div className="chips">{p.tags.slice(0, 4).map((t) => <span className="chip" key={t}>{t}</span>)}</div>}
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
