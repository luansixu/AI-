export class FeedbackManager {
  private bannerEl: HTMLElement;
  private toastEl: HTMLElement;
  private bannerTimer: number | null = null;
  private toastTimer: number | null = null;

  constructor() {
    this.bannerEl = document.getElementById('banner')!;
    this.toastEl = document.getElementById('meme-toast')!;
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

  // 预设一些 AI 导演的吐槽
  public triggerMeme(event: 'pickup' | 'kill' | 'cold' | 'heavy') {
    const memes = {
      pickup: ['“捡到了好东西？贪婪值在涨哦……”', '“这把重剑，你拿得动吗？”', '“宝物到手，麻烦将至。”'],
      kill: ['“干净利落。但血腥味会引来更多……”', '“暴力不能解决问题，但能解决你。”', '“一刀一个，有点意思。”'],
      cold: ['“冻僵的感觉如何？像是在冰窖里跳舞。”', '“体温报警！需要我施舍一点温暖吗？”'],
      heavy: ['“背着这么重的东西跑，真有你的。”', '“慢得像蜗牛，怪物可不等你。”']
    };
    const list = memes[event];
    this.showMeme(list[Math.floor(Math.random() * list.length)]);
  }
}

export const feedbackManager = new FeedbackManager();
