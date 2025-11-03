# User Actors and Authentication

## Overview

This document defines all user actor types who will interact with the community platform, their authentication requirements, and their specific permissions and access controls. The authentication system forms the security foundation of the platform, ensuring that users can securely access the system and that all actions are properly authorized based on user roles.

The platform implements a role-based access control (RBAC) system with three distinct actor types, each with specific capabilities and limitations. Authentication is managed through JWT (JSON Web Token) based sessions, providing secure and stateless authentication across the platform.

## User Actor Definitions

### Member Actor

**Role**: Authenticated community participants

**Description**: Members are authenticated users who form the primary user base of the platform. They can create and consume content, participate in discussions, vote on posts and comments, subscribe to communities, and earn karma based on community engagement. Members can also create their own communities, automatically becoming moderators of those communities.

**Core Capabilities**:
- Create and manage their own user profile
- Create new communities and become their moderator
- Subscribe to and unsubscribe from communities
- Create posts (text, link, image) in any community they have access to
- Comment on posts and reply to other comments
- Upvote and downvote posts and comments
- Edit and delete their own posts and comments
- Earn and accumulate karma from community engagement
- Report inappropriate content to moderators
- Search for communities, posts, and other users
- View content across the platform based on access permissions
- Customize feed based on subscribed communities

**Limitations**:
- Cannot moderate communities they did not create or were not assigned to
- Cannot remove other users' content (except as moderator of specific communities)
- Cannot ban users from the platform or communities (except as moderator of their own communities)
- Cannot access site-wide administrative functions
- Cannot override moderation decisions in communities they don't moderate

### Moderator Actor

**Role**: Community-level administrators

**Description**: Moderators are members who have elevated permissions within specific communities. A user becomes a moderator automatically when they create a community, or when assigned moderator status by existing moderators or site administrators. Moderator permissions are community-specific, meaning a moderator only has elevated privileges within the communities they manage.

**Core Capabilities** (within their designated communities):
- All capabilities of regular members
- Remove posts and comments that violate community rules
- Ban users from the community (community-level ban, not platform-wide)
- Unban users from the community
- Pin important posts to the top of the community
- Unpin posts
- Review and process content reports submitted by users
- Set and update community rules and guidelines
- Modify community description and settings
- Appoint additional moderators for their community
- Remove moderator status from other moderators (if they have appropriate seniority)
- View moderation queue for their community
- Access moderation logs and history

**Limitations**:
- Moderator powers are limited to specific communities only
- Cannot ban users from the entire platform (only from their communities)
- Cannot access other communities' moderation tools
- Cannot override site administrator decisions
- Cannot access platform-wide administrative dashboards
- Cannot modify system-wide settings or policies

**Important Note**: The same user can be a regular member in most communities while being a moderator in specific communities they manage. Permissions are contextual based on which community the user is interacting with.

### Site Administrator Actor

**Role**: Platform-wide administrators

**Description**: Site administrators have the highest level of permissions across the entire platform. They oversee all communities, manage site-wide policies, handle escalated moderation issues, and maintain the overall health and safety of the platform. Site administrators can perform any moderation action in any community and have access to administrative tools and dashboards.

**Core Capabilities**:
- All capabilities of members and moderators across all communities
- Ban users from the entire platform (platform-wide ban)
- Unban users from platform-wide bans
- Remove any content from any community
- Access all community moderation tools across the platform
- Review site-wide reported content from all communities
- Override community moderator decisions when necessary
- Remove moderator status from any user in any community
- Assign moderator status to users in any community
- Delete communities that violate platform policies
- Access administrative dashboards and analytics
- Manage system-wide settings and configurations
- View all moderation logs across all communities
- Handle escalated moderation issues
- Monitor platform health and user behavior patterns
- Enforce platform-wide terms of service and policies

**Limitations**:
- Must follow platform policies and legal requirements
- Actions should be transparent and documented for accountability
- Should escalate legal or critical safety issues appropriately

## Authentication Requirements

The platform implements comprehensive authentication functionality to ensure secure access and user identity management.

### User Registration

**Functional Requirements**:

**WHEN** a new user accesses the registration page, **THE system SHALL** display a registration form requesting email address, username, and password.

**WHEN** a user submits the registration form, **THE system SHALL** validate that the email address is in valid email format.

**WHEN** a user submits the registration form, **THE system SHALL** validate that the username is between 3 and 20 characters and contains only alphanumeric characters, underscores, and hyphens.

**WHEN** a user submits the registration form, **THE system SHALL** validate that the password is at least 8 characters long and contains at least one uppercase letter, one lowercase letter, one number, and one special character.

**WHEN** a user submits a registration form with an email address that already exists, **THE system SHALL** reject the registration and return an error message indicating the email is already registered.

**WHEN** a user submits a registration form with a username that already exists, **THE system SHALL** reject the registration and return an error message indicating the username is taken.

**WHEN** a user successfully completes registration, **THE system SHALL** create a new member account in an unverified state.

**WHEN** a user successfully completes registration, **THE system SHALL** send an email verification link to the provided email address.

**WHEN** a user clicks the email verification link, **THE system SHALL** verify the email address and activate the account for full access.

**WHEN** a user attempts to perform member actions without verifying their email, **THE system SHALL** deny access and prompt for email verification.

### User Login

**Functional Requirements**:

**WHEN** a user accesses the login page, **THE system SHALL** display a login form requesting email or username and password.

**WHEN** a user submits valid credentials, **THE system SHALL** authenticate the user and generate a JWT access token.

**WHEN** a user submits valid credentials, **THE system SHALL** generate a JWT refresh token for session renewal.

**WHEN** a user submits valid credentials, **THE system SHALL** return both access and refresh tokens to the client.

**WHEN** a user submits invalid credentials, **THE system SHALL** reject the login attempt and return an error message indicating invalid credentials without specifying which field is incorrect.

**WHEN** a user attempts to log in with an unverified email address, **THE system SHALL** allow login but restrict access to features requiring verified status.

**WHEN** a user successfully logs in, **THE system SHALL** record the login timestamp and session information.

**THE system SHALL** implement rate limiting to prevent brute force attacks, allowing maximum 5 failed login attempts per IP address within a 15-minute window.

**WHEN** rate limit is exceeded, **THE system SHALL** temporarily block login attempts from that IP address for 15 minutes.

### Session Management

**Functional Requirements**:

**WHEN** a user logs in successfully, **THE system SHALL** create a session with a JWT access token valid for 30 minutes.

**WHEN** a user logs in successfully, **THE system SHALL** create a refresh token valid for 30 days.

**THE** access token **SHALL** include the following claims: user ID, username, email, actor roles (member, moderator with community IDs, siteAdmin), token expiration timestamp, and token issue timestamp.

**THE** refresh token **SHALL** include the following claims: user ID, token expiration timestamp, and token issue timestamp.

**WHEN** an access token expires, **THE system SHALL** allow the user to obtain a new access token by presenting a valid refresh token.

**WHEN** a refresh token is used to obtain a new access token, **THE system SHALL** validate that the refresh token has not expired and has not been revoked.

**WHEN** a user logs out, **THE system SHALL** invalidate the current access token and refresh token.

**THE system SHALL** maintain a token revocation list to track invalidated tokens until their natural expiration.

**WHEN** a user changes their password, **THE system SHALL** invalidate all existing sessions and require re-authentication.

**WHEN** a site administrator bans a user, **THE system SHALL** immediately invalidate all of that user's active sessions.

### Password Management

**Functional Requirements**:

**WHEN** a user requests a password reset, **THE system SHALL** send a password reset link to the user's registered email address.

**THE** password reset link **SHALL** expire after 1 hour.

**WHEN** a user clicks a valid password reset link, **THE system SHALL** display a password reset form.

**WHEN** a user submits a new password through the reset form, **THE system SHALL** validate the password meets all security requirements.

**WHEN** a user successfully resets their password, **THE system SHALL** invalidate all existing sessions and require re-authentication.

**WHEN** an authenticated user wants to change their password, **THE system SHALL** require the current password for verification before allowing the change.

**WHEN** a user successfully changes their password, **THE system SHALL** send a confirmation email notifying them of the password change.

### Email Verification

**Functional Requirements**:

**WHEN** a user registers, **THE system SHALL** generate a unique email verification token valid for 24 hours.

**WHEN** a user clicks the email verification link, **THE system SHALL** validate the token and mark the email as verified.

**WHEN** a verification token expires, **THE system SHALL** allow the user to request a new verification email.

**WHEN** a user requests a new verification email, **THE system SHALL** invalidate any previous verification tokens and send a new link.

**THE system SHALL** allow users with unverified emails to log in but restrict certain actions (such as creating posts or communities) until verification is complete.

### Multi-Device Access

**Functional Requirements**:

**THE system SHALL** allow users to maintain active sessions on multiple devices simultaneously.

**WHEN** a user logs in on a new device, **THE system SHALL** maintain existing sessions on other devices.

**THE system SHALL** provide users with the ability to view all active sessions.

**WHEN** a user requests to revoke a specific session, **THE system SHALL** invalidate that session's tokens without affecting other sessions.

**WHEN** a user requests to revoke all sessions, **THE system SHALL** invalidate all tokens across all devices and require re-authentication everywhere.

## JWT Token Structure

### Access Token Payload

The access token contains the following information:

```
{
  "userId": "unique user identifier (UUID)",
  "username": "user's username",
  "email": "user's email address",
  "emailVerified": boolean indicating email verification status,
  "roles": {
    "member": true (always true for authenticated users),
    "moderator": [array of community IDs where user is moderator],
    "siteAdmin": boolean indicating site admin status
  },
  "iat": issued at timestamp,
  "exp": expiration timestamp (30 minutes from issue)
}
```

### Refresh Token Payload

The refresh token contains minimal information:

```
{
  "userId": "unique user identifier (UUID)",
  "tokenType": "refresh",
  "iat": issued at timestamp,
  "exp": expiration timestamp (30 days from issue)
}
```

### Token Security Requirements

**THE** access token **SHALL** be signed using HS256 (HMAC with SHA-256) algorithm with a secure secret key.

**THE** refresh token **SHALL** be signed using HS256 algorithm with a separate secure secret key.

**THE** secret keys **SHALL** be at least 256 bits (32 bytes) in length and stored securely in environment variables.

**THE system SHALL** validate token signatures on every request requiring authentication.

**WHEN** a token signature is invalid, **THE system SHALL** reject the request and return an authentication error.

**THE system SHALL** validate token expiration on every request.

**WHEN** a token is expired, **THE system SHALL** reject the request and return a token expiration error.

## Security Requirements

### Password Security

**THE system SHALL** hash all passwords using bcrypt with a cost factor of at least 12.

**THE system SHALL** never store passwords in plain text.

**THE system SHALL** never return password hashes in any API response.

**WHEN** comparing passwords during authentication, **THE system SHALL** use constant-time comparison to prevent timing attacks.

### Password Policy

**THE system SHALL** enforce the following password requirements:
- Minimum 8 characters in length
- Maximum 128 characters in length
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one digit (0-9)
- At least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)

**THE system SHALL** reject commonly used passwords (e.g., "Password123!", "Admin123!")

**THE system SHALL** prevent users from using their username or email as part of their password.

### Session Security

**THE** access token **SHALL** be transmitted only over HTTPS in production environments.

**THE system SHALL** include appropriate HTTP security headers (Content-Security-Policy, X-Frame-Options, X-Content-Type-Options).

**THE system SHALL** implement CORS (Cross-Origin Resource Sharing) policies to restrict access to authorized domains.

**WHEN** a suspicious login pattern is detected (e.g., login from unusual location), **THE system SHALL** send a notification email to the user.

## Permission Hierarchy

The permission hierarchy defines how actor roles relate to each other and inherit capabilities:

### Hierarchy Structure

```
Site Administrator (highest level)
    ↓ includes all permissions of
Moderator (community-specific)
    ↓ includes all permissions of
Member (base level)
    ↓ includes permissions of
Anonymous/Guest (read-only access)
```

### Permission Inheritance

**THE** Moderator actor **SHALL** have all permissions of a Member within their designated communities.

**THE** Site Administrator actor **SHALL** have all permissions of both Member and Moderator across all communities.

**THE** Member actor **SHALL** have all permissions of anonymous guests plus creation and interaction capabilities.

### Context-Specific Permissions

**Moderator permissions are context-dependent**:
- WHEN a moderator is interacting within a community they moderate, THE system SHALL grant moderator permissions
- WHEN the same user is interacting within a different community where they are not a moderator, THE system SHALL grant only member permissions
- THE system SHALL determine permission level based on the community context of the current action

**Example Scenario**:
- User "JohnDoe" creates and moderates community "r/photography"
- User "JohnDoe" subscribes to community "r/gaming" but is not a moderator there
- WHEN "JohnDoe" removes a post in "r/photography", THE system SHALL allow it (moderator permission)
- WHEN "JohnDoe" attempts to remove a post in "r/gaming", THE system SHALL deny it (only member permission in that community)

## Permission Matrix

This comprehensive matrix defines exactly what each actor type can and cannot do across all platform features.

### Legend
- ✅ = Permission granted
- ❌ = Permission denied
- 🔒 = Permission granted only in specific context (see notes)

| Action | Anonymous Guest | Member | Moderator | Site Admin |
|--------|----------------|---------|-----------|------------|
| **Account & Authentication** |
| View public content | ✅ | ✅ | ✅ | ✅ |
| Register new account | ✅ | ❌ | ❌ | ❌ |
| Login to account | ✅ | ✅ | ✅ | ✅ |
| Logout from account | ❌ | ✅ | ✅ | ✅ |
| Change own password | ❌ | ✅ | ✅ | ✅ |
| Reset forgotten password | ✅ | ✅ | ✅ | ✅ |
| Verify email address | ❌ | ✅ | ✅ | ✅ |
| View own profile | ❌ | ✅ | ✅ | ✅ |
| Edit own profile | ❌ | ✅ | ✅ | ✅ |
| Delete own account | ❌ | ✅ | ✅ | ✅ |
| View active sessions | ❌ | ✅ | ✅ | ✅ |
| Revoke sessions | ❌ | ✅ | ✅ | ✅ |
| **Community Management** |
| View public communities | ✅ | ✅ | ✅ | ✅ |
| Search communities | ✅ | ✅ | ✅ | ✅ |
| Create new community | ❌ | ✅ | ✅ | ✅ |
| Subscribe to community | ❌ | ✅ | ✅ | ✅ |
| Unsubscribe from community | ❌ | ✅ | ✅ | ✅ |
| Edit community settings | ❌ | 🔒 | 🔒 | ✅ |
| Delete community | ❌ | ❌ | ❌ | ✅ |
| Set community rules | ❌ | 🔒 | 🔒 | ✅ |
| Appoint moderators | ❌ | 🔒 | 🔒 | ✅ |
| Remove moderators | ❌ | 🔒 | 🔒 | ✅ |
| **Post Management** |
| View posts | ✅ | ✅ | ✅ | ✅ |
| Create text post | ❌ | ✅ | ✅ | ✅ |
| Create link post | ❌ | ✅ | ✅ | ✅ |
| Create image post | ❌ | ✅ | ✅ | ✅ |
| Edit own post | ❌ | ✅ | ✅ | ✅ |
| Delete own post | ❌ | ✅ | ✅ | ✅ |
| Remove other users' posts | ❌ | ❌ | 🔒 | ✅ |
| Pin post | ❌ | ❌ | 🔒 | ✅ |
| Unpin post | ❌ | ❌ | 🔒 | ✅ |
| **Comment Management** |
| View comments | ✅ | ✅ | ✅ | ✅ |
| Create comment | ❌ | ✅ | ✅ | ✅ |
| Reply to comment | ❌ | ✅ | ✅ | ✅ |
| Edit own comment | ❌ | ✅ | ✅ | ✅ |
| Delete own comment | ❌ | ✅ | ✅ | ✅ |
| Remove other users' comments | ❌ | ❌ | 🔒 | ✅ |
| **Voting & Karma** |
| View vote counts | ✅ | ✅ | ✅ | ✅ |
| Upvote post | ❌ | ✅ | ✅ | ✅ |
| Downvote post | ❌ | ✅ | ✌ | ✅ |
| Upvote comment | ❌ | ✅ | ✅ | ✅ |
| Downvote comment | ❌ | ✅ | ✅ | ✅ |
| Change own vote | ❌ | ✅ | ✅ | ✅ |
| Remove own vote | ❌ | ✅ | ✅ | ✅ |
| View user karma | ✅ | ✅ | ✅ | ✅ |
| Vote on own content | ❌ | ❌ | ❌ | ❌ |
| **Moderation & Reporting** |
| Report content | ❌ | ✅ | ✅ | ✅ |
| View moderation queue | ❌ | ❌ | 🔒 | ✅ |
| Review reports | ❌ | ❌ | 🔒 | ✅ |
| Dismiss reports | ❌ | ❌ | 🔒 | ✅ |
| Ban user from community | ❌ | ❌ | 🔒 | ✅ |
| Unban user from community | ❌ | ❌ | 🔒 | ✅ |
| Ban user from platform | ❌ | ❌ | ❌ | ✅ |
| Unban user from platform | ❌ | ❌ | ❌ | ✅ |
| View moderation logs | ❌ | ❌ | 🔒 | ✅ |
| Access admin dashboard | ❌ | ❌ | ❌ | ✅ |
| **User Interaction** |
| View user profiles | ✅ | ✅ | ✅ | ✅ |
| View user post history | ✅ | ✅ | ✅ | ✅ |
| View user comment history | ✅ | ✅ | ✅ | ✅ |
| Search users | ✅ | ✅ | ✅ | ✅ |
| **Feed & Discovery** |
| View home feed | ❌ | ✅ | ✅ | ✅ |
| View personalized feed | ❌ | ✅ | ✅ | ✅ |
| View all/popular feed | ✅ | ✅ | ✅ | ✅ |
| Search posts | ✅ | ✅ | ✅ | ✅ |
| Sort posts (hot/new/top/controversial) | ✅ | ✅ | ✅ | ✅ |
| View trending content | ✅ | ✅ | ✅ | ✅ |

### Permission Matrix Notes

**🔒 Context-Specific Permissions Explained**:

1. **Edit community settings** (Member/Moderator):
   - Members can edit settings ONLY for communities they created
   - Moderators can edit settings ONLY for communities they moderate
   - Site Admins can edit any community settings

2. **Set community rules** (Member/Moderator):
   - Members can set rules ONLY for communities they created
   - Moderators can set rules ONLY for communities they moderate
   - Site Admins can set rules for any community

3. **Appoint/Remove moderators** (Member/Moderator):
   - Members can appoint/remove moderators ONLY in communities they created
   - Moderators can appoint/remove moderators ONLY in communities they moderate (subject to seniority rules)
   - Site Admins can appoint/remove moderators in any community

4. **Remove posts/comments** (Moderator):
   - Moderators can remove content ONLY within communities they moderate
   - Site Admins can remove content in any community

5. **Pin/Unpin posts** (Moderator):
   - Moderators can pin/unpin posts ONLY within communities they moderate
   - Site Admins can pin/unpin posts in any community

6. **Ban/Unban from community** (Moderator):
   - Moderators can ban/unban users ONLY from communities they moderate
   - Site Admins can ban/unban users from any community

7. **View moderation queue/Review reports** (Moderator):
   - Moderators can view queues and reports ONLY for communities they moderate
   - Site Admins can view all queues and reports across the platform

## Access Control Enforcement

### Request Authentication

**WHEN** a user makes a request to a protected endpoint, **THE system SHALL** validate the JWT access token in the Authorization header.

**WHEN** the Authorization header is missing, **THE system SHALL** reject the request with HTTP 401 Unauthorized status.

**WHEN** the JWT token is invalid or expired, **THE system SHALL** reject the request with HTTP 401 Unauthorized status.

**WHEN** the JWT token is valid, **THE system SHALL** extract user information and roles from the token payload.

### Permission Validation

**WHEN** a user attempts to perform an action, **THE system SHALL** verify the user has the required permission based on their actor role.

**WHEN** the action is community-specific, **THE system SHALL** verify the user has the required permission in that specific community context.

**WHEN** a user lacks the required permission, **THE system SHALL** reject the request with HTTP 403 Forbidden status.

**WHEN** a moderator attempts a moderation action, **THE system SHALL** verify they are a moderator of the specific community involved.

**WHEN** a member attempts to perform a moderator action in a community they created, **THE system SHALL** grant the permission (as they are automatically a moderator of their own community).

### Community Context Enforcement

**THE system SHALL** determine the community context from the request (e.g., from the post ID, comment ID, or community ID in the request).

**WHEN** validating moderator permissions, **THE system SHALL** check if the user's moderator role includes the specific community ID.

**WHEN** a user is a moderator of community A but attempts a moderation action in community B, **THE system SHALL** deny the action.

**THE system SHALL** store the list of moderated community IDs in the JWT access token for efficient permission checking.

### Ban Enforcement

**WHEN** a user is banned from a specific community, **THE system SHALL** prevent them from creating posts or comments in that community.

**WHEN** a banned user attempts to interact with a community they are banned from, **THE system SHALL** return an error indicating they are banned from that community.

**WHEN** a user is banned from the entire platform, **THE system SHALL** immediately invalidate all their sessions and prevent login.

**WHEN** a platform-banned user attempts to log in, **THE system SHALL** return an error indicating their account is suspended.

**THE system SHALL** allow banned users to view content (read-only access) unless the ban specifically restricts viewing.

## Email Communication

**WHEN** a user registers, **THE system SHALL** send a welcome email with an email verification link.

**WHEN** a user requests a password reset, **THE system SHALL** send a password reset email with a secure reset link.

**WHEN** a user successfully resets their password, **THE system SHALL** send a confirmation email notifying them of the change.

**WHEN** a user changes their password while logged in, **THE system SHALL** send a confirmation email notifying them of the change.

**WHEN** a suspicious login is detected, **THE system SHALL** send a security alert email to the user.

**WHEN** a user is appointed as a moderator of a community, **THE system SHALL** send a notification email informing them of their new role.

**WHEN** a user's content is removed by a moderator, **THE system SHALL** send a notification email explaining the removal and relevant community rules.

**WHEN** a user is banned from a community or the platform, **THE system SHALL** send an email explaining the reason and duration of the ban.

**THE system SHALL** include an unsubscribe option in all non-critical emails (excluding security-related emails like password resets).

## Performance Requirements

**THE** authentication process **SHALL** complete within 2 seconds under normal load conditions.

**THE** JWT token validation process **SHALL** complete instantly (under 100 milliseconds) for each request.

**THE** system **SHALL** support at least 1,000 concurrent authentication requests without degradation.

**THE** token refresh process **SHALL** complete within 1 second.

**WHEN** a user's role changes (e.g., becomes a moderator), **THE system SHALL** reflect the change in the next token refresh (within 30 minutes maximum).

## Error Handling

**WHEN** authentication fails due to invalid credentials, **THE system SHALL** return error code AUTH_INVALID_CREDENTIALS with HTTP 401 status.

**WHEN** a JWT token is expired, **THE system SHALL** return error code AUTH_TOKEN_EXPIRED with HTTP 401 status.

**WHEN** a JWT token is invalid, **THE system SHALL** return error code AUTH_INVALID_TOKEN with HTTP 401 status.

**WHEN** a user lacks permission for an action, **THE system SHALL** return error code AUTH_FORBIDDEN with HTTP 403 status.

**WHEN** a user attempts to register with an existing email, **THE system SHALL** return error code AUTH_EMAIL_EXISTS with HTTP 409 status.

**WHEN** a user attempts to register with an existing username, **THE system SHALL** return error code AUTH_USERNAME_EXISTS with HTTP 409 status.

**WHEN** a password does not meet security requirements, **THE system SHALL** return error code AUTH_WEAK_PASSWORD with HTTP 400 status and details of requirements.

**WHEN** rate limiting is triggered, **THE system SHALL** return error code AUTH_RATE_LIMIT_EXCEEDED with HTTP 429 status.

**WHEN** an email verification token is expired, **THE system SHALL** return error code AUTH_VERIFICATION_EXPIRED with HTTP 400 status.

**WHEN** a user attempts to access a resource while banned, **THE system SHALL** return error code AUTH_USER_BANNED with HTTP 403 status.

All error responses must include a clear, user-friendly message explaining the issue and, when appropriate, guidance on how to resolve it.

## Data Privacy and Compliance

**THE system SHALL** never expose user email addresses publicly without explicit user consent.

**THE system SHALL** hash all passwords using bcrypt before storage and never store passwords in plain text.

**THE system SHALL** not log sensitive information such as passwords, tokens, or password reset links.

**WHEN** a user deletes their account, **THE system SHALL** anonymize or delete their personal information in compliance with data protection regulations.

**THE system SHALL** provide users with the ability to export their personal data upon request.

**THE system SHALL** implement appropriate data retention policies for security logs and audit trails.

## Summary

This document has defined the complete authentication and authorization system for the community platform, including:

- Three distinct actor types (Member, Moderator, Site Administrator) with clear role definitions
- Comprehensive authentication flows covering registration, login, session management, and password management
- JWT-based token architecture with secure access and refresh token mechanisms
- Context-aware permission system where moderator permissions are community-specific
- Detailed permission matrix showing exactly what each actor can and cannot do across all platform features
- Security requirements including password policies, token security, and session management
- Access control enforcement mechanisms to ensure permissions are properly validated

Backend developers should use this document as the authoritative reference for implementing user authentication, authorization, and access control throughout the platform. All permission checks must follow the permission matrix defined here, and all authentication flows must implement the security requirements specified.

For information about how these actors interact with specific features like communities, posts, comments, and moderation, please refer to the related feature-specific requirement documents.