**hrmPlatform — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Data Isolation

All data is strictly isolated per organization. Employees in one organization cannot see data from another organization. Users who belong to multiple organizations only see data for their currently selected organization. When a user switches organizations, all subsequent actions are scoped to the selected organization. Organization context is enforced on every request to ensure data isolation between organizations. Each organization operates independently with its own employees, projects, and data. No data sharing occurs between organizations unless explicitly configured by organization owners.

### Data Ownership

Organization owners own all data within their organization, including employees, projects, tasks, timelogs, and timesheets. When an organization is deleted, all employees, projects, tasks, timelogs, and timesheets are permanently deleted. The organization owner's account remains but is no longer associated with any organization. Users own their global profile data, including display name, avatar image, and phone number. User profile data is shared across all organizations the user belongs to. When a user deletes their account, their employee records in other organizations are marked as deactivated. If a user is the sole owner of an organization, they must transfer ownership or delete the organization before deleting their account. Deactivated employees' historical data including timelogs and timesheets is preserved.

### Privacy

User profile data including display name, avatar image, and phone number is accessible to all organizations the user belongs to. Employee records including department, position, and employment type are visible within the organization based on role permissions. Deactivated employees cannot log time or submit timesheets, but their historical data remains accessible for reporting purposes. Contract information including pay rate and pay period is visible to authorized users within the organization. Timelogs and timesheets are visible based on role permissions, with employees viewing only their own data by default. Users with appropriate permissions can view all employees' timelogs and timesheets. Activity log entries recording significant actions are visible to users with organization management permissions.

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Soft-Delete Behavior

When employees are deactivated, their records are preserved rather than permanently deleted. Deactivated employees cannot log time or submit timesheets, but their historical data including timelogs and timesheets remains accessible.

When projects are archived or completed, the projects are marked with their respective status rather than being deleted. Archived and completed projects cannot receive new timelogs, but all existing timelogs associated with those projects are preserved.

When departments are deleted, the department record is removed but employees who belonged to that department have their department assignment set to null. The employees themselves are not deleted.

Past employee contracts are preserved as immutable historical records. Once a contract has an end date, it cannot be edited, ensuring an accurate historical record of employment terms.

### Data Retention

All employee historical data including timelogs and timesheets is retained indefinitely, even when employees are deactivated. This ensures accurate records of work history and time tracking.

All project timelogs are retained indefinitely, even when projects are archived or completed. This preserves the complete time tracking history for reporting and auditing purposes.

All employee contracts are retained indefinitely as part of the employee record. Past contracts serve as an immutable historical record of employment terms and compensation.

All timesheets are retained indefinitely regardless of their status (draft, submitted, approved, or rejected). This preserves the complete approval history and time tracking records.

All task history entries are retained indefinitely. Each status change to a task is recorded with timestamp, old status, new status, and the user who made the change, creating an audit trail.

All activity log entries are retained indefinitely. The system records significant actions including employee changes, contract modifications, project lifecycle events, timesheet approvals, and role assignments.

### Recovery Options

Deactivated employees can be reactivated by users with employee management permissions. Upon reactivation, the employee regains all previous access and can resume time tracking and timesheet submission.

Archived projects can be restored to active status by users with project management permissions. When restored, the project can again receive new timelogs while preserving all historical timelogs.

Completed projects can be restored to active status by users with project management permissions. When restored, the project can again receive new timelogs while preserving all historical timelogs.

Rejected timesheets return to draft status automatically upon rejection. The employee who owns the timesheet can modify the timelogs and resubmit for approval.

Draft timesheets can be modified at any time by the employee who owns them. Timelogs can be added or removed from draft timesheets before submission.

### Permanent Deletion

When an organization is deleted, all data within that organization is permanently deleted. This includes all employees, projects, tasks, timelogs, timesheets, departments, contracts, roles, and activity logs.

Organization deletion requires that all pending timesheets are resolved (approved or rejected) and there are no active employee contracts before deletion can proceed.

When an organization is deleted, the owner's user account remains but is no longer associated with any organization. The user can create a new organization or join existing organizations.

When a user deletes their account, their employee records in organizations where they are not the sole owner are marked as deactivated. Their historical data in those organizations is preserved.

If a user is the sole owner of an organization, they must either transfer ownership to another user or delete the organization before they can delete their account.

Projects can be permanently deleted only if they have no timelogs associated with them. Projects with existing timelogs cannot be deleted, only archived or completed.

Custom roles can be permanently deleted only if no employees are currently assigned to that role. Roles with assigned employees cannot be deleted.