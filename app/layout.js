import './globals.css';
import Link from 'next/link';

const NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'My AI Blog';
const URL_ = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata = {
  metadataBase: new URL(URL_),
  title: { default: NAME, template: `%s | ${NAME}` },
  description: `${NAME}: researched, well-sourced articles.`,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header className="site"><div className="wrap"><Link href="/" className="brand">{NAME}</Link><span className="muted">Headless WordPress + Next.js</span></div></header>
        <main><div className="wrap">{children}</div></main>
        <footer><div className="wrap">© {new Date().getFullYear()} {NAME}</div></footer>
      </body>
    </html>
  );
}
