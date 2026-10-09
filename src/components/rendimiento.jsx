import {
  COMPONENTES_ISA, PROPUESTAS, UMBRAL_ALERTA_COMPONENTE, UMBRAL_PRIORITARIO, UMBRAL_SEGUIMIENTO, tipoIngresoNombre,
} from '../lib/config.js'
import { fechaCorta, num } from '../lib/format.js'

export const valorComp = (a, key) => {
  const v = a.desglose?.[key]?.valor
  return v === undefined || v === null ? null : Number(v)
}

export const nombreAlumno = (a) => [a.apellido, a.nombres].filter(Boolean).join(', ') || '—'

export const completudTexto = (a, dec = 0) =>
  a.completud === null || a.completud === undefined ? '—' : `${num(a.completud, dec)}%`

// Por qué quedó como prioritario: ISA bajo y/o componentes por debajo del umbral de alerta.
export function motivos(a) {
  const m = COMPONENTES_ISA.filter((c) => a.desglose?.[c.key]?.alerta).map((c) => `${c.nombre} en alerta`)
  if (a.isa < UMBRAL_PRIORITARIO) m.unshift('ISA bajo')
  return m
}

export function Lineamientos() {
  const th = 'px-2 py-2 font-medium'
  return (
    <div className="flex flex-col gap-5 text-sm text-slate-700">
      <p>
        El ISA (Índice de Seguimiento Académico) va de 0 a 100 y resume la situación de cada alumno en una carrera.
        Revisá estos criterios antes de generar o recalcular: son los que aplica el proceso tal como está hoy.
      </p>

      <div>
        <h3 className="mb-1 font-semibold text-slate-800">1. A quiénes se calcula</h3>
        <ul className="list-disc space-y-0.5 pl-5">
          <li>Alumnos activos, con aspiración aceptada y legajo asignado, sin distinguir tipo de ingreso.</li>
          <li>Carreras: {PROPUESTAS.map((p) => p.sigla).join(', ')}.</li>
          <li>Se toma la historia académica hasta la fecha de análisis: exámenes, promociones y equivalencias.</li>
          <li>Las materias se agrupan por código de actividad; cada fila de la historia cuenta como un intento.</li>
        </ul>
      </div>

      <div>
        <h3 className="mb-1 font-semibold text-slate-800">2. Componentes y pesos</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <tr><th className={th}>Componente</th><th className={th}>Peso</th><th className={th}>Qué mide</th><th className={th}>Cómo se calcula (0–100)</th><th className={th}>Fuente</th></tr>
            </thead>
            <tbody>
              {COMPONENTES_ISA.map((c) => (
                <tr key={c.key} className="border-b border-slate-100 align-top">
                  <td className="px-2 py-2 font-medium text-slate-800">{c.nombre}</td>
                  <td className="px-2 py-2 tabular-nums">{Math.round(c.peso * 100)}%</td>
                  <td className="px-2 py-2">{c.mide}</td>
                  <td className="px-2 py-2">{c.calculo}</td>
                  <td className="px-2 py-2 text-slate-500">{c.fuente}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          ISA = suma de cada componente por su peso. Si un componente no tiene dato, no cuenta como 0: su peso se reparte
          entre los que sí lo tienen (por eso el “peso aplicado” del detalle puede diferir del de esta tabla).
        </p>
      </div>

      <div>
        <h3 className="mb-1 font-semibold text-slate-800">3. Clasificación</h3>
        <ul className="list-disc space-y-0.5 pl-5">
          <li><span className="font-medium">Prioritario:</span> ISA menor a {UMBRAL_PRIORITARIO}, o cualquier componente menor a {UMBRAL_ALERTA_COMPONENTE} aunque el ISA sea alto.</li>
          <li><span className="font-medium">Seguimiento recomendado:</span> ISA entre {UMBRAL_PRIORITARIO} y menos de {UMBRAL_SEGUIMIENTO}.</li>
          <li><span className="font-medium">Sin necesidad de seguimiento:</span> ISA de {UMBRAL_SEGUIMIENTO} o más.</li>
        </ul>
      </div>

      <div>
        <h3 className="mb-1 font-semibold text-slate-800">4. Indicadores que se muestran pero no puntúan</h3>
        <ul className="list-disc space-y-0.5 pl-5">
          <li><span className="font-medium">Completud de la carrera:</span> materias aprobadas / materias del plan del alumno (tope 100%). No puntúa porque ya está contenida en el coeficiente de carrera.</li>
          <li><span className="font-medium">Duración proyectada:</span> coef. carrera × duración del plan (1,2 en un plan de 4 años = 4,8 años). Un coef. menor a 1 suele deberse a un cambio de carrera.</li>
          <li><span className="font-medium">Aprobadas por origen:</span> examen, promoción y equivalencia, según la última vía por la que se aprobó cada materia.</li>
          <li><span className="font-medium">Exámenes desaprobados y ausencias a examen:</span> se cuentan por examen rendido, no por materia.</li>
        </ul>
      </div>

      <p className="text-xs text-slate-500">
        “Generar informe” solo lee el último cálculo guardado. “Recalcular ISA del grupo” vuelve a aplicar estos criterios
        y reemplaza el cálculo de la misma fecha de análisis.
      </p>
    </div>
  )
}

// Contenido de la fila desplegada de un alumno: indicadores y desglose del ISA.
export function DetalleAlumno({ a, conEnlace = true }) {
  return (
    <div className="grid gap-4 text-sm md:grid-cols-2">
      {conEnlace && (
        <p className="md:col-span-2 print:hidden">
          <a
            className="inline-flex items-center gap-2 rounded-lg bg-bordo-700 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-bordo-800"
            href={`#/informe/${a.legajo}/${a.propuestaId}`}
            onClick={(e) => e.stopPropagation()}
          >
            Ver informe completo
          </a>
        </p>
      )}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
        <dt className="text-slate-500">Alumno</dt><dd>{nombreAlumno(a)}</dd>
        <dt className="text-slate-500">Año de ingreso a la propuesta</dt><dd>{a.anioIngresoPropuesta ?? '—'}</dd>
        <dt className="text-slate-500">Año de ingreso a la facultad</dt><dd>{a.anioIngresoFacultad ?? '—'}</dd>
        <dt className="text-slate-500" title="Materias aprobadas sobre el total de materias del plan del alumno. Es informativa: no entra al ISA.">Completud de la carrera</dt>
        <dd>{a.completud === null || a.completud === undefined ? '—' : `${num(a.completud, 1)}%`} ({a.materiasAprobadas ?? '—'} de {a.materiasPlan ?? '—'} materias del plan)</dd>
        <dt className="text-slate-500">Aprobadas por origen</dt><dd>{a.materiasAprobadasExamen ?? '—'} examen, {a.materiasPromocionadas ?? 0} promoción, {a.materiasPorEquivalencia ?? 0} equivalencia</dd>
        <dt className="text-slate-500">Exámenes</dt><dd>{a.cantidadExamenes ?? '—'} rendidos: {a.examenesReprobados ?? '—'} desaprobados, {a.totalAusencias ?? '—'} ausentes</dd>
        <dt className="text-slate-500" title="Materias con al menos un resultado en la historia académica que todavía no están aprobadas. No son las que faltan del plan.">Intentadas sin aprobar</dt>
        <dd>{a.materiasPendientes ?? '—'}</dd>
        <dt className="text-slate-500">Tipo de ingreso</dt><dd>{tipoIngresoNombre(a.tipoIngreso)}</dd>
        <dt className="text-slate-500" title="Qué tan al día va la carrera: 1 es el ideal; mayor a 1, va atrasado; menor a 1 suele deberse a un cambio de carrera con equivalencias.">Coef. carrera</dt>
        <dd className="tabular-nums">{num(a.coefCarrera)}</dd>
        <dt className="text-slate-500" title="Coef. carrera × duración del plan: cuánto tardaría en recibirse a este ritmo.">Duración proyectada</dt>
        <dd>{a.duracionProyectadaAnios === null || a.duracionProyectadaAnios === undefined ? '—' : `${num(a.duracionProyectadaAnios, 1)} años (plan de ${num(a.duracionPlanAnios, 1)})`}</dd>
        <dt className="text-slate-500" title="Rendimiento Académico Negativo: años lectivos donde no cumplió el mínimo de 2 materias aprobadas. No es cantidad de materias recursadas.">RAN</dt>
        <dd>{a.cantRan ?? '—'}</dd>
        <dt className="text-slate-500">Regularidad vigente</dt><dd>{a.regVig ?? '—'}</dd>
        <dt className="text-slate-500">Fecha de análisis</dt><dd>{fechaCorta(a.fechaAnalisis)}</dd>
      </dl>
      <table className="text-xs">
        <thead className="text-slate-500"><tr><th className="text-left">Componente</th><th className="text-right">Valor</th><th className="text-right">Peso aplicado</th><th className="text-right">Aporte</th></tr></thead>
        <tbody>
          {COMPONENTES_ISA.map((c) => {
            const d = a.desglose?.[c.key]
            return (
              <tr key={c.key} className={d?.alerta ? 'font-semibold text-red-700' : ''}>
                <td>{c.nombre}{d?.alerta && ' ▲'}</td>
                <td className="text-right tabular-nums">{d ? num(d.valor, 1) : 'sin dato'}</td>
                <td className="text-right tabular-nums">{d ? `${num(d.peso * 100, 1)}%` : '—'}</td>
                <td className="text-right tabular-nums">{d ? num(d.valor * d.peso, 1) : '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
