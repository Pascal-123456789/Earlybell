import { useState } from 'react'
import { FiEye, FiEyeOff } from 'react-icons/fi'
import { useAuth } from './AuthContext'
import './AuthModal.css'

function pwStrength(pw) {
  if (pw.length === 0) return 0;
  if (pw.length < 8)   return 1; // weak
  if (/[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pw)) return 3; // strong
  return 2; // medium
}

export default function AuthModal({ onClose }) {
  const { signIn, signUp } = useAuth()
  const [tab, setTab]               = useState('signin')
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [confirm, setConfirm]       = useState('')
  const [error, setError]           = useState(null)
  const [fieldError, setFieldError] = useState(null)
  const [success, setSuccess]       = useState(false)
  const [loading, setLoading]       = useState(false)
  const [forgotClicked, setForgotClicked] = useState(false)
  const [showPw, setShowPw]         = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const strength = pwStrength(password)
  const segCls = strength === 1 ? 'auth-seg--weak'
               : strength === 2 ? 'auth-seg--med'
               : strength === 3 ? 'auth-seg--strong'
               : ''

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setFieldError(null)
    setSuccess(false)

    if (tab === 'signup') {
      if (password.length < 8) {
        setFieldError('> Password must be at least 8 characters')
        return
      }
      if (password !== confirm) {
        setFieldError('> Passwords do not match')
        return
      }
    }

    setLoading(true)
    if (tab === 'signin') {
      const { error } = await signIn(email, password)
      if (error) setError(error.message)
      else       onClose()
    } else {
      const { error } = await signUp(email, password)
      if (error) setError(error.message)
      else { setSuccess(true); setTab('signin') }
    }
    setLoading(false)
  }

  const switchTab = (t) => {
    setTab(t)
    setError(null)
    setFieldError(null)
    setSuccess(false)
    setForgotClicked(false)
  }

  const handlePwChange = (e) => {
    setPassword(e.target.value)
    if (fieldError) setFieldError(null)
  }

  const handleConfirmChange = (e) => {
    setConfirm(e.target.value)
    if (fieldError) setFieldError(null)
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

          {/* Email */}
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

          {/* Password */}
          <div className="auth-field">
            <label className="auth-label">PASSWORD</label>
            <div className="auth-input-wrap">
              <input
                className="auth-input auth-input--pw"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={handlePwChange}
                required
                autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
                placeholder="••••••••"
              />
              <button
                type="button"
                className="auth-eye-btn"
                onClick={() => setShowPw(v => !v)}
                tabIndex={-1}
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? <FiEyeOff size={14} /> : <FiEye size={14} />}
              </button>
            </div>
            {tab === 'signup' && (
              <div className="auth-strength" aria-hidden="true">
                <div className={`auth-strength-seg${strength >= 1 ? ' ' + segCls : ''}`} />
                <div className={`auth-strength-seg${strength >= 2 ? ' ' + segCls : ''}`} />
                <div className={`auth-strength-seg${strength >= 3 ? ' ' + segCls : ''}`} />
              </div>
            )}
          </div>

          {/* Confirm password — signup only */}
          {tab === 'signup' && (
            <div className="auth-field">
              <label className="auth-label">CONFIRM PASSWORD</label>
              <div className="auth-input-wrap">
                <input
                  className="auth-input auth-input--pw"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirm}
                  onChange={handleConfirmChange}
                  required
                  autoComplete="new-password"
                  placeholder="Confirm password"
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  onClick={() => setShowConfirm(v => !v)}
                  tabIndex={-1}
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                >
                  {showConfirm ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                </button>
              </div>
              {fieldError && <p className="auth-field-error">{fieldError}</p>}
            </div>
          )}

          {error && <p className="auth-error">{error}</p>}
          {success && <p className="auth-success">Account created. You can now sign in.</p>}

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
