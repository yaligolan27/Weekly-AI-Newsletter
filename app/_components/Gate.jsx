'use client';

import { useEffect, useState } from 'react';
import { firebaseEnabled, signInWithGoogle, watchUser } from '../../lib/firebase';
import { GATE_KEY, GUEST_DAYS } from '../../lib/gate';

/**
 * שער כניסה: מוצג לפני הניוזלטר עד שבוחרים — התחברות עם Google או המשך כאורח.
 * הבחירה נשמרת במכשיר (אורח — 30 יום; מחובר — כל עוד הסשן של Firebase חי).
 * layout.jsx מריץ סקריפט קטן לפני הציור שמסתיר את השער למי שכבר בחר,
 * כדי שלא יהבהב בכל טעינה.
 */

function readChoice() {
  try {
    const raw = localStorage.getItem(GATE_KEY);
    if (!raw) return null;
    const { choice, at } = JSON.parse(raw);
    if (choice === 'guest' && Date.now() - at > GUEST_DAYS * 864e5) return null;
    return choice;
  } catch {
    return null;
  }
}

function remember(choice) {
  try { localStorage.setItem(GATE_KEY, JSON.stringify({ choice, at: Date.now() })); } catch { /* noop */ }
  document.documentElement.dataset.gate = 'done';
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3a7.2 7.2 0 0 1-10.8-3.8H1.3v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.5-3.5A12 12 0 0 0 1.3 6.6l4 3.1A7.2 7.2 0 0 1 12 4.8z" />
    </svg>
  );
}

export default function Gate() {
  const [open, setOpen] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (readChoice()) { setOpen(false); return undefined; }
    /* מי שכבר מחובר (סשן שמור של Firebase) — בלי שער */
    return watchUser((u) => {
      if (u) { remember('user'); setOpen(false); }
    });
  }, []);

  const asGuest = () => { remember('guest'); setOpen(false); };

  const withGoogle = async () => {
    setBusy(true);
    setError('');
    try {
      await signInWithGoogle();
      remember('user');
      setOpen(false);
    } catch (e) {
      console.warn('התחברות נכשלה', e);
      setError('ההתחברות לא הושלמה. אפשר לנסות שוב, או להמשיך כאורח.');
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="gate" role="dialog" aria-modal="true" aria-labelledby="gate-title">
      <div className="grid-overlay" />
      <div className="cover-blob-a" />
      <div className="cover-blob-b" />
      <div className="gate-card">
        <span className="issue-badge">מנהלת החלל</span>
        <h1 id="gate-title">רדאר AI</h1>
        <p className="gate-tagline">מה שקורה בעולם הבינה המלאכותית — פעם בשבוע, בפורמט של פיד.</p>
        <p className="gate-text">
          מחוברים יכולים להגיב, לסמן לייק ולראות מי מהצוות אמר מה.
          אורחים קוראים הכל, בלי לכתוב.
        </p>
        <div className="gate-actions">
          {firebaseEnabled && (
            <button className="gate-google" onClick={withGoogle} disabled={busy}>
              <GoogleIcon /> {busy ? 'מתחבר...' : 'התחברות עם Google'}
            </button>
          )}
          <button className="gate-guest" onClick={asGuest} disabled={busy}>
            המשך כאורח ←
          </button>
        </div>
        {error && <div className="gate-error">{error}</div>}
        <div className="gate-foot">הבחירה נשמרת במכשיר הזה. אפשר להתחבר גם אחר כך, מהפתיח.</div>
      </div>
    </div>
  );
}
