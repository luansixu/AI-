import * as THREE from 'three';
import { Item } from './Item';

export interface PlayerState {
  hp: number;
  maxHp: number;
  temp: number;
  stamina: number;
  greed: number;
  alert: number;
  holding: Item | null;
}

export class Player {
  public mesh: THREE.Group;
  public state: PlayerState = {
    hp: 100,
    maxHp: 100,
    temp: 100,
    stamina: 100,
    greed: 0,
    alert: 0,
    holding: null
  };

  private baseSpeed = 0.2; 
  private runMultiplier = 1.8;
  
  public isAttacking = false;
  private attackTimer = 0;
  private attackDuration = 0.25; // 稍微加快攻击节奏

  constructor() {
    this.mesh = new THREE.Group();
    const geometry = new THREE.CapsuleGeometry(0.5, 1, 4, 8);
    const material = new THREE.MeshStandardMaterial({ color: 0xff2222 }); // 提高玩家颜色饱和度
    const capsule = new THREE.Mesh(geometry, material);
    capsule.position.y = 1;
    capsule.castShadow = true;
    this.mesh.add(capsule);
    this.mesh.position.set(40, 0, 40);
  }

  public takeDamage(amount: number) {
    this.state.hp = Math.max(0, this.state.hp - amount);
    const overlay = document.querySelector('.hit-overlay');
    if (overlay) {
      overlay.classList.add('flash');
      setTimeout(() => overlay.classList.remove('flash'), 100);
    }
  }

  public hold(item: Item) {
    if (this.state.holding) {
      this.mesh.remove(this.state.holding.mesh);
    }
    this.state.holding = item;
    // 修正手持位置：平端剑身
    this.state.holding.mesh.position.set(0.8, 1.0, 0.5); 
    this.state.holding.mesh.rotation.set(0, 0, Math.PI / 2); // 剑尖指向侧前方
    this.mesh.add(this.state.holding.mesh);
    this.state.greed = Math.min(100, this.state.greed + 20);
  }

  public attack(): boolean {
    if (this.isAttacking || this.state.stamina < 20) return false;
    this.isAttacking = true;
    this.attackTimer = this.attackDuration;
    this.state.stamina -= 20;
    this.state.alert = Math.min(100, this.state.alert + 15);
    return true;
  }

  public update(keys: Set<string>, dt: number, envObjects: {pos: THREE.Vector3, radius: number}[]) {
    this.state.temp = Math.max(0, this.state.temp - 0.5 * dt);

    let currentSpeed = this.baseSpeed;
    if (this.state.holding?.config.type === 'Heavy_Sword') {
      currentSpeed *= 0.4;
    }

    let moveX = 0;
    let moveZ = 0;
    if (keys.has('KeyW')) moveZ -= 1;
    if (keys.has('KeyS')) moveZ += 1;
    if (keys.has('KeyA')) moveX -= 1;
    if (keys.has('KeyD')) moveX += 1;

    const isRunning = keys.has('ShiftLeft') && this.state.stamina > 0;
    const finalSpeed = isRunning ? currentSpeed * this.runMultiplier : currentSpeed;

    if (moveX !== 0 || moveZ !== 0) {
      const length = Math.sqrt(moveX * moveX + moveZ * moveZ);
      const dx = (moveX / length) * finalSpeed;
      const dz = (moveZ / length) * finalSpeed;
      
      const nextPos = this.mesh.position.clone();
      nextPos.x += dx;
      nextPos.z += dz;

      let blocked = false;
      for (const obj of envObjects) {
        const dist = nextPos.distanceTo(obj.pos);
        if (dist < (obj.radius + 0.5)) { 
          blocked = true;
          break;
        }
      }

      if (!blocked) {
        this.mesh.position.copy(nextPos);
      }

      if (!this.isAttacking) {
        this.mesh.rotation.y = Math.atan2(dx, dz);
      }

      if (isRunning) {
        const staminaCost = this.state.holding ? 40 : 20;
        this.state.stamina = Math.max(0, this.state.stamina - staminaCost * dt);
        this.state.alert = Math.min(100, this.state.alert + 10 * dt);
      } else {
        this.state.stamina = Math.min(100, this.state.stamina + 15 * dt);
      }
    } else {
      this.state.stamina = Math.min(100, this.state.stamina + 30 * dt);
    }

    // 斩击动画逻辑：水平横扫 (Around Y axis)
    if (this.isAttacking && this.state.holding) {
      this.attackTimer -= dt;
      const progress = 1 - (this.attackTimer / this.attackDuration);
      
      // 120° 水平旋转
      const sweepRange = Math.PI * 2 / 3;
      const currentYaw = -sweepRange / 2 + sweepRange * progress;
      
      this.state.holding.mesh.rotation.y = currentYaw;
      this.state.holding.mesh.rotation.x = 0; // 强制保持水平，不上下摆动
      this.state.holding.mesh.rotation.z = Math.PI / 2; // 保持剑身平端

      if (this.attackTimer <= 0) {
        this.isAttacking = false;
        this.state.holding.mesh.rotation.set(0, 0, Math.PI / 2); // 回正
      }
    }

    this.mesh.position.x = Math.max(-49, Math.min(49, this.mesh.position.x));
    this.mesh.position.z = Math.max(-49, Math.min(49, this.mesh.position.z));
    this.state.alert = Math.max(0, this.state.alert - 2 * dt);
  }
}
