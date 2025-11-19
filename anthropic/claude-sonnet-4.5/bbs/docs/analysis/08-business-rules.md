# Business Rules and Validation Requirements

## Introduction

This document defines all business rules, validation requirements, and operational constraints that govern the discussion board system. These rules ensure content quality, system integrity, user safety, and productive economic and political discussions. All rules must be enforced consistently across the system to maintain a high-quality discussion environment.

**Developer Autonomy**: This document defines business requirements only. All technical implementations (architecture, APIs, database design, validation frameworks, etc.) are at the discretion of the development team.

## Content Validation Rules

### Article Content Requirements

**AR-CV-001**: THE system SHALL require every article to have a title between 5 and 200 characters in length.

**AR-CV-002**: THE system SHALL require every article to have body content between 50 and 50,000 characters in length.

**AR-CV-003**: WHEN a user creates or edits an article, THE system SHALL reject titles containing only whitespace characters.

**AR-CV-004**: WHEN a user creates or edits an article, THE system SHALL reject body content containing only whitespace characters.

**AR-CV-005**: THE system SHALL support rich text formatting in article bodies including bold, italic, underline, headings, lists, and blockquotes.

**AR-CV-006**: WHEN a user submits an article, THE system SHALL sanitize all HTML content to prevent script injection attacks.

**AR-CV-007**: THE system SHALL preserve line breaks and paragraph formatting in article content.

**AR-CV-008**: WHEN an article contains external URLs, THE system SHALL validate that URLs follow proper format (http:// or https://).

**AR-CV-009**: THE system SHALL allow articles to contain no attachments, enabling text-only discussions.

**AR-CV-010**: WHEN a user attempts to create an article without a title, THE system SHALL display error message "Article title is required and must be between 5 and 200 characters".

**AR-CV-011**: WHEN a user attempts to create an article with insufficient body content, THE system SHALL display error message "Article body must contain at least 50 characters of meaningful content".

### Article Categorization Rules

**AR-CAT-001**: THE system SHALL support categorizing articles as "Economic", "Political", or "General Discussion".

**AR-CAT-002**: WHEN a user creates an article, THE system SHALL require selection of exactly one category.

**AR-CAT-003**: THE system SHALL allow users to change an article's category when editing their own published articles.

**AR-CAT-004**: WHERE a moderator reviews an article, THE system SHALL allow the moderator to recategorize the article if it is misclassified.

**AR-CAT-005**: WHEN browsing articles, THE system SHALL allow filtering by category to help users find relevant discussions.

### Content Quality Rules

**AR-CQ-001**: THE system SHALL enforce a minimum time interval of 30 seconds between consecutive article submissions by the same member to prevent spam.

**AR-CQ-002**: WHEN a member has created 3 or more articles within 10 minutes, THE system SHALL require a 5-minute cooldown before allowing the next article submission.

**AR-CQ-003**: THE system SHALL allow members to edit their own articles at any time after publication.

**AR-CQ-004**: WHEN a member edits an article, THE system SHALL record the edit timestamp and display "Last edited" information to readers.

**AR-CQ-005**: THE system SHALL limit members to a maximum of 100 published articles to maintain manageable content volume.

**AR-CQ-006**: IF a member reaches the 100-article limit, THEN THE system SHALL require deletion of an existing article before allowing creation of a new one.

## User Permission Rules

### Guest User Permissions

**UP-GUEST-001**: THE system SHALL allow guest users to browse the list of all published articles without authentication.

**UP-GUEST-002**: THE system SHALL allow guest users to read the full content of any published article without authentication.

**UP-GUEST-003**: THE system SHALL allow guest users to view attached images within articles without authentication.

**UP-GUEST-004**: THE system SHALL allow guest users to download file attachments from articles without authentication.

**UP-GUEST-005**: WHEN a guest user attempts to create an article, THE system SHALL deny access and display message "Please register or log in to create articles".

**UP-GUEST-006**: WHEN a guest user attempts to edit any content, THE system SHALL deny access and display message "Please register or log in to edit content".

**UP-GUEST-007**: THE system SHALL allow guest users to search for articles by title, content, or category.

**UP-GUEST-008**: THE system SHALL display a visible registration prompt to guest users encouraging them to join the community.

### Member User Permissions

**UP-MEMBER-001**: THE system SHALL allow authenticated members to create new articles with attachments.

**UP-MEMBER-002**: THE system SHALL allow members to edit only their own articles at any time.

**UP-MEMBER-003**: THE system SHALL allow members to delete only their own articles.

**UP-MEMBER-004**: WHEN a member attempts to edit another member's article, THE system SHALL deny access and display message "You can only edit your own articles".

**UP-MEMBER-005**: WHEN a member attempts to delete another member's article, THE system SHALL deny access and display message "You can only delete your own articles".

**UP-MEMBER-006**: THE system SHALL allow members to view their complete article history and statistics.

**UP-MEMBER-007**: THE system SHALL allow members to update their own profile information including display name and bio.

**UP-MEMBER-008**: THE system SHALL prevent members from changing their registered email address without email verification.

**UP-MEMBER-009**: THE system SHALL allow members to upload and update their profile avatar image.

**UP-MEMBER-010**: THE system SHALL allow members to change their account password by providing the current password.

### Moderator User Permissions

**UP-MOD-001**: THE system SHALL allow moderators to edit any article regardless of authorship.

**UP-MOD-002**: THE system SHALL allow moderators to delete any article that violates community guidelines.

**UP-MOD-003**: THE system SHALL allow moderators to remove any attachment from any article.

**UP-MOD-004**: THE system SHALL allow moderators to change the category of any article.

**UP-MOD-005**: THE system SHALL allow moderators to temporarily suspend member accounts for up to 30 days.

**UP-MOD-006**: THE system SHALL allow moderators to permanently ban member accounts for severe violations.

**UP-MOD-007**: WHEN a moderator edits an article, THE system SHALL record the moderator's identity and action in an audit log.

**UP-MOD-008**: WHEN a moderator deletes content, THE system SHALL record the deletion reason and moderator identity.

**UP-MOD-009**: THE system SHALL allow moderators to view all flagged and reported content in a moderation queue.

**UP-MOD-010**: THE system SHALL prevent suspended members from creating or editing content during the suspension period.

**UP-MOD-011**: THE system SHALL allow moderators to restore deleted articles within 30 days of deletion.

## Article Publishing Rules

### Article State Management

**AP-STATE-001**: THE system SHALL support three article states: "Draft", "Published", and "Archived".

**AP-STATE-002**: WHEN a member creates a new article, THE system SHALL set the initial state to "Draft" by default.

**AP-STATE-003**: THE system SHALL allow members to save articles as drafts without publishing immediately.

**AP-STATE-004**: WHEN a member publishes a draft article, THE system SHALL change the state from "Draft" to "Published" and record the publication timestamp.

**AP-STATE-005**: THE system SHALL display only "Published" articles in public article listings to guest and member users.

**AP-STATE-006**: THE system SHALL allow members to view their own draft articles in their personal article management area.

**AP-STATE-007**: WHEN a member deletes an article, THE system SHALL change the state to "Archived" rather than permanently deleting immediately.

**AP-STATE-008**: THE system SHALL hide "Archived" articles from all public views and search results.

**AP-STATE-009**: THE system SHALL allow moderators to view archived articles for moderation review purposes.

**AP-STATE-010**: WHEN a draft article remains unpublished for 90 days, THE system SHALL automatically archive it and notify the author.

### Article Visibility Rules

**AP-VIS-001**: THE system SHALL make all published articles visible to all users including guests.

**AP-VIS-002**: THE system SHALL display articles in reverse chronological order by publication date by default.

**AP-VIS-003**: THE system SHALL allow users to sort articles by publication date, title, or category.

**AP-VIS-004**: THE system SHALL display the article author's display name, publication date, category, and last edited timestamp with every article.

**AP-VIS-005**: THE system SHALL show a count of total attachments (images and files) for each article in listing views.

**AP-VIS-006**: THE system SHALL paginate article listings to display 20 articles per page for performance and usability.

**AP-VIS-007**: WHEN viewing an individual article, THE system SHALL display all attached images inline within the article content area.

**AP-VIS-008**: WHEN viewing an individual article, THE system SHALL display file attachments as downloadable links with filename and file size.

### Article Modification Rules

**AP-MOD-001**: THE system SHALL allow unlimited edits to published articles by the original author.

**AP-MOD-002**: WHEN an article is edited, THE system SHALL update the "last edited" timestamp visible to all readers.

**AP-MOD-003**: THE system SHALL prevent editing of archived articles by members.

**AP-MOD-004**: WHERE a moderator edits an article, THE system SHALL add a visible moderator note indicating the article was edited by moderation.

**AP-MOD-005**: THE system SHALL preserve the original publication date when articles are edited.

**AP-MOD-006**: THE system SHALL allow changing article category during editing by both authors and moderators.

## Attachment Validation Rules

### File Type Restrictions

**AT-TYPE-001**: THE system SHALL accept image attachments in JPEG, PNG, GIF, and WebP formats only.

**AT-TYPE-002**: THE system SHALL accept document attachments in PDF, DOC, DOCX, XLS, XLSX, and TXT formats only.

**AT-TYPE-003**: WHEN a user attempts to upload a file with an unsupported format, THE system SHALL reject the upload and display message "File format not supported. Allowed formats: JPEG, PNG, GIF, WebP, PDF, DOC, DOCX, XLS, XLSX, TXT".

**AT-TYPE-004**: THE system SHALL validate file types by examining file content headers, not just file extensions, to prevent malicious uploads.

**AT-TYPE-005**: THE system SHALL reject files that claim to be supported formats but have mismatched content signatures.

### File Size Limits

**AT-SIZE-001**: THE system SHALL enforce a maximum file size of 5 MB for each image attachment.

**AT-SIZE-002**: THE system SHALL enforce a maximum file size of 10 MB for each document attachment.

**AT-SIZE-003**: WHEN a user attempts to upload a file exceeding size limits, THE system SHALL reject the upload and display message "File size exceeds maximum allowed. Images: 5 MB max, Documents: 10 MB max".

**AT-SIZE-004**: THE system SHALL enforce a maximum total attachment size of 25 MB per article across all attachments combined.

**AT-SIZE-005**: IF total attachment size for an article exceeds 25 MB, THEN THE system SHALL prevent adding additional attachments until existing attachments are removed.

### Attachment Quantity Limits

**AT-QTY-001**: THE system SHALL allow a maximum of 10 image attachments per article.

**AT-QTY-002**: THE system SHALL allow a maximum of 5 document attachments per article.

**AT-QTY-003**: WHEN a user attempts to exceed attachment quantity limits, THE system SHALL reject the upload and display message "Maximum attachment limit reached. Images: 10 max, Documents: 5 max per article".

**AT-QTY-004**: THE system SHALL allow users to remove existing attachments to make room for new attachments.

### Attachment Security Rules

**AT-SEC-001**: THE system SHALL scan all uploaded files for malware and viruses before accepting them.

**AT-SEC-002**: IF a file fails malware scanning, THEN THE system SHALL reject the upload and display message "File rejected: security scan failed".

**AT-SEC-003**: THE system SHALL strip metadata (EXIF data, document properties) from uploaded files to protect user privacy.

**AT-SEC-004**: THE system SHALL generate unique, non-guessable filenames for stored attachments to prevent unauthorized access.

**AT-SEC-005**: THE system SHALL validate image dimensions and reject images larger than 10,000 x 10,000 pixels to prevent resource exhaustion attacks.

**AT-SEC-006**: THE system SHALL reject executable files even if they are renamed with allowed extensions.

### Attachment Management Rules

**AT-MGT-001**: THE system SHALL allow article authors to delete attachments from their own articles at any time.

**AT-MGT-002**: THE system SHALL allow moderators to delete attachments from any article.

**AT-MGT-003**: WHEN an article is archived, THE system SHALL retain all attachments for the same 30-day retention period.

**AT-MGT-004**: THE system SHALL permanently delete all attachments when the parent article is permanently deleted after the 30-day archival period.

**AT-MGT-005**: THE system SHALL allow replacing an attachment by deleting the old one and uploading a new one.

**AT-MGT-006**: THE system SHALL display attachment upload progress indicators for files larger than 1 MB.

**AT-MGT-007**: WHEN an attachment upload fails, THE system SHALL allow users to retry the upload without losing other form data.

## Account Management Rules

### Registration Requirements

**ACC-REG-001**: THE system SHALL require a valid email address for member registration.

**ACC-REG-002**: THE system SHALL require a password between 8 and 64 characters for member registration.

**ACC-REG-003**: THE system SHALL require passwords to contain at least one uppercase letter, one lowercase letter, one number, and one special character.

**ACC-REG-004**: WHEN a user attempts to register with a weak password, THE system SHALL reject registration and display message "Password must be 8-64 characters and include uppercase, lowercase, number, and special character".

**ACC-REG-005**: THE system SHALL check for duplicate email addresses and prevent registration with already-registered emails.

**ACC-REG-006**: WHEN a user attempts to register with an existing email, THE system SHALL display message "This email address is already registered. Please log in or use a different email".

**ACC-REG-007**: THE system SHALL require a display name between 3 and 30 characters for registration.

**ACC-REG-008**: THE system SHALL allow display names to contain letters, numbers, spaces, hyphens, and underscores only.

**ACC-REG-009**: THE system SHALL check for duplicate display names and prevent registration with already-used display names.

**ACC-REG-010**: THE system SHALL send an email verification link to newly registered users.

**ACC-REG-011**: WHEN a user completes registration, THE system SHALL create an unverified member account that can log in but cannot create articles until email is verified.

**ACC-REG-012**: THE system SHALL require email verification within 7 days of registration or automatically delete the unverified account.

### Login and Session Rules

**ACC-LOGIN-001**: THE system SHALL accept either email address or display name as login identifier.

**ACC-LOGIN-002**: WHEN a user enters incorrect credentials, THE system SHALL display generic message "Invalid login credentials" without revealing whether email or password was incorrect.

**ACC-LOGIN-003**: THE system SHALL implement rate limiting of 5 failed login attempts per IP address within 15 minutes.

**ACC-LOGIN-004**: IF a user exceeds login attempt limits, THEN THE system SHALL temporarily block login attempts from that IP address for 30 minutes.

**ACC-LOGIN-005**: THE system SHALL generate a JWT access token with 30-minute expiration upon successful login.

**ACC-LOGIN-006**: THE system SHALL generate a JWT refresh token with 30-day expiration upon successful login.

**ACC-LOGIN-007**: THE system SHALL include userId, display name, email, actor role, and verification status in JWT payload.

**ACC-LOGIN-008**: THE system SHALL allow users to maintain multiple active sessions across different devices.

**ACC-LOGIN-009**: THE system SHALL provide a "Logout from all devices" function that invalidates all refresh tokens for the user.

**ACC-LOGIN-010**: WHILE a user session is active, THE system SHALL automatically refresh the access token when it expires using the refresh token.

### Profile Management Rules

**ACC-PROF-001**: THE system SHALL allow members to update their display name at any time if the new name is not already taken.

**ACC-PROF-002**: THE system SHALL allow members to add or update a bio text up to 500 characters.

**ACC-PROF-003**: THE system SHALL allow members to upload a profile avatar image in JPEG or PNG format up to 2 MB.

**ACC-PROF-004**: THE system SHALL automatically resize profile avatars to 200x200 pixels for consistent display.

**ACC-PROF-005**: WHEN a member updates their email address, THE system SHALL require verification of the new email before applying the change.

**ACC-PROF-006**: THE system SHALL send verification emails to both old and new email addresses when email change is requested.

**ACC-PROF-007**: THE system SHALL maintain the old email address until the new email is verified.

**ACC-PROF-008**: IF email verification is not completed within 7 days, THEN THE system SHALL cancel the email change request.

### Password Management Rules

**ACC-PWD-001**: THE system SHALL require the current password when a user attempts to change their password.

**ACC-PWD-002**: THE system SHALL apply the same password strength requirements for password changes as for registration.

**ACC-PWD-003**: THE system SHALL prevent users from reusing their last 3 passwords.

**ACC-PWD-004**: WHEN a password change is successful, THE system SHALL invalidate all existing sessions and require re-login.

**ACC-PWD-005**: THE system SHALL provide a password reset function accessible from the login page.

**ACC-PWD-006**: WHEN a user requests password reset, THE system SHALL send a reset link to the registered email address with 1-hour expiration.

**ACC-PWD-007**: THE system SHALL generate a unique, non-guessable token for each password reset request.

**ACC-PWD-008**: THE system SHALL not reveal whether an email address exists in the system when password reset is requested.

**ACC-PWD-009**: THE system SHALL invalidate previous password reset tokens when a new one is requested.

**ACC-PWD-010**: WHEN a password is successfully reset, THE system SHALL send a confirmation email to the account holder.

### Account Suspension and Banning Rules

**ACC-BAN-001**: THE system SHALL allow moderators to suspend member accounts for periods of 1, 7, 14, or 30 days.

**ACC-BAN-002**: WHEN a member account is suspended, THE system SHALL immediately terminate all active sessions and prevent login.

**ACC-BAN-003**: WHEN a suspended user attempts to log in, THE system SHALL display message "Your account is suspended until [date]. Reason: [reason]".

**ACC-BAN-004**: THE system SHALL automatically lift suspensions when the suspension period expires.

**ACC-BAN-005**: THE system SHALL allow moderators to provide a reason for suspension that is visible to the suspended user.

**ACC-BAN-006**: THE system SHALL allow moderators to permanently ban member accounts for severe violations.

**ACC-BAN-007**: WHEN a member account is permanently banned, THE system SHALL archive all their articles and prevent any future login.

**ACC-BAN-008**: THE system SHALL allow moderators to reverse suspensions and bans if they were applied in error.

**ACC-BAN-009**: THE system SHALL log all suspension and ban actions with moderator identity, timestamp, and reason.

**ACC-BAN-010**: THE system SHALL send an email notification to users when their account is suspended or banned with the reason and duration.

## Moderation Policy Rules

### Content Reporting and Flagging

**MOD-REPORT-001**: THE system SHALL allow any authenticated member to report an article for policy violations.

**MOD-REPORT-002**: THE system SHALL provide report reason categories: "Spam", "Offensive Content", "Misinformation", "Off-Topic", "Other".

**MOD-REPORT-003**: WHEN a member reports content, THE system SHALL require the member to select a reason category and optionally provide additional details.

**MOD-REPORT-004**: THE system SHALL prevent members from reporting the same article multiple times.

**MOD-REPORT-005**: THE system SHALL add reported articles to a moderation queue visible to all moderators.

**MOD-REPORT-006**: THE system SHALL display the number of reports and report reasons for each flagged article in the moderation queue.

**MOD-REPORT-007**: THE system SHALL prioritize articles with multiple reports higher in the moderation queue.

**MOD-REPORT-008**: THE system SHALL send notification to moderators when an article receives 3 or more reports.

### Moderation Actions

**MOD-ACTION-001**: THE system SHALL allow moderators to mark reported articles as "Reviewed - No Action", "Reviewed - Edited", or "Reviewed - Removed".

**MOD-ACTION-002**: WHEN a moderator marks a report as "No Action", THE system SHALL remove the article from the moderation queue and log the decision.

**MOD-ACTION-003**: THE system SHALL allow moderators to edit article content to remove policy violations while preserving the article.

**MOD-ACTION-004**: WHEN a moderator edits an article for policy violations, THE system SHALL add a visible note "Edited by moderation for policy compliance".

**MOD-ACTION-005**: THE system SHALL allow moderators to completely remove articles that severely violate policies.

**MOD-ACTION-006**: WHEN a moderator removes an article, THE system SHALL require a removal reason to be recorded.

**MOD-ACTION-007**: THE system SHALL notify the article author via email when their article is edited or removed by moderation with the reason.

**MOD-ACTION-008**: THE system SHALL allow moderators to remove specific attachments without deleting the entire article.

**MOD-ACTION-009**: THE system SHALL track moderation response time and display average time to resolve reports in moderator dashboard.

### Moderation Guidelines Enforcement

**MOD-GUIDE-001**: THE system SHALL enforce a policy prohibiting spam, including repetitive promotional content and automated posts.

**MOD-GUIDE-002**: THE system SHALL enforce a policy prohibiting personal attacks, threats, harassment, and hate speech.

**MOD-GUIDE-003**: THE system SHALL enforce a policy requiring discussions to remain focused on economic or political topics appropriate to the discussion board's purpose.

**MOD-GUIDE-004**: THE system SHALL enforce a policy prohibiting deliberate spread of false or misleading information when flagged and verified.

**MOD-GUIDE-005**: THE system SHALL allow robust debate and disagreement while prohibiting uncivil behavior.

**MOD-GUIDE-006**: WHEN content violates guidelines, THE system SHALL support moderator actions proportional to violation severity: warning, edit, temporary suspension, or permanent ban.

**MOD-GUIDE-007**: THE system SHALL provide moderators with violation history for each member to inform moderation decisions.

**MOD-GUIDE-008**: THE system SHALL track escalating violations and automatically flag members with 3 or more violations in 30 days for moderator review.

### Moderation Transparency

**MOD-TRANS-001**: THE system SHALL maintain an audit log of all moderation actions including action type, moderator identity, target content, timestamp, and reason.

**MOD-TRANS-002**: THE system SHALL allow moderators to view the complete moderation history for any article or member.

**MOD-TRANS-003**: THE system SHALL display aggregate moderation statistics including total reports, actions taken, and response times.

**MOD-TRANS-004**: THE system SHALL allow members to view their own moderation history including warnings, suspensions, and removed content.

**MOD-TRANS-005**: THE system SHALL provide moderators with a dashboard showing pending reports, recent actions, and queue statistics.

## Data Retention and Archiving

### Article Lifecycle Management

**DATA-ART-001**: THE system SHALL retain published articles indefinitely unless deleted by the author or moderator.

**DATA-ART-002**: WHEN a member deletes their own article, THE system SHALL change the state to "Archived" and retain the article for 30 days.

**DATA-ART-003**: THE system SHALL allow members to restore their own archived articles within the 30-day retention period.

**DATA-ART-004**: THE system SHALL permanently delete articles 30 days after archiving with no restoration possible.

**DATA-ART-005**: THE system SHALL retain draft articles for 90 days of inactivity before automatically archiving them.

**DATA-ART-006**: WHEN a draft article is auto-archived, THE system SHALL send a notification email to the author with an option to restore.

**DATA-ART-007**: THE system SHALL allow members to permanently delete their own drafts immediately without a retention period.

### Attachment Lifecycle

**DATA-ATT-001**: THE system SHALL retain all attachments as long as their parent article exists in published or draft state.

**DATA-ATT-002**: WHEN an article is archived, THE system SHALL retain all attachments for the same 30-day retention period.

**DATA-ATT-003**: THE system SHALL permanently delete all attachments when the parent article is permanently deleted.

**DATA-ATT-004**: WHEN an individual attachment is removed from an article, THE system SHALL permanently delete the attachment file within 24 hours.

**DATA-ATT-005**: THE system SHALL maintain storage quota tracking and alert moderators when total storage exceeds 80% of allocated capacity.

### User Data Retention

**DATA-USER-001**: THE system SHALL retain member account data indefinitely as long as the account remains active.

**DATA-USER-002**: THE system SHALL allow members to request complete account deletion including all personal data.

**DATA-USER-003**: WHEN a member requests account deletion, THE system SHALL archive all their articles and permanently delete the account after 30 days.

**DATA-USER-004**: THE system SHALL allow members to withdraw account deletion requests within the 30-day period.

**DATA-USER-005**: WHEN an account is permanently deleted, THE system SHALL remove all personal identifiable information including email, display name, and profile data.

**DATA-USER-006**: THE system SHALL retain archived articles from deleted accounts in anonymized form with author shown as "Deleted User".

**DATA-USER-007**: THE system SHALL permanently delete unverified accounts that fail to verify email within 7 days of registration.

### Audit Log Retention

**DATA-AUDIT-001**: THE system SHALL retain authentication logs (login, logout, password changes) for 90 days.

**DATA-AUDIT-002**: THE system SHALL retain moderation action logs for 2 years for accountability and dispute resolution.

**DATA-AUDIT-003**: THE system SHALL retain content report logs for 1 year after resolution.

**DATA-AUDIT-004**: THE system SHALL retain account suspension and ban logs indefinitely for policy enforcement history.

**DATA-AUDIT-005**: THE system SHALL allow moderators to export audit logs for specific time periods in CSV format.

### Backup and Recovery

**DATA-BACKUP-001**: THE system SHALL create daily backups of all article content, user accounts, and attachments.

**DATA-BACKUP-002**: THE system SHALL retain daily backups for 7 days and weekly backups for 30 days.

**DATA-BACKUP-003**: THE system SHALL verify backup integrity weekly to ensure data can be restored.

**DATA-BACKUP-004**: WHEN data loss occurs, THE system SHALL support restoration from the most recent valid backup within 4 hours.

**DATA-BACKUP-005**: THE system SHALL encrypt all backup data to protect user privacy and content confidentiality.

## Business Rule Summary

This document has defined comprehensive business rules across seven critical areas:

1. **Content Validation** - Ensuring article quality through length requirements, formatting rules, and spam prevention
2. **User Permissions** - Clearly defining what each actor type (guest, member, moderator) can and cannot do
3. **Article Publishing** - Managing article states, visibility, and modification workflows
4. **Attachment Validation** - Enforcing file type, size, and security requirements for uploads
5. **Account Management** - Governing registration, authentication, profile management, and account lifecycle
6. **Moderation Policies** - Establishing content reporting, review processes, and enforcement guidelines
7. **Data Retention** - Defining lifecycle management for articles, attachments, user data, and logs

All rules are designed to support a simple yet effective economic and political discussion board that maintains quality while remaining accessible to non-technical users. The rules prevent abuse and spam while enabling productive discussions and straightforward moderation.

Backend developers should implement these rules as validation logic, access controls, and business process workflows throughout the application. Each rule is written in EARS format to be testable and verifiable in the implementation.