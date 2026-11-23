import * as vscode from 'vscode'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import {
  analyzeJson,
  evaluateJsonPath,
  formatJson,
  minifyJson,
  parseJson,
  toCsv,
} from '@kbmjj123/json-editor/core'
import { getActiveDocument } from './activeDocument'
import { getSettings } from './config'
import { translator } from './i18n'
import { tableFrom } from './table'

interface Target {
  document: vscode.TextDocument
  range: vscode.Range
  text: string
}

function target(): Target | undefined {
  const document = getActiveDocument()
  if (!document) return undefined

  const editor = vscode.window.activeTextEditor
  if (editor && editor.document === document && !editor.selection.isEmpty) {
    return { document, range: editor.selection, text: document.getText(editor.selection) }
  }

  const text = document.getText()
  return {
    document,
    range: new vscode.Range(document.positionAt(0), document.positionAt(text.length)),
    text,
  }
}

async function replaceText(target: Target, text: string): Promise<void> {
  const edit = new vscode.WorkspaceEdit()
  edit.replace(target.document.uri, target.range, text)
  await vscode.workspace.applyEdit(edit)
}

export function registerCommands(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel('JSON Toolbox')
  context.subscriptions.push(output)

  const register = (id: string, run: () => Promise<void> | void): void => {
    context.subscriptions.push(vscode.commands.registerCommand(id, run))
  }

  register('jsonToolbox.format', async () => {
    const t = translator()
    const found = target()
    if (!found) {
      void vscode.window.showWarningMessage(t('noDocument'))
      return
    }
    const result = formatJson(found.text, getSettings().indent)
    if (result.error) {
      void vscode.window.showErrorMessage(t('error') + result.error)
      return
    }
    await replaceText(found, result.text)
    void vscode.window.showInformationMessage(t('formatted'))
  })

  register('jsonToolbox.minify', async () => {
    const t = translator()
    const found = target()
    if (!found) {
      void vscode.window.showWarningMessage(t('noDocument'))
      return
    }
    const result = minifyJson(found.text)
    if (result.error) {
      void vscode.window.showErrorMessage(t('error') + result.error)
      return
    }
    await replaceText(found, result.text)
    void vscode.window.showInformationMessage(t('minified'))
  })

  register('jsonToolbox.validate', () => {
    const t = translator()
    const document = getActiveDocument()
    if (!document) {
      void vscode.window.showWarningMessage(t('noDocument'))
      return
    }
    const { error, location } = analyzeJson(document.getText())
    if (!error) {
      void vscode.window.showInformationMessage(t('valid'))
      return
    }
    const at = location ? ` (${location.line}:${location.column})` : ''
    void vscode.window.showErrorMessage(t('error') + error + at)
  })

  register('jsonToolbox.jsonToYaml', async () => {
    const t = translator()
    const found = target()
    if (!found) {
      void vscode.window.showWarningMessage(t('noDocument'))
      return
    }
    const { data, error } = parseJson(found.text)
    if (error) {
      void vscode.window.showErrorMessage(t('error') + error)
      return
    }
    await replaceText(found, stringifyYaml(data))
    void vscode.window.showInformationMessage(t('jsonToYamlDone'))
  })

  register('jsonToolbox.yamlToJson', async () => {
    const t = translator()
    const found = target()
    if (!found) {
      void vscode.window.showWarningMessage(t('noDocument'))
      return
    }
    try {
      const data = parseYaml(found.text) as unknown
      if (data === null || typeof data !== 'object') {
        void vscode.window.showErrorMessage(t('error') + t('notArray'))
        return
      }
      await replaceText(found, JSON.stringify(data, null, getSettings().indent))
      void vscode.window.showInformationMessage(t('yamlToJsonDone'))
    } catch (error) {
      void vscode.window.showErrorMessage(t('error') + (error as Error).message)
    }
  })

  register('jsonToolbox.toCsv', async () => {
    const t = translator()
    const found = target()
    if (!found) {
      void vscode.window.showWarningMessage(t('noDocument'))
      return
    }
    const { data, error } = parseJson(found.text)
    if (error) {
      void vscode.window.showErrorMessage(t('error') + error)
      return
    }
    const table = tableFrom(data)
    if (!table) {
      void vscode.window.showErrorMessage(t('notArray'))
      return
    }
    const document = await vscode.workspace.openTextDocument({
      language: 'csv',
      content: toCsv(table.headers, table.rows, { bom: true }),
    })
    await vscode.window.showTextDocument(document)
    void vscode.window.showInformationMessage(t('toCsvDone'))
  })

  register('jsonToolbox.jsonPath', async () => {
    const t = translator()
    const found = target()
    if (!found) {
      void vscode.window.showWarningMessage(t('noDocument'))
      return
    }
    const expression = await vscode.window.showInputBox({ prompt: t('jsonPathPrompt') })
    if (!expression) return

    const { data, error } = parseJson(found.text)
    if (error) {
      void vscode.window.showErrorMessage(t('error') + error)
      return
    }
    const matches = evaluateJsonPath(data, expression)
    if (!matches) {
      void vscode.window.showErrorMessage(t('invalidExpression'))
      return
    }

    output.clear()
    output.appendLine(`$${expression}`)
    for (const match of matches) {
      output.appendLine(`${match.path || '$'} = ${JSON.stringify(match.value)}`)
    }
    output.show(true)
    void vscode.window.showInformationMessage(
      matches.length === 0 ? t('jsonPathNone') : `${matches.length} ${t('jsonPathMatches')}`,
    )
  })
}
