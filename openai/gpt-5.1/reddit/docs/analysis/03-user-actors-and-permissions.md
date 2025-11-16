# User Actors and Permissions Requirements – communityPlatform

## 1. User Actor Overview

This document defines all user actors for the **communityPlatform** (a Reddit-like community service) and specifies their responsibilities, capabilities, and permission boundaries in business terms. It focuses on behaviors required from the system rather than how they are technically implemented.

Actors considered in this document:
- **guestUser**: Unauthenticated visitor.
- **memberUser**: Registered authenticated user.
- **communityModerator**: Elevated member responsible for specific communities.
- **platformAdmin**: Platform-level administrator.

The requirements below use EARS (Easy Approach to Requirements Syntax). EARS keywords (WHEN, WHILE, IF, THEN, WHERE, THE, SHALL) are in English; all descriptive text is in en-US business language.

This document describes **what** the system must do for authentication and authorization at a business level. All technical decisions about protocols, token formats, storage, and infrastructure are left to the development team.

---

## 2. Actor Definitions and Responsibilities

### 2.1 guestUser

A **guestUser** is any visitor who accesses the platform without being authenticated.

Key responsibilities and capabilities in business terms:
- Browse public communities, posts, and comments.
- View aggregated scores (such as upvote/downvote counts and comment counts) for public content.
- Perform basic discovery actions like searching or browsing by sort modes on public content.
- Initiate registration and login flows.
- Submit content reports only where policy allows reporting by unauthenticated users (for example, severe abuse categories), if the business chooses to allow it.

Key limitations:
- Cannot create communities.
- Cannot create posts or comments.
- Cannot vote on posts or comments.
- Cannot subscribe to communities.
- Cannot access non-public or restricted communities.
- Cannot access personalized feeds or user profiles that require authentication.

EARS requirements:
- THE communityPlatform SHALL allow guestUser to view public communities, public posts, and public comments without authentication.
- THE communityPlatform SHALL prevent guestUser from creating or editing communities, posts, or comments.
- THE communityPlatform SHALL prevent guestUser from casting upvotes or downvotes on any content.
- WHEN guestUser attempts to access a restricted or non-public community, THE communityPlatform SHALL deny access and present a business-level explanation that authentication or membership is required.
- THE communityPlatform SHALL allow guestUser to start registration and login flows.

Optional reporting capability requirement (configurable business choice):
- WHERE the platform policy allows guests to report severe abusive content, THE communityPlatform SHALL accept reports from guestUser for the allowed report reasons and mark them as originating from an unauthenticated actor.

### 2.2 memberUser

A **memberUser** is a registered, authenticated user who participates in communities.

Key responsibilities and capabilities in business terms:
- Maintain an account and manage their own profile information.
- Create and manage communities they own, subject to platform rules.
- Create, edit (within policy), and delete their own posts and comments.
- Vote (upvote/downvote) on posts and comments within policy limits.
- Subscribe and unsubscribe to communities.
- View a personalized feed based on subscriptions and other rules.
- Report content (posts, comments, users, and possibly communities) for policy violations.
- Receive and manage notifications related to their activity.

Key limitations:
- Cannot perform moderation actions in communities where they are not a moderator.
- Cannot perform platform-level actions reserved for platformAdmin.
- Cannot manipulate other users' content beyond what is allowed (such as reporting or voting).

EARS requirements:
- WHEN memberUser is authenticated successfully, THE communityPlatform SHALL treat subsequent actions as belonging to that specific memberUser identity until logout or session expiration.
- THE communityPlatform SHALL allow memberUser to create communities subject to configured limits such as maximum number of communities per account and any reputation requirements.
- THE communityPlatform SHALL allow memberUser to create posts (text, link, or image) in communities where posting by members is allowed.
- IF memberUser is not permitted to post in a given community due to community rules or account restrictions, THEN THE communityPlatform SHALL prevent post creation and present a clear business-level reason.
- THE communityPlatform SHALL allow memberUser to comment on posts and create nested replies where the community permits comments.
- THE communityPlatform SHALL allow memberUser to edit their own posts and comments within configured time limits or policy conditions.
- IF memberUser attempts to edit a post or comment after the allowed edit window has expired or while the content is locked, THEN THE communityPlatform SHALL prevent the edit and provide a business-level explanation.
- THE communityPlatform SHALL allow memberUser to delete their own posts and comments in accordance with content retention policies (for example, soft deletion rules).
- THE communityPlatform SHALL allow memberUser to cast upvotes and downvotes on posts and comments where voting is permitted and where the memberUser has not exceeded rate limits.
- IF memberUser attempts to vote on their own content and the platform policy disallows self-voting, THEN THE communityPlatform SHALL reject the vote and provide a business-level explanation.
- THE communityPlatform SHALL allow memberUser to subscribe and unsubscribe to communities and to manage a list of subscriptions.
- THE communityPlatform SHALL allow memberUser to view a profile page summarizing their own posts, comments, and karma.
- THE communityPlatform SHALL allow memberUser to view public aspects of other users' profiles according to privacy settings.
- THE communityPlatform SHALL allow memberUser to report content or other accounts for potential policy violations using predefined report categories and optional free-text descriptions.

### 2.3 communityModerator

A **communityModerator** is a memberUser with additional responsibilities for one or more specific communities.

Key responsibilities and capabilities:
- Review and manage content (posts and comments) within their moderated communities.
- Enforce community-specific rules in alignment with platform policies.
- Handle content reports within their communities.
- Apply moderation actions such as remove, lock, approve, or pin posts and comments within their communities.
- Manage community-level configurations such as description, membership rules, and posting rules, within platform-defined limits.
- Manage community-level bans or restrictions for memberUser accounts in their communities, consistent with global policies.

Key limitations:
- Cannot moderate outside their assigned communities.
- Cannot perform platform-wide administrative actions.
- Cannot override platformAdmin global decisions such as global bans or legal takedowns.

EARS requirements:
- WHERE a memberUser is designated as communityModerator for a community, THE communityPlatform SHALL grant that account additional permissions limited to that community.
- THE communityPlatform SHALL allow communityModerator to remove or hide posts and comments within their moderated communities when they violate community rules or platform policies.
- THE communityPlatform SHALL allow communityModerator to lock posts or comment threads within their moderated communities to prevent further new comments or edits while keeping existing content visible subject to policies.
- THE communityPlatform SHALL allow communityModerator to pin posts in their communities where pinning is supported, to highlight important content.
- THE communityPlatform SHALL allow communityModerator to mark reported content as reviewed and to decide on actions such as keep, remove, or escalate to platformAdmin.
- THE communityPlatform SHALL allow communityModerator to configure community-level settings within boundaries defined by the platform, such as whether posting requires minimum karma, whether the community is public, restricted, or private, and what content categories are allowed.
- IF communityModerator attempts to perform a moderation or configuration action in a community where they do not have moderator status, THEN THE communityPlatform SHALL deny the action and present a business-level explanation.

### 2.4 platformAdmin

A **platformAdmin** is a platform-level administrator with global oversight.

Key responsibilities and capabilities:
- Enforce global platform policies and legal requirements.
- Manage and audit content and accounts across all communities.
- Handle escalated reports and severe abuse cases.
- Configure platform-wide settings including content policy defaults, rate limits, and feature toggles.
- Apply platform-wide sanctions such as global bans, shadow bans, or account suspensions in accordance with policies.

Key limitations:
- Must act within the constraints of documented platform policies and legal obligations.
- Must not use elevated access for personal gain or harassment; their actions must be auditable.

EARS requirements:
- THE communityPlatform SHALL grant platformAdmin full read and moderated write access to all communities, posts, comments, and reports for policy enforcement and troubleshooting purposes.
- THE communityPlatform SHALL allow platformAdmin to review and act upon any report, including those already handled by communityModerator, for quality control and escalation handling.
- THE communityPlatform SHALL allow platformAdmin to impose platform-wide sanctions such as account suspension, global bans from posting, or limitations on community creation, in line with documented policy.
- THE communityPlatform SHALL allow platformAdmin to configure platform-level parameters such as maximum communities per account, rate limits for posting and voting, and default community settings.
- THE communityPlatform SHALL ensure that key actions performed by platformAdmin, such as account suspensions and content removals, are recorded for auditing.

---

## 3. Authentication and Session Management Requirements

This section defines business-level requirements for how authentication and sessions must behave, independent of specific technical mechanisms.

### 3.1 Registration

Registration is the process by which guestUser becomes memberUser.

EARS requirements:
- WHEN guestUser submits registration data that meets platform validation rules (such as unique identifier, acceptable password rules, and required profile information), THE communityPlatform SHALL create a new memberUser account in a pending or active state as defined by the platform policy.
- IF registration data fails validation (for example due to weak password, duplicate identifier, or missing mandatory fields), THEN THE communityPlatform SHALL reject account creation and present specific business-level reasons for each failure.
- WHERE the platform requires verification (such as email confirmation) before full activation, THE communityPlatform SHALL mark the new account as limited until verification is completed and restrict actions accordingly (for example, no posting or limited posting).

### 3.2 Login

Login associates a guestUser session with a memberUser identity.

EARS requirements:
- WHEN a user submits login credentials that match an existing active memberUser account, THE communityPlatform SHALL authenticate the user and establish an authenticated session bound to that memberUser identity.
- IF a user submits login credentials that do not match any active account or belong to a suspended or banned account, THEN THE communityPlatform SHALL deny authentication and provide a generic, security-safe error message without revealing sensitive account status details beyond what policy allows.
- WHILE a session is authenticated as a specific memberUser, THE communityPlatform SHALL attribute all permitted actions (such as posting, commenting, voting, reporting, and moderation) to that memberUser identity for auditing and karma calculation.

### 3.3 Logout

Logout ends the association between the client and the memberUser identity.

EARS requirements:
- WHEN an authenticated memberUser initiates a logout action, THE communityPlatform SHALL terminate the current authenticated session so that subsequent actions are treated as guestUser actions until re-authentication occurs.
- WHERE the platform provides a "logout from all devices" feature, THE communityPlatform SHALL invalidate all active sessions associated with that memberUser when the feature is invoked.

### 3.4 Session Lifetime and Expiration

Session lifetime rules ensure that authenticated access persists appropriately but not indefinitely.

EARS requirements:
- THE communityPlatform SHALL enforce a maximum session lifetime to limit how long a session can remain authenticated without renewal, based on platform policy.
- WHILE a session remains within its allowed lifetime and has not been revoked, THE communityPlatform SHALL treat it as authenticated for authorization decisions.
- IF a session exceeds its allowed lifetime or is explicitly revoked (for example via password change or logout from all devices), THEN THE communityPlatform SHALL treat subsequent requests as unauthenticated until the user logs in again.

### 3.5 Account Status and Access Control

Account status influences what actions a memberUser can perform.

Possible statuses include, but are not limited to: active, verification-pending, temporarily suspended, permanently banned, and restricted (for example, posting blocked but read-only allowed).

EARS requirements:
- THE communityPlatform SHALL associate each memberUser with an account status that determines which actions are allowed for that account.
- IF memberUser is in verification-pending status, THEN THE communityPlatform SHALL limit actions according to policy (for example, restrict posting or voting until verification is complete).
- IF memberUser is temporarily suspended, THEN THE communityPlatform SHALL prevent actions such as posting, commenting, voting, messaging, and community creation during the suspension period while still optionally allowing read-only access to public content.
- IF memberUser is permanently banned, THEN THE communityPlatform SHALL prevent all authenticated interactions that require membership, including login, posting, commenting, voting, reporting, subscribing, and community creation, except as required by legal obligations (for example, data export requests where applicable).

---

## 4. Authorization and Permission Matrix

This section describes which actions are allowed for each actor type. Authorization behavior is defined in business terms and is independent of the underlying technical mechanism.

### 4.1 High-Level Permission Matrix

The following table summarizes key actions and whether each actor is allowed to perform them under normal conditions (ignoring account-specific restrictions like bans, rate limits, or community-specific rules, which are handled by additional requirements).

| Action                                      | guestUser | memberUser | communityModerator | platformAdmin |
|---------------------------------------------|-----------|------------|--------------------|---------------|
| View public communities                     | ✅        | ✅         | ✅                 | ✅            |
| View restricted/private communities         | ❌        | Conditional | Conditional        | ✅            |
| Register account                            | ✅        | ❌         | ❌                 | ✅ (create)   |
| Login                                       | ✅        | ✅         | ✅                 | ✅            |
| Create community                            | ❌        | ✅         | ✅                 | ✅            |
| Edit community settings                     | ❌        | Limited (own) | ✅ (moderated)  | ✅            |
| Subscribe/unsubscribe to community          | ❌        | ✅         | ✅                 | ✅            |
| Create post                                 | ❌        | ✅         | ✅                 | ✅            |
| Edit own post                               | ❌        | ✅         | ✅                 | ✅            |
| Delete own post                             | ❌        | ✅         | ✅                 | ✅            |
| Comment on post                             | ❌        | ✅         | ✅                 | ✅            |
| Vote on posts                               | ❌        | ✅         | ✅                 | ✅            |
| Vote on comments                            | ❌        | ✅         | ✅                 | ✅            |
| Report posts/comments/users                 | Optional  | ✅         | ✅                 | ✅            |
| Moderate content (remove/lock/pin)          | ❌        | ❌         | ✅ (own communities) | ✅          |
| Apply community-level bans/restrictions     | ❌        | ❌         | ✅                 | ✅            |
| Apply platform-wide sanctions               | ❌        | ❌         | ❌                 | ✅            |
| Configure platform-wide settings            | ❌        | ❌         | ❌                 | ✅            |
| View detailed audit logs                    | ❌        | ❌         | Limited (own community) | ✅      |

"Conditional" and "Limited" indicate that additional business rules or statuses apply, specified below.

### 4.2 Community Visibility and Access

EARS requirements:
- THE communityPlatform SHALL categorize communities into visibility levels such as public, restricted, and private, each with defined access rules.
- THE communityPlatform SHALL allow guestUser to access only public communities and their content.
- WHERE a community is restricted, THE communityPlatform SHALL allow only memberUser, communityModerator, and platformAdmin with appropriate membership or approval to view or interact with its content.
- WHERE a community is private, THE communityPlatform SHALL allow only explicitly approved memberUser, communityModerator of that community, and platformAdmin to view or interact with its content.
- IF any actor attempts to access a community or content for which they lack access rights, THEN THE communityPlatform SHALL deny access and present a business-level explanation without revealing sensitive details about the content or membership.

### 4.3 Community Creation and Management

EARS requirements:
- THE communityPlatform SHALL allow active memberUser to create new communities subject to configurable limits such as maximum communities per account and minimum karma thresholds.
- WHERE a memberUser is the creator or designated owner of a community, THE communityPlatform SHALL allow that memberUser to manage basic community settings within platform-defined limits, even if they are not explicitly marked as communityModerator.
- THE communityPlatform SHALL allow communityModerator to manage community settings for communities where they hold moderator status, including rules description, allowed content categories, and membership requirements, within platform policy constraints.
- THE communityPlatform SHALL allow platformAdmin to modify or override community settings as required for policy enforcement or legal compliance.
- IF memberUser or communityModerator attempts to configure a setting that violates global platform policies (for example disabling all reporting), THEN THE communityPlatform SHALL reject the change and provide a business-level explanation.

### 4.4 Posting and Commenting

EARS requirements:
- THE communityPlatform SHALL allow authenticated memberUser to create posts in communities where posting is open to members and where the memberUser meets any community-specific conditions (such as minimum karma or membership tenure).
- WHERE a community restricts posting to communityModerator or specific roles, THE communityPlatform SHALL enforce those restrictions and allow only eligible actors to create posts.
- THE communityPlatform SHALL allow memberUser to comment on posts in communities where comments are enabled and the user meets community rules.
- THE communityPlatform SHALL allow nested replies to comments to an appropriate depth defined by the platform.
- IF any actor attempts to post or comment in a community where they are not allowed (due to community rules, bans, or account status), THEN THE communityPlatform SHALL prevent the action and provide a business-level explanation.

### 4.5 Voting Permissions

EARS requirements:
- THE communityPlatform SHALL allow memberUser, communityModerator, and platformAdmin to cast upvotes and downvotes on eligible posts and comments where voting is enabled and the actor is not restricted by account status or community rules.
- WHERE platform policy disallows self-voting, THE communityPlatform SHALL prevent actors from voting on their own posts or comments.
- THE communityPlatform SHALL enforce rate limits on voting per actor to prevent abuse, according to business-configured thresholds.
- IF an actor attempts to vote on ineligible content (for example locked, removed, or in a community where they have no access), THEN THE communityPlatform SHALL reject the vote and present a business-level explanation.

### 4.6 Subscription and Personalized Feed

EARS requirements:
- THE communityPlatform SHALL allow memberUser, communityModerator, and platformAdmin who are authenticated to subscribe and unsubscribe to communities where subscriptions are allowed.
- THE communityPlatform SHALL construct a personalized feed for each authenticated user based on their subscriptions and possibly additional business rules (such as recommended communities), subject to privacy and safety constraints.
- IF a community is banned, quarantined, or hidden due to policy violations, THEN THE communityPlatform SHALL exclude its content from standard feeds unless overridden by explicit user actions or platform policies.

### 4.7 Reporting and Moderation Actions

EARS requirements:
- THE communityPlatform SHALL allow memberUser to report posts, comments, and users for violations using a predefined set of report reasons and optional additional details.
- WHERE allowed by policy, THE communityPlatform SHALL allow guestUser to submit limited reports for severe abuse categories and mark such reports as originating from an unauthenticated actor.
- THE communityPlatform SHALL route reports about content to the appropriate communityModerator of the relevant community and also make them visible to platformAdmin for oversight.
- THE communityPlatform SHALL allow communityModerator to take actions on reported content within their communities, including keeping, removing, locking, or escalating to platformAdmin.
- THE communityPlatform SHALL allow platformAdmin to take all moderation actions available to communityModerator across all communities and to apply stronger measures such as community-level quarantines or global bans.
- IF an actor without moderation rights attempts to perform a moderation action (such as removing or locking content), THEN THE communityPlatform SHALL deny the action and provide a business-level explanation.

### 4.8 Profile and Karma Visibility

EARS requirements:
- THE communityPlatform SHALL allow memberUser to view their own profile including a list or summary of their posts, comments, and karma-related statistics.
- THE communityPlatform SHALL allow other authenticated users and guestUser to view public aspects of a memberUser profile, such as public posts, public comments, and public karma, subject to privacy settings and safety rules.
- WHERE privacy settings restrict visibility of certain profile attributes or content, THE communityPlatform SHALL enforce these restrictions for all other actors except platformAdmin where overriding access is required for policy enforcement and safety.

### 4.9 Additional Permission Matrices

#### 4.9.1 Reporting and Moderation Matrix

| Action                                           | guestUser | memberUser | communityModerator          | platformAdmin |
|--------------------------------------------------|-----------|------------|-----------------------------|---------------|
| Report post or comment                           | Optional  | ✅         | ✅                          | ✅            |
| Report user                                      | Optional  | ✅         | ✅                          | ✅            |
| View reports for a community                     | ❌        | ❌         | ✅ (own communities only)   | ✅            |
| Act on reports within a community                | ❌        | ❌         | ✅ (own communities only)   | ✅            |
| Escalate report to platform level                | ❌        | ❌         | ✅                          | ✅            |
| Apply community-level content removals           | ❌        | ❌         | ✅                          | ✅            |
| Apply platform-wide content or account sanctions | ❌        | ❌         | ❌                          | ✅            |

#### 4.9.2 Account and Session Management Matrix

| Action                               | guestUser | memberUser | communityModerator | platformAdmin |
|--------------------------------------|-----------|------------|--------------------|---------------|
| Register new account (self)         | ✅        | ❌         | ❌                 | ✅ (create others) |
| Login to existing account           | ✅        | ✅         | ✅                 | ✅            |
| Logout current session              | ❌        | ✅         | ✅                 | ✅            |
| Logout all sessions for own account | ❌        | ✅         | ✅                 | ✅            |
| Force logout another user           | ❌        | ❌         | ❌                 | ✅            |

---

## 5. Security and Compliance Considerations

This section defines business-level expectations about security and compliance as they relate to authentication and authorization.

### 5.1 Credential and Identity Management

EARS requirements:
- THE communityPlatform SHALL ensure that each memberUser has a unique primary identifier used for login and account management.
- THE communityPlatform SHALL enforce business-level rules for password quality or equivalent credential strength, such as minimum length and complexity, as defined by platform policy.
- THE communityPlatform SHALL provide a secure password or credential reset process that verifies user control over the account before changing credentials.
- IF suspicious credential-related activity is detected (such as repeated failed login attempts exceeding a configurable threshold), THEN THE communityPlatform SHALL trigger additional protective actions such as temporary lockout or additional verification prompts.

### 5.2 Session Security

EARS requirements:
- THE communityPlatform SHALL treat authenticated sessions as sensitive and SHALL protect them from unauthorized use according to platform security policies.
- WHERE the platform supports persistent login across visits, THE communityPlatform SHALL balance usability and security by enforcing reasonable expiration and renewal rules for long-lived sessions.
- IF the platform detects use of the same account from unusual locations or patterns that indicate possible compromise, THEN THE communityPlatform SHALL apply additional protections such as notifying the account owner or requiring re-authentication.

### 5.3 Authorization Consistency and Enforcement

EARS requirements:
- THE communityPlatform SHALL enforce authorization checks for every action that depends on actor type, account status, community membership, or content ownership.
- THE communityPlatform SHALL ensure that permission checks are consistent across different access paths (for example, feed views, direct links, and search results) so that unauthorized access is not granted through alternative routes.
- IF authorization checks fail for any requested action, THEN THE communityPlatform SHALL prevent the action, avoid exposing unauthorized data, and provide a user-appropriate business-level explanation.

### 5.4 Privacy and Data Protection

EARS requirements:
- THE communityPlatform SHALL limit exposure of sensitive authentication and account data to only what is necessary for the actors to perform their roles.
- WHERE log or audit data must include user identifiers for security and compliance, THE communityPlatform SHALL restrict access to such logs to platformAdmin and other authorized internal roles only.
- THE communityPlatform SHALL support legal rights requests related to account data (such as data export or deletion) according to applicable regulations and platform policy.

### 5.5 Auditability and Abuse Investigation

EARS requirements:
- THE communityPlatform SHALL record key security-sensitive and moderation-relevant actions (such as login events, password changes, account status changes, content removals, bans, and major configuration changes) in an auditable form.
- THE communityPlatform SHALL allow platformAdmin to review these audit records to investigate abuse, policy violations, or security incidents.
- WHERE appropriate and allowed by policy, THE communityPlatform SHALL provide communityModerator with access to community-specific audit information such as a log of moderation actions taken in their communities.

---

## 6. Summary of Key Requirements

This document specified all user actors in the communityPlatform and their roles in the system, with emphasis on authentication, sessions, and permissions:
- **guestUser** can browse public content, initiate registration and login, and optionally report severe abuse.
- **memberUser** can participate fully by creating and managing communities they own, posting, commenting, voting, subscribing, reporting, and managing their profiles, subject to account status and community rules.
- **communityModerator** inherits memberUser capabilities plus additional powers for managing content, reports, and settings within specific communities.
- **platformAdmin** has global oversight, can enforce platform policies, configure platform-wide settings, and access audit data.

The requirements use EARS format to define clear, testable behaviors around registration, login, session lifetime, access control, moderation, and security expectations. All technical implementation aspects (such as auth protocols, token formats, storage locations, and infrastructure choices) are intentionally left unspecified so development teams can choose suitable solutions while meeting these business requirements.