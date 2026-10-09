import { useEffect, useMemo, useState } from 'react'
import { DetalleAlumno, motivos, nombreAlumno } from '../components/rendimiento.jsx'
import { Button, Card, ClasificacionBadge, Empty, ErrorBox, Field, Input, Spinner, Stat } from '../components/ui.jsx'
import { api } from '../lib/api.js'
import { PROPUESTAS, SEDES, VERSION_FORMULA, propuestaSigla, sedeSigla } from '../lib/config.js'
import { descargarCSV, fechaCorta, fechaLarga, hoyISO, num } from '../lib/format.js'

// #/informe/<legajo>/<propuestaId>
function alumnoDelHash() {
  const [, seccion, legajo, propuestaId] = window.location.hash.split('/')
  return seccion === 'informe' && legajo && propuestaId ? { legajo: decodeURIComponent(legajo), propuestaId } : null
}

const carreraNombre = (id) => PROPUESTAS.find((p) => p.id === Number(id))?.nombre ?? propuestaSigla(id)
const sedeNombre = (id) => SEDES.find((s) => s.id === Number(id))?.nombre ?? sedeSigla(id)
const notaTexto = (r) => (r.nota !== null && r.nota !== undefined ? num(r.nota, 0) : r.notaTexto || '—')

const COLOR_RESULTADO = { Reprobado: 'text-red-700', Ausente: 'text-amber-700' }

// vw_regularidades describe el resultado como Aprobado/Reprobado/Ausente; en una cursada
// eso es regularizar o no, así que se muestra por código.
const RESULTADO_REGULARIDAD = { A: 'Regularizó', R: 'No regularizó', U: 'Ausente' }
const COLOR_REGULARIDAD = { R: 'text-red-700', U: 'text-amber-700' }
const resultadoRegularidad = (r) => RESULTADO_REGULARIDAD[r.resultadoCodigo] ?? r.resultado ?? '—'

// Historia y regularidades no dependen de que haya ISA calculado: si una falla,
// el informe se muestra igual con el error en su sección.
const tolerante = (promesa) =>
  promesa
    .then((r) => ({ registros: r.registros }))
    .catch((err) => {
      if (err.name === 'AbortError') throw err
      return { registros: null, error: err.message }
    })

export default function Informe() {
  const [busqueda, setBusqueda] = useState('')
  const [coincidencias, setCoincidencias] = useState(null)
  const [pedido, setPedido] = useState(alumnoDelHash) // { legajo, propuestaId } del hash
  const [informe, setInforme] = useState(null) // { alumno, historia, errorHistoria, regularidades, errorRegularidades }
  const [cargando, setCargando] = useState(null) // 'busqueda' | 'informe'
  const [error, setError] = useState('')

  useEffect(() => {
    // Al pasar a otra sección el hash ya no trae alumno: se conserva el informe abierto
    // (las secciones quedan montadas) en vez de dejarlo sin alumno.
    const onHash = () => {
      const p = alumnoDelHash()
      if (p) setPedido((prev) => (prev?.legajo === p.legajo && prev?.propuestaId === p.propuestaId ? prev : p))
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    if (!pedido) return
    const ctrl = new AbortController()
    setCargando('informe')
    setError('')
    setInforme(null)
    Promise.all([
      api.consultarRendimiento({ legajo: pedido.legajo, propuestaId: pedido.propuestaId }, ctrl.signal),
      tolerante(api.historiaAcademica(pedido.legajo, pedido.propuestaId, ctrl.signal)),
      tolerante(api.regularidades(pedido.legajo, pedido.propuestaId, ctrl.signal)),
    ])
      .then(([{ alumnos }, historia, regularidades]) => {
        const a = alumnos[0]
        setInforme({
          alumno: a ? { ...a, isa: Number(a.isa) } : null,
          historia: historia.registros,
          errorHistoria: historia.error,
          regularidades: regularidades.registros,
          errorRegularidades: regularidades.error,
        })
        setCargando(null)
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setError(err.message)
        setCargando(null)
      })
    return () => ctrl.abort()
  }, [pedido])

  async function buscar(e) {
    e.preventDefault()
    const texto = busqueda.trim()
    if (!texto) return
    setCargando('busqueda')
    setError('')
    try {
      const { alumnos } = await api.consultarRendimiento({ persona: texto })
      setCoincidencias(alumnos)
      if (alumnos.length === 1) window.location.hash = `#/informe/${alumnos[0].legajo}/${alumnos[0].propuestaId}`
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(null)
    }
  }

  const a = informe?.alumno
  const historia = informe?.historia
  const regularidades = informe?.regularidades

  const resumenHistoria = useMemo(() => {
    if (!historia?.length) return null
    const cuenta = (f) => historia.filter(f).length
    return {
      registros: historia.length,
      aprobados: cuenta((r) => r.resultado === 'Aprobado' || r.resultado === 'Promocionado'),
      reprobados: cuenta((r) => r.resultado === 'Reprobado'),
      ausentes: cuenta((r) => r.resultado === 'Ausente'),
    }
  }, [historia])

  const resumenRegularidades = useMemo(() => {
    if (!regularidades?.length) return null
    const cuenta = (codigo) => regularidades.filter((r) => r.resultadoCodigo === codigo).length
    return { registros: regularidades.length, regularizo: cuenta('A'), noRegularizo: cuenta('R'), ausente: cuenta('U') }
  }, [regularidades])

  function exportarRegularidades() {
    descargarCSV(`regularidades_${pedido.legajo}_${propuestaSigla(pedido.propuestaId)}.csv`, [
      { titulo: 'Fecha', valor: (r) => fechaCorta(r.fecha) },
      { titulo: 'Código', valor: (r) => r.codigo ?? '' },
      { titulo: 'Materia', valor: (r) => r.materia },
      { titulo: 'Resultado', valor: (r) => resultadoRegularidad(r) },
    ], regularidades)
  }

  function exportarHistoria() {
    descargarCSV(`historia_${pedido.legajo}_${propuestaSigla(pedido.propuestaId)}.csv`, [
      { titulo: 'Fecha', valor: (r) => fechaCorta(r.fecha) },
      { titulo: 'Código', valor: (r) => r.codigo ?? '' },
      { titulo: 'Materia', valor: (r) => r.materia },
      { titulo: 'Tipo', valor: (r) => r.tipo ?? '' },
      { titulo: 'Resultado', valor: (r) => r.resultado },
      { titulo: 'Nota', valor: (r) => (r.nota ?? r.notaTexto ?? '') },
    ], historia)
  }

  return (
    <div className="flex flex-col gap-5">
      <Card title="Buscar persona" className="print:hidden">
        <form onSubmit={buscar} className="flex flex-wrap items-end gap-3">
          <div className="min-w-64 flex-1">
            <Field label="Persona" hint="Legajo o documento exactos, o parte del apellido. Solo alumnos con ISA calculado.">
              <Input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Legajo, documento o apellido" />
            </Field>
          </div>
          <Button variant="primary" type="submit" disabled={!!cargando || !busqueda.trim()}>
            {cargando === 'busqueda' && <Spinner />} Buscar
          </Button>
        </form>

        {coincidencias && !coincidencias.length && (
          <p className="mt-4 text-sm text-slate-500">No hay alumnos con ISA calculado que coincidan. Puede que su grupo todavía no esté calculado.</p>
        )}
        {coincidencias?.length > 1 && (
          <ul className="mt-4 divide-y divide-slate-100 text-sm">
            {coincidencias.map((c) => (
              <li key={`${c.legajo}-${c.propuestaId}`}>
                <a className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 py-2 hover:bg-slate-50" href={`#/informe/${c.legajo}/${c.propuestaId}`}>
                  <span className="font-medium text-slate-800">{nombreAlumno(c)}</span>
                  <span className="font-mono text-slate-600">{c.legajo}</span>
                  <span className="text-slate-600">{propuestaSigla(c.propuestaId)} · {sedeSigla(c.sedeId)} · ingreso {c.anioIngreso ?? '—'}</span>
                  <ClasificacionBadge valor={c.clasificacion} />
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <ErrorBox>{error}</ErrorBox>

      {cargando === 'informe' && <p className="flex items-center gap-2 text-sm text-slate-500"><Spinner /> Cargando informe…</p>}

      {!pedido && !coincidencias && <Empty>Buscá una persona para ver su informe.</Empty>}

      {informe && (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 print:text-xl">{a ? nombreAlumno(a) : `Legajo ${pedido.legajo}`}</h2>
              <p className="text-sm text-slate-600">
                Legajo {pedido.legajo} · {carreraNombre(pedido.propuestaId)}
                {a && ` · Sede ${sedeNombre(a.sedeId)}`}
              </p>
              <p className="hidden text-sm text-slate-600 print:block">Informe de rendimiento académico — emitido el {fechaLarga(hoyISO())}</p>
            </div>
            <Button className="print:hidden" onClick={() => window.print()}>Imprimir informe</Button>
          </div>

          {a ? (
            <Card title="Índice de Seguimiento Académico">
              <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                <Stat label="ISA" value={num(a.isa, 1)} sub={<ClasificacionBadge valor={a.clasificacion} />} />
                <Stat label="Coef. carrera" value={num(a.coefCarrera)} sub={a.duracionProyectadaAnios ? `Proyecta ${num(a.duracionProyectadaAnios, 1)} años` : '1 = va al día'} />
                <Stat label="Completud" value={a.completud === null || a.completud === undefined ? '—' : `${num(a.completud, 1)}%`} sub={`${a.materiasAprobadas ?? '—'} de ${a.materiasPlan ?? '—'} materias`} />
                <Stat label="Promedio" value={num(a.promedioNotas)} sub="Sin aplazos" />
              </div>
              {motivos(a).length > 0 && (
                <p className="mb-4 text-sm text-slate-700"><span className="font-medium">Motivo de la clasificación:</span> {motivos(a).join(', ')}.</p>
              )}
              <DetalleAlumno a={a} conEnlace={false} />
              <p className="mt-4 text-xs text-slate-500">
                Calculado con la historia hasta el {fechaLarga(a.fechaAnalisis)}, fórmula {a.versionFormula ?? '—'}
                {a.versionFormula && a.versionFormula !== VERSION_FORMULA && ` (la vigente es ${VERSION_FORMULA}: conviene recalcular su grupo)`}.
              </p>
            </Card>
          ) : (
            <Empty>Este alumno no tiene ISA calculado para esta carrera.</Empty>
          )}

          <Card
            title={`Historia académica${historia ? ` (${historia.length})` : ''}`}
            actions={historia?.length > 0 && <Button onClick={exportarHistoria}>Exportar CSV</Button>}
          >
            {informe.errorHistoria && <ErrorBox>No se pudo cargar la historia académica: {informe.errorHistoria}</ErrorBox>}
            {historia && !historia.length && <p className="text-sm text-slate-500">Sin registros en la historia académica.</p>}
            {resumenHistoria && (
              <>
                <p className="mb-3 text-sm text-slate-600">
                  {resumenHistoria.registros} registros hasta hoy: {resumenHistoria.aprobados} aprobados, {resumenHistoria.reprobados} reprobados, {resumenHistoria.ausentes} ausentes.
                  {a && ` El ISA usa los registros hasta el ${fechaCorta(a.fechaAnalisis)}.`}
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        {['Fecha', 'Materia', 'Tipo', 'Resultado', 'Nota'].map((t) => (
                          <th key={t} className="whitespace-nowrap px-2 py-2 font-medium">{t}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {historia.map((r, i) => (
                        <tr key={i} className="border-b border-slate-100 print:break-inside-avoid">
                          <td className="whitespace-nowrap px-2 py-1.5 tabular-nums">{fechaCorta(r.fecha)}</td>
                          <td className="px-2 py-1.5">{r.materia}</td>
                          <td className="px-2 py-1.5">{r.tipo ?? '—'}</td>
                          <td className={`px-2 py-1.5 ${COLOR_RESULTADO[r.resultado] ?? ''}`}>{r.resultado}</td>
                          <td className="px-2 py-1.5 tabular-nums">{notaTexto(r)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Card>

          <Card
            title={`Regularidades${regularidades ? ` (${regularidades.length})` : ''}`}
            actions={regularidades?.length > 0 && <Button onClick={exportarRegularidades}>Exportar CSV</Button>}
          >
            {informe.errorRegularidades && <ErrorBox>No se pudieron cargar las regularidades: {informe.errorRegularidades}</ErrorBox>}
            {regularidades && !regularidades.length && <p className="text-sm text-slate-500">Sin regularidades registradas.</p>}
            {resumenRegularidades && (
              <>
                <p className="mb-3 text-sm text-slate-600">
                  {resumenRegularidades.registros} cursadas hasta hoy: {resumenRegularidades.regularizo} regularizadas, {resumenRegularidades.noRegularizo} no regularizadas, {resumenRegularidades.ausente} ausentes.
                  {' '}No entran en el cálculo del ISA.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        {['Fecha', 'Materia', 'Resultado'].map((t) => (
                          <th key={t} className="whitespace-nowrap px-2 py-2 font-medium">{t}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {regularidades.map((r, i) => (
                        <tr key={i} className="border-b border-slate-100 print:break-inside-avoid">
                          <td className="whitespace-nowrap px-2 py-1.5 tabular-nums">{fechaCorta(r.fecha)}</td>
                          <td className="px-2 py-1.5">{r.materia}</td>
                          <td className={`px-2 py-1.5 ${COLOR_REGULARIDAD[r.resultadoCodigo] ?? ''}`}>{resultadoRegularidad(r)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
