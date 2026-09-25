import assert from 'node:assert/strict';
import {mkdirSync, mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test} from 'node:test';

import {scanPaths, scanText} from './check-secrets.mjs';

const rules = (text) => scanText(text).map((finding) => finding.rule);

test('flags a JWT-shaped string', () => {
	assert.deepEqual(
		rules('token: eyJhbGciOiJub25lIn0.eyJzdWIiOiJleGFtcGxlLXVzZXIifQ'),
		['JWT']
	);
});

test('flags GitHub and Anthropic key prefixes', () => {
	assert.deepEqual(rules('gho_abcdefghijklmnopqrstuvwxyz0123'), [
		'GitHub token',
	]);
	assert.deepEqual(rules('sk-ant-api03-abcdefghijklmnop'), ['Anthropic key']);
});

test('flags internal hosts in any case', () => {
	assert.deepEqual(rules('https://LDP-INTERNAL.liferay.com/api'), [
		'Internal host',
	]);
	assert.deepEqual(rules('https://x.lfr.cloud'), ['Internal host']);
	assert.deepEqual(rules('osbasahpublisher'), ['Internal host']);
});

test('flags an OSB-Asah header with a value but not a bare mention', () => {
	assert.deepEqual(rules('OSB-Asah-Project-ID: abc123'), [
		'OSB-Asah header value',
	]);
	assert.deepEqual(rules('"OSB-Asah-Data-Source-ID": "42"'), [
		'OSB-Asah header value',
	]);
	assert.deepEqual(rules('The DXP sends OSB-Asah-* headers.'), []);
});

test('flags e-mail addresses outside example.com', () => {
	assert.deepEqual(rules('jane.doe@example.com'), []);
	assert.deepEqual(rules('someone@acme.org'), ['Non-example e-mail']);
});

test('does not flag placeholders or package names', () => {
	assert.deepEqual(
		rules(
			'Authorization: Bearer YOUR_TOKEN\nhttps://<ldp-host>/api\n@docusaurus/core'
		),
		[]
	);
});

test('reports 1-based line numbers', () => {
	assert.deepEqual(scanText('ok\nok\nsomeone@acme.org'), [
		{line: 3, rule: 'Non-example e-mail'},
	]);
});

test('scanPaths walks directories, honors excludes, and skips build output', () => {
	const root = mkdtempSync(join(tmpdir(), 'secrets-'));

	mkdirSync(join(root, 'docs', 'superpowers'), {recursive: true});
	mkdirSync(join(root, 'docs', 'node_modules'), {recursive: true});
	writeFileSync(join(root, 'docs', 'leak.md'), 'x\nsomeone@acme.org\n');
	writeFileSync(join(root, 'docs', 'clean.md'), 'nothing here\n');
	writeFileSync(join(root, 'docs', 'superpowers', 'spec.md'), 'ldp-internal');
	writeFileSync(join(root, 'docs', 'node_modules', 'x.js'), 'ldp-internal');
	writeFileSync(join(root, 'docs', 'image.png'), 'ldp-internal');

	const findings = scanPaths([join(root, 'docs')], {
		exclude: [join(root, 'docs', 'superpowers')],
	});

	assert.deepEqual(findings, [
		{file: join(root, 'docs', 'leak.md'), line: 2, rule: 'Non-example e-mail'},
	]);
});

test('rejects e-mail domains that only start with example.com', () => {
	assert.deepEqual(rules('a@example.com.evil.io'), ['Non-example e-mail']);
	assert.deepEqual(rules('x@example.com.br'), ['Non-example e-mail']);
});

test('decodes URL-encoded e-mail addresses before scanning', () => {
	assert.deepEqual(rules('?email=jane%40acme.org'), ['Non-example e-mail']);
	assert.deepEqual(rules('?email=jane%40example.com'), []);
});

test('flags fine-grained GitHub tokens and generic sk- keys', () => {
	assert.deepEqual(rules('github_pat_11ABCDEFG0abcdefghijklmnop'), [
		'GitHub token',
	]);
	assert.deepEqual(rules('sk-proj-abcdefghijklmnopqrstuvwx'), ['Secret key']);
});

test('flags direct ASAH API paths', () => {
	assert.deepEqual(rules('POST https://<host>/api/1.0/graphql'), [
		'ASAH API path',
	]);
});

test('flags an OSB-Asah header value on the following lines', () => {
	assert.deepEqual(
		scanText(
			'- name: OSB-Asah-Project-ID\n  in: header\n  example: 123456789\n'
		),
		[{line: 1, rule: 'OSB-Asah header value'}]
	);
	assert.deepEqual(scanText('OSB-Asah-Project-ID:\n  abc123\n'), [
		{line: 1, rule: 'OSB-Asah header value'},
	]);
	assert.deepEqual(
		scanText('- name: OSB-Asah-Project-ID\n  in: header\n  required: true\n'),
		[]
	);
});
