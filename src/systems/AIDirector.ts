import * as THREE from 'three';
import { Player } from '../entities/Player';
import { EnemyManager } from './EnemyManager';
import { Item } from '../entities/Item';
import { Stela } from '../entities/Stela';
import { soundManager } from './SoundManager';
import { vfxManager } from './VfxManager';
import { feedbackManager } from './FeedbackManager';

export class AIDirector {
  private player: Player;
  private enemyMgr: EnemyManager;
  private scene: THREE.Scene;
  private items: Item[];
  private stelae: Stela[] = [];
  private lastAssessTime = 0;
  private assessInterval = 4.0;

  // 进度标志
  private hasWarnedAboutFur = false;
  private hasSpawnedBossOnce = false;
  private hasSpawnedMoltenCore = false;

  constructor(player: Player, enemyMgr: EnemyManager, scene: THREE.Scene, items: Item[]) {
    this.player = player;
    this.enemyMgr = enemyMgr;
    this.scene = scene;
    this.items = items;
  }

  public registerStelae(stelae: Stela[]) {
    this.stelae = stelae;
  }

  public update(time: number) {
    if (time < this.lastAssessTime) this.lastAssessTime = time;
    if (time - this.lastAssessTime > this.assessInterval) {
      this.assess(time);
      this.lastAssessTime = time;
    }
  }

  private assess(currentTime: number) {
    const s = this.player.state;
    const inv = s.inventory;

    // 逻辑 A：新手生产指引 (皮衣解锁)
    if (!this.hasWarnedAboutFur && inv.fur >= 2 && inv.leatherCoat === 0) {
      this.updateStelae("“羊皮不仅是战利品，更是对抗严寒的甲胄（按 I 合成皮衣）。”");
      feedbackManager.showMeme("“你似乎可以利用这些皮毛做点什么……”", 4000);
      this.hasWarnedAboutFur = true;
    }

    // 逻辑 B：引导挑战冰霜守卫 (获取冰霜之心)
    if (!this.hasSpawnedBossOnce && s.holding?.config.type === 'Heavy_Sword' && inv.leatherCoat > 0) {
      this.triggerBossEvent();
      this.hasSpawnedBossOnce = true;
    }

    // 逻辑 C：交叉引导 (在冰原生成熔火核心)
    // 只有拿到了圣剑且穿了皮衣，AI 才在冰原投放去烈焰区的门票
    if (!this.hasSpawnedMoltenCore && inv.leatherCoat > 0 && s.holding) {
      this.spawnMoltenCoreInIceZone();
      this.hasSpawnedMoltenCore = true;
    }
  }

  private triggerBossEvent() {
    const angle = Math.random() * Math.PI * 2;
    const spawnPos = this.player.mesh.position.clone().add(
      new THREE.Vector3(Math.cos(angle) * 20, 0, Math.sin(angle) * 20)
    );
    this.enemyMgr.spawnBlueBoss(spawnPos);
    
    const direction = spawnPos.x > 0 ? "东北方" : "西南方";
    feedbackManager.showBanner(`${direction}吹来了一阵强烈的寒风，这不太正常...`);
    this.updateStelae(`“冰霜守卫已经在${direction}苏醒，它的心脏能让你彻底无视严寒。”`);
  }

  private spawnMoltenCoreInIceZone() {
    // 强制生成在极寒区深处 (右上)
    const pos = new THREE.Vector3(70, 0, -70);
    const item = new Item({ type: 'Molten_Core', color: 0xff4400, weight: 0 }, pos);
    (item.mesh as any).isDynamic = true;
    this.scene.add(item.mesh);
    this.items.push(item);
    
    vfxManager.createBurst(this.scene, pos.clone().setY(5), 0xff4400, 10);
    this.updateStelae("“在极北的冰层之下，埋藏着通往熔岩之地的红热核心。”");
    console.log("[AI-DM] Molten Core spawned in Ice Zone.");
  }

  private updateStelae(text: string) {
    this.stelae.forEach(s => s.setContent(text));
  }
}
