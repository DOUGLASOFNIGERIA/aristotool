import Icon from '../components/Icon.jsx'
import { typeIcons, typeLabels, formatDuration } from '../data/resources.js'

function formatSaved(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Saved'
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function Downloads({
  offlineEntries,
  resources,
  onOpen,
  onDownload,
  onRemove,
  onClear,
  onDownloadCatalog,
  onExportProgress,
  onDownloadBundle,
  navigate,
}) {
  const known = new Map(resources.map((item) => [item.id, item]))

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Take it with you</p>
          <h1>Downloads &amp; offline</h1>
          <p className="lead">
            Save resource packs on this device, print clean study copies, and export your catalog or progress as JSON.
          </p>
        </div>
        <button className="button outlined" onClick={() => navigate('library')}>
          <Icon name="list" /> Browse library
        </button>
      </div>

      <div className="card download-note">
        <Icon name="shield" size={22} />
        <div>
          <strong>Official sources only.</strong> Packs summarize Aristotool catalog entries and link back to their
          original publishers. The app does not bundle third-party books or videos.
        </div>
      </div>

      <section className="section">
        <div className="section-head">
          <div>
            <h2>Export data</h2>
            <p className="section-sub">Portable copies you control</p>
          </div>
        </div>
        <div className="download-action-row wide">
          <button className="button outlined" onClick={onDownloadCatalog}>
            <Icon name="download" /> Catalog JSON
          </button>
          <button className="button outlined" onClick={onExportProgress}>
            <Icon name="download" /> My progress JSON
          </button>
          {offlineEntries.length > 0 && (
            <button className="button filled" onClick={onDownloadBundle}>
              <Icon name="download" /> Offline bundle
            </button>
          )}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <h2>Saved offline</h2>
            <p className="section-sub">Stored in this browser on this device</p>
          </div>
          {offlineEntries.length > 0 && (
            <button className="button text small" onClick={onClear}>
              <Icon name="delete" /> Clear all
            </button>
          )}
        </div>

        {offlineEntries.length ? (
          <>
            <div className="result-bar">
              <strong>
                {offlineEntries.length} saved {offlineEntries.length === 1 ? 'pack' : 'packs'}
              </strong>
              <span>Available without a network connection</span>
            </div>
            <div className="offline-list">
              {offlineEntries.map((entry) => {
                const packed = entry.resource || {}
                const live = known.get(packed.id)
                const type = packed.type || 'note'
                return (
                  <article className="download-row" key={packed.id}>
                    <span className={`type-badge type-${type}`}>
                      <Icon name={typeIcons[type]} size={19} />
                    </span>
                    <div className="grow">
                      <h4>{packed.title}</h4>
                      <p>
                        {typeLabels[type]} · {packed.category} · {formatDuration(packed.minutes)} · Saved{' '}
                        {formatSaved(entry.savedAt)}
                      </p>
                      {packed.media?.resourceUrl && (
                        <a
                          className="inline-link"
                          href={packed.media.resourceUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {packed.media.resourceLabel || 'Official source'}
                        </a>
                      )}
                    </div>
                    <div className="row-actions">
                      {live && (
                        <button className="button outlined small" onClick={() => onOpen(live)}>
                          <Icon name="arrowForward" size={17} /> Open
                        </button>
                      )}
                      <button className="button text small" onClick={() => onDownload(live || packed, packed.media)}>
                        <Icon name="download" size={17} /> Re-download
                      </button>
                      <button
                        className="icon-button"
                        onClick={() => onRemove(packed.id)}
                        aria-label={`Remove ${packed.title}`}
                        title="Remove saved pack"
                      >
                        <Icon name="delete" size={18} />
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          </>
        ) : (
          <div className="empty-state card">
            <div className="empty-icon">
              <Icon name="download" size={30} />
            </div>
            <h3>No offline packs yet</h3>
            <p>Open any resource and choose Save offline to keep its notes and source links on this device.</p>
            <button className="button filled" onClick={() => navigate('library')}>
              Browse the library
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
