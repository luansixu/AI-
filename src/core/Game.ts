import * as THREE from 'three';
import { Player } from '../entities/Player';
import { Item } from '../entities/Item';
import { Tree } from '../entities/Tree';
import { Stela } from '../entities/Stela';
import { Animal } from '../entities/Animal';
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
  private trees: Tree[] = [];
  private stelae: Stela[] = [];
  private animals: Animal[] = [];
  private keys: Set<string> = new Set();
  private clock: THREE.Clock = new THREE.Clock();
  private mousePos = new THREE.Vector2();
  private raycaster = new THREE.Raycaster();
  private groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  
  private enemyMgr!: EnemyManager;
  private aiDirector!: AIDirector;
  private autoTester!: AutoTester;
  private isDead = false;
  private hasWon = false; 

  // 环境警告锁
  private lastZone: 'safe' | 'cold' | 'heat' = 'safe';

  private collisionBodies: {pos: THREE.Vector3, radius: number}[] = [];

  constructor() {
    this.scene = new THREE.Scene();
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
      if (e.code === 'KeyU') this.tryCraft();
      if (e.code === 'KeyI') this.tryCraftLeather();
      if (e.code === 'KeyK') this.tryPlaceCampfire();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('resize', () => this.onResize());

    this.animate();
  }

  private initWorld() {
    this.isDead = false;
    this.hasWon = false;
    document.querySelector('.death-overlay')?.classList.remove('show');
    
    while(this.scene.children.length > 0){ 
        this.scene.remove(this.scene.children[0]); 
    }

    const baseColor = 0x2b1d0e;
    this.scene.background = new THREE.Color(baseColor);
    this.scene.fog = new THREE.FogExp2(baseColor, 0.01);

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(50, 50, 50);
    dirLight.castShadow = true;
    this.scene.add(dirLight);

    this.items = [];
    this.trees = [];
    this.stelae = [];
    this.animals = [];
    this.collisionBodies = [];

    this.createBaseEnvironment();
    this.createNarrativeAnchors(); 

    this.player = new Player();
    (this.player.mesh as any).isDynamic = true;
    this.scene.add(this.player.mesh);

    const heavySword = new Item({ type: 'Heavy_Sword', color: 0xffffff, weight: 80 }, new THREE.Vector3(38, 0, 38));
    this.items.push(heavySword);
    this.scene.add(heavySword.mesh);

    this.enemyMgr = new EnemyManager(this.scene);
    this.enemyMgr.onDropItem = (type, pos) => this.spawnItem(type as any, pos);

    this.aiDirector = new AIDirector(this.player, this.enemyMgr, this.scene, this.items);
    this.aiDirector.registerStelae(this.stelae);
    this.autoTester = new AutoTester(this.player, this.aiDirector);
  }

  private spawnItem(type: any, pos: THREE.Vector3) {
    let color = 0xffffff;
    if (type === 'Frost_Heart') color = 0x00ccff;
    else if (type === 'Berry') color = 0xff0044;
    else if (type === 'Wood') color = 0x8b4513;
    else if (type === 'Ice_Crystal') color = 0x00ffff;
    else if (type === 'Fire_Ore') color = 0xff4400;
    else if (type === 'Meat') color = 0xaa0000;
    else if (type === 'Fur') color = 0xeeeeee;
    else if (type === 'Molten_Core') color = 0xff2200;

    const item = new Item({ type, color, weight: 0 }, pos);
    (item.mesh as any).isDynamic = true;
    this.items.push(item);
    this.scene.add(item.mesh);
    vfxManager.createBurst(this.scene, pos, color, 15);
  }

  private createBaseEnvironment() {
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.9 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; this.scene.add(ground);

    for (let i = 0; i < 120; i++) {
        const patch = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), new THREE.MeshBasicMaterial({ color: 0x44aa22, transparent: true, opacity: 0.25 }));
        patch.position.set((Math.random()-0.5)*195, 0.01, (Math.random()-0.5)*195);
        patch.rotation.x = -Math.PI/2; this.scene.add(patch);
    }

    const iceGround = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({color: 0xffffff, roughness: 0.2, emissive: 0x00ffff, emissiveIntensity: 0.1}));
    iceGround.rotation.x = -Math.PI/2; iceGround.position.set(60, 0.05, -60); this.scene.add(iceGround);
    const fireGround = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({color: 0xaa2200, roughness: 0.5, emissive: 0xff0000, emissiveIntensity: 0.2}));
    fireGround.rotation.x = -Math.PI/2; fireGround.position.set(-60, 0.05, 60); this.scene.add(fireGround);

    const stelaPositions = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(60, 0, -60), new THREE.Vector3(-60, 0, 60)];
    stelaPositions.forEach(pos => {
        const s = new Stela(pos); this.scene.add(s.mesh); this.stelae.push(s); this.collisionBodies.push({ pos: s.pos, radius: s.radius });
    });

    for (let i = 0; i < 3; i++) {
        const icePos = new THREE.Vector3(45 + Math.random()*40, 0.5, -45 - Math.random()*40);
        const iceRock = new THREE.Mesh(new THREE.DodecahedronGeometry(2.0, 0), new THREE.MeshStandardMaterial({color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 1.2}));
        iceRock.position.copy(icePos); (iceRock as any).isOre = 'Ice_Crystal'; (iceRock as any).isDynamic = true; this.scene.add(iceRock);
        this.collisionBodies.push({ pos: icePos, radius: 2.0 });

        const firePos = new THREE.Vector3(-45 - Math.random()*40, 0.5, 45 + Math.random()*40);
        const fireRock = new THREE.Mesh(new THREE.DodecahedronGeometry(2.0, 0), new THREE.MeshStandardMaterial({color: 0xff4400, emissive: 0xff4400, emissiveIntensity: 1.2}));
        fireRock.position.copy(firePos); (fireRock as any).isOre = 'Fire_Ore'; (fireRock as any).isDynamic = true; this.scene.add(fireRock);
        this.collisionBodies.push({ pos: firePos, radius: 2.0 });
    }

    for (let i = 0; i < 60; i++) {
      const x = (Math.random() - 0.5) * 180;
      const z = (Math.random() - 0.5) * 180;
      if (Math.abs(x) < 30 && Math.abs(z) < 30) continue; 
      const tree = new Tree(new THREE.Vector3(x, 0, z));
      this.scene.add(tree.mesh); this.trees.push(tree); this.collisionBodies.push({ pos: tree.pos, radius: tree.radius });
    }

    for (let i = 0; i < 12; i++) {
        const pos = new THREE.Vector3((Math.random()-0.5)*160, 0, (Math.random()-0.5)*160);
        const sheep = new Animal('Sheep', pos); this.scene.add(sheep.mesh); this.animals.push(sheep);
    }
    for (let i = 0; i < 6; i++) {
        const pos = new THREE.Vector3((Math.random()-0.5)*160, 0, (Math.random()-0.5)*160);
        const boar = new Animal('Boar', pos); this.scene.add(boar.mesh); this.animals.push(boar);
    }
  }

  private tryInteract() {
    const playerPos = this.player.mesh.position;
    const interactDist = 4; 

    // A. 祭坛最终交互 (重铸逻辑)
    if (playerPos.distanceTo(new THREE.Vector3(40, 0, 40)) < 5) {
        const inv = this.player.state.inventory;
        if (inv.iceCrystal >= 1 && inv.fireOre >= 1) {
            this.winGame();
            return;
        } else {
            feedbackManager.showMeme("“重铸需要双界之源：极北之冰晶，南疆之火矿。”", 3000);
        }
    }

    let nearestItem: Item | null = null;
    this.items.forEach(item => {
      const dist = playerPos.distanceTo(item.mesh.position);
      if (dist < interactDist) nearestItem = item;
    });

    if (nearestItem) {
      const type = nearestItem.config.type;
      if (type === 'Berry') {
        this.player.addToInventory('Berry', 1); this.player.eat(20);
        soundManager.playPickup();
        vfxManager.createBurst(this.scene, nearestItem.mesh.position, 0xff0044, 10);
      } else if (type === 'Meat') {
        this.player.addToInventory('Meat', 1); this.player.eat(50);
        soundManager.playPickup();
        vfxManager.createBurst(this.scene, nearestItem.mesh.position, 0xaa0000, 15);
      } else if (type === 'Wood') {
        this.player.addToInventory('Wood', 1);
        soundManager.playPickup();
        vfxManager.createBurst(this.scene, nearestItem.mesh.position, 0x8b4513, 10);
      } else if (type === 'Ice_Crystal') {
        this.player.addToInventory('Ice_Crystal', 1);
        soundManager.playPickup();
        vfxManager.createBurst(this.scene, nearestItem.mesh.position, 0x00ffff, 15);
        feedbackManager.showBanner("获得冰晶！带回出生点祭坛。");
      } else if (type === 'Fire_Ore') {
        this.player.addToInventory('Fire_Ore', 1);
        soundManager.playPickup();
        vfxManager.createBurst(this.scene, nearestItem.mesh.position, 0xff4400, 15);
        feedbackManager.showBanner("获得火原石！带回出生点祭坛。");
      } else if (type === 'Frost_Heart') {
        this.player.applyFrostHeart();
        soundManager.playPickup();
        feedbackManager.showBanner("获得：冰霜之心！严寒流失减半。");
        feedbackManager.showMeme("“极寒的心脏……它在你胸腔中搏动，冻结了恐惧。”", 4000);
      } else if (type === 'Molten_Core') {
        this.player.applyMoltenCore();
        soundManager.playPickup();
        feedbackManager.showBanner("获得：熔火核心！现在你无视任何高温。");
        feedbackManager.showMeme("“热浪不再是威胁，你已与烈焰同行，焚尽枷锁。”", 4000);
      } else if (type === 'Heavy_Sword') {
        this.player.hold(nearestItem);
        soundManager.playPickup();
        feedbackManager.triggerMeme('pickup');
      } else if (type === 'Fur') {
        this.player.addToInventory('Fur', 1);
        soundManager.playPickup();
      }
      this.scene.remove(nearestItem.mesh);
      this.items.splice(this.items.indexOf(nearestItem), 1);
      return;
    }

    this.stelae.forEach(s => {
        if (playerPos.distanceTo(s.pos) < interactDist + 1) {
            feedbackManager.showStela(s.content);
            soundManager.playPickup();
        }
    });
  }

  private winGame() {
    if (this.hasWon) return;
    this.hasWon = true;
    soundManager.playPickup();
    vfxManager.createBurst(this.scene, new THREE.Vector3(40, 5, 40), 0xffffff, 50);
    
    const title = document.getElementById('death-title');
    if (title) title.innerHTML = '<span style="color:#00ff88">考验已通过<br>荒野秩序已重写</span>';
    
    const overlay = document.querySelector('.death-overlay');
    if (overlay) overlay.classList.add('show');
    
    feedbackManager.showMeme("“你完成了不可能的远征……你是这片土地的新主。”", 6000);
    setTimeout(() => this.initWorld(), 8000);
  }

  private tryAttack() {
    if (this.isDead || this.hasWon || !this.player.attack()) return;
    const rotation = this.player.mesh.rotation.y;
    const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation).normalize();
    soundManager.playAttack();
    vfxManager.createSlashArc(this.scene, this.player.mesh.position, rotation);
    const attackPos = this.player.mesh.position.clone().add(forward.multiplyScalar(2.0));
    const attackRange = 4.5;

    [...this.scene.children].forEach(obj => {
        if ((obj as any).isOre && attackPos.distanceTo(obj.position) < attackRange) {
            vfxManager.createBurst(this.scene, obj.position, 0xffffff, 10);
            this.spawnItem((obj as any).isOre, obj.position.clone().add(new THREE.Vector3(0, 1, 0)));
            this.scene.remove(obj);
            this.collisionBodies = this.collisionBodies.filter(b => b.pos !== obj.position);
        }
    });

    // --- 动物判定恢复 ---
    for (let i = this.animals.length - 1; i >= 0; i--) {
        const animal = this.animals[i];
        if (attackPos.distanceTo(animal.pos) < attackRange) {
            vfxManager.createBurst(this.scene, animal.pos.clone().setY(1), 0xaa0000, 12);
            soundManager.playAttack(); 
            if (animal.takeHit(40, this.player.mesh.position)) {
                this.spawnItem('Meat', animal.pos.clone());
                if (animal.type === 'Sheep') {
                    this.spawnItem('Fur', animal.pos.clone().add(new THREE.Vector3(0.5, 0, 0.5)));
                } else if (animal.type === 'Boar') {
                    this.spawnItem('Fur', animal.pos.clone().add(new THREE.Vector3(0.5, 0, 0.5)));
                    this.spawnItem('Fur', animal.pos.clone().add(new THREE.Vector3(-0.5, 0, -0.5)));
                }
                this.scene.remove(animal.mesh); this.animals.splice(i, 1);
                feedbackManager.triggerMeme('kill');
            }
        }
    }

    for (let i = this.trees.length - 1; i >= 0; i--) {
      const tree = this.trees[i];
      if (attackPos.distanceTo(tree.pos) < 4.0) {
        vfxManager.createBurst(this.scene, tree.pos.clone().setY(2), 0x22bb22, 5);
        if (tree.takeHit()) {
          this.scene.remove(tree.mesh); this.trees.splice(i, 1);
          this.collisionBodies = this.collisionBodies.filter(b => b.pos !== tree.pos);
          this.spawnItem('Wood', tree.pos.clone());
          if (Math.random() < 0.6) this.spawnItem('Berry', tree.pos.clone().add(new THREE.Vector3(1, 0, 1)));
        }
      }
    }
    this.enemyMgr.checkHit(attackPos, attackRange, this.player.mesh.position); 
  }

  private animate = () => {
    requestAnimationFrame(this.animate);
    if (this.isDead || this.hasWon) return;
    const dt = Math.min(this.clock.getDelta(), 0.1);
    const now = this.clock.getElapsedTime();
    this.player.update(this.keys, dt, this.collisionBodies);
    
    this.animals.forEach(animal => {
        animal.update(dt, this.player.mesh.position, () => {
            this.player.takeDamage(5); 
            feedbackManager.showMeme("“野猪的冲撞可不是闹着玩的！”", 2000);
        });
    });

    if (this.player.state.hp <= 0) {
        this.die(); return;
    }

    const pos = this.player.mesh.position;
    if (this.scene.fog) {
        if (pos.x > 30 && pos.z < -30) {
            const resistance = this.player.getTempResistance();
            this.player.state.temp = Math.max(0, this.player.state.temp - 8 * dt * resistance); 
            this.scene.background = new THREE.Color(0xffffff);
            (this.scene.fog as THREE.FogExp2).color.set(0xffffff);
            vfxManager.createAmbientParticle(this.scene, pos, 'snow');

            // 触发进入警告
            if (this.lastZone !== 'cold') {
                if (resistance >= 1.0) { 
                    feedbackManager.showBanner("极限低温警告：生命正在飞速流失！", 4000);
                    feedbackManager.showMeme("“寒风如刀，单薄的躯壳无法抵挡荒野的恶意。”", 4000);
                } else if (resistance > 0) {
                    feedbackManager.showBanner("严寒警告：目前的防护尚不足以完全免疫寒冷。", 3000);
                    feedbackManager.showMeme("“虽有甲胄遮体，但极北的冰雪仍让人战栗。”", 3000);
                }
                this.lastZone = 'cold';
            }
        } else if (pos.x < -30 && pos.z > 30) {
            const hasCore = this.player.state.inventory.moltenCore;
            if (!hasCore) {
                this.player.takeDamage(10 * dt); 
                if (this.lastZone !== 'heat') {
                    feedbackManager.showBanner("高温灼烧警告：岩浆正在吞噬你的生命！", 4000);
                    feedbackManager.showMeme("“唯有持有那颗来自冰层下的红热核心，方能踏入此地。”", 4000);
                }
            }
            this.scene.background = new THREE.Color(0xff4400);
            (this.scene.fog as THREE.FogExp2).color.set(0xff4400);
            vfxManager.createAmbientParticle(this.scene, pos, 'ember');
            this.lastZone = 'heat';
        } else {
            this.scene.background = new THREE.Color(0x2b1d0e);
            (this.scene.fog as THREE.FogExp2).color.set(0x2b1d0e);
            this.lastZone = 'safe';
        }
    }

    this.items.forEach(item => {
      if (item.config.type === 'Heat_Source') {
        if (Math.random() < 0.4) vfxManager.createFireEffect(this.scene, item.mesh.position);
        const dist = item.mesh.position.distanceTo(this.player.mesh.position);
        if (dist < 10) this.player.state.temp = Math.min(100, this.player.state.temp + 15 * dt);
      }
    });
    
    this.enemyMgr.update(this.player.mesh.position, dt, (dmg) => this.player.takeDamage(dmg), now);
    this.aiDirector.update(now);
    vfxManager.update(dt, this.scene);
    this.camera.position.set(this.player.mesh.position.x, 25, this.player.mesh.position.z + 15);
    this.camera.lookAt(this.player.mesh.position);
    this.updateHUD();
    this.renderer.render(this.scene, this.camera);
  };

  private updateHUD() {
    const s = this.player.state;
    document.getElementById('bar-hp')!.style.width = `${Math.max(0, s.hp)}%`;
    document.getElementById('bar-stamina')!.style.width = `${Math.max(0, s.stamina)}%`;
    document.getElementById('bar-temp')!.style.width = `${Math.max(0, s.temp)}%`;
    document.getElementById('bar-hunger')!.style.width = `${Math.max(0, s.hunger)}%`;

    const inv = s.inventory;
    const statusText = `持有: ${s.holding ? '圣剑' : '拳头'} | 篝火:${inv.campfires} | 皮衣:${inv.leatherCoat} | 木:${inv.wood} | 皮:${inv.fur} | 肉:${inv.meat} | 冰晶:${inv.iceCrystal} | 火矿:${inv.fireOre} | 烈焰核心:${inv.moltenCore?'有':'无'}`;
    const hud = document.getElementById('hud');
    if (hud) hud.innerHTML = `<div class="chip"><span>${statusText}</span></div>`;
    
    // 检查是否靠近祭坛并有足够资源，给予提示 (修正引用)
    if (s.inventory.iceCrystal >= 1 && s.inventory.fireOre >= 1 && this.player.mesh.position.distanceTo(new THREE.Vector3(40, 0, 40)) < 6) {
        feedbackManager.showBanner("[ 按 E 重铸世界平衡 ]", 500);
    }
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
    
    const title = document.getElementById('death-title');
    if (title) title.innerText = "旅程终结";

    const deathOverlay = document.querySelector('.death-overlay');
    if (deathOverlay) deathOverlay.classList.add('show');
    
    feedbackManager.showMeme("“饥荒与严寒终结了你的旅程……”", 4000);
    setTimeout(() => this.initWorld(), 4000);
  }

  private tryCraft() {
    if (this.player.craftCampfire()) {
        soundManager.playPickup();
        vfxManager.createBurst(this.scene, this.player.mesh.position.clone().add(new THREE.Vector3(0, 2, 0)), 0xffaa00, 10);
        feedbackManager.showBanner("合成成功：获得 1 份篝火（按 K 放置）");
    } else {
        feedbackManager.showMeme("“材料不足……至少需要3份木材。”", 2000);
    }
  }

  private tryCraftLeather() {
    if (this.player.craftLeatherCoat()) {
        soundManager.playPickup();
        vfxManager.createBurst(this.scene, this.player.mesh.position.clone().add(new THREE.Vector3(0, 2, 0)), 0x66ccff, 15);
        feedbackManager.showBanner("合成成功：已穿上皮衣，极度耐寒！");
    } else {
        feedbackManager.showMeme("“材料不足……至少需要2份皮毛。”", 2000);
    }
  }

  private tryPlaceCampfire() {
    if (this.player.useCampfire()) {
        const rotation = this.player.mesh.rotation.y;
        const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation).normalize();
        const spawnPos = this.player.mesh.position.clone().add(forward.multiplyScalar(2.0));
        const fire = new Item({ type: 'Heat_Source', color: 0xffaa00, weight: 0 }, spawnPos);
        (fire.mesh as any).isDynamic = true;
        this.items.push(fire);
        this.scene.add(fire.mesh);
        soundManager.playPickup();
        vfxManager.createBurst(this.scene, spawnPos, 0xffaa00, 15);
        feedbackManager.showBanner("已放置篝火：感受温暖吧。");
    } else {
        feedbackManager.showMeme("“你手中没有可用的篝火。”", 2000);
    }
  }

  private createNarrativeAnchors() {
    const altar = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(4, 0.5, 4), new THREE.MeshStandardMaterial({color: 0x111111}));
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), new THREE.MeshStandardMaterial({color: 0x222222}));
    // 修正：卫士（支柱）向上移动 1.5 个单位
    pillar.position.y = 1 + 1.5; 
    
    const beamGeo = new THREE.CylinderGeometry(0.5, 0.5, 200, 16, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.2, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 100;
    
    altar.add(base, pillar, beam);
    altar.position.set(40, 0, 40);
    this.scene.add(altar);
    this.collisionBodies.push({ pos: new THREE.Vector3(40, 0, 40), radius: 2.5 });

    const startStela = new Stela(new THREE.Vector3(42, 0, 38));
    startStela.setContent("“断刃是钥匙。木聚火，皮作衣。冰晶在极北，火矿在南疆。带回双界之源，重铸此处平衡。”");
    this.scene.add(startStela.mesh);
    this.stelae.push(startStela);
    this.collisionBodies.push({ pos: startStela.pos, radius: startStela.radius });
  }
}
