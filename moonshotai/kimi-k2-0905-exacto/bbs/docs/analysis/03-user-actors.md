# User Actors and Authentication Requirements

## Service Context

The politicsBbs discussion board system provides a platform for economic and political discourse with support for articles, comments, and file attachments. The platform maintains content quality through a three-tier user role structure that ensures appropriate access and permissions across different user types.

## User Actor Overview

The system implements three distinct user roles:
- Visitors: Unauthenticated users with read-only access
- Members: Regular authenticated users with content creation capabilities
- Moderators: Administrative users with enhanced permissions for content management

### Visitor Role

WHEN a visitor accesses politicsBbs, THE system SHALL provide read-only access to published content and enable them to browse articles, view attached files, search content by keywords, and access community guidelines.

THE visitor SHALL NOT be able to createarticles, comment on discussions, upload media content, edit or modify existing content, access user account features, or participate in community interactions.

THE system SHALL redirect visitors attempting member-only actions to login/registration pages with message explaining account benefits.

### Member Role

WHEN a member logs in, THE system SHALL validate their authentication and provide full posting privileges including creating articles with attached images and files, commenting on all discussions, editing their own content within 24 hours, and managing their user profile.

THE system SHALL enforce content creation rules: articles require 50+ word minimum content, titles between 5-150 characters, images limited to 5MB each, and maximum 10 images per article.

WHERE members post comments, THE system SHALL validate length requirements of minimum 5 characters and maximum 1,000 characters.

THE system SHALL allow members to edit their content for a 24-hour window post-publication and maintain audit logs of all modifications.

THE member SHALL NOT be able to edit other users' content, moderate community content, or access other users' private information.

### Moderator Role

WHEN a moderator logs in, THE system SHALL provide enhanced administrative capabilities including reviewing all submitted content, approving or rejecting articles, editing or removing any problematic content, issuing user warnings, and accessing advanced management tools.

THE system SHALL require moderator consensus for promoting members to moderator status and maintain audit logs of all moderation actions including approval decisions, content modifications, and user warnings.

THE moderator SHALL NOT delete valid community content without cause, modify user accounts without violations, or access system configuration settings.

## Authentication Implementation

The system uses JWT-based authentication for secure, scalable user management across web browsers.

### Registration Process

WHEN a new user registers, THE system SHALL collect minimum information: username, email, and password. Usernames SHALL be unique and follow format rules of letters, numbers, and hyphens only, with length between 3-20 characters.

THE system SHALL validate email format and prevent registration of duplicate email addresses. Passwords SHALL meet complexity requirements: minimum 8 characters including at least one uppercase letter, one lowercase letter, and one number.

WHEN registration succeeds, THE system SHALL automatically authenticate the user and redirect to the discussion board home page.

### Login Process

WHEN a user provides valid credentials, THE system SHALL respond with JWT access and refresh tokens. Access tokens SHALL expire in 15 minutes while refresh tokens expire in 30 days.

WHERE a user's access token expires, THE system SHALL automatically refresh using the valid refresh token without requiring new login credentials.

WHEN a user explicitly logs out, THE system SHALL invalidate both access and refresh tokens while clearing client-side storage.

### JWT Token Structure

Tokens contain user identification and permissions:
- userId: Unique identifier from database
- username: Display name for user interactions
- role: Current role level (member, moderator)
- permissions: Array of authorized actions
- iat: Creation timestamp
- exp: Expiration timestamp
- sessionId: Unique session identifier

### Password Management

WHEN a user requests password reset, THE system SHALL send email-based reset functionality with tokens expiring after 1 hour. Password changes require current password verification. After 5 consecutive failed login attempts, THE system SHALL lock the account and require email verification for recovery.

## Security Requirements

THE system SHALL implement basic rate limiting on authentication endpoints with maximum 5 login attempts per IP address per 15-minute period. All passwords SHALL use secure hashing algorithms with appropriate salting.

THE system SHALL require email verification before allowing content creation or community interaction. When unusual login activity is detected, THE system SHALL request additional verification.

## Permission Matrix

| Action | Visitor | Member | Moderator |
|--------|---------|---------|-----------|
| Browse Articles | ✅ | ✅ | ✅ |
| Read Comments | ✅ | ✅ | ✅ |
| Create Articles | ❌ | ✅ | ✅ |
| Post Comments | ❌ | ✅ | ✅ |
| Upload Images | ❌ | ✅ (5MB max) | ✅ |
| Attach Files | ❌ | ✅ (10MB max) | ✅ |
| Edit Own Content | ❌ | ✅ (24hr limit) | ✅ |
| Edit Other Content | ❌ | ❌ | ✅ |
| View Moderation Queue | ❌ | ❌ | ✅ |
| Approve Content | ❌ | ❌ | ✅ |
| Issue Warnings | ❌ | ❌ | ✅ |

## User Lifecycle Management

THE system SHALL manage account transitions through multiple state states: active, suspended, restricted, or deactivated. Suspended accounts SHALL see clear restriction notifications while maintaining content access for reading.

Where accounts are suspended or restricted, THE system SHALL provide clear communication about violation circumstances, appeal procedures, and recovery expectations.

THE system SHALL provide users with visibility into their personal data storage and support data export requests. Account deletion requests shall preserve audit logs while removing personal information from public view.