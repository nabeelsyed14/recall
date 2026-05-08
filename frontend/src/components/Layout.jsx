import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { clearToken } from '../api/client'
import IngestModal from './IngestModal'
import KeyboardShortcuts from './KeyboardShortcuts'

const Icons = {
  dashboard: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>,
  library: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>,
  notes: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
  highlights: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>,
  quiz: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>,
  logout: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
}

export default function Layout() {
  const [modalOpen, setModalOpen] = useState(false)
  const navigate = useNavigate()

  function handleLogout() {
    clearToken()
    navigate('/login')
  }

  const navClass = ({ isActive }) =>
    `nav-link ${isActive ? 'active' : ''}`

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div style={{ flex: 1 }}>
          <div className="sidebar-brand">Recall</div>

          <button className="btn btn-add-content" onClick={() => setModalOpen(true)}>
            + Add Content
          </button>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <NavLink to="/" className={navClass} end>
              <span className="nav-icon">{Icons.dashboard}</span>
              Dashboard
            </NavLink>
            <NavLink to="/library" className={navClass}>
              <span className="nav-icon">{Icons.library}</span>
              Library
            </NavLink>
            <NavLink to="/notes" className={navClass}>
              <span className="nav-icon">{Icons.notes}</span>
              Notes
            </NavLink>
            <NavLink to="/highlights" className={navClass}>
              <span className="nav-icon">{Icons.highlights}</span>
              Highlights
            </NavLink>
            <NavLink to="/quiz" className={navClass}>
              <span className="nav-icon">{Icons.quiz}</span>
              Daily Quiz
            </NavLink>
          </nav>
        </div>

        <button 
          className="btn btn-ghost" 
          onClick={handleLogout}
          style={{ 
            color: 'rgba(255, 255, 255, 0.6)', 
            justifyContent: 'flex-start', 
            padding: '12px 16px',
            background: 'none',
            border: 'none',
            boxShadow: 'none',
            fontWeight: 700
          }}
        >
          <span className="nav-icon">{Icons.logout}</span>
          Sign Out
        </button>
      </aside>

      <main className="main-content">
        <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          <Outlet />
        </div>
      </main>

      {modalOpen && <IngestModal onClose={() => setModalOpen(false)} />}
      <KeyboardShortcuts />
    </div>
  )
}