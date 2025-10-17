# User Roles and Authentication

## Authentication System Overview

### 1.1 Authentication Architecture

The community platform uses a JWT (JSON Web Token) based authentication system to manage user access and permissions. This approach provides scalable, stateless authentication suitable for modern distributed systems while maintaining security and flexibility for role-based access control.

The authentication system operates on these core principles:

- **Stateless Authentication**: Uses JWT tokens rather than server-side sessions for scalability
- **Role-Based Access Control**: Every endpoint enforces role-based permissions
- **Token Refresh Pattern**: Access tokens have short lifespans; refresh tokens enable long-lived sessions
- **Email Verification**: Requires email confirmation before users can fully participate
- **Secure Password Storage**: Uses industry-standard hashing algorithms (bcrypt)
- **Session Management**: Maintains user sessions with automatic expiration and manual logout

### 1.2 Authentication Flow Overview

```mermaid
graph LR
    A["User Visits Platform"] --> B{\"Is User Authenticated?\"}
    B -->|\"No\"| C["Display Login/Register"]
    C --> D{\"User Action?\"}
    D -->|\"Login\"| E["Enter Email & Password"]
    D -->|\"Register\"| F["Enter Email & Password"]
    E --> G["Validate Credentials"]
    F --> H["Create New Account"]
    H --> I["Send Verification Email"]
    I --> J["User Verifies Email"]
    J --> K["Issue JWT Tokens"]
    G --> L{\"Valid?\"}
    L -->|\"Yes\"| K
    L -->|\"No\"| M["Show Error Message"]
    M --> C
    K --> N["User Authenticated"]
    B -->|\"Yes\"| O["Load User Dashboard"]
    N --> O
    O --> P["Access Platform Features Based on Role"]
```

---

## User Registration and Login Flow

### 2.1 User Registration Process

WHEN a guest user attempts to create an account, THE system SHALL:

1. **Display Registration Form**: Present fields for email, password, and confirm password
2. **Validate Input**: 
   - THE email SHALL be in valid email format (RFC 5322)
   - THE password SHALL be at least 8 characters long
   - THE password SHALL contain uppercase letters, lowercase letters, and numbers
   - THE password SHALL contain at least one special character (!@#$%^&*)
   - THE passwords in both fields SHALL match
3. **Check Email Uniqueness**: THE system SHALL verify no existing account uses this email (case-insensitive comparison)
4. **Create Account**: THE system SHALL create a new account with bcrypt-hashed password (salt rounds: 10 minimum)
5. **Send Verification Email**: THE system SHALL send verification email to the provided address within 5 seconds
6. **Require Email Verification**: THE user SHALL verify their email before accessing platform features (posts, comments, votes disabled until verified)

**Email Verification Process:**

WHEN a user receives the verification email, THE system SHALL:
- Include a unique verification token valid for exactly 24 hours
- Provide a clickable link: `https://platform.com/verify-email?token=abc123xyz`
- Include alternative plain-text link for email clients that don't support HTML
- WHEN user clicks the link, THE system SHALL mark the email as verified and update the email_verified timestamp

IF a user does not verify within 24 hours, THE system SHALL:
- Allow the user to request a new verification email (unlimited resend requests, but rate-limited to 5 per 24 hours)
- The new token replaces the old one and is valid for another 24 hours
- THE user cannot access full platform features until email is verified

### 2.2 User Login Process

WHEN a member attempts to log in, THE system SHALL:

1. **Accept Credentials**: Accept email and password from login form
2. **Validate Email Exists**: THE system SHALL check if an account with this email exists (case-insensitive)
3. **Validate Password**: THE system SHALL hash the submitted password and compare with stored hash
4. **Check Email Verification**: THE system SHALL verify the email is confirmed (email_verified = true)
5. **Check Account Status**: THE system SHALL verify the account is active (account_status NOT IN [suspended, deleted, banned])
6. **Verify Not Locked**: THE system SHALL check account is not locked from failed login attempts
7. **Generate Tokens**: THE system SHALL create JWT access and refresh tokens with correct payloads
8. **Return Tokens**: THE system SHALL return both tokens to the user's client
9. **Establish Session**: THE system SHALL create user session with expiration time (30 days from login)
10. **Update Last Login**: THE system SHALL record the login timestamp

IF the email does not exist, THEN THE system SHALL:
- Return HTTP 401 Unauthorized with error code: LOGIN_INVALID_CREDENTIALS
- Display error message: "Email or password is incorrect"
- NOT reveal whether the email exists (prevent account enumeration attacks)
- Track failed attempt (see account lockout section)

IF the password is incorrect, THEN THE system SHALL:
- Return HTTP 401 Unauthorized with error code: LOGIN_INVALID_CREDENTIALS
- Display error message: "Email or password is incorrect"
- Increment failed login attempt counter
- IF 5 failed attempts occur within 15 minutes, THEN lock the account for 30 minutes (see account lockout section)

IF the email is not verified, THEN THE system SHALL:
- Return HTTP 403 Forbidden with error code: LOGIN_EMAIL_NOT_VERIFIED
- Display error message: "Please verify your email before logging in. Check your inbox or [request new verification email]"
- Provide link to resend verification email

IF the account is suspended, banned, or deleted, THEN THE system SHALL:
- Return HTTP 403 Forbidden with error code: LOGIN_ACCOUNT_SUSPENDED or LOGIN_ACCOUNT_BANNED
- Display error message: "This account has been suspended. Please contact support."
- NOT process login further

### 2.3 Logout Process

WHEN a user clicks logout, THE system SHALL:
- Clear the user's session record from database (mark session as terminated)
- Invalidate the refresh token (prevent token reuse)
- Remove all stored authentication tokens from client storage (localStorage, cookies, sessionStorage)
- Redirect user to login page or public homepage
- Clear user context from application state

WHEN a user logs out from all devices, THE system SHALL:
- Immediately invalidate ALL active sessions for that user
- Revoke ALL refresh tokens associated with the user
- Send confirmation email: "All sessions have been terminated. Please log in again if this wasn't you."
- Require fresh login on all devices

---

## User Roles and Permission Hierarchy

The platform implements four distinct user roles, each with specific capabilities and restrictions. Roles represent both access levels and feature capabilities within the system.

### 3.1 Role Definitions and Hierarchy

```mermaid
graph TD
    A["Platform Hierarchy"] --> B["Guest<br/>Unauthenticated"]
    A --> C["Member<br/>Authenticated User"]
    A --> D["Moderator<br/>Community Manager"]
    A --> E["Admin<br/>Platform Owner"]
    
    B --> B1["Browse Communities"]
    B --> B2["View Posts"]
    B --> B3["View Comments"]
    
    C --> C1["All Guest Permissions"]
    C --> C2["Create Posts"]
    C --> C3["Create Comments"]
    C --> C4["Vote"]
    C --> C5["Create Communities"]
    
    D --> D1["All Member Permissions"]
    D --> D2["Moderate Community"]
    D --> D3["Remove Content"]
    D --> D4["Manage Rules"]
    
    E --> E1["All Moderator Permissions"]
    E --> E2["Platform Moderation"]
    E --> E3["Manage Users"]
    E --> E4["System Administration"]
```

### 3.2 Detailed Role Descriptions

#### Guest Role (Unauthenticated User)

Guests are users who have not logged in or created an account. They have minimal read-only access to view content but cannot contribute or interact with the platform.

**Explicit Capabilities:**
- Browse public communities (list, view descriptions, member counts)
- View published posts and comments in public communities (read-only)
- Access community descriptions, rules, and member lists
- Search for communities and posts using search functionality
- View user profiles (public information only: username, karma, bio, post/comment count)
- Access registration and login pages

**Explicit Restrictions:**
- Cannot vote on posts or comments (upvote/downvote buttons disabled)
- Cannot create posts, comments, or replies
- Cannot create or manage communities
- Cannot subscribe to communities (subscribe button disabled)
- Cannot report content (report button disabled)
- Cannot access private or restricted communities
- Cannot view other users' vote history or private information
- Cannot send direct messages
- Cannot follow users

**User Experience:**
WHEN a guest user attempts a member-only action, THE system SHALL redirect to login page with message: "Please log in to [perform action]. [Login Link] or [Register Link]"

#### Member Role (Authenticated User)

Members are registered, authenticated users who have verified their email address. They are the primary users of the platform and can participate fully in community discussions and contribute content.

**Explicit Capabilities:**
- Create posts (text, link, image) in communities they have access to
- Create comments and nested replies on posts
- Edit their own posts (within 48 hours of creation)
- Edit their own comments (within 48 hours of creation)
- Delete their own posts at any time (soft delete - marked as deleted but data preserved)
- Delete their own comments at any time
- Upvote and downvote posts and comments
- Change or revoke their own votes at any time
- Subscribe and unsubscribe from communities
- Create new communities (must have at least 100 karma AND verified email)
- Manage their own created communities (settings, moderation, moderator assignment)
- Build and customize user profiles (avatar, bio, display name, preferences)
- Accumulate and view karma points (visible on profile)
- Report posts and comments for violation of community rules or platform policies
- Receive notifications (replies, mentions, subscription updates, moderation actions)
- Follow other users and view their activity
- View personal activity history and statistics
- Edit account settings (email, password, notification preferences)
- Access personal dashboard with feed and recommendations

**Explicit Restrictions:**
- Cannot moderate communities they do not own or manage
- Cannot remove content from other communities
- Cannot view other members' private information (email addresses, deleted content)
- Cannot access admin-only system settings or analytics
- Cannot modify platform-wide rules or policies
- Cannot override moderation decisions in communities they don't manage
- Cannot send unsolicited direct messages (if DM feature implemented with restrictions)
- Cannot see which users downvoted their content (privacy protection)
- Cannot access moderation audit logs
- IF account has negative karma below -100, certain actions may be rate-limited

**Capability Constraints:**
WHEN a member attempts to create a community, THE system SHALL verify:
- Member has verified email (email_verified = true)
- Member has at least 100 karma (cumulative)
- Member has not been suspended or banned
- Member has not created more than 10 communities in last 30 days

#### Moderator Role (Community Manager)

Moderators are members with elevated permissions within specific communities they manage. They enforce community rules and maintain community quality standards.

**Explicit Capabilities (All Member Capabilities PLUS):**
- Moderate assigned communities (one or more specific communities)
- Review and action on content reports within their communities
- Remove posts or comments that violate community rules or platform policies
- Restore removed posts or comments if removed in error
- Pin important posts to the top of the community (up to 4 posts pinned simultaneously)
- Unlock pinned posts (remove from pinned status)
- Lock posts from receiving new comments (freeze discussion)
- Unlock posts (allow comments again)
- Edit community settings (description, rules, visibility, sidebar content)
- Manage community moderator team (add/remove/promote other moderators)
- View community moderation logs (all moderator actions)
- Issue formal warnings to members violating community rules
- Temporarily suspend members from community (1 hour to 30 days, moderator-specified duration)
- Permanently ban members from their communities (community-specific ban)
- Create community announcements (pinned posts with special formatting)
- View reports and moderation statistics for their communities
- Edit community rules and policies
- Manage community categories and themes
- View list of all members and their activity levels

**Explicit Restrictions:**
- Can only moderate communities they are explicitly assigned to
- Cannot remove content from communities they don't manage
- Cannot ban or suspend users platform-wide (admin only)
- Cannot remove posts from other communities
- Cannot access other communities' moderation data or logs
- Cannot modify platform-wide settings or policies
- Cannot override admin decisions
- Cannot view admin system logs or audit trails
- Cannot suspend or ban accounts (only community bans)
- Cannot delete communities (admin only)

**Moderator Assignment and Scope:**
WHEN a member is assigned moderator role in a community, THE system SHALL:
- Create moderator record linked to specific community ID
- Grant all moderator permissions only for that community
- Prevent moderator actions in other communities (return 403 Forbidden)
- Allow moderator to manage other moderators in their community (if senior moderator)

#### Admin Role (Platform Administrator)

Admins are system administrators with full platform control and authority. They manage platform operations, enforce platform-wide policies, and handle escalated issues.

**Explicit Capabilities (All Moderator Capabilities PLUS):**
- Platform-wide content moderation (remove any post/comment from any community)
- Platform-wide user management (suspend, ban, delete accounts)
- View platform-wide moderation logs and statistics
- Manage moderator assignments across all communities
- Enforce platform-wide policies consistently
- Access system configuration and administration tools
- View comprehensive platform analytics and metrics
- Handle appeals and escalated moderation cases
- Create platform announcements (displayed to all users)
- Export system data and generate custom reports
- Manage platform categories, themes, and settings
- View all user reports and report statistics (across all communities)
- Access complete audit logs of all system changes
- Manage community deletion (delete communities and all content)
- Override any community moderator decision
- Access user account information and history
- Perform bulk operations (bulk ban, bulk delete, etc.)
- Configure platform-wide settings (rate limits, content policies, etc.)

**Explicit Restrictions:**
- None (full platform access with complete authority)

**Admin Responsibilities:**
WHEN an admin takes platform-wide action, THE system SHALL:
- Record action with admin ID, timestamp, and reason in audit log
- Notify affected parties of admin action with explanation
- Provide appeal mechanism for admin decisions
- Monitor admin actions for potential abuse (separate audit)

---

## Role Permissions Matrix

The following comprehensive matrix defines what each role can do across all major platform features:

| Feature / Action | Guest | Member | Moderator | Admin |
|---|:---:|:---:|:---:|:---:|
| **Authentication & Access** |
| Register for account | ✅ | — | — | — |
| Log in | ✅ | ✅* | ✅* | ✅* |
| Log out | — | ✅ | ✅ | ✅ |
| Access dashboard/feed | — | ✅ | ✅ | ✅ |
| Access admin panel | — | — | — | ✅ |
| **Content Viewing & Discovery** |
| Browse public communities | ✅ | ✅ | ✅ | ✅ |
| View posts in public communities | ✅ | ✅ | ✅ | ✅ |
| View comments on posts | ✅ | ✅ | ✅ | ✅ |
| View user profiles (public) | ✅ | ✅ | ✅ | ✅ |
| View user karma | ✅ | ✅ | ✅ | ✅ |
| Search communities and posts | ✅ | ✅ | ✅ | ✅ |
| Access private communities | — | ✅** | ✅** | ✅ |
| View private community posts | — | ✅** | ✅** | ✅ |
| **Community Participation** |
| Subscribe to communities | — | ✅ | ✅ | ✅ |
| Unsubscribe from communities | — | ✅ | ✅ | ✅ |
| View subscribed communities feed | — | ✅ | ✅ | ✅ |
| Create new communities | — | ✅*** | ✅*** | ✅ |
| Edit own community settings | — | ✅† | ✅† | ✅ |
| Manage own community moderators | — | ✅† | ✅† | ✅ |
| Pin posts in own communities | — | ✅† | ✅ | ✅ |
| Lock/unlock posts in communities | — | ✅† | ✅ | ✅ |
| Create community announcements | — | ✅† | ✅ | ✅ |
| Delete own community | — | ✅† | — | ✅ |
| **Content Creation** |
| Create posts (text, links, images) | — | ✅ | ✅ | ✅ |
| Create comments | — | ✅ | ✅ | ✅ |
| Reply to comments (nested) | — | ✅ | ✅ | ✅ |
| Edit own posts (within 48 hours) | — | ✅ | ✅ | ✅ |
| Delete own posts (anytime) | — | ✅ | ✅ | ✅ |
| Edit own comments (within 48 hours) | — | ✅ | ✅ | ✅ |
| Delete own comments (anytime) | — | ✅ | ✅ | ✅ |
| **Voting and Karma** |
| Upvote posts | — | ✅ | ✅ | ✅ |
| Downvote posts | — | ✅ | ✅ | ✅ |
| Upvote comments | — | ✅ | ✅ | ✅ |
| Downvote comments | — | ✅ | ✅ | ✅ |
| Change own votes | — | ✅ | ✅ | ✅ |
| View own karma score | — | ✅ | ✅ | ✅ |
| **User Profile Management** |
| Edit own profile | — | ✅ | ✅ | ✅ |
| Upload profile avatar | — | ✅ | ✅ | ✅ |
| Add profile bio | — | ✅ | ✅ | ✅ |
| View own activity history | — | ✅ | ✅ | ✅ |
| View own posts and comments | — | ✅ | ✅ | ✅ |
| Follow/unfollow users | — | ✅ | ✅ | ✅ |
| **Content Reporting** |
| Report posts for violation | — | ✅ | ✅ | ✅ |
| Report comments for violation | — | ✅ | ✅ | ✅ |
| View own submitted reports | — | ✅ | ✅ | ✅ |
| **Moderation (Community-Level)** |
| Review reports in community | — | ✅† | ✅ | ✅ |
| Remove posts from community | — | ✅† | ✅ | ✅ |
| Remove comments from community | — | ✅† | ✅ | ✅ |
| Restore removed content | — | ✅† | ✅ | ✅ |
| Warn members | — | ✅† | ✅ | ✅ |
| Suspend members (1-30 days) | — | ✅† | ✅ | ✅ |
| Ban members (permanent) | — | ✅† | ✅ | ✅ |
| View community moderation logs | — | ✅† | ✅ | ✅ |
| **Moderation (Platform-Level)** |
| Review platform-wide reports | — | — | — | ✅ |
| Remove any post (platform-wide) | — | — | — | ✅ |
| Remove any comment (platform-wide) | — | — | — | ✅ |
| Suspend users (platform-wide) | — | — | — | ✅ |
| Ban users (platform-wide) | — | — | — | ✅ |
| View platform moderation logs | — | — | — | ✅ |
| **System Administration** |
| Manage user accounts | — | — | — | ✅ |
| View system analytics | — | — | — | ✅ |
| Configure system settings | — | — | — | ✅ |
| Export data reports | — | — | — | ✅ |
| Access audit logs | — | — | — | ✅ |
| Delete communities | — | — | — | ✅ |
| Override moderator decisions | — | — | — | ✅ |

**Legend:**
- ✅ = Permission granted
- — = Permission not granted
- * = Only if email is verified AND account is not suspended
- ** = Only if user is member of community (subscribed) OR user is moderator/admin
- *** = Only if user has verified email AND accumulated at least 100 karma
- † = Only for communities created/managed by this user

---

## Session and Token Management

### 4.1 JWT Token Structure

The platform uses JWT (JSON Web Tokens) for authentication. Each token consists of three parts separated by periods: `header.payload.signature`

**Standard JWT Format:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U
```

### 4.2 Access Token Specification

**Purpose**: Short-lived token used for authenticating API requests and establishing user context

**Expiration**: 15 minutes (900 seconds) from issuance

**Payload Structure and Required Fields:**
```json
{
  "userId": "user_123456",
  "email": "user@example.com",
  "username": "john_doe",
  "role": "member",
  "permissions": ["create_post", "create_comment", "vote"],
  "iat": 1634567890,
  "exp": 1634568790,
  "type": "access"
}
```

**Payload Field Specifications:**
- `userId`: Unique identifier for the user (UUID string, immutable, required)
- `email`: User's verified email address (string, required)
- `username`: User's display/login name (string, required)
- `role`: Current role (enum: guest, member, moderator, admin; required)
- `permissions`: Array of specific permissions granted based on role (string array, required)
- `iat`: Issued At timestamp (Unix epoch seconds, required, system-generated)
- `exp`: Expiration timestamp (Unix epoch seconds, calculated as iat + 900, required)
- `type`: Token type identifier (always "access", required)

**Token Usage Rules:**
- WHEN making API requests, THE client SHALL include token in Authorization header: `Authorization: Bearer <access_token>`
- WHEN token is expired, THE client SHALL use refresh token to obtain new access token (see section 4.3)
- WHEN token signature is invalid, THE server SHALL return HTTP 401 Unauthorized

### 4.3 Refresh Token Specification

**Purpose**: Long-lived token used to obtain new access tokens without re-authentication

**Expiration**: 30 days (2,592,000 seconds) from issuance

**Payload Structure and Required Fields:**
```json
{
  "userId": "user_123456",
  "sessionId": "session_789abc",
  "iat": 1634567890,
  "exp": 1637159890,
  "type": "refresh"
}
```

**Payload Field Specifications:**
- `userId`: Unique identifier for the user (UUID string, required)
- `sessionId`: Unique session identifier (UUID, used for logout/revocation, required)
- `iat`: Issued At timestamp (Unix epoch seconds, required)
- `exp`: Expiration timestamp (Unix epoch seconds, calculated as iat + 2592000, required)
- `type`: Token type identifier (always "refresh", required)

**Refresh Token Security:**
- Refresh tokens SHALL be stored securely in httpOnly, Secure, SameSite cookies (prevents JavaScript access)
- Refresh tokens SHALL NOT be stored in localStorage or sessionStorage (vulnerable to XSS)
- Refresh tokens SHALL NOT be included in Authorization headers (only in cookies)
- THE refresh token SHALL be automatically sent by browser with every request (cookie behavior)

### 4.4 Token Generation and Validation

WHEN a user successfully logs in, THE system SHALL:
- Generate an access token with 15-minute expiration from current time
- Generate a refresh token with 30-day expiration from current time
- Store the refresh token securely in httpOnly cookie
- Return both tokens to the client (access token in body, refresh in Set-Cookie header)
- Create session record in database: (sessionId, userId, createdAt, expiresAt, lastActivityAt)
- Link refresh token to session via sessionId in payload

WHEN a client makes an API request, THE system SHALL:
- Require an Authorization header with format: `Authorization: Bearer <access_token>`
- Extract the token from the Authorization header
- Validate the access token signature using the secret signing key
- Check that the token has not expired (current time < exp)
- Extract the user information from the token payload
- Apply role-based permission checks based on the `role` field
- Execute the requested action if authorized, or return HTTP 403 Forbidden if denied

IF the access token has expired but refresh token is valid, THE system SHALL:
- Allow the client to send the refresh token to the token refresh endpoint: `POST /auth/refresh`
- Validate the refresh token (signature, expiration, session exists)
- Verify the session has not been revoked or user logged out
- Generate a new access token with fresh 15-minute expiration
- Return the new access token to the client
- Optionally issue a new refresh token (rotate refresh token for enhanced security)

IF both tokens have expired, THEN THE system SHALL:
- Require the user to log in again
- Return HTTP 401 Unauthorized with error code: TOKEN_EXPIRED
- Display message: "Your session has expired. Please log in again."
- Redirect to login page

IF token signature is invalid or malformed, THEN THE system SHALL:
- Return HTTP 401 Unauthorized with error code: TOKEN_INVALID
- NOT process any action from that request
- Log invalid token attempt for security monitoring

### 4.5 Token Storage and Transmission

**Client Storage Strategy:**
- Access token SHALL be stored in browser's memory or sessionStorage (cleared on browser close) - NOT localStorage
- This prevents tokens from persisting after browser close and protects against some XSS attacks
- Refresh token SHALL be stored in httpOnly, Secure cookie (browser automatically sends with requests)
- httpOnly flag prevents JavaScript access to cookie (protects against XSS token theft)
- Secure flag ensures cookie only transmitted over HTTPS
- SameSite flag prevents CSRF attacks by restricting cookie to same-site requests

**Token Transmission:**
- THE access token SHALL be sent in the Authorization header for every authenticated request
- THE refresh token SHALL be automatically sent via secure cookie (browser handles this)
- THE system SHALL use HTTPS for all requests (tokens only transmitted over encrypted connections)
- THE system SHALL reject any HTTP request attempting to pass tokens (force HTTPS)
- THE response headers SHALL set `Strict-Transport-Security: max-age=31536000; includeSubDomains` to force HTTPS

### 4.6 Session Management

WHEN a user logs in, THE system SHALL:
- Create a new session record with unique sessionId (UUID)
- Link the session to the userId
- Record the login timestamp (createdAt = current timestamp)
- Set session expiration to 30 days from login (expiresAt = current timestamp + 30 days)
- Store session in database with status = active
- Associate refresh token with this session via sessionId

WHILE a user is active, THE system SHALL:
- Update the lastActivityAt timestamp with each request
- Keep the session alive as long as requests continue (30-day idle timeout)
- Automatically extend session on activity (move expiration out by activity)
- Allow automatic refresh token usage without user action

WHEN a user logs out (clicks logout button), THE system SHALL:
- Mark the session as terminated (status = terminated, terminatedAt = current timestamp)
- Revoke the refresh token (delete from database or mark invalid)
- Clear the access token from the client (remove from memory/sessionStorage)
- Clear the refresh token cookie (Set-Cookie with max-age=0 or Expires=past-date)
- Delete any stored session data on client
- Redirect to login page or public homepage

WHEN a session remains inactive for 30 days, THEN THE system SHALL:
- Automatically expire the session (status = expired, expiredAt = current timestamp)
- Invalidate the refresh token (mark as invalid, prevent reuse)
- Require the user to log in again on next request (return 401 Unauthorized)
- Send email notification: "Your session has expired due to inactivity."

WHEN user clicks "Logout from all devices", THEN THE system SHALL:
- Find all active sessions for that user
- Terminate all sessions (mark status = terminated)
- Revoke ALL refresh tokens for that user
- Send notifications to devices (if push notifications available)
- Send confirmation email: "All sessions have been terminated. Your account is signed out everywhere."
- Require fresh login on all devices

---

## Account Security Features

### 5.1 Password Requirements and Validation

WHEN a user creates or changes a password, THE system SHALL enforce the following requirements:

**Minimum Length**: 8 characters minimum (12+ characters recommended)

**Character Requirements:**
- THE password SHALL contain at least one uppercase letter (A-Z)
- THE password SHALL contain at least one lowercase letter (a-z)
- THE password SHALL contain at least one number (0-9)
- THE password SHALL contain at least one special character: !@#$%^&*()_+-=[]{}|;:,.<>?
- THE password SHALL NOT contain the user's email address (case-insensitive substring search)
- THE password SHALL NOT contain the user's username (case-insensitive substring search)

**Common Password Prevention:**
- THE system SHALL reject passwords from a list of 100,000+ commonly used passwords
- Examples of rejected passwords: "password123", "12345678", "qwerty123", "letmein", "welcome123"
- Checking is case-insensitive

**Maximum Length**: 128 characters maximum (prevent hash bombing)

**Error Messages for Invalid Passwords:**
- IF password is too short, THEN display: "Password must be at least 8 characters long"
- IF missing uppercase letters, THEN display: "Password must contain uppercase letters (A-Z)"
- IF missing lowercase letters, THEN display: "Password must contain lowercase letters (a-z)"
- IF missing numbers, THEN display: "Password must contain numbers (0-9)"
- IF missing special characters, THEN display: "Password must contain special characters (!@#$%^&*)"
- IF contains username or email, THEN display: "Password cannot contain your username or email address"
- IF in common password list, THEN display: "This password is too common. Please choose a stronger password."

### 5.2 Password Hashing and Storage

WHEN a password is saved to the database, THE system SHALL:
- Use bcrypt algorithm for hashing (do NOT use MD5, SHA1, SHA256 without salting)
- Use salt rounds of 10 minimum (12+ recommended for future-proofing)
- Generate a unique salt for each password (bcrypt does this automatically)
- Make passwords non-recoverable (one-way hashing only - no reversible encryption)
- Store ONLY the bcrypt hash in database (never store plain text password)
- Store hash in format: `$2b$12$abcdefghijklmnopqrstuvwxyz...` (standard bcrypt format)

WHEN a user logs in, THE system SHALL:
- Accept the plain-text password from the user
- Hash the submitted password using bcrypt with stored salt
- Compare the newly-calculated hash with the stored hash
- Return match confirmation (TRUE/FALSE) without exposing the actual hash
- Use constant-time comparison to prevent timing attacks

**Example Bcrypt Implementation:**
```
Stored hash: $2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWDeS86E36P4/eBy
User enters: "password123"
System hashes and compares: TRUE (match) or FALSE (no match)
```

### 5.3 Account Lockout Mechanisms

WHEN a user enters an incorrect password, THE system SHALL:
- Increment the failed_login_attempts counter for that account
- Record the timestamp of the failed attempt
- Store counter in database (reset daily at midnight UTC)

IF 3 failed login attempts occur, THEN THE system SHALL:
- Show warning to user: "You have 2 remaining attempts before account lockout"
- Display count of remaining attempts before lockout
- Continue allowing login attempts

IF 5 failed login attempts occur within a 15-minute window, THEN THE system SHALL:
- Immediately lock the account for 30 minutes (lockout_until = current time + 30 minutes)
- Return HTTP 429 Too Many Requests with error code: LOGIN_ACCOUNT_LOCKED
- Display error: "Too many failed login attempts. Your account is locked for 30 minutes for security. You can [reset your password] to unlock immediately."
- Send email notification to user: "Multiple failed login attempts detected on your account from [IP address] on [date/time]"
- Include email options: "If this wasn't you, [secure your account], reset password, or contact support"

WHEN the 30-minute lockout period expires, THE system SHALL:
- Reset the failed_login_attempts counter to 0
- Remove the lockout_until timestamp
- Allow login attempts to resume normally
- Send confirmation email: "Your account lockout has expired. You can now log in again."

WHEN a user resets their password, THE system SHALL:
- Reset failed_login_attempts to 0 immediately
- Remove any active lockout
- Allow immediate login with new password

---

## Password Management

### 6.1 Password Change Process

WHEN a member chooses to change their password (from account settings), THE system SHALL:

1. **Require Current Password**: Ask user to enter their current password for verification (authentication check)
2. **Validate Current Password**: 
   - Hash the provided current password
   - Compare with stored password hash
   - IF no match, THEN return HTTP 401 Unauthorized with error code: PASSWORD_CHANGE_CURRENT_INVALID
   - Display error: "Current password is incorrect"
   - Count as failed login attempt (can trigger lockout if repeated)
3. **Accept New Password**: Request the new password (must meet all password requirements)
4. **Confirm New Password**: Ask user to re-enter new password to confirm (prevent typos)
5. **Validate Requirements**: Check new password meets all security requirements (8+ chars, uppercase, lowercase, number, special char)
6. **Reject If Unchanged**: 
   - IF new password equals current password, THEN reject
   - Display error: "New password must be different from your current password"
   - Do NOT allow reuse of same password
7. **Reject If Recently Used**: 
   - THE system MAY check against last 5 passwords used (optional)
   - Prevent password reuse for security
8. **Update Password**: 
   - Hash new password with bcrypt
   - Store new hash in database
   - Update password_changed_at timestamp
   - Increment password_version field (for audit)
9. **Expire All Sessions**: 
   - Invalidate all existing refresh tokens for this user
   - Terminate all active sessions
   - User will be logged out on all devices
10. **Require Re-login**: 
   - Force user to log in again on all devices
   - Return message: "You will need to log in again from your devices"
11. **Send Confirmation Email**: 
   - Send email: "Your password was changed successfully"
   - Include timestamp and IP address: "Changed on [date] from IP [address]"
   - If user doesn't recognize: "If this wasn't you, reset your password immediately"
   - Include security link: "Secure your account"

### 6.2 Password Reset Process

WHEN a user clicks "Forgot Password" on login page, THE system SHALL:

**Step 1: Request Email**
1. Ask user to enter their email address (plain text input)
2. Accept email input (max 254 characters)

**Step 2: Verify Email Exists**
1. Check if email is registered in system (case-insensitive)
2. IF email not found, THEN:
   - Return message: "If this email is registered, you'll receive password reset instructions"
   - Do NOT reveal whether email exists (prevent account enumeration)
   - Send email containing reset link to that email address (if it happens to exist)

**Step 3: Generate Reset Token**
1. Create secure, one-time reset token (cryptographically random, 32+ bytes)
2. Hash token with SHA-256 (store hash, not raw token)
3. Set token expiration: 1 hour from generation (reset_token_expires_at = current + 3600 seconds)
4. Store in database: (userId, token_hash, expires_at, used=false, used_at=null)
5. Invalidate any previous unused reset tokens for this user

**Step 4: Send Reset Email**
1. Send email to the registered address immediately (within 5 seconds)
2. Subject: "Password Reset Request for Your [Platform] Account"
3. Email content SHALL include:
   - Greeting: "Hello [display name],"
   - Message: "We received a request to reset your password. Click below to set a new password."
   - Button/Link: "Reset Your Password" linking to: `https://platform.com/reset-password?token=abc123xyz`
   - Alternative: Plain text link for email clients that don't support HTML
   - Time limit: "This link expires in 1 hour. If you didn't request this, you can ignore this email."
   - Details: "Generated on [date/time] from IP [address]"
   - Security link: "Didn't request this? [Secure your account]"
   - Footer: Support contact info

**Step 5: Track Request**
1. Record the reset request in audit log with timestamp and IP address
2. FOR SECURITY: Monitor for password reset spam (flag if user requests >5 resets in 1 hour)

**Step 6: Show Confirmation**
1. Display message to user: "Check your email for password reset instructions. Link expires in 1 hour."
2. Show message: "Didn't receive email? Check spam folder or [request a new reset]"

WHEN user clicks the reset link, THE system SHALL:

**Step 1: Validate Token**
1. Extract token from URL parameter: `?token=abc123xyz`
2. Hash the submitted token with SHA-256
3. Check if token hash exists in database
4. IF token not found, THEN:
   - Return HTTP 400 Bad Request with error code: RESET_TOKEN_INVALID
   - Display error: "Reset link is invalid. [Request a new password reset]"
5. Check token hasn't expired (current time < reset_token_expires_at)
6. IF token expired, THEN:
   - Return HTTP 400 Bad Request with error code: RESET_TOKEN_EXPIRED
   - Display error: "Reset link has expired. [Request a new password reset]"
7. Check token hasn't been used (used = false)
8. IF token already used, THEN:
   - Return HTTP 400 Bad Request with error code: RESET_TOKEN_ALREADY_USED
   - Display error: "This reset link has already been used. [Request a new password reset]"
   - Send security alert email: "Multiple password reset attempts detected. If you didn't request these, secure your account immediately."

**Step 2: Display Reset Form**
1. Display password reset form (do NOT show current password field)
2. Form fields: "New Password" and "Confirm Password"
3. Show password requirements below form
4. Show: "This password reset expires in [remaining time]"

**Step 3: Accept New Password**
1. User enters new password
2. User re-enters to confirm (prevent typos)
3. Validate both fields match

**Step 4: Validate Requirements**
1. Check new password meets all security requirements (8+ chars, uppercase, lowercase, number, special char)
2. IF validation fails, THEN:
   - Display specific requirement violations
   - Allow user to correct and resubmit

**Step 5: Update Password**
1. Hash new password with bcrypt
2. Store new hash in database
3. Mark reset token as used: (used = true, used_at = current timestamp)
4. Delete any other unused reset tokens for this user
5. Expire all existing sessions for this user (same as password change)
6. Reset failed_login_attempts to 0 (clear any lockouts)

**Step 6: Mark Complete**
1. Remove reset token from valid list (prevent reuse)
2. Record reset action in audit log with timestamp

**Step 7: Send Confirmation Email**
1. Send email: "Your password has been reset successfully"
2. Include: "Password reset on [date/time] from IP [address]"
3. Include: "If you didn't request this, [secure your account immediately]"
4. Auto-login user or redirect to login page

---

## Email Verification and Communication

### 7.1 Email Verification on Registration

WHEN a user completes registration, THE system SHALL:

1. **Accept Email**: Record the email address provided during registration
2. **Generate Token**: Create unique, cryptographically random verification token (32+ bytes)
3. **Hash Token**: Hash token with SHA-256 and store hash (store hash, not raw token)
4. **Set Expiration**: Token valid for exactly 24 hours (email_verified_token_expires_at = current + 86400 seconds)
5. **Store in Database**: Create record: (userId, token_hash, expires_at, verified=false)
6. **Send Verification Email**: Immediately send verification email to the address within 5 seconds

**Verification Email Content:**
- Subject: "Verify Your Email - Welcome to [Platform Name]"
- Greeting: "Hello [username],"
- Body: "Welcome to our community! Please verify your email address to complete your registration and start engaging with communities."
- Button/Link: "Verify Email Address" linking to: `https://platform.com/verify-email?token=abc123xyz`
- Alternative: Plain text link: `https://platform.com/verify-email?token=abc123xyz`
- Time limit: "This link expires in 24 hours. If you didn't create this account, please ignore this email."
- Footer: "Questions? Contact support: [support email]"

WHEN user clicks the verification link, THE system SHALL:

1. **Validate Token**: 
   - Extract token from URL: `?token=abc123xyz`
   - Hash the submitted token
   - Check if token hash exists in database
   - IF not found, THEN return HTTP 400 Bad Request with error code: VERIFICATION_LINK_INVALID
   - Display: "Verification link is invalid or has already been used. [Request new link]"

2. **Check Expiration**: 
   - Verify token has not expired (current time < email_verified_token_expires_at)
   - IF expired, THEN return HTTP 400 Bad Request with error code: VERIFICATION_LINK_EXPIRED
   - Display: "Verification link has expired. [Request a new verification email]"

3. **Mark Verified**: 
   - Update user record: email_verified = true, email_verified_at = current timestamp
   - Mark verification token as used: verified = true, verified_at = current timestamp
   - Delete any other unused verification tokens for this user

4. **Update Status**: 
   - User account now has full access to platform features
   - Email is confirmed and trusted
   - Post creation, commenting, voting now enabled

5. **Confirmation Message**: 
   - Display: "Email verified successfully! You can now start using [Platform Name]."
   - Show message: "[Log in]" or "Start exploring communities"

6. **Auto-login (Optional)**: 
   - Optionally log user in automatically after verification
   - OR require manual login for additional security

7. **Send Confirmation Email**: 
   - Send email: "Your email has been verified"
   - Include: "Your account is now fully activated and ready to use."

### 7.2 Resend Verification Email

WHEN user clicks "Resend verification email" on login page or registration page, THE system SHALL:

1. **Accept Email**: Ask user to enter their email address
2. **Verify Account Exists**: Check if email is registered
3. **Check If Already Verified**: 
   - IF email already verified, THEN display: "This email is already verified. [Log in]"
   - Do NOT send another verification email
4. **Check Resend Frequency**: 
   - Count resend requests in last hour for this email
   - IF more than 5 requests in 1 hour, THEN:
     - Return HTTP 429 Too Many Requests with error code: RATELIMIT_VERIFICATION
     - Display: "Too many resend requests. Please wait before requesting another verification email."
     - Show timer: "Try again in [X minutes]"
5. **Generate New Token**: 
   - Create new verification token (previous token becomes invalid)
   - Generate new hash, set 24-hour expiration
   - Store in database
6. **Send New Email**: 
   - Send verification email with new token
   - Use same email format as original
7. **Confirmation**: 
   - Display: "Verification email sent. Check your inbox."
   - Offer option to change email address
   - Suggest: "Check spam folder if you don't see it"

### 7.3 Unverified Account Restrictions

WHILE a user's email is not verified, THE system SHALL apply the following restrictions:

**Allowed Actions:**
- Log in to account (with warning)
- View platform features
- Update account settings
- Edit profile information
- Browse communities and posts (read-only)
- View public profiles

**Restricted Actions (POST ONLY AFTER VERIFICATION):**
- Create posts (disabled, show message: "Verify email first")
- Create comments (disabled, show message: "Verify email first")
- Vote on content (disabled, show message: "Verify email first")
- Subscribe to communities (disabled, show message: "Verify email first")
- Create communities (disabled, show message: "Verify email first")
- Report content (disabled, show message: "Verify email first")

**User Experience:**
WHEN an unverified user attempts a restricted action, THE system SHALL:
- Display notification: "Please verify your email to use this feature"
- Provide link: "Resend verification email"
- Show message: "Check your inbox for verification link"
- After verification, restricted features immediately enabled

WHEN unverified user is on profile or dashboard, THE system SHALL:
- Display banner: "Email verification pending. [Resend verification email]"
- Banner should be non-intrusive (info color, not error color)
- Allow user to dismiss banner (but reminder persists on return)

---

## Authorization and Access Control

### 8.1 Permission Enforcement Architecture

WHEN a user attempts to perform any action on the platform, THE system SHALL execute the following authorization process:

**Authorization Process:**
1. **Verify Authentication**: Check user has valid, non-expired JWT token
2. **Extract User Context**: Retrieve userId, role, permissions from token payload
3. **Identify Resource**: Determine what resource/action is being requested
4. **Load Permissions**: Look up role-based permissions for requested action
5. **Check Permission**: Verify user's role has required permission
6. **Evaluate Conditions**: Check any conditional permissions (e.g., "user owns resource", "member of community")
7. **Enforce Decision**: Allow action if authorized, deny if unauthorized
8. **Log Action**: Record authorization check in audit log (especially for denied attempts)

WHEN a user lacks required permission, THE system SHALL:

**For Authenticated Users (Member/Moderator/Admin):**
- Return HTTP 403 Forbidden with error code: PERMISSION_DENIED or action-specific code
- Display user-friendly message explaining restriction
- Suggest alternative actions if applicable
- Do NOT return technical details about authorization

**For Unauthenticated Users (Guest):**
- Return HTTP 401 Unauthorized with error code: AUTH_REQUIRED
- Display message: "You must be logged in to perform this action"
- Provide link to login/registration pages

**Record Attempt:**
- Log the denied access attempt
- Include: userId (or guest), action attempted, timestamp, IP address
- IF same user repeatedly attempts unauthorized actions, flag for investigation

### 8.2 Permission Scope Examples

WHEN a member attempts to edit a post they created, THE system SHALL:
- Check: Is user authenticated? Yes
- Check: Is user the post author? Yes
- Check: Is post within 48-hour edit window? (applies to non-controversial edits)
- Allow: Permit edit to proceed

WHEN a member attempts to edit a post created by another user, THE system SHALL:
- Check: Is user authenticated? Yes
- Check: Is user the post author? No
- Check: Is user a moderator in this community? (if check exists)
- Deny: Return HTTP 403 Forbidden with error code: NOT_CONTENT_AUTHOR
- Message: "You can only edit your own posts."

WHEN a non-member attempts to post in a private community, THE system SHALL:
- Check: Is user authenticated? Yes
- Check: Is user member of this community? No
- Check: Is user a moderator? No
- Deny: Return HTTP 403 Forbidden with error code: NOT_COMMUNITY_MEMBER
- Message: "You must be a member of this community to post."

WHEN a guest attempts to create a post, THE system SHALL:
- Check: Is user authenticated? No
- Deny: Return HTTP 401 Unauthorized with error code: AUTH_REQUIRED
- Message: "You must be logged in to create posts. [Log in] or [Register]"

---

## Integration with Other Systems

### 9.1 Relationship to User Management

This authentication specification provides the foundation for the User Management and Profiles system (document 03). Authentication verifies WHO the user is. User Management defines WHAT properties/data are associated with each user.

When a user is created via registration, BOTH systems interact:
- **Authentication system**: Creates login credentials, verifies email, manages sessions
- **User Management system**: Creates profile, initializes karma, sets up preferences

### 9.2 Relationship to Role-Based Access Control

The role system defined here drives access control throughout the platform:
- **Posts Creation**: Members can create, guests cannot
- **Moderation**: Only moderators and admins can remove content
- **Community Management**: Only members can create communities
- **Admin Functions**: Only admins can suspend users

Each system document (Posts, Communities, Moderation, etc.) references this role system for permission checking.

### 9.3 Relationship to Session Management

Authentication sessions persist across requests:
- **Feed loading**: Uses session to identify user and personalize
- **Vote counting**: Uses session to prevent self-votes
- **Notification delivery**: Uses session to target correct user
- **Moderation actions**: Uses session to track which moderator took action

---

## Conclusion

This comprehensive User Roles and Authentication specification provides the complete foundation for access control and identity management in the Community Platform. Every endpoint and feature in subsequent documents relies on these authentication mechanisms and role definitions.

Backend developers must implement:
1. **Secure JWT-based authentication** with proper token expiration and refresh mechanisms
2. **Complete role-based access control** with permission checks on every protected endpoint
3. **Robust password management** with bcrypt hashing and secure reset flows
4. **Email verification** ensuring legitimate user accounts
5. **Account security features** including lockout, session management, and activity tracking

The authentication system is the security foundation upon which all other platform features depend. It must be implemented completely and thoroughly, with no shortcuts or simplified versions.

> *Developer Note: This document defines **business requirements only**. All technical implementations (authentication libraries, token storage mechanisms, database schema design, specific HTTP frameworks, specific cryptographic libraries, API endpoint structures, etc.) are at the discretion of the development team. This document describes WHAT the system must do from a requirements perspective, not HOW to build it technically.*