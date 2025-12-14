<script setup lang="ts">
// App.vue 現在很乾淨，只要負責顯示路由內容
</script>

<template>
  <div class="app-container">
    <!-- 這裡是用來顯示 Login, Game 或 Leaderboard 的地方 -->
    <router-view></router-view>
  </div>
</template>

<style scoped>
.app-container {
  width: 100%;
  height: 100%;
}
</style>