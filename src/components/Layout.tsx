import { NavLink } from 'react-router-dom'
import { profile } from '../data/profile'
import type { ReactNode } from 'react'

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/research', label: 'Research' },
  { to: '/projects', label: 'Projects' },
  { to: '/notes', label: 'Notes' },
]

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="layout">
      <header className="site-header">
        <div className="container header-inner">
          <span className="brand">{profile.name}</span>
          <nav className="nav">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="container main-content">{children}</main>
      <footer className="site-footer">
        <div className="container">
          <span>&copy; {new Date().getFullYear()} {profile.name}</span>
        </div>
      </footer>
    </div>
  )
}
