# Welcome to TodoApp

TodoApp is a private, secure, multi-user to-do application designed for individuals who need a personal task management system with strict data isolation. Unlike collaborative task tools, TodoApp operates on the principle that **each user's data is completely private and inaccessible to all others**, even within the same system instance. This document provides an overview of the system's scope, core features, and organizational structure for the development team.

## System Scope

TodoApp is a backend application serving a single-user-per-account model. Every user has a completely isolated data environment. There is no concept of shared tasks, team spaces, or user-to-user visibility. This is not a group productivity tool — it is a personal, private, and secure to-do manager with enterprise-grade data isolation.

The system serves one primary user group: **authenticated users** who create, manage, and track their own personal tasks. No guest accounts, no administrators, and no shared data exist within the system.

The scope includes:
- User account lifecycle (registration, login, password reset, account deletion)
- Profile management (display name edit)
- Todo lifecycle (creation, viewing, editing, completion, soft-deletion, restoration, permanent deletion)
- Edit history tracking
- Trash management
- Filtering and sorting of todo lists
- API-mediated data access with strict ownership validation

The system deliberately excludes:
- User-to-user interaction or visibility
- Shared folders or groups
- Public or semi-public tasks
- Commenting, tagging, or collaboration features
- Administrative dashboards or user management

## Key Features

### User Account Management
Users can register, log in, change their password, and permanently delete their account. All associated data — including todos, edit history, and trash contents — is irreversibly deleted upon account deletion.

### User Profile
Each user has a private display name. Users can change it at any time, but **no other user can view, search, or reference another user's display name**. Profile data is never exposed through any API endpoint or interface.

### Todo Creation
Users create todos with a required title, and optional description, start date, and due date. Todos default to an incomplete state. All fields respect ISO 8601 format for dates when provided.

### Todo Viewing
Users can retrieve paginated lists of their todos and view individual todos in full detail. Todos displayed in lists include: title, completion status, start date (if set), due date (if set), and creation timestamp.

### Todo Completion Toggle
Users can toggle todos between complete and incomplete states in a single atomic operation. No intermediate status exists. The original creation timestamp is preserved through all state changes.

### Todo Editing
Users can edit any field of their todos (title, description, start date, due date). Each edit triggers a new history entry, storing the old and new values for that field at that time. **Only the owner can edit a todo.**

### Edit History
Every edit made to a todo creates a chronological log entry recording:
- Timestamp of edit
- Changed field(s) and their prior value
- Changed field(s) and their new value

History entries are sorted from most recent to oldest. Users can view the full edit history of any of their todos.

### Todo Deletion
Deletion is soft; todos are moved to a private “trash” area and are no longer visible in the main list. Data retention is guaranteed with no auto-purge.

### Trash Management
The trash is a separate, paginated view accessible only to the authenticated user who deleted the todos. From trash, users may:
- Restore a todo to its original state in the main list
- Permanently delete the todo (and its entire edit history)

Permanent deletion from trash is irreversible and purges all history data.

### Filtering and Sorting
Users can filter their todo list by completion status: All, Complete, or Incomplete. They can sort by:
- Creation date (newest or oldest first)
- Start date (earliest or latest first; todos without start date appear last)
- Due date (earliest or latest first; todos without due date appear last)

Sorting and filtering can be combined. Default sort is creation date, newest first.

## User Privacy

Privacy is the foundational and non-negotiable principle of TodoApp.

**ALL** user data is owned exclusively by the user who created it. Data isolation is enforced:
- At the API layer: every request must include and validate a user ID; no data from another user is ever returned.
- At the database layer: all queries include a WHERE clause matching the authenticated user ID; no queries can bypass this filter.
- At the application layer: no shared caches, no user-identifiable metadata leaked in responses, no audit logs exposing cross-user information.

Users cannot view others' profiles. Users cannot view others' todos, in main list or trash. Users cannot view others' edit history. No export, import, or data-sharing features exist or will be added.

Fault tolerance and logging are designed to preserve privacy: error messages do not reveal existence or non-existence of another user's data. System diagnostics never expose user identifiers or data relationships across accounts.

## Document Organization

This document serves as the Table of Contents (ToC) for the TodoApp system documentation. All other documents reference this ToC and adhere to the structured documentation format.

The 10 associated requirement documents are: 

- [Service Overview](./01-service-overview.md) — Business justification and market positioning
- [User Actors](./02-user-actors.md) — Authentication, JWT, data isolation enforcement
- [User Profile](./03-user-profile.md) — Display name management and privacy constraints
- [Create Todo](./04-create-todo.md) — Input validation and default behavior
- [View Todo List](./05-view-todo-list.md) — Pagination, filtering, sorting, response structure
- [Toggle Todo](./06-toggle-todo.md) — Atomic state transition logic
- [Edit Todo](./07-edit-todo.md) — Change detection and history entry generation
- [Delete Todo](./08-delete-todo.md) — Soft-delete mechanics and visibility rules
- [Trash](./09-trash.md) — Restoration, purge, and history handling
- [Filters and Sort](./10-filters-and-sort.md) — Complex sorting behavior and edge cases

All documents are written with the assumption that developers have full autonomy in choosing architecture, API design, database schema, and implementation model — so long as business requirements and privacy guarantees are fully met.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*