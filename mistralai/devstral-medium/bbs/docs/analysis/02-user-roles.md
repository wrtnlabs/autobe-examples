# User Roles and Authentication Specification

## Introduction

### Purpose of the Document
This document provides a comprehensive specification for the user roles and authentication system of the economic/political discussion board. It defines the user roles, authentication flows, permission structure, and security requirements that backend developers need to implement.

### Overview of the Discussion Board
The discussion board is a platform designed to facilitate civil discussions on economic and political topics. It supports user registration, content creation, moderation, and various user interaction features.

## User Roles

The system defines three primary user roles with distinct permissions and capabilities:

### Guest (Unauthenticated Users)
- **Description**: Users who have not registered or logged in
- **Permissions**:
  - View public discussions and comments
  - View user profiles (public information only)
  - Access the registration page
  - Access the login page

### Member (Authenticated Users)
- **Description**: Registered users who have logged in
- **Permissions**:
  - Create new discussion threads
  - Add comments to discussions
  - Reply to existing comments
  - Upvote/downvote discussions and comments
  - Flag inappropriate content
  - Follow/unfollow other users
  - Edit their own posts and comments
  - Delete their own posts and comments
  - Update their profile information
  - Receive notifications

### Moderator (Content Managers)
- **Description**: Users with elevated permissions to manage content and enforce community guidelines
- **Permissions**:
  - All Member permissions
  - Delete inappropriate posts and comments from any user
  - Lock/unlock discussion threads
  - Feature/sticky important discussions
  - View and manage reported content
  - Ban/suspend users temporarily
  - Access moderation dashboard

## Authentication Flow

### Registration Process

**WHEN** a guest attempts to register, **THE** system **SHALL** require the following information:
- Email address (must be valid format)
- Username (unique, alphanumeric, 3-20 characters)
- Password (minimum 8 characters, with complexity requirements)

**WHEN** registration is submitted, **THE** system **SHALL**:
1. Validate all input fields
2. Check for existing email/username conflicts
3. Create a new user account with "Member" role
4. Send a verification email
5. Log the user in automatically

### Login/Logout Process

**WHEN** a user attempts to log in, **THE** system **SHALL** require:
- Email or username
- Password

**WHEN** valid credentials are provided, **THE** system **SHALL**:
1. Authenticate the user
2. Generate a JWT token
3. Set the token in localStorage or httpOnly cookie
4. Redirect to the dashboard

**WHEN** a user logs out, **THE** system **SHALL**:
1. Invalidate the JWT token
2. Clear the token from storage
3. Redirect to the homepage

### Password Management

**WHEN** a user requests password reset, **THE** system **SHALL**:
1. Verify the user's email exists
2. Send a password reset link via email
3. Allow password update through the reset link

**WHEN** a user changes their password, **THE** system **SHALL**:
1. Verify the current password
2. Validate the new password meets complexity requirements
3. Update the password securely

### Email Verification

**WHEN** a user registers, **THE** system **SHALL**:
1. Send a verification email with a confirmation link
2. Mark the account as "unverified" until confirmed

**WHEN** a user clicks the verification link, **THE** system **SHALL**:
1. Verify the token is valid
2. Mark the account as "verified"
3. Update the user's status

## Permission Matrix

| Action / Role | Guest | Member | Moderator |
|----------------|-------|--------|-----------|
| View discussions | ✅ | ✅ | ✅ |
| Create discussions | ❌ | ✅ | ✅ |
| Comment on discussions | ❌ | ✅ | ✅ |
| Edit own posts | ❌ | ✅ | ✅ |
| Delete own posts | ❌ | ✅ | ✅ |
| Edit any post | ❌ | ❌ | ✅ |
| Delete any post | ❌ | ❌ | ✅ |
| Flag content | ❌ | ✅ | ✅ |
| Manage reports | ❌ | ❌ | ✅ |
| Ban users | ❌ | ❌ | ✅ |
| Access moderation tools | ❌ | ❌ | ✅ |

## Token Management

### JWT Structure and Usage

**THE** system **SHALL** use JSON Web Tokens (JWT) for authentication with the following structure:

```json
{
  "userId": "string",
  "role": "guest|member|moderator",
  "permissions": ["string"],
  "iat": "number",
  "exp": "number"
}
```

### Token Expiration and Refresh

**THE** system **SHALL** implement token expiration:
- Access token: 15 minutes expiration
- Refresh token: 7 days expiration

**WHEN** an access token expires, **THE** system **SHALL**:
1. Use the refresh token to obtain a new access token
2. Maintain user session continuity

### Security Considerations

**THE** system **SHALL** implement the following security measures:
- Store JWT tokens securely (localStorage or httpOnly cookies)
- Use HTTPS for all authentication endpoints
- Implement rate limiting on login attempts
- Validate token signatures on every request
- Implement CSRF protection

## Business Rules

### User Management
- **THE** system **SHALL** enforce unique usernames and emails
- **THE** system **SHALL** require email verification for full functionality
- **THE** system **SHALL** allow users to update their profile information

### Content Moderation
- **THE** system **SHALL** allow moderators to delete inappropriate content
- **THE** system **SHALL** implement basic profanity filtering
- **THE** system **SHALL** allow users to report content for moderation

### Error Handling

**WHEN** authentication fails, **THE** system **SHALL** return appropriate error messages:
- Invalid credentials: "Invalid email or password"
- Account locked: "Account temporarily locked"
- Verification required: "Email verification required"

**WHEN** authorization fails, **THE** system **SHALL** return:
- HTTP 403 Forbidden for unauthorized actions
- Clear error messages indicating permission requirements

## Conclusion

This document provides a complete specification for the user roles and authentication system of the discussion board. Backend developers should use this as the foundation for implementing secure, role-based access control that supports the platform's business requirements.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*