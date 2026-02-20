import * as THREE from 'three';

export type ItemType = 'Heavy_Sword' | 'Heat_Source' | 'Tool' | 'Frost_Heart' | 'Wood' | 'Berry' | 'Ice_Crystal' | 'Fire_Ore' | 'Meat' | 'Fur' | 'Molten_Core';

export interface ItemConfig {
  type: ItemType;
  color: number;
  weight: number;
}

export class Item {
  public mesh: THREE.Group;
  public config: ItemConfig;
  public id: string;

  constructor(config: ItemConfig, position: THREE.Vector3) {
    this.config = config;
    this.id = Math.random().toString(36).substr(2, 9);
    this.mesh = new THREE.Group();

    let geometry: THREE.BufferGeometry;
    if (config.type === 'Heavy_Sword') {
      geometry = new THREE.BoxGeometry(0.4, 3, 0.2);
      geometry.translate(0, 1.5, 0); 
    } else if (config.type === 'Frost_Heart') {
      geometry = new THREE.OctahedronGeometry(0.6, 0);
    } else if (config.type === 'Molten_Core') {
      geometry = new THREE.TetrahedronGeometry(0.7, 0); // 正四面体，烈焰核心
    } else if (config.type === 'Wood') {
      geometry = new THREE.CylinderGeometry(0.15, 0.15, 1.2, 6);
      geometry.rotateZ(Math.PI / 2);
    } else if (config.type === 'Berry') {
      geometry = new THREE.SphereGeometry(0.3, 8, 8);
    } else if (config.type === 'Meat') {
      geometry = new THREE.BoxGeometry(0.5, 0.3, 0.5); // 鲜肉块
    } else if (config.type === 'Fur') {
      geometry = new THREE.BoxGeometry(0.8, 0.05, 0.8); // 皮毛地毯感
    } else if (config.type === 'Ice_Crystal') {
      geometry = new THREE.IcosahedronGeometry(0.5, 0); // 二十面体冰晶
    } else if (config.type === 'Fire_Ore') {
      geometry = new THREE.DodecahedronGeometry(0.5, 0); // 十二面体火原石
    } else {
      geometry = new THREE.BoxGeometry(1, 1, 1);
    }

    const material = new THREE.MeshStandardMaterial({ 
      color: config.color,
      metalness: (config.type === 'Ice_Crystal' || config.type === 'Fire_Ore') ? 0.9 : 0.8,
      roughness: 0.1,
      transparent: (config.type === 'Ice_Crystal'),
      opacity: (config.type === 'Ice_Crystal') ? 0.7 : 1.0,
      emissive: config.color,
      emissiveIntensity: (config.type === 'Frost_Heart' || config.type === 'Berry' || config.type === 'Ice_Crystal' || config.type === 'Fire_Ore') ? 1.2 : 0.2 
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    
    if (config.type === 'Heavy_Sword') {
      mesh.rotation.z = Math.PI / 2; // 默认横在地上
    } else {
      mesh.position.y = 0.5;
    }

    this.mesh.add(mesh);
    this.mesh.position.copy(position);
  }
}
