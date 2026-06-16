import { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function MensagensCaso({ casoId, remetenteTipo, remetenteNome }) {
  const [mensagens, setMensagens] = useState([])
  const [texto, setTexto] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState(false)

  const fimDaListaRef = useRef(null)

  useEffect(() => {
    if (!casoId || casoId === 'demo') {
      setMensagens([])
      setCarregando(false)
      return
    }

    let canal

    const buscarMensagens = async () => {
      setCarregando(true)

      const { data, error } = await supabase
        .from('mensagens_caso')
        .select('*')
        .eq('caso_id', casoId)
        .order('created_at', { ascending: true })

      if (error) {
        alert('Erro ao carregar mensagens: ' + error.message)
        setCarregando(false)
        return
      }

      setMensagens(data || [])
      setCarregando(false)
    }

    buscarMensagens()

    canal = supabase
      .channel(`mensagens_caso_${casoId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensagens_caso',
          filter: `caso_id=eq.${casoId}`,
        },
        (payload) => {
          setMensagens((mensagensAtuais) => {
            const jaExiste = mensagensAtuais.some((mensagem) => mensagem.id === payload.new.id)

            if (jaExiste) {
              return mensagensAtuais
            }

            return [...mensagensAtuais, payload.new]
          })
        }
      )
      .subscribe()

    return () => {
      if (canal) {
        supabase.removeChannel(canal)
      }
    }
  }, [casoId])

  useEffect(() => {
    fimDaListaRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  const enviarMensagem = async (e) => {
    e.preventDefault()

    const textoLimpo = texto.trim()

    if (!textoLimpo) return

    if (!casoId || casoId === 'demo') {
      alert('Mensagens não estão disponíveis para o caso demonstrativo.')
      return
    }

    setEnviando(true)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      alert('Você precisa estar logado para enviar mensagens.')
      setEnviando(false)
      return
    }

    const { data, error } = await supabase
      .from('mensagens_caso')
      .insert([
        {
          caso_id: casoId,
          remetente_id: user.id,
          remetente_nome: remetenteNome || 'Usuário',
          remetente_tipo: remetenteTipo,
          texto: textoLimpo,
        }
      ])
      .select()
      .single()

    setEnviando(false)

    if (error) {
      alert('Erro ao enviar mensagem: ' + error.message)
      return
    }

    setTexto('')

    if (data) {
      setMensagens((mensagensAtuais) => {
        const jaExiste = mensagensAtuais.some((mensagem) => mensagem.id === data.id)

        if (jaExiste) {
          return mensagensAtuais
        }

        return [...mensagensAtuais, data]
      })
    }
  }

  const formatarData = (data) => {
    if (!data) return ''

    return new Date(data).toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  }

  const obterNomeTipo = (tipo) => {
    if (tipo === 'assistente') return 'Assistente Social'
    if (tipo === 'cidadao') return 'Cidadão'
    return 'Usuário'
  }

  return (
    <div className="bg-[#111f1a] border border-[#1e3b2e] rounded-3xl p-6">
      <div className="mb-5">
        <h3 className="text-[#4ab882] text-xs font-bold uppercase tracking-widest mb-2">
          Mensagens do caso
        </h3>

        <p className="text-[#5a8a72] text-sm leading-relaxed">
          Converse com a outra parte e mantenha o histórico salvo dentro deste caso social.
        </p>
      </div>

      <div className="bg-[#0d1f1a] border border-[#1e3b2e] rounded-2xl p-4 h-80 overflow-y-auto mb-4">
        {carregando && (
          <p className="text-[#5a8a72] text-sm text-center mt-24">
            Carregando mensagens...
          </p>
        )}

        {!carregando && mensagens.length === 0 && (
          <div className="text-center mt-20">
            <p className="text-[#c8e0d4] text-sm font-medium mb-1">
              Nenhuma mensagem ainda
            </p>
            <p className="text-[#5a8a72] text-xs">
              Envie a primeira mensagem para iniciar o histórico do caso.
            </p>
          </div>
        )}

        {!carregando && mensagens.map((mensagem) => {
          const minhaMensagem = mensagem.remetente_tipo === remetenteTipo

          return (
            <div
              key={mensagem.id}
              className={`mb-4 flex ${minhaMensagem ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 border ${
                  minhaMensagem
                    ? 'bg-[#1e7a52] border-[#2a9162] text-white'
                    : 'bg-[#111f1a] border-[#1e3b2e] text-[#c8e0d4]'
                }`}
              >
                <div className="flex items-center justify-between gap-4 mb-1">
                  <p className={`text-[10px] uppercase tracking-wider font-bold ${
                    minhaMensagem ? 'text-[#d8f5e8]' : 'text-[#4ab882]'
                  }`}>
                    {mensagem.remetente_nome || obterNomeTipo(mensagem.remetente_tipo)}
                  </p>

                  <p className={`text-[10px] ${
                    minhaMensagem ? 'text-[#d8f5e8]' : 'text-[#5a8a72]'
                  }`}>
                    {formatarData(mensagem.created_at)}
                  </p>
                </div>

                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {mensagem.texto}
                </p>
              </div>
            </div>
          )
        })}

        <div ref={fimDaListaRef}></div>
      </div>

      <form onSubmit={enviarMensagem} className="flex flex-col sm:flex-row gap-3">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows="2"
          placeholder="Digite uma mensagem..."
          className="flex-1 bg-[#0d1f1a] border border-[#1e3b2e] rounded-xl px-4 py-3 text-[#c8e0d4] text-sm outline-none focus:border-[#2a9162] resize-none"
        ></textarea>

        <button
          type="submit"
          disabled={enviando || !texto.trim()}
          className="bg-[#1e7a52] hover:bg-[#22905f] disabled:bg-[#1a3330] disabled:text-[#4a7a60] text-[#e8f5ee] px-6 py-3 rounded-xl text-sm font-medium transition-all"
        >
          {enviando ? 'Enviando...' : 'Enviar'}
        </button>
      </form>
    </div>
  )
}