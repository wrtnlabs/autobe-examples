**hrmTimeTrack — Business concepts, relationships, and states from user perspective**

Business concepts, relationships, and states from user perspective

# Domain Concepts

Describe what each concept means in the business domain and its key attributes.

## Organization Concept

An Organization represents a distinct business entity within the multi-tenant ERP platform. Each organization operates independently with its own employees, projects, and data isolated from other organizations. Organizations are identified by a unique name and can include an optional description for context. Each organization maintains its own logo image for brand identity. The organization defines its operating currency, such as USD, EUR, or KRW, for financial calculations. Timezone settings determine how dates and times are displayed and interpreted within the organization. The fiscal start month establishes when the organization's financial year begins. Organization owners have the authority to manage all settings and members within their organization. When an organization is removed, all associated employees, projects, tasks, timelogs, and timesheets are permanently deleted. The organization structure enables complete data isolation between different business entities.

### Organization and Multi-Tenancy

An Organization represents a distinct business entity within the multi-tenant ERP platform. Each organization operates independently with complete data isolation from other organizations. Users belonging to multiple organizations can only access data for their currently selected organization context. The multi-tenancy architecture ensures that employees, projects, tasks, timelogs, and timesheets from one organization are never visible to users in another organization. This independence allows each organization to maintain its own employees, projects, and data without any cross-organization data leakage. Organization context is established when users log in and select which organization to work in, and all subsequent actions are scoped to that selected organization.

### Organization Attributes

Each organization is identified by a unique name that distinguishes it from other organizations. An optional description provides additional context about the organization's purpose or business focus. Organizations can include a logo image for brand identity and visual recognition within the platform. The organization defines its operating currency, such as USD, EUR, or KRW, which is used for financial calculations and pay rate specifications. Timezone settings determine how dates and times are displayed and interpreted throughout the organization, ensuring consistent time-based operations. The fiscal start month establishes when the organization's financial year begins, which may differ from calendar year for accounting and reporting purposes.

### Organization Lifecycle and Deletion

Organization owners have the authority to manage all settings and members within their organization. When an organization is deleted, all associated data is permanently removed including employees, projects, tasks, timelogs, and timesheets. The organization owner's user account remains active but is no longer associated with any organization after deletion. Deletion of an organization is only permitted when all pending timesheets are resolved (approved or rejected) and there are no active employee contracts. This ensures that all outstanding business processes are completed before the organization and its data are removed from the platform.

## User Concept

A User represents an individual account holder who can access the ERP platform. Users authenticate using their email address and password combination. A single user can belong to multiple organizations simultaneously, enabling cross-organization work. When accessing the platform, users select which organization they want to work in, establishing their current organizational context. All subsequent actions and data access are scoped to the selected organization. Users can switch between organizations without needing to log out and log back in. User accounts maintain a creation timestamp marking when the account was first established. When a user deletes their account, their employee records in other organizations are marked as deactivated rather than removed. If a user is the sole owner of an organization, they must transfer ownership or delete the organization before account deletion. User accounts persist independently from organizational membership.

### User Account and Authentication

A User represents an individual account holder who can access the ERP platform. Users authenticate using their email address and password combination. Each user account is created with a timestamp marking when the account was first established. The email address serves as the unique identifier for authentication purposes. Users must provide a valid email address and password to create an account. The password is required for all login attempts. User accounts persist independently from organizational membership and are not deleted when leaving an organization.

### Multi-Organization Membership

A single user can belong to multiple organizations simultaneously, enabling cross-organization work. When accessing the platform, users select which organization they want to work in, establishing their current organizational context. All subsequent actions and data access are scoped to the selected organization. Users can switch between organizations without needing to log out and log back in. Each organization maintains its own independent data, and users only see data from their currently selected organization. The organization context selection is required before users can perform any operations within the platform.

### Account Lifecycle and Deletion

User accounts have a lifecycle from creation through potential deletion. When a user deletes their account, their employee records in other organizations are marked as deactivated rather than removed. If a user is the sole owner of an organization, they must transfer ownership or delete the organization before account deletion can proceed. User accounts persist independently from organizational membership, meaning the account itself can exist without being associated with any organization. Deactivated employee records preserve historical data while preventing future time tracking or timesheet submission. Account deletion is a permanent action that removes the user's ability to authenticate and access the platform.

## UserProfile Concept

A UserProfile represents the personal identity information for a user across all organizations. The profile contains a display name that appears throughout the platform instead of the email address. Users can upload an avatar image that serves as their visual identifier in the system. A phone number field is available for contact purposes. The user profile is global and shared across all organizations the user belongs to, eliminating the need for duplicate profile data. Profile information remains consistent regardless of which organization context the user is currently working in. Users have the ability to update their profile information as needed. The profile provides a human-readable identity separate from the authentication credentials. Display names help colleagues identify users more easily than email addresses. Avatar images add a personal touch to the user experience across the platform.

### UserProfile Definition

A UserProfile represents the personal identity information for a user that exists independently from any organization membership. The profile provides a human-readable identity separate from authentication credentials like email addresses. Each user account has exactly one UserProfile that persists for the lifetime of the account. The profile enables colleagues to identify users more easily through display names rather than email addresses. This global identity remains consistent regardless of which organization context the user is currently working in. The UserProfile serves as the primary way users present themselves across the platform.

### Profile Attributes

A UserProfile contains three core attributes: display name, avatar image, and phone number. The display name is the primary identifier shown throughout the platform instead of the email address. Users can upload an avatar image that serves as their visual identifier in the system, adding a personal touch to the user experience. The phone number field is available for contact purposes and can be updated as needed. All three attributes work together to create a complete personal identity that is recognizable across all organizations the user belongs to.

### Profile Scope and Consistency

The UserProfile is global and shared across all organizations the user belongs to, eliminating the need for duplicate profile data in each organization. Profile information remains consistent regardless of which organization context the user is currently working in. When a user updates their profile, the changes apply universally across all organizations. Users have the ability to update their profile information as needed, and these updates are immediately reflected in every organization where they are a member. This single source of truth for profile data ensures consistency and reduces administrative overhead.

## Employee Concept

An Employee represents a person's role and status within a specific organization. Each employee record links to a user account and defines their position in the organization. Employees are assigned exactly one role within their organization, determining their permissions and access levels. The department field categorizes employees into organizational units for management purposes. Position or title describes the employee's job role within the company. Employment type classifies workers as full-time, part-time, contractor, or intern for reporting and compliance. Employee status indicates whether they are active or deactivated within the organization. Active employees can log time and submit timesheets for approval. Deactivated employees cannot perform time tracking activities but their historical data remains preserved. Deactivated employees can be reactivated when needed. Employee records maintain the relationship between users and their organizational roles.

### Employee Organization Membership

An Employee represents a person's role and status within a specific organization. Each employee record links to a user account and establishes the person's membership in that organization. A single user can have employee records in multiple organizations, with each record being independent and organization-specific. The employee record defines the person's position, role, and working relationship within that particular organization. Employee membership is scoped to the organization context, meaning employees in one organization cannot access data from another organization. The employee record maintains the relationship between the user account and their organizational role, enabling the system to track employment history across different organizations.

### Role Assignment

Each employee is assigned exactly one role within their organization. The role determines the employee's permissions and access levels for that organization. Role assignment is managed by users with appropriate permissions. When a role is changed, the employee's access levels are updated accordingly. The role assignment is specific to each organization, so a user can have different roles in different organizations. Built-in roles include Owner, Manager, and Employee, each with predefined permission sets. Custom roles can also be created and assigned to employees. The role assignment cannot be null; every active employee must have a role assigned.

### Department Categorization

The department field categorizes employees into organizational units for management and reporting purposes. Department assignment is optional and can be left blank for employees not assigned to a specific department. When assigned, the department links the employee to an organizational unit defined in the organization's department structure. Department categorization enables filtering and grouping of employees by organizational structure. If a department is deleted, employees previously assigned to that department have their department field set to null, but the employee records remain intact. Department assignment does not affect an employee's role or permissions.

### Position and Job Title

Position or title describes the employee's job role within the company. This field is optional and provides context about the employee's specific responsibilities. The position title is independent of the role assignment, which controls system permissions. Position titles can vary widely depending on the organization's structure and naming conventions. Examples include Software Engineer, Marketing Manager, Sales Representative, or Administrative Assistant. The position title is used for display purposes in employee lists and reports. Changes to position title do not affect the employee's access levels or organizational permissions.

### Employment Type Classification

Employment type classifies workers into categories for reporting and compliance purposes. The system supports four employment type values: full-time, part-time, contractor, and intern. Each employee record includes an employment type classification. Full-time employees typically work standard hours as defined in their contract. Part-time employees work reduced hours compared to full-time staff. Contractors are external workers engaged for specific projects or periods. Interns are temporary workers gaining experience, often students. Employment type affects how employees appear in reports and may influence contract terms. The employment type can be updated as the worker's classification changes over time.

### Employee Status

Employee status indicates whether they are active or deactivated within the organization. Active employees can log time, submit timesheets, and access all features according to their role permissions. Deactivated employees cannot perform time tracking activities or submit timesheets. Deactivation does not delete the employee record; it preserves all historical data including timelogs and timesheets. Historical data preservation ensures that past work records remain accessible for reporting and auditing. Deactivated employees can be reactivated when needed, restoring their ability to log time and submit timesheets. Reactivation does not affect the employee's historical records or previous work data. The status field cannot be null; every employee must have either active or deactivated status.

## EmployeeContract Concept

An EmployeeContract represents the employment agreement terms for an employee within an organization. Each contract specifies a required start date marking when the agreement begins. The end date is optional, with no end date indicating an ongoing contract. Pay rate defines the compensation amount and is a required numeric value. Pay period determines how compensation is calculated, such as hourly, daily, weekly, or monthly. Working hours per week establishes the expected time commitment, such as forty hours. Optional notes can capture additional contract details or special conditions. An employee can have multiple contracts over time, creating a historical employment record. Only one contract can be active at any given time for an employee. When a new contract is created, the previous active contract is automatically ended. Past contracts become immutable historical records and cannot be modified. Employees can view their own contract history. Managers can view contracts for employees they have access to.

### Contract Structure and Terms

An EmployeeContract represents the employment agreement terms for an employee within an organization. Each contract specifies a required start date marking when the agreement begins. The end date is optional, with no end date indicating an ongoing contract. Pay rate defines the compensation amount and is a required numeric value. Pay period determines how compensation is calculated, such as hourly, daily, weekly, or monthly. Working hours per week establishes the expected time commitment, such as forty hours. Optional notes can capture additional contract details or special conditions.

### Contract Lifecycle and History

An employee can have multiple contracts over time, creating a historical employment record. Only one contract can be active at any given time for an employee. When a new contract is created, the previous active contract is automatically ended. Past contracts become immutable historical records and cannot be modified. Employees can view their own contract history. Managers can view contracts for employees they have access to.

## Department Concept

A Department represents an organizational unit within an organization for grouping and managing employees. Each department has a unique name that identifies the unit. An optional description provides additional context about the department's purpose or function. Departments can have a parent department, allowing one level of hierarchical nesting for organizational structure. This parent-child relationship enables more granular organizational grouping. When a department is removed, employees assigned to it have their department reference set to null rather than being deleted. This preserves employee records while removing the departmental association. Departments help organize employees into logical business units for reporting and management purposes. The department structure supports flexible organizational designs. Employees can be grouped by department for filtering and analysis. Department names and descriptions help users understand the organizational structure.

### Department as Organizational Unit

A Department represents an organizational unit within an organization for grouping and managing employees. Departments serve as logical business units that help structure the organization hierarchically. Each department exists within a single organization and cannot span across multiple organizations. Departments enable organizations to categorize employees by function, team, or business area. The department structure supports flexible organizational designs that can adapt to changing business needs. Departments provide a foundation for organizing employees into meaningful groups for management and reporting purposes.

### Department Identification

Each department has a unique name that identifies the unit within its organization. The department name must be distinct from other departments at the same hierarchical level within the same organization. Department names help users identify and distinguish between different organizational units. The name serves as the primary identifier for the department in all system displays and reports. Department names should be descriptive enough to convey the purpose or function of the unit to users.

### Department Description

Each department may have an optional description that provides additional context about the department's purpose or function. The description helps users understand the scope, responsibilities, or business focus of the department. Descriptions are not required for all departments but are recommended for clarity in larger organizations. The description can include information about the department's mission, key activities, or reporting relationships. Department descriptions assist new employees and managers in understanding the organizational structure.

### Department Hierarchy

Departments can have a parent department, allowing one level of hierarchical nesting for organizational structure. This parent-child relationship enables more granular organizational grouping within the organization. Only one level of nesting is supported, meaning a department can have a parent but cannot have a grandparent department. The hierarchical structure allows organizations to create sub-departments under main departments for better organization. Parent departments provide a higher-level grouping while child departments offer more specific categorization. The one-level hierarchy balances organizational flexibility with structural simplicity.

### Employee Department Association

Employees can be assigned to a department within their organization. Each employee may have at most one department assignment at any given time. The department assignment links the employee to the organizational unit for management and reporting purposes. Employees without a department assignment are considered unassigned to any department. Department assignments enable grouping employees by organizational unit for filtering, analysis, and reporting. The department association is maintained as part of the employee record within the organization.

### Department Removal Behavior

When a department is removed from an organization, employees assigned to that department have their department reference set to null rather than being deleted. This preserves employee records while removing the departmental association. The removal of a department does not affect the employee's other attributes such as role, position, or employment type. Child departments under a removed parent department are not automatically deleted but become unassigned from their parent. This behavior ensures that employee data is preserved even when organizational structure changes. The null department assignment indicates that the employee is not currently associated with any department.

### Department for Analysis and Reporting

Departments enable filtering and analysis of employees by organizational unit. Users can filter employee lists and reports by department to view data for specific organizational units. Department-based filtering supports analysis of workforce distribution across different business units. Reports can group employee data by department to show metrics such as headcount, hours logged, or project assignments per department. The department structure facilitates organizational analysis and supports management decision-making. Department filtering and analysis capabilities help organizations understand how work is distributed across their structure.

## Role Concept

A Role defines a set of permissions that determine what actions a user can perform within an organization. Each organization maintains its own set of roles independent of other organizations. Three built-in roles exist that cannot be deleted: Owner, Manager, and Employee. The Owner role grants full access to all features including role and member management. The Manager role allows managing employees, projects, approving timesheets, and viewing reports. The Employee role permits time tracking, timesheet submission, and viewing own data. Organization owners can create custom roles with specific permission combinations. Each custom role has a unique name and a defined set of permissions from the available permission list. Available permissions include organization management, employee management, project management, time management, and report viewing. Custom roles can be edited to modify their permission sets. Custom roles can only be deleted when no employees are assigned to them. Each employee is assigned exactly one role within their organization.

### Role Definition and Organization Scope

A Role defines a set of permissions that determine what actions a user can perform within an organization. Each organization maintains its own independent set of roles that are not shared with other organizations. This organization-specific role structure ensures that permission configurations in one organization do not affect any other organization. Roles serve as the foundation for permission-based access control throughout the platform.

### Built-in Roles

Three built-in roles exist in every organization and cannot be deleted: Owner, Manager, and Employee. The Owner role grants full access to all features including organization settings, role management, and member management. The Manager role allows managing employees, managing projects, approving timesheets, and viewing organization reports. The Employee role permits time tracking, timesheet submission, and viewing own data only. These built-in roles provide a baseline permission structure that every organization inherits automatically.

### Custom Role Creation

Organization owners can create custom roles to define specific permission combinations beyond the built-in roles. Each custom role must have a unique name within the organization. Custom roles are created with a defined set of permissions selected from the available permission list. This allows organizations to tailor access control to their specific operational needs and reporting structures.

### Role Permissions

Each role contains a set of permissions that define what actions are allowed. Available permissions include: organization management (edit organization settings), employee management (add, edit, deactivate employees), employee viewing (view employee list and details), project management (create, edit, delete projects and tasks), project viewing (view projects and tasks), time management (edit or delete any employee's timelogs), timesheet approval (approve or reject timesheets), time viewing all (view all employees' timelogs and timesheets), and report viewing (view organization reports). Custom roles can be edited to modify their permission sets to add or remove permissions as organizational needs change.

### Role Assignment

Each employee is assigned exactly one role within their organization. This single role assignment determines all permissions and access levels for that employee in the organization. Role assignment can be changed by users who have employee management permission. When an employee's role is changed, their access immediately reflects the new permission set. The role assignment is tracked as part of the employee record.

### Custom Role Deletion Constraints

Custom roles can only be deleted when no employees are assigned to them. This constraint prevents orphaned employee records and ensures that every employee always has a valid role assignment. If employees are currently assigned to a custom role, the role must first be reassigned to a different role for all affected employees before deletion can proceed. Built-in roles cannot be deleted under any circumstances.

## Project Concept

A Project represents a work initiative or engagement within an organization. Each project has a required name that uniquely identifies it. An optional description provides context about the project's purpose or scope. A color code is required for visual identification and display in the user interface. Projects have a status that can be active, archived, or completed. Budget hours represent the total estimated hours allocated to the project and are optional. Start date marks when the project begins and is optional. End date indicates when the project concludes and is optional. Archived or completed projects cannot receive new time entries but preserve existing timelogs. Projects serve as containers for organizing work and tracking time. The project structure enables resource planning and budget management. Projects can be filtered by status for easy navigation and reporting.

### Project as Work Initiative

A Project represents a work initiative or engagement within an organization. Projects serve as containers for organizing work and tracking time across multiple employees and tasks. Each project enables resource planning, budget management, and progress tracking for specific business objectives. Projects are the primary organizational unit for time tracking activities within the organization.

### Project Identification and Description

Each project requires a name that uniquely identifies it within the organization. An optional description provides context about the project's purpose, scope, or business objectives. The name and description help employees understand what work the project encompasses and how their time contributions relate to organizational goals.

### Visual Identification

Each project requires a color code for visual identification and display in the user interface. The color code helps users quickly distinguish between different projects when viewing timelogs, timesheets, or reports. This visual distinction supports efficient time tracking and project management activities.

### Project Status States

Projects have a status that indicates their current lifecycle state. The status can be active, archived, or completed. Active projects are currently accepting time entries and work assignments. Archived projects are no longer active but preserved for historical reference. Completed projects have finished all planned work. The status determines what operations can be performed on the project and its associated time entries.

### Budget and Time Planning

Projects may have budget hours representing the total estimated hours allocated for completion. Budget hours are optional and used for tracking actual versus planned effort. Projects may have an optional start date marking when the project begins and an optional end date indicating when the project concludes. These dates help with resource planning and timeline management.

### Archival and Timelog Preservation

When a project is archived or marked as completed, it cannot receive new time entries. However, all existing timelogs associated with the project are preserved for historical reference and reporting. This ensures that past work records remain available even after the project lifecycle ends. Archived and completed projects maintain their data integrity for audit and reporting purposes.

## ProjectMember Concept

A ProjectMember represents the assignment of an employee to a specific project. Each project membership links an employee to a project they are working on. An employee can be assigned to multiple projects simultaneously, enabling cross-project work. Each project membership includes an assigned role that is either member or project-lead. Project leads have the authority to manage tasks within their assigned project. The project member relationship enables proper access control for project-related activities. Employees can view which projects they are assigned to for visibility into their work. Project membership defines who can contribute time and work on specific projects. The assigned role determines the level of control an employee has within the project. Project members can be removed from projects when their involvement ends. Project membership creates the foundation for task assignment and time tracking within projects.

### Project Assignment Structure

A ProjectMember represents the assignment relationship between an employee and a project. Each project membership establishes that an employee is authorized to work on a specific project. An employee can maintain multiple project memberships simultaneously, allowing them to contribute to several projects at the same time. Each project membership is unique to a specific employee-project combination. The assignment creates the foundational link that enables the employee to log time, view tasks, and participate in project activities. Project membership is required for any employee who needs to contribute work to a project.

### Assigned Roles and Authority

Each project membership includes an assigned role that defines the employee's level of authority within that project. The role is either member or project-lead. Members have standard access to view and contribute to the project. Project leads have elevated authority to manage tasks within their assigned project. This role-based control ensures appropriate task management permissions are granted. The assigned role determines what actions an employee can perform within the project context. Project lead status enables task creation, editing, and status management for tasks in that project.

### Access and Visibility

Project membership establishes access control for all project-related activities. Employees can only view projects to which they are assigned as members. This visibility restriction ensures employees see only their relevant work assignments. Project membership authorizes employees to contribute time through timelogs to their assigned projects. Without project membership, employees cannot log time or access project resources. The membership relationship enforces proper data isolation between projects. Employees can view their complete list of project assignments to understand their work scope.

### Membership Lifecycle and Foundation

Project membership can be removed when an employee's involvement with a project ends. Removal of project membership terminates the employee's access to that project. The project membership relationship serves as the foundation for task assignment within projects. Tasks can only be assigned to employees who are members of that project. This ensures task assignments are always valid and enforceable. Project membership creates the necessary context for time tracking activities. The membership enables the system to validate that time entries and task assignments reference valid employee-project relationships.

## Task Concept

A Task represents a discrete unit of work within a project. Each task has a required title that describes the work to be performed. An optional description provides additional details about the task requirements. Tasks have a status that can be open, in-progress, completed, or closed to track progress. Priority levels include low, medium, high, and urgent to indicate importance. Estimated hours represent the expected time to complete the task and are optional. Due date specifies when the task should be completed and is optional. Tasks can be assigned to a specific employee who must be a member of the project. Tasks can have a parent task for subtask organization with one level of nesting only. Task status changes are recorded in task history for audit purposes. Tasks can be filtered by status, priority, and assigned employee for efficient management. Tasks can be sorted by due date, priority, or creation date.

### Task Definition

A Task represents a discrete unit of work within a project. Each task has a required title that describes the work to be performed. An optional description provides additional details about the task requirements and context. Tasks are created within projects and inherit the project's organizational context.

### Task Status

Tasks have a status that tracks their progress through the workflow. The status can be one of four values: open (task is newly created and ready to begin), in-progress (work has started on the task), completed (work is finished but awaiting review), or closed (task is finalized and archived). Status changes are recorded in task history for audit purposes, as defined in the TaskHistory Concept.

### Task Priority

Tasks have a priority level that indicates their relative importance and urgency. Priority can be set to one of four levels: low (least urgent, can be deferred), medium (normal priority), high (requires attention soon), or urgent (must be addressed immediately). Priority helps employees and managers understand which tasks should be worked on first.

### Task Time Estimates

Tasks can have an estimated hours value that represents the expected time to complete the work. This estimate is optional and provides planning guidance for project managers and employees. The estimated hours can be used to compare against actual time logged on the task for performance tracking and future planning.

### Task Due Date

Tasks can have an optional due date that specifies when the task should be completed. The due date helps employees prioritize their work and enables managers to track whether tasks are on schedule. Tasks without a due date are considered to have flexible deadlines.

### Task Assignment

Tasks can be assigned to a specific employee who is responsible for completing the work. The assigned employee must be a member of the project containing the task. Tasks without an assignment are unassigned and available for any project member to take on. An employee can be assigned to multiple tasks within the same project or across different projects.

### Task Hierarchy

Tasks can have a parent task for subtask organization. This allows breaking down complex work into smaller, manageable pieces. Only one level of nesting is supported, meaning a task can be either a parent task with subtasks or a subtask of another task, but not both. Subtasks inherit the project context from their parent task.

### Task History

Task status changes are recorded in task history for audit and tracking purposes. Each history entry captures when the status changed, what the previous status was, what the new status is, and which user made the change. This history is defined in the TaskHistory Concept and provides a complete audit trail of task progression.

### Task Organization

Tasks can be filtered by status, priority, and assigned employee to help users find relevant work. Tasks can be sorted by due date to prioritize upcoming deadlines, by priority to address urgent work first, or by creation date to see the most recent tasks. These organization capabilities enable efficient task management and workflow oversight.

## TaskHistory Concept

A TaskHistory represents an audit record of status changes made to a task. Each history entry captures the timestamp when the change occurred. The old status field records what the task status was before the change. The new status field records what the task status was changed to. The history entry identifies which user made the status change. Task history provides an audit trail for tracking how tasks progress through their lifecycle. This historical record helps managers understand task movement and accountability. History entries are created automatically when task status changes occur. The task history supports compliance and transparency requirements. Managers can review history to understand decision-making around task status. Task history entries are immutable once created. The history provides context for task management decisions.

### Task Status Change Audit

Task history provides an audit trail for all status changes made to tasks within the system. Each time a task status changes, the system automatically creates a history entry that captures the complete context of the change. The history entry records the exact timestamp when the status change occurred, providing precise timing information for audit purposes. The old status field preserves what the task status was before the change, maintaining a complete before-and-after record. The new status field documents what the task status was changed to, showing the result of the status transition. The history entry identifies which user performed the status change, establishing clear accountability for each modification. This audit trail enables managers to review how tasks have progressed through different stages of their lifecycle. The task history supports organizational compliance requirements by maintaining a permanent record of all status changes. Each history entry is created automatically when a status change occurs, requiring no manual intervention from users. The system ensures that all status changes are captured consistently across all tasks in the organization.

### Task Lifecycle and Accountability

Task history entries provide transparency into how tasks move through their lifecycle from creation to completion. Managers can use the history to understand decision-making processes around task status changes and verify that appropriate approvals were obtained. The immutable nature of history entries ensures that the audit trail cannot be altered or deleted once created, maintaining data integrity for compliance purposes. Each history entry serves as evidence of who made changes and when, supporting management accountability for task management decisions. The history provides context for understanding why tasks transition between different status states, helping managers identify bottlenecks or process issues. Task history supports organizational transparency by making all status changes visible to authorized users. The historical record helps demonstrate compliance with internal policies and external regulatory requirements. Managers can review task history to verify that status changes follow established workflows and approval processes. The task history concept enables organizations to maintain a complete audit trail for all task-related activities.

## Timelog Concept

A Timelog represents a recorded time entry for work performed by an employee. Each timelog has a required date indicating when the work was performed. Duration in minutes captures how long the work took and is required. The timelog must be associated with a project that the employee is assigned to. An optional task field links the time entry to a specific task within the project. A description field allows employees to note what work was accomplished. The billable flag indicates whether the time should be charged to a client, defaulting to true. Employees can only create timelogs for their own work. Timelogs can be filtered by date range, project, task, and billable status for reporting. Timelogs are displayed in paginated lists for efficient browsing. Timelogs form the foundation for timesheet creation and approval workflows.

### Timelog Definition and Core Attributes

A Timelog represents a recorded time entry for work performed by an employee. Each timelog captures when work was done, how long it took, and what project or task it relates to.

**Required Attributes:**

- **Date**: The calendar date when the work was performed. This is a required field and indicates the specific day the time was logged.
- **Duration in Minutes**: The length of time spent on the work, measured in minutes. This is a required field and must be a positive numeric value.
- **Project**: The project the time was logged against. This is a required field and must be a project that the employee is assigned to.

**Optional Attributes:**

- **Task**: A specific task within the selected project that the time relates to. This is optional and must belong to the associated project if provided.
- **Description**: A text note describing what work was accomplished during the time entry. This is optional and allows employees to document their activities.
- **Billable Flag**: A boolean indicator specifying whether the time should be charged to a client. The default value is true (billable). When set to false, the time is considered non-billable.

**Relationships:**

- Each timelog belongs to exactly one project
- Each timelog optionally belongs to one task (if the task exists within the associated project)
- Each timelog is created by and belongs to one employee
- Timelogs are collected into timesheets for approval workflows

**Key Characteristics:**

- Timelogs are the fundamental unit of time tracking in the system
- They serve as the building blocks for timesheet creation
- They support filtering by date range, project, task, and billable status
- They are displayed in paginated lists for efficient browsing
- They can be viewed by the creating employee and by users with appropriate permissions

### Timelog Ownership and Timesheet Foundation

Timelogs are owned by the employee who creates them. Employees can only create timelogs for their own work, ensuring accurate attribution of time to the correct person.

**Employee Self-Tracking:**

- Each employee creates timelogs for their own activities only
- Employees cannot create timelogs on behalf of other employees
- The creating employee is permanently associated with each timelog
- This ownership model ensures accountability and accurate time tracking

**Timesheet Foundation:**

- Timelogs form the foundation for timesheet creation and approval workflows
- A timesheet is a collection of timelogs for a specific week (Monday to Sunday)
- When an employee creates a draft timesheet for a week, all their timelogs for that week are automatically included
- Employees can add or remove timelogs from a draft timesheet before submission
- Once a timesheet is approved, all included timelogs become locked and cannot be edited or deleted
- Timelogs not included in any timesheet remain editable by the employee
- Timelogs included in submitted or approved timesheets cannot be deleted

**Timelog Filtering:**

- Timelogs can be filtered by date range to view entries within specific periods
- Timelogs can be filtered by project to see all time logged against a particular project
- Timelogs can be filtered by task to view time spent on specific tasks
- Timelogs can be filtered by billable status to separate billable from non-billable time
- These filtering capabilities support reporting and analysis of time data

**Data Isolation:**

- All timelogs are strictly isolated per organization
- Employees can only see timelogs within their current organization context
- Users belonging to multiple organizations only see timelogs for their selected organization
- This ensures complete data separation between organizations

## Timesheet Concept

A Timesheet represents a weekly collection of timelogs submitted for approval. Each timesheet covers a specific week from Monday to Sunday. The timesheet belongs to a specific employee who owns and submits it. Week start date marks Monday of the reporting week. Week end date marks Sunday of the reporting week. Timesheet status can be draft, submitted, approved, or rejected. Total hours are calculated from all timelogs included in the timesheet. Submitted at timestamp records when the employee submitted for approval. Reviewed at timestamp captures when approval or rejection occurred. Reviewed by field identifies which user approved or rejected the timesheet. Rejection reason text is required when a timesheet is rejected. Timesheets can be filtered by status and date range for management review. Timesheets enable structured time approval workflows.

### Timesheet Definition

A Timesheet represents a weekly collection of timelogs submitted for approval. Each timesheet covers a specific week from Monday to Sunday. The timesheet belongs to a specific employee who owns and submits it. A timesheet enables structured time approval workflows within the organization. Each timesheet is associated with one employee and cannot be shared across multiple employees.

### Timesheet Week Structure

Each timesheet covers a fixed week period starting on Monday and ending on Sunday. The week start date marks Monday of the reporting week. The week end date marks Sunday of the reporting week. The week boundaries are fixed and cannot be customized by users. Each timesheet represents exactly one week period.

### Timesheet Status States

Timesheets have four possible status states: draft, submitted, approved, and rejected. A timesheet begins in draft status when initially created. A draft timesheet can be modified by the employee. A submitted timesheet is awaiting approval from an authorized reviewer. An approved timesheet is locked and cannot be modified. A rejected timesheet returns to draft status and can be modified and resubmitted by the employee.

### Timesheet Hour Calculations

Total hours for a timesheet are calculated from all timelogs included in the timesheet. The total hours value is automatically computed and cannot be manually edited. The calculation sums the duration of all timelogs associated with the timesheet. Changes to included timelogs automatically update the total hours value.

### Timesheet Submission Tracking

When a timesheet is submitted for approval, the submission timestamp is recorded. The submission timestamp captures when the employee submitted the timesheet for review. This timestamp is immutable once the timesheet is submitted. The submission timestamp is used for audit and reporting purposes.

### Timesheet Review Tracking

When a timesheet is approved or rejected, the review timestamp is recorded. The review timestamp captures when the approval or rejection action occurred. The reviewer identification field identifies which user approved or rejected the timesheet. Review timestamp and reviewer identification are recorded only when the status changes from submitted to approved or rejected.

### Timesheet Rejection Handling

When a timesheet is rejected, a rejection reason text is required. The rejection reason must explain why the timesheet was not approved. The rejection reason is visible to the employee who submitted the timesheet. A rejected timesheet returns to draft status, allowing the employee to modify and resubmit.

### Timesheet Browsing

Timesheets can be filtered by status for management review. Timesheets can be filtered by date range to view specific periods. Employees can view their own timesheets. Users with appropriate permissions can view all timesheets in the organization.

## Timer Concept

A Timer represents a live time tracking session for real-time work monitoring. Each employee can have at most one active timer running at any time. The timer records a start timestamp marking when time tracking began. The timer is associated with a specific project that the employee is assigned to. An optional task field can link the timer to a specific task within the project. A description field allows employees to note what work is being performed. When stopped, the timer creates a timelog with the calculated duration rounded to the nearest minute. Employees can discard a timer without creating a timelog if the work should not be recorded. The timer continues running indefinitely if not stopped, with no automatic termination. Employees can edit the description and project or task assignment while the timer is running. The timer provides real-time visibility into current work activities.

### Timer Definition and Purpose

A Timer represents a live time tracking session for real-time work monitoring within the organization. The timer provides employees with the ability to track work time as it happens, offering real-time visibility into current work activities. Unlike timelogs which record completed work after the fact, the timer captures time in real-time as work is being performed. The timer is designed to simplify time tracking by automatically calculating duration when stopped, reducing manual entry errors and improving accuracy of time records.

### Single Active Timer Constraint

Each employee can have at most one active timer running at any time. This constraint ensures that employees focus on one work activity at a time and prevents duplicate or overlapping time entries. When an employee attempts to start a new timer while one is already running, the system prevents the action. This single timer rule applies across all projects and tasks within the organization, ensuring clear attribution of time to specific work activities.

### Timer Attributes and Configuration

A timer records a start timestamp marking when time tracking began. The timer is associated with a specific project that the employee is assigned to, and project association is required when starting a timer. An optional task field can link the timer to a specific task within the selected project, allowing for more granular time tracking. A description field allows employees to note what work is being performed during the timer session. These attributes are captured when the timer is started and can be modified while the timer is running.

### Timer Lifecycle and Outcomes

When stopped, the timer creates a timelog with the calculated duration rounded to the nearest minute. Employees can discard a timer without creating a timelog if the work should not be recorded, providing flexibility for situations where time tracking was started but should not be saved. The timer continues running indefinitely if not stopped, with no automatic termination or timeout mechanism. Employees can edit the description and project or task assignment while the timer is running, allowing corrections and updates to work context without stopping the timer.

## ActivityLog Concept

An ActivityLog represents a system record of significant actions performed within the organization. Each activity log entry captures the timestamp when the action occurred. The entry identifies which user performed the action for accountability. Action type categorizes the kind of action that was performed. Target entity specifies what object or resource was affected by the action. Details field provides additional context about the action performed. Logged actions include employee invitations, deactivations, and reactivations. Contract creation and edits are recorded in the activity log. Project lifecycle events such as creation, archiving, completion, and deletion are tracked. Task status changes are logged with full details. Timesheet submissions, approvals, and rejections are recorded. Role assignments and changes are captured for audit purposes. The activity log is paginated for efficient browsing. The activity log can be filtered by action type, user, and date range. Activity logs support compliance and audit requirements.

### Activity Log Entry Structure

An ActivityLog entry represents a single recorded action within the organization. Each entry captures the timestamp when the action occurred, enabling chronological tracking of organizational activities. The entry identifies the user who performed the action for accountability and audit purposes. Action type categorizes the kind of action that was performed, allowing classification of different activity categories. Target entity specifies what object or resource was affected by the action, providing context about what changed. The details field provides additional context about the action performed, capturing specific information relevant to that action type. Activity log entries are immutable once created, ensuring an accurate historical record. Each activity log entry belongs to an organization and is isolated from other organizations.

### Logged Action Categories

Employee lifecycle actions are recorded in the activity log, including employee invitations, deactivations, and reactivations. Contract creation and edits are logged to maintain an audit trail of employment terms changes. Project lifecycle events such as creation, archiving, completion, and deletion are tracked in the activity log. Task status changes are logged with full details including the previous and new status. Timesheet submissions, approvals, and rejections are recorded to provide visibility into the approval workflow. Role assignments and changes are captured for audit purposes, tracking when employees are assigned or reassigned roles. The activity log supports filtering by action type to focus on specific categories of events. Users can filter the activity log by the user who performed the action. Date range filtering allows users to view activity logs within specific time periods. The activity log serves compliance and audit requirements by maintaining a complete record of significant organizational actions.

# Domain Relationships

Describe how concepts relate to each other from a business perspective.

## Conceptual Relationships

Describe how concepts relate to each other in business terms.

### Organization Ownership Relationships

An organization owns all employees, projects, departments, and roles within it. When an organization is deleted, all employees, projects, tasks, timelogs, and timesheets associated with it are permanently deleted. Each organization operates independently with its own data isolation — employees in one organization cannot see data from another organization. A user can belong to multiple organizations but only sees data for their currently selected organization context. The organization owner has full control over all organizational data and can manage organization settings including name, description, logo, currency, timezone, and fiscal start month.

### User and Employee Association

A user account can belong to multiple organizations. When a user belongs to an organization, they have an employee record in that organization with a specific role, department, position, and employment type. The employee record references the user account and maintains organization-specific information. When a user deletes their account, their employee records in other organizations are marked as deactivated but preserved. Users with employee:manage permission can invite new employees by email — if the email has an existing account, the user is added to the organization; if not, a pending invitation is created until the user signs up.

### Project and Task Hierarchy

A project belongs to an organization and can have multiple tasks within it. Each task belongs to exactly one project and can have one parent task for subtask nesting (one level only). Projects can have multiple project members, where each project member links an employee to a project with an assigned role (member or project-lead). An employee can be assigned to multiple projects. Project leads can manage tasks within their project. Tasks can be assigned to employees who are project members. When a project is archived or completed, it cannot receive new timelogs but existing timelogs are preserved.

### Time Tracking Associations

A timelog belongs to a project and optionally to a task within that project. Timelogs are created by employees and can only reference projects the employee is assigned to. A timesheet belongs to an employee and contains multiple timelogs for a specific week (Monday to Sunday). A timesheet cannot include timelogs from outside its week range. When a timesheet is approved, all included timelogs are locked and cannot be edited or deleted. A timer belongs to an employee and tracks live time for a project (and optionally a task). Each employee can have at most one active timer at a time. Stopping a timer creates a timelog with the calculated duration.

### Employee Contract Relationships

An employee can have multiple contracts throughout their employment history. Only one contract can be active at a time. Each contract belongs to an employee and contains start date, end date (optional for ongoing), pay rate, pay period, working hours per week, and notes. When a new contract is created, it automatically ends the previous active contract by setting its end date to the day before the new contract starts. Past contracts are immutable historical records and cannot be edited. Employees can view their own contracts, and users with employee:view permission can view any employee's contracts.

## Lifecycle and Retention

Describe concept lifecycle states and transitions only. Detailed retention/recovery policies belong in 05-non-functional. Operation details belong in 03-functional-requirements.

### Organization Lifecycle

An organization is created when a user signs up and provides organization details including name, description, logo image, currency, timezone, and fiscal start month.

An organization can be deleted by its owner only when all pending timesheets are resolved (approved or rejected) and there are no active employee contracts.

When an organization is deleted, all associated data is permanently removed including employees, projects, tasks, timelogs, timesheets, departments, roles, and activity logs. The organization owner's user account remains but is no longer associated with any organization.

Organizations do not support recovery after deletion. Once deleted, all data is permanently lost.

### User Account Lifecycle

A user account is created when a user signs up with email and password. The account exists globally across the platform.

A user can belong to multiple organizations simultaneously. When logging in, the user selects which organization to work in, and all actions are scoped to that organization.

A user can delete their account. If the user is the sole owner of an organization, they must either transfer ownership to another employee or delete the organization before account deletion can proceed.

When a user account is deleted, their employee records in other organizations are marked as deactivated. Historical data associated with those employee records (timelogs, timesheets) is preserved.

User accounts do not support recovery after deletion.

### Employee Lifecycle

An employee record is created when a user is invited to or joins an organization. The employee is assigned a role and may have optional department, position, and employment type information.

An employee has a status that can be either active or deactivated. Active employees can log time and submit timesheets. Deactivated employees cannot log time or submit timesheets.

When an employee is deactivated, their historical data including timelogs and timesheets is preserved. Deactivated employees can be reactivated by users with employee management permissions.

Employee records are not deleted when the associated user account is deleted. Instead, they are marked as deactivated.

Employees cannot be recovered after their organization is deleted, as all organization data is permanently removed.

### Employee Contract Lifecycle

An employee can have multiple contracts over time, representing different employment periods or terms. Each contract has a start date, optional end date, pay rate, pay period, and working hours per week.

Only one contract can be active at a time for an employee. When a new contract is created, the previous active contract is automatically ended by setting its end date to the day before the new contract starts.

Active contracts can be edited by users with employee management permissions. Past contracts (those with an end date in the past) are immutable and cannot be modified.

Contracts are preserved as historical records even after they end. They remain viewable by employees and users with employee view permissions.

Contracts are permanently deleted when their associated organization is deleted.

### Project Lifecycle

A project is created by users with project management permissions. Projects have a name, optional description, color code, status, optional budget hours, and optional start and end dates.

A project has a status that can be active, archived, or completed. Active projects can receive new timelogs. Archived or completed projects cannot receive new timelogs, but existing timelogs are preserved.

Projects can be archived or completed by users with project management permissions. This is typically done when the project work is finished or put on hold.

A project can be deleted only if it has no timelogs associated with it. Projects with existing timelogs cannot be deleted to preserve time tracking history.

Projects do not support recovery after deletion. Once deleted, the project and all associated tasks and project memberships are permanently removed.

### Task Lifecycle

A task is created within a project by project leads or users with project management permissions. Tasks have a title, optional description, status, priority, optional estimated hours, optional due date, optional assigned employee, and optional parent task for subtasks.

A task has a status that can be open, in-progress, completed, or closed. Status changes are recorded in task history with timestamp, old status, new status, and who made the change.

Tasks can be edited by project leads within their project or by users with project management permissions.

When a project is archived or completed, its tasks remain viewable but cannot receive new timelogs.

Tasks are deleted when their parent project is deleted, provided the project has no timelogs and meets deletion criteria.

### Timelog Lifecycle

A timelog is created by an employee to record time spent on a project or task. Timelogs have a date, duration in minutes, optional project, optional task, optional description, and billable flag.

Timelogs can exist in three states: standalone, included in a draft timesheet, or included in a submitted/approved timesheet.

Employees can edit their own timelogs only if the timelog is not part of an approved timesheet. Timelogs in approved timesheets are locked and cannot be modified.

Employees can delete their own timelogs only if the timelog is not part of any submitted or approved timesheet. Users with time management permissions can edit or delete any employee's timelogs.

When a timesheet is approved, all included timelogs are locked. If a timesheet is rejected and returns to draft status, the timelogs become editable again.

Timelogs are permanently deleted when their organization is deleted.

### Timesheet Lifecycle

A timesheet is a collection of timelogs for a specific week (Monday to Sunday). Each timesheet belongs to one employee and covers one week period.

A timesheet has a status that can be draft, submitted, approved, or rejected. Draft timesheets can be modified by the employee. Submitted timesheets await approval. Approved timesheets are locked. Rejected timesheets return to draft status.

Employees can create a draft timesheet for a specific week. Creating a draft automatically includes all timelogs for that employee in that week.

Employees can submit a draft timesheet for approval. A timesheet cannot be submitted if it has no timelogs or if another timesheet for the same week is already submitted or approved.

Users with time approval permissions can approve or reject submitted timesheets. Approved timesheets lock all included timelogs. Rejected timesheets return to draft status and can be modified and resubmitted by the employee.

Timesheets are permanently deleted when their organization is deleted.

### Timer Lifecycle

A timer is a live time tracking session started by an employee. Each employee can have at most one active timer at a time.

Starting a timer requires selecting a project. Task selection is optional. The timer records the start timestamp, project, optional task, and optional description.

Employees can stop their timer, which creates a timelog with the calculated duration rounded to the nearest minute. The timer session ends when stopped.

Employees can discard their timer without creating a timelog. The timer session ends when discarded.

Employees can edit the description and project or task of a running timer before stopping it.

If an employee forgets to stop their timer, it continues running indefinitely. The system does not automatically stop timers.

Timers are not persisted after being stopped or discarded. Only the resulting timelog (if created) is stored.

### Department Lifecycle

A department is created by users with organization management permissions. Departments have a name, description, and optional parent department for one level of nesting.

Departments can be edited by users with organization management permissions.

Departments can be deleted by users with organization management permissions. When a department is deleted, employees assigned to that department have their department set to null. The employees themselves are not deleted.

Departments do not support recovery after deletion. Once deleted, the department record is permanently removed.

### Role Lifecycle

A role is created by organization owners. Each role has a name and a set of permissions. Three built-in roles (Owner, Manager, Employee) cannot be deleted.

Custom roles can be edited by organization owners to change the name or permissions.

Custom roles can be deleted by organization owners only if no employees are currently assigned to that role. Roles with assigned employees cannot be deleted.

Role assignments can be changed by users with employee management permissions. When an employee's role is changed, they immediately gain or lose permissions based on the new role.

Roles are permanently deleted when their organization is deleted.

### Activity Log Lifecycle

Activity log entries are automatically created by the system when significant actions occur. Each entry records the timestamp, user who performed the action, action type, target entity, and details.

Logged actions include employee invitations and status changes, contract creation and edits, project lifecycle changes, task status changes, timesheet submissions and approvals, and role assignments.

Activity log entries are immutable once created. They cannot be edited or deleted by users.

Activity log entries are permanently deleted when their organization is deleted.

The activity log serves as an audit trail for organization activities and is viewable by users with organization management permissions.

# Business Categories and State Flows

Business category classifications and state flow definitions.

## Business Category Definitions

Define all business category classifications with their allowed values and descriptions.

### Business Category Classifications

The system uses business category classifications to standardize how entities are categorized and tracked. Each classification represents a specific business concept with a defined set of allowed values. These classifications ensure consistent data entry and reporting across the organization.

Classifications are used to categorize:
- Employee employment arrangements
- Employee organizational status
- Project lifecycle stages
- Task workflow states
- Task urgency levels
- Compensation payment periods
- Timesheet approval workflow states
- Project team member roles
- Time entry billing status

Each classification has a fixed set of allowed values that cannot be modified by users. These values are predefined by the system to maintain data integrity and enable accurate reporting.

### Employee Employment Type Classification

The employment type classification defines the nature of an employee's relationship with the organization.

Allowed values:
- **Full-time**: Standard full-time employment with regular working hours
- **Part-time**: Reduced working hours compared to full-time
- **Contractor**: External contractor engaged for specific work
- **Intern**: Temporary position for training and learning purposes

This classification is used to categorize employees for reporting and organizational purposes. The employment type does not affect the employee's ability to track time or submit timesheets, but it may be used in reports to analyze workforce composition.

### Employee Status Classification

The employee status classification defines an employee's current organizational standing.

Allowed values:
- **Active**: Employee is currently working and can log time, submit timesheets, and access all assigned features
- **Deactivated**: Employee is no longer active in the organization but historical data is preserved

When an employee is deactivated, they cannot create new timelogs or submit timesheets. However, all historical timelogs, timesheets, and contracts remain intact for reporting and audit purposes. Deactivated employees can be reactivated by users with appropriate permissions.

### Project Status Classification

The project status classification defines the current lifecycle stage of a project.

Allowed values:
- **Active**: Project is ongoing and can receive new timelogs, tasks, and team assignments
- **Archived**: Project is no longer active but preserved for historical reference; cannot receive new timelogs
- **Completed**: Project has finished all planned work; cannot receive new timelogs but remains accessible for reporting

When a project is archived or completed, existing timelogs and tasks are preserved but no new time entries can be associated with the project. This classification helps organizations manage their portfolio of work initiatives.

### Task Status Classification

The task status classification defines the workflow state of a task within a project.

Allowed values:
- **Open**: Task has been created but work has not yet begun
- **In-progress**: Task is currently being worked on
- **Completed**: Task work has been finished and is ready for review
- **Closed**: Task is finalized and no longer requires attention

Task status changes are recorded in the task history to provide an audit trail of workflow progression. This classification enables project leads to track task progress and manage work allocation.

### Task Priority Classification

The task priority classification defines the urgency level of a task.

Allowed values:
- **Low**: Task can be addressed when time permits
- **Medium**: Task should be addressed according to normal workflow
- **High**: Task requires attention soon and should be prioritized
- **Urgent**: Task requires immediate attention and highest priority

This classification helps employees and project leads understand which tasks require immediate attention versus those that can be scheduled for later. Priority levels assist in workload planning and resource allocation.

### Pay Period Classification

The pay period classification defines how an employee's compensation is calculated.

Allowed values:
- **Hourly**: Compensation is calculated based on hours worked
- **Daily**: Compensation is calculated based on days worked
- **Weekly**: Compensation is calculated on a weekly basis
- **Monthly**: Compensation is calculated on a monthly basis

This classification is used in employee contracts to determine how pay rates are applied. The pay period type affects how time tracking data is interpreted for payroll purposes.

### Timesheet Status Classification

The timesheet status classification defines the approval workflow state of a timesheet.

Allowed values:
- **Draft**: Timesheet is being prepared and can be modified by the employee
- **Submitted**: Timesheet has been submitted for approval and cannot be modified by the employee
- **Approved**: Timesheet has been approved by an authorized user; all included timelogs are locked
- **Rejected**: Timesheet has been rejected and returned to draft status for modification

This classification manages the timesheet approval workflow. Only users with appropriate permissions can approve or reject submitted timesheets. Rejected timesheets can be modified and resubmitted by the employee.

### Project Member Role Classification

The project member role classification defines an employee's role within a specific project.

Allowed values:
- **Member**: Standard project team member with access to project tasks and time tracking
- **Project-lead**: Project lead with additional permissions to manage tasks within the project

This classification determines what actions an employee can perform within a project. Project leads can create and edit tasks, while members can only view and work on assigned tasks. An employee can have different roles across different projects.

### Billable Status Classification

The billable status classification defines whether a time entry can be charged to a client.

Allowed values:
- **Billable (true)**: Time entry can be included in client billing
- **Non-billable (false)**: Time entry is for internal work and cannot be billed

This classification is used in timelogs to distinguish between client-billable work and internal activities. The default value for new timelogs is billable. Reports can filter and group time entries by billable status to calculate billable versus non-billable hours.

## State Transitions

Define valid state transition paths for stateful concepts.

### Employee Status Transitions

Employees in an organization have a status that indicates their current employment state.

**Active Status**
- New employees are created with active status by default
- Active employees can log time, submit timesheets, and access all features based on their role
- Active employees can be assigned to projects and tasks

**Deactivated Status**
- Users with employee:manage permission can deactivate employees
- Deactivated employees cannot log time or submit timesheets
- Deactivated employees' historical data (timelogs, timesheets) is preserved
- Deactivated employees can be reactivated by users with employee:manage permission
- Reactivation restores the employee's ability to log time and submit timesheets

**State Flow**
```
mermaid
flowchart LR
    A["active"] -->|"Deactivate"| B["deactivated"]
    B -->|"Reactivate"| A
```

**Business Rules**
- Deactivation does not delete employee records or historical data
- A deactivated employee can be reactivated at any time
- The employee's role, department, and position are preserved during deactivation

### Project Status Transitions

Projects have a status that indicates their current lifecycle state.

**Active Status**
- New projects are created with active status by default
- Active projects can receive new timelogs
- Active projects can have tasks created and modified
- Active projects can have employees assigned as project members

**Archived Status**
- Users with project:manage permission can archive active projects
- Archived projects cannot receive new timelogs
- Existing timelogs on archived projects are preserved
- Archived projects can be viewed but not modified

**Completed Status**
- Users with project:manage permission can mark active projects as completed
- Completed projects cannot receive new timelogs
- Existing timelogs on completed projects are preserved
- Completed projects can be viewed but not modified

**State Flow**
```
mermaid
flowchart LR
    A["active"] -->|"Archive"| B["archived"]
    A -->|"Complete"| C["completed"]
```

**Business Rules**
- Projects can only transition from active to archived or completed
- Archived and completed projects are final states with no further transitions
- Timelogs on archived or completed projects remain accessible for reporting

### Task Status Transitions

Tasks have a status that tracks their progress through the work lifecycle.

**Open Status**
- New tasks are created with open status by default
- Open tasks are available to be worked on
- Open tasks can be assigned to employees who are project members

**In-Progress Status**
- Project leads or users with project:manage permission can change task status to in-progress
- In-progress tasks indicate active work is being performed
- Employees can log time against in-progress tasks

**Completed Status**
- Project leads or users with project:manage permission can mark tasks as completed
- Completed tasks indicate the work has been finished
- Completed tasks can still have time logged against them

**Closed Status**
- Project leads or users with project:manage permission can close completed tasks
- Closed tasks are final and cannot be reopened
- Closed tasks preserve all historical data including timelogs

**State Flow**
```
mermaid
flowchart LR
    A["open"] -->|"Start Work"| B["in-progress"]
    B -->|"Finish Work"| C["completed"]
    C -->|"Close"| D["closed"]
    A -->|"Complete Directly"| C
```

**Business Rules**
- Task status changes are recorded in task history with timestamp, old status, new status, and who made the change
- Tasks can transition from open to in-progress, or directly from open to completed
- Tasks can only be closed after reaching completed status
- Once a task is closed, no further status changes are allowed

### Timesheet Status Transitions

Timesheets have a status that tracks their approval workflow.

**Draft Status**
- New timesheets are created with draft status by default
- Draft timesheets automatically include all timelogs for the employee in that week
- Employees can add or remove timelogs from draft timesheets
- Draft timesheets can be modified freely by the employee

**Submitted Status**
- Employees can submit draft timesheets for approval
- A timesheet cannot be submitted if it has no timelogs
- A timesheet cannot be submitted if another timesheet for the same week is already submitted or approved
- Once submitted, timelogs in the timesheet cannot be edited or deleted by the employee
- Users with time:approve permission can view submitted timesheets

**Approved Status**
- Users with time:approve permission can approve submitted timesheets
- Approved timesheets lock all included timelogs (cannot be edited or deleted)
- Approved timesheets are final and cannot be modified
- The approval timestamp and approver are recorded

**Rejected Status**
- Users with time:approve permission can reject submitted timesheets with a required reason
- Rejected timesheets return to draft status
- The rejection reason is recorded for the employee to review
- Employees can modify and resubmit rejected timesheets

**State Flow**
```
mermaid
flowchart LR
    A["draft"] -->|"Submit"| B["submitted"]
    B -->|"Approve"| C["approved"]
    B -->|"Reject"| A
```

**Business Rules**
- Timesheets follow a weekly cycle (Monday to Sunday)
- Only one timesheet per employee per week can be in submitted or approved status
- Rejected timesheets can be resubmitted after modifications
- Approved timesheets are immutable and serve as the official record

### Timer State Transitions

Timers represent live time tracking sessions and have two states.

**Inactive State**
- No timer is running for the employee
- Employees can start a timer by selecting a project (task is optional)
- Only one active timer is allowed per employee at a time

**Active State**
- Timer is running and recording time in real-time
- The timer records start timestamp, project, task, and description
- Employees can edit the description and project/task of a running timer
- Employees can stop their timer at any time
- Employees can discard their timer without creating a timelog

**Stopping the Timer**
- Stopping the timer creates a timelog with the calculated duration
- Duration is rounded to the nearest minute
- The timelog is associated with the selected project and optional task

**Discarding the Timer**
- Discarding the timer does not create a timelog
- No time is recorded for the session
- The timer returns to inactive state

**State Flow**
```
mermaid
flowchart LR
    A["inactive"] -->|"Start Timer"| B["active"]
    B -->|"Stop Timer"| A
    B -->|"Discard Timer"| A
```

**Business Rules**
- If an employee forgets to stop their timer, it continues running indefinitely
- No automatic stop mechanism exists for running timers
- Only one timer can be active per employee at any given time
- Starting a new timer while one is active is not allowed