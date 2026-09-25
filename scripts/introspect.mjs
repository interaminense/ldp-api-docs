#!/usr/bin/env node
import {mkdirSync, renameSync, writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildClientSchema, getIntrospectionQuery, printSchema} from 'graphql';

const VARIABLES = {
	password: 'DOCS_GRAPHQL_PASSWORD',
	url: 'DOCS_GRAPHQL_URL',
	user: 'DOCS_GRAPHQL_USER',
};

export function readCredentials(env) {
	const credentials = {};

	for (const key of ['url', 'user', 'password']) {
		const value = env[VARIABLES[key]];

		if (!value) {
			throw new Error(`${VARIABLES[key]} is not set.`);
		}

		credentials[key] = value;
	}

	return credentials;
}

export async function fetchIntrospection(
	{password, url, user},
	fetchImpl = fetch
) {
	let response;

	try {
		response = await fetchImpl(url, {
			body: JSON.stringify({query: getIntrospectionQuery()}),
			headers: {
				'Authorization':
					'Basic ' +
					Buffer.from(`${user}:${password}`).toString('base64'),
				'Content-Type': 'application/json',
			},
			method: 'POST',
		});
	}
	catch (error) {
		throw new Error(
			`Cannot reach ${url}: ${error.cause?.code ?? error.cause?.message ?? error.message}`
		);
	}

	if (!response.ok) {
		throw new Error(`HTTP ${response.status} from ${url}`);
	}

	const text = await response.text();

	try {
		return JSON.parse(text);
	}
	catch {
		throw new Error('Response is not JSON');
	}
}

export function introspectionToSdl(result) {
	if (result.errors?.length) {
		throw new Error(result.errors.map((error) => error.message).join('; '));
	}

	if (!result.data) {
		throw new Error('Introspection response has no data');
	}

	return printSchema(buildClientSchema(result.data)) + '\n';
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	try {
		const sdl = introspectionToSdl(
			await fetchIntrospection(readCredentials(process.env))
		);

		const output =
			process.env.GRAPHQL_OUTPUT ?? 'specs/graphql/schema.graphql';

		mkdirSync(dirname(output), {recursive: true});
		writeFileSync(output + '.tmp', sdl);
		renameSync(output + '.tmp', output);

		console.log(`Wrote ${output}`);
	}
	catch (error) {
		console.error(error.message);
		process.exit(1);
	}
}
