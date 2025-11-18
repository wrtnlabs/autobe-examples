# todoApp Minimal Todo Service – Requirements Analysis

## 1. Purpose and Vision

todoApp is a minimal Todo list backend service intended for individual task management and for learning how a simple backend behaves. The primary goal is to support the smallest useful set of features for managing personal todos, while keeping the behavior predictable and easy to understand for non-technical users.

WHEN a person wants a simple way to record and track personal tasks, THE todoApp SHALL allow that person, as a memberUser, to manage a list of todo items without unnecessary extra features.

WHEN stakeholders use todoApp as a learning or demonstration tool, THE todoApp SHALL keep its behavior small, clear, and consistent so that the overall flow of creating, viewing, updating, completing, and deleting todos can be understood quickly.

## 2. Actors and High-Level Goals

### 2.1 guestUser

A guestUser is an unauthenticated visitor.

- Goal: Understand what todoApp does and decide whether to sign up.
- No access to personal todos.

WHEN the actor is a guestUser, THE todoApp SHALL show only general service information and SHALL NOT show or manipulate any personal todo data.

### 2.2 memberUser

A memberUser is an authenticated user who manages personal todos.

- Goal: Create, review, update, complete, reopen, and delete personal tasks.
- Can only operate on their own todos.

WHEN the actor is a memberUser, THE todoApp SHALL allow full management of todos that belong only to that memberUser.

### 2.3 adminUser

An adminUser is an authenticated user with elevated operational privileges.

- Goal: Maintain service health and policy compliance.
- Can view and remove problematic todos across users when necessary.

WHEN the actor is an adminUser, THE todoApp SHALL allow oversight of todos created by different memberUsers for operational and policy reasons, without treating the adminUser as the personal owner of those todos.

## 3. Minimal In-Scope Features

The minimal version focuses on essential Todo capabilities for a single memberUser.

In-scope capabilities:

- Member authentication and ownership of todos at a business level.
- Creating todos with a short textual description.
- Listing todos that belong to the current memberUser.
- Updating the description of an existing todo.
- Marking a todo as completed.
- Reopening a completed todo.
- Deleting a todo so it no longer appears in normal usage.
- Admin oversight actions to remove inappropriate todos.

WHEN a memberUser is authenticated and provides a valid description, THE todoApp SHALL create a todo item associated only with that memberUser.

WHEN a memberUser requests their todo list, THE todoApp SHALL return only todos owned by that memberUser in a consistent order.

WHEN a memberUser updates, completes, reopens, or deletes a todo, THE todoApp SHALL apply the requested change only to todos owned by that memberUser.

WHEN an adminUser decides that a todo must be removed for policy or legal reasons, THE todoApp SHALL allow the adminUser to remove or hide that todo from normal access.

## 4. Explicit Out-of-Scope Items

To keep todoApp minimal, many typical task management features are intentionally excluded in this version.

Out-of-scope examples:

- Shared or collaborative todo lists.
- Assigning todos to other users.
- Tags, labels, folders, or complex categorization.
- Reminders, notifications, or calendar integrations.
- File attachments or images.
- Subtasks or nested todos.
- Rich text or long-form notes.
- Time tracking or productivity analytics.
- Advanced search and filtering beyond basic listing.

WHERE a requested feature would significantly increase complexity, such as collaboration or reminders, THE todoApp SHALL treat that feature as out of scope for this minimal version.

WHILE the minimal version is active, THE todoApp SHALL protect its scope by not adding advanced organization, sharing, or integration features.

## 5. Core Concepts

### 5.1 Todo Item

A todo item is a single task that a memberUser wants to remember.

Characteristics at business level:

- A short textual description.
- Owned by exactly one memberUser.
- A completion state: completed or not completed.
- Conceptual timestamps for creation and last update.

WHEN a memberUser creates a todo, THE todoApp SHALL require a non-empty description that is reasonably short and understandable.

IF a todo item has been deleted, THEN THE todoApp SHALL not return that todo in normal listings or retrieval operations for any user.

### 5.2 Completion State

The completion state represents whether the memberUser considers the task done.

WHEN a memberUser marks a todo as completed, THE todoApp SHALL set its completion state to completed without changing the description.

WHEN a memberUser reopens a completed todo, THE todoApp SHALL set its completion state back to not completed.

### 5.3 Ownership and Access

Ownership links each todo to one memberUser.

WHEN a memberUser tries to perform any operation on a todo that is not owned by that memberUser, THE todoApp SHALL deny that operation.

WHEN a guestUser interacts with the system, THE todoApp SHALL prevent the guestUser from creating, viewing, updating, completing, reopening, or deleting any todo items.

WHEN an adminUser performs oversight, THE todoApp SHALL allow the adminUser to view and remove todos across users when required by policy, legal, or safety reasons.

## 6. User Journeys

### 6.1 guestUser Journey

- The guestUser visits the service.
- The guestUser reads a brief explanation of what todoApp does.
- The guestUser may decide to register and become a memberUser using the separate authentication flow.

WHEN a guestUser attempts an operation that depends on personal todos, THE todoApp SHALL require the guestUser to authenticate as a memberUser before allowing access.

### 6.2 memberUser Journey: Managing Todos

Typical steps:

1. The person becomes a memberUser by registering and signing in.
2. The memberUser creates one or more todos describing tasks.
3. The memberUser periodically views the todo list to recall tasks.
4. The memberUser edits descriptions when the nature of tasks changes.
5. The memberUser marks todos as completed when tasks are done.
6. The memberUser reopens tasks that need to be done again.
7. The memberUser deletes tasks that are no longer relevant.

WHEN a memberUser is authenticated and requests their todo list, THE todoApp SHALL show the list of todos owned by that memberUser.

WHEN a memberUser provides a valid new description for an existing todo they own, THE todoApp SHALL update that todo with the new description.

WHEN a memberUser requests to complete a todo they own, THE todoApp SHALL mark that todo as completed.

WHEN a memberUser requests to reopen a completed todo they own, THE todoApp SHALL mark that todo as not completed.

WHEN a memberUser requests to delete a todo they own, THE todoApp SHALL make that todo unavailable in subsequent normal operations.

### 6.3 adminUser Journey: Oversight

- The adminUser signs in with administrative credentials.
- The adminUser may search or navigate to todos linked to specific memberUsers when there is a complaint or policy issue.
- The adminUser decides whether a todo violates operational or legal rules.
- The adminUser removes or hides the todo when necessary.

WHEN an adminUser is authenticated as an administrative actor, THE todoApp SHALL provide visibility into memberUser todos that is sufficient for resolving policy and operational issues.

WHEN an adminUser determines that a todo must be removed, THE todoApp SHALL ensure that the todo no longer appears in normal memberUser listings and SHALL prevent further normal access to that todo.

## 7. Functional Requirements in EARS Format

This section summarizes core behaviors using EARS-style requirements.

### 7.1 Create Todo

WHEN a memberUser is authenticated AND provides a non-empty todo description within the allowed length, THE todoApp SHALL create a new todo item owned by that memberUser and record its initial state as not completed.

WHEN a memberUser attempts to create a todo with an empty description or a description that exceeds reasonable length limits, THE todoApp SHALL reject the creation and SHALL NOT store a todo for that request.

### 7.2 List Todos

WHEN a memberUser is authenticated AND requests their todo list, THE todoApp SHALL return a list that contains all non-deleted todos owned by that memberUser.

WHEN a memberUser views their todo list repeatedly over time, THE todoApp SHALL return consistent data that reflects earlier create, update, completion, reopen, and deletion actions performed by that memberUser.

### 7.3 Read Single Todo (Conceptual)

WHEN a memberUser is authenticated AND requests details for a specific todo they own, THE todoApp SHALL return the description, completion state, and relevant timestamps for that todo.

WHEN a memberUser requests a todo that does not exist or is deleted, THE todoApp SHALL indicate that the todo is not available and SHALL NOT expose any unrelated todo data.

### 7.4 Update Todo Description

WHEN a memberUser is authenticated AND provides a valid new description for a todo they own, THE todoApp SHALL update the todo’s description and SHALL keep its completion state unchanged.

WHEN a memberUser attempts to update a todo they do not own, THE todoApp SHALL deny the update operation and SHALL NOT change any todo data.

### 7.5 Complete and Reopen Todo

WHEN a memberUser is authenticated AND requests to mark a todo they own as completed, THE todoApp SHALL set the todo’s completion state to completed.

WHEN a memberUser is authenticated AND requests to reopen a completed todo they own, THE todoApp SHALL set the todo’s completion state back to not completed.

WHEN a memberUser attempts to change the completion state of a todo they do not own, THE todoApp SHALL deny the operation.

### 7.6 Delete Todo

WHEN a memberUser is authenticated AND requests to delete a todo they own, THE todoApp SHALL remove that todo from normal access and SHALL ensure it no longer appears in the memberUser’s todo list.

WHEN a memberUser attempts to delete a todo they do not own, THE todoApp SHALL deny the delete operation and SHALL keep the todo unchanged.

### 7.7 Admin Oversight

WHEN an adminUser is authenticated as an administrative actor AND requests to review todos for operational reasons, THE todoApp SHALL present the requested todos in a way that supports policy evaluation.

WHEN an adminUser decides that a todo must be removed for policy, legal, or safety reasons, THE todoApp SHALL remove or hide that todo from normal access for both the memberUser owner and other users.

WHEN an adminUser performs oversight actions, THE todoApp SHALL distinguish between oversight access and personal ownership so that admin actions do not incorrectly change ownership semantics.

## 8. Authentication and Authorization (Business View)

Authentication and detailed mechanisms are defined elsewhere, but the requirements for this minimal Todo service are:

WHEN a user performs operations that depend on personal todos, THE todoApp SHALL require that user to be authenticated as a memberUser or adminUser.

WHEN a user is not authenticated, THE todoApp SHALL treat that user as a guestUser and SHALL restrict access to general information only.

WHEN a memberUser is authenticated, THE todoApp SHALL treat that identity as the owner of newly created todos and SHALL use that identity to enforce access checks for existing todos.

WHEN an adminUser is authenticated, THE todoApp SHALL recognize administrative privileges and SHALL allow the adminUser to view and remove todos across users for operational reasons, while preventing the adminUser from acting as if they were the personal owner of memberUser todos.

## 9. Validation and Business Rules (High Level)

This minimal service relies on simple, clear validation rules.

WHEN a memberUser creates or updates a todo description, THE todoApp SHALL require the description to be non-empty and reasonably short so that it can be read easily in a list.

WHEN a todo description violates basic length or emptiness rules, THE todoApp SHALL reject the request and SHALL keep existing data unchanged.

WHEN operations target specific todos (update, complete, reopen, delete), THE todoApp SHALL require that the referenced todo exists and is owned by the actor (unless the actor is an adminUser performing an allowed oversight action).

WHEN a memberUser sends multiple identical or repeated requests for the same update, completion, reopen, or deletion, THE todoApp SHALL handle these requests in a way that keeps the todo’s final state consistent and avoids confusing duplicate effects from a business perspective.

## 10. Error Handling Expectations (Business View)

Error details and formats are defined elsewhere, but expectations for behavior are:

WHEN an unauthenticated user attempts an operation that requires authentication, THE todoApp SHALL refuse the operation and SHALL clearly distinguish that authentication is required.

WHEN an authenticated user attempts to operate on a todo they do not own, THE todoApp SHALL deny the operation as not permitted and SHALL NOT reveal sensitive details about the unauthorized todo.

WHEN a requested todo does not exist or has been deleted, THE todoApp SHALL indicate that the todo is not available.

WHEN internal problems temporarily prevent normal operation, THE todoApp SHALL avoid corrupting todo data and SHALL make it possible for users to retry operations later.

## 11. Non-Functional Expectations (Business Level)

Although low-level technical metrics are not specified, there are clear expectations:

WHEN a memberUser performs normal operations such as viewing their todo list or updating a todo under typical usage, THE todoApp SHALL respond quickly enough that the memberUser experiences the interaction as immediate or nearly immediate.

WHILE the todoApp is running in normal conditions, THE todoApp SHALL preserve the integrity of todo data and SHALL avoid unexpected loss of todos during ordinary usage.

WHEN traffic grows within reasonable limits for a minimal service, THE todoApp SHALL maintain consistent behavior so that memberUsers can still create and manage todos without noticeable degradation in normal conditions.

## 12. Success Criteria for the Minimal Version

The minimal version of todoApp is considered successful when the following conditions are met:

- memberUsers can reliably create, list, update, complete, reopen, and delete their own todos.
- guestUsers cannot access or manipulate any personal todo data.
- adminUsers can review and remove todos that violate policies, without breaking normal memberUser flows.

WHEN a memberUser repeatedly uses todoApp over time for basic todo operations, THE todoApp SHALL behave consistently across sessions so the memberUser can trust that actions have the same effect each time.

WHEN stakeholders look at todoApp as an example of a minimal backend, THE todoApp SHALL demonstrate clear, focused behavior aligned with the requirements described here, without extra complexity from out-of-scope features.