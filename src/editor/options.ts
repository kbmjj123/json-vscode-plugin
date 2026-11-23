import type { Settings } from '../config'

export function editorOptions(settings: Settings): Record<string, unknown> {
  return {
    theme: settings.theme,
    indent: settings.indent,
    view: settings.defaultView,
    locale: settings.locale,
    imagePreview: settings.imagePreview,
  }
}
