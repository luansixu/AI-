export class FeedbackManager {
  private bannerEl: HTMLElement;
  private toastEl: HTMLElement;
  private stelaEl: HTMLElement;
  private bannerTimer: number | null = null;
  private toastTimer: number | null = null;

  constructor() {
    this.bannerEl = document.getElementById('banner')!;
    this.toastEl = document.getElementById('meme-toast')!;
    
    this.stelaEl = document.createElement('div');
    this.stelaEl.className = 'stela-ui';
    document.body.appendChild(this.stelaEl);
  }

  public showStela(text: string) {
    this.stelaEl.innerText = text;
    this.stelaEl.classList.add('show');
    setTimeout(() => this.stelaEl.classList.remove('show'), 6000);
  }

  public showBanner(text: string, duration: number = 3000) {
    this.bannerEl.innerText = text;
    this.bannerEl.classList.add('show');
    if (this.bannerTimer) clearTimeout(this.bannerTimer);
    this.bannerTimer = window.setTimeout(() => this.bannerEl.classList.remove('show'), duration);
  }

  public showMeme(text: string, duration: number = 2000) {
    this.toastEl.innerText = text;
    this.toastEl.classList.add('show');
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toastEl.classList.remove('show'), duration);
  }

  // 更新后的生存向吐槽台词
  public triggerMeme(event: 'pickup' | 'kill' | 'cold' | 'heavy' | 'eat') {
    const memes = {
      pickup: ['“这把断刃……感觉沉重得像是背负着一段历史。”', '“武器到手了，但在这荒野，它能砍开未来吗？”'],
      kill: ['“它们只是荒野的投影，更多的危险还在暗处。”', '“一劳永逸是不存在的，危险总在呼吸间。”'],
      cold: ['“你的血液快要凝固了……寻找火种！”', '“寒冷是平等的，它会带走每一个傲慢的旅人。”'],
      heavy: ['“大剑虽然强力，但它也在榨干你的体力。”', '“负重前行，这就是你选择的路。”'],
      eat: ['“酸甜的浆果……生存的火火花又燃起了一点。”', '“每一口食物都是荒野的施舍。”']
    };
    const list = memes[event];
    this.showMeme(list[Math.floor(Math.random() * list.length)]);
  }
}

export const feedbackManager = new FeedbackManager();
