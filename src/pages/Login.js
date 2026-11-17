// src/pages/Login.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FaGoogle, FaInstagram, FaRobot, FaBolt, FaChartLine } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

const features = [
  {
    icon: <FaBolt size={20} />,
    title: 'Resposta automática por palavra-chave',
    desc: 'Configure gatilhos e responda DMs instantaneamente.',
  },
  {
    icon: <FaInstagram size={20} />,
    title: 'Envio de DMs em segundos',
    desc: 'Alcance seus seguidores de forma rápida e personalizada.',
  },
  {
    icon: <FaChartLine size={20} />,
    title: 'Métricas em tempo real',
    desc: 'Acompanhe o desempenho das suas campanhas ao vivo.',
  },
];

export default function Login() {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      if (error.code === 'auth/popup-closed-by-user') {
        toast('Login cancelado.', { icon: 'ℹ️' });
      } else if (error.code === 'auth/popup-blocked') {
        toast.error('Popup bloqueado. Permita popups neste site e tente novamente.');
      } else {
        toast.error('Erro ao fazer login. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Background blobs */}
      <div className="bg-blob bg-blob-1" />
      <div className="bg-blob bg-blob-2" />
      <div className="bg-blob bg-blob-3" />

      <div className="login-container">
        {/* Left panel - Branding */}
        <div className="login-brand-panel">
          <div className="brand-logo-wrap">
            <div className="brand-icon">
              <FaRobot size={36} color="#fff" />
            </div>
            <h1 className="brand-name">EchoBot</h1>
          </div>
          <h2 className="brand-tagline">
            Automatize seus <span className="gradient-text">Directs</span> no Instagram
          </h2>
          <p className="brand-desc">
            Crie campanhas inteligentes, responda automaticamente por palavra-chave e escale seu engajamento sem esforço.
          </p>

          <div className="features-list">
            {features.map((f, i) => (
              <div key={i} className="feature-item">
                <div className="feature-icon">{f.icon}</div>
                <div className="feature-text">
                  <strong>{f.title}</strong>
                  <span>{f.desc}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="login-brand-footer">
            <div className="instagram-badge">
              <FaInstagram size={16} />
              <span>Integração oficial com Meta</span>
            </div>
          </div>
        </div>

        {/* Right panel - Login form */}
        <div className="login-form-panel">
          <div className="login-card">
            <div className="login-card-header">
              <div className="login-card-logo">
                <FaRobot size={28} color="#fff" />
              </div>
              <h3 className="login-card-title">Bem-vindo ao EchoBot</h3>
              <p className="login-card-subtitle">
                Entre com sua conta Google para começar a automatizar.
              </p>
            </div>

            <div className="login-card-body">
              <button
                className={`btn-google ${isLoading ? 'loading' : ''}`}
                onClick={handleGoogleLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="btn-spinner" />
                    Entrando...
                  </>
                ) : (
                  <>
                    <FaGoogle size={18} />
                    Entrar com Google
                  </>
                )}
              </button>

              <div className="login-divider">
                <span>ou continue para explorar</span>
              </div>

              <div className="login-ig-preview">
                <div className="ig-gradient-bar" />
                <p>
                  <FaInstagram size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                  Após entrar, conecte sua conta do Instagram e crie sua primeira campanha em minutos.
                </p>
              </div>
            </div>

            <div className="login-card-footer">
              <p>
                Ao continuar, você concorda com nossos{' '}
                <Link to="/termos" target="_blank" className="link-inline">
                  Termos de Uso
                </Link>{' '}
                e{' '}
                <Link to="/privacidade" target="_blank" className="link-inline">
                  Política de Privacidade
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
