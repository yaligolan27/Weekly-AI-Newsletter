/**
 * קבועי שער הכניסה. מודול ניטרלי (לא 'use client') כדי שגם layout.jsx
 * (רכיב שרת) וגם Gate.jsx (רכיב לקוח) יקבלו ערכים אמיתיים ולא הפניות.
 */

export const GATE_KEY = 'radar-gate';
export const GUEST_DAYS = 30;
