import { useState, useEffect, useCallback } from 'react'
import { saveHighlight } from '../api/client'

export default function TextHighlighter({ contentId, source, children }) {
  const [selection, setSelection] = useState(null)
  const [saved, setSaved] = useState(false)

  const captureSelection = useCallback(() => {
    setTimeout(() => {
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
      const x = rect.left + rect.width / 2
      const y = rect.top + window.scrollY
      if (x === 0 && y === 0) {
        setSelection(null)
        return
      }
      setSelection({ text, x, y })
    }, 100)
  }, [])

  useEffect(() => {
    document.addEventListener('mouseup', captureSelection)
    document.addEventListener('touchend', captureSelection)
    return () => {
      document.removeEventListener('mouseup', captureSelection)
      document.removeEventListener('touchend', captureSelection)
    }
  }, [captureSelection])

  const handleSave = useCallback(async () => {
    if (!selection) return
    try {
      await saveHighlight(contentId, selection.text, source)
      setSaved(true)
      setTimeout(() => {
        setSelection(null)
        setSaved(false)
      }, 1500)
    } catch {
      setSelection(null)
    }
  }, [selection, contentId, source])

  useEffect(() => {
    function handleDismiss(e) {
      if (selection && !e.target.closest('.highlight-btn')) {
        setSelection(null)
      }
    }
    document.addEventListener('mousedown', handleDismiss)
    document.addEventListener('touchstart', handleDismiss)
    document.addEventListener('keydown', handleDismiss)
    return () => {
      document.removeEventListener('mousedown', handleDismiss)
      document.removeEventListener('touchstart', handleDismiss)
      document.removeEventListener('keydown', handleDismiss)
    }
  }, [selection])

  return (
    <div style={{ position: 'relative' }}>
      {children}

      {selection && (
        <button
          className="highlight-btn"
          onClick={handleSave}
          style={{
            position: 'fixed',
            left: `${selection.x}px`,
            top: `${selection.y - 12}px`,
            transform: 'translate(-50%, -100%)',
            zIndex: 1000,
            background: saved ? 'var(--green)' : 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            padding: '10px 20px',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 8px 28px rgba(0,0,0,0.25)',
            whiteSpace: 'nowrap',
            animation: 'toastIn 0.2s ease',
          }}
        >
          {saved ? '✓ Saved!' : '💾 Save Highlight'}
        </button>
      )}
    </div>
  )
}
