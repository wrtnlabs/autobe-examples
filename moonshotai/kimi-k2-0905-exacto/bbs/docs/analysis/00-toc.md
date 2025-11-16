# Functional Requirements: Economic/Political Discussion Board

## Service Overview
THE Economic/Political Discussion Board SHALL provide a simple, focused platform for discussing economic and political topics with file attachment support. THE system SHALL prioritize simplicity and essential functionality over complex features, making it accessible to users without technical knowledge.

## Authentication Requirements

### User Registration Process
WHEN a new user visits the discussion board, THE system SHALL provide a registration form requiring username, email address, and password. THE username SHALL be unique across the system and contain 3-30 characters including letters, numbers, and underscores only. THE email address SHALL follow standard email format validation and be unique in the system. THE password SHALL require minimum 8 characters including at least one uppercase letter, one lowercase letter, and one number.

WHEN registration details are submitted, THE system SHALL validate all fields within 3 seconds and display specific error messages for any validation failures. IF the username already exists, THEN THE system SHALL suggest available alternatives. IF the email is already registered, THEN THE system SHALL offer password recovery options.

THE system SHALL send a verification email within 2 minutes of successful registration. WHEN the user clicks the verification link, THE system SHALL activate their account within 5 seconds. IF verification is not completed within 24 hours, THEN THE registration SHALL expire and the user must re-register.

### Login Authentication
WHEN a registered user attempts to log in, THE system SHALL accept email and password credentials. THE system SHALL validate credentials within 2 seconds and create a JWT session token valid for 24 hours. THE refresh token SHALL expire after 7 days.

IF a user enters incorrect password 5 times within 1 hour, THEN THE system SHALL lock the account for 30 minutes. THE system SHALL send an email notification about the lockout with unlock instructions. WHEN logging in from a new device, THE system SHALL invalidate previous sessions to maintain single active session per user.

### Guest User Access
GUESTS SHALL browse all public articles and comments without registration. GUESTS SHALL download public file attachments within daily limits. GUESTS SHALL search for discussions using basic search functionality. GUESTS SHALL NOT create articles, post comments, or upload files.

## Article Management System

### Creating New Articles
MEMBERS SHALL create articles by providing title, content, category selection, and optional file attachments. THE article title SHALL contain 10-200 characters. THE article content SHALL contain minimum 100 characters and maximum 10,000 characters. THE category SHALL be selected from predefined options: Economics, Politics, Policy Discussion, Market Analysis, International Affairs.

WHEN creating an article, MEMBERS can attach up to 5 files with total size not exceeding 15MB. THE system SHALL accept image files (JPG, PNG, GIF, WebP) up to 5MB each and document files (PDF, DOC, DOCX, TXT) up to 10MB each. THE system SHALL scan uploaded files for malware within 30 seconds.

THE article creation process SHALL complete within 5 seconds. IF the content contains potentially inappropriate material, THEN THE system SHALL place the article in pending status for moderator review. THE author SHALL receive notification that their article is awaiting moderation.

### Article Categories and Organization
THE system SHALL organize articles into categories for easy discovery. USERS can filter articles by single or multiple categories. THE category filter updates shall complete within 2 seconds. Each category displays article count updated every 60 seconds.

THE homepage displays articles sorted by newest first by default. USERS can sort articles by most commented, most viewed (past 7 days), or oldest first. Articles display with title, author name, publication date, category tags, comment count, and view count.

### Editing Existing Articles
MEMBERS SHALL edit their own articles within 1 hour of creation. WHEN editing, MEMBERS can modify title, content, add or remove attachments. THE system SHALL increment the article version number and store edit history with timestamps.

AFTER the 1-hour edit window expires, ONLY MODERATORS can edit articles. WHEN an article is edited, THE system displays an "Edited" indicator showing the last edit timestamp and editor name.

### Article Display Formatting
THE system preserves user formatting including paragraphs, lists, and quotes with readable spacing. Articles display with 1.5 line spacing and 14px font size for optimal readability. View counts increment each time the article page loads, with session-based rate limiting to prevent artificial inflation.

## Comment System

### Adding Comments to Articles
REGISTERED users SHALL comment on articles within 30 days of article creation. Comments require minimum 10 characters and maximum 1,000 characters. EACH comment is associated with the specific article and contains author ID, timestamp, and original article reference.

Comments appear immediately to the comment author while being marked as "pending" for other users until moderator review for new users or flagged content. Established users with good standing have their comments appear immediately to all users.

THE comment creation process completes within 2 seconds. IF a user posts multiple comments rapidly (within 30 seconds), THEN THE system requires a 3-second delay before accepting the next comment to prevent spam.

### Comment Thread Organization
Comments display chronologically with oldest first by default. THE system allows 3 levels of nested replies maximum to prevent deep threading complexity. THE comment thread loads within 3 seconds for up to 100 comments.

WHILE loading comments, THE system displays a loading indicator. USERS can expand or collapse comment threads to manage discussion flow. New comments since the user's last visit are highlighted for easy identification.

### Editing and Managing Comments
USERS shall edit their comments within 10 minutes of posting. WHEN editing, THE system stores both original and edited versions with timestamps. Edited comments display an "Edited" indicator to other users.

After the 10-minute window expires, ONLY MODERATORS can edit comments for community management purposes. THE system maintains edit history showing all modifications with editor information and timestamps.

## File Attachment System

### Image Attachment Support
USERS can attach common image formats: JPG, JPEG, PNG, GIF, WebP with maximum file size 5MB each. THE system automatically resizes attached images to maximum width 1920px for display optimization while preserving original files for download.

UP TO 10 images can be attached per article. WHILE uploading, THE system displays real-time progress percentage and validates file types before upload completion. Images create automatic thumbnail versions at 150x150px and 400x400px within 5 seconds of upload.

### Document File Attachments
ALLOWED document formats include PDF, DOCX, XLSX, PPTX, TXT with maximum file size 10MB each. USERS can attach up to 5 document files per article combined with image attachments. THE combined total attachment size per article shall not exceed 15MB.

WHEN documents exceed size limits, THE system displays clear error messages specifying maximum allowed sizes. ALL attachments are scanned for viruses during upload with maximum processing time of 30 seconds. Attachments are automatically removed when the parent article is deleted.

### Attachment Security and Access
ATTACHED files inherit the same visibility permissions as the associated article. IF an article is public, THEN attachments are accessible to guests and members. IF an article is member-only, THEN attachments require member authentication for access.

THE system generates unique secure URLs for file downloads with 24-hour expiration for download links. WHEN files are accessed, THE system logs access information with timestamp, user ID, and file reference for security auditing while respecting user privacy.

### Attachment Management Interface
USERS see attached files listed in articles with file name, size, type icon, and upload timestamp. WHILE editing articles within the 1-hour window, USERS can add or remove attachments without restriction. THE attachment list updates automatically without page refresh when attachments are modified.

## User Permissions and Roles

### Guest User Permissions
GUESTS have read-only access to all public articles, comments, and file attachments. GUESTS can search for discussions using basic search functionality and browse content by categories. THE system displays download counts for attachments but does not require guest registration for file downloads.

When guests attempt member-only actions (creating articles, commenting, uploading), THE system displays clear messages about registration benefits and provides prominent registration call-to-action buttons. THE system does not collect personal information from guests beyond technical browsing data required for functionality.

### Member User Privileges
MEMBERS have full community access including creating articles, posting comments, uploading files, and managing their own content. MEMBERS can edit their articles and comments within time limits and delete their content with appropriate confirmation prompts.

MEMBERS can bookmark articles for later reading, follow discussion categories for notifications, and manage their notification preferences. THE system maintains a single active session per member, automatically logging out previous sessions when logging in from new devices.

### Moderator User Capabilities
MODERATORS have elevated permissions to maintain community standards including editing any content, deleting inappropriate content, suspending user accounts, managing article categories, and reviewing flagged content. MODERATOR actions are logged with detailed audit trails including reason codes and affected content references.

WHEN MODERATORS take disciplinary actions, THE system automatically notifies affected users with brief explanations and appeal instructions. MODERATORS require two-factor authentication for login to protect their elevated privileges and maintain account security.

## Search and Discovery

### Basic Search Functionality
THE system provides search across all text content in article titles, content, and author names. Search results return within 5 seconds maximum with results ranked by relevance. THE search supports phrase matching using quotation marks to find exact phrases and highlights search terms within results.

Search results display 20 items per page with pagination for additional results. THE system stores search history for logged-in users with the last 10 searches retained for 30 days. USERS can clear their search history at any time through account settings.

### Filtering and Sorting Options
GUEST users can filter articles by category, date range, and content tags. MEMBERS have additional filter options including bookmarked content, followed topics, and saved searches. Articles can be sorted by newest first, most commented, most viewed (past 7 days), or oldest first.

THE filtering system allows combining up to 5 filter conditions simultaneously. Filter results update within 2 seconds when conditions change. Each filter displays the number of matching results to help users understand the impact of their selections.

### Content Discovery Features
THE homepage displays trending discussions based on articles receiving the most comments and views in the past 24 hours. A sidebar shows popular tags updated every 2 hours based on recent activity across all discussions.

THE system suggests related articles based on the current article's categories and tags to encourage continued engagement. RECENTLY viewed articles are tracked for logged-in users up to 20 articles retained for 90 days for easy return to interesting discussions.

### Search Result Display
Search results display article title, author information, category, relevance score, excerpt with highlighted search terms, and publication date. Results include the total number of matches found and the time taken for the search to complete.

When no results match the query, THE system displays helpful suggestions including search term corrections, related topic suggestions, and guidance for improving search terms. THE system also suggests browsing by categories or popular tags as alternative discovery methods.

## System Limits and Performance

### Content Volume Restrictions
USERS can create maximum 5 new articles per day to prevent spam while allowing active participation. THERE are no limits on comments per article, but comments must be relevant to the discussion topic. USERS can mention up to 3 distinct users per comment to prevent notification spam.

External links in articles are limited to 10 per article with required descriptions for context. Comments can include maximum 3 external links with descriptions. THE system automatically verifies link safety against known malicious domains before display.

### Performance Standards
THE system maintains page load times under 3 seconds for search results and under 1 second for content viewing. File upload processing completes within 10 seconds for files up to 15MB total. Search functionality returns results within 1 second for common queries.

THE system maintains 99% uptime for reading operations and prioritizes content availability during high-traffic periods. All user actions receive appropriate feedback within 2 seconds with loading indicators for longer operations.

### Resource Usage Monitoring
THE system monitors individual user resource usage and applies automatic limitations when thresholds are exceeded. USERS uploading more than 100MB total attachments within 24 hours trigger automatic review with moderator notification. API rate limiting reduces from standard 100 requests per minute to 10 per minute for flagged accounts.

Individual user storage allocation for file attachments is 500MB with automatic notifications when approaching limits. THE system maintains maximum 10 simultaneous sessions per user account, automatically terminating the oldest session when limits are reached.

This comprehensive functional requirements document provides backend developers with specific, testable requirements using EARS format throughout. The requirements define clear boundaries for a simple discussion board while including all essential features for economic and political discourse with file attachment support.