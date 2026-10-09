import { signInWithEmailAndPassword } from 'firebase/auth'
import { useState } from 'react'
import { Button, ErrorBox, Field, Input, Spinner } from '../components/ui.jsx'
import { auth } from '../lib/firebase.js'

const CREDENCIALES_INVALIDAS = ['auth/invalid-credential', 'auth/user-not-found', 'auth/wrong-password', 'auth/invalid-email']

function mensajeDeError(code) {
  if (CREDENCIALES_INVALIDAS.includes(code)) return 'Correo o contraseña incorrectos.'
  if (code === 'auth/too-many-requests') return 'Demasiados intentos. Probá de nuevo más tarde.'
  if (code === 'auth/user-disabled') return 'El usuario está deshabilitado.'
  return 'No se pudo conectar con el servicio de autenticación.'
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [ingresando, setIngresando] = useState(false)
  const [error, setError] = useState('')

  async function ingresar(e) {
    e.preventDefault()
    if (!email.trim() || !password) {
      setError('Completá el correo y la contraseña.')
      return
    }
    setIngresando(true)
    setError('')
    try {
      // al ingresar, App recibe el usuario por onAuthStateChanged y reemplaza esta pantalla
      await signInWithEmailAndPassword(auth, email.trim(), password)
    } catch (err) {
      setError(mensajeDeError(err.code))
      setIngresando(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-bordo-800 p-4">
      <form onSubmit={ingresar} className="flex w-full max-w-sm flex-col gap-4 rounded-2xl bg-white p-8 shadow-xl">
        <div className="text-center">
          <div className="text-xs font-medium uppercase tracking-wider text-bordo-600">FCE · UNCuyo</div>
          <h1 className="text-xl font-semibold text-slate-900">Rendimiento Académico</h1>
          <p className="mt-1 text-sm text-slate-500">Ingresá con tu usuario del panel de gestión.</p>
        </div>

        <ErrorBox>{error}</ErrorBox>

        <Field label="Correo institucional">
          <Input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@fce.uncu.edu.ar" autoFocus />
        </Field>
        <Field label="Contraseña">
          <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>

        <Button variant="primary" type="submit" className="justify-center" disabled={ingresando}>
          {ingresando && <Spinner />} Ingresar
        </Button>
      </form>
    </div>
  )
}
