import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [carregando, setCarregando] = useState(false)

  const lidarComLogin = async (e) => {
    e.preventDefault()
    setCarregando(true)

    const emailNormalizado = email.trim().toLowerCase()

    const { data: { user }, error } = await supabase.auth.signInWithPassword({
      email: emailNormalizado,
      password: senha,
    })

    if (error) {
      alert("Erro ao entrar: " + error.message)
      setCarregando(false)
      return
    }

    if (
      emailNormalizado === 'medico@telesaude.com' ||
      emailNormalizado === 'assistente@elosocial.com'
    ) {
      navigate('/dashboard-medico')
    } else {
      const { data: triagem } = await supabase
        .from('triagens')
        .select('id, status')
        .eq('user_id', user.id)
        .in('status', ['pendente', 'em_atendimento'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (triagem) {
        navigate('/consulta')
      } else {
        navigate('/triagem')
      }
    }

    setCarregando(false)
  }

  return (
    <div className="min-h-screen bg-[#0d1f1a] flex items-center justify-center px-6 py-10 font-sans">
      <div className="w-full max-w-sm animate-fadeUp">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl border border-[#2a6b52] bg-[#1a3d30] mb-4">
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="#4ab882" strokeWidth="1.5" strokeLinecap="round">
              <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"/>
              <path d="M8 12h8M12 8v8"/>
            </svg>
          </div>
          <h1 className="text-[#e8f0ec] text-2xl font-semibold tracking-tight" style={{fontFamily:'Georgia, serif'}}>EloSocial</h1>
          <p className="text-[#5a8a72] text-sm mt-1 font-light">Conectando cidadãos e assistentes sociais</p>
        </div>

        <form onSubmit={lidarComLogin} className="bg-[#111f1a] border border-[#1e3b2e] rounded-2xl p-8 shadow-2xl">
          <h2 className="text-[#d4ebe0] text-xl mb-1" style={{fontFamily:'Georgia, serif'}}>Bem-vindo</h2>
          <p className="text-[#4a7a60] text-sm mb-7 font-light">Entre com sua conta para continuar</p>

          <div className="mb-4">
            <label className="block text-[#5a8a72] text-xs uppercase tracking-wider mb-2 font-medium">E-mail</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" className="w-full bg-[#0d1f1a] border border-[#1e3b2e] rounded-xl px-4 py-3 text-[#c8e0d4] text-sm outline-none focus:border-[#2a9162]" />
          </div>

          <div className="mb-6">
            <label className="block text-[#5a8a72] text-xs uppercase tracking-wider mb-2 font-medium">Senha</label>
            <input type="password" required value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="••••••••" className="w-full bg-[#0d1f1a] border border-[#1e3b2e] rounded-xl px-4 py-3 text-[#c8e0d4] text-sm outline-none focus:border-[#2a9162]" />
          </div>

          <button type="submit" disabled={carregando} className="w-full bg-[#1e7a52] hover:bg-[#22905f] text-[#e8f5ee] py-3 rounded-xl text-sm font-medium transition-all">
            {carregando ? 'Verificando...' : 'Entrar'}
          </button>

          <div className="flex items-center gap-3 my-5 text-[#2a4a3a] text-xs">
            <span className="flex-1 h-px bg-[#1a3330]"/>ou<span className="flex-1 h-px bg-[#1a3330]"/>
          </div>

          <p className="text-center text-[#4a7a60] text-sm">
            Não tem conta? <a href="/cadastro" className="text-[#4ab882] font-medium hover:underline">Cadastre-se</a>
          </p>
        </form>
      </div>
    </div>
  )
}