# Business Rules for Todo List Application

## Overview

This document defines the business rules and validation requirements that govern how the Todo list application functions. It establishes constraints on data handling, defines permissible operations, and clarifies the logical conditions under which the system operates.

## Data Validation Rules

### Task Creation Validation

WHEN a user submits a request to create a new task, THE system SHALL validate that:
- The task description is not empty
- The task description contains at least 1 character and no more than 255 characters
- Any optional due date provided is in valid ISO 8601 date format (YYYY-MM-DD)
- Any optional due date is either today or a future date (not in the past)

IF a user attempts to create a task with an empty description, THEN THE system SHALL reject the request and return an appropriate error message.

IF a user attempts to create a task with a description exceeding 255 characters, THEN THE system SHALL reject the request and return an appropriate error message.

IF a user provides a due date that is not in valid ISO 8601 format, THEN THE system SHALL reject the request and return an appropriate error message.

IF a user provides a due date that is in the past, THEN THE system SHALL reject the request and return an appropriate error message.

### Task Update Validation

WHEN a user submits a request to update an existing task, THE system SHALL validate that:
- The task description contains at least 1 character and no more than 255 characters
- Any optional due date provided is in valid ISO 8601 date format (YYYY-MM-DD)
- Any optional due date is either today or a future date (not in the past)

IF a user attempts to update a task with an empty description, THEN THE system SHALL reject the request and return an appropriate error message.

IF a user attempts to update a task with a description exceeding 255 characters, THEN THE system SHALL reject the request and return an appropriate error message.

IF a user provides a due date that is not in valid ISO 8601 format during an update, THEN THE system SHALL reject the request and return an appropriate error message.

IF a user provides a due date that is in the past during an update, THEN THE system SHALL reject the request and return an appropriate error message.

## Task Management Rules

### Task Ownership

THE system SHALL only allow users to access and modify tasks that belong to their own account.

WHEN a user attempts to access a task that does not belong to them, THE system SHALL deny access and return an appropriate error message.

WHEN a user attempts to modify a task that does not belong to them, THE system SHALL deny the modification and return an appropriate error message.

### Task Identification

THE system SHALL assign a unique identifier to each task when it is created.

THE unique identifier SHALL be a UUID (Universally Unique Identifier) format.

### Task Creation

WHEN a user submits valid task information, THE system SHALL create a new task with the following default properties:
- Status set to "pending"
- Created timestamp set to the current date and time
- Owner set to the authenticated user

### Task Retrieval

THE system SHALL allow users to retrieve all their tasks.

THE system SHALL return tasks sorted by creation date in descending order (newest first).

THE system SHALL include all task properties in retrieval results:
- Unique identifier
- Description
- Status (pending/completed)
- Creation timestamp
- Due date (if provided)
- Last modified timestamp

## Status Transition Rules

### Pending to Completed

WHEN a user marks a task as completed, THE system SHALL update the task status from "pending" to "completed".

WHEN a user marks a task as completed, THE system SHALL update the last modified timestamp to the current date and time.

IF a task is already in "completed" status, THEN THE system SHALL not change the status when a completion request is made, but may update the last modified timestamp.

### Completed to Pending

WHEN a user reopens or marks a completed task as pending, THE system SHALL update the task status from "completed" to "pending".

WHEN a user reopens a completed task, THE system SHALL update the last modified timestamp to the current date and time.

### Status Validation

IF a user attempts to set a task status to any value other than "pending" or "completed", THEN THE system SHALL reject the request and return an appropriate error message.

## Business Logic Constraints

### Task Modification Constraints

THE system SHALL only allow modification of the following task properties:
- Description
- Status
- Due date

THE system SHALL NOT allow modification of the following task properties:
- Unique identifier
- Creation timestamp
- Owner

WHEN a user attempts to modify a read-only property (unique identifier, creation timestamp, or owner), THE system SHALL ignore the modification request for that property while processing other valid modifications.

### Task Deletion

THE system SHALL allow users to delete their own tasks.

WHEN a user deletes a task, THE system SHALL permanently remove the task from storage.

WHEN a user attempts to delete a task that does not exist or does not belong to them, THE system SHALL return an appropriate error message.

### System Performance

THE system SHALL process all task operations (create, read, update, delete) within 2 seconds under normal operating conditions.

### Data Integrity

THE system SHALL maintain consistency between task status and modification timestamps, ensuring that every status change results in an updated modification timestamp.

THE system SHALL ensure that all stored tasks have valid owner references to authenticated users.

### Concurrent Access Handling

WHEN multiple update requests for the same task are received simultaneously, THE system SHALL process them sequentially to maintain data consistency.

### System Availability

THE system SHALL be available for task management operations 99.9% of the time during business hours (24/7).

## Error Handling and Validation

### Input Validation

THE system SHALL validate all user inputs before processing any task operations.

THE system SHALL provide clear, user-friendly error messages when validation fails.

### Invalid Operations

WHEN a user attempts to perform an operation that violates business rules, THE system SHALL reject the operation and provide a clear explanation of why the operation was rejected.

### System Failures

IF the system encounters an internal error during task processing, THEN THE system SHALL log the error for diagnostic purposes and return a generic error message to the user to prevent information disclosure.