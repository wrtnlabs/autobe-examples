# Minimal Todo Application – Requirements Analysis

## 1. Goal and Scope

The Todo application helps a single person keep track of tasks they need to remember or complete. The first version focuses only on the minimum features that make a Todo list actually usable, without any extra complexity.

In scope for this version:
- Managing a personal list of todo items for each signed-in user.
- Creating, viewing, updating, completing, reopening, deleting todos.
- Very simple filtering of the todo list (for example, only pending or only completed).

Explicitly out of scope for this version:
- Shared todo lists between users.
- Tags, categories, projects, or complex search.
- Reminders, notifications, or calendar integration.
- Sub-tasks, attachments, or comments.


## 2. Users and Access

There are three conceptual user types:

- **Guest user**: Not signed in.
- **Member user**: Signed-in normal user; owns a personal todo list.
- **Admin user**: Special user for operations/support.

High-level requirements:
- WHEN a user is not signed in (guest), THE system SHALL prevent that user from seeing or changing any todos.
- WHEN a user is signed in as a member, THE system SHALL allow that user to manage only their own todos.
- WHEN a user is signed in as a member, THE system SHALL prevent that user from accessing todos that belong to other users.
- WHEN a user is signed in as an admin, THE system SHALL allow that user to view and delete any user’s todos for operational or support reasons, but SHALL NOT treat the admin as the owner of those todos.

The details of how sign-in, passwords, or tokens work are implementation decisions, but the system must always know “who is this user?” for any todo operation.


## 3. Core Concept – Todo Item

A todo item represents a single task or reminder for one member user.

### 3.1 Business Attributes

Each todo item, from a business point of view, has at least these attributes:
- **Owner**: the member user who created it.
- **Main text**: a short description of what needs to be done (for example, “Buy milk”).
- **Completion state**: either pending or completed.
- **Created time**: when the todo was first created.
- **Last updated time**: when it was last changed.

Optional but allowed minimal attributes (if developers choose to support them in v1):
- **Due date**: a date by which the user plans to complete the todo.
- **Simple priority**: a simple indicator such as low / normal / high.

Business requirements for the concept:
- THE system SHALL associate each todo with exactly one member user as owner.
- THE system SHALL store human-readable main text for each todo.
- THE system SHALL represent completion state of each todo as pending or completed.
- THE system SHALL record creation time and last updated time for each todo.


### 3.2 Lifecycle

A todo moves through a simple lifecycle:
1. Created as pending.
2. Optionally updated multiple times.
3. Marked as completed.
4. Optionally reopened back to pending.
5. Optionally deleted.

Lifecycle requirement:
- THE system SHALL support transitions from creation to optional updates, completion, optional reopening, and deletion for each todo.


## 4. Functional Requirements by Operation

All requirements below assume that authentication has already identified the current user.

### 4.1 Creating Todos

Business description: A member user can add a new todo to their personal list by providing at least the main text.

Preconditions:
- WHEN the current user is a guest, THE system SHALL reject any attempt to create a todo.
- WHEN the current user is a member, THE system SHALL verify that mandatory fields for creation (at minimum, main text) are present and valid.

Successful creation:
- WHEN a member submits valid data to create a todo, THE system SHALL create a new todo owned by that member.
- WHEN a todo is created, THE system SHALL set its completion state to pending.
- WHEN a todo is created, THE system SHALL set its creation time to the current time.
- WHEN a todo is created, THE system SHALL set its last updated time to the same value as the creation time.
- WHEN a todo is created successfully, THE system SHALL make the new todo available in subsequent list and detail views for that owner.

Validation failures:
- WHEN a member submits todo creation data that violates defined rules (for example, empty text or text that is too long), THE system SHALL reject the creation and SHALL return a clear error that states which field is invalid in user-friendly wording.


### 4.2 Viewing Todo List

Business description: A member user needs to see a list of their todos to know what to do.

Requirements:
- WHEN a member requests their todo list, THE system SHALL return only todos owned by that member.
- WHEN a member requests their todo list without any filter, THE system SHALL include both pending and completed todos.
- WHEN a member has no todos, THE system SHALL return an empty list and SHALL clearly indicate that there are no todos yet.
- WHEN a member tries to view another user’s todo list, THE system SHALL reject the request as unauthorized and SHALL NOT reveal any details about that other user.
- WHEN a guest requests any todo list, THE system SHALL reject the request as unauthorized.


### 4.3 Viewing a Single Todo

Business description: A member user can open one todo to see all details.

Requirements:
- WHEN a member requests details of a todo they own, THE system SHALL return all business-relevant fields for that todo (text, completion state, timestamps, and any simple metadata such as due date or priority, if used).
- WHEN a member requests details of a todo that does not exist, THE system SHALL respond that the todo was not found.
- WHEN a member requests details of a todo that belongs to another user, THE system SHALL reject the request as unauthorized and SHALL NOT reveal whether the todo exists.
- WHEN a guest requests details of any todo, THE system SHALL reject the request as unauthorized.


### 4.4 Updating Todos

Business description: A member user may want to adjust a todo’s text or simple metadata while it is still relevant.

Updateable aspects (subject to detailed rules):
- Main text.
- Optional due date.
- Optional simple priority.

Ownership and authorization:
- IF a guest attempts to update any todo, THEN THE system SHALL reject the update as unauthorized.
- IF a member attempts to update a todo that they do not own, THEN THE system SHALL reject the update as unauthorized.
- IF an admin attempts to update the content or metadata of a member’s todo, THEN THE system SHALL reject the update in this minimal version (admins may only view or delete).

Successful update:
- WHEN a member submits valid changes to a todo they own, THE system SHALL apply those changes.
- WHEN a todo is successfully updated, THE system SHALL set its last updated time to the current time.
- WHEN a member submits an update that does not actually change any value, THE system SHALL still respond successfully and MAY keep or update the last updated time, as long as the chosen behavior is consistent and documented for developers and testers.

Validation failures:
- WHEN a member submits an update that violates any rule (for example, text is empty, due date is invalid), THE system SHALL reject the update and SHALL clearly describe the problem.


### 4.5 Completing Todos

Business description: Marking a todo as completed tells the system that the task is done.

Requirements:
- WHEN a member marks one of their pending todos as completed, THE system SHALL change the completion state from pending to completed.
- WHEN a todo is marked as completed, THE system SHALL record the time of completion, either as a dedicated field or within metadata.
- WHEN a member tries to mark a todo as completed that is already completed, THE system SHALL keep it completed and SHALL avoid creating duplicate completion records.
- IF a guest attempts to mark any todo as completed, THEN THE system SHALL reject the request as unauthorized.
- IF a member attempts to mark as completed a todo that they do not own, THEN THE system SHALL reject the request as unauthorized.


### 4.6 Reopening Completed Todos

Business description: Sometimes a completed task becomes relevant again, and the user wants to move it back to pending.

Requirements:
- WHEN a member reopens one of their completed todos, THE system SHALL change the completion state from completed back to pending.
- WHEN a todo is reopened, THE system SHALL handle any completion timestamp consistently (for example, keep it for history or clear it), according to an agreed rule.
- IF a guest attempts to reopen any todo, THEN THE system SHALL reject the request as unauthorized.
- IF a member attempts to reopen a todo that belongs to someone else, THEN THE system SHALL reject the request as unauthorized.
- IF a member attempts to reopen a todo that is already pending, THEN THE system SHALL not change the todo and SHALL respond in a way that indicates the todo is already pending.


### 4.7 Deleting Todos

Business description: Deleting removes a todo from the user’s active list.

Requirements:
- IF a guest attempts to delete any todo, THEN THE system SHALL reject the deletion as unauthorized.
- IF a member attempts to delete a todo they do not own, THEN THE system SHALL reject the deletion as unauthorized.
- WHEN a member deletes one of their todos, THE system SHALL stop showing that todo in any of that member’s lists or detail views.
- WHEN a member tries to access a deleted todo (for example, by its identifier), THE system SHALL treat it as not found.

Admin-related requirement:
- WHEN an admin deletes a todo of any member for operational or compliance reasons, THE system SHALL remove that todo from all lists and detail views in the same way as for owner deletion.

Internally, the system may choose between hard deletion and soft deletion, but from a user perspective the todo must no longer appear.


### 4.8 Basic Filtering and Ordering

Business description: Users need to focus on either what is still open or what has been completed.

Filtering by completion state:
- WHEN a member requests a list of only pending todos, THE system SHALL return only that member’s todos whose completion state is pending.
- WHEN a member requests a list of only completed todos, THE system SHALL return only that member’s todos whose completion state is completed.
- WHEN a member requests a list without specifying a completion state, THE system SHALL include both pending and completed todos.
- IF a guest attempts to request any filtered list, THEN THE system SHALL reject the request as unauthorized.

Ordering:
- THE system SHALL return lists of todos in a consistent and predictable order (for example, newest created first, or earliest due date first if due dates are used).
- THE system SHALL use the same ordering rule for repeated requests that use the same filters.


## 5. Error and Edge Case Behavior (Todo-specific)

These requirements focus on todo-related errors from a user viewpoint.

Missing or wrong identifier:
- IF a member tries to view, update, complete, reopen, or delete a todo using an identifier that does not exist for that member, THEN THE system SHALL respond that the todo was not found and SHALL not perform any operation.

Unauthorized access:
- IF any user (guest, member, or admin) attempts an operation that they are not allowed to perform, THEN THE system SHALL reject the request as unauthorized.
- IF a member attempts to access a todo of another member, THEN THE system SHALL reject the request as unauthorized and SHALL NOT reveal whether the todo exists.

Invalid input data:
- IF a create or update request includes values that are outside allowed limits (for example, text too long, invalid date), THEN THE system SHALL reject the request and SHALL provide clear, field-level error messages that can be shown to the end user.


## 6. Performance Expectations (User View)

The Todo app should feel responsive for normal use. Exact technical implementation is flexible as long as these user-level expectations are met under normal load:

- THE system SHALL complete todo creation and return a response that includes the new todo within about two seconds.
- THE system SHALL return a member’s todo list within about two seconds for typical list sizes (for example, up to a few hundred todos).
- THE system SHALL apply updates and show updated data in list or detail views within about two seconds.
- THE system SHALL apply completion or reopening and show the updated state within about two seconds.
- THE system SHALL process deletion so that the deleted todo no longer appears in the member’s lists within about two seconds.

These timings are targets, not strict guarantees, but the system should be designed so that these expectations are usually met.


## 7. Criteria for “Minimal Backend Done”

From a business and user perspective, the minimal Todo backend can be considered complete when all of the following are true:

- THE system SHALL allow a signed-in member user to create todos with at least main text, and to see those todos immediately in their list.
- THE system SHALL allow a member to view their full list of todos and the details of each todo.
- THE system SHALL allow a member to update the main text (and any supported simple metadata) of their todos.
- THE system SHALL allow a member to mark their todos as completed and to reopen completed todos back to pending.
- THE system SHALL allow a member to delete their todos and SHALL ensure deleted todos no longer appear in lists or detail views.
- THE system SHALL prevent any user from viewing or modifying another member’s todos, except that admins may view and delete for operational reasons.
- THE system SHALL support simple filtering by completion state for each member’s list.
- THE system SHALL provide clear error messages for invalid input and unauthorized or not-found operations.
- THE system SHALL respond fast enough for the app to feel responsive during normal use.

This requirements analysis defines only what the system must do, not how it is implemented. Developers can use any suitable technologies and internal structures as long as these behaviors are fully satisfied.