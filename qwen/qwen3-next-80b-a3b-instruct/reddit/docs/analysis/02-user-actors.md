## Authentication Flow Requirements

- WHEN a guest attempts to access a protected resource, THE system SHALL redirect them to the login page with a notice that authentication is required
- WHEN a user submits registration credentials, THE system SHALL validate email format, password length (minimum 8 characters), and uniqueness of email and username
- WHEN a user registers successfully, THE system SHALL send a verification email with a time-limited link and set the user status to 'unverified'
- WHEN a user clicks the verification link, THE system SHALL activate the account and set the user status to 'active'
- WHEN a user submits login credentials, THE system SHALL validate email or username and password against stored hash and return a JWT token if valid
- WHEN a user submits invalid login credentials, THE system SHALL return HTTP 401 with error code AUTH_INVALID_CREDENTIALS and increment failed attempt counter
- WHEN a user exceeds 5 failed login attempts within 15 minutes, THE system SHALL lock the account for 30 minutes and notify user via email
- WHEN a user requests password reset, THE system SHALL send a time-limited reset link via email and clear any existing reset tokens
- WHEN a user submits a valid reset token and new password, THE system SHALL update the password hash and invalidate all active sessions
- WHEN a user logs out, THE system SHALL delete the access token from client storage and keep refresh token valid until expiration
- WHEN a user uses a refresh token, THE system SHALL validate its signature, check expiration, and issue new access and refresh tokens
- WHEN a refresh token expires or is revoked, THE system SHALL require re-authentication
- WHEN a user changes password, THE system SHALL invalidate all existing sessions across all devices

## User Actor Structure

The system includes three distinct actor types with escalating permissions:

- Guest: Unauthenticated users browsing public content
- Member: Authenticated users creating and interacting with community content
- Admin: System operators with moderation and governance privileges

Each actor type represents a unique permission layer within the application

## Guest Actor Permissions

- WHEN a guest views any public community page, THE system SHALL display all posts and comments without filtering
- WHEN a guest attempts to create a post, THE system SHALL deny the request and redirect to login with a message: "You must be logged in to create posts."
- WHEN a guest attempts to comment on a post, THE system SHALL deny the request and redirect to login with a message: "You must be logged in to comment."
- WHEN a guest attempts to vote on a post or comment, THE system SHALL deny the request and redirect to login with a message: "You must be logged in to vote."
- WHEN a guest attempts to subscribe to a community, THE system SHALL deny the request and redirect to login with a message: "You must be logged in to subscribe to communities."
- WHEN a guest attempts to view a user profile, THE system SHALL display the profile and public activity without restriction
- WHEN a guest attempts to report content, THE system SHALL redirect to login page with message: "You must be logged in to report content."
- WHEN a guest attempts to create a community, THE system SHALL deny the request and redirect to login with message: "You must be logged in to create a community."
- IF a guest attempts to access any API endpoint requiring authentication, THE system SHALL return HTTP 401 Unauthorized

## Member Actor Permissions

- WHEN a member creates a post in a community, THE system SHALL allow submission of text, link, or image content with title and body fields
- WHEN a member votes on a post, THE system SHALL record the vote (up/down) and update the post's net score
- WHEN a member votes on a comment, THE system SHALL record the vote and update the comment's net score
- WHEN a member attempts to vote again on the same post, THE system SHALL update the existing vote (flip state) or remove the vote (if toggled off)
- WHEN a member attempts to vote on their own post or comment, THE system SHALL deny the vote and show message: "You cannot vote on your own content."
- WHEN a member writes a comment, THE system SHALL allow nested replies up to 5 levels deep
- WHEN a member replies to a comment, THE system SHALL create a relation to the parent comment in the database
- WHEN a member subscribes to a community, THE system SHALL add the community to their subscription list and increase their community count
- WHEN a member unsubscribes from a community, THE system SHALL remove the community from their subscription list
- WHEN a member posts content, THE system SHALL award +1 karma to their profile
- WHEN a member's post receives an upvote, THE system SHALL award +1 karma to their profile
- WHEN a member's comment receives an upvote, THE system SHALL award +1 karma to their profile
- WHEN a member's post receives a downvote, THE system SHALL deduct -1 karma from their profile
- WHEN a member's comment receives a downvote, THE system SHALL deduct -1 karma from their profile
- WHEN a member reports content, THE system SHALL submit a report to moderator queue with user ID, content ID, reason, and timestamp
- WHEN a member views their own profile, THE system SHALL display all their posts, comments, karma score, and subscribed communities
- WHEN a member views another user’s profile, THE system SHALL display their public posts, comments, karma score, and subscribed communities
- WHEN a member edits their own post, THE system SHALL allow editing within 24 hours of creation
- WHEN a member edits their own comment, THE system SHALL allow editing within 1 hour of creation
- WHEN a member attempts to edit content posted by another user, THE system SHALL deny the request
- WHEN a member attempts to delete their own post, THE system SHALL allow deletion with confirmation and mark content as "[Deleted]"
- WHEN a member attempts to delete their own comment, THE system SHALL allow deletion with confirmation and mark content as "[Deleted]"
- WHERE a user has karma score ≥ 100, THE system SHALL display a "Top Contributor" badge on their profile
- WHERE a user has karma score ≥ 1000, THE system SHALL display a "Community Leader" badge on their profile
- WHERE a user has karma score ≥ 5000, THE system SHALL display a "Veteran Member" badge on their profile

## Admin Actor Permissions

- WHILe active, THE system SHALL allow admin to access all moderation tools including post and comment review
- WHEN an admin removes a post, THE system SHALL mark the post as removed and notify the author with reason
- WHEN an admin removes a comment, THE system SHALL mark the comment as removed and notify the author with reason
- WHEN an admin bans a user, THE system SHALL invalidate all sessions, prevent future logins, and remove the user from all communities
- WHEN an admin un-bans a user, THE system SHALL restore login access and allow resubscription if applicable
- WHEN an admin promotes a user to moderator, THE system SHALL assign the "moderator" role on specified community with restricted admin powers
- WHEN an admin demotes a user from moderator, THE system SHALL remove moderator privileges from specified community
- WHEN an admin views any user’s profile, THE system SHALL display full data including IP history, deleted content, and reported activities
- WHEN an admin edits any post or comment, THE system SHALL override the original content and mark as "[Modified by Admin]"
- WHEN an admin pinns a post, THE system SHALL display the post as pinned at the top of the community feed
- WHEN an admin locks a post, THE system SHALL disable all further comments and votes
- WHEN an admin splits a community into two, THE system SHALL duplicate all content and assign new community administrators
- WHEN an admin merges two communities, THE system SHALL consolidate all posts, comments, and subscribers into one community, keeping the original name
- WHEN an admin edits any setting, THE system SHALL log the change with admin ID, timestamp, and action
- WHEN an admin views system-wide statistics, THE system SHALL display total users, active users, community count, posts per day, and report volume
- WHEN an admin reviews reports, THE system SHALL display all reports sorted by age and severity with bulk action options
- WHILe managing system-wide settings, THE system SHALL allow admin to change content policy, spam detection rules, moderation review queue limits

## JWT Token Structure

- Access token expiration: 20 minutes
- Refresh token expiration: 14 days
- Token type: JSON Web Token (JWT)
- Payload structure for all tokens:
  - "userId": unique identifier (UUID string)
  - "role": string value of actor type ("guest", "member", "admin")
  - "permissions": array of strings representing permissions granted to this actor
  - "iat": timestamp of token issuance (Unix epoch)
  - "exp": timestamp of token expiration (Unix epoch)
- For member and admin tokens:
  - "email": user’s verified email address
  - "username": user’s chosen display name
- For admin tokens:
  - "isSuperAdmin": boolean true
- JWT secret key must be stored in environment variable and never logged or hardcoded
- Refresh tokens must be stored in secure,httponly cookie with CSRF protection
- Access tokens must be stored in client-side localStorage
- All tokens must be signed using HS256 algorithm
- Token validation must reject expired, malformed, or unsigned tokens

## Permission Matrix

| Action | Guest | Member | Admin |
|--------|-------|--------|-------|
| Browse public posts | ✅ | ✅ | ✅ |
| View community lists | ✅ | ✅ | ✅ |
| View user profiles | ✅ | ✅ | ✅ |
| Register account | ✅ | ❌ | ❌ |
| Login to account | ✅ | ❌ | ❌ |
| View own profile | ❌ | ✅ | ✅ |
| View others’ profiles | ✅ | ✅ | ✅ |
| Create a community | ❌ | ✅ | ✅ |
| Post text/link/image | ❌ | ✅ | ✅ |
| Comment on posts | ❌ | ✅ | ✅ |
| Reply to comments | ❌ | ✅ | ✅ |
| Upvote a post | ❌ | ✅ | ✅ |
| Downvote a post | ❌ | ✅ | ✅ |
| Upvote a comment | ❌ | ✅ | ✅ |
| Downvote a comment | ❌ | ✅ | ✅ |
| Vote on own content | ❌ | ❌ | ❌ |
| Edit own post | ❌ | ✅ (24h) | ✅ |
| Edit own comment | ❌ | ✅ (1h) | ✅ |
| Edit others' content | ❌ | ❌ | ✅ |
| Delete own post | ❌ | ✅ | ✅ |
| Delete own comment | ❌ | ✅ | ✅ |
| Delete others' content | ❌ | ❌ | ✅ |
| Subscribe to community | ❌ | ✅ | ✅ |
| Unsubscribe from community | ❌ | ✅ | ✅ |
| Report content | ❌ | ✅ | ✅ |
| View reports | ❌ | ❌ | ✅ |
| Remove content | ❌ | ❌ | ✅ |
| Ban user | ❌ | ❌ | ✅ |
| Unblock user | ❌ | ❌ | ✅ |
| Promote to moderator | ❌ | ❌ | ✅ |
| Demote moderator | ❌ | ❌ | ✅ |
| Pin posts | ❌ | ❌ | ✅ |
| Lock posts | ❌ | ❌ | ✅ |
| Edit system settings | ❌ | ❌ | ✅ |
| Access moderation logs | ❌ | ❌ | ✅ |
| Generate system reports | ❌ | ❌ | ✅ |
| Access user IP data | ❌ | ❌ | ✅ |
| Receive notifications | ❌ | ✅ | ✅ |
| Earn karma | ❌ | ✅ | ✅ |
| View karma score | ✅ | ✅ | ✅ |
| Change password | ❌ | ✅ | ✅ |
| Reset password | ✅ | ✅ | ✅ |
| Logout | ✅ | ✅ | ✅ |
| Use refresh token | ❌ | ✅ | ✅ |
| View JWT scope | ❌ | ✅ | ✅ |
| View subscription list | ❌ | ✅ | ✅ |
| View post history | ❌ | ✅ | ✅ |
| View comment history | ❌ | ✅ | ✅ |