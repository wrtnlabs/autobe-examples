# Business Requirements Analysis: Todo Application

## 1. Introduction
This document defines all business requirements and operational rules for the Todo application. All requirements are specified in natural business language and describe expected system behavior from the user perspective.

## 2. Core Business Rules

### 2.1 Task Creation Requirements

- **Unique Title per User**: 
  "WHEN a user attempts to create a new task, THE system SHALL ensure that no other tasks with the same title exist in their task list."

- **Title Length Validation**:
  "WHEN a user submits a new task title, THE system SHALL validate that the title contains at least 3 characters and no more than 200 characters."

- **Trimming Whitespace**:
  "WHEN a user enters a task title, THE system SHALL automatically remove leading and trailing whitespace from the title before saving."

- **Default State**:
  "WHEN a user creates a new task, THE system SHALL set the task state to 'active' (not completed)."

### 2.2 Task Completion Rules

- **Completion State Change**:
  "WHEN a user marks a task as completed, THE system SHALL change the task state to 'completed' and record the completion timestamp."

- **Prevent Duplicate Completion**:
  "WHEN a user attempts to mark a completed task as completed again, THE system SHALL show a user message: 'This task is already marked as completed.'"

- **Reverting Completion**:
  "WHEN a user attempts to change a completed task's state, THE system SHALL change the state back to 'active' and record the reset timestamp."

### 2.3 Task Archiving

- **Archive Mechanism**:
  "WHEN a user archives a completed task, THE system SHALL change the task state to 'archived' and record the archiving timestamp."

- **Archive Visibility**:
  "WHEN a user views their task list, THE system SHALL not show archived tasks by default."

- **Archive Restoration**:
  "WHEN a user requests to restore an archived task, THE system SHALL change the state back to 'active' and add it to the main task list."

### 2.4 Task Deletion

- **Deletion Confirmation**:
  "WHEN a user requests to delete a task, THE system SHALL display a confirmation dialog: 'Are you sure you want to delete this task? This cannot be undone.'"

- **Confirmation Validation**:
  "WHEN a user confirms deletion, THE system SHALL permanently remove the task from storage without any archive recovery option."

- **Immediate Update**:
  "WHEN a task is deleted, THE system SHALL immediately update the user's task list display without requiring manual refresh."

## 3. Business Process Flows

### 3.1 Valid Task State Transitions
```
mermaid
graph LR
    A[Active] -->|Mark completed| B[Completed]
    B -->|Mark active| A
    B -->|Archive| C[Archived]
    C -->|Restore| A
    A -->|Delete| D[Deleted]
    B -->|Delete| D
    C -->|Delete| D
```

### 3.2 User Interaction Workflow

1. **Starting Task Management**:
   - The user opens the application
   - The system displays a blank task list interface

2. **Adding a New Task**:
   - User enters task title
   - System validates title length and uniqueness
   - Task appears as active in the list

3. **Marking Tasks Complete**:
   - User marks active task as completed
   - System updates state and timestamp

4. **Archiving Completed Tasks**:
   - User selects completed task for archiving
   - System moves task to archived state

5. **Restoring Archived Tasks**:
   - User requests to view archived tasks
   - System displays archived tasks
   - User restores task to active list

6. **Deleting Tasks**:
   - User selects task for deletion
   - System shows confirmation dialog
   - User confirms and task is permanently removed

## 4. Complete Business Rule Overview

| Rule Category        | Requirement                                                                 | EARS Format Compliance |
|----------------------|-----------------------------------------------------------------------------|------------------------|
| Task Title           | Must be 3-200 characters, unique per user, trimmed whitespace               | ✅                     |
| Task Default State   | All new tasks start as 'active'                                             | ✅                     |
| Completion Handling  | Can mark as complete, undo completion, but not re-mark completed tasks        | ✅                     |
| Archiving Mechanism  | Completed tasks can be archived; restore moves back to active               | ✅                     |
| Deletion Finality    | Requires confirmation; permanent removal with no recovery                   | ✅                     |
| Task State Transitions | Valid transitions: Active → Completed → Archived → Restore → Active         | ✅                     |

## 5. Success Criteria

For the application to be considered successful:

- All task creation operations follow title validation rules
- Users can complete, revert, and archive tasks without data loss
- Deleted tasks cannot be recovered
- State transitions follow the documented business rules
- All error messages are user-friendly and clear

> *This document defines ONLY business requirements. All technical implementation details (database schema, API endpoints, authentication) will be handled by subsequent development phases.*