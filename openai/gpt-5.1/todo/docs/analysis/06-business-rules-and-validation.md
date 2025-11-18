# Minimal Todo Application – Requirements Analysis

## 1. Goal and Scope

The service name is `todoApp`. The goal is to provide **only the minimum useful features** for a personal Todo list so that a non-technical user can:
- Add tasks they want to remember.
- See their list of tasks.
- Mark tasks as done or not done.
- Remove tasks they no longer need.

Everything that is not essential is intentionally left out from the first version.

## 2. Users (Actors)

There are three conceptual user types.

### 2.1 Guest user
- A guest is **not logged in**.
- Guest users **cannot** have personal todos.
- Guest users may only see public or demo information (if any), but this is optional and not required for the minimal version.

**Requirement (EARS):**
- IF a `guestUser` attempts to create, view, update, complete, reopen, or delete any personal todo, THEN THE `todoApp` backend SHALL reject the request.

### 2.2 Member user
- A member is a **regular logged-in user**.
- Each member manages **only their own** todo items.

**Key rules:**
- Each todo belongs to exactly one member.
- Members can only see and modify their own todos.

**Requirements (EARS):**
- WHEN a `memberUser` creates a todo, THE `todoApp` backend SHALL associate the new todo with that `memberUser` as the owner.
- IF a `memberUser` attempts to access or modify a todo that is not owned by that `memberUser`, THEN THE `todoApp` backend SHALL reject the request.

### 2.3 Admin user
- An admin is an operator of the service with extended permissions.
- Admin access is mainly for future operational or support needs; the minimal user-facing feature set does not depend on admin actions.

**Requirements (EARS):**
- WHERE an `adminUser` requires access for operational purposes, THE `todoApp` backend SHALL allow the `adminUser` to view and, when allowed by policy, modify or delete todos belonging to any `memberUser`.
- IF an `adminUser` modifies or deletes a todo on behalf of a `memberUser`, THEN THE `todoApp` backend SHALL apply the same validation rules as if the owner had performed the operation.

## 3. Todo Item Concept

A **todo** is a personal task item owned by exactly one member user.

### 3.1 Required fields

At minimum, every todo has:
- **Owner**: the `memberUser` who owns it.
- **Title**: short text that describes the task.
- **State**: the current status of the todo.

**Requirements (EARS):**
- THE `todoApp` backend SHALL require that every todo has a non-empty title at all times during its existence.
- WHEN a `memberUser` submits a request to create a todo, THE `todoApp` backend SHALL require a title field and SHALL treat absence of a title as invalid.

### 3.2 Optional fields (may be included, but not strictly required)

To stay minimal, these fields are optional and can be omitted in the first implementation if desired, but rules are defined in case they are used:
- **Description** (optional): longer text about the task.
- **Due date** (optional): when the task should be done.
- **Priority** (optional): simple level such as "low", "medium", or "high".

If these fields are not needed for the first version, they can be skipped without breaking core behavior.

## 4. Todo States and Lifecycle

A todo has three conceptual states:
- `active`: normal, not yet completed.
- `completed`: finished by the user.
- `deleted`: logically deleted and no longer shown in normal lists.

### 4.1 State rules

**Requirements (EARS):**
- WHEN a todo is created, THE `todoApp` backend SHALL set its initial state to `active`.
- THE `todoApp` backend SHALL treat `completed` as meaning the todo has been finished by the user.
- THE `todoApp` backend SHALL treat `deleted` as meaning the todo is no longer visible in normal lists and cannot be modified further by the owner.

### 4.2 Allowed state changes

The minimal state transitions are:
- `active` → `completed` (complete the task)
- `completed` → `active` (reopen the task)
- `active` → `deleted` (delete an unfinished task)
- `completed` → `deleted` (delete a finished task)

**Requirements (EARS):**
- WHEN the owner marks an `active` todo as completed, THE `todoApp` backend SHALL change its state from `active` to `completed`.
- WHEN the owner reopens a `completed` todo, THE `todoApp` backend SHALL change its state from `completed` to `active`.
- WHEN the owner deletes an `active` or `completed` todo, THE `todoApp` backend SHALL change its state to `deleted`.
- IF a request attempts to change a todo state from `deleted` to any other state, THEN THE `todoApp` backend SHALL reject the request.
- IF a request attempts to set a todo state to any value other than `active`, `completed`, or `deleted`, THEN THE `todoApp` backend SHALL reject the request.

### 4.3 Time tracking (minimal)

For basic tracking and future extension:
- A creation time is recorded.
- A completion time is recorded when a todo is completed.
- A deletion time is recorded when a todo is deleted.

**Requirements (EARS):**
- WHEN a todo is created, THE `todoApp` backend SHALL record a creation timestamp.
- WHEN a todo transitions from a non-completed state to `completed`, THE `todoApp` backend SHALL record a completion timestamp.
- WHEN a todo is moved to the `deleted` state, THE `todoApp` backend SHALL record a deletion timestamp.

## 5. Core Features (Minimum Functionality)

This section summarizes what the minimal Todo application **must** be able to do.

### 5.1 Create todo

A logged-in member creates a new todo by giving a title (and optionally other fields).

**Requirements (EARS):**
- WHEN a `memberUser` creates a todo with a valid title, THE `todoApp` backend SHALL create a new todo in `active` state and associate it with that `memberUser`.
- WHEN a `memberUser` creates a todo, THE `todoApp` backend SHALL reject the request IF the title is missing, empty, or only whitespace.

### 5.2 View todo list

A logged-in member views all of their non-deleted todos.

**Requirements (EARS):**
- WHEN a `memberUser` requests their todo list, THE `todoApp` backend SHALL return only todos owned by that `memberUser` that are not in the `deleted` state.
- WHERE pagination is used, THE `todoApp` backend SHALL return at most a reasonable number of todos per page (such as 100), and SHALL limit larger requests to that maximum.

### 5.3 View single todo

A member may open a single todo to see its details.

**Requirements (EARS):**
- WHEN a `memberUser` requests a specific todo by its identifier, THE `todoApp` backend SHALL return the todo only IF it is owned by that `memberUser` and not deleted.
- IF a `memberUser` requests a todo that they do not own or that is deleted, THEN THE `todoApp` backend SHALL reject the request without revealing details about the todo.

### 5.4 Update todo content

A member can edit the title (and optional fields) of their active or completed todos.

**Requirements (EARS):**
- WHEN a `memberUser` updates a todo they own that is not deleted, THE `todoApp` backend SHALL apply the same validation rules to the new content as it does on creation.
- IF a todo update request has a title that is missing, empty, only whitespace, or exceeds the allowed maximum length, THEN THE `todoApp` backend SHALL reject the update.
- WHILE a todo is in the `deleted` state, THE `todoApp` backend SHALL reject any update attempts by the owner.

### 5.5 Complete and reopen todo

A member can mark tasks as done or undo that decision.

**Requirements (EARS):**
- WHEN the owner requests to complete an `active` todo, THE `todoApp` backend SHALL change its state to `completed` and SHALL record the completion timestamp.
- WHEN the owner requests to reopen a `completed` todo, THE `todoApp` backend SHALL change its state to `active`.
- IF a request attempts to complete a todo that is not `active`, THEN THE `todoApp` backend SHALL reject the request.
- IF a request attempts to reopen a todo that is not `completed`, THEN THE `todoApp` backend SHALL reject the request.

### 5.6 Delete todo

A member can delete tasks they no longer need.

**Requirements (EARS):**
- WHEN the owner deletes an `active` or `completed` todo, THE `todoApp` backend SHALL change its state to `deleted` and SHALL record a deletion timestamp.
- WHILE a todo is in the `deleted` state, THE `todoApp` backend SHALL prevent further changes by the owner.

## 6. Validation and Limits (Simplified)

The service defines basic rules so that todos stay manageable.

### 6.1 Title rules

**Requirements (EARS):**
- WHEN validating a todo title, THE `todoApp` backend SHALL treat titles that are only whitespace as empty and SHALL reject them.
- WHEN validating a todo title, THE `todoApp` backend SHALL allow between 1 and 200 visible characters (after trimming whitespace) and SHALL reject longer titles.

### 6.2 Description and optional fields

If description, due date, or priority are used:

**Requirements (EARS):**
- WHERE a description is provided, THE `todoApp` backend SHALL allow description length up to 2000 characters and SHALL reject longer descriptions.
- WHERE a due date is provided, THE `todoApp` backend SHALL require the due date to be a valid date-time and SHALL reject obviously invalid dates.
- WHERE a priority is supported, THE `todoApp` backend SHALL restrict priority values to the set {"low", "medium", "high"} and SHALL reject other values.

### 6.3 Per-user limits

To avoid overload:

**Requirements (EARS):**
- THE `todoApp` backend SHALL enforce a configurable maximum number of non-deleted todos per `memberUser` (for example, 10,000) and SHALL reject creation requests that exceed this limit.
- WHERE rate limits for todo creation are configured, THE `todoApp` backend SHALL reject additional creation requests that exceed the defined rate in a given time window.

## 7. Error Handling and Feedback (Business View)

From the user’s perspective, errors should be clear and simple.

**Requirements (EARS):**
- WHEN a todo operation fails due to validation (for example, missing title or title too long), THE `todoApp` backend SHALL return a clear business-level reason such as "title is required" or "title is too long".
- WHEN a user tries to access or modify a todo they do not own, THE `todoApp` backend SHALL reject the request without confirming that the todo exists, to protect privacy.
- WHEN a `guestUser` attempts any personal todo operation, THE `todoApp` backend SHALL reject the request and SHALL indicate that login is required.

## 8. Non-functional Expectations (High Level)

These are simple expectations about how the system should feel to users.

**Requirements (EARS):**
- WHEN a user performs common operations such as creating, updating, completing, or deleting a todo under normal load, THE `todoApp` backend SHALL respond quickly enough that the user perceives the operation as effectively immediate.
- WHEN validating todo operations that check counts or limits, THE `todoApp` backend SHALL perform these checks without noticeable delay for typical usage.
- WHEN processing text input such as title and description, THE `todoApp` backend SHALL treat all user-supplied content as untrusted input and SHALL rely on security measures elsewhere in the system to prevent code execution and injection attacks.

## 9. Out of Scope for Minimal Version

To keep the first version as small and clear as possible, the following are **explicitly excluded** from the minimal requirements:
- Sharing todos between users.
- Collaboration features (comments, mentions, etc.).
- Complex labels, tags, or nested projects.
- Reminders, notifications, and recurring tasks.
- Advanced search, filtering, or sorting beyond basic list viewing.
- Complex analytics or reports.

These can be considered future enhancements and are not required for the initial minimal Todo application.

---

This requirements analysis is intended to be understandable to non-programmers while being specific enough for backend developers to implement a minimal, predictable Todo service (`todoApp`).