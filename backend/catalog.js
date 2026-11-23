import { difficulties } from '../src/data/resources.js'

const types = ['video', 'note', 'lab']

function slugify(value) {
  const slug = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return slug || `resource-${Date.now().toString(36)}`
}

function asArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }
  if (typeof value === 'string') {
    return value
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}

function asUrl(value) {
  const text = String(value || '').trim()
  if (!/^https?:\/\//i.test(text)) {
    throw new Error('Resource URL must start with http:// or https://.')
  }
  try {
    return new URL(text).toString()
  } catch {
    throw new Error('Resource URL is not valid.')
  }
}

function asVideoId(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  const match = text.match(/(?:v=|\/embed\/|youtu\.be\/)([A-Za-z0-9_-]{11})/)
  const id = match ? match[1] : text
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) {
    throw new Error('YouTube ID must be 11 characters.')
  }
  return id
}

function asNumber(value, fallback, min, max) {
  const number = Number(value ?? fallback)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, number))
}

function asDate(value) {
  const text = String(value || '').trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text
  const date = new Date(text)
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10)
  return date.toISOString().slice(0, 10)
}

function normalizeMedia(value) {
  const input = value && typeof value === 'object' ? value : {}
  const resourceUrl = asUrl(input.resourceUrl || input.url || input.link)
  const videoId = asVideoId(input.videoId)
  return {
    videoId,
    sourceLabel: String(input.sourceLabel || input.source || 'Aristotool · Curated resource').trim(),
    resourceUrl,
    resourceLabel: String(input.resourceLabel || input.label || 'Open resource').trim(),
    embedUrl: videoId ? `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1` : null,
    watchUrl: videoId ? `https://www.youtube.com/watch?v=${videoId}` : null,
  }
}

function normalizeSections(value) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (typeof item === 'string') return { title: item.trim(), time: '' }
      if (!item || typeof item !== 'object') return null
      return {
        title: String(item.title || '').trim(),
        time: String(item.time || '').trim(),
      }
    })
    .filter((item) => item && item.title)
    .slice(0, 24)
}

function normalizeSteps(value) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (typeof item === 'string') return { title: item.trim(), detail: '' }
      if (!item || typeof item !== 'object') return null
      return {
        title: String(item.title || '').trim(),
        detail: String(item.detail || '').trim(),
      }
    })
    .filter((item) => item && item.title)
    .slice(0, 24)
}

export function normalizeResource(raw) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Each resource must be an object.')
  }

  const title = String(raw.title || '').trim()
  if (!title) throw new Error('Resource title is required.')

  const id = String(raw.id || '').trim() || slugify(title)
  if (!/^[A-Za-z0-9_-]+$/.test(id)) {
    throw new Error('Resource ID may only contain letters, numbers, underscores and hyphens.')
  }

  const type = String(raw.type || 'note').toLowerCase()
  if (!types.includes(type)) throw new Error('Resource type must be video, note or lab.')

  const category = String(raw.category || '').trim()
  if (!category) throw new Error('Resource category is required.')

  const difficulty = String(raw.difficulty || 'Beginner')
  if (!difficulties.includes(difficulty)) {
    throw new Error(`Difficulty must be one of: ${difficulties.join(', ')}.`)
  }

  const summary = String(raw.summary || '').trim()
  if (!summary) throw new Error('Resource summary is required.')

  let outcomes = asArray(raw.outcomes)
  if (!outcomes.length) throw new Error('Add at least one learning outcome.')
  outcomes = outcomes.slice(0, 12)

  const base = {
    id,
    type,
    title,
    category,
    difficulty,
    minutes: Math.round(asNumber(raw.minutes, 20, 1, 600)),
    instructor: String(raw.instructor || 'Aristotool').trim(),
    rating: Math.round(asNumber(raw.rating, 4.8, 0, 5) * 10) / 10,
    learners: Math.round(asNumber(raw.learners, 0, 0, 100000000)),
    updated: asDate(raw.updated),
    tags: asArray(raw.tags).slice(0, 12),
    summary,
    outcomes,
    media: normalizeMedia(raw.media || raw),
  }

  if (type === 'lab') {
    let steps = normalizeSteps(raw.steps)
    if (!steps.length) steps = outcomes.map((outcome) => ({ title: outcome, detail: '' }))
    return { ...base, steps }
  }

  let sections = normalizeSections(raw.sections)
  if (!sections.length) sections = outcomes.map((outcome) => ({ title: outcome, time: '' }))
  return { ...base, sections }
}

export function normalizePath(raw) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Each learning path must be an object.')
  }

  const title = String(raw.title || '').trim()
  if (!title) throw new Error('Learning path title is required.')

  const description = String(raw.description || '').trim()
  if (!description) throw new Error('Learning path description is required.')

  const resourceIds = asArray(raw.resourceIds).slice(0, 24)
  if (!resourceIds.length) throw new Error('Add at least one resource ID to the path.')

  const color = String(raw.color || '').trim()
  return {
    id: String(raw.id || '').trim() || slugify(title),
    title,
    description,
    color: /^#[0-9a-f]{6}$/i.test(color) ? color : '#0b57d0',
    icon: String(raw.icon || 'school').trim() || 'school',
    resourceIds,
  }
}

export function normalizeUpload(payload) {
  let source = payload
  if (Array.isArray(source)) source = { resources: source }
  if (!source || typeof source !== 'object') {
    throw new Error('Upload must be a JSON object or array.')
  }

  const rawResources = source.resources || (source.type ? [source] : [])
  const rawPaths = source.paths || (source.resourceIds ? [source] : [])
  if (!Array.isArray(rawResources) || !Array.isArray(rawPaths)) {
    throw new Error('Upload must contain resources and paths arrays.')
  }
  if (rawResources.length > 250) throw new Error('Upload at most 250 resources at once.')
  if (rawPaths.length > 50) throw new Error('Upload at most 50 learning paths at once.')

  return {
    resources: rawResources.map(normalizeResource),
    paths: rawPaths.map(normalizePath),
  }
}
