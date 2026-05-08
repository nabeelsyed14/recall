import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getContentDetail, getRelatedContent, getContentHighlights, deleteHighlight, formatDate } from '../api/client'
import TextHighlighter from '../components/TextHighlighter'
import ChatPanel from '../components/ChatPanel'

export default function ContentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [related, setRelated] = useState([])
  const [highlights, setHighlights] = useState([])
  const [showChat, setShowChat] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = () => {
    Promise.all([
      getContentDetail(id),
      getRelatedContent(id),
      getContentHighlights(id)
    ])
      .then(([detailData, relatedData, highlightsData]) => {
        setData(detailData)
        setRelated(relatedData || [])
        setHighlights(highlightsData || [])
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  const handleDeleteHighlight = async (highlightId) => {
    try {
      await deleteHighlight(Number(id), highlightId)
      setHighlights(prev => prev.filter(h => h.id !== highlightId))
    } catch (err) {
      alert(err.message)
    }
  }

  if (loading) {
    return (
      <div>
        <div className="skeleton-detail-line" style={{ height: '40px', width: '60%', marginBottom: '24px' }} />
        <div className="skeleton-detail-line" style={{ width: '40%', marginBottom: '32px' }} />
        <div className="skeleton-detail-block" />
        <div className="skeleton-detail-block" style={{ height: '150px' }} />
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h1 className="mb-24">Content Not Found</h1>
        <div className="banner banner-error mb-24">
          <span>✕</span>
          {error}
        </div>
        <button className="btn btn-secondary" onClick={() => navigate('/library')}>
          Back to Library
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-12 mb-24">
        <button className="btn btn-ghost" onClick={() => navigate('/library')} style={{ padding: '8px', marginLeft: '-8px' }}>
          ← Back
        </button>
      </div>

      <h1 className="mb-16" style={{ fontSize: '1.625rem' }}>{data.title}</h1>

      <div className="mb-32">
        <a
          href={data.source_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--accent)', fontWeight: '600', textDecoration: 'none' }}
        >
          View Original Source ↗
        </a>
        <span style={{ color: 'var(--text-secondary)', marginLeft: '16px', fontSize: '0.85rem' }}>
          {formatDate(data.date_saved)}
        </span>
        {data.time_estimate && (
          <span style={{ color: 'var(--text-secondary)', marginLeft: '16px', fontSize: '0.85rem', fontWeight: 700 }}>
            {data.time_estimate}
          </span>
        )}
      </div>

      <TextHighlighter contentId={data.id} source="summary">
        <div className="card summary-card mb-32">
          <div className="label mb-16">SUMMARY</div>
          <p style={{ lineHeight: '1.7', fontSize: '1rem' }}>
            {data.summary || 'No summary available.'}
          </p>
        </div>
      </TextHighlighter>

      <div className="card mb-32">
        <div className="label mb-16">KEY INSIGHTS</div>
        <ol className="insights-list">
          {data.key_insights && data.key_insights.length > 0 ? (
            data.key_insights.map((insight, idx) => (
              <li key={idx}>{insight}</li>
            ))
          ) : (
            <li style={{ color: 'var(--text-secondary)' }}>No key insights generated for this content.</li>
          )}
        </ol>
      </div>

      {/* Highlights */}
      {highlights.length > 0 && (
        <div className="card mb-32">
          <div className="label mb-16">YOUR HIGHLIGHTS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {highlights.map(h => (
              <div key={h.id} style={{
                borderLeft: '4px solid var(--accent)',
                paddingLeft: '20px',
                background: 'var(--accent-light)',
                borderRadius: '0 16px 16px 0',
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}>
                <p style={{ fontStyle: 'italic', margin: 0, lineHeight: '1.6', fontSize: '0.95rem' }}>
                  {h.text}
                </p>
                <button
                  className="btn btn-ghost"
                  onClick={() => handleDeleteHighlight(h.id)}
                  style={{ color: 'var(--red)', padding: '4px 8px', marginLeft: '12px', flexShrink: 0 }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Related Content */}
      {related.length > 0 && (
        <div className="related-section mb-32">
          <div className="label">RELATED IN YOUR LIBRARY</div>
          {related.map(item => (
            <div key={item.id} className="related-card">
              <div className="related-title">{item.title}</div>
              <button className="btn btn-secondary" onClick={() => navigate(`/content/${item.id}`)} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                View
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-16 mt-32">
        <button
          className="btn btn-primary"
          onClick={() => navigate(`/quiz?contentId=${data.id}`)}
          disabled={data.card_count === 0}
        >
          {data.card_count > 0 ? 'Quiz Me' : 'No Quiz Available'}
        </button>
        <button
          className="btn btn-mint"
          onClick={() => navigate(`/notes?new=true&title=${encodeURIComponent(`Notes on: ${data.title}`)}`)}
        >
          Add Note
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => window.open(`/api/content/${data.id}/export`, '_blank')}
        >
          Export PDF
        </button>
        {!showChat && (
          <button className="btn btn-secondary" onClick={() => setShowChat(true)}>
            💬 Ask AI
          </button>
        )}
      </div>

      {showChat && (
        <div className="mt-32">
          <ChatPanel contentId={data.id} onClose={() => setShowChat(false)} />
        </div>
      )}
    </div>
  )
}