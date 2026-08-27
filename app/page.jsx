import Digest from './_components/Digest';
import { getLatestDigest } from '../lib/digests';

export default function Home() {
  const digest = getLatestDigest();

  if (!digest) {
    return (
      <main>
        <div className="wrap">
          <div className="issue-head">
            <h1>עוד אין גיליונות</h1>
            <p className="intro">הגיליון הראשון יופיע כאן ברגע שייווצר.</p>
          </div>
        </div>
      </main>
    );
  }

  return <Digest digest={digest} />;
}
