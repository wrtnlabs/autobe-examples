**erpHrm — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Data Isolation

All organizational data — including employees, projects, tasks, timelogs, timesheets, contracts, departments, roles, and activity logs — is strictly isolated per organization. No data from one organization is visible to or accessible by members of another organization, regardless of shared user accounts.

A user who belongs to multiple organizations operates within exactly one organization context at a time. Switching organization context immediately shifts all data visibility to the newly selected organization. Data from any other organization the user belongs to is not accessible during a session scoped to a different organization.

The system enforces organization context on every operation. Any request that attempts to read or modify data outside the requesting member's current organization context is rejected. There is no cross-organization data aggregation or reporting available to any user.

Even if two organizations share a common user, that user's actions and data in one organization are completely invisible to members of the other organization. Only the user's global profile (display name, avatar, phone number) is shared across organizations, and this profile does not expose any organization-specific activity.

### Data Ownership

Each organization owns all data generated within its boundaries. This includes employee records, contracts, departments, projects, tasks, timelogs, timesheets, timers, roles, and activity logs. The organization's designated owner holds ultimate authority over this data and can manage, transfer, or permanently remove it by deleting the organization.

Timelogs created by an employee are owned by that employee within the organization. However, once a timelog is included in an approved timesheet, organizational authority supersedes individual ownership, and the timelog becomes locked — the individual employee can no longer modify or delete it independently.

Employee contract records are owned by the organization. While an employee may view their own contracts, they cannot modify or delete contract records. Only users with the appropriate management permission can create or edit contracts on behalf of the organization.

Task history entries are system-generated records owned by the organization. They cannot be modified or deleted by any user.

Activity log entries are owned by the organization and represent an immutable audit trail. No individual user — including the organization owner — can alter or delete activity log entries.

### Access Control Boundaries

Access to data within an organization is governed by the role assigned to each organization member, as defined in the permission model described in the actors and authentication document.

An employee's personal data — their own timelogs, timesheets, contracts, and profile — is visible only to themselves and to users who hold the relevant view or manage permissions within the same organization. No employee can access another employee's personal time data unless they hold the `time:view_all` permission.

Organization-level settings, activity logs, and reports are restricted to users holding the corresponding permissions. Employees without elevated permissions cannot view organization-wide data or reports.

A deactivated organization member loses the ability to access or operate within the organization. Their historical data remains preserved and visible to authorized users within the organization, but the deactivated member themselves can no longer interact with any organizational data.

Project-level access is bounded by project membership. An employee can only view tasks and log time against projects to which they are explicitly assigned. Being a member of an organization does not grant access to all projects within that organization unless the employee holds the `project:view` permission.

### User Privacy Boundaries

A user's global profile — including display name, avatar image, and phone number — is visible across all organizations the user belongs to. However, the user's email address and password are credential-level information and are not exposed to other organization members.

Organization members can see the display names and avatars of other members within the same organization for the purpose of assigning tasks, reviewing timesheets, and reading activity logs. No member can view another member's phone number, email address, or credentials through organizational features.

When a user deletes their own account, their employee records in all organizations they belong to are marked as deactivated. Their historical contributions — timelogs, timesheets, task assignments, and activity log entries — are retained within those organizations under their recorded identity, but the underlying user account is removed and can no longer be used to log in.

Invitation records store the email address of the invited person. This information is accessible only to users with employee management permission within the inviting organization. Pending invitation emails are not exposed to general organization members.

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Soft Delete and Deferred Deletion

When certain records are removed through normal application actions, the system applies a soft delete rather than immediately erasing the data. This approach preserves historical context while making the records invisible in standard application views.

The following records are subject to soft deletion:

- An employee's organization membership record is marked as "deactivated" rather than physically removed when the employee is deactivated. All historical timelogs, timesheets, and contracts belonging to that employee remain accessible to authorized users.
- When a user deletes their own account, their employee records in organizations where they are not the sole owner are marked as deactivated. The account itself is flagged as deleted and is no longer accessible for login, but the associated organizational data (timelogs, timesheets, contracts) is preserved under the organization's ownership.
- Timesheets that are rejected return to draft status; they are not deleted and remain in the employee's possession for resubmission.

Records that are deactivated or marked as deleted in this way do not appear in standard listings unless the viewer holds the appropriate permission and explicitly requests to include deactivated records. Deactivated employee records and their historical data remain visible to users with `employee:view` or `employee:manage` permission.

### Permanent Deletion

Certain deletion operations in the platform result in the permanent and irreversible removal of data. These actions cannot be undone, and the data cannot be recovered after they are executed.

The following deletion operations are permanent:

- When an organization is deleted by its owner, all data belonging to that organization is permanently deleted. This includes all employees (organization member records), departments, projects, tasks, timelogs, timesheets, timer records, contracts, roles, invitations, and activity logs associated with the organization.
- A project may be permanently deleted by a user with `project:manage` permission, provided the project has no associated timelogs. Once deleted, the project and all its tasks and task histories are permanently removed.
- A department may be permanently deleted by a user with `org:manage` permission. The department record itself is removed, but employees who belonged to that department are not deleted; their department field is simply cleared.
- Individual timelogs may be permanently deleted by the owning employee (subject to timesheet status restrictions) or by a user with `time:manage` permission. Once a timelog is deleted, it is removed permanently and its contribution to any draft timesheet calculations is lost.

Before an organization deletion is permitted, the system enforces preconditions — specifically that all pending timesheets are resolved and that there are no active employee contracts — as defined in the business rules. These preconditions exist to ensure that permanent deletion does not occur while business-critical data is in an unresolved state.

The owner's personal user account is not deleted when an organization is deleted; it remains active and is simply disassociated from that organization.

### Data Retention Policy

The platform does not define time-based automatic expiry or purging of records. Data is retained indefinitely unless an explicit deletion action is taken by an authorized user.

Key retention behaviors are as follows:

- Historical employee contracts are immutable and retained permanently for as long as the organization exists. Past contracts cannot be edited or deleted; they serve as an auditable historical record of employment terms.
- Approved timesheets and their associated locked timelogs are retained permanently within the organization and cannot be edited or deleted by employees. Users with `time:manage` permission may edit or delete timelogs, but approved timesheets themselves can only be acted upon by users with `time:approve` permission.
- Activity log entries are retained for the lifetime of the organization. They record significant actions such as employee invitations, contract changes, project lifecycle events, timesheet approvals or rejections, and role changes. These logs are not editable and cannot be deleted individually.
- Deactivated employees' historical data — including their timelogs, timesheets, and contracts — is preserved within the organization for as long as the organization exists.
- Task history entries, which record status changes on tasks, are retained permanently and cannot be deleted individually.

In summary, all organizational data persists until either the organization itself is deleted (resulting in full permanent deletion) or a specific authorized deletion action is taken on an individual record.

### Recovery Limitations

The platform does not provide a built-in recovery or undo mechanism for permanently deleted data. Users and organization owners should be aware of the following recovery limitations:

- Once an organization is deleted, none of the data belonging to that organization can be recovered. The deletion is final and irreversible.
- Once a project is deleted (only permitted when no timelogs exist), the project record and all associated tasks and task history are permanently gone.
- Once a timelog is permanently deleted, it cannot be restored. If the timelog had been included in a draft timesheet, the timesheet's calculated total will be updated to reflect the removal.
- A rejected timesheet is not deleted; it returns to draft status, allowing the employee to modify and resubmit it. This is the only scenario in the platform where a record transitions back to an editable state after a review action.
- Deactivated employees can be reactivated by a user with `employee:manage` permission. Reactivation restores the employee's ability to log time and submit timesheets; their historical data was never removed and becomes fully accessible again upon reactivation.
- A pending invitation that has not yet been accepted can be considered effectively cancelled if the inviting organization is deleted, but the invited user's ability to register and join other organizations is unaffected.

Because recovery is not possible for most permanent deletions, the system enforces precondition checks before allowing destructive operations (such as requiring all pending timesheets to be resolved before an organization can be deleted), giving authorized users the opportunity to ensure data is in a safe state before proceeding.

# Real-time Communication

WebSocket/SSE connection policies and performance requirements.

## WebSocket Security and Performance

Define connection limits, heartbeat intervals, reconnection policies, and security requirements for real-time communication.

### WebSocket Security

Real-time communication channels established for live features such as the active timer and dashboard updates must be restricted to authenticated members operating within a valid organization context.

Only members who have successfully authenticated and selected an active organization may establish a real-time connection. A connection attempt made without a valid session or outside of an established organization context is refused before any data is exchanged.

All data transmitted over real-time connections is scoped to the member's currently selected organization. A member may not receive events belonging to another organization, even if that member belongs to multiple organizations. This isolation mirrors the data-access rules defined in the Data Ownership and Privacy section.

When a member's session expires or is invalidated, the corresponding real-time connection is immediately terminated. The member must re-authenticate before a new connection can be established.

# Storage Capacity

Storage capacity planning and CDN requirements.

## Storage Capacity Requirements

Define storage requirements and capacity planning for file storage.

### File Asset Storage Scope

The platform stores two categories of uploaded file assets: organization logo images and user profile avatar images.

Organization logo images are uploaded by organization owners when creating or editing their organization settings. Each organization may have at most one logo image at a time; uploading a new logo replaces the existing one.

User profile avatar images are uploaded by users when editing their global profile. Each user may have at most one avatar image at a time; uploading a new avatar replaces the existing one.

No other file types are stored by the platform. Documents, attachments, and arbitrary binary uploads are outside the scope of the system.

File assets are associated with their owning entity (organization or user profile) and must remain accessible as long as the owning entity exists. When an organization is permanently deleted, its logo image is also permanently removed from storage. When a user account is permanently deleted, the user's avatar image is also permanently removed from storage.

### File Asset Delivery and Access Control

Organization logo images must be accessible to all members of the organization to which the logo belongs. Members of other organizations must not be able to access another organization's logo through any internal reference.

User profile avatar images are accessible to any organization member who can view the corresponding user's profile. Because user profiles are shared across organizations, the avatar image is visible wherever the user appears within any organization context they belong to.

File assets must be served reliably to end users. The platform must ensure that stored images can be retrieved and displayed within the application whenever a member accesses a page that references them.

Access to stored file assets must respect the data isolation boundaries defined in the Data Ownership and Privacy section. No cross-organization asset access is permitted.

### Storage Capacity Considerations

The platform's storage capacity requirements are driven by the volume of organizations and user accounts using the system. Storage growth is proportional to the number of active organizations (each contributing at most one logo image) and the number of registered users (each contributing at most one avatar image).

Because each entity (organization, user) holds at most one image at a time, the total number of stored files is bounded by the sum of active organizations and active user accounts. Replaced images are removed from storage promptly when a new image is uploaded, ensuring that storage does not accumulate stale or orphaned assets.

Organization deletion triggers permanent removal of associated assets, and user account deletion triggers permanent removal of the user's avatar. These lifecycle-coupled deletions keep storage consumption aligned with the active data set.

The platform does not impose an explicit per-organization or per-user storage quota beyond the single-image constraint per entity, as the user requirements do not specify numeric limits.