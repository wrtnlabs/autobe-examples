**discussionBoard — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their roles and what they can do.

## guest Actor

Guests are visitors who have not registered or logged into the discussion board. They can browse the list of all available sections on the platform. Guests can view article lists within any section, seeing titles, authors, tags, comment counts, and posting times. They can read full article content including all attached files and images. Guests can download attached files and images from articles. They cannot create articles, write comments, or interact with content in any way. Guests cannot search or filter articles across the platform. They cannot view other users' profiles or access any personalized features. To participate in discussions, guests must register for an account. All guest access is read-only with no content modification capabilities.

### Guest Browsing and Viewing Capabilities

THE discussionBoard SHALL allow guests to view the list of all available sections on the platform.

WHEN a guest accesses the platform, THE discussionBoard SHALL display all public sections with their names and descriptions.

THE discussionBoard SHALL allow guests to browse articles within any section without authentication.

WHEN a guest views an article list in a section, THE discussionBoard SHALL display: article title, author name, tags, comment count, and posting time.

THE discussionBoard SHALL allow guests to view the full content of any article.

WHEN a guest views an article, THE discussionBoard SHALL display: article title, author name, full content, attachments, tags, and posting time.

THE discussionBoard SHALL present all content to guests in read-only mode with no editing capabilities.

WHEN a guest attempts to modify any content, THE discussionBoard SHALL deny the request and require authentication.

### File Download Access

THE discussionBoard SHALL allow guests to download attached files from any article.

THE discussionBoard SHALL allow guests to download attached images from any article.

WHEN a guest requests to download an attachment, THE discussionBoard SHALL provide the file without authentication.

THE discussionBoard SHALL allow guests to view all attachments associated with an article.

WHEN a guest views an article with attachments, THE discussionBoard SHALL display all attached files and images with download options.

### Guest Limitations and Restrictions

THE discussionBoard SHALL NOT allow guests to create articles in any section.

THE discussionBoard SHALL NOT allow guests to write comments on any article.

THE discussionBoard SHALL NOT allow guests to search articles by title or content.

THE discussionBoard SHALL NOT allow guests to filter articles by tags.

THE discussionBoard SHALL NOT allow guests to view other users' profiles.

THE discussionBoard SHALL NOT allow guests to edit any content created by other users.

THE discussionBoard SHALL NOT allow guests to delete any content on the platform.

THE discussionBoard SHALL NOT allow guests to attach files or images to articles.

THE discussionBoard SHALL NOT allow guests to add tags to articles.

THE discussionBoard SHALL NOT allow guests to sort articles by any criteria.

WHEN a guest attempts any content creation action, THE discussionBoard SHALL deny the request.

WHEN a guest attempts any content modification action, THE discussionBoard SHALL deny the request.

WHEN a guest attempts to access personalized features, THE discussionBoard SHALL deny the request.

### Registration Requirement for Participation

WHEN a guest attempts to create an article, THE discussionBoard SHALL require the guest to register for an account.

WHEN a guest attempts to write a comment, THE discussionBoard SHALL require the guest to register for an account.

WHEN a guest attempts to search articles, THE discussionBoard SHALL require the guest to register for an account.

WHEN a guest attempts to view another user's profile, THE discussionBoard SHALL require the guest to register for an account.

WHEN a guest attempts to attach files to an article, THE discussionBoard SHALL require the guest to register for an account.

THE discussionBoard SHALL provide a registration option when guests attempt restricted actions.

THE discussionBoard SHALL inform guests that registration is required to participate in discussions.

WHEN a guest is denied access to a feature, THE discussionBoard SHALL display a message indicating that registration is required.

## member Actor

Members are registered users who have authenticated with email and password. They can create new articles in any section of the discussion board. Members can write comments on any article published on the platform. They can edit their own articles including title, content, attachments, and tags. Members can delete their own articles and comments at any time. They can attach multiple files and images to their articles. Members can add free-text tags to categorize their articles. They can view other users' profiles including display names, bios, and content lists. Members can search articles by title or content across all sections. They can filter search results by tags to find relevant discussions. Members can sort article lists by newest or oldest first. They can submit requests to become administrators with a reason statement. Members can update their display name and bio information. If banned, members cannot log in but their existing content remains visible.

### Article Creation

WHEN a member creates an article, THE system SHALL require a title.

WHEN a member creates an article, THE system SHALL require content text.

WHEN a member creates an article, THE system SHALL require the member to select one section.

WHEN a member creates an article, THE system SHALL associate the article with the creating member.

WHEN a member creates an article, THE system SHALL record the creation timestamp.

IF the title is missing, THEN THE system SHALL reject the article creation request.

IF the content is missing, THEN THE system SHALL reject the article creation request.

IF no section is selected, THEN THE system SHALL reject the article creation request.

IF the selected section does not exist, THEN THE system SHALL reject the article creation request.

### Comment Writing

WHEN a member writes a comment on an article, THE system SHALL require comment content.

WHEN a member writes a comment, THE system SHALL associate the comment with the article.

WHEN a member writes a comment, THE system SHALL associate the comment with the member.

WHEN a member writes a comment, THE system SHALL record the creation timestamp.

IF the comment content is missing, THEN THE system SHALL reject the comment submission.

IF the article does not exist, THEN THE system SHALL reject the comment submission.

IF the member is banned, THEN THE system SHALL reject the comment submission.

### Own Content Editing

WHEN a member edits their own article, THE system SHALL allow modification of the title.

WHEN a member edits their own article, THE system SHALL allow modification of the content.

WHEN a member edits their own article, THE system SHALL allow modification of attached files.

WHEN a member edits their own article, THE system SHALL allow modification of attached images.

WHEN a member edits their own article, THE system SHALL allow modification of tags.

WHEN a member edits their own article, THE system SHALL update the last modified timestamp.

WHEN a member edits their own comment, THE system SHALL allow modification of the comment content.

WHEN a member edits their own comment, THE system SHALL update the last modified timestamp.

IF the member attempts to edit another member's article, THEN THE system SHALL reject the request.

IF the member attempts to edit another member's comment, THEN THE system SHALL reject the request.

IF the article does not exist, THEN THE system SHALL reject the edit request.

IF the comment does not exist, THEN THE system SHALL reject the edit request.

### Own Content Deletion

WHEN a member deletes their own article, THE system SHALL remove the article permanently.

WHEN a member deletes their own article, THE system SHALL also delete all associated comments.

WHEN a member deletes their own article, THE system SHALL also delete all attached files and images.

WHEN a member deletes their own comment, THE system SHALL remove the comment permanently.

IF the member attempts to delete another member's article, THEN THE system SHALL reject the request.

IF the member attempts to delete another member's comment, THEN THE system SHALL reject the request.

IF the article does not exist, THEN THE system SHALL reject the deletion request.

IF the comment does not exist, THEN THE system SHALL reject the deletion request.

### File and Image Attachments

WHEN a member attaches a file to an article, THE system SHALL allow attachment only to articles owned by the member.

WHEN a member attaches a file to an article, THE system SHALL record the file name.

WHEN a member attaches a file to an article, THE system SHALL record the file type.

WHEN a member attaches a file to an article, THE system SHALL record the file size.

WHEN a member attaches a file to an article, THE system SHALL record the upload timestamp.

WHEN a member attaches an image to an article, THE system SHALL allow attachment only to articles owned by the member.

WHEN a member attaches an image to an article, THE system SHALL record the image name.

WHEN a member attaches an image to an article, THE system SHALL record the image type.

WHEN a member attaches an image to an article, THE system SHALL record the image size.

WHEN a member attaches an image to an article, THE system SHALL record the upload timestamp.

THE system SHALL allow multiple files to be attached to a single article.

THE system SHALL allow multiple images to be attached to a single article.

IF the member is not the article owner, THEN THE system SHALL reject the attachment request.

### Tag Management

WHEN a member adds tags to an article, THE system SHALL allow only articles owned by the member.

WHEN a member adds tags to an article, THE system SHALL allow multiple tags per article.

WHEN a member adds tags to an article, THE system SHALL accept free text tag values.

WHEN a member modifies tags on an article, THE system SHALL allow addition of new tags.

WHEN a member modifies tags on an article, THE system SHALL allow removal of existing tags.

IF the member is not the article owner, THEN THE system SHALL reject the tag modification request.

IF the article does not exist, THEN THE system SHALL reject the tag modification request.

### Profile Viewing

WHEN a member views another member's profile, THE system SHALL display the display name.

WHEN a member views another member's profile, THE system SHALL display the bio text.

WHEN a member views another member's profile, THE system SHALL display a list of all articles written by that member.

WHEN a member views another member's profile, THE system SHALL display a list of all comments written by that member.

IF the profiled member does not exist, THEN THE system SHALL reject the profile view request.

IF the profiled member is banned, THEN THE system SHALL still display their profile and content.

### Article Search and Tag Filtering

WHEN a member searches for articles, THE system SHALL search by article title.

WHEN a member searches for articles, THE system SHALL search by article content.

WHEN a member searches for articles, THE system SHALL return paginated results.

WHEN a member filters search results by tags, THE system SHALL return only articles matching the specified tags.

IF no articles match the search criteria, THEN THE system SHALL return an empty result set.

IF no articles match the tag filter, THEN THE system SHALL return an empty result set.

### List Sorting

WHEN a member views an article list, THE system SHALL allow sorting by newest first.

WHEN a member views an article list, THE system SHALL allow sorting by oldest first.

WHEN a member views an article list in a section, THE system SHALL paginate the results.

WHEN a member views search results, THE system SHALL paginate the results.

IF no articles exist in the list, THEN THE system SHALL display an empty list.

### Admin Request Submission

WHEN a member submits a request to become an administrator, THE system SHALL require a reason statement.

WHEN a member submits an administrator request, THE system SHALL record the submission timestamp.

WHEN a member submits an administrator request, THE system SHALL set the request status to pending.

WHEN a member submits an administrator request, THE system SHALL associate the request with the member.

IF the reason is missing, THEN THE system SHALL reject the administrator request.

IF the member is already an administrator, THEN THE system SHALL reject the administrator request.

IF the member is banned, THEN THE system SHALL reject the administrator request.

### Profile Editing

WHEN a member edits their profile, THE system SHALL allow modification of the display name.

WHEN a member edits their profile, THE system SHALL allow modification of the bio text.

WHEN a member edits their profile, THE system SHALL update the profile with the new information.

IF the member is banned, THEN THE system SHALL reject the profile edit request.

### Banned Member Restrictions

WHEN a member is banned, THE system SHALL prevent the member from logging in.

WHEN a member is banned, THE system SHALL prevent the member from creating new articles.

WHEN a member is banned, THE system SHALL prevent the member from writing new comments.

WHEN a member is banned, THE system SHALL prevent the member from editing existing articles.

WHEN a member is banned, THE system SHALL prevent the member from editing existing comments.

WHEN a member is banned, THE system SHALL prevent the member from deleting their articles.

WHEN a member is banned, THE system SHALL prevent the member from deleting their comments.

WHEN a member is banned, THE system SHALL prevent the member from attaching files or images.

WHEN a member is banned, THE system SHALL prevent the member from modifying tags.

WHEN a member is banned, THE system SHALL prevent the member from editing their profile.

WHEN a member is banned, THE system SHALL prevent the member from submitting administrator requests.

WHEN a member is banned, THE system SHALL keep existing articles visible to other users.

WHEN a member is banned, THE system SHALL keep existing comments visible to other users.

WHEN a member is banned, THE system SHALL still allow the member to view other users' profiles.

## administrator Actor

Administrators are trusted users with elevated platform management privileges. There are two grades: regular administrators and super administrators. All administrators can perform every action available to regular members. They can create new sections with names and descriptions for organizing discussions. Administrators can edit existing section names and descriptions. They can delete sections and all content within them. Administrators can delete any article regardless of author. They can delete any comment regardless of author. They can ban users who violate platform rules with recorded reasons. Administrators can unban previously banned users to restore access. They can view the complete list of banned users and their ban reasons. Super administrators can view pending administrator requests from members. They can approve or reject these requests to grant or deny admin status. Super administrators can promote regular administrators to super administrator grade. They can demote other super administrators to regular administrator grade. Super administrators cannot demote themselves to protect platform governance.

### Administrator Grades and Roles

THE system SHALL recognize two administrator grades: regular administrator and super administrator.

THE system SHALL grant all regular members' capabilities to any administrator.

THE system SHALL allow regular administrators to create new sections with names and descriptions.

THE system SHALL allow regular administrators to edit existing section names and descriptions.

THE system SHALL allow regular administrators to delete sections and all content within them.

THE system SHALL allow regular administrators to delete any article regardless of author.

THE system SHALL allow regular administrators to delete any comment regardless of author.

THE system SHALL allow regular administrators to ban users with recorded reasons.

THE system SHALL allow regular administrators to unban previously banned users.

THE system SHALL allow regular administrators to view the complete list of banned users and their ban reasons.

THE system SHALL restrict section creation, editing, and deletion to administrators only.

THE system SHALL restrict article deletion authority to administrators only.

THE system SHALL restrict comment deletion authority to administrators only.

THE system SHALL restrict user banning and unbanning to administrators only.

THE system SHALL restrict viewing of the banned users list to administrators only.

IF a regular administrator attempts to approve an administrator request, THE system SHALL reject the action.

IF a regular administrator attempts to promote another administrator, THE system SHALL reject the action.

IF a regular administrator attempts to demote another administrator, THE system SHALL reject the action.

### Section Management

WHEN an administrator creates a section, THE system SHALL require a section name.

WHEN an administrator creates a section, THE system SHALL allow an optional description.

WHEN an administrator edits a section, THE system SHALL allow modification of the name.

WHEN an administrator edits a section, THE system SHALL allow modification of the description.

WHEN an administrator deletes a section, THE system SHALL delete all articles within that section.

WHEN an administrator deletes a section, THE system SHALL delete all comments associated with articles in that section.

IF a section name is missing during creation, THE system SHALL reject the request.

IF a section name is missing during editing, THE system SHALL reject the request.

IF the section does not exist, THE system SHALL reject the edit or delete request.

IF a non-administrator attempts to create a section, THE system SHALL reject the request.

IF a non-administrator attempts to edit a section, THE system SHALL reject the request.

IF a non-administrator attempts to delete a section, THE system SHALL reject the request.

### Content Moderation

WHEN an administrator deletes an article, THE system SHALL delete the article regardless of the author.

WHEN an administrator deletes an article, THE system SHALL delete all comments on that article.

WHEN an administrator deletes an article, THE system SHALL delete all attachments on that article.

WHEN an administrator deletes a comment, THE system SHALL delete the comment regardless of the author.

IF the article does not exist, THE system SHALL reject the deletion request.

IF the comment does not exist, THE system SHALL reject the deletion request.

IF a non-administrator attempts to delete another user's article, THE system SHALL reject the request.

IF a non-administrator attempts to delete another user's comment, THE system SHALL reject the request.

IF a banned user attempts to delete content, THE system SHALL reject the request.

WHEN an administrator deletes content, THE system SHALL record the deletion action for audit purposes.

### User Banning and Management

WHEN an administrator bans a user, THE system SHALL prevent the user from logging in.

WHEN an administrator bans a user, THE system SHALL require a ban reason.

WHEN an administrator bans a user, THE system SHALL record the ban reason.

WHEN an administrator bans a user, THE system SHALL record the ban timestamp.

WHEN an administrator bans a user, THE system SHALL record which administrator performed the ban.

WHEN an administrator unbans a user, THE system SHALL restore the user's login capability.

WHEN an administrator unbans a user, THE system SHALL preserve all existing articles and comments from that user.

THE system SHALL allow administrators to view the list of all banned users.

THE system SHALL display the ban reason for each banned user to administrators.

IF the user does not exist, THE system SHALL reject the ban request.

IF the user is already banned, THE system SHALL reject the ban request.

IF the ban reason is missing, THE system SHALL reject the ban request.

IF the user is not banned, THE system SHALL reject the unban request.

IF a non-administrator attempts to ban a user, THE system SHALL reject the request.

IF a non-administrator attempts to unban a user, THE system SHALL reject the request.

IF a banned user attempts to log in, THE system SHALL reject the login attempt.

### Administrator Request Handling

WHEN a super administrator views administrator requests, THE system SHALL display all pending requests.

WHEN a super administrator views administrator requests, THE system SHALL show the request reason for each pending request.

WHEN a super administrator views administrator requests, THE system SHALL show when each request was submitted.

WHEN a super administrator approves an administrator request, THE system SHALL change the user's role to regular administrator.

WHEN a super administrator approves an administrator request, THE system SHALL mark the request status as approved.

WHEN a super administrator approves an administrator request, THE system SHALL record the approval timestamp.

WHEN a super administrator rejects an administrator request, THE system SHALL maintain the user's current role.

WHEN a super administrator rejects an administrator request, THE system SHALL mark the request status as rejected.

WHEN a super administrator rejects an administrator request, THE system SHALL record the rejection timestamp.

IF the request does not exist, THE system SHALL reject the approval or rejection action.

IF the request is already approved or rejected, THE system SHALL reject the approval or rejection action.

IF a regular administrator attempts to view administrator requests, THE system SHALL reject the access.

IF a regular administrator attempts to approve an administrator request, THE system SHALL reject the action.

IF a regular administrator attempts to reject an administrator request, THE system SHALL reject the action.

IF a non-administrator attempts to view administrator requests, THE system SHALL reject the access.

### Administrator Grade Management

WHEN a super administrator promotes a regular administrator, THE system SHALL change the administrator's grade to super administrator.

WHEN a super administrator demotes a super administrator, THE system SHALL change the administrator's grade to regular administrator.

THE system SHALL prevent a super administrator from demoting themselves.

IF the target user is not an administrator, THE system SHALL reject the promotion request.

IF the target administrator is already a super administrator, THE system SHALL reject the promotion request.

IF the target administrator is already a regular administrator, THE system SHALL reject the demotion request.

IF the target administrator is the same as the acting super administrator, THE system SHALL reject the demotion request.

IF the administrator does not exist, THE system SHALL reject the promotion or demotion request.

IF a regular administrator attempts to promote another administrator, THE system SHALL reject the action.

IF a regular administrator attempts to demote another administrator, THE system SHALL reject the action.

IF a non-administrator attempts to promote an administrator, THE system SHALL reject the action.

IF a non-administrator attempts to demote an administrator, THE system SHALL reject the action.

# Authentication Flows

Registration, login, session management, and token policies.

## Registration and Login

Define user registration and login flows including validation and error handling.

### User Registration

WHEN a guest signs up, THE system SHALL require an email address and password.

WHEN a guest signs up, THE system SHALL validate that the email address is unique.

WHEN a guest signs up, THE system SHALL create a new user account with role 'member'.

IF the email address is already registered, THE system SHALL reject the registration request.

IF the password is missing or empty, THE system SHALL reject the registration request.

WHEN a user successfully registers, THE system SHALL automatically log in the user.

WHEN a user registers, THE system SHALL initialize an empty profile with no display name and no bio.

### User Login

WHEN a user logs in, THE system SHALL require an email address and password.

WHEN a user logs in, THE system SHALL validate the provided credentials against registered accounts.

IF the email address does not exist, THE system SHALL reject the login request.

IF the password is incorrect, THE system SHALL reject the login request.

IF the user account is banned, THE system SHALL reject the login request.

WHEN a user successfully logs in, THE system SHALL create an authenticated session.

WHEN a user logs in, THE system SHALL return authentication credentials to the user.

### Authentication State

WHILE a user is authenticated, THE system SHALL allow access to member-only features.

WHILE a user is authenticated, THE system SHALL include authentication credentials with each request.

IF the authentication session expires, THE system SHALL require the user to log in again.

IF the user logs out, THE system SHALL terminate the authentication session.

WHEN an administrator performs an action, THE system SHALL verify the user has administrator privileges.

WHEN a super administrator performs an action, THE system SHALL verify the user has super administrator privileges.

### Account Deletion

WHEN a user requests account deletion, THE system SHALL require authentication.

WHEN a user deletes their account, THE system SHALL permanently delete all articles authored by the user.

WHEN a user deletes their account, THE system SHALL permanently delete all comments written by the user.

WHEN a user deletes their account, THE system SHALL permanently delete all attachments owned by the user.

WHEN a user deletes their account, THE system SHALL remove the user from all pending administrator requests.

IF a user is banned, THE system SHALL prevent account deletion until the ban is lifted.

WHEN a user deletes their account, THE system SHALL terminate any active authentication sessions.

## Session and Token Policy

Define session duration, token refresh, and expiration policies.

### Session Lifecycle

WHEN a user successfully authenticates, THE system SHALL create a session for that user.

WHILE a session is active, THE system SHALL maintain the user's authenticated state.

WHEN a user logs out, THE system SHALL terminate the session.

WHEN a session reaches its expiration time, THE system SHALL terminate the session.

IF a user attempts to access a protected resource without an active session, THEN THE system SHALL require authentication.

THE system SHALL allow only one active session per user at any given time.

WHEN a user logs in from a new device or browser, THE system SHALL terminate any existing session for that user.

WHEN a session is terminated, THE system SHALL invalidate all associated tokens.

IF a session is inactive for the configured timeout period, THEN THE system SHALL terminate the session.

WHEN a session is terminated, THE system SHALL redirect the user to the login page if they attempt to access protected content.

### JWT Structure and Validation

THE system SHALL issue JSON Web Tokens (JWT) for authenticated users.

THE system SHALL include the user's unique identifier in the JWT payload.

THE system SHALL include the user's role in the JWT payload.

THE system SHALL sign all JWTs with a server-side secret key.

THE system SHALL validate the JWT signature on every request that requires authentication.

IF a JWT is malformed or has an invalid signature, THEN THE system SHALL reject the request.

IF a JWT is expired, THEN THE system SHALL reject the request.

THE system SHALL NOT store sensitive user information in the JWT payload.

THE system SHALL encode the JWT payload in a standard format that can be decoded by client applications.

WHEN a user's role changes, THE system SHALL invalidate existing JWTs for that user.

### Token Refresh Mechanism

THE system SHALL issue an access token with a short expiration time for each authentication.

THE system SHALL issue a refresh token with a longer expiration time alongside the access token.

WHEN an access token expires, THE system SHALL allow the user to obtain a new access token using the refresh token.

WHEN a refresh token is used to obtain a new access token, THE system SHALL issue a new refresh token.

IF a refresh token is expired, THEN THE system SHALL require the user to re-authenticate.

IF a refresh token is invalid or has been revoked, THEN THE system SHALL require the user to re-authenticate.

WHEN a user logs out, THE system SHALL invalidate all refresh tokens associated with that user.

WHEN a user's password is changed, THE system SHALL invalidate all existing refresh tokens for that user.

THE system SHALL rotate refresh tokens on each use to prevent replay attacks.

IF a refresh token is used more than once, THEN THE system SHALL invalidate all tokens for that user and require re-authentication.

### Token Expiration Policy

THE system SHALL configure access token expiration to 15 minutes from issuance.

THE system SHALL configure refresh token expiration to 7 days from issuance.

THE system SHALL configure session timeout to 30 minutes of inactivity.

THE system SHALL reject any request with an expired access token.

THE system SHALL reject any request with an expired refresh token.

WHEN an access token is about to expire, THE system SHALL allow the client to proactively refresh it.

IF a token has already been used for refresh, THEN THE system SHALL reject subsequent uses of that token.

THE system SHALL log all token expiration events for security auditing.

THE system SHALL allow administrators to configure token expiration times through system settings.

WHEN token expiration times are changed by an administrator, THE system SHALL apply the new settings to all newly issued tokens.

# Account Lifecycle

Account state transitions and lifecycle management.

## Account States and Transitions

Define account states (active, suspended, deleted) and valid transitions.

### Account State Definitions

THE system SHALL recognize three account states: active, banned, and deleted.

THE system SHALL define an active account as one that can log in, create content, and interact with the platform.

THE system SHALL define a banned account as one that cannot log in but retains all existing content.

THE system SHALL define a deleted account as one that has been permanently removed along with all associated content.

THE system SHALL assign the active state to all newly registered accounts by default.

THE system SHALL prevent any state transitions from the deleted state.

THE system SHALL record the timestamp when an account transitions to any state.

THE system SHALL record the reason when an account transitions to the banned state.

### Account Lifecycle Transitions

WHEN a user registers, THE system SHALL transition the account to the active state.

WHEN an administrator bans a user, THE system SHALL transition the account from active to banned state.

WHEN an administrator unbans a user, THE system SHALL transition the account from banned to active state.

WHEN a user deletes their own account, THE system SHALL transition the account from active to deleted state.

IF an account is in the banned state, THE system SHALL prevent the user from logging in.

IF an account is in the banned state, THE system SHALL prevent the user from modifying any content.

IF an account is in the active state, THE system SHALL allow the user to log in and perform all permitted actions.

IF an account is in the deleted state, THE system SHALL prevent any login attempts.

IF an account is in the deleted state, THE system SHALL prevent any recovery or restoration of the account.

THE system SHALL allow only administrators to initiate transitions to the banned state.

THE system SHALL allow only the account owner to initiate transitions to the deleted state.

THE system SHALL allow only administrators to initiate transitions from banned to active state.

### Account Suspension and Banning

WHEN an administrator bans a user, THE system SHALL require a reason for the ban.

WHEN an administrator bans a user, THE system SHALL record the administrator who initiated the ban.

WHEN an administrator bans a user, THE system SHALL immediately prevent the user from logging in.

WHEN an administrator unbans a user, THE system SHALL immediately restore the user's login capability.

THE system SHALL retain all articles and comments from banned users.

THE system SHALL display banned users' content without modification.

THE system SHALL allow administrators to view the ban reason for each banned user.

THE system SHALL allow administrators to view the list of all banned users.

THE system SHALL allow administrators to view who banned each user.

WHEN a banned user attempts to log in, THE system SHALL reject the login attempt.

WHEN a banned user attempts to log in, THE system SHALL indicate that the account is banned.

### Account Deletion

WHEN a user requests account deletion, THE system SHALL require explicit confirmation.

WHEN a user deletes their account, THE system SHALL delete all articles owned by the user.

WHEN a user deletes their account, THE system SHALL delete all comments owned by the user.

WHEN a user deletes their account, THE system SHALL delete all attachments owned by the user.

WHEN a user deletes their account, THE system SHALL remove the user's profile information.

WHEN a user deletes their account, THE system SHALL prevent the user from re-registering with the same email.

IF a user has pending administrator requests, THE system SHALL cancel those requests upon account deletion.

IF a user is banned, THE system SHALL prevent the user from deleting their account.

THE system SHALL permanently remove all data associated with a deleted account.

THE system SHALL not allow recovery of a deleted account.

### Account Deactivation and Reactivation

THE system SHALL not support voluntary account deactivation by users.

THE system SHALL treat account banning as the only form of account deactivation.

WHEN an administrator unbans a user, THE system SHALL reactivate the account.

WHEN an account is reactivated, THE system SHALL restore all previous permissions.

WHEN an account is reactivated, THE system SHALL allow the user to log in immediately.

THE system SHALL maintain the user's content history after reactivation.

THE system SHALL maintain the user's article and comment ownership after reactivation.

IF a user's account was banned multiple times, THE system SHALL retain the ban history.