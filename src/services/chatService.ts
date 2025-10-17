import api from '@/services/api';

const CHAT_PATH = (import.meta.env.VITE_CHAT_ENDPOINT ?? '/chat') as string;

export async function sendChatMessage(message: string): Promise<string> {
  try {
    const res = await api.post(CHAT_PATH, { message }, { withCredentials: true });
    return res.data?.reply ?? 'Sin respuesta';
  } catch (err) {
    // Mantener el error para manejo en el caller
    if (err instanceof Error) throw err;
    throw new Error('Error desconocido al enviar mensaje');
  }
}