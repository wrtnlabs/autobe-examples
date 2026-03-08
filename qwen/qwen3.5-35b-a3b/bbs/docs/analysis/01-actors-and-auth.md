**economicPoliticalBoard — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their roles and what they can do.

## guest Actor

Guest users can browse the discussion board without creating an account. They can view the list of all sections on the platform. Guests can browse articles within any section and see article summaries. They can read the full content of individual articles including author and time posted. Guests are able to search for articles by title or content across all sections. Search results can be filtered by tags that appear on articles. Guests cannot create new articles, comments, or any content on the board. They cannot submit comments, like, or interact with existing content. Guest users cannot view other users' profiles beyond basic author information on articles. They cannot manage files or attachments beyond downloading from public articles.

### Guest Browsing and Section Visibility

WHEN a guest accesses the platform, THE system SHALL allow viewing the list of all sections.

THE system SHALL display each section with its name and description.

WHEN a guest is not authenticated, THE system SHALL permit browsing articles within any section.

IF a section is created or updated by an administrator, THE system SHALL make it immediately visible to guests.

IF a section is deleted by an administrator, THE system SHALL prevent guests from viewing articles in that section.

WHEN a guest attempts to view a deleted section, THE system SHALL display an error message indicating the section is no longer available.

THE system SHALL allow guests to navigate to any section without requiring authentication.

IF a guest accesses the platform, THE system SHALL verify no authentication is required for basic browsing.

### Article Reading Access

WHEN a guest views an article, THE system SHALL display the article title without requiring login.

THE system SHALL show the article author's display name on the article list.

WHEN a guest reads an article, THE system SHALL display the full article content.

THE system SHALL show the time when the article was posted.

WHEN a guest accesses an article, THE system SHALL display the section the article belongs to.

IF an article is deleted by an administrator or author, THE system SHALL prevent guests from viewing it.

IF a guest tries to access a deleted article, THE system SHALL display an error message.

WHEN a guest navigates to an article URL, THE system SHALL validate the article exists and is not deleted.

THE system SHALL allow unlimited concurrent guest article reads without authentication.

IF an article is in any state, THE system SHALL allow guests to read published articles only.

### Search and Filter Capabilities

WHEN a guest searches for articles, THE system SHALL search by article title.

THE system SHALL search by article content text.

WHEN search results are returned, THE system SHALL paginate the results.

THE system SHALL limit results per page to a configurable number.

WHEN a guest applies tag filters, THE system SHALL filter articles by the selected tags.

IF a guest searches with no terms, THE system SHALL return all articles.

IF a guest searches with invalid tag names, THE system SHALL return no results.

WHEN a guest performs a search, THE system SHALL display the article count for the query.

THE system SHALL allow guests to sort search results by date (newest first, oldest first).

WHEN a guest applies multiple tag filters, THE system SHALL return articles matching all selected tags.

IF a search term matches no articles, THE system SHALL display a message indicating no results found.

### Guest Content Restrictions

WHEN a guest is not authenticated, THE system SHALL prevent creating new articles.

THE system SHALL prevent guests from writing comments on articles.

IF a guest attempts to access a creation function, THE system SHALL redirect to the registration page.

WHEN a guest tries to edit an article, THE system SHALL reject the request.

WHEN a guest tries to delete any content, THE system SHALL reject the request.

THE system SHALL not allow guests to create tags on articles.

IF a guest attempts to upload files, THE system SHALL prevent the action.

WHEN a guest tries to modify their profile, THE system SHALL display a login requirement message.

THE system SHALL allow guests to view but not modify any content.

IF a guest attempts an action requiring authentication, THE system SHALL return a clear error message.

WHEN a guest submits a comment form, THE system SHALL require login before submission.

### Author Information Viewing

WHEN viewing an article, THE system SHALL show the article author's display name.

THE system SHALL display the author's profile link on the article.

WHEN a guest clicks an author's profile link, THE system SHALL allow viewing the public profile.

THE system SHALL show the author's bio in their profile page.

WHEN viewing an author profile, THE system SHALL display a list of articles written by that author.

THE system SHALL display a list of comments written by that author.

IF an author has been banned, THE system SHALL still allow viewing their name and content.

WHEN a guest views an author profile, THE system SHALL show their creation and update timestamps.

THE system SHALL allow guests to see how long ago an author joined the platform.

IF an author's profile is empty, THE system SHALL still display the profile page with a message.

WHEN a guest views article comments, THE system SHALL show the commenter's display name.

### File Download Access

WHEN a guest views an article with attachments, THE system SHALL display the list of attached files.

THE system SHALL allow downloading any attached file without authentication.

WHEN a guest clicks a download link, THE system SHALL initiate the file download.

THE system SHALL display the file name for each attachment.

WHEN a guest downloads a file, THE system SHALL preserve the original file type.

IF an attachment is deleted by an administrator, THE system SHALL remove it from the article view.

WHEN a guest attempts to download a deleted attachment, THE system SHALL display an error message.

THE system SHALL allow unlimited file downloads for guests.

IF a file attachment exceeds reasonable size, THE system SHALL inform the guest of the size.

WHEN a guest downloads an image attachment, THE system SHALL open the image in the browser.

IF a file download fails, THE system SHALL display a user-friendly error message.

### Anonymous Access Limitations

WHEN a guest accesses the platform, THE system SHALL allow anonymous browsing without creating an account.

THE system SHALL not require email or password for basic reading activities.

IF a guest attempts to access member-only features, THE system SHALL require account creation or login.

THE system SHALL clearly indicate which features are available without an account.

WHEN a guest tries to access administrative functions, THE system SHALL display an access denied message.

IF a guest attempts to perform any modification, THE system SHALL require authentication.

WHEN a guest submits a request to become an administrator, THE system SHALL require a logged-in account.

THE system SHALL not expose internal system information to anonymous users.

WHEN a guest browses the platform, THE system SHALL not track their identity beyond basic session.

IF a guest performs no authentication, THE system SHALL maintain anonymous status until they choose to log in.

## member Actor

Members are users who have created accounts with email and password. They can create new articles in any available section of the board. Every article requires a title and content that the member composes. Members attach files and images to their articles for additional context. They can add multiple tags to their articles using free text entries. Members can edit their own articles to update title, content, attachments, and tags. They can delete their own articles when no longer needed. Members write comments on articles and can edit their own comments. They can delete comments they have authored on any article. Members view and edit their own profile including display name and bio text. They can view other users' profiles showing articles and comments. Members can submit requests to become administrators with a written reason. Banned members lose login access but their content remains visible.

### Member Account Creation

WHEN a user signs up for an account, THE system SHALL:
1. Require an email address and password
2. Validate that the email is unique across all users
3. Store the email and encrypted password securely
4. Create an initial profile with default display name
5. Grant access to create articles and comments immediately

IF the email address is already registered, THE system SHALL reject the account creation request.
IF the password does not meet security requirements, THE system SHALL reject the request.

THE system SHALL allow users to change their password at any time through the account settings.

IF a user account has been deleted, THE system SHALL NOT allow re-registration with the same email address.

WHEN a user deletes their account, THE system SHALL:
1. Remove all articles authored by that user
2. Remove all comments written by that user
3. Delete the user profile including display name and bio
4. Mark the account as permanently deleted

### Article Creation with Attachments

WHEN a member creates an article, THE system SHALL:
1. Require a title for the article
2. Require content text for the article
3. Require selection of one section from available sections
4. Allow optional attachment of multiple files
5. Allow optional attachment of multiple images

IF the article title is missing, THE system SHALL reject the creation request.
IF the article content is empty, THE system SHALL reject the creation request.
IF no section is selected, THE system SHALL reject the creation request.

THE system SHALL allow members to attach multiple files and images to a single article.

WHEN files and images are attached to an article, THE system SHALL:
1. Store the attachments securely
2. Make them downloadable when viewing the article
3. Preserve attachment integrity during article edits

THE system SHALL allow members to upload files of various types including documents and images.

IF an attachment exceeds the maximum size limit, THE system SHALL reject the attachment upload.

### Article Tag Management

WHEN a member creates or edits an article, THE system SHALL:
1. Allow free text entry for tags
2. Permit multiple tags on a single article
3. Validate that tags contain appropriate text content
4. Allow tags to be added, edited, or removed

IF the tag contains prohibited content, THE system SHALL reject the tag.

THE system SHALL store all tags associated with an article.

WHEN tags are modified on an article, THE system SHALL:
1. Update the tag associations immediately
2. Preserve existing tags unless explicitly removed
3. Allow filtering articles by tag in search results

THE system SHALL enable tag-based filtering when users search for articles.

IF a tag is removed from an article, THE system SHALL delete the tag association record.

### Own Article Editing

WHEN a member edits their own article, THE system SHALL:
1. Allow updates to the article title
2. Allow updates to the article content
3. Allow updates to attached files and images
4. Allow updates to tags associated with the article
5. Preserve the article's original creation timestamp
6. Update the modification timestamp

IF the member attempting to edit is not the article author, THE system SHALL reject the edit request.

THE system SHALL allow members to modify all editable aspects of their articles.

WHEN an article is edited, THE system SHALL:
1. Save the updated content immediately
2. Update the last modified timestamp
3. Maintain the article in its original section

IF the section no longer exists, THE system SHALL prevent the edit and display an error.

THE system SHALL allow members to revert their article content to previous versions through the edit interface.

### Own Article Deletion

WHEN a member deletes their own article, THE system SHALL:
1. Remove the article from all article lists
2. Delete all comments associated with that article
3. Remove all attachments linked to the article
4. Delete all tag associations for the article
5. Mark the article as permanently deleted

IF the member attempting to delete is not the article author, THE system SHALL reject the deletion request.

THE system SHALL NOT allow recovery of deleted articles.

WHEN an article is deleted, THE system SHALL:
1. Permanently remove all associated data
2. Free storage space for attachments
3. Update author statistics to reflect the deletion

IF a user's account is deleted, THE system SHALL automatically delete all their articles.

THE system SHALL confirm deletion with the user before permanently removing the article.

### Comment Posting on Articles

WHEN a member writes a comment on an article, THE system SHALL:
1. Require content text for the comment
2. Associate the comment with the article being discussed
3. Record the author's identity and timestamp
4. Display comments in chronological order (oldest first)

IF the comment content is empty, THE system SHALL reject the comment creation request.

THE system SHALL only allow single-level comments (no nested replies).

WHEN a comment is posted, THE system SHALL:
1. Make it visible immediately to all users viewing the article
2. Increment the article's comment count
3. Include the comment in the article's comment list

THE system SHALL allow members to view all comments on any article.

IF an article does not exist, THE system SHALL reject the comment posting request.

THE system SHALL sort all comments on an article by creation time, oldest first.

### Comment Editing and Deletion

WHEN a member edits their own comment, THE system SHALL:
1. Allow updates to the comment content
2. Preserve the original creation timestamp
3. Update the modification timestamp
4. Display the edited version to all users

IF the member attempting to edit is not the comment author, THE system SHALL reject the edit request.

WHEN a member deletes their own comment, THE system SHALL:
1. Remove the comment from the article's comment list
2. Keep the comment's author information for visibility (if required by policy)
3. Update the article's comment count
4. Mark the comment as permanently deleted

IF the member attempting to delete is not the comment author, THE system SHALL reject the deletion request.

THE system SHALL NOT allow recovery of deleted comments.

IF a user's account is deleted, THE system SHALL automatically delete all their comments.

WHEN a comment is edited, THE system SHALL show the updated content to all users viewing the article.

### Profile Name and Bio Editing

WHEN a member edits their profile, THE system SHALL:
1. Allow updates to the display name
2. Allow updates to the bio text
3. Preserve the original profile creation date
4. Display the updated information on the user's profile page

IF the display name is empty, THE system SHALL reject the profile update request.

THE system SHALL allow members to modify their profile information at any time.

WHEN a profile is updated, THE system SHALL:
1. Save the new display name and bio immediately
2. Show the updated information across all profile views
3. Maintain association with all authored articles and comments

THE system SHALL prevent display names from being changed to prohibited or offensive content.

THE system SHALL preserve all user content (articles and comments) when profile information is updated.

### Other User Profile Viewing

WHEN a member views another user's profile, THE system SHALL:
1. Display the target user's display name and bio
2. Show a list of all articles written by that user
3. Show a list of all comments written by that user
4. Present this information to all authenticated members

IF the target user's account has been deleted, THE system SHALL display a deleted account message.

IF the target user's account has been banned, THE system SHALL:
1. Show the account as banned
2. Display the ban reason to the viewer
3. Continue showing the user's articles and comments

THE system SHALL allow viewing of any user's profile regardless of ban status.

WHEN viewing another user's profile, THE system SHALL:
1. Paginate the list of articles if the user has many
2. Paginate the list of comments if the user has many
3. Show basic article information in each list item

THE system SHALL NOT display password or sensitive account information to profile viewers.

### Admin Request Submission

WHEN a member submits a request to become an administrator, THE system SHALL:
1. Require a reason (text) for the request
2. Record the submission timestamp
3. Mark the request as pending
4. Allow the request to be viewed by super administrators

IF the reason is missing or empty, THE system SHALL reject the admin request submission.

THE system SHALL NOT automatically approve admin requests.

WHEN a super administrator approves an admin request, THE system SHALL:
1. Promote the user to regular administrator status
2. Grant administrator capabilities to the user
3. Update the request status to approved

WHEN a super administrator rejects an admin request, THE system SHALL:
1. Update the request status to rejected
2. Allow the user to submit a new request
3. NOT notify the user of the rejection

THE system SHALL allow users to view the status of their submitted admin requests.

### Banned Member Access Restrictions

WHEN a member's account is banned by an administrator, THE system SHALL:
1. Prevent the user from logging in to the platform
2. Maintain all their existing articles and comments
3. Record the reason for the ban
4. Record the administrator who issued the ban

IF a banned user attempts to log in, THE system SHALL reject the authentication request.

THE system SHALL allow administrators to view the list of all banned users.

WHEN a user is banned, THE system SHALL:
1. Keep their articles visible in article lists
2. Keep their comments visible in comment lists
3. Maintain their profile for viewing by other users

IF a banned user's account is deleted, THE system SHALL:
1. Remove all their articles
2. Remove all their comments
3. Remove their profile information

WHEN an administrator unbans a user, THE system SHALL:
1. Restore login access for the user
2. Maintain all existing content
3. Record the unban action

THE system SHALL NOT allow banned users to edit any content or create new content.

### Member Content Ownership

THE system SHALL recognize that each article belongs to its author.

THE system SHALL recognize that each comment belongs to its author.

THE system SHALL enforce that only article authors can edit their articles.

THE system SHALL enforce that only comment authors can edit their comments.

THE system SHALL enforce that only article authors can delete their articles.

THE system SHALL enforce that only comment authors can delete their comments.

WHEN a member views articles or comments, THE system SHALL show the author's display name.

THE system SHALL maintain the association between users and all their content throughout the content lifecycle.

IF an article's author account is deleted, THE system SHALL remove the article and its comments.

IF a comment's author account is deleted, THE system SHALL remove the comment.

THE system SHALL NOT allow members to transfer ownership of their articles or comments to other users.

## admin Actor

Administrators have elevated privileges beyond regular member capabilities. There are two grades: regular administrators and super administrators. Administrators can create new sections for organizing topics on the board. They can edit existing sections to update names and descriptions. Administrators can delete sections and all content within them. They have the ability to delete any article on the platform regardless of author. Administrators can delete any comment posted by any user. They can ban users from accessing the platform entirely. When banning, administrators record a reason for the ban action. Administrators can unban previously banned users. They can view lists of all banned users and their ban reasons. Super administrators can promote regular administrators to super grade. Super administrators can demote other super administrators to regular grade. Super administrators cannot demote themselves. Administrators can view pending administrator requests submitted by members. Super administrators can approve or reject administrator promotion requests. All administrator actions apply board-wide with full management capabilities.

### Administrator Grades and Capabilities

There are two administrator grades: regular administrator and super administrator.

WHEN an administrator accesses the platform, THE system SHALL display the administrator's current grade.

WHILE a user is a regular administrator, THE system SHALL allow the following actions:
1. Create new sections
2. Edit existing sections
3. Delete any article on the platform
4. Delete any comment on the platform
5. Ban users from the platform
6. Unban previously banned users
7. View the list of banned users and their ban reasons
8. View pending administrator requests
9. Submit administrator promotion requests

WHILE a user is a super administrator, THE system SHALL additionally allow the following actions:
1. Approve administrator promotion requests
2. Reject administrator promotion requests
3. Promote regular administrators to super administrator grade
4. Demote other super administrators to regular administrator grade

IF a super administrator attempts to demote themselves, THE system SHALL reject the action and display an error message.

ALL administrator actions apply board-wide with full management capabilities across all sections and users.

### Section Creation and Management

Administrators can create, edit, and delete sections for organizing topics on the board.

WHEN an administrator creates a section, THE system SHALL:
1. Require a section name
2. Require a section description
3. Record the creation timestamp

IF the section name is empty or missing, THE system SHALL reject the creation request.

WHEN an administrator edits a section, THE system SHALL:
1. Allow updating the section name
2. Allow updating the section description
3. Record the update timestamp

WHEN an administrator deletes a section, THE system SHALL:
1. Delete the section
2. Delete all articles within the section
3. Delete all comments within the deleted articles

IF the section does not exist, THE system SHALL reject the edit or delete request.

GUESTS and MEMBERS can view the list of all sections.
GUESTS and MEMBERS can browse articles within a specific section.

### Board-Wide Article Deletion

Administrators have the authority to delete any article on the platform regardless of author.

WHEN an administrator deletes an article, THE system SHALL:
1. Remove the article from the platform
2. Delete all comments associated with the article
3. Delete all attachments associated with the article
4. Record the deletion action

IF the article does not exist, THE system SHALL reject the deletion request.

IF the administrator does not have the delete article permission, THE system SHALL reject the deletion request.

Regular users can only delete their own articles.

WHEN a user deletes their own article, THE system SHALL:
1. Remove the article from the platform
2. Delete all comments associated with the article
3. Delete all attachments associated with the article

GUESTS and MEMBERS cannot delete articles they did not create.

### Any Comment Removal Rights

Administrators have the authority to delete any comment on the platform regardless of author.

WHEN an administrator deletes a comment, THE system SHALL:
1. Remove the comment from the platform
2. Record the deletion action

IF the comment does not exist, THE system SHALL reject the deletion request.

IF the administrator does not have the delete comment permission, THE system SHALL reject the deletion request.

Regular users can only delete their own comments.

WHEN a user deletes their own comment, THE system SHALL:
1. Remove the comment from the platform

WHEN a user edits their own comment, THE system SHALL:
1. Allow updating the comment content
2. Record the update timestamp

GUESTS and MEMBERS cannot delete comments they did not create.

### User Banning System

Administrators can ban users from accessing the platform entirely.

WHEN an administrator bans a user, THE system SHALL:
1. Record the ban reason (text)
2. Record the banning administrator's ID
3. Record the ban creation timestamp
4. Prevent the banned user from logging in to the platform
5. Preserve the banned user's existing articles and comments on the platform
6. Display the banned user as unavailable for all board activities

IF the user does not exist, THE system SHALL reject the ban request.

IF the reason is empty or missing, THE system SHALL reject the ban request.

WHEN a banned user attempts to log in, THE system SHALL:
1. Reject the login attempt
2. Display a message indicating the account is banned
3. Show the ban reason to the user

WHEN an administrator views the list of banned users, THE system SHALL:
1. Display each banned user's profile information
2. Display the ban reason for each banned user
3. Display the date and time of the ban
4. Display the administrator who performed the ban

WHEN an administrator unbans a user, THE system SHALL:
1. Remove the ban record
2. Allow the user to log in again
3. Restore full access to the platform

BANNED USERS CANNOT CREATE ARTICLES OR COMMENTS WHILE BANNED.

### Administrator Request Handling

Members can submit requests to become administrators with a reason.

WHEN a member submits an administrator request, THE system SHALL:
1. Record the request with the member's ID
2. Record the reason text
3. Record the submission timestamp
4. Set the request status to pending
5. Display the request to super administrators

IF the reason is empty or missing, THE system SHALL reject the request.

WHEN a super administrator approves an administrator request, THE system SHALL:
1. Change the request status to approved
2. Grant the member regular administrator privileges
3. Notify the member of approval

WHEN a super administrator rejects an administrator request, THE system SHALL:
1. Change the request status to rejected
2. Notify the member of rejection

WHEN a regular administrator views pending requests, THE system SHALL:
1. Display the list of pending requests
2. Show the requesting member's profile information
3. Show the reason provided by the member

Only super administrators can approve or reject administrator requests.

### Super Administrator Privileges

Super administrators have elevated privileges for managing other administrators.

WHEN a super administrator promotes a regular administrator to super administrator, THE system SHALL:
1. Change the administrator's grade to super administrator
2. Grant super administrator privileges
3. Record the promotion action
4. Notify the promoted administrator

IF the regular administrator does not exist, THE system SHALL reject the promotion request.

IF the administrator to be promoted is already a super administrator, THE system SHALL reject the promotion request.

WHEN a super administrator demotes a super administrator to regular administrator, THE system SHALL:
1. Change the administrator's grade to regular administrator
2. Remove super administrator privileges
3. Record the demotion action
4. Notify the demoted administrator

WHEN a super administrator views the list of pending promotion requests, THE system SHALL:
1. Display the list of requests submitted by regular administrators
2. Show the requesting administrator's profile information
3. Show the reason provided by the requesting administrator

SUPER ADMINISTRATORS CANNOT DEMOTE THEMSELVES.

### Administrator Promotion and Demotion Process

Administrators can submit requests for promotion from regular to super grade.

WHEN a regular administrator submits a promotion request, THE system SHALL:
1. Record the request with the administrator's ID
2. Record the reason for the promotion request (text)
3. Record the submission timestamp
4. Set the request status to pending
5. Display the request to super administrators

IF the administrator is already a super administrator, THE system SHALL reject the promotion request.

IF the reason is empty or missing, THE system SHALL reject the promotion request.

WHEN a super administrator approves a promotion request, THE system SHALL:
1. Change the requesting administrator's grade to super administrator
2. Grant super administrator privileges
3. Record the approval action
4. Notify the promoted administrator

WHEN a super administrator rejects a promotion request, THE system SHALL:
1. Change the request status to rejected
2. Notify the requesting administrator of rejection

WHEN a super administrator demotes another super administrator, THE system SHALL:
1. Change the grade to regular administrator
2. Remove super administrator privileges
3. Record the demotion action

SUPER ADMINISTRATORS CANNOT BE DEMOTED BY REGULAR ADMINISTRATORS.

# Authentication Flows

Registration, login, session management, and token policies.

## Registration and Login

Define user registration and login flows including validation and error handling.

### User Registration

WHEN a user registers a new account, THE system SHALL:

1. Accept an email address and password
2. Validate that the email address is not already registered
3. Store the password securely
4. Create a new user account with the provided credentials

IF the email address is already registered, THE system SHALL reject the registration.
IF the password does not meet security requirements, THE system SHALL reject the registration.

A guest can become a member by completing the registration process.

A member account can be created by any user who provides valid registration information.

IF the registration information is invalid, THE system SHALL display an appropriate error message.

WHEN a new member account is created, THE system SHALL record the creation timestamp.

WHEN a user submits registration, THE system SHALL verify that the user accepts the terms of service.

IF the user declines the terms of service, THE system SHALL prevent account creation.

WHEN registration succeeds, THE system SHALL prompt the user to complete their profile by providing a display name and bio.

The system SHALL not create an account without both a valid email and password.

A user can only have one account associated with a single email address.

### User Login

WHEN a user logs in, THE system SHALL:

1. Accept an email address and password
2. Validate the credentials against stored information
3. Create an active session for the authenticated user
4. Redirect the user to their dashboard upon successful authentication

IF the email address is not found in the system, THE system SHALL reject the login.
IF the password does not match the stored credentials, THE system SHALL reject the login.

IF the user account is banned, THE system SHALL prevent login and display a ban notification.

IF the user account has been deleted, THE system SHALL reject the login attempt.

A member who has an active account can log in with their credentials.

A guest who is not logged in can access the login form to sign in.

IF the user has forgotten their password, THE system SHALL provide a password recovery mechanism.

WHEN a user logs in, THE system SHALL record the login timestamp.

WHEN login succeeds, THE system SHALL prompt the user to complete their profile if it is incomplete.

A user can only maintain one active session at a time.

WHEN a user logs in from a new device, THE system SHALL notify the user via email.

IF multiple login attempts fail, THE system SHALL temporarily lock the account to prevent brute force attacks.

The system SHALL require both email and password for successful authentication.

IF the user provides incorrect credentials repeatedly, THE system SHALL implement additional security measures.

### Authentication Session

WHEN a user successfully authenticates, THE system SHALL:

1. Create a session token for the authenticated user
2. Set an expiration time for the session
3. Store session metadata including creation time and last activity

A session remains valid until it expires or the user logs out.

WHEN a session expires, THE system SHALL require the user to re-authenticate.

IF the user logs out, THE system SHALL immediately invalidate the session token.

WHEN a session becomes invalid, THE system SHALL prompt the user to sign in again.

A member with an active session can access protected features without re-entering credentials.

A guest without an active session cannot access protected features.

IF the session token is compromised, THE system SHALL allow the user to invalidate all active sessions.

WHEN a user changes their password, THE system SHALL invalidate all existing sessions.

The system SHALL automatically extend session activity for users who remain active.

WHEN a user is banned, THE system SHALL immediately invalidate all active sessions.

IF the system detects suspicious session activity, THE system SHALL require re-authentication.

A session SHALL be invalidated after a period of user inactivity.

WHEN a user attempts to access a protected resource without a valid session, THE system SHALL redirect to the login page.

The system SHALL provide a "Remember Me" option for extended session duration.

### Account Security Management

WHEN a user wants to change their password, THE system SHALL:

1. Require the current password for verification
2. Accept a new password
3. Validate the new password meets security requirements
4. Update the stored password securely

IF the current password is incorrect, THE system SHALL reject the password change.
IF the new password does not meet security requirements, THE system SHALL reject the change.

IF the user deletes their account, THE system SHALL:

1. Delete all articles authored by the user
2. Delete all comments written by the user
3. Remove the user account permanently

WHEN a user deletes their account, THE system SHALL perform a final confirmation step.

IF the user cancels account deletion, THE system SHALL preserve all user data.

A member can manage their own account security settings.

IF the user requests account deletion, THE system SHALL record the deletion timestamp.

WHEN a user changes their password, THE system SHALL notify the user via email.

A user SHALL NOT be able to delete their account while they have pending administrator requests.

WHEN an account is deleted, THE system SHALL permanently remove all associated data.

The system SHALL provide a grace period for account deletion before permanent removal.

IF a banned user attempts account deletion, THE system SHALL allow the deletion after review.

A user can only delete their own account, not accounts belonging to others.

WHEN a user changes password or deletes account, THE system SHALL audit the action for security purposes.

### Account Access Control

A guest user can access public sections of the board without logging in.

A guest user can browse sections and view article lists.

A guest user can search articles without an account.

A guest user can view individual article content without logging in.

A member who is logged in can create articles in any section.

A member who is logged in can write comments on articles.

A member who is logged in can edit their own articles.

A member who is logged in can delete their own articles.

A member who is logged in can edit their own comments.

A member who is logged in can delete their own comments.

IF a guest attempts to create an article, THE system SHALL require them to sign in first.

IF a guest attempts to write a comment, THE system SHALL require them to sign in first.

IF a guest attempts to edit an article they do not own, THE system SHALL require them to sign in first.

A member who is logged in can view their own profile.

A member who is logged in can view other users' profiles.

The system SHALL enforce access control based on user authentication status.

## Session and Token Policy

Define session duration, token refresh, and expiration policies.

### Session Duration and Validity

WHEN a user successfully logs in, THE system SHALL create a session that remains valid for 24 hours.

WHILE a session is valid, THE system SHALL allow the user to access protected resources without re-authentication.

WHEN a session expires, THE system SHALL automatically log the user out and require re-authentication.

WHEN a user requests to log out, THE system SHALL immediately invalidate the session and prevent further access.

IF a session has expired, THE system SHALL redirect the user to the login page.

THE system SHALL support multiple concurrent sessions from different devices for the same user account.

### Token Structure and JWT

THE system SHALL use JSON Web Tokens (JWT) for session token generation.

THE system SHALL include user identification and role information in the JWT payload.

THE system SHALL sign all JWTs using a secure algorithm to prevent tampering.

WHEN a user authenticates, THE system SHALL return both an access token and a refresh token.

THE system SHALL encode the user's display name and user ID in the JWT.

THE system SHALL include a unique session identifier in each JWT to support session management.

### Token Expiration Policy

THE access token SHALL expire after 15 minutes of inactivity.

THE refresh token SHALL expire after 7 days from issuance.

WHEN an access token expires, THE system SHALL require token refresh before allowing further actions.

IF a refresh token expires, THE system SHALL require the user to re-authenticate with credentials.

THE system SHALL NOT extend the expiration time of tokens once they have expired.

THE system SHALL include the exact expiration time in each token.

### Token Refresh Mechanism

WHEN an access token expires, THE system SHALL allow the user to obtain a new access token using the refresh token.

WHEN the system receives a valid refresh token, THE system SHALL issue a new access token without requiring re-authentication.

WHEN a refresh token is used, THE system SHALL issue a new refresh token with extended expiration.

IF the refresh token has been revoked, THE system SHALL reject the refresh request.

IF the refresh token is invalid or expired, THE system SHALL log out the user and require re-authentication.

WHEN token refresh succeeds, THE system SHALL update the user's session timestamp.

### Session Security and Revocation

WHEN a user's password is changed, THE system SHALL invalidate all existing sessions for that user.

WHEN a user's account is deleted, THE system SHALL immediately revoke all sessions for that user.

WHEN a user is banned, THE system SHALL revoke all active sessions for that user.

WHEN a refresh token is used, THE system SHALL invalidate the previous refresh token to prevent replay attacks.

WHEN suspicious activity is detected, THE system SHALL revoke all sessions associated with the user account.

THE system SHALL provide administrators with the ability to view active sessions for any user account.

# Account Lifecycle

Account state transitions and lifecycle management.

## Account States and Transitions

Define account states (active, suspended, deleted) and valid transitions.

### Account States

THE system SHALL maintain three account states: active, banned, and deleted.

AN active account CAN log in, create articles, write comments, and access all platform features.

A banned account CANNOT log in to the platform. The account remains in a suspended state where all existing articles and comments stay visible but the user loses all interactive capabilities.

A deleted account is permanently removed from the system. All user articles and comments associated with the deleted account are also removed from the platform.

ONLY super administrators CAN change an account to banned or deleted state.

### Account Creation and Activation

WHEN a new user registers with email and password, THE system SHALL create an active account state.

THE system SHALL validate the email format and ensure the email is not already registered before creating the account.

IF the registration request has an invalid email or the email already exists, THE system SHALL reject the registration and display an appropriate error message.

WHEN a user completes registration, THE system SHALL create a profile with default display name and empty bio text.

THE newly created account SHALL be in active state and immediately accessible for login.

### Account Suspension (Banning)

WHEN an administrator bans a user, THE system SHALL change the account state from active to banned.

THE system SHALL record a ban reason provided by the administrator when banning a user.

BANNED users CANNOT log in to the platform regardless of valid credentials.

WHEN a banned user attempts to log in, THE system SHALL reject the login attempt and indicate the account is suspended.

THE system SHALL maintain all articles and comments written by the banned user, keeping them visible on the platform.

ONLY administrators CAN ban or unban user accounts.

### Account Deletion

WHEN a user requests account deletion, THE system SHALL change the account state from active to deleted.

IF the requesting user is the account owner, THE system SHALL proceed with deletion after confirmation.

IF the requesting user is a super administrator, THE system SHALL proceed with deletion after confirming the deletion reason.

UPON account deletion, THE system SHALL permanently delete all articles and comments associated with that account.

IF the account is already in deleted state, THE system SHALL reject the deletion request with an appropriate error.

A deleted account CANNOT be recovered or reactivated.

### State Transition Rules

AN active account CAN transition to banned state via administrator action.

AN active account CAN transition to deleted state via user request or super administrator action.

A banned account CAN transition to active state via administrator unbanning action.

A deleted account CANNOT transition back to any other state (permanent deletion).

IF an attempt is made to transition to an invalid state, THE system SHALL reject the operation.

THE system SHALL log all state transitions with timestamp, initiating user/administrator, and reason (when applicable).

### Administrator Request Lifecycle

WHEN a user submits a request to become an administrator, THE system SHALL create a pending administrator request record.

THE pending request SHALL include a reason text provided by the requesting user.

SUPER administrators CAN view the list of all pending administrator requests.

WHEN a super administrator approves an administrator request, THE system SHALL change the user's administrator status to regular administrator.

WHEN a super administrator rejects an administrator request, THE system SHALL mark the request as rejected and retain the rejection record.

ONLY super administrators CAN approve or reject administrator requests.

### Administrator Grade Transitions

WHEN a regular administrator is promoted, THE system SHALL change their grade from regular to super administrator.

ONLY super administrators CAN promote regular administrators to super administrator grade.

WHEN a super administrator is demoted, THE system SHALL change their grade from super to regular administrator.

SUPER administrators CANNOT demote themselves to regular administrator grade.

SUPER administrators CAN demote other super administrators to regular administrator grade.

A regular administrator CANNOT promote themselves to super administrator grade.