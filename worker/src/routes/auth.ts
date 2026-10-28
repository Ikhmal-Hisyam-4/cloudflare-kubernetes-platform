import { Hono } from 'hono'
import { z } from 'zod'
import { httpError, publicUser, requireUser, validate } from '../http'
import { createAccessToken, hashPassword, verifyPassword } from '../security'
import type { AppEnv, User } from '../types'

export const auth = new Hono<AppEnv>()

const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
  full_name: z.string().min(1),
})
const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
})
const updateSchema = z.object({ full_name: z.string().min(1) })

const tokenResponse = async (userId: number, env: AppEnv['Bindings']) => ({
  access_token: await createAccessToken(userId, env.JWT_SECRET, Number(env.JWT_EXPIRE_MINUTES)),
  token_type: 'bearer',
})

auth.post('/signup', validate('json', signupSchema), async (c) => {
  const { email, password, full_name } = c.req.valid('json')

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()
  if (existing) throw httpError(400, 'Email already registered')

  const password_hash = await hashPassword(password)
  const created = await c.env.DB
    .prepare('INSERT INTO users (email, password_hash, full_name) VALUES (?, ?, ?) RETURNING id')
    .bind(email, password_hash, full_name)
    .first<{ id: number }>()

  return c.json(await tokenResponse(created!.id, c.env), 201)
})

auth.post('/login', validate('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json')

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<User>()
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    throw httpError(401, 'Invalid email or password')
  }
  return c.json(await tokenResponse(user.id, c.env))
})

auth.get('/me', requireUser, (c) => c.json(publicUser(c.get('user'))))

auth.put('/me', requireUser, validate('json', updateSchema), async (c) => {
  const { full_name } = c.req.valid('json')
  const user = await c.env.DB
    .prepare('UPDATE users SET full_name = ? WHERE id = ? RETURNING *')
    .bind(full_name, c.get('user').id)
    .first<User>()
  return c.json(publicUser(user!))
})
