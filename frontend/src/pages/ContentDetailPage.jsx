import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getContentDetail, getRelatedContent, formatDate } from '../api/client'

export default function ContentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [related, setRelated] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([
      getContentDetail(id),
      getRelatedContent(id)
    ])
      .then(([detailData, relatedData]) => {
        setData(detailData)
        setRelated(relatedData || [])
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div>
        <div className="skeleton mb-24" style={{ height: '40px', width: '60%' }} />
        <div className="skeleton mb-32" style={{ height: '20px', width: '40%' }} />
        <div className="skeleton mb-24" style={{ height: '100px' }} />
        <div className="skeleton" style={{ height: '150px' }} />
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
      </div>

      <div className="card summary-card mb-32">
        <div className="label mb-16">SUMMARY</div>
        <p style={{ lineHeight: '1.7', fontSize: '1rem' }}>
          {data.summary || 'No summary available.'}
        </p>
      </div>

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
      </div>
    </div>
  )
}