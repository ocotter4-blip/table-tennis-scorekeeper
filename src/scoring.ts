export type Mode = 'singles' | 'doubles'
export type Side = 'left' | 'right'

export interface Player {
  id: string
  name: string
  team: Side
}

export interface ScoreState {
  left: number
  right: number
  mode: Mode
  initialServerId: string
  initialReceiverId?: string
  players: Player[]
  target: number
}

export interface ServiceState {
  servingSide: Side
  server: Player
  receiver?: Player
  serveNumberInTurn: 1 | 2
  switchEvery: 1 | 2
  pointsUntilSwitch: number
  isDeuce: boolean
  totalPoints: number
}

export function otherSide(side: Side): Side {
  return side === 'left' ? 'right' : 'left'
}

export function isDeuce(left: number, right: number, target = 11): boolean {
  return left >= target - 1 && right >= target - 1
}

export function hasWinner(left: number, right: number, target = 11): Side | null {
  if ((left >= target || right >= target) && Math.abs(left - right) >= 2) {
    return left > right ? 'left' : 'right'
  }
  return null
}

export function getServiceInterval(left: number, right: number, target = 11): 1 | 2 {
  return isDeuce(left, right, target) ? 1 : 2
}

export function getServingSide(left: number, right: number, initialSide: Side, target = 11): Side {
  const total = left + right
  const interval = getServiceInterval(left, right, target)
  const turnsElapsed = interval === 1
    ? Math.max(0, total - ((target - 1) * 2)) + Math.floor(((target - 1) * 2) / 2)
    : Math.floor(total / 2)
  return turnsElapsed % 2 === 0 ? initialSide : otherSide(initialSide)
}

function findPlayer(players: Player[], id: string): Player {
  const player = players.find((p) => p.id === id)
  if (!player) throw new Error(`Unknown player ${id}`)
  return player
}

function partnerOf(players: Player[], player: Player): Player {
  const partner = players.find((p) => p.team === player.team && p.id !== player.id)
  return partner ?? player
}

export function getSinglesService(state: ScoreState): ServiceState {
  const total = state.left + state.right
  const server = findPlayer(state.players, state.initialServerId)
  const initialSide = server.team
  const interval = getServiceInterval(state.left, state.right, state.target)
  const servingSide = getServingSide(state.left, state.right, initialSide, state.target)
  const activeServer = state.players.find((p) => p.team === servingSide) ?? server
  const receiver = state.players.find((p) => p.team === otherSide(servingSide))
  const pointsIntoTurn = interval === 1 ? 0 : total % 2
  return {
    servingSide,
    server: activeServer,
    receiver,
    serveNumberInTurn: (pointsIntoTurn + 1) as 1 | 2,
    switchEvery: interval,
    pointsUntilSwitch: interval - pointsIntoTurn,
    isDeuce: interval === 1,
    totalPoints: total,
  }
}

export function getDoublesService(state: ScoreState): ServiceState {
  const total = state.left + state.right
  const initialServer = findPlayer(state.players, state.initialServerId)
  const initialReceiver = state.initialReceiverId
    ? findPlayer(state.players, state.initialReceiverId)
    : state.players.find((p) => p.team === otherSide(initialServer.team))
  if (!initialReceiver) throw new Error('Doubles requires an initial receiver')

  const initialServerPartner = partnerOf(state.players, initialServer)
  const initialReceiverPartner = partnerOf(state.players, initialReceiver)
  // Legal doubles rotation after the first server/receiver selection:
  // server -> initial receiver -> server partner -> receiver partner -> repeat.
  const rotation = [initialServer, initialReceiver, initialServerPartner, initialReceiverPartner]
  const interval = getServiceInterval(state.left, state.right, state.target)
  const normalTurnsBeforeDeuce = Math.floor(((state.target - 1) * 2) / 2)
  const turnIndex = interval === 1
    ? normalTurnsBeforeDeuce + Math.max(0, total - ((state.target - 1) * 2))
    : Math.floor(total / 2)
  const server = rotation[turnIndex % rotation.length]
  const previousServer = rotation[(turnIndex + rotation.length - 1) % rotation.length]
  // On each service change, previous receiver becomes server and previous server's partner receives.
  const receiver = partnerOf(state.players, previousServer)
  const pointsIntoTurn = interval === 1 ? 0 : total % 2

  return {
    servingSide: server.team,
    server,
    receiver,
    serveNumberInTurn: (pointsIntoTurn + 1) as 1 | 2,
    switchEvery: interval,
    pointsUntilSwitch: interval - pointsIntoTurn,
    isDeuce: interval === 1,
    totalPoints: total,
  }
}

export function getServiceState(state: ScoreState): ServiceState {
  return state.mode === 'singles' ? getSinglesService(state) : getDoublesService(state)
}
