## External Integrations and Environmental Constraints

This document defines all external systems, services, and environmental conditions that the Todo App backend depends upon for operation. It specifies mandatory integrations, infrastructure constraints, and compliance boundaries—all from the perspective of backend developers who must implement and maintain the system. This document is not a design specification; it is a set of non-negotiable operational requirements.

### Email Service Integration

WHEN a user registers with a new email address, THE system SHALL send a verification email containing a one-time link to confirm ownership.

WHEN a user requests password recovery, THE system SHALL send a secure, time-limited reset link to their registered email address.

THE system SHALL ensure that all email content is formatted for readability on mobile and desktop devices.

THE system SHALL retry email delivery up to three times over a 24-hour window if the initial send fails.

IF the email service is unreachable for more than 10 minutes, THEN THE system SHALL log the failure and temporarily disable email-dependent features (registration, password recovery) until service is restored.

WHERE a user has not verified their email, THE system SHALL prevent them from creating, updating, or deleting todo items.

### Logging Service

WHILE the system is running, THE system SHALL write all user actions and system events to a centralized logging service.

WHEN a user logs in, THE system SHALL log: [timestamp, user_id, IP_address, device_type].

WHEN a user creates, updates, or deletes a todo item, THE system SHALL log: [timestamp, user_id, action_type, todo_item_id, previous_state, new_state].

WHEN authentication fails due to invalid credentials, THE system SHALL log: [timestamp, user_id (if available), IP_address, error_reason].

THE system SHALL retain logs for a minimum of 90 days.

WHERE an admin accesses another user’s todo items, THE system SHALL log: [timestamp, admin_id, target_user_id, action_type, item_count].

IF the logging service becomes unavailable, THEN THE system SHALL continue operating but record all events locally in a buffered queue for later synchronization.

### Monitoring Tool

THE system SHALL integrate with a cloud-based monitoring tool to track performance, uptime, and error rates.

WHILE the system is active, THE system SHALL send real-time metrics to the monitoring tool including: request latency, error rate per endpoint, active user count, and authentication failure frequency.

THE system SHALL trigger an alert if the HTTP 5xx error rate exceeds 1% for more than 5 consecutive minutes.

WHEN the database connection is lost for more than 30 seconds, THE system SHALL report a critical alert to the monitoring tool.

THE system SHALL expose a health check endpoint at /health that returns 200 OK when all core services are operational.

### Deployment Environment

THE system SHALL be deployed exclusively on a cloud-based infrastructure.

THE system SHALL NOT be deployed on-premise, on developer laptops, or in private data centers.

THE system SHALL use containerized deployment (e.g., Docker) with orchestration via Kubernetes or a compatible service.

THE system SHALL be deployed across at least two availability zones within the selected cloud region.

THE system SHALL be configured for automatic scaling based on request volume, with a minimum of two running instances at all times.

### Backup Strategy

THE system SHALL perform automated daily backups of all user data.

THE backups SHALL include: todo item records, user account metadata, and verified email records.

THE backups SHALL be stored in geographically separate storage from the primary database.

THE system SHALL retain up to seven daily backups and one monthly backup per user.

WHEN a backup is completed successfully, THE system SHALL log the backup timestamp and size.

IF a backup fails for two consecutive days, THEN THE system SHALL notify the system administrator via internal alerting channel.

### Region-Specific Requirements

THE system SHALL store all user data in a cloud region located in South Korea.

THE system SHALL NOT transfer, replicate, or cache user data in any other geographic region.

WHEN a user signs up, THE system SHALL detect their IP address location and reject registration if the IP is not from South Korea.

THE system SHALL comply with all local regulations governing personal data processing within South Korea.

WHERE a user explicitly requests data deletion, THEN THE system SHALL remove all data from South Korean cloud storage, and confirm deletion via internal audit log.

THE system SHALL use domain names and DNS records hosted only by DNS providers with jurisdictional presence in South Korea.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.