**erpHrm — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Organization Data Isolation

All data within the platform is strictly isolated by organization. Each organization operates as an independent tenant with its own employees, projects, tasks, timelogs, timesheets, departments, roles, and activity logs.

Employees in one organization cannot see or access any data from another organization. This includes:
- Employee records and profiles
- Projects and tasks
- Timelogs and timesheets
- Departments and roles
- Activity logs

Users who belong to multiple organizations can only see data for their currently selected organization. When a user switches organizations, all data displayed changes to reflect the new organization context. The previous organization's data becomes inaccessible until the user switches back.

The organization context is enforced on every action within the system. All data queries and modifications are automatically scoped to the user's currently selected organization.

### Data Ownership

Each organization owns all data created within its scope. The organization owner (the user who created the organization) has full control over the organization and its data.

Data ownership hierarchy:
- **Organization**: Owned by the user who created it. The owner can edit organization settings and delete the organization.
- **Employees**: Belong to the organization. Employee records are owned by the organization, not by the user account they reference.
- **Projects and Tasks**: Owned by the organization. Created and managed by users with appropriate permissions within the organization.
- **Timelogs**: Owned by the individual employee who created them, but stored within the organization's scope.
- **Timesheets**: Owned by the individual employee who submitted them, but stored within the organization's scope.
- **Departments and Roles**: Owned by the organization.

When an organization is deleted, all data owned by that organization is permanently deleted. This includes employees, projects, tasks, timelogs, timesheets, departments, and roles. The user accounts of employees remain but are no longer associated with the deleted organization.

### Access Boundaries

Access to data is controlled through organization-specific roles and permissions. Each organization maintains its own set of roles, and access rights do not transfer between organizations.

Personal data access:
- Every employee can view and manage their own timelogs, timesheets, and timer
- Every employee can view their own contracts and employee record
- Every employee can view projects and tasks they are assigned to
- Every employee can view their own dashboard

Managerial data access:
- Users with employee view permission can view all employee records and contracts within the organization
- Users with time view permission can view all employees' timelogs and timesheets
- Users with time approval permission can view and act on all submitted timesheets
- Users with report permission can view organization-wide reports aggregating data across employees

Administrative access:
- Organization owners have full access to all data within their organization
- Users with organization manage permission can view the full activity log
- Users with employee manage permission can modify employee records and role assignments

Access boundaries are strictly enforced. A user's permissions in one organization have no effect on their access in another organization.

### Privacy Between Users

User profiles are global and shared across all organizations the user belongs to. Profile information (display name, avatar image, phone number) is visible to other members within each organization the user has joined.

Privacy protections:
- Employees can only create timelogs for themselves. No user can create a timelog on behalf of another employee.
- Employees can only edit their own timelogs, and only when those timelogs are not locked in an approved timesheet.
- Employees can only view their own personal dashboard. Organization dashboards are available only to users with report viewing permission.
- Historical data of deactivated employees is preserved but cannot be modified by the deactivated employee.
- Activity logs record who performed each action, providing an audit trail for privacy-sensitive operations.

When a user deletes their account:
- If they are the sole owner of an organization, they must transfer ownership or delete the organization first
- Their employee records in other organizations are marked as deactivated
- Their historical timelogs and timesheets remain in those organizations
- Their identity in activity logs is preserved for audit purposes

Invitations are sent by email, but only the invited email address is stored. The invitation system does not expose whether an email has an existing account until the recipient completes sign-up.

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Soft Deletion of Employees

When a user deletes their account, their employee records in other organizations are marked as "deactivated" rather than permanently deleted.

Deactivated employees cannot log time or submit timesheets. All historical data associated with deactivated employees, including timelogs and timesheets, is preserved and remains accessible to authorized users.

Users with employee management permission can reactivate a deactivated employee, restoring their ability to log time and submit timesheets. Reactivation does not restore any previous role assignment; the employee must be assigned a role upon reactivation.

The employee record retains all associated information including department, position, employment type, contracts, and project memberships after deactivation.

### Data Retention

Historical data for deactivated employees, including timelogs and timesheets, is preserved indefinitely within the organization.

Past contracts cannot be edited and serve as immutable historical records. Creating a new contract automatically ends the previous active contract by setting its end date to the day before the new contract starts.

When a project is archived or completed, existing timelogs on that project are preserved. Archived and completed projects cannot receive new timelogs.

Task status changes are recorded in task history, preserving the timestamp, old status, new status, and who made the change for audit purposes.

Activity log entries record significant actions including employee invitations, deactivations, reactivations, contract changes, project lifecycle events, task status changes, timesheet decisions, and role assignments. These entries are preserved for organizational accountability.

### Recovery Options

Deactivated employees can be reactivated by users with employee management permission. Reactivation restores the employee's ability to log time and submit timesheets.

There is no recovery mechanism for deleted organizations. Once an organization is deleted, all associated data including employees, projects, tasks, timelogs, and timesheets is permanently deleted and cannot be restored.

Projects can only be deleted if they have no timelogs associated with them. This prevents accidental loss of time tracking data.

Custom roles can be deleted only if no employees are currently assigned to them, preventing disruption to access control.

### Permanent Deletion

Organization deletion is permanent and irreversible. When an organization is deleted, all employees, projects, tasks, timelogs, and timesheets are permanently deleted.

The organization owner's user account remains after organization deletion but is no longer associated with any organization. The user can create a new organization or be invited to existing organizations.

A user can delete their account only if they are not the sole owner of any organization, or if they transfer ownership or delete the organization first. This prevents orphaned organizations with no administrator.

Projects with associated timelogs cannot be deleted, ensuring time tracking records are never orphaned or lost due to project removal.