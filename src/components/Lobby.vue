<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const username = ref('');

onMounted(() => {
  // 檢查是否已登入
  const storedUsername = localStorage.getItem('username');
  const token = localStorage.getItem('token');
  
  if (!storedUsername || !token) {
    // 未登入，導回登入頁
    router.push('/login');
    return;
  }
  
  username.value = storedUsername;
});

const startGame = () => {
  router.push('/game');
};

const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  router.push('/login');
};
</script>

<template>
  <div class="lobby-container">
    <div class="glass-card lobby-card">
      <div class="user-avatar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      </div>
      <h2 class="welcome-text">Hi, {{ username }}</h2>
      
      <div class="menu-grid">
        <button class="menu-btn" @click="startGame">
          <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          開始遊戲 (Start Game)
        </button>
        
        <button class="menu-btn" @click="router.push('/leaderboard')">
          <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          排行榜 (Leaderboard)
        </button>
      </div>

      <button class="secondary-btn logout-btn" @click="logout">
        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
          <polyline points="16 17 21 12 16 7"></polyline>
          <line x1="21" y1="12" x2="9" y2="12"></line>
        </svg>
        登出
      </button>
    </div>
  </div>
</template>

<style scoped>
.lobby-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.lobby-card {
  width: 100%;
  max-width: 480px;
  padding: 3rem 2.5rem;
  text-align: center;
}

.user-avatar {
  width: 80px;
  height: 80px;
  margin: 0 auto 1.5rem;
  background: linear-gradient(135deg, rgba(255, 107, 53, 0.15) 0%, rgba(247, 127, 0, 0.08) 100%);
  border: 3px solid var(--glass-border);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: avatarGlow 3s ease-in-out infinite;
}

@keyframes avatarGlow {
  0%, 100% {
    box-shadow: 0 0 20px rgba(255, 107, 53, 0.3);
  }
  50% {
    box-shadow: 0 0 30px rgba(255, 107, 53, 0.5);
  }
}

.user-avatar svg {
  width: 40px;
  height: 40px;
  color: var(--accent);
  stroke-width: 2.5;
}

.welcome-text {
  margin: 0 0 3rem 0;
  font-weight: 800;
  font-size: 2rem;
  letter-spacing: 0.02em;
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.menu-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
}

.menu-btn {
  width: 100%;
  padding: 1.25rem 1.5rem;
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%);
  color: white;
  border: none;
  border-radius: 0.75rem;
  font-weight: 700;
  font-size: 1.1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(255, 107, 53, 0.3);
  position: relative;
  overflow: hidden;
}

.menu-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s;
}

.menu-btn:hover::before {
  left: 100%;
}

.menu-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 107, 53, 0.4);
}

.menu-btn:active {
  transform: translateY(0);
}

.btn-icon {
  width: 20px;
  height: 20px;
  stroke-width: 2.5;
}

.logout-btn {
  width: 100%;
  padding: 1rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  font-size: 1rem;
  margin-top: 1rem;
}

@media (max-width: 640px) {
  .lobby-card {
    padding: 2rem 1.5rem;
  }

  .welcome-text {
    font-size: 1.75rem;
    margin-bottom: 2rem;
  }

  .menu-btn {
    padding: 1.1rem 1.25rem;
    font-size: 1rem;
  }
}
</style>
