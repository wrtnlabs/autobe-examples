# User Roles and Authentication Requirements

## Authentication Requirements

### Core Authentication Functions
- Users can register with email and password
- Users can log in to access their account  
- Users can log out to end their session
- System maintains user sessions securely
- Users can verify their email address
- Users can reset forgotten passwords
- Users can change their password
- Users can revoke access from all devices

### Authentication Security Requirements
- THE system SHALL require email verification before allowing posting privileges
- THE system SHALL enforce minimum password requirements (8+ characters, mixed case, numbers/special characters)
- THE system SHALL implement rate limiting on login attempts (5 attempts per 15 minutes)
- THE system SHALL encrypt all password storage using industry-standard hashing
- THE system SHALL provide secure password reset via email with time-limited tokens
- THE system SHALL log all authentication events for security monitoring

### Multi-Factor Authentication (Future Enhancement)
WHERE two-factor authentication is enabled, THE system SHALL support TOTP (Time-based One-Time Password) verification
WHERE SMS verification is configured, THE system SHALL send verification codes to registered phone numbers

## User Role Definitions

### Guest Role (Non-Authenticated Users)
**Description**: Unregistered visitors who can view public posts and comments but cannot interact with content

**Permissions**:
- View all public communities and posts
- Read comments and discussions
- Search for communities and content
- Browse trending and popular content
- View user profiles (limited information)

**Restrictions**:
- Cannot create posts or comments
- Cannot vote on content
- Cannot join communities
- Cannot create communities
- Cannot send messages
- Cannot access private communities

### Member Role (Authenticated Users)
**Description**: Registered users who can create posts, comment, vote, join communities, and report content

**Core Permissions**:
- All Guest permissions plus:
- Create new posts in communities
- Create comments on posts
- Reply to comments (nested threading)
- Upvote/downvote posts and comments
- Join and leave communities
- Create new communities (with restrictions)
- Edit their own posts and comments
- Delete their own content
- Report inappropriate content
- Customize user profile
- Follow/block other users
- Receive notifications

**Content Creation Limits**:
- Members can create up to 10 posts per hour
- Members can create up to 50 comments per hour
- New members (first 7 days) have reduced limits (5 posts/25 comments per hour)

### Moderator Role (Community Moderators)
**Description**: Community moderators who can manage posts, approve/remove content, ban users within their communities

**Core Permissions**:
- All Member permissions plus:
- Remove posts and comments in their communities
- Approve posts caught by spam filters
- Edit community settings and description
- Add/remove community moderators
- Ban/unban users from their communities
- Lock/unlock posts to prevent new comments
- Pin posts to community tops
- View community analytics and reports
- Set community rules and guidelines

**Moderation Actions**:
- Remove content with reason codes (spam, inappropriate, off-topic)
- Issue warnings to community members
- Temporary bans (1, 3, 7, 30 days) or permanent bans
- Review reported content in moderation queue
- Manage community appearance (banner, colors, themes)

**Limitations**:
- Can only moderate communities where they are designated moderators
- Cannot access platform-wide admin functions
- Cannot view private user information beyond their communities

### Admin Role (Platform Administrators)
**Description**: Platform administrators with full system access, user management, and platform-wide content control

**Core Permissions**:
- All permissions of other roles plus:
- Access to platform-wide analytics and metrics
- Manage all users (suspend, delete, modify roles)
- Review all reported content across platform
- Remove any content from any community
- Ban users platform-wide
- Manage community creation and deletion
- Configure platform settings and policies
- Access system logs and security events
- Manage platform announcements
- Handle DMCA and legal content requests

**Administrative Functions**:
- Review and resolve user appeals
- Manage platform-wide spam detection
- Configure automated moderation rules
- Oversee community moderator activities
- Handle user data requests and deletions
- Platform maintenance and configuration

## Permission Matrix

| Action | Guest | Member | Moderator | Admin |
|--------|--------|--------|-----------|--------|
| View Public Content | ✅ | ✅ | ✅ | ✅ |
| View Private Communities | ❌ | ✅* | ✅* | ✅ |
| Create Posts | ❌ | ✅ | ✅ | ✅ |
| Create Comments | ❌ | ✅ | ✅ | ✅ |
| Vote on Content | ❌ | ✅ | ✅ | ✅ |
| Report Content | ❌ | ✅ | ✅ | ✅ |
| Join/Leave Communities | ❌ | ✅ | ✅ | ✅ |
| Create Communities | ❌ | ✅** | ✅** | ✅ |
| Edit Own Content | ❌ | ✅ | ✅ | ✅ |
| Delete Own Content | ❌ | ✅ | ✅ | ✅ |
| Remove Others' Content | ❌ | ❌ | ✅*** | ✅ |
| Ban Users | ❌ | ❌ | ✅*** | ✅ |
| Manage Community Settings | ❌ | ❌ | ✅*** | ✅ |
| Access Platform Analytics | ❌ | ❌ | ❌ | ✅ |
| Manage All Users | ❌ | ❌ | ❌ | ✅ |

*Where community allows member access
**Subject to platform limits and requirements
***Only within designated communities

## Session Management

### Session Requirements
- THE system SHALL create secure user sessions upon successful authentication
- THE system SHALL maintain session state for authenticated users
- THE system SHALL automatically extend sessions during active user activity
- THE system SHALL terminate sessions after 30 days of inactivity
- THE system SHALL support concurrent sessions across multiple devices
- THE system SHALL allow users to view and revoke active sessions

### Session Security
- THE system SHALL regenerate session tokens after privilege changes
- THE system SHALL invalidate all user sessions upon password reset
- THE system SHALL log all session creation and termination events
- THE system SHALL detect and alert on suspicious session activity
- THE system SHALL implement device fingerprinting for session validation

## JWT Token System

### Token Structure
**Token Type**: JSON Web Tokens (JWT)
**Access Token Expiration**: 15 minutes
**Refresh Token Expiration**: 30 days
**Token Storage**: localStorage for web clients
**Algorithm**: RS256 (RSA with SHA-256)

### JWT Payload Requirements
```json
{
  "sub": "user_id",
  "role": "member|moderator|admin",
  "permissions": ["permission1", "permission2"],
  "community_roles": {
    "community_id": "moderator|member"
  },
  "iat": 1234567890,
  "exp": 1234568790,
  "jti": "unique_token_id"
}
```

### Token Generation Rules
- WHEN a user successfully authenticates, THE system SHALL generate both access and refresh tokens
- THE access token SHALL include user ID, role, and permissions array
- THE refresh token SHALL be stored in the database with device information
- THE system SHALL support token refresh without requiring re-authentication

### Token Validation
- THE system SHALL validate JWT signatures on every protected request
- THE system SHALL check token expiration before processing requests
- THE system SHALL verify user account status (active/suspended) from token claims
- THE system SHALL reject tokens from logged-out or suspended accounts

## Access Control Rules

### API Access Control
- THE system SHALL check user authentication status before processing protected endpoints
- THE system SHALL validate user permissions against requested actions
- THE system SHALL enforce role-based access control for all administrative functions
- THE system SHALL log all access control decisions for security auditing

### Resource Access Rules
- Users can only edit/delete their own content
- Moderators can manage content only within their designated communities
- Private communities require membership for content access
- NSFW content requires explicit user opt-in

### Community-Specific Permissions
- Community creators automatically become moderators
- Moderators can designate additional moderators
- THE system SHALL maintain community-specific role assignments
- Users can have different roles in different communities simultaneously

### Rate Limiting and Abuse Prevention
- THE system SHALL implement rate limiting based on user roles
- New accounts have reduced limits for the first 7 days
- THE system SHALL detect and respond to suspicious authentication patterns
- Repeated failed authentication attempts result in temporary account lockout

### Error Handling and User Feedback
- WHEN authentication fails, THE system SHALL provide generic error messages (avoid revealing specific failure reasons)
- THE system SHALL display appropriate error messages when access is denied
- THE system SHALL guide users to appropriate actions (login, register, verify email)
- THE system SHALL maintain consistent error message formatting across all endpoints

### Security Incident Response
- IF suspicious activity is detected, THE system SHALL notify affected users via email
- THE system SHALL provide self-service account recovery options
- THE system SHALL maintain audit logs of all security-related events
- Admin users SHALL receive alerts for platform-wide security incidents