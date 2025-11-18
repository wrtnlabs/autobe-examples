# User Actors and Permissions – Minimal Todo App

## 1. Goal of This Document

The Todo app is intentionally minimal. The goal is to define only the permissions that are strictly necessary to make a simple personal Todo list work, plus the minimum needed for basic administration.

This document explains, in business terms:
- Who can use the system (user types / "actors").
- What each actor is allowed to do.
- What each actor is not allowed to do.

These rules are written so that backend developers can implement authentication and authorization without guessing.

## 2. Actors

The system has three actors:

1. `guestUser` – not logged in.
2. `memberUser` – a normal logged-in user who manages only their own todos.
3. `adminUser` – an administrator who can also manage users and todos when needed for operations or policy reasons.

### 2.1 guestUser

A `guestUser` is anyone who opens the service without logging in.

- Has no personal account and no personal todo list.
- Can only see public information about the service.
- Can start registration or login.
- Cannot access any todo data.

### 2.2 memberUser

A `memberUser` is a regular logged-in user.

- Has an account.
- Has a private list of todo items.
- Fully controls their own todo items.
- Cannot see or change other users’ todos or accounts.

### 2.3 adminUser

An `adminUser` is a logged-in user with administrative responsibilities.

- Has all abilities of a `memberUser` on their own data.
- Can view or remove todos of any user when needed for policy, support, or legal reasons.
- Can manage user accounts (for example, deactivating an abusive account).

## 3. Capability Areas

The Todo app exposes four main capability areas:

1. Public access
2. Account and login
3. Personal todo management
4. Administrative oversight

### 3.1 Public Access

- Viewing public pages (landing page, simple help text, etc.).

### 3.2 Account and Login

- Register new account.
- Login.
- Logout.

### 3.3 Personal Todo Management

For a minimal Todo item, the system only needs basic fields (such as title, optional description, and completion status). This document does not define technical data structures; it only defines what actions are allowed.

Allowed actions:
- Create a todo.
- List todos.
- View a single todo.
- Update a todo.
- Mark todo as complete.
- Reopen a completed todo.
- Delete a todo.

### 3.4 Administrative Oversight

Administrative actions are limited and should be used only when necessary for operation, support, or policy reasons.

- View any user’s account information (for admin purposes).
- View todos belonging to any user.
- Delete todos that break policies or must be removed.
- Change account status (for example, deactivate an account).

## 4. Permission Matrix

High-level view of which actor can perform which business action.

| Action                                                   | guestUser | memberUser | adminUser |
|----------------------------------------------------------|-----------|-----------|-----------|
| View public information                                  | ✅        | ✅        | ✅        |
| Register a new account                                   | ✅        | ❌        | ❌        |
| Login                                                    | ✅        | ✅        | ✅        |
| Logout                                                   | ❌        | ✅        | ✅        |
| View own account profile                                 | ❌        | ✅        | ✅        |
| Update own account details (allowed fields only)         | ❌        | ✅        | ✅        |
| Create a todo (for own use)                              | ❌        | ✅        | ✅        |
| List own todos                                           | ❌        | ✅        | ✅        |
| View a single own todo                                   | ❌        | ✅        | ✅        |
| Update a todo that belongs to self                       | ❌        | ✅        | ✅        |
| Mark own todo as complete                                | ❌        | ✅        | ✅        |
| Reopen own completed todo                                | ❌        | ✅        | ✅        |
| Delete own todo                                          | ❌        | ✅        | ✅        |
| View todos that belong to other users                    | ❌        | ❌        | ✅        |
| Delete todos that belong to other users (policy-based)   | ❌        | ❌        | ✅        |
| View account information for any user                    | ❌        | ❌        | ✅        |
| Change status of user accounts (e.g., deactivate)        | ❌        | ❌        | ✅        |

Notes:
- "Own" means associated with the currently authenticated user.
- `adminUser` can act both as a normal user on their own todos and as an administrator on other users’ data.

## 5. Detailed Rules by Actor (EARS Style)

This section gives precise, testable rules using EARS-style language.

### 5.1 guestUser

**General access**

- THE `guestUser` SHALL only access information that does not depend on a user identity.
- THE `guestUser` SHALL have no personal todos.

**Registration and login**

- WHEN a `guestUser` submits valid registration information, THE system SHALL create a new `memberUser` account.
- WHEN a `guestUser` submits valid login credentials, THE system SHALL start an authenticated session as either `memberUser` or `adminUser` depending on the account.
- IF a `guestUser` submits invalid login credentials, THEN THE system SHALL reject the login and keep the user as `guestUser`.

**Protection of restricted areas**

- IF a `guestUser` tries to access any todo-related feature, THEN THE system SHALL deny access and SHALL not expose any todo data.
- IF a `guestUser` tries to call any action that requires authentication (such as account profile, todo list, create todo), THEN THE system SHALL respond that authentication is required.

### 5.2 memberUser

**Authentication and scope**

- WHILE a `memberUser` is authenticated, THE system SHALL allow that user to access only their own todos and their own account data.
- THE `memberUser` SHALL have a private collection of todos associated with their identity.

**Todo ownership and visibility**

- WHEN a `memberUser` creates a todo, THE system SHALL associate that todo only with that `memberUser`.
- WHEN a `memberUser` lists todos, THE system SHALL return only todos belonging to that `memberUser`.
- WHEN a `memberUser` requests a single todo, THE system SHALL return it only if it belongs to that `memberUser`.
- IF a `memberUser` attempts to view a todo that belongs to another user, THEN THE system SHALL deny access and SHALL not indicate whether that todo exists.

**Todo modification**

- WHEN a `memberUser` updates one of their own todos with valid data, THE system SHALL apply the changes only to that todo.
- IF a `memberUser` attempts to update a todo that does not belong to them, THEN THE system SHALL deny the update.
- WHEN a `memberUser` marks their own todo as complete, THE system SHALL set that todo’s status to completed.
- WHEN a `memberUser` reopens their own completed todo, THE system SHALL set that todo’s status back to active.
- WHEN a `memberUser` requests deletion of their own todo, THE system SHALL remove or mark that todo as deleted according to data lifecycle rules.
- IF a `memberUser` attempts to delete a todo belonging to another user, THEN THE system SHALL deny the deletion.

**Account self-management**

- WHEN a `memberUser` views their own account profile, THE system SHALL show only that `memberUser`’s information.
- WHEN a `memberUser` updates allowed profile fields (such as password or basic contact fields, if defined), THE system SHALL apply the change only to that `memberUser`’s account.
- IF a `memberUser` attempts to change disallowed fields (for example, role or admin flags), THEN THE system SHALL deny the change.

### 5.3 adminUser

**Authentication and scope**

- WHILE an `adminUser` is authenticated, THE system SHALL treat the user as both a normal user on their own data and as an administrator on all users’ data.

**Access to other users’ todos**

- WHEN an `adminUser` requests todos for a specific user for a legitimate operational reason, THE system SHALL allow the `adminUser` to list those todos.
- WHEN an `adminUser` requests a single todo that belongs to any user, THE system SHALL allow access for review.
- IF an `adminUser` requests todos in a way that breaks higher-level privacy policies (for example, requesting data without any legitimate reason defined by business rules), THEN THE system SHALL deny or limit the request according to those policies.

**Administrative modification of todos**

- WHEN an `adminUser` identifies a todo that violates policies or legal requirements, THE system SHALL allow the `adminUser` to delete or otherwise neutralize that todo, even if it belongs to another user.
- IF an `adminUser` attempts to modify protected internal details of a todo that must remain unchanged for auditing (where such fields exist), THEN THE system SHALL deny that modification.

**User account management**

- WHEN an `adminUser` views account details for any user, THE system SHALL show information necessary for administration while following business privacy rules.
- WHEN an `adminUser` changes a user account’s status (such as activate, deactivate, or mark for deletion), THE system SHALL update only that account’s status.
- IF an `adminUser` attempts to assign a role that is not one of `guestUser`, `memberUser`, or `adminUser`, THEN THE system SHALL deny the change.

## 6. Cross-Actor Situations

### 6.1 Admin acting on member resources

- WHEN a `memberUser` has todos and an `adminUser` must inspect them for a valid reason (such as abuse handling or a legal request), THE system SHALL allow the `adminUser` to view those todos, but SHALL NOT give this ability to other `memberUser` accounts.
- WHEN an `adminUser` deletes a todo belonging to a `memberUser` for policy reasons, THE system SHALL ensure that the todo is no longer available to the `memberUser`.
- IF a `memberUser` later tries to access a todo that an `adminUser` deleted, THEN THE system SHALL respond as if the todo no longer exists and SHALL NOT reveal internal details of the administrative action.

### 6.2 Role changes

- WHEN a `guestUser` completes registration successfully, THE system SHALL treat that user as `memberUser` for future authenticated actions.
- WHEN a `guestUser` logs in with admin credentials, THE system SHALL treat that user as `adminUser` for future actions.
- WHEN a `memberUser` account is promoted to `adminUser` by an appropriate administrative process, THE system SHALL treat later authenticated sessions for that account as `adminUser` sessions.
- IF an `adminUser` deactivates a user account, THEN THE system SHALL block future logins for that account until it is reactivated.

### 6.3 Conflicting actions

- WHILE an `adminUser` is performing an administrative action on a user or todo (for example, deactivating an account or deleting a todo), THE system SHALL treat that administrative change as having priority over normal user actions that conflict with it.
- IF a `memberUser` tries to update a todo at the same time an `adminUser` deletes it, THEN THE system SHALL apply the administrative deletion and SHALL treat the user’s update as an action on a non-existent todo.

## 7. Security and Privacy Principles

**Isolation of user data**

- THE system SHALL isolate each `memberUser`’s todos so that only the owning `memberUser` and authorized `adminUser` actors can access them.
- IF any actor other than the owner or an authorized `adminUser` attempts access, THEN THE system SHALL deny the request.

**Least privilege**

- THE system SHALL give each actor only the minimum permissions needed:
  - `guestUser`: public pages and registration/login only.
  - `memberUser`: full control over own todos and basic self-account management.
  - `adminUser`: own todos plus cross-user access and account management, used only when necessary.

**Information exposure**

- WHEN returning todo data to a `memberUser`, THE system SHALL show only that user’s todos and SHALL hide internal administrative metadata.
- WHEN returning todo data to an `adminUser`, THE system SHALL show enough information to perform administrative work, within overall privacy and legal rules.

**Handling unauthorized attempts**

- IF any actor attempts an action beyond their permissions, THEN THE system SHALL deny the action and SHALL not reveal sensitive internal details.
- WHEN the system detects repeated unauthorized attempts, THE system SHALL treat this as a possible abuse case and SHALL apply security or rate-limiting rules defined elsewhere.

## 8. Summary

- Only authenticated users (`memberUser` and `adminUser`) can work with todos.
- `memberUser` controls only their own todos and their own profile.
- `adminUser` can manage their own data plus other users’ data for valid operational reasons.
- `guestUser` has no access to todo data and can only register or log in.
- All rules are written so developers can implement consistent permission checks without needing more assumptions.
