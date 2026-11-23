import { useEffect, useRef, useState } from 'react'
import AuthLayout from '../components/AuthLayout.jsx'
import { api } from '../api.js'

export default function ConfirmEmail({
  email,
  token,
  devCode: initialDevCode = '',
  onConfirmed,
  onGoLogin,
  onBack,
}) {
  const [code, setCode] = useState('')
  const [devCode, setDevCode] = useState(initialDevCode)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const autoRan = useRef(false)
  const submitting = useRef(false)

  useEffect(() => {
    if (cooldown <= 0) return undefined
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  async function verify(value) {
    if (submitting.current || busy) return
    submitting.current = true
    setBusy(true)
    setError('')
    try {
      const data = await api.verifyOtp(email, value)
      onConfirmed(data.user)
    } catch (err) {
      setError(err.message)
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }

  async function confirmLink(value) {
    setBusy(true)
    setError('')
    try {
      const data = await api.confirm(value)
      onConfirmed(data.user)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!token || autoRan.current) return
    autoRan.current = true
    confirmLink(token)
  }, [token])

  function handleCodeChange(event) {
    const value = event.target.value.replace(/\D/g, '').slice(0, 6)
    setCode(value)
    setError('')
    if (value.length === 6 && !token) verify(value)
  }

  async function resend() {
    setBusy(true)
    setError('')
    try {
      const data = await api.resend(email)
      setMessage(data.message)
      setCode('')
      setDevCode(data.devCode || '')
      setCooldown(45)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="One last step"
      title="Check your email"
      intro={`We sent a 6-digit verification code to ${email || 'your email address'}. Enter it below to finish creating your account.`}
      step={{ current: 2, total: 3 }}
    >
      <div className="auth-form">
        {error && <div className="form-error">{error}</div>}
        {message && <div className="form-note">{message}</div>}
        <div className="field">
          <label htmlFor="confirm-code">Verification code</label>
          <input
            id="confirm-code"
            className="otp-input"
            value={code}
            onChange={handleCodeChange}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            spellCheck={false}
            disabled={busy}
          />
        </div>
        {devCode && (
          <div className="code-box" aria-label="Local verification code">
            {devCode}
          </div>
        )}
        <button className="button filled" onClick={() => verify(code)} disabled={busy || code.length !== 6}>
          {busy ? 'Working…' : 'Verify and continue'}
        </button>
        <button className="button outlined" onClick={resend} disabled={busy || !email || cooldown > 0}>
          {cooldown > 0 ? `Resend available in ${cooldown}s` : 'Send me a new code'}
        </button>
      </div>
      <div className="auth-links">
        <button type="button" onClick={onBack}>
          Back to registration
        </button>
        <button type="button" onClick={onGoLogin}>
          Sign in instead
        </button>
      </div>
    </AuthLayout>
  )
}
