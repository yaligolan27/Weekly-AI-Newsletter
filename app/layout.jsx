import './globals.css';

export const metadata = {
  title: 'רדאר AI · מנהלת החלל',
  description: 'ניוזלטר שבועי על מה שקורה בעולם הבינה המלאכותית, נאסף מהניוזלטרים המובילים ומחדשות הרשת.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Assistant:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <header className="masthead">
          <div className="masthead-inner">
            <a className="masthead-title" href="/">
              רדאר <span>AI</span>
            </a>
            <nav className="masthead-nav">
              <a href="/">הגיליון האחרון</a>
              <a href="/archive/">ארכיון</a>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
