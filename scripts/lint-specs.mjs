#!/usr/bin/env node
import {spawnSync} from 'node:child_process';

import {enabledGroups} from '../site.config.mjs';

const specs = enabledGroups()
	.map((group) => group.spec)
	.filter(Boolean);

const result = spawnSync('npx', ['redocly', 'lint', ...specs], {
	stdio: 'inherit',
});

process.exit(result.status ?? 1);
