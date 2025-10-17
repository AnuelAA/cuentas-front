import api from '@/services/api';

const CHAT_PATH_TEMPLATE = (import.meta.env.VITE_CHAT_ENDPOINT ?? '/users/{userId}/chat') as string;

export async function sendChatMessage(userId: string | number, message: string): Promise<string> {
  if (!userId) throw new Error('userId requerido para enviar mensaje al chat');
  const path = CHAT_PATH_TEMPLATE.includes('{userId}')
    ? CHAT_PATH_TEMPLATE.replace('{userId}', String(userId))
    : `/users/${userId}/chat`;
  try {
    const res = await api.post(path, { message }, { withCredentials: true });
    return res.data?.reply ?? res.data?.answer ?? 'Sin respuesta';
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error('Error desconocido al enviar mensaje');
  }
}