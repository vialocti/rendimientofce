export const num = (v, dec = 2) => {
  if (v === null || v === undefined || v === '' || Number.isNaN(Number(v))) return '—'
  return Number(v).toLocaleString('es-AR', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

export const pct = (parte, total) => (total ? `${Math.round((parte / total) * 100)}%` : '—')

export const fechaLarga = (iso) => {
  if (!iso) return '—'
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00`)
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export const fechaCorta = (iso) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '—')

export const hoyISO = () => new Date().toISOString().slice(0, 10)

export function descargarCSV(nombre, columnas, filas) {
  const esc = (v) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lineas = [columnas.map((c) => esc(c.titulo)).join(';')]
  filas.forEach((f) => lineas.push(columnas.map((c) => esc(c.valor(f))).join(';')))
  const blob = new Blob(['﻿' + lineas.join('\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = nombre
  a.click()
  URL.revokeObjectURL(a.href)
}
