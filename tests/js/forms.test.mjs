import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadPage, submit, fill, tick } from './harness.mjs';

const TO = 'https://formsubmit.co/ajax/support@theyounglegends.co.in';
const GOOD = { name: 'Asha Rao', email: 'asha@example.com', message: 'Hello!' };

test('contact form sends the enquiry to the support inbox', async () => {
  const { w, doc, calls } = loadPage('contact/index.html');
  const form = doc.querySelector('form[data-form]');
  fill(form, GOOD);
  const ev = submit(w, form);
  await tick(); await tick();
  assert.equal(ev.defaultPrevented, true, 'browser must not do a normal (URL-leaking) submit');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, TO);
  assert.equal(calls[0].body.email, GOOD.email);
  assert.match(calls[0].body._subject, /Website enquiry \(parent\) from Asha Rao/);
  assert.ok(form.classList.contains('sent'), 'thank-you state shown');
});

test('?topic= pre-selects the matching topic', () => {
  const { doc } = loadPage('contact/index.html', { query: '?topic=educator' });
  assert.equal(doc.querySelector('input[name="topic"]:checked').value, 'educator');
});

test('SECURITY: a crafted ?topic= link cannot break the form (selector injection)', async () => {
  // Before the fix this threw a SyntaxError, so the form fell back to a native
  // GET submit that put the visitor's details in the URL.
  const { w, doc, calls } = loadPage('contact/index.html', { query: '?topic=%22%5D' });
  const form = doc.querySelector('form[data-form]');
  fill(form, GOOD);
  const ev = submit(w, form);
  await tick(); await tick();
  assert.equal(ev.defaultPrevented, true);
  assert.equal(calls.length, 1);
});

test('SECURITY: line breaks in the name cannot inject email headers', async () => {
  const { w, doc, calls } = loadPage('contact/index.html');
  const form = doc.querySelector('form[data-form]');
  fill(form, { ...GOOD, name: 'Eve\r\nBcc: victim@example.com' });
  submit(w, form);
  await tick(); await tick();
  assert.doesNotMatch(calls[0].body._subject, /[\r\n]/);
});

test('SECURITY: bots that fill the honeypot are silently dropped', async () => {
  const { w, doc, calls } = loadPage('contact/index.html');
  const form = doc.querySelector('form[data-form]');
  fill(form, { ...GOOD, _honey: 'http://spam.example' });
  submit(w, form);
  await tick(); await tick();
  assert.equal(calls.length, 0, 'nothing sent');
  assert.ok(form.classList.contains('sent'), 'bot still sees "success"');
});

test('SECURITY: failure message never renders user input as HTML', async () => {
  const { w, doc } = loadPage('contact/index.html', { fetch: async () => ({ ok: false, status: 500 }) });
  const form = doc.querySelector('form[data-form]');
  fill(form, { ...GOOD, name: '<img src=x onerror=alert(1)>' });
  submit(w, form);
  await tick(); await tick();
  const err = form.querySelector('.form-err');
  assert.equal(err.hidden, false, 'error shown');
  assert.equal(err.querySelector('img'), null, 'no injected element');
  assert.match(err.querySelector('a').getAttribute('href'), /^mailto:support@theyounglegends\.co\.in/);
});

test('invalid form is not sent', async () => {
  const { w, doc, calls } = loadPage('contact/index.html');
  const form = doc.querySelector('form[data-form]');
  fill(form, { ...GOOD, email: 'not-an-email' });
  submit(w, form);
  await tick();
  assert.equal(calls.length, 0);
});

test('educator enquiry is labelled as such', async () => {
  const { w, doc, calls } = loadPage('educators/index.html');
  const form = doc.querySelector('form[data-form]');
  form.querySelectorAll('[required]').forEach((el) => {
    if (el.type === 'checkbox') el.checked = true;
    else if (el.tagName === 'SELECT') el.selectedIndex = Math.max(1, el.selectedIndex);
    else el.value = el.type === 'email' ? 'teacher@school.in' : 'Test';
  });
  submit(w, form);
  await tick(); await tick();
  assert.equal(calls.length, 1);
  assert.match(calls[0].body._subject, /Educator enquiry/);
});

test('Dare to Dream waitlist really records the sign-up', async () => {
  const { w, doc, calls } = loadPage('dare-to-dream/index.html');
  const form = doc.querySelector('form[data-form="newsletter_signup"]');
  form.querySelector('input[type="email"]').value = 'parent@example.com';
  submit(w, form);
  await tick(); await tick();
  assert.equal(calls.length, 1);
  assert.match(calls[0].body._subject, /Dare to Dream waitlist/);
  assert.match(form.querySelector('button').textContent, /on the list/);
});
