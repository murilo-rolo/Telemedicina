import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function DashboardMedico() {
  const navigate = useNavigate()
  const [casos, setCasos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [filtroStatus, setFiltroStatus] = useState('todos')

  const statusAbertos = ['pendente', 'em_atendimento', 'em_acompanhamento']

  const obterPesoPrioridade = (prioridade) => {
    if (prioridade === 'ALTA') return 3
    if (prioridade === 'MÉDIA') return 2
    return 1
  }

  const obterPesoStatus = (status) => {
    if (status === 'em_atendimento') return 3
    if (status === 'pendente') return 2
    if (status === 'em_acompanhamento') return 1
    return 0
  }

  const ordenarCasos = (lista) => {
    return [...lista].sort((a, b) => {
      const statusB = obterPesoStatus(b.status)
      const statusA = obterPesoStatus(a.status)

      if (statusB !== statusA) {
        return statusB - statusA
      }

      const prioridadeB = obterPesoPrioridade(b.prioridade)
      const prioridadeA = obterPesoPrioridade(a.prioridade)

      if (prioridadeB !== prioridadeA) {
        return prioridadeB - prioridadeA
      }

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
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'triagens',
        },
        () => {
          buscarCasos()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [])

  const iniciarAtendimento = async (caso) => {
    if (caso.status === 'pendente' || caso.status === 'em_acompanhamento') {
      const { error } = await supabase
        .from('triagens')
        .update({ status: 'em_atendimento' })
        .eq('id', caso.id)

      if (error) {
        alert('Erro ao iniciar atendimento: ' + error.message)
        return
      }
    }

    navigate('/consulta-medica', {
      state: { idTriagem: caso.id },
    })
  }

  const abrirCaso = (caso) => {
    navigate('/consulta-medica', {
      state: { idTriagem: caso.id },
    })
  }

  const obterCorPrioridade = (prioridade) => {
    if (prioridade === 'ALTA') return 'bg-red-500'
    if (prioridade === 'MÉDIA') return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const obterTextoStatus = (status) => {
    if (status === 'pendente') return 'Pendente'
    if (status === 'em_atendimento') return 'Em atendimento'
    if (status === 'em_acompanhamento') return 'Em acompanhamento'
    if (status === 'concluido') return 'Concluído'
    return 'Não informado'
  }

  const obterCorStatus = (status) => {
    if (status === 'pendente') return 'bg-yellow-500/20 text-yellow-300 border-yellow-600/40'
    if (status === 'em_atendimento') return 'bg-blue-500/20 text-blue-300 border-blue-600/40'
    if (status === 'em_acompanhamento') return 'bg-[#4ab882]/20 text-[#4ab882] border-[#2a6b52]'
    return 'bg-gray-500/20 text-gray-300 border-gray-600/40'
  }

  const formatarSituacoes = (situacoes) => {
    if (Array.isArray(situacoes)) {
      return situacoes.join(', ')
    }

    if (situacoes) {
      return situacoes
    }

    return 'Não informado'
  }

  const casosFiltrados = casos.filter((caso) => {
    if (filtroStatus === 'todos') return true
    return caso.status === filtroStatus
  })

  const contarPorStatus = (status) => {
    return casos.filter((caso) => caso.status === status).length
  }

  return (
    <div className="min-h-screen bg-[#0d1f1a] p-6 font-sans">
      <div className="max-w-6xl mx-auto animate-fadeUp">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-10">
          <div>
            <p className="text-[#4ab882] text-xs uppercase tracking-wider font-medium mb-2">
              EloSocial
            </p>
            <h1 className="text-[#e8f0ec] text-2xl font-semibold" style={{fontFamily:'Georgia, serif'}}>
              Painel do Assistente Social
            </h1>
            <p className="text-[#5a8a72] text-sm mt-1">
              Acompanhe casos sociais abertos, atendimentos em andamento e solicitações pendentes.
            </p>
          </div>

          <button
            onClick={buscarCasos}
            className="bg-[#1a3d30] border border-[#2a6b52] px-4 py-2 rounded-xl text-[#4ab882] text-xs hover:bg-[#224d3d] transition-all"
          >
            {carregando ? 'Atualizando...' : '🔄 Atualizar casos'}
          </button>
        </div>

        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <button
            onClick={() => setFiltroStatus('todos')}
            className={`text-left bg-[#111f1a] border rounded-2xl p-5 transition-all ${
              filtroStatus === 'todos' ? 'border-[#4ab882]' : 'border-[#1e3b2e]'
            }`}
          >
            <p className="text-[#5a8a72] text-xs uppercase tracking-wider mb-2">Casos abertos</p>
            <p className="text-[#e8f0ec] text-2xl font-semibold">{casos.length}</p>
          </button>

          <button
            onClick={() => setFiltroStatus('pendente')}
            className={`text-left bg-[#111f1a] border rounded-2xl p-5 transition-all ${
              filtroStatus === 'pendente' ? 'border-[#4ab882]' : 'border-[#1e3b2e]'
            }`}
          >
            <p className="text-[#5a8a72] text-xs uppercase tracking-wider mb-2">Pendentes</p>
            <p className="text-[#e8f0ec] text-2xl font-semibold">{contarPorStatus('pendente')}</p>
          </button>

          <button
            onClick={() => setFiltroStatus('em_atendimento')}
            className={`text-left bg-[#111f1a] border rounded-2xl p-5 transition-all ${
              filtroStatus === 'em_atendimento' ? 'border-[#4ab882]' : 'border-[#1e3b2e]'
            }`}
          >
            <p className="text-[#5a8a72] text-xs uppercase tracking-wider mb-2">Em atendimento</p>
            <p className="text-[#e8f0ec] text-2xl font-semibold">{contarPorStatus('em_atendimento')}</p>
          </button>

          <button
            onClick={() => setFiltroStatus('em_acompanhamento')}
            className={`text-left bg-[#111f1a] border rounded-2xl p-5 transition-all ${
              filtroStatus === 'em_acompanhamento' ? 'border-[#4ab882]' : 'border-[#1e3b2e]'
            }`}
          >
            <p className="text-[#5a8a72] text-xs uppercase tracking-wider mb-2">Acompanhamento</p>
            <p className="text-[#e8f0ec] text-2xl font-semibold">{contarPorStatus('em_acompanhamento')}</p>
          </button>
        </div>

        <div className="bg-[#111f1a] border border-[#1e3b2e] rounded-3xl overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[#4a7a60] text-xs uppercase tracking-wider border-b border-[#1e3b2e] bg-[#152b24]">
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Prioridade</th>
                <th className="px-6 py-4">Cidadão</th>
                <th className="px-6 py-4">Demanda / Situações</th>
                <th className="px-6 py-4">Ação</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#1a3330]">
              {carregando && (
                <tr>
                  <td colSpan="5" className="px-6 py-10 text-center text-[#5a8a72] text-sm">
                    Carregando casos sociais...
                  </td>
                </tr>
              )}

              {!carregando && casosFiltrados.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-10 text-center text-[#5a8a72] text-sm">
                    Nenhum caso encontrado para este filtro.
                  </td>
                </tr>
              )}

              {!carregando && casosFiltrados.map((caso) => (
                <tr key={caso.id} className="hover:bg-[#152b24] transition-colors group">
                  <td className="px-6 py-4">
                    <span className={`inline-block border px-2 py-1 rounded-md text-[10px] font-bold ${obterCorStatus(caso.status)}`}>
                      {obterTextoStatus(caso.status)}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold text-white ${obterCorPrioridade(caso.prioridade)}`}>
                      {caso.prioridade || 'BAIXA'}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-[#c8e0d4] text-sm font-medium">
                    {caso.paciente_nome || 'Cidadão não identificado'}
                  </td>

                  <td className="px-6 py-4 text-[#5a8a72] text-xs italic max-w-md">
                    {formatarSituacoes(caso.sintomas)}
                  </td>

                  <td className="px-6 py-4">
                    {caso.status === 'em_acompanhamento' ? (
                      <button
                        onClick={() => abrirCaso(caso)}
                        className="border border-[#2a6b52] text-[#4ab882] text-xs px-4 py-2 rounded-lg hover:bg-[#1a3d30] transition-all"
                      >
                        Abrir caso
                      </button>
                    ) : (
                      <button
                        onClick={() => iniciarAtendimento(caso)}
                        className="bg-[#1e7a52] text-white text-xs px-4 py-2 rounded-lg opacity-80 group-hover:opacity-100 transition-all"
                      >
                        {caso.status === 'em_atendimento' ? 'Entrar no atendimento' : 'Iniciar atendimento'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-[#4a7a60] text-xs mt-5 leading-relaxed">
          Este painel usa a tabela atual de triagens como base temporária para representar casos sociais.
          As próximas etapas do projeto podem separar definitivamente as entidades de caso, mensagens,
          documentos, plano de ação e sessões de vídeo.
        </p>
      </div>
    </div>
  )
}