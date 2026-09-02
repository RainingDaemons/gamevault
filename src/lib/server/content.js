import { compile as compileMdsvex } from 'mdsvex';
import { compile as compileSvelte } from 'svelte/compiler';
import { render } from 'svelte/server';
import sanitizeHtml from 'sanitize-html';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);

/**
 * Absolute file URL for `svelte/internal/server`, used to make the runtime-
 * compiled markdown component resolvable from a temp directory.
 * @type {string}
 */
const SVELTE_SERVER_URL = pathToFileURL(require.resolve('svelte/internal/server')).href;

/**
 * Path to the markdown source. Override with `SERVERS_MD_PATH`; defaults to
 * `content/servers.md` at the project root (read via Node fs at request time —
 * it is never bundled or served to the client).
 * @type {string}
 */
const CONTENT_PATH = process.env.SERVERS_MD_PATH ?? join(process.cwd(), 'content', 'servers.md');

/** Svelte SSR emits inert comment markers around dynamic blocks; strip them. */
const SSR_COMMENTS = /<!--\[-->|<!--]-->|<!---->/g;

/** @type {Record<string, unknown>} */
const SANITIZE_OPTIONS = {
	allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
	allowedAttributes: {
		...sanitizeHtml.defaults.allowedAttributes,
		a: [...sanitizeHtml.defaults.allowedAttributes.a, 'rel'],
		code: ['class'],
		span: ['class'],
		pre: ['class'],
		img: ['src', 'alt', 'title', 'width', 'height']
	},
	allowedSchemes: ['http', 'https', 'mailto'],
	transformTags: {
		a: (tagName, attribs) => {
			const href = attribs.href ?? '';
			if (/^(https?:)?\/\//i.test(href)) {
				return {
					tagName,
					attribs: { ...attribs, target: '_blank', rel: 'noopener noreferrer' }
				};
			}
			return { tagName, attribs };
		}
	}
};

/**
 * Read, compile, render and sanitize `servers.md` entirely on the server.
 * Must only be called after the session has been verified by the caller.
 * @returns {Promise<string>} sanitized HTML
 */
export async function getCompiledContent() {
	const markdown = await readFile(CONTENT_PATH, 'utf-8');

	// 1. Markdown -> Svelte component source (mdsvex).
	const compiled = await compileMdsvex(markdown, {});
	if (!compiled) {
		throw new Error('Failed to compile markdown content');
	}
	const { code } = compiled;

	// 2. Component source -> SSR module (Svelte compiler, server output).
	const { js } = compileSvelte(code, { generate: 'server' });

	// 3. Make the module's single `svelte/internal/server` import resolvable from
	//    a temp directory (avoids writing into the project dir).
	const moduleCode = js.code.replace(
		"from 'svelte/internal/server'",
		`from '${SVELTE_SERVER_URL}'`
	);

	const dir = await mkdtemp(join(tmpdir(), 'sharenotes-'));
	const file = join(dir, 'component.mjs');
	await writeFile(file, moduleCode, 'utf-8');

	try {
		const mod = await import(pathToFileURL(file).href);
		const { body } = render(mod.default, { props: {} });
		const cleaned = body.replace(SSR_COMMENTS, '');
		return sanitizeHtml(cleaned, SANITIZE_OPTIONS);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}
