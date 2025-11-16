# Security and Non-Functional Requirements

This document defines the non-functional requirements for the economic/political discussion board system. These requirements specify how the system must behave from the user's perspective—covering performance, security, reliability, privacy, and scalability. Unlike functional requirements that describe what the system does, these requirements describe how well it must do it.

### Performance Requirements

Performance defines the responsiveness and efficiency of the system from the user’s point of view. All responses must feel immediate and effortless.

- WHEN a user loads the home page of the discussion board, THE system SHALL render the list of posts in under 2 seconds.
- WHEN a user posts a new discussion, THE system SHALL confirm the post creation and display the post on the page within 2 seconds.
- WHEN a user submits a comment, THE system SHALL display the comment on the thread within 2 seconds.
- WHEN a user uploads an image or file attachment, THE system SHALL display a progress indicator during upload and confirm completion within 5 seconds for a 10MB file.
- WHEN a user searches for posts using keywords, THE system SHALL return results instantly for common queries (e.g., "inflation," "election," "tax policy")—defined as appearing within 1 second of query submission.
- WHEN a user switches between pages of posts (e.g., from page 1 to page 2), THE system SHALL load the new page without full reload and render it in under 1.5 seconds.
- WHILE a user is composing a post, THE system SHALL autosave draft content every 10 seconds with zero visible delay.
- WHILE a moderator is reviewing flagged content, THE system SHALL load the moderation dashboard and relevant post threads in under 2 seconds.

### Security Requirements

Security ensures that user data and content remain confidential, authentic, and protected from unauthorized access.

- WHEN a user attempts to log in, THE system SHALL require email and password authentication and SHALL NOT accept third-party logins (e.g., Google, Facebook).
- WHEN authentication succeeds, THE system SHALL issue a JSON Web Token (JWT) for session management.
- WHEN authentication fails, THE system SHALL return an HTTP 401 error with the message "Invalid credentials" and SHALL NOT reveal whether the email or password was incorrect.
- WHILE a user is authenticated, THE system SHALL validate the JWT on every protected request and SHALL reject any tampered, expired, or invalid token.
- WHEN a user logs out, THE system SHALL immediately invalidate the current JWT and clear it from client storage.
- WHEN a user changes their password, THE system SHALL require the current password for verification and SHALL store the new password using bcrypt hashing with a salt.
- WHEN a citizen attempts to edit another user’s post, THE system SHALL deny access and return HTTP 403 Forbidden.
- WHEN a moderator accesses moderation features, THE system SHALL verify their role in the JWT payload and SHALL refuse access to non-moderator accounts.
- WHEN any user attempts to upload a file, THE system SHALL validate the file type against permitted formats (JPG, PNG, GIF, WEBP) and SHALL reject any executable, script, or compressed archive file.
- WHEN any file is uploaded, THE system SHALL store all attachments in a private storage system inaccessible via direct URL and SHALL serve them through a signed, time-limited endpoint.
- IF a user’s session is active for more than 30 days without interaction, THE system SHALL automatically terminate the session and require re-authentication.
- IF any suspicious login pattern is detected (e.g., 10 failed attempts in 5 minutes), THE system SHALL temporarily lock account access and notify the user via email.
- IF a user reports a post as malicious or inappropriate, THE system SHALL preserve the post’s original content and metadata for moderator audit and SHALL NOT delete it until reviewed.

### Reliability and Availability

Reliability ensures consistent system operation without unexpected failure.

- THE system SHALL maintain 99.9% uptime for all core features (posting, commenting, login, file upload) during business hours (06:00–23:59 Korea Standard Time).
- WHEN a service interruption occurs, THE system SHALL display a user-friendly message such as "Temporary maintenance—we’ll be back soon" and SHALL NOT show technical errors like stack traces or database errors.
- WHEN an unexpected error occurs during a post creation, THE system SHALL preserve the draft text in local storage and SHALL allow the user to retry without losing their content.
- WHEN an upload fails, THE system SHALL retain the file metadata and allow the user to retry upload without reselecting the file.
- WHEN a comment fails to post due to network error, THE system SHALL show a recoverable error message and SHALL offer a "Retry" button.
- WHILE the system is operating normally, THE system SHALL not lose any posted content, comments, or attachments due to server restarts or updates.
- WHEN a moderation action is performed (e.g., deletion, locking), THE system SHALL record the moderator’s ID, action timestamp, and reason in an audit log.

### Privacy and Data Protection

Privacy ensures personal user data is handled with respect and is never shared improperly.

- THE system SHALL NOT store phone numbers, real names, addresses, or any personally identifying information beyond email and username.
- THE system SHALL NOT share any user data—including posts, comments, or attachments—with third-party services, advertisers, or analytics platforms.
- WHEN a user requests account deletion, THE system SHALL permanently delete all associated posts, comments, attachments, and metadata within 7 days.
- WHEN a user downloads their personal data, THE system SHALL provide a ZIP file containing their posts, comments, and upload history, with no additional metadata or tracking codes.
- THE system SHALL NOT track user location, IP addresses, or browsing behavior outside the scope of authentication and moderation.
- WHEN a moderator views a user’s content for review, THE system SHALL display the username (not real name) and the post date in UTC, but SHALL NOT display the user’s IP address or device information.
- THE system SHALL encrypt all data at rest and in transit using industry-standard TLS 1.3 and AES-256 encryption.

### Scalability Expectations

Scalability ensures the system can grow smoothly as user activity increases without quality degradation.

- THE system SHALL support 1,000 concurrent active users without measurable performance degradation.
- THE system SHALL handle 200 new posts per hour during peak times (e.g., election days or major economic announcements) without slowdown or timeout.
- THE system SHALL responsibly limit each user to 5 uploads per hour to prevent abuse.
- WHEN the system approaches capacity (e.g., 90% of concurrent users), THE system SHALL gracefully degrade and continue functioning—primarily for read and comment operations—while deferring non-critical tasks.
- WHEN 50,000 total posts are accumulated, THE system SHALL maintain search response times under 1.5 seconds.
- THE system SHALL be designed to support horizontal scaling, with stateless authentication and separate storage layers for posts and attachments.
- THE system SHALL not rely on in-memory caching for persistent data; all user content shall be stored in persistent, replicated databases.
> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*