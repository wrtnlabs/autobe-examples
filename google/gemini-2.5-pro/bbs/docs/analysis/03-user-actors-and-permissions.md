# User Actors and Permissions

## 1. Introduction
This document defines the user roles (actors) and their corresponding permissions for the discussionBoard service. The purpose is to establish a clear framework for access control, ensuring that users can only perform actions appropriate to their role. This specification will guide the implementation of the authentication and authorization logic.

## 2. Actor Definitions
The system identifies three distinct types of actors, each with a specific set of capabilities and restrictions.

### 2.1. Guest
A Guest is an unauthenticated user who is visiting the site. This is the default role for any new visitor who has not logged into an account. Their interaction with the system is limited to passive consumption of public content.

**Capabilities:**
- View and read publicly available articles.
- View comments associated with articles.

**Restrictions:**
- Guests cannot create, edit, or delete any content.
- Guests cannot post articles or comments.
- Guests cannot attach files or images.
- Guests cannot access any user-specific or administrative functions.

**Requirements:**
- **Event-driven Requirement**: WHEN a user is not authenticated, THE system SHALL assign them the "Guest" role.
- **Ubiquitous Requirement**: THE system SHALL provide read-only access to all public articles for Guests.
- **Unwanted Behavior Requirement**: IF a Guest attempts to perform an action requiring authentication (e.g., creating a post), THEN THE system SHALL prompt them to log in or register.

### 2.2. Member
A Member is an authenticated user who has successfully registered and logged into the system. Members are the primary content contributors and form the core of the community. They have full control over their own contributions but cannot alter content created by other users.

**Capabilities:**
- Perform all actions available to Guests.
- Create new articles with a title and content.
- Attach images and other files to their own articles.
- View, edit, and delete their own articles.
- Post comments on articles.
- View, edit, and delete their own comments.
- Manage their own user account (e.g., change password).

**Restrictions:**
- Members cannot edit or delete articles or comments posted by other Members.
- Members cannot access administrative functions, such as content moderation for other users or user management.

**Requirements:**
- **Event-driven Requirement**: WHEN a user successfully authenticates, THE system SHALL grant them "Member" permissions.
- **Ubiquitous Requirement**: THE Member SHALL have full create, read, update, and delete (CRUD) permissions over their own articles.
- **Ubiquitous Requirement**: THE Member SHALL have full create, read, update, and delete (CRUD) permissions over their own comments.
- **Unwanted Behavior Requirement**: IF a Member attempts to edit or delete content owned by another Member, THEN THE system SHALL deny the action.

### 2.3. Admin
An Admin (Administrator) is a privileged user with the highest level of access. They are responsible for maintaining the health of the discussion board, moderating content, and managing the user base. This role is assigned manually by the system operator.

**Capabilities:**
- Perform all actions available to Members.
- View, edit, and delete any article on the platform, regardless of the original author.
- View, edit, and delete any comment on the platform, regardless of the original author.
- Manage user accounts, which includes the ability to view user lists and suspend (ban) misbehaving Members.
- Access system-wide settings and administrative dashboards.

**Restrictions:**
- The Admin role is a position of trust and has no system-enforced restrictions on content management. Their actions are governed by the platform's operational policies.

**Requirements:**
- **Ubiquitous Requirement**: THE Admin SHALL have permission to read, update, and delete any article on the system.
- **Ubiquitous Requirement**: THE Admin SHALL have permission to read, update, and delete any comment on the system.
- **State-driven Requirement**: WHILE in the user management panel, THE system SHALL allow the Admin to modify the status of any Member account (e.g., from "active" to "suspended").

## 3. Permission Matrix
The following table provides a summary of the key permissions granted to each actor.

| Feature / Action | Guest | Member | Admin |
| :--- | :---: | :---: | :---: |
| **Article Management** | | | |
| View Public Articles | ✅ | ✅ | ✅ |
| Create Article | ❌ | ✅ | ✅ |
| Edit Own Article | ❌ | ✅ | ✅ |
| Delete Own Article | ❌ | ✅ | ✅ |
| Edit Others' Articles | ❌ | ❌ | ✅ |
| Delete Others' Articles | ❌ | ❌ | ✅ |
| **Comment Management** | | | |
| View Comments | ✅ | ✅ | ✅ |
| Create Comment | ❌ | ✅ | ✅ |
| Edit Own Comment | ❌ | ✅ | ✅ |
| Delete Own Comment | ❌ | ✅ | ✅ |
| Edit Others' Comments | ❌ | ❌ | ✅ |
| Delete Others' Comments | ❌ | ❌ | ✅ |
| **File Management** | | | |
| Attach Files to Own Article | ❌ | ✅ | ✅ |
| Delete Files from Own Article | ❌ | ✅ | ✅ |
| Delete Files from Others' Articles | ❌ | ❌ | ✅ |
| **Account Management** | | | |
| Register for an Account | ✅ | N/A | N/A |
| Login / Logout | ✅ | ✅ | ✅ |
| Change Own Password | ❌ | ✅ | ✅ |
| **Administration** | | | |
| Access Admin Panel | ❌ | ❌ | ✅ |
| Manage Users (Suspend/Unsuspend) | ❌ | ❌ | ✅ |
| Manage All Site Content | ❌ | ❌ | ✅ |
