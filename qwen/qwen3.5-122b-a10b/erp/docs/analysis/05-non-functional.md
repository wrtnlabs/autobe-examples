**hrm — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Organization Data Isolation

All data in the system is strictly isolated per organization. Employees in one organization cannot access or view any data from another organization.

Users who belong to multiple organizations only see data for their currently selected organization. When a user switches organizations, their view and access are scoped to the newly selected organization.

The organization context is established at login and persists for all subsequent actions until the user switches organizations or logs out.

This isolation applies to all entity types including employees, projects, tasks, timelogs, timesheets, contracts, departments, roles, and activity logs.

### Data Ownership

Each organization owns its data independently. This includes all employees, projects, tasks, timelogs, timesheets, contracts, departments, and roles created within that organization.

Organization owners have full control over their organization's data. They can edit organization settings and manage all data within the organization.

When an organization is deleted by its owner, all associated data is permanently deleted. This includes all employees, projects, tasks, timelogs, timesheets, contracts, departments, and roles.

The user account of the organization owner is not deleted when the organization is deleted. The owner's account remains active but is no longer associated with any organization.

User profile data (display name, avatar, phone number) is owned globally by the user and is shared across all organizations the user belongs to.

### Access Control Policy

Access to data is controlled by organization-level isolation and role-based permissions within each organization.

Within an organization, employees can only access data relevant to their role and assignments. Access boundaries are enforced based on the employee's assigned role and project memberships.

Employees can always view their own data, including their own timelogs, timesheets, contracts, and assigned tasks.

Access to other employees' data requires appropriate permissions. For example, viewing all employees' timelogs requires the time view all permission, and managing employee records requires the employee manage permission.

Users with the employee view permission can view employee lists and details across the organization.

Users with the project view permission can view all projects and tasks within the organization.

Users with the report view permission can access organization-wide reports that aggregate data across employees and projects.

The activity log, which records significant actions across the organization, is accessible only to users with the organization manage permission.

### Privacy Boundaries

Privacy boundaries are enforced between organizations and between individual employees within an organization.

Employees cannot access personal profile information of other employees beyond what is necessary for work collaboration. This includes restrictions on viewing phone numbers and other personal contact details.

Contract information is private to each employee. Employees can view their own contracts. Access to other employees' contract information requires the employee view permission.

Timesheet and timelog data is private by default. Employees can view their own timesheets and timelogs. Viewing other employees' timesheets and timelogs requires specific permissions (time approve for timesheets, time view all for timelogs).

Task assignments are visible to employees assigned to those tasks. Task details are visible to employees who are members of the project containing the task.

When an employee is deactivated, their historical data (timelogs, timesheets, contracts) is preserved but they lose access to create new timelogs or submit timesheets.

When a user deletes their account, their employee records in other organizations are marked as deactivated to preserve data integrity while removing their access.

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Employee Record Deactivation

When an employee is deactivated, their employee record is not deleted but marked with a deactivated status. The employee can no longer log time or submit timesheets. All historical data associated with the employee—including timelogs, timesheets, and contracts—is preserved and remains visible to users with appropriate permissions. Deactivated employees can be reactivated by users with employee management permission, restoring their ability to log time and submit timesheets.

This soft-delete pattern ensures that historical records remain intact for reporting and audit purposes while preventing deactivated employees from performing active operations.

### Historical Data Retention

Historical data is preserved even when related entities are modified or deactivated. The following data is retained:

- Timelogs and timesheets from deactivated employees remain in the system and are included in historical reports
- Timelogs on archived or completed projects are preserved and cannot be deleted
- Past contracts are immutable and remain as a historical record even after new contracts are created
- Task status change history is retained for all tasks
- Activity log entries are preserved and cannot be deleted

Data that is permanently deleted includes:
- All employees, projects, tasks, timelogs, and timesheets when an organization is deleted
- Employee records in other organizations when a user deletes their account (marked as deactivated, not deleted)

There is no automatic deletion of historical data based on age or inactivity. Data persists until the owning organization is deleted or the user account is deleted.

### Data Recovery Options

Timesheets can be recovered through the rejection workflow. When a timesheet is rejected by an approver, it returns to draft status rather than being deleted. The employee can then:

- Review the rejection reason provided by the approver
- Modify the timelogs included in the timesheet
- Resubmit the timesheet for approval

Deactivated employee records can be recovered by users with employee management permission through the reactivation process. Once reactivated, the employee regains full access to log time and submit timesheets.

There is no self-service recovery for permanently deleted data. Once an organization is deleted, all associated data is permanently removed and cannot be recovered.

### Permanent Organization Deletion

When an organization is deleted by its owner, all data associated with that organization is permanently deleted. This includes:

- All employee records within the organization
- All projects and tasks
- All timelogs and timesheets
- All contracts
- All departments
- All custom roles

Deletion is subject to the following constraints:
- All pending timesheets must be resolved (approved or rejected) before the organization can be deleted
- There must be no active employee contracts before the organization can be deleted

The user account of the organization owner is not deleted. The account remains active but is no longer associated with any organization. The owner can create a new organization or join existing organizations.

There is no grace period or recovery window for organization deletion. Once confirmed, the deletion is immediate and permanent. There is no backup restoration or administrative recovery option for deleted organizations.