import { spawnSync } from 'node:child_process';
import { readdirSync, rmSync } from 'node:fs';

process.env.NODE_OPTIONS = '--experimental-vm-modules --disable-warning=ExperimentalWarning';

function bench(iterations, args) {
	// burn the first run
	const result = spawnSync(process.execPath, args, { stdio: 'ignore' });
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
for (const file of readdirSync('./dist')) {
	if (file.endsWith('.cachedData')) {
		rmSync(`./dist/${file}`, { force: true });
	}
}

const iterations = process.argv[2] ? parseInt(process.argv[2]) : 100;
if (isNaN(iterations) || iterations < 1) {
	console.error('Invalid iterations');
	process.exit(1);
}
console.log(`Running ${iterations} iterations...`);
const noCache = bench(iterations, ['./index.js']);
const withCache = bench(iterations, ['./index.js', '--cache']);

const delta = (1 - withCache / noCache) * 100;
console.log(`With cache: ${delta.toFixed(2)}% ${(delta > 0 ? 'faster' : 'slower')}`);
