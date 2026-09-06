#!/usr/bin/env node
/**
 * מושך תמלולים של פרקי פודקאסטים מהשבוע האחרון, כחומר גלם לדעות מומחים.
 *
 *   node scripts/fetch-podcasts.mjs            # 8 הימים האחרונים
 *   node scripts/fetch-podcasts.mjs --days 14
 *
 * רשימת התוכניות ב-content/podcasts.json. לכל תוכנית נמשך פיד ה-RSS
 * של ערוץ ה-YouTube שלה (לא דורש מפתח API), ולכל פרק חדש נשלף
 * התמלול האוטומטי. התוצאה נכתבת ל-transcripts/<תאריך>/ (לא נכנס ל-git).
 */

import fs from 'node:fs';
import path from 'node:path';
import { YoutubeTranscript } from 'youtube-transcript';

const args = process.argv.slice(2);
const daysArg = args.indexOf('--days');
const DAYS = daysArg >= 0 ? Number(args[daysArg + 1]) : 8;

const shows = JSON.parse(fs.readFileSync('content/podcasts.json', 'utf8'));
const today = new Date().toISOString().slice(0, 10);
const outDir = path.join('transcripts', today);
fs.mkdirSync(outDir, { recursive: true });

const since = Date.now() - DAYS * 24 * 60 * 60 * 1000;

function unescapeXml(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/** מפרק את פיד ה-Atom של YouTube לרשימת פרקים */
function parseFeed(xml) {
  const entries = [];
  for (const m of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const e = m[1];
    const get = (tag) => (e.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`)) || [])[1] || '';
    entries.push({
      videoId: get('yt:videoId'),
      title: unescapeXml(get('title')),
      published: get('published'),
      url: `https://www.youtube.com/watch?v=${get('yt:videoId')}`,
    });
  }
  return entries;
}

/** מחבר מקטעי תמלול לפסקאות קריאות */
function toParagraphs(segments) {
  const words = segments.map((s) => unescapeXml(s.text).replace(/\s+/g, ' ').trim()).filter(Boolean);
  const paragraphs = [];
  let cur = [];
  for (const w of words) {
    cur.push(w);
    if (cur.join(' ').length > 700) {
      paragraphs.push(cur.join(' '));
      cur = [];
    }
  }
  if (cur.length) paragraphs.push(cur.join(' '));
  return paragraphs.join('\n\n');
}

let total = 0;
for (const show of shows) {
  if (!show.channelId) {
    console.log(`· ${show.name}: אין channelId — מדלג`);
    continue;
  }
  let xml;
  try {
    const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${show.channelId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    xml = await res.text();
  } catch (e) {
    console.log(`✗ ${show.name}: פיד נכשל (${e.message})`);
    continue;
  }

  const recent = parseFeed(xml).filter((ep) => new Date(ep.published).getTime() >= since);
  if (!recent.length) {
    console.log(`· ${show.name}: אין פרקים ב-${DAYS} הימים האחרונים`);
    continue;
  }

  for (const ep of recent) {
    const file = path.join(outDir, `${show.id}--${ep.videoId}.md`);
    if (fs.existsSync(file)) {
      console.log(`· ${show.name}: כבר קיים — ${ep.title.slice(0, 50)}`);
      continue;
    }
    try {
      const segments = await YoutubeTranscript.fetchTranscript(ep.videoId);
      const body = toParagraphs(segments);
      /* Shorts וקליפים קצרים — רעש, לא דעה */
      if (body.length < 2500) {
        console.log(`· ${show.name}: קצר מדי (Short) — ${ep.title.slice(0, 45)}`);
        continue;
      }
      const header = [
        `# ${ep.title}`,
        '',
        `- תוכנית: ${show.name}`,
        `- מנחים: ${show.hosts.join(', ')}`,
        `- תאריך: ${ep.published.slice(0, 10)}`,
        `- קישור: ${ep.url}`,
        `- אורך תמלול: ${body.split(/\s+/).length} מילים`,
        '',
        '---',
        '',
      ].join('\n');
      fs.writeFileSync(file, header + body, 'utf8');
      total++;
      console.log(`✓ ${show.name}: ${ep.title.slice(0, 55)}  (${(body.length / 1000).toFixed(0)}K תווים)`);
    } catch (e) {
      console.log(`✗ ${show.name}: אין תמלול — ${ep.title.slice(0, 45)} (${e.message.slice(0, 60)})`);
    }
  }
}

console.log(`\nסה"כ ${total} תמלולים חדשים ב-${outDir}`);
