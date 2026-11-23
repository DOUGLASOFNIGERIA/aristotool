import { useEffect, useRef, useState } from 'react'
import AuthLayout from '../components/AuthLayout.jsx'
import { api } from '../api.js'

export default function ConfirmEmail({ email, token, onConfirmed, onGoLogin, onBack }) {
  const [code, setCode] = useState(token || '')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const autoRan = useRef(false)

  async function confirm(value) {
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
    confirm(token)
  }, [token])

  async function resend() {
    setBusy(true)
    setError('')
    try {
      const data = await api.resend(email)
      if (data.confirmToken) setCode(data.confirmToken)
      setMessage(data.message)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="One last step"
      title="Confirm your email"
      intro={`We created a confirmation link for ${email || 'your account'}. In this local build the code is shown below instead of being emailed.`}
      step={{ current: 2, total: 3 }}
    >
      <div className="auth-form">
        {error && <div className="form-error">{error}</div>}
        {message && <div className="form-note">{message}</div>}
        <div className="field">
          <label htmlFor="confirm-code">Confirmation code</label>
          <input
            id="confirm-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            spellCheck={false}
          />
        </div>
        {code && (
          <div className="code-box" aria-label="Confirmation code">
            {code}
          </div>
        )}
        <button className="button filled" onClick={() => confirm(code)} disabled={busy || !code}>
          {busy ? 'Working…' : 'Confirm and continue'}
        </button>
        <button className="button outlined" onClick={resend} disabled={busy || !email}>
          Send me a new code
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
