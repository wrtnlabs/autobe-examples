**hrmPlatform — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their identity, permissions, and access boundaries.

## guest Actor

A guest is an unauthenticated user who has not yet logged into the platform. Guests can create a new account by signing up with an email and password. Guests can also log in with existing credentials to become authenticated members. Before authentication, guests cannot access any organization data or perform operations within the platform. Guests cannot view employee lists, projects, tasks, or any time tracking information. Guests cannot create or manage organizations until they complete registration and log in. All platform features require authentication, so guests have no access to dashboards, reports, or activity logs. Guests exist outside the organization context and operate at the platform entry level only.

### Guest Actor Definition

A guest is an unauthenticated user who has not yet logged into the hrmPlatform. Guests exist in a pre-authentication state and operate at the platform entry point only. The guest actor represents any visitor who accesses the platform without valid credentials. Guests are outside any organization context and cannot interact with organization-scoped data. The platform treats all unauthenticated visitors as guests until they successfully authenticate. Guests have no identity within the system beyond their browser session at the authentication gateway.

### Guest Access Limitations

Guests cannot access any organization data including employee lists, projects, tasks, timelogs, timesheets, reports, or dashboards. Anonymous browsing is not allowed; all platform features require authentication. Guests cannot view any content that belongs to an organization or requires organization context. Guests cannot perform any operations within the platform such as creating, editing, or deleting any entity. Guests cannot access the activity log or any administrative features. All restricted features are inaccessible to guests. The only actions available to guests are creating a new account through registration or logging in with existing credentials. Upon successful authentication, guests transition to member status and gain access to organization selection and role-based permissions.

## member Actor

A member is an authenticated user who has logged in and selected an organization context to work within. Members can belong to multiple organizations but must select one organization to operate in at a time. Each member is assigned exactly one role within an organization: Owner, Manager, or Employee. The assigned role determines the member's permissions for managing employees, projects, time tracking, and viewing reports. Members can switch between organizations without logging out, but all actions remain scoped to the currently selected organization. Members cannot access data from organizations they do not belong to. Members with the Owner role have full access to all features including organization settings and role management. Members with the Manager role can manage employees and projects, approve timesheets, and view reports. Members with the Employee role can track time, submit timesheets, and view their own data only. All member operations enforce strict organization data isolation.

### Member Actor and Organization Context

A member is an authenticated user who has logged in with email and password and selected an organization context. Members can belong to multiple organizations but must select one organization to operate in at a time. Upon login, members select an organization from their available organizations. All member actions are scoped to the currently selected organization. Members cannot perform any operations until an organization context is selected. Members can switch between organizations without logging out. When switching organizations, the member's context changes to the newly selected organization. All data is strictly isolated per organization. Members cannot access data from organizations they do not belong to. Every member operation enforces strict organization data boundaries. A member's identity includes email, password, and a global profile with display name, avatar image, and phone number shared across all organizations.

### Role-Based Permission System

Each member is assigned exactly one role within an organization. The platform provides three built-in roles that cannot be deleted: Owner, Manager, and Employee. Organization owners can create custom roles with specific permission sets. Role assignment can be changed by members with employee management permission. The assigned role determines the member's permissions for all operations within the organization. Members cannot perform operations their role does not permit. Permission checks are enforced on every member action. The Owner role has full access to all features including organization settings management, role management, and member management. The Manager role can manage employees, manage projects, approve timesheets, and view organization reports. The Employee role can track time, submit timesheets, and view their own data only. Available permission categories include: organization management for editing organization settings, employee management for adding, editing, and deactivating employees, employee viewing for viewing employee lists and details, project management for creating, editing, and deleting projects and tasks, project viewing for viewing projects and tasks, time management for editing or deleting any employee's timelogs, time approval for approving or rejecting timesheets, time viewing for viewing all employees' timelogs and timesheets, and report viewing for viewing organization reports.

# Authentication Flows

Registration, login, logout, and session management from a user perspective.

## Registration and Login

Define user registration and login flows including validation and error handling.

### Registration Validation

Users register by providing an email address and password.

During registration, users must create an organization with:
- Name (required)
- Description (optional)
- Logo image (optional)
- Currency (required)
- Timezone (required)
- Fiscal start month (required)

The email address must not already be registered in the platform.
All required organization fields must be provided.

Upon successful registration, the user becomes the owner of the created organization.

### Login Authentication

Users log in by providing their registered email address and password.

The email address must be registered in the platform.
The password must match the registered password.

Upon successful login, users select which organization to work in. All actions are scoped to the selected organization.

Users belonging to only one organization are directed to that organization automatically.
Users can switch between organizations without logging out.

## Session and Logout

Define session behavior and logout from a user perspective.

### Session Management

After successful login, users establish an authenticated session with the platform.

Upon login, users must select an organization to work within. All actions during the session are scoped to the selected organization.

Users can switch between organizations they belong to without logging out. When switching organizations, the session remains active but the context changes to the newly selected organization.

All data access is restricted to the currently selected organization. Users cannot access data from other organizations within the same session.

### Logout

Users can log out from the platform at any time.

When a user logs out, the current session is terminated.

After logout, the user must log in again to access the platform.

Logging out does not affect the user's account, organization memberships, or any data.

# Account Lifecycle

Account creation, deletion, and password management.

## Account Management

Define how users create accounts, delete accounts, and change passwords.

### Account Creation

Users create an account by providing an email address and a password.
During initial sign-up, users must create an organization.
The organization requires: name, description, logo image, currency, timezone, and fiscal start month.
Upon successful registration, the user becomes the owner of the newly created organization.
If the email address is already registered, the request is rejected.
If required organization fields are missing, the request is rejected.

### Account Deletion

Users can delete their account at any time.
If the user is the sole owner of an organization, they must transfer ownership or delete the organization before deleting their account.
When an account is deleted, the user's employee records in other organizations are marked as deactivated.
Historical data (timelogs, timesheets) associated with the user in other organizations is preserved.
The user is removed from all organizations they belong to.

### Password Change

Authenticated users can change their password.
The user must provide their current password and a new password.
If the current password is incorrect, the request is rejected.