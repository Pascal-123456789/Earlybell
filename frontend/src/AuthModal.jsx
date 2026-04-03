import { useState } from 'react'
import { useAuth } from './AuthContext'
import './AuthModal.css'

export default function AuthModal({ onClose }) {
  const { signIn, signUp } = useAuth()
  const [tab, setTab] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [forgotClicked, setForgotClicked] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setLoading(true)

    if (tab === 'signin') {
      const { error } = await signIn(email, password)
      if (error) {
        setError(error.message)
      } else {
        onClose()
      }
    } else {
      const { error } = await signUp(email, password)
      if (error) {
        setError(error.message)
      } else {
        setSuccess(true)
        setTab('signin')
      }
    }
    setLoading(false)
  }

  const switchTab = (t) => {
    setTab(t)
    setError(null)
    setSuccess(false)
    setForgotClicked(false)
  }

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-card" onClick={e => e.stopPropagation()}>
        <button className="auth-close" onClick={onClose}>&times;</button>

        <div className="auth-tabs">
          <button
            className={`auth-tab${tab === 'signin' ? ' auth-tab--active' : ''}`}
            onClick={() => switchTab('signin')}
          >
            Sign In
          </button>
          <button
            className={`auth-tab${tab === 'signup' ? ' auth-tab--active' : ''}`}
            onClick={() => switchTab('signup')}
          >
            Sign Up
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label className="auth-label">EMAIL</label>
            <input
              className="auth-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
            />
          </div>
          <div className="auth-field">
            <label className="auth-label">PASSWORD</label>
            <input
              className="auth-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
              placeholder="••••••••"
            />
          </div>

          {error && <p className="auth-error">{error}</p>}
          {success && (
            <p className="auth-success">Account created. You can now sign in.</p>
          )}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? 'Please wait…' : tab === 'signin' ? 'Sign In' : 'Create Account'}
          </button>

          {tab === 'signin' && (
            <div className="auth-forgot">
              {forgotClicked ? (
                <span className="auth-forgot-msg">Contact support to reset your password.</span>
              ) : (
                <button
                  type="button"
                  className="auth-forgot-link"
                  onClick={() => setForgotClicked(true)}
                >
                  Forgot password?
                </button>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
