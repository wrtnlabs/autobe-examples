**erpHrm — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Data Isolation

### Organization-Level Data Boundaries

The platform enforces strict data isolation at the organization level. Each organization's data — including employees, departments, projects, tasks, timelogs, timesheets, contracts, roles, and activity logs — exists in a completely separate boundary. No data crosses between organizations at any time.

When a user belongs to multiple organizations, the system treats each membership independently. The user's actions, views, and accessible data are always scoped to the currently selected organization context. Data from one organization is never visible or accessible when operating in another organization's context.

### Organization Context Switching

A user who belongs to multiple organizations selects which organization to work in upon login. All subsequent requests and data views are confined to that organization. The user may switch the active organization without logging out. Upon switching, the previous organization's data is no longer visible, and the new organization's data becomes available according to the user's role in that organization.

### Cross-Organization Boundaries

There is no mechanism for cross-organization data sharing, merging, or linking. Each organization is self-contained. A user's global profile (display name, avatar image, phone number) is the only information shared across organizations — the profile belongs to the user account, not to any single organization.

### Data Ownership

### Organization-Level Ownership

The organization itself is the ultimate owner of all data created within its context. The organization owner acts as the custodian with full authority over organizational data, but the data belongs to the organization, not to any individual user.

### Employee Data Ownership

Each employee owns their personal timelogs and timesheets. An employee can create, view, and manage their own time entries within the permissions granted by their role. Other users may access an employee's time data only through explicit permission grants (`time:view_all`, `time:manage`, `time:approve`).

### Account Deletion and Data Handling

When a user deletes their account:
- If the user is the sole owner of an organization, they must transfer ownership or delete the organization first. The account cannot be deleted while it is the sole owner of an active organization.
- The user's employee records in other organizations are marked as deactivated. Historical data (timelogs, timesheets, contracts, project assignments) associated with those employee records is preserved for the organization's continuity.
- The user's global profile is removed.

### Organization Deletion and Data Handling

When an organization is deleted:
- All employees, projects, tasks, timelogs, timesheets, contracts, departments, roles, and activity logs belonging to that organization are permanently deleted.
- The organization owner's user account remains intact but is no longer associated with any organization (unless the owner belongs to other organizations).
- Organization deletion is only permitted when all pending timesheets are resolved (approved or rejected) and there are no active employee contracts.

### Access Control

### Role-Based Data Access

All data access is governed by the role assigned to each employee within an organization. The three built-in roles define escalating levels of data visibility:

- **Employee**: Can view and manage their own timelogs, timesheets, contracts, and assigned projects and tasks. Cannot view other employees' personal data, timelogs, or timesheets unless those employees are assigned to the same project.
- **Manager**: Can view all employees' data, manage project membership, approve or reject timesheets, and view organization reports. Cannot manage organization-level settings or roles.
- **Owner**: Has unrestricted access to all data within the organization, including organization settings, role management, and the full activity log.

### Permission-Based Visibility

Each permission grants specific data access beyond a role's base visibility:
- `employee:view` — view the employee list and individual employee details
- `employee:manage` — view and edit employee records, create and edit contracts
- `time:view_all` — view all employees' timelogs and timesheets
- `time:manage` — edit or delete any employee's timelogs
- `time:approve` — view all submitted timesheets and approve or reject them
- `report:view` — access organization-level reports and dashboards
- `org:manage` — view the full activity log and manage organization settings

Custom roles created by the organization owner inherit exactly the permissions assigned to them. An employee with a custom role can only access data permitted by the intersection of their base role and assigned permissions.

### Activity Log Access

Only users with `org:manage` permission can view the organization's activity log. The activity log records significant actions (employee invitations, deactivations, contract changes, project lifecycle events, task status changes, timesheet submissions and reviews, role assignments). Each entry records the timestamp, the user who performed the action, the action type, the target entity, and relevant details.

### Privacy Boundaries

### Employee Privacy

Employees have exclusive control over their own time entries. An employee's timelogs and timesheets are private by default. Other employees cannot view an individual's time data unless they hold a role or permission that explicitly grants such access (`time:view_all`, `time:manage`, `time:approve`).

Project-level visibility is limited to employees assigned to the project. An employee who is not a member of a project cannot see that project's tasks, assigned members, or associated timelogs.

### Profile Visibility

A user's global profile (display name, avatar image, phone number) is visible to other members of any organization the user belongs to. The profile is shared across organizations — if a user updates their display name or avatar, the change is reflected in all organizations they are a member of.

### Report Privacy

Organization reports aggregate data across employees. Reports show summary-level information (total hours, counts, percentages) and do not expose individual timelog descriptions or personal notes. Only users with `report:view` permission can access reports.

### Activity Log Privacy

The activity log is restricted to users with `org:manage` permission. Activity log entries do not contain personal data beyond what is necessary to record the action (user who performed the action, target entity, and action details).

### Deactivated Employee Privacy

When an employee is deactivated, their historical data (timelogs, timesheets, contracts) is preserved for organizational continuity. Deactivated employees cannot create new timelogs or submit timesheets, but their existing data remains visible to users with appropriate permissions (managers, owners, and users with `time:view_all`). The deactivated status is visible on the employee record.

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Soft-Delete and Deactivation

The system preserves historical data when an entity is deactivated rather than permanently removed.

**Employee Deactivation**

When an employee is deactivated, their employee record status changes to "deactivated." All historical data associated with the employee — including timelogs, timesheets, contracts, project memberships, and task assignments — is preserved and remains accessible to users with appropriate view permissions. A deactivated employee cannot create new timelogs or submit timesheets while deactivated.

**Account Deletion**

When a user deletes their account, their employee records in organizations they belong to are marked as "deactivated" rather than permanently deleted. This ensures that historical timelogs, timesheet approvals, contract records, and task history entries attributable to the user remain intact for organizational audit purposes. The user's global profile information is removed, and the user can no longer log in to the platform.

### Data Retention

The system retains certain business data indefinitely for historical and audit purposes.

**Contract History**

All employee contracts — both active and past — are retained as an immutable historical record. Past contracts (those with an end date set) cannot be edited or deleted. This preserves a complete employment history for each employee, including pay rate changes and working hour adjustments over time.

**Timelogs on Closed Projects**

When a project is archived or completed, all timelogs associated with that project are preserved. New timelogs cannot be created against archived or completed projects, but existing timelogs remain viewable and included in reports and timesheets. Timelogs on archived or completed projects that are part of approved timesheets remain locked.

**Approved Timesheets**

Approved timesheets and their associated timelogs are preserved and locked against modification. They remain permanently accessible for reporting and audit purposes.

**Task History**

Task history entries are retained for the lifetime of their associated task. When a task is removed (for example, as part of project deletion), its history is also removed.

**Activity Log**

Activity log entries are retained for the lifetime of the organization. Each entry records the timestamp, action type, target entity, and the user who performed the action.

### Data Recovery

The system supports recovery of deactivated entities through reactivation.

**Employee Reactivation**

A deactivated employee can be reactivated by a user with the `employee:manage` permission. Upon reactivation, the employee's status returns to "active" and they regain the ability to log time and submit timesheets. All previously existing associations — contracts, project memberships, role assignment, and historical data — are restored and intact.

**There is no recovery mechanism for permanently deleted data.** Once an organization is deleted or a project is deleted, all associated data is permanently removed and cannot be recovered. Users are expected to exercise caution when performing irreversible deletion operations.

### Permanent Deletion

Certain operations result in the irreversible, permanent removal of data.

**Organization Deletion**

An organization owner can delete the organization only when all pending timesheets are resolved (approved or rejected) and no active employee contracts exist. When an organization is deleted:

- All employees belonging to the organization are permanently removed.
- All projects, tasks, and task history are permanently removed.
- All timelogs and timesheets are permanently removed.
- All departments are permanently removed.
- All roles (including custom roles) are permanently removed.
- All activity log entries for the organization are permanently removed.

This operation cannot be undone.

**Project Deletion**

A user with `project:manage` permission can delete a project only if the project has no timelogs associated with it. When a project is deleted, all tasks within the project, task history, and project memberships are permanently removed.

**Deletion Preconditions Summary**

| Entity | Preconditions for Deletion |
|---|---|
| Organization | All timesheets resolved (approved or rejected); no active employee contracts |
| Project | No timelogs associated with the project |
| Custom Role | No employees assigned to the role |

# Real-time Communication

WebSocket/SSE connection policies and performance requirements.

## WebSocket Security and Performance

Define connection limits, heartbeat intervals, reconnection policies, and security requirements for real-time communication.

### WebSocket Connection Security

The WebSocket connection used for real-time timer communication requires the same authentication as the rest of the platform. Only authenticated users may establish a WebSocket connection. Unauthenticated connection attempts are rejected.

The WebSocket connection inherits the user's currently selected organization context. All data transmitted through the WebSocket channel is scoped to that organization. Timer data belonging to other organizations is never delivered through the channel, even if the user belongs to multiple organizations.

When a user switches organizations, the existing WebSocket connection reflects the new organization context. Timer data from the previous organization ceases to be delivered. If a timer was running in the previous organization, it continues running but its real-time updates are not visible until the user switches back.

The WebSocket channel only delivers timer data that belongs to the authenticated user. Timer data for other users — even within the same organization — is never transmitted through the channel. This applies regardless of the user's permissions; users with elevated permissions such as the ability to view all timelogs do not receive real-time timer updates for other employees.

### Concurrent Connection Limitations

The system enforces a limit on the number of concurrent WebSocket connections a single user may maintain. If a user attempts to establish connections beyond this limit, previously established connections are terminated so that the total number of active connections does not exceed the limit.

This limitation applies per user account, not per browser tab or device. All WebSocket connections established by the same authenticated user across any number of sessions count toward the limit.

### Connection Health Monitoring

The system monitors the health of each WebSocket connection through periodic heartbeat exchanges. Both the server and the client participate in this exchange to verify that the connection remains active.

If the system does not receive an expected heartbeat response from the client within the monitoring window, the connection is considered lost. The server closes the connection and releases associated resources.

Upon detecting a lost connection, the system preserves the user's timer state on the server. The timer — including its start timestamp, selected project, selected task, and description — remains intact. The timer continues accumulating time from its original start timestamp. No automatic stop, pause, discard, or timelog generation occurs as a result of a lost connection.

The user's timer state is preserved indefinitely until the user explicitly stops or discards the timer, regardless of how long the connection remains lost.

### Reconnection Policy

When a user reconnects after a disconnection, the system authenticates the new WebSocket connection using the same user session and organization context. If the user's session has expired, the user must re-authenticate before establishing a new WebSocket connection.

Upon successful reconnection, the system delivers the current timer state to the user through the WebSocket channel. The timer is displayed as active with the elapsed duration calculated from the original start timestamp, reflecting all time accumulated — including the period during which the user was disconnected.

No timelog is automatically created during or after a disconnection. The user may stop the timer at any point to generate a timelog with the full accumulated duration, or discard the timer to cancel it without creating a timelog.

After reconnection, the user may edit the running timer's description, project, or task before stopping it. Any edits are delivered through the WebSocket channel immediately.