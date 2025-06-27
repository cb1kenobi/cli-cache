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

	// read file contents
	const source = readSourceFile(file);
	const context = createContext(options?.global ?? globalThis);
	const module = new SourceTextModule(source, {
		cachedData,
		context,
		identifier: file,
		importModuleDynamically: createLinker(context)
	});

	await module.link(createLinker(context));

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

function createLinker(context) {
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
		const require = Module.createRequire(refPath);
		let resolvedPath;
		try {
			resolvedPath = require.resolve(specifier);
		} catch (err) {
			throw new Error(`Cannot resolve module: ${specifier} from ${refPath}`);
		}

		// try to load the module as a CommonJS module
		let dep;
		try {
			dep = require(resolvedPath);
		} catch {
			// fallback to reading as ESM
			const depContents = readSourceFile(resolvedPath);
			const module = new SourceTextModule(depContents, {
				context,
				identifier: resolvedPath,
			});
			await module.link(createLinker(context));
			return module;
		}

		// if it's a CommonJS module, wrap it
		if (dep && (!dep.__esModule || !dep.default)) {
			return new SyntheticModule(['default'], function() {
				this.setExport('default', dep);
			}, { context, identifier: resolvedPath });
		}

		// otherwise, try to load as ESM
		const depContents = readSourceFile(resolvedPath);
		return new SourceTextModule(depContents, {
			context,
			identifier: resolvedPath,
		});
	};
}
