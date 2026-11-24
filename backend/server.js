import express from 'express'
import {
  findConfirmation,
  consumeConfirmation,
  createChatAttachment,
  createChatMessage,
  createConfirmation,
  createSession,
  createUser,
  deleteChatMessage,
  deleteSession,
  findChatAttachment,
  findOwnedUnusedAttachment,
  findUserByEmail,
  findUserBySession,
  getAdminStats,
  getCatalog,
  getProgress,
  hasRecentConfirmation,
  deletePath,
  deleteResource,
  listChatMessages,
  pruneUnusedAttachments,
  safeDisplayName,
  saveOnboarding,
  serializeUser,
  setProgress,
  upsertPaths,
  upsertResources,
  verifyConfirmationCode,
  verifyPassword,
} from './db.js'
import { normalizePath, normalizeResource, normalizeUpload } from './catalog.js'
import {
  adminNotificationRecipient,
  isEmailConfigured,
  sendAdminSignupNotification,
  sendOtpEmail,
} from './mailer.js'
import { getMedia } from '../src/data/resources.js'
import { catalogExport, packFilename, progressExport, resourceMarkdown } from '../src/data/resource-pack.js'

const app = express()
const port = Number(process.env.PORT || 3001)

const MAX_CHAT_BODY = 2000
const MAX_ATTACHMENT_BYTES = 1_500_000
const allowedImageTypes = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
const rateBuckets = new Map()

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'")
  next()
})

app.use(express.json({ limit: '5mb' }))

function allowRate(key, max, windowMs) {
  const now = Date.now()
  if (rateBuckets.size > 5000) {
    for (const [bucketKey, bucket] of rateBuckets) {
      if (now - bucket.start >= windowMs) rateBuckets.delete(bucketKey)
    }
  }
  const bucket = rateBuckets.get(key)
  if (!bucket || now - bucket.start >= windowMs) {
    rateBuckets.set(key, { start: now, count: 1 })
    return true
  }
  if (bucket.count >= max) return false
  bucket.count += 1
  return true
}

function decodeImage(payload) {
  let value = String(payload || '').trim()
  let contentType = ''
  const dataUrl = value.match(/^data:([a-zA-Z0-9.+-]+\/[a-zA-Z0-9.+-]+);base64,([\s\S]*)$/)
  if (dataUrl) {
    contentType = dataUrl[1].toLowerCase()
    value = dataUrl[2].trim()
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length % 4 !== 0) {
    throw fail(400, 'That screenshot is not a valid image file.')
  }
  const buffer = Buffer.from(value, 'base64')
  if (!buffer.length || buffer.toString('base64') !== value) {
    throw fail(400, 'That screenshot is not a valid image file.')
  }
  if (!allowedImageTypes.has(contentType)) {
    throw fail(400, 'Use a PNG, JPEG, WebP or GIF screenshot.')
  }
  const signatures = {
    'image/png': (bytes) =>
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes.toString('ascii', 1, 4) === 'PNG' &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a,
    'image/jpeg': (bytes) => bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
    'image/gif': (bytes) => bytes.length >= 6 && ['GIF87a', 'GIF89a'].includes(bytes.toString('ascii', 0, 6)),
    'image/webp': (bytes) =>
      bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP',
  }
  if (!signatures[contentType](buffer)) {
    throw fail(400, 'The screenshot contents do not match its image type.')
  }
  if (buffer.length > MAX_ATTACHMENT_BYTES) {
    throw fail(400, 'Screenshots must be smaller than 1.5 MB.')
  }
  return { contentType, data: buffer.toString('base64'), buffer }
}

function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next)
  }
}

function fail(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}

function parseOrFail(parser, value) {
  try {
    return parser(value)
  } catch (error) {
    throw fail(400, error.message)
  }
}

function sessionToken(req) {
  const cookie = req.headers.cookie || ''
  const match = cookie.match(/(?:^|;\s*)aristotool_session=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

function setSessionCookie(res, token) {
  const secure = process.env.VERCEL ? '; Secure' : ''
  res.setHeader(
    'Set-Cookie',
    `aristotool_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secure}`,
  )
}

function devOtpFields(code) {
  return process.env.ALLOW_DEV_OTP === 'true' ? { devCode: code } : {}
}

async function deliverOtp(email, code) {
  if (process.env.ALLOW_DEV_OTP === 'true') return
  if (!isEmailConfigured()) {
    throw fail(503, 'Email delivery is not configured. Ask the site owner to set GMAIL_USER and GMAIL_APP_PASSWORD.')
  }
  await sendOtpEmail(email, code)
}

async function requireAuth(req, res, next) {
  const user = await findUserBySession(sessionToken(req))
  if (!user) {
    return res.status(401).json({ error: 'Your session has expired. Please sign in again.' })
  }
  req.user = user
  next()
}

async function requireAdmin(req, res, next) {
  if (!req.user?.is_admin) {
    return res.status(403).json({ error: 'Admin access is required for this action.' })
  }
  next()
}

function publicCatalog(catalog) {
  return {
    ...catalog,
    resources: catalog.resources.map((resource) => ({
      ...getMedia(resource.id),
      ...resource,
    })),
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'aristotool-api' })
})

app.get(
  '/api/auth/me',
  asyncHandler(async (req, res) => {
    const user = await findUserBySession(sessionToken(req))
    res.json({ user: serializeUser(user) })
  }),
)

app.post(
  '/api/auth/register',
  asyncHandler(async (req, res) => {
    const name = String(req.body?.name || '').trim()
    const email = String(req.body?.email || '').toLowerCase().trim()
    const password = String(req.body?.password || '')

    if (name.length < 2) return res.status(400).json({ error: 'Enter your name.' })
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Enter a valid email address.' })
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Use at least 8 characters for your password.' })
    }
    if (await findUserByEmail(email)) {
      return res.status(409).json({ error: 'An account with that email already exists.' })
    }

    const user = await createUser({ name, email, password })
    const { code } = await createConfirmation(user.id)
    await deliverOtp(email, code)
    try {
      await sendAdminSignupNotification({ name, email, createdAt: user.created_at })
    } catch (notificationError) {
      console.error(`Admin signup notification to ${adminNotificationRecipient()} failed:`, notificationError.message)
    }
    res.status(201).json({
      user: serializeUser(user),
      message: 'Account created. We sent a 6-digit verification code to your email.',
      ...devOtpFields(code),
    })
  }),
)

app.post(
  '/api/auth/confirm',
  asyncHandler(async (req, res) => {
    const token = String(req.body?.token || '').trim()
    const confirmation = await findConfirmation(token)
    if (!confirmation) {
      return res.status(400).json({ error: 'That confirmation link is invalid or has already been used.' })
    }

    const user = await consumeConfirmation(token, confirmation.user_id)
    const session = await createSession(user.id)
    setSessionCookie(res, session)
    res.json({ user: serializeUser(user) })
  }),
)

app.post(
  '/api/auth/verify-otp',
  asyncHandler(async (req, res) => {
    const email = String(req.body?.email || '').toLowerCase().trim()
    const code = String(req.body?.code || '').trim()
    if (!email || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: 'Enter the 6-digit code from your email.' })
    }

    let user
    try {
      user = await verifyConfirmationCode(email, code)
    } catch (error) {
      return res.status(400).json({ error: error.message })
    }

    const session = await createSession(user.id)
    setSessionCookie(res, session)
    res.json({ user: serializeUser(user) })
  }),
)

app.post(
  '/api/auth/resend',
  asyncHandler(async (req, res) => {
    const email = String(req.body?.email || '').toLowerCase().trim()
    const user = await findUserByEmail(email)
    if (!user || user.confirmed) {
      return res.json({ message: 'If that account needs confirmation, a new code has been sent.' })
    }
    if (await hasRecentConfirmation(email, 45)) {
      return res.status(429).json({ error: 'Please wait a moment before requesting another code.' })
    }
    const { code } = await createConfirmation(user.id)
    await deliverOtp(email, code)
    res.json({
      message: 'A new 6-digit code has been sent to your email.',
      ...devOtpFields(code),
    })
  }),
)

app.post(
  '/api/auth/login',
  asyncHandler(async (req, res) => {
    const email = String(req.body?.email || '').toLowerCase().trim()
    const password = String(req.body?.password || '')
    const user = await findUserByEmail(email)

    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Email or password is incorrect.' })
    }
    if (!user.confirmed) {
      return res.status(403).json({ error: 'Confirm your email before signing in.', needsConfirmation: true })
    }

    const session = await createSession(user.id)
    setSessionCookie(res, session)
    res.json({ user: serializeUser(user) })
  }),
)

app.post(
  '/api/auth/logout',
  asyncHandler(async (req, res) => {
    await deleteSession(sessionToken(req))
    const secure = process.env.VERCEL ? '; Secure' : ''
    res.setHeader('Set-Cookie', `aristotool_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`)
    res.json({ ok: true })
  }),
)

app.post(
  '/api/auth/onboarding',
  asyncHandler(requireAuth),
  asyncHandler(async (req, res) => {
    const interestsRaw = req.body?.interests
    const interests = Array.isArray(interestsRaw)
      ? interestsRaw.filter(Boolean).join(',')
      : String(interestsRaw || '').trim()
    const experience = String(req.body?.experience || '').trim()
    const goals = String(req.body?.goals || '').trim()

    if (!interests) return res.status(400).json({ error: 'Choose at least one area of interest.' })
    if (!experience) return res.status(400).json({ error: 'Choose your current experience level.' })
    if (goals.length < 8) return res.status(400).json({ error: 'Tell us a little more about your goal.' })

    const user = await saveOnboarding(req.user.id, { interests, experience, goals })
    res.json({ user: serializeUser(user) })
  }),
)

app.get(
  '/api/catalog',
  asyncHandler(async (_req, res) => {
    res.json(publicCatalog(await getCatalog()))
  }),
)

app.get(
  '/api/export/catalog',
  asyncHandler(async (_req, res) => {
    const catalog = publicCatalog(await getCatalog())
    res.setHeader('Content-Disposition', 'attachment; filename="aristotool-catalog.json"')
    res.json(catalogExport(catalog.resources, catalog.paths))
  }),
)

app.get(
  '/api/export/resource/:id',
  asyncHandler(async (req, res) => {
    const id = String(req.params.id || '')
    const catalog = publicCatalog(await getCatalog())
    const resource = catalog.resources.find((item) => item.id === id)
    if (!resource) return res.status(404).json({ error: 'Resource not found.' })
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${packFilename(resource.title)}.md"`)
    res.send(resourceMarkdown(resource, resource))
  }),
)

app.get(
  '/api/export/progress',
  asyncHandler(requireAuth),
  asyncHandler(async (req, res) => {
    const [progress, catalog] = await Promise.all([getProgress(req.user.id), getCatalog()])
    res.setHeader('Content-Disposition', 'attachment; filename="aristotool-progress.json"')
    res.json(progressExport(progress, catalog.resources, req.user))
  }),
)

app.get(
  '/api/state',
  asyncHandler(requireAuth),
  asyncHandler(async (req, res) => {
    res.json({ progress: await getProgress(req.user.id) })
  }),
)

app.post(
  '/api/progress',
  asyncHandler(requireAuth),
  asyncHandler(async (req, res) => {
    const resourceId = String(req.body?.resourceId || '')
    const kind = String(req.body?.kind || '')
    const value = Boolean(req.body?.value)

    if (!resourceId) return res.status(400).json({ error: 'Missing resource.' })
    if (!['bookmarks', 'completed', 'started'].includes(kind)) {
      return res.status(400).json({ error: 'Unsupported progress type.' })
    }

    await setProgress(req.user.id, resourceId, kind, value)
    res.json({ progress: await getProgress(req.user.id) })
  }),
)

app.get(
  '/api/admin/stats',
  asyncHandler(requireAuth),
  asyncHandler(requireAdmin),
  asyncHandler(async (_req, res) => {
    res.json(await getAdminStats())
  }),
)

app.get(
  '/api/admin/catalog',
  asyncHandler(requireAuth),
  asyncHandler(requireAdmin),
  asyncHandler(async (_req, res) => {
    res.json(publicCatalog(await getCatalog()))
  }),
)

app.post(
  '/api/admin/resources',
  asyncHandler(requireAuth),
  asyncHandler(requireAdmin),
  asyncHandler(async (req, res) => {
    const resource = parseOrFail(normalizeResource, req.body)
    await upsertResources([resource])
    res.status(201).json({ resource, catalog: publicCatalog(await getCatalog()) })
  }),
)

app.post(
  '/api/admin/paths',
  asyncHandler(requireAuth),
  asyncHandler(requireAdmin),
  asyncHandler(async (req, res) => {
    const path = parseOrFail(normalizePath, req.body)
    await upsertPaths([path])
    res.status(201).json({ path, catalog: publicCatalog(await getCatalog()) })
  }),
)

app.post(
  '/api/admin/upload',
  asyncHandler(requireAuth),
  asyncHandler(requireAdmin),
  asyncHandler(async (req, res) => {
    const payload = parseOrFail(normalizeUpload, req.body)
    await upsertResources(payload.resources)
    await upsertPaths(payload.paths)
    res.json({
      resources: payload.resources.length,
      paths: payload.paths.length,
      catalog: publicCatalog(await getCatalog()),
    })
  }),
)

app.delete(
  '/api/admin/resources/:id',
  asyncHandler(requireAuth),
  asyncHandler(requireAdmin),
  asyncHandler(async (req, res) => {
    await deleteResource(req.params.id)
    res.json({ ok: true, catalog: publicCatalog(await getCatalog()) })
  }),
)

app.delete(
  '/api/admin/paths/:id',
  asyncHandler(requireAuth),
  asyncHandler(requireAdmin),
  asyncHandler(async (req, res) => {
    await deletePath(req.params.id)
    res.json({ ok: true, catalog: publicCatalog(await getCatalog()) })
  }),
)

app.get(
  '/api/community/messages',
  asyncHandler(requireAuth),
  asyncHandler(async (req, res) => {
    const messages = await listChatMessages(req.user.id, Boolean(req.user.is_admin), req.query.limit)
    res.json({ messages })
  }),
)

app.post(
  '/api/community/messages',
  asyncHandler(requireAuth),
  asyncHandler(async (req, res) => {
    if (!allowRate(`message:${req.user.id}`, 12, 30_000)) {
      return res.status(429).json({ error: 'You are posting too quickly. Take a breath and try again shortly.' })
    }
    const body = String(req.body?.body || '')
      .replace(/[\u0000-\u001f\u007f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    const attachmentId = String(req.body?.attachmentId || '').trim()
    if (body.length > MAX_CHAT_BODY) {
      return res.status(400).json({ error: `Keep messages under ${MAX_CHAT_BODY} characters.` })
    }
    if (!body && !attachmentId) {
      return res.status(400).json({ error: 'Write a message or attach a screenshot.' })
    }

    let attachment = null
    if (attachmentId) {
      attachment = await findOwnedUnusedAttachment(attachmentId, req.user.id)
      if (!attachment) {
        return res.status(400).json({ error: 'That screenshot is no longer available. Please upload it again.' })
      }
    }

    const message = await createChatMessage({
      userId: req.user.id,
      authorName: safeDisplayName(req.user.name),
      body,
      attachmentId: attachment?.id || null,
    })
    if (!message) return res.status(500).json({ error: 'The message could not be saved.' })
    res.status(201).json({ message })
  }),
)

app.post(
  '/api/community/attachments',
  asyncHandler(requireAuth),
  asyncHandler(async (req, res) => {
    if (!allowRate(`attachment:${req.user.id}`, 8, 60_000)) {
      return res.status(429).json({ error: 'Too many screenshots at once. Please wait a moment.' })
    }
    const image = decodeImage(req.body?.data)
    await pruneUnusedAttachments(req.user.id)
    const attachment = await createChatAttachment({
      userId: req.user.id,
      contentType: image.contentType,
      data: image.data,
    })
    res.status(201).json({
      attachment: { id: attachment.id, contentType: image.contentType, size: image.buffer.length },
    })
  }),
)

app.get(
  '/api/community/attachments/:id',
  asyncHandler(requireAuth),
  asyncHandler(async (req, res) => {
    const attachment = await findChatAttachment(req.params.id)
    if (!attachment) return res.status(404).end()
    res.setHeader('Content-Type', String(attachment.content_type))
    res.setHeader('Content-Disposition', 'inline; filename="screenshot"')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox")
    res.setHeader('Cache-Control', 'private, max-age=3600')
    res.setHeader('Referrer-Policy', 'no-referrer')
    res.send(Buffer.from(String(attachment.data), 'base64'))
  }),
)

app.delete(
  '/api/community/messages/:id',
  asyncHandler(requireAuth),
  asyncHandler(async (req, res) => {
    const result = await deleteChatMessage(req.params.id, req.user.id, Boolean(req.user.is_admin))
    if (result === 'missing') return res.status(404).json({ error: 'That message has already been removed.' })
    if (result === 'forbidden') return res.status(403).json({ error: 'You can only remove your own messages.' })
    res.json({ ok: true })
  }),
)

app.use((error, _req, res, _next) => {
  if (!error.status) console.error(error)
  res.status(error.status || 500).json({ error: error.status ? error.message : 'Something went wrong on the server.' })
})

if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Aristotool API listening on http://localhost:${port}`)
  })
}

export default app
