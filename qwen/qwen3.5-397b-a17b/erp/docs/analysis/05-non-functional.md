**hrmPlatform — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Organization Data Isolation

All data is strictly isolated per organization. Users can only access data belonging to their currently selected organization context. Employees in one organization cannot view, edit, or access any data from another organization. Users who belong to multiple organizations must select an organization context upon login, and all subsequent actions are scoped to that selected organization. Users can switch between organizations without logging out, but data from different organizations remains completely separated. When an organization is deleted, all data associated with that organization including employees, projects, tasks, timelogs, and timesheets is permanently deleted. The organization owner's user account remains but is no longer associated with the deleted organization.

### Data Ownership

Each organization owns all data created within its context, including employee records, projects, tasks, timelogs, timesheets, and activity logs. Organization owners have full ownership rights and can delete their organization subject to resolution of all pending timesheets and termination of active employee contracts. Each user owns their personal account credentials and global profile information including display name, avatar image, and phone number. User profiles are shared across all organizations the user belongs to. Each employee record is owned by the organization and references a user account. Timelogs are owned by the employee who created them and are included in timesheets owned by that employee. When a user deletes their account, if they are the sole owner of an organization, they must transfer ownership or delete the organization first. Upon account deletion, the user's employee records in other organizations are marked as deactivated but the historical data remains owned by those organizations.

### Access Control

Access to data within an organization is controlled by role-based permissions as defined in the actors and authentication specification. Each employee is assigned exactly one role which determines their access level. The three built-in roles are Owner, Manager, and Employee, with Owner having full access to all features and data within the organization. Custom roles can be created by organization owners with specific permission sets from the available permissions list. Access control is enforced on every action within the organization context. Users can only perform actions permitted by their assigned role. Role assignment can be changed by users with the employee management permission. When an employee is deactivated, they lose access to log time or submit timesheets but their historical data remains accessible to users with appropriate permissions.

### Privacy Boundaries

Employees can view their own contracts, timelogs, timesheets, and assigned tasks. Employees cannot view other employees' data unless they have been granted explicit permissions through their role. Users with the employee view permission can view the employee list and employee details including department, position, and employment type. Users with the time view all permission can view all employees' timelogs and timesheets. Users with the report view permission can view aggregated organization reports but individual employee data is only shown according to the report type and filters applied. Deactivated employees' historical data including timelogs and timesheets is preserved and accessible to users with appropriate permissions. Task history entries record who made status changes and are visible to users with access to the task. Activity log entries are visible only to users with the organization management permission. Personal user profile information including display name, avatar image, and phone number is visible across organizations where the user is a member.

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Soft-Delete Behavior

When an employee is deactivated, their employee record is marked as deactivated rather than removed from the system. Deactivated employees cannot log time or submit timesheets, but their historical data including timelogs and timesheets is preserved.

Deactivated employees can be reactivated, restoring their ability to log time and submit timesheets while preserving all historical data.

When a user deletes their account, their employee records in other organizations are marked as deactivated rather than removed. If the user is the sole owner of an organization, they must transfer ownership or delete the organization before deleting their account.

Department deletion sets employees' department reference to null rather than removing the department record from historical data.

### Data Retention

Historical data for deactivated employees is preserved, including all timelogs, timesheets, and contract records. Past contracts are retained as immutable historical records even when new contracts are created.

Task history entries recording status changes are retained. Activity log entries recording significant actions such as employee invitations, deactivations, contract changes, project changes, task status changes, timesheet actions, and role changes are retained.

When an organization is deleted, all associated data including employees, projects, tasks, timelogs, and timesheets are permanently deleted with no retention.

### Data Recovery

Deactivated employees can be reactivated. Reactivation restores the employee's ability to log time and submit timesheets while preserving all historical data.

Rejected timesheets return to draft status, allowing employees to modify and resubmit them. This provides recovery from rejection without data loss.

No other data recovery mechanisms are provided. Once an organization is deleted, all associated data is permanently lost and cannot be recovered.

### Permanent Deletion

Organization deletion permanently deletes all associated data including all employees, projects, tasks, timelogs, and timesheets. The organization owner's user account remains but is no longer associated with any organization.

Organization owners can only delete their organization if all pending timesheets are resolved (approved or rejected) and there are no active employee contracts.

Projects can be permanently deleted only if they have no timelogs associated with them. Archived or completed projects preserve existing timelogs and cannot receive new timelogs.

Timelogs can be permanently deleted by employees only if the timelog is not part of any submitted or approved timesheet.