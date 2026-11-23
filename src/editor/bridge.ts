import * as vscode from 'vscode'
import { getSettings } from '../config'
import { translator } from '../i18n'
import { isLarge, truncateToBytes } from './largeFile'
import { editorOptions } from './options'

const EDIT_DEBOUNCE_MS = 250

type Incoming =
  | { type: 'ready' }
  | { type: 'edit'; text: string }
  | { type: 'error'; info: { message: string } | null }
  | { type: 'fatal'; message: string }

export interface Bridge {
  dispose(): void
}

/**
 * Keeps one TextDocument and one webview in sync. The webview is the editing
 * surface; the document is the model that VS Code saves, validates and shows
 * dirty state for. Both directions are guarded against echo loops.
 */
export function attachBridge(
  document: vscode.TextDocument,
  webview: vscode.Webview,
  context: vscode.ExtensionContext,
): Bridge {
  const t = translator()
  let disposed = false
  let lastText = document.getText()
  let applying = false
  let readOnly = false
  let timer: ReturnType<typeof setTimeout> | undefined

  const send = (message: unknown): void => {
    if (!disposed) void webview.postMessage(message)
  }

  function pushDocument(text = document.getText()): void {
    lastText = text
    readOnly = isLarge(text)
    send({
      type: 'setDocument',
      text: readOnly ? truncateToBytes(text) : text,
      options: { ...editorOptions(getSettings()), readOnly },
    })
    if (readOnly) void vscode.window.showWarningMessage(t('previewTruncated'))
  }

  const messageSub = webview.onDidReceiveMessage((message: Incoming) => {
    if (disposed) return

    if (message.type === 'ready') {
      pushDocument()
      return
    }

    if (message.type === 'edit') {
      // A truncated preview is not the document — never write it back.
      if (readOnly) return
      if (message.text === lastText || message.text === document.getText()) return
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        void (async () => {
          applying = true
          try {
            const edit = new vscode.WorkspaceEdit()
            edit.replace(
              document.uri,
              new vscode.Range(
                document.positionAt(0),
                document.positionAt(document.getText().length),
              ),
              message.text,
            )
            const applied = await vscode.workspace.applyEdit(edit)
            if (applied) lastText = message.text
          } finally {
            applying = false
          }
        })()
      }, EDIT_DEBOUNCE_MS)
      return
    }

    if (message.type === 'fatal') {
      void vscode.window.showErrorMessage(t('editorLoadFailed'))
    }
  })

  const changeSub = vscode.workspace.onDidChangeTextDocument((event) => {
    if (disposed || applying) return
    if (event.document.uri.toString() !== document.uri.toString()) return
    const text = event.document.getText()
    if (text === lastText) return
    pushDocument(text)
  })

  const configSub = vscode.workspace.onDidChangeConfiguration((event) => {
    if (disposed || !event.affectsConfiguration('jsonToolbox')) return
    send({ type: 'applyConfig', options: { ...editorOptions(getSettings()), readOnly } })
  })

  context.subscriptions.push(messageSub, changeSub, configSub)

  return {
    dispose() {
      disposed = true
      if (timer) clearTimeout(timer)
    },
  }
}
