#!/usr/bin/env node
import {spawnSync} from 'node:child_process';
import {rmSync} from 'node:fs';

import {enabledGroups} from '../site.config.mjs';
import {writePublicSchema} from './public-schema.mjs';

const groups = enabledGroups();

const commands = [
	['clean-api-docs', 'all', '--plugin-id', 'openapi'],
	['gen-api-docs', 'all', '--plugin-id', 'openapi'],
];

const graphqlGroup = groups.find((group) => group.schema);

if (graphqlGroup) {
	writePublicSchema(graphqlGroup.schema, graphqlGroup.publicSchema);

	rmSync(`docs/${graphqlGroup.dir}/reference`, {force: true, recursive: true});

	commands.push(['graphql-to-doc']);
}

for (const args of commands) {
	const result = spawnSync('npx', ['docusaurus', ...args], {stdio: 'inherit'});

	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}
}
