import Icon from './Icon.jsx'

export default function AuthLayout({ eyebrow, title, intro, step, children }) {
  return (
    <div className="auth-shell">
      <aside className="auth-visual">
        <div className="auth-visual-brand">
          <span className="auth-visual-mark">
            <Icon name="shield" size={26} />
          </span>
          Aristotool
        </div>
        <div>
          <p className="eyebrow" style={{ color: '#d9f2eb' }}>
            Learn with structure
          </p>
          <h2>The responsible way to learn ethical hacking.</h2>
          <p>
            Curated video lessons, focused notes and guided labs — with your progress saved to your
            own account.
          </p>
          <div className="auth-proof">
            <div>
              <Icon name="verified" size={20} />
              Verified learning paths from foundations to specialisation
            </div>
            <div>
              <Icon name="science" size={20} />
              Safe, scoped labs with clear rules of engagement
            </div>
            <div>
              <Icon name="cloud" size={20} />
              Cloud-synced bookmarks and completion tracking
            </div>
          </div>
        </div>
        <small style={{ color: '#d9f2eb' }}>
          For authorized education and systems you own.
        </small>
      </aside>

      <main className="auth-panel">
        <section className="auth-card">
          {step && (
            <div className="step-dots" aria-label={`Step ${step.current} of ${step.total}`}>
              {Array.from({ length: step.total }, (_, index) => (
                <span key={index} className={index < step.current ? 'done' : ''} />
              ))}
            </div>
          )}
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{intro}</p>
          {children}
        </section>
      </main>
    </div>
  )
}
