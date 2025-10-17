# Error Handling and Edge Cases for Community Platform

## 1. Overview and Purpose

This document specifies comprehensive error handling, input validation, and edge case management for the Community Platform. It ensures the system behaves predictably and safely under all conditions—from invalid user input to concurrent operations to resource conflicts. Every validation rule, error scenario, and recovery process defined here guides backend developers in creating a robust, reliable platform.

The platform must validate all inputs rigorously, handle authentication and authorization failures gracefully, manage concurrent operations safely, and provide clear, actionable error messages to users.

---

## 2. Input Validation Rules

### 2.1 User Registration and Login Validation

#### Email Address Validation

WHEN a user attempts to register, THE system SHALL validate that the email address conforms to RFC 5322 standard email format. THE system SHALL accept email addresses containing letters, numbers, and special characters (., -, _, +) in the local part and letters, numbers, hyphens in the domain part.

WHEN the email address is not in valid format, THE system SHALL return HTTP 400 Bad Request with error code `REGISTRATION_INVALID_EMAIL` and error message "Please enter a valid email address (example: user@domain.com)".

WHEN a user attempts to register with an email that already exists in the system, THE system SHALL return HTTP 409 Conflict with error code `REGISTRATION_EMAIL_EXISTS` and error message "This email is already registered. Please log in or use a different email." THE system SHALL NOT reveal whether the email belongs to an active or inactive account for security reasons.

WHEN a user logs in, THE system SHALL normalize all email addresses to lowercase before comparison to ensure case-insensitive matching. THE system SHALL reject email addresses longer than 254 characters.

#### Password Requirements

WHEN a user attempts to register or change their password, THE system SHALL enforce the following requirements:
- Minimum 8 characters
- Maximum 128 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one digit (0-9)
- At least one special character (!@#$%^&*)

WHEN the password does not meet requirements, THE system SHALL return HTTP 400 Bad Request with error code `REGISTRATION_WEAK_PASSWORD` and display the specific unmet requirement: "Password must contain at least 8 characters, including uppercase letter, lowercase letter, number, and special character (!@#$%^&*)".

WHEN a user sets a password that contains their username or email address (case-insensitive), THE system SHALL reject with error code `REGISTRATION_PASSWORD_CONTAINS_USERNAME` and message "Password cannot contain your username or email address".

#### Username Validation

WHEN a user attempts to register, THE system SHALL validate that the username meets the following criteria:
- Length: 3 to 32 characters (inclusive)
- Character set: Only alphanumeric characters (A-Z, a-z, 0-9), underscores (_), and hyphens (-)
- Uniqueness: No other account may use this username (case-insensitive)
- Reserved names: Cannot match system-reserved names (admin, moderator, system, root, support)

WHEN the username fails length validation, THE system SHALL return HTTP 400 Bad Request with error code `REGISTRATION_INVALID_USERNAME` and message "Username must be 3-32 characters and contain only letters, numbers, underscores, or hyphens".

WHEN the username already exists in the system, THE system SHALL return HTTP 409 Conflict with error code `REGISTRATION_USERNAME_EXISTS` and message "This username is already taken. Please choose another." THE system SHALL offer to suggest similar available usernames.

### 2.2 Profile Information Validation

#### Bio/About Section

WHEN a user updates their profile bio, THE system SHALL accept a maximum of 500 characters. THE system SHALL strip leading and trailing whitespace before validation. THE system SHALL reject bios that contain only whitespace after stripping.

WHEN a bio exceeds 500 characters, THE system SHALL return HTTP 400 Bad Request with error code `PROFILE_BIO_TOO_LONG` and message "Bio cannot exceed 500 characters. Current length: [X]". THE system SHALL display a character counter in the user interface showing characters remaining.

THE system SHALL sanitize all HTML tags and JavaScript code from bio content before storage, converting `<`, `>`, and `&` characters to HTML entities to prevent XSS attacks. THE system SHALL preserve basic markdown-style formatting (bold, italic) if implemented.

#### Display Name

WHEN a user sets a display name, THE system SHALL accept 1 to 50 characters. THE system SHALL allow letters, numbers, spaces, and basic punctuation (hyphens, apostrophes, periods).

WHEN a display name contains only numbers or special characters, THE system SHALL reject with error code `PROFILE_DISPLAYNAME_INVALID` and message "Display name must contain at least one letter".

WHEN a display name exceeds 50 characters, THE system SHALL return HTTP 400 Bad Request with error code `PROFILE_DISPLAYNAME_TOO_LONG` and message "Display name cannot exceed 50 characters".

WHEN a display name contains excessive consecutive whitespace (more than 2 spaces), THE system SHALL normalize to single spaces before storage.

#### Avatar Image

WHEN a user uploads an avatar image, THE system SHALL validate the following criteria:
- File format: JPEG, PNG, GIF, or WebP only
- Maximum file size: 5 MB (5,242,880 bytes)
- Minimum dimensions: 50x50 pixels
- Maximum dimensions: 2000x2000 pixels

WHEN the file format is not supported, THE system SHALL return HTTP 400 Bad Request with error code `PROFILE_AVATAR_FORMAT_INVALID` and message "Image format not supported. Use JPEG, PNG, GIF, or WebP".

WHEN the file size exceeds 5 MB, THE system SHALL return HTTP 413 Payload Too Large with error code `PROFILE_AVATAR_TOO_LARGE` and message "Avatar file is too large. Maximum size is 5 MB. Your file: [X] MB".

WHEN image dimensions are below 50x50 pixels, THE system SHALL return HTTP 400 Bad Request with error code `PROFILE_AVATAR_TOO_SMALL` and message "Avatar must be at least 50x50 pixels".

WHEN image dimensions exceed 2000x2000 pixels, THE system SHALL return HTTP 400 Bad Request with error code `PROFILE_AVATAR_TOO_LARGE_DIMENSIONS` and message "Avatar dimensions too large. Maximum is 2000x2000 pixels. Your image: [WIDTH]x[HEIGHT]".

THE system SHALL convert all uploaded images to JPEG format for storage optimization while preserving quality. THE system SHALL generate multiple sizes for efficient delivery: thumbnail (50x50), medium (200x200), and full (original size up to 2000x2000).

### 2.3 Community Creation and Settings Validation

#### Community Name

WHEN a member attempts to create a community, THE system SHALL validate that the community name meets these criteria:
- Length: 3 to 32 characters (inclusive)
- Character set: Only alphanumeric characters (A-Z, a-z, 0-9), hyphens (-), and underscores (_)
- Uniqueness: No other community may use this name (case-insensitive)
- Reserved names: Cannot match reserved system names (admin, system, moderator, official, support, help)

WHEN the community name fails validation, THE system SHALL return HTTP 400 Bad Request with specific error code and message indicating the validation failure.

WHEN the community name already exists, THE system SHALL return HTTP 409 Conflict with error code `COMMUNITY_NAME_EXISTS` and message "Community name already taken. Please choose another or visit the existing community".

THE system SHALL convert community names to lowercase for storage and URL slug generation. THE system SHALL generate a URL-safe slug from the community name for use in URLs (converting spaces to hyphens, removing special characters).

#### Community Description

WHEN a user sets a community description during community creation or editing, THE system SHALL accept a maximum of 500 characters. THE system SHALL reject descriptions containing only whitespace after stripping with error code `COMMUNITY_DESCRIPTION_REQUIRED`.

THE system SHALL sanitize HTML tags and script content to prevent XSS attacks. THE system SHALL preserve basic markdown formatting.

#### Community Rules

WHEN a community moderator creates community-specific rules, THE system SHALL accept per rule:
- Maximum 500 characters per individual rule
- Maximum 20 total rules per community
- Each rule must have a title (required) and description (required)

THE system SHALL sanitize all HTML and script content while preserving line breaks and basic formatting. THE system SHALL display rule violations clearly when moderators cite them for content removal.

#### Community Category

WHEN a user selects a community category during creation, THE system SHALL validate the selection against predefined list: Technology, Science, Gaming, Entertainment, Lifestyle, Education, Business, Sports, Health, Other.

WHEN an invalid or unknown category is selected, THE system SHALL return HTTP 400 Bad Request with error code `COMMUNITY_CATEGORY_INVALID` and message "Invalid category. Please select from available options".

### 2.4 Post Content Validation

#### Text Posts

WHEN a member creates a text post, THE system SHALL require:
- Title: Minimum 1 character, maximum 300 characters (required)
- Body content: 0 to 40,000 characters (optional—title-only posts allowed)

WHEN a title is empty or contains only whitespace, THE system SHALL return HTTP 400 Bad Request with error code `POST_TITLE_REQUIRED` and message "Post title is required".

WHEN a title exceeds 300 characters, THE system SHALL return HTTP 400 Bad Request with error code `POST_TITLE_TOO_LONG` and message "Post title cannot exceed 300 characters. Current length: [X]".

WHEN a post body exceeds 40,000 characters, THE system SHALL return HTTP 400 Bad Request with error code `POST_BODY_TOO_LONG` and message "Post body cannot exceed 40,000 characters. Current length: [X]".

WHEN both title and body are empty or contain only whitespace, THE system SHALL return HTTP 400 Bad Request with error code `POST_CONTENT_REQUIRED` and message "Post must contain either a title with content or a link".

THE system SHALL reject posts containing malicious content (scripts, executable code). THE system SHALL sanitize HTML tags and JavaScript while preserving safe markdown-style formatting (bold, italic, links, code blocks).

#### Link Posts

WHEN a member creates a link post, THE system SHALL require:
- Title: Minimum 1 character, maximum 300 characters (required)
- URL: Valid HTTP/HTTPS URL, maximum 2,000 characters (required)

WHEN a URL is provided without protocol, THE system SHALL automatically prepend `https://` to the URL. WHEN a URL uses unsupported protocol (ftp://, file://, etc.), THE system SHALL reject with error code `POST_URL_INVALID_PROTOCOL` and message "Only http:// and https:// URLs supported".

WHEN a URL points to internal network ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.1), THE system SHALL reject with error code `POST_URL_INTERNAL` and message "Cannot link to internal network URLs".

WHEN a URL exceeds 2,000 characters, THE system SHALL reject with error code `POST_URL_TOO_LONG` and message "URL is too long. Keep it under 2000 characters".

THE system SHALL verify URL is reachable by making HTTP HEAD request with 5 second timeout. WHEN URL is unreachable (no 2xx or 3xx response), THE system SHALL reject with error code `POST_URL_UNREACHABLE` and message "Cannot access URL. Verify it's correct and publicly accessible". EXCEPTION: THE system SHALL allow post creation if URL verification service is temporarily down to prevent blocking legitimate posts.

THE system SHALL use URL reputation API to check for known malicious URLs. WHEN URL is flagged as malicious or phishing, THE system SHALL reject with error code `POST_URL_MALICIOUS` and message "This URL has been flagged as potentially unsafe".

#### Image Posts

WHEN a member creates an image post, THE system SHALL require:
- Title: Minimum 1 character, maximum 300 characters (required)
- Images: Minimum 1 image, maximum 20 images (required)

WHEN user attempts to create image post without uploading any images, THE system SHALL return HTTP 400 Bad Request with error code `POST_IMAGES_REQUIRED` and message "Please upload at least one image".

WHEN user attempts to upload more than 20 images, THE system SHALL return HTTP 400 Bad Request with error code `POST_TOO_MANY_IMAGES` and message "Maximum 20 images per post. You've selected [X]".

For each image upload, THE system SHALL validate:
- Format: JPEG, PNG, GIF, or WebP only
- File size: Maximum 50 MB per image
- Dimensions: Minimum 100x100 pixels, maximum 8000x8000 pixels

WHEN image format is unsupported, THE system SHALL return HTTP 400 Bad Request with error code `IMAGE_FORMAT_UNSUPPORTED` and message "Image format not supported. Use JPEG, PNG, GIF, or WebP".

WHEN individual image exceeds 50 MB, THE system SHALL return HTTP 413 Payload Too Large with error code `IMAGE_TOO_LARGE` and message "Image file too large. Maximum is 50 MB. File size: [X] MB".

WHEN image dimensions are below 100x100 pixels, THE system SHALL return HTTP 400 Bad Request with error code `IMAGE_TOO_SMALL` and message "Image must be at least 100x100 pixels. Your image: [WIDTH]x[HEIGHT]".

WHEN image dimensions exceed 8000x8000 pixels, THE system SHALL return HTTP 400 Bad Request with error code `IMAGE_TOO_LARGE_DIMENSIONS` and message "Image dimensions too large. Maximum is 8000x8000 pixels. Your image: [WIDTH]x[HEIGHT]".

THE system SHALL automatically remove geolocation EXIF data from images for privacy protection. THE system SHALL preserve other EXIF metadata (camera info, date taken, ISO, aperture). THE system SHALL strip creator, software, and other sensitive metadata fields.

THE system SHALL generate multiple optimized sizes for delivery: thumbnail (300x300), medium (800x800), and full resolution (original, preserved).

### 2.5 Comment Content Validation

#### Comment Text

WHEN a member posts a comment, THE system SHALL require between 1 and 10,000 characters of content. WHEN comment contains only whitespace, THE system SHALL return HTTP 400 Bad Request with error code `COMMENT_EMPTY` and message "Comment cannot be empty".

WHEN comment exceeds 10,000 characters, THE system SHALL return HTTP 400 Bad Request with error code `COMMENT_TOO_LONG` and message "Comment cannot exceed 10,000 characters. Current length: [X]".

THE system SHALL sanitize HTML tags and script content while preserving markdown-style formatting. THE system SHALL allow code blocks with syntax highlighting support.

#### Nested Reply Requirements

WHEN a member replies to a comment, THE system SHALL verify:
- Parent comment exists and has not been deleted
- Post containing the comment exists and has not been deleted
- Nesting depth does not exceed 10 levels

WHEN parent comment has been deleted, THE system SHALL return HTTP 404 Not Found with error code `PARENT_COMMENT_DELETED` and message "Cannot reply to a deleted comment".

WHEN the post has been deleted, THE system SHALL return HTTP 404 Not Found with error code `POST_DELETED` and message "Cannot comment on deleted post".

WHEN reply would exceed maximum nesting depth of 10 levels, THE system SHALL return HTTP 400 Bad Request with error code `REPLY_TOO_DEEP` and message "Maximum reply depth (10 levels) reached. Reply to an earlier comment in this thread instead".

### 2.6 Search and Filter Input Validation

#### Search Query Validation

WHEN a user submits a search query, THE system SHALL accept 1 to 500 characters. THE system SHALL strip leading and trailing whitespace before processing. THE system SHALL reject queries containing only special characters or operators with error code `SEARCH_QUERY_INVALID`.

WHEN search query contains potential injection attempts (SQL special characters, operators), THE system SHALL escape all special characters to prevent injection attacks. THE system SHALL use parameterized queries regardless of input content.

THE system SHALL validate all filter parameters (sort order, date range, content type) against allowed values. WHEN invalid filter value provided, THE system SHALL reject with HTTP 400 Bad Request with error code `SEARCH_FILTER_INVALID` and message "Invalid filter value provided".

#### Date Range Filtering

WHEN user specifies date range for filtering, THE system SHALL validate:
- Start date is before or equal to end date
- Both dates are not in the future
- Date range does not exceed 10 years (to prevent performance issues)

WHEN start date is after end date, THE system SHALL return HTTP 400 Bad Request with error code `DATE_RANGE_INVALID` and message "Start date must be before end date".

WHEN either date is in the future, THE system SHALL return HTTP 400 Bad Request with error code `DATE_IN_FUTURE` and message "Please select dates from the past".

### 2.7 File Upload General Validation

#### File Size Limits

THE system SHALL enforce maximum 100 MB total file size per request. WHEN total upload exceeds 100 MB, THE system SHALL return HTTP 413 Payload Too Large with error code `UPLOAD_SIZE_EXCEEDED` and message "Upload too large. Maximum total size is 100 MB".

THE system SHALL check file size before full upload processing to fail fast and save bandwidth.

#### File Type Validation

THE system SHALL validate file MIME type matches expected content type. THE system SHALL verify file headers (magic numbers) match declared type to prevent disguised malicious files. THE system SHALL reject executable files (.exe, .sh, .bat, .com, .scr, .vbs) with error code `UPLOAD_EXECUTABLE_FILE`.

THE system SHALL reject archive files (.zip, .rar, .7z, .tar, .gz) with error code `UPLOAD_ARCHIVE_FILE` and message "Archive files are not supported. Upload individual files instead".

#### Filename Sanitization

WHEN file is uploaded, THE system SHALL sanitize filename by:
- Removing special characters and spaces
- Converting to lowercase
- Replacing spaces with underscores
- Rejecting paths containing directory traversal (../, ..\)
- Enforcing maximum filename length of 255 characters

THE system SHALL NOT use user-provided filename in actual file paths. THE system SHALL generate random safe filename internally and store original filename separately if needed.

---

## 3. Authentication Errors

### 3.1 Registration Failures

#### Duplicate Email

WHEN a user attempts registration with an email already in the system, THE system SHALL return HTTP 409 Conflict with error code `REGISTRATION_EMAIL_EXISTS` and message "This email is already registered. Please log in or use a different email". THE system SHALL NOT reveal whether the email belongs to an active or inactive account (security principle).

THE system SHALL check email uniqueness before processing password or other fields (fail fast).

#### Invalid Email Format

WHEN email format is invalid (missing @, invalid domain, etc.), THE system SHALL return HTTP 400 Bad Request with error code `REGISTRATION_INVALID_EMAIL` and message "Please enter a valid email address (example: user@domain.com)".

THE system SHALL provide example of valid format in error message.

#### Weak Password

WHEN password does not meet requirements, THE system SHALL return HTTP 400 Bad Request with error code `REGISTRATION_WEAK_PASSWORD` and specific message indicating which requirements are not met: "Password must contain at least 8 characters, including uppercase letter, lowercase letter, number, and special character (!@#$%^&*)".

THE system SHALL display all requirements in error message rather than generic "password too weak" message.

#### Invalid Username

WHEN username is invalid (wrong length, disallowed characters, reserved name), THE system SHALL return HTTP 400 Bad Request with error code `REGISTRATION_INVALID_USERNAME` and message "Username must be 3-32 characters and contain only letters, numbers, underscores, or hyphens. Cannot use reserved names like admin".

THE system SHALL suggest why username was rejected and how to fix it.

#### Duplicate Username

WHEN username already exists in system, THE system SHALL return HTTP 409 Conflict with error code `REGISTRATION_USERNAME_EXISTS` and message "This username is already taken. Please choose another". THE system SHALL offer to suggest similar available usernames.

### 3.2 Login Failures

#### Non-Existent User or Incorrect Password

WHEN user attempts login with email not in system OR with incorrect password, THE system SHALL return HTTP 401 Unauthorized with error code `LOGIN_INVALID_CREDENTIALS` and generic message "Email or password is incorrect".

THE system SHALL use identical error message for both cases to prevent account enumeration attacks (attacker determining which emails exist).

THE system SHALL increment failed login counter for the account regardless of whether email exists.

#### Account Locked (Too Many Failed Attempts)

WHEN account receives 5 failed login attempts within 15 minutes, THE system SHALL temporarily lock the account. THE system SHALL return HTTP 429 Too Many Requests with error code `LOGIN_ACCOUNT_LOCKED` and message "Account temporarily locked due to multiple failed login attempts. Please try again in 30 minutes or reset your password".

THE system SHALL automatically unlock account after 30 minutes and reset failed login counter.

THE system SHALL send password reset email to account: "Your account was locked due to multiple failed login attempts. If this wasn't you, reset your password: [link]".

THE system SHALL also limit login attempts by IP address: maximum 10 failed attempts per IP per 24 hours. WHEN IP limit exceeded, THE system SHALL lock IP address for 1 hour.

#### Email Not Verified

WHEN user tries to log in with unverified email address, THE system SHALL return HTTP 403 Forbidden with error code `LOGIN_EMAIL_NOT_VERIFIED` and message "Please verify your email address. Check your inbox for verification link or request a new one". THE system SHALL provide inline button to resend verification email.

#### Account Suspended

WHEN user account is suspended by moderators or admins, THE system SHALL return HTTP 403 Forbidden with error code `LOGIN_ACCOUNT_SUSPENDED` and message "This account has been suspended. Please contact support for more information". THE system SHALL include support contact information.

#### Account Deleted

WHEN user account has been deleted, THE system SHALL return HTTP 404 Not Found with error code `LOGIN_ACCOUNT_NOT_FOUND` and message "This account does not exist". THE system SHALL NOT differentiate between never-existed and deleted accounts (prevent enumeration).

### 3.3 Email Verification Failures

#### Invalid or Expired Verification Link

WHEN user clicks verification link with invalid or expired token, THE system SHALL return HTTP 400 Bad Request with error code `VERIFICATION_LINK_INVALID` and message "Verification link is invalid or has expired. Request a new verification link". THE system SHALL provide button to resend verification email.

THE system SHALL track when verification link was generated and reject if older than 24 hours.

#### Token Mismatch

WHEN verification token does not match stored token for the account, THE system SHALL return HTTP 400 Bad Request with error code `VERIFICATION_TOKEN_MISMATCH` and message "Verification link is invalid. Please request a new one".

#### Already Verified

WHEN user attempts to verify already-verified email address, THE system SHALL return HTTP 200 OK (success) with message "Email is already verified". THE system SHALL NOT create duplicate verification records.

### 3.4 Password Reset Failures

#### Invalid or Expired Reset Token

WHEN password reset token is expired (older than 24 hours), THE system SHALL return HTTP 400 Bad Request with error code `RESET_TOKEN_EXPIRED` and message "Password reset link has expired. Request a new one". THE system SHALL provide button to request new reset link.

WHEN reset token has already been used (one-time token), THE system SHALL return HTTP 400 Bad Request with error code `RESET_TOKEN_ALREADY_USED` and message "This reset link has already been used. Request a new password reset".

#### Missing Email for Reset Request

WHEN reset request is submitted without email address, THE system SHALL return HTTP 400 Bad Request with error code `RESET_EMAIL_REQUIRED` and message "Please enter your email address".

#### Invalid Password Provided

WHEN new password violates requirements, THE system SHALL return HTTP 400 Bad Request with error code `RESET_PASSWORD_INVALID` and display specific requirement violations.

#### Same as Previous Password

WHEN user sets new password identical to current password, THE system SHALL return HTTP 400 Bad Request with error code `RESET_PASSWORD_UNCHANGED` and message "New password must be different from current password".

### 3.5 Session and Token Errors

#### Invalid or Malformed JWT Token

WHEN JWT token is malformed, corrupted, or has invalid signature, THE system SHALL return HTTP 401 Unauthorized with error code `TOKEN_INVALID` and message "Authentication failed. Please log in again". THE system SHALL NOT expose token decoding errors.

#### Expired JWT Token

WHEN JWT token has expired, THE system SHALL return HTTP 401 Unauthorized with error code `TOKEN_EXPIRED` and message "Your session has expired. Please log in again". THE system SHALL allow client to use refresh token to obtain new access token without re-authentication.

#### Invalid Refresh Token

WHEN refresh token is invalid, expired, or has been revoked, THE system SHALL return HTTP 401 Unauthorized with error code `REFRESH_TOKEN_INVALID` and message "Session refresh failed. Please log in again".

THE system SHALL revoke all refresh tokens when user logs out or resets password.

#### Missing Authorization Header

WHEN request lacks Authorization header, THE system SHALL return HTTP 401 Unauthorized with error code `AUTH_HEADER_MISSING` and message "Authentication required. Please log in".

---

## 4. Authorization Errors

### 4.1 Permission Denied Scenarios

#### Guest User Attempting Restricted Action

WHEN guest user attempts to create post, vote, comment, or perform other member-only actions, THE system SHALL return HTTP 403 Forbidden with error code `PERMISSION_GUEST_RESTRICTED` and message "You must be logged in to perform this action. Please log in or register" with links to login/registration pages.

#### Member Attempting Admin Action

WHEN member user without admin role attempts to access admin functions, THE system SHALL return HTTP 403 Forbidden with error code `PERMISSION_ADMIN_REQUIRED` and message "This action requires administrator privileges".

#### Non-Moderator Attempting Moderation

WHEN user without moderator role attempts moderation actions, THE system SHALL return HTTP 403 Forbidden with error code `PERMISSION_MODERATOR_REQUIRED` and message "You do not have permission to perform this action. Moderators only".

### 4.2 Community Permission Errors

#### Private Community Access Denial

WHEN non-member user attempts to access private community, THE system SHALL return HTTP 403 Forbidden with error code `COMMUNITY_ACCESS_DENIED` and message "This is a private community. You must be a member to access it". THE system SHALL display community name and option to request membership.

THE system SHALL not expose community post count or member list to non-members.

#### Non-Member Posting to Private Community

WHEN non-member attempts to create post in private community, THE system SHALL return HTTP 403 Forbidden with error code `COMMUNITY_POST_DENIED` and message "You must be a member of this community to post. Request to join first".

#### Banned User Accessing Community

WHEN banned user attempts to access community, THE system SHALL return HTTP 403 Forbidden with error code `COMMUNITY_USER_BANNED` and message "You have been banned from this community". THE system SHALL include ban reason and duration if available.

#### Moderator Action on Non-Moderated Community

WHEN moderator attempts moderation action in community they don't moderate, THE system SHALL return HTTP 403 Forbidden with error code `MODERATOR_NOT_ASSIGNED` and message "You do not moderate this community".

### 4.3 Content Ownership Errors

#### Non-Author Attempting Post Edit

WHEN user attempts to edit post not created by them, THE system SHALL return HTTP 403 Forbidden with error code `CONTENT_NOT_AUTHOR` and message "You can only edit your own posts". EXCEPTION: Moderators and admins can edit any post in their communities.

#### Non-Author Attempting Comment Edit

WHEN user attempts to edit comment not created by them, THE system SHALL return HTTP 403 Forbidden with error code `CONTENT_NOT_AUTHOR` and message "You can only edit your own comments". EXCEPTION: Moderators and admins can edit any comment.

#### Attempting to Delete Others' Post

WHEN user attempts to delete post not created by them, THE system SHALL return HTTP 403 Forbidden with error code `CONTENT_NOT_AUTHOR` and message "You can only delete your own posts". EXCEPTION: Moderators and admins can delete any post.

### 4.4 Voting Permission Errors

#### Guest User Voting

WHEN guest user attempts to vote, THE system SHALL return HTTP 403 Forbidden with error code `PERMISSION_GUEST_VOTE` and message "You must be logged in to vote. Please log in or register".

#### Voting on Self-Owned Content

WHEN user attempts to vote on their own post or comment, THE system SHALL return HTTP 400 Bad Request with error code `VOTE_SELF_VOTE` and message "You cannot vote on your own posts".

#### Voting on Non-Existent Content

WHEN user attempts to vote on deleted or non-existent content, THE system SHALL return HTTP 404 Not Found with error code `CONTENT_NOT_FOUND` and message "This content is no longer available".

#### Voting on Locked Content

WHEN user attempts to vote on content that has been locked by moderators, THE system SHALL return HTTP 403 Forbidden with error code `CONTENT_LOCKED` and message "Voting is disabled on this content".

---

## 5. Resource Not Found Scenarios

### 5.1 User Resource Not Found

#### Non-Existent User Profile

WHEN user requests profile of user that doesn't exist, THE system SHALL return HTTP 404 Not Found with error code `USER_NOT_FOUND` and message "User profile not found". THE system SHALL offer to search for similar usernames or browse communities.

#### Deleted User Profile

WHEN deleted user's profile is accessed, THE system SHALL return HTTP 404 Not Found with error code `USER_DELETED` and message "This user account has been deleted". THE system SHALL NOT differentiate between deleted and never-existed accounts.

### 5.2 Community Resource Not Found

#### Non-Existent Community

WHEN user requests community that doesn't exist, THE system SHALL return HTTP 404 Not Found with error code `COMMUNITY_NOT_FOUND` and message "Community not found. Please check the spelling and try again". THE system SHALL offer to search similar community names or browse community list.

#### Archived Community

WHEN user accesses archived community, THE system SHALL return HTTP 410 Gone with error code `COMMUNITY_ARCHIVED` and message "This community has been archived and is no longer active". THE system SHALL allow read-only access to community history.

### 5.3 Post Resource Not Found

#### Non-Existent Post

WHEN user requests post that doesn't exist, THE system SHALL return HTTP 404 Not Found with error code `POST_NOT_FOUND` and message "Post not found".

#### Deleted Post

WHEN user accesses post deleted by author, THE system SHALL return HTTP 404 Not Found with error code `POST_DELETED` and message "This post has been deleted". EXCEPTION: Post author and moderators can still view deleted post with "[deleted]" marker showing it was author-deleted.

THE system SHALL track whether post was deleted by author vs removed by moderator for context.

#### Post Removed by Moderator

WHEN user accesses post removed by moderators for policy violation, THE system SHALL return HTTP 410 Gone with error code `POST_REMOVED` and message "This post has been removed by moderators. Reason: [specific reason if available]".

Post author SHALL see the removal reason and appeal option. Other users SHALL see generic "removed" message without details.

### 5.4 Comment Resource Not Found

#### Non-Existent Comment

WHEN user requests comment that doesn't exist, THE system SHALL return HTTP 404 Not Found with error code `COMMENT_NOT_FOUND` and message "Comment not found".

#### Deleted Comment

WHEN user accesses deleted comment, THE system SHALL display "[deleted]" placeholder in comment thread. EXCEPTION: Comment author and moderators can view deleted comment with "[deleted]" marker.

THE system SHALL preserve comment in parent-child relationships to maintain thread structure.

#### Comment Removed by Moderator

WHEN user accesses removed comment, THE system SHALL display "[removed]" placeholder in thread. Comment author SHALL see removal reason and appeal option.

THE system SHALL preserve removed comment in thread structure to show discussion context.

---

## 6. Duplicate Content Handling

### 6.1 Post Duplication Prevention

#### Identical Post Within Same Community

WHEN user creates post with title and content identical to their own previous post in same community (created within last 1 minute), THE system SHALL reject with HTTP 409 Conflict with error code `POST_DUPLICATE` and message "This post already exists. [Link to existing post]".

THE system SHALL check for duplicates before committing to database (fail fast).

#### Accidental Resubmission

WHEN user submits post form twice within 5 seconds, THE system SHALL reject duplicate with HTTP 429 Too Many Requests with error code `POST_DUPLICATE_SUBMISSION` and message "Your post is being processed. Please wait".

THE system SHALL implement both client-side (disable submit button) and server-side (idempotency keys) duplicate prevention.

### 6.2 Comment Duplication Prevention

#### Identical Comment Submission

WHEN user submits comment identical to their previous comment on same post within 1 minute, THE system SHALL reject with HTTP 409 Conflict with error code `COMMENT_DUPLICATE` and message "You already posted this comment. [Link to original comment]".

THE system SHALL check exact text match to detect duplicates.

#### Accidental Resubmission

WHEN user submits comment form twice within 5 seconds, THE system SHALL prevent duplicate with HTTP 429 Too Many Requests with error code `COMMENT_DUPLICATE_SUBMISSION`.

### 6.3 Report Duplication Prevention

#### Duplicate Report on Same Content

WHEN user reports content they have already reported, THE system SHALL reject with HTTP 409 Conflict with error code `REPORT_ALREADY_SUBMITTED` and message "You have already reported this content. Report ID: [ID]".

THE system SHALL display existing report ID for user reference.

---

## 7. Rate Limiting and Abuse Prevention

### 7.1 Post Creation Rate Limits

#### User Post Creation Limit

THE system SHALL limit each user to maximum 10 posts per community per day (24-hour rolling window). THE system SHALL limit new users (account age less than 7 days) to maximum 3 posts per day across all communities.

WHEN rate limit is exceeded, THE system SHALL return HTTP 429 Too Many Requests with error code `RATELIMIT_POST_CREATION` and message "You are posting too frequently. You can post again in [X] hours. Daily limit: 10 posts per community".

THE system SHALL track remaining posts allowed for current period and display in user interface.

#### Community Post Creation Limit

THE system SHALL limit posts in single community to 1000 per hour total (across all users). WHEN community exceeds limit, THE system SHALL return HTTP 429 Too Many Requests with error code `RATELIMIT_COMMUNITY_POSTS` and message "This community is experiencing high activity. Please try again later".

### 7.2 Comment Creation Rate Limits

#### User Comment Rate Limit

THE system SHALL limit each user to maximum 50 comments per hour. THE system SHALL limit new users (less than 7 days old) to maximum 10 comments per hour.

WHEN rate limit exceeded, THE system SHALL return HTTP 429 Too Many Requests with error code `RATELIMIT_COMMENT_CREATION` and message "You are commenting too frequently. Please wait [X] seconds before commenting again".

#### Post Comment Rate Limit

THE system SHALL limit single post to maximum 500 comments per hour. WHEN post exceeds limit, THE system SHALL display message "This post is receiving too many comments. Some may not be visible immediately" but still accept comment.

### 7.3 Vote Rate Limiting

#### Vote Spam Prevention

THE system SHALL limit user to 100 votes per minute. THE system SHALL limit user to 1000 votes per hour.

WHEN rate limit exceeded, THE system SHALL return HTTP 429 Too Many Requests with error code `RATELIMIT_VOTING` and message "You are voting too frequently. Please wait before voting again".

#### Vote Reversal Limit

THE system SHALL prevent changing vote on same content more than 10 times per hour. WHEN limit exceeded, THE system SHALL return HTTP 429 Too Many Requests with error code `RATELIMIT_VOTE_CHANGE` and message "You are changing your vote too frequently on this content".

### 7.4 Report Spam Prevention

#### User Report Rate Limit

THE system SHALL limit each user to 10 reports per day. THE system SHALL limit new users to 3 reports per day. THE system SHALL limit user to maximum 5 reports on same content type per day.

WHEN rate limit exceeded, THE system SHALL return HTTP 429 Too Many Requests with error code `RATELIMIT_REPORTING` and message "You have reached your daily report limit. Please try again tomorrow".

#### False Report Consequence

WHEN user submits 3 or more reports rejected/dismissed by moderators in 7 days, THE system SHALL flag user account and send warning: "Multiple reports you submitted were dismissed. Please review community guidelines".

WHEN user submits 5 rejected reports in 7 days, THE system SHALL suspend user's reporting ability for 7 days. THE system SHALL return HTTP 429 Too Many Requests with error code `RATELIMIT_REPORTING_SUSPENDED` and message "Your reporting privileges have been suspended due to multiple false reports. You can report again on [date]".

### 7.5 Registration Rate Limiting

#### Registration Attempt Limit

THE system SHALL limit registration attempts to 5 new accounts per IP address per day. THE system SHALL limit registration to 5 new accounts per email domain per day.

WHEN rate limit exceeded, THE system SHALL return HTTP 429 Too Many Requests with error code `RATELIMIT_REGISTRATION` and message "Too many registration attempts from this location. Please try again tomorrow".

### 7.6 Login Attempt Rate Limiting

#### Failed Login Attempt Limit

THE system SHALL limit login attempts to 5 failures per 15 minutes per account. THE system SHALL limit login attempts to 10 failures per 24 hours per IP address.

Already detailed in Authentication Errors section 3.2.

### 7.7 Search Rate Limiting

#### Search Query Rate Limit

THE system SHALL limit each user to 30 search queries per minute. THE system SHALL limit each IP address to 60 search queries per minute.

WHEN rate limit exceeded, THE system SHALL return HTTP 429 Too Many Requests with error code `RATELIMIT_SEARCH` and message "Search is temporarily unavailable. Please try again in a few moments".

#### Complex Query Protection

THE system SHALL detect computationally expensive searches (wildcard-heavy, boolean-complex). THE system SHALL limit such queries to 1 per minute per user.

WHEN limit exceeded, THE system SHALL return HTTP 429 with error code `RATELIMIT_SEARCH_COMPLEX` and message "Complex searches are limited to 1 per minute".

### 7.8 API Rate Limiting

#### General API Rate Limit

THE system SHALL limit each authenticated user to 1000 API requests per hour. THE system SHALL limit each IP address to 100 API requests per minute for unauthenticated requests.

WHEN rate limit exceeded, THE system SHALL return HTTP 429 Too Many Requests with response headers including `Retry-After: [seconds]`.

---

## 8. Concurrency and Race Conditions

### 8.1 Vote Count Race Conditions

#### Simultaneous Upvote/Downvote Conflict

WHEN user upvotes content at exact same time as another user downvotes, THE system SHALL use database-level atomic operations to ensure both votes are counted correctly. THE system SHALL NOT use application-level read-modify-write patterns.

THE system SHALL verify final vote count equals sum of all individual vote records.

#### Vote Count Accuracy Under Load

THE system SHALL maintain vote count accuracy even with 1000 concurrent votes on same content. THE system SHALL use atomic database operations (INCREMENT, DECREMENT) rather than application-level calculations.

THE system SHALL verify vote count accuracy within 5 seconds of vote submission.

#### Vote Change Race Condition

WHEN user changes vote while content is being deleted, THE system SHALL handle safely. IF content is deleted first, THE system SHALL reject vote change with `CONTENT_NOT_FOUND`. IF vote change processed first, THE system SHALL delete vote record along with content.

### 8.2 Karma Calculation Under Concurrency

#### Simultaneous Karma Updates

THE system SHALL ensure karma calculations are accurate even with concurrent vote changes. THE system SHALL use atomic transactions for karma updates.

FORMULA FOR VERIFICATION: User karma = SUM(upvotes on user's posts and comments) - SUM(downvotes on user's posts and comments).

THE system SHALL spot-check random users' karma weekly to verify accuracy.

#### Karma Race During Vote Change

WHEN user changes vote and karma is being calculated simultaneously, THE system SHALL lock user's karma calculation during vote processing. THE system SHALL complete calculation atomically (all-or-nothing).

### 8.3 Post/Comment Deletion Race Conditions

#### Simultaneous Deletion and Voting

WHEN post is deleted at exact moment another user votes on it, THE system SHALL handle safely. IF deletion processes first, THE system SHALL reject vote with `CONTENT_NOT_FOUND`. IF vote processes first, THE system SHALL delete vote along with content.

THE system SHALL NOT allow orphaned votes to exist without associated content.

#### Nested Comment Deletion Race

WHEN parent comment is deleted while child comment is being created, THE system SHALL reject child comment with HTTP 404 Not Found with error code `PARENT_COMMENT_DELETED` and message "The parent comment has been deleted".

#### Post Deletion While Comment Being Posted

WHEN post is deleted while user is composing comment, THE system SHALL reject comment submission with HTTP 404 Not Found with error code `POST_DELETED` and message "The post has been deleted".

### 8.4 Subscription State Race Conditions

#### Simultaneous Subscribe/Unsubscribe

WHEN user subscribes to community while simultaneously unsubscribing, THE system SHALL process only one action using database-level locking. THE final state SHALL reflect either subscribed or unsubscribed (no intermediate states exposed to user).

### 8.5 Optimistic Locking Implementation

#### Version-Based Concurrency Control

THE system SHALL implement optimistic locking using version fields on critical resources (posts, comments, user profiles, community settings). THE system SHALL include version number in all updates.

WHEN version mismatch detected during update, THE system SHALL return HTTP 409 Conflict with error code `RESOURCE_VERSION_CONFLICT` and message "This content was modified by another user. Please refresh and try again".

---

## 9. Data Consistency Rules

### 9.1 Orphaned Comments After Post Deletion

#### Deletion Strategy

WHEN post is deleted, THE system SHALL immediately delete all associated comments using cascade delete with transaction for atomicity. THE system SHALL also delete nested replies to deleted comments.

THE system SHALL NOT leave orphaned comments with no parent post.

#### Karma Reversal

THE system SHALL remove karma gained from deleted post's comments. THE system SHALL send notification to comment authors: "Your comment was deleted because the post was removed".

### 9.2 Orphaned Votes After Content Deletion

#### Vote Record Management

WHEN post or comment is deleted, THE system SHALL delete all associated votes in same transaction. THE system SHALL reverse karma earned from those votes in real-time.

### 9.3 Vote Count Accuracy

#### Vote Count Verification

THE system SHALL verify vote count matches count of vote records in database. THE system SHALL run consistency check every hour (background job). WHEN discrepancy found, THE system SHALL log error and recalculate from source of truth.

### 9.4 Karma Recalculation Scenarios

#### User Karma Consistency

THE system SHALL periodically (weekly) recalculate user karma from scratch using formula: User karma = SUM(upvotes on posts) - SUM(downvotes on posts) + SUM(upvotes on comments) - SUM(downvotes on comments).

WHEN discrepancy found, THE system SHALL correct to calculated value and log correction in audit trail.

### 9.5 Subscription State Consistency

#### Subscription Record Integrity

THE system SHALL ensure each subscription record is unique (user ID + community ID combination). THE system SHALL use database unique constraint to enforce this.

THE system SHALL not allow duplicate subscription records.

### 9.6 Comment Thread Integrity

#### Parent-Child Relationships

THE system SHALL verify each comment's parent ID references valid comment or post. THE system SHALL prevent orphaned comments using foreign key constraints.

#### Nested Reply Depth Tracking

THE system SHALL maintain accurate depth level for each comment. WHEN comment tree is traversed, THE system SHALL verify depth doesn't exceed 10 levels.

THE system SHALL recalculate depth weekly to ensure accuracy.

---

## 10. User-Friendly Error Messages

### 10.1 Error Message Guidelines

#### Message Structure

EVERY error message SHALL be clear, concise, and actionable. Error messages SHALL be 1-2 sentences maximum. Error messages SHALL suggest recovery action when applicable. Error messages SHALL avoid technical jargon (no stack traces, no SQL, no internal error IDs in user-facing messages).

#### Tone and Empathy

Error messages SHALL use friendly, professional tone. Error messages SHALL NOT blame the user. Error messages SHALL include specific details about what went wrong. Error messages SHALL acknowledge frustration when appropriate: "We're sorry, something went wrong".

### 10.2 Error Message Categories

#### Validation Errors

Format: "What was wrong: [specific field]. What is required: [requirement]. What to do: [action]".

✅ Example: "Email is invalid. Please use format: user@example.com"

#### Authentication Errors

Format: "What failed: [action]. What to do: [recovery action]".

✅ Example: "Your session has expired. Please log in again. [Login Button]"

#### Authorization Errors

Format: "What you tried to do: [action]. Why denied: [reason]. What you can do: [alternatives]".

✅ Example: "You don't have permission to edit this post. Only post author can edit."

#### Not Found Errors

Format: "What you're looking for: [thing]. Why missing: [reason]. What to do: [next steps]".

✅ Example: "Post not found. It may have been deleted. [Explore Other Posts Button]"

#### Rate Limit Errors

Format: "What you did too much: [action]. When you can try again: [time]. Why: [policy]".

✅ Example: "You're posting too frequently. Try again in 2 hours. Each user can post max 10 times per day per community."

#### Conflict/Duplicate Errors

Format: "What you tried: [action]. Why rejected: [reason]. What to do: [alternative]".

✅ Example: "Email already registered. [Log In Link] or use different email."

### 10.3 Error Code Reference Table

| Error Code | HTTP Status | User Message | Recovery |
|-----------|------------|--------------|----------|
| REGISTRATION_INVALID_EMAIL | 400 | Invalid email format. Use: user@example.com | Focus email field |
| REGISTRATION_EMAIL_EXISTS | 409 | Email already registered. Log in or use different email. | Link to login |
| REGISTRATION_WEAK_PASSWORD | 400 | Password: 8+ chars, uppercase, lowercase, number, special char | Show requirements |
| REGISTRATION_INVALID_USERNAME | 400 | Username: 3-32 chars, letters/numbers/underscore/hyphen only | Suggest valid username |
| REGISTRATION_USERNAME_EXISTS | 409 | Username taken. Choose another. | Suggest alternatives |
| LOGIN_INVALID_CREDENTIALS | 401 | Email or password incorrect. | Show reset password link |
| LOGIN_ACCOUNT_LOCKED | 429 | Account locked (5 failed attempts). Try in 30 min or reset password. | Link to password reset |
| LOGIN_EMAIL_NOT_VERIFIED | 403 | Verify email first. Check inbox or request new link. | Resend link button |
| LOGIN_ACCOUNT_SUSPENDED | 403 | Account suspended. Contact support. | Support contact info |
| VERIFICATION_LINK_INVALID | 400 | Link invalid/expired. Request new one. | Resend link button |
| TOKEN_EXPIRED | 401 | Session expired. Log in again. | Redirect to login |
| PERMISSION_GUEST_RESTRICTED | 403 | Action requires login. Log in or register. | Login/register links |
| PERMISSION_GUEST_VOTE | 403 | Log in to vote. | Login prompt |
| COMMUNITY_NOT_FOUND | 404 | Community not found. Check spelling or browse. | Browse communities |
| COMMUNITY_ACCESS_DENIED | 403 | Private community. Join to access. | Request to join button |
| POST_NOT_FOUND | 404 | Post not found. | Explore other posts |
| POST_TITLE_REQUIRED | 400 | Post title is required. | Focus title field |
| POST_TITLE_TOO_LONG | 400 | Post title max 300 chars. Current: [X] chars. | Character counter |
| POST_CONTENT_REQUIRED | 400 | Post must have title and content. | Focus content field |
| POST_URL_INVALID_PROTOCOL | 400 | Only http:// and https:// URLs supported. | Clear URL field |
| POST_URL_UNREACHABLE | 400 | Cannot access URL. Verify correct and publicly accessible. | Suggest check URL |
| POST_URL_MALICIOUS | 400 | This URL flagged as potentially unsafe. | Suggest different URL |
| POST_IMAGES_REQUIRED | 400 | Upload at least one image for image post. | Prompt upload |
| IMAGE_FORMAT_UNSUPPORTED | 400 | Image format not supported. Use JPEG, PNG, GIF, WebP. | Show upload form |
| IMAGE_TOO_LARGE | 413 | Image file too large. Max 50 MB. Your file: [X] MB. | Suggest compression |
| IMAGE_TOO_SMALL | 400 | Image must be 100+ pixels. Your image: [W]x[H] pixels. | Suggest larger image |
| COMMENT_EMPTY | 400 | Comment cannot be empty. | Focus comment field |
| COMMENT_TOO_LONG | 400 | Comment max 10,000 chars. Current: [X] chars. | Character counter |
| PARENT_COMMENT_DELETED | 404 | Cannot reply to deleted comment. | Suggest reply to different comment |
| POST_DELETED | 404 | Cannot comment on deleted post. | Suggest browse posts |
| REPLY_TOO_DEEP | 400 | Max reply depth (10 levels) reached. Reply earlier in thread. | Link to parent comment |
| CONTENT_NOT_AUTHOR | 403 | Edit your own posts/comments only. | Show user's posts |
| VOTE_SELF_VOTE | 400 | Cannot vote on your own posts. | Explain voting rules |
| CONTENT_NOT_FOUND | 404 | This content no longer available. | Explore other content |
| RATELIMIT_POST_CREATION | 429 | Posting too frequently. Try again in [X] hours. | Show countdown timer |
| RATELIMIT_COMMENT_CREATION | 429 | Commenting too frequently. Wait [X] secs. | Show countdown timer |
| RATELIMIT_VOTING | 429 | Voting too frequently. Wait before voting. | Show countdown timer |
| RATELIMIT_REPORTING | 429 | Report limit reached. Try tomorrow. | Show calendar |
| RATELIMIT_REGISTRATION | 429 | Too many registrations. Try tomorrow. | Suggest retry date |
| RATELIMIT_SEARCH | 429 | Search temporarily unavailable. Try shortly. | Retry button |
| POST_DUPLICATE | 409 | Post already exists. | Link to existing post |
| COMMENT_DUPLICATE | 409 | Already posted this comment. | Link to original |
| REPORT_ALREADY_SUBMITTED | 409 | Already reported this content. | Show report ID |
| RESOURCE_VERSION_CONFLICT | 409 | Content modified by another user. Refresh and try again. | Refresh button |

---

## 11. Error Recovery Processes

### 11.1 Automatic Retry Mechanisms

#### Transient Error Retry

WHEN system encounters transient errors (temporary database connection loss, network timeout), THE system SHALL automatically retry using exponential backoff strategy: wait 1s, 2s, 4s, 8s maximum before giving up.

THE system SHALL implement maximum 3 retry attempts for transient errors. IF all retries fail, THE system SHALL return user-friendly error message (not retry details).

#### Rate Limit Recovery

WHEN user hits rate limit, THE system SHALL calculate time until next attempt is allowed. THE system SHALL include `Retry-After: [seconds]` header in 429 response.

THE client SHALL respect Retry-After header before retrying. THE system SHALL provide countdown/timer on client UI: "Try again in 2 minutes".

#### Login Lockout Recovery

WHEN account is locked due to failed attempts, THE system SHALL automatically unlock after 30 minutes. THE system SHALL send email notification: "Your account was locked due to failed logins. Unlock: [link] or wait 30 minutes". THE system SHALL provide password reset as recovery option (unlocks account immediately).

### 11.2 User-Initiated Recovery Actions

#### Password Reset Recovery

WHEN user forgets password, THE system SHALL send password reset email with link valid for 24 hours. THE system SHALL make reset link one-time use only. AFTER reset, THE system SHALL invalidate all existing sessions.

#### Email Verification Resend

WHEN user doesn't receive verification email, THE system SHALL provide "Resend verification" button. THE system SHALL limit resend to 5 attempts per 24 hours. THE system SHALL send from same sender with clear instructions.

### 11.3 Data Recovery from Errors

#### Vote Change Reversal

IF vote fails to change due to error, THE system SHALL ensure change is not partially applied. THE system SHALL use transactions (change happens fully or not at all).

IF error occurs mid-transaction, THE system SHALL automatically rollback. THE system SHALL return clear error message and original state remains intact.

#### Failed Post Upload Recovery

IF post upload fails partway through (while saving images), THE system SHALL clean up partial data (delete orphaned image files). THE system SHALL allow user to retry from beginning without duplicate issues.

THE system SHALL preserve text content user entered (autosave/draft functionality).

#### Failed Comment Submission Recovery

IF comment submission fails, THE system SHALL preserve comment text on client. THE system SHALL display error and "Retry" button. THE system SHALL NOT require user to retype comment.

THE system SHALL ensure comment is not posted twice if user retries.

#### Database Transaction Rollback

WHEN database transaction fails, THE system SHALL rollback all changes atomically. THE system SHALL ensure no partial updates are visible to other users. THE system SHALL return error to user and restore original state.

THE system SHALL log transaction failures for debugging.

### 11.4 Graceful Degradation

#### Search Service Failure

IF search service becomes unavailable, THE system SHALL display message: "Search temporarily unavailable. Browse communities instead". THE system SHALL hide search feature but keep other functionality.

THE system SHALL automatically resume search when service returns online.

#### Image Processing Failure

IF image processing fails (resize, optimize), THE system SHALL store original image. THE system SHALL display warning: "Image processing failed. Displaying original file". THE system SHALL NOT block post creation due to image issues.

#### Caching Layer Failure

IF caching system fails, THE system SHALL continue operating without cache. THE system SHALL increase database load temporarily. PERFORMANCE IMPACT: Response times may increase but functionality continues.

#### Email Service Failure

IF email sending fails, THE system SHALL queue message for retry. THE system SHALL retry up to 24 hours in exponential backoff pattern. THE system SHALL NOT block user actions if email fails (e.g., don't block login if verification email fails).

WHEN retrying, THE system SHALL prioritize critical emails (password reset, account verification).

### 11.5 Fallback Behaviors

#### Sorting Algorithm Failure

IF complex sorting algorithm fails (hot/controversial), THE system SHALL fallback to simple "New" sorting. THE system SHALL display message: "Using simple sorting. Complex sorting temporarily unavailable".

THE system SHALL log error for investigation. THE system SHALL attempt to restore complex sorting on next request.

#### User Recommendations Failure

IF recommendation engine fails, THE system SHALL show generic popular/trending posts instead. THE system SHALL NOT display empty feed due to algorithm failure.

### 11.6 Error Communication

#### User-Facing Error Notifications

THE system SHALL display errors in non-intrusive banner at top of page (not popup). ERROR BANNER SHALL include: error message, refresh button, support link. ERROR BANNER SHALL auto-dismiss after 5 seconds or when user navigates away.

#### Admin Error Notifications

WHEN critical errors occur, THE system SHALL send admin notification. THRESHOLD: Errors affecting more than 0.1% of requests trigger notification. NOTIFICATION SHALL include: error message, affected users/content, time, stack trace.

THE system SHALL send via email + dashboard alert.

#### User Support Communication

ERROR MESSAGES SHALL include support contact info: "Having issues? Contact support: [email] or [chat link]". THE system SHALL include error ID/code: "Reference ID: ERR-20241215-00123".

---

## 12. Edge Cases in Special Scenarios

### 12.1 Concurrent Moderation and User Actions

#### Content Removal During Reply

WHEN moderator removes post while user is composing reply, THE system SHALL reject reply submission with `POST_DELETED` error. THE system SHALL preserve draft and explain: "Original post was removed by moderators".

#### Vote Change During Removal

WHEN user changes vote while moderator removes post, THE system SHALL handle atomically. Either vote change completes AND removal deletes it, OR removal completes first AND vote change fails with `CONTENT_NOT_FOUND`.

### 12.2 Deletion Cascades

#### Orphaned Comments Preservation

WHEN post is deleted, THE system SHALL cascade delete comments. THE system SHALL preserve comment history for auditing but mark as orphaned. THE system SHALL calculate and reverse associated karma.

#### Vote Cleanup During Content Deletion

WHEN post with 500+ votes is deleted, THE system SHALL delete all associated votes in single transaction. THE system SHALL recalculate author karma atomically.

### 12.3 Special User States

#### Suspended User Attempts Action

WHEN suspended user attempts to post, THE system SHALL return `LOGIN_ACCOUNT_SUSPENDED` (403) not `PERMISSION_GUEST_RESTRICTED`. THE system SHALL inform user of suspension status.

#### Deleted User's Content

WHEN deleted user's post is accessed, THE system SHALL show "[deleted user]" as author. THE system SHALL preserve post content but mark author as deleted.

### 12.4 Extreme Load Scenarios

#### High Concurrency on Popular Post

WHEN 10,000+ users attempt to vote on same post simultaneously, THE system SHALL handle via atomic database operations. THE system SHALL NOT drop votes or lose count accuracy.

#### Massive File Upload

WHEN user attempts to upload 100 MB file (at limit), THE system SHALL validate size before full transfer. THE system SHALL provide progress indication and cancellation option.

---

## 13. Business Rules Edge Cases

### 13.1 Voting Edge Cases

#### Vote on Locked Post

WHEN post is locked by moderator, THE system SHALL prevent new votes with `CONTENT_LOCKED` error (403). THE existing votes remain visible.

#### Karma from Future-Edited Posts

WHEN post receives 100 upvotes, then is edited significantly, THE system SHALL preserve all karma. THE system SHALL NOT reset votes due to edit.

### 13.2 Comment Nesting Edge Cases

#### Reply to Deleted Parent

WHEN parent comment is deleted, THE system SHALL NOT delete replies. THE replies become orphaned showing "[original comment deleted]". THE system SHALL preserve nesting structure.

#### Deep Nesting at Limit

WHEN user tries to reply to comment at depth 10, THE system SHALL reject with `REPLY_TOO_DEEP` error. THE system SHALL suggest replying to comment at depth 8 or 9 instead.

### 13.3 Report Edge Cases

#### Self-Report

WHEN user reports their own content, THE system SHALL allow it. THE system SHALL flag as "self-report" for moderator context. THE system SHALL process same as other reports.

#### Report After Content Removed

WHEN user reports post already removed by moderator, THE system SHALL accept report. THE report helps document violation patterns.

### 13.4 Community Edge Cases

#### Join Private Community During Deletion

WHEN user requests to join private community being deleted, THE system SHALL reject with `COMMUNITY_NOT_FOUND` (404). THE system SHALL NOT show deleted community in search results.

---

## Summary

This comprehensive error handling and edge case specification ensures the Community Platform operates safely, reliably, and predictably under all conditions. Every error must be handled gracefully with clear user messaging. Every race condition must be prevented through proper concurrency control. Every edge case must be anticipated and managed systematically.

The platform's reliability depends on implementing these error handling requirements completely and thoroughly according to specifications provided in this document.

Backend developers must validate all inputs rigorously, handle all authentication and authorization failures gracefully, manage concurrent operations safely, maintain data consistency, provide clear error messages, and implement all recovery processes as specified.

Developers should reference the error code table for consistency, implement rate limiting thresholds exactly as specified, use EARS format for requirements implementation, and prioritize user experience in all error scenarios.