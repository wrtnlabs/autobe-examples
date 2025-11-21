# Authentication and Authorization System

## Actor Definitions

This system defines three distinct user actor roles: citizen, moderator, and admin. Each role has a clearly defined set of permissions and limitations. These roles form the foundation of the system's access control model.

### Citizen

A citizen is a registered, authenticated user who participates in the community by creating and interacting with content. Citizens have no administrative privileges and are subject to all community rules.

Key characteristics:
- Must complete email verification before posting
- Can create, edit, and delete their own posts and comments within defined time windows
- Can comment on public posts
- Can upvote or downvote content
- Can report content they believe violates community guidelines
- Cannot view or interact with private system settings
- Cannot manage other users
- Cannot modify content created by others

### Moderator

A moderator is a trusted citizen who has been granted additional responsibilities to maintain content quality and enforce community guidelines. Moderators are not employees and are not financially compensated for their service. Their authority is limited and subject to administrative oversight.

Key characteristics:
- All capabilities of a citizen
- Can view, edit, and delete any public post or comment (regardless of author)
- Can temporarily hide posts or comments pending review
- Can issue warnings to users for guideline violations
- Can temporarily suspend users for up to 14 days
- Cannot permanently delete user accounts
- Cannot change system configuration
- Cannot manage other moderators
- Cannot access backend data exports
- Cannot view detailed system logs or audit trails

### Admin

An administrator has full responsibility for the platform’s integrity, security, legal compliance, and data governance. Admins are the only actors with authority to make system-wide changes and oversee the moderation team.

Key characteristics:
- All capabilities of a citizen and moderator
- Can permanently delete any content, including posts and comments
- Can permanently ban any user account (including other moderators)
- Can modify any system setting, including posting rules, notification triggers, and visibility conditions
- Can approve or reject moderator-sanctioned actions
- Can access system logs, audit trails, and compliance reports
- Can generate user data exports in standardized formats
- Can configure and manage third-party integrations
- Can override automated moderation decisions
- Can assign or revoke moderator privileges

## Authentication Workflow

### Registration Process

WHEN a user submits a registration request with a valid email address, THE system SHALL create an unverified account with default citizen permissions.

WHEN account creation is successful, THE system SHALL send a verification email to the provided email address with a time-limited token.

WHEN the user clicks the verification link, THE system SHALL mark the email as verified and enable posting capabilities.

WHEN a registration request uses an email address already in use, THE system SHALL respond with a 409 Conflict error.

WHEN a registration request contains an invalid email format, THE system SHALL respond with 400 Bad Request.

WHEN a registration request omits required fields (email, password), THE system SHALL respond with 400 Bad Request and list missing fields.

### Login Flow

WHEN a user submits valid credentials (email and password), THE system SHALL authenticate the user and generate a JWT access token with embedded role and permissions payload.

WHEN authentication is successful, THE system SHALL set an HTTP-only Secure cookie containing the refresh token and return the access token in the response body.

WHEN credentials are invalid, THE system SHALL respond with 401 Unauthorized and MUST NOT disclose whether email or password was incorrect.

WHEN the user account is suspended or banned, THE system SHALL respond with 401 Unauthorized.

WHEN the account is unverified, THE system SHALL respond with 401 Unauthorized until verification completes.

### Session Management

WHEN an access token expires, THE system SHALL reject requests with 401 Unauthorized and prompt the client to use the refresh token.

WHEN a refresh token is used successfully, THE system SHALL generate a new access token and issue a new refresh token, invalidating the previous one.

WHEN a refresh token is expired or invalid, THE system SHALL respond with 401 Unauthorized and require full re-authentication.

WHEN a user requests to revoke all sessions, THE system SHALL invalidate all refresh tokens for that user and require re-login.

WHEN a user logs in from a new device, THE system SHALL record the device fingerprint and notify the user via email.

### Password Recovery

WHEN a user requests password reset, THE system SHALL verify the email is registered and send a time-limited reset link.

WHEN the user clicks the reset link, THE system SHALL validate the token and allow password change.

WHEN the reset token expires, THE system SHALL reject the request with 401 Unauthorized.

WHEN the password is changed successfully, THE system SHALL invalidate all existing sessions.

### Security Features

WHEN a user attempts five consecutive failed login attempts, THE system SHALL temporarily lock the account for 15 minutes.

WHEN an account is locked, THE system SHALL respond to login attempts with 423 Locked and indicate the remaining lock duration.

WHEN two-factor authentication is enabled, THE system SHALL require a one-time code during login.

WHEN biometric authentication is available, THE system SHALL allow it as an alternative to password entry.

## Authorization Model

The system uses an explicit permission model where permissions are defined per actor, not implicitly by role membership.

### Permission Matrix

The following permissions are enforced for all requests:

| Action | Citizen | Moderator | Admin |
|--------|---------|-----------|-------|
| Register new account | ✅ | ✅ | ✅ |
| Verify email address | ✅ | ✅ | ✅ |
| Log in to system | ✅ | ✅ | ✅ |
| Log out of session | ✅ | ✅ | ✅ |
| Change own password | ✅ | ✅ | ✅ |
| Reset forgotten password | ✅ | ✅ | ✅ |
| Revoke all active sessions | ✅ | ✅ | ✅ |
| Create new post | ✅ | ✅ | ✅ |
| Edit own post (within 24 hours) | ✅ | ✅ | ✅ |
| Edit own post (after 24 hours) | ✅ | ✅ | ✅ |
| Delete own post | ✅ | ✅ | ✅ |
| Create comment on post | ✅ | ✅ | ✅ |
| Edit own comment (within 1-hour window) | ✅ | ✅ | ✅ |
| Edit own comment (after 1-hour window) | ✅ | ✅ | ✅ |
| Delete own comment | ✅ | ✅ | ✅ |
| Upvote content | ✅ | ✅ | ✅ |
| Downvote content | ✅ | ✅ | ✅ |
| Flag content as inappropriate | ✅ | ✅ | ✅ |
| View list of reported content | ❌ | ✅ | ✅ |
| Review reported content | ❌ | ✅ | ✅ |
| Hide content temporarily (pending review) | ❌ | ✅ | ✅ |
| Permanently delete any post | ❌ | ✅ | ✅ |
| Permanently delete any comment | ❌ | ✅ | ✅ |
| Issue warning to user | ❌ | ✅ | ✅ |
| Temporarily suspend user (up to 14 days) | ❌ | ✅ | ✅ |
| Permanently ban user | ❌ | ❌ | ✅ |
| Edit any user’s profile information | ❌ | ❌ | ✅ |
| View detailed user activity logs | ❌ | ❌ | ✅ |
| Generate data export for user | ❌ | ❌ | ✅ |
| Access audit trail | ❌ | ❌ | ✅ |
| Configure system settings (posting limits, notification rules, etc.) | ❌ | ❌ | ✅ |
| Assign moderator privileges to other users | ❌ | ❌ | ✅ |
| Revoke moderator privileges | ❌ | ❌ | ✅ |
| Access raw database or server logs | ❌ | ❌ | ✅ |
| Configure third-party integrations (email, analytics, etc.) | ❌ | ❌ | ✅ |
| Override automated moderation decisions | ❌ | ❌ | ✅ |
| View hidden content (content flagged but not yet reviewed) | ❌ | ✅ | ✅ |
| View content of suspended users | ❌ | ✅ | ✅ |
| Restore content previously hidden by moderator | ❌ | ✅ | ✅ |
| Access system health and performance metrics | ❌ | ❌ | ✅ |
| View list of users with active moderation warnings | ❌ | ✅ | ✅ |
| View list of temporarily suspended users | ❌ | ✅ | ✅ |
| View list of permanently banned users | ❌ | ❌ | ✅ |
| Reverse a moderator’s decision (decisions made within last 3 days) | ❌ | ❌ | ✅ |
| Add new comment categories or tags | ❌ | ❌ | ✅ |
| Change publication timing rules (e.g., approval queues) | ❌ | ❌ | ✅ |
| Configure auto-deletion of inactive accounts | ❌ | ❌ | ✅ |

## Access Control Enforcement

### Permission Denied Responses

WHEN a user attempts an action outside their permission level, THE system SHALL respond with HTTP status code 403 Forbidden.

THE system SHALL return a structured JSON error response containing:
- error_code: "ACCESS_DENIED"
- message: "You do not have permission to perform this action."
- timestamp: ISO 8601 format
- resource_attempted: [action taken]
- actor_role: [user’s current role]
- required_role: [minimum role required]

EXAMPLE:
```json
{
  "error_code": "ACCESS_DENIED",
  "message": "You do not have permission to perform this action.",
  "timestamp": "2025-11-20T14:44:42.101Z",
  "resource_attempted": "delete_user_account",
  "actor_role": "citizen",
  "required_role": "admin"
}
```

WHEN a non-authenticated user attempts any action requiring authentication, THE system SHALL respond with HTTP status code 401 Unauthorized.

WHEN a user attempts to edit content they do not own and are not authorized to edit, THE system SHALL respond with HTTP status code 403 Forbidden.

WHEN a moderator attempts to ban a user, THE system SHALL respond with HTTP status code 403 Forbidden if the target user is an admin.

WHEN an admin attempts to execute a system-reset function without confirmation, THE system SHALL respond with HTTP status code 403 Forbidden and require an additional confirmation step.

### Request Validation

WHEN a request is received, THE system SHALL validate the user's identity and role from the JWT token.

WHEN the token is malformed, expires, or is missing, THE system SHALL respond with 401 Unauthorized.

WHEN a user's role is not recognized in the JWT, THE system SHALL treat the user as unauthenticated and redirect to login.

WHEN a user's permission set in the JWT is outdated, THE system SHALL invalidate the token and require re-authentication.

## Permission Escalation and Revocation

### Escalation

WHILE a user is active in the system, THE system SHALL NOT permit permission changes unless initiated by an admin through explicit, auditable actions.

IF a user is promoted to moderator by an admin, THE system SHALL immediately update their JWT token payload with new permissions and expire all existing non-updated tokens.

IF a moderator is promoted to admin, THE system SHALL generate a new JWT with admin permissions and revoke all prior tokens.

### Revocation

IF a moderator’s privileges are revoked, THE system SHALL immediately invalidate all stored JWT tokens for that user and require re-authentication with reduced permissions.

IF an admin revokes a user’s account, THE system SHALL invalidate all tokens for the user and mark the account as disabled.

WHEN a user changes their password, THE system SHALL invalidate all refresh tokens and require new login.

## Audit Requirements

All permission-related actions, including attempts to access restricted functionality, MUST be recorded in the system audit trail.

WHEN a permission change occurs (granting or revoking privileges), THE system SHALL record:
- actor_id: ID of the user whose permissions changed
- initiator_id: ID of the admin who initiated the change
- action: "GRANT_MODERATOR" or "REVOKE_MODERATOR"
- timestamp: ISO 8601 format
- metadata: [optional reason provided by admin]
- ip_address: source IP address of initiator
- user_agent: browser/device identifier

WHEN any user attempts an action that results in an access denial (403 response), THE system SHALL log:
- actor_id: ID of user attempting the action
- attempted_action: [specific system endpoint or function]
- status_code: 403
- timestamp: ISO 8601 format
- request_metadata: [headers, user-agent, etc.]

WHEN a moderator performs a moderation action (delete, hide, suspend, warn), THE system SHALL log:
- action: [delete_post, hide_comment, warn_user, suspend_user]
- moderator_id: ID of moderator performing action
- target_id: ID of affected user or content
- reason: [reason provided by moderator]
- timestamp: ISO 8601 format
- action_context: [unique identifier of reported content or user profile]

All audit records are retained for a minimum of 365 days and are accessible only to admins.

## Error Handling Policies

All permission errors must be handled in a way that prevents users from inferring system structure or bypassing security controls.

WHEN a 403 Forbidden response is triggered, THE system SHALL NOT disclose the existence of a requested resource (e.g., "Post not found" is NOT allowed).

IF the user’s token is expired or invalid, THE system SHALL respond with 401 Unauthorized regardless of the intended action.

WHEN a user attempts to access a hidden resource they do not have permission to see, THE system SHALL respond with 404 Not Found for administrative endpoints, and 403 Forbidden for user-visible interfaces.

WHILE a user’s session is active and their permissions are changed via admin action, THE system SHALL invalidate their tokens on the next API request but continue to allow immediate use until token refresh.

IF a user’s JWT token contains invalid or malformed role/permissions data, THE system SHALL treat the user as unauthenticated and redirect to login.

WHEN a user attempts to use an API endpoint associated with a role they no longer have, THE system SHALL log the event as a suspicious access attempt.

WHEN any error related to permission or access control occurs, THE system SHALL NOT expose stack traces, database queries, or internal endpoint paths to the client.

THE system SHALL NOT allow users to discover role boundaries through enumeration (e.g., testing different role values in requests).

THE system SHALL return identical error responses for users with identical permission levels, regardless of whether the target resource actually exists.

In ALL cases, access-related errors MUST be processed server-side and NEVER delegated to client-side logic.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*