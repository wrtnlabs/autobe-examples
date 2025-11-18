# User Actors and Permissions Requirement Specification

## 1. Introduction and Purpose

The Todo List backend system must implement clear, actionable policies for user and admin actors. The document specifies all roles, authentication flows, and business rules for who can access or modify which data, presented using precise, unambiguous EARS-format requirements. This specification enables backend implementation of secure authentication, session management, permission validation, and all business boundaries for actors in the application.

## 2. User Actors and Roles

### 2.1 User
- A registered individual who manages their own todo items, including creating, updating, checking off, and deleting personal tasks.
- The User may: register for an account, log in/out, manage their password and profile, and only view/manage their own data. They cannot see or affect data of any other user, nor access any admin features.

### 2.2 Admin
- A privileged actor responsible for system health, supporting user issues, and enforcing application rules. Admins have elevated access to view, edit, or delete any user’s todos and accounts as required for support, moderation, or compliance actions. They do not use the system for personal task management.


## 3. Authentication and Account Management Requirements

- WHEN a new individual registers, THE system SHALL require a unique email and password.
- WHEN an email is already in use, THE system SHALL reject registration and SHALL return a specific error message to the user.
- WHEN registration is successful, THE system SHALL dispatch a confirmation email.
- WHEN a user confirms their email, THE system SHALL activate their account and permit login.
- WHEN a user enters valid credentials, THE system SHALL authenticate and establish a session with a JWT (JSON Web Token) and SHALL return secure tokens (access, refresh).
- WHEN authentication fails (invalid credentials, account disabled), THE system SHALL deny access and state the failure reason.
- WHEN an admin authenticates, THE system SHALL require valid credentials and SHALL establish a session with elevated permissions.
- WHEN a password is forgotten, THE system SHALL issue a reset token via email, usable for a limited period.
- WHEN a password reset is attempted, THE system SHALL only allow it with a valid, unexpired token.
- WHEN a logged-in user requests a password change, THE system SHALL require confirmation of the current password for security.
- WHEN a logout is requested, THE system SHALL end the session, invalidate active tokens, and prevent further actions without re-authentication.
- WHEN requested, THE system SHALL support logout across all devices (invalidate every active session for that user).
- WHEN an account is deleted or deactivated, THE system SHALL confirm with the user and SHALL prevent any further login until explicitly restored (admin only).
- WHEN any failed login attempts reach five, THE system SHALL lock the account for 15 minutes and inform the user of the lockout.


## 4. Core Permission Requirements (EARS Format)

- WHEN a user submits a new todo, THE system SHALL create the todo item under that user’s ownership only.
- WHEN a user requests to see their todos, THE system SHALL retrieve and return only tasks owned by that user.
- IF a user attempts to access or edit another user’s todo, THEN THE system SHALL deny all such requests.
- WHEN an admin requests to view, edit, or delete any todo, THE system SHALL allow the operation.
- WHEN an admin requests to manage user accounts (deactivate, reactivate, update), THE system SHALL allow the operation and log the event.
- WHEN a user requests to update or delete their profile, THE system SHALL permit the operation after explicit confirmation.
- IF a user tries to update or delete another user’s account, THEN THE system SHALL deny the request.
- WHEN any actor performs an action, THE system SHALL verify permission (role and ownership) for that action before proceeding.
- WHEN permissions are updated for any actor, THE system SHALL require re-authentication for any affected session.


## 5. Permissions Matrix (Business Layer)

| Business Function                      | User | Admin |
|----------------------------------------|------|-------|
| Account registration/login             | ✅   | ✅    |
| Create todo for self                   | ✅   | ✅    |
| Create todo for others                 | ❌   | ✅    |
| View own todos                         | ✅   | ✅    |
| View any user’s todos                  | ❌   | ✅    |
| Edit own todos                         | ✅   | ✅    |
| Edit any todos                         | ❌   | ✅    |
| Delete own todos                       | ✅   | ✅    |
| Delete any todos                       | ❌   | ✅    |
| Update/delete own account              | ✅   | ✅    |
| Update/delete other user accounts      | ❌   | ✅    |
| Access admin functions                 | ❌   | ✅    |
| Audit/log system actions               | ❌   | ✅    |


## 6. Auditability and Security Principles

- THE system SHALL log all admin actions affecting user or todo data, capturing actor, action, timestamp, and affected records.
- THE system SHALL not expose passwords or sensitive authentication material in any responses, logs, or UI.
- THE system SHALL restrict access strictly so that no user can access others’ data, even by manipulation of request parameters.
- THE system SHALL require passwords of minimum 8 characters, containing both letters and numbers.
- THE system SHALL implement brute-force protection; after five consecutive failed logins, the account SHALL be locked for a minimum of 15 minutes.

### JWT Session-Based Security Statement
- THE system SHALL encode user ID, role (user or admin), and permissions array in each JWT token.
- WHEN any permission or role changes, THE system SHALL require explicit session renewal through re-authentication.


## 7. Section Completeness Review Checklist

- [x] User and admin actors defined in natural business language
- [x] Authentication flows, session lifecycle, and password management specified
- [x] All permission-relevant business functions fully enumerated in EARS
- [x] Explicit permissions matrix covers every actor and business function
- [x] Security and auditability requirements guarantee business integrity
- [x] All sections comply with minimum thoroughness and clarity requirements for production implementation-readiness
