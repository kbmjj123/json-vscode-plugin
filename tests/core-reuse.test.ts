import { describe, expect, it } from 'vitest'
import {
  analyzeJson,
  evaluateJsonPath,
  formatJson,
  minifyJson,
  toCsv,
} from '@kbmjj123/json-editor/core'

describe('json-editor core reuse', () => {
  it('formats with the requested indent', () => {
    expect(formatJson('{"a":1}', 2).text).toBe('{\n  "a": 1\n}')
  })

  it('minifies to one line', () => {
    expect(minifyJson('{\n  "a": 1\n}').text).toBe('{"a":1}')
  })

  it('reports an error and its line/column', () => {
    const result = analyzeJson('{"a":1,}')
    expect(result.error).toBeTruthy()
    expect(result.location?.line).toBe(1)
    expect(result.location?.column).toBeGreaterThan(1)
  })

  it('evaluates JSONPath', () => {
    const matches = evaluateJsonPath({ users: [{ name: 'Ada' }, { name: 'Lin' }] }, '$.users[*].name')
    expect(matches?.map((match) => match.value)).toEqual(['Ada', 'Lin'])
  })

  it('renders CSV', () => {
    expect(toCsv(['a', 'b'], [['1', 'x'], ['2', 'y']])).toBe('a,b\n1,x\n2,y')
  })
})
