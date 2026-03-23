**hrmTracker — Business rules, validation constraints, data browsing expectations, error scenarios**

Business rules, validation constraints, data browsing expectations, error scenarios

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## Organization Rules

Each organization must have a unique name, a description, a currency code, a timezone, and a fiscal start month (1–12). Organization creation occurs only during initial user sign-up and establishes the first organizational context. Organization owners can edit any organization setting except the fiscal start month once set. An organization may only be deleted if all pending timesheets are resolved and no active employee contracts exist; deletion permanently removes all associated employees, projects, timelogs, and timesheets, but the owner’s account persists independently. A user cannot belong to two organizations with identical names.

### Organization Creation and Ownership Assignment

When an organization is created, the initiating user is permanently assigned the owner role for that organization. This role assignment is immutable and cannot be altered afterward. No other user can ever be granted the owner role for this organization.

The organization name must be unique across the entire system and cannot be empty or whitespace-only. It must be provided at creation and cannot be omitted or left blank.

The description field is optional but must contain at least one non-whitespace character if provided. Empty or whitespace-only descriptions are rejected during validation.

### Required Fields at Organization Creation

At the time of creation, the following fields are required: name, currency, timezone, and fiscal start month.

The fiscal start month must be an integer between 1 and 12, representing the first month of the fiscal year. Once set, it cannot be changed for the lifetime of the organization by any user—including the owner.

All required fields must be provided at creation and cannot be omitted or left empty.

### Format Requirements for Currency and Timezone

The currency must be a valid ISO 4217 three-letter currency code, such as USD, EUR, or KRW. Invalid codes are rejected during creation and updates.

The timezone must be a valid IANA timezone identifier, such as Asia/Seoul or America/Los_Angeles. Non-standard or invalid identifiers are rejected.

### Organization Settings Editing Permissions

Editing organization settings—including name, description, and logo—is restricted to users with the owner role. Users with other roles (such as manager or employee) cannot modify these settings.

When editing settings, all fields must comply with validation rules: the name must remain unique globally, and the logo must be a valid image URL if provided.

### Logo Image Reference Format

If provided, the logo must be a valid image URL (e.g., PNG, JPEG, or SVG). Malformed or invalid URLs are rejected during validation. If not provided, no logo reference is required.

### Description Field Validation

The description field is optional but must contain at least one non-whitespace character if submitted. Empty or whitespace-only descriptions are not accepted during validation.

### Organization Deletion Conditions

An organization can only be deleted if all pending timesheets have been resolved (approved or rejected), and all employee contracts are no longer active.

Timesheets in draft or submitted status must be processed before deletion. Unresolved timesheets block the deletion until appropriate action is taken by authorized users.

A contract is considered active if it has no end date or if the end date is in the future. All such contracts must be terminated or removed before deletion can proceed.

### Data Deletion Scope on Organization Closure

When an organization is deleted, all related data—including employee records, projects, tasks, timelogs, timesheets, departments, contracts, pending invitations, activity logs, project members, and active timers—is permanently and irreversibly removed.

### Owner Account Status After Deletion

After an organization is deleted, the owner's user account remains active and functional. It retains personal profile information (such as display name, avatar, and phone number) and can be used to join or create new organizations.

## User Rules

Every user must have a globally unique email address and an encrypted password. Display name is required and must not be empty. Users can belong to multiple organizations, but each organization must assign a distinct role per employee. When deleting an account, if the user is the sole owner of an organization, they must transfer ownership or delete the organization first; otherwise, employee records in other organizations are marked as deactivated. Password changes require confirmation of the old password. Users cannot sign up with an email already in use, even if unverified. Account deletion does not remove user profile data globally—only their association with organizations ends.

### Email Uniqueness Across System

Each user must have a globally unique email address across the entire system. A user cannot register with an email that is already associated with an existing account—even if the existing account is inactive or unverified. If a user attempts to sign up with an email already in use, the request is rejected with an appropriate error message. Email case-insensitive uniqueness is enforced (e.g., User@Example.com and user@example.com are treated as identical). A user may change their email address, but the new email must also be globally unique.

### Secure Password Storage

User passwords must be encrypted using a strong cryptographic hash algorithm before storage. Clear-text passwords are never stored, logged, or transmitted. During registration and password change, the system requires the user to provide their chosen password. If a user forgets their password, the system must support a secure password reset flow (initiated via email), not a password recovery feature. Passwords must meet minimum complexity requirements as defined during sign-up.

### Display Name Requirement

Each user must have a display name that is required and must not be empty. The display name is used to identify the user in the UI and must be non-blank (at least one non-whitespace character). Whitespace-only display names are rejected. Users can update their display name at any time, but the new value must still satisfy the non-empty requirement.

### Multi-Organization Membership

A single user account can belong to multiple organizations simultaneously. Each organization membership is represented by a separate employee record in that organization. A user’s global profile (display name, avatar, phone) is shared across all organizations. When logging in, users select an organization context; all subsequent operations are scoped to that organization. Switching organization context does not require re-authentication.

### Single Role Per Employee in Organization

Within a given organization, each employee (user) must be assigned exactly one role. A user cannot hold multiple roles in the same organization. When an employee’s role changes, the previous role assignment is replaced. An employee record cannot exist without an associated role in the organization.

### Ownership Resolution Before Account Deletion

Before deleting their account, users who are the sole owner of an organization must either: transfer ownership to another member of that organization, or delete the organization. If the user is not the sole owner, the deletion process continues after verifying no ownership conflicts. If ownership checks fail, the account deletion is rejected with a clear error message explaining the required action.

### Deactivation of Employee Records on Account Deletion

When a user deletes their account, all associated employee records in other organizations are marked as "deactivated." Deactivated employee records retain historical data (timelogs, timesheets, contracts) but cannot log time, submit timesheets, or access the system. Deactivated employees cannot be reactivated after account deletion. This change does not affect the user’s global profile—profile data remains associated with the deleted account.

### Password Change Verification

When a user requests to change their password, they must provide their current password as verification. The system validates the current password before accepting the new password. If the current password is incorrect, the request is rejected. The new password must meet the same complexity requirements as during registration. Password changes are immediate and do not require re-authentication beyond the current password confirmation.

### Unique Email Enforcement at Sign-Up and Invitation

The system prevents sign-up with an email that is already in use by any existing user account. This applies regardless of account status—active, deactivated, or unverified accounts block duplicate registration. If an invited email matches an existing unactivated account, the invitation still proceeds, but the invited user signs in with their existing account rather than creating a new one. Email uniqueness is enforced at both registration and invitation stages.

### Ownership Transfer Required for Organization Owners

Users who are owners of one or more organizations must resolve ownership before deleting their account. Resolving ownership means either transferring ownership to another member or deleting the organization(s) entirely. The system enforces this rule before initiating account deletion. Users cannot bypass this check—even if they are the only owner, they must explicitly transfer or delete before deletion proceeds.

### Profile Persistence After Leaving Organization

When a user leaves an organization (e.g., deactivation or deletion), their global user profile (display name, avatar, phone number) persists independently of the organization. Profile data is not deleted, updated, or altered due to organization membership changes. The profile remains tied to the user account and is shared across all remaining organizations the user belongs to.

### Seamless Organization Context Switching

Users can switch between organizations they belong to without logging out or re-authenticating. The system maintains an active session and updates the organization context upon request. All subsequent requests automatically use the selected organization context. Switching context does not invalidate existing session tokens or require password re-entry.

### Organization Context Enforcement for All Operations

When a user logs in, the system enforces that all actions are scoped to the selected organization. No data or operations outside the selected organization context are accessible. Attempts to access data or perform actions in another organization result in rejection. This rule applies universally—even for owners managing multiple organizations, each request is strictly bound to one organization context at a time.

### Consistent Profile Across Organizations

Each user’s profile (display name, avatar image reference, phone number) is global and shared across all organizations. Changes to profile data are immediately visible in every organization the user belongs to. Profile updates do not require organization-specific configuration or duplication. Profile data is never isolated or customized per organization.

## Employee Rules

An employee must be tied to exactly one user account and assigned exactly one role within an organization. Employment type must be one of: full-time, part-time, contractor, or intern. Status must be either active or deactivated. Deactivated employees cannot log time or submit timesheets, but all historical timelogs and timesheets remain intact for auditing. A valid invitation email is required to add an employee—invitations are sent only to employees with no existing account. When inviting an existing user, the employee record is created instantly; otherwise, a pending invitation is stored and auto-applied upon signup. Department and position/title are optional but must not exceed domain-defined display length if provided.

### Employee-User One-to-One Mapping Per Organization

Each employee record must be linked to exactly one user account within its organization. A user can have multiple employee records across different organizations, but only one employee record per organization. The system must reject attempts to create an employee record if the user already has an active employee record in the same organization.

### Role Assignment Requirement for Employees

Each employee in an organization must be assigned exactly one role. The role must be either a built-in role (Owner, Manager, or Employee) or a valid custom role defined for the organization. The system must reject employee creation or role assignment if the selected role does not exist in the organization or if no role is provided.

### Valid Employment Type Enumeration

An employee’s employment type must be one of: full-time, part-time, contractor, or intern. The system must reject any value outside this enumeration when creating or updating an employee record. Employment type is required and cannot be omitted or set to null.

### Employee Status Constraint

An employee’s status must be either active or deactivated. The system must reject any status value outside this pair when creating or updating an employee record. Status is required and cannot be null. Deactivated employees cannot perform time tracking or timesheet actions.

### Deactivated Employee Activity Restriction

If an employee’s status is deactivated, they cannot create timelogs, submit timesheets, start timers, or modify existing timelogs. The system must reject all time-related requests from deactivated employees with an appropriate error message indicating the account is deactivated.

### Preservation of Historical Records on Deactivation

When an employee is deactivated, all existing timelogs, timesheets, and historical records remain in the system for auditing purposes. The system must preserve all historical data associated with the employee; no data deletion or anonymization occurs during deactivation.

### Pending Invitation Creation for New Users

If an employee is invited via email and no user account exists for that email address, the system creates a pending invitation record linked to the organization. The invitation must include the inviting user, invitation timestamp, and target email. No employee record is created until the invited user signs up.

### Automatic Employee Creation from Pending Invitation

When a user signs up with an email address that matches a pending invitation, the system automatically creates an employee record for that user within the organization, assigns them the invited role, and deletes the pending invitation. This must occur only once and only for matching email addresses.

### Employee Edit Access Control

Only users with employee management permission can edit employee records. Editable fields include department, position, and employment type. Users without this permission must have their edit requests rejected, regardless of ownership or relationship to the employee.

### Reactivation of Deactivated Employees

An employee with status deactivated may be reactivated by users with employee management permission. Upon reactivation, all previous permissions, roles, project memberships, and historical data are restored. The employee regains full access to time tracking and timesheet submission capabilities.

### Optional Department Assignment

The department assignment for an employee is optional and may be left unset. If specified, the department must exist within the organization. The system must handle unset department assignments without data errors and must not require department for employee creation or updates.

### Optional Position or Title Field

The position or title field for an employee is optional and may be left empty. If provided, it must be a non-empty string that fits standard display constraints. No enforced length limit is applied, but the system must safely store and retrieve arbitrary-length text without truncation.

### Employee List View Access Control

Access to view the employee list is restricted by role. Users with employee view or employee management permission can view the full employee list. Users without these permissions cannot view employee records, even if they are employees themselves. The employee list supports filtering and search per defined capabilities.

## Role Rules

Three built-in roles—Owner, Manager, and Employee—cannot be deleted or modified in name. Custom roles can be created and edited only by organization owners. Each custom role must have a unique name and an explicit set of permissions. Deleting a custom role is only allowed if no employees are assigned to it. Permissions assigned to roles must be selected from the predefined set (e.g., org:manage, employee:manage). No role can possess duplicate permissions. Role assignment to employees is atomic and requires valid permission scopes. Owner role cannot be assigned to non-owners via custom role update.

### Built-in Role Constraints

The three built-in roles—Owner, Manager, and Employee—cannot be renamed or deleted. Their names and core identities are fixed for every organization.

The Owner role has exclusive access to organizational settings, role management, and full reporting capabilities. No custom role can grant permissions equivalent to the built-in Owner role.

Role permissions follow a strict hierarchy: Owner permissions encompass all other roles, Manager permissions encompass Employee permissions, and Employee permissions are the most limited. A role cannot grant permissions outside its designated hierarchy level.

If a role assignment attempts to grant Owner-level permissions via a custom role, the system rejects the assignment.

### Custom Role Management

Only users with organizational management permission can create new custom roles. Custom roles must have a unique name within the organization and cannot duplicate an existing role name.

When creating a custom role, the user must assign a non-empty set of permissions selected exclusively from the predefined permission list (organizational management, employee management, employee viewing, project management, project viewing, time management, time approval, time viewing all, report viewing). No custom permissions are allowed.

A role must not contain duplicate permission codes. Each permission must appear at most once per role.

A custom role can only be deleted if no employees are currently assigned to it. If any employee holds that role, deletion is blocked.

Custom roles can be edited only by users with organizational management permission. Editing cannot change the role’s existence if it is the only assigned role for any employee.

Role assignment to an employee must result in exactly one role per employee in an organization. If an employee’s role is updated, the previous role is replaced, and no history of prior roles is stored.

## Permission Rules

There is a fixed set of 10 permissions: org:manage, employee:manage, employee:view, project:manage, project:view, time:manage, time:approve, time:view_all, report:view. Each permission is uniquely identified by a code and includes a human-readable description. No custom permission codes can be created outside this set. Permission codes must match exactly in role assignments and policy checks. Permissions are not inherited across roles—each role explicitly defines its set. A role with time:manage can edit any timelog, regardless of ownership or approval status. The report:view permission does not imply access to timelogs or timesheets unless explicitly paired with time:view_all.

### Fixed Set of Permission Types

The system allows only ten specific permission types, and no additional types can be introduced. The permitted types are: org:manage, employee:manage, employee:view, project:manage, project:view, time:manage, time:approve, time:view_all, report:view, and time:view_all. All permission assignments and access decisions rely exclusively on these types.

### Strict Permission Type Identity

Each permission type must be used exactly as defined, without variation. The system treats permission types as immutable and case-sensitive, requiring exact match in all scenarios. Any attempt to use a modified form (e.g., different casing or separators) will not be accepted.

### No Custom Permission Types Allowed

Only the ten specified permission types may be used. The system does not support creation of additional types, and no custom permissions can be defined. Any assignment attempting to use a permission type beyond the defined set will be ignored.

### Exact Matching Requirement

Permission type matching requires exact spelling and casing. For example, 'org:manage' is valid, while 'Org:Manage', 'org_manage', or 'org:Manage' do not match the defined type and are not accepted.

### No Cross-Role Permission Assumption

Permission types assigned to one role do not transfer or imply permissions in other roles. Each role must explicitly include the permission types it requires. Access decisions are made solely based on the permission types assigned to the current role.

### time:manage Scope

The time:manage permission type provides full authority over any timelog, regardless of ownership or timesheet status. Users with this type can edit or delete any timelog entry, including those within approved timesheets.

### report:view Scope

The report:view permission type permits access to reports only, without automatically granting access to underlying data. To view raw timelog or timesheet records, additional permission types such as time:view_all or employee:view must be assigned.

### Unique Permission Type Assignment

When assigning permissions to a role, each permission type may appear only once. Duplicate entries of the same permission type in a role's assignment are not allowed and will be rejected by the system.

### Permission Assignment for Role Creation

Only organization owners may assign or modify permission types for roles. A newly created role must include at least one permission type from the defined set, and all assigned types must be from this set.

### time:view_all Scope

The time:view_all permission type enables viewing of timelogs and timesheets across all employees in the organization, including historical records and those within approved timesheets.

### project:manage Scope

The project:manage permission type includes full editing rights for any task in any project. This covers title, description, status, priority, hours, due date, assigned employee, and parent task relationships, regardless of project membership.

### employee:manage Scope

The employee:manage permission type includes authority to reactivate previously deactivated employees. Reactivation restores the employee's active status and access to organization functions.

### org:manage Scope

The org:manage permission type includes full authority over departments. This includes creating, editing (including name, description, and parent-child relationships), and deleting departments.

### time:approve Scope

The time:approve permission type allows approval or rejection of timesheets only when they are in the submitted status. Draft or already approved/rejected timesheets cannot be processed.

## Department Rules

Each department must have a unique name within its organization and a description. Department nesting is limited to one level—departments can have only one parent and no grandchildren. Deleting a department detaches employees from it but preserves department history and employee records. Department name and description cannot be blank, but description supports empty or null values. Only users with org:manage permission can create, edit, or delete departments. Department hierarchy must remain acyclic at all times. Department assignment to employees is optional, and null department does not affect role or contract validity.

### Unique Department Name Within Each Organization

Each organization enforces a unique name for its departments. Two departments within the same organization cannot share the same name. The uniqueness constraint applies only within one organization — departments in different organizations may bear identical names.

### One-Level Department Nesting

Department nesting is limited to one level. A department may belong to a single parent department, but deeper hierarchies (such as parent–grandparent relationships) are not allowed. Departments without a parent are considered root-level.

### Department Removal Does Not Delete Employees

When a department is removed, all employees previously assigned to it remain active. Their assignment to that department ends, but their employment records and related information persist unchanged.

### Department Name Must Have Content

The department name is mandatory and must contain at least one visible character. Names consisting solely of spaces or left empty are not acceptable.

### Department Description Is Optional

A description for a department is optional. It may be left blank or omitted entirely without affecting department validity or functionality.

### Department Management Restricted to Organization Owners

Creating, modifying, or removing a department requires ownership-level authority. Only individuals with full organizational management rights may perform department changes.

### Department Hierarchy Must Remain Acyclic

The department hierarchy must not form loops. An attempt to establish a circular parent–child relationship — for example, making a department a child of its own ancestor — is not permitted.

### Department Assignment Is Optional for Employees

Assigning a department to an employee is optional. Employees may operate without department assignment without restriction.

### Employee Records Survive Department Removal

When a department is removed, no employee record is deleted. Employees previously assigned to that department simply cease to be associated with it.

### Parent Department Must Be Valid and Active

A parent department must exist and be active within the same organization. Non-existent, deleted, or otherwise invalid departments cannot be assigned as parents.

### Department Name Changes Require Owner Authority

Changing a department’s name is limited to individuals with full organizational management rights. The new name must still conform to the uniqueness rule for that organization.

### No Cyclic Dependencies in Department Structure

All department updates must preserve an acyclic structure. Any operation that would create a circular dependency is blocked by policy.

### Departments Can Be Created Without a Parent

Departments may be created without a parent, placing them at the top level of the organizational hierarchy.

### Department Name Uniqueness Scope

Department names must be unique within each organization, but may be reused across different organizations.

## Contract Rules

Each employee can have only one active contract at a time; new contracts automatically end the previous active contract by setting its end date to the day before the new one begins. Contracts require start date, pay rate, and pay period; end date and notes are optional. Pay period must be one of: hourly, daily, weekly, monthly. Working hours per week must be a positive number. Past contracts are immutable—only the current active contract can be edited. An employee’s contract must align with their current employment type. A contract cannot start before the employee’s onboarding date. Contract history is preserved after employee deactivation or removal.

### Single Active Contract Per Employee

Each employee can have only one active contract at any time. An active contract is one where the start date is on or before the current date, and the end date is either null or in the future. An employee cannot have multiple overlapping active contracts. If a new contract is created with a start date that overlaps with an existing active contract, the system enforces the overlap prevention rule (see Contract Override Rule).

### Automatic Prior Contract End On New Contract Creation

When a new active contract is created for an employee, the system automatically ends the previous active contract by setting its end date to the day before the new contract's start date. This ensures temporal continuity and prevents gaps or overlaps in active contracts. The prior contract becomes a historical (non-editable) record. This rule applies only to contracts with overlapping time spans; non-overlapping contracts are unaffected.

### Contract Immutability For Past Contracts

Past contracts (where the end date is before the current date) are immutable historical records and cannot be edited. Only the current active contract can be modified. Employees and users with appropriate permissions must not be able to change the start date, end date, pay rate, pay period, working hours per week, or notes of past contracts.

### Required Fields: Start Date, Pay Rate, Pay Period

Every contract requires three fields: start date (must be a valid calendar date), pay rate (must be a non-negative numeric value), and pay period (must be one of the valid enumeration values). If any of these required fields is missing or invalid, the contract creation or update is rejected. The pay rate may be zero only for unpaid roles such as certain internships, but it must still be explicitly provided.

### Valid Pay Period Enumeration

The pay period must be one of the following enumeration values: hourly, daily, weekly, or monthly. Any other value is invalid and causes contract creation or update to be rejected. This constraint is enforced at the domain level, and no custom pay periods are allowed.

### Working Hours Per Week Must Be Positive

The working hours per week field must be a positive number (greater than zero). A value of zero or negative is invalid and causes contract creation or update to be rejected. This ensures every active contract reflects a valid working schedule.

### Notes Field Optional But Nullable Safe

The notes field is optional and may be left empty or set to null. However, when notes are provided, they must not cause data truncation or parsing errors. The system must safely store and retrieve notes up to a reasonable length without data loss. Null or empty notes must not affect contract processing or reporting.

### Employment Type Alignment Rule

The contract’s pay period must be compatible with the employee’s employment type. For example, hourly and daily pay periods are typically used for contractors and interns, while weekly and monthly are used for full-time and part-time employees. The system enforces alignment: if the employee’s employment type is contractor, the pay period must be hourly or daily; if full-time or part-time, the pay period must be weekly or monthly. Mismatches cause contract creation or update to be rejected.

### Contract Start Date After Onboarding

The contract’s start date must not precede the employee’s onboarding date (the date their employee record was created). If the provided start date is earlier than the onboarding date, the contract creation or update is rejected. This ensures historical accuracy and prevents logically inconsistent contracts.

### Contract History Preserved Post Deactivation

When an employee is deactivated, all their past and active contracts are preserved as historical records. Deactivated employees can still view their own contracts. No contract data is deleted or altered during employee deactivation or reactivation.

### No Retroactive Editing Of Past Contracts

Retroactive changes to past contracts (e.g., backdating pay rate adjustments) are strictly prohibited. If a user attempts to edit a past contract, the system rejects the request. Only current active contracts can be edited, and edits affect only future pay terms—not past compensation.

### Contract Override Rule During Overlap Prevention

When creating a new contract that would overlap with an existing active contract, the system applies an override rule: the new contract takes precedence, and the previous active contract is automatically ended as of the day before the new start date. This override applies only if the new contract is created by a user with employee:manage permission and is otherwise valid. Users cannot bypass this behavior via manual intervention.

### Employee Owned Contract View Access

Employees can view their own contracts, including both active and historical contracts. They can see start date, end date, pay rate, pay period, working hours per week, and notes. Employees cannot view other employees' contracts. This access is granted regardless of their own role or permissions.

## Project Rules

Projects require a unique name within the organization, a color code for UI display, and cannot be archived or completed if they have pending timelogs awaiting submission or approval. Budget hours, start date, and end date are optional but must not conflict with project status. A project can only be deleted if it has no timelogs; otherwise, deletion is blocked even for managers. Projects in archived or completed status cannot accept new timelogs, but existing timelogs remain accessible. Project color code must be a valid hex or named color. Each project must be assigned to one organization only. Project name must not exceed display limits and must not be blank.

### Project Identity Uniqueness per Organization

Each project must carry a name that distinguishes it uniquely within its assigned organization. duplicate names for different projects are not permitted. A project cannot be reassigned to another organization once created. This rule ensures that project identification remains unambiguous across reporting and access control.

### Project Visual Identity Requirement

Projects require a visual identity marker that renders consistently across all user interfaces. This marker must conform to standard web color representations, such as widely recognized color names or standard hex formats. Non-conforming markers prevent the project from being saved.

### Time Recording Limitation for Inactive Projects

When a project reaches the end of its active lifecycle—either archived or completed—no further time recordings may be associated with it. Existing time records remain available and may be adjusted only if they are not yet locked by a finalized timesheet. This preserves the integrity of closed periods while allowing administrative correction where appropriate.

### Project Preservation safeguard

A project cannot be permanently removed if it has accumulated any time recordings—even during testing or by accident. Before deletion, all associated time records must be cleared using authorized system procedures. This protects historical time tracking data from unintentional loss.

### Essential Project Label Requirement

Every project must carry a meaningful label to support clear identification and communication across teams. Blank or whitespace-only labels are not permitted and will prevent the project from being finalized.

### Planned Effort TargetGuideline

Projects may optionally specify a planned effort target, expressed as hours. If included, this target must be a positive value. Projects without a positive target remain valid, but are excluded from certain financial and planning reports. Any adjustment to the target must preserve a positive value.

### Project Lifecycle Progression Rules

Projects transition through defined stages—active, wind-down, and concluded. Only projects in the active stage may move to either wind-down or concluded. Once wind-down or concluded, further progression forward is allowed, but reversal to an earlier stage is not. Direct jumps between wind-down and concluded without intermediate steps are also disallowed.

### Organizational Boundaries for Projects

Each project is permanently associated with a single organization. It cannot be shared, reassigned, or transferred to another organization. Access to view, modify, or manage the project is automatically scoped to members of that organization.

### Temporal Sequence Rule for Project Timelines

When both a planned start and end date are defined, the start must precede the end. Equality or inversion of these dates results in an error, ensuring realistic project scheduling and avoiding scheduling conflicts.

### Project Label Conciseness Guideline

A project label must remain within a length that supports reliable display and indexing across systems. Labels exceeding the maximum permitted length will not be accepted, though this length allows ample space for descriptive naming.

### Data Integrity Protection for Time Records

The existence of any time record tied to a project—even those created during testing or by accident—is sufficient to prevent project removal. Deletion is only possible after all time records have been removed via authorized system routines, not through direct deletion by users. This safeguards auditability and reporting accuracy.

### Exclusion Rule for Planning Reports

Projects without a specified planned effort target do not appear in planning reports. Only those with an explicitly set, positive effort target are included, ensuring that reported figures remain comparable and actionable.

### Project Access Eligibility Requirement

Only individuals with active membership in the host organization may be assigned to a project. Those whose membership is no longer active are not eligible for project assignment. Removing someone from a project does not affect their core membership standing or history.

## Task Rules

Tasks must belong to a project the user is assigned to, and each task has a title (required) and description (optional). Status must be one of: open, in-progress, completed, closed; priority is low, medium, high, or urgent. Estimated hours and due date are optional but must be consistent with current project status. Tasks can have one parent task (subtasks allowed, one nesting level only). Assigning an employee to a task requires that person to be a project member. Status changes trigger task history entries with old and new status and timestamps. Editing a task’s project or parent task is not allowed once created. Task budgeting rules do not apply—budget is tracked at project level.

### Task Title Requirements

Each task must have a clear and meaningful title. The title must not be empty or consist only of whitespace. A task cannot be created or updated with a missing or blank title. If the title is missing or empty, the operation is rejected.

### Task Status and Priority Validations

A task’s status must be one of the following values: open, in-progress, completed, or closed. A task’s priority must be one of: low, medium, high, or urgent. Any attempt to assign a status or priority outside these predefined values is rejected. These values are enforced exactly as defined and used consistently across the system.

### Project Assignment Requirements

Every task must be associated with a valid project. The project must exist within the same organization context. A task cannot be created if the associated project is archived or completed. Project membership or visibility rights determine access but do not override this core assignment rule.

### Task Nesting Limitations

A task may include a parent task to support one-level subtask nesting only. A task cannot be assigned as a subtask of another subtask (i.e., multi-level nesting is not permitted). If a parent task is specified, it must belong to the same project and be valid.

### Task Assignment Restrictions

A task can only be assigned to an employee who is part of

## Timelog Rules

Each timelog must have a date, duration in minutes (positive integer), and project assigned to the employee. The task, if present, must belong to the selected project. Timelogs can only be created by employees for themselves. Edit or delete permission requires timelog not to be part of a submitted or approved timesheet. Billable flag defaults to true and is optional. Duration must be rounded to nearest minute upon saving. Timelogs cannot span multiple days—each entry is tied to a single calendar day. A timelog’s project must be active and assigned to the employee. Editing a timelog does not affect already approved timesheets.

### Timelog Project and Employee Linkage

Each timelog must be associated with exactly one employee and exactly one project. The project must be assigned to the employee in the project membership records. A timelog cannot exist without a valid project-employee assignment linkage. If the employee is not assigned to the selected project, the system blocks the timelog entry.

### Project Assignment Validation

The project referenced in a timelog must be assigned to the employee in the project membership records for that organization. A timelog cannot be created for a project that the employee is not assigned to, even if the project exists in the organization. The system enforces this constraint at creation time.

### Task and Project Consistency

If a task is included in a timelog, the task must belong to the project specified in the same timelog. The system ensures that the selected task is associated with the selected project before saving the timelog. If a task from a different project is selected, the system blocks the entry.

### Duration Must Be Positive

The duration in minutes for a timelog must be a positive integer. Zero duration and negative durations are not allowed. If a non-positive duration is provided, the system blocks the entry.

### Valid Calendar Date

The date of a timelog must be a valid calendar date. Future dates are not permitted. Invalid dates or dates later than the current date cause the entry to be blocked by the system.

### Self-Creation by Employee Only

Employees can create timelogs only for themselves. Timelogs cannot be created on behalf of another employee. The system identifies the employee from the active session context and associates the timelog with that employee.

### Timesheet-Based Edit and Delete Controls

Employees can edit or delete their own timelogs only if the timelog is not part of a submitted or approved timesheet. If a timelog belongs to a timesheet with status submitted or approved, the request to edit or delete is blocked. Users with time management authority may override this restriction.

### Billable Flag Default Behavior

The billable flag defaults to true if not explicitly specified during timelog creation. Employees may mark timelogs as non-billable when appropriate. If omitted, the system records the flag as true. A null value is not stored—omission results in a true value.

### Duration Rounding Policy

When a timer is stopped, the calculated duration in minutes is rounded to the nearest whole minute before saving as a timelog. Rounding follows standard rules (0.5 and above rounds up). Manual duration entries must already be specified as whole minutes.

### Single-Day Entry Requirement

Each timelog must be tied to exactly one calendar day. The date field determines the day exclusively. Timelogs cannot span across multiple days. The duration represents time spent within that single calendar day only.

### Active Project Enforcement

The project referenced in a timelog must not be archived or completed. New timelogs cannot be created for projects with status archived or completed. Existing timelogs on such projects remain valid, but new entries are blocked.

### Locked Timesheet Protection

Once a timesheet is approved, all timelogs included in that timesheet become locked and cannot be edited or deleted by any employee, including those with time management authority. Editing or deletion requests for locked timelogs are blocked by the system. Only after the timesheet is rejected and returned to draft status can the timelogs be modified.

### Description Field Handling

The description field in a timelog is optional. If omitted during creation, the system stores an empty string. When editing, a blank description is acceptable and results in an empty string being stored. Null values are never stored—the system always uses an empty string for absence of description.

## Timesheet Rules

A timesheet represents one week (Monday–Sunday) per employee and can be in draft, submitted, approved, or rejected status. A timesheet must include at least one timelog and cannot be submitted if another timesheet for the same week is already submitted or approved. Employees can modify draft timesheets by adding or removing timelogs. Submitted timesheets lock included timelogs—editing or deleting them is blocked. Users with time:approve permission can approve or reject timesheets; rejection adds a required reason and returns the timesheet to draft. Timesheet approval or rejection sets reviewed at timestamp and reviewer. A timesheet cannot be rejected if it has no timelogs or is already approved.

### Timesheet Period Definition

A timesheet must cover exactly one calendar week, from Monday to Sunday (inclusive). The week start date (Monday) and week end date (Sunday) are required and automatically determined based on the selected week. Employees cannot manually set arbitrary dates—only valid Monday–Sunday week ranges are accepted.

For example, a week starting on Monday, March 17, 2026 must end on Sunday, March 23, 2026. Any selection outside this constraint is rejected.

### Timesheet Must Include At Least One Timelog

A draft or submitted timesheet must contain at least one timelog. Creating a timesheet with no timelogs is not allowed, and submission is rejected if the total timelog count is zero. If all timelogs are removed from a draft timesheet, the employee must either discard the timesheet or add new timelogs before it can be submitted.

### No Duplicate Submitted Timesheets Per Week

An employee cannot have two submitted or approved timesheets covering the same week (Monday–Sunday). If an employee submits a timesheet for a week where another timesheet is already submitted or approved, the request is rejected. Draft timesheets for overlapping weeks are allowed, but only one draft can exist per week per employee.

A new draft timesheet for a week automatically replaces any existing draft for that week, discarding the prior draft's contents.

### Draft Timesheet Modifiability

Employees can modify a draft timesheet by adding or removing timelogs at any time before submission. Edits include changing the selected timelogs—including date, project, duration, and description—but the timesheet’s week start and end dates cannot be changed after creation.

Employees can only modify their own draft timesheets. Modifications are saved immediately upon change.

### Timelog Locking on Timesheet Approval

When a timesheet is approved, all timelogs included in that timesheet become locked. Locked timelogs cannot be edited or deleted by any user—including the employee who created them, or users with time management privileges.

Locking preserves historical accuracy and prevents tampering after payroll or review closure.

### Rejection Requires Reason

When a timesheet is rejected, the reviewer must provide a text-based rejection reason. The rejection is rejected if no reason is provided.

The rejection reason is stored and displayed to the employee when viewing the rejected timesheet.

### Approved Timesheet Blocks Timelog Edits

An approved timesheet blocks all edit and delete operations on its included timelogs. This applies even to users with time management privileges.

Timelogs remain locked until the timesheet is rejected, at which point the lock is lifted and the employee can modify or resubmit the timesheet.

### Timesheet Reviewer Must Have Approval Authority

Only users with the authority to approve timesheets can approve or reject them. Users without this authority—such as regular employees or project members—cannot interact with the approval workflow, even if they are assigned to the same project or department as the employee.

The system enforces this restriction on all approval and rejection actions.

### Review Timestamp Set Automatically

When a timesheet is approved or rejected, the system automatically records the review timestamp to the exact UTC moment of the action. This timestamp is immutable and cannot be edited by any user.

The review timestamp reflects the precise time of the review action, regardless of whether it results in approval or rejection.

### Timesheet Status Transitions Restricted

Timesheets follow strict state transitions:
- draft → submitted (by employee)
- submitted → approved (by authorized reviewer)
- submitted → rejected (by authorized reviewer, returns to draft)
- rejected → draft → submitted (employee resubmits)
- draft → draft (via employee edits before submission)

All other transitions (e.g., draft → approved, submitted → draft directly) are prohibited and rejected.

Draft timesheets can only be discarded—not approved or rejected directly.

### Employee-Only Timesheet Submission

Only the employee who owns the timesheet can submit it. No other user—including managers or owners—can submit a timesheet on behalf of an employee.

Submission is scoped to the employee’s own timesheet, even if the user has approval or management privileges elsewhere.

### Timesheet Review History Not Editable

Once a timesheet has been reviewed (approved or rejected), the review history—including review timestamp and reviewer—cannot be modified. This applies even to organization owners.

Review history is immutable to preserve audit integrity and prevent retroactive tampering.

### Draft Timesheet Auto-Includes All Timelogs for Week

When an employee creates a draft timesheet for a specific week, the system automatically includes all of that employee’s timelogs for the Monday–Sunday period of that week. Timelogs are included regardless of billable status or project.

Employees can then remove timelogs (if desired) before submitting, but inclusion starts with all qualifying entries.

## ActivityLog Rules

Activity logs record key actions: employee invited/deactivated/reactivated, contract created/edited, project created/archived/completed/deleted, task status changed, timesheet submitted/approved/rejected, and role assigned/changed. Each entry includes timestamp, user who performed the action, action type, target entity, and details. Timestamp must be in UTC. Action types must be from the predefined list—no custom actions allowed. Activity log entries are immutable and cannot be edited or deleted. Users with org:manage permission can view the full log. Log entries do not record user login/logout or profile edits. Each log entry must reference a valid entity ID and action type.

### Predefined Activity Action Types

Only specific activity action types are permitted. No custom action types may be created or recorded.

Permitted action types include:
- Employee invited
- Employee deactivated
- Employee reactivated
- Contract created
- Contract edited
- Project created
- Project archived
- Project completed
- Project deleted
- Task status changed
- Timesheet submitted
- Timesheet approved
- Timesheet rejected
- Role assigned
- Role changed

Each activity record must use one of these exact action type descriptions—no synonyms, abbreviations, or variations are allowed.

### Activity Records Cannot Be Changed

Once created, activity records cannot be altered or removed by anyone—including users with organization management rights.

This ensures a reliable and verifiable history of business events. Any attempt to edit or delete an activity record is not permitted under any circumstances.

### Consistent Time Reference for Actions

Each activity record must capture the time when the action occurred using a consistent global time reference.

This ensures accurate chronological ordering and avoids confusion across different regional settings.

### Traceability to Person Who Took Action

Every activity record must identify the individual or system responsible for the action.

If a system process triggered the action, a distinct system identifier must be used instead of a human user identifier.

### Authorized Viewing Only

Only users with organization management rights may view the complete activity history for their organization.

Users without organization management rights—including employees and project managers—do not have access to activity records, regardless of the nature of the action recorded.

### Employee Lifecycle Events Are Monitored

Employee-related events that affect organizational membership generate activity records:
- When an employee is invited, an "Employee invited" record is created
- When an employee is deactivated, an "Employee deactivated" record is created
- When a deactivated employee is reactivated, an "Employee reactivated" record is created

These records are generated whether the action was taken manually or automatically.

### Contract Changes Are Recorded

Changes to employee contracts generate activity records:
- When a new contract is created, a "Contract created" record is made
- When the active contract is updated, a "Contract edited" record is made

Modifications to past contracts are not permitted, so "Contract edited" only occurs for the current active contract.

The record includes a summary of changes made to the contract.

### Project Lifecycle Changes Are Recorded

Project state changes generate activity records with the following action types:
- Project created → "Project created"
- Project archived → "Project archived"
- Project completed → "Project completed"
- Project deleted → "Project deleted"

These records are generated automatically when a user with project management rights performs the action.

### Task Status Updates Are Recorded

Each time a task’s status changes, an activity record is created with:
- The task being modified
- The previous status
- The new status
- The person who made the change

No activity record is generated for other task changes, such as updating description, priority, or assignment.

### Timesheet Actions Are Recorded

Timesheet workflow actions generate specific activity records:
- Timesheet submitted → "Timesheet submitted"
- Timesheet approved → "Timesheet approved"
- Timesheet rejected → "Timesheet rejected"

For rejected timesheets, the record includes the reason for rejection.

The record references the employee who owns the timesheet and the person who performed the action.

### Role Changes Are Recorded

Employee role assignments and changes generate activity records:
- When a role is first assigned, a "Role assigned" record is created
- When an existing role is changed, a "Role changed" record is created

The record references the employee, the role involved, and the person who performed the action.

### Login and Logout Are Not Monitored

User authentication events—including successful logins, logouts, and failed login attempts—do not generate activity records.

Authentication activity is not considered part of the business action audit trail.

### Profile Updates Are Not Monitored

Changes to personal profile information—such as display name, avatar, or contact details—do not generate activity records.

Only actions that affect organizational business operations trigger activity records.

### Entity References Are Historically Preserved

Each activity record must reference the relevant business object involved in the action.

If that object is later removed, the activity record remains unchanged to preserve the historical context, and the original reference is retained.

### Time Reference Accuracy

Each activity record captures the action time with sufficient accuracy to support chronological ordering.

While exact sub-second precision is not required, the time reference ensures actions are recorded in the correct sequence when analyzed over time.

### Activity History Is Presented in Context

Activity history is presented in paginated views, organized by organization.

Users only see activity records for their currently selected organization. Additional filtering by action type, person, and date range is available to support review.

## ProjectMember Rules

A project membership must tie exactly one employee to exactly one project, with role set to either member or project-lead. An employee can be assigned to multiple projects but only once per project. Only users with project:manage permission can create or remove project memberships. Project-lead members can manage tasks within their project. Removing a project member revokes their task-editing permissions for that project. An employee must be active to be assigned to a project; deactivated employees cannot be added or re-added unless reactivated. Project membership does not affect employee contract validity or department assignment. Project membership is automatically removed when a project is deleted.

### Project Member Assignment Rules

Each project membership ties exactly one employee to exactly one project. An employee cannot be assigned to the same project more than once — duplicate memberships for the same employee-project pair are rejected.

A project membership must have exactly one role: member or project-lead. No other roles are permitted.

Only users with project management rights for projects can create, edit, or remove project memberships. Users without this authority cannot modify any project membership records.

An employee must be in active status to be assigned to a project. If an employee is deactivated, they cannot be assigned to any project, and existing project memberships for deactivated employees remain in place until they are reactivated. If attempting to assign a deactivated employee, the request is rejected.

When a project is deleted, all associated project memberships for that project are automatically removed. No manual cleanup is required.

Project members with the project-lead role can manage tasks within their assigned project, including creating, editing, and assigning tasks. Project members with the member role cannot manage tasks — they can only view tasks in their project.

Removing an employee from a project automatically revokes their ability to manage tasks in that project, regardless of whether they were assigned as project-lead or member. The employee retains access to view tasks per standard project visibility permissions, but cannot make changes.

Project membership does not depend on the employee’s role within the organization. Changing the employee’s organization role (e.g., from Employee to Manager) does not affect their project membership, and vice versa.

Project membership is strictly scoped to the employee’s organization. An employee cannot be assigned to a project in a different organization, even if they belong to multiple organizations. The system enforces organization context on every project membership operation.

When a project is archived or completed, existing project memberships remain valid. Only new project assignments can be created; project-lead members retain task management rights over existing project members.

When a project membership is created or modified, the system records the action in the activity log under the employee’s name and the organization context. No separate audit log entry is needed for project member deletion — it is handled by the project deletion activity log entry.

## TaskHistory Rules

Each task status change creates a TaskHistory entry with timestamp, old status, new status, and the user who made the change. The timestamp is captured at the moment of the status transition and cannot be altered. Task history entries are immutable and are created only during approved status changes (open → in-progress, in-progress → completed, etc.). History does not record description, priority, or assignee changes. Only status transitions are logged. Task history entries cannot be edited or deleted by any user, including org owners. Every task must maintain a complete history chain from creation status to current state.

### Task History Creation Rule

Status changes for tasks automatically generate a single task history record. Only transitions between distinct task statuses — such as from open to in-progress, in-progress to completed, or completed to closed — trigger a history record. Other modifications like description updates, priority adjustments, employee assignments, or time estimates do not result in history records.

### History Timestamp Consistency

Each history record captures the exact moment when the status change is finalized. This moment is fixed and maintained consistently across all system components, using a uniform time standard to preserve accuracy.

### Status Transition Accuracy

A history record preserves the source and destination status values involved in the transition. These values are limited to the allowed statuses in the system: open, in-progress, completed, and closed. Both values are mandatory for every record.

### Change Attribution

Every history record identifies the person responsible for the status change. This association is permanent and cannot be altered by any user, regardless of role or permission level.

### Scope of History Generation

Only explicit status transitions produce history records. All other task modifications — such as altering the description, adjusting priority, updating assignees, or revising time estimates — are not captured in task history, even when executed by authorized users.

### History Record Integrity

Once created, each history record is permanently preserved and may not be modified or removed by anyone, including users with the highest permissions. This ensures the reliability and trustworthiness of the historical record.

### Initial Status Recording

When a task is first created, its initial status is treated as the first transition in its history. The system records this event to establish a complete and traceable history from the moment the task comes into existence.

### Sequential History Continuity

Every task maintains an uninterrupted sequence of status transitions from creation to current state. This continuity is guaranteed by the system to support accurate historical reconstruction and auditing.

### Authorization Requirements

Only users with appropriate permissions — specifically those authorized as project leads or with organization-wide task management rights — may initiate status changes that produce history records.

### Transition Validation Handling

Invalid status transitions — those that violate the system's defined workflow — are rejected outright and do not result in history record creation. Validation occurs before any changes are applied.

### Valid Transition Constraints

Only transitions that conform to the predefined workflow are accepted. For example, a task may move from open to in-progress, or from in-progress to completed, but not back to an earlier state once completed.

### Description Change Handling

Modifications to the task description do not generate history records, regardless of who makes the change or how frequently it occurs. Description updates are managed separately from status history.

### Priority Change Handling

Adjustments to task priority — including changes between low, medium, high, or urgent levels — do not trigger history records. Priority changes are tracked outside of status history.

### Assignee Change Handling

Reassigning a task to another employee does not produce a history record unless accompanied by a status change. Assignee updates are recorded independently of status history.

### Task Reference Integrity

Each history record is permanently tied to the specific task it describes. Task history queries return only entries relevant to that task’s status transitions, ensuring precise and isolated data retrieval.

### Time Precision Standard

History records use a standardized time format with second-level granularity. Sub-second precision is not captured, ensuring consistent interpretation and ordering across all system operations.

## Timer Rules

Each employee can have at most one active timer at a time. Starting a timer requires selecting a project (task is optional). A timer records start timestamp, project, optional task, and description. Employees can stop or discard a timer; stopping creates a timelog with duration rounded to nearest minute. Employees can edit timer description and reassign project or task while running. Timers continue running indefinitely if not stopped—no automatic timeout. Discarding a timer does not create a timelog. An employee cannot start a new timer if one is already active. Timer duration is calculated at stop time, not stored incrementally. Timer must be for a project the employee is assigned to.

### Timer Creation and Assignment Rules

Each employee may have only one active timer at a time. If an employee already has a running timer, they cannot start another one until the current timer is stopped or discarded.

To start a timer, an employee must select a project they are assigned to. The project selection is required. Selecting a specific task within that project is optional.

A timer records the exact start timestamp with millisecond precision. The description field is optional when starting the timer — it may be left blank or added later.

The selected project must be one the employee is explicitly assigned to via a ProjectMember record. If the employee is not a member of the selected project, the timer cannot be started.

If an employee is assigned to multiple projects, they can choose any of their assigned projects to start a timer. Task selection must belong to the selected project; cross-project task assignment is not allowed.

### Timer Lifecycle and Duration Calculation

When an employee stops a timer, the system automatically creates a new timelog. The duration is calculated from the start timestamp to the stop timestamp and rounded to the nearest minute.

If an employee discards a timer instead of stopping it, no timelog is created and no time is recorded.

While a timer is running, the employee may edit the description field. They may also change the assigned project or task (if still assigned to the new project), allowing flexibility during ongoing work.

A timer continues running indefinitely if the employee does not stop or discard it. There is no automatic timeout or forced stop behavior.

The duration of a timer is computed only at the moment the timer is stopped — it is not stored incrementally during the active period. This ensures accuracy regardless of how long the timer remains active.

## PendingInvitation Rules

A pending invitation is created when inviting a user whose email has no existing account. It must include the email address, the organization, and the inviter. Invitations are not sent until the invitee signs up with the exact email. Once signed up, the pending invitation is automatically applied and the employee record is created. Pending invitations can only be created by users with employee:manage permission. Invitations are scoped to a single organization and cannot be reused elsewhere. Pending invitations cannot be edited after creation—only canceled (via employee:manage) if not yet accepted. Expired invitations are not auto-canceled—manual cleanup is required. Invitation email must match the signup email exactly for auto-applying.

### Email Matching Requirement

WHEN a user signs up, THE hrmTracker system SHALL accept a pending invitation only if the email provided during signup exactly matches the email in the pending invitation. THE hrmTracker system SHALL NOT apply an invitation if the signup email differs, regardless of variation in case, formatting, or spelling.

### Creation for Non-Account Holders

THE hrmTracker system SHALL create a pending invitation only when the target email has no existing account. WHEN the target email already has an account, THE hrmTracker system SHALL NOT create a pending invitation and SHALL instead add the existing user to the organization directly.

### Invitation Authorization

THE hrmTracker system SHALL allow pending invitations to be created only by users who possess the employee management permission within the organization. WHEN a user without this permission attempts to create an invitation, THE hrmTracker system SHALL reject the request.

### Inviter Accountability

WHEN a pending invitation is created, THE hrmTracker system SHALL record which user initiated the invitation. THIS inviter information SHALL be preserved and used for auditing purposes.

### Automatic Acceptance on Signup

WHEN a user signs up with an email matching a pending invitation, THE hrmTracker system SHALL automatically enroll the user in the organization with the role and department specified in the invitation and remove the pending invitation from active records.

### No Modification Allowed

A pending invitation, once created, SHALL NOT be modified by any user or process. IF corrections are needed, THE hrmTracker system SHALL require canceling the existing invitation and creating a new one.

### Organization-Specific Scope

A pending invitation SHALL apply only to the organization for which it was created. THE hrmTracker system SHALL NOT allow an invitation created for one organization to be applied during signup for a different organization.

### Manual Cancellation Only

Pending invitations SHALL remain active until manually canceled by an authorized user or accepted through signup. THE hrmTracker system SHALL NOT automatically cancel or expire any pending invitation.

### No Time-Based Expiration

THE hrmTracker system SHALL NOT expire pending invitations based on age, duration, or time elapsed. A pending invitation SHALL remain valid and visible indefinitely until manually canceled or accepted.

### Persistent Pending Status

WHEN created, a pending invitation SHALL remain in pending status until manually canceled or accepted. THE hrmTracker system SHALL NOT change the status of a pending invitation without explicit user action.

### Employee Enrollment on Acceptance

WHEN a pending invitation is accepted via signup, THE hrmTracker system SHALL create a new employee record for the user in the organization, assigning the role and department specified in the invitation.

### Organization Reference Requirement

A pending invitation SHALL always reference the organization it belongs to. THE hrmTracker system SHALL not accept or process any pending invitation without a valid organization association.

### No System Retries on Failure

IF a signup attempt fails for any reason, THE hrmTracker system SHALL not retry the invitation application. THE pending invitation SHALL remain unchanged, and manual intervention SHALL be required to attempt resubmission.

# Data Browsing Expectations

Business expectations for how users browse, find, and navigate through lists of data.

## List Browsing Expectations

Define business expectations for how users find, filter, and browse lists.

### Filtering

Employees can filter the employee list by department, employment type, and status.

Employees can filter project lists by status (active, archived, completed).

Employees can filter task lists by status, priority, and assigned employee.

Employees can filter timelogs by date range, project, task, and billable status.

Employees can filter timesheets by status and date range.

Users with report:view permission can filter time reports by date range, employee, project, and billable status.

Users with report:view permission can filter weekly summary reports by project.

Users with org:manage permission can filter the activity log by action type, user, and date range.

All filters are applied client-side or server-side based on the current organization context.

Filters must preserve data isolation: users cannot see data from other organizations, even when filtering.

### Sorting

The employee list is sortable by name.

The task list is sortable by due date, priority, and creation date.

Timelogs are sortable by date and duration.

Timesheets are sortable by week start date and status.

Project lists are sortable by name, status, and creation date.

Activity logs are sortable by timestamp.

Report tables are sortable by relevant numeric fields (e.g., total hours, budget percentage).

All sorting respects organization context: results only include data from the current organization.

### Pagination

Employee lists are paginated.

Project lists are paginated.

Timelog lists are paginated.

Timesheet lists are paginated.

Activity log lists are paginated.

Task lists are paginated.

Each pagination page includes a fixed number of items, determined by the system.

Pagination metadata includes total count, current page, and number of items per page.

Pagination is consistent across all browsable lists within the application.

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### Timesheet Submission Failures

If a timesheet has no timelogs, the submission request is rejected.
If an employee submits a timesheet for a week where another timesheet is already submitted or approved, the request is rejected.
If an employee attempts to submit a timesheet while having an active timer, the request is rejected.
If the week start date is not a Monday or week end date is not a Sunday, the submission request is rejected.
If the week start date is after the week end date, the submission request is rejected.

### Timelog Deletion and Editing Restrictions

If an employee attempts to edit a timelog that is part of an approved timesheet, the request is rejected.
If an employee attempts to delete a timelog that is part of any submitted or approved timesheet, the request is rejected.
If a timelog’s project is not assigned to the employee, the timelog creation is rejected.
If a timelog’s task does not belong to the selected project, the timelog creation is rejected.
If a timelog’s duration is zero or negative, the timelog creation is rejected.
If a timelog’s date is in the future, the timelog creation is rejected.

### Project Deletion Constraints

If a project has any timelogs associated with it, the deletion request is rejected.
If a project has tasks assigned to employees, the archive or completion request is allowed, but deletion remains blocked.
If a project is archived or completed and an employee attempts to log time to it, the timelog creation is rejected.

### Contract Creation and Management

If an employee already has an active contract and a new contract is created with a start date before the current active contract’s end date, the request is rejected.
If an employee attempts to create a contract with an end date that precedes the start date, the request is rejected.
If an employee attempts to edit a past (non-active) contract, the request is rejected.
If an employee attempts to create a contract with a pay period value outside the allowed enumeration (hourly/daily/weekly/monthly), the request is rejected.
If an employee attempts to create a contract without a start date, pay rate, or working hours per week, the request is rejected.

### Organization Deletion Prerequisites

If an organization has pending timesheets (neither approved nor rejected), the deletion request is rejected.
If an organization has active employee contracts, the deletion request is rejected.
If the owner attempts to delete the organization without resolving these prerequisites, the system provides a detailed error listing remaining issues.

### Timesheet Approval and Rejection

If a user without the time:approve permission attempts to approve a timesheet, the request is rejected.
If a user without the time:approve permission attempts to reject a timesheet, the request is rejected.
If a user attempts to approve a timesheet that is not in submitted status, the request is rejected.
If a user attempts to reject a timesheet without providing a rejection reason, the request is rejected.
If a user attempts to approve or reject a timesheet that belongs to a different organization, the request is rejected.

### Employee Deactivation and Reactivation

If an attempt is made to deactivate an employee who is the sole owner of their organization, the request is rejected unless ownership is transferred or the organization is deleted first.
If an attempt is made to deactivate an employee who has an active timer, the timer is discarded and the deactivation proceeds.
If an attempt is made to reactivate an employee whose user account has been deleted, the request is rejected.
If an attempt is made to assign a role to a deactivated employee, the request is rejected.

### Project Member Assignment

If an attempt is made to assign a deactivated employee to a project, the assignment request is rejected.
If an attempt is made to assign an employee to a project where they are already a member, the request is rejected unless updating their role.
If an attempt is made to assign an employee as a project member but not as a member of the organization, the request is rejected.
If an attempt is made to assign a project-lead role to an employee not assigned to the project, the request is rejected.

### Task Assignment Validation

If an attempt is made to assign a task to an employee who is not a project member, the request is rejected.
If an attempt is made to create a subtask where the parent task belongs to a different project, the request is rejected.
If an attempt is made to assign a task to an employee while deactivating their membership in the project, the request is rejected.
If an attempt is made to set a task’s due date before its creation date, the request is rejected.

### Pending Invitation Handling

If an attempt is made to invite an email address that is already associated with an existing employee in the same organization, the invitation is rejected.
If an attempt is made to invite an email that does not match the user’s signup email during onboarding, the user is not added to the organization.
If an attempt is made to create a pending invitation without specifying a valid organization, the request is rejected.
If an attempt is made to invite an employee without the employee:manage permission, the request is rejected.