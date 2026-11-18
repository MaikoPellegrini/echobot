// src/components/CampaignCard.js
import React, { useState, useMemo } from 'react';
import {
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import toast from 'react-hot-toast';
import {
  FaEdit,
  FaTrash,
  FaEnvelope,
  FaHashtag,
  FaToggleOn,
  FaToggleOff,
  FaCommentDots,
} from 'react-icons/fa';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

export default function CampaignCard({ campaign, onEdit }) {
  const { user } = useAuth();
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAllKeywords, setShowAllKeywords] = useState(false);

  const keywordsList = useMemo(() => {
    if (Array.isArray(campaign.keywords) && campaign.keywords.length > 0) {
      return campaign.keywords;
    }
    return (campaign.keyword || '')
      .split(/[,;\n]+/)
      .map((k) => k.trim())
      .filter(Boolean);
  }, [campaign.keywords, campaign.keyword]);

  const maxVisibleKeywords = 3;
  const displayedKeywords = showAllKeywords
    ? keywordsList
    : keywordsList.slice(0, maxVisibleKeywords);

  const campaignRef = doc(db, 'users', user.uid, 'campaigns', campaign.id);

  const handleToggle = async () => {
    if (toggling) return;
    setToggling(true);
    try {
      await updateDoc(campaignRef, {
        active: !campaign.active,
        updatedAt: serverTimestamp(),
      });
      toast.success(
        campaign.active ? 'Campanha pausada.' : 'Campanha ativada!'
      );
    } catch {
      toast.error('Erro ao atualizar campanha.');
    } finally {
      setToggling(false);
    }
  };

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteDoc(campaignRef);
      toast.success('Campanha excluída.');
      setShowDeleteConfirm(false);
    } catch {
      toast.error('Erro ao excluir campanha.');
      setDeleting(false);
    }
  };

  const renderScopeBadge = () => {
    const targetType = campaign.targetType;
    const mediaId = (campaign.mediaId || '').trim();
    const legacyPostId = (campaign.postId || '').trim();

    if (targetType === 'next_post') {
      if (mediaId) {
        return (
          <span className="post-badge post-linked-badge" title={`Post vinculado: ${mediaId}`}>
            ✅ Post Vinculado
          </span>
        );
      }
      return (
        <span className="post-badge next-post-badge" title="Aguardando publicação do próximo post">
          ⏳ Aguardando Próximo Post
        </span>
      );
    }

    if (targetType === 'all_posts') {
      return (
        <span className="post-badge all-posts-badge" title="Ativo em todas as postagens">
          🌐 Todos os Posts
        </span>
      );
    }

    if (targetType === 'specific_post' || legacyPostId) {
      return (
        <span
          className="post-badge"
          title={mediaId ? `ID: ${mediaId}` : legacyPostId ? `ID: ${legacyPostId}` : undefined}
        >
          Post específico
        </span>
      );
    }

    return null;
  };

  return (
    <div className={`campaign-card ${campaign.active ? 'active' : 'inactive'}`}>
      {/* Status indicator */}
      <div className={`campaign-status-bar ${campaign.active ? 'active' : ''}`} />

      <div className="campaign-card-body">
        {/* Header */}
        <div className="campaign-card-header">
          <div className="campaign-card-left">
            <h3 className="campaign-name">{campaign.name}</h3>
            <div className="campaign-meta">
              {displayedKeywords.map((kw, i) => (
                <span key={i} className="keyword-badge">
                  <FaHashtag size={10} />
                  {kw}
                </span>
              ))}
              {keywordsList.length > maxVisibleKeywords && (
                <button
                  type="button"
                  className="keyword-more-pill"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAllKeywords(!showAllKeywords);
                  }}
                  title={showAllKeywords ? 'Recolher palavras-chave' : `Ver todas (${keywordsList.length} palavras-chave)`}
                >
                  {showAllKeywords ? 'Recolher' : `+${keywordsList.length - maxVisibleKeywords}`}
                </button>
              )}
              {campaign.matchType && (
                <span className="match-badge">
                  {campaign.matchType === 'exact' ? 'Exata' : 'Parcial'}
                </span>
              )}
              {renderScopeBadge()}
            </div>
          </div>

          <div className="campaign-card-right">
            {/* Toggle */}
            <button
              className={`toggle-btn ${campaign.active ? 'on' : 'off'} ${toggling ? 'loading' : ''}`}
              onClick={handleToggle}
              disabled={toggling}
              title={campaign.active ? 'Pausar campanha' : 'Ativar campanha'}
              aria-label={campaign.active ? 'Pausar campanha' : 'Ativar campanha'}
            >
              {toggling ? (
                <span className="btn-spinner small" />
              ) : campaign.active ? (
                <FaToggleOn size={28} />
              ) : (
                <FaToggleOff size={28} />
              )}
            </button>
          </div>
        </div>

        {/* Message preview */}
        <div className="campaign-message-preview">
          <div className="preview-item">
            <FaEnvelope size={12} className="preview-icon" />
            <span className="preview-label">DM:</span>
            <span className="preview-text">{campaign.dmMessage}</span>
          </div>
          {campaign.commentReply && (
            <div className="preview-item">
              <FaCommentDots size={12} className="preview-icon" />
              <span className="preview-label">Comentário:</span>
              <span className="preview-text">{campaign.commentReply}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="campaign-card-footer">
          <div className="campaign-stats">
            <div className="stat-item">
              <FaEnvelope size={12} />
              <span>
                <strong>{(campaign.dmsSent || 0).toLocaleString('pt-BR')}</strong> DMs enviados
              </span>
            </div>
            <div className={`status-pill ${campaign.active ? 'active' : 'inactive'}`}>
              {campaign.active ? '● Ativa' : '● Pausada'}
            </div>
          </div>

          <div className="campaign-actions">
            <button
              className="btn-icon-sm btn-edit"
              onClick={() => onEdit(campaign)}
              title="Editar campanha"
            >
              <FaEdit size={14} />
            </button>
            <button
              className="btn-icon-sm btn-delete"
              onClick={() => setShowDeleteConfirm(true)}
              title="Excluir campanha"
            >
              <FaTrash size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="delete-confirm-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="delete-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="delete-confirm-icon">🗑️</div>
            <h4>Excluir campanha?</h4>
            <p>
              Tem certeza que deseja excluir a campanha <strong>"{campaign.name}"</strong>? Esta
              ação não pode ser desfeita.
            </p>
            <div className="delete-confirm-actions">
              <button
                className="btn-outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                className="btn-danger"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? <span className="btn-spinner" /> : null}
                {deleting ? 'Excluindo...' : 'Sim, excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
