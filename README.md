# cli-cache demo

This is a demo of caching the V8 compile cached data and loading it on next
run. The point is to test if caching is faster on next run and by how much.

The loader mechanism supports ESM and CommonJS modules. The caching mechanism
will automatically bypass the cached data if the source file has a newer
modified time.

The demo file that is loaded is a esbuild-minified rollup bundle of a source
file that imports several dependencies, ESM and CommonJS, with both static and
dynamic imports.

To benchmark, run:

	pnpm build
	node bench.js

By default, the benchmark will run 100 iterations. To change the number of
iterations, simply pass in the number of iterations:

	node bench.js 10

To tinker with the loader, run:

	node --experimental-vm-modules index.js --cache

You can set the `--experimental-vm-modules` via `NODE_OPTIONS` like this:

	NODE_OPTIONS="--experimental-vm-modules" node index.js --cache

