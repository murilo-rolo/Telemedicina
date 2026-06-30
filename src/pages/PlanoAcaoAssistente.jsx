import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import PlanoAcaoCaso from '../components/PlanoAcaoCaso'
import { Briefcase, ChevronLeft, User } from 'lucide-react'

export default function PlanoAcaoAssistente() {
  const navigate = useNavigate()
  const location = useLocation()

  const idTriagem = location.state?.idTriagem || sessionStorage.getItem('elosocial_caso_atual') || null

  const [caso, setCaso] = useState(null)
  const [carregando, setCarregando] = useState(true)

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
        alert('Erro ao carregar caso: ' + error.message)
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

  if (carregando) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-border border-t-accent rounded-full animate-spin"></div>
          <p className="text-text-secondary text-sm font-medium tracking-wide">Carregando plano de ação...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-base text-slate-200 font-sans selection:bg-accent/30 flex flex-col">
      
      {/* Header Fixo e Minimalista */}
      <header className="sticky top-0 z-10 bg-bg-base/80 backdrop-blur-md border-b border-border px-6 py-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/consulta-medica', { state: { idTriagem: caso?.id } })}
              className="p-2 -ml-2 rounded-xl text-text-secondary hover:text-white hover:bg-bg-surface transition-colors"
              title="Voltar ao caso"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <p className="text-accent text-[10px] uppercase tracking-widest font-bold mb-0.5 flex items-center gap-1.5">
                <Briefcase size={12} />
                Plano de Ação
              </p>
              <h1 className="text-xl font-bold tracking-tight text-white">
                {caso?.paciente_nome || 'Cidadão não identificado'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-bg-surface border border-border px-3 py-1.5 rounded-full shadow-sm">
            <User size={14} className="text-text-secondary" />
            <span className="text-xs font-medium text-text-secondary">Assistente Social</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-6 flex flex-col">
        <div className="bg-bg-surface border border-border rounded-3xl p-6 md:p-8 shadow-xl flex-1">
          <PlanoAcaoCaso
            casoId={caso?.id}
            modo="assistente"
          />
        </div>
      </main>
    </div>
  )
}