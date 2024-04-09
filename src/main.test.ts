import { test, expect } from 'vitest' 
import { add } from './main'

test('foo', () => {
    expect(add(1,1)).toBe(2)
})