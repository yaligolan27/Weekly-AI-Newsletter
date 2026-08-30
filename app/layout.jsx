import './globals.css';

export const metadata = {
  title: 'רדאר AI · מנהלת החלל',
  description:
    'ניוזלטר שבועי על מה שקורה בעולם הבינה המלאכותית, נאסף מהניוזלטרים המובילים ומחדשות הרשת.',
};

export const viewport = {
  themeColor: '#020309',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;700;900&family=Secular+One&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
