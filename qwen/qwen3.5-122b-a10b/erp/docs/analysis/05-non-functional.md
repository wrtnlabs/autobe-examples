**hrmPlatform — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Organization Data Isolation

Each organization operates as an independent data boundary. All data created within an organization—including employees, projects, tasks, timelogs, timesheets, contracts, and activity logs—is strictly isolated to that organization.

Employees in one organization cannot access, view, or modify data from any other organization, even if they are members of multiple organizations.

When a user logs in and selects an organization, all subsequent actions and data access are scoped exclusively to that selected organization. Users can switch between organizations without logging out, but at any given time, they only see and interact with data from their currently selected organization.

The system enforces organization context on all data operations, ensuring that data isolation is maintained at the platform level.

### Data Ownership

Users own their global account and profile data, which includes display name, avatar image, and phone number. This profile data is shared across all organizations the user belongs to.

When a user creates an organization during sign-up, they become the owner of that organization. Organization owners have full control over their organization's data and settings.

Organization data—including employees, projects, tasks, timelogs, timesheets, departments, roles, and contracts—belongs to the organization, not to individual users. When an organization is deleted, all organization data is permanently deleted. The organization owner's user account remains, but is no longer associated with any organization.

When a user deletes their account, their employee records in other organizations are marked as deactivated. If the user is the sole owner of an organization, they must transfer ownership or delete the organization before their account can be deleted.

Employee contracts are maintained as an immutable historical record. Past contracts cannot be edited, ensuring accurate historical employment and compensation data is preserved.

### Access Control

Access to organizational data is controlled through role-based permissions. Each organization defines its own roles, with three built-in roles that cannot be deleted: Owner, Manager, and Employee.

The Owner role has full access to all features and can manage roles and members. The Manager role can manage employees and projects, approve timesheets, and view reports. The Employee role can track time, submit timesheets, and view their own data.

Organization owners can create custom roles with specific combinations of permissions. Each employee in an organization is assigned exactly one role, and role assignments can be changed by users with employee management permission.

All data access operations are validated against the user's role and permissions within their selected organization. Users cannot access data or perform actions beyond what their assigned role permits.

### Data Privacy and Visibility

User profile data (display name, avatar, phone number) is personal and shared across all organizations the user belongs to. This data is controlled by the user through their global profile settings.

When an employee is deactivated, their historical data—including timelogs, timesheets, and contracts—is preserved for reporting and audit purposes. Deactivated employees cannot log new time or submit new timesheets, but their past contributions remain visible in organizational records.

Employees can only view and access their own timelogs and timesheets unless they have permission to view all employees' time data. Project members can view tasks within their assigned projects, but cannot access tasks from projects they are not assigned to.

Activity logs record significant actions including employee invitations, deactivations, contract changes, project changes, task status changes, timesheet submissions, approvals, rejections, and role assignments. Users with organization management permission can view the full activity log for their organization.

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Organization Data Deletion

When an organization is deleted by its owner, all associated data is permanently and irreversibly removed from the system. This includes:

- All employees and their employee records
- All projects and their associated tasks
- All timelogs and timesheets
- All contracts and department records
- All custom roles and role assignments
- All activity log entries

The organization owner's user account remains active but is no longer associated with any organization. The owner can create a new organization or join existing organizations.

Organization deletion is only permitted when:
- All pending timesheets have been resolved (approved or rejected)
- There are no active employee contracts

Once an organization is deleted, the data cannot be recovered. Users should ensure all necessary data is exported before initiating organization deletion.

### Employee Record Deactivation

Employee records follow a deactivation model rather than immediate deletion. When an employee is deactivated:

- The employee cannot log new time entries
- The employee cannot submit new timesheets
- All historical data is preserved, including:
  - Past timelogs and timesheets
  - Historical contracts
  - Project memberships
  - Task assignments and history

Deactivated employees can be reactivated by users with employee management permissions. Upon reactivation, the employee regains full access to log time and submit timesheets.

When a user deletes their account:
- Employee records in organizations where the user is not the sole owner are marked as deactivated
- Historical data for those employee records is preserved
- The user cannot be reactivated; a new account would need to be created

This approach ensures historical records remain intact for reporting, audit, and compliance purposes while preventing deactivated employees from creating new data.

### Timelog Retention and Locking

Timelogs have specific retention rules based on their timesheet status:

- Timelogs in draft timesheets can be edited or deleted by the employee who created them
- Timelogs in submitted timesheets cannot be edited or deleted until the timesheet is rejected
- Timelogs in approved timesheets are permanently locked and cannot be edited or deleted under any circumstances
- Users with time management permissions can edit or delete any employee's timelogs, subject to the same timesheet status restrictions

Timelogs can only be permanently deleted when:
- They are not part of any submitted timesheet
- They are not part of any approved timesheet

This ensures that approved timesheets serve as immutable records of work performed, which is critical for payroll, billing, and compliance purposes.

### Timesheet State and Retention

Timesheets follow a state-based retention model:

- Draft timesheets can be modified, edited, or deleted by the employee
- Submitted timesheets are locked from modification until reviewed
- Approved timesheets are permanently locked and serve as immutable records
- Rejected timesheets return to draft status and can be modified and resubmitted

Once a timesheet is approved, it cannot be changed. This ensures an audit trail of approved work hours that cannot be altered retroactively.

Timesheets are retained indefinitely as part of the organization's historical records. There is no automatic archival or deletion of timesheets based on age.

### Immutable Historical Records

Certain records are maintained as immutable historical data that cannot be altered:

**Contracts**
- Past contracts (those with an end date) cannot be edited
- Only the current active contract can be modified
- When a new contract is created, the previous contract's end date is automatically set to the day before the new contract starts
- This creates an unbroken chain of employment terms

**Activity Logs**
- All activity log entries are immutable once created
- Activity logs record significant actions including employee changes, contract modifications, project updates, task status changes, and timesheet approvals
- Activity logs cannot be deleted or modified

**Approved Timesheets**
- Once approved, timesheets and their associated timelogs cannot be edited or deleted
- This provides an audit trail for payroll and billing verification

These immutable records ensure data integrity for compliance, auditing, and historical reference purposes.

### Project Data Retention

Project data retention depends on the project's status and associated timelogs:

- Active projects can be edited, archived, or completed
- Archived or completed projects cannot receive new timelogs
- Projects can only be deleted if they have no timelogs associated with them
- Projects with timelogs must be archived or completed rather than deleted

When a project is archived or completed:
- Existing timelogs are preserved
- Historical task data is preserved
- Project membership records are preserved
- The project can be viewed but not modified (except by users with project management permissions who can change status back to active)

This ensures that project history and time tracking data remain available for reporting and analysis even after projects are no longer active.

### Data Recovery Limitations

The system does not provide automatic data recovery mechanisms. Users must take precautions to prevent accidental data loss:

**No Soft Delete Window**
- Organization deletion is permanent and immediate
- Employee deactivation is reversible, but account deletion is not
- Timelogs deleted outside of timesheets are permanently removed

**No Backup Restoration**
- The system does not offer user-initiated backup restoration
- Organizations should export critical data before deletion actions

**Recommended Practices**
- Export timesheet and timelog data before deleting organizations
- Deactivate employees instead of deleting when future rehire is possible
- Review timesheet approvals carefully as they cannot be undone
- Archive projects instead of deleting when historical data may be needed

Users with organization management permissions should establish internal data export and backup procedures to meet their specific compliance and business continuity requirements.

# Real-time Communication

WebSocket/SSE connection policies and performance requirements.

## WebSocket Security and Performance

Define connection limits, heartbeat intervals, reconnection policies, and security requirements for real-time communication.

### Real-Time Timer Updates

The system shall provide real-time updates for timer state changes to all authorized users viewing the same organization context.

When a user starts, stops, or updates an active timer, the updated timer state shall be visible to other authorized users within a short latency period.

The system shall maintain consistent timer state across all connected clients for the same organization.

Timer updates shall reflect the current time, project assignment, task assignment, and description in real-time.

### Connection Resilience

The system shall maintain real-time connectivity for timer functionality during normal operation.

When connectivity is temporarily lost, the system shall automatically attempt to restore the real-time connection.

Upon connection restoration, the system shall synchronize the current timer state with the latest server data.

Users shall be notified when real-time connectivity cannot be maintained, with guidance to refresh their connection.

### Timer State Consistency

The system shall ensure that timer state is consistent across all users viewing the same organization.

Multiple users shall not be able to simultaneously control the same active timer.

The system shall prevent timer state conflicts when multiple connection attempts occur.

Timer duration calculations shall remain accurate regardless of connection interruptions or reconnections.

### Resource Management

The system shall manage real-time connections efficiently to support multiple concurrent users.

Connection resources shall be released when users disconnect or complete their session.

The system shall prevent resource exhaustion from excessive connection attempts.

Connection limits shall be enforced per user to ensure fair resource allocation across the organization.