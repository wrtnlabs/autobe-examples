# Economic/Political Discussion Board

## Service Overview

The Economic/Political Discussion Board is a simple platform that enables citizens to engage in public discourse on economic and political topics. The system supports posting textual content with attached images and files to facilitate richer discussion. This service is designed for straightforward, anonymous participation without complex features like user profiles, likes, or social networks. All interactions are centered around content, enabling open dialogue between users without identity-based social pressures.

The platform serves as a public forum where ideas can be shared, challenged, and built upon using the power of written argument. The focus remains on content quality rather than user popularity, minimizing gamification elements that distract from substantive debate.

## User Actors

### Citizen Actor
A citizen is any registered user who can create posts and comments, attach files and images to their content, and participate in public discussion. Citizens are the primary users of the system and the foundation of the community.

- Must create an account with a valid email address to post
- Can edit their own posts for a 5-minute window after publishing
- Can comment on any public post
- Can attach one image (up to 5 MB) and one file (up to 10 MB) per post
- Cannot delete posts after the 5-minute edit window
- Cannot moderate content or other users

### Moderator Actor
Moderators are trusted citizens appointed by system administrators to uphold community standards. Moderators manage violations and maintain platform integrity.

- All citizen privileges
- Can report posts or comments for review
- Can view all reported content in the moderation queue
- Can remove content that violates rules
- Can suspend users for repeated violations
- Cannot edit or delete posts by other users unless they violate moderation policies
- Cannot modify other moderators' actions

## Core Features

### Post Creation
When a citizen wants to share an opinion or analysis:

WHEN a citizen selects "New Post", THE system SHALL display a form with:
- A text field for the post body (maximum 5,000 characters)
- An upload button for images
- An upload button for files
- A "Publish" button

WHEN a citizen clicks "Publish", THE system SHALL validate the post:
- POST SHALL contain at least 10 characters of text
- AT MOST one image AND one file may be attached
- ATTACHMENTS SHALL be within size limits
- ATTACHMENTS SHALL use allowed file extensions

IF validation fails, THEN THE system SHALL display specific error messages and prevent publication.

IF validation succeeds, THEN THE system SHALL save the post with:
- Timestamp of creation
- UID of the citizen
- Attached image metadata
- Attached file metadata
- Visibility status: "public"

### Image and File Attachments
Citizens may attach one image and one file to each post.

#### Image Attachment Requirements
WHEN a citizen uploads an image file:
- THE system SHALL accept only JPG, PNG, and GIF formats
- THE system SHALL reject any file exceeding 5 MB in size
- THE system SHALL validate that the file is a valid image using MIME type checking
- THE system SHALL generate a thumbnail for preview display

WHEN an image upload fails due to size or format:
- THE system SHALL display appropriate error messages
- THE system SHALL retain the citizen's draft text
- THE system SHALL allow the citizen to retry the upload

The image SHALL be stored with original filename, size, MIME type, attachment ID, and upload timestamp.

#### File Attachment Requirements
WHEN a citizen uploads a non-image file:
- THE system SHALL accept PDF, DOC, TXT, RTF, MD, ZIP (compressed documents), and CSV formats
- THE system SHALL reject any file exceeding 10 MB in size
- THE system SHALL scan uploaded files for known malware signatures
- THE system SHALL restrict executable extensions (.exe, .bat, .js, .dll, .py, .app)

WHEN a file upload fails due to size, format, or security scanning:
- THE system SHALL display appropriate error messages
- THE system SHALL retain the citizen's draft text
- THE system SHALL allow the citizen to retry the upload

The file SHALL be stored with original filename, size, MIME type, attachment ID, and upload timestamp.

### Commenting System
Citizens may add comments to any public post.

WHEN a citizen clicks "Comment", THE system SHALL display a comment form below the post.

WHEN the citizen submits a comment:
- THE system SHALL validate the comment contains at least 5 characters
- THE system SHALL associate the comment with the post and the citizen
- THE system SHALL timestamp the comment
- THE system SHALL immediately display the comment under the post

Users may reply to comments, creating threaded discussions.

WHEN a citizen clicks "Reply" on a comment:
- THE system SHALL nest the new comment under the original comment
- THE system SHALL indicate the reply relationship visually
- THE system SHALL allow up to 3 levels of nested replies
- THE system SHALL ensure reply threads do not exceed 20 comments (to prevent extreme nesting)

### Content Visibility
All posts and comments are public by default.

WHEN a post or comment is created, THE system SHALL assign a "public" visibility tag.

WHEN a post or comment is moderated and removed, THE system SHALL:
- Hide the content from public view
- Replace it with: "This content has been removed by a moderator for violating community guidelines."
- Preserve the content in a non-public archive
- Log the moderator action and timestamp

## Business Rules

### Attachment Limits
WHEN a citizen attempts to upload attachments:
- THE system SHALL allow exactly one image per post (maximum 5 MB)
- THE system SHALL allow exactly one file per post (maximum 10 MB)
- THE system SHALL not allow multiple images or multiple files
- THE system SHALL reject uploads that exceed total size limits

### Content Moderation
WHEN a post or comment is reported:
- THE system SHALL add it to a private moderation queue
- THE system SHALL notify all active moderators
- THE system SHALL display the last 100 characters of the content for quick review
- THE system SHALL log the reporter's ID (anonymized)

WHEN a moderator reviews a reported item:
- THE system SHALL display the full content, upload time, and reporter notes
- THE system SHALL offer "Dismiss", "Remove", or "Warn User" options
- THE system SHALL log the moderator's action and reason

### Posting Frequency
WHEN a citizen attempts to create a new post:
- THE system SHALL allow a maximum of 1 post per minute
- THE system SHALL calculate based on the last successful post timestamp
- THE system SHALL display "Please wait 15 seconds before posting again" if limit is exceeded
- THE system SHALL allow unlimited commenting

### File Types Allowed
The following file extensions are permitted:
- Images: .jpg, .jpeg, .png, .gif
- Documents: .pdf, .doc, .docx, .txt, .rtf, .md, .csv
- Archives: .zip (for compressed documents only)

The following file extensions are strictly prohibited:
- .exe, .bat, .cmd, .js, .vbs, .dll, .sys, .app, .com, .msi, .scr, .py, .jar, .pl

### Content Restrictions
The following types of content are strictly prohibited:
- Threats of violence or harassment
- Illegal activity instructions
- Nudity or sexually explicit material
- Hate speech based on race, religion, gender, or sexual orientation
- Spam or malware distribution attempts
- Impersonation of public figures or other users

The system SHALL not automatically detect these, but SHALL allow citizens to report them for moderator review.

## Moderation

### User Reporting
WHEN a citizen encounters objectionable content:
- THE system SHALL display a "Report" button next to each post and comment
- WHEN the citizen clicks "Report", THE system SHALL display a dropdown with options:
  - "Spam or irrelevant"
  - "Hate speech or discrimination"
  - "Threats or harassment"
  - "Violent content"
  - "Other"
- THE system SHALL allow optional comment field for additional context
- THE system SHALL submit the report anonymously to the moderation queue

### Moderator Review
WHEN a moderator accesses the moderation dashboard:
- THE system SHALL display a queue of reported items sorted by timestamp
- Each item SHALL show:
  - The reported content (first 200 characters)
  - Type of report
  - Time reported
  - Image/file attachments if present
  - Post or comment origin
  - Reporter ID (anonymized)

WHEN a moderator reviews an item:
- THE system SHALL display the full content and all attachments
- THE system SHALL allow moderator to view the user's past 5 posts
- THE system SHALL provide "Dismiss" (no action), "Remove" (delete), or "Warn User" options
- THE system SHALL require moderator to select a reason for action: "Policy Violation", "False Report", "System Bug"

### Content Removal
WHEN a moderator selects "Remove":
- THE system SHALL hide the content from all public views
- THE system SHALL replace it with: "This content has been removed by a moderator for violating community guidelines."
- THE system SHALL preserve a complete copy in a non-public audit log
- THE system SHALL log the moderator's identity, action, timestamp, and reason

### Appeals Process
WHEN a citizen's content is removed:
- THE system SHALL keep a record of the appeal eligibility
- THE system SHALL display: "Your content was removed. You have 7 days to appeal this decision."
- WHEN a citizen clicks "Appeal", THE system SHALL require a 50+ character explanation
- THE system SHALL send the appeal to the moderators for re-review
- THE system SHALL notify the original moderator and a secondary moderator
- THE system SHALL allow moderators to "Uphold" or "Reverse" the decision

### Account Suspension
WHEN a citizen has their content removed three times:
- THE system SHALL temporarily suspend their account for 7 days
- THE system SHALL display: "Your account has been suspended for violating our guidelines. You will be reinstated on [date]."
- THE system SHALL prevent the user from logging in or posting during suspension
- AFTER suspension expires, THE system SHALL automatically restore account access
- WHEN a citizen is suspended a second time, THE system SHALL permanently ban their account

## Performance Requirements

### Page Load Speed
WHEN a citizen loads the main discussion feed:
- THE system SHALL fully render the page with 50 posts and their comments in under 2 seconds
- THE system SHALL display placeholder content during loading
- THE system SHALL prioritize Network Priority: text content > thumbnails > file icons

### Media Upload Speed
WHEN a citizen uploads an image or file:
- THE system SHALL complete upload and validation within 10 seconds for files under 10 MB
- THE system SHALL provide a visual progress indicator
- THE system SHALL retry once automatically on network interruption

### Search Response Time
WHEN a citizen submits a search query:
- THE system SHALL return results in under 1.5 seconds
- THE system SHALL search only published posts
- THE system SHALL match exact or partial text (case-insensitive)
- THE system SHALL not search comments

### Platform Availability
- THE system SHALL have 99.5% uptime
- THE system SHALL alert system administrators of any downtime exceeding 5 minutes
- THE system SHALL display "System under maintenance" during scheduled updates

## Compliance

### Data Retention
WHEN a post is created:
- THE system SHALL retain the post and all its comments indefinitely
- WHEN a post is removed by a moderator:
  - THE system SHALL preserve it, attachments, metadata, and moderation log in a compliance archive
  - THE system SHALL not permit deletion from the compliance archive
- WHEN a user account is permanently banned:
  - THE system SHALL anonymize the user ID in all associated content
  - THE system SHALL retain all co-removal evidence and moderation history

### Privacy Policy
- THE system SHALL NOT collect or store IP addresses after post creation
- THE system SHALL NOT link users to personal identifiers beyond email for registration
- THE system SHALL NOT sell user data or share it with third parties
- THE system SHALL allow citizens to request deletion of their account and associated posts

### Content Archiving
THE system SHALL maintain a backup of the entire platform content:
- Daily incremental backups for the past 30 days
- Weekly full backups for the past 12 months
- Monthly full backups for years 2–5

These backups SHALL be stored separately from the operational system and SHALL be encrypted.

### Legal Compliance
- THE system SHALL comply with all applicable free speech protections
- THE system SHALL not engage in automated content filtering
- THE system SHALL provide transparency in moderation decisions
- THE system SHALL provide a paper trail for moderator actions as required by law

### User Consent
WHEN a citizen registers:
- THE system SHALL present a 300-word summary of the Privacy Policy and Community Guidelines
- THE system SHALL require the citizen to click "I Agree" to proceed
- THE system SHALL record timestamp of consent
- THE system SHALL make the full policy text accessible via link at any time

## Error Handling

### Image Upload Failure
WHEN a citizen attempts to upload an image file larger than 5 MB, THE system SHALL display "File too large. Maximum size is 5 MB." and cancel the upload.

WHEN a citizen attempts to upload an image file in an unsupported format (e.g., .psd, .bmp, .tiff), THE system SHALL display "Unsupported file type. Please use JPG, PNG, or GIF." and cancel the upload.

WHILE the image upload is in progress, THE system SHALL display a progress bar showing percentage completed.

IF an image upload fails after 30 seconds of attempting, THEN THE system SHALL display "Upload failed. Please check your connection and try again." and allow the citizen to retry.

### File Upload Failure
WHEN a citizen attempts to upload a non-image file larger than 10 MB, THE system SHALL display "File too large. Maximum size is 10 MB." and cancel the upload.

WHEN a citizen attempts to upload a file with a restricted extension (e.g., .exe, .bat, .js, .zip, .rar), THE system SHALL display "File type not allowed. Only documents, PDFs, and image files are permitted." and cancel the upload.

WHEN the server is unable to accept the uploaded file due to storage limits, THE system SHALL display "Storage capacity reached. Please try again later." and prevent further uploads until capacity is restored.

### Authentication Failure

### Login Failure
WHEN a citizen enters an invalid email address during login, THE system SHALL display "Email address not recognized. Please check your email and try again." and keep the login form open.

WHEN a citizen enters an incorrect password, THE system SHALL display "Incorrect password. Please try again." and keep the login form open.

WHEN a citizen enters an invalid email and password combination five times in a row, THE system SHALL display "Too many failed attempts. Please wait 15 minutes before trying again." and disable login for 15 minutes.

WHEN the system detects suspicious login activity (e.g., rapid attempts from multiple locations), THE system SHALL display "Security alert: Unusual login activity detected. Check your email for verification." and suspend login until email verification is completed.

### Registration Failure
WHEN a citizen attempts to register with an email address already in use, THE system SHALL display "This email is already registered. Please log in or use a different email." and keep the registration form open.

WHEN the system fails to send a verification email during registration, THE system SHALL display "We couldn't send your verification email. Please check your email address and try again." and pause the registration process until resolved.

WHEN a citizen's registration is blocked due to system policies (e.g., IP address blacklisting), THE system SHALL display "Registration denied. Contact support if you believe this is an error." and provide a link to contact support.

### Server Errors

### Temporary System Errors
WHEN the server experiences temporary overload or maintenance, THE system SHALL display "The system is temporarily unavailable. Please try again in a few minutes." and display a retry button.

WHEN API requests to the server fail due to connectivity issues, THE system SHALL display "Connection failed. Please check your internet connection and try again." and allow the citizen to retry the action.

### Media Corruption

#### Image Corruption Detection
WHEN an uploaded image file is determined to be corrupted or incomplete, THE system SHALL display "The uploaded image appears to be corrupted. Please try uploading again." and retain the upload form with the original image selected.

WHILE the system is validating uploaded images for corruption, THE system SHALL show "Analyzing image..." with a spinner indicator.

#### File Corruption Detection
WHEN an uploaded file is determined to be corrupted or invalid, THE system SHALL display "The uploaded file appears to be corrupted. Please try uploading again." and retain the upload form with the original file selected.

WHEN a previously uploaded file is found to be corrupted on the server, THE system SHALL display "This file is unavailable due to corruption. Contact a moderator if you need to re-upload." and hide the file from view.

### File Format Rejection

### Unauthorized File Extensions
WHERE a citizen attempts to upload a file with an unknown or prohibited extension (e.g., .pem, .key, .dll), THE system SHALL display "This file type cannot be uploaded for security reasons." and reject the upload.

### Non-Standard Extensions
WHERE a citizen attempts to upload a file with an uncommon extension (e.g., .docx, .xlsx, .pdf), THE system SHALL validate against the allowed list and only accept if permitted by rules defined in the business rules document.

### MIME Type Mismatch
IF the file extension does not match the actual file type (e.g., a .jpg file with image/png MIME type), THEN THE system SHALL display "The file type does not match its extension. Please upload a file with the correct extension." and reject the upload.

### User Interaction Feedback

### General Error Handling
WHERE a user encounters any error during interaction with the system, THE system SHALL ensure the error message is written in clear, non-technical language understandable to all citizens.

WHEN any error occurs, THE system SHALL maintain the user's current context (e.g., their draft post, selected files) so they can recover easily.

WHILE an error is displayed, THE system SHALL provide a "Retry" or "Help" button for immediate action.

WHEN an error prevents further action (e.g., login failure), THE system SHALL show clear instructions for resolution rather than simply stating "error."

### Uploading Media

#### Image Upload
A citizen who wants to attach an image:
1. Clicks "Choose Image" in the new post form
2. Selects an image file (JPG/PNG/GIF)
3. Waits for system to check size and type
4. Sees preview of the image
5. Clicks "Publish"
6. Sees "Uploading..." progress bar
7. Sees "Post published!" confirmation

#### File Upload
A citizen who wants to attach a file:
1. Clicks "Attach File" in the new post form
2. Selects a document file (PDF/DOC/TXT/etc.)
3. Waits for system to check size, type, and security
4. Sees file name and icon preview
5. Clicks "Publish"
6. Sees "Uploading..." progress bar
7. Sees "Post published!" confirmation

### Viewing Content
A citizen viewing a post:
1. Sees the text content
2. Sees attached image thumbnail (clickable to view full-size)
3. Sees attached file icon with name and size
4. Sees three buttons: "Comment", "Report", "Share"
5. Sees existing comments
6. Clicks "Comment" to add their response
7. Sees replies beneath comments

### Moderation Workflow
A moderator browsing reports:
1. Logs in with moderator privileges
2. Clicks "Moderation Queue"
3. Sees list of reported items (post/comment, reason, time)
4. Clicks "View" on one item
5. Sees full content + attachments
6. Notes the user's posting history if needed
7. Selects action: "Dismiss" / "Remove" / "Warn"
8. Enters reason for action
9. Submits
10. Sees "Action recorded" confirmation

### Account Suspension Workflow
A citizen receives a suspension:
1. Tries to post after three removals
2. Sees message: "Your account has been suspended for violating our guidelines. You will be reinstated on [date]."
3. Sees "Appeal Suspension" button
4. Clicks button
5. Types explanation (min 50 characters)
6. Submits
7. Sees "Appeal received. Review in progress."

A moderator reviews an appeal:
1. Sees notification of pending appeal
2. Clicks on appeal
3. Reviews original post and moderation history
4. Views citizen explanation
5. Makes decision: "Uphold" or "Reverse"
6. Adds comment
7. Submits
8. Citizen receives final notification

### Authentication Flow
External: Citizen → Browser
1. Clicks "Login"
2. Enters email and password
3. Clicks "Sign In"
4. Gets token from server
5. Token stored in localStorage
6. Automatic token refresh every hour

External: Citizen → Mobile App
1. Opens app
2. Clicks "Sign In"
3. Enters credentials
4. Receives 2FA prompt if suspicious
5. Authenticates
6. Gets session token
7. Token stored in secure storage
8. Auto-refreshes before expiration

User actor permissions matrix (simplified):

| Action                      | Citizen | Moderator |
|-----------------------------|---------|-----------|
| Create post                 | ✅       | ✅         |
| Edit own post (5-min window)| ✅       | ✅         |
| Attach image                | ✅       | ✅         |
| Attach file                 | ✅       | ✅         |
| Comment                     | ✅       | ✅         |
| Reply to comment            | ✅       | ✅         |
| View all posts              | ✅       | ✅         |
| Report post/comment         | ✅       | ✅         |
| Remove content              | ❌       | ✅         |
| Suspend user                | ❌       | ✅         |
| Appeal removal              | ✅       | ✅         |
| View moderation queue       | ❌       | ✅         |
| Manage user accounts        | ❌       | ✅         |

#### Authentication System
When a citizen logs in:

- THE system SHALL accept an email and password combination
- THE system SHALL validate against stored hashed credentials
- THE system SHALL reject login if account is suspended
- THE system SHALL issue a JWT access token valid for 1 hour
- THE system SHALL issue a refresh token valid for 30 days
- THE system SHALL store token in secure HTTP-only cookie (for web)
- THE system SHALL store token in secure local storage (for mobile)

When a token expires:
- THE system SHALL automatically use the refresh token to request a new access token
- THE system SHALL notify user if refresh token is invalid or expired
- THE system SHALL require re-login with credentials if refresh fails

When a citizen logs out:
- THE system SHALL delete the refresh token
- THE system SHALL delete the access token
- THE system SHALL invalidate the session on server

Moderators use the same authentication system as citizens — their role is determined by database permission flags, not a separate authentication mechanism.

The system SHALL NOT use OAuth or third-party login.

The system SHALL NOT support social login.

The system SHALL NOT store any biometric or two-factor information.

The system SHALL NOT track location or device fingerprints.

The system SHALL NOT show user profiles, avatars, or reputation scores.

Only email and pseudonym are stored as identity.

### User Journey: Posting Content

Step 1: Login/Register
WHEN a citizen visits the homepage:
- THE system SHALL display "Welcome" header
- THE system SHALL display "Sign In" and "Register" buttons

WHEN a citizen clicks "Sign In":
- THE system SHALL show a modal with email and password fields
- THE system SHALL provide "Forgot Password?" link

WHEN a citizen clicks "Register":
- THE system SHALL show a modal with email, password