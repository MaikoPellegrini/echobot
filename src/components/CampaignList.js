// src/components/CampaignList.js
import React, { useEffect, useState, useCallback } from 'react';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import { FaBullhorn } from 'react-icons/fa';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import CampaignCard from './CampaignCard';

export default function CampaignList({ onEdit, onStatsUpdate }) {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  const updateStats = useCallback(
    (list) => {
      const totalDms = list.reduce((acc, c) => acc + (c.dmsSent || 0), 0);
      const totalCampaigns = list.length;
      const activeCampaigns = list.filter((c) => c.active).length;
      if (onStatsUpdate) {
        onStatsUpdate(totalDms, totalCampaigns, activeCampaigns);
      }
    },
    [onStatsUpdate]
  );

  useEffect(() => {
    if (!user?.uid) {
      setCampaigns([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setListError('');
    const campaignsRef = collection(db, 'users', user.uid, 'campaigns');
    const q = query(campaignsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setCampaigns(list);
        updateStats(list);
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to campaigns:', error);
        setListError('Não foi possível carregar as campanhas. Verifique sua conexão e tente novamente.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid, updateStats, retryCount]);

  if (loading) {
    return (
      <div className="list-loading">
        {[1, 2, 3].map((i) => (
          <div key={i} className="campaign-skeleton">
            <div className="skeleton skeleton-title" />
            <div className="skeleton skeleton-text" />
            <div className="skeleton skeleton-text short" />
          </div>
        ))}
      </div>
    );
  }

  if (campaigns.length === 0) {
    if (listError) {
      return (
        <div className="list-error" role="alert">
          <p>{listError}</p>
          <button className="btn-outline" onClick={() => setRetryCount((count) => count + 1)}>
            Tentar novamente
          </button>
        </div>
      );
    }

    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <FaBullhorn size={40} />
        </div>
        <h3 className="empty-state-title">Nenhuma campanha ainda</h3>
        <p className="empty-state-desc">
          Crie sua primeira campanha e comece a automatizar seus Directs no Instagram agora mesmo.
        </p>
        <div className="empty-state-features">
          <div className="empty-feature">🎯 Palavras-chave personalizadas</div>
          <div className="empty-feature">⚡ Respostas instantâneas</div>
          <div className="empty-feature">📊 Métricas em tempo real</div>
        </div>
      </div>
    );
  }

  return (
    <>
      {listError && (
        <div className="list-error" role="alert">
          <p>{listError}</p>
          <button className="btn-outline" onClick={() => setRetryCount((count) => count + 1)}>
            Tentar novamente
          </button>
        </div>
      )}
      <div className="campaign-list">
        {campaigns.map((campaign) => (
          <CampaignCard key={campaign.id} campaign={campaign} onEdit={onEdit} />
        ))}
      </div>
    </>
  );
}
