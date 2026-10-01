import { Link, Navigate, Route, Routes } from 'react-router-dom'
import Game2048 from './games/Game2048'
import Sudoku from './games/Sudoku'

const KillerSudoku = () => <Sudoku killer />

const games = [{ id: '2048', name: '2048', emoji: '🔢', component: Game2048 },
  { id: 'sudoku', name: '스도쿠', emoji: '🧩', component: Sudoku },
  { id: 'killer', name: '킬러 스도쿠', emoji: '🗡️', component: KillerSudoku },
]

function Menu() {
  return (
    <div className="page">
      <h1>🎮 미니 게임 모음</h1>
      <div className="menu">
        {games.map((g) => (
          <Link key={g.id} to={`/${g.id}`} className="card">
            <span className="emoji">{g.emoji}</span>
            {g.name}
          </Link>
        ))}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Menu />} />
      {games.map((g) => (
        <Route
          key={g.id}
          path={`/${g.id}`}
          element={
            <div className="page">
              <Link className="back" to="/">← 목록</Link>
              <g.component />
            </div>
          }
        />
      ))}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
