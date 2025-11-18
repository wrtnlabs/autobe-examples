# Error Handling and Exception Scenarios – Requirements Summary

## 1. Purpose

The todoApp backend must provide clear, consistent, user‑friendly handling of all failures that can occur in a minimal Todo list service. The system must always:
- Clearly tell the user whether an operation succeeded or failed.
- Use simple, non-technical language in a single base language (English in the first version).
- Avoid leaking internal technical details or sensitive information.
- Give the user a clear next step (retry, fix input, sign in, or wait).

## 2. General Error-Handling Behavior

### 2.1 Core Principles (EARS)

- THE system SHALL always return a clear success or error outcome for each request, with no ambiguous partial success.
- WHEN an error occurs, THE system SHALL include a machine-readable error type that clients can map to human-readable text.
- IF invalid user input causes an error, THEN the system SHALL identify which field(s) are invalid or missing where possible.
- IF authentication or authorization fails, THEN the system SHALL not reveal whether specific resources or accounts exist.

### 2.2 Message Style and Language

- THE system SHALL use simple, direct English text for all error messages in the first version.
- THE system SHALL distinguish between errors that the user can fix (e.g., invalid input, missing login) and those that are temporary/system issues.
- THE system SHALL avoid technical jargon, stack traces, and infrastructure details in all user-visible messages.

### 2.3 Monitoring (business view)

- THE system SHALL log enough information about each error so operators can monitor error rates and investigate recurring problems.
- IF error patterns indicate systemic issues (e.g., frequent rate limiting), THEN operators SHALL be able to identify them via operational tools.

## 3. Authentication and Authorization Error Requirements

### 3.1 Registration

Assumption: Users register with at least email and password.

- WHEN a registration request has invalid data (e.g., invalid email format, password too short), THE system SHALL reject it and indicate which fields need correction.
- WHEN a registration request omits required fields, THE system SHALL reject it and indicate which required fields are missing.
- WHEN a user tries to register with an email already in use, THE system SHALL reject the registration and indicate that the email is already registered.
- IF an internal error happens after input validation during registration, THEN THE system SHALL report that registration could not be completed and ask the user to try again later, without revealing internal details.

### 3.2 Login

- WHEN a user provides non-existing email or wrong password, THE system SHALL respond with a single generic invalid‑credentials message and SHALL NOT confirm whether the email exists.
- WHEN a login request omits required fields (e.g., missing password), THE system SHALL reject it and state that mandatory information is missing.
- IF failed login attempts exceed a threshold in a short period, THEN THE system SHALL temporarily block further login attempts for that account or client and show a message about too many failed attempts.
- IF a system failure prevents login, THEN THE system SHALL show a temporary issue message and ask the user to try again later.

### 3.3 Logout and Session Expiry

- WHEN a logged-in user requests logout with an invalid or expired session token, THE system SHALL treat the user as logged out from their perspective (no error required).
- WHILE a session is valid, THE system SHALL accept authenticated requests for that session.
- WHILE a session is expired or revoked, THE system SHALL treat all authenticated requests as unauthenticated.
- IF a user uses an expired or revoked token for a protected action, THEN THE system SHALL respond with a message that the session has expired and that the user must sign in again.

### 3.4 Authorization (Permissions)

Actors: guestUser, memberUser, adminUser.

- WHEN a guestUser attempts any action that requires authentication (e.g., creating or managing todos), THE system SHALL deny the request and instruct the user to sign in.
- WHEN a memberUser tries to access or modify another user’s todo, THE system SHALL behave as if the todo does not exist and SHALL NOT reveal ownership.
- WHEN a memberUser tries an admin-only operation, THE system SHALL deny the request and state that the user lacks permission.
- WHEN an adminUser tries an operation that is not allowed for any user by business rules, THE system SHALL deny the request with a generic no‑permission message.
- IF an authorization check fails for any authenticated user, THEN THE system SHALL not expose sensitive details about the target resource.

## 4. Todo Operation Error Requirements

Todo operations include create, read/list, update, complete/reopen, and delete.

### 4.1 Create Todo

- WHEN a memberUser or adminUser sends a create‑todo request missing required fields (e.g., title), THE system SHALL reject it and indicate which fields are required.
- WHEN provided todo data violates validation rules (e.g., title too long), THE system SHALL reject the request and indicate which fields need adjustment.
- WHEN a guestUser tries to create a todo, THE system SHALL reject the request and require sign-in.
- IF an internal error occurs after validation during todo creation, THEN THE system SHALL not create a partial todo and SHALL show a generic failure message with guidance to retry later.

### 4.2 Read and List Todos

- WHEN a memberUser or adminUser requests a todo that does not exist, THE system SHALL respond that the todo is not available.
- WHEN a memberUser requests another user’s todo, THE system SHALL behave as if the todo does not exist.
- WHEN list or filter parameters are invalid (e.g., invalid pagination values), THE system SHALL reject the request and indicate that listing parameters are invalid.
- WHEN a guestUser tries to view personal todos, THE system SHALL require sign-in.
- IF an internal error occurs while listing or retrieving todos, THEN THE system SHALL inform the user that todos could not be loaded and suggest refreshing or retrying later.

### 4.3 Update Todo

- WHEN an update targets a todo that does not exist, THE system SHALL respond that the todo is not available.
- WHEN a memberUser attempts to update another user’s todo, THE system SHALL behave as if the todo does not exist.
- WHEN updated fields violate validation rules (e.g., empty title), THE system SHALL reject the update and indicate which fields are invalid.
- WHEN a guestUser attempts to update a todo, THE system SHALL require sign-in.
- IF an internal error occurs after validation during update, THEN THE system SHALL keep the previous saved state and report that the changes could not be saved.

### 4.4 Complete and Reopen Todo

- WHEN a memberUser attempts to complete or reopen a todo that does not exist, THE system SHALL respond that the todo is not available.
- WHEN a memberUser attempts to change completion state of another user’s todo, THE system SHALL behave as if the todo does not exist.
- WHEN a guestUser attempts to complete or reopen a todo, THE system SHALL require sign-in.
- WHERE completion or reopening is idempotent, THE system SHALL respond with success even if the todo is already in the requested state.
- IF an internal error occurs while changing completion state, THEN THE system SHALL maintain a consistent state (old or new according to business rules) and inform the user that the action failed.

### 4.5 Delete Todo

- WHEN a memberUser attempts to delete a todo that does not exist, THE system SHALL respond that the todo is not available.
- WHEN a memberUser attempts to delete another user’s todo, THE system SHALL behave as if the todo does not exist.
- WHEN a guestUser attempts to delete a todo, THE system SHALL require sign-in.
- WHERE delete is idempotent, THE system SHALL treat a repeated delete on an already deleted todo as a successful no‑op.
- IF an internal error prevents deletion, THEN THE system SHALL keep the todo in a consistent state and inform the user that deletion failed.

### 4.6 Shared Todo Error Rules (EARS Summary)

- WHEN todo input is invalid or incomplete for create or update, THE system SHALL reject the request and identify problematic fields as far as possible.
- WHEN a todo is missing or inaccessible to the requesting user, THE system SHALL respond as "not available" without exposing ownership or existence details.
- IF an internal error occurs during create, read, update, complete, reopen, or delete, THEN THE system SHALL maintain consistent data and inform the user that the operation failed.
- WHERE operations are defined as idempotent, THE system SHALL respond as success on repeated calls that do not change state.

## 5. System-Level, Timeout, and Rate-Limiting Errors

### 5.1 Service Unavailable and Dependency Failures

- WHEN todoApp is in planned maintenance or otherwise unavailable, THE system SHALL inform clients that the service is temporarily unavailable and ask users to try again later.
- WHEN a dependency failure prevents processing a request, THE system SHALL respond with a generic error message (e.g., "Something went wrong. Please try again later") without technical details.
- IF a severe failure affects multiple requests, THEN THE system SHALL still use only generic, non-technical messages.

### 5.2 Timeouts and Concurrency Conflicts

- WHEN processing a request exceeds the acceptable time, THE system SHALL treat it as failed and allow the client to inform the user that the request timed out.
- IF a timeout occurs after a partial internal effect, THEN THE system SHALL ensure eventual consistency so that subsequent requests either succeed fully or inform the user of the final state.
- WHEN concurrent operations conflict, THE system SHALL resolve the conflict using defined business rules and report to the affected user if their changes were not applied.
- IF a concurrency conflict prevents saving changes, THEN THE system SHALL notify the user that the todo was changed elsewhere and suggest refreshing and retrying.

### 5.3 Rate Limiting

- WHEN a user or client sends too many requests in a short period, THE system SHALL apply rate limiting and respond with a message equivalent to "Too many requests. Please wait and try again."
- WHERE different rate limits apply per actor type, THE system SHALL enforce them without exposing exact thresholds to users.
- IF rate limiting is triggered, THEN THE system SHALL only temporarily restrict the user and SHALL allow normal usage after a cooldown period.

## 6. User Recovery Paths

### 6.1 Authentication and Authorization Recovery

- WHEN a user gets invalid‑credentials errors, THE system SHALL allow immediate retry with corrected credentials.
- WHEN a user sees a session‑expired message, THE system SHALL allow them to log in again and then continue using the service.
- WHERE password reset exists, THE system SHALL allow users who cannot remember their password to start a reset flow.
- IF an account is temporarily locked due to too many failed logins, THEN THE system SHALL communicate the lock duration and allow normal login after the lock period.

### 6.2 Todo Operation Recovery

- WHEN todo creation fails due to validation errors, THE system SHALL allow the user to correct the fields and resubmit.
- WHEN update, complete, reopen, or delete fails due to transient system issues, THE system SHALL allow users to retry the operation.
- WHEN a todo is reported as not available (deleted or never existed), THE system SHALL guide users to refresh their todo list.

### 6.3 System-Level and Rate-Limit Recovery

- WHEN a user sees a service-unavailable or generic technical error, THE system SHALL guide them to try again later, assuming the system will recover without extra user action.
- WHEN a rate limit message appears, THE system SHALL indicate that waiting a short period before retrying is sufficient.
- IF persistent errors affect a single user for an extended time, THEN the client MAY direct that user to a support or feedback channel defined by operations.

### 6.4 Self-Service vs Support

- THE system SHALL favor self-service recovery (correct input, retry, refresh, password reset) for all common error scenarios.
- WHERE self-service cannot resolve the issue (persistent or unexpected errors), THE system SHALL allow integration with a support or contact channel so that the user can escalate.

## 7. Consistency, Security, and Privacy in Errors

- THE system SHALL keep error messages consistent in wording and behavior across endpoints for the same error type (e.g., all unauthenticated access errors behave similarly).
- THE system SHALL treat unauthorized or non-existent todos uniformly as "not available" across all endpoints.
- THE system SHALL ensure that no error message reveals sensitive personal data or internal identifiers that could be abused.
- IF an error involves sensitive operations (authentication, access control), THEN THE system SHALL avoid mentioning whether a particular account or todo exists.
- IF system-level failures occur, THEN THE system SHALL avoid including internal system configuration, file paths, or stack traces in responses.

## 8. Example Recovery Flows (Conceptual)

The system must support flows equivalent to these conceptual diagrams:

### 8.1 Login Failure and Recovery

1. User submits login credentials.
2. System validates credentials.
3. IF valid, THEN system creates a session and logs the user in.
4. IF invalid, THEN system shows a generic invalid‑credentials message.
5. IF failures exceed configured threshold, THEN system shows a temporary lockout message and prevents further attempts until cooldown expires.

### 8.2 Todo Update Failure and Recovery

1. User submits todo update.
2. System validates the new todo data.
3. IF validation fails, THEN system shows which fields are invalid and allows resubmission.
4. IF validation passes, THEN system attempts to save changes.
5. IF save succeeds, THEN system confirms the update.
6. IF save fails due to internal error or conflict, THEN system shows a generic save‑failed message and allows retry or refresh.

### 8.3 Rate Limiting and Recovery

1. User or client sends multiple requests.
2. System checks current rate usage.
3. IF usage is within limit, THEN requests are processed normally.
4. IF usage exceeds limit, THEN system responds with a rate‑limit message and refuses further requests during cooldown.
5. After cooldown, user can send requests again normally.

These summarized requirements define how the minimal todoApp backend must behave in all relevant error and exception scenarios, focusing on user-visible behavior, security, and recovery paths, without prescribing any particular technical implementation details.