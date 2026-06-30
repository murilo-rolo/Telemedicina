import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { Mail, Lock, Loader2, HeartHandshake, ArrowRight, ShieldCheck, User, CreditCard } from 'lucide-react'

export default function Cadastro() {
  const navigate = useNavigate()

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [cpf, setCpf] = useState('')
  const [senha, setSenha] = useState('')
  const [carregando, setCarregando] = useState(false)

  const lidarComCadastro = async (e) => {
    e.preventDefault()
    setCarregando(true)

    const nomeTratado = nome.trim()
    const emailTratado = email.trim().toLowerCase()
    const cpfTratado = cpf.trim()

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: emailTratado,
      password: senha,
    })

    if (authError) {
      alert("Erro ao criar conta: " + authError.message)
      setCarregando(false)
      return
    }

    const usuarioUid = authData.user?.id

    if (!usuarioUid) {
      alert("Não foi possível identificar o usuário criado. Tente fazer login ou criar a conta novamente.")
      setCarregando(false)
      return
    }

    const { error: perfilError } = await supabase
      .from('perfis')
      .insert([
        {
          id: usuarioUid,
          nome: nomeTratado,
          cpf: cpfTratado,
          // Mantemos "paciente" provisoriamente pela estrutura do Supabase
          tipo: 'paciente',
        }
      ])

    if (perfilError) {
      alert("Conta criada, mas houve erro ao salvar o perfil: " + perfilError.message)
      setCarregando(false)
      return
    }

    alert("Conta criada com sucesso! Redirecionando para o login.")
    navigate('/')

    setCarregando(false)
  }

  return (
    <div className="min-h-screen flex font-sans selection:bg-accent/30 bg-bg-video">
      
      {/* Lado Esquerdo - Branding Imersivo (Oculto em telas pequenas) */}
      <div className="hidden lg:flex w-1/2 bg-bg-base relative overflow-hidden flex-col items-center justify-center border-r border-border">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,_#1A332A_0%,_transparent_60%)] opacity-40"></div>
        <div className="absolute -top-32 -left-32 w-[30rem] h-[30rem] bg-accent/10 rounded-full blur-[100px]"></div>
        <div className="absolute -bottom-32 -right-32 w-[30rem] h-[30rem] bg-accent/5 rounded-full blur-[100px]"></div>

        <div className="relative z-10 text-center px-12 animate-fadeUp">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-[2rem] bg-bg-surface border border-border shadow-2xl mb-8 group">
            <HeartHandshake className="w-12 h-12 text-accent group-hover:scale-110 transition-transform duration-500" strokeWidth={1.5} />
          </div>
          <h1 className="text-4xl xl:text-5xl font-bold text-white tracking-tight mb-6">
            Junte-se à EloSocial
          </h1>
          <p className="text-text-secondary text-lg xl:text-xl max-w-md mx-auto leading-relaxed font-medium">
            O primeiro passo para um acompanhamento social mais humano, ágil e seguro.
          </p>

          <div className="mt-12 flex items-center justify-center gap-2 text-text-muted text-sm font-semibold">
            <ShieldCheck size={18} />
            <span>Seus dados são protegidos por criptografia</span>
          </div>
        </div>
      </div>

      {/* Lado Direito - Formulário de Cadastro */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 sm:px-12 lg:px-24 py-12">
        <div className="w-full max-w-md animate-fadeUp" style={{ animationDelay: '0.1s' }}>
          
          {/* Cabeçalho Mobile */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-bg-surface border border-border shadow-lg mb-4">
              <HeartHandshake className="w-8 h-8 text-accent" strokeWidth={1.5} />
            </div>
          </div>

          <div className="mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-3">
              Criar Conta
            </h2>
            <p className="text-text-secondary text-base">
              Preencha seus dados para acessar a plataforma.
            </p>
          </div>

          <form onSubmit={lidarComCadastro} className="space-y-5">
            
            <div className="space-y-2">
              <label className="block text-text-secondary text-sm font-bold ml-1">
                Nome Completo
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-text-muted group-focus-within:text-accent transition-colors" />
                </div>
                <input 
                  type="text" 
                  required 
                  value={nome} 
                  onChange={(e) => setNome(e.target.value)} 
                  className="w-full bg-bg-surface border border-border rounded-2xl pl-12 pr-4 py-4 text-base text-text-primary outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all shadow-sm" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-text-secondary text-sm font-bold ml-1">
                E-mail
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-text-muted group-focus-within:text-accent transition-colors" />
                </div>
                <input 
                  type="email" 
                  required 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className="w-full bg-bg-surface border border-border rounded-2xl pl-12 pr-4 py-4 text-base text-text-primary outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all shadow-sm" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-text-secondary text-sm font-bold ml-1">
                CPF
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <CreditCard className="h-5 w-5 text-text-muted group-focus-within:text-accent transition-colors" />
                </div>
                <input 
                  type="text" 
                  required 
                  value={cpf} 
                  onChange={(e) => setCpf(e.target.value)} 
                  className="w-full bg-bg-surface border border-border rounded-2xl pl-12 pr-4 py-4 text-base text-text-primary outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all shadow-sm" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-text-secondary text-sm font-bold ml-1">
                Senha
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-text-muted group-focus-within:text-accent transition-colors" />
                </div>
                <input 
                  type="password" 
                  required 
                  value={senha} 
                  onChange={(e) => setSenha(e.target.value)} 
                  className="w-full bg-bg-surface border border-border rounded-2xl pl-12 pr-4 py-4 text-base text-text-primary outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all shadow-sm" 
                />
              </div>
            </div>

            <div className="pt-4">
              <button 
                type="submit" 
                disabled={carregando} 
                className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover disabled:bg-border disabled:text-text-muted text-bg-base py-4 rounded-2xl text-base font-bold transition-all shadow-[0_0_20px_rgba(74,222,128,0.15)] hover:shadow-[0_0_30px_rgba(74,222,128,0.25)] disabled:shadow-none group"
              >
                {carregando ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Criando conta...
                  </>
                ) : (
                  <>
                    Cadastrar
                    <ArrowRight size={20} className="group-hover:translate-x-1.5 transition-transform" />
                  </>
                )}
              </button>
            </div>

            <div className="mt-8 text-center pt-6 border-t border-border">
              <p className="text-text-secondary text-sm font-medium">
                Já tem uma conta?{' '}
                <Link to="/" className="text-accent font-bold hover:text-accent-hover transition-colors hover:underline underline-offset-4">
                  Faça login aqui
                </Link>
              </p>
            </div>

          </form>
        </div>
      </div>

    </div>
  )
}