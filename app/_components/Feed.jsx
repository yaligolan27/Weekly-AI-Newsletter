'use client';

import { useEffect, useRef, useState } from 'react';
import {
  collection, query, where, onSnapshot, addDoc, setDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { firebaseEnabled, getFirebase, signInWithGoogle, signOutUser, watchUser } from '../../lib/firebase';

/* גווני oklch לסבב בין האייטמים — כל מסך מקבל צבע משלו */
const HUES = [195, 320, 45, 260, 150, 15, 100, 225, 300, 70, 180, 340];

/** משטח את מבנה הגיליון לרשימת מסכים: ספוטלייטים ואז אייטמי המדורים */
function flatten(digest) {
  const items = [];
  const pick = (it, tag) => ({
    tag,
    title: it.title,
    body: it.summary,
    why: it.whyItMatters,
    expert: it.expertTake,
    source: it.source,
    url: it.url,
    image: it.image,
    links: it.links,
    podcast: it.podcast,
    notebook: it.notebook ?? digest.notebook,
  });
  for (const s of digest.spotlight ?? []) items.push(pick(s, s.tag));
  for (const section of digest.sections ?? []) {
    for (const it of section.items) items.push(pick(it, section.heading));
  }
  return items.map((it, i) => ({ ...it, hue: HUES[i % HUES.length] }));
}

function waShare(text, url) {
  return 'https://wa.me/?text=' + encodeURIComponent(text + '\n' + url);
}

function hueBg(hue) {
  return `radial-gradient(circle at 80% 15%, oklch(0.5 0.19 ${hue} / 0.55), transparent 55%), radial-gradient(circle at 15% 75%, oklch(0.45 0.2 ${(hue + 120) % 360} / 0.4), transparent 55%), linear-gradient(160deg, #0a0d20, #05060e)`;
}

/** פביקון של המקור לפי הדומיין של הכתבה */
function faviconFor(url) {
  try { return `https://www.google.com/s2/favicons?sz=64&domain=${new URL(url).hostname}`; } catch { return null; }
}

/** כותרת ארוכה מקבלת גופן קטן יותר כדי לא לדחוף את הגוף מהמסך */
function titleClass(title) {
  if (title.length > 75) return 'h-xl';
  if (title.length > 55) return 'h-l';
  return '';
}

/** "לפני 5 דק׳" וכדומה */
function timeAgo(date) {
  if (!date) return 'עכשיו';
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return 'עכשיו';
  const m = Math.floor(s / 60);
  if (m < 60) return `לפני ${m} דק׳`;
  const h = Math.floor(m / 60);
  if (h < 24) return `לפני ${h} שע׳`;
  const d = Math.floor(h / 24);
  if (d < 7) return `לפני ${d} ימים`;
  return date.toLocaleDateString('he-IL');
}

/* ---------- אייקונים ---------- */

function HeartIcon({ filled }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
      <path d="M12 21c-5.5-4.2-9-7.3-9-11a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 3.7-3.5 6.8-9 11z" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12a8 8 0 0 1-8 8H4l2.2-2.6A8 8 0 1 1 21 12z" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4z" />
    </svg>
  );
}

function HeadphonesIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3a7.2 7.2 0 0 1-10.8-3.8H1.3v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.5-3.5A12 12 0 0 0 1.3 6.6l4 3.1A7.2 7.2 0 0 1 12 4.8z" />
    </svg>
  );
}

/* ---------- רכיבים ---------- */

function ActionRail({ liked, likeCount, commentCount, onLike, onPanel, wa, podcast, onPodcast, playing, pop }) {
  return (
    <div className="action-rail">
      <button className={'rail-btn' + (liked ? ' liked' : '') + (pop ? ' pop' : '')} onClick={onLike} aria-label="לייק">
        <HeartIcon filled={liked} />
      </button>
      <span className="rail-count">{likeCount}</span>
      <button className="rail-btn" onClick={onPanel} aria-label="תגובות">
        <CommentIcon />
      </button>
      <span className="rail-count">{commentCount}</span>
      {podcast && (
        <button className={'rail-btn rail-podcast' + (playing ? ' playing' : '')} onClick={onPodcast} aria-label="האזנה לפודקאסט">
          <HeadphonesIcon />
        </button>
      )}
      <a className="rail-wa" href={wa} target="_blank" rel="noreferrer" aria-label="שיתוף בוואטסאפ">
        <SendIcon />
      </a>
    </div>
  );
}

function Avatar({ name, photo }) {
  return photo
    ? <img className="comment-avatar" src={photo} alt="" referrerPolicy="no-referrer" />
    : <div className="comment-avatar">{(name || '?')[0]}</div>;
}

function CommentsPanel({ comments, text, onText, onSend, onClose, user, onSignIn, cloud }) {
  return (
    <>
      <div className="panel-scrim" onClick={onClose} />
      <div className="panel">
        <div className="panel-head">
          <span>תגובות ({comments.length})</span>
          <button className="panel-close" onClick={onClose} aria-label="סגירה">✕</button>
        </div>
        <div className="panel-body">
          {comments.length === 0 && <div className="panel-empty">עדיין אין תגובות — פתחו את הדיון</div>}
          {comments.map((cm, i) => (
            <div className="comment" key={cm.id ?? i}>
              <Avatar name={cm.name} photo={cm.photo} />
              <div>
                <div className="comment-meta">
                  <span className="comment-name">{cm.name}</span>
                  <span className="comment-when">{cm.when}</span>
                </div>
                <div className="comment-text">{cm.text}</div>
              </div>
            </div>
          ))}
        </div>
        {cloud && !user ? (
          <div className="panel-signin">
            <span>כדי להגיב צריך להתחבר</span>
            <button className="google-btn" onClick={onSignIn}><GoogleIcon /> התחברות עם Google</button>
          </div>
        ) : (
          <div className="panel-input-row">
            <input
              className="panel-input"
              value={text}
              onChange={(e) => onText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') onSend(); }}
              placeholder={user ? `תגובה בתור ${user.name}...` : 'כתבו תגובה...'}
              maxLength={1000}
            />
            <button className="panel-send" onClick={onSend}>שליחה</button>
          </div>
        )}
      </div>
    </>
  );
}

/** קופסת המשמעויות — דעת מומחה מפודקאסט אם יש, אחרת הניתוח שלנו */
function WhyBox({ item, clamp }) {
  const hue = item.hue;
  if (item.expert) {
    return (
      <div className="why-box expert" style={{ borderInlineStart: `3px solid oklch(0.75 0.16 ${hue})` }}>
        <div className={clamp ? 'why-box-inner' : ''}>
          <b>🎙️ {item.expert.name} · {item.expert.show}</b>{' '}
          {item.expert.take}
        </div>
      </div>
    );
  }
  if (item.why) {
    return (
      <div className="why-box" style={{ borderInlineStart: `3px solid oklch(0.75 0.16 ${hue})` }}>
        <div className={clamp ? 'why-box-inner' : ''}><b>למה זה חשוב · </b>{item.why}</div>
      </div>
    );
  }
  return null;
}

/** פאנל הפירוט — הטקסט המלא, כל הקישורים, פודקאסט ו-NotebookLM */
function DetailPanel({ item, index, onClose }) {
  const hue = item.hue;
  return (
    <>
      <div className="panel-scrim" onClick={onClose} />
      <div className="panel detail">
        <div className="panel-head">
          <span className="tag-pill" style={{ border: `1px solid oklch(0.75 0.16 ${hue})`, color: `oklch(0.87 0.12 ${hue})` }}>
            {String(index + 1).padStart(2, '0')} · {item.tag}
          </span>
          <button className="panel-close" onClick={onClose} aria-label="סגירה">✕</button>
        </div>
        <div className="panel-body detail-body">
          <h2>{item.title}</h2>
          <div className="detail-source">{item.source}</div>
          <p>{item.body}</p>

          {item.expert && (
            <div className="why-box expert" style={{ borderInlineStart: `3px solid oklch(0.75 0.16 ${hue})` }}>
              <b>🎙️ {item.expert.name} · {item.expert.show}</b>{' '}
              {item.expert.take}
              {item.expert.episodeUrl && (
                <a className="expert-link" href={item.expert.episodeUrl} target="_blank" rel="noreferrer">לפרק המלא ↗</a>
              )}
            </div>
          )}
          {item.why && (
            <div className="why-box" style={{ borderInlineStart: `3px solid oklch(0.75 0.16 ${hue})` }}>
              <b>למה זה חשוב · </b>{item.why}
            </div>
          )}

          {item.podcast && (
            <div className="detail-podcast">
              <div className="detail-label">🎧 פודקאסט על האייטם</div>
              <audio controls preload="none" src={item.podcast} />
            </div>
          )}

          <div className="item-links">
            {item.url && <a className="link-pill" href={item.url} target="_blank" rel="noreferrer">למקור ↗</a>}
            {(item.links ?? []).map((lnk, li) => (
              <a className="link-pill" href={lnk.url} target="_blank" rel="noreferrer" key={li}>{lnk.label} ↗</a>
            ))}
            {item.notebook && (
              <a className="link-pill notebook" href={item.notebook} target="_blank" rel="noreferrer">
                שאלו את NotebookLM ↗
              </a>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------- הפיד ---------- */

export default function Feed({ digest, dateRange }) {
  const items = flatten(digest);
  const quickHits = digest.quickHits ?? [];
  const screenCount = items.length + (quickHits.length ? 1 : 0);
  const slug = digest.slug;

  const scrollerRef = useRef(null);
  const confettiRef = useRef(null);
  const rafRef = useRef(null);
  const endFiredRef = useRef(false);

  const [user, setUser] = useState(null);
  const [currentIdx, setCurrentIdx] = useState(0);  // איזה מסך על המסך — לתוכן העניינים ולהילה
  const [justLiked, setJustLiked] = useState(null); // אנימציית הלב
  const [origin, setOrigin] = useState('');
  const scrollRaf = useRef(null);
  const [likes, setLikes] = useState({});        // { itemId: { count, mine } }
  const [comments, setComments] = useState({});  // { itemId: [ {id,name,photo,text,when} ] }
  const [openPanel, setOpenPanel] = useState(null);
  const [openDetail, setOpenDetail] = useState(null);
  const [playing, setPlaying] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [pageUrl, setPageUrl] = useState('');

  const LIKES_KEY = `radar-likes-${slug}`;
  const COMMENTS_KEY = `radar-comments-${slug}`;

  /* --- מצב מקומי (בלי Firebase) --- */
  /* קישור עמוק לאייטם: /digest/<slug>/#it3 */
  useEffect(() => {
    const m = window.location.hash.match(/^#(it\d+|quick|end)$/);
    if (m) document.getElementById(m[1])?.scrollIntoView({ block: 'start' });
  }, []);

  useEffect(() => {
    setPageUrl(window.location.href.split('#')[0]);
    setOrigin(window.location.origin);
    if (firebaseEnabled) return;
    try {
      const l = JSON.parse(localStorage.getItem(LIKES_KEY) || '{}');
      setLikes(Object.fromEntries(Object.entries(l).map(([k, v]) => [k, { count: v ? 1 : 0, mine: !!v }])));
      const c = JSON.parse(localStorage.getItem(COMMENTS_KEY) || '{}');
      setComments(c);
    } catch { /* איחסון חסום — ממשיכים בלי */ }
  }, [LIKES_KEY, COMMENTS_KEY]);

  /* --- מצב ענן (Firebase): משתמש, תגובות ולייקים בזמן אמת --- */
  useEffect(() => {
    if (!firebaseEnabled) return undefined;
    const fb = getFirebase();
    if (!fb) return undefined;
    const stopUser = watchUser(setUser);

    const stopComments = onSnapshot(
      query(collection(fb.db, 'comments'), where('slug', '==', slug)),
      (snap) => {
        const grouped = {};
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (a.createdAt?.toMillis?.() ?? Date.now()) - (b.createdAt?.toMillis?.() ?? Date.now()))
          .forEach((c) => {
            (grouped[c.itemId] ||= []).push({
              id: c.id, name: c.name, photo: c.photo, text: c.text,
              when: timeAgo(c.createdAt?.toDate?.() ?? null),
            });
          });
        setComments(grouped);
      },
    );

    return () => { stopUser(); stopComments(); };
  }, [slug]);

  useEffect(() => {
    if (!firebaseEnabled) return undefined;
    const fb = getFirebase();
    if (!fb) return undefined;
    const stopLikes = onSnapshot(
      query(collection(fb.db, 'likes'), where('slug', '==', slug)),
      (snap) => {
        const agg = {};
        snap.docs.forEach((d) => {
          const l = d.data();
          const cur = (agg[l.itemId] ||= { count: 0, mine: false });
          cur.count += 1;
          if (user && l.uid === user.uid) cur.mine = true;
        });
        setLikes(agg);
      },
    );
    return () => stopLikes();
  }, [slug, user]);

  const persist = (key, val) => {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* noop */ }
  };

  const signIn = async () => {
    try { await signInWithGoogle(); } catch (e) { console.warn('התחברות נכשלה', e); }
  };

  /* התפרצות הלב + רטט קצר בנייד */
  const celebrateLike = (id) => {
    setJustLiked(id);
    setTimeout(() => setJustLiked((cur) => (cur === id ? null : cur)), 650);
    try { navigator.vibrate?.(12); } catch { /* לא נתמך */ }
  };

  const toggleLike = async (id) => {
    const willLike = !likes[id]?.mine;
    if (!firebaseEnabled) {
      const next = { ...likes, [id]: { count: willLike ? 1 : 0, mine: willLike } };
      setLikes(next);
      persist(LIKES_KEY, Object.fromEntries(Object.entries(next).map(([k, v]) => [k, v.mine])));
      if (willLike) celebrateLike(id);
      return;
    }
    if (!user) return signIn();
    const fb = getFirebase();
    const ref = doc(fb.db, 'likes', `${slug}_${id}_${user.uid}`);
    if (!willLike) await deleteDoc(ref);
    else {
      celebrateLike(id);
      await setDoc(ref, { slug, itemId: id, uid: user.uid, createdAt: serverTimestamp() });
    }
  };

  /** קישור קבוע לאייטם באתר — לשיתוף */
  const itemLink = (i) => `${origin}/digest/${slug}/#it${i}`;

  /** הגוון של מסך לפי האינדקס שלו — להילה בדסקטופ ולתוכן העניינים */
  const screenHue = (idx) => {
    if (idx <= 0) return 195;
    if (idx - 1 < items.length) return items[idx - 1].hue;
    if (quickHits.length && idx - 1 === items.length) return HUES[items.length % HUES.length];
    return 260;
  };

  const sendComment = async (id) => {
    const text = commentText.trim();
    if (!text) return;
    if (!firebaseEnabled) {
      const next = { ...comments, [id]: [...(comments[id] || []), { name: 'אני', when: 'עכשיו', text }] };
      setComments(next);
      setCommentText('');
      persist(COMMENTS_KEY, next);
      return;
    }
    if (!user) return signIn();
    const fb = getFirebase();
    setCommentText('');
    await addDoc(collection(fb.db, 'comments'), {
      slug, itemId: id, uid: user.uid, name: user.name, photo: user.photo, text,
      createdAt: serverTimestamp(),
    });
  };

  const fireConfetti = () => {
    const canvas = confettiRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    const colors = ['#7de3ff', '#f07ee8', '#ffd166', '#7dffb0', '#b39dff', '#ff7d9c'];
    const parts = Array.from({ length: 140 }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * canvas.height * 0.5,
      w: 6 + Math.random() * 6,
      h: 8 + Math.random() * 8,
      vy: 2 + Math.random() * 3.5,
      vx: -1.2 + Math.random() * 2.4,
      rot: Math.random() * Math.PI,
      vr: -0.15 + Math.random() * 0.3,
      c: colors[Math.floor(Math.random() * colors.length)],
    }));
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const start = performance.now();
    const tick = (t) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of parts) {
        p.y += p.vy;
        p.x += p.vx + Math.sin(t / 300 + p.rot) * 0.6;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (t - start < 4500) rafRef.current = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  /* ניווט במקלדת בדסקטופ: חצים / j / k */
  useEffect(() => {
    const onKey = (e) => {
      if (openPanel || openDetail) { if (e.key === 'Escape') { setOpenPanel(null); setOpenDetail(null); } return; }
      if (e.target.tagName === 'INPUT') return;
      const el = scrollerRef.current;
      if (!el) return;
      /* scrollBy חלק מתנגש עם scroll-snap; גלילה אל המסך הבא עצמו עובדת */
      const step = (dir) => {
        const screens = [...el.querySelectorAll('.screen')];
        const idx = Math.round(el.scrollTop / el.clientHeight);
        screens[Math.min(screens.length - 1, Math.max(0, idx + dir))]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };
      if (e.key === 'ArrowDown' || e.key === 'j' || e.key === ' ') { e.preventDefault(); step(1); }
      if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); step(-1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openPanel, openDetail]);

  const onScroll = (e) => {
    const el = e.currentTarget;
    if (!scrollRaf.current) {
      scrollRaf.current = requestAnimationFrame(() => {
        scrollRaf.current = null;
        const idx = Math.round(el.scrollTop / el.clientHeight);
        setCurrentIdx((c) => (c === idx ? c : idx));
      });
    }
    if (!endFiredRef.current && el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
      endFiredRef.current = true;
      fireConfetti();
    }
  };

  const backToTop = () => scrollerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  const openComments = (id) => { setOpenDetail(null); setOpenPanel(openPanel === id ? null : id); setCommentText(''); };

  const coverWa = waShare(`רדאר AI · גיליון ${digest.issue} — ${digest.title}`, pageUrl);
  const readMinutes = Math.max(2, Math.round((screenCount * 22) / 60));

  const openItem = openDetail !== null ? items[Number(openDetail.replace('it', ''))] : null;

  /* תוכן העניינים לדסקטופ — שורה לכל מסך, באותו סדר של הפיד */
  const tocRows = [
    { id: 'top', label: 'פתיח' },
    ...items.map((it, i) => ({ id: `it${i}`, label: it.title, n: i + 1 })),
    ...(quickHits.length ? [{ id: 'quick', label: 'בזקים' }] : []),
    { id: 'end', label: 'סיום' },
  ];

  return (
    <div className="feed-viewport">
      <div className="feed-glow" style={{ '--rot': `${screenHue(currentIdx) - 190}deg` }} />

      <nav className="feed-toc" aria-label="תוכן הגיליון">
        <div className="toc-head">גיליון {digest.issue} · {tocRows.length - 2} אייטמים</div>
        {tocRows.map((row, k) => (
          <button
            key={row.id}
            className={'toc-item' + (k === currentIdx ? ' current' : '')}
            style={k === currentIdx ? { color: `oklch(0.87 0.13 ${screenHue(k)})` } : undefined}
            onClick={() => document.getElementById(row.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            <span className="toc-n">{row.n ? String(row.n).padStart(2, '0') : '·'}</span>
            <span className="toc-label">{row.label}</span>
          </button>
        ))}
        <div className="kbd-hint">↓ או רווח — הבא · ↑ — הקודם</div>
      </nav>

      <div className="feed-phone">
        <div className="feed-scroller" ref={scrollerRef} onScroll={onScroll}>

          {/* ---- פתיח ---- */}
          <section className="screen cover" id="top">
            <div className="grid-overlay" />
            <div className="cover-blob-a" />
            <div className="cover-blob-b" />
            <div className="cover-content">
              <div className="cover-topline">
                <span className="issue-badge">גיליון {digest.issue}</span>
                <span>{dateRange}</span>
                <span style={{ marginInlineStart: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
                  {firebaseEnabled && (user ? (
                    <button className="user-chip" onClick={signOutUser} title="התנתקות">
                      <Avatar name={user.name} photo={user.photo} />
                      <span>{user.name.split(' ')[0]}</span>
                    </button>
                  ) : (
                    <button className="user-chip" onClick={signIn}><GoogleIcon /> התחברות</button>
                  ))}
                  <a href="/archive/" style={{ fontSize: 12 }}>ארכיון ←</a>
                </span>
              </div>
              <h1>רדאר AI</h1>
              <div className="cover-tagline">{digest.title}</div>
              <p className="cover-intro">{digest.intro}</p>
              <div className="cover-meta">
                <span>{screenCount} אייטמים</span>
                <span className="meta-dot" />
                <span>~{readMinutes} דקות</span>
                <span className="meta-dot" />
                <span>סוואיפ למעלה</span>
              </div>
              <div className="cover-ctas">
                <a className="wa-cta" href={coverWa} target="_blank" rel="noreferrer">
                  שיתוף הגיליון בוואטסאפ ↗
                </a>
                {digest.podcast && (
                  <button className="wa-cta podcast-cta" onClick={() => setPlaying(playing === 'issue' ? null : 'issue')}>
                    🎧 האזינו לגיליון
                  </button>
                )}
              </div>
            </div>
            {playing === 'issue' && digest.podcast && (
              <div className="mini-player">
                <span>🎧 הגיליון בפודקאסט</span>
                <audio controls autoPlay src={digest.podcast} onEnded={() => setPlaying(null)} />
                <button className="panel-close" onClick={() => setPlaying(null)} aria-label="סגירה">✕</button>
              </div>
            )}
            <div className="scroll-hint">
              <div className="scroll-hint-mouse"><div className="scroll-hint-wheel" /></div>
            </div>
          </section>

          {/* ---- אייטמים ---- */}
          {items.map((item, i) => {
            const id = `it${i}`;
            const like = likes[id] || { count: 0, mine: false };
            const cms = comments[id] || [];
            return (
              <section className={'screen item-screen' + (item.image ? ' has-photo' : '')} key={id} id={id}>
                <div className="item-bg" style={{ background: hueBg(item.hue) }} />
                {item.image && (
                  <div className="item-photo-band">
                    {/* בלי lazy: בגלילת snap מהירה תמונה עצלה לא מספיקה להיצבע והמסך נראה ריק */}
                    <img src={item.image} alt="" decoding="async" />
                    <div
                      className="item-photo-tint"
                      style={{ background: `linear-gradient(180deg, oklch(0.5 0.19 ${item.hue} / 0.3), oklch(0.45 0.2 ${(item.hue + 120) % 360} / 0.22))` }}
                    />
                  </div>
                )}
                <div className="grid-overlay" />
                <div className="item-num" style={{ WebkitTextStroke: `1.5px oklch(0.85 0.14 ${item.hue} / 0.75)` }}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div className="item-fade" />
                <div className="item-topline" style={{ background: `linear-gradient(90deg, oklch(0.75 0.16 ${item.hue}), transparent)` }} />

                <ActionRail
                  liked={like.mine}
                  likeCount={like.count}
                  commentCount={cms.length}
                  onLike={() => toggleLike(id)}
                  onPanel={() => openComments(id)}
                  wa={waShare(`רדאר AI — ${item.title}`, itemLink(i))}
                  podcast={item.podcast}
                  playing={playing === id}
                  onPodcast={() => setPlaying(playing === id ? null : id)}
                  pop={justLiked === id}
                />

                <div className="item-content">
                  <div className="item-tags">
                    <span className="tag-pill" style={{ border: `1px solid oklch(0.75 0.16 ${item.hue})`, color: `oklch(0.87 0.12 ${item.hue})` }}>
                      {item.tag}
                    </span>
                    <span className="item-source">
                      {faviconFor(item.url) && (
                        <img
                          className="source-favicon"
                          src={faviconFor(item.url)}
                          alt=""
                          loading="lazy"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      )}
                      {item.source}
                    </span>
                  </div>
                  <h2 className={titleClass(item.title)}>{item.title}</h2>
                  <p>{item.body}</p>
                  <WhyBox item={item} clamp />
                  <div className="item-links">
                    <button className="link-pill detail-btn" onClick={() => { setOpenPanel(null); setOpenDetail(id); }}>
                      פירוט ↓
                    </button>
                    {item.url && (
                      <a className="link-pill" href={item.url} target="_blank" rel="noreferrer">למקור ↗</a>
                    )}
                    {(item.links ?? []).slice(0, 1).map((lnk, li) => (
                      <a className="link-pill" href={lnk.url} target="_blank" rel="noreferrer" key={li}>{lnk.label} ↗</a>
                    ))}
                    {item.notebook && (
                      <a className="link-pill notebook" href={item.notebook} target="_blank" rel="noreferrer">NotebookLM ↗</a>
                    )}
                  </div>
                </div>

                {playing === id && item.podcast && (
                  <div className="mini-player">
                    <span>🎧 פודקאסט על האייטם</span>
                    <audio controls autoPlay src={item.podcast} onEnded={() => setPlaying(null)} />
                    <button className="panel-close" onClick={() => setPlaying(null)} aria-label="סגירה">✕</button>
                  </div>
                )}

                {openPanel === id && (
                  <CommentsPanel
                    comments={cms}
                    text={commentText}
                    onText={setCommentText}
                    onSend={() => sendComment(id)}
                    onClose={() => setOpenPanel(null)}
                    user={user}
                    onSignIn={signIn}
                    cloud={firebaseEnabled}
                  />
                )}
                {openDetail === id && openItem && (
                  <DetailPanel item={openItem} index={i} onClose={() => setOpenDetail(null)} />
                )}
              </section>
            );
          })}

          {/* ---- בזקים ---- */}
          {quickHits.length > 0 && (() => {
            const id = 'quick';
            const hue = HUES[items.length % HUES.length];
            const cms = comments[id] || [];
            const like = likes[id] || { count: 0, mine: false };
            return (
              <section className="screen" key={id} id={id}>
                <div className="item-bg" style={{ background: hueBg(hue) }} />
                <div className="grid-overlay" />
                <div className="item-num" style={{ WebkitTextStroke: `1.5px oklch(0.75 0.16 ${hue} / 0.55)` }}>⚡</div>
                <div className="item-fade" />
                <div className="item-topline" style={{ background: `linear-gradient(90deg, oklch(0.75 0.16 ${hue}), transparent)` }} />

                <ActionRail
                  liked={like.mine}
                  likeCount={like.count}
                  commentCount={cms.length}
                  onLike={() => toggleLike(id)}
                  onPanel={() => openComments(id)}
                  wa={waShare(`רדאר AI · גיליון ${digest.issue} — בזקים`, pageUrl)}
                />

                <div className="quick-list">
                  <div className="item-tags">
                    <span className="tag-pill" style={{ border: `1px solid oklch(0.75 0.16 ${hue})`, color: `oklch(0.87 0.12 ${hue})` }}>בזקים</span>
                    <span className="item-source">בשורה אחת</span>
                  </div>
                  {quickHits.map((q, i) => (
                    <div className="quick-item" key={i}>
                      <a href={q.url} target="_blank" rel="noreferrer">{q.text} ↗</a>
                      <span>{q.source}</span>
                    </div>
                  ))}
                </div>

                {openPanel === id && (
                  <CommentsPanel
                    comments={cms}
                    text={commentText}
                    onText={setCommentText}
                    onSend={() => sendComment(id)}
                    onClose={() => setOpenPanel(null)}
                    user={user}
                    onSignIn={signIn}
                    cloud={firebaseEnabled}
                  />
                )}
              </section>
            );
          })()}

          {/* ---- סיום ---- */}
          <section className="screen finale" id="end">
            <canvas className="finale-canvas" ref={confettiRef} />
            <div className="finale-orbit"><div className="finale-emoji">🛰️</div></div>
            <h2>זהו, הגעתם לסוף!</h2>
            <p>
              עברתם על כל {screenCount} האייטמים של השבוע.
              רדאר AI חוזר ביום ראשון הבא — עד אז, השמיים הם לא הגבול.
            </p>
            <div className="finale-actions">
              <button className="btn-ghost" onClick={fireConfetti}>עוד קונפטי 🎉</button>
              <button className="btn-solid" onClick={backToTop}>חזרה לתחילת הגיליון ↑</button>
            </div>
            <div className="finale-links">
              <a href="/archive/">לגיליונות קודמים</a>
              {digest.notebook && <a href={digest.notebook} target="_blank" rel="noreferrer">שאלו את NotebookLM על הגיליון ↗</a>}
              <a href={coverWa} target="_blank" rel="noreferrer">שיתוף בוואטסאפ ↗</a>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
