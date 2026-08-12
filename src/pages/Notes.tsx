import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Fuse from 'fuse.js'
import { notes, type Note } from '../lib/notes'

type CategoryFilter = 'all' | Note['category']

const categoryLabels: Record<CategoryFilter, string> = {
  all: 'All',
  course: 'Course',
  tech: 'Tech',
}

export default function Notes() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('all')

  const fuse = useMemo(
    () => new Fuse(notes, { keys: ['title', 'tags'], threshold: 0.35 }),
    [],
  )

  const filtered = useMemo(() => {
    const base = query.trim() ? fuse.search(query).map((result) => result.item) : notes
    return category === 'all' ? base : base.filter((note) => note.category === category)
  }, [query, category, fuse])

  return (
    <section className="section">
      <h1>Notes</h1>

      <div className="notes-toolbar">
        <input
          type="text"
          className="search-input"
          placeholder="Search notes by title or tag..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="category-tabs">
          {(Object.keys(categoryLabels) as CategoryFilter[]).map((key) => (
            <button
              key={key}
              type="button"
              className={category === key ? 'category-tab active' : 'category-tab'}
              onClick={() => setCategory(key)}
            >
              {categoryLabels[key]}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="empty-state">No notes match your search.</p>
      ) : (
        <div className="note-list">
          {filtered.map((note) => (
            <Link key={note.slug} to={`/notes/${note.slug}`} className="note-item">
              <div className="note-meta">
                <span className="category-badge">{categoryLabels[note.category]}</span>
                {note.date && <time className="note-date">{note.date}</time>}
              </div>
              <h3 className="note-title">{note.title}</h3>
              {note.tags.length > 0 && (
                <div className="tags">
                  {note.tags.map((tag) => (
                    <span key={tag} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
