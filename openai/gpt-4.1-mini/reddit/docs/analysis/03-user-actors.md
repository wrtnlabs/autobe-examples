# User Actors and Authentication Requirements for redditCommunity Platform

## 1. Introduction
This document defines the user actors, their authentication workflow, permissions, and limitations for the redditCommunity platform. It serves as a comprehensive business requirements reference for backend developers to implement access control and authentication features.

## 2. User Actors Overview
The system recognizes four primary actor roles with distinct capabilities:

- **Guest**: Unauthenticated users who can browse public communities and read posts and comments but cannot contribute.
- **Registered User**: Authenticated users who can register, verify their email, log in, create communities, post content, vote, comment, subscribe to communities, and report inappropriate content.
- **Community Moderator**: Registered users with elevated permissions limited to specific communities. They can moderate posts and comments, manage community settings, and ban users within their communities.
- **Admin**: System administrators with full platform access, including user management, content moderation, and global settings.

## 3. Authentication Flow Requirements

- WHEN a visitor submits registration details (email, username, password), THE system SHALL validate input for completeness and uniqueness.
- WHEN registration data is valid, THE system SHALL create a user account in an unverified state.
- THE system SHALL send a verification email to the provided address.
- WHEN a user verifies their email through the provided link, THE system SHALL activate their account.
- WHEN a registered user submits login credentials, THE system SHALL authenticate credentials and create a secure session.
- IF credentials are invalid, THEN THE system SHALL respond with a clear authentication error message within 2 seconds.
- WHEN a user requests password reset, THE system SHALL send a secure reset link to the verified email address.
- WHEN the user submits a new password via the reset link, THE system SHALL update the password securely.
- WHEN a user logs out, THE system SHALL invalidate the session immediately.

## 4. Actor Permissions and Limitations

- **Guest**
  - CAN browse public communities.
  - CAN read posts and comments.
  - CANNOT create posts, comments, communities, votes, or report content.
- **Registered User**
  - CAN create communities.
  - CAN post text, links, and images in communities.
  - CAN comment on posts and replies with nested threading.
  - CAN upvote and downvote posts and comments once per item.
  - CAN subscribe to and unsubscribe from communities.
  - CAN report inappropriate content.
  - CAN view and edit own profile information.
- **Community Moderator**
  - HAS all Registered User permissions.
  - CAN moderate posts and comments within their communities including approval, removal, and banning users.
  - CANNOT moderate outside their assigned communities.
- **Admin**
  - HAS all permissions, including management of all users, communities, and site-wide settings.

## 5. JWT Token Management

- THE system SHALL use JWT tokens for authentication with two types:
  - Access tokens with a validity period of 30 minutes.
  - Refresh tokens with a validity period of 30 days.
- THE system SHALL sign tokens securely with a server-side secret.
- THE system SHALL allow refresh tokens to obtain new access tokens.
- THE system SHALL revoke tokens upon logout or administrative action such as user ban.
- THE system SHALL protect tokens against misuse and securely store refresh tokens.

## 6. Permission Matrix

| Action                                | Guest | Registered User | Community Moderator | Admin |
|-------------------------------------|-------|-----------------|---------------------|-------|
| Browse public communities            | ✅    | ✅              | ✅                  | ✅    |
| View posts and comments              | ✅    | ✅              | ✅                  | ✅    |
| Register account                    | ✅    | N/A             | N/A                 | N/A   |
| Login                              | ✅    | N/A             | N/A                 | N/A   |
| Create community                   | ❌    | ✅              | ✅                  | ✅    |
| Post text, links, images            | ❌    | ✅              | ✅                  | ✅    |
| Comment on posts and nested replies | ❌    | ✅              | ✅                  | ✅    |
| Upvote/downvote posts and comments  | ❌    | ✅              | ✅                  | ✅    |
| Subscribe/unsubscribe communities    | ❌    | ✅              | ✅                  | ✅    |
| Report inappropriate content         | ❌    | ✅              | ✅                  | ✅    |
| Moderate posts and comments          | ❌    | ❌              | ✅                  | ✅    |
| Ban/unban users in communities       | ❌    | ❌              | ✅                  | ✅    |
| Manage community settings            | ❌    | ❌              | ✅                  | ✅    |
| Manage all users and platform settings | ❌  | ❌              | ❌                  | ✅    |

## 7. Summary
The document specifies the authentication and authorization business requirements for the redditCommunity platform covering user roles, detailed authentication workflows, token life cycle, and an exhaustive permission matrix. These requirements provide clear, measurable conditions to implement a secure and scalable authentication system respecting role-based access controls.

---