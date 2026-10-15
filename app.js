// UI layer: renders inputs and results. Never logs or transmits password data.

import { evaluate } from './checker.js';

const form = document.getElementById('checker-form');
const nameField = document.getElementById('name-field');
const nameInput = document.getElementById('name');
const useNameInput = document.getElementById('use-name');
const passwordInput = document.getElementById('password');
const confirmInput = document.getElementById('confirm');
const toggleButton = document.getElementById('toggle-password');

const results = document.getElementById('results');
const resultsSummary = document.getElementById('results-summary');
const resultsBody = document.getElementById('results-body');
const resultsActions = document.getElementById('results-actions');
const resetButton = document.getElementById('reset-button');

const FIELD_IDS = ['name', 'password', 'confirm'];

// Small DOM helper. User-supplied values are only ever assigned to text
// nodes, so nothing can be interpreted as markup.
function el(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.attrs) {
    for (const [key, value] of Object.entries(options.attrs)) {
      node.setAttribute(key, value);
    }
  }
  for (const child of children) {
    if (child) node.append(child);
  }
  return node;
}

function setFieldError(fieldId, message) {
  const input = document.getElementById(fieldId);
  const error = document.getElementById(`${fieldId}-error`);
  if (message) {
    input.setAttribute('aria-invalid', 'true');
    error.textContent = message;
    error.hidden = false;
  } else {
    input.removeAttribute('aria-invalid');
    error.textContent = '';
    error.hidden = true;
  }
}

function clearFieldErrors() {
  FIELD_IDS.forEach((id) => setFieldError(id, ''));
}

function showResults() {
  results.hidden = false;
}

function hideResults() {
  results.hidden = true;
  resultsSummary.textContent = '';
  resultsBody.textContent = '';
  resultsActions.hidden = true;
}

function renderSummary(strength) {
  const level = strength.rating.toLowerCase();
  const symbol = strength.rating === 'Strong' ? '✓' : '⚠';

  const badge = el('span', {
    className: `rating rating--${level}`,
    text: `${symbol} ${strength.rating}`,
  });
  const score = el('span', { className: 'score', text: `${strength.score} checks passed` });

  resultsSummary.replaceChildren(badge, score);
}

function renderProgress(strength) {
  const segments = strength.checks.map((check) =>
    el('div', {
      className: 'progress__segment',
      attrs: { 'data-state': check.passed ? 'pass' : 'fail' },
    })
  );
  return el('div', {
    className: 'progress',
    attrs: {
      role: 'img',
      'aria-label': `${strength.passed} of ${strength.total} requirements passed`,
    },
  }, segments);
}

function renderChecks(strength) {
  const items = strength.checks.map((check) =>
    el('li', {
      className: 'checks__item',
      attrs: { 'data-pass': String(check.passed) },
    }, [
      el('span', { className: 'checks__mark', text: check.passed ? '✓' : '✕' }),
      el('span', {
        text: `${check.rule}: ${check.passed ? 'Passed' : 'Missing'}`,
      }),
    ])
  );

  const list = el('ul', { className: 'checks' }, items);
  const heading = el('h2', { className: 'results__heading', text: 'Requirements' });

  return el('div', {}, [heading, renderProgress(strength), list]);
}

function renderRequirementsNotice(strength) {
  if (strength.missing.length === 0) {
    return el('div', { className: 'notice notice--success' }, [
      el('p', { className: 'notice__title', text: '✓ All requirements satisfied.' }),
    ]);
  }

  const listItems = strength.missing.map((rule) => el('li', { text: rule }));
  const list = el('ul', { className: 'missing' }, listItems);

  return el('div', { className: 'notice notice--warning' }, [
    el('p', { className: 'notice__title', text: '⚠ Missing requirements' }),
    el('p', { text: 'Improve your password by addressing the following:' }),
    list,
  ]);
}

function renderWarnings(warnings) {
  const notices = [];

  if (warnings.commonPattern) {
    notices.push(
      el('div', { className: 'notice notice--warning' }, [
        el('p', { className: 'notice__title', text: '⚠ Warning: Common password pattern' }),
        el('p', {
          text: 'Your password contains a common password pattern. Choose something less predictable.',
        }),
      ])
    );
  }

  if (warnings.nameRelated) {
    notices.push(
      el('div', { className: 'notice notice--warning' }, [
        el('p', { className: 'notice__title', text: '⚠ Warning: Name-related pattern' }),
        el('p', {
          text: 'Your password contains part of your name. Personal information can make a password easier to guess.',
        }),
      ])
    );
  }

  if (warnings.consecutiveDigits) {
    notices.push(
      el('div', { className: 'notice notice--warning' }, [
        el('p', { className: 'notice__title', text: '⚠ Warning: Consecutive digits' }),
        el('p', {
          text: 'Your password contains consecutive digits. Avoid predictable sequences like 123 or 111.',
        }),
      ])
    );
  }

  if (notices.length === 0) {
    notices.push(
      el('div', { className: 'notice notice--success' }, [
        el('p', { className: 'notice__title', text: '✓ No warning patterns detected.' }),
      ])
    );
  }

  return el('div', { className: 'notices' }, notices);
}

function renderReport(report) {
  renderSummary(report.strength);
  resultsBody.replaceChildren(
    renderChecks(report.strength),
    renderRequirementsNotice(report.strength),
    renderWarnings(report.warnings)
  );
  resultsActions.hidden = false;
  showResults();
}

function hideToggleToDefault() {
  passwordInput.type = 'password';
  toggleButton.textContent = 'Show';
  toggleButton.setAttribute('aria-pressed', 'false');
}

function resetForm() {
  // FR-09 / AC-14: clear password, confirmation, and result data.
  passwordInput.value = '';
  confirmInput.value = '';
  clearFieldErrors();
  hideResults();
  hideToggleToDefault();
  passwordInput.focus();
}

function syncNameVisibility() {
  const enabled = useNameInput.checked;
  nameField.hidden = !enabled;
  if (!enabled) setFieldError('name', '');
}

function handleSubmit(event) {
  event.preventDefault();
  clearFieldErrors();

  const report = evaluate(nameInput.value, passwordInput.value, confirmInput.value, {
    checkNameEnabled: useNameInput.checked,
  });

  if (!report.ok) {
hideResults();
syncNameVisibility();
    if (report.errors.password) setFieldError('password', report.errors.password);
    if (report.errors.confirm) setFieldError('confirm', report.errors.confirm);

    // Move focus to the first field that needs attention.
    const firstInvalid = ['password', 'confirm'].find((id) => report.errors[id]);
    if (firstInvalid) document.getElementById(firstInvalid).focus();
    return;
  }

  renderReport(report);
}

// Validation errors clear as soon as the user edits the field.
FIELD_IDS.forEach((id) => {
  document.getElementById(id).addEventListener('input', () => setFieldError(id, ''));
});

// Visibility control only toggles the input type; it never reads or
// changes the password value.
toggleButton.addEventListener('click', () => {
  const reveal = passwordInput.type === 'password';
  passwordInput.type = reveal ? 'text' : 'password';
  toggleButton.textContent = reveal ? 'Hide' : 'Show';
  toggleButton.setAttribute('aria-pressed', String(reveal));
});

form.addEventListener('submit', handleSubmit);
resetButton.addEventListener('click', resetForm);

// The name check is optional: unchecking hides the name field and skips
// name-based warnings entirely.
useNameInput.addEventListener('change', syncNameVisibility);

// Privacy: clear sensitive values as soon as the page is left.
window.addEventListener('pagehide', () => {
  passwordInput.value = '';
  confirmInput.value = '';
});

hideResults();
