import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient' 
import MensagensCaso from '../components/MensagensCaso'

export default function Acompanhamento() {
  const navigate = useNavigate()

  const [caso, setCaso] = useState(null)
  const [nomeUsuario, setNomeUsuario] = useState('')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let canal

    const buscarCaso = async () => {
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
      } else {
        setNomeUsuario(user.email || 'Cidadão')
      }

      const { data, error } = await supabase
        .from('triagens')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['pendente', 'em_atendimento', 'em_acompanhamento', 'concluido'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        alert('Erro ao carregar acompanhamento: ' + error.message)
        setCarregando(false)
        return
      }

      if (!data) {
        navigate('/triagem')
        return
      }

      setCaso(data)

      canal = supabase
        .channel(`acompanhamento_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'triagens',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            setCaso(payload.new)
          }
        )
        .subscribe()

      setCarregando(false)
    }

    buscarCaso()

    return () => {
      if (canal) {
        supabase.removeChannel(canal)
      }
    }
  }, [navigate])

  const sair = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  const entrarNaTeleconferencia = () => {
    if (caso?.status === 'em_atendimento') {
      navigate('/consulta')
      return
    }

    alert('A teleconferência ainda não foi iniciada pela equipe de assistência social.')
  }

  const obterTextoStatus = (status) => {
    if (status === 'pendente') return 'Aguardando acolhimento'
    if (status === 'em_atendimento') return 'Atendimento em andamento'
    if (status === 'em_acompanhamento') return 'Em acompanhamento'
    if (status === 'concluido') return 'Caso concluído'
    return 'Status não informado'
  }

  const obterDescricaoStatus = (status) => {
    if (status === 'pendente') {
      return 'Sua solicitação foi recebida e está aguardando análise da equipe de assistência social.'
    }

    if (status === 'em_atendimento') {
      return 'Um assistente social iniciou seu atendimento. A teleconferência está disponível nos recursos abaixo.'
    }

    if (status === 'em_acompanhamento') {
      return 'Seu atendimento inicial foi realizado. Agora você pode acompanhar próximos passos, mensagens e documentos do caso.'
    }

    if (status === 'concluido') {
      return 'Este caso foi encerrado pela equipe de assistência social.'
    }

    return 'Acompanhe aqui as informações do seu caso social.'
  }

  const obterCorStatus = (status) => {
    if (status === 'pendente') return 'bg-yellow-500'
    if (status === 'em_atendimento') return 'bg-blue-500'
    if (status === 'em_acompanhamento') return 'bg-[#4ab882]'
    if (status === 'concluido') return 'bg-gray-500'
    return 'bg-[#4a7a60]'
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

  if (carregando) {
    return (
      <div className="min-h-screen bg-[#0d1f1a] flex items-center justify-center px-6 py-10 font-sans">
        <div className="text-center animate-fadeUp">
          <div className="w-12 h-12 border-2 border-[#2a6b52] border-t-[#4ab882] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#5a8a72] text-sm">Carregando seu acompanhamento...</p>
        </div>
      </div>
    )
  }

  const teleconferenciaDisponivel = caso?.status === 'em_atendimento'

  return (
    <div className="min-h-screen bg-[#0d1f1a] px-6 py-10 font-sans">
      <div className="max-w-6xl mx-auto animate-fadeUp">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-10">
          <div>
            <p className="text-[#4ab882] text-xs uppercase tracking-wider font-medium mb-2">
              EloSocial
            </p>

            <h1 className="text-[#e8f0ec] text-2xl font-semibold" style={{fontFamily:'Georgia, serif'}}>
              Meu Acompanhamento
            </h1>

            <p className="text-[#5a8a72] text-sm mt-1">
              Olá, {nomeUsuario || 'cidadão'}. Aqui você acompanha seu caso social.
            </p>
          </div>

          <button
            onClick={sair}
            className="bg-[#1a3d30] border border-[#2a6b52] px-4 py-2 rounded-xl text-[#4ab882] text-xs hover:bg-[#224d3d] transition-all"
          >
            Sair
          </button>
        </div>

        <div className="bg-[#111f1a] border border-[#1e3b2e] rounded-3xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className={`w-3 h-3 rounded-full ${obterCorStatus(caso?.status)}`}></span>
            <div>
              <p className="text-[#5a8a72] text-xs uppercase tracking-wider mb-1">
                Status do caso
              </p>
              <h2 className="text-[#e8f0ec] text-xl font-semibold">
                {obterTextoStatus(caso?.status)}
              </h2>
            </div>
          </div>

          <p className="text-[#5a8a72] text-sm leading-relaxed mb-5">
            {obterDescricaoStatus(caso?.status)}
          </p>

          <button
            onClick={() => navigate('/triagem?editar=1')}
            className="border border-[#2a6b52] text-[#4ab882] px-4 py-3 rounded-xl text-sm font-medium hover:bg-[#1a3d30] transition-all"
          >
            Editar acolhimento
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 bg-[#111f1a] border border-[#1e3b2e] rounded-3xl p-6">
            <h3 className="text-[#4ab882] text-xs font-bold uppercase tracking-widest mb-4">
              Resumo do acolhimento
            </h3>

            <div className="space-y-4">
              <div>
                <p className="text-[#5a8a72] text-xs uppercase tracking-wider mb-1">
                  Prioridade
                </p>
                <p className="text-[#c8e0d4] text-sm font-medium">
                  {caso?.prioridade || 'Não informado'}
                </p>
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
                  Detalhes registrados
                </p>
                <pre className="text-[#c8e0d4] text-xs leading-relaxed whitespace-pre-wrap font-sans bg-[#0d1f1a] border border-[#1e3b2e] rounded-2xl p-4 max-h-80 overflow-y-auto">
                  {caso?.detalhes || 'Nenhum detalhe informado.'}
                </pre>
              </div>
            </div>
          </div>

          <div className="bg-[#111f1a] border border-[#1e3b2e] rounded-3xl p-6">
            <h3 className="text-[#4ab882] text-xs font-bold uppercase tracking-widest mb-4">
              Recursos do acompanhamento
            </h3>

            <div className="space-y-3">
              <button
                onClick={entrarNaTeleconferencia}
                className={`w-full text-left border rounded-2xl p-4 transition-all ${
                  teleconferenciaDisponivel
                    ? 'border-[#2a6b52] bg-[#123427] hover:bg-[#1a3d30]'
                    : 'border-[#1e3b2e] bg-[#0d1f1a] opacity-70'
                }`}
              >
                <p className="text-[#e8f0ec] text-sm font-medium">Teleconferência</p>
                <p className="text-[#5a8a72] text-xs mt-1">
                  {teleconferenciaDisponivel
                    ? 'A chamada foi iniciada pela equipe. Clique para entrar.'
                    : 'Será liberada quando o assistente social iniciar a chamada.'}
                </p>
              </button>

              <button
                onClick={() => navigate('/triagem?editar=1')}
                className="w-full text-left border border-[#1e3b2e] rounded-2xl p-4 bg-[#0d1f1a] hover:border-[#2a6b52] transition-all"
              >
                <p className="text-[#e8f0ec] text-sm font-medium">Editar acolhimento</p>
                <p className="text-[#5a8a72] text-xs mt-1">
                  Atualize informações importantes do seu caso social.
                </p>
              </button>

              <div className="border border-[#1e3b2e] rounded-2xl p-4 bg-[#0d1f1a] opacity-80">
                <p className="text-[#e8f0ec] text-sm font-medium">Mensagens</p>
                <p className="text-[#5a8a72] text-xs mt-1">
                  Em desenvolvimento pela equipe.
                </p>
              </div>

              <div className="border border-[#1e3b2e] rounded-2xl p-4 bg-[#0d1f1a] opacity-80">
                <p className="text-[#e8f0ec] text-sm font-medium">Plano de ação</p>
                <p className="text-[#5a8a72] text-xs mt-1">
                  Próximos passos e tarefas do acompanhamento.
                </p>
              </div>

              <div className="border border-[#1e3b2e] rounded-2xl p-4 bg-[#0d1f1a] opacity-80">
                <p className="text-[#e8f0ec] text-sm font-medium">Cofre digital</p>
                <p className="text-[#5a8a72] text-xs mt-1">
                  Envio de documentos e comprovantes.
                </p>
              </div>
            </div>
          </div>
        </div>

        <MensagensCaso
          casoId={caso?.id}
          remetenteTipo="cidadao"
          remetenteNome={nomeUsuario || 'Cidadão'}
        />
      </div>
    </div>
  )
}