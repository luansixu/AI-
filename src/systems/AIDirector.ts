import * as THREE from 'three';
import { Player } from '../entities/Player';
import { EnemyManager } from './EnemyManager';
import { Item } from '../entities/Item';
import { soundManager } from './SoundManager';
import { vfxManager } from './VfxManager';
import { feedbackManager } from './FeedbackManager'; // 引入反馈系统

export class AIDirector {
  private player: Player;
  private enemyMgr: EnemyManager;
  private scene: THREE.Scene;
  private items: Item[];
  private lastAssessTime = 0;
  private assessInterval = 2.0;

  private hasPunishedGreed = false;
  private hasGrantedMercy = false;

  constructor(player: Player, enemyMgr: EnemyManager, scene: THREE.Scene, items: Item[]) {
    this.player = player;
    this.enemyMgr = enemyMgr;
    this.scene = scene;
    this.items = items;
  }

  public update(time: number) {
    // 修复测试时的逻辑死锁：如果传入时间远大于记录时间，强制重置
    if (time < this.lastAssessTime) this.lastAssessTime = time;

    if (time - this.lastAssessTime > this.assessInterval) {
      this.assess();
      this.lastAssessTime = time;
    }
  }

  private assess() {
    const s = this.player.state;

    // 剧本 A: 物极必反
    if (!this.hasPunishedGreed && s.greed > 25 && s.holding?.config.type === 'Heavy_Sword') {
      this.triggerGreedPunishment();
      this.hasPunishedGreed = true; 
    }

    // 剧本 B: 绝地生机
    if (!this.hasGrantedMercy && s.temp < 40) {
      this.triggerMercy();
      this.hasGrantedMercy = true;
    }

    // 剧本 C: 惊扰爆发 (Alert > 80)
    if (s.alert > 80) {
      this.triggerAlertPunishment();
      this.player.state.alert = 0; 
    }
  }

  private triggerGreedPunishment() {
    soundManager.playWarning();
    for (let i = 0; i < 3; i++) {
      const offset = new THREE.Vector3((Math.random()-0.5)*15, 0, (Math.random()-0.5)*15);
      const spawnPos = this.player.mesh.position.clone().add(offset);
      this.enemyMgr.spawnEnemy(spawnPos);
      vfxManager.createBurst(this.scene, spawnPos, 0xff0000, 15);
    }
    // 改用 UI 提示
    feedbackManager.showMeme("“拿得太多，走得太慢……年兽追上你了！”", 4000);
  }

  private triggerMercy() {
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.player.mesh.quaternion);
    const spawnPos = this.player.mesh.position.clone().add(forward.multiplyScalar(5));
    
    const fire = new Item({ type: 'Heat_Source', color: 0xffaa00, weight: 0 }, spawnPos);
    this.scene.add(fire.mesh);
    this.items.push(fire);
    
    this.player.state.alert = 100;
    
    soundManager.playPickup();
    vfxManager.createBurst(this.scene, spawnPos, 0xffaa00, 20);
    // 改用 UI 提示
    feedbackManager.showMeme("“这是最后的仁慈……但在火光中，你也暴露了自己。”", 4000);
    feedbackManager.showBanner("生存施舍：AI 投放了临时火堆，但引来了怪物！");
  }

  private triggerAlertPunishment() {
    soundManager.playWarning();
    for (let i = 0; i < 2; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 20;
      const spawnPos = this.player.mesh.position.clone().add(
        new THREE.Vector3(Math.cos(angle) * dist, 0, Math.sin(angle) * dist)
      );
      this.enemyMgr.spawnEnemy(spawnPos);
      vfxManager.createBurst(this.scene, spawnPos, 0xff0000, 10);
    }
    feedbackManager.showMeme("“你的行踪已经彻底暴露……”", 3000);
  }
}
