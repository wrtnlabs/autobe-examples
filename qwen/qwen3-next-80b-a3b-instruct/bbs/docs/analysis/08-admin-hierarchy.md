# Economic/Political Discussion Board Requirements Specification

## Overview

This document defines the complete requirements for an Economic/Political Discussion Board system. The platform will enable users to engage in threaded discussions on economic and political topics with a comprehensive moderation and user management system. All functionality is designed for a web-based interface with RESTful API access.

## User Account Management

### Registration

WHEN a new user attempts to register, THE system SHALL require the following information:
- A valid email address (must contain @ and domain component)
- A password with minimum 8 characters including at least one uppercase letter, one lowercase letter, and one digit
- Email address shall be unique across the system

WHEN the registration request is received, THE system SHALL:
- Validate all required fields
- Check for email address uniqueness
- Hash the password using bcrypt with cost factor 12
- Create a new user record with default role = "user"
- Send a confirmation email with verification link (optional: can be skipped for MVP)
- Return a 201 Created response with user ID

IF validation fails, THE system SHALL return a 400 Bad Request with detailed error messages for each field violation.

### Login

WHEN a user attempts to log in with their email and password, THE system SHALL:
- Accept email and password as input parameters
- Locate the user record by email address
- Compare the provided password with the stored hash using bcrypt comparison
- On successful authentication:
  - Generate a JSON Web Token (JWT) with the following claims:
    - sub: user ID (string)
    - email: user email (string)
    - role: user role ("user", "administrator", "superAdministrator")
    - iat: issue timestamp (number)
    - exp: expiration timestamp (number, 7 days from issue)
  - Return the JWT in response body as "token" field
  - Return user profile information (display name, bio) in response body
- On failed authentication:
  - Return a 401 Unauthorized response
  - Return "Invalid credentials" as error message
  - Apply rate limiting (5 attempts per 15 minutes per IP address)

### Password Change

WHEN a logged-in user requests to change their password, THE system SHALL:
- Require current password and new password in the request
- Validate current password against stored hash
- Validate new password meets complexity requirements (8+ characters, uppercase, lowercase, digit)
- Verify new password is different from current password
- Hash the new password using bcrypt with cost factor 12
- Update the user record with the new password hash
- Set all active sessions to expired (force re-login)
- Return 200 OK on success

WHEN password change fails:
- If current password is incorrect: return 400 with "Current password is incorrect"
- If new password doesn't meet requirements: return 400 with detailed validation errors
- If new password equals current password: return 400 with "New password must be different from current password"

### Account Deletion

WHEN a user requests to delete their account, THE system SHALL:
- Validate user is authenticated and requesting deletion of their own account
- Confirm deletion with user (via email confirmation)
- Remove all user data including:
  - User account record from users table
  - All articles created by the user
  - All comments authored by the user
  - User profile information (display name, bio)
  - Any pending administrator requests from the user
- Preserve history of actions for audit purposes (log deletion with timestamp)
- Invalidate all active sessions for this user
- Return 204 No Content on successful deletion

WHEN deletion fails:
- If user is not authenticated: return 401 Unauthorized
- If attempting to delete another user's account: return 403 Forbidden

## User Profile System

### Profile Components

Each user has a profile containing:
- Display name: customizable text field (max 50 characters)
- Bio: optional text field (max 500 characters)
- Registration date: automatically set on account creation (ISO 8601 format)
- Last login date: updated on each successful login (ISO 8601 format)
- Role: user role ("user", "administrator", "superAdministrator")
- Ban status: boolean (false by default)
- Ban reason: string (null if not banned)

### Profile Display

WHEN a user views another user's profile, THE system SHALL display:
- Display name
- Bio (if provided)
- Registration date
- Last login date
- Role indicator ("Administrator" or "Super Administrator" badge if applicable)
- Ban status indicator ("Banned" badge if applicable)
- List of all articles created by the user
- List of all comments made by the user

WHEN viewing their own profile, THE user SHALL see an "Edit Profile" button to modify display name and bio.

### Profile Editing

WHEN a user edits their display name or bio, THE system SHALL:
- Accept the new display name and/or bio in the request
- Validate display name is between 1 and 50 characters (non-empty)
- Validate bio is 500 characters or less
- Sanitize input to prevent XSS attacks (escape HTML characters)
- Save updated values to user profile record
- Return updated profile information with 200 OK

WHEN editing fails:
- If display name exceeds 50 characters: return 400 with "Display name cannot exceed 50 characters"
- If display name is empty: return 400 with "Display name is required"
- If bio exceeds 500 characters: return 400 with "Bio cannot exceed 500 characters"

## Section Management

### Section Definition

Each section represents a categorized area for articles. A section has the following properties:
- ID: auto-generated UUID
- Name: unique string (max 50 characters)
- Description: text field (max 1000 characters)
- Created timestamp: when section was created
- Created by: user ID of administrator who created it

### Section Creation

WHEN an administrator attempts to create a section, THE system SHALL:
- Require the administrator to be authenticated
- Accept section name and description as input parameters
- Validate section name is unique (case-insensitive) across all sections
- Validate section name is between 1 and 50 characters
- Validate description is 1000 characters or less
- Create new section record in database
- Associate created_by field with current administrator's user ID
- Return 201 Created response with new section details

WHEN creation fails:
- If section name already exists: return 409 Conflict with "Section already exists"
- If section name invalid: return 400 with appropriate validation message
- If user is not an administrator: return 403 Forbidden

### Section Editing

WHEN an administrator attempts to edit a section, THE system SHALL:
- Require the administrator to be authenticated
- Accept section ID, new section name, and new description in the request
- Ensure the target section exists
- Validate new section name is unique across all sections (excluding the section being edited)
- Validate new section name follows length constraints
- Validate description length constraint
- Update section record with new values
- Return 200 OK with updated section details

WHEN editing fails:
- If section doesn't exist: return 404 Not Found
- If new section name duplicates existing section: return 409 Conflict
- If user is not an administrator: return 403 Forbidden

### Section Deletion

WHEN an administrator attempts to delete a section, THE system SHALL:
- Require the administrator to be authenticated
- Accept section ID in the request
- Ensure the target section exists
- Preserve all articles and comments associated with the section
- Remove the section record from the database
- Update all articles associated with this section to have section_id = null
- Return 204 No Content on successful deletion

WHEN deletion fails:
- If section doesn't exist: return 404 Not Found
- If user is not an administrator: return 403 Forbidden

### Section Listing and Browsing

WHEN a user requests the list of all sections, THE system SHALL:
- Return an array of all active sections with:
  - ID
  - Name
  - Description
  - Article count (number of articles in the section)
- Not return deleted or archived sections
- Sort sections alphabetically by name
- Return results with 200 OK status

WHEN a user requests articles in a specific section, THE system SHALL:
- Accept section ID or section name as parameter
- Validate section exists
- Return paginated list of articles in the section
- Include article metadata (title, author, tags, comment count, posted date)
- Sort articles by posting time (newest first by default)
- Return 200 OK with results

## Article Management

### Article Components

Each article has the following properties:
- ID: auto-generated UUID
- Title: required string, max 200 characters
- Content: required text field (no character limit)
- Section: required reference to section ID
- Author: required reference to user ID (user who created it)
- Created timestamp: auto-set to time of creation (ISO 8601)
- Updated timestamp: updated on any edit (ISO 8601)
- Tags: array of strings (maximum 10 tags, each tag max 20 characters)
- Attachments: array of file references (see file handling details)
- View count: number of times article was viewed (incremented on each view)
- Status: "active" (default) or "deleted" (when marked for deletion)

### Article Creation

WHEN a user attempts to create an article, THE system SHALL:
- Require authentication
- Accept the following required fields:
  - Title (1-200 characters, non-empty)
  - Content (minimum 10 characters)
  - Section ID (must reference an existing section)
- Accept optional fields:
  - Tags: array of strings (maximum 10 tags) - automatically trimmed and normalized
  - File uploads: multiple files (PDF, DOC, TXT, JPG, PNG) - each max 10MB
- Validate title uniqueness within section (same author can duplicate titles)
- Sanitize content for XSS attacks
- Normalize tags: convert to lowercase, remove leading/trailing spaces, collapse multiple spaces
- Generate unique ID for article
- Store article record in database
- For each uploaded file:
  - Generate unique filename (UUID-based)
  - Store file in object storage (S3-compatible)
  - Create attachment record with metadata (original name, filename, size, type)
  - Link file to article
- Return 201 Created with article details and list of attached files

WHEN creation fails:
- If missing required field: return 400 with "Missing required field: {field name}"
- If title exceeds 200 characters: return 400 with "Title cannot exceed 200 characters"
- If content less than 10 characters: return 400 with "Content must be at least 10 characters long"
- If section doesn't exist: return 404 with "Section not found"
- If too many tags: return 400 with "Maximum 10 tags allowed"
- If tag exceeds 20 characters: return 400 with "Each tag must be 20 characters or less"
- If file exceeds 10MB: return 400 with "Each file must be 10MB or less"
- If too many files: return 400 with "Maximum 5 files allowed per article"

### Article Editing

WHEN a user attempts to edit their own article, THE system SHALL:
- Require authentication
- Validate user is article author
- Accept new title (up to 200 characters), content, section, tags, and file modifications
- Allow removal of files and tags
- Allow addition of new files (maximum 5 total files per article)
- Validate all field constraints as in article creation
- Update article record with new values
- Update updated timestamp
- For file changes:
  - Delete files that were removed from the article
  - Upload new files and create attachment records
- Return 200 OK with updated article details

WHEN editing fails:
- If user is not author: return 403 Forbidden
- If new title exceeds length: return 400 with appropriate error
- If section doesn't exist: return 404 with "Section not found"
- If file upload fails: return 400 with file-specific error

### Article Deletion

WHEN a user attempts to delete their own article, THE system SHALL:
- Require authentication
- Validate user is article author
- Set article status to "deleted" (soft delete)
- Hide article from all public listings and searches
- Preserve article content intact for administrative review
- Preserve comments attached to the article
- Return 204 No Content on success

WHEN an administrator attempts to delete any article, THE system SHALL:
- Accept article ID
- Validate administrator authentication
- Set article status to "deleted" (soft delete)
- Log the deletion with administrator ID and timestamp
- Return 204 No Content on success

NOTE: Hard delete (permanent deletion) is never implemented. All deleted articles are permanently stored for audit and moderation purposes.

### Article File and Image Handling

- Allowed file types: PDF, DOC, DOCX, TXT, PNG, JPG, JPEG, GIF
- Maximum file size: 10MB per file
- Maximum files per article: 5
- Files are stored in S3-compatible cloud storage with unique UUID-based filenames
- Original filenames are preserved in metadata but never exposed directly
- URL generation: each file gets a signed URL with 1-hour expiration
- Public access: files are accessible only while article is active
- When article is deleted, files remain but become inaccessible through article page
- Files can still be downloaded if URL was shared before article deletion

### Article Listing

WHEN a user requests the list of articles in a section, THE system SHALL:
- Return paginated results (20 articles per page by default)
- For each article, display only:
  - Title
  - Author display name
  - Tag array (if any)
  - Comment count (number of comments)
  - Posted timestamp (ISO 8601)
  - Section name
- Never display article content in list view

WHEN user requests sorting of articles, THE system SHALL support:
- Newest first (default): sort by created_at descending
- Oldest first: sort by created_at ascending
- Most commented: sort by comment count descending

WHEN pagination is requested:
- Accept page number and page size parameters
- Return total count and number of pages
- Return next and previous page links
- Handle invalid page numbers gracefully

### Article Viewing

WHEN a user views a specific article, THE system SHALL:
- Accept article ID
- Return full article details including:
  - Title
  - Content (raw HTML, sanitized)
  - Author display name
  - Author profile link
  - Created timestamp (ISO 8601)
  - Updated timestamp (ISO 8601)
  - Section ID and name
  - Tags array
  - File attachments with download URLs
  - Image attachments (displayed inline in content)
  - Comment count
  - View counter (incremented on each view)
- Increment article view count
- Return 200 OK

WHEN article viewing fails:
- If article not found or deleted: return 404
- If article exists but user lacks permission: return 403

## Comment System

### Comment Components

Each comment has the following properties:
- ID: auto-generated UUID
- Article ID: reference to parent article
- Author ID: reference to user who wrote it
- Content: required text (minimum 1 character, maximum 1000 characters)
- Created timestamp: auto-set on creation (ISO 8601)
- Updated timestamp: updated on edit (ISO 8601)
- Status: "active" (default) or "deleted" (soft delete)

### Comment Creation

WHEN a user attempts to comment on an article, THE system SHALL:
- Require authentication
- Accept article ID and comment content
- Validate article exists and is not deleted
- Validate comment content is between 1 and 1000 characters
- Sanitize comment content to prevent XSS
- Create new comment record in database
- Increment article's comment count
- Return 201 Created with comment details

WHEN creation fails:
- If user not authenticated: return 401
- If article doesn't exist or is deleted: return 404
- If comment content empty: return 400 with "Comment content is required"
- If comment too long: return 400 with "Comment cannot exceed 1000 characters"

### Comment Viewing

WHEN a user requests comments for an article, THE system SHALL:
- Accept article ID
- Return only comments with status = "active"
- Sort comments by created_at ascending (oldest first)
- Return paginated results (20 comments per page)
- For each comment, display:
  - Author display name
  - Author profile link
  - Comment content
  - Created timestamp (ISO 8601)
- Include comment count for the article
- Return 200 OK

### Comment Editing

WHEN a user attempts to edit their own comment, THE system SHALL:
- Require authentication
- Validate user is author of comment
- Accept new comment content
- Validate content length (1-1000 characters)
- Update comment with new content and updated timestamp
- Return 200 OK with updated comment

WHEN editing fails:
- If user is not author: return 403 Forbidden
- If content too short or too long: return 400 with appropriate error

### Comment Deletion

WHEN a user deletes their own comment, THE system SHALL:
- Require authentication
- Validate user is author of comment
- Set comment status to "deleted"
- Decrement article's comment count
- Return 204 No Content

WHEN an administrator deletes any comment, THE system SHALL:
- Require administrator authentication
- Accept comment ID
- Set comment status to "deleted"
- Decrement article's comment count
- Log deletion with administrator ID and timestamp
- Return 204 No Content

## Search and Filtering

### Search Functionality

WHEN a user performs a search, THE system SHALL:
- Accept search query string
- Search across article title and article content
- Perform full-text search with case-insensitive matching
- Apply stemming on search terms (e.g., "politics" matches "political")
- Support word boundaries (search for "economy" won't match "economical" unless exact phrase)
- Return paginated results (20 articles per page)
- Include relevance score as part of sorting
- Sort results by relevance score descending, then by created_at descending
- Return article metadata (title, author, tags, comment count, posted date)
- Return total article count matching search

WHEN search fails:
- If search query empty: return 400 with "Search query cannot be empty"
- If search query exceeds 100 characters: return 400 with "Search query cannot exceed 100 characters"

### Tag Filtering

WHEN a user filters articles by tags, THE system SHALL:
- Accept array of tag names
- Match articles that contain ALL specified tags
- Case-insensitive matching for tags
- Allow filtering in combination with search
- Return paginated results (20 articles per page)
- Sort by criteria chosen (newest first, oldest first, most commented)

WHEN filtering fails:
- If tag exceeds 20 characters: return 400 with "Each tag must be 20 characters or less"
- If more than 10 tags provided: return 400 with "Maximum 10 tags allowed for filtering"

## Administrator Request Workflow

### Request Submission

WHEN a regular user wants to become an administrator, THE system SHALL:
- Require user to be authenticated
- Accept a reason field (minimum 10 characters)
- Create a new administrator request record with:
  - user_id: current user's ID
  - reason: provided text
  - status: "pending"
  - submitted_at: current timestamp
- Send notification to all super administrators
- Return 201 Created with request ID

WHEN submission fails:
- If reason field empty or < 10 characters: return 400 with "Reason must be at least 10 characters"
- If user is already administrator: return 400 with "You are already an administrator"

### Request Review

WHEN a super administrator views pending administrator requests, THE system SHALL:
- Return a paginated list of all requests with status = "pending"
- Include for each request:
  - Request ID
  - User ID
  - Display name
  - Email
  - Reason
  - Submitted timestamp
- Sort by submitted timestamp descending
- Return 200 OK

WHEN a super administrator views all administrator requests (including approved/rejected), THE system SHALL:
- Return paginated list of all history
- Include status history (approved/rejected)
- Include timestamp of decision
- Return 200 OK

### Approval Process

WHEN a super administrator approves an administrator request, THE system SHALL:
- Accept request ID in the request
- Validate request status is "pending"
- Validate user has super administrator privileges
- Update request status to "approved"
- Update the user's role from "user" to "administrator"
- Set approval timestamp
- Send email notification to user: "Congratulations! Your administrator request has been approved."
- Return 200 OK

WHEN approval fails:
- If request ID doesn't exist or is not pending: return 404
- If user is not super administrator: return 403

### Rejection Process

WHEN a super administrator rejects an administrator request, THE system SHALL:
- Accept request ID in the request
- Validate request status is "pending"
- Validate user has super administrator privileges
- Update request status to "rejected"
- Set rejection timestamp
- Send email notification to user: "Your administrator request has been rejected. Please contact support for details."
- Return 200 OK

WHEN rejection fails:
- If request ID doesn't exist or is not pending: return 404
- If user is not super administrator: return 403

## Administrator Privilege Hierarchy

### Administrator Privileges

Administrators have all standard user permissions plus elevated moderation capabilities. This includes:

- Creating articles
- Editing their own articles
- Deleting their own articles
- Writing comments on articles
- Editing their own comments
- Deleting their own comments
- Viewing user profiles
- Viewing section listings
- Searching articles by title and content
- Filtering articles by tags
- Downloading attached files and images

Additionally, administrators have the following privileged capabilities that regular users cannot perform:

WHEN an administrator attempts to create a section, THE system SHALL allow the creation if the section name is unique and not empty.
WHEN an administrator attempts to edit an existing section, THE system SHALL allow the modification of section name and description.
WHEN an administrator attempts to delete a section, THE system SHALL allow deletion and preserve all associated articles and comments.
WHEN an administrator attempts to delete any article, THE system SHALL permit deletion regardless of authorship.
WHEN an administrator attempts to delete any comment, THE system SHALL permit deletion regardless of authorship.
WHEN an administrator attempts to ban a user, THE system SHALL record the ban reason and prevent the user from logging in.
WHEN an administrator attempts to unban a user, THE system SHALL remove the ban status and restore login access.
WHEN an administrator attempts to view the list of banned users, THE system SHALL return the list of banned users with their ban reason.

Additionally:

WHILE an administrator is logged in, THE system SHALL display administrative control panels and moderation tools in the user interface.

### Super Administrator Privileges

Super administrators have all administrator privileges and additionally can manage the administrator hierarchy:

IF a user has the super administrator role, THEN THE system SHALL allow them to promote a regular administrator to super administrator.
IF a user has the super administrator role, THEN THE system SHALL allow them to demote another super administrator to regular administrator.
WHERE an administrator has submitted a request to become an administrator, THE system SHALL allow super administrators to approve or reject the request.

Additionally:

WHILE a super administrator is logged in, THE system SHALL display additional administrative controls to manage other administrators and review administrator requests.

### Promotion Process

WHEN a regular administrator submits a promotion request, THE system SHALL store the request details and notify super administrators.
WHEN a super administrator reviews a promotion request, THE system SHALL allow them to approve the request.
WHEN a promotion request is approved, THE system SHALL update the user's role from "administrator" to "superAdministrator".

An administrator request must contain:

- A reason field (minimum 10 characters)
- A timestamp of submission
- The requester's user ID

WHEN a promotion request is approved, THE system SHALL send a notification to the requester indicating their new status.

### Demotion Process

WHEN a super administrator demotes another super administrator, THE system SHALL change their role from "superAdministrator" to "administrator".
WHEN a super administrator demotes a regular administrator, THE system SHALL reject the request as invalid.

The demotion operation shall:
- Preserve all content created by the demoted user
- Maintain all ban status and moderation history
- Remove "superAdministrator" privileges but retain "administrator" privileges

### Self-Demotion Restriction

IF a super administrator attempts to demote themselves, THEN THE system SHALL reject the request and return an error with code "CANNOT_DEMOTE_SELF".

This restriction exists to ensure:
- System integrity is maintained by always having at least one super administrator
- There is always a user with authority to promote others
- Critical administrative functions cannot be accidentally disabled
- Accountability in the administrative hierarchy is preserved

The system shall allow super administrators to:
- Promote regular administrators to super administrator
- Demote other super administrators
- View administrator requests
- Approve/reject administrator requests

But shall never allow a super administrator to make themselves a regular administrator under any circumstances.

Mermaid diagram of administrator privilege hierarchy:

```mermaid
graph LR
  A