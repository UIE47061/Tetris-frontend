<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { register, login } from '@/api/request';

const router = useRouter();

// 狀態
const isRegister = ref(false); // 切換 登入/註冊 模式
const username = ref('');
const password = ref('');
const errorMessage = ref('');
const isLoading = ref(false);

// 處理登入或註冊
const handleAuth = async () => {
  if (!username.value || !password.value) {
    errorMessage.value = '請輸入帳號與密碼';
    return;
  }
  
  errorMessage.value = '';
  isLoading.value = true;

  try {
    if (isRegister.value) {
      // 註冊
      await register({
        username: username.value,
        password: password.value
      });
      
      alert('註冊成功，請登入');
      isRegister.value = false; // 切換回登入
      password.value = ''; // 清空密碼
      isLoading.value = false;
    } else {
      // 登入
      const res = await login({
        username: username.value,
        password: password.value
      });

      // 登入成功，儲存 Token 和用戶名
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('username', res.data.username);
      isLoading.value = false;
      
      // 導向大廳頁面
      router.push('/lobby');
    }
  } catch (error: any) {
    console.error(error);
    
    // 處理錯誤訊息
    if (error.response?.data?.message) {
      errorMessage.value = error.response.data.message;
    } else if (error.response?.data) {
      errorMessage.value = typeof error.response.data === 'string' 
        ? error.response.data 
        : '操作失敗';
    } else {
      errorMessage.value = '連線失敗，請檢查網路';
    }
    
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="login-container">
    <div class="glass-card">
      <div class="logo-container">
        <svg class="logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="7" height="7"></rect>
          <rect x="14" y="3" width="7" height="7"></rect>
          <rect x="14" y="14" width="7" height="7"></rect>
          <rect x="3" y="14" width="7" height="7"></rect>
        </svg>
      </div>
      <h2>{{ isRegister ? '建立帳戶' : '會員登入' }}</h2>
      <p class="subtitle">TETRIS GAME</p>
      
      <input 
        v-model="username" 
        class="glass-input" 
        placeholder="帳號 (Username)" 
        maxlength="20"
      />
      <input 
        v-model="password" 
        type="password"
        class="glass-input" 
        placeholder="密碼 (Password)" 
        @keyup.enter="handleAuth"
      />

      <p v-if="errorMessage" class="error-msg">{{ errorMessage }}</p>

      <button class="primary-btn" @click="handleAuth" :disabled="isLoading">
        {{ isLoading ? '處理中...' : (isRegister ? '註冊' : '登入') }}
      </button>

      <div class="switch-mode" @click="isRegister = !isRegister">
        {{ isRegister ? '已有帳號？點此登入' : '還沒有帳號？點此註冊' }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.glass-card {
  width: 100%;
  max-width: 420px;
}

.logo-container {
  display: flex;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.logo-icon {
  width: 48px;
  height: 48px;
  color: var(--accent);
  filter: drop-shadow(0 0 12px rgba(255, 107, 53, 0.4));
}

h2 { 
  margin: 0 0 8px 0; 
  font-weight: 700; 
  font-size: 1.8rem;
  letter-spacing: 0.02em; 
  color: var(--text-primary);
}

.subtitle { 
  color: var(--text-secondary); 
  font-size: 0.85rem; 
  margin-bottom: 32px;
  font-weight: 600;
  letter-spacing: 0.15em;
}

.error-msg { 
  color: var(--error); 
  font-size: 0.85rem; 
  margin-bottom: 12px;
  padding: 8px 12px;
  background: rgba(255, 77, 79, 0.1);
  border-radius: 6px;
  border: 1px solid rgba(255, 77, 79, 0.2);
}

.switch-mode {
  margin-top: 20px;
  font-size: 0.9rem;
  color: var(--text-secondary);
  cursor: pointer;
  opacity: 0.9;
  transition: all 0.2s ease;
}

.switch-mode:hover { 
  color: var(--accent); 
  opacity: 1; 
}
</style>