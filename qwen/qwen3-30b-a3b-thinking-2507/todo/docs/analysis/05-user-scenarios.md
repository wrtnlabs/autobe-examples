# User Scenarios

## Service Context
The todoApp service provides fully private, multi-user todo management with comprehensive history tracking and trash management. Each user has complete control over their todo items without any access to other users' data.

## 1. New User Onboarding

### Business Requirements

#### Registration Flow
WHEN a new user signs up with email and password, THE system SHALL:
- Create a new user account with minimal required fields
- Send an email verification message to the provided email address
- Store the user's display name as empty by default
- Validate email format and password strength

WHEN the user provides their email and password during signup, THE system SHALL:
- Reject emails that are already registered
- Reject passwords that are less than 8 characters
- Reject passwords that don't contain at least one number
- Immediately show any validation errors

#### First-Time User Experience
WHEN a user successfully verifies their email, THE system SHALL:
- Automatically log the user into their new account
- Display a welcome message with instructions on creating their first todo
- Guide the user to set their display name in the profile section
- Show an empty todo list as the primary interface

### User Flow Diagram
```mermaid
graph LR
    A["User Visits Sign-up Page"] --> B{"Enters Email"}
    B --> C{"Valid Email?"}
    C -->|No| D["Show Error"]
    C -->|Yes| E{"Enters Password"}
    E --> F{"Valid Password?"}
    F -->|No| G["Show Error"]
    F -->|Yes| H["Submit Form"]
    H --> I["Send Verification Email"]
    I --> J["User Verifies Email"]
    J --> K["Log User In"]
    K --> L["Show Welcome Tour"]
```}

## 2. Core Todo Management

### Business Requirements

#### Creating Todos
WHEN a user creates a new todo, THE system SHALL:
- Require the title to be present (at least 1 character)
- Allow optional description (empty string permitted)
- Automatically set the initial state as incomplete
- Automatically set the creation date to current timestamp
- Store start and due dates as optional fields

#### Viewing Todo Lists
WHEN a user views their todo list, THE system SHALL:
- Show pagination with pages of 10 items each
- Display title, completion status, and creation date for each todo
- Show start date if provided, otherwise leave blank
- Show due date if provided, otherwise leave blank
- Sort todos by creation date (newest first) by default

#### Completion Toggle
WHEN a user clicks the completion toggle, THE system SHALL:
- Change the todo from incomplete to complete
- Change the todo from complete to incomplete
- Record the timestamp of the change
- Show immediate visual feedback of the state change

### User Flow Diagram
```mermaid
graph LR
    A["User Opens Todo List"] --> B{"Clicks 'Create Todo'"}
    B --> C["Enters Title/Description"]
    C --> D{"Start/Due Dates?"}
    D -->|Yes| E["Select Dates"]
    E --> F["Save Todo"]
    F --> G["New Todo Appears"]
    G --> H{"Clicks Completion Toggle"}
    H --> I["Changes State"]
    I --> J["Visual Feedback"]
```}

## 3. Editing Workflow

### Business Requirements

#### Editing Todos
WHEN a user edits a todo, THE system SHALL:
- Allow changing title, description, start date, and due date
- Automatically create an edit history entry for each change
- Track which fields changed and their new values
- Record the timestamp of the edit
- Not allow title updates that would create duplicate titles within the same user's todos

#### View Edit History
WHEN a user views the edit history of a todo, THE system SHALL:
- Display all history entries in order from most recent to oldest
- Show detailed information for each edit (which fields changed)
- Include timestamps for when each edit occurred
- Provide the ability to see the previous state of the todo before each edit

### Edit History Documentation
```markdown
| Action | Timestamp | Title | Description | Start Date | Due Date |
|--------|-----------|-------|-------------|------------|----------|
| Added | 2024-03-15T09:30:12Z | New Todo | Task for report | - | - |
| Edited | 2024-03-15T14:22:01Z | Updated Todo | Revised description | - | 2024-03-20T00:00:00Z |
| Edited | 2024-03-16T11:15:44Z | Finalized Task | Complete instructions now provided | - | 2024-03-22T00:00:00Z |
```}

## 4. Trash Management

### Business Requirements

#### Deleting Todos
WHEN a user deletes a todo, THE system SHALL:
- Mark the todo as deleted instead of immediately removing it
- Keep the todo in the system with a deletion timestamp
- Make the todo invisible in the regular todo list
- Retain all edit history entries for the todo

#### Trash View
WHEN a user views their trash, THE system SHALL:
- Show all deleted todos in paginated lists
- Display the same fields as regular todos (title, creation date, etc.)
- Include the deletion timestamp
- Allow viewing detailed information for todos in trash

#### Restoration
WHEN a user restores a todo from trash, THE system SHALL:
- Change the deletion status to active
- Move the todo back to the regular todo list
- Retain all history entries for the todo
- Show immediate confirmation of restoration

#### Permanent Deletion
WHEN a user permanently deletes a todo from trash, THE system SHALL:
- Delete the todo item completely from the database
- Delete all associated history entries
- Update the count of remaining todos
- Show confirmation of permanent deletion to the user

### Trash Management Diagram
```mermaid
graph TD
    A["User Deletes Todo"] --> B["Mark as Deleted"]
    B --> C["Remove from Active List"]
    C --> D["Add to Trash"]
    D --> E{"View Trash"}
    E --> F["Restore Todo"]
    F --> G["Move to Active List"]
    E --> H["Permanent Delete"]
    H --> I["Delete Record + History"]
```}

## Success Criteria
The user scenarios are considered successful when:

1. All user journeys can be completed without system errors
2. Every user action has clear visual feedback
3. Data persistence and integrity are maintained throughout all scenarios
4. All privacy requirements (no access to other users' data) are strictly enforced
5. The system consistently enforces all business rules specified in requirements

This document describes the business requirements for user scenarios in the todoApp service. All technical implementation details, architecture decisions, and API specifications are not documented here as this is strictly business requirements documentation for backend developers.