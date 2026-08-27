import { Link, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeRaw from 'rehype-raw'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { notes } from '../lib/notes'
import { formatReadingTime, formatWordCount } from '../lib/noteStats'

const categoryLabels = { course: 'Course', tech: 'Tech' } as const

/** Resolve note-relative image paths to /notes-images/ URLs for the site. */
function resolveNoteImageSrc(src?: string) {
  if (!src) return src
  const relative = src.match(/^(?:\.\.\/|\.\/)?images\/(.+)$/)
  if (relative) {
    const encoded = relative[1]
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/')
    return `/notes-images/${encoded}`
  }
  if (src.startsWith('/notes-images/')) return src
  const marktext = src.match(/marktext[/\\]+images[/\\]+([^/\\?#]+)/i)
  if (marktext) return `/notes-images/${encodeURIComponent(marktext[1])}`
  return src
}

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
      <p className="note-reading-stats">
        {formatWordCount(note.wordCount)} words
        {note.imageCount > 0 && ` · ${note.imageCount} ${note.imageCount === 1 ? 'figure' : 'figures'}`}
        {' · '}
        {formatReadingTime(note.readingMinutes)}
      </p>
      <div className="note-detail-meta">
        {note.date && <time className="note-date">{note.date}</time>}
        <span className="category-badge">{categoryLabels[note.category]}</span>
        {note.group && <span className="group-badge">{note.group}</span>}
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
      <div className="note-content">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeRaw, rehypeKatex]}
          components={{
            img: ({ node: _node, src, alt, width, height, ...props }) => (
              <img
                src={resolveNoteImageSrc(src)}
                alt={alt ?? ''}
                width={width}
                height={height}
                {...props}
              />
            ),
          }}
        >
          {note.content}
        </ReactMarkdown>
      </div>
    </section>
  )
}
