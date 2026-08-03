import { profile } from '../data/profile'

export default function Home() {
  const initial = profile.name.trim().charAt(0).toUpperCase()

  return (
    <section className="section home">
      <div className="home-header">
        <div className="avatar" aria-hidden="true">
          {initial}
        </div>
        <div>
          <h1>{profile.name}</h1>
          <p className="role">{profile.role}</p>
          <p className="affiliation">{profile.affiliation}</p>
        </div>
      </div>

      <p className="bio">{profile.bio}</p>

      <dl className="info-list">
        <div className="info-row">
          <dt>Email</dt>
          <dd>{profile.email}</dd>
        </div>
        <div className="info-row">
          <dt>Location</dt>
          <dd>{profile.location}</dd>
        </div>
      </dl>

      <div className="links">
        {profile.links.map((link) => (
          <a key={link.label} href={link.url} target="_blank" rel="noreferrer">
            {link.label}
          </a>
        ))}
      </div>
    </section>
  )
}
