import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import VideoCall from '../components/VideoCall'

export default function ConsultaMedico() {
  const navigate = useNavigate()
  const location = useLocation()

  const idTriagem = location.state?.idTriagem || sessionStorage.getItem('elosocial_caso_atual') || null

  const [caso, setCaso] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [encaminhamento, setEncaminhamento] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [videoAtivo, setVideoAtivo] = useState(false)

  // Mantemos a sala atual do Daily por enquanto para não quebrar a integração.
  // Depois podemos trocar para uma sala individual por caso.
  const URL_SALA = 'https://telesaude.daily.co/Sala-atendimento'

  useEffect(() => {
    const buscarCaso = async () => {
      setCarregando(true)

      if (!idTriagem) {
        setCaso({
          id: 'demo',
          paciente_nome: 'Maria Oliveira (Demonstração)',
          prioridade: 'ALTA',
          status: 'pendente',
          sintomas: ['Falta de alimento', 'A família está sem renda'],
          detalhes:
            'Caso demonstrativo para apresentação do MVP. Em um atendimento real, esta área mostra o resumo completo enviado pelo cidadão no acolhimento social.',
          isDemo: true,
        })

        setCarregando(false)
        return
      }

      const { data, error } = await supabase
        .from('triagens')
        .select('*')
        .eq('id', idTriagem)
        .maybeSingle()

      if (error) {
        alert('Erro ao carregar dados do caso: ' + error.message)
        setCarregando(false)
        return
      }

      if (!data) {
        alert('Caso não encontrado. Voltando para o painel.')
        navigate('/dashboard-medico')
        return
      }

      setCaso(data)
      setVideoAtivo(data.status === 'em_atendimento')
      setCarregando(false)
    }

    buscarCaso()
  }, [idTriagem, navigate])

  const atualizarStatusLocal = (novoStatus) => {
    setCaso((casoAtual) => {
      if (!casoAtual) return casoAtual

      return {
        ...casoAtual,
        status: novoStatus,
      }
    })
  }

  const iniciarTeleconferencia = async () => {
    if (!caso || caso.isDemo || !idTriagem) {
      setVideoAtivo(true)
      return
    }

    setSalvando(true)

    const { error } = await supabase
      .from('triagens')
      .update({
        status: 'em_atendimento',
        aguardando_video: false,
      })
      .eq('id', idTriagem)

    setSalvando(false)

    if (error) {
      alert('Erro ao iniciar teleconferência: ' + error.message)
      return
    }

    atualizarStatusLocal('em_atendimento')
    setVideoAtivo(true)
  }

  const finalizarChamada = async () => {
    if (!caso || caso.isDemo || !idTriagem) {
      setVideoAtivo(false)
      return
    }

    const confirmar = window.confirm('Deseja finalizar esta chamada e manter o caso em acompanhamento?')

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

    atualizarStatusLocal('em_acompanhamento')
    setVideoAtivo(false)
  }

  const concluirCaso = async () => {
    if (!caso || caso.isDemo || !idTriagem) {
      navigate('/dashboard-medico')
      return
    }

    const confirmar = window.confirm('Deseja concluir este caso? Ele deixará de aparecer nos casos abertos.')

    if (!confirmar) return

    setSalvando(true)

    const { error } = await supabase
      .from('triagens')
      .update({
        status: 'concluido',
        aguardando_video: false,
      })
      .eq('id', idTriagem)

    setSalvando(false)

    if (error) {
      alert('Erro ao concluir caso: ' + error.message)
      return
    }

    navigate('/dashboard-medico')
  }

  const registrarEncaminhamento = () => {
    if (!encaminhamento.trim()) {
      alert('Digite um encaminhamento antes de registrar.')
      return
    }

    alert('Encaminhamento registrado apenas visualmente neste MVP. A funcionalidade completa poderá ser ligada ao Plano de Ação ou Mensagens.')
  }

  const abrirMensagens = () => {
    if (!caso?.id || caso?.isDemo) {
      alert('Mensagens não estão disponíveis para o caso demonstrativo.')
      return
    }

    sessionStorage.setItem('elosocial_caso_atual', caso.id)

    navigate('/mensagens-assistente', {
      state: { idTriagem: caso.id },
    })
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

  if (carregando) {
    return (
      <div className="min-h-screen bg-[#0d1f1a] flex items-center justify-center px-6 py-10 font-sans">
        <div className="text-center animate-fadeUp">
          <div className="w-12 h-12 border-2 border-[#2a6b52] border-t-[#4ab882] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#5a8a72] text-sm">Carregando caso social...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0d1f1a] font-sans">
      <div className="border-b border-[#1e3b2e] bg-[#111f1a] px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-[#4ab882] text-xs uppercase tracking-wider font-medium mb-1">
              EloSocial
            </p>
            <h1 className="text-[#e8f0ec] text-xl font-semibold" style={{fontFamily:'Georgia, serif'}}>
              Detalhes do Caso Social
            </h1>
            <p className="text-[#5a8a72] text-sm mt-1">
              Atendimento, resumo, encaminhamentos e recursos do acompanhamento.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/dashboard-medico')}
              className="border border-[#2a6b52] text-[#4ab882] px-4 py-2 rounded-xl text-xs hover:bg-[#1a3d30] transition-all"
            >
              Voltar ao painel
            </button>

            <button
              onClick={concluirCaso}
              disabled={salvando}
              className="bg-red-900/40 text-red-400 border border-red-900 px-4 py-2 rounded-xl text-xs hover:bg-red-900/60 disabled:opacity-60 transition-all"
            >
              Concluir caso
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#111f1a] border border-[#1e3b2e] rounded-3xl p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-[#e8f0ec] text-2xl font-semibold" style={{fontFamily:'Georgia, serif'}}>
                  {caso?.paciente_nome || 'Cidadão não identificado'}
                </h2>
                <p className="text-[#5a8a72] text-sm mt-1">
                  Caso social aberto no EloSocial
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className={`inline-block px-2 py-1 rounded-md text-[10px] font-bold text-white ${obterCorPrioridade(caso?.prioridade)}`}>
                  {caso?.prioridade || 'BAIXA'}
                </span>

                <span className={`inline-block border px-2 py-1 rounded-md text-[10px] font-bold ${obterCorStatus(caso?.status)}`}>
                  {obterTextoStatus(caso?.status)}
                </span>
              </div>
            </div>

            <h3 className="text-[#4ab882] text-xs font-bold uppercase tracking-widest mb-4">
              Resumo do acolhimento
            </h3>

            <div className="space-y-4">
              <div>
                <p className="text-[#5a8a72] text-xs uppercase tracking-wider mb-1">
                  Demanda / Situações
                </p>
                <p className="text-[#c8e0d4] text-sm leading-relaxed">
                  {formatarSituacoes(caso?.sintomas)}
                </p>
              </div>

              <div>
                <p className="text-[#5a8a72] text-xs uppercase tracking-wider mb-1">
                  Detalhes do caso
                </p>
                <pre className="text-[#c8e0d4] text-xs leading-relaxed whitespace-pre-wrap font-sans bg-[#0d1f1a] border border-[#1e3b2e] rounded-2xl p-4 max-h-80 overflow-y-auto">
                  {caso?.detalhes || 'Nenhum detalhe informado.'}
                </pre>
              </div>
            </div>
          </div>

          <div className="bg-[#111f1a] border border-[#1e3b2e] rounded-3xl p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <div>
                <h3 className="text-[#4ab882] text-xs font-bold uppercase tracking-widest">
                  Teleconferência
                </h3>
                <p className="text-[#5a8a72] text-sm mt-2">
                  A videochamada é uma ferramenta do caso, não o fim do acompanhamento.
                </p>
              </div>

              {!videoAtivo ? (
                <button
                  onClick={iniciarTeleconferencia}
                  disabled={salvando || caso?.status === 'concluido'}
                  className="bg-[#1e7a52] hover:bg-[#22905f] disabled:bg-[#1a3330] disabled:text-[#4a7a60] text-[#e8f5ee] px-4 py-3 rounded-xl text-sm font-medium transition-all"
                >
                  {salvando ? 'Iniciando...' : 'Iniciar teleconferência'}
                </button>
              ) : (
                <button
                  onClick={finalizarChamada}
                  disabled={salvando}
                  className="bg-red-900/40 text-red-400 border border-red-900 px-4 py-3 rounded-xl text-sm hover:bg-red-900/60 disabled:opacity-60 transition-all"
                >
                  {salvando ? 'Finalizando...' : 'Finalizar chamada'}
                </button>
              )}
            </div>

            {videoAtivo ? (
              <div className="h-[520px] bg-black rounded-2xl overflow-hidden">
                <VideoCall url={URL_SALA} userName="Assistente Social" />
              </div>
            ) : (
              <div className="border border-[#1e3b2e] bg-[#0d1f1a] rounded-2xl p-6">
                <p className="text-[#c8e0d4] text-sm font-medium mb-2">
                  Chamada não iniciada
                </p>
                <p className="text-[#5a8a72] text-sm leading-relaxed">
                  Clique em “Iniciar teleconferência” quando o atendimento por vídeo for necessário.
                  O cidadão poderá entrar pela área “Meu Acompanhamento”.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[#111f1a] border border-[#1e3b2e] rounded-3xl p-6">
            <h3 className="text-[#4ab882] text-xs font-bold uppercase tracking-widest mb-4">
              Encaminhamento
            </h3>

            <textarea
              value={encaminhamento}
              onChange={(e) => setEncaminhamento(e.target.value)}
              className="w-full h-40 bg-[#0d1f1a] border border-[#1e3b2e] rounded-2xl p-4 text-[#c8e0d4] text-sm outline-none resize-none"
              placeholder="Registre orientações, próximos passos, encaminhamentos ao CRAS, documentos necessários ou observações do atendimento."
            ></textarea>

            <button
              onClick={registrarEncaminhamento}
              className="mt-4 w-full bg-[#1e7a52] text-white py-3 rounded-xl text-sm font-medium hover:bg-[#22905f]"
            >
              Registrar encaminhamento
            </button>

            <p className="text-[#4a7a60] text-xs mt-3 leading-relaxed">
              Por enquanto, este registro é visual. Ele poderá virar Mensagens ou Plano de Ação na próxima etapa.
            </p>
          </div>

          <div className="bg-[#111f1a] border border-[#1e3b2e] rounded-3xl p-6">
            <h3 className="text-[#4ab882] text-xs font-bold uppercase tracking-widest mb-4">
              Recursos do caso
            </h3>

            <div className="space-y-3">
              <button
                onClick={abrirMensagens}
                className="w-full text-left border border-[#1e3b2e] rounded-2xl p-4 bg-[#0d1f1a] hover:border-[#2a6b52] transition-all"
              >
                <p className="text-[#e8f0ec] text-sm font-medium">Mensagens</p>
                <p className="text-[#5a8a72] text-xs mt-1">
                  Abrir conversa salva no histórico do caso.
                </p>
              </button>

              <button
                type="button"
                onClick={() => alert('Plano de ação será implementado na próxima etapa.')}
                className="w-full text-left border border-[#1e3b2e] rounded-2xl p-4 bg-[#0d1f1a] hover:border-[#2a6b52] transition-all"
              >
                <p className="text-[#e8f0ec] text-sm font-medium">Plano de ação</p>
                <p className="text-[#5a8a72] text-xs mt-1">
                  Tarefas e próximos passos acompanhados pelo cidadão.
                </p>
              </button>

              <button
                type="button"
                onClick={() => alert('Cofre digital será implementado em uma próxima etapa.')}
                className="w-full text-left border border-[#1e3b2e] rounded-2xl p-4 bg-[#0d1f1a] hover:border-[#2a6b52] transition-all"
              >
                <p className="text-[#e8f0ec] text-sm font-medium">Cofre digital</p>
                <p className="text-[#5a8a72] text-xs mt-1">
                  Documentos enviados pelo cidadão.
                </p>
              </button>
            </div>
          </div>

          <div className="bg-[#111f1a] border border-[#1e3b2e] rounded-3xl p-6">
            <h3 className="text-[#4ab882] text-xs font-bold uppercase tracking-widest mb-4">
              Status do fluxo
            </h3>

            <div className="space-y-3 text-sm">
              <p className="text-[#5a8a72]">
                <span className="text-[#c8e0d4] font-medium">Pendente:</span> aguardando primeira ação.
              </p>
              <p className="text-[#5a8a72]">
                <span className="text-[#c8e0d4] font-medium">Em atendimento:</span> videochamada ou atendimento ativo.
              </p>
              <p className="text-[#5a8a72]">
                <span className="text-[#c8e0d4] font-medium">Em acompanhamento:</span> caso segue aberto após atendimento inicial.
              </p>
              <p className="text-[#5a8a72]">
                <span className="text-[#c8e0d4] font-medium">Concluído:</span> caso encerrado.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}