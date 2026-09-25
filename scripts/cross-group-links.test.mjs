import assert from 'node:assert/strict';
import {existsSync, readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
import {test} from 'node:test';

import {GROUPS} from '../site.config.mjs';

for (const group of GROUPS) {
	const dir = join('docs', group.dir);

	if (!existsSync(dir)) {
		continue;
	}

	const pages = readdirSync(dir).filter((name) => /\.mdx?$/.test(name));

	for (const page of pages) {
		test(`${group.dir}/${page} links to no other group`, () => {
			const text = readFileSync(join(dir, page), 'utf8');

			const others = GROUPS.filter((other) => other.dir !== group.dir)
				.map((other) => other.dir)
				.filter((otherDir) => text.includes(`](/${otherDir}/`));

			assert.deepEqual(others, []);
		});
	}
}
