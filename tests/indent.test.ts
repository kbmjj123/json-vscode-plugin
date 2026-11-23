import { describe, expect, it } from 'vitest'
import { indentFromConfig } from '../src/indent'

describe('indentFromConfig', () => {
  it('maps the configured strings to IndentOption', () => {
    expect(indentFromConfig('2')).toBe(2)
    expect(indentFromConfig('4')).toBe(4)
    expect(indentFromConfig('tab')).toBe('tab')
  })

  it('falls back to 2', () => {
    expect(indentFromConfig('anything')).toBe(2)
  })
})
