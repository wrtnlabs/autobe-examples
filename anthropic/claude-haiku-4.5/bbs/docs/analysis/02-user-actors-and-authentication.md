# User Actors and Authentication

## User Actor Overview

The discussion board system is designed to serve three distinct user types, each with carefully defined capabilities and restrictions. This tiered access model enables appropriate participation levels while maintaining content quality and system security through role-based access control.

The three user actors are:

1. **Guest** - Unauthenticated visitors with read-only access
2. **Member** - Registered users with full participation rights
3. **Moderator** - Administrative users with content management capabilities

Each actor type has specific permissions that determine what actions they can perform within the system. These permissions are enforced through the authentication and authorization framework described throughout this document.

---

## Guest User Specifications

### Guest User Definition

Guests are unauthenticated visitors who can access the discussion board without creating an account or logging in. Guests represent the entry point to the platform and serve an important role in making content accessible to a broad audience.

### Guest User Capabilities

THE system SHALL display all published articles to guest users without authentication requirements.

WHEN a guest visits the discussion board, THE system SHALL present the article feed organized chronologically with the most recently published articles first.

WHEN a guest views an article, THE system SHALL display the article content including title, author name, publication date, category, and all attachments (images and files).

WHEN a guest views an article, THE system SHALL display the article's comment section showing all approved comments in chronological order.

WHEN a guest uses the search functionality, THE system SHALL allow keyword search across all published article titles and content, returning matching articles in reverse chronological order.

WHEN a guest accesses category filters, THE system SHALL allow filtering articles by category, displaying only articles in the selected category sorted by publication date.

WHEN a guest attempts to download an attachment from an article or comment, THE system SHALL allow the download without requiring authentication.

### Guest User Limitations

WHEN a guest attempts to create an article, THE system SHALL deny access and display a message prompting login or account registration.

WHEN a guest attempts to post a comment on an article, THE system SHALL deny access and display a message requiring user account creation or login.

WHEN a guest attempts to upload file or image attachments, THE system SHALL deny the action completely.

WHEN a guest attempts to edit any article or comment content, THE system SHALL deny access with appropriate error message.

WHEN a guest attempts to delete any article or comment, THE system SHALL deny access with appropriate error message.

WHEN a guest attempts to access the moderation dashboard or user management features, THE system SHALL deny access completely.

WHEN a guest attempts to view private user profile information or personally identifying details, THE system SHALL deny access and display only publicly available profile data.

WHEN a guest attempts to access the article creation interface, THE system SHALL redirect to the login page with message "Please sign in to create articles."

WHEN a guest attempts to access their account settings or profile management, THE system SHALL deny access and redirect to login.

### Guest User Experience & Access Control Design

Guests represent a crucial discovery and entry mechanism for the platform. All published content must be immediately visible and accessible to guests without friction, encouraging potential members to register and participate.

THE system SHALL never require authentication or account creation simply to read or search published articles and comments.

THE system SHALL clearly display login/registration prompts at decision points where guests attempt to create content, making the path to membership obvious.

---

## Member User Specifications

### Member User Definition

Members are registered and authenticated users who have successfully verified their email address. Members represent the core participant base of the discussion board and have full permission to create content, engage in discussions, and manage their own contributions.

### Member Authentication Requirements - Registration Process

WHEN a prospective member accesses the registration form, THE system SHALL present fields for:
- Email address (required, must be valid format, maximum 254 characters)
- Username (required, 3-30 characters, alphanumeric plus underscore/hyphen only)
- Password (required, must meet security requirements)
- Display name (optional, defaults to username if not provided)

THE system SHALL validate email format using RFC 5322 standards.

THE system SHALL reject email addresses that do not contain the "@" symbol or lack a valid domain extension.

THE system SHALL enforce email address uniqueness—IF a user attempts to register with an email already in the system, THEN THE system SHALL reject the registration with message "Email address already in use."

THE system SHALL enforce username uniqueness (case-insensitive comparison)—IF a username is already registered, THEN THE system SHALL reject with message "Username not available. Please choose another."

THE system SHALL reject usernames containing characters other than letters, numbers, underscores, and hyphens—IF a user enters invalid characters, THEN THE system SHALL display "Username may contain only letters, numbers, underscores, and hyphens."

### Password Requirements During Registration

WHEN a member creates a password, THE system SHALL enforce all of the following requirements:
- Minimum 8 characters in length
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one numeric digit (0-9)
- At least one special character from set: !@#$%^&*

THE system SHALL reject passwords that are fewer than 8 characters—IF a user enters short password, THEN THE system SHALL display "Password must be at least 8 characters long."

THE system SHALL reject passwords lacking uppercase letters—IF a password lacks uppercase, THEN THE system SHALL display "Password must contain at least one uppercase letter."

THE system SHALL reject passwords lacking lowercase letters—IF a password lacks lowercase, THEN THE system SHALL display "Password must contain at least one lowercase letter."

THE system SHALL reject passwords lacking numeric digits—IF a password lacks numbers, THEN THE system SHALL display "Password must contain at least one numeric digit."

THE system SHALL reject passwords lacking special characters—IF a password lacks special characters, THEN THE system SHALL display "Password must contain at least one special character: !@#$%^&*"

THE system SHALL prevent password reuse—IF a member attempts to set a password that matches any of their previous 3 passwords, THEN THE system SHALL reject with message "This password has been used recently. Please choose a different password."

THE system SHALL prevent passwords containing the username or email—IF password contains the username or email address, THEN THE system SHALL reject with message "Password may not contain your username or email address."

### Email Verification Workflow

WHEN a member completes registration with valid credentials, THE system SHALL immediately create the user account with status "unverified."

WHEN a new account is created, THE system SHALL generate a unique verification token (valid for 24 hours) and send a verification email to the provided address containing:
- A clickable verification link with embedded token
- A standalone alphanumeric verification code (8-12 characters)
- Clear instructions for verification
- Explanation of what verification enables

WHEN a member clicks the verification link in the email, THE system SHALL validate the token, verify it has not expired, and mark the account as "verified."

WHEN a member enters the verification code manually, THE system SHALL validate the code against stored verification data, verify expiration, and mark the account as verified.

WHILE an account status is "unverified," THE system SHALL prevent the member from creating articles or posting comments.

WHILE an account is unverified, THE system SHALL allow the member to view published content as a guest but display a prompt to verify email.

WHEN a member attempts to create an article with an unverified email, THE system SHALL deny the action and display message "Please verify your email address before creating articles. Check your inbox for the verification link."

WHEN a member attempts to post a comment with unverified email, THE system SHALL deny the action and display message "Please verify your email address before posting comments."

WHEN email verification expires (after 24 hours without verification), THE system SHALL make the verification link invalid.

WHEN a member attempts to use an expired verification link, THE system SHALL display message "Your verification link has expired. Request a new verification email below."

WHEN a member requests to resend verification email, THE system SHALL rate-limit requests to maximum one per 5 minutes per user.

IF a member attempts to resend verification more frequently than allowed, THEN THE system SHALL display "Please wait 5 minutes before requesting another verification email."

### Login Process Requirements

WHEN a member navigates to the login page, THE system SHALL display a form requesting email address (or username) and password.

WHEN a member enters credentials and submits the login form, THE system SHALL validate:
1. The email or username exists in the system
2. The password hash matches the stored hash for that account
3. The account is not suspended or deleted

IF both email/username and password are valid, THEN THE system SHALL create an authenticated session.

IF credentials are invalid, THEN THE system SHALL return a generic error message: "Invalid email/username or password" without indicating which field caused the failure.

IF a user enters an incorrect password 5 times within a 15-minute window, THEN THE system SHALL lock the account temporarily for 15 minutes.

WHEN an account is temporarily locked due to failed attempts, THE system SHALL display message "Your account is temporarily locked due to too many failed login attempts. Please try again in 15 minutes or reset your password."

THE system SHALL enforce HTTPS for all login communications.

### Password Management - Change Password

WHEN a member navigates to their account security settings, THE system SHALL provide a "change password" form.

WHEN a member initiates password change, THE system SHALL require entry of:
1. Current password (for verification)
2. New password (must meet all password complexity requirements)
3. Confirmation of new password (must match new password exactly)

WHEN a member submits valid current password and new password meeting all requirements, THE system SHALL update the password in the database using secure hashing.

WHEN password change succeeds, THE system SHALL display message "Your password has been changed successfully."

WHEN a member enters an incorrect current password, THE system SHALL deny the change and display "Current password is incorrect."

WHEN a member's new password fails complexity requirements, THE system SHALL display specific messages indicating which requirements are not met.

WHEN new passwords do not match, THE system SHALL display "Passwords do not match. Please enter the same password in both fields."

WHEN a member successfully changes their password, THE system SHALL invalidate all existing sessions for that user (forcing re-login on all devices).

### Password Reset - Forgot Password Flow

WHEN a member clicks "Forgot Password" on the login page, THE system SHALL display a password reset form.

WHEN a member enters their email address on the reset form and clicks "Send Reset Link," THE system SHALL:
1. Check if an account exists with that email
2. Generate a secure password reset token (valid for 1 hour only)
3. Send a password reset email containing a secure reset link
4. Display confirmation message regardless of whether email exists

THE system SHALL display to the user: "If an account exists with that email address, a password reset link has been sent."

**Security Note**: THE system SHALL NOT reveal whether an account exists with the provided email address (preventing account enumeration attacks).

WHEN a member receives the password reset email and clicks the reset link, THE system SHALL:
1. Validate the reset token is still valid (not expired)
2. Display a password reset form allowing entry of new password and confirmation
3. Require the new password to meet all complexity requirements

WHEN a member enters a valid new password meeting all requirements and submits the reset form, THE system SHALL:
1. Verify the token is valid and not expired
2. Update the password with new hash
3. Invalidate all existing sessions for the user
4. Send a confirmation email to the user
5. Display message "Your password has been reset successfully. You may now log in with your new password."

WHEN a member attempts to use an expired password reset link, THE system SHALL display message "Your password reset link has expired or is invalid. Please request a new one."

THE system SHALL set reset token expiration to 1 hour from generation.

### Member User Capabilities - Article Management

THE member user SHALL have all guest user viewing capabilities, plus:

WHEN a member creates a new article, THE system SHALL allow entry of all required fields: title, content text, category selection, and optional image/file attachments.

WHEN a member submits an article for publication, THE system SHALL store the article, send it for moderator review before any publication, and display message "Article submitted for review. You'll be notified when it's published."

WHEN a moderator approves a member's article, THE system SHALL send a notification to the member: "Your article has been approved and is now live on the discussion board."

WHEN a member accesses their personal article management page, THE system SHALL display all their articles with current status (pending review, approved, rejected) and timestamps.

WHEN a member's article is rejected by a moderator, THE system SHALL display the rejection reason and allow the member to edit and resubmit the article.

WHEN a member edits an article with "pending_approval" status, THE system SHALL allow unrestricted changes to title, content, category, and attachments.

WHEN a member edits an article with "published" status, THE system SHALL allow editing only of category and optional metadata, but NOT title, content, or attachments.

WHEN a member attempts to edit a published article's title or content, THE system SHALL deny the edit and display message "Published articles cannot be edited. You may delete and create a new article instead."

WHEN a member edits their unpublished article, THE system SHALL update the article and return it to "pending_approval" status for moderator re-review.

WHEN a member deletes their own article, THE system SHALL:
1. Check if article is in "pending_approval" or "rejected" status
2. If published, display message "Published articles cannot be deleted"
3. If unpublished, immediately delete the article and all associated comments
4. Display message "Article deleted successfully"

THE system SHALL NOT allow members to delete published articles (only moderators can remove published content).

### Member User Capabilities - Comment Management

WHEN a member posts a comment on a published article, THE system SHALL:
1. Accept comment text and optional attachments
2. Store the comment immediately with member as author
3. Display the comment to all users in the article's comment section
4. Update the article's comment count
5. Display message "Comment posted successfully!"

THE system SHALL allow members to post comments only on published articles, not on pending or rejected articles.

WHEN a member edits their own comment, THE system SHALL allow modifications to the comment text and attachments.

WHEN a member edits a comment within 1 hour of original posting, THE system SHALL allow the edit immediately.

WHEN a member attempts to edit their comment after 1 hour of posting, THE system SHALL deny the edit and display message "Comments can only be edited within 1 hour of posting."

WHEN a member successfully edits their comment, THE system SHALL:
1. Update the comment content and attachments
2. Record the edit timestamp
3. Display "(edited)" indicator showing edit time
4. Display message "Comment updated successfully!"

WHEN a member deletes their own comment, THE system SHALL:
1. Perform a soft deletion (keep record for audit purposes)
2. Hide the comment content from all user views
3. Display placeholder: "[Comment deleted by author]"
4. Update the article's comment count
5. Delete all associated attachments

### Member User Capabilities - Attachment Management

WHEN a member uploads images to articles or comments, THE system SHALL accept PNG, JPG, GIF formats up to 10 MB each.

WHEN a member uploads document files to articles or comments, THE system SHALL accept PDF, DOCX, TXT formats up to 25 MB each.

WHEN a member attempts to upload files exceeding size limits, THE system SHALL reject the upload and display the specific limit exceeded.

WHEN a member attempts to exceed attachment quantity limits, THE system SHALL reject additional uploads and display the limit.

WHEN a member attaches files to an article, THE system SHALL allow up to 5 total attachments per article.

WHEN a member attaches files to a comment, THE system SHALL allow up to 3 total attachments per comment.

WHEN a member edits a pending article, THE system SHALL allow adding or removing attachments freely.

WHEN a member deletes an article or comment, THE system SHALL delete all associated attachments from storage.

### Member User Capabilities - Profile & Account Management

WHEN a member accesses their profile page, THE system SHALL display:
- Username and email address
- Display name (public profile name)
- Account creation date
- Number of articles created
- Number of comments posted
- Bio or about section (if provided)
- Account status

WHEN a member edits their profile, THE system SHALL allow updates to:
- Display name (1-50 characters)
- Bio or about section (optional, maximum 500 characters)
- Profile picture/avatar (optional)
- Notification preferences
- Display theme preference

WHEN a member updates their display name, THE system SHALL validate it is 1-50 characters and not empty.

WHEN a member updates their bio, THE system SHALL validate it does not exceed 500 characters.

WHEN a member uploads a profile picture, THE system SHALL:
- Accept JPG, PNG, GIF formats only
- Limit file size to 5 MB maximum
- Automatically resize to 200x200 pixels
- Display the picture next to their posts

WHEN a member requests to change their email address, THE system SHALL:
1. Require entry of the new email
2. Send a verification email to the new address
3. Require verification of the new email before applying the change
4. Update the account email only after verification

WHEN a member updates their profile information, THE system SHALL display confirmation message "Profile updated successfully."

### Member User Limitations

WHEN a member attempts to access moderation tools, THE system SHALL deny access completely.

WHEN a member attempts to approve or reject other users' articles, THE system SHALL deny access.

WHEN a member attempts to delete or manage other users' content, THE system SHALL deny access with message "You do not have permission to modify this content."

WHEN a member attempts to suspend or ban user accounts, THE system SHALL deny access completely.

WHEN a member attempts to view other members' email addresses or private account information, THE system SHALL deny access (show only public profile data).

WHEN a member attempts to view pending/unpublished articles created by other members, THE system SHALL deny access.

---

## Moderator User Specifications

### Moderator User Definition

Moderators are administrative users selected by system administrators to maintain content quality and enforce community guidelines. Moderators have elevated permissions to review, approve, modify, and remove content as necessary to maintain a healthy discussion environment.

Moderators authenticate through the same login process as members but have an elevated "moderator" role assigned to their account. Only system administrators can assign or revoke moderator status.

### Moderator Authentication & Role Assignment

WHEN a user is promoted to moderator status, THE system administrators SHALL explicitly assign the "moderator" role to their user account.

WHEN a moderator logs in with their credentials, THE system SHALL authenticate them using the same process as members (email/username and password).

WHEN a moderator's session is established after login, THE system SHALL include their "moderator" role in the JWT token.

WHEN a moderator's role is revoked, THE system SHALL invalidate all active moderator sessions immediately.

WHEN a moderator's account is suspended or deleted, THE system SHALL revoke all moderator privileges immediately.

### Moderator User Capabilities - Article Review & Approval

THE moderator user SHALL have all member capabilities, plus:

WHEN a moderator accesses the moderation dashboard, THE system SHALL display the review queue with all pending articles awaiting approval.

FOR each pending article in the queue, THE system SHALL display:
- Article title
- Article creator username
- Submission timestamp
- Brief preview of article content (first 150-200 characters)
- Number of attachments
- Category
- Single-click action buttons: "Review", "Approve", "Reject"

WHEN a moderator clicks "Review" on a pending article, THE system SHALL display the full article detail page including:
- Complete title and content
- Author name and profile information
- Submission date and time
- Category
- All images and file attachments
- Preview of associated comments (if any)

WHEN a moderator reviews an article and determines it meets community standards, THE moderator SHALL click "Approve Article."

WHEN a moderator approves an article, THE system SHALL:
1. Change article status from "pending_approval" to "published"
2. Make the article immediately visible to all users (guests, members, moderators)
3. Record the approval action in the audit log with moderator name and timestamp
4. Send notification to the article creator: "Your article has been approved and published"

WHEN a moderator reviews an article and determines it violates community guidelines, THE moderator SHALL click "Reject Article."

WHEN a moderator rejects an article, THE system SHALL:
1. Require the moderator to provide a rejection reason from predefined list or custom text
2. Change article status to "rejected"
3. Keep the article hidden from other users (visible only to creator and moderators)
4. Record the rejection in audit log with moderator name, timestamp, and reason
5. Send notification to the article creator with the rejection reason
6. Allow the article creator to edit and resubmit the article

WHEN a moderator rejects an article without providing a reason, THE system SHALL display "Rejection reason is required" and prevent the rejection.

WHEN a moderator views a rejected article, THE system SHALL display the rejection reason and allow the moderator to view the current version and any resubmitted versions.

### Moderator User Capabilities - Content Deletion & Modification

WHEN a moderator identifies problematic content, THE moderator SHALL have the capability to delete any article or comment regardless of creator.

WHEN a moderator clicks "Delete" on an article, THE system SHALL:
1. Require the moderator to provide a deletion reason
2. Immediately remove the article from all user views
3. Delete all associated comments and attachments
4. Record the deletion action in audit log with moderator name, timestamp, and reason
5. Send notification to article creator explaining the deletion and reason
6. Preserve the deletion record for audit purposes (article marked as deleted, not erased)

WHEN a moderator deletes an article and all its comments are removed, THE system SHALL update the comment counts on the user's profile appropriately.

WHEN a moderator clicks "Delete" on a comment, THE system SHALL:
1. Require reason for deletion
2. Remove the comment from the article's discussion thread
3. Display placeholder in comment section: "[Comment removed by moderator]"
4. Record deletion in audit log
5. Update the article's comment count
6. Send notification to comment creator with deletion reason

WHEN a moderator identifies a minor issue in an approved article (e.g., typo, inappropriate link), THE moderator MAY click "Edit Article."

WHEN a moderator edits published article content, THE system SHALL:
1. Allow direct editing of title and content
2. Allow removal of specific attachments if needed
3. Record the moderation edit in audit log with moderator name, changes made, and timestamp
4. Optionally notify the article creator of the changes made
5. Keep the article published without requiring re-approval

### Moderator User Capabilities - Comment Moderation

WHEN a moderator views an article with comments, THE system SHALL display a "Delete" button next to each comment (visible only to moderators).

WHEN a moderator clicks "Delete" on a comment, THE system SHALL:
1. Display confirmation dialog with reason selection
2. Require reason for deletion (dropdown: Spam, Harassment, Off-topic, Inappropriate Content, Other)
3. Allow optional additional notes
4. Upon confirmation, remove the comment from public view
5. Record deletion action in audit log with full details
6. Update the article's comment count
7. Display placeholder: "[Comment removed by moderator]" in the comment position

WHEN a moderator identifies spam or repeated policy violations in comments, THE moderator MAY click "Flag" to mark a comment for further review without immediate deletion.

WHEN a moderator flags a comment, THE system SHALL:
1. Mark the comment as flagged
2. Add it to a special flagged items queue for moderator review
3. Record the flag in audit log
4. Allow moderators to review flagged items and take action later

### Moderator User Capabilities - User Account Management

WHEN a moderator navigates to the user management section, THE system SHALL display a searchable list of all user accounts with:
- Username and email address
- Account creation date (join date)
- Total articles created
- Total comments posted
- Current account status (Active, Suspended, Banned)
- Moderation history badge (# violations, warnings, suspensions)

WHEN a moderator searches for a specific member by username or email, THE system SHALL display matching accounts.

WHEN a moderator clicks on a user account, THE system SHALL display detailed user profile including:
- All basic account information
- Complete list of articles created with status indicators
- Complete list of comments posted with timestamps
- Moderation history (all warnings, suspensions, deletions affecting this user)
- Recent activity timeline
- Account status and any restrictions

WHEN a moderator identifies a member violating community guidelines, THE moderator SHALL have capability to warn, suspend, or ban the member.

WHEN a moderator issues a warning to a member, THE system SHALL:
1. Record the warning with timestamp, moderator name, and reason
2. Add the warning to the user's moderation history
3. Send email notification to the member explaining the warning
4. Track the warning count for potential escalation to suspension

WHEN a member has received multiple warnings, AND a moderator decides escalation is needed, THE moderator SHALL click "Suspend Account."

WHEN a moderator suspends a member's account, THE system SHALL:
1. Require a suspension duration (temporary) or mark indefinite
2. Require a reason (dropdown: Repeated Violations, Harassment, Spam, Other)
3. Allow optional detailed notes about suspension
4. Immediately prevent the member from logging in
5. Prevent the suspended member from creating new articles or comments
6. Allow the suspended member to view existing content
7. Record suspension in audit log with full details
8. Send email notification to member: "Your account has been suspended until [date] for [reason]. [message with details]"

WHEN a suspension has an end date, THE system SHALL automatically reactivate the account at the specified time.

WHEN a member's behavior is severe or violations continue after suspension, THE moderator SHALL click "Terminate/Ban Account" (permanent).

WHEN a moderator permanently bans a member, THE system SHALL:
1. Require a detailed ban reason
2. Immediately and permanently prevent account login
3. Permanently prevent the member from accessing the platform
4. Mark all their content as created by "[Deleted User]" or similar
5. Record the permanent ban in audit log
6. Send email notification to member explaining the permanent ban
7. Make the ban decision non-reversible without administrator intervention

WHEN a moderator changes a member's account status, THE system SHALL log all changes with moderator identity and timestamp.

---

## Authentication Framework & JWT Token Management

### Authentication System Overview

THE system SHALL implement stateless authentication using JSON Web Tokens (JWT) to maintain secure user sessions across all authenticated requests.

THE system SHALL validate user credentials against the user database using industry-standard password hashing and comparison.

THE system SHALL use HTTPS encryption for all authentication communication without exception.

### JWT Token Types & Structure

THE system SHALL issue two distinct token types to authenticated users:

**1. Access Token**
- Purpose: Authorizes API requests for protected resources and actions
- Expiration: 15 minutes from issue time
- Storage: Client stores in memory or secure httpOnly cookie
- Usage: Included in Authorization header for each authenticated API request

**2. Refresh Token**
- Purpose: Enables obtaining new access tokens without re-authentication
- Expiration: 7 days from issue time
- Storage: Client stores in httpOnly cookie for security
- Usage: Sent to dedicated refresh endpoint to obtain new access token

### Access Token Payload Structure

THE access token SHALL contain the following JWT claims:

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "john@example.com",
  "username": "john_smith",
  "displayName": "John Smith",
  "role": "member",
  "emailVerified": true,
  "iat": 1704067200,
  "exp": 1704068100
}
```

WHERE:
- `userId`: Unique user identifier in UUID format (system-generated, immutable)
- `email`: User's verified email address
- `username`: User's chosen username (case-insensitive unique)
- `displayName`: User's public display name (may differ from username)
- `role`: User's role in system - MUST be either "member" or "moderator" (guests have no token)
- `emailVerified`: Boolean flag indicating whether email has been verified
- `iat`: Token issued-at timestamp (Unix epoch, seconds)
- `exp`: Token expiration timestamp (15 minutes after iat)

### Refresh Token Payload Structure

THE refresh token SHALL contain the following JWT claims:

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "tokenType": "refresh",
  "iat": 1704067200,
  "exp": 1704672000
}
```

WHERE:
- `userId`: Same user identifier as access token (for validation)
- `tokenType`: Literal string "refresh" to distinguish from access tokens
- `iat`: Token issued-at timestamp (Unix epoch, seconds)
- `exp`: Token expiration timestamp (7 days after iat)

### Token Signing & Security

THE system SHALL sign all JWT tokens using HS256 (HMAC SHA-256) algorithm.

THE system SHALL use a cryptographically secure secret key of minimum 32 characters (recommended 64+ characters) for HMAC signing.

THE system SHALL NEVER expose the signing secret to client-side code or version control systems.

THE system SHALL store the signing secret in environment variables or secure key management system only.

THE system SHALL rotate the signing secret periodically (recommended every 90 days) with maintenance window to invalidate existing tokens.

### Token Validation Process

WHEN a client includes an access token in an API request, THE system SHALL:
1. Extract the token from the Authorization header (format: "Bearer {token}")
2. Verify the token signature matches the signing secret
3. Verify the token has not expired (check exp claim against current time)
4. Verify the token claims have not been tampered with
5. Extract user identity and role from token for authorization decisions

IF token validation fails at any step, THEN THE system SHALL return HTTP 401 Unauthorized.

IF the token signature is invalid, THEN THE system SHALL reject the request and return HTTP 401 with message "Invalid token."

IF the token has expired, THEN THE system SHALL reject the request and return HTTP 401 with message "Token expired. Please refresh your token or log in again."

IF the token claims are tampered with, THEN THE system SHALL reject the request and return HTTP 401 with message "Invalid token."

### Refresh Token Flow & Token Refresh

WHEN an access token approaches expiration (client-side logic), THEN the client MAY submit the refresh token to the dedicated refresh endpoint.

WHEN a refresh token is submitted to the refresh endpoint, THE system SHALL:
1. Validate the refresh token signature
2. Verify the refresh token has not expired
3. Verify the refresh token is not in the blacklist of invalidated tokens
4. Extract the userId from the refresh token
5. Verify the user account still exists and is not suspended/banned
6. Generate and return a new access token
7. Optionally generate a new refresh token with updated expiration

WHEN a new access token is issued via refresh endpoint, THE system SHALL return the new access token to the client.

WHEN a new refresh token is issued via refresh endpoint, THE system SHALL return both access and refresh tokens.

IF the refresh token is invalid or expired, THEN THE system SHALL return HTTP 401 Unauthorized and require full re-authentication.

IF the refresh token has been blacklisted (due to logout or session termination), THEN THE system SHALL return HTTP 401 and require full re-authentication.

### Token Blacklist Management

WHEN a member logs out, THE system SHALL add the member's refresh token to a blacklist of invalid tokens.

THE system SHALL maintain the blacklist with token expiration data, automatically removing expired tokens from the blacklist.

THE system SHALL check all submitted refresh tokens against the blacklist before issuing new access tokens.

THE system SHALL clear all entries from a user's blacklist when they change their password.

---

## Session Management Specifications

### Session Lifecycle

WHEN a member successfully logs in with valid credentials, THE system SHALL:
1. Create a new session record with unique session ID
2. Generate access and refresh JWT tokens
3. Set session expiration to 7 days from login
4. Return tokens to client for storage
5. Record the login timestamp and IP address (optional)

WHENEVER a member makes an authenticated API request, THE system SHALL:
1. Validate the access token
2. Update the session's last-activity timestamp
3. Allow the request to proceed if authorization checks pass

WHEN a session remains inactive for 30 days (no requests), THE system SHALL automatically terminate the session.

WHEN a member's session is terminated due to inactivity, THE system SHALL:
1. Invalidate the refresh token
2. Require the member to log in again to resume activity
3. NOT require any special notification (transparent to user upon next login attempt)

WHEN a member clicks the logout button, THE system SHALL:
1. Immediately invalidate the member's current session
2. Blacklist the refresh token
3. Clear authentication tokens from the client side
4. Display message "You have been logged out successfully"
5. Redirect to the homepage or login page

### Concurrent Sessions

THE system SHALL allow each member to maintain multiple concurrent sessions simultaneously.

EXAMPLE: A member can be logged in on desktop, laptop, and mobile device with separate sessions.

WHEN a member logs in on a new device, THE system SHALL create a new session without affecting existing sessions on other devices.

WHEN a member logs out from one device, THE system SHALL terminate only that specific session, not affecting other active sessions.

WHEN all sessions for a member are terminated (e.g., due to password change), THE system SHALL invalidate all refresh tokens for that user.

### Session Security Best Practices

THE system SHALL store session data server-side with only the session ID maintained client-side via token.

THE system SHALL NEVER store sensitive data (passwords, verification tokens) in session objects.

THE system SHALL use httpOnly cookies for token storage when possible to protect against XSS attacks.

WHEN using localStorage for token storage, THE system SHALL document XSS vulnerability concerns and recommend HTTPS enforcement.

THE system SHALL implement CSRF protection for all state-changing operations.

THE system SHALL implement rate limiting on session creation endpoints to prevent brute-force attacks.

---

## Account Security Requirements

### Password Security & Storage

WHEN a member creates or changes their password, THE system SHALL immediately hash the password using bcrypt algorithm.

THE system SHALL use bcrypt with salt rounds of minimum 12 for password hashing.

THE system SHALL NEVER store passwords in plain text, reversible encryption, or any recoverable format.

WHEN a member logs in, THE system SHALL compare the provided password's hash against the stored hash (never comparing plain text).

THE system SHALL reject any password that has been used in the user's last 3 password changes.

WHEN a password is hashed, THE system SHALL use a unique salt per password (bcrypt generates this automatically).

### Email Verification & Management

WHEN a new member completes registration, THE system SHALL immediately send a verification email.

WHEN a member's email is changed, THE system SHALL send a verification email to the new address.

THE email verification SHALL be required before the member can create articles or comments.

WHEN a verification email is sent, THE system SHALL include:
- A unique verification link with embedded 24-hour token
- An alphanumeric 8-12 character verification code
- Instructions for completing verification
- Link to resend verification email if needed

THE verification token SHALL be valid for exactly 24 hours from generation.

WHEN a member clicks the verification link or enters the code, THE system SHALL:
1. Validate the token/code against stored value
2. Verify the token has not expired
3. Mark the account as "email_verified = true"
4. Clear the verification token from storage

WHEN a member requests to resend verification email, THE system SHALL:
1. Generate a new verification token
2. Invalidate the previous token
3. Send a fresh verification email immediately
4. Enforce rate limit of maximum 1 resend per 5 minutes

IF a member attempts to resend verification too frequently, THEN THE system SHALL display message "Please wait before requesting another verification email."

### Password Recovery & Reset

WHEN a member uses the "Forgot Password" function, THE system SHALL:
1. Display a form requesting the account's email address
2. Check if account exists with that email
3. Generate a secure password reset token valid for 1 hour only
4. Send password reset email with secure reset link
5. Display confirmation message regardless of account existence

THE system SHALL NOT reveal whether an account exists (security principle: no account enumeration).

WHEN a member receives the password reset email and clicks the link, THE system SHALL:
1. Validate the reset token and expiration
2. Display a password reset form
3. Allow the member to enter new password meeting all complexity requirements

WHEN the member enters a valid new password and confirms it, THE system SHALL:
1. Verify token is still valid
2. Hash and store the new password
3. Invalidate ALL existing sessions for this user (forcing re-login everywhere)
4. Remove the reset token
5. Send confirmation email: "Your password has been reset successfully"
6. Display message "Password reset successfully. Please log in with your new password."

WHEN a member attempts to use an expired password reset link, THE system SHALL display message "Your password reset link has expired. Please request a new one."

### Account Lockout Protection

WHEN a member enters an incorrect password during login, THE system SHALL record the failed attempt.

WHEN a member accumulates 5 failed login attempts within a 15-minute window, THE system SHALL:
1. Lock the account temporarily
2. Set lock duration to 15 minutes
3. Display message to user "Your account is temporarily locked due to multiple failed login attempts. Please try again in 15 minutes or reset your password."
4. Prevent further login attempts until lock expires

WHEN the 15-minute lockout period expires, THE system SHALL automatically unlock the account.

THE system SHALL log all failed login attempts with timestamp and IP address (for security audit purposes).

THE system SHALL maintain failed attempt logs for minimum 90 days for security analysis.

---

## Permission Matrix - Complete Access Control

The following matrix comprehensively defines which actions each user type can perform. A checkmark (✅) indicates the action is permitted; an X (❌) indicates it is not permitted.

| Category | Action | Guest | Member | Moderator |
|----------|--------|-------|--------|-----------|
| **Article Creation & Publishing** | | | | |
| | View published articles | ✅ | ✅ | ✅ |
| | Create new article | ❌ | ✅ | ✅ |
| | Submit article for review | ❌ | ✅ | ✅ |
| | Edit own pending/rejected article | ❌ | ✅ | ✅ |
| | Edit own published article (category only) | ❌ | ✅ | ✅ |
| | Edit own published article (content) | ❌ | ❌ | ❌ |
| | Delete own pending/rejected article | ❌ | ✅ | ✅ |
| | Delete own published article | ❌ | ❌ | ❌ |
| | Delete other users' articles | ❌ | ❌ | ✅ |
| | Edit other users' articles | ❌ | ❌ | ❌ |
| **Comment Operations** | | | | |
| | View published comments | ✅ | ✅ | ✅ |
| | Post comment on published article | ❌ | ✅ | ✅ |
| | Edit own comment (within 1 hour) | ❌ | ✅ | ✅ |
| | Edit own comment (after 1 hour) | ❌ | ❌ | ❌ |
| | Delete own comment | ❌ | ✅ | ✅ |
| | Delete other users' comments | ❌ | ❌ | ✅ |
| | Edit other users' comments | ❌ | ❌ | ❌ |
| **File & Image Attachments** | | | | |
| | View attachments on articles | ✅ | ✅ | ✅ |
| | Download attachments | ✅ | ✅ | ✅ |
| | Upload attachments to articles | ❌ | ✅ | ✅ |
| | Upload attachments to comments | ❌ | ✅ | ✅ |
| | Delete own attachments | ❌ | ✅ | ✅ |
| | Delete other users' attachments | ❌ | ❌ | ✅ |
| **Content Review & Moderation** | | | | |
| | Access review queue | ❌ | ❌ | ✅ |
| | View pending articles | ❌ | ❌ | ✅ |
| | Approve pending articles | ❌ | ❌ | ✅ |
| | Reject pending articles | ❌ | ❌ | ✅ |
| | Delete published articles | ❌ | ❌ | ✅ |
| | Delete published comments | ❌ | ❌ | ✅ |
| | Flag articles for review | ❌ | ❌ | ✅ |
| | Flag comments for review | ❌ | ❌ | ✅ |
| **User Account Management** | | | | |
| | View own profile | ❌ | ✅ | ✅ |
| | Edit own profile | ❌ | ✅ | ✅ |
| | View other users' public profile | ✅ | ✅ | ✅ |
| | View other users' private info | ❌ | ❌ | ✅ |
| | Suspend user accounts | ❌ | ❌ | ✅ |
| | Reactivate user accounts | ❌ | ❌ | ✅ |
| | Permanently ban user accounts | ❌ | ❌ | ✅ |
| | View complete user history | ❌ | ❌ | ✅ |
| | Assign moderator role | ❌ | ❌ | ❌ |
| **Moderation & Audit** | | | | |
| | Access moderation dashboard | ❌ | ❌ | ✅ |
| | View audit logs | ❌ | ❌ | ✅ |
| | Export moderation reports | ❌ | ❌ | ✅ |
| | Issue user warnings | ❌ | ❌ | ✅ |
| | Modify moderation decisions | ❌ | ❌ | ✅ |
| **Search & Discovery** | | | | |
| | Search articles by keyword | ✅ | ✅ | ✅ |
| | Filter by category | ✅ | ✅ | ✅ |
| | Sort articles chronologically | ✅ | ✅ | ✅ |
| | Browse recent articles | ✅ | ✅ | ✅ |
| **System & Administration** | | | | |
| | View system logs | ❌ | ❌ | ❌ |
| | Modify system configuration | ❌ | ❌ | ❌ |
| | Create/manage other moderators | ❌ | ❌ | ❌ |
| | Access database directly | ❌ | ❌ | ❌ |

---

## Business Rules for Authentication & Authorization

### Ubiquitous Rules (Always Enforced)

THE system SHALL never expose passwords in logs, error messages, or any debugging output.

THE system SHALL use HTTPS/TLS encryption for all authentication-related communication.

THE system SHALL enforce that usernames are unique in a case-insensitive manner.

THE system SHALL enforce that email addresses are unique and case-insensitive.

THE system SHALL display public display names (not internal usernames) as article and comment authors.

THE system SHALL require email verification before allowing article creation or commenting.

THE system SHALL prevent accounts with unverified emails from creating articles or comments.

### Conditional Authentication Rules

WHEN a user attempts an authenticated action without a valid token, THE system SHALL deny access and return HTTP 401 Unauthorized.

WHEN a user's session expires, THE system SHALL require re-authentication to resume.

WHEN a user's password is changed, THE system SHALL invalidate all existing sessions immediately.

WHEN a user's email is changed, THE system SHALL invalidate all existing sessions and require email verification of new address.

WHEN a member account is suspended, THE system SHALL prevent login immediately.

WHEN a member account is permanently banned, THE system SHALL prevent login indefinitely.

WHEN a moderator role is revoked, THE system SHALL invalidate all moderator sessions immediately.

### Permission Enforcement Rules

WHEN a member attempts to edit an article they did not create, THE system SHALL deny the action.

WHEN a member attempts to delete a comment they did not create, THE system SHALL deny the action.

WHEN a guest attempts to create content, THE system SHALL require authentication.

WHEN an unauthenticated user attempts to access member-only features, THE system SHALL redirect to login.

WHEN a member attempts to access moderator functions, THE system SHALL deny access with message "You do not have permission to access this resource."

WHEN a moderator's role is revoked mid-session, THE system SHALL revoke access to moderation features immediately (on next token refresh).

---

## Summary of Authentication & Authorization

This document establishes comprehensive authentication and authorization requirements for the discussion board system ensuring:

1. **Three Clear User Roles**: Guest (read-only), Member (participant), Moderator (administrator)
2. **Secure Authentication**: Password hashing, email verification, token-based sessions
3. **Flexible Sessions**: Multiple concurrent sessions, token refresh, secure logout
4. **Password Security**: Strong complexity requirements, secure reset, recovery procedures
5. **Complete Permission Matrix**: Explicit definition of what each role can and cannot do
6. **JWT Token System**: Access and refresh tokens with proper expiration and validation
7. **Account Security**: Lockout protection, session management, email verification
8. **Comprehensive Rules**: EARS-format business rules covering all scenarios and edge cases

All developers implementing authentication and authorization must follow these specifications exactly to maintain system security and consistency.

---

> *Developer Note: This document defines **business requirements only**. All technical implementations (JWT libraries, password hashing algorithms, session storage mechanisms, HTTP frameworks, database technologies, and infrastructure) are at the discretion of the development team.*