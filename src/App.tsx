import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { getServiceState, hasWinner, type Mode, type Player, type ScoreState, type Side } from './scoring'

const defaultNames: Record<Mode, Record<string, string>> = {
  singles: { L1: 'Player A', R1: 'Player B' },
  doubles: { L1: 'A1', L2: 'A2', R1: 'B1', R2: 'B2' },
}

function playersFor(mode: Mode, names: Record<string, string>): Player[] {
  if (mode === 'singles') {
    return [
      { id: 'L1', name: names.L1 || 'Player A', team: 'left' },
      { id: 'R1', name: names.R1 || 'Player B', team: 'right' },
    ]
  }
  return [
    { id: 'L1', name: names.L1 || 'A1', team: 'left' },
    { id: 'L2', name: names.L2 || 'A2', team: 'left' },
    { id: 'R1', name: names.R1 || 'B1', team: 'right' },
    { id: 'R2', name: names.R2 || 'B2', team: 'right' },
  ]
}

function clampScore(score: number) {
  return Math.max(0, score)
}

export default function App() {
  const [mode, setMode] = useState<Mode>('singles')
  const [left, setLeft] = useState(0)
  const [right, setRight] = useState(0)
  const [target, setTarget] = useState(11)
  const [names, setNames] = useState(defaultNames.singles)
  const [initialServerId, setInitialServerId] = useState('L1')
  const [initialReceiverId, setInitialReceiverId] = useState('R1')
  const [toast, setToast] = useState('Tap a side to score. Long-press to undo.')
  const pressTimer = useRef<number | undefined>(undefined)
  const longPressed = useRef(false)
  const lastServer = useRef<string>('')

  const players = useMemo(() => playersFor(mode, names), [mode, names])
  const scoreState: ScoreState = { left, right, mode, initialServerId, initialReceiverId, players, target }
  const service = getServiceState(scoreState)
  const winner = hasWinner(left, right, target)
  const leader = left === right ? 'Level' : left > right ? 'Team A leads' : 'Team B leads'

  useEffect(() => {
    if (!players.some((p) => p.id === initialServerId)) setInitialServerId('L1')
    const serverSide = players.find((p) => p.id === initialServerId)?.team ?? 'left'
    const legalReceiver = players.find((p) => p.team !== serverSide)
    if (!players.some((p) => p.id === initialReceiverId && p.team !== serverSide) && legalReceiver) {
      setInitialReceiverId(legalReceiver.id)
    }
  }, [mode, players, initialServerId, initialReceiverId])

  useEffect(() => {
    const key = `${service.server.id}:${service.totalPoints}`
    if (lastServer.current && lastServer.current.split(':')[0] !== service.server.id) {
      setToast(`Service switch: ${service.server.name} serves${service.receiver ? ` to ${service.receiver.name}` : ''}`)
      if ('vibrate' in navigator) navigator.vibrate?.([70, 40, 70])
    }
    lastServer.current = key
  }, [service.server.id, service.server.name, service.receiver, service.totalPoints])

  function updateName(id: string, value: string) {
    setNames((prev) => ({ ...prev, [id]: value }))
  }

  function changeMode(nextMode: Mode) {
    setMode(nextMode)
    setNames(defaultNames[nextMode])
    setInitialServerId('L1')
    setInitialReceiverId('R1')
    resetScore(false)
  }

  function resetScore(showToast = true) {
    setLeft(0)
    setRight(0)
    lastServer.current = ''
    if (showToast) setToast('New game ready. Select the first server if needed.')
  }

  function score(side: Side, delta: 1 | -1) {
    if (winner && delta > 0) return
    if (side === 'left') setLeft((value) => clampScore(value + delta))
    else setRight((value) => clampScore(value + delta))
    setToast(delta > 0 ? `${side === 'left' ? 'Team A' : 'Team B'} scored` : 'Score corrected')
  }

  function startPress(side: Side) {
    longPressed.current = false
    window.clearTimeout(pressTimer.current)
    pressTimer.current = window.setTimeout(() => {
      longPressed.current = true
      score(side, -1)
    }, 520)
  }

  function endPress(side: Side) {
    window.clearTimeout(pressTimer.current)
    if (!longPressed.current) score(side, 1)
  }

  const receiverChoices = players.filter((p) => p.team !== (players.find((s) => s.id === initialServerId)?.team ?? 'left'))

  return (
    <main className="app-shell">
      <section className="top-card" aria-label="Game setup">
        <div>
          <p className="eyebrow">Table tennis scorer</p>
          <h1>{mode === 'singles' ? 'Singles' : 'Doubles'} game to {target}</h1>
        </div>
        <div className="mode-toggle" role="group" aria-label="Match type">
          <button className={mode === 'singles' ? 'active' : ''} onClick={() => changeMode('singles')}>Singles</button>
          <button className={mode === 'doubles' ? 'active' : ''} onClick={() => changeMode('doubles')}>Doubles</button>
        </div>
      </section>

      <section className="score-grid" aria-label="Score controls">
        <button
          className={`score-pad left ${service.servingSide === 'left' ? 'serving' : ''}`}
          onPointerDown={() => startPress('left')}
          onPointerUp={() => endPress('left')}
          onPointerCancel={() => window.clearTimeout(pressTimer.current)}
          onContextMenu={(event) => event.preventDefault()}
          aria-label="Team A scored. Long press to subtract"
        >
          <span className="team-label">Team A</span>
          <strong>{left}</strong>
          <span>{players.filter((p) => p.team === 'left').map((p) => p.name).join(' / ')}</span>
        </button>
        <button
          className={`score-pad right ${service.servingSide === 'right' ? 'serving' : ''}`}
          onPointerDown={() => startPress('right')}
          onPointerUp={() => endPress('right')}
          onPointerCancel={() => window.clearTimeout(pressTimer.current)}
          onContextMenu={(event) => event.preventDefault()}
          aria-label="Team B scored. Long press to subtract"
        >
          <span className="team-label">Team B</span>
          <strong>{right}</strong>
          <span>{players.filter((p) => p.team === 'right').map((p) => p.name).join(' / ')}</span>
        </button>
      </section>

      <section className="service-card" aria-live="polite">
        <div className="serve-now">
          <span className="service-pill">Serve {service.serveNumberInTurn}/{service.switchEvery}</span>
          <h2>{winner ? `${winner === 'left' ? 'Team A' : 'Team B'} wins` : `${service.server.name} serves`}</h2>
          <p>{winner ? 'Win by two. Tap New game to continue.' : mode === 'doubles' && service.receiver ? `Receiver: ${service.receiver.name}` : `${service.pointsUntilSwitch} point${service.pointsUntilSwitch === 1 ? '' : 's'} until service switch`}</p>
        </div>
        <div className="status-copy">
          <strong>{leader}</strong>
          <span>{service.isDeuce ? 'Deuce rules: serve switches every point.' : 'Service switches every two points.'}</span>
        </div>
      </section>

      <section className="setup-panel">
        <details>
          <summary>Players & first serve</summary>
          <div className="field-grid">
            {players.map((player) => (
              <label key={player.id}>
                <span>{player.id}</span>
                <input value={names[player.id] ?? player.name} onChange={(e) => updateName(player.id, e.target.value)} />
              </label>
            ))}
          </div>
          <div className="select-row">
            <label>
              <span>First server</span>
              <select value={initialServerId} onChange={(e) => setInitialServerId(e.target.value)}>
                {players.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}
              </select>
            </label>
            {mode === 'doubles' && (
              <label>
                <span>First receiver</span>
                <select value={initialReceiverId} onChange={(e) => setInitialReceiverId(e.target.value)}>
                  {receiverChoices.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}
                </select>
              </label>
            )}
            <label>
              <span>Game target</span>
              <select value={target} onChange={(e) => setTarget(Number(e.target.value))}>
                <option value={11}>11</option>
                <option value={21}>21</option>
              </select>
            </label>
          </div>
        </details>
      </section>

      <footer className="bottom-bar">
        <button onClick={() => resetScore()}>New game</button>
        <p>{toast}</p>
      </footer>
    </main>
  )
}
