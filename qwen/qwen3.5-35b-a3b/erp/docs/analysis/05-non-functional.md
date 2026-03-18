**hrms — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Data Ownership

Each organization owns all data created within its boundaries, including employees, projects, tasks, timelogs, timesheets, and activity logs.

The organization owner owns the organization itself and has full control over organization settings and data.

Employees own their personal timelogs and can only view, edit, or delete their own timelogs within the permissions granted by their role.

Timesheets are owned by the employee who submitted them, but can be viewed and approved by users with approval permissions.

Projects are owned by the organization, but project leads have management responsibilities for tasks within their project.

User accounts and personal profiles (display name, avatar, phone number) are owned by the individual user and are shared across all organizations they belong to.

### Multi-Tenancy and Data Isolation

Each organization operates independently with complete data isolation from all other organizations.

Data from one organization is never visible to users in another organization, regardless of role or permission level.

Employees who belong to multiple organizations can only access data from the organization they have currently selected.

When a user switches organization context, their view is immediately restricted to data belonging only to the selected organization.

Organization deletion permanently removes all organization-specific data including employees, projects, tasks, timelogs, timesheets, and activity logs.

When an organization is deleted, the owner's user account remains but is no longer associated with any organization.

### Access Control and Data Visibility

All data access is controlled by the user's role and assigned permissions within the currently selected organization.

Users can only view data for which they have explicit permission; permissions are granted through role assignment.

Guest users cannot access any organization data; only authenticated members can view and interact with data.

Employees can only view their own personal data unless they have permissions to view other employees' data.

Managers can view all employees' data within their organization and approve timesheets.

Organization owners can view all organization data and manage users, roles, and organization settings.

Activity logs are visible only to users with organization management permissions.

### Privacy Boundaries

Personal information such as email addresses and phone numbers are private to the individual user and organization.

Employee contact information is visible to users with employee view permission within the same organization.

Contract details including pay rates are visible to the employee and users with employee view permission.

Timesheet details including timelog descriptions are private to the employee unless they have explicitly submitted the timesheet for approval.

Task descriptions and work details are visible to project members and users with project view permission.

Reports containing aggregated data are only accessible to users with report view permission.

Cross-organization data visibility is strictly prohibited; users cannot see any data from organizations they do not belong to.

### Data Ownership Transfers

Organization ownership can be transferred to another user by the current owner.

Transferring ownership moves all organization management responsibilities and permissions to the new owner.

An organization cannot exist without an owner; ownership must be transferred before the current owner leaves the organization.

Employee records can be reassigned between managers or owners when employees change departments or reporting structures.

Project leadership can be reassigned to different employees by users with project management permission.

Role assignments can be changed at any time by users with employee management permission, subject to system constraints.

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Soft Delete Policy

Employee deactivation uses soft delete. When an employee is deactivated, their employee record status is marked as deactivated. All historical data including timelogs, timesheets, contracts, and activity records are preserved and remain accessible. Deactivated employees cannot log new time or submit new timesheets.

Projects use soft delete when archived or completed. Archived or completed projects cannot receive new timelogs. All existing timelogs on archived or completed projects are preserved and remain accessible for reporting and historical purposes.

Organizations do not use soft delete. When an organization is deleted, all associated data is permanently deleted including employees, projects, tasks, timelogs, timesheets, departments, roles, and activity logs.

Tasks do not use soft delete. When a task is closed or completed, its history is preserved. Task status changes are recorded in task history which includes timestamp, old status, new status, and the user who made the change.

### Data Retention Requirements

Employee data is retained for the duration of employment plus historical records. When an employee is deactivated, their employment history including all contracts, timelogs, timesheets, and associated activity is preserved indefinitely for audit and compliance purposes.

Project data is retained for the duration of the project plus historical records. When a project is archived or completed, all associated timelogs, tasks, and activity logs are preserved indefinitely for budget tracking and historical reporting.

Task data is retained for the duration of the task lifecycle. Task history records all status changes permanently. Closed or completed tasks remain accessible with their full history.

Contract data is retained as immutable historical records. Past contracts cannot be edited. Each employee can have multiple contracts with the most recent being active. All contract history including start dates, end dates, pay rates, and working hours is preserved indefinitely.

Activity log data is retained as an audit trail. Each activity log entry records the timestamp, user who performed the action, action type, target entity, and details. The activity log captures significant actions including employee lifecycle events, contract changes, project lifecycle events, task status changes, and timesheet lifecycle events.

Timelog data is retained as long as the associated timesheet and project data exist. Timelogs on approved timesheets are locked and cannot be modified. Timelogs on rejected timesheets can be modified and resubmitted.

Timesheet data is retained as long as the associated employee and project data exist. Approved timesheets lock their timelogs. Rejected timesheets return to draft status and can be modified and resubmitted.

### Data Recovery Options

Deactivated employees can be reactivated. When an employee is reactivated, their status is changed back to active and they can resume logging time and submitting timesheets. All historical data remains intact.

Rejected timesheets can be recovered and resubmitted. When a timesheet is rejected, it returns to draft status with the rejection reason preserved. The employee can modify the timesheet and resubmit for approval.

Task status changes are reversible. Tasks can move through status transitions (open, in-progress, completed, closed) and history is recorded for each change. There is no permanent blocking of task status transitions.

Organization deletion has no recovery option. Once an organization is deleted, all data is permanently deleted and cannot be recovered. Organization owners should ensure all pending timesheets are resolved and all active employee contracts are terminated before deleting their organization.

Project deletion has no recovery option if the project has no timelogs associated with it. When a project is deleted, all associated tasks, project memberships, and activity logs are permanently deleted.

User account deletion has limited recovery. When a user deletes their account, their employee records in other organizations are marked as deactivated rather than deleted. If the user is the sole owner of an organization, they must transfer ownership or delete the organization first before deleting their account.

### Permanent Deletion Behavior

The organization owner is the primary data owner for all data within their organization. All employees, projects, tasks, timelogs, timesheets, departments, roles, contracts, and activity logs are owned by the organization, not by individual users.

The user account is a separate entity from organizational data. Users can belong to multiple organizations and each organizational association is tracked separately through organization members. A user's global profile is shared across all organizations.

Organization owners have full control over their organization's data including the ability to edit organization settings, manage roles, add and remove members, and delete the organization if conditions are met.

Managers have delegated ownership authority for specific domains. Users with employee management permission can manage employee data. Users with project management permission can manage project and task data. Users with time approval permission can manage timesheet data.

Employees have limited ownership limited to their own data. Employees own their timelogs (can edit within constraints), their timesheets (can modify drafts), and their tasks (can update status on assigned tasks). Employees do not own organizational data like projects, departments, or other employees' records.

Data ownership transfers on organization deletion. When an organization is deleted, ownership of all organizational data is terminated. The organization owner's account persists but without any organizational association. When a user account is deleted, their ownership of personal data within organizations is replaced with deactivated employee status.

Multi-tenancy enforces data ownership boundaries. Each organization's data is strictly isolated. Employees in one organization cannot access or view data from another organization. Users who belong to multiple organizations can only see data for their currently selected organization context.

Role-based access controls ownership visibility. Users can only access data for entities they have permission to view or manage. The permission system enforces ownership boundaries defined by roles. For example, users with employee view permission can view employee lists but cannot edit them. Users with project view permission can view projects but cannot modify them.

# Storage Capacity

Storage capacity planning and CDN requirements.

## Storage Capacity Requirements

Define storage requirements and capacity planning for file storage.

### Organization and User Images

Organizations store a logo image in the system.

Users store an avatar image in their profile.

These images are stored with the respective entity records (organization or user profile).

The images are used for visual identification in the user interface.

Access to images follows the same organization data isolation rules as other data—employees in one organization cannot access logo images from other organizations.

### Image Storage Capacity

Organization logo images and user avatar images are stored in the system.

Storage capacity is allocated to accommodate image files for all organizations and users.

No specific file size limits are defined in the requirements.

Storage capacity planning accounts for the growth of the number of organizations and users over time.

### Image Delivery

Organization logo images and user avatar images are delivered to users through the application.

Images are accessed when viewing organization settings, user profiles, and dashboards.

No content delivery network (CDN) requirements are specified in the user requirements.

Image delivery is handled as part of the general application data access.