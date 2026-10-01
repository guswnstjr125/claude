import { useCallback, useEffect, useRef, useState } from 'react'

type Board = number[][]
type Dir = 'left' | 'right' | 'up' | 'down'
const N = 4
const BEST_KEY = '2048-best'

const empty = (): Board => Array.from({ length: N }, () => Array(N).fill(0))

function addRandom(b: Board): Board {
  const cells: [number, number][] = []
  b.forEach((row, r) => row.forEach((v, c) => v === 0 && cells.push([r, c])))
  if (!cells.length) return b
  const [r, c] = cells[Math.floor(Math.random() * cells.length)]
  const nb = b.map((row) => [...row])
  nb[r][c] = Math.random() < 0.9 ? 2 : 4
  return nb
}

function newGame(): Board {
  return addRandom(addRandom(empty()))
}

function slideRow(row: number[]): { row: number[]; gained: number } {
  const vals = row.filter(Boolean)
  const out: number[] = []
  let gained = 0
  for (let i = 0; i < vals.length; i++) {
    if (vals[i] === vals[i + 1]) {
      out.push(vals[i] * 2)
      gained += vals[i] * 2
      i++
    } else out.push(vals[i])
  }
  while (out.length < N) out.push(0)
  return { row: out, gained }
}

const transpose = (b: Board): Board => b[0].map((_, c) => b.map((row) => row[c]))
const reverse = (b: Board): Board => b.map((row) => [...row].reverse())

function move(b: Board, dir: Dir): { board: Board; gained: number; moved: boolean } {
  let work = b
  if (dir === 'up' || dir === 'down') work = transpose(work)
  if (dir === 'right' || dir === 'down') work = reverse(work)
  let gained = 0
  work = work.map((row) => {
    const r = slideRow(row)
    gained += r.gained
    return r.row
  })
  if (dir === 'right' || dir === 'down') work = reverse(work)
  if (dir === 'up' || dir === 'down') work = transpose(work)
  const moved = work.some((row, r) => row.some((v, c) => v !== b[r][c]))
  return { board: work, gained, moved }
}

const canMove = (b: Board) => (['left', 'right', 'up', 'down'] as Dir[]).some((d) => move(b, d).moved)

export default function Game2048() {
  const [board, setBoard] = useState<Board>(newGame)
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(() => {
    try { return Number(localStorage.getItem(BEST_KEY)) || 0 } catch { return 0 }
  })
  const over = !canMove(board)
  const touch = useRef<{ x: number; y: number } | null>(null)

  const play = useCallback((dir: Dir) => {
    setBoard((prev) => {
      const res = move(prev, dir)
      if (!res.moved) return prev
      setScore((s) => s + res.gained)
      return addRandom(res.board)
    })
  }, [])

  useEffect(() => {
    if (score > best) {
      setBest(score)
      try { localStorage.setItem(BEST_KEY, String(score)) } catch { /* ignore */ }
    }
  }, [score, best])

  useEffect(() => {
    const map: Record<string, Dir> = {
      ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
    }
    const onKey = (e: KeyboardEvent) => {
      const d = map[e.key]
      if (d) { e.preventDefault(); play(d) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [play])

  const restart = () => { setBoard(newGame()); setScore(0) }

  return (
    <div className="game2048">
      <div className="scores">
        <div className="score">점수<b>{score}</b></div>
        <div className="score">최고<b>{best}</b></div>
        <button onClick={restart}>새 게임</button>
      </div>
      <div
        className="board"
        onTouchStart={(e) => {
          const t = e.touches[0]
          touch.current = { x: t.clientX, y: t.clientY }
        }}
        onTouchEnd={(e) => {
          if (!touch.current) return
          const t = e.changedTouches[0]
          const dx = t.clientX - touch.current.x
          const dy = t.clientY - touch.current.y
          touch.current = null
          if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return
          play(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up')
        }}
      >
        {board.flat().map((v, i) => (
          <div key={i} className={`tile t${v > 2048 ? 'big' : v}`}>{v || ''}</div>
        ))}
        {over && (
          <div className="overlay">
            <p>게임 오버!</p>
            <button onClick={restart}>다시 하기</button>
          </div>
        )}
      </div>
      <p className="hint">화면을 스와이프해서 타일을 움직이세요</p>
    </div>
  )
}
