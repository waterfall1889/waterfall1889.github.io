import { notes } from '../data/notes'

export default function Notes() {
  return (
    <section className="section">
      <h1>Course Notes</h1>
      <div className="note-list">
        {notes.map((note) => (
          <div key={note.id} className="note-item">
            <div className="note-header">
              <h3>{note.course}</h3>
              <span className="note-term">{note.term}</span>
            </div>
            <p>{note.description}</p>
            <div className="links">
              {note.links
                .filter((link) => link.url)
                .map((link) => (
                  <a key={link.label} href={link.url} target="_blank" rel="noreferrer">
                    {link.label}
                  </a>
                ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
