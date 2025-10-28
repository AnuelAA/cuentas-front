import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { login as apiLogin } from '@/services/api';
import type { User, LoginRequest, LoginResponse } from '@/types/api';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in from localStorage
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    const storedUser = localStorage.getItem('user');
    
    if (token && userId && storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        // Asegurarnos de que el userId coincida
        if (userData.userId === Number(userId)) {
          setUser(userData);
        } else {
          // Limpiar datos inconsistentes
          localStorage.clear();
        }
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.clear();
      }
    } else if (token && userId) {
      // Tenemos token pero no datos del usuario, crear objeto básico
      setUser({
        userId: Number(userId),
        email: localStorage.getItem('email') || '',
        name: localStorage.getItem('name') || '',
      } as User);
    } else {
      // No hay token, limpiar todo
      localStorage.clear();
    }
    setIsLoading(false);
  }, []);

  const login = async (credentials: LoginRequest) => {
    try {
      setIsLoading(true);
      const loginData: LoginResponse = await apiLogin(credentials);
      
      // Crear objeto usuario desde la respuesta del login
      const userData: User = {
        userId: loginData.userId,
        email: loginData.email,
        name: loginData.name,
      };
      
      // Guardar datos del usuario
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('email', loginData.email);
      localStorage.setItem('name', loginData.name);
      
      toast.success(`¡Bienvenido ${userData.name || userData.email}!`);
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error?.message || 'Usuario o contraseña incorrectos';
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.clear();
    toast.success('Sesión cerrada');
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
