# Economic/Political Discussion Board

## 1. User Account Management

### 1.1 User Registration

**WHEN a user attempts to register, THE system SHALL require a valid email address and password of minimum 8 characters.**

**WHEN a user submits registration details, THE system SHALL validate the email format follows RFC 5322 standards.**

**WHEN an email is already registered, THE system SHALL display an error message "This email is already in use" within 1 second.**

### 1.2 User Login

**WHEN a user submits email and password for login, THE system SHALL verify credentials against the database with a maximum 2-second response time.**

**WHEN login credentials are invalid, THE system SHALL increment a failure counter and lock the account after 5 consecutive failed attempts.**

**WHEN login is successful, THE system SHALL generate a JWT token valid for 24 hours with refresh token capability.**

### 1.3 User Password Management

**WHEN a user submits a password change request, THE system SHALL require confirmation of current password.**

**WHEN a user deletes their account, THE system SHALL permanently remove all user data including articles, comments, and associated metadata within 30 seconds.**

## 2. User Profile Management

### 2.1 Profile Overview

**WHEN a user visits their profile page, THE system SHALL display their display name, bio, and a count of their published articles and comments.**

**WHEN a user edits their display name or bio, THE system SHALL validate the name against profanity filters and limit to 50 characters.**

### 2.2 Profile Visibility

**WHEN a user views another user's profile, THE system SHALL show their display name, bio, and the total count of articles (with links to each article).**

**WHEN a user has a banned account, THE system SHALL display a clear "This account has been banned" message on their profile page.**

## 3. Section Management

### 3.1 Section Creation

**WHEN a regular administrator creates a new section, THE system SHALL require a name (max 50 characters) and description (max 200 characters).**

**WHEN a section is created, THE system SHALL assign a unique identifier and create a default "general" category for the section.**

### 3.2 Section Visibility

**WHILE browsing sections, THE system SHALL display all sections in alphabetical order by name.**

**WHEN an administrator edits a section, THE system SHALL make the changes visible to all users within 10 seconds.**

## 4. Article Management

### 4.1 Article Creation

**WHEN a user creates a new article, THE system SHALL require a title (max 100 characters), content (max 5000 characters), and selection of one valid section.**

**WHEN an article is created, THE system SHALL automatically generate a unique alphanumeric article ID (e.g., ART-78F3Q9) and timestamp.**

### 4.2 Multimedia Attachments

**WHEN a user attaches a file to an article, THE system SHALL support PDF, DOCX, and XLSX formats with maximum size of 50MB per file.**

**WHEN a user attaches an image to an article, THE system SHALL automatically resize images to 1200x800px while maintaining aspect ratio.**

### 4.3 Article Modification

**WHILE editing an article, THE system SHALL allow modification of title, content, attachments, and tags within 30 minutes of creation.**

**WHEN an article is deleted, THE system SHALL remove all associated attachments and comments immediately.**

## 5. Article List Display

### 5.1 Pagination and Sorting

**WHEN viewing article listings for a section, THE system SHALL display 20 articles per page with the ability to paginate through results.**

**WHILE sorting the article list, THE system SHALL allow sorting by newest first (default), oldest first, or most commented.**

### 5.2 Article Listing Content

**WHILE viewing the article list, THE system SHALL display for each article: title (truncated to 80 characters), author name, tags (comma-separated), comment count, and time posted (relative, e.g., '2 hours ago').**

## 6. Article Viewing

### 6.1 Full Article Display

**WHEN a user views a single article, THE system SHALL display full title, author name, content (formatted with markdown support), attachments (downloadable thumbnails), tags, and publication timestamp.**

**WHEN a user downloads an attachment, THE system SHALL provide a progress bar and confirm successful download within 3 seconds.**

## 7. Search and Filtering

### 7.1 Search Functionality

**WHEN a user performs a search, THE system SHALL allow searching by article title or content with minimum 3-character input.**

**WHILE searching, THE system SHALL display pagination controls and indicate matching article count.**

### 7.2 Tag Filtering

**WHEN a tag is applied as a filter, THE system SHALL show only articles that include the selected tag in their tag set.**

**WHEN multiple tags are selected, THE system SHALL show articles that match ALL selected tags.**

## 8. Comment Management

### 8.1 Comment Creation

**WHEN a user submits a comment, THE system SHALL require at least 1 character of content.**

**WHEN a comment is created, THE system SHALL associate it with the article and display the comment in the chronological order of creation.**

### 8.2 Comment Editing and Deletion

**WHEN a user edits their own comment, THE system SHALL update the comment content within 1 second without changing the timestamps.**

**WHEN a user deletes their comment, THE system SHALL remove it from all viewable article pages immediately.**

## 9. Administrator System

### 9.1 Administrator Role Management

**WHEN a regular administrator requests to become a super administrator, THE system SHALL route the request to an existing super administrator for approval.**

**WHEN a super administrator approves a request, THE system SHALL change the user's role to super administrator within 5 seconds.**

### 9.2 Administrator Capabilities

**WHILE viewing the Administrator Dashboard, THE system SHALL display all content moderation options for articles and comments.**

**WHEN an administrator deletes an article, THE system SHALL remove the article from all viewable lists and associated comments.**

## 10. User Banning System

### 10.1 Banning Workflow

**WHEN an administrator initiates a ban request, THE system SHALL prompt for a valid user email and a detailed ban reason with minimum 20 characters.**

**WHEN a ban is confirmed, THE system SHALL immediately prevent the banned user from logging into the system and display a "Your account has been banned" message.**

### 10.2 Banned User Rights

**WHILE a user is banned, THE system SHALL render all their existing articles and comments in viewable mode for other users with a "Banned Author" tag on articles.**

**WHEN a banned user attempts to view their own profile, THE system SHALL show all articles with an in-app banner indicating their current ban status.**

### 10.3 Ban Reason Logging

**WHEN a ban is initiated, THE system SHALL store the ban reason as free text and associate it with the user account and the administrator who made the request.**

**WHEN viewing the ban history, THE system SHALL display all active and past bans with timestamps, reasons, and status.**