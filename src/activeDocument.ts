import * as vscode from 'vscode'

let tracked: vscode.TextDocument | undefined

/**
 * A custom editor tab makes `window.activeTextEditor` undefined. Commands must
 * still know which document the user is looking at, so the custom editor
 * provider sets `tracked` explicitly (see setTrackedDocument).
 */
export function registerActiveDocumentTracker(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) tracked = editor.document
    }),
    vscode.workspace.onDidCloseTextDocument((document) => {
      if (tracked === document) tracked = undefined
    }),
  )
}

export function setTrackedDocument(document: vscode.TextDocument): void {
  tracked = document
}

export function getActiveDocument(): vscode.TextDocument | undefined {
  const fromEditor = vscode.window.activeTextEditor?.document
  if (fromEditor) {
    tracked = fromEditor
    return fromEditor
  }
  return tracked
}
