import React, { useEffect, useRef, useState } from 'react'

// Simple Pac-Man style game rendered on a canvas
// - Arrow/WASD to move
// - Eat pellets to score
// - Power pellets let you eat ghosts for bonus points
// - 3 lives

const TILE = 22
const ROWS = 21
const COLS = 19
const SPEED = 2.2 // pixels per frame

// Map legend: 0 empty, 1 wall, 2 pellet, 3 power pellet, 4 spawn area (no pellets)
const LEVEL = [
  // 19 columns per row, 21 rows
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,3,2,2,2,2,2,2,1,1,1,2,2,2,2,2,2,3,1],
  [1,2,1,1,1,2,1,2,2,2,2,2,1,2,1,1,1,2,1],
  [1,2,1,0,1,2,1,1,1,4,1,1,1,2,1,0,1,2,1],
  [1,2,1,0,1,2,2,2,0,4,0,2,2,2,1,0,1,2,1],
  [1,2,1,0,1,1,1,2,0,4,0,2,1,1,1,0,1,2,1],
  [1,2,2,2,2,2,2,2,0,4,0,2,2,2,2,2,2,2,1],
  [1,2,1,1,1,2,1,1,1,4,1,1,1,2,1,1,1,2,1],
  [1,2,1,0,0,2,2,2,2,0,2,2,2,2,0,0,1,2,1],
  [1,2,1,0,1,1,1,1,1,0,1,1,1,1,1,0,1,2,1],
  [1,2,0,0,1,2,2,2,0,0,0,2,2,2,1,0,0,2,1],
  [1,2,1,0,1,2,1,1,1,4,1,1,1,2,1,0,1,2,1],
  [1,2,1,0,1,2,2,2,0,4,0,2,2,2,1,0,1,2,1],
  [1,2,1,0,1,1,1,2,0,4,0,2,1,1,1,0,1,2,1],
  [1,2,2,2,2,2,2,2,0,0,0,2,2,2,2,2,2,2,1],
  [1,2,1,1,1,2,1,1,1,1,1,1,1,2,1,1,1,2,1],
  [1,3,2,2,1,2,2,2,2,1,2,2,2,2,1,2,2,3,1],
  [1,2,1,2,1,1,1,1,2,1,2,1,1,1,1,2,1,2,1],
  [1,2,2,2,2,2,2,2,2,0,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,2,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
]

// Utility
const clone2D = (grid) => grid.map((r) => [...r])

const DIRECTIONS = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  w: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  a: { x: -1, y: 0 },
  d: { x: 1, y: 0 },
}

function rectIntersects(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

export default function PacmanGame() {
  const canvasRef = useRef(null)
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [levelGrid, setLevelGrid] = useState(() => clone2D(LEVEL))
  const [playing, setPlaying] = useState(true)
  const [message, setMessage] = useState('')

  // Game state held in refs to avoid rerenders each frame
  const pacRef = useRef({ x: 9 * TILE + TILE / 2, y: 15 * TILE + TILE / 2, dir: { x: 0, y: 0 }, nextDir: { x: 0, y: 0 }, radius: 8, mouth: 0, mouthOpen: true })
  const ghostsRef = useRef([
    { x: 9 * TILE + TILE / 2, y: 10 * TILE + TILE / 2, dir: { x: 1, y: 0 }, color: '#ff4d4f', mode: 'chase', speed: 1.8, frightened: 0 },
    { x: 8 * TILE + TILE / 2, y: 10 * TILE + TILE / 2, dir: { x: -1, y: 0 }, color: '#40a9ff', mode: 'chase', speed: 1.8, frightened: 0 },
    { x: 10 * TILE + TILE / 2, y: 10 * TILE + TILE / 2, dir: { x: 0, y: 1 }, color: '#73d13d', mode: 'chase', speed: 1.8, frightened: 0 },
    { x: 9 * TILE + TILE / 2, y: 9 * TILE + TILE / 2, dir: { x: 0, y: -1 }, color: '#9254de', mode: 'chase', speed: 1.8, frightened: 0 },
  ])
  const keysRef = useRef({})
  const animRef = useRef(0)
  const pelletsLeftRef = useRef(0)

  useEffect(() => {
    // Count pellets
    let count = 0
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (levelGrid[r][c] === 2) count++
        if (levelGrid[r][c] === 3) count++
      }
    }
    pelletsLeftRef.current = count
  }, [])

  useEffect(() => {
    const onKeyDown = (e) => {
      const k = e.key
      if (DIRECTIONS[k]) {
        e.preventDefault()
        pacRef.current.nextDir = DIRECTIONS[k]
      }
      if (!playing && (k === 'Enter' || k === ' ')) {
        restart()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing])

  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d')
    let last = performance.now()

    function canMove(nx, ny) {
      const size = TILE - 6
      const left = nx - size / 2
      const top = ny - size / 2
      const right = nx + size / 2
      const bottom = ny + size / 2

      const minC = Math.floor(left / TILE)
      const maxC = Math.floor(right / TILE)
      const minR = Math.floor(top / TILE)
      const maxR = Math.floor(bottom / TILE)

      for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
          if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return false
          if (LEVEL[r][c] === 1) return false
        }
      }
      return true
    }

    function eatPellet(px, py) {
      const r = Math.floor(py / TILE)
      const c = Math.floor(px / TILE)
      const cell = levelGrid[r][c]
      if (cell === 2) {
        levelGrid[r][c] = 0
        pelletsLeftRef.current -= 1
        setScore((s) => s + 10)
      } else if (cell === 3) {
        levelGrid[r][c] = 0
        pelletsLeftRef.current -= 1
        setScore((s) => s + 50)
        // frighten ghosts
        ghostsRef.current.forEach((g) => (g.frightened = 6 * 60))
      }
      // trigger rerender of grid occasionally
      if ((pelletsLeftRef.current & 7) === 0) setLevelGrid((g) => clone2D(g))

      if (pelletsLeftRef.current <= 0) {
        win()
      }
    }

    function resetPositions() {
      pacRef.current = { x: 9 * TILE + TILE / 2, y: 15 * TILE + TILE / 2, dir: { x: 0, y: 0 }, nextDir: { x: 0, y: 0 }, radius: 8, mouth: 0, mouthOpen: true }
      ghostsRef.current = [
        { x: 9 * TILE + TILE / 2, y: 10 * TILE + TILE / 2, dir: { x: 1, y: 0 }, color: '#ff4d4f', mode: 'chase', speed: 1.8, frightened: 0 },
        { x: 8 * TILE + TILE / 2, y: 10 * TILE + TILE / 2, dir: { x: -1, y: 0 }, color: '#40a9ff', mode: 'chase', speed: 1.8, frightened: 0 },
        { x: 10 * TILE + TILE / 2, y: 10 * TILE + TILE / 2, dir: { x: 0, y: 1 }, color: '#73d13d', mode: 'chase', speed: 1.8, frightened: 0 },
        { x: 9 * TILE + TILE / 2, y: 9 * TILE + TILE / 2, dir: { x: 0, y: -1 }, color: '#9254de', mode: 'chase', speed: 1.8, frightened: 0 },
      ]
    }

    function loseLife() {
      setLives((l) => {
        const nl = l - 1
        if (nl <= 0) {
          gameOver()
        } else {
          resetPositions()
        }
        return nl
      })
    }

    function gameOver() {
      setMessage('Game Over — Press Enter to play again')
      setPlaying(false)
    }

    function win() {
      setMessage('You cleared the board! Press Enter to play again')
      setPlaying(false)
    }

    function restart() {
      setScore(0)
      setLives(3)
      setLevelGrid(clone2D(LEVEL))
      pelletsLeftRef.current = 0
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (LEVEL[r][c] === 2 || LEVEL[r][c] === 3) pelletsLeftRef.current++
        }
      }
      resetPositions()
      setMessage('')
      setPlaying(true)
    }

    function chooseTurnChoices(x, y, currentDir) {
      const tileR = Math.floor(y / TILE)
      const tileC = Math.floor(x / TILE)
      const choices = []
      const options = [
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: -1 },
      ]
      for (const d of options) {
        if (d.x === -currentDir.x && d.y === -currentDir.y) continue // don't reverse by default
        const nx = tileC * TILE + TILE / 2 + d.x * TILE
        const ny = tileR * TILE + TILE / 2 + d.y * TILE
        if (canMove(nx, ny)) choices.push(d)
      }
      if (choices.length === 0) choices.push({ x: -currentDir.x, y: -currentDir.y }) // dead end -> reverse
      return choices
    }

    function update(dt) {
      // PAC input smoothing: apply queued direction if possible
      const pac = pacRef.current
      const speed = SPEED * (dt / (1000 / 60))

      // Portal tunnel in the middle row where map has 0 corridors
      if (pac.y > 9.5 * TILE && pac.y < 11.5 * TILE) {
        if (pac.x < -5) pac.x = COLS * TILE + 5
        if (pac.x > COLS * TILE + 5) pac.x = -5
      }

      // Try to apply nextDir at tile centers to get crisp turns
      const centerX = Math.round(pac.x / (TILE / 2)) * (TILE / 2)
      const centerY = Math.round(pac.y / (TILE / 2)) * (TILE / 2)
      const nearCenter = Math.hypot(centerX - pac.x, centerY - pac.y) < 2.5
      if (nearCenter) {
        const nx = Math.floor((pac.x + pac.nextDir.x * TILE) / TILE) * TILE + TILE / 2
        const ny = Math.floor((pac.y + pac.nextDir.y * TILE) / TILE) * TILE + TILE / 2
        if (canMove(nx, ny)) {
          pac.dir = { ...pac.nextDir }
        }
      }

      // Move pac
      const px = pac.x + pac.dir.x * speed
      const py = pac.y + pac.dir.y * speed
      if (canMove(px, py)) {
        pac.x = px
        pac.y = py
      } else {
        // stop at wall
        pac.dir = { x: 0, y: 0 }
      }

      // Mouth animation
      pac.mouth += 0.15
      if (pac.mouth > Math.PI) pac.mouth = 0

      // Eat pellets
      eatPellet(pac.x, pac.y)

      // Update ghosts
      ghostsRef.current.forEach((g, i) => {
        if (g.frightened > 0) g.frightened -= 1
        const gSpeed = (g.frightened > 0 ? 1.4 : g.speed) * (dt / (1000 / 60))

        // At tile centers, possibly change direction
        const gcx = Math.round(g.x / TILE) * TILE + TILE / 2
        const gcy = Math.round(g.y / TILE) * TILE + TILE / 2
        const close = Math.hypot(gcx - g.x, gcy - g.y) < 2.5
        if (close) {
          const options = chooseTurnChoices(g.x, g.y, g.dir)
          // Simple AI: target pacman tile when not frightened, else random
          let chosen
          if (g.frightened > 0) {
            chosen = options[Math.floor(Math.random() * options.length)]
          } else {
            // choose option that minimizes distance to pac
            let best = Infinity
            for (const d of options) {
              const nx = g.x + d.x * TILE
              const ny = g.y + d.y * TILE
              const dist = Math.hypot(nx - pac.x, ny - pac.y)
              if (dist < best) {
                best = dist
                chosen = d
              }
            }
          }
          g.dir = chosen || g.dir
        }

        // Move
        const gx = g.x + g.dir.x * gSpeed
        const gy = g.y + g.dir.y * gSpeed
        if (canMove(gx, gy)) {
          g.x = gx
          g.y = gy
        } else {
          // reverse if hit wall
          g.dir = { x: -g.dir.x, y: -g.dir.y }
        }

        // Portal tunnel
        if (g.y > 9.5 * TILE && g.y < 11.5 * TILE) {
          if (g.x < -5) g.x = COLS * TILE + 5
          if (g.x > COLS * TILE + 5) g.x = -5
        }

        // Collision with Pacman
        if (rectIntersects(pac.x - 8, pac.y - 8, 16, 16, g.x - 9, g.y - 9, 18, 18)) {
          if (g.frightened > 0) {
            // eat ghost
            setScore((s) => s + 200)
            // send ghost back to house
            g.x = 9 * TILE + TILE / 2
            g.y = 10 * TILE + TILE / 2
            g.dir = { x: 0, y: 0 }
            g.frightened = 0
          } else {
            loseLife()
          }
        }
      })

      // Draw
      draw(ctx)
    }

    function draw(ctx) {
      const w = COLS * TILE
      const h = ROWS * TILE
      ctx.clearRect(0, 0, w, h)

      // background
      ctx.fillStyle = '#0f172a'
      ctx.fillRect(0, 0, w, h)

      // grid
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const x = c * TILE
          const y = r * TILE
          const cell = levelGrid[r][c]
          if (cell === 1) {
            ctx.fillStyle = '#1e293b'
            ctx.fillRect(x, y, TILE, TILE)
            ctx.strokeStyle = '#38bdf8'
            ctx.lineWidth = 2
            ctx.strokeRect(x + 2, y + 2, TILE - 4, TILE - 4)
          } else if (cell === 2) {
            ctx.fillStyle = '#f8fafc'
            ctx.beginPath()
            ctx.arc(x + TILE / 2, y + TILE / 2, 2.2, 0, Math.PI * 2)
            ctx.fill()
          } else if (cell === 3) {
            ctx.fillStyle = '#fde68a'
            ctx.beginPath()
            ctx.arc(x + TILE / 2, y + TILE / 2, 5, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }

      // Pac-Man
      const pac = pacRef.current
      ctx.fillStyle = '#facc15'
      const angle = Math.abs(Math.sin(pac.mouth)) * 0.6 + 0.2
      const start = Math.atan2(pac.dir.y, pac.dir.x) - angle
      const end = Math.atan2(pac.dir.y, pac.dir.x) + angle
      if (pac.dir.x === 0 && pac.dir.y === 0) {
        // default facing right
        ctx.beginPath()
        ctx.arc(pac.x, pac.y, pac.radius, 0.2, Math.PI * 2 - 0.2)
        ctx.lineTo(pac.x, pac.y)
        ctx.fill()
      } else {
        ctx.beginPath()
        ctx.moveTo(pac.x, pac.y)
        ctx.arc(pac.x, pac.y, pac.radius, start, Math.PI * 2 + end)
        ctx.closePath()
        ctx.fill()
      }

      // Ghosts
      ghostsRef.current.forEach((g) => {
        const frightened = g.frightened > 0
        const bodyColor = frightened ? '#94a3b8' : g.color
        ctx.fillStyle = bodyColor
        const gx = g.x
        const gy = g.y
        const r = 9
        // body
        ctx.beginPath()
        ctx.arc(gx, gy, r, Math.PI, 0)
        ctx.lineTo(gx + r, gy + r)
        for (let i = 0; i < 4; i++) {
          const wx = gx + r - i * (r / 2)
          const wy = gy + r
          ctx.lineTo(wx - r / 4, wy)
          ctx.lineTo(wx - r / 2, wy + 4)
        }
        ctx.lineTo(gx - r, gy + r)
        ctx.closePath()
        ctx.fill()
        // eyes
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.arc(gx - 3, gy - 2, 3, 0, Math.PI * 2)
        ctx.arc(gx + 3, gy - 2, 3, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = frightened ? '#0ea5e9' : '#111827'
        ctx.beginPath()
        ctx.arc(gx - 3 + Math.sign(pac.x - gx), gy - 2 + Math.sign(pac.y - gy), 1.5, 0, Math.PI * 2)
        ctx.arc(gx + 3 + Math.sign(pac.x - gx), gy - 2 + Math.sign(pac.y - gy), 1.5, 0, Math.PI * 2)
        ctx.fill()
      })
    }

    function loop(now) {
      const dt = Math.min(32, now - last)
      last = now
      if (playing) update(dt)
      animRef.current = requestAnimationFrame(loop)
    }

    animRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, levelGrid])

  return (
    <div className="w-full flex flex-col items-center gap-3">
      <div className="flex items-center justify-between w-full max-w-[420px]">
        <div className="text-yellow-300 font-bold">Score: {score}</div>
        <div className="text-pink-300 font-semibold">Lives: {lives}</div>
      </div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={COLS * TILE}
          height={ROWS * TILE}
          className="rounded-xl border border-sky-500/40 shadow-[0_0_0_1px_rgba(56,189,248,0.2)_inset] bg-slate-900"
        />
        {!playing && (
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center rounded-xl">
            <div className="text-center p-4">
              <div className="text-white text-lg mb-2">{message}</div>
              <div className="text-sky-300">Press Enter to restart</div>
            </div>
          </div>
        )}
      </div>
      <div className="text-sky-300/80 text-sm">Use Arrow Keys or WASD to move</div>
    </div>
  )
}
