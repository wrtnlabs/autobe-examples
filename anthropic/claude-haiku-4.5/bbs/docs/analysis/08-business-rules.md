# Business Rules & Validation Requirements

## Overview

This document defines the business logic, validation rules, and operational constraints that govern the discussion board platform. These rules ensure data integrity, prevent abuse, maintain community standards, and provide a consistent user experience.

---

## 1. Content Validation Rules

### Article Content Requirements

**WHEN a user attempts to create an article, THE system SHALL validate the following requirements:**

- **Article Title**: THE article title SHALL be between 3 and 200 characters in length
- **Article Body**: THE article body SHALL be between 10 and 50,000 characters in length
- **Title Format**: THE title SHALL not be empty or contain only whitespace
- **Body Format**: THE body SHALL not be empty or contain only whitespace
- **Required Fields**: THE system SHALL require both title and body before allowing publication

**IF a member attempts to create an article with a title less than 3 characters, THEN THE system SHALL reject the submission and display: "Article title is too short. Minimum 3 characters required."**

**IF a member attempts to create an article with a title exceeding 200 characters, THEN THE system SHALL reject the submission and display: "Article title is too long. Maximum 200 characters allowed. Current: [X] characters."**

**IF a member attempts to create an article with body content less than 10 characters, THEN THE system SHALL reject the submission and display: "Article content is too short. Minimum 10 characters required."**

**IF a member attempts to create an article with body content exceeding 50,000 characters, THEN THE system SHALL reject the submission and display: "Article content is too long. Maximum 50,000 characters allowed. Current: [X] characters."**

**IF a member attempts to create an article with a title containing only whitespace or special characters, THEN THE system SHALL reject the submission and display: "Article title must contain meaningful text (letters or numbers)."**

**IF a member attempts to create an article with body content containing only whitespace, THEN THE system SHALL reject the submission and display: "Article content cannot be empty. Please provide meaningful article text."**

**WHEN an article contains URLs or links, THE system SHALL validate:**

- **IF a URL uses invalid protocol (not HTTP or HTTPS), THEN THE system SHALL reject the URL and display: "URLs must use HTTP or HTTPS protocol."**
- **IF a URL resolves to a known malicious domain, THEN THE system SHALL reject the URL and display: "This URL has been blocked due to security concerns."**
- **IF a URL is malformed or incomplete, THEN THE system SHALL reject the URL and display: "This URL appears invalid. Please verify the format."**

### Comment Content Requirements

**WHEN a user attempts to create a comment, THE system SHALL validate:**

- **Comment Length**: THE comment body SHALL be between 1 and 5,000 characters
- **Comment Content**: THE comment SHALL not be empty or contain only whitespace
- **Required Field**: THE system SHALL require comment text before allowing publication

**IF a member attempts to post a comment with zero characters, THEN THE system SHALL reject the submission and display: "Comment cannot be empty. Please enter your comment."**

**IF a member attempts to post a comment exceeding 5,000 characters, THEN THE system SHALL reject the submission and display: "Comment is too long. Maximum 5,000 characters allowed. Current: [X] characters."**

**IF a member attempts to post a comment containing only whitespace, THEN THE system SHALL reject the submission and display: "Comment cannot contain only spaces. Please provide meaningful content."**

**IF a member attempts to post a comment on a deleted article, THEN THE system SHALL reject the submission and display: "This article is no longer available. Your comment could not be posted."**

**IF a member attempts to post a comment on an archived article, THEN THE system SHALL reject the submission and display: "Comments are no longer being accepted for this article."**

### Category Selection Requirements

**WHEN a member creates an article, THE system SHALL require category selection.**

**IF a member attempts to publish an article without selecting a category, THEN THE system SHALL reject the submission and display: "Category selection is required. Please select either 'Economics' or 'Politics'."**

**THE article category options SHALL be limited to exactly two choices:**
- Economics
- Politics

**IF a member attempts to select a category outside these two options, THEN THE system SHALL reject the selection and display: "Invalid category. Please select from: Economics, Politics."**

---

## 2. User Behavior Rules

### Post Creation Frequency Limits (Rate Limiting)

**WHEN a member creates new articles, THE system SHALL enforce a maximum rate of 10 articles per 60 minutes per user.**

**IF a member attempts to create an 11th article within 60 minutes, THEN THE system SHALL reject the submission and display: "You have reached the article creation limit (10 per hour). Please wait [X] minutes before creating another article."**

**WHEN a member posts comments, THE system SHALL enforce a maximum rate of 50 comments per 60 minutes per user.**

**IF a member attempts to post a 51st comment within 60 minutes, THEN THE system SHALL reject the submission and display: "You have exceeded the comment posting limit (50 per hour). Please wait [X] minutes before posting another comment."**

**IF a member exceeds rate limits, THE system SHALL calculate remaining time and display in the error message: "You may post again in [X] minutes [Y] seconds."**

**WHEN a member's rate limit is active, THE system SHALL still allow the member to:**
- Read articles and comments
- Edit previously created content
- Delete previously created content
- View profile information

**THE rate limit SHALL reset every hour based on a rolling 60-minute window (not calendar hour).**

### Content Editing Window

**WHEN a member edits their own article, THE system SHALL allow editing at any time after creation without time restriction.**

**WHEN a member edits their own comment, THE system SHALL allow editing only within 24 hours of comment creation.**

**IF a member attempts to edit a comment after 24 hours have elapsed, THEN THE system SHALL reject the edit request and display: "Comments can only be edited within 24 hours of posting. This comment was posted [X] hours ago and can no longer be edited."**

**WHEN content is edited, THE system SHALL:**
- Update the "last modified" timestamp
- Display an "edited" indicator to all users viewing the content
- Show the original creation date unchanged

### Content Deletion Rights

**WHEN a member deletes their own article, THE system SHALL permanently remove:**
- The article content
- All comments on the article (cascade delete)
- All attachments associated with the article

**IF a member attempts to delete an article and the system confirms deletion success, THEN THE system SHALL display: "Article successfully deleted."**

**WHEN a member deletes an article with comments, THE system SHALL:**
- Delete all top-level comments
- Delete all nested replies to those comments
- Delete all attachments associated with every comment

**THE system SHALL NOT allow members to delete articles or comments created by other members (except moderators who may delete any content).**

---

## 3. Attachment Rules

### Supported File Types

**WHEN a member uploads an attachment, THE system SHALL accept ONLY these file types:**

**For Images:**
- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)

**For General Files:**
- PDF (.pdf)
- Microsoft Word (.doc, .docx)
- Microsoft Excel (.xls, .xlsx)
- Plain text (.txt)
- ZIP archives (.zip)

**IF a member attempts to upload a file with an unsupported extension, THEN THE system SHALL reject the upload and display: "File type not supported. Allowed types: JPG, PNG, GIF, WebP, PDF, DOC, DOCX, XLS, XLSX, TXT, ZIP."**

**IF a member attempts to upload a file with a double extension (e.g., .pdf.exe), THEN THE system SHALL reject the upload and display: "File with multiple extensions not allowed. Please ensure your file has only one extension."**

**IF a member attempts to upload an executable file (.exe, .com, .bat, .dll, .so, .jar, etc.), THEN THE system SHALL reject the upload and display: "Executable files are not allowed for security reasons."**

### File Size Limits

**WHEN a member uploads an image file, THE system SHALL enforce a maximum file size of 10 MB per image.**

**IF a member attempts to upload an image exceeding 10 MB, THEN THE system SHALL reject the upload and display: "Image file exceeds maximum size of 10 MB. Your file size: [X] MB. Please choose a smaller image."**

**WHEN a member uploads a document file, THE system SHALL enforce a maximum file size of 20 MB per document.**

**IF a member attempts to upload a document exceeding 20 MB, THEN THE system SHALL reject the upload and display: "Document file exceeds maximum size of 20 MB. Your file size: [X] MB. Please choose a smaller file."**

**WHEN a member creates an article with multiple attachments, THE system SHALL enforce a maximum combined size of 100 MB for all attachments in that article.**

**IF adding an attachment would exceed the 100 MB article limit, THEN THE system SHALL reject the attachment and display: "Adding this file would exceed the 100 MB limit for article attachments. Current total: [X] MB. Available space: [Y] MB."**

**WHEN a member adds attachments to a comment, THE system SHALL enforce a maximum combined size of 10 MB for all attachments in that comment.**

**IF adding an attachment would exceed the 10 MB comment limit, THEN THE system SHALL reject the attachment and display: "Adding this file would exceed the 10 MB limit for comment attachments."**

### Maximum Attachments Per Content

**WHEN a member creates an article, THE system SHALL allow a maximum of 10 total attachments (images + files combined).**

**IF a member attempts to attach an 11th file to an article, THEN THE system SHALL reject the attachment and display: "Maximum 10 attachments per article. You have already attached 10 files. Please remove some attachments before adding more."**

**WHEN a member creates a comment, THE system SHALL allow a maximum of 5 total attachments (images + files combined).**

**IF a member attempts to attach a 6th file to a comment, THEN THE system SHALL reject the attachment and display: "Maximum 5 attachments per comment. You have already attached 5 files."**

**THE system SHALL display a running count of attachments: "Attachments: [X] of [MAX]"**

### File Content Validation

**WHEN a member uploads a file, THE system SHALL validate the file content matches the declared file type.**

**IF file binary signature (magic bytes) do not match the extension, THEN THE system SHALL reject the file and display: "File appears to be corrupted or misidentified. The file content does not match the declared file type."**

**IF a file is detected as malicious by antivirus scanning, THEN THE system SHALL reject the upload and display: "File failed security screening and could not be uploaded. If you believe this is in error, please contact support."**

### Image-Specific Handling

**WHEN an image is uploaded, THE system SHALL strip all EXIF metadata containing location, camera, or privacy information.**

**WHEN an image is processed, THE system SHALL generate:**
- Thumbnail version (200x200 pixels) for preview display
- Medium version (600x600 pixels) for article display
- Original file stored unmodified for download

**WHEN users view images in articles, THE system SHALL display the medium version inline with the ability to click for full-size view.**

---

## 4. Moderation Rules

### Content Moderation Workflow

**WHEN an article or comment is created, THE system SHALL publish it immediately without pre-publication approval.**

**WHEN content is published, THE system SHALL make it visible to all users (guests and members) by default.**

**WHEN a moderator identifies inappropriate content, THE moderator SHALL have the ability to:**
- Mark content as flagged for review
- Remove content immediately
- Delete the content and all associated data
- Add a removal reason/note visible to the original author

### Content Removal Criteria

**MODERATORS SHALL remove content that violates community guidelines, specifically:**

**THE system SHALL define prohibited content categories:**
- Hate speech targeting individuals or groups based on protected characteristics
- Harassment, threats, or bullying directed at individuals
- Graphic violence or glorification of violence
- Commercial spam or unsolicited promotional content
- False or deliberately misleading factual claims presented as fact
- Doxxing or publication of private personal information without consent
- Illegal content or instructions for illegal activities
- Copyright infringement (wholesale copying without fair use)
- Off-topic content completely unrelated to economics or politics

**IF content in any of these categories is reported or identified, THEN THE system SHALL allow moderators to remove it and display to the author: "Your [article/comment] was removed for violating community guidelines: [specific reason]."**

**WHEN a moderator removes content, THE system SHALL:**
- Delete the content from public view
- Remove associated comments (if content is an article)
- Remove associated attachments
- Keep a record of the removal in audit logs for compliance

### Violation Tracking

**WHEN a member's content is removed by a moderator, THE system SHALL track this violation against the member's account.**

**THE system SHALL maintain a violation count per member showing:**
- Total number of violations
- Date and time of each violation
- Reason for each violation
- Moderator who took action

**IF a member accumulates 3 violations within 30 days, THEN THE system SHALL automatically suspend the account and display: "Your account has been suspended due to repeated violations of community guidelines. Please contact support for appeal information."**

**IF a member accumulates 5 violations within 90 days, THEN THE system SHALL permanently ban the account and display: "Your account has been banned for repeated violations of community guidelines."**

### Moderator Override Capabilities

**WHEN a moderator takes moderation action, THE moderator SHALL:**
- Have the ability to remove any article or comment regardless of author
- Have the ability to suspend any member account
- Have the ability to ban any member account
- Have the ability to lock discussions to prevent further comments
- NOT have the ability to modify content (only remove it)

**WHEN a moderator suspends an account, THE suspended user:**
- SHALL NOT be able to log in
- SHALL be able to appeal the suspension
- Suspension SHALL last 7 days by default (or until appeal is resolved)

**WHEN a moderator bans an account, THE banned user:**
- SHALL NOT be able to log in
- SHALL NOT be able to create a new account with the same email
- Ban SHALL be permanent unless explicitly reversed by administrator

---

## 5. Data Constraints

### User Information Constraints

**WHEN a user registers, THE system SHALL require:**
- Valid email address in format user@domain.com
- Password with minimum 8 characters containing at least one letter and one number
- Email address must be unique in the system

**IF a user attempts to register with an email already in use, THEN THE system SHALL reject registration and display: "This email address is already registered. Please log in or use a different email."**

**IF a user attempts to register with a password shorter than 8 characters, THEN THE system SHALL reject registration and display: "Password must be at least 8 characters long and contain both letters and numbers."**

**WHEN a user profile is created, THE system SHALL store:**
- User ID (unique identifier)
- Email address
- Password hash (never plaintext)
- Account creation timestamp
- Account status (active, suspended, banned)
- Last login timestamp

### Article Metadata Constraints

**WHEN an article is created, THE system SHALL capture and validate:**
- **Created Timestamp**: ISO 8601 format (UTC timezone) - system generated
- **Author ID**: Reference to valid, active user account - system generated
- **View Count**: Initialized to 0, incremented on each view - system generated
- **Comment Count**: Calculated from total valid comments - system generated
- **Title**: 3-200 characters, user-provided
- **Content**: 10-50,000 characters, user-provided
- **Category**: Economics or Politics selection, user-provided
- **Status**: Published or Archived, system-managed

**IF any article metadata fails validation, THEN THE system SHALL reject the article and display: "Article creation failed. Please verify all required information and try again."**

### Comment Metadata Constraints

**WHEN a comment is created, THE system SHALL capture:**
- **Comment ID**: Unique identifier - system generated
- **Author ID**: Reference to valid user - system generated
- **Created Timestamp**: ISO 8601 format (UTC) - system generated
- **Content**: 1-5,000 characters - user-provided
- **Article ID**: Reference to parent article - system generated
- **Parent Comment ID**: Reference to parent comment if reply, NULL if top-level - user-provided

**IF a comment is missing any required field, THEN THE system SHALL reject the comment and display: "Comment could not be posted. Required information is missing."**

### URL and Link Validation

**WHEN article or comment content contains URLs, THE system SHALL validate:**
- URLs SHALL use HTTP or HTTPS protocol only
- URLs SHALL resolve to valid domain names
- URLs SHALL not contain path traversal sequences (../, ..\\)

**IF a URL fails validation, THEN THE system SHALL display: "One or more URLs in your content appear invalid. Please verify all links and try again."**

### Timestamp Format Requirements

**WHEN timestamps are stored, THE system SHALL:**
- Store all timestamps in UTC timezone
- Use ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ)
- Never store timestamps in any other format

**WHEN timestamps are displayed to users, THE system SHALL:**
- Convert UTC to user's local timezone (if available)
- Display relative times (e.g., "posted 2 hours ago")
- Provide tooltip showing exact date/time in local timezone

---

## 6. Performance Expectations

### Response Time Requirements - Critical Operations

**WHEN a member creates an article, THE system SHALL complete article creation and display confirmation within 2 seconds (excluding file uploads).**

**IF article creation takes longer than 2 seconds, THE system SHALL display: "Article creation is taking longer than expected. Please wait..."**

**WHEN a member updates an article, THE system SHALL complete the update and display confirmation within 2 seconds (excluding file uploads).**

**WHEN a member deletes an article, THE system SHALL complete deletion and confirm within 2 seconds.**

**WHEN a member posts a comment, THE system SHALL display the new comment within 1 second of submission.**

**WHEN a member views the article list, THE system SHALL display 20 articles with metadata within 2 seconds.**

**WHEN a member views a single article with comments, THE system SHALL display the full article and all comments within 3 seconds.**

**WHEN a member searches for articles, THE system SHALL return results within 3 seconds for typical search queries.**

### File Upload Performance

**WHEN a member uploads a file up to 5 MB, THE system SHALL complete the upload within 10 seconds under normal network conditions.**

**WHEN a member uploads a file up to 20 MB, THE system SHALL complete the upload within 30 seconds under normal network conditions.**

**IF upload progress does not update for 15 seconds, THE system SHALL display: "Upload is in progress. This may take several minutes for large files."**

**WHEN file upload completes, THE system SHALL display the uploaded file in the article preview within 2 seconds.**

### Throughput & Concurrent User Capacity

**THE system SHALL support minimum 100 concurrent logged-in members without performance degradation.**

**THE system SHALL support minimum 10 new articles created per minute without data loss or delays.**

**THE system SHALL support minimum 100 new comments created per minute without data loss or delays.**

**THE system SHALL support minimum 1,000 page views per minute without response time degradation beyond normal thresholds.**

### Data Limits Per API Request

**WHEN retrieving article lists, THE system SHALL return maximum 50 articles per request.**

**IF a request asks for more than 50 articles, THE system SHALL truncate to 50 and indicate: "Showing 50 of [X] results. Use pagination for more."**

**WHEN retrieving comments on an article, THE system SHALL return maximum 100 comments per request.**

**WHEN returning search results, THE system SHALL return maximum 100 matching articles per request.**

**WHEN a member uploads multiple files, THE system SHALL accept requests containing up to 10 files per request.**

### Search Performance

**WHEN searching by title keywords, THE system SHALL return results within 3 seconds.**

**WHEN searching by content keywords, THE system SHALL return results within 5 seconds (may be slower due to full-text search).**

**IF search takes longer than 10 seconds, THE system SHALL display: "Search is taking longer than expected. Please refine your search or try again."**

---

## 7. Community Guidelines Enforcement

### Prohibited Content Categories

**THE system SHALL consider the following content prohibited and subject to removal by moderators:**

**Category: Hate Speech & Discrimination**
- Content targeting individuals or groups based on race, religion, ethnicity, gender, sexual orientation, disability, or other protected characteristics
- Slurs or dehumanizing language
- Conspiracy theories targeting protected groups

**Category: Harassment & Threats**
- Directed threats or threats of violence
- Harassment campaigns or coordinated attacks
- Stalking or doxxing

**Category: Violence & Graphic Content**
- Graphic imagery of violence or injury
- Instructions for causing harm
- Glorification of violence or self-harm

**Category: Spam & Commercial**
- Repetitive promotional messages
- Link farms or referral spam
- Unsolicited commercial solicitation

**Category: Misinformation & Disinformation**
- Deliberately false claims presented as fact
- Conspiracy theories without basis
- Misleading statistics or data manipulation

**Category: Personal Information**
- Doxxing or publication of private information
- Leaking personal documents or confidential information
- Publication of private contact information without consent

**Category: Illegal Content**
- Content promoting illegal activities
- Instructions for illegal acts
- Illegal market solicitations

**Category: Copyright Infringement**
- Wholesale copying of copyrighted articles or books
- Copyright protected media shared without license
- Note: Fair use commentary and criticism are permitted

**Category: Off-Topic Content**
- Content completely unrelated to economics or politics
- Entertainment or personal life stories
- Spam posted to multiple articles

### Spam Prevention Mechanisms

**WHEN a member creates multiple articles with similar titles or identical content within 24 hours, THE system SHALL flag for moderator review and display: "Your article appears similar to recent posts. Please ensure your content is unique."**

**WHEN an article contains excessive external links (more than 5), THE system SHALL flag for moderator review.**

**WHEN a comment contains more than 2 external links, THE system SHALL flag for moderator review.**

**THE system SHALL track URL patterns and flag articles posting to suspicious or blacklisted domains.**

**WHEN a new member account (created within 24 hours) attempts to create an article, THE system SHALL require email verification before allowing article creation.**

**IF a member posts identical or near-identical comments on different articles within 1 hour, THE system SHALL flag as potential spam and slow posting temporarily.**

### Profanity and Tone Moderation

**THE system SHALL NOT automatically censor isolated instances of strong language or profanity that are not used in a harassing context.**

**MODERATORS SHALL focus on context: profanity directed at specific individuals (harassment) SHALL be removed, while profanity in general commentary MAY be preserved based on moderator discretion.**

**WHEN profanity is used as part of a harassment campaign, THE entire comment SHALL be removed regardless of other content quality.**

---

## 8. Access Control Rules

### Guest User Constraints

**WHEN a guest user accesses the discussion board, THE system SHALL:**
- Display all published articles in chronological list
- Allow viewing of all comments and discussion threads
- Allow searching and filtering articles by category or keyword
- Allow downloading of public attachments

**WHEN a guest user attempts to create an article, THE system SHALL deny the action and display: "Please log in or register to create articles."**

**WHEN a guest user attempts to post a comment, THE system SHALL deny the action and display: "Please log in or register to comment on discussions."**

**WHEN a guest user attempts to upload any file, THE system SHALL deny the action and display: "Please log in or register to share files."**

**WHEN a guest user attempts to edit or delete content, THE system SHALL deny the action regardless of content ownership.**

### Member User Capabilities

**WHEN a member user is authenticated, THE system SHALL allow:**
- Creation of new articles with title, content, and category
- Publication of articles immediately upon creation (no approval needed)
- Attachment of images and files to articles (within defined limits)
- Editing of their own articles at any time
- Deletion of their own articles at any time (cascade delete comments/attachments)
- Posting of comments on any published article
- Editing of their own comments within 24 hours of creation
- Deletion of their own comments at any time
- Viewing of all published content
- Access to personal dashboard showing their own articles and comments

**WHEN a member attempts to edit content they did not create, THE system SHALL deny the action and display: "You can only edit content you have created."**

**WHEN a member attempts to delete content they did not create, THE system SHALL deny the action and display: "You can only delete content you have created."**

**WHEN a member is subject to rate limiting, THE system SHALL allow the member to:**
- Continue reading articles and comments
- Edit existing content
- Delete existing content
- View profile and activity history

### Moderator Override Capabilities

**WHEN a moderator user is authenticated, THE system SHALL allow the moderator to:**
- Perform all member actions without rate limiting
- Edit or delete any article regardless of author
- Edit or delete any comment regardless of author
- View all user accounts and activity history
- Suspend user accounts (7-day temporary ban)
- Permanently ban user accounts
- Lock discussions to prevent further comments
- Access complete moderation dashboard with reports
- View moderation audit logs
- Mark content as removed with reason notation

**WHEN a moderator deletes content, THE system SHALL:**
- Remove content from public view immediately
- Record the deletion in audit logs
- NOT permanently destroy the data (archive for compliance)
- Notify the content author of removal with reason

**WHEN a moderator suspends a member account, THE suspended member:**
- SHALL NOT be able to log in
- SHALL see message "Your account has been suspended. Contact support to appeal."
- Can appeal suspension

**WHEN a moderator permanently bans a member account, THE banned member:**
- SHALL NOT be able to log in
- SHALL NOT be able to create a new account with the same email
- Ban message SHALL state "Your account has been permanently banned."

---

## 9. Consistency and Integrity Rules

### Data Integrity Guarantees

**WHEN an article is deleted, THE system SHALL execute the following operations in a single atomic transaction:**
- Delete article record
- Delete all comments associated with the article
- Delete all attachments associated with the article and comments
- Log the deletion action

**IF any operation in the delete transaction fails, THE system SHALL rollback all changes and display: "Article deletion failed. Please try again."**

**WHEN a comment is deleted, THE system SHALL:**
- Delete the comment record
- Delete all nested replies to that comment
- Delete all attachments on the comment
- Update parent comment's reply count

**WHEN an attachment is uploaded with the same filename, THE system SHALL:**
- Generate a unique internal identifier for the file
- Preserve the original user-provided filename in metadata
- NOT overwrite existing files with the same name

### Conflict Resolution

**WHEN two members attempt to edit the same article simultaneously, THE system SHALL implement "last write wins" resolution:**
- The most recent save operation becomes the article's current state
- The earlier editor is notified their changes were overwritten
- Display message: "Article was modified by another user. Your changes were not saved. Please refresh and try again."

**WHEN multiple members comment on an article simultaneously, THE system SHALL:**
- Accept and display all comments without data loss
- Order comments chronologically by server timestamp
- Allow concurrent comment creation without conflict

**WHEN two users upload files with the same filename to the same article, THE system SHALL:**
- Store both files with unique internal identifiers
- Display both in the article with original filenames
- NOT delete or overwrite either file

### Reference Integrity

**THE system SHALL enforce referential integrity ensuring:**
- Every comment has a valid reference to an existing article
- Articles cannot be deleted while direct queries still reference them (delete comments first)
- Every attachment has a valid reference to an article or comment
- User IDs in author fields reference existing user accounts

**IF a data integrity violation occurs (orphaned comment without article), THE system SHALL:**
- Prevent the orphaned state from occurring during normal operations
- Log the violation for investigation
- In emergency recovery, clean up orphaned records

---

## 10. Business Rule Summary

This matrix summarizes the key business rules and their impacts:

| Rule Category | Specific Rule | Limit/Value | Business Impact |
|---|---|---|---|
| **Article Length** | Min/Max characters | 10-50,000 | Prevents trivial posts while allowing comprehensive articles |
| **Comment Length** | Min/Max characters | 1-5,000 | Maintains discussion focus while allowing detailed responses |
| **Edit Window** | Articles/Comments | Unlimited/24 hours | Allows correction while preventing retroactive changes |
| **Rate Limits** | Articles/Comments per hour | 10/50 | Prevents spam and abuse of platform |
| **File Sizes** | Image/Document | 10 MB/20 MB | Manages server resources and load times |
| **Attachment Count** | Per article/comment | 10/5 | Keeps content organized and loadable |
| **Moderation** | Review timing | Post-publication | Allows free expression while maintaining standards |
| **Violations** | Account suspension/ban | 3 violations (7 days)/5 violations (permanent) | Protects community from repeat abusers |
| **Rate Limiting** | Suspension before account action | Blocks posting for [X] minutes | Throttles rapid-fire spam attempts |
| **Response Time** | Article operations | 2 seconds | Ensures responsive, usable interface |
| **Search Response** | Query time | 3 seconds typical | Maintains search usability at scale |
| **Concurrent Users** | Minimum support | 100+ simultaneous | Ensures platform stability |
| **Access Control** | Role-based permissions | 3 tiers (Guest/Member/Mod) | Protects functionality while enabling participation |
| **Data Retention** | Deleted content records | Archive 30 days | Supports compliance and recovery |
| **URL Validation** | Protocol and domain checks | HTTPS only, no malware | Protects users from malicious links |

---

## 11. Business Rule Error Handling Summary

**WHEN users encounter validation failures, THE system SHALL provide specific, actionable error messages:**

### Article Error Messages
- "Title is required and must be 3-200 characters"
- "Content is required and must be 10-50,000 characters"
- "Category selection is required (Economics or Politics)"
- "One or more URLs in your content appear invalid"
- "Total file size exceeds 100 MB limit for articles"

### Comment Error Messages
- "Comment cannot be empty"
- "Comment exceeds 5,000 character maximum"
- "This article is no longer available for comments"
- "Comments can only be edited within 24 hours"

### File Upload Error Messages
- "File type not supported. Allowed types: [list]"
- "Image exceeds 10 MB maximum size"
- "Document exceeds 20 MB maximum size"
- "Total attachments exceed limit for this content"
- "File failed security screening"

### Rate Limit Messages
- "You have reached the article creation limit (10 per hour). Wait [X] minutes."
- "You have exceeded the comment posting limit (50 per hour). Wait [X] minutes."

### Access Control Messages
- "Please log in to create articles"
- "You can only edit content you have created"
- "Your account has been suspended for violations"
- "You do not have permission to access this action"

---

*Developer Note: This document defines business requirements and rules only. All technical implementation decisions regarding database design, caching mechanisms, validation libraries, ORM choices, and system architecture are at the discretion of the development team.*