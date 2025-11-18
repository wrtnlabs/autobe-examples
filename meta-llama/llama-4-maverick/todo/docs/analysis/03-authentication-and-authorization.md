# Todo List Application Requirements

## Overview
The Todo list application will allow users to manage their tasks efficiently. The core functionality will include creating, reading, updating, and deleting (CRUD) tasks.

## Functional Requirements

1. **Task Management**
   - Users can create new tasks with a title and description.
   - Users can view all tasks.
   - Users can update the title and description of existing tasks.
   - Users can delete tasks.
   - Users can mark tasks as completed.

2. **Task Attributes**
   - Each task will have the following attributes:
     - `id` (unique identifier)
     - `title`
     - `description`
     - `completed` (boolean indicating whether the task is completed)
     - `created_at` (timestamp when the task was created)
     - `updated_at` (timestamp when the task was last updated)

## Non-Functional Requirements

1. **Performance**
   - The application should respond quickly to user interactions.
   - The database should be optimized for efficient data retrieval and storage.

2. **Security**
   - The application should ensure that user data is protected.
   - Access to the application and its data should be restricted to authorized users.

## Technical Requirements

1. **Backend Technology**
   - The backend will be built using TypeScript and NestJS framework.
   - The database will be managed using Prisma.

2. **API Design**
   - The application will expose RESTful APIs for task management.
   - API endpoints will be designed to support CRUD operations on tasks.

## Authentication and Authorization

1. **User Actors**
   - The application will have one user actor: **User**.

2. **Authentication Flow**
   - Users can register by providing a unique username and a valid email address along with a password.
   - Users can log in using their username and password.
   - Upon successful login, a session token (JWT) will be generated to authenticate subsequent requests.
   - Users can log out, which will invalidate their session token.

3. **Authorization Rules**
   - **Task Ownership**: Users can only view, update, and delete tasks that they own.
   - **Access Control**: All task operations (CRUD) will be restricted to authenticated users.
   - **Permission Checks**: The application will verify the ownership of tasks before allowing any modifications.

## Implementation Details

1. **Authentication Mechanism**
   - The authentication mechanism will be implemented using JSON Web Tokens (JWT).
   - The JWT will contain the user's ID and will be signed with a secret key stored securely on the server.

2. **Security Considerations**
   - Passwords will be hashed using a secure hashing algorithm (e.g., bcrypt) before being stored in the database.
   - JWT tokens will be signed with a secure secret key.
   - All communications between the client and server will be encrypted using HTTPS.
