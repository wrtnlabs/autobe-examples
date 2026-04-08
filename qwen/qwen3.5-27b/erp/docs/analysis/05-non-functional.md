**hrmTimeTrack — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Data Isolation

THE system SHALL maintain strict data isolation between organizations.

Employees in one organization cannot view or access data from another organization.

Users who belong to multiple organizations can only access data for their currently selected organization.

All employee records, projects, tasks, timelogs, timesheets, and activity logs are isolated within their respective organization.

Organization settings, roles, departments, and reports are visible only to members of that organization.

### Data Ownership

Organization owners own all organization-level data including organization settings, roles, departments, and activity logs.

Organization owners own all projects, tasks, and project members created within their organization.

Employees own their personal timelogs and timesheets, but the organization retains ownership of the data for record-keeping purposes.

Users own their global profile information including display name, phone number, and avatar image.

When an organization is deleted, all organization-owned data is permanently deleted, but user accounts and their global profiles are preserved.

When a user deletes their account, their employee records in organizations are marked as deactivated, but the organization retains all historical data including timelogs and timesheets.

### Access Control

Access to organization data is controlled by role-based permissions as defined in the organization's role configuration.

Each employee is assigned exactly one role within an organization, which determines their access level.

Users with the owner role have full access to all organization data and features.

Users with the manager role can access employee data, project data, timesheets, and reports as permitted by their role.

Users with the employee role can only access their own data unless granted additional permissions.

Access to sensitive operations such as employee management, project management, and timesheet approval requires specific permissions.

Role assignments can be changed by users with employee management permission.

### Privacy

User profile information including display name, phone number, and avatar is visible to all members within the same organization.

Employee contact information and employment details are visible only to users with employee view or employee manage permissions.

Timesheet data including timelogs is visible only to the employee who created it, unless the viewer has time view all permission.

Activity logs are visible only to users with organization manage permission.

Organization reports are visible only to users with report view permission.

Personal dashboard data is visible only to the employee whose dashboard it is.

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Data Retention

When an employee is deactivated, their historical data including timelogs and timesheets is preserved and remains accessible to users with appropriate permissions.

When a project is archived or completed, all existing timelogs associated with that project are preserved and cannot be deleted through project deletion.

Employee contracts that are no longer active (past contracts) are retained as immutable historical records and cannot be edited.

### Permanent Deletion

When an organization is deleted, all associated data is permanently deleted and cannot be recovered. This includes all employees, projects, tasks, timelogs, timesheets, departments, roles, and activity logs.

Organization deletion is only permitted when all pending timesheets are resolved (approved or rejected) and there are no active employee contracts.

When a user deletes their account, their employee records in organizations where they are not the sole owner are marked as deactivated rather than permanently deleted.

If a user is the sole owner of an organization and deletes their account, they must first transfer ownership or delete the organization.

When a project is deleted, all tasks within that project are also deleted. Project deletion is only permitted when the project has no timelogs associated with it.

When a department is deleted, employees assigned to that department have their department assignment set to null. The employees themselves are not deleted.

### Data Recovery

Deactivated employees can be reactivated by users with employee:manage permission, restoring their ability to log time and submit timesheets.

Rejected timesheets return to draft status, allowing employees to modify and resubmit them.

Once a timesheet is approved, all included timelogs are locked and cannot be edited or deleted by any user.

Past employee contracts cannot be edited; they remain as immutable historical records.

Permanently deleted organizations and their data cannot be recovered.