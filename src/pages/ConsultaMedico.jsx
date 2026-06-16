import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import VideoCall from '../components/VideoCall'

export default function ConsultaMedico() {
  const navigate = useNavigate()
  const location = useLocation()

  const idTriagem = location.state?.idTriagem || null

  const [caso, setCaso] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [encaminhamento, setEncaminhamento] = useState('')
  const [encerrando, setEncerrando] = useState(false)

  // Mantemos a sala atual do Daily por enquanto para não quebrar a integração.
  // Depois podemos trocar para uma sala com nome do EloSocial.
  const URL_SALA = 'https://telesaude.daily.co/Sala-atendimento'

  useEffect(() => {
    const buscarCaso = async () => {
      setCarregando(true)

      if (!idTriagem) {
        setCaso({
          id: 'demo',
          paciente_nome: 'Maria Oliveira (Demonstração)',
          prioridade: 'ALTA',
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
      setCarregando(false)
    }

    buscarCaso()
  }, [idTriagem, navigate])

  const finalizarAtendimento = async () => {
    if (!caso || caso.isDemo || !idTriagem) {
      navigate('/dashboard-medico')
      return
    }

    const confirmar = window.confirm('Deseja finalizar esta chamada e manter o caso em acompanhamento?')

    if (!confirmar) return

    setEncerrando(true)

    const { error } = await supabase
      .from('triagens')
      .update({
        status: 'em_acompanhamento',
      })
      .eq('id', idTriagem)

    setEncerrando(false)

    if (error) {
      alert('Erro ao encerrar atendimento: ' + error.message)
      return
    }

    navigate('/dashboard-medico')
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

  return (
    <div className="h-screen bg-[#0d1f1a] flex flex-col font-sans overflow-hidden">
      <div className="h-16 border-b border-[#1e3b2e] flex items-center justify-between px-6 bg-[#111f1a]">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-full bg-[#4ab882] animate-pulse"></div>
          <div>
            <h2 className="text-[#e8f0ec] font-medium">
              Atendimento Social em andamento
            </h2>
            <p className="text-[#5a8a72] text-xs">
              EloSocial — Assistência social remota
            </p>
          </div>
        </div>

        <button
          onClick={finalizarAtendimento}
          disabled={encerrando}
          className="bg-red-900/40 text-red-400 border border-red-900 px-4 py-2 rounded-xl text-xs hover:bg-red-900/60 disabled:opacity-60 transition-all"
        >
          {encerrando ? 'Finalizando...' : 'Finalizar chamada'}
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 bg-black p-4">
          <VideoCall url={URL_SALA} userName="Assistente Social" />
        </div>

        <div className="w-96 bg-[#111f1a] flex flex-col overflow-y-auto border-l border-[#1e3b2e]">
          <div className="p-6 border-b border-[#1e3b2e]">
            <h3 className="text-[#4ab882] text-xs font-bold uppercase tracking-widest mb-4">
              Resumo do Acolhimento
            </h3>

            {carregando ? (
              <p className="text-[#5a8a72] text-sm">
                Carregando dados do caso...
              </p>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-[#5a8a72] text-xs uppercase tracking-wider mb-1">
                    Cidadão
                  </p>
                  <p className="text-[#c8e0d4] text-sm font-medium">
                    {caso?.paciente_nome || 'Cidadão não identificado'}
                  </p>
                </div>

                <div>
                  <p className="text-[#5a8a72] text-xs uppercase tracking-wider mb-1">
                    Prioridade
                  </p>
                  <span className={`inline-block px-2 py-1 rounded-md text-[10px] font-bold text-white ${obterCorPrioridade(caso?.prioridade)}`}>
                    {caso?.prioridade || 'BAIXA'}
                  </span>
                </div>

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
                  <pre className="text-[#c8e0d4] text-xs leading-relaxed whitespace-pre-wrap font-sans bg-[#0d1f1a] border border-[#1e3b2e] rounded-2xl p-4 max-h-72 overflow-y-auto">
                    {caso?.detalhes || 'Nenhum detalhe informado.'}
                  </pre>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 flex-1 flex flex-col">
            <h3 className="text-[#4ab882] text-xs font-bold uppercase tracking-widest mb-4">
              Encaminhamento do Atendimento
            </h3>

            <textarea
              value={encaminhamento}
              onChange={(e) => setEncaminhamento(e.target.value)}
              className="flex-1 w-full bg-[#0d1f1a] border border-[#1e3b2e] rounded-2xl p-4 text-[#c8e0d4] text-sm outline-none resize-none"
              placeholder="Registre orientações, próximos passos, encaminhamentos ao CRAS, documentos necessários ou observações do atendimento."
            ></textarea>

            <button
              onClick={() => alert('Encaminhamento registrado apenas visualmente neste MVP. A funcionalidade completa ficará para a etapa de Plano de Ação.')}
              className="mt-4 w-full bg-[#1e7a52] text-white py-3 rounded-xl text-sm font-medium hover:bg-[#22905f]"
            >
              Registrar encaminhamento
            </button>

            <button
              onClick={() => navigate('/dashboard-medico')}
              className="mt-3 w-full border border-[#2a6b52] text-[#4ab882] py-3 rounded-xl text-sm font-medium hover:bg-[#1a3d30] transition-all"
            >
              Voltar ao painel sem encerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}