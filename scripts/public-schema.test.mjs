import assert from 'node:assert/strict';
import {test} from 'node:test';

import {withoutMutations} from './public-schema.mjs';

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
