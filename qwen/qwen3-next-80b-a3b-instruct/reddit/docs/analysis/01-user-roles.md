# Role Classification Overview

The communityPlatform system defines four distinct user roles that govern access and permissions across all platform functionality. These roles form a hierarchical structure that supports secure, scalable community moderation while maintaining an open participation model for members. All roles are enforced server-side through authenticated JWT tokens that include role identifiers in the payload, ensuring consistent permission enforcement across all API endpoints.

The role hierarchy is designed to provide natural progression from anonymous observation to full platform administration, with each role defined by a distinct set of permitted and forbidden actions. Roles are not interchangeable; no role inherits permissions from another role. Instead, each role possesses an independent, explicitly defined permission set. This design ensures predictable behavior, prevents unintended privilege escalation, and simplifies permission auditing.

Each role includes a 'kind' property for technical categorization:
- 'guest' for non-authenticated users
- 'member' for authenticated users with standard privileges
- 'admin' for system-level administrators

The moderator role, while functionally distinct, is classified as 'member' for technical consistency with the authentication system's role structure.


## Guest Role Definition and Permissions

The guest role represents unauthenticated visitors to the platform who have not created or logged into an account. Guests have minimal access rights designed to allow exploration of public content while preventing interaction, modification, or data collection.

### Permissions
- THE system SHALL allow guests to view all public community listings
- THE system SHALL allow guests to view all public posts within visible communities
- THE system SHALL allow guests to view all comment threads associated with visible posts
- THE system SHALL allow guests to view public user profiles (including karma totals and a list of public posts/comments)
- THE system SHALL allow guests to view community statistics (member count, post count, activity trends)
- THE system SHALL allow guests to view the platform's registration and login forms

### Forbidden Actions
- IF a guest attempts to create a post, THEN THE system SHALL deny the request with error code POST_CREATION_REQUIRES_AUTH
- IF a guest attempts to upvote or downvote any content, THEN THE system SHALL deny the request with error code VOTE_REQUIRES_AUTH
- IF a guest attempts to comment on any post, THEN THE system SHALL deny the request with error code COMMENT_REQUIRES_AUTH
- IF a guest attempts to report any content, THEN THE system SHALL deny the request with error code REPORT_REQUIRES_AUTH
- IF a guest attempts to subscribe to any community, THEN THE system SHALL deny the request with error code SUBSCRIBE_REQUIRES_AUTH
- IF a guest attempts to view private user profiles, THEN THE system SHALL deny the request with error code PROFILE_ACCESS_DENIED
- IF a guest attempts to modify any content (edit/delete), THEN THE system SHALL deny the request with error code MODIFICATION_REQUIRES_AUTH
- IF a guest attempts to manage any community, THEN THE system SHALL deny the request with error code COMMUNITY_ADMIN_REQUIRES_AUTH

### User Experience Expectations
- Guests shall see a clear call-to-action prompting them to register or log in when attempting any interactive feature
- Posts and comments shall display a visual indicator (e.g., lock icon or "Sign in to interact") indicating that authentication is required for actions
- The interface shall remain fully functional for viewing content, but any interactive elements shall be disabled or grayed out
- Registration and login buttons shall be prominently displayed in the navigation bar


## Member Role Definition and Permissions

The member role represents authenticated users who have successfully registered and verified their email address. Members have the primary participation rights for content creation and community engagement. All members start with the same baseline permissions regardless of karma or activity level.

### Permissions
- WHEN a user completes registration and email verification, THE system SHALL assign them the member role
- WHEN a user logs in with valid credentials, THE system SHALL set their role to member for the duration of their session
- THE system SHALL allow members to create new communities (subreddits)
- THE system SHALL allow members to create text posts in any public community
- THE system SHALL allow members to create link posts in any public community
- THE system SHALL allow members to create image posts in any public community
- THE system SHALL allow members to upvote any post or comment
- THE system SHALL allow members to downvote any post or comment
- THE system SHALL allow members to post a comment on any post
- THE system SHALL allow members to reply to any comment with a nested reply
- THE system SHALL allow members to subscribe to any public community
- THE system SHALL allow members to unsubscribe from any community they have subscribed to
- THE system SHALL allow members to view their own profile page and activity history
- THE system SHALL allow members to view the karma score of other users
- THE system SHALL allow members to report any post or comment that violates community guidelines
- THE system SHALL allow members to edit their own posts and comments within 15 minutes of submission
- THE system SHALL allow members to delete their own posts and comments at any time
- THE system SHALL allow members to view all communities they have subscribed to on their dashboard
- THE system SHALL allow members to view the birth date of their own account

### Forbidden Actions
- IF a member attempts to upvote their own post, THEN THE system SHALL deny the request with error code SELF_VOTING_PROHIBITED
- IF a member attempts to downvote their own post, THEN THE system SHALL deny the request with error code SELF_VOTING_PROHIBITED
- IF a member attempts to upvote their own comment, THEN THE system SHALL deny the request with error code SELF_VOTING_PROHIBITED
- IF a member attempts to downvote their own comment, THEN THE system SHALL deny the request with error code SELF_VOTING_PROHIBITED
- IF a member attempts to view another user's private profile data, THEN THE system SHALL deny the request with error code PROFILE_ACCESS_DENIED
- IF a member attempts to moderate content in any community they do not officially moderate, THEN THE system SHALL deny the request with error code MODERATION_PERMISSION_DENIED
- IF a member attempts to create more than 100 communities, THEN THE system SHALL deny the request with error code COMMUNITY_CREATION_LIMIT_EXCEEDED
- IF a member attempts to post more than 5 content items in any 5-minute window, THEN THE system SHALL deny the request with error code POST_RATE_LIMIT_EXCEEDED
- IF a member attempts to comment more than 5 times in any 1-minute window, THEN THE system SHALL deny the request with error code COMMENT_RATE_LIMIT_EXCEEDED
- IF a member attempts to report more than 10 items in any 24-hour period, THEN THE system SHALL deny the request with error code REPORT_RATE_LIMIT_EXCEEDED
- IF a member attempts to subscribe to more than 500 communities, THEN THE system SHALL deny the request with error code SUBSCRIPTION_LIMIT_EXCEEDED
- IF a member attempts to edit their post or comment after 15 minutes have passed, THEN THE system SHALL deny the request with error code EDIT_WINDOW_EXPIRED
- IF a member attempts to delete a post or comment that has been reported and is under review, THEN THE system SHALL deny the request with error code DELETION_PENDING_REVIEW
- IF a member attempts to delete a post that has received more than 100 upvotes, THEN THE system SHALL deny the request with error code HIGH_KARMA_POST_PROTECTED

### User Experience Expectations
- Members shall see their own username and profile picture in navigation headers
- All interactive buttons (vote, comment, subscribe, report) shall be active and enabled
- A "karma" indicator shall be visible on all member-created content
- A "subscribed" badge shall appear on communities the member follows
- A "your post" or "your comment" label shall appear on member's own content
- Members shall see aggregated feedback statistics (upvote count, downvote count, net score)
- A "your profile" link shall be visible in user menu


## Moderator Role Definition and Permissions

The moderator role represents community leaders appointed by administrators to manage specific communities. Moderators possess administrative rights only within the communities they are assigned to manage. There is no inherent difference between mod roles based on seniority or tenure—each moderator's permissions are strictly limited by their assigned community.

### Permissions
- WHEN an admin assigns a member to moderate a specific community, THE system SHALL grant that user moderator permissions for that community only
- THE system SHALL allow moderators to remove any post in communities they moderate
- THE system SHALL allow moderators to remove any comment in communities they moderate
- THE system SHALL allow moderators to pin a post within communities they moderate
- THE system SHALL allow moderators to unpin a post within communities they moderate
- THE system SHALL allow moderators to ban a user from communities they moderate
- THE system SHALL allow moderators to unban a user from communities they moderate
- THE system SHALL allow moderators to manually approve pending posts in communities with post review mode enabled
- THE system SHALL allow moderators to manually approve pending comments in communities with comment review mode enabled
- THE system SHALL allow moderators to view reports on content in communities they moderate
- THE system SHALL allow moderators to dismiss reports on content in communities they moderate
- THE system SHALL allow moderators to view logs of their own moderation actions in communities they moderate
- THE system SHALL allow moderators to rename their community
- THE system SHALL allow moderators to change the community's public visibility setting (public/private)
- THE system SHALL allow moderators to set a community description
- THE system SHALL allow moderators to set a community banner
- THE system SHALL allow moderators to manage which users are assigned as joint moderators in their community

### Forbidden Actions
- IF a moderator attempts to remove a post in a community they do not moderate, THEN THE system SHALL deny the request with error code MODERATION_PERMISSION_DENIED
- IF a moderator attempts to ban a user from a community they do not moderate, THEN THE system SHALL deny the request with error code MODERATION_PERMISSION_DENIED
- IF a moderator attempts to purge a comment in a community they do not moderate, THEN THE system SHALL deny the request with error code MODERATION_PERMISSION_DENIED
- IF a moderator attempts to change community settings in a community they do not moderate, THEN THE system SHALL deny the request with error code MODERATION_PERMISSION_DENIED
- IF a moderator attempts to view reports on communities they do not moderate, THEN THE system SHALL deny the request with error code MODERATION_PERMISSION_DENIED
- IF a moderator attempts to audit the activity of other moderators, THEN THE system SHALL deny the request with error code MODERATOR_AUDIT_DENIED
- IF a moderator attempts to remove an admin account, THEN THE system SHALL deny the request with error code ADMIN_PROTECTED_ACCOUNT
- IF a moderator attempts to ban a moderator from any community, THEN THE system SHALL deny the request with error code MODERATOR_PROTECTED
- IF a moderator attempts to appoint another user as moderator without admin access, THEN THE system SHALL deny the request with error code MODERATOR_ASSIGNMENT_DENIED
- IF a moderator attempts to rename a community to a name already in use, THEN THE system SHALL deny the request with error code COMMUNITY_NAME_CONFLICT
- IF a moderator attempts to change the creator of a community, THEN THE system SHALL deny the request with error code COMMUNITY_CREATOR_PROTECTED
- IF a moderator attempts to delete their own community, THEN THE system SHALL deny the request with error code COMMUNITY_DELETION_DENIED

### User Experience Expectations
- Moderators shall see a "Moderate" button next to all posts/comments in communities they moderate
- Moderators shall see a special pin icon on pinned posts in their communities
- Moderators shall see a "Ban User" button in user profile cards within communities they moderate
- Moderators shall see a "Reports" section in their community's dashboard
- Moderators shall see a "Moderation Log" section showing their own actions
- Moderators shall see a prefix (e.g., [Mod]) next to their username in all content within communities they moderate
- Moderators shall see a dedicated moderator alert popup when a new report is submitted on their community
- Moderators shall see a "Get help from admin" link when managing sensitive moderation decisions


## Admin Role Definition and Permissions

The admin role represents platform-wide administrators with full-control oversight of the entire communityPlatform system. Admins are strictly limited to 3-5 individuals and are selected based on trust and business requirements. Admins can override all community-specific rules and intervene on platform-wide governance.

### Permissions
- WHEN an account is created by system initialization, THE system SHALL assign the admin role explicitly in the database
- WHEN a member is promoted to admin, THE system SHALL grant them full control over the platform
- THE system SHALL allow admins to manage all user accounts, including banning and unblocking system-wide
- THE system SHALL allow admins to remove any content on the platform regardless of its community
- THE system SHALL allow admins to restore any deleted content on the platform
- THE system SHALL allow admins to delete any community on the platform
- THE system SHALL allow admins to create new communities without restrictions
- THE system SHALL allow admins to assign moderator roles in any community
- THE system SHALL allow admins to unassign moderator roles in any community
- THE system SHALL allow admins to reset any user's password
- THE system SHALL allow admins to force-verify any user's email address
- THE system SHALL allow admins to view all user activity logs server-side
- THE system SHALL allow admins to view all report histories across the entire platform
- THE system SHALL allow admins to enable or disable platform-wide moderation features
- THE system SHALL allow admins to change platform-wide content policies
- THE system SHALL allow admins to change default community settings
- THE system SHALL allow admins to access system health dashboards and metrics
- THE system SHALL allow admins to invite or remove other admins
- THE system SHALL allow admins to access audit logs of all moderator actions
- THE system SHALL allow admins to update the terms of service and privacy policy
- THE system SHALL allow admins to place the entire platform into read-only mode

### Forbidden Actions
- IF an admin attempts to delete the first admin account without assigning another, THEN THE system SHALL deny the request with error code AT_LEAST_ONE_ADMIN_REQUIRED
- IF an admin attempts to remove their own admin privileges without assigning another admin, THEN THE system SHALL deny the request with error code AT_LEAST_ONE_ADMIN_REQUIRED
- IF an admin attempts to recover content that was purged by the automated cleanup system, THEN THE system SHALL deny the request with error code DATA_PERSISTENCE_LIMIT_EXCEEDED
- IF an admin attempts to access the encryption key for user passwords, THEN THE system SHALL deny the request with error code CRYPTOGRAPHIC_ACCESS_DENIED
- IF an admin attempts to bypass content moderation filters without justification, THEN THE system SHALL deny the request with error code MODERATION_FILTER_OVERRIDE_DENIED
- IF an admin attempts to modify the system's approval workflow for new communities, THEN THE system SHALL deny the request with error code COMMUNITY_CREATION_PROCESS_PROTECTED
- IF an admin attempts to permanently delete a user without a 72-hour waiting period after account closure request, THEN THE system SHALL deny the request with error code USER_DELETE_HOLD_PERIOD
- IF an admin attempts to alter the platform's karma algorithm formula, THEN THE system SHALL deny the request with error code KARMA_ALGORITHM_PROTECTED
- IF an admin attempts to delete the admin role definition from the permissions system, THEN THE system SHALL deny the request with error code CORE_ROLE_PROTECTED

### User Experience Expectations
- Admins shall see an "Admin Panel" link in the user profile menu
- Admins shall see a "System Overview" dashboard with platform KPIs
- Admins shall see "Platform Warnings" banners for critical events
- Admins shall see a "Content Audit" section listing all recent reports
- Admins shall see a "User Watchlist" showing flagged or problematic accounts
- Admins shall see visual indicators on all content they moderate or delete
- Admins shall receive email alerts for critical system events
- Admins shall be required to provide justification for any system-wide ban or content deletion
- Admins shall have their actions logged under a separate "System Administrator" audit channel


## Permission Matrix: Role vs. Action

| Action | Guest | Member | Moderator | Admin |
|--------|-------|--------|-----------|-------|
| View public communities | ✅ | ✅ | ✅ | ✅ |
| View public posts | ✅ | ✅ | ✅ | ✅ |
| View comments | ✅ | ✅ | ✅ | ✅ |
| View user profiles (public) | ✅ | ✅ | ✅ | ✅ |
| Register account | ✅ | ❌ | ❌ | ❌ |
| Log in | ✅ | ✅ | ✅ | ✅ |
| Create community | ❌ | ✅ | ✅ | ✅ |
| Create post (text/link/image) | ❌ | ✅ | ✅ | ✅ |
| Create comment | ❌ | ✅ | ✅ | ✅ |
| Reply to comment (nested) | ❌ | ✅ | ✅ | ✅ |
| Upvote post | ❌ | ✅ | ✅ | ✅ |
| Downvote post | ❌ | ✅ | ✅ | ✅ |
| Upvote comment | ❌ | ✅ | ✅ | ✅ |
| Downvote comment | ❌ | ✅ | ✅ | ✅ |
| Report content | ❌ | ✅ | ✅ | ✅ |
| Subscribe to community | ❌ | ✅ | ✅ | ✅ |
| Unsubscribe from community | ❌ | ✅ | ✅ | ✅ |
| Edit own post (within 15 min) | ❌ | ✅ | ✅ | ✅ |
| Edit own comment (within 15 min) | ❌ | ✅ | ✅ | ✅ |
| Delete own post | ❌ | ✅ | ✅ | ✅ |
| Delete own comment | ❌ | ✅ | ✅ | ✅ |
| Ban user (from community) | ❌ | ❌ | ✅ | ✅ |
| Remove post (own or other) | ❌ | ❌ | ✅ | ✅ |
| Remove comment (own or other) | ❌ | ❌ | ✅ | ✅ |
| Pin post (in community) | ❌ | ❌ | ✅ | ✅ |
| Unblock user | ❌ | ❌ | ✅ | ✅ |
| Change community settings | ❌ | ❌ | ✅ | ✅ |
| Assign moderator | ❌ | ❌ | ❌ | ✅ |
| Remove moderator | ❌ | ❌ | ❌ | ✅ |
| Manage global community settings | ❌ | ❌ | ❌ | ✅ |
| Approve/reject reports | ❌ | ❌ | ✅ | ✅ |
| View all reports on platform | ❌ | ❌ | ❌ | ✅ |
| View moderation logs | ❌ | ❌ | ✅ | ✅ |
| Delete community | ❌ | ❌ | ❌ | ✅ |
| Create admin account | ❌ | ❌ | ❌ | ✅ |
| Ban user system-wide | ❌ | ❌ | ❌ | ✅ |
| Revert content removal | ❌ | ❌ | ❌ | ✅ |
| Access audit logs | ❌ | ❌ | ❌ | ✅ |
| Disable platform-wide features | ❌ | ❌ | ❌ | ✅ |
| Reset password for any user | ❌ | ❌ | ❌ | ✅ |
| Force-email verification | ❌ | ❌ | ❌ | ✅ |
| View user logs | ❌ | ❌ | ❌ | ✅ |
| View karma score of others | ✅ | ✅ | ✅ | ✅ |
| Edit website terms of service | ❌ | ❌ | ❌ | ✅ |
| Make platform read-only | ❌ | ❌ | ❌ | ✅ |


## Role Transition and Assignment Rules

Role assignment and transitions are governed by immutable rules that prevent unauthorized elevation and ensure accountability.

### Initial Role Assignment
- ALL new users start as guests, even after registration
- After successful email verification, THE system SHALL automatically promote the user to member
- THE system SHALL NOT assign any role higher than member to users during registration or verification

### Promotion to Moderator
- ONLY admins can promote a member to moderator
- WHEN an admin promotes a member to moderator, THE system SHALL record:
  - The member's ID
  - The community to which the moderation rights are assigned
  - The date and time of promotion
  - The admin ID who authorized the promotion
  - A description: "Moderator assigned by system admin"
- THE system SHALL NOT allow a member to self-appoint as moderator
- THE system SHALL NOT allow a moderator to delegate moderation powers to another user
- THE system SHALL NOT allow a moderator to assign moderator roles in communities they do not moderate

### Promotion to Admin
- Admin roles can only be assigned by the original system administrator
- Admin creation can only occur through explicit server initialization or manual database update
- THE system SHALL NOT allow any member, moderator, or other admin to promote another user to admin
- When an admin is added, THE system SHALL:
  - Log the creation event with origin (manual/initial)
  - Notify ALL existing admins of the new admin's addition
  - Require the new admin to complete a security briefing
  - Require the new admin to agree to platform treatises
- THE system SHALL ONLY allow 3-5 admin accounts at any time

### Role Revocation
- THE system SHALL allow admins to revoke any moderator role at any time
- THE system SHALL allow admins to remove any user from any authorized community
- THE system SHALL allow admins to demote an admin to member or guest
- When a moderator is removed, THE system SHALL:
  - Immediately revoke access to moderation tools
  - Remove the [Mod] prefix from their username
  - Preserve all previous moderation logs
- When an admin is demoted, THE system SHALL:
  - Remove all admin-level privileges
  - Revoke access to the admin panel
  - Preserve all admin audit logs
  - Notify all other admins of the change

### Role Persistence and Inheritance
- Role assignments persist across sessions
- User roles cannot be changed by any client-side operations
- All role assignments are stored server-side in encrypted database records
- When a user logs in, THE system SHALL fetch their roles from the backend, not from client storage
- When a user's role changes, THE system SHALL immediately invalidate their session and require re-authentication
- No role inherits permissions from another role

### Role Revocation Triggers
- IF a member violates platform policies three times, THEN THE system SHALL auto-suspend their posting privileges but retain member status
- IF a moderator engages in abusive moderation practices (verified by admin review), THEN THE system SHALL revoke their moderator status
- IF an admin is flagged for misuse by platform security monitoring algorithms, THEN THE system SHALL suspend their access pending review
- IF an account has 180 days of inactivity, THEN THE system SHALL NOT remove any role—roles are permanent unless actively revoked
- IF an account is flagged for fraudulent registration, THEN THE system SHALL demote to guest and require identity verification before restoring any privileges


> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*