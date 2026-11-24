import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Icon from '../components/Icon.jsx'
import { api } from '../api.js'

const MAX_FILE_BYTES = 1_500_000
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Could not read that screenshot. Try another file.'))
    reader.readAsDataURL(file)
  })
}

function timeLabel(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function Community({ onNotify }) {
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  const loadMessages = useCallback(async () => {
    try {
      const data = await api.communityMessages()
      setMessages(data.messages || [])
    } catch {
      setError('Could not refresh the conversation. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadMessages()
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') loadMessages()
    }, 5000)
    return () => clearInterval(timer)
  }, [loadMessages])

  useEffect(() => {
    if (!file) {
      setPreview('')
      return undefined
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const participants = useMemo(() => {
    const seen = new Set()
    return messages
      .filter((message) => {
        if (seen.has(message.authorName)) return false
        seen.add(message.authorName)
        return true
      })
      .slice(-8)
      .reverse()
  }, [messages])

  function chooseFile(event) {
    const next = event.target.files?.[0] || null
    if (!next) return
    if (!ACCEPTED_TYPES.includes(next.type)) {
      onNotify?.('Use a PNG, JPEG, WebP or GIF screenshot.')
      event.target.value = ''
      return
    }
    if (next.size > MAX_FILE_BYTES) {
      onNotify?.('Screenshots must be smaller than 1.5 MB.')
      event.target.value = ''
      return
    }
    setError('')
    setFile(next)
  }

  function clearFile() {
    setFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function submitMessage(event) {
    event.preventDefault()
    const body = draft.trim()
    if (!body && !file) return
    setSending(true)
    setError('')
    try {
      let attachmentId = ''
      if (file) {
        const dataUrl = await readAsDataUrl(file)
        const uploaded = await api.uploadCommunityAttachment(dataUrl)
        attachmentId = uploaded.attachment.id
      }
      const posted = await api.postCommunityMessage({ body, attachmentId })
      setMessages((current) => [...current, posted.message])
      setDraft('')
      clearFile()
      onNotify?.('Posted to the community.')
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setSending(false)
    }
  }

  async function removeMessage(id) {
    setError('')
    try {
      await api.deleteCommunityMessage(id)
      setMessages((current) => current.filter((message) => message.id !== id))
    } catch (deleteError) {
      setError(deleteError.message)
    }
  }

  return (
    <div className="page community-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Chat</p>
          <h1>Learn out loud, together.</h1>
          <p className="lead">
            Ask questions, share a breakthrough, or drop a screenshot of the error that has you stuck.
            Signed-in learners only — no emails, no noise.
          </p>
        </div>
        <button className="button outlined" onClick={loadMessages} disabled={loading}>
          <Icon name="bolt" size={18} /> Refresh
        </button>
      </div>

      <div className="community-grid">
        <section className="card community-feed" aria-label="Learner chat">
          <div className="community-feed-head">
            <div>
              <h2>Open chat</h2>
              <p className="muted">A shared space for learners working through the same material.</p>
            </div>
            <span className="chip dot" style={{ color: 'var(--primary)' }}>
              {messages.length} {messages.length === 1 ? 'post' : 'posts'}
            </span>
          </div>

          <div className="community-messages" role="log" aria-live="polite">
            {loading && messages.length === 0 ? (
              <div className="community-empty">Loading the conversation…</div>
            ) : messages.length === 0 ? (
              <div className="community-empty">
                <Icon name="forum" size={32} />
                <strong>No posts yet.</strong>
                <span>Start the conversation — a question you ask today helps someone tomorrow.</span>
              </div>
            ) : (
              messages.map((message) => (
                <article className={`community-message ${message.own ? 'own' : ''}`} key={message.id}>
                  <div className="message-avatar" aria-hidden="true">
                    {message.authorInitials}
                  </div>
                  <div className="message-content">
                    <div className="message-head">
                      <strong>
                        {message.authorName}
                        {message.own ? ' (you)' : ''}
                      </strong>
                      <time dateTime={message.createdAt}>{timeLabel(message.createdAt)}</time>
                      {message.canDelete && (
                        <button
                          type="button"
                          className="icon-button message-delete"
                          onClick={() => removeMessage(message.id)}
                          aria-label="Remove this message"
                          title="Remove this message"
                        >
                          <Icon name="delete" size={16} />
                        </button>
                      )}
                    </div>
                    {message.body && <p className="message-body">{message.body}</p>}
                    {message.attachment && (
                      <a
                        className="message-attachment"
                        href={api.attachmentUrl(message.attachment.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        referrerPolicy="no-referrer"
                      >
                        <img
                          src={api.attachmentUrl(message.attachment.id)}
                          alt={`Screenshot shared by ${message.authorName}`}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      </a>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>

          <form className="community-composer" onSubmit={submitMessage}>
            <label className="sr-only" htmlFor="community-draft">
              Your message
            </label>
            <textarea
              id="community-draft"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={2000}
              rows={3}
              placeholder="Where did you get stuck? Share the step, not the secret."
              disabled={sending}
            />
            {preview && (
              <div className="composer-preview">
                <img src={preview} alt="Selected screenshot preview" />
                <button type="button" onClick={clearFile} aria-label="Remove screenshot">
                  <Icon name="close" size={16} />
                </button>
              </div>
            )}
            <div className="composer-row">
              <label className="attach-button">
                <Icon name="image" size={18} /> Screenshot
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={chooseFile}
                  disabled={sending}
                />
              </label>
              <span className="composer-count">{draft.length}/2000</span>
              <button className="button filled" type="submit" disabled={sending || (!draft.trim() && !file)}>
                <Icon name="send" size={18} /> {sending ? 'Posting…' : 'Post'}
              </button>
            </div>
            {error && <p className="community-error">{error}</p>}
          </form>
        </section>

        <aside className="community-side">
          <section className="card community-privacy">
            <span className="type-badge type-note">
              <Icon name="shield" size={22} />
            </span>
            <h3>Your privacy comes first</h3>
            <ul>
              <li>Only signed-in learners can read or post here.</li>
              <li>Your email is never shown — only a display name and initials.</li>
              <li>Never paste passwords, tokens or real client data, including in screenshots.</li>
              <li>Posts are kept for 30 days. You can remove your own at any time.</li>
            </ul>
          </section>

          <section className="card community-participants">
            <h3>In this conversation</h3>
            {participants.length === 0 ? (
              <p className="muted">Be the first to say hello.</p>
            ) : (
              <div className="participant-list">
                {participants.map((person) => (
                  <div className="participant" key={person.authorName}>
                    <span className="message-avatar small">{person.authorInitials}</span>
                    <span>{person.authorName}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}
