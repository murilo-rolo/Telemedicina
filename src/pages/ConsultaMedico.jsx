import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import VideoCall from '../components/VideoCall'
import { 
  User, Phone, MapPin, CreditCard, DollarSign, 
  Users, AlertTriangle, MessageSquare, Briefcase, 
  Lock, Video, PhoneOff, CheckCircle, ChevronLeft,
  Activity
} from 'lucide-react'

export default function ConsultaMedico() {
  const navigate = useNavigate()
  const location = useLocation()

  const idTriagem = location.state?.idTriagem || sessionStorage.getItem('elosocial_caso_atual') || null

  const [caso, setCaso] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [encaminhamento, setEncaminhamento] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [videoAtivo, setVideoAtivo] = useState(false)

  const URL_SALA = 'https://telesaude.daily.co/Sala-atendimento'

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
        alert('Erro ao carregar dados do caso: ' + error.message)
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
      setVideoAtivo(data.status === 'em_atendimento')
      setCarregando(false)
    }

    buscarCaso()
  }, [idTriagem, navigate])

  const atualizarCasoLocal = (camposAtualizados) => {
    setCaso((casoAtual) => ({ ...casoAtual, ...camposAtualizados }))
  }

  const iniciarTeleconferencia = async () => {
    if (!caso || !idTriagem) return
    setSalvando(true)

    const { error } = await supabase
      .from('triagens')
      .update({ status: 'em_atendimento', aguardando_video: false })
      .eq('id', idTriagem)

    setSalvando(false)

    if (error) {
      alert('Erro ao iniciar teleconferência: ' + error.message)
      return
    }

    atualizarCasoLocal({ status: 'em_atendimento', aguardando_video: false })
    setVideoAtivo(true)
  }

  const finalizarChamada = async () => {
    if (!caso || !idTriagem) return
    const confirmar = window.confirm('Finalizar a chamada e manter o caso em acompanhamento?')
    if (!confirmar) return

    setSalvando(true)

    const { error } = await supabase
      .from('triagens')
      .update({ status: 'em_acompanhamento', aguardando_video: false })
      .eq('id', idTriagem)

    setSalvando(false)

    if (error) {
      alert('Erro ao finalizar chamada: ' + error.message)
      return
    }

    atualizarCasoLocal({ status: 'em_acompanhamento', aguardando_video: false })
    setVideoAtivo(false)
  }

  const concluirCaso = async () => {
    if (!caso || !idTriagem) return
    const confirmar = window.confirm('Concluir este caso social? Ele deixará de aparecer nos casos abertos.')
    if (!confirmar) return

    setSalvando(true)

    const { error } = await supabase
      .from('triagens')
      .update({ status: 'concluido', aguardando_video: false })
      .eq('id', idTriagem)

    setSalvando(false)

    if (error) {
      alert('Erro ao concluir caso: ' + error.message)
      return
    }

    navigate('/dashboard-medico')
  }

  const registrarEncaminhamento = async () => {
    const textoLimpo = encaminhamento.trim()
    if (!textoLimpo) {
      alert('Digite um encaminhamento antes de salvar.')
      return
    }

    if (!caso?.id || !idTriagem) {
      alert('Não foi possível identificar o caso.')
      return
    }

    setSalvando(true)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      alert('Você precisa estar logado para registrar encaminhamentos.')
      setSalvando(false)
      return
    }

    const { error } = await supabase
      .from('plano_acao_itens')
      .insert([{
        caso_id: idTriagem,
        titulo: 'Encaminhamento do atendimento',
        descricao: textoLimpo,
        responsavel: 'cidadao',
        status: 'pendente',
        criado_por_id: user.id,
        criado_por_tipo: 'assistente',
      }])

    setSalvando(false)

    if (error) {
      alert('Erro ao salvar encaminhamento: ' + error.message)
      return
    }

    setEncaminhamento('')
    alert('Encaminhamento salvo no plano de ação.')
  }

  // Navegação
  const abrirMensagens = () => navigate('/mensagens-assistente', { state: { idTriagem: caso.id } })
  const abrirPlanoAcao = () => navigate('/plano-acao-assistente', { state: { idTriagem: caso.id } })
  const abrirCofreDigital = () => navigate('/cofre-digital-assistente', { state: { idTriagem: caso.id } })

  // Extratores
  const formatarSituacoes = (situacoes) => Array.isArray(situacoes) ? situacoes.join(', ') : situacoes || 'Não informado'

  const extrairCampoDoResumo = (texto, nomeCampo) => {
    if (!texto) return ''
    const linha = texto.split('\n').find((item) => item.toLowerCase().startsWith(nomeCampo.toLowerCase()))
    return linha ? linha.split(':').slice(1).join(':').trim() : ''
  }

  const extrairBlocoDoResumo = (texto, inicio, fim) => {
    if (!texto) return ''
    const indiceInicio = texto.indexOf(inicio)
    if (indiceInicio === -1) return ''
    
    const textoDepois = texto.slice(indiceInicio + inicio.length)
    const indiceFim = fim ? textoDepois.indexOf(fim) : -1
    return indiceFim === -1 ? textoDepois.trim() : textoDepois.slice(0, indiceFim).trim()
  }

  const obterDadosAcolhimento = (detalhes) => {
    const situacoesTexto = extrairBlocoDoResumo(detalhes, 'Situações marcadas:', 'Descrição do cidadão:')
    const situacoes = situacoesTexto
      .split('\n')
      .map((item) => item.replace(/^-\s*/, '').trim())
      .filter(Boolean)
      .filter((item) => item !== 'Nenhuma situação específica marcada')

    return {
      demandaPrincipal: extrairCampoDoResumo(detalhes, 'Demanda principal'),
      urgencia: extrairCampoDoResumo(detalhes, 'Nível de urgência informado'),
      pontuacao: extrairCampoDoResumo(detalhes, 'Pontuação de risco social'),
      telefone: extrairCampoDoResumo(detalhes, 'Telefone para contato'),
      endereco: extrairCampoDoResumo(detalhes, 'Endereço/bairro'),
      cartaoSus: extrairCampoDoResumo(detalhes, 'Cartão SUS/NIS'),
      composicaoFamiliar: extrairCampoDoResumo(detalhes, 'Composição familiar'),
      rendaFamiliar: extrairCampoDoResumo(detalhes, 'Renda familiar aproximada'),
      situacoes,
      relato: extrairBlocoDoResumo(detalhes, 'Descrição do cidadão:'),
    }
  }

  // Componente Visual Melhorado
  const CardAcolhimento = ({ titulo, valor, Icone }) => (
    <div className="bg-[#11211C] border border-[#1A332A] rounded-2xl p-4 transition-all hover:border-[#24473B]">
      <div className="flex items-center gap-2 mb-2">
        {Icone && <Icone size={14} className="text-[#4ade80] opacity-80" />}
        <p className="text-[#7A9C8D] text-[10px] font-semibold uppercase tracking-wider">
          {titulo}
        </p>
      </div>
      <p className="text-[#E2E8F0] text-sm leading-relaxed font-medium">
        {valor || 'Não informado'}
      </p>
    </div>
  )

  // Cores Modernas com Opacidade
  const obterCorPrioridade = (prioridade) => {
    if (prioridade === 'ALTA') return 'bg-red-500/10 text-red-400 border-red-500/20'
    if (prioridade === 'MÉDIA') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
    return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
  }

  const obterStatusBadge = (status) => {
    const config = {
      pendente: { texto: 'Pendente', cor: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
      em_atendimento: { texto: 'Em atendimento', cor: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
      em_acompanhamento: { texto: 'Em acompanhamento', cor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
      concluido: { texto: 'Concluído', cor: 'bg-slate-500/10 text-slate-400 border-slate-500/20' }
    }
    const atual = config[status] || { texto: 'Não informado', cor: 'bg-slate-500/10 text-slate-400 border-slate-500/20' }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border tracking-wide ${atual.cor}`}>
        {atual.texto}
      </span>
    )
  }

  if (carregando) {
    return (
      <div className="min-h-screen bg-[#0B1511] flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[#1A332A] border-t-[#4ade80] rounded-full animate-spin"></div>
          <p className="text-[#7A9C8D] text-sm font-medium tracking-wide">Carregando contexto social...</p>
        </div>
      </div>
    )
  }

  const dadosAcolhimento = obterDadosAcolhimento(caso?.detalhes || '')

  return (
    <div className="min-h-screen bg-[#0B1511] text-slate-200 font-sans selection:bg-[#4ade80]/30">
      
      {/* Header Fixo e Minimalista */}
      <header className="sticky top-0 z-10 bg-[#0B1511]/80 backdrop-blur-md border-b border-[#1A332A] px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/dashboard-medico')}
              className="p-2 -ml-2 rounded-xl text-[#7A9C8D] hover:text-white hover:bg-[#11211C] transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <p className="text-[#4ade80] text-[10px] uppercase tracking-widest font-bold mb-0.5">
                Plataforma EloSocial
              </p>
              <h1 className="text-xl font-bold tracking-tight text-white">
                Prontuário Social
              </h1>
            </div>
          </div>

          <button
            onClick={concluirCaso}
            disabled={salvando || caso?.status === 'concluido'}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border border-red-500/20 text-red-400 bg-red-500/5 hover:bg-red-500/10 disabled:opacity-40 transition-all"
          >
            <CheckCircle size={16} />
            Encerrar Caso
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid lg:grid-cols-12 gap-6 items-start">
        
        {/* Coluna Principal (Esquerda) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Card de Identificação */}
          <section className="bg-[#11211C] border border-[#1A332A] rounded-3xl p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
              <div>
                <h2 className="text-3xl font-bold text-white tracking-tight mb-3">
                  {caso?.paciente_nome || 'Cidadão não identificado'}
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border tracking-wide ${obterCorPrioridade(caso?.prioridade)}`}>
                    Prioridade {caso?.prioridade || 'BAIXA'}
                  </span>
                  {obterStatusBadge(caso?.status)}
                  {caso?.aguardando_video && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border border-blue-500/20 bg-blue-500/10 text-blue-400">
                      <Video size={10} /> Aguardando Vídeo
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div>
                <h3 className="text-[#7A9C8D] text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                  <User size={14} className="text-[#4ade80]" />
                  Mapeamento de Dados
                </h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <CardAcolhimento titulo="Demanda principal" valor={dadosAcolhimento.demandaPrincipal || formatarSituacoes(caso?.sintomas)} Icone={AlertTriangle} />
                  <CardAcolhimento titulo="Urgência informada" valor={dadosAcolhimento.urgencia} Icone={Activity} />
                  <CardAcolhimento titulo="Telefone" valor={dadosAcolhimento.telefone} Icone={Phone} />
                  <CardAcolhimento titulo="Endereço / Bairro" valor={dadosAcolhimento.endereco} Icone={MapPin} />
                  <CardAcolhimento titulo="Cartão SUS / NIS" valor={dadosAcolhimento.cartaoSus} Icone={CreditCard} />
                  <CardAcolhimento titulo="Renda Familiar" valor={dadosAcolhimento.rendaFamiliar} Icone={DollarSign} />
                  <CardAcolhimento titulo="Composição Familiar" valor={dadosAcolhimento.composicaoFamiliar} Icone={Users} />
                  <CardAcolhimento titulo="Risco Social" valor={dadosAcolhimento.pontuacao} Icone={AlertTriangle} />
                </div>
              </div>

              {dadosAcolhimento.situacoes.length > 0 && (
                <div>
                  <h3 className="text-[#7A9C8D] text-xs font-bold uppercase tracking-widest mb-4">
                    Vulnerabilidades Mapeadas
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {dadosAcolhimento.situacoes.map((situacao) => (
                      <span key={situacao} className="bg-[#1A332A] text-[#4ade80] px-3.5 py-1.5 rounded-lg text-xs font-medium border border-[#24473B]">
                        {situacao}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {dadosAcolhimento.relato && (
                <div>
                  <h3 className="text-[#7A9C8D] text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                    <MessageSquare size={14} className="text-[#4ade80]" />
                    Relato Direto
                  </h3>
                  <div className="bg-[#0B1511] border border-[#1A332A] rounded-2xl p-5">
                    <p className="text-[#A0BDB0] text-sm leading-relaxed whitespace-pre-wrap italic">
                      "{dadosAcolhimento.relato}"
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Seção de Vídeo */}
          <section className="bg-[#11211C] border border-[#1A332A] rounded-3xl p-6 md:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Video className="text-[#4ade80]" /> Sala de Atendimento
              </h3>

              {!videoAtivo ? (
                <button
                  onClick={iniciarTeleconferencia}
                  disabled={salvando || caso?.status === 'concluido'}
                  className="flex items-center justify-center gap-2 bg-[#4ade80] text-[#0B1511] hover:bg-[#22c55e] disabled:bg-[#1A332A] disabled:text-[#7A9C8D] px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-[0_0_15px_rgba(74,222,128,0.15)] hover:shadow-[0_0_25px_rgba(74,222,128,0.25)]"
                >
                  <Video size={16} /> {salvando ? 'Conectando...' : 'Iniciar Chamada'}
                </button>
              ) : (
                <button
                  onClick={finalizarChamada}
                  disabled={salvando}
                  className="flex items-center justify-center gap-2 border border-red-500/30 text-red-400 bg-red-500/10 px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-red-500/20 transition-all"
                >
                  <PhoneOff size={16} /> {salvando ? 'Encerrando...' : 'Finalizar Chamada'}
                </button>
              )}
            </div>

            {videoAtivo ? (
              <div className="h-[500px] bg-[#050A08] border border-[#1A332A] rounded-2xl overflow-hidden ring-4 ring-[#4ade80]/10">
                <VideoCall url={URL_SALA} userName="Assistente Social" />
              </div>
            ) : (
              <div className="h-48 border border-dashed border-[#24473B] bg-[#0B1511] rounded-2xl flex flex-col items-center justify-center text-center p-6">
                <div className="w-12 h-12 rounded-full bg-[#1A332A] flex items-center justify-center mb-3 text-[#7A9C8D]">
                  <Video size={20} />
                </div>
                <p className="text-[#7A9C8D] text-sm font-medium">A câmera e o microfone estão desativados.</p>
                <p className="text-[#4A6B5C] text-xs mt-1">Inicie a chamada para abrir a sala segura.</p>
              </div>
            )}
          </section>

        </div>

        {/* Coluna Lateral (Direita) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Ações Rápidas */}
          <section className="bg-[#11211C] border border-[#1A332A] rounded-3xl p-6">
            <h3 className="text-[#7A9C8D] text-xs font-bold uppercase tracking-widest mb-4">Ferramentas</h3>
            <div className="space-y-3">
              <button onClick={abrirMensagens} className="w-full group flex items-center gap-3 border border-[#1A332A] rounded-2xl p-4 bg-[#0B1511] hover:border-[#4ade80]/50 hover:bg-[#142921] transition-all">
                <div className="bg-[#1A332A] p-2 rounded-lg group-hover:bg-[#4ade80]/20 group-hover:text-[#4ade80] text-[#7A9C8D] transition-colors"><MessageSquare size={18} /></div>
                <div className="text-left"><p className="text-sm font-semibold text-white">Mensagens</p><p className="text-[10px] text-[#7A9C8D] mt-0.5">Chat com o cidadão</p></div>
              </button>

              <button onClick={abrirPlanoAcao} className="w-full group flex items-center gap-3 border border-[#1A332A] rounded-2xl p-4 bg-[#0B1511] hover:border-[#4ade80]/50 hover:bg-[#142921] transition-all">
                <div className="bg-[#1A332A] p-2 rounded-lg group-hover:bg-[#4ade80]/20 group-hover:text-[#4ade80] text-[#7A9C8D] transition-colors"><Briefcase size={18} /></div>
                <div className="text-left"><p className="text-sm font-semibold text-white">Plano de Ação</p><p className="text-[10px] text-[#7A9C8D] mt-0.5">Metas e encaminhamentos</p></div>
              </button>

              <button onClick={abrirCofreDigital} className="w-full group flex items-center gap-3 border border-[#1A332A] rounded-2xl p-4 bg-[#0B1511] hover:border-[#4ade80]/50 hover:bg-[#142921] transition-all">
                <div className="bg-[#1A332A] p-2 rounded-lg group-hover:bg-[#4ade80]/20 group-hover:text-[#4ade80] text-[#7A9C8D] transition-colors"><Lock size={18} /></div>
                <div className="text-left"><p className="text-sm font-semibold text-white">Cofre Digital</p><p className="text-[10px] text-[#7A9C8D] mt-0.5">Documentos sigilosos</p></div>
              </button>
            </div>
          </section>

          {/* Bloco de Encaminhamento */}
          <section className="bg-[#11211C] border border-[#1A332A] rounded-3xl p-6">
            <h3 className="text-[#7A9C8D] text-xs font-bold uppercase tracking-widest mb-4">
              Registro de Atendimento
            </h3>
            <textarea
              value={encaminhamento}
              onChange={(e) => setEncaminhamento(e.target.value)}
              className="w-full h-32 bg-[#0B1511] border border-[#1A332A] rounded-2xl p-4 text-sm text-[#E2E8F0] placeholder-[#4A6B5C] outline-none resize-none focus:border-[#4ade80]/50 focus:ring-1 focus:ring-[#4ade80]/50 transition-all"
              placeholder="Descreva as orientações finais, evolução do caso ou próximos passos..."
            ></textarea>

            <button
              onClick={registrarEncaminhamento}
              disabled={salvando || !encaminhamento.trim()}
              className="mt-4 w-full bg-[#1A332A] hover:bg-[#24473B] text-[#4ade80] disabled:bg-[#0B1511] disabled:text-[#4A6B5C] border border-[#24473B] disabled:border-[#1A332A] py-3 rounded-xl text-sm font-bold transition-all"
            >
              {salvando ? 'Registrando...' : 'Salvar no Prontuário'}
            </button>
          </section>

        </div>
      </main>
    </div>
  )
}