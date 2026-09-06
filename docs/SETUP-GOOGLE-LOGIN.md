# התחברות עם Google — הגדרה חד־פעמית

האתר סטטי (Vercel), ולכן ההתחברות והתגובות רצות דרך **Firebase** — שירות של גוגל שעובד ישירות מהדפדפן בלי שרת משלנו. ההתחברות היא "Sign in with Google" הרגילה, והתגובות והלייקים נשמרים ב-Firestore ומשותפים בין כל הקוראים.

הקוד כבר מוכן ([`lib/firebase.js`](../lib/firebase.js), [`firestore.rules`](../firestore.rules)). בלי ההגדרה למטה האתר ממשיך לעבוד במצב מקומי (תגובות נשמרות רק בדפדפן של הקורא). ברגע שארבעת משתני הסביבה קיימים — מצב הענן נדלק לבד.

זמן: כ-15 דקות. עלות: 0 (המכסה החינמית של Firebase מספיקה בשפע לניוזלטר צוותי).

---

## 1. יצירת פרויקט Firebase

1. היכנסי ל-**https://console.firebase.google.com** עם חשבון הגוגל שלך
2. **Create a project** → שם: `radar-ai` → Continue
3. **Google Analytics** — כבי (לא צריך) → Create project

## 2. הפעלת התחברות עם Google

1. בתפריט הצד: **Build → Authentication → Get started**
2. לשונית **Sign-in method** → **Google** → **Enable**
3. **Project support email** — בחרי את המייל שלך → **Save**

## 3. אישור הדומיין של האתר

1. **Authentication → Settings → Authorized domains → Add domain**
2. הוסיפי: `weekly-ai-newsletter-cto-mata.vercel.app`
   (`localhost` כבר שם — לפיתוח מקומי)

> אם תעברי לדומיין משלך בעתיד — צריך להוסיף גם אותו כאן.

## 4. מסד הנתונים לתגובות

1. **Build → Firestore Database → Create database**
2. **Location**: `eur3 (europe-west)` — הכי קרוב לישראל
3. **Start in production mode** → **Create**
4. לשונית **Rules** → מחקי את מה שיש → הדביקי את כל התוכן של [`firestore.rules`](../firestore.rules) → **Publish**

הכללים האלה: כולם יכולים לקרוא, רק מחוברים יכולים לכתוב, וכל אחד יכול למחוק רק את התגובות שלו.

## 5. העתקת המפתחות

1. גלגל השיניים ליד **Project Overview → Project settings**
2. גללי ל-**Your apps → הסמל `</>` (Web)**
3. **App nickname**: `radar-ai web` → **Register app** (בלי Hosting)
4. יוצג בלוק `firebaseConfig`. את צריכה ממנו **4 ערכים**:
   `apiKey`, `authDomain`, `projectId`, `appId`

> המפתחות האלה **מיועדים להיות פומביים** — הם מזהים את הפרויקט, לא מאמתים גישה. האבטחה נשענת על הכללים משלב 4 ועל רשימת הדומיינים משלב 3. לכן בסדר גמור שהם בקוד ובדפדפן.

## 6. הזנה ל-Vercel

1. **https://vercel.com → הפרויקט → Settings → Environment Variables**
2. הוסיפי ארבעה משתנים (Environment: **Production**):

| Name | Value |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `apiKey` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `projectId` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `appId` |

3. **Deployments → הפריסה האחרונה → ⋯ → Redeploy**

זהו. אחרי הפריסה יופיע כפתור "התחברות" בפתיח, וכשלוחצים על תגובות בלי להיות מחוברים — הצעה להתחבר.

## 7. (אופציונלי) לפיתוח מקומי

צרי בתיקיית הפרויקט קובץ `.env.local` (הוא ב-`.gitignore`, לא נדחף):

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

---

## שאלות שכנראה יעלו

**"האם רק אנשי מנהלת החלל יוכלו להתחבר?"**
כרגע כל חשבון גוגל. אם הצוות על Google Workspace ארגוני ורוצים לסגור רק לארגון: **Google Cloud Console → APIs & Services → OAuth consent screen → User type: Internal**. זה חוסם כל מי שלא בדומיין הארגוני.

**"גוגל מציג אזהרה 'This app isn't verified'?"**
קורה לאפליקציות חדשות עם משתמשים חיצוניים. להתחברות בסיסית (שם + מייל) זה בדרך כלל לא מופיע. אם כן — ב-OAuth consent screen לחצי **Publish app**. אימות מלא לא נדרש להיקפים האלה.

**"מה אם מישהו מגיב משהו לא ראוי?"**
ב-**Firestore Database → Data → comments** רואים את כל התגובות ואפשר למחוק ידנית. אם זה יהפוך לצורך — נוסיף תפקיד מנהל עם מחיקה מהאתר.
