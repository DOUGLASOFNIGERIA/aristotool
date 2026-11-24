import { useState } from 'react'
import { api } from '../api.js'
import { categories, difficulties } from '../data/resources.js'
import Icon from '../components/Icon.jsx'

const emptyResource = {
  id: '',
  type: 'note',
  title: '',
  category: categories[0],
  difficulty: difficulties[0],
  minutes: 20,
  instructor: 'Aristotool',
  rating: 4.8,
  learners: 0,
  updated: new Date().toISOString().slice(0, 10),
  tags: '',
  summary: '',
  outcomes: '',
  sections: '',
  steps: '',
  resourceUrl: '',
  videoId: '',
  sourceLabel: '',
  resourceLabel: '',
}

const emptyPath = {
  id: '',
  title: '',
  description: '',
  color: '#0f766e',
  icon: 'school',
  resourceIds: '',
}

const template = {
  resources: [
    {
      id: 'n100',
      type: 'note',
      title: 'Example resource',
      category: 'Web Application',
      difficulty: 'Beginner',
      minutes: 20,
      instructor: 'Aristotool',
      rating: 4.8,
      learners: 0,
      updated: '2026-11-23',
      tags: ['example', 'starter'],
      summary: 'Describe what the learner will gain from this resource.',
      outcomes: ['Explain the core idea', 'Apply it in a safe practice environment'],
      sections: [{ title: 'Overview', time: '' }, { title: 'Key takeaways', time: '' }],
      media: {
        resourceUrl: 'https://example.com/guide',
        resourceLabel: 'Read the guide',
        sourceLabel: 'Example Source',
      },
    },
  ],
  paths: [
    {
      id: 'p100',
      title: 'Example learning path',
      description: 'A short path built from existing resource IDs.',
      color: '#0f766e',
      icon: 'school',
      resourceIds: ['n100'],
    },
  ],
}

function parseLines(value) {
  return String(value || '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseList(value) {
  return String(value || '')
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function parsePairs(value, key) {
  return parseLines(value)
    .map((line) => {
      const [title, ...rest] = line.split('|').map((item) => item.trim())
      return { title, [key]: rest.join('|') }
    })
    .filter((item) => item.title)
}

export default function Admin({ resources, paths, onCatalogChange, onNotify }) {
  const [resourceForm, setResourceForm] = useState(emptyResource)
  const [pathForm, setPathForm] = useState(emptyPath)
  const [uploadText, setUploadText] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function notify(message) {
    setError('')
    if (onNotify) onNotify(message)
  }

  async function runAction(action, message) {
    setBusy(true)
    setError('')
    try {
      const data = await action()
      if (data?.catalog) onCatalogChange(data.catalog)
      notify(typeof message === 'function' ? message(data) : message)
      return data
    } catch (requestError) {
      setError(requestError.message)
      return null
    } finally {
      setBusy(false)
    }
  }

  function resourcePayload() {
    return {
      ...resourceForm,
      tags: parseList(resourceForm.tags),
      outcomes: parseLines(resourceForm.outcomes),
      sections: parsePairs(resourceForm.sections, 'time'),
      steps: parsePairs(resourceForm.steps, 'detail'),
      media: {
        resourceUrl: resourceForm.resourceUrl,
        videoId: resourceForm.videoId,
        sourceLabel: resourceForm.sourceLabel,
        resourceLabel: resourceForm.resourceLabel,
      },
    }
  }

  async function saveResource(event) {
    event.preventDefault()
    const data = await runAction(
      () => api.adminSaveResource(resourcePayload()),
      () => `Saved “${resourceForm.title}” to the catalog.`,
    )
    if (data) {
      setResourceForm({
        ...emptyResource,
        category: resourceForm.category,
        difficulty: resourceForm.difficulty,
        instructor: resourceForm.instructor,
        updated: resourceForm.updated,
      })
    }
  }

  async function savePath(event) {
    event.preventDefault()
    const data = await runAction(
      () =>
        api.adminSavePath({
          ...pathForm,
          resourceIds: parseList(pathForm.resourceIds),
        }),
      () => `Saved the “${pathForm.title}” learning path.`,
    )
    if (data) setPathForm(emptyPath)
  }

  async function upload(event) {
    event.preventDefault()
    let payload
    try {
      payload = JSON.parse(uploadText)
    } catch {
      setError('Upload text is not valid JSON.')
      return
    }
    await runAction(
      () => api.adminUpload(payload),
      (data) => `Uploaded ${data.resources} resources and ${data.paths} learning paths.`,
    )
  }

  async function readFile(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setUploadText(await file.text())
    event.target.value = ''
  }

  function downloadTemplate() {
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'aristotool-resources-template.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  async function removeResource(item) {
    if (!window.confirm(`Delete “${item.title}” from the catalog?`)) return
    await runAction(
      () => api.adminDeleteResource(item.id),
      () => `Deleted “${item.title}”.`,
    )
  }

  async function removePath(item) {
    if (!window.confirm(`Delete the “${item.title}” learning path?`)) return
    await runAction(() => api.adminDeletePath(item.id), () => `Deleted “${item.title}”.`)
  }

  return (
    <div className="admin-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Admin workspace</p>
          <h1>Manage the catalog</h1>
          <p>Add curated resources, upload a JSON bundle and keep learning paths up to date.</p>
        </div>
        <div className="admin-counters">
          <span>{resources.length} resources</span>
          <span>{paths.length} learning paths</span>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="admin-grid">
        <form className="card admin-card admin-wide" onSubmit={saveResource}>
          <div className="admin-card-head">
            <div>
              <h2>Add or update a resource</h2>
              <p>Leave the ID blank to generate one from the title.</p>
            </div>
            <Icon name="article" size={22} />
          </div>
          <div className="admin-form-grid">
            <div className="field">
              <label htmlFor="resource-id">Resource ID</label>
              <input
                id="resource-id"
                value={resourceForm.id}
                onChange={(event) => setResourceForm({ ...resourceForm, id: event.target.value })}
                placeholder="n101"
              />
            </div>
            <div className="field">
              <label htmlFor="resource-type">Type</label>
              <select
                id="resource-type"
                value={resourceForm.type}
                onChange={(event) => setResourceForm({ ...resourceForm, type: event.target.value })}
              >
                <option value="note">Note</option>
                <option value="video">Video</option>
                <option value="lab">Lab</option>
              </select>
            </div>
            <div className="field admin-span-2">
              <label htmlFor="resource-title">Title</label>
              <input
                id="resource-title"
                value={resourceForm.title}
                onChange={(event) => setResourceForm({ ...resourceForm, title: event.target.value })}
                placeholder="A clear, specific title"
              />
            </div>
            <div className="field">
              <label htmlFor="resource-category">Category</label>
              <select
                id="resource-category"
                value={resourceForm.category}
                onChange={(event) => setResourceForm({ ...resourceForm, category: event.target.value })}
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="resource-difficulty">Difficulty</label>
              <select
                id="resource-difficulty"
                value={resourceForm.difficulty}
                onChange={(event) =>
                  setResourceForm({ ...resourceForm, difficulty: event.target.value })
                }
              >
                {difficulties.map((difficulty) => (
                  <option key={difficulty} value={difficulty}>
                    {difficulty}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="resource-minutes">Minutes</label>
              <input
                id="resource-minutes"
                type="number"
                min="1"
                max="600"
                value={resourceForm.minutes}
                onChange={(event) =>
                  setResourceForm({ ...resourceForm, minutes: event.target.value })
                }
              />
            </div>
            <div className="field">
              <label htmlFor="resource-instructor">Instructor</label>
              <input
                id="resource-instructor"
                value={resourceForm.instructor}
                onChange={(event) =>
                  setResourceForm({ ...resourceForm, instructor: event.target.value })
                }
              />
            </div>
            <div className="field">
              <label htmlFor="resource-rating">Rating</label>
              <input
                id="resource-rating"
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={resourceForm.rating}
                onChange={(event) => setResourceForm({ ...resourceForm, rating: event.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="resource-learners">Learners</label>
              <input
                id="resource-learners"
                type="number"
                min="0"
                value={resourceForm.learners}
                onChange={(event) =>
                  setResourceForm({ ...resourceForm, learners: event.target.value })
                }
              />
            </div>
            <div className="field">
              <label htmlFor="resource-updated">Updated</label>
              <input
                id="resource-updated"
                type="date"
                value={resourceForm.updated}
                onChange={(event) => setResourceForm({ ...resourceForm, updated: event.target.value })}
              />
            </div>
            <div className="field admin-span-2">
              <label htmlFor="resource-tags">Tags (comma separated)</label>
              <input
                id="resource-tags"
                value={resourceForm.tags}
                onChange={(event) => setResourceForm({ ...resourceForm, tags: event.target.value })}
                placeholder="api, owasp, beginner"
              />
            </div>
            <div className="field admin-span-2">
              <label htmlFor="resource-summary">Summary</label>
              <textarea
                id="resource-summary"
                value={resourceForm.summary}
                onChange={(event) => setResourceForm({ ...resourceForm, summary: event.target.value })}
                placeholder="What will the learner gain?"
              />
            </div>
            <div className="field admin-span-2">
              <label htmlFor="resource-outcomes">Outcomes (one per line)</label>
              <textarea
                id="resource-outcomes"
                value={resourceForm.outcomes}
                onChange={(event) =>
                  setResourceForm({ ...resourceForm, outcomes: event.target.value })
                }
                placeholder={'Explain the core idea\nApply it safely'}
              />
            </div>
            <div className="field">
              <label htmlFor="resource-sections">Sections — “Title | Time” per line</label>
              <textarea
                id="resource-sections"
                value={resourceForm.sections}
                onChange={(event) =>
                  setResourceForm({ ...resourceForm, sections: event.target.value })
                }
                placeholder={'Overview | 05:20\nKey ideas | 08:10'}
              />
            </div>
            <div className="field">
              <label htmlFor="resource-steps">Lab steps — “Title | Detail” per line</label>
              <textarea
                id="resource-steps"
                value={resourceForm.steps}
                onChange={(event) => setResourceForm({ ...resourceForm, steps: event.target.value })}
                placeholder={'Set up | Open the workspace\nVerify | Check the result'}
              />
            </div>
            <div className="field admin-span-2">
              <label htmlFor="resource-url">Resource URL</label>
              <input
                id="resource-url"
                type="url"
                value={resourceForm.resourceUrl}
                onChange={(event) =>
                  setResourceForm({ ...resourceForm, resourceUrl: event.target.value })
                }
                placeholder="https://..."
              />
            </div>
            <div className="field">
              <label htmlFor="resource-video">YouTube ID (optional)</label>
              <input
                id="resource-video"
                value={resourceForm.videoId}
                onChange={(event) => setResourceForm({ ...resourceForm, videoId: event.target.value })}
                placeholder="dQw4w9WgXcQ"
              />
            </div>
            <div className="field">
              <label htmlFor="resource-source">Source label</label>
              <input
                id="resource-source"
                value={resourceForm.sourceLabel}
                onChange={(event) =>
                  setResourceForm({ ...resourceForm, sourceLabel: event.target.value })
                }
                placeholder="OWASP"
              />
            </div>
            <div className="field">
              <label htmlFor="resource-link-label">Link label</label>
              <input
                id="resource-link-label"
                value={resourceForm.resourceLabel}
                onChange={(event) =>
                  setResourceForm({ ...resourceForm, resourceLabel: event.target.value })
                }
                placeholder="Open the guide"
              />
            </div>
          </div>
          <button className="button filled" type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save resource'}
          </button>
        </form>

        <form className="card admin-card" onSubmit={savePath}>
          <div className="admin-card-head">
            <div>
              <h2>Learning path</h2>
              <p>Group resource IDs into a guided route.</p>
            </div>
            <Icon name="school" size={22} />
          </div>
          <div className="admin-stack">
            <div className="field">
              <label htmlFor="path-id">Path ID</label>
              <input
                id="path-id"
                value={pathForm.id}
                onChange={(event) => setPathForm({ ...pathForm, id: event.target.value })}
                placeholder="p5"
              />
            </div>
            <div className="field">
              <label htmlFor="path-title">Title</label>
              <input
                id="path-title"
                value={pathForm.title}
                onChange={(event) => setPathForm({ ...pathForm, title: event.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="path-description">Description</label>
              <textarea
                id="path-description"
                value={pathForm.description}
                onChange={(event) => setPathForm({ ...pathForm, description: event.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="path-resources">Resource IDs (comma separated)</label>
              <input
                id="path-resources"
                value={pathForm.resourceIds}
                onChange={(event) => setPathForm({ ...pathForm, resourceIds: event.target.value })}
                placeholder="n8, n9, l7"
              />
            </div>
            <div className="field">
              <label htmlFor="path-color">Colour</label>
              <input
                id="path-color"
                type="color"
                value={pathForm.color}
                onChange={(event) => setPathForm({ ...pathForm, color: event.target.value })}
              />
            </div>
          </div>
          <button className="button filled" type="submit" disabled={busy}>
            Save path
          </button>
        </form>

        <form className="card admin-card" onSubmit={upload}>
          <div className="admin-card-head">
            <div>
              <h2>Bulk upload</h2>
              <p>Upload a JSON bundle with resources and paths.</p>
            </div>
            <Icon name="cloud" size={22} />
          </div>
          <div className="admin-stack">
            <input type="file" accept="application/json,.json" onChange={readFile} />
            <div className="field">
              <label htmlFor="upload-json">JSON payload</label>
              <textarea
                id="upload-json"
                className="admin-json"
                value={uploadText}
                onChange={(event) => setUploadText(event.target.value)}
                placeholder={'{\n  "resources": [],\n  "paths": []\n}'}
              />
            </div>
            <div className="admin-actions">
              <button className="button filled" type="submit" disabled={busy}>
                Upload JSON
              </button>
              <button className="button tonal" type="button" onClick={downloadTemplate}>
                Download template
              </button>
            </div>
          </div>
        </form>

        <section className="card admin-card admin-wide">
          <div className="admin-card-head">
            <div>
              <h2>Catalog inventory</h2>
              <p>Review or remove items. Refreshes after every save.</p>
            </div>
            <Icon name="list" size={22} />
          </div>
          <div className="admin-inventory">
            <div>
              <h3>Resources</h3>
              <div className="admin-list">
                {resources.map((item) => (
                  <div className="admin-list-row" key={item.id}>
                    <span className="admin-list-id">{item.id}</span>
                    <span className="admin-list-title">{item.title}</span>
                    <button
                      className="button text small"
                      type="button"
                      onClick={() => removeResource(item)}
                      disabled={busy}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3>Learning paths</h3>
              <div className="admin-list">
                {paths.map((item) => (
                  <div className="admin-list-row" key={item.id}>
                    <span className="admin-list-id">{item.id}</span>
                    <span className="admin-list-title">{item.title}</span>
                    <button
                      className="button text small"
                      type="button"
                      onClick={() => removePath(item)}
                      disabled={busy}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
