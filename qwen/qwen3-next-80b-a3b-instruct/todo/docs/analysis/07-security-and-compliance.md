# Security and Compliance Requirements for todoApp

This document defines the mandatory security, data privacy, and compliance requirements for the todoApp backend system. All implementation decisions must adhere to these requirements to ensure user data is protected at rest and in transit, system integrity is maintained, and regulatory obligations are fulfilled. This document assumes a single-user, personal productivity application with no collaboration features.

## Authentication Security

### Password Handling
WHEN a user registers with a new password, THE system SHALL hash the password using bcrypt with a cost factor of at least 12.
WHEN a user logs in, THE system SHALL compare the provided password against the stored bcrypt hash using a constant-time comparison function.
WHEN a user resets their password, THE system SHALL require re-authentication via existing session or verified email before allowing password change.

### Credential Transmission
WHEN a user submits login credentials, THE system SHALL transmit data exclusively over HTTPS (TLS 1.2 or higher).
WHILE a user is authenticated, THE system SHALL NOT transmit passwords, tokens, or sensitive identifiers over unencrypted channels.

### Login Attempt Limiting
IF a user fails to authenticate three consecutive times within a 15-minute window, THEN THE system SHALL temporarily lock further authentication attempts from that IP address for 30 minutes.
IF a user fails to authenticate 10 or more times within a 24-hour period, THEN THE system SHALL trigger a security notification to the user’s registered email address.

## Data Storage Security

### User Data Isolation
THE system SHALL ensure that no user can access, read, modify, or delete another user’s todo items, even through direct database queries or administrative interfaces.
WHEN a user deletes their account, THE system SHALL permanently remove all associated todo items, metadata, and audit logs attributable to that user, with no possibility of recovery.

### Data Mapping
THE system SHALL store todo items as user-specific records where the user ID is cryptographically bound to the data and cannot be altered or spoofed.

### Storage Encryption
WHILE todo items are stored in persistent storage, THE system SHALL encrypt all data at rest using AES-256 symmetric encryption with a key managed by a dedicated key management service.

## Session Management Security

### Token Generation
WHEN a user successfully authenticates, THE system SHALL generate a JWT (JSON Web Token) containing:
- userId (UUID)
- role ("user" or "admin")
- permissions array (e.g., ["read:todos", "write:todos", "delete:todos"])
- issuedAt timestamp
- expiration timestamp (15 minutes from issuance)

### Token Transmission
THE system SHALL transmit access tokens exclusively via HTTP-only, Secure, SameSite=Strict cookies.
THE system SHALL NOT store access tokens in localStorage, sessionStorage, or any client-side JavaScript-accessible storage.

### Token Renewal
WHEN an access token expires before user logout, THE system SHALL allow one-time refresh via a refresh token stored in an HTTP-only, Secure, SameSite=Strict cookie with a 7-day expiration.
WHILE a refresh token is valid, THE system SHALL issue a new access token upon request without requiring re-authentication.
WHEN a user logs out, THE system SHALL immediately invalidate both the access token and refresh token.

### Session Termination
WHEN a user revokes access from all devices, THE system SHALL invalidate all active refresh tokens associated with that user.
WHEN an admin permanently deletes a user account, THE system SHALL immediately revoke all active sessions and tokens for that user.

## Data Retention Policy

### Todo Item Retention
THE system SHALL retain todo items indefinitely until explicitly deleted by the user.

### Authentication Logs
WHILE authentication events (successes and failures) are recorded, THE system SHALL retain log entries for no longer than 60 days.
AFTER 60 days, THE system SHALL permanently delete all authentication logs without exception.

### Backup Retention
THE system SHALL perform daily encrypted backups of user data.
BACKUPS SHALL be retained for a maximum of 14 days.
AFTER 14 days, THE system SHALL permanently delete all backup files.

## Data Access Log

### Audit Trail
THE system SHALL maintain a immutable audit log of all administrative actions performed by the admin actor, including:
- User account creation or deletion
- Access to any user’s todo items
- Modification of user permissions
- Changes to system-level security settings

### Log Visibility
THE audit trail SHALL be accessible ONLY to the admin actor via a protected internal interface.
THE system SHALL NEVER expose audit log data to end users or third parties.

### Log Integrity
WHILE audit logs are recorded, THE system SHALL sign each entry using HMAC-SHA256 with a system-wide secret key to prevent tampering.

## GDPR Compliance

### Data Subject Rights
IF a user requests access to their personal data, THEN THE system SHALL provide a complete export of all todo items and account metadata in JSON format within 72 hours.
IF a user requests deletion of their account, THEN THE system SHALL permanently erase all associated data within 72 hours and notify the user upon completion.
IF a user requests correction of their personal data (e.g., email address), THEN THE system SHALL allow update only after re-authentication and confirm changes via email.

### Data Transfer Restriction
THE system SHALL store all user data exclusively in South Korea.
THE system SHALL NOT transfer, replicate, or back up user data to servers located outside South Korea under any circumstances.

### Consent and Transparency
WHEN a user registers, THE system SHALL display a clear, unambiguous privacy notice disclosing:
- What data is collected
- Why it is collected
- How it is stored and protected
- How long it is retained
- The user’s rights under GDPR

## Encryption Requirements

### In Transit Encryption
WHILE data is transmitted between client and server, THE system SHALL use TLS 1.2 or higher with perfect forward secrecy (PFS) cipher suites.
THE system SHALL enable HTTP Strict Transport Security (HSTS) with a max-age of at least 1 year and include subdomains.

### At Rest Encryption
WHILE todo items and account data are stored on disk, THE system SHALL encrypt data using AES-256 with encryption keys managed by a dedicated, rotating key management service (KMS).

### Key Management
THE system SHALL rotate encryption keys every 90 days.
WHEN a key rotation occurs, THE system SHALL re-encrypt all existing data using the new key before retiring the old key.

## Password Policy

### Minimum Requirements
WHEN a user creates a password, THE system SHALL enforce:
- Minimum length of 12 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one digit
- At least one special character (e.g., !@#$%^&*)

### Prohibited Patterns
IF a user attempts to use a password found in the top 10,000 commonly used passwords (based on NIST and HaveIBeenPwned datasets), THEN THE system SHALL reject the password with a message: "This password is too common. Please choose a stronger one."

### Password Confirmation
WHEN a user resets their password, THE system SHALL require the new password to be entered and confirmed twice.

### Credential Storage Prohibition
THE system SHALL NEVER store passwords in plain text, reversible encryption, or weak hash functions (e.g., MD5, SHA-1).

## Security Governance

### Admin Access Restriction
THE admin actor SHALL only be accessible via backend CLI tools or secure internal network interfaces.
THE admin actor SHALL NOT be accessible through the public-facing API under any circumstances.

### Security Updates
WHEN a critical vulnerability is identified in the system’s dependencies, THE system SHALL be patched within 48 hours of public disclosure.

### Penetration Testing
THE system SHALL undergo quarterly penetration testing by an independent third party.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*