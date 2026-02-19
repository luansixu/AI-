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

  // 增强版火花粒子：更鲜艳，带微弱光晕
  public createFireEffect(scene: THREE.Scene, position: THREE.Vector3) {
    const size = 0.4 + Math.random() * 0.3; 
    const geo = new THREE.BoxGeometry(size, size, size);
    // 强制高亮橙红色
    const mat = new THREE.MeshBasicMaterial({ 
      color: 0xff6600, 
      transparent: true,
      opacity: 0.9
    });
    const p = new THREE.Mesh(geo, mat);
    
    // 粒子产生点稍微散开
    p.position.copy(position).add(new THREE.Vector3((Math.random()-0.5)*1.2, 0.2, (Math.random()-0.5)*1.2));
    scene.add(p);

    const velY = 0.1 + Math.random() * 0.12;
    const driftX = (Math.random() - 0.5) * 0.05;

    this.objects.push({
      mesh: p,
      life: 1.5,
      maxLife: 1.5,
      update: (dt) => {
        p.position.y += velY;
        p.position.x += driftX;
        p.rotation.y += dt * 10;
        p.scale.setScalar(p.scale.x * 0.96);
      }
    });
  }

  // 终极修正：对齐鼠标
  public createSlashArc(scene: THREE.Scene, position: THREE.Vector3, rotationY: number) {
    const group = new THREE.Group();
    group.position.copy(position);
    group.position.y = 0.1; // 略微浮空
    group.rotation.y = rotationY; 
    scene.add(group);

    // 斩击弧：SphereGeometry 参数详解
    // phiStart: 0, phiLength: PI*2/3 (120度)
    // 我们让它的几何体初始中心点对齐 Z 轴正方向
    const arcGeo = new THREE.SphereGeometry(3.8, 16, 8, -Math.PI/3, Math.PI * 2/3, Math.PI/3, Math.PI/3);
    const arcMat = new THREE.MeshBasicMaterial({ 
      color: 0xffffff, 
      transparent: true, 
      opacity: 0.9,
      side: THREE.DoubleSide 
    });
    const arc = new THREE.Mesh(arcGeo, arcMat);
    arc.position.y = 0.8;
    // 重要：不再需要额外的 90 度补偿，因为我们通过调整 SphereGeometry 的起始角度来对齐
    group.add(arc);

    this.objects.push({
      mesh: group,
      life: 0.3,
      maxLife: 0.3,
      update: (dt) => {
        arc.scale.addScalar(dt * 1.2);
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
          (child.material as any).opacity = (obj.life / obj.maxLife) * 0.8;
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
