#!/usr/bin/env node
/**
 * NotebookLM לגיליון — שלוש פעולות פשוטות:
 *
 *   node scripts/notebook.mjs sources 2026-09-06
 *     מדפיס את כל הקישורים של הגיליון, שורה לכל אחד — להדבקה ב-NotebookLM.
 *
 *   node scripts/notebook.mjs link 2026-09-06 https://notebooklm.google.com/notebook/...
 *     שומר את קישור המחברת המשותפת בגיליון → כפתור "שאלו את NotebookLM".
 *
 *   node scripts/notebook.mjs audio 2026-09-06 "C:\Users\...\Downloads\Audio Overview.wav"
 *     ממיר את ה-Audio Overview ל-mp3 קטן, מעתיק ל-public/audio/<slug>/ → כפתור "האזינו לגיליון".
 *
 * אחרי כל פעולה: git add -A && git commit && git push — ו-Vercel מפרסם.
 */

import fs from 'node:fs';
import path from 'node:path';

const [cmd, slug, arg] = process.argv.slice(2);
const usage = () => {
  console.error('שימוש:\n  notebook.mjs sources <slug>\n  notebook.mjs link <slug> <url>\n  notebook.mjs audio <slug> <קובץ>');
  process.exit(1);
};
if (!cmd || !slug) usage();

const digestPath = path.join('content', 'digests', `${slug}.json`);
if (!fs.existsSync(digestPath)) {
  console.error(`אין גיליון ${slug} (${digestPath})`);
  process.exit(1);
}
const digest = JSON.parse(fs.readFileSync(digestPath, 'utf8'));
const save = () => fs.writeFileSync(digestPath, JSON.stringify(digest, null, 2) + '\n', 'utf8');

/* ---------- sources ---------- */
if (cmd === 'sources') {
  const urls = [];
  const add = (u) => { if (u && !urls.includes(u)) urls.push(u); };
  (digest.spotlight ?? []).forEach((s) => add(s.url));
  (digest.sections ?? []).forEach((sec) => sec.items.forEach((it) => add(it.url)));
  (digest.quickHits ?? []).forEach((q) => add(q.url));

  console.log(`# רדאר AI · גיליון ${digest.issue} — ${digest.title}`);
  console.log(`# ${urls.length} מקורות. העתיקי הכל מתחת לקו והדביקי ב-NotebookLM → Add source → Websites\n`);
  console.log('-'.repeat(60));
  urls.forEach((u) => console.log(u));
  process.exit(0);
}

/* ---------- link ---------- */
if (cmd === 'link') {
  if (!arg || !/^https:\/\/notebooklm\.google\.com\//.test(arg)) {
    console.error('צריך קישור שמתחיל ב-https://notebooklm.google.com/');
    process.exit(1);
  }
  digest.notebook = arg;
  save();
  console.log(`✓ נשמר. גיליון ${digest.issue} יציג "שאלו את NotebookLM".`);
  process.exit(0);
}

/* ---------- audio ---------- */
if (cmd === 'audio') {
  if (!arg || !fs.existsSync(arg)) {
    console.error('צריך נתיב לקובץ אודיו קיים (wav / mp3 / m4a)');
    process.exit(1);
  }
  const ext = path.extname(arg).toLowerCase();
  const outDir = path.join('public', 'audio', slug);
  fs.mkdirSync(outDir, { recursive: true });

  let outFile;
  if (ext === '.wav') {
    outFile = path.join(outDir, 'issue.mp3');
    const input = fs.readFileSync(arg);
    const mp3 = await wavToMp3(input, 96);
    fs.writeFileSync(outFile, mp3);
    console.log(`✓ הומר: ${(input.length / 1e6).toFixed(1)}MB wav → ${(mp3.length / 1e6).toFixed(1)}MB mp3`);
  } else if (ext === '.mp3' || ext === '.m4a') {
    outFile = path.join(outDir, `issue${ext}`);
    fs.copyFileSync(arg, outFile);
    const mb = fs.statSync(outFile).size / 1e6;
    console.log(`✓ הועתק (${mb.toFixed(1)}MB)`);
    if (mb > 40) console.log('⚠ קובץ גדול — ייטען לאט בנייד. עדיף להוריד מ-NotebookLM כ-wav ולתת לסקריפט להמיר.');
  } else {
    console.error(`פורמט לא נתמך: ${ext}`);
    process.exit(1);
  }

  digest.podcast = '/' + path.relative('public', outFile).split(path.sep).join('/');
  save();
  console.log(`✓ נשמר. גיליון ${digest.issue} יציג "האזינו לגיליון" → ${digest.podcast}`);
  process.exit(0);
}

usage();

/* ---------- wav → mp3 (lamejs, JS טהור — בלי ffmpeg) ---------- */
async function wavToMp3(buf, kbps) {
  /* lamejs 1.2.1 מצפה לשלושה גלובלים שהחבילה שוכחת להגדיר — באג ידוע */
  globalThis.MPEGMode = (await import('lamejs/src/js/MPEGMode.js')).default;
  globalThis.Lame = (await import('lamejs/src/js/Lame.js')).default;
  globalThis.BitStream = (await import('lamejs/src/js/BitStream.js')).default;
  const lamejs = (await import('lamejs')).default;

  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('לא קובץ WAV תקין');
  }
  let pos = 12;
  let fmt = null;
  let data = null;
  while (pos + 8 <= buf.length) {
    const id = buf.toString('ascii', pos, pos + 4);
    const size = buf.readUInt32LE(pos + 4);
    const body = pos + 8;
    if (id === 'fmt ') {
      fmt = {
        format: buf.readUInt16LE(body),
        channels: buf.readUInt16LE(body + 2),
        sampleRate: buf.readUInt32LE(body + 4),
        bits: buf.readUInt16LE(body + 14),
      };
    } else if (id === 'data') {
      data = buf.subarray(body, body + size);
    }
    pos = body + size + (size % 2);
  }
  if (!fmt || !data) throw new Error('חסר fmt או data ב-WAV');

  const { channels, sampleRate, bits, format } = fmt;
  const frames = Math.floor(data.length / (channels * (bits / 8)));
  const left = new Int16Array(frames);
  const right = channels > 1 ? new Int16Array(frames) : null;

  const read = (frame, ch) => {
    const off = (frame * channels + ch) * (bits / 8);
    if (bits === 16) return data.readInt16LE(off);
    if (bits === 24) return (data.readIntLE(off, 3) >> 8);
    if (bits === 32 && format === 3) return Math.max(-32768, Math.min(32767, Math.round(data.readFloatLE(off) * 32767)));
    if (bits === 32) return data.readInt32LE(off) >> 16;
    if (bits === 8) return (data.readUInt8(off) - 128) << 8;
    throw new Error(`עומק ביטים לא נתמך: ${bits}`);
  };
  for (let i = 0; i < frames; i++) {
    left[i] = read(i, 0);
    if (right) right[i] = read(i, 1);
  }

  const enc = new lamejs.Mp3Encoder(channels, sampleRate, kbps);
  const chunks = [];
  const block = 1152;
  for (let i = 0; i < frames; i += block) {
    const l = left.subarray(i, i + block);
    const r = right ? right.subarray(i, i + block) : undefined;
    const out = right ? enc.encodeBuffer(l, r) : enc.encodeBuffer(l);
    if (out.length) chunks.push(Buffer.from(out));
  }
  const tail = enc.flush();
  if (tail.length) chunks.push(Buffer.from(tail));
  return Buffer.concat(chunks);
}
