import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadPage } from './harness.mjs';

// ---------- Legal template
test('legal ?doc=terms shows Terms with the "being finalised" notice', () => {
  const { doc } = loadPage('legal/index.html', { query: '?doc=terms' });
  assert.equal(doc.getElementById('docTitle').textContent, 'Terms of Use');
  assert.match(doc.getElementById('prose').textContent, /finalising/);
  assert.equal(doc.querySelector('.ph-lines'), null, 'no grey placeholder bars');
});

test('legal ?doc=privacy forwards to the Google Sites policy', () => {
  const { errors } = loadPage('legal/index.html', { query: '?doc=privacy' });
  // jsdom cannot navigate, so it reports the attempted navigation instead
  assert.ok(errors.some((e) => /navigation/i.test(e)), 'should redirect');
});

for (const evil of ['constructor', '__proto__', 'toString', 'hasOwnProperty']) {
  test(`SECURITY: legal ?doc=${evil} cannot crash the page (prototype keys)`, () => {
    assert.doesNotThrow(() => loadPage('legal/index.html', { query: '?doc=' + evil }));
  });
}

// ---------- Explore filters
test('explore ?world=science shows only science cards', () => {
  const { doc } = loadPage('explore/index.html', { query: '?world=science' });
  const visible = [...doc.querySelectorAll('#hub .card')].filter((c) => !c.hidden);
  assert.ok(visible.length > 0);
  assert.ok(visible.every((c) => c.dataset.world === 'science'));
});

test('SECURITY: explore search treats input as text, never HTML', () => {
  const { w, doc } = loadPage('explore/index.html');
  const before = doc.querySelectorAll('img').length;
  const s = doc.getElementById('hubSearch');
  s.value = '<img src=x onerror=alert(1)>';
  s.dispatchEvent(new w.Event('input'));
  assert.equal(doc.querySelectorAll('img').length, before);
  assert.equal(doc.getElementById('hubEmpty').hidden, false, 'empty state shown');
});

test('explore with a junk ?world= shows the empty state instead of crashing', () => {
  const { doc } = loadPage('explore/index.html', { query: '?world=%3Cscript%3E' });
  assert.equal(doc.getElementById('hubEmpty').hidden, false);
});

// ---------- Image slots
test('image-slot without src shows the branded placeholder', () => {
  const { doc } = loadPage('azadi-tales/index.html');
  const slot = doc.querySelector('image-slot');
  assert.ok(slot.querySelector('.is-mark'));
  assert.equal(slot.querySelector('img'), null);
});

test('image-slot with src renders a lazy image with safe alt text', () => {
  const { doc } = loadPage('azadi-tales/index.html');
  const slot = doc.createElement('image-slot');
  slot.setAttribute('src', '/assets/tyl-mark.png');
  slot.setAttribute('alt', '"><script>alert(1)</script>');
  doc.body.appendChild(slot);
  const img = slot.querySelector('img');
  assert.ok(img);
  assert.equal(img.getAttribute('loading'), 'lazy');
  assert.equal(img.alt, '"><script>alert(1)</script>');
  assert.equal(slot.querySelector('script'), null);
});

// ---------- Every page boots without script errors
const PAGES = ['index.html', 'azadi-tales/index.html', 'curious-minds/index.html', 'dare-to-dream/index.html',
  'explore/index.html', 'parents/index.html', 'educators/index.html', 'our-story/index.html',
  'contact/index.html', 'legal/index.html?doc=terms'];
for (const p of PAGES) {
  test(`${p} runs its scripts without errors`, () => {
    const [page, query] = p.split('?');
    const { errors } = loadPage(page, { query: query ? '?' + query : '' });
    assert.deepEqual(errors.filter((e) => !/navigation/i.test(e)), []);
  });
}

test('mobile menu opens and closes with Escape', () => {
  const { w, doc } = loadPage('parents/index.html');
  doc.getElementById('burger').click();
  assert.ok(doc.getElementById('drawer').classList.contains('open'));
  w.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape' }));
  assert.ok(!doc.getElementById('drawer').classList.contains('open'));
});
