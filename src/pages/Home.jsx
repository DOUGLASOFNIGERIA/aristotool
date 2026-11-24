import Icon from '../components/Icon.jsx'
import ResourceCard from '../components/ResourceCard.jsx'
import { categories } from '../data/resources.js'

export default function Home({
  resources,
  paths,
  bookmarks,
  completed,
  started,
  offlineIds,
  onOpen,
  onBookmark,
  onDownload,
  onOpenPath,
  navigate,
  onCategory,
}) {
  const continueItems = resources
    .filter((item) => started.has(item.id) || bookmarks.has(item.id))
    .filter((item) => !completed.has(item.id))
    .slice(0, 3)

  const featured = [...resources].sort((a, b) => b.rating - a.rating).slice(0, 6)
  const totalHours = Math.round(resources.reduce((sum, item) => sum + item.minutes, 0) / 60)

  return (
    <div className="page">
      <section className="hero">
        <div className="hero-content">
          <p className="eyebrow">Ethical hacking, structured</p>
          <h1>Learn the craft. Practise with purpose.</h1>
          <p>
            Curated video lessons, lecture notes and hands-on labs in one focused workspace — built
            for curious minds who care about doing security the right way.
          </p>
          <div className="hero-actions">
            <button className="button on-dark" onClick={() => navigate('library')}>
              Explore resources <Icon name="arrowForward" />
            </button>
            <button className="button on-dark ghost" onClick={() => onOpenPath(paths[0])}>
              <Icon name="school" /> Start a learning path
            </button>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-tile">
            <span className="tile-icon">
              <Icon name="play" />
            </span>
            <span>
              <strong>Watch</strong>
              <small>Clear, focused video lessons</small>
            </span>
          </div>
          <div className="hero-tile">
            <span className="tile-icon">
              <Icon name="article" />
            </span>
            <span>
              <strong>Read</strong>
              <small>Notes you can actually reuse</small>
            </span>
          </div>
          <div className="hero-tile">
            <span className="tile-icon">
              <Icon name="science" />
            </span>
            <span>
              <strong>Practise</strong>
              <small>Labs in safe environments</small>
            </span>
          </div>
        </div>
      </section>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{resources.length}</div>
          <div className="stat-label">Resources available</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{resources.filter((r) => r.type === 'video').length}</div>
          <div className="stat-label">Video lessons</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{resources.filter((r) => r.type === 'lab').length}</div>
          <div className="stat-label">Hands-on labs</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalHours}+</div>
          <div className="stat-label">Hours of material</div>
        </div>
      </div>

      {continueItems.length > 0 && (
        <section className="section">
          <div className="section-head">
            <div>
              <h2>Pick up where you left off</h2>
              <p className="section-sub">Your saved and in-progress resources</p>
            </div>
            <button className="button text" onClick={() => navigate('learning')}>
              My learning <Icon name="arrowForward" />
            </button>
          </div>
          <div className="grid cards">
            {continueItems.map((item) => (
              <ResourceCard
                key={item.id}
                resource={item}
                bookmarked={bookmarks.has(item.id)}
                completed={completed.has(item.id)}
                offlineSaved={offlineIds.has(item.id)}
                onOpen={onOpen}
                onBookmark={onBookmark}
                onDownload={onDownload}
              />
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <div className="section-head">
          <div>
            <h2>Learning paths</h2>
            <p className="section-sub">A sensible order, so you always know what comes next</p>
          </div>
        </div>
        <div className="grid paths">
          {paths.map((path) => {
            const items = resources.filter((item) => path.resourceIds.includes(item.id))
            const done = items.filter((item) => completed.has(item.id)).length
            const percent = Math.round((done / items.length) * 100)
            return (
              <article
                key={path.id}
                className="card path-card clickable"
                onClick={() => onOpenPath(path)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') onOpenPath(path)
                }}
                role="button"
                tabIndex={0}
              >
                <span className="path-icon" style={{ background: path.color }}>
                  <Icon name={path.icon} size={23} />
                </span>
                <h3>{path.title}</h3>
                <p>{path.description}</p>
                <div className="path-foot">
                  <span>{items.length} resources</span>
                  <span>{percent}% done</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${percent}%`, background: path.color }} />
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <h2>Community favourites</h2>
            <p className="section-sub">Highly rated by learners like you</p>
          </div>
          <button className="button text" onClick={() => navigate('library')}>
            View all <Icon name="arrowForward" />
          </button>
        </div>
        <div className="grid cards">
          {featured.map((item) => (
            <ResourceCard
              key={item.id}
              resource={item}
              bookmarked={bookmarks.has(item.id)}
              completed={completed.has(item.id)}
              offlineSaved={offlineIds.has(item.id)}
              onOpen={onOpen}
              onBookmark={onBookmark}
              onDownload={onDownload}
            />
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <h2>Browse by topic</h2>
            <p className="section-sub">Jump straight into the area you're studying</p>
          </div>
        </div>
        <div className="filter-row">
          {categories.map((category) => (
            <button
              key={category}
              className="filter-chip"
              onClick={() => onCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
