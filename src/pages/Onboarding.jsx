import { useState } from 'react'
import AuthLayout from '../components/AuthLayout.jsx'
import { api } from '../api.js'
import { categories } from '../data/resources.js'

const experiences = [
  { value: 'brand-new', label: 'Brand new' },
  { value: 'beginner', label: 'Some basics' },
  { value: 'intermediate', label: 'Comfortable' },
]

export default function Onboarding({ user, onDone }) {
  const [interests, setInterests] = useState(user.interests || [])
  const [experience, setExperience] = useState(user.experience || 'beginner')
  const [goals, setGoals] = useState(user.goals || '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function toggleInterest(value) {
    setInterests((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    )
  }

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const data = await api.onboarding({ interests, experience, goals })
      onDone(data.user)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      eyebrow={`Welcome, ${user.name.split(' ')[0]}`}
      title="Shape your learning plan"
      intro="Tell us what you want to focus on. You can explore everything either way — this just helps us put the most useful material first."
      step={{ current: 3, total: 3 }}
    >
      <form className="auth-form" onSubmit={submit}>
        {error && <div className="form-error">{error}</div>}
        <div className="field">
          <label>Areas you want to explore</label>
          <div className="choice-grid">
            {categories.map((category) => (
              <label className="choice" key={category}>
                <input
                  type="checkbox"
                  checked={interests.includes(category)}
                  onChange={() => toggleInterest(category)}
                />
                {category}
              </label>
            ))}
          </div>
        </div>
        <div className="field">
          <label>Where are you starting from?</label>
          <div className="choice-grid">
            {experiences.map((item) => (
              <label className="choice" key={item.value}>
                <input
                  type="radio"
                  name="experience"
                  value={item.value}
                  checked={experience === item.value}
                  onChange={() => setExperience(item.value)}
                />
                {item.label}
              </label>
            ))}
          </div>
        </div>
        <div className="field">
          <label htmlFor="goals">What do you want to achieve?</label>
          <textarea
            id="goals"
            value={goals}
            onChange={(event) => setGoals(event.target.value)}
            placeholder="I want to understand web security well enough to start bug bounty hunting safely."
            required
          />
        </div>
        <button className="button filled" type="submit" disabled={busy}>
          {busy ? 'Saving plan…' : 'Open my dashboard'}
        </button>
      </form>
    </AuthLayout>
  )
}
