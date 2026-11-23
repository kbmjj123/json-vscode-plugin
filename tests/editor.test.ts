import { describe, expect, it, vi } from 'vitest'

vi.mock('vscode', () => ({
  Uri: {
    joinPath: (base: { path: string }, ...parts: string[]) => {
      const path = [base.path, ...parts].join('/')
      return { path, toString: () => `vscode-webview://${path}` }
    },
  },
}))

import type * as vscode from 'vscode'
import { editorOptions } from '../src/editor/options'
import { webviewHtml } from '../src/editor/template'
import type { Settings } from '../src/config'

describe('webviewHtml', () => {
  const webview = {
    cspSource: 'vscode-webview:',
    asWebviewUri: (uri: { toString(): string }) => ({
      toString: () => uri.toString().replace('vscode-webview://', 'https://file+/'),
    }),
  } as unknown as vscode.Webview

  const extensionUri = { path: '/extension' } as vscode.Uri

  it('uses a per-instance nonce and a locked-down CSP', () => {
    const html = webviewHtml(webview, extensionUri, 'abc123')
    expect(html).toContain("default-src 'none'")
    expect(html).toContain("'nonce-abc123'")
    expect(html).toContain('script-src vscode-webview:')
    for (const directive of ["object-src 'none'", "base-uri 'none'", "form-action 'none'", "worker-src 'none'"]) {
      expect(html).toContain(directive)
    }
  })

  it('references all three local assets through asWebviewUri', () => {
    const html = webviewHtml(webview, extensionUri, 'nonce')
    for (const asset of ['json-editor.iife.js', 'json-editor.iife.css', 'main.js']) {
      expect(html).toContain(`https://file+//extension/dist/webview/${asset}`)
    }
  })
})

describe('editorOptions', () => {
  it('maps workspace settings to editor options', () => {
    const settings: Settings = {
      theme: 'dark',
      indent: 4,
      defaultView: 'tree',
      locale: 'zh',
      imagePreview: false,
    }
    expect(editorOptions(settings)).toEqual({
      theme: 'dark',
      indent: 4,
      view: 'tree',
      locale: 'zh',
      imagePreview: false,
    })
  })
})
