import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

import Login from '../components/Login.vue'
import TetrisGame from '../components/TetrisGame.vue'
import Leaderboard from '../components/Leaderboard.vue'

// 定義路由表
const routes: Array<RouteRecordRaw> = [
    {
        path: '/',
        redirect: '/login' // 預設導向登入頁
    },
    {
        path: '/login',
        name: 'Login',
        component: Login
    },
    {
        path: '/game',
        name: 'Game',
        component: TetrisGame,
    },
    {
        path: '/leaderboard',
        name: 'Leaderboard',
        component: Leaderboard
    }
]

const router = createRouter({
    history: createWebHistory('/Tetris-frontend/'),
    routes
})

export default router