import { useEffect } from 'react'
import Icon from './Icon.jsx'
import { typeIcons, typeLabels, formatDuration } from '../data/resources.js'

export default function PathDialog({ path, items, completed, onClose, onOpenResource }) {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const done = items.filter((item) => completed.has(item.id)).length
  const percent = items.length ? Math.round((done / items.length) * 100) : 0
  const totalMinutes = items.reduce((sum, item) => sum + item.minutes, 0)

  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="path-title">
        <div className="dialog-header">
          <span className="path-icon" style={{ background: path.color }}>
            <Icon name={path.icon} size={24} />
          </span>
          <div className="grow">
            <span className="eyebrow" style={{ margin: 0 }}>
              Guided learning path
            </span>
            <h2 id="path-title">{path.title}</h2>
            <p className="muted" style={{ fontSize: 14, margin: 0 }}>
              {path.description}
            </p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close dialog">
            <Icon name="close" />
          </button>
        </div>

        <div className="dialog-body">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 13,
              marginBottom: 8,
              fontWeight: 700,
            }}
          >
            <span>{percent}% complete</span>
            <span className="muted">
              {done} of {items.length} resources
            </span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${percent}%` }} />
          </div>

          <h3 style={{ marginTop: 26 }}>Path contents</h3>
          <p className="muted" style={{ fontSize: 13 }}>
            {formatDuration(totalMinutes)} of material · follow in order or jump to what you need.
          </p>
          <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
            {items.map((item, index) => (
              <button
                key={item.id}
                className="learning-item"
                style={{ textAlign: 'left', width: '100%' }}
                onClick={() => onOpenResource(item)}
              >
                <span className="content-index">{index + 1}</span>
                <span className={`type-badge type-${item.type}`} style={{ width: 36, height: 36 }}>
                  <Icon name={typeIcons[item.type]} size={18} />
                </span>
                <span className="grow">
                  <h4>{item.title}</h4>
                  <p>
                    {typeLabels[item.type]} · {item.minutes} min · {item.difficulty}
                  </p>
                </span>
                {completed.has(item.id) ? (
                  <Icon name="checkCircle" size={20} style={{ color: 'var(--success)' }} />
                ) : (
                  <Icon name="chevronRight" size={20} className="muted" />
                )}
              </button>
            ))}
          </div>
        </div>
        <div className="dialog-footer">
          <button className="button outlined" onClick={onClose}>
            Close
          </button>
        </div>
      </section>
    </div>
  )
}
