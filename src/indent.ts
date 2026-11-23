import type { IndentOption } from '@kbmjj123/json-editor/core'

/** VS Code settings store the numeric indents as strings ("2" / "4" / "tab"). */
export function indentFromConfig(value: string): IndentOption {
  return value === 'tab' ? 'tab' : value === '4' ? 4 : 2
}
