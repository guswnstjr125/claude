export type Size = 9 | 16
export type Difficulty = 'easy' | 'medium' | 'hard'

// 남길 힌트(주어진 숫자) 개수. 적을수록 어려움
export const CLUES: Record<Size, Record<Difficulty, number>> = {
  9: { easy: 40, medium: 32, hard: 26 },
  16: { easy: 150, medium: 120, hard: 110 },
}

const popcount = (x: number) => {
  let c = 0
  while (x) { x &= x - 1; c++ }
  return c
}

const shuffle = <T,>(a: T[]): T[] => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// 해의 개수를 limit개까지 센다. randomize=true면 첫 해를 grid에 채워 넣는다(랜덤 완성판 생성용).
function solve(grid: number[], n: number, box: number, limit: number, randomize: boolean): number {
  const rows = new Array(n).fill(0)
  const cols = new Array(n).fill(0)
  const boxes = new Array(n).fill(0)
  const boxOf = (i: number) => Math.floor(i / n / box) * box + Math.floor((i % n) / box)
  for (let i = 0; i < n * n; i++) {
    const v = grid[i]
    if (v) {
      const bit = 1 << (v - 1)
      rows[Math.floor(i / n)] |= bit
      cols[i % n] |= bit
      boxes[boxOf(i)] |= bit
    }
  }
  const full = (1 << n) - 1
  let count = 0

  const rec = (): boolean => {
    let best = -1
    let bestMask = 0
    let bestCnt = 99
    for (let i = 0; i < n * n; i++) {
      if (grid[i]) continue
      const mask = full & ~(rows[Math.floor(i / n)] | cols[i % n] | boxes[boxOf(i)])
      const c = popcount(mask)
      if (c < bestCnt) {
        best = i; bestMask = mask; bestCnt = c
        if (c <= 1) break
      }
    }
    if (best === -1) {
      count++
      return count >= limit
    }
    if (bestCnt === 0) return false
    const r = Math.floor(best / n), c = best % n, b = boxOf(best)
    const cand: number[] = []
    for (let v = 0; v < n; v++) if (bestMask & (1 << v)) cand.push(v)
    if (randomize) shuffle(cand)
    for (const v of cand) {
      const bit = 1 << v
      grid[best] = v + 1
      rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit
      const stop = rec()
      rows[r] &= ~bit; cols[c] &= ~bit; boxes[b] &= ~bit
      if (stop) return true // randomize일 땐 grid에 해가 남는다
      grid[best] = 0
    }
    return false
  }
  rec()
  return count
}

export function generate(size: Size, difficulty: Difficulty, budgetMs = 1200) {
  const n = size
  const box = Math.sqrt(n)
  const solution = new Array(n * n).fill(0)
  // 대각선 박스를 먼저 채워 무작위성 확보
  for (let b = 0; b < box; b++) {
    const nums = shuffle(Array.from({ length: n }, (_, i) => i + 1))
    for (let i = 0; i < box; i++)
      for (let j = 0; j < box; j++) solution[(b * box + i) * n + b * box + j] = nums[i * box + j]
  }
  solve(solution, n, box, 1, true)

  const puzzle = [...solution]
  const target = CLUES[size][difficulty]
  const start = Date.now()
  let clues = n * n
  for (const i of shuffle(Array.from({ length: n * n }, (_, k) => k))) {
    if (clues <= target || Date.now() - start > budgetMs) break
    const keep = puzzle[i]
    puzzle[i] = 0
    if (solve([...puzzle], n, box, 2, false) !== 1) puzzle[i] = keep
    else clues--
  }
  return { puzzle, solution }
}

export const label = (v: number) => (v === 0 ? '' : v <= 9 ? String(v) : String.fromCharCode(55 + v))
