**discussionBoard — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their roles and what they can do.

## guest Actor

Guests are unauthenticated visitors to the discussion board platform. They can browse all public sections and view the list of available sections with their descriptions. Guests can read articles in any section, viewing titles, authors, tags, and posting times in the article list. When viewing a single article, guests can access the full content, attachments, and tags. Guests can download attached files and images from articles. They can search articles by title or content and filter search results by tags. Guests can view all comments on articles, seeing author information, content, and posting times. They can also view user profiles, including display names, bios, and lists of articles and comments written by each user. Guests cannot create, edit, or delete any content on the platform. They cannot post comments, write articles, or manage any user-generated content. Guests must register and log in to gain member privileges and participate in discussions.

### Unauthenticated Browsing

WHEN a guest visits the discussion board platform, THE system SHALL allow browsing without requiring authentication.

WHEN a guest accesses the platform, THE system SHALL display all public sections with their names and descriptions.

THE system SHALL enable guests to read all public content including sections, articles, and comments.

THE system SHALL provide read-only access to all content for unauthenticated visitors.

WHEN a guest navigates the platform, THE system SHALL NOT require login or account creation for viewing content.

THE system SHALL allow guests to explore all available sections and their contents.

WHEN a guest views the homepage, THE system SHALL display the list of all sections with descriptions.

### Section and Article Viewing

WHEN a guest browses sections, THE system SHALL display each section's name and description.

THE system SHALL show the complete list of sections available on the platform.

WHEN a guest views the article list in a section, THE system SHALL display article titles, authors, tags, comment counts, and posting times.

THE system SHALL NOT display full article content in the article list view.

WHEN a guest selects an article from the list, THE system SHALL display the full article content.

THE system SHALL show article metadata including title, author name, tags, and posting time on the article view page.

WHEN a guest views an article, THE system SHALL display all tags associated with the article.

THE system SHALL show the author's display name on each article.

WHEN a guest sorts articles, THE system SHALL support ordering by newest first or oldest first.

THE system SHALL paginate the article list when the number of articles exceeds the display limit.

### Search and Tag Filtering

WHEN a guest searches for articles, THE system SHALL search across article titles and content.

THE system SHALL display search results with pagination when multiple articles match.

WHEN a guest filters articles by tags, THE system SHALL show only articles containing the selected tags.

THE system SHALL allow guests to combine search queries with tag filtering.

WHEN a search returns no results, THE system SHALL display an appropriate message indicating no matching articles were found.

THE system SHALL display search result metadata including title, author, tags, and posting time for each matching article.

### Profile and Comment Viewing

WHEN a guest views a user profile, THE system SHALL display the user's display name and bio.

THE system SHALL show a list of all articles written by the user on their profile page.

THE system SHALL show a list of all comments written by the user on their profile page.

WHEN a guest views an article page, THE system SHALL display all comments associated with that article.

THE system SHALL show each comment with the author's display name, content, and posting time.

WHEN comments are displayed, THE system SHALL sort them by oldest first.

THE system SHALL allow guests to view profiles of any user who has written articles or comments on the platform.

### Attachment Access

WHEN a guest views an article with attachments, THE system SHALL display file and image attachment information.

THE system SHALL allow guests to download attached files from articles.

THE system SHALL allow guests to download attached images from articles.

WHEN a guest accesses an attachment, THE system SHALL display the filename and allow downloading.

THE system SHALL show attachment metadata including filename and upload date in the article view.

### Guest Limitations and Authentication Requirements

Guests SHALL NOT create any articles on the platform.

Guests SHALL NOT create any comments on articles.

Guests SHALL NOT edit or delete any content including articles and comments.

Guests SHALL NOT create, edit, or delete their own accounts.

Guests SHALL NOT access account management features including password changes or account deletion.

WHEN a guest attempts to perform a restricted action, THE system SHALL prompt them to register or log in.

THE system SHALL require authentication for all content creation operations.

THE system SHALL require authentication for all content modification operations.

Guests SHALL NOT participate in administrator request processes.

Guests SHALL NOT access administrative features or capabilities.

WHEN a guest attempts to access member-only features, THE system SHALL redirect to the registration or login page.

## member Actor

Members are authenticated users who have registered accounts on the discussion board platform. They can perform all actions available to guests, including browsing sections, viewing articles, and reading comments. Members can create new articles in any section with a required title and content. They can attach multiple files and images to their articles and add free-text tags for categorization. Members can edit their own articles, including updating the title, content, attachments, and tags. They can delete their own articles at any time. Members can write comments on articles and view all comments sorted by oldest first. They can edit their own comments and delete their own comments. Members can manage their profiles by setting and updating their display name and bio text. They can view other users' profiles to see their articles and comments history. Members can change their password for account security. They can delete their account, which removes all their articles and comments from the platform. Members can submit requests to become administrators by providing a reason for their application.

### Account Registration and Login

WHEN a new user registers for an account, THE system SHALL require a valid email address and password.

WHEN a user attempts to log in, THE system SHALL authenticate using email and password credentials.

IF the email format is invalid, THE system SHALL reject the registration request.

IF the password does not meet security requirements, THE system SHALL reject the registration request.

IF the email is already registered, THE system SHALL reject the registration request.

IF the provided credentials are invalid, THE system SHALL reject the login attempt.

IF the user account is banned, THE system SHALL prevent login and display a ban notification.

THE system SHALL create a user profile with a default display name derived from the email upon successful registration.

THE system SHALL establish an authenticated session upon successful login.

THE system SHALL maintain session state for authenticated members throughout their browsing session.

### Article Creation and Management

WHEN a member creates an article, THE system SHALL require a title and content.

WHEN a member creates an article, THE system SHALL require selection of one section.

WHEN a member creates an article, THE system SHALL allow attaching multiple files.

WHEN a member creates an article, THE system SHALL allow attaching multiple images.

WHEN a member creates an article, THE system SHALL allow adding multiple free-text tags.

WHEN a member edits their article, THE system SHALL allow updating the title and content.

WHEN a member edits their article, THE system SHALL allow modifying file attachments.

WHEN a member edits their article, THE system SHALL allow modifying image attachments.

WHEN a member edits their article, THE system SHALL allow updating tags.

WHEN a member deletes their article, THE system SHALL permanently remove the article and all its attachments.

IF the member attempts to edit an article they do not own, THE system SHALL reject the request.

IF the member attempts to delete an article they do not own, THE system SHALL reject the request.

IF the title is empty after editing, THE system SHALL reject the save request.

IF the content is empty after editing, THE system SHALL reject the save request.

IF the section is removed after article creation, THE system SHALL retain the article with its original section reference.

### Comment Writing and Management

WHEN a member writes a comment on an article, THE system SHALL require comment content.

WHEN a member edits their comment, THE system SHALL allow updating the content.

WHEN a member deletes their comment, THE system SHALL permanently remove the comment.

THE system SHALL display comments sorted by oldest first.

THE system SHALL display the author name, content, and timestamp for each comment.

IF the member attempts to edit a comment they do not own, THE system SHALL reject the request.

IF the member attempts to delete a comment they do not own, THE system SHALL reject the request.

IF the comment content is empty after editing, THE system SHALL reject the save request.

Comments shall be single-level only with no nested replies.

### Profile Management and Viewing

WHEN a member manages their profile, THE system SHALL allow setting and updating their display name.

WHEN a member manages their profile, THE system SHALL allow setting and updating their bio text.

THE system SHALL display the display name and bio on the member's profile page.

THE system SHALL allow other users to view any member's profile.

A member's profile SHALL display a list of all articles they have written.

A member's profile SHALL display a list of all comments they have written.

IF the display name is empty, THE system SHALL reject the profile update request.

THE system SHALL update the author name on all existing articles and comments when the display name changes.

### Password Change and Account Deletion

WHEN a member changes their password, THE system SHALL require the current password for verification.

WHEN a member changes their password, THE system SHALL require a new password that meets security requirements.

IF the current password is incorrect, THE system SHALL reject the password change request.

IF the new password does not meet security requirements, THE system SHALL reject the password change request.

WHEN a member deletes their account, THE system SHALL permanently remove all their articles and comments.

WHEN a member deletes their account, THE system SHALL permanently remove all file and image attachments from their articles.

WHEN a member deletes their account, THE system SHALL remove all their comments from articles.

THE system SHALL require confirmation before processing account deletion.

Account deletion SHALL be irreversible once confirmed.

### Administrator Request and Content Ownership

WHEN a member submits a request to become an administrator, THE system SHALL require a reason for the application.

THE system SHALL record the submission timestamp for administrator requests.

THE system SHALL allow members to view their own content ownership across the platform.

THE system SHALL display article and comment ownership on user profiles.

Authenticated members SHALL have full participation rights to create, edit, and delete their own content.

THE system SHALL distinguish between member-owned content and content owned by other users.

Members SHALL be able to identify their own articles and comments through visual ownership indicators.

THE system SHALL prevent members from modifying or deleting content owned by other members.

## admin Actor

Administrators are privileged users who have been approved to manage the discussion board platform. They retain all capabilities of regular members, including creating articles, writing comments, and managing their own content. Administrators can create new sections with names and descriptions for organizing discussions. They can edit existing sections to update names and descriptions. Administrators can delete any section from the platform. They have the authority to delete any article, regardless of who wrote it. Administrators can delete any comment on any article. They can ban users from the platform, recording a reason for the ban. Banned users cannot log in to access the platform. Administrators can unban previously banned users and restore their access. They can view the list of all banned users and review the ban reasons recorded for each user. Administrators can also view pending administrator requests and approve or reject applications. Regular administrators can be promoted to super administrator status by super administrators. They can be demoted from super administrator back to regular administrator status.

### Administrator Grade System

THE system SHALL support two administrator grades: regular administrator and super administrator.

WHEN a user is approved as an administrator, THE system SHALL assign them the regular administrator grade.

WHEN a super administrator reviews an administrator grade change request, THE system SHALL promote a regular administrator to super administrator status.

WHEN a super administrator reviews an administrator grade change request, THE system SHALL demote a super administrator to regular administrator status.

IF a super administrator attempts to demote themselves, THE system SHALL reject the request.

THE system SHALL maintain the grade distinction for all administrator actions and permissions.

Super administrators SHALL have all capabilities of regular administrators plus grade management authority.

### Administrator Approval Workflow

WHEN a user submits a request to become an administrator, THE system SHALL record the request with the provided reason.

THE system SHALL assign a pending status to new administrator requests.

WHEN a super administrator reviews a pending administrator request, THE system SHALL approve the request and grant administrator access to the user.

WHEN a super administrator reviews a pending administrator request, THE system SHALL reject the request and deny administrator access to the user.

THE system SHALL record the review timestamp when an administrator request is approved or rejected.

WHEN an administrator request is approved, THE system SHALL assign the regular administrator grade to the user.

WHEN an administrator request is rejected, THE system SHALL notify the user of the rejection.

Super administrators SHALL be able to view the list of all pending administrator requests.

Super administrators SHALL be able to view the reason submitted with each administrator request.

THE system SHALL maintain a complete history of all administrator requests including approved and rejected requests.

### Section Management

WHEN an administrator creates a new section, THE system SHALL require a section name.

WHEN an administrator creates a new section, THE system SHALL require a section description.

THE system SHALL assign the created section to the platform for all users to view.

WHEN an administrator edits an existing section, THE system SHALL allow updating the section name.

WHEN an administrator edits an existing section, THE system SHALL allow updating the section description.

THE system SHALL apply section changes immediately to all users viewing the section.

WHEN an administrator deletes a section, THE system SHALL remove the section from the platform.

WHEN an administrator deletes a section, THE system SHALL preserve all articles within the section and reassign them or handle as defined in business rules.

Administrators SHALL be able to view the complete list of all sections on the platform.

THE system SHALL restrict section creation, editing, and deletion to administrators only.

### Content Moderation Authority

Administrators SHALL have the capability to delete any article on the platform, regardless of the author.

WHEN an administrator deletes an article, THE system SHALL remove the article from all section listings.

WHEN an administrator deletes an article, THE system SHALL preserve the associated comments unless separately deleted.

Administrators SHALL have the capability to delete any comment on any article, regardless of the author.

WHEN an administrator deletes a comment, THE system SHALL remove the comment from the article's comment list.

THE system SHALL record the administrator who performed the deletion for audit purposes.

Administrators SHALL be able to view articles and comments before deciding to delete them.

THE system SHALL provide confirmation before permanent deletion of articles or comments.

Content removal SHALL be immediate and irreversible without administrative recovery capability.

### User Banning and Access Control

WHEN an administrator bans a user, THE system SHALL prevent the user from logging in to the platform.

WHEN an administrator bans a user, THE system SHALL require recording a reason for the ban.

THE system SHALL record the timestamp when the ban was applied.

THE system SHALL record which administrator applied the ban.

WHEN an administrator unbans a user, THE system SHALL restore the user's login access to the platform.

WHEN an administrator unbans a user, THE system SHALL remove the ban restriction immediately.

Administrators SHALL be able to view the complete list of all banned users on the platform.

Administrators SHALL be able to view the ban reason recorded for each banned user.

Banned users' existing articles SHALL remain visible to other users after the ban.

Banned users' existing comments SHALL remain visible to other users after the ban.

THE system SHALL maintain ban records for all banned users including ban reason and timestamp.

User access control SHALL be enforced at login to prevent banned users from accessing the platform.

# Authentication Flows

Registration, login, session management, and token policies.

## Registration and Login

Define user registration and login flows including validation and error handling.

### User Registration

WHEN a new user registers for the discussion board, THE system SHALL:
1. Require a valid email address
2. Require a password that meets security requirements
3. Require a display name
4. Create a user account with the provided information
5. Allow the user to optionally provide a bio text

WHEN a user submits a registration request, THE system SHALL:
1. Validate that the email address format is correct
2. Validate that the password meets minimum security requirements
3. Validate that the display name is provided and not empty
4. Check that the email address is not already registered
5. Check that the display name is not already in use

IF the email address format is invalid, THE system SHALL reject the registration request.
IF the password does not meet security requirements, THE system SHALL reject the registration request.
IF the display name is missing or empty, THE system SHALL reject the registration request.
IF the email address is already registered, THE system SHALL reject the registration request.
IF the display name is already in use, THE system SHALL reject the registration request.

### User Login

WHEN a registered user logs in to the discussion board, THE system SHALL:
1. Require the user's email address
2. Require the user's password
3. Authenticate the user credentials against stored account information
4. Create a session for the authenticated user
5. Grant the user access to member-only features

WHEN a user submits login credentials, THE system SHALL:
1. Validate that the email address format is correct
2. Validate that the password is provided and not empty
3. Verify the email address exists in the system
4. Verify the password matches the stored password hash
5. Check that the user account is not banned

IF the email address format is invalid, THE system SHALL reject the login request.
IF the password is missing or empty, THE system SHALL reject the login request.
IF the email address does not exist in the system, THE system SHALL reject the login request.
IF the password does not match the stored credentials, THE system SHALL reject the login request.
IF the user account is banned, THE system SHALL reject the login request and display a ban notice.

A banned user SHALL NOT be able to log in to the platform regardless of correct credentials.

### Account Management

WHEN a user changes their password, THE system SHALL:
1. Require the user to be authenticated
2. Require the current password for verification
3. Require a new password that meets security requirements
4. Update the password hash in the system
5. Invalidate any existing sessions and require re-login

WHEN a user requests password change, THE system SHALL:
1. Validate that the current password matches the stored credentials
2. Validate that the new password meets security requirements
3. Prevent the new password from being the same as the current password
4. Update the password hash after successful validation

IF the current password does not match, THE system SHALL reject the password change request.
IF the new password does not meet security requirements, THE system SHALL reject the password change request.
IF the new password is the same as the current password, THE system SHALL reject the password change request.

WHEN a user deletes their account, THE system SHALL:
1. Require the user to be authenticated
2. Require password confirmation for verification
3. Permanently delete the user account
4. Delete all articles written by the user
5. Delete all comments written by the user
6. Remove the user from any administrator roles if applicable

IF the password confirmation does not match, THE system SHALL reject the account deletion request.

## Session and Token Policy

Define session duration, token refresh, and expiration policies.

### Session Management

WHEN a user successfully logs in, THE system SHALL create a session for the user.

THE system SHALL associate the session with the authenticated user's account.

THE system SHALL maintain session state for the duration of the user's active period.

WHEN a user logs out, THE system SHALL terminate the session immediately.

WHEN a user's account is banned, THE system SHALL terminate any active sessions for that user.

WHEN a user's account is deleted, THE system SHALL terminate any active sessions for that user.

THE system SHALL allow only one active session per user account at any time.

IF a new session is created for a user with an existing active session, THE system SHALL terminate the previous session.

THE system SHALL track session start time for audit purposes.

THE system SHALL track session last activity time for inactivity detection.

### Token Policy

THE system SHALL use JWT tokens for session authentication.

THE system SHALL issue a JWT token upon successful user login.

THE system SHALL include the user's unique identifier in the JWT token payload.

THE system SHALL include the user's role (guest, member, admin, super-admin) in the JWT token payload.

THE system SHALL include the session identifier in the JWT token payload.

THE system SHALL sign all JWT tokens with a secure cryptographic key.

THE system SHALL validate the token signature on every authenticated request.

THE system SHALL reject requests with invalid or tampered tokens.

THE system SHALL reject requests with expired tokens.

THE system SHALL reject requests with tokens that do not match the current session.

THE system SHALL NOT store sensitive user information (password, bio) in the token payload.

### Token Refresh

THE system SHALL issue a refresh token along with the access token upon login.

THE system SHALL allow token refresh before the access token expires.

WHEN a user requests token refresh, THE system SHALL validate the refresh token.

IF the refresh token is valid, THE system SHALL issue a new access token.

IF the refresh token is invalid or expired, THE system SHALL require the user to re-authenticate.

WHEN a token is refreshed, THE system SHALL invalidate the previous refresh token.

THE system SHALL allow a maximum of 3 consecutive failed refresh attempts before requiring re-authentication.

THE system SHALL NOT allow token refresh for banned users.

THE system SHALL NOT allow token refresh for deleted user accounts.

### Session and Token Expiration

THE system SHALL set access token expiration to 30 minutes from issuance.

THE system SHALL set refresh token expiration to 7 days from issuance.

WHEN a session exceeds 30 minutes of inactivity, THE system SHALL mark it as expired.

WHEN a user's session is marked as expired, THE system SHALL require re-authentication.

THE system SHALL automatically log out users after 24 hours of continuous session time.

WHEN a token expires, THE system SHALL return an expiration error to the client.

THE system SHALL allow clients to attempt token refresh when an access token expires.

IF token refresh fails, THE system SHALL redirect the user to the login page.

THE system SHALL clear all session data upon user logout.

THE system SHALL clear all tokens upon account deletion.

### Security Policies

THE system SHALL transmit all tokens over encrypted HTTPS connections only.

THE system SHALL store tokens in secure, HTTP-only cookies.

THE system SHALL implement token binding to prevent token theft.

THE system SHALL detect and reject tokens used from different IP addresses within a short time window.

THE system SHALL log all authentication failures for security monitoring.

THE system SHALL implement rate limiting on login attempts to prevent brute force attacks.

THE system SHALL require password re-entry for sensitive operations (account deletion, password change).

WHEN a password is changed, THE system SHALL invalidate all existing sessions and tokens for that user.

THE system SHALL provide a mechanism for users to view their active session information.

THE system SHALL allow users to terminate all active sessions except the current one.

# Account Lifecycle

Account state transitions and lifecycle management.

## Account States and Transitions

Define account states (active, suspended, deleted) and valid transitions.

### Account States

THE system SHALL maintain three account states: active, suspended, and deleted.

WHEN a user registers, THE system SHALL create the account with active state.

WHILE an account is in active state, THE system SHALL allow the user to log in and access the platform.

WHILE an account is in suspended state, THE system SHALL prevent the user from logging in.

WHILE an account is in deleted state, THE system SHALL prevent the user from logging in and remove all access.

An active account can transition to suspended state when an administrator bans the user.

An active account can transition to deleted state when the user requests account deletion.

A suspended account can transition to active state when an administrator unbans the user.

A deleted account cannot transition to any other state.

### Account Suspension

WHEN an administrator bans a user, THE system SHALL transition the account to suspended state.

WHEN an administrator bans a user, THE system SHALL record the ban reason.

WHILE an account is suspended, THE system SHALL prevent the user from logging in to the platform.

WHILE an account is suspended, THE system SHALL keep the user's existing articles and comments visible to other users.

WHEN an administrator views the banned user list, THE system SHALL display the ban reason for each banned user.

IF a banned user attempts to log in, THE system SHALL reject the authentication request.

An administrator can ban any user except themselves.

An administrator can view the list of all banned users and their ban reasons.

### Account Unbanning

WHEN an administrator unbans a user, THE system SHALL transition the account from suspended to active state.

WHEN an administrator unbans a user, THE system SHALL clear the ban restriction.

A regular administrator can unban any user.

A super administrator can unban any user.

WHEN a user is unbanned, THE system SHALL allow them to log in and access the platform normally.

An administrator can unban a user only if the account is in suspended state.

### Account Deletion

WHEN a user requests account deletion, THE system SHALL transition the account to deleted state.

WHEN a user requests account deletion, THE system SHALL delete all articles written by the user.

WHEN a user requests account deletion, THE system SHALL delete all comments written by the user.

WHEN a user requests account deletion, THE system SHALL delete all file attachments associated with the user's articles.

WHEN a user requests account deletion, THE system SHALL delete all image attachments associated with the user's articles.

A deleted account cannot be restored.

A deleted account cannot transition to any other state.

IF a user attempts to log in with a deleted account, THE system SHALL reject the authentication request.

Users can request account deletion at any time while their account is in active or suspended state.

### Account Lifecycle Transitions

THE system SHALL enforce the following valid account state transitions:

1. Active → Suspended (when administrator bans user)
2. Active → Deleted (when user requests deletion)
3. Suspended → Active (when administrator unbans user)
4. Suspended → Deleted (when user requests deletion while suspended)

THE system SHALL reject any invalid state transitions.

THE system SHALL maintain an audit log of all account state transitions.

WHEN an account state changes, THE system SHALL record the timestamp of the transition.

WHEN an account state changes, THE system SHALL record the actor who initiated the transition.

A deleted account has no valid outgoing transitions.

An active account cannot transition directly to deleted state without user confirmation.