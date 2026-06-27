import { supabase } from '../supabaseClient'

export async function obterSalaDaily(casoId) {
  if (!casoId) {
    throw new Error('Caso não informado.')
  }

  const { data, error } = await supabase.functions.invoke('criar-sala-daily', {
    body: { casoId },
  })

  if (error) {
    throw new Error(error.message || 'Não foi possível criar a sala Daily.')
  }

  if (data?.error) {
    throw new Error(data.error)
  }

  if (!data?.daily_room_url) {
    throw new Error('A função não retornou a URL da sala Daily.')
  }

  return {
    url: data.daily_room_url,
    name: data.daily_room_name,
    expiresAt: data.daily_room_expires_at,
  }
}