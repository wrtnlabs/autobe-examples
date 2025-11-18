# Review of "Authentication and Session Requirements for todoApp"

## 1. What this document is about

This requirement document explains **how logging in and staying logged in should work** for your Todo list app. It uses business language instead of technical details, so developers later can decide exactly *how* to implement it.

Its main focus areas are:
- Who can use the system (guest, normal user, admin).
- How users register and log in.
- How the system remembers that a user is logged in (sessions/tokens).
- How logout, password resets, and security protections should behave.

For your minimal Todo app, this document already defines a **complete, reasonable set of rules**.

## 2. User types (actors)

The document defines three roles:

- **guestUser**: Not logged in. Can only see public or health-related information. **Cannot see or manipulate any todos**.
- **memberUser**: A normal logged-in user. Can manage **only their own todos**.
- **adminUser**: A special logged-in user. Can see and manage user accounts and todos for operational or legal reasons.

Key point: **Any request without valid login info is treated as `guestUser` and must not see user-specific data.**

## 3. Registration (sign-up)

Registration is how a guest becomes a normal user.

Important rules:
- Each user must have a **unique login identifier** (for example an email or username). The exact format is not forced, but it must be unique and usable for contact/recovery.
- Each user must set a **secret password**.
- Users must **accept the service terms and policies**.
- The system must check:
  - The login identifier format is valid.
  - The identifier is **not already used**.
  - The password meets **basic complexity rules** (e.g., minimum length).
  - Terms and policies are accepted.
- If something is wrong, the registration is rejected with a **clear, human-readable message**, but without revealing sensitive internal details.
- If everything is valid, a new **active memberUser account** is created with **no pre-existing todos** and no special privileges.

This is a good minimal rule set for your Todo app: simple but not careless.

## 4. Login and failed login

Login is how an existing memberUser or adminUser starts an authenticated session.

### Main ideas
- Login requires:
  - The **login identifier**.
  - The **password**.
- The system must treat the login identifier in a consistent way (always case-sensitive or always case-insensitive).

### On success
- If the identifier and password match an **active** account:
  - Login is successful.
  - The system issues some form of **session/token** that the client can send on later requests.
  - The client must be able to tell whether the login is for **memberUser** or **adminUser**.

### On failure
- If the password is wrong **or** the identifier does not exist:
  - The system returns a **generic failure message** (does not say whether the account exists).
- If the account is blocked/disabled (e.g., too many failed attempts):
  - The system rejects the login and says the account cannot sign in now, but without exposing sensitive details.

### Abuse protection
- The system must track failed logins and:
  - Temporarily block login if too many failures happen in a short time.
  - While blocked, treat login attempts as failed with a neutral message.
  - Possibly mark the account/source for longer review in severe abuse cases.

This protects your app from simple password-guessing attacks.

## 5. Logout and expiry

### Standard logout
- When a logged-in user logs out from one device:
  - The current session/token is **invalidated**.
  - Further requests from that device are treated as **guestUser**.

### Global logout
- If a user chooses to "log out from all devices":
  - All sessions/tokens for that account are invalidated.

### Expiry
- Each session/token has a **lifetime**.
- When the lifetime is exceeded, the token is treated as **expired**, and the user must log in again or use a valid refresh mechanism (if allowed).

## 6. Sessions and tokens (how being logged in works)

The document describes sessions/tokens in **conceptual** terms only:

- When a user logs in, the system issues some credentials (e.g., tokens).
- Every credential:
  - Is tied to a **specific user account**.
  - Contains the **actor type** (memberUser or adminUser).
- There are:
  - **Short-lived credentials** (for standard use).
  - Optionally **longer-lived credentials** (for "stay logged in" / renewal) with limits.
- Tokens must be:
  - **Revoked** when user logs out.
  - **Revoked** when password is changed.
  - **Revoked or flagged** if suspicious activity is detected.

This gives developers flexibility to choose a concrete mechanism (like JWTs or sessions) while keeping business rules clear.

## 7. Security expectations

Key security requirements in plain language:

- Passwords must be **long enough** and encourage a mix of characters.
- Passwords must be stored in a way that they **cannot be reversed** into the original.
- The system must limit repeated login attempts and may block accounts temporarily.
- Tokens are treated as **sensitive secrets**:
  - They must not appear in logs or error responses.
  - Unusual usage (e.g., suspicious context changes) should trigger revocation.
- There must be a **password reset** process that:
  - Verifies the user via the login identifier and extra steps.
  - Forces the user to choose a new password that meets complexity rules.
  - Invalidates all existing sessions/tokens after a reset.
- For adminUser accounts:
  - They must follow at least the same or stricter security rules.
  - Security-related admin actions should be **logged for audit**.

## 8. Error handling and UX expectations

The document sets user-facing behavior expectations:

- When authentication fails:
  - Responses are **generic** and do not reveal whether an account exists.
- When a protected endpoint is called without auth:
  - The system treats it as **guestUser** and clearly indicates that login is required.
- When a token is malformed or expired:
  - The system rejects it and signals that re-login or renewal is needed.
- Under normal load:
  - Registration and login should complete in **a few seconds** so it feels fast.
- Auth features should be available whenever the core Todo functions are available.

## 9. Mermaid diagram

The document includes a Mermaid diagram that visualizes:
- Registration: validate data → create account or return error.
- Login: validate credentials → issue token or return failure.
- Using the app while logged in: check token validity → perform todo operation or ask for reauth.
- Logout: invalidate token → treat future requests as guest.

This is a helpful high-level picture for developers but not mandatory for you to understand as a product owner.

## 10. How this fits your "minimal Todo" goal

Even though you want **minimal functionality**, this authentication document is already scoped for a simple app:

- Only three roles (guest, member, admin).
- Basic but solid registration and login.
- Simple definition of sessions/tokens, without forcing a specific technology.
- Reasonable security requirements that prevent obvious abuse but do not add unnecessary complexity.

In practice, this means your minimal Todo backend will:
1. Let people sign up and log in.
2. Keep them logged in via tokens or sessions.
3. Ensure each user only sees and edits **their own** todos.
4. Allow admins to handle special operations and auditing.
5. Handle typical security situations (wrong password, too many attempts, password reset, etc.) in a standard, safe way.

No extra or fancy auth features (like social login, multi-factor auth, etc.) are assumed here, which aligns well with a minimal first version of a Todo app.