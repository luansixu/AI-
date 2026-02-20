import * as THREE from 'three';
import { vfxManager } from '../systems/VfxManager';

export type AnimalType = 'Sheep' | 'Boar';

export class Animal {
  public mesh: THREE.Group;
  public id: string;
  public type: AnimalType;
  public hp: number;
  public pos: THREE.Vector3;
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public knockbackVel: THREE.Vector3 = new THREE.Vector3(); 
  public state: 'idle' | 'wander' | 'flee' | 'attack' = 'idle';
  
  private speed: number;
  private timer: number = 0;
  private targetDir: THREE.Vector3 = new THREE.Vector3();

  constructor(type: AnimalType, position: THREE.Vector3) {
    this.id = Math.random().toString(36).substr(2, 9);
    this.type = type;
    this.pos = position.clone();
    this.mesh = new THREE.Group();
    
    this.hp = type === 'Sheep' ? 80 : 120; 
    this.speed = type === 'Sheep' ? 1.0 : 1.2; 

    this.createModel();
    this.mesh.position.copy(this.pos);
  }

  private createModel() {
    if (this.type === 'Sheep') {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 1.2), new THREE.MeshStandardMaterial({color: 0xeeeeee}));
      body.position.y = 0.4;
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshStandardMaterial({color: 0xdddddd}));
      head.position.set(0, 0.7, 0.6);
      this.mesh.add(body, head);
    } else {
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.8, 1.5), new THREE.MeshStandardMaterial({color: 0x4d2b1f}));
      body.position.y = 0.5;
      const tusks = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.2), new THREE.MeshStandardMaterial({color: 0xffffff}));
      tusks.position.set(0, 0.6, 0.8);
      this.mesh.add(body, tusks);
    }
    this.mesh.traverse(n => n.castShadow = true);
  }

  public takeHit(damage: number, fromPos: THREE.Vector3): boolean {
    this.hp -= damage;
    const kbDir = new THREE.Vector3().subVectors(this.pos, fromPos).setY(0).normalize();
    this.knockbackVel.addScaledVector(kbDir, 0.3); 

    if (this.type === 'Sheep') {
      this.state = 'flee';
      this.targetDir.copy(kbDir); 
      this.timer = 1.5; // 核心修正：逃跑时间缩短至 1.5s
    } else {
      this.state = 'attack';
    }
    return this.hp <= 0;
  }

  public update(dt: number, playerPos: THREE.Vector3, onAttackPlayer?: () => void) {
    if (this.timer > 0) this.timer -= dt;
    const distToPlayer = this.pos.distanceTo(playerPos);

    if (this.type === 'Sheep') {
      this.updateSheep(dt, playerPos, distToPlayer);
    } else {
      this.updateBoar(dt, playerPos, distToPlayer, onAttackPlayer);
    }

    this.pos.addScaledVector(this.velocity, dt);
    this.pos.add(this.knockbackVel); 
    
    this.pos.x = Math.max(-99, Math.min(99, this.pos.x));
    this.pos.z = Math.max(-99, Math.min(99, this.pos.z));

    this.mesh.position.copy(this.pos);
    if (this.velocity.lengthSq() > 0.01) {
        const targetRot = Math.atan2(this.velocity.x, this.velocity.z);
        this.mesh.rotation.y = THREE.MathUtils.lerp(this.mesh.rotation.y, targetRot, 0.1);
    }
    this.velocity.multiplyScalar(0.9); 
    this.knockbackVel.multiplyScalar(0.8); 
  }

  private updateSheep(dt: number, playerPos: THREE.Vector3, dist: number) {
    if (this.state === 'flee') {
      this.velocity.addScaledVector(this.targetDir, this.speed * 2.5); // 逃跑爆发力恢复
      if (this.timer <= 0) {
          this.state = 'idle'; 
          this.velocity.set(0,0,0); // 核心修正：跑完瞬间静止
      }
    } else if (this.timer <= 0) {
      const angle = Math.random() * Math.PI * 2;
      this.targetDir.set(Math.cos(angle), 0, Math.sin(angle));
      this.timer = 3 + Math.random() * 4;
      this.velocity.addScaledVector(this.targetDir, this.speed * 0.5);
    }
  }

  private updateBoar(dt: number, playerPos: THREE.Vector3, dist: number, onAttack?: () => void) {
    if (dist < 6 || this.state === 'attack') {
      this.state = 'attack';
      const moveDir = new THREE.Vector3().subVectors(playerPos, this.pos).setY(0).normalize();
      this.velocity.addScaledVector(moveDir, this.speed * 0.8); 
      if (dist < 1.5 && onAttack) {
        onAttack();
        this.velocity.addScaledVector(moveDir, -12); 
      }
    } else if (this.timer <= 0) {
      const angle = Math.random() * Math.PI * 2;
      this.targetDir.set(Math.cos(angle), 0, Math.sin(angle));
      this.timer = 4 + Math.random() * 2;
      this.velocity.addScaledVector(this.targetDir, this.speed * 0.3);
    }
  }
}
