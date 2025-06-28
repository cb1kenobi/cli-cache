import Module from 'node:module';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';
import { isAbsolute, resolve } from 'node:path';
import { readFileSync, statSync, writeFileSync } from 'node:fs';

if (!process.execArgv.includes('--experimental-vm-modules')) {
	console.error('The --experimental-vm-modules flag is required');
	process.exit(1);
}

await loadScriptFromFile('./dist/main.js', { cache: process.argv.includes('--cache') });

async function loadScriptFromFile(file, options) {
	let cachedData = undefined;

	const cacheFile = file + '.cachedData';

	// if cache is enabled, try to load cached data
	if (options?.cache) {
		try {
			if (statSync(cacheFile).mtimeMs > statSync(file).mtimeMs) {
				cachedData = readFileSync(cacheFile);
			}
		} catch {
			// ignore
		}
	}

	const source = readSourceFile(file);
	const context = createContext(options?.global ?? globalThis);
	const linker = createLinker(context, options);
	const module = new SourceTextModule(source, {
		cachedData,
		context,
		identifier: file,
		importModuleDynamically: linker
	});

	await module.link(linker);

	// we need to write cached data before we evaluate the module
	if (options?.cache && cachedData === undefined) {
		cachedData = module.createCachedData();
		writeFileSync(cacheFile, cachedData);
	}

	await module.evaluate();

	return module;
}

function readSourceFile(file) {
	let contents = readFileSync(file, 'utf-8');
	const len = contents.length;
	if (len >= 2 && contents[0] === '#' && contents[1] === '!') {
		if (len === 2) {
			content = '';
		} else {
			let i = 2;
			for (; i < len; i++) {
				if (contents[i] === '\n' || contents[i] === '\r') {
					break;
				}
			}
			if (i === len) {
				contents = '';
			} else {
				contents = contents.slice(i);
			}
		}
	}
	return contents;
}

function createLinker(context, options) {
	return async (specifier, referencingModule) => {
		// check for `node:fs` or `fs` or `internal/something`
		const builtin = specifier.startsWith('node:') ? specifier.slice(5) : specifier;
		if (Module.builtinModules.includes(builtin) || builtin.startsWith('internal/') || specifier.startsWith('internal/')) {
			const mod = await import(specifier);
			const exportNames = Object.keys(mod);
			return new SyntheticModule(exportNames, function () {
				for (const name of exportNames) {
					this.setExport(name, mod[name]);
				}
			}, { context, identifier: specifier });
		}

		// resolve the path of the referencing module
		let refPath;
		if (referencingModule.identifier.startsWith('file://')) {
			refPath = new URL(referencingModule.identifier);
		} else if (isAbsolute(referencingModule.identifier)) {
			refPath = referencingModule.identifier;
		} else {
			refPath = resolve(process.cwd(), referencingModule.identifier);
		}

		// create a require function so that we can resolve relative modules
		try {
			const require = Module.createRequire(refPath);
			const resolvedPath = require.resolve(specifier);
			return loadScriptFromFile(resolvedPath, options);
		} catch (err) {
			throw new Error(`Cannot resolve module: ${specifier} from ${refPath}`);
		}
	};
}
