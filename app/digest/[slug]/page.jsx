import Digest from '../../_components/Digest';
import { getAllDigests, getDigest, formatRange } from '../../../lib/digests';

export function generateStaticParams() {
  return getAllDigests().map((d) => ({ slug: d.slug }));
}

export function generateMetadata({ params }) {
  const digest = getDigest(params.slug);
  if (!digest) return { title: 'גיליון לא נמצא · רדאר AI' };

  return {
    title: `${digest.title} · רדאר AI`,
    description: `גיליון ${digest.issue}, ${formatRange(digest.rangeStart, digest.rangeEnd)}`,
  };
}

export default function DigestPage({ params }) {
  const digest = getDigest(params.slug);

  if (!digest) {
    return (
      <main>
        <div className="wrap">
          <div className="issue-head">
            <h1>הגיליון לא נמצא</h1>
            <p className="intro">
              <a href="/archive/">חזרה לארכיון</a>
            </p>
          </div>
        </div>
      </main>
    );
  }

  return <Digest digest={digest} />;
}
