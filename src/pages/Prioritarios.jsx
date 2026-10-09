import { useMemo, useState } from 'react'
import { DetalleAlumno, completudTexto, motivos, nombreAlumno } from '../components/rendimiento.jsx'
import { Button, Card, ClasificacionBadge, Empty, ErrorBox, Field, Input, Select, Spinner, Stat } from '../components/ui.jsx'
import { api } from '../lib/api.js'
import { PROPUESTAS, UMBRAL_ALERTA_COMPONENTE, UMBRAL_PRIORITARIO, propuestaSigla, sedeSigla } from '../lib/config.js'
import { descargarCSV, fechaCorta, fechaLarga, hoyISO, num, pct } from '../lib/format.js'

// clasificacion vacía = todos los alumnos calculados (para buscar a cualquier persona)
const PRIORITARIO = 'Prioritario'
const FILTRO_INICIAL = { clasificacion: PRIORITARIO, propuestaId: '', persona: '' }

function describirFiltro(f) {
  const partes = [f.clasificacion ? 'Alumnos prioritarios' : 'Todos los alumnos calculados']
  partes.push(f.propuestaId ? PROPUESTAS.find((p) => p.id === Number(f.propuestaId))?.nombre : 'Todas las carreras')
  if (f.persona) partes.push(`“${f.persona}”`)
  return partes.join(' · ')
}

export default function Prioritarios() {
  const [filtro, setFiltro] = useState(FILTRO_INICIAL)
  const [aplicado, setAplicado] = useState(null) // filtro con el que se obtuvieron los datos
  const [alumnos, setAlumnos] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [abierto, setAbierto] = useState(null)

  const set = (k) => (e) => setFiltro((f) => ({ ...f, [k]: e.target.value }))

  async function consultar(e) {
    e?.preventDefault()
    const f = { ...filtro, persona: filtro.persona.trim() }
    setCargando(true)
    setError('')
    try {
      const { alumnos } = await api.consultarRendimiento({
        clasificacion: f.clasificacion, propuestaId: f.propuestaId, persona: f.persona,
      })
      setAlumnos(alumnos.map((a) => ({ ...a, isa: Number(a.isa) })))
      setAplicado(f)
      setAbierto(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  const stats = useMemo(() => {
    if (!alumnos?.length) return null
    const n = alumnos.length
    return {
      n,
      isaProm: alumnos.reduce((s, a) => s + a.isa, 0) / n,
      isaBajo: alumnos.filter((a) => a.isa < UMBRAL_PRIORITARIO).length,
      prioritarios: alumnos.filter((a) => a.clasificacion === PRIORITARIO).length,
      soloAlerta: alumnos.filter((a) => a.clasificacion === PRIORITARIO && a.isa >= UMBRAL_PRIORITARIO).length,
      porCarrera: PROPUESTAS.map((p) => ({ ...p, n: alumnos.filter((a) => Number(a.propuestaId) === p.id).length })).filter((p) => p.n),
    }
  }, [alumnos])

  function exportar() {
    descargarCSV(`${aplicado.clasificacion ? 'prioritarios' : 'alumnos'}_${hoyISO()}.csv`, [
      { titulo: 'Apellido', valor: (a) => a.apellido ?? '' },
      { titulo: 'Nombres', valor: (a) => a.nombres ?? '' },
      { titulo: 'Legajo', valor: (a) => a.legajo },
      { titulo: 'Carrera', valor: (a) => propuestaSigla(a.propuestaId) },
      { titulo: 'Sede', valor: (a) => sedeSigla(a.sedeId) },
      { titulo: 'Año ingreso', valor: (a) => a.anioIngreso },
      { titulo: 'Año ingreso propuesta', valor: (a) => a.anioIngresoPropuesta ?? '' },
      { titulo: 'Año ingreso facultad', valor: (a) => a.anioIngresoFacultad ?? '' },
      { titulo: 'ISA', valor: (a) => num(a.isa, 1) },
      { titulo: 'Clasificación', valor: (a) => a.clasificacion },
      { titulo: 'Motivo', valor: (a) => motivos(a).join(', ') },
      { titulo: 'Coef. carrera', valor: (a) => num(a.coefCarrera) },
      { titulo: 'Completud %', valor: (a) => num(a.completud, 1) },
      { titulo: 'Promedio notas', valor: (a) => num(a.promedioNotas) },
      { titulo: 'RAN', valor: (a) => a.cantRan ?? '' },
      { titulo: 'Regularidad vigente', valor: (a) => a.regVig ?? '' },
      { titulo: 'Fecha análisis', valor: (a) => fechaCorta(a.fechaAnalisis) },
    ], alumnos)
  }

  return (
    <div className="flex flex-col gap-5">
      <Card title="Buscar" className="print:hidden">
        <form onSubmit={consultar}>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Alumnos">
              <Select value={filtro.clasificacion} onChange={set('clasificacion')} options={[{ value: PRIORITARIO, label: 'Solo prioritarios' }]} placeholder="Todos" />
            </Field>
            <Field label="Carrera">
              <Select value={filtro.propuestaId} onChange={set('propuestaId')} options={PROPUESTAS.map((p) => ({ value: p.id, label: `${p.sigla} — ${p.nombre}` }))} />
            </Field>
            <Field label="Persona" hint="Legajo o documento exactos, o parte del apellido">
              <Input value={filtro.persona} onChange={set('persona')} placeholder="Opcional" />
            </Field>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button variant="primary" type="submit" disabled={cargando}>
              {cargando && <Spinner />} Consultar
            </Button>
            <span className="text-xs text-slate-500">
              Prioritario = ISA menor a {UMBRAL_PRIORITARIO} o algún componente menor a {UMBRAL_ALERTA_COMPONENTE}, según el último cálculo guardado.
              Con “Todos” podés buscar a cualquier persona, sea o no prioritaria.
            </span>
          </div>
        </form>
      </Card>

      <ErrorBox>{error}</ErrorBox>

      {alumnos && !alumnos.length && (
        <Empty>
          {!aplicado.clasificacion && 'No hay alumnos con ISA calculado para esta búsqueda. Puede que su grupo todavía no esté calculado.'}
          {aplicado.clasificacion && (aplicado.persona
            ? `No hay alumnos prioritarios que coincidan con “${aplicado.persona}”. Probá con “Todos”: puede que no esté clasificado como prioritario.`
            : 'No hay alumnos prioritarios para esta carrera en los cálculos guardados.')}
        </Empty>
      )}

      {stats && (
        <>
          <div className="hidden print:block">
            <h1 className="text-xl font-semibold">{aplicado.clasificacion ? 'Alumnos prioritarios' : 'Alumnos con ISA calculado'}</h1>
            <p className="text-sm text-slate-600">{describirFiltro(aplicado)} — emitido el {fechaLarga(hoyISO())}</p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-slate-800">{describirFiltro(aplicado)}</p>
            <div className="flex gap-2 print:hidden">
              <Button onClick={exportar}>Exportar CSV</Button>
              <Button onClick={() => window.print()}>Imprimir</Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat
              label={aplicado.clasificacion ? 'Prioritarios' : 'Alumnos'}
              value={stats.n}
              sub={[!aplicado.clasificacion && `${stats.prioritarios} prioritarios`, ...stats.porCarrera.map((p) => `${p.sigla} ${p.n}`)].filter(Boolean).join(' · ')}
            />
            <Stat label="ISA promedio" value={num(stats.isaProm, 1)} />
            <Stat label="Prioritarios por ISA bajo" value={stats.isaBajo} sub={`${pct(stats.isaBajo, stats.n)} · ISA menor a ${UMBRAL_PRIORITARIO}`} />
            <Stat label="Prioritarios solo por componente" value={stats.soloAlerta} sub={`${pct(stats.soloAlerta, stats.n)} · ISA aceptable con un componente < ${UMBRAL_ALERTA_COMPONENTE}`} />
          </div>

          <Card title={`Listado (${stats.n})`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    {['Alumno', 'Legajo', 'Carrera', 'Sede', 'Ingreso', 'ISA', ...(aplicado.clasificacion ? [] : ['Clasificación']), 'Motivo', 'Coef.', 'Completud', 'Prom.'].map((t) => (
                      <th key={t} className="whitespace-nowrap px-2 py-2 font-medium">{t}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {alumnos.map((a) => {
                    const id = `${a.legajo}-${a.propuestaId}-${a.fechaAnalisis}`
                    return (
                      <FilaPrioritario key={id} a={a} conClasificacion={!aplicado.clasificacion} abierto={abierto === id} onToggle={() => setAbierto(abierto === id ? null : id)} />
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-slate-500 print:hidden">Ordenado de menor a mayor ISA. Hacé clic en una fila para ver el detalle.</p>
          </Card>
        </>
      )}
    </div>
  )
}

function FilaPrioritario({ a, conClasificacion, abierto, onToggle }) {
  return (
    <>
      <tr className="cursor-pointer border-b border-slate-100 align-top hover:bg-slate-50 print:break-inside-avoid" onClick={onToggle}>
        <td className="px-2 py-2 font-medium text-slate-800">{nombreAlumno(a)}</td>
        <td className="px-2 py-2 font-mono">{a.legajo}</td>
        <td className="px-2 py-2">{propuestaSigla(a.propuestaId)}</td>
        <td className="px-2 py-2">{sedeSigla(a.sedeId)}</td>
        <td className="px-2 py-2 tabular-nums">{a.anioIngreso ?? '—'}</td>
        <td className="px-2 py-2 font-semibold tabular-nums">{num(a.isa, 1)}</td>
        {conClasificacion && <td className="px-2 py-2"><ClasificacionBadge valor={a.clasificacion} /></td>}
        <td className="px-2 py-2 text-slate-600">{motivos(a).join(', ') || '—'}</td>
        <td className="px-2 py-2 tabular-nums">{num(a.coefCarrera)}</td>
        <td className="px-2 py-2 tabular-nums">{completudTexto(a)}</td>
        <td className="px-2 py-2 tabular-nums">{num(a.promedioNotas)}</td>
      </tr>
      {abierto && (
        <tr className="bg-slate-50 print:hidden">
          <td colSpan={conClasificacion ? 11 : 10} className="px-4 py-3">
            <DetalleAlumno a={a} />
          </td>
        </tr>
      )}
    </>
  )
}
