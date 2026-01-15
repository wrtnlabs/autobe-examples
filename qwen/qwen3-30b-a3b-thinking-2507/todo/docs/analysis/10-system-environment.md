# Todo List Service Requirements

## Core Functional Requirements

### Task Creation

**WHEN** a user wants to add a new task, **THE** system **SHALL** prompt for a task title only.

**WHEN** a user provides a title, **THE** system **SHALL** store the task with only the title field, ignoring any additional input.

**WHEN** a user submits an empty title, **THE** system **SHALL** display an error: "Task title cannot be empty. Please enter a name for your task."

### System Constraints

**THE** system **SHALL** operate within the following bounds established by business environment:
- **Maximum users**: 500 active accounts
- **Maximum tasks per user**: 5,000 tasks
- **Response time**: ≤ 2 seconds for all operations
- **Uptime**: ≥ 99.5% 24/7

**WHEN** task count approaches 5,000 per user, **THE** system **SHALL** display a warning: "Your task list is nearing capacity. To continue adding tasks, please archive completed items."

### Business Model Constraints

**THE** system **SHALL** exclusively support:
- Task creation with title only
- No task completion marking
- No task deletion
- No user collaboration features

**WHEN** user attempts to mark a task as complete, **THE** system **SHALL** not support this action and display: "Task management is limited to adding tasks."

**THE** system **SHALL** never implement features beyond core task management functionality.

## Business Workflow Diagram

```mermaid
graph TD
    A[User Opens App] --> B[Clicks "Add Task"]
    B --> C[Enters Title]
    C --> D[Clicks "Save"]
    D --> E[Task Stored]
    E --> F[Task Appears in List]
```