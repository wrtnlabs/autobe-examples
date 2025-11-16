# Business Rules and Validation for Todo Items

## 1. Introduction

This document defines the business rules and validation logic that govern how Todo data in the **todoApp** may be created, changed, and deleted. It translates the minimal Todo feature set into precise, testable requirements focused on data correctness, allowed values, and lifecycle behavior.

All requirements are expressed in natural language using EARS (Easy Approach to Requirements Syntax) to avoid ambiguity. The intent is that backend developers and QA engineers can implement and verify these rules without needing further clarification.

The document describes **what** the system must enforce from a business standpoint, not **how** to implement those rules. All technical design decisions (such as data models, API structures, and storage mechanisms) are left to the development team.

## 2. Scope and Relationship to Other Documents

This document focuses strictly on:
- Valid and invalid content for Todo items.
- Length and format constraints for fields.
- Which fields are required versus optional.
- Allowed state transitions (for example, active to completed).
- Business expectations for deletion and possible recovery.
- Consistency rules across features (for example, user ownership alignment).

It is consistent with and refines the Todo-related requirements described in the **Functional Requirements for Todo Features** document, referenced as the [Functional Requirements for Todo Features](./04-functional-requirements-todo.md).

## 3. Todo Content Rules

This section defines what content is considered valid for a Todo item at a business level. The focus is on the conceptual fields of a Todo, regardless of how they are implemented technically.

For the purposes of these rules, a Todo item conceptually contains at least the following fields:
- Title (short text describing the task)
- Description (longer, optional text providing details)
- Completion status (flag indicating whether the task is completed)
- Optional due date (calendar date by which the task should be done)
- Creation timestamp (when the Todo was created)
- Last modification timestamp (when the Todo was last updated)
- Ownership information (which user owns the Todo)
- Deletion status (whether the Todo is soft-deleted)

### 3.1 General Validity of a Todo Item

- THE **todoApp** SHALL treat a Todo as **valid** only when it satisfies all field-specific validation rules defined in this document.
- THE **todoApp** SHALL treat a Todo as **invalid** when any mandatory field is missing, violates length or format constraints, or contradicts state and consistency rules.

### 3.2 Title Rules

- THE **todoApp** SHALL require that every Todo has a non-empty title that describes the task in plain text.
- THE **todoApp** SHALL treat a title composed only of whitespace characters as invalid.

EARS requirements for title content:
- WHEN a **todoUser** creates a new Todo, THE **todoApp** SHALL require a title that contains at least one non-whitespace character.
- WHEN a **todoUser** updates a Todo title, THE **todoApp** SHALL reject titles that are composed only of whitespace characters.

### 3.3 Description Rules

- THE **todoApp** SHALL allow a description field to provide optional additional details about the task.
- THE **todoApp** SHALL allow an empty description when users do not want to add additional details.

EARS requirements for description content:
- WHEN a **todoUser** provides a description while creating or updating a Todo, THE **todoApp** SHALL accept any text that meets the length constraints defined in the length section.
- WHEN a **todoUser** omits a description, THE **todoApp** SHALL treat the description as absent and not as an error.

### 3.4 Completion Status Rules

- THE **todoApp** SHALL represent the completion status of each Todo as a boolean-like concept (completed vs not completed) from a business perspective.

EARS requirements:
- WHEN a **todoUser** creates a Todo without explicitly specifying completion status, THE **todoApp** SHALL treat the Todo as not completed.
- WHEN a **todoUser** sets the completion status to completed, THE **todoApp** SHALL ensure that state transition rules are respected.

### 3.5 Due Date Rules

- THE **todoApp** SHALL treat the due date as an optional calendar date indicating when the Todo is expected to be completed.

EARS requirements:
- WHEN a **todoUser** provides a due date for a Todo, THE **todoApp** SHALL require that the date is expressed as a valid calendar date according to the agreed business format (for example, a recognized calendar date without impossible values such as month 13 or day 32).
- WHEN a **todoUser** omits a due date, THE **todoApp** SHALL accept the Todo and treat the due date as absent.
- IF a **todoUser** attempts to set a due date that is not a valid calendar date, THEN THE **todoApp** SHALL reject the request and preserve the previous valid state of the Todo.

### 3.6 Ownership Rules

Ownership rules ensure that each Todo is strictly associated with one authenticated end user.

EARS requirements:
- WHEN a **todoUser** creates a Todo, THE **todoApp** SHALL assign ownership of the Todo to that **todoUser**.
- THE **todoApp** SHALL ensure that each Todo is associated with exactly one **todoUser** as its owner.
- IF a **guestUser** attempts to create, update, or delete a Todo, THEN THE **todoApp** SHALL reject the action.
- IF a **todoUser** attempts to access or modify a Todo that is not owned by that **todoUser**, THEN THE **todoApp** SHALL reject the action.

### 3.7 Timestamps Rules

- THE **todoApp** SHALL maintain creation and last modification timestamps for each Todo from a business perspective.

EARS requirements:
- WHEN a **todoUser** creates a new Todo, THE **todoApp** SHALL record a creation timestamp representing the time of creation.
- WHEN a **todoUser** updates a Todo, THE **todoApp** SHALL update the last modification timestamp to represent the time of the update.
- THE **todoApp** SHALL treat timestamps as read-only from the user perspective and shall not allow direct modification by end users.

## 4. Field Length and Format Constraints

This section defines the length and format constraints for each conceptual field in a Todo item. Values are chosen to balance usability with performance and storage considerations.

### 4.1 Title Length and Format

Business intent: Titles should be short, readable labels that can be easily scanned by users.

EARS requirements:
- THE **todoApp** SHALL require that the title length is at least 1 visible character and at most 200 characters.
- WHEN a **todoUser** submits a title longer than 200 characters, THE **todoApp** SHALL reject the request and indicate that the title is too long.
- WHEN a **todoUser** submits a title containing control characters or characters that violate basic text encoding constraints agreed for the service, THE **todoApp** SHALL reject the request.

### 4.2 Description Length and Format

Business intent: Descriptions may be longer but should still have a practical limit.

EARS requirements:
- THE **todoApp** SHALL allow the description to be empty or omitted.
- WHERE a description is provided, THE **todoApp** SHALL require that the description length is at most 2000 characters.
- WHEN a **todoUser** submits a description longer than 2000 characters, THE **todoApp** SHALL reject the request and indicate that the description is too long.

### 4.3 Due Date Format

EARS requirements:
- THE **todoApp** SHALL require that due dates, when provided, follow a consistent date representation that can unambiguously identify a calendar day.
- IF a **todoUser** submits a due date that does not conform to the required date representation or is not a valid calendar date, THEN THE **todoApp** SHALL reject the request.

### 4.4 Internal Identifier Format (Conceptual)

Even though identifiers are technical in nature, there is a business expectation that they are unique and stable for each Todo.

EARS requirements:
- THE **todoApp** SHALL assign a unique identifier to each Todo at creation time.
- THE **todoApp** SHALL treat this identifier as immutable for the lifetime of the Todo, including across state changes and soft deletion.

## 5. Required vs Optional Fields

This section clarifies which fields must always be present and which are optional from a business perspective.

### 5.1 Required Fields on Creation

EARS requirements:
- WHEN a **todoUser** creates a Todo, THE **todoApp** SHALL require the following fields as mandatory:
  - Title
- WHEN a **todoUser** creates a Todo, THE **todoApp** SHALL automatically set or derive the following mandatory fields:
  - Ownership (from the authenticated **todoUser**)
  - Creation timestamp
  - Last modification timestamp (initially equal to creation timestamp)
  - Completion status (initially not completed)
  - Deletion status (initially not deleted)

### 5.2 Optional Fields on Creation

EARS requirements:
- WHEN a **todoUser** creates a Todo, THE **todoApp** SHALL treat the following fields as optional:
  - Description
  - Due date
- WHEN a **todoUser** omits any optional field, THE **todoApp** SHALL treat the field as absent and not as an error.

### 5.3 Required Fields on Update

EARS requirements:
- WHEN a **todoUser** updates a Todo, THE **todoApp** SHALL require the Todo identifier and ownership context to identify the Todo to be updated.
- WHEN a **todoUser** updates any field of a Todo, THE **todoApp** SHALL require that all new values comply with the field-specific constraints defined in this document.
- WHEN a **todoUser** performs a partial update that omits some fields, THE **todoApp** SHALL preserve the existing values of omitted fields.

## 6. State Transition Rules for Todo Items

This section defines conceptual states for a Todo and allowed transitions among them.

From a business perspective, a Todo can be in one of the following high-level states:
- **Active**: Not completed and not deleted.
- **Completed**: Marked as completed and not deleted.
- **Deleted**: Marked as soft-deleted (conceptually archived or removed from normal views).

### 6.1 Initial State

EARS requirements:
- WHEN a **todoUser** creates a new Todo, THE **todoApp** SHALL set the Todo state to **Active**.

### 6.2 Transition Between Active and Completed

EARS requirements:
- WHEN a **todoUser** marks an **Active** Todo as completed, THE **todoApp** SHALL change the state from **Active** to **Completed**.
- WHEN a **todoUser** marks a **Completed** Todo as not completed, THE **todoApp** SHALL change the state from **Completed** to **Active**.
- WHEN a **todoUser** toggles the completion status of a Todo, THE **todoApp** SHALL update any derived completion-related metadata (for example, completion timestamp) consistently.

### 6.3 Transition to Deleted (Soft Deletion)

EARS requirements:
- WHEN a **todoUser** deletes an **Active** Todo, THE **todoApp** SHALL change the state from **Active** to **Deleted**.
- WHEN a **todoUser** deletes a **Completed** Todo, THE **todoApp** SHALL change the state from **Completed** to **Deleted**.
- IF a Todo is in **Deleted** state, THEN THE **todoApp** SHALL prevent further updates to its content other than possible restoration or permanent deletion, according to the deletion behavior rules.

### 6.4 Restrictions on State Transitions

EARS requirements:
- IF a Todo is in **Deleted** state, THEN THE **todoApp** SHALL prevent transitions directly back to **Active** or **Completed** unless a business-level restoration feature is explicitly provided.
- WHERE a restoration feature is provided, THE **todoApp** SHALL allow transitions from **Deleted** back to **Active** only, not directly to **Completed**.

### 6.5 Mermaid Diagram: State Transitions

```mermaid
stateDiagram-v2
    "Start" --> "Active"
    "Active" --> "Completed": "Mark Completed"
    "Completed" --> "Active": "Mark Not Completed"
    "Active" --> "Deleted": "Delete"
    "Completed" --> "Deleted": "Delete"
```

This diagram illustrates the conceptual state transitions for a Todo item, consistent with the EARS requirements above.

## 7. Soft vs Hard Deletion Behavior

This section defines whether deletion is reversible from a business perspective and what users can expect.

### 7.1 Soft Deletion as Default Behavior

Business intent: For a minimal version of the Todo service, deletion should be safe and reversible within reasonable constraints, but not necessarily indefinitely.

EARS requirements:
- THE **todoApp** SHALL treat user-triggered deletion as **soft deletion** by default, such that deleted Todos are excluded from normal user views but remain stored for potential recovery or auditing.
- WHEN a **todoUser** deletes a Todo, THE **todoApp** SHALL set the Todo state to **Deleted** and keep its ownership and timestamps.

### 7.2 Visibility of Soft-Deleted Todos

EARS requirements:
- WHEN a Todo is in **Deleted** state, THE **todoApp** SHALL exclude it from all standard Todo listings visible to the **todoUser**.
- WHERE a business feature such as a "trash" or "recently deleted" view is provided, THE **todoApp** SHALL show only soft-deleted Todos owned by the requesting **todoUser** in that view.

### 7.3 Restoration Behavior (Optional Feature)

EARS requirements:
- WHERE a restoration feature is enabled, THE **todoApp** SHALL allow a **todoUser** to restore a soft-deleted Todo owned by that **todoUser** from **Deleted** state back to **Active** state.
- IF a **todoUser** attempts to restore a Todo not owned by that **todoUser**, THEN THE **todoApp** SHALL reject the request.

### 7.4 Hard Deletion Behavior

Hard deletion refers to permanent removal of data such that it is no longer available for restoration.

EARS requirements:
- WHERE a business rule requires permanent deletion (for example, user-initiated account removal), THE **todoApp** SHALL perform hard deletion of Todos associated with that account in accordance with data lifecycle and retention policies.
- IF hard deletion is performed, THEN THE **todoApp** SHALL ensure that deleted Todos are no longer accessible to any user actor.

## 8. Consistency Rules Across Features

Consistency rules ensure that Todo-related behavior remains predictable and coherent across all operations.

### 8.1 Ownership and Access Consistency

EARS requirements:
- THE **todoApp** SHALL ensure that ownership of a Todo cannot be changed through normal Todo operations.
- IF a **todoUser** attempts to reassign ownership of a Todo to another user, THEN THE **todoApp** SHALL reject the request.

### 8.2 Listing and Filtering Consistency

Business intent: Listing features should consistently apply the same rules used during creation and modification.

EARS requirements:
- WHEN a **todoUser** lists Todos, THE **todoApp** SHALL return only Todos owned by that **todoUser** that are not soft-deleted, unless the request explicitly targets a "trash" or equivalent deleted-items view.
- WHEN a **todoUser** filters by completion status, THE **todoApp** SHALL interpret completion status based on the current state (Active vs Completed) of the Todo.
- WHEN a **todoUser** filters by due date range, THE **todoApp** SHALL include only Todos with due dates that fall within the specified range.

### 8.3 Validation Consistency Between Create and Update

EARS requirements:
- THE **todoApp** SHALL apply the same validation rules to a field during update as during creation.
- WHEN validation rules change over time for business reasons, THE **todoApp** SHALL apply the new rules to new and updated Todos while preserving existing data that was valid under previous rules, unless a specific data migration policy is defined.

### 8.4 Completion and Due Date Consistency

EARS requirements:
- WHEN a **todoUser** marks a Todo as completed, THE **todoApp** SHALL allow any valid due date, including dates in the past or future.
- IF the business policy later requires that overdue Todos be treated differently, THEN THE **todoApp** SHALL reflect this through additional rules and features without altering the basic validation of due dates as described in this document.

### 8.5 Deletion and Listing Consistency

EARS requirements:
- WHEN a Todo is in **Deleted** state, THE **todoApp** SHALL prevent it from appearing in standard active or completed lists.
- WHERE a business feature exists for viewing deleted items, THE **todoApp** SHALL ensure that all Todos in **Deleted** state are visible only in that context and only to their respective owners or authorized administrators.

## 9. Business-Focused Performance and UX Expectations for Validation

This section describes how quickly validation-related feedback should be presented from a user perspective.

EARS requirements:
- WHEN a **todoUser** submits a create or update request that fails validation, THE **todoApp** SHALL return a validation result within 2 seconds under normal operating conditions.
- WHEN validation fails, THE **todoApp** SHALL provide a clear indication of which field or rule caused the failure in business terms (for example, title too long, invalid date, missing required title).
- THE **todoApp** SHALL ensure that validation failures do not partially apply changes; either all requested changes that pass validation are applied, or none are applied.

## 10. Mermaid Diagram for Validation Flow

The following diagram illustrates at a high level how a create or update request flows through validation and results in success or error from a business perspective.

```mermaid
graph LR
  "User Submits Create/Update Request" --> "Check Authentication and Ownership"
  "Check Authentication and Ownership" --> "Auth and Ownership Valid?"
  "Auth and Ownership Valid?" -->|"No"| "Reject Request (Unauthorized Access)"
  "Auth and Ownership Valid?" -->|"Yes"| "Validate Required Fields (Title, Identifier)"
  "Validate Required Fields (Title, Identifier)" --> "Required Fields Valid?"
  "Required Fields Valid?" -->|"No"| "Reject Request (Missing or Empty Title)"
  "Required Fields Valid?" -->|"Yes"| "Validate Length and Format (Title, Description, Due Date)"
  "Validate Length and Format (Title, Description, Due Date)" --> "Lengths and Formats Valid?"
  "Lengths and Formats Valid?" -->|"No"| "Reject Request (Length/Format Error)"
  "Lengths and Formats Valid?" -->|"Yes"| "Validate State Transition Rules"
  "Validate State Transition Rules" --> "State Transition Allowed?"
  "State Transition Allowed?" -->|"No"| "Reject Request (Invalid State Change)"
  "State Transition Allowed?" -->|"Yes"| "Apply Changes and Update Timestamps"
  "Apply Changes and Update Timestamps" --> "Return Success Response"
```

This diagram is aligned with the narrative rules defined in previous sections and can be used by developers to understand the sequence of validations to apply.

---

This document defines business requirements only. All technical implementation decisions, including architecture, APIs, and database design, are at the discretion of the development team. The document specifies what the todoApp must do to enforce consistent and correct Todo behavior, not how these behaviors are technically realized.