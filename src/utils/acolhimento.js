export function limparValor(valor) {
  if (valor === null || valor === undefined) return ''

  if (Array.isArray(valor)) {
    return valor.filter(Boolean)
  }

  const texto = String(valor).trim()

  if (!texto || texto === 'Não informado') return ''

  return texto
}

export function garantirLista(valor) {
  if (Array.isArray(valor)) {
    return valor.map((item) => limparValor(item)).filter(Boolean)
  }

  if (!valor) return []

  return String(valor)
    .split(',')
    .map((item) => limparValor(item))
    .filter(Boolean)
}

export function extrairCampoDoResumo(texto, nomeCampo) {
  if (!texto) return ''

  const linha = texto
    .split('\n')
    .find((item) => item.toLowerCase().startsWith(nomeCampo.toLowerCase()))

  if (!linha) return ''

  return limparValor(linha.split(':').slice(1).join(':'))
}

export function extrairBlocoDoResumo(texto, inicio, fim) {
  if (!texto) return ''

  const indiceInicio = texto.indexOf(inicio)

  if (indiceInicio === -1) return ''

  const textoDepois = texto.slice(indiceInicio + inicio.length)
  const indiceFim = fim ? textoDepois.indexOf(fim) : -1

  const bloco = indiceFim === -1
    ? textoDepois.trim()
    : textoDepois.slice(0, indiceFim).trim()

  return limparValor(bloco)
}

export function formatarUrgencia(urgencia) {
  if (urgencia === 'alta') return 'Atenção imediata'
  if (urgencia === 'media') return 'Retorno breve'
  if (urgencia === 'baixa') return 'Pode aguardar'

  return urgencia || 'Não informado'
}

export function obterPrimeiroItem(lista) {
  if (Array.isArray(lista) && lista.length > 0) {
    return lista[0]
  }

  return ''
}

export function extrairSituacoesDoResumo(detalhes) {
  const situacoesTexto = extrairBlocoDoResumo(
    detalhes,
    'Situações marcadas:',
    'Descrição do cidadão:'
  )

  return situacoesTexto
    .split('\n')
    .map((item) => item.replace(/^-\s*/, '').trim())
    .filter(Boolean)
    .filter((item) => item !== 'Nenhuma situação específica marcada')
}

export function normalizarAcolhimento(caso) {
  const dados = caso?.dados_acolhimento && typeof caso.dados_acolhimento === 'object'
    ? caso.dados_acolhimento
    : {}

  const contato = dados.contato || {}
  const familia = dados.familia || {}
  const motivo = dados.motivo || {}
  const urgencia = dados.urgencia || {}

  const detalhes = caso?.detalhes || ''
  const sintomas = caso?.sintomas || []

  const situacoesEstruturadas = garantirLista(urgencia.situacoes)
  const outraSituacao = limparValor(urgencia.outra_situacao)

  const situacoesLegadas = extrairSituacoesDoResumo(detalhes)

  const situacoes = situacoesEstruturadas.length > 0 || outraSituacao
    ? [
        ...situacoesEstruturadas,
        ...(outraSituacao ? [`Outra situação informada: ${outraSituacao}`] : []),
      ]
    : situacoesLegadas

  const beneficiosSociaisLista = garantirLista(familia.beneficios_sociais)

  return {
    demandaPrincipal:
      limparValor(motivo.demanda_principal) ||
      extrairCampoDoResumo(detalhes, 'Demanda principal') ||
      obterPrimeiroItem(sintomas),

    outraDemanda: limparValor(motivo.outra_demanda),

    urgencia:
      limparValor(urgencia.nivel) ||
      extrairCampoDoResumo(detalhes, 'Nível de urgência informado') ||
      limparValor(caso?.duracao),

    pontuacao: extrairCampoDoResumo(detalhes, 'Pontuação de risco social'),

    telefone:
      limparValor(contato.telefone) ||
      extrairCampoDoResumo(detalhes, 'Telefone para contato'),

    idade:
      limparValor(contato.idade) ||
      extrairCampoDoResumo(detalhes, 'Idade'),

    cartaoSus:
      limparValor(contato.cartao_sus_nis) ||
      extrairCampoDoResumo(detalhes, 'Cartão SUS/NIS'),

    bairroLocalidade:
      limparValor(contato.bairro_localidade) ||
      extrairCampoDoResumo(detalhes, 'Bairro/localidade') ||
      extrairCampoDoResumo(detalhes, 'Endereço/bairro'),

    pontoReferencia:
      limparValor(contato.ponto_referencia) ||
      extrairCampoDoResumo(detalhes, 'Ponto de referência') ||
      extrairCampoDoResumo(detalhes, 'Complemento/ponto de referência'),

    territorioCras:
      limparValor(contato.territorio_cras) ||
      extrairCampoDoResumo(detalhes, 'Território/CRAS') ||
      extrairCampoDoResumo(detalhes, 'Território/CRAS de referência'),

    composicaoFamiliar:
      limparValor(familia.composicao_familiar) ||
      extrairCampoDoResumo(detalhes, 'Composição familiar'),

    rendaFamiliar:
      limparValor(familia.renda_familiar) ||
      extrairCampoDoResumo(detalhes, 'Renda familiar') ||
      extrairCampoDoResumo(detalhes, 'Renda familiar aproximada'),

    beneficiosSociaisLista:
      beneficiosSociaisLista.length > 0
        ? beneficiosSociaisLista
        : garantirLista(extrairCampoDoResumo(detalhes, 'Benefícios sociais')),

    beneficiosSociais:
      beneficiosSociaisLista.length > 0
        ? beneficiosSociaisLista.join(', ')
        : extrairCampoDoResumo(detalhes, 'Benefícios sociais'),

    outrosBeneficios:
      limparValor(familia.outros_beneficios) ||
      extrairCampoDoResumo(detalhes, 'Outros benefícios'),

    situacoes,

    outraSituacao,

    relato:
      limparValor(dados.relato) ||
      extrairBlocoDoResumo(detalhes, 'Descrição do cidadão:'),
  }
}

export function montarDadosAcolhimento({
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
  demandaFinal,
  outraDemanda,
  urgencia,
  situacoesMarcadas,
  outraSituacaoAtiva,
  outrasSituacoes,
  relato,
}) {
  return {
    contato: {
      telefone: limparValor(telefone),
      idade: limparValor(idade),
      cartao_sus_nis: limparValor(cartaoSus),
      bairro_localidade: limparValor(bairroLocalidade),
      ponto_referencia: limparValor(pontoReferencia),
      territorio_cras: limparValor(territorioCras),
    },
    familia: {
      composicao_familiar: limparValor(composicaoFamiliar),
      renda_familiar: limparValor(rendaFamiliar),
      beneficios_sociais: garantirLista(beneficios),
      outros_beneficios: limparValor(outrosBeneficios),
    },
    motivo: {
      demanda_principal: limparValor(demandaFinal || demandaPrincipal),
      outra_demanda: limparValor(outraDemanda),
    },
    urgencia: {
      nivel: limparValor(urgencia),
      situacoes: garantirLista(situacoesMarcadas),
      outra_situacao: outraSituacaoAtiva ? limparValor(outrasSituacoes) : '',
    },
    relato: limparValor(relato),
  }
}

export function montarResumoAcolhimento(dadosAcolhimento, pontuacaoRisco) {
  const contato = dadosAcolhimento?.contato || {}
  const familia = dadosAcolhimento?.familia || {}
  const motivo = dadosAcolhimento?.motivo || {}
  const urgencia = dadosAcolhimento?.urgencia || {}

  const situacoes = garantirLista(urgencia.situacoes)
  const outraSituacao = limparValor(urgencia.outra_situacao)

  const situacoesFinais = [
    ...situacoes,
    ...(outraSituacao ? [`Outra situação informada: ${outraSituacao}`] : []),
  ]

  const beneficios = garantirLista(familia.beneficios_sociais)

  return `
Demanda principal: ${limparValor(motivo.demanda_principal) || 'Não informado'}
Nível de urgência informado: ${limparValor(urgencia.nivel) || 'Não informado'}
Pontuação de risco social: ${pontuacaoRisco ?? 'Não informado'}
Telefone para contato: ${limparValor(contato.telefone) || 'Não informado'}
Idade: ${limparValor(contato.idade) || 'Não informado'}
Cartão SUS/NIS: ${limparValor(contato.cartao_sus_nis) || 'Não informado'}
Bairro/localidade: ${limparValor(contato.bairro_localidade) || 'Não informado'}
Ponto de referência: ${limparValor(contato.ponto_referencia) || 'Não informado'}
Território/CRAS: ${limparValor(contato.territorio_cras) || 'Não informado'}
Composição familiar: ${limparValor(familia.composicao_familiar) || 'Não informado'}
Renda familiar: ${limparValor(familia.renda_familiar) || 'Não informado'}
Benefícios sociais: ${beneficios.length > 0 ? beneficios.join(', ') : 'Não informado'}
Outros benefícios: ${limparValor(familia.outros_beneficios) || 'Não informado'}
Situações marcadas:
${situacoesFinais.length > 0 ? situacoesFinais.map((item) => `- ${item}`).join('\n') : '- Nenhuma situação específica marcada'}
Descrição do cidadão:
${limparValor(dadosAcolhimento?.relato) || 'Não informado'}
`.trim()
}