# User Roles and Permissions

## User Roles and Permissions

### Guest: Unauthenticated Users

**Definition**: Unauthenticated users who can browse public content, sign up, and log in. They have minimal permissions and cannot create posts or communities.

**Permissions and Limitations**:
- THE system SHALL allow guests to view all public communities and their content
- THE system SHALL allow guests to search for content across the platform
- THE system SHALL allow guests to view user profiles (limited to public information)
- THE system SHALL allow guests to create an account through registration
- THE system SHALL allow guests to log in to access authenticated features
- THE system SHALL prohibit guests from creating posts, comments, or communities
- THE system SHALL prohibit guests from voting on posts or comments
- THE system SHALL prohibit guests from reporting content
- THE system SHALL prohibit guests from subscribing to communities

### Member: Standard Authenticated Users

**Definition**: Authenticated users who can create posts, comment, upvote/downvote content, subscribe to communities, and maintain a profile. They have basic user permissions.

**Permissions and Limitations**:
- THE system SHALL allow members to register for an account using email and password
- THE system SHALL allow members to log in with their credentials and maintain a session
- THE system SHALL allow members to create and manage their personal profiles
- THE system SHALL allow members to create posts in any community
- THE system SHALL allow members to comment on posts with nested replies
- THE system SHALL allow members to upvote and downvote posts and comments
- THE system SHALL allow members to subscribe to communities
- THE system SHALL allow members to view their own post and comment history
- THE system SHALL allow members to view their karma score and profile information
- THE system SHALL allow members to report inappropriate content
- THE system SHALL allow members to edit their own posts within 24 hours of creation
- THE system SHALL allow members to delete their own posts and comments
- THE system SHALL prohibit members from moderating communities
- THE system SHALL prohibit members from accessing admin-only features
- THE system SHALL prohibit members from managing other users' accounts
- THE system SHALL restrict members from creating private communities (only public communities)

### Moderator: Community Managers

**Definition**: Community owners and trusted users who can manage their communities, moderate content, ban users, and handle reports. They have elevated permissions within specific communities.

**Permissions and Limitations**:
- THE system SHALL allow moderators to create new communities
- THE system SHALL allow moderators to edit community details (name, description, rules, banner)
- THE system SHALL allow moderators to delete communities (with proper authorization)
- THE system SHALL allow moderators to approve or reject posts submitted to their community
- THE system SHALL allow moderators to delete posts and comments from their community
- THE system SHALL allow moderators to ban users from their community
- THE system SHALL allow moderators to unban users from their community
- THE system SHALL allow moderators to manage community members (add/remove members)
- THE system SHALL allow moderators to view reports related to posts and comments in their community
- THE system SHALL allow moderators to respond to content reports
- THE system SHALL allow moderators to mark content as resolved or escalated
- THE system SHALL allow moderators to edit community rules and guidelines
- THE system SHALL allow moderators to view community analytics (post frequency, engagement)
- THE system SHALL allow moderators to invite other users as co-moderators
- THE system SHALL restrict moderators to only these permissions within their designated communities
- THE system SHALL prohibit moderators from accessing other communities' moderation tools
- THE system SHALL prohibit moderators from managing user accounts across the platform
- THE system SHALL prohibit moderators from accessing admin-only features
- THE system SHALL prohibit moderators from creating private communities

### Admin: System Administrators

**Definition**: System administrators with full control over the platform. They can manage all users, communities, settings, reports, and system operations.

**Permissions and Limitations**:
- THE system SHALL allow admins to create, edit, and delete any community
- THE system SHALL allow admins to manage all user accounts (view, suspend, delete)
- THE system SHALL allow admins to review and act on any content report
- THE system SHALL allow admins to view all platform statistics and analytics
- THE system SHALL allow admins to manage system settings and configurations
- THE system SHALL allow admins to create and manage other admin accounts
- THE system SHALL allow admins to approve new community creations
- THE system SHALL allow admins to lockdown communities when necessary
- THE system SHALL allow admins to export platform data for analysis
- THE system SHALL allow admins to manage global rules and policies
- THE system SHALL allow admins to view all user activity logs
- THE system SHALL allow admins to reset any user's password
- THE system SHALL allow admins to revoke all sessions for any user
- THE system SHALL allow admins to define global content policies
- THE system SHALL allow admins to manage the user karma system
- THE system SHALL prohibit admins from accessing private community moderation without explicit authorization
- THE system SHALL require multi-factor authentication for admin actions
- THE system SHALL maintain a detailed audit log of all admin activities

## Permission Matrix

| Feature | Guest | Member | Moderator | Admin |
|--------|-------|--------|-----------|-------|
| View public content | ✅ | ✅ | ✅ | ✅ |
| Create account | ✅ | ✅ | ❌ | ❌ |
| Log in | ✅ | ✅ | ❌ | ❌ |
| View community content | ✅ | ✅ | ✅ | ✅ |
| Create posts | ❌ | ✅ | ✅ | ✅ |
| Edit posts | ❌ | ✅ (24h) | ✅ | ✅ |
| Delete posts | ❌ | ✅ (own) | ✅ | ✅ |
| Comment on posts | ❌ | ✅ | ✅ | ✅ |
| Edit comments | ❌ | ✅ (24h) | ✅ | ✅ |
| Delete comments | ❌ | ✅ (own) | ✅ | ✅ |
| Upvote/downvote | ❌ | ✅ | ✅ | ✅ |
| Report content | ❌ | ✅ | ✅ | ✅ |
| Subscribe to communities | ❌ | ✅ | ✅ | ✅ |
| Create communities | ❌ | ✅ | ✅ | ✅ |
| Edit community details | ❌ | ✅ | ✅ | ✅ |
| Manage community members | ❌ | ✅ | ✅ | ✅ |
| Approve posts | ❌ | ❌ | ✅ | ✅ |
| Delete community posts | ❌ | ✅ | ✅ | ✅ |
| Ban users from community | ❌ | ❌ | ✅ | ✅ |
| Manage content reports | ❌ | ❌ | ✅ | ✅ |
| View all user activity | ❌ | ❌ | ❌ | ✅ |
| Manage all user accounts | ❌ | ❌ | ❌ | ✅ |
| Manage system settings | ❌ | ❌ | ❌ | ✅ |
| View platform analytics | ❌ | ❌ | ❌ | ✅ |
| Generate data exports | ❌ | ❌ | ❌ | ✅ |
| Reset passwords | ❌ | ❌ | ❌ | ✅ |
| Revoke sessions | ❌ | ❌ | ❌ | ✅ |
| Manage global policies | ❌ | ❌ | ❌ | ✅ |
| Access audit logs | ❌ | ❌ | ❌ | ✅ |

## Authentication Flow Requirements

### Core Authentication Functions
- THE system SHALL allow guests to register an account using a unique email address and password
- THE system SHALL verify the email address by sending a confirmation link to the provided email
- THE system SHALL allow users to log in with their email and password credentials
- THE system SHALL maintain user sessions through secure session tokens
- THE system SHALL allow users to log out and terminate their current session
- THE system SHALL allow users to reset forgotten passwords through a secure recovery process
- THE system SHALL allow users to change their password at any time
- THE system SHALL allow users to revoke access from all devices and terminate all sessions
- THE system SHALL display appropriate error messages for failed authentication attempts
- THE system SHALL enforce rate limiting on login attempts to prevent brute force attacks

### Role-Specific Authentication
- THE system SHALL assign the 'guest' role to users before authentication
- THE system SHALL assign the 'member' role to authenticated users after successful login
- THE system SHALL assign the 'moderator' role to users who are community owners or co-moderators
- THE system SHALL assign the 'admin' role to users who have administrator privileges
- THE system SHALL update a user's role when they gain or lose moderator or admin privileges
- THE system SHALL maintain role information in the JWT token payload

### Token Management (JWT)
- THE system SHALL use JWT (JSON Web Tokens) for authentication and authorization
- THE system SHALL generate access tokens with a validity period of 15-30 minutes
- THE system SHALL generate refresh tokens with a validity period of 7-30 days
- THE system SHALL store access tokens in the client's localStorage (convenient) or httpOnly cookies (secure)
- THE system SHALL include the following information in the JWT payload:
  - userId: The unique identifier for the user
  - role: The user's current role (guest, member, moderator, admin)
  - permissions: An array of specific permissions the user has
  - exp: Token expiration timestamp
  - iat: Token issuance timestamp
- THE system SHALL validate JWT tokens on all protected routes
- THE system SHALL refresh sessions automatically by exchanging refresh tokens for new access tokens

### Security Measures
- THE system SHALL implement HTTPS for all authentication endpoints
- THE system SHALL store passwords using strong hashing algorithms (bcrypt, scrypt, or Argon2)
- THE system SHALL implement rate limiting on login and password reset attempts
- THE system SHALL enforce password complexity requirements (minimum 8 characters, at least one uppercase, one lowercase, one number, one special character)
- THE system SHALL prevent account enumeration by using generic error messages for failed login attempts
- THE system SHALL invalidate all active sessions when a user changes their password
- THE system SHALL implement multi-factor authentication for admin accounts
- THE system SHALL log all authentication events (login, logout, password changes)
- THE system SHALL monitor for suspicious login patterns and implement account lockout after multiple failed attempts
- THE system SHALL ensure that JWT tokens are encrypted and not stored in insecure locations
- THE system SHALL perform regular security audits of the authentication system

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*