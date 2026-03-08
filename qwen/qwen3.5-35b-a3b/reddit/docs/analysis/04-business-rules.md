**redditPlatform — Data isolation, business rules, filtering/sorting/pagination, error catalog**

Data isolation, business rules, filtering/sorting/pagination, error catalog

# Data Isolation and Ownership

Data ownership rules and tenant/user-level isolation policies.

## Ownership and Isolation Rules

Define data ownership semantics and isolation boundaries for multi-user access.

### Data Ownership Rules

A user SHALL be the sole owner of all content they create, including their posts, comments, and profile information.

WHEN a user creates content, THE system SHALL associate that content with the creating user as the owner.

WHEN a user owns content, ONLY THAT USER SHALL have permission to edit or delete it, except for moderators acting within their assigned communities.

IF the content owner is banned from a community, THE system SHALL prevent them from creating new posts or comments in that community.

IF an owner deletes a post, THE system SHALL delete all comments associated with that post.

IF an owner deletes their account, THE system SHALL delete all posts, comments, votes, and reports created by that user.

THE system SHALL maintain ownership information for all user-created content to enable accurate permission checks.

### User Data Isolation

A member SHALL only be able to view and modify their own account data, including their profile, votes, and personal content.

WHEN a member views any data, THE system SHALL filter results to include only data accessible to that user.

GUESTS SHALL NOT be able to view private user profile data such as total karma score.

WHEN a member searches for posts or comments, THE system SHALL include results only from content the member has access to.

THE system SHALL NOT expose other users' email addresses or account creation dates to members.

IF a member attempts to view another user's private data, THE system SHALL reject the request.

IF a member attempts to modify another user's content, THE system SHALL reject the request.

THE system SHALL ensure all user-specific data is properly isolated between different user accounts.

### Multi-User Content Access

Guests SHALL be able to view all posts from the popular feed and community feeds.

Guests SHALL NOT be able to create posts, comments, or votes.

Members SHALL be able to view posts from communities they are subscribed to in the home feed.

Members SHALL be able to create posts only in communities they are subscribed to.

WHEN viewing a post or comment, THE system SHALL display content to any actor who has access to the containing community.

IF a user is banned from a community, THE system SHALL prevent them from viewing posts and comments in that community.

IF a user attempts to vote on content they have already voted on, THE system SHALL allow them to change their vote.

IF a user attempts to vote on content they have already voted on, THE system SHALL allow them to remove their vote entirely.

WHEN a post or comment is deleted by its owner, THE system SHALL prevent all users from viewing that content.

### Community Access Rules

Any user SHALL be able to view a list of all communities on the platform.

Any user SHALL be able to search for communities by name.

Any user SHALL be able to view the subscriber count for any community.

WHEN a user subscribes to a community, THE system SHALL increment the community's subscriber count.

WHEN a user unsubscribes from a community, THE system SHALL decrement the community's subscriber count.

THE system SHALL allow users to view a list of all communities they are subscribed to.

A user SHALL be required to subscribe to a community before creating posts in that community.

IF a user attempts to create a post in a community they are not subscribed to, THE system SHALL reject the request.

IF a user is banned from a community, THE system SHALL prevent them from subscribing to that community.

THE system SHALL allow the community owner to assign moderator roles to any user.

THE system SHALL allow moderators to remove users from the community (banning).

WHEN a user is banned from a community, THE system SHALL prevent them from creating posts or comments in that community, but SHALL allow them to view content.

### Error Conditions for Access Control

THE system SHALL reject the request when a user attempts to access content from a community they are banned from.

THE system SHALL reject the request when a guest attempts to perform a member-only action (create post, comment, or vote).

THE system SHALL reject the request when a user attempts to access another user's private data.

THE system SHALL reject the request when a moderator attempts to remove another moderator from their community.

THE system SHALL reject the request when a moderator attempts to remove the owner of their community.

THE system SHALL reject the request when a user attempts to edit or delete content they do not own.

THE system SHALL reject the request when a banned user attempts to create posts or comments in their banned community.

THE system SHALL reject the request when a user attempts to access content that has been deleted by its owner.

THE system SHALL reject the request when a user attempts to subscribe to a community they are banned from.

IF a user's account is deleted, THE system SHALL invalidate all sessions and prevent further access to the account.

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## User Rules

Users create accounts by providing a unique username, valid email address, and secure password. The username must be unique across all active accounts in the system. Each user profile includes a display name, biography text, and avatar image that can be customized. Users maintain full ownership of their own profile content and can update it at any time. When a user chooses to delete their account, all associated posts and comments are permanently removed from the platform. Password changes are allowed but require verification of the current password before setting a new one. Users can only log in using their registered email address and password combination. The system enforces unique usernames to prevent confusion between different community members. Account deletion is irreversible and removes all user-generated content from the platform. Users with deleted accounts cannot reuse their username for new accounts.

### Account Creation Requirements

WHEN a new user creates an account, THE system SHALL:
1. Require a unique username
2. Require a valid email address
3. Require a secure password
4. Associate all content with the new user

IF the username already exists, THE system SHALL reject the account creation.
IF the email address is already registered, THE system SHALL reject the account creation.
IF the password does not meet complexity requirements, THE system SHALL reject the account creation.

WHEN an account is created successfully, THE system SHALL generate a new user profile with the provided username.
WHEN an account is created, THE system SHALL set the user's initial karma score to zero.
THE system SHALL require email verification before allowing the user to post or comment.

### Unique Username Validation

WHEN a user provides a username during account creation, THE system SHALL validate that the username is unique across all active accounts in the system.

IF the requested username is already taken by another active account, THE system SHALL reject the username and prompt for an alternative.
IF a user attempts to register with a username that belongs to a deleted account, THE system SHALL reject the registration.
THE system SHALL enforce case-insensitive uniqueness for usernames to prevent confusion between similar usernames.

WHEN username validation occurs, THE system SHALL check against all existing usernames, including those from previously deleted accounts.
THE system SHALL display a clear error message when a username is unavailable, indicating that the username is already in use.

### Profile Ownership Rules

THE system SHALL ensure that each user has full ownership of their own profile content, including display name, bio, and avatar.

WHEN a user views their own profile, THE system SHALL display all profile information including display name, bio, and avatar.
WHEN a user views another user's profile, THE system SHALL display the other user's public profile information.
THE system SHALL allow each user to edit only their own profile information.

IF a user attempts to edit another user's profile, THE system SHALL reject the edit request.
IF a user attempts to delete another user's profile content, THE system SHALL reject the deletion request.
THE system SHALL maintain a record of profile ownership to prevent unauthorized modifications.
THE system SHALL allow profile owners to update their display name, bio, and avatar at any time.

### Email Uniqueness Constraint

WHEN a user registers with an email address, THE system SHALL validate that the email is not already associated with another account.

IF the email address is already registered to another account, THE system SHALL reject the registration.
IF a user attempts to change their email to one that is already in use, THE system SHALL reject the change.
THE system SHALL enforce uniqueness of email addresses across all active accounts.

WHEN email validation occurs, THE system SHALL check both active and deleted accounts for the email address.
THE system SHALL display an error message when a user attempts to register with an email that is already in use.
THE system SHALL maintain the original email for each user even after password changes or profile updates.
WHEN account deletion occurs, THE email address becomes available for new registrations after a retention period.

### Password Change Procedure

WHEN a user changes their password, THE system SHALL require verification of the current password.

IF the provided current password is incorrect, THE system SHALL reject the password change request.
IF the new password does not meet complexity requirements, THE system SHALL reject the password change.
THE system SHALL invalidate all active sessions when a password is changed.

WHEN a password change is successful, THE system SHALL update the user's credentials.
WHEN a password change is successful, THE system SHALL notify the user of the successful change.
THE system SHALL require the user to log in again after a password change using the new password.
IF a user requests password recovery, THE system SHALL send a recovery link to their registered email address.
THE system SHALL prevent a user from setting a new password that matches their current password.

### Account Deletion Consequences

WHEN a user chooses to delete their account, THE system SHALL permanently remove all user-generated content.

IF a user deletes their account, THE system SHALL delete all posts created by that user.
IF a user deletes their account, THE system SHALL delete all comments made by that user.
IF a user deletes their account, THE system SHALL remove all votes cast by that user.
THE system SHALL make account deletion irreversible once confirmed.

WHEN account deletion is initiated, THE system SHALL display a clear warning about the consequences.
WHEN account deletion is initiated, THE system SHALL require explicit confirmation from the user.
WHEN account deletion is complete, THE username becomes unavailable for future registrations.
THE system SHALL not recover any content after account deletion is finalized.
THE system SHALL remove the user's profile from search results after deletion.

### Profile Editing Permissions

WHEN a user edits their profile, THE system SHALL verify that the user owns the profile being edited.

IF a user attempts to edit another user's profile, THE system SHALL reject the edit.
IF a user attempts to upload an invalid avatar image, THE system SHALL reject the upload.
THE system SHALL allow users to update their display name, bio, and avatar independently.

WHEN a user successfully edits their profile, THE system SHALL save the changes immediately.
WHEN a user successfully edits their profile, THE system SHALL update the display across all relevant pages.
WHEN a user attempts to set a display name that conflicts with existing usernames, THE system SHALL reject the change.
THE system SHALL allow users to change their display name without changing their username.
THE system SHALL enforce content guidelines on bio text to prevent inappropriate content.

### User Identity Verification

WHEN a user logs in, THE system SHALL verify the user's email and password combination.

IF the email or password is incorrect, THE system SHALL reject the login attempt.
IF the email is not verified, THE system SHALL prevent full account access until verification is complete.
THE system SHALL maintain session state for logged-in users across multiple requests.

WHEN login is successful, THE system SHALL grant the user access to member-only features.
WHEN login fails due to incorrect credentials, THE system SHALL not reveal whether the email or password was wrong.
THE system SHALL implement rate limiting on login attempts to prevent brute force attacks.
WHEN a user is logged in, THE system SHALL display the user's username in the interface.
THE system SHALL allow users to log out and invalidate their session.

### Irreversible Account Removal

WHEN a user confirms account deletion, THE system SHALL permanently remove the account without recovery option.

IF a user confirms account deletion, THE system SHALL immediately begin the deletion process.
IF a user confirms account deletion, THE system SHALL remove all data associated with the account.
THE system SHALL not provide any method to restore a deleted account after confirmation.

WHEN account deletion is confirmed, THE system SHALL send a confirmation email to the user.
WHEN account deletion is complete, THE system SHALL display a confirmation message to the user.
THE system SHALL remove all user references from related entities (posts, comments, votes).
THE system SHALL retain minimal anonymized data as required by applicable laws.
THE system SHALL mark the account as deleted in the system for a retention period before complete removal.

### Username Reuse Restrictions

WHEN a user deletes their account, THE system SHALL prevent the username from being reused by new accounts.

IF a deleted user's username becomes available, THE system SHALL mark it as unavailable for registration.
IF a user attempts to register with a username that was previously deleted, THE system SHALL reject the registration.
THE system SHALL enforce an indefinite restriction on username reuse to prevent confusion.

WHEN username availability is checked, THE system SHALL include both active and deleted accounts in the check.
WHEN a username is rejected due to prior deletion, THE system SHALL inform the user that the username is unavailable.
THE system SHALL NOT allow any account to use a username that has been associated with a deleted account.
THE system SHALL maintain a historical record of all usernames ever registered to enforce the reuse policy.

## Post Rules

Users can create posts in any community they are subscribed to. Every post requires a title, and the content must be one of three types: text, link, or image. Text posts contain written content that is displayed in full when viewed. Link posts contain a URL that is shown with the domain name in post lists. Image posts include an uploaded image with a thumbnail preview in post lists. Only the post author can edit or delete their own posts. Posts can be created only in communities where the user has an active subscription. When viewing a post, users see the title, full content, author username, community name, vote score, comment count, and posting time. Unsubscribing from a community does not delete existing posts made by the user in that community.

### Post Creation Requirements

WHEN a user creates a post, THE system SHALL:
1. Verify the user is subscribed to the target community
2. Accept post title, content, and type selection
3. Associate the post with the creating user and target community
4. Set initial vote score to zero
5. Record the creation timestamp

IF the user is not subscribed to the community, THE system SHALL reject the post creation request.


### Community Subscription Prerequisite

THE system SHALL require active subscription before allowing post creation in a community.

WHEN a user attempts to create a post in a community, THE system SHALL verify the user has an active subscription.

IF the subscription status is inactive or missing, THE system SHALL reject the post creation.

Unsubscribing from a community after posting does not delete existing posts.


### Post Type Restrictions

WHEN creating a post, THE system SHALL accept exactly one of three types:
- Text post: contains text content
- Link post: contains URL
- Image post: contains uploaded image

IF a post type is not one of the three valid options, THE system SHALL reject the post creation.

Text posts require text content. Link posts require a valid URL. Image posts require an image file.


### Title Mandatory Field

WHEN creating a post, THE system SHALL require a title.

IF the title is empty or missing, THE system SHALL reject the post creation request.

IF the title exceeds the maximum allowed length, THE system SHALL reject the post creation request.

THE title field is mandatory for all post types (text, link, image).


### Ownership Edit Permissions

WHEN a user edits a post, THE system SHALL verify the user is the post owner.

ONLY the post author can edit their own posts.

IF the user is not the owner, THE system SHALL reject the edit request.

IF the user is the owner, THE system SHALL allow editing of title and content.

THE system SHALL update the modification timestamp when a post is edited.


### Post Deletion Rules

WHEN a user deletes a post, THE system SHALL verify the user is the post owner.

ONLY the post author can delete their own posts.

IF the user is not the owner, THE system SHALL reject the deletion request.

IF the user is a moderator of the community, THE system SHALL allow deletion of any post in that community.

WHEN a post is deleted, THE system SHALL remove it from all feeds and displays.

WHEN a post is deleted, THE system SHALL remove all associated votes from score calculations.


### Post List Display Format

WHEN displaying posts in any feed, THE system SHALL show:
- Title
- Author username
- Community name
- Vote score
- Comment count
- Time since posted (relative format, e.g., "3 hours ago")

THE system SHALL display appropriate content previews based on post type:
- Text posts: first 200 characters of content
- Image posts: thumbnail preview
- Link posts: domain name of URL

THE system SHALL paginate all feed displays.


### Link Post Domain Display

WHEN displaying a link post in a feed, THE system SHALL extract and show only the domain name from the URL.

EXAMPLE: For "https://www.youtube.com/watch?v=123", THE system SHALL display "youtube.com"

WHEN a link post is created, THE system SHALL validate the URL is properly formatted.

IF the URL is invalid or cannot be parsed, THE system SHALL reject the post creation.


### Image Thumbnail Preview

WHEN an image post is created, THE system SHALL generate a thumbnail preview for feed display.

WHEN displaying image posts in feeds, THE system SHALL show the thumbnail image.

WHEN an image post is uploaded, THE system SHALL validate the file is a supported image format.

IF the uploaded image exceeds maximum file size, THE system SHALL reject the post creation.

THE thumbnail preview is displayed only in post lists, not in the full post view.


### Post View Information Structure

WHEN viewing a single post, THE system SHALL display:
- Full title
- Complete content (text, URL, or image)
- Author username
- Community name
- Vote score
- Comment count
- Creation timestamp

THE system SHALL display the full content for text posts without truncation.

THE system SHALL display the original URL for link posts.

THE system SHALL display the full-size image for image posts.

THE system SHALL enable vote controls showing current vote status for logged-in users.

THE system SHALL enable comment controls for creating and viewing replies.


## Comment Rules

Users can write comments on any post regardless of their subscription status. Comments support unlimited nested replies with no depth restrictions. Only the comment author can edit or delete their own comments. Each comment displays the author username, content, vote score, posting time, and any nested replies. When a comment is deleted, it is removed from all post views and cannot be restored. Users can reply to any existing comment, including replies that are themselves replies. Deleted comments do not affect the ability of other users to continue replying to the discussion thread. Comments are independent of post subscription status, allowing engagement from any user on the platform.

### Comment Creation Permissions

WHEN a user wants to write a comment on a post, THE system SHALL allow the user regardless of community subscription status.

WHEN a user writes a comment on a post, THE system SHALL allow the comment regardless of whether the user is subscribed to that post's community.

IF the user is banned from the specific community where the post exists, THE system SHALL reject the comment creation request.

IF the user is not logged in, THE system SHALL reject the comment creation request and require login.

THE system SHALL allow any logged-in member to write comments on any post in any community.

GUEST users SHALL NOT be able to create comments on any posts.

### Reply Nesting and Hierarchy

WHEN a user writes a reply to a comment, THE system SHALL allow unlimited nested reply levels with no depth restrictions.

WHEN a user writes a reply to a comment, THE system SHALL structure the reply as a child of the parent comment.

IF a user writes a reply to a reply, THE system SHALL maintain the hierarchical relationship in the display.

THE system SHALL support any user replying to any existing comment, including replies that are themselves replies.

THE system SHALL allow replies to be written in any order regardless of the reply depth.

THE system SHALL support thread continuity where users can continue replying to discussions even after some comments are deleted.

### Comment Ownership and Editing

WHEN a user edits their own comment, THE system SHALL allow the edit only if the user is the original comment author.

IF the user attempting to edit a comment is not the comment author, THE system SHALL reject the edit request.

IF the user attempting to edit a comment is not logged in, THE system SHALL reject the edit request.

WHEN a user deletes their own comment, THE system SHALL allow the deletion only if the user is the original comment author.

IF the user attempting to delete a comment is not the comment author, THE system SHALL reject the deletion request.

MODERATORS SHALL NOT be able to edit other users' comments.

### Comment Deletion and Preservation

WHEN a comment is deleted by its author, THE system SHALL remove the comment from all post views permanently.

WHEN a comment is deleted by a moderator, THE system SHALL remove the comment from all post views permanently.

IF a comment is deleted, THE system SHALL NOT allow any restoration of the deleted comment.

WHEN a comment is deleted, THE system SHALL remove the comment from all reply threads.

WHEN a comment is deleted, THE system SHALL allow other users to continue replying to parent comments in the thread.

THE system SHALL NOT preserve deleted comments in any viewable form.

### Comment Display Requirements

WHEN viewing a comment in any context, THE system SHALL display the comment author's username.

WHEN viewing a comment in any context, THE system SHALL display the full comment content.

WHEN viewing a comment in any context, THE system SHALL display the comment vote score.

WHEN viewing a comment in any context, THE system SHALL display the time since the comment was posted.

WHEN viewing a comment in any context, THE system SHALL display any nested replies in a hierarchical structure.

THE system SHALL display nested replies indented or visually distinguished from parent comments.

### Comment Voting System

WHEN a user votes on a comment, THE system SHALL allow the user to cast an upvote or downvote.

WHEN a user casts a vote on a comment, THE system SHALL allow only one vote per user per comment.

IF a user has already voted on a comment, THE system SHALL allow the user to change their vote from upvote to downvote or vice versa.

IF a user has already voted on a comment, THE system SHALL allow the user to remove their vote entirely.

WHEN a vote is cast on a comment, THE system SHALL update the comment vote score accordingly.

THE system SHALL calculate comment vote score as total upvotes minus total downvotes.

WHEN a comment is deleted, THE system SHALL remove all votes associated with that comment from view.

## Community Rules

Any registered user can create a new community by providing a unique name and description. The community creator automatically becomes the owner with full administrative privileges. Each community displays its subscriber count and icon image to all visitors. Users must subscribe to a community before they can create posts in that community. Subscribers receive visibility into new posts from that community in their home feed. The community owner can add moderators to help manage the community. Community names must be unique across the entire platform to avoid confusion. Banned users cannot create posts or comments but retain read-only access to community content. Moderators can manage posts, comments, and user access within their designated community. Unsubscribing from a community stops receiving posts in the home feed but does not remove existing content.

### Community Creation Requirements

WHEN a registered user creates a community, THE system SHALL:
1. Require a unique community name
2. Require a community description
3. Accept an optional community icon image
4. Assign the creator as the community owner
5. Initialize the subscriber count to zero

IF the community name already exists, THE system SHALL reject the creation request.
IF the community name is provided but the description is missing, THE system SHALL reject the request.

THE system SHALL enforce that each community name is unique across the entire platform.

WHEN a community is successfully created, THE system SHALL display the new community in the browse communities list.

### Community Owner Privileges

WHEN a user creates a community, THE system SHALL automatically assign them the owner role.

THE owner SHALL have the following privileges:
- Add moderators to the community
- Remove moderators from the community
- Delete any post in the community
- Delete any comment in the community
- Ban users from the community
- Unban users from the community
- View the list of banned users

IF the community owner wishes to remove themselves from the owner role, THE system SHALL require them to transfer ownership to another moderator first.

THE system SHALL reject any attempt by a non-owner to remove moderators or transfer ownership.

### Community Information Display

WHEN a community page is viewed, THE system SHALL display:
1. The community name
2. The community description
3. The community icon image
4. The current subscriber count

THE system SHALL display the subscriber count to all visitors, including guests.

IF a community icon has not been uploaded, THE system SHALL display a default community icon.

WHEN viewing a community, THE system SHALL show all posts from that community sorted by the selected feed sorting option (hot, new, top, or controversial).

THE subscriber count SHALL be updated in real-time when users subscribe or unsubscribe from the community.

### Subscription Prerequisites

WHEN a user attempts to create a post in a community, THE system SHALL first verify that the user is subscribed to that community.

IF the user is not subscribed to the community, THE system SHALL reject the post creation request and display a subscription requirement message.

WHEN a user subscribes to a community, THE system SHALL increment the community's subscriber count by one.

WHEN a user unsubscribes from a community, THE system SHALL decrement the subscriber count by one.

WHEN a user is banned from a community, THE system SHALL automatically remove their subscription to that community.

THE system SHALL allow users to view communities without being subscribed.

THE system SHALL allow guests to browse all communities without subscription.

### Moderator Hierarchy Rules

THE community owner SHALL have the highest authority in the community.

WHEN the owner adds a moderator, THE system SHALL grant that user moderator privileges.

WHEN a moderator is added to a community, THEY SHALL be able to:
- Add other moderators to the community
- Delete posts in the community
- Delete comments in the community
- Ban users from the community
- Unban users from the community
- View the list of banned users

THE system SHALL prevent moderators from:
- Removing the community owner
- Removing other moderators from the community

IF a moderator attempts to remove the owner, THE system SHALL reject the request.

IF a moderator attempts to remove another moderator, THE system SHALL reject the request.

WHEN a moderator is removed by the owner, THE system SHALL revoke all moderator privileges from that user.

### Banned User Restrictions

WHEN a user is banned from a community, THE system SHALL prevent them from:
1. Creating new posts in that community
2. Creating new comments on posts in that community

THE system SHALL allow banned users to:
- View posts from the community
- View comments on posts in the community
- View community information and subscriber count

WHEN a banned user attempts to create a post or comment in a banned community, THE system SHALL reject the action.

THE system SHALL display a message indicating the user has been banned from the community when they attempt prohibited actions.

WHEN a banned user is unbanned by the owner or a moderator, THE system SHALL restore their ability to create posts and comments in that community.

THE system SHALL automatically add the owner of a community to the banned users list of other communities if they ban themselves from those communities.

### Community Management Permissions

THE system SHALL distinguish between owner and moderator permissions when managing communities.

OWNER privileges:
- Add moderators
- Remove moderators
- Transfer ownership to another moderator
- Delete any post
- Delete any comment
- Ban users
- Unban users
- View banned users

MODERATOR privileges:
- Add other moderators
- Delete any post
- Delete any comment
- Ban users
- Unban users
- View banned users

WHEN a moderator adds another moderator, THE new moderator SHALL have the same privileges as the adding moderator.

WHEN a user is banned from a community, THE system SHALL track the ban date and the user who issued the ban.

THE system SHALL maintain a permanent record of all moderator actions including adds, removals, bans, and unbans for audit purposes.

## Vote Rules

Users can upvote or downvote any post or comment in the system. Each user can only cast one vote per post or comment at any given time. Users can change their vote from upvote to downvote or vice versa at any time. Removing a vote entirely cancels the vote's effect on the score calculation. Vote scores equal the total number of upvotes minus the total number of downvotes. Karma points accumulate based on all votes received on a user's posts and comments. Karma can be negative if a user receives more downvotes than upvotes. When a vote is removed, the affected content's score adjusts accordingly. Vote changes and removals are immediate and reflect in real-time score updates. Users can vote on any content regardless of their subscription status.

### Vote Casting Permissions

WHEN a user casts a vote on a post, THE system SHALL require the user to be authenticated (logged in).

WHEN a user casts a vote on a comment, THE system SHALL require the user to be authenticated (logged in).

THE system SHALL reject the request when the user attempts to vote on content without being authenticated.

GUESTS cannot cast votes on posts or comments.

MEMBERS can cast votes on any post or comment in the system.

Admins can cast votes on any post or comment in the system.

IF a vote is cast by an unauthenticated user, THE system SHALL reject the request and display an authentication required message.

WHEN a vote is successfully cast, THE system SHALL record the vote type (upvote or downvote) and associate it with the user and the voted content.

THE system SHALL allow users to vote on content from any community regardless of subscription status.

THE system SHALL allow users to vote on content created by other users including the content creator themselves.

### Single Vote Restriction

WHEN a user attempts to vote on a post, THE system SHALL check if the user has already cast a vote on that post.

WHEN a user attempts to vote on a comment, THE system SHALL check if the user has already cast a vote on that comment.

IF a user has already voted on the target post or comment, THE system SHALL reject the new vote attempt and require the user to change their existing vote instead.

THE system SHALL allow exactly one vote per user per post at any given time.

THE system SHALL allow exactly one vote per user per comment at any given time.

IF a user attempts to cast a second vote on the same post or comment without first removing their existing vote, THE system SHALL reject the request.

THE system SHALL maintain a record of each user's existing vote to enforce the single vote restriction.

THE system SHALL prevent a user from simultaneously having multiple vote records for the same piece of content.

IF the system detects a duplicate vote attempt, THE system SHALL reject the request and indicate that a vote already exists.

### Vote Change Flexibility

WHEN a user wants to change their vote on a post, THE system SHALL allow switching from upvote to downvote.

WHEN a user wants to change their vote on a post, THE system SHALL allow switching from downvote to upvote.

WHEN a user wants to change their vote on a comment, THE system SHALL allow switching from upvote to downvote.

WHEN a user wants to change their vote on a comment, THE system SHALL allow switching from downvote to upvote.

WHEN a user changes their vote, THE system SHALL immediately recalculate the content score.

THE system SHALL allow vote changes at any time after the original vote is cast.

WHEN a vote is changed from upvote to downvote, THE system SHALL decrease the content score by 2.

WHEN a vote is changed from downvote to upvote, THE system SHALL increase the content score by 2.

THE system SHALL update the user's vote record to reflect the new vote type.

THE system SHALL maintain an audit trail of vote changes for moderator review purposes.

### Vote Removal Rules

WHEN a user removes their vote from a post, THE system SHALL cancel the effect of that vote on the score calculation.

WHEN a user removes their vote from a comment, THE system SHALL cancel the effect of that vote on the score calculation.

THE system SHALL allow a user to remove their vote at any time after casting it.

WHEN a vote is removed, THE system SHALL immediately adjust the content score accordingly.

IF a user removes an upvote, THE system SHALL decrease the content score by 1.

IF a user removes a downvote, THE system SHALL increase the content score by 1.

THE system SHALL update the user's vote record to indicate the vote no longer exists.

WHEN a vote is removed, THE system SHALL also update the content creator's karma score accordingly.

THE system SHALL allow vote removal through a dedicated removal action or by toggling the vote state.

IF the system detects a vote removal attempt for a non-existent vote, THE system SHALL silently ignore the request.

### Score Calculation Formula

THE system SHALL calculate the vote score of a post as the total number of upvotes minus the total number of downvotes.

THE system SHALL calculate the vote score of a comment as the total number of upvotes minus the total number of downvotes.

THE system SHALL update the score in real-time when votes are added, changed, or removed.

THE system SHALL store the vote score as a calculated value, not a static field.

WHEN a new upvote is cast, THE system SHALL add 1 to the current vote score.

WHEN a new downvote is cast, THE system SHALL subtract 1 from the current vote score.

THE system SHALL display the vote score prominently on each post and comment.

THE system SHALL ensure the score accurately reflects all active votes at any point in time.

IF the system detects a discrepancy between the stored score and calculated value, THE system SHALL recalculate the score from all votes.

THE system SHALL use integer arithmetic for all score calculations to ensure precision.

### Karma Accumulation Logic

WHEN a user's post receives an upvote, THE system SHALL increase that user's karma score by 1.

WHEN a user's post receives a downvote, THE system SHALL decrease that user's karma score by 1.

WHEN a user's comment receives an upvote, THE system SHALL increase that user's karma score by 1.

WHEN a user's comment receives a downvote, THE system SHALL decrease that user's karma score by 1.

THE system SHALL maintain a single karma score for each user.

WHEN a user removes their vote on content, THE system SHALL adjust the content creator's karma score accordingly.

IF a user's karma score reaches zero, THE system SHALL allow it to continue changing with subsequent votes.

THE system SHALL update karma scores in real-time as votes are added or removed.

WHEN a user deletes their post or comment, THE system SHALL retain the karma points that were accumulated from votes on that content.

THE system SHALL display the total karma score prominently on each user's profile page.

### Negative Score Allowance

THE system SHALL allow vote scores to become negative when a piece of content receives more downvotes than upvotes.

THE system SHALL allow karma scores to become negative when a user receives more downvotes than upvotes.

THE system SHALL NOT restrict or cap negative scores at any level.

IF a post's or comment's score drops to negative, THE system SHALL continue to display the negative value.

IF a user's karma score drops to negative, THE system SHALL continue to allow voting activities for that user.

THE system SHALL display negative scores with a minus sign prefix (e.g., "-5").

WHEN calculating scores, THE system SHALL allow the result to be negative without any validation errors.

THE system SHALL NOT prevent users from interacting with content that has negative scores.

WHEN sorting by score, THE system SHALL treat negative scores correctly in ascending or descending order.

THE system SHALL maintain negative karma scores as valid and persistent user attributes.

### Vote Independence

THE system SHALL allow users to vote on content regardless of their subscription status to the community.

THE system SHALL allow users to vote on content from communities they have never subscribed to.

THE system SHALL allow users to vote on content from communities they have unsubscribed from.

THE system SHALL NOT require community subscription to cast votes.

THE system SHALL NOT restrict voting based on the poster's relationship to the voter.

THE system SHALL allow users to vote on content created by any user in the system.

WHEN a user subscribes or unsubscribes from a community, THE system SHALL NOT invalidate or remove existing votes.

THE system SHALL maintain vote records independently of community subscription status.

IF a user's access to view content changes, THE system SHALL NOT automatically revoke their existing votes.

THE system SHALL treat voting as a separate permission set from content viewing and commenting permissions.

### Real-time Score Updates

WHEN a vote is cast, changed, or removed, THE system SHALL update the score immediately without delay.

THE system SHALL display the updated score on the content within the current page view.

WHEN a user views a post or comment with existing votes, THE system SHALL display the current real-time score.

THE system SHALL update karma scores in real-time as votes are added or removed.

WHEN a score is updated, THE system SHALL refresh the displayed vote count and score value without requiring page reload.

THE system SHALL provide visual feedback to users when their vote successfully updates the score.

WHEN multiple users cast votes simultaneously, THE system SHALL process each vote and update scores in real-time.

THE system SHALL ensure score calculations reflect the most recent state at all times.

IF a real-time update fails temporarily, THE system SHALL retry the update and maintain score consistency.

THE system SHALL NOT cache vote scores in a way that prevents real-time updates.

### Universal Voting Access

THE system SHALL allow all authenticated users to vote on posts and comments.

THE system SHALL allow all users with valid accounts to participate in voting activities.

THE system SHALL NOT restrict voting based on account age or karma level.

THE system SHALL NOT require a minimum karma score to cast votes.

THE system SHALL NOT impose karma penalties that prevent users from voting.

WHEN a user is banned from a community, THE system SHALL still allow them to vote on content in other communities.

THE system SHALL allow banned users to vote on content in communities they are not banned from.

THE system SHALL NOT prevent users from voting based on their report history.

THE system SHALL ensure voting permissions are applied consistently across all user types.

THE system SHALL maintain universal voting access except for explicit administrative restrictions.

## Report Rules

Users can report any post or comment that violates community standards. Each report requires the reporter to provide a text reason explaining why the content is being reported. Moderators in a community can view all reports submitted for content within that community. Every report displays the reported content, the reporter's username, and the provided reason. Moderators can approve a report to delete the reported content or dismiss it to keep the content. Dismissed reports are removed from the moderator's report list and are no longer visible. Approved reports result in immediate deletion of the reported content from all views. Banned users can still submit reports but moderators may handle them differently. Reports are private and not visible to other users or the reported content author. Report status transitions from pending to resolved or dismissed based on moderator action.

### Report Submission Requirements

WHEN a user submits a report on a post or comment, THE system SHALL: 1. Require the reporter to provide a text reason explaining the reporting justification, 2. Associate the report with the reported content (post or comment), 3. Associate the report with the reporting user, 4. Set the initial status of the report as pending, 5. Associate the report with the community where the reported content exists. IF the reporter provides no reason text, THE system SHALL reject the report submission. IF the reported content does not belong to a community, THE system SHALL reject the report submission. IF the reported content has already been deleted, THE system SHALL reject the report submission. IF the reported content is not within a community where the reporter has access, THE system SHALL reject the report submission.

### Reason Text Mandatory Rule

THE reporter SHALL provide a text reason when submitting a report. THE reason text SHALL be visible to moderators in the relevant community. THE reason text SHALL be required field for report submission. IF the reason text is empty or contains only whitespace, THE system SHALL reject the report submission. THE system SHALL preserve the exact text submitted by the reporter. THE system SHALL not modify or truncate the reason text automatically. THE system SHALL display the reason text to moderators in the report management interface.

### Report Visibility and Privacy Rules

THE report SHALL be private and not visible to other users. THE report SHALL be visible only to moderators of the community where the reported content exists. THE reported content author SHALL not be able to view who reported their content. THE reporter SHALL not be able to modify or withdraw their report after submission. THE system SHALL not display reports in public feeds, comment sections, or user profiles. THE system SHALL not share report information with non-moderator users under any circumstance. IF a user is not a moderator of the relevant community, THE system SHALL not display any reports associated with that community. DISMISSED reports SHALL be removed from the moderator's report list entirely and not be visible anywhere.

### Moderator Report Access and Authority

WHEN a moderator accesses the report management interface for their community, THE system SHALL display all pending reports for that community. THE system SHALL show each report with: the reported content, the reporter's username, and the provided reason. THE system SHALL show the reported content type (post or comment). THE system SHALL allow moderators to approve or dismiss each pending report. ONLY moderators of the relevant community SHALL be able to view and act on reports. IF a user attempts to access reports for a community where they are not a moderator, THE system SHALL deny access. IF a moderator leaves their community or is removed, THE system SHALL revoke their report management access. THE system SHALL display reports in chronological order with the newest pending reports appearing first.

### Report Status and Action Workflow

ALL reports SHALL start with a pending status upon submission. WHILE a report has pending status, THE system SHALL prevent non-moderator users from viewing the report. WHEN a moderator approves a report, THE system SHALL: 1. Change the report status to resolved, 2. Delete the reported content immediately, 3. Remove the report from the moderator's pending list. WHEN a moderator dismisses a report, THE system SHALL: 1. Change the report status to dismissed, 2. Keep the reported content visible, 3. Remove the report from the moderator's pending list. IF the reported content is no longer accessible when a moderator attempts to approve a report, THE system SHALL still mark the report as resolved. BANNED users SHALL still be able to submit reports. MODERATORS SHALL be able to handle reports from banned users the same as reports from other users.

# Detailed Validation Rules

Detailed validation rules with boundary values and format requirements.

## User Validation Rules

Users must provide a valid email address during registration, which must follow standard email formatting rules. Email addresses are checked for uniqueness across all active accounts before account creation. Username choices must be unique and are not available if already taken by another user or previously deleted accounts. Passwords must meet minimum security requirements including a minimum length and complexity standards. Users can update their display name, which can be changed multiple times throughout their account lifetime. The bio field accepts free-form text that users can edit at any time. Avatar images must be valid image files and can be replaced or updated by users. Account deletion removes all user content including posts and comments permanently. Users must be logged in to modify their own profile information. Failed validation attempts display clear messages about what needs to be corrected.

### Email Format Validation

WHEN a user creates an account, THE system SHALL validate that the email address follows standard email formatting rules with a local part, @ symbol, and domain.

WHEN a user creates an account, THE system SHALL check that the email address is unique across all active accounts.

WHEN a user creates an account, THE system SHALL reject the request if the email address format is invalid.

WHEN a user creates an account, THE system SHALL reject the request if the email address is already registered to an active account.

IF the user attempts to change their email address, THE system SHALL validate the new email follows standard formatting rules.

IF the user attempts to change their email address, THE system SHALL reject the request if the new email is already registered to another active account.

WHEN a user changes their email address, THE system SHALL send a verification email to the new address.

WHEN a user verifies their email address, THE system SHALL update their account with the verified email.

IF the user does not verify their email within 7 days, THE system SHALL send reminder emails.

IF the user does not verify their email within 30 days, THE system SHALL mark the account as pending verification.

### Username Uniqueness Rules

WHEN a user creates an account, THE system SHALL validate that the username is unique across all active accounts.

WHEN a user creates an account, THE system SHALL validate that the username is unique across all deleted accounts.

WHEN a user creates an account, THE system SHALL reject the request if the username is already taken.

WHEN a user changes their username, THE system SHALL validate that the new username is unique.

WHEN a user changes their username, THE system SHALL reject the request if the new username is already taken.

WHEN a user changes their username, THE system SHALL ensure the username follows acceptable character restrictions.

IF the username contains reserved words or inappropriate content, THE system SHALL reject the request.

WHEN a user's account is deleted, THE system SHALL mark the username as unavailable for new registrations for a retention period.

WHEN a user reactivates a deleted account, THE system SHALL restore the original username.

IF the username change request violates platform policies, THE system SHALL reject the request.

### Password Complexity Requirements

WHEN a user creates an account, THE system SHALL validate that the password meets minimum security requirements.

WHEN a user creates an account, THE system SHALL require the password to have a minimum length of 8 characters.

WHEN a user changes their password, THE system SHALL validate that the new password meets complexity requirements.

WHEN a user changes their password, THE system SHALL require the new password to be different from previous passwords.

WHEN a user changes their password, THE system SHALL reject the request if the new password does not meet minimum requirements.

IF the password contains common or weak patterns, THE system SHALL reject the request.

WHEN a user resets their password, THE system SHALL enforce the same complexity requirements as account creation.

WHEN a user changes their password, THE system SHALL ensure they are authenticated before allowing the change.

IF the password change request fails validation, THE system SHALL display clear error messages explaining the requirements.

WHEN a user provides an incorrect old password during a password change, THE system SHALL reject the request.

### Display Name Update Rules

WHEN a user updates their display name, THE system SHALL allow the user to change it multiple times throughout their account lifetime.

WHEN a user updates their display name, THE system SHALL validate that the display name follows acceptable character restrictions.

WHEN a user updates their display name, THE system SHALL reject the request if the display name exceeds the maximum length limit.

WHEN a user updates their display name, THE system SHALL ensure the display name does not contain inappropriate or offensive content.

IF the user attempts to update their display name without being logged in, THE system SHALL reject the request.

WHEN a user updates their display name, THE system SHALL update the display name across all their associated content.

WHEN a user views another user's profile, THE system SHALL display the current display name.

WHEN a user creates a post, THE system SHALL use their current display name as the author name.

IF the display name update request is invalid, THE system SHALL reject the request and display an appropriate error message.

### Bio Text Editing Rules

WHEN a user edits their bio, THE system SHALL allow free-form text input.

WHEN a user edits their bio, THE system SHALL reject the request if the bio text exceeds the maximum length limit.

WHEN a user edits their bio, THE system SHALL allow the user to clear their bio text entirely.

WHEN a user edits their bio, THE system SHALL ensure the user is authenticated before allowing the edit.

WHEN a user edits their bio, THE system SHALL save the updated bio text to their profile.

WHEN a user views another user's profile, THE system SHALL display the current bio text.

IF the user attempts to edit their bio without being logged in, THE system SHALL reject the request.

WHEN a user creates a profile for the first time, THE system SHALL allow them to provide an optional bio text.

IF the bio text contains inappropriate content, THE system SHALL reject the request.

WHEN a user's bio is updated, THE system SHALL reflect the change immediately across the platform.

### Avatar Image Upload Rules

WHEN a user uploads an avatar image, THE system SHALL validate that the file is a valid image format.

WHEN a user uploads an avatar image, THE system SHALL reject the request if the file size exceeds the maximum limit.

WHEN a user uploads an avatar image, THE system SHALL allow users to update or replace their avatar image.

WHEN a user uploads an avatar image, THE system SHALL ensure the user is authenticated before allowing the upload.

WHEN a user uploads an avatar image, THE system SHALL store the image URL for display on their profile.

WHEN a user uploads an avatar image, THE system SHALL reject the request if the image does not meet quality standards.

IF the user attempts to upload an avatar without being logged in, THE system SHALL reject the request.

WHEN a user's avatar is updated, THE system SHALL reflect the change immediately across the platform.

IF the avatar image upload fails validation, THE system SHALL display clear error messages about the issue.

WHEN a user deletes their avatar, THE system SHALL remove the image from their profile and display a default avatar.

### Account Deletion Rules

WHEN a user requests account deletion, THE system SHALL delete all posts created by the user permanently.

WHEN a user requests account deletion, THE system SHALL delete all comments written by the user permanently.

WHEN a user requests account deletion, THE system SHALL remove the user's account data from active systems.

WHEN a user requests account deletion, THE system SHALL require the user to be authenticated before proceeding.

WHEN a user requests account deletion, THE system SHALL display a warning message confirming the permanent nature of deletion.

IF the user attempts to delete their account without being logged in, THE system SHALL reject the request.

WHEN a user confirms account deletion, THE system SHALL irreversibly remove their username from availability.

WHEN a user's account is deleted, THE system SHALL remove their avatar from the platform.

IF the account deletion fails for any reason, THE system SHALL not partially delete the user's data.

WHEN account deletion is requested, THE system SHALL process the deletion within a reasonable timeframe.

### Profile Modification Authentication Rules

WHEN a user attempts to modify their own profile, THE system SHALL require the user to be logged in.

WHEN a user attempts to modify their own profile, THE system SHALL validate that the user owns the profile being modified.

WHEN a user attempts to modify their own profile, THE system SHALL reject the request if the user is not authenticated.

WHEN a user attempts to view another user's profile, THE system SHALL allow access regardless of authentication status.

WHEN a user attempts to modify their own profile, THE system SHALL ensure they have the correct credentials.

IF the user attempts to modify another user's profile, THE system SHALL reject the request.

WHEN a user's session expires during a profile modification attempt, THE system SHALL require re-authentication.

WHEN a user modifies their profile, THE system SHALL record the modification timestamp for audit purposes.

IF authentication validation fails, THE system SHALL display an error message requiring login.

### Validation Error Messaging Rules

WHEN a validation error occurs, THE system SHALL display clear and specific error messages to the user.

WHEN a validation error occurs, THE system SHALL indicate which field caused the error.

WHEN a validation error occurs, THE system SHALL provide guidance on how to correct the issue.

WHEN a validation error occurs, THE system SHALL prevent the request from being processed.

WHEN multiple validation errors occur, THE system SHALL display all errors to the user.

WHEN a validation error occurs for email format, THE system SHALL specify the required format.

WHEN a validation error occurs for password complexity, THE system SHALL list the specific requirements that are not met.

WHEN a validation error occurs for username uniqueness, THE system SHALL indicate that the username is already taken.

WHEN a validation error occurs, THE system SHALL use user-friendly language instead of technical error codes.

IF the validation error cannot be automatically resolved, THE system SHALL provide contact information for support assistance.

## Post Validation Rules

Post titles are required fields and cannot be empty when creating a new post. Posts must belong to one of three types: text post, link post, or image post. Text posts require valid text content that users can write and edit. Link posts must include a valid URL that points to web content. Image posts require an image file to be uploaded and displayed. Users can only edit or delete their own posts, not posts created by others. Posts can only be created in communities where the user has subscribed. The community name must be valid and the user must be subscribed to post there. Post content can be modified after initial creation as long as the author remains the same. Posts submitted for editing display the current version before changes are applied.

### Title Requirement Validation

WHEN a user creates a post, THE system SHALL require a title field.

WHEN a post is being created, THE system SHALL reject the request if the title is empty or contains only whitespace.

WHEN a post is being edited, THE system SHALL allow the title to remain unchanged or be updated to a new valid value.

IF the title field is missing from the creation request, THE system SHALL reject the request with an error.

THE system SHALL validate that the post title is provided before any other post attributes are processed.

IF a user attempts to create a post without providing a title, THE system SHALL display an error message indicating that the title is required.

WHEN displaying a post, THE system SHALL show the title to all users who have permission to view the post.

IF a user attempts to delete a post, THE system SHALL still require the title to be present in the system (it cannot be null).

THE system SHALL maintain the original title text exactly as submitted, without modification or truncation.

IF a post title is modified by the author, THE system SHALL update the title and retain the original value until the save operation completes successfully.

### Post Type Selection Rules

WHEN a user creates a post, THE system SHALL require the user to select one of three types: text, link, or image.

IF a user attempts to create a post without specifying a type, THE system SHALL reject the request with an error.

WHEN a post is created, THE system SHALL validate that the type matches one of the three allowed values: text, link, or image.

THE system SHALL allow the user to change the post type only when creating a new post, not after the post has been published.

WHEN creating a link post, THE system SHALL ensure that the post type is set to 'link' before any other validations occur.

WHEN creating an image post, THE system SHALL ensure that the post type is set to 'image' before any other validations occur.

IF a user attempts to create a post with an invalid type value, THE system SHALL reject the request and display an error.

THE system SHALL display the post type in the post feed list to help users identify content type quickly.

WHEN a post is being edited, THE system SHALL prevent the user from changing the post type from one category to another.

IF a user attempts to change a post's type from text to link or vice versa, THE system SHALL reject the request.

### Text Content Validation

WHEN a user creates a text post, THE system SHALL require valid text content.

IF a text post is created without any content, THE system SHALL reject the request with an error.

WHEN a user creates a text post, THE system SHALL allow the content to contain any valid text characters.

WHEN editing a text post, THE system SHALL allow the user to update the content with new text.

IF a text post content is empty after editing, THE system SHALL reject the save operation.

WHEN displaying a text post, THE system SHALL show the full content to users who can view the post.

IN the post feed list, THE system SHALL display the first 200 characters of text post content as a preview.

IF a user attempts to submit text content that exceeds system limits, THE system SHALL reject the request.

THE system SHALL preserve all text formatting and special characters in the content exactly as submitted.

WHEN a text post is deleted, THE system SHALL remove the content from display immediately.

IF a text post is modified by a non-author user, THE system SHALL reject the modification attempt.

### URL Validation for Link Posts

WHEN a user creates a link post, THE system SHALL require a valid URL.

IF the URL field is missing or empty when creating a link post, THE system SHALL reject the request.

WHEN a link post is created, THE system SHALL validate that the URL follows standard URL formatting.

IF the URL provided is malformed or invalid, THE system SHALL reject the link post creation.

WHEN a user submits a URL, THE system SHALL extract and display the domain name in the post feed list.

IF the extracted domain name is empty or invalid, THE system SHALL reject the link post.

WHEN a link post is displayed, THE system SHALL show the domain name to users browsing feeds.

THE system SHALL allow the author to update the URL in an existing link post.

IF a user attempts to change a link post URL to an invalid URL, THE system SHALL reject the update.

WHEN a link post is deleted, THE system SHALL remove the URL from the display.

IF a user attempts to delete the URL field entirely from a link post, THE system SHALL reject the operation.

### Image Upload Requirements

WHEN a user creates an image post, THE system SHALL require an image file to be uploaded.

IF no image file is provided when creating an image post, THE system SHALL reject the request.

WHEN an image is uploaded, THE system SHALL validate that the file is a valid image format.

IF the uploaded file is not a valid image, THE system SHALL reject the upload.

WHEN an image post is displayed, THE system SHALL show the uploaded image to users who can view the post.

WHEN displaying image posts in feeds, THE system SHALL show a thumbnail of the image.

IF the image upload fails or the file is corrupted, THE system SHALL reject the creation.

THE system SHALL allow the author to replace the image in an existing image post.

IF a user attempts to upload an image that exceeds size limits, THE system SHALL reject the upload.

WHEN an image post is deleted, THE system SHALL remove the image from the display.

IF a user attempts to create an image post without uploading a valid image file, THE system SHALL reject the request.

### Author Ownership Rules

WHEN a post is created, THE system SHALL record the creating user as the post author.

IF a user is not the author of a post, THE system SHALL prevent them from editing the post.

IF a user is not the author of a post, THE system SHALL prevent them from deleting the post.

WHEN a user attempts to edit a post they did not create, THE system SHALL reject the request with an error.

WHEN a user attempts to delete a post they did not create, THE system SHALL reject the request with an error.

THE system SHALL display the author username on each post for all viewers.

IF the author account is deleted, THE system SHALL still preserve the post with the original author name.

WHEN a user is banned from a community, THE system SHALL still allow them to view posts authored by others in that community.

IF a moderator attempts to edit or delete a post they did not create, THE system SHALL allow it (moderator override).

WHEN displaying post author information, THE system SHALL link to the author's profile page.

### Community Subscription Requirement

WHEN a user attempts to create a post, THE system SHALL verify the user is subscribed to the target community.

IF the user is not subscribed to the community, THE system SHALL reject the post creation request.

WHEN a subscribed user creates a post, THE system SHALL associate the post with the community.

IF a user unsubscribes from a community, THE system SHALL still allow their previously created posts to remain in the community.

WHEN a new user wants to create a post, THE system SHALL require them to subscribe to the community first.

IF the community does not exist, THE system SHALL reject the post creation request.

WHEN viewing a community feed, THE system SHALL show all posts from that community to all users.

IF a community is deleted, THE system SHALL move its posts to a restricted view or archive them.

THE system SHALL require subscription as a prerequisite before allowing post creation in any community.

IF a user attempts to post in a community without subscription, THE system SHALL display a message prompting them to subscribe first.

### Post Editing Permissions

WHEN an author edits their own post, THE system SHALL allow the update to be saved.

IF a non-author user attempts to edit a post, THE system SHALL reject the request.

WHEN a post is being edited, THE system SHALL show the current version before changes are applied.

IF the author account is deleted, THE system SHALL prevent further edits to their posts.

WHEN editing a post, THE system SHALL allow updates to the content, title, and image/URL fields as appropriate.

IF a moderator edits a post they did not create, THE system SHALL allow the modification.

WHEN a post edit is saved, THE system SHALL update the modified timestamp.

IF the edit operation fails due to system error, THE system SHALL roll back the changes and display an error.

WHEN a user attempts to edit a post that has been deleted, THE system SHALL reject the request.

IF a post is being edited while another user views it, THE system SHALL show the updated content to refresh viewers.

WHEN displaying edit permissions, THE system SHALL indicate whether the current user can edit the post.

### Post Deletion Permissions

WHEN an author deletes their own post, THE system SHALL remove the post from all feeds.

IF a non-author user attempts to delete a post, THE system SHALL reject the request.

WHEN a post is deleted, THE system SHALL remove it from comment lists as well.

IF a moderator deletes a post they did not create, THE system SHALL allow the deletion.

WHEN a user deletes a post, THE system SHALL remove the post title and content from view.

IF the author account is deleted, THE system SHALL preserve the posts but mark them as belonging to a deleted user.

WHEN a post deletion fails due to concurrent modifications, THE system SHALL display an error and preserve the post.

IF a user attempts to delete a post they no longer have access to, THE system SHALL reject the request.

WHEN a post is deleted, THE system SHALL decrement the community's total post count.

IF a post deletion is successful, THE system SHALL update the comment count displayed on parent posts.

WHEN a user deletes their own post, THE system SHALL remove their karma contributions from that post.

### Content Modification Workflow

WHEN a user initiates a content modification, THE system SHALL display the current version for review.

IF the user confirms the changes, THE system SHALL apply the modifications and save them.

WHEN the user cancels the modification, THE system SHALL discard all changes and show the original content.

IF a content modification is in progress and the user navigates away, THE system SHALL prompt to save or discard changes.

WHEN a post is modified, THE system SHALL update the modification timestamp.

IF multiple users attempt to modify the same post simultaneously, THE system SHALL reject one of the modifications.

WHEN a post content is modified, THE system SHALL notify subscribers who follow the community.

IF a content modification includes removed content, THE system SHALL preserve the removed text in an edit history log.

WHEN a user views a modified post, THE system SHALL show indicators that the post has been edited.

IF a content modification fails validation, THE system SHALL display the specific validation errors and prevent save.

WHEN a content modification is completed, THE system SHALL update the display across all views where the post appears.

## Comment Validation Rules

Comment content must be provided and cannot be empty when writing a new comment. Users can write comments on any post regardless of their subscription status to that community. Comments can be nested with replies that have no depth limit for conversation threads. Users can only edit comments they authored themselves. Users can delete their own comments at any time after posting. Edited comments retain their original posting timestamp for visibility. Comments appear in sorted order based on user-selected sorting methods. Comments display their own vote score separate from the parent post. Comment deletion removes all nested replies under that comment. Comment validation includes checking for content before submission.

### Comment Content Requirement

WHEN a user writes a comment, THE system SHALL require non-empty comment content.

IF comment content is empty or contains only whitespace, THE system SHALL reject the comment submission.

THE system SHALL preserve comment content exactly as submitted without modification.

THE system SHALL display comment content to all users with appropriate permissions to view the parent post.

IF a comment is edited, THE system SHALL retain the edited content for display purposes.

### Post Commenting Access

WHEN a user accesses a post, THE system SHALL allow any logged-in user to write a comment on that post.

GUEST users SHALL NOT be permitted to write comments on any post.

THE system SHALL verify user authentication status before allowing comment creation.

BANNED users SHALL NOT be permitted to write comments in their banned community.

THE system SHALL allow commenting on posts regardless of the commenter's subscription status to that community.

### Nested Reply Structure

WHEN a user writes a reply to a comment, THE system SHALL allow unlimited nesting depth.

THE system SHALL support replies to replies with no structural hierarchy limits.

WHEN displaying a comment, THE system SHALL show the full nested reply hierarchy.

THE system SHALL preserve the complete reply chain structure when rendering comments.

IF a parent reply is deleted, THE system SHALL cascade delete all nested replies under that comment.

### Comment Edit Permissions

WHEN a user attempts to edit a comment, THE system SHALL verify the user authored that comment.

ONLY the comment author SHALL be permitted to edit their own comment.

IF the user is not the comment author, THE system SHALL reject the edit request.

THE system SHALL allow edits at any time after the comment is posted.

WHEN editing a comment, THE system SHALL update the comment content with the new text.

### Comment Deletion Rules

WHEN a user deletes their own comment, THE system SHALL remove the comment from public display.

THE system SHALL cascade delete all nested replies when the parent comment is deleted.

MODERATORS SHALL be permitted to delete any comment in their community.

OWNER of a community SHALL be permitted to delete any comment in their community.

THE system SHALL preserve the original comment timestamp when a comment is deleted.

### Timestamp Preservation on Edit

WHEN a comment is edited, THE system SHALL retain the original posting timestamp.

THE system SHALL NOT update the timestamp to the current time on edit.

THE system SHALL display the original posting date and time to all viewers.

WHEN displaying an edited comment, THE system SHALL distinguish edited content from original.

THE system SHALL maintain timestamp accuracy for audit and sorting purposes.

### Sorting Methods for Comments

WHEN viewing comments on a post, THE system SHALL offer sorting by best score.

THE system SHALL offer sorting by newest first.

THE system SHALL offer sorting by controversial votes.

WHEN sorted by best, THE system SHALL display highest vote score comments first.

WHEN sorted by new, THE system SHALL display most recent comments first.

WHEN sorted by controversial, THE system SHALL display comments with many votes but score near zero first.

### Individual Comment Voting

WHEN a user votes on a comment, THE system SHALL allow upvote or downvote selection.

THE system SHALL permit only one vote per user per comment.

WHEN a user changes their vote, THE system SHALL adjust the comment score accordingly.

IF a user removes their vote, THE system SHALL recalculate the comment score.

THE system SHALL display individual comment vote scores separately from the parent post.

### Nested Reply Deletion

WHEN a parent comment is deleted, THE system SHALL automatically delete all nested replies.

THE system SHALL cascade deletion to all depths of the reply hierarchy.

WHEN deleting a reply, THE system SHALL preserve the integrity of the remaining comment structure.

THE system SHALL NOT leave orphaned nested replies after parent deletion.

MODERATORS SHALL be permitted to delete any nested reply in their community.

### Comment Submission Validation

WHEN submitting a comment, THE system SHALL validate that content is provided.

THE system SHALL reject submissions with empty or whitespace-only content.

WHEN a user submits a comment, THE system SHALL verify the user is logged in.

THE system SHALL validate that the parent post exists before accepting a comment.

IF validation fails, THE system SHALL provide clear error messaging to the user.

## Community Validation Rules

Community names must be unique across the entire platform to avoid confusion. Community descriptions can be written as text explaining the community purpose. Community icons are image files that users can upload when creating communities. Any registered user can create a new community without restrictions. The community creator becomes the owner with highest authority in that community. Communities display subscriber counts that update when users join or leave. Users must be subscribed to a community before creating posts within it. Community browsing lists all available communities for users to discover. Community search allows finding communities by name matching. Community details are publicly visible to both logged-in and logged-out users.

### Community Name Uniqueness

THE community name SHALL be unique across the entire platform to avoid confusion.

IF a user attempts to create a community with a name that already exists, THE system SHALL reject the request and notify the user that the name is unavailable.

WHEN a community is created, THE system SHALL validate that the name has not been registered by any other community.

### Community Description Text

WHEN a user creates a community, THE system SHALL require a description text explaining the community's purpose.

THE system SHALL allow the description to be updated by the owner at any time.

THE community description SHALL be displayed on the community's detail page to inform users about its purpose.

### Community Icon Upload

WHEN a user creates a community, THE system SHALL allow the user to upload an icon image for the community.

THE system SHALL display the community icon alongside the community name in all listings and feeds.

THE community icon SHALL be visible to all users browsing or searching for communities.

### Community Creation Permissions

ANY registered user SHALL have the permission to create a new community without restrictions.

WHEN a user creates a community, THE system SHALL automatically assign them as the owner.

THE system SHALL NOT require any approval or verification before allowing community creation.

### Owner Authority Definition

THE community owner SHALL have the highest authority in that community.

THE owner SHALL have the exclusive ability to add moderators to the community.

THE owner SHALL have the exclusive ability to remove moderators from the community.

MODERATORS SHALL NOT have the ability to remove the owner.

MODERATORS SHALL NOT have the ability to remove other moderators.

### Subscriber Count Tracking

THE system SHALL track the subscriber count for each community.

WHEN a user subscribes to a community, THE system SHALL increment the subscriber count.

WHEN a user unsubscribes from a community, THE system SHALL decrement the subscriber count.

THE subscriber count SHALL be displayed on the community's detail page to inform users of its popularity.

### Post Subscription Requirement

A user SHALL be subscribed to a community before creating a post within that community.

IF a user attempts to create a post in a community they are not subscribed to, THE system SHALL reject the request.

WHEN a user subscribes to a community, THE system SHALL enable them to create posts in that community.

### Community Browsing Display

THE system SHALL display a list of all communities available on the platform.

EACH community in the browse list SHALL show its name, description, icon, and subscriber count.

ALL users (including logged-out users) SHALL be able to browse all communities without restrictions.

### Community Search Functionality

WHEN a user searches for communities, THE system SHALL match community names against the search query.

THE search results SHALL display matching communities with their name, description, and subscriber count.

THE system SHALL support searching by partial name matches to help users find communities.

### Public Community Visibility

ALL community details SHALL be publicly visible to both logged-in and logged-out users.

WHEN a user views a community's detail page, THE system SHALL display the community name, description, icon, subscriber count, and recent posts.

THE system SHALL allow public viewing of community content without requiring authentication.

## Vote Validation Rules

Each user can cast exactly one vote per post at any given time. Users may cast a single vote on each comment they interact with. Voting choices are limited to upvote or downvote only. Users can change their existing vote from upvote to downvote or vice versa. Users have the option to remove their vote entirely after casting it. Vote scores calculate as the difference between total upvotes and total downvotes. Voting affects both the post score and the author's overall karma. Votes are only counted from authenticated users with valid accounts. Vote changes immediately update the displayed score for all viewers. Vote removal restores the previous score calculation immediately.

### Single Vote Per Post Rule

WHEN a user votes on a post, THE system SHALL limit the user to exactly one vote per post at any given time.

IF a user has already cast a vote on a post, THE system SHALL prevent the user from casting another vote unless the existing vote is first changed or removed.

IF a user attempts to cast a second vote on the same post without changing or removing the previous vote, THE system SHALL reject the request.

THE system SHALL track each user's vote status per post to enforce the single vote restriction.

### Single Vote Per Comment Rule

WHEN a user votes on a comment, THE system SHALL limit the user to exactly one vote per comment at any given time.

IF a user has already cast a vote on a comment, THE system SHALL prevent the user from casting another vote unless the existing vote is first changed or removed.

IF a user attempts to cast a second vote on the same comment without changing or removing the previous vote, THE system SHALL reject the request.

THE system SHALL track each user's vote status per comment to enforce the single vote restriction.

### Upvote and Downvote Options

WHEN a user votes on a post or comment, THE system SHALL provide two vote type options: upvote and downvote.

THE system SHALL accept only upvote or downvote as valid vote types.

IF a user attempts to cast a vote with any type other than upvote or downvote, THE system SHALL reject the request.

### Vote Changing Permissions

WHEN a user has already cast a vote on a post, THE system SHALL allow the user to change their vote from upvote to downvote or from downvote to upvote.

WHEN a user has already cast a vote on a comment, THE system SHALL allow the user to change their vote from upvote to downvote or from downvote to upvote.

IF a user changes their vote, THE system SHALL update the vote status immediately and recalculate the score.

THE system SHALL record the time when a vote is changed.

### Vote Removal Capability

WHEN a user has cast a vote on a post, THE system SHALL allow the user to remove their vote entirely.

WHEN a user has cast a vote on a comment, THE system SHALL allow the user to remove their vote entirely.

IF a user removes their vote, THE system SHALL restore the previous score calculation immediately.

A removed vote SHALL not be retrievable by the user and SHALL remain permanently removed from the system.

THE system SHALL allow vote removal at any time after the vote has been cast.

### Vote Score Calculation

THE system SHALL calculate vote score as the total number of upvotes minus the total number of downvotes for each post and comment.

THE system SHALL update the score immediately when a vote is cast, changed, or removed.

THE system SHALL ensure the displayed score reflects the current state of all votes in real time.

THE system SHALL ensure the score can be negative if downvotes exceed upvotes.

### Karma Impact from Voting

WHEN a user receives an upvote on their post or comment, THE system SHALL increase the user's karma score by 1.

WHEN a user receives a downvote on their post or comment, THE system SHALL decrease the user's karma score by 1.

WHEN a user removes their vote on another user's post or comment, THE system SHALL adjust the recipient's karma accordingly.

WHEN a user changes their vote from upvote to downvote, THE system SHALL adjust the recipient's karma from +1 to -1.

WHEN a user changes their vote from downvote to upvote, THE system SHALL adjust the recipient's karma from -1 to +1.

THE system SHALL ensure karma can be negative.

### Authenticated User Voting

WHEN a user attempts to vote on a post or comment, THE system SHALL require the user to be authenticated.

IF a user is not authenticated (logged out or guest), THE system SHALL reject the vote request.

THE system SHALL verify user authentication before allowing any vote action.

THE system SHALL prevent unauthenticated users from casting any votes on posts or comments.

### Real-Time Score Updates

WHEN a vote is cast, changed, or removed, THE system SHALL update the displayed score immediately for all viewers.

THE system SHALL ensure that all users viewing the post or comment see the updated score in real time.

THE system SHALL not cache or delay score updates for voting actions.

THE system SHALL reflect the current vote state immediately after any voting operation completes.

### Vote Action Immediacy

WHEN a user casts a vote, THE system SHALL apply the vote action immediately without delay.

WHEN a user changes a vote, THE system SHALL apply the change immediately without delay.

WHEN a user removes a vote, THE system SHALL apply the removal immediately without delay.

THE system SHALL not queue or batch voting actions for later processing.

THE system SHALL ensure all vote actions take effect synchronously with the user's request.

## Report Validation Rules

Users can report any post or comment they encounter on the platform. Each report requires a reason text explaining why the content is being reported. Report reasons must be provided and cannot be submitted without explanation. Moderators can view all pending reports submitted for their communities. Reports track who submitted each report along with the reported content. Moderators can approve reports which results in content deletion. Moderators can dismiss reports keeping the content intact and visible. Dismissed reports are removed from the moderator's report list. Approved reports permanently remove the reported content from the platform. Report status transitions between pending, resolved, and dismissed states.

### Content Reporting Capability

WHEN a member encounters any post or comment on the platform, THE member SHALL have the capability to report that content.

WHEN a member creates a report, THE report SHALL be associated with the content being reported (either a post or a comment).

IF the user is logged out, THE system SHALL reject the report submission. Guest users cannot submit reports.

THE system SHALL allow members to report posts they can view.

THE system SHALL allow members to report comments they can view.

IF the reported content does not exist, THE system SHALL reject the report submission.

### Report Reason Requirement

WHEN a member submits a report, THE system SHALL require a reason text field.

THE system SHALL reject report submissions where the reason text is empty or contains only whitespace.

THE system SHALL require that the reason text provides an explanation for why the content is being reported.

IF the reason text meets all validation requirements, THE system SHALL accept and store the report.

THE reason text SHALL be visible to moderators reviewing the report.

### Report Submission Rules

A member SHALL only be able to report content that is visible to them.

THE system SHALL enforce that reports can only be submitted by authenticated members.

IF a user attempts to report content they cannot access, THE system SHALL reject the submission.

THE system SHALL track the timestamp of when each report is submitted.

A member can submit multiple reports for different content items.

A member CAN submit multiple reports for the same content item if they are reporting different violations.

### Moderator Report Visibility

WHEN a moderator views the report list for their community, THE system SHALL display all pending reports for that community.

THE system SHALL show reports for posts that belong to the moderator's community.

THE system SHALL show reports for comments on posts that belong to the moderator's community.

Moderators SHALL NOT see reports for content from communities they do not moderate.

THE system SHALL display the reported content (title for posts, content for comments) in the report list.

THE system SHALL display the report reason in the report list.

### Reporter Identity Tracking

WHEN a report is submitted, THE system SHALL record the identity of the user who submitted the report.

THE system SHALL store the reporter's username for each report.

THE reporter's identity SHALL be visible to moderators reviewing the report.

THE system SHALL track when the reporter submitted the report.

Reporters SHALL remain anonymous to the reported content's author - their identity is not disclosed when content is deleted due to an approved report.

### Report Approval Workflow

WHEN a moderator approves a report, THE system SHALL delete the reported content.

IF the reported content is a post, THE system SHALL permanently remove the post and all its nested comments.

IF the reported content is a comment, THE system SHALL permanently remove the comment and all its nested replies.

THE system SHALL update the report status to resolved when approval occurs.

Moderators SHALL be able to approve any report for content in their moderated community.

After a report is approved and content is deleted, THE system SHALL remove the report from the active moderator report list.

### Report Dismissal Workflow

WHEN a moderator dismisses a report, THE system SHALL keep the reported content visible and intact.

THE system SHALL update the report status to dismissed when dismissal occurs.

DISMISSED reports SHALL be removed from the moderator's active report list.

Moderators SHALL be able to dismiss any report for content in their moderated community.

WHEN a report is dismissed, THE system SHALL NOT delete any content.

DISMISSED reports are no longer visible to moderators in the report management view.

### Report Status Lifecycle

NEW reports SHALL have a status of pending when first submitted.

WHEN a moderator approves a report, THE system SHALL transition the status from pending to resolved.

WHEN a moderator dismisses a report, THE system SHALL transition the status from pending to dismissed.

RESOLVED and dismissed reports SHALL NOT return to pending state.

A report SHALL only have one of three statuses at any time: pending, resolved, or dismissed.

THE system SHALL maintain a complete audit trail of status transitions for each report.

### Moderator Report Management

Moderators SHALL be able to view the list of all reports for their moderated communities.

Moderators SHALL be able to filter reports by status (pending, resolved, dismissed).

Moderators SHALL NOT be able to modify or delete reports once created.

Moderators SHALL be able to approve or dismiss each pending report they view.

A moderator CAN perform multiple report management actions in a single session.

THE system SHALL display the count of pending reports in each community for moderation visibility.

# Filtering, Sorting, and Pagination

List query specifications for filtering, sorting, and pagination.

## List Query Specifications

Define filtering, sorting, and pagination rules for list operations.

### Feed Filtering Rules

### Home Feed Filtering

WHEN a logged-in user views the Home feed, THE system SHALL:
- Show only posts from communities the user is subscribed to
- Exclude posts from communities the user is not subscribed to

IF the user has not subscribed to any community, THE system SHALL display an empty list.

### Popular Feed Filtering

WHEN any user views the Popular feed, THE system SHALL:
- Show posts from all communities across the platform
- Display the same content to all users regardless of subscription status

### Community Feed Filtering

WHEN any user views a specific community's feed, THE system SHALL:
- Show only posts from that specific community
- Display all posts from the community to all users

IF a community does not exist, THE system SHALL reject the request.

### Visibility Rules

GUESTS can only view the Popular feed and Community feeds.
MEMBERS can view the Home feed, Popular feed, and Community feeds.

WHILE viewing any feed, THE system SHALL display posts from all times (no time-based filtering unless using Top sort).

IF a post is deleted by its author or a moderator, THE system SHALL exclude it from all feed lists.
IF a user is banned from a community, THE system SHALL exclude posts from that community from their view of the Home feed.

### Feed Content Display

WHEN displaying a post in any feed list, THE system SHALL show:
- Post title
- Author username
- Community name
- Vote score
- Comment count
- Time since posted
- Content preview based on post type:
  - For text posts: first 200 characters of content
  - For image posts: thumbnail of the image
  - For link posts: domain name of the URL


# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### Authentication and Account Errors

WHEN a user attempts to register with an email address that already exists in the system, THE system SHALL reject the request and inform the user that the email is already registered.

WHEN a user attempts to register with a username that already exists in the system, THE system SHALL reject the request and inform the user that the username is already taken.

WHEN a user attempts to log in with an email address that does not exist in the system, THE system SHALL reject the request and provide a generic error message without confirming whether the email exists.

WHEN a user attempts to log in with an incorrect password, THE system SHALL reject the request and provide a generic error message without distinguishing between invalid email and invalid password.

WHEN a user attempts to change their password with an old password that does not match their current password, THE system SHALL reject the request.

WHEN a user attempts to delete their account, THE system SHALL delete all posts and comments created by the user and remove the user from all communities they own or moderate.

WHEN a user attempts to delete their account, THE system SHALL permanently remove the user's email, username, and profile information from the system.

### Data Validation and Rejection Errors

WHEN a user creates a post without providing a title, THE system SHALL reject the post creation request.

WHEN a user creates a text post without providing content, THE system SHALL reject the post creation request.

WHEN a user creates a link post without providing a URL, THE system SHALL reject the post creation request.

WHEN a user creates a link post with an invalid URL format, THE system SHALL reject the post creation request.

WHEN a user creates a community without providing a unique name, THE system SHALL reject the community creation request.

WHEN a user attempts to update their profile with an email address that already belongs to another user, THE system SHALL reject the profile update request.

WHEN a user attempts to update their profile with a username that already belongs to another user, THE system SHALL reject the profile update request.

WHEN a user attempts to create a community with a name that already exists, THE system SHALL reject the community creation request.

WHEN a comment is submitted with empty or whitespace-only content, THE system SHALL reject the comment submission request.

### Ownership and Permission Errors

WHEN a user attempts to edit a post that was created by another user, THE system SHALL reject the edit request.

WHEN a user attempts to delete a post that was created by another user, THE system SHALL reject the delete request.

WHEN a user attempts to edit a comment that was created by another user, THE system SHALL reject the edit request.

WHEN a user attempts to delete a comment that was created by another user, THE system SHALL reject the delete request.

WHEN a user attempts to create a post in a community to which they are not subscribed, THE system SHALL reject the post creation request.

WHEN a user attempts to perform a moderator action in a community for which they are not a moderator, THE system SHALL reject the action request.

WHEN an owner attempts to remove themselves as a moderator of a community, THE system SHALL prevent the action.

WHEN a moderator attempts to remove another moderator from a community, THE system SHALL reject the action and inform that only the owner can remove moderators.

WHEN a moderator attempts to remove the owner of a community, THE system SHALL reject the action.

WHEN a banned user attempts to create a post in a community from which they are banned, THE system SHALL reject the post creation request.

WHEN a banned user attempts to create a comment in a community from which they are banned, THE system SHALL reject the comment creation request.

### Resource Not Found Errors

WHEN a user or guest attempts to view a post that does not exist in the system, THE system SHALL return an error indicating the post cannot be found.

WHEN a user or guest attempts to view a comment that does not exist in the system, THE system SHALL return an error indicating the comment cannot be found.

WHEN a user or guest attempts to view a community that does not exist in the system, THE system SHALL return an error indicating the community cannot be found.

WHEN a user attempts to vote on a post that does not exist in the system, THE system SHALL reject the vote request.

WHEN a user attempts to vote on a comment that does not exist in the system, THE system SHALL reject the vote request.

WHEN a moderator attempts to view reports for a community for which they are not a moderator, THE system SHALL return an error indicating they do not have access to those reports.

WHEN a user attempts to view another user's profile that does not exist, THE system SHALL return an error indicating the user profile cannot be found.

### Duplicate and Conflict Errors

WHEN a user attempts to vote on a post that they have already voted on with a different vote type, THE system SHALL update their vote to the new vote type rather than creating a duplicate vote.

WHEN a user attempts to vote on a post that they have already voted on with the same vote type, THE system SHALL reject the request as no change is needed.

WHEN a user attempts to vote on a comment that they have already voted on with a different vote type, THE system SHALL update their vote to the new vote type rather than creating a duplicate vote.

WHEN a user attempts to vote on a comment that they have already voted on with the same vote type, THE system SHALL reject the request as no change is needed.

WHEN a user attempts to submit a report for content they have already reported, THE system SHALL reject the duplicate report submission.

WHEN a user attempts to subscribe to a community to which they are already subscribed, THE system SHALL reject the subscription request.

WHEN a user attempts to unsubscribe from a community to which they are not subscribed, THE system SHALL reject the unsubscription request.

### Vote Operation Errors

WHEN a user removes their vote from a post, THE system SHALL adjust the post score by subtracting the previous vote contribution.

WHEN a user removes their vote from a comment, THE system SHALL adjust the comment score by subtracting the previous vote contribution.

WHEN a user changes their vote from upvote to downvote or from downvote to upvote on a post, THE system SHALL adjust the post score by 2 to reflect the change.

WHEN a user changes their vote from upvote to downvote or from downvote to upvote on a comment, THE system SHALL adjust the comment score by 2 to reflect the change.

WHEN a user attempts to vote on content that has been deleted, THE system SHALL reject the vote request.

WHEN a user attempts to vote on content in a community from which they are banned, THE system SHALL reject the vote request.

WHEN a report is approved by a moderator, THE system SHALL delete the reported content and adjust vote scores accordingly.

### Post and Comment Operation Errors

WHEN a user attempts to edit a post that has been deleted, THE system SHALL reject the edit request.

WHEN a user attempts to edit a comment that has been deleted, THE system SHALL reject the edit request.

WHEN a user attempts to reply to a comment that has been deleted, THE system SHALL reject the reply request.

WHEN a user attempts to create a comment on a post that has been deleted, THE system SHALL reject the comment creation request.

WHEN a moderator deletes a post, THE system SHALL preserve the post's votes and comments for historical record while hiding them from public view.

WHEN a moderator deletes a post, THE system SHALL preserve the associated karma adjustments for accurate score calculations.

WHEN a user reports content, THE system SHALL record the reporter's identity and the reason for reporting.

WHEN a moderator dismisses a report, THE system SHALL remove the report from the report list while preserving the reported content.

### Karma Calculation and Updates

WHEN a user receives an upvote on a post or comment, THE system SHALL increase the user's karma score by 1.

WHEN a user receives a downvote on a post or comment, THE system SHALL decrease the user's karma score by 1.

WHEN a user removes their vote from another user's post or comment, THE system SHALL adjust the recipient's karma accordingly.

WHEN a user's vote is changed from upvote to downvote on another user's post or comment, THE system SHALL decrease the recipient's karma by 2.

WHEN a user's vote is changed from downvote to upvote on another user's post or comment, THE system SHALL increase the recipient's karma by 2.

WHEN a user's post or comment is deleted, THE system SHALL not adjust the karma scores of users who voted on that content.

WHEN a user's karma score would become negative, THE system SHALL allow the score to be negative.

# File Validation Rules

Validation rules and policies for file uploads and storage.

## File Validation and Policies

Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.

### File Validation Requirements

WHEN a user uploads an image for an image post, THE system SHALL validate the file before storage.

THE system SHALL reject an image upload if the file exceeds the maximum allowed size.
THE system SHALL reject an image upload if the file format is not supported.
THE system SHALL ensure uploaded files are accessible to the post owner and viewers of the post.

IF the uploaded file exceeds maximum size, THE system SHALL display an error message to the user.
IF the uploaded file has an unsupported format, THE system SHALL reject the upload and request a different file.

The system SHALL limit each post to a single image attachment.
THE system SHALL store only one image per image post.


### Virus Scanning Policy

WHEN an image file is uploaded to the system, THE system SHALL scan it for malware before making it available.

THE system SHALL block any image file that contains detected malware from being displayed.
THE system SHALL prevent users from viewing image files that fail virus scanning.
THE system SHALL log all virus scan attempts and results for security monitoring.

IF malware is detected in an uploaded image, THE system SHALL quarantine the file and alert administrators.
IF a virus scan fails due to system error, THE system SHALL reject the file and prompt the user to upload again.

THE system SHALL perform virus scanning on all uploaded images regardless of user role.
THE system SHALL complete virus scanning within a reasonable time before allowing image display.


### Content Type Validation

WHEN a user uploads an image file, THE system SHALL verify the content type matches an allowed format.

THE system SHALL accept only image file types for image posts.
THE system SHALL reject any non-image file uploaded as an image post.
THE system SHALL validate that the file extension matches the actual content type.

IF the uploaded file is not an image, THE system SHALL reject the upload and request a valid image.
IF the file extension does not match the content type, THE system SHALL reject the upload for security.

The system SHALL support the following image formats: JPEG, PNG, GIF.
THE system SHALL validate content types server-side, not relying solely on client-side validation.
THE system SHALL display an error message indicating which file formats are accepted when validation fails.


### File Retention Policy

WHEN a post is deleted by its owner, THE system SHALL permanently remove the associated image file.

WHEN a post is deleted by a moderator, THE system SHALL permanently remove the associated image file.
WHEN a user account is deleted, THE system SHALL permanently remove all image files owned by that user.

IF a post is restored from deletion (if applicable), THE system SHALL restore the associated image file.
THE system SHALL remove orphaned image files that no longer reference any post within a defined retention period.

THE system SHALL retain image files for a minimum period after post deletion to support potential recovery.
THE system SHALL permanently delete image files after the retention period expires.

WHEN generating thumbnails, THE system SHALL create and store thumbnail copies of uploaded images.
THE system SHALL apply the same retention policy to thumbnail files as to original uploaded files.


# Integration Error Handling

Error handling and retry policies for external integrations.

## Integration Failure Policies

Define retry strategies, circuit breaker policies, fallback behavior, and error escalation for external service failures.

### Retry Retry Policy

WHEN an integration request fails due to a transient error, THE system SHALL retry the request automatically.
THE system SHALL retry a failed request up to 3 times.
WHEN a retry is attempted, THE system SHALL wait at least 5 seconds before the next attempt.
WHEN a retry is attempted, THE system SHALL double the wait time for each subsequent retry (exponential backoff).
IF all retry attempts have been exhausted, THE system SHALL mark the request as failed.
WHEN a request succeeds after one or more retries, THE system SHALL record the total number of retry attempts.

### Retry Tracking and Visibility

THE system SHALL record the number of retry attempts for each integration request.
THE system SHALL store the timestamp of each retry attempt.
THE system SHALL store the error reason for each retry attempt.
THE system SHALL expose the retry count in the response to the requesting client.
WHEN a request fails after all retries, THE system SHALL include the total retry count in the error response.
THE system SHALL allow viewing retry history for a specific integration request.

### Circuit Breaker Activation

WHEN an integration endpoint fails 5 consecutive times, THE system SHALL open the circuit breaker for that endpoint.
WHILE the circuit breaker is open, THE system SHALL immediately reject new requests to that endpoint without attempting them.
THE system SHALL allow one test request through the circuit breaker every 30 seconds.
IF the test request succeeds, THE system SHALL close the circuit breaker.
IF the test request fails, THE system SHALL keep the circuit breaker open.
THE system SHALL log when a circuit breaker transitions from closed to open.

### Circuit Breaker States

THE circuit breaker SHALL have three states: closed, open, and half-open.
WHILE in the closed state, THE system SHALL process all integration requests normally.
WHILE in the open state, THE system SHALL reject all integration requests immediately with a fallback response.
WHILE in the half-open state, THE system SHALL allow one test request to evaluate the endpoint health.
IF the circuit breaker has been open for 60 seconds, THE system SHALL automatically transition to half-open state.
THE system SHALL expose the current circuit breaker state for each integration endpoint.

### Fallback Response Behavior

WHEN a circuit breaker is open, THE system SHALL return a fallback response to the requesting client.
WHEN a request fails after all retry attempts, THE system SHALL return a fallback response.
WHEN a transient error occurs, THE system SHALL attempt retries before returning the fallback response.
THE fallback response SHALL indicate that the service was temporarily unavailable.
THE fallback response SHALL include a message indicating users can try again later.
THE fallback response SHALL NOT include internal error details or stack traces.

### Fallback Data and Caching

WHEN returning a fallback response, THE system SHALL use the last known valid data if available.
WHEN falling back to cached data, THE system SHALL mark the response as stale.
WHEN returning stale cached data, THE system SHALL include the timestamp of the cached data.
THE system SHALL limit the cache duration for fallback responses to 15 minutes.
WHEN new data becomes available after a fallback, THE system SHALL invalidate the cached fallback data.
THE system SHALL log when fallback responses are served from cache.

### Integration Error Categories

THE system SHALL categorize integration errors as transient or permanent.
Transient errors include network timeouts, service unavailable, and temporary failures.
Permanent errors include invalid credentials, invalid request parameters, and unauthorized access.
WHEN classifying an error, THE system SHALL determine if retries are appropriate.
THE system SHALL NOT retry requests that result in permanent errors.
THE system SHALL include the error category in the error response.

### Error Response Format

THE system SHALL return an error response with a human-readable error message.
THE system SHALL return an error response that indicates whether retries are recommended.
THE system SHALL return an error response that includes an error code for identification.
WHEN returning an error, THE system SHALL NOT expose internal system details or stack traces.
THE system SHALL return an error response that includes a correlation ID for debugging.
THE system SHALL return an error response that includes the time of the error.

### Error Escalation

WHEN 10 consecutive integration errors occur within 1 minute, THE system SHALL trigger an alert.
WHEN an integration service returns persistent permanent errors for 5 minutes, THE system SHALL trigger an alert.
THE alert SHALL be sent to the on-call engineering team.
THE system SHALL include the affected endpoint and error pattern in the alert.
WHEN the alert condition resolves, THE system SHALL send a resolution notification.
THE system SHALL track the total number of escalation events.

### Graceful Degradation

WHEN a non-critical integration fails, THE system SHALL continue operating with degraded functionality.
WHEN a non-critical integration is unavailable, THE system SHALL display a placeholder instead of failing the request.
WHEN a critical integration fails, THE system SHALL return an appropriate error message to the user.
THE system SHALL prioritize user-facing errors over internal system errors.
WHEN in degraded mode, THE system SHALL continue to retry failed non-critical integrations.
THE system SHALL track and report the system health status based on integration availability.

# Job Failure Policies

Failure handling and dead-letter queue policies for background jobs.

## Job Failure and Recovery

Define failure handling, recovery procedures, and notification requirements for background jobs.

### Job Failure Detection

### Failure Categorization

THE system SHALL categorize all job failures into one of the following types:
- Transient failure: temporary conditions that may resolve on retry
- Permanent failure: conditions that will not resolve through retry
- Data failure: failures caused by invalid or corrupted data

WHEN a job fails, THE system SHALL log the failure type, error message, and timestamp.

### Failure Recording

WHEN a job execution fails, THE system SHALL:
1. Record the failure in the job history
2. Store the error message and error category
3. Record the number of retry attempts made
4. Store the timestamp of the failure

IF a failure occurs during data processing, THE system SHALL also record which data records were affected.

### Idempotency Check

WHEN a job fails and is retried, THE system SHALL check if the job was already partially completed.
IF the job has already completed successfully, THE system SHALL mark the retry as unnecessary.
IF the job was partially completed, THE system SHALL either rollback to a consistent state or complete from the last known good state.

### Duplicate Detection

IF a job attempt creates duplicate records, THE system SHALL:
1. Detect the duplicate before committing
2. Reject the duplicate record
3. Log the duplicate attempt
4. Continue processing with the next record

## Job Retry Policy

### Retry Configuration

WHEN a job fails, THE system SHALL determine if retry is applicable based on the failure type.

IF the failure is transient, THE system SHALL retry the job.
IF the failure is permanent, THE system SHALL NOT retry the job.
IF the failure is a data failure, THE system SHALL retry after data correction or mark for manual intervention.

### Retry Attempt Limits

WHEN retrying a job, THE system SHALL:
1. Execute up to a maximum of 3 retry attempts
2. Wait between retry attempts with exponentially increasing delays
3. Stop retrying after the maximum attempt limit is reached

IF all retry attempts are exhausted, THE system SHALL mark the job as failed permanently.

### Retry Scheduling

WHEN scheduling a retry, THE system SHALL:
1. Wait an initial delay of 1 minute before the first retry
2. Double the delay for each subsequent retry (2 minutes, 4 minutes)
3. Schedule the retry within the next available job execution window

IF a job is scheduled for retry during a system maintenance window, THE system SHALL queue the retry until after maintenance completes.

### Rate Limiting

WHEN processing retried jobs, THE system SHALL ensure that the total number of retry attempts across all jobs does not exceed system capacity.
IF the system is at maximum retry capacity, THE system SHALL queue additional retry requests and process them when capacity becomes available.

## Job Recovery Procedures

### Automatic Recovery

WHEN a job fails and meets automatic recovery criteria, THE system SHALL:
1. Attempt automatic recovery using the retry policy
2. Re-process all affected records in the order they were received
3. Verify successful completion after recovery

IF automatic recovery succeeds, THE system SHALL mark the job as completed and notify stakeholders.
IF automatic recovery fails, THE system SHALL escalate to manual recovery procedures.

### Manual Recovery

WHEN a job requires manual recovery, THE system SHALL:
1. Mark the job status as "pending manual intervention"
2. Notify the appropriate team members
3. Provide detailed error information and affected records

WHEN a manual recovery is performed, THE system SHALL:
1. Allow recovery from the last known successful state
2. Record the manual recovery action in the audit log
3. Verify data integrity after manual recovery

### Rollback Procedures

WHEN recovery requires rollback, THE system SHALL:
1. Identify all changes made during the failed job execution
2. Reverse each change in the opposite order of execution
3. Verify the system is in a consistent state after rollback

IF rollback cannot be completed successfully, THE system SHALL mark the job as critically failed and escalate to emergency procedures.

### Data Consistency Verification

AFTER recovery is completed, THE system SHALL:
1. Verify all affected data records are in a consistent state
2. Confirm all required data integrity checks pass
3. Log the verification results

IF data consistency checks fail after recovery, THE system SHALL trigger an emergency recovery procedure.

## Notification Requirements

### Failure Notifications

WHEN a job fails for the first time, THE system SHALL:
1. Send an initial notification to the job owner
2. Include the job name, failure time, and error message
3. Include the number of retry attempts scheduled

IF a job has exhausted all retry attempts, THE system SHALL:
1. Send a final failure notification to the job owner
2. Escalate the notification to the management team
3. Include a summary of all retry attempts and their outcomes

### Recovery Notifications

WHEN a job is successfully recovered, THE system SHALL:
1. Send a recovery confirmation to the job owner
2. Include the time of recovery and final status
3. Include any actions taken during recovery

IF recovery requires manual intervention, THE system SHALL:
1. Send a notification to the assigned recovery team
2. Provide step-by-step recovery instructions
3. Track the time until recovery is initiated

### Monitoring Notifications

WHEN a job fails or requires recovery, THE system SHALL:
1. Update the job monitoring dashboard
2. Log the event in the audit trail
3. Make the status visible to system administrators

WHEN the system reaches 5 or more concurrent job failures, THE system SHALL:
1. Send an alert to the system administration team
2. Include statistics on affected jobs
3. Recommend immediate investigation

### Notification Channels

THE system SHALL support multiple notification channels:
- Email notifications to job owners and designated recipients
- Dashboard alerts visible to system administrators
- Log entries for audit and troubleshooting purposes

WHEN a user configures notification preferences, THE system SHALL respect those preferences and send notifications only through the selected channels.

### Escalation Policy

IF a job failure notification receives no response within 2 hours, THE system SHALL:
1. Escalate to the next level of management
2. Send the escalated notification to additional recipients
3. Update the escalation status in the job record