import { describe, expect, it } from 'vitest'
import { localeFrom } from '../src/i18n/locale'

describe('localeFrom', () => {
  it('honours an explicit choice', () => {
    expect(localeFrom('en', 'zh-cn')).toBe('en')
    expect(localeFrom('zh', 'en')).toBe('zh')
  })

  it('maps zh* display languages to Chinese on auto', () => {
    expect(localeFrom('auto', 'zh-cn')).toBe('zh')
    expect(localeFrom('auto', 'zh-TW')).toBe('zh')
  })

  it('falls back to English for every other display language', () => {
    expect(localeFrom('auto', 'en')).toBe('en')
    expect(localeFrom('auto', 'ja')).toBe('en')
    expect(localeFrom(undefined, 'fr')).toBe('en')
  })
})
