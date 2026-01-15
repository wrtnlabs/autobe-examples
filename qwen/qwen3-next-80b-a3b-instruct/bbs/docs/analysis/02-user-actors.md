# Economic/Political Discussion Board Requirements

## Service Vision

This is a minimalist economic and political discussion board designed for civil discourse among citizens and moderators. Unlike existing forums that are cluttered with ads, social media integration, and complex moderation tools, this platform prioritizes clean, focused conversation with essential features only. The board is not a social network—it is a public square for ideas.

The core value proposition is simplicity with integrity. Users come to read and contribute high-signal content without distraction. The system enables authentic dialogue around economic policies, political decisions, and civic issues while preventing abuse through transparent, human-driven moderation.

Target audience includes engaged citizens, students, policy analysts, journalists, and community organizers who seek substantive discussion without algorithmic manipulation or commercial interference.

No registration is forced. All users may browse content as guests. Only registered users may post or comment. This encourages participation while limiting spam.

## Core Features

### Post Creation

WHEN a user visits the homepage, THEY SHALL see a list of recent posts organized chronologically, with the most recent at the top.

WHEN a user clicks "New Post", THE system SHALL present a form with:

- A title field (required, 3–120 characters)
- A body field (required, 10–10,000 characters)
- An "Attach Image" button
- An "Attach File" button
- A "Publish" button

WHEN the user fills the title and body fields and clicks "Publish", THE system SHALL:

- Validate that all required fields are completed
- Validate character limits against posted content
- Check if user is logged in (if not, redirect to login with return URL preserved)
- Save the post immediately to the database with a unique ID and timestamp
- Return the user to the post view page upon successful creation

WHEN a user attempts to submit a blank title or body, THE system SHALL display an inline error below each field and prevent submission until corrected.

### Image and File Attachments

WHEN a user clicks "Attach Image", THE system SHALL open a file browser allowing selection of one image file from their device.

WHEN a user clicks "Attach File", THE system SHALL open a file browser allowing selection of one document file from their device.

WHEN a file is selected:

- THE system SHALL validate the file type (see Business Rules)
- THE system SHALL validate the file size (see Business Rules)
- THE system SHALL display a preview thumbnail for images
- THE system SHALL display the filename and size for documents
- THE system SHALL disable the "Publish" button if attachments exceed limits
- THE system SHALL allow file removal before publishing

WHEN a post is published with attachments:

- THE system SHALL store the file securely in cloud storage
- THE system SHALL generate a unique, non-guessable URL for access
- THE system SHALL embed the image directly in the post body (inline)
- THE system SHALL provide a download link for documents using the file name
- THE system SHALL not store the file on the application server

WHEN a user views a published post:

- THE system SHALL render attached images in place, scaled to 80% of the content width, with full-size zoom capability
- THE system SHALL display attached documents with a download button and icon
- THE system SHALL display file size and format next to each attachment
- THE system SHALL not allow dragging, copying, or embedding images from other sites

### Commenting System

WHEN a user clicks the "Comment" button on a post:

- THE system SHALL display a text field beneath the post
- THE system SHALL show the current number of comments visible to the user
- THE system SHALL allow typing up to 1,500 characters in the comment field
- THE system SHALL provide a "Submit" button

WHEN a user submits a comment:

- THE system SHALL validate the comment length
- THE system SHALL ensure the user is logged in
- THE system SHALL assign the comment to the post using the post ID
- THE system SHALL timestamp the comment at server time (Asia/Seoul)
- THE system SHALL display the comment immediately under the post with the user’s display name and avatar
- THE system SHALL allow reply to any comment

WHEN a user replies to a comment:

- THE system SHALL indent the reply visually 1 level deeper
- THE system SHALL display the parent comment reference in the reply header
- THE system SHALL allow nesting up to 3 levels deep
- THE system SHALL not allow replies to comments older than 30 days
- THE system SHALL limit reply speed to one comment per 3 seconds

WHEN a comment is reported:

- THE system SHALL hide the comment from public view immediately
- THE system SHALL notify a moderator with a timestamp and original content
- THE system SHALL preserve the comment for review in the moderation queue
- THE system SHALL notify the poster that their comment has been flagged for review
- THE system SHALL not delete the comment until a moderator takes action

### Content Visibility

WHEN a user visits the site as a guest:

- THE system SHALL display all public posts
- THE system SHALL display all public comments
- THE system SHALL NOT display any user information beyond display names
- THE system SHALL NOT allow posting, commenting, liking, or reporting
- THE system SHALL display a "Sign In" button in the header

WHEN a user logs in as a citizen:

- THE system SHALL enable posting, commenting, and reporting
- THE system SHALL display their display name and avatar
- THE system SHALL allow editing of their own posts within 24 hours of creation
- THE system SHALL allow deletion of their own posts at any time
- THE system SHALL display "Edit" and "Delete" buttons only on their own content

WHEN a user logs in as a moderator:

- THE system SHALL display all capabilities of a citizen
- THE system SHALL display "Edit", "Delete", "Pin", "Lock", and "Report Review" tools on all content
- THE system SHALL see all flagged content regardless of status
- THE system SHALL be able to see who reported content and why
- THE system SHALL see a "Moderation Tools" panel in the post controls

## Business Rules

### Attachment Limits

WHEN a user submits a post:

- THE system SHALL allow at most one image file attachment
- THE system SHALL allow at most one document file attachment
- THE system SHALL reject posts with zero or more than one file attachment of any type

### File Types Allowed

WHEN a file is uploaded:

- THE system SHALL accept the following image formats: JPG, JPEG, PNG, GIF
- THE system SHALL accept the following document formats: PDF, DOC, DOCX, TXT
- THE system SHALL reject all other file types including:
  - Executables (.exe, .bin, .bat, .msi)
  - Compressed archives (.zip, .rar, .tar, .7z)
  - Scripts (.js, .py, .sh)
  - Media files (.mp4, .mp3, .mkv)
  - System files (.dll, .sys, .ini)

### File Size Limits

WHEN a file is uploaded:

- THE system SHALL allow maximum file size of 10 MB for all attachments
- THE system SHALL reject files larger than 10 MB with a user-friendly message
- THE system SHALL validate file size before upload begins using client-side file API check
- THE system SHALL not initiate server upload for files exceeding 10 MB

### Posting Frequency

WHEN a user attempts to create a new post:

- THE system SHALL allow maximum 5 posts per hour per user
- THE system SHALL track post timestamps from all sessions on the same account
- THE system SHALL return an error message: "You can only post 5 times per hour. Please wait before trying again."
- THE system SHALL allow users to draft posts offline, but the counter resets only on publishing
- THE system SHALL not limit guest browsing or commenting, only posting

### Content Restrictions

WHEN a user submits a post or comment:

- THE system SHALL block content containing any of the following (case-insensitive):
  - Direct threats of violence against individuals or groups
  - Incitements to racial, religious, ethnic, gender, or sexual orientation hatred
  - Harassment or doxxing of private individuals
  - Personal identifying information (phone numbers, physical addresses, SSN)
  - Child exploitation material (as defined by international law)
  - Non-consensual intimate imagery

- THE system SHALL use keyword matching, context analysis, and user report triggers to identify violations
- THE system SHALL automatically flag suspected violations for moderator review
- THE system SHALL NOT delete content automatically—moderator action is required
- THE system SHALL store flagged content for 90 days for audit

## User Journey

### Step 1: Login/Register

WHEN a user arrives at the site for the first time:

- THE system SHALL display a welcome banner and featured posts
- THE system SHALL display a prominent "Sign In" button in the top-right

WHEN a user clicks "Sign In":

- THE system SHALL display a modal with "Email" and "Password" fields
- THE system SHALL provide a "Log In" button
- THE system SHALL provide a "Create Account" link

WHEN a user clicks "Create Account":

- THE system SHALL display a registration form with:
  - Email address (required)
  - Password (required, minimum 8 characters)
  - Confirm password (required)
- THE system SHALL validate password match
- THE system SHALL validate email format
- THE system SHALL send a verification email to the provided address
- THE system SHALL present a confirmation: "Check your email to activate your account."

WHEN a user clicks the verification link in their email:

- THE system SHALL validate the token
- THE system SHALL mark the account as active
- THE system SHALL redirect to the homepage with a success message
- THE system SHALL log the user in automatically

### Step 2: Compose New Post

WHEN a logged-in user wants to contribute:

- THE system SHALL display a "New Post" button in the header
- THE system SHALL allow access to a rich-text editor with basic formatting (bold, italics, links)
- THE system SHALL prevent HTML injection and sanitize output
- THE system SHALL auto-save drafts locally every 30 seconds
- THE system SHALL show draft count in the header

WHEN the user fills the post:

- THE system SHALL validate input lengths in real time
- THE system SHALL show a character counter
- THE system SHALL disable "Publish" until all fields are valid

### Step 3: Add Attachments

WHEN the user clicks "Attach Image":

- THE system SHALL open system file picker
- THE system SHALL limit selection to image files only (via accept attribute)
- THE system SHALL preview thumbnail if file is image
- THE system SHALL show file name and size
- THE system SHALL disable "Publish" if file exceeds 10 MB

WHEN the user clicks "Attach File":

- THE system SHALL open system file picker
- THE system SHALL limit selection to supported doc formats only
- THE system SHALL show filename and size
- THE system SHALL disable "Publish" if file exceeds 10 MB or is unsupported

### Step 4: Publish

WHEN the user clicks "Publish":

- THE system SHALL send POST request to /api/posts with:
  - title
  - body
  - image attachment (if any)
  - document attachment (if any)
- THE system SHALL validate all fields server-side (double-check)
- THE system SHALL validate file types and sizes server-side
- THE system SHALL validate posting frequency rate limit server-side
- THE system SHALL validate content restrictions using backend filters
- THE system SHALL return:
  - Success: 201 Created with new post URL
  - Validation error: 400 with field-specific messages
  - Rate limit: 429 Too Many Requests
  - Blocking content: 403 Forbidden with reason

WHEN successful:

- THE system SHALL redirect user to the new post URL
- THE system SHALL clear draft from local storage
- THE system SHALL increment post count

### Step 5: View Published Post

WHEN a user accesses a published post URL:

- THE system SHALL fetch the post content from database
- THE system SHALL render the title, body, and embedded image
- THE system SHALL display the author's display name and posting time
- THE system SHALL render all comments in chronological order
- THE system SHALL display download links for documents
- THE system SHALL show the like count and report button
- THE system SHALL show "Edit" and "Delete" buttons only to the owner
- THE system SHALL display a "Reply" button only to logged-in users
- THE system SHALL not show moderator tools unless the user has moderator role

## Moderation System

### User Reporting

WHEN a user sees inappropriate content:

- THE system SHALL display a "Report" button next to every post and comment
- THE system SHALL present a modal with:
  - "Select reason" dropdown:
    - Hate speech
    - Threats
    - Harassment
    - Spam
    - False information
    - Other
  - Optional comment field
  - "Submit Report" button
- THE system SHALL send report metadata to moderation queue
- THE system SHALL immediately hide the content from public view
- THE system SHALL assign a unique report ID and timestamp
- THE system SHALL store reporter's user ID (if authenticated) and IP address

### Moderator Review

WHEN a moderator logs in:

- THE system SHALL display a "Moderation Queue" link in the header
- THE system SHALL display a list of all reported items with:
  - Original content
  - Reason selected
  - Reporter’s display name
  - Timestamp
  - Reported item URL
- THE system SHALL allow sorting by timestamp, type, or priority
- THE system SHALL show a "Review" button for each item

WHEN a moderator clicks "Review":

- THE system SHALL show full context of the post, including all comments
- THE system SHALL present three action buttons:
  - "Approve" (restore public visibility)
  - "Remove" (delete permanently)
  - "Warn User" (send notification to poster)
- THE system SHALL require a moderator comment for every action
- THE system SHALL log the action, moderator, and timestamp
- THE system SHALL notify the original poster if the content was removed or warned

### Content Removal

WHEN a moderator selects "Remove":

- THE system SHALL permanently delete the post or comment from public access
- THE system SHALL preserve the content in encrypted archive for 1 year for legal compliance
- THE system SHALL NOT delete the user account
- THE system SHALL update the report status to "Removed" and link to moderator action
- THE system SHALL prevent restoration unless an appeal is granted

### Appeals Process

WHEN a user’s content is removed:

- THE system SHALL send an email notification: "Your post has been removed for violating community standards. You may appeal this decision within 7 days."
- THE system SHALL include a link to an appeal form

WHEN a user submits an appeal:

- THE system SHALL present a form for explanation
- THE system SHALL attach the original content and report details
- THE system SHALL submit to a secondary review panel of two senior moderators
- THE system SHALL respond within 72 hours with: Accepted, Rejected, or Pending additional info
- THE system SHALL notify the user via email and in-app notification

### Account Suspension

WHEN a user receives three content removals within 6 months:

- THE system SHALL automatically trigger a 30-day suspension
- THE system SHALL lock the account from posting, commenting, or editing
- THE system SHALL send an email: "Your account has been suspended for 30 days due to repeated violations."

WHEN a user receives five removals:

- THE system SHALL trigger permanent ban with no appeal option
- THE system SHALL send final email: "Your account has been permanently banned. We cannot restore access."

WHEN a moderator initiates suspension:

- THE system SHALL allow moderator to select duration:
  - 1 day
  - 7 days
  - 30 days
  - Permanent
- THE system SHALL require moderator justification
- THE system SHALL send notification to user with reason and duration

## Performance Requirements

### Page Load Speed

WHEN a user opens a post or homepage:

- THE system SHALL complete initial page display in under 1.5 seconds (on 4G connection)
- THE system SHALL render text content before images finish loading
- THE system SHALL load comments lazily after the main post
- THE system SHALL serve static assets via CDN with 1-year cache headers
- THE system SHALL optimize image delivery with responsive sizing

### Media Upload Speed

WHEN a user uploads a 10 MB file:

- THE system SHALL complete upload within 30 seconds on average 10 Mbps connection
- THE system SHALL show real-time upload progress bar
- THE system SHALL allow upload resumption after temporary network loss
- THE system SHALL prevent multiple concurrent uploads from the same user

### Search Response Time

WHEN a user performs a keyword search:

- THE system SHALL return results within 1 second for up to 500 matching posts
- THE system SHALL support partial word matching
- THE system SHALL return results sorted by relevance and recency
- THE system SHALL allow filtering by date range
- THE system SHALL not index comments in search unless explicitly requested

### Platform Availability

THE system SHALL be available 99.9% of the time monthly.

THE system SHALL have:

- Automated backup system
- Daily system health checks
- Real-time error alerting
- Multi-region server replication (if applicable)

## Compliance

### Data Retention

WHEN posts are deleted:

- THE system SHALL remove them from active database within 24 hours
- THE system SHALL preserve full content (including attachments) in cold storage for 1 year
- THE system SHALL permanently erase data after 1 year unless legally required to retain longer

WHEN user accounts are deactivated:

- THE system SHALL anonymize all attributed content (replace name with "Deleted User")
- THE system SHALL retain post history in anonymized state for 1 year

### Privacy Policy

WHEN a user registers:

- THE system SHALL require explicit opt-in to privacy policy and terms of service
- THE system SHALL NOT collect or store IP addresses beyond what is required for security
- THE system SHALL NOT sell user data to third parties
- THE system SHALL NOT track user behavior across external sites
- THE system SHALL NOT use cookies for advertising purposes

WHEN a moderator accesses user data:

- THE system SHALL log all data access events (timestamp, operator, resource)
- THE system SHALL restrict access to moderators’ own reports only
- THE system SHALL require 2FA for moderators accessing user IPs or emails

### Content Archiving

WHEN moderators remove content:

- THE system SHALL store complete copies (text + attachments) in secure audit log
- THE system SHALL encrypt audit logs with AES-256
- THE system SHALL restrict audit log access to system administrators only
- THE system SHALL allow export of data for legal requests with court order

### Legal Compliance

THE system SHALL:

- Comply with GDPR and other international data protection laws
- Enable users to download their data (posts, comments, report history)
- Enable users to delete their account and all associated data
- Report illegal content to authorities as required by law
- Implement child safety filters as required by international law

## Error Handling

### Upload Failure

WHEN an upload fails:

- THE system SHALL display a red error banner: "Upload failed. Please check file type and size."
- THE system SHALL preserve the draft content
- THE system SHALL log the failure, file type, size, and user ID
- THE system SHALL allow user to retry without losing their text

### Authentication Failure

WHEN a login fails:

- THE system SHALL display: "Incorrect email or password."
- THE system SHALL NOT indicate if email exists
- THE system SHALL lock the account after 5 failed attempts for 15 minutes
- THE system SHALL record IP address and timestamp

### Server Errors

WHEN an internal server error occurs:

- THE system SHALL return HTTP 500
- THE system SHALL display: "Something went wrong. Please try again later."
- THE system SHALL NOT expose stack traces or internal data
- THE system SHALL log the error with context for debugging

### Media Corruption

WHEN an uploaded image is not valid:

- THE system SHALL reject it with: "This image file is corrupted or incomplete."
- THE system SHALL validate file header (magic number) and structure
- THE system SHALL not attempt to render or store malformed files

### File Format Rejection

WHEN a user uploads an unsupported file:

- THE system SHALL display: "File type not allowed. Supported formats: JPG, PNG, GIF, PDF, DOC, DOCX, TXT."
- THE system SHALL prevent file selection for unsupported types where possible
- THE system SHALL log the attempt and file name

> *Developer note: This document defines business requirements only. All technical implementation (API schemas, database structure, cloud architecture, authentication flow) is at the discretion of the development team. This document is implementation-ready for NestJS, Prisma, and TypeScript backend systems.