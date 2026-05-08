import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'

const STARTERS = [
  "What's the main argument?",
  "Explain this to me simply",
  "Quiz me on this content",
  "What are the key takeaways?",
  "Give me an example",
]

export default function ChatPanel({ contentId, onClose }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [locked, setLocked] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const userMsgCount = messages.filter(m => m.role === 'user').length

  const sendMessage = async (text) => {
    if (!text.trim() || streaming || locked) return
    const msg = text.trim()
    setInput('')

    const userMsg = { role: 'user', content: msg }
    const newMessages = [...messages, userMsg]
    setMessages([...newMessages, { role: 'assistant', content: '' }])

    if (userMsgCount + 1 >= 10) {
      setLocked(true)
    }

    setStreaming(true)

    try {
      const token = localStorage.getItem('recall_token')
      const base = import.meta.env.VITE_API_URL || '/api'
      const res = await fetch(`${base}/content/${contentId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: msg,
          history: newMessages.filter(m => m.content !== '').map(m => ({ role: m.role, content: m.content })),
        }),
      })

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue
            try {
              const parsed = JSON.parse(data)
              if (parsed.content) {
                setMessages(prev => {
                  const updated = [...prev]
                  const last = updated[updated.length - 1]
                  if (last && last.role === 'assistant') {
                    updated[updated.length - 1] = { ...last, content: last.content + parsed.content }
                  }
                  return updated
                })
              }
            } catch {}
          }
        }
      }
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: 'Sorry, something went wrong. Try again.' }
        return updated
      })
    } finally {
      setStreaming(false)
    }
  }

  return (
    <div data-chat-panel style={{
      display: 'flex',
      flexDirection: 'column',
      height: '500px',
      background: 'var(--card-bg)',
      borderRadius: '24px',
      boxShadow: 'var(--card-shadow)',
      border: '1px solid var(--border)',
      overflow: 'hidden',
      marginBottom: '32px',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 24px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-main)',
      }}>
        <div className="label" style={{ marginBottom: 0 }}>💬 ASK AI ABOUT THIS CONTENT</div>
        <button className="btn btn-ghost" onClick={onClose} style={{ padding: '4px 8px', fontSize: '1rem' }}>
          ✕
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {messages.length === 0 && (
          <div style={{ marginBottom: '24px' }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '16px' }}>
              Try asking:
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {STARTERS.map((s, i) => (
                <button
                  key={i}
                  className="btn btn-secondary"
                  onClick={() => sendMessage(s)}
                  style={{
                    padding: '10px 18px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    borderRadius: '50px',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
            marginBottom: '16px',
          }}>
            <div style={{
              maxWidth: '80%',
              padding: '12px 18px',
              borderRadius: '18px',
              background: m.role === 'user'
                ? 'var(--accent)'
                : m.content ? 'var(--bg-main)' : 'transparent',
              color: m.role === 'user' ? '#fff' : 'var(--text-primary)',
              fontSize: '0.95rem',
              lineHeight: '1.6',
              boxShadow: m.role === 'user' ? '0 4px 12px rgba(124,58,237,0.2)' : 'none',
            }}>
              {m.role === 'assistant' && !m.content && streaming ? (
                <span style={{ display: 'inline-block', width: '8px', height: '16px', background: 'var(--accent)', borderRadius: '2px', animation: 'blink 0.8s infinite' }} />
              ) : m.role === 'assistant' ? (
                <ReactMarkdown components={{ p: ({ children }) => <p style={{ margin: 0 }}>{children}</p> }}>{m.content}</ReactMarkdown>
              ) : (
                m.content
              )}
            </div>
          </div>
        ))}

        {locked && (
          <div style={{
            textAlign: 'center',
            padding: '16px',
            background: 'var(--amber)',
            color: '#fff',
            borderRadius: '12px',
            fontWeight: 700,
            fontSize: '0.85rem',
            marginTop: '16px',
          }}>
            You've reached the 10-message limit. Refresh the page to start a new chat.
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div style={{
        padding: '16px 24px',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        gap: '12px',
        background: 'var(--bg-main)',
      }}>
        <input
          ref={inputRef}
          type="text"
          className="input"
          placeholder={locked ? 'Chat limit reached' : 'Ask a question...'}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
          disabled={streaming || locked}
          style={{ flex: 1, height: '48px' }}
        />
        <button
          className="btn btn-primary"
          onClick={() => sendMessage(input)}
          disabled={streaming || locked || !input.trim()}
          style={{ padding: '0 24px', height: '48px', flexShrink: 0 }}
        >
          {streaming ? '...' : 'Send'}
        </button>
      </div>
    </div>
  )
}
