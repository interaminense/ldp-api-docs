#!/usr/bin/env node
import {readFileSync, readdirSync, statSync} from 'node:fs';
import {extname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export const RULES = [
	{name: 'JWT', pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/},
	{
		name: 'GitHub token',
		pattern: /\b(gh[opsu]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})/,
	},
	{name: 'Anthropic key', pattern: /\bsk-ant-[A-Za-z0-9_-]{10,}/},
	{name: 'Secret key', pattern: /\bsk-(?!ant-)[A-Za-z0-9_-]{20,}/},
	{name: 'ASAH API path', pattern: /\/api\/1\.0\//},
	{name: 'Internal host', pattern: /ldp-internal|lfr\.cloud|osbasah/i},
	{
		name: 'OSB-Asah header value',
		pattern: /OSB-Asah-[A-Za-z-]+["']?\s*[:=]\s*["']?[A-Za-z0-9]/i,
	},
	{
		name: 'Non-example e-mail',
		pattern:
			/[A-Za-z0-9._%+-]+@(?!example\.com(?![.\w-]))[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/,
	},
];

const EXTENSIONS = new Set([
	'.graphql',
	'.js',
	'.json',
	'.md',
	'.mdx',
	'.mjs',
	'.ts',
	'.tsx',
	'.yaml',
	'.yml',
]);

const SKIPPED_DIRECTORIES = new Set(['.docusaurus', 'build', 'node_modules']);

const HEADER_NAME_LINE = /OSB-Asah-[A-Za-z-]+["']?\s*(:)?\s*$/i;

const HEADER_VALUE_KEY = /^\s*(default|example|value)\s*:\s*\S/;

function hasHeaderValueBelow(lines, index) {
	const match = HEADER_NAME_LINE.exec(lines[index]);

	if (!match) {
		return false;
	}

	const following = lines
		.slice(index + 1, index + 4)
		.filter((line) => line.trim());

	if (match[1]) {
		return Boolean(following.length) && !following[0].includes(':');
	}

	for (const line of following) {
		if (/^\s*- /.test(line)) {
			return false;
		}

		if (HEADER_VALUE_KEY.test(line)) {
			return true;
		}
	}

	return false;
}

export function scanText(text) {
	const findings = [];

	const lines = text.split('\n');

	lines.forEach((content, index) => {
		const decoded = content.replace(/%40/gi, '@');

		const rules = RULES.filter((rule) => rule.pattern.test(decoded)).map(
			(rule) => rule.name
		);

		if (
			!rules.includes('OSB-Asah header value') &&
			hasHeaderValueBelow(lines, index)
		) {
			rules.push('OSB-Asah header value');
		}

		for (const rule of rules) {
			findings.push({line: index + 1, rule});
		}
	});

	return findings;
}

function isExcluded(path, exclude) {
	const absolute = resolve(path);

	return exclude.some((prefix) => {
		const absolutePrefix = resolve(prefix);

		return (
			absolute === absolutePrefix ||
			absolute.startsWith(absolutePrefix + '/')
		);
	});
}

function listFiles(path, exclude) {
	if (isExcluded(path, exclude)) {
		return [];
	}

	if (!statSync(path).isDirectory()) {
		return EXTENSIONS.has(extname(path)) ? [path] : [];
	}

	return readdirSync(path)
		.sort()
		.filter((name) => !SKIPPED_DIRECTORIES.has(name))
		.flatMap((name) => listFiles(join(path, name), exclude));
}

export function scanPaths(roots, {exclude = []} = {}) {
	return roots
		.flatMap((root) => listFiles(root, exclude))
		.flatMap((file) =>
			scanText(readFileSync(file, 'utf8')).map((finding) => ({
				file,
				...finding,
			}))
		);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const findings = scanPaths(process.argv.slice(2), {
		exclude: ['docs/superpowers'],
	});

	for (const {file, line, rule} of findings) {
		console.error(`${file}:${line} ${rule}`);
	}

	if (findings.length) {
		process.exit(1);
	}

	console.log('No secrets found.');
}
