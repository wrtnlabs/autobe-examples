**hrmPlatform — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Data Ownership

Each organization owns all data created within its context, including employees, projects, tasks, timelogs, timesheets, and activity logs.

The organization owner has the right to manage, export, and delete all organization data according to organizational policies.

Each user owns their personal profile information, including display name, avatar, and phone number, which is shared across all organizations the user belongs to.

Employees retain ownership of their personal contract information, including pay rates and employment terms, even when deactivated.

When an organization is deleted using the hard_delete method, the organization's data is deleted and the owner's personal account and profile information are retained.

Users cannot access or view data from organizations where they are not members, even if they own other organizations.

### Data Isolation

All data is strictly isolated by organization. Employees in one organization cannot see any data from another organization.

Users who belong to multiple organizations can only see data for their currently selected organization. All actions are scoped to the selected organization context.

When a user logs in, they must select which organization to work in. Until an organization is selected, no organization data is accessible.

Organization boundaries are enforced at all levels. A user with access to multiple organizations sees separate, isolated views for each organization.

Deleted organizations are deleted using the hard_delete method with no data accessible afterward, even by the former owner.

Organization-specific settings including currency, timezone, and fiscal calendar are isolated and do not affect other organizations.

### Access Control

Access to data is controlled through organization-level roles with specific permissions.

Users with employee:view permission can view employee lists and employee details for the organization.

Users with employee:manage permission can add, edit, and deactivate employee records.

Users with project:view permission can view all projects and tasks within the organization.

Users with project:manage permission can create, edit, delete projects and tasks.

Users with time:view_all permission can view all employees' timelogs and timesheets.

Users with time:manage permission can edit or delete any employee's timelogs.

Users with time:approve permission can approve or reject timesheets for all employees.

Users with report:view permission can access organization reports and dashboards.

Users with org:manage permission can view the full activity log and edit organization settings.

Role assignments determine what data each employee can access within the organization.

### Privacy

Employees can only view their own timelogs and timesheets unless they have time:view_all permission.

Employees can view their own contract information including pay rate and employment terms.

Managers can view all employee data for employees in their organization but cannot access data from other organizations.

Personal profile information (display name, avatar, phone number) is visible to all members of the organization.

Contract pay rate information is sensitive and only visible to the employee and users with employee:manage or employee:view permission.

Activity log entries are only visible to users with org:manage permission.

Project assignment information is visible to all users with project:view permission.

Task assignment information is visible to users with project:view permission and to the assigned employee.

Deactivated employees' historical data (timelogs, timesheets, contracts) is preserved but they cannot log new time or submit new timesheets.

Users cannot export or share employee data outside the organization without appropriate permissions.

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Soft Delete

When employees are deactivated, their records are marked as soft-deleted instead of being removed.

Soft-deleted employee records retain all historical data including timelogs and timesheets.
Soft-deleted employees cannot create new timelogs or submit timesheets.
Soft-deleted projects and tasks retain their data but cannot receive new timelogs or task updates.
Soft-deleted timesheets retain their approval or rejection status.
Deactivated employees can be reactivated to restore their ability to log time.
Soft-deleted items remain visible in activity logs for auditing purposes.

### Data Retention

All timelog data is retained permanently for payroll and compliance purposes.
All timesheet data (approved and rejected) is retained permanently for payroll and compliance purposes.
Employee contract history is retained permanently as immutable historical records.
Project data is retained permanently even after project completion or archival.
Activity logs are retained permanently for auditing and compliance purposes.
Deactivated employee records retain their historical data permanently.
Organization data is retained for the entire lifespan of the organization.
Timesheet data includes all timelogs within the reported week and is preserved as a unit.

### Data Recovery

Deactivated employees can be reactivated by users with employee management permission.
Reactivated employees regain their ability to log time and submit timesheets.
Restored employee records retain all historical data including past timelogs and timesheets.
Employees can view their own contract history after deactivation.
Activity logs record when employees are reactivated from soft-delete.
Deactivated employees can view their own historical timelogs and timesheets.
Organization owners can review and restore deleted organization data only before hard_delete occurs.
Restored projects regain their active status but archived projects require manual intervention to reactivate.

### Hard Delete

Organizations can be hard deleted by organization owners when all pending timesheets are resolved.
Hard deletion requires no active employee contracts to exist before organization deletion.
When an organization is hard deleted, all associated employees, projects, tasks, timelogs, and timesheets are hard deleted.
Account deletion by the sole owner of an organization requires transferring ownership or hard deleting the organization first.
When an account is deleted, the owner's employee records in other organizations are marked as deactivated instead of deleted.
Hard deletion is irreversible and data cannot be recovered after hard deletion.
Activity logs are retained even after hard deletion of organization data.
Users cannot hard delete data belonging to another organization.

# Storage Capacity

Storage capacity planning and CDN requirements.

## Storage Capacity Requirements

Define storage requirements and capacity planning for file storage.

### Data Ownership and Isolation

All data in the system is owned by the organization where it is created.
Each organization maintains complete data isolation from all other organizations.
Employees can only access data from their currently selected organization.
Users who belong to multiple organizations can switch between them but never see data across different organizations.
Organization owners have full control over their organization's data, including the ability to perform a hard delete on the organization and all associated data.
Employee accounts are shared globally across organizations but organization-specific data remains isolated.

Organization owners can hard delete their organization, which removes all organization data including:
- All employee records and profiles
- All projects and tasks
- All timelogs and timesheets
- All contracts and departments
- All activity logs

The organization owner's user account remains active after hard delete but is no longer associated with any organization.

### Image Storage

Organization logos and user avatar images are stored as part of the user's profile and organization settings.
When uploading images, the system accepts common image formats.
Image storage is scoped to the organization context to ensure data isolation.
Organization owners can update their organization logo at any time.
Users can update their avatar image in their personal profile settings.
All uploaded images are stored securely and are only accessible to users with appropriate permissions within their organization.

### Data Privacy and Access

Personal information including email addresses, phone numbers, and display names are protected and only accessible to users with appropriate permissions.
Email addresses are used as unique identifiers and are shared across all organizations a user belongs to.
Users can update their phone numbers and display names through their profile settings.
Sensitive information such as password hashes are never exposed and are stored securely.
Employee personal information is visible to users with employee view permissions in the same organization.
Contract information including pay rates and working hours are only visible to users with employee view permissions.
Users can only view timesheet and timelog data for themselves unless they have time view all permissions.
Activity logs are only visible to users with organization manage permissions.