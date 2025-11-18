# Minimal Todo App – Core Requirements Summary

## 1. Goal of the Todo App

The todoApp is a simple task management service. It should let users:
- Add tasks they want to remember
- See their own tasks
- Edit them
- Mark them as done or not done
- Delete them

Only the minimum necessary features are required for a useful Todo list.


## 2. What a "Todo" Is

A **todo item** is a single task that a person wants to do.

Each todo has, at a business level:
- **Title**: short text describing the task (must not be empty).
- **Description (optional)**: more detail about the task.
- **Status**: either "not completed" or "completed".
- **Creation time**: when the todo was created.
- **Last updated time**: when it was last changed.
- **Completion time (optional)**: only present when the todo is completed.
- **Owner**: the user who the todo belongs to.

Todo items are **private** to their owner in this minimal version.


## 3. User Types and Access

There are three kinds of users, from the business perspective:

- **guestUser**
  - Not logged in.
  - Cannot see or manage any todo items.

- **memberUser**
  - Logged-in regular user.
  - Can manage **only their own** todos.

- **adminUser**
  - Administrative user.
  - Can see and manage todos of any memberUser, but only for operational/support/legal reasons.

Key access rules (EARS style):
- THE system SHALL require a user to be authenticated as memberUser or adminUser for any todo operation (create, read, list, update, complete, reopen, delete).
- WHEN a guestUser attempts any todo operation, THE system SHALL block the operation and SHALL not expose any todo data.
- WHEN a memberUser targets a specific todo, THE system SHALL verify that the todo belongs to that memberUser.
- IF a memberUser targets a todo that is not theirs, THEN THE system SHALL reject the operation and SHALL not reveal whether that todo exists.
- WHEN an adminUser performs a todo operation, THE system SHALL allow operations on any memberUser’s todos within admin policies.


## 4. Creating Todos

### 4.1 Business Flow

- A logged-in memberUser creates a new todo by providing a valid title and optionally a description.
- The todo is assigned to that user as the owner.
- The status is set to "not completed".
- Creation time and last updated time are recorded.
- Completion time is **not** set at creation.

Admins can also create todos on behalf of a memberUser.

### 4.2 Key Rules (EARS)

- WHEN a memberUser creates a todo with a valid title, THE system SHALL create a new todo owned by that memberUser.
- WHEN an adminUser creates a todo on behalf of a memberUser, THE system SHALL assign ownership to that specified memberUser.
- THE system SHALL set new todos to status "not completed".
- THE system SHALL set creation time and last updated time to the creation moment.
- THE system SHALL leave completion time unset on creation.
- THE system SHALL allow multiple todos with the same title or description for the same user.
- IF any creation input breaks validation rules (e.g., title too long/empty), THEN THE system SHALL reject the creation and SHALL not create the todo.


## 5. Reading and Listing Todos

### 5.1 Reading a Single Todo

- A memberUser may request to see one of their todos.
- The system checks ownership and returns details only if they own it.
- If they do not own it, the system behaves as if it is not accessible.
- An adminUser may read any todo.

EARS examples:
- WHEN a memberUser reads a todo by its id, THE system SHALL return it only if the todo belongs to that memberUser.
- IF a memberUser reads a todo that is not theirs, THEN THE system SHALL respond as if it is not accessible and SHALL not reveal its existence.
- WHEN an adminUser reads a todo by id, THE system SHALL return it regardless of ownership within admin policies.

### 5.2 Listing Todos

Member users:
- See lists containing **only their own** todos.
- Can optionally filter by status (completed / not completed).
- Lists may be paginated so only a limited number of todos appear at once.
- Ordering is predictable (e.g., most recently created or updated first) as defined in rules.

Admin users:
- Can list todos for a specific memberUser.
- May list todos matching certain admin/business criteria.

EARS examples:
- WHEN a memberUser lists todos, THE system SHALL return only todos owned by that memberUser.
- WHERE a memberUser asks to list only "not completed" todos, THE system SHALL return only todos whose status is "not completed".
- WHERE a memberUser asks to list only "completed" todos, THE system SHALL return only todos whose status is "completed".
- WHERE there are more todos than the configured page size, THE system SHALL return the list in portions that do not exceed this size.


## 6. Updating Todos

### 6.1 What Can Be Updated

From a business perspective:
- Owner can change:
  - Title (subject to validation)
  - Description (subject to validation)
- Owner **cannot** change:
  - Owner of the todo
  - Creation time
  - Completion time directly (handled via complete/reopen actions)

Admins can update any todo’s editable fields when needed.

### 6.2 Key Rules (EARS)

- THE system SHALL allow the owner memberUser to update title and description of their todos, within validation rules.
- THE system SHALL forbid general updates from changing ownership, creation time, or completion time directly.
- WHEN a memberUser tries to update a todo, THE system SHALL first verify that the todo belongs to that memberUser.
- IF the todo is not theirs, THEN THE system SHALL reject the update and SHALL not disclose any information about it.
- WHEN an adminUser updates a todo, THE system SHALL allow the update regardless of ownership within admin policies.
- WHEN a permitted update changes any field, THE system SHALL update the todo’s last updated time to the update moment.
- IF any updated value fails validation, THEN THE system SHALL reject the entire update and SHALL not apply partial changes.


## 7. Completing and Reopening Todos

### 7.1 Concepts

- "Complete" means changing a todo from "not completed" to "completed".
- "Reopen" means changing a todo from "completed" back to "not completed".

Only the owner (or an admin) may do this.

### 7.2 Complete Todo (EARS)

- WHEN a memberUser completes a "not completed" todo they own, THE system SHALL set its status to "completed" and SHALL set completion time to the operation time.
- WHEN an adminUser completes a "not completed" todo, THE system SHALL update status and completion time similarly.
- IF a memberUser attempts to complete a todo they do not own, THEN THE system SHALL reject the operation and SHALL not reveal anything about that todo.

### 7.3 Reopen Todo (EARS)

- WHEN a memberUser reopens a "completed" todo they own, THE system SHALL set its status to "not completed" and SHALL clear the completion time.
- WHEN an adminUser reopens a completed todo, THE system SHALL perform the same status and completion time changes.
- IF a memberUser tries to reopen a todo they do not own, THEN THE system SHALL reject the operation and SHALL not reveal anything about that todo.

### 7.4 Idempotency

- WHILE a todo is already "completed", THE system SHALL treat repeated valid completion requests as no-op and keep it "completed".
- WHILE a todo is already "not completed", THE system SHALL treat repeated valid reopen requests as no-op and keep it "not completed".


## 8. Deleting Todos

### 8.1 Concept

- Deleting a todo means it no longer appears in normal lists and can no longer be read or updated.
- Whether it is physically erased or kept for audit is defined elsewhere, but for user behavior it is simply "gone".

### 8.2 Rules (EARS)

- WHEN a memberUser deletes a todo they own, THE system SHALL remove it from their normal reads and lists.
- WHEN an adminUser deletes a todo, THE system SHALL remove it from normal reads and lists for all users.
- IF a memberUser tries to delete a todo they do not own, THEN THE system SHALL reject the deletion and SHALL not reveal its existence.
- AFTER a todo is deleted, THE system SHALL ensure it does not appear in any normal lists.
- AFTER a todo is deleted, THE system SHALL treat direct read attempts as access to an item that is not accessible.


## 9. Cross-Cutting Rules

### 9.1 Ownership and Access

- THE system SHALL always enforce that memberUsers can only act on their own todos.
- IF any memberUser operation targets another user’s todo, THEN THE system SHALL reject it and SHALL not leak cross-user information.

### 9.2 Idempotency and Consistency

- WHILE operations are defined as idempotent (e.g., repeat completion of an already completed todo), THE system SHALL ensure repeated valid calls do not create conflicting business states.
- WHERE conflicting operations happen close together (e.g., complete vs delete), THE system SHALL resolve conflicts in a deterministic way so the final business state is clear.

### 9.3 Concurrency Perception

- WHILE multiple operations on the same todo are processed around the same time, THE system SHALL prevent users from seeing impossible or contradictory states (for example, a todo appearing both active and deleted).


## 10. Simplifications and Out-of-Scope Features

To keep the app minimal for the first version:

- Todos are **not shared or collaborative**. Each todo belongs to exactly one memberUser.
- No tags, labels, or categories.
- No priorities, reminders, or notifications.
- No recurring tasks.

More detailed rules about validation, error handling, performance, security, and data retention are handled in separate documents, but do not change the basic behavior described here.
