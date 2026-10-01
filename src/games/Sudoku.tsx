import { useCallback, useEffect, useMemo, useState } from 'react'
import { CLUES, generate, label, type Difficulty, type Size } from './sudoku/logic'

const DIFFS: { id: Difficulty; name: string }[] = [
  { id: 'easy', name: '쉬움' },
  { id: 'medium', name: '보통' },
  { id: 'hard', name: '어려움' },
]

type Game = { puzzle: number[]; solution: number[] }

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export default function Sudoku() {
  const [size, setSize] = useState<Size>(9)
  const [diff, setDiff] = useState<Difficulty>('easy')
  const [game, setGame] = useState<Game | null>(null)
  const [values, setValues] = useState<number[]>([])
  const [sel, setSel] = useState<number | null>(null)
  const [secs, setSecs] = useState(0)
  const [loading, setLoading] = useState(false)

  const n = size
  const box = Math.sqrt(n)

  const start = useCallback((s: Size, d: Difficulty) => {
    setLoading(true)
    setGame(null)
    // 생성 중 "만드는 중..." 문구가 먼저 그려지도록 한 박자 늦춘다
    setTimeout(() => {
      const g = generate(s, d)
      setGame(g)
      setValues([...g.puzzle])
      setSel(null)
      setSecs(0)
      setLoading(false)
    }, 30)
  }, [])

  useEffect(() => { start(9, 'easy') }, [start])

  const solved = !!game && values.every((v, i) => v === game.solution[i])

  useEffect(() => {
    if (!game || solved) return
    const t = setInterval(() => setSecs((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [game, solved])

  const input = useCallback((v: number) => {
    if (!game || sel === null || game.puzzle[sel] || solved) return
    setValues((prev) => prev.map((x, i) => (i === sel ? v : x)))
  }, [game, sel, solved])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') return input(0)
      if (sel !== null) {
        const d: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -n, ArrowDown: n }
        if (d[e.key]) {
          e.preventDefault()
          const next = sel + d[e.key]
          const wrap = (e.key === 'ArrowLeft' && sel % n === 0) || (e.key === 'ArrowRight' && sel % n === n - 1)
          if (next >= 0 && next < n * n && !wrap) setSel(next)
          return
        }
      }
      const k = e.key.toUpperCase()
      const v = /^[1-9]$/.test(k) ? Number(k) : /^[A-G]$/.test(k) ? k.charCodeAt(0) - 55 : 0
      if (v >= 1 && v <= n) input(v)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [input, sel, n])

  const changeSize = (s: Size) => { setSize(s); start(s, diff) }
  const changeDiff = (d: Difficulty) => { setDiff(d); start(size, d) }

  // 같은 숫자 개수 (다 채운 숫자는 패드에서 흐리게)
  const counts = useMemo(() => {
    const c = new Array(n + 1).fill(0)
    values.forEach((v) => { c[v]++ })
    return c
  }, [values, n])

  const selVal = sel !== null ? values[sel] : 0
  const peer = (i: number) => {
    if (sel === null) return false
    const r = Math.floor(i / n), c = i % n, sr = Math.floor(sel / n), sc = sel % n
    return r === sr || c === sc ||
      (Math.floor(r / box) === Math.floor(sr / box) && Math.floor(c / box) === Math.floor(sc / box))
  }

  return (
    <div className={`sudoku s${n}`}>
      <div className="sd-row">
        {([9, 16] as Size[]).map((s) => (
          <button key={s} className={`seg ${size === s ? 'on' : ''}`} onClick={() => changeSize(s)}>
            {s}×{s}
          </button>
        ))}
      </div>
      <div className="sd-row">
        {DIFFS.map((d) => (
          <button key={d.id} className={`seg ${diff === d.id ? 'on' : ''}`} onClick={() => changeDiff(d.id)}>
            {d.name}
          </button>
        ))}
      </div>
      <div className="sd-info">
        <span>⏱ {fmt(secs)}</span>
        <span>힌트 {CLUES[size][diff]}개</span>
        <button className="small" onClick={() => start(size, diff)}>새 게임</button>
      </div>

      {loading || !game ? (
        <div className="sd-loading">퍼즐 만드는 중...</div>
      ) : (
        <div className="sd-board" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
          {values.map((v, i) => {
            const given = game.puzzle[i] !== 0
            const wrong = !given && v !== 0 && v !== game.solution[i]
            const cls = [
              'sd-cell',
              given ? 'given' : '',
              i === sel ? 'sel' : peer(i) ? 'peer' : '',
              v && v === selVal && i !== sel ? 'same' : '',
              wrong ? 'wrong' : '',
              (i % n) % box === box - 1 && i % n !== n - 1 ? 'br' : '',
              (Math.floor(i / n) % box) === box - 1 && Math.floor(i / n) !== n - 1 ? 'bb' : '',
            ].join(' ')
            return (
              <div key={i} className={cls} onClick={() => setSel(i)}>{label(v)}</div>
            )
          })}
        </div>
      )}

      {solved && <div className="sd-win">🎉 완성! 기록 {fmt(secs)}</div>}

      <div className="sd-pad" style={{ gridTemplateColumns: `repeat(${n === 9 ? 5 : 8}, 1fr)` }}>
        {Array.from({ length: n }, (_, i) => i + 1).map((v) => (
          <button key={v} className={counts[v] >= n ? 'done' : ''} onClick={() => input(v)}>
            {label(v)}
          </button>
        ))}
        <button className="erase" onClick={() => input(0)}>지우기</button>
      </div>
      <p className="hint">칸을 누르고 숫자를 고르세요. 틀린 숫자는 빨간색으로 표시돼요.</p>
    </div>
  )
}
