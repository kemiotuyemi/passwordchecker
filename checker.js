// Pure password-checking logic. No DOM access, no network, no logging.
// Direct port of the Python implementation in Annex A of passwordchecker.md.

// Configurable list of common password patterns (FR-07).
// Extend by adding more entries; matching is case-insensitive and
// searches within the password rather than comparing the whole value.
export const COMMON_PATTERNS = [
  'secret',
  '12345',
  '0000',
  'password',
  'qwerty',
  'admin',
];

export const MIN_NAME_FRAGMENT_LENGTH = 3;

// Length of the sliding window taken from the whole name string. If the
// password contains any NAME_SLICE_LENGTH-character run of the name (e.g.
// `Samu`, `muel`, `avid`), the name-related warning is raised.
export const NAME_SLICE_LENGTH = 4;

// Minimum run of consecutive digits (ascending, descending, or all
// identical) before the consecutive-digit warning is raised.
export const MIN_CONSECUTIVE_DIGITS = 3;

// Maximum number of characters tolerated between consecutive letters when
// matching a name part or a common pattern. `Infinity` means the needle only
// has to appear in order (a subsequence), so `S.a.m.u.e.l` and `Da-vid` are
// detected. Lower this (e.g. to `2`) if false positives become a concern.
export const MATCH_MAX_GAP = Infinity;

// Mirrors Python's string.punctuation.
const SPECIAL_CHARACTERS =
  "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~";

// The five strength requirements, defined once and reused (FR-04).
// Regular expressions use Unicode property escapes so behaviour matches
// Python's str.isupper / str.islower / str.isdigit from Annex A.
const STRENGTH_RULES = [
  { id: 'length', rule: 'At least 8 characters', test: (p) => p.length >= 8 },
  { id: 'uppercase', rule: 'At least one uppercase letter', test: (p) => /\p{Lu}/u.test(p) },
  { id: 'lowercase', rule: 'At least one lowercase letter', test: (p) => /\p{Ll}/u.test(p) },
  { id: 'digit', rule: 'At least one digit', test: (p) => /\p{Nd}/u.test(p) },
  {
    id: 'special',
    rule: 'At least one special character',
    test: (p) => [...p].some((ch) => SPECIAL_CHARACTERS.includes(ch)),
  },
];

// Map the number of passed checks to a strength rating (FR-05).
export function ratingFor(passed) {
  if (passed >= 5) return 'Strong';
  if (passed >= 3) return 'Moderate';
  return 'Weak';
}

// Evaluate the five strength requirements (FR-04, FR-06).
export function checkStrength(password) {
  const checks = STRENGTH_RULES.map(({ id, rule, test }) => ({
    id,
    rule,
    passed: test(password),
  }));

  const passed = checks.filter((c) => c.passed).length;

  return {
    checks,
    passed,
    total: checks.length,
    score: `${passed}/${checks.length}`,
    rating: ratingFor(passed),
    missing: checks.filter((c) => !c.passed).map((c) => c.rule),
  };
}

// Escape a literal string so it can be embedded in a RegExp safely.
function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Does `needle` appear in `haystack`, in order, with up to `maxGap` extra
// characters between consecutive characters? Iterates over code points so
// non-ASCII name characters stay intact.
function matchesWithGaps(needle, haystack, maxGap) {
  if (!needle) return false;

  const gap =
    maxGap === Infinity ? '[\\s\\S]*' : `[\\s\\S]{0,${Math.max(0, maxGap)}}`;
  const pattern = [...needle].map(escapeRegExp).join(gap);

  return new RegExp(pattern).test(haystack);
}

// Detect configured common password patterns (FR-07).
// Matching is case-insensitive, searches within the password, and tolerates
// inserted characters between the pattern's letters. Returns only a flag so
// the detected substring is never surfaced.
export function checkCommonPasswords(password, patterns = COMMON_PATTERNS) {
  const lower = password.toLowerCase();
  const detected = patterns.some((pattern) => matchesWithGaps(pattern, lower, MATCH_MAX_GAP));
  return { hasWarning: detected };
}

const NUMERIC_PATTERN = /^[0-9]+$/;

// Whether any all-digit common pattern (e.g. `12345`, `0000`) matched. Used
// to suppress the duplicate consecutive-digit warning. Returns a boolean
// only — the matched pattern is never surfaced.
export function hasNumericCommonPattern(password, patterns = COMMON_PATTERNS) {
  const lower = password.toLowerCase();
  return patterns.some(
    (pattern) =>
      NUMERIC_PATTERN.test(pattern) && matchesWithGaps(pattern, lower, MATCH_MAX_GAP)
  );
}

// Detect consecutive digits (FR-08 extension): a run of at least
// MIN_CONSECUTIVE_DIGITS digits that is ascending by one (`123`, `2345`),
// descending by one (`9876`, `321`), or all identical (`111`, `0000`).
// Scans ASCII digits only and returns a flag, never the digits themselves.
export function checkConsecutiveDigits(password) {
  let sameLength = 0;
  let ascendingLength = 0;
  let descendingLength = 0;
  let previous = null;
  let flagged = false;

  for (const character of password) {
    if (character < '0' || character > '9') {
      previous = null;
      sameLength = 0;
      ascendingLength = 0;
      descendingLength = 0;
      continue;
    }

    const digit = character.charCodeAt(0) - 48;

    if (previous === null) {
      sameLength = 1;
      ascendingLength = 1;
      descendingLength = 1;
    } else {
      const difference = digit - previous;
      sameLength = difference === 0 ? sameLength + 1 : 1;
      ascendingLength = difference === 1 ? ascendingLength + 1 : 1;
      descendingLength = difference === -1 ? descendingLength + 1 : 1;
    }

    if (
      sameLength >= MIN_CONSECUTIVE_DIGITS ||
      ascendingLength >= MIN_CONSECUTIVE_DIGITS ||
      descendingLength >= MIN_CONSECUTIVE_DIGITS
    ) {
      flagged = true;
    }

    previous = digit;
  }

  return { hasWarning: flagged };
}

// Does the lowercased password contain any NAME_SLICE_LENGTH-character window
// of the lowercased name as a contiguous substring?
function containsNameSlice(lowerPassword, lowerName) {
  const characters = [...lowerName];
  if (characters.length < NAME_SLICE_LENGTH) return false;

  for (let index = 0; index + NAME_SLICE_LENGTH <= characters.length; index += 1) {
    const slice = characters.slice(index, index + NAME_SLICE_LENGTH).join('');
    if (lowerPassword.includes(slice)) return true;
  }

  return false;
}

// Detect parts of the user's name inside the password (FR-01, FR-08).
// Triggers when either the password matches a name word as a gap-tolerant
// subsequence, or it contains any NAME_SLICE_LENGTH-character window of the
// whole name. Name fragments shorter than three characters are ignored for
// the subsequence match. The name itself is never returned or stored.
export function checkName(password, name) {
  const lower = password.toLowerCase();
  const trimmed = String(name).trim().toLowerCase();
  if (!trimmed) return { hasWarning: false };

  const parts = trimmed.split(/\s+/).filter(Boolean);

  const wordMatch = parts.some(
    (part) =>
      part.length >= MIN_NAME_FRAGMENT_LENGTH &&
      matchesWithGaps(part, lower, MATCH_MAX_GAP)
  );

  const sliceMatch = containsNameSlice(lower, trimmed);

  return { hasWarning: wordMatch || sliceMatch };
}

// Validate the three inputs before any strength work runs (FR-10).
// The name is optional; it is only used when the caller enables the name
// check, so an empty name is not an error.
export function validateInputs(name, password, confirm) {
  const errors = {};
  let mismatch = false;

  if (!password) {
    errors.password = 'Password cannot be empty.';
  }
  if (!confirm) {
    errors.confirm = 'Please confirm your password.';
  } else if (password && confirm !== password) {
    errors.confirm = 'Passwords do not match. Please try again.';
    mismatch = true;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    mismatch,
  };
}

// Full report for a single check. Strength evaluation runs only after the
// password and confirmation match (FR-03). The report never includes the
// password, the confirmation, or any detected substring.
export function evaluate(name, password, confirm, options = {}) {
  const { checkNameEnabled = true } = options;
  const validation = validateInputs(name, password, confirm);

  if (!validation.valid) {
    return {
      ok: false,
      errors: validation.errors,
      mismatch: validation.mismatch,
    };
  }

  const strength = checkStrength(password);
  const common = checkCommonPasswords(password);
  const numericCommon = hasNumericCommonPattern(password);
  const digits = checkConsecutiveDigits(password);
  const trimmedName = String(name).trim();
  const nameWarning =
    checkNameEnabled && trimmedName ? checkName(password, name) : { hasWarning: false };

  return {
    ok: true,
    errors: {},
    mismatch: false,
    strength,
    warnings: {
      commonPattern: common.hasWarning,
      nameRelated: nameWarning.hasWarning,
      // A numeric common pattern (e.g. `12345`) already reports the digit
      // sequence, so the generic consecutive-digit warning is suppressed.
      consecutiveDigits: digits.hasWarning && !numericCommon,
    },
  };
}
