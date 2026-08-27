import { getAllDigests, formatRange } from '../../lib/digests';

export const metadata = {
  title: 'ארכיון · רדאר AI',
  description: 'כל הגיליונות של רדאר AI.',
};

export default function Archive() {
  const digests = getAllDigests();

  return (
    <main>
      <div className="wrap">
        <div className="issue-head">
          <h1>ארכיון</h1>
          <p className="intro">
            {digests.length === 1 ? 'גיליון אחד עד כה.' : `${digests.length} גיליונות עד כה.`}
          </p>
        </div>

        <section className="section">
          <ul className="archive-list">
            {digests.map((d) => (
              <li key={d.slug}>
                <a href={`/digest/${d.slug}/`}>
                  <div className="archive-meta">
                    גיליון {d.issue} · {formatRange(d.rangeStart, d.rangeEnd)}
                  </div>
                  <div className="archive-title">{d.title}</div>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
