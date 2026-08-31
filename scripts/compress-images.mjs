#!/usr/bin/env node
/**
 * דוחס את כל תמונות הגיליונות: רוחב מקסימלי 1080px, JPEG איכות 72.
 * מעדכן סיומות ב-JSON של הגיליונות אם הפורמט השתנה.
 *
 *   node scripts/compress-images.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const IMG_ROOT = path.join('public', 'img');
const DIGESTS_DIR = path.join('content', 'digests');

if (!fs.existsSync(IMG_ROOT)) process.exit(0);

const renames = new Map(); // "/img/slug/old" -> "/img/slug/new"

for (const slug of fs.readdirSync(IMG_ROOT)) {
  const dir = path.join(IMG_ROOT, slug);
  if (!fs.statSync(dir).isDirectory()) continue;

  for (const file of fs.readdirSync(dir)) {
    if (file.endsWith('.svg')) continue;
    const full = path.join(dir, file);
    const before = fs.statSync(full).size;

    const base = file.replace(/\.[^.]+$/, '');
    const outFile = base + '.jpg';
    const outFull = path.join(dir, outFile);

    try {
      /* קוראים לזיכרון קודם — sharp נועל קבצים פתוחים בווינדוס */
      const input = fs.readFileSync(full);
      const buf = await sharp(input)
        .rotate()
        .resize({ width: 1080, withoutEnlargement: true })
        .flatten({ background: '#0a0d20' })
        .jpeg({ quality: 72, mozjpeg: true })
        .toBuffer();

      /* דוחסים רק אם באמת חסכנו */
      if (buf.length < before * 0.9 || file !== outFile) {
        fs.writeFileSync(outFull, buf);
        if (file !== outFile) {
          fs.unlinkSync(full);
          renames.set(`/img/${slug}/${file}`, `/img/${slug}/${outFile}`);
        }
        console.log(
          `✓ ${slug}/${file} → ${outFile}  ${(before / 1024).toFixed(0)}KB → ${(buf.length / 1024).toFixed(0)}KB`,
        );
      } else {
        console.log(`· ${slug}/${file}  ${(before / 1024).toFixed(0)}KB (נשאר)`);
      }
    } catch (e) {
      console.log(`✗ ${slug}/${file}  (${e.message})`);
    }
  }
}

/* עדכון נתיבים ב-JSON אם סיומת השתנתה */
if (renames.size) {
  for (const f of fs.readdirSync(DIGESTS_DIR).filter((f) => f.endsWith('.json'))) {
    const p = path.join(DIGESTS_DIR, f);
    let text = fs.readFileSync(p, 'utf8');
    let changed = false;
    for (const [from, to] of renames) {
      if (text.includes(from)) {
        text = text.replaceAll(from, to);
        changed = true;
      }
    }
    if (changed) {
      fs.writeFileSync(p, text);
      console.log(`עודכן ${p}`);
    }
  }
}
