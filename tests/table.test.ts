import { describe, expect, it } from 'vitest'
import { tableFrom } from '../src/table'

describe('tableFrom', () => {
  it('unions keys in input order and fills missing values with null', () => {
    expect(tableFrom([{ a: 1 }, { a: 2, b: 'x' }])).toEqual({
      headers: ['a', 'b'],
      rows: [['1', 'null'], ['2', 'x']],
    })
  })

  it('serialises nested values as JSON', () => {
    expect(tableFrom([{ a: { x: 1 } }])).toEqual({ headers: ['a'], rows: [['{"x":1}']] })
  })

  it('rejects non-arrays and arrays without objects', () => {
    expect(tableFrom({ a: 1 })).toBeNull()
    expect(tableFrom([1, 'x'])).toBeNull()
  })
})
