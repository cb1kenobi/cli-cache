import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';

function bench(iterations, args) {
	// burn the first run
	const result = spawnSync(process.execPath, args);
	if (result.status !== 0) {
		throw new Error(`Failed to run script: ${result.stderr.toString()}`);
	}

	const start = process.hrtime.bigint();
	for (let i = 0; i < iterations; i++) {
		const result = spawnSync(process.execPath, args);
		if (result.status !== 0) {
			throw new Error(`Failed to run script: ${result.stderr.toString()}`);
		}
	}

	const end = process.hrtime.bigint();
	const duration = Number(end - start) / 1000000;
	console.log(`node ${args.join(' ')}: ${duration.toFixed(2)}ms`);
	return duration;
}

// delete the cached data
rmSync('./dist/main.js.cachedData', { force: true });

const iterations = 200;
console.log(`Running ${iterations} iterations...`);
const noCache = bench(iterations, ['--experimental-vm-modules', './index.js']);
const withCache = bench(iterations, ['--experimental-vm-modules', './index.js', '--cache']);

const delta = (1 - withCache / noCache) * 100;
console.log(`With cache: ${delta.toFixed(2)}% ${(delta > 0 ? 'faster' : 'slower')}`);
