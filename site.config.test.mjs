import assert from 'node:assert/strict';
import {test} from 'node:test';

import {GROUPS, enabledGroups, envName} from './site.config.mjs';

const ids = (groups) => groups.map((group) => group.id);

test('envName converts camelCase ids to DOCS_GROUP_ variables', () => {
	assert.equal(envName('restPublic'), 'DOCS_GROUP_REST_PUBLIC');
	assert.equal(envName('faroInternal'), 'DOCS_GROUP_FARO_INTERNAL');
	assert.equal(envName('graphql'), 'DOCS_GROUP_GRAPHQL');
});

test('the GraphQL group points at the captured schema', () => {
	assert.equal(
		GROUPS.find((group) => group.id === 'graphql').schema,
		'specs/graphql/schema.graphql'
	);
});

test('GROUPS declares the groups in sidebar order', () => {
	assert.deepEqual(ids(GROUPS), ['restPublic', 'graphql', 'faroInternal']);
});

test('enabledGroups uses defaults when no variable is set', () => {
	assert.deepEqual(ids(enabledGroups({})), ['restPublic', 'graphql']);
});

test('enabledGroups treats an empty value as the default', () => {
	assert.deepEqual(ids(enabledGroups({DOCS_GROUP_REST_PUBLIC: ''})), [
		'restPublic',
		'graphql',
	]);
});

test('enabledGroups accepts true, false, 1, and 0 in any case', () => {
	assert.deepEqual(
		ids(
			enabledGroups({
				DOCS_GROUP_FARO_INTERNAL: 'TRUE',
				DOCS_GROUP_REST_PUBLIC: '0',
			})
		),
		['graphql', 'faroInternal']
	);
	assert.deepEqual(ids(enabledGroups({DOCS_GROUP_REST_PUBLIC: 'False'})), [
		'graphql',
	]);
	assert.deepEqual(ids(enabledGroups({DOCS_GROUP_GRAPHQL: '1'})), [
		'restPublic',
		'graphql',
	]);
	assert.deepEqual(ids(enabledGroups({DOCS_GROUP_GRAPHQL: '0'})), [
		'restPublic',
	]);
});

test('enabledGroups rejects an unknown value and names the variable', () => {
	assert.throws(
		() => enabledGroups({DOCS_GROUP_GRAPHQL: 'yes'}),
		/DOCS_GROUP_GRAPHQL/
	);
});
