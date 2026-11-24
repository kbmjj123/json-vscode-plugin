import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('vscode', async () => {
  const { createVscodeModule } = await import('./mocks/vscode')
  return createVscodeModule()
})

import type * as vscode from 'vscode'
import { setTrackedDocument } from '../src/activeDocument'
import { registerCommands } from '../src/commands'
import { translator } from '../src/i18n'
import {
  createContext,
  makeDocument,
  makeEditor,
  makeRange,
  makeSelection,
  resetVscodeState,
  state,
  type FakeDocument,
} from './mocks/vscode'

const COMMAND_IDS = [
  'jsonToolbox.format',
  'jsonToolbox.minify',
  'jsonToolbox.validate',
  'jsonToolbox.jsonToYaml',
  'jsonToolbox.yamlToJson',
  'jsonToolbox.toCsv',
  'jsonToolbox.jsonPath',
]

function setup(): void {
  registerCommands(createContext() as unknown as vscode.ExtensionContext)
}

async function run(id: string): Promise<void> {
  const command = state.commands.get(id)
  if (!command) throw new Error(`command not registered: ${id}`)
  await command()
}

/** Installs a document as the active editor with an empty selection. */
function useDocument(text: string): FakeDocument {
  const document = makeDocument('/file.json', text)
  state.activeTextEditor = makeEditor(document, makeRange(0, 0, true))
  return document
}

function lastMessage(): string {
  return state.shownMessages[state.shownMessages.length - 1].message
}

describe('registerCommands', () => {
  beforeEach(() => {
    resetVscodeState()
    setTrackedDocument(undefined as unknown as vscode.TextDocument)
    setup()
  })

  it('registers seven commands and one output channel', () => {
    expect([...state.commands.keys()]).toEqual(COMMAND_IDS)
    expect(state.outputChannels).toHaveLength(1)
    expect(state.outputChannels[0].name).toBe('JSON Toolbox')
  })

  it('warns noDocument for all seven commands when no document is tracked', async () => {
    for (const id of COMMAND_IDS) await run(id)

    expect(state.shownMessages).toEqual(
      COMMAND_IDS.map(() => ({ level: 'warning', message: translator()('noDocument') })),
    )
    expect(state.edits).toHaveLength(0)
    expect(state.inputBoxCalls).toHaveLength(0)
  })

  it('uses the tracked document when activeTextEditor is undefined (custom editor tab)', async () => {
    const document = makeDocument('/file.json', '{"a":1}')
    setTrackedDocument(document as unknown as vscode.TextDocument)

    await run('jsonToolbox.format')

    expect(state.edits).toHaveLength(1)
    expect(state.edits[0].text).toBe('{\n  "a": 1\n}')
  })

  it('formats the whole document and writes it back', async () => {
    useDocument('{"a":1}')

    await run('jsonToolbox.format')

    expect(state.edits).toHaveLength(1)
    expect(state.edits[0].text).toBe('{\n  "a": 1\n}')
    expect(lastMessage()).toBe(translator()('formatted'))
  })

  it('formats only the active selection when one is non-empty', async () => {
    const document = useDocument('  {"a":1}  ')
    const selection = makeSelection(2, 9)
    state.activeTextEditor = makeEditor(document, selection)

    await run('jsonToolbox.format')

    expect(state.edits).toHaveLength(1)
    expect(state.edits[0].range).toBe(selection)
    expect(state.edits[0].text).toBe('{\n  "a": 1\n}')
  })

  it('uses the configured indent when formatting', async () => {
    state.config = { indent: '4' }
    useDocument('{"a":1}')

    await run('jsonToolbox.format')

    expect(state.edits[0].text).toBe('{\n    "a": 1\n}')
  })

  it('reports a format error without editing', async () => {
    useDocument('{"a":1,}')

    await run('jsonToolbox.format')

    expect(lastMessage()).toContain('Error: ')
    expect(state.edits).toHaveLength(0)
  })

  it('minifies the whole document and reports success', async () => {
    useDocument('{\n  "a": 1\n}')

    await run('jsonToolbox.minify')

    expect(state.edits[0].text).toBe('{"a":1}')
    expect(lastMessage()).toBe(translator()('minified'))
  })

  it('reports a minify error without editing', async () => {
    useDocument('{"a":1,}')

    await run('jsonToolbox.minify')

    expect(lastMessage()).toContain('Error: ')
    expect(state.edits).toHaveLength(0)
  })

  it('reports valid JSON', async () => {
    useDocument('{"a":1}')

    await run('jsonToolbox.validate')

    expect(lastMessage()).toBe(translator()('valid'))
  })

  it('reports an error with a line:column suffix for invalid JSON', async () => {
    useDocument('{"a":1,}')

    await run('jsonToolbox.validate')

    expect(lastMessage()).toMatch(/^Error: .+ \(1:8\)$/)
  })

  it('omits the location suffix when analyzeJson reports none', async () => {
    useDocument('')

    await run('jsonToolbox.validate')

    expect(lastMessage()).toBe('Error: Unexpected end of JSON input')
  })

  it('validates the full document even when a selection is active', async () => {
    const document = useDocument('{"a":1}')
    state.activeTextEditor = makeEditor(document, makeSelection(1, 6))

    await run('jsonToolbox.validate')

    expect(lastMessage()).toBe(translator()('valid'))
  })

  it('converts JSON to YAML and writes it back', async () => {
    useDocument('{"a":1}')

    await run('jsonToolbox.jsonToYaml')

    expect(state.edits[0].text).toBe('a: 1\n')
    expect(lastMessage()).toBe(translator()('jsonToYamlDone'))
  })

  it('reports a jsonToYaml parse error without editing', async () => {
    useDocument('{"a":1,}')

    await run('jsonToolbox.jsonToYaml')

    expect(lastMessage()).toContain('Error: ')
    expect(state.edits).toHaveLength(0)
  })

  it('converts a YAML mapping to indented JSON', async () => {
    useDocument('a: 1')

    await run('jsonToolbox.yamlToJson')

    expect(state.edits[0].text).toBe('{\n  "a": 1\n}')
    expect(lastMessage()).toBe(translator()('yamlToJsonDone'))
  })

  it('rejects YAML that parses to null or to a scalar', async () => {
    for (const text of ['null', 'hello']) {
      useDocument(text)
      await run('jsonToolbox.yamlToJson')
    }

    expect(state.shownMessages).toEqual([
      { level: 'error', message: 'Error: ' + translator()('notArray') },
      { level: 'error', message: 'Error: ' + translator()('notArray') },
    ])
    expect(state.edits).toHaveLength(0)
  })

  it('reports a YAML parse error with its message', async () => {
    useDocument('a: [1, 2')

    await run('jsonToolbox.yamlToJson')

    expect(lastMessage()).toContain('Error: ')
    expect(lastMessage()).not.toBe('Error: ')
    expect(state.edits).toHaveLength(0)
  })

  it('uses the configured indent for yamlToJson', async () => {
    state.config = { indent: '4' }
    useDocument('a: 1')

    await run('jsonToolbox.yamlToJson')

    expect(state.edits[0].text).toBe('{\n    "a": 1\n}')
  })

  it('writes a BOM-prefixed CSV to a new document and shows it', async () => {
    useDocument('[{"a":1,"b":"x"},{"a":2}]')

    await run('jsonToolbox.toCsv')

    expect(state.openedDocuments).toHaveLength(1)
    expect(state.openedDocuments[0].languageId).toBe('csv')
    expect(state.openedDocuments[0].getText()).toBe('\uFEFFa,b\n1,x\n2,null')
    expect(state.shownDocuments).toEqual(state.openedDocuments)
    expect(lastMessage()).toBe(translator()('toCsvDone'))
  })

  it('reports a toCsv parse error', async () => {
    useDocument('{"a":1,}')

    await run('jsonToolbox.toCsv')

    expect(lastMessage()).toContain('Error: ')
    expect(state.openedDocuments).toHaveLength(0)
  })

  it('reports notArray without an error prefix for non-array JSON', async () => {
    useDocument('{"a":1}')

    await run('jsonToolbox.toCsv')

    expect(lastMessage()).toBe(translator()('notArray'))
    expect(state.openedDocuments).toHaveLength(0)
  })

  it('does nothing when the JSONPath input box is cancelled', async () => {
    state.inputBoxAnswer = undefined
    useDocument('{"a":1}')

    await run('jsonToolbox.jsonPath')

    expect(state.inputBoxCalls).toEqual([{ prompt: translator()('jsonPathPrompt') }])
    expect(state.shownMessages).toHaveLength(0)
    expect(state.edits).toHaveLength(0)
    expect(state.outputChannels[0].lines).toHaveLength(0)
  })

  it('reports a JSONPath parse error for invalid JSON', async () => {
    state.inputBoxAnswer = 'a'
    useDocument('{"a":1,}')

    await run('jsonToolbox.jsonPath')

    expect(lastMessage()).toContain('Error: ')
    expect(state.outputChannels[0].lines).toHaveLength(0)
  })

  it('reports invalidExpression for an unsupported expression', async () => {
    state.inputBoxAnswer = '$.a['
    useDocument('{"a":1}')

    await run('jsonToolbox.jsonPath')

    expect(lastMessage()).toBe(translator()('invalidExpression'))
  })

  it('clears the output and prints only the header when there are no matches', async () => {
    state.inputBoxAnswer = '$.missing'
    useDocument('{"a":1}')

    await run('jsonToolbox.jsonPath')

    const output = state.outputChannels[0]
    expect(output.cleared).toBe(1)
    // The header template is `$${expression}` => a leading '$' plus the expression.
    expect(output.lines).toEqual(['$$.missing'])
    expect(output.shownWithPreserve).toBe(true)
    expect(lastMessage()).toBe(translator()('jsonPathNone'))
  })

  it('prints each match as path = value and reports the match count', async () => {
    state.inputBoxAnswer = 'users[*].name'
    useDocument('{"users":[{"name":"Ada"},{"name":"Lin"}]}')

    await run('jsonToolbox.jsonPath')

    const output = state.outputChannels[0]
    expect(output.cleared).toBe(1)
    expect(output.lines).toEqual([
      '$users[*].name',
      'users[0].name = "Ada"',
      'users[1].name = "Lin"',
    ])
    expect(lastMessage()).toBe('2 ' + translator()('jsonPathMatches'))
  })

  it('falls back to $ for a match with an empty path', async () => {
    state.inputBoxAnswer = '$'
    useDocument('{"a":1}')

    await run('jsonToolbox.jsonPath')

    expect(state.outputChannels[0].lines[1]).toBe('$ = {"a":1}')
  })
})
