import assert from 'node:assert/strict';
import {test} from 'node:test';

import {GROUPS, enabledGroups, envName} from './site.config.mjs';

const ids = (groups) => groups.map((group) => group.id);

test('envName converts camelCase ids to DOCS_GROUP_ variables', () => {
	assert.equal(envName('restPublic'), 'DOCS_GROUP_REST_PUBLIC');
	assert.equal(envName('faroInternal'), 'DOCS_GROUP_FARO_INTERNAL');
	assert.equal(envName('dsr'), 'DOCS_GROUP_DSR');
});

test('the GraphQL group points at the captured schema', () => {
	assert.equal(
		GROUPS.find((group) => group.id === 'graphql').schema,
		'specs/graphql/schema.graphql'
	);
});

test('GROUPS declares the four groups in sidebar order', () => {
	assert.deepEqual(ids(GROUPS), [
		'restPublic',
		'dsr',
		'graphql',
		'faroInternal',
	]);
});

test('enabledGroups uses defaults when no variable is set', () => {
	assert.deepEqual(ids(enabledGroups({})), ['restPublic', 'dsr', 'graphql']);
});

test('enabledGroups treats an empty value as the default', () => {
	assert.deepEqual(ids(enabledGroups({DOCS_GROUP_REST_PUBLIC: ''})), [
		'restPublic',
		'dsr',
		'graphql',
	]);
});

test('enabledGroups accepts true, false, 1, and 0 in any case', () => {
	assert.deepEqual(
		ids(
			enabledGroups({
				DOCS_GROUP_GRAPHQL: 'TRUE',
				DOCS_GROUP_REST_PUBLIC: '0',
			})
		),
		['dsr', 'graphql']
	);
	assert.deepEqual(ids(enabledGroups({DOCS_GROUP_REST_PUBLIC: 'False'})), [
		'dsr',
		'graphql',
	]);
	assert.deepEqual(ids(enabledGroups({DOCS_GROUP_DSR: '1'})), [
		'restPublic',
		'dsr',
		'graphql',
	]);
	assert.deepEqual(ids(enabledGroups({DOCS_GROUP_DSR: '0'})), [
		'restPublic',
		'graphql',
	]);
});

test('enabledGroups rejects an unknown value and names the variable', () => {
	assert.throws(
		() => enabledGroups({DOCS_GROUP_DSR: 'yes'}),
		/DOCS_GROUP_DSR/
	);
});
