import { randomBytes } from 'node:crypto'
import * as vscode from 'vscode'

export function createNonce(): string {
  return randomBytes(16).toString('hex')
}

export function webviewHtml(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  nonce: string,
): string {
  const base = vscode.Uri.joinPath(extensionUri, 'dist', 'webview')
  const uri = (name: string): string =>
    webview.asWebviewUri(vscode.Uri.joinPath(base, name)).toString()

  const csp = [
    "default-src 'none'",
    `script-src ${webview.cspSource} 'nonce-${nonce}'`,
    `style-src ${webview.cspSource} 'unsafe-inline'`,
    `img-src ${webview.cspSource} https: data:`,
    `media-src ${webview.cspSource} https: data:`,
    `font-src ${webview.cspSource} data:`,
    `connect-src ${webview.cspSource} https: data:`,
    `frame-src ${webview.cspSource} https: data:`,
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "worker-src 'none'",
  ].join('; ')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <style nonce="${nonce}">
    html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; }
    #editor { height: 100vh; }
  </style>
  <link rel="stylesheet" href="${uri('json-editor.iife.css')}">
</head>
<body>
  <div id="editor"></div>
  <script nonce="${nonce}" src="${uri('json-editor.iife.js')}"></script>
  <script nonce="${nonce}" src="${uri('main.js')}"></script>
</body>
</html>`
}
