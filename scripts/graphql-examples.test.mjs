import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {test} from 'node:test';
import {buildSchema, parse, validate} from 'graphql';

const SCHEMA = buildSchema(
	readFileSync('specs/graphql/schema.graphql', 'utf8')
);

const EXAMPLES_DIR = 'specs/graphql/examples';

const EXPECTED = [
	'acquisitions.graphql',
	'demo-metric-card.graphql',
	'event-breakdown.graphql',
	'event-definitions.graphql',
	'individual-metric.graphql',
	'live-page-views.graphql',
	'page-views.graphql',
	'site-metric.graphql',
	'top-pages.graphql',
	'traffic-heatmap.graphql',
	'visit-frequency.graphql',
	'visitors-behavior.graphql',
	'visitors-by-device.graphql',
];

test('the example set is complete', () => {
	assert.deepEqual(
		readdirSync(EXAMPLES_DIR)
			.filter((name) => name.endsWith('.graphql'))
			.sort(),
		EXPECTED
	);
});

for (const name of EXPECTED) {
	test(`${name} is valid against the captured schema`, () => {
		const errors = validate(
			SCHEMA,
			parse(readFileSync(`${EXAMPLES_DIR}/${name}`, 'utf8'))
		);

		assert.deepEqual(
			errors.map((error) => error.message),
			[]
		);
	});
}

const PAGE = readFileSync('docs/graphql/examples.mdx', 'utf8');

for (const name of EXPECTED) {
	test(`${name} appears verbatim on the examples page`, () => {
		const query = readFileSync(`${EXAMPLES_DIR}/${name}`, 'utf8').trim();

		assert.ok(PAGE.includes(query), `${name} is missing or edited`);
	});
}
