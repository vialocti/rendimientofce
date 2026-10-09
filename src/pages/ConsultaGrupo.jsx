import { useMemo, useState } from 'react'
import { DetalleAlumno, completudTexto, nombreAlumno, valorComp } from '../components/rendimiento.jsx'
import {
  Button, Card, ClasificacionBadge, Empty, ErrorBox, Field, Input, MiniBar, Select, Spinner, Stat,
} from '../components/ui.jsx'
import { api } from '../lib/api.js'
import {
  ANIOS_INGRESO, CLASIFICACIONES, COMPONENTES_ISA, PROPUESTAS, SEDES, UMBRAL_ALERTA_COMPONENTE,
  propuestaSigla, sedeSigla, tipoIngresoNombre,
} from '../lib/config.js'
import { descargarCSV, fechaCorta, fechaLarga, hoyISO, num, pct } from '../lib/format.js'

const FILTRO_INICIAL = { sedeId: '', propuestaId: '', anioIngreso: '', clasificacion: '', legajo: '' }

function describirGrupo(f) {
  const partes = []
  if (f.propuestaId) partes.push(PROPUESTAS.find((p) => p.id === Number(f.propuestaId))?.nombre)
  if (f.sedeId) partes.push(`Sede ${SEDES.find((s) => s.id === Number(f.sedeId))?.nombre}`)
  if (f.anioIngreso) partes.push(`Cohorte ${f.anioIngreso}`)
  if (f.clasificacion) partes.push(f.clasificacion)
  if (f.legajo) partes.push(`Legajo ${f.legajo}`)
  return partes.length ? partes.join(' · ') : 'Todos los alumnos calculados'
}

export default function ConsultaGrupo() {
  const [filtro, setFiltro] = useState(FILTRO_INICIAL)
  const [grupo, setGrupo] = useState(null) // filtro con el que se obtuvieron los datos
  const [alumnos, setAlumnos] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [orden, setOrden] = useState({ campo: 'isa', asc: true })
  const [abierto, setAbierto] = useState(null)

  const set = (k) => (e) => setFiltro((f) => ({ ...f, [k]: e.target.value }))

  async function consultar(f = filtro) {
    setCargando(true)
    setError('')
    try {
      const { alumnos } = await api.consultarRendimiento({
        sedeId: f.sedeId, propuestaId: f.propuestaId, anioIngreso: f.anioIngreso,
        clasificacion: f.clasificacion, legajo: f.legajo.trim(),
      })
      setAlumnos(alumnos.map((a) => ({ ...a, isa: Number(a.isa) })))
      setGrupo(f)
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
    const porClas = CLASIFICACIONES.map((c) => ({ ...c, n: alumnos.filter((a) => a.clasificacion === c.valor).length }))
    const isaProm = alumnos.reduce((s, a) => s + a.isa, 0) / n
    const proms = alumnos.map((a) => Number(a.promedioNotas)).filter((v) => v > 0)
    const componentes = COMPONENTES_ISA.map((c) => {
      const vals = alumnos.map((a) => valorComp(a, c.key)).filter((v) => v !== null)
      return {
        ...c,
        promedio: vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null,
        enAlerta: vals.filter((v) => v < UMBRAL_ALERTA_COMPONENTE).length,
        conDato: vals.length,
      }
    })
    const suma = (k) => alumnos.reduce((s, a) => s + (Number(a[k]) || 0), 0)
    const promedio = (k) => {
      const vals = alumnos.filter((a) => a[k] !== null && a[k] !== undefined).map((a) => Number(a[k]))
      return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null
    }
    return {
      n,
      porClas,
      aprobadas: suma('materiasAprobadas'),
      aprobadasExamen: suma('materiasAprobadasExamen'),
      promocionadas: suma('materiasPromocionadas'),
      porEquivalencia: suma('materiasPorEquivalencia'),
      examenes: suma('cantidadExamenes'),
      examenesReprobados: suma('examenesReprobados'),
      ausencias: suma('totalAusencias'),
      completud: promedio('completud'),
      coefCarrera: promedio('coefCarrera'),
      isaProm,
      promedioNotas: proms.length ? proms.reduce((s, v) => s + v, 0) / proms.length : null,
      conAlerta: alumnos.filter((a) => a.alertaPorComponente).length,
      componentes,
    }
  }, [alumnos])

  const ordenados = useMemo(() => {
    if (!alumnos) return []
    const val = (a) => {
      if (COMPONENTES_ISA.some((c) => c.key === orden.campo)) return valorComp(a, orden.campo) ?? -1
      const v = a[orden.campo]
      return typeof v === 'string' && Number.isNaN(Number(v)) ? v : Number(v ?? -1)
    }
    return [...alumnos].sort((a, b) => {
      const x = val(a)
      const y = val(b)
      const r = x < y ? -1 : x > y ? 1 : 0
      return orden.asc ? r : -r
    })
  }, [alumnos, orden])

  const ordenarPor = (campo) => setOrden((o) => ({ campo, asc: o.campo === campo ? !o.asc : true }))

  function exportar() {
    descargarCSV(`rendimiento_${hoyISO()}.csv`, [
      { titulo: 'Legajo', valor: (a) => a.legajo },
      { titulo: 'Alumno', valor: (a) => nombreAlumno(a) },
      { titulo: 'Carrera', valor: (a) => propuestaSigla(a.propuestaId) },
      { titulo: 'Sede', valor: (a) => sedeSigla(a.sedeId) },
      { titulo: 'Año ingreso', valor: (a) => a.anioIngreso },
      { titulo: 'Año ingreso propuesta', valor: (a) => a.anioIngresoPropuesta ?? '' },
      { titulo: 'Año ingreso facultad', valor: (a) => a.anioIngresoFacultad ?? '' },
      { titulo: 'Tipo de ingreso', valor: (a) => tipoIngresoNombre(a.tipoIngreso) },
      { titulo: 'ISA', valor: (a) => num(a.isa, 1) },
      { titulo: 'Clasificación', valor: (a) => a.clasificacion },
      ...COMPONENTES_ISA.map((c) => ({ titulo: c.nombre, valor: (a) => num(valorComp(a, c.key), 1) })),
      { titulo: 'Materias del plan', valor: (a) => a.materiasPlan ?? '' },
      { titulo: 'Completud %', valor: (a) => num(a.completud, 1) },
      { titulo: 'Aprobadas', valor: (a) => a.materiasAprobadas ?? '' },
      { titulo: 'Aprobadas por examen', valor: (a) => a.materiasAprobadasExamen ?? '' },
      { titulo: 'Aprobadas por promoción', valor: (a) => a.materiasPromocionadas ?? '' },
      { titulo: 'Aprobadas por equivalencia', valor: (a) => a.materiasPorEquivalencia ?? '' },
      { titulo: 'Exámenes rendidos', valor: (a) => a.cantidadExamenes ?? '' },
      { titulo: 'Exámenes desaprobados', valor: (a) => a.examenesReprobados ?? '' },
      { titulo: 'Ausencias a examen', valor: (a) => a.totalAusencias ?? '' },
      { titulo: 'Promedio notas', valor: (a) => num(a.promedioNotas) },
      { titulo: 'Coef. carrera', valor: (a) => num(a.coefCarrera) },
      { titulo: 'Duración del plan (años)', valor: (a) => num(a.duracionPlanAnios, 1) },
      { titulo: 'Duración proyectada (años)', valor: (a) => num(a.duracionProyectadaAnios, 1) },
      { titulo: 'RAN', valor: (a) => a.cantRan ?? '' },
      { titulo: 'Regularidad vigente', valor: (a) => a.regVig ?? '' },
      { titulo: 'Fecha análisis', valor: (a) => fechaCorta(a.fechaAnalisis) },
    ], ordenados)
  }

  return (
    <div className="flex flex-col gap-5">
      <Card title="Grupo de alumnos" className="print:hidden">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          <Field label="Sede">
            <Select value={filtro.sedeId} onChange={set('sedeId')} options={SEDES.map((s) => ({ value: s.id, label: s.nombre }))} />
          </Field>
          <Field label="Carrera">
            <Select value={filtro.propuestaId} onChange={set('propuestaId')} options={PROPUESTAS.map((p) => ({ value: p.id, label: `${p.sigla} — ${p.nombre}` }))} />
          </Field>
          <Field label="Año de ingreso">
            <Select value={filtro.anioIngreso} onChange={set('anioIngreso')} options={ANIOS_INGRESO} placeholder="Todos" />
          </Field>
          <Field label="Clasificación">
            <Select value={filtro.clasificacion} onChange={set('clasificacion')} options={CLASIFICACIONES.map((c) => ({ value: c.valor, label: c.valor }))} />
          </Field>
          <Field label="Legajo">
            <Input value={filtro.legajo} onChange={set('legajo')} placeholder="Opcional" />
          </Field>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button variant="primary" onClick={() => consultar()} disabled={cargando}>
            {cargando && <Spinner />} Generar informe
          </Button>
          <span className="text-xs text-slate-500">
            Muestra el último cálculo guardado de cada alumno. Para calcularlo de nuevo, usá <a className="font-medium text-bordo-700 hover:underline" href="#/generar">Generar ISA</a>.
          </span>
        </div>
      </Card>

      <ErrorBox>{error}</ErrorBox>

      {alumnos && !alumnos.length && (
        <Empty>
          No hay rendimiento calculado para este grupo. Podés calcularlo desde{' '}
          <a className="font-medium text-bordo-700 hover:underline" href="#/generar">Generar ISA</a>.
        </Empty>
      )}

      {stats && (
        <>
          <div className="hidden print:block">
            <h1 className="text-xl font-semibold">Informe de rendimiento académico</h1>
            <p className="text-sm text-slate-600">{describirGrupo(grupo)} — emitido el {fechaLarga(hoyISO())}</p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-600">
              <span className="font-medium text-slate-800">{describirGrupo(grupo)}</span>
            </p>
            <div className="flex gap-2 print:hidden">
              <Button onClick={exportar}>Exportar CSV</Button>
              <Button onClick={() => window.print()}>Imprimir informe</Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Alumnos" value={stats.n} />
            <Stat label="ISA promedio" value={num(stats.isaProm, 1)} sub="Índice de Seguimiento Académico (0–100)" />
            <Stat label="Promedio de notas" value={num(stats.promedioNotas)} sub="Materias aprobadas" />
            <Stat label="Con componente en alerta" value={stats.conAlerta} sub={`${pct(stats.conAlerta, stats.n)} · algún componente < ${UMBRAL_ALERTA_COMPONENTE}`} />
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Completud promedio" value={stats.completud === null ? '—' : `${num(stats.completud, 1)}%`} sub={`Aprobadas sobre materias del plan · coef. carrera promedio ${num(stats.coefCarrera)}`} />
            <Stat label="Materias aprobadas" value={stats.aprobadas} sub={`${stats.aprobadasExamen} examen · ${stats.promocionadas} promoción · ${stats.porEquivalencia} equivalencia`} />
            <Stat label="Exámenes desaprobados" value={stats.examenesReprobados} sub={`${pct(stats.examenesReprobados, stats.examenes)} de ${stats.examenes} exámenes`} />
            <Stat label="Ausencias a examen" value={stats.ausencias} sub={`${pct(stats.ausencias, stats.examenes)} de ${stats.examenes} exámenes`} />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card title="Distribución por clasificación">
              <div className="flex h-7 w-full gap-0.5 overflow-hidden rounded-md" role="img" aria-label="Distribución por clasificación">
                {stats.porClas.filter((c) => c.n).map((c) => (
                  <div key={c.valor} style={{ width: `${(c.n / stats.n) * 100}%`, background: c.color }} title={`${c.valor}: ${c.n} (${pct(c.n, stats.n)})`} />
                ))}
              </div>
              <ul className="mt-4 flex flex-col gap-2 text-sm">
                {stats.porClas.map((c) => (
                  <li key={c.valor} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-slate-700">
                      <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: c.color }} />
                      <span style={{ color: c.color }} aria-hidden>{c.icono}</span>
                      {c.valor}
                    </span>
                    <span className="tabular-nums text-slate-800">
                      <span className="font-semibold">{c.n}</span> <span className="text-slate-500">({pct(c.n, stats.n)})</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card title="Promedio del grupo por componente del ISA">
              <ul className="flex flex-col gap-2.5 text-sm">
                {stats.componentes.map((c) => (
                  <li key={c.key} className="grid grid-cols-[7rem_1fr_3rem] items-center gap-3" title={`${c.nombre}: ${num(c.promedio, 1)} · ${c.enAlerta} alumnos en alerta · peso ${c.peso * 100}%`}>
                    <span className="text-slate-700">
                      {c.nombre} <span className="text-xs text-slate-400">{c.peso * 100}%</span>
                    </span>
                    <div className="relative h-3 rounded bg-slate-100">
                      {c.promedio !== null && <div className="h-full rounded" style={{ width: `${c.promedio}%`, background: '#64748b' }} />}
                      <div className="absolute inset-y-[-3px] w-px bg-slate-400" style={{ left: `${UMBRAL_ALERTA_COMPONENTE}%` }} />
                    </div>
                    <span className="text-right tabular-nums font-medium text-slate-800">{c.promedio === null ? 'sin dato' : num(c.promedio, 0)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-slate-500">La línea vertical marca el umbral de alerta ({UMBRAL_ALERTA_COMPONENTE}).</p>
            </Card>
          </div>

          <Card title={`Detalle por alumno (${stats.n})`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    {[
                      ['legajo', 'Legajo'], ['propuestaId', 'Carrera'], ['sedeId', 'Sede'], ['anioIngreso', 'Ingreso'],
                      ['isa', 'ISA'], ['clasificacion', 'Clasificación'],
                      ...COMPONENTES_ISA.map((c) => [c.key, c.nombre]),
                      ['completud', 'Completud'], ['coefCarrera', 'Coef.'],
                      ['materiasAprobadas', 'Aprob.'], ['examenesReprobados', 'Desaprob.'], ['totalAusencias', 'Aus.'],
                      ['promedioNotas', 'Prom.'],
                    ].map(([campo, titulo]) => (
                      <th key={campo} className="cursor-pointer whitespace-nowrap px-2 py-2 font-medium hover:text-slate-800" onClick={() => ordenarPor(campo)}>
                        {titulo}
                        {orden.campo === campo && (orden.asc ? ' ↑' : ' ↓')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ordenados.map((a) => {
                    const id = `${a.legajo}-${a.propuestaId}-${a.fechaAnalisis}`
                    return (
                      <FilaAlumno key={id} a={a} abierto={abierto === id} onToggle={() => setAbierto(abierto === id ? null : id)} />
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}

function FilaAlumno({ a, abierto, onToggle }) {
  return (
    <>
      <tr className="cursor-pointer border-b border-slate-100 hover:bg-slate-50 print:break-inside-avoid" onClick={onToggle}>
        <td className="px-2 py-2 font-mono">{a.legajo}</td>
        <td className="px-2 py-2">{propuestaSigla(a.propuestaId)}</td>
        <td className="px-2 py-2">{sedeSigla(a.sedeId)}</td>
        <td className="px-2 py-2 tabular-nums">{a.anioIngreso ?? '—'}</td>
        <td className="px-2 py-2 font-semibold tabular-nums">{num(a.isa, 1)}</td>
        <td className="px-2 py-2"><ClasificacionBadge valor={a.clasificacion} /></td>
        {COMPONENTES_ISA.map((c) => (
          <td key={c.key} className="px-2 py-2">
            <MiniBar value={valorComp(a, c.key)} alerta={!!a.desglose?.[c.key]?.alerta} />
          </td>
        ))}
        <td className="px-2 py-2 tabular-nums">{completudTexto(a)}</td>
        <td className="px-2 py-2 tabular-nums">{num(a.coefCarrera)}</td>
        <td className="px-2 py-2 tabular-nums">{a.materiasAprobadas ?? '—'}</td>
        <td className="px-2 py-2 tabular-nums">{a.examenesReprobados ?? '—'}</td>
        <td className="px-2 py-2 tabular-nums">{a.totalAusencias ?? '—'}</td>
        <td className="px-2 py-2 tabular-nums">{num(a.promedioNotas)}</td>
      </tr>
      {abierto && (
        <tr className="bg-slate-50 print:hidden">
          <td colSpan={17} className="px-4 py-3">
            <DetalleAlumno a={a} />
          </td>
        </tr>
      )}
    </>
  )
}
