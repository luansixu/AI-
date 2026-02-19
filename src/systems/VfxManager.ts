import * as THREE from 'three';

interface VfxObject {
  mesh: THREE.Object3D;
  life: number;
  maxLife: number;
  update?: (dt: number) => void;
}

export class VfxManager {
  private objects: VfxObject[] = [];

  public createBurst(scene: THREE.Scene, position: THREE.Vector3, color: number, count: number = 10) {
    const geo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const mat = new THREE.MeshBasicMaterial({ color });

    for (let i = 0; i < count; i++) {
      const p = new THREE.Mesh(geo, mat);
      p.position.copy(position);
      scene.add(p);

      const vel = new THREE.Vector3((Math.random()-0.5)*0.25, Math.random()*0.25, (Math.random()-0.5)*0.25);

      this.objects.push({
        mesh: p,
        life: 1.0,
        maxLife: 1.0,
        update: (dt) => {
          p.position.add(vel);
          p.scale.setScalar(p.scale.x * 0.95);
        }
      });
    }
  }

  public createFireEffect(scene: THREE.Scene, position: THREE.Vector3) {
    const size = 0.5 + Math.random() * 0.4; 
    const geo = new THREE.BoxGeometry(size, size, size);
    const mat = new THREE.MeshBasicMaterial({ 
      color: 0xffcc00, 
      transparent: true,
      opacity: 1.0 
    });
    const p = new THREE.Mesh(geo, mat);
    p.position.copy(position).add(new THREE.Vector3((Math.random()-0.5)*1.5, 0.2, (Math.random()-0.5)*1.5));
    scene.add(p);

    const velY = 0.15 + Math.random() * 0.15;
    this.objects.push({
      mesh: p,
      life: 1.5,
      maxLife: 1.5,
      update: (dt) => {
        p.position.y += velY;
        p.rotation.y += dt * 10;
        p.scale.setScalar(p.scale.x * 0.95);
      }
    });
  }

  // 终极修正版本：直接通过几何体参数对齐 Z 轴
  public createSlashArc(scene: THREE.Scene, position: THREE.Vector3, rotationY: number) {
    const group = new THREE.Group();
    group.position.copy(position);
    group.position.y = 1.0; 
    group.rotation.y = rotationY; // 0度对应正Z轴
    scene.add(group);

    // 核心修正：
    // 在 Three.js 中，phi=0 是 X 轴。
    // 我们要中心在 Z 轴 (phi = PI/2 = 90度)。
    // 120度(2PI/3)的弧，起点应该是 90 - 60 = 30度 (PI/6)。
    const arcGeo = new THREE.SphereGeometry(4.0, 16, 8, Math.PI / 6, Math.PI * 2 / 3, Math.PI / 3, Math.PI / 3);
    const arcMat = new THREE.MeshBasicMaterial({ 
      color: 0xffffff, 
      transparent: true, 
      opacity: 0.9,
      side: THREE.DoubleSide 
    });
    const arc = new THREE.Mesh(arcGeo, arcMat);
    
    // 几何体已经自带对齐，不再需要任何本地旋转补丁
    group.add(arc);

    this.objects.push({
      mesh: group,
      life: 0.2,
      maxLife: 0.2,
      update: (dt) => {
        arc.scale.addScalar(dt * 2.0); 
      }
    });
  }

  public update(dt: number, scene: THREE.Scene) {
    for (let i = this.objects.length - 1; i >= 0; i--) {
      const obj = this.objects[i];
      obj.life -= dt;
      if (obj.update) obj.update(dt);
      
      obj.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.Material) {
          (child.material as any).opacity = (obj.life / obj.maxLife);
        }
      });

      if (obj.life <= 0) {
        scene.remove(obj.mesh);
        this.objects.splice(i, 1);
      }
    }
  }
}

export const vfxManager = new VfxManager();
