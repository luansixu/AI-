import { Player } from '../entities/Player';
import { AIDirector } from './AIDirector';

export class AutoTester {
  private player: Player;
  private director: AIDirector;

  constructor(player: Player, director: AIDirector) {
    this.player = player;
    this.director = director;
    (window as any).StartAutoTest = () => this.run();
  }

  public run() {
    console.log('🧪 [AutoTester] Starting Robust Verification...');

    // 模拟温标骤降
    this.player.state.temp = 10; 
    
    // 不要手动调用 director.update(9999)，让主循环自己跑
    // 我们只需要等待几秒钟，主循环就会发现 temp < 40
    
    let checkCount = 0;
    const interval = setInterval(() => {
      checkCount++;
      if (this.player.state.alert >= 100) {
        console.log('✅ Logic PASS: AI Mercy Triggered!');
        clearInterval(interval);
      }
      if (checkCount > 50) {
        console.error('❌ Logic FAIL: AI did not respond after 5 seconds.');
        clearInterval(interval);
      }
    }, 100);
  }
}
