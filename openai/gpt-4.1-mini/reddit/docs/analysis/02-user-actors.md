# User Actors and Authentication Requirements for redditCommunity

This document defines the business requirements for user actors, authentication flow, and permission management in the redditCommunity platform. It provides backend developers with clear, testable, and domain-specific rules for implementing identity and access control.

---

## Authentication Flow Requirements

### Core Authentication Functions

- WHEN a guest submits a registration request, THE system SHALL create a new registered user account after validating email uniqueness and password strength.
- WHEN a registered user submits login credentials, THE system SHALL validate the credentials and create a secure user session upon success.
- WHEN a user logs out, THE system SHALL invalidate the user session.
- THE system SHALL maintain session persistence securely, allowing users to remain logged in across requests.
- WHEN a registered user requests password reset, THE system SHALL send a password reset link to the verified email.
- WHEN a registered user follows the password reset procedure, THE system SHALL allow setting a new password following validation.
- WHEN a registered user requests to change their password while authenticated, THE system SHALL validate the old password before updating.
- THE system SHALL support email verification flows to confirm user email ownership after registration.
- WHEN an unauthorized access attempt occurs, THE system SHALL deny access and return appropriate error responses.

### Authentication Security and Restrictions

- THE system SHALL enforce password complexity rules (min 8 characters, at least one uppercase letter, one number).
- THE system SHALL throttle login attempts to prevent brute force attacks.
- THE system SHALL expire user sessions after a configurable inactivity timeout (default 30 days).

---

## User Actor Definitions

### Actors Overview

| Actor           | Description                                                                                         |
|-----------------|-------------------------------------------------------------------------------------------------| 
| guest           | Unauthenticated users who can browse public communities and posts with read-only access.          |
| registeredUser  | Authenticated users who can create communities, post content, comment, vote, subscribe, report.  |
| moderator       | Users with moderation privileges on specific communities to manage posts, comments, reports.     |
| admin           | System administrators with full system-wide access including user and content management.         |

### Actor Permissions

#### guest
- CAN browse public communities and posts.
- CANNOT create communities, posts, comments, vote, subscribe, or report.

#### registeredUser
- CAN create new communities.
- CAN create posts with text, link, or images inside communities.
- CAN comment on posts, supporting nested replies.
- CAN upvote or downvote posts and comments.
- CAN subscribe or unsubscribe from communities.
- CAN view own and other users' profiles.
- CAN report inappropriate content.

#### moderator
- CAN perform all registeredUser actions within communities they moderate.
- CAN manage posts and comments: edit, delete, or moderate.
- CAN review and act on reports of inappropriate content within their communities.

#### admin
- CAN perform all actions of moderators and registeredUsers across all communities.
- CAN manage user accounts and roles.
- CAN perform system-wide administrative tasks including content moderation.

### JWT Payload Considerations

- THE JWT SHALL include userId, role (guest, registeredUser, moderator, admin), and permissions array.
- THE system SHALL validate tokens to authorize actions based on roles.

---

## Permission Matrix

| Action                        | guest | registeredUser | moderator | admin |
|-------------------------------|-------|----------------|-----------|-------|
| Browse public communities       | ✅    | ✅             | ✅        | ✅    |
| Register account               | ❌    | ✅             | ✅        | ✅    |
| Login/logout                  | ❌    | ✅             | ✅        | ✅    |
| Create community               | ❌    | ✅             | ✅        | ✅    |
| Create posts                  | ❌    | ✅             | ✅        | ✅    |
| Comment on posts              | ❌    | ✅             | ✅        | ✅    |
| Upvote/downvote posts/comments | ❌    | ✅             | ✅        | ✅    |
| Subscribe communities         | ❌    | ✅             | ✅        | ✅    |
| View user profiles           | ❌    | ✅             | ✅        | ✅    |
| Report inappropriate content  | ❌    | ✅             | ✅        | ✅    |
| Moderate posts/comments       | ❌    | ❌             | ✅        | ✅    |
| Manage reports                | ❌    | ❌             | ✅        | ✅    |
| Manage user accounts          | ❌    | ❌             | ❌        | ✅    |
| Admin system settings         | ❌    | ❌             | ❌        | ✅    |

---

## Token Management

- THE system SHALL use JWT (JSON Web Tokens) for access tokens.
- THE access token SHALL have an expiration time configurable between 15 and 30 minutes.
- THE refresh token SHALL have an expiration time configurable between 7 and 30 days.
- THE system SHALL securely store refresh tokens and support token revocation.
- THE JWT payload SHALL include the user's unique identifier (userId), assigned role, and permissions array.
- WHEN an access token expires, THE system SHALL verify the refresh token and issue a new access token without requiring user login.
- THE system SHALL ensure all token exchanges occur over secure HTTPS connections.
- THE system SHALL invalidate tokens upon user logout or account deactivation.

---

# Summary

This document provides the full business requirements for user actors, authentication process, permission assignments, and token management for the redditCommunity platform. Backend developers should implement these rules precisely to ensure secure, role-based access control and a reliable authentication experience.

All technical implementation details regarding database design, API endpoints, and infrastructure are delegated to the development team. This document focuses solely on WHAT the system must do to meet the defined business needs and user interactions.