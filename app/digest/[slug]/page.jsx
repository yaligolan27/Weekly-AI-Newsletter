import Feed from '../../_components/Feed';
import { getAllDigests, getDigest, formatRange } from '../../../lib/digests';

export function generateStaticParams() {
  return getAllDigests().map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const digest = getDigest(slug);
  if (!digest) return {};
  return {
    title: `גיליון ${digest.issue} · רדאר AI`,
    description: digest.title,
  };
}

export default async function DigestPage({ params }) {
  const { slug } = await params;
  const digest = getDigest(slug);
  if (!digest) return <main style={{ padding: 40 }}>הגיליון לא נמצא.</main>;

  return <Feed digest={digest} dateRange={formatRange(digest.rangeStart, digest.rangeEnd)} />;
}
