import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  Clock,
  Activity,
  LogOut,
  Edit3,
  ChevronRight,
  FileText,
  RefreshCw,
  Shield,
  Home,
} from 'lucide-react'

export default function Acompanhamento() {
  const navigate = useNavigate()

  const [caso, setCaso] = useState(null)
  const [nomeUsuario, setNomeUsuario] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let canal
    let componenteAtivo = true

    const buscarCaso = async () => {
      try {
        setCarregando(true)
        setErro('')

        const { data: sessao, error: erroSessao } = await supabase.auth.getSession()

        if (erroSessao) {
          throw erroSessao
        }

        const user = sessao?.session?.user

        if (!user) {
          navigate('/')
          return
        }

        const { data: perfil } = await supabase
          .from('perfis')
          .select('nome')
          .eq('id', user.id)
          .maybeSingle()

        if (!componenteAtivo) return

        setNomeUsuario(perfil?.nome || user.email || 'Cidadão')

        const { data, error } = await supabase
          .from('triagens')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (error) {
          throw error
        }

        if (!componenteAtivo) return

        setCaso(data || null)

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
      } catch (error) {
        console.error('Erro ao carregar acompanhamento:', error)

        if (componenteAtivo) {
          setErro(error.message || 'Não foi possível carregar o acompanhamento.')
        }
      } finally {
        if (componenteAtivo) {
          setCarregando(false)
        }
      }
    }

    buscarCaso()

    return () => {
      componenteAtivo = false

      if (canal) {
        supabase.removeChannel(canal)
      }
    }
  }, [navigate])

  const sair = async () => {
    await supabase.auth.signOut()
    navigate('/')
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

  const obterStatusConfig = (status) => {
    const config = {
      pendente: {
        texto: 'Aguardando acolhimento',
        descricao: 'Sua solicitação foi recebida pela equipe.',
        cor: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
        Icone: Clock,
      },
      em_atendimento: {
        texto: 'Atendimento em andamento',
        descricao: 'A equipe iniciou o atendimento do seu caso.',
        cor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        Icone: Activity,
      },
      em_acompanhamento: {
        texto: 'Em acompanhamento',
        descricao: 'Seu caso segue aberto para orientações e próximos passos.',
        cor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        Icone: CheckCircle,
      },
      concluido: {
        texto: 'Caso concluído',
        descricao: 'Este caso foi encerrado pela equipe de assistência social.',
        cor: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
        Icone: CheckCircle,
      },
    }

    return config[status] || {
      texto: 'Status não informado',
      descricao: 'Acompanhe aqui as informações do seu caso social.',
      cor: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
      Icone: Clock,
    }
  }

  const CardAcolhimento = ({ titulo, valor, Icone }) => (
    <div className="bg-bg-surface border border-border rounded-2xl p-4 transition-all hover:border-border-hover">
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

  const BotaoRecurso = ({ titulo, subtitulo, Icone, onClick, destaque }) => (
    <button
      onClick={onClick}
      className={`w-full group flex items-center gap-3 border rounded-2xl p-4 text-left transition-all ${
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
        <div className="flex flex-col items-center gap-4 animate-fadeUp">
          <div className="w-10 h-10 border-2 border-border border-t-accent rounded-full animate-spin"></div>
          <p className="text-text-secondary text-sm font-medium tracking-wide">
            Carregando acompanhamento...
          </p>
        </div>
      </div>
    )
  }

  if (erro) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center px-6 py-10 font-sans">
        <div className="w-full max-w-md bg-bg-surface border border-border rounded-3xl p-8 text-center animate-fadeUp">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={20} className="text-red-400" />
          </div>

          <h1 className="text-white text-xl font-bold mb-3">
            Não foi possível carregar
          </h1>

          <p className="text-text-secondary text-sm leading-relaxed mb-6">
            {erro}
          </p>

          <button
            onClick={() => window.location.reload()}
            className="w-full flex items-center justify-center gap-2 bg-accent text-bg-base hover:bg-accent-hover py-3 rounded-xl text-sm font-bold transition-all"
          >
            <RefreshCw size={16} />
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  if (!caso) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center px-6 py-10 font-sans">
        <div className="w-full max-w-md bg-bg-surface border border-border rounded-3xl p-8 text-center animate-fadeUp">
          <div className="w-12 h-12 rounded-full bg-border flex items-center justify-center mx-auto mb-4">
            <FileText size={20} className="text-accent" />
          </div>

          <p className="text-accent text-[10px] uppercase tracking-widest font-bold mb-2">
            Plataforma EloSocial
          </p>

          <h1 className="text-white text-xl font-bold mb-3">
            Nenhum acompanhamento encontrado
          </h1>

          <p className="text-text-secondary text-sm leading-relaxed mb-6">
            Você ainda não possui um caso social registrado.
          </p>

          <button
            onClick={() => navigate('/triagem')}
            className="w-full bg-accent text-bg-base hover:bg-accent-hover py-3 rounded-xl text-sm font-bold transition-all"
          >
            Iniciar acolhimento
          </button>
        </div>
      </div>
    )
  }

  const dadosAcolhimento = normalizarAcolhimento(caso)
  const statusAtual = obterStatusConfig(caso?.status)
  const IconeStatus = statusAtual.Icone
  const casoConcluido = caso?.status === 'concluido'

  return (
    <div className="min-h-screen bg-bg-base text-slate-200 font-sans selection:bg-accent/30">
      <header className="sticky top-0 z-10 bg-bg-base/80 backdrop-blur-md border-b border-border px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-accent text-[10px] uppercase tracking-widest font-bold mb-0.5">
              Plataforma EloSocial
            </p>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Meu Acompanhamento
            </h1>
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
          <section className="bg-bg-surface border border-border rounded-3xl p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-5 mb-8">
              <div>
                <p className="text-text-secondary text-sm font-medium mb-2">
                  Olá, {nomeUsuario || 'cidadão'}.
                </p>

                <h2 className="text-3xl font-bold text-white tracking-tight mb-3">
                  Seu caso social
                </h2>

                <div className="flex flex-wrap items-center gap-2">
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
              </div>

              <button
                onClick={() => navigate('/triagem?editar=1')}
                disabled={casoConcluido}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-border-hover text-accent bg-bg-base hover:bg-bg-surface-hover disabled:opacity-40 disabled:hover:bg-bg-base transition-all"
              >
                <Edit3 size={16} />
                Editar acolhimento
              </button>
            </div>

            <div className="bg-bg-base border border-border rounded-2xl p-5 mb-8">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-border flex items-center justify-center shrink-0">
                  <IconeStatus size={18} className="text-accent" />
                </div>

                <div>
                  <p className="text-white text-sm font-semibold mb-1">
                    {statusAtual.texto}
                  </p>
                  <p className="text-text-secondary text-sm leading-relaxed">
                    {statusAtual.descricao}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div>
                <h3 className="text-text-secondary text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                  <FileText size={14} className="text-accent" />
                  Resumo do acolhimento
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
                  Família e renda
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
                    Situações registradas
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

              <div>
                <h3 className="text-text-secondary text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                  <MessageSquare size={14} className="text-accent" />
                  Seu relato
                </h3>

                <div className="bg-bg-base border border-border rounded-2xl p-5">
                  <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-wrap italic">
                    {dadosAcolhimento.relato
                      ? `"${dadosAcolhimento.relato}"`
                      : 'Nenhum relato informado.'}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <section className="bg-bg-surface border border-border rounded-3xl p-6">
            <h3 className="text-text-secondary text-xs font-bold uppercase tracking-widest mb-4">
              Acessos rápidos
            </h3>

            <div className="space-y-3">
              <BotaoRecurso
                titulo={caso?.status === 'em_atendimento' ? 'Entrar na chamada' : 'Teleconferência'}
                subtitulo={caso?.status === 'em_atendimento' ? 'Atendimento disponível agora' : 'Sala de espera por vídeo'}
                Icone={Video}
                destaque={caso?.status === 'em_atendimento'}
                onClick={() => navigate('/consulta')}
              />

              <BotaoRecurso
                titulo="Mensagens"
                subtitulo="Conversa com a equipe"
                Icone={MessageSquare}
                onClick={() => navigate('/mensagens')}
              />

              <BotaoRecurso
                titulo="Plano de ação"
                subtitulo="Tarefas e encaminhamentos"
                Icone={Briefcase}
                onClick={() => navigate('/plano-acao')}
              />

              <BotaoRecurso
                titulo="Cofre digital"
                subtitulo="Documentos do caso"
                Icone={Lock}
                onClick={() => navigate('/cofre-digital')}
              />
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}