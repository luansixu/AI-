import * as THREE from 'three';

export class Tree {
  public mesh: THREE.Group;
  public id: string;
  public hp: number = 3; // 砍3下倒
  public pos: THREE.Vector3;
  public radius: number = 0.8;

  constructor(position: THREE.Vector3) {
    this.id = Math.random().toString(36).substr(2, 9);
    this.pos = position;
    this.mesh = new THREE.Group();

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.4, 2.5), 
      new THREE.MeshStandardMaterial({color: 0x4d2b1f})
    );
    trunk.position.y = 1.25;
    trunk.castShadow = true;

    const leaves = new THREE.Mesh(
      new THREE.ConeGeometry(1.8, 4.5, 8), 
      new THREE.MeshStandardMaterial({
        color: 0x00dd33, 
        emissive: 0x004411,
        emissiveIntensity: 0.2
      })
    ); 
    leaves.position.y = 4;
    leaves.castShadow = true;

    this.mesh.add(trunk, leaves);
    this.mesh.position.copy(position);
  }

  public takeHit(): boolean {
    this.hp -= 1;
    // 抖动效果
    this.mesh.position.x += (Math.random() - 0.5) * 0.2;
    setTimeout(() => this.mesh.position.x = this.pos.x, 50);
    return this.hp <= 0;
  }
}
