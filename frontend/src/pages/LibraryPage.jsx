import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getLibrary, getTopicStats, deleteContent, formatDate } from '../api/client'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import SearchBar from '../components/SearchBar'

const TrashIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
)

const DeleteConfirmModal = ({ title, onConfirm, onCancel }) => (
  <div className="modal-overlay" onClick={onCancel}>
    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', textAlign: 'center' }}>
      <div style={{ color: 'var(--red)', marginBottom: '20px' }}>
        <TrashIcon />
      </div>
      <h2>Remove content?</h2>
      <p className="subtitle">"{title}" will be permanently deleted from your collection.</p>
      <div className="modal-actions" style={{ marginTop: '32px' }}>
        <button className="btn btn-secondary" onClick={onCancel} style={{ flex: 1 }}>Cancel</button>
        <button className="btn btn-primary" onClick={onConfirm} style={{ background: 'var(--red)', flex: 1 }}>Delete</button>
      </div>
    </div>
  </div>
)

export default function LibraryPage() {
  const [clusters, setClusters] = useState([])
  const [topicStats, setTopicStats] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleteItem, setDeleteItem] = useState(null)
  const navigate = useNavigate()

  const loadData = () => {
    setLoading(true)
    Promise.all([getLibrary(), getTopicStats()])
      .then(([libData, statsData]) => {
        setClusters(libData)
        setTopicStats(statsData)
        setError(null)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleDelete = async () => {
    if (!deleteItem) return
    try {
      await deleteContent(deleteItem.id)
      setClusters([])
      setTopicStats([])
      setDeleteItem(null)
      loadData()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleQuiz = (e, id) => {
    e.stopPropagation()
    navigate(`/quiz?contentId=${id}`)
  }

  const thisWeekItems = useMemo(() => {
    const allItems = clusters.flatMap(c => c.items)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return allItems
      .filter(item => new Date(item.date_saved) >= weekAgo)
      .sort((a, b) => new Date(b.date_saved) - new Date(a.date_saved))
  }, [clusters])

  const totalTopics = useMemo(() => {
    return topicStats.reduce((acc, curr) => acc + curr.count, 0)
  }, [topicStats])

  const COLORS = ['#7C3AED', '#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#8B5CF6']

  if (loading && clusters.length === 0) {
    return (
      <div>
        <div className="flex justify-between items-center mb-48">
          <h1 className="greeting" style={{ marginBottom: 0 }}>Library</h1>
          <button className="btn btn-ghost" disabled>Syncing...</button>
        </div>
        <div className="skeleton-detail-block" style={{ height: '300px', marginBottom: '48px' }} />
        {[1, 2].map(i => (
          <div key={i} style={{ marginBottom: '48px' }}>
            <div className="skeleton-detail-line" style={{ width: '30%', marginBottom: '24px' }} />
            <div className="skeleton-card" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h1 className="greeting">Library</h1>
        <div className="banner banner-error"><span>✕</span>{error}</div>
        <button className="btn btn-primary mt-32" onClick={loadData}>Retry Sync</button>
      </div>
    )
  }

  return (
    <div>
      {deleteItem && (
        <DeleteConfirmModal
          title={deleteItem.title}
          onConfirm={handleDelete}
          onCancel={() => setDeleteItem(null)}
        />
      )}

      <div className="flex justify-between items-center mb-24">
        <h1 className="greeting" style={{ marginBottom: 0 }}>Library</h1>
        <button className="btn btn-secondary" onClick={loadData}>
          ↻ Sync Collection
        </button>
      </div>

      <SearchBar />

      {topicStats.length > 0 && (
        <div className="mb-64 card" style={{ 
          padding: '48px', 
          boxShadow: '0 32px 64px rgba(0,0,0,0.12), inset 0 0 20px rgba(124, 58, 237, 0.03)',
          position: 'relative'
        }}>
          <div className="label" style={{ marginBottom: '40px' }}>KNOWLEDGE GRAPH</div>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ height: '400px', width: '100%', position: 'relative', marginBottom: '48px' }}>
              {/* Center Text */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                zIndex: 1
              }}>
                <div style={{ fontSize: '64px', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>
                  {totalTopics}
                </div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '4px' }}>
                  Topics Explored
                </div>
              </div>

              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={topicStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={130}
                    outerRadius={175}
                    paddingAngle={6}
                    dataKey="count"
                    nameKey="name"
                    stroke="none"
                    animationDuration={1500}
                    animationBegin={200}
                  >
                    {topicStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 12px 32px rgba(0,0,0,0.15)' }}
                    itemStyle={{ fontWeight: 700 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Custom Legend */}
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              justifyContent: 'center', 
              gap: '12px',
              width: '100%'
            }}>
              {topicStats.map((stat, idx) => {
                const percentage = ((stat.count / totalTopics) * 100).toFixed(0);
                return (
                  <div key={stat.name} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 16px',
                    background: 'var(--bg-main)',
                    borderRadius: '50px',
                    border: '1px solid var(--border)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                  }}>
                    <div style={{ 
                      width: '10px', 
                      height: '10px', 
                      borderRadius: '50%', 
                      background: COLORS[idx % COLORS.length] 
                    }} />
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {stat.name}
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--accent)' }}>
                      {percentage}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {thisWeekItems.length > 0 && (
        <div className="mb-64">
          <div className="label">SAVED THIS WEEK</div>
          <div style={{
            display: 'flex',
            gap: '24px',
            overflowX: 'auto',
            paddingBottom: '24px',
            WebkitOverflowScrolling: 'touch'
          }}>
            {thisWeekItems.map(item => (
              <div
                key={item.id}
                className="card saved-this-week-card"
                onClick={() => navigate(`/content/${item.id}`)}
                style={{
                  minWidth: '320px',
                  maxWidth: '320px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  height: '180px'
                }}
              >
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.5' }}>
                  {item.title}
                </h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="topic-tag">
                      {item.genre || item.topic_name}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      {item.time_estimate}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                    {formatDate(item.date_saved)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="label">FULL COLLECTION</div>
      {clusters.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '80px 0' }}>
          <p style={{ fontSize: '1.2rem', fontWeight: 800 }}>Your library is currently empty.</p>
          <p style={{ marginTop: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Start by adding a link above.</p>
        </div>
      ) : (
        clusters.map((topic) => (
          <div key={topic.name} className="topic-section mb-64">
            <h2 className="label" style={{ marginBottom: '24px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {topic.name}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {topic.items.map(item => (
                <div
                  key={item.id}
                  className="library-item-card"
                  onClick={() => navigate(`/content/${item.id}`)}
                  style={{ padding: '32px' }}
                >
                  <div style={{ flex: 1, paddingRight: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <div className="item-title" style={{ marginBottom: 0 }}>{item.title}</div>
                      {item.accuracy !== null && item.accuracy !== undefined && (
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: '50px',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          background: item.accuracy >= 80 ? 'var(--green-light)' : item.accuracy >= 50 ? '#FEF3C7' : 'var(--red-light)',
                          color: item.accuracy >= 80 ? 'var(--green)' : item.accuracy >= 50 ? 'var(--amber)' : 'var(--red)',
                          whiteSpace: 'nowrap',
                        }}>
                          {item.accuracy}%
                        </span>
                      )}
                    </div>
                    <div className="item-meta">
                      {item.time_estimate} · {formatDate(item.date_saved)} · {item.source_type}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <button className="btn btn-primary" onClick={(e) => handleQuiz(e, item.id)} style={{ padding: '12px 24px', fontSize: '0.9rem' }}>Quiz</button>
                    <button className="btn btn-secondary" onClick={(e) => { e.stopPropagation(); navigate(`/content/${item.id}`) }} style={{ padding: '12px 24px', fontSize: '0.9rem', color: 'var(--accent)', borderColor: 'var(--accent)' }}>View</button>
                    <button 
                      className="item-delete-btn" 
                      onClick={(e) => { e.stopPropagation(); setDeleteItem({ id: item.id, title: item.title }) }} 
                      style={{ 
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        padding: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}