import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const shortcuts = [
  { key: 'Q', description: 'Quiz current content' },
  { key: 'N', description: 'New note' },
  { key: 'S', description: 'Focus search bar' },
  { key: 'Esc', description: 'Close modal / cancel' },
  { key: '?', description: 'Show this help' },
]

export default function KeyboardShortcuts() {
  const [showHelp, setShowHelp] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    function handleKeyDown(e) {
      const tag = (e.target.tagName || '').toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return

      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        setShowHelp(prev => !prev)
        return
      }

      if (e.key === 'Escape' && showHelp) {
        setShowHelp(false)
        return
      }

      if (showHelp) return

      if (e.key === 'q' || e.key === 'Q') {
        e.preventDefault()
        const match = location.pathname.match(/^\/content\/(\d+)/)
        if (match) {
          navigate(`/quiz?contentId=${match[1]}`)
        } else {
          navigate('/quiz')
        }
      }

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        navigate('/notes?new=true')
      }

      if (e.key === 's' || e.key === 'S') {
        e.preventDefault()
        const searchInput = document.querySelector('input[placeholder*="Search your library"]')
        if (searchInput) searchInput.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigate, location, showHelp])

  return (
    <>
      <button
        onClick={() => setShowHelp(true)}
        title="Keyboard shortcuts (?)"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--card-shadow)',
          cursor: 'pointer',
          fontWeight: 800,
          fontSize: '1rem',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 90,
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.color = 'var(--accent)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
      >
        ?
      </button>

      {showHelp && (
        <div className="modal-overlay" onClick={() => setShowHelp(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="flex justify-between items-center mb-24">
              <h2 style={{ margin: 0 }}>Keyboard Shortcuts</h2>
              <button className="btn btn-ghost" onClick={() => setShowHelp(false)} style={{ padding: '4px 8px' }}>
                ✕
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {shortcuts.map(s => (
                <div key={s.key} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'var(--bg-main)',
                  borderRadius: '12px',
                }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.description}</span>
                  <kbd style={{
                    padding: '4px 12px',
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    color: 'var(--accent)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  }}>
                    {s.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
