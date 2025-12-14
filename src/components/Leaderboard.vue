<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { getLeaderboard, type LeaderboardRecord } from '@/api/request';

const router = useRouter();
const records = ref<LeaderboardRecord[]>([]);
const isLoading = ref(false);
const errorMessage = ref('');
const currentUsername = ref(localStorage.getItem('username') || '');

onMounted(async () => {
  isLoading.value = true;
  errorMessage.value = '';
  
  try {
    const res = await getLeaderboard();
    records.value = res.data;
  } catch (error: any) {
    console.error('獲取排行榜失敗:', error);
    errorMessage.value = '無法載入排行榜';
    
    // 如果失敗，嘗試讀取本地紀錄作為備用
    const localData = JSON.parse(localStorage.getItem('tetris_local_records') || '[]');
    if (localData.length > 0) {
      records.value = localData;
      errorMessage.value = '顯示本地紀錄（無法連接伺服器）';
    }
  } finally {
    isLoading.value = false;
  }
});

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
};
</script>

<template>
  <div class="lb-container">
    <div class="glass-card leaderboard-card">
      <div class="lb-header">
        <div class="header-content">
          <svg class="trophy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
            <path d="M4 22h16"></path>
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
          </svg>
          <div>
            <h2 class="title">排行榜</h2>
            <p class="subtitle">LEADERBOARD</p>
          </div>
        </div>
        <button class="secondary-btn close-btn" @click="router.push('/lobby')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          返回
        </button>
      </div>

      <p v-if="errorMessage" class="error-msg">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        {{ errorMessage }}
      </p>
      
      <div v-if="isLoading" class="loading">
        <div class="spinner"></div>
        <p>載入中...</p>
      </div>

      <div v-else class="lb-list">
        <div v-if="records.length === 0" class="no-data">
          <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="20" x2="18" y2="10"></line>
            <line x1="12" y1="20" x2="12" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="14"></line>
          </svg>
          <p>暫無紀錄</p>
          <small>開始遊戲來創造第一筆紀錄吧！</small>
        </div>
        
        <div 
          v-for="(rec, index) in records" 
          :key="index" 
          class="lb-item"
          :class="{ 'top-three': index < 3 }"
          :style="{ animationDelay: `${index * 0.05}s` }"
        >
          <div class="rank-badge" :class="'rank-'+(index+1)">
            <span class="rank-number">{{ index + 1 }}</span>
          </div>
          
          <div class="player-info">
            <div class="name-row">
              <span class="name">{{ rec.username }}</span>
              <span v-if="rec.username === currentUsername" class="you-badge">YOU</span>
            </div>
            <div class="stats-row">
              <span class="stat">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                </svg>
                Lv.{{ rec.level }}
              </span>
              <span class="stat-divider">·</span>
              <span class="stat">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                {{ formatDuration(rec.duration) }}
              </span>
            </div>
          </div>
          
          <div class="score-container">
            <span class="score">{{ rec.score.toLocaleString() }}</span>
            <span class="score-label">POINTS</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lb-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.leaderboard-card {
  width: 100% !important;
  max-width: 900px !important;
  padding: 2.5rem !important;
  margin: 0 auto !important;
}

.lb-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 2px solid rgba(255, 255, 255, 0.05);
}

.header-content {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.trophy-icon {
  width: 56px;
  height: 56px;
  color: var(--accent);
  filter: drop-shadow(0 0 20px rgba(255, 107, 53, 0.5));
  animation: float 3s ease-in-out infinite;
  flex-shrink: 0;
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

.title {
  font-size: 2.5rem;
  font-weight: 800;
  margin: 0;
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.4);
  margin: 0.25rem 0 0 0;
  letter-spacing: 3px;
  text-transform: uppercase;
  font-weight: 600;
}

.close-btn {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  white-space: nowrap;
}

.close-btn svg {
  width: 18px;
  height: 18px;
}

.error-msg {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #fca5a5;
  padding: 1rem 1.25rem;
  border-radius: 0.75rem;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.95rem;
}

.error-msg svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.loading {
  text-align: center;
  padding: 4rem 2rem;
  color: rgba(255, 255, 255, 0.6);
}

.spinner {
  width: 50px;
  height: 50px;
  margin: 0 auto 1.5rem;
  border: 4px solid rgba(255, 107, 53, 0.2);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.lb-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.no-data {
  text-align: center;
  padding: 4rem 2rem;
  color: rgba(255, 255, 255, 0.4);
}

.empty-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 1.5rem;
  color: rgba(255, 107, 53, 0.3);
}

.no-data p {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0.5rem 0;
  color: rgba(255, 255, 255, 0.6);
}

.no-data small {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.3);
}

.lb-item {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 1rem;
  transition: all 0.3s ease;
  animation: slideIn 0.5s ease forwards;
  opacity: 0;
}

.lb-item:hover {
  background: rgba(255, 107, 53, 0.05);
  border-color: rgba(255, 107, 53, 0.2);
  transform: translateX(5px);
}

.lb-item.top-three {
  background: rgba(255, 107, 53, 0.08);
  border-color: rgba(255, 107, 53, 0.3);
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.rank-badge {
  flex-shrink: 0;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.75rem;
  font-weight: 800;
  font-size: 1.75rem;
  background: rgba(255, 255, 255, 0.03);
  border: 2px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.6);
  transition: all 0.3s ease;
}

.rank-badge.rank-1 {
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%);
  border-color: var(--accent);
  box-shadow: 0 0 25px rgba(255, 107, 53, 0.4);
  color: #fff;
}

.rank-badge.rank-2 {
  background: linear-gradient(135deg, rgba(255, 107, 53, 0.7) 0%, rgba(247, 127, 0, 0.7) 100%);
  border-color: rgba(255, 107, 53, 0.8);
  box-shadow: 0 0 20px rgba(255, 107, 53, 0.3);
  color: #fff;
}

.rank-badge.rank-3 {
  background: linear-gradient(135deg, rgba(255, 107, 53, 0.5) 0%, rgba(247, 127, 0, 0.5) 100%);
  border-color: rgba(255, 107, 53, 0.6);
  box-shadow: 0 0 15px rgba(255, 107, 53, 0.2);
  color: #fff;
}

.rank-number {
  font-size: 1.75rem;
}

.player-info {
  flex: 1;
  min-width: 0;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.name {
  font-size: 1.25rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

.you-badge {
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 0.5rem;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 1.5px;
  box-shadow: 0 2px 8px rgba(255, 107, 53, 0.3);
}

.stats-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.9rem;
}

.stat {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.stat svg {
  width: 14px;
  height: 14px;
  stroke-width: 2.5;
}

.stat-divider {
  color: rgba(255, 255, 255, 0.2);
}

.score-container {
  text-align: right;
  flex-shrink: 0;
}

.score {
  display: block;
  font-size: 2rem;
  font-weight: 800;
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1.2;
}

.score-label {
  display: block;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.3);
  letter-spacing: 2px;
  text-transform: uppercase;
  margin-top: 0.25rem;
  font-weight: 600;
}

@media (max-width: 768px) {
  .lb-container {
    padding: 1rem;
  }

  .leaderboard-card {
    padding: 1.5rem !important;
  }

  .lb-header {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }

  .close-btn {
    width: 100%;
    justify-content: center;
  }

  .title {
    font-size: 2rem;
  }

  .trophy-icon {
    width: 48px;
    height: 48px;
  }

  .lb-item {
    gap: 1rem;
    padding: 1rem;
  }

  .rank-badge {
    width: 50px;
    height: 50px;
    font-size: 1.5rem;
  }

  .name {
    font-size: 1.1rem;
  }

  .score {
    font-size: 1.5rem;
  }

  .score-label {
    font-size: 0.7rem;
  }
}
</style>

