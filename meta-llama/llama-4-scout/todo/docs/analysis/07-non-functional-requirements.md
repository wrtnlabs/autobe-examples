# Non-Functional Requirements – Todo List Backend

## Security and Privacy

### Data Protection
- WHEN any user data is persisted or modified, THE system SHALL encrypt all sensitive data at rest using industry-standard cryptography, ensuring data is protected against unauthorized access or data breaches at the storage level.
- WHEN users submit login credentials or personal data, THE system SHALL transmit all data via HTTPS using TLS 1.2 or higher to prevent eavesdropping or man-in-the-middle attacks.
- WHEN storing user passwords, THE system SHALL use a salted, cryptographically secure hash function (e.g., bcrypt/Argon2), and SHALL never store raw or reversible password data under any circumstance.
- THE system SHALL restrict access to the data storage layer solely through authenticated application services. In cases where direct database access is needed (such as for admin panels or tools), multi-factor authentication SHALL be enforced and all actions SHALL be logged.
- WHEN users attempt to access or manipulate Todo items, THE system SHALL allow such operations ONLY IF the resource belongs to the authenticated user, and SHALL prevent all cross-user access with proper error handling that leaks no information about the existence of other users' data.

### Authentication and Authorization
- WHEN performing any Todo item operation (create, update, complete, delete, view), THE system SHALL require a valid authenticated user session.
- WHEN session tokens expire by 30 minutes of inactivity, THE system SHALL require users to re-authenticate before performing protected operations.
- WHEN a user repeatedly fails authentication (for example, 5 times within 10 minutes), THE system SHALL lock the account for a brief period and log all failed attempts for monitoring and security review.
- WHEN issuing tokens, THE system SHALL use JWTs with clearly defined expiration and revocation flow, and SHALL validate tokens on every request affecting protected resources.

### Privacy
- WHEN acquiring user personal data, THE system SHALL collect only the minimum data required to register and operate the core Todo list service, such as email and password, excluding all non-essential attributes.
- WHEN users request permanent account deletion, THE system SHALL immediately revoke associated session tokens and remove all user-associated data, ensuring deletion from active databases and permanent erasure from all backups within 30 days.
- THE system SHALL use personal data only for service provision and mandatory re-attribution, never for unrelated business purposes, and SHALL use only anonymized or aggregated data for analytics, never data that could re-identify individuals.

## Performance Expectations

### Response Times
- WHEN a user requests to create, update, complete, delete, or fetch a todo item, THE system SHALL provide a response within 1 second for 95% of requests during normal operation (up to 100 concurrent users).
- WHEN user load increases up to 500 concurrent users, THE system SHALL maintain an average API response time below 1.5 seconds at the 95th percentile.
- IF any CRUD operation experiences a response time above 2 seconds, THEN THE system SHALL immediately log the incident and trigger diagnostic alerting for operational review.

### Scalability
- WHEN system traffic increases, THE system SHALL support elastic horizontal scaling of the business logic and database layers without requiring service downtime or manual reconfiguration.
- WHEN system workload surpasses routine levels, THE application SHALL maintain statelessness in processing so that scaling out does not affect the stability of session or user state management.

## Reliability and Availability

### Uptime and Availability
- THE system SHALL target a minimum uptime of 99.5% calculated over a rolling 30-day window, excluding advertised planned maintenance.
- WHEN unplanned service interruptions occur due to infrastructure or software faults, THE system SHALL provide status updates to technical stakeholders and automatically attempt failover or fallback processes when feasible.

### Data Persistence and Backup
- WHEN any data (Todo item or user) is created, updated, or deleted, THE system SHALL apply changes to durably committed storage immediately to prevent accidental data loss.
- THE system SHALL perform automated backups of the entire database at least every 4 hours, and retain backup copies for 30 days, enabling full restoration capability in the event of a failure.
- IF a database restore uncovers a consistency error, THEN THE system SHALL notify administrators, halt restoration, and fallback to the most recent consistent backup, logging all actions for auditability.

### Error Recovery
- WHEN a transient system or infrastructure error (such as intermittent network or storage failure) occurs, THE system SHALL retry affected operations up to 2 times and provide a helpful error message to the user if the issue persists.
- THE system SHALL detect and log all server and infrastructure errors, categorize the error types, and make all error diagnostics available for ongoing operational improvement.
- WHEN a critical application component is unhealthy or compromised, THE system SHALL remove it from active load balancing and immediately alert administrators.

```mermaid
graph LR
  subgraph "Security Flow"
    A["User login with credentials"] --> B["Authenticate & issue JWT"]
    B --> C["Validate JWT on each request"]
  end

  subgraph "Data Access Control"
    C --> D{"Access allowed to own todos?"}
    D --|"Yes"| E["CRUD operation permitted"]
    D --|"No"| F["Return 403 error"]
  end

  subgraph "Performance Monitoring"
    G["Request processed"] --> H{"Response <1s?"}
    H --|"Yes"| I["Log normal event"]
    H --|"No"| J["Trigger alert"]
  end

  subgraph "Data Safety"
    E --> K["Auto-backup every 4h"]
    K --> L{"Corruption detected?"}
    L --|"No"| M["Continue"]
    L --|"Yes"| N["Restore prior backup"]
  end
```

## Compliance
- WHEN applicable data protection laws or frameworks exist (such as GDPR or local standards), THE system SHALL implement all necessary controls for consent, data minimization, and the right to erasure.
- WHERE additional legal or contractual compliance is required, THE system SHALL support extensible audit logs and configuration to satisfy such obligations without source code changes.

## Summary Table: Key Non-Functional Requirements

| Category      | Requirements Overview                                                   |
|--------------|-------------------------------------------------------------------------|
| Security     | Encrypted storage, strong authentication, minimal user data sharing      |
| Privacy      | Data minimization, full user data deletion within 30 days, no misuse    |
| Performance  | <1s response for 95% requests, scales to 500 concurrent users           |
| Reliability  | 99.5% uptime, durable multi-layer backups, automatic failover           |
| Compliance   | GDPR/locale laws, user consent, erasure rights, extensible audit logs   |

## Integration Reference
See also user and authentication requirements, error handling, and business rules in their respective documents for further detail on integration points for full-stack development.