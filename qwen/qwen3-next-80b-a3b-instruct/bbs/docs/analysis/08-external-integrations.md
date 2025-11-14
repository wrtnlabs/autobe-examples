## External Integrations Requirements

This document defines the external systems that the political forum must integrate with to fulfill its core functionality. These integrations are necessary for operational capability, user experience, and system integrity, but their technical implementation is left to the discretion of the development team.

### Introduction

The political forum is a minimal commentary platform designed for citizens to share ideas and moderate content collectively. While the core system is self-contained, it requires integration with four external services to handle functions outside its core domain: storage, communication, measurement, and abuse prevention. These are not optional features but foundational operational dependencies.

The purpose of this document is to clarify the *why* and *what* of each integration—not the *how*. Backend developers are empowered to choose the best available tools, protocols, or architectures that satisfy these requirements.

### Cloud Storage Integration

THE system SHALL integrate with an external cloud storage service to persist user-uploaded images and files.

WHEN a citizen uploads an image or file with a post, THE system SHALL transmit the file data to the cloud storage service.

THE system SHALL receive and store a unique, persistent URL from the cloud storage service for each uploaded file.

WHEN a post is displayed, THE system SHALL render images and links to files using the stored URLs from the cloud storage service.

WHILE a post exists, THE system SHALL maintain access to its attached files via the stored URLs.

IF a file upload exceeds 10MB in size, THEN THE system SHALL reject the upload and notify the user that files must be under 10MB.

IF a file type is not an image (JPEG, PNG, GIF) or a document (PDF, DOCX, TXT), THEN THE system SHALL reject the upload and notify the user of permitted file types.

THE system SHALL NOT store uploaded files locally. All files must be managed through the external storage service.

THE system SHALL ensure that uploaded files are not accessible to unauthorized users. Access to files SHALL be restricted to authenticated users who can view the associated post.

### Email Service

THE system SHALL integrate with an external email service to send transactional emails.

WHEN a citizen registers an account, THE system SHALL send a verification email to the provided address.

WHEN a citizen requests a password reset, THE system SHALL send a one-time reset link via email.

WHEN a moderator deletes a post, THE system SHALL optionally notify the author via email if their email has been verified, informing them their content was removed and why.

WHEN a citizen attempts to register with an email already in use, THEN THE system SHALL send a notification email stating the email is already registered and directing them to log in or reset password.

WHILE a citizen's email is unverified, THE system SHALL restrict posting and commenting until verification is completed.

THE system SHALL NOT store plaintext email addresses for marketing purposes. Email use is strictly limited to account verification and recovery.

THE system SHALL allow users to disable notification emails for moderation actions, but not for verification or password recovery emails.

### Analytics Tool

THE system SHALL integrate with an external analytics tool to measure user engagement and system health.

THE system SHALL report the following anonymous events to the analytics tool:
- "user_registered" – triggered on successful account creation
- "post_created" – triggered when a citizen submits a new post
- "comment_added" – triggered when a comment is posted
- "file_uploaded" – triggered when a file is successfully uploaded
- "post_deleted" – triggered when a moderator deletes a post
- "thread_locked" – triggered when a moderator locks a thread
- "login" – triggered upon successful authentication
- "session_expired" – triggered when a JWT access token expires

THE system SHALL NOT collect or transmit personally identifiable information (PII), location data, IP addresses, or browsing behavior beyond these discrete events.

THE system SHALL ensure that analytics data does not influence moderation decisions or content visibility rankings. Analytics are for operational insight only.

WHERE a citizen has opted out of analytics tracking in their account settings, THE system SHALL NOT report any events associated with that user.

### Rate Limiting Service

THE system SHALL integrate with an external rate limiting service to prevent abusive behavior.

WHILE a user is active, THE system SHALL enforce the following limits:
- Maximum 5 posts per minute
- Maximum 10 comments per minute
- Maximum 3 file uploads per hour
- Maximum 10 login attempts every 15 minutes

IF a user exceeds any of the above limits, THEN THE system SHALL reject further requests and display: "You've exceeded the allowed actions. Please wait before trying again."

WHILE a user is rate-limited, THE system SHALL prevent the execution of the affected action for 60 seconds after the first breach.

IF a moderator takes manual action to suspend a user, THEN THE system SHALL bypass rate limits for that user until the suspension is lifted.

THE system SHALL NOT use rate limiting to suppress legitimate political discourse. Limits are solely for preventing automated spam, brute force attacks, and system abuse.

THE rate limiting service SHALL be stateless and not store user session data longer than necessary to enforce the current rate window.

### Conclusion

The four external integrations defined in this document are the only external dependencies required for the political forum to function as intended. All backend development must assume these services are available and operational. Backend developers have full autonomy in selecting providers, protocols, and architectures to satisfy these requirements, as long as the defined business purpose, data flow, and constraints are met. No other external systems are permitted without explicit review and approval from the product owner.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*