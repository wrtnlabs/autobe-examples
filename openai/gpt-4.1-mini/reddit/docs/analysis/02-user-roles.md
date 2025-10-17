# Overview of Authentication and Authorization

The redditCommunity platform implements a secure authentication and authorization system tailored for managing user access and permissions through clearly defined roles. This service supports registration, login, logout, password recovery, and session management using JWT tokens.

# User Role Definitions

## Guest
- Guests are unauthenticated users with read-only access to browse public communities and posts.
- Guests can access the registration and login page only.
- Guests cannot create posts, comment, vote, or subscribe.

## Member
- Members are registered and authenticated users with permissions to create posts, comment, vote, and subscribe to communities.
- Members can manage their own profiles.
- Members cannot moderate content or manage users.

## Community Moderator
- Community Moderators are members assigned as moderators for specific communities.
- They have permission to moderate posts and comments within their communities.
- They can handle reports and take action on inappropriate content in those communities.
- They cannot access global administrative functions.

## Admin
- Admins have full system access across all communities.
- They can manage users, communities, posts, comments, site-wide settings, and handle escalated reports.

# Authentication Flow Requirements

## Registration
- WHEN a guest submits a registration request with email and password, THE system SHALL validate the email format and password strength.
- WHEN a user registers, THE system SHALL check that the email is unique.
- IF the email is already registered, THEN THE system SHALL reject the registration with an error message.
- WHEN registration is successful, THE system SHALL create an inactive account and send a verification email.
- WHEN the user clicks on the verification link, THE system SHALL activate the account.
- UNVERIFIED users SHALL be prevented from creating posts or comments.

## Login
- WHEN a user submits login credentials, THE system SHALL verify them.
- IF credentials are incorrect, THEN THE system SHALL deny access and display an error.
- IF the user is unverified, THEN THE system SHALL deny access and prompt for email verification.
- WHEN login is successful, THE system SHALL create a JWT-based session.

## Logout
- WHEN a user logs out, THE system SHALL invalidate all associated sessions and tokens.

## Password Reset
- WHEN a user requests a password reset, THE system SHALL send a secure, time-limited reset link to the user's verified email.
- WHEN the user submits a new password via the reset link, THE system SHALL verify the link validity and update the password.

## Session Management
- THE system SHALL use JWT access tokens with a 15-minute expiration time.
- THE system SHALL use JWT refresh tokens with a 30-day expiration time.
- THE system SHALL automatically refresh access tokens using valid refresh tokens.
- THE system SHALL revoke all tokens upon password change, logout, or account deactivation.

# Token Management

- JWT tokens SHALL include claims for userId, role, and permissions pertinent to the user.
- Refresh tokens SHALL be stored securely and associated with user sessions.

# Permission Matrix

| Action                          | Guest | Member | Community Moderator | Admin |
|--------------------------------|-------|--------|---------------------|-------|
| View public communities/posts   | ✅    | ✅     | ✅                  | ✅    |
| Register and login              | ✅    | N/A    | N/A                 | N/A   |
| Create communities              | ❌    | ✅     | ✅ (only in assigned communities) | ✅    |
| Create posts                   | ❌    | ✅     | ✅                  | ✅    |
| Comment on posts               | ❌    | ✅     | ✅                  | ✅    |
| Vote on posts/comments         | ❌    | ✅     | ✅                  | ✅    |
| Subscribe to communities        | ❌    | ✅     | ✅                  | ✅    |
| Moderate posts and comments    | ❌    | ❌     | ✅ (only in assigned communities) | ✅    |
| Manage users                   | ❌    | ❌     | ❌                  | ✅    |
| Manage site-wide settings      | ❌    | ❌     | ❌                  | ✅    |
| Handle escalated reports       | ❌    | ❌     | ✅ (community reports), ✅ (admin level) | ✅    |

# Error and Security Considerations

- WHEN there are more than 5 failed login attempts within 10 minutes, THE system SHALL temporarily lock the user account for 15 minutes.
- THE system SHALL ensure passwords are stored securely using strong hashing algorithms.
- Email verification links SHALL expire after 72 hours.
- All authentication related errors SHALL provide clear messages within 2 seconds.

---

This report covers detailed business requirements for authentication and authorization features of redditCommunity. It ensures robust role management and secure access control, providing backend developers with clear, actionable specifications.