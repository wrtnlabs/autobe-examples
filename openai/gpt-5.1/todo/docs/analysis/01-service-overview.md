# Minimal Todo Backend Requirements

## 1. Purpose and Vision

TodoApp is a minimal backend service that allows individual users to manage a simple personal list of todos. The purpose is to support only the essential capabilities required for basic task management: creating, viewing, updating, completing, reopening, and deleting personal todos. Everything else is intentionally excluded from the first version.

THE TodoApp backend service SHALL focus on simplicity, reliability, and privacy for single-user task lists, not on team collaboration or complex project management.

## 2. Actors

### 2.1 guestUser

A guestUser is an unauthenticated visitor.

- Cannot access any personal todo data.
- May only access non-sensitive information such as service status or public documentation, if such endpoints exist in the broader system.

EARS requirements:
- THE TodoApp backend service SHALL prevent a guestUser from viewing, creating, updating, completing, reopening, deleting, or searching any todo.

### 2.2 memberUser

A memberUser is an authenticated user who manages a personal todo list.

- Owns a private collection of todos.
- Expects todos to be stored reliably and visible only to themselves.

EARS requirements:
- THE TodoApp backend service SHALL allow a memberUser to manage only their own todos.
- THE TodoApp backend service SHALL prevent a memberUser from accessing any todo that belongs to another memberUser.

### 2.3 adminUser

An adminUser is responsible for system monitoring and exceptional maintenance.

- Monitors service health and system usage.
- May manage user accounts in exceptional cases according to separate policy documents.

EARS requirements:
- THE TodoApp backend service SHALL allow an adminUser to access system-level metrics and logs needed to operate the service.
- THE TodoApp backend service SHALL restrict an adminUser from casually reading memberUser todo contents except where explicitly allowed by separate business policies.

## 3. Scope and Goals

### 3.1 In-scope (Minimal Feature Set)

- Personal todo management for memberUser.
- Strict privacy: todos are never shared between users.
- Basic monitoring capabilities for adminUser.

EARS requirements:
- THE TodoApp backend service SHALL support core todo operations for a memberUser: create, view/list, update, mark as completed, reopen, and delete.
- THE TodoApp backend service SHALL ensure that each todo is owned by exactly one memberUser.

### 3.2 Out-of-scope for First Version

The following are explicitly excluded from the minimal implementation:

- Collaboration between users (shared lists, assigning todos to other users, comments between users).
- Complex project management (subtasks, Kanban boards, sprints, timelines, Gantt charts).
- Integrations with external tools (email, calendars, chat, storage).
- File attachments on todos.
- Advanced user analytics dashboards.
- Public or shareable links to todos.
- guestUser ability to create or manage todos.

EARS requirements:
- THE TodoApp backend service SHALL NOT implement cross-user sharing of todos in the initial version.
- THE TodoApp backend service SHALL NOT implement file uploads or attachments for todos in the initial version.

## 4. Core Todo Concept

A todo is a single, actionable task owned by one memberUser.

Each todo has at minimum:
- A short textual description that explains what needs to be done.
- A state indicating whether it is pending or completed.

Optional minimal attributes may include:
- A longer note for additional context.
- A simple date field (for example, a target or reminder date) without complex scheduling logic.

EARS requirements:
- THE TodoApp backend service SHALL represent each todo with a description and a state (pending or completed) at minimum.
- THE TodoApp backend service SHALL associate each todo with exactly one memberUser.

## 5. Functional Requirements by Feature

### 5.1 Creating Todos

WHEN a memberUser decides to remember a new task,
THE TodoApp backend service SHALL allow the memberUser to create a new todo with a non-empty textual description.

Functional rules:
- A valid todo creation requires at least a non-empty description.
- The initial state of a newly created todo is pending.
- The todo is linked to the memberUser who created it.

EARS requirements:
- WHEN a memberUser submits a request to create a todo with a valid description, THE TodoApp backend service SHALL create a new pending todo linked to that memberUser.
- IF a memberUser submits a request to create a todo without a valid description (for example, missing or blank), THEN THE TodoApp backend service SHALL reject the request and SHALL indicate that a description is required.
- IF a guestUser attempts to create a todo, THEN THE TodoApp backend service SHALL reject the request and SHALL indicate that authentication is required.

### 5.2 Viewing Todos (List and Detail)

A memberUser must be able to see their todos to decide what to work on.

Functional rules:
- A memberUser can request a list of their own todos.
- The response includes, for each todo, at least its description and current state.
- The list may include both pending and completed todos.
- The system applies a simple, deterministic ordering (for example, by creation time or last update); the specific rule is defined in detailed design but must be consistent.

EARS requirements:
- WHEN a memberUser requests their todo list, THE TodoApp backend service SHALL return only todos owned by that memberUser.
- WHEN a memberUser requests their todo list, THE TodoApp backend service SHALL include each todo’s description and current state.
- IF a memberUser attempts to access a specific todo by identifier that belongs to another memberUser, THEN THE TodoApp backend service SHALL deny access.
- IF a guestUser attempts to view any todo list or todo detail, THEN THE TodoApp backend service SHALL deny access and SHALL indicate that authentication is required.

### 5.3 Updating Todo Content

Member users may refine a todo’s description or optional fields.

Functional rules:
- A memberUser can update the description of a todo they own.
- A memberUser can update minimal optional fields such as a simple note or date.

EARS requirements:
- WHEN a memberUser submits a request to update one of their todos with valid data, THE TodoApp backend service SHALL apply the changes and SHALL keep the todo associated with the same memberUser.
- IF a memberUser attempts to update a todo that does not belong to them, THEN THE TodoApp backend service SHALL reject the update and SHALL indicate that the todo is not accessible.
- IF a memberUser submits invalid update data (for example, an empty description if description is required), THEN THE TodoApp backend service SHALL reject the update and SHALL indicate what is invalid.

### 5.4 Completing Todos

Completing todos represents finishing tasks.

Functional rules:
- A memberUser can mark their own pending todo as completed.
- Completing a todo changes its state but does not delete it.

EARS requirements:
- WHEN a memberUser marks one of their pending todos as completed, THE TodoApp backend service SHALL switch the todo’s state from pending to completed while keeping all other data unchanged.
- IF a memberUser attempts to mark a todo as completed that does not belong to them, THEN THE TodoApp backend service SHALL reject the operation.

### 5.5 Reopening Todos

Reopening supports corrections or additional work.

Functional rules:
- A memberUser can change a completed todo back to pending.

EARS requirements:
- WHEN a memberUser marks one of their completed todos as reopened, THE TodoApp backend service SHALL switch the todo’s state from completed to pending.
- IF a memberUser attempts to reopen a todo that does not belong to them, THEN THE TodoApp backend service SHALL reject the operation.

### 5.6 Deleting Todos

Deleting removes tasks that are no longer needed.

Functional rules:
- A memberUser can delete any of their own todos, whether pending or completed.
- A deleted todo is no longer returned in normal todo lists for that user.

EARS requirements:
- WHEN a memberUser requests deletion of one of their todos, THE TodoApp backend service SHALL remove that todo from subsequent normal todo listings for that memberUser.
- IF a memberUser attempts to delete a todo that does not belong to them, THEN THE TodoApp backend service SHALL reject the request.

### 5.7 Basic Filtering (Minimal)

Filtering is optional but may be included in a minimal way.

Functional rules:
- A memberUser can request to see only pending or only completed todos.

EARS requirements:
- WHERE state-based filtering is requested, THE TodoApp backend service SHALL return only todos matching the requested state and owned by that memberUser.
- IF a memberUser requests an unsupported filter or search option, THEN THE TodoApp backend service SHALL respond with an indication that the option is not available in the minimal version.

## 6. Permissions and Access Control

### 6.1 Ownership Rules

EARS requirements:
- THE TodoApp backend service SHALL treat the combination of memberUser identity and todo ownership as the primary access control for todo operations.
- THE TodoApp backend service SHALL ensure that no todo can be accessed or modified by a different memberUser than its owner.

### 6.2 Actor Capabilities Summary

- guestUser:
  - SHALL NOT be able to perform any todo operation.
- memberUser:
  - SHALL be able to create, view, update, complete, reopen, delete, and minimally filter their own todos.
  - SHALL NOT be able to see or modify any other user’s todos.
- adminUser:
  - SHALL be able to access system-level information and user account controls defined in separate documents.
  - SHALL NOT have general-purpose, everyday access to todo contents unless required by special policies.

## 7. Minimal Non-functional Requirements

These requirements define a basic level of service quality.

### 7.1 Performance

EARS requirements:
- UNDER normal load conditions, WHEN a memberUser performs a core todo operation (create, view, update, complete, reopen, delete), THE TodoApp backend service SHALL respond quickly enough that the user perceives the operation as immediate in common client applications.

### 7.2 Reliability

EARS requirements:
- THE TodoApp backend service SHALL make core todo operations available the vast majority of the time, with failures limited to rare exceptions.
- WHEN a failure occurs during a todo operation, THE TodoApp backend service SHALL avoid leaving todo data in an inconsistent state (for example, partially applied updates).

### 7.3 Security and Privacy (High-level)

EARS requirements:
- THE TodoApp backend service SHALL require authentication for any operation that reads or modifies todos.
- THE TodoApp backend service SHALL ensure that todo data for one memberUser is never exposed to another memberUser or guestUser.

### 7.4 Usability from Backend Perspective

EARS requirements:
- THE TodoApp backend service SHALL apply consistent validation and error-handling rules so that client applications can provide predictable user experiences.

## 8. Assumptions and Constraints

- A separate authentication mechanism exists that can reliably distinguish guestUser, memberUser, and adminUser.
- Frontend clients (such as web or mobile apps) will handle user interface and will rely on clear success and error responses from the backend.
- The minimal version favors clarity and simplicity over flexibility and customization.

EARS requirements:
- THE TodoApp backend service SHALL expose todo-related behaviors in a way that frontend clients can use to implement a simple, predictable todo experience.

## 9. Success Criteria (Business-level)

The minimal TodoApp is considered successful if:

- memberUser can reliably maintain a personal list of todos with the core operations defined above.
- Todos are never visible to other users without explicit business justification.
- System behavior is predictable and consistent for all core operations.

EARS requirements:
- THE TodoApp backend service SHALL support measurement of aggregate todo operations (such as counts of creations and completions) in a way that does not expose individual todo contents in analytics contexts.

## 10. Future Extensions (Informative, Not Required for First Version)

The following ideas are identified as potential future enhancements but are not required for the first minimal release:

- Labels or categories for todos.
- Reminders or notifications.
- Shared lists or team workspaces.
- Rich text descriptions or file attachments.

EARS requirements:
- THE TodoApp backend service SHALL maintain stable core behaviors for todo creation, viewing, updating, completing, reopening, and deleting so that any future extension does not break existing minimal functionality for current users.