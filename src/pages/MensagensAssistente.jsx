import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import MensagensCaso from '../components/MensagensCaso'

export default function MensagensAssistente() {
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
      <div className="min-h-screen bg-[#0d1f1a] flex items-center justify-center px-6 py-10 font-sans">
        <div className="text-center animate-fadeUp">
          <div className="w-12 h-12 border-2 border-[#2a6b52] border-t-[#4ab882] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#5a8a72] text-sm">Carregando mensagens do caso...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0d1f1a] px-6 py-10 font-sans">
      <div className="max-w-4xl mx-auto animate-fadeUp">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <p className="text-[#4ab882] text-xs uppercase tracking-wider font-medium mb-2">
              EloSocial
            </p>

            <h1 className="text-[#e8f0ec] text-2xl font-semibold" style={{fontFamily:'Georgia, serif'}}>
              Mensagens do Caso
            </h1>

            <p className="text-[#5a8a72] text-sm mt-1">
              Conversa com {caso?.paciente_nome || 'cidadão não identificado'}.
            </p>
          </div>

          <button
            onClick={() => navigate('/consulta-medica', { state: { idTriagem: caso?.id } })}
            className="border border-[#2a6b52] text-[#4ab882] px-4 py-2 rounded-xl text-xs hover:bg-[#1a3d30] transition-all"
          >
            Voltar ao caso
          </button>
        </div>

        <MensagensCaso
          casoId={caso?.id}
          remetenteTipo="assistente"
          remetenteNome="Assistente Social"
        />
      </div>
    </div>
  )
}