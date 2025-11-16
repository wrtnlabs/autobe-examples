# User Actors and Permissions - Requirement Analysis for Economic/Political Discussion Board

## User Actor Overview

The discussion board is designed to foster economic and political debates in a simple, focused community platform. The service distinguishes between two main user actors: registered users and administrators. Each actor type has unique business needs, powers, and responsibilities on the platform. This section defines their roles and contextual purpose from a business process perspective.

### Actor Definitions

| Actor Name | Description |
|------------|-------------|
| User       | Registered individual participating in discussions. Users can author, view, edit, and delete their own discussion articles and comments. They may upload images and files as attachments to articles. Their role is to contribute discourse and engage with the community. |
| Admin      | Platform administrator with full moderation rights. Admins can moderate content (edit/remove any article, comment, or attachment), manage user accounts (block or delete users for non-compliance), and oversee the integrity and compliance of the platform. Admins ensure all debate remains within platform and legal guidelines. |

**Summary:** Users initiate and participate in discussions. Admins moderate and maintain safe, appropriate, and lawful operation of the board.

## Authentication Flows

Authentication and authorization are essential for ensuring security and accountability in the discussion board. All business processes below are described using the EARS (Easy Approach to Requirements Syntax) format where possible, and all requirements are expressed in natural language.

### Registration Process
- WHEN a person wishes to participate, THE system SHALL allow registration using a valid, unique email and password.
- WHEN a person completes registration, THE system SHALL verify the provided email before allowing participation (article/comment creation or file upload).
- IF the provided email is already registered, THEN THE system SHALL prevent account creation and inform the applicant.

### Login and Session Management
- WHEN a registered user submits valid credentials, THE system SHALL authenticate the user and issue a session in the form of a JSON Web Token (JWT).
- IF credentials are invalid, THEN THE system SHALL deny access and return an appropriate error message.

### Session Expiry and Logout
- THE user SHALL remain authenticated for a business-configured period (e.g., 30 minutes for JWT access tokens, up to 30 days for refresh tokens) unless manually logged out or the session is revoked.
- WHEN a user chooses to log out, THE system SHALL terminate any active session tokens.

### Account Recovery
- WHEN a user requests a password reset, THE system SHALL send a secure reset link or code to the user's registered email.
- WHEN a reset request is completed, THE system SHALL allow login with the new password and revoke sessions from all devices.
- IF an unregistered email is presented for password reset, THEN THE system SHALL inform the requester without revealing registration status.

### Admin Authentication
- Admins must register and login in the same way as regular users, but are assigned the 'admin' role by platform operators via a secure, non-public process.

### Security
- THE system SHALL require strong password criteria (minimum length 8 characters, mix of letters and numbers, and at least one special character).
- THE system SHALL lock a user account after 10 failed login attempts within a 30-minute window and require password reset to unlock.

## Permission Table

| Action                                              | User | Admin |
|-----------------------------------------------------|------|-------|
| Register and create account                         | ✅   | ✅    |
| Login and maintain session                          | ✅   | ✅    |
| Edit own articles and comments                      | ✅   | ✅    |
| Delete own articles and comments                   | ✅   | ✅    |
| View any public article/comment                     | ✅   | ✅    |
| Upload attachments to own articles                  | ✅   | ✅    |
| Remove own attachments                              | ✅   | ✅    |
| Moderate or edit others' articles/comments          | ❌   | ✅    |
| Delete or remove any article/comment/attachment     | ❌   | ✅    |
| Manage (block/delete) user accounts                 | ❌   | ✅    |
| View list of all users                              | ❌   | ✅    |
| Assign or revoke admin status                       | ❌   | ✅    |
| Reset others' passwords                             | ❌   | ✅    |
| Suspend/ban users for compliance violations         | ❌   | ✅    |

## Business Logic by Actor

All actor behaviors and restrictions are described below using EARS format for clarity and testability.

### Registered User (user)
- THE user SHALL be able to create, edit, and delete their own discussion articles and comments.
- WHEN a user creates an article, THE system SHALL allow attaching images and files to the article.
- WHILE logged in, THE user SHALL be able to view and participate in any non-restricted (public) discussion.
- IF a user attempts to edit or delete an article/comment they did not create, THEN THE system SHALL deny the action and display an error message.
- WHEN a user uploads an attachment, THE system SHALL store and associate the attachment only with the user's own article.
- IF a user attempts to upload unsupported file types or oversize files, THEN THE system SHALL return a business-level error specifying the issue.
- WHEN a user receives a moderation action (e.g., content removal, warning), THE system SHALL notify the user with reasons as determined by the admin.
- WHEN a user's account is blocked or deleted by an admin, THE system SHALL prevent further login and access to any user-specific resources.

### Administrator (admin)
- THE admin SHALL be able to view, edit, or remove any article, comment, or attachment regardless of authorship.
- WHEN inappropriate or non-compliant content is reported or detected, THE admin SHALL take moderation action, including editing or removal.
- THE admin SHALL be able to block or permanently delete user accounts that violate terms or present legal/compliance risk.
- WHEN an admin acts, THE system SHALL record the admin's action for auditability, associating the action with the specific admin account.
- WHERE user account actions (e.g., ban) are performed, THE system SHALL prevent the affected user from logging in or creating new content.
- IF an admin resets a user's password, THEN THE system SHALL notify the user and revoke all existing sessions.

## Token Management Requirements

To maintain stateless, scalable authentication, the system will use JWTs (JSON Web Tokens) for all sessions. All user and admin actions requiring authentication will reference these core token management business rules:

- THE system SHALL issue JWT access tokens upon successful login, valid for 30 minutes, containing user ID, role (user or admin), and a permissions array.
- THE system SHALL issue a refresh token valid for 30 days, allowing new access tokens to be issued without re-authentication.
- WHEN a user or admin logs out or is blocked/deleted, THE system SHALL immediately revoke any valid tokens.
- THE JWT payload SHALL include only non-sensitive business information: { userId, userRole, permissions }.
- THE system SHALL securely manage secrets used for JWT signing and enforce secure transmission and storage (i.e., httpOnly, secure cookies or equivalent best practice—implementation left to developers).
- Tokens SHALL be required for all actions that change user/content state (e.g., article creation, attachment management, moderation).

## Summary

This document exhaustively describes the business requirements for user actors and permissions on a simple economic/political discussion board.
- There are two primary actors: user and admin, each with clearly defined business powers and responsibilities.
- The entire authentication and authorization flow—from registration to moderation—is outlined for both nominal and edge-case operations.
- Permissions and business logic are detailed per-actor, with critical EARS-compliant business rules governing all major interactions.
- JWT-based session management is mandated for business security and stateless scalability.
- This requirements analysis enables backend developers to implement robust, lawful, and user-friendly actor management, access control, and business logic for the discussion board system.

For all workflow, scenario, or detailed operation flows, see the [Functional Requirements](./05-functional-requirements.md) and related business rule documentation.