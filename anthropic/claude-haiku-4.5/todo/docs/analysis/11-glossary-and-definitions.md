# Glossary and Definitions

*This document provides clear, consistent definitions of key terms and concepts used throughout the Todo list application documentation and system.*

---

## Introduction and Usage Guide

This glossary serves as the authoritative reference for terminology used across all Todo application documentation. All stakeholders - from developers to administrators - should use this glossary to ensure consistent understanding of key concepts and terms.

**How to use this document:**
- Each term is defined with clear, precise language
- Related terms are cross-referenced where applicable
- Examples are provided for complex concepts
- Terms are organized by category for easy navigation
- Definitions focus on business meaning specific to the Todo application

**Terminology Consistency Principle**: When you encounter a term in any project documentation, consult this glossary for its precise definition. This ensures everyone working on the project uses terms identically.

---

## Core Terminology

### Todo Application
The complete web-based system that enables users to manage their personal task lists through creation, organization, completion tracking, and deletion of todo items. The application is accessible via web browser and requires user authentication to access personal todo lists.

### Todo Item (or Todo)
A single task or item on a user's todo list. Represents a discrete unit of work or action that the user needs to complete or remember. Each todo item contains a task description (title), optional additional details (description), and a completion status indicator. Example: "Buy groceries" or "Complete project report" are individual todo items.

### Task Description
The text content of a todo item that describes what needs to be done. In the Todo application, this consists of a required title (1-255 characters) and optional description (up to 2000 characters). The title is the primary informational element that users see on their todo list view.

### Completion Status
The current state of a todo item indicating whether the task has been completed. A todo item has one of exactly two completion states: "incomplete" (the task has not been completed) or "completed" (the user has marked the task as finished). Users can toggle between these states at any time.

### Completed Timestamp
The date and time when a user marked a todo item as completed. This timestamp is set automatically by the system when the user changes a todo's status from incomplete to completed. If a user marks a completed todo back to incomplete, this timestamp is cleared.

### Todo List
The collection of all todo items belonging to a specific user, displayed as a complete list in the application. Each user has their own personal, private todo list containing only their own todo items. Other users cannot see, access, or modify another user's todo list.

### User Account
An individual account within the Todo system that belongs to and is controlled by a single user. A user account enables authentication (login), data storage, and access to the Todo application. Each account is associated with a unique email address and is protected by a password.

### Session (or User Session)
An active connection between an authenticated user and the Todo system. A session is established when a user successfully logs in and remains active until the user logs out or the session expires due to inactivity. Each session has an associated authentication token.

### Personal Data
All information specific to an individual user, including their user account credentials, todo items, and activity history. Personal data is private and protected - users can only access their own personal data, and the system prevents any user from accessing another user's personal data.

### User Authentication
The process of verifying that a user is who they claim to be. In the Todo application, authentication is performed by validating that the user's email address and password combination matches what is stored in the system. After successful authentication, users receive an authentication token to access their account.

### Minimum Viable Functionality
The intentional strategy of including only the most essential features required to manage personal todo lists - creation, viewing, completion marking, editing, and deletion - while excluding advanced features like priorities, due dates, sharing, and collaboration that are out of scope for this version.

---

## User and Authentication Terms

### Authentication
The security process of verifying a user's identity by validating their credentials (email and password). Authentication must be successful before a user can access their personal todo list.

### Credentials
The information provided by a user to prove their identity during login, consisting of an email address and password. The system validates these credentials against stored records to authenticate the user.

### Email Address
The unique identifier associated with a user account and the primary method users use to log into the Todo application. Email addresses must be in valid email format (e.g., user@example.com). No two user accounts can have the same email address.

### Password
A secret string of characters known only to the user that, combined with their email address, proves their identity during authentication. Passwords are never stored in plain text; instead, they are encrypted and hashed for security. Users must create passwords that meet specific complexity requirements.

### Password Complexity Requirements
The security standards that user passwords must meet: minimum 8 characters in length, containing at least one uppercase letter, one lowercase letter, one numeric digit, and one special character from the set (!@#$%^&*). These requirements ensure passwords are resistant to guessing attacks.

### Login
The process of authenticating a user by submitting their email address and password. If credentials are valid, the system establishes a user session and provides an authentication token allowing access to their account.

### Logout
The action of ending a user session and disconnecting from the system. After logout, users must authenticate again to access their todo list. Logout immediately invalidates all authentication tokens associated with that session.

### Access Token
A secure cryptographic token issued to a user upon successful authentication that serves as proof of their identity for subsequent requests. The access token must be included with API requests to perform actions. Access tokens have a limited lifespan (typically 15-30 minutes) before expiration.

### JWT (JSON Web Token)
A standardized, industry-secure format for authentication tokens. JWTs contain encoded information about the user's identity and permissions and are cryptographically signed to prevent tampering. The Todo application uses JWT format for access tokens and refresh tokens.

### Session Expiration
The automatic end of a user session after a defined period of time or inactivity. After session expiration, the user's authentication token becomes invalid and they must log in again to continue using the application. Session expiration is a security measure to protect accounts if devices are left unattended.

### Token Refresh
The process of obtaining a new access token before the current one expires, enabling continuous user sessions without requiring repeated logins. When the access token approaches expiration, a separate refresh token can be used to request a new access token.

### Refresh Token
A long-lived authentication token (typically 7-30 days) used to obtain new access tokens without requiring the user to log in again. The refresh token is used only when the access token expires and is kept secure separately from the access token.

### Session Timeout
A security setting determining how long a session can remain inactive before being automatically terminated. In the Todo application, sessions timeout after 30 minutes of inactivity, requiring the user to log in again.

### User Role (or Actor)
The classification or permission level assigned to a user account that determines what features and operations that user can access. The Todo application defines two user roles: "user" (regular user with access to personal todo management) and "admin" (administrator with access to system management and all user data).

### Permission
The right to perform a specific action or access specific functionality within the system. Different user roles have different permission sets. For example, regular users can create and edit their own todos, while only admins can access user management features.

### Authorization
The security process of determining whether an authenticated user has permission to perform a requested action. After authenticating a user, the system checks the user's role and permissions before allowing them to proceed with the request.

### Data Ownership
The fundamental principle that users own only their own data. Users have exclusive access to their own account information and todos, and cannot access or modify any other user's data. The system enforces data ownership through authorization checks on every data access request.

### User Identity
The unique identification of a person in the system, primarily established through their email address and User ID. Each person using the Todo application has exactly one user identity.

### Multi-User System
A system architecture that supports multiple independent user accounts, each with their own private data and isolated sessions. In a multi-user system like the Todo application, each user's data is completely separate from other users' data.

### Account Status
The current state of a user account, which determines whether the account can be used. Account status values include: active (account can be used normally), inactive (account is disabled), and suspended (account is temporarily prevented from use).

### Password Reset
A security process allowing users to recover account access if they forget their password. Users request a password reset, receive a secure link via email, and can then create a new password. Reset tokens expire after 1-2 hours for security.

---

## Todo Management Terms

### Create (or Add)
The action of creating a new todo item in the system. The user provides a task title (and optionally a description), and the system stores this as a new todo item with a unique ID in the user's todo list.

### Read (or View)
The action of retrieving and displaying todo items. Users can read their complete todo list or view details of individual todo items. The system only returns todos belonging to the authenticated user.

### Update (or Edit)
The action of modifying an existing todo item that the user owns. Users can edit the todo title or description. When a todo is edited, the system automatically updates the "last modified" timestamp.

### Delete (or Remove)
The action of permanently removing a todo item from the user's todo list. Deleted todos cannot be recovered. The todo item is completely removed from the system.

### Mark Complete (or Mark as Done)
The action of changing a todo item's completion status from "incomplete" to "completed," indicating the user has finished the task. When marked complete, the system automatically records the completion timestamp.

### Mark Incomplete (or Mark as Undone or Reopen)
The action of changing a todo item's completion status from "completed" back to "incomplete." This reverses a completion marking if the user discovers the task still needs attention or was completed by mistake.

### CRUD Operations
An acronym representing the four fundamental data operations: Create (add new items), Read (retrieve items), Update (modify items), and Delete (remove items). These basic operations are the core of todo item management.

### Filter
The ability to display a subset of todo items from the complete list based on specific criteria. Common filters in the Todo application include: show only incomplete todos, show only completed todos, or show all todos.

### Sort
The organization of todo items in a specific order. Todo items can be sorted by: creation date (newest or oldest first), modification date, completion status, or other attributes.

### Pagination
The division of large todo lists into manageable pages containing a fixed number of items (typically 20-50 items per page). Users view one page at a time and can navigate between pages using "next" and "previous" controls.

### Search
The functionality allowing users to find specific todo items within their list by searching for keywords or phrases in the todo title or description.

### Bulk Operations
The ability to perform actions on multiple todo items simultaneously without editing each one individually. For example, marking multiple todos as complete in a single operation, or deleting multiple todos at once.

### Todo Metadata
Supplementary information about a todo item beyond the task description itself, including creation timestamp, last modification timestamp, completion timestamp, and the unique todo ID.

### Todo ID
A unique identifier assigned to each todo item that distinguishes it from all other todos in the entire system. This ID never changes throughout the todo's lifetime.

### Archived Todo
A todo item that has been moved out of active view but retained in the system. (Note: This feature is not part of minimum viable functionality but may be added in future versions.)

### Todo Completion Rate
The percentage of a user's todos that have been marked as completed. Calculated as: (completed todos / total todos) × 100. This metric helps track productivity.

### Todo Organization
The systematic arrangement and grouping of todo items to help users find and manage them effectively. Organization can be by completion status, priority, category, or custom sequencing.

---

## System Terms

### Backend System (or Backend API)
The server-side application that processes all business logic, manages data storage, handles user authentication, and responds to user requests. The backend is not directly visible to end users but powers all application functionality.

### Frontend Application
The user-facing application that users interact with directly through a web browser. The frontend displays todo items, accepts user input, and communicates with the backend system through API requests.

### API (Application Programming Interface)
The interface through which the frontend application communicates with the backend system. The API defines the operations available (like creating a todo) and specifies how to request them.

### Request
A message sent from the user's client application (frontend) to the backend system asking it to perform an action. Requests include the type of action (HTTP method), the resource to act on, and relevant data.

### Response
A message sent from the backend system to the frontend application containing the result of the requested action. Responses include status information and relevant data.

### HTTP Methods
The standard operations used in web communication:
- **GET**: Retrieve data from the server without making changes
- **POST**: Create new data on the server
- **PUT/PATCH**: Update existing data on the server
- **DELETE**: Remove data from the server

### Status Code
A three-digit numeric code returned with an HTTP response indicating the result of the request. Status code categories: 2xx (success), 4xx (client error), 5xx (server error). Common codes: 200 (OK), 201 (Created), 400 (Bad Request), 401 (Unauthorized), 404 (Not Found), 500 (Server Error).

### Error Message
A message returned when a request fails, explaining what went wrong in terms users can understand. Good error messages clearly describe the problem and suggest corrective action. Error messages should never expose sensitive system information.

### HTTP Response
The complete message sent by the server in response to a client request, containing a status code, headers with metadata, and optionally a response body with data or error information.

### Database
The persistent data storage system where all user accounts, todo items, and system data are stored. The database ensures data survives system restarts and provides organized data retrieval.

### Data Validation
The process of checking that user input meets required standards before the system processes it. Validation includes checking data type, format, length, and content. Invalid input is rejected with error messages.

### Data Sanitization
The process of cleaning user input to remove potentially malicious content (like code injection attempts) while preserving legitimate data. Sanitization prevents security attacks.

### Rate Limiting
A system security mechanism that restricts the number of requests a user can make within a specific time period. Rate limiting prevents abuse, denial-of-service attacks, and protects system resources. For example, allowing 100 requests per minute per user.

### Concurrency
The ability of the system to handle multiple users accessing and modifying data simultaneously without conflicts or data corruption. Concurrency management ensures data integrity even when many users interact with the system simultaneously.

### Cache (or Caching)
A temporary storage mechanism that stores frequently accessed data to improve response times and reduce system load. Instead of retrieving data from the database repeatedly, the system retrieves it once and stores it in cache for quick subsequent access.

### Timestamp
A precise record of when an event occurred, typically in ISO 8601 standardized format (example: 2025-11-14T22:01:14Z). Timestamps document when todos are created, modified, and completed.

### Timezone
The geographic region's local time relative to UTC (Coordinated Universal Time). The system stores all timestamps internally in UTC but may display them to users in their local timezone for readability.

### Null Value (or Null)
The absence of a value in a data field. A field can either contain a specific value or be null (empty/no value). For example, the "description" field of a todo may be null if the user didn't provide one.

### Data Persistence
The characteristic of data remaining stored even after the application stops running or the system restarts. Data persistence ensures users don't lose their todos if the server is restarted.

### Scalability
The system's ability to continue functioning well as the number of users and data volume increases. A scalable system maintains good performance and reliability even with 10x more users and data.

### System Uptime
The percentage of time the system is available and functioning correctly. High uptime (99% or better) means the system is rarely unavailable due to outages or maintenance.

---

## Business Process Terms

### User Workflow (or User Journey)
The sequence of steps a user follows to accomplish a goal within the application. A workflow for "managing daily todos" might include: login → view todo list → create new todo → mark todo complete → review results → logout.

### Use Case
A specific scenario describing how a user interacts with the system to achieve a particular goal. Examples include "Creating a New Todo," "Completing a Task," "Viewing My Todo List," and "Editing a Todo Item."

### Happy Path (or Success Path)
The ideal scenario where a workflow executes without errors and the user successfully achieves their goal. For example, the happy path for creating a todo involves entering text, clicking create, and seeing the new todo appear in the list.

### Alternative Path (or Alternate Flow)
A different route through a workflow that achieves the same goal but follows a different sequence. For example, an alternative path to view a todo might involve searching for it rather than scrolling through the list.

### Error Scenario (or Error Path)
A situation where something goes wrong during a workflow, such as network failure, invalid input, or authentication failure. Error scenarios require the system to handle the error gracefully and inform the user.

### Error Recovery
The process of returning to a functional state after an error occurs. Good error recovery allows users to understand what went wrong and either retry the operation or take corrective action. Example: If a todo creation fails, the system preserves the user's input so they can retry without re-entering everything.

### Validation Rule
A specific criterion that user input must satisfy. Examples: "todo title must not be empty," "email must contain @ symbol," "password must contain at least one number."

### Input Validation
The verification that user input meets all specified validation rules before the system processes it. Invalid input is rejected with a message explaining what's wrong.

### Constraint
A limitation or rule that must be satisfied for the system to operate correctly. Examples: "users cannot delete other users' todos," "todo title cannot exceed 255 characters," "passwords must be at least 8 characters."

### Business Rule
A principle or policy that governs how the system operates and how data should be handled. Business rules ensure the system behaves consistently with organizational objectives. Example: "All passwords must be encrypted before storage."

### Data Lifecycle
The complete journey of a data item from initial creation through modification, active use, and eventual deletion. For a todo item: created → viewed/edited multiple times → marked complete → possibly deleted.

### Data Retention
The practice of keeping data for a specified period before deletion. Retention policies determine how long to keep deleted todos before permanent removal. Example: "deleted todos are permanently removed immediately; audit logs are retained for 90 days."

### Soft Delete
A deletion method where data is marked as deleted in the system but not immediately removed from the database. Soft-deleted data can potentially be recovered. (Note: Not used in current Todo application; todos are permanently deleted on deletion request.)

### Permanent Delete
The irreversible removal of data from the system. Once permanently deleted, data cannot be recovered. When users delete todos in the Todo application, they are permanently deleted.

### Audit Trail (or Audit Log)
A record of significant system events and user actions, including who performed the action, what was done, when it occurred, and the result. Audit trails provide accountability and help investigate issues.

### Compliance
Adherence to laws, regulations, and standards that apply to the system. For the Todo application, this includes data privacy regulations and security standards.

### Audit Log Entry
A single record in an audit log documenting one specific action or event. Each entry typically includes timestamp, user ID, action type, affected resource, and outcome.

### Event
A significant action or occurrence in the system that is worth recording, such as user login, todo creation, permission change, or security incident.

### Monitoring
The continuous observation of system activity, performance, and health. Monitoring helps administrators identify problems early and understand how the system is operating.

---

## Security and Compliance Terms

### Encryption
The process of converting data into scrambled, unreadable format using mathematical algorithms and a secret key. Only those with the correct decryption key can read encrypted data. Encryption protects sensitive data like passwords and personal information.

### Encrypted Password Storage
The security practice of storing user passwords in encrypted, hashed format rather than plain text. This ensures that even if the database is compromised, attackers cannot use the passwords.

### Hashing
A one-way conversion of data (like passwords) into a fixed-length code that cannot be reversed back to the original data. Used to securely store passwords so even system administrators cannot see them.

### Salt
Random data added to a password before hashing, ensuring identical passwords produce different hashes. Salting protects against certain types of attacks and password-cracking techniques.

### Secure Storage
The practice of storing sensitive data (passwords, tokens) using encryption, hashing, or other security methods so it cannot be easily compromised if the database is accessed by attackers.

### CORS (Cross-Origin Resource Sharing)
A security mechanism that controls which external websites or applications can access the API. CORS prevents unauthorized access from unexpected sources and protects against certain attacks.

### SSL/TLS (Secure Socket Layer / Transport Layer Security)
Encryption protocols that secure all data transmitted between the user's browser and the server, preventing interception or eavesdropping. TLS is the modern replacement for the older SSL protocol.

### HTTPS
The secure version of HTTP that uses TLS encryption to protect data in transit between client and server. All Todo application connections use HTTPS to protect user credentials and data.

### API Security
Protective measures for the API including authentication requirements (JWT tokens), permission checks, rate limiting, and input validation. These measures prevent unauthorized access and malicious use.

### Input Sanitization
The process of cleaning and validating user input to remove or neutralize malicious content while preserving legitimate data. Sanitization prevents injection attacks and other security exploits.

### Authentication Security
Protective measures for the authentication process including password complexity requirements, hashing, brute force protection (account lockout), and secure token handling.

### Session Security
Protective measures for user sessions including authentication token validation, session timeouts, secure token storage, and logout enforcement.

### SQL Injection Attack
A security attack where malicious SQL code is inserted into user input to compromise or access the database. Prevented through input validation, parameterized queries, and prepared statements.

### Cross-Site Scripting (XSS) Attack
A security attack where malicious code is injected to compromise client applications or steal user data. Prevented through input sanitization and content security policies.

### Data Privacy
The principle that user data should be protected and used only for stated purposes. Users should have control over their personal data, and organizations must respect that control.

### Data Protection
The collection of measures taken to safeguard data from unauthorized access, modification, or deletion. Data protection includes encryption, access controls, backups, and audit logging.

### Principle of Least Privilege
A security principle that users should have only the minimum permissions necessary to perform their assigned tasks. Limiting permissions reduces risk if an account is compromised.

### Brute Force Attack
An attack where an attacker attempts many password combinations rapidly to guess user credentials. Protected against through rate limiting and account lockout after failed attempts.

### Account Lockout
A security measure that temporarily disables an account after multiple failed login attempts, preventing attackers from guessing passwords through brute force attacks.

### Two-Factor Authentication (2FA)
An optional security feature requiring two different forms of identification to log in (e.g., password + code sent to email). Not currently required in the Todo application but supported for future enhancement.

### Audit Logging
The systematic recording of security-relevant events and administrative actions for security review, accountability, and compliance purposes.

### Compliance Requirement
A specific rule or standard that must be met, often mandated by law or industry standards. Examples include data privacy regulations or password security standards.

### Data Retention Policy
Rules determining how long to keep various types of data before permanent deletion. Retention policies balance legal/compliance needs with privacy considerations.

### Unauthorized Access
An attempt to access data or functionality without proper authentication or authorization. The system prevents unauthorized access through authentication and permission checks.

### Confidentiality
The security property ensuring that data is only accessible to authorized users and remains secret from unauthorized parties.

### Integrity
The security property ensuring that data has not been modified or corrupted. Database transactions and validation checks maintain data integrity.

### Availability
The security property ensuring that authorized users can access the system and data when needed. System reliability and uptime maintain availability.

---

## Acronyms and Abbreviations Reference

| Acronym | Full Form | Definition |
|---------|-----------|------------|
| **API** | Application Programming Interface | Interface for application communication |
| **CORS** | Cross-Origin Resource Sharing | Web security mechanism for cross-domain requests |
| **CRUD** | Create, Read, Update, Delete | Four fundamental data operations |
| **GDPR** | General Data Protection Regulation | EU data privacy regulation |
| **GET** | HTTP GET Method | Request operation for retrieving data |
| **HTTP** | HyperText Transfer Protocol | Web communication protocol |
| **HTTPS** | HTTP Secure | Encrypted web communication protocol |
| **JWT** | JSON Web Token | Standardized authentication token format |
| **POST** | HTTP POST Method | Request operation for creating data |
| **SQL** | Structured Query Language | Database query language |
| **SSL** | Secure Socket Layer | Encryption protocol (older) |
| **TLS** | Transport Layer Security | Encryption protocol (modern) |
| **UTC** | Coordinated Universal Time | Standard global time reference |
| **XSS** | Cross-Site Scripting | Web security attack type |

---

## Related Documentation Cross-References

This glossary complements the complete Todo application documentation. Refer to these documents for expanded context on specific term categories:

- **[User Actors and Authentication](./02-user-actors-and-authentication.md)**: For detailed explanation of authentication processes, user roles, and permission models
- **[Functional Requirements](./03-functional-requirements.md)**: For specific business requirements related to todo operations
- **[User Workflows and Scenarios](./04-user-workflows-and-scenarios.md)**: For step-by-step examples of how users interact with the system
- **[Business Rules and Constraints](./05-business-rules-and-constraints.md)**: For specific rules governing system operation
- **[Error Handling and Edge Cases](./06-error-handling-and-edge-cases.md)**: For error scenarios and recovery procedures
- **[Security and Compliance](./08-security-and-compliance.md)**: For detailed security requirements and compliance standards
- **[Data Structure and Relationships](./10-data-structure-and-relationships.md)**: For conceptual data model and entity relationships

---

## Glossary Maintenance Notes

**For Development Team**: This glossary serves as the single source of truth for terminology. When introducing new terms or concepts, add them to this glossary with clear definitions. When revising system functionality, update affected definitions here.

**For Stakeholders**: Consult this glossary when reading project documentation. If you encounter an undefined term or a definition that seems inaccurate, flag it for clarification to ensure consistent communication.

**Last Updated**: Project initiation  
**Maintained By**: Project documentation team  
**Review Frequency**: Quarterly or when terminology changes occur