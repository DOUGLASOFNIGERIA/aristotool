import Icon from '../components/Icon.jsx'
import { typeIcons, typeLabels, formatDuration } from '../data/resources.js'

function ItemRow({ item, status, onOpen }) {
  return (
    <button className="learning-item" style={{ textAlign: 'left', width: '100%' }} onClick={() => onOpen(item)}>
      <span className={`type-badge type-${item.type}`} style={{ width: 42, height: 42 }}>
        <Icon name={typeIcons[item.type]} size={20} />
      </span>
      <span className="grow">
        <h4>{item.title}</h4>
        <p>
          {typeLabels[item.type]} · {item.category} · {formatDuration(item.minutes)} · {item.difficulty}
        </p>
      </span>
      <span className={`chip ${status === 'Completed' ? 'done' : ''}`}>
        {status === 'Completed' && <Icon name="check" />}
        {status}
      </span>
      <Icon name="chevronRight" size={20} className="muted" />
    </button>
  )
}

export default function Learning({
  resources,
  paths,
  bookmarks,
  completed,
  started,
  onOpen,
  onOpenPath,
  navigate,
}) {
  const doneItems = resources.filter((item) => completed.has(item.id))
  const activeItems = resources.filter(
    (item) => (started.has(item.id) || bookmarks.has(item.id)) && !completed.has(item.id),
  )
  const savedItems = resources.filter((item) => bookmarks.has(item.id) && !completed.has(item.id))
  const suggested = resources
    .filter((item) => !completed.has(item.id) && !started.has(item.id))
    .slice(0, 3)
  const percent = Math.round((doneItems.length / resources.length) * 100)
  const hours = Math.round(doneItems.reduce((sum, item) => sum + item.minutes, 0) / 60)

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Your workspace</p>
          <h1>My learning</h1>
          <p className="lead">Track progress, revisit saved resources and keep a steady rhythm.</p>
        </div>
        <button className="button outlined" onClick={() => navigate('library')}>
          <Icon name="list" /> Browse library
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{doneItems.length}</div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{activeItems.length}</div>
          <div className="stat-label">In progress</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{bookmarks.size}</div>
          <div className="stat-label">Saved</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{hours}h</div>
          <div className="stat-label">Time invested</div>
        </div>
      </div>

      <section className="section" style={{ marginTop: 30 }}>
        <div className="card" style={{ padding: 22 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontWeight: 700,
              fontSize: 14,
              marginBottom: 10,
            }}
          >
            <span>Overall library progress</span>
            <span>{percent}%</span>
          </div>
          <div className="progress-track" style={{ height: 10 }}>
            <div className="progress-fill" style={{ width: `${percent}%` }} />
          </div>
          <p className="muted" style={{ fontSize: 13, margin: '10px 0 0' }}>
            {doneItems.length} of {resources.length} resources completed. Small steps add up.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <h2>In progress & saved</h2>
            <p className="section-sub">Pick up where you left off</p>
          </div>
        </div>
        {activeItems.length ? (
          activeItems.map((item) => (
            <ItemRow key={item.id} item={item} status="Continue" onOpen={onOpen} />
          ))
        ) : (
          <div className="empty-state card">
            <div className="empty-icon">
              <Icon name="bookmarkBorder" size={30} />
            </div>
            <h3>Nothing in progress yet</h3>
            <p>Open a resource or save it with the bookmark button to see it here.</p>
            <button className="button filled" onClick={() => navigate('library')}>
              Find something to learn
            </button>
          </div>
        )}
      </section>

      {doneItems.length > 0 && (
        <section className="section">
          <div className="section-head">
            <div>
              <h2>Completed</h2>
              <p className="section-sub">Your finished resources</p>
            </div>
          </div>
          {doneItems.map((item) => (
            <ItemRow key={item.id} item={item} status="Completed" onOpen={onOpen} />
          ))}
        </section>
      )}

      {savedItems.length === 0 && suggested.length > 0 && (
        <section className="section">
          <div className="section-head">
            <div>
              <h2>Suggested for you</h2>
              <p className="section-sub">A good next step</p>
            </div>
          </div>
          {suggested.map((item) => (
            <ItemRow key={item.id} item={item} status="New" onOpen={onOpen} />
          ))}
        </section>
      )}

      <section className="section">
        <div className="section-head">
          <div>
            <h2>Your learning paths</h2>
            <p className="section-sub">Structured routes through the library</p>
          </div>
        </div>
        <div className="grid paths">
          {paths.map((path) => {
            const items = resources.filter((item) => path.resourceIds.includes(item.id))
            const done = items.filter((item) => completed.has(item.id)).length
            const percentDone = Math.round((done / items.length) * 100)
            return (
              <article key={path.id} className="card path-card clickable" onClick={() => onOpenPath(path)}>
                <span className="path-icon" style={{ background: path.color }}>
                  <Icon name={path.icon} size={22} />
                </span>
                <h3>{path.title}</h3>
                <div className="path-foot">
                  <span>{done}/{items.length} done</span>
                  <span>{percentDone}%</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${percentDone}%`, background: path.color }} />
                </div>
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}
