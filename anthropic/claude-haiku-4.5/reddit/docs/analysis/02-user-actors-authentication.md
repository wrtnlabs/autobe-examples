# User Actors and Authentication System

## 1. Authentication System Overview

### 1.1 System Purpose & Architecture

The Community Platform implements a role-based access control (RBAC) system with four distinct user actor types, each with clearly defined permissions and capabilities. The authentication system uses JWT (JSON Web Tokens) for stateless session management, enabling secure and scalable user management across the platform.

### 1.2 Authentication Architecture Principles

The platform operates on these core security principles:

- **Role-Based Access Control**: Every user belongs to exactly one actor type at the platform level, with additional community-specific roles possible for moderators
- **Stateless Authentication**: JWT tokens eliminate server-side session storage, enabling horizontal scalability
- **Zero Trust for Guests**: Unauthenticated users (guests) receive minimal permissions; platform assumes no user credentials until verified
- **Permission Escalation**: Higher-tier actors inherit capabilities of lower tiers plus additional elevated permissions
- **Explicit Authorization**: All permission checks are affirmative (explicitly granted) rather than default-allow

### 1.3 Security Governance

WHEN authentication is performed, THE system SHALL enforce HTTPS/TLS encryption for all credential transmission.

IF a user provides invalid credentials, THEN THE system SHALL not reveal whether the email exists in the system (prevent account enumeration attacks).

WHEN a user account is created, THE system SHALL hash passwords using industry-standard algorithms (bcrypt or equivalent with minimum 12 salt rounds) before storage.

WHEN authentication fails, THE system SHALL log the failure attempt with timestamp, user email, and IP address for security monitoring.

IF a user's account is suspended or deleted, THEN THE system SHALL invalidate all existing authentication tokens immediately and prevent all platform access.

---

## 2. User Actor Definitions

### 2.1 Guest Actor (Unauthenticated User)

**Definition**: A user who has not authenticated with the platform and therefore has not logged in or created an account.

**Access Level**: Public read-only

**Typical Use Cases**:
- Initial platform discovery and exploration
- Browsing public communities without login
- Viewing published posts and comments
- Reading user profiles
- Deciding whether to register for an account

**Key Characteristics**:
- No account credentials required
- No email or personal information stored
- Session is anonymous
- Can access registration and login endpoints
- All requests treated as unauthenticated

**Guest Capabilities**:
- Browse public communities (view community name, description, member count)
- View published posts from public communities
- View comments on published posts
- View user profiles with public information (username, karma, post history)
- Access the login and registration pages
- Search for communities and users (basic directory functions)
- Read community rules and guidelines

**Guest Restrictions**:
- Cannot create posts or comments
- Cannot upvote or downvote content
- Cannot subscribe to communities
- Cannot access personalized feeds or profiles
- Cannot report content
- Cannot view non-public community information
- Cannot perform any write operations
- Cannot access saved/bookmarked content
- Cannot receive notifications
- Cannot access private communities or hidden posts

### 2.2 Member Actor (Regular Authenticated User)

**Definition**: A user who has successfully created an account and authenticated with valid credentials.

**Access Level**: Full user participation with content creation and engagement capabilities

**Typical Use Cases**:
- Creating posts to share content with communities
- Commenting on posts and engaging in discussions
- Voting on posts and comments
- Subscribing to communities of interest
- Managing personal profile and preferences
- Reporting inappropriate content
- Maintaining profile and activity history

**Key Characteristics**:
- Has created an account with verified email
- Must maintain valid JWT token for all operations
- Has globally unique username
- Accumulates karma through community engagement
- Can participate in any public community
- Can be restricted by community moderators or platform admins
- Can maintain saved/bookmarked content
- Can receive notifications about activity

**Member Capabilities**:
- Create posts (text, links, images) in subscribed communities
- Edit own posts within 24 hours of creation
- Delete own posts (soft delete with preservation)
- Create comments on posts
- Edit own comments within 24 hours of creation
- Delete own comments (soft delete)
- Upvote posts and comments
- Downvote posts and comments
- Subscribe to communities
- Unsubscribe from communities
- View personalized feed of subscribed communities
- View own user profile and other user profiles
- Update profile information (bio, avatar, preferences)
- View personal post and comment history
- View personal karma score and badges
- Report inappropriate posts/comments
- Reply to comments (nested discussion participation)
- Receive notifications for replies to their content
- View community rules and guidelines
- Access personalized recommendations
- Save/bookmark posts and comments
- Create custom collections of saved content
- Block and mute other users
- Follow other members (optional feature)

**Member Restrictions**:
- Cannot moderate communities they do not manage
- Cannot remove other users' content
- Cannot ban or restrict other users
- Cannot modify community settings
- Cannot access platform admin functions
- Cannot view moderation logs or reported content (except their own reports)
- Cannot view other users' private information
- Cannot perform bulk operations on content
- Cannot bypass community rules or restrictions
- Cannot impersonate other users
- Cannot access deleted/removed content except their own

### 2.3 Community Moderator Actor (Elevated Permissions)

**Definition**: A member who has been assigned moderation responsibilities for one or more specific communities.

**Access Level**: Administrative control within assigned communities only

**Typical Use Cases**:
- Removing posts that violate community rules
- Removing comments that are inappropriate
- Banning users who repeatedly violate rules
- Setting and updating community rules and guidelines
- Pinning important posts
- Reviewing reported content within their community
- Managing community settings and appearance
- Taking preventive action against spam or abuse
- Approving posts when community requires moderation

**Key Characteristics**:
- Must be a member (has account and email verification)
- Has moderator status assigned by platform admin or community creator
- Moderator status is per-community (can moderate multiple communities)
- Retains all member capabilities
- Gains additional community-level administrative capabilities
- Responsible for maintaining community standards
- Accountable for moderation decisions and consistency

**Community Moderator Capabilities** (In Addition to Member Capabilities):
- Remove posts from their communities (with reason logging)
- Remove comments from their communities (with reason logging)
- Ban users from their communities (with duration and appeal mechanism)
- Unban users from their communities
- Issue warnings to community members
- Set and edit community rules
- View reported content within their communities
- Take action on reported posts/comments
- Pin important posts to community page
- Unpin posts
- Lock posts (prevent new comments)
- Assign flair/tags to posts
- View community moderation logs
- Create community announcements
- Modify community settings (description, rules, privacy settings)
- Designate other moderators for their communities
- Remove moderator status from other moderators
- View community member list
- View community statistics and activity metrics
- Schedule posts in their communities
- Mute users temporarily (24-72 hours)
- Approve posts in moderation queue (if enabled)
- Configure automod rules (content filtering)

**Community Moderator Restrictions**:
- Can only perform moderator actions within communities they moderate
- Cannot access platform admin functions
- Cannot view or modify global platform settings
- Cannot moderate other communities
- Cannot overrule platform admin decisions
- Cannot view global moderation dashboard
- Cannot access other communities' moderation logs
- Cannot perform user ban appeals or reversals (platform admin only)
- Cannot force-delete member accounts
- Cannot override permanent bans (platform admin only)
- Cannot access admin analytics or system configuration

### 2.4 Platform Admin Actor (System-Level Administrator)

**Definition**: A system administrator with comprehensive access to all platform functions and user management capabilities.

**Access Level**: Complete system control

**Typical Use Cases**:
- Managing all user accounts across the platform
- Moderating system-wide policy enforcement
- Reviewing high-priority reported content
- Managing platform communities and moderators
- Handling user account issues and appeals
- Monitoring system health and performance
- Implementing global policies and settings
- Auditing platform activity and compliance
- Investigating security incidents
- Managing third-party integrations

**Key Characteristics**:
- Must be explicitly assigned by system initialization or existing admin
- Has member-level access plus all administrative privileges
- Highest privilege level on the platform
- Can override any user or moderator action
- Responsible for system integrity and policy enforcement
- Can audit all user and moderator actions
- Maintains complete control over platform configuration

**Platform Admin Capabilities** (In Addition to Member Capabilities):
- Access comprehensive admin dashboard
- View and manage all user accounts
- Suspend or delete user accounts
- Reset user passwords
- View all reported content across communities
- Take action on all reported posts and comments
- Override community moderator decisions
- Create, edit, or delete communities
- Assign or revoke moderator status
- Access complete moderation logs across all communities
- View platform-wide statistics and analytics
- Access audit logs of all user actions
- Configure global platform settings
- Manage platform policies and guidelines
- Handle user disputes and appeals
- Monitor system performance and resource usage
- Access database backups and recovery functions
- Implement emergency measures (disable features, restrict users)
- View user data and personal information (for legitimate admin purposes)
- Generate compliance reports
- Test platform features and functionality
- Configure email templates and notifications
- Manage content moderation filters
- Access API management console
- Perform system maintenance and updates
- Manage backup and disaster recovery
- Configure security policies and settings
- Manage third-party integrations
- Generate financial and usage reports
- Export platform data for analysis

**Platform Admin Restrictions**:
- Cannot access user passwords (hashed storage prevents this)
- Cannot access private messages without explicit legal authority
- Should follow principle of least privilege when performing actions
- Must log all admin actions for audit purposes
- Cannot access other admin's administrative logs (separation of concerns)

---

## 3. Actor Hierarchy and Permission Levels

### 3.1 Permission Inheritance Model

The Community Platform uses a clear permission hierarchy where each level inherits capabilities from lower levels and adds elevated permissions:

```
Platform Admin (Level 4)
    ↓ Inherits from Level 3
Community Moderator (Level 3)
    ↓ Inherits from Level 2
Member (Level 2)
    ↓ Inherits from Level 1
Guest (Level 1)
```

### 3.2 Permission Matrix by Feature Category

| Permission Domain | Guest | Member | Moderator | Admin |
|---|---|---|---|---|
| **Content Access** | View public posts | Create/edit/delete own content | + Remove others' content | + Override any action |
| **Community Access** | Browse public | Subscribe/unsubscribe | Manage assigned communities | Manage all communities |
| **User Management** | None | Manage own account | Ban users in communities | Manage all users |
| **Voting** | None | Upvote/downvote | + Vote without restrictions | + Vote without restrictions |
| **Moderation** | None | Report content | Review/action on reports | Review all reports |
| **Admin Functions** | None | None | Community-level admin | Full platform admin |
| **Content Visibility** | Public posts only | All accessible posts | All posts in communities | All posts including deleted |
| **User Data Access** | Public profiles only | Own data + followed users | Community member data | All user data |
| **Reporting** | None | Report content | View community reports | View all reports |
| **Settings** | None | Own preferences only | Community settings | All platform settings |

### 3.3 Permission Delegation and Escalation

Community moderators are designated by platform admins and gain moderation rights within specific communities. Moderators cannot delegate their authority to other users; only platform admins can assign new moderators.

WHEN a member is promoted to community moderator, THE system SHALL add community moderator role without removing member status or capabilities.

WHEN a community moderator is revoked of moderator status, THE system SHALL remove moderator role while retaining member status and all member capabilities.

IF a member attempts to perform an action outside their actor type permissions, THEN THE system SHALL deny the action and return HTTP 403 Forbidden with descriptive error message.

---

## 4. Authentication Flow Requirements

### 4.1 User Registration Flow

**Flow**: New user creates account for first time

WHEN a guest attempts to register with email and password, THE system SHALL validate email format and password requirements before account creation.

WHEN an email address is already registered in the system, THE system SHALL return an error message without revealing that the email exists in the system.

WHEN registration credentials are valid, THE system SHALL create a new user account with member-level permissions and send a verification email.

WHEN the user confirms email verification by clicking the link, THE system SHALL activate the account and allow login.

IF the user does not verify email within 7 days, THEN THE system SHALL mark the account as inactive and prevent login attempts.

**Step-by-Step User Registration Process**:
1. User navigates to registration page
2. User enters email address
3. System validates email format (standard email validation per RFC 5322)
4. User enters desired username (3-20 alphanumeric characters)
5. System validates username format and checks uniqueness
6. User enters password
7. System validates password meets requirements (minimum 8 characters, uppercase, lowercase, number, special character)
8. User confirms password
9. System validates both passwords match exactly
10. User submits registration form
11. System checks for spam/abuse patterns
12. System creates account with member status
13. System hashes password using bcrypt (cost factor 12+)
14. System sends verification email to provided address
15. User receives email with unique verification link
16. User clicks verification link within 7 days
17. System validates token is unexpired and valid
18. System marks email as verified
19. User receives confirmation message
20. User can now log in with email and password

**Registration Validation Rules**:
- Email address must be valid and unique in system
- Username must be 3-20 characters, alphanumeric plus underscores, unique
- Password must be minimum 8 characters with: 1 uppercase, 1 lowercase, 1 number, 1 special character
- Verification email must be sent and must be successfully delivered
- Account creation timestamp recorded in UTC
- Initial karma score is 10 (allowing all users to participate)
- No duplicate registrations from same email address within 24 hours

### 4.2 User Login Flow

**Flow**: Existing user authenticates and begins session

WHEN a member provides valid email and password, THE system SHALL validate credentials and issue a JWT access token and refresh token.

WHEN a member provides invalid credentials, THE system SHALL return generic authentication failure message without revealing whether account or password is wrong.

WHEN login is successful, THE system SHALL record login timestamp and grant session access with both tokens.

WHEN a member attempts login more than 5 times with invalid credentials within 15 minutes, THE system SHALL lock the account temporarily for 30 minutes.

**Step-by-Step Login Process**:
1. User navigates to login page
2. User enters email address
3. User enters password
4. User submits login form
5. System retrieves user account by email
6. System compares provided password against stored hash using bcrypt
7. If credentials invalid, increment failed attempts counter for account
8. If failed attempts exceed 5 within 15 minutes, lock account and skip to step 15
9. If credentials valid and account not locked, proceed to step 10
10. System verifies email is confirmed before granting access
11. System generates JWT access token (15-minute expiration)
12. System generates JWT refresh token (7-day expiration)
13. System records successful login timestamp and IP address
14. System resets failed login attempts counter to zero
15. System returns both tokens to user
16. User stores tokens securely (httpOnly cookie preferred)
17. User is redirected to authenticated dashboard/feed
18. User can now make authenticated requests using access token

**Login Validation Rules**:
- Email address must be verified before login allowed
- Account must not be suspended or banned
- Account must not be deleted
- Password must match stored hash
- Account lockout after 5 failed attempts within 15 minutes (30-minute cooldown)
- Login timestamp must be recorded for audit trail
- Failed login attempts must be tracked per account, not per IP (to prevent denial of service against accounts)

### 4.3 JWT Token Structure & Payload

**Access Token**:
- Expiration: 15 minutes from issuance
- Payload contains:
  - User ID (unique identifier)
  - Username (for display purposes)
  - Email address (hashed or encrypted, for verification)
  - Actor type (guest, member, communityModerator, platformAdmin)
  - List of moderated community IDs (if applicable, null for non-moderators)
  - Token issue timestamp (iat claim)
  - Token expiration timestamp (exp claim)
  - Token subject (sub claim) = user ID
  - Issuer identifier (iss claim) = platform domain
  - JWT ID (jti claim) = unique token identifier for blacklisting

**Refresh Token**:
- Expiration: 7 days from issuance
- Payload contains:
  - User ID (unique identifier)
  - Token issue timestamp (iat claim)
  - Token expiration timestamp (exp claim)
  - Token type identifier (tokenType = "refresh")
  - Subject (sub claim) = user ID
  - Issuer (iss claim) = platform domain
  - JWT ID (jti claim) = unique token identifier

**Token Signing & Security**:
- Access tokens signed using HS256 or RS256 algorithm
- Refresh tokens signed using same algorithm
- Token signing key must be at least 256 bits
- Token verification must validate signature before accepting token
- Token must not be modified after signing (signature verification ensures integrity)

**Token Storage Strategy**:
- Tokens should be stored securely (httpOnly cookies recommended for web browsers)
- httpOnly attribute prevents access from JavaScript (protects against XSS)
- Secure attribute ensures transmission only over HTTPS
- SameSite=Strict attribute prevents CSRF attacks
- localStorage can be used as fallback but is less secure
- Tokens should never be stored in URL parameters or query strings
- Tokens transmitted via Authorization header: `Authorization: Bearer <token>`

### 4.4 Session Management

WHEN an authenticated user makes a request with valid access token, THE system SHALL process request with user's permissions and role.

WHEN an access token expires, THE system SHALL return HTTP 401 Unauthorized with message "Token expired".

WHEN user provides valid refresh token, THE system SHALL validate the refresh token and issue new access token with updated expiration.

WHEN refresh token expires or is revoked, THE system SHALL require user to log in again and return HTTP 401 Unauthorized.

WHEN user clicks logout, THE system SHALL invalidate both access and refresh tokens immediately and end session.

**Session Lifecycle**:
- Access token valid for 15 minutes of issuance time
- User remains logged in as long as they refresh access token before expiration
- Refresh token valid for 7 days from issuance
- If user inactive beyond refresh token expiration, must login again
- User can logout explicitly to immediately invalidate tokens
- System can force logout by revoking all user tokens (admin action)
- Multiple concurrent sessions per user allowed (different devices/browsers)
- Session data stored in distributed cache (Redis) for scalability

### 4.5 Password Reset Flow

WHEN a member requests password reset, THE system SHALL send reset link to verified email address only.

WHEN user clicks reset link within 1 hour, THE system SHALL allow password change without current password verification.

IF reset link expires after 1 hour, THEN THE system SHALL require user to request reset again.

WHEN new password is confirmed, THE system SHALL hash and store new password, invalidate all existing tokens, and force re-login.

**Password Reset Process**:
1. User clicks "Forgot Password" on login page
2. User enters email address
3. System verifies email exists in system
4. System generates cryptographically secure reset token (32 bytes minimum)
5. System sets token expiration to 1 hour from current time
6. System stores token hash in database (not plain token)
7. System sends email with reset link containing token
8. User receives email with reset link
9. User clicks link and is taken to password reset page
10. System validates token is unexpired, valid, and unused
11. System displays password reset form
12. User enters new password (same validation rules as registration)
13. User confirms new password
14. System validates both passwords match
15. System hashes new password and stores in database
16. System marks reset token as used (invalidates for future use)
17. System revokes all existing tokens for this user
18. System sends confirmation email about password change
19. User is redirected to login page
20. User logs in with new password

**Password Reset Security Rules**:
- Reset token valid for exactly 1 hour (not extensible)
- Reset tokens single-use only (mark as used after one successful use)
- Reset link includes user ID and token hash
- Email verification required (cannot reset for unverified emails)
- New password must meet same requirements as registration
- All previous session tokens invalidated
- Confirmation email sent about password change (user can check if unauthorized)

### 4.6 Email Verification

WHEN user account is created, THE system SHALL send verification email to provided address.

WHEN user clicks verification link within 7 days, THE system SHALL mark email as verified and activate account.

IF email is not verified within 7 days, THEN THE system SHALL prevent login and mark account inactive.

WHEN user requests email verification resend, THE system SHALL generate new token and send new email.

**Email Verification Lifecycle**:
- Verification email sent immediately upon registration
- Verification link valid for 7 days
- Unverified accounts can only access registration area
- Verified email required before posting, voting, or commenting
- If account inactive beyond 7 days without verification, becomes eligible for cleanup
- Email change requires re-verification of new address
- Resend limit: maximum 5 verification emails within 24 hours (prevent spam)
- Verification tokens single-use (cannot reuse old verification links)

---

## 5. Permission Matrix by Feature

### Complete Permission Matrix

| Feature/Operation | Guest | Member | Community Moderator | Platform Admin |
|---|---|---|---|---|
| **POST OPERATIONS** | | | | |
| Browse public posts | ✅ | ✅ | ✅ | ✅ |
| View post details | ✅ | ✅ | ✅ | ✅ |
| Create post in community | ❌ | ✅ | ✅ | ✅ |
| Edit own post (24h window) | ❌ | ✅ | ✅ | ✅ |
| Delete own post | ❌ | ✅ | ✅ | ✅ |
| Remove other member's post | ❌ | ❌ | ✅ (own communities) | ✅ |
| Pin post | ❌ | ❌ | ✅ (own communities) | ✅ |
| Lock post (no new comments) | ❌ | ❌ | ✅ (own communities) | ✅ |
| **COMMENT OPERATIONS** | | | | |
| View comments | ✅ | ✅ | ✅ | ✅ |
| Create comment | ❌ | ✅ | ✅ | ✅ |
| Edit own comment (24h window) | ❌ | ✅ | ✅ | ✅ |
| Delete own comment | ❌ | ✅ | ✅ | ✅ |
| Remove other member's comment | ❌ | ❌ | ✅ (own communities) | ✅ |
| **VOTING OPERATIONS** | | | | |
| View vote counts | ✅ | ✅ | ✅ | ✅ |
| Upvote post/comment | ❌ | ✅ | ✅ | ✅ |
| Downvote post/comment | ❌ | ✅ | ✅ | ✅ |
| Remove own vote | ❌ | ✅ | ✅ | ✅ |
| **COMMUNITY OPERATIONS** | | | | |
| Browse public communities | ✅ | ✅ | ✅ | ✅ |
| View community info/rules | ✅ | ✅ | ✅ | ✅ |
| Subscribe to community | ❌ | ✅ | ✅ | ✅ |
| Unsubscribe from community | ❌ | ✅ | ✅ | ✅ |
| Create new community | ❌ | ✅ (100+ karma) | ✅ | ✅ |
| Edit community settings | ❌ | ❌ | ✅ (own communities) | ✅ |
| Delete community | ❌ | ❌ | ❌ | ✅ |
| **MODERATION OPERATIONS** | | | | |
| View community reports | ❌ | ❌ | ✅ (own communities) | ✅ |
| Review reported content | ❌ | ❌ | ✅ (own communities) | ✅ |
| Approve reported content | ❌ | ❌ | ✅ (own communities) | ✅ |
| Remove reported content | ❌ | ❌ | ✅ (own communities) | ✅ |
| Ban user from community | ❌ | ❌ | ✅ (own communities) | ✅ |
| Unban user from community | ❌ | ❌ | ✅ (own communities) | ✅ |
| View moderation logs | ❌ | ❌ | ✅ (own communities) | ✅ |
| **USER PROFILE OPERATIONS** | | | | |
| View own profile | ❌ | ✅ | ✅ | ✅ |
| View other profiles (public) | ✅ | ✅ | ✅ | ✅ |
| Edit own profile info | ❌ | ✅ | ✅ | ✅ |
| View own karma score | ❌ | ✅ | ✅ | ✅ |
| View own post history | ❌ | ✅ | ✅ | ✅ |
| View own comment history | ❌ | ✅ | ✅ | ✅ |
| **REPORTING OPERATIONS** | | | | |
| Report post | ❌ | ✅ | ✅ | ✅ |
| Report comment | ❌ | ✅ | ✅ | ✅ |
| View own reports | ❌ | ✅ | ✅ | ✅ |
| **PLATFORM ADMIN OPERATIONS** | | | | |
| View admin dashboard | ❌ | ❌ | ❌ | ✅ |
| Manage all user accounts | ❌ | ❌ | ❌ | ✅ |
| Suspend user account | ❌ | ❌ | ❌ | ✅ |
| Delete user account | ❌ | ❌ | ❌ | ✅ |
| Reset user password | ❌ | ❌ | ❌ | ✅ |
| Assign moderator status | ❌ | ❌ | ❌ | ✅ |
| Revoke moderator status | ❌ | ❌ | ❌ | ✅ |
| View global reports | ❌ | ❌ | ❌ | ✅ |
| View audit logs | ❌ | ❌ | ❌ | ✅ |
| Configure platform settings | ❌ | ❌ | ❌ | ✅ |
| Generate compliance reports | ❌ | ❌ | ❌ | ✅ |

---

## 6. Access Control Rules

### 6.1 Post & Comment Authorization

WHEN a member attempts to edit a post, THE system SHALL verify the member owns the post AND the post was created within 24 hours.

IF a member attempts to edit a post they do not own, THEN THE system SHALL deny the request and return HTTP 403 Forbidden.

WHEN a member attempts to delete a comment, THE system SHALL perform soft deletion (mark as deleted, preserve for historical integrity).

WHEN a community moderator removes a post from their community, THE system SHALL log the action with timestamp, moderator ID, and removal reason.

IF a member attempts to post in a community they are banned from, THEN THE system SHALL deny access and display error message explaining the ban.

### 6.2 Voting & Karma Authorization

WHEN a member casts a vote, THE system SHALL verify the member has not already voted on that content.

WHEN a member removes a vote, THE system SHALL reverse the karma change applied to the post/comment author.

IF a member has negative karma and attempts to post in a community with karma requirements, THEN THE system SHALL deny post creation and display minimum karma requirement.

IF a member attempts to vote on their own content, THEN THE system SHALL reject the vote with message "You cannot vote on your own content."

### 6.3 Community Moderation Authorization

WHEN a moderator attempts to ban a user from community, THE system SHALL verify the moderator has authority in that community and the user is not already banned.

WHEN a platform admin appeals a community ban, THE system SHALL override the ban and restore user access to community.

IF a community moderator attempts to delete a community, THEN THE system SHALL deny request (only platform admin can delete communities).

IF a community moderator attempts to perform action outside their community, THEN THE system SHALL deny request with HTTP 403 Forbidden.

### 6.4 Admin Authorization

WHEN a platform admin performs an action affecting user data, THE system SHALL log the action with admin ID, action type, timestamp, and affected user.

IF a platform admin attempts to perform unauthorized operations outside scope, THEN THE system SHALL log the attempt and alert security team.

IF an admin's action would violate data protection regulations, THEN THE system SHALL deny the action and require legal authorization.

### 6.5 Error Handling for Authorization Failures

WHEN a guest attempts to create a post, THE system SHALL return HTTP 401 Unauthorized with message "Login required to create posts".

WHEN a member attempts to access admin functions, THE system SHALL return HTTP 403 Forbidden with message "You do not have permission for this action".

WHEN a moderator attempts to moderate a community they don't manage, THE system SHALL return HTTP 403 Forbidden with message "You are not a moderator of this community".

WHEN a user's token is invalid or expired, THE system SHALL return HTTP 401 Unauthorized requiring re-authentication.

WHEN a user's account is suspended, THE system SHALL return HTTP 403 Forbidden with message "Your account has been suspended."

---

## 7. Session & Token Management

### 7.1 Token Lifecycle

**Initial Issuance**:
WHEN user successfully authenticates with valid credentials, THE system SHALL generate:
- Access token with 15-minute expiration
- Refresh token with 7-day expiration
- Both tokens returned to client in single response
- Tokens issued with unique JWT ID (jti claim) for tracking

**Access Token Usage**:
- Client includes access token in Authorization header for all authenticated requests
- System validates token signature and expiration before processing request
- Token contains user permissions for quick authorization decisions
- Token is read-only (client cannot modify token contents)
- System extracts user ID and role from token without database lookup

**Token Refresh**:
WHEN access token approaches expiration or expires, THE system SHALL accept refresh token to issue new access token.

WHEN refresh token is used to obtain new access token, THE system SHALL:
- Validate refresh token signature and expiration
- Verify refresh token is not blacklisted
- Generate new access token with updated 15-minute expiration
- Return new access token to client
- Keep refresh token valid (optionally rotate if > 50% expired)
- Update token issue time

**Token Revocation**:
WHEN user logs out, THE system SHALL revoke all tokens (add to blacklist with expiration equal to token's remaining lifetime).

WHEN user password is changed, THE system SHALL revoke all existing tokens and require re-login.

WHEN platform admin forces logout of user, THE system SHALL revoke all user tokens immediately.

WHEN refresh token expires naturally, THE system SHALL prevent further token refreshes for that token.

### 7.2 Token Storage & Security

**Recommended Storage (Most Secure)**:
- Use httpOnly cookies set by server
- Automatically sent with requests (not accessible to JavaScript)
- Protected against XSS attacks
- Requires CORS configuration for cross-origin requests
- Cookie must have Secure flag (HTTPS only) and SameSite=Strict

**Alternative Storage (Web Applications)**:
- localStorage with secure, same-origin-only approach
- Requires manual Authorization header construction
- Vulnerable to XSS but acceptable for HTTPS with CSP headers
- localStorage persists across browser sessions (user stays logged in)

**NEVER Store In**:
- URL parameters or query strings
- Session storage without encryption
- Local files accessible to other applications
- Logs or monitoring systems (log rotation prevents storage)
- Cookies without Secure and HttpOnly flags

### 7.3 Concurrent Session Management

WHEN a user logs in from multiple devices, THE system SHALL allow multiple concurrent sessions.

WHEN a user logs out, THE system SHALL revoke all tokens for all devices simultaneously.

WHEN user changes password, THE system SHALL revoke all tokens forcing re-login on all devices.

WHEN platform admin forces logout, THE system SHALL invalidate all concurrent sessions immediately.

WHEN user navigates to "Active Sessions" page, THE system SHALL display all current active sessions with device information and IP addresses, allowing selective logout of individual sessions.

### 7.4 Token Expiration Strategy

**Access Token Expiration** (15 minutes):
- Short expiration reduces impact of token theft
- Client automatically refreshes before expiration
- Prevents use of revoked tokens for extended periods
- Minimizes database queries for token validation
- Aligns with industry standards (OAuth 2.0, OpenID Connect)

**Refresh Token Expiration** (7 days):
- Allows users to stay logged in across browser sessions
- Longer than access token but still reasonable
- Can be extended with continued use (optional sliding window)
- Requires re-authentication if completely unused for 7 days
- Similar to session timeout on traditional web applications

**Emergency Revocation**:
- All tokens for user can be revoked immediately by admin
- Takes effect within 1 request cycle
- User cannot use revoked tokens even if not expired
- Revocation persists across all server instances via distributed cache

### 7.5 Token Blacklisting & Revocation

WHEN a token is revoked, THE system SHALL add it to a blacklist with expiration timestamp equal to token's exp claim.

WHEN token validation occurs, THE system SHALL check if token exists in blacklist before accepting it.

IF token found in blacklist, THEN THE system SHALL reject token and return HTTP 401 Unauthorized.

THE blacklist entries automatically expire when token's exp time passes, reducing storage requirements.

---

## 8. Security Requirements & Best Practices

### 8.1 Password Security

WHEN a password is stored, THE system SHALL hash using bcrypt with minimum cost factor of 12 before persistence.

WHEN a user changes password, THE system SHALL hash new password independently, never reusing old hash.

THE system SHALL enforce password policy: minimum 8 characters including uppercase, lowercase, and numeric characters.

THE system SHALL not allow passwords that match username or common patterns (dictionary words, sequential numbers, keyboard patterns).

### 8.2 Email Verification & Account Activation

WHEN user registers, THE system SHALL require email verification before account can interact with platform.

WHEN user attempts to post/vote/comment without verified email, THE system SHALL deny action and display "Verify your email to continue" message.

THE system SHALL send verification emails from no-reply system address with clear sender identification.

WHEN user clicks verification link, THE system SHALL validate token expiration and single-use constraint before marking verified.

### 8.3 Account Security Measures

WHEN user has 5 failed login attempts within 15 minutes, THE system SHALL temporarily lock account for 30 minutes.

WHEN account is locked, THE system SHALL display message "Too many failed login attempts. Try again in [time]."

WHEN user changes email address, THE system SHALL require verification of new email before updating.

WHEN user resets password, THE system SHALL invalidate all existing sessions and tokens.

### 8.4 Data Protection in Transit

WHEN any authentication credential or token is transmitted, THE system SHALL use HTTPS/TLS encryption exclusively (HTTP prohibited).

WHEN token is transmitted, THE system SHALL use Authorization header only (never URL parameters or request body for auth tokens).

WHEN user provides credentials, THE system SHALL transmit using HTTPS POST request with request body (never URL parameters).

THE system SHALL enforce HSTS (HTTP Strict-Transport-Security) header to force HTTPS for future requests.

### 8.5 Audit & Logging

WHEN user authenticates successfully, THE system SHALL log: timestamp, email, IP address, user agent, authentication method.

WHEN authentication fails, THE system SHALL log: timestamp, email (if provided), IP address, reason for failure, user agent.

WHEN admin performs account modifications, THE system SHALL log: timestamp, admin ID, action type, affected user ID, details of changes.

WHEN access token is revoked, THE system SHALL log: timestamp, user ID, reason for revocation, actor (user or admin).

WHEN password reset occurs, THE system SHALL log: timestamp, user ID, reset token generation and verification events.

---

## 9. Authentication Flow Diagrams

### User Registration Flow

```mermaid
graph LR
  A["Guest visits platform"] --> B["Access registration form"]
  B --> C["Enter email & password"]
  C --> D{\"Email format valid?\"}
  D -->|"No"| E["Show validation error"]
  E --> C
  D -->|"Yes"| F{\"Email already exists?\"}
  F -->|"Yes"| G["Show email taken error"]
  G --> C
  F -->|"No"| H{\"Password meets requirements?\"}
  H -->|"No"| I["Show password requirements"]
  I --> C
  H -->|"Yes"| J["Create member account"]
  J --> K["Hash password with bcrypt"]
  K --> L["Send verification email"]
  L --> M["Show verification prompt"]
  M --> N{\"User verifies email?\"}
  N -->|"Within 7 days"| O["Mark email verified"]
  N -->|"After 7 days"| P["Resend verification email"]
  O --> Q["Account fully activated"]
  Q --> R["Redirect to member dashboard"]
  R --> S["Show welcome onboarding"]
```

### User Login Flow

```mermaid
graph LR
  A["User visits login page"] --> B["Enter email & password"]
  B --> C["User submits form"]
  C --> D["System retrieves user"]
  D --> E{\"User account exists?\"}
  E -->|"No"| F["Show auth failed"]
  E -->|"Yes"| G["System validates password"]
  G --> H{\"Password valid?\"}
  H -->|"No"| I["Increment failed attempts"]
  I --> J{\"Attempts >= 5?\"}
  J -->|"Yes"| K["Lock account 30 min"]
  K --> F
  J -->|"No"| F
  H -->|"Yes"| L{"Email verified?"}
  L -->|"No"| M["Show email verification required"]
  L -->|"Yes"| N["Reset failed attempts"]
  N --> O["Generate JWT tokens"]
  O --> P["Create user session"]
  P --> Q["Set secure cookies"]
  Q --> R["Redirect to dashboard"]
  R --> S["Login successful"]
```

### Token Refresh Flow

```mermaid
graph LR
  A["Client makes request"] --> B["Include access token"]
  B --> C["Server validates token"]
  C --> D{\"Token valid?\"}
  D -->|"Yes"| E["Process request"]
  E --> F["Return response"]
  D -->|"No - Expired"| G{\"Refresh token valid?\"}
  G -->|"No"| H["Return 401 Unauthorized"]
  H --> I["Redirect to login"]
  G -->|"Yes"| J["Validate refresh token"]
  J --> K["Check token blacklist"]
  K --> L{"Blacklisted?\"}
  L -->|"Yes"| H
  L -->|"No"| M["Generate new access token"]
  M --> N["Return new token"]
  N --> O["Client retries original request"]
  O --> E
```

### Permission Check Flow

```mermaid
graph LR
  A["User attempts action"] --> B["Extract actor type & ID"]
  B --> C["Load user permissions"]
  C --> D["Check permission matrix"]
  D --> E{\"Has permission?\"}
  E -->|"No"| F["Return 403 Forbidden"]
  F --> G["Log unauthorized attempt"]
  E -->|"Yes"| H{\"Is moderator action?\"}
  H -->|"Yes"| I["Verify moderator rights"]
  I --> J{\"Is moderator?\"}
  J -->|"No"| F
  J -->|"Yes"| K["Proceed with action"]
  H -->|"No"| K
  K --> L["Execute request"]
  L --> M["Log action in audit trail"]
```

---

## 10. Special Cases & Edge Scenarios

### 10.1 Suspended User Attempts Login

WHEN suspended user attempts to login, THE system SHALL deny access and display message "Your account has been suspended. Please contact support."

WHEN user is unsuspended by admin, THE system SHALL clear suspension flag and allow normal login.

### 10.2 Deleted User Data

WHEN platform admin deletes user account, THE system SHALL:
- Set account status to deleted
- Anonymize user data (username changed to "Deleted User")
- Preserve posts and comments for historical integrity
- Keep user ID for referential integrity

### 10.3 Multiple Actor Roles

WHEN member is promoted to community moderator, THE system SHALL:
- Add community moderator role
- Retain all member capabilities
- Grant moderator permissions for assigned communities only

WHEN community moderator is revoked of moderator status, THE system SHALL:
- Remove moderator role
- Retain member status and capabilities
- Revoke moderator permissions

### 10.4 Cross-Community Moderation

WHEN moderator manages multiple communities, THE system SHALL:
- Maintain separate permission context per community
- Allow moderator to switch between communities
- Apply community-specific permissions for each context

### 10.5 Admin Impersonation (Audit Trail)

WHEN platform admin needs to debug user issues, THE system SHALL:
- Require explicit audit logging before allowing any impersonation
- Log all actions performed while impersonating with clear markers
- Prevent actual permission elevation (simulated access only)
- Require written justification for each impersonation session

---

## 11. Integration with Other Systems

### User Actors Integration
This document establishes user actor foundations that integrate with all other platform systems:
- **Community Management** (04-community-management.md): Community moderators use these authentication/authorization rules
- **Content Creation** (05-content-creation-posting.md): Post creation permission enforcement uses these actor definitions
- **Moderation** (09-moderation-reporting.md): Moderation workflows use these permission levels
- **User Profiles** (10-user-profiles-preferences.md): Profile access controlled by these actor types
- **Karma System** (07-karma-reputation-system.md): Karma restrictions may require actor type checks

### Functional Requirements Cross-Reference
- **Core User Workflows** (03-core-user-workflows.md) describe how authentication flows enable all user journeys
- **Non-Functional Requirements** (11-non-functional-requirements.md) specify security standards for authentication implementation

---

> *Developer Note: This document defines **business requirements only**. All technical implementations (authentication libraries, JWT algorithms, database schema for user storage, API endpoints, etc.) are at the discretion of the development team.*