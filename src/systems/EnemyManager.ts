import * as THREE from 'three';
import { vfxManager } from './VfxManager';
import { soundManager } from './SoundManager';

interface EnemyData {
  group: THREE.Group;
  hp: number;
  knockbackVel: THREE.Vector3;
  kind: 'normal' | 'blue_boss';
  lastAttack: number;
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
    const geo = new THREE.SphereGeometry(0.6, 8, 8); 
    const mat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const mesh = new THREE.Mesh(geo, mat);
    
    group.add(mesh);
    group.position.copy(position);
    group.position.y = 1.0;
    
    this.scene.add(group);
    this.enemies.push({
      group: group,
      hp: 100, 
      knockbackVel: new THREE.Vector3(),
      kind: 'normal',
      lastAttack: 0
    });
  }

  public spawnBlueBoss(position: THREE.Vector3) {
    const group = new THREE.Group();
    const geo = new THREE.DodecahedronGeometry(1.2, 0); 
    const mat = new THREE.MeshBasicMaterial({ color: 0x0066ff });
    const mesh = new THREE.Mesh(geo, mat);
    
    group.add(mesh);
    group.position.copy(position);
    group.position.y = 1.5;
    
    this.scene.add(group);
    this.enemies.push({
      group: group,
      hp: 300,
      knockbackVel: new THREE.Vector3(),
      kind: 'blue_boss',
      lastAttack: 0
    });
    console.log('[EnemyManager] Blue Boss spawned!');
  }

  public checkHit(attackPos: THREE.Vector3, range: number, attackerPos: THREE.Vector3): number {
    let killCount = 0;
    const damage = 40; 

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      const dist = attackPos.distanceTo(enemy.group.position);
      
      if (dist < range) {
        enemy.hp -= damage;
        const kbDir = new THREE.Vector3().subVectors(enemy.group.position, attackerPos).setY(0).normalize();
        enemy.knockbackVel.addScaledVector(kbDir, 0.75); 

        vfxManager.createBurst(this.scene, enemy.group.position, 0xffffff, 10);
        
        if (enemy.hp <= 0) {
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

  // 新增：自动攻击逻辑
  public update(playerPos: THREE.Vector3, dt: number, onAttack: (damage: number) => void, currentTime: number) {
    const speed = 2.0;
    const bodyRadius = 1.0;

    this.enemies.forEach(enemy => {
      enemy.group.position.add(enemy.knockbackVel);
      enemy.knockbackVel.multiplyScalar(0.85);

      const dir = new THREE.Vector3().subVectors(playerPos, enemy.group.position).normalize();
      const dist = enemy.group.position.distanceTo(playerPos);

      // 追踪与碰撞
      if (dist > bodyRadius) {
        if (enemy.knockbackVel.length() < 0.1) {
          enemy.group.position.addScaledVector(dir, speed * dt);
        }
      }

      // 攻击判定：靠近玩家时自动攻击
      const attackRange = enemy.kind === 'blue_boss' ? 2.5 : 1.5;
      const attackCooldown = enemy.kind === 'blue_boss' ? 1.2 : 1.5;
      const damage = enemy.kind === 'blue_boss' ? 20 : 10;

      if (dist < attackRange) {
        if (currentTime - enemy.lastAttack > attackCooldown) {
          onAttack(damage);
          soundManager.playWarning();
          enemy.lastAttack = currentTime;
          // 攻击时的视觉反馈
          vfxManager.createBurst(this.scene, enemy.group.position, 0xffffff, 5);
        }
      }

      enemy.group.rotation.x += dt * 5;
      enemy.group.rotation.y += dt * 5;
    });
  }
}
