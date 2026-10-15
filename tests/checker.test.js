import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  evaluate,
  checkStrength,
  checkCommonPasswords,
  checkName,
  checkConsecutiveDigits,
  validateInputs,
  ratingFor,
  COMMON_PATTERNS,
  MIN_NAME_FRAGMENT_LENGTH,
  NAME_SLICE_LENGTH,
  MIN_CONSECUTIVE_DIGITS,
} from '../checker.js';

const RULE_LENGTH = 'At least 8 characters';
const RULE_UPPER = 'At least one uppercase letter';
const RULE_LOWER = 'At least one lowercase letter';
const RULE_DIGIT = 'At least one digit';
const RULE_SPECIAL = 'At least one special character';

function ruleResult(strength, rule) {
  const check = strength.checks.find((c) => c.rule === rule);
  assert.ok(check, `expected rule "${rule}" to exist`);
  return check.passed;
}

// ---------- Acceptance criteria ----------

describe('AC-01: a fully compliant password rates Strong', () => {
  test('BlueSky7! passes all five checks', () => {
    const strength = checkStrength('BlueSky7!');
    assert.equal(strength.passed, 5);
    assert.equal(strength.score, '5/5');
    assert.equal(strength.rating, 'Strong');
    assert.deepEqual(strength.missing, []);
  });

  test('evaluate() reports Strong for a matching pair', () => {
    const report = evaluate('Samuel David', 'BlueSky7!', 'BlueSky7!');
    assert.equal(report.ok, true);
    assert.equal(report.strength.rating, 'Strong');
    assert.equal(report.strength.passed, 5);
  });
});

describe('AC-02..AC-06: each requirement can fail independently', () => {
  test('AC-02: password shorter than eight characters fails length', () => {
    const strength = checkStrength('Ab1!xyz');
    assert.equal(ruleResult(strength, RULE_LENGTH), false);
    assert.ok(strength.missing.includes(RULE_LENGTH));
  });

  test('AC-03: password without uppercase letters fails uppercase', () => {
    const strength = checkStrength('abcdefg1!');
    assert.equal(ruleResult(strength, RULE_UPPER), false);
    assert.ok(strength.missing.includes(RULE_UPPER));
  });

  test('AC-04: password without lowercase letters fails lowercase', () => {
    const strength = checkStrength('ABCDEFG1!');
    assert.equal(ruleResult(strength, RULE_LOWER), false);
    assert.ok(strength.missing.includes(RULE_LOWER));
  });

  test('AC-05: password without digits fails digit', () => {
    const strength = checkStrength('Abcdefgh!');
    assert.equal(ruleResult(strength, RULE_DIGIT), false);
    assert.ok(strength.missing.includes(RULE_DIGIT));
  });

  test('AC-06: password without special characters fails special', () => {
    const strength = checkStrength('Abcdefg12');
    assert.equal(ruleResult(strength, RULE_SPECIAL), false);
    assert.ok(strength.missing.includes(RULE_SPECIAL));
  });

  test('exactly one failing requirement yields 4/5 Moderate', () => {
    const strength = checkStrength('Abcdefg1'); // no special char
    assert.equal(strength.passed, 4);
    assert.equal(strength.score, '4/5');
    assert.equal(strength.rating, 'Moderate');
    assert.deepEqual(strength.missing, [RULE_SPECIAL]);
  });
});

describe('AC-07: mismatch suppresses the strength report', () => {
  test('mismatch sets the exact message and reports no strength data', () => {
    const report = evaluate('Samuel David', 'BlueSky7!', 'BlueSky8!');
    assert.equal(report.ok, false);
    assert.equal(report.mismatch, true);
    assert.equal(report.errors.confirm, 'Passwords do not match. Please try again.');
    assert.equal(report.strength, undefined);
    assert.equal(report.warnings, undefined);
  });

  test('validateInputs flags mismatch without touching other fields', () => {
    const result = validateInputs('Samuel', 'BlueSky7!', 'Other');
    assert.equal(result.valid, false);
    assert.equal(result.mismatch, true);
    assert.equal(result.errors.name, undefined);
    assert.equal(result.errors.password, undefined);
  });
});

describe('AC-10..AC-11: common password pattern detection', () => {
  test('AC-10: password containing "secret" warns', () => {
    const report = evaluate('Samuel David', 'Mysecret1!', 'Mysecret1!');
    assert.equal(report.ok, true);
    assert.equal(report.warnings.commonPattern, true);
  });

  test('AC-11: password containing "12345" warns', () => {
    const report = evaluate('Samuel David', 'Trout12345!', 'Trout12345!');
    assert.equal(report.ok, true);
    assert.equal(report.warnings.commonPattern, true);
  });

  test('detection is case-insensitive and searches within the password', () => {
    assert.equal(checkCommonPasswords('SeCrEt-Key!').hasWarning, true);
    assert.equal(checkCommonPasswords('xxPASSWORDyy!').hasWarning, true);
  });

  test('detects common patterns with inserted characters between letters', () => {
    assert.equal(checkCommonPasswords('s.e.c.r.e.t').hasWarning, true);
    assert.equal(checkCommonPasswords('sXeXcXrXeXt-9').hasWarning, true); // inserted letters
    assert.equal(checkCommonPasswords('secr et 1!').hasWarning, true); // inserted spaces
    assert.equal(checkCommonPasswords('p.a.s.s.w.o.r.d').hasWarning, true);
    assert.equal(checkCommonPasswords('q_w_e_r_t_y9').hasWarning, true);
    assert.equal(checkCommonPasswords('a-d-m-i-n-1').hasWarning, true);
    // '12345' appears as a subsequence among other characters.
    assert.equal(checkCommonPasswords('1a2b3c4d5e').hasWarning, true);
    // '0000' needs four zeros in order, not necessarily adjacent.
    assert.equal(checkCommonPasswords('0x0x0x0y!').hasWarning, true);
  });

  test('does not treat leetspeak substitution as a match', () => {
    // `3` for `e` is a substitution, not an insertion, so it stays clean.
    assert.equal(checkCommonPasswords('S3cR3t-Key!').hasWarning, false);
    assert.equal(checkCommonPasswords('p@ssw0rd!').hasWarning, false);
  });

  test('a password without the configured patterns stays clean', () => {
    assert.equal(checkCommonPasswords('BlueSky7!').hasWarning, false);
    assert.equal(checkCommonPasswords('Tr0ub4dor&3').hasWarning, false);
  });

  test('all configured initial patterns are present', () => {
    for (const pattern of ['secret', '12345', '0000', 'password', 'qwerty', 'admin']) {
      assert.ok(COMMON_PATTERNS.includes(pattern), `missing pattern: ${pattern}`);
      assert.equal(checkCommonPasswords(`zz${pattern}zz`).hasWarning, true, pattern);
    }
  });

  test('a clean password raises no common-pattern warning', () => {
    const report = evaluate('Samuel David', 'BlueSky7!', 'BlueSky7!');
    assert.equal(report.warnings.commonPattern, false);
  });

  test('detection flag never reveals the matched substring', () => {
    const result = checkCommonPasswords('Mysecret1!');
    assert.deepEqual(Object.keys(result), ['hasWarning']);
    assert.equal(typeof result.hasWarning, 'boolean');
  });
});

describe('AC-12: name-related pattern detection', () => {
  test('password containing a full name part warns', () => {
    const report = evaluate('Samuel David', 'Samuel123!', 'Samuel123!');
    assert.equal(report.ok, true);
    assert.equal(report.warnings.nameRelated, true);
  });

  test('matching ignores case and multiple word name parts', () => {
    assert.equal(checkName('xxDAVIdyy1!', 'Samuel David').hasWarning, true);
    assert.equal(checkName('david-Samuel-1!', 'samuel david').hasWarning, true);
  });

  test('detects name letters with inserted characters between them', () => {
    // Symbols between each letter.
    assert.equal(checkName('S.a.m.u.e.l!', 'Samuel David').hasWarning, true);
    // Underscores between each letter.
    assert.equal(checkName('s_a_m_u_e_l9', 'Samuel David').hasWarning, true);
    // A run of digits inside the name.
    assert.equal(checkName('Sam123uel!', 'Samuel David').hasWarning, true);
    // A single inserted letter (minor insertion / doubling).
    assert.equal(checkName('Sammuel1!', 'Samuel David').hasWarning, true);
    // A hyphen breaking the second name word.
    assert.equal(checkName('Da-vid1!', 'Samuel David').hasWarning, true);
    // Non-adjacent letters still count as a match.
    assert.equal(checkName('Sxaxmxuxexl', 'Samuel David').hasWarning, true);
  });

  test('interleaved matching still respects the minimum fragment length', () => {
    assert.equal(checkName('A.l.1c.e!x', 'Al').hasWarning, false);
    assert.equal(checkName('A_b_C_d!9', 'Ab Cd').hasWarning, false);
  });

  test(`detects a ${NAME_SLICE_LENGTH}-character slice of the whole name`, () => {
    // Windows taken from inside a single word.
    assert.equal(checkName('xxSamuyy1!', 'Samuel David').hasWarning, true);
    assert.equal(checkName('muel-9!', 'Samuel David').hasWarning, true);
    assert.equal(checkName('xxavid9!', 'Samuel David').hasWarning, true);
    // A window that spans the space in the whole name string.
    assert.equal(checkName('el D-xyz!', 'Samuel David').hasWarning, true);
  });

  test('names shorter than the slice length produce no slice match', () => {
    assert.equal(checkName('xxAlyy9!', 'Al').hasWarning, false);
    assert.equal(checkName('xxDavyy9!', 'Da').hasWarning, false);
  });

  test(`name fragments shorter than ${MIN_NAME_FRAGMENT_LENGTH} characters are ignored`, () => {
    assert.equal(checkName('Al1ce!xyz', 'Al').hasWarning, false);
    assert.equal(checkName('Ab!xyz99', 'Ab Cd').hasWarning, false);
  });

  test('password unrelated to the name does not warn', () => {
    const report = evaluate('Samuel David', 'BlueSky7!', 'BlueSky7!');
    assert.equal(report.warnings.nameRelated, false);
  });

  test('unrelated passwords do not match the name as a subsequence', () => {
    // None of these contain the name letters in order.
    assert.equal(checkName('abcdefgh1!', 'Zoe').hasWarning, false);
    assert.equal(checkName('BlueSky7!', 'Samuel David').hasWarning, false);
    assert.equal(checkName('Qwerty99!', 'Samuel David').hasWarning, false);
  });

  test('warnings flag only, never the name fragment', () => {
    const result = checkName('Samuel123!', 'Samuel David');
    assert.deepEqual(Object.keys(result), ['hasWarning']);
  });
});

describe('consecutive-digit detection', () => {
  test(`flags runs of ${MIN_CONSECUTIVE_DIGITS}+ that ascend, descend, or repeat`, () => {
    assert.equal(checkConsecutiveDigits('abc123!').hasWarning, true); // ascending
    assert.equal(checkConsecutiveDigits('Abc987x').hasWarning, true); // descending
    assert.equal(checkConsecutiveDigits('zz111zz').hasWarning, true); // repeated
    assert.equal(checkConsecutiveDigits('0x000y!').hasWarning, true); // repeated zeros
    assert.equal(checkConsecutiveDigits('Abc1234xyz').hasWarning, true);
  });

  test('ignores runs shorter than the minimum', () => {
    assert.equal(checkConsecutiveDigits('BlueSky7!').hasWarning, false);
    assert.equal(checkConsecutiveDigits('abc12x').hasWarning, false);
    assert.equal(checkConsecutiveDigits('a1b2c3!').hasWarning, false);
  });

  test('non-sequential digit alternation is not a sequence', () => {
    assert.equal(checkConsecutiveDigits('abc121212!').hasWarning, false);
  });

  test('the flag never reveals the digits themselves', () => {
    const result = checkConsecutiveDigits('abc123!');
    assert.deepEqual(Object.keys(result), ['hasWarning']);
  });
});

describe('optional name check and duplicate suppression', () => {
  test('the name check can be disabled via options', () => {
    const on = evaluate('Samuel David', 'Samuel123!', 'Samuel123!');
    const off = evaluate('Samuel David', 'Samuel123!', 'Samuel123!', {
      checkNameEnabled: false,
    });
    assert.equal(on.warnings.nameRelated, true);
    assert.equal(off.warnings.nameRelated, false);
    // Other warnings are unaffected by disabling the name check.
    assert.equal(off.warnings.commonPattern, on.warnings.commonPattern);
    assert.equal(off.warnings.consecutiveDigits, on.warnings.consecutiveDigits);
  });

  test('a blank name produces no name warning even when enabled', () => {
    const report = evaluate('   ', 'Samuel123!', 'Samuel123!');
    assert.equal(report.ok, true);
    assert.equal(report.warnings.nameRelated, false);
  });

  test('a numeric common pattern suppresses the duplicate digit warning', () => {
    const report = evaluate('Samuel David', 'Trout12345!', 'Trout12345!');
    assert.equal(report.warnings.commonPattern, true);
    assert.equal(report.warnings.consecutiveDigits, false);
  });

  test('a repeated-digit run warns when no common pattern matches', () => {
    const report = evaluate('Samuel David', 'Trout111!', 'Trout111!');
    assert.equal(report.warnings.commonPattern, false);
    assert.equal(report.warnings.consecutiveDigits, true);
  });

  test('non-numeric common patterns keep both warnings', () => {
    const report = evaluate('Samuel David', 'Admin123!', 'Admin123!');
    assert.equal(report.warnings.commonPattern, true);
    assert.equal(report.warnings.consecutiveDigits, true);
  });

  test('warnings object exposes exactly three flags', () => {
    const report = evaluate('Samuel David', 'BlueSky7!', 'BlueSky7!');
    assert.deepEqual(Object.keys(report.warnings).sort(), [
      'commonPattern',
      'consecutiveDigits',
      'nameRelated',
    ]);
  });
});

describe('AC-13: empty input handling', () => {
  test('an empty name is allowed and skips the name check', () => {
    const report = evaluate('', 'BlueSky7!', 'BlueSky7!');
    assert.equal(report.ok, true);
    assert.equal(report.warnings.nameRelated, false);
    assert.equal(report.strength.rating, 'Strong');
  });

  test('a blank name is not treated as a validation error', () => {
    const result = validateInputs('   ', 'BlueSky7!', 'BlueSky7!');
    assert.equal(result.valid, true);
    assert.equal(result.errors.name, undefined);
  });

  test('empty password is rejected', () => {
    const report = evaluate('Samuel David', '', '');
    assert.equal(report.ok, false);
    assert.equal(report.errors.password, 'Password cannot be empty.');
    assert.equal(report.errors.confirm, 'Please confirm your password.');
    assert.equal(report.strength, undefined);
  });

  test('empty confirmation is rejected', () => {
    const result = validateInputs('Samuel David', 'BlueSky7!', '');
    assert.equal(result.valid, false);
    assert.equal(result.errors.confirm, 'Please confirm your password.');
    assert.equal(result.mismatch, false);
  });
});

// ---------- Strength rating thresholds (FR-05) ----------

describe('strength rating thresholds', () => {
  test('0–2 passed checks rate Weak', () => {
    assert.equal(ratingFor(0), 'Weak');
    assert.equal(ratingFor(1), 'Weak');
    assert.equal(ratingFor(2), 'Weak');
    assert.equal(checkStrength('abcdefgh').rating, 'Weak');
  });

  test('3–4 passed checks rate Moderate', () => {
    assert.equal(ratingFor(3), 'Moderate');
    assert.equal(ratingFor(4), 'Moderate');
    assert.equal(checkStrength('Abcdefg1').rating, 'Moderate');
  });

  test('5 passed checks rate Strong', () => {
    assert.equal(ratingFor(5), 'Strong');
    assert.equal(checkStrength('BlueSky7!').rating, 'Strong');
  });
});

// ---------- Privacy (FR-02 / FR-03 / AC-15) ----------

describe('privacy: reports never contain password material', () => {
  test('the full report serialises without any password value', () => {
    const password = 'SuperSecret123!';
    const report = evaluate('Samuel David', password, password);
    const serialised = JSON.stringify(report);
    assert.equal(serialised.includes(password), false);
    assert.equal(serialised.includes('SuperSecret'), false);
  });

  test('mismatch report does not echo either password value', () => {
    const report = evaluate('Samuel David', 'Alpha123!', 'Beta123!');
    const serialised = JSON.stringify(report);
    assert.equal(serialised.includes('Alpha123!'), false);
    assert.equal(serialised.includes('Beta123!'), false);
  });

  test('errors and result objects expose only booleans and fixed labels', () => {
    const report = evaluate('Samuel David', 'Mysecret1!', 'Mysecret1!');
    assert.deepEqual(Object.keys(report).sort(), [
      'errors',
      'mismatch',
      'ok',
      'strength',
      'warnings',
    ]);
    assert.deepEqual(report.errors, {});
  });
});

// ---------- Misc regression coverage ----------

describe('regression guards on the five core checks', () => {
  test('every check result is one of exactly five named rules', () => {
    const strength = checkStrength('abc');
    assert.deepEqual(
      strength.checks.map((c) => c.rule),
      [RULE_LENGTH, RULE_UPPER, RULE_LOWER, RULE_DIGIT, RULE_SPECIAL]
    );
    assert.equal(strength.total, 5);
  });

  test('missing list matches the failed checks', () => {
    const strength = checkStrength('abcdefgh');
    const failed = strength.checks.filter((c) => !c.passed).map((c) => c.rule);
    assert.deepEqual(strength.missing, failed);
  });

  test('all five special characters from the PRD are recognised', () => {
    for (const ch of ['!', '@', '#', '?']) {
      assert.equal(ruleResult(checkStrength(`Abcdefg1${ch}`), RULE_SPECIAL), true, ch);
    }
  });

  test('checkStrength output shape is stable', () => {
    const strength = checkStrength('BlueSky7!');
    assert.deepEqual(Object.keys(strength).sort(), [
      'checks',
      'missing',
      'passed',
      'rating',
      'score',
      'total',
    ]);
  });
});
