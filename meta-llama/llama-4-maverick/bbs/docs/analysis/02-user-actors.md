## User Actors and Permissions

## Introduction
This document defines the user actors that will interact with the discussion board system and their respective permissions. Understanding these actors is crucial for implementing proper authentication and authorization mechanisms.

## User Actor Hierarchy
The discussion board system recognizes three primary user actors:

1. **Guest**: Unauthenticated users who can view content but cannot interact with it.
2. **Member**: Authenticated users who can create and interact with content.
3. **Moderator**: Users with elevated permissions to manage content and other users.

## Guest User Capabilities
Guests have limited capabilities:
- They can view articles and comments.
- They cannot create, edit, or delete any content.
- They cannot participate in discussions.

## Member User Capabilities
Members have more extensive capabilities:
- They can create new articles.
- They can comment on articles.
- They can edit their own articles and comments.
- They can delete their own articles and comments.

## Moderator Capabilities
Moderators have the highest level of permissions:
- They can manage all articles and comments (edit, delete).
- They can ban or unban users.
- They can assign or remove moderator roles from other users.

## Permission Matrix

| Action | Guest | Member | Moderator |
|--------|-------|--------|-----------|
| View Articles | ✅ | ✅ | ✅ |
| Create Article | ❌ | ✅ | ✅ |
| Edit Article | ❌ | Own Only | ✅ |
| Delete Article | ❌ | Own Only | ✅ |
| Comment on Article | ❌ | ✅ | ✅ |
| Edit Comment | ❌ | Own Only | ✅ |
| Delete Comment | ❌ | Own Only | ✅ |
| Ban User | ❌ | ❌ | ✅ |
| Assign Moderator Role | ❌ | ❌ | ✅ |

## Authentication Requirements
The system SHALL use JSON Web Tokens (JWT) for authentication. The JWT payload SHALL include the user's role (guest, member, moderator) and their unique identifier.

### EARS Format Requirements:
1. WHEN a user logs in, THE system SHALL generate a JWT token containing their role and user ID.
2. THE system SHALL validate the JWT token on every request.
3. IF the token is invalid or expired, THEN THE system SHALL return an authentication error.
4. WHERE the user role is 'moderator', THE system SHALL grant elevated permissions.

This document provides a comprehensive overview of the user actors and their permissions within the discussion board system. It serves as a guide for implementing the necessary authentication and authorization mechanisms.