# User Account Management Requirements

## Account Management Overview

User account management is a foundational component of the discussionBoard service that enables members to create accounts, maintain their profiles, authenticate securely, and manage their preferences. This document specifies all requirements for user registration, profile management, account security, and account lifecycle.

The account management system must be straightforward and focused on essentials—we avoid unnecessary complexity while maintaining security standards appropriate for a discussion platform. All users (members and moderators) go through the same registration process, with moderator status assigned by administrators post-registration.

### Core Account Functions

User accounts in the discussionBoard system serve these essential functions:

- **Authentication**: Enable users to prove their identity and access the system securely
- **Attribution**: Associate articles, comments, and attachments with specific users
- **Personalization**: Store user preferences and profile information
- **Access Control**: Maintain permission levels (guest, member, moderator)
- **Accountability**: Create an audit trail for moderation and community management

---

## User Registration Requirements

### Registration Flow

WHEN a guest user initiates registration, THE system SHALL display a registration form requiring the user to provide essential account information before creating a member account.

WHEN a user submits a complete registration form with valid data, THE system SHALL validate all input against registration rules and either create the account or return specific validation errors.

WHEN registration succeeds, THE system SHALL send a verification email to the user's provided email address containing a unique verification link or code.

WHEN registration succeeds, THE system SHALL set the account to an "unverified" status, restricting the user from posting articles or comments until email verification is completed.

### Required Registration Information

During registration, users must provide the following information:

1. **Email Address** (required)
   - Must be a valid email format
   - Must be unique—no two accounts may use the same email address
   - Used for account verification, password recovery, and communication
   - Must not exceed 254 characters

2. **Username** (required)
   - Must be unique across all user accounts
   - Must be 3-30 characters in length
   - May contain letters, numbers, underscores, and hyphens only
   - Must not contain spaces or special characters (except underscore and hyphen)
   - Case-insensitive uniqueness (usernames "John" and "john" are considered duplicates)

3. **Password** (required)
   - Minimum 8 characters in length
   - Must contain at least one uppercase letter
   - Must contain at least one lowercase letter
   - Must contain at least one numeric digit
   - Must not exceed 128 characters
   - Must not be a commonly used password (e.g., "Password123")

4. **Display Name** (required)
   - 1-50 characters in length
   - May contain letters, numbers, spaces, and common punctuation
   - Displayed publicly when the user posts articles or comments
   - May be different from username for user privacy/preference

### Registration Validation Rules

IF the email address is invalid or already registered, THEN THE system SHALL return an error message indicating "Email address is invalid or already in use" and prevent account creation.

IF the username is invalid, too short, too long, or already registered, THEN THE system SHALL return an error message indicating the specific username issue and prevent account creation.

IF the password does not meet complexity requirements, THEN THE system SHALL return an error message indicating which requirements are not met (missing uppercase, lowercase, numbers, or length requirements) and prevent account creation.

IF the display name exceeds the character limit or is empty, THEN THE system SHALL return an error message and prevent account creation.

WHEN a user enters a username, THE system SHALL check availability in real-time and inform the user if the username is already taken before form submission.

WHEN a user enters an email address, THE system SHALL check availability in real-time and inform the user if the email is already registered before form submission.

### Registration Confirmation Process

WHEN a user completes registration successfully, THE system SHALL immediately send a verification email containing:
- A unique verification link (recommended: valid for 24 hours)
- A verification code (alphanumeric, 8-12 characters)
- A simple explanation of what the user needs to do
- A link to resend the verification email if needed

WHEN a user clicks the verification link or enters the verification code, THE system SHALL mark the account as verified and enable the user to post articles and comments immediately.

WHEN email verification succeeds, THE system SHALL display a success message and optionally redirect the user to the member dashboard or first article.

WHEN verification fails (invalid code, expired code, or already verified), THE system SHALL return a clear error message explaining the issue.

### Resend Verification Email

WHEN a verified member user attempts to resend verification email (because they lost the original), THE system SHALL send a new verification email with a fresh verification code valid for 24 hours.

WHEN an unverified user clicks "resend verification email", THE system SHALL rate-limit this action to prevent abuse (maximum once per 5 minutes).

---

## Profile Management

### Profile Viewing

WHEN a member accesses their own profile page, THE system SHALL display all profile information they have entered.

WHEN a member views another member's profile (public profile view), THE system SHALL display:
- Display name
- Account creation date (join date)
- Number of articles posted
- Number of comments posted
- Any public biographical information if provided
- Avatar/profile picture if uploaded

WHEN a guest user accesses a member's profile page, THE system SHALL display the same public profile information as members see.

### Profile Editing

WHEN a member navigates to their profile settings/edit page, THE system SHALL display an editable form with all their current profile information.

THE system SHALL allow members to edit the following profile fields:
- Display name (1-50 characters)
- Bio/About section (optional, max 500 characters)
- Profile picture/avatar (optional, image upload)
- Notification preferences
- Visibility preferences

WHEN a member updates their profile information, THE system SHALL validate all changes against profile field rules and either save the changes or return specific validation errors.

WHEN profile changes are saved successfully, THE system SHALL display a confirmation message and update the profile immediately.

THE system SHALL NOT allow members to change their username or email address through profile editing (these require separate, more secure processes).

### Profile Picture/Avatar

WHERE a member has uploaded a profile picture, THE system SHALL display this picture next to their display name when they post articles or comments.

WHEN a member uploads a profile picture, THE system SHALL accept images in JPG, PNG, or GIF format only.

WHEN a member uploads a profile picture, THE system SHALL limit the file size to 5 MB maximum.

WHEN a member uploads a profile picture, THE system SHALL automatically resize/compress the image to a standard size (recommended: 200x200 pixels) for consistent display.

WHEN a member deletes their profile picture, THE system SHALL revert to displaying a default avatar placeholder.

### Public vs. Private Profile Information

THE system SHALL always display the following user information publicly:
- Display name
- Account creation date
- Number of articles posted
- Number of comments posted

WHERE a member has provided a bio/about section, THE system SHALL display this on their public profile.

THE system SHALL never display publicly:
- Email address
- Username (internal use only)
- Password information (never stored in readable form)
- Notification preferences
- IP address or login history
- Draft articles or unpublished content

---

## Email Verification & Confirmation

### Email Verification Requirement

WHEN a new member account is created through registration, THE system SHALL require email verification before the user can post articles or comments.

WHEN an unverified member attempts to create an article or post a comment, THE system SHALL deny the action and display a message: "Please verify your email address before posting. Check your email for the verification link."

### Verification Token & Code Management

WHEN registration is completed, THE system SHALL generate:
- A unique verification token (can be a JWT or UUID-based token)
- An alphanumeric verification code (8-12 characters, user-friendly for manual entry)
- An expiration timestamp (24 hours from generation)

WHEN a user attempts to verify using an expired code or token, THE system SHALL return an error message: "Your verification link has expired. Please request a new verification email."

WHEN verification succeeds, THE system SHALL record the verification timestamp and mark the account as verified.

### Email Verification Workflow

1. User completes registration → System generates verification email
2. System sends verification email to user's registered email address
3. User receives email and clicks verification link OR enters verification code
4. System validates the code/token against stored verification data
5. IF valid and not expired: Mark account as verified, allow posting
6. IF invalid or expired: Return error, offer to resend verification email

### Re-Sending Verification Email

WHEN a member clicks "resend verification email" on their account settings, THE system SHALL generate a new verification code and send a fresh verification email.

WHEN a member resends verification email, THE system SHALL invalidate the previous verification code/token.

WHEN resending verification email, THE system SHALL enforce rate limiting: maximum one resend request per 5 minutes per user account.

IF a member attempts to resend verification more frequently than allowed, THE system SHALL return an error: "Please wait before requesting another verification email."

---

## Password Management & Security

### Password Requirements

THE system SHALL enforce the following password requirements for all member and moderator accounts:

- Minimum length: 8 characters
- Maximum length: 128 characters
- Must contain at least one uppercase letter (A-Z)
- Must contain at least one lowercase letter (a-z)
- Must contain at least one numeric digit (0-9)
- Must not be in a list of commonly used passwords (e.g., "Password123", "Qwerty123")
- Must not contain the user's email address or username

### Password Change Functionality

WHEN a member navigates to their account security/password settings, THE system SHALL display a "change password" form.

WHEN a member changes their password, THE system SHALL require:
1. Current password (for verification)
2. New password (must meet password requirements)
3. Confirmation of new password (must match exactly)

WHEN the user submits password change with valid current password and new password meeting requirements, THE system SHALL update the password and display: "Your password has been changed successfully."

WHEN the user enters an incorrect current password, THE system SHALL deny the change and display: "Current password is incorrect."

WHEN the user enters a new password that does not meet requirements, THE system SHALL display specific error messages indicating which requirements are not met.

### Password Reset (Forgot Password)

WHEN a user clicks "forgot password" on the login page, THE system SHALL display a password reset form requesting the user's email address.

WHEN a user enters their email address on the password reset form, THE system SHALL:
1. Check if an account exists with that email
2. Generate a password reset token (valid for 1 hour)
3. Send a password reset email containing a secure reset link
4. Display a confirmation message: "If an account exists with this email, you will receive a password reset link."

**Security Note**: The system SHALL NOT reveal whether an account exists with the provided email address (for account privacy/security).

WHEN a user clicks the password reset link in their email, THE system SHALL display a password reset form where the user can enter:
1. New password (must meet password requirements)
2. Confirmation of new password

WHEN the user submits a valid new password, THE system SHALL:
1. Validate the reset token (check it hasn't expired)
2. Update the user's password
3. Invalidate all existing sessions for this user (force re-login on all devices)
4. Display: "Your password has been reset successfully. Please log in with your new password."

WHEN a user attempts to use an expired or invalid password reset link, THE system SHALL display: "Your password reset link has expired. Please request a new one."

### Password Storage & Hashing

THE system SHALL never store passwords in plain text.

THE system SHALL hash all passwords using a modern, secure algorithm (e.g., bcrypt with salt).

THE system SHALL use a salt length of at least 12 characters for password hashing.

THE system SHALL verify passwords by comparing the hash of the provided password against the stored hash (never by comparing plain text).

---

## Session Management & Security

### Session Creation

WHEN a user successfully logs in with valid email/username and password, THE system SHALL:
1. Create a user session
2. Generate a JWT (JSON Web Token) containing user ID and role
3. Set JWT expiration to 15 minutes (access token)
4. Optionally generate a refresh token (expiration: 7 days)
5. Return tokens to the client for authenticated requests

### Session Storage

WHERE the system uses httpOnly cookies for session management, THE system SHALL store authentication tokens in httpOnly cookies (secure against XSS attacks).

WHERE the system uses localStorage for session storage, THE system SHALL inform users that token storage in localStorage has XSS vulnerability considerations and should use HTTPS.

THE system SHALL include appropriate CORS headers for token-based authentication.

### Session Expiration

WHEN a user's access token expires (15 minutes), THE system SHALL require re-authentication or token refresh.

WHERE a refresh token is implemented, THE system SHALL allow users to obtain a new access token using their valid refresh token.

WHEN a user logs out, THE system SHALL:
1. Invalidate the current session
2. Clear authentication tokens from client storage
3. Display: "You have been logged out successfully."

WHEN a user's session expires due to inactivity, THE system SHALL display a message requiring the user to log in again.

---

## Account Preferences & Settings

### Notification Preferences

WHEN a member accesses their notification preferences, THE system SHALL display toggles for:
- Email notifications for replies to their articles
- Email notifications for replies to their comments
- Daily digest of new articles (optional)
- Email notifications of moderator actions affecting their content

THE member SHALL be able to enable or disable each notification type individually.

WHEN a member changes notification preferences, THE system SHALL apply these preferences immediately to all future notifications.

### Expanded Notification Preferences Specification

WHEN a member has notification preferences enabled, THE system SHALL:
- Send notifications only for events matching their preference settings
- Include an "Unsubscribe" link in every notification email for immediate opt-out
- Provide digest frequency options: Immediate, Daily, Weekly (if implemented)
- Maintain notification delivery logs for 30 days for user reference

WHEN a member updates frequency preferences, THE system SHALL:
- Apply changes to the next notification batch
- Display confirmation of preference changes
- Allow manual override per notification (e.g., "Send this now" or "Hold this")

### Display Preferences

THE member SHALL be able to set their preferred display theme (if applicable):
- Light mode
- Dark mode
- System default

WHERE a member has set display preferences, THE system SHALL remember these preferences and apply them on subsequent visits.

### Privacy & Visibility Settings

THE member SHALL be able to control:
- Whether their profile is fully public or visible only to logged-in members
- Whether their article/comment history is visible to other users
- Whether their account appears in system-wide statistics

THE member SHALL be able to opt out of having their content included in any site-wide statistics or leaderboards.

WHEN a member changes privacy settings, THE system SHALL:
- Apply changes immediately to public views
- Update profile visibility across all user profiles
- Send confirmation of privacy setting changes
- Document visibility changes in the user's account history log

---

## User Profile Fields

### Complete User Data Schema

Each user account in the discussionBoard system SHALL maintain the following data:

| Field | Type | Required | Constraints | Notes |
|-------|------|----------|-------------|-------|
| User ID | UUID/Integer | Yes | Unique, immutable | System-generated identifier |
| Email | String | Yes | Valid email, unique | Max 254 characters, used for verification and password reset |
| Username | String | Yes | Unique, 3-30 chars, alphanumeric + underscore/hyphen | Case-insensitive uniqueness |
| Password Hash | String | Yes | Hashed with bcrypt | Never stored in plain text |
| Display Name | String | Yes | 1-50 characters | Publicly visible with posts |
| Bio/About | Text | No | Max 500 characters | Optional, publicly visible |
| Profile Picture | File Reference | No | JPG/PNG/GIF, max 5 MB | Optional, resized to 200x200px |
| Account Status | Enum | Yes | active, suspended, deleted | Default: active (after verification) |
| Email Verified | Boolean | Yes | true/false | Default: false until verification complete |
| Verification Token | String | No | Unique token | Cleared after verification |
| Verification Expiry | Timestamp | No | 24 hours from creation | Cleared after verification |
| Created At | Timestamp | Yes | ISO 8601 format | Account creation date/time |
| Updated At | Timestamp | Yes | ISO 8601 format | Last profile modification |
| Last Login | Timestamp | No | ISO 8601 format | Track user activity |
| Role | Enum | Yes | member, moderator, admin | Default: member |
| Notification Preferences | JSON | No | Structured settings | Stores user preferences |
| Display Theme | String | No | light, dark, system | Optional, default: system |
| Last IP Address | String | No | IPv4 or IPv6 | For security logging |
| Account Locked | Boolean | No | true/false | After too many failed login attempts |
| Lock Expiry | Timestamp | No | ISO 8601 format | Time until account unlock |
| Privacy Settings | JSON | No | Structured visibility settings | Controls profile/content visibility |
| Privacy Last Updated | Timestamp | No | ISO 8601 format | Track when privacy settings changed |

### Data Validation Rules by Field

**Email Address**:
- WHEN a user enters an email during registration or profile update, THE system SHALL validate it against RFC 5322 email format rules.
- THE system SHALL convert email addresses to lowercase for storage and comparison (email addresses are case-insensitive).
- THE system SHALL check for email uniqueness before creating or updating an account.
- THE system SHALL reject disposable/temporary email addresses (optional enhancement, not required for initial version).

**Username**:
- WHEN a user enters a username during registration, THE system SHALL validate it is 3-30 characters.
- THE system SHALL validate that username contains only letters, numbers, underscores, and hyphens.
- THE system SHALL validate username uniqueness in a case-insensitive manner.
- THE system SHALL not allow usernames that are reserved system terms (e.g., "admin", "system", "root").
- THE system SHALL prevent usernames consisting entirely of numbers.

**Display Name**:
- WHEN a user enters a display name, THE system SHALL validate it is 1-50 characters in length.
- THE system SHALL allow letters, numbers, spaces, and common punctuation (. , ! ? - ').
- THE system SHALL trim leading and trailing whitespace from display names.
- THE system SHALL not allow display names consisting only of whitespace.

**Bio/About**:
- WHEN a user enters a bio, THE system SHALL enforce a maximum of 500 characters.
- THE system SHALL allow text formatting if supported, or plain text only.
- THE system SHALL remove or escape any potentially malicious HTML/script content.
- THE system SHALL preserve line breaks and basic text structure.

---

## Account Lifecycle Management

### Account Status States

User accounts progress through the following status states:

1. **Unverified**: New accounts pending email verification—user cannot post until verified
2. **Active**: Normal operating state—user can post articles, comments, and fully participate
3. **Suspended**: Moderator-initiated temporary restriction—user cannot post but account retains data
4. **Terminated**: Moderator-initiated permanent restriction—user cannot login
5. **Deleted**: User-initiated account deletion—account data is handled per retention policy

### Account Status Transitions

WHEN a new user registers, THE system SHALL create the account with "Unverified" status.

WHEN a user verifies their email, THE system SHALL transition the account to "Active" status.

WHEN a moderator suspends an account, THE system SHALL transition from "Active" to "Suspended" with a defined end date or indefinite suspension.

WHEN a suspension period expires, THE system SHALL automatically transition the account back to "Active" status.

WHEN a moderator terminates an account, THE system SHALL transition the account to "Terminated" status (permanent, no auto-reactivation).

WHEN a user requests account deletion, THE system SHALL transition to "Deleted" status with anonymization of content per data retention policy.

### Account Deletion Workflow

WHEN a member navigates to "delete account" in their settings, THE system SHALL display a confirmation dialog warning about permanent consequences.

WHEN a member confirms account deletion, THE system SHALL:
1. Require the user to enter their password for security verification
2. Display a final confirmation: "Are you sure? This cannot be undone."
3. Allow the user to cancel up to final confirmation

WHEN a member provides correct password and final confirmation, THE system SHALL mark the account as "deleted" and apply the data retention policy.

WHEN an account is deleted, THE system SHALL perform the following within 24 hours:
- Delete all personal information (email, username, password hash, display name)
- Delete profile picture and preferences
- Anonymize all content authored by the user (mark author as "[Deleted User]")
- Retain article/comment content for discussion continuity
- Remove email address from all mailing lists
- Log the deletion action with timestamp

### Data Retention After Account Deletion

WHERE a user deletes their account, THE system SHALL handle user data as follows:

**Retained Data** (for moderation and audit purposes):
- Anonymous record of article/comment existence (timestamps, counts)
- Moderation history and actions related to the user
- Account creation and deletion timestamps
- IP address logs (retained for 90 days)

**Deleted Data**:
- User's personal information (email, username, password, display name, bio)
- User's profile picture
- User's preferences and settings
- Direct mapping of user to their historical content (replaced with "[Deleted User]")
- Session tokens and authentication records (within 30 days)

**Article & Comment Handling**:
- Articles and comments created by deleted accounts SHALL remain on the platform
- The author name SHALL be replaced with "[Deleted User]" or similar in all views
- The content remains for discussion continuity
- If user or moderator requests permanent content deletion, articles/comments may be deleted at moderator discretion
- Content timestamps and visibility (public/published state) are preserved

### Account Recovery After Deletion

THE system SHALL allow deleted accounts to be recovered within 30 days of deletion if the user requests recovery through email verification.

WHEN a user requests account recovery within 30 days, THE system SHALL:
1. Send a recovery verification email to the address associated with the deleted account
2. Require the user to verify they own the deleted email address
3. Upon verification, restore the account to "Active" status
4. Re-assign all articles/comments back to the recovered account
5. Notify the user of successful recovery

WHEN a user attempts account recovery after 30 days have passed since deletion, THE system SHALL display: "This account cannot be recovered as the deletion is permanent."

AFTER 30 days have passed since deletion, THE system SHALL permanently purge the deleted account record and make the email address available for re-registration.

WHEN a purged email is re-registered, THE system SHALL create a completely new account with no linkage to the previous account history.

### Account Suspension by Moderators

WHEN a moderator suspends a member account, THE system SHALL:
1. Record the suspension reason, duration, and moderator who performed the action
2. Prevent the user from posting new articles or comments
3. Prevent the user from logging in (optional: allow read-only view)
4. Send the user an email notification of the suspension with reason and duration
5. Log the action with timestamp in the audit trail
6. Allow the user to view existing content but not create new content

WHEN a user attempts to post while suspended, THE system SHALL display: "Your account has been temporarily suspended. Please check your email for details."

WHEN a user attempts to log in while suspended, THE system SHALL display: "Your account is suspended until [DATE] for the following reason: [REASON]. Contact support if you believe this is in error."

WHEN a suspension period expires, THE system SHALL automatically reactivate the account to "active" status.

WHEN a suspension expires, THE system SHALL send the user a notification: "Your account suspension has ended and your account is now active."

WHEN a moderator terminates (permanently bans) an account, THE system SHALL apply the same policies as suspension but with no auto-reactivation.

---

## Account Access and Security

### Login Requirements

WHEN a user navigates to the login page, THE system SHALL display a form requesting:
1. Email address OR username
2. Password

WHEN a user provides correct credentials, THE system SHALL authenticate the user and establish a session.

WHEN a user provides incorrect credentials, THE system SHALL display a generic error: "Invalid email/username or password" (not indicating which field was wrong, for security).

### Account Lockout Protection

WHEN a user enters an incorrect password 5 times consecutively within 15 minutes, THE system SHALL lock the account temporarily for 15 minutes.

WHEN an account is locked, THE system SHALL display: "Your account is temporarily locked due to multiple failed login attempts. Please try again in 15 minutes or reset your password."

WHEN the lockout period expires, THE system SHALL automatically unlock the account.

THE system SHALL record all failed login attempts for security audit purposes (no more than 6 months retention).

WHEN a user is locked out, THE system SHALL send a security alert email: "We detected multiple failed login attempts on your account. If this was you, you can ignore this message. If not, please reset your password immediately."

### IP Address Tracking & Security Alerts (Enhanced Security)

WHEN a user logs in from a new IP address or geographic location, THE system MAY send a security notification email (optional for initial version).

WHEN a user logs in from an IP address different from their last known location, THE system MAY require additional verification via security question or email confirmation (optional for initial version).

THE system SHALL log all login IP addresses for security auditing and fraud detection purposes.

WHEN suspicious login activity is detected (multiple IPs in short timeframe), THE system MAY automatically lock the account pending user verification.

### Two-Factor Authentication (Future Consideration)

**Note**: Two-factor authentication is NOT required for this simple discussion board but is listed here as a potential future enhancement.

WHERE two-factor authentication is implemented, THE system SHALL allow members to enable optional 2FA using:
- Time-based one-time password (TOTP) via authenticator apps
- Email-based verification codes
- SMS-based verification codes (if infrastructure supports)

---

## Summary of EARS Requirements

### Ubiquitous Requirements
- THE system SHALL store all passwords as hashed values using bcrypt with salt of at least 12 characters.
- THE system SHALL enforce email address uniqueness across all accounts.
- THE system SHALL enforce username uniqueness in a case-insensitive manner.
- THE system SHALL display user's display name (not username) publicly with their posts.
- THE system SHALL never display passwords or password hashes to users, including administrators.
- THE system SHALL require HTTPS for all account-related operations.

### Event-Driven Requirements
- WHEN a user completes registration, THE system SHALL send a verification email with a link valid for 24 hours.
- WHEN a user clicks a password reset link, THE system SHALL display a password reset form valid for 1 hour only.
- WHEN a member changes their password, THE system SHALL invalidate all existing sessions and require new login.
- WHEN a user enters incorrect credentials 5 times, THE system SHALL lock the account for 15 minutes.
- WHEN a member deletes their account, THE system SHALL anonymize their historical content within 24 hours.
- WHEN a moderator suspends an account, THE system SHALL prevent login and posting but allow account viewing.
- WHEN a suspension period expires, THE system SHALL automatically reactivate the account.

### State-Driven Requirements
- WHILE an account is unverified, THE system SHALL prevent posting articles or comments.
- WHILE an account is suspended, THE system SHALL allow viewing but prevent creating new content.
- WHILE an account is deleted, THE system SHALL prevent login and restore from deleted state only within 30 days.
- WHILE an account is locked due to failed attempts, THE system SHALL reject all login attempts.

### Unwanted Behavior (Error Handling)
- IF a user enters an invalid email format, THEN THE system SHALL return an error and prevent registration.
- IF a password does not meet complexity requirements, THEN THE system SHALL display specific requirements not met.
- IF a verification code is expired, THEN THE system SHALL offer to resend the verification email.
- IF an account is locked due to failed logins, THEN THE system SHALL display the lockout duration.
- IF a user attempts to recover a deleted account after 30 days, THEN THE system SHALL deny recovery and allow new registration with the email.
- IF two users attempt simultaneous edits to profile, THEN THE system SHALL use last-write-wins with conflict notification.

### Optional Features (Future Enhancement)
- WHERE a user enables two-factor authentication, THE system SHALL require verification code on login from new devices.
- WHERE a user enables IP address notifications, THE system SHALL alert user of logins from unusual locations.
- WHERE an organization uses LDAP or SSO, THE system MAY support federated authentication (not required for initial version).

---

> *Developer Note: This document defines **business requirements only**. All technical implementations (authentication libraries, session storage, database design, encryption libraries, password hashing libraries, etc.) are at the discretion of the development team.*