#!/usr/bin/env node
/**
 * מושך תמונת שער (og:image) לכל אייטם בגיליון ושומר אותה מקומית.
 *
 *   node scripts/fetch-images.mjs content/digests/2026-08-30.json
 *
 * לכל אייטם עם `url` ובלי `image`: מוריד את העמוד, מחלץ og:image /
 * twitter:image, שומר ל-public/img/<slug>/ וכותב `image` חזרה ל-JSON.
 * אייטם שנכשל נשאר בלי תמונה — העיצוב יודע ליפול חזרה לגרדיאנט בלבד.
 */

import fs from 'node:fs';
import path from 'node:path';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const jsonPath = process.argv[2];
if (!jsonPath) {
  console.error('שימוש: node scripts/fetch-images.mjs <digest.json>');
  process.exit(1);
}

const digest = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const imgDir = path.join('public', 'img', digest.slug);

async function fetchWithTimeout(url, opts = {}, ms = 20000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, {
      redirect: 'follow',
      headers: { 'user-agent': UA, accept: '*/*' },
      signal: ctrl.signal,
      ...opts,
    });
  } finally {
    clearTimeout(t);
  }
}

function extractOgImage(html, baseUrl) {
  const patterns = [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i,
    /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/i,
    /<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) {
      try {
        return new URL(m[1].replace(/&amp;/g, '&'), baseUrl).href;
      } catch {
        /* כתובת שבורה — ננסה את הדפוס הבא */
      }
    }
  }
  return null;
}

function extForContentType(ct) {
  if (/png/.test(ct)) return '.png';
  if (/webp/.test(ct)) return '.webp';
  if (/gif/.test(ct)) return '.gif';
  if (/avif/.test(ct)) return '.avif';
  return '.jpg';
}

async function grab(item, key) {
  if (!item.url || item.image) return;
  try {
    const page = await fetchWithTimeout(item.url);
    if (!page.ok) throw new Error(`HTTP ${page.status}`);
    const html = (await page.text()).slice(0, 400_000);
    const imgUrl = extractOgImage(html, page.url);
    if (!imgUrl) throw new Error('אין og:image');

    const img = await fetchWithTimeout(imgUrl);
    if (!img.ok) throw new Error(`תמונה HTTP ${img.status}`);
    const ct = img.headers.get('content-type') || '';
    if (!ct.startsWith('image/')) throw new Error(`content-type: ${ct}`);
    const buf = Buffer.from(await img.arrayBuffer());
    if (buf.length < 2048) throw new Error('תמונה קטנה מדי');
    if (buf.length > MAX_IMAGE_BYTES) throw new Error('תמונה גדולה מדי');

    fs.mkdirSync(imgDir, { recursive: true });
    const file = key + extForContentType(ct);
    fs.writeFileSync(path.join(imgDir, file), buf);
    item.image = `/img/${digest.slug}/${file}`;
    console.log(`✓ ${key}  ${(buf.length / 1024).toFixed(0)}KB  ${item.title.slice(0, 45)}`);
  } catch (e) {
    console.log(`✗ ${key}  (${e.message})  ${item.title.slice(0, 45)}`);
  }
}

const jobs = [];
(digest.spotlight ?? []).forEach((it, i) => jobs.push([it, `sp${i}`]));
(digest.sections ?? []).forEach((sec, si) =>
  sec.items.forEach((it, i) => jobs.push([it, `s${si}i${i}`])),
);

/* עד 4 במקביל כדי לא להציף אתרים */
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
