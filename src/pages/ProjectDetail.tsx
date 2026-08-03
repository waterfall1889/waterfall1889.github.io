import { Link, useParams } from 'react-router-dom'
import { projects } from '../data/projects'

export default function ProjectDetail() {
  const { slug } = useParams<{ slug: string }>()
  const project = projects.find((p) => p.slug === slug)

  if (!project) {
    return (
      <section className="section">
        <p>Project not found.</p>
        <Link to="/projects">Back to projects</Link>
      </section>
    )
  }

  return (
    <section className="section">
      <Link to="/projects" className="back-link">
        ← Back to projects
      </Link>
      <h1>{project.title}</h1>
      <p className="card-period">{project.period}</p>
      <div className="tags">
        {project.tags.map((tag) => (
          <span key={tag} className="tag">
            {tag}
          </span>
        ))}
      </div>
      <p className="detail-description">{project.description}</p>
      <div className="links">
        {project.links
          .filter((link) => link.url)
          .map((link) => (
            <a key={link.label} href={link.url} target="_blank" rel="noreferrer">
              {link.label}
            </a>
          ))}
      </div>
    </section>
  )
}
