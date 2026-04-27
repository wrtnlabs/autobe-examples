**hrmTimeTracking — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Data Isolation Between Organizations

Each organization's data is strictly isolated from all other organizations. No employee, manager, or owner of one organization can access, view, or search data belonging to another organization.

When a user selects an organization at login, all subsequent operations are scoped to that organization. The system enforces this boundary on every action — including viewing projects, tasks, employees, timelogs, timesheets, contracts, departments, reports, and activity logs.

A user who belongs to multiple organizations sees only the data for the organization they are currently working in. Switching organizations changes the data scope entirely; no cross-organization data is visible in the new context.

### Data Ownership

Each organization owns all operational data created within its scope. This includes employee records, projects, tasks, timelogs, timesheets, contracts, departments, roles, activity logs, and any reports generated from this data.

Each user owns their global profile information — display name, avatar image, and phone number. The profile is shared across all organizations the user belongs to but remains the user's personal data.

When an organization is deleted, all its operational data (employees, projects, tasks, timelogs, timesheets, contracts, departments, roles, invitations, and activity logs) is permanently removed. The organization owner's user account is not deleted — it continues to exist but is no longer associated with any organization.

When a user deletes their account, their global profile is removed. Employee records linked to that user in each organization are marked as deactivated, but the organization retains the historical employee record (timelogs, timesheets, contracts) associated with that employee.

### Access Control Boundaries

Access to data within an organization is governed by the role assigned to each employee. Every employee has exactly one role, and that role determines which features and data they can access.

- Organization owners have full access to all data and features within their organization.
- Managers can manage employees, projects, approve timesheets, and view reports.
- Employees can track time, submit timesheets, and view only their own data.
- Custom roles grant specific combinations of permissions as defined by the organization owner.

Employees can always view their own data: their own timelogs, timesheets, contracts, assigned tasks, and personal dashboard. They cannot view another employee's data unless their role grants permissions such as `time:view_all`, `employee:view`, or `report:view`.

All data access is enforced within the selected organization context only. No role, regardless of its permissions, can access data across organization boundaries.

### Privacy of Employee Data

Employee records within an organization contain personal information including the user's display name, email address, and phone number (sourced from the user's global profile). This information is visible within the organization based on the viewer's permissions:

- Users with `employee:view` permission can see the employee list and employee details, including names, departments, positions, and employment types.
- Users without `employee:view` permission — such as employees with only the base Employee role — can see only their own employee record.

When an employee is deactivated, their historical data (timelogs, timesheets, contracts) remains in the system and is preserved for reporting and record-keeping. The deactivated employee's personal information (name, email) remains visible in historical records. Deactivated employees cannot log time, submit timesheets, or access the system within that organization.

User profile data (display name, avatar, phone number) is shared across all organizations the user belongs to. If a user updates their profile, the change is reflected in all organizations simultaneously. A user's email address is used as their unique identifier across the platform and cannot be changed per organization.

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Employee Deactivation and Historical Data Retention

When an employee is deactivated by a user with employee:manage permission, the employee record enters a deactivated status rather than being permanently deleted (soft-delete). All historical data associated with the deactivated employee is preserved, including:

- Timelogs and timesheets previously submitted or approved
- Contracts (past and active)
- Project memberships (historical record)
- Task assignments

The deactivated employee retains no operational capabilities — they cannot log time, submit timesheets, or access the organization's active workflows. Their data remains stored for compliance and reporting purposes but is excluded from operational views such as active employee counts and time tracking dashboards.

### Employee Reactivation and Data Recovery

Users with employee:manage permission can reactivate a deactivated employee at any time. Reactivation restores the employee's full operational capabilities within the organization, including:

- The ability to log time and submit timesheets
- Access to active projects they were previously assigned to
- Continuity of all historical data (timelogs, timesheets, contracts remain intact)

Reactivation does not require re-invitation or re-onboarding. The employee's previous role, department, position, and employment type remain as they were at the time of deactivation and may be edited after reactivation as needed.

### Permanent Deletion of Organization Data

When an organization owner deletes the organization, all data within that organization is permanently deleted. This includes:

- All employee records and their associated contracts
- All projects, tasks, task history, timelogs, and timesheets
- All departments
- All roles (built-in and custom)
- All invitations
- All activity log entries

The owner's user account is not deleted — it remains in the system but is no longer associated with any organization. The owner retains their global user profile and may join or create other organizations.

Projects can also be permanently deleted by users with project:manage permission, provided the project has no timelogs associated with it. If timelogs exist, the project cannot be deleted — it must be archived or completed instead.

### User Account Deletion and Employee Record Retention

When a user deletes their account, any employee records associated with that user in organizations are marked as deactivated rather than permanently deleted. The organization retains:

- The historical employee record with its deactivated status
- All associated timelogs, timesheets, and contracts for audit and reporting purposes
- All project memberships and task assignments (as historical data)

If the user was the sole owner of an organization, account deletion is blocked until ownership is transferred or the organization is deleted first. This prevents orphaned organizations from losing their sole administrator.

# Real-time Communication

WebSocket/SSE connection policies and performance requirements.

## WebSocket Security and Performance

Define connection limits, heartbeat intervals, reconnection policies, and security requirements for real-time communication.

### Concurrent Connection Limits

The system limits the number of concurrent real-time connections a single user can maintain for one organization session. When a user attempts to open a new connection that would exceed this limit, the system refuses the new connection attempt and notifies the user. Organization owners can view a list of all currently active real-time connections for their organization. Connections that remain idle for an extended period without any activity are automatically terminated to free up capacity for active users.

### Heartbeat Mechanism

The system uses a heartbeat mechanism to verify that real-time connections remain healthy and responsive. The system periodically sends a lightweight signal to connected clients. Clients are expected to acknowledge this signal within a reasonable time. If a client does not respond, the system considers the connection lost and closes it on the server side. Connection terminations caused by unresponsive clients are recorded in the activity log for troubleshooting and audit purposes.

### Reconnection Policy

When a real-time connection is interrupted unexpectedly, the system allows the client to reconnect within a grace period without requiring the user to log in again. During this grace period, the user's organization context and session remain valid for reconnection. Upon reconnecting, the system ensures the client receives any state updates that occurred while the connection was unavailable. If the grace period expires before the client reconnects, the user must authenticate again to establish a new connection. Excessive reconnection attempts from the same user within a short time are throttled to prevent abuse.

### WebSocket Security

All real-time connections use encrypted communication to protect data in transit. The system authenticates every new connection by verifying the user's session credentials obtained during login; connections without valid credentials are rejected. Each connection is scoped to the user's selected organization, and the system only transmits data that belongs to that organization over the connection. If a user's session expires or the user logs out, all active real-time connections for that session are terminated immediately. The system validates the origin of incoming connection requests to prevent unauthorized third-party websites from establishing connections. Information about internal server details, network topology, or technology stack is not exposed during the connection handshake process.