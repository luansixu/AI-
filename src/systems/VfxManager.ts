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
        mesh: p, life: 1.0, maxLife: 1.0,
        update: (dt) => { p.position.add(vel); p.scale.setScalar(p.scale.x * 0.95); }
      });
    }
  }

  public createFireEffect(scene: THREE.Scene, position: THREE.Vector3) {
    const size = 0.5 + Math.random() * 0.4; 
    const geo = new THREE.BoxGeometry(size, size, size);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 1.0 });
    const p = new THREE.Mesh(geo, mat);
    p.position.copy(position).add(new THREE.Vector3((Math.random()-0.5)*1.5, 0.2, (Math.random()-0.5)*1.5));
    scene.add(p);
    const velY = 0.15 + Math.random() * 0.15;
    this.objects.push({
      mesh: p, life: 1.5, maxLife: 1.5,
      update: (dt) => { p.position.y += velY; p.rotation.y += dt * 10; p.scale.setScalar(p.scale.x * 0.95); }
    });
  }

  public createAmbientParticle(scene: THREE.Scene, playerPos: THREE.Vector3, type: 'snow' | 'ember') {
    const size = type === 'snow' ? 0.15 : 0.25;
    const geo = new THREE.BoxGeometry(size, size, size);
    const color = type === 'snow' ? 0xffffff : 0xff4400;
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 });
    const p = new THREE.Mesh(geo, mat);
    p.position.set(playerPos.x + (Math.random()-0.5)*40, type === 'snow' ? 15 : 0.5, playerPos.z + (Math.random()-0.5)*40);
    scene.add(p);
    const vel = type === 'snow' ? new THREE.Vector3(-0.05, -0.1, -0.05) : new THREE.Vector3(0, 0.1, 0);
    this.objects.push({
      mesh: p, life: 2.0, maxLife: 2.0,
      update: (dt) => { p.position.add(vel); if(type === 'ember') p.position.x += (Math.random()-0.5)*0.1; }
    });
  }

  public createSlashArc(scene: THREE.Scene, position: THREE.Vector3, rotationY: number) {
    const group = new THREE.Group();
    group.position.copy(position);
    group.position.y = 1.0; 
    group.rotation.y = rotationY; 
    scene.add(group);

    // 几何体参数修正：中心对齐 Z 轴
    const arcGeo = new THREE.SphereGeometry(4.0, 16, 8, Math.PI / 6, Math.PI * 2 / 3, Math.PI / 3, Math.PI / 3);
    const arcMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
    const arc = new THREE.Mesh(arcGeo, arcMat);
    
    // 关键修正：移除这里的 Math.PI 旋转，让它正对着旋转后的 group 方向
    group.add(arc);

    this.objects.push({
      mesh: group, life: 0.2, maxLife: 0.2,
      update: (dt) => { arc.scale.addScalar(dt * 2.5); }
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
