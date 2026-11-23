import * as vscode from 'vscode'
import { localeFrom, type Locale } from './locale'

export type { Locale } from './locale'

/**
 * Only the strings the extension host itself emits. The rich editor's strings
 * come from @kbmjj123/json-editor's own dictionaries, bundled into its IIFE.
 */
const dictionaries: Record<Locale, Record<string, string>> = {
  en: {
    noDocument: 'No active JSON document',
    formatted: 'JSON formatted',
    minified: 'JSON minified',
    valid: 'Valid JSON',
    jsonToYamlDone: 'Converted JSON to YAML',
    yamlToJsonDone: 'Converted YAML to JSON',
    toCsvDone: 'CSV written to a new document',
    jsonPathPrompt: 'Enter a JSONPath expression',
    jsonPathNone: 'No matches',
    jsonPathMatches: 'match(es)',
    invalidExpression: 'Invalid JSONPath expression',
    outputTitle: 'JSON Toolbox',
    previewTruncated: 'Large file: showing a read-only preview of the first 1 MB. Open with the built-in editor to see the full file.',
    editorLoadFailed: 'Failed to load the JSON editor.',
    error: 'Error: ',
    notArray: 'JSON must be an array of objects to convert to CSV',
  },
  zh: {
    noDocument: '没有活动的 JSON 文档',
    formatted: '已格式化 JSON',
    minified: '已压缩 JSON',
    valid: '✓ JSON 合法',
    jsonToYamlDone: '已转换 JSON 为 YAML',
    yamlToJsonDone: '已转换 YAML 为 JSON',
    toCsvDone: '已在新文档生成 CSV',
    jsonPathPrompt: '输入 JSONPath 表达式',
    jsonPathNone: '没有匹配结果',
    jsonPathMatches: '个匹配结果',
    invalidExpression: 'JSONPath 表达式无效',
    outputTitle: 'JSON Toolbox',
    previewTruncated: '文件过大：仅显示前 1 MB 的只读预览。完整内容请用内置编辑器打开。',
    editorLoadFailed: 'JSON 编辑器加载失败。',
    error: '错误：',
    notArray: '只有对象数组才能转换为 CSV',
  },
}

export function resolveLocale(): Locale {
  const configured = vscode.workspace
    .getConfiguration('jsonToolbox')
    .get<'auto' | 'en' | 'zh'>('locale', 'auto')
  return localeFrom(configured, vscode.env.language)
}

export function translator(): (key: string) => string {
  const dictionary = dictionaries[resolveLocale()]
  return (key: string) => dictionary[key] ?? key
}
