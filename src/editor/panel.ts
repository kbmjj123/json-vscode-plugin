import * as vscode from 'vscode'
import { getActiveDocument, setTrackedDocument } from '../activeDocument'
import { translator } from '../i18n'
import { attachBridge } from './bridge'
import { createNonce, webviewHtml } from './template'

export function registerEditorCommands(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('jsonToolbox.openPanel', () => {
      const t = translator()
      const document = getActiveDocument()
      if (!document) {
        void vscode.window.showWarningMessage(t('noDocument'))
        return
      }

      const name = document.fileName.split('/').pop() || 'JSON Toolbox'
      const panel = vscode.window.createWebviewPanel(
        'jsonToolbox.panel',
        `JSON Toolbox: ${name}`,
        vscode.ViewColumn.Beside,
        {
          enableScripts: true,
          localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'dist', 'webview')],
          retainContextWhenHidden: true,
        },
      )
      panel.webview.html = webviewHtml(panel.webview, context.extensionUri, createNonce())
      setTrackedDocument(document)

      const bridge = attachBridge(document, panel.webview, context)
      panel.onDidDispose(() => bridge.dispose())
      context.subscriptions.push(panel)
    }),
  )

  context.subscriptions.push(
    vscode.commands.registerCommand('jsonToolbox.revertToBuiltin', () => {
      void vscode.commands.executeCommand('workbench.action.reopenWithEditor')
    }),
  )
}
