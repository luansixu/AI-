import './style.css'
import { Game } from './core/Game'

// 移除 DOMContentLoaded 包装，直接初始化
// Vite 确保了脚本在 DOM 准备好后执行
(window as any).game = new Game();
console.log('Need-Chain Prototype Initialized (Direct).');
