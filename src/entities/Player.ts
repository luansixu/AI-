import * as THREE from 'three';
import { Item } from './Item';

export interface PlayerState {
  hp: number;
  maxHp: number;
  temp: number;
  stamina: number;
  hunger: number;
  holding: Item | null;
  inventory: {
    wood: number;
    berry: number;
    iceCrystal: number;
    fireOre: number;
    campfires: number; 
    meat: number;
    fur: number;
    leatherCoat: number; // 增加皮衣存量 (0或1)
    moltenCore: boolean; // 是否持有熔火核心
  };
}

export class Player {
  public mesh: THREE.Group;
  public state: PlayerState = {
    hp: 100, maxHp: 100, temp: 100, stamina: 100, hunger: 100,
    holding: null,
    inventory: { wood: 0, berry: 0, iceCrystal: 0, fireOre: 0, campfires: 0, meat: 0, fur: 0, leatherCoat: 0, moltenCore: false }
  };

  private baseSpeed = 0.2; 
  private runMultiplier = 1.8;
  private baseTempLossRate = 0.5; // 基础体温流失率
  private hungerLossRate = 0.8; 
  
  private hasFrostHeart = false;
  public isAttacking = false;
  private attackTimer = 0;
  private attackDuration = 0.25;
  private vignetteEl: HTMLElement | null = null;

  constructor() {
    this.mesh = new THREE.Group();
    const geometry = new THREE.CapsuleGeometry(0.5, 1, 4, 8);
    const material = new THREE.MeshStandardMaterial({ color: 0x22ff44, name: 'player-material' });
    const capsule = new THREE.Mesh(geometry, material);
    capsule.position.y = 1;
    capsule.castShadow = true;
    this.mesh.add(capsule);
    this.mesh.position.set(30, 0, 30);
    this.vignetteEl = document.getElementById('vignette');
  }

  public applyFrostHeart() {
    this.hasFrostHeart = true;
    this.updateVisualState();
  }

  public applyMoltenCore() {
    this.state.inventory.moltenCore = true;
    this.mesh.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.material && obj.material.name === 'player-material') {
        obj.material.emissive.set(0xff4400);
        obj.material.emissiveIntensity = 0.6;
      }
    });
  }

  // 计算当前的耐寒系数：1.0(无), 0.5(单抗), 0.0(双抗)
  public getTempResistance(): number {
    let factor = 1.0;
    if (this.hasFrostHeart) factor -= 0.5;
    if (this.state.inventory.leatherCoat > 0) factor -= 0.5;
    return Math.max(0, factor);
  }

  public craftLeatherCoat(): boolean {
    if (this.state.inventory.fur >= 2 && this.state.inventory.leatherCoat === 0) {
      this.state.inventory.fur -= 2;
      this.state.inventory.leatherCoat = 1;
      this.updateVisualState();
      return true;
    }
    return false;
  }

  private updateVisualState() {
    // 根据耐性状态改变颜色
    this.mesh.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.material && obj.material.name === 'player-material') {
        if (this.hasFrostHeart && this.state.inventory.leatherCoat > 0) {
            obj.material.color.set(0x00ffff); // 极寒免疫：深天蓝
        } else if (this.hasFrostHeart || this.state.inventory.leatherCoat > 0) {
            obj.material.color.set(0x66ccff); // 部分耐性：浅蓝
        }
      }
    });
  }

  public takeDamage(amount: number) {
    this.state.hp = Math.max(0, this.state.hp - amount);
    if (this.vignetteEl) {
      this.vignetteEl.classList.add('hit');
      setTimeout(() => this.vignetteEl?.classList.remove('hit'), 200);
    }
  }

  public craftCampfire(): boolean {
    if (this.state.inventory.wood >= 3) {
      this.state.inventory.wood -= 3;
      this.state.inventory.campfires += 1;
      return true;
    }
    return false;
  }

  public useCampfire(): boolean {
    if (this.state.inventory.campfires > 0) {
      this.state.inventory.campfires -= 1;
      return true;
    }
    return false;
  }

  public hold(item: Item) {
    if (item.config.type !== 'Heavy_Sword') return;
    if (this.state.holding) this.mesh.remove(this.state.holding.mesh);
    this.state.holding = item;
    this.state.holding.mesh.position.set(0.8, 1.0, 0.5); 
    this.state.holding.mesh.rotation.set(0, 0, Math.PI / 2); 
    this.mesh.add(this.state.holding.mesh);
  }

  public addToInventory(type: string, amount: number = 1) {
    const inv = this.state.inventory as any;
    const key = type.toLowerCase();
    if (key === 'wood') inv.wood += amount;
    else if (key === 'berry') inv.berry += amount;
    else if (key === 'ice_crystal') inv.iceCrystal += amount;
    else if (key === 'fire_ore') inv.fireOre += amount;
    else if (key === 'meat') inv.meat += amount;
    else if (key === 'fur') inv.fur += amount;
  }

  public eat(amount: number) {
    this.state.hunger = Math.min(100, this.state.hunger + amount);
    this.state.hp = Math.min(100, this.state.hp + amount * 0.2);
  }

  public attack(): boolean {
    if (this.state.holding?.config.type !== 'Heavy_Sword') return false;
    if (this.isAttacking || this.state.stamina < 20) return false;
    this.isAttacking = true;
    this.attackTimer = this.attackDuration;
    this.state.stamina -= 20;
    return true;
  }

  public update(keys: Set<string>, dt: number, envObjects: {pos: THREE.Vector3, radius: number}[]) {
    const resistance = this.getTempResistance();
    this.state.temp = Math.max(0, this.state.temp - this.baseTempLossRate * resistance * dt);
    this.state.hunger = Math.max(0, this.state.hunger - this.hungerLossRate * dt);

    if (this.state.temp <= 0) this.takeDamage(10 * dt);
    if (this.state.hunger <= 0) this.takeDamage(3 * dt);

    if (this.vignetteEl) {
      if (this.state.hp < 30 || this.state.temp <= 0) this.vignetteEl.classList.add('critical');
      else this.vignetteEl.classList.remove('critical');
    }

    let currentSpeed = this.baseSpeed;
    if (this.state.holding?.config.type === 'Heavy_Sword') currentSpeed *= 0.7;

    let moveX = 0; let moveZ = 0;
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
      nextPos.x += dx; nextPos.z += dz;

      let blocked = false;
      for (const obj of envObjects) {
        if (nextPos.distanceTo(obj.pos) < (obj.radius + 0.5)) { blocked = true; break; }
      }
      if (!blocked) this.mesh.position.copy(nextPos);
      if (!this.isAttacking) this.mesh.rotation.y = Math.atan2(dx, dz);

      if (isRunning) {
        const staminaCost = this.state.holding ? 40 : 20;
        this.state.stamina = Math.max(0, this.state.stamina - staminaCost * dt);
      } else {
        this.state.stamina = Math.min(100, this.state.stamina + 15 * dt);
      }
    } else {
      this.state.stamina = Math.min(100, this.state.stamina + 30 * dt);
    }

    if (this.isAttacking && this.state.holding) {
      this.attackTimer -= dt;
      const progress = 1 - (this.attackTimer / this.attackDuration);
      const sweepRange = Math.PI * 2 / 3;
      this.state.holding.mesh.rotation.y = -sweepRange / 2 + sweepRange * progress;
      if (this.attackTimer <= 0) {
        this.isAttacking = false;
        this.state.holding.mesh.rotation.set(0, 0, Math.PI / 2); 
      }
    }

    this.mesh.position.x = Math.max(-99, Math.min(99, this.mesh.position.x));
    this.mesh.position.z = Math.max(-99, Math.min(99, this.mesh.position.z));
  }
}
