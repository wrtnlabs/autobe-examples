**erpHrm — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Data Ownership Principles

Users retain ownership of all content and data they create within the system.

The system maintains clear attribution linking each data item to its creating user.

Data ownership may be transferred to another user only when explicitly initiated by the current owner.

System-generated metadata and operational logs remain the property of the system operator.

When content is shared or modified, the system preserves the original ownership attribution.

### Privacy Controls and Consent

Users must provide explicit consent before personal data is collected or processed.

Users may access all personal information stored about them through a self-service interface.

Users may modify privacy preferences to control the visibility of their data to other users.

The system shall process personal data only for the purposes consented to by the user.

Users may withdraw consent for data processing, subject to any legal retention requirements.

### Data Access and Sharing Policies

Data owners may grant or revoke access permissions to specific users or user groups.

Data may only be shared with external third parties with explicit consent from the data owner.

System administrators may access user data solely for technical support, maintenance, or legal compliance purposes.

Access permissions automatically terminate when a user account is deactivated or deleted.

The system maintains a record of when data was accessed and by whom.

### Data Retention and Deletion Rights

Users may request the deletion of their personal data and created content at any time.

Upon deletion request, the system shall remove data from active storage within a reasonable timeframe.

Backup copies containing user data may be retained only for the period necessary for system recovery.

Users may export their data in a commonly used format prior to deletion.

The system shall notify users of any legal obligations that prevent immediate deletion of requested data.

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Soft-Delete Mechanism for Employee Records

Employee records support a soft-delete mechanism through deactivation. When an employee is deactivated, the record is marked with a "deactivated" status rather than being removed from the system.

**Deactivation Effects:**
- The deactivated employee can no longer log time entries or submit timesheets
- All historical data associated with the employee, including timelogs and timesheets, remains preserved and accessible
- The employee record remains visible in the organization with its status clearly indicated
- The user account associated with the employee remains intact and can be used in other organizations

**Deactivation Scope:**
- Deactivation applies only within the specific organization where the action was taken
- If a user belongs to multiple organizations, deactivation in one organization does not affect their status in other organizations
- The employee's contracts, project memberships, and task assignments are preserved but the employee cannot perform new actions

**Soft-Delete Applicability:**
- Employee deactivation is the primary soft-delete mechanism in the system
- Organizations, projects, departments, and other entities do not support soft-delete; deletion of these entities is immediate and permanent (subject to applicable constraints)
- When a user deletes their account, their employee records in organizations where they are not the sole owner are marked as "deactivated"

### Data Retention for Deactivated Employees

Data associated with deactivated employees is retained indefinitely unless explicitly removed through other processes.

**Retained Data for Deactivated Employees:**
- All timelogs recorded by the employee are retained with full details including date, duration, project, task, and billable status
- All timesheets submitted by the employee are retained with their approval status, submission dates, and review history
- All contracts associated with the employee are preserved as immutable historical records
- Project memberships and task assignments remain recorded for historical reference
- Activity log entries related to the employee's actions are retained

**Data Accessibility:**
- Users with appropriate permissions can continue to view deactivated employees in the employee list
- Deactivated employees appear in reports and can be included in historical data analysis
- Timesheets and timelogs of deactivated employees remain visible to users with time:view_all or time:approve permissions
- The deactivated employee's profile information (display name, avatar) remains visible where referenced in historical records

**No Automatic Expiration:**
- There is no automatic purging of deactivated employee data after a specific time period
- Data remains accessible for as long as the organization exists in the system
- Historical records maintain their integrity for audit and reporting purposes

### Recovery and Reactivation

Deactivated employee records can be fully restored through reactivation, which reverses the soft-delete status.

**Reactivation Capability:**
- Users with employee:manage permission can reactivate deactivated employees at any time
- Reactivation restores the employee to "active" status immediately
- No data is lost during the transition from deactivated to active status

**Post-Reactivation State:**
- The reactivated employee regains full functionality to log time and submit timesheets
- All historical data remains intact and accessible
- The employee's previous project memberships are restored (if projects still exist and are active)
- The employee can resume work with the same role and permissions as before deactivation

**Account Recovery Flow:**
- If a user deleted their account and later creates a new account with the same email, their previous employee records in organizations are not automatically linked
- Each organization must explicitly invite and re-add the user to establish new membership
- Previous employee records remain associated with the deleted user account and remain in "deactivated" status

**User Account vs Employee Record:**
- Reactivation of an employee record is independent of the associated user account status
- If a user has deleted their account, reactivating their employee record alone does not restore account access
- The user must have an active account and be invited back to the organization to fully resume work

### Permanent Deletion Conditions

Certain actions result in the permanent and irreversible deletion of data from the system.

**Organization Deletion:**
- When an organization is deleted, all associated data is permanently removed including:
  - All employee records and their memberships
  - All departments and their hierarchies
  - All projects, tasks, and project memberships
  - All timelogs and timesheets
  - All contracts
  - All roles (both built-in and custom)
  - All activity logs
- The organization owner's user account is preserved but disassociated from the deleted organization
- Organization deletion is only permitted when:
  - All pending timesheets are resolved (approved or rejected)
  - There are no active employee contracts

**Project Deletion:**
- Projects can be permanently deleted only if they have no timelogs associated with them
- If a project has any timelogs (even from deactivated employees), deletion is blocked until those timelogs are removed
- Deleting a project also permanently deletes all associated tasks and task history
- Project memberships are removed when a project is deleted

**User Account Deletion:**
- When a user deletes their account:
  - If they are the sole owner of any organization, account deletion is blocked until ownership is transferred or those organizations are deleted
  - Their employee records in other organizations are marked as "deactivated" (soft-delete)
  - Their personal profile data, including display name, avatar, and phone number, is permanently deleted
  - Their login credentials are permanently removed
  - The user can no longer access the system or any organizations

**No Recovery from Permanent Deletion:**
- Permanently deleted data cannot be recovered through any user-facing mechanism
- Once an organization is deleted, all its data is gone and cannot be restored by organization members
- Once a project with no timelogs is deleted, it cannot be recovered
- Once a user account is deleted, the profile information is permanently removed

# Real-time Communication

WebSocket/SSE connection policies and performance requirements.

## WebSocket Security and Performance

Define connection limits, heartbeat intervals, reconnection policies, and security requirements for real-time communication.

### WebSocket Connection Security

The user requirements do not specify the use of WebSocket or Server-Sent Events (SSE) for real-time communication. The system functionality described in the requirements can be implemented without persistent real-time connections. Therefore, no specific WebSocket security policies, connection authentication mechanisms, or message encryption requirements are defined at this stage. If real-time features are required in future iterations (such as live timer synchronization or real-time activity log updates), specific security requirements should be established at that time.

### Connection Limits and Resource Management

The user requirements do not specify any connection limits, concurrent user limits, or resource management policies related to persistent connections such as WebSocket or SSE. The system architecture should support standard HTTP request-response patterns for all described functionality including time tracking, timesheet submission, and reporting. No specific maximum connection counts per user, IP-based connection throttling, or resource allocation policies are defined.

### Heartbeat and Connection Health Monitoring

The user requirements do not mention heartbeat mechanisms, ping/pong intervals, or connection health monitoring for real-time communication channels. The timer functionality described allows for indefinite runtime without automatic stop, but this is a business logic feature rather than a connection keepalive requirement. No specific heartbeat intervals, connection timeout thresholds, or automatic disconnection policies are specified.

### Reconnection and Session Continuity

The user requirements do not specify reconnection policies, automatic reconnection attempts, or session continuity requirements for real-time connections. Users are expected to interact with the system through standard request-response cycles. No specific exponential backoff strategies, maximum reconnection attempt limits, or session restoration procedures are defined.

# Storage Capacity

Storage capacity planning and CDN requirements.

## Storage Capacity Requirements

Define storage requirements and capacity planning for file storage.