# Business Rules and Validation for Economic/Political Discussion Board

## Introduction
This document formalizes all essential business rules and validation criteria for building and maintaining a simple economic/political discussion board. It defines clear, testable expectations for core features, attachment management, anti-abuse logic, and the conduct users must follow. All requirements use the EARS format where possible, follow plain natural language, and avoid technical design specifics. These business rules ensure the platform remains simple, safe, accessible, and minimal as intended.

## Content Creation Rules
### Article Creation
- WHEN a user creates an article, THE system SHALL require a title with a minimum of 5 and a maximum of 150 characters.
- WHEN a user creates an article, THE system SHALL require article content with a minimum of 20 and a maximum of 5000 characters.
- WHEN a user submits an article, THE system SHALL require that either the title, content, or at least one attachment is present (articles with only empty fields and no files SHALL be rejected).
- THE system SHALL allow articles in economic or political domains only; off-topic articles SHALL be handled as violations.
- WHEN a user attempts to submit multiple articles in less than 1 minute, THE system SHALL reject submissions and display a clear message about submission frequency limits.
- WHERE an article is edited, THE system SHALL track the last modified timestamp.
- IF an article is deleted, THEN THE system SHALL remove all associated comments and attachments.
- IF an article does not meet length or topic requirements, THEN THE system SHALL reject the article and provide an explicit reason.
- WHERE an article exceeds 5000 characters in content or 150 characters in the title, THE system SHALL reject the article.
- THE system SHALL allow users to update or delete their own articles at any time. WHERE an admin initiates update or deletion, THE system SHALL allow admin to act on any article without restriction.

### Comment Creation
- WHEN a user creates a comment, THE system SHALL require comment content between 2 and 1000 characters.
- THE system SHALL allow comments on any article that has not been deleted or locked by moderation.
- IF a comment is created on a deleted article, THEN THE system SHALL reject the comment.
- WHEN a user posts repeated comments on the same article within 30 seconds, THE system SHALL reject subsequent submissions as potential spam.
- WHERE a comment exceeds 1000 characters, THE system SHALL reject the comment.
- THE system SHALL allow users to update or delete their own comments. WHERE an admin initiates update or deletion, THE system SHALL allow admin to act on any comment without restriction.

### Content Update and Deletion
- WHEN a user requests to update or delete their own article or comment, THE system SHALL require authentication and verify ownership.
- WHERE an admin updates or deletes any content, THE system SHALL log the actor ID and reason.

## Attachment Constraints
### Allowed Attachments
- THE system SHALL allow users to upload image and general file attachments when creating or editing articles.
- THE system SHALL support the following image formats for upload: JPEG, PNG, WebP, and GIF.
- THE system SHALL support the following document/file types: PDF, DOCX, XLSX, PPTX, TXT, and CSV.

### Attachment Limits
- WHERE a user attaches files to an article, THE system SHALL limit the number of attachments to 5 per article.
- WHERE a user attaches files to a comment, THE system SHALL limit the number of attachments to 2 per comment.
- THE system SHALL enforce a maximum file size of 10MB per attachment, regardless of type.
- IF a file exceeds 10MB, THEN THE system SHALL reject the upload and provide a clear message.
- IF a file extension or MIME type is not on the allowed list, THEN THE system SHALL reject the upload.
- WHEN an article or comment is deleted, THE system SHALL also remove all associated attachments within 24 hours.

### Attachment Privacy and Access
- THE system SHALL only allow authenticated users to download attachments.
- IF a user attempts to access an attachment without necessary permissions (not the owner/admin), THEN THE system SHALL deny access.
- WHERE an admin removes an attachment for violation, THE system SHALL log the actor and reason.

## Spam/Abuse Handling
### Anti-Spam and Flood Control
- WHEN a user attempts to create more than 3 articles per hour, THE system SHALL block further submissions and display a warning.
- WHEN a user attempts to post more than 5 comments per minute, THE system SHALL block further comments and display an anti-spam message.
- IF content (article, comment, or attachment) contains repeated, irrelevant, or nonsensical entries, THEN THE system SHALL mark it for moderation as potential spam.

### Abusive Content Detection and Moderation
- IF content includes hate speech, obscene language, explicit threats, personal attacks, or illegal content, THEN THE system SHALL immediately hide it from public view and flag it for admin review.
- WHEN a user flags content as abusive, THE system SHALL notify admins and prioritize review.
- WHEN repeated abuse is confirmed from a user, THE system SHALL allow admins to block (suspend) or delete the user account, including removal of their articles, comments, and attachments.

### Moderation Actions
- WHERE an admin moderates content (delete/edit/hide), THE system SHALL require logging the admin's ID, action, and reason.
- IF an admin's action was in error, THEN THE system SHALL allow restoring the affected content from a moderation log (only for admins).

## User Behavior Expectations
- THE system SHALL require all users to treat each other respectfully in discussions; personal attacks, trolling, or harassment violate conduct rules.
- THE system SHALL prohibit "doxxing": publishing private/personal information without consent.
- WHERE a user persists in violating conduct rules after at least one warning, THE system SHALL block or suspend the user account.
- WHEN a user is blocked or suspended, THE system SHALL communicate the reason and provide appeal instructions.
- THE system SHALL prohibit promotional or commercial spam (including unsolicited advertisements and repetitive links).
- WHERE there is a dispute (such as removal for violation), THE system SHALL allow users to request review/appeal via a formal process.
- THE system SHALL display community guidelines to all users during registration and before article submission.

## Summary
These business rules and validation criteria are designed to maintain a civil, focused, and safe economic/political discussion board. All requirements above SHALL be implemented and interpreted strictly from a business perspective, with enforcement, moderation, and error handling aligned to the needs of clear, fair, and minimal community governance.
