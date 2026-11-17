/*
 * <image-slot> — image box used across The Young Legends website.
 *
 * HOW TO ADD A REAL IMAGE
 *   1. Put the image file in /assets/images/  (e.g. hero-scene.webp)
 *   2. Add a src attribute to the slot in the page:
 *        <image-slot id="hero-scene" src="/assets/images/hero-scene.webp" alt="Child exploring history and science" ...>
 *   3. Commit & push. Done.
 *
 * Without src, the slot shows a branded placeholder (soft gradient + logo mark),
 * so unfinished artwork never looks broken.
 *
 * Attributes: src, alt, shape (rect|rounded|circle|pill), radius, fit (cover|contain)
 */
(() => {
  const css = `
    image-slot{display:block;position:relative;overflow:hidden;min-height:60px;
      background:linear-gradient(135deg,#18266a 0%,#24368a 45%,#7c4dff 80%,#ff7a1a 130%)}
    image-slot::before{content:"";position:absolute;inset:0;
      background:radial-gradient(60% 50% at 75% 20%,rgba(255,200,61,.35),transparent 70%),
                 radial-gradient(50% 50% at 15% 85%,rgba(0,194,209,.28),transparent 70%)}
    image-slot .is-mark{position:absolute;left:50%;top:50%;width:min(28%,96px);aspect-ratio:1;
      transform:translate(-50%,-50%);border-radius:22%;background:#fff url(/assets/tyl-mark.png) center/82% no-repeat;
      opacity:.22;box-shadow:0 0 0 1px rgba(255,200,61,.6)}
    image-slot img{position:absolute;inset:0;width:100%;height:100%;display:block}
    image-slot[data-filled]{background:#101a4a}
    image-slot[data-filled]::before{display:none}`;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  class ImageSlot extends HTMLElement {
    static get observedAttributes() { return ['src', 'alt', 'shape', 'radius', 'fit']; }
    connectedCallback() { this.render(); }
    attributeChangedCallback() { if (this.isConnected) this.render(); }
    render() {
      const shape = this.getAttribute('shape') || 'rounded';
      const r = this.getAttribute('radius');
      this.style.borderRadius =
        shape === 'circle' ? '50%' : shape === 'pill' ? '999px' : shape === 'rect' ? '' : (r ? r + 'px' : '');
      const src = this.getAttribute('src');
      this.textContent = '';
      if (src) {
        const img = document.createElement('img');
        img.src = src;
        img.alt = this.getAttribute('alt') || '';
        img.setAttribute('loading', 'lazy');
        img.setAttribute('decoding', 'async');
        img.style.objectFit = this.getAttribute('fit') || 'cover';
        img.onerror = () => { this.removeAttribute('data-filled'); img.remove(); this.appendChild(this.mark()); };
        this.setAttribute('data-filled', '');
        this.appendChild(img);
      } else {
        this.removeAttribute('data-filled');
        this.appendChild(this.mark());
      }
      this.setAttribute('role', src ? 'img' : 'presentation');
      if (src && this.getAttribute('alt')) this.setAttribute('aria-label', this.getAttribute('alt'));
    }
    mark() { const m = document.createElement('span'); m.className = 'is-mark'; m.setAttribute('aria-hidden', 'true'); return m; }
  }
  if (!customElements.get('image-slot')) customElements.define('image-slot', ImageSlot);
})();
