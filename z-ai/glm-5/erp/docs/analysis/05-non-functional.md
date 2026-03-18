**hrmTimeTracking — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Organization Data Isolation

Each organization operates as an independent tenant with complete data separation. Employees, projects, tasks, timelogs, timesheets, departments, roles, and contracts are scoped to a single organization and cannot cross organizational boundaries.

Users who belong to multiple organizations can only view and interact with data within their currently selected organization context. When a user switches organizations, all visible data and available actions change to reflect the new organization context.

Employees in one organization cannot access, view, or modify data belonging to another organization, even if the same user account has memberships in multiple organizations. This isolation is enforced consistently across all operations and data types.

Activity logs, timesheets, timelogs, and all other records are organization-specific and cannot be shared or transferred between organizations.

### Data Ownership Model

The user who creates an organization becomes its owner and holds full responsibility for organization-level settings and member management.

Organization data belongs to the organization, not to individual users. This includes all projects, tasks, timelogs, timesheets, departments, employee records, contracts, and activity logs created within the organization.

When an employee is deactivated, their historical timelogs, timesheets, task assignments, and contract records remain with the organization as preserved records. These records cannot be removed by the deactivated employee.

User profiles are owned by the individual user and shared across all organizations they belong to. Employment records—containing role, department, position, employment type, contracts, and project assignments—are owned by the respective organization and do not transfer between organizations.

When an organization is deleted, all organization-owned data (employees, projects, tasks, timelogs, timesheets) is permanently deleted, but user accounts and profiles remain independent and unaffected.

### Cross-Organization User Privacy

A user account is global and can be associated with multiple organizations through separate employee records. However, each organization operates independently without visibility into the user's other organizational memberships.

Other organizations cannot see which organizations a user belongs to, nor can they access any data from those other organizations. Organization membership is private between the user and each organization.

User profile information (display name, avatar image, phone number) is visible to members within each organization the user belongs to. However, employment details such as role, department, position, pay rate, contracts, and project assignments are private to each organization.

When a user is invited to an organization, only the inviting organization can see that invitation. Other organizations where the user holds membership have no visibility into the invitation or the user's other organizational affiliations.

When a user deletes their account, their employee records in other organizations are marked as deactivated, preserving organizational data integrity while removing personal account access.

### Data Access Boundaries

Access to organization data is governed by role assignments and permissions within each organization. A user's role in one organization does not affect their access in another organization—each membership has an independent role assignment.

Employees can view and manage their own timelogs, timesheets, tasks, contracts, and dashboard. Access to view or manage other employees' data requires specific permissions granted through role assignment.

Employees with the Employee role can only view their own timelogs, timesheets, and contracts. They cannot view other employees' data unless granted specific permissions.

Employees with the Manager role or users granted `time:view_all` permission can view all employees' timelogs and timesheets within the organization. Users with `time:approve` permission can approve or reject any submitted timesheet.

Users with `employee:view` permission can view the employee list and any employee's contracts. Users with `report:view` permission can access organization-wide reports showing aggregated data across all employees.

Organization owners have full access to all organization data, including the ability to manage roles, view activity logs, and access all reports. However, this access is limited to data within their organization and does not extend to other organizations where they may also hold memberships.

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Employee Deactivation as Soft Deletion

When an employee is deactivated, their record remains in the system but their status is changed to "deactivated".

Deactivated employees cannot log time or submit timesheets.

All historical data associated with a deactivated employee is preserved, including timelogs, timesheets, and contracts.

Deactivated employees can be reactivated by users with the employee management permission.

When reactivated, the employee's status returns to active, and they regain the ability to log time and submit timesheets.

The employee's role, department, position, and employment type are retained during deactivation and restored upon reactivation.

### Historical Data Retention

Past employee contracts are immutable historical records and cannot be edited after the contract period has ended.

Approved timesheets and their associated timelogs are permanently locked and cannot be edited or deleted, preserving the historical record of worked hours.

Activity log entries are recorded permanently for significant actions, including employee invitations, deactivations, reactivations, contract changes, project lifecycle events, task status changes, timesheet submissions and approvals, and role assignments.

Archived and completed projects retain all associated timelogs and tasks, even though new timelogs cannot be added to them.

Deactivated employees' historical timelogs and timesheets remain accessible according to the user's permission level.

### Data Recovery Through Reactivation

Deactivated employees can be reactivated by users with the employee management permission.

Reactivation restores full access to the employee's existing data, including their historical timelogs, timesheets, and contracts.

No data is lost during the deactivation period; all records remain intact and accessible based on permissions.

When a user deletes their account, their employee records in other organizations are marked as deactivated rather than permanently deleted, allowing organizations to retain historical records.

Tasks assigned to a deactivated employee remain assigned unless explicitly reassigned by an authorized user.

### Permanent Deletion Conditions

Organization owners can delete their organization only when all pending timesheets are resolved (approved or rejected) and there are no active employee contracts.

When an organization is deleted, all employees, projects, tasks, timelogs, and timesheets within that organization are permanently deleted.

The organization owner's user account remains after organization deletion but is no longer associated with the deleted organization.

Projects can only be deleted if they have no timelogs associated with them; this protects historical time tracking records.

Timelogs can only be deleted by employees if they are not part of any submitted or approved timesheet, preserving the integrity of approved time records.

Custom roles can only be deleted if no employees are currently assigned to them.

# Real-time Communication

WebSocket/SSE connection policies and performance requirements.

## WebSocket Security and Performance

Define connection limits, heartbeat intervals, reconnection policies, and security requirements for real-time communication.

### Real-time Communication Scope

The system includes timer functionality that allows employees to track time in real-time. Employees can start a timer (with project and optional task selection), stop the timer to create a timelog, or discard the timer without creating a timelog. The dashboard displays the active timer status for the logged-in employee.

The original requirements do not specify technical implementation details for real-time communication (such as WebSocket connections, Server-Sent Events, or polling intervals). The user has not specified:

- Connection limits for real-time channels
- Heartbeat intervals or keep-alive mechanisms
- Reconnection policies or retry behavior
- Security requirements specific to real-time connections
- Performance thresholds for real-time updates

If real-time communication mechanisms are required, the user should specify:
- The preferred technical approach (WebSocket, SSE, long-polling, etc.)
- Maximum concurrent connections per user or organization
- Expected latency for status updates
- Behavior when connections are lost or unstable
- Any security requirements for real-time channels

# Storage Capacity

Storage capacity planning and CDN requirements.

## Storage Capacity Requirements

Define storage requirements and capacity planning for file storage.