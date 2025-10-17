// file: `src/components/ChatBot/ChatBot.tsx`
import React, { useEffect, useRef, useState } from 'react';
import { sendChatMessage } from '@/services/chatService';
import './chatBot.css';

type Message = {
  id: string;
  role: 'user' | 'bot';
  text: string;
  ts: number;
};

const STORAGE_KEY = 'app_chat_messages_v1';

const ChatBot: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) as Message[] : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const pushMessage = (m: Message) => setMessages(prev => [...prev, m]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    const userMsg: Message = { id: `u_${Date.now()}`, role: 'user', text, ts: Date.now() };
    pushMessage(userMsg);
    setInput('');
    setSending(true);
    try {
      const reply = await sendChatMessage(text);
      const botMsg: Message = { id: `b_${Date.now()}`, role: 'bot', text: reply, ts: Date.now() };
      pushMessage(botMsg);
    } catch (err) {
      const errMsg: Message = { id: `err_${Date.now()}`, role: 'bot', text: 'Error al conectar con el servidor', ts: Date.now() };
      pushMessage(errMsg);
      console.error('chat send error', err);
    } finally {
      setSending(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chatbot-wrapper">
      <button
        aria-label="Abrir JoseliyoIA"
        className={`chatbot-toggle ${open ? 'open' : ''}`}
        onClick={() => setOpen(v => !v)}
      >
        {open ? '×' : 'JoseliyoIA'}
      </button>

      {open && (
        <div className="chatbot-panel" role="dialog" aria-modal="true">
          <div className="chatbot-header">
            <div>Joseliyo IA al rescate</div>
            <button className="chatbot-close" onClick={() => setOpen(false)}>×</button>
          </div>

          <div className="chatbot-messages" data-testid="chat-messages">
            {messages.length === 0 && (
              <div className="chatbot-empty">Escribe algo para comenzar la conversación.</div>
            )}
            {messages.map(m => (
              <div key={m.id} className={`chatbot-msg ${m.role}`}>
                <div className="chatbot-msg-text">{m.text}</div>
                <div className="chatbot-msg-ts">{new Date(m.ts).toLocaleTimeString()}</div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="chatbot-input">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Escribe tu mensaje..."
              disabled={sending}
            />
            <button onClick={handleSend} disabled={sending || input.trim() === ''}>
              {sending ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatBot;