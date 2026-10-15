# PRODUCT REQUIREMENTS DOCUMENT (PRD)
## Password Strength Checker Web Application

**Document Version:** 1.0  
**Product Type:** Web Application  
**Status:** Ready for Development Planning  
**Primary Deliverable:** A functional, responsive web application based on the existing Python Password Strength Checker

---

## 1. Product Overview

### 1.1 Product Description

The Password Strength Checker is a web application that helps users evaluate the strength of a password before using it for an account or service.

The application will allow users to enter a password securely, confirm it without displaying the characters, evaluate its strength against five predefined requirements, and receive warnings when the password contains common password patterns or parts of their name.

The web application will be developed from an existing Python solution. The developer must preserve the core checking logic while adapting terminal-based inputs and outputs for a browser-based experience.

### 1.2 Problem Statement

Users often create passwords that are easy to guess, reuse common password patterns, or use personal information in their passwords. They may not know why a password is weak or how to improve it.

The application will address this problem by providing immediate feedback, clear explanations of missing requirements, and warnings about predictable password patterns.

### 1.3 Product Objectives

- Help users understand basic password-strength requirements.
- Provide immediate feedback as users evaluate a password.
- Allow password confirmation without displaying the confirmation input.
- Detect common passwords and name-related patterns.
- Protect password privacy throughout the checking process.
- Provide a simple, responsive experience on desktop, tablet, and mobile devices.

### 1.4 Target Users

- Individuals creating new passwords.
- Students learning about password security.
- Users who want to assess password quality before registration.
- Developers and learners exploring basic password-validation logic.

---

## 2. Scope of the MVP

### 2.1 In Scope

1. Password entry with hidden characters by default.
2. An option to reveal or hide the password.
3. A confirmation field with hidden characters.
4. Password mismatch detection.
5. Five password-strength checks.
6. Strength ratings: Weak, Moderate, and Strong.
7. A list of missing requirements.
8. Detection of common password patterns.
9. Detection of parts of the user's name in the password.
10. A warning system for predictable passwords.
11. Reset and repeat-check functionality.
12. Responsive web design.
13. Basic accessibility and input validation.
14. Secure handling of password data.

### 2.2 Out of Scope for Version 1

- User accounts and registration.
- Password storage or password management.
- Saving previous password checks.
- A password database or breach-checking integration.
- AI-generated password recommendations.
- Browser extensions.
- Multi-factor authentication.
- Administrative dashboards.
- Paid subscriptions.

---

## 3. User Stories

| ID | User story | Expected outcome |
|---|---|---|
| US-01 | As a user, I want to enter my name so the application can identify name-related patterns. | The application uses the name only for the current check. |
| US-02 | As a user, I want my password hidden by default. | Password characters are masked. |
| US-03 | As a user, I want to reveal my password temporarily. | A visibility control reveals or hides the password field. |
| US-04 | As a user, I want to confirm my password privately. | The confirmation field remains masked. |
| US-05 | As a user, I want to know when my password confirmation does not match. | A clear mismatch message is displayed. |
| US-06 | As a user, I want to know how strong my password is. | A strength rating and numerical score are displayed. |
| US-07 | As a user, I want to understand missing requirements. | Each failed rule is listed. |
| US-08 | As a user, I want to know if my password contains common patterns. | A warning appears when a configured pattern is detected. |
| US-09 | As a user, I want to know if my password contains my name. | A warning appears when a matching name pattern is detected. |
| US-10 | As a user, I want to check another password. | I can clear the form and start again. |

---

## 4. Functional Requirements

### FR-01: User Name Input

The application must provide a field for the user's name.

- The name field must be validated for empty input.
- The name must be compared against the password without case sensitivity.
- The application must split the name into individual words.
- Name fragments of at least three characters should trigger a warning when found in the password.
- The name must not be stored after the check.

### FR-02: Password Input and Visibility

The application must provide a password input field.

- The password must be hidden by default.
- A visibility control must allow the user to reveal or hide the password.
- The visibility control must not alter the password value.
- The password must not be displayed in results, logs, analytics, URLs, or error messages.
- The application must not automatically reveal the password after validation.

### FR-03: Password Confirmation

The application must provide a second password field.

- The confirmation field must be hidden by default.
- The application must compare the two values.
- If they do not match, the application must display: **"Passwords do not match. Please try again."**
- Strength results must not be displayed until the two values match.
- The user must be able to correct the confirmation without unnecessarily clearing the first password.
- The confirmation must not be displayed or persisted.

### FR-04: Password Strength Checks

The application must check the following five requirements:

1. Minimum length of eight characters.
2. At least one uppercase letter.
3. At least one lowercase letter.
4. At least one digit.
5. At least one special character, such as `!`, `@`, `#`, or `?`.

The application must count the successful checks and display the result out of five.

### FR-05: Strength Rating

The initial rating rules will be:

| Number of checks passed | Rating |
|---:|---|
| 0–2 | Weak |
| 3–4 | Moderate |
| 5 | Strong |

The rating must be accompanied by the score, for example, `4/5`.

These rules are a simple educational measure, not a complete assessment of real-world password security.

### FR-06: Missing Requirements

The application must identify each failed requirement.

Example:

- At least 8 characters: Passed
- At least one uppercase letter: Passed
- At least one lowercase letter: Passed
- At least one digit: Missing
- At least one special character: Missing

The results must never reproduce the password itself.

### FR-07: Common Password Pattern Detection

The application must warn users when the password contains any configured common pattern.

Initial patterns:

- `secret`
- `12345`
- `0000`
- `password`
- `qwerty`
- `admin`

The comparison must be case-insensitive and must search within the password, not just compare the entire password.

The application must display a general warning rather than repeating the detected substring.

Example:

**Warning:** Your password contains a common password pattern. Choose something less predictable.

The developer should keep the list configurable so additional patterns can be added later.

### FR-08: Name-Related Pattern Detection

The application must compare the password against the words in the user's name.

Example:

Name: `Samuel David`

Password containing `Samuel` or `David`: Display a warning.

The initial implementation should ignore case and ignore name fragments shorter than three characters to reduce false positives.

The warning must explain that personal information can make a password easier to guess.

### FR-09: Repeat Check

After displaying results, the application must provide a **Check Another Password** action.

When selected, it must clear the previous password, confirmation, and result data before starting a new check.

The user must also be able to leave the page at any time.

### FR-10: Empty Input and Validation

- An empty name must be rejected with a clear message.
- An empty password must be rejected.
- An empty confirmation must be rejected.
- Strength checks must not run until confirmation succeeds.
- Errors must be displayed without exposing entered passwords.

---

## 5. User Flow

1. The user opens the application.
2. The application displays the password checker.
3. The user enters their name.
4. The user enters a password in a masked field.
5. The user may optionally reveal the password.
6. The user confirms the password in a masked field.
7. The application compares the two entries.
8. If they differ, a mismatch message appears and the user can retry.
9. If they match, the application evaluates the five strength requirements.
10. The application displays the strength rating and score.
11. The application lists missing requirements.
12. The application displays any common-pattern or name-related warnings.
13. The user chooses to check another password or leave the application.

---

## 6. UI/UX Requirements

### 6.1 Main Screen

The main screen should contain:

- Application name and short description.
- Name input field.
- Password input field.
- Show/Hide password control.
- Password confirmation field.
- Check Password button.
- Results area.
- Check Another Password button.

### 6.2 Results Area

The results area must contain:

- Strength rating.
- Checks-passed score.
- Individual requirement results.
- Missing requirement explanations.
- Common-pattern warning, if applicable.
- Name-related warning, if applicable.

### 6.3 Design Direction

The interface should be clean, minimal, and easy to understand.

Recommended visual elements:

- A neutral background.
- Clearly labelled input fields.
- Accessible contrast between text and background.
- A simple progress indicator for the five checks.
- Clear success and warning indicators that do not rely on colour alone.
- Visible keyboard focus states.
- Readable typography and appropriately sized buttons.

### 6.4 Responsive Behaviour

The application must work on:

- Desktop browsers.
- Tablet browsers.
- Mobile browsers.

On mobile devices, input fields and buttons should fit the available width without horizontal scrolling.

---

## 7. Technical Requirements

### 7.1 Suggested Architecture

The existing Python code is a command-line program. It must be adapted for a web environment.

Recommended implementation:

- **Frontend:** HTML, CSS, and JavaScript, or a frontend framework selected by the developer.
- **Backend:** Python with Flask or FastAPI if server-side evaluation is required.
- **Deployment:** A hosting provider that supports the selected stack and HTTPS.

The developer may use another suitable stack with approval, provided all requirements are met.

### 7.2 Frontend Responsibilities

- Render the input fields and results.
- Mask and reveal the password through a visibility control.
- Validate empty fields.
- Compare password and confirmation.
- Display loading and error states where necessary.
- Clear all sensitive form values when starting another check.

### 7.3 Backend Responsibilities

If a backend is used, it must:

- Receive password data only over HTTPS.
- Evaluate the password and return the result.
- Avoid writing passwords or confirmation values to logs.
- Avoid database persistence of password values.
- Return only the required strength results and warning flags.
- Avoid including password values in error responses.

The developer must not use Python's `getpass` for browser input. Browser fields and secure request handling must replace terminal input.

### 7.4 Privacy and Security Requirements

- No user account is required.
- No password or confirmation may be stored in a database.
- No password may appear in server logs, analytics, URLs, or application telemetry.
- No third-party analytics scripts should receive password field contents.
- Password values must be cleared when the user resets the checker or leaves the checking flow.
- HTTPS must be enabled in production.
- Any server-side request must be protected against accidental password logging.
- Password processing must not be represented as a guarantee that the password is safe from data breaches or guessing.

The preferred architecture is to perform checks locally in the browser, since the MVP does not need to transmit or store password data. If Python backend execution is a firm requirement, the developer must implement the privacy safeguards above.

---

## 8. Acceptance Criteria

The application will be accepted when the following conditions are met.

| ID | Test | Expected result |
|---|---|---|
| AC-01 | Enter `BlueSky7!` twice. | All five checks pass and the rating is Strong. |
| AC-02 | Enter a password shorter than eight characters. | The length requirement fails. |
| AC-03 | Enter a password without uppercase letters. | The uppercase requirement fails. |
| AC-04 | Enter a password without lowercase letters. | The lowercase requirement fails. |
| AC-05 | Enter a password without digits. | The digit requirement fails. |
| AC-06 | Enter a password without special characters. | The special-character requirement fails. |
| AC-07 | Enter different passwords in the two fields. | A mismatch message appears and no strength report is shown. |
| AC-08 | Keep password visibility disabled. | Characters remain masked. |
| AC-09 | Toggle password visibility. | The first field can be revealed and hidden again. |
| AC-10 | Enter a password containing `secret`. | A common-pattern warning appears. |
| AC-11 | Enter a password containing `12345`. | A common-pattern warning appears. |
| AC-12 | Enter a password containing part of the user's name. | A name-related warning appears. |
| AC-13 | Submit an empty password. | A validation message appears. |
| AC-14 | Start another check. | Previous password values and results are cleared. |
| AC-15 | Inspect application logs and network responses. | Passwords are not logged or unnecessarily exposed. |
| AC-16 | Open the application on a mobile device. | The form and results remain usable without horizontal scrolling. |

---

## 9. Testing Plan

The developer must conduct:

### Functional Testing

- Verify each of the five password requirements.
- Verify all strength-rating thresholds.
- Verify password mismatch behaviour.
- Verify common-pattern and name-related warnings.
- Verify empty-input handling.
- Verify the reset and repeat-check flow.

### UI Testing

- Verify password masking and visibility toggling.
- Verify error messages are clear.
- Verify the result area updates correctly.
- Verify the layout on desktop and mobile screen sizes.

### Security Testing

- Verify password fields are masked by default.
- Verify passwords are not persisted.
- Verify password values are absent from application logs.
- Verify passwords are not placed in URLs.
- Verify the application uses HTTPS in production.
- Verify that unexpected errors do not disclose sensitive values.

### Regression Testing

Any change to the password-checking logic must be tested against the five core requirements and the warning functions to ensure existing behaviour is preserved.

---

## 10. Deliverables

The developer must provide:

1. A deployed, working web application.
2. Complete source code.
3. Frontend and backend code, if a backend is used.
4. A README explaining how to run the application locally.
5. Deployment instructions.
6. A list of environment variables, if applicable.
7. Functional and security test results.
8. Documentation of any changes made to the original Python logic.
9. A working production URL.
10. A handover session or written handover guide.

---

## 11. Definition of Done

The project is considered complete when:

- All in-scope functional requirements are implemented.
- All acceptance criteria pass.
- Passwords remain hidden by default.
- Password confirmation works correctly.
- Strength scores and warnings are accurate according to the defined rules.
- No password is stored or exposed through logs or analytics.
- The application works on desktop and mobile browsers.
- The source code and setup instructions have been handed over.
- The deployed application is accessible over HTTPS.

---

# ANNEX A: ORIGINAL PYTHON IMPLEMENTATION

The following code is the starting point supplied for the project. It demonstrates the core password-checking logic and may be retained as a reference implementation during the web migration.

**Implementation note:** This version is written for a terminal. Its `getpass` input must be replaced by browser-based password fields. The developer should also ensure that a password mismatch allows the user to retry confirmation for the same password.

```python
import getpass
import string


# Function to enter a password and optionally show it
def enter_password():
    show = input(
        "Show password while typing? (y/n): "
    ).strip().lower()

    if show == "y":
        password = input("Enter your password: ")
    else:
        password = getpass.getpass(
            "Enter your password: "
        )

    return password


# Function to confirm the password
def confirm_password(password):
    while True:
        confirm = getpass.getpass(
            "Confirm your password: "
        )

        if password == confirm:
            print("Password confirmed successfully.")
            return True
        else:
            print(
                "Password mismatch! Please try again."
            )
            return False


# Function to check password strength
def check_strength(password):
    checks = {
        "At least 8 characters":
            len(password) >= 8,

        "At least one uppercase letter":
            any(ch.isupper() for ch in password),

        "At least one lowercase letter":
            any(ch.islower() for ch in password),

        "At least one digit":
            any(ch.isdigit() for ch in password),

        "At least one special character":
            any(
                ch in string.punctuation
                for ch in password
            )
    }

    passed = sum(checks.values())

    print("\nPassword strength report")
    print("------------------------")
    print(f"Checks passed: {passed}/5")

    if passed <= 2:
        print("Password strength: Weak")
    elif passed <= 4:
        print("Password strength: Moderate")
    else:
        print("Password strength: Strong")

    missing = [
        rule
        for rule, result in checks.items()
        if not result
    ]

    if missing:
        print("\nMissing requirements:")
        for rule in missing:
            print(f"- {rule}")
    else:
        print("All requirements satisfied.")

    return checks


# Function to warn about common passwords
def check_common_passwords(password):
    common_passwords = [
        "secret",
        "12345",
        "0000",
        "password",
        "qwerty",
        "admin"
    ]

    password_lower = password.lower()
    warnings = []

    for common in common_passwords:
        if common in password_lower:
            warnings.append(common)

    if warnings:
        print(
            "\nWARNING: Your password contains "
            "a common password pattern."
        )
        print(
            "Avoid easily guessed words or "
            "number sequences."
        )


# Function to check whether the password
# contains part of the user's name
def check_name(password, username):
    name_parts = username.lower().split()
    password_lower = password.lower()

    for part in name_parts:
        if len(part) >= 3 and part in password_lower:
            print(
                "\nWARNING: Your password contains "
                "part of your name."
            )
            print(
                "Choose a password that is not "
                "related to your name."
            )
            return

    print("No obvious name-related pattern detected.")


# Main function
def main():
    username = input("Enter your name: ").strip()

    if not username:
        print("Name cannot be empty.")
        return

    while True:
        print("\n=== Password Strength Checker ===")

        password = enter_password()

        if not password:
            print("Password cannot be empty.")
            continue

        if not confirm_password(password):
            continue

        check_strength(password)
        check_common_passwords(password)
        check_name(password, username)

        again = input(
            "\nWould you like to check another "
            "password? (y/n): "
        ).strip().lower()

        if again != "y":
            print(
                "Thank you for using the "
                "Password Strength Checker."
            )
            break


main()
```

---

## ANNEX B: DEVELOPMENT NOTES

1. Preserve the five strength checks and the warning behaviour.
2. Do not display the password in the results or repeat it in messages.
3. Do not send passwords to analytics services or store them in a database.
4. Keep common password patterns configurable.
5. Use clear, accessible messages for validation and warnings.
6. Fix the terminal implementation's confirmation retry flow when adapting the logic.
7. Treat the rating as a basic educational indicator, not a complete security guarantee.
8. Document all deviations from the original implementation before final handover.

**End of PRD**
