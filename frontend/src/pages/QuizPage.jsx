import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getLibrary } from '../api/client'
import QuizSession from '../components/QuizSession'

export default function QuizPage() {
  const [clusters, setClusters] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [searchParams] = useSearchParams()
  const activeContentId = searchParams.get('contentId')

  const navigate = useNavigate()

  useEffect(() => {
    if (!activeContentId) {
      setLoading(true)
      getLibrary()
        .then(setClusters)
        .catch(err => setError(err.message))
        .finally(() => setLoading(false))
    }
  }, [activeContentId])

  if (activeContentId) {
    return <QuizSession contentId={activeContentId} onComplete={() => navigate('/quiz')} />
  }

  if (loading) {
    return (
      <div>
        <h1 className="greeting">Quiz Hub</h1>
        <div className="skeleton" style={{ height: '400px', borderRadius: '24px' }} />
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h1 className="greeting">Quiz Hub</h1>
        <div className="banner banner-error"><span>✕</span>{error}</div>
      </div>
    )
  }

  const allContentIds = clusters.flatMap(c => c.items).map(i => i.id)

  const handleQuizAll = () => {
    if (allContentIds.length === 0) return
    const randomId = allContentIds[Math.floor(Math.random() * allContentIds.length)]
    navigate(`/quiz?contentId=${randomId}`)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-48">
        <h1 className="greeting" style={{ marginBottom: 0 }}>Quiz Hub</h1>
        <button
          className="btn btn-primary"
          onClick={handleQuizAll}
          disabled={allContentIds.length === 0}
        >
          Daily Shuffle Quiz
        </button>
      </div>

      <p className="subtitle mb-48">
        Strengthen your recall by testing your knowledge on your collected content.
      </p>

      {clusters.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-secondary)' }}>
          <p style={{ fontWeight: 800, fontSize: '1.2rem' }}>No content available to quiz yet.</p>
        </div>
      ) : (
        clusters.map((topic) => (
          <div key={topic.name} className="mb-64">
            <h2 className="label" style={{ marginBottom: '24px', color: 'var(--text-secondary)' }}>{topic.name}</h2>
            <div className="quiz-hub-grid">
              {topic.items.map(item => (
                <div
                  key={item.id}
                  className="card quiz-card card-animated"
                  style={{ cursor: 'pointer', padding: '32px' }}
                  onClick={() => navigate(`/quiz?contentId=${item.id}`)}
                >
                  <div>
                    <div className="flex justify-between items-start mb-24">
                      <span className="quiz-card-badge">
                        {item.card_count} CARDS
                      </span>
                    </div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '32px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.5' }}>
                      {item.title}
                    </h3>
                  </div>
                  <button className="btn btn-secondary btn-full" style={{ padding: '14px', fontWeight: 800 }}>
                    Quiz Me
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