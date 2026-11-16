// src/pages/Dashboard.js
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  FaRobot,
  FaInstagram,
  FaSignOutAlt,
  FaPlus,
  FaCheckCircle,
  FaTimesCircle,
  FaPaperPlane,
  FaUsers,
  FaBullhorn,
  FaUnlink,
} from 'react-icons/fa';
import { httpsCallable } from 'firebase/functions';
import { useAuth } from '../context/AuthContext';
import { functions } from '../firebase';
import CampaignList from '../components/CampaignList';
import CampaignModal from '../components/CampaignModal';
import StatsCard from '../components/StatsCard';

const META_APP_ID = '2571540876656566';
const META_CONFIG_ID = '4750108781977729';
const META_REDIRECT_URI = 'https://echobot-2254b.web.app/auth/callback';
const META_OAUTH_STATE_KEY = 'echobot.meta.oauth.state';

function createMetaLoginUrl() {
  const stateBytes = new Uint8Array(32);
  window.crypto.getRandomValues(stateBytes);
  const state = Array.from(stateBytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  sessionStorage.setItem(META_OAUTH_STATE_KEY, state);

  const loginUrl = new URL('https://www.facebook.com/dialog/oauth');
  loginUrl.search = new URLSearchParams({
    client_id: META_APP_ID,
    config_id: META_CONFIG_ID,
    display: 'popup',
    override_default_response_type: 'true',
    redirect_uri: META_REDIRECT_URI,
    response_type: 'code',
    state,
    prompt: 'login',
  }).toString();

  return loginUrl.toString();
}

export default function Dashboard() {
  const { user, userData, logout, refreshUserData } = useAuth();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [totalDms, setTotalDms] = useState(0);
  const [totalCampaigns, setTotalCampaigns] = useState(0);
  const [activeCampaigns, setActiveCampaigns] = useState(0);
  const [disconnecting, setDisconnecting] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/', { replace: true });
    } catch {
      toast.error('Erro ao sair. Tente novamente.');
    }
  };

  const handleConnectInstagram = () => {
    try {
      window.location.assign(createMetaLoginUrl());
    } catch (error) {
      console.error('Unable to start Meta login:', error);
      toast.error('Não foi possível iniciar a conexão com o Instagram.');
    }
  };

  const handleDisconnectInstagram = async () => {
    if (!window.confirm('Tem certeza que deseja desconectar o Instagram?')) return;
    setDisconnecting(true);
    try {
      const disconnectInstagram = httpsCallable(functions, 'disconnectInstagram');
      await disconnectInstagram({});
      await refreshUserData();
      toast.success('Instagram desconectado com sucesso.');
    } catch {
      toast.error('Erro ao desconectar. Tente novamente.');
    } finally {
      setDisconnecting(false);
    }
  };

  const handleNewCampaign = () => {
    setEditingCampaign(null);
    setShowModal(true);
  };

  const handleEditCampaign = useCallback((campaign) => {
    setEditingCampaign(campaign);
    setShowModal(true);
  }, []);

  const handleStatsUpdate = useCallback((dms, campaigns, active) => {
    setTotalDms(dms);
    setTotalCampaigns(campaigns);
    setActiveCampaigns(active);
  }, []);

  const isConnected =
    userData?.instagramConnected === true ||
    Boolean(userData?.instagramAccountId);

  return (
    <div className="dashboard-layout">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-inner">
          <div className="header-logo">
            <div className="header-logo-icon">
              <FaRobot size={22} color="#fff" />
            </div>
            <span className="header-logo-text">EchoBot</span>
          </div>

          <div className="header-actions">
            <div className="user-info">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName}
                  className="user-avatar"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="user-avatar-placeholder">
                  {user?.displayName?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <div className="user-details">
                <span className="user-name">{user?.displayName || 'Usuário'}</span>
                <span className="user-email">{user?.email}</span>
              </div>
            </div>

            <button className="btn-icon btn-logout" onClick={handleLogout} title="Sair">
              <FaSignOutAlt size={16} />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="dashboard-main">
        <div className="dashboard-content">

          {/* Page title */}
          <div className="page-header">
            <div>
              <h1 className="page-title">Dashboard</h1>
              <p className="page-subtitle">
                Gerencie suas campanhas de DM e acompanhe os resultados.
              </p>
            </div>
            <button className="btn-primary" onClick={handleNewCampaign}>
              <FaPlus size={14} />
              Nova Campanha
            </button>
          </div>

          {/* Stats cards */}
          <div className="stats-grid">
            <StatsCard
              title="DMs Enviados"
              value={totalDms.toLocaleString('pt-BR')}
              icon={<FaPaperPlane size={22} />}
              color="indigo"
            />
            <StatsCard
              title="Total de Campanhas"
              value={totalCampaigns}
              icon={<FaBullhorn size={22} />}
              color="purple"
            />
            <StatsCard
              title="Campanhas Ativas"
              value={activeCampaigns}
              icon={<FaUsers size={22} />}
              color="pink"
            />
          </div>

          {/* Instagram Connection Card */}
          <div className={`instagram-card ${isConnected ? 'connected' : ''}`}>
            <div className="instagram-card-content">
              <div className="instagram-card-left">
                <div className={`instagram-card-icon ${isConnected ? 'connected' : ''}`}>
                  <FaInstagram size={28} />
                </div>
                <div className="instagram-card-info">
                  <h3 className="instagram-card-title">
                    {isConnected ? 'Instagram Conectado' : 'Conectar Instagram'}
                  </h3>
                  {isConnected ? (
                    <p className="instagram-card-desc">
                      <FaCheckCircle size={13} style={{ color: 'var(--success)', marginRight: 6 }} />
                      {userData?.instagramUsername
                        ? `@${userData.instagramUsername}`
                        : 'Conta conectada com sucesso'}
                    </p>
                  ) : (
                    <p className="instagram-card-desc">
                      <FaTimesCircle size={13} style={{ color: 'var(--danger)', marginRight: 6 }} />
                      Conecte sua conta para ativar as automações.
                    </p>
                  )}
                </div>
              </div>

              <div className="instagram-card-action">
                {isConnected ? (
                  <button
                    className="btn-outline btn-danger-outline"
                    onClick={handleDisconnectInstagram}
                    disabled={disconnecting}
                  >
                    {disconnecting ? (
                      <span className="btn-spinner" />
                    ) : (
                      <FaUnlink size={14} />
                    )}
                    Desconectar
                  </button>
                ) : (
                  <button className="btn-instagram" onClick={handleConnectInstagram}>
                    <FaInstagram size={16} />
                    Conectar com Instagram
                  </button>
                )}
              </div>
            </div>

            {!isConnected && (
              <div className="instagram-card-warning">
                <span>⚠️</span>
                <span>
                  Você precisa conectar sua conta do Instagram Business para que as campanhas funcionem.
                </span>
              </div>
            )}
          </div>

          {/* Campaigns section */}
          <div className="campaigns-section">
            <div className="section-header">
              <div>
                <h2 className="section-title">Campanhas</h2>
                <p className="section-subtitle">
                  Suas automações de DM ativas e pausadas.
                </p>
              </div>
              <button className="btn-primary btn-sm" onClick={handleNewCampaign}>
                <FaPlus size={12} />
                Nova Campanha
              </button>
            </div>

            <CampaignList
              onEdit={handleEditCampaign}
              onStatsUpdate={handleStatsUpdate}
            />
          </div>
        </div>
      </main>

      {/* Campaign Modal */}
      {showModal && (
        <CampaignModal
          campaign={editingCampaign}
          onClose={() => {
            setShowModal(false);
            setEditingCampaign(null);
          }}
        />
      )}
    </div>
  );
}
