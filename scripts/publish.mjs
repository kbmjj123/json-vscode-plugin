import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const vsix = join(root, `json-toolbox-${version}.vsix`)
const target = process.argv[2] ?? 'both'

if (!['ms', 'ovsx', 'both'].includes(target)) {
  console.error('Usage: node scripts/publish.mjs [ms|ovsx|both]')
  process.exit(1)
}

if (!existsSync(vsix)) {
  console.error(`Missing ${vsix}. Run "pnpm package" first.`)
  process.exit(1)
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  if (result.error) {
    console.error(result.error.message)
    process.exit(1)
  }
  if (result.status !== 0) process.exit(result.status ?? 1)
}

if (target === 'ms' || target === 'both') {
  if (!process.env.VSCE_PAT) {
    console.error('VSCE_PAT is required for the Visual Studio Marketplace.')
    process.exit(1)
  }
  run('pnpm', ['exec', 'vsce', 'publish', '--no-dependencies', '--packagePath', vsix])
}

if (target === 'ovsx' || target === 'both') {
  if (!process.env.OVSX_PAT) {
    console.error('OVSX_PAT is required for Open VSX.')
    process.exit(1)
  }
  run('pnpm', [
    'exec', 'ovsx', '-p', process.env.OVSX_PAT,
    'publish', '--no-dependencies', '--packagePath', vsix,
  ])
}
