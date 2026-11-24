const SCOPE_NOTE =
  'Use only isolated lab environments or systems you own. Keep every exercise inside an explicit, written scope.'

export function packFilename(title) {
  const slug = String(title || 'resource')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72)
  return slug || 'resource'
}

export function resourceMarkdown(resource, media = {}, meta = {}) {
  const detail = resource.type === 'lab' ? resource.steps || [] : resource.sections || []
  const detailTitle = resource.type === 'lab' ? 'Lab exercises' : 'Inside these notes'
  const lines = [
    `# ${resource.title}`,
    '',
    `- Type: ${resource.type}`,
    `- Topic: ${resource.category}`,
    `- Level: ${resource.difficulty}`,
    `- Duration: ${resource.minutes} min`,
    `- Instructor: ${resource.instructor}`,
    `- Updated: ${resource.updated}`,
    `- Source: ${media.sourceLabel || 'Aristotool curated resource'}`,
  ]

  if (media.resourceUrl) lines.push(`- Official link: ${media.resourceUrl}`)
  if (media.watchUrl) lines.push(`- Video: ${media.watchUrl}`)
  if (media.fileUrl) {
    lines.push(`- Official file: ${media.fileLabel || media.fileName || 'Download file'} — ${media.fileUrl}`)
  }

  lines.push('', '## Scope and safety', '', SCOPE_NOTE, '', '## What you will learn', '')
  for (const outcome of resource.outcomes || []) lines.push(`- ${outcome}`)

  lines.push('', `## ${detailTitle}`, '')
  if (resource.type === 'lab') {
    detail.forEach((step, index) => {
      lines.push(`${index + 1}. **${step.title}**`)
      if (step.detail) lines.push(`   ${step.detail}`)
    })
  } else {
    detail.forEach((section, index) => {
      const time = section.time ? ` (${section.time})` : ''
      lines.push(`${index + 1}. ${section.title}${time}`)
    })
  }

  lines.push('', '## Your notes', '', '', '', `Exported from Aristotool on ${meta.exportedAt || new Date().toISOString().slice(0, 10)}.`)
  return lines.join('\n')
}

export function resourcePack(resource, media = {}, meta = {}) {
  return {
    format: 'aristotool-resource-pack',
    version: 1,
    exportedAt: meta.exportedAt || new Date().toISOString(),
    resource: {
      id: resource.id,
      type: resource.type,
      title: resource.title,
      category: resource.category,
      difficulty: resource.difficulty,
      minutes: resource.minutes,
      instructor: resource.instructor,
      rating: resource.rating,
      learners: resource.learners,
      updated: resource.updated,
      tags: resource.tags || [],
      summary: resource.summary,
      outcomes: resource.outcomes || [],
      sections: resource.sections || [],
      steps: resource.steps || [],
    },
    media: {
      sourceLabel: media.sourceLabel || '',
      resourceUrl: media.resourceUrl || '',
      resourceLabel: media.resourceLabel || '',
      watchUrl: media.watchUrl || '',
      fileUrl: media.fileUrl || '',
      fileName: media.fileName || '',
      fileType: media.fileType || '',
      fileLabel: media.fileLabel || '',
    },
    scope: SCOPE_NOTE,
  }
}

export function scopeNote() {
  return SCOPE_NOTE
}

export function catalogExport(resources = [], paths = [], meta = {}) {
  return {
    format: 'aristotool-catalog',
    version: 1,
    exportedAt: meta.exportedAt || new Date().toISOString(),
    counts: {
      resources: resources.length,
      paths: paths.length,
      videos: resources.filter((item) => item.type === 'video').length,
      notes: resources.filter((item) => item.type === 'note').length,
      labs: resources.filter((item) => item.type === 'lab').length,
    },
    resources: resources.map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      category: item.category,
      difficulty: item.difficulty,
      minutes: item.minutes,
      instructor: item.instructor,
      rating: item.rating,
      updated: item.updated,
      tags: item.tags || [],
      summary: item.summary,
      resourceUrl: item.resourceUrl || '',
      fileUrl: item.fileUrl || '',
      fileName: item.fileName || '',
      fileType: item.fileType || '',
      fileLabel: item.fileLabel || '',
    })),
    paths: paths.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      resourceIds: item.resourceIds || [],
    })),
  }
}

export function progressExport(progress = {}, resources = [], user = {}, meta = {}) {
  const titles = new Map(resources.map((item) => [item.id, item.title]))
  const decorate = (ids = []) =>
    ids.map((id) => ({ id, title: titles.get(id) || 'Catalog item' }))

  return {
    format: 'aristotool-progress',
    version: 1,
    exportedAt: meta.exportedAt || new Date().toISOString(),
    learner: { name: user.name || 'Learner' },
    progress: {
      bookmarks: decorate(progress.bookmarks),
      completed: decorate(progress.completed),
      started: decorate(progress.started),
    },
    note: SCOPE_NOTE,
  }
}
