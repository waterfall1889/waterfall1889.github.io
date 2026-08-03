import { research } from '../data/research'

export default function Research() {
  return (
    <section className="section">
      <h1>Research</h1>
      <ol className="timeline">
        {research.map((item) => (
          <li key={item.id} className="timeline-item">
            <div className="timeline-period">{item.period}</div>
            <div className="timeline-body">
              <h3>{item.title}</h3>
              <p className="timeline-org">{item.org}</p>
              <p>{item.description}</p>
              {item.tags && (
                <div className="tags">
                  {item.tags.map((tag) => (
                    <span key={tag} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
