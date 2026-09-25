import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';
import {buildSchema, introspectionFromSchema} from 'graphql';

import {
	fetchIntrospection,
	introspectionToSdl,
	readCredentials,
} from './introspect.mjs';

const SCRIPT = fileURLToPath(new URL('./introspect.mjs', import.meta.url));

const SCHEMA = buildSchema(
	'type Query { timeRange: [TimeRange] } type TimeRange { key: String rangeKey: Int }'
);

const CREDENTIALS = {
	password: 'secret',
	url: 'https://dxp.example.com/o/analytics-rest/v1.0/graphql',
	user: 'user@example.com',
};

const response = (status, body) => async () => ({
	ok: status >= 200 && status < 300,
	status,
	text: async () => body,
});

test('introspectionToSdl prints the schema as SDL', () => {
	const sdl = introspectionToSdl({data: introspectionFromSchema(SCHEMA)});

	assert.match(sdl, /type TimeRange \{/);
	assert.match(sdl, /rangeKey: Int/);
});

test('introspectionToSdl throws the GraphQL error messages', () => {
	assert.throws(
		() =>
			introspectionToSdl({
				errors: [{message: 'Not allowed'}, {message: 'Try again'}],
			}),
		/Not allowed; Try again/
	);
});

test('introspectionToSdl throws when there is no data', () => {
	assert.throws(() => introspectionToSdl({}), /Introspection response has no data/);
});

test('readCredentials names the first missing variable', () => {
	assert.throws(() => readCredentials({}), /DOCS_GRAPHQL_URL/);
	assert.throws(
		() => readCredentials({DOCS_GRAPHQL_URL: 'x'}),
		/DOCS_GRAPHQL_USER/
	);
	assert.throws(
		() => readCredentials({DOCS_GRAPHQL_URL: 'x', DOCS_GRAPHQL_USER: 'y'}),
		/DOCS_GRAPHQL_PASSWORD/
	);
	assert.deepEqual(
		readCredentials({
			DOCS_GRAPHQL_PASSWORD: 'p',
			DOCS_GRAPHQL_URL: 'u',
			DOCS_GRAPHQL_USER: 'n',
		}),
		{password: 'p', url: 'u', user: 'n'}
	);
});

test('fetchIntrospection sends Basic Auth and parses JSON', async () => {
	let request;

	const result = await fetchIntrospection(CREDENTIALS, async (url, init) => {
		request = {init, url};

		return response(200, '{"data":{"ok":true}}')();
	});

	assert.deepEqual(result, {data: {ok: true}});
	assert.equal(request.url, CREDENTIALS.url);
	assert.equal(request.init.method, 'POST');
	assert.equal(
		request.init.headers.Authorization,
		'Basic ' + Buffer.from('user@example.com:secret').toString('base64')
	);
	assert.match(JSON.parse(request.init.body).query, /__schema/);
});

test('fetchIntrospection reports non-2xx responses', async () => {
	await assert.rejects(
		fetchIntrospection(CREDENTIALS, response(401, '')),
		/HTTP 401 from https:\/\/dxp\.example\.com/
	);
});

test('fetchIntrospection reports a non-JSON body', async () => {
	await assert.rejects(
		fetchIntrospection(CREDENTIALS, response(200, '<html></html>')),
		/Response is not JSON/
	);
});

test('the CLI fails without credentials and leaves the output untouched', () => {
	const output = join(mkdtempSync(join(tmpdir(), 'gql-')), 'schema.graphql');

	writeFileSync(output, 'unchanged\n');

	const result = spawnSync(process.execPath, [SCRIPT], {
		encoding: 'utf8',
		env: {GRAPHQL_OUTPUT: output, PATH: process.env.PATH},
	});

	assert.equal(result.status, 1);
	assert.match(result.stderr, /DOCS_GRAPHQL_URL/);
	assert.equal(readFileSync(output, 'utf8'), 'unchanged\n');
});

test('fetchIntrospection names the network cause when the request throws', async () => {
	await assert.rejects(
		fetchIntrospection(CREDENTIALS, async () => {
			throw Object.assign(new TypeError('fetch failed'), {
				cause: {code: 'ECONNREFUSED'},
			});
		}),
		/Cannot reach https:\/\/dxp\.example\.com\/o\/analytics-rest\/v1\.0\/graphql: ECONNREFUSED/
	);
});
