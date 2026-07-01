import { describe, expect, it } from 'vitest'
import { getServiceState, hasWinner, type ScoreState } from './scoring'

function base(overrides: Partial<ScoreState> = {}): ScoreState {
  return {
    left: 0,
    right: 0,
    target: 11,
    mode: 'singles',
    initialServerId: 'L1',
    initialReceiverId: 'R1',
    players: [
      { id: 'L1', name: 'A', team: 'left' },
      { id: 'R1', name: 'B', team: 'right' },
    ],
    ...overrides,
  }
}

describe('table tennis scoring rules', () => {
  it('switches singles service every two points before deuce', () => {
    expect(getServiceState(base({ left: 0, right: 0 })).server.id).toBe('L1')
    expect(getServiceState(base({ left: 1, right: 0 })).server.id).toBe('L1')
    expect(getServiceState(base({ left: 1, right: 1 })).server.id).toBe('R1')
    expect(getServiceState(base({ left: 2, right: 1 })).server.id).toBe('R1')
    expect(getServiceState(base({ left: 2, right: 2 })).server.id).toBe('L1')
  })

  it('switches service every point at deuce for the selected target', () => {
    expect(getServiceState(base({ left: 10, right: 10 })).server.id).toBe('L1')
    expect(getServiceState(base({ left: 11, right: 10 })).server.id).toBe('R1')
    expect(getServiceState(base({ left: 11, right: 11 })).server.id).toBe('L1')

    expect(getServiceState(base({ left: 10, right: 10, target: 21 })).switchEvery).toBe(2)
    expect(getServiceState(base({ left: 20, right: 20, target: 21 })).switchEvery).toBe(1)
    expect(getServiceState(base({ left: 21, right: 20, target: 21 })).server.id).toBe('R1')
  })

  it('requires win by two', () => {
    expect(hasWinner(11, 9)).toBe('left')
    expect(hasWinner(11, 10)).toBeNull()
    expect(hasWinner(12, 10)).toBe('left')
  })

  it('rotates doubles server and receiver legally', () => {
    const doubles = base({
      mode: 'doubles',
      initialServerId: 'L1',
      initialReceiverId: 'R1',
      players: [
        { id: 'L1', name: 'A1', team: 'left' },
        { id: 'L2', name: 'A2', team: 'left' },
        { id: 'R1', name: 'B1', team: 'right' },
        { id: 'R2', name: 'B2', team: 'right' },
      ],
    })

    expect(getServiceState({ ...doubles, left: 0, right: 0 }).server.id).toBe('L1')
    expect(getServiceState({ ...doubles, left: 1, right: 1 }).server.id).toBe('R1')
    expect(getServiceState({ ...doubles, left: 2, right: 2 }).server.id).toBe('L2')
    expect(getServiceState({ ...doubles, left: 3, right: 3 }).server.id).toBe('R2')
    expect(getServiceState({ ...doubles, left: 4, right: 4 }).server.id).toBe('L1')
    expect(getServiceState({ ...doubles, left: 1, right: 1 }).receiver?.id).toBe('L2')
    expect(getServiceState({ ...doubles, left: 10, right: 10 }).server.id).toBe('L2')
    expect(getServiceState({ ...doubles, left: 10, right: 10 }).receiver?.id).toBe('R2')
    expect(getServiceState({ ...doubles, left: 11, right: 10 }).server.id).toBe('R2')
    expect(getServiceState({ ...doubles, left: 11, right: 10 }).receiver?.id).toBe('L1')
  })
})
