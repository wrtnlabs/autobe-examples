## Actor Definitions

The politicalForum system defines two distinct user actor types with clearly differentiated responsibilities and permissions. Each actor has specific capabilities that align with their role in maintaining an open, respectful, and moderated discussion environment.

### Citizen Actor

A Citizen is an authenticated user who participates in the discussion forum by creating content, engaging in conversation, and sharing resources. This is the foundational user role and represents the majority of active users on the platform.

Citizens can:
- Register an account using a valid email address and password
- Log in and authenticate their identity to access personalized features
- Create new discussion posts with a title and body content
- Attach one or more files or images to their posts (maximum 5 attachments per post)
- Edit their own posts within 24 hours of creation
- Delete their own posts at any time
- Comment on any public post
- Like or react to posts and comments with a single emoji reaction
- Search and browse posts by category, keyword, or date
- Follow topics of interest to receive updates on new activity
- Change their display name and profile picture
- Reset their password through email verification
- Log out of their session at any time

Citizens cannot:
- View or interact with moderator tools or interfaces
- Delete or edit posts created by other users
- Lock or modify the status of any thread
- Mark content as verified or authoritative
- Bypass content moderation queues
- Upload files exceeding 10MB in size
- Upload executable files (.exe, .bat, .dll, .app, .scr, .com)
- Post content containing direct threats, hate speech, or illegal material
- Create multiple accounts for the purpose of vote manipulation or spam
- Bypass the 24-hour edit window for their own posts
- Remove comments made by other users
- Change system-wide settings or configuration

### Moderator Actor

A Moderator is a trusted user with elevated permissions responsible for maintaining the quality, safety, and civil discourse of the forum. Moderators are appointed by system administrators and represent a small subset of users with additional responsibilities.

Moderators can:
- Perform all actions available to a Citizen (including creating posts, commenting, and attaching files)
- Delete any post or comment on the forum regardless of authorship
- Lock threads to prevent further comments or reactions
- Unlock threads that have been previously locked
- Mark any post or comment as "Verified" to indicate official status or fact-checked information
- Unmark verified content if its validity is later disproven
- View moderation dashboard with analytics and flagging reports
- Tag posts for review by other moderators
- View user activity logs for moderation purposes
- Issue private warnings to users who violate community standards
- Review and approve/deny user reports of inappropriate content
- Boot users from private messages for violating moderation rules
- Access suspected spam detection reports and suspicious pattern alerts

Moderators cannot:
- Delete or edit other moderators' posts or comments
- Change system-wide configuration settings or backend parameters
- Create or delete user accounts
- Modify authentication methods or security protocols
- Bypass content moderation queues or skip review procedures
- View private messages between users unless explicitly reported and investigated
- Alter the 24-hour edit window for ordinary users
- Modify file upload restrictions
- Access financial or billing systems
- View other users' passwords or secure authentication tokens
- Assign moderator privileges to other users
- Remove permanent bans applied by system administrators
- Edit or delete system-generated messages (e.g., automated notifications)

## Authentication Requirements

The politicalForum system enforces a robust, token-based authentication workflow to ensure secure access to user accounts and privileges.

WHEN a user attempts to register, THE system SHALL require a valid email address and a password with minimum 8 characters, including at least one uppercase letter, one lowercase letter, and one digit.

WHEN a user submits login credentials, THE system SHALL verify them against the stored hashed password and issue an authentication token if valid.

WHILE a user is authenticated, THE system SHALL maintain an active session tied to their bearer token.

WHEN a user logs out, THE system SHALL immediately invalidate the issued token and clear client-side storage.

WHEN a user forgets their password, THE system SHALL send a one-time password reset link to their registered email address, valid for 1 hour.

WHEN a user attempts to access protected resources without authentication, THE system SHALL return HTTP 401 Unauthorized with a clear message indicating that login is required.

WHEN a user attempts to access moderator-only features as a Citizen, THE system SHALL return HTTP 403 Forbidden with a message stating "You do not have permission to perform this action."

WHEN a user's session expires, THE system SHALL automatically redirect them to the login page with a notification that their session has timed out.

## Permissions Matrix

The following matrix defines the specific actions each actor can and cannot perform, as strictly enforced by backend logic. Each row represents a business function; each column represents an actor role. ✅ indicates permitted, ❌ indicates prohibited.

| Action | Citizen | Moderator |
|--------|---------|-----------|
| Register account | ✅ | ✅ |
| Log in | ✅ | ✅ |
| Log out | ✅ | ✅ |
| Create post | ✅ | ✅ |
| Edit own post (within 24 hours) | ✅ | ✅ |
| Edit own post (after 24 hours) | ❌ | ✅ |
| Delete own post | ✅ | ✅ |
| Delete any post | ❌ | ✅ |
| Comment on any post | ✅ | ✅ |
| Delete any comment | ❌ | ✅ |
| Upload image attachment | ✅ | ✅ |
| Upload non-image file attachment | ✅ | ✅ |
| Upload >10MB file | ❌ | ❌ |
| Upload executable file | ❌ | ❌ |
| Lock a thread | ❌ | ✅ |
| Unlock a thread | ❌ | ✅ |
| Mark post as verified | ❌ | ✅ |
| Unmark verified post | ❌ | ✅ |
| View moderation dashboard | ❌ | ✅ |
| View user activity logs | ❌ | ✅ |
| Issue private warnings | ❌ | ✅ |
| Review user reports | ❌ | ✅ |
| Boot user from DMs | ❌ | ✅ |
| Access financial systems | ❌ | ❌ |
| Modify system settings | ❌ | ❌ |
| Create/delete user accounts | ❌ | ❌ |
| View passwords or tokens | ❌ | ❌ |
| Assign moderator privileges | ❌ | ❌ |
| Revoke moderator privileges | ❌ | ❌ |
| Access encrypted data | ❌ | ❌ |
| See unapproved content in moderation queue | ❌ | ✅ |
| Search all content regardless of visibility | ❌ | ✅ |

## Session Management

The system implements a secure session management policy to protect user data and minimize unauthorized access risks.

WHEN a user logs in successfully, THE system SHALL issue a refresh token with a 30-day expiration period and an access token with a 15-minute expiration period.

WHILE a user's session is active, THE system SHALL allow the access token to be refreshed up to five times (once every 15 minutes) before requiring re-authentication.

WHEN a user remains inactive for 7 days, THE system SHALL automatically invalidate their refresh token, requiring login to resume activity.

WHEN a refresh token is used to obtain a new access token, THE system SHALL generate a new refresh token and revoke the previous one, implementing token rotation.

WHEN a user reports a device as compromised, THE system SHALL immediately invalidate ALL refresh and access tokens associated with that account.

WHEN a new login occurs from an unrecognized device, THE system SHALL send a notification to all known registered email addresses associated with the account, detailing login time, location, and device type.

WHEN a user logs in from a new device, THE system SHALL present a "Remember this device?" prompt with options to trust or reject the device.

WHEN a user's refresh token is revoked (via logout, compromise report, or timeout), THE system SHALL immediately terminate all active sessions and require full re-authentication.

## Token Structure

All authentication tokens for this system follow the JSON Web Token (JWT) standard with a defined payload structure that carries critical context for authorization decisions.

WHEN a token is issued, THE system SHALL encode the following claims in the JWT payload:

- "sub": A unique, immutable string identifier for the user (UUID format)
- "role": Exactly one of the two string values: "citizen" or "moderator"
- "permissions": An array of strings defining the user's specific entitlements; for "citizen", this array will contain [] (empty); for "moderator", this array will contain ["delete_post", "lock_thread", "mark_verified", "view_dashboard", "review_reports", "send_warning", "boot_dm", "eval_spam"]
- "iat": Integer timestamp (seconds) representing when the token was issued
- "exp": Integer timestamp (seconds) representing when the token expires; access tokens expire in 900 seconds (15 minutes); refresh tokens expire in 2,592,000 seconds (30 days)
- "iss": The string "politicalForum" identifying the token issuer
- "aud": The string "politicalForumBackend" indicating the target audience

WHEN the server receives a JWT, THE system SHALL verify its signature against the configured secret key and decode the payload to determine the actor's role and permissions.

WHERE a token contains an undefined or invalid role value, THE system SHALL reject the token with HTTP 401 Unauthorized.

WHERE a token has expired (current time > exp), THE system SHALL reject the token with HTTP 401 Unauthorized.

WHERE a token is malformed, corrupted, or tampered with, THE system SHALL reject the token with HTTP 401 Unauthorized.

WHERE a token contains a "role" value other than "citizen" or "moderator", THE system SHALL reject the token with HTTP 401 Unauthorized.

THE system SHALL, for every protected endpoint, use the "role" claim to determine access level and the "permissions" array to evaluate sandboxed actions.

THE system SHALL never store tokens on the server side; all authorization decisions are derived from the verifiable, signed token payload.

THE system SHALL rotate refresh tokens on every use to prevent replay attacks.

THE system SHALL log ALL token rejection events for security monitoring and potential breach detection.

THE system SHALL store JWT secret keys in environment variables with 256-bit entropy and rotate keys quarterly with zero-downtime transitions.

WHEN a user changes their password, THE system SHALL immediately invalidate ALL existing refresh tokens for that account.

WHEN a user removes their account, THE system SHALL purge all associated tokens from the journal but retain the user identifier in an immutable audit log for compliance purposes.

THE system SHALL validate token claims on EVERY request to protected endpoints—not on login only—to ensure permissions remain accurate in real time.

THE system SHALL cache expired token signatures for 5 minutes to prevent accidental reuse during clock skew scenarios.

THE system SHALL require HTTPS for ALL token transmission to prevent interception and man-in-the-middle attacks.



> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*