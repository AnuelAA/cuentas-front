import api from '@/services/api';

export async function sendChatMessage(userId: string | number, message: string): Promise<string> {
  if (!userId) throw new Error('userId requerido para enviar mensaje al chat');
  const path = (process.env.VITE_CHAT_ENDPOINT ?? '/users/{userId}/chat').toString().includes('{userId}')
    ? (process.env.VITE_CHAT_ENDPOINT ?? '/users/{userId}/chat').toString().replace('{userId}', String(userId))
    : `/users/${userId}/chat`;

  try {
    // timeout local de 30 segundos (30000 ms)
    const res = await api.post(path, { message }, { withCredentials: true, timeout: 30000 });
    return res.data?.reply ?? res.data?.answer ?? 'Sin respuesta';
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error('Error desconocido al enviar mensaje');
  }
}