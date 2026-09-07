import './globals.css';
import Gate from './_components/Gate';
import { GATE_KEY, GUEST_DAYS } from '../lib/gate';

/* רץ לפני הציור הראשון: מי שכבר בחר — לא רואה את השער מהבהב */
const gateScript = `try{var g=JSON.parse(localStorage.getItem('${GATE_KEY}')||'null');if(g&&(g.choice!=='guest'||Date.now()-g.at<${GUEST_DAYS * 864e5}))document.documentElement.dataset.gate='done'}catch(e){}`;

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
  // suppressHydrationWarning: הסקריפט למניעת הבהוב מוסיף data-gate ל-html לפני ההידרציה
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;700;900&family=Secular+One&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <script dangerouslySetInnerHTML={{ __html: gateScript }} />
        <Gate />
        {children}
      </body>
    </html>
  );
}
