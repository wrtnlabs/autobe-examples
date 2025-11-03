## User Actor Overview

This system defines exactly two distinct user actors: **citizen** and **moderator**. These roles represent the complete user hierarchy and are fundamental to the system's access control, content moderation, and behavioral expectations. No other user roles exist or are permitted. The distinction between these actors is enforced at the application layer through authentication and authorization mechanisms, ensuring that each actor can perform only the actions permitted by their role.

The design intentionally avoids complex role hierarchies, inheritance models, or dynamic permission systems. Permissions are explicitly defined, static, and binary: a user is either a citizen or a moderator. This simplicity ensures reliability, reduces attack surface, and matches the minimal scope of a discussion board.

## Citizen Actor Characteristics

A citizen is any authenticated user who participates in the discussion board by contributing content. Citizens are the primary consumers and creators of value on the platform. Their rights are limited to personal content creation and interaction, with no authority to modify content created by others.

- A citizen can create new discussion posts.
- A citizen can comment on any public post.
- A citizen can attach one or more images or files to their own posts or comments.
- A citizen can edit their own posts and comments for up to 24 hours after initial submission.
- A citizen can delete their own posts and comments at any time.
- A citizen can view all public posts and comments.
- A citizen cannot edit or delete content posted by other citizens.
- A citizen cannot view private moderation logs or user reports.
- A citizen cannot approve, reject, or edit content pending review.
- A citizen cannot permanently delete content created by others.
- A citizen cannot change their own actor role.

The citizen role is designed to promote open participation while protecting the integrity of the conversation. By restricting edit capabilities to a 24-hour window, the system prevents manipulation of the historical record while still allowing for correction of mistakes or typos. The ability to delete content empowers users to remove unwanted posts, but does not extend to removing others’ contributions.

## Moderator Actor Characteristics

A moderator is an elevated actor responsible for maintaining the quality, safety, and compliance of the discussion board. Moderators have access to tools that allow them to manage content and user behavior that violates community standards or platform rules.

- A moderator can view all posts and comments, including those pending review or deleted.
- A moderator can edit any post or comment, regardless of who created it.
- A moderator can delete any post or comment permanently.
- A moderator can approve or reject posts or comments flagged for review.
- A moderator can view user reports and override automated moderation flags.
- A moderator can temporarily lock or freeze a citizen’s posting privileges.
- A moderator can see the full history of edits and deletions to any content.
- A moderator cannot create posts or comments as a citizen.
- A moderator cannot delete other moderators.
- A moderator cannot change their own actor role.
- A moderator cannot create or manage administrative user accounts.

The moderator role is strictly operational and non-administrative. Moderators enforce rules but do not configure them. They manage content and user behavior, not system configuration or user creation. This separation prevents abuse of power and aligns with the platform's transparency goals.

A moderator may not edit or delete content unless it violates explicitly defined community guidelines. Even when possessing the technical ability to remove content, a moderator must act based on observable violations—not personal opinion.

## Authentication Requirements

Authentication for both actors relies on secure, stateless token-based sessions using JSON Web Tokens (JWT). There is no authentication system other than JWT.

- WHEN a citizen registers, THE system SHALL require a valid email address and a password of at least 8 characters.
- WHEN a user submits credentials for login, THE system SHALL validate them and generate a JWT access token if valid.
- WHEN a user logs out, THE system SHALL invalidate the session token immediately.
- WHILE a user is authenticated, THE system SHALL include a valid JWT in all subsequent requests.
- IF a JWT token is expired, malformed, or tampered with, THEN THE system SHALL reject the request with HTTP 401.
- WHERE a user has confirmed their email address, THE system SHALL enable full posting and commenting privileges.
- WHERE a user has not confirmed their email address, THE system SHALL allow login but block posting or commenting.
- IF a user attempts to access moderation functions without being a moderator, THEN THE system SHALL return HTTP 403 with error message "Unauthorized access: moderator privileges required."

Access tokens SHALL expire after 30 minutes. Refresh tokens SHALL be issued at login and SHALL expire after 7 days. Refresh tokens MUST be stored securely on the client (e.g., in localStorage or secure cookie), and MUST be sent only to the /auth/refresh endpoint. The JWT payload for every token MUST contain at minimum: userId (string), role (string: "citizen" or "moderator"), and iat (issued-at timestamp).

## Permission Matrix

The following table defines exactly what actions each actor can perform:

| Action | Citizen | Moderator |
|--------|---------|-----------|
| Register account | ✅ | ✅ |
| Log in | ✅ | ✅ |
| Log out | ✅ | ✅ |
| View public posts | ✅ | ✅ |
| Create new post | ✅ | ✅ (but treated as citizen unless explicitly intended) |
| Comment on a post | ✅ | ✅ |
| Attach images or files to post | ✅ | ✅ |
| Attach images or files to comment | ✅ | ✅ |
| Edit own post or comment | ✅ (within 24 hours) | ✅ (anytime) |
| Delete own post or comment | ✅ (anytime) | ✅ (anytime) |
| Edit any post or comment | ❌ | ✅ |
| Delete any post or comment | ❌ | ✅ |
| Approve/reject content | ❌ | ✅ |
| View user reports | ❌ | ✅ |
| Lock user posting privileges | ❌ | ✅ |
| Change role | ❌ | ❌ |
| Create new users | ❌ | ❌ |
| Access admin settings | ❌ | ❌ |

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*