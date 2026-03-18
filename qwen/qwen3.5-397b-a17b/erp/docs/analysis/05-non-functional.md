**hrmPlatform — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Data Isolation

All data is strictly isolated per organization. Each organization operates independently with its own employees, projects, tasks, timelogs, and timesheets.

Users who belong to multiple organizations can only see data for their currently selected organization. When logging in, users select which organization to work in, and all subsequent actions are scoped to that selected organization context.

Users can switch between organizations without logging out, but data from one organization is never visible when working in another organization context.

Employees in one organization cannot see data from another organization, even if the same user account belongs to multiple organizations.

The system enforces organization context on every operation to ensure data isolation.

### Data Ownership

Organizations own all operational data including employee records, departments, projects, tasks, timelogs, timesheets, roles, and activity logs.

Users own their account credentials and global profile (display name, avatar image, phone number). The global profile is shared across all organizations the user belongs to.

When an organization is deleted, all organizational data (employees, projects, tasks, timelogs, timesheets, departments, roles, contracts, activity logs) is permanently deleted. The owner's user account remains but is no longer associated with any organization.

When a user deletes their account:
- If they are the sole owner of an organization, they must transfer ownership or delete the organization first
- Their employee records in other organizations are marked as deactivated but the historical data (timelogs, timesheets) they created remains associated with the organization

User profile changes apply globally across all organizations immediately.

### Access Control

Access to data within an organization is controlled by role-based permissions. Each employee is assigned exactly one role that determines their access level.

Three built-in roles exist: Owner (full access to all features), Manager (can manage employees, projects, approve timesheets, view reports), and Employee (can track time, submit timesheets, view own data).

Users with employee management permission can view employee lists and details. Users without this permission cannot access employee information.

Users with project view permission can view all projects. Users without this permission cannot access project information.

Users with time view all permission can view all employees' timelogs and timesheets. Employees without this permission can only view their own timelogs and timesheets.

Users with report view permission can access organization reports and the organization dashboard. Employees without this permission can only access their personal dashboard.

Users with organization management permission can view the full activity log. Users without this permission cannot access activity logs.

Role assignments can be changed by users with employee management permission, immediately affecting the employee's access level.

### Privacy Boundaries

Employee personal information is visible only within the organization where the employee record exists. Users in other organizations cannot access this information, even if they share the same user account.

Deactivated employees' historical data (timelogs, timesheets, task history) is preserved and remains accessible to users with appropriate permissions within the organization.

Contract information is visible to the employee themselves and to users with employee view permission. Past contracts are immutable and cannot be edited.

Timesheet rejection reasons are visible to the employee who submitted the timesheet and to users with time approval permission.

Activity log entries record the user who performed each action, the action type, and the target entity. Users with organization management permission can view the full activity log.

Task history entries record status changes including timestamp, old status, new status, and who made the change. Users with project view permission can view task history for projects they have access to.

Personal dashboard data (hours logged today, hours logged this week, active timer status, recent timelogs, pending timesheet status, assigned tasks) is visible only to the individual employee.

Organization dashboard data (total active employees, total hours logged this week, pending timesheets awaiting approval, projects with budget utilization over 80 percent, top 5 employees by hours logged this week) is visible only to users with report view permission.

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Employee Deactivation and Reactivation

When an employee is deactivated, their employee record is not deleted but marked with a deactivated status. This preserves all historical data associated with the employee, including timelogs, timesheets, and contracts.

Deactivated employees cannot log time or submit timesheets. Their access to the organization is suspended.

Deactivated employees can be reactivated by users with employee management permission. When reactivated, the employee regains the ability to log time and submit timesheets based on their assigned role.

When a user deletes their account, their employee records in other organizations are marked as deactivated rather than deleted, preserving historical data integrity.

### Permanent Deletion on Organization Deletion

When an organization is deleted, all data associated with that organization is permanently deleted. This includes:

- All employee records
- All departments
- All projects and tasks
- All timelogs and timesheets
- All contracts
- All activity log entries

Permanent deletion is irreversible. The data cannot be recovered after organization deletion.

The owner's user account remains intact but is no longer associated with any organization. If the user belongs to other organizations, their access to those organizations is unaffected.

Organization deletion is only permitted when all pending timesheets are resolved (approved or rejected) and there are no active employee contracts.

### Historical Data Retention

The system retains historical records to maintain data integrity and audit trails. The following data is retained and cannot be modified:

- Past contracts are immutable once superseded by a new contract. Historical contract terms are preserved for reference.
- Task history entries recording status changes are retained permanently. Each entry includes the timestamp, previous status, new status, and the user who made the change.
- Activity log entries recording significant actions are retained. This includes employee invitations, deactivations, reactivations, contract changes, project lifecycle events, task status changes, timesheet approvals and rejections, and role assignments.
- Timelogs included in approved timesheets are locked and cannot be edited or deleted.
- Deactivated employee records preserve all historical timelogs, timesheets, and contracts for reporting and audit purposes.

### Recovery Limitations

The system does not support recovery of permanently deleted data. Users should exercise caution when performing deletion operations.

Recovery is only possible for deactivated employees through reactivation. Reactivation restores the employee's ability to log time and submit timesheets but does not restore any data that was deleted prior to deactivation.

Timelogs that have been deleted before timesheet submission cannot be recovered. Employees should ensure timelogs are included in a timesheet before deletion if they wish to preserve them.

Rejected timesheets return to draft status and can be modified and resubmitted. This is not data recovery but a workflow state change.

Task history and activity log entries cannot be deleted or modified once created. These records serve as an immutable audit trail.