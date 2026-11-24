import { resourcePdfBytes } from './pdf.js'
import { catalogExport, packFilename, progressExport, resourceMarkdown, resourcePack } from './resource-pack.js'

const OFFLINE_KEY = 'aristotool-offline-v1'

function parseStore() {
  try {
    const raw = localStorage.getItem(OFFLINE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persist(entries) {
  try {
    localStorage.setItem(OFFLINE_KEY, JSON.stringify(entries))
    return true
  } catch {
    return false
  }
}

export function readOfflineEntries() {
  return parseStore().sort((a, b) => String(b.savedAt || '').localeCompare(String(a.savedAt || '')))
}

export function offlineIds() {
  return new Set(parseStore().map((entry) => entry.resource?.id))
}

export function saveOfflineEntry(resource, media = {}) {
  const entry = {
    ...resourcePack(resource, media),
    savedAt: new Date().toISOString(),
  }
  const entries = parseStore().filter((item) => item.resource?.id !== resource.id)
  if (!persist([entry, ...entries])) return false
  return true
}

export function removeOfflineEntry(id) {
  return persist(parseStore().filter((item) => item.resource?.id !== id))
}

export function clearOfflineEntries() {
  return persist([])
}

export function downloadFile(filename, content, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadResource(resource, media = {}, format = 'pdf') {
  const safeName = packFilename(resource.title)
  if (format === 'json') {
    const pack = resourcePack(resource, media)
    downloadFile(`${safeName}.aristotool.json`, JSON.stringify(pack, null, 2), 'application/json;charset=utf-8')
    return 'json'
  }
  if (format === 'md') {
    downloadFile(`${safeName}.md`, resourceMarkdown(resource, media), 'text/markdown;charset=utf-8')
    return 'md'
  }
  downloadFile(`${safeName}.pdf`, resourcePdfBytes(resource, media), 'application/pdf')
  return 'pdf'
}

export function downloadOfficialFile(media = {}) {
  const value = String(media.fileUrl || '').trim()
  if (!value) return false
  let target
  try {
    target = new URL(value, window.location.href)
  } catch {
    return false
  }
  if (!/^https?:$/.test(target.protocol)) return false
  const anchor = document.createElement('a')
  anchor.href = target.href
  anchor.download = media.fileName || target.pathname.split('/').pop() || 'official-resource'
  anchor.target = '_blank'
  anchor.rel = 'noopener noreferrer'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  return true
}

export function downloadCatalog(resources, paths) {
  const payload = catalogExport(resources, paths)
  downloadFile('aristotool-catalog.json', JSON.stringify(payload, null, 2), 'application/json;charset=utf-8')
}

export function downloadProgress(progress, resources, user) {
  const payload = progressExport(progress, resources, user)
  const name = packFilename(user?.name || 'learner')
  downloadFile(`aristotool-progress-${name}.json`, JSON.stringify(payload, null, 2), 'application/json;charset=utf-8')
}

export function downloadOfflineBundle(entries = []) {
  const payload = {
    format: 'aristotool-offline-bundle',
    version: 1,
    exportedAt: new Date().toISOString(),
    packs: entries,
  }
  downloadFile('aristotool-offline-bundle.json', JSON.stringify(payload, null, 2), 'application/json;charset=utf-8')
}

export async function copyToClipboard(text) {
  const value = String(text || '')
  if (!value) return false
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable')
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    const field = document.createElement('textarea')
    field.value = value
    field.setAttribute('readonly', '')
    field.style.position = 'fixed'
    field.style.opacity = '0'
    document.body.appendChild(field)
    field.select()
    const copied = document.execCommand('copy')
    field.remove()
    return copied
  }
}
