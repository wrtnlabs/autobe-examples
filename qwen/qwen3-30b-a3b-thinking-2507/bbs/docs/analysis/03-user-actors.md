# Economic/Political Discussion Board Requirements

## User Account

### Authentication Requirements

**WHEN a user submits valid email and password, THE system SHALL authenticate them and grant access to community features.**

**IF a user forgets their password, THEN THE system SHALL initiate a password reset workflow with email verification.**

**WHILE a user attempts to log in with invalid credentials, THE system SHALL display "Invalid email or password" and reset the login attempt counter after 3 attempts.**

### Account Management

**WHEN a user requests account deletion, THE system SHALL permanently delete their account along with all associated articles and comments.**

**IF a user deletes their account within 24 hours of creation, THEN THE system SHALL waive any account recovery fees.**

**WHILE a user changes their password, THE system SHALL require the current password for verification and invalidate all existing session tokens.**

## User Profile

### Profile Details

**WHEN a user submits a display name and bio, THE system SHALL validate the display name against business rules (max 30 characters, no special characters).**

**IF a user attempts to set a display name identical to an existing user, THEN THE system SHALL reject the submission with "Display name already taken."**

**WHILE viewing another user's profile, THE system SHALL show their display name, bio, and a list of articles and comments they've created.**

### Profile Management

**WHEN a user edits their bio, THE system SHALL update the profile within 1 second of submission.**

**IF a user deletes their account, THEN THE system SHALL remove their profile from public view within 30 seconds.**

**WHILE a user views their own profile, THE system SHALL display "Edit Profile" button; for other users' profiles, only "View Profile" button.**

## Sections

### Section Management

**WHEN an administrator creates a new section, THE system SHALL require a name and description (max 250 characters).**

**IF a section name contains prohibited terms (e.g., "NSFW"), THEN THE system SHALL reject the request with "Section name includes restricted terms."**

**WHILE an administrator edits a section, THE system SHALL update the section properties within 0.5 seconds and log the change.**

### User Access to Sections

**WHEN a user views the section list, THE system SHALL display all sections with their names and descriptions.**

**IF a user attempts to create an article in a non-existent section, THEN THE system SHALL redirect them to the section management page with "Section not found" error.**

**WHILE browsing articles in a section, THE system SHALL paginate results showing 20 articles per page with "Next" and "Previous" navigation.**

## Articles

### Article Creation

**WHEN a user creates a new article, THE system SHALL require title, content, and section selection.**

**IF the user attaches files that exceed 100MB total size, THEN THE system SHALL reject the submission with "File size limit exceeded (100MB max)."**

**WHILE uploading images, THE system SHALL automatically resize to 2048x2048 pixels and convert to WebP format.**

### Article Editing

**WHEN a user edits their article, THE system SHALL allow modifying title, content, attachments, and tags.**

**IF a user removes all attachments from an article, THEN THE system SHALL notify them with "Article now has no attached files."**

**WHILE editing, THE system SHALL save draft automatically every 30 seconds with revision history.**

### Article Deletion

**WHEN a user deletes an article, THE system SHALL provide confirmation with "This action cannot be undone."**

**IF a user attempts to delete another user's article, THEN THE system SHALL deny access and display "You may only delete your own articles."**


## Article List

### List Requirements

**WHEN viewing articles within a section, THE system SHALL display titles, authors, tag list, comment count, and posting time.**

**IF a user sorts articles by 'Oldest First', THEN THE system SHALL display articles from oldest to newest.**

**WHILE sorting articles, THE system SHALL maintain active sort state across pagination.**

### Pagination and Performance

**WHEN loading article list, THE system SHALL load first page in under 2 seconds.**

**IF the article list exceeds 500 items, THEN THE system SHALL limit displayed records to 1000.**

**WHILE pagination occurs, THE system SHALL update URL parameters for bookmarking.**

## Viewing an Article

### Article Display

**WHEN accessing an article detail page, THE system SHALL display title, author, full content, attachments, tags, and posting time.**

**IF an article has attached files, THEN THE system SHALL display download links with file type icons.**

**WHILE viewing attachment, THE system SHALL allow direct image viewing with gallery navigation.**

### User Engagement

**WHEN a user views an article, THE system SHALL record the view in analytics.**

**IF a user clicks 'Like' button, THEN THE system SHALL update like count instantly and display "Liked" state.**


## Searching Articles

### Search Functionality

**WHEN a user enters search terms, THE system SHALL search title and content fields.**

**IF no results match the search, THEN THE system SHALL display "No articles found matching your query."**

**WHILE searching, THE system SHALL autocomplete suggestions for popular terms.**

### Filtering and Results

**WHEN applying tag filters, THE system SHALL show only articles with the selected tag.**

**IF a user filters by multiple tags, THEN THE system SHALL display articles matching all selected tags.**

**WHILE filtering occurs, THE system SHALL maintain search term and filter selection in URL parameters.**

## Comments

### Comment Requirements

**WHEN a user posts a comment, THE system SHALL require comment content and validate against 1 character min.**

**IF the comment contains profanity, THEN THE system SHALL flag it for moderation review.**

**WHILE viewing comments, THE system SHALL display comments in chronological order (oldest first).**

### Comment Management

**WHEN a user edits their comment, THE system SHALL allow editing within 15 minutes of posting.**

**IF a user deletes a comment, THEN THE system SHALL remove it immediately with confirmation.**

**WHILE deleting a comment, THE system SHALL update the article's comment count in real time.**

## Administrator System

### Role Management

**WHEN a user submits a request to become administrator, THE system SHALL require a written request (min 50 characters).**

**IF a super administrator approves the request, THEN THE system SHALL update user role to administrator immediately.**

**WHILE processing role requests, THE system SHALL notify user with "Your administrator request is now pending review."**

### Administrative Permissions

**WHEN an administrator deletes any article, THE system SHALL allow the action without user verification.**

**IF an administrator attempts to ban a user, THEN THE system SHALL require a ban reason (min 10 characters).**

**WHILE banning users, THE system SHALL record the ban reason and administrator in audit logs.**

## Banning

### Banning Workflow

**WHEN a user is banned, THE system SHALL prevent login access immediately.**

**IF a ban reason is empty, THEN THE system SHALL reject the ban request with "Ban reason required."**

**WHILE viewing banned users, THE system SHALL display reason and ban date for each entry.**

### Banned User Rights

**WHEN a banned user attempts to log in, THE system SHALL display "Your account has been banned. Please contact admin for details."**

**IF a user is banned for 30 days, THEN THE system SHALL automatically lift the ban after 30 days.**

**WHILE viewing banned users' articles, THE system SHALL show content but indicate the author is banned.**