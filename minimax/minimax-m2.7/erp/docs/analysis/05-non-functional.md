**erpHrm — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Organization Data Ownership

Each organization owns all data created within its context. This includes employee records, projects, tasks, timelogs, timesheets, contracts, departments, roles, reports, and activity logs. When an organization deletes its account, the organization's data is permanently deleted while the owner's user account is preserved. The organization context determines which data a user can access at any given time.

### User Data Ownership

Individual users own their personal profile information, including display name, avatar, and phone number. User credentials (email and password) are user-owned but cannot be accessed by any other user. When a user deletes their account, their user record is removed. The user's employee records in other organizations become deactivated rather than deleted, preserving historical data integrity.

### Data Isolation Between Organizations

The system enforces strict data isolation between organizations. Employees in one organization cannot view, search, or access data belonging to another organization. This isolation applies to all operations and all data types. Even users who belong to multiple organizations only see data for their currently selected organization. Switching organizations immediately changes the data scope to the newly selected organization. The system validates organization context on every request to ensure no cross-organization data leakage occurs.

### Role-Based Access Control Within Organization

Access to data within an organization is governed by the role-based permission system. Users can only view and modify data as permitted by their assigned role in that organization. Employees can access and modify their own timelogs and timesheets unless those timesheets have been approved, in which case the timelogs become locked. Project membership determines whether an employee can log time against a specific project. Users without appropriate permissions cannot view or interact with data they are not authorized to access.

### Privacy of Personal Information

Employees can view their own profile information shared across all organizations they belong to. Other employees within the same organization can view certain employee details (name, department, position, avatar) based on their permissions. Contract details are private between the employee, users with employee management permissions, and users with employee viewing permissions. Users cannot access another user's password or authentication credentials under any circumstances.

### Privacy in Reporting and Activity Logs

Timesheet rejection reasons are visible to the submitting employee and users with timesheet approval permissions. Activity log entries record who performed an action and what was done, but do not expose sensitive personal details beyond what is necessary for audit purposes. Reports aggregate data at the organization level and do not expose individual employee's private information beyond what is relevant to their role permissions.

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Soft Delete for Deactivated Employees

When an employee is deactivated, their employee record remains in the system but is marked with a status indicating they are no longer active. The deactivation action does not remove or alter any historical data associated with the employee, including timelogs, timesheets, contracts, and project memberships. The deactivated employee cannot log time or submit timesheets while in deactivated status.

### Retention of Deactivated Employee Data

Timelogs and timesheets created by a deactivated employee remain accessible in the system. These records preserve the historical record of time worked and are included in reports for date ranges that encompass the original log dates. The data retention period for deactivated employee records is governed by the organization's data retention policy and legal requirements.

### Recovery of Deactivated Employees

A deactivated employee can be reactivated by a user with the appropriate permission. Upon reactivation, the employee record status changes to active, and the employee regains the ability to log time, submit timesheets, and perform other actions according to their assigned role. Reactivating an employee does not restore any project memberships that were removed during or after deactivation; those must be reassigned separately if needed.

### Permanent Deletion of Organization Data

When an organization is deleted, all associated data is permanently removed from the system. This includes all employee records, project memberships, tasks, timelogs, timesheets, contracts, departments, roles, activity logs, reports, and invitations belonging to that organization. There is no mechanism to recover organization data after deletion has been initiated.

### Conditions for Organization Deletion

The deletion of an organization is only permitted when specific conditions are met. All pending timesheets must be resolved through approval or rejection, and there must be no active employee contracts. If these conditions are not satisfied, the system prevents the deletion. Once deletion proceeds, the action is irreversible and all organization-scoped data is permanently lost.

### Owner Account Preservation After Organization Deletion

When an organization is deleted, the owner's user account is preserved (yes). The owner retains their login credentials and can create a new organization or join existing ones. The owner's profile information, including display name, avatar, and phone number, is preserved.