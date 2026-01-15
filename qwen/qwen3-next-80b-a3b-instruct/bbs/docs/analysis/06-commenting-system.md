# Economic/Political Discussion Board

## Service Overview

A minimalist digital forum designed exclusively for structured economic and political discourse. The platform enables registered citizens to publish articles with text, images, and files for public commentary. No social metrics, no algorithms, no recommendations — only direct public exchange governed by clear, transparent rules.

## User Actors

### Citizen

- Unauthenticated visitor browsing public content
- Authenticated user who can publish articles and post comments
- No profile or identity persistence beyond session
- Must be authenticated to submit content

### Moderator

- Designated user with authority to review reported content
- Can hide, delete, or warn users based on policy violations
- Has access to moderation dashboard and audit logs
- Cannot edit or alter published content
- Cannot view private user data

## Core Features

### Article Creation

WHEN a citizen composes a new article, THE system SHALL allow the submission of:

- Title (maximum 200 characters)
- Body text (maximum 10,000 characters)
- Optional image attachments (max 5 per post)
- Optional file attachments (max 2 per post)

WHEN an article is submitted, THE system SHALL:

- Store the content in persistent storage
- Assign a unique, immutable identifier to the article
- Record the publication timestamp and author identity
- Publish the article publicly within 1 second of submission

WHILE an article is published, THE system SHALL:

- Allow any visitor to view its full content
- Permit authenticated citizens to comment on it
- Disable editing or deletion by the author after publication
- Maintain the article’s identity and content integrity indefinitely

### Image Attachments

WHEN a citizen attaches an image to an article, THE system SHALL:

- Accept JPG, PNG, and WebP formats only
- Limit each image to a maximum size of 5MB
- Automatically resize images exceeding 1920×1080 pixels to fit this resolution
- Generate a web-optimized thumbnail (600×338) for preview display
- Store original and thumbnail versions with immutable filenames
- Disallow animated GIFs and non-image MIME types

WHEN an image is displayed in the article, THE system SHALL:

- Load the thumbnail initially for faster rendering
- Expand to full-resolution image on user click
- Always display a caption field with max 150 characters
- Support alt-text entry (up to 255 characters) for accessibility

WHEN an image upload fails, THE system SHALL:

- Prevent submission of the article
- Show: "Image failed to upload. Ensure format is JPG, PNG, or WebP, and size is under 5MB."

### File Attachments

WHEN a citizen attaches a document to an article, THE system SHALL:

- Accept PDF, DOCX, TXT, CSV, ZIP formats only
- Limit each file to a maximum size of 10MB
- Strip all embedded executable scripts or macros on upload
- Generate a SHA-256 hash of the file for integrity verification
- Store the file with a public-accessible, cryptographically-random filename
- Prevent execution of any client-side code upon download

WHEN a file is attached, THE system SHALL:

- Display a preview icon based on file type (PDF, ZIP, etc.)
- Show the filename, size, and upload timestamp
- Provide direct download link without authentication
- Prevent preview rendering of executable or unsafe formats (e.g., .exe)

WHEN a file upload fails, THE system SHALL:

- Prevent submission of the article
- Show: "File failed to upload. Only PDF, DOCX, TXT, CSV, and ZIP up to 10MB are allowed."

## User Journey: Posting

### Step 1: Authentication

WHEN a citizen clicks "New Post," THE system SHALL:

- Redirect to authentication screen if not logged in
- Offer login via email/password or OAuth (Google, Apple)

WHEN authentication succeeds, THE system SHALL:

- Store session token in browser local storage
- Redirect to composition interface

WHEN authentication fails, THE system SHALL:

- Show: "Authentication failed. Please check credentials or register."

### Step 2: Compose New Post

WHEN a citizen enters a title, THE system SHALL:

- Validate length is ≤ 200 characters in real time
- Block submission if title is empty or only whitespace

WHEN a citizen enters body text, THE system SHALL:

- Validate length is ≤ 10,000 characters in real time
- Limit input to plain text + HTML-safe formatting (bold, italic, lists)
- Auto-save draft to local storage every 10 seconds

WHEN a citizen attaches files or images, THE system SHALL:

- Show live progress counter for uploads
- Display error if more than 5 images or 2 files are added

### Step 3: Submit

WHEN a citizen clicks "Publish", THE system SHALL:

- Validate all required fields are filled
- Validate at least one of title, body, image, or file has content
- Send encrypted request to server with all attachments

WHEN submission succeeds, THE system SHALL:

- Redirect to published article URL
- Show notification: "Your article has been published."

WHEN submission fails, THE system SHALL:

- Show specific error message (e.g., "Image too large", "File type not allowed")
- Preserve draft in local storage for resubmission

### Step 4: View Published Post

WHEN a citizen visits a published article, THE system SHALL:

- Display title, author, timestamp
- Render body text with formatted paragraphs
- Show all attached images and files with previews
- Display comment thread beneath
- Disable all interactive controls unless authenticated

WHEN an unauthenticated visitor attempts to comment, THE system SHALL:

- Show: "You must be logged in to comment. Please sign in or register."

## Business Rules

### Attachment Limits

- Maximum 5 images per article
- Maximum 2 files per article
- Total media size per post ≤ 45MB

### Content Moderation

WHEN a comment or article is reported, THE system SHALL:

- Flag the item with "Reported" status
- Hide it from public view for non-moderators
- Add it to the moderator inbox
- Notify moderator via dashboard badge

WHEN a moderator reviews a reported item, THE system SHALL:

- See the original content, reporter reason, and timestamp
- Choose one action: "Approve", "Hide", or "Warn Author"

WHEN the moderator chooses "Hide", THE system SHALL:

- Mark the item as "Moderated"
- Replace visible content with: "This content has been removed by a moderator."
- Preserve the original content for archival
- Log the moderator’s action in audit trail

WHEN the moderator chooses "Warn Author", THE system SHALL:

- Issue one warning to the author’s account
- Notify author: "Your recent post was flagged for violation. One more violation will result in temporary suspension."
- Record the violation in audit trail

WHEN a citizen receives three warnings, THE system SHALL:

- Prevent them from publishing new content for 14 days
- Notify: "Your account has been temporarily suspended for 14 days due to repeated policy violations."

### Posting Frequency

WHEN a citizen posts an article, THE system SHALL:

- Limit posts to 1 per 10 minutes
- Block immediate resubmission if cooldown not met
- Show: "You must wait 10 minutes before posting another article."

### File Types Allowed

- Images: JPG, PNG, WebP
- Documents: PDF, DOCX, TXT, CSV, ZIP

### Content Restrictions

- Prohibited: Hate speech, threats, harassment, doxxing
- Prohibited: Illegal content, malware links, phishing
- Prohibited: Spam, excessive self-promotion, bot activity
- Prohibited: False claims presented as facts without attribution

WHEN content violates restrictions, THE system SHALL:

- Accept submission but flag for moderation
- If flagged 3 times by different users, auto-hide and send to moderator

## Commenting System

### Post Comments

WHEN a citizen submits a comment on an article, THE system SHALL:

- Display the comment immediately under the article
- Record the timestamp, author username, and content
- Allow any citizen to view, like, or report the comment

WHILE the comment is visible, THE system SHALL:

- Show like counter (non-counted, no user identity stored)
- Permit reporting via flag button
- Display "[deleted]" if comment is deleted

### Reply Chains

WHEN a citizen replies to a comment, THE system SHALL:

- Nest the reply under the parent comment with visual indentation
- Allow up to five (5) levels of nesting
- Display thread counters: "12 replies"

WHEN a citizen clicks "View Thread", THE system SHALL:

- Expand all child replies up to level 5
- Load replies incrementally to maintain performance

### Comment Moderation

WHEN a comment is reported, THE system SHALL:

- Mark it as "Reported" and hide from public view
- Notify moderator through dashboard

WHEN a moderator approves a comment, THE system SHALL:

- Reveal the comment to all users
- Log: "Comment approved by [moderator]"

WHEN a moderator hides a comment, THE system SHALL:

- Replace visible text with: "This comment has been removed by a moderator."
- Preserve original content for audit

WHEN a comment is marked as spam, THE system SHALL:

- Prevent author from posting comments for 24 hours
- Notify author: "You have been temporarily restricted from commenting due to spam activity."

### Comment Deletion

WHEN a citizen deletes their own comment, THE system SHALL:

- Replace visible content with: "[deleted]"
- Retain original for moderation records
- Delete associated likes and reports

WHEN a moderator deletes a comment, THE system SHALL:

- Replace visible content with: "[deleted]"
- Retain original for audit trail
- Record moderator identity in log

WHEN a comment has replies and is deleted, THE system SHALL:

- Retain the replies as children of "[deleted]"
- Display: "[deleted]" on parent, not "[deleted reply]"

### Notification System

WHEN a user receives a reply to their comment, THE system SHALL:

- Show notification badge on icon in top nav
- Store notification in persistent dashboard

WHEN a user is mentioned using `@username`, THE system SHALL:

- Send notification to that user
- Highlight mention in their notifications list

WHEN a user submits a report, THE system SHALL:

- Notify moderator of the report
- Show reporter: "Your report has been submitted. Moderators will review."

WHEN a user disables notifications, THE system SHALL:

- Suppress all comment-related notifications
- Continue to display unread count if enabled later

## Moderation

### User Reporting

WHEN a citizen reports an article or comment, THE system SHALL:

- Present five (5) predefined reasons:
  1. Hate speech
  2. Threats or harassment
  3. False information
  4. Spam
  5. Irrelevant content

- Record the selected reason
- Anonymize reporter identity

WHEN a report is submitted, THE system SHALL:

- Not allow additional reports on the same item for 24 hours
- Prevent report spam by limiting to 5 reports per user per day

### Moderator Review

WHEN a moderator accesses the moderation dashboard, THE system SHALL:

- See a queue of items flagged by users
- See total reports per item
- See timestamp of report and original content

WHEN a moderator selects "Approve", THE system SHALL:

- Delete the report flag
- Restore visibility to all users
- Log: "Approved by [moderator] after X reports"

WHEN a moderator selects "Hide", THE system SHALL:

- Remove content from public view
- Apply "Moderated" tag
- Retain original for audit
- Log: "Hidden by [moderator] - Reason: [selected]"

WHEN a moderator selects "Warn Author", THE system SHALL:

- Add one warning to author’s account
- Notify author via persistent message
- Log: "Warned author of post [ID] - Reason: [selected]"

### Content Removal

WHEN an item is hidden, THE system SHALL:

- Not delete the content from database
- Return "[removed]" when API queried by regular users
- Return full content when queried by moderator or admin

WHEN an item is flagged 3+ times by different users, THE system SHALL:

- Auto-hide the item without moderator action
- Notify moderator: "Auto-hide triggered: 3+ reports on item [ID]"

### Appeals Process

WHEN an author’s content is hidden, THE system SHALL:

- Display below the moderation notice: "You may appeal this decision by emailing moderation@site.com"

WHEN an appeal is received via email, THE system SHALL:

- Route it to a designated moderator for review
- Allow moderator to reverse decision and restore content
- Log: "Appeal resolved: restored by [moderator]"

### Account Suspension

WHEN an author accumulates three (3) warnings, THE system SHALL:

- Disable any new article or comment submissions
- Display to author: "Your account is suspended for 14 days. No new content may be posted."
- Prevent re-registration under new email

WHEN suspension period ends, THE system SHALL:

- Clear all warnings
- Restore ability to post
- Notify author: "Your suspension has ended. You may now post again."

## Performance Requirements

WHEN a citizen views an article with 100+ comments, THE system SHALL:

- Load first 20 comments in under 1.0 second
- Load additional comments in batches of 20 as user scrolls
- Never load more than 100 comments at once

WHEN a citizen uploads an image, THE system SHALL:

- Complete upload in under 5 seconds for 5MB files
- Show real-time progress bar
- Resize and optimize automatically in background

WHEN a citizen downloads a file, THE system SHALL:

- Serve the file in under 3 seconds for 10MB size
- Set proper Content-Disposition header

WHEN a citizen searches articles by keyword, THE system SHALL:

- Return results in under 1.2 seconds
- Index article titles and body content only

WHEN the system has 10,000+ published articles, THE system SHALL:

- Maintain page load times under 2 seconds
- Support 1,000 concurrent users
- Maintain 99.9% uptime

## Compliance

### Data Retention

WHEN an article or comment is deleted, THE system SHALL:

- Store the content for 365 days in encrypted archival storage
- After 365 days, permanently delete the content with zero traceability
- Never repurpose data for advertising or profiling

### Privacy Policy

THE system SHALL:

- Not collect or store personally identifiable information beyond email and session
- Not track user behavior across sessions or sessions
- Not share user data with third parties
- Not use cookies except for essential session and authentication

### Content Archiving

THE system SHALL:

- Allow moderators to generate audit logs of all moderation decisions
- Allow regulators to request anonymized public data for compliance inspection (e.g., count of reported articles)
- Never allow export of private user identities or personal messages

### Legal Compliance

THE system SHALL:

- Comply with GDPR, CCPA, and similar privacy regulations
- Include explicit consent checkbox during registration
- Provide "Download Your Data" and "Delete Account" links

### User Consent

WHEN a citizen registers, THE system SHALL:

- Show consent banner: "By signing up, you agree to our Terms and Privacy Policy."
- Require user to check a box before proceeding
- Store timestamp and IP of consent

## Error Handling

### Upload Failure

IF an image upload fails due to size >5MB, THEN THE system SHALL:

- Show: "Image too large. Maximum size is 5MB."

IF a file upload fails due to unsupported type, THEN THE system SHALL:

- Show: "File type not allowed. Only PDF, DOCX, TXT, CSV, ZIP are permitted."

IF upload is interrupted by network error, THEN THE system SHALL:

- Show: "Upload failed. Please check your connection and try again."

### Authentication Failure

IF credentials are invalid, THEN THE system SHALL:

- Show: "Invalid email or password. Please try again or reset."

IF token expires, THEN THE system SHALL:

- Redirect to login screen
- Show: "Your session expired. Please sign in again."

### Server Errors

IF backend service is unavailable, THEN THE system SHALL:

- Show: "Service temporarily unavailable. Please try again later."

IF database fails during write, THEN THE system SHALL:

- Show: "Your content could not be saved. Please try again."

### Media Corruption

IF uploaded image is corrupted and cannot be rendered, THEN THE system SHALL:

- Show: "Image file is corrupted and cannot be displayed."
- Retain original file for moderator review

### File Format Rejection

IF uploaded file has incorrect MIME type or extension mismatch, THEN THE system SHALL:

- Show: "File format is invalid. Upload the original file without renaming."

### Comment Submission Errors

IF a comment exceeds 5000 characters, THEN THE system SHALL:

- Show: "Comment too long. Maximum length is 5,000 characters."

IF a comment is only whitespace or symbols, THEN THE system SHALL:

- Show: "Comment cannot be empty or contain only symbols."

IF user tries to comment without being logged in, THEN THE system SHALL:

- Show: "You must be logged in to comment. Please sign in or register."

IF comment submission server fails, THEN THE system SHALL:

- Show: "Comment could not be saved. Please try again."

### Mermaid Diagram: Article Publishing Workflow

```mermaid
graph TD
A["Start: Citizen opens new post"] --> B["Authenticate or register"]
B --> C{Authenticated?}
C -->|Yes| D["Enter title"]
C -->|No| B
D --> E["Enter body text (≤10,000 chars)"]
E --> F["Attach up to 5 images"]
F --> G["Attach up to 2 files"]
G --> H["Click Publish"]
H --> I["Validate: Title, content, media limits"]
I --> J{Validation Success?"}
J -->|Yes| K["Encrypt and upload content + files"]
J -->|No| L["Show specific error message"]
K --> M["Store metadata in database"]
M --> N["Save media files to object storage"]
N --> O["Generate public article URL"]
O --> P["Display: \"Your article has been published.\""]
P --> Q["Redirect to article page"]
```

### Mermaid Diagram: Comment Moderation Flow

```mermaid
graph TD
A["Comment submitted"] --> B["Display publicly"]
B --> C{User reports comment?"}
C -->|Yes| D["Flag as Reported"]
C -->|No| B
D --> E["Hide from public view"]
E --> F["Notify moderator dashboard"]
F --> G["Moderator reviews report"]
G --> H{Action: Approve, Hide, Warn?"}
H -->|Approve| I["Remove flag, restore visibility"]
H -->|Hide| J["Replace content with 'Moderated' notice"]
H -->|Warn| K["Add one warning to author account"]
I --> L["Log action in moderation audit trail"]
J --> L
K --> L
L --> M["Notify actor of outcome"]
M --> N["Persist changes"]
```

### Mermaid Diagram: File Upload Validation

```mermaid
graph TD
A["File selected by user"] --> B["Check file extension"]
B --> C{Valid format (PDF, DOCX, TXT, CSV, ZIP)?"}
C -->|Yes| D["Check file size ≤10MB"]
C -->|No| E["Reject: \"File type not allowed\""]
D --> F{Size ≤10MB?"}
F -->|Yes| G["Scan for executable content, macros, scripts"]
F -->|No| H["Reject: \"File too large (max 10MB)\""]
G --> I{Clean?"}
I -->|Yes| J["Generate SHA-256 hash"]
I -->|No| K["Reject: \"File contains unsafe content\""]
J --> L["Store with randomized filename"]
L --> M["Return success to UI"]
```

### Mermaid Diagram: Notification System Flow

```mermaid
graph TD
A["User posts comment"] --> B["System records comment"]
B --> C{Any @mentions?"}
C -->|Yes| D["Check recipient user’s notification setting"]
D --> E{Notifications enabled?"}
E -->|Yes| F["Send notification to recipient’s dashboard"]
E -->|No| G["Do nothing"]
C -->|No| H{Reply from another user?"}
H -->|Yes| I["Send notification to original author"]
H -->|No| J["No action"]
F --> K["Increment notification badge count"]
I --> K
K --> L["Persist notification until read"]
```

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*