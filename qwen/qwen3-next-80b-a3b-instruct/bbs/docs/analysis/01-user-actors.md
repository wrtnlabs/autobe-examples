## User Actor Overview

This document defines the two distinct user actors for the economic/political discussion board: citizens and moderators. These roles form the foundation of the system’s authentication, authorization, and content governance model. Both actors authenticate using the same mechanism, but exercise fundamentally different permissions based on their role.

The system operates on a minimal, straightforward principle: citizens participate in discussion, moderators ensure integrity. No additional roles are defined or needed. The entire user experience is built around these two roles, with server-side logic strictly enforcing separation of capabilities.

This document provides backend developers with unambiguous, implementable requirements for role-based access control, authentication flows, and permission enforcement. All requirements are written in natural language using EARS format where applicable.

## Citizen Role

Citizens are the core participants of the community. They engage in economic and political discourse by creating posts, commenting on others’ contributions, and attaching supporting media. Their actions are subject to moderation and time-based restrictions designed to promote thoughtful conversation.

Citizens:

- MAY create new discussion posts
- MAY comment on existing posts
- MAY upload image and file attachments to their own posts
- MAY edit their own posts and comments for 24 hours after creation
- MAY not delete any content posted by others
- MAY not modify content beyond their own posts or comments
- MAY not lock or close discussions
- MAY not view or act upon posts pending moderation
- MAY not assign warnings or tags to other users
- MAY log in using email and password combination
- MAY log out to end their session
- MAY reset their password via email verification
- MAY change their password after successful authentication
- MAY upload only JPG, PNG, GIF, and WEBP image formats
- MAY upload files up to 10MB in size per attachment
- MAY not upload executable files, scripts, or compressed archives
- MAY not post content containing threats, hate speech, or personal information
- MAY not bypass the 24-hour editing window
- MUST verify their email address before posting their first content
- MUST receive an email notification if their post is flagged for review
- MUST be able to view their own editing history if requested

## Moderator Role

Moderators are trusted administrators responsible for the integrity, safety, and order of the discussion board. They are granted elevated privileges to handle violations, enforce rules, and ensure the platform remains a viable space for civil discourse.

Moderators:

- MAY perform ALL actions available to citizens
- MAY view all posts submitted for moderation, whether pending or approved
- MAY approve or reject pending posts before they become public
- MAY delete ANY post or comment, regardless of authorship
- MAY lock any discussion thread to prevent further commenting
- MAY assign warnings to citizens for violating content policies
- MAY enforce temporary or permanent user suspensions
- MAY view detailed activity logs of all citizen actions
- MAY reset any user’s password regardless of authentication state
- MAY access full logs of upload attempts, including rejected files
- MAY search content across all posts and comments using full-text search
- MAY export reports of moderation actions
- MAY not delete moderator-created accounts
- MAY not create filter rules or auto-moderation scripts
- MAY be notified automatically when a post contains flagged keywords
- MUST be the only actors authorized to override the 24-hour editing window
- MUST not approve posts containing personal information, attempts to incite violence, or explicit threats
- MUST log all actions taken on user content with full audit trail
- MUST never change the email address of another user
- MUST respond to user reports within 48 hours
- MUST display clear reason text when removing content
- MUST be identifiable as `moderator` in JWT payloads

## Authentication Flow

All actors — citizens and moderators — authenticate using the same system. No distinction exists in the login interface, user registration process, or initial session establishment.

- WHEN a user attempts to log in, THE system SHALL accept email and password credentials
- WHEN credentials are submitted, THE system SHALL validate them against the user database
- IF credentials are invalid or the account is suspended, THEN THE system SHALL return HTTP 401 with error code AUTH_INVALID_CREDENTIALS
- WHEN authentication succeeds, THE system SHALL generate a JSON Web Token (JWT)
- THE JWT SHALL contain exactly three claims: userId, role, and permissions
- THE role claim SHALL be either "citizen" or "moderator" — no other values permitted
- THE permissions claim SHALL be an array of strings describing capabilities
- THE access token SHALL expire after 20 minutes
- THE refresh token SHALL be issued in a secure httpOnly cookie and expire after 21 days
- THE system SHALL NOT store tokens server-side — statelessness is mandatory
- WHEN logout is requested, THE system SHALL invalidate the refresh cookie immediately
- WHEN password is reset, THE system SHALL send a one-time link to the user’s verified email
- WHERE email verification is required, THE system SHALL prevent post creation until the email is confirmed

## Session Management

Session state is entirely managed client-side using JWT and refresh tokens. Atomic, stateless authentication is required to ensure scalability and compatibility with distributed deployment.

- WHILE a user is logged in, THE system SHALL authenticate all requests via the Authorization header
- WHEN a request contains an expired access token, THE system SHALL respond with HTTP 401
- IF a valid refresh token is present in the httpOnly cookie, THEN THE system SHALL issue a new access token automatically
- WHERE a refresh token is missing or invalid, THEN THE system SHALL require re-authentication
- WHEN a refresh token expires, THE system SHALL delete the cookie and force full login
- THE system SHALL maintain no server-side session records whatsoever
- WHEN token rotation occurs, THE system SHALL use cryptographically secure random generators for new tokens
- THE system SHALL monitor for token reuse and trigger account lock upon detection of duplicate access token use
- WHERE a user changes password, THE system SHALL immediately invalidate all refresh tokens associated with that user
- WHEN a user account is suspended or deleted, THE system SHALL revoke all tokens associated with the userId immediately

## Permissions Matrix

The following table defines exactly what actions each actor can perform. This matrix is the authoritative reference for backend API authorization logic.

| Action | Citizen | Moderator |
|--------|---------|-----------|
| Register with email and password | ✅ | ✅ |
| Log in with email and password | ✅ | ✅ |
| Log out | ✅ | ✅ |
| Change password | ✅ | ✅ |
| Reset password via email | ✅ | ✅ |
| Verify email address | ✅ | ✅ |
| Create new post | ✅ | ✅ |
| Comment on a post | ✅ | ✅ |
| Upload image (JPG/PNG/GIF/WEBP) | ✅ | ✅ |
| Upload file (≤10MB) | ✅ | ✅ |
| Edit own post within 24 hours | ✅ | ✅ |
| Edit own comment within 24 hours | ✅ | ✅ |
| Delete own post | ❌ | ✅ |
| Delete own comment | ❌ | ✅ |
| Delete any post | ❌ | ✅ |
| Delete any comment | ❌ | ✅ |
| Lock a discussion thread | ❌ | ✅ |
| Approve pending post | ❌ | ✅ |
| Reject pending post | ❌ | ✅ |
| View posts pending moderation | ❌ | ✅ |
| Assign warning to user | ❌ | ✅ |
| Suspend user account | ❌ | ✅ |
| View audit logs | ❌ | ✅ |
| Export moderation reports | ❌ | ✅ |
| Access full upload logs | ❌ | ✅ |
| Reset any user’s password | ❌ | ✅ |
| Bypass 24-hour edit window | ❌ | ✅ |
| Modify another user’s email | ❌ | ❌ |
| Modify another user’s password | ❌ | ✅ |
| Confirm email on behalf of user | ❌ | ❌ |
| Create moderator account | ❌ | ❌ |

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*