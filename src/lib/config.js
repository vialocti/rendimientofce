export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')
export const API_TOKEN = import.meta.env.VITE_API_TOKEN || ''

export const SEDES = [
  { id: 1, sigla: 'MZA', nombre: 'Mendoza' },
  { id: 2, sigla: 'SRF', nombre: 'San Rafael' },
  { id: 3, sigla: 'GALV', nombre: 'Gral. Alvear' },
  { id: 4, sigla: 'ESTE', nombre: 'Este' },
]

// propuesta (sga_propuestas) → sigla; certificado (sga_certificados_otorg) → sigla
// Solo las 4 que el backend de índices de rendimiento procesa (ver buscarUniverso
// en sistemaAcademico.adapter.js) — CPN (1) y LNRG (6) quedan afuera del ISA por ahora.
export const PROPUESTAS = [
  { id: 8, sigla: 'CP', nombre: 'Contador Público', certificado: 9 },
  { id: 2, sigla: 'LA', nombre: 'Lic. en Administración', certificado: 4 },
  { id: 3, sigla: 'LE', nombre: 'Lic. en Economía', certificado: 5 },
  { id: 7, sigla: 'LLO', nombre: 'Lic. en Logística', certificado: 7 },
]

const anioActual = new Date().getFullYear()
export const ANIOS_INGRESO = Array.from({ length: 15 }, (_, i) => anioActual - i).map((a) => ({ value: a, label: a }))

export const CLASIFICACIONES = [
  { valor: 'Prioritario', corto: 'Prioritario', color: '#d03b3b', icono: '▲' },
  { valor: 'Seguimiento recomendado', corto: 'Seguimiento', color: '#fab219', icono: '●' },
  { valor: 'Sin necesidad de seguimiento', corto: 'Sin seguimiento', color: '#0ca30c', icono: '✓' },
]

// Fórmula v2 del backend (scoring.service.js): el ritmo sale del Coef. carrera y es el de
// más peso. La completud de la carrera se muestra pero no es componente del ISA.
// `mide`, `calculo` y `fuente` son el texto del panel "Lineamientos del cálculo": describen lo
// que hace el backend, así que si cambia la fórmula allá hay que actualizarlos acá.
export const COMPONENTES_ISA = [
  {
    key: 'ritmo', nombre: 'Ritmo', peso: 0.4,
    mide: 'Qué tan al día va la carrera, según el coeficiente de carrera (1 = ideal).',
    calculo: '100 − (coef − 1) × 40, entre 0 y 100. Coef 1 → 100; 2 → 60; 3,5 o más → 0.',
    fuente: 'alumnos_info.coef_tcarrera. Si falta, se estima como avance ideal esperado / avance real.',
  },
  {
    key: 'compromiso', nombre: 'Compromiso', peso: 0.25,
    mide: 'Cuánto se presenta a lo que se inscribe.',
    calculo: '100 × (1 − ausencias a examen / intentos totales).',
    fuente: 'Historia académica: exámenes, promociones y equivalencias.',
  },
  {
    key: 'capacidad', nombre: 'Capacidad', peso: 0.15,
    mide: 'Rendimiento en notas.',
    calculo: 'Promedio sin aplazos × 10.',
    fuente: 'alumnos_info.promediosa. Si falta, promedio de las materias aprobadas en la historia.',
  },
  // La clave interna es 'recursadas' (así la nombra el backend/desglose), pero lo que mide
  // es RAN (Rendimiento Académico Negativo: no cumplir el mínimo de 2 aprobadas en el año),
  // no la cantidad de materias que el alumno recursó — son dos cosas distintas.
  {
    key: 'recursadas', nombre: 'RAN', peso: 0.1,
    mide: 'Años con Rendimiento Académico Negativo (sin el mínimo de 2 materias aprobadas).',
    calculo: '100 − 15 por cada año en RAN, con piso en 0.',
    fuente: 'alumnos_info.perdidasreg.',
  },
  {
    key: 'continuidad', nombre: 'Continuidad', peso: 0.1,
    mide: 'Si mantiene la regularidad vigente.',
    calculo: '100 si es regular, 40 si no.',
    fuente: 'sga_alumnos.regular.',
  },
]

export const UMBRAL_ALERTA_COMPONENTE = 30
export const UMBRAL_PRIORITARIO = 50
export const UMBRAL_SEGUIMIENTO = 75
export const VERSION_FORMULA = 'v2'

// negocio.sga_propuestas_aspira.tipo_ingreso. 7 y 8 existen en la base pero no
// están documentados todavía; null son aspiraciones históricas sin clasificar.
export const TIPOS_INGRESO = [
  { id: 1, nombre: 'Con título secundario' },
  { id: 2, nombre: 'Proveniente de Ciclo Básico Común' },
  { id: 3, nombre: 'Mayor de 25 años' },
  { id: 4, nombre: 'Pase/equivalencia de otra Universidad' },
  { id: 5, nombre: 'Pase/equivalencia de otra Facultad de la UNCuyo' },
  { id: 6, nombre: 'Cambio de carrera dentro de la FCE' },
]

export const sedeSigla = (id) => SEDES.find((s) => s.id === Number(id))?.sigla ?? id ?? '—'
export const propuestaSigla = (id) => PROPUESTAS.find((p) => p.id === Number(id))?.sigla ?? id ?? '—'
export const tipoIngresoNombre = (id) =>
  id === null || id === undefined ? 'Sin clasificar' : TIPOS_INGRESO.find((t) => t.id === Number(id))?.nombre ?? `Tipo ${id}`
