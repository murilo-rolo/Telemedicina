import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { 
  Plus, Calendar, User, Clock, 
  PlayCircle, CheckCircle, Trash2, 
  ListTodo, Loader2, AlignLeft
} from 'lucide-react'

export default function PlanoAcaoCaso({ casoId, modo }) {
  const [itens, setItens] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [responsavel, setResponsavel] = useState('cidadao')
  const [prazo, setPrazo] = useState('')

  const podeCriar = modo === 'assistente'

  useEffect(() => {
    if (!casoId || casoId === 'demo') {
      setItens([])
      setCarregando(false)
      return
    }

    let canal

    const buscarItens = async () => {
      setCarregando(true)

      const { data, error } = await supabase
        .from('plano_acao_itens')
        .select('*')
        .eq('caso_id', casoId)
        .order('created_at', { ascending: true })

      if (error) {
        alert('Erro ao carregar plano de ação: ' + error.message)
        setCarregando(false)
        return
      }

      setItens(data || [])
      setCarregando(false)
    }

    buscarItens()

    canal = supabase
      .channel(`plano_acao_${casoId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'plano_acao_itens',
          filter: `caso_id=eq.${casoId}`,
        },
        () => {
          buscarItens()
        }
      )
      .subscribe()

    return () => {
      if (canal) {
        supabase.removeChannel(canal)
      }
    }
  }, [casoId])

  const criarItem = async (e) => {
    e.preventDefault()

    const tituloLimpo = titulo.trim()

    if (!tituloLimpo) {
      alert('O título é obrigatório.')
      return
    }

    setSalvando(true)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      alert('Sessão inválida.')
      setSalvando(false)
      return
    }

    const { error } = await supabase
      .from('plano_acao_itens')
      .insert([
        {
          caso_id: casoId,
          titulo: tituloLimpo,
          descricao: descricao.trim() || null,
          responsavel,
          prazo: prazo || null,
          criado_por_id: user.id,
          criado_por_tipo: 'assistente',
          status: 'pendente',
        }
      ])

    setSalvando(false)

    if (error) {
      alert('Erro ao criar tarefa: ' + error.message)
      return
    }

    setTitulo('')
    setDescricao('')
    setResponsavel('cidadao')
    setPrazo('')
  }

  const atualizarStatus = async (item, novoStatus) => {
    const { error } = await supabase
      .from('plano_acao_itens')
      .update({
        status: novoStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.id)

    if (error) {
      alert('Erro ao atualizar status: ' + error.message)
    }
  }

  const excluirItem = async (item) => {
    const confirmar = window.confirm('Confirmar exclusão desta tarefa?')

    if (!confirmar) return

    const { error } = await supabase
      .from('plano_acao_itens')
      .delete()
      .eq('id', item.id)

    if (error) {
      alert('Erro ao excluir: ' + error.message)
    }
  }

  const formatarPrazo = (data) => {
    if (!data) return 'Não definido'
    return new Date(data + 'T00:00:00').toLocaleDateString('pt-BR')
  }

  const obterTextoStatus = (status) => {
    if (status === 'pendente') return 'Pendente'
    if (status === 'em_andamento') return 'Em andamento'
    if (status === 'concluido') return 'Concluído'
    return 'Indefinido'
  }

  const obterClasseStatus = (status) => {
    if (status === 'pendente') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
    if (status === 'em_andamento') return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    if (status === 'concluido') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
  }

  const obterTextoResponsavel = (valor) => {
    if (valor === 'cidadao') return 'Cidadão'
    if (valor === 'assistente') return 'Assistente Social'
    if (valor === 'ambos') return 'Equipe Conjunta'
    return 'Indefinido'
  }

  return (
    <div className="space-y-8 h-full flex flex-col">
      
      {podeCriar && (
        <form onSubmit={criarItem} className="bg-bg-base border border-border rounded-2xl p-5 md:p-6 shadow-sm shrink-0">
          <div className="space-y-4">
            <div>
              <label className="block text-text-secondary text-xs font-semibold uppercase tracking-wider mb-2">
                Título
              </label>
              <input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className="w-full bg-bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text-primary outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all"
              />
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

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-text-secondary text-xs font-semibold uppercase tracking-wider mb-2">
                  Responsável
                </label>
                <select
                  value={responsavel}
                  onChange={(e) => setResponsavel(e.target.value)}
                  className="w-full bg-bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text-primary outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all appearance-none"
                >
                  <option value="cidadao">Cidadão</option>
                  <option value="assistente">Assistente Social</option>
                  <option value="ambos">Equipe Conjunta</option>
                </select>
              </div>

              <div>
                <label className="block text-text-secondary text-xs font-semibold uppercase tracking-wider mb-2">
                  Prazo
                </label>
                <input
                  type="date"
                  value={prazo}
                  onChange={(e) => setPrazo(e.target.value)}
                  className="w-full bg-bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text-primary outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all [color-scheme:dark]"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={salvando || !titulo.trim()}
                className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover disabled:bg-border disabled:text-text-muted text-text-on-accent py-3 rounded-xl text-sm font-bold transition-all disabled:shadow-none"
              >
                {salvando ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                {salvando ? 'Processando...' : 'Registrar Tarefa'}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div className="flex items-center gap-2">
            <ListTodo size={18} className="text-text-secondary" />
            <h3 className="text-text-secondary text-sm font-bold uppercase tracking-widest">
              Tarefas
            </h3>
          </div>
          <span className="bg-border text-accent px-2.5 py-0.5 rounded-full text-xs font-bold">
            {itens.length}
          </span>
        </div>

        {carregando ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="animate-spin text-accent" size={28} />
          </div>
        ) : itens.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-bg-base border border-dashed border-border rounded-2xl">
            <p className="text-text-secondary text-sm font-medium">Nenhum registro encontrado.</p>
          </div>
        ) : (
          <div className="space-y-3 overflow-y-auto pr-1 custom-scrollbar">
            {itens.map((item) => (
              <div 
                key={item.id} 
                className="bg-bg-base border border-border rounded-2xl p-5 hover:border-border-hover transition-all group"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                  <h4 className="text-text-primary text-base font-bold leading-tight">
                    {item.titulo}
                  </h4>
                  <span className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border tracking-wide uppercase ${obterClasseStatus(item.status)}`}>
                    {obterTextoStatus(item.status)}
                  </span>
                </div>

                {item.descricao && (
                  <div className="flex items-start gap-2 mb-4 bg-bg-surface p-3 rounded-xl border border-border">
                    <AlignLeft size={14} className="text-text-muted shrink-0 mt-0.5" />
                    <p className="text-text-secondary text-sm leading-relaxed">
                      {item.descricao}
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap gap-4 mb-5">
                  <div className="flex items-center gap-1.5 text-text-secondary">
                    <User size={14} />
                    <p className="text-xs font-medium">
                      <span className="text-text-primary">{obterTextoResponsavel(item.responsavel)}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-text-secondary">
                    <Calendar size={14} />
                    <p className="text-xs font-medium">
                      <span className="text-text-primary">{formatarPrazo(item.prazo)}</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-border">
                  <button
                    onClick={() => atualizarStatus(item, 'pendente')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      item.status === 'pendente' 
                        ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 pointer-events-none' 
                        : 'text-text-secondary hover:bg-bg-surface hover:text-text-primary border border-transparent'
                    }`}
                  >
                    <Clock size={14} /> Pendente
                  </button>

                  <button
                    onClick={() => atualizarStatus(item, 'em_andamento')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      item.status === 'em_andamento' 
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 pointer-events-none' 
                        : 'text-text-secondary hover:bg-bg-surface hover:text-text-primary border border-transparent'
                    }`}
                  >
                    <PlayCircle size={14} /> Em Andamento
                  </button>

                  <button
                    onClick={() => atualizarStatus(item, 'concluido')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      item.status === 'concluido' 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 pointer-events-none' 
                        : 'text-text-secondary hover:bg-bg-surface hover:text-text-primary border border-transparent'
                    }`}
                  >
                    <CheckCircle size={14} /> Concluído
                  </button>

                  {podeCriar && (
                    <button
                      onClick={() => excluirItem(item)}
                      className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-red-400/70 hover:text-red-400 hover:bg-red-500/10 border border-transparent transition-all"
                    >
                      <Trash2 size={14} /> <span className="hidden sm:inline">Excluir</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}