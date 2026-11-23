import { describe, expect, it } from 'vitest'
import { byteLength } from '@kbmjj123/json-editor/core'
import { isLarge, MAX_PREVIEW_BYTES, truncateToBytes } from '../src/editor/largeFile'

describe('truncateToBytes', () => {
  it('leaves small text untouched', () => {
    expect(truncateToBytes('{"a":1}', 100)).toBe('{"a":1}')
  })

  it('cuts on a UTF-8 boundary', () => {
    const result = truncateToBytes('你好世界', 7)
    expect(result).toBe('你好')
    expect(byteLength(result)).toBeLessThanOrEqual(7)
  })

  it('never exceeds the cap for large ASCII input', () => {
    const result = truncateToBytes('a'.repeat(2 * MAX_PREVIEW_BYTES))
    expect(byteLength(result)).toBe(MAX_PREVIEW_BYTES)
    expect(result.length).toBe(MAX_PREVIEW_BYTES)
  })
})

describe('isLarge', () => {
  it('uses the 1 MB preview threshold', () => {
    expect(isLarge('a'.repeat(MAX_PREVIEW_BYTES))).toBe(false)
    expect(isLarge('a'.repeat(MAX_PREVIEW_BYTES + 1))).toBe(true)
  })
})
