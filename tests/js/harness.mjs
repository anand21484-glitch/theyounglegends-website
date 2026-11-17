// Loads a real page into a simulated browser (jsdom) and runs our own scripts in it.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * @param {string} page   repo-relative html file, e.g. 'contact/index.html'
 * @param {object} opts   { query: '?topic=x', fetch: async fn, scripts: [...] }
 */
export function loadPage(page, opts = {}) {
  const html = readFileSync(path.join(ROOT, page), 'utf8');
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => errors.push(String(e && e.message || e)));
  const urlPath = page === 'index.html' ? '/' : '/' + page.replace(/index\.html$/, '');
  const dom = new JSDOM(html, {
    url: 'https://theyounglegends.co.in' + urlPath + (opts.query || ''),
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    virtualConsole: vc,
  });
  const w = dom.window;
  // Browser APIs jsdom does not provide
  w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
  w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  w.HTMLElement.prototype.scrollBy = () => {};
  w.HTMLElement.prototype.scrollIntoView = () => {};
  const calls = [];
  w.fetch = async (url, init) => {
    calls.push({ url, init, body: init && init.body ? JSON.parse(init.body) : null });
    return opts.fetch ? opts.fetch(url, init) : { ok: true, json: async () => ({ success: 'true' }) };
  };
  // Run every script on the page in document order, like a browser would
  // (external files from /scripts and any inline <script> blocks).
  for (const s of w.document.querySelectorAll('script')) {
    const src = s.getAttribute('src');
    w.eval(src ? readFileSync(path.join(ROOT, src), 'utf8') : s.textContent);
  }
  return { w, doc: w.document, calls, errors };
}

export const tick = () => new Promise((r) => setTimeout(r, 0));

export function submit(w, form) {
  const ev = new w.Event('submit', { bubbles: true, cancelable: true });
  form.dispatchEvent(ev);
  return ev;
}

export function fill(form, values) {
  for (const [name, v] of Object.entries(values)) {
    const el = form.querySelector(`[name="${name}"]`);
    if (el.type === 'checkbox') el.checked = !!v; else el.value = v;
  }
  form.querySelectorAll('input[type="checkbox"][required]').forEach((c) => { c.checked = true; });
}
