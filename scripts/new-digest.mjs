#!/usr/bin/env node
/**
 * Scaffolds the next digest file.
 *
 *   node scripts/new-digest.mjs            # week ending today
 *   node scripts/new-digest.mjs 2026-09-06 # week ending on a given date
 *
 * Prints the path it wrote. Fails loudly if that digest already exists,
 * so a re-run never silently clobbers a written issue.
 */
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.join(process.cwd(), 'content', 'digests');

const endArg = process.argv[2];
const end = endArg ? new Date(`${endArg}T00:00:00Z`) : new Date();
if (Number.isNaN(end.getTime())) {
  console.error(`Not a date: ${endArg}. Expected YYYY-MM-DD.`);
  process.exit(1);
}

const iso = (d) => d.toISOString().slice(0, 10);

const start = new Date(end);
start.setUTCDate(start.getUTCDate() - 6);

fs.mkdirSync(DIR, { recursive: true });

const existing = fs
  .readdirSync(DIR)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')));

const slug = iso(end);
if (existing.some((d) => d.slug === slug)) {
  console.error(`Digest ${slug} already exists. Edit it directly instead.`);
  process.exit(1);
}

const issue = existing.reduce((max, d) => Math.max(max, d.issue ?? 0), 0) + 1;

const template = {
  slug,
  issue,
  date: slug,
  rangeStart: iso(start),
  rangeEnd: slug,
  title: '',
  intro: '',
  spotlight: [
    { title: '', tag: '', summary: '', whyItMatters: '', source: '', url: '' },
  ],
  sections: [
    { heading: '', items: [{ title: '', summary: '', whyItMatters: '', source: '', url: '' }] },
  ],
  quickHits: [{ text: '', url: '', source: '' }],
  sources: [],
};

const file = path.join(DIR, `${slug}.json`);
fs.writeFileSync(file, `${JSON.stringify(template, null, 2)}\n`, 'utf8');
console.log(file);
