# Business Rules for Economic/Political Discussion Board

## Attachment Limits

### Maximum File Size
- WHEN a user uploads a file, THE system SHALL reject files larger than 10 MB.
- WHEN a user uploads an image, THE system SHALL reject images larger than 5 MB.
- THE system SHALL enforce size limits at the file upload stage before processing.

### Maximum Attachments per Post
- WHEN a user creates a post, THE system SHALL allow a maximum of 5 file attachments.
- WHEN a user creates a post, THE system SHALL allow a maximum of 3 image attachments.
- THE system SHALL combine image and file attachments into a single limit of 5 total items.
- IF a user attempts to upload 6 attachments, THEN THE system SHALL display error: "Maximum 5 attachments allowed per post."

## File Types Allowed

### Accepted File Extensions
- THE system SHALL accept the following file extensions:
  - Images: .jpg, .jpeg, .png, .gif, .webp
  - Documents: .pdf, .doc, .docx, .txt, .md
  - Spreadsheets: .xls, .xlsx
  - Archives: .zip, .rar

### Accepted MIME Types
- THE system SHALL validate uploads using MIME type detection in addition to file extension.
- IF a file has an allowed extension but forbidden MIME type, THEN THE system SHALL reject it with error: "Invalid file type. The file does not match its reported content."
- THE system SHALL NOT accept executable files (.exe, .bat, .sh, .dll, .bin, .app) under any circumstances.

## Content Restrictions

### Prohibited Content Types
- THE system SHALL prohibit posts containing:
  - Links to phishing sites, malware distribution, or illegal content
  - Personal identification information (PII) such as full home addresses, IDs, financial account numbers
  - Hate speech targeting race, religion, gender, sexual orientation, or national origin
  - Threats of violence against individuals or groups
  - Non-consensual intimate imagery
  - Child exploitation material

### Content Moderation Triggers
- WHILE a post contains prohibited content, THE system SHALL automatically flag it for moderator review.
- WHEN a post contains 3 or more external links, THE system SHALL automatically label it as "high-risk" and require moderator approval before public visibility.
- WHEN a post includes file attachments and text content under 20 characters, THE system SHALL flag it for potential spam review.

## Posting Frequency

### Rate Limits
- WHEN a user creates a new post, THE system SHALL limit posting to 5 posts per minute.
- WHEN a user creates a new post within 10 seconds of their previous post, THE system SHALL display error: "Please wait 10 seconds between posts."
- WHILE a user has been restricted due to excessive posting, THE system SHALL deny all new post submissions until the cooldown period expires.

## Content Moderation

### Automated Moderation
- THE system SHALL scan all new posts and attachments with automated content filters.
- WHEN a post is flagged as high-risk by automated systems, THE system SHALL:
  - Hide the post from public view
  - Notify the moderator dashboard
  - Send user notification: "Your post is under review. It may appear once approved."
- IF a post is flagged for prohibited content, THEN THE system SHALL:
  - Immediately remove the post
  - Record the violation in the user's moderation history
  - Send user notification: "Your post was removed for violating our content policies."

### Manual Moderation
- WHILE a post is pending moderator review, THE system SHALL display: "Awaiting moderator approval" to all users except the author and moderators.
- WHEN a moderator approves a flagged post, THE system SHALL make it visible to all users.
- WHEN a moderator rejects a flagged post, THE system SHALL delete it permanently and notify the user.

## Publishing Workflow

### Post Submission Process
- WHEN a citizen submits a post with attachments, THE system SHALL:
  - Validate file types and sizes
  - Check attachment count against limits
  - Scan for prohibited keywords and links
  - Apply posting frequency rules
  - If all checks pass, store the post as "draft"
  - If any check fails, return specific error message

### Visibility Rules
- THE system SHALL treat all new posts by citizens as "pending moderation" by default.
- WHERE a citizen has earned "trusted user" status (10+ approved posts with no violations), THE system SHALL allow their posts to publish immediately.
- WHERE a post has been flagged by 3 or more users, THEN THE system SHALL automatically hide the post and trigger moderator review.

## User Consequences

### Violation Tracking
- THE system SHALL maintain a moderation history per user account.
- WHEN a user accumulates 3 documented violations, THEN THE system SHALL temporarily suspend their posting privileges for 7 days.
- WHEN a user accumulates 5 documented violations, THEN THE system SHALL permanently ban their account.

### Appeal Process
- WHEN a user's post is removed or account is suspended, THE system SHALL provide an "Appeal" button on the notification.
- WHEN an appeal is submitted, THE system SHALL:
  - Notify the moderation team
  - Freeze the user's posting privileges
  - Assign appeal to a senior moderator for review
  - Notify the user of final decision within 48 hours

## Enforcement Logic Summary

### Validation Order
1. File type and MIME matching
2. File size limits
3. Attachment count limits
4. Posting frequency checks
5. Automated content scanning
6. Manual moderation triggers

### Default Behavior
- All posts by non-trusted citizens require moderation before display.
- No attachments allowed without user authentication.
- All uploads are scanned before storage.
- No modifications allowed after posting (no edits).

## Error Messages

### Upload Failures
- IF file size exceeds limit, THEN THE system SHALL show: "File exceeds 10 MB limit. Please compress or reduce resolution."
- IF file type not allowed, THEN THE system SHALL show: "File type not permitted. Use JPG, PNG, PDF, TXT, or ZIP only."
- IF attachment limit exceeded, THEN THE system SHALL show: "Maximum 5 attachments per post. Remove one to add another."
- IF posting too frequently, THEN THE system SHALL show: "Please wait 10 seconds before posting again."
- IF content flagged as prohibited, THEN THE system SHALL show: "Your post contains restricted content and cannot be published."

### System-Level Errors
- IF server error occurs during upload, THEN THE system SHALL display: "Upload failed. Please try again. If problem persists, contact support."
- IF storage space unavailable, THEN THE system SHALL display: "Upload temporarily unavailable. Please try again later."

## Business Justification

### Why These Rules Exist
- The discussion board serves as a public forum for economic and political discourse.
- Without size and type restrictions, users could upload harmful executables or overwhelm storage.
- Posting limits prevent spam and automated bot activity.
- Moderation rules preserve civil discourse and comply with legal obligations.
- Trust-based privileges encourage constructive participation without manual moderation overload.

### Safety and Compliance
- These rules align with basic digital platform responsibility standards.
- All file uploads are scanned for known malware signatures and malicious patterns.
- Content moderation ensures compliance with international norms for online discourse safety.

## Performance Expectations

### Upload Experience
- Image uploads under 1 MB shall complete in under 3 seconds on average.
- File uploads under 5 MB shall display progress bar and complete within 10 seconds under normal network conditions.
- Large file uploads (5–10 MB) may take up to 30 seconds; users shall be notified of estimated remaining time.

### Moderation Response
- Automated scans shall complete within 2 seconds of upload submission.
- Moderator dashboard shall refresh new flags within 15 seconds of submission.
- User notifications shall be delivered via in-app message within 60 seconds of moderation action.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*