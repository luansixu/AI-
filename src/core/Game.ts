import * as THREE from 'three';
import { Player } from '../entities/Player';
import { Item } from '../entities/Item';
import { soundManager } from '../systems/SoundManager';
import { vfxManager } from '../systems/VfxManager';
import { EnemyManager } from '../systems/EnemyManager';
import { AIDirector } from '../systems/AIDirector';
import { AutoTester } from '../systems/AutoTester';
import { feedbackManager } from '../systems/FeedbackManager';

export class Game {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private player!: Player;
  private items: Item[] = [];
  private keys: Set<string> = new Set();
  private clock: THREE.Clock = new THREE.Clock();
  
  private enemyMgr!: EnemyManager;
  private aiDirector!: AIDirector;
  private autoTester!: AutoTester;
  private isDead = false;

  private collisionBodies: {pos: THREE.Vector3, radius: number}[] = [];

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x221100); 
    this.scene.fog = new THREE.FogExp2(0x221100, 0.012);

    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 25, 15);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.5; 
    document.getElementById('app')?.appendChild(this.renderer.domElement);

    this.initWorld();

    // 键盘监听
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (e.code === 'KeyJ') this.tryAttack(); // J键攻击
      if (e.code === 'KeyE') this.tryInteract(); // E键交互
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('resize', () => this.onResize());

    feedbackManager.showBanner("生存挑战：穿越丛林寻找白色圣剑 (按 WASD 移动, J 攻击, E 拾取)");
    this.animate();
  }

  private initWorld() {
    this.isDead = false;
    document.querySelector('.death-overlay')?.classList.remove('show');
    
    this.items = [];
    this.collisionBodies = [];
    while(this.scene.children.length > 0){ 
        this.scene.remove(this.scene.children[0]); 
    }

    this.createBaseEnvironment();

    this.player = new Player();
    this.scene.add(this.player.mesh);

    const heavySword = new Item(
      { type: 'Heavy_Sword', color: 0xffffff, weight: 80 },
      new THREE.Vector3(-40, 0, -40)
    );
    this.items.push(heavySword);
    this.scene.add(heavySword.mesh);

    this.enemyMgr = new EnemyManager(this.scene);
    this.aiDirector = new AIDirector(this.player, this.enemyMgr, this.scene, this.items);
    this.autoTester = new AutoTester(this.player, this.aiDirector);
  }

  private createBaseEnvironment() {
    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(100, 100), 
        new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.8 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    for (let i = 0; i < 80; i++) {
        const patch = new THREE.Mesh(
            new THREE.PlaneGeometry(3, 3),
            new THREE.MeshBasicMaterial({ color: 0x22cc44, transparent: true, opacity: 0.15 }) 
        );
        patch.position.set((Math.random()-0.5)*95, 0.01, (Math.random()-0.5)*95);
        patch.rotation.x = -Math.PI/2;
        this.scene.add(patch);
    }

    for (let i = 0; i < 25; i++) {
      const x = (Math.random() - 0.5) * 90;
      const z = (Math.random() - 0.5) * 90;
      if (Math.abs(x) < 10 && Math.abs(z) < 10) continue; 

      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 2.5), new THREE.MeshStandardMaterial({color: 0x4d2b1f}));
      trunk.position.y = 1.25;
      const leaves = new THREE.Mesh(new THREE.ConeGeometry(1.8, 4.5, 8), new THREE.MeshStandardMaterial({color: 0x00dd33})); 
      leaves.position.y = 4;
      tree.add(trunk, leaves);
      tree.position.set(x, 0, z);
      this.scene.add(tree);
      this.collisionBodies.push({ pos: new THREE.Vector3(x, 0, z), radius: 0.8 });
    }

    for (let i = 0; i < 15; i++) {
      const x = (Math.random() - 0.5) * 90;
      const z = (Math.random() - 0.5) * 90;
      const radius = Math.random() * 1.5 + 0.5;
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(radius, 0),
        new THREE.MeshStandardMaterial({color: 0x888888})
      );
      rock.position.set(x, 0.2, z);
      rock.rotation.set(Math.random(), Math.random(), Math.random());
      this.scene.add(rock);
      this.collisionBodies.push({ pos: new THREE.Vector3(x, 0, z), radius: radius * 0.8 });
    }

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.8)); 
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2); 
    dirLight.position.set(50, 50, 50);
    dirLight.castShadow = true;
    this.scene.add(dirLight);
  }

  private tryInteract() {
    const interactDist = 4; 
    let nearestItem: Item | null = null;
    this.items.forEach(item => {
      const dist = this.player.mesh.position.distanceTo(item.mesh.position);
      if (dist < interactDist) nearestItem = item;
    });

    if (nearestItem) {
      this.player.hold(nearestItem);
      soundManager.playPickup();
      vfxManager.createBurst(this.scene, nearestItem.mesh.position, 0xffffff);
      feedbackManager.triggerMeme('pickup');
      this.scene.remove(nearestItem.mesh);
      const idx = this.items.indexOf(nearestItem);
      if (idx > -1) this.items.splice(idx, 1);
    }
  }

  private tryAttack() {
    if (this.isDead || !this.player.attack()) return;

    // 获取玩家当前的朝向
    const targetRotation = this.player.mesh.rotation.y;
    const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), targetRotation).normalize();
    
    soundManager.playAttack();
    // 特效跟随玩家朝向
    vfxManager.createSlashArc(this.scene, this.player.mesh.position, targetRotation);

    // 攻击判定点：角色正前方 2.0 单位处
    const attackPos = this.player.mesh.position.clone().add(forward.multiplyScalar(2.0));
    const kills = this.enemyMgr.checkHit(attackPos, 4.0, this.player.mesh.position); 
    if (kills > 0) feedbackManager.triggerMeme('kill');
  }

  private animate = () => {
    requestAnimationFrame(this.animate);
    if (this.isDead) return;

    const dt = Math.min(this.clock.getDelta(), 0.1);
    const now = this.clock.getElapsedTime();
    
    this.player.update(this.keys, dt, this.collisionBodies);
    
    if (this.player.state.hp <= 0 || this.player.state.temp <= 0) {
        this.die();
        return;
    }

    this.items.forEach(item => {
      if (item.config.type === 'Heat_Source') {
        if (Math.random() < 0.3) vfxManager.createFireEffect(this.scene, item.mesh.position);
        const dist = item.mesh.position.distanceTo(this.player.mesh.position);
        if (dist < 8) { 
          this.player.state.temp = Math.min(100, this.player.state.temp + 12 * dt); 
        }
      }
    });
    
    this.enemyMgr.update(this.player.mesh.position, dt);
    this.enemyMgr.enemies.forEach(enemy => {
      const dist = enemy.group.position.distanceTo(this.player.mesh.position);
      if (dist < 1.5) {
        if (! (enemy as any).lastAttack) (enemy as any).lastAttack = 0;
        if (now - (enemy as any).lastAttack > 1.2) {
          this.player.takeDamage(15);
          soundManager.playWarning();
          (enemy as any).lastAttack = now;
        }
      }
    });

    this.aiDirector.update(now);
    vfxManager.update(dt, this.scene);
    
    this.camera.position.x = this.player.mesh.position.x;
    this.camera.position.z = this.player.mesh.position.z + 15;
    this.camera.position.y = 25;
    this.camera.lookAt(this.player.mesh.position);
    
    this.updateHUD();
    this.renderer.render(this.scene, this.camera);
  };

  private updateHUD() {
    const s = this.player.state;
    const greedEl = document.getElementById('hud-greed');
    const alertEl = document.getElementById('hud-alert');
    if (greedEl) greedEl.innerText = Math.round(s.greed).toString();
    if (alertEl) alertEl.innerText = Math.round(s.alert).toString();
    
    const hpBar = document.getElementById('bar-hp');
    const spBar = document.getElementById('bar-stamina');
    const tpBar = document.getElementById('bar-temp');
    if (hpBar) hpBar.style.width = `${Math.max(0, s.hp)}%`;
    if (spBar) spBar.style.width = `${Math.max(0, s.stamina)}%`;
    if (tpBar) tpBar.style.width = `${Math.max(0, s.temp)}%`;
  }

  private onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private die() {
    if (this.isDead) return;
    this.isDead = true;
    soundManager.playWarning();
    document.querySelector('.death-overlay')?.classList.add('show');
    feedbackManager.showMeme("“你在这荒野中彻底冷透了……”", 4000);
    setTimeout(() => this.initWorld(), 4000);
  }
}
