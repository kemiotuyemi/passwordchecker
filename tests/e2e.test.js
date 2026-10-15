// End-to-end UI tests driven by a real headless Chrome.
// Covers the acceptance criteria that need a browser:
// AC-01, AC-07..AC-16.

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const NAME = 'Samuel David';
const STRONG = 'BlueSky7!';
const OTHER = 'BlueSky8!';
const SECRET_PW = 'Mysecret1!';
const NAME_PW = 'Samuel123!';
const SENSITIVE_VALUES = [NAME, STRONG, OTHER, SECRET_PW, NAME_PW];

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.md': 'text/markdown; charset=utf-8',
};

function findChrome() {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_PATH,
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/snap/bin/chromium',
  ].filter(Boolean);

  // Chrome builds cached by puppeteer live under ~/.cache/puppeteer.
  const cache = path.join(os.homedir(), '.cache', 'puppeteer', 'chrome');
  if (fs.existsSync(cache)) {
    for (const build of fs.readdirSync(cache)) {
      for (const rel of ['chrome-linux64/chrome', 'chrome-linux/chrome']) {
        candidates.push(path.join(cache, build, rel));
      }
    }
  }

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

const CHROME = findChrome();
const SKIP = CHROME ? false : 'no Chrome/Chromium binary found';

function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const relative = urlPath === '/' ? 'index.html' : urlPath.replace(/^\//, '');
    const filePath = path.resolve(ROOT, relative);

    if (!filePath.startsWith(ROOT + path.sep)) {
      res.writeHead(403).end('Forbidden');
      return;
    }

    fs.readFile(filePath, (error, data) => {
      if (error) {
        res.writeHead(404).end('Not found');
        return;
      }
      res.writeHead(200, {
        'Content-Type': CONTENT_TYPES[path.extname(filePath)] ?? 'application/octet-stream',
      });
      res.end(data);
    });
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, baseUrl: `http://127.0.0.1:${server.address().port}` });
    });
  });
}

let browser;
let baseUrl;
let httpServer;

before(async () => {
  if (SKIP) return;
  ({ server: httpServer, baseUrl } = await startServer());
  browser = await puppeteer.launch({
    executablePath: CHROME,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
});

after(async () => {
  if (browser) await browser.close();
  if (httpServer) await new Promise((resolve) => httpServer.close(resolve));
});

// Opens a fresh page that records every request, console line, and error.
async function openPage(context = {}) {
  const page = await browser.newPage();
  if (context.viewport) await page.setViewport(context.viewport);

  const traffic = { requests: [], console: [], errors: [] };
  page.on('request', (request) => {
    // Chrome may fetch a favicon at any time; it is not app traffic.
    if (request.url().endsWith('/favicon.ico')) return;
    traffic.requests.push({ method: request.method(), url: request.url() });
  });
  page.on('console', (message) => traffic.console.push(message.text()));
  page.on('pageerror', (error) => traffic.errors.push(String(error)));

  await page.goto(baseUrl, { waitUntil: 'load' });
  return { page, traffic };
}

async function submit(page) {
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => {
    const results = document.getElementById('results');
    const anyError = ['name', 'password', 'confirm'].some(
      (id) => !document.getElementById(`${id}-error`).hidden
    );
    return !results.hidden || anyError;
  });
}

async function fill(page, { name = NAME, password, confirm }) {
  await page.$eval('#name', (input) => { input.value = ''; });
  await page.$eval('#password', (input) => { input.value = ''; });
  await page.$eval('#confirm', (input) => { input.value = ''; });
  if (name) await page.type('#name', name);
  if (password) await page.type('#password', password);
  if (confirm) await page.type('#confirm', confirm);
}

const resultsVisible = (page) => page.$eval('#results', (el) => !el.hidden);
const errorText = (page, id) =>
  page.$eval(`#${id}-error`, (el) => (el.hidden ? null : el.textContent));

describe('page load', () => {
  test('renders the checker with results hidden and no page errors', { skip: SKIP }, async () => {
    const { page, traffic } = await openPage();

    assert.match(await page.$eval('h1', (el) => el.textContent), /Password Strength Checker/);
    assert.equal(await page.$eval('#password', (el) => el.type), 'password');
    assert.equal(await resultsVisible(page), false);
    assert.deepEqual(traffic.errors, []);

    await page.close();
  });
});

describe('AC-08 / AC-09: masking and visibility toggle', () => {
  test('password stays masked and toggling never changes its value', { skip: SKIP }, async () => {
    const { page } = await openPage();

    await page.type('#password', STRONG);
    assert.equal(await page.$eval('#password', (el) => el.type), 'password');

    await page.click('#toggle-password');
    assert.equal(await page.$eval('#password', (el) => el.type), 'text');
    assert.equal(await page.$eval('#toggle-password', (el) => el.textContent.trim()), 'Hide');
    assert.equal(await page.$eval('#password', (el) => el.value), STRONG);

    await page.click('#toggle-password');
    assert.equal(await page.$eval('#password', (el) => el.type), 'password');
    assert.equal(await page.$eval('#password', (el) => el.value), STRONG);

    await page.close();
  });

  test('confirmation field has no reveal control', { skip: SKIP }, async () => {
    const { page } = await openPage();
    assert.equal(await page.$eval('#confirm', (el) => el.type), 'password');
    assert.equal(await page.$('toggle-confirm'), null);
    await page.close();
  });
});

describe('AC-01: a compliant password rates Strong', () => {
  test('reports Strong and 5/5 after a matching pair', { skip: SKIP }, async () => {
    const { page } = await openPage();
    await fill(page, { password: STRONG, confirm: STRONG });
    await submit(page);

    assert.equal(await resultsVisible(page), true);
    const summary = await page.$eval('#results-summary', (el) => el.textContent);
    assert.match(summary, /Strong/);
    assert.match(summary, /5\/5/);

    const checks = await page.$$eval('.checks__item', (items) =>
      items.map((item) => ({ pass: item.dataset.pass, text: item.textContent }))
    );
    assert.equal(checks.length, 5);
    assert.ok(checks.every((c) => c.pass === 'true'));
    assert.ok(checks.every((c) => /Passed/.test(c.text)));
    assert.ok(checks.every((c) => !/Missing/.test(c.text)));

    await page.close();
  });
});

describe('AC-07: mismatch suppresses the strength report', () => {
  test('shows the exact mismatch message and hides results', { skip: SKIP }, async () => {
    const { page } = await openPage();
    await fill(page, { password: STRONG, confirm: OTHER });
    await submit(page);

    assert.equal(await errorText(page, 'confirm'), 'Passwords do not match. Please try again.');
    assert.equal(await resultsVisible(page), false);
    // The first password must survive a mismatch so the user can fix only the confirmation.
    assert.equal(await page.$eval('#password', (el) => el.value), STRONG);

    await page.close();
  });
});

describe('AC-10..AC-12: warning detection', () => {
  test('AC-10: a common pattern triggers a general warning without revealing it', { skip: SKIP }, async () => {
    const { page } = await openPage();
    await fill(page, { password: SECRET_PW, confirm: SECRET_PW });
    await submit(page);

    const text = await page.$eval('#results-body', (el) => el.textContent);
    assert.match(text, /common password pattern/i);
    assert.doesNotMatch(text, /secret/i); // warning is generic, substring never echoed

    await page.close();
  });

  test('AC-12: a name fragment triggers the name-related warning', { skip: SKIP }, async () => {
    const { page } = await openPage();
    await fill(page, { password: NAME_PW, confirm: NAME_PW });
    await submit(page);

    const text = await page.$eval('#results-body', (el) => el.textContent);
    assert.match(text, /part of your name/i);
    assert.doesNotMatch(text, /Samuel/);

    await page.close();
  });

  test('name letters separated by inserted characters still warn', { skip: SKIP }, async () => {
    const { page } = await openPage();
    const interleaved = 'S.a.m.u.e.l.9!';
    await fill(page, { password: interleaved, confirm: interleaved });
    await submit(page);

    const text = await page.$eval('#results-body', (el) => el.textContent);
    assert.match(text, /part of your name/i);
    // The warning must stay generic: neither the password nor the name leaks.
    assert.doesNotMatch(text, /Samuel/);
    assert.doesNotMatch(text, /S\.a\.m\.u\.e\.l/);
    const bodyText = await page.evaluate(() => document.body.innerText);
    assert.equal(bodyText.includes(interleaved), false);

    await page.close();
  });

  test('common patterns separated by inserted characters still warn', { skip: SKIP }, async () => {
    const { page } = await openPage();
    const interleaved = 'p.a.s.s.w.o.r.d.1!';
    await fill(page, { password: interleaved, confirm: interleaved });
    await submit(page);

    const text = await page.$eval('#results-body', (el) => el.textContent);
    assert.match(text, /common password pattern/i);
    assert.match(text, /less predictable/i);

    await page.close();
  });

  test('a clean password shows no warnings', { skip: SKIP }, async () => {
    const { page } = await openPage();
    await fill(page, { password: STRONG, confirm: STRONG });
    await submit(page);

    const text = await page.$eval('#results-body', (el) => el.textContent);
    assert.doesNotMatch(text, /Warning:/);

    await page.close();
  });
});

describe('name slices, consecutive digits, and the name toggle', () => {
  test('a 4-character name slice triggers the name warning', { skip: SKIP }, async () => {
    const { page } = await openPage();
    const password = 'xxSamuyy9!';
    await fill(page, { password, confirm: password });
    await submit(page);

    const text = await page.$eval('#results-body', (el) => el.textContent);
    assert.match(text, /part of your name/i);
    assert.doesNotMatch(text, /Samu/); // the warning stays generic

    await page.close();
  });

  test('consecutive digits trigger their own warning', { skip: SKIP }, async () => {
    const { page } = await openPage();
    const password = 'BlueSky123!';
    await fill(page, { name: '', password, confirm: password });
    await submit(page);

    const text = await page.$eval('#results-body', (el) => el.textContent);
    assert.match(text, /Consecutive digits/i);
    assert.match(text, /predictable sequences/i);

    await page.close();
  });

  test('a numeric common pattern suppresses the duplicate digit notice', { skip: SKIP }, async () => {
    const { page } = await openPage();
    const password = 'Trout12345!';
    await fill(page, { name: '', password, confirm: password });
    await submit(page);

    const text = await page.$eval('#results-body', (el) => el.textContent);
    assert.match(text, /common password pattern/i);
    assert.doesNotMatch(text, /Consecutive digits/i);

    await page.close();
  });

  test('unchecking the name toggle hides the field and skips the name warning', { skip: SKIP }, async () => {
    const { page } = await openPage();
    const password = 'S.a.m.u.e.l.9!';

    // With the toggle on, an interleaved name warns.
    await fill(page, { password, confirm: password });
    await submit(page);
    assert.match(await page.$eval('#results-body', (el) => el.textContent), /part of your name/i);

    // Unchecking the toggle hides the name field entirely.
    await page.click('#use-name');
    assert.equal(await page.$eval('#name-field', (el) => el.hidden), true);

    // Re-running no longer reports a name warning.
    await page.click('#reset-button');
    await fill(page, { name: '', password, confirm: password });
    await submit(page);
    const text = await page.$eval('#results-body', (el) => el.textContent);
    assert.doesNotMatch(text, /part of your name/i);

    await page.close();
  });
});

describe('AC-13: empty input validation', () => {
  test('rejects an empty submission without showing results', { skip: SKIP }, async () => {
    const { page } = await openPage();
    await page.evaluate(() => {
      document.getElementById('name').value = '';
      document.getElementById('password').value = '';
      document.getElementById('confirm').value = '';
    });
    await submit(page);

    // The name is optional, so an empty submission only reports the password.
    assert.equal(await errorText(page, 'name'), null);
    assert.equal(await errorText(page, 'password'), 'Password cannot be empty.');
    assert.equal(await resultsVisible(page), false);

    await page.close();
  });

  test('a blank name with a valid password is accepted', { skip: SKIP }, async () => {
    const { page } = await openPage();
    await fill(page, { name: '', password: STRONG, confirm: STRONG });
    await submit(page);

    assert.equal(await errorText(page, 'name'), null);
    assert.equal(await resultsVisible(page), true);

    await page.close();
  });
});

describe('AC-14: repeat check', () => {
  test('reset clears password, confirmation, and results but keeps the name', { skip: SKIP }, async () => {
    const { page } = await openPage();
    await fill(page, { password: STRONG, confirm: STRONG });
    await submit(page);
    assert.equal(await resultsVisible(page), true);

    await page.click('#reset-button');
    await page.waitForFunction(() => document.getElementById('results').hidden);

    assert.equal(await page.$eval('#password', (el) => el.value), '');
    assert.equal(await page.$eval('#confirm', (el) => el.value), '');
    assert.equal(await page.$eval('#name', (el) => el.value), NAME);
    assert.equal(await page.$eval('#password', (el) => el.type), 'password');
    assert.equal(await page.$eval('#results-body', (el) => el.children.length), 0);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'password');

    await page.close();
  });
});

describe('AC-15: no password leaves the browser', () => {
  test('a full check makes no new requests and logs nothing sensitive', { skip: SKIP }, async () => {
    const { page, traffic } = await openPage();
    const loadedAt = traffic.requests.length;

    await fill(page, { password: SECRET_PW, confirm: SECRET_PW });
    await submit(page);
    await new Promise((resolve) => setTimeout(resolve, 300));

    // The checker must be entirely client-side: no uploads, no telemetry.
    assert.equal(traffic.requests.length, loadedAt, 'unexpected network activity after submit');
    assert.ok(traffic.requests.every((r) => r.method === 'GET' || r.method === 'HEAD'));

    const observed = [...traffic.requests.map((r) => r.url), ...traffic.console].join('\n');
    for (const value of SENSITIVE_VALUES) {
      assert.equal(observed.includes(value), false, `sensitive value leaked: ${value}`);
    }

    // Password must never reach the DOM as visible text or a URL.
    const domText = await page.evaluate(() => document.body.innerText);
    assert.equal(domText.includes(SECRET_PW), false);

    assert.deepEqual(traffic.errors, []);
    await page.close();
  });

  test('passwords are never placed in the URL', { skip: SKIP }, async () => {
    const { page, traffic } = await openPage();
    await fill(page, { password: STRONG, confirm: STRONG });
    await submit(page);

    assert.equal(new URL(page.url()).search, '');
    assert.ok(traffic.requests.every((r) => !r.url.includes(STRONG)));

    await page.close();
  });
});

describe('AC-16: responsive layout', () => {
  test('a 375px-wide mobile viewport has no horizontal scrolling', { skip: SKIP }, async () => {
    const { page } = await openPage({ viewport: { width: 375, height: 667 } });

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    assert.ok(
      overflow.scrollWidth <= overflow.innerWidth,
      `horizontal overflow: ${overflow.scrollWidth}px > ${overflow.innerWidth}px`
    );

    // Results must also fit after a check.
    await fill(page, { password: STRONG, confirm: STRONG });
    await submit(page);
    const after = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    assert.ok(after.scrollWidth <= after.innerWidth, 'results cause horizontal overflow');

    await page.close();
  });
});

describe('accessibility basics', () => {
  test('inputs are labelled, errors alert, and results announce changes', { skip: SKIP }, async () => {
    const { page } = await openPage();

    for (const id of ['name', 'password', 'confirm']) {
      const label = await page.$eval(`#${id}`, (el) =>
        document.querySelector(`label[for="${el.id}"]`)?.textContent ?? null
      );
      assert.ok(label && label.trim().length > 0, `missing label for #${id}`);
    }

    assert.equal(await page.$eval('#confirm-error', (el) => el.getAttribute('role')), 'alert');
    assert.equal(await page.$eval('#results', (el) => el.getAttribute('aria-live')), 'polite');

    // Tab order reaches the primary action (checkbox, name, password,
    // toggle, confirm = 5 stops before the button), and keyboard focus is
    // visible.
    for (let i = 0; i < 6; i += 1) await page.keyboard.press('Tab');
    assert.equal(
      await page.evaluate(() => document.activeElement.matches('button[type="submit"]')),
      true,
      'the primary button must be reachable by keyboard'
    );
    const outline = await page.evaluate(() => {
      const style = getComputedStyle(document.activeElement);
      return `${style.outlineStyle} ${style.outlineWidth}`;
    });
    assert.notEqual(outline.split(' ')[0], 'none');

    await fill(page, { password: STRONG, confirm: STRONG });
    await submit(page);

    // Status must not rely on colour alone: symbols and words are present.
    const summary = await page.$eval('#results-summary', (el) => el.textContent);
    assert.match(summary, /✓/);
    assert.match(summary, /Strong/);

    await page.close();
  });
});
