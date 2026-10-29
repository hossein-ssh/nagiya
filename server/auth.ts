import crypto from 'node:crypto';

// Salted scrypt password hashing
export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const key = crypto.scryptSync(password, salt, 64);
    const storedKey = Buffer.from(hash, 'hex');
    if (key.length !== storedKey.length) return false;
    return crypto.timingSafeEqual(key, storedKey);
  } catch {
    return false;
  }
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// In-memory rate limiting for brute-force protection
interface RateLimitRecord {
  attempts: number;
  firstAttemptAt: number;
  lockedUntil?: number;
}

const loginAttempts = new Map<string, RateLimitRecord>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes window
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes lockout

export function checkLoginRateLimit(key: string): { allowed: boolean; remainingLockoutSeconds?: number } {
  const now = Date.now();
  const record = loginAttempts.get(key);

  if (!record) {
    return { allowed: true };
  }

  // Check if actively locked
  if (record.lockedUntil && record.lockedUntil > now) {
    const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return { allowed: false, remainingLockoutSeconds: remainingSeconds };
  }

  // If window expired, reset
  if (now - record.firstAttemptAt > WINDOW_MS) {
    loginAttempts.delete(key);
    return { allowed: true };
  }

  return { allowed: true };
}

export function recordFailedLogin(key: string): { locked: boolean; remainingLockoutSeconds?: number } {
  const now = Date.now();
  const record = loginAttempts.get(key);

  if (!record || (now - record.firstAttemptAt > WINDOW_MS && !record.lockedUntil)) {
    loginAttempts.set(key, { attempts: 1, firstAttemptAt: now });
    return { locked: false };
  }

  record.attempts += 1;
  if (record.attempts >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_MS;
    const remainingSeconds = Math.ceil(LOCKOUT_MS / 1000);
    return { locked: true, remainingLockoutSeconds: remainingSeconds };
  }

  return { locked: false };
}

export function resetFailedLogin(key: string): void {
  loginAttempts.delete(key);
}
