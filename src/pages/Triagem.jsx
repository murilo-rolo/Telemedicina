import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function Triagem() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const modoEdicao = searchParams.get('editar') === '1'

  const [situacoesMarcadas, setSituacoesMarcadas] = useState([])
  const [demandaPrincipal, setDemandaPrincipal] = useState('')
  const [urgencia, setUrgencia] = useState('baixa')
  const [telefone, setTelefone] = useState('')
  const [endereco, setEndereco] = useState('')
  const [cartaoSus, setCartaoSus] = useState('')
  const [composicaoFamiliar, setComposicaoFamiliar] = useState('')
  const [rendaFamiliar, setRendaFamiliar] = useState('')
  const [detalhes, setDetalhes] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [cidadaoNome, setCidadaoNome] = useState('Cidadão')
  const [casoExistente, setCasoExistente] = useState(null)

  const situacoesSociais = [
    'Há risco de violência doméstica ou familiar',
    'A família está sem alimento no momento',
    'Há criança ou adolescente em situação de risco',
    'Há idoso ou pessoa com deficiência em situação de risco',
    'A família está sem moradia ou em risco de despejo',
    'Há pessoa doente sem acompanhamento ou medicação',
    'A família está sem renda',
    'Precisa atualizar CadÚnico ou benefício social',
    'Precisa de orientação sobre documentação',
  ]

  useEffect(() => {
    const buscarDadosIniciais = async () => {
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
        setCidadaoNome(perfil.nome)
      } else {
        setCidadaoNome(user.email || 'Cidadão')
      }

      const { data: casoAtual, error } = await supabase
        .from('triagens')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['pendente', 'em_atendimento', 'em_acompanhamento'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        alert('Erro ao buscar acolhimento existente: ' + error.message)
        setCarregando(false)
        return
      }

      if (casoAtual) {
        setCasoExistente(casoAtual)

        if (modoEdicao) {
          carregarCasoNoFormulario(casoAtual)
        }
      }

      setCarregando(false)
    }

    buscarDadosIniciais()
  }, [navigate, modoEdicao])

  const extrairCampoDoResumo = (texto, nomeCampo) => {
    if (!texto) return ''

    const linhas = texto.split('\n')
    const linha = linhas.find((item) => item.toLowerCase().startsWith(nomeCampo.toLowerCase()))

    if (!linha) return ''

    return linha.split(':').slice(1).join(':').trim().replace('Não informado', '')
  }

  const extrairDescricaoDoResumo = (texto) => {
    if (!texto) return ''

    const marcador = 'Descrição do cidadão:'
    const indice = texto.indexOf(marcador)

    if (indice === -1) return texto

    return texto.slice(indice + marcador.length).trim().replace('Não informado', '')
  }

  const carregarCasoNoFormulario = (caso) => {
    const dados = Array.isArray(caso.sintomas) ? caso.sintomas : []

    setDemandaPrincipal(dados[0] || '')
    setSituacoesMarcadas(dados.slice(1))
    setUrgencia(caso.duracao || 'baixa')
    setTelefone(extrairCampoDoResumo(caso.detalhes, 'Telefone para contato'))
    setEndereco(extrairCampoDoResumo(caso.detalhes, 'Endereço/bairro'))
    setCartaoSus(extrairCampoDoResumo(caso.detalhes, 'Cartão SUS/NIS'))
    setComposicaoFamiliar(extrairCampoDoResumo(caso.detalhes, 'Composição familiar'))
    setRendaFamiliar(extrairCampoDoResumo(caso.detalhes, 'Renda familiar aproximada'))
    setDetalhes(extrairDescricaoDoResumo(caso.detalhes))
  }

  const lidarComSituacao = (situacao) => {
    if (situacoesMarcadas.includes(situacao)) {
      setSituacoesMarcadas(situacoesMarcadas.filter(item => item !== situacao))
    } else {
      setSituacoesMarcadas([...situacoesMarcadas, situacao])
    }
  }

  const calcularPontuacaoRisco = () => {
    let pontos = 0

    if (demandaPrincipal === 'Violência ou ameaça') pontos += 50
    if (demandaPrincipal === 'Falta de alimento') pontos += 40
    if (demandaPrincipal === 'Moradia ou risco de despejo') pontos += 35
    if (demandaPrincipal === 'Criança, adolescente, idoso ou PCD em risco') pontos += 35
    if (demandaPrincipal === 'Benefícios sociais') pontos += 20
    if (demandaPrincipal === 'Documentação') pontos += 10
    if (demandaPrincipal === 'Orientação social') pontos += 5

    if (situacoesMarcadas.includes('Há risco de violência doméstica ou familiar')) pontos += 50
    if (situacoesMarcadas.includes('A família está sem alimento no momento')) pontos += 40
    if (situacoesMarcadas.includes('Há criança ou adolescente em situação de risco')) pontos += 35
    if (situacoesMarcadas.includes('Há idoso ou pessoa com deficiência em situação de risco')) pontos += 35
    if (situacoesMarcadas.includes('A família está sem moradia ou em risco de despejo')) pontos += 35
    if (situacoesMarcadas.includes('Há pessoa doente sem acompanhamento ou medicação')) pontos += 25
    if (situacoesMarcadas.includes('A família está sem renda')) pontos += 20
    if (situacoesMarcadas.includes('Precisa atualizar CadÚnico ou benefício social')) pontos += 10
    if (situacoesMarcadas.includes('Precisa de orientação sobre documentação')) pontos += 5

    if (urgencia === 'alta') pontos += 30
    if (urgencia === 'media') pontos += 15

    return pontos
  }

  const calcularPrioridade = () => {
    const pontos = calcularPontuacaoRisco()

    if (pontos >= 70) return 'ALTA'
    if (pontos >= 30) return 'MÉDIA'
    return 'BAIXA'
  }

  const montarResumoDoCaso = () => {
    const pontuacao = calcularPontuacaoRisco()

    return `
Demanda principal: ${demandaPrincipal}
Nível de urgência informado: ${urgencia}
Pontuação de risco social: ${pontuacao}

Telefone para contato: ${telefone || 'Não informado'}
Endereço/bairro: ${endereco || 'Não informado'}
Cartão SUS/NIS: ${cartaoSus || 'Não informado'}
Composição familiar: ${composicaoFamiliar || 'Não informado'}
Renda familiar aproximada: ${rendaFamiliar || 'Não informado'}

Situações marcadas:
${situacoesMarcadas.length > 0 ? situacoesMarcadas.map(item => `- ${item}`).join('\n') : '- Nenhuma situação específica marcada'}

Descrição do cidadão:
${detalhes || 'Não informado'}
    `.trim()
  }

  const lidarComEnvio = async (e) => {
    e.preventDefault()
    setEnviando(true)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      alert('Você precisa estar logado para enviar uma solicitação.')
      setEnviando(false)
      navigate('/')
      return
    }

    const prioridadeCalculada = calcularPrioridade()
    const resumoDoCaso = montarResumoDoCaso()

    const dadosSociais = [
      demandaPrincipal,
      ...situacoesMarcadas,
    ].filter(Boolean)

    if (modoEdicao && casoExistente) {
      const { error } = await supabase
        .from('triagens')
        .update({
          paciente_nome: cidadaoNome,
          sintomas: dadosSociais,
          duracao: urgencia,
          detalhes: resumoDoCaso,
          prioridade: prioridadeCalculada,
        })
        .eq('id', casoExistente.id)

      setEnviando(false)

      if (error) {
        alert('Erro ao atualizar acolhimento: ' + error.message)
        return
      }

      alert('Acolhimento atualizado com sucesso.')
      navigate('/acompanhamento')
      return
    }

    const { data: solicitacaoExistente, error: erroBusca } = await supabase
      .from('triagens')
      .select('id, status')
      .eq('user_id', user.id)
      .in('status', ['pendente', 'em_atendimento', 'em_acompanhamento'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (erroBusca) {
      alert('Erro ao verificar solicitação existente: ' + erroBusca.message)
      setEnviando(false)
      return
    }

    if (solicitacaoExistente) {
      alert('Você já possui um caso social em andamento. Vamos te levar para o acompanhamento.')
      setEnviando(false)
      navigate('/acompanhamento')
      return
    }

    const { error } = await supabase
      .from('triagens')
      .insert([
        {
          user_id: user.id,
          paciente_nome: cidadaoNome,
          sintomas: dadosSociais,
          duracao: urgencia,
          detalhes: resumoDoCaso,
          prioridade: prioridadeCalculada,
          status: 'pendente',
        }
      ])

    setEnviando(false)

    if (error) {
      alert('Erro ao enviar solicitação: ' + error.message)
    } else {
      navigate('/acompanhamento')
    }
  }

  if (carregando) {
    return (
      <div className="min-h-screen bg-[#0d1f1a] flex items-center justify-center px-6 py-10 font-sans">
        <div className="text-center animate-fadeUp">
          <div className="w-12 h-12 border-2 border-[#2a6b52] border-t-[#4ab882] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#5a8a72] text-sm">Carregando acolhimento...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0d1f1a] flex items-center justify-center px-6 py-10 font-sans">
      <div className="w-full max-w-3xl animate-fadeUp">
        <div className="text-center mb-8">
          <h1 className="text-[#e8f0ec] text-2xl font-semibold tracking-tight" style={{fontFamily:'Georgia, serif'}}>
            {modoEdicao ? 'Editar Acolhimento Social' : 'Acolhimento Social'}
          </h1>
          <p className="text-[#4ab882] text-sm mt-1 font-medium">
            Cidadão: {cidadaoNome}
          </p>
          <p className="text-[#5a8a72] text-sm mt-3 font-light max-w-2xl mx-auto">
            {modoEdicao
              ? 'Atualize as informações do seu caso para manter a equipe de assistência social informada.'
              : 'Preencha as informações abaixo para que a equipe de assistência social possa entender a situação e organizar o atendimento.'}
          </p>
        </div>

        <form onSubmit={lidarComEnvio} className="bg-[#111f1a] border border-[#1e3b2e] rounded-2xl p-8">
          <div className="mb-6">
            <label className="block text-[#5a8a72] text-xs uppercase tracking-wider mb-2 font-medium">
              Demanda principal
            </label>
            <select
              required
              value={demandaPrincipal}
              onChange={(e) => setDemandaPrincipal(e.target.value)}
              className="w-full bg-[#0d1f1a] border border-[#1e3b2e] rounded-xl px-4 py-3 text-[#c8e0d4] text-sm outline-none focus:border-[#2a9162] transition-colors"
            >
              <option value="">Selecione a principal necessidade</option>
              <option value="Violência ou ameaça">Violência ou ameaça</option>
              <option value="Falta de alimento">Falta de alimento</option>
              <option value="Moradia ou risco de despejo">Moradia ou risco de despejo</option>
              <option value="Criança, adolescente, idoso ou PCD em risco">Criança, adolescente, idoso ou PCD em risco</option>
              <option value="Benefícios sociais">Benefícios sociais</option>
              <option value="Documentação">Documentação</option>
              <option value="Orientação social">Orientação social</option>
            </select>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-[#5a8a72] text-xs uppercase tracking-wider mb-2 font-medium">
                Telefone para contato
              </label>
              <input
                type="text"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(00) 00000-0000"
                className="w-full bg-[#0d1f1a] border border-[#1e3b2e] rounded-xl px-4 py-3 text-[#c8e0d4] text-sm outline-none focus:border-[#2a9162]"
              />
            </div>

            <div>
              <label className="block text-[#5a8a72] text-xs uppercase tracking-wider mb-2 font-medium">
                Cartão SUS ou NIS
              </label>
              <input
                type="text"
                value={cartaoSus}
                onChange={(e) => setCartaoSus(e.target.value)}
                placeholder="Opcional neste protótipo"
                className="w-full bg-[#0d1f1a] border border-[#1e3b2e] rounded-xl px-4 py-3 text-[#c8e0d4] text-sm outline-none focus:border-[#2a9162]"
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-[#5a8a72] text-xs uppercase tracking-wider mb-2 font-medium">
              Endereço ou bairro de referência
            </label>
            <input
              type="text"
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              placeholder="Ex: Rua, bairro, ponto de referência ou território do CRAS"
              className="w-full bg-[#0d1f1a] border border-[#1e3b2e] rounded-xl px-4 py-3 text-[#c8e0d4] text-sm outline-none focus:border-[#2a9162]"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-[#5a8a72] text-xs uppercase tracking-wider mb-2 font-medium">
                Composição familiar
              </label>
              <input
                type="text"
                value={composicaoFamiliar}
                onChange={(e) => setComposicaoFamiliar(e.target.value)}
                placeholder="Ex: 2 adultos e 3 crianças"
                className="w-full bg-[#0d1f1a] border border-[#1e3b2e] rounded-xl px-4 py-3 text-[#c8e0d4] text-sm outline-none focus:border-[#2a9162]"
              />
            </div>

            <div>
              <label className="block text-[#5a8a72] text-xs uppercase tracking-wider mb-2 font-medium">
                Renda familiar aproximada
              </label>
              <input
                type="text"
                value={rendaFamiliar}
                onChange={(e) => setRendaFamiliar(e.target.value)}
                placeholder="Ex: Sem renda, até 1 salário mínimo..."
                className="w-full bg-[#0d1f1a] border border-[#1e3b2e] rounded-xl px-4 py-3 text-[#c8e0d4] text-sm outline-none focus:border-[#2a9162]"
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-[#5a8a72] text-xs uppercase tracking-wider mb-2 font-medium">
              Urgência percebida
            </label>
            <select
              value={urgencia}
              onChange={(e) => setUrgencia(e.target.value)}
              className="w-full bg-[#0d1f1a] border border-[#1e3b2e] rounded-xl px-4 py-3 text-[#c8e0d4] text-sm outline-none focus:border-[#2a9162] transition-colors"
            >
              <option value="baixa">Baixa — posso aguardar atendimento</option>
              <option value="media">Média — preciso de orientação em breve</option>
              <option value="alta">Alta — existe risco ou necessidade urgente</option>
            </select>
          </div>

          <div className="mb-6">
            <label className="block text-[#5a8a72] text-xs uppercase tracking-wider mb-3 font-medium">
              Situações identificadas
            </label>
            <div className="grid md:grid-cols-2 gap-3">
              {situacoesSociais.map((situacao) => (
                <label
                  key={situacao}
                  className="flex items-start gap-2 text-[#c8e0d4] text-sm cursor-pointer p-3 rounded-lg border border-[#1a3330] hover:bg-[#152b24] transition-colors"
                >
                  <input
                    type="checkbox"
                    className="accent-[#2a9162] w-4 h-4 mt-0.5 cursor-pointer"
                    checked={situacoesMarcadas.includes(situacao)}
                    onChange={() => lidarComSituacao(situacao)}
                  />
                  <span>{situacao}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mb-8">
            <label className="block text-[#5a8a72] text-xs uppercase tracking-wider mb-2 font-medium">
              Descrição da situação
            </label>
            <textarea
              rows="5"
              required
              value={detalhes}
              onChange={(e) => setDetalhes(e.target.value)}
              placeholder="Conte, com suas palavras, o que está acontecendo e qual apoio você precisa neste momento."
              className="w-full bg-[#0d1f1a] border border-[#1e3b2e] rounded-xl px-4 py-3 text-[#c8e0d4] text-sm outline-none focus:border-[#2a9162] resize-none"
            ></textarea>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="submit"
              disabled={enviando || !demandaPrincipal || !detalhes}
              className="flex-1 bg-[#1e7a52] hover:bg-[#22905f] disabled:bg-[#1a3330] disabled:text-[#4a7a60] text-[#e8f5ee] py-3.5 rounded-xl text-sm font-medium transition-all shadow-lg"
            >
              {enviando
                ? (modoEdicao ? 'Salvando alterações...' : 'Enviando solicitação...')
                : (modoEdicao ? 'Salvar alterações' : 'Enviar para Acolhimento Social')}
            </button>

            {modoEdicao && (
              <button
                type="button"
                onClick={() => navigate('/acompanhamento')}
                className="border border-[#2a6b52] text-[#4ab882] py-3.5 px-5 rounded-xl text-sm font-medium hover:bg-[#1a3d30] transition-all"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}