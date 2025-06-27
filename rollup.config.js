import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { defineConfig } from 'rollup';
import { minify as esbuildMinifyPlugin } from 'rollup-plugin-esbuild';

export default defineConfig([
	{
		input: './src/main.js',
		output: {
			dir: './dist',
			externalLiveBindings: false,
			format: 'es',
			freeze: false,
			preserveModules: false,
			sourcemap: true
		},
		plugins: [
			commonjs(),
			nodeResolve({ preferBuiltins: true }),
			esbuildMinifyPlugin({
				minify: true,
				minifySyntax: true
			})
		]
	}
]);
