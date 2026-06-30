import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import MensagensCaso from '../components/MensagensCaso'

export default function Mensagens() {
  const navigate = useNavigate()

  const [caso, setCaso] = useState(null)
  const [nomeUsuario, setNomeUsuario] = useState('')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    const buscarCaso = async () => {
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

      setNomeUsuario(perfil?.nome || user.email || 'Cidadão')

      const { data, error } = await supabase
        .from('triagens')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['pendente', 'em_atendimento', 'em_acompanhamento', 'concluido'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        alert('Erro ao carregar caso: ' + error.message)
        setCarregando(false)
        return
      }

      if (!data) {
        navigate('/triagem')
        return
      }

      setCaso(data)
      setCarregando(false)
    }

    buscarCaso()
  }, [navigate])

  if (carregando) {
    return (
      <div className="min-h-screen bg-citz-bg-base flex items-center justify-center px-6 py-10 font-sans">
        <div className="text-center animate-fadeUp">
          <div className="w-12 h-12 border-2 border-citz-border border-t-citz-accent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-citz-text-secondary text-sm">Carregando mensagens...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-citz-bg-base px-6 py-10 font-sans">
      <div className="max-w-4xl mx-auto animate-fadeUp">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <p className="text-citz-accent text-xs uppercase tracking-wider font-medium mb-2">
              EloSocial
            </p>

            <h1 className="text-citz-text-primary text-2xl font-semibold" style={{fontFamily:'Georgia, serif'}}>
              Mensagens
            </h1>

            <p className="text-citz-text-secondary text-sm mt-1">
              Converse com a equipe de assistência social sobre o seu caso.
            </p>
          </div>

          <button
            onClick={() => navigate('/acompanhamento')}
            className="border border-citz-border text-citz-accent px-4 py-2 rounded-xl text-xs hover:bg-citz-bg-hover transition-all"
          >
            Voltar ao acompanhamento
          </button>
        </div>

        <MensagensCaso
          casoId={caso?.id}
          remetenteTipo="cidadao"
          remetenteNome={nomeUsuario || 'Cidadão'}
        />
      </div>
    </div>
  )
}