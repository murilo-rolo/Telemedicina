import { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'
import { Send, MessageSquare, Loader2 } from 'lucide-react'

export default function MensagensCaso({ casoId, remetenteTipo, remetenteNome, modo }) {
  const [mensagens, setMensagens] = useState([])
  const [texto, setTexto] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState(false)

  const fimDaListaRef = useRef(null)

  const remetenteTipoFinal =
    remetenteTipo || (modo === 'assistente' ? 'assistente' : 'cidadao')

  const remetenteNomeFinal =
    remetenteNome ||
    (remetenteTipoFinal === 'assistente' ? 'Assistente Social' : 'Cidadão')

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
          remetente_nome: remetenteNomeFinal,
          remetente_tipo: remetenteTipoFinal,
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
    <div className="flex flex-col h-full w-full bg-transparent">
      
      {/* Área de rolagem do chat */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#050A08]">
        
        {carregando && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-[#7A9C8D]">
            <Loader2 className="animate-spin text-[#4ade80]" size={28} />
            <p className="text-sm font-medium">Sincronizando histórico...</p>
          </div>
        )}

        {!carregando && mensagens.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center mt-10 opacity-70">
            <div className="w-16 h-16 bg-[#11211C] rounded-full flex items-center justify-center mb-4 border border-[#1A332A]">
              <MessageSquare size={24} className="text-[#4ade80]" />
            </div>
            <p className="text-[#E2E8F0] text-sm font-bold mb-1">
              Nenhuma mensagem trocada
            </p>
            <p className="text-[#7A9C8D] text-xs">
              O histórico deste caso está vazio.
            </p>
          </div>
        )}

        {!carregando && mensagens.map((mensagem) => {
          const minhaMensagem = mensagem.remetente_tipo === remetenteTipoFinal

          return (
            <div
              key={mensagem.id}
              className={`flex w-full ${minhaMensagem ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[75%] px-4 py-3 shadow-sm ${
                  minhaMensagem
                    ? 'bg-[#4ade80] text-[#0B1511] rounded-2xl rounded-tr-sm'
                    : 'bg-[#1A332A] border border-[#24473B] text-[#E2E8F0] rounded-2xl rounded-tl-sm'
                }`}
              >
                <div className="flex items-center justify-between gap-4 mb-1.5">
                  <p className={`text-[10px] uppercase tracking-wider font-bold ${
                    minhaMensagem ? 'text-[#06301A]' : 'text-[#4ade80]'
                  }`}>
                    {mensagem.remetente_nome || obterNomeTipo(mensagem.remetente_tipo)}
                  </p>

                  <p className={`text-[10px] font-medium ${
                    minhaMensagem ? 'text-[#06301A]/70' : 'text-[#7A9C8D]'
                  }`}>
                    {formatarData(mensagem.created_at)}
                  </p>
                </div>

                <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">
                  {mensagem.texto}
                </p>
              </div>
            </div>
          )
        })}

        <div ref={fimDaListaRef}></div>
      </div>

      {/* Área de Input (Fixo na parte inferior) */}
      <div className="p-4 bg-[#11211C] border-t border-[#1A332A]">
        <form onSubmit={enviarMensagem} className="flex gap-3 max-w-4xl mx-auto items-end">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows="2"
            placeholder="Escreva sua mensagem..."
            className="flex-1 bg-[#0B1511] border border-[#1A332A] rounded-xl px-4 py-3 text-sm text-[#E2E8F0] placeholder-[#4A6B5C] outline-none focus:border-[#4ade80]/50 focus:ring-1 focus:ring-[#4ade80]/50 resize-none transition-all"
            onKeyDown={(e) => {
              // Permite enviar com "Enter" e pular linha com "Shift + Enter"
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                enviarMensagem(e)
              }
            }}
          ></textarea>

          <button
            type="submit"
            disabled={enviando || !texto.trim()}
            className="h-[46px] flex items-center justify-center gap-2 bg-[#4ade80] hover:bg-[#22c55e] disabled:bg-[#1A332A] disabled:text-[#4A6B5C] text-[#0B1511] px-5 rounded-xl text-sm font-bold transition-all shadow-[0_0_15px_rgba(74,222,128,0.1)] hover:shadow-[0_0_20px_rgba(74,222,128,0.2)] disabled:shadow-none mb-[2px]"
          >
            {enviando ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            <span className="hidden sm:inline">{enviando ? 'Enviando...' : 'Enviar'}</span>
          </button>
        </form>
      </div>
    </div>
  )
}