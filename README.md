# Password Strength Checker

A fast, client-side password strength checker built from the product
requirements in [`passwordchecker.md`](./passwordchecker.md).

All checking runs **in your browser**. Your password is never sent to a
server, stored, or logged — nothing to configure, no database, no accounts.

Because the app is static files served from a CDN, it scales to any amount
of concurrent traffic (comfortably far beyond 200 simultaneous visitors)
with no server capacity to plan.

---

## Features

- Password hidden by default with a Show/Hide control (does not alter the value)
- Confirmation field that stays masked; mismatch blocks the strength report
- Five strength checks: length ≥ 8, uppercase, lowercase, digit, special character
- Rating of **Weak** (0–2), **Moderate** (3–4), or **Strong** (5), shown as `n/5`
- Clear list of missing requirements
- Warning when the password contains a common pattern (`secret`, `12345`,
  `0000`, `password`, `qwerty`, `admin`) — configurable in `checker.js`
- **Optional name check:** the name field is optional and has a checkbox
  ("Check my password against my name", on by default). Unchecking it hides
  the name field and skips name warnings entirely
- Warning when the password contains part of the user's name — triggered by a
  whole name word **or** any 4-character slice of the whole name
  (`Samu`, `muel`, `avid`, `el D`)
- **Gap-tolerant matching:** names and common patterns are detected even when
  characters are inserted between their letters — `S.a.m.u.e.l`, `Sam123uel`,
  `Da-vid`, and `p.a.s.s.w.o.r.d` all trigger the relevant warning
- Warning when the password contains **consecutive digits** — an ascending,
  descending, or repeated run of 3+ digits (`123`, `9876`, `111`). Numeric
  common patterns like `12345`/`0000` suppress this to avoid a duplicate
- **Check Another Password** clears password, confirmation, and results
- Responsive from mobile to desktop, no horizontal scrolling
- Accessible: labelled inputs, `aria-live` results, `role="alert"` errors,
  visible focus states, pass/fail shown with text and symbols — not colour alone
- Strict Content-Security-Policy and security headers via `vercel.json`

---

## Running locally

No dependencies to install. Any static file server works.

```bash
# Option 1: npm script (uses Python's built-in server)
npm run serve
# then open http://localhost:4173

# Option 2: any static server
python3 -m http.server 4173
npx serve .
```

> Note: the app uses ES modules, so open it through a server rather than a
> `file://` path — browsers block module loading on `file://`.

---

## Tests

```bash
npm test
```

Uses Node's built-in test runner (`node --test`, Node 18+). Two suites:

| Suite | Runs | Coverage |
|---|---|---|
| `tests/checker.test.js` | Pure logic, no browser | AC-01 through AC-07, AC-10 through AC-13; rating thresholds; privacy assertions proving no report object contains password material |
| `tests/e2e.test.js` | Real headless Chrome via `puppeteer-core` | AC-01, AC-07 through AC-16 in the browser: masking, toggle, mismatch, warnings, reset, network/console leakage, 375px layout, labels/`aria-live`/focus |

The end-to-end suite starts its own local static server on an ephemeral port,
so no extra setup is needed. It needs a Chrome/Chromium binary and is
**skipped automatically** if none is found (path resolution order:
`PUPPETEER_EXECUTABLE_PATH` → `CHROME_PATH` → system Chrome → puppeteer's
browser cache).

`puppeteer-core` is a dev dependency only; nothing is needed at runtime.

---

## Deploying to Vercel

1. Push the repository to GitHub:
   ```bash
   git add -A
   git commit -m "Password strength checker web app"
   git remote add origin <your-repo-url>
   git push -u origin master
   ```
2. Go to [vercel.com/new](https://vercel.com/new) and import the repository.
3. Set the project settings:
   - **Framework Preset:** Other
   - **Build Command:** *(leave empty)*
   - **Output Directory:** `.`
4. Deploy. Vercel serves the site over HTTPS and applies the security
   headers defined in `vercel.json`.

No environment variables are required.

### Environment variables

None. The application has no backend and no configuration surface.

---

## Project structure

```
index.html              Markup: name, password, confirmation, results
styles.css              Responsive and accessible styling
checker.js              Pure checking logic (no DOM, no network) — ESM exports
app.js                  DOM wiring, validation display, rendering, reset
tests/checker.test.js   Automated tests for the checking logic
tests/e2e.test.js       Browser tests against headless Chrome
vercel.json             Static hosting config + security headers
package.json            Test/serve scripts; puppeteer-core as a dev dependency
```

---

## Performance and scale

The whole application is about **21 KB of uncompressed text** across four
files (`index.html`, `styles.css`, `app.js`, `checker.js`) — roughly 6 KB
gzip-compressed. There is no framework, no build output, no database, and no
application server.

- **Speed:** the browser fetches four static files and runs the check
  instantly in memory — no round trip is performed to evaluate a password.
- **200 concurrent visitors:** since every visitor is served cached static
  files from Vercel's edge network and does their own checking locally,
  there is no server process to saturate. Nothing in the architecture
  changes at 200, 2,000, or 200,000 concurrent users.
- Local sanity check: 200 concurrent requests to a static server all
  returned `200` with zero failures.

---

## Deviations from the original Python implementation

The core logic in [`checker.js`](./checker.js) is a direct port of Annex A.
Documented differences:

1. **No `getpass`.** Browser `type="password"` fields replace terminal input,
   as required by the PRD.
2. **Confirmation retry flow fixed.** The terminal version printed
   "Password mismatch" and returned `False` inside a `while True` loop that
   never re-prompted correctly. Here a mismatch simply shows the message and
   leaves both fields intact so the user can correct the confirmation
   without retyping the password (FR-03).
3. **Unicode-aware character checks.** `isupper()` / `islower()` / `isdigit()`
   are replaced with Unicode property escapes (`\p{Lu}`, `\p{Ll}`, `\p{Nd}`),
   which behave like the Python methods across non-ASCII input. ASCII
   behaviour is identical.
4. **Warnings return flags only.** The Python version printed which pattern
   matched; the web version returns only `{ hasWarning }` so no detected
   substring can reach the UI, logs, or telemetry (FR-07).
5. **The rating is an educational indicator**, not a security guarantee —
   stated in the page footer as well as here.
6. **Checks run once per submission** instead of in a REPL-style loop; the
   **Check Another Password** button provides the repeat flow (FR-09).
7. **Gap-tolerant (subsequence) matching.** Annex A used contiguous `in`
   checks (`part in password`). This version matches name parts and common
   patterns as **subsequences**, so inserted characters between letters still
   warn — `S.a.m.u.e.l`, `Sam123uel`, `Da-vid`, `p.a.s.s.w.o.r.d`. The
   tolerance is controlled by the exported constant `MATCH_MAX_GAP` in
   `checker.js`; it defaults to `Infinity` (any number of inserted
   characters). Lower it (e.g. to `2`) if false positives become a concern.
   Trade-off: `Infinity` catches more obfuscation but can flag unrelated
   passwords that happen to contain the name's letters in order.
8. **The name is optional (PRD deviation).** FR-01 and FR-10 required a name
   and rejected an empty one. Here the name is optional and there is a
   checkbox to skip name checks entirely; an empty submission only reports
   the password/confirm errors.
9. **4-character name slice.** Besides whole-word matching, the name warning
   also fires on any `NAME_SLICE_LENGTH`-character window of the whole name
   string (`Samu`, `muel`, `avid`, `el D`), matched as a contiguous,
   case-insensitive substring.
10. **Consecutive-digit warning (new rule).** A run of at least
    `MIN_CONSECUTIVE_DIGITS` digits that ascends (`123`), descends (`9876`),
    or repeats (`111`, `0000`) raises its own warning. This rule does not
    exist in Annex A.
11. **Duplicate suppression.** When a numeric common pattern (`12345`,
    `0000`) matches, the generic consecutive-digit warning is suppressed so
    the same behaviour is not reported twice. Caveat: a mixed password such
    as `0000abc123` reports the common pattern and therefore hides the
    separate `123` notice.

### Known limitation: leetspeak substitution

Gap-tolerant matching handles **insertions** (`Da-vid`), not **substitutions**.
`D4v1d` and `p@ssw0rd` are *not* flagged, because replacing `a` with `4`
removes the letter the matcher looks for. Detecting substitutions would need
a separate leet-normalisation step.

---

## Security notes

- Passwords are never written to the console, network, URL, storage, or any log.
- No third-party scripts, fonts, or analytics are loaded — the CSP allows only
  same-origin resources.
- No data is persisted; closing the tab discards everything, and fields are
  cleared on page exit.
- HTTPS is enforced in production by Vercel (HSTS header included).
- This tool assesses password structure only. It cannot guarantee a password
  is safe from guessing, credential stuffing, or data breaches.
