import * as vscode from 'vscode'
import { setTrackedDocument } from '../activeDocument'
import { attachBridge } from './bridge'
import { createNonce, webviewHtml } from './template'

export class JsonTextEditorProvider implements vscode.CustomTextEditorProvider {
  static readonly viewType = 'jsonToolbox.jsonEditor'

  constructor(private readonly context: vscode.ExtensionContext) {}

  resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken,
  ): void {
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview')],
    }
    webviewPanel.webview.html = webviewHtml(
      webviewPanel.webview,
      this.context.extensionUri,
      createNonce(),
    )
    setTrackedDocument(document)

    const bridge = attachBridge(document, webviewPanel.webview, this.context)
    webviewPanel.onDidDispose(() => bridge.dispose())
  }
}
