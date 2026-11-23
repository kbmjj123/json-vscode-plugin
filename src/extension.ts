import * as vscode from 'vscode'
import { registerActiveDocumentTracker } from './activeDocument'
import { registerCommands } from './commands'
import { activateDiagnostics } from './diagnostics'
import { JsonTextEditorProvider } from './editor/JsonTextEditorProvider'
import { registerEditorCommands } from './editor/panel'

export function activate(context: vscode.ExtensionContext): void {
  registerActiveDocumentTracker(context)
  activateDiagnostics(context)
  registerCommands(context)
  registerEditorCommands(context)

  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      JsonTextEditorProvider.viewType,
      new JsonTextEditorProvider(context),
      { webviewOptions: { retainContextWhenHidden: true } },
    ),
  )
}

export function deactivate(): void {
  // Nothing to dispose: everything is registered on context.subscriptions.
}
