**hrmPlatform — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their identity, permissions, and access boundaries.

## guest Actor

Guest users are unauthenticated visitors who have not yet logged into the system. They have no access to any organization data, employee records, or time tracking features. Guests can only access public-facing pages such as the initial sign-up flow and login screens. They cannot view or interact with any organization-specific content. Guest status is temporary and ends once the user authenticates. No organization context is established for guests. They cannot see any employee information, projects, timesheets, or reports. Guests cannot create, read, update, or delete any organizational data. Their session is not persisted across page reloads. Guests must complete authentication to access any platform features. They cannot initiate any business-critical actions. Guest access is intentionally minimal to protect organizational data. The system treats all unauthenticated traffic as guest traffic. No personalization is available to guests. Guest users cannot trigger any workflow or approval process. They are restricted from viewing sensitive information like contracts or timesheets. The system logs guest access attempts for security monitoring. Organization data remains completely isolated from guest visibility.

### Guest Actor Definition and Identity

**Definition**: A guest is an unauthenticated visitor to the platform who has not yet logged in. Guests are anonymous users who have not established any identity with the system.

**Identity**: Guests have no persistent identity in the system. They are not associated with any user account, organization, or employee record.

**Access Level**: Guests have the most restricted access level in the system. They cannot authenticate, cannot establish an organization context, and cannot perform any business operations.

**Session Behavior**: Guest status is stateless. There is no session persistence for guests. When a guest navigates away from the page, all state is lost. Each page load starts fresh with no memory of previous interactions.

**Data Visibility**: Guests cannot view any organizational data including employees, projects, tasks, timelogs, timesheets, reports, or activity logs. All sensitive business data is completely hidden from guest access.

**System Behavior**: The system treats all unauthenticated requests as guest traffic. Any attempt by a guest to access protected resources is blocked at the application level before reaching business logic.

**Security**: The system monitors and logs guest access attempts for security purposes. This helps identify potential security threats or misuse patterns without exposing any actual data to the guest.

**Transition**: Guest status is temporary and ends as soon as the user completes authentication. Once logged in, the user is no longer a guest and assumes an authenticated role within an organization context.

**Limitations**:
- Guests cannot create, read, update, or delete any organizational data
- Guests cannot trigger any workflow or approval process
- Guests cannot access any personalization features
- Guests cannot see employee information, contracts, timesheets, or reports
- Guests cannot establish an organization context

**Allowed Access**: Guests can only access public-facing pages such as:
- Initial sign-up flow
- Login screens
- Public information pages

**Restrictions**:
- No organization context is established for guests
- No personalization is available to guests
- No business-critical actions can be performed
- All data isolation boundaries remain fully enforced
- No access to sensitive data including contracts, timesheets, or employee details

### Guest Access Restrictions and Security

**Access Level**: Guests have zero permissions by default. No operations, views, or modifications are permitted.

**Blocked Operations**:
- Cannot view employee list or details
- Cannot view projects, tasks, or timelogs
- Cannot view timesheets (draft, submitted, approved, or rejected)
- Cannot view reports (time reports, project budget reports, weekly summaries)
- Cannot view activity logs
- Cannot view department structures
- Cannot view contract information
- Cannot view role assignments or permissions

**Authentication Requirement**: All data access requires successful authentication and organization context selection. Without valid credentials and organization selection, no business data is retrievable.

**Error Handling**: When guests attempt to access protected resources, the system returns an appropriate access denied response without leaking any information about what data exists or what resources are protected.

**Security Monitoring**: The system logs all guest access attempts to monitor for suspicious activity, potential security threats, or abuse patterns. These logs are internal audit records and are not visible to guests.

**No Caching**: The system must not cache any personalized or organization-specific content for guests. Each request is evaluated independently without relying on previously cached sensitive data.

**No Personalization**: Guests cannot see any personalized content, recommendations, or tailored views. All content is generic and non-personalized.

**No Workflow Initiation**: Guests cannot start any business process including:
- Employee onboarding
- Timesheet submission
- Project creation
- Task assignment
- Approval workflows
- Status changes

**Organization Isolation**: Guests cannot access data from any organization. The multi-tenancy model ensures complete data isolation, and guests exist outside this model until they authenticate.

**Session Statelessness**: Guest interactions do not persist across requests. Each page load begins with a clean state. No cookies, local storage, or server-side sessions are maintained for guest users.

**Rejection Conditions**:
- If a guest attempts to access any protected endpoint, access is denied
- If a guest attempts to submit any form data, the request is rejected
- If a guest attempts to trigger any business logic, the action is blocked
- If a guest attempts to view another organization's data (after partial authentication), isolation is enforced

**Recovery**: If a guest account is created and the user fails to log in within a specified retention period, the temporary account is purged after the retention window expires.

## member Actor

Members are authenticated employees with basic access to their own work data within an organization. They can view their own timelogs, timesheets, and assigned tasks. Members can create and edit their own timelogs subject to timesheet submission status. They can submit timesheets for manager approval. Members can view their own employment contracts and work history. They can track time against projects they are assigned to. Members can view their own profile and update non-sensitive information. They can see which projects they belong to and their assigned tasks. Members cannot view other employees' data without explicit permission grants. They cannot approve or reject any submissions. Members cannot manage other employees or modify organizational settings. Their access is scoped strictly to their own work products. They cannot create or delete projects. Members cannot change their own role assignments. They can view their own activity within the system. Members can see their own timesheet submission history. They can view reports only if they have the report:view permission. Their data access respects organization boundaries strictly.

### Member Identity and Organization Scope

Members are authenticated employees who have been assigned to an organization with a specific role.

A member's access is strictly scoped to the organization they are currently working in. When a user belongs to multiple organizations, they must select which organization to work in, and all subsequent actions apply only to that organization.

Members can switch between organizations they belong to without logging out, but their data visibility changes to match the selected organization.

Members cannot access data from organizations they are not assigned to, even if they have accounts in those organizations.

All member actions are recorded with their user identity for activity logging purposes.

Members authenticate using their email and password credentials.

### Personal Data Access

Members have access to view their own profile information, including display name, avatar image, and phone number.

Members can update their own profile information, including display name, avatar image, and phone number.

Members can view their own employment records within the organization, including their role, department, position, and employment type.

Members cannot view other employees' profile information or employment records unless they have been granted explicit viewing permissions.

Members cannot modify their own role assignments within the organization.

Members cannot change their own department, position, or employment type — these can only be modified by users with employee management permissions.

### Time Tracking Access

Members can create timelogs for themselves, recording date, duration, project, task, description, and billable status.

Members can view their own timelogs, filtered by date range, project, task, or billable status.

Members can edit their own timelogs only if the timelog is not part of a submitted or approved timesheet.

Members can delete their own timelogs only if the timelog is not part of any submitted or approved timesheet.

Members cannot view other employees' timelogs unless they have been granted the time:view_all permission.

Members cannot edit or delete other employees' timelogs under any circumstances.

### Timesheet Management

Members can create draft timesheets for specific weeks, which automatically include all their timelogs for that week.

Members can add or remove timelogs from their own draft timesheets before submission.

Members can submit their draft timesheets for manager approval.

Members cannot submit a timesheet that contains no timelogs.

Members cannot submit a timesheet for a week if another timesheet for the same week is already submitted or approved.

Members can view their own timesheets, including draft, submitted, approved, and rejected statuses.

Members can view the rejection reason when their timesheet is rejected.

Members can modify and resubmit rejected timesheets after addressing the rejection reason.

Members cannot approve or reject any timesheets, including their own — approval authority belongs to users with time:approve permission.

Members cannot view other employees' timesheets unless they have been granted the time:view_all permission.

### Task and Project Access

Members can view tasks in projects they are assigned to, including task title, description, status, priority, estimated hours, and due date.

Members can view tasks filtered by status, priority, or assigned employee within their assigned projects.

Members cannot create tasks — this capability is reserved for project leads or users with project:manage permission.

Members cannot edit tasks unless they are assigned as project lead for that project.

Members can view which projects they are assigned to and their role in each project (member or project-lead).

Members cannot create new projects — this capability is reserved for users with project:manage permission.

Members cannot edit project details such as name, description, color code, status, budget hours, or dates.

Members cannot archive, complete, or delete projects under any circumstances.

Members cannot assign or remove employees from projects unless they are project leads with appropriate permissions.

### Employment Information Access

Members can view their own employment contracts, including start date, end date, pay rate, pay period, working hours per week, and notes.

Members can view their complete contract history, including past and current contracts.

Members cannot create or edit their own contracts — this capability is reserved for users with employee:manage permission.

Members can view their own work history, including all timelogs, timesheets, and task assignments.

Members cannot view other employees' contracts unless they have been granted the employee:view permission.

Members cannot view other employees' work history or employment records unless they have been granted explicit viewing permissions.

### Access Restrictions

Members cannot view other employees' data, including timelogs, timesheets, tasks, contracts, or profile information, unless they have been granted explicit viewing permissions.

Members cannot approve or reject any submissions from other employees or themselves.

Members cannot access organization settings, including name, description, logo, currency, timezone, or fiscal start month.

Members cannot manage roles, including creating, editing, or deleting custom roles.

Members cannot assign or change role assignments for any employees, including themselves.

Members cannot invite new employees to the organization.

Members cannot deactivate or reactivate employees.

Members cannot create, edit, or delete departments.

Members cannot manage project members unless they are assigned as project lead for that project.

### Activity and Reports Visibility

Members can view their own activity within the system, including actions they have performed on their own data.

Members cannot view the full organization activity log unless they have been granted the org:manage permission.

Members can view organization reports only if they have been granted the report:view permission.

Members without report:view permission cannot access any organization reports, including time reports, project budget reports, or weekly summary reports.

Members with report:view permission can access reports but are still subject to organization scoping rules.

Members can view their personal dashboard showing hours logged today, hours logged this week, active timer status, recent timelogs, pending timesheet status, and assigned tasks.

## admin Actor

Admin actors include organization owners and managers with elevated system privileges. They can manage employees, projects, and timesheets across the organization. Admins can view and edit any employee's timelogs and timesheets. They can approve or reject timesheet submissions. Admins can create, edit, and delete projects and tasks. They can assign employees to projects and manage team compositions. Admins have access to organization-wide reports and dashboards. They can view the full activity log for audit purposes. Admins can create and manage custom roles and permissions. They can invite new employees to the organization. Admins can view all departments and reassign employees between them. They can manage contract details for all employees. Admins can archive or complete projects based on business needs. They can filter and search across all organizational data. Admins can generate comprehensive reports on time and budget utilization. Their access spans the entire organization scope. They cannot override organization isolation boundaries. Admin actions are fully auditable through the activity log.

### Organization Owner Role

**Organization Owner** is the highest privilege actor within an organization with full administrative authority.

- THE system SHALL allow organization owners to access all features and data within their organization
- Organization owners SHALL have the ability to manage all organization settings including name, description, logo, currency, timezone, and fiscal start month
- Organization owners SHALL be able to create, edit, and delete custom roles
- Organization owners SHALL be able to manage all employees including inviting, deactivating, and reactivating
- Organization owners SHALL have full access to all projects, tasks, timelogs, and timesheets
- Organization owners SHALL be able to approve or reject any timesheet submission
- Organization owners SHALL have access to all organization reports and dashboards
- Organization owners SHALL be able to view the complete activity log for the organization
- Organization owners SHALL be able to delete their organization only when all pending timesheets are resolved and no active employee contracts exist
- When an organization owner deletes their organization, THE system SHALL permanently delete all associated employees, projects, tasks, timelogs, and timesheets
- Organization owners SHALL retain their user account after organization deletion but SHALL no longer be associated with any organization
- Organization owners SHALL be able to transfer ownership of their organization to another employee before deleting their account
- Organization owners SHALL have the ability to manage departments including creating, editing, and deleting
- Organization owners SHALL have full visibility into all employee contracts and can create or edit contracts for any employee
- Organization owners SHALL be able to assign and change roles for any employee in the organization

### Manager Role

**Manager** is a built-in role with elevated privileges for operational oversight within an organization.

- THE system SHALL grant managers the ability to manage employees including adding, editing, and deactivating employee records
- Managers SHALL be able to view all employee information including department, position, and employment type
- Managers SHALL have the authority to approve or reject timesheet submissions from any employee
- Managers SHALL be able to view all timelogs and timesheets across the organization
- Managers SHALL have the ability to edit or delete any employee's timelogs
- Managers SHALL be able to create, edit, and delete projects and tasks
- Managers SHALL be able to assign employees to projects and remove them from projects
- Managers SHALL be able to view organization-wide reports and dashboards
- Managers SHALL have access to view the full activity log for audit purposes
- Managers SHALL be able to filter and search across all organizational data including employees, projects, and time records
- Managers SHALL NOT have the ability to edit organization settings such as currency, timezone, or fiscal start month
- Managers SHALL NOT be able to create, edit, or delete custom roles
- Managers SHALL NOT be able to delete the organization
- Managers SHALL have visibility into all departments and can reassign employees between departments
- Managers SHALL be able to view and manage contract details for all employees

### Elevated Privileges

Admin actors possess **elevated privileges** that extend beyond individual employee capabilities.

- THE system SHALL grant admins visibility into all organizational data regardless of employee assignment
- Admins SHALL be able to perform actions on behalf of any employee within their organization
- Admins SHALL have the ability to override individual employee restrictions for timelog and timesheet management
- Admins SHALL be able to access and modify any employee's personal data within the organization context
- Admins SHALL have the authority to make organization-wide decisions affecting all employees
- Admins SHALL be able to view sensitive information such as employee contracts and pay rates
- Admins SHALL have the ability to take corrective actions on any timesheet including approval or rejection
- Admins SHALL be able to manage project assignments and team compositions across the entire organization
- Admins SHALL have access to comprehensive reporting tools that aggregate data from all employees
- Admins SHALL be able to view and analyze activity logs to monitor organizational changes
- Admins SHALL NOT be able to access data from organizations they do not belong to
- Admin actions SHALL be fully recorded in the activity log for audit purposes
- Admins SHALL maintain organization-scoped boundaries and cannot override multi-tenancy isolation

### Employee Management Capabilities

Admin actors have comprehensive **employee management** capabilities within their organization.

- THE system SHALL allow admins to invite new employees to the organization via email
- Admins SHALL be able to add existing users to the organization when the invited email already has an account
- Admins SHALL be able to create pending invitations for emails that do not yet have accounts
- Admins SHALL be able to edit employee records including department, position, and employment type
- Admins SHALL be able to deactivate employees, preventing them from logging time or submitting timesheets
- Admins SHALL be able to reactivate previously deactivated employees
- Admins SHALL be able to view the complete employee list with filtering and search capabilities
- Admins SHALL be able to filter employees by department, employment type, and status
- Admins SHALL be able to search for employees by name
- Admins SHALL be able to assign roles to employees and change existing role assignments
- Admins SHALL be able to view all employee contracts and employment history
- Admins SHALL be able to create new contracts for employees
- Admins SHALL be able to edit the current active contract for any employee
- Admins SHALL be able to view historical contracts as immutable records
- Admins SHALL be able to view which projects each employee is assigned to

### Timesheet Approval Authority

Admin actors have authority for **timesheet approval** across the organization.

- THE system SHALL allow admins to view all submitted timesheets from all employees
- Admins SHALL be able to approve timesheets, which locks all included timelogs from further editing
- Admins SHALL be able to reject timesheets with a required rejection reason
- Admins SHALL be able to view timesheets filtered by status and date range
- Admins SHALL be able to view the total hours calculated for each timesheet
- Admins SHALL be able to view which user submitted each timesheet and when
- Admins SHALL be able to view the review timestamp and reviewer for approved or rejected timesheets
- Admins SHALL be able to view the rejection reason when a timesheet is rejected
- Admins SHALL be able to view all timelogs included in a timesheet
- Admins SHALL be able to view timesheets in paginated lists
- Admins SHALL be able to track pending timesheets awaiting approval
- Admins SHALL be able to view timesheet status transitions from draft to submitted to approved or rejected

### Project Management Authority

Admin actors have full **project management** authority within their organization.

- THE system SHALL allow admins to create new projects with name, description, color code, and optional budget hours
- Admins SHALL be able to edit project details including name, description, color code, and budget hours
- Admins SHALL be able to set project start and end dates
- Admins SHALL be able to change project status to active, archived, or completed
- Admins SHALL be able to archive projects, preventing new timelogs from being added
- Admins SHALL be able to mark projects as completed, preventing new timelogs from being added
- Admins SHALL be able to delete projects only when no timelogs are associated with them
- Admins SHALL be able to assign employees to projects as members or project leads
- Admins SHALL be able to remove employees from projects
- Admins SHALL be able to view all projects with filtering by status
- Admins SHALL be able to view project membership lists showing all assigned employees and their roles
- Admins SHALL be able to create tasks within projects
- Admins SHALL be able to edit any task in any project
- Admins SHALL be able to view tasks filtered by status, priority, and assigned employee
- Admins SHALL be able to view task history showing status changes and who made them

### Organization-Wide Reports

Admin actors have access to **organization-wide reports** and analytics.

- THE system SHALL allow admins to view the Time Report showing total hours logged per employee for a given date range
- Admins SHALL be able to group time reports by employee, project, or task
- Admins SHALL be able to filter time reports by date range, employee, project, and billable status
- Admins SHALL be able to view breakdown of total hours, billable hours, and non-billable hours
- Admins SHALL be able to view the Project Budget Report showing budget hours versus actual hours logged
- Admins SHALL be able to view percentage of budget consumed for each project
- Admins SHALL be able to view the Weekly Summary Report showing week-by-week summaries for a given date range
- Admins SHALL be able to view total hours, number of timelogs, and number of employees who logged time for each week
- Admins SHALL be able to filter weekly summaries by project
- Admins SHALL be able to view the organization dashboard showing total active employees
- Admins SHALL be able to view total hours logged this week across all employees
- Admins SHALL be able to view the number of pending timesheets awaiting approval
- Admins SHALL be able to view projects with budget utilization over 80%
- Admins SHALL be able to view the top 5 employees by hours logged this week

### Activity Log Access

Admin actors have full **activity log access** for audit and monitoring purposes.

- THE system SHALL allow admins to view the complete activity log for their organization
- Admins SHALL be able to view activity log entries showing timestamp, user who performed the action, action type, target entity, and details
- Admins SHALL be able to view logged actions including employee invitations, deactivations, and reactivations
- Admins SHALL be able to view logged actions including contract creation and edits
- Admins SHALL be able to view logged actions including project creation, archiving, completion, and deletion
- Admins SHALL be able to view logged actions including task status changes
- Admins SHALL be able to view logged actions including timesheet submissions, approvals, and rejections
- Admins SHALL be able to view logged actions including role assignments and changes
- Admins SHALL be able to filter the activity log by action type, user, and date range
- Admins SHALL be able to view the activity log in paginated format
- Admins SHALL be able to use the activity log to audit all significant organizational changes

### Role and Permission Management

Admin actors can manage **roles and permissions** within their organization.

- THE system SHALL allow organization owners to create custom roles with unique names
- Organization owners SHALL be able to assign a set of permissions to each custom role
- Available permissions include: org:manage, employee:manage, employee:view, project:manage, project:view, time:manage, time:approve, time:view_all, report:view
- Organization owners SHALL be able to edit custom role names and permission sets
- Organization owners SHALL be able to delete custom roles only when no employees are assigned to them
- Organization owners SHALL NOT be able to delete the three built-in roles: Owner, Manager, and Employee
- Admins SHALL be able to assign roles to employees
- Admins SHALL be able to change role assignments for employees
- Each employee SHALL be assigned exactly one role within an organization
- Role assignment changes SHALL be recorded in the activity log

### Employee Onboarding

Admin actors can facilitate **employee onboarding** into the organization.

- THE system SHALL allow admins to invite new employees via email invitation
- When an invited email already has a user account, THE system SHALL automatically add that user to the organization
- When an invited email has no account, THE system SHALL create a pending invitation
- When a user signs up with an email that has a pending invitation, THE system SHALL automatically add them to the pending organizations
- Admins SHALL be able to assign a role to newly onboarded employees
- Admins SHALL be able to set department, position, and employment type for new employees
- Admins SHALL be able to create initial contracts for newly onboarded employees
- Admins SHALL be able to assign new employees to relevant projects
- Admins SHALL be able to view onboarding status and pending invitations

### Department Management

Admin actors can manage **departments** within their organization.

- THE system SHALL allow admins to create departments with name and optional description
- Admins SHALL be able to create parent-child department relationships with one level of nesting
- Admins SHALL be able to edit department names and descriptions
- Admins SHALL be able to delete departments
- When a department is deleted, THE system SHALL set affected employees' department to null without deleting the employees
- Admins SHALL be able to view the list of all departments
- Admins SHALL be able to reassign employees between departments
- Admins SHALL be able to view which employees belong to each department

### Contract Management

Admin actors can manage **employee contracts** throughout their lifecycle.

- THE system SHALL allow admins to create contracts for employees with start date, pay rate, and pay period
- Admins SHALL be able to set optional end dates for contracts, with null indicating ongoing contracts
- Admins SHALL be able to specify working hours per week for each contract
- Admins SHALL be able to add optional notes to contracts
- When a new contract is created, THE system SHALL automatically end the previous active contract by setting its end date to the day before the new contract starts
- Admins SHALL be able to edit the current active contract for any employee
- Admins SHALL NOT be able to edit past contracts, which remain as immutable historical records
- Admins SHALL be able to view all contracts for any employee including historical contracts
- Admins SHALL be able to view pay rates and pay periods for all employee contracts

### Project Lifecycle Control

Admin actors have **project lifecycle control** from creation to completion.

- THE system SHALL allow admins to create new projects with required name and color code
- Admins SHALL be able to set optional project attributes including description, budget hours, start date, and end date
- Admins SHALL be able to change project status from active to archived or completed
- When a project is archived or completed, THE system SHALL prevent new timelogs from being added to that project
- Existing timelogs on archived or completed projects SHALL be preserved
- Admins SHALL be able to delete projects only when no timelogs are associated with them
- Admins SHALL be able to assign project leads who can manage tasks within their project
- Admins SHALL be able to remove employees from projects at any time
- Admins SHALL be able to view project status and budget utilization
- Admins SHALL be able to track project progress through task completion status

### Comprehensive Reporting

Admin actors have access to **comprehensive reporting** capabilities.

- THE system SHALL provide admins with multiple report types including Time Report, Project Budget Report, and Weekly Summary Report
- Admins SHALL be able to generate reports for custom date ranges
- Admins SHALL be able to filter reports by employee, project, task, and billable status
- Admins SHALL be able to group report data by different dimensions including employee, project, and task
- Admins SHALL be able to view detailed breakdowns including total hours, billable hours, and non-billable hours
- Admins SHALL be able to view budget consumption percentages for projects with defined budgets
- Admins SHALL be able to view weekly summaries showing hours, timelog counts, and employee participation
- Admins SHALL be able to access the organization dashboard with key metrics
- Admins SHALL be able to identify projects exceeding 80% budget utilization
- Admins SHALL be able to identify top performers by hours logged

### Full Data Visibility

Admin actors have **full data visibility** within their organization scope.

- THE system SHALL grant admins visibility into all organizational data including employees, projects, tasks, timelogs, and timesheets
- Admins SHALL be able to view data regardless of which employee created or owns it
- Admins SHALL be able to view all timelogs from all employees
- Admins SHALL be able to view all timesheets from all employees regardless of status
- Admins SHALL be able to view all tasks across all projects
- Admins SHALL be able to view all project details and memberships
- Admins SHALL be able to view all employee information including contracts and employment details
- Admins SHALL be able to view all department structures and assignments
- Admins SHALL be able to view all role assignments and permissions
- Admins SHALL NOT be able to view data from organizations they do not belong to
- Admins SHALL only see data for their currently selected organization when belonging to multiple organizations

### Audit Trail Access

Admin actors have **audit trail access** through the activity log system.

- THE system SHALL record all significant admin actions in the activity log
- Admins SHALL be able to view who performed each action and when
- Admins SHALL be able to view what type of action was performed
- Admins SHALL be able to view which entity was affected by each action
- Admins SHALL be able to view detailed information about each action
- Admins SHALL be able to track employee lifecycle events including invitations, deactivations, and reactivations
- Admins SHALL be able to track contract changes including creation and edits
- Admins SHALL be able to track project lifecycle events including creation, archiving, completion, and deletion
- Admins SHALL be able to track task status changes and who made them
- Admins SHALL be able to track timesheet workflow events including submissions, approvals, and rejections
- Admins SHALL be able to track role assignment changes
- Admins SHALL be able to filter audit trails by action type, user, and date range
- Admins SHALL be able to use the audit trail for compliance and accountability purposes

### Cross-Employee Management

Admin actors can perform **cross-employee management** across the entire organization.

- THE system SHALL allow admins to manage any employee's data regardless of department or role
- Admins SHALL be able to edit any employee's department, position, and employment type
- Admins SHALL be able to edit any employee's timelogs and timesheets
- Admins SHALL be able to approve or reject any employee's timesheet submissions
- Admins SHALL be able to assign any employee to any project
- Admins SHALL be able to create or edit contracts for any employee
- Admins SHALL be able to change role assignments for any employee
- Admins SHALL be able to deactivate or reactivate any employee
- Admins SHALL be able to view all employees' time tracking data
- Admins SHALL be able to compare performance across employees through reports
- Admins SHALL be able to reassign tasks between employees
- Admins SHALL be able to manage project team compositions across all departments

### Organization-Scoped Authority

Admin actors operate within **organization-scoped authority** boundaries.

- THE system SHALL restrict admin authority to their own organization only
- Admins SHALL NOT be able to access data from other organizations
- Admins SHALL NOT be able to manage employees in organizations they do not belong to
- When admins belong to multiple organizations, THE system SHALL require them to select an organization context
- All admin actions SHALL be scoped to the currently selected organization
- Admins SHALL be able to switch between organizations without logging out
- After switching organizations, admin permissions SHALL apply to the new organization context
- Admins SHALL see only the roles and permissions they have in each specific organization
- Multi-tenancy isolation SHALL be enforced at all times
- Admin actions SHALL be recorded in the activity log of the organization where the action occurred

# Authentication Flows

Registration, login, logout, and session management from a user perspective.

## Registration and Login

Define user registration and login flows including validation and error handling.

### Guest Actor Definition and Access

**Definition**: A guest is an unauthenticated user who has not yet registered or logged into the HRM Platform.

**Characteristics**:
- No persistent identity or account in the system
- Limited access to public-facing features only
- Cannot access organization-specific data or employee information
- Session is temporary and does not persist across browser sessions

**YAML Specification**:
```yaml
guest:
  kind: guest
  description: Unauthenticated user with limited platform access
  permissions:
    - view_public_features
    - access_registration_page
    - access_login_page
  restrictions:
    - cannot_access_organization_data
    - cannot_access_employee_information
    - cannot_perform_authenticated_actions
```

**Access Scope**:
- Registration and login pages
- Public information pages
- Help documentation

Guests must complete registration to become members and gain access to authenticated features.

### Member Actor Definition and Access

**Definition**: A member is an authenticated user who has completed registration and has an active account in the system.

**Characteristics**:
- Has a unique email address and password
- Belongs to one or more organizations
- Has a UserProfile with display name and optional avatar
- Can access organization-specific features and data

**YAML Specification**:
```yaml
member:
  kind: member
  description: Authenticated user with organization access
  permissions:
    - login_to_platform
    - view_profile
    - update_profile
    - view_organization_data
    - manage_timesheets
    - manage_timelogs
    - view_assigned_tasks
    - update_own_tasks
    - switch_organization_context
  restrictions:
    - cannot_access_admin_features
    - cannot_manage_other_employees
    - cannot_modify_organization_settings
  belongs_to:
    - Organizations (multiple)
    - UserProfile (one)
```

**Access Scope**:
- Personal profile management
- Timesheet and timelog creation
- Task viewing and updates (assigned tasks only)
- Organization data within selected context
- Project and task information for assigned projects

### Admin Actor Definition and Access

**Definition**: An admin is an authenticated user with elevated privileges to manage organization settings, employees, and system configurations.

**Characteristics**:
- Has all member permissions plus administrative capabilities
- Can manage organization settings and configurations
- Can add, modify, or remove employees from the organization
- Can view and manage all projects and tasks within the organization
- Can approve or reject timesheets

**YAML Specification**:
```yaml
admin:
  kind: admin
  description: Authenticated user with administrative privileges
  permissions:
    - all_member_permissions
    - manage_organization_settings
    - manage_employees
    - manage_roles
    - manage_departments
    - manage_projects
    - manage_tasks
    - approve_timesheets
    - view_activity_logs
    - configure_organization
  restrictions:
    - cannot_modify_other_organizations
    - cannot_modify_system_core_settings
  belongs_to:
    - Organizations (one or more as admin)
    - UserProfile (one)
```

**Access Scope**:
- All member features
- Organization configuration and settings
- Employee management (add, edit, remove)
- Role and permission management
- Department structure management
- Project and task management
- Timesheet approval workflows
- Activity log viewing

## Session and Logout

Define session behavior and logout from a user perspective.

### Actor Definitions

The hrmPlatform defines three distinct actor types, each with specific capabilities and access levels:

```yaml
actors:
  guest:
    name: guest
    kind: guest
    description: Unauthenticated user with limited access to public features
    permissions:
      - view_public_content
      - initiate_login
      - reset_password
    access_scope: public_only
    session_state: stateless

  member:
    name: member
    kind: member
    description: Authenticated employee with organization-specific access
    permissions:
      - view_organization_data
      - manage_personal_profile
      - create_timelogs
      - submit_timesheets
      - manage_tasks
      - view_projects
      - switch_organizations
    access_scope: organization_member
    session_state: stateful

  admin:
    name: admin
    kind: admin
    description: Organization administrator with elevated privileges
    permissions:
      - all_member_permissions
      - manage_organization_settings
      - manage_users
      - manage_employees
      - manage_departments
      - manage_roles
      - manage_projects
      - view_activity_logs
      - approve_timesheets
    access_scope: organization_admin
    session_state: stateful
```

Guest actors can access public content without authentication but cannot access organization-specific data. Members are authenticated users belonging to one or more organizations with access to their organization's data. Admins have elevated permissions within their organization including user management and administrative functions.

### Session Management

Sessions maintain the authenticated state of users within the hrmPlatform. When a user successfully logs in, a session is established that preserves their identity and organizational context.

Sessions are scoped to the organization selected during login. All user actions are performed within the context of the selected organization. Members belonging to multiple organizations can switch between them without ending their session, updating the organizational context as needed.

Sessions persist as long as users remain actively using the system. The system does not implement automatic session expiration based on time or inactivity. Each device maintains a single active session per user, with new logins replacing existing sessions on that device.

Multiple users can maintain concurrent sessions within the same organization. Session termination occurs when users log out, when their account is deleted, or when an organization is removed.

### Logout

Users can end their authenticated session through the logout function. Logging out terminates the session immediately, preventing further access to organization data and features.

The logout action is available from any location within the application. After logging out, users must authenticate again to regain system access. Logging out preserves the user account and all associated data.

Organization switching does not require logout—users can change their organizational context while maintaining their authenticated session. If the system terminates a session for any reason, users must log in again to continue using the platform.

All logout actions are recorded in the activity log for audit purposes.

# Account Lifecycle

Account creation, deletion, and password management.

## Account Management

Define how users create accounts, delete accounts, and change passwords.

### Account Creation

Users can create an account by providing an email address and password during the sign-up process.

The email address must be unique across all accounts in the system.

When creating an account, users simultaneously create their first organization as part of the initial sign-up flow.

Users can belong to multiple organizations after account creation.

New accounts are immediately active and can be used to log in once created.

Account creation requires acceptance of the platform's terms of service.

### Account Deletion

Users can request to delete their account at any time.

If a user is the sole owner of an organization, they must either transfer ownership to another user or delete the organization before their account can be deleted.

When a user deletes their account, their employee records in other organizations are automatically marked as deactivated.

Deactivated employee records preserve all historical data including timelogs and timesheets.

Account deletion is permanent and cannot be undone.

The user's global profile information is removed upon account deletion.

Users cannot delete their account if they have pending timesheets that require their action.

### Password Change

Authenticated users can change their password at any time.

To change a password, users must provide their current password and a new password.

The new password must meet minimum security requirements defined by the system.

After a successful password change, the user must log in again using the new password.

Password changes are immediately effective across all organizations the user belongs to.

Users can view a history of recent password changes for security awareness.