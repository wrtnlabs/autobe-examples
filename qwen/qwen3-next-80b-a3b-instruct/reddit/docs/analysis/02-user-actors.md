## User Actor Structure

This document defines the complete set of user actors for the communityPlatform service, including their permissions, capabilities, authentication requirements, and interactions with the system. All actor definitions are written in natural business language using EARS format, as required for backend implementation.

### Actor Hierarchy Overview

The communityPlatform supports four distinct actor types, each with escalating levels of access and responsibility. All actors must authenticate using JWT tokens, and all permissions are enforced at the backend layer based on the actor type present in the JWT payload. The actor hierarchy is strictly enforced, and system behavior differs fundamentally based on the actor type associated with each request.

The actors are organized in a hierarchy of increasing privilege:

1. **Guest** — Unauthenticated users who can browse content but cannot interact with it
2. **Member** — Authenticated users who can create content, vote, comment, and subscribe
3. **Moderator** — Community-level administrators with content control authority limited to specific communities
4. **Admin** — System-wide administrators with full control over all communities and users

No actor can perform actions reserved for higher-tier actors. Privileges are never inherited implicitly and must be explicitly granted through system configuration.

### Guest (Unauthenticated)

A guest is a user who has not logged in and does not possess a valid session token. Guests have the most restricted access to the platform and are treated as anonymous visitors in all system interactions.

WHEN a guest attempts to create a post, THE system SHALL deny access and display a message: "You must be logged in to create a post."

WHEN a guest attempts to upvote or downvote a post, THE system SHALL deny access and display a message: "You must be logged in to vote."

WHEN a guest attempts to comment on a post, THE system SHALL deny access and display a message: "You must be logged in to comment."

WHEN a guest attempts to subscribe to a community, THE system SHALL deny access and display a message: "You must be logged in to subscribe."

WHEN a guest attempts to report content, THE system SHALL allow the action and store the report anonymously, but SHALL NOT associate it with any user profile.

WHEN a guest attempts to view a user profile, THE system SHALL display only publicly visible information: username, karma score, and list of posts/comments (with identifiers, not editable links).

WHEN a guest accesses any page, THE system SHALL display all community listings and public posts without filtering, but SHALL NOT show action buttons for voting, commenting, or subscribing.

WHILE the guest is viewing content, THE system SHALL ALLOW navigation between communities and posts, but SHALL NOT permit any interaction requiring authentication.

WHEN a guest clicks on "Sign Up" or "Log In", THE system SHALL redirect to the authentication flow and terminate the anonymous session.

### Member (Authenticated Standard User)

A member is an authenticated user who has successfully registered and verified their email. Members are the primary content-producing actors and form the core community. Their identity is permanently linked to their posts, votes, and comments through their unique user ID.

WHEN a member registers with email and password, THE system SHALL create a user account with role "member", initial karma of 0, and an unverified email status.

WHEN a member attempts to log in with valid credentials, THE system SHALL generate a JWT token with payload { "userId": "string", "role": "member", "permissions": [] } and set it in the HTTP response header or localStorage as configured.

WHEN a member attempts to create a post (text, link, or image), THE system SHALL validate that the content is not empty, does not exceed 10,000 characters for text, and that images are under 10MB in size, THEN SHALL create the post with the member’s userId, current timestamp, and initial upvote/downvote counts of 0, and SHALL make it immediately visible to all users.

WHEN a member upvotes a post, THE system SHALL increment the post’s upvote count by 1, decrement the downvote count by 1 if previously downvoted, and SHALL store the vote in the system as an association between the member’s userId and the post ID.

WHEN a member downvotes a post, THE system SHALL increment the post’s downvote count by 1, decrement the upvote count by 1 if previously upvoted, and SHALL store the vote in the system as an association between the member’s userId and the post ID.

WHEN a member attempts to upvote or downvote the same post a second time, THE system SHALL reverse the previous vote (e.g., changing an upvote to a downvote, or removing the vote if re-clicked), and SHALL recalculate the net score accordingly.

WHEN a member attempts to comment on a post, THE system SHALL validate that the comment text is between 1 and 500 characters, THEN SHALL create the comment linked to the member’s userId, the target post ID, and a timestamp, and SHALL set parentCommentId to null for top-level comments.

WHEN a member attempts to reply to a comment, THE system SHALL validate the comment text does not exceed 500 characters, THEN SHALL create the comment with parentCommentId set to the ID of the comment being replied to, and SHALL establish the nested reply structure.

WHEN a member attempts to edit their own post or comment, THE system SHALL only allow editing within 24 hours of creation, and SHALL record the revision history but not publicly expose edit timestamps.

WHEN a member attempts to delete their own post or comment, THE system SHALL allow deletion if no replies exist, and SHALL mark it as "deleted" in display (with "[deleted]" placeholder) for all users including the original author.

WHEN a member subscribes to a community, THE system SHALL add the member’s userId to the community’s subscriber list and SHALL increment the community’s subscriber count by 1.

WHEN a member unsubscribes from a community, THE system SHALL remove the member’s userId from the community’s subscriber list and SHALL decrement the community’s subscriber count by 1.

WHEN a member views their own profile, THE system SHALL display their username, karma score, total number of posts, total number of comments, and a list of their recent posts and comments (with direct links to the content).

WHEN a member reports content, THE system SHALL create a report record linked to the member’s userId, target content ID, and reason (selected from dropdown), and SHALL notify the appropriate moderator or admin queue with the report.

WHILE a member is logged in, THE system SHALL preserve their session for up to 30 days of inactivity, after which THE system SHALL require re-authentication.

WHEN a member forgets their password, THE system SHALL allow a password reset via email verification and SHALL send a one-time use reset token via email.

WHEN a member changes their password, THE system SHALL invalidate all existing sessions and require re-authentication on all devices.

WHEN a member verifies their email address, THE system SHALL update their account status to "emailVerified: true" and SHALL unlock full posting privileges if previously restricted.

### Moderator (Community Administrator)

A moderator is a member who has been granted moderation privileges by an admin for specific communities. Moderators have no authority beyond the communities they are assigned to and do not have system-wide administrative powers.

WHERE a user is assigned as a moderator of a specific community, THE system SHALL grant them community-specific moderator permissions encoded in their JWT payload as { "moderatedCommunities": ["communityId1", "communityId2"] }.

WHEN a moderator attempts to delete a post within their moderated community, THE system SHALL remove the post from public view, mark it as "removed by moderator", and SHALL trigger an automated notification to the post author.

WHEN a moderator attempts to delete a comment within their moderated community, THE system SHALL remove the comment from public view, mark it as "removed by moderator", and SHALL trigger an automated notification to the comment author.

WHEN a moderator attempts to ban a user from a community they moderate, THE system SHALL add the banned user’s userId to a community-specific blocklist, and SHALL prevent the user from posting, commenting, or voting within that community, while allowing access to other communities.

WHEN a moderator attempts to approve content that is pending moderation, THE system SHALL set the post’s status to "published" and make it visible to all users.

WHEN a moderator attempts to edit the title or description of a community they moderate, THE system SHALL allow changes if they meet length and content policy criteria, and SHALL log the change for audit purposes.

WHEN a moderator attempts to view all reports for their moderated community, THE system SHALL display a dashboard of pending reports with content previews, reporter identity (if member), and action buttons for approve, remove, or dismiss.

WHEN a moderator attempts to ban a user from the entire platform, THE system SHALL deny the action and display a message: "You do not have system-wide ban permissions. Contact an administrator."

WHEN a moderator attempts to view all users on the platform, THE system SHALL display only users within their moderated communities.

WHILE a moderator is performing moderation actions, THE system SHALL log all actions to an audit trail with timestamp, moderator userId, community ID, target content ID, and action type.

### Admin (System Administrator)

An admin is a user with unrestricted system-wide authority. Admins are responsible for platform security, policy enforcement, legal compliance, and user management across all communities. No admin privileges can be delegated to non-admin users.

WHEN an admin logs in, THE system SHALL generate a JWT token with payload { "userId": "string", "role": "admin", "permissions": ["global_moderation", "user_management", "system_settings", "audit_access"] }.

WHEN an admin attempts to ban a user from the entire platform, THE system SHALL add the user’s userId to the global ban list, prevent all future authentication attempts from that account, and remove all associated content from public view.

WHEN an admin attempts to unban a user from the entire platform, THE system SHALL remove the user’s userId from the global ban list and restore their ability to log in, but SHALL NOT restore deleted content.

WHEN an admin attempts to promote a member to moderator of a community, THE system SHALL update the user’s JWT permissions to include the specific community ID in the moderatedCommunities list and SHALL notify the user via email.

WHEN an admin attempts to demote a moderator, THE system SHALL remove the community ID from the user’s moderatedCommunities list and SHALL revoke all moderation privileges for that community.

WHEN an admin attempts to view all users on the platform, THE system SHALL display a full list of all users with their roles, account status, registration date, and last login timestamp.

WHEN an admin attempts to view all communities on the platform, THE system SHALL display a list of all communities with subscriber counts, active post counts, content violation reports, and moderator assignments.

WHEN an admin attempts to view all reports across the platform, THE system SHALL display a comprehensive report dashboard with filters for type, community, status, and user.

WHEN an admin attempts to modify global system settings (e.g., content policy, upload size limits, karma decay rules), THE system SHALL require a secondary confirmation and SHALL log the change in an audit trail with admin identity and timestamp.

WHEN an admin attempts to view a user’s private data (email, IP history, etc.), THE system SHALL require a documented legal justification and SHALL log the access with audit trail.

WHILE an admin is performing any operation, THE system SHALL enforce mandatory session expiration after 15 minutes of inactivity and require re-authentication.

### Authentication Flow Requirements

The system uses JSON Web Tokens (JWT) for all authentication. All sessions must be stateless and validated server-side using a cryptographically signed JWT.

WHEN a user registers, THE system SHALL send a verification email with a unique, time-limited (24-hour) verification link containing a signed JWT token.

WHEN a user clicks a verification link, THE system SHALL validate the JWT token signature and expiration, THEN SHALL update the user’s record to "emailVerified: true", and SHALL destroy the verification token.

WHEN a user logs in with email and password, THE system SHALL verify credentials against the hashed password stored in the database, THEN SHALL generate an access token with a 30-minute expiration and a refresh token with a 30-day expiration.

WHEN a user’s access token expires, THE system SHALL accept a valid refresh token in exchange for a new 30-minute access token, provided the refresh token has not been revoked or expired.

WHEN a user requests a password reset, THE system SHALL generate a one-time use reset token with 1-hour expiration, send it via email, and SHALL invalidate the existing password.

WHEN a user changes their password, THE system SHALL invalidate all existing access and refresh tokens and require re-login on all devices.

WHEN a user logs out, THE system SHALL remove the access token from the client, but SHALL NOT invalidate the server-side refresh token to allow for silent re-authentication on device reuse.

WHEN a user revokes all sessions, THE system SHALL blacklist all active refresh tokens associated with the user and require full re-authentication.

### Permission Matrix

This matrix defines the exact permissions granted to each actor for each functional feature, based on the requirements above.

| Action | Guest | Member | Moderator | Admin |
|--------|-------|--------|-----------|-------|
| View public communities | ✅ | ✅ | ✅ | ✅ |
| View public posts | ✅ | ✅ | ✅ | ✅ |
| View user profiles | ✅ | ✅ | ✅ | ✅ |
| Register account | ✅ | ❌ | ❌ | ❌ |
| Log in | ✅ | ❌ | ❌ | ❌ |
| Log out | ✅ | ✅ | ✅ | ✅ |
| Create community | ❌ | ✅ | ❌ | ✅ |
| Edit community | ❌ | ❌ | ✅ (own communities only) | ✅ |
| Delete community | ❌ | ❌ | ❌ | ✅ |
| View comments on post | ✅ | ✅ | ✅ | ✅ |
| Create post | ❌ | ✅ | ✅ | ✅ |
| Edit own post | ❌ | ✅ (within 24h) | ✅ (within 24h) | ✅ |
| Delete own post | ❌ | ✅ | ✅ | ✅ |
| Report content | ✅ | ✅ | ✅ | ✅ |
| Upvote post | ❌ | ✅ | ✅ | ✅ |
| Downvote post | ❌ | ✅ | ✅ | ✅ |
| Create comment | ❌ | ✅ | ✅ | ✅ |
| Edit own comment | ❌ | ✅ (within 24h) | ✅ (within 24h) | ✅ |
| Delete own comment | ❌ | ✅ | ✅ | ✅ |
| Reply to comment | ❌ | ✅ | ✅ | ✅ |
| Subscribe to community | ❌ | ✅ | ✅ | ✅ |
| Unsubscribe from community | ❌ | ✅ | ✅ | ✅ |
| View own profile | ❌ | ✅ | ✅ | ✅ |
| View all users | ❌ | ❌ | ❌ (only in moderated communities) | ✅ |
| View all reports | ❌ | ❌ | ✅ (in own communities) | ✅ |
| Ban user from community | ❌ | ❌ | ✅ | ✅ |
| Ban user from platform | ❌ | ❌ | ❌ | ✅ |
| Approve pending content | ❌ | ❌ | ✅ (in own communities) | ✅ |
| Change global system settings | ❌ | ❌ | ❌ | ✅ |
| View system audit logs | ❌ | ❌ | ❌ | ✅ |
| View user IP/email history | ❌ | ❌ | ❌ | ✅ |
| Manage moderators | ❌ | ❌ | ❌ | ✅ |
| Send system-wide notifications | ❌ | ❌ | ❌ | ✅ |

#### JWT Payload Structure

The system relies on JWTs embedded in the Authorization header. Payload structure varies by actor type:

- **Guest**: No JWT. Public actions require no token. Anonymous reports may be stored with null userId.
- **Member**: `{ "userId": "string", "role": "member", "permissions": [] }`
- **Moderator**: `{ "userId": "string", "role": "member", "permissions": [], "moderatedCommunities": ["communityId1", "communityId2"] }`
- **Admin**: `{ "userId": "string", "role": "admin", "permissions": ["global_moderation", "user_management", "system_settings", "audit_access"] }`

All tokens must be signed with HS256 algorithm using a server-side secret key stored securely in environment variables. Access tokens have a 30-minute TTL. Refresh tokens have a 30-day TTL and may be revoked individually via a blacklist.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*