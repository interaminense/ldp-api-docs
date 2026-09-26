import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {buildSchema} from 'graphql';

import {withDescriptions, withoutMutations} from './public-schema.mjs';

const SDL = `schema {
  query: QueryType
  mutation: MutationType
}

type QueryType {
  timeRange: [TimeRange]
}

type MutationType {
  deleteJobs(ids: [String]): Boolean
}

input JobInput {
  name: String
}

type TimeRange {
  key: String
}
`;

test('withoutMutations drops the mutation type and keeps queries', () => {
	const result = withoutMutations(SDL);

	assert.doesNotMatch(result, /MutationType|deleteJobs/);
	assert.match(result, /timeRange: \[TimeRange\]/);
	assert.match(result, /type TimeRange/);
});

test('withoutMutations drops types only reachable from mutations', () => {
	assert.doesNotMatch(withoutMutations(SDL), /JobInput/);
});

test('withDescriptions sets query descriptions in the printed schema', () => {
	const result = withDescriptions(withoutMutations(SDL), {
		timeRange: 'Lists the valid time ranges.',
	});

	assert.match(result, /"""Lists the valid time ranges\."""\n  timeRange/);
});

test('withDescriptions rejects a description for an unknown query', () => {
	assert.throws(
		() => withDescriptions(withoutMutations(SDL), {nope: 'x'}),
		/Unknown query: nope/
	);
});

test('every published query has a description', () => {
	const descriptions = JSON.parse(
		readFileSync('specs/graphql/descriptions.json', 'utf8')
	);

	const queries = Object.keys(
		buildSchema(readFileSync('specs/graphql/schema.graphql', 'utf8'))
			.getQueryType()
			.getFields()
	);

	assert.deepEqual(
		queries.filter((name) => !descriptions[name]),
		[]
	);
});
