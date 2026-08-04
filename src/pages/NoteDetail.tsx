import { Link, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { notes } from '../lib/notes'

const categoryLabels = { course: 'Course', tech: 'Tech' } as const

export default function NoteDetail() {
  const { slug } = useParams<{ slug: string }>()
  const note = notes.find((n) => n.slug === slug)

  if (!note) {
    return (
      <section className="section">
        <p>Note not found.</p>
        <Link to="/notes">Back to notes</Link>
      </section>
    )
  }

  return (
    <section className="section">
      <Link to="/notes" className="back-link">
        ← Back to notes
      </Link>
      <h1>{note.title}</h1>
      {note.date && <p className="card-period">{note.date}</p>}
      <span className="category-badge">{categoryLabels[note.category]}</span>
      {note.tags.length > 0 && (
        <div className="tags">
          {note.tags.map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
        </div>
      )}
      <div className="note-content">
        <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
          {note.content}
        </ReactMarkdown>
      </div>
    </section>
  )
}
