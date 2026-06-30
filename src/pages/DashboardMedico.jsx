import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { 
  RefreshCw, LayoutDashboard, Video, Clock, 
  Activity, ShieldCheck, User, AlertCircle, 
  ArrowRight, VideoIcon, Inbox
} from 'lucide-react'

export default function DashboardMedico() {
  const navigate = useNavigate()
  const [casos, setCasos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [filtroStatus, setFiltroStatus] = useState('todos')

  const statusAbertos = ['pendente', 'em_atendimento', 'em_acompanhamento']

  // LÓGICA MANTIDA INTACTA
  const obterPesoPrioridade = (prioridade) => {
    if (prioridade === 'ALTA') return 3
    if (prioridade === 'MÉDIA') return 2
    return 1
  }

  const obterPesoStatus = (caso) => {
    if (caso.aguardando_video) return 4
    if (caso.status === 'em_atendimento') return 3
    if (caso.status === 'pendente') return 2
    if (caso.status === 'em_acompanhamento') return 1
    return 0
  }

  const ordenarCasos = (lista) => {
    return [...lista].sort((a, b) => {
      const statusB = obterPesoStatus(b)
      const statusA = obterPesoStatus(a)

      if (statusB !== statusA) return statusB - statusA

      const prioridadeB = obterPesoPrioridade(b.prioridade)
      const prioridadeA = obterPesoPrioridade(a.prioridade)

      if (prioridadeB !== prioridadeA) return prioridadeB - prioridadeA

      return new Date(a.created_at || 0) - new Date(b.created_at || 0)
    })
  }

  const buscarCasos = async () => {
    setCarregando(true)

    const { data, error } = await supabase
      .from('triagens')
      .select('*')
      .in('status', statusAbertos)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Erro ao buscar casos:', error)
      alert('Erro ao buscar os casos sociais: ' + error.message)
      setCarregando(false)
      return
    }

    setCasos(ordenarCasos(data || []))
    setCarregando(false)
  }

  useEffect(() => {
    buscarCasos()

    const canal = supabase
      .channel('painel_casos_sociais')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'triagens' }, () => {
        buscarCasos()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [])

  const abrirCaso = (caso) => {
    sessionStorage.setItem('elosocial_caso_atual', caso.id)
    navigate('/consulta-medica', { state: { idTriagem: caso.id } })
  }

  // FUNÇÕES VISUAIS COM DESIGN SYSTEM ATUALIZADO
  const obterCorPrioridade = (prioridade) => {
    if (prioridade === 'ALTA') return 'bg-red-500/10 text-red-400 border-red-500/20'
    if (prioridade === 'MÉDIA') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
    return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
  }

  const obterStatusBadge = (status) => {
    const config = {
      pendente: { texto: 'Pendente', cor: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
      em_atendimento: { texto: 'Em atendimento', cor: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
      em_acompanhamento: { texto: 'Acompanhamento', cor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
      concluido: { texto: 'Concluído', cor: 'bg-slate-500/10 text-slate-400 border-slate-500/20' }
    }
    const atual = config[status] || { texto: 'Não informado', cor: 'bg-slate-500/10 text-slate-400 border-slate-500/20' }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border tracking-wide ${atual.cor}`}>
        {atual.texto}
      </span>
    )
  }

  const formatarSituacoes = (situacoes) => Array.isArray(situacoes) ? situacoes.join(', ') : situacoes || 'Não informado'

  const casosFiltrados = casos.filter((caso) => {
    if (filtroStatus === 'todos') return true
    if (filtroStatus === 'aguardando_video') return caso.aguardando_video
    return caso.status === filtroStatus
  })

  const contarPorStatus = (status) => casos.filter((caso) => caso.status === status).length
  const contarAguardandoVideo = () => casos.filter((caso) => caso.aguardando_video).length

  // Componente interno para os botões de filtro
  const FilterCard = ({ id, titulo, valor, Icone }) => {
    const isAtivo = filtroStatus === id
    return (
      <button
        onClick={() => setFiltroStatus(id)}
        className={`flex flex-col items-start p-5 rounded-2xl border transition-all duration-200 w-full text-left ${
          isAtivo 
            ? 'bg-bg-surface-hover border-accent shadow-[0_0_15px_rgba(74,222,128,0.1)]' 
            : 'bg-bg-surface border-border hover:border-border-hover hover:bg-bg-surface-hover'
        }`}
      >
        <div className="flex items-center gap-2 mb-3">
          <Icone size={16} className={isAtivo ? 'text-accent' : 'text-text-secondary'} />
          <span className={`text-xs font-bold uppercase tracking-wider ${isAtivo ? 'text-accent' : 'text-text-secondary'}`}>
            {titulo}
          </span>
        </div>
        <span className="text-3xl font-bold text-white tracking-tight">{valor}</span>
      </button>
    )
  }

  return (
    <div className="min-h-screen bg-bg-base font-sans text-slate-200 selection:bg-accent/30">
      
      {/* Header */}
      <header className="sticky top-0 z-10 bg-bg-base/80 backdrop-blur-md border-b border-border px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-border p-2 rounded-xl">
              <LayoutDashboard className="text-accent" size={24} />
            </div>
            <div>
              <p className="text-accent text-[10px] uppercase tracking-widest font-bold mb-0.5">
                Plataforma EloSocial
              </p>
              <h1 className="text-xl font-bold tracking-tight text-white">
                Fila de Atendimento
              </h1>
            </div>
          </div>

          <button
            onClick={buscarCasos}
            disabled={carregando}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-border bg-bg-surface text-text-secondary hover:text-white hover:border-accent/50 hover:bg-bg-surface-hover transition-all disabled:opacity-50"
          >
            <RefreshCw size={16} className={carregando ? "animate-spin text-accent" : ""} />
            {carregando ? 'Sincronizando...' : 'Atualizar Dados'}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        
        {/* KPIs / Filtros */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <FilterCard id="todos" titulo="Total Abertos" valor={casos.length} Icone={Inbox} />
          <FilterCard id="aguardando_video" titulo="Aguardando Vídeo" valor={contarAguardandoVideo()} Icone={Video} />
          <FilterCard id="pendente" titulo="Pendentes" valor={contarPorStatus('pendente')} Icone={Clock} />
          <FilterCard id="em_atendimento" titulo="Em Atendimento" valor={contarPorStatus('em_atendimento')} Icone={Activity} />
          <FilterCard id="em_acompanhamento" titulo="Acompanhamento" valor={contarPorStatus('em_acompanhamento')} Icone={ShieldCheck} />
        </div>

        {/* Tabela Principal */}
        <div className="bg-bg-surface border border-border rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap md:whitespace-normal">
              <thead>
                <tr className="bg-bg-base border-b border-border">
                  <th className="px-6 py-4 text-text-secondary text-xs font-bold uppercase tracking-wider w-[15%]">Status</th>
                  <th className="px-6 py-4 text-text-secondary text-xs font-bold uppercase tracking-wider w-[12%]">Prioridade</th>
                  <th className="px-6 py-4 text-text-secondary text-xs font-bold uppercase tracking-wider w-[25%]">Cidadão</th>
                  <th className="px-6 py-4 text-text-secondary text-xs font-bold uppercase tracking-wider w-[33%]">Vulnerabilidades</th>
                  <th className="px-6 py-4 text-text-secondary text-xs font-bold uppercase tracking-wider text-right w-[15%]">Ação</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {carregando ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-8 h-8 border-2 border-border border-t-accent rounded-full animate-spin"></div>
                        <p className="text-text-secondary text-sm">Carregando fila de atendimento...</p>
                      </div>
                    </td>
                  </tr>
                ) : casosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-text-secondary">
                        <Inbox size={32} className="opacity-50 mb-2" />
                        <p className="text-sm font-medium">Nenhum caso encontrado para este filtro.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  casosFiltrados.map((caso) => (
                    <tr key={caso.id} className="hover:bg-bg-surface-hover transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-2 items-start">
                          {obterStatusBadge(caso.status)}
                          {caso.aguardando_video && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border border-blue-500/20 bg-blue-500/10 text-blue-400 animate-pulse">
                              <VideoIcon size={10} /> Em espera
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 align-top">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border tracking-wide ${obterCorPrioridade(caso.prioridade)}`}>
                          {caso.prioridade || 'BAIXA'}
                        </span>
                      </td>

                      <td className="px-6 py-4 align-top">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-border flex items-center justify-center text-text-secondary shrink-0">
                            <User size={14} />
                          </div>
                          <p className="text-text-primary text-sm font-bold truncate max-w-[200px] md:max-w-none">
                            {caso.paciente_nome || 'Não identificado'}
                          </p>
                        </div>
                      </td>

                      <td className="px-6 py-4 align-top">
                        <div className="flex items-start gap-2">
                          <AlertCircle size={14} className="text-text-secondary shrink-0 mt-0.5 hidden md:block" />
                          <p className="text-text-secondary text-xs leading-relaxed line-clamp-2">
                            {formatarSituacoes(caso.sintomas)}
                          </p>
                        </div>
                      </td>

                      <td className="px-6 py-4 align-middle text-right">
                        <button
                          onClick={() => abrirCaso(caso)}
                          className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                            caso.aguardando_video 
                              ? 'bg-accent text-bg-base hover:bg-accent-hover shadow-[0_0_15px_rgba(74,222,128,0.2)] hover:shadow-[0_0_20px_rgba(74,222,128,0.4)]' 
                              : 'bg-border text-accent hover:bg-border-hover border border-border-hover'
                          }`}
                        >
                          Abrir Caso <ArrowRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  )
}