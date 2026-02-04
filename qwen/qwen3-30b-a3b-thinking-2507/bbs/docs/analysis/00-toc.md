# Functional Requirements

## 4.1 User Account Management

### 4.1.1 Account Creation
WHEN a new user registers with a valid email address and password, THE system SHALL provide a confirmation email with a verification link within 2 seconds. THE system SHALL validate the email format using the pattern [a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}.

### 4.1.2 Account Login
WHEN a user attempts to log in with a valid email and password, THE system SHALL authenticate the credentials using bcrypt hashing in under 500ms. THE system SHALL generate a JWT access token with a 1 hour expiration time and a refresh token valid for 30 days.

### 4.1.3 Password Management
WHEN a user requests password reset, THE system SHALL send a secure reset token via email that expires after 1 hour. THE system SHALL require a new password with at least 12 characters, including at least 1 uppercase letter, 1 lowercase letter, 1 numeric character, and 1 special character.

### 4.1.4 Account Deletion
WHEN a user deletes their account, THE system SHALL remove all personal data within 24 hours, including associated articles, comments, and profile information. THE system SHALL immediately revoke all session tokens, ensuring the user cannot log in again.

## 4.2 User Profile Management

### 4.2.1 Profile Creation
WHEN a user creates a new account, THE system SHALL prompt for display name and bio text as optional profile fields. THE system SHALL store the display name as a string with maximum length of 30 characters and the bio as a text field with maximum length of 500 characters.

### 4.2.2 Profile Editing
WHEN a user edits their profile, THE system SHALL allow updating the display name and bio. THE system SHALL validate new display names to prevent offensive or inappropriate content using the blacklist filtering mechanism.

### 4.2.3 Profile Viewing
WHEN a user views another user's profile, THE system SHALL display the display name, bio, list of articles written by the author, and list of comments written by the author. THE system SHALL paginate the article and comment lists with 10 items per page.

## 4.3 Section Management

### 4.3.1 Section Creation
WHEN an administrator creates a new section, THE system SHALL require a section name (maximum 50 characters) and description (maximum 250 characters). THE system SHALL ensure section names are unique across all sections.

### 4.3.2 Section Editing
WHEN an administrator edits a section, THE system SHALL allow modification of the section name and description. THE system SHALL prevent deletion of sections that contain articles.

### 4.3.3 Section Viewing
WHEN a user views all sections, THE system SHALL display the section name, description, and the number of articles in each section. THE system SHALL sort sections alphabetically by name.

## 4.4 Article Management

### 4.4.1 Article Creation
WHEN a user creates a new article, THE system SHALL require title (minimum 5 characters, maximum 100 characters), content (minimum 50 characters), and section selection. THE system SHALL allow attaching up to 10 files of any format with maximum total size of 50MB. THE system SHALL allow up to 5 tags (each max 20 characters, no spaces).

### 4.4.2 Article Editing
WHEN a user edits their own article, THE system SHALL allow modification of title, content, attachments, and tags. THE system SHALL save edits as new version of the article with version history retained.

### 4.4.3 Article Deletion
WHEN a user deletes their article, THE system SHALL remove the article and all attachments. THE system SHALL adjust the article count for the user and section.

### 4.4.4 Article Listing
WHEN a user views articles in a section, THE system SHALL display the title, author, tags, comment count, and time posted for each article. THE system SHALL paginate results with 15 articles per page. THE system SHALL allow sorting by newest first or oldest first.

## 4.5 Commenting System

### 4.5.1 Comment Creation
WHEN a user adds a comment to an article, THE system SHALL require comment text (minimum 10 characters, maximum 500 characters). THE system SHALL store the comment with the author's display name, the comment text, and the date/time of posting.

### 4.5.2 Comment Management
WHEN a user views comments on an article, THE system SHALL display all comments sorted by oldest first. THE system SHALL show each comment's author, content, and posting time.

### 4.5.3 Comment Editing and Deletion
WHEN a user edits their own comment, THE system SHALL allow modification of the comment text. WHEN a user deletes their comment, THE system SHALL remove the comment and update the article's comment count.

## 4.6 Administration Capabilities

### 4.6.1 Administrative Accounts
WHEN a user submits a request to become an administrator, THE system SHALL require a reason for the request (minimum 50 characters). THE system SHALL notify super administrators of pending requests. WHEN approved, THE system SHALL grant regular administrator permissions to the user.

### 4.6.2 Administrator Roles
WHEN a super administrator promotes a regular administrator, THE system SHALL change their role to super administrator. WHEN a super administrator demotes a super administrator, THE system SHALL change their role to regular administrator. THE system SHALL prevent self-demotion of super administrators.

### 4.6.3 Section Management
WHEN an administrator creates a new section, THE system SHALL require a section name and description as described in 4.3.1. WHEN an administrator edits or deletes a section, THE system SHALL prevent changes to sections that contain articles.

### 4.6.4 Content Moderation
WHEN an administrator deletes an article, THE system SHALL remove the article and its attachments. WHEN an administrator deletes a comment, THE system SHALL immediately remove the comment. THE system SHALL not delete user accounts or profiles as part of content moderation.

### 4.6.5 User Management
WHEN an administrator bans a user, THE system SHALL record the ban reason (minimum 10 characters) and prevent the user from logging in. THE system SHALL keep the user's articles and comments visible. WHEN an administrator unbans a user, THE system SHALL restore the user's access to the platform.

## 4.7 Banning System

### 4.7.1 Banning Process
WHEN an administrator bans a user, THE system SHALL record the ban reason, the date/time of banning, and the administrator who performed the action. THE system SHALL prevent the user from logging in or posting new content.

### 4.7.2 Ban Reason Visibility
WHEN a user views their ban status, THE system SHALL display the ban reason to the user only after the ban is lifted or when specifically requested by the user. THE system SHALL require super administrator approval to view the ban reason during active ban.

### 4.7.3 Banned User Content
WHEN a user is banned, THE system SHALL maintain all their existing articles and comments. THE system SHALL display the original author of banned users' content with a 'Banned User' badge.

## 4.8 Business Rules

### 4.8.1 Article Requirements
THE system SHALL reject article creation attempts with titles < 5 characters or content < 50 characters. THE system SHALL block articles with more than 5 tags or tags containing special characters.

### 4.8.2 Comment Requirements
THE system SHALL require comments to be at least 10 characters and not exceed 500 characters. THE system SHALL filter comments for inappropriate content using the blacklisted words list.

### 4.8.3 Content Moderation
THE system SHALL allow administrators to delete any article or comment immediately. THE system SHALL maintain a complete audit log of all moderation actions with time, user, and action type recorded.

### 4.8.4 User Limitations
THE system SHALL limit users to 5 articles per day. THE system SHALL allow users to delete their own accounts but prevent deletion of accounts with more than 10 published articles (requires administrator approval).