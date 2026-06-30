import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { normalizarAcolhimento } from '../utils/acolhimento'
import {
  User,
  Phone,
  MapPin,
  CreditCard,
  DollarSign,
  Users,
  AlertTriangle,
  MessageSquare,
  Briefcase,
  Lock,
  Video,
  CheckCircle,
  ChevronLeft,
  Activity,
  LogOut,
  ChevronRight,
  FileText,
  Shield,
  Home,
  Clock,
} from 'lucide-react'

export default function ConsultaMedico() {
  const navigate = useNavigate()
  const location = useLocation()

  const idTriagem = location.state?.idTriagem || sessionStorage.getItem('elosocial_caso_atual') || null

  const [caso, setCaso] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

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
      setCarregando(false)
    }

    buscarCaso()
  }, [idTriagem, navigate])

  const sair = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  const concluirCaso = async () => {
    if (!caso || !idTriagem) return

    const confirmar = window.confirm('Concluir este caso social? Ele deixará de aparecer nos casos abertos.')

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

  const guardarCasoAtual = () => {
    if (caso?.id) {
      sessionStorage.setItem('elosocial_caso_atual', caso.id)
    }
  }

  const abrirTeleconferencia = () => {
    guardarCasoAtual()
    navigate('/teleconferencia-assistente', {
      state: { idTriagem: caso.id },
    })
  }

  const abrirMensagens = () => {
    guardarCasoAtual()
    navigate('/mensagens-assistente', { state: { idTriagem: caso.id } })
  }

  const abrirPlanoAcao = () => {
    guardarCasoAtual()
    navigate('/plano-acao-assistente', { state: { idTriagem: caso.id } })
  }

  const abrirCofreDigital = () => {
    guardarCasoAtual()
    navigate('/cofre-digital-assistente', { state: { idTriagem: caso.id } })
  }

  const extrairCampoDoResumo = (texto, nomeCampo) => {
    if (!texto) return ''

    const linha = texto
      .split('\n')
      .find((item) => item.toLowerCase().startsWith(nomeCampo.toLowerCase()))

    if (!linha) return ''

    const valor = linha.split(':').slice(1).join(':').trim()

    if (!valor || valor === 'Não informado') return ''

    return valor
  }

  const extrairBlocoDoResumo = (texto, inicio, fim) => {
    if (!texto) return ''

    const indiceInicio = texto.indexOf(inicio)

    if (indiceInicio === -1) return ''

    const textoDepois = texto.slice(indiceInicio + inicio.length)
    const indiceFim = fim ? textoDepois.indexOf(fim) : -1

    return indiceFim === -1
      ? textoDepois.trim()
      : textoDepois.slice(0, indiceFim).trim()
  }

  const obterPrimeiroItem = (lista) => {
    if (Array.isArray(lista) && lista.length > 0) {
      return lista[0]
    }

    return ''
  }

  const obterDadosAcolhimento = (detalhes, sintomas) => {
    const situacoesTexto = extrairBlocoDoResumo(
      detalhes,
      'Situações marcadas:',
      'Descrição do cidadão:'
    )

    const situacoes = situacoesTexto
      .split('\n')
      .map((item) => item.replace(/^-\s*/, '').trim())
      .filter(Boolean)
      .filter((item) => item !== 'Nenhuma situação específica marcada')

    return {
      demandaPrincipal:
        extrairCampoDoResumo(detalhes, 'Demanda principal') ||
        obterPrimeiroItem(sintomas),

      urgencia: extrairCampoDoResumo(detalhes, 'Nível de urgência informado'),

      pontuacao: extrairCampoDoResumo(detalhes, 'Pontuação de risco social'),

      telefone: extrairCampoDoResumo(detalhes, 'Telefone para contato'),

      idade: extrairCampoDoResumo(detalhes, 'Idade'),

      cartaoSus: extrairCampoDoResumo(detalhes, 'Cartão SUS/NIS'),

      bairroLocalidade:
        extrairCampoDoResumo(detalhes, 'Bairro/localidade') ||
        extrairCampoDoResumo(detalhes, 'Endereço/bairro'),

      pontoReferencia:
        extrairCampoDoResumo(detalhes, 'Ponto de referência') ||
        extrairCampoDoResumo(detalhes, 'Complemento/ponto de referência'),

      territorioCras:
        extrairCampoDoResumo(detalhes, 'Território/CRAS') ||
        extrairCampoDoResumo(detalhes, 'Território/CRAS de referência'),

      composicaoFamiliar: extrairCampoDoResumo(detalhes, 'Composição familiar'),

      rendaFamiliar:
        extrairCampoDoResumo(detalhes, 'Renda familiar') ||
        extrairCampoDoResumo(detalhes, 'Renda familiar aproximada'),

      beneficiosSociais: extrairCampoDoResumo(detalhes, 'Benefícios sociais'),

      outrosBeneficios: extrairCampoDoResumo(detalhes, 'Outros benefícios'),

      situacoes,

      relato: extrairBlocoDoResumo(detalhes, 'Descrição do cidadão:'),
    }
  }

  const formatarUrgencia = (urgencia) => {
    if (urgencia === 'alta') return 'Atenção imediata'
    if (urgencia === 'media') return 'Retorno breve'
    if (urgencia === 'baixa') return 'Pode aguardar'
    return urgencia || 'Não informado'
  }

  const obterCorPrioridade = (prioridade) => {
    if (prioridade === 'ALTA') return 'bg-red-500/10 text-red-400 border-red-500/20'
    if (prioridade === 'MÉDIA') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
    return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
  }

  const obterStatusBadge = (status) => {
    const config = {
      pendente: {
        texto: 'Pendente',
        cor: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      },
      em_atendimento: {
        texto: 'Em atendimento',
        cor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      },
      em_acompanhamento: {
        texto: 'Em acompanhamento',
        cor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      },
      concluido: {
        texto: 'Concluído',
        cor: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
      },
    }

    const atual = config[status] || {
      texto: 'Não informado',
      cor: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border tracking-wide ${atual.cor}`}>
        {atual.texto}
      </span>
    )
  }

  const CardAcolhimento = ({ titulo, valor, Icone, destaque }) => (
    <div
      className={`border rounded-2xl p-4 transition-all hover:border-border-hover ${
        destaque
          ? 'bg-bg-base border-accent/30'
          : 'bg-bg-surface border-border'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        {Icone && <Icone size={14} className="text-accent opacity-80" />}
        <p className="text-text-secondary text-[10px] font-semibold uppercase tracking-wider">
          {titulo}
        </p>
      </div>

      <p className="text-text-primary text-sm leading-relaxed font-medium">
        {valor || 'Não informado'}
      </p>
    </div>
  )

  const BotaoFerramenta = ({ titulo, subtitulo, Icone, onClick, destaque, disabled }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full group flex items-center gap-3 border rounded-2xl p-4 text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
        destaque
          ? 'border-accent/40 bg-accent/10 hover:bg-accent/15'
          : 'border-border bg-bg-base hover:border-accent/50 hover:bg-bg-surface-hover'
      }`}
    >
      <div
        className={`p-2 rounded-lg transition-colors ${
          destaque
            ? 'bg-accent/20 text-accent'
            : 'bg-border text-text-secondary group-hover:bg-accent/20 group-hover:text-accent'
        }`}
      >
        <Icone size={18} />
      </div>

      <div className="flex-1">
        <p className="text-sm font-semibold text-white">{titulo}</p>
        <p className="text-[10px] text-text-secondary mt-0.5">{subtitulo}</p>
      </div>

      <ChevronRight size={16} className="text-text-muted group-hover:text-accent transition-colors" />
    </button>
  )

  if (carregando) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-border border-t-accent rounded-full animate-spin"></div>
          <p className="text-text-secondary text-sm font-medium tracking-wide">
            Carregando contexto social...
          </p>
        </div>
      </div>
    )
  }

  const dadosAcolhimento = normalizarAcolhimento(caso)
  const casoConcluido = caso?.status === 'concluido'
  const urgenciaTecnica = dadosAcolhimento.urgencia || caso?.duracao
  const pontuacaoRisco = dadosAcolhimento.pontuacao || 'Não informado'

  return (
    <div className="min-h-screen bg-bg-base text-slate-200 font-sans selection:bg-accent/30">
      <header className="sticky top-0 z-10 bg-bg-base/80 backdrop-blur-md border-b border-border px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard-medico')}
              className="p-2 -ml-2 rounded-xl text-text-secondary hover:text-white hover:bg-bg-surface transition-colors"
            >
              <ChevronLeft size={20} />
            </button>

            <div>
              <p className="text-accent text-[10px] uppercase tracking-widest font-bold mb-0.5">
                Plataforma EloSocial
              </p>

              <h1 className="text-xl font-bold tracking-tight text-white">
                Prontuário Social
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={sair}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-border text-text-secondary bg-bg-surface hover:text-white hover:border-border-hover transition-all"
            >
              <LogOut size={16} />
              Sair
            </button>

            <button
              onClick={concluirCaso}
              disabled={salvando || casoConcluido}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border border-red-500/20 text-red-400 bg-red-500/5 hover:bg-red-500/10 disabled:opacity-40 transition-all"
            >
              <CheckCircle size={16} />
              Encerrar caso
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 space-y-6">
          <section className="bg-bg-surface border border-border rounded-3xl p-6 md:p-8">
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
                      <Video size={10} />
                      Aguardando vídeo
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div>
                <h3 className="text-text-secondary text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Activity size={14} className="text-accent" />
                  Classificação interna
                </h3>

                <div className="grid sm:grid-cols-3 gap-3">
                  <CardAcolhimento
                    titulo="Prioridade"
                    valor={caso?.prioridade || 'BAIXA'}
                    Icone={AlertTriangle}
                    destaque
                  />

                  <CardAcolhimento
                    titulo="Urgência informada"
                    valor={formatarUrgencia(urgenciaTecnica)}
                    Icone={Clock}
                    destaque
                  />

                  <CardAcolhimento
                    titulo="Pontuação social"
                    valor={pontuacaoRisco}
                    Icone={Activity}
                    destaque
                  />
                </div>
              </div>

              <div>
                <h3 className="text-text-secondary text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                  <User size={14} className="text-accent" />
                  Identificação e contato
                </h3>

                <div className="grid sm:grid-cols-2 gap-3">
                  <CardAcolhimento
                    titulo="Demanda principal"
                    valor={dadosAcolhimento.demandaPrincipal}
                    Icone={Briefcase}
                  />

                  <CardAcolhimento
                    titulo="Telefone"
                    valor={dadosAcolhimento.telefone}
                    Icone={Phone}
                  />

                  <CardAcolhimento
                    titulo="Idade"
                    valor={dadosAcolhimento.idade}
                    Icone={User}
                  />

                  <CardAcolhimento
                    titulo="SUS / NIS"
                    valor={dadosAcolhimento.cartaoSus}
                    Icone={CreditCard}
                  />
                </div>
              </div>

              <div>
                <h3 className="text-text-secondary text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Home size={14} className="text-accent" />
                  Território e localização
                </h3>

                <div className="grid sm:grid-cols-2 gap-3">
                  <CardAcolhimento
                    titulo="Bairro / Localidade"
                    valor={dadosAcolhimento.bairroLocalidade}
                    Icone={MapPin}
                  />

                  <CardAcolhimento
                    titulo="Ponto de referência"
                    valor={dadosAcolhimento.pontoReferencia}
                    Icone={MapPin}
                  />

                  <CardAcolhimento
                    titulo="Território / CRAS"
                    valor={dadosAcolhimento.territorioCras}
                    Icone={Shield}
                  />
                </div>
              </div>

              <div>
                <h3 className="text-text-secondary text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Users size={14} className="text-accent" />
                  Família, renda e benefícios
                </h3>

                <div className="grid sm:grid-cols-2 gap-3">
                  <CardAcolhimento
                    titulo="Composição familiar"
                    valor={dadosAcolhimento.composicaoFamiliar}
                    Icone={Users}
                  />

                  <CardAcolhimento
                    titulo="Renda familiar"
                    valor={dadosAcolhimento.rendaFamiliar}
                    Icone={DollarSign}
                  />

                  <CardAcolhimento
                    titulo="Benefícios sociais"
                    valor={dadosAcolhimento.beneficiosSociais}
                    Icone={Briefcase}
                  />

                  {dadosAcolhimento.outrosBeneficios && (
                    <CardAcolhimento
                      titulo="Outros benefícios"
                      valor={dadosAcolhimento.outrosBeneficios}
                      Icone={FileText}
                    />
                  )}
                </div>
              </div>

              {dadosAcolhimento.situacoes.length > 0 && (
                <div>
                  <h3 className="text-text-secondary text-xs font-bold uppercase tracking-widest mb-4">
                    Vulnerabilidades mapeadas
                  </h3>

                  <div className="flex flex-wrap gap-2">
                    {dadosAcolhimento.situacoes.map((situacao) => (
                      <span
                        key={situacao}
                        className="bg-border text-accent px-3.5 py-1.5 rounded-lg text-xs font-medium border border-border-hover"
                      >
                        {situacao}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {dadosAcolhimento.relato && (
                <div>
                  <h3 className="text-text-secondary text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                    <MessageSquare size={14} className="text-accent" />
                    Relato direto
                  </h3>

                  <div className="bg-bg-base border border-border rounded-2xl p-5">
                    <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-wrap italic">
                      "{dadosAcolhimento.relato}"
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <section className="bg-bg-surface border border-border rounded-3xl p-6">
            <h3 className="text-text-secondary text-xs font-bold uppercase tracking-widest mb-4">
              Ferramentas
            </h3>

            <div className="space-y-3">
              <BotaoFerramenta
                titulo={caso?.status === 'em_atendimento' ? 'Chamada em andamento' : 'Teleconferência'}
                subtitulo={
                  caso?.aguardando_video
                    ? 'Cidadão aguardando atendimento'
                    : 'Sala de atendimento por vídeo'
                }
                Icone={Video}
                destaque={caso?.status === 'em_atendimento' || caso?.aguardando_video}
                disabled={casoConcluido}
                onClick={abrirTeleconferencia}
              />

              <BotaoFerramenta
                titulo="Mensagens"
                subtitulo="Chat com o cidadão"
                Icone={MessageSquare}
                onClick={abrirMensagens}
              />

              <BotaoFerramenta
                titulo="Plano de ação"
                subtitulo="Metas e encaminhamentos"
                Icone={Briefcase}
                onClick={abrirPlanoAcao}
              />

              <BotaoFerramenta
                titulo="Cofre digital"
                subtitulo="Documentos sigilosos"
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