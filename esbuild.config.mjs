import { context } from 'esbuild'

const watch = process.argv.includes('--watch')

const shared = {
  bundle: true,
  logLevel: 'info',
  sourcemap: true,
}

const configs = [
  {
    ...shared,
    entryPoints: ['src/extension.ts'],
    outfile: 'dist/extension.js',
    platform: 'node',
    format: 'cjs',
    target: 'node18',
    external: ['vscode'],
  },
  {
    ...shared,
    entryPoints: ['webview/main.ts'],
    outfile: 'dist/webview/main.js',
    platform: 'browser',
    format: 'iife',
    target: 'es2022',
  },
]

const contexts = await Promise.all(configs.map((config) => context(config)))
await Promise.all(contexts.map((ctx) => ctx.rebuild()))

if (watch) {
  await Promise.all(contexts.map((ctx) => ctx.watch()))
} else {
  await Promise.all(contexts.map((ctx) => ctx.dispose()))
}
