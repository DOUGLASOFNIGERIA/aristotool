import { DatabaseSync } from 'node:sqlite'
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  resources,
  learningPaths,
  getMedia,
} from '../src/data/resources.js'

const dataDir = fileURLToPath(new URL('./data/', import.meta.url))
mkdirSync(dataDir, { recursive: true })

export const db = new DatabaseSync(join(dataDir, 'aristotool.db'))

db.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
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
  );

  CREATE TABLE IF NOT EXISTS confirmations (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    consumed INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    resource_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    value INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL,
    UNIQUE(user_id, resource_id, kind)
  );

  CREATE TABLE IF NOT EXISTS catalog_resources (
    id TEXT PRIMARY KEY,
    payload TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS catalog_paths (
    id TEXT PRIMARY KEY,
    payload TEXT NOT NULL
  );
`)

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

export function findUserByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(String(email).toLowerCase().trim()) || null
}

export function findUserById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) || null
}

export function findUserBySession(token) {
  if (!token) return null
  return db
    .prepare(
      `SELECT u.* FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = ?`,
    )
    .get(token) || null
}

export function createUser({ name, email, password }) {
  const id = `usr_${createToken()}`
  db.prepare(
    `INSERT INTO users (id, name, email, password_hash, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(id, name, String(email).toLowerCase().trim(), hashPassword(password), new Date().toISOString())
  return findUserById(id)
}

export function createConfirmation(userId) {
  const token = createToken()
  db.prepare(
    `UPDATE confirmations SET consumed = 1 WHERE user_id = ? AND consumed = 0`,
  ).run(userId)
  db.prepare(
    `INSERT INTO confirmations (token, user_id, created_at) VALUES (?, ?, ?)`,
  ).run(token, userId, new Date().toISOString())
  return token
}

export function findConfirmation(token) {
  if (!token) return null
  return db.prepare('SELECT * FROM confirmations WHERE token = ? AND consumed = 0').get(token) || null
}

export function consumeConfirmation(token, userId) {
  db.prepare('UPDATE confirmations SET consumed = 1 WHERE token = ?').run(token)
  db.prepare('UPDATE users SET confirmed = 1 WHERE id = ?').run(userId)
  return findUserById(userId)
}

export function createSession(userId) {
  const token = createToken()
  db.prepare('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)').run(
    token,
    userId,
    new Date().toISOString(),
  )
  return token
}

export function deleteSession(token) {
  if (!token) return
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token)
}

export function saveOnboarding(userId, { interests, experience, goals }) {
  db.prepare(
    `UPDATE users
     SET interests = ?, experience = ?, goals = ?, onboarded = 1
     WHERE id = ?`,
  ).run(interests, experience, goals, userId)
  return findUserById(userId)
}

export function serializeUser(user) {
  if (!user) return null
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    confirmed: Boolean(user.confirmed),
    onboarded: Boolean(user.onboarded),
    interests: user.interests ? user.interests.split(',') : [],
    experience: user.experience,
    goals: user.goals,
  }
}

export function getCatalog() {
  const resourceRows = db.prepare('SELECT payload FROM catalog_resources').all()
  const pathRows = db.prepare('SELECT payload FROM catalog_paths').all()
  return {
    resources: resourceRows.map((row) => JSON.parse(row.payload)),
    paths: pathRows.map((row) => JSON.parse(row.payload)),
  }
}

export function getProgress(userId) {
  const rows = db
    .prepare('SELECT resource_id, kind, value FROM progress WHERE user_id = ?')
    .all(userId)
  return rows.reduce((acc, row) => {
    if (!acc[row.kind]) acc[row.kind] = []
    if (row.value) acc[row.kind].push(row.resource_id)
    return acc
  }, { bookmarks: [], completed: [], started: [] })
}

export function setProgress(userId, resourceId, kind, value) {
  db.prepare(
    `INSERT INTO progress (user_id, resource_id, kind, value, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id, resource_id, kind)
     DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
  ).run(userId, resourceId, kind, value ? 1 : 0, new Date().toISOString())
}

function seed() {
  const resourceUpsert = db.prepare(
    `INSERT INTO catalog_resources (id, payload) VALUES (?, ?)
     ON CONFLICT(id) DO UPDATE SET payload = excluded.payload`,
  )
  const pathUpsert = db.prepare(
    `INSERT INTO catalog_paths (id, payload) VALUES (?, ?)
     ON CONFLICT(id) DO UPDATE SET payload = excluded.payload`,
  )

  for (const resource of resources) {
    resourceUpsert.run(resource.id, JSON.stringify({ ...resource, media: getMedia(resource.id) }))
  }
  for (const path of learningPaths) {
    pathUpsert.run(path.id, JSON.stringify(path))
  }

  const demoEmail = 'demo@aristotool.dev'
  let demo = findUserByEmail(demoEmail)
  if (!demo) {
    demo = createUser({ name: 'Demo Learner', email: demoEmail, password: 'Demo1234!' })
    db.prepare('UPDATE users SET confirmed = 1, onboarded = 1 WHERE id = ?').run(demo.id)
    db.prepare(
      `UPDATE users
       SET interests = ?, experience = ?, goals = ?
       WHERE id = ?`,
    ).run('Web Application,Network Security', 'beginner', 'Build a safe, repeatable learning habit', demo.id)
  }

  if (getProgress(demo.id).bookmarks.length === 0) {
    setProgress(demo.id, 'v2', 'bookmarks', true)
    setProgress(demo.id, 'l2', 'bookmarks', true)
    setProgress(demo.id, 'v1', 'completed', true)
    setProgress(demo.id, 'n1', 'completed', true)
    setProgress(demo.id, 'v2', 'started', true)
    setProgress(demo.id, 'l2', 'started', true)
  }
}

seed()
