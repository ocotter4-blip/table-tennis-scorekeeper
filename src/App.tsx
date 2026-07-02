import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { getServiceState, hasWinner, type Mode, type Player, type ScoreState, type Side } from './scoring'

const defaultNames: Record<Mode, Record<string, string>> = {
  singles: { L1: 'Player A', R1: 'Player B' },
  doubles: { L1: 'A1', L2: 'A2', R1: 'B1', R2: 'B2' },
}

type Page = 'setup' | 'score'

function playersFor(mode: Mode, names: Record<string, string>): Player[] {
  if (mode === 'singles') {
    return [
      { id: 'L1', name: names.L1?.trim() || 'Player A', team: 'left' },
      { id: 'R1', name: names.R1?.trim() || 'Player B', team: 'right' },
    ]
  }
  return [
    { id: 'L1', name: names.L1?.trim() || 'A1', team: 'left' },
    { id: 'L2', name: names.L2?.trim() || 'A2', team: 'left' },
    { id: 'R1', name: names.R1?.trim() || 'B1', team: 'right' },
    { id: 'R2', name: names.R2?.trim() || 'B2', team: 'right' },
  ]
}

function clampScore(score: number) {
  return Math.max(0, score)
}

export default function App() {
  const [page, setPage] = useState<Page>('setup')
  const [mode, setMode] = useState<Mode>('singles')
  const [left, setLeft] = useState(0)
  const [right, setRight] = useState(0)
  const [target, setTarget] = useState(11)
  const [names, setNames] = useState(defaultNames.singles)
  const [initialServerId, setInitialServerId] = useState('L1')
  const [initialReceiverId, setInitialReceiverId] = useState('R1')
  const [toast, setToast] = useState('Tap a side to score. Long-press to undo.')
  const holdDelay = useRef<number | undefined>(undefined)
  const repeatTimer = useRef<number | undefined>(undefined)
  const longPressed = useRef(false)
  const lastServer = useRef<string>('')

  const players = useMemo(() => playersFor(mode, names), [mode, names])
  const scoreState: ScoreState = { left, right, mode, initialServerId, initialReceiverId, players, target }
  const service = getServiceState(scoreState)
  const winner = hasWinner(left, right, target)
  const leader = left === right ? 'Level' : left > right ? 'Team A leads' : 'Team B leads'
  const serverSide = players.find((p) => p.id === initialServerId)?.team ?? 'left'
  const receiverChoices = players.filter((p) => p.team !== serverSide)

  useEffect(() => {
    if (!players.some((p) => p.id === initialServerId)) setInitialServerId('L1')
    const legalReceiver = players.find((p) => p.team !== serverSide)
    if (!players.some((p) => p.id === initialReceiverId && p.team !== serverSide) && legalReceiver) {
      setInitialReceiverId(legalReceiver.id)
    }
  }, [players, initialServerId, initialReceiverId, serverSide])

  useEffect(() => {
    if (page !== 'score') return
    const key = `${service.server.id}:${service.totalPoints}`
    if (lastServer.current && lastServer.current.split(':')[0] !== service.server.id) {
      setToast(`Service switch: ${service.server.name} serves${service.receiver ? ` to ${service.receiver.name}` : ''}`)
      if ('vibrate' in navigator) navigator.vibrate?.([70, 40, 70])
    }
    lastServer.current = key
  }, [page, service.server.id, service.server.name, service.receiver, service.totalPoints])

  useEffect(() => stopHolding, [])

  function updateName(id: string, value: string) {
    setNames((prev) => ({ ...prev, [id]: value }))
  }

  function changeMode(nextMode: Mode) {
    setMode(nextMode)
    setNames(defaultNames[nextMode])
    setInitialServerId('L1')
    setInitialReceiverId('R1')
  }

  function chooseInitialServer(playerId: string) {
    const server = players.find((player) => player.id === playerId)
    if (!server) return
    const legalReceiver = players.find((player) => player.team !== server.team)
    setInitialServerId(playerId)
    if (legalReceiver && !players.some((player) => player.id === initialReceiverId && player.team !== server.team)) {
      setInitialReceiverId(legalReceiver.id)
    }
    if (page === 'score') {
      resetScore(false)
      setToast(`${server.name} will serve first. Score reset for the game.`)
    }
  }

  function chooseInitialReceiver(playerId: string) {
    const receiver = players.find((player) => player.id === playerId)
    if (!receiver) return
    setInitialReceiverId(playerId)
    if (page === 'score') {
      resetScore(false)
      setToast(`${receiver.name} will receive first. Score reset for the game.`)
    }
  }

  function resetScore(showToast = true) {
    setLeft(0)
    setRight(0)
    lastServer.current = ''
    if (showToast) setToast('New game ready. Tap a side to score.')
  }

  function startGame() {
    resetScore(false)
    setToast('Tap a side to score. Hold to continuously subtract.')
    setPage('score')
  }

  function score(side: Side, delta: 1 | -1) {
    if (winner && delta > 0) return
    if (side === 'left') setLeft((value) => clampScore(value + delta))
    else setRight((value) => clampScore(value + delta))
    setToast(delta > 0 ? `${side === 'left' ? 'Team A' : 'Team B'} scored` : 'Score corrected')
  }

  function stopHolding() {
    window.clearTimeout(holdDelay.current)
    window.clearInterval(repeatTimer.current)
  }

  function startPress(side: Side) {
    longPressed.current = false
    stopHolding()
    holdDelay.current = window.setTimeout(() => {
      longPressed.current = true
      score(side, -1)
      repeatTimer.current = window.setInterval(() => score(side, -1), 170)
    }, 450)
  }

  function endPress(side: Side) {
    stopHolding()
    if (!longPressed.current) score(side, 1)
  }

  if (page === 'setup') {
    return (
      <main className="app-shell setup-shell">
        <section className="hero-card">
          <p className="eyebrow">Table tennis scorer</p>
          <h1>Set up the game</h1>
          <p className="hero-copy">Choose singles or doubles, name the players, and set the target score before scoring.</p>
        </section>

        <section className="setup-card" aria-label="Game setup">
          <div className="mode-toggle wide" role="group" aria-label="Match type">
            <button className={mode === 'singles' ? 'active' : ''} onClick={() => changeMode('singles')}>Singles</button>
            <button className={mode === 'doubles' ? 'active' : ''} onClick={() => changeMode('doubles')}>Doubles</button>
          </div>

          <div className="field-grid setup-fields">
            {players.map((player) => (
              <label key={player.id}>
                <span>{player.team === 'left' ? 'Team A' : 'Team B'} · {player.id}</span>
                <input value={names[player.id] ?? player.name} onChange={(e) => updateName(player.id, e.target.value)} />
              </label>
            ))}
          </div>

          <div className="select-row setup-selects">
            <div className="target-field" role="group" aria-label="Game target">
              <span className="field-label">Game target</span>
              <div className="target-options">
                {[11, 21].map((points) => (
                  <button
                    key={points}
                    className={target === points ? 'target-chip active' : 'target-chip'}
                    onClick={() => setTarget(points)}
                    type="button"
                  >
                    {points}
                  </button>
                ))}
              </div>
              <label className="custom-target">
                <span>Custom</span>
                <input
                  aria-label="Custom target score"
                  type="number"
                  inputMode="numeric"
                  min={3}
                  max={99}
                  step={1}
                  value={target}
                  onChange={(e) => setTarget(Math.max(3, Number(e.target.value) || 11))}
                />
              </label>
            </div>
          </div>

          <div className="rule-note">
            <strong>Service rules</strong>
            <span>Every 2 points until {target - 1}-{target - 1}; then every point. Doubles follows server → receiver → partner rotation.</span>
          </div>

          <button className="primary-action" onClick={startGame}>Start scoring</button>
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell score-shell">
      <section className="top-card" aria-label="Score header">
        <div>
          <p className="eyebrow">{mode === 'singles' ? 'Singles' : 'Doubles'} · game to {target}</p>
          <h1>{left}–{right}</h1>
        </div>
        <button className="ghost-button" onClick={() => setPage('setup')}>Edit setup</button>
      </section>

      <section className="starter-card" aria-label="Starting service">
        <div className="choice-field" role="group" aria-label="Who serves first">
          <span className="field-label">Who starts this game?</span>
          <div className="choice-options">
            {players.map((player) => (
              <button
                key={player.id}
                className={`choice-chip ${player.team} ${initialServerId === player.id ? 'active' : ''}`}
                onClick={() => chooseInitialServer(player.id)}
                type="button"
              >
                <span>{player.team === 'left' ? 'Team A' : 'Team B'}</span>
                {player.name}
              </button>
            ))}
          </div>
        </div>
        {mode === 'doubles' && (
          <div className="choice-field" role="group" aria-label="Who receives first">
            <span className="field-label">First receiver</span>
            <div className="choice-options">
              {receiverChoices.map((player) => (
                <button
                  key={player.id}
                  className={`choice-chip ${player.team} ${initialReceiverId === player.id ? 'active' : ''}`}
                  onClick={() => chooseInitialReceiver(player.id)}
                  type="button"
                >
                  <span>{player.team === 'left' ? 'Team A' : 'Team B'}</span>
                  {player.name}
                </button>
              ))}
            </div>
          </div>
        )}
        {(left > 0 || right > 0) && <p className="starter-hint">Changing starter resets this game to 0–0.</p>}
      </section>

      <section className="score-grid" aria-label="Score controls">
        <button
          className={`score-pad left ${service.servingSide === 'left' ? 'serving' : ''}`}
          onPointerDown={() => startPress('left')}
          onPointerUp={() => endPress('left')}
          onPointerLeave={stopHolding}
          onPointerCancel={stopHolding}
          onContextMenu={(event) => event.preventDefault()}
          aria-label="Team A scored. Hold to continuously subtract"
        >
          <span className="team-label">Team A</span>
          <strong>{left}</strong>
          <span>{players.filter((p) => p.team === 'left').map((p) => p.name).join(' / ')}</span>
        </button>
        <button
          className={`score-pad right ${service.servingSide === 'right' ? 'serving' : ''}`}
          onPointerDown={() => startPress('right')}
          onPointerUp={() => endPress('right')}
          onPointerLeave={stopHolding}
          onPointerCancel={stopHolding}
          onContextMenu={(event) => event.preventDefault()}
          aria-label="Team B scored. Hold to continuously subtract"
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
          <p>{winner ? 'Win by two. Start a new game to continue.' : mode === 'doubles' && service.receiver ? `Receiver: ${service.receiver.name}` : `${service.pointsUntilSwitch} point${service.pointsUntilSwitch === 1 ? '' : 's'} until service switch`}</p>
        </div>
        <div className="status-copy">
          <strong>{leader}</strong>
          <span>{service.isDeuce ? `Both sides reached ${target - 1}; service switches every point.` : 'Service switches every two points.'}</span>
        </div>
      </section>

      <footer className="bottom-bar">
        <button onClick={() => resetScore()}>New game</button>
        <p>{toast}</p>
      </footer>
    </main>
  )
}
