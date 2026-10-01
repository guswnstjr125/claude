import { randomSolution, shuffle, type Difficulty } from './logic'

export type KillerDifficulty = Difficulty | 'expert'

export type Cage = { cells: number[]; sum: number }
export type KillerPuzzle = {
  solution: number[]
  puzzle: number[] // 처음부터 주어진 숫자(없으면 0)
  cages: Cage[]
  cageOf: number[]
}

const N = 9
const BOX = 3
const boxOf = (i: number) => Math.floor(i / N / BOX) * BOX + Math.floor((i % N) / BOX)
const popcount = (x: number) => { let c = 0; while (x) { x &= x - 1; c++ } return c }
const minSum = (k: number) => (k * (k + 1)) / 2
const maxSum = (k: number) => (k * (19 - k)) / 2

const neighbors = (i: number) => {
  const r = Math.floor(i / N), c = i % N
  const out: number[] = []
  if (r > 0) out.push(i - N)
  if (r < N - 1) out.push(i + N)
  if (c > 0) out.push(i - 1)
  if (c < N - 1) out.push(i + 1)
  return out
}

// 케이지 규칙(합, 중복 금지)을 포함해 해의 개수를 limit개까지 센다. 탐색이 너무 길어지면 limit으로 간주.
function countSolutions(given: number[], cages: Cage[], cageOf: number[], limit: number, maxNodes = 60000): number {
  const grid = [...given]
  const rows = new Array(N).fill(0), cols = new Array(N).fill(0), boxes = new Array(N).fill(0)
  const cUsed = new Array(cages.length).fill(0)
  const cRem = cages.map((c) => c.sum)
  const cLeft = cages.map((c) => c.cells.length)
  for (let i = 0; i < N * N; i++) {
    const v = grid[i]
    if (!v) continue
    const bit = 1 << (v - 1), cg = cageOf[i]
    rows[Math.floor(i / N)] |= bit; cols[i % N] |= bit; boxes[boxOf(i)] |= bit
    cUsed[cg] |= bit; cRem[cg] -= v; cLeft[cg]--
  }
  const cand = (i: number) => {
    const cg = cageOf[i]
    let mask = 511 & ~(rows[Math.floor(i / N)] | cols[i % N] | boxes[boxOf(i)] | cUsed[cg])
    const k = cLeft[cg] - 1
    for (let d = 1; d <= 9; d++) {
      if (!(mask & (1 << (d - 1)))) continue
      const rem = cRem[cg] - d
      if (k === 0 ? rem !== 0 : rem < minSum(k) || rem > maxSum(k)) mask &= ~(1 << (d - 1))
    }
    return mask
  }
  let count = 0, nodes = 0
  const rec = (): boolean => {
    if (++nodes > maxNodes) { count = limit; return true }
    let best = -1, bestMask = 0, bestCnt = 99
    for (let i = 0; i < N * N; i++) {
      if (grid[i]) continue
      const m = cand(i), c = popcount(m)
      if (c < bestCnt) { best = i; bestMask = m; bestCnt = c; if (c <= 1) break }
    }
    if (best === -1) { count++; return count >= limit }
    if (bestCnt === 0) return false
    const r = Math.floor(best / N), c = best % N, b = boxOf(best), cg = cageOf[best]
    for (let v = 1; v <= 9; v++) {
      const bit = 1 << (v - 1)
      if (!(bestMask & bit)) continue
      grid[best] = v
      rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit; cUsed[cg] |= bit; cRem[cg] -= v; cLeft[cg]--
      const stop = rec()
      rows[r] &= ~bit; cols[c] &= ~bit; boxes[b] &= ~bit; cUsed[cg] &= ~bit; cRem[cg] += v; cLeft[cg]++
      grid[best] = 0
      if (stop) return true
    }
    return false
  }
  rec()
  return count
}

// 난이도: 케이지 최대 크기와 추가로 공개하는 숫자 개수
const LEVEL: Record<Difficulty, { maxSize: number; extra: number }> = {
  easy: { maxSize: 3, extra: 12 },
  medium: { maxSize: 4, extra: 4 },
  hard: { maxSize: 5, extra: 0 },
}

function makeCages(solution: number[], maxSize: number) {
  const cageOf = new Array(N * N).fill(-1)
  const cages: Cage[] = []
  const digits: number[][] = []
  for (const start of shuffle(Array.from({ length: N * N }, (_, i) => i))) {
    if (cageOf[start] !== -1) continue
    const id = cages.length
    const cells = [start]
    const used = new Set([solution[start]])
    cageOf[start] = id
    const target = 2 + Math.floor(Math.random() * (maxSize - 1)) // 2..maxSize
    while (cells.length < target) {
      const opts = shuffle(cells.flatMap(neighbors)).filter((j) => cageOf[j] === -1 && !used.has(solution[j]))
      if (!opts.length) break
      const j = opts[0]
      cells.push(j); used.add(solution[j]); cageOf[j] = id
    }
    cages.push({ cells, sum: 0 })
    digits.push([...used])
  }
  // 혼자 남은 칸은 가능하면 이웃 케이지에 합친다
  for (let id = 0; id < cages.length; id++) {
    const cg = cages[id]
    if (cg.cells.length !== 1) continue
    const i = cg.cells[0]
    const to = neighbors(i).map((j) => cageOf[j]).find(
      (t) => t !== id && cages[t].cells.length < maxSize + 1 && !cages[t].cells.some((c) => solution[c] === solution[i]))
    if (to !== undefined) {
      cages[to].cells.push(i); cageOf[i] = to; cg.cells = []
    }
  }
  // 빈 케이지 제거 후 번호 다시 매기기
  const kept = cages.filter((c) => c.cells.length)
  kept.forEach((c, id) => {
    c.sum = c.cells.reduce((a, i) => a + solution[i], 0)
    c.cells.forEach((i) => { cageOf[i] = id })
  })
  return { cages: kept, cageOf }
}

// 매우 어려움: 주어진 숫자 없이 케이지 합만으로 답이 하나가 되는 퍼즐
function generateExpert(): KillerPuzzle | null {
  const zero = new Array(N * N).fill(0)
  const t0 = Date.now()
  while (Date.now() - t0 < 2500) {
    const solution = randomSolution(N)
    const { cages, cageOf } = makeCages(solution, 3)
    if (cages.some((c) => c.cells.length === 1)) continue
    if (countSolutions(zero, cages, cageOf, 2, 40000) !== 1) continue
    // 가능한 만큼 이웃 케이지를 합쳐 더 어렵게 (시간 제한 있음)
    const t1 = Date.now()
    let merged = true
    while (merged && Date.now() - t1 < 400) {
      merged = false
      const pairs: [number, number][] = []
      cages.forEach((c, a) => {
        const nb = new Set(c.cells.flatMap(neighbors).map((j) => cageOf[j]))
        nb.forEach((b) => { if (b > a) pairs.push([a, b]) })
      })
      for (const [a, b] of shuffle(pairs)) {
        if (Date.now() - t1 > 400) break
        const cells = [...cages[a].cells, ...cages[b].cells]
        if (cells.length > 5 || new Set(cells.map((i) => solution[i])).size < cells.length) continue
        const nc = cages.filter((_, k) => k !== a && k !== b)
        nc.push({ cells, sum: cells.reduce((x, i) => x + solution[i], 0) })
        const no = new Array(N * N).fill(0)
        nc.forEach((c, id) => c.cells.forEach((i) => { no[i] = id }))
        if (countSolutions(zero, nc, no, 2, 40000) === 1) {
          cages.length = 0; cages.push(...nc)
          no.forEach((v, i) => { cageOf[i] = v })
          merged = true
          break
        }
      }
    }
    return { solution, puzzle: zero, cages, cageOf }
  }
  return null
}

export function generateKiller(difficulty: KillerDifficulty): KillerPuzzle {
  if (difficulty === 'expert') {
    const g = generateExpert()
    if (g) return g
    difficulty = 'hard' // 시간 안에 못 만들면 어려움으로 대체
  }
  const { maxSize, extra } = LEVEL[difficulty]
  const solution = randomSolution(N)
  const { cages, cageOf } = makeCages(solution, maxSize)
  const puzzle = new Array(N * N).fill(0)
  // 해가 하나로 정해질 때까지 숫자를 몇 개씩 공개
  const order = shuffle(Array.from({ length: N * N }, (_, i) => i))
  let shown = 0
  while (countSolutions(puzzle, cages, cageOf, 2) !== 1 && shown < N * N) {
    for (let k = 0; k < 2 && shown < N * N; k++) { const i = order[shown++]; puzzle[i] = solution[i] }
  }
  // 필요 없는 힌트는 걷어낸다 (시간 제한 있음)
  const t0 = Date.now()
  for (const i of shuffle(order.slice(0, shown))) {
    if (Date.now() - t0 > 700) break
    puzzle[i] = 0
    if (countSolutions(puzzle, cages, cageOf, 2) !== 1) puzzle[i] = solution[i]
  }
  const hidden = order.filter((i) => !puzzle[i])
  for (let k = 0; k < extra && k < hidden.length; k++) puzzle[hidden[k]] = solution[hidden[k]]
  return { solution, puzzle, cages, cageOf }
}
