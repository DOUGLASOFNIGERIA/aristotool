import express from 'express'
import {
  findConfirmation,
  consumeConfirmation,
  createConfirmation,
  createSession,
  createUser,
  deleteSession,
  findUserByEmail,
  findUserBySession,
  getCatalog,
  getProgress,
  saveOnboarding,
  serializeUser,
  setProgress,
  verifyPassword,
} from './db.js'
import { getMedia } from '../src/data/resources.js'

const app = express()
const port = Number(process.env.PORT || 3001)

app.use(express.json({ limit: '1mb' }))

function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next)
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

async function requireAuth(req, res, next) {
  const user = await findUserBySession(sessionToken(req))
  if (!user) {
    return res.status(401).json({ error: 'Your session has expired. Please sign in again.' })
  }
  req.user = user
  next()
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
    const confirmToken = await createConfirmation(user.id)
    res.status(201).json({
      user: serializeUser(user),
      confirmToken,
      message: 'Account created. Confirm your email to continue.',
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
  '/api/auth/resend',
  asyncHandler(async (req, res) => {
    const email = String(req.body?.email || '').toLowerCase().trim()
    const user = await findUserByEmail(email)
    if (!user || user.confirmed) {
      return res.json({ message: 'If that account needs confirmation, a new link has been issued.' })
    }
    const confirmToken = await createConfirmation(user.id)
    res.json({ confirmToken, message: 'A new confirmation link is ready.' })
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
    const catalog = await getCatalog()
    res.json({
      ...catalog,
      resources: catalog.resources.map((resource) => ({
        ...resource,
        ...getMedia(resource.id),
      })),
    })
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

app.use((error, _req, res, _next) => {
  console.error(error)
  res.status(500).json({ error: 'Something went wrong on the server.' })
})

if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Aristotool API listening on http://localhost:${port}`)
  })
}

export default app
