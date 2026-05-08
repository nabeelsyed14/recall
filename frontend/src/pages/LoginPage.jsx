import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, register } from '../api/client'

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      if (isLogin) {
        await login(email, password)
      } else {
        await register(email, password)
      }
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="label" style={{ color: 'var(--accent)', marginBottom: '16px' }}>RECALL</div>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.04em' }}>
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p style={{ marginTop: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
            {isLogin ? 'Your knowledge hub awaits.' : 'Start your personal learning journal.'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>EMAIL ADDRESS</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
              style={{ width: '100%', height: '52px', padding: '0 20px', borderRadius: '14px' }}
            />
          </div>

          <div className="input-group">
            <label>PASSWORD</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              style={{ width: '100%', height: '52px', padding: '0 20px', borderRadius: '14px' }}
            />
          </div>

          {error && (
            <div className="banner banner-error" style={{ marginTop: '0', marginBottom: '24px' }}>
              <span>✕</span>
              {error}
            </div>
          )}

          <button className="btn btn-primary btn-full" type="submit" disabled={loading} style={{ height: '56px', width: '100%', fontSize: '1.1rem', fontWeight: 800 }}>
            {loading ? <span className="spinner" /> : (isLogin ? 'Login to Recall' : 'Join Recall')}
          </button>
        </form>

        <div className="auth-toggle" style={{ marginTop: '32px' }}>
          <button 
            onClick={() => { setIsLogin(!isLogin); setError(null) }} 
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'var(--text-secondary)', 
              fontWeight: 700, 
              cursor: 'pointer', 
              fontFamily: 'inherit', 
              fontSize: '0.95rem' 
            }}
          >
            {isLogin ? "Don't have an account? " : "Already using Recall? "}
            <span style={{ color: 'var(--accent)' }}>{isLogin ? 'Sign up' : 'Log in'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}