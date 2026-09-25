import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {
	existsSync,
	mkdtempSync,
	readFileSync,
	writeFileSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';
import YAML from 'yaml';

import {
	addMissingResponseDescriptions,
	buildDsrSpec,
	deepMerge,
	dropXmlContent,
} from './extract-dsr.mjs';

const SCRIPT = fileURLToPath(new URL('./extract-dsr.mjs', import.meta.url));

test('deepMerge merges objects and replaces arrays without mutating inputs', () => {
	const base = {a: {b: 1, c: [1, 2]}, d: 'x'};
	const overlay = {a: {c: [3], e: 2}, f: true};

	assert.deepEqual(deepMerge(base, overlay), {
		a: {b: 1, c: [3], e: 2},
		d: 'x',
		f: true,
	});
	assert.deepEqual(base, {a: {b: 1, c: [1, 2]}, d: 'x'});
});

test('dropXmlContent removes application/xml and keeps JSON', () => {
	const spec = {
		paths: {
			'/x': {
				get: {
					responses: {
						200: {
							content: {
								'application/json': {schema: {type: 'object'}},
								'application/xml': {schema: {type: 'object'}},
							},
						},
					},
				},
				post: {
					requestBody: {
						content: {
							'application/json': {},
							'application/xml': {},
						},
					},
				},
			},
		},
	};

	const result = dropXmlContent(spec);

	assert.deepEqual(
		Object.keys(result.paths['/x'].get.responses[200].content),
		['application/json']
	);
	assert.deepEqual(
		Object.keys(result.paths['/x'].post.requestBody.content),
		['application/json']
	);
	assert.ok(spec.paths['/x'].get.responses[200].content['application/xml']);
});

test('addMissingResponseDescriptions fills only missing descriptions', () => {
	const spec = {
		paths: {
			'/x': {
				get: {
					responses: {
						200: {content: {}},
						404: {description: 'Not found'},
					},
				},
			},
		},
	};

	const result = addMissingResponseDescriptions(spec);

	assert.equal(
		result.paths['/x'].get.responses[200].description,
		'Successful response'
	);
	assert.equal(result.paths['/x'].get.responses[404].description, 'Not found');
	assert.equal(spec.paths['/x'].get.responses[200].description, undefined);
});

test('buildDsrSpec applies the overlay on top of the cleaned source', () => {
	const source = YAML.stringify({
		info: {title: '', version: 'v1.0'},
		openapi: '3.0.1',
		paths: {
			'/events': {
				get: {
					operationId: 'getEvents',
					responses: {
						200: {
							content: {
								'application/json': {},
								'application/xml': {},
							},
						},
					},
				},
			},
		},
	});
	const overlay = YAML.stringify({
		info: {title: 'DSR Analytics API'},
		paths: {'/events': {get: {summary: 'Latest events'}}},
		servers: [{url: 'https://{host}/o/site-dsr-analytics-rest/v1.0'}],
	});

	const result = YAML.parse(buildDsrSpec(source, overlay));

	assert.equal(result.info.title, 'DSR Analytics API');
	assert.equal(result.info.version, 'v1.0');
	assert.equal(result.paths['/events'].get.operationId, 'getEvents');
	assert.equal(result.paths['/events'].get.summary, 'Latest events');
	assert.deepEqual(
		Object.keys(result.paths['/events'].get.responses[200].content),
		['application/json']
	);
	assert.equal(result.servers.length, 1);
	assert.equal(
		result.paths['/events'].get.responses[200].description,
		'Successful response'
	);
});

test('the CLI fails on a missing source and leaves the output untouched', () => {
	const workdir = mkdtempSync(join(tmpdir(), 'dsr-'));
	const output = join(workdir, 'dsr.yaml');

	writeFileSync(output, 'unchanged\n');

	const result = spawnSync(
		process.execPath,
		[SCRIPT, join(workdir, 'no-such-portal')],
		{encoding: 'utf8', env: {...process.env, DSR_OUTPUT: output}}
	);

	assert.equal(result.status, 1);
	assert.match(result.stderr, /Source not found: /);
	assert.equal(readFileSync(output, 'utf8'), 'unchanged\n');
	assert.equal(existsSync(output + '.tmp'), false);
});
