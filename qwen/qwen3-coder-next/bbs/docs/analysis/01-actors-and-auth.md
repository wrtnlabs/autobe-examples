**discussionBoard — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their roles and what they can do.

## guest Actor

Guests are users who have not yet logged in to the platform. They can browse all public content including articles, comments, and user profiles without restriction. Guests can view the list of sections and browse articles within any section. They can search articles by title or content and filter by tags. Guest users cannot create, edit, or delete any content. Guests cannot post comments or attach files to articles. Guest sessions do not persist between browser sessions—no account data is stored locally. When guests attempt to perform protected actions, they are prompted to log in. All guest activity is unassociated with any user account. Guests can initiate account registration to become members.

### guest browsing

WHEN a guest views any article or comment, THE system SHALL allow complete access without requiring authentication.

WHEN a guest navigates to the discussion board, THE system SHALL display all publicly available content.

GUESTS can browse articles in any section without limitation.

GUESTS can view comment sections on any article.

GUESTS can view user profiles and associated content.

GUESTS can view section listings and descriptions.

GUESTS can sort articles by newest first or oldest first without authentication.

GUESTS can navigate between sections freely without interruption.

GUESTS can access the article list view without being prompted to log in.

GUESTS can click on any article title to view its details without authentication.

### anonymous access

WHEN a guest accesses any public endpoint, THE system SHALL allow access without requiring authentication.

THE system SHALL NOT prompt guests for credentials when browsing public content.

GUESTS can access the discussion board without logging in.

GUESTS can view all content marked as publicly accessible without authentication.

GUESTS' access is anonymous—the system does not associate their browsing activity with any account.

THE system SHALL maintain guest session state only for the duration of their browser session.

GUESTS' browsing activity is not recorded in any persistent user data store.

GUESTS can refresh the page or navigate between pages without authentication prompts.

GUESTS' identity is not required for accessing public content.

When a guest attempts to access protected resources, THE system SHALL display the guest access error.

### public content viewing

WHEN a guest views a user profile, THE system SHALL display:
1. The user's display name
2. The user's bio
3. A list of all articles written by that user
4. A list of all comments written by that user

GUESTS can view the full content of any article including title, author, and body text.

GUESTS can download any attached files or images from articles.

GUESTS can view all tags associated with articles.

GUESTS can see the number of comments on each article in the list view.

GUESTS can view comment author names, content, and timestamps.

GUESTS can scroll through pagination controls for articles without authentication.

GUESTS can view section descriptions and browse articles within sections.

GUESTS can view the creation and update timestamps for all public content.

GUESTS' ability to view content remains unchanged even when the content owner is banned.

GUESTS can view all content that has not been deleted by its author or an administrator.

### search without authentication

WHEN a guest enters a search query, THE system SHALL:
1. Return articles matching the search terms
2. Display results in a paginated list
3. Show title, author, tags, and comment count for each result
4. Allow sorting by newest first or oldest first

GUESTS can search articles by title or content without providing credentials.

GUESTS can filter search results by tags without authentication.

THE system SHALL process guest searches identically to member searches in terms of relevance.

GUESTS can view search result counts without being logged in.

GUESTS can navigate through search result pages using pagination controls.

GUESTS can view search results without any interruption for authentication.

GUESTS' search queries are not associated with any user account.

GUESTS can initiate searches from any page on the discussion board.

GUESTS can refine searches by adding or removing tags without authentication.

### action requiring login

WHEN a guest attempts to create an article, THE system SHALL:
1. Display a prompt requesting login or registration
2. Show the guest login/registration modal
3. Preserve the draft content if the guest proceeds with registration

WHEN a guest attempts to comment on an article, THE system SHALL:
1. Display a prompt requesting login or registration
2. Show the guest login/registration modal
3. Allow the comment to be submitted after registration

WHEN a guest attempts to edit their own content, THE system SHALL:
1. Detect they are not authenticated
2. Display a prompt requesting login or registration
3. Guide them to complete registration to access their content

GUESTS cannot upload files to articles.

GUESTS cannot delete any content including articles or comments.

GUESTS cannot change their password (as they have no account).

GUESTS cannot manage sections.

GUESTS cannot ban users.

GUESTS cannot submit administrator requests.

GUESTS cannot access the user profile editing interface.

WHEN a guest attempts to edit their profile, THE system SHALL redirect them to the login page.

### guest session behavior

WHEN a guest opens a new browser window, THE system SHALL:
1. Initialize a fresh guest session
2. Treat all content as unauthenticated
3. Not recall any previous browsing activity

GUESTS' sessions do not persist between browser sessions.

GUESTS' viewing history is not saved locally or on the server.

GUESTS cannot access their previously viewed content through session history.

GUESTS' preferences (such as sorting order) are stored only temporarily in the current session.

GUESTS' search queries are not retained across sessions.

GUESTS' navigation path is not recorded in any persistent manner.

GUESTS cannot use any features that require account persistence.

WHEN a guest closes their browser, THE system SHALL clear all temporary session data.

GUESTS' session state is ephemeral and expires when the session ends.

GUESTS cannot restore their session after browser closure.

### unauthenticated state

WHEN a guest visits any page, THE system SHALL:
1. Identify the user as unauthenticated
2. Display appropriate interface indicators
3. Restrict access to authenticated-only features

GUESTS' status is clearly indicated in the user interface.

GUESTS cannot access any feature requiring authentication.

WHEN a guest attempts to access a protected page, THE system SHALL:
1. Redirect them to the login or registration page
2. Preserve their intended destination
3. Display a clear message about required authentication

GUESTS see interface elements indicating their unauthenticated status.

GUESTS' actions are recorded as anonymous in logs without user association.

GUESTS' requests are processed without user context.

GUESTS cannot access any account-specific data including personal settings.

GUESTS cannot view protected content that requires authentication.

GUESTS' requests do not include any authentication tokens.

GUESTS' session is considered invalid until they register and log in.

### content restriction for guests

GUESTS cannot create new articles.

GUESTS cannot attach files or images to articles.

GUESTS cannot tag articles with custom tags.

GUESTS cannot edit any articles.

GUESTS cannot delete any articles.

GUESTS cannot write comments on any articles.

GUESTS cannot edit any comments.

GUESTS cannot delete any comments.

GUESTS cannot edit their own profile (since they have no account).

GUESTS cannot change their password.

GUESTS cannot delete their account (since they have none).

GUESTS cannot create or manage sections.

GUESTS cannot submit administrator requests.

GUESTS cannot ban users.

GUESTS cannot access the administrator dashboard.

GUESTS cannot view the list of banned users.

GUESTS cannot promote or demote administrators.

GUESTS cannot view administrative analytics.

GUESTS cannot access protected content that requires authentication.

GUESTS cannot use any administrative tools.

### visitor capabilities

GUESTS can browse all articles in the discussion board.

GUESTS can view articles sorted by newest first or oldest first.

GUESTS can search articles by title or content.

GUESTS can filter search results by tags.

GUESTS can view the full content of any article.

GUESTS can download attached files and images from articles.

GUESTS can view user profiles and their content.

GUESTS can view all comments on any article.

GUESTS can navigate between sections without restriction.

GUESTS can access the section listing page.

GUESTS can view section descriptions.

GUESTS can browse paginated article lists.

GUESTS can click on any article to view its details.

GUESTS can initiate the registration process.

GUESTS can navigate to the login page.

GUESTS can view the discussion board interface without authentication.

### guest-to-member transition

WHEN a guest initiates registration, THE system SHALL:
1. Present a registration form with required fields
2. Accept email address as unique identifier
3. Require password creation
4. Allow optional display name and bio
5. Create a new member account upon successful registration

GUESTS can transition to member status by completing registration.

WHEN a guest registers, THE system SHALL:
1. Convert their guest session to a member session
2. Associate any pending content with their new account
3. Notify them of successful registration
4. Automatically log them in to their new account

GUESTS can choose to log in instead of registering if they have an existing account.

WHEN a guest logs in, THE system SHALL:
1. Authenticate their credentials
2. Create a persistent session
3. Restore any pending content associated with their account
4. Update their status from guest to member

GUESTS can access their newly created account immediately after registration.

GUESTS' previous guest activity is not transferred to their new account.

WHEN a guest registers, THE system SHALL clear their temporary guest session and replace it with a permanent member session.

GUESTS can begin using member features immediately after successful registration.

GUESTS' transition to member status is immediate upon account creation.

## member Actor

Members are authenticated users who have successfully registered and logged in. They can create articles in any section with title, content, attachments, images, and tags. Members can edit their own articles including title, content, attachments, and tags. Members can delete their own articles. Members can write comments on articles, and edit or delete their own comments. Each member has a profile with display name and bio text they can edit. Members can view other users' profiles including their articles and comments. Members can manage their account by changing their password. Members can submit requests to become administrators. Members can view their own banned status and reasons if applicable. Members cannot create or manage sections or delete other users' content.

### Authenticated User Capabilities

WHEN a member accesses protected resources, THE system SHALL verify their authentication status.
WHEN a member performs an action, THE system SHALL ensure their account is not banned.
THE system SHALL allow members to perform all actions available to authenticated users.
WHILE a member's account is active, THE system SHALL grant full member permissions.
IF a member's account is banned, THE system SHALL deny login attempts and restrict account-level actions.

### Article Creation Workflow

WHEN a member creates an article, THE system SHALL require a title, content, and section selection.
WHEN a member creates an article, THE system SHALL allow optional file attachments.
WHEN a member creates an article, THE system SHALL allow optional image attachments.
WHEN a member creates an article, THE system SHALL allow multiple file and image attachments.
WHEN a member creates an article, THE system SHALL allow adding free-text tags.
WHEN a member submits an article creation request with invalid data, THE system SHALL reject the request and provide error details.

### Comment Management

WHEN a member writes a comment on an article, THE system SHALL record the comment content and associate it with the member.
WHEN a member edits their own comment, THE system SHALL update the comment content.
WHEN a member deletes their own comment, THE system SHALL remove the comment.
WHILE comments are displayed on an article, THE system SHALL show them sorted by oldest first.
WHEN a member views a comment on an article, THE system SHALL display the author's display name, content, and posting time.

### Profile Editing

WHEN a member edits their profile, THE system SHALL allow updating their display name.
WHEN a member edits their profile, THE system SHALL allow updating their bio.
THE system SHALL require the display name to be between 1-100 characters.
THE system SHALL allow the bio field to be optional.
WHEN a member submits profile changes, THE system SHALL validate data before updating.

### Password Management

WHEN a member requests a password change, THE system SHALL require their current password for verification.
WHEN a member changes their password, THE system SHALL accept a new password meeting security requirements.
WHEN a member successfully changes their password, THE system SHALL invalidate existing sessions and require re-login.

### Account Ownership

WHEN a member performs an action, THE system SHALL attribute it to their user account.
WHEN a member deletes their account, THE system SHALL delete all their articles.
WHEN a member deletes their account, THE system SHALL delete all their comments.
WHEN a member deletes their account, THE system SHALL remove their profile information.
THE system SHALL prevent account deletion while an administrator request is pending.

### Article Editing Permissions

WHEN a member attempts to edit an article, THE system SHALL verify they are the article's author.
WHEN a member edits their own article, THE system SHALL allow title updates.
WHEN a member edits their own article, THE system SHALL allow content updates.
WHEN a member edits their own article, THE system SHALL allow file attachment management.
WHEN a member edits their own article, THE system SHALL allow tag updates.

### Content Deletion Rights

WHEN a member deletes their own article, THE system SHALL remove the article and associated attachments.
WHEN a member deletes their own comment, THE system SHALL remove the comment.
THE system SHALL prevent members from deleting other users' articles.
THE system SHALL prevent members from deleting other users' comments.
WHEN a member deletes their account, THE system SHALL cascade-delete all their content.

### Member Profile Visibility

WHEN any user views a member's profile, THE system SHALL display the member's display name.
WHEN any user views a member's profile, THE system SHALL display the member's bio.
WHEN any user views a member's profile, THE system SHALL display a list of articles the member has written.
WHEN any user views a member's profile, THE system SHALL display a list of comments the member has written.
THE system SHALL allow members to view other members' profiles without authentication.

### Administrator Request Submission

WHEN a member submits an administrator request, THE system SHALL require a reason text.
WHEN a member submits an administrator request, THE system SHALL record the submission timestamp.
WHEN a member submits an administrator request, THE system SHALL set the initial status to pending.
WHEN a member has an existing pending administrator request, THE system SHALL prevent additional requests.
WHEN a member views their administrator request status, THE system SHALL display the current status and processed status.

### User Activity Association

WHEN a member creates an article, THE system SHALL associate it with their user account.
WHEN a member writes a comment, THE system SHALL associate it with their user account.
WHEN a member uploads an attachment, THE system SHALL associate it with their user account.
WHEN a member creates an article, THE system SHALL record the creation timestamp.
WHEN a member updates an article, THE system SHALL record the update timestamp.

### Member Permissions Scope

MEMBERS can create articles in any section with title, content, attachments, images, and tags.
MEMBERS can edit their own articles including title, content, attachments, and tags.
MEMBERS can delete their own articles.
MEMBERS can write comments on articles and edit or delete their own comments.
MEMBERS cannot create or manage sections, delete other users' content, or ban users.

## admin Actor

Administrators are members who have been approved through the administrator request process. They retain all member capabilities and gain additional moderation powers. Administrators can create, edit, and delete sections including managing section names and descriptions. They can delete any article on the platform regardless of authorship. They can delete any comment regardless of authorship. Administrators can ban users by providing a ban reason. They can unban users and view the list of banned users with reasons. Administrators can view the list of pending administrator requests but cannot approve or reject them. Administrators can be promoted to super administrator by existing super administrators. Administrators cannot demote other administrators or themselves from super administrator status.

### Moderator Capabilities

### Content Governance

Administrators are responsible for maintaining the platform's content standards and ensuring discussions remain constructive.

THE system SHALL allow administrators to view all content across the platform regardless of section or author.

THE system SHALL require administrators to provide a reason when moderating any content.

### Administrator Permissions

Administrators retain all capabilities available to regular members.

WHEN an administrator logs in, THE system SHALL grant them all permissions available to members plus additional administrative capabilities.

Administrators can perform all user actions including creating articles, writing comments, editing profiles, and managing their account.

### Section Management

### Section Lifecycle Control

Administrators can create new sections to organize discussions.

WHEN an administrator creates a section, THE system SHALL require a name (1-100 characters) and description.

Administrators can edit existing section details including name and description.

WHEN an administrator edits a section, THE system SHALL preserve existing articles and comments associated with the section.

Administrators can delete sections from the platform.

WHEN an administrator deletes a section, THE system SHALL preserve all articles and comments that were in that section.

Administrators can view the complete list of all sections on the platform.

### Content Moderation

### Article Deletion Rights

Administrators can delete any article on the platform regardless of authorship.

WHEN an administrator deletes an article, THE system SHALL record the deletion timestamp and administrator identity.

Administrators can view the list of all articles on the platform for moderation purposes.

Administrators can view articles sorted by creation date for systematic review.

Administrators can filter articles by section for targeted moderation.

### Comment Deletion Authority

Administrators can delete any comment on the platform regardless of authorship.

WHEN an administrator deletes a comment, THE system SHALL record the deletion timestamp and administrator identity.

Administrators can view the list of all comments on the platform for moderation purposes.

Administrators can view comments sorted by creation date for systematic review.

### User Banning Procedure

### User Management Tools

Administrators can ban users from the platform.

WHEN an administrator bans a user, THE system SHALL require a ban reason (text).

WHEN a user is banned, THE system SHALL record the ban timestamp and administrator identity.

Banned users cannot log in to the platform.

Banned users' existing articles and comments remain visible on the platform.

Administrators can unban users from the platform.

WHEN an administrator unbans a user, THE system SHALL record the unban timestamp and administrator identity.

Administrators can view the complete list of banned users.

THE system SHALL show the ban reason for each banned user when viewing the list.

Administrators can search the list of banned users by username or ban reason.

### Administrator Request Workflow

Administrators can view the list of pending administrator requests.

THE system SHALL show the submitter's username, request reason, and submission timestamp for each pending request.

Administrators cannot approve or reject administrator requests.

Administrators cannot view requests that have already been approved or rejected.

Administrators cannot view the identity of super administrators who processed requests.

Administrators can refresh the pending requests list to see newly submitted requests.

### Demotion Restrictions

Administrators cannot demote other administrators from their current status.

Administrators cannot demote super administrators to regular administrator status.

Administrators cannot perform any user management actions on super administrators.

Administrators can view the list of all administrators on the platform.

THE system SHALL show each administrator's grade (regular or super) when viewing the administrator list.

## superAdmin Actor

Super administrators are the highest-level administrators with full platform control. They have all capabilities of regular administrators including section management, content moderation, and user banning. Super administrators can promote regular administrators to super administrator status. They can demote other super administrators to regular administrator status, except they cannot demote themselves. Super administrators can view all pending administrator requests and approve or reject them. When a request is approved, the user becomes a regular administrator. Super administrators have unlimited visibility into banned user records and can modify ban reasons. They retain all member privileges such as creating articles and comments. Super administrator status is distinct from regular administrator status with additional authorization controls. The system prevents self-demotion to maintain administrative hierarchy integrity.

### superAdmin Platform Ownership

THE superAdmin actor has ultimate platform ownership authority. Super administrators can perform any operation on the system without restriction. They retain all capabilities of regular administrators and members while having additional authorization controls.

### Full Administrative Authority

WHEN a superAdmin actor performs any administrative action, THE system SHALL allow the operation without restriction. Super administrators can create, edit, and delete sections. They can delete any article and comment on the platform. They can ban and unban any user. They can view all user accounts and their ban statuses.

### User Promotion Workflow

WHEN a superAdmin actor approves an administrator request, THE system SHALL grant the user regular administrator privileges. WHEN a regular administrator is promoted to super administrator by a superAdmin actor, THE system SHALL update their role to superAdmin. Promotions require explicit superAdmin approval through the administrator request workflow.

### Demotion Controls

WHEN a superAdmin actor demotes another super administrator to regular administrator, THE system SHALL update the target user's role. THE system SHALL record the demotion action and the responsible superAdmin actor. When demoting, THE system SHALL require a documented reason for the role change.

### Self-Protection Rules

THE system SHALL prevent a superAdmin actor from demoting themselves to regular administrator. IF a superAdmin attempts self-demotion, THE system SHALL reject the request and return an error. Super administrator role changes can only be performed by other super administrators.

### Super Administrator Privileges

WHILE acting as a superAdmin, THE system SHALL allow the user to create articles in any section. WHEN a superAdmin actor writes a comment, THE system SHALL allow them to edit and delete it like any member. Super administrators can view all articles and comments regardless of section or author.

### Request Approval Power

WHEN a superAdmin actor views pending administrator requests, THE system SHALL display all pending requests with submission details. WHEN a superAdmin actor approves a request, THE system SHALL grant regular administrator privileges to the user. WHEN a superAdmin actor rejects a request, THE system SHALL record the rejection reason.

### Administrator Hierarchy

THE superAdmin role is the highest authority level in the administrator hierarchy. Regular administrators report to super administrators for approval workflows. The system maintains exactly two administrator grades with no intermediate levels between regular and super administrator status.

### Unrestricted Content Access

WHEN a superAdmin actor views any article, THE system SHALL allow full access regardless of section or author. WHEN a superAdmin actor views any comment, THE system SHALL allow viewing regardless of article or author. Super administrators can view all file attachments without restriction.

### Platform Governance

THE system SHALL maintain an immutable record of all superAdmin authorization changes. WHEN a superAdmin actor promotes or demotes another user, THE system SHALL log the actor, target, timestamp, and reason. Super administrator role changes require explicit superAdmin authorization.

### Permission Escalation

WHEN a user's role is escalated to super administrator, THE system SHALL grant them all permissions of regular administrators. WHEN escalated, THE system SHALL allow immediate performance of all super administrator operations. Permission escalation follows the administrator request workflow with superAdmin approval.

### Authorization Boundaries

THE superAdmin role cannot modify its own privileges directly. Authorization changes require a second superAdmin actor to perform the operation. The system enforces role boundaries that prevent self-benefiting authorization changes.

# Authentication Flows

Registration, login, session management, and token policies.

## Registration and Login

Define user registration and login flows including validation and error handling.

### User Registration

WHEN a user submits a registration request, THE system SHALL:
1. Require a unique email address
2. Require a password meeting complexity requirements
3. Require a display name between 1-100 characters
4. Create a user account with role "member"
5. Store the password securely encrypted

WHERE the email address is already in use, THE system SHALL reject the registration request.
WHERE the password does not meet complexity requirements, THE system SHALL reject the registration request.
WHERE the display name is empty or exceeds 100 characters, THE system SHALL reject the registration request.

IF the registration is successful, THE system SHALL automatically log the user in.
IF the registration fails due to validation, THE system SHALL return a descriptive error message.

### User Login

WHEN a user submits login credentials, THE system SHALL:
1. Verify the email address exists in the system
2. Validate the password matches the stored credentials
3. Check the user account is not banned
4. Create a new session for the authenticated user

WHERE the email address does not exist, THE system SHALL reject the login request.
WHERE the password is incorrect, THE system SHALL reject the login request.
WHERE the user account is banned, THE system SHALL reject the login request with a ban reason.

WHILE a user is successfully logged in, THE system SHALL maintain their session until explicitly terminated.

### Authentication

WHEN a user's session expires, THE system SHALL require re-authentication.

WHERE a user attempts to access a protected resource without valid authentication, THE system SHALL reject the request.

WHEN a user explicitly logs out, THE system SHALL terminate their session and require re-authentication for subsequent requests.

WHERE authentication tokens are invalid or tampered with, THE system SHALL reject the request.

WHERE a user changes their password, THE system SHALL invalidate all existing sessions for that user.

### Signup Flow

WHEN a user initiates signup, THE system SHALL:
1. Present a registration form collecting email, password, and display name
2. Validate input fields according to business rules
3. Create the user account upon successful validation

WHERE validation fails during signup, THE system SHALL provide specific error messages for each invalid field.

WHEN signup is complete, THE system SHALL automatically redirect the user to their profile page.

### Signin Flow

WHEN a user navigates to the signin page, THE system SHALL present a login form.

WHEN a user submits login credentials successfully, THE system SHALL:
1. Verify credentials against stored user data
2. Check account status (not banned)
3. Establish authenticated session
4. Redirect to the originally requested page or home page

WHERE login fails, THE system SHALL display a generic error message to prevent email enumeration attacks.

WHERE an unauthenticated user attempts to access protected content, THE system SHALL redirect to the signin page.

## Session and Token Policy

Define session duration, token refresh, and expiration policies.

### Session Management

WHEN a user logs in, THE system SHALL create a new session.

THE system SHALL set session expiration to 30 days from last activity.

WHEN a user logs out, THE system SHALL invalidate the current session.

WHEN a user changes their password, THE system SHALL invalidate all active sessions for that user.

WHILE a session is active, THE system SHALL allow the user to maintain authenticated access.

THE system SHALL NOT persist session data after session expiration.

WHEN a session expires, THE system SHALL reject subsequent requests requiring authentication.

### JWT Access Token Policy

WHEN authentication succeeds, THE system SHALL issue a JWT access token.

THE system SHALL set JWT access token expiration to 15 minutes from issuance.

THE system SHALL include the user ID and role in the JWT access token payload.

THE system SHALL include an issued-at timestamp in the JWT access token.

WHILE a JWT access token is valid, THE system SHALL accept it for authenticated requests.

IF a request includes an expired JWT access token, THE system SHALL reject the request.

IF a request includes an invalid JWT access token, THE system SHALL reject the request.

### JWT Refresh Token Policy

WHEN authentication succeeds, THE system SHALL issue a JWT refresh token.

THE system SHALL set JWT refresh token expiration to 30 days from issuance.

THE system SHALL include the user ID in the JWT refresh token payload.

THE system SHALL include an issued-at timestamp in the JWT refresh token.

THE system SHALL NOT include user roles in the JWT refresh token payload.

WHEN a user logs out, THE system SHALL invalidate the refresh token.

THE system SHALL store refresh tokens in a secure database for revocation.

THE system SHALL NOT expose refresh tokens in client-side code.

### Token Refresh Mechanism

WHEN a JWT access token expires but the refresh token is still valid, THE system SHALL allow token refresh.

WHEN token refresh is requested, THE system SHALL validate the refresh token.

WHEN token refresh succeeds, THE system SHALL issue a new JWT access token.

WHEN token refresh fails due to expired refresh token, THE system SHALL require re-authentication.

WHEN token refresh is requested for a user whose session was invalidated, THE system SHALL reject the request.

THE system SHALL NOT issue multiple concurrent refresh tokens for the same session.

### Expiration Handling

IF a user attempts to access a protected resource with an expired JWT access token, THE system SHALL return an authentication error.

IF a user attempts to refresh tokens with an expired refresh token, THE system SHALL require re-authentication.

WHEN a session expires, THE system SHALL store the expiration timestamp for audit purposes.

WHILE a token is in its refresh window (JWT access token expired but refresh token valid), THE system SHALL allow automatic token refresh.

THE system SHALL NOT allow token refresh after the refresh token has expired.

# Account Lifecycle

Account state transitions and lifecycle management.

## Account States and Transitions

Define account states (active, suspended, deleted) and valid transitions.

### Account States

A user's account can exist in three states:

1. **Active**: User can log in and use the platform normally.
2. **Suspended**: User cannot log in but their content remains visible.
3. **Deleted**: Account record is removed, but historical content may remain associated with "Deleted User".

Each account transitions between states according to defined business rules.

### State Transitions

The system supports the following state transitions:

- **Active → Suspended**: Triggered when an administrator bans a user. A ban reason must be recorded.
- **Active → Deleted**: Triggered when a user initiates account deletion or when an administrator deletes an account. All associated content (articles, comments) is removed.
- **Suspended → Active**: Triggered when an administrator unbans a user. The original user credentials remain valid.
- **Suspended → Deleted**: Triggered when an administrator deletes a suspended account.

Accounts cannot transition directly from Deleted to Active. A new account must be created with a different email.

### Suspension and Deletion by Users

WHEN a user initiates account deletion, THE system SHALL:

1. Confirm the user's intent to delete their account
2. Verify the user's identity using their password
3. Delete all articles written by the user
4. Delete all comments written by the user
5. Remove the user's account record from the system

WHILE a user's account is suspended, THE system SHALL:

1. Reject any login attempts with the error message "Your account has been suspended"
2. Allow viewing of the user's existing articles and comments by other users
3. Prevent the user from creating new articles or comments
4. Prevent the user from editing existing articles or comments

THE system SHALL NOT automatically suspend accounts due to inactivity.

### Administrative State Management

Administrators can change account states with the following capabilities:

- **Suspend (ban) users**: WHEN an administrator suspends a user, THE system SHALL require a suspension reason and record the suspension timestamp. The user's existing articles and comments remain visible to other users.

- **Unban users**: WHEN an administrator unbans a user, THE system SHALL record the unban timestamp and restore the user's ability to log in. The original suspension reason remains accessible to administrators.

- **Delete accounts**: WHEN an administrator deletes a user account, THE system SHALL immediately remove the user's account record and delete all articles and comments they created. The deletion cannot be undone.

- **Self-deactivation**: Users can delete their own accounts but cannot suspend themselves. An administrator must perform suspensions.

### Account Deactivation Workflow

WHEN a user submits an account deletion request, THE system SHALL:

1. Display a confirmation dialog explaining the consequences of deletion
2. Require password verification before proceeding
3. After confirmation, permanently delete the account and all associated content
4. Display a success message confirming account deletion

WHEN an administrator views a banned user's profile, THE system SHALL:

1. Display the user's account status as "Suspended"
2. Show the suspension reason set by the administrator who performed the ban
3. Provide an "Unban" button for eligible administrators

WHILE an account is in the deleted state, THE system SHALL:

1. Treat the user's profile as non-existent
2. Display articles and comments as having been created by "Deleted User"
3. Prevent any interaction with the account through normal API endpoints