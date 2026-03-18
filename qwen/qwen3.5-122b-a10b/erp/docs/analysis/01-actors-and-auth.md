**hrmPlatform — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their identity, permissions, and access boundaries.

## guest Actor

A guest is an unauthenticated user who has not yet signed in to the platform. Guests can access public-facing pages including the sign-up and login screens. They can create a new user account by providing an email address and password. Guests can also recover access to their account through password reset functionality. Once authenticated, a guest transitions to a member actor with access to organization-scoped features. Guests cannot view any organization data, employee records, projects, or time tracking information. All data access requires authentication and organization context selection. The guest actor represents the entry point for new users before they join any organization.

### Unauthenticated User Access

A guest is an unauthenticated user who has not yet signed in to the platform. Guests cannot view any organization data, employee records, projects, tasks, timelogs, timesheets, or reports. All data access requires authentication and organization context selection. Guests have no access to employee management, time tracking, or organizational features. The guest actor represents the pre-authentication state before a user creates an account or signs in. Once a guest successfully authenticates, they transition to a member actor with access to organization-scoped features.

### Account Registration and Login

Guests can access the public sign-up page to create a new user account. The sign-up process requires providing an email address and password. Guests can access the login screen to authenticate with their existing email and password credentials. Account creation is the entry point for new users to join the platform. After successful account creation, the user can log in and create or join an organization. The sign-up and login pages are publicly accessible without authentication.

### Password Recovery Flow

Guests can recover access to their account through password reset functionality. The password recovery flow allows users to reset their password when they have forgotten their login credentials. Password recovery requires access to the registered email address to verify identity. Once the password is successfully reset, the user can log in with the new password. This flow is available to guests who have already created an account but cannot remember their password.

### Transition to Member Actor

After successful authentication, a guest transitions to a member actor with access to organization-scoped features. The transition occurs when the user provides valid email and password credentials. Once authenticated as a member, the user must select which organization to work in. All subsequent actions are scoped to the selected organization. Users can switch between organizations without logging out. The guest state ends when authentication is successful and organization context is established.

## member Actor

A member is an authenticated user who belongs to at least one organization and has an employee record within that organization. Members can select which organization context to work in when logging in and can switch between organizations without re-authentication. Each member is assigned exactly one role per organization that determines their permissions and access boundaries. Members can view their personal profile information which is shared across all organizations they belong to. They can log time entries for projects they are assigned to and submit timesheets for approval. Members can view their own timelogs, timesheets, and assigned tasks within their organization context. Members can use the live timer feature to track time in real-time. Members cannot access organization settings, manage other employees, or view organization-wide reports unless their role grants those permissions. Members can deactivate their own account but must transfer ownership or delete any organization they solely own first.

### Member Identity and Organization Membership

A member is an authenticated user who has created or joined at least one organization. Members have an employee record within each organization they belong to, which associates their user account with that organization's data.

Members can belong to multiple organizations simultaneously. Each organization maintains independent employee records for the same user, allowing the member to work across different organizational contexts.

The employee record in each organization contains the member's role assignment, department, position, employment type, and employment status. This record is separate from the member's global user profile and is specific to each organization.

### Organization Context Selection

When logging in, members must select which organization to work in. This selection establishes the organization context for all subsequent actions during the session.

Members can switch between organizations without logging out. When switching, the organization context changes immediately, and all data access is scoped to the newly selected organization.

All data visible to the member is strictly isolated to the currently selected organization. Members cannot view or access data from other organizations they belong to while working in a different organization context.

### Role Assignment and Permissions

Each member is assigned exactly one role per organization. The role determines the member's permissions and access boundaries within that organization.

Three built-in roles exist in every organization and cannot be deleted: Owner, Manager, and Employee. Organization owners can create custom roles with specific permission sets.

Role assignments can be changed by users with the employee management permission. When a role is changed, the member's permissions update immediately to reflect the new role's access rights.

The available permissions that can be assigned to roles include: organization settings management, employee management, employee viewing, project management, project viewing, time entry management, timesheet approval, all timelogs viewing, and report viewing.

### Personal Profile Access

Members have access to a global personal profile that is shared across all organizations they belong to. The profile includes display name, avatar image, and phone number.

Members can edit their personal profile information at any time. Changes to the profile are reflected across all organization contexts immediately.

Profile information is not organization-specific and remains consistent regardless of which organization context the member is currently working in.

### Time Entry Creation and Live Timer

Members can create time entries (timelogs) for projects they are assigned to. Each time entry includes a date, duration, project, optional task, optional description, and billable flag.

Members can only create time entries for themselves. They cannot create or modify time entries for other employees.

Members can use a live timer feature to track time in real-time. The timer requires selecting a project and optionally a task. Only one timer can be active per member at any time.

When the timer is stopped, it automatically creates a time entry with the calculated duration rounded to the nearest minute. Members can also discard the timer without creating a time entry.

Members can edit the description and project or task of a running timer before stopping it.

### Own Time Entry Viewing

Members can view their own time entries within the currently selected organization. The time entry list is paginated and can be filtered by date range, project, task, and billable status.

Members can edit their own time entries only if the entry is not part of an approved timesheet. Members can delete their own time entries only if the entry is not part of any submitted or approved timesheet.

Members can view all time entries they have created across all projects they are assigned to within the organization context.

### Timesheet Submission

Members can submit timesheets for approval. A timesheet represents a week's worth of time entries (Monday to Sunday).

Members can create a draft timesheet for a specific week. The draft automatically includes all time entries for that member in that week.

Members can add or remove time entries from a draft timesheet before submission. A timesheet cannot be submitted if it contains no time entries.

Members cannot submit a timesheet for a week if another timesheet for the same week is already submitted or approved. Once submitted, timesheets enter a pending approval state.

### Assigned Task Access

Members can view tasks assigned to them within projects they are assigned to. Members can see tasks with any status including open, in-progress, completed, and closed.

Members can filter tasks by status, priority, and assignment. Members can sort tasks by due date, priority, or creation date.

Members can view task details including title, description, status, priority, estimated hours, and due date. Members can view the task history which records status changes with timestamps and the user who made each change.

### Account Deactivation

Members can deactivate their own user account. Before deactivation, if the member is the sole owner of any organization, they must either transfer ownership to another member or delete the organization.

When a member deactivates their account, their employee records in all organizations are marked as deactivated. Deactivated employee records preserve all historical data including time entries, timesheets, and task assignments.

Deactivated members cannot log in or access any organization data. Their employee records remain in the system for historical reporting purposes but are marked as inactive.

# Authentication Flows

Registration, login, logout, and session management from a user perspective.

## Registration and Login

Define user registration and login flows including validation and error handling.

### User Registration

Users can create a new account by providing an email address and password.

The email address must be unique across the platform. If the email is already registered, account creation is rejected.

Users can set their display name during registration. The display name is part of their global profile shared across all organizations.

Users can add a phone number and avatar image to their profile during or after registration.

If the user's email matches a pending invitation, the user is automatically added to the inviting organization upon successful registration.

### User Authentication and Login

Users log in by providing their email address and password.

If the credentials are invalid, login is rejected.

After successful authentication, users must select which organization to work in from the list of organizations they belong to.

All actions performed by the user are scoped to the selected organization. Data from other organizations is not visible.

Users can switch between organizations without logging out. The new organization context is applied immediately.

Users can log out to end their current session. After logout, users must re-authenticate to access any organization data.

### Password Management

Users can change their password by providing their current password and a new password.

If the current password is incorrect, the password change is rejected.

The new password must meet the system's password requirements.

### Account Deletion

Users can delete their account.

If the user is the sole owner of an organization, they must either transfer ownership to another employee or delete the organization before their account can be deleted.

When a user deletes their account, their employee records in other organizations are marked as deactivated.

The user's global profile data is removed from the system.

## Session and Logout

Define session behavior and logout from a user perspective.

### Session Management

When users log in successfully, the system creates a session scoped to a specific organization. Users must select which organization to work in during the login process. All actions performed during the session are restricted to the selected organization's data. Users can switch between organizations they belong to without logging out. When switching organizations, the session is updated to the new organization context.

### Logout Behavior

Users can log out from their current session at any time. When users log out, the session is terminated and organization context is cleared. Users must log in again to access the system. Logging out does not affect any pending timesheets or unsaved timelogs; users should complete or save their work before logging out.

### Account Security

Users can change their password at any time by providing their current password and a new password. When users delete their account, the system validates that they are not the sole owner of any organization. If they are the sole owner of an organization, they must transfer ownership to another user or delete the organization before account deletion can proceed. When a user account is deleted, their employee records in other organizations are marked as deactivated. The user's global profile data is removed. Users who belong to multiple organizations only lose access to all organizations upon account deletion.

# Account Lifecycle

Account creation, deletion, and password management.

## Account Management

Define how users create accounts, delete accounts, and change passwords.

### Account Creation

Users can create an account by providing an email address and password.

During initial sign-up, users create their first organization. The organization requires a name and may include a description, logo image, currency, timezone, and fiscal start month.

The email address must be unique across the platform. If the email is already registered, account creation is rejected.

The password must meet security requirements (as defined by the system).

Upon successful registration, the user is automatically logged in and becomes the owner of the created organization.

The user's global profile is created with display name, avatar image, and phone number fields, which can be edited later.

If the user already has an account and is invited to join an existing organization via email, the invitation is processed without requiring a new account.

### Account Deletion

Users can delete their account from the platform.

Before account deletion, the user must satisfy the following conditions:
- If the user is the sole owner of any organization, they must either transfer ownership to another employee or delete the organization first.
- The user cannot be the only remaining owner across all organizations they belong to.

When a user account is deleted:
- The user's account is permanently removed from the platform.
- The user's employee records in all other organizations are marked as deactivated.
- Deactivated employee records preserve historical data (timelogs, timesheets, contracts).
- The user can no longer log in or access any organization data.

Users who are not owners of any organization can delete their account without additional steps.

Account deletion is irreversible. Users should be warned before confirming deletion.

### Password Management

Users can change their password after logging in.

To change the password, users must provide their current password for verification.

The new password must meet security requirements (as defined by the system).

The new password must be different from the current password.

After a successful password change:
- The user remains logged in to their current session.
- The user may be required to log in again on other devices or sessions (depending on system security policy).

If the current password is incorrect, the password change is rejected.

If the new password does not meet security requirements, the password change is rejected.

Users who have forgotten their password can initiate a password recovery flow (separate from password change, handled through authentication mechanisms).