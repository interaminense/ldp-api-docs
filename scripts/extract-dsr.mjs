#!/usr/bin/env node
import {existsSync, readFileSync, renameSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import YAML from 'yaml';

export const DSR_SOURCE =
	'modules/apps/site/site-dsr-analytics-rest-impl/rest-openapi.yaml';

const OVERLAY = 'specs/overlays/dsr.yaml';

const isPlainObject = (value) =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

export function deepMerge(base, overlay) {
	const result = structuredClone(base);

	for (const [key, value] of Object.entries(overlay)) {
		result[key] =
			isPlainObject(value) && isPlainObject(result[key])
				? deepMerge(result[key], value)
				: structuredClone(value);
	}

	return result;
}

function withoutXml(content) {
	return Object.fromEntries(
		Object.entries(content).filter(
			([mediaType]) => mediaType !== 'application/xml'
		)
	);
}

export function dropXmlContent(spec) {
	const result = structuredClone(spec);

	for (const pathItem of Object.values(result.paths ?? {})) {
		for (const operation of Object.values(pathItem)) {
			if (!isPlainObject(operation)) {
				continue;
			}

			if (operation.requestBody?.content) {
				operation.requestBody.content = withoutXml(
					operation.requestBody.content
				);
			}

			for (const response of Object.values(operation.responses ?? {})) {
				if (response.content) {
					response.content = withoutXml(response.content);
				}
			}
		}
	}

	return result;
}

export function addMissingResponseDescriptions(spec) {
	const result = structuredClone(spec);

	for (const pathItem of Object.values(result.paths ?? {})) {
		for (const operation of Object.values(pathItem)) {
			if (!isPlainObject(operation)) {
				continue;
			}

			for (const response of Object.values(operation.responses ?? {})) {
				response.description ??= 'Successful response';
			}
		}
	}

	return result;
}

export function buildDsrSpec(sourceText, overlayText) {
	return YAML.stringify(
		deepMerge(
			addMissingResponseDescriptions(
				dropXmlContent(YAML.parse(sourceText))
			),
			YAML.parse(overlayText)
		)
	);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const portalRoot = process.argv[2];

	if (!portalRoot) {
		console.error('Usage: extract-dsr.mjs <liferay-portal-root>');
		process.exit(1);
	}

	const source = join(portalRoot, DSR_SOURCE);

	if (!existsSync(source)) {
		console.error(`Source not found: ${source}`);
		process.exit(1);
	}

	const output = process.env.DSR_OUTPUT ?? 'specs/dsr.yaml';

	writeFileSync(
		output + '.tmp',
		buildDsrSpec(readFileSync(source, 'utf8'), readFileSync(OVERLAY, 'utf8'))
	);
	renameSync(output + '.tmp', output);

	console.log(`Wrote ${output}`);
}
