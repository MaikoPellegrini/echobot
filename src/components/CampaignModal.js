// src/components/CampaignModal.js
import React, { useState, useEffect, useRef } from 'react';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import toast from 'react-hot-toast';
import {
  FaTimes,
  FaBullhorn,
  FaHashtag,
  FaEnvelope,
  FaCommentDots,
  FaImage,
} from 'react-icons/fa';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

const defaultForm = {
  name: '',
  keyword: '',
  postId: '',
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
  const modalRef = useRef(null);
  const firstInputRef = useRef(null);
  const savingRef = useRef(false);
  savingRef.current = saving;

  const isEditing = !!campaign;

  useEffect(() => {
    if (campaign) {
      setForm({
        name: campaign.name || '',
        keyword: campaign.keyword || '',
        postId: campaign.postId || '',
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
  }, [onClose]);

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
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    if (saving) return;

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        keyword: form.keyword.trim().toUpperCase(),
        postId: form.postId.trim(),
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

            {/* Post ID */}
            <div className="form-group">
              <label className="form-label" htmlFor="postId">
                <FaImage size={12} />
                Post Alvo (opcional)
              </label>
              <input
                id="postId"
                name="postId"
                type="text"
                className="form-input"
                placeholder="ID do post ou deixe em branco para todos os posts"
                value={form.postId}
                onChange={handleChange}
              />
              <span className="form-hint">
                Deixe em branco para aplicar a todos os comentários do perfil.
              </span>
            </div>

            {/* DM message */}
            <div className="form-group">
              <label className="form-label" htmlFor="dmMessage">
                <FaEnvelope size={12} />
                Mensagem de Direct <span className="required">*</span>
              </label>
              <textarea
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
