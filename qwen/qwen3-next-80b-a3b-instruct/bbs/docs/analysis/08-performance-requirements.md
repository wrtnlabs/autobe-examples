# Economic and Political Discussion Board Requirements

## Service Vision

Economic and political discourse has become increasingly fragmented, polarized, and dominated by algorithmic engagement hooks rather than thoughtful dialogue. Modern discussion platforms prioritize virality over validity, incentivizing outrage over understanding. This service exists to provide a simple, ad-free, and moderator-guided space where citizens can engage with economic and political ideas in good faith — without distraction, without manipulation, and without corporate surveillance.

Unlike mainstream forums that monetize attention through targeted advertising, content farms, or algorithmically amplified extremes, this platform is designed as a digital town square for intellectually serious discourse. It rejects clickbait, suppresses outrage-driven content, and empowers users to build knowledge through reasoned exchange. The service is not driven by growth-at-all-costs metrics but by meaningful participation and civil exchange.

This is not another social media echo chamber. This is a curated environment for people who want to understand complex systems, challenge their own assumptions, and engage with opposing viewpoints without fear of harassment, doxxing, or algorithmic silencing.

## Core Value Proposition

WHEN a citizen posts an article, THE system SHALL allow the attachment of images and files to support arguments with data, charts, or source documents.

WHEN a citizen submits content, THE system SHALL not automatically promote, boost, or algorithmically rank posts based on engagement metrics (likes, shares, replies).

THE system SHALL display all posts in chronological order, newest first, with no personalized feed.

WHEN a post receives five or more user reports, THE system SHALL automatically flag it for review by a moderator.

THE system SHALL not monetize user data, display advertisements, or sell any user information.

WHERE a post includes a file attachment, THE system SHALL validate that the file is one of these types: .jpg, .png, .pdf, .txt, .csv, .xlsx, .docx, .mp4, .mov.

WHILE a moderator is reviewing a flagged post, THE system SHALL hide the post from public view unless it is cleared.

WHEN a moderator removes a post, THE system SHALL notify the author with a clear explanation and provide an appeals process.

THE system SHALL not support anonymous posting — every post must be tied to a verified citizen account.

## Target Audience

### Primary Users: Citizens

Citizens are regular individuals interested in economics, public policy, political theory, and societal trends. They may be students, professionals, retirees, or autodidacts. They are not influencers, activists, or trolls. They seek to understand complex systems, reference primary sources, and participate in thoughtful critique.

Citizens use the platform to:
- Share articles, op-eds, or original analysis on inflation, taxation, regulation, governance, or historical economic patterns
- Attach charts from government publications, academic papers, or statistical datasets
- Comment on posts with citations and logical reasoning
- Flag content that is misleading, unfounded, or abusive

Citizens are not expected to generate viral content. They are expected to engage deliberately.

### Secondary Users: Moderators

Moderators are trusted citizens selected for their demonstrated capacity for impartial judgment and respect for evidence. They do not have special privileges to promote their own views. Their role is solely to uphold the norms of civil discourse.

Moderators:
- Review flagged posts within 24 hours
- Remove content that contains personal attacks, falsehoods presented as fact, or spam
- Issue warnings to users who repeatedly breach behavior guidelines
- Maintain the integrity of the platform without censoring legitimate dissent

Moderators are not administrators. They have no access to user data beyond what is necessary to review reported content. Their authority is derived from community trust, not system permissions.

### What This Platform Is NOT

- It is NOT a place for political mobilization or campaigning.
- It is NOT a platform for meme warfare or ironic outrage.
- It is NOT designed for mass audiences or viral growth.
- It is NOT a forum for anonymous commenters.
- It is NOT monetized. No ads. No affiliate links. No data harvesting.

This platform exists to make serious discourse possible again. It does not need to be big. It needs to be reliable.

## User Actors

### Citizen Actor

Citizens are regular registered users who participate in economic and political discussions on the platform. They represent the foundational user base of the discussion board.

### Capabilities

- CAN register an account using email and password
- CAN log in to access their account
- CAN log out to end their session
- CAN create new discussion posts with a title and body text
- CAN edit their own posts within 24 hours of creation
- CAN delete their own posts at any time
- CAN attach up to 5 files per post (images and documents)
- CAN comment on any public post
- CAN like or upvote posts and comments
- CAN report inappropriate content
- CAN view all public posts and comments
- CAN search for posts using keywords
- CAN receive email notifications for replies to their comments

### Restrictions

- CANNOT edit other users' posts
- CANNOT delete other users' posts
- CANNOT moderate or remove content
- CANNOT post more than 5 times per hour
- CANNOT attach files larger than 20 MB
- CANNOT attach executable files or compressed archives (ZIP, RAR, EXE)
- CANNOT post content that contains direct threats of violence
- CANNOT post content that incites hatred based on race, religion, gender, or sexual orientation
- CANNOT impersonate other users or official entities
- CANNOT engage in coordinated spam campaigns

### Session Management

WHEN a user logs in, THE system SHALL issue a JWT access token with expiration of 24 hours.

WHEN a user logs in, THE system SHALL issue a refresh token with expiration of 30 days.

WHEN a user logs out, THE system SHALL immediately invalidate all active tokens.

WHEN a user changes password, THE system SHALL invalidate all active sessions on all devices.

### JWT Payload Structure

WHEN a citizen logs in, THE system SHALL include the following in the JWT payload:

{
  "userId": "string",
  "role": "citizen",
  "permissions": ["create_post", "edit_own_post", "delete_own_post", "attach_images", "attach_documents", "comment", "like", "report", "search"]
}

### Moderator Actor

Moderators are trusted users with elevated privileges to maintain the integrity and quality of the discussion platform. They are responsible for enforcing community standards and handling user reports.

### Capabilities

- HAS ALL capabilities of a Citizen actor
- CAN review reported content
- CAN edit any post to correct formatting or clarify intent
- CAN delete any post or comment without user consent
- CAN pin important posts to the top of category pages
- CAN lock posts to prevent further comments
- CAN issue warnings to users for policy violations
- CAN temporarily suspend user accounts
- CAN permanently ban users for severe or repeated violations
- CAN view all user activity history
- CAN communicate with users regarding moderation actions
- CAN manage user reputation scores
- CAN view hidden or reported content
- CAN mark posts as "verified" or "authoritative"

### Restrictions

- CANNOT delete posts without review unless explicitly flagged as severe violations
- CANNOT change user roles or permissions directly
- CANNOT create or modify moderation policies
- CANNOT access user private data beyond what's needed for moderation (email, IP history)
- CANNOT edit posts that are older than 30 days without special override
- CANNOT bypass the reporting system to take action on content

### Access Level

WHILE the system is active, THE system SHALL enforce the following access controls:

- Moderators have elevated permissions beyond citizens but are subject to audit logs
- All moderator actions are logged and subject to review by system administrators
- Moderators cannot remove content without at least one user report, except for clear violations of the Terms of Service
- Moderators must provide a reason for all content removals

### JWT Payload Structure

WHEN a moderator logs in, THE system SHALL include the following in the JWT payload:

{
  "userId": "string",
  "role": "moderator",
  "permissions": ["create_post", "edit_own_post", "delete_own_post", "attach_images", "attach_documents", "comment", "like", "report", "search", "review_reports", "edit_any_post", "delete_any_post", "pin_post", "lock_post", "warn_user", "suspend_user", "ban_user", "view_activity_history", "communicate_with_users", "manage_reputation", "view_hidden_content", "mark_verified"]
}

## Core Features

### Post Creation

WHEN a citizen submits a new post, THE system SHALL create a draft with title, content, and timestamp.

WHEN a citizen submits a new post, THE system SHALL assign it a unique identifier.

WHEN a citizen submits a new post, THE system SHALL store it as unpublished until explicitly published.

WHILE a post is in draft state, THE system SHALL allow the citizen to edit its title and content.

WHILE a post is in draft state, THE system SHALL allow the citizen to delete it completely.

IF a citizen attempts to create a post with empty title and empty content, THEN THE system SHALL reject submission and show error message: "Post must have a title or content."

IF a citizen attempts to create a post with only whitespace in title or content, THEN THE system SHALL reject submission and show error message: "Post must have a title or content."

### Image and File Attachments

WHEN a citizen is composing a post, THE system SHALL provide a "Add attachment" button.

WHEN a citizen clicks "Add attachment", THE system SHALL open a file browser dialog.

WHEN a citizen selects one or more files, THE system SHALL validate each file before upload.

WHEN a citizen selects a file, THE system SHALL display the filename and file size next to the upload button.

WHEN a citizen uploads an image file, THE system SHALL generate a thumbnail preview.

WHILE uploading an attachment, THE system SHALL show a progress bar.

WHILE uploading multiple attachments, THE system SHALL show individual progress bars for each file.

IF a file upload fails, THEN THE system SHALL show a clear error message and allow the citizen to retry.

IF a file upload is interrupted, THEN THE system SHALL cancel the upload and remove the file from the draft.

### Attachment Limits and Types

WHEN a post contains attachments, THE system SHALL allow up to 5 files per post.

WHEN a post contains image attachments, THE system SHALL accept JPEG, PNG, GIF, WebP formats.

WHEN a post contains document attachments, THE system SHALL accept PDF, DOC, DOCX, TXT, CSV, XLSX, MP4, MOV formats.

WHEN a file attachment exceeds 20 MB, THEN THE system SHALL reject it and show error message: "File too large. Maximum size is 20 MB."

WHEN an image attachment exceeds 10 MB, THEN THE system SHALL reject it and show error message: "Image too large. Maximum size is 10 MB."

WHEN a file has an unsupported format, THEN THE system SHALL reject it and show error message: "Unsupported file type. Allowed types: JPEG, PNG, GIF, WebP, PDF, DOC, DOCX, TXT, CSV, XLSX, MP4, MOV."

WHEN a citizen attempts to attach more than 5 files, THEN THE system SHALL reject the additional files and show error message: "Maximum 5 attachments per post. You've selected 6."

### Attachment Storage and Display

THE system SHALL store all attachments as permanent files linked to the post.

THE system SHALL generate a unique URL for each attachment.

WHEN a post is viewed, THE system SHALL display each attachment as an icon with its filename.

WHEN a user clicks on an image attachment, THE system SHALL open the image in a lightbox viewer.

WHEN a user clicks on a non-image attachment, THE system SHALL initiate a download.

THE system SHALL preserve original filenames, but prevent malicious or unsafe characters in filenames.

THE system SHALL not execute, render, or interpret any attachment files.

### Commenting System

WHEN a citizen views a post, THE system SHALL display a comment section below it.

WHEN a citizen clicks "Add comment", THE system SHALL present a text input field.

WHEN a citizen submits a comment, THE system SHALL append it to the post's comment list.

WHEN a citizen submits a comment, THE system SHALL assign it a timestamp and link it to the user's profile.

WHILE a comment is being composed, THE system SHALL allow the citizen to edit or cancel it.

IF a comment is submitted with only whitespace, THEN THE system SHALL reject it and show error message: "Comment cannot be empty."

IF a comment exceeds 2000 characters, THEN THE system SHALL truncate it to 2000 characters and show message: "Comment truncated to 2000 characters."

### Comment Moderation

WHEN a moderator views a post with comments, THE system SHALL highlight comments flagged by users.

WHEN a moderator selects a comment, THE system SHALL show options to "Edit", "Hide", or "Delete".

WHEN a moderator deletes a comment, THE system SHALL remove it permanently and log the action.

WHEN a moderator edits a comment, THE system SHALL preserve original authorship but show "[Edited by moderator]".

WHEN a comment is hidden, THE system SHALL still show "1 hidden comment" to other users.

WHEN a citizen reports a comment, THE system SHALL submit a report to the moderator queue with context.

WHEN a comment receives 3 reports, THE system SHALL automatically flag it for moderator review.

### Reply Chains

WHEN a citizen clicks "Reply" on a comment, THE system SHALL open a text field at the bottom of the comment.

WHEN a citizen replies to a comment, THE system SHALL nest it visually under the original comment.

THE system SHALL allow replies to replies (2 levels deep).

THE system SHALL not show reply chains beyond 2 levels to maintain readability.

WHEN a parent comment is deleted, THE system SHALL also delete all direct replies to it.

WHEN a reply is deleted, THE system SHALL show "[Reply removed]" in place of the reply text.

### Content Visibility

WHEN a citizen publishes a post, THE system SHALL make it visible to all users immediately.

WHEN a citizen creates a post, THE system SHALL display it only to the citizen until published.

WHEN a post is published, THE system SHALL add it to the main feed sorted by latest first.

WHEN a post is edited after publication, THE system SHALL display "Updated" timestamp below the post.

WHEN a post is edited after publication, THE system SHALL NOT reset its position in the feed.

WHEN a post contains no text and only attachments, THE system SHALL still be published and visible.

WHEN a post contains no attachments and only text, THE system SHALL be published and visible.

### Visibility Restrictions

WHEN a moderator hides a post, THE system SHALL remove it from public feeds.

WHEN a moderator hides a post, THE system SHALL still allow the original author to view it in their profile.

WHEN a post is hidden, THE system SHALL show a message to regular users: "This post has been hidden by a moderator."

WHEN a post is hidden, THE system SHALL still allow moderators to view it with full editing tools.

WHEN a post is reported 5 times, THE system SHALL automatically hide it pending moderator review.

IF a post is hidden due to reports and later restored by a moderator, THE system SHALL restore it to its original position in the feed.

### Search Functionality

WHEN a user enters text in the search bar, THE system SHALL filter results in real time.

WHEN a user submits a search, THE system SHALL show posts matching the query.

WHEN a user searches for text, THE system SHALL match against post titles and post content.

WHEN a user searches for text, THE system SHALL match against comment text within posts.

WHEN a user searches, THE system SHALL highlight matching text in results.

WHEN a user searches with no results, THE system SHALL show message: "No posts match your search."

WHEN a user searches with at least one result, THE system SHALL show up to 20 posts per page.

### Search Behavior

WHERE search terms are shorter than 3 characters, THE system SHALL not return results and show message: "Search terms must be at least 3 characters long."

WHERE search terms contain only symbols or numbers, THE system SHALL not return results and show message: "Search must include letters."

WHERE a search term matches a post author's username, THE system SHALL include posts by that author in results.

WHERE a search term matches an attached filename, THE system SHALL include posts with that attachment in results.

WHERE a post contains multiple matches, THE system SHALL still list it only once in results.

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

### Step 2: Compose New Post

WHEN a logged-in citizen navigates to the home page, THE system SHALL display a "New Post" button prominently at the top of the content feed.

WHEN a citizen clicks "New Post", THE system SHALL open a modal or dedicated page with a post editor containing:
- Title field (required, maximum 200 characters)
- Content textarea (required, minimum 10 characters, maximum 10,000 characters)
- Categories dropdown (predefined list: Economics, Politics, International, Society, Culture, Other)
- File upload section
- Preview toggle

WHEN a citizen types in the title field, THE system SHALL count and display remaining characters (e.g., "187/200").

WHEN a citizen types in the content field, THE system SHALL count and display remaining characters (e.g., "8,423/10,000").

WHEN a citizen selects a category, THE system SHALL apply the selected category and store it with the post.

WHEN a citizen toggles "Preview", THE system SHALL render a formatted preview of the post content with Markdown rendering (bold, italic, lists, blockquotes) but not executable code. Images and files do not render in preview.

WHEN a citizen closes the post editor without saving, THE system SHALL prompt: "You have unsaved changes. Are you sure you want to discard them?" If confirmed, THE system SHALL discard all edits and return to the home page.

### Step 3: Add Attachments

WHEN a citizen clicks "Add Attachment" in the post editor, THE system SHALL open a file picker dialog with the following rules:

- Files of any type may be selected, but only specific types are allowed upon upload. Allowable types:
  - Images: .jpg, .jpeg, .png, .gif, .webp
  - Documents: .pdf, .doc, .docx, .txt, .md
  - Spreadsheets: .xls, .xlsx
  - Archives: .zip, .rar, .7z

- File size limit: Each attachment must be under 20MB.

- Maximum number of attachments per post: 5.

WHEN a citizen selects a file, THE system SHALL:
- Verify file extension against allowed types
- Verify file size against 20MB limit
- Display file name and size in the attachment list
- Show progress indicator during upload

WHEN a file exceeds 20MB, THE system SHALL display an error: "File is too large. Maximum size is 20MB."

WHEN a file has an unsupported extension, THE system SHALL display an error: "This file type is not allowed. Use JPG, PNG, PDF, DOC, TXT, ZIP, or other approved formats."

WHEN a citizen tries to add a sixth attachment, THE system SHALL display: "You may only attach up to 5 files per post."

WHEN a file uploads successfully, THE system SHALL show a success icon, embed the file in the post as a link with a preview thumbnail for images, and display "Uploaded successfully."

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
- Submit the post for moderation

WHEN content is empty but the citizen clicks "Publish", THE system SHALL display: "Post cannot be empty. Please enter some content."

WHEN title is empty but the citizen clicks "Publish", THE system SHALL display: "Please enter a title for your post."

WHEN any attachment upload is still in progress, THE system SHALL display: "All attachments must finish uploading before publishing."

WHEN all validations pass and all attachments have completed, THE system SHALL send the post to the moderation queue and display: "Your post has been submitted for review. You will be notified when it is approved."

WHILE a post is in moderation, THE system SHALL show a status badge on the user's profile: "Awaiting approval".

### Step 5: View Published Post

WHEN a post is approved by a moderator, THE system SHALL change its status to "Published" and make it visible in the main feed.

WHEN a citizen views a published post, THE system SHALL display:
- Post title
- Author username
- Publication timestamp (e.g., "Posted 3 minutes ago")
- Category tag
- Post content with Markdown rendering
- All attached files as clickable links with icons (image thumbnails if image)
- Download count for each attachment

WHEN a citizen clicks an image attachment, THE system SHALL open the image in a modal viewer with zoom and download options.

WHEN a citizen clicks a document attachment, THE system SHALL present a download prompt with file name and size.

WHEN a citizen views a post from the "Awaiting approval" state, THE system SHALL display: "This post is currently under review. It will be visible once approved by a moderator."

WHEN a citizen views their own post in "Awaiting approval" state, THE system SHALL also display: "You cannot edit or delete this post while it is under review."

## Business Rules

### Attachment Limits

### Maximum File Size

WHEN a user uploads a file, THE system SHALL reject files larger than 10 MB.

WHEN a user uploads an image, THE system SHALL reject images larger than 5 MB.

THE system SHALL enforce size limits at the file upload stage before processing.

### Maximum Attachments per Post

WHEN a user creates a post, THE system SHALL allow a maximum of 5 file attachments.

WHEN a user creates a post, THE system SHALL allow a maximum of 3 image attachments.

THE system SHALL combine image and file attachments into a single limit of 5 total items.

IF a user attempts to upload 6 attachments, THEN THE system SHALL display error: "Maximum 5 attachments allowed per post."

### File Types Allowed

### Accepted File Extensions

THE system SHALL accept the following file extensions:
- Images: .jpg, .jpeg, .png, .gif, .webp
- Documents: .pdf, .doc, .docx, .txt, .md
- Spreadsheets: .xls, .xlsx
- Archives: .zip, .rar

### Accepted MIME Types

THE system SHALL validate uploads using MIME type detection in addition to file extension.

IF a file has an allowed extension but forbidden MIME type, THEN THE system SHALL reject it with error: "Invalid file type. The file does not match its reported content."

THE system SHALL NOT accept executable files (.exe, .bat, .sh, .dll, .bin, .app) under any circumstances.

### Content Restrictions

### Prohibited Content Types

THE system SHALL prohibit posts containing:
- Links to phishing sites, malware distribution, or illegal content
- Personal identification information (PII) such as full home addresses, IDs, financial account numbers
- Hate speech targeting race, religion, gender, sexual orientation, or national origin
- Threats of violence against individuals or groups
- Non-consensual intimate imagery
- Child exploitation material

### Content Moderation Triggers

WHILE a post contains prohibited content, THE system SHALL automatically flag it for moderator review.

WHEN a post contains 3 or more external links, THE system SHALL automatically label it as "high-risk" and require moderator approval before public visibility.

WHEN a post includes file attachments and text content under 20 characters, THE system SHALL flag it for potential spam review.

### Posting Frequency

### Rate Limits

WHEN a user creates a new post, THE system SHALL limit posting to 5 posts per minute.

WHEN a user creates a new post within 10 seconds of their previous post, THE system SHALL display error: "Please wait 10 seconds between posts."

WHILE a user has been restricted due to excessive posting, THE system SHALL deny all new post submissions until the cooldown period expires.

### Content Moderation

### Automated Moderation

THE system SHALL scan all new posts and attachments with automated content filters.

WHEN a post is flagged as high-risk by automated systems, THE system SHALL:
- Hide the post from public view
- Notify the moderator dashboard
- Send user notification: "Your post is under review. It may appear once approved."

IF a post is flagged for prohibited content, THEN THE system SHALL:
- Immediately remove the post
- Record the violation in the user's moderation history
- Send user notification: "Your post was removed for violating our content policies."

### Manual Moderation

WHILE a post is pending moderator review, THE system SHALL display: "Awaiting moderator approval" to all users except the author and moderators.

WHEN a moderator approves a flagged post, THE system SHALL make it visible to all users.

WHEN a moderator rejects a flagged post, THE system SHALL delete it permanently and notify the user.

### Publishing Workflow

### Post Submission Process

WHEN a citizen submits a post with attachments, THE system SHALL:
- Validate file types and sizes
- Check attachment count against limits
- Scan for prohibited keywords and links
- Apply posting frequency rules
- If all checks pass, store the post as "draft"
- If any check fails, return specific error message

### Visibility Rules

THE system SHALL treat all new posts by citizens as "pending moderation" by default.

WHERE a citizen has earned "trusted user" status (10+ approved posts with no violations), THE system SHALL allow their posts to publish immediately.

WHERE a post has been flagged by 3 or more users, THEN THE system SHALL automatically hide the post and trigger moderator review.

### User Consequences

### Violation Tracking

THE system SHALL maintain a moderation history per user account.

WHEN a user accumulates 3 documented violations, THEN THE system SHALL temporarily suspend their posting privileges for 7 days.

WHEN a user accumulates 5 documented violations, THEN THE system SHALL permanently ban their account.

### Appeal Process

WHEN a user's post is removed or account is suspended, THE system SHALL provide an "Appeal" button on the notification.

WHEN an appeal is submitted, THE system SHALL:
- Notify the moderation team
- Freeze the user's posting privileges
- Assign appeal to a senior moderator for review
- Notify the user of final decision within 48 hours

### Enforcement Logic Summary

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

### Error Messages

### Upload Failures

- IF file size exceeds limit, THEN THE system SHALL show: "File exceeds 10 MB limit. Please compress or reduce resolution."
- IF file type not allowed, THEN THE system SHALL show: "File type not permitted. Use JPG, PNG, PDF, TXT, or ZIP only."
- IF attachment limit exceeded, THEN THE system SHALL show: "Maximum 5 attachments per post. Remove one to add another."
- IF posting too frequently, THEN THE system SHALL show: "Please wait 10 seconds before posting again."
- IF content flagged as prohibited, THEN THE system SHALL show: "Your post contains restricted content and cannot be published."

### System-Level Errors

- IF server error occurs during upload, THEN THE system SHALL display: "Upload failed. Please try again. If problem persists, contact support."
- IF storage space unavailable, THEN THE system SHALL display: "Upload temporarily unavailable. Please try again later."

## Commenting System

### Post Comments

THE discussionBoard SHALL allow every authenticated citizen to post comments on any article or existing comment.

WHEN a citizen submits a comment, THE system SHALL display it publicly under the associated post after immediate publication.

WHEN a comment is submitted, THE system SHALL record the author's username, timestamp, and content.

WHILE the comment is visible, THE system SHALL permit citizens to view, like, or report the comment.

### Reply Chains

WHEN a citizen replies to an existing comment, THE system SHALL display the reply as a nested child under the original comment.

THE system SHALL support reply chains up to 5 levels deep without collapsing.

THE system SHALL display the hierarchy of replies visually through indentation and thread markers, with each level indented further.

WHEN a citizen clicks on "View Thread", THE system SHALL expand all replies in the chain up to level 5.

### Comment Moderation

WHEN a citizen reports a comment for violation of rules, THE system SHALL flag it for moderator review.

WHEN a moderator flags a comment as inappropriate, THE system SHALL mark it as "Moderated" and display a notice: "This comment has been removed by a moderator."

THE system SHALL prevent all users from viewing the content of a moderated comment, but SHALL allow them to see that it was removed and by whom.

WHEN a moderator flags a comment as "Spam", THE system SHALL prevent the author from posting further comments for 24 hours.

### Comment Deletion

WHEN a citizen deletes their own comment, THE system SHALL hide the comment from public view, but SHALL retain it for moderation audit purposes.

WHEN a moderator deletes a comment, THE system SHALL hide the comment from public view, and SHALL retain it for moderation audit purposes.

WHEN a comment is deleted, THE system SHALL NOT delete associated replies, but SHALL change their parent reference to "[deleted]".

THE system SHALL display "[deleted]" in place of content for deleted comments, with the username and timestamp still visible.

### Notification System

WHEN a user receives a reply to their comment, THE system SHALL send a notification to their account dashboard.

WHEN a user is mentioned in a comment using the format @username, THE system SHALL send a notification to that user's dashboard.

WHEN a user reports a comment, THE system SHALL notify the post author and moderator of the report.

WHILE a comment is active, THE system SHALL allow citizens to turn on or off notifications for replies to their own posts.

WHILE a citizen is logged in, THE system SHALL display unread notification count as a badge on the notification icon.

### Reporting & Transparency

WHEN a comment is reported, THE system SHALL show the reporter's reason (selected from predefined options) to moderators.

WHEN a comment is moderated, THE system SHALL show the moderator's actions (rejected, hidden, warned) in a moderation log visible only to moderators.

THE system SHALL not reveal the identity of users who report comments to the comment author or other users.

### Performance Expectations

WHEN a user loads a post with 100+ comments, THE system SHALL load the top 20 comments immediately and load additional comments in batches of 20 as the user scrolls.

WHEN a user submits a comment, THE system SHALL show a success message and update the display within 2 seconds.

WHEN a user expands a reply thread, THE system SHALL load the next level of replies within 1.5 seconds.

### Error Handling

IF a comment exceeds 5,000 characters, THEN THE system SHALL reject the submission and show: "Comment too long. Maximum length is 5,000 characters."

IF a comment contains only whitespace or symbols, THEN THE system SHALL reject the submission and show: "Comment cannot be empty or consist only of symbols."

IF a user tries to reply to a deleted comment, THEN THE system SHALL show: "This comment has been removed. You cannot reply to it."

IF the user is not logged in and attempts to comment, THEN THE system SHALL show: "You must be logged in to comment. Please sign in or register."

IF the comment submission server fails, THEN THE system SHALL show: "Comment could not be saved. Please try again."

### Compatibility Restrictions

WHERE a user is using a mobile device, THE system SHALL display a simplified comment interface with touch-optimized buttons and condensed reply threads.

WHERE a user has enabled "Dark Mode", THE system SHALL display comments with dark background and light text.

WHERE a user has disabled notifications, THE system SHALL NOT send any comment-related alerts to their device or email.

## Performance Requirements

### Page Load Speed

WHEN a user navigates to the discussion board homepage, THE system SHALL load all visible posts and metadata in under 1.5 seconds.

WHEN a user opens an individual article page, THE system SHALL render the full content, including embedded images, in under 2 seconds.

WHILE a user scrolls through the post list, THE system SHALL load additional posts in batches without perceptible delay (less than 300ms between scroll trigger and new content appearance).

### Media Upload Speed

WHEN a citizen uploads an image file (JPEG, PNG, GIF), THE system SHALL provide upload progress feedback and complete the upload within 5 seconds for files up to 5MB.

WHEN a citizen uploads a file attachment (PDF, DOCX, TXT, ZIP), THE system SHALL provide upload progress feedback and complete the upload within 10 seconds for files up to 10MB.

IF an upload exceeds the file size limit, THEN THE system SHALL reject the upload immediately and display a clear message specifying maximum allowed size.

IF an image file exceeds 5MB or non-image file exceeds 10MB, THEN THE system SHALL cancel the upload and notify the user with a standardized error message.

### Search Response Time

WHEN a user submits a search term in the global search box, THE system SHALL return matching posts within 1 second.

WHILE a user types in the search field, THE system SHALL debounce input and display results only after a pause of 300ms with no additional typing.

WHERE search results exceed 100 items, THE system SHALL display "Showing first 100 of N results" to manage user expectations.

### Platform Availability

THE system SHALL be available 99.5% of the time, calculated over 30-day rolling periods.

WHILE the system is undergoing scheduled maintenance, THE system SHALL display a maintenance banner to all users with estimated downtime duration.

IF the system experiences unexpected downtime, THEN THE system SHALL return HTTP 503 with a user-friendly message: "The discussion board is temporarily unavailable. Please try again in a few minutes." and log the incident for review by moderators.

THE system SHALL maintain read accessibility during partial service degradation (e.g., search or upload may be unavailable, but post viewing remains functional).