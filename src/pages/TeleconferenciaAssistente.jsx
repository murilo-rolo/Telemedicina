import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import VideoCall from '../components/VideoCall'
import { obterSalaDaily } from '../utils/daily'
import MensagensCaso from '../components/MensagensCaso'
import PlanoAcaoCaso from '../components/PlanoAcaoCaso'
import DocumentosCaso from '../components/DocumentosCaso'
import {
  ChevronLeft,
  Video,
  PhoneOff,
  CheckCircle,
  LogOut,
  User,
  AlertTriangle,
  Clock,
  Activity,
  Shield,
  MessageSquare,
  Briefcase,
  Lock,
  X,
} from 'lucide-react'

export default function TeleconferenciaAssistente() {
  const navigate = useNavigate()
  const location = useLocation()

  const idTriagem = location.state?.idTriagem || sessionStorage.getItem('elosocial_caso_atual') || null

  const [caso, setCaso] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [videoAtivo, setVideoAtivo] = useState(false)
  const [salaUrl, setSalaUrl] = useState('')
  const [painelAtivo, setPainelAtivo] = useState(null)

  useEffect(() => {
    const buscarCaso = async () => {
      setCarregando(true)

      if (!idTriagem) {
        navigate('/dashboard-medico')
        return
      }

      const { data, error } = await supabase
        .from('triagens')
        .select('*')
        .eq('id', idTriagem)
        .maybeSingle()

      if (error) {
        alert('Erro ao carregar caso: ' + error.message)
        setCarregando(false)
        return
      }

      if (!data) {
        alert('Caso não encontrado.')
        navigate('/dashboard-medico')
        return
      }

      sessionStorage.setItem('elosocial_caso_atual', data.id)
      
      setCaso(data)

      if (data.status === 'em_atendimento') {
        try {
          const sala = data.daily_room_url
            ? { url: data.daily_room_url }
            : await obterSalaDaily(data.id)

          setSalaUrl(sala.url)
          setVideoAtivo(true)
        } catch (error) {
          alert('Erro ao carregar sala Daily: ' + error.message)
        }
      } else {
        setVideoAtivo(false)
      }

      setCarregando(false)
    }

    buscarCaso()
  }, [idTriagem, navigate])

  const sair = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  const voltarAoCaso = () => {
    navigate('/consulta-medica', {
      state: { idTriagem },
    })
  }

  const atualizarCasoLocal = (camposAtualizados) => {
    setCaso((casoAtual) => {
      if (!casoAtual) return casoAtual

      return {
        ...casoAtual,
        ...camposAtualizados,
      }
    })
  }

  const iniciarChamada = async () => {
    if (!caso || !idTriagem) return

    setSalvando(true)

    try {
      const sala = caso.daily_room_url
        ? { url: caso.daily_room_url }
        : await obterSalaDaily(idTriagem)

      const { error } = await supabase
        .from('triagens')
        .update({
          status: 'em_atendimento',
          aguardando_video: false,
        })
        .eq('id', idTriagem)

      if (error) {
        alert('Erro ao iniciar chamada: ' + error.message)
        return
      }

      atualizarCasoLocal({
        status: 'em_atendimento',
        aguardando_video: false,
        daily_room_url: sala.url,
      })

      setSalaUrl(sala.url)
      setVideoAtivo(true)
    } catch (error) {
      alert('Erro ao preparar sala Daily: ' + error.message)
    } finally {
      setSalvando(false)
    }
  }

  const finalizarChamada = async () => {
    if (!caso || !idTriagem) return

    const confirmar = window.confirm('Finalizar a chamada e manter o caso em acompanhamento?')

    if (!confirmar) return

    setSalvando(true)

    const { error } = await supabase
      .from('triagens')
      .update({
        status: 'em_acompanhamento',
        aguardando_video: false,
      })
      .eq('id', idTriagem)

    setSalvando(false)

    if (error) {
      alert('Erro ao finalizar chamada: ' + error.message)
      return
    }

    atualizarCasoLocal({
      status: 'em_acompanhamento',
      aguardando_video: false,
    })

    setVideoAtivo(false)

    navigate('/consulta-medica', {
      state: { idTriagem },
    })
  }

  const abrirMensagens = () => setPainelAtivo('mensagens')
  const abrirPlanoAcao = () => setPainelAtivo('plano')
  const abrirCofreDigital = () => setPainelAtivo('cofre')

  const obterStatusConfig = (status) => {
    const config = {
      pendente: {
        texto: 'Pendente',
        cor: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
        Icone: Clock,
      },
      em_atendimento: {
        texto: 'Em atendimento',
        cor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        Icone: Activity,
      },
      em_acompanhamento: {
        texto: 'Em acompanhamento',
        cor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        Icone: CheckCircle,
      },
      concluido: {
        texto: 'Concluído',
        cor: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
        Icone: CheckCircle,
      },
    }

    return config[status] || {
      texto: 'Não informado',
      cor: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
      Icone: Clock,
    }
  }

  const obterCorPrioridade = (prioridade) => {
    if (prioridade === 'ALTA') return 'bg-red-500/10 text-red-400 border-red-500/20'
    if (prioridade === 'MÉDIA') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
    return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
  }

  const BotaoLateral = ({ titulo, Icone, onClick }) => (
    <button
      onClick={onClick}
      className="w-full group flex items-center gap-3 border border-border rounded-2xl p-4 bg-bg-base hover:border-accent/50 hover:bg-bg-surface-hover transition-all text-left"
    >
      <div className="bg-border p-2 rounded-lg text-text-secondary group-hover:bg-accent/20 group-hover:text-accent transition-colors">
        <Icone size={18} />
      </div>

      <p className="text-sm font-semibold text-white">
        {titulo}
      </p>
    </button>
  )

  const renderPainelAtivo = () => {
    if (!painelAtivo) return null
  
    const config = {
      mensagens: {
        titulo: 'Mensagens',
        Icone: MessageSquare,
        conteudo: (
          <MensagensCaso
            casoId={caso?.id}
  remetenteTipo="assistente"
  remetenteNome="Assistente Social"
          />
        ),
      },
      plano: {
        titulo: 'Plano de ação',
        Icone: Briefcase,
        conteudo: (
          <PlanoAcaoCaso
            casoId={caso?.id}
            modo="assistente"
          />
        ),
      },
      cofre: {
        titulo: 'Cofre digital',
        Icone: Lock,
        conteudo: (
          <DocumentosCaso
            casoId={caso?.id}
            modo="assistente"
          />
        ),
      },
    }
  
    const painel = config[painelAtivo]
    const Icone = painel.Icone
  
    return (
      <section className="bg-bg-surface border border-border rounded-3xl p-5 md:p-6">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-border text-accent flex items-center justify-center">
              <Icone size={18} />
            </div>
  
            <div>
              <p className="text-accent text-[10px] uppercase tracking-widest font-bold">
                Durante a chamada
              </p>
              <h2 className="text-white text-lg font-bold">
                {painel.titulo}
              </h2>
            </div>
          </div>
  
          <button
            type="button"
            onClick={() => setPainelAtivo(null)}
            className="p-2 rounded-xl text-text-secondary hover:text-white hover:bg-bg-base transition-colors"
            title="Fechar painel"
          >
            <X size={18} />
          </button>
        </div>
  
        <div className="bg-bg-base border border-border rounded-2xl p-4">
          {painel.conteudo}
        </div>
      </section>
    )
  }

  if (carregando) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4 animate-fadeUp">
          <div className="w-10 h-10 border-2 border-border border-t-accent rounded-full animate-spin"></div>
          <p className="text-text-secondary text-sm font-medium tracking-wide">
            Carregando teleconferência...
          </p>
        </div>
      </div>
    )
  }

  const statusAtual = obterStatusConfig(caso?.status)
  const IconeStatus = statusAtual.Icone
  const casoConcluido = caso?.status === 'concluido'

  return (
    <div className="min-h-screen bg-bg-base text-slate-200 font-sans selection:bg-accent/30">
      <header className="sticky top-0 z-10 bg-bg-base/80 backdrop-blur-md border-b border-border px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={voltarAoCaso}
              className="p-2 -ml-2 rounded-xl text-text-secondary hover:text-white hover:bg-bg-surface transition-colors"
            >
              <ChevronLeft size={20} />
            </button>

            <div>
              <p className="text-accent text-[10px] uppercase tracking-widest font-bold mb-0.5">
                Plataforma EloSocial
              </p>

              <h1 className="text-xl font-bold tracking-tight text-white">
                Teleconferência
              </h1>
            </div>
          </div>

          <button
            onClick={sair}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-border text-text-secondary bg-bg-surface hover:text-white hover:border-border-hover transition-all"
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 space-y-6">
          <section className="bg-bg-surface border border-border rounded-3xl p-4 md:p-5">
            {videoAtivo ? (
              <div className="h-[620px] bg-bg-video border border-border rounded-2xl overflow-hidden ring-4 ring-accent/10">
                {salaUrl ? (
                  <VideoCall url={salaUrl} userName="Assistente Social" />
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-text-secondary text-sm">
                      Preparando sala de vídeo...
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-[620px] border border-dashed border-border-hover bg-bg-base rounded-2xl flex flex-col items-center justify-center text-center p-8">
                <div className="w-16 h-16 rounded-2xl bg-border flex items-center justify-center mb-5 text-accent">
                  <Video size={28} />
                </div>

                <h2 className="text-white text-2xl font-bold mb-2">
                  Sala não iniciada
                </h2>

                <p className="text-text-secondary text-sm leading-relaxed max-w-md mb-6">
                  Inicie a teleconferência para abrir o atendimento por vídeo.
                </p>

                <button
                  onClick={iniciarChamada}
                  disabled={salvando || casoConcluido}
                  className="flex items-center justify-center gap-2 bg-accent text-text-on-accent hover:bg-accent-hover disabled:bg-border disabled:text-text-secondary px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-[0_0_15px_rgba(74,222,128,0.15)] hover:shadow-[0_0_25px_rgba(74,222,128,0.25)]"
                >
                  <Video size={16} />
                  {salvando ? 'Conectando...' : 'Iniciar chamada'}
                </button>
              </div>
            )}
          </section>

          {renderPainelAtivo()}
        </div>

        <div className="lg:col-span-4 space-y-6">
          <section className="bg-bg-surface border border-border rounded-3xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <User size={14} className="text-accent" />
              <h3 className="text-text-secondary text-xs font-bold uppercase tracking-widest">
                Caso social
              </h3>
            </div>

            <h2 className="text-2xl font-bold text-white tracking-tight mb-4">
              {caso?.paciente_nome || 'Cidadão não identificado'}
            </h2>

            <div className="flex flex-wrap gap-2 mb-5">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border tracking-wide ${obterCorPrioridade(caso?.prioridade)}`}>
                Prioridade {caso?.prioridade || 'BAIXA'}
              </span>

              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border tracking-wide ${statusAtual.cor}`}>
                <IconeStatus size={10} />
                {statusAtual.texto}
              </span>

              {caso?.aguardando_video && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border border-blue-500/20 bg-blue-500/10 text-blue-400">
                  <Video size={10} />
                  Aguardando vídeo
                </span>
              )}
            </div>

            <div className="bg-bg-base border border-border rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <Shield size={18} className="text-accent mt-0.5 shrink-0" />
                <p className="text-text-secondary text-sm leading-relaxed">
                  Atendimento vinculado ao prontuário social do cidadão.
                </p>
              </div>
            </div>
          </section>

          <section className="bg-bg-surface border border-border rounded-3xl p-6">
            <h3 className="text-text-secondary text-xs font-bold uppercase tracking-widest mb-4">
              Ações da chamada
            </h3>

            <div className="space-y-3">
              {!videoAtivo ? (
                <button
                  onClick={iniciarChamada}
                  disabled={salvando || casoConcluido}
                  className="w-full flex items-center justify-center gap-2 bg-accent text-text-on-accent hover:bg-accent-hover disabled:bg-border disabled:text-text-secondary px-6 py-3 rounded-xl text-sm font-bold transition-all"
                >
                  <Video size={16} />
                  {salvando ? 'Conectando...' : 'Iniciar chamada'}
                </button>
              ) : (
                <button
                  onClick={finalizarChamada}
                  disabled={salvando}
                  className="w-full flex items-center justify-center gap-2 border border-red-500/30 text-red-400 bg-red-500/10 px-6 py-3 rounded-xl text-sm font-bold hover:bg-red-500/20 disabled:opacity-40 transition-all"
                >
                  <PhoneOff size={16} />
                  {salvando ? 'Encerrando...' : 'Finalizar chamada'}
                </button>
              )}

              <button
                onClick={voltarAoCaso}
                className="w-full flex items-center justify-center gap-2 border border-border text-text-secondary bg-bg-base hover:text-white hover:border-border-hover px-6 py-3 rounded-xl text-sm font-semibold transition-all"
              >
                <ChevronLeft size={16} />
                Voltar ao prontuário
              </button>
            </div>

            {casoConcluido && (
              <div className="mt-4 flex items-start gap-2 text-slate-400 text-xs border border-slate-500/20 bg-slate-500/10 rounded-xl px-4 py-3">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                Este caso já foi encerrado.
              </div>
            )}
          </section>

          <section className="bg-bg-surface border border-border rounded-3xl p-6">
            <h3 className="text-text-secondary text-xs font-bold uppercase tracking-widest mb-4">
              Ferramentas
            </h3>

            <div className="space-y-3">
              <BotaoLateral
                titulo="Mensagens"
                Icone={MessageSquare}
                onClick={abrirMensagens}
              />

              <BotaoLateral
                titulo="Plano de ação"
                Icone={Briefcase}
                onClick={abrirPlanoAcao}
              />

              <BotaoLateral
                titulo="Cofre digital"
                Icone={Lock}
                onClick={abrirCofreDigital}
              />
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}