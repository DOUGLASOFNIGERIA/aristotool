import { useState } from 'react'
import AuthLayout from '../components/AuthLayout.jsx'
import { api } from '../api.js'

export default function Register({ onRegistered, onGoLogin }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (form.password !== form.confirm) {
      setError('Your passwords do not match.')
      return
    }
    setBusy(true)
    try {
      const data = await api.register({
        name: form.name,
        email: form.email,
        password: form.password,
      })
      onRegistered({ email: form.email, token: data.confirmToken })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="Start learning"
      title="Create your account"
      intro="A few details are all it takes to build a personalized, progress-tracked learning plan."
    >
      <form className="auth-form" onSubmit={submit}>
        {error && <div className="form-error">{error}</div>}
        <div className="field">
          <label htmlFor="register-name">Full name</label>
          <input
            id="register-name"
            value={form.name}
            onChange={(event) => update('name', event.target.value)}
            autoComplete="name"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="register-email">Email address</label>
          <input
            id="register-email"
            type="email"
            value={form.email}
            onChange={(event) => update('email', event.target.value)}
            autoComplete="email"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="register-password">Password</label>
          <input
            id="register-password"
            type="password"
            value={form.password}
            onChange={(event) => update('password', event.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="register-confirm">Confirm password</label>
          <input
            id="register-confirm"
            type="password"
            value={form.confirm}
            onChange={(event) => update('confirm', event.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>
        <button className="button filled" type="submit" disabled={busy}>
          {busy ? 'Creating account…' : 'Create account'}
        </button>
        <p className="form-note">
          By continuing you agree to use the material only for authorized learning and systems you
          own.
        </p>
      </form>
      <div className="auth-links">
        <button type="button" onClick={onGoLogin}>
          Already have an account? Sign in
        </button>
      </div>
    </AuthLayout>
  )
}
