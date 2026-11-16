// src/pages/AuthCallback.js
import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import toast from 'react-hot-toast';
import { FaInstagram } from 'react-icons/fa';
import { functions } from '../firebase';
import { useAuth } from '../context/AuthContext';

const META_OAUTH_STATE_KEY = 'echobot.meta.oauth.state';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading, refreshUserData } = useAuth();
  const hasRun = useRef(false);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const oauthError = searchParams.get('error');

  useEffect(() => {
    if (loading || hasRun.current) return;
    hasRun.current = true;

    if (oauthError) {
      sessionStorage.removeItem(META_OAUTH_STATE_KEY);
      toast.error('Autorização negada ou cancelada.');
      navigate(user ? '/dashboard' : '/', { replace: true });
      return;
    }

    if (!code) {
      sessionStorage.removeItem(META_OAUTH_STATE_KEY);
      toast.error('Código de autorização não encontrado.');
      navigate(user ? '/dashboard' : '/', { replace: true });
      return;
    }

    const expectedState = sessionStorage.getItem(META_OAUTH_STATE_KEY);
    sessionStorage.removeItem(META_OAUTH_STATE_KEY);
    if (!expectedState || !state || state !== expectedState) {
      toast.error('Não foi possível validar a solicitação de conexão. Tente novamente.');
      navigate(user ? '/dashboard' : '/', { replace: true });
      return;
    }

    if (!user) {
      toast.error('Entre na sua conta antes de conectar o Instagram.');
      navigate('/', { replace: true });
      return;
    }

    const exchange = async () => {
      try {
        const exchangeToken = httpsCallable(functions, 'exchangeToken');
        await exchangeToken({
          code,
          redirectUri: 'https://echobot-2254b.web.app/auth/callback',
        });

        await refreshUserData();
        toast.success('Instagram conectado com sucesso! 🎉');
        navigate('/dashboard', { replace: true });
      } catch (err) {
        console.error('Token exchange error:', err);
        const msg =
          err?.message || 'Erro ao conectar Instagram. Tente novamente.';
        toast.error(msg);
        navigate(user ? '/dashboard' : '/', { replace: true });
      }
    };

    exchange();
  }, [code, loading, navigate, oauthError, refreshUserData, state, user]);

  return (
    <div className="callback-page">
      <div className="callback-card">
        <div className="callback-icon">
          <FaInstagram size={40} />
        </div>
        <div className="spinner-ring" style={{ width: 48, height: 48, borderWidth: 4 }} />
        <h2 className="callback-title">Conectando Instagram...</h2>
        <p className="callback-desc">
          Aguarde enquanto autenticamos sua conta. Isso leva apenas alguns segundos.
        </p>
        <div className="callback-steps">
          <div className="step active">
            <span className="step-dot" />
            Verificando código de autorização
          </div>
          <div className="step">
            <span className="step-dot" />
            Obtendo token de acesso
          </div>
          <div className="step">
            <span className="step-dot" />
            Salvando configurações
          </div>
        </div>
      </div>
    </div>
  );
}
