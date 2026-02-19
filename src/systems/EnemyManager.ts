import * as THREE from 'three';
import { vfxManager } from './VfxManager';
import { soundManager } from './SoundManager';

interface EnemyData {
  group: THREE.Group;
  hp: number;
  knockbackVel: THREE.Vector3;
  kind: 'normal' | 'blue_boss';
}

export class EnemyManager {
  private scene: THREE.Scene;
  public enemies: EnemyData[] = [];
  public onDropItem: ((type: string, pos: THREE.Vector3) => void) | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public spawnEnemy(position: THREE.Vector3) {
    const group = new THREE.Group();
    const geo = new THREE.SphereGeometry(0.6, 8, 8); // 怪物稍微变大一点
    const mat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const mesh = new THREE.Mesh(geo, mat);
    
    group.add(mesh);
    group.position.copy(position);
    group.position.y = 1.0;
    
    this.scene.add(group);
    this.enemies.push({
      group: group,
      hp: 100, // 增加生命值
      knockbackVel: new THREE.Vector3(),
      kind: 'normal'
    });
  }

  public spawnBlueBoss(position: THREE.Vector3) {
    const group = new THREE.Group();
    const geo = new THREE.DodecahedronGeometry(1.2, 0); 
    const mat = new THREE.MeshBasicMaterial({ color: 0x0066ff }); // 鲜艳蓝色
    const mesh = new THREE.Mesh(geo, mat);
    
    group.add(mesh);
    group.position.copy(position);
    group.position.y = 1.5;
    
    this.scene.add(group);
    this.enemies.push({
      group: group,
      hp: 300, // Boss 更厚
      knockbackVel: new THREE.Vector3(),
      kind: 'blue_boss'
    });
    console.log('[EnemyManager] Blue Boss spawned!');
  }

  public checkHit(attackPos: THREE.Vector3, range: number, attackerPos: THREE.Vector3): number {
    let killCount = 0;
    const damage = 40; // 每次攻击扣 40 血，3刀死

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      const dist = attackPos.distanceTo(enemy.group.position);
      
      if (dist < range) {
        // 1. 扣血
        enemy.hp -= damage;
        
        // 2. 击退效果：减半处理
        const kbDir = new THREE.Vector3().subVectors(enemy.group.position, attackerPos).setY(0).normalize();
        enemy.knockbackVel.addScaledVector(kbDir, 0.75); // 冲力下调至 0.75

        // 3. 反馈特效
        vfxManager.createBurst(this.scene, enemy.group.position, 0xffffff, 10);
        
        if (enemy.hp <= 0) {
          // 如果是蓝色 Boss，掉落冰霜之心
          if (enemy.kind === 'blue_boss' && this.onDropItem) {
            this.onDropItem('Frost_Heart', enemy.group.position.clone());
          }

          vfxManager.createBurst(this.scene, enemy.group.position, enemy.kind === 'blue_boss' ? 0x00ccff : 0xff0000, 30);
          this.scene.remove(enemy.group);
          this.enemies.splice(i, 1);
          killCount++;
        }
      }
    }
    return killCount;
  }

  public update(playerPos: THREE.Vector3, dt: number) {
    const speed = 2.0;
    const bodyRadius = 1.0;

    this.enemies.forEach(enemy => {
      // A. 击退衰减处理
      enemy.group.position.add(enemy.knockbackVel);
      enemy.knockbackVel.multiplyScalar(0.85); // 摩擦力衰减

      // B. 正常追踪逻辑
      const dir = new THREE.Vector3().subVectors(playerPos, enemy.group.position).normalize();
      const dist = enemy.group.position.distanceTo(playerPos);

      if (dist > bodyRadius) {
        // 只有在击退力较小时才恢复追踪能力
        if (enemy.knockbackVel.length() < 0.1) {
          enemy.group.position.addScaledVector(dir, speed * dt);
        }
      }

      enemy.group.rotation.x += dt * 5;
      enemy.group.rotation.y += dt * 5;
    });
  }
}
