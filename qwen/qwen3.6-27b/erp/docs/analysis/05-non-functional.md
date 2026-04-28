**hrmPlatform — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Data Isolation

THE system SHALL strictly isolate all data by organization.
Users in one organization SHALL NOT access data from another organization under any circumstances.
Users belonging to multiple organizations SHALL only view and interact with data for their currently selected organization context.
Switching the organization context SHALL immediately restrict visible and modifiable data to the newly selected organization.
No cross-organization data visibility SHALL exist, regardless of shared email addresses or user identities.
Timelogs, timesheets, contracts, projects, tasks, employee records, departments, and activity logs SHALL be confined to their originating organization.

### Data Ownership

Organization owners SHALL retain ownership of all data generated within their organization, including employee records, projects, tasks, contracts, timelogs, timesheets, and activity logs.
When an organization is deleted, all associated organizational data SHALL be permanently deleted and unrecoverable.
The organization owner's user account SHALL persist after organization deletion but SHALL no longer be associated with any organization.
Users SHALL own their global profile information (display name, avatar image, phone number), which persists independently of any organization membership.
Organization-specific employee records SHALL remain bound to their originating organization and SHALL NOT transfer to another organization upon user account modification or deletion.
Deactivated employee records retain their organizational ownership and remain part of the originating organization's data.

### Access Control

Data access SHALL be governed by the organizational roles and permissions framework defined in the actors and authentication policies.
Employees SHALL access only the data their assigned role and permissions explicitly permit.
Permission changes SHALL take immediate effect, updating data visibility and modification rights without delay.
Employees SHALL view only their own timelogs, timesheets, and dashboard data unless granted broader access through specific organizational permissions.
Access to organization reports, activity logs, and organizational dashboards SHALL require explicit permissions.
Organization-specific data access SHALL not carry over when a user switches to a different organization context.

### Privacy Policies

User global profiles (display name, avatar image, phone number) SHALL be shared across all organizations the user belongs to for identification purposes.
Organization-specific employee details (department, position, employment type) SHALL remain private to the respective organization and SHALL NOT be visible outside it.
Contracts, timelogs, and timesheets SHALL remain private to their respective organizations.
Deactivated employees' historical data SHALL be preserved for organizational audit purposes.
Deactivated employees' historical data SHALL remain viewable to authorized users but SHALL NOT be modifiable, and deactivated employees SHALL NOT create new timelogs or submit timesheets.

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Soft Delete Policy

When an employee is deactivated, the employee record is preserved with a deactivated status.
Deactivated employees cannot log time or submit timesheets.
Historical data including timelogs and timesheets are preserved for deactivated employees.
Deactivated employees can be reactivated by restoring their active status.
When a project is archived, the project status changes to archived.
Archived projects cannot receive new timelogs.
Existing timelogs on archived projects are preserved.
When a project is completed, the project status changes to completed.
Completed projects cannot receive new timelogs.
Existing timelogs on completed projects are preserved.
When a timesheet is rejected, the timesheet returns to draft status.
The rejected timesheet and its timelogs are preserved for modification and resubmission.
When a user deletes their account:
The user's employee records in other organizations are marked as deactivated.
The user's historical data in all organizations is preserved.
Deactivated employee records retain department assignment, position title, and contract history.

### Data Retention Policy

All timelogs are retained indefinitely for audit purposes.
All timesheets are retained indefinitely regardless of approval status.
All activity logs are retained indefinitely for organizational audit trails.
All task history entries are retained indefinitely.
All employee contracts are retained indefinitely as historical records.
Past contracts cannot be edited and are preserved as immutable historical records.
Approved timesheets lock all included timelogs; these timelogs are retained indefinitely.
When an organization is deleted, all associated data is permanently removed from the system.

### Data Recovery Policy

Deactivated employees can be reactivated by users with the employee management permission.
Reactivation restores the employee's ability to log time and submit timesheets.
Rejected timesheets can be modified and resubmitted by the employee.
Resubmitted timesheets create a new submitted status while preserving the rejection history.
Permanently deleted organization data cannot be recovered.
Permanently deleted projects cannot be recovered if they were deleted without timelogs.
Permanently deleted roles cannot be recovered.
User account deletion is permanent and cannot be recovered once completed.

### Permanent Deletion Conditions

An organization can only be permanently deleted when:
All pending timesheets in the organization are resolved by being approved or rejected.
There are no active employee contracts in the organization.
When an organization is permanently deleted:
All employees, projects, tasks, timelogs, and timesheets are permanently deleted.
The owner's user account remains but is no longer associated with any organization.
A project can only be permanently deleted when the project has no timelogs associated with it.
When a project is permanently deleted, all tasks within that project are permanently deleted.
The deletion is irreversible and cannot be undone.
A custom role can only be permanently deleted when no employees are assigned to that role.
When a custom role is permanently deleted, the role definition is removed from the organization.

### User Account Deletion Recovery

A user can delete their account only when they are no longer the sole owner of any organization.
If a user is the sole owner of an organization, the user must transfer ownership or delete the organization before account deletion.
When a user deletes their account:
The user's employee records in all organizations are marked as deactivated.
The user cannot re-register with the same email to recover the account.
Historical data associated with the user across all organizations is preserved under deactivated status.