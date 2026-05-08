import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ingestUrl } from '../api/client'
import SuccessToast from './SuccessToast'

export default function IngestModal({ onClose }) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successData, setSuccessData] = useState(null)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!url.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await ingestUrl(url.trim())
      setSuccessData({
        title: res.title || 'Content',
        topic: res.topic_name || 'Saved'
      })
      setTimeout(() => {
        onClose()
        if (res && res.content_id) {
          navigate(`/content/${res.content_id}`)
        } else {
          window.location.reload()
        }
      }, 2500)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  if (successData) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <SuccessToast
          title={successData.title}
          topic={successData.topic}
          onClose={() => { setSuccessData(null); onClose() }}
        />
      </div>
    )
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', padding: '56px 48px 40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '20px',
            background: 'linear-gradient(135deg, #7C3AED, #A78BFA)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '20px',
            boxShadow: '0 12px 32px rgba(124,58,237,0.25)',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Save to Recall</h2>
          <p style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.9rem', lineHeight: 1.5 }}>
            Paste any YouTube or article link. AI will generate summaries, key insights, and quiz questions.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="input-group" style={{ marginBottom: loading ? '24px' : '32px' }}>
            <input
              className="input"
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              autoFocus
              required
              disabled={loading}
              style={{
                width: '100%',
                height: '56px',
                padding: '0 20px',
                borderRadius: '16px',
                fontSize: '0.95rem',
                background: 'var(--bg-main)',
                border: '2px solid var(--border)',
              }}
            />
          </div>

          {loading && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '16px',
              padding: '16px 20px', background: 'var(--accent-light)',
              borderRadius: '16px', marginBottom: '24px',
            }}>
              <span className="spinner" />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--accent)' }}>Processing...</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  Extracting transcript, generating AI cards
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="banner banner-error" style={{ marginBottom: '24px' }}>
              <span>✕</span>
              {error}
            </div>
          )}

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
              style={{ flex: 1, height: '52px', fontSize: '0.95rem' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !url.trim()}
              style={{ flex: 1, height: '52px', fontSize: '0.95rem' }}
            >
              {loading ? 'Adding...' : 'Add to Collection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
