# Economic/Political Discussion Board - Requirements Specification

## 1. User Account Management

### Registration Requirements

WHEN a user submits a registration form with email and password, THE system SHALL validate:
- Email format and uniqueness
- Password complexity (minimum 8 characters, including uppercase, lowercase, and a number)
- Display the message "Registration successful! Please verify your email address." after sending verification email.

WHEN a user enters an invalid email during registration, THE system SHALL display "Please enter a valid email address."

### Login Requirements

WHEN a user submits valid credentials during login, THE system SHALL authenticate user and establish session with JWT token.

WHEN a user attempts to login with an unverified email, THE system SHALL display "Please verify your email before logging in."

WHEN a user enters incorrect credentials, THE system SHALL display "Invalid email or password."

### Password Management

WHEN a user requests password change, THE system SHALL:
- Verify current password
- Enforce new password complexity
- Display "Password successfully updated" upon completion.

WHEN a user requests password reset with unregistered email, THE system SHALL display "No account found with this email address."

### Account Deletion

WHEN a user requests account deletion, THE system SHALL:
- Verify user authentication
- Check for associated content (articles/comments)
- Display "You have content associated with your account. Delete all content before deleting account."

WHEN a user has pending administrator request, THE system SHALL display "Cannot delete account while pending administrator request."

## 2. User Profile Management

### Profile Creation

WHEN a user creates a profile, THE system SHALL store:
- Display name (minimum 2 characters, maximum 50)
- Bio text (maximum 500 characters)

THE system SHALL display "Profile successfully created" notification upon completion.

### Profile Editing

WHEN a user edits their profile, THE system SHALL save updated display name and bio, and display "Profile updated successfully."

WHEN profile update contains invalid display name (empty, too long), THE system SHALL display "Display name must be 2-50 characters."

### Profile Viewing

WHEN a user views another user's profile, THE system SHALL display:
- Display name
- Bio
- List of all articles created by user
- List of all comments written by user

## 3. Sections Management

### Section Creation

WHEN a super administrator submits a new section with name and description, THE system SHALL:
- Validate required fields
- Ensure name uniqueness
- Display "Section created successfully."

WHEN a non-administrator attempts section creation, THE system SHALL display "Only administrators can create sections."

### Section Browsing

WHEN a user requests to view all sections, THE system SHALL display:
- Section name
- Section description
- List all sections with accessible sections only visible to non-admin users.

## 4. Articles System

### Article Creation

WHEN a user creates an article with title, content, section, and attachments, THE system SHALL:
- Validate title length (minimum 5 characters)
- Validate content length (minimum 50 characters)
- Verify section existence
- Validate attachments (maximum 100MB total, supported formats: JPG, PNG, PDF, DOCX)
- Assign unique article ID
- Display "Article published successfully."

WHEN a user submits an empty title, THE system SHALL display "Article title is required."

### Article Editing

WHEN a user edits their article, THE system SHALL:
- Allow updates to title, content, attachments, and tags
- Validate all fields
- Display "Article updated successfully."

WHEN a user attempts to edit another user's article, THE system SHALL display "You don't have permission to edit this article."

### Article Attachment Management

WHEN a user attaches multiple files to an article, THE system SHALL:
- Validate each file format
- Ensure total size ≤ 100MB
- Allow maximum 10 attachments
- Display all files with download links

## 5. Article List and Browsing

### List Display

WHEN a user views section articles, THE system SHALL display:
- Paginated list (default 20 articles per page)
- Title, author, tags, comment count, and time posted
- Sorted by newest first by default

WHEN a user sorts the list by oldest first, THE system SHALL reorder items chronologically.

## 6. Viewing Articles

### Article Detail Page

WHEN a user views a single article, THE system SHALL display:
- Title
- Author display name
- Full content
- All attachments with download options
- Tags
- Time posted

WHEN an article has no attachments, THE system SHALL display "No attachments available."

## 7. Searching Articles

### Search Functionality

WHEN a user searches by title or content, THE system SHALL:
- Return paginated results (default 20 items per page)
- Display search term and results count
- Include matching articles only
- Return "0 results" when no matches exist.

WHEN a user types a query with less than 3 characters, THE system SHALL display "Search term must be at least 3 characters."

### Tag Filtering

WHEN a user filters by tags, THE system SHALL:
- Show all articles containing any selected tag
- Display "Articles filtered by [tag]" header
- Maintain pagination
- Return "No articles found for tag [tag]" when empty

## 8. Comments System

### Comment Creation

WHEN a user submits a comment on an article, THE system SHALL:
- Validate comment content (minimum 5 characters, maximum 1,000)
- Assign unique comment ID
- Store author reference
- Display "Comment added successfully."

WHEN comment content is empty, THE system SHALL display "Comment content is required."

### Comment Viewing and Management

WHEN a user views comments on an article, THE system SHALL:
- Display all comments sorted by oldest first
- Show author display name, content, and timestamp
- Allow editing/deletion of own comments
- Hide admin actions from non-admin users

WHEN a user attempts to edit another user's comment, THE system SHALL display "You don't have permission to edit this comment."

## 9. Administrator System

### Administrator Requests

WHEN a user submits an administrator request with reason, THE system SHALL:
- Store request with status "pending"
- Notify super administrators
- Display "Your request has been submitted."

WHEN a user submits no reason with request, THE system SHALL display "Reason for administrator request is required."

### Super Administrator Capabilities

WHEN a super administrator promotes a regular administrator to super administrator, THE system SHALL update role and display "User promoted to super administrator."

WHEN a super administrator demotes another super administrator, THE system SHALL update role and display "User demoted to regular administrator."

## 10. Banning System

### Banning Process

WHEN an administrator bans a user, THE system SHALL:
- Record ban reason
- Set account status to 'banned'
- Prevent login attempts
- Display "User banned successfully. Reason: [reason]"

WHEN a banned user attempts to log in, THE system SHALL display "Your account is banned. Reason: [ban reason]."

### Banned User Management

WHEN an administrator views banned users, THE system SHALL display:
- Banned user display name
- Ban reason
- Date and time of ban
- Option to unban user

WHEN an administrator requests to unban a user, THE system SHALL display "User unbanned successfully."

## 11. Error Handling

### Common Error Cases

WHEN system encounters unexpected error, THE system SHALL display "An unexpected error has occurred. Please try again later."

WHEN invalid API request detected, THE system SHALL return HTTP 400 with "Invalid request parameters."

WHEN file processing fails, THE system SHALL display "Failed to process file. Supported formats: JPG, PNG, PDF, DOCX."

## 12. Performance Requirements

THE system SHALL:
- Load articles in ≤ 2 seconds for standard content
- Process file attachments within 5 seconds per 10MB
- Handle 1,000 concurrent users without significant slowdown
- Maintain search response time ≤ 1.5 seconds for 95% of requests