# רדאר AI

ניוזלטר שבועי על עולם הבינה המלאכותית, למנהלת החלל.

אתר סטטי ב-Next.js שמתפרסם ב-Vercel. כל גיליון הוא קובץ JSON אחד. הוספת קובץ ו-`git push` מפרסמים גיליון חדש.

## איך זה עובד

```
מייל (7 ניוזלטרים) ──┐
                     ├──> משימה שבועית ──> content/digests/*.json ──> git push ──> Vercel
חיפוש רשת ───────────┘
```

כל יום ראשון בבוקר רצה משימה מתוזמנת שקוראת את מה שהצטבר בתיבה, משלימה מחיפוש רשת, כותבת קובץ גיליון חדש ודוחפת אותו. Vercel בונה ומפרסם אוטומטית.

המפרט המלא של ההרצה השבועית: [`scripts/WEEKLY-PROMPT.md`](scripts/WEEKLY-PROMPT.md).

## מקורות

| ניוזלטר | תדירות | תפקיד |
|---|---|---|
| The Rundown AI | יומי | דופק יומי, מוצרים וכלים |
| TLDR AI | יומי | זווית טכנית, מחקר וכלים |
| The Batch | שבועי | פרשנות מחקרית (Andrew Ng) |
| Import AI | שבועי | מדיניות, ביטחון, גיאופוליטיקה (Jack Clark) |
| Exponential View | שבועי | מאקרו — כלכלה, אנרגיה, חברה |
| Ben's Bites | יומי | גיוסים, עסקאות, סטארטאפים |
| Payload | יומי | חלל מסחרי ומדיניות חלל |

השבעה נבחרו כשכבות משלימות — כל אחד עונה על שאלה שהאחרים לא עונים עליה. פירוט מלא ב-`WEEKLY-PROMPT.md`.

## פיתוח מקומי

```bash
npm install
npm run dev
```

האתר עולה ב-http://localhost:3000.

## הוספת גיליון ידנית

```bash
node scripts/new-digest.mjs
```

יוצר שלד ל`content/digests/<תאריך>.json` עם מספר גיליון רץ. ממלאים אותו לפי הכללים ב-`WEEKLY-PROMPT.md`, ואז:

```bash
npm run build
git add -A && git commit -m "גיליון חדש" && git push
```

## מבנה

```
app/
  page.jsx                 הגיליון האחרון
  archive/page.jsx         רשימת כל הגיליונות
  digest/[slug]/page.jsx   גיליון בודד
  _components/Digest.jsx   רכיב התצוגה המשותף
  globals.css              עיצוב, כולל מצב כהה
lib/digests.js             קריאת הגיליונות ותאריכים בעברית
content/digests/*.json     התוכן עצמו
scripts/
  new-digest.mjs           יצירת שלד לגיליון חדש
  WEEKLY-PROMPT.md         מפרט ההרצה השבועית
```

## סכימת גיליון

```jsonc
{
  "slug": "2026-08-26",        // גם שם הקובץ וגם ה-URL
  "issue": 1,                   // מספר רץ
  "date": "2026-08-26",         // תאריך פרסום
  "rangeStart": "2026-08-20",   // השבוע שהגיליון מסכם
  "rangeEnd": "2026-08-26",
  "title": "...",
  "intro": "...",
  "spotlight": [                // שלושת הסיפורים הגדולים
    { "title": "", "tag": "", "summary": "", "whyItMatters": "", "source": "", "url": "" }
  ],
  "sections": [
    { "heading": "", "items": [ /* אותם שדות, בלי tag */ ] }
  ],
  "quickHits": [ { "text": "", "url": "", "source": "" } ],
  "sources": [ "..." ],
  "note": "..."                 // אופציונלי
}
```

שדות ריקים פשוט לא מוצגים — אפשר להשמיט `whyItMatters`, `note` או מדור שלם.
