import { Link, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeRaw from 'rehype-raw'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { notes } from '../lib/notes'

const categoryLabels = { course: 'Course', tech: 'Tech' } as const

/** MarkText uses relative `images/...`; the site serves the same files from `/notes-images/`. */
function resolveNoteImageSrc(src?: string) {
  if (!src) return src
  const relative = src.match(/^(?:\.\/)?images\/(.+)$/)
  if (relative) return `/notes-images/${relative[1]}`
  if (src.startsWith('/notes-images/')) return src
  const marktext = src.match(/marktext[/\\]+images[/\\]+([^/\\?#]+)/i)
  if (marktext) return `/notes-images/${marktext[1]}`
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
