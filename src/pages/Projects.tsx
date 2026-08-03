import { Link } from 'react-router-dom'
import { projects } from '../data/projects'

export default function Projects() {
  return (
    <section className="section">
      <h1>Projects</h1>
      <div className="card-grid">
        {projects.map((project) => (
          <Link key={project.slug} to={`/projects/${project.slug}`} className="card">
            <h3>{project.title}</h3>
            <p className="card-period">{project.period}</p>
            <p>{project.summary}</p>
            <div className="tags">
              {project.tags.map((tag) => (
                <span key={tag} className="tag">
                  {tag}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
