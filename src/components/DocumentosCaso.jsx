import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { 
  UploadCloud, FileText, Trash2, ExternalLink, 
  Loader2, X, ShieldCheck, File
} from 'lucide-react'

export default function DocumentosCaso({ casoId, enviadoPorTipo }) {
  const [documentos, setDocumentos] = useState([])
  const [arquivo, setArquivo] = useState(null)
  const [descricao, setDescricao] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState(false)

  const BUCKET = 'documentos-caso'

  useEffect(() => {
    if (!casoId || casoId === 'demo') {
      setDocumentos([])
      setCarregando(false)
      return
    }

    let canal

    const buscarDocumentos = async () => {
      setCarregando(true)

      const { data, error } = await supabase
        .from('documentos_caso')
        .select('*')
        .eq('caso_id', casoId)
        .order('created_at', { ascending: false })

      if (error) {
        alert('Erro ao carregar documentos: ' + error.message)
        setCarregando(false)
        return
      }

      setDocumentos(data || [])
      setCarregando(false)
    }

    buscarDocumentos()

    canal = supabase
      .channel(`documentos_caso_${casoId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documentos_caso',
          filter: `caso_id=eq.${casoId}`,
        },
        () => {
          buscarDocumentos()
        }
      )
      .subscribe()

    return () => {
      if (canal) {
        supabase.removeChannel(canal)
      }
    }
  }, [casoId])

  const limparNomeArquivo = (nome) => {
    return nome
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
  }

  const enviarDocumento = async (e) => {
    e.preventDefault()

    if (!arquivo) {
      alert('Selecione um arquivo antes de enviar.')
      return
    }

    if (!casoId || casoId === 'demo') {
      alert('Cofre digital não está disponível para o caso demonstrativo.')
      return
    }

    setEnviando(true)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      alert('Você precisa estar logado para enviar documentos.')
      setEnviando(false)
      return
    }

    const nomeSeguro = limparNomeArquivo(arquivo.name)
    const caminhoArquivo = `${casoId}/${Date.now()}-${nomeSeguro}`

    const { error: erroUpload } = await supabase.storage
      .from(BUCKET)
      .upload(caminhoArquivo, arquivo)

    if (erroUpload) {
      alert('Erro ao enviar arquivo: ' + erroUpload.message)
      setEnviando(false)
      return
    }

    const { error: erroBanco } = await supabase
      .from('documentos_caso')
      .insert([
        {
          caso_id: casoId,
          enviado_por_id: user.id,
          enviado_por_tipo: enviadoPorTipo,
          nome_arquivo: arquivo.name,
          caminho_arquivo: caminhoArquivo,
          tipo_arquivo: arquivo.type || null,
          tamanho_bytes: arquivo.size || null,
          descricao: descricao.trim() || null,
        }
      ])

    setEnviando(false)

    if (erroBanco) {
      alert('Arquivo enviado, mas houve erro ao registrar no banco: ' + erroBanco.message)
      return
    }

    // Reseta o estado do formulário após envio bem sucedido
    setArquivo(null)
    setDescricao('')
    const inputArquivo = document.getElementById('arquivo-cofre-digital')
    if (inputArquivo) inputArquivo.value = ''
  }

  const abrirDocumento = async (documento) => {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(documento.caminho_arquivo, 60)

    if (error) {
      alert('Erro ao abrir documento: ' + error.message)
      return
    }

    window.open(data.signedUrl, '_blank')
  }

  const excluirDocumento = async (documento) => {
    const confirmar = window.confirm('Confirmar exclusão definitiva deste documento do cofre?')

    if (!confirmar) return

    const { error: erroStorage } = await supabase.storage
      .from(BUCKET)
      .remove([documento.caminho_arquivo])

    if (erroStorage) {
      alert('Erro ao remover arquivo físico: ' + erroStorage.message)
      return
    }

    const { error: erroBanco } = await supabase
      .from('documentos_caso')
      .delete()
      .eq('id', documento.id)

    if (erroBanco) {
      alert('Erro ao remover registro do documento: ' + erroBanco.message)
    }
  }

  // --- Funções Auxiliares de Formatação ---

  const formatarTamanho = (bytes) => {
    if (!bytes) return 'Tamanho desconhecido'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatarData = (data) => {
    if (!data) return ''
    return new Date(data).toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  }

  const obterTextoTipo = (tipo) => {
    if (tipo === 'cidadao') return 'Cidadão'
    if (tipo === 'assistente') return 'Assistente Social'
    return 'Sistema'
  }

  return (
    <div className="space-y-8 h-full flex flex-col">
      
      {/* Formulário de Upload */}
      <form onSubmit={enviarDocumento} className="bg-bg-base border border-border rounded-2xl p-5 md:p-6 shadow-sm shrink-0">
        <h3 className="text-accent text-sm font-bold uppercase tracking-widest mb-5 flex items-center gap-2">
          <UploadCloud size={16} /> Adicionar Documento
        </h3>

        <div className="space-y-5">
          {/* Área de Upload Customizada */}
          <div>
            <label className="block text-text-secondary text-xs font-semibold uppercase tracking-wider mb-2">
              Arquivo
            </label>
            
            <input
              id="arquivo-cofre-digital"
              type="file"
              className="hidden"
              onChange={(e) => setArquivo(e.target.files?.[0] || null)}
            />

            {!arquivo ? (
              <label 
                htmlFor="arquivo-cofre-digital"
                className="flex flex-col items-center justify-center w-full h-32 px-4 border-2 border-dashed border-border rounded-xl bg-bg-surface hover:bg-bg-surface-hover hover:border-accent/50 transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 bg-bg-base rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <UploadCloud size={20} className="text-accent" />
                </div>
                <p className="text-sm font-semibold text-text-primary">Clique para selecionar</p>
                <p className="text-xs text-text-muted mt-1">PDF, JPG, PNG aceitos</p>
              </label>
            ) : (
              <div className="flex items-center justify-between w-full p-4 border border-accent/30 bg-accent/5 rounded-xl">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="p-2 bg-bg-base rounded-lg text-accent shrink-0">
                    <File size={20} />
                  </div>
                  <div className="truncate">
                    <p className="text-sm font-bold text-text-primary truncate">{arquivo.name}</p>
                    <p className="text-xs text-text-secondary">{formatarTamanho(arquivo.size)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setArquivo(null);
                    const input = document.getElementById('arquivo-cofre-digital');
                    if(input) input.value = '';
                  }}
                  className="p-2 text-text-secondary hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors shrink-0"
                  title="Remover arquivo selecionado"
                >
                  <X size={18} />
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-text-secondary text-xs font-semibold uppercase tracking-wider mb-2">
              Descrição
            </label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows="2"
              className="w-full bg-bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text-primary outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 resize-none transition-all"
            ></textarea>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={enviando || !arquivo}
              className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover disabled:bg-border disabled:text-text-muted text-text-on-accent py-3 rounded-xl text-sm font-bold transition-all disabled:shadow-none"
            >
              {enviando ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
              {enviando ? 'Criptografando e enviando...' : 'Salvar no Cofre Digital'}
            </button>
          </div>
        </div>
      </form>

      {/* Lista de Documentos */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-text-secondary" />
            <h3 className="text-text-secondary text-sm font-bold uppercase tracking-widest">
              Arquivos Armazenados
            </h3>
          </div>
          <span className="bg-border text-accent px-2.5 py-0.5 rounded-full text-xs font-bold">
            {documentos.length}
          </span>
        </div>

        {carregando ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="animate-spin text-accent" size={28} />
          </div>
        ) : documentos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-bg-base border border-dashed border-border rounded-2xl">
            <ShieldCheck size={32} className="text-text-muted mb-3 opacity-50" />
            <p className="text-text-primary text-sm font-bold mb-1">Nenhum documento enviado ainda</p>
            <p className="text-text-secondary text-xs">Os documentos enviados aparecerão aqui.</p>
          </div>
        ) : (
          <div className="space-y-3 overflow-y-auto pr-1 custom-scrollbar">
            {documentos.map((documento) => (
              <div 
                key={documento.id} 
                className="bg-bg-base border border-border rounded-2xl p-4 sm:p-5 hover:border-border-hover transition-all group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-bg-surface rounded-lg text-accent shrink-0 border border-border">
                      <FileText size={16} />
                    </div>
                    <p className="text-text-primary text-sm font-bold truncate">
                      {documento.nome_arquivo}
                    </p>
                  </div>

                  {documento.descricao && (
                    <p className="text-text-secondary text-xs leading-relaxed mb-3 pl-11">
                      {documento.descricao}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 pl-11">
                    <p className="text-text-muted text-[10px] font-bold uppercase tracking-wider">
                      Enviado por: <span className="text-text-secondary">{obterTextoTipo(documento.enviado_por_tipo)}</span>
                    </p>
                    <p className="text-text-muted text-[10px] font-bold uppercase tracking-wider">
                      Tamanho: <span className="text-text-secondary">{formatarTamanho(documento.tamanho_bytes)}</span>
                    </p>
                    <p className="text-text-muted text-[10px] font-bold uppercase tracking-wider">
                      Data: <span className="text-text-secondary">{formatarData(documento.created_at)}</span>
                    </p>
                  </div>
                </div>

                <div className="flex sm:flex-col gap-2 shrink-0 pl-11 sm:pl-0">
                  <button
                    onClick={() => abrirDocumento(documento)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-border hover:bg-border-hover text-accent px-4 py-2 rounded-xl text-xs font-bold transition-all"
                  >
                    <ExternalLink size={14} /> Abrir
                  </button>

                  <button
                    onClick={() => excluirDocumento(documento)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 border border-transparent text-red-400/70 hover:text-red-400 hover:bg-red-500/10 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                  >
                    <Trash2 size={14} /> Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}