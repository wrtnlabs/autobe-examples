## Role Definitions

### Guest
A guest is an unauthenticated user who accesses the discussion board without logging in. Guests can only view public content and are not permitted to create, modify, or delete any content. The system identifies guests by the absence of a valid authentication token.

- THE system SHALL allow guests to view all public posts and topic categories.
- THE system SHALL display all posts with a标注 'Guest' as the author, regardless of origin.
- THE system SHALL prevent guests from accessing any interaction controls for creating, editing, or deleting posts.
- THE system SHALL enforce that all posts attributed to 'Guest' are automatically treated as pending moderation before being displayed publicly.
- THE system SHALL NOT permit guests to search content with filters beyond topic selection.
- THE system SHALL allow guests to view post timestamps and topic categories but not associated user profiles.

### Member
A member is an authenticated user who has successfully registered and logged in using a valid email address and password. Members can create posts, respond to other posts, and edit their own content within a 24-hour window after submission. All member-submitted content must be reviewed before it becomes public.

- WHEN a user submits a login request with valid credentials, THE system SHALL assign a JWT token containing the role 'member' and userId.
- WHEN a member creates a new post, THE system SHALL save it with status 'pending' and notify administrators for review.
- WHEN a member submits a reply to an existing post, THE system SHALL attach it as a child node to the parent post with status 'pending'.
- WHILE a member's post or reply is in 'pending' status, THE system SHALL prevent it from appearing in public feeds or search results.
- WHEN a member attempts to edit their own post, THE system SHALL allow edits ONLY if the post was created less than 24 hours ago.
- IF a member attempts to edit their post after 24 hours, THEN THE system SHALL deny the edit and display: 'Editing is only allowed within 24 hours of posting'.
- WHERE a member's post is approved, THE system SHALL update the post status to 'public' and display the member's registered username.
- WHERE a member's post is rejected by an admin, THE system SHALL notify the member via in-app message: 'Your post was removed for violating community guidelines'.
- THE system SHALL allow members to view their own pending, approved, and rejected content under a personal activity log.

### Admin
An admin is a trusted user with elevated permissions to oversee content moderation, manage topic categories, and approve or remove posts from the board. Admins are assigned by the system owner and do not require public registration.

- WHEN an admin logs into the system, THE system SHALL grant a JWT token with role 'admin' and full moderation permissions.
- WHILE the system has pending posts, THE system SHALL display a visual notification badge to admins on every page.
- WHEN an admin approves a pending post, THE system SHALL change its status to 'public' and make it visible to all users.
- WHEN an admin rejects a pending post, THE system SHALL set its status to 'rejected' and remove it from the public feed.
- WHEN an admin deletes a post, THE system SHALL permanently remove the post and all related replies, and log the deletion with admin ID and timestamp.
- WHERE a topic category has fewer than 3 active posts in 30 days, THE system SHALL allow an admin to archive the topic.
- WHERE an admin navigates to the moderation panel, THE system SHALL display a list of pending posts sorted by creation time, oldest first.
- THE system SHALL maintain a log of all admin actions (approve, reject, delete) with user ID, action type, timestamp, and post ID.
- THE system SHALL prevent admins from editing or deleting their own posts with the same privileges as other admins—no special privileges for self-submitted content.

## Permission Matrix

| Action | Guest | Member | Admin |
|--------|-------|--------|-------|
| View all public posts | ✅ | ✅ | ✅ |
| View topic categories | ✅ | ✅ | ✅ |
| Create new post | ❌ | ✅ | ✅ |
| Reply to any post | ❌ | ✅ | ✅ |
| Edit own post (within 24h) | ❌ | ✅ | ✅ |
| Edit own post (after 24h) | ❌ | ❌ | ✅ |
| Delete own post | ❌ | ❌ | ✅ |
| Delete any post | ❌ | ❌ | ✅ |
| Reject any pending post | ❌ | ❌ | ✅ |
| Approve any pending post | ❌ | ❌ | ✅ |
| Archive topic category | ❌ | ❌ | ✅ |
| Create new topic category | ❌ | ❌ | ✅ |
| View personal activity log | ❌ | ✅ | ✅ |
| View moderation dashboard | ❌ | ❌ | ✅ |
| View admin action logs | ❌ | ❌ | ✅ |

## Authentication Flow

1. **Guest Access**:
   - The user visits the board homepage.
   - The system serves the public feed with all approved posts.
   - No token is issued.

2. **Member Registration and Login**:
   - WHEN the user clicks "Sign Up", THE system SHALL present a form for email and password.
   - WHEN the user submits valid credentials, THE system SHALL create a new user record with role 'member' and send a confirmation email.
   - WHEN the user confirms email, THE system SHALL activate the account.
   - WHEN a user logs in with valid credentials, THE system SHALL generate a JWT access token with role 'member' and identical token structure to admin tokens.
   - THE JWT payload SHALL contain: { "userId": "string", "role": "member", "iat": "timestamp", "exp": "timestamp" }.
   - THE system SHALL store the refresh token securely in an httpOnly cookie.
   - THE system SHALL require re-authentication if the refresh token is expired or revoked.

3. **Admin Access**:
   - Admin accounts are pre-configured by the system owner with known email addresses.
   - There is no public sign-up or registration for admin roles.
   - WHEN an admin logs in, THE system SHALL generate a JWT access token with role 'admin' and identical token structure to member tokens.
   - THE system SHALL verify admin status by comparing email against a pre-approved list stored in the system's secure configuration.

## Session Management

- THE system SHALL track active sessions using JWT access tokens stored in browser memory (not localStorage).
- THE system SHALL expire access tokens after 30 minutes of inactivity.
- WHEN an access token expires, THE system SHALL automatically use the refresh token to obtain a new access token.
- IF the refresh token is invalid, expired, or revoked, THEN THE system SHALL clear all session data and require full re-authentication.
- THE system SHALL allow a user to revoke all active sessions from their profile settings.
- WHEN a user logs out, THE system SHALL delete the refresh token cookie and invalidate the active access token.

## Access Restrictions by Role

- Guests may not access any endpoint that modifies data (POST, PUT, DELETE).
- Members may access all read endpoints and the following write endpoints: /posts/create, /posts/{id}/reply, /posts/{id}/edit (only within 24 hours).
- Admins may access all read and write endpoints and may bypass moderation queues for their own posts only if the system is configured to allow that override (this is configurable by system owner and not enabled by default).
- No role may access any administrative endpoint (e.g., /admin/topics, /admin/logs) except an admin.
- THE system SHALL return HTTP 403 Forbidden for any role attempting to access endpoints outside their permission scope.

## Authorization Decision Logic

All authorization decisions SHALL be encoded in middleware that evaluates the JWT payload before processing any request:

1. WHEN a request is received, THE system SHALL extract and validate the JWT token.
2. IF the token is invalid, expired, or missing, THEN THE system SHALL treat the user as a guest.
3. IF the token contains role 'member', THEN THE system SHALL allow only member-level actions and enforce 24-hour edit windows.
4. IF the token contains role 'admin', THEN THE system SHALL allow all moderation actions and bypass content moderation for the admin’s own submissions. 
5. WHERE a request targets the '/posts/{id}/delete' endpoint AND the user is not admin, THEN THE system SHALL immediately reject the request.
6. WHERE the request includes data that would modify public visibility (e.g., approve/reject/delete), THEN THE system SHALL verify the user role before applying any change.
7. THE system SHALL maintain a full audit trail of all authorization decisions taken, including token payload, IP address, request timestamp, and outcome.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*