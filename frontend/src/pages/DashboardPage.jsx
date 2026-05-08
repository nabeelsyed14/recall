import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getHome, getEmail, isOnboardingComplete, setOnboardingComplete, formatDate } from '../api/client'
import OnboardingOverlay from '../components/OnboardingOverlay'

const Icons = {
  document: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="24" height="24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
  ),
  brain: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="24" height="24"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"></path><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"></path></svg>
  ),
  notes: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="24" height="24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
  ),
  streak: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="24" height="24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    getHome()
      .then(d => {
        setData(d)
        if (d.items_saved === 0 && !isOnboardingComplete()) {
          setShowOnboarding(true)
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const getGreeting = () => {
    const hour = new Date().getHours()
    const baseGreeting = hour >= 5 && hour < 12 ? 'Good Morning' : hour >= 12 && hour < 17 ? 'Good Afternoon' : 'Good Evening'
    const email = getEmail()
    const username = email ? email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1) : null
    return username ? `${baseGreeting}, ${username}` : baseGreeting
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  if (loading) {
    return (
      <div>
        <div className="label mb-24">{today.toUpperCase()}</div>
        <div className="skeleton" style={{ height: '48px', width: '400px', marginBottom: '40px' }} />
        <div className="stat-grid mb-64">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton-stat" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h1 className="greeting">Dashboard</h1>
        <div className="banner banner-error">
          <span>✕</span>
          {error}
        </div>
        <button className="btn btn-primary mt-32" onClick={() => window.location.reload()}>
          Retry Now
        </button>
      </div>
    )
  }

  return (
    <div>
      {showOnboarding && (
        <OnboardingOverlay onDismiss={() => { setShowOnboarding(false); setOnboardingComplete(true) }} />
      )}

      <div className="label" style={{ marginBottom: '12px' }}>{today.toUpperCase()}</div>
      <h1 className="greeting">{getGreeting()}</h1>

      {/* Stats Grid */}
      <div className="stat-grid">
        <div className="stat-card card">
          <div className="flex justify-between items-start">
            <div className="stat-label">Total Saved</div>
            <div style={{ color: 'var(--accent)' }}>{Icons.document}</div>
          </div>
          <div className="stat-value">{data?.items_saved ?? 0}</div>
        </div>
        <div className="stat-card card">
          <div className="flex justify-between items-start">
            <div className="stat-label">Accuracy</div>
            <div style={{ color: 'var(--accent)' }}>{Icons.brain}</div>
          </div>
          <div className="stat-value">
            {data?.accuracy_percentage !== null ? `${data.accuracy_percentage}%` : '0%'}
          </div>
        </div>
        <div className="stat-card card">
          <div className="flex justify-between items-start">
            <div className="stat-label">Active Notes</div>
            <div style={{ color: 'var(--accent)' }}>{Icons.notes}</div>
          </div>
          <div className="stat-value">{data?.recent_notes?.length ?? 0}</div>
        </div>
        <div className="stat-card card">
          <div className="flex justify-between items-start">
            <div className="stat-label">Streak</div>
            <div style={{ color: 'var(--accent)' }}>{Icons.streak}</div>
          </div>
          <div className="stat-value">
            {data?.streak_data?.filter(d => d).length ?? 0}
          </div>
        </div>
      </div>

      <div className="flex gap-64 mb-64">
        <div style={{ flex: 1 }}>
          <div className="label">SAVED THIS WEEK</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {data?.this_week?.length > 0 ? (
              data.this_week.map((item) => (
                <div
                  key={item.id}
                  className="card saved-this-week-card"
                  style={{ cursor: 'pointer', padding: '32px 40px' }}
                  onClick={() => navigate(`/content/${item.id}`)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      {/* Frontend fix 5: Content title as heading, topic name as badge */}
                      <div style={{ fontWeight: 800, marginBottom: '12px', fontSize: '1.2rem', color: 'var(--text-primary)' }}>{item.title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span className="topic-tag" style={{ background: 'var(--accent-light)', color: 'var(--accent)', fontWeight: 800 }}>
                          {item.genre || item.topic_name}
                        </span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                          {item.time_estimate}
                        </span>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                          {formatDate(item.date_saved)}
                        </span>
                      </div>
                    </div>
                    <div style={{ color: 'var(--accent)', fontSize: '1.5rem', fontWeight: 900 }}>→</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="card" style={{ padding: '64px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>No captures this week.</p>
              </div>
            )}
          </div>
        </div>

        <div style={{ width: '400px' }}>
          <div className="flex justify-between items-center mb-24">
            <div className="label">RECENT NOTES</div>
            <button className="btn btn-ghost" onClick={() => navigate('/notes')} style={{ padding: '4px 12px', fontSize: '0.85rem', fontWeight: 800 }}>
              VIEW ALL
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {data?.recent_notes?.length > 0 ? (
              data.recent_notes.map(note => (
                <div
                  key={note.id}
                  className="card"
                  style={{ cursor: 'pointer', padding: '32px' }}
                  onClick={() => navigate('/notes')}
                >
                  <h3 style={{ fontSize: '1.15rem', marginBottom: '12px', fontWeight: 800 }}>{note.title || 'Untitled'}</h3>
                  <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '16px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.6' }}>
                    {note.body}
                  </p>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                    {formatDate(note.created_at)}
                  </div>
                </div>
              ))
            ) : (
              <div className="card" style={{ padding: '64px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <p style={{ fontWeight: 700 }}>No notes yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}