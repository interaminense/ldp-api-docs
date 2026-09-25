#!/usr/bin/env node
import {spawnSync} from 'node:child_process';

const result = spawnSync('npx', ['docusaurus', 'build'], {encoding: 'utf8'});

const output = result.stdout + result.stderr;

process.stdout.write(output);

const warnings = output
	.split('\n')
	.filter((line) => /was not found|\[WARNING\]|Compiled with warnings/.test(line));

if (warnings.length) {
	console.error(`\nBuild produced ${warnings.length} warning(s); failing.`);
	process.exit(1);
}

process.exit(result.status ?? 1);
