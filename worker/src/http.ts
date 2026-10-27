import { zValidator } from '@hono/zod-validator'
import type { ValidationTargets } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { createMiddleware } from 'hono/factory'
import type { ZodType } from 'zod'
import { decodeAccessToken } from './security'
import type { AppEnv, User } from './types'

// FastAPI-style errors: the frontend reads `err.response.data.detail`.
export const httpError = (status: 400 | 401 | 402 | 404 | 422, detail: string) =>
  new HTTPException(status, { res: Response.json({ detail }, { status }) })

// Like FastAPI, bad input is a 422, but `detail` is a readable string rather than an array.
export const validate = <T extends ZodType, Target extends keyof ValidationTargets>(target: Target, schema: T) =>
  zValidator(target, schema, (result) => {
    if (!result.success) {
      const issue = result.error.issues[0]
      const field = issue.path.join('.')
      throw httpError(422, field ? `${field}: ${issue.message}` : issue.message)
    }
  })

export const requireUser = createMiddleware<AppEnv>(async (c, next) => {
  const unauthorized = () =>
    new HTTPException(401, {
      res: Response.json(
        { detail: 'Could not validate credentials' },
        { status: 401, headers: { 'WWW-Authenticate': 'Bearer' } },
      ),
    })

  const header = c.req.header('Authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) throw unauthorized()

  const userId = await decodeAccessToken(token, c.env.JWT_SECRET)
  if (userId === null) throw unauthorized()

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first<User>()
  if (!user) throw unauthorized()

  c.set('user', user)
  await next()
})

// Never send password_hash to the client.
export const publicUser = ({ password_hash: _hash, ...rest }: User) => rest

export const nowIso = () => new Date().toISOString()
