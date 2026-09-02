import { verify as argonVerify } from '@node-rs/argon2';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { env } from '$env/dynamic/private';

/**
 * Session lifetime, in seconds. Defaults to 7 days.
 * @type {number}
 */
const SESSION_TTL = 60 * 60 * 24 * 7;

/**
 * Random 32+ byte secret used to sign session cookies. Falls back to an
 * ephemeral secret when unset (invalidates sessions on restart).
 * @type {string}
 */
const SESSION_SECRET = env.SESSION_SECRET || randomBytes(32).toString('hex');

/**
 * Argon2id hash of the shared password. Read from the environment at boot so the
 * plaintext password never lives in source or the client bundle.
 * @type {string}
 */
const PASSWORD_HASH = env.PASSWORD_HASH || '';

/** @type {Map<string, number>} sessionId -> expiry timestamp (ms) */
const sessions = new Map();

/**
 * Login rate limiting: `ip -> { count, resetAt }`.
 * @type {Map<string, { count: number, resetAt: number }>}
 */
const rateLimit = new Map();

/** @type {number} max failed attempts before an IP is blocked */
const MAX_ATTEMPTS = 5;

/** @type {number} rate-limit window, in milliseconds (15 minutes) */
const RATE_WINDOW = 15 * 60 * 1000;

/**
 * Sign a value with HMAC-SHA256 using the session secret.
 * @param {string} value
 * @returns {string}
 */
function sign(value) {
	return createHmac('sha256', SESSION_SECRET).update(value).digest('base64url');
}

/**
 * Constant-time string comparison.
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function safeEqual(a, b) {
	const bufA = Buffer.from(a);
	const bufB = Buffer.from(b);
	if (bufA.length !== bufB.length) return false;
	return timingSafeEqual(bufA, bufB);
}

/**
 * Create a new session: generate a random id, register it server-side, and
 * return a signed, opaque cookie value (`<id>.<signature>`).
 * @returns {string}
 */
export function createSession() {
	const sessionId = randomBytes(32).toString('hex');
	sessions.set(sessionId, Date.now() + SESSION_TTL * 1000);
	return `${sessionId}.${sign(sessionId)}`;
}

/**
 * Verify a session cookie value. Returns the session id on success, otherwise null.
 * @param {string | undefined} token
 * @returns {string | null}
 */
export function verifySession(token) {
	if (!token) return null;

	const dot = token.indexOf('.');
	if (dot === -1) return null;

	const sessionId = token.slice(0, dot);
	const signature = token.slice(dot + 1);

	if (!safeEqual(signature, sign(sessionId))) return null;

	const expiresAt = sessions.get(sessionId);
	if (!expiresAt) return null;

	if (Date.now() > expiresAt) {
		sessions.delete(sessionId);
		return null;
	}

	return sessionId;
}

/**
 * Invalidate a session server-side.
 * @param {string | undefined} token
 */
export function destroySession(token) {
	if (!token) return;
	const dot = token.indexOf('.');
	if (dot === -1) return;
	sessions.delete(token.slice(0, dot));
}

/**
 * Verify a candidate password against the stored Argon2id hash (constant-time).
 * @param {string} password
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(password) {
	if (!PASSWORD_HASH || !password) return false;
	try {
		return await argonVerify(PASSWORD_HASH, password);
	} catch {
		return false;
	}
}

/**
 * Whether an IP has exceeded the allowed number of login attempts.
 * @param {string} ip
 * @returns {boolean}
 */
export function isRateLimited(ip) {
	const entry = rateLimit.get(ip);
	if (!entry) return false;
	if (Date.now() > entry.resetAt) {
		rateLimit.delete(ip);
		return false;
	}
	return entry.count >= MAX_ATTEMPTS;
}

/**
 * Record a failed login attempt for an IP.
 * @param {string} ip
 */
export function recordFailedAttempt(ip) {
	const entry = rateLimit.get(ip);
	if (!entry || Date.now() > entry.resetAt) {
		rateLimit.set(ip, { count: 1, resetAt: Date.now() + RATE_WINDOW });
	} else {
		entry.count += 1;
	}
}

/**
 * Clear rate-limit state for an IP (called after a successful login).
 * @param {string} ip
 */
export function resetRateLimit(ip) {
	rateLimit.delete(ip);
}
