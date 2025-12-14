import axios from 'axios';

const api = axios.create({
  baseURL: 'https://uie47061-tetris.hf.space', 
  timeout: 5000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- 類型定義 ---
export interface RegisterRequest {
  username: string;
  password: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  username: string;
}

export interface LeaderboardRecord {
  username: string;
  score: number;
  level: number;
  duration: number;
  createdAt: string;
}

export interface SubmitScoreRequest {
  score: number;
  level: number;
  duration: number;
}

// --- API 方法 ---
// 1.1 註冊帳號
export const register = (data: RegisterRequest) => {
  return api.post<{ message: string }>('/api/auth/register', data);
};

// 1.2 登入
export const login = (data: LoginRequest) => {
  return api.post<LoginResponse>('/api/auth/login', data);
};

// 2.1 取得排行榜
export const getLeaderboard = () => {
  return api.get<LeaderboardRecord[]>('/api/game/leaderboard');
};

// 2.2 上傳分數
export const submitScore = (data: SubmitScoreRequest) => {
  return api.post<string>('/api/game/submit', data);
};

export default api;