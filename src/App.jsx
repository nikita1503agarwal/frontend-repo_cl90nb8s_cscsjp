import PacmanGame from './components/PacmanGame'

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.08),transparent_50%)]"></div>

      <div className="relative min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-3xl mx-auto">
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold tracking-tight">Pac-Man</h1>
            <p className="text-blue-200/80 mt-2">A lightweight canvas remake. Eat all pellets, avoid ghosts, grab power pellets to turn the tables.</p>
          </div>

          <div className="bg-slate-800/40 border border-sky-500/20 rounded-2xl p-4 shadow-xl">
            <PacmanGame />
          </div>

          <div className="text-center mt-6">
            <a href="/test" className="text-sky-300 hover:text-sky-200 underline underline-offset-4">Backend test page</a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
