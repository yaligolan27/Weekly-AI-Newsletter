#!/usr/bin/env node
/**
 * מושך תמונת שער לכל אייטם בגיליון ושומר אותה מקומית.
 *
 *   node scripts/fetch-images.mjs content/digests/2026-08-30.json
 *
 * לכל אייטם עם `url` ובלי `image`: מנסה כמה אסטרטגיות לחלץ תמונה
 * (og:image, twitter:image, JSON-LD, גרסת AMP), שומר ל-public/img/<slug>/
 * וכותב `image` חזרה ל-JSON. אפשר לעקוף ידנית עם `imageUrl` באייטם.
 * אייטם שנכשל נשאר בלי תמונה — העיצוב נופל חזרה לגרדיאנט.
 */

import fs from 'node:fs';
import path from 'node:path';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/* דפדפנים שונים — חלק מהאתרים חוסמים אחד ומרשים אחר */
const AGENTS = [
  {
    name: 'chrome',
    headers: {
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'accept-language': 'en-US,en;q=0.9',
      'sec-fetch-dest': 'document',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-site': 'none',
      'upgrade-insecure-requests': '1',
    },
  },
  {
    name: 'googlebot',
    headers: {
      'user-agent':
        'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
    },
  },
  {
    name: 'facebookbot',
    headers: {
      'user-agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
      accept: 'text/html,*/*;q=0.8',
    },
  },
];

const jsonPath = process.argv[2];
if (!jsonPath) {
  console.error('שימוש: node scripts/fetch-images.mjs <digest.json>');
  process.exit(1);
}

const digest = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const imgDir = path.join('public', 'img', digest.slug);

async function fetchWithTimeout(url, headers, ms = 20000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { redirect: 'follow', headers, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

function absolutize(candidate, baseUrl) {
  try {
    return new URL(candidate.replace(/&amp;/g, '&').trim(), baseUrl).href;
  } catch {
    return null;
  }
}

/** מחלץ מועמדים לתמונה מ-HTML, לפי סדר עדיפות */
function extractCandidates(html, baseUrl) {
  const out = [];
  const push = (v) => {
    const abs = v && absolutize(v, baseUrl);
    if (abs && !out.includes(abs)) out.push(abs);
  };

  const metaPatterns = [
    /<meta[^>]+property=["']og:image(?::secure_url|:url)?["'][^>]+content=["']([^"']+)["']/gi,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url|:url)?["']/gi,
    /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/gi,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/gi,
    /<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/gi,
  ];
  for (const re of metaPatterns) {
    for (const m of html.matchAll(re)) push(m[1]);
  }

  /* JSON-LD — הרבה אתרי חדשות שמים שם את התמונה הראשית */
  for (const m of html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      const walk = (node) => {
        if (!node) return;
        if (Array.isArray(node)) return node.forEach(walk);
        if (typeof node !== 'object') return;
        const img = node.image ?? node.thumbnailUrl ?? node.contentUrl;
        if (typeof img === 'string') push(img);
        else if (Array.isArray(img)) img.forEach((x) => push(typeof x === 'string' ? x : x?.url));
        else if (img?.url) push(img.url);
        Object.values(node).forEach(walk);
      };
      walk(JSON.parse(m[1].trim()));
    } catch {
      /* JSON-LD פגום — ממשיכים */
    }
  }

  /* מוצא אחרון: תמונה גדולה בגוף העמוד */
  for (const m of html.matchAll(/<img[^>]+src=["']([^"']+\.(?:jpe?g|png|webp)[^"']*)["'][^>]*>/gi)) {
    const tag = m[0];
    const w = tag.match(/width=["']?(\d+)/i);
    if (!w || Number(w[1]) >= 600) push(m[1]);
  }

  return out.filter((u) => !/\.svg($|\?)|logo|icon|avatar|sprite|placeholder/i.test(u));
}

function extForContentType(ct) {
  if (/png/.test(ct)) return '.png';
  if (/webp/.test(ct)) return '.webp';
  if (/avif/.test(ct)) return '.avif';
  if (/gif/.test(ct)) return '.gif';
  return '.jpg';
}

/** מוריד מועמד ומחזיר באפר, או null */
async function tryDownload(imgUrl, headers) {
  try {
    const img = await fetchWithTimeout(imgUrl, { ...headers, accept: 'image/*,*/*;q=0.8' });
    if (!img.ok) return null;
    const ct = img.headers.get('content-type') || '';
    if (!ct.startsWith('image/')) return null;
    const buf = Buffer.from(await img.arrayBuffer());
    if (buf.length < 3000 || buf.length > MAX_IMAGE_BYTES) return null;
    return { buf, ct };
  } catch {
    return null;
  }
}

async function grab(item, key) {
  if (item.image) return;

  /* עקיפה ידנית: imageUrl באייטם גובר על הכל */
  const targets = [];
  if (item.imageUrl) targets.push({ direct: item.imageUrl });
  /* imageFrom — כתבה חלופית על אותו סיפור, כשהמקור חסום מאחורי חומת תשלום */
  if (item.imageFrom) targets.push({ page: item.imageFrom });
  if (item.url) {
    targets.push({ page: item.url });
    /* גרסת AMP — לרוב בלי חומת תשלום */
    targets.push({ page: item.url.replace(/\/?$/, '/amp') });
  }

  for (const target of targets) {
    if (target.direct) {
      for (const agent of AGENTS) {
        const got = await tryDownload(target.direct, agent.headers);
        if (got) return save(item, key, got, 'ידני');
      }
      continue;
    }

    for (const agent of AGENTS) {
      try {
        const page = await fetchWithTimeout(target.page, agent.headers);
        if (!page.ok) continue;
        const html = (await page.text()).slice(0, 600_000);
        const candidates = extractCandidates(html, page.url);
        for (const c of candidates.slice(0, 5)) {
          const got = await tryDownload(c, agent.headers);
          if (got) return save(item, key, got, agent.name);
        }
      } catch {
        /* ננסה את הסוכן הבא */
      }
    }
  }

  console.log(`✗ ${key}  ${item.title.slice(0, 50)}`);
}

function save(item, key, { buf, ct }, via) {
  fs.mkdirSync(imgDir, { recursive: true });
  const file = key + extForContentType(ct);
  fs.writeFileSync(path.join(imgDir, file), buf);
  item.image = `/img/${digest.slug}/${file}`;
  console.log(
    `✓ ${key}  ${(buf.length / 1024).toFixed(0)}KB via ${via}  ${item.title.slice(0, 42)}`,
  );
}

const jobs = [];
(digest.spotlight ?? []).forEach((it, i) => jobs.push([it, `sp${i}`]));
(digest.sections ?? []).forEach((sec, si) =>
  sec.items.forEach((it, i) => jobs.push([it, `s${si}i${i}`])),
);

const queue = [...jobs];
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (queue.length) {
      const [it, key] = queue.shift();
      await grab(it, key);
    }
  }),
);

fs.writeFileSync(jsonPath, JSON.stringify(digest, null, 2) + '\n', 'utf8');
const got = jobs.filter(([it]) => it.image).length;
console.log(`\nסה"כ: ${got}/${jobs.length} תמונות · נכתב ${jsonPath}`);
