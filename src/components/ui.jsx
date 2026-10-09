import { CLASIFICACIONES } from '../lib/config.js'

export function Card({ title, actions, children, className = '' }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm print:border-0 print:p-0 print:shadow-none ${className}`}>
      {(title || actions) && (
        <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="text-base font-semibold text-slate-800">{title}</h2>}
          {actions && <div className="flex flex-wrap gap-2 print:hidden">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  )
}

const VARIANTES = {
  primary: 'bg-bordo-700 text-white hover:bg-bordo-800 disabled:bg-bordo-300',
  secondary: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:text-slate-400',
  danger: 'bg-amber-600 text-white hover:bg-amber-700 disabled:bg-amber-300',
}

export function Button({ variant = 'secondary', className = '', ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition disabled:cursor-not-allowed ${VARIANTES[variant]} ${className}`}
      {...props}
    />
  )
}

export function Field({ label, children, hint }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-slate-600">{label}</span>
      {children}
      {hint && <span className="text-xs text-slate-400">{hint}</span>}
    </label>
  )
}

const inputCls =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-bordo-500 focus:ring-2 focus:ring-bordo-100'

export const Input = ({ className = '', ...props }) => <input className={`${inputCls} ${className}`} {...props} />

export function Select({ options, placeholder = 'Todas', ...props }) {
  return (
    <select className={inputCls} {...props}>
      {placeholder !== null && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function Stat({ label, value, sub }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 print:border-slate-300">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
    </div>
  )
}

export function ClasificacionBadge({ valor }) {
  const c = CLASIFICACIONES.find((x) => x.valor === valor)
  if (!c) return <span className="text-slate-400">—</span>
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
      <span style={{ color: c.color }} aria-hidden>
        {c.icono}
      </span>
      {c.corto}
    </span>
  )
}

export function ErrorBox({ children }) {
  if (!children) return null
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 print:hidden" role="alert">
      {children}
    </div>
  )
}

export function Empty({ children }) {
  return <div className="rounded-lg border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">{children}</div>
}

export function Spinner() {
  return <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden />
}

// Barra horizontal simple 0-100 con valor a la derecha
export function MiniBar({ value, max = 100, alerta = false }) {
  if (value === null || value === undefined) return <span className="text-slate-400">—</span>
  const w = Math.max(0, Math.min(100, (Number(value) / max) * 100))
  return (
    <div className="flex items-center gap-2" title={`${value}`}>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full" style={{ width: `${w}%`, background: alerta ? '#d03b3b' : '#64748b' }} />
      </div>
      <span className={`tabular-nums ${alerta ? 'font-semibold text-red-700' : 'text-slate-700'}`}>{Math.round(value)}</span>
    </div>
  )
}
