import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getNotes, createNote, updateNote, deleteNote, formatDate } from '../api/client'
import ReactMarkdown from 'react-markdown'

export default function NotesPage() {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [searchParams, setSearchParams] = useSearchParams()
  const [activeNote, setActiveNote] = useState(null)
  const [isEditing, setIsEditing] = useState(false)

  const [editTitle, setEditTitle] = useState('')
  const [editBody, setEditBody] = useState('')
  const [saving, setSaving] = useState(false)

  const loadNotes = () => {
    setLoading(true)
    getNotes()
      .then(data => {
        setNotes(data)
        setError(null)

        if (searchParams.get('new') === 'true') {
          handleNewNote(searchParams.get('title') || '')
          setSearchParams({})
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadNotes()
  }, [])

  const handleNewNote = (initialTitle = '') => {
    setActiveNote(null)
    setEditTitle(initialTitle)
    setEditBody('')
    setIsEditing(true)
  }

  const handleEditNote = (note) => {
    setActiveNote(note)
    setEditTitle(note.title || '')
    setEditBody(note.body || '')
    setIsEditing(true)
  }

  const handleSave = async () => {
    if (!editBody.trim()) return
    setSaving(true)
    try {
      if (activeNote) {
        await updateNote(activeNote.id, editTitle, editBody)
      } else {
        await createNote(editTitle, editBody)
      }
      setIsEditing(false)
      setActiveNote(null)
      loadNotes()
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!activeNote || !window.confirm('Are you sure you want to delete this note?')) return
    try {
      await deleteNote(activeNote.id)
      setIsEditing(false)
      setActiveNote(null)
      loadNotes()
    } catch (err) {
      alert(err.message)
    }
  }

  if (loading && notes.length === 0) {
    return (
      <div>
        <h1 className="mb-32">Notes</h1>
        <div className="skeleton-detail-block" />
      </div>
    )
  }

  if (isEditing) {
    return (
      <div>
        <div className="flex justify-between items-center mb-24">
          <button className="btn btn-ghost" onClick={() => setIsEditing(false)} style={{ padding: '8px', marginLeft: '-8px' }}>
            ← Back
          </button>
          <div className="flex gap-12">
            {activeNote && (
              <button className="btn btn-ghost" onClick={handleDelete} style={{ color: 'var(--red)' }}>
                Delete
              </button>
            )}
            <button className="btn btn-primary" onClick={handleSave} disabled={saving || !editBody.trim()}>
              {saving ? 'Saving...' : 'Save Note'}
            </button>
          </div>
        </div>

        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <input
            type="text"
            className="input"
            placeholder="Note Title (optional)"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            style={{
              fontSize: '1.5rem',
              fontWeight: 600,
              padding: '20px 24px 12px',
              border: 'none',
              borderBottom: '1px solid var(--border)',
              borderRadius: 0,
              width: '100%',
              boxShadow: 'none'
            }}
          />

          <textarea
            className="notes-editor"
            placeholder="Write your note here... (Markdown supported)"
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            style={{
              width: '100%',
              border: 'none',
              borderRadius: 0,
              outline: 'none',
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-32">
        <h1>Notes</h1>
        <button className="btn btn-primary" onClick={() => handleNewNote()}>
          + New Note
        </button>
      </div>

      {error && <div className="banner banner-error mb-24"><span>✕</span>{error}</div>}

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {notes.length === 0 ? (
          <div className="card" style={{ gridColumn: '1 / -1', padding: '64px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No notes yet. Create one to capture your thoughts.
          </div>
        ) : (
          notes.map(note => (
            <div
              key={note.id}
              className="card card-animated"
              style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', height: '250px' }}
              onClick={() => handleEditNote(note)}
            >
              <h3 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>{note.title || 'Untitled Note'}</h3>
              <div
                style={{
                  flex: 1,
                  overflow: 'hidden',
                  color: 'var(--text-secondary)',
                  fontSize: '0.9rem',
                  lineHeight: '1.5',
                  maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
                  WebkitMaskImage: '-webkit-linear-gradient(top, black 50%, transparent 100%)'
                }}
              >
                <ReactMarkdown>{note.body}</ReactMarkdown>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                {formatDate(note.created_at)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}