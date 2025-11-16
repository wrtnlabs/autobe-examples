# Business Rules for Economic/Political Discussion Board

This document defines all mandatory business rules, constraints, and validation logic governing content, user behavior, and system integrity for the economicBoard platform. These rules are non-negotiable and form the foundation of the system’s operational integrity. All technical implementations must enforce these rules exactly as described.

### Content Governance Rules

### Prohibited Content Types

WHEN a citizen attempts to submit a post or comment, THE system SHALL reject it if it contains any of the following:

- Direct or indirect incitement of violence against individuals, groups, or institutions
- Explicit threats of physical, financial, or political harm
- Hate speech based on race, ethnicity, religion, national origin, gender identity, sexual orientation, or disability
- Promotion of terrorism, extremism, or unlawful acts
- False information deliberately designed to manipulate economic markets or political outcomes
- Doxxing or publishing private personal information (e.g., home address, phone number, ID numbers, private photos)

IF a post or comment violates any of the above, THEN THE system SHALL flag it for moderator review and prevent public display until approved.

### Content Authenticity

THE economicBoard SHALL require all political claims and economic assertions made in posts to be attributable to a source or perspective.

WHERE a user posts a statistic, quote, or claim about economic data or political events, THE system SHALL encourage (but not force) inclusion of source context.

WHILE a post is pending moderation, THE system SHALL display a visual indicator: "Pending Review - Not Verified".

### Community Tone Expectations

THE system SHALL permit robust, passionate, and critical discourse on economic policy, government decisions, and market trends.

IF a post contains only emotionally charged language without substantive argument or evidence, THEN THE system SHALL recommend (via UI tooltip) that the user refine their submission with supporting reasoning.

### Upload Constraints

### File Attachment Limits

WHEN a citizen uploads a file as an attachment to a post, THE system SHALL enforce:

- Maximum file size: 10MB per file
- Acceptable file types: JPG, PNG, GIF, WEBP (for images); PDF, TXT, DOCX, XLSX (for documents)
- File name sanitization: All special characters except hyphens (-), underscores (_), and periods (.) SHALL be stripped from filenames
- No executable files (e.g., .exe, .bat, .js, .dll) SHALL be permitted under any circumstance
- Multiple files SHALL be allowed per post, up to a maximum of five attachments

WHILE a file is uploading, THE system SHALL display a progress indicator to the user.

IF a user attempts to upload a file exceeding 10MB, THEN THE system SHALL display: "File too large. Maximum allowed size is 10MB. Please compress or select a smaller file."

IF a user attempts to upload a disallowed file type, THEN THE system SHALL display: "File type not supported. Only JPG, PNG, GIF, WEBP, PDF, TXT, DOCX, and XLSX are allowed."

### Editing Restrictions

### Post and Comment Editing Window

WHEN a citizen creates a post or comment, THE system SHALL allow editing of that content for exactly 24 hours after initial submission.

WHILE the 24-hour editing window is active, THE system SHALL display: "Edit available until [timestamp]".

AFTER the 24-hour window expires, THE system SHALL display: "This post cannot be edited. Contact a moderator if corrections are needed." and disable all edit buttons.

IF a citizen attempts to edit a post or comment after 24 hours have passed, THEN THE system SHALL display: "Editing is no longer available. This content was submitted more than 24 hours ago."

### Modification Logging (Business Rule)

THE system SHALL preserve the original version of all posts and comments upon editing.

WHERE a post or comment is edited, THE system SHALL append a visible, non-editable note: "Edited [date and time]".

WHEN a moderator edits a post or comment for clarity or compliance, THE system SHALL append: "Edited by moderator [date and time]".

### Moderation Policies

### Moderator Authority and Oversight

WHEN the system detects a content flag (e.g., reported by users or auto-flagged for prohibited keywords), THE system SHALL assign the post to the moderator review queue.

WHILE a post is in the moderation queue, THE system SHALL prevent it from appearing in public feeds.

WHEN a moderator approves a post, THE system SHALL make it visible to all citizens.

WHEN a moderator deletes a post or comment, THE system SHALL:

- Remove it from public view
- Preserve it in a recoverable audit log accessible only to moderators
- Display a system message to the author: "Your post has been removed by a moderator for violating community guidelines."
- Log the deletion reason in a moderator audit trail

WHEN a moderator locks a discussion thread, THE system SHALL:

- Prevent new comments from being added
- Allow existing comments to remain visible
- Display: "This discussion has been locked by a moderator. No new comments can be added."

### User Warning and Sanctions

IF a citizen receives three separate moderation actions (e.g., post deletions, comment removals) within a 30-day period, THEN THE system SHALL:

- Temporarily suspend posting privileges for 7 days
- Notify the user: "Your posting privileges are suspended for 7 days due to repeated guideline violations."
- Record the suspension in the user’s moderation history

IF a user’s account is suspended three times within a 90-day period, THEN THE system SHALL:

- Permanently ban the account from the platform
- Notify the user: "Your account has been permanently banned for repeated violations of community guidelines."
- Remove all of the user’s content from public view

### User Account Rules

### Registration and Verification

THE citizen SHALL register using a valid email address and a password of at least 8 characters.

THE system SHALL require email verification before allowing any post, comment, or attachment upload.

WHEN a citizen attempts to register with an email already in use, THEN THE system SHALL display: "This email is already registered. Please log in or recover your password."

### Account Deletion

WHEN a citizen requests account deletion, THE system SHALL:

- Anonymize all of their posts and comments (replace username with "[Deleted User]")
- Retain attachments in the system but disconnect them from the user’s identity
- Permanently delete their account data from user tables
- Preserve moderator audit records related to the user’s activity
- Send a confirmation notice: "Your account has been permanently deleted. Your content remains archived for moderation purposes."

### Session and Authentication

THE system SHALL use JWT tokens for all authenticated sessions.

WHEN a user logs in, THE system SHALL issue a 15-minute access token and a 30-day refresh token.

THE system SHALL require re-authentication every 30 days of inactivity.

### System Integrity Rules

### Timestamp Consistency

THE system SHALL record all timestamps in UTC and display them to users in their local timezone (Asia/Seoul) with clear labeling.

WHEN a post is created or edited, THE system SHALL use the system clock (UTC) as the authoritative source,

AND SHALL NOT accept user-provided timestamps.

### Thread Integrity

THE system SHALL ensure the chronological order of comments is preserved regardless of moderation actions.

WHEN a comment is removed, THE system SHALL preserve the structure of the comment thread so remaining comments retain their parent-child relationships.

IF a post is removed, THE system SHALL retain thread structure of its comments, displayed as: "[Original post removed]" with the comments still visible under it.

### System Audit and Recovery

THE system SHALL maintain a non-repudiable audit log for all moderator actions, including:

- Time of action
- Moderator responsible
- Action performed (delete, lock, approve, warn, etc.)
- Target content ID
- Reason provided (if any)

WHERE a post is deleted or locked by a moderator, THE system SHALL make the audit log available to that moderator, but inaccessible to citizens.

THE system SHALL allow recovery of deleted content by moderators for up to 14 days after deletion.

WHEN an audit log entry is created, THE system SHALL enforce the following retention policy:

- Moderator logs retained for 1 year
- User deletion records retained for 5 years for legal compliance

### Performance and Intent

THE system SHALL be designed to:

- Prioritize clarity and simplicity over complexity
- Minimize bureaucratic friction while ensuring accountability
- Empower citizens to participate freely, while ensuring integrity through transparent moderation
- Prevent manipulation, abuse, or inflammatory escalation

WHEN the system is used as intended, SUCCESS SHALL be measured by:

- High volume of substantive economic and political discussion
- Low recurrence of policy violations
- High user satisfaction with moderation fairness
- Minimal need for moderator intervention

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*