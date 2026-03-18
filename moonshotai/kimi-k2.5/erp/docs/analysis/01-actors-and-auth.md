**erpHrm — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their identity, permissions, and access boundaries.

## guest Actor

A guest is any unauthenticated visitor who has not signed into the platform. Guests can access the sign-up page to create a new account and organization, or the login page to access an existing account. Guests cannot view any organization-specific data, employee records, projects, or time tracking information. When a guest receives an email invitation to join an organization, they must first create an account before gaining access. Guests have no permissions within any organization context until they complete authentication. The system treats all unauthenticated requests as originating from the guest actor, who is restricted to public authentication pages only. Guests cannot switch organizations, view dashboards, or perform any business operations within the platform.

### Guest Actor Definition

A guest is a non-authenticated user who accesses the system without creating an account or logging in.

Guests have a temporary session that allows limited interaction with the system. No persistent identity information is required from guests. The system recognizes guests through session-based identification without requiring registration credentials.

Guests may choose to convert to registered members at any point by completing the registration process. Upon conversion, any eligible data or progress associated with the guest session may be transferred to the new member account, subject to business rules regarding data migration.

The guest actor represents the most restricted access level in the system, intended for users who want to browse or preview functionality before committing to registration.

### Guest Permissions and Access

Guests may browse publicly available content and view items explicitly marked as public. Guests can access features designated for public consumption without authentication.

Guests may initiate certain temporary workflows that do not require identity persistence, such as previewing content or calculating estimates. These workflows may be abandoned or converted to member-owned workflows upon registration.

Guests may not access protected resources, personal data, or functionality reserved for authenticated members. Access to member-specific features is prohibited until authentication is completed.

Guests may not modify shared resources or content owned by other actors. Write operations on persistent entities require member or elevated privileges.

If a guest attempts to access restricted functionality, the system may present options to register or log in to obtain appropriate access rights.

## member Actor

A member is an authenticated user who belongs to one or more organizations and has a global profile shared across all their organizations. Members select an organization context during login and can switch between organizations without logging out. Each member is assigned exactly one role per organization that determines their permissions, such as Owner with full access, Manager with employee and project management capabilities, or Employee with time tracking and self-data viewing rights. Members can also be assigned custom roles with specific permission sets defined by organization owners. Members with active status can perform operations allowed by their role, while deactivated members lose access to organization features while preserving historical data. Organization owners can manage roles and members, approve timesheets, and configure organization settings. Members can track time, submit timesheets, and view their own data based on their assigned permissions.

### Member Identity

A member is an authenticated user who has successfully completed the login process. Each member has a unique identity established through email-based authentication. Members can belong to multiple organizations simultaneously while maintaining a single unified identity across the entire platform.

### Multi-Organization Membership

Members can be associated with one or more organizations. Each organization membership is independent, with separate roles, permissions, and data access rights. A member's participation in one organization does not affect their status or permissions in another organization. When a member is invited to an organization, they receive a membership record linking their user identity to that organization.

### Organization Context Selection

Upon successful authentication, members must select which organization they wish to work in. This selection establishes the organization context for the current session. All subsequent operations, data views, and permissions are scoped to the selected organization. Members can only access data and perform actions within their currently selected organization context.

### Switching Organizations

Members can switch to a different organization context without logging out of their account. When switching organizations, the member's session is updated to reflect the new organization context, and all subsequent operations are scoped to the newly selected organization. The switch operation preserves the member's authentication state while changing the data isolation boundary.

### Global Profile

Each member maintains a global profile that is shared across all organizations they belong to. The profile contains personal information that is not organization-specific.

### Profile Attributes

The global profile includes the member's display name, avatar image, and phone number. These attributes are visible across all organizations the member participates in.

### Profile Management

Members can edit their global profile information at any time. Changes to the profile are immediately reflected across all organizations. Profile edits do not affect organization-specific attributes such as department assignments, positions, or role assignments within individual organizations.

### Role Assignment and Permissions

Each member is assigned exactly one role per organization. The role determines what actions the member can perform and what data they can access within that organization. Role assignments are organization-specific and do not carry over between organizations.

### Built-in Roles

Every organization includes three built-in roles that cannot be deleted:

**Owner Role**
The owner has full access to all organization features. Owners can manage organization settings, create and delete custom roles, manage member roles and permissions, approve or reject timesheets, view all reports, and perform administrative actions across the organization. The creator of an organization automatically receives the owner role.

**Manager Role**
The manager can manage employees including inviting new members and deactivating existing ones, manage projects and tasks, approve or reject timesheets submitted by employees, and view organization reports. Managers cannot modify organization settings or manage roles.

**Employee Role**
The employee can track time by creating timelogs, submit timesheets for approval, view their own timelogs and timesheets, and view projects and tasks assigned to them. Employees cannot access other members' data or administrative functions.

### Custom Roles

Organization owners can create custom roles with specific sets of permissions. Each custom role has a name and a collection of permissions selected from the available permission set. Custom roles provide flexibility to define specialized access patterns beyond the three built-in roles.

Available permissions for custom roles include: managing organization settings, managing employees, viewing employee information, managing projects, viewing projects, managing timelogs, approving timesheets, viewing all timelogs and timesheets, and viewing reports.

### Role Assignment Changes

Members with permission to manage employees can change the role assignment of other members within the organization. Each member must always have exactly one assigned role. Role changes take effect immediately and apply to all subsequent operations by that member.

### Active and Deactivated Status

Each member's organization membership has a status that determines whether they can actively use organization features.

### Active Status

Members with active status can perform all operations permitted by their assigned role. Active members can log time, submit timesheets, access projects, and utilize all features corresponding to their permissions.

### Deactivated Status

Deactivated members cannot log time, submit timesheets, or access organization features. Historical data created by deactivated members, including timelogs and timesheets, is preserved and remains visible to users with appropriate permissions. Deactivated members can be reactivated by users with employee management permissions.

### Status Transitions

Members with employee management permissions can deactivate active members and reactivate deactivated members. Deactivation is typically used when an employee leaves the organization or takes extended leave. Reactivation restores the member's access according to their assigned role and permissions.

### Permission-Based Operations

All operations within an organization are governed by the permissions associated with the member's current role. Members can only perform actions for which they have explicit permission.

### Permission Enforcement

When a member attempts to perform an action, the system verifies that their current role includes the required permission. If the permission is not present, the action is rejected. Permissions are checked for every operation based on the member's currently selected organization context.

### Data Access Boundaries

Members can only access data within their currently selected organization. Data from other organizations, even those the member belongs to, is not accessible during the current session. Within the selected organization, members can only access data permitted by their role permissions. For example, members without permission to view all timelogs can only view their own timelogs, while members with viewing permission can access timelogs from all organization members.

# Authentication Flows

Registration, login, logout, and session management from a user perspective.

## Registration and Login

Define user registration and login flows including validation and error handling.

### Registration Flow

Unauthenticated users can register for a new account by providing an email address and a password.

The email address must be unique across the entire platform. If the email is already associated with an existing account, the registration request is rejected.

The password must meet minimum security requirements (sufficient length and complexity).

During registration, the user must create an organization. Each organization requires: a name, a description (optional), a logo image (optional), a currency for financial calculations, a timezone for scheduling, and a fiscal start month.

Upon successful registration:
- A user account is created with the provided email and password
- An organization is created with the provided settings
- The user is designated as the owner of the organization
- The owner role is automatically assigned to the user within that organization
- A global user profile is created with default values that can be edited later

The user is automatically logged in after successful registration and placed into the newly created organization's context.

### Login Flow

Registered users can authenticate by providing their email address and password.

If the email does not match any existing account, the login request is rejected.

If the password does not match the credentials stored for the provided email, the login request is rejected.

Upon successful authentication, if the user belongs to multiple organizations, the user must select which organization to work in before accessing the platform. This establishes the organization context for the session.

If the user belongs to only one organization, that organization is automatically selected as the context.

All subsequent actions within the session are scoped to the selected organization. The user can only view and interact with data belonging to that organization.

Users remain authenticated until they explicitly log out or the session expires due to inactivity.

### Organization Context Selection

Authenticated users who belong to multiple organizations can view a list of all organizations they are members of.

Each organization in the list displays the organization name and the user's role within that organization.

Users can select any organization from this list to switch their current organization context without logging out.

When switching organization context:
- The previous organization's data is no longer accessible
- All subsequent actions apply to the newly selected organization
- The user's permissions are re-evaluated based on their role in the new organization

Users can view their current organization context at any time during their session.

### Session Authentication State

Authenticated users have access to platform features based on their role permissions within the current organization context.

Unauthenticated users (guests) can only access the registration and login interfaces. Guests cannot view any organization data, employee information, projects, or time tracking data.

The system maintains the authentication state throughout the user session. Users must re-authenticate if their session expires or if they access the platform from a new device or browser.

If a user attempts to access a resource without authentication, the request is rejected and the user is directed to the login interface.

### Error Conditions for Authentication

Registration is rejected when the provided email address is already in use by another account.

Login is rejected when the email address does not exist in the system.

Login is rejected when the provided password does not match the stored credentials for the given email.

Organization context selection is rejected if the user attempts to access an organization they do not belong to.

Requests to access organization-scoped resources are rejected if the user has not selected an organization context or if the user does not have permission to access the requested resource within the current organization context.

## Session and Logout

Define session behavior and logout from a user perspective.

### Organization Context Selection

When a user with membership in multiple organizations authenticates successfully, the system presents a list of organizations the user belongs to. The user must select one organization to enter before accessing organization-scoped features. The selected organization becomes the active context for the duration of the session until changed or terminated.

If the user belongs to only one organization, the system automatically selects that organization as the active context without requiring an explicit choice.

If the user has no organization memberships, the system prompts the user to create an organization before accessing organization-scoped features.

### Session Organization Context

All operations within a session are scoped to the currently selected organization. Data from other organizations remains inaccessible during the active session context. The system maintains the active organization context throughout the session duration.

The organization context determines which data the user can view and manipulate, including: employee records, projects, tasks, timelogs, timesheets, and organizational settings. Users cannot access or modify data belonging to organizations other than the one selected for the current session context.

### Organization Switching

Users may change the active organization context without terminating their session. When a user initiates an organization switch, the system presents the list of organizations where the user has membership. Upon selecting a different organization, the system updates the active session context to the newly selected organization.

After switching organizations, all subsequent operations apply to the newly selected organization's data. The previous organization's data is no longer accessible until the user switches back or selects that organization again.

### Logout

Users can terminate their session at any time through the logout operation. Upon logout, the system ends the current session and clears the active organization context. The user returns to an unauthenticated state.

After logout, the user must authenticate again to access any organization-scoped features. The system does not retain the previous organization context after logout; the user must reselect an organization upon subsequent authentication.

### Session Duration and Termination

The system maintains the user's session until the user explicitly logs out or the session expires due to inactivity. Upon session expiration, the system terminates the session and clears the organization context, requiring re-authentication for continued access.

If the user's account is deactivated by an administrator while the user has an active session, the system terminates the session upon the next operation attempt and requires re-authentication.

# Account Lifecycle

Account creation, deletion, and password management.

## Account Management

Define how users create accounts, delete accounts, and change passwords.

### Password Management

Authenticated users can change their password at any time. To change a password, the user must provide their current password and the new password. If the current password is incorrect, the password change request is rejected. If the current password is correct, the system updates the user's password and the change takes effect immediately for subsequent login attempts.

### Account Deletion

Authenticated users can delete their account permanently. Before an account can be deleted, the system checks whether the user is the sole owner of any organization. If the user is the sole owner of one or more organizations, the deletion request is rejected until the user either transfers ownership of those organizations to another member or deletes the organizations entirely.

When an account is deleted:
- If the user has employee records in organizations where they are not the owner, those employee records are marked as "deactivated" and remain in the organization for historical reference
- The user's global profile (display name, avatar, phone number) is removed
- The user's account credentials are removed from the system
- All organization data (projects, tasks, timelogs, timesheets) remains intact for organizations where the user was a member but not the sole owner

Account deletion is irreversible. Once deleted, the user must create a new account with a new email address to use the platform again.

### Account Creation Overview

New accounts are created through the registration process where users provide an email address and password. The email address must be unique across the platform and is not already associated with an existing account. During initial registration, the user also creates their first organization, establishing them as the owner of that organization. Account creation automatically provisions a global user profile that can be shared across all organizations the user joins or creates. See the Registration module for detailed account creation workflows.