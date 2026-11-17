// src/components/CampaignModal.js
import React, { useState, useEffect, useRef } from 'react';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import toast from 'react-hot-toast';
import {
  FaTimes,
  FaBullhorn,
  FaHashtag,
  FaEnvelope,
  FaCommentDots,
  FaImage,
  FaClock,
  FaGlobe,
  FaPaperclip,
  FaLink,
  FaSearch,
  FaAmazon,
  FaShoppingBag,
  FaFire,
  FaGraduationCap,
  FaTag,
} from 'react-icons/fa';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

const defaultForm = {
  name: '',
  keyword: '',
  targetType: 'next_post',
  mediaId: '',
  matchType: 'partial',
  dmMessage: '',
  commentReply: '',
  active: true,
};

export default function CampaignModal({ campaign, onClose }) {
  const { user } = useAuth();
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // Affiliate links selector state
  const [showLinkSelector, setShowLinkSelector] = useState(false);
  const [affiliateLinks, setAffiliateLinks] = useState([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [linksError, setLinksError] = useState(null);
  const [linkSearch, setLinkSearch] = useState('');

  const modalRef = useRef(null);
  const firstInputRef = useRef(null);
  const linkSelectorRef = useRef(null);
  const dmTextareaRef = useRef(null);
  const savingRef = useRef(false);
  savingRef.current = saving;

  const isEditing = !!campaign;

  useEffect(() => {
    if (campaign) {
      let initialTargetType = 'next_post';
      if (campaign.targetType) {
        initialTargetType = campaign.targetType;
      } else if (campaign.mediaId || campaign.postId) {
        initialTargetType = 'specific_post';
      } else {
        initialTargetType = 'all_posts';
      }

      setForm({
        name: campaign.name || '',
        keyword: campaign.keyword || '',
        targetType: initialTargetType,
        mediaId: campaign.mediaId || campaign.postId || '',
        matchType: campaign.matchType || 'partial',
        dmMessage: campaign.dmMessage || '',
        commentReply: campaign.commentReply || '',
        active: campaign.active !== undefined ? campaign.active : true,
      });
    } else {
      setForm(defaultForm);
    }
    setErrors({});
  }, [campaign]);

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const timer = setTimeout(() => {
      if (firstInputRef.current) firstInputRef.current.focus();
    }, 100);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !savingRef.current) {
        if (showLinkSelector) {
          setShowLinkSelector(false);
          return;
        }
        onClose();
        return;
      }

      if (e.key !== 'Tab' || !modalRef.current) return;
      const focusableElements = modalRef.current.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusableElements.length) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [onClose, showLinkSelector]);

  // Handle clicking outside the affiliate link selector popover
  useEffect(() => {
    if (!showLinkSelector) return;
    const handleClickOutside = (e) => {
      if (linkSelectorRef.current && !linkSelectorRef.current.contains(e.target)) {
        setShowLinkSelector(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showLinkSelector]);

  const fetchAffiliateLinks = async () => {
    if (!user?.uid) return;
    setLoadingLinks(true);
    setLinksError(null);
    try {
      const q = query(
        collection(db, 'affiliate_links'),
        where('userId', '==', user.uid)
      );
      const snap = await getDocs(q);
      const links = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setAffiliateLinks(links);
    } catch (err) {
      console.error('Error fetching affiliate links:', err);
      setLinksError('Não foi possível carregar os links de afiliado.');
    } finally {
      setLoadingLinks(false);
    }
  };

  const handleToggleLinkSelector = () => {
    const nextState = !showLinkSelector;
    setShowLinkSelector(nextState);
    if (nextState) {
      fetchAffiliateLinks();
    }
  };

  const handleInsertAffiliateLink = (linkItem) => {
    const urlToInsert = linkItem.affiliateUrl || linkItem.originalUrl;
    if (!urlToInsert) return;

    const textarea = dmTextareaRef.current;
    let newText = '';
    let newCursorPos = 0;

    if (textarea) {
      const start = textarea.selectionStart ?? form.dmMessage.length;
      const end = textarea.selectionEnd ?? form.dmMessage.length;
      const current = form.dmMessage;
      const before = current.substring(0, start);
      const after = current.substring(end);

      const needsLeadingSpace = before.length > 0 && !/\s$/.test(before);
      const needsTrailingSpace = after.length > 0 && !/^\s/.test(after);

      const insertion = (needsLeadingSpace ? ' ' : '') + urlToInsert + (needsTrailingSpace ? ' ' : '');
      newText = before + insertion + after;
      newCursorPos = before.length + insertion.length;
    } else {
      newText = form.dmMessage ? `${form.dmMessage} ${urlToInsert}` : urlToInsert;
      newCursorPos = newText.length;
    }

    if (newText.length > 1000) {
      toast.error('A mensagem excede o limite máximo de 1000 caracteres com este link.');
      return;
    }

    setForm((prev) => ({
      ...prev,
      dmMessage: newText,
    }));
    if (errors.dmMessage) {
      setErrors((prev) => ({ ...prev, dmMessage: '' }));
    }

    setShowLinkSelector(false);

    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 50);

    toast.success(`Link de "${linkItem.title}" inserido!`);
  };

  const getPlatformIcon = (platform) => {
    const p = (platform || '').toLowerCase();
    switch (p) {
      case 'amazon':
        return <FaAmazon className="platform-icon amazon" title="Amazon" />;
      case 'hotmart':
        return <FaFire className="platform-icon hotmart" title="Hotmart" />;
      case 'eduzz':
        return <FaGraduationCap className="platform-icon eduzz" title="Eduzz" />;
      case 'shopee':
        return <FaShoppingBag className="platform-icon shopee" title="Shopee" />;
      default:
        return <FaTag className="platform-icon default" title={platform || 'Afiliado'} />;
    }
  };

  const filteredLinks = affiliateLinks.filter((item) => {
    if (!linkSearch.trim()) return true;
    const term = linkSearch.toLowerCase();
    return (
      (item.title && item.title.toLowerCase().includes(term)) ||
      (item.platform && item.platform.toLowerCase().includes(term))
    );
  });

  const fisicoLinks = filteredLinks.filter((item) => item.categoryType === 'fisico');
  const infoprodutoLinks = filteredLinks.filter(
    (item) => item.categoryType === 'infoproduto' || (!item.categoryType && !fisicoLinks.includes(item))
  );

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = 'Nome da campanha é obrigatório.';
    if (!form.keyword.trim()) newErrors.keyword = 'Palavra-chave é obrigatória.';
    if (!form.dmMessage.trim()) newErrors.dmMessage = 'Mensagem de Direct é obrigatória.';
    if (form.name.trim().length > 60) newErrors.name = 'Nome deve ter no máximo 60 caracteres.';
    if (form.keyword.trim().length > 50) newErrors.keyword = 'Palavra-chave deve ter no máximo 50 caracteres.';
    if (form.dmMessage.trim().length > 1000) newErrors.dmMessage = 'Mensagem deve ter no máximo 1000 caracteres.';
    if (form.targetType === 'specific_post' && !form.mediaId.trim()) {
      newErrors.mediaId = 'Informe o ID da postagem específica.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    if (saving) return;

    setSaving(true);
    try {
      const isSpecific = form.targetType === 'specific_post';
      const cleanMediaId = isSpecific ? form.mediaId.trim() : '';

      const payload = {
        name: form.name.trim(),
        keyword: form.keyword.trim().toUpperCase(),
        targetType: form.targetType,
        mediaId: cleanMediaId,
        postId: cleanMediaId, // Backward compatibility
        matchType: form.matchType,
        dmMessage: form.dmMessage.trim(),
        commentReply: form.commentReply.trim(),
        active: form.active,
        updatedAt: serverTimestamp(),
      };

      if (isEditing) {
        const campaignRef = doc(db, 'users', user.uid, 'campaigns', campaign.id);
        await updateDoc(campaignRef, payload);
        toast.success('Campanha atualizada com sucesso!');
      } else {
        const campaignsRef = collection(db, 'users', user.uid, 'campaigns');
        await addDoc(campaignsRef, {
          ...payload,
          dmsSent: 0,
          createdAt: serverTimestamp(),
        });
        toast.success('Campanha criada com sucesso! 🚀');
      }

      onClose();
    } catch (error) {
      console.error('Error saving campaign:', error);
      toast.error('Erro ao salvar campanha. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (!saving && modalRef.current && !modalRef.current.contains(e.target)) {
      onClose();
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="campaign-modal-title"
      aria-describedby="campaign-modal-description"
    >
      <div className="modal-container" ref={modalRef}>
        {/* Modal header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-header-icon">
              <FaBullhorn size={18} />
            </div>
            <div>
              <h2 className="modal-title" id="campaign-modal-title">
                {isEditing ? 'Editar Campanha' : 'Nova Campanha'}
              </h2>
              <p className="modal-subtitle" id="campaign-modal-description">
                {isEditing
                  ? 'Atualize as configurações da sua campanha.'
                  : 'Configure a automação de DM por palavra-chave.'}
              </p>
            </div>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Fechar" disabled={saving}>
            <FaTimes size={16} />
          </button>
        </div>

        {/* Modal form */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            {/* Campaign name */}
            <div className="form-group">
              <label className="form-label" htmlFor="name">
                <FaBullhorn size={12} />
                Nome da Campanha <span className="required">*</span>
              </label>
              <input
                ref={firstInputRef}
                id="name"
                name="name"
                type="text"
                className={`form-input ${errors.name ? 'error' : ''}`}
                placeholder="ex: Campanha de Lançamento"
                value={form.name}
                onChange={handleChange}
                maxLength={60}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? 'campaign-name-error' : undefined}
              />
              {errors.name && <span className="form-error" id="campaign-name-error">{errors.name}</span>}
              <span className="form-hint">{form.name.length}/60</span>
            </div>

            {/* Keyword + Match type */}
            <div className="form-row">
              <div className="form-group flex-1">
                <label className="form-label" htmlFor="keyword">
                  <FaHashtag size={12} />
                  Palavra-chave Gatilho <span className="required">*</span>
                </label>
                <input
                  id="keyword"
                  name="keyword"
                  type="text"
                  className={`form-input ${errors.keyword ? 'error' : ''}`}
                  placeholder="ex: INFO, LINK, QUERO"
                  value={form.keyword}
                  onChange={handleChange}
                  maxLength={50}
                  aria-invalid={Boolean(errors.keyword)}
                  aria-describedby={errors.keyword ? 'campaign-keyword-error' : undefined}
                />
                {errors.keyword && <span className="form-error" id="campaign-keyword-error">{errors.keyword}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Tipo de Busca</label>
                <div className="radio-group">
                  <label className={`radio-label ${form.matchType === 'partial' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="matchType"
                      value="partial"
                      checked={form.matchType === 'partial'}
                      onChange={handleChange}
                    />
                    <span className="radio-custom" />
                    Parcial
                  </label>
                  <label className={`radio-label ${form.matchType === 'exact' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="matchType"
                      value="exact"
                      checked={form.matchType === 'exact'}
                      onChange={handleChange}
                    />
                    <span className="radio-custom" />
                    Exata
                  </label>
                </div>
                <span className="form-hint">
                  {form.matchType === 'partial'
                    ? 'Detecta a palavra em qualquer parte da mensagem.'
                    : 'A mensagem deve ser exatamente a palavra-chave.'}
                </span>
              </div>
            </div>

            {/* Scope selector (Target type) */}
            <div className="form-group">
              <label className="form-label">
                <FaBullhorn size={12} />
                Escopo da Postagem <span className="required">*</span>
              </label>
              <div className="scope-selector" role="radiogroup" aria-label="Escopo da Postagem">
                {/* 1. Próxima Postagem (Automático) */}
                <label className={`scope-option ${form.targetType === 'next_post' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="targetType"
                    value="next_post"
                    checked={form.targetType === 'next_post'}
                    onChange={handleChange}
                    className="scope-radio-input"
                  />
                  <div className="scope-icon-wrap">
                    <FaClock size={16} />
                  </div>
                  <div className="scope-info">
                    <span className="scope-title">Próxima Postagem (Automático)</span>
                    <span className="scope-description">
                      Aguardará a próxima publicação no perfil após a criação para vincular automaticamente.
                    </span>
                  </div>
                </label>

                {/* 2. Postagem Específica */}
                <label className={`scope-option ${form.targetType === 'specific_post' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="targetType"
                    value="specific_post"
                    checked={form.targetType === 'specific_post'}
                    onChange={handleChange}
                    className="scope-radio-input"
                  />
                  <div className="scope-icon-wrap">
                    <FaImage size={16} />
                  </div>
                  <div className="scope-info">
                    <span className="scope-title">Postagem Específica</span>
                    <span className="scope-description">
                      Ativa a automação apenas nos comentários da publicação informada por ID.
                    </span>
                  </div>
                </label>

                {/* 3. Todas as Postagens */}
                <label className={`scope-option ${form.targetType === 'all_posts' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="targetType"
                    value="all_posts"
                    checked={form.targetType === 'all_posts'}
                    onChange={handleChange}
                    className="scope-radio-input"
                  />
                  <div className="scope-icon-wrap">
                    <FaGlobe size={16} />
                  </div>
                  <div className="scope-info">
                    <span className="scope-title">Todas as Postagens</span>
                    <span className="scope-description">
                      Responde aos comentários de qualquer publicação ativa no seu perfil.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Post ID field if specific post */}
            {form.targetType === 'specific_post' && (
              <div className="form-group specific-post-field">
                <label className="form-label" htmlFor="mediaId">
                  <FaImage size={12} />
                  ID da Postagem (Media ID) <span className="required">*</span>
                </label>
                <input
                  id="mediaId"
                  name="mediaId"
                  type="text"
                  className={`form-input ${errors.mediaId ? 'error' : ''}`}
                  placeholder="ex: 17982345678901234"
                  value={form.mediaId}
                  onChange={handleChange}
                  aria-invalid={Boolean(errors.mediaId)}
                  aria-describedby={errors.mediaId ? 'campaign-mediaid-error' : undefined}
                />
                {errors.mediaId && (
                  <span className="form-error" id="campaign-mediaid-error">{errors.mediaId}</span>
                )}
                <span className="form-hint">
                  Informe o identificador da publicação do Instagram para vincular.
                </span>
              </div>
            )}

            {/* DM message */}
            <div className="form-group">
              <label className="form-label" htmlFor="dmMessage">
                <FaEnvelope size={12} />
                Mensagem de Direct <span className="required">*</span>
              </label>
              <textarea
                ref={dmTextareaRef}
                id="dmMessage"
                name="dmMessage"
                className={`form-textarea ${errors.dmMessage ? 'error' : ''}`}
                placeholder="Olá {nome}! Obrigado pelo interesse. Aqui está o link que você pediu: ..."
                value={form.dmMessage}
                onChange={handleChange}
                rows={4}
                maxLength={1000}
                aria-invalid={Boolean(errors.dmMessage)}
                aria-describedby={errors.dmMessage ? 'campaign-message-error' : undefined}
              />

              {/* Affiliate Link Selector Action Bar */}
              <div className="dm-actions-bar">
                <div className="affiliate-selector-wrapper" ref={linkSelectorRef}>
                  <button
                    type="button"
                    className="btn-insert-affiliate"
                    onClick={handleToggleLinkSelector}
                    aria-expanded={showLinkSelector}
                  >
                    <FaPaperclip size={12} />
                    Inserir Link de Afiliado
                  </button>

                  {showLinkSelector && (
                    <div className="affiliate-link-selector">
                      <div className="affiliate-selector-header">
                        <span className="affiliate-selector-title">
                          <FaLink size={12} /> Selecionar Link de Afiliado
                        </span>
                        <button
                          type="button"
                          className="affiliate-selector-close"
                          onClick={() => setShowLinkSelector(false)}
                          aria-label="Fechar"
                        >
                          <FaTimes size={12} />
                        </button>
                      </div>

                      <div className="affiliate-selector-search">
                        <FaSearch size={11} className="search-icon" />
                        <input
                          type="text"
                          placeholder="Filtrar por produto ou plataforma..."
                          value={linkSearch}
                          onChange={(e) => setLinkSearch(e.target.value)}
                          className="affiliate-search-input"
                          autoFocus
                        />
                      </div>

                      <div className="affiliate-selector-body">
                        {loadingLinks ? (
                          <div className="affiliate-loading">
                            <span className="btn-spinner" />
                            <span>Buscando links...</span>
                          </div>
                        ) : linksError ? (
                          <div className="affiliate-error">
                            <span>{linksError}</span>
                            <button
                              type="button"
                              className="btn-retry"
                              onClick={fetchAffiliateLinks}
                            >
                              Tentar novamente
                            </button>
                          </div>
                        ) : filteredLinks.length === 0 ? (
                          <div className="affiliate-empty">
                            {affiliateLinks.length === 0 ? (
                              <>
                                <p>Nenhum link de afiliado cadastrado.</p>
                                <span className="affiliate-empty-hint">
                                  Gere seus links na aba de Afiliados para inseri-los aqui.
                                </span>
                              </>
                            ) : (
                              <p>Nenhum link encontrado para "{linkSearch}".</p>
                            )}
                          </div>
                        ) : (
                          <div className="affiliate-groups">
                            {/* Infoprodutos */}
                            {infoprodutoLinks.length > 0 && (
                              <div className="affiliate-group">
                                <div className="affiliate-group-header">
                                  🎓 Infoprodutos ({infoprodutoLinks.length})
                                </div>
                                <div className="affiliate-group-items">
                                  {infoprodutoLinks.map((item) => (
                                    <button
                                      key={item.id}
                                      type="button"
                                      className="affiliate-link-item"
                                      onClick={() => handleInsertAffiliateLink(item)}
                                      title={item.title}
                                    >
                                      <div className="affiliate-item-icon">
                                        {getPlatformIcon(item.platform)}
                                      </div>
                                      <div className="affiliate-item-details">
                                        <span className="affiliate-item-title">
                                          {item.title}
                                        </span>
                                        <div className="affiliate-item-meta">
                                          <span className="platform-tag">{item.platform}</span>
                                          <span className="url-preview">
                                            {item.affiliateUrl || item.originalUrl}
                                          </span>
                                        </div>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Produtos Físicos */}
                            {fisicoLinks.length > 0 && (
                              <div className="affiliate-group">
                                <div className="affiliate-group-header">
                                  📦 Produtos Físicos ({fisicoLinks.length})
                                </div>
                                <div className="affiliate-group-items">
                                  {fisicoLinks.map((item) => (
                                    <button
                                      key={item.id}
                                      type="button"
                                      className="affiliate-link-item"
                                      onClick={() => handleInsertAffiliateLink(item)}
                                      title={item.title}
                                    >
                                      <div className="affiliate-item-icon">
                                        {getPlatformIcon(item.platform)}
                                      </div>
                                      <div className="affiliate-item-details">
                                        <span className="affiliate-item-title">
                                          {item.title}
                                        </span>
                                        <div className="affiliate-item-meta">
                                          <span className="platform-tag">{item.platform}</span>
                                          <span className="url-preview">
                                            {item.affiliateUrl || item.originalUrl}
                                          </span>
                                        </div>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {errors.dmMessage && (
                <span className="form-error" id="campaign-message-error">{errors.dmMessage}</span>
              )}
              <span className="form-hint">{form.dmMessage.length}/1000 — Use {'{nome}'} para personalizar com o nome do usuário.</span>
            </div>

            {/* Comment reply */}
            <div className="form-group">
              <label className="form-label" htmlFor="commentReply">
                <FaCommentDots size={12} />
                Resposta ao Comentário (opcional)
              </label>
              <textarea
                id="commentReply"
                name="commentReply"
                className="form-textarea"
                placeholder="Que incrível! Acabei de te enviar as informações por Direct 😊"
                value={form.commentReply}
                onChange={handleChange}
                rows={2}
                maxLength={500}
              />
              <span className="form-hint">
                Resposta pública exibida no comentário, além do DM enviado.
              </span>
            </div>

            {/* Active toggle */}
            <div className="form-group form-toggle-group">
              <div className="form-toggle-info">
                <label className="form-label" style={{ marginBottom: 2 }}>
                  Status da Campanha
                </label>
                <span className="form-hint">
                  {form.active
                    ? 'Campanha ativa — responderá automaticamente.'
                    : 'Campanha pausada — não enviará DMs.'}
                </span>
              </div>
              <label className="toggle-switch" aria-label="Ativar campanha">
                <input
                  type="checkbox"
                  name="active"
                  checked={form.active}
                  onChange={handleChange}
                />
                <span className="toggle-track">
                  <span className="toggle-thumb" />
                </span>
                <span className={`toggle-label ${form.active ? 'on' : 'off'}`}>
                  {form.active ? 'Ativa' : 'Pausada'}
                </span>
              </label>
            </div>
          </div>

          {/* Modal footer */}
          <div className="modal-footer">
            <button type="button" className="btn-outline" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? (
                <>
                  <span className="btn-spinner" />
                  Salvando...
                </>
              ) : (
                <>
                  {isEditing ? '✓ Salvar Alterações' : '🚀 Criar Campanha'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
