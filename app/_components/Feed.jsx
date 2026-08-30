'use client';

import { useEffect, useRef, useState } from 'react';

/* גווני oklch לסבב בין האייטמים — כל מסך מקבל צבע משלו */
const HUES = [195, 320, 45, 260, 150, 15, 100, 225, 300, 70, 180, 340];

/** משטח את מבנה הגיליון לרשימת מסכים: ספוטלייטים ואז אייטמי המדורים */
function flatten(digest) {
  const items = [];
  for (const s of digest.spotlight ?? []) {
    items.push({
      tag: s.tag,
      title: s.title,
      body: s.summary,
      why: s.whyItMatters,
      source: s.source,
      url: s.url,
    });
  }
  for (const section of digest.sections ?? []) {
    for (const it of section.items) {
      items.push({
        tag: section.heading,
        title: it.title,
        body: it.summary,
        why: it.whyItMatters,
        source: it.source,
        url: it.url,
      });
    }
  }
  return items.map((it, i) => ({ ...it, hue: HUES[i % HUES.length] }));
}

function waShare(text, url) {
  return 'https://wa.me/?text=' + encodeURIComponent(text + '\n' + url);
}

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

function ActionRail({ id, liked, likeCount, commentCount, onLike, onPanel, wa }) {
  return (
    <div className="action-rail">
      <button className={'rail-btn' + (liked ? ' liked' : '')} onClick={onLike} aria-label="לייק">
        <HeartIcon filled={liked} />
      </button>
      <span className="rail-count">{likeCount}</span>
      <button className="rail-btn" onClick={onPanel} aria-label="תגובות">
        <CommentIcon />
      </button>
      <span className="rail-count">{commentCount}</span>
      <a className="rail-wa" href={wa} target="_blank" rel="noreferrer" aria-label="שיתוף בוואטסאפ">
        <SendIcon />
      </a>
    </div>
  );
}

function CommentsPanel({ comments, text, onText, onSend, onClose }) {
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
            <div className="comment" key={i}>
              <div className="comment-avatar">{cm.name[0]}</div>
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
        <div className="panel-input-row">
          <input
            className="panel-input"
            value={text}
            onChange={(e) => onText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onSend(); }}
            placeholder="כתבו תגובה..."
          />
          <button className="panel-send" onClick={onSend}>שליחה</button>
        </div>
      </div>
    </>
  );
}

export default function Feed({ digest, dateRange }) {
  const items = flatten(digest);
  const quickHits = digest.quickHits ?? [];
  const screenCount = items.length + (quickHits.length ? 1 : 0);

  const scrollerRef = useRef(null);
  const confettiRef = useRef(null);
  const rafRef = useRef(null);
  const endFiredRef = useRef(false);

  const [likes, setLikes] = useState({});
  const [comments, setComments] = useState({});
  const [openPanel, setOpenPanel] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [pageUrl, setPageUrl] = useState('');

  const LIKES_KEY = `radar-likes-${digest.slug}`;
  const COMMENTS_KEY = `radar-comments-${digest.slug}`;

  useEffect(() => {
    setPageUrl(window.location.href.split('#')[0]);
    try {
      setLikes(JSON.parse(localStorage.getItem(LIKES_KEY) || '{}'));
      setComments(JSON.parse(localStorage.getItem(COMMENTS_KEY) || '{}'));
    } catch { /* איחסון חסום — ממשיכים בלי */ }
  }, [LIKES_KEY, COMMENTS_KEY]);

  const persist = (key, val) => {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* noop */ }
  };

  const toggleLike = (id) => {
    const next = { ...likes, [id]: !likes[id] };
    setLikes(next);
    persist(LIKES_KEY, next);
  };

  const sendComment = (id) => {
    const text = commentText.trim();
    if (!text) return;
    const next = {
      ...comments,
      [id]: [...(comments[id] || []), { name: 'אני', when: 'עכשיו', text }],
    };
    setComments(next);
    setCommentText('');
    persist(COMMENTS_KEY, next);
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

  const onScroll = (e) => {
    const el = e.currentTarget;
    if (!endFiredRef.current && el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
      endFiredRef.current = true;
      fireConfetti();
    }
  };

  const backToTop = () => scrollerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

  const coverWa = waShare(`רדאר AI · גיליון ${digest.issue} — ${digest.title}`, pageUrl);
  const readMinutes = Math.max(2, Math.round((screenCount * 22) / 60));

  return (
    <div className="feed-viewport">
      <div className="feed-phone">
        <div className="feed-scroller" ref={scrollerRef} onScroll={onScroll}>

          {/* ---- פתיח ---- */}
          <section className="screen cover">
            <div className="grid-overlay" />
            <div className="cover-blob-a" />
            <div className="cover-blob-b" />
            <div className="cover-content">
              <div className="cover-topline">
                <span className="issue-badge">גיליון {digest.issue}</span>
                <span>{dateRange}</span>
                <a href="/archive/" style={{ marginInlineStart: 'auto', fontSize: 12 }}>ארכיון ←</a>
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
              <a className="wa-cta" href={coverWa} target="_blank" rel="noreferrer">
                שיתוף הגיליון בוואטסאפ ↗
              </a>
            </div>
            <div className="scroll-hint">
              <div className="scroll-hint-mouse"><div className="scroll-hint-wheel" /></div>
            </div>
          </section>

          {/* ---- אייטמים ---- */}
          {items.map((item, i) => {
            const id = `it${i}`;
            const liked = !!likes[id];
            const cms = comments[id] || [];
            return (
              <section className="screen" key={id}>
                <div
                  className="item-bg"
                  style={{
                    background: `radial-gradient(circle at 80% 15%, oklch(0.5 0.19 ${item.hue} / 0.55), transparent 55%), radial-gradient(circle at 15% 75%, oklch(0.45 0.2 ${(item.hue + 120) % 360} / 0.4), transparent 55%), linear-gradient(160deg, #0a0d20, #05060e)`,
                  }}
                />
                <div className="grid-overlay" />
                <div className="item-num" style={{ WebkitTextStroke: `1.5px oklch(0.75 0.16 ${item.hue} / 0.55)` }}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div className="item-fade" />
                <div className="item-topline" style={{ background: `linear-gradient(90deg, oklch(0.75 0.16 ${item.hue}), transparent)` }} />

                <ActionRail
                  id={id}
                  liked={liked}
                  likeCount={liked ? 1 : 0}
                  commentCount={cms.length}
                  onLike={() => toggleLike(id)}
                  onPanel={() => { setOpenPanel(openPanel === id ? null : id); setCommentText(''); }}
                  wa={waShare(item.title, item.url || pageUrl)}
                />

                <div className="item-content">
                  <div className="item-tags">
                    <span
                      className="tag-pill"
                      style={{ border: `1px solid oklch(0.75 0.16 ${item.hue})`, color: `oklch(0.87 0.12 ${item.hue})` }}
                    >
                      {item.tag}
                    </span>
                    <span className="item-source">{item.source}</span>
                  </div>
                  <h2>{item.title}</h2>
                  <p>{item.body}</p>
                  {item.why && (
                    <div className="why-box" style={{ borderInlineStart: `3px solid oklch(0.75 0.16 ${item.hue})` }}>
                      <div className="why-box-inner"><b>למה זה חשוב · </b>{item.why}</div>
                    </div>
                  )}
                  {item.url && (
                    <div className="item-links">
                      <a className="link-pill" href={item.url} target="_blank" rel="noreferrer">
                        למקור ↗
                      </a>
                    </div>
                  )}
                </div>

                {openPanel === id && (
                  <CommentsPanel
                    comments={cms}
                    text={commentText}
                    onText={setCommentText}
                    onSend={() => sendComment(id)}
                    onClose={() => setOpenPanel(null)}
                  />
                )}
              </section>
            );
          })}

          {/* ---- בזקים ---- */}
          {quickHits.length > 0 && (() => {
            const id = 'quick';
            const hue = HUES[items.length % HUES.length];
            const cms = comments[id] || [];
            const liked = !!likes[id];
            return (
              <section className="screen" key={id}>
                <div
                  className="item-bg"
                  style={{
                    background: `radial-gradient(circle at 80% 15%, oklch(0.5 0.19 ${hue} / 0.55), transparent 55%), radial-gradient(circle at 15% 75%, oklch(0.45 0.2 ${(hue + 120) % 360} / 0.4), transparent 55%), linear-gradient(160deg, #0a0d20, #05060e)`,
                  }}
                />
                <div className="grid-overlay" />
                <div className="item-num" style={{ WebkitTextStroke: `1.5px oklch(0.75 0.16 ${hue} / 0.55)` }}>⚡</div>
                <div className="item-fade" />
                <div className="item-topline" style={{ background: `linear-gradient(90deg, oklch(0.75 0.16 ${hue}), transparent)` }} />

                <ActionRail
                  id={id}
                  liked={liked}
                  likeCount={liked ? 1 : 0}
                  commentCount={cms.length}
                  onLike={() => toggleLike(id)}
                  onPanel={() => { setOpenPanel(openPanel === id ? null : id); setCommentText(''); }}
                  wa={waShare(`רדאר AI · גיליון ${digest.issue} — בזקים`, pageUrl)}
                />

                <div className="quick-list">
                  <div className="item-tags">
                    <span
                      className="tag-pill"
                      style={{ border: `1px solid oklch(0.75 0.16 ${hue})`, color: `oklch(0.87 0.12 ${hue})` }}
                    >
                      בזקים
                    </span>
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
                  />
                )}
              </section>
            );
          })()}

          {/* ---- סיום ---- */}
          <section className="screen finale">
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
              <a href={coverWa} target="_blank" rel="noreferrer">שיתוף בוואטסאפ ↗</a>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
