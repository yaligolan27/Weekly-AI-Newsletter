import fs from 'node:fs';
import path from 'node:path';

const DIGESTS_DIR = path.join(process.cwd(), 'content', 'digests');

/** Every digest, newest first. */
export function getAllDigests() {
  if (!fs.existsSync(DIGESTS_DIR)) return [];

  return fs
    .readdirSync(DIGESTS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(DIGESTS_DIR, f), 'utf8')))
    .sort((a, b) => b.slug.localeCompare(a.slug));
}

export function getDigest(slug) {
  return getAllDigests().find((d) => d.slug === slug) ?? null;
}

export function getLatestDigest() {
  return getAllDigests()[0] ?? null;
}

const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

/** "2026-08-26" -> "26 באוגוסט 2026" */
export function formatDate(iso) {
  const [year, month, day] = iso.split('-').map(Number);
  return `${day} ב${HEBREW_MONTHS[month - 1]} ${year}`;
}

/** "2026-08-20".."2026-08-26" -> "20–26 באוגוסט 2026" */
export function formatRange(startIso, endIso) {
  const [, startMonth, startDay] = startIso.split('-').map(Number);
  const [endYear, endMonth, endDay] = endIso.split('-').map(Number);

  if (startMonth === endMonth) {
    return `${startDay}–${endDay} ב${HEBREW_MONTHS[endMonth - 1]} ${endYear}`;
  }
  return `${startDay} ב${HEBREW_MONTHS[startMonth - 1]} – ${endDay} ב${HEBREW_MONTHS[endMonth - 1]} ${endYear}`;
}
