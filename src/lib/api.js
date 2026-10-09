import { API_TOKEN, API_URL } from './config.js'

// El backend responde errores no controlados con la página HTML de Express;
// extraemos la primera línea del <pre> para mostrar algo legible.
function mensajeDeError(texto, status) {
  try {
    const json = JSON.parse(texto)
    return json.error || json.message || `Error ${status}`
  } catch {
    const pre = texto.match(/<pre>([\s\S]*?)<\/pre>/i)?.[1]
    if (pre) return pre.split(/<br\s*\/?>/i)[0].replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').trim()
    return texto.slice(0, 200) || `Error ${status}`
  }
}

async function request(path, { method = 'GET', body, query, signal } = {}) {
  // API_URL puede ser absoluta (http://host:5000) o relativa (/api, detrás del proxy de nginx)
  const url = new URL(API_URL + path, window.location.origin)
  Object.entries(query || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v)
  })

  const headers = {}
  if (body) headers['Content-Type'] = 'application/json'
  if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`

  let res
  try {
    res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined, signal })
  } catch (err) {
    if (err.name === 'AbortError') throw err
    throw new Error(`No se pudo conectar con el backend (${API_URL}).`)
  }

  const texto = await res.text()
  if (!res.ok) throw new Error(mensajeDeError(texto, res.status))
  return texto ? JSON.parse(texto) : null
}

export const api = {
  consultarRendimiento: (filtro, signal) =>
    request('/indices-rendimiento', { query: { limit: 5000, ...filtro }, signal }),

  // Exámenes, promociones y equivalencias de un alumno en una carrera, en orden cronológico
  historiaAcademica: (legajo, propuestaId, signal) =>
    request('/indices-rendimiento/historia-academica', { query: { legajo, propuestaId }, signal }),

  // Regularidades (cursadas) de un alumno en una carrera, en orden cronológico
  regularidades: (legajo, propuestaId, signal) =>
    request('/indices-rendimiento/regularidades', { query: { legajo, propuestaId }, signal }),

  procesarGrupo: (filtro) =>
    request('/indices-rendimiento/procesar', { method: 'POST', body: filtro }),
}
