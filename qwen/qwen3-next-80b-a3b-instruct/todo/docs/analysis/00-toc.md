# Todo List Service Requirements Specification

## Service Overview

The Todo List service is a minimalist digital assistant designed to help individuals organize personal tasks through a simple, reliable, and private interface. The service addresses the fundamental human need to track and manage daily responsibilities without the complexity of project management tools, calendars, or collaborative features. It provides a clean, distraction-free experience focused solely on listing, tracking, and completing personal tasks. The service is built for individuals who need a straightforward way to remember what they need to do, without requiring training, collaboration, or team features.

## Business Model

### Why This Service Exists

Personal productivity tools have become increasingly complex, bundling task management with calendars, chat, file sharing, and team workflows. Most users do not need these advanced features—they simply need a way to remember their personal to-dos. Existing solutions often require sign-ups, subscriptions, or cloud synchronization that users distrust or find unnecessary. The Todo List service solves this by offering a zero-friction, single-user, email-based system where users own their data and control their experience. It targets individuals who value privacy, simplicity, and reliability over feature density.

### Revenue Strategy

The service follows a freemium model:
- **Free Tier**: Unlimited todo items, email-based authentication, basic sync (local storage with optional cloud backup via user-initiated export).
- **Premium Tier (Future)**: $2.99/month for cross-device sync (encrypted), automatic daily notification reminders, and advanced search/filter capabilities.

Revenue will be generated exclusively from users who voluntarily upgrade after experiencing core value. No ads, no data sales, and no forced tiers.

### Growth Plan

Growth will occur through organic, word-of-mouth adoption:
- Users recommend the service based on its simplicity and privacy.
- No paid acquisition, influencer marketing, or aggressive campaigns.
- Focus on perfecting the user experience for early adopters who value minimalism.

### Success Metrics

Success will be measured by:
- **Monthly Active Users (MAU)**: Target of 10,000 users within 12 months.
- **Daily Active Users (DAU)/MAU Ratio**: Target > 40%, indicating habitual use.
- **User Retention Rate**: 70% of users return after 30 days.
- **Conversion Rate to Premium**: Target of 5% of active users.
- **User Satisfaction (NPS)**: Target net promoter score of 50+.
- **Zero reported data breaches or privacy complaints.**

## User Actors and Permissions

The system defines two distinct user actors with clearly separated permissions:

### Guest
- A guest is an unauthenticated user who visits the application.
- A guest cannot view, create, edit, or delete any todo items.
- A guest can only see the public landing page containing service description and a registration form.
- A guest can submit an email address and password to register as a member.
- A guest’s registration attempt is validated only for syntactic correctness of email and password length.

### Member
- A member is an authenticated user who has successfully registered and logged in.
- A member can create new todo items.
- A member can view all their own todo items.
- A member can update the text and completion status of their own todo items.
- A member can delete their own todo items.
- A member cannot view, edit, or delete any todo items belonging to another user.
- A member must log in with a valid email and password to access their data.
- A member can log out to end their session.
- A member can reset their password using an email confirmation link.
- A member can change their password after authentication.
- A member’s data is stored only on systems they have access to via their authenticated credentials.

### Permission Matrix

| Action | Guest | Member |
|--------|-------|--------|
| View landing page | ✅ | ✅ |
| Register (create account) | ✅ | ❌ |
| Log in | ❌ | ✅ |
| Log out | ❌ | ✅ |
| View todo list | ❌ | ✅ |
| Create todo item | ❌ | ✅ |
| Edit todo item | ❌ | ✅ |
| Mark todo as completed | ❌ | ✅ |
| Delete todo item | ❌ | ✅ |
| Reset password | ❌ | ✅ |
| Change password | ❌ | ✅ |
| Access other users’ data | ❌ | ❌ |

## Core Functional Requirements

All functional requirements are expressed using EARS (Easy Approach to Requirements Syntax) to ensure testability and clarity.

### Todo Item Creation

WHEN a member submits a new todo item with text content, THE system SHALL create a new todo record with the following defaults:
- title: the text provided by the user
- completed: false
- createdAt: current server timestamp in ISO 8601 format
- updatedAt: current server timestamp in ISO 8601 format
- userId: the authenticated member’s ID

IF the todo item text is empty or contains only whitespace, THEN THE system SHALL reject the request and display the message: "Please enter a task description."

IF the todo item text exceeds 500 characters, THEN THE system SHALL truncate the content to 500 characters and display the message: "Your task has been shortened to 500 characters."

### Todo Item Retrieval

WHEN a member requests their todo list, THE system SHALL return all todo items belonging to their authenticated user ID, sorted by creation time descending (newest first).

THE system SHALL return exactly 0 to 500 todo items per request.

IF a member has no todo items, THE system SHALL return an empty list with no error.

### Todo Item Updates

WHEN a member updates an existing todo item’s text, THE system SHALL update the `title` field and set `updatedAt` to the current server timestamp.

WHEN a member toggles a todo item’s completion status, THE system SHALL flip the `completed` boolean value and set `updatedAt` to the current server timestamp.

IF the todo item ID provided does not belong to the authenticated member, THEN THE system SHALL return HTTP 403 with error code: "EF_ACCESS_DENIED".

IF the todo item ID does not exist in the database, THEN THE system SHALL return HTTP 404 with error code: "EF_ITEM_NOT_FOUND".

### Todo Item Deletion

WHEN a member deletes a todo item, THE system SHALL permanently remove the item from the database.

IF the todo item ID provided does not belong to the authenticated member, THEN THE system SHALL return HTTP 403 with error code: "EF_ACCESS_DENIED".

IF the todo item ID does not exist in the database, THEN THE system SHALL return HTTP 404 with error code: "EF_ITEM_NOT_FOUND".

### Todo Item Status Management

WHILE a todo item is marked as completed, THE system SHALL visually distinguish it as completed in the member’s list, typically with a strikethrough or checkbox.

WHILE a todo item is marked as incomplete, THE system SHALL display it as active and clickable for update.

THE system SHALL NOT automatically change the completion status of any todo item based on time or inactivity.

### Bulk Operations

WHEN a member attempts to delete multiple todo items in a single request, THE system SHALL process each item individually and return a success count and a failure list.

THE system SHALL NOT allow deletion of more than 100 items in a single bulk operation.

### Data Persistence

WHEN a member successfully completes an action on a todo item, THE system SHALL persist the change to durable storage before returning a success response.

WHEN the system experiences a failure during persistence, THEN THE system SHALL return HTTP 500 with error code: "EF_PERSISTENCE_FAILURE" and display: "We couldn't save your change. Please try again."

## User Scenarios

### Guest Journey: First Visit to Registration

A guest visits the website for the first time and sees a clean page with a heading "Simple Todo. No Logins. No Clutter." and a single input field for email and password. The guest enters a valid email address and a password of 8+ characters and clicks "Create Account". The system sends a confirmation email to the provided address. The guest clicks the link in the email and is redirected to the login page. The guest then logs in with the same email and password and is taken to their empty todo list.

### Member Journey: Logging In

A returning member visits the site and clicks "Log In". They enter their registered email and password and click "Sign In". The system verifies the credentials and creates a secure session. The member is redirected to their todo list. If the email does not exist, the system displays: "No account found with that email." If the password is incorrect, the system displays: "Incorrect password. Please try again." After three consecutive failures, the system displays: "Too many failed attempts. Please reset your password." The member can then initiate password reset.

### Member Journey: Creating a Todo Item

A member views their empty todo list. They see an input box labeled "What needs to be done?" They type: "Buy milk" and press Enter. The system adds "Buy milk" to the top of the list as an incomplete item. The member refreshes the page. The item "Buy milk" still appears in the list, unchanged.

### Member Journey: Marking Todo as Completed

A member sees the item "Buy milk" on their list. They click the checkbox next to it. The item immediately appears with a strikethrough. The checkbox is filled. The system updates the item in the database. The member refreshes the page. The item remains marked as completed.

### Member Journey: Editing an Existing Todo

A member sees the item "Buy milk" and realizes they need "Buy whole milk" instead. They click on the text. The system enters edit mode. They change the text to "Buy whole milk" and press Enter. The system updates the item in the database. The item now reads "Buy whole milk" and remains incomplete.

### Member Journey: Deleting a Todo

A member decides "Buy whole milk" was unnecessary. They hover over the item and see a trash icon. They click the trash icon. A confirmation dialog appears: "Delete this task? This cannot be undone." They click "Delete". The item disappears from the list permanently. The system confirms the deletion with a brief toast message: "Task deleted."

### Member Journey: Logging Out

A member finishes using the application and clicks the profile icon in the top right. They select "Log Out". Their session is immediately terminated. They are redirected to the landing page. All local session data is cleared. When returning later, they must log in again.

## Error Handling

All error conditions are described from the user's perspective. Technical error codes are included for developer reference.

IF a user attempts to register with an email already in use, THEN THE system SHALL display: "An account with this email already exists. Please log in or reset your password."

IF a user submits an invalid email format, THEN THE system SHALL display: "Please enter a valid email address (e.g., name@example.com)."

IF a user submits a password shorter than 8 characters, THEN THE system SHALL display: "Password must be at least 8 characters long."

IF a user attempts to delete a non-existent todo item, THEN THE system SHALL display: "The task you're trying to delete doesn't exist. It may have been removed already."

IF a user attempts to edit a todo item that belongs to another user, THEN THE system SHALL display: "You don't have permission to edit this task." (Not: "Access denied."

IF the server returns a 500 error during any operation, THEN THE system SHALL display: "Something went wrong on our end. Please try again later."

IF the user's internet connection is lost while saving a todo item, THEN THE system SHALL display: "Your changes weren't saved. Try again when you're back online."

IF a user submits a todo item with only special characters (e.g., !@#$%), THEN THE system SHALL display: "Please enter a meaningful task description."

## Performance Expectations

WHEN a member logs in, THE system SHALL respond with the todo list within 2 seconds, even over slow mobile networks.

WHEN a member creates a new todo item, THE system SHALL visually confirm the creation within 1 second.

WHEN a member opens the todo list, THE system SHALL display the list of items within 1.5 seconds, for up to 500 items.

WHEN a member edits a todo item, THE system SHALL update the UI immediately and save to server within 1.5 seconds.

WHEN a member deletes a todo item, THE system SHALL remove it from view immediately and complete deletion within 1 second.

THE user experience should feel "instant" for all interactions. Any delay longer than 2 seconds should be communicated with a visual spinner or progress indicator.

## Security and Compliance

WHEN a member submits a password, THE system SHALL not store it in plain text. The system SHALL hash passwords using bcrypt with cost factor 12 or higher.

WHEN a member's email is transmitted over the network, THE system SHALL use HTTPS encryption (TLS 1.3).

WHEN a member's data is stored on disk, THE system SHALL encrypt the database files at rest.

WHEN a member resets their password, THE system SHALL send a one-time use link valid for only 1 hour.

WHEN a member logs out, THE system SHALL immediately invalidate their access token and clear all client-side session data.

WHILE a member is logged in, THE system SHALL never send their email address or password to any third-party service.

THE system SHALL comply with the General Data Protection Regulation (GDPR) for users in the European Union.

THE system SHALL allow members to export all their data as a JSON file upon request.

THE system SHALL not collect usage analytics, advertising IDs, or device fingerprints.

## Future Considerations

The following features are potential enhancements for future versions and may not be implemented in the initial release:

- Cross-device synchronization (on premium subscription)
- Daily email reminders for uncompleted tasks
- Priority levels (low/medium/high) for todo items
- Due dates for items
- Subtasks within a todo item
- Search functionality across todo items
- Tagging or categorizing tasks
- Quick keyboard shortcuts for common actions
- Dark mode interface
- Integration with calendar apps (iCal or Google Calendar export)

These features are not required for the minimal viable product and must not be implemented unless explicitly requested in a future phase.

## Document References

This document provides the foundational context for building the Todo List system. All technical implementation decisions—including API design, database schema, authentication flow, and server architecture—are the responsibility of the development team.

For detailed authentication requirements, refer to the [Authentication Requirements Document](./02-authentication-requirements.md).

For comprehensive functional specifications, refer to the [Functional Requirements Document](./03-functional-requirements.md).

For end-to-end user interaction flows, refer to the [User Journey Documentation](./04-user-journey.md).

For error handling behavior, refer to the [Error Handling Specification](./05-error-handling.md).

For performance benchmarks, refer to the [Performance Requirements Document](./06-performance-requirements.md).

For security and compliance rules, refer to the [Security and Compliance Guide](./07-security-compliance.md).

For business logic and validation rules, refer to the [Business Rules Document](./08-business-rules.md).

For detailed actor permissions, refer to the [Actor Responsibilities Document](./09-actor-responsibilities.md).

For future enhancements, refer to the [Future Considerations Document](./10-future-considerations.md).

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*