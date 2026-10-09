import { useState } from 'react'
import { Lineamientos } from '../components/rendimiento.jsx'
import { Button, Card, ErrorBox, Field, Input, Select, Spinner, Stat } from '../components/ui.jsx'
import { api } from '../lib/api.js'
import { ANIOS_INGRESO, PROPUESTAS, SEDES, VERSION_FORMULA, propuestaSigla } from '../lib/config.js'
import { fechaCorta, hoyISO } from '../lib/format.js'

const FILTRO_INICIAL = { sedeId: '', propuestaId: '', anioIngreso: '', fechaAnalisis: hoyISO() }

function describirGrupo(f) {
  const partes = []
  if (f.propuestaId) partes.push(PROPUESTAS.find((p) => p.id === Number(f.propuestaId))?.nombre)
  if (f.sedeId) partes.push(`Sede ${SEDES.find((s) => s.id === Number(f.sedeId))?.nombre}`)
  if (f.anioIngreso) partes.push(`Cohorte ${f.anioIngreso}`)
  return partes.join(' · ')
}

export default function GenerarISA() {
  const [filtro, setFiltro] = useState(FILTRO_INICIAL)
  const [resumen, setResumen] = useState(null)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState('')
  const [verLineamientos, setVerLineamientos] = useState(true)

  const set = (k) => (e) => setFiltro((f) => ({ ...f, [k]: e.target.value }))
  const hayGrupo = filtro.sedeId || filtro.anioIngreso || filtro.propuestaId

  async function procesar() {
    if (!hayGrupo) return
    const ok = window.confirm(
      `Se va a calcular el ISA de todo el grupo:\n\n${describirGrupo(filtro)}\n` +
        `Fecha de análisis: ${fechaCorta(filtro.fechaAnalisis)}\n\nPuede demorar varios minutos. ¿Continuar?`,
    )
    if (!ok) return
    setProcesando(true)
    setError('')
    setResumen(null)
    try {
      const r = await api.procesarGrupo({
        sedeId: filtro.sedeId || undefined,
        propuestaId: filtro.propuestaId || undefined,
        anioIngreso: filtro.anioIngreso || undefined,
        fechaAnalisis: filtro.fechaAnalisis || undefined,
      })
      setResumen({ ...r, grupo: describirGrupo(filtro) })
    } catch (err) {
      setError(`No se pudo procesar el grupo: ${err.message}`)
    } finally {
      setProcesando(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Card
        title={`Lineamientos del cálculo — fórmula ${VERSION_FORMULA}`}
        actions={<Button onClick={() => setVerLineamientos((v) => !v)}>{verLineamientos ? 'Ocultar lineamientos' : 'Ver lineamientos'}</Button>}
      >
        {verLineamientos ? <Lineamientos /> : (
          <p className="text-sm text-slate-500">Cómo se arma el ISA: universo de alumnos, componentes, pesos y reglas de clasificación.</p>
        )}
      </Card>

      <Card title="Grupo a calcular">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Field label="Sede">
            <Select value={filtro.sedeId} onChange={set('sedeId')} options={SEDES.map((s) => ({ value: s.id, label: s.nombre }))} />
          </Field>
          <Field label="Carrera">
            <Select value={filtro.propuestaId} onChange={set('propuestaId')} options={PROPUESTAS.map((p) => ({ value: p.id, label: `${p.sigla} — ${p.nombre}` }))} />
          </Field>
          <Field label="Año de ingreso">
            <Select value={filtro.anioIngreso} onChange={set('anioIngreso')} options={ANIOS_INGRESO} placeholder="Todos" />
          </Field>
          <Field label="Fecha de análisis" hint="Se toma la historia hasta esta fecha">
            <Input type="date" value={filtro.fechaAnalisis} onChange={set('fechaAnalisis')} />
          </Field>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button variant="danger" onClick={procesar} disabled={procesando || !hayGrupo} title={hayGrupo ? '' : 'Elegí sede, carrera o año de ingreso'}>
            {procesando && <Spinner />} {procesando ? 'Procesando grupo…' : 'Calcular ISA del grupo'}
          </Button>
          <span className="text-xs text-slate-500">
            Elegí al menos sede, carrera o año de ingreso. Si el grupo ya tiene un cálculo con la misma fecha de análisis, se reemplaza.
          </span>
        </div>
      </Card>

      <ErrorBox>{error}</ErrorBox>

      {resumen && (
        <Card title={`Resultado del proceso — ${resumen.grupo} — ${fechaCorta(resumen.fechaAnalisis)}`}>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <Stat label="Universo" value={resumen.totalUniverso} />
            <Stat label="Procesados" value={resumen.totalProcesados} />
            <Stat label="Con error" value={resumen.totalErrores} />
            <Stat label="Prioritarios" value={resumen.prioritarios} />
            <Stat label="Seguimiento" value={resumen.seguimientoRecomendado} />
            <Stat label="Sin seguimiento" value={resumen.sinNecesidadSeguimiento} />
          </div>
          {resumen.errores?.length > 0 && (
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer text-slate-600">Ver {resumen.errores.length} errores</summary>
              <ul className="mt-2 max-h-48 overflow-auto font-mono text-xs text-slate-600">
                {resumen.errores.map((e) => (
                  <li key={`${e.legajo}-${e.propuestaId}`}>
                    {e.legajo} ({propuestaSigla(e.propuestaId)}): {e.error}
                  </li>
                ))}
              </ul>
            </details>
          )}
          <p className="mt-4 text-sm text-slate-600">
            Ver el resultado en{' '}
            <a className="font-medium text-bordo-700 hover:underline" href="#/consulta">Consulta por grupo</a> o en{' '}
            <a className="font-medium text-bordo-700 hover:underline" href="#/prioritarios">Alumnos prioritarios</a>.
          </p>
        </Card>
      )}
    </div>
  )
}
