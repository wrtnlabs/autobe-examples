**discussionBoard — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their roles and what they can do.

## guest Actor

Guests are unauthenticated visitors who can browse the platform without creating an account. They view all sections and their descriptions to understand available discussion topics. Guests browse article lists within sections, seeing titles, authors, tags, comment counts, and posting times. They access individual articles to read full content and download attached files and images. Guests search articles by title or content and filter results by tags. They view other users' profiles including display names, bios, and lists of articles and comments. Guests cannot create articles, write comments, or interact with any content. They cannot access account features or submit administrator requests. Registration is required to transition from guest to member status and gain participation capabilities.

### Public Browsing and Content Discovery

WHEN a guest accesses the platform, THE system SHALL allow unauthenticated browsing of all public content.

WHILE in guest status, THE system SHALL enable anonymous viewing of sections, articles, and user profiles without requiring authentication.

THE system SHALL allow guests to explore the platform freely for content discovery purposes.

WHEN a guest views any content, THE system SHALL not require login or account creation.

THE system SHALL treat all guest access as read-only with no write capabilities.

### Section and Article Access

WHEN a guest views sections, THE system SHALL display all section names and descriptions.

WHEN a guest browses a section, THE system SHALL show the article list with titles, authors, tags, comment counts, and posting times.

WHEN a guest selects an article, THE system SHALL display the full article content including title, author, content, attachments, tags, and posting time.

WHEN a guest views article attachments, THE system SHALL allow downloading of attached files and images.

THE system SHALL not display full article content in the article list view, only titles.

### Search and Filter Capabilities

WHEN a guest searches articles, THE system SHALL allow searching by title or content.

WHEN a guest performs a search, THE system SHALL display paginated search results.

WHEN a guest filters articles, THE system SHALL allow filtering by tags.

THE system SHALL apply the same search and filter capabilities to guests as authenticated members.

### Profile Viewing

WHEN a guest views a user profile, THE system SHALL display the user's display name and bio.

WHEN a guest views a user profile, THE system SHALL show a list of all articles written by that user.

WHEN a guest views a user profile, THE system SHALL show a list of all comments written by that user.

THE system SHALL allow guests to view any public user profile without authentication.

### Access Restrictions

WHILE in guest status, THE system SHALL enforce read-only permissions across all platform features.

IF a guest attempts to create an article, THEN THE system SHALL reject the request.

IF a guest attempts to write a comment, THEN THE system SHALL reject the request.

IF a guest attempts to edit any content, THEN THE system SHALL reject the request.

IF a guest attempts to delete any content, THEN THE system SHALL reject the request.

IF a guest attempts to access account features, THEN THE system SHALL reject the request.

IF a guest attempts to submit an administrator request, THEN THE system SHALL reject the request.

THE system SHALL require registration to transition from guest to member status and gain posting capabilities.

## member Actor

Members are registered users who authenticate with email and password to access full platform features. They create articles with titles, content, section assignments, attachments, images, and tags. Members edit and delete their own articles, updating content, attachments, and tags as needed. They write single-level comments on any article and edit or delete their own comments. Members manage their profiles by updating display names and bio text. They view their complete article and comment history on their profile page. Members submit administrator requests with written reasons explaining their interest in moderation roles. They change passwords to maintain account security and delete their accounts when desired. Account deletion removes all articles and comments authored by the member. Members retain all guest browsing capabilities while gaining full discussion participation rights.

### Article Creation and Attachments

WHEN a member creates an article, THE system SHALL:
1. Require a title
2. Require content text
3. Require selection of one section from available sections
4. Allow attachment of files
5. Allow attachment of images
6. Allow multiple attachments per article
7. Allow addition of free text tags
8. Allow multiple tags per article
9. Associate the article with the creating member
10. Record the creation timestamp

IF the title is missing, THE system SHALL reject the article creation.
IF the content is missing, THE system SHALL reject the article creation.
IF no section is selected, THE system SHALL reject the article creation.
IF the selected section does not exist, THE system SHALL reject the article creation.

THE system SHALL allow members to attach files of any supported file type to articles.
THE system SHALL allow members to attach images in common image formats to articles.
THE system SHALL allow members to attach multiple files and images to a single article.

WHEN tags are added to an article, THE system SHALL:
1. Store each tag as free text
2. Allow duplicate tags across different articles
3. Display all tags on the article view

### Article Editing and Ownership

WHILE a member owns an article, THE system SHALL allow the member to:
1. Edit the article title
2. Edit the article content
3. Add or remove attachments
4. Add or remove tags
5. Delete the article entirely

THE system SHALL restrict article editing to the article's author only.
THE system SHALL restrict article deletion to the article's author only.

IF a member attempts to edit another member's article, THE system SHALL reject the request.
IF a member attempts to delete another member's article, THE system SHALL reject the request.
IF the article does not exist, THE system SHALL reject the edit or delete request.

WHEN a member edits an article, THE system SHALL:
1. Preserve the original creation timestamp
2. Update the article with the new content
3. Maintain all existing comments on the article

WHEN a member deletes an article, THE system SHALL:
1. Remove the article from the section
2. Remove all comments associated with the article
3. Remove all attachments associated with the article

THE system SHALL maintain content ownership by associating each article with its creating member throughout the article's lifecycle.

### Comment Posting and Discussion

WHEN a member posts a comment on an article, THE system SHALL:
1. Require comment content text
2. Associate the comment with the article
3. Associate the comment with the commenting member
4. Record the creation timestamp
5. Display the comment in oldest-first order among all comments on the article

IF the comment content is missing, THE system SHALL reject the comment creation.
IF the article does not exist, THE system SHALL reject the comment creation.
IF the article has been deleted, THE system SHALL reject the comment creation.

THE system SHALL support single-level comments only (no nested replies).

WHILE a member owns a comment, THE system SHALL allow the member to:
1. Edit the comment content
2. Delete the comment

THE system SHALL restrict comment editing to the comment's author only.
THE system SHALL restrict comment deletion to the comment's author only.

IF a member attempts to edit another member's comment, THE system SHALL reject the request.
IF a member attempts to delete another member's comment, THE system SHALL reject the request.

THE system SHALL display each comment with:
1. The comment author's display name
2. The comment content
3. The comment creation timestamp

Members SHALL have full discussion participation rights on all articles within accessible sections.

### Profile Management

WHEN a member views their own profile, THE system SHALL display:
1. The member's display name
2. The member's bio text
3. A list of all articles written by the member
4. A list of all comments written by the member

WHEN a member views another member's profile, THE system SHALL display:
1. The other member's display name
2. The other member's bio text
3. A list of all articles written by the other member
4. A list of all comments written by the other member

WHEN a member edits their profile, THE system SHALL allow the member to:
1. Update their display name
2. Update their bio text

THE system SHALL require a display name for all member profiles.
THE system SHALL allow bio text to be optional (may be empty).

IF a member attempts to view a profile that does not exist, THE system SHALL reject the request.
IF a member's account has been deleted, THE system SHALL not display the profile.

THE system SHALL update the member's profile immediately upon successful edit.
THE system SHALL reflect profile changes on all articles and comments authored by the member.

### Password Changes and Admin Requests

WHEN a member changes their password, THE system SHALL:
1. Require the current password for verification
2. Require a new password
3. Require confirmation of the new password
4. Update the member's password upon successful verification

IF the current password is incorrect, THE system SHALL reject the password change.
IF the new password does not match the confirmation, THE system SHALL reject the password change.
IF the new password is identical to the current password, THE system SHALL reject the password change.

WHEN a member submits an administrator request, THE system SHALL:
1. Require a reason text explaining the member's interest in becoming an administrator
2. Associate the request with the requesting member
3. Record the submission timestamp
4. Set the initial request status to pending

IF the reason text is missing, THE system SHALL reject the administrator request.
IF the member already has a pending administrator request, THE system SHALL reject the new request.
IF the member is already an administrator, THE system SHALL reject the administrator request.

THE system SHALL allow members to view the status of their submitted administrator requests.

Members SHALL authenticate using email and password for all authenticated operations.
THE system SHALL maintain member session state for all authenticated user capabilities including article creation, comment posting, profile management, and personal settings.

## admin Actor

Administrators exist in two grades: regular administrator and super administrator, each with distinct governance capabilities. Regular administrators perform all member actions plus moderate platform content and manage users. They create, edit, and delete sections to organize discussion topics. Administrators delete any article or comment regardless of authorship to enforce community standards. They ban users to restrict platform access and record ban reasons for each action. Administrators unban users to restore access and view the list of banned users with their ban reasons. Super administrators approve or reject pending administrator requests submitted by members. They promote regular administrators to super administrator grade and demote other super administrators to regular grade. Super administrators cannot demote themselves to prevent losing all elevated privileges. Both admin grades retain full member capabilities while exercising platform governance authority.

### Section Management

WHEN a regular administrator creates a section, THE system SHALL:
1. Require a section name
2. Require a section description
3. Associate the section with the creating administrator
4. Make the section immediately available for article posting

WHEN a regular administrator edits a section, THE system SHALL:
1. Allow modification of the section name
2. Allow modification of the section description
3. Preserve all existing articles within the section
4. Update the section information immediately

WHEN a regular administrator deletes a section, THE system SHALL:
1. Remove the section from the list of available sections
2. Delete all articles contained within the section
3. Delete all comments associated with those articles
4. Prevent recovery of the deleted section and its content

IF the section name is missing during creation, THE system SHALL reject the request.
IF the section description is missing during creation, THE system SHALL reject the request.

THE system SHALL allow administrators to view the list of all sections with their names and descriptions.

### Content Moderation

WHEN an administrator deletes an article, THE system SHALL:
1. Remove the article from the section article list
2. Remove the article from the author's profile article list
3. Delete all comments associated with the article
4. Delete all attachments associated with the article
5. Prevent recovery of the deleted article and its content

WHEN an administrator deletes a comment, THE system SHALL:
1. Remove the comment from the article's comment list
2. Remove the comment from the author's profile comment list
3. Prevent recovery of the deleted comment

THE system SHALL allow administrators to delete any article regardless of authorship.
THE system SHALL allow administrators to delete any comment regardless of authorship.

IF the article does not exist, THE system SHALL reject the deletion request.
IF the comment does not exist, THE system SHALL reject the deletion request.

Administrators retain all member capabilities while exercising content moderation authority to enforce community standards.

### User Banning and Ban Management

WHEN an administrator bans a user, THE system SHALL:
1. Record the ban reason provided by the administrator
2. Record the ban time as the current timestamp
3. Prevent the banned user from logging in to the platform
4. Keep the banned user's existing articles visible on the platform
5. Keep the banned user's existing comments visible on the platform
6. Change the user's account status to banned

WHEN an administrator unbans a user, THE system SHALL:
1. Restore the user's ability to log in to the platform
2. Change the user's account status from banned to active
3. Preserve all existing articles and comments by the user
4. Remove the active ban restriction from the user account

WHEN an administrator views the list of banned users, THE system SHALL:
1. Display all users with banned account status
2. Show the ban reason for each banned user
3. Show the ban time for each banned user
4. Show the display name of each banned user

IF the user to be banned does not exist, THE system SHALL reject the ban request.
IF the user is already banned, THE system SHALL reject the ban request.
IF the user to be unbanned is not currently banned, THE system SHALL reject the unban request.

THE system SHALL require a ban reason when banning a user.
Administrators can view the ban reason for each banned user to understand the basis for the ban.

### Admin Request Review

WHEN a member submits an administrator request, THE system SHALL:
1. Require a reason text explaining why the user wants to become an administrator
2. Record the request with pending status
3. Associate the request with the submitting user
4. Make the request visible to super administrators for review

WHEN a super administrator approves an administrator request, THE system SHALL:
1. Change the request status from pending to approved
2. Grant the user regular administrator grade
3. Enable all regular administrator capabilities for the user
4. Notify the user of the approval decision

WHEN a super administrator rejects an administrator request, THE system SHALL:
1. Change the request status from pending to rejected
2. Maintain the user's current member grade
3. Notify the user of the rejection decision
4. Prevent the user from submitting another request immediately

WHEN a super administrator views pending administrator requests, THE system SHALL:
1. Display all requests with pending status
2. Show the reason text for each request
3. Show the display name of the requesting user
4. Show the submission time for each request

IF the request does not exist, THE system SHALL reject the approval or rejection action.
IF the request is not in pending status, THE system SHALL reject the approval or rejection action.
IF the reason text is missing during request submission, THE system SHALL reject the request.

Any user can submit a request to become an administrator with a reason explaining their interest in platform governance.

### Admin Grade Management

WHEN a super administrator promotes a regular administrator to super administrator, THE system SHALL:
1. Change the user's administrator grade from regular to super
2. Enable all super administrator capabilities for the user
3. Allow the user to approve or reject administrator requests
4. Allow the user to promote or demote other administrators
5. Maintain all existing regular administrator capabilities

WHEN a super administrator demotes another super administrator to regular administrator, THE system SHALL:
1. Change the user's administrator grade from super to regular
2. Remove super administrator capabilities from the user
3. Retain regular administrator capabilities for the user
4. Prevent the demoted user from promoting or demoting other administrators

IF a super administrator attempts to demote themselves, THE system SHALL reject the request.
IF the administrator to be promoted is not a regular administrator, THE system SHALL reject the promotion request.
IF the administrator to be demoted is not a super administrator, THE system SHALL reject the demotion request.
IF the administrator to be demoted is the same as the acting administrator, THE system SHALL reject the demotion request.

There are two administrator grades: regular administrator and super administrator.
Regular administrators perform content moderation and user management.
Super administrators perform all regular administrator actions plus administrator grade management and admin request approval.
Super administrators cannot demote themselves to prevent losing all elevated privileges on the platform.

# Authentication Flows

Registration, login, session management, and token policies.

## Registration and Login

Define user registration and login flows including validation and error handling.

### User Registration

WHEN a user registers for an account, THE system SHALL:
1. Require a valid email address
2. Require a password
3. Create the account with member role by default
4. Send a confirmation to the user upon successful registration

IF the email address is already registered, THE system SHALL reject the registration request.

IF the email address format is invalid, THE system SHALL reject the registration request.

IF the password does not meet security requirements, THE system SHALL reject the registration request.

WHEN registration is successful, THE system SHALL create a user profile with default display name based on the email address.

WHEN registration is successful, THE system SHALL automatically log the user in and create an active session.

### User Login

WHEN a user attempts to log in, THE system SHALL:
1. Require the registered email address
2. Require the account password
3. Verify the credentials against stored authentication data
4. Create an authenticated session upon successful verification

IF the email address does not exist in the system, THE system SHALL reject the login request.

IF the password does not match the stored credentials, THE system SHALL reject the login request.

IF the user account is banned, THE system SHALL reject the login request.

WHEN login is successful, THE system SHALL redirect the user to the main discussion board.

WHEN login fails, THE system SHALL display a generic error message without revealing whether the email or password was incorrect.

### Password Management

WHEN a logged-in user requests to change their password, THE system SHALL:
1. Require the current password for verification
2. Require a new password
3. Require confirmation of the new password
4. Update the password only if all validations pass

IF the current password is incorrect, THE system SHALL reject the password change request.

IF the new password does not match the confirmation, THE system SHALL reject the password change request.

IF the new password does not meet security requirements, THE system SHALL reject the password change request.

WHEN the password is successfully changed, THE system SHALL maintain the user's active session.

WHEN the password is successfully changed, THE system SHALL notify the user of the successful update.

## Session and Token Policy

Define session duration, token refresh, and expiration policies.

### Session Duration and Management

WHEN a user successfully logs in, THE system SHALL create a session for that user.

WHILE a session is active, THE system SHALL allow the user to access authenticated features.

THE system SHALL terminate a session when the user explicitly logs out.

THE system SHALL terminate a session when the user's account is deleted.

THE system SHALL terminate a session when the user is banned by an administrator.

IF a session expires due to inactivity, THE system SHALL require the user to log in again to continue.

THE system SHALL maintain only one active session per user account at any time.

WHEN a user logs in from a new device, THE system SHALL terminate any existing session for that user.

### Token Lifecycle

WHEN a user authenticates successfully, THE system SHALL issue a jwt token to the user.

THE system SHALL set an expiration time on every jwt token issued.

WHEN a jwt token expires, THE system SHALL reject any requests using that token.

THE system SHALL allow users to refresh their jwt token before it expires.

WHEN a user requests a token refresh, THE system SHALL validate the current session is still active.

IF the session is invalid during a refresh request, THE system SHALL reject the refresh and require re-authentication.

WHEN a jwt token is refreshed, THE system SHALL issue a new jwt token with a new expiration time.

THE system SHALL invalidate all existing tokens when a user changes their password.

THE system SHALL invalidate all existing tokens when a user's account is deleted.

### Security Policies

THE system SHALL require all authenticated requests to include a valid jwt token.

IF a request is made without a token, THE system SHALL reject the request.

IF a request is made with an expired token, THE system SHALL reject the request.

IF a request is made with an invalid token, THE system SHALL reject the request.

THE system SHALL not store tokens in URLs or logs.

WHEN a user logs out, THE system SHALL invalidate the current token immediately.

THE system SHALL reject requests from banned users even if they present a valid token.

WHEN an administrator bans a user, THE system SHALL terminate all active sessions for that user immediately.

# Account Lifecycle

Account state transitions and lifecycle management.

## Account States and Transitions

Define account states (active, suspended, deleted) and valid transitions.

### Account States

THE system SHALL maintain three account states: active, suspended, and deleted.

WHILE an account is in active state, THE system SHALL allow the user to log in and access all features permitted by their role.

WHILE an account is in suspended state, THE system SHALL prevent the user from logging in to the platform.

WHILE an account is in suspended state, THE system SHALL keep the user's existing articles and comments visible to other users.

WHILE an account is in deleted state, THE system SHALL remove all user data including articles and comments from the platform.

THE system SHALL record the current state of each user account at all times.

### Account Suspension

WHEN an administrator bans a user, THE system SHALL transition the user's account from active to suspended state.

WHEN an account is suspended, THE system SHALL record the ban reason provided by the administrator.

WHEN an account is suspended, THE system SHALL record the ban time.

THE system SHALL allow administrators to view the ban reason for each suspended user.

THE system SHALL allow administrators to view the list of banned users.

WHEN an administrator unbans a user, THE system SHALL transition the user's account from suspended to active state.

IF a user attempts to log in while their account is suspended, THE system SHALL reject the login attempt.

### Account Deletion

WHEN a user requests account deletion, THE system SHALL transition the user's account from active to deleted state.

WHEN an account is deleted, THE system SHALL delete all articles written by the user.

WHEN an account is deleted, THE system SHALL delete all comments written by the user.

WHEN an account is deleted, THE system SHALL remove the user's profile information including display name and bio.

THE system SHALL not allow account deletion to be reversed.

IF a user attempts to log in after their account is deleted, THE system SHALL reject the login attempt.

WHEN an administrator deletes a user account, THE system SHALL transition the account from active or suspended to deleted state.

### State Transitions

THE system SHALL allow the following valid account state transitions:
- active to suspended (when administrator bans the user)
- active to deleted (when user or administrator deletes the account)
- suspended to active (when administrator unbans the user)
- suspended to deleted (when administrator deletes a banned user's account)

THE system SHALL not allow transitions from deleted state to any other state.

THE system SHALL not allow transitions from suspended to suspended.

THE system SHALL not allow transitions from active to active.

WHEN a state transition occurs, THE system SHALL record the transition time.

WHEN a state transition occurs, THE system SHALL record the administrator who initiated the transition (if applicable).