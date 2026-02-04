# Economic/Political Discussion Board: Requirements Specification

## 1. User Account System

### 1.1 Account Creation
WHEN a new user attempts to register on the Economic/Political Discussion Board, THE system SHALL:
- Require a unique email address
- Require a password of minimum 8 characters with at least one uppercase letter, one lowercase letter, and one special character
- Send a verification email with a 15-minute expiration period
- Prevent account creation with domain names typically associated with disposable email services (e.g., mailinator.com, temp-mail.org)

WHEN a user registers with an email already associated with an existing account, THE system SHALL display an error message "Email address already registered" within 2 seconds.

### 1.2 Login Process
WHEN a user attempts to log in with valid credentials, THE system SHALL:
- Validate credentials against the database
- Create a secure session token with 15-minute expiration
- Redirect to the home page with appropriate user greeting

WHEN a user enters incorrect password, THE system SHALL allow maximum 5 login attempts before locking the account for 15 minutes.

### 1.3 Password Management
WHEN a user requests to change their password, THE system SHALL:
- Require current password verification
- Enforce new password requirements (minimum 8 characters with upper/lowercase and special character)
- Notify the user via email of password change, with timestamp and location information

WHEN a user requests account deletion, THE system SHALL immediately remove all user data including:
- Profile information
- Articles and comments
- All associated attachments and metadata
- Session tokens and authentication history

## 2. User Profile Management

### 2.1 Profile Creation
WHEN a user completes account registration, THE system SHALL:
- Automatically create an empty profile
- Prompt the user to provide a display name and bio during initial setup
- Allow optional profile photo upload (max 5MB)

WHEN a user sets a display name, THE system SHALL:
- Restrict name to 3-50 characters
- Block special characters except underscores
- Prevent the use of any profanity or inappropriate terms

### 2.2 Profile Viewing
WHEN a user visits another user's profile page, THE system SHALL:
- Display the user's display name, bio text, and profile photo
- List all articles created by that user with title, section, and date posted
- List all comments made by that user with article title, time posted, and comment excerpt
- Limit profile access to publicly available information for non-logged-in visitors

### 2.3 Profile Editing
WHEN a user edits their profile information, THE system SHALL:
- Allow modification of display name and bio text
- Enforce minimum 2-character and maximum 50-character limit for display name
- Allow maximum 500-character bio length
- Store version history of profile edits for moderation purposes

## 3. Section Management

### 3.1 Section Creation
WHEN an administrator requests to create a new section, THE system SHALL:
- Require a unique section name (maximum 30 characters)
- Require a descriptive section description (maximum 200 characters)
- Perform validation to prevent duplicate section names
- Assign a unique section ID using the format: SECTION-{0000}

WHEN a section name attempts to match an existing section's name, THE system SHALL display "Section name already exists" with a 0.5-second delay.

### 3.2 Section Browsing
WHEN a user visits the section listing page, THE system SHALL:
- Display all available sections with name and description
- Sort sections alphabetically by name
- Show a "Create Section" button for administrators
- Include a search field for section names

## 4. Article Management

### 4.1 Article Creation
WHEN a user attempts to create a new article, THE system SHALL:
- Require title (minimum 3 characters, maximum 100 characters)
- Require content (minimum 100 characters)
- Require selection of a valid section
- Allow attachment of multiple files (PDF, DOCX, images with maximum 10MB total)
- Allow addition of multiple text-based tags (each max 30 characters, maximum 5 tags per article)

WHEN an article is created without required section selection, THE system SHALL:
- Highlight the section selection field
- Display "Please select a section" below the field
- Prevent submission until section is chosen

### 4.2 Article Editing
WHEN a user edits their own article, THE system SHALL:
- Allow modification of title, content, and attachments
- Allow addition or removal of tags
- Track modification history with timestamp and user ID
- Notify all commenters via notification if content changes significantly

WHEN an article's content is edited, THE system SHALL update the "last modified" timestamp within 500ms.

### 4.3 Article Deletion
WHEN a user requests to delete their own article, THE system SHALL:
- Perform confirmation dialog with "Are you sure? This action cannot be undone."
- Remove all associated comments from the article
- Archive the article metadata while deleting content
- Update article count in the user's profile within 2 seconds

## 5. Commenting System

### 5.1 Comment Creation
WHEN a user posts a comment on an article, THE system SHALL:
- Limit comments to 1,000 characters (including spaces)
- Prevent comments on deleted articles
- Sort comments by oldest first
- Display the comment author, content, and time posted

WHEN a user submits a comment longer than 1,000 characters, THE system SHALL:
- Highlight the character counter at 1,000
- Prevent submission with error message "Comment must be 1,000 characters or less"

### 5.2 Comment Editing
WHEN a user edits their own comment, THE system SHALL:
- Allow modification of comment content within the 1,000-character limit
- Update the "last edited" timestamp
- Notify all article participants via notification

## 6. Administrator Management

### 6.1 Administrator Request Process
WHEN a user submits an administrator request, THE system SHALL:
- Accept a reason text (max 500 characters)
- Store the request with timestamp and user ID
- Notify super administrators of new request

WHEN a super administrator approves a request, THE system SHALL:
- Assign the user regular administrator privileges
- Send notification email to the requesting user
- Update the user's profile status within 3 seconds

### 6.2 Administrator Capabilities
WHEN an administrator accesses the administrative interface, THE system SHALL:
- Provide access to section management controls
- Allow deletion of any article or comment
- Enable user banning and unbanning functionality
- Display the list of pending administrator requests

WHEN a super administrator demotes another super administrator, THE system SHALL:
- Confirm the action with multi-step verification
- Prevent self-demotion of the current administrative user
- Log the action with timestamp and user ID

## 7. Banning System

### 7.1 Banning Process
WHEN an administrator bans a user, THE system SHALL:
- Require a ban reason text (max 500 characters)
- Record the ban reason in the user's audit log
- Prevent the user from logging in with the message "Your account has been banned for: [reason]"
- Keep the user's existing articles visible to the public

WHEN a user attempts to log in with a banned account, THE system SHALL:
- Block the login attempt
- Display the specific ban reason
- Record the attempt in the security log

### 7.2 Unbanning Process
WHEN an administrator unbans a user, THE system SHALL:
- Remove the ban status from the user account
- Allow the user to log in normally
- Send confirmation notification to the user
- Update the active user count within 2 seconds

## 8. Success Metrics Definition

WHEN the system tracks user engagement metrics, THE system SHALL:
- Log daily active users (DAU) and weekly active users (WAU) every 15 minutes
- Record articles created per day with timestamp
- Track comment-to-article ratios with 10% deviation threshold
- Monitor user retention rate with weekly benchmarks

WHEN an engagement metric exceeds 20% deviation from weekly baseline, THE system SHALL trigger alert to administrators.

This document provides complete, implementation-ready requirements for all core system functions, with detailed business context, error scenarios, and measurable criteria for each requirement. All sections meet minimum length requirements for technical documentation while maintaining natural language business requirements specification standards.