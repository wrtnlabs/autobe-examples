**hrmPlatform — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Data Isolation

All data is strictly isolated per organization. Each organization operates independently with its own employees, projects, departments, contracts, timelogs, timesheets, tasks, and activity logs.

Employees in one organization cannot see data from another organization, even if the same user account belongs to multiple organizations.

Users who belong to multiple organizations only see data for their currently selected organization. When a user switches organizations, the system displays only the data associated with the newly selected organization.

All user actions are scoped to the selected organization context. Creating, editing, or viewing any entity affects only the currently selected organization's data.

When an organization is deleted, all data associated with that organization is permanently deleted, including employees, projects, tasks, timelogs, timesheets, departments, contracts, and activity logs. The user accounts themselves remain but are no longer associated with the deleted organization.

### Data Ownership

The organization owns all organizational data, including departments, projects, tasks, custom roles, and activity logs. This data exists only within the context of the organization and is deleted when the organization is deleted.

Each user owns their global profile, which includes display name, avatar image, and phone number. The profile is shared across all organizations the user belongs to and persists independently of any single organization.

Employees own their personal work data, including their own timelogs, timesheets, and timer entries. This data is scoped to the organization where it was created.

Employee records are owned by the organization. Each employee record links a user account to an organization with a specific role, department, position, and employment type.

Contracts are owned by the organization and associated with specific employee records. Historical contracts remain part of the organization's records even after an employee is deactivated.

When a user deletes their account, their employee records in other organizations are marked as deactivated but the historical data they created (timelogs, timesheets, task history) remains associated with the organization.

### Privacy Boundaries

User global profiles (display name, avatar image, phone number) are visible across all organizations the user belongs to. Users can edit their own profile, and changes reflect in all organizations.

Within an organization, employee information visibility is determined by organizational roles. Employees with management or administrative roles can view colleague names, roles, departments, positions, and employment types. Regular employees without these roles cannot view detailed colleague information.

Timelogs and timesheets are private to the employee by default. Managers and administrators can view all employees' time tracking data, while regular employees can only view their own timelogs and timesheets.

Task assignments are visible to project members. Non-members cannot see task details unless granted broader project access.

Activity logs record user actions but are only visible to organization administrators. Regular employees cannot view the activity log.

Contract details including pay rate, pay period, and working hours are visible to the employee and users with administrative access. Users without this access cannot view contract information.

Organization reports and dashboards showing aggregated data across all employees are accessible to users with reporting access.

When an employee is deactivated, their historical data including timelogs, timesheets, and contracts is preserved but they cannot access the system to view it. Users with appropriate access levels can still view the deactivated employee's historical records.

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Deactivated Employee Data Retention

When an employee is deactivated, all historical timelogs and timesheets associated with that employee are preserved.
Deactivated employee records remain in the system and can be reactivated.
Reactivated employees regain access to their historical timelogs and timesheets.
Deactivated employees cannot create new timelogs or submit new timesheets.
The employee's department and position information is retained upon deactivation.
Contract history for deactivated employees remains accessible to users with employee:view permission.

### Immutable Contract Records

Past contracts cannot be edited once a new contract becomes active.
Contract history serves as an immutable record of employment terms.
Each contract's start date, end date, pay rate, pay period, and working hours are preserved.
Users with employee:view permission can view all historical contracts for any employee.
Employees can view their own contract history.
When a new contract is created, the previous active contract's end date is automatically set to the day before the new contract starts.

### Organization Deletion and Permanent Data Removal

When an organization is deleted, all employees, projects, tasks, timelogs, and timesheets associated with that organization are permanently deleted.
Organization deletion is irreversible; deleted data cannot be recovered.
Before an organization can be deleted, all pending timesheets must be resolved (approved or rejected).
Before an organization can be deleted, there must be no active employee contracts.
The organization owner's user account remains but is no longer associated with any organization.
Custom roles, departments, and activity logs for the organization are permanently deleted.

### User Account Deletion and Data Handling

When a user deletes their account, their employee records in other organizations are marked as deactivated.
If the user is the sole owner of an organization, they must transfer ownership or delete the organization before deleting their account.
User profile information (display name, avatar, phone number) is permanently deleted upon account deletion.
Historical timelogs and timesheets created by the user remain associated with their deactivated employee records.
Activity log entries recording actions performed by the user are preserved for audit purposes.
Pending invitations sent to the user's email are cancelled upon account deletion.

# Storage Capacity

Storage capacity planning and CDN requirements.

## Storage Capacity Requirements

Define storage requirements and capacity planning for file storage.

### Organization and User Images

Organizations have a logo image attribute that can be uploaded during organization setup or when editing organization settings.

Users have an avatar image attribute for their global profile.

Each organization stores one logo image. Each user account stores one avatar image.

Images are scoped to the organization context. Users can only access logo images for organizations they belong to. User avatar images are shared across all organizations a user belongs to.

# Real-time Communication

WebSocket/SSE connection policies and performance requirements.

## WebSocket Security and Performance

Define connection limits, heartbeat intervals, reconnection policies, and security requirements for real-time communication.

### Secure Communication

All data transmitted between the user's device and the platform must be protected to maintain organization data isolation. Communication channels must ensure that organization-scoped data cannot be accessed by unauthorized users. The platform must enforce organization context on all requests to prevent cross-organization data leakage. Secure communication must be maintained for all user actions including time tracking, timesheet submission, and data access.

### Session Management

When users switch between organizations, their session must maintain proper organization scoping without requiring re-authentication. All actions performed after switching organizations must be scoped to the newly selected organization. User sessions must be invalidated when users log out or delete their accounts. Session data must not expose information from organizations the user does not belong to.

### Connection Integrity

The platform must maintain data integrity during all user interactions. If a connection is interrupted during a time tracking session, the system must preserve any recorded timer data. Incomplete operations due to connection issues must not corrupt existing data. Users must be notified if their action cannot be completed due to connection problems.

### Timer Session Handling

Employees using the live timer feature must have their timer state preserved during their session. If an employee's connection is interrupted while a timer is running, the timer continues to track time locally until explicitly stopped. When the employee reconnects and stops the timer, the system must calculate the duration correctly based on the original start time. Timer data must be synchronized with the server when the connection is restored.