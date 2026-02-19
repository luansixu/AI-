import * as THREE from 'three';

export class Stela {
  public mesh: THREE.Group;
  public id: string;
  public pos: THREE.Vector3;
  public radius: number = 1.2;
  public content: string = "石碑上的文字已经风化，难以辨认……";

  constructor(position: THREE.Vector3) {
    this.id = Math.random().toString(36).substr(2, 9);
    this.pos = position;
    this.mesh = new THREE.Group();

    // 视觉表现：灰色的长方体碑柱
    const baseGeo = new THREE.BoxGeometry(1.2, 0.4, 1.2);
    const pillarGeo = new THREE.BoxGeometry(0.8, 2.2, 0.4);
    const material = new THREE.MeshStandardMaterial({ 
      color: 0x888888,
      roughness: 0.9,
      metalness: 0.1
    });

    const base = new THREE.Mesh(baseGeo, material);
    const pillar = new THREE.Mesh(pillarGeo, material);
    pillar.position.y = 1.1;
    
    // 增加一点神秘的符文凹槽感（视觉）
    const runeSlotGeo = new THREE.PlaneGeometry(0.4, 1.2);
    const runeMat = new THREE.MeshBasicMaterial({ 
      color: 0xffffff, 
      transparent: true, 
      opacity: 0.2 
    });
    const rune = new THREE.Mesh(runeSlotGeo, runeMat);
    rune.position.set(0, 1.3, 0.21); // 贴在碑面上

    this.mesh.add(base, pillar, rune);
    this.mesh.position.copy(position);
  }

  public setContent(text: string) {
    this.content = text;
  }
}
