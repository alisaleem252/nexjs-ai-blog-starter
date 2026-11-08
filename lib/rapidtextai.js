// Minimal RapidTextAI client for article generation (streams server-sent events, resolves with the article).
const BASE = () => (process.env.RAPIDTEXTAI_BASE_URL || 'https://app.rapidtextai.com/openai').replace(/\/+$/, '');

export async function generateArticle(params, { onEvent, signal } = {}) {
  const key = process.env.RAPIDTEXTAI_API_KEY;
  if (!key) throw new Error('RAPIDTEXTAI_API_KEY is not set.');
  // The key is also sent as ?gigsixkey= because the production server currently ignores the Authorization header.
  const res = await fetch(`${BASE()}/v2/article/generate?gigsixkey=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({ ...params, stream: true }),
    signal,
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { msg = (await res.json()).error?.message || msg; } catch {}
    if (res.status === 401) msg += ' (check RAPIDTEXTAI_API_KEY)';
    if (res.status === 429) msg += ' (an article is already generating on this account)';
    throw new Error(msg);
  }
  const dec = new TextDecoder();
  let buf = '', result = null;
  for await (const chunk of res.body) {
    buf += dec.decode(chunk, { stream: true });
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).replace(/\r$/, ''); buf = buf.slice(i + 1);
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (data === '[DONE]') break;
      let evt; try { evt = JSON.parse(data); } catch { continue; }
      if (evt.type === 'error') throw new Error(evt.error?.message || 'Generation failed');
      if (evt.type === 'result') result = evt.data;
      onEvent?.(evt);
    }
  }
  if (!result) throw new Error('The stream ended without an article.');
  return result;
}

/** Turn a generated article into the HTML stored in WordPress (body + FAQ + sources). */
export function articleToHtml(a) {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const faq = a.faq?.length ? `<h2>Frequently asked questions</h2>\n${a.faq.map((f) => `<h3>${esc(f.q)}</h3>\n<p>${esc(f.a)}</p>`).join('\n')}` : '';
  const sources = a.sources?.length ? `<h2>Sources</h2>\n<ul>\n${a.sources.map((s) => `<li><a href="${esc(s.url)}" rel="noopener nofollow">${esc(s.title || s.url)}</a></li>`).join('\n')}\n</ul>` : '';
  return [a.body_html || '', faq, sources].filter(Boolean).join('\n');
}
