import * as vscode from 'vscode'
import { analyzeJson, byteLength } from '@kbmjj123/json-editor/core'

const REFRESH_DEBOUNCE_MS = 300
const MAX_DIAGNOSTIC_BYTES = 2 * 1024 * 1024

let collection: vscode.DiagnosticCollection | undefined
const timers = new Map<string, ReturnType<typeof setTimeout>>()

export function activateDiagnostics(context: vscode.ExtensionContext): void {
  collection = vscode.languages.createDiagnosticCollection('jsonToolbox')
  context.subscriptions.push(
    collection,
    vscode.workspace.onDidOpenTextDocument(refresh),
    vscode.workspace.onDidChangeTextDocument((event) => scheduleRefresh(event.document)),
    vscode.workspace.onDidSaveTextDocument(refresh),
    vscode.workspace.onDidCloseTextDocument((document) => {
      const key = document.uri.toString()
      const timer = timers.get(key)
      if (timer) clearTimeout(timer)
      timers.delete(key)
      collection?.delete(document.uri)
    }),
  )
  vscode.workspace.textDocuments.forEach(refresh)
}

function scheduleRefresh(document: vscode.TextDocument): void {
  const key = document.uri.toString()
  const existing = timers.get(key)
  if (existing) clearTimeout(existing)
  timers.set(
    key,
    setTimeout(() => {
      timers.delete(key)
      if (vscode.workspace.textDocuments.includes(document)) refresh(document)
    }, REFRESH_DEBOUNCE_MS),
  )
}

function refresh(document: vscode.TextDocument): void {
  if (!collection || document.languageId !== 'json') return

  const text = document.getText()
  if (byteLength(text) > MAX_DIAGNOSTIC_BYTES) {
    collection.delete(document.uri)
    return
  }

  const { error, location } = analyzeJson(text)
  if (!error) {
    collection.delete(document.uri)
    return
  }

  const line = Math.max(0, (location?.line ?? 1) - 1)
  const character = Math.max(0, (location?.column ?? 1) - 1)
  const position = new vscode.Position(line, character)
  const diagnostic = new vscode.Diagnostic(
    new vscode.Range(position, position.translate(0, 1)),
    error,
    vscode.DiagnosticSeverity.Error,
  )
  diagnostic.source = 'JSON Toolbox'
  collection.set(document.uri, [diagnostic])
}
