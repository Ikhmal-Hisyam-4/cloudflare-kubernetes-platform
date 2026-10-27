import { sign, verify } from 'hono/jwt'

// Workers' WebCrypto caps PBKDF2 at 100k iterations.
const PBKDF2_ITERATIONS = 100_000
const JWT_ALG = 'HS256'

const toB64 = (bytes: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(bytes)))
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256)
}

// Format: pbkdf2$<iterations>$<salt b64>$<hash b64>
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS)
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toB64(salt)}$${toB64(hash)}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, iterations, salt, expected] = stored.split('$')
  if (scheme !== 'pbkdf2' || !iterations || !salt || !expected) return false
  const actual = new Uint8Array(await pbkdf2(password, fromB64(salt), Number(iterations)))
  const want = fromB64(expected)
  if (actual.length !== want.length) return false
  let diff = 0
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ want[i]
  return diff === 0
}

export async function createAccessToken(userId: number, secret: string, expireMinutes: number): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + expireMinutes * 60
  return sign({ sub: String(userId), exp }, secret, JWT_ALG)
}

export async function decodeAccessToken(token: string, secret: string): Promise<number | null> {
  try {
    const payload = await verify(token, secret, JWT_ALG)
    const id = Number(payload.sub)
    return Number.isInteger(id) ? id : null
  } catch {
    return null
  }
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function randomUrlSafe(byteLength: number): string {
  return toB64(crypto.getRandomValues(new Uint8Array(byteLength)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}
