import { formatDate, formatRange } from '../../lib/digests';

function Source({ source, url }) {
  if (!url) return <span className="src">{source}</span>;
  return (
    <a className="src" href={url} target="_blank" rel="noopener noreferrer">
      {source} <span className="arrow">↗</span>
    </a>
  );
}

export default function Digest({ digest }) {
  return (
    <main>
      <div className="wrap">
        <div className="issue-head">
          <div className="eyebrow">
            <span>גיליון {digest.issue}</span>
            <span className="dot" />
            <span>{formatRange(digest.rangeStart, digest.rangeEnd)}</span>
            <span className="dot" />
            <span>נשלח {formatDate(digest.date)}</span>
          </div>
          <h1>{digest.title}</h1>
          <p className="intro">{digest.intro}</p>
        </div>

        {digest.spotlight?.length > 0 && (
          <section className="section">
            <h2 className="section-heading">שלושת הסיפורים של השבוע</h2>
            {digest.spotlight.map((story) => (
              <article className="spotlight" key={story.title}>
                {story.tag && <span className="tag">{story.tag}</span>}
                <h2>{story.title}</h2>
                <p>{story.summary}</p>
                {story.whyItMatters && (
                  <p className="why">
                    <b>למה זה חשוב: </b>
                    {story.whyItMatters}
                  </p>
                )}
                <Source source={story.source} url={story.url} />
              </article>
            ))}
          </section>
        )}

        {digest.sections?.map((section) => (
          <section className="section" key={section.heading}>
            <h2 className="section-heading">{section.heading}</h2>
            {section.items.map((item) => (
              <article className="item" key={item.title}>
                <h3>{item.title}</h3>
                {item.summary && <p>{item.summary}</p>}
                {item.whyItMatters && (
                  <p className="why">
                    <b>למה זה חשוב: </b>
                    {item.whyItMatters}
                  </p>
                )}
                <Source source={item.source} url={item.url} />
              </article>
            ))}
          </section>
        ))}

        {digest.quickHits?.length > 0 && (
          <section className="section">
            <h2 className="section-heading">ועוד, בקצרה</h2>
            <ul className="hits">
              {digest.quickHits.map((hit) => (
                <li key={hit.text}>
                  <span className="bullet">·</span>
                  <span>
                    {hit.text}{' '}
                    {hit.url && (
                      <a href={hit.url} target="_blank" rel="noopener noreferrer">
                        ({hit.source} ↗)
                      </a>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="foot">
          {digest.note && <div className="note">{digest.note}</div>}
          <p>מקורות הגיליון: {digest.sources?.join(' · ')}</p>
          <p>נאסף אוטומטית מהניוזלטרים בתיבה ומחיפוש רשת. כל קישור מוביל למקור המקורי.</p>
        </footer>
      </div>
    </main>
  );
}
