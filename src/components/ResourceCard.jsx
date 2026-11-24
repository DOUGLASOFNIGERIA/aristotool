import Icon from './Icon.jsx'
import { typeIcons, typeLabels, difficultyColors } from '../data/resources.js'

export default function ResourceCard({
  resource,
  bookmarked,
  completed,
  offlineSaved,
  onOpen,
  onBookmark,
  onDownload,
}) {
  return (
    <article
      className="card resource-card clickable"
      onClick={() => onOpen(resource)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen(resource)
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Open ${resource.title}`}
    >
      <div className="resource-top">
        <span className={`type-badge type-${resource.type}`}>
          <Icon name={typeIcons[resource.type]} size={22} />
        </span>
        <div className="mini-actions">
          {completed && (
            <span className="icon-button active" title="Completed">
              <Icon name="checkCircle" size={19} />
            </span>
          )}
          <button
            className={`icon-button ${offlineSaved ? 'active' : ''}`}
            onClick={(event) => {
              event.stopPropagation()
              onDownload(resource, resource.media)
            }}
            aria-label={`Download ${resource.title}`}
            title="Download pack"
          >
            <Icon name="download" size={19} />
          </button>
          <button
            className={`icon-button ${bookmarked ? 'active' : ''}`}
            onClick={(event) => {
              event.stopPropagation()
              onBookmark(resource)
            }}
            aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark resource'}
            title={bookmarked ? 'Saved' : 'Save for later'}
          >
            <Icon name={bookmarked ? 'bookmark' : 'bookmarkBorder'} size={19} />
          </button>
        </div>
      </div>

      <h3>{resource.title}</h3>
      <p className="resource-summary">{resource.summary}</p>

      <div className="resource-foot">
        <span className="chip">{typeLabels[resource.type]}</span>
        <span className="chip dot" style={{ color: difficultyColors[resource.difficulty] }}>
          {resource.difficulty}
        </span>
        <span className="chip">
          <Icon name="schedule" />
          {resource.minutes} min
        </span>
        <span className="chip rating">
          <Icon name="star" />
          {resource.rating.toFixed(1)}
        </span>
      </div>
    </article>
  )
}
