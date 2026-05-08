import { useState, useCallback, useEffect } from 'react'

export default function TextHighlighter({ contentId, source, children }) {
  const [selection, setSelection] = useState(null)
  const [saved, setSaved] = useState(false)

  const handleMouseUp = useCallback((e) => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      setSelection(null)
      return
    }

    const text = sel.toString().trim()
    if (text.length < 5) {
      setSelection(null)
      return
    }

    const range = sel.getRangeAt(0)
    const rect = range.getBoundingClientRect()

    setSelection({ text, x: rect.left + rect.width / 2, y: rect.top - 10 })
  }, [])

  const handleSave = async () => {
    if (!selection) return
    try {
      const { saveHighlight } = await import('../api/client')
      await saveHighlight(contentId, selection.text, source)
      setSaved(true)
      setTimeout(() => {
        setSelection(null)
        setSaved(false)
      }, 1500)
    } catch {
      setSelection(null)
    }
  }

  useEffect(() => {
    function handleClick(e) {
      if (selection && !e.target.closest('.highlight-btn')) {
        setSelection(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [selection])

  useEffect(() => {
    function handleEscape() {
      setSelection(null)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  return (
    <div onMouseUp={handleMouseUp} style={{ position: 'relative' }}>
      {children}

      {selection && (
        <div
          className="highlight-btn"
          onClick={handleSave}
          style={{
            position: 'fixed',
            left: `${selection.x}px`,
            top: `${selection.y}px`,
            transform: 'translate(-50%, -100%)',
            zIndex: 1000,
            background: saved ? 'var(--green)' : 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            padding: '8px 16px',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
          }}
        >
          {saved ? '✓ Saved' : '💾 Save Highlight'}
        </div>
      )}
    </div>
  )
}
