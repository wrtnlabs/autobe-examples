# Economic/Political Discussion Board Requirements

## Introduction

This document defines the complete business requirements for a minimal, focused discussion platform designed for thoughtful economic and political discourse. The system prioritizes content quality, user accountability, and evidence-based conversation over engagement metrics, viral content, or social networking features.

## Core Functionality

### 1. Post Creation and Attribution

WHEN a user wishes to start a new discussion thread, THE system SHALL present a simple text editor with a 200-character minimum limit.

WHEN a user creates a post, THE system SHALL associate the post with their registered username only.

WHILE displaying any post, THE system SHALL NOT show any of the following user metadata:
- Profile picture/avatar
- Join date
- Number of posts or replies
- Reputation score
- Social connections
- Award badges
- Verified status

The sole identifier SHALL be a plain text username without styling, color, or emphasis.

### 2. File and Image Attachment Support

WHEN a user creates or replies to a post, THE system SHALL allow uploading of files and images with the following supported formats:
- Images: .jpg, .jpeg, .png, .gif
- Documents: .pdf, .txt, .docx, .csv

WHEN an attachment is uploaded, THE system SHALL enforce a maximum size limit of 5MB per file.

WHERE a post contains attachments, THE system SHALL display:
- For images: A thumbnail preview scaled to fit within 300px width, with a click-to-zoom option
- For documents: An icon representing the file type, followed by the filename
- All attachments SHALL appear directly below the post text content, in the order they were uploaded

WHEN a user uploads an unsupported file format, THE system SHALL display an inline error message: "Unsupported file type. Please use .jpg, .png, .gif, .pdf, .txt, .docx, or .csv."

WHEN a user attempts to upload a file larger than 5MB, THE system SHALL display an inline error message: "File too large. Maximum size is 5MB."

WHEN a file upload fails due to network error, THE system SHALL prompt the user to retry with a "Retry Upload" button.

### 3. Threaded Replies

WHEN a user replies to a post, THE system SHALL create a child comment thread directly under the parent post.

WHEN a user replies to another reply, THE system SHALL nest the new reply under the parent reply with visual indentation.

THE system SHALL support up to 5 levels of reply nesting.

WHEN a reply is more than 5 levels deep, THE system SHALL display an error: "Maximum comment depth reached. Cannot reply further."

### 4. Minimalist Moderation System

IF a post is reported by three or more distinct users, THEN THE system SHALL:
- Immediately hide the post and all its replies from public view
- Display a banner to all users: "This post is under review by an administrator."
- Notify the post author via in-app notification: "Your post has been reported by 3+ users and is now under review."
- Record the reporting users, times, and reasons (if provided)

WHILE the post is hidden, THE system SHALL NOT count it in any public statistics, search results, or feed rankings.

WHEN an administrator reviews a hidden post, THEY SHALL have two options:
- Approve: Restore the post to public view with a "🏷️ Reviewed by admin" badge below the post content
- Delete: Permanently remove the post and all its replies from the database

WHEN an administrator deletes a post, THE system SHALL:
- Immediately remove the post and all replies from public view
- Send an email or in-app notification to the author: "Your post has been deleted by an administrator for violating community guidelines. Reason: [reason provided]."
- Log the deletion event with timestamp, admin ID, and reason

WHEN a user reports a post, THEY SHALL be prompted to provide a reason from a predefined list:
- Offensive or abusive language
- False or misleading information
- Spam or irrelevant content
- Personal attacks
- Other (with free-text field)

### 5. User Registration and Access

WHEN a user registers for the first time, THE system SHALL require only:
- A unique username (3–20 characters, alphanumeric and underscores only)
- A valid email address (format: user@domain.com)

THE system SHALL NOT require:
- Phone number verification
- Government ID or real name
- Captcha
- Security questions
- Social media login

WHEN a user registers, THE system SHALL:
- Create an unverified account immediately
- Allow immediate posting of text content
- Disable all file and image uploads until email verification is completed
- Send a verification email with a unique, one-time-use link

WHEN a user clicks a valid verification link, THE system SHALL:
- Mark the account as "email verified"
- Enable file and image upload functionality
- Record the timestamp of verification
- Do not change the username or account status otherwise

WHEN a user attempts to register with an already-used username, THE system SHALL display: "Username already taken. Please choose another."

WHEN a user attempts to register with an already-used email address, THE system SHALL display: "An account with this email already exists. Please log in or reset password."

WHEN a user resets their password, THE system SHALL require:
- Entry of the registered email address
- Sending a password reset link
- Creation of a new password with minimum 8 characters

### 6. Administrative Controls

ADMINISTRATORS SHALL have the following additional capabilities:

THEY SHALL be able to ban a user by username or email address.

WHEN a user is banned, THE system SHALL:
- Immediately hide all their posts and replies from public view
- Prevent the user from creating new accounts using the same email or IP address
- Display in the admin panel: "User [username] is banned. Posts hidden. Reposting blocked."

THEY SHALL be able to view a full log of all user reports, moderation actions, and system events.

THEY SHALL receive a daily email summary containing:
- Total number of reported posts
- Number of posts approved
- Number of posts deleted
- Top three reported reasons
- System uptime and health status

THE system SHALL provide a "fast approve" button that restores a reported post in one click without needing to view its content.

### 7. Content Display and Interface

THE system SHALL display all posts in strict chronological order (oldest to newest).

THE system SHALL NOT implement:
- Algorithmic ranking
- "Trending" lists
- "Most popular" sections
- Like/heart buttons
- Share buttons (not even platform native ones)
- Notifications for replies
- Suggested threads
- Search autocomplete

THE search function SHALL be basic:
- Only supports keyword matching in post titles and content
- Returns exact matches only (no fuzzy search)
- Returns at most 50 results
- Shows results in chronological order

THE system SHALL have no advertisements, affiliate links, or sponsored content.

THE system SHALL display no social media buttons, counters, or tracking pixels.

### 8. Performance and Reliability

WHEN a user loads the topic list, THE system SHALL return results in under 1.5 seconds under normal load (100 concurrent users).

WHEN a user uploads a file, THE system SHALL provide upload progress feedback.

THE system SHALL guarantee 99.5% file upload success rate under normal conditions.

WHEN the system experiences downtime, THE system SHALL display a maintenance message instead of error states.

THE system SHALL allow a maximum of 5 simultaneous file uploads per user.

### 9. Authentication and Session Management

WHEN a user logs in, THE system SHALL issue a JWT token with a 24-hour expiration time.

WHEN a user closes their browser, THE system SHALL NOT automatically log them out, but THE system SHALL allow manual logout.

WHEN a user’s token expires, THE system SHALL redirect them to the login page with a message: "Your session has expired. Please log in again."

THE system SHALL support concurrent logins from multiple devices, all using the same token.

THE system SHALL have no "remember me" feature.

WHEN an admin bans a user, THE system SHALL immediately invalidate all active sessions for that user.

### 10. Success Metrics and Analytics

The system SHALL track and report the following metrics for continuous improvement:

*Content Quality Metrics:*
- Average post length (words) — Target: ≥150
- Percentage of posts with attachments — Target: ≥30%
- Percentage of posts with zero replies — Target: ≤20%

*User Retention Metrics:*
- Ratio of registered users who post ≥3 times within 30 days — Target: ≥40%
- Ratio of users who contribute ≥5 replies within 30 days — Target: ≥25%
- Median days between user logins — Target: ≥12 days

*Moderation Efficiency Metrics:*
- Average time between report and admin action — Target: ≤6 hours
- Ratio of reported posts that are deleted — Target: ≤15%
- Average number of reports per admin per week — Target: ≤50

*System Health Metrics:*
- Page load time for topic lists — Target: ≤1.5s
- File upload success rate — Target: ≥99.5%
- Concurrent active users — Target: ≥100

*The service succeeds when users return because they value thoughtful, evidence-based conversation — not because they are addicted to likes, notifications, or popularity