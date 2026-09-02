import { fail, redirect } from '@sveltejs/kit';
import {
	createSession,
	isRateLimited,
	recordFailedAttempt,
	resetRateLimit,
	verifyPassword
} from '$lib/server/auth';

/** @type {number} session lifetime in seconds (7 days) */
const SESSION_TTL = 60 * 60 * 24 * 7;

const isProd = process.env.NODE_ENV === 'production';

/** @type {import('./$types').PageServerLoad} */
export function load({ locals }) {
	if (locals.authenticated) {
		throw redirect(303, '/');
	}
	return {};
}

/** @type {import('./$types').Actions} */
export const actions = {
	default: async ({ request, cookies, getClientAddress }) => {
		const ip = getClientAddress();

		if (isRateLimited(ip)) {
			return fail(429, { error: 'Too many attempts. Try again later.' });
		}

		const data = await request.formData();
		const password = String(data.get('password') ?? '');

		if (!(await verifyPassword(password))) {
			recordFailedAttempt(ip);
			return fail(401, { error: 'Incorrect password.' });
		}

		resetRateLimit(ip);

		const token = createSession();
		cookies.set('session', token, {
			httpOnly: true,
			secure: isProd,
			sameSite: 'strict',
			path: '/',
			maxAge: SESSION_TTL
		});

		throw redirect(303, '/');
	}
};
