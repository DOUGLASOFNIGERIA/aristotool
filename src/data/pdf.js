import { scopeNote } from './resource-pack.js'

const PAGE_WIDTH = 612
const PAGE_HEIGHT = 792
const MARGIN = 54
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2
const INK = '0.10 0.18 0.22'
const MUTED = '0.39 0.45 0.48'
const BRAND = '0.05 0.35 0.39'
const RULE = '0.82 0.86 0.87'

function toAscii(value) {
  return String(value ?? '')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/[•·]/g, '-')
    .replace(/\u00a0/g, ' ')
    .replace(/[^\x20-\x7e]/g, '')
}

function escapePdfText(value) {
  return toAscii(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

function splitLongWord(word, maxLength) {
  const chunks = []
  let rest = word
  while (rest.length > maxLength) {
    chunks.push(rest.slice(0, maxLength))
    rest = rest.slice(maxLength)
  }
  if (rest) chunks.push(rest)
  return chunks
}

function wrapText(value, maxLength = 92) {
  const text = toAscii(value).trim()
  if (!text) return []
  const lines = []
  let line = ''
  for (const word of text.split(/\s+/)) {
    const chunks = word.length > maxLength ? splitLongWord(word, maxLength) : [word]
    for (const chunk of chunks) {
      const candidate = line ? `${line} ${chunk}` : chunk
      if (candidate.length <= maxLength) {
        line = candidate
        continue
      }
      if (line) lines.push(line)
      line = chunk
    }
  }
  if (line) lines.push(line)
  return lines
}

function drawText(value, x, y, size, font, color) {
  return `BT\n/${font} ${size} Tf\n${color} rg\n${x} ${y.toFixed(2)} Td\n(${escapePdfText(value)}) Tj\nET`
}

function drawRule(y) {
  return `${RULE} RG\n${MARGIN} ${y.toFixed(2)} m\n${PAGE_WIDTH - MARGIN} ${y.toFixed(2)} l\nS`
}

function layoutPages(tokens) {
  const pages = []
  let operations = []
  let y = PAGE_HEIGHT - MARGIN

  const nextPage = () => {
    if (operations.length) pages.push(operations.join('\n'))
    operations = []
    y = PAGE_HEIGHT - MARGIN
  }

  for (const token of tokens) {
    if (token.type === 'space') {
      y -= token.height || 8
      continue
    }
    if (token.type === 'rule') {
      if (y - 18 < MARGIN) nextPage()
      operations.push(drawRule(y))
      y -= 18
      continue
    }

    const size = token.size || 10
    const maxLength = Math.max(16, Math.floor(CONTENT_WIDTH / (size * 0.52)))
    const lines = wrapText(token.value, maxLength)
    for (const line of lines) {
      if (y - size - 6 < MARGIN) nextPage()
      y -= size + 5
      operations.push(drawText(line, MARGIN, y, size, token.font || 'F1', token.color || INK))
    }
    y -= token.after || 0
  }

  if (operations.length) pages.push(operations.join('\n'))
  if (!pages.length) pages.push('')
  return pages.map((content, index) => {
    const footer = drawText(
      `Aristotool study sheet - ${index + 1} of ${pages.length}`,
      MARGIN,
      30,
      8,
      'F1',
      MUTED,
    )
    return `${content}\n${footer}`
  })
}

function createPdf(pages) {
  const pageIds = pages.flatMap((_, index) => [5 + index * 2])
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
  ]

  pages.forEach((content, index) => {
    const pageId = 5 + index * 2
    const contentId = pageId + 1
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`,
    )
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`)
  })

  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((object, index) => {
    offsets[index + 1] = pdf.length
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  })

  const xrefOffset = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
  return Uint8Array.from(pdf, (character) => character.charCodeAt(0))
}

function typeLabel(type) {
  if (type === 'lab') return 'LAB'
  if (type === 'video') return 'VIDEO'
  return 'NOTE'
}

function resourceTokens(resource, media, meta) {
  const tokens = []
  const heading = (value, size = 12, after = 6) =>
    tokens.push({ type: 'text', value, size, font: 'F2', color: BRAND, after })
  const body = (value, after = 6, size = 10) =>
    tokens.push({ type: 'text', value, size, color: INK, after })
  const muted = (value, after = 4, size = 9) =>
    tokens.push({ type: 'text', value, size, color: MUTED, after })

  tokens.push({ type: 'text', value: 'ARISTOTOOL - STUDY SHEET', size: 9, font: 'F2', color: BRAND, after: 8 })
  tokens.push({ type: 'text', value: resource.title, size: 21, font: 'F2', color: INK, after: 8 })
  tokens.push({ type: 'rule' })
  muted(
    `${typeLabel(resource.type)} - ${resource.category} - ${resource.difficulty} - ${resource.minutes} min`,
    4,
  )
  muted(`Instructor: ${resource.instructor} - Updated ${resource.updated}`, 4)
  muted(`Source: ${media.sourceLabel || 'Aristotool curated resource'}`, 8)
  if (media.resourceUrl) muted(`Official link: ${media.resourceLabel || 'Resource'} - ${media.resourceUrl}`, 4)
  if (media.watchUrl) muted(`Video: ${media.watchUrl}`, 4)
  if (media.fileUrl) muted(`Official file: ${media.fileLabel || media.fileName} - ${media.fileUrl}`, 8)
  tokens.push({ type: 'rule' })

  heading('Scope and safety')
  body(scopeNote(), 10)

  if (resource.summary) {
    heading('About this resource')
    body(resource.summary, 10)
  }

  heading("What you'll learn")
  for (const outcome of resource.outcomes || []) body(`- ${outcome}`, 3)

  tokens.push({ type: 'space', height: 6 })
  heading(resource.type === 'lab' ? 'Lab exercises' : 'Study outline')
  const details = resource.type === 'lab' ? resource.steps || [] : resource.sections || []
  details.forEach((detail, index) => {
    body(`${index + 1}. ${detail.title}${detail.time ? ` (${detail.time})` : ''}`, 3)
    if (detail.detail) muted(detail.detail, 5)
  })

  tokens.push({ type: 'space', height: 8 })
  heading('Notes')
  for (let index = 0; index < 8; index += 1) tokens.push({ type: 'rule' })

  muted(`Exported from Aristotool on ${meta.exportedAt || new Date().toISOString().slice(0, 10)}`, 0, 8)
  return tokens
}

export function buildResourcePdf(resource, media = {}, meta = {}) {
  const bytes = createPdf(layoutPages(resourceTokens(resource, media, meta)))
  return bytes
}

export function resourcePdfBytes(resource, media = {}, meta = {}) {
  return buildResourcePdf(resource, media, meta)
}
