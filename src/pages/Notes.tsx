import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Fuse from 'fuse.js'
import { notes, type Note } from '../lib/notes'

type CategoryFilter = 'all' | Note['category']
type SortMode = 'date-asc' | 'date-desc' | 'title-asc' | 'title-desc'

const categoryLabels: Record<CategoryFilter, string> = {
  all: 'All',
  course: 'Course',
  tech: 'Tech',
}

const sortOptions: { value: SortMode; label: string }[] = [
  { value: 'date-asc', label: 'Date ↑' },
  { value: 'date-desc', label: 'Date ↓' },
  { value: 'title-asc', label: 'Title A–Z' },
  { value: 'title-desc', label: 'Title Z–A' },
]

function compareNotes(a: Note, b: Note, sort: SortMode): number {
  switch (sort) {
    case 'date-asc':
      return (a.date || '').localeCompare(b.date || '') || a.title.localeCompare(b.title)
    case 'date-desc':
      return (b.date || '').localeCompare(a.date || '') || a.title.localeCompare(b.title)
    case 'title-asc':
      return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
    case 'title-desc':
      return b.title.localeCompare(a.title, undefined, { sensitivity: 'base' })
  }
}

function sortSections(entries: [string, Note[]][]): [string, Note[]][] {
  return entries.sort(([aName, aNotes], [bName, bNotes]) => {
    const aCat = aNotes[0]?.category ?? 'course'
    const bCat = bNotes[0]?.category ?? 'course'
    if (aCat !== bCat) return aCat === 'course' ? -1 : 1
    return aName.localeCompare(bName)
  })
}

export default function Notes() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [sort, setSort] = useState<SortMode>('date-asc')
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())

  const fuse = useMemo(
    () => new Fuse(notes, { keys: ['title', 'tags', 'group'], threshold: 0.35 }),
    [],
  )

  const filtered = useMemo(() => {
    const searched = query.trim() ? fuse.search(query).map((result) => result.item) : notes
    return category === 'all' ? searched : searched.filter((note) => note.category === category)
  }, [query, category, fuse])

  const sections = useMemo(() => {
    const map = new Map<string, Note[]>()
    for (const note of filtered) {
      const key = note.group || 'Other'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(note)
    }
    for (const sectionNotes of map.values()) {
      sectionNotes.sort((a, b) => compareNotes(a, b, sort))
    }
    return sortSections(Array.from(map.entries()))
  }, [filtered, sort])

  const toggleSection = (group: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(group)) next.delete(group)
      else next.add(group)
      return next
    })
  }
  return (
    <section className="section">
      <div className="notes-heading">
        <h1>Notes</h1>
        <p className="notes-count">
          {filtered.length} {filtered.length === 1 ? 'note' : 'notes'}
        </p>
      </div>

      <div className="notes-toolbar">
        <input
          type="text"
          className="search-input"
          placeholder="Search by title, tag, or topic..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="notes-filters">
          <div className="category-seg" role="tablist" aria-label="Note category">
            {(Object.keys(categoryLabels) as CategoryFilter[]).map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={category === key}
                className={category === key ? 'category-seg-item active' : 'category-seg-item'}
                onClick={() => setCategory(key)}
              >
                {categoryLabels[key]}
              </button>
            ))}
          </div>
          <label className="notes-sort">
            <span className="notes-sort-label">Sort</span>
            <select
              className="notes-sort-select"
              value={sort}
              onChange={(event) => setSort(event.target.value as SortMode)}
              aria-label="Sort notes within each topic"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="empty-state">No notes match your search.</p>
      ) : (
        <div className="note-sections">
          {sections.map(([sectionGroup, sectionNotes]) => {
            const sectionCategory = sectionNotes[0]?.category
            const isCollapsed = collapsed.has(sectionGroup)
            const panelId = `note-section-${sectionGroup.replace(/\s+/g, '-').toLowerCase()}`
            return (
              <section
                key={sectionGroup}
                className={isCollapsed ? 'note-section is-collapsed' : 'note-section'}
              >
                <button
                  type="button"
                  className="note-section-header"
                  aria-expanded={!isCollapsed}
                  aria-controls={panelId}
                  onClick={() => toggleSection(sectionGroup)}
                >
                  <div className="note-section-heading">
                    <span className="note-section-chevron" aria-hidden="true" />
                    <h2 className="note-section-title">{sectionGroup}</h2>
                    {category === 'all' && sectionCategory && (
                      <span className="note-section-kind">{categoryLabels[sectionCategory]}</span>
                    )}
                  </div>
                  <span className="note-section-count">{sectionNotes.length}</span>
                </button>
                {!isCollapsed && (
                  <div className="note-list" id={panelId}>
                    {sectionNotes.map((note) => (
                      <Link key={note.slug} to={`/notes/${note.slug}`} className="note-item">
                        <div className="note-item-main">
                          <h3 className="note-title">{note.title}</h3>
                          {note.date && <time className="note-date">{note.date}</time>}
                        </div>
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
          })}        </div>
      )}
    </section>
  )
}
