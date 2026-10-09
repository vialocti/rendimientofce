import { onAuthStateChanged, signOut } from 'firebase/auth'
import { useEffect, useState } from 'react'
import { Spinner } from './components/ui.jsx'
import { auth } from './lib/firebase.js'
import ConsultaGrupo from './pages/ConsultaGrupo.jsx'
import GenerarISA from './pages/GenerarISA.jsx'
import Informe from './pages/Informe.jsx'
import Inicio from './pages/Inicio.jsx'
import Login from './pages/Login.jsx'
import Prioritarios from './pages/Prioritarios.jsx'

const SECCIONES = [
  { id: 'inicio', titulo: 'Inicio', desc: 'Seguimiento del rendimiento académico de los alumnos de la FCE', Componente: Inicio },
  { id: 'generar', titulo: 'Generar ISA', desc: 'Lineamientos del cálculo y procesamiento del Índice de Seguimiento Académico por grupo', Componente: GenerarISA },
  { id: 'consulta', titulo: 'Consulta por grupo', desc: 'Informe del ISA por sede, carrera y cohorte', Componente: ConsultaGrupo },
  { id: 'prioritarios', titulo: 'Alumnos prioritarios', desc: 'Alumnos prioritarios por carrera, y búsqueda de cualquier persona con ISA calculado', Componente: Prioritarios },
  { id: 'informe', titulo: 'Informe por persona', desc: 'ISA, historia académica y regularidades de un alumno', Componente: Informe },
]

// el hash puede traer parámetros después de la sección: #/informe/<legajo>/<propuestaId>
const seccionDelHash = () => SECCIONES.find((s) => s.id === window.location.hash.split('/')[1])?.id ?? SECCIONES[0].id

// Puerta de entrada: sin usuario de Firebase solo se ve el login. El panel se monta recién
// con sesión iniciada, así ninguna pantalla pide datos antes.
function App() {
  const [usuario, setUsuario] = useState(undefined) // undefined = todavía no se sabe

  useEffect(() => onAuthStateChanged(auth, (u) => setUsuario(u ?? null)), [])

  if (usuario === undefined) {
    return (
      <div className="flex min-h-svh items-center justify-center gap-2 bg-slate-50 text-sm text-slate-500">
        <Spinner /> Cargando…
      </div>
    )
  }
  if (!usuario) return <Login />
  return <Panel usuario={usuario} />
}

function Panel({ usuario }) {
  const [actual, setActual] = useState(seccionDelHash)

  useEffect(() => {
    const onHash = () => setActual(seccionDelHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const seccion = SECCIONES.find((s) => s.id === actual)

  return (
    <div className="min-h-svh bg-slate-50 text-slate-800 md:flex print:block print:bg-white">
      <aside className="bg-bordo-800 text-white md:sticky md:top-0 md:flex md:h-svh md:w-60 md:shrink-0 md:flex-col print:hidden">
        <a href="#/inicio" className="block px-5 py-4">
          <div className="text-xs font-medium uppercase tracking-wider text-bordo-200">FCE · UNCuyo</div>
          <div className="text-lg font-semibold text-white">Rendimiento Académico</div>
        </a>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col">
          {SECCIONES.map((s) => (
            <a
              key={s.id}
              href={`#/${s.id}`}
              aria-current={s.id === actual ? 'page' : undefined}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
                s.id === actual ? 'bg-white text-bordo-800' : 'text-bordo-100 hover:bg-white/10'
              }`}
            >
              {s.titulo}
            </a>
          ))}
        </nav>
        <div className="flex items-center justify-between gap-3 border-t border-white/15 px-5 py-3 text-xs md:mt-auto md:flex-col md:items-start">
          <span className="truncate text-bordo-100" title={usuario.email}>{usuario.email}</span>
          <button type="button" className="shrink-0 font-medium text-white underline-offset-2 hover:underline" onClick={() => signOut(auth)}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 md:px-8 print:p-0">
        <div className="mx-auto max-w-7xl print:max-w-none">
          <div className="mb-5 print:hidden">
            <h1 className="text-xl font-semibold text-slate-900">{seccion.titulo}</h1>
            <p className="text-sm text-slate-500">{seccion.desc}</p>
          </div>
          {/* las secciones quedan montadas para no perder filtros/resultados al cambiar de pestaña */}
          {SECCIONES.map(({ id, Componente }) => (
            <div key={id} hidden={id !== actual}>
              <Componente activa={id === actual} />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

export default App
