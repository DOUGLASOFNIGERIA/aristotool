import { useState } from 'react'
import AuthLayout from '../components/AuthLayout.jsx'
import { api } from '../api.js'

export default function Login({ onSuccess, onGoRegister, onNeedsConfirmation }) {
  const [email, setEmail] = useState('demo@aristotool.dev')
  const [password, setPassword] = useState('Demo1234!')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const data = await api.login({ email, password })
      onSuccess(data.user)
    } catch (err) {
      setError(err.message)
      if (err.message.includes('Confirm')) onNeedsConfirmation(email)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Sign in to Aristotool"
      intro="Pick up exactly where you left off. Your saved resources and completed lessons stay with your account."
    >
      <form className="auth-form" onSubmit={submit}>
        {error && <div className="form-error">{error}</div>}
        <div className="field">
          <label htmlFor="login-email">Email address</label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>
        <button className="button filled" type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="form-note">
          Demo access is prefilled. Use the demo account to explore the full learning experience.
        </p>
      </form>
      <div className="auth-links">
        <button type="button" onClick={onGoRegister}>
          Create an account
        </button>
        <button type="button" onClick={() => onNeedsConfirmation(email)}>
          Confirm my email
        </button>
      </div>
    </AuthLayout>
  )
}
