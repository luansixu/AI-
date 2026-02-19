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
  private mousePos = new THREE.Vector2();
  private raycaster = new THREE.Raycaster();
  private groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  
  private enemyMgr!: EnemyManager;
  private aiDirector!: AIDirector;
  private autoTester!: AutoTester;
  private isDead = false;

  private collisionBodies: {pos: THREE.Vector3, radius: number}[] = [];

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x2b1d0e); // 深棕色背景
    this.scene.fog = new THREE.FogExp2(0x2b1d0e, 0.01);

    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 25, 15);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.4; 
    document.getElementById('app')?.appendChild(this.renderer.domElement);

    this.initWorld();

    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (e.code === 'KeyJ') this.tryAttack(); 
      if (e.code === 'KeyE') this.tryInteract(); 
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('resize', () => this.onResize());

    feedbackManager.showBanner("生存挑战：穿越丛林寻找白色圣剑 (按 J 攻击, E 拾取)");
    this.animate();
  }

  private initWorld() {
    this.isDead = false;
    document.querySelector('.death-overlay')?.classList.remove('show');
    
    this.items = [];
    this.collisionBodies = [];
    
    // 精确清理 scene
    const children = [...this.scene.children];
    children.forEach(child => {
        if (!(child instanceof THREE.Camera) && !(child instanceof THREE.Light)) {
            this.scene.remove(child);
        }
    });

    // 重新初始化灯光（防止清理后变黑）
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(50, 50, 50);
    dirLight.castShadow = true;
    this.scene.add(dirLight);

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
    this.enemyMgr.onDropItem = (type, pos) => {
      const droppedItem = new Item({ type: type as any, color: 0x00ccff, weight: 0 }, pos);
      this.items.push(droppedItem);
      this.scene.add(droppedItem.mesh);
      vfxManager.createBurst(this.scene, pos, 0x00ccff, 15);
      feedbackManager.showBanner("掉落：冰霜之心已出现！按 E 拾取。");
    };

    this.aiDirector = new AIDirector(this.player, this.enemyMgr, this.scene, this.items);
    this.autoTester = new AutoTester(this.player, this.aiDirector);
  }

  private createBaseEnvironment() {
    // 地面：温暖的棕色泥土
    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(100, 100), 
        new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.9 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // 自然参考系：绿色草皮斑块
    for (let i = 0; i < 100; i++) {
        const patch = new THREE.Mesh(
            new THREE.PlaneGeometry(2.5, 2.5),
            new THREE.MeshBasicMaterial({ color: 0x44aa22, transparent: true, opacity: 0.25 }) 
        );
        patch.position.set((Math.random()-0.5)*98, 0.01, (Math.random()-0.5)*98);
        patch.rotation.x = -Math.PI/2;
        this.scene.add(patch);
    }

    // 鲜艳的翠绿树木 (带有碰撞)
    for (let i = 0; i < 25; i++) {
      const x = (Math.random() - 0.5) * 90;
      const z = (Math.random() - 0.5) * 90;
      if (Math.abs(x) < 10 && Math.abs(z) < 10) continue; 

      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 2.5), new THREE.MeshStandardMaterial({color: 0x4d2b1f}));
      trunk.position.y = 1.25;
      const leaves = new THREE.Mesh(new THREE.ConeGeometry(1.8, 4.5, 8), new THREE.MeshStandardMaterial({
          color: 0x00ff44, // 翠绿
          emissive: 0x004411,
          emissiveIntensity: 0.2
      })); 
      leaves.position.y = 4;
      tree.add(trunk, leaves);
      tree.position.set(x, 0, z);
      this.scene.add(tree);
      this.collisionBodies.push({ pos: new THREE.Vector3(x, 0, z), radius: 0.8 });
    }

    // 乱石 (带有碰撞)
    for (let i = 0; i < 15; i++) {
      const x = (Math.random() - 0.5) * 90;
      const z = (Math.random() - 0.5) * 90;
      const radius = Math.random() * 1.5 + 0.5;
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(radius, 0),
        new THREE.MeshStandardMaterial({color: 0x777777})
      );
      rock.position.set(x, 0.2, z);
      rock.rotation.set(Math.random(), Math.random(), Math.random());
      this.scene.add(rock);
      this.collisionBodies.push({ pos: new THREE.Vector3(x, 0, z), radius: radius * 0.8 });
    }
  }

  private tryInteract() {
    const interactDist = 4; 
    let nearestItem: Item | null = null;
    this.items.forEach(item => {
      const dist = this.player.mesh.position.distanceTo(item.mesh.position);
      if (dist < interactDist) nearestItem = item;
    });

    if (nearestItem) {
      if (nearestItem.config.type === 'Frost_Heart') {
        this.player.applyFrostHeart();
        feedbackManager.showMeme("“你感受到了极寒的意志……体温流失减缓。”", 4000);
        soundManager.playPickup();
        vfxManager.createBurst(this.scene, nearestItem.mesh.position, 0x00ccff, 20);
      } else {
        this.player.hold(nearestItem);
        soundManager.playPickup();
        vfxManager.createBurst(this.scene, nearestItem.mesh.position, 0xffffff);
        feedbackManager.triggerMeme('pickup');
      }
      this.scene.remove(nearestItem.mesh);
      this.items.splice(this.items.indexOf(nearestItem), 1);
    }
  }

  private tryAttack() {
    if (this.isDead || !this.player.attack()) return;

    const targetRotation = this.player.mesh.rotation.y;
    const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), targetRotation).normalize();
    
    soundManager.playAttack();
    // 特效现在与攻击判定完美对齐
    vfxManager.createSlashArc(this.scene, this.player.mesh.position, targetRotation);

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
        // 粒子特效增强
        if (Math.random() < 0.4) vfxManager.createFireEffect(this.scene, item.mesh.position);
        
        const dist = item.mesh.position.distanceTo(this.player.mesh.position);
        if (dist < 10) { // 范围再次增加
          this.player.state.temp = Math.min(100, this.player.state.temp + 15 * dt); 
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
    const deathOverlay = document.querySelector('.death-overlay');
    if (deathOverlay) deathOverlay.classList.add('show');
    feedbackManager.showMeme("“你在这荒野中彻底冷透了……”", 4000);
    setTimeout(() => this.initWorld(), 4000);
  }
}
