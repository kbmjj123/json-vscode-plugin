import { copyFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)
const pkg = require.resolve('@kbmjj123/json-editor/package.json')
const source = join(dirname(pkg), 'dist')
const target = join(process.cwd(), 'dist', 'webview')

mkdirSync(target, { recursive: true })

for (const file of ['json-editor.iife.js', 'json-editor.iife.css']) {
  copyFileSync(join(source, file), join(target, file))
  console.log(`copied ${file}`)
}
