import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';

/**
 * The service loads its secrets from `/etc/gamevault/gamevault.env` (a root-
 * only systemd EnvironmentFile). Because SvelteKit's CSRF `trustedOrigins` must
 * be baked in at build time, also parse that same file here so a bare
 * `pnpm build` picks up `CSRF_TRUSTED_ORIGINS` without it being re-exported in
 * the build shell.
 * @param {string} path
 * @returns {Record<string, string>}
 */
function readEnvFile(path) {
	try {
		return Object.fromEntries(
			readFileSync(path, 'utf-8')
				.split(/\r?\n/)
				.map((line) => line.trim())
				.filter((line) => line && !line.startsWith('#'))
				.map((line) => {
					const idx = line.indexOf('=');
					if (idx === -1) return [line, ''];
					const key = line.slice(0, idx).trim();
					let value = line.slice(idx + 1).trim();
					if (
						(value.startsWith('"') && value.endsWith('"')) ||
						(value.startsWith("'") && value.endsWith("'"))
					) {
						value = value.slice(1, -1);
					}
					return [key, value];
				})
		);
	} catch {
		return {};
	}
}

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '');
	const fileEnv = readEnvFile('/etc/gamevault/gamevault.env');

	// Extra origins allowed to POST forms (CSRF). Comma-separated, e.g.
	// CSRF_TRUSTED_ORIGINS=https://server.rainingdaemons.com,https://vault.example.com
	// Unlike ORIGIN (a single runtime value), this accepts a list of origins.
	const trustedOrigins = (
		process.env.CSRF_TRUSTED_ORIGINS ??
		env.CSRF_TRUSTED_ORIGINS ??
		fileEnv.CSRF_TRUSTED_ORIGINS ??
		''
	)
		.split(',')
		.map((origin) => origin.trim())
		.filter(Boolean);

	return {
		plugins: [
			sveltekit({
				compilerOptions: {
					// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
					runes: ({ filename }) =>
						filename.split(/[/\\]/).includes('node_modules') ? undefined : true
				},

				// Self-hosted Node deployment target. Run with `node build` after `pnpm build`.
				adapter: adapter(),

				csrf: {
					trustedOrigins
				}
			}),
			tailwindcss()
		]
	};
});
