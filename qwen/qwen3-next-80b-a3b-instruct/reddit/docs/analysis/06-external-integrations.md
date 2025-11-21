# External Integrations Requirements

This document defines the external system dependencies and data exchange requirements for the communityBBS platform. It specifies what information must be shared with third-party services, when, and under what conditions—all from a business perspective. Technical implementation (protocols, libraries, APIs) is left to the development team.

## Email Delivery Service

The communityBBS platform relies on an external email service to communicate with users. This service must support transactional email delivery with high reliability and traceability.

- WHEN a new user completes registration, THE system SHALL trigger an email verification message to the provided email address.
- WHEN a user requests password recovery, THE system SHALL send a time-limited reset link to the registered email address.
- WHEN a moderator or admin issues a notification to a user (e.g., warning, suspension, content approval), THE system SHALL deliver a concise, user-facing message via email.
- WHEN a user's comment receives a reply or their post is liked, THE system SHALL send a notification email if the user has enabled email notifications in account settings.
- WHILE a user account is unverified, THE system SHALL resend the verification email up to three times within 72 hours, then lock further automated resending until manually triggered by the user or an admin.
- IF the email delivery service is unavailable for more than 5 minutes, THE system SHALL log the failure and queue the message for retry, but SHALL NOT block the user’s action (e.g., registration completion).
- IF an email address is permanently rejected (bounced) three times, THE system SHALL disable all future email communications to that address and mark the user account as "email-unreachable" in audit logs.
- THE system SHALL include an unsubscribe link in all promotional or opt-in email notifications, allowing users to disable future messages.
- THE system SHALL never include personally identifying information (PII) in email subject lines except the user’s first name if provided during registration.

## Payment Provider (if applicable)

The communityBBS platform does not require transactional payments. No payment provider integration is needed.

## Analytics and Monitoring

The system shall collect anonymized behavioral and performance data for operational insight and user experience optimization.

- WHEN a user opens the home feed, THE system SHALL send an anonymized event containing: userId (hashed), timestamp, page viewed, session duration, and device type.
- WHEN a user submits a post or comment, THE system SHALL log: userId (hashed), content type (post/comment), character count, and time of submission.
- WHEN a user reports content, THE system SHALL send an event including: reporter userId (hashed), reported content ID, category of abuse (spam, harassment, misinformation, other), and timestamp.
- WHERE user consent is not explicitly granted, THE system SHALL NOT send any analytics data to third-party providers.
- WHERE a user has opted out of analytics in their privacy settings, THE system SHALL suppress all tracking events for that user and delete any previously stored telemetry.
- THE system SHALL not send identifiable information such as email, IP address, or device identifiers to analytics services.
- IF an analytics service becomes unreachable, THE system SHALL cache events locally for up to 48 hours and attempt redelivery—not to exceed 10 attempts per event. Failed events shall be discarded after 48 hours.

## Third-Party Authentication

Users may authenticate using externally managed credentials. The system must support OAuth 2.0 identity providers.

- WHEN a user selects "Sign in with Google", "Sign in with GitHub", or "Sign in with Apple", THE system SHALL redirect to the respective identity provider using OAuth 2.0 authorization code flow.
- WHEN a user authenticates through an external provider, THE system SHALL accept only the following claims: subject identifier (sub), email (if provided), and name (if provided).
- WHERE a user signs in via third-party authentication for the first time, THE system SHALL create a new user record with the provided email (if available) and assign role "citizen".
- WHERE a third-party authentication provider returns an invalid or expired token, THE system SHALL display: "Authentication with [Provider] failed. Please try again or use email/password login."
- WHERE a user attempts to link multiple third-party accounts to one communityBBS profile, THE system SHALL deny the request and display: "This account is already linked to another identity. Please log in using your existing connection."
- THE system SHALL not store OAuth tokens, refresh tokens, or any credentials from external providers beyond the current session. The access token must be discarded immediately after profile population.
- THE system SHALL support identity providers that comply with OAuth 2.0 RFC 6749 and OpenID Connect Core 1.0 standards.

## Data Export Requirements

Users have the right to obtain a copy of all data they have contributed to the system.

- WHEN a user submits a data export request via their account settings, THE system SHALL generate a compressed archive containing:
  - All posts authored by the user (with timestamps and status: published/pending/deleted)
  - All comments authored by the user (with associated post ID and timestamp)
  - All profile metadata (username, avatar URL, bio, joined date, last active)
  - A log of all moderation events affecting the user (warnings, suspensions, appeals)
- THE system SHALL deliver the data export in JSON format with a standardized schema, compressed as a .zip file.
- WHERE the export request is submitted by a non-authenticated user or unauthorized entity, THE system SHALL reject the request and return HTTP 401.
- WHEN a user exports their data, THE system SHALL include a metadata header containing: export ID, generation time (ISO 8601), system version, and user identifier (hashed).
- THE system SHALL provide the download link for the export archive for exactly 24 hours, after which the file SHALL be permanently deleted from the server.

## Regulatory Data Handling

The system must comply with global privacy and data protection regulations.

- WHEN a user submits a data deletion request (right to be forgotten), THE system SHALL:
  - Immediately anonymize all content associated with the user: replace username with "[Deleted User]", delete email address, obfuscate profile fields, and permanently remove all PII.
  - Retain only the fact that a user existed, with their ID marked as "deleted" in audit logs, for legal compliance purposes.
  - Queue deletion of all associated posts and comments for background processing within 30 minutes.
- WHILE a deletion request is being processed, THE system SHALL display: "We are processing your request to delete your data. This may take up to 24 hours to complete."
- IF a deletion request is submitted while a user is still logged in, THE system SHALL log the action and force a logout, then display: "Your account has been scheduled for deletion. You will be automatically logged out."
- WHERE jurisdictional laws require data to remain within a specific geographic region (e.g., EU, CA, KR), THE system SHALL ensure all backups, logs, and caches for that user are stored exclusively in servers located within the jurisdiction.
- THE system SHALL retain anonymized activity logs for up to 12 months for audit and abuse trend analysis, but SHALL NOT retain any user-identifiable records beyond 30 days after account deletion.
- IF an audit request is received from a regulatory body under GDPR, CCPA, or similar law, THE system SHALL generate and deliver a full compliance report containing: user data scope, deletion status, data processing activities, and third-party disclosures—all within 72 hours of request.

### Data Exchange Summary

The following data elements may be transmitted externally under the conditions specified above:

| Data Element | External Recipient | Purpose | User Consent Required | Retention Limit |
|--------------|--------------------|---------|------------------------|-----------------|
| User Email Address | Email Delivery Service | Account verification, notifications | Mandatory for registration | 30 days after deletion |
| Anonymized Event Data | Analytics Provider | Usage insights, performance monitoring | Optional, opt-in | 12 months |
| OAuth Claims (sub, email, name) | Third-Party Auth Provider | Identity verification during login | N/A (provider-originated) | Discarded after session |
| User-Generated Content | User (on export request) | Data portability | User-initiated | 24 hours after delivery |
| Moderation Audit Trail | Regulators (on request) | Legal compliance | Regulatory mandate | 12 months |

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*