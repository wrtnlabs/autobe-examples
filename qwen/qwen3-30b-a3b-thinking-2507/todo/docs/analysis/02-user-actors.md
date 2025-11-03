# User Actors and Access Permissions

## Document Purpose
This document defines the user model, access permissions, and authentication flow for the Todo Application. It serves as the foundation for implementing secure user management without unnecessary complexity.

## Actor Definition

### Primary Actor: Standard User

The Standard User is the sole actor in this minimum viable product (MVP) system. This actor:

- Manages personal todo items exclusively
- Cannot view, edit, or delete other users' todos
- Has no administrative capabilities
- Does not require email verification or password reset

This actor definition aligns with the minimum functionality requirement, skipping all non-essential features like roles, teams, or permissions.

## Authentication Flow

### Login Flow (Event-driven)

WHEN a user submits valid credentials (email and password), THEN THE system SHALL validate the credentials against the user database and respond with a JWT token within 1 second.

WHEN a user provides incorrect credentials, THEN THE system SHALL display a 'Login failed. Please check your email and password.' message and return HTTP 401.

### Session Management

WHILE a user is authenticated, THEN THE system SHALL maintain a session token valid for 15 minutes with automatic renewal during active usage.

THE session SHALL expire after 15 minutes of inactivity, requiring users to re-authenticate.

## Permission Matrix

The following table defines all permissions available to the Standard User actor:

| Action               | Allowed | Reason                                    |
|----------------------|---------|-------------------------------------------|
| Create new todo      | ✅       | Core functionality of the MVP             |
| View user's todos    | ✅       | Essential for daily use                   |
| Edit existing todo   | ✅       | Basic management functionality            |
| Delete existing todo | ✅       | Basic management functionality            |
| Mark todo as complete| ✅       | Core functionality of the MVP             |
| View others' todos   | ❌       | Security and privacy constraint           |
| Manage system settings| ❌      | Excluded per minimum functionality        |
| Reset password       | ❌      | Not required for MVP                      |
| Access admin features| ❌      | No role-based system in MVP               |

## Business Justification for Minimal Model

The single-user model was chosen because:

- Reduces development effort (50% fewer permissions to implement)
- Eliminates authentication complexity (no email verification, password resets)
- Matches user preference for simple, no-frills todo management
- Supports the MVP focus on core features without distractions
- Follows the 'minimum necessary' principle for first version

## Required Business Rules

1. **Data Ownership Rule**

   WHEN a user creates a new todo item, THEN THE system SHALL associate it exclusively with that user's account.

   IF a user attempts to access content from another account, THEN THE system SHALL return HTTP 403 Forbidden.

2. **Concurrency Rule**

   WHILE multiple users are editing the same todo simultaneously, THEN THE system SHALL prevent edits from being saved by showing a 'Content in use' message.

   THIS RULE IS EXCLUDED FOR MVP TO MEET MINIMUM FUNCTIONALITY REQUIREMENTS.

3. **Validation Rule**

   IF a todo item has no title, THEN THE system SHALL display: 'Todo must have a title' and prevent saving.

## System Boundaries

- **Included**: User creation, todo management (create/view/edit/delete), completion tracking
- **Excluded**: Task sharing, due dates, categories, reminders, collaboration features

## Integration with Other Documents

For complete project context, refer to:
- [Service Overview](./01-service-overview.md) for business model and goals
- [Functional Requirements](./03-functional-requirements.md) for detailed task management features
- [User Scenarios](./06-user-scenarios.md) for step-by-step user journeys

> *Developer Note: This document defines **business requirements only**. All technical implementations (authentication architecture, database design, API specifications) are at the discretion of the development team.*