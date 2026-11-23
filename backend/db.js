import { createClient } from '@tursodatabase/serverless/compat'
import { randomBytes, randomInt, scryptSync, timingSafeEqual } from 'node:crypto'
import {
  resources,
  learningPaths,
  getMedia,
} from '../src/data/resources.js'

const url = process.env.TURSO_DATABASE_URL
const authToken = process.env.TURSO_AUTH_TOKEN

if (!url) {
  throw new Error('TURSO_DATABASE_URL is required')
}

function adminEmails() {
  return String(process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.toLowerCase().trim())
    .filter(Boolean)
}

function positiveNumber(value, fallback) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function nonNegativeNumber(value, fallback) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

const otpTtlMinutes = positiveNumber(process.env.OTP_TTL_MINUTES, 10)
const otpMaxAttempts = positiveNumber(process.env.OTP_MAX_ATTEMPTS, 5)
const chatRetentionDays = nonNegativeNumber(process.env.CHAT_RETENTION_DAYS, 30)

function generateOtp() {
  return String(randomInt(0, 1000000)).padStart(6, '0')
}

export const db = createClient({ url, authToken })

export async function initDb() {
  await db.batch(
    [
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        confirmed INTEGER NOT NULL DEFAULT 0,
        onboarded INTEGER NOT NULL DEFAULT 0,
        interests TEXT NOT NULL DEFAULT '',
        experience TEXT NOT NULL DEFAULT '',
        goals TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS confirmations (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL,
        consumed INTEGER NOT NULL DEFAULT 0,
        code_hash TEXT NOT NULL DEFAULT '',
        expires_at TEXT NOT NULL DEFAULT '',
        attempts INTEGER NOT NULL DEFAULT 0
      )`,
      `CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        resource_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        value INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT NOT NULL,
        UNIQUE(user_id, resource_id, kind)
      )`,
      `CREATE TABLE IF NOT EXISTS catalog_resources (
        id TEXT PRIMARY KEY,
        payload TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS catalog_paths (
        id TEXT PRIMARY KEY,
        payload TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        author_name TEXT NOT NULL,
        body TEXT NOT NULL,
        created_at TEXT NOT NULL,
        attachment_id TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS chat_attachments (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content_type TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`,
      'CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_chat_attachments_user ON chat_attachments(user_id)',
    ],
    'write',
  )

  const userColumns = await db.execute('PRAGMA table_info(users)')
  const hasAdminColumn = userColumns.rows.some((column) => String(column.name) === 'is_admin')
  if (!hasAdminColumn) {
    await db.execute('ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0')
  }

  const confirmationColumns = await db.execute('PRAGMA table_info(confirmations)')
  const confirmationColumnNames = confirmationColumns.rows.map((column) => String(column.name))
  if (!confirmationColumnNames.includes('code_hash')) {
    await db.execute("ALTER TABLE confirmations ADD COLUMN code_hash TEXT NOT NULL DEFAULT ''")
  }
  if (!confirmationColumnNames.includes('expires_at')) {
    await db.execute("ALTER TABLE confirmations ADD COLUMN expires_at TEXT NOT NULL DEFAULT ''")
  }
  if (!confirmationColumnNames.includes('attempts')) {
    await db.execute('ALTER TABLE confirmations ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0')
  }

  await seed()
}

export function createToken() {
  return randomBytes(24).toString('base64url')
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password, stored) {
  const [salt, hash] = String(stored).split(':')
  if (!salt || !hash) return false
  const candidate = scryptSync(password, salt, 64)
  const expected = Buffer.from(hash, 'hex')
  if (candidate.length !== expected.length) return false
  return timingSafeEqual(candidate, expected)
}

export async function findUserByEmail(email) {
  const { rows } = await db.execute({
    sql: 'SELECT * FROM users WHERE email = ?',
    args: [String(email).toLowerCase().trim()],
  })
  return rows[0] || null
}

export async function findUserById(id) {
  const { rows } = await db.execute({
    sql: 'SELECT * FROM users WHERE id = ?',
    args: [id],
  })
  return rows[0] || null
}

export async function findUserBySession(token) {
  if (!token) return null
  const { rows } = await db.execute({
    sql: `SELECT u.* FROM sessions s
          JOIN users u ON u.id = s.user_id
          WHERE s.token = ?`,
    args: [token],
  })
  return rows[0] || null
}

export async function createUser({ name, email, password }) {
  const id = `usr_${createToken()}`
  await db.execute({
    sql: `INSERT INTO users (id, name, email, password_hash, created_at)
          VALUES (?, ?, ?, ?, ?)`,
    args: [
      id,
      name,
      String(email).toLowerCase().trim(),
      hashPassword(password),
      new Date().toISOString(),
    ],
  })
  return findUserById(id)
}

export async function createConfirmation(userId) {
  const token = createToken()
  const code = generateOtp()
  const createdAt = new Date()
  const expiresAt = new Date(createdAt.getTime() + otpTtlMinutes * 60 * 1000)
  await db.batch(
    [
      {
        sql: 'UPDATE confirmations SET consumed = 1 WHERE user_id = ? AND consumed = 0',
        args: [userId],
      },
      {
        sql: `INSERT INTO confirmations (token, user_id, created_at, code_hash, expires_at, attempts)
              VALUES (?, ?, ?, ?, ?, 0)`,
        args: [token, userId, createdAt.toISOString(), hashPassword(code), expiresAt.toISOString()],
      },
    ],
    'write',
  )
  return { token, code }
}

export async function findConfirmation(token) {
  if (!token) return null
  const { rows } = await db.execute({
    sql: 'SELECT * FROM confirmations WHERE token = ? AND consumed = 0',
    args: [token],
  })
  return rows[0] || null
}

export async function findActiveConfirmationByEmail(email) {
  const { rows } = await db.execute({
    sql: `SELECT c.* FROM confirmations c
          JOIN users u ON u.id = c.user_id
          WHERE u.email = ? AND c.consumed = 0
          ORDER BY c.created_at DESC LIMIT 1`,
    args: [String(email).toLowerCase().trim()],
  })
  return rows[0] || null
}

export async function hasRecentConfirmation(email, seconds = 45) {
  const cutoff = new Date(Date.now() - positiveNumber(seconds, 45) * 1000).toISOString()
  const { rows } = await db.execute({
    sql: `SELECT c.token FROM confirmations c
          JOIN users u ON u.id = c.user_id
          WHERE u.email = ? AND c.consumed = 0 AND c.created_at > ?
          LIMIT 1`,
    args: [String(email).toLowerCase().trim(), cutoff],
  })
  return Boolean(rows[0])
}

export async function verifyConfirmationCode(email, code) {
  const confirmation = await findActiveConfirmationByEmail(email)
  if (!confirmation) {
    throw new Error('No active verification code found. Request a new one.')
  }
  if (confirmation.expires_at && new Date(confirmation.expires_at).getTime() < Date.now()) {
    throw new Error('That code has expired. Request a new one.')
  }
  if (Number(confirmation.attempts || 0) >= otpMaxAttempts) {
    throw new Error('Too many incorrect attempts. Request a new code.')
  }
  if (!verifyPassword(String(code).trim(), confirmation.code_hash)) {
    await db.execute({
      sql: 'UPDATE confirmations SET attempts = attempts + 1 WHERE token = ?',
      args: [confirmation.token],
    })
    throw new Error('That code is not correct. Check your email and try again.')
  }
  return consumeConfirmation(confirmation.token, confirmation.user_id)
}

export async function consumeConfirmation(token, userId) {
  await db.batch(
    [
      {
        sql: 'UPDATE confirmations SET consumed = 1 WHERE token = ?',
        args: [token],
      },
      {
        sql: 'UPDATE users SET confirmed = 1 WHERE id = ?',
        args: [userId],
      },
    ],
    'write',
  )
  return findUserById(userId)
}

export async function createSession(userId) {
  const token = createToken()
  await db.execute({
    sql: 'INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)',
    args: [token, userId, new Date().toISOString()],
  })
  return token
}

export async function deleteSession(token) {
  if (!token) return
  await db.execute({
    sql: 'DELETE FROM sessions WHERE token = ?',
    args: [token],
  })
}

export async function saveOnboarding(userId, { interests, experience, goals }) {
  await db.execute({
    sql: `UPDATE users
          SET interests = ?, experience = ?, goals = ?, onboarded = 1
          WHERE id = ?`,
    args: [interests, experience, goals, userId],
  })
  return findUserById(userId)
}

export async function getAdminStats() {
  const now = new Date()
  const dayMs = 24 * 60 * 60 * 1000
  const startOfUtcDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const daysAgo = (days) => new Date(startOfUtcDay - days * dayMs).toISOString()
  const demoEmail = 'demo@aristotool.dev'

  async function count(sql, args = []) {
    const { rows } = await db.execute({ sql, args })
    return Number(rows[0]?.value || 0)
  }

  const [
    totalSignups,
    signupsToday,
    signups7d,
    signups30d,
    confirmed,
    onboarded,
    activeLearners,
    started,
    completed,
  ] = await Promise.all([
    count('SELECT COUNT(*) AS value FROM users WHERE email <> ?', [demoEmail]),
    count('SELECT COUNT(*) AS value FROM users WHERE email <> ? AND created_at >= ?', [
      demoEmail,
      daysAgo(0),
    ]),
    count('SELECT COUNT(*) AS value FROM users WHERE email <> ? AND created_at >= ?', [
      demoEmail,
      daysAgo(6),
    ]),
    count('SELECT COUNT(*) AS value FROM users WHERE email <> ? AND created_at >= ?', [
      demoEmail,
      daysAgo(29),
    ]),
    count('SELECT COUNT(*) AS value FROM users WHERE email <> ? AND confirmed = 1', [demoEmail]),
    count('SELECT COUNT(*) AS value FROM users WHERE email <> ? AND onboarded = 1', [demoEmail]),
    count(
      `SELECT COUNT(DISTINCT p.user_id) AS value
       FROM progress p JOIN users u ON u.id = p.user_id
       WHERE p.value = 1 AND u.email <> ?`,
      [demoEmail],
    ),
    count(
      `SELECT COUNT(*) AS value
       FROM progress p JOIN users u ON u.id = p.user_id
       WHERE p.kind = 'started' AND p.value = 1 AND u.email <> ?`,
      [demoEmail],
    ),
    count(
      `SELECT COUNT(*) AS value
       FROM progress p JOIN users u ON u.id = p.user_id
       WHERE p.kind = 'completed' AND p.value = 1 AND u.email <> ?`,
      [demoEmail],
    ),
  ])

  const dailyRows = await db.execute({
    sql: `SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS value
          FROM users
          WHERE email <> ? AND created_at >= ?
          GROUP BY day ORDER BY day`,
    args: [demoEmail, daysAgo(6)],
  })
  const dailyCounts = new Map(
    dailyRows.rows.map((row) => [String(row.day), Number(row.value || 0)]),
  )
  const daily = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(startOfUtcDay - (6 - index) * dayMs)
    const day = date.toISOString().slice(0, 10)
    return {
      day,
      label: date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
      signups: dailyCounts.get(day) || 0,
    }
  })

  const experienceRows = await db.execute({
    sql: `SELECT experience, COUNT(*) AS value
          FROM users
          WHERE email <> ? AND onboarded = 1 AND experience <> ''
          GROUP BY experience ORDER BY value DESC`,
    args: [demoEmail],
  })
  const experience = experienceRows.rows.map((row) => ({
    level: String(row.experience),
    count: Number(row.value || 0),
  }))

  const recentRows = await db.execute({
    sql: `SELECT name, email, created_at, confirmed, onboarded
          FROM users WHERE email <> ?
          ORDER BY created_at DESC LIMIT 5`,
    args: [demoEmail],
  })
  const recentSignups = recentRows.rows.map((row) => ({
    name: String(row.name),
    email: String(row.email),
    createdAt: String(row.created_at),
    confirmed: Boolean(row.confirmed),
    onboarded: Boolean(row.onboarded),
  }))

  return {
    totalSignups,
    signupsToday,
    signups7d,
    signups30d,
    confirmed,
    onboarded,
    activeLearners,
    started,
    completed,
    daily,
    experience,
    recentSignups,
    generatedAt: now.toISOString(),
  }
}

export function serializeUser(user) {
  if (!user) return null
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    confirmed: Boolean(user.confirmed),
    onboarded: Boolean(user.onboarded),
    isAdmin: Boolean(user.is_admin),
    interests: user.interests ? String(user.interests).split(',') : [],
    experience: user.experience,
    goals: user.goals,
  }
}

export async function getCatalog() {
  const resourceResult = await db.execute('SELECT payload FROM catalog_resources')
  const pathResult = await db.execute('SELECT payload FROM catalog_paths')
  return {
    resources: resourceResult.rows.map((row) => JSON.parse(String(row.payload))),
    paths: pathResult.rows.map((row) => JSON.parse(String(row.payload))),
  }
}

export async function upsertResources(items) {
  if (!items.length) return []
  await db.batch(
    items.map((item) => ({
      sql: `INSERT INTO catalog_resources (id, payload) VALUES (?, ?)
            ON CONFLICT(id) DO UPDATE SET payload = excluded.payload`,
      args: [item.id, JSON.stringify(item)],
    })),
    'write',
  )
  return items
}

export async function upsertPaths(items) {
  if (!items.length) return []
  await db.batch(
    items.map((item) => ({
      sql: `INSERT INTO catalog_paths (id, payload) VALUES (?, ?)
            ON CONFLICT(id) DO UPDATE SET payload = excluded.payload`,
      args: [item.id, JSON.stringify(item)],
    })),
    'write',
  )
  return items
}

export async function deleteResource(id) {
  await db.execute({
    sql: 'DELETE FROM catalog_resources WHERE id = ?',
    args: [String(id)],
  })
}

export async function deletePath(id) {
  await db.execute({
    sql: 'DELETE FROM catalog_paths WHERE id = ?',
    args: [String(id)],
  })
}

export async function getProgress(userId) {
  const { rows } = await db.execute({
    sql: 'SELECT resource_id, kind, value FROM progress WHERE user_id = ?',
    args: [userId],
  })
  return rows.reduce(
    (acc, row) => {
      if (!acc[row.kind]) acc[row.kind] = []
      if (row.value) acc[row.kind].push(row.resource_id)
      return acc
    },
    { bookmarks: [], completed: [], started: [] },
  )
}

export async function setProgress(userId, resourceId, kind, value) {
  await db.execute({
    sql: `INSERT INTO progress (user_id, resource_id, kind, value, updated_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(user_id, resource_id, kind)
          DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    args: [userId, resourceId, kind, value ? 1 : 0, new Date().toISOString()],
  })
}

export function safeDisplayName(name) {
  return String(name || 'Learner')
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, '[email]')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40) || 'Learner'
}

function initialsFor(name) {
  return (
    String(name)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('') || '?'
  )
}

function serializeChatMessage(row, viewerId, isAdmin) {
  const own = String(row.user_id) === String(viewerId)
  return {
    id: String(row.id),
    body: String(row.body),
    createdAt: String(row.created_at),
    authorName: String(row.author_name),
    authorInitials: initialsFor(row.author_name),
    own,
    canDelete: own || isAdmin,
    attachment: row.attachment_id
      ? { id: String(row.attachment_id), contentType: String(row.attachment_content_type || '') }
      : null,
  }
}

export async function listChatMessages(viewerId, isAdmin, limit = 100) {
  const { rows } = await db.execute({
    sql: `SELECT m.id, m.user_id, m.author_name, m.body, m.created_at,
                 m.attachment_id, a.content_type AS attachment_content_type
          FROM chat_messages m
          LEFT JOIN chat_attachments a ON a.id = m.attachment_id
          ORDER BY m.created_at DESC, m.id DESC
          LIMIT ?`,
    args: [Math.min(Math.max(Number(limit) || 100, 1), 100)],
  })
  return rows
    .reverse()
    .map((row) => serializeChatMessage(row, viewerId, isAdmin))
}

export async function createChatAttachment({ userId, contentType, data }) {
  const id = `att_${createToken()}`
  await db.execute({
    sql: `INSERT INTO chat_attachments (id, user_id, content_type, data, created_at)
          VALUES (?, ?, ?, ?, ?)`,
    args: [id, userId, contentType, data, new Date().toISOString()],
  })
  return { id, contentType }
}

export async function findChatAttachment(id) {
  if (!id) return null
  const { rows } = await db.execute({
    sql: 'SELECT * FROM chat_attachments WHERE id = ?',
    args: [String(id)],
  })
  return rows[0] || null
}

export async function findOwnedUnusedAttachment(id, userId) {
  if (!id) return null
  const { rows } = await db.execute({
    sql: `SELECT a.* FROM chat_attachments a
          LEFT JOIN chat_messages m ON m.attachment_id = a.id
          WHERE a.id = ? AND a.user_id = ? AND m.id IS NULL`,
    args: [String(id), userId],
  })
  return rows[0] || null
}

export async function pruneUnusedAttachments(userId) {
  const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  await db.execute({
    sql: `DELETE FROM chat_attachments
          WHERE user_id = ? AND created_at < ?
            AND id NOT IN (SELECT attachment_id FROM chat_messages WHERE attachment_id IS NOT NULL)`,
    args: [userId, cutoff],
  })
}

export async function createChatMessage({ userId, authorName, body, attachmentId }) {
  const id = `msg_${createToken()}`
  await db.execute({
    sql: `INSERT INTO chat_messages (id, user_id, author_name, body, created_at, attachment_id)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [id, userId, authorName, body, new Date().toISOString(), attachmentId || null],
  })
  const { rows } = await db.execute({
    sql: `SELECT m.id, m.user_id, m.author_name, m.body, m.created_at,
                 m.attachment_id, a.content_type AS attachment_content_type
          FROM chat_messages m
          LEFT JOIN chat_attachments a ON a.id = m.attachment_id
          WHERE m.id = ?`,
    args: [id],
  })
  const message = rows[0] ? serializeChatMessage(rows[0], userId, false) : null
  const cutoff = new Date(Date.now() - chatRetentionDays * 24 * 60 * 60 * 1000).toISOString()
  await db.batch(
    [
      { sql: 'DELETE FROM chat_messages WHERE created_at < ?', args: [cutoff] },
      { sql: 'DELETE FROM chat_attachments WHERE created_at < ?', args: [cutoff] },
    ],
    'write',
  )
  return message
}

export async function deleteChatMessage(id, viewerId, isAdmin) {
  const { rows } = await db.execute({
    sql: 'SELECT user_id, attachment_id FROM chat_messages WHERE id = ?',
    args: [String(id)],
  })
  const message = rows[0]
  if (!message) return 'missing'
  if (!isAdmin && String(message.user_id) !== String(viewerId)) return 'forbidden'
  await db.batch(
    [
      { sql: 'DELETE FROM chat_messages WHERE id = ?', args: [String(id)] },
      { sql: 'DELETE FROM chat_attachments WHERE id = ?', args: [message.attachment_id || ''] },
    ],
    'write',
  )
  return 'ok'
}

async function seed() {
  const statements = []
  for (const resource of resources) {
    statements.push({
      sql: `INSERT INTO catalog_resources (id, payload) VALUES (?, ?)
            ON CONFLICT(id) DO UPDATE SET payload = excluded.payload`,
      args: [resource.id, JSON.stringify({ ...resource, media: getMedia(resource.id) })],
    })
  }
  for (const path of learningPaths) {
    statements.push({
      sql: `INSERT INTO catalog_paths (id, payload) VALUES (?, ?)
            ON CONFLICT(id) DO UPDATE SET payload = excluded.payload`,
      args: [path.id, JSON.stringify(path)],
    })
  }
  await db.batch(statements, 'write')

  const demoEmail = 'demo@aristotool.dev'
  let demo = await findUserByEmail(demoEmail)
  if (!demo) {
    demo = await createUser({
      name: 'Demo Learner',
      email: demoEmail,
      password: 'Demo1234!',
    })
  }
  await db.execute({
    sql: `UPDATE users
          SET confirmed = 1,
              onboarded = 1,
              interests = ?,
              experience = ?,
              goals = ?
          WHERE id = ?`,
    args: [
      'Web Application,Network Security',
      'beginner',
      'Build a safe, repeatable learning habit',
      demo.id,
    ],
  })

  for (const email of adminEmails()) {
    await db.execute({
      sql: 'UPDATE users SET is_admin = 1 WHERE email = ?',
      args: [email],
    })
  }

  const progress = await getProgress(demo.id)
  if (progress.bookmarks.length === 0) {
    await db.batch(
      [
        [demo.id, 'v2', 'bookmarks'],
        [demo.id, 'l2', 'bookmarks'],
        [demo.id, 'v1', 'completed'],
        [demo.id, 'n1', 'completed'],
        [demo.id, 'v2', 'started'],
        [demo.id, 'l2', 'started'],
      ].map(([userId, resourceId, kind]) => ({
        sql: `INSERT INTO progress (user_id, resource_id, kind, value, updated_at)
              VALUES (?, ?, ?, 1, ?)
              ON CONFLICT(user_id, resource_id, kind)
              DO UPDATE SET value = 1, updated_at = excluded.updated_at`,
        args: [userId, resourceId, kind, new Date().toISOString()],
      })),
      'write',
    )
  }
}

await initDb()
