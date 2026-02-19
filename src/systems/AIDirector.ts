import * as THREE from 'three';
import { Player } from '../entities/Player';
import { EnemyManager } from './EnemyManager';
import { Item } from '../entities/Item';
import { Stela } from '../entities/Stela';
import { soundManager } from './SoundManager';
import { vfxManager } from './VfxManager';
import { feedbackManager } from './FeedbackManager';

// 定义干预类型
type InterventionType = 'SURVIVAL_RESCUE' | 'GREED_TEST' | 'CURIOSITY_GUIDE' | 'NONE';

export class AIDirector {
  private player: Player;
  private enemyMgr: EnemyManager;
  private scene: THREE.Scene;
  private items: Item[];
  private stelae: Stela[] = [];
  private lastAssessTime = 0;
  private assessInterval = 4.0; // AI思考周期

  // 记忆系统
  private activeIntervention: InterventionType = 'NONE';
  private cooldowns: Record<string, number> = {};

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
      this.loop(time);
      this.lastAssessTime = time;
    }
  }

  /**
   * AI-DM 核心循环：分析 -> 决策 -> 执行
   */
  private loop(currentTime: number) {
    // 1. 分析层 (Analysis)
    const analysis = this.analyzePlayerState();
    console.log("[AI-DM Analysis]", analysis);

    // 2. 决策层 (Decision)
    const nextStep = this.decideNextIntervention(analysis, currentTime);

    // 3. 执行层 (Execution)
    if (nextStep !== 'NONE') {
      this.executeIntervention(nextStep, currentTime);
    }
  }

  private analyzePlayerState() {
    const s = this.player.state;
    return {
      isFreezing: s.temp < 35,
      isStarving: s.hunger < 30,
      isHeavy: s.holding?.config.type === 'Heavy_Sword',
      isAimless: s.stamina > 90 && !this.player.isAttacking, // 体力充沛但无所事事
      dangerLevel: (100 - s.hp) / 100
    };
  }

  private decideNextIntervention(analysis: any, time: number): InterventionType {
    // 优先级排序：生存拯救 > 贪婪考验 > 好奇引导
    
    if (analysis.isFreezing || analysis.isStarving) {
      if (!this.isOnCooldown('rescue', time)) return 'SURVIVAL_RESCUE';
    }

    if (analysis.isHeavy && !this.isOnCooldown('greed', time)) {
      return 'GREED_TEST';
    }

    if (analysis.isAimless && !this.isOnCooldown('curiosity', time)) {
      return 'CURIOSITY_GUIDE';
    }

    return 'NONE';
  }

  private executeIntervention(type: InterventionType, time: number) {
    this.activeIntervention = type;
    
    switch (type) {
      case 'SURVIVAL_RESCUE':
        this.handleRescue(time);
        break;
      case 'GREED_TEST':
        this.handleGreedChallenge(time);
        break;
      case 'CURIOSITY_GUIDE':
        this.handleDiscovery(time);
        break;
    }
  }

  // --- 具体剧本实现 ---

  private handleRescue(time: number) {
    this.setCooldown('rescue', time, 60);
    const s = this.player.state;

    if (s.temp < 35) {
      // 投放火堆 (已经在阶段三实现过逻辑，这里重构为隐性引导)
      this.spawnHiddenResource('Heat_Source', 0xffaa00);
      this.updateStelae("“在严寒夺走你最后一口气前，去追寻那道琥珀色的光……”");
      feedbackManager.showMeme("“你听见木柴在风中噼啪作响……”", 3000);
    } else if (s.hunger < 30) {
      // 投放大量浆果
      this.spawnHiddenResource('Berry', 0xff0044);
      this.updateStelae("“荒野并非只有贫瘠，在乱石的阴影下，红色的馈赠正在成熟。”");
      feedbackManager.showMeme("“空气中飘来一阵酸甜的香气……”", 3000);
    }
  }

  private handleGreedChallenge(time: number) {
    this.setCooldown('greed', time, 45);
    // 生成精英怪
    const spawnPos = this.getDistantPosition(30);
    this.enemyMgr.spawnBlueBoss(spawnPos);
    this.updateStelae("“沉重的铁块不仅能杀敌，也会成为招致灾厄的磁石。”");
    feedbackManager.showMeme("“某种古老的东西正在地底苏醒……”", 4000);
  }

  private handleDiscovery(time: number) {
    this.setCooldown('curiosity', time, 30);
    // 仅仅是改变线索，引导探索
    this.updateStelae("“如果你在寻找终点，那便错了。这片荒野本身就是一场考验。”");
    // 产生一个远处的随机视觉预兆
    const omenPos = this.getDistantPosition(40);
    vfxManager.createBurst(this.scene, omenPos.setY(5), 0xffffff, 5);
  }

  // --- 工具方法 ---

  private spawnHiddenResource(type: any, color: number) {
    const pos = this.getDistantPosition(35);
    const item = new Item({ type, color, weight: 0 }, pos);
    (item.mesh as any).isDynamic = true;
    this.scene.add(item.mesh);
    this.items.push(item);
    // 视觉预兆
    vfxManager.createBurst(this.scene, pos.clone().setY(8), color, 3);
  }

  private getDistantPosition(dist: number): THREE.Vector3 {
    const angle = Math.random() * Math.PI * 2;
    return this.player.mesh.position.clone().add(
      new THREE.Vector3(Math.cos(angle) * dist, 0, Math.sin(angle) * dist)
    );
  }

  private updateStelae(text: string) {
    this.stelae.forEach(s => s.setContent(text));
  }

  private setCooldown(key: string, time: number, duration: number) {
    this.cooldowns[key] = time + duration;
  }

  private isOnCooldown(key: string, time: number): boolean {
    return (this.cooldowns[key] || 0) > time;
  }
}
