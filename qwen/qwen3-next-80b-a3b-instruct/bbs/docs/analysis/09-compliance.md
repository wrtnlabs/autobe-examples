# Requirements Analysis for Economic/Political Discussion Board

## Service Overview

The economic/political discussion board is a platform designed to enable open, civil discourse among citizens on economic and political topics. It provides a minimalist interface for posting articles and engaging in threaded conversations with attachments. The system supports moderation to maintain quality discourse while preserving user anonymity and platform integrity.

## Actor Definitions

### Citizen
A registered user who can create and publish articles, attach media files, and participate in comments.

- Can create new articles with title and body content
- Can upload up to five attachments per article
- Can post comments on any published article
- Can reply to comments in threaded discussion
- Can report inappropriate content
- Can edit article drafts before publication
- Cannot delete articles once published
- Must be authenticated to participate

### Moderator
A trusted citizen with additional privileges to maintain content quality.

- Can review flagged articles
- Can hide articles from public view
- Can remove inappropriate comments
- Can approve or reject pending articles
- Can suspend user posting privileges for policy violations
- Cannot delete articles from the system
- Cannot modify article content directly

### System
Automated components handling technical operations.

- Validates file uploads by type and size
- Stores attachments permanently
- Generates thumbnails for image files
- Automatically flags content based on keywords and patterns
- Sends moderation notifications to trusted users
- Enforces posting frequency limits
- Manages user authentication sessions

## Core Features

### Article Creation

WHEN a citizen navigates to the home page, THE system SHALL display a "New Article" button.

WHEN a citizen clicks "New Article", THE system SHALL open an editor with:
- Title field (maximum 200 characters)
- Content area (minimum 10 characters, maximum 10,000 characters)
- Category dropdown with predefined options: Economics, Politics, International, Society, Culture, Other

WHEN a citizen types in the title field, THE system SHALL display a character counter (e.g., "142/200").

WHEN a citizen types in the content area, THE system SHALL display a character counter (e.g., "7,842/10,000").

WHEN a citizen selects a category, THE system SHALL store it with the article.

WHEN a citizen closes the editor without saving, THE system SHALL prompt: "You have unsaved changes. Are you sure you want to discard them?" and then discard all changes if confirmed.

WHEN a citizen submits an article with empty title and empty content, THE system SHALL reject submission and show: "Article must have a title or content."

WHEN a citizen submits an article with only whitespace in title or content, THE system SHALL reject submission and show: "Article must have a title or content."

WHEN a citizen submits a draft, THE system SHALL store it as unpublished.

WHILE an article is in draft state, THE system SHALL allow the citizen to edit its title, content, and category.

WHILE an article is in draft state, THE system SHALL allow the citizen to delete it completely.

WHEN a citizen publishes an article, THE system SHALL submit it to moderation for review.

WHEN an article is under moderation, THE system SHALL display: "Awaiting moderator approval" to all users except the author and moderators.

WHEN a moderator approves an article, THE system SHALL make it immediately visible in the main feed.

WHEN a moderator rejects an article, THE system SHALL notify the author via email and display: "Your article was rejected because it violates our content policy."

### Article Attachments

WHEN a citizen is composing an article, THE system SHALL provide a "Add Attachment" button.

WHEN a citizen clicks "Add Attachment", THE system SHALL open a file browser dialog.

WHEN a citizen selects one or more files, THE system SHALL validate each file using both extension and MIME type.

WHEN a citizen selects a file, THE system SHALL display the filename and size next to the upload button.

WHEN a citizen uploads an image file (JPEG, PNG, GIF, WebP), THE system SHALL generate a thumbnail preview at 128x128 pixels.

WHILE uploading an attachment, THE system SHALL show a progress bar.

WHILE uploading multiple attachments, THE system SHALL show individual progress bars for each file.

IF a file upload fails, THE system SHALL show a clear error message and allow the citizen to retry.

IF a file upload is interrupted, THE system SHALL cancel the upload and remove the file from the draft.

WHEN a citizen selects more than five files, THE system SHALL reject additional files and show: "Maximum 5 attachments per article. You've selected 6."

WHEN a citizen uploads an image file exceeding 10 MB, THE system SHALL reject it and show: "Image too large. Maximum size is 10 MB."

WHEN a citizen uploads a document file exceeding 20 MB, THE system SHALL reject it and show: "File too large. Maximum size is 20 MB."

WHEN a citizen uploads a file with unsupported format, THE system SHALL reject it and show: "Unsupported file type. Allowed types: JPG, PNG, GIF, WebP, PDF, DOC, DOCX, XLS, XLSX, TXT, ZIP."

WHEN a citizen uploads a file with invalid MIME type (e.g., renamed .exe file), THE system SHALL reject it and show: "Invalid file type. The file does not match its reported content."

WHEN an attachment is successfully uploaded, THE system SHALL display the file in a list with its name, size, and icon.

WHEN a citizen clicks "Remove" on an attached file before publishing, THE system SHALL remove it from the list.

WHEN a citizen publishes an article with attachments, THE system SHALL attach all completed uploads to the article.

### Article Display

WHEN a citizen views a published article, THE system SHALL display:
- Article title
- Author username
- Publication timestamp (e.g., "Posted 2 minutes ago")
- Category tag
- Article content with Markdown rendering (bold, italic, lists, blockquotes)
- Up to five attached files with icons based on type

WHEN a citizen clicks on an image attachment, THE system SHALL open the image in a modal viewer with zoom and download options.

WHEN a citizen clicks on a document attachment, THE system SHALL initiate a file download.

WHEN a citizen views an article with no text but only attachments, THE system SHALL still display and make the attachments accessible.

WHEN a citizen views an article with no attachments but only text, THE system SHALL display the content normally.

WHEN an article is edited after publication, THE system SHALL display an "Updated" timestamp below the article but retain its original position in the feed.

### Commenting System

WHEN a citizen views a published article, THE system SHALL display a comment section below it.

WHEN a citizen clicks "Add Comment", THE system SHALL present a text input field.

WHEN a citizen submits a comment, THE system SHALL append it to the article's comment list immediately.

WHEN a citizen submits a comment, THE system SHALL record the author's username, timestamp, and content.

WHEN a citizen submits a comment with only whitespace, THE system SHALL reject it and show: "Comment cannot be empty."

WHEN a citizen submits a comment exceeding 5,000 characters, THE system SHALL truncate it to 5,000 characters and show: "Comment truncated to 5,000 characters."

WHEN a citizen clicks "Reply" on a comment, THE system SHALL open a text field nested beneath that comment.

WHEN a citizen replies to a comment, THE system SHALL display the reply as a child under the original comment, indented visually.

THE system SHALL support reply chains up to five levels deep.

WHEN a parent comment is deleted, THE system SHALL delete all direct replies to it.

WHEN a reply is deleted, THE system SHALL show "[Reply removed]" in place of the reply text.

### Comment Moderation

WHEN a citizen reports a comment, THE system SHALL submit a report to the moderator queue with the comment ID, reason (selected from predefined options), and timestamp.

WHEN a comment receives three reports, THE system SHALL automatically flag it for moderator review.

WHEN a moderator reviews a flagged comment, THE system SHALL provide options: "Hide", "Warn", or "Approve".

WHEN a moderator hides a comment, THE system SHALL replace its content with "[Comment removed by moderator]" and display the moderator's username and time of action.

WHEN a moderator hides a comment, THE system SHALL send a notification to the comment author: "One of your comments was removed by a moderator."

WHEN a moderator warns a user for comment violation, THE system SHALL restrict their ability to post comments for 24 hours and send notification: "You've been temporarily restricted from commenting."

WHEN a moderator approves a flagged comment, THE system SHALL remove the flag and leave the comment visible.

WHEN a moderator hides a comment, THE system SHALL retain a redacted archive copy for compliance and audit purposes.

### Content Visibility

WHEN a citizen publishes an article, THE system SHALL make it visible to all users after moderator approval.

WHEN a citizen creates an article, THE system SHALL display it only to the citizen until published.

WHEN an article is published, THE system SHALL add it to the main feed sorted by latest first.

WHEN an article is hidden by a moderator, THE system SHALL remove it from public feeds.

WHEN an article is hidden by a moderator, THE system SHALL still allow the original author to view it in their profile.

WHEN an article is hidden, THE system SHALL show a message to regular users: "This article has been hidden by a moderator."

WHEN an article is hidden, THE system SHALL still allow moderators to view it with full editing tools.

WHEN an article is reported five times, THE system SHALL automatically hide it pending moderator review.

IF an article is hidden due to reports and later restored by a moderator, THE system SHALL restore it to its original position in the feed.

### Search Functionality

WHEN a user enters text in the search bar, THE system SHALL filter results in real time.

WHEN a user submits a search, THE system SHALL show articles matching the query.

WHEN a user searches for text, THE system SHALL match against article titles and article content.

WHEN a user searches for text, THE system SHALL match against comment text within articles.

WHEN a user searches, THE system SHALL highlight matching text in results.

WHEN a user searches with no results, THE system SHALL show: "No articles match your search."

WHEN a user searches with at least one result, THE system SHALL show up to 20 articles per page.

WHERE search terms are shorter than three characters, THE system SHALL not return results and show: "Search terms must be at least three characters long."

WHERE search terms contain only symbols or numbers, THE system SHALL not return results and show: "Search must include letters."

WHERE a search term matches an article author's username, THE system SHALL include articles by that author in results.

WHERE a search term matches an attached filename, THE system SHALL include articles with that attachment in results.

WHERE an article contains multiple matches, THE system SHALL still list it only once in results.

WHERE a search returns more than 20 results, THE system SHALL show "Load more" button to load next 20.

## User Journey: Creating a Post with Attachments

### Step 1: Login/Register

WHEN a new citizen visits the discussion board, THE system SHALL display a prominent "Register" button and a "Log In" link in the header.

WHEN a citizen clicks "Register", THE system SHALL present a form requesting:
- Email address (required, valid email format)
- Username (required, 3-30 characters, alphanumeric and underscores only)
- Password (required, minimum 8 characters)
- Password confirmation (required, must match password)

WHEN a citizen submits the registration form, THE system SHALL validate all fields and respond as follows:
- IF email is already registered, THEN THE system SHALL display "This email address is already in use."
- IF username is already taken, THEN THE system SHALL display "This username is already taken."
- IF password and confirmation do not match, THEN THE system SHALL display "Passwords do not match."
- IF all fields are valid, THEN THE system SHALL send a verification email to the provided address and display "Your account has been created. Please check your email to verify your address."

WHEN a citizen clicks "Log In", THE system SHALL present a form requesting:
- Email address (required)
- Password (required)

WHEN a citizen submits login credentials, THE system SHALL validate them and respond as follows:
- IF email or password is incorrect, THEN THE system SHALL display "Invalid email or password."
- IF credentials are valid and email is unverified, THEN THE system SHALL display "Please verify your email address before logging in."
- IF credentials are valid and email is verified, THEN THE system SHALL establish a session and redirect to the home page.

WHILE a citizen is logged in, THE system SHALL display their username in the header and provide a "Logout" option.

WHEN a citizen clicks "Logout", THE system SHALL terminate the session and redirect to the home page.

### Step 2: Compose New Article

WHEN a logged-in citizen navigates to the home page, THE system SHALL display a "New Article" button prominently at the top of the content feed.

WHEN a citizen clicks "New Article", THE system SHALL open a modal or dedicated page with a post editor containing:
- Title field (required, maximum 200 characters)
- Content textarea (required, minimum 10 characters)
- Categories dropdown (predefined list: Economics, Politics, International, Society, Culture, Other)
- File upload section
- Preview toggle

WHEN a citizen types in the title field, THE system SHALL count and display remaining characters (e.g., "187/200").

WHEN a citizen types in the content field, THE system SHALL count and display remaining characters (e.g., "8,423/10,000").

WHEN a citizen selects a category, THE system SHALL apply the selected category and store it with the article.

WHEN a citizen toggles "Preview", THE system SHALL render a formatted preview of the article content with Markdown rendering (bold, italic, lists, blockquotes) but not executable code. Images and files do not render in preview.

WHEN a citizen closes the article editor without saving, THE system SHALL prompt: "You have unsaved changes. Are you sure you want to discard them?" If confirmed, THE system SHALL discard all edits and return to the home page.

### Step 3: Add Attachments

WHEN a citizen clicks "Add Attachment" in the article editor, THE system SHALL open a file picker dialog with the following rules:

- Files of any type may be selected, but only specific types are allowed upon upload. Allowable types:
  - Images: .jpg, .jpeg, .png, .gif, .webp
  - Documents: .pdf, .doc, .docx, .txt, .md
  - Spreadsheets: .xls, .xlsx
  - Archives: .zip, .rar

- File size limit: Each attachment must be under 20MB.

- Maximum number of attachments per article: 5.

WHEN a citizen selects a file, THE system SHALL:
- Verify file extension against allowed types
- Verify file size against 20MB limit
- Display file name and size in the attachment list
- Show progress indicator during upload

WHEN a file exceeds 20MB, THE system SHALL display an error: "File is too large. Maximum size is 20MB."

WHEN a file has an unsupported extension, THE system SHALL display an error: "This file type is not allowed. Use JPG, PNG, PDF, DOC, TXT, ZIP, or other approved formats."

WHEN a citizen tries to add a sixth attachment, THE system SHALL display: "You may only attach up to 5 files per article."

WHEN a file uploads successfully, THE system SHALL show a success icon, embed the file in the article as a link with a preview thumbnail for images, and display "Uploaded successfully."

WHEN a citizen clicks "Remove" on an attached file before publishing, THE system SHALL remove it from the list and free up the upload slot.

WHILE a file is uploading, THE system SHALL disable the publish button and display: "Uploading attachments... Please wait."

WHEN an upload fails due to network error, THE system SHALL display: "Upload failed. Check your connection and try again."

WHERE a citizen has previously uploaded 3 files, THE system SHALL allow 2 more attachments.

### Step 4: Publish

WHEN a citizen has completed the title, content, category, and attachments, THE system SHALL enable the "Publish" button.

WHEN a citizen clicks "Publish", THE system SHALL:
- Validate that title is not empty
- Validate that content is not empty
- Confirm all attachments have completed uploading
- Submit the article for moderation

WHEN content is empty but the citizen clicks "Publish", THE system SHALL display: "Article cannot be empty. Please enter some content."

WHEN title is empty but the citizen clicks "Publish", THE system SHALL display: "Please enter a title for your article."

WHEN any attachment upload is still in progress, THE system SHALL display: "All attachments must finish uploading before publishing."

WHEN all validations pass and all attachments have completed, THE system SHALL send the article to the moderation queue and display: "Your article has been submitted for review. You will be notified when it is approved."

WHILE an article is in moderation, THE system SHALL show a status badge on the user's profile: "Awaiting approval".

### Step 5: View Published Article

WHEN an article is approved by a moderator, THE system SHALL change its status to "Published" and make it visible in the main feed.

WHEN a citizen views a published article, THE system SHALL display:
- Article title
- Author username
- Publication timestamp (e.g., "Posted 3 minutes ago")
- Category tag
- Article content with Markdown rendering
- All attached files as clickable links with icons (image thumbnails if image)
- Download count for each attachment

WHEN a citizen clicks an image attachment, THE system SHALL open the image in a modal viewer with zoom and download options.

WHEN a citizen clicks a document attachment, THE system SHALL present a download prompt with file name and size.

WHEN a citizen views an article from the "Awaiting approval" state, THE system SHALL display: "This article is currently under review. It will be visible once approved by a moderator."

WHEN a citizen views their own article in "Awaiting approval" state, THE system SHALL also display: "You cannot edit or delete this article while it is under review."

## Business Rules

### Attachment Limits

- WHEN a user uploads a file, THE system SHALL reject files larger than 20 MB.
- WHEN a user uploads an image, THE system SHALL reject images larger than 10 MB.
- WHEN a user creates an article, THE system SHALL allow a maximum of 5 file attachments.
- IF a user attempts to upload 6 attachments, THEN THE system SHALL display error: "Maximum 5 attachments allowed per article."

### File Types Allowed

- THE system SHALL accept the following file extensions:
  - Images: .jpg, .jpeg, .png, .gif, .webp
  - Documents: .pdf, .doc, .docx, .txt, .md
  - Spreadsheets: .xls, .xlsx
  - Archives: .zip, .rar

- THE system SHALL validate uploads using MIME type detection in addition to file extension.
- IF a file has an allowed extension but forbidden MIME type, THEN THE system SHALL reject it with error: "Invalid file type. The file does not match its reported content."
- THE system SHALL NOT accept executable files (.exe, .bat, .sh, .dll, .bin, .app) under any circumstances.

### Content Restrictions

- THE system SHALL prohibit articles containing:
  - Links to phishing sites, malware distribution, or illegal content
  - Personal identification information (PII) such as full home addresses, IDs, financial account numbers
  - Hate speech targeting race, religion, gender, sexual orientation, or national origin
  - Threats of violence against individuals or groups
  - Non-consensual intimate imagery
  - Child exploitation material

### Posting Frequency

- WHEN a user creates a new article, THE system SHALL limit posting to 5 articles per minute.
- WHEN a user creates a new article within 10 seconds of their previous article, THE system SHALL display error: "Please wait 10 seconds between articles."
- WHILE a user has been restricted due to excessive posting, THE system SHALL deny all new article submissions until the cooldown period expires.

### Moderation Triggers

- WHEN an article contains 3 or more external links, THE system SHALL automatically label it as "high-risk" and require moderator approval before public visibility.
- WHEN an article includes file attachments and text content under 20 characters, THE system SHALL flag it for potential spam review.

### User Consequences

- THE system SHALL maintain a moderation history per user account.
- WHEN a user accumulates 3 documented violations, THEN THE system SHALL temporarily suspend their posting privileges for 7 days.
- WHEN a user accumulates 5 documented violations, THEN THE system SHALL permanently ban their account.

## Compliance Requirements

### Data Retention Policy

- WHEN a citizen posts an article or comment, THE system SHALL store the content, metadata, and attachments indefinitely unless explicitly deleted by the user or removed by a moderator.
- WHEN an article is deleted by a user, THE system SHALL permanently remove it from all public-facing surfaces and make it unrecoverable within 7 days.
- WHEN an article is removed by a moderator for policy violations, THE system SHALL retain a redacted archive copy for 365 days for audit and legal compliance purposes.

### Privacy Policy

- THE system SHALL NOT collect or store personally identifiable information (PII) beyond what is necessary for authentication: email address and IP address at login.
- WHEN a user registers, THE system SHALL store only: name (optional), email (required), hashed password, and creation timestamp.
- WHEN a user uploads a file or image, THE system SHALL NOT extract or store metadata (e.g., EXIF data, geolocation, camera model) embedded in the file.
- WHILE any content remains active, THE system SHALL NOT correlate user activity across sessions using tracking cookies or behavioral profiling.

### Legal Compliance

- THE system SHALL comply with all applicable laws governing online speech and data privacy, including (but not limited to): GDPR (EU), CCPA (California), PIPA (South Korea), and CDA Section 230 (USA).
- WHEN a user is located in the European Union (based on IP geolocation), THE system SHALL enforce GDPR-compliant data handling procedures regardless of the user's declared location.

### User Consent

- WHEN a new user registers, THE system SHALL present a clear, unambiguous consent screen that includes:
  - A summary of data retention practices
  - A statement that attachments may be archived if flagged
  - An explanation of moderation authority
  - A link to the full Privacy and Compliance Policy
- WHERE a user has not consented to the full policy, THEN THE system SHALL prevent account creation and display a message: "You must agree to our Data Retention and Compliance Policy to participate."

## Error Handling

### Upload Failure

- IF a file exceeds size limit, THEN THE system SHALL show: "File exceeds 20 MB limit. Please compress or reduce resolution."
- IF a file type is not allowed, THEN THE system SHALL show: "File type not permitted. Use JPG, PNG, PDF, TXT, or ZIP only."
- IF attachment limit is exceeded, THEN THE system SHALL show: "Maximum 5 attachments per article. Remove one to add another."
- IF posting too frequently, THEN THE system SHALL show: "Please wait 10 seconds before posting again."
- IF content is flagged as prohibited, THEN THE system SHALL show: "Your article contains restricted content and cannot be published."
- IF server error occurs during upload, THEN THE system SHALL display: "Upload failed. Please try again. If problem persists, contact support."

### Authentication Failure

- IF user provides invalid login credentials, THEN THE system SHALL show: "Invalid email or password."
- IF user's email is unverified, THEN THE system SHALL show: "Please verify your email address before logging in."
- IF user attempts to post without being logged in, THEN THE system SHALL show: "You must be logged in to post articles and comments."

### Server Errors

- IF the service is temporarily unavailable, THEN THE system SHALL display: "Service temporarily unavailable. Please try again later."

### Content Rejection

- IF a comment exceeds 5,000 characters, THEN THE system SHALL reject the submission and show: "Comment too long. Maximum length is 5,000 characters."
- IF a comment contains only whitespace or symbols, THEN THE system SHALL reject the submission and show: "Comment cannot be empty or consist only of symbols."
- IF a user tries to reply to a deleted comment, THEN THE system SHALL show: "This comment has been removed. You cannot reply to it."

## Authentication and Permissions

### Authentication Flow

WHEN a citizen visits the site without authentication, THE system SHALL limit access to:
- Viewing published articles
- Reading published comments
- Viewing search results

WHEN a citizen attempts to perform any action requiring authentication (posting, commenting), THE system SHALL redirect to the login page.

WHEN a citizen is logged in, THE system SHALL allow:
- Creating article drafts
- Uploading attachments
- Publishing articles
- Posting comments
- Replying to comments
- Reporting content

WHEN a moderator is logged in, THE system SHALL also allow:
- Viewing all articles awaiting review
- Viewing flagged comments
- Hiding articles and comments
- Suspending user accounts

### Permission Matrix

| Action | Citizen | Moderator |
|--------|---------|-----------|
| View published articles | ✓ | ✓ |
| View draft articles | ✓ | ✓ |
| Create draft article | ✓ | ✓ |
| Edit draft article | ✓ | ✓ |
| Publish article | ✓ | ✓ |
| Upload attachments | ✓ | ✓ |
| View comment section | ✓ | ✓ |
| Post comment | ✓ | ✓ |
| Reply to comment | ✓ | ✓ |
| Report comment | ✓ | ✓ |
| View article moderation queue | ✗ | ✓ |
| Hide article | ✗ | ✓ |
| Hide comment | ✗ | ✓ |
| Suspend user account | ✗ | ✓ |

## Performance Requirements

### Page Load Speed

- WHEN a user opens the home page with 20 articles, THE system SHALL render the full page within 1.5 seconds.
- WHEN a user opens an article page with 50+ comments, THE system SHALL load visible comments within 2 seconds.

### Media Upload Speed

- WHEN a citizen uploads an image under 1 MB, THE system SHALL complete upload and processing in under 3 seconds on average.
- WHEN a citizen uploads a 10 MB image, THE system SHALL complete upload and thumbnail generation in under 10 seconds under normal network conditions.
- WHEN a citizen uploads a 20 MB document, THE system SHALL complete upload in under 15 seconds.

### Search Response Time

- WHEN a user enters search terms, THE system SHALL update results in under 500 milliseconds.
- WHEN a user submits a search to the server, THE system SHALL return results in under 800 milliseconds.

### Platform Availability

- THE system SHALL maintain at least 99.9% monthly uptime.
- WHEN the system experiences downtime, THE system SHALL display a maintenance banner.

## Out of Scope

The following features are explicitly not included:

- User profiles or avatars
- Private messaging between users
- Reputation systems or karma scores
- Social sharing buttons
- Email notification for replies
- Real-time updates via WebSockets
- Mobile application versions
- Advanced search filters (by date, category, etc.)
- User following or subscription features
- Analytics dashboards for moderators
- Content recommendation engines
- Translation services

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*