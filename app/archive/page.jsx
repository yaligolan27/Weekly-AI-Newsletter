import { getAllDigests, formatRange } from '../../lib/digests';

export const metadata = { title: 'ארכיון · רדאר AI' };

export default function ArchivePage() {
  const digests = getAllDigests();

  return (
    <main className="archive-page">
      <div className="grid-overlay" />
      <div className="archive-inner">
        <a className="archive-back" href="/">← לגיליון האחרון</a>
        <h1>הארכיון</h1>
        {digests.map((d) => (
          <a className="archive-card" href={`/digest/${d.slug}/`} key={d.slug}>
            <div className="archive-card-top">
              <span className="issue-badge">גיליון {d.issue}</span>
              <span>{formatRange(d.rangeStart, d.rangeEnd)}</span>
            </div>
            <h2>{d.title}</h2>
            <p>{d.intro}</p>
          </a>
        ))}
      </div>
    </main>
  );
}
