# Economic/Political Discussion Board Requirements

## 1. User Account Management

### 1.1 Registration

WHEN a new user provides email and password during registration, THE system SHALL verify the email format using strict RFC 5322 validation.

WHEN a user submits registration details, THE system SHALL enforce password strength criteria: minimum 8 characters, at least one uppercase letter, one lowercase letter, one number, and one special character.

WHEN a user signs up, THE system SHALL send a verification email containing a unique token for account activation within 24 hours.

WHEN an email address is already registered, THE system SHALL display 'Email address already in use' message with clear instructions to reset password.

### 1.2 Authentication

WHEN a user attempts to log in with valid credentials, THE system SHALL generate a JWT token with 1-hour expiration period and store it securely in an HTTP-only cookie.

WHEN a login attempt fails for 5 consecutive times, THE system SHALL lock the account for 15 minutes and notify the user via email.

WHEN a user initiates password reset, THE system SHALL generate a one-time token valid for 2 hours, sent via email, and require the user to create a new password meeting the strength criteria.

### 1.3 Account Deletion

WHEN a user requests account deletion, THE system SHALL provide a confirmation modal explaining that all associated articles and comments will be permanently removed.

WHEN a user confirms account deletion, THE system SHALL trigger a cascade deletion of all related data: user profile, articles, comments, and attachments.

WHEN an account is deleted, THE system SHALL send a confirmation email to the user's registered address verifying the permanent removal of their account and content.

## 2. User Profile System

### 2.1 Profile Management

WHEN a user views their own profile, THE system SHALL display the current display name and bio text.

WHEN a user submits updates to display name or bio, THE system SHALL validate display name meets requirements: 2-30 characters, alphanumeric with spaces, no special characters.

WHEN a user edits their profile, THE system SHALL immediately update and display the changes without requiring page refresh.

WHEN profile updates are made, THE system SHALL record the timestamp and the user who made the changes.

### 2.2 Profile Visibility

WHEN a user views another user's profile, THE system SHALL display the author's display name, bio, article count, and comment count.

WHEN a user's profile is viewed, THE system SHALL display a paginated list of all their articles (maximum 5 per page) with title, time posted, and comment count.

WHEN a user's profile contains articles, THE system SHALL show the list of articles with thumbnail of attached images if any.

WHEN a banned user's profile is viewed, THE system SHALL display 'Banned Account' badge before the display name.

## 3. Section Management

### 3.1 Section Creation

WHEN an administrator creates a new section, THE system SHALL require section name (2-50 characters) and description (10-250 characters).

WHEN a section is created, THE system SHALL make it available in the public section listing for user browsing.

WHEN a section name is duplicated, THE system SHALL display 'Section name already exists' error message.

### 3.2 Section Management

WHEN an administrator edits a section, THE system SHALL allow modification of name and description fields.

WHEN a section is deleted, THE system SHALL automatically reassign all articles from the deleted section to a default 'Miscellaneous' section.

WHEN a section is deleted, THE system SHALL archive all articles from the section but maintain their original content and timestamps.

### 3.3 Section Browsing

WHEN users access the section list, THE system SHALL display all publicly available sections with their names and brief descriptions.

WHEN users select a section, THE system SHALL display a paginated list of articles within that section (10 articles per page).

WHEN users view section articles, THE system SHALL show article titles, author names, comment counts, and time posted for each article.

## 4. Article System

### 4.1 Article Creation

WHEN a user creates a new article, THE system SHALL require title (5-150 characters), content (minimum 20 characters), and section selection.

WHEN a user attaches files to an article, THE system SHALL validate file types (image/png, image/jpeg, application/pdf, text/plain) and limit maximum size to 10MB per file.

WHEN a user adds tags to an article, THE system SHALL allow up to 10 tags per article, each between 2-50 characters, with no special characters.

### 4.2 Article Editing and Deletion

WHEN a user edits their article, THE system SHALL allow modification of title, content, attachments, and tags.

WHEN a user deletes their article, THE system SHALL display a confirmation dialog and permanently remove all related data (attachments, tags, comments).

WHEN an administrator deletes an article, THE system SHALL display a moderation note and remove all related comments.

### 4.3 Article Listing and Sorting

WHEN users view articles in a section, THE system SHALL load the first page of articles (10 items) within 1.5 seconds.

WHEN users sort article listings by 'Newest First', THE system SHALL display the most recently created articles at the top with timestamps.

WHEN users sort article listings by 'Oldest First', THE system SHALL display articles in creation order from earliest to latest.

## 5. Commenting System

### 5.1 Comment Creation

WHEN a user views an article, THE system SHALL display a comment input field if authenticated.

WHEN a comment is submitted, THE system SHALL enforce comment length between 5-1000 characters, with real-time validation feedback.

WHEN a comment is created, THE system SHALL immediately display the comment in chronological order (oldest first).

WHEN a comment is created, THE system SHALL increment the article's comment count by one.

### 5.2 Comment Editing and Deletion

WHEN a user edits their comment within 24 hours of creation, THE system SHALL allow modification of comment content and update the timestamp.

WHEN a comment is deleted by its author, THE system SHALL remove it from all displays instantly.

WHEN a user attempts to edit a comment older than 24 hours, THE system SHALL display 'Comments cannot be edited after 24 hours' message.

## 6. Search Functionality

### 6.1 Article Search

WHEN a user enters search keywords, THE system SHALL search article titles and content for matching text across all sections.

WHEN search results exceed 10 items, THE system SHALL paginate results with next/previous navigation.

WHEN a user applies tag filtering, THE system SHALL restrict results to articles containing the specified tags.

### 6.2 Search Performance

WHEN a search query is executed, THE system SHALL return results within 2 seconds for 95% of cases.

WHEN searching with multiple tags, THE system SHALL return articles containing all specified tags.

## 7. Administrative System

### 7.1 Administrator Requests

WHEN a user submits an administrator request, THE system SHALL require a reason (minimum 20 characters, maximum 250 characters).

WHEN a super administrator views pending requests, THE system SHALL display a list with user names, submitted reasons, and request dates.

WHEN a super administrator approves a request, THE system SHALL promote the user to regular administrator within 5 minutes.

### 7.2 Administrator Privileges

WHEN an administrator creates a section, THE system SHALL grant section creation privileges.

WHEN a super administrator promotes a regular administrator, THE system SHALL upgrade their role and send notification to the user.

WHEN a super administrator demotes another super administrator, THE system SHALL reduce their role to regular administrator within 5 minutes.

## 8. Banning System

### 8.1 Banning Process

WHEN an administrator bans a user, THE system SHALL require a ban reason (minimum 10 characters, maximum 500 characters).

WHEN a user is banned, THE system SHALL disable their login capabilities while preserving all content.

WHEN a banned user's profile is viewed, THE system SHALL display 'Banned' badge with the recorded reason.

### 8.2 Ban Management

WHEN an administrator views the list of banned users, THE system SHALL display user names, ban reasons, and dates.

WHEN an administrator unban a user, THE system SHALL restore their account to active status within 1 minute.

## 9. Error Handling

### 9.1 Authentication Errors

IF a user attempts to comment without being logged in, THEN THE system SHALL redirect to login page with 'Must be logged in to comment' message.

IF a user's session expires while writing an article, THEN THE system SHALL display 'Session expired - please log in again' message and clear the draft form.

### 9.2 Validation Errors

IF a comment has fewer than 5 characters, THEN THE system SHALL display 'Comment must be at least 5 characters' error.

IF a comment exceeds 1000 characters, THEN THE system SHALL display 'Comment must be 1000 characters or less' error.

## 10. Performance Requirements

### 10.1 Response Times

WHEN a page loads for the first time, THE system SHALL load all essential content within 2.5 seconds for 95% of users.

WHEN an article load is initiated, THE system SHALL display the article content within 1.8 seconds for 90% of cases.

### 10.2 Scalability

WHEN handling 100 concurrent users posting articles, THE system SHALL maintain response times under 3 seconds.

WHEN searching through 10,000 articles with tags, THE system SHALL return results within 2.2 seconds.

### 10.3 Business Justification

This comprehensive requirements specification directly supports our core business model by:
- Establishing a secure and well-defined user management system
- Supporting platform growth metrics through comment and article engagement
- Providing a structure for community moderation through administrative controls
- Enabling content discovery through section categorization and search features
- Ensuring platform credibility through strict content management standards
- Supporting revenue opportunities through potential premium features

### References

- [User Actors Definition](./03-user-actors.md)
- [Article System Requirements](./06-article-functionality.md)
- [Administrative System Specification](./09-administration-system.md)
- [Error Handling Framework](./11-error-handling.md)