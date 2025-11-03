# User Actors and Authentication Requirements

## Executive Summary

This document defines the user actors, authentication requirements, and permission hierarchy for a simple economic/political discussion board. The system supports three primary user types with distinct capabilities, focusing on minimal, straightforward functionality as requested.

## User Actor Definitions

### Guest Users
Unauthenticated visitors who can browse public content without participating in discussions.

**WHEN a guest user accesses the discussion board, THE system SHALL allow read-only access to public posts and comments.**

**Business Rules:**
- Guests can view all public posts and their associated comments
- Guests cannot create new posts or comments
- Guests cannot upload files or images
- Guests cannot participate in any discussion activities
- Guests cannot access user profiles or private content

### Member Users
Registered users who actively participate in economic/political discussions.

**WHEN a member registers successfully, THE system SHALL provide full discussion participation capabilities.**

**Member Capabilities:**
- Create new discussion posts on economic/political topics
- Comment on existing posts and participate in discussions
- Upload images and files to support their arguments
- Edit their own posts and comments within specified time limits
- Delete their own content
- View other user profiles (public information only)
- Follow/unfollow other members
- Receive notifications for responses to their content

### Moderator Users
Administrative users responsible for maintaining discussion quality and enforcing community guidelines.

**WHILE acting as a moderator, THE system SHALL provide content management and user administration tools.**

**Moderator Capabilities:**
- All member capabilities PLUS:
- Remove inappropriate posts or comments
- Suspend or ban users who violate community guidelines
- Review reported content
- Pin important discussions to the top
- Lock discussions that become unproductive
- Access moderation dashboard with reporting tools
- View user activity logs for moderation purposes

## Authentication System Requirements

### Registration Process
**WHEN a guest attempts to register, THE system SHALL collect and validate required information.**

**Registration Requirements:**
- Email address (must be unique and valid format)
- Username (3-20 characters, alphanumeric only)
- Password (minimum 8 characters with complexity requirements)
- Agreement to community guidelines and terms of service

**WHEN registration is submitted, THE system SHALL send email verification before account activation.**

### Login/Logout Flow
**WHEN a user attempts to log in, THE system SHALL validate credentials and create authenticated session.**

**Login Requirements:**
- Accept username OR email for login
- Validate password against stored hash
- Create secure session with appropriate permissions
- Redirect to user's previous location or main discussion page

**WHEN a user logs out, THE system SHALL terminate the session and clear authentication tokens.**

### Session Management
**THE system SHALL maintain user sessions securely with automatic expiration.**

**Session Requirements:**
- Session duration: 30 days of inactivity
- Automatic logout after 24 hours of continuous activity
- Secure token storage (JWT recommended)
- Session invalidation on password change
- Ability to log out from all devices

### Password Management
**WHEN a user forgets their password, THE system SHALL provide secure password reset functionality.**

**Password Reset Flow:**
1. User requests password reset via email
2. System sends unique reset link with expiration
3. User creates new password following complexity rules
4. System invalidates all existing sessions
5. User receives confirmation of successful reset

## Permission Hierarchy and Access Control

### Guest Permissions Matrix
| Action | Guest |
|--------|-------|
| View public posts | ✅ |
| View comments | ✅ |
| Create posts | ❌ |
| Comment on posts | ❌ |
| Upload files/images | ❌ |
| Edit any content | ❌ |
| Delete any content | ❌ |
| Access user profiles | ❌ |

### Member Permissions Matrix
| Action | Member |
|--------|--------|
| View public posts | ✅ |
| View comments | ✅ |
| Create posts | ✅ |
| Comment on posts | ✅ |
| Upload files/images | ✅ |
| Edit own content | ✅ (within 24h) |
| Delete own content | ✅ |
| Access user profiles | ✅ (public info) |
| Report content | ✅ |
| Follow other users | ✅ |

### Moderator Permissions Matrix
| Action | Moderator |
|--------|-----------|
| All Member permissions | ✅ |
| Remove any post/comment | ✅ |
| Suspend/ban users | ✅ |
| Pin discussions | ✅ |
| Lock discussions | ✅ |
| Access moderation tools | ✅ |
| View user activity | ✅ |
| Manage categories | ✅ |

## Business Rules and Validation

### User Registration Rules
**IF a user attempts to register with an existing email, THEN THE system SHALL reject the registration and suggest password recovery.**

**IF a user attempts to register with an invalid username format, THEN THE system SHALL provide clear error messages explaining the requirements.**

### Content Creation Rules
**WHILE creating a post, THE system SHALL validate that the content meets minimum quality standards.**

**Validation Requirements:**
- Post title: 5-200 characters
- Post content: 50-10,000 characters
- File attachments: Maximum 5 files per post
- File size limits: 10MB per file maximum
- Supported file types: Images (JPG, PNG, GIF), Documents (PDF, DOC), Archives (ZIP)

### Authentication Security Rules
**THE system SHALL implement rate limiting to prevent brute force attacks on login.**

**WHERE user authentication fails, THE system SHALL not disclose whether username or password was incorrect.**

## Error Handling and User Experience

### Authentication Errors
**IF login credentials are invalid, THEN THE system SHALL display a generic error message without specifying which field was incorrect.**

**IF a user attempts to access restricted content, THEN THE system SHALL redirect to login page with appropriate message.**

### Registration Errors
**IF registration validation fails, THEN THE system SHALL highlight specific fields that require correction.**

**WHEN email verification fails, THEN THE system SHALL allow users to request a new verification email.**

### Session Management Errors
**IF a session expires during activity, THEN THE system SHALL preserve the user's work and prompt for re-authentication.**

**WHERE multiple login attempts fail, THEN THE system SHALL temporarily lock the account and require email verification.**

## Security Considerations

### Data Protection
**THE system SHALL store passwords using industry-standard hashing algorithms (bcrypt recommended).**

**THE system SHALL never store plaintext passwords or sensitive authentication data.**

### Access Control
**WHILE processing user requests, THE system SHALL verify that the authenticated user has permission for the requested action.**

**WHERE content moderation occurs, THE system SHALL maintain audit logs of all moderation actions.**

### Privacy Considerations
**THE system SHALL allow users to control their privacy settings for profile visibility.**

**WHILE displaying user information, THE system SHALL respect privacy preferences and only show permitted data.**

## Implementation Guidelines

### Minimal Design Philosophy
Following the user's request for simplicity, this authentication system should:
- Use straightforward JWT-based authentication
- Implement basic role-based access control
- Avoid complex permission systems
- Focus on core functionality without unnecessary features

### Scalability Considerations
While keeping the design minimal, the system should be built with potential growth in mind:
- Support for future user roles if needed
- Modular authentication system that can extend
- Basic analytics for user activity tracking

This document provides complete business requirements for user authentication and authorization. All technical implementation decisions (architecture, APIs, database design) are at the discretion of the development team.