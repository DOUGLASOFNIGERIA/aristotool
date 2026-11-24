import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon.jsx'
import {
  typeIcons,
  typeLabels,
  difficultyColors,
  formatDuration,
  getMedia,
} from '../data/resources.js'
import { scopeNote } from '../data/resource-pack.js'

export default function ResourceDialog({
  resource,
  bookmarked,
  completed,
  offlineSaved,
  onClose,
  onBookmark,
  onComplete,
  onSaveOffline,
  onDownload,
  onDownloadOfficial,
  onPrint,
  onCopyLink,
}) {
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

  const media = resource.media || (resource.resourceUrl ? resource : getMedia(resource.id))

  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="resource-title">
        <div className="dialog-header">
          <span className={`type-badge type-${resource.type}`}>
            <Icon name={typeIcons[resource.type]} size={23} />
          </span>
          <div className="grow">
            <span className="eyebrow" style={{ margin: 0 }}>
              {typeLabels[resource.type]} · {resource.category}
            </span>
            <h2 id="resource-title">{resource.title}</h2>
            <div className="detail-meta">
              <span className="chip dot" style={{ color: difficultyColors[resource.difficulty] }}>
                {resource.difficulty}
              </span>
              <span className="chip">
                <Icon name="schedule" /> {formatDuration(resource.minutes)}
              </span>
              <span className="chip">
                <Icon name="star" style={{ color: 'var(--warning)' }} /> {resource.rating.toFixed(1)}
              </span>
              <span className="chip">
                <Icon name="group" /> {resource.learners.toLocaleString()} learners
              </span>
              <span className="chip">
                <Icon name="verified" /> {resource.instructor}
              </span>
            </div>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close dialog">
            <Icon name="close" />
          </button>
        </div>

        <div className="dialog-body">
          <div className="info-banner">
            <Icon name="shield" />
            <span>
              Learn responsibly. All exercises are designed for isolated lab environments or systems
              you own. Keep every test inside an explicit, written scope.
            </span>
          </div>

          <div className="source-line">
            <Icon name="info" size={16} />
            <span>{media.sourceLabel}</span>
          </div>

          {media.embedUrl && (
            <div className="video-frame">
              <iframe
                src={media.embedUrl}
                title={`Video lesson: ${resource.title}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          )}

          <div className="resource-link-row">
            {media.watchUrl && (
              <a className="resource-link" href={media.watchUrl} target="_blank" rel="noreferrer">
                <Icon name="play" /> Watch on YouTube
              </a>
            )}
            <a className="resource-link" href={media.resourceUrl} target="_blank" rel="noreferrer">
              <Icon name="arrowForward" /> {media.resourceLabel || 'Open resource'}
            </a>
          </div>

          <div className="download-action-row">
            <button className="button filled small" onClick={() => onDownload(resource, media, 'pdf')}>
              <Icon name="download" size={17} /> Download PDF
            </button>
            {media.fileUrl && (
              <button className="button outlined small" onClick={() => onDownloadOfficial(resource, media)}>
                <Icon name="download" size={17} /> Official {media.fileType || 'file'}
              </button>
            )}
            <button
              className={`button ${offlineSaved ? 'tonal' : 'outlined'} small`}
              onClick={() => onSaveOffline(resource, media)}
            >
              <Icon name={offlineSaved ? 'checkCircle' : 'list'} size={17} />
              {offlineSaved ? 'Saved offline' : 'Save offline'}
            </button>
            <button className="button text small" onClick={onPrint}>
              <Icon name="print" size={17} /> Print
            </button>
            <button className="button text small" onClick={() => onCopyLink(media.resourceUrl)}>
              <Icon name="copy" size={17} /> Copy link
            </button>
          </div>

          <h3>What you'll learn</h3>
          <p className="muted" style={{ fontSize: 14, lineHeight: 1.6 }}>
            {resource.summary}
          </p>
          <ul className="outcomes">
            {resource.outcomes.map((outcome) => (
              <li key={outcome}>
                <Icon name="checkCircle" />
                <span>{outcome}</span>
              </li>
            ))}
          </ul>

          <div style={{ marginTop: 28 }}>
            <h3>{resource.type === 'lab' ? 'Lab exercises' : resource.type === 'note' ? 'Inside these notes' : 'Chapters'}</h3>
            {resource.type === 'lab' ? (
              <ol className="step-list">
                {resource.steps.map((step) => (
                  <li key={step.title}>
                    <strong>{step.title}</strong>
                    <p>{step.detail}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <ul className="content-list">
                {resource.sections.map((section, index) => (
                  <li key={section.title}>
                    <span className="content-index">{index + 1}</span>
                    <span>{section.title}</span>
                    {section.time && <span className="content-time">{section.time}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div style={{ marginTop: 24 }}>
            <span className="chip">Updated {resource.updated}</span>{' '}
            {resource.tags.map((tag) => (
              <span className="chip" key={tag}>
                #{tag}
              </span>
            ))}
          </div>
        </div>

        <div className="dialog-footer">
          <button className={`button ${bookmarked ? 'filled' : 'outlined'}`} onClick={onBookmark}>
            <Icon name={bookmarked ? 'bookmark' : 'bookmarkBorder'} />
            {bookmarked ? 'Saved' : 'Save for later'}
          </button>
          <button className={`button ${completed ? 'tonal' : 'filled'}`} onClick={onComplete}>
            <Icon name={completed ? 'check' : 'checkCircle'} />
            {completed ? 'Completed' : 'Mark complete'}
          </button>
        </div>

        {createPortal(
          <div className="print-sheet">
            <p className="print-brand">Aristotool · {typeLabels[resource.type]} · {resource.category}</p>
            <h1>{resource.title}</h1>
            <p className="print-meta">
              {resource.difficulty} · {formatDuration(resource.minutes)} · {resource.instructor} · Updated{' '}
              {resource.updated}
            </p>
            <p>
              <strong>Official source:</strong> {media.resourceLabel || 'Resource'} — {media.resourceUrl}
            </p>
            {media.fileUrl && (
              <p>
                <strong>Official file:</strong> {media.fileLabel || media.fileName} — {media.fileUrl}
              </p>
            )}
            <h2>What you'll learn</h2>
            <ul>
              {resource.outcomes.map((outcome) => (
                <li key={outcome}>{outcome}</li>
              ))}
            </ul>
            <h2>{resource.type === 'lab' ? 'Lab exercises' : 'Study outline'}</h2>
            {resource.type === 'lab' ? (
              <ol>
                {resource.steps.map((step) => (
                  <li key={step.title}>
                    <strong>{step.title}</strong>
                    <p>{step.detail}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <ol>
                {resource.sections.map((section) => (
                  <li key={section.title}>
                    {section.title}
                    {section.time ? ` (${section.time})` : ''}
                  </li>
                ))}
              </ol>
            )}
            <h2>Scope and safety</h2>
            <p>{scopeNote()}</p>
            <p className="print-foot">Exported from Aristotool on {new Date().toISOString().slice(0, 10)}</p>
          </div>,
          document.body,
        )}
      </section>
    </div>
  )
}
