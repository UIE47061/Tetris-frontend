<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { submitScore } from '@/api/request';

const router = useRouter();

// --- Canvas Refs ---
const boardCanvas = ref<HTMLCanvasElement | null>(null);
const nextCanvas = ref<HTMLCanvasElement | null>(null);
const holdCanvas = ref<HTMLCanvasElement | null>(null);

// --- Game Constants ---
const COLS = 10;
const ROWS = 20;
const COLORS: Record<string, string> = {
  I: '#2ee4e4', J: '#2b6cff', L: '#ff9f43', O: '#ffd23f',
  S: '#46dd55', T: '#8b5cf6', Z: '#ff5c67', X: '#0b1520'
};
const SHAPES: { [key: string]: number[][][] } = {
  I: [[[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]]],
  J: [[[1,0,0],[1,1,1],[0,0,0]], [[0,1,1],[0,1,0],[0,1,0]], [[0,0,0],[1,1,1],[0,0,1]], [[0,1,0],[0,1,0],[1,1,0]]],
  L: [[[0,0,1],[1,1,1],[0,0,0]], [[0,1,0],[0,1,0],[0,1,1]], [[0,0,0],[1,1,1],[1,0,0]], [[1,1,0],[0,1,0],[0,1,0]]],
  O: [[[1,1],[1,1]]],
  S: [[[0,1,1],[1,1,0],[0,0,0]], [[0,1,0],[0,1,1],[0,0,1]]],
  T: [[[0,1,0],[1,1,1],[0,0,0]], [[0,1,0],[0,1,1],[0,1,0]], [[0,0,0],[1,1,1],[0,1,0]], [[0,1,0],[1,1,0],[0,1,0]]],
  Z: [[[1,1,0],[0,1,1],[0,0,0]], [[0,0,1],[0,1,1],[0,1,0]]]
};

// --- Game State ---
interface Piece {
  type: string;
  shapeIndex: number;
  shape: number[][];
  x: number;
  y: number;
}

let grid: (string | null)[][] = [];
let current: Piece;
let next: Piece;
let hold: Piece | null = null;
let holdUsed = false;

const score = ref(0);
const level = ref(1);
const lines = ref(0);
const duration = ref(0); // [新增] 遊戲時長
const isPaused = ref(false);
const isGameOver = ref(false);
const countDown = ref(3);
const showCountDown = ref(true);

let dropInterval = 800;
let lastTime = 0;
let dropAccum = 0;
let animationId: number;
let durationTimer: any = null; // [新增] 計時器 ID

// --- 持續按鍵檢測 ---
const keysPressed = new Set<string>();
let moveAccum = 0;
let moveDelay = 100; // 橫移延遲（毫秒）
let fastMoveDelay = 50; // 快速橫移延遲
let initialMoveDelay = 150; // 初始延遲

// --- Helper Functions ---
const randomPiece = (): Piece => {
  const keys = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
  const k = keys[Math.floor(Math.random() * keys.length)]!;
  const shapeVariants = SHAPES[k]!;
  return {
    type: k,
    shapeIndex: 0,
    shape: shapeVariants[0]!,
    x: Math.floor(COLS / 2) - Math.ceil(shapeVariants[0]![0]!.length / 2),
    y: -1
  };
};

const cloneGrid = () => Array.from({ length: ROWS }, () => Array(COLS).fill(null));

const collides = (g: any[][], p: Piece, ox = 0, oy = 0) => {
  for (let r = 0; r < p.shape.length; r++) {
    for (let c = 0; c < p.shape[r]!.length; c++) {
      if (p.shape[r]![c]) {
        const x = p.x + c + ox;
        const y = p.y + r + oy;
        if (x < 0 || x >= COLS || y >= ROWS) return true;
        if (y >= 0 && g[y]![x]) return true;
      }
    }
  }
  return false;
};

// --- Drawing Logic ---
const drawCell = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) => {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, size, size);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.fillRect(x + 2, y + 2, size - 4, size / 2);
};

const draw = () => {
  if (!boardCanvas.value) return;
  const ctx = boardCanvas.value.getContext('2d')!;
  const w = boardCanvas.value.width;
  const h = boardCanvas.value.height;
  const cellSize = w / COLS; 

  ctx.fillStyle = '#071018';
  ctx.fillRect(0, 0, w, h);

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r]![c]) {
        drawCell(ctx, c * cellSize, r * cellSize, cellSize, COLORS[grid[r]![c]!]!);
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.strokeRect(c * cellSize, r * cellSize, cellSize, cellSize);
      }
    }
  }

  if (current && !isPaused.value && !isGameOver.value) {
    let ghostY = current.y;
    while (!collides(grid, current, 0, ghostY - current.y + 1)) {
      ghostY++;
    }
    
    ctx.fillStyle = hexWithAlpha(COLORS[current.type]!, 0.2);
    current.shape.forEach((row, r) => {
      row.forEach((val, c) => {
        if (val) {
          ctx.fillRect((current.x + c) * cellSize, (ghostY + r) * cellSize, cellSize, cellSize);
          ctx.strokeRect((current.x + c) * cellSize, (ghostY + r) * cellSize, cellSize, cellSize);
        }
      });
    });

    current.shape.forEach((row, r) => {
      row.forEach((val, c) => {
        if (val) {
          const px = (current.x + c) * cellSize;
          const py = (current.y + r) * cellSize;
          if (py >= -cellSize) {
            drawCell(ctx, px, py, cellSize, COLORS[current.type]!);
          }
        }
      });
    });
  }
};

const hexWithAlpha = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

const drawPreview = (canvas: HTMLCanvasElement | null, p: Piece | null) => {
  if (!canvas) return;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!p) return;
  
  const cellSize = 18;
  const s = p.shape;
  const w = s[0]!.length * cellSize;
  const h = s.length * cellSize;
  const ox = (canvas.width - w) / 2;
  const oy = (canvas.height - h) / 2;

  s.forEach((row, r) => {
    row.forEach((val, c) => {
      if (val) drawCell(ctx, ox + c * cellSize, oy + r * cellSize, cellSize, COLORS[p.type]!);
    });
  });
};

// --- Timer Logic [新增] ---
const startDurationTimer = () => {
  stopDurationTimer(); // 確保不會重複開啟
  durationTimer = setInterval(() => {
    duration.value++;
  }, 1000);
};

const stopDurationTimer = () => {
  if (durationTimer) {
    clearInterval(durationTimer);
    durationTimer = null;
  }
};

// --- Game Logic ---
const lockPiece = () => {
  current.shape.forEach((row, r) => {
    row.forEach((val, c) => {
      if (val && current.y + r >= 0) {
        grid[current.y + r]![current.x + c] = current.type;
      }
    });
  });
  
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (grid[r]!.every(c => c !== null)) {
      grid.splice(r, 1);
      grid.unshift(Array(COLS).fill(null));
      cleared++;
      r++;
    }
  }

  if (cleared > 0) {
    lines.value += cleared;
    score.value += ([0, 100, 300, 500, 800][cleared] ?? 0) * level.value;
    level.value = Math.floor(score.value / 1000) + 1;
    dropInterval = Math.max(100, 800 - (level.value - 1) * 50);
  }

  holdUsed = false;
  current = next;
  next = randomPiece();
  
  if (collides(grid, current)) {
    gameOver();
  }
  
  drawPreview(nextCanvas.value, next);
  drawPreview(holdCanvas.value, hold);
};

const update = (time: number) => {
  if (isPaused.value || isGameOver.value || showCountDown.value) return;
  
  const dt = time - lastTime;
  lastTime = time;
  dropAccum += dt;
  moveAccum += dt;

  // 處理持續按鍵移動
  if (moveAccum > moveDelay) {
    if (keysPressed.has('ArrowLeft')) {
      if (!collides(grid, current, -1, 0)) current.x--;
    }
    if (keysPressed.has('ArrowRight')) {
      if (!collides(grid, current, 1, 0)) current.x++;
    }
    if (keysPressed.has('ArrowDown')) {
      if (!collides(grid, current, 0, 1)) {
        current.y++;
        score.value += 1;
      }
    }
    moveAccum = 0;
  }

  if (dropAccum > dropInterval) {
    if (!collides(grid, current, 0, 1)) {
      current.y++;
    } else {
      lockPiece();
    }
    dropAccum = 0;
  }
  draw();
  animationId = requestAnimationFrame(update);
};

const gameOver = async () => {
  isGameOver.value = true;
  cancelAnimationFrame(animationId);
  stopDurationTimer(); // [新增] 遊戲結束停止計時
  draw(); 
  
  try {
    // 上傳分數到後端
    await submitScore({
      score: score.value,
      level: level.value,
      duration: duration.value
    });
    
    console.log('分數已成功上傳到後端');
    
    // 同時保存到本地作為備份
    const localRec = JSON.parse(localStorage.getItem('tetris_local_records') || '[]');
    localRec.push({ 
      name: localStorage.getItem('username') || 'Player', 
      score: score.value,
      level: level.value,
      duration: duration.value
    });
    localRec.sort((a:any, b:any) => b.score - a.score);
    localStorage.setItem('tetris_local_records', JSON.stringify(localRec));
  } catch (error: any) {
    console.error('上傳分數失敗:', error);
    
    // 如果上傳失敗（例如網路問題或未登入），仍保存到本地
    const localRec = JSON.parse(localStorage.getItem('tetris_local_records') || '[]');
    localRec.push({ 
      name: localStorage.getItem('username') || 'Player', 
      score: score.value,
      level: level.value,
      duration: duration.value
    });
    localRec.sort((a:any, b:any) => b.score - a.score);
    localStorage.setItem('tetris_local_records', JSON.stringify(localRec));
    
    // 如果是因為未登入導致失敗，可以提示用戶
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.warn('未登入或 Token 已過期，分數僅保存在本地');
    }
  }
};

// --- Input Handling ---
const handleKeydown = (e: KeyboardEvent) => {
  // 防止方向鍵和空白鍵造成頁面捲動
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
    e.preventDefault();
  }
  
  if (isGameOver.value || isPaused.value || showCountDown.value) return;
  
  // 避免重複觸發
  if (e.repeat && (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowDown')) return;

  // 方向鍵：加入持續按鍵集合並立即執行一次
  if (e.key === 'ArrowLeft') {
    keysPressed.add('ArrowLeft');
    if (!collides(grid, current, -1, 0)) current.x--;
    moveAccum = 0; // 重置移動累積
  } else if (e.key === 'ArrowRight') {
    keysPressed.add('ArrowRight');
    if (!collides(grid, current, 1, 0)) current.x++;
    moveAccum = 0;
  } else if (e.key === 'ArrowDown') {
    keysPressed.add('ArrowDown');
    if (!collides(grid, current, 0, 1)) {
      current.y++;
      score.value += 1;
    }
    moveAccum = 0;
  } else if (e.key === 'ArrowUp') {
    const variants = SHAPES[current.type];
    if (variants && variants.length > 0) {
      const nextIdx = (current.shapeIndex + 1) % variants.length;
      const nextShape = variants[nextIdx]!;
      if (!collides(grid, { ...current, shape: nextShape })) {
        current.shape = nextShape;
        current.shapeIndex = nextIdx;
      } else if (!collides(grid, { ...current, shape: nextShape, x: current.x - 1 })) {
        current.x--;
        current.shape = nextShape;
        current.shapeIndex = nextIdx;
      } else if (!collides(grid, { ...current, shape: nextShape, x: current.x + 1 })) {
        current.x++;
        current.shape = nextShape;
        current.shapeIndex = nextIdx;
      }
    }
  } else if (e.key === ' ') {
    while (!collides(grid, current, 0, 1)) {
      current.y++;
      score.value += 2;
    }
    lockPiece();
  } else if (e.key === 'c' || e.key === 'C') {
    if (!holdUsed) {
      if (!hold) {
        hold = { type: current.type, shapeIndex: 0, shape: SHAPES[current.type]![0]!, x:0, y:0 };
        current = next;
        next = randomPiece();
      } else {
        const temp = { type: current.type, shapeIndex: 0, shape: SHAPES[current.type]![0]!, x:0, y:0 };
        current = { ...hold, x: Math.floor(COLS/2)-1, y: -1 };
        hold = temp;
      }
      holdUsed = true;
      drawPreview(holdCanvas.value, hold);
      drawPreview(nextCanvas.value, next);
    }
  }
  draw();
};

const handleKeyup = (e: KeyboardEvent) => {
  // 移除持續按鍵
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    keysPressed.delete(e.key);
  }
};

const pauseGame = () => {
  isPaused.value = true;
  stopDurationTimer(); // [新增] 暫停時停止計時
};

const resumeGame = () => {
  if (!isPaused.value) return;
  
  showCountDown.value = true;
  countDown.value = 3;
  const timer = setInterval(() => {
    countDown.value--;
    if (countDown.value <= 0) {
      clearInterval(timer);
      showCountDown.value = false;
      isPaused.value = false;
      startDurationTimer(); // [新增] 恢復時重新開始計時
      lastTime = performance.now();
      dropAccum = 0;
      animationId = requestAnimationFrame(update);
    }
  }, 1000);
};

const initGame = () => {
  grid = cloneGrid();
  current = randomPiece();
  next = randomPiece();
  hold = null;
  holdUsed = false;
  score.value = 0;
  level.value = 1;
  lines.value = 0;
  duration.value = 0; // [新增] 重置時間
  isGameOver.value = false;
  isPaused.value = false;
  
  if (boardCanvas.value) {
    boardCanvas.value.width = 300; 
    boardCanvas.value.height = 600;
  }
  
  drawPreview(nextCanvas.value, next);
  
  showCountDown.value = true;
  countDown.value = 3;
  const timer = setInterval(() => {
    countDown.value--;
    if (countDown.value <= 0) {
      clearInterval(timer);
      showCountDown.value = false;
      startDurationTimer(); // [新增] 倒數結束開始計時
      lastTime = performance.now();
      animationId = requestAnimationFrame(update);
    }
  }, 1000);
};

onMounted(() => {
  initGame();
  window.addEventListener('keydown', handleKeydown);
  window.addEventListener('keyup', handleKeyup);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('keyup', handleKeyup);
  cancelAnimationFrame(animationId);
  stopDurationTimer(); // [新增] 組件卸載時清除計時器
});
</script>

<template>
  <div class="game-wrapper">
    <!-- 主遊戲區 -->
    <canvas ref="boardCanvas" class="main-board"></canvas>
    
    <!-- HUD 資訊面板 -->
    <div class="hud">
      <div class="hud-panel small-panel">
        <span class="label">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 2v4"></path>
            <path d="M15 2v4"></path>
            <rect x="3" y="4" width="18" height="18" rx="2"></rect>
            <path d="M3 10h18"></path>
          </svg>
          HOLD (C)
        </span>
        <canvas ref="holdCanvas" width="80" height="60"></canvas>
      </div>
      
      <div class="hud-panel info-panel">
        <div class="info-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
          <div>
            <div class="label">SCORE</div>
            <div class="value">{{ score.toLocaleString() }}</div>
          </div>
        </div>
        
        <div class="info-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 6v6l4 2"></path>
          </svg>
          <div>
            <div class="label">TIME</div>
            <div class="value">{{ duration }}s</div>
          </div>
        </div>
        
        <div class="info-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m16 3 4 4-4 4"></path>
            <path d="M20 7H4"></path>
            <path d="m8 21-4-4 4-4"></path>
            <path d="M4 17h16"></path>
          </svg>
          <div>
            <div class="label">LEVEL</div>
            <div class="value">{{ level }}</div>
          </div>
        </div>
        
        <div class="info-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="4" y1="9" x2="20" y2="9"></line>
            <line x1="4" y1="15" x2="20" y2="15"></line>
            <line x1="10" y1="3" x2="8" y2="21"></line>
            <line x1="16" y1="3" x2="14" y2="21"></line>
          </svg>
          <div>
            <div class="label">LINES</div>
            <div class="value">{{ lines }}</div>
          </div>
        </div>
      </div>

      <div class="hud-panel small-panel">
        <span class="label">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14"></path>
            <path d="m12 5 7 7-7 7"></path>
          </svg>
          NEXT
        </span>
        <canvas ref="nextCanvas" width="80" height="60"></canvas>
      </div>

      <div class="controls">
        <button v-if="isGameOver" @click="initGame" class="primary-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"></path>
          </svg>
          再玩一次
        </button>
        <button v-else-if="isPaused" @click="resumeGame" class="secondary-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          繼續
        </button>
        <button v-else @click="pauseGame" class="secondary-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="6" y="4" width="4" height="16"></rect>
            <rect x="14" y="4" width="4" height="16"></rect>
          </svg>
          暫停
        </button>
        <button @click="router.push('/lobby')" class="secondary-btn exit-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          離開
        </button>
      </div>
    </div>

    <!-- 倒數遮罩 -->
    <div v-if="showCountDown" class="overlay">
      <div class="countdown-circle">
        <span class="count-text">{{ countDown }}</span>
      </div>
    </div>

    <!-- 遊戲結束遮罩 -->
    <div v-if="isGameOver" class="overlay">
      <div class="game-over-panel">
        <svg class="game-over-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
        <h2 class="game-over-title">GAME OVER</h2>
        <div class="game-over-stats">
          <div class="stat-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            <div>
              <span class="stat-label">SCORE</span>
              <span class="stat-value">{{ score.toLocaleString() }}</span>
            </div>
          </div>
          <div class="stat-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M12 6v6l4 2"></path>
            </svg>
            <div>
              <span class="stat-label">TIME</span>
              <span class="stat-value">{{ duration }}s</span>
            </div>
          </div>
        </div>
        <div class="game-over-actions">
          <button @click="initGame" class="primary-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"></path>
            </svg>
            重試
          </button>
          <button @click="router.push('/leaderboard')" class="secondary-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
              <path d="M4 22h16"></path>
              <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
              <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
            </svg>
            排行榜
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.game-wrapper {
  min-height: 100vh;
  display: flex;
  flex-direction: row;
  gap: 2rem;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.main-board {
  width: 300px;
  height: 600px;
  background: rgba(10, 14, 20, 0.8);
  border-radius: 1rem;
  box-shadow: 
    0 0 0 1px rgba(255, 107, 53, 0.2),
    0 20px 50px rgba(0, 0, 0, 0.5),
    0 0 80px rgba(255, 107, 53, 0.15);
  border: 1px solid rgba(255, 107, 53, 0.3);
}

.hud {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 160px;
}

.hud-panel {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 0.75rem;
  padding: 1rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.hud-panel:hover {
  background: rgba(255, 107, 53, 0.05);
  border-color: rgba(255, 107, 53, 0.2);
}

.small-panel {
  padding: 0.75rem;
}

.small-panel .label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.4);
  font-weight: 700;
  margin-bottom: 0.75rem;
  letter-spacing: 1.5px;
}

.small-panel .label svg {
  width: 14px;
  height: 14px;
  stroke-width: 2.5;
  color: var(--accent);
}

.small-panel canvas {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.info-panel {
  gap: 1rem;
  padding: 1.25rem 1rem;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.info-item svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  color: var(--accent);
  stroke-width: 2.5;
}

.info-item > div {
  flex: 1;
  text-align: left;
}

.label {
  display: block;
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.4);
  font-weight: 700;
  margin-bottom: 0.25rem;
  letter-spacing: 1.5px;
}

.value {
  font-size: 1.25rem;
  color: #fff;
  font-weight: 800;
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.controls button {
  width: 100%;
  padding: 0.75rem 1rem;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.controls button svg {
  width: 16px;
  height: 16px;
}

.exit-btn {
  margin-top: 0.5rem;
}

.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(10px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.countdown-circle {
  width: 180px;
  height: 180px;
  border-radius: 50%;
  background: rgba(255, 107, 53, 0.1);
  border: 4px solid var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 
    0 0 60px rgba(255, 107, 53, 0.4),
    inset 0 0 40px rgba(255, 107, 53, 0.1);
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 
      0 0 60px rgba(255, 107, 53, 0.4),
      inset 0 0 40px rgba(255, 107, 53, 0.1);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 
      0 0 80px rgba(255, 107, 53, 0.6),
      inset 0 0 60px rgba(255, 107, 53, 0.2);
  }
}

.count-text {
  font-size: 5rem;
  font-weight: 900;
  color: var(--accent);
  text-shadow: 0 0 40px rgba(255, 107, 53, 0.8);
}

.game-over-panel {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 1.5rem;
  padding: 3rem 2.5rem;
  max-width: 450px;
  width: 90%;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  animation: slideUp 0.4s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.game-over-icon {
  width: 80px;
  height: 80px;
  color: var(--accent);
  margin: 0 auto 1.5rem;
  filter: drop-shadow(0 0 20px rgba(255, 107, 53, 0.5));
  animation: shake 0.5s ease;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-10px); }
  75% { transform: translateX(10px); }
}

.game-over-title {
  font-size: 2.5rem;
  font-weight: 900;
  margin: 0 0 2rem 0;
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 3px;
}

.game-over-stats {
  display: flex;
  gap: 2rem;
  justify-content: center;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: rgba(255, 107, 53, 0.05);
  border-radius: 1rem;
  border: 1px solid rgba(255, 107, 53, 0.1);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.stat-item svg {
  width: 32px;
  height: 32px;
  color: var(--accent);
  flex-shrink: 0;
}

.stat-item > div {
  text-align: left;
}

.stat-label {
  display: block;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.4);
  font-weight: 700;
  margin-bottom: 0.25rem;
  letter-spacing: 1.5px;
}

.stat-value {
  display: block;
  font-size: 1.75rem;
  font-weight: 800;
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.game-over-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.game-over-actions button {
  width: 100%;
  padding: 1rem 1.5rem;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

.game-over-actions button svg {
  width: 18px;
  height: 18px;
}

@media (max-width: 768px) {
  .game-wrapper {
    flex-direction: column;
    padding: 1rem;
  }

  .main-board {
    width: 240px;
    height: 480px;
  }

  .hud {
    width: 100%;
    max-width: 400px;
  }

  .info-panel {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .game-over-panel {
    padding: 2rem 1.5rem;
  }

  .game-over-stats {
    flex-direction: column;
    gap: 1rem;
  }

  .game-over-title {
    font-size: 2rem;
  }

  .count-text {
    font-size: 4rem;
  }

  .countdown-circle {
    width: 150px;
    height: 150px;
  }
}
</style>
