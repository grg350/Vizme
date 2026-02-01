import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'], // Build for commonjs and esm
  dts: true,              // Generate declaration file
  splitting: false,
  sourcemap: true,
  clean: true,            // Clean dist folder before build
  minify: true,           // Minify for production
  treeshake: true,
});