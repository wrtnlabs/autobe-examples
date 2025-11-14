## User Actor Overview

This platform recognizes four distinct user actors, each with clearly defined roles, permissions, and responsibilities that govern their interaction with the system. These actors form the foundation of the authorization and access control architecture. Each actor's capabilities are strictly bounded to ensure system integrity, community moderation effectiveness, and user security. The actor hierarchy is designed to provide incremental levels of control, from anonymous browsing to full platform governance.

The actor system is not merely a classification of user types - it is a core business logic mechanism that determines what content users can create, modify, view, hide, or report. Permissions are enforced at every interaction point, and no user action can proceed without validating the actor type associated with the current session.

User actors are authenticated via JWT tokens issued at login. The JWT payload includes a role field that explicitly identifies the actor type, allowing every backend service to enforce access control without querying the database. This design ensures scalability and consistent authorization behavior across distributed microservices.

All user actors operate within a single unified system, and transitions between actor types occur only through explicit administrative actions, not through user self-service methods. For example, a member does not "promote" themselves to moderator; moderators are appointed by admins based on community needs.

## Guest (Unauthenticated User)

Guests are users who have not logged in and are visiting the platform anonymously. They represent all users who have not yet created an account or who have voluntarily logged out. Guests view the platform as a public information space where they can observe community activity without participating.

### Capabilities:
- WHEN a guest accesses the homepage, THE system SHALL display a list of all public communities with basic metadata (name, description, member count).
- WHEN a guest visits a community page, THE system SHALL display all published posts in that community, sorted according to the selected view (new, hot, top, controversial).
- WHEN a guest views a post, THE system SHALL display all comments and nested replies associated with that post.
- WHEN a guest clicks on a username, THE system SHALL display the user's public profile, including their post and comment history and karma score.
- WHEN a guest attempts to create a post, THE system SHALL deny the action and show a modal stating: "You must be logged in to create posts. Please register or log in."
- WHEN a guest attempts to upvote, downvote, or comment, THE system SHALL deny the action and show a modal stating: "You must be logged in to interact with posts and comments. Please register or log in."
- WHEN a guest attempts to subscribe to a community, THE system SHALL deny the action and show a modal stating: "You must be logged in to subscribe to communities. Please register or log in."
- WHEN a guest attempts to report content, THE system SHALL display the report button but deny the submission and show a modal stating: "You must be logged in to report content. Please register or log in."
- WHEN a guest navigates to a user profile page, THE system SHALL display the profile, including all public posts and comments, but hide any account details like join date or preference settings.

### Restrictions:
- THE system SHALL NOT display any "Subscribe", "Create Post", "Comment", "Upvote", or "Downvote" buttons to guests.
- THE system SHALL NOT allow guests to access the "My Profile" section or settings page.
- THE system SHALL NOT show login or registration buttons in navigation unless they are part of a public header on every page.
- THE system SHALL NOT store any persistent data (cookies or localStorage) related to guest activity except for temporary session tracking used to detect bot behavior (max 15 minutes).

### Technical Implications:
- All guest requests pass through the system without a JWT token.
- Backend services must validate the absence of authentication context for guest endpoints.
- Cache layers must handle guest requests separately from authenticated requests.
- Analytics tracking for guests must be anonymized and aggregated at the session level.

## Member (Authenticated Standard User)

Members are verified users who have completed the registration process and are logged in. Members represent the primary engaged user base of the platform - they create content, interact with others, build reputation, and participate in community governance. Members form the backbone of community life and are the target audience for all platform features.

### Capabilities:
- WHEN a member logs in, THE system SHALL grant access to all member-specific features and display a personalized dashboard.
- WHEN a member initiates registration, THE system SHALL require a unique email address and a password with minimum 8 characters.
- WHEN a member registers, THE system SHALL send a verification email to their registered email address with a time-limited link.
- WHEN a member clicks an email verification link, THE system SHALL mark their account as "verified" and activate their posting privileges.
- WHEN a member creates a post, THE system SHALL accept text, URL, or image uploads, with a maximum file size of 5 MB.
- WHEN a member creates a text post, THE system SHALL require content to be between 1 and 2,000 characters.
- WHEN a member creates a link post, THE system SHALL validate the URL format and allow optional title and description.
- WHEN a member creates an image post, THE system SHALL accept JPG, PNG, and GIF formats and generate a thumbnail.
- WHEN a member submits a post, THE system SHALL immediately make it visible in the target community with status "published".
- WHEN a member upvotes a post, THE system SHALL increment the post’s upvote count by 1, decrement downvote by 1 if previously downvoted, and add a user-specific vote to their history.
- WHEN a member downvotes a post, THE system SHALL increment the post’s downvote count by 1, decrement upvote by 1 if previously upvoted, and add a user-specific vote to their history.
- WHEN a member attempts to upvote or downvote their own post, THE system SHALL deny the action and show an error: "You cannot vote on your own content."
- WHEN a member comments on a post, THE system SHALL accept text content up to 500 characters.
- WHEN a member replies to a comment, THE system SHALL create a nested reply under the original comment with a maximum depth of 5 levels.
- WHEN a member submits a comment or reply, THE system SHALL immediately display it in the thread and increment the comment count on the post.
- WHEN a member unsubscribes from a community, THE system SHALL remove their subscription and stop showing that community in their "Subscribed" feed.
- WHEN a member subscribes to a community, THE system SHALL add that community to their subscription list and give them priority in the "Following" feed.
- WHEN a member views their own profile, THE system SHALL display all their public posts, comments, karma score, and subscriber count (if any).
- WHEN a member reports content, THE system SHALL open a report form with predefined categories (spam, harassment, misinformation, off-topic, adult content, other) and allow optional comments.

### Restrictions:
- THE system SHALL NOT allow members to create communities.
- THE system SHALL NOT allow members to delete or modify posts or comments created by other members.
- THE system SHALL NOT allow members to ban users from any community.
- THE system SHALL NOT allow members to moderate content in communities they do not own or manage.
- THE system SHALL NOT allow members to change community settings or configure community rules.
- THE system SHALL NOT allow members to view reports submitted by other users.
- THE system SHALL NOT allow members to perform account-level configurations like changing their role or resetting another user’s password.

### Business Logic Rules:
- WHILE a member’s account is unverified (pending email confirmation), THE system SHALL NOT allow them to post, comment, or vote.
- WHILE a member is under moderation review for reports, THE system SHALL temporarily restrict their posting and comment privileges.
- IF a member has been banned from a specific community, THE system SHALL prevent them from accessing that community’s content and posting privileges.
- IF a member has been suspended by an admin, THE system SHALL disable all account functionality and display a suspension notice.
- WHERE a member has received 3+ reports on their content within 24 hours, THE system SHALL tag their account for review by a moderator.

## Moderator (Community Administrator)

Moderators are trusted members appointed to oversee specific communities. They are elected or appointed by platform admins and serve as community curators, ensuring quality, safety, and adherence to community guidelines. Moderators have elevated privileges only within the communities they manage and do not have access to the broader platform.

### Capabilities:
- WHEN an admin assigns a member as moderator of a community, THE system SHALL grant that member moderator privileges for that specific community.
- WHEN a moderator deletes a post, THE system SHALL remove it from display, log the action in the audit trail, and notify the original poster with the reason (if provided).
- WHEN a moderator deletes a comment or reply, THE system SHALL remove it from display, log the action in the audit trail, and notify the commenter with the reason (if provided).
- WHEN a moderator flags a post as spam, THE system SHALL apply an automated downvote penalty and trigger a review queue for admins.
- WHEN a moderator flags a user for spam, THE system SHALL issue a 7-day temporary ban from the community.
- WHEN a moderator flags a user for harassment, THE system SHALL issue a 30-day temporary ban from the community.
- WHEN a moderator permanently bans a user from a community, THE system SHALL prevent that user from viewing or posting in that community and notify them with the reason.
- WHEN a moderator approves a pending community (before public launch), THE system SHALL make the community visible to all members and enable posting.
- WHEN a moderator edits community rules or description, THE system SHALL update the official community guidelines and notify all subscribers.
- WHEN a moderator receives a report on content, THE system SHALL notify them via dashboard alert and provide a report processing interface.
- WHEN a moderator resolves a report, THE system SHALL mark it as resolved, apply the appropriate action (delete, warn, ban), and notify the reporting user of the outcome.

### Restrictions:
- THE system SHALL NOT allow moderators to delete or ban users from other communities.
- THE system SHALL NOT allow moderators to delete posts or comments from admin-controlled communities.
- THE system SHALL NOT allow moderators to promote users to admin or moderator roles on other communities.
- THE system SHALL NOT allow moderators to change platform-wide settings, such as karma calculation rules or sorting algorithms.
- THE system SHALL NOT allow moderators to access other moderators' reports or moderation history.
- THE system SHALL NOT allow moderators to view the private information of users or their voting behavior in other communities.
- THE system SHALL NOT allow moderators to unban users permanently if the ban was issued by an admin.
- THE system SHALL NOT allow moderators to delete their own moderation history.

### Business Logic Rules:
- WHILE a moderator is managing a community, THE system SHALL require them to provide a reason for every moderation action.
- IF a moderator’s community has 10+ active reports daily for 3 consecutive days, THE system SHALL escalate a notification to admin.
- IF a moderator has not performed any moderation actions in 60 days, THE system SHALL mark their position as inactive and notify the admin.
- WHERE a community has no active moderator for 14 days, THE system SHALL temporarily freeze all posting privileges until a new moderator is assigned.
- WHERE a moderator violates community guidelines by misusing privileges, THE system SHALL revoke their moderator status and notify the admin.

## Admin (Platform Administrator)

Admins are the highest authority level on the platform. They are responsible for maintaining platform-wide integrity, overseeing moderator activity, enforcing the platform’s terms of service, and managing system-wide configuration. Admins have unrestricted access to all communities, users, and systems.

### Capabilities:
- WHEN an admin logs in, THE system SHALL display a global admin dashboard with system health metrics, moderation alerts, and user activity summaries.
- WHEN an admin bans a user, THE system SHALL permanently prevent that user from accessing any part of the platform and notify them of the violation grounds.
- WHEN an admin suspends a user, THE system SHALL disable account functionality for a specified duration (1 day to 30 days) and notify the user.
- WHEN an admin deletes a community, THE system SHALL archive all posts and comments, remove all subscribers, and notify all members of the community.
- WHEN an admin creates a new community, THE system SHALL initialize it with default settings and assign an initial moderator if specified.
- WHEN an admin assigns a moderator to a community, THE system SHALL grant the selected member moderator rights over that community.
- WHEN an admin revokes a moderator’s rights, THE system SHALL remove their moderation privileges and notify both user and community.
- WHEN an admin reviews a report, THE system SHALL access all previous reports and moderation history related to the reported user and content.
- WHEN an admin overrides a moderator’s decision, THE system SHALL restore or reinstate content removed by the moderator and notify both parties.
- WHEN an admin edits platform-wide rules, THE system SHALL update the Terms of Service and notify all users via banner and email.
- WHEN an admin modifies karma system parameters (e.g., point values, decay rates), THE system SHALL apply new logic retroactively to existing scores.
- WHEN an admin adjusts sorting algorithm parameters (e.g., hot weight, decay time), THE system SHALL recalculate all post rankings.
- WHEN an admin configures system settings (e.g., upload limits, comment depth), THE system SHALL apply changes system-wide and restart relevant services.
- WHEN an admin accesses any user profile, THE system SHALL display all private data, including IP logs, email addresses, and history of reports received.
- WHEN an admin accesses any post or comment, THE system SHALL see all flagged, hidden, or deleted content, regardless of moderator actions.

### Restrictions:
- THE system SHALL NOT allow admins to impersonate other users.
- THE system SHALL NOT allow admins to bypass audit logging – all admin actions are permanently recorded.
- THE system SHALL NOT allow admins to remove their own access or privileges.
- THE system SHALL NOT allow admins to delete or modify their own audit logs.
- THE system SHALL NOT allow admins to repurpose their own karma points (e.g., buy privileges).

### Business Logic Rules:
- WHERE an admin performs a deletion or ban, THE system SHALL require them to document the reason and attach supporting evidence.
- IF an admin is reported for misconduct, THE system SHALL initiate an automatic independent audit of their last 30 interactions.
- WHILE a global outage is occurring, THE system SHALL allow admin users to trigger emergency maintenance mode for the entire platform.
- IF a user reports an admin for misuse of power, THE system SHALL notify another admin (not the accused) and initiate escalation protocol.
- WHERE an admin performs an actionable modification (e.g., rollback, restore, ban), THE system SHALL send a confirmation notification to the affected user and log the admin’s IP address and device fingerprint.

## Authentication Flow Requirements

Authentication is mandatory for any interactive action beyond public browsing. The system uses JWT-based authentication with a two-token system for optimal security and usability.

### Core Authentication Functions:
- USERS can register with valid email address and password.
- USERS can log in using email and password credentials.
- USERS can log out, which revokes the active access token.
- USERS can verify their email address via a time-limited verification link.
- USERS can reset their password if forgotten.
- USERS can change their password while logged in.
- USERS can revoke all active sessions from all devices.
- USERS can view device activity history.
- USERS can view account activity timestamps.

### Session and Token Management:
- WHEN a user successfully logs in, THE system SHALL issue:
  - An access token (JWT) with expiration of 15 minutes.
  - A refresh token (secure cookie) with expiration of 7 days.
- WHEN the access token expires, THE system SHALL automatically use the refresh token to request a new access token.
- WHEN the refresh token expires or is revoked, THE system SHALL require the user to re-authenticate with email/password.
- WHEN a user logs out, THE system SHALL invalidate the refresh token server-side and delete it from client storage.
- WHEN a user revokes all sessions, THE system SHALL invalidate all active refresh tokens associated with their account.
- WHEN a user changes their password, THE system SHALL automatically revoke all active refresh tokens.
- WHEN a user resets their password, THE system SHALL invalidate all active refresh tokens.
- WHEN a user is banned or suspended, THE system SHALL invalidate all active tokens immediately.

### JWT Payload Requirements:
- The JWT access token payload MUST include:
  - "userId": string (unique user ID)
  - "role": string ("guest", "member", "moderator", "admin")
  - "verified": boolean (true/false)
  - "iat": number (issued at timestamp)
  - "exp": number (expiration timestamp)
- Refresh tokens are stored as HTTP-only, Secure, SameSite=Strict cookies and are never parsed on the client.
- The JWT secret key must be rotated every 90 days using a secure key management system.

## Permission Entity Matrix

| Action | Guest | Member | Moderator | Admin |
|--------|-------|--------|-----------|-------|
| Browse public communities | ✅ | ✅ | ✅ | ✅ |
| Browse public posts | ✅ | ✅ | ✅ | ✅ |
| Browse public comments | ✅ | ✅ | ✅ | ✅ |
| Create account | ✅ | ✅ | ✅ | ✅ |
| Verify email | ❌ | ✅ | ✅ | ✅ |
| Log in | ❌ | ✅ | ✅ | ✅ |
| Log out | ❌ | ✅ | ✅ | ✅ |
| Post text | ❌ | ✅ | ✅ | ✅ |
| Post link | ❌ | ✅ | ✅ | ✅ |
| Post image | ❌ | ✅ | ✅ | ✅ |
| Delete own post | ❌ | ✅ | ✅ | ✅ |
| Edit own post | ❌ | ✅ | ✅ | ✅ |
| Upvote post | ❌ | ✅ | ✅ | ✅ |
| Downvote post | ❌ | ✅ | ✅ | ✅ |
| Comment on post | ❌ | ✅ | ✅ | ✅ |
| Reply to comment | ❌ | ✅ | ✅ | ✅ |
| Subscribe to community | ❌ | ✅ | ✅ | ✅ |
| Unsubscribe from community | ❌ | ✅ | ✅ | ✅ |
| View own profile | ❌ | ✅ | ✅ | ✅ |
| View other users' public profile | ✅ | ✅ | ✅ | ✅ |
| Report content | ❌ | ✅ | ✅ | ✅ |
| Create community | ❌ | ❌ | ✅ | ✅ |
| Delete community | ❌ | ❌ | ❌ | ✅ |
| Approve pending community | ❌ | ❌ | ✅ | ✅ |
| Moderate posts in own community | ❌ | ❌ | ✅ | ✅ |
| Moderate comments in own community | ❌ | ❌ | ✅ | ✅ |
| Ban user from own community | ❌ | ❌ | ✅ | ✅ |
| Ban user from platform | ❌ | ❌ | ❌ | ✅ |
| Suspend user globally | ❌ | ❌ | ❌ | ✅ |
| Delete any post | ❌ | ❌ | ❌ | ✅ |
| Delete any comment | ❌ | ❌ | ❌ | ✅ |
| Edit platform rules | ❌ | ❌ | ❌ | ✅ |
| View all user data | ❌ | ❌ | ❌ | ✅ |
| View all reports | ❌ | ❌ | ❌ | ✅ |
| Manage other moderators | ❌ | ❌ | ❌ | ✅ |
| Set karma system rules | ❌ | ❌ | ❌ | ✅ |
| Adjust sorting algorithm weights | ❌ | ❌ | ❌ | ✅ |
| Edit global system settings | ❌ | ❌ | ❌ | ✅ |
| Access audit logs | ❌ | ❌ | ❌ | ✅ |
| Revoke others' sessions | ❌ | ❌ | ❌ | ✅ |
| Console login | ❌ | ❌ | ❌ | ✅ |