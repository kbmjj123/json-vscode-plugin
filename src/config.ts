import * as vscode from 'vscode'
import type { IndentOption } from '@kbmjj123/json-editor/core'
import { indentFromConfig } from './indent'

export type ThemeOption = 'auto' | 'light' | 'dark'
export type ViewOption = 'editor' | 'tree' | 'both' | 'table'
export type LocaleOption = 'auto' | 'en' | 'zh'

export interface Settings {
  theme: ThemeOption
  indent: IndentOption
  defaultView: ViewOption
  locale: LocaleOption
  imagePreview: boolean
}

export { indentFromConfig } from './indent'

export function getSettings(): Settings {
  const config = vscode.workspace.getConfiguration('jsonToolbox')
  return {
    theme: config.get<ThemeOption>('theme', 'auto'),
    indent: indentFromConfig(config.get<string>('indent', '2')),
    defaultView: config.get<ViewOption>('defaultView', 'both'),
    locale: config.get<LocaleOption>('locale', 'auto'),
    imagePreview: config.get<boolean>('imagePreview', true),
  }
}
