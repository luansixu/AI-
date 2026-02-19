import * as THREE from 'three';

export type ItemType = 'Heavy_Sword' | 'Heat_Source' | 'Tool' | 'Frost_Heart';

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
      geometry = new THREE.OctahedronGeometry(0.6, 0); // 八面体，像一颗心
    } else {
      geometry = new THREE.BoxGeometry(1, 1, 1);
    }

    const material = new THREE.MeshStandardMaterial({ 
      color: config.color,
      metalness: 0.9,
      roughness: 0.1,
      emissive: config.color,
      emissiveIntensity: config.type === 'Frost_Heart' ? 1.0 : 0.5 
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
