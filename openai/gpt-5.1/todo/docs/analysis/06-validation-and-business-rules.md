# Minimal Todo Service – Requirements Analysis

## 1. Purpose and Scope

The service, called **todoApp**, enables users to manage a personal list of todos with the **minimum set of features** that is still practically useful. The goal is not to create a complex productivity suite, but a simple and predictable backend that supports:

- Creating a todo
- Viewing one or many todos
- Updating todo content
- Marking todos as completed
- Reopening completed todos
- Deleting todos

Features such as reminders, tags, priorities, sharing, comments, and collaboration are explicitly out of scope for the first version.

## 2. User Types and Access

The system recognizes three conceptual user types from a business perspective:

- **guestUser**: Not authenticated. Can only see public landing or authentication-related screens on the client; from the backend perspective, cannot perform any todo operations.
- **memberUser**: Authenticated regular user who owns and manages their own todos.
- **adminUser**: Operational user with extended visibility for support, compliance, or maintenance. Admin actions are distinct from memberUser actions.

Key access rules:

- THE todoApp SHALL allow only **memberUser** and **adminUser** to interact with todos.
- THE todoApp SHALL disallow **guestUser** from creating, reading, updating, completing, reopening, or deleting any todo.
- THE todoApp SHALL associate each todo with exactly one **memberUser** as its owner.
- THE todoApp SHALL allow an **adminUser** to read todos of any memberUser for operational or legal reasons.

## 3. Core Concepts

- **Todo**: A single task that belongs to exactly one memberUser.
- **Owner**: The memberUser who created the todo and normally has full control over it.
- **Status**: A simple state indicating whether the todo is still to be done (pending) or already finished (completed).
- **Active todo**: Todo that is not deleted from the user’s perspective and is visible in normal lists.

Conceptual EARS statements:

- THE todoApp SHALL treat every todo as belonging to exactly one memberUser.
- THE todoApp SHALL prevent guestUser from owning or accessing any todo.
- THE todoApp SHALL hide deleted todos from the owning memberUser in standard listing and detail views.

## 4. Functional Requirements

### 4.1 Create Todo

Objective: A memberUser creates a basic todo with a title and optional description.

Requirements:

- WHEN a memberUser submits a request to create a todo, THE todoApp SHALL require a non-empty title.
- WHEN a memberUser omits the status on creation, THE todoApp SHALL create the todo with status **pending**.
- WHEN a memberUser has not exceeded the allowed number of active todos, THE todoApp SHALL create the todo and SHALL assign it a unique identifier and an immutable owner.
- IF the requester is guestUser, THEN THE todoApp SHALL reject the creation.
- IF the requester attempts to create a todo for another memberUser and is not adminUser, THEN THE todoApp SHALL reject the creation.
- IF the memberUser has reached the maximum allowed number of **active** todos (business recommendation: 1000), THEN THE todoApp SHALL reject the creation and SHALL indicate that the limit is reached.

Validation highlights (business view):

- THE todoApp SHALL treat a title that contains only whitespace as empty and SHALL reject the request.
- THE todoApp SHALL allow titles between 1 and 100 visible characters after trimming.
- THE todoApp SHALL allow an optional description up to 1000 characters; longer descriptions SHALL cause rejection.

### 4.2 Read and List Todos

Objective: A memberUser views their own todos; an adminUser may inspect todos across users.

Requirements:

- WHEN a memberUser requests a list of todos, THE todoApp SHALL return only todos that:
  - belong to that memberUser, and
  - are not marked as deleted.
- WHEN a memberUser requests a single todo by its identifier, THE todoApp SHALL return the todo only if it belongs to that memberUser and is not deleted.
- WHEN an adminUser requests a todo, THE todoApp SHALL allow access regardless of owner, subject to internal policy.
- IF a memberUser requests a todo that belongs to another user, THEN THE todoApp SHALL respond as if that todo is not accessible (for example, as not found or unauthorized) without revealing ownership or existence information.

Ordering and timestamps (business view):

- THE todoApp SHALL record creation and last-modified timestamps for each todo.
- WHEN a todo is created or updated, THE todoApp SHALL update relevant timestamps so that client applications can order todos by recency.

### 4.3 Update Todo Content

Objective: A memberUser edits the title or description of an existing todo.

Requirements:

- WHEN a memberUser submits a request to update a todo’s editable fields (title and optional description), THE todoApp SHALL allow the change only if the todo belongs to that memberUser and is not deleted.
- WHEN a memberUser attempts to update a todo that belongs to another user and the requester is not adminUser, THE todoApp SHALL reject the update.
- WHEN an update succeeds, THE todoApp SHALL update the last-modified timestamp.
- IF an update does not change any field values, THEN THE todoApp SHALL still treat the operation as successfully processed and SHALL keep the final todo state unchanged.
- IF a memberUser attempts to change the owner of a todo through an update, THEN THE todoApp SHALL reject the update.

Validation reuse:

- THE todoApp SHALL apply the same title and description validation rules as in creation (non-empty trimmed title, length limits, allowed characters).

### 4.4 Complete Todo

Objective: A memberUser marks a pending todo as completed.

Requirements:

- WHEN a memberUser requests to complete a todo they own that is in status **pending**, THE todoApp SHALL set its status to **completed** and SHALL update relevant timestamps (including a completion timestamp).
- IF a memberUser attempts to complete a todo that they do not own and they are not adminUser, THEN THE todoApp SHALL reject the operation.
- IF a memberUser requests to complete a todo that is already in status **completed**, THEN THE todoApp SHALL treat the request as idempotent and SHALL keep the todo in status **completed**.

### 4.5 Reopen Todo

Objective: A memberUser reopens a previously completed todo.

Requirements:

- WHEN a memberUser requests to reopen a todo they own that is in status **completed**, THE todoApp SHALL set its status to **pending** and SHALL update the last-modified timestamp.
- IF a memberUser attempts to reopen a todo that they do not own and they are not adminUser, THEN THE todoApp SHALL reject the operation.
- IF a memberUser requests to reopen a todo that is already in status **pending**, THEN THE todoApp SHALL treat the request as idempotent and SHALL keep the todo in status **pending**.

### 4.6 Delete Todo

Objective: A memberUser removes a todo from their active list.

Requirements:

- WHEN a memberUser requests to delete a todo they own, THE todoApp SHALL mark the todo as deleted so that it no longer appears in their normal lists or detail views.
- IF a memberUser attempts to delete a todo that they do not own and they are not adminUser, THEN THE todoApp SHALL reject the deletion.
- WHEN a delete operation is repeated on a todo that is already deleted, THE todoApp SHALL treat the operation as idempotent and SHALL not fail due to the todo already being deleted.
- WHERE legal or operational policy requires data retention, THE todoApp SHALL allow an adminUser to handle deletions in a way that satisfies policy while keeping the todo inaccessible to the memberUser.

## 5. Validation and Business Rules Summary

From the 06-validation-and-business-rules context, the minimal system must honor these key behaviors:

- THE todoApp SHALL ensure each todo has a unique identifier and a single immutable owner.
- THE todoApp SHALL require a non-empty trimmed title between 1 and 100 characters.
- THE todoApp SHALL allow an optional description up to 1000 characters, treating whitespace-only descriptions as absent.
- THE todoApp SHALL limit todo status to **pending** or **completed**.
- WHEN a todo is created, THE todoApp SHALL set status to **pending** if not explicitly supplied.
- WHEN a todo transitions from **pending** to **completed**, THE todoApp SHALL record a completion timestamp.
- THE todoApp SHALL enforce a maximum number of active todos per memberUser (business recommendation: 1000) and SHALL reject creation beyond that limit.
- THE todoApp SHALL treat repeated deletes, completes on already completed todos, and reopens on already pending todos as idempotent operations.

## 6. Error and Edge-Case Behaviors

From a user’s perspective, the system should fail clearly and predictably without exposing internal details.

Key scenarios:

- WHEN a validation rule fails during create or update (for example, title too long, description too long, missing title), THE todoApp SHALL reject the operation and SHALL indicate which field is invalid and why in user-friendly terms.
- WHEN a user attempts an operation on a todo they do not own and they are not adminUser, THE todoApp SHALL reject the operation and SHALL avoid revealing that the todo exists or who owns it.
- WHEN a user exceeds configured limits (for example, too many active todos or too many rapid creations), THE todoApp SHALL reject the action and SHALL communicate that a limit has been reached.
- WHEN two operations conflict (for example, concurrent updates), THE todoApp SHALL ensure that the final visible state reflects a consistent, deterministic application of the operations. If an earlier operation can no longer be applied, the system SHALL treat it as failed and SHALL inform the caller that the todo has changed.

## 7. Non-Functional Expectations (High Level)

Even as a minimal system, some basic non-functional expectations apply:

- THE todoApp SHALL respond quickly enough that basic operations (create, list, update, complete, reopen, delete) feel instantaneous under normal load from an end-user perspective.
- THE todoApp SHALL protect todo data so that users cannot access or infer other users’ todos without appropriate admin permissions.
- THE todoApp SHALL keep behavior simple and predictable, favoring clarity over advanced features or optimizations.

## 8. Out-of-Scope for First Version

To keep the system minimal, the following are out of scope:

- Reminders, due dates, and recurring tasks
- Tags, labels, folders, or projects
- Attachments or file uploads
- Sharing todos with other users or collaborating in real time
- Complex prioritization, sorting, or filtering beyond basic listing by owner and simple ordering
- Analytics dashboards or reports for end users

These exclusions ensure the backend focuses only on a solid, predictable core for managing personal todos with the smallest complete feature set.