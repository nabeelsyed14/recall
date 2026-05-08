import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllHighlights, deleteHighlight, formatDate } from '../api/client'

export default function HighlightsPage() {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const load = () => {
    setLoading(true)
    getAllHighlights()
      .then(setGroups)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (contentId, highlightId) => {
    try {
      await deleteHighlight(contentId, highlightId)
      load()
    } catch (err) {
      alert(err.message)
    }
  }

  if (loading) {
    return (
      <div>
        <h1 className="greeting">Highlights</h1>
        <div className="skeleton-card" />
        <div className="skeleton-card" />
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h1 className="greeting">Highlights</h1>
        <div className="banner banner-error"><span>✕</span>{error}</div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="greeting">Highlights</h1>
      <p className="subtitle" style={{ marginTop: '-32px', marginBottom: '40px' }}>
        Text you've saved from your content.
      </p>

      {groups.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '64px', color: 'var(--text-secondary)' }}>
          <p style={{ fontWeight: 800, fontSize: '1.1rem' }}>No highlights yet.</p>
          <p style={{ marginTop: '8px', fontWeight: 600 }}>Select text on any content page to save highlights.</p>
        </div>
      ) : (
        groups.map(group => (
          <div key={group.content_id} className="mb-48">
            <h2
              className="label"
              onClick={() => navigate(`/content/${group.content_id}`)}
              style={{ cursor: 'pointer', marginBottom: '20px' }}
            >
              {group.content_title} ↗
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {group.highlights.map(h => (
                <div key={h.id} className="card" style={{ padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <blockquote style={{
                      borderLeft: '4px solid var(--accent)',
                      paddingLeft: '20px',
                      margin: 0,
                      fontSize: '1rem',
                      lineHeight: '1.7',
                      color: 'var(--text-primary)',
                      fontStyle: 'italic',
                    }}>
                      {h.text}
                    </blockquote>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '12px', fontWeight: 700 }}>
                      {formatDate(h.created_at)} · {h.source}
                    </div>
                  </div>
                  <button
                    className="btn btn-ghost"
                    onClick={() => handleDelete(group.content_id, h.id)}
                    style={{ color: 'var(--red)', padding: '8px', marginLeft: '16px', flexShrink: 0 }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
