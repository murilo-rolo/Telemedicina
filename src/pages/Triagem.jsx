import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import {
  montarDadosAcolhimento,
  montarResumoAcolhimento,
  normalizarAcolhimento,
} from "../utils/acolhimento";

import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CreditCard,
  DollarSign,
  FileText,
  HeartHandshake,
  Home,
  Loader2,
  Lock,
  MapPin,
  Phone,
  Shield,
  User,
  Users,
} from "lucide-react";

const DEMANDAS_PRINCIPAIS = [
  { valor: "Alimentação", titulo: "Alimentação", Icone: HeartHandshake },
  { valor: "Moradia ou risco de despejo", titulo: "Moradia", Icone: Home },
  { valor: "Violência ou ameaça", titulo: "Violência ou ameaça", Icone: AlertTriangle },
  { valor: "Benefícios sociais", titulo: "Benefícios sociais", Icone: ClipboardList },
  { valor: "Documentação", titulo: "Documentação", Icone: CreditCard },
  { valor: "Criança, adolescente, idoso ou PCD em risco", titulo: "Pessoa vulnerável", Icone: Users },
  { valor: "Saúde e medicação", titulo: "Saúde e medicação", Icone: Shield },
  { valor: "Orientação social", titulo: "Orientação social", Icone: FileText },
  { valor: "Outra necessidade", titulo: "Outra necessidade", Icone: CheckCircle },
];

const SITUACOES_SOCIAIS = [
  "Risco de violência",
  "Falta de alimento",
  "Sem moradia ou risco de despejo",
  "Criança ou adolescente em risco",
  "Idoso ou PCD em risco",
  "Pessoa doente sem acompanhamento",
  "Família sem renda",
  "Benefício bloqueado ou pendente",
  "Documentação pendente",
];

const BENEFICIOS_SOCIAIS = [
  "Bolsa Família",
  "BPC",
  "Auxílio eventual",
  "Benefício bloqueado",
  "Nenhum",
  "Não sei informar",
  "Outro",
];

const FAIXAS_RENDA = [
  "",
  "Sem renda",
  "Até 1 salário mínimo",
  "De 1 a 2 salários mínimos",
  "Acima de 2 salários mínimos",
  "Não sabe informar",
  "Prefere não informar",
];

const COMPOSICAO_FAMILIAR_OPCOES = [
  "",
  "Mora sozinho(a)",
  "Casal sem filhos",
  "Casal com filhos",
  "Mãe/Pai solo com filhos",
  "Família estendida (com avós, tios, etc)",
  "Abrigo ou Instituição",
  "Situação de rua",
  "Outro",
];

const ETAPAS = [
  { titulo: "Contato", subtitulo: "Dados básicos para retorno e localização.", Icone: Phone },
  { titulo: "Família", subtitulo: "Contexto familiar, renda e benefícios.", Icone: Users },
  { titulo: "Motivo", subtitulo: "Principal necessidade do acolhimento.", Icone: ClipboardList },
  { titulo: "Urgência", subtitulo: "Situação atual e riscos identificados.", Icone: AlertTriangle },
  { titulo: "Relato", subtitulo: "Registro final antes do envio.", Icone: FileText },
];

function CampoTexto({ label, value, onChange, Icone, type = "text", required = false, textarea = false, rows = 4 }) {
  return (
    <div>
      <label className="flex items-center gap-2 text-text-label text-[11px] font-bold uppercase tracking-[0.18em] mb-2.5">
        {Icone && <Icone size={14} className="text-accent" />}
        {label}
        {required && <span className="text-[#f87171]">*</span>}
      </label>

      {textarea ? (
        <textarea
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-bg-input border border-border-muted rounded-2xl px-4 py-3.5 text-text-primary text-sm outline-none resize-none focus:border-accent/70 focus:ring-4 focus:ring-accent/10 transition-all"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-bg-input border border-border-muted rounded-2xl px-4 py-3.5 text-text-primary text-sm outline-none focus:border-accent/70 focus:ring-4 focus:ring-accent/10 transition-all"
        />
      )}
    </div>
  );
}

function CampoSelect({ label, value, onChange, Icone, children }) {
  return (
    <div>
      <label className="flex items-center gap-2 text-text-label text-[11px] font-bold uppercase tracking-[0.18em] mb-2.5">
        {Icone && <Icone size={14} className="text-accent" />}
        {label}
      </label>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-bg-input border border-border-muted rounded-2xl px-4 py-3.5 text-text-primary text-sm outline-none focus:border-accent/70 focus:ring-4 focus:ring-accent/10 transition-all"
      >
        {children}
      </select>
    </div>
  );
}

function CartaoOpcao({ titulo, Icone, selecionado, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
       className={`group relative overflow-hidden min-h-32 rounded-3xl border p-5 text-left transition-all duration-200 ${
         selecionado
           ? "border-accent/70 bg-accent/12 shadow-[0_18px_45px_rgba(74,222,128,0.08)]"
           : "border-border-muted bg-bg-input hover:border-border-accent hover:bg-bg-elevated"
       }`}
     >
       <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-accent/0 group-hover:bg-accent/5 transition-all" />

       <div className="relative flex items-start justify-between gap-3 mb-5">
         <div
           className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
             selecionado
               ? "bg-accent text-text-on-accent"
               : "bg-bg-icon text-text-label group-hover:text-accent"
           }`}
         >
           <Icone size={19} />
         </div>

         <div
           className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${
             selecionado
               ? "bg-accent border-accent text-text-on-accent"
               : "border-border-accent text-transparent"
          }`}
        >
          <Check size={14} />
        </div>
      </div>

      <p className="relative text-text-primary text-sm font-black leading-tight">
        {titulo}
      </p>
    </button>
  );
}

function BotaoSelecao({ children, selecionado, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
       className={`rounded-2xl border px-4 py-3.5 text-left transition-all duration-200 ${
         selecionado
           ? "border-accent/70 bg-accent/12 text-text-primary"
           : "border-border-muted bg-bg-input text-text-body hover:border-border-accent hover:bg-bg-elevated"
       }`}
     >
       <div className="flex items-start gap-3">
         <div
           className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
             selecionado
               ? "bg-accent border-accent text-text-on-accent"
               : "border-border-accent text-transparent"
          }`}
        >
          <Check size={13} />
        </div>

        <span className="text-sm leading-relaxed font-medium">{children}</span>
      </div>
    </button>
  );
}

function PainelLateral({
  etapaAtual,
  demandaFinal,
  urgencia,
  situacoesCount,
  formularioValido,
  cidadaoNome,
  progressoReal,
  onMudarEtapa,
}) {
  return (
    <aside className="lg:col-span-4 lg:sticky lg:top-24">
      <div className="relative overflow-hidden rounded-[2rem] border border-border-muted bg-bg-elevated p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 w-52 h-52 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 rounded-full bg-emerald-300/5 blur-3xl" />

        <div className="relative">
          <div className="flex items-center gap-2 mb-7">
            <div className="w-10 h-10 rounded-2xl bg-accent text-text-on-accent flex items-center justify-center">
              <HeartHandshake size={20} />
            </div>

            <div>
              <p className="text-accent text-[10px] uppercase tracking-[0.2em] font-black">
                EloSocial
              </p>
              <p className="text-text-primary text-sm font-bold">Acolhimento guiado</p>
            </div>
          </div>

          <div className="mb-7">
            <div className="flex items-end justify-between mb-3">
              <div>
                <p className="text-text-label text-[10px] uppercase tracking-[0.18em] font-bold mb-1">
                  Progresso
                </p>
                <p className="text-text-primary text-3xl font-black">{progressoReal}%</p>
              </div>

              <div className="w-14 h-14 rounded-2xl bg-bg-input border border-border-muted flex items-center justify-center">
                <span className="text-accent text-sm font-black">
                  {etapaAtual + 1}/{ETAPAS.length}
                </span>
              </div>
            </div>

            <div className="h-2 bg-bg-progress rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-300"
                style={{ width: `${progressoReal}%` }}
              />
            </div>
          </div>
          <div className="space-y-3 mb-7">
            {ETAPAS.map((etapa, index) => {
              const ativa = etapaAtual === index;
              const concluida = etapaAtual > index;
              const Icone = etapa.Icone;

              return (
                <button
                  key={etapa.titulo}
                  type="button"
                  onClick={() => onMudarEtapa(index)}
                  className={`w-full text-left flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all hover:bg-bg-elevated cursor-pointer ${
                    ativa
                      ? "border-accent/60 bg-accent/10"
                      : "border-border-muted bg-bg-input/80"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      concluida
                        ? "bg-accent text-text-on-accent"
                        : ativa
                          ? "bg-bg-icon text-accent"
                          : "bg-bg-icon text-text-label"
                    }`}
                  >
                    {concluida ? <Check size={15} /> : <Icone size={15} />}
                  </div>

                  <div>
                    <p className="text-text-primary text-sm font-bold">
                      {etapa.titulo}
                    </p>
                    <p className="text-text-label text-[11px]">
                      {index === etapaAtual
                        ? "Em preenchimento"
                        : concluida
                          ? "Visualizar"
                          : "Ir para etapa"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="rounded-3xl border border-border-muted bg-bg-input p-5 mb-5">
            <p className="text-text-label text-[10px] uppercase tracking-[0.18em] font-bold mb-4">
              Resumo
            </p>

            <div className="space-y-4">
              <div>
                <p className="text-text-label text-[11px] mb-1">Cidadão</p>
                <p className="text-text-primary text-sm font-bold">{cidadaoNome}</p>
              </div>

              <div>
                <p className="text-text-label text-[11px] mb-1">Motivo</p>
                <p className="text-text-primary text-sm font-bold">
                  {demandaFinal || "Não informado"}
                </p>
              </div>

              <div>
                <p className="text-text-label text-[11px] mb-1">Urgência</p>
                <p className="text-text-primary text-sm font-bold">
                  {urgencia === "alta" && "Atenção imediata"}
                  {urgencia === "media" && "Retorno breve"}
                  {urgencia === "baixa" && "Pode aguardar"}
                </p>
              </div>

              <div>
                <p className="text-text-label text-[11px] mb-1">Situações</p>
                <p className="text-text-primary text-sm font-bold">{situacoesCount}</p>
              </div>
            </div>
          </div>

          <div
            className={`rounded-2xl border px-4 py-3 ${
              formularioValido
                ? "border-accent/40 bg-accent/10 text-accent"
                : "border-border-muted bg-bg-input text-text-label"
            }`}
          >
            <div className="flex items-center gap-2">
              {formularioValido ? (
                <CheckCircle size={16} />
              ) : (
                <Lock size={16} />
              )}

              <p className="text-xs font-black">
                {formularioValido
                  ? "Pronto para envio"
                  : "Aguardando informações"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default function Triagem() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const modoEdicao = searchParams.get("editar") === "1";

  const [etapaAtual, setEtapaAtual] = useState(0);
  const [telefone, setTelefone] = useState("");
  const [idade, setIdade] = useState("");
  const [cartaoSus, setCartaoSus] = useState("");
  const [bairroLocalidade, setBairroLocalidade] = useState("");
  const [pontoReferencia, setPontoReferencia] = useState("");
  const [territorioCras, setTerritorioCras] = useState("");
  const [composicaoFamiliar, setComposicaoFamiliar] = useState("");
  const [rendaFamiliar, setRendaFamiliar] = useState("");
  const [beneficios, setBeneficios] = useState([]);
  const [outrosBeneficios, setOutrosBeneficios] = useState("");
  const [demandaPrincipal, setDemandaPrincipal] = useState("");
  const [outraDemanda, setOutraDemanda] = useState("");
  const [urgencia, setUrgencia] = useState("baixa");
  const [situacoesMarcadas, setSituacoesMarcadas] = useState([]);
  const [outraSituacaoAtiva, setOutraSituacaoAtiva] = useState(false);
  const [outrasSituacoes, setOutrasSituacoes] = useState("");
  const [detalhes, setDetalhes] = useState("");
  
  const [enviando, setEnviando] = useState(false);
  const [salvoComSucesso, setSalvoComSucesso] = useState(false); // Novo estado de feedback visual
  const [carregando, setCarregando] = useState(true);
  const [cidadaoNome, setCidadaoNome] = useState("Cidadão");
  const [casoExistente, setCasoExistente] = useState(null);

  useEffect(() => {
    const buscarDadosIniciais = async () => {
      setCarregando(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/");
        return;
      }

      const { data: perfil } = await supabase
        .from("perfis")
        .select("nome")
        .eq("id", user.id)
        .maybeSingle();

      setCidadaoNome(perfil?.nome || user.email || "Cidadão");

      const { data: casoAtual, error } = await supabase
        .from("triagens")
        .select("*")
        .eq("user_id", user.id)
        .in("status", ["pendente", "em_atendimento", "em_acompanhamento"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        alert("Erro ao buscar acolhimento existente: " + error.message);
        setCarregando(false);
        return;
      }

      if (casoAtual) {
        setCasoExistente(casoAtual);
        if (modoEdicao) {
          carregarCasoNoFormulario(casoAtual);
        }
      }
      setCarregando(false);
    };

    buscarDadosIniciais();
  }, [navigate, modoEdicao]);

  const carregarCasoNoFormulario = (caso) => {
    const dados = normalizarAcolhimento(caso)

    const demandaExiste = DEMANDAS_PRINCIPAIS.some(
      (item) => item.valor === dados.demandaPrincipal
    )

    if (demandaExiste) {
      setDemandaPrincipal(dados.demandaPrincipal)
      setOutraDemanda('')
    } else if (dados.demandaPrincipal) {
      setDemandaPrincipal('Outra necessidade')
      setOutraDemanda(dados.demandaPrincipal)
    }

    const situacoesConhecidas = dados.situacoes.filter((item) =>
      SITUACOES_SOCIAIS.includes(item)
    )

    const situacoesAbertas = dados.outraSituacao ||
      dados.situacoes
        .filter((item) => !SITUACOES_SOCIAIS.includes(item))
        .map((item) => item.replace('Outra situação informada:', '').trim())
        .join('\n')

    setSituacoesMarcadas(situacoesConhecidas)
    setOutraSituacaoAtiva(Boolean(situacoesAbertas))
    setOutrasSituacoes(situacoesAbertas)

    setUrgencia(dados.urgencia || 'baixa')

    setTelefone(dados.telefone)
    setIdade(dados.idade)
    setCartaoSus(dados.cartaoSus)

    setBairroLocalidade(dados.bairroLocalidade)
    setPontoReferencia(dados.pontoReferencia)
    setTerritorioCras(dados.territorioCras)

    setComposicaoFamiliar(dados.composicaoFamiliar)
    setRendaFamiliar(dados.rendaFamiliar)

    setBeneficios(
      dados.beneficiosSociaisLista.filter((item) =>
        BENEFICIOS_SOCIAIS.includes(item)
      )
    )

    setOutrosBeneficios(dados.outrosBeneficios)
    setDetalhes(dados.relato)
  }

  const obterDemandaFinal = () => {
    if (demandaPrincipal === "Outra necessidade") {
      return outraDemanda.trim();
    }
    return demandaPrincipal;
  };

  const obterSituacoesFinais = () => {
    const abertas = outraSituacaoAtiva && outrasSituacoes.trim() ? [`Outra situação informada: ${outrasSituacoes.trim()}`] : [];
    return [...situacoesMarcadas, ...abertas];
  };

  const alternarSituacao = (situacao) => {
    setSituacoesMarcadas((atuais) => {
      if (atuais.includes(situacao)) return atuais.filter((item) => item !== situacao);
      return [...atuais, situacao];
    });
  };

  const alternarBeneficio = (beneficio) => {
    setBeneficios((atuais) => {
      if (beneficio === "Nenhum" || beneficio === "Não sei informar") {
        return atuais.includes(beneficio) ? [] : [beneficio];
      }
      const semExcludentes = atuais.filter((item) => item !== "Nenhum" && item !== "Não sei informar");
      if (semExcludentes.includes(beneficio)) {
        return semExcludentes.filter((item) => item !== beneficio);
      }
      return [...semExcludentes, beneficio];
    });
  };

  const calcularPontuacaoRisco = () => {
    let pontos = 0;
    const demandaFinal = obterDemandaFinal();

    if (demandaFinal === "Violência ou ameaça") pontos += 50;
    if (demandaFinal === "Alimentação") pontos += 40;
    if (demandaFinal === "Falta de alimento") pontos += 40;
    if (demandaFinal === "Moradia ou risco de despejo") pontos += 35;
    if (demandaFinal === "Criança, adolescente, idoso ou PCD em risco") pontos += 35;
    if (demandaFinal === "Saúde e medicação") pontos += 25;
    if (demandaFinal === "Benefícios sociais") pontos += 20;
    if (demandaFinal === "Documentação") pontos += 10;
    if (demandaFinal === "Orientação social") pontos += 5;
    if (demandaPrincipal === "Outra necessidade") pontos += 10;

    if (situacoesMarcadas.includes("Risco de violência")) pontos += 50;
    if (situacoesMarcadas.includes("Falta de alimento")) pontos += 40;
    if (situacoesMarcadas.includes("Criança ou adolescente em risco")) pontos += 35;
    if (situacoesMarcadas.includes("Idoso ou PCD em risco")) pontos += 35;
    if (situacoesMarcadas.includes("Sem moradia ou risco de despejo")) pontos += 35;
    if (situacoesMarcadas.includes("Pessoa doente sem acompanhamento")) pontos += 25;
    if (situacoesMarcadas.includes("Família sem renda")) pontos += 20;
    if (situacoesMarcadas.includes("Benefício bloqueado ou pendente")) pontos += 10;
    if (situacoesMarcadas.includes("Documentação pendente")) pontos += 5;
    if (outraSituacaoAtiva && outrasSituacoes.trim()) pontos += 10;

    if (urgencia === "alta") pontos += 30;
    if (urgencia === "media") pontos += 15;

    return pontos;
  };

  const calcularPrioridade = () => {
    const pontos = calcularPontuacaoRisco();
    if (pontos >= 70) return "ALTA";
    if (pontos >= 30) return "MÉDIA";
    return "BAIXA";
  };

  const montarDadosEstruturados = () => {
    return montarDadosAcolhimento({
      telefone,
      idade,
      cartaoSus,
      bairroLocalidade,
      pontoReferencia,
      territorioCras,
      composicaoFamiliar,
      rendaFamiliar,
      beneficios,
      outrosBeneficios,
      demandaPrincipal,
      demandaFinal: obterDemandaFinal(),
      outraDemanda,
      urgencia,
      situacoesMarcadas,
      outraSituacaoAtiva,
      outrasSituacoes,
      relato: detalhes,
    })
  }

  const montarResumoDoCaso = (dadosAcolhimento = montarDadosEstruturados()) => {
    const pontuacao = calcularPontuacaoRisco()
  
    return montarResumoAcolhimento(dadosAcolhimento, pontuacao)
  }

  const formularioValido = Boolean(
    obterDemandaFinal() &&
    telefone.trim() &&
    bairroLocalidade.trim() &&
    detalhes.trim()
  );

  const calcularProgressoReal = () => {
    const camposEssenciais = [
      telefone.trim() !== "",
      bairroLocalidade.trim() !== "",
      obterDemandaFinal() !== "",
      detalhes.trim() !== "",
    ];
  
    const preenchidos = camposEssenciais.filter(Boolean).length;
    return Math.round((preenchidos / camposEssenciais.length) * 100);
  };

  const avancar = () => {
    setEtapaAtual((atual) => Math.min(atual + 1, ETAPAS.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const voltar = () => {
    setEtapaAtual((atual) => Math.max(atual - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const mudarEtapa = (index) => {
    setEtapaAtual(index);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const lidarComEnvio = async (e) => {
    if (e) e.preventDefault();
    if (!formularioValido) return;
    setEnviando(true);
    setSalvoComSucesso(false);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setEnviando(false);
      navigate("/");
      return;
    }

    const prioridadeCalculada = calcularPrioridade();
    const dadosAcolhimento = montarDadosEstruturados();
    const resumoDoCaso = montarResumoDoCaso(dadosAcolhimento);
    const dadosSociais = [obterDemandaFinal(), ...obterSituacoesFinais()].filter(Boolean);

    // MODO EDIÇÃO: APENAS SALVA E MANTÉM NA PÁGINA
    if (modoEdicao && casoExistente) {
      const { error } = await supabase
        .from("triagens")
        .update({
          paciente_nome: cidadaoNome,
          sintomas: dadosSociais,
          duracao: urgencia,
          detalhes: resumoDoCaso,
          prioridade: prioridadeCalculada,
          dados_acolhimento: dadosAcolhimento,
        })
        .eq("id", casoExistente.id);

      setEnviando(false);
      
      if (error) {
        alert("Erro ao atualizar acolhimento: " + error.message);
        return;
      }
      
      // Feedback visual
      setSalvoComSucesso(true);
      setTimeout(() => setSalvoComSucesso(false), 3000);
      return;
    }

    // MODO CRIAÇÃO: SALVA E REDIRECIONA
    const { data: solicitacaoExistente, error: erroBusca } = await supabase
      .from("triagens")
      .select("id, status")
      .eq("user_id", user.id)
      .in("status", ["pendente", "em_atendimento", "em_acompanhamento"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (erroBusca) {
      setEnviando(false);
      alert("Erro ao verificar solicitação existente: " + erroBusca.message);
      return;
    }

    if (solicitacaoExistente) {
      setEnviando(false);
      navigate("/acompanhamento");
      return;
    }

    const { error } = await supabase.from("triagens").insert([
      {
        user_id: user.id,
        paciente_nome: cidadaoNome,
        sintomas: dadosSociais,
        duracao: urgencia,
        detalhes: resumoDoCaso,
        prioridade: prioridadeCalculada,
        dados_acolhimento: dadosAcolhimento,
        status: "pendente",
      },
    ]);

    setEnviando(false);
    
    if (error) {
      alert("Erro ao enviar solicitação: " + error.message);
      return;
    }
    
    navigate("/acompanhamento");
  };

  const renderEtapa = () => {
    if (etapaAtual === 0) {
      return (
        <div className="grid md:grid-cols-2 gap-5">
          <CampoTexto label="Telefone" value={telefone} onChange={setTelefone} Icone={Phone} required />
          <CampoTexto label="Idade" value={idade} onChange={setIdade} Icone={User} type="number" />
          <CampoTexto label="Bairro ou localidade" value={bairroLocalidade} onChange={setBairroLocalidade} Icone={MapPin} required />
          <CampoTexto label="Ponto de referência" value={pontoReferencia} onChange={setPontoReferencia} Icone={MapPin} />
          <CampoTexto label="Território ou CRAS" value={territorioCras} onChange={setTerritorioCras} Icone={Shield} />
          <CampoTexto label="SUS ou NIS" value={cartaoSus} onChange={setCartaoSus} Icone={CreditCard} />
        </div>
      );
    }

    if (etapaAtual === 1) {
      return (
        <div className="space-y-7">
          <div className="grid md:grid-cols-2 gap-5">
            <CampoSelect label="Composição familiar" value={composicaoFamiliar} onChange={setComposicaoFamiliar} Icone={Users}>
              {COMPOSICAO_FAMILIAR_OPCOES.map((opcao) => (
                <option key={opcao || "vazio"} value={opcao}>
                  {opcao || "Selecione"}
                </option>
              ))}
            </CampoSelect>

            <CampoSelect label="Renda familiar" value={rendaFamiliar} onChange={setRendaFamiliar} Icone={DollarSign}>
              {FAIXAS_RENDA.map((faixa) => (
                <option key={faixa || "vazio"} value={faixa}>
                  {faixa || "Selecione"}
                </option>
              ))}
            </CampoSelect>
          </div>

          <div>
            <p className="text-text-label text-[11px] font-bold uppercase tracking-[0.18em] mb-3">Benefícios sociais</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {BENEFICIOS_SOCIAIS.map((beneficio) => (
                <BotaoSelecao key={beneficio} selecionado={beneficios.includes(beneficio)} onClick={() => alternarBeneficio(beneficio)}>
                  {beneficio}
                </BotaoSelecao>
              ))}
            </div>

            {beneficios.includes("Outro") && (
              <div className="mt-5">
                <CampoTexto label="Outro benefício" value={outrosBeneficios} onChange={setOutrosBeneficios} Icone={FileText} />
              </div>
            )}
          </div>
        </div>
      );
    }

    if (etapaAtual === 2) {
      return (
        <div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {DEMANDAS_PRINCIPAIS.map((demanda) => (
              <CartaoOpcao
                key={demanda.valor}
                titulo={demanda.titulo}
                Icone={demanda.Icone}
                selecionado={demandaPrincipal === demanda.valor}
                onClick={() => setDemandaPrincipal(demanda.valor)}
              />
            ))}
          </div>

          {demandaPrincipal === "Outra necessidade" && (
            <div className="mt-5">
              <CampoTexto label="Outra necessidade" value={outraDemanda} onChange={setOutraDemanda} Icone={FileText} required />
            </div>
          )}
        </div>
      );
    }

    if (etapaAtual === 3) {
      return (
        <div className="space-y-7">
          <div>
            <p className="text-text-label text-[11px] font-bold uppercase tracking-[0.18em] mb-3">Situação neste momento</p>
            <div className="grid md:grid-cols-3 gap-3">
              {[
                ["baixa", "Posso aguardar"],
                ["media", "Retorno breve"],
                ["alta", "Atenção imediata"],
              ].map(([valor, titulo]) => (
                <button
                  key={valor}
                  type="button"
                  onClick={() => setUrgencia(valor)}
                  className={`rounded-2xl border p-4 text-center text-sm font-black transition-all ${
                    urgencia === valor
                      ? "border-accent/70 bg-accent/12 text-text-primary"
                      : "border-border-muted bg-bg-input text-text-label hover:border-border-accent"
                  }`}
                >
                  {titulo}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-text-label text-[11px] font-bold uppercase tracking-[0.18em] mb-3">Situações identificadas</p>
            <div className="grid md:grid-cols-2 gap-3">
              {SITUACOES_SOCIAIS.map((situacao) => (
                <BotaoSelecao key={situacao} selecionado={situacoesMarcadas.includes(situacao)} onClick={() => alternarSituacao(situacao)}>
                  {situacao}
                </BotaoSelecao>
              ))}
              <BotaoSelecao selecionado={outraSituacaoAtiva} onClick={() => setOutraSituacaoAtiva((atual) => !atual)}>
                Outra situação
              </BotaoSelecao>
            </div>

            {outraSituacaoAtiva && (
              <div className="mt-5">
                <CampoTexto label="Outra situação" value={outrasSituacoes} onChange={setOutrasSituacoes} Icone={FileText} textarea rows={3} />
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-7">
        <CampoTexto label="Relato da situação" value={detalhes} onChange={setDetalhes} Icone={FileText} required textarea rows={9} />

        <div className="rounded-3xl border border-border-muted bg-bg-input p-5">
          <p className="text-text-label text-[11px] uppercase tracking-[0.18em] font-bold mb-4">Revisão</p>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-text-label text-xs mb-1">Motivo</p>
              <p className="text-text-primary font-bold">{obterDemandaFinal() || "Não informado"}</p>
            </div>
            <div>
              <p className="text-text-label text-xs mb-1">Contato</p>
              <p className="text-text-primary font-bold">{telefone || "Não informado"}</p>
            </div>
            <div>
              <p className="text-text-label text-xs mb-1">Localidade</p>
              <p className="text-text-primary font-bold">{bairroLocalidade || "Não informado"}</p>
            </div>
            <div>
              <p className="text-text-label text-xs mb-1">Situações</p>
              <p className="text-text-primary font-bold">{obterSituacoesFinais().length}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (carregando) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-border-muted border-t-accent rounded-full animate-spin" />
          <p className="text-text-label text-sm font-medium tracking-wide">Carregando acolhimento...</p>
        </div>
      </div>
    );
  }

  if (casoExistente && !modoEdicao) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center px-6 py-10 font-sans">
        <div className="w-full max-w-md bg-bg-elevated border border-border-muted rounded-[2rem] p-8 text-center shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-accent text-text-on-accent flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={24} />
          </div>
          <p className="text-accent text-[10px] uppercase tracking-[0.2em] font-black mb-2">Plataforma EloSocial</p>
          <h1 className="text-text-primary text-2xl font-black mb-3">Acompanhamento ativo</h1>
          <p className="text-text-label text-sm leading-relaxed mb-7">Você já possui um caso social em andamento.</p>
          <button
            type="button"
            onClick={() => navigate("/acompanhamento")}
            className="w-full bg-accent text-text-on-accent hover:bg-accent-hover py-3.5 rounded-2xl text-sm font-black transition-all"
          >
            Ir para acompanhamento
          </button>
        </div>
      </div>
    );
  }

  const demandaFinal = obterDemandaFinal();
  const situacoesFinais = obterSituacoesFinais();
  const etapa = ETAPAS[etapaAtual];
  const IconeEtapa = etapa.Icone;

  return (
    <div className="min-h-screen bg-bg-base text-slate-200 font-sans selection:bg-accent/30">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-12rem] right-[-10rem] w-[32rem] h-[32rem] rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute bottom-[-14rem] left-[-12rem] w-[36rem] h-[36rem] rounded-full bg-emerald-300/5 blur-3xl" />
      </div>

      <header className="relative z-10 border-b border-border-muted/80 bg-bg-base/75 backdrop-blur-xl px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {modoEdicao && (
              <button
                type="button"
                onClick={() => navigate("/acompanhamento")}
                className="p-2 -ml-2 rounded-xl text-text-label hover:text-text-primary hover:bg-bg-elevated transition-colors"
                title="Voltar para acompanhamento sem salvar"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-accent text-text-on-accent flex items-center justify-center shadow-[0_0_30px_rgba(74,222,128,0.18)]">
                <HeartHandshake size={21} />
              </div>
              <div>
                <p className="text-accent text-[10px] uppercase tracking-[0.22em] font-black mb-0.5">Plataforma EloSocial</p>
                <h1 className="text-xl font-black tracking-tight text-text-primary">{modoEdicao ? "Editar acolhimento" : "Acolhimento social"}</h1>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {modoEdicao && (
              <button
                type="button"
                onClick={lidarComEnvio}
                disabled={enviando || !formularioValido}
                className="flex items-center gap-2 border border-accent/40 text-accent bg-accent/10 hover:bg-accent/15 disabled:border-border-muted disabled:bg-bg-input disabled:text-text-disabled px-4 py-2.5 rounded-2xl text-sm font-black transition-all"
              >
                {enviando ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Salvando...
                  </>
                ) : salvoComSucesso ? (
                  <>
                    <Check size={16} />
                    Salvo!
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    Salvar
                  </>
                )}
              </button>
            )}
            <div className="flex items-center gap-2 border border-border-muted bg-bg-elevated rounded-2xl px-4 py-2.5">
              <User size={16} className="text-accent" />
              <p className="text-text-primary text-sm font-bold">{cidadaoNome}</p>
            </div>
          </div>
        </div>
      </header>

      <form onSubmit={lidarComEnvio} className="relative z-10">
        <main className="max-w-7xl mx-auto p-6 grid lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8">
            <section className="relative overflow-hidden rounded-[2rem] border border-border-muted bg-bg-elevated p-7 md:p-9 shadow-2xl mb-6">
              <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-accent/10 blur-3xl" />
              <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-border-muted bg-bg-input px-3 py-1.5 mb-5">
                    <Lock size={13} className="text-accent" />
                    <span className="text-text-label text-xs font-bold">Informações protegidas</span>
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-bg-icon text-accent flex items-center justify-center">
                      <IconeEtapa size={22} />
                    </div>
                    <div>
                      <p className="text-accent text-[10px] uppercase tracking-[0.22em] font-black mb-1">Etapa {etapaAtual + 1} de {ETAPAS.length}</p>
                      <h2 className="text-text-primary text-3xl md:text-4xl font-black tracking-tight">{etapa.titulo}</h2>
                    </div>
                  </div>
                  <p className="text-text-body text-sm md:text-base leading-relaxed max-w-2xl">{etapa.subtitulo}</p>
                </div>
                <div className="w-full md:w-48">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-text-label text-xs font-bold">Campos essenciais</span>
                    <span className="text-accent text-xs font-black">{calcularProgressoReal()}%</span>
                  </div>
                  <div className="h-2 bg-bg-progress rounded-full overflow-hidden">
                    <div className="h-full bg-accent rounded-full transition-all duration-300" style={{ width: `${calcularProgressoReal()}%` }} />
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-border-muted bg-bg-elevated/95 p-6 md:p-8 shadow-2xl">
              {renderEtapa()}
            </section>

            {/* Navegação limpa do formulário (Voltar / Continuar) */}
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button
                type="button"
                onClick={voltar}
                disabled={etapaAtual === 0}
                className="sm:w-40 flex items-center justify-center gap-2 border border-border-muted text-text-label bg-bg-input hover:text-text-primary hover:border-border-accent disabled:opacity-40 py-3.5 rounded-2xl text-sm font-bold transition-all"
              >
                <ChevronLeft size={16} />
                Voltar
              </button>

              {etapaAtual < ETAPAS.length - 1 ? (
                <button
                  type="button"
                  onClick={avancar}
                  className="flex-1 flex items-center justify-center gap-2 bg-accent text-text-on-accent hover:bg-accent-hover disabled:bg-bg-progress disabled:text-text-disabled py-3.5 rounded-2xl text-sm font-black transition-all"
                >
                  Continuar
                  <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={enviando || !formularioValido}
                  className="flex-1 flex items-center justify-center gap-2 bg-accent text-text-on-accent hover:bg-accent-hover disabled:bg-bg-progress disabled:text-text-disabled py-3.5 rounded-2xl text-sm font-black transition-all"
                >
                  {enviando ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      {modoEdicao ? "Salvando..." : "Enviando..."}
                    </>
                  ) : salvoComSucesso ? (
                    <>
                      <Check size={16} />
                      Salvo com sucesso!
                    </>
                  ) : (
                    <>
                      <CheckCircle size={16} />
                      {modoEdicao ? "Salvar alterações" : "Enviar acolhimento"}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          <PainelLateral
            etapaAtual={etapaAtual}
            demandaFinal={demandaFinal}
            urgencia={urgencia}
            situacoesCount={situacoesFinais.length}
            formularioValido={formularioValido}
            cidadaoNome={cidadaoNome}
            progressoReal={calcularProgressoReal()}
            onMudarEtapa={mudarEtapa}
          />
        </main>
      </form>
    </div>
  );
}