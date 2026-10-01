import { useState } from 'react'
import Game2048 from './games/Game2048'

const games = [{ id: '2048', name: '2048', emoji: '🔢', component: Game2048 }]

export default function App() {
  const [current, setCurrent] = useState<string | null>(null)
  const game = games.find((g) => g.id === current)

  if (game) {
    const Game = game.component
    return (
      <div className="page">
        <button className="back" onClick={() => setCurrent(null)}>← 목록</button>
        <Game />
      </div>
    )
  }

  return (
    <div className="page">
      <h1>🎮 미니 게임 모음</h1>
      <div className="menu">
        {games.map((g) => (
          <button key={g.id} className="card" onClick={() => setCurrent(g.id)}>
            <span className="emoji">{g.emoji}</span>
            {g.name}
          </button>
        ))}
      </div>
    </div>
  )
}
