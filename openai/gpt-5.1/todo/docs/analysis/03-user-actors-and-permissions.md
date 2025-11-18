# User Actors and Permissions Requirements for todoApp

## 1. Purpose and Scope

THE purpose of the todoApp user-actors-and-permissions specification SHALL be to define in business terms:
- Who can use the service.
- How the service recognizes each type of user.
- What each user type is allowed and not allowed to do with todos.

THE specification SHALL focus on actors, authentication behavior, and authorization rules for todo operations, expressed as clear, testable business requirements using EARS-style language.

THE scope of this specification SHALL include:
- Actor definitions for "guestUser", "memberUser", and "adminUser".
- Business-level authentication and session behavior.
- Permissions per actor for todo-related operations in a minimal personal todo service.
- Actor-specific authorization rules, including edge cases.

THE scope of this specification SHALL exclude:
- Technical API details (such as endpoints, request/response formats).
- Database schemas or storage structures.
- Infrastructure or library choices for security or deployment.

## 2. Actor Definitions

### 2.1 Actor Overview

THE todoApp service SHALL support exactly three actor types:
- "guestUser": Visitor without an authenticated session.
- "memberUser": Authenticated regular user managing personal todos.
- "adminUser": Authenticated administrative user responsible for service oversight and exceptional maintenance.

THE todoApp service SHALL treat each active session as belonging to exactly one actor type at any time.

### 2.2 guestUser

A "guestUser" is any visitor without a valid authenticated session.

Business characteristics:
- guestUser has no recognized personal account during the visit.
- guestUser has no access to any personal todo data.
- guestUser may only see public informational content (for example, a basic description of the service or status messages), if such content exists.

EARS-style requirements for guestUser:
- THE "todoApp" SHALL treat any visitor without a valid authenticated session as a "guestUser".
- WHILE an actor is a "guestUser", THE "todoApp" SHALL prohibit access to all personal todo items.
- WHILE an actor is a "guestUser", THE "todoApp" SHALL prohibit creating, updating, completing, reopening, or deleting todos.

### 2.3 memberUser

A "memberUser" is a regular authenticated user with a personal account for managing their own todos.

Business characteristics:
- memberUser has a unique personal account within todoApp.
- memberUser manages a private set of todo items that belong only to that account.
- memberUser cannot access or manage todo items belonging to any other account.

EARS-style requirements for memberUser:
- THE "todoApp" SHALL treat any authenticated user with a regular user role as a "memberUser".
- WHILE an actor is a "memberUser", THE "todoApp" SHALL allow creation of new todo items owned by that "memberUser".
- WHILE an actor is a "memberUser", THE "todoApp" SHALL allow reading of todo items owned by that "memberUser".
- WHILE an actor is a "memberUser", THE "todoApp" SHALL allow updating of allowed fields of todo items owned by that "memberUser".
- WHILE an actor is a "memberUser", THE "todoApp" SHALL allow marking todo items owned by that "memberUser" as completed.
- WHILE an actor is a "memberUser", THE "todoApp" SHALL allow reopening todo items owned by that "memberUser" that are currently completed.
- WHILE an actor is a "memberUser", THE "todoApp" SHALL allow deleting todo items owned by that "memberUser".
- WHILE an actor is a "memberUser", THE "todoApp" SHALL prohibit any operation that reads todo items owned by another user.
- WHILE an actor is a "memberUser", THE "todoApp" SHALL prohibit any operation that modifies or deletes todo items owned by another user.

### 2.4 adminUser

An "adminUser" is an authenticated administrative actor responsible for service-level oversight and exceptional maintenance.

Business characteristics:
- adminUser may access additional service-level information and exceptional actions needed to keep the service healthy.
- adminUser is not intended to use administrative capabilities for regular personal task management.
- For a minimal todoApp, adminUser todo permissions MAY be identical to memberUser for own todos, but additional powers over other users' data SHALL be strictly policy-bound.

EARS-style requirements for adminUser:
- THE "todoApp" SHALL treat any authenticated user with an administrative role as an "adminUser".
- WHILE an actor is an "adminUser", THE "todoApp" SHALL allow viewing of service-level health or operational information defined as administrative.
- WHILE an actor is an "adminUser", THE "todoApp" SHALL allow execution of administrative maintenance actions defined by policy.
- WHERE an administrative policy permits intervention in user data, THE "todoApp" SHALL allow an "adminUser" to access or modify user accounts or todo items across users for the specific scope required by that intervention.
- WHILE an actor is an "adminUser", THE "todoApp" SHALL prohibit using administrative capabilities for casual browsing or modification of user data without an applicable administrative policy.

## 3. Authentication and Session Behavior

### 3.1 Authentication States

Authentication is the process that associates a visitor with a persistent account and an actor type.

EARS-style authentication requirements:
- THE "todoApp" SHALL distinguish between authenticated and unauthenticated access.
- WHEN valid regular user credentials are presented, THE "todoApp" SHALL authenticate the visitor as a "memberUser".
- WHEN valid administrative credentials are presented, THE "todoApp" SHALL authenticate the visitor as an "adminUser".
- IF authentication fails, THEN THE "todoApp" SHALL keep or return the visitor to the "guestUser" state.

### 3.2 Registration and Login for memberUser

Registration and login create and use a personal account for a memberUser.

- WHEN a visitor provides valid registration information, THE "todoApp" SHALL create a new account and, after successful login, SHALL treat the visitor as a "memberUser".
- WHEN a "memberUser" provides valid login credentials, THE "todoApp" SHALL establish an authenticated session for that "memberUser".
- IF login credentials are invalid, THEN THE "todoApp" SHALL keep the visitor as a "guestUser" and SHALL not reveal whether specific account identifiers (such as an email) exist, beyond a generic failure message in business terms.
- WHEN a "memberUser" completes a valid password reset or password change flow, THE "todoApp" SHALL require the new password for future authentication and MAY end existing sessions according to security policy.

### 3.3 Session Lifetime

A session represents an authenticated presence of a memberUser or adminUser.

- WHILE a session is active for a "memberUser", THE "todoApp" SHALL treat all operations under that session as operations by that "memberUser".
- WHILE a session is active for an "adminUser", THE "todoApp" SHALL treat all operations under that session as operations by that "adminUser".
- IF a session expires due to time-based or security rules, THEN THE "todoApp" SHALL treat subsequent requests as from a "guestUser" until successful re-authentication.

### 3.4 Logout and Revocation

- WHEN a "memberUser" explicitly logs out, THE "todoApp" SHALL end the associated authenticated session and treat further operations as coming from a "guestUser".
- WHEN an "adminUser" explicitly logs out, THE "todoApp" SHALL end the associated authenticated session and treat further operations as coming from a "guestUser".
- WHEN an actor triggers a "revoke all sessions" action (for example, after suspected compromise), THE "todoApp" SHALL end all active sessions for that account and SHALL require re-authentication for further access.

### 3.5 Actor Assignment from Session

- WHEN a request is received, THE "todoApp" SHALL determine the actor type ("guestUser", "memberUser", or "adminUser") based on the presence and contents of the session.
- IF no valid session is present, THEN THE "todoApp" SHALL assign the "guestUser" actor to the request.
- IF a valid member session is present, THEN THE "todoApp" SHALL assign the "memberUser" actor to the request.
- IF a valid admin session is present, THEN THE "todoApp" SHALL assign the "adminUser" actor to the request.

## 4. Permissions by Actor

### 4.1 Todo-related Permission Categories

For a minimal personal todo service, todo-related permissions SHALL be defined in these categories:
- Create new todo.
- Read todo list and todo details (own todos).
- Update todo content (own todos).
- Change completion state (complete or reopen) of a todo (own todos).
- Delete todo (own todos).
- Access todo items belonging to another user.
- View service-level health and administrative information.
- Perform administrative maintenance on accounts or todos.

THE "todoApp" SHALL use actor type and ownership to decide which operations are allowed.

### 4.2 guestUser Permissions

- WHILE an actor is a "guestUser", THE "todoApp" SHALL allow viewing of public informational content only.
- WHILE an actor is a "guestUser", THE "todoApp" SHALL prohibit creating any todo items.
- WHILE an actor is a "guestUser", THE "todoApp" SHALL prohibit reading any personal todo items.
- WHILE an actor is a "guestUser", THE "todoApp" SHALL prohibit updating any todo items.
- WHILE an actor is a "guestUser", THE "todoApp" SHALL prohibit marking any todo items as completed or reopened.
- WHILE an actor is a "guestUser", THE "todoApp" SHALL prohibit deleting any todo items.

### 4.3 memberUser Permissions (Own Todos)

- WHILE an actor is a "memberUser", THE "todoApp" SHALL allow creation of todo items owned by that "memberUser".
- WHILE an actor is a "memberUser", THE "todoApp" SHALL allow reading the list of todo items owned by that "memberUser".
- WHILE an actor is a "memberUser", THE "todoApp" SHALL allow reading the details of todo items owned by that "memberUser".
- WHILE an actor is a "memberUser", THE "todoApp" SHALL allow updating todo items owned by that "memberUser", subject to separate business rules that define which fields may change.
- WHILE an actor is a "memberUser", THE "todoApp" SHALL allow marking todo items owned by that "memberUser" as completed.
- WHILE an actor is a "memberUser", THE "todoApp" SHALL allow reopening todo items owned by that "memberUser" that are in a completed state.
- WHILE an actor is a "memberUser", THE "todoApp" SHALL allow deleting todo items owned by that "memberUser".

### 4.4 memberUser Permissions (Others' Todos)

- WHILE an actor is a "memberUser", THE "todoApp" SHALL prohibit reading todo items that are not owned by that "memberUser".
- WHILE an actor is a "memberUser", THE "todoApp" SHALL prohibit updating todo items that are not owned by that "memberUser".
- WHILE an actor is a "memberUser", THE "todoApp" SHALL prohibit completing or reopening todo items that are not owned by that "memberUser".
- WHILE an actor is a "memberUser", THE "todoApp" SHALL prohibit deleting todo items that are not owned by that "memberUser".

### 4.5 adminUser Permissions

Minimal administrative capabilities SHALL focus on oversight and exceptional interventions.

- WHILE an actor is an "adminUser", THE "todoApp" SHALL allow viewing service-level health and operational indicators defined as administrative metrics.
- WHILE an actor is an "adminUser", THE "todoApp" SHALL allow viewing account-level information for any user when necessary to investigate incidents, enforce policies, or perform maintenance.
- WHERE an administrative operation is defined by policy (for example, disabling an account or removing harmful content), THE "todoApp" SHALL allow an "adminUser" to perform that operation.
- WHERE an administrative policy specifically allows intervention in individual todo items, THE "todoApp" SHALL allow an "adminUser" to read or modify those todo items across users for the duration and scope described by the policy.
- IF an "adminUser" attempts to perform an operation that is not within defined administrative policies, THEN THE "todoApp" SHALL treat the operation as forbidden.

Optional own-todo handling for adminUser:
- WHERE todoApp supports personal todos for "adminUser", THE "todoApp" SHALL treat an "adminUser" as having the same rights as a "memberUser" for todos that the "adminUser" personally owns.

## 5. Authorization Business Rules and Edge Cases

### 5.1 General Authorization Principles

- THE "todoApp" SHALL follow least-privilege principles, granting each actor only the minimal permissions necessary for their role.
- THE "todoApp" SHALL treat ownership of a todo item as the primary factor when deciding access for non-admin actors.
- THE "todoApp" SHALL treat explicit administrative policy as the primary factor when deciding exceptional access for "adminUser".

### 5.2 Actor Determination Rules

- WHEN a request arrives, THE "todoApp" SHALL first determine whether the request has a valid session.
- IF no valid session exists, THEN THE "todoApp" SHALL treat the actor as a "guestUser".
- IF a valid session exists with a regular role, THEN THE "todoApp" SHALL treat the actor as a "memberUser".
- IF a valid session exists with an administrative role, THEN THE "todoApp" SHALL treat the actor as an "adminUser".

### 5.3 Ownership-based Access Rules

- WHEN a "memberUser" attempts to access a todo item, THE "todoApp" SHALL verify that the todo item is owned by that "memberUser" before granting access.
- IF the todo item is not owned by the requesting "memberUser", THEN THE "todoApp" SHALL deny the operation.
- WHERE todoApp allows admin intervention, WHEN an "adminUser" attempts to access a todo item owned by another user, THE "todoApp" SHALL grant or deny access according to defined administrative policies.

### 5.4 Account Status and Role Changes

Edge-case requirements:
- IF a user account is disabled or blocked for any reason, THEN THE "todoApp" SHALL deny all todo operations for that account, even if credentials or sessions appear valid.
- WHEN a user account role changes from "adminUser" to "memberUser", THE "todoApp" SHALL treat new requests as coming from a "memberUser" after the change takes effect.
- WHEN a user account role changes from "memberUser" to "adminUser", THE "todoApp" SHALL treat new requests as coming from an "adminUser" after the change takes effect and SHALL require re-authentication if necessary.

### 5.5 Inconsistent Data or State Repair

- IF a todo item is detected in an inconsistent or damaged state that prevents normal operations, THEN THE "todoApp" SHALL allow an "adminUser" to repair or delete the todo item as part of administrative maintenance.
- WHERE repair actions are taken, THE "todoApp" SHALL treat them as administrative operations and SHALL require an "adminUser" actor.

## 6. Error and Feedback Behavior by Actor

### 6.1 Unauthorized vs Forbidden

- WHEN an unauthenticated actor ("guestUser") attempts an operation that requires authentication (for example, creating a todo), THE "todoApp" SHALL treat the operation as unauthorized and SHALL respond with a business-level indication that authentication is required.
- WHEN an authenticated actor ("memberUser" or "adminUser") attempts an operation outside the permissions for their role (for example, a memberUser accessing another user's todo without authorization), THE "todoApp" SHALL treat the operation as forbidden and SHALL respond with a business-level indication that the action is not permitted for that actor.

### 6.2 Feedback for guestUser

- WHEN a "guestUser" attempts a todo-related action, THE "todoApp" SHALL indicate that login or account creation is required before personal todos can be used.

### 6.3 Feedback for memberUser

- WHEN a "memberUser" attempts to access a todo item that is not owned by that member, THE "todoApp" SHALL indicate that the todo does not belong to the member or that access is not permitted.
- WHEN a "memberUser" attempts an administrative operation, THE "todoApp" SHALL indicate that administrative permissions are required.

### 6.4 Feedback for adminUser

- WHEN an "adminUser" attempts an administrative operation that is not defined or allowed by policy, THE "todoApp" SHALL indicate that the operation is not permitted even for administrators.

## 7. Summary and Constraints

### 7.1 Minimal Scope Orientation

- THE "todoApp" actor and permission design SHALL target a minimal personal todo list use case, without collaborative sharing, teams, or advanced project management features.
- THE "todoApp" SHALL provide only essential permissions for personal todo management by "memberUser" and essential oversight by "adminUser".

### 7.2 Future Extensions

- WHERE future releases add collaboration (such as shared lists or team spaces), THE "todoApp" SHALL extend the actor and permission model defined here, preserving privacy for existing roles.
- WHERE future releases add richer audit, logging, or policy enforcement, THE "todoApp" SHALL treat the requirements in this document as baseline rules for actor behavior and access control.

### 7.3 Implementation Independence

- THE requirements in this specification SHALL be independent of any particular authentication technology, storage mechanism, or API design.
- THE backend implementation of todoApp SHALL satisfy these actor and permission rules regardless of chosen frameworks or infrastructure.