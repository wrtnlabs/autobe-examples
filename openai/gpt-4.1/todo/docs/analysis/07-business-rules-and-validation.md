# Business Rules and Validation for Minimal Todo List Service

## Introduction
The Todo List Service defines strict business rules and validation requirements to provide minimal, robust task management for users. These requirements ensure data integrity, user privacy, and enforce a minimalist approach that excludes non-essential features. All requirements use EARS (Easy Approach to Requirements Syntax) for clarity and testability. All rules are mandatory and must be enforced by backend logic, with all errors resulting in user-visible messages.

## Task Naming and Description Rules
- WHEN a user creates a todo item, THE system SHALL REQUIRE a non-empty title of at least 1 character and at most 100 Unicode characters.
- WHEN a user provides a description, THE system SHALL ACCEPT descriptions up to 1,000 characters; IF the description exceeds the limit, THEN THE system SHALL REJECT the request with an error message.
- WHEN a user enters a title for a new todo, THE system SHALL ensure uniqueness among that user's active (not deleted) tasks; IF a duplicate is found, THE system SHALL REJECT with a message indicating titles must be unique.
- WHEN a title is missing or blank, or longer than 100 characters, THE system SHALL REJECT the operation with a validation error explaining the issue.

## Date and Time Constraints
- WHEN a user provides a due date, THE system SHALL accept only ISO 8601 date or datetime values, and THE due date SHALL NOT be earlier than the creation date of that item.
- WHEN a due date is invalid or earlier than creation, THE system SHALL REJECT the operation with an appropriate error message.
- WHEN an item is created, THE system SHALL record the timestamp according to ISO 8601 format with timezone.
- WHEN a todo is updated, THE system SHALL update a last-modified timestamp in ISO 8601 format.
- WHEN a todo is marked complete, THE system SHALL record a completion timestamp; when marked incomplete, THE completion timestamp SHALL be removed—but creation/last-modified must remain correct.

## Task Completion Rules
- WHEN a todo item is created, THE status SHALL default to incomplete.
- WHEN a user marks a task complete, THE status SHALL switch to complete and record the completion time.
- WHEN a user marks a task as incomplete after completion, THE system SHALL remove the completion timestamp but keep original created/updated timestamps unchanged.

## Item Ownership and Access Restrictions
- THE user SHALL ONLY be able to list, create, view, update, mark complete/incomplete, or delete their OWN tasks.
- WHEN a user tries to operate on a task NOT owned by them, THE system SHALL REJECT with an access-denied error message.
- WHEN tasks are listed, THE system SHALL always isolate user data so only a user's own tasks are accessible.
- WHEN a user deletes a task, THE system SHALL permanently delete it (hard-delete, not soft-delete) from that user's view and future access.
- WHEN a deleted or non-existent task is operated on, THE system SHALL present a user-facing error.

## Business Rule Matrix
| Feature                         | Condition               | Requirement                                                   |
|----------------------------------|-------------------------|---------------------------------------------------------------|
| Task Title                      | user request            | Required, 1-100 chars, unique per user, visible text only      |
| Description                     | user request            | Optional, max 1,000 chars if present                          |
| Due Date                        | user request            | Optional, ISO 8601, not before creation                       |
| Completion Status               | user action             | Must be "complete" or "incomplete"                            |
| Ownership                       | user/items              | Only create/read/update/delete own items                      |
| Deletion                        | user action             | Hard-delete; remove from retrieval forever                    |
| Timestamps                      | system action           | Auto-generated, not user-editable except via complete toggle  |
| API Access                      | backend                 | Must block access to tasks not owned by user                  |

## Error Handling Requirements
- WHEN required validation fails (e.g., missing/invalid title, too-long field, bad date format, duplicate title), THE system SHALL return a clear, actionable error explaining what is wrong and how to correct it.
- WHEN a user accesses or manipulates a task they do not own, THE system SHALL reject and show a not-authorized error.
- WHEN a requested task is missing (deleted or never existed), THE system SHALL show an error clearly stating the task is unavailable.
- WHEN an unknown business violation occurs, THE system SHALL provide a generic error without leaking internal details.

## Performance and Operational Constraints
- WHEN a user creates, updates, or deletes a task, THE system SHALL process and reflect changes immediately.
- WHEN standard CRUD actions occur, THE system SHALL respond within 2 seconds under normal operation.
- WHEN a user has many todos, THE system SHALL provide paginated retrieval, limiting to a maximum of 100 tasks per page.
- WHEN a user tries to exceed 1,000 active (undeleted) todos, THE system SHALL deny creation with an error message until tasks are deleted below the limit.

## Summary
Strict, minimal business rules for task creation, updating, completion, deletion, and listing are required. All rules focus on simplicity, privacy, and integrity. Backend implementation MUST enforce all rules exactly as specified to deliver a minimal, high-quality Todo List Service.