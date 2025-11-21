# Event Processing Requirements

This document defines the event processing behavior of the communityBBS system. It specifies how user-triggered actions, system-generated events, scheduled tasks, and failure recovery mechanisms operate. All requirements are written in natural language using EARS format to ensure unambiguous understanding by backend developers.

## User Triggered Events

User-initiated actions must trigger system events that are auditable, non-blocking, and processed asynchronously. Each user action results in at least one system event which is recorded in the audit trail.

WHEN a citizen submits a new post, THE system SHALL generate an event with type "POST_CREATED" and include the following data: userId, postId, title, content, category, timestamp, and ipAddress.

WHEN a citizen edits an existing post, THE system SHALL generate an event with type "POST_EDITED" and include the following data: userId, postId, originalTitle, originalContent, editedTitle, editedContent, editTimestamp, and revisionNumber.

WHEN a citizen creates a comment on a post, THE system SHALL generate an event with type "COMMENT_CREATED" and include the following data: userId, postId, commentId, content, parentCommentId (if applicable), and timestamp.

WHEN a citizen reports content (post or comment), THE system SHALL generate an event with type "CONTENT_REPORTED" and include the following data: reporterId, reportedContentId, contentType ("post" or "comment"), reason, additionalDetails, and timestamp.

WHEN a citizen follows another user, THE system SHALL generate an event with type "FOLLOW_CREATED" and include the following data: followerId, followingId, and timestamp.

WHEN a citizen unfollows another user, THE system SHALL generate an event with type "FOLLOW_REMOVED" and include the following data: followerId, followingId, and timestamp.

WHEN a citizen likes a post, THE system SHALL generate an event with type "POST_LIKED" and include the following data: userId, postId, and timestamp.

WHEN a citizen dislikes a post, THE system SHALL generate an event with type "POST_DISLIKED" and include the following data: userId, postId, and timestamp.

WHEN a citizen revokes a like or dislike on a post, THE system SHALL generate an event with type "POST_LIKE_REMOVED" or "POST_DISLIKE_REMOVED" respectively, and include the following data: userId, postId, and timestamp.

WHEN a citizen uploads an image as part of a post or comment, THE system SHALL generate an event with type "IMAGE_UPLOADED" and include the following data: userId, fileId, filename, contentType, fileSize, and timestamp.

WHEN a citizen logs in to the system, THE system SHALL generate an event with type "USER_LOGGED_IN" and include the following data: userId, ipAddress, userAgent, loginTimestamp, and deviceId (if available).

WHEN a citizen logs out of the system, THE system SHALL generate an event with type "USER_LOGGED_OUT" and include the following data: userId, logoutTimestamp, and deviceId (if available).

WHEN a citizen voluntarily deletes their own account, THE system SHALL generate an event with type "USER_ACCOUNT_DELETED" and include the following data: userId, deletionTimestamp, and confirmationMethod ("self-initiated" or "admin-initiated").

## System Generated Events

The system shall generate events autonomously based on predefined business rules, timers, and state transitions. These events operate independently of direct user interaction.

WHILE the system is active, THE system SHALL generate an event with type "PERIODIC_USER_ACTIVITY_CHECK" every 15 minutes to evaluate session inactivity.

WHEN a user's account has been inactive for 90 consecutive days, THE system SHALL generate an event with type "ACCOUNT_INACTIVITY_DETECTED" and include the following data: userId, lastLoginTimestamp, and accountCreationTimestamp.

WHEN a user's post has received 5 or more reports within a 24-hour window, THE system SHALL generate an event with type "POST_FLAGGED_FOR_REVIEW" and include the following data: postId, reportCount, reportDurationHours, reporterIds (array), and firstReportTimestamp.

WHEN a user has been reported 3 or more times within a 30-day period, THE system SHALL generate an event with type "USER_FLAGGED_FOR_MODERATION" and include the following data: userId, totalReports, reportWindowDays, and earliestReportTimestamp.

WHEN a scheduled moderation batch runs at 02:00 AM Korea Standard Time, THE system SHALL generate an event with type "MODERATION_BATCH_STARTED" and include the following data: batchId, startTime, expectedItemCount, and moderatorAssigned (if manual review required).

WHEN a scheduled reputation score recalibration occurs at 03:00 AM Korea Standard Time, THE system SHALL generate an event with type "REPUTATION_SCORE_RECALIBRATED" and include the following data: recalibrationTimestamp, totalUsersUpdated, averageChange, and maxChange.

WHEN a user's account creation attempts exceed 5 failed registrations from the same IP address within 60 minutes, THE system SHALL generate an event with type "IP_BAN_TRIGGERED" and include the following data: ipAddress, failedAttempts, timeWindowMinutes, and firstAttemptTimestamp.

WHEN the system detects that a user's email domain is frequently used for spam (e.g., temp-mail.org, 10minutemail.com), THE system SHALL generate an event with type "SPAM_EMAIL_DOMAIN_DETECTED" and include the following data: userId, userEmail, emailDomain, and classificationScore.

WHEN a moderator takes action on a flagged post or user, THE system SHALL generate an event with type "MODERATOR_ACTION_TAKEN" and include the following data: moderatorId, actionType ("approve", "reject", "delete", "warn", "suspend"), targetId, targetType ("post", "comment", "user"), reason, duration (if applicable), and actionTimestamp.

WHEN an admin performs any system configuration change, THE system SHALL generate an event with type "ADMIN_CONFIGURATION_CHANGED" and include the following data: adminId, settingName, oldValue, newValue, changeDescription, and changeTimestamp.

WHEN the system successfully processes a data export request from an admin, THE system SHALL generate an event with type "DATA_EXPORT_COMPLETED" and include the following data: adminId, userId (if user-specific), exportType ("full", "post", "comment", "account"), fileUrl, fileSize, and completionTimestamp.

## Scheduling and Batch Processing

The system shall execute scheduled and batch operations without interfering with user interaction. All batch jobs must be queued, monitored, and recoverable.

WHEN the time reaches 02:00 AM Korea Standard Time, THE system SHALL trigger a moderation batch job to process all unreviewed flagged content.

WHEN the time reaches 03:00 AM Korea Standard Time, THE system SHALL trigger a reputation score recalibration job to update all user eligibility scores based on activity patterns.

WHEN the time reaches 04:00 AM Korea Standard Time, THE system SHALL trigger a cleanup job to remove temporary files older than 7 days.

WHEN the time reaches 05:00 AM Korea Standard Time, THE system SHALL trigger a notification dispatch job to deliver pending user notifications.

WHILE the moderation batch job is running, THE system SHALL continue to accept new posts, comments, and reports from users without degradation.

WHILE the reputation recalibration job is running, THE system SHALL allow all normal user interactions but delay reputation-based feature updates until processing completes.

WHEN a scheduled batch job exceeds its timeout of 30 minutes, THE system SHALL generate an event with type "BATCH_JOB_TIMED_OUT" and include the following data: jobId, jobType, startTime, timeoutDurationMinutes, and lastProcessedRecordId.

WHERE the system detects high system load (>85% CPU usage for 10 consecutive minutes), THE system SHALL delay non-critical batch job execution by a minimum of 30 minutes.

WHEN a batch job is configured as "critical", THE system SHALL retry failed jobs up to 3 times with exponential backoff (5 min, 15 min, 45 min).

## Deferred Messages and Dead-Letter Handling

Events that fail processing during transport or processing must be captured, logged, and made recoverable. The system shall maintain a dead-letter storage for defective events.

IF an event fails to be published to the event bus due to network failure, THEN THE system SHALL place the event in a retry queue with an initial delay of 10 seconds and up to 5 retry attempts.

IF an event fails after 5 retry attempts, THEN THE system SHALL move the event to a dead-letter queue named "dead-letter-events" and generate an event with type "EVENT_DEAD_LETTERED" with the following data: originalEventId, originalEventType, failedPayload, errorType, errorDetails, firstAttemptTimestamp, lastAttemptTimestamp, and retryCount.

WHILE an event is in the retry queue, THE system SHALL attempt delivery every 10 seconds for the first two attempts, then every minute for subsequent attempts.

WHEN an event is moved to the dead-letter queue, THE system SHALL generate a notification to the system administrator team via email and internal dashboard.

THE system SHALL provide an accessible API endpoint for moderators and administrators to view, archive, or reprocess events in the dead-letter queue.

WHERE a dead-letter event is reprocessed successfully, THE system SHALL generate an event with type "DEAD_LETTER_RECOVERED" and include the following data: originalEventId, recoveryTimestamp, recoveryMethod ("manual" or "automatic"), and operatorId (if manual).

WHERE a dead-letter event is archived without reprocessing, THE system SHALL generate an event with type "DEAD_LETTER_ARCHIVED" and include the following data: originalEventId, archiveTimestamp, archiveReason, and archiverId.

## Event Acknowledgment

All events that result in observable user impact or system state changes must be acknowledged with user feedback.

WHEN a citizen submits a post and the event is successfully processed, THE system SHALL display the message: "Your post has been published."

WHEN a citizen edits a post and the event is successfully processed, THE system SHALL display the message: "Your post has been updated."

WHEN a citizen attempts to submit a post with missing required fields, THE system SHALL display a clear, actionable error: "Please fill in all required fields before submitting."

WHEN a citizen reports content and the event is successfully processed, THE system SHALL display the message: "Thank you for reporting this content. Our moderators will review it."

WHEN a citizen attempts to report content they authored, THE system SHALL display the message: "You cannot report your own content."

WHEN a citizen attempts to like a post they already liked, THE system SHALL display the message: "You've already liked this post."

WHEN a moderator takes action on a reported post, THE system SHALL display a confirmation: "Action taken: [Action] on Post #[ID]."

WHEN an admin performs a system configuration change, THE system SHALL display a confirmation: "Configuration updated successfully."

## Audit Trail Requirements

The system shall maintain a permanent, immutable audit trail of all events for compliance, debugging, and forensic analysis. All event data must be stored for a minimum of 2 years.

WHEN any user-triggered, system-generated, or administrative event occurs, THE system SHALL record the event in an immutable audit log with the following data: eventId, eventType, timestamp, userId, ipAddress, userAgent, actionDetails, and sourceSystem ("web", "mobile", "admin", "scheduler").

WHEN any event is moved to the dead-letter queue or recovered from it, THE system SHALL record the transition event in the audit log with the following data: transitionType, originalEventId, newLocation, timestamp, operatorId, and reason.

WHEN the system performs a data export operation, THE system SHALL log the request, including exact user criteria and selected data fields, in the audit trail.

WHEN any admin resets a user's password or deactivates an account, THE system SHALL record the action with the admin's ID and reason (if provided).

WHERE a moderator deletes a post or comment, THE system SHALL preserve a redacted copy of the content in the audit trail with metadata indicating it was removed for policy violation.

THE system SHALL allow compliance officers to search and export audit records by user, event type, timestamp range, or IP address.

WHERE legal authorities request data, THE system SHALL provide audit trail records in standard JSON or CSV format within 72 hours of a valid request.

THE audit log SHALL be stored in a write-once, append-only storage system with cryptographic integrity verification.

THE system SHALL perform daily integrity checks on the audit log and notify administrators if any entry is altered or corrupted.

THE audit log shall be encrypted at rest and only accessible to administrators with explicit compliance permissions.

All event audit records SHALL remain accessible and searchable for a minimum of 24 months after creation.