// src/components/AffiliateHub.js
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import toast from 'react-hot-toast';
import {
  FaLink,
  FaStore,
  FaGraduationCap,
  FaShoppingBag,
  FaAmazon,
  FaFire,
  FaPlus,
  FaSync,
  FaMagic,
  FaCheckCircle,
  FaTimesCircle,
  FaCopy,
  FaTrash,
  FaEdit,
  FaExternalLinkAlt,
  FaSearch,
  FaFilter,
  FaKey,
  FaShieldAlt,
  FaTag,
  FaUnlink,
  FaTimes,
  FaBoxOpen,
} from 'react-icons/fa';
import { db, functions } from '../firebase';
import { useAuth } from '../context/AuthContext';

// API Connected Platforms Configuration
const API_PLATFORMS = [
  // E-commerce / Marketplaces
  {
    id: 'shopee',
    name: 'Shopee Afiliados',
    category: 'fisico',
    description: 'API GraphQL oficial com assinatura SHA256 para gerar links curtos rastreados.',
    badgeColor: '#ee4d2d',
    fields: [
      { key: 'appId', label: 'App ID', type: 'text', placeholder: 'Ex: 1234567890', required: true },
      { key: 'secret', label: 'Secret Key', type: 'password', placeholder: 'Sua chave secreta da Shopee Open API', required: true },
    ],
  },
  {
    id: 'amazon',
    name: 'Amazon Associados',
    category: 'fisico',
    description: 'PA-API 5.0 e geração direta com Partner Tag para o programa de associados da Amazon.',
    badgeColor: '#ff9900',
    fields: [
      { key: 'partnerTag', label: 'Partner Tag (ID de Associado)', type: 'text', placeholder: 'ex: seunome-20', required: true },
      { key: 'accessKey', label: 'Access Key (PA-API 5.0)', type: 'text', placeholder: 'AKIAIOSFODNN7EXAMPLE' },
      { key: 'secretKey', label: 'Secret Key (PA-API 5.0)', type: 'password', placeholder: 'Chave secreta PA-API' },
    ],
  },
  {
    id: 'awin',
    name: 'Awin',
    category: 'fisico',
    description: 'Deep links automáticos para redes e centenas de anunciantes parceiros da Awin.',
    badgeColor: '#1a73e8',
    fields: [
      { key: 'publisherId', label: 'Publisher ID (Awin ID)', type: 'text', placeholder: 'Ex: 123456', required: true },
      { key: 'apiToken', label: 'API Token / OAuth2 Token (Opcional)', type: 'password', placeholder: 'Token de autenticação Awin' },
    ],
  },
  {
    id: 'lomadee',
    name: 'Lomadee / SocialSoul',
    category: 'fisico',
    description: 'Integração para lojas brasileiras e programas de afiliados Lomadee.',
    badgeColor: '#22c55e',
    fields: [
      { key: 'sourceId', label: 'Source ID', type: 'text', placeholder: 'Ex: 35000000', required: true },
      { key: 'appToken', label: 'App Token (Opcional)', type: 'password', placeholder: 'Token da aplicação Lomadee' },
    ],
  },
  {
    id: 'rakuten',
    name: 'Rakuten Advertising',
    category: 'fisico',
    description: 'Rede global Rakuten LinkShare com geração estruturada de links afiliados.',
    badgeColor: '#bf0000',
    fields: [
      { key: 'publisherId', label: 'Publisher ID (RAN ID)', type: 'text', placeholder: 'Ex: 2111111', required: true },
      { key: 'token', label: 'Security Token (Opcional)', type: 'password', placeholder: 'Token de segurança' },
    ],
  },
  {
    id: 'admitad',
    name: 'Admitad',
    category: 'fisico',
    description: 'Geração automatizada de deep links rastreados com token Webmaster.',
    badgeColor: '#00a4e4',
    fields: [
      { key: 'token', label: 'Access Token / Webmaster Token', type: 'password', placeholder: 'Token de acesso Admitad', required: true },
      { key: 'clientId', label: 'Client ID (Opcional)', type: 'text', placeholder: 'Client ID' },
      { key: 'clientSecret', label: 'Client Secret (Opcional)', type: 'password', placeholder: 'Client Secret' },
    ],
  },
  // Infoprodutos
  {
    id: 'hotmart',
    name: 'Hotmart',
    category: 'infoproduto',
    description: 'Importe e sincronize produtos e Hotlinks ativos com 1 clique via OAuth2.',
    badgeColor: '#f04e23',
    canSync: true,
    syncFunction: 'syncHotmartProducts',
    fields: [
      { key: 'clientId', label: 'Client ID', type: 'text', placeholder: 'Client ID gerado no Hotmart Developers', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'Client Secret do aplicativo', required: true },
      { key: 'basicAuth', label: 'Basic Auth Token (Opcional)', type: 'password', placeholder: 'Header Basic gerado na central Hotmart' },
    ],
  },
  {
    id: 'eduzz',
    name: 'Eduzz',
    category: 'infoproduto',
    description: 'Sincronização direta de infoprodutos afiliados e links de divulgação da Eduzz.',
    badgeColor: '#ffc107',
    canSync: true,
    syncFunction: 'syncEduzzProducts',
    fields: [
      { key: 'apiKey', label: 'API Key / Token Parceiro', type: 'password', placeholder: 'Chave de API obtida na Eduzz', required: true },
      { key: 'publicKey', label: 'Public Key (Opcional)', type: 'text', placeholder: 'Chave pública da conta Eduzz' },
    ],
  },
];

// Manual Platforms Options
const MANUAL_PLATFORMS = [
  { id: 'shein', name: 'Shein', category: 'fisico' },
  { id: 'mercadolivre', name: 'Mercado Livre', category: 'fisico' },
  { id: 'magalu', name: 'Magazine Luiza (Magalu)', category: 'fisico' },
  { id: 'shopee', name: 'Shopee', category: 'fisico' },
  { id: 'amazon', name: 'Amazon', category: 'fisico' },
  { id: 'kiwify', name: 'Kiwify', category: 'infoproduto' },
  { id: 'hotmart', name: 'Hotmart', category: 'infoproduto' },
  { id: 'eduzz', name: 'Eduzz', category: 'infoproduto' },
  { id: 'monetizze', name: 'Monetizze', category: 'infoproduto' },
  { id: 'braip', name: 'Braip', category: 'infoproduto' },
  { id: 'ticto', name: 'Ticto', category: 'infoproduto' },
  { id: 'kirvano', name: 'Kirvano', category: 'infoproduto' },
  { id: 'outro', name: 'Outra Plataforma', category: 'fisico' },
];

function getPlatformIcon(platform) {
  const p = (platform || '').toLowerCase();
  if (p === 'amazon') return <FaAmazon />;
  if (p === 'shopee') return <FaShoppingBag />;
  if (p === 'hotmart') return <FaFire />;
  if (p === 'eduzz' || p === 'kiwify' || p === 'monetizze' || p === 'braip' || p === 'ticto' || p === 'kirvano') {
    return <FaGraduationCap />;
  }
  return <FaStore />;
}

function appendTracking(url, tag = 'echobot_dm') {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!tag) return trimmed;
  const separator = trimmed.includes('?') ? '&' : '?';
  // If url already has src= or utm_source=, do not duplicate
  if (trimmed.includes('src=') || trimmed.includes('utm_source=')) {
    return trimmed;
  }
  return `${trimmed}${separator}src=${encodeURIComponent(tag)}`;
}

export default function AffiliateHub() {
  const { user } = useAuth();

  // Primary sub-tabs: 'all' | 'ecommerce' | 'infoproducts'
  const [activeCategoryTab, setActiveCategoryTab] = useState('all');

  // Integrations status state
  const [integrationsStatus, setIntegrationsStatus] = useState({});
  const [, setLoadingIntegrations] = useState(true);

  // Affiliate Links collection state
  const [links, setLinks] = useState([]);
  const [loadingLinks, setLoadingLinks] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('all');

  // Modals state
  const [configModalPlatform, setConfigModalPlatform] = useState(null);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [deletingLink, setDeletingLink] = useState(null);

  // Action loading states
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [disconnectingPlatform, setDisconnectingPlatform] = useState(null);
  const [convertingLink, setConvertingLink] = useState(false);
  const [syncingPlatform, setSyncingPlatform] = useState(null);
  const [savingManualLink, setSavingManualLink] = useState(false);

  // Form states
  const [credentialsForm, setCredentialsForm] = useState({});
  const [convertForm, setConvertForm] = useState({
    platform: 'shopee',
    originalUrl: '',
    title: '',
    categoryType: 'fisico',
    utmSource: 'echobot_dm',
  });
  const [manualForm, setManualForm] = useState({
    title: '',
    categoryType: 'fisico',
    platform: 'shopee',
    affiliateUrl: '',
    utmSource: 'echobot_dm',
    applyTracking: true,
  });

  // Fetch integration statuses
  const fetchIntegrationStatus = useCallback(async () => {
    if (!user) return;
    try {
      setLoadingIntegrations(true);
      const getStatus = httpsCallable(functions, 'getIntegrationStatus');
      const res = await getStatus({});
      setIntegrationsStatus(res.data?.integrations || {});
    } catch (err) {
      console.warn('Erro ao carregar status de integrações:', err?.message);
    } finally {
      setLoadingIntegrations(false);
    }
  }, [user]);

  useEffect(() => {
    fetchIntegrationStatus();
  }, [fetchIntegrationStatus]);

  // Real-time listener for affiliate_links
  useEffect(() => {
    if (!user?.uid) {
      setLinks([]);
      setLoadingLinks(false);
      return;
    }

    setLoadingLinks(true);
    const linksRef = collection(db, 'affiliate_links');
    const q = query(
      linksRef,
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setLinks(list);
        setLoadingLinks(false);
      },
      (err) => {
        console.error('Error fetching affiliate links:', err);
        // Fallback query without orderBy if index is building
        const fallbackQuery = query(
          linksRef,
          where('userId', '==', user.uid)
        );
        onSnapshot(fallbackQuery, (snapshot) => {
          const list = snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }));
          list.sort((a, b) => {
            const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
            const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
            return timeB - timeA;
          });
          setLinks(list);
          setLoadingLinks(false);
        });
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // Filtered platforms for Section A
  const visibleApiPlatforms = useMemo(() => {
    if (activeCategoryTab === 'ecommerce') {
      return API_PLATFORMS.filter((p) => p.category === 'fisico');
    }
    if (activeCategoryTab === 'infoproducts') {
      return API_PLATFORMS.filter((p) => p.category === 'infoproduto');
    }
    return API_PLATFORMS;
  }, [activeCategoryTab]);

  // Filtered links for Section B
  const filteredLinks = useMemo(() => {
    return links.filter((link) => {
      // Category filter
      if (activeCategoryTab === 'ecommerce' && link.categoryType !== 'fisico') return false;
      if (activeCategoryTab === 'infoproducts' && link.categoryType !== 'infoproduto') return false;

      // Platform filter
      if (filterPlatform !== 'all' && link.platform?.toLowerCase() !== filterPlatform.toLowerCase()) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const term = searchQuery.toLowerCase();
        const matchTitle = (link.title || '').toLowerCase().includes(term);
        const matchUrl = (link.affiliateUrl || '').toLowerCase().includes(term) || (link.originalUrl || '').toLowerCase().includes(term);
        const matchPlatform = (link.platform || '').toLowerCase().includes(term);
        return matchTitle || matchUrl || matchPlatform;
      }

      return true;
    });
  }, [links, activeCategoryTab, filterPlatform, searchQuery]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = links.length;
    const physical = links.filter((l) => l.categoryType === 'fisico').length;
    const digital = links.filter((l) => l.categoryType === 'infoproduto').length;
    const connectedCount = Object.values(integrationsStatus).filter((i) => i?.connected).length;
    return { total, physical, digital, connectedCount };
  }, [links, integrationsStatus]);

  // Handlers for Integrations
  const handleOpenConfig = (platform) => {
    setConfigModalPlatform(platform);
    setCredentialsForm({});
  };

  const handleSaveCredentials = async (e) => {
    e.preventDefault();
    if (!configModalPlatform) return;
    setSavingCredentials(true);
    try {
      const saveFn = httpsCallable(functions, 'saveIntegrationCredentials');
      await saveFn({
        platform: configModalPlatform.id,
        credentials: credentialsForm,
      });
      toast.success(`Credenciais de ${configModalPlatform.name} salvas com sucesso!`);
      setConfigModalPlatform(null);
      setCredentialsForm({});
      await fetchIntegrationStatus();
    } catch (err) {
      console.error('Error saving credentials:', err);
      toast.error(err?.message || 'Erro ao salvar credenciais.');
    } finally {
      setSavingCredentials(false);
    }
  };

  const handleDisconnect = async (platformId, platformName) => {
    if (!window.confirm(`Tem certeza que deseja desconectar ${platformName}?`)) return;
    setDisconnectingPlatform(platformId);
    try {
      const disconnectFn = httpsCallable(functions, 'disconnectIntegration');
      await disconnectFn({ platform: platformId });
      toast.success(`${platformName} desconectado.`);
      await fetchIntegrationStatus();
    } catch (err) {
      toast.error(err?.message || 'Erro ao desconectar integração.');
    } finally {
      setDisconnectingPlatform(null);
    }
  };

  // Sync products (Hotmart / Eduzz)
  const handleSyncProducts = async (platformId) => {
    const platform = API_PLATFORMS.find((p) => p.id === platformId);
    if (!platform || !platform.syncFunction) return;

    setSyncingPlatform(platformId);
    const toastId = toast.loading(`Sincronizando produtos de ${platform.name}...`);
    try {
      const syncFn = httpsCallable(functions, platform.syncFunction);
      const res = await syncFn({});
      const count = res.data?.count || 0;
      toast.success(`${count} produtos sincronizados da ${platform.name}! 🎉`, { id: toastId });
    } catch (err) {
      console.error('Sync error:', err);
      toast.error(err?.message || `Erro ao sincronizar com ${platform.name}.`, { id: toastId });
    } finally {
      setSyncingPlatform(null);
    }
  };

  // Convert link via API
  const handleConvertLink = async (e) => {
    e.preventDefault();
    if (!convertForm.originalUrl.trim()) {
      toast.error('Informe a URL original do produto.');
      return;
    }
    setConvertingLink(true);
    const toastId = toast.loading('Gerando link rastreado via API...');
    try {
      const generateFn = httpsCallable(functions, 'generateAffiliateLink');
      await generateFn({
        platform: convertForm.platform,
        originalUrl: convertForm.originalUrl.trim(),
        title: convertForm.title.trim() || undefined,
        categoryType: convertForm.categoryType,
        utmSource: convertForm.utmSource.trim() || 'echobot_dm',
      });
      toast.success('Link convertido e salvo com sucesso! 🚀', { id: toastId });
      setShowConvertModal(false);
      setConvertForm({
        platform: 'shopee',
        originalUrl: '',
        title: '',
        categoryType: 'fisico',
        utmSource: 'echobot_dm',
      });
    } catch (err) {
      console.error('Convert link error:', err);
      toast.error(err?.message || 'Erro ao converter link via API.', { id: toastId });
    } finally {
      setConvertingLink(false);
    }
  };

  // Add Manual Link
  const handleSaveManualLink = async (e) => {
    e.preventDefault();
    if (!manualForm.title.trim()) {
      toast.error('Informe o nome do produto ou curso.');
      return;
    }
    if (!manualForm.affiliateUrl.trim()) {
      toast.error('Informe a URL do link de afiliado.');
      return;
    }

    setSavingManualLink(true);
    try {
      let finalAffiliateUrl = manualForm.affiliateUrl.trim();
      if (manualForm.applyTracking && manualForm.utmSource) {
        finalAffiliateUrl = appendTracking(finalAffiliateUrl, manualForm.utmSource.trim());
      }

      const payload = {
        userId: user.uid,
        title: manualForm.title.trim(),
        platform: manualForm.platform.toLowerCase(),
        categoryType: manualForm.categoryType === 'infoproduto' ? 'infoproduto' : 'fisico',
        originalUrl: manualForm.affiliateUrl.trim(),
        affiliateUrl: finalAffiliateUrl,
        utmSource: manualForm.applyTracking ? manualForm.utmSource.trim() : '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (editingLink) {
        const linkDocRef = doc(db, 'affiliate_links', editingLink.id);
        await updateDoc(linkDocRef, {
          title: payload.title,
          platform: payload.platform,
          categoryType: payload.categoryType,
          originalUrl: payload.originalUrl,
          affiliateUrl: payload.affiliateUrl,
          utmSource: payload.utmSource,
          updatedAt: serverTimestamp(),
        });
        toast.success('Link atualizado com sucesso!');
        setEditingLink(null);
      } else {
        await addDoc(collection(db, 'affiliate_links'), payload);
        toast.success('Link adicionado com sucesso! 🛒');
      }

      setShowManualModal(false);
      setManualForm({
        title: '',
        categoryType: 'fisico',
        platform: 'shopee',
        affiliateUrl: '',
        utmSource: 'echobot_dm',
        applyTracking: true,
      });
    } catch (err) {
      console.error('Save manual link error:', err);
      toast.error('Erro ao salvar link de afiliado.');
    } finally {
      setSavingManualLink(false);
    }
  };

  // Delete Link
  const handleDeleteLink = async () => {
    if (!deletingLink) return;
    try {
      await deleteDoc(doc(db, 'affiliate_links', deletingLink.id));
      toast.success('Link excluído com sucesso.');
      setDeletingLink(null);
    } catch (err) {
      toast.error('Erro ao excluir link.');
    }
  };

  // Copy link helper
  const handleCopy = (url, title) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    toast.success(`Link copiado: ${title || 'Link'}`);
  };

  // Start edit link
  const handleStartEdit = (link) => {
    setEditingLink(link);
    setManualForm({
      title: link.title || '',
      categoryType: link.categoryType || 'fisico',
      platform: link.platform || 'outro',
      affiliateUrl: link.affiliateUrl || link.originalUrl || '',
      utmSource: link.utmSource || 'echobot_dm',
      applyTracking: Boolean(link.utmSource),
    });
    setShowManualModal(true);
  };

  return (
    <div className="affiliate-hub-container">
      {/* Hub Header */}
      <div className="hub-page-header">
        <div>
          <h1 className="page-title">Afiliados & Links</h1>
          <p className="page-subtitle">
            Conecte suas contas de marketplaces e infoprodutos, gere links rastreados e envie nas suas DMs automáticas.
          </p>
        </div>

        <div className="hub-header-actions">
          <button
            className="btn-outline btn-convert"
            onClick={() => setShowConvertModal(true)}
            title="Converter URL comum em link de afiliado via API"
          >
            <FaMagic size={14} />
            Converter via API
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              setEditingLink(null);
              setManualForm({
                title: '',
                categoryType: activeCategoryTab === 'infoproducts' ? 'infoproduto' : 'fisico',
                platform: activeCategoryTab === 'infoproducts' ? 'hotmart' : 'shopee',
                affiliateUrl: '',
                utmSource: 'echobot_dm',
                applyTracking: true,
              });
              setShowManualModal(true);
            }}
          >
            <FaPlus size={13} />
            Adicionar Link Manual
          </button>
        </div>
      </div>

      {/* Overview Stats Bar */}
      <div className="affiliate-stats-bar">
        <div className="aff-stat-card">
          <div className="aff-stat-icon indigo">
            <FaLink size={18} />
          </div>
          <div className="aff-stat-info">
            <span className="aff-stat-val">{stats.total}</span>
            <span className="aff-stat-label">Links Cadastrados</span>
          </div>
        </div>

        <div className="aff-stat-card">
          <div className="aff-stat-icon orange">
            <FaShoppingBag size={18} />
          </div>
          <div className="aff-stat-info">
            <span className="aff-stat-val">{stats.physical}</span>
            <span className="aff-stat-label">Produtos Físicos</span>
          </div>
        </div>

        <div className="aff-stat-card">
          <div className="aff-stat-icon purple">
            <FaGraduationCap size={18} />
          </div>
          <div className="aff-stat-info">
            <span className="aff-stat-val">{stats.digital}</span>
            <span className="aff-stat-label">Infoprodutos & Cursos</span>
          </div>
        </div>

        <div className="aff-stat-card">
          <div className="aff-stat-icon green">
            <FaShieldAlt size={18} />
          </div>
          <div className="aff-stat-info">
            <span className="aff-stat-val">{stats.connectedCount}</span>
            <span className="aff-stat-label">APIs Conectadas</span>
          </div>
        </div>
      </div>

      {/* Category Tabs: Todos | E-commerce / Marketplaces | Infoprodutos */}
      <div className="hub-category-tabs">
        <button
          className={`hub-tab-btn ${activeCategoryTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveCategoryTab('all')}
        >
          <FaStore size={14} />
          Todas as Plataformas
        </button>
        <button
          className={`hub-tab-btn ${activeCategoryTab === 'ecommerce' ? 'active' : ''}`}
          onClick={() => setActiveCategoryTab('ecommerce')}
        >
          <FaShoppingBag size={14} />
          E-commerce & Marketplaces
        </button>
        <button
          className={`hub-tab-btn ${activeCategoryTab === 'infoproducts' ? 'active' : ''}`}
          onClick={() => setActiveCategoryTab('infoproducts')}
        >
          <FaGraduationCap size={14} />
          Infoprodutos (Cursos & Hotlinks)
        </button>
      </div>

      {/* SEÇÃO A: Conexões via API (Automáticas) */}
      <section className="hub-section">
        <div className="section-header">
          <div>
            <h2 className="section-title">
              <FaKey size={16} style={{ color: 'var(--primary-light)', marginRight: 8 }} />
              Conexões via API (Automáticas)
            </h2>
            <p className="section-subtitle">
              Configure suas credenciais para conversão de links e sincronização 1-clique. Chaves secretas são protegidas e nunca expostas no front-end.
            </p>
          </div>
        </div>

        <div className="integrations-grid">
          {visibleApiPlatforms.map((platform) => {
            const status = integrationsStatus[platform.id] || {};
            const isConnected = Boolean(status.connected);

            return (
              <div
                key={platform.id}
                className={`integration-card ${isConnected ? 'connected' : ''}`}
              >
                <div className="integration-card-header">
                  <div className="integration-icon-wrap" style={{ background: `${platform.badgeColor}20`, color: platform.badgeColor }}>
                    {getPlatformIcon(platform.id)}
                  </div>
                  <div className="integration-info">
                    <h3 className="integration-name">{platform.name}</h3>
                    <span className="integration-badge-cat">
                      {platform.category === 'fisico' ? 'Produto Físico' : 'Infoproduto'}
                    </span>
                  </div>
                  <div className="integration-status-pill">
                    {isConnected ? (
                      <span className="badge-connected">
                        <FaCheckCircle size={12} /> Conectado
                      </span>
                    ) : (
                      <span className="badge-disconnected">
                        <FaTimesCircle size={12} /> Desconectado
                      </span>
                    )}
                  </div>
                </div>

                <p className="integration-desc">{platform.description}</p>

                <div className="integration-card-actions">
                  {platform.canSync && isConnected && (
                    <button
                      className="btn-sync-small"
                      onClick={() => handleSyncProducts(platform.id)}
                      disabled={syncingPlatform === platform.id}
                      title={`Sincronizar produtos da ${platform.name}`}
                    >
                      {syncingPlatform === platform.id ? (
                        <span className="btn-spinner small" />
                      ) : (
                        <FaSync size={12} />
                      )}
                      Sincronizar
                    </button>
                  )}

                  <button
                    className={`btn-config-integration ${isConnected ? 'outline' : 'primary'}`}
                    onClick={() => handleOpenConfig(platform)}
                  >
                    <FaKey size={12} />
                    {isConnected ? 'Editar Chaves' : 'Conectar API'}
                  </button>

                  {isConnected && (
                    <button
                      className="btn-icon-disconnect"
                      onClick={() => handleDisconnect(platform.id, platform.name)}
                      disabled={disconnectingPlatform === platform.id}
                      title="Desconectar plataforma"
                    >
                      {disconnectingPlatform === platform.id ? (
                        <span className="btn-spinner small" />
                      ) : (
                        <FaUnlink size={13} />
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SEÇÃO B: Vitrine & Gerenciamento de Links */}
      <section className="hub-section">
        <div className="section-header">
          <div>
            <h2 className="section-title">
              <FaLink size={16} style={{ color: 'var(--primary-light)', marginRight: 8 }} />
              Vitrine de Links & Produtos Salvos
            </h2>
            <p className="section-subtitle">
              Todos os seus links prontos para serem inseridos nas respostas automáticas de Direct no Instagram.
            </p>
          </div>

          <div className="section-actions-row">
            {(integrationsStatus.hotmart?.connected || integrationsStatus.eduzz?.connected) && (
              <div className="sync-buttons-group">
                {integrationsStatus.hotmart?.connected && (
                  <button
                    className="btn-outline btn-sm"
                    onClick={() => handleSyncProducts('hotmart')}
                    disabled={syncingPlatform === 'hotmart'}
                  >
                    <FaSync size={11} className={syncingPlatform === 'hotmart' ? 'spin' : ''} />
                    Sincronizar Hotmart
                  </button>
                )}
                {integrationsStatus.eduzz?.connected && (
                  <button
                    className="btn-outline btn-sm"
                    onClick={() => handleSyncProducts('eduzz')}
                    disabled={syncingPlatform === 'eduzz'}
                  >
                    <FaSync size={11} className={syncingPlatform === 'eduzz' ? 'spin' : ''} />
                    Sincronizar Eduzz
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="links-filter-bar">
          <div className="search-input-wrap">
            <FaSearch size={14} className="search-icon" />
            <input
              type="text"
              placeholder="Buscar por produto, curso ou plataforma..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button className="clear-search" onClick={() => setSearchQuery('')}>
                <FaTimes size={12} />
              </button>
            )}
          </div>

          <div className="filter-select-wrap">
            <FaFilter size={13} className="filter-icon" />
            <select
              value={filterPlatform}
              onChange={(e) => setFilterPlatform(e.target.value)}
              className="filter-select"
            >
              <option value="all">Todas as Plataformas</option>
              <option value="shopee">Shopee</option>
              <option value="amazon">Amazon</option>
              <option value="hotmart">Hotmart</option>
              <option value="eduzz">Eduzz</option>
              <option value="awin">Awin</option>
              <option value="lomadee">Lomadee</option>
              <option value="rakuten">Rakuten</option>
              <option value="admitad">Admitad</option>
              <option value="shein">Shein</option>
              <option value="mercadolivre">Mercado Livre</option>
              <option value="magalu">Magalu</option>
              <option value="kiwify">Kiwify</option>
              <option value="monetizze">Monetizze</option>
              <option value="braip">Braip</option>
              <option value="ticto">Ticto</option>
              <option value="kirvano">Kirvano</option>
              <option value="outro">Outro</option>
            </select>
          </div>
        </div>

        {/* Links Table / Card Listing */}
        {loadingLinks ? (
          <div className="links-loading">
            {[1, 2, 3].map((i) => (
              <div key={i} className="campaign-skeleton">
                <div className="skeleton skeleton-title" />
                <div className="skeleton skeleton-text" />
              </div>
            ))}
          </div>
        ) : filteredLinks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <FaBoxOpen size={36} />
            </div>
            <h3 className="empty-state-title">Nenhum link de afiliado cadastrado</h3>
            <p className="empty-state-desc">
              {searchQuery || filterPlatform !== 'all'
                ? 'Nenhum link encontrado com os filtros aplicados.'
                : 'Cadastre seu primeiro link manual ou conecte uma API para converter links e sincronizar produtos automaticamente.'}
            </p>
            <div className="empty-state-actions">
              <button
                className="btn-primary"
                onClick={() => {
                  setEditingLink(null);
                  setShowManualModal(true);
                }}
              >
                <FaPlus size={13} />
                Adicionar Link Manual
              </button>
              <button
                className="btn-outline"
                onClick={() => setShowConvertModal(true)}
              >
                <FaMagic size={13} />
                Converter via API
              </button>
            </div>
          </div>
        ) : (
          <div className="affiliate-links-list">
            {filteredLinks.map((item) => (
              <div key={item.id} className="affiliate-link-card">
                <div className="link-card-left">
                  <div className="link-platform-avatar">
                    {getPlatformIcon(item.platform)}
                  </div>
                  <div className="link-main-details">
                    <div className="link-title-row">
                      <h4 className="link-product-title">{item.title}</h4>
                      <span className={`cat-pill ${item.categoryType === 'infoproduto' ? 'digital' : 'physical'}`}>
                        {item.categoryType === 'infoproduto' ? 'Infoproduto' : 'Físico'}
                      </span>
                      <span className="platform-pill">{item.platform}</span>
                    </div>

                    <div className="link-urls-row">
                      <div className="link-url-box">
                        <span className="url-label">Link de Afiliado:</span>
                        <code className="url-code">{item.affiliateUrl || item.originalUrl}</code>
                      </div>
                      {item.utmSource && (
                        <span className="utm-tag-badge">
                          <FaTag size={10} /> tag: {item.utmSource}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="link-card-actions">
                  <button
                    className="btn-action-icon copy"
                    onClick={() => handleCopy(item.affiliateUrl || item.originalUrl, item.title)}
                    title="Copiar Link"
                  >
                    <FaCopy size={14} />
                    <span>Copiar</span>
                  </button>

                  <a
                    href={item.affiliateUrl || item.originalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-action-icon test"
                    title="Abrir e Testar Link"
                  >
                    <FaExternalLinkAlt size={13} />
                  </a>

                  <button
                    className="btn-action-icon edit"
                    onClick={() => handleStartEdit(item)}
                    title="Editar Informações"
                  >
                    <FaEdit size={14} />
                  </button>

                  <button
                    className="btn-action-icon delete"
                    onClick={() => setDeletingLink(item)}
                    title="Excluir Link"
                  >
                    <FaTrash size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* MODAL 1: Configuração de Credenciais de API */}
      {configModalPlatform && (
        <div className="modal-overlay" onClick={() => !savingCredentials && setConfigModalPlatform(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-left">
                <div
                  className="modal-header-icon"
                  style={{ background: `${configModalPlatform.badgeColor}20`, color: configModalPlatform.badgeColor }}
                >
                  {getPlatformIcon(configModalPlatform.id)}
                </div>
                <div>
                  <h2 className="modal-title">Conectar {configModalPlatform.name}</h2>
                  <p className="modal-subtitle">Salve suas credenciais de API com armazenamento criptografado no Firebase.</p>
                </div>
              </div>
              <button
                className="modal-close"
                onClick={() => setConfigModalPlatform(null)}
                disabled={savingCredentials}
              >
                <FaTimes size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveCredentials}>
              <div className="modal-body">
                <div className="security-notice">
                  <FaShieldAlt size={16} />
                  <span>
                    Suas chaves de acesso são salvas diretamente no servidor seguro do Firebase e nunca trafegam publicamente.
                  </span>
                </div>

                {configModalPlatform.fields.map((field) => (
                  <div key={field.key} className="form-group">
                    <label className="form-label" htmlFor={`field-${field.key}`}>
                      {field.label} {field.required && <span className="required">*</span>}
                    </label>
                    <input
                      id={`field-${field.key}`}
                      type={field.type}
                      className="form-input"
                      placeholder={field.placeholder}
                      value={credentialsForm[field.key] || ''}
                      onChange={(e) =>
                        setCredentialsForm((prev) => ({
                          ...prev,
                          [field.key]: e.target.value,
                        }))
                      }
                      required={field.required}
                    />
                  </div>
                ))}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setConfigModalPlatform(null)}
                  disabled={savingCredentials}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={savingCredentials}>
                  {savingCredentials ? (
                    <>
                      <span className="btn-spinner" /> Salvando...
                    </>
                  ) : (
                    'Salvar Credenciais'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Converter Link via API */}
      {showConvertModal && (
        <div className="modal-overlay" onClick={() => !convertingLink && setShowConvertModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-left">
                <div className="modal-header-icon">
                  <FaMagic size={18} />
                </div>
                <div>
                  <h2 className="modal-title">Converter Link via API</h2>
                  <p className="modal-subtitle">Gera o link de afiliado rastreado chamando a API oficial da plataforma.</p>
                </div>
              </div>
              <button
                className="modal-close"
                onClick={() => setShowConvertModal(false)}
                disabled={convertingLink}
              >
                <FaTimes size={16} />
              </button>
            </div>

            <form onSubmit={handleConvertLink}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Plataforma Conectada <span className="required">*</span></label>
                  <select
                    className="form-input"
                    value={convertForm.platform}
                    onChange={(e) => {
                      const sel = e.target.value;
                      const plat = API_PLATFORMS.find((p) => p.id === sel);
                      setConvertForm((prev) => ({
                        ...prev,
                        platform: sel,
                        categoryType: plat?.category || 'fisico',
                      }));
                    }}
                  >
                    <option value="shopee">Shopee Afiliados (GraphQL SHA256)</option>
                    <option value="amazon">Amazon Associados (PA-API / Tag)</option>
                    <option value="awin">Awin (Deep Link)</option>
                    <option value="lomadee">Lomadee (SocialSoul)</option>
                    <option value="rakuten">Rakuten Advertising</option>
                    <option value="admitad">Admitad</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">URL Original do Produto <span className="required">*</span></label>
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://shopee.com.br/produto-exemplo-i.123.456"
                    value={convertForm.originalUrl}
                    onChange={(e) => setConvertForm((prev) => ({ ...prev, originalUrl: e.target.value }))}
                    required
                  />
                  <span className="form-hint">Cole a URL normal do produto copiada do navegador ou do app.</span>
                </div>

                <div className="form-row">
                  <div className="form-group flex-1">
                    <label className="form-label">Nome do Produto (opcional)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ex: Fone Bluetooth Sem Fio"
                      value={convertForm.title}
                      onChange={(e) => setConvertForm((prev) => ({ ...prev, title: e.target.value }))}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Tag de Origem</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="echobot_dm"
                      value={convertForm.utmSource}
                      onChange={(e) => setConvertForm((prev) => ({ ...prev, utmSource: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setShowConvertModal(false)}
                  disabled={convertingLink}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={convertingLink}>
                  {convertingLink ? (
                    <>
                      <span className="btn-spinner" /> Convertendo...
                    </>
                  ) : (
                    '⚡ Converter e Salvar'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Adicionar / Editar Link Manual */}
      {showManualModal && (
        <div className="modal-overlay" onClick={() => !savingManualLink && setShowManualModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-left">
                <div className="modal-header-icon">
                  <FaLink size={18} />
                </div>
                <div>
                  <h2 className="modal-title">
                    {editingLink ? 'Editar Link de Afiliado' : 'Adicionar Link Manual'}
                  </h2>
                  <p className="modal-subtitle">
                    Cadastre produtos físicos ou infoprodutos de qualquer rede ou plataforma.
                  </p>
                </div>
              </div>
              <button
                className="modal-close"
                onClick={() => {
                  setShowManualModal(false);
                  setEditingLink(null);
                }}
                disabled={savingManualLink}
              >
                <FaTimes size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveManualLink}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nome do Produto ou Curso <span className="required">*</span></label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ex: Curso de Marketing Digital ou Garrafa Térmica 1L"
                    value={manualForm.title}
                    onChange={(e) => setManualForm((prev) => ({ ...prev, title: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group flex-1">
                    <label className="form-label">Tipo de Produto <span className="required">*</span></label>
                    <div className="radio-group">
                      <label className={`radio-label ${manualForm.categoryType === 'fisico' ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="categoryType"
                          value="fisico"
                          checked={manualForm.categoryType === 'fisico'}
                          onChange={() => setManualForm((prev) => ({ ...prev, categoryType: 'fisico' }))}
                        />
                        <span className="radio-custom" />
                        Produto Físico
                      </label>
                      <label className={`radio-label ${manualForm.categoryType === 'infoproduto' ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="categoryType"
                          value="infoproduto"
                          checked={manualForm.categoryType === 'infoproduto'}
                          onChange={() => setManualForm((prev) => ({ ...prev, categoryType: 'infoproduto' }))}
                        />
                        <span className="radio-custom" />
                        Infoproduto
                      </label>
                    </div>
                  </div>

                  <div className="form-group flex-1">
                    <label className="form-label">Plataforma <span className="required">*</span></label>
                    <select
                      className="form-input"
                      value={manualForm.platform}
                      onChange={(e) => setManualForm((prev) => ({ ...prev, platform: e.target.value }))}
                    >
                      {MANUAL_PLATFORMS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Link de Afiliado (URL) <span className="required">*</span></label>
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://..."
                    value={manualForm.affiliateUrl}
                    onChange={(e) => setManualForm((prev) => ({ ...prev, affiliateUrl: e.target.value }))}
                    required
                  />
                  <span className="form-hint">Cole seu link com seu código de afiliado/Hotlink.</span>
                </div>

                {/* Auto Tracking Tag Section */}
                <div className="tracking-tag-box">
                  <label className="checkbox-custom-label">
                    <input
                      type="checkbox"
                      checked={manualForm.applyTracking}
                      onChange={(e) => setManualForm((prev) => ({ ...prev, applyTracking: e.target.checked }))}
                    />
                    <span>Anexar tag de rastreamento automático para Instagram (<code>?src=echobot_dm</code>)</span>
                  </label>

                  {manualForm.applyTracking && (
                    <div className="tracking-input-row">
                      <label className="form-label" style={{ fontSize: 12 }}>Tag personalizada:</label>
                      <input
                        type="text"
                        className="form-input form-input-sm"
                        value={manualForm.utmSource}
                        onChange={(e) => setManualForm((prev) => ({ ...prev, utmSource: e.target.value }))}
                        placeholder="echobot_dm"
                      />
                    </div>
                  )}

                  {manualForm.applyTracking && manualForm.affiliateUrl && (
                    <div className="preview-url-box">
                      <span className="preview-url-label">Pré-visualização do link gerado:</span>
                      <code className="preview-url-code">
                        {appendTracking(manualForm.affiliateUrl, manualForm.utmSource)}
                      </code>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => {
                    setShowManualModal(false);
                    setEditingLink(null);
                  }}
                  disabled={savingManualLink}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={savingManualLink}>
                  {savingManualLink ? (
                    <>
                      <span className="btn-spinner" /> Salvando...
                    </>
                  ) : editingLink ? (
                    'Salvar Alterações'
                  ) : (
                    'Adicionar à Vitrine'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingLink && (
        <div className="delete-confirm-overlay" onClick={() => setDeletingLink(null)}>
          <div className="delete-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="delete-confirm-icon">🗑️</div>
            <h4>Excluir link de afiliado?</h4>
            <p>
              Tem certeza que deseja excluir o link de <strong>"{deletingLink.title}"</strong>? Esta ação não pode ser desfeita.
            </p>
            <div className="delete-confirm-actions">
              <button className="btn-outline" onClick={() => setDeletingLink(null)}>
                Cancelar
              </button>
              <button className="btn-danger" onClick={handleDeleteLink}>
                Sim, excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
