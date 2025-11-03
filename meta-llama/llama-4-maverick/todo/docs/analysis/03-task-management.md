## Task Management Requirements

### Overview
The task management functionality is a core component of the Todo list application. It enables users to manage their tasks efficiently by performing CRUD (Create, Read, Update, Delete) operations.

### Functional Requirements

1. **Task Creation**
   - Users can create new tasks with a title and description.
   - The task title is mandatory, while the description is optional.
   - WHEN a user creates a new task, THE system SHALL validate that the task title is not empty.
   - IF the task title is empty, THEN THE system SHALL display an error message.

2. **Task Reading**
   - Users can view all their existing tasks.
   - Users can view the details of a specific task.
   - THE system SHALL display tasks in a list with their status.
   - WHEN a user requests to view task details, THE system SHALL display the task title, description, and status.

3. **Task Update**
   - Users can update the title and description of existing tasks.
   - WHEN a user updates a task, THE system SHALL validate that the new task title is not empty.
   - IF the new task title is empty, THEN THE system SHALL display an error message.

4. **Task Deletion**
   - Users can delete existing tasks.
   - WHEN a user deletes a task, THE system SHALL prompt for confirmation before deleting.
   - IF the user confirms, THEN THE system SHALL delete the task.

### Non-Functional Requirements

1. **Performance**
   - THE system SHALL respond quickly to user interactions.
   - THE system SHALL handle a reasonable number of tasks without performance degradation.

2. **Security**
   - THE system SHALL ensure that user data is stored securely.
   - THE system SHALL restrict access to authorized users only.

3. **Usability**
   - THE system SHALL be easy to use for users with minimal training.
   - THE user interface SHALL be intuitive and user-friendly.

### Technical Requirements

1. **Backend Technology**
   - The backend SHALL be built using TypeScript and NestJS framework.
   - The database SHALL be managed using Prisma.

2. **API Endpoints**
   - API endpoints SHALL be created for CRUD operations on tasks.

### EARS Format Examples

- Ubiquitous: "THE system SHALL display tasks in a list with their status."
- Event-driven: "WHEN a user creates a new task, THE system SHALL validate that the task title is not empty."
- State-driven: "WHILE a task is being edited, THE system SHALL prevent other users from editing it."
- Unwanted Behavior: "IF the task title is empty, "
- Optional Features: "WHERE a user has permission to delete tasks, THE system SHALL prompt for confirmation before deleting."

By following these requirements, the task management functionality SHALL be implemented effectively, providing users with a robust and user-friendly experience.