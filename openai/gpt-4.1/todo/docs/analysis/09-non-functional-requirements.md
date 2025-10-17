# Non-Functional Requirements for Minimal Todo List Application

## Performance Standards

- THE system SHALL respond to any user request (including viewing, adding, editing, or deleting a Todo item) within 1 second during normal usage conditions.
- THE system SHALL support at least 100 concurrent user sessions without degradation of response time beyond 1 second per action.
- WHEN peak load occurs (e.g., brief spikes in usage), THE system SHALL maintain response times under 3 seconds for all core operations.
- THE system SHALL provide a minimum uptime of 99.5% (excluding scheduled maintenance), ensuring availability for users at all times.
- THE system SHALL process all successful Todo create, update, and delete requests reliably, ensuring data consistency without loss or duplication.

## Data Security and Privacy

- THE system SHALL use HTTPS/TLS encryption for all API communication between clients and the backend to protect data in transit.
- THE system SHALL use token-based authentication, implementing short-lived JWT access tokens (expiring within 30 minutes) and longer-lived refresh tokens as defined in the [User Roles and Authentication Guide](./04-user-roles-and-authentication.md).
- THE system SHALL restrict data access so that authenticated users can only access their own Todo items. IF a user attempts to access another user's data, THEN THE system SHALL deny access and return an appropriate error.
- ALL user credentials (such as passwords) SHALL be stored as salted, one-way hashes—never in plaintext—following current security best practices.
- THE system SHALL not log sensitive data (such as raw passwords, access tokens, or personally identifiable information) in system logs. Only aggregate, non-personal usage metrics and error traces may be stored.
- IF a session token is stolen, THEN THE system SHALL provide a mechanism for immediate revocation through the account security endpoint.
- THE system SHALL comply with applicable privacy laws regarding minimal data collection (only username/email and password), and SHALL provide mechanisms for user-initiated account deletion with all associated Todos.
- WHEN user-initiated account deletion occurs, THE system SHALL permanently erase the user’s data within 24 hours.

## Business Constraints

- THE application SHALL operate with a single user role (“user”), solely for managing personal Todo items via API authentication.
- THE system SHALL not expose any administrative or multi-user features.
- THE application SHALL be designed for minimal, essential Todo list functionality only; new features outside the core must not be implemented without explicit approval and documented requirements.
- THE application SHALL be platform-agnostic, supporting secure and efficient operation when accessed by standard browsers or API clients.
- THE system SHALL provide API-level audit logging for destructive actions (delete/clear all) for troubleshooting and accountability, without exposing personal data.
- THE application SHALL NOT retain any user data for longer than necessary for operational purposes—data retention policy aligns with privacy principles of user control and data minimization.

[Functional Requirements Document](./05-functional-requirements.md) and [User Roles and Authentication Guide](./04-user-roles-and-authentication.md) contain further supporting context.