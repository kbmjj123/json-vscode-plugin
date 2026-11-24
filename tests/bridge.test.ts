import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('vscode', async () => {
  const { createVscodeModule } = await import('./mocks/vscode')
  return createVscodeModule()
})

import { byteLength } from '@kbmjj123/json-editor/core'
import type * as vscode from 'vscode'
import { setTrackedDocument } from '../src/activeDocument'
import { attachBridge } from '../src/editor/bridge'
import { MAX_PREVIEW_BYTES } from '../src/editor/largeFile'
import { translator } from '../src/i18n'
import {
  createContext,
  createWebview,
  fireConfigurationChange,
  fireDocumentChange,
  fireWebviewMessage,
  makeDocument,
  resetVscodeState,
  state,
  type FakeWebview,
} from './mocks/vscode'

interface Posted {
  type: string
  text?: string
  options?: Record<string, unknown>
  message?: string
}

function posted(webview: FakeWebview): Posted[] {
  return webview.posted as Posted[]
}

function setup(text = '{"a":1}') {
  const document = makeDocument('/file.json', text)
  const webview = createWebview()
  const context = createContext()
  const bridge = attachBridge(
    document as unknown as vscode.TextDocument,
    webview as unknown as vscode.Webview,
    context as unknown as vscode.ExtensionContext,
  )
  return { document, webview, context, bridge }
}

describe('attachBridge', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    resetVscodeState()
    setTrackedDocument(undefined as unknown as vscode.TextDocument)
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('pushes the whole document with default options on ready and subscribes three listeners', () => {
    const { webview, context } = setup()
    expect(context.subscriptions).toHaveLength(3)

    fireWebviewMessage(webview, { type: 'ready' })

    expect(posted(webview)).toEqual([
      {
        type: 'setDocument',
        text: '{"a":1}',
        options: {
          theme: 'auto',
          indent: 2,
          view: 'both',
          locale: 'auto',
          imagePreview: true,
          readOnly: false,
        },
      },
    ])
    expect(state.shownMessages).toHaveLength(0)
  })

  it('reflects configured settings in setDocument options', () => {
    state.config = {
      theme: 'dark',
      indent: '4',
      defaultView: 'table',
      locale: 'en',
      imagePreview: false,
    }
    const { webview } = setup()

    fireWebviewMessage(webview, { type: 'ready' })

    expect(posted(webview)[0].options).toEqual({
      theme: 'dark',
      indent: 4,
      view: 'table',
      locale: 'en',
      imagePreview: false,
      readOnly: false,
    })
  })

  it('sends a truncated read-only preview and warns for a document over 1 MB', () => {
    const { webview } = setup('a'.repeat(MAX_PREVIEW_BYTES + 1))

    fireWebviewMessage(webview, { type: 'ready' })

    const message = posted(webview)[0]
    expect(message.type).toBe('setDocument')
    expect(byteLength(message.text ?? '')).toBe(MAX_PREVIEW_BYTES)
    expect(message.options?.readOnly).toBe(true)
    expect(state.shownMessages).toEqual([
      { level: 'warning', message: translator()('previewTruncated') },
    ])
  })

  it('drops edit messages while in read-only preview mode', async () => {
    const { webview } = setup('a'.repeat(MAX_PREVIEW_BYTES + 1))
    fireWebviewMessage(webview, { type: 'ready' })

    fireWebviewMessage(webview, { type: 'edit', text: 'different text' })
    await vi.advanceTimersByTimeAsync(300)

    expect(state.edits).toHaveLength(0)
    expect(posted(webview)).toHaveLength(1)
  })

  it('ignores an edit that echoes lastText', async () => {
    const { webview } = setup()
    fireWebviewMessage(webview, { type: 'ready' })

    fireWebviewMessage(webview, { type: 'edit', text: '{"a":1}' })
    await vi.advanceTimersByTimeAsync(300)

    expect(state.edits).toHaveLength(0)
  })

  it('ignores an edit that echoes document.getText() but not lastText', async () => {
    const { webview } = setup()
    fireWebviewMessage(webview, { type: 'ready' })

    // Same uri, different text: pushDocument updates lastText to '{"b":2}'
    // while the tracked document still holds the original text.
    const changed = makeDocument('/file.json', '{"b":2}')
    fireDocumentChange(changed)
    expect(posted(webview)).toHaveLength(2)

    fireWebviewMessage(webview, { type: 'edit', text: '{"a":1}' })
    await vi.advanceTimersByTimeAsync(300)

    expect(state.edits).toHaveLength(0)
  })

  it('debounces rapid edits and applies only the final one', async () => {
    const { document, webview } = setup()

    fireWebviewMessage(webview, { type: 'edit', text: 'A' })
    await vi.advanceTimersByTimeAsync(100)
    fireWebviewMessage(webview, { type: 'edit', text: 'B' })
    await vi.advanceTimersByTimeAsync(200)
    expect(state.edits).toHaveLength(0)

    await vi.advanceTimersByTimeAsync(50)
    expect(state.edits).toHaveLength(1)
    expect(state.edits[0].text).toBe('B')
    expect(document.getText()).toBe('B')
  })

  it('does not echo its own applied edit back to the webview', async () => {
    const { webview } = setup()
    fireWebviewMessage(webview, { type: 'ready' })

    fireWebviewMessage(webview, { type: 'edit', text: '{"a":2}' })
    await vi.advanceTimersByTimeAsync(250)

    // applyEdit fires a document change synchronously while `applying` is true.
    expect(state.edits).toHaveLength(1)
    expect(posted(webview)).toHaveLength(1)
  })

  it('does not update lastText when applyEdit returns false', async () => {
    state.applyEditResult = false
    const { document, webview } = setup()

    fireWebviewMessage(webview, { type: 'edit', text: 'X' })
    await vi.advanceTimersByTimeAsync(250)
    expect(document.getText()).toBe('{"a":1}')

    fireWebviewMessage(webview, { type: 'edit', text: 'X' })
    await vi.advanceTimersByTimeAsync(250)
    expect(state.edits).toHaveLength(2)
  })

  it('pushes a document on an external change to the same uri', () => {
    const { webview } = setup()
    fireWebviewMessage(webview, { type: 'ready' })

    fireDocumentChange(makeDocument('/file.json', '{"b":2}'))

    expect(posted(webview)).toHaveLength(2)
    expect(posted(webview)[1].text).toBe('{"b":2}')
  })

  it('ignores document changes from a different uri', () => {
    const { webview } = setup()
    fireWebviewMessage(webview, { type: 'ready' })

    fireDocumentChange(makeDocument('/other.json', '{"b":2}'))

    expect(posted(webview)).toHaveLength(1)
  })

  it('ignores document changes whose text equals lastText', () => {
    const { document, webview } = setup()
    fireWebviewMessage(webview, { type: 'ready' })

    fireDocumentChange(document)

    expect(posted(webview)).toHaveLength(1)
  })

  it('sends applyConfig with fresh settings on a jsonToolbox configuration change', () => {
    state.config = { theme: 'dark', imagePreview: false }
    const { webview } = setup()

    fireConfigurationChange(true)

    expect(posted(webview)).toEqual([
      {
        type: 'applyConfig',
        options: {
          theme: 'dark',
          indent: 2,
          view: 'both',
          locale: 'auto',
          imagePreview: false,
          readOnly: false,
        },
      },
    ])
  })

  it('ignores configuration changes for unrelated sections', () => {
    const { webview } = setup()

    fireConfigurationChange(false)

    expect(posted(webview)).toHaveLength(0)
  })

  it('shows editorLoadFailed on a fatal webview message', () => {
    const { webview } = setup()

    fireWebviewMessage(webview, { type: 'fatal', message: 'boom' })

    expect(state.shownMessages).toEqual([
      { level: 'error', message: translator()('editorLoadFailed') },
    ])
  })

  it('treats an error webview message as a no-op', async () => {
    const { webview } = setup()

    fireWebviewMessage(webview, { type: 'error', info: { message: 'x' } })
    await vi.advanceTimersByTimeAsync(300)

    expect(posted(webview)).toHaveLength(0)
    expect(state.shownMessages).toHaveLength(0)
    expect(state.edits).toHaveLength(0)
  })

  it('stops reacting after dispose, including an already-scheduled edit', async () => {
    const { document, webview, bridge } = setup()
    fireWebviewMessage(webview, { type: 'edit', text: 'X' })

    bridge.dispose()
    await vi.advanceTimersByTimeAsync(300)

    fireWebviewMessage(webview, { type: 'ready' })
    fireWebviewMessage(webview, { type: 'fatal', message: 'boom' })
    fireDocumentChange(document)
    fireConfigurationChange(true)

    expect(state.edits).toHaveLength(0)
    expect(posted(webview)).toHaveLength(0)
    expect(state.shownMessages).toHaveLength(0)
  })
})
