import { HashRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Research from './pages/Research'
import Projects from './pages/Projects'
import ProjectDetail from './pages/ProjectDetail'
import Notes from './pages/Notes'
import NoteDetail from './pages/NoteDetail'

export default function App() {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/research" element={<Research />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:slug" element={<ProjectDetail />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/notes/:slug" element={<NoteDetail />} />
        </Routes>
      </Layout>
    </HashRouter>
  )
}
