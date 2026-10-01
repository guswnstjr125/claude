import { useCallback, useEffect, useMemo, useState } from 'react'
import { CLUES, generate, label, type Difficulty, type Size } from './sudoku/logic'
import { generateKiller, type Cage, type KillerDifficulty } from './sudoku/killer'

const DIFFS: { id: KillerDifficulty; name: string }[] = [
  { id: 'easy', name: '쉬움' },
  { id: 'medium', name: '보통' },
  { id: 'hard', name: '어려움' },
]
const KILLER_DIFFS: { id: KillerDifficulty; name: string }[] = [
  { id: 'beginner', name: '입문' },
  { id: 'easy', name: '쉬움' },
  { id: 'medium', name: '보통' },
  { id: 'hard', name: '어려움' },
  { id: 'expert', name: '매우 어려움' },
  { id: 'master', name: '극악' },
]

type Game = { puzzle: number[]; solution: number[]; cages?: Cage[]; cageOf?: number[] }

const peerOf = (a: number, b: number, n: number, box: number) => {
  const ar = Math.floor(a / n), ac = a % n, br = Math.floor(b / n), bc = b % n
  return ar === br || ac === bc ||
    (Math.floor(ar / box) === Math.floor(br / box) && Math.floor(ac / box) === Math.floor(bc / box))
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export default function Sudoku({ killer = false }: { killer?: boolean }) {
  const [size, setSize] = useState<Size>(9)
  const [diff, setDiff] = useState<KillerDifficulty>('easy')
  const [game, setGame] = useState<Game | null>(null)
  const [values, setValues] = useState<number[]>([])
  const [sel, setSel] = useState<number | null>(null)
  const [notes, setNotes] = useState<number[]>([]) // 칸마다 후보 숫자 비트마스크
  const [memo, setMemo] = useState(false)
  const [hinted, setHinted] = useState<boolean[]>([])
  const [hintCount, setHintCount] = useState(0)
  const [secs, setSecs] = useState(0)
  const [loading, setLoading] = useState(false)

  const n = size
  const box = Math.sqrt(n)

  const start = useCallback((s: Size, d: KillerDifficulty) => {
    setLoading(true)
    setGame(null)
    // 생성 중 "만드는 중..." 문구가 먼저 그려지도록 한 박자 늦춘다
    setTimeout(() => {
      const g: Game = killer ? generateKiller(d) : generate(s, d as Difficulty)
      setGame(g)
      setValues([...g.puzzle])
      setNotes(new Array(s * s).fill(0))
      setSel(null)
      setSecs(0)
      setHinted(new Array(s * s).fill(false))
      setHintCount(0)
      setLoading(false)
    }, 30)
  }, [killer])

  useEffect(() => { start(9, 'easy') }, [start])

  const solved = !!game && values.every((v, i) => v === game.solution[i])

  useEffect(() => {
    if (!game || solved) return
    const t = setInterval(() => setSecs((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [game, solved])

  const input = useCallback((v: number) => {
    if (!game || sel === null || game.puzzle[sel] || hinted[sel] || solved) return // 힌트로 채운 칸은 잠금
    if (v === 0) {
      setValues((prev) => prev.map((x, i) => (i === sel ? 0 : x)))
      setNotes((prev) => prev.map((m, i) => (i === sel ? 0 : m)))
      return
    }
    if (memo) {
      if (values[sel]) return // 숫자가 있는 칸엔 메모 불가
      setNotes((prev) => prev.map((m, i) => (i === sel ? m ^ (1 << (v - 1)) : m)))
      return
    }
    setValues((prev) => prev.map((x, i) => (i === sel ? v : x)))
    // 확정한 칸의 메모는 비우고, 같은 줄/열/박스의 같은 숫자 메모는 지운다
    setNotes((prev) => prev.map((m, i) =>
      i === sel ? 0 : peerOf(sel, i, n, box) ? m & ~(1 << (v - 1)) : m))
  }, [game, sel, solved, memo, values, hinted, n, box])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toUpperCase() === 'M') return setMemo((m) => !m)
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

  // 힌트: 선택한 칸(없거나 이미 맞으면 틀리거나 빈 칸 중 하나)의 정답을 채워 준다
  const hint = () => {
    if (!game || solved) return
    const wrongOrEmpty = (i: number) => !game.puzzle[i] && values[i] !== game.solution[i]
    let target = sel !== null && wrongOrEmpty(sel) ? sel : -1
    if (target < 0) {
      const cands = values.map((_, i) => i).filter(wrongOrEmpty)
      if (!cands.length) return
      target = cands[Math.floor(Math.random() * cands.length)]
    }
    const v = game.solution[target]
    setValues((prev) => prev.map((x, i) => (i === target ? v : x)))
    setNotes((prev) => prev.map((m, i) =>
      i === target ? 0 : peerOf(target, i, n, box) ? m & ~(1 << (v - 1)) : m))
    setHinted((prev) => prev.map((h, i) => h || i === target))
    setHintCount((c) => c + 1)
    setSel(target)
  }

  const changeSize = (s: Size) => { setSize(s); start(s, diff) }
  const changeDiff = (d: KillerDifficulty) => { setDiff(d); start(size, d) }

  // 같은 숫자 개수 (다 채운 숫자는 패드에서 흐리게)
  const counts = useMemo(() => {
    const c = new Array(n + 1).fill(0)
    values.forEach((v) => { c[v]++ })
    return c
  }, [values, n])

  const cageBox = (i: number) => {
    if (!game?.cageOf || !game.cages) return null
    const cg = game.cageOf[i]
    const edge = (j: number, outside: boolean) => outside || game.cageOf![j] !== cg
    const r = Math.floor(i / n), c = i % n
    const top = edge(i - n, r === 0), bottom = edge(i + n, r === n - 1)
    const left = edge(i - 1, c === 0), right = edge(i + 1, c === n - 1)
    const cage = game.cages[cg]
    const first = Math.min(...cage.cells) === i
    return (
      <>
        <span className={`cage ${top ? 'ct' : ''} ${bottom ? 'cb' : ''} ${left ? 'cl' : ''} ${right ? 'cr' : ''}`} />
        {first && <span className="csum">{cage.sum}</span>}
      </>
    )
  }

  const selVal = sel !== null ? values[sel] : 0
  const peer = (i: number) => sel !== null && peerOf(sel, i, n, box)

  return (
    <div className={`sudoku s${n} ${killer ? 'killer' : ''}`}>
      {!killer && <div className="sd-row">
        {([9, 16] as Size[]).map((s) => (
          <button key={s} className={`seg ${size === s ? 'on' : ''}`} onClick={() => changeSize(s)}>
            {s}×{s}
          </button>
        ))}
      </div>}
      <div className={`sd-row ${killer ? 'wrap' : ''}`}>
        {(killer ? KILLER_DIFFS : DIFFS).map((d) => (
          <button key={d.id} className={`seg ${diff === d.id ? 'on' : ''}`} onClick={() => changeDiff(d.id)}>
            {d.name}
          </button>
        ))}
      </div>
      <div className="sd-info">
        <span>⏱ {fmt(secs)}</span>
        <span>{killer ? `케이지 ${game?.cages?.length ?? '-'}개` : `주어진 숫자 ${CLUES[size][diff as Difficulty]}개`}</span>
        <button className="small" onClick={() => start(size, diff)}>새 게임</button>
      </div>

      {loading || !game ? (
        <div className="sd-loading">퍼즐 만드는 중...</div>
      ) : (
        <div className="sd-board" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${n}, minmax(0, 1fr))` }}>
          {values.map((v, i) => {
            const given = game.puzzle[i] !== 0
            const wrong = !given && v !== 0 && v !== game.solution[i]
            const cls = [
              'sd-cell',
              given ? 'given' : '',
              i === sel ? 'sel' : peer(i) ? 'peer' : '',
              v && v === selVal && i !== sel ? 'same' : '',
              wrong ? 'wrong' : '',
              hinted[i] ? 'hinted' : '',
              (i % n) % box === box - 1 && i % n !== n - 1 ? 'br' : '',
              (Math.floor(i / n) % box) === box - 1 && Math.floor(i / n) !== n - 1 ? 'bb' : '',
            ].join(' ')
            return (
              <div key={i} className={cls} onClick={() => setSel(i)}>
                {cageBox(i)}
                {v ? label(v) : notes[i] ? (
                  <div className="notes" style={{ gridTemplateColumns: `repeat(${box}, 1fr)` }}>
                    {Array.from({ length: n }, (_, k) => (
                      <span key={k} className={selVal === k + 1 ? 'hl' : ''}>
                        {notes[i] & (1 << k) ? label(k + 1) : ''}
                      </span>
                    ))}
                  </div>
                ) : ''}
              </div>
            )
          })}
        </div>
      )}

      {solved && <div className="sd-win">🎉 완성! 기록 {fmt(secs)}{hintCount ? ` · 힌트 ${hintCount}회` : ''}</div>}

      <div className="sd-pad" style={{ gridTemplateColumns: `repeat(${n === 9 ? 5 : 8}, 1fr)` }}>
        {Array.from({ length: n }, (_, i) => i + 1).map((v) => (
          <button key={v} className={[counts[v] >= n ? 'done' : '', memo && sel !== null && notes[sel] & (1 << (v - 1)) ? 'noted' : ''].join(' ')} onClick={() => input(v)}>
            {label(v)}
          </button>
        ))}
        <button className={`memo ${memo ? 'on' : ''}`} onClick={() => setMemo((m) => !m)}>
          ✏️ 메모 {memo ? 'ON' : 'OFF'}
        </button>
        <button className="erase" onClick={() => input(0)}>지우기</button>
        <button className="hintbtn" onClick={hint}>💡 힌트{hintCount ? ` (${hintCount})` : ''}</button>
      </div>
      <p className="hint build">빌드 {__BUILD__}</p>
      <p className="hint">칸을 누르고 숫자를 고르세요. 메모 ON이면 후보 숫자를 작게 적어요. 틀린 숫자는 빨간색으로 표시돼요.</p>
    </div>
  )
}
