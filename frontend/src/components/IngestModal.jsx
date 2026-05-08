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
      }, 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {successData && (
        <SuccessToast
          title={successData.title}
          topic={successData.topic}
          onClose={() => setSuccessData(null)}
        />
      )}
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <h2>Add to your library</h2>
          <p className="subtitle">Paste any YouTube or article link to generate AI review cards.</p>

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <input
                className="input"
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                autoFocus
                required
                style={{ width: '100%', height: '56px', padding: '0 20px', borderRadius: '14px', fontSize: '1rem' }}
              />
              <p style={{ marginTop: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Markdown notes and summaries will be generated automatically.
              </p>
            </div>

            {error && (
              <div className="banner banner-error mb-24">
                <span>✕</span>
                {error}
              </div>
            )}

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose} style={{ flex: 1, height: '52px' }}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading || !url.trim()} style={{ flex: 1, height: '52px' }}>
                {loading ? <span className="spinner" /> : 'Add to Collection'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}