## User Role Definition

The Todo List application serves exactly one user: the individual who creates, manages, and views their own personal tasks. This user is the sole operator of the system and is not required to authenticate via email, password, or any external identity provider.

There is only one user role in this system: **user**.

### Role Name

- **user**

### Role Description (Business Perspective)

The user is a single individual who uses the Todo List application exclusively for personal task management. This role has complete authority to perform all user-facing actions within the application, including creating new tasks, marking existing tasks as complete, deleting tasks, and viewing the full list of pending and completed tasks. No other users, guests, or shared access modes exist.

This role has no administrative, managerial, or supervisory capabilities beyond their own personal task list. The user cannot modify system settings, configure the application, manage other users, share tasks, or access any data or functionality beyond their own task records.

### Identity and Session Management

- The system does not require login or authentication.
- User identity is implicitly tied to the browser or device instance from which the application is accessed.
- Task data is persisted locally within the browser’s storage mechanism (e.g., localStorage), and remains available only to the same browser and device.
- Closing the browser or restarting the device does not erase task data — it persists until explicitly deleted by the user.
- There is no session token, username, password, or cookie used to identify the user.
- The system assumes that the person accessing the application at any time is the same individual who originally created the tasks.
- There is no multi-device or multi-browser synchronization. Each device/browser maintains a separate, isolated task list.

### Permissions Summary

The user role is granted the following permissions:

- **Create a new task**: The user may add a written task to the list.
- **Mark a task as completed**: The user may toggle the completion state of any task in their list.
- **Delete a task**: The user may remove any task from the list permanently.
- **View all tasks**: The user may see the full set of current tasks, including both active and completed items.
- **Persist task data**: The system automatically saves all task changes to local storage.
- **Re-access tasks after session closure**: The user may relaunch the application at any time and see the same task list as before.

The user is explicitly forbidden from:

- Creating or managing other user accounts.
- Accessing or modifying tasks from any other device or browser.
- Sharing, exporting, or importing task data.
- Setting due dates, reminders, priorities, categories, or tags.
- Sorting or filtering tasks by any criteria (e.g., date, status, text).
- Changing application settings, themes, or behavior.
- Performing any operation beyond the four core functions: add, mark, delete, view.

### Access Boundaries

This application enforces a strict one-to-one relationship:

| Access Type | Allowed? | Reason |
|-------------|----------|--------|
| Multiple users on one device | ❌ No | System assumes single-user ownership. |
| Same user on multiple devices | ❌ No | Task data is isolated to the browser/device that created it. |
| Guest/anonymous access | ❌ No | No authentication mechanism exists. Only the original browser retains data. |
| Data export/import | ❌ No | No file, cloud, or network-based data exchange is supported. |
| Task sharing | ❌ No | The system has no mechanism for sending, linking, or collaborating. |
| Cross-device sync | ❌ No | No server-side storage or synchronization layer is employed. |
| Task recovery after browser data clear | ❌ No | Deleting browser cache or local storage permanently deletes all tasks. |

### Authentication Flow

THE system SHALL NOT require any user registration, login, or authentication step.

WHEN a user opens the application in a web browser, THE system SHALL grant immediate access to the task list.

WHEN a user previously added tasks and closes the browser, THE system SHALL retain all tasks in browser-local storage and restore them automatically upon re-opening the application.

WHEN a user deletes browser local storage or clears cookies, THE system SHALL lose all task data and reset the list to empty — and SHALL not attempt to recover or restore any data without user action.

WHILE the application is active, THE system SHALL maintain in-memory state consistent with persistent local storage.

IF a user attempts to access a login, signup, or profile management interface, THE system SHALL NOT display such interfaces and SHALL operate solely as a single-user application with no authentication components.

### Session Behavior After Browser Closure

WHEN a user closes the browser completely, THE system SHALL preserve the task list in browser-local storage.

WHEN a user reopens the browser and navigates back to the Todo List application, THE system SHALL read the task list from local storage and display it immediately without prompting, asking for confirmation, or waiting for user input.

WHILE the application is not open, THE system SHALL NOT actively sync, transmit, or update data under any circumstance.

## Business Model Context

This application exists to solve the simple, universal problem: "How do I remember what I need to do at home or work?" The target user is an individual seeking a frictionless, distraction-free way to maintain a personal checklist. No user interaction, registration, or configuration is tolerable — the experience must be instant, silent, and reliable. Any addition beyond add/mark/delete/view introduces risk of cognitive load, complexity, and abandonment. The success metric is not user growth or engagement — it is daily, effortless usage by one person who can rely on the system to never lose their tasks if they use the same device.

## Integration with Other Documents

This document defines the sole user role and identity model for the application. It directly informs:

- [Functional Requirements Document](./02-functional-requirements.md): The permitted operations are defined here.
- [User Journeys Document](./03-user-journeys.md): The journey begins with direct access, not authentication.
- [Service Overview Document](./00-toc.md): Confirms the single-user, no-auth model.
- [Error Handling Document](./04-error-handling.md): Error conditions do not include authentication failures because authentication is not a feature.

## Final Authorization Statement

THE system SHALL operate under a single, implicit, device-bound user identity with no explicit identification or external authentication.

THE system SHALL NOT implement, request, store, or process any user credentials, tokens, identifiers, or session state beyond local storage.

THE system SHALL use the 'user' role for all permissions, and no other roles exist within the application.

WHEN any backend system operates this application, THE system SHALL implement only the "user" role permission matrix as defined above and SHALL NOT introduce role hierarchies, access control lists, or backend authentication services.