import { useCallback, useEffect, useState } from 'react'
import { api } from '../api.js'
import Icon from '../components/Icon.jsx'

const cards = [
  { key: 'totalSignups', label: 'Total signups', icon: 'group' },
  { key: 'signupsToday', label: 'New today', icon: 'schedule' },
  { key: 'signups7d', label: 'New in 7 days', icon: 'accountCircle' },
  { key: 'signups30d', label: 'New in 30 days', icon: 'verified' },
  { key: 'confirmed', label: 'Confirmed accounts', icon: 'checkCircle' },
  { key: 'onboarded', label: 'Onboarded learners', icon: 'school' },
  { key: 'activeLearners', label: 'Active learners', icon: 'bolt' },
  { key: 'completed', label: 'Resources completed', icon: 'check' },
]

export default function Stats({ onNotify }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setStats(await api.adminStats())
    } catch (requestError) {
      setError(requestError.message)
      if (onNotify) onNotify('Could not refresh learner statistics.')
    } finally {
      setLoading(false)
    }
  }, [onNotify])

  useEffect(() => {
    load()
  }, [load])

  const maxDaily = Math.max(1, ...(stats?.daily || []).map((item) => item.signups))
  const totalExperience = (stats?.experience || []).reduce((sum, item) => sum + item.count, 0)
  const updated = stats
    ? new Date(stats.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : ''

  return (
    <div className="admin-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Admin workspace</p>
          <h1>Learner statistics</h1>
          <p className="lead">
            See how many people are joining Aristotool and how many are actively learning.
            The seeded demo account is excluded from these counts.
          </p>
        </div>
        <div className="admin-counters">
          {stats && <span>Updated {updated}</span>}
          <button className="button outlined small" type="button" onClick={load} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="form-error">
          {error}{' '}
          <button className="button text small" type="button" onClick={load}>
            Try again
          </button>
        </div>
      )}

      {!stats && !error ? (
        <div className="empty-state">
          <div className="empty-icon">
            <Icon name="group" size={30} />
          </div>
          <strong>Loading learner statistics…</strong>
        </div>
      ) : (
        stats && (
          <>
            <div className="stats-grid admin-stats-grid">
              {cards.map(({ key, label, icon }) => (
                <div className="stat-card" key={key}>
                  <div className="stats-card-head">
                    <Icon name={icon} size={18} />
                    <span>{label}</span>
                  </div>
                  <div className="stat-value">{stats[key]}</div>
                </div>
              ))}
            </div>

            <div className="stats-detail-grid">
              <section className="card admin-card">
                <div className="admin-card-head">
                  <div>
                    <h2>Signups this week</h2>
                    <p>New accounts created over the last seven days.</p>
                  </div>
                  <Icon name="schedule" size={22} />
                </div>
                <div className="stats-bars">
                  {stats.daily.map((item) => (
                    <div className="stats-bar-col" key={item.day} title={`${item.day}: ${item.signups}`}>
                      <span className="stats-bar-value">{item.signups}</span>
                      <div className="stats-bar-track">
                        <div
                          className={`stats-bar-fill ${item.signups ? '' : 'empty'}`}
                          style={{ height: `${Math.max(6, (item.signups / maxDaily) * 100)}%` }}
                        />
                      </div>
                      <span className="stats-bar-label">{item.label}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="card admin-card">
                <div className="admin-card-head">
                  <div>
                    <h2>Experience levels</h2>
                    <p>Self-reported levels from completed onboarding.</p>
                  </div>
                  <Icon name="school" size={22} />
                </div>
                {stats.experience.length ? (
                  <div className="stats-breakdown">
                    {stats.experience.map((item) => (
                      <div className="stats-breakdown-row" key={item.level}>
                        <div className="stats-breakdown-head">
                          <span>{item.level}</span>
                          <strong>{item.count}</strong>
                        </div>
                        <div className="stats-breakdown-track">
                          <div
                            className="stats-breakdown-fill"
                            style={{ width: `${(item.count / totalExperience) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="section-sub">No onboarding responses yet.</p>
                )}
              </section>
            </div>

            <section className="card admin-card">
              <div className="admin-card-head">
                <div>
                  <h2>Recent signups</h2>
                  <p>The five newest accounts, excluding the demo account.</p>
                </div>
                <Icon name="group" size={22} />
              </div>
              {stats.recentSignups.length ? (
                <div className="stats-recent-list">
                  {stats.recentSignups.map((item) => (
                    <div className="stats-recent-row" key={item.email}>
                      <span className="stats-recent-name">{item.name}</span>
                      <span className="stats-recent-email">{item.email}</span>
                      <span className="stats-recent-date">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                      <span className="stats-status">
                        {item.onboarded ? 'Onboarded' : item.confirmed ? 'Confirmed' : 'Pending'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="section-sub">No signups yet.</p>
              )}
            </section>
          </>
        )
      )}
    </div>
  )
}
