import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchContent, formatDate } from '../api/client'

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const inputRef = useRef(null)
  const containerRef = useRef(null)
  const navigate = useNavigate()

  const debounceRef = useRef(null)

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setShowResults(false)
      return
    }

    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await searchContent(query.trim())
        setResults(data)
        setShowResults(true)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(debounceRef.current)
  }, [query])

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setQuery('')
        setShowResults(false)
        inputRef.current?.blur()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function highlightMatch(text) {
    if (!query.trim() || !text) return text
    const words = query.trim().split(/\s+/).filter(w => w.length > 1)
    if (words.length === 0) return text
    const pattern = new RegExp(`(${words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi')
    return text.split(pattern).map((part, i) =>
      pattern.test(part)
        ? <mark key={i} style={{ background: 'var(--accent-light)', color: 'var(--accent)', borderRadius: '4px', padding: '0 2px', fontWeight: 700 }}>{part}</mark>
        : part
    )
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', marginBottom: showResults ? '0' : '32px' }}>
      <div style={{ position: 'relative' }}>
        <svg
          width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"
          style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }}
        >
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          className="input"
          placeholder="Search your library... (Ctrl+K)"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => query.trim() && results.length > 0 && setShowResults(true)}
          style={{
            paddingLeft: '48px',
            height: '52px',
            fontSize: '1rem',
            borderRadius: '16px',
            background: 'var(--card-bg)',
            boxShadow: 'var(--card-shadow)',
            border: query.trim() ? '2px solid var(--accent)' : '1px solid var(--border)',
          }}
        />
        {loading && (
          <span className="spinner" style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)' }} />
        )}
      </div>

      {showResults && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          zIndex: 50,
          marginTop: '8px',
          background: 'var(--card-bg)',
          borderRadius: '24px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.15)',
          border: '1px solid var(--border)',
          overflow: 'hidden',
          maxHeight: '500px',
          overflowY: 'auto',
        }}>
          {results.length === 0 && !loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 700 }}>
              No results found for "{query}"
            </div>
          ) : (
            results.map(item => (
              <div
                key={item.id}
                className="library-item-card"
                onClick={() => { navigate(`/content/${item.id}`); setShowResults(false); setQuery('') }}
                style={{ cursor: 'pointer', margin: '8px 8px', padding: '24px 28px', borderRadius: '20px' }}
              >
                <div style={{ flex: 1, paddingRight: '24px' }}>
                  <div className="item-title" style={{ marginBottom: '8px' }}>
                    {highlightMatch(item.title)}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    {highlightMatch(item.snippet)}
                  </div>
                  <div className="item-meta">
                    {formatDate(item.date_saved)} · {item.source_type}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <span className="topic-tag">{item.genre}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.topic_name}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
