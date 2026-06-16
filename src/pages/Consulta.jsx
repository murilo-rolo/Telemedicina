import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import VideoCall from '../components/VideoCall'

export default function Consulta() {
  const navigate = useNavigate()

  const [chamadaAtiva, setChamadaAtiva] = useState(false)
  const [nomeUsuario, setNomeUsuario] = useState('')
  const [carregando, setCarregando] = useState(true)

  // Mantemos a sala atual do Daily por enquanto para não quebrar a integração.
  // Depois podemos trocar para uma sala individual por caso.
  const URL_SALA = 'https://telesaude.daily.co/Sala-atendimento'

  useEffect(() => {
    let canal

    const configurarAtendimento = async () => {
      setCarregando(true)

      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        navigate('/')
        return
      }

      const { data: perfil } = await supabase
        .from('perfis')
        .select('nome')
        .eq('id', user.id)
        .maybeSingle()

      if (perfil?.nome) {
        setNomeUsuario(perfil.nome)
      }

      const { data: solicitacaoAtual, error: erroSolicitacao } = await supabase
        .from('triagens')
        .select('id, status')
        .eq('user_id', user.id)
        .in('status', ['pendente', 'em_atendimento', 'em_acompanhamento', 'concluido'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (erroSolicitacao) {
        alert('Erro ao buscar sua solicitação: ' + erroSolicitacao.message)
        setCarregando(false)
        return
      }

      if (!solicitacaoAtual) {
        navigate('/triagem')
        return
      }

      if (solicitacaoAtual.status === 'em_atendimento') {
        setChamadaAtiva(true)
      }

      if (
        solicitacaoAtual.status === 'em_acompanhamento' ||
        solicitacaoAtual.status === 'concluido'
      ) {
        navigate('/acompanhamento')
        return
      }

      canal = supabase
        .channel(`mudanca_status_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'triagens',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (payload.new.status === 'em_atendimento') {
              setChamadaAtiva(true)
            }

            if (
              payload.new.status === 'em_acompanhamento' ||
              payload.new.status === 'concluido'
            ) {
              setChamadaAtiva(false)
              navigate('/acompanhamento')
            }
          }
        )
        .subscribe()

      setCarregando(false)
    }

    configurarAtendimento()

    return () => {
      if (canal) {
        supabase.removeChannel(canal)
      }
    }
  }, [navigate])

  if (carregando) {
    return (
      <div className="min-h-screen bg-[#0d1f1a] flex items-center justify-center px-6 py-10 font-sans">
        <div className="text-center animate-fadeUp">
          <div className="w-12 h-12 border-2 border-[#2a6b52] border-t-[#4ab882] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#5a8a72] text-sm">Carregando sua solicitação...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0d1f1a] flex flex-col items-center justify-center px-6 py-10 font-sans">
      {!chamadaAtiva ? (
        <div className="w-full max-w-md text-center animate-fadeUp">
          <div className="mb-8 relative inline-block">
            <div className="absolute inset-0 rounded-full bg-[#4ab882] opacity-20 animate-ping"></div>
            <div className="relative w-20 h-20 rounded-full border-2 border-[#2a6b52] bg-[#1a3d30] flex items-center justify-center">
              <svg className="w-10 h-10 text-[#4ab882]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
          </div>

          <h1 className="text-[#e8f0ec] text-2xl font-semibold mb-2" style={{fontFamily:'Georgia, serif'}}>
            Olá, {nomeUsuario || 'Cidadão'}
          </h1>

          <p className="text-[#5a8a72] text-sm mb-8 leading-relaxed">
            Sua solicitação de acolhimento social está registrada. Quando um assistente social iniciar o atendimento por vídeo, a chamada será liberada automaticamente.
          </p>

          <div className="bg-[#111f1a] border border-[#1e3b2e] rounded-2xl p-5 text-left mb-6">
            <p className="text-[#d4ebe0] text-sm font-medium mb-2">
              Atendimento por vídeo
            </p>
            <p className="text-[#5a8a72] text-sm leading-relaxed">
              Esta tela é usada apenas para a teleconferência. Para mensagens, documentos e próximos passos, acesse seu acompanhamento.
            </p>
          </div>

          <button
            onClick={() => navigate('/acompanhamento')}
            className="w-full border border-[#2a6b52] text-[#4ab882] py-3.5 rounded-xl text-sm font-medium hover:bg-[#1a3d30] transition-all"
          >
            Voltar para Meu Acompanhamento
          </button>
        </div>
      ) : (
        <div className="w-full max-w-4xl h-[80vh] flex flex-col animate-fadeUp">
          <div className="mb-4 text-center">
            <h1 className="text-[#e8f0ec] text-xl font-semibold" style={{fontFamily:'Georgia, serif'}}>
              Atendimento Social em andamento
            </h1>
            <p className="text-[#5a8a72] text-sm mt-1">
              Você está conectado com a equipe de assistência social.
            </p>
          </div>

          <div className="flex-1 w-full h-full relative">
            <VideoCall url={URL_SALA} userName={nomeUsuario || 'Cidadão'} />
          </div>

          <button
            onClick={() => navigate('/acompanhamento')}
            className="mt-6 text-[#5a8a72] hover:text-white underline text-sm"
          >
            Voltar para Meu Acompanhamento
          </button>
        </div>
      )}
    </div>
  )
}