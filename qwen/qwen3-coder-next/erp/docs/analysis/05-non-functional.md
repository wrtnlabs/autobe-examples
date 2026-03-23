**hrmTracker — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Data Isolation by Organization

Each organization’s data is strictly isolated from all other organizations. Employees, projects, tasks, timelogs, timesheets, departments, contracts, and activity logs belonging to one organization cannot be accessed or viewed by users of another organization. When a user selects an organization context, all operations and data views are automatically scoped to that organization. A user who belongs to multiple organizations sees only data from their currently selected organization, and switching organization context does not require re-authentication.

### Data Ownership

The organization owns all organizational data, including employees, projects, departments, timelogs, timesheets, and activity logs created within it. Individual users retain ownership of their global profile information (display name, avatar, phone number). When an employee is deactivated or deleted, their associated employee data (timelogs, timesheets, contracts) is preserved under the organization’s ownership. If an organization is deleted, all organizational data is permanently removed; the organization owner’s global account remains but loses all associations with the deleted organization.

### Access Control Boundaries

Access to data is strictly governed by role-based permissions defined per organization. An employee can view only their own data unless authorized by role permissions: for example, project members with `employee:view` can view the employee list, while those with `time:view_all` can view all timelogs and timesheets. Users with `report:view` can access reports but only for their selected organization. No user can access data across organizations, regardless of their role. System actions (e.g., deactivation, contract updates, activity logging) are traceable to the performing user but only visible within the same organization context.

### Privacy of Personal Information

Employee personal information—including reference to user account, department, position, and employment type—is accessible only to users with appropriate permissions (`employee:view` or `employee:manage`). Contract pay rates and working hours are visible only to authorized roles. Timelogs and timesheets include private notes and descriptions visible only to the employee who created them and users with `time:manage` or `time:view_all` permissions. Activity log entries record who performed an action but do not expose sensitive system internals; access to the full activity log is limited to users with `org:manage` permission within the same organization. Global profile information (email, phone) is shared across organizations only when a user is invited to join another organization, and is never exposed to the public.

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Soft-Delete Behavior

When an employee enters inactive status, their historical data—including timelogs, timesheets, and task history—is preserved and remains accessible for reporting and audit purposes. The system retains this data indefinitely while the organization exists, ensuring continuity of records without altering historical integrity. Projects, tasks, departments, contracts, and activity logs are not subject to automatic soft-deletion based on entity state changes; instead, their status reflects current business conditions while preserving historical information. Timesheets that are approved or rejected retain all included timelogs and metadata permanently to support compliance requirements. The system does not automatically remove data based on user inactivity or elapsed time.

### Data Retention Policy

Organization data—including employees, projects, timelogs, timesheets, contracts, departments, activity logs, and task history—is retained for the duration of the organization’s existence. When an organization is permanently removed from the system, all associated data is irreversibly erased. Employee records with inactive status are retained throughout the organization's lifespan. Project archives and completed status are preserved indefinitely. Timesheet approval or rejection history, including timestamps and reviewer identity, is retained permanently to maintain an audit trail of all significant actions within the organization.

### Data Recovery

Inactive employee data may be restored upon reactivation of the employee record, allowing full access to historical timelogs, timesheets, and contracts. Timesheets that are rejected may be revised and resubmitted by the employee, enabling recovery of draft-level changes prior to final approval. Once an organization is permanently removed, all associated data is irreversibly erased and cannot be recovered.

### Permanent Removal

When an organization is permanently removed from the system, all associated data—including employees, projects, tasks, timelogs, timesheets, departments, contracts, activity logs, and pending invitations—is irreversibly erased. The organization owner’s user account remains in the system but is disassociated from all organizations. If the owner deletes their account after no longer belonging to any organization, their account is permanently removed.