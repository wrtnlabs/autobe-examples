# Functional Requirements for Economic/Political Discussion Board

## User Authentication

### Registration and Login

- Users can register with email and password.
- Users can log in with email and password.
- Users can log out to end their session.
- System maintains user sessions securely.
- Users can verify their email address.
- Users can reset forgotten passwords.
- Users can change their password.
- Users can revoke access from all devices.

### Role-Based Permissions

- **Guest**: Unauthenticated users who can only view public content and register/login.
- **Member**: Authenticated users who can create and comment on discussion threads.
- **Moderator**: Users with elevated permissions who can manage content and enforce community guidelines.
- **Admin**: System administrators with full access to manage users, content, and system settings.

### Password Recovery

- Users can request a password reset link via email.
- Password reset links expire after 24 hours.
- Users can set a new password using the reset link.

## Discussion Thread Creation

### Thread Creation

- Members can create new discussion threads.
- Threads require a title and content.
- Threads can be categorized (e.g., economics, politics, general).
- Threads can be edited by the creator within 24 hours.
- Threads can be deleted by the creator or moderators.

### Thread Management

- Threads can be pinned by moderators.
- Threads can be locked by moderators to prevent new comments.
- Threads can be moved to different categories by moderators.

### Thread Categories

- Categories include economics, politics, general, and others.
- Categories can be created and managed by admins.

## Commenting System

### Comment Creation

- Members can comment on discussion threads.
- Comments require content.
- Comments can be edited by the creator within 24 hours.
- Comments can be deleted by the creator or moderators.

### Comment Management

- Comments can be flagged by users for moderator review.
- Comments can be hidden by moderators.
- Comments can be restored by moderators.

### Comment Moderation

- Moderators can review flagged comments.
- Moderators can approve or reject flagged comments.
- Moderators can delete inappropriate comments.

## Content Moderation

### Moderation Tools

- Moderators can view reported content.
- Moderators can take action on reported content (e.g., delete, warn, ban).
- Moderators can view user activity logs.

### Reporting System

- Users can report inappropriate content.
- Reports include a reason and description.
- Reports are reviewed by moderators.

### Enforcement of Community Guidelines

- Community guidelines are outlined in the service overview.
- Violations of guidelines result in warnings, bans, or account termination.

## User Management

### User Profiles

- Users can view and edit their profiles.
- Profiles include username, email, and bio.
- Users can upload a profile picture.

### User Roles and Permissions

- Admins can assign roles to users.
- Admins can revoke roles from users.
- Admins can view and manage user roles and permissions.

### User Activity Tracking

- Admins can view user activity logs.
- Admins can track user actions (e.g., thread creation, comments).
- Admins can ban users for violating community guidelines.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*