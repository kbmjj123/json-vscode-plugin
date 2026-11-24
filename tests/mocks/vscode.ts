import type * as vscode from 'vscode'

export interface FakeUri {
  scheme: string
  path: string
  toString(): string
}

export function makeUri(path: string): FakeUri {
  return {
    scheme: 'file',
    path,
    toString: () => `file://${path}`,
  }
}

export interface FakePosition {
  line: number
  character: number
}

export interface FakeRange {
  start: FakePosition
  end: FakePosition
  isEmpty: boolean
  startOffset: number
  endOffset: number
}

export function makeRange(startOffset: number, endOffset: number, isEmpty = false): FakeRange {
  return {
    start: { line: 0, character: startOffset },
    end: { line: 0, character: endOffset },
    isEmpty,
    startOffset,
    endOffset,
  }
}

/** A non-empty selection spanning [start, end) character offsets. */
export function makeSelection(start: number, end: number): FakeRange {
  return makeRange(start, end, false)
}

export interface FakeDocument {
  readonly uri: FakeUri
  readonly languageId: string
  readonly version: number
  lineCount: number
  getText(range?: FakeRange): string
  positionAt(offset: number): FakePosition
  setText(text: string): void
}

export function makeDocument(path: string, text: string, languageId = 'json'): FakeDocument {
  let currentText = text
  let version = 1
  const document: FakeDocument = {
    uri: makeUri(path),
    languageId,
    get version() {
      return version
    },
    lineCount: 1,
    getText: (range) =>
      range ? currentText.slice(range.startOffset, range.endOffset) : currentText,
    positionAt: (offset) => ({ line: 0, character: offset }),
    setText: (next) => {
      currentText = next
      version += 1
    },
  }
  state.documents.set(document.uri.toString(), document)
  return document
}

export interface FakeEditor {
  document: FakeDocument
  selection: FakeRange
}

export function makeEditor(document: FakeDocument, selection: FakeRange): FakeEditor {
  return { document, selection }
}

export interface FakeWebview {
  posted: unknown[]
  listeners: Array<(message: unknown) => void>
  postMessage(message: unknown): Promise<boolean>
  onDidReceiveMessage(listener: (message: unknown) => void): { dispose(): void }
}

export function createWebview(): FakeWebview {
  const posted: unknown[] = []
  const listeners: Array<(message: unknown) => void> = []
  return {
    posted,
    listeners,
    postMessage: async (message) => {
      posted.push(message)
      return true
    },
    onDidReceiveMessage: (listener) => {
      listeners.push(listener)
      return disposable()
    },
  }
}

export function fireWebviewMessage(webview: FakeWebview, message: unknown): void {
  for (const listener of webview.listeners) listener(message)
}

export interface FakeOutputChannel {
  name: string
  lines: string[]
  readonly cleared: number
  readonly shownWithPreserve: boolean | undefined
  appendLine(value: string): void
  clear(): void
  show(preserveFocus?: boolean): void
  dispose(): void
}

export interface ShownMessage {
  level: 'warning' | 'error' | 'info'
  message: string
}

export interface RecordedEdit {
  uri: FakeUri
  range: unknown
  text: string
}

export interface ChangeEvent {
  document: FakeDocument
}

export interface ConfigurationEvent {
  affectsConfiguration(section: string): boolean
}

export interface VscodeMockState {
  config: Record<string, unknown>
  envLanguage: string
  activeTextEditor: FakeEditor | undefined
  inputBoxAnswer: string | undefined
  inputBoxCalls: Array<{ prompt?: string }>
  applyEditResult: boolean
  documents: Map<string, FakeDocument>
  edits: RecordedEdit[]
  shownMessages: ShownMessage[]
  outputChannels: FakeOutputChannel[]
  commands: Map<string, () => Promise<void> | void>
  textDocumentListeners: Array<(event: ChangeEvent) => void>
  configurationListeners: Array<(event: ConfigurationEvent) => void>
  openedDocuments: FakeDocument[]
  shownDocuments: FakeDocument[]
}

export const state: VscodeMockState = {
  config: {},
  envLanguage: 'en',
  activeTextEditor: undefined,
  inputBoxAnswer: undefined,
  inputBoxCalls: [],
  applyEditResult: true,
  documents: new Map(),
  edits: [],
  shownMessages: [],
  outputChannels: [],
  commands: new Map(),
  textDocumentListeners: [],
  configurationListeners: [],
  openedDocuments: [],
  shownDocuments: [],
}

export function resetVscodeState(): void {
  state.config = {}
  state.envLanguage = 'en'
  state.activeTextEditor = undefined
  state.inputBoxAnswer = undefined
  state.inputBoxCalls.length = 0
  state.applyEditResult = true
  state.documents.clear()
  state.edits.length = 0
  state.shownMessages.length = 0
  state.outputChannels.length = 0
  state.commands.clear()
  state.textDocumentListeners.length = 0
  state.configurationListeners.length = 0
  state.openedDocuments.length = 0
  state.shownDocuments.length = 0
}

export interface FakeContext {
  subscriptions: Array<{ dispose(): void }>
}

export function createContext(): FakeContext {
  return { subscriptions: [] }
}

export function fireDocumentChange(document: FakeDocument): void {
  for (const listener of state.textDocumentListeners) listener({ document })
}

export function fireConfigurationChange(affectsJsonToolbox: boolean): void {
  const event: ConfigurationEvent = {
    affectsConfiguration: (section) => affectsJsonToolbox && section === 'jsonToolbox',
  }
  for (const listener of state.configurationListeners) listener(event)
}

function disposable(): { dispose(): void } {
  return { dispose: () => undefined }
}

class FakeRangeClass implements FakeRange {
  readonly start: FakePosition
  readonly end: FakePosition
  readonly isEmpty = false
  readonly startOffset: number
  readonly endOffset: number

  constructor(start: FakePosition, end: FakePosition) {
    this.start = start
    this.end = end
    this.startOffset = start.character
    this.endOffset = end.character
  }
}

class FakeWorkspaceEdit {
  readonly edits: RecordedEdit[] = []

  replace(uri: FakeUri, range: unknown, text: string): void {
    const edit: RecordedEdit = { uri, range, text }
    this.edits.push(edit)
    state.edits.push(edit)
  }
}

export function createVscodeModule(): Record<string, unknown> {
  const show = (level: ShownMessage['level'], message: string): void => {
    state.shownMessages.push({ level, message })
  }

  return {
    Uri: {
      file: makeUri,
      joinPath: (base: FakeUri, ...parts: string[]) =>
        makeUri([base.path, ...parts].join('/')),
    },
    Range: FakeRangeClass,
    WorkspaceEdit: FakeWorkspaceEdit,
    workspace: {
      getConfiguration: () => ({
        get: <T>(key: string, fallback: T): T =>
          (state.config[key] as T | undefined) ?? fallback,
      }),
      applyEdit: async (edit: FakeWorkspaceEdit): Promise<boolean> => {
        if (!state.applyEditResult) return false
        for (const record of edit.edits) {
          const document = state.documents.get(record.uri.toString())
          if (!document) continue
          document.setText(record.text)
          // Mirror VS Code: the document change fires while the bridge's
          // `applying` flag is still true, exercising the echo guard for real.
          for (const listener of state.textDocumentListeners) listener({ document })
        }
        return true
      },
      onDidChangeTextDocument: (listener: (event: ChangeEvent) => void) => {
        state.textDocumentListeners.push(listener)
        return disposable()
      },
      onDidChangeConfiguration: (listener: (event: ConfigurationEvent) => void) => {
        state.configurationListeners.push(listener)
        return disposable()
      },
      onDidOpenTextDocument: () => disposable(),
      onDidSaveTextDocument: () => disposable(),
      onDidCloseTextDocument: () => disposable(),
      openTextDocument: async (options: { language?: string; content?: string }) => {
        const document = makeDocument(
          '/untitled/csv',
          options.content ?? '',
          options.language ?? 'plaintext',
        )
        state.openedDocuments.push(document)
        return document
      },
    },
    window: {
      // Getters are essential: plain values would freeze the initial state
      // and ignore `resetVscodeState()` between tests.
      get activeTextEditor() {
        return state.activeTextEditor
      },
      showWarningMessage: (message: string) => {
        show('warning', message)
        return Promise.resolve(undefined)
      },
      showErrorMessage: (message: string) => {
        show('error', message)
        return Promise.resolve(undefined)
      },
      showInformationMessage: (message: string) => {
        show('info', message)
        return Promise.resolve(undefined)
      },
      showInputBox: async (options: { prompt?: string }) => {
        state.inputBoxCalls.push({ prompt: options.prompt })
        return state.inputBoxAnswer
      },
      showTextDocument: async (document: FakeDocument) => {
        state.shownDocuments.push(document)
        return { document }
      },
      createOutputChannel: (name: string) => {
        const lines: string[] = []
        let cleared = 0
        let shownWithPreserve: boolean | undefined
        const channel: FakeOutputChannel = {
          name,
          lines,
          get cleared() {
            return cleared
          },
          get shownWithPreserve() {
            return shownWithPreserve
          },
          appendLine: (value) => {
            lines.push(value)
          },
          clear: () => {
            lines.length = 0
            cleared += 1
          },
          show: (preserveFocus?: boolean) => {
            shownWithPreserve = preserveFocus
          },
          dispose: () => undefined,
        }
        state.outputChannels.push(channel)
        return channel
      },
      onDidChangeActiveTextEditor: () => disposable(),
    },
    commands: {
      registerCommand: (id: string, run: () => Promise<void> | void) => {
        state.commands.set(id, run)
        return disposable()
      },
    },
    env: {
      get language() {
        return state.envLanguage
      },
    },
  }
}
