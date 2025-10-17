## User Role Definitions

### Guest

The guest role represents unauthenticated users who can access public content but cannot interact with the discussion board. Guests have read-only access to all publicly available content and are subject to specific restrictions on content creation and system interactions.

### Member

The member role represents authenticated users who can actively participate in discussions. Members have the ability to create new threads, reply to existing posts, upvote or downvote content, report inappropriate material, and manage their user profiles. Members are required to complete email verification before gaining full participation privileges.

### Moderator

The moderator role represents authorized users with elevated permissions for content oversight and community management. Moderators can review reported content, approve or reject new discussion threads, edit or delete inappropriate content, ban users from the system, and deliver warnings to users violating community guidelines. Moderators operate under a strict authorization model with additional verification requirements.

## Authentication Requirements

### Core Authentication Functions

THE system SHALL implement a comprehensive authentication framework supporting the following operations:

- Users can register with a unique email address and password
- Users can log in using their credentials to access their account
- Users can log out to terminate their active session
- System maintains user sessions securely
- Users can verify their email address through a confirmation link
- Users can reset forgotten passwords through an email-based recovery process
- Users can change their password with proper authentication verification
- Users can revoke access from all devices

### Password Policy

WHEN a user attempts to create a password, THE system SHALL enforce the following requirements:

- Passwords MUST be at least 8 characters long
- Passwords MUST contain at least one uppercase letter
- Passwords MUST contain at least one lowercase letter
- Passwords MUST contain at least one digit
- Passwords MUST contain at least one special character from: !@#$%^&*()
- Passwords CANNOT contain spaces
- Passwords CANNOT be the same as the username
- Passwords CANNOT be on a list of common and easily guessed passwords

### Email Verification

WHEN a new user completes registration, THE system SHALL send a verification email with a unique, time-limited link. IF the user does not click the verification link within 24 hours, THE system SHALL automatically delete the unverified account and remove all related data. USERS SHALL NOT be able to log in until their email address is verified.

### Login Attempt Limits

WHEN a user attempts to log in and receives invalid credentials, THE system SHALL track failed attempts. IF five consecutive failed login attempts occur from the same IP address within a 15-minute period, THE system SHALL temporarily block all further attempts from that IP address for one hour. THE system SHALL send a notification email to the user when their account is temporarily locked due to excessive failed attempts.

## Role-Based Permissions Matrix

| Permission | Guest | Member | Moderator |
|------------|-------|--------|-----------|
| View discussion threads | ✅ | ✅ | ✅ |
| Create new discussion threads | ❌ | ✅ | ✅ |
| Reply to existing threads | ❌ | ✅ | ✅ |
| Edit own posts | ❌ | ✅ | ✅ |
| Delete own posts | ❌ | ✅ | ✅ |
| Upvote posts | ❌ | ✅ | ✅ |
| Downvote posts | ❌ | ✅ | ✅ |
| Report inappropriate content | ❌ | ✅ | ✅ |
| Access user profile | ❌ | ✅ | ✅ |
| Edit user profile | ❌ | ✅ | ✅ |
| Promote content to featured | ❌ | ❌ | ✅ |
| Approve new discussion threads | ❌ | ❌ | ✅ |
| Remove inappropriate content | ❌ | ❌ | ✅ |
| Ban users from platform | ❌ | ❌ | ✅ |
| Send warnings to users | ❌ | ❌ | ✅ |
| View user activity logs | ❌ | ❌ | ✅ |
| Access system configuration | ❌ | ❌ | ❌ |

## Session Management

### Session Creation

WHEN a user successfully authenticates with valid credentials, THE system SHALL create a user session. THE system SHALL generate a unique session identifier and store it in the session store with a timestamp indicating creation time. THE system SHALL associate the session with the user's account information and set the session expiration time to 30 days from creation.

### Session Renewal

WHILE a user is actively using the system, THE system SHALL automatically renew the session upon each authenticated request. THE system SHALL update the session's timestamp to the current time when any authenticated request is received. THE system SHALL extend the session expiration time by 30 days from the renewal timestamp.

### Session Revocation

IF a user explicitly requests to log out from all devices, THE system SHALL invalidate all active sessions associated with that user account. THE system SHALL remove all session identifiers from the session store and mark the sessions as terminated. THE system SHALL issue a notification to the user confirming the successful logout.

### Automated Session Expiration

WHILE a user session is active, THE system SHALL verify the session's validity on each request. IF a session has not been renewed within the last 30 days, THE system SHALL automatically terminate the session and invalidate all related session identifiers. THE system SHALL return an error response with code 401 (Unauthorized) and message "Session has expired" to any request attempting to use an expired session.

### Session Lifetime

THE session SHALL automatically expire after 30 days of inactivity. THE session SHALL be considered active only when a request is made with a valid session identifier. IF no active activity occurs for 30 consecutive days, THE system SHALL automatically terminate the session and remove all associated data from the session store.

## JWT Token Structure

### Token Generation

WHEN a user successfully authenticates, THE system SHALL generate a JSON Web Token (JWT) containing the following claims:

- `userId`: The unique identifier for the authenticated user
- `role`: The user's role (guest, member, or moderator)
- `permissions`: An array of permissions granted to the user based on their role
- `iat`: The timestamp of token issuance (ISO 8601 format)
- `exp`: The timestamp of token expiration (15 minutes after issuance)
- `jti`: A unique identifier for the token

### Token Payload Structure

```json
{
  "userId": "user-12345",
  "role": "member",
  "permissions": [
    "create_thread",
    "reply_to_thread",
    "upvote_content",
    "downvote_content",
    "report_content",
    "edit_own_post",
    "delete_own_post"
  ],
  "iat": 1709213400,
  "exp": 1709213460,
  "jti": "token-abc123"
}
```

### Token Expiration

THE access token SHALL expire 15 minutes after issuance. WHEN a request contains an expired token, THE system SHALL respond with HTTP status code 401 (Unauthorized) and challenge the user to re-authenticate. THE system SHALL generate a new token upon successful re-authentication.

### Token Refresh

THE system SHALL provide a refresh token with each authentication that expires after 30 days of inactivity. WHEN a user makes an authenticated request with an expiring access token and a valid refresh token, THE system SHALL generate a new access token with a new expiration time of 15 minutes from issuance. IF the refresh token is expired or invalid, THE system SHALL return an error response requiring the user to re-authenticate.

### Token Storage and Security

THE system SHALL store access tokens in the browser's local storage for convenience. THE system SHALL store refresh tokens in an httpOnly cookie to prevent cross-site scripting (XSS) attacks. THE system SHALL implement secure transmission of tokens using HTTPS and prevent token leakage through logging mechanisms.

## Access Control Rules

### Role Hierarchy Enforcement

THE role hierarchy SHALL enforce that a user with a lower role cannot perform actions authorized to higher roles. IF a user attempts to perform an action requiring a higher role than their current role, THE system SHALL deny the request and return HTTP status code 403 (Forbidden) with message "Insufficient permissions"

### Transaction-Level Access Control

WHEN a user attempts to modify content, THE system SHALL verify both the user's role and the relationship to the content. IF a member attempts to edit a post created by another member, THE system SHALL deny the request and return HTTP status code 403 (Forbidden) with message "Cannot edit content created by another user". IF a user attempts to delete a post they did not create, THE system SHALL deny the request and return HTTP status code 403 (Forbidden) with message "Cannot delete content created by another user".

### Cross-Role Interaction Rules

WHILE a reviewer is working in the system, THE system SHALL enforce that moderators cannot assign roles to other users based only on their own authority. IF a moderator attempts to grant another user moderator privileges without reviewing the user's application materials, THE system SHALL deny the request and return HTTP status code 403 (Forbidden) with message "Role assignment requires review and approval process".

### Data Exposure Control

THE system SHALL implement fine-grained access control for sensitive information. IF a guest attempts to access a user profile, THE system SHALL return only the username and registration date, omitting any sensitive information such as email address, password hash, and session data. IF a member attempts to access another member's profile, THE system SHALL return only publicly available information.

### Audit Trail Requirements

WHILE a user performs privileged actions, THE system SHALL create an automatic audit trail. IF a moderator approves a new discussion thread, THE system SHALL log the action with the following information:

- Timestamp of action (ISO 8601 format)
- User ID of the moderator
- Action performed (approval/rejection)
- Thread ID being modified
- Reason for action (if applicable)
- System IP address where the action occurred

THE system SHALL ensure that audit trail data cannot be modified after creation and is stored in a separate, protected database table.

### Hybrid Access Control

IF a user attempts to perform an action that requires both membership and moderation privileges, THE system SHALL enforce that the user must have full moderator status to perform the action. IF a member attempts to perform an action requiring moderator privileges, THE system SHALL deny the request and return HTTP status code 403 (Forbidden) with message "Moderator privileges required for this operation".

### Session Validation

WHEN a request contains a JWT token, THE system SHALL validate the token's integrity and expiration. IF the token is malformed, expired, or has been revoked, THE system SHALL return HTTP status code 401 (Unauthorized) with message "Invalid or expired authentication token". THE system SHALL not proceed with the requested operation when authentication validation fails.

# IMPLEMENTATION NOTE

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*