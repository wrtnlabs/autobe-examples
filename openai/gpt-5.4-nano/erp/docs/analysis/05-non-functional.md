**erpHrmTimeTracking — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Data Isolation by Organization Context

All operational data in the system is isolated per organization. Employees, projects, tasks, timelogs, and timesheets from one organization are not accessible within another organization.

When a user belongs to multiple organizations, the system treats the user’s currently selected organization context as the boundary for all subsequent actions and views.

A user may only view employees, contracts, departments, projects, tasks, timelogs, timesheets, activity log entries, and reports that belong to the currently selected organization.

If a user attempts to view or manage data that belongs to a different organization than the currently selected context, the system rejects the request and does not reveal the existence of that other organization’s data.

Employees can view only their own employee-related personal data within the currently selected organization context; they cannot view other employees’ data in the same organization unless their role grants that access.

Users with organization-scoped viewing permissions (such as report access or activity log access) only receive results computed from data belonging to the currently selected organization.

### Data Ownership Responsibilities

Organization profile data (name, description, logo image, currency, timezone, and fiscal start month) is owned and maintained by the organization for which it applies.

Within an organization, the user who creates an employee record (by inviting or adding via organization invitation flow) is responsible for the employee’s organizational membership and role assignment within that organization.

Employee contracts are owned by the employee within the organization context. Contract history is preserved as immutable records for past contracts.

Projects and project structure data are owned by the organization that contains them.

Project membership ownership is governed by the organization’s project membership assignments; only users with the required role permissions can create or remove assignments.

Timelogs are owned by the employee who logged the time for the organization context.

Timesheets are owned by the employee for the organization context and are created from and include that employee’s timelogs for the specified week.

The activity log entries belong to the organization context in which the actions occur.

Reports are generated from organization-owned data and are owned by the organization context for which they are requested.

### Access-Control Boundaries Across Roles and Scopes

Role-based access control applies within each organization. Built-in roles and custom roles determine which organization features a user can access within the currently selected organization context.

Organization owners have full access to organization-scoped configuration and membership management functions, including managing roles and members, and can view the full activity log for the organization.

Managers can access employee management, project management views and actions as permitted by their role permissions, and can approve timesheets and view relevant reporting as permitted by their role permissions.

Employees can access only their own time tracking data (such as their own timelogs, timesheets, and contracts) and can perform time tracking actions allowed for the employee role, while being restricted from modifying or deleting other employees’ timelogs.

Custom roles apply only within the organization where they are defined. A custom role’s permission set is enforced within that same organization context.

Role deletion is restricted by whether employees are assigned to the role. If any employees are assigned to a custom role, the role cannot be removed from the organization.

When a user changes their assigned role in an organization, the system applies the new permissions for subsequent actions within that organization context.

If a user does not have the required permissions for an action, the system rejects the request and provides an authorization failure response without disclosing sensitive details about the target data beyond what is necessary to understand the rejection.

### Privacy of User Profile Data

A user has a global profile (display name, avatar image, and phone number) shared across all organizations the user belongs to.

When viewing employee lists and employee details within an organization, the system exposes only the employee-relevant information needed for the organization’s HR and time tracking workflows, consistent with the employee list and employee detail viewing permissions.

A user’s ability to view other employees’ data is controlled by role permissions within the currently selected organization context. Employees must not be able to view other employees’ personal data unless their permissions explicitly allow it.

Deactivated employees remain visible in historical contexts where timelogs and timesheets were preserved. However, deactivated status prevents them from logging time or submitting timesheets going forward within that organization.

Users and organization owners can edit their own organization settings (organization owners) or their own global profile (users). Edits apply only within the correct scope: organization settings change for the organization where the user is an owner, and profile changes change for the user across all organizations the user belongs to.

If a user deletes their account, the system must handle their employee records in other organizations by marking them as deactivated, so that time tracking actions cannot resume from those employee records while preserving historical time tracking data where it already exists.

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Employee Deactivation as Soft-Delete and Recovery

- When an employee record is deactivated, the employee is considered inactive for time tracking purposes within the organization (they cannot log time or submit timesheets).
- When an employee is deactivated, the employee’s historical data (timelogs and timesheets) is preserved and remains available for reporting and review.
- Deactivated employees can be reactivated by users with the relevant organization permission; after reactivation, the employee becomes able to log time and submit timesheets again.
- The platform must ensure that deactivated employee status does not remove existing timelog and timesheet history from the organization view.

```mermaid
flowchart LR
  A["Active employee"] -->"Deactivation" B["Deactivated employee"]
  B -->"Reactivation" A
```


### Organization Deletion and Permanent Deletion Behavior

- Organization owners can delete their organization only when there are no active employee contracts and all pending timesheets are resolved (approved or rejected), consistent with the organization lifecycle rules.
- When an organization is deleted, all employees, projects, tasks, timelogs, and timesheets within that organization are permanently deleted.
- When an organization is deleted, the owner’s account remains in the system but is no longer associated with any organization.
- The system must prevent any newly created or edited time-tracking data within an organization that has been deleted.

```mermaid
flowchart LR
  A["Organization exists"] -->"Delete organization" B["Organization deleted"]
  B --> C["Owner account remains, no longer linked"]
```


### Retention of Historical Time Data

- Historical time tracking data associated with deactivated employees must be retained (timelogs and timesheets) rather than deleted when the employee is deactivated.
- Historical timelogs and historical timesheets must remain available after deactivation of the employee so that organization reporting and audit needs are supported.
- The system must treat past contract records as immutable historical information: once a contract is no longer the active contract, it cannot be edited as a matter of historical record retention.


### Recovery Expectations After Deactivation and Reassignment Scenarios

- If an employee is deactivated, the system must allow reactivation of that employee, restoring the employee’s ability to log time and submit timesheets while keeping historical timelogs and timesheets intact.
- If a user belongs to multiple organizations, deactivation or changes in one organization must not prevent the user from active time tracking in other organizations; only the selected organization’s scope determines access.
- After an organization is deleted, recovery of the deleted organization’s employee and time-tracking data is not supported as part of the permanent-deletion policy; the platform must communicate that the organization’s data is deleted as a result of the deletion action.