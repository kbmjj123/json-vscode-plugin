declare function acquireVsCodeApi(): { postMessage(message: unknown): void }

interface ErrorInfo {
  message: string
  location: { line: number; column: number } | null
}

interface EditorInstance {
  setValue(value: string): void
  getValue(): string
  setOptions(options: Record<string, unknown>): void
  on(event: 'change', handler: (value: string) => void): () => void
  on(event: 'error', handler: (info: ErrorInfo | null) => void): () => void
  destroy(): void
}

declare global {
  interface Window {
    JsonEditor?: {
      defineJsonEditor(el: HTMLElement, options: Record<string, unknown>): EditorInstance
    }
  }
}

type Incoming =
  | { type: 'setDocument'; text: string; options: Record<string, unknown> }
  | { type: 'applyConfig'; options: Record<string, unknown> }

const vscode = acquireVsCodeApi()
let editor: EditorInstance | undefined

function mount(text: string, options: Record<string, unknown>): void {
  const host = document.getElementById('editor')
  const api = window.JsonEditor
  if (!host || !api) {
    vscode.postMessage({ type: 'fatal', message: 'json-editor IIFE failed to load' })
    return
  }

  editor?.destroy()
  const instance = api.defineJsonEditor(host, {
    value: text,
    height: '100vh',
    ...options,
  })
  editor = instance
  instance.on('change', (value) => vscode.postMessage({ type: 'edit', text: value }))
  instance.on('error', (info) => vscode.postMessage({ type: 'error', info }))
}

window.addEventListener('message', (event: MessageEvent<Incoming>) => {
  const message = event.data
  if (message.type === 'setDocument') {
    if (editor) editor.setValue(message.text)
    else mount(message.text, message.options)
    return
  }
  if (message.type === 'applyConfig') {
    // setOptions normalises every key, so pass the current document back or
    // the missing `value` would be replaced by the default empty string.
    editor?.setOptions({ ...message.options, value: editor.getValue() })
  }
})

vscode.postMessage({ type: 'ready' })

export {}
