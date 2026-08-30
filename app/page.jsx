import Feed from './_components/Feed';
import { getLatestDigest, formatRange } from '../lib/digests';

export default function HomePage() {
  const digest = getLatestDigest();
  if (!digest) return <main style={{ padding: 40 }}>אין עדיין גיליונות.</main>;

  return <Feed digest={digest} dateRange={formatRange(digest.rangeStart, digest.rangeEnd)} />;
}
