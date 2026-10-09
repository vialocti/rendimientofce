import { useEffect, useState } from 'react'
import { Card, ErrorBox, Stat } from '../components/ui.jsx'
import { api } from '../lib/api.js'
import { CLASIFICACIONES } from '../lib/config.js'
import { fechaLarga, num, pct } from '../lib/format.js'

const ACCESOS = [
  { id: 'generar', titulo: 'Generar ISA', desc: 'Revisá los lineamientos del cálculo y procesá el ISA de un grupo (sede, carrera y/o cohorte).' },
  { id: 'consulta', titulo: 'Consulta por grupo', desc: 'Informe del último cálculo guardado: distribución, componentes y detalle por alumno.' },
  { id: 'prioritarios', titulo: 'Alumnos prioritarios', desc: 'Listado de alumnos a seguir de cerca, por carrera, y búsqueda de cualquier persona.' },
  { id: 'informe', titulo: 'Informe por persona', desc: 'ISA, historia académica y regularidades de un alumno, listo para imprimir.' },
]

export default function Inicio({ activa }) {
  const [resumen, setResumen] = useState(null)
  const [error, setError] = useState('')

  // se vuelve a pedir cada vez que se entra a Inicio, para reflejar lo recién calculado
  useEffect(() => {
    if (!activa) return
    const ctrl = new AbortController()
    api.consultarRendimiento({}, ctrl.signal)
      .then(({ alumnos }) => {
        setError('')
        setResumen({
          n: alumnos.length,
          isaProm: alumnos.length ? alumnos.reduce((s, a) => s + Number(a.isa), 0) / alumnos.length : null,
          ultimaFecha: alumnos.map((a) => String(a.fechaAnalisis).slice(0, 10)).sort().at(-1),
          porClas: CLASIFICACIONES.map((c) => ({ ...c, n: alumnos.filter((a) => a.clasificacion === c.valor).length })),
        })
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message)
      })
    return () => ctrl.abort()
  }, [activa])

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <p className="text-sm text-slate-700">
          El ISA (Índice de Seguimiento Académico) resume en un valor de 0 a 100 la situación de cada alumno en su carrera
          y lo clasifica en prioritario, seguimiento recomendado o sin necesidad de seguimiento.
        </p>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {ACCESOS.map((a) => (
          <a key={a.id} href={`#/${a.id}`} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-bordo-300 hover:shadow">
            <div className="text-base font-semibold text-slate-800">{a.titulo}</div>
            <p className="mt-1 text-sm text-slate-500">{a.desc}</p>
            <div className="mt-3 text-sm font-medium text-bordo-700">Abrir →</div>
          </a>
        ))}
      </div>

      <ErrorBox>{error}</ErrorBox>

      {resumen && (
        <Card title="Estado de los cálculos guardados">
          {resumen.n ? (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                <Stat label="Alumnos calculados" value={resumen.n} sub={`Último análisis: ${fechaLarga(resumen.ultimaFecha)}`} />
                <Stat label="ISA promedio" value={num(resumen.isaProm, 1)} />
                {resumen.porClas.map((c) => (
                  <Stat key={c.valor} label={c.corto} value={c.n} sub={pct(c.n, resumen.n)} />
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-500">Cuenta el último cálculo de cada alumno por carrera, entre todos los grupos procesados.</p>
            </>
          ) : (
            <p className="text-sm text-slate-500">
              Todavía no hay cálculos guardados. Empezá por <a className="font-medium text-bordo-700 hover:underline" href="#/generar">Generar ISA</a>.
            </p>
          )}
        </Card>
      )}
    </div>
  )
}
