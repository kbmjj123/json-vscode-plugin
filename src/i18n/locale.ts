import type { LocaleOption } from '../config'

export type Locale = 'en' | 'zh'

/** `auto` follows VS Code's display language; only zh* maps to Chinese. */
export function localeFrom(configured: LocaleOption | undefined, displayLanguage: string): Locale {
  if (configured === 'en' || configured === 'zh') return configured
  return displayLanguage.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}
