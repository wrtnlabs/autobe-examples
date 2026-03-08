**redditPlatform — Data isolation, business rules, filtering/sorting/pagination, error catalog**

Data isolation, business rules, filtering/sorting/pagination, error catalog

# Data Isolation and Ownership

Data ownership rules and tenant/user-level isolation policies.

## Ownership and Isolation Rules

Define data ownership semantics and isolation boundaries for multi-user access.

### Data Ownership Rules

### Post and Comment Ownership

THE system SHALL assign ownership of each post to the user who created it.
THE system SHALL assign ownership of each comment to the user who created it.
THE system SHALL assign ownership of each community to the user who created it.

WHEN a user creates a post, THE system SHALL record the creating user as the owner.
WHEN a user creates a comment, THE system SHALL record the creating user as the owner.
WHEN a user creates a community, THE system SHALL record the creating user as the owner.

THE system SHALL NOT allow transfer of ownership between users.
THE system SHALL NOT allow reassignment of post ownership to another user.
THE system SHALL NOT allow reassignment of comment ownership to another user.

WHEN a user deletes their account, THE system SHALL delete all posts owned by that user.
WHEN a user deletes their account, THE system SHALL delete all comments owned by that user.

### Community Ownership

THE system SHALL assign ownership of moderation rights to the community creator.
THE system SHALL allow the community owner to add moderators to the community.
THE system SHALL allow the community owner to remove moderators from the community.

THE system SHALL NOT allow moderators to remove the community owner.
THE system SHALL NOT allow moderators to remove other moderators.

### Ownership Verification

WHEN a user attempts to edit a post, THE system SHALL verify the user owns the post.
WHEN a user attempts to delete a post, THE system SHALL verify the user owns the post.
WHEN a user attempts to edit a comment, THE system SHALL verify the user owns the comment.
WHEN a user attempts to delete a comment, THE system SHALL verify the user owns the comment.

### Multi-User Data Isolation

### User Data Isolation

THE system SHALL isolate each user's private data from other users.
THE system SHALL prevent users from accessing other users' private account information.
THE system SHALL prevent users from modifying other users' profile information.

WHEN a user views another user's profile, THE system SHALL display only public information.
WHEN a user views another user's profile, THE system SHALL NOT display private account details.

THE system SHALL ensure multi-user data isolation across all user-generated content.
THE system SHALL prevent unauthorized cross-user data access.

### Content Isolation

THE system SHALL isolate posts so only the owner can edit or delete them.
THE system SHALL isolate comments so only the owner can edit or delete them.
THE system SHALL isolate community ownership so only the owner has full control.

WHEN multiple users interact with the same content, THE system SHALL maintain individual ownership boundaries.

### Subscription Data Isolation

THE system SHALL isolate each user's subscription list from other users.
THE system SHALL allow users to view their own subscribed communities.
THE system SHALL NOT allow users to view other users' subscription lists.

### Community Data Access

### Public Content Access

THE system SHALL allow guests to view all public community content.
THE system SHALL allow guests to view all public posts across communities.
THE system SHALL allow guests to view all public comments on posts.

THE system SHALL allow members to view all public content available to guests.
THE system SHALL allow members to view their own private data.

### Subscription-Based Access

WHEN a user attempts to create a post in a community, THE system SHALL verify the user is subscribed.
WHEN a user is not subscribed to a community, THE system SHALL prevent post creation in that community.

THE system SHALL allow subscribed users to view the home feed containing their subscribed communities' posts.
THE system SHALL restrict home feed access to logged-in members only.

### Banned User Access

WHEN a user is banned from a community, THE system SHALL prevent them from creating posts in that community.
WHEN a user is banned from a community, THE system SHALL prevent them from creating comments in that community.
THE system SHALL allow banned users to view content in the banned community.

### Moderator Access

THE system SHALL grant moderators access to view all reports for their community.
THE system SHALL grant moderators access to delete any post in their community.
THE system SHALL grant moderators access to delete any comment in their community.
THE system SHALL grant moderators access to view the list of banned users in their community.
THE system SHALL grant moderators access to ban and unban users in their community.

### Data Access Boundaries

### Feed Access Rules

THE system SHALL provide the home feed only to authenticated members.
THE system SHALL provide the popular feed to all users including guests.
THE system SHALL provide community feeds to all users including guests.

WHEN displaying the home feed, THE system SHALL include only posts from subscribed communities.
WHEN displaying the popular feed, THE system SHALL include posts from all communities.
WHEN displaying a community feed, THE system SHALL include only posts from that community.

### Voting Access

THE system SHALL allow only authenticated members to vote on posts.
THE system SHALL allow only authenticated members to vote on comments.
THE system SHALL prevent guests from voting on any content.

### Reporting Access

THE system SHALL allow any authenticated member to report posts.
THE system SHALL allow any authenticated member to report comments.
THE system SHALL require a reason when a user submits a report.

### Moderator Action Boundaries

THE system SHALL restrict report review to community moderators only.
THE system SHALL restrict content approval actions to community moderators only.
THE system SHALL restrict ban management to community moderators and owners only.

### Data Retrieval Boundaries

WHEN a user requests a post, THE system SHALL verify access permissions before returning content.
WHEN a user requests a comment, THE system SHALL verify access permissions before returning content.
WHEN a user requests community content, THE system SHALL apply appropriate access rules based on user status.

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## User Rules

Users create accounts by providing email, password, and choosing a unique username. Email addresses must be unique across all active accounts. Usernames must also be unique and cannot be changed after account creation. Users log in with their email and password credentials. Users can change their password at any time through their account settings. Users can delete their account, which permanently removes all their posts, comments, and associated data. Each user has a profile containing a display name, bio text, and avatar image. Users can edit their own display name, bio, and avatar but cannot change their username. Any user can view any other user's public profile page. A user's profile displays their display name, bio, avatar, total karma score, list of posts they created, and list of comments they wrote.

### User Account and Profile Rules

### Username Uniqueness and Immutability

WHEN a user creates an account, THE system SHALL require them to choose a username.

THE system SHALL ensure all usernames are unique across the platform.

WHEN a username is requested during account creation, THE system SHALL verify no existing user has that username.

IF the requested username already exists, THE system SHALL reject the account creation request.

WHEN a user successfully creates an account, THE system SHALL assign the chosen username permanently.

THE system SHALL prevent users from changing their username after account creation.

IF a user attempts to change their username, THE system SHALL reject the request.

THE system SHALL display an error message indicating usernames cannot be changed.

WHEN a user views their account settings, THE system SHALL display their current username as non-editable.

THE system SHALL treat usernames as case-insensitive for uniqueness validation.

### Email Uniqueness Validation

WHEN a user creates an account, THE system SHALL require a valid email address.

THE system SHALL ensure all email addresses are unique across the platform.

WHEN an email is provided during account creation, THE system SHALL verify no existing user has that email.

IF the provided email already exists, THE system SHALL reject the account creation request.

THE system SHALL display an error message indicating the email is already registered.

WHEN a user logs in, THE system SHALL accept their registered email address.

THE system SHALL prevent multiple active accounts from sharing the same email address.

### Password Management

WHEN a user creates an account, THE system SHALL require them to set a password.

THE system SHALL store passwords in hashed format for security.

WHEN a user logs in, THE system SHALL verify their email and password credentials.

IF the credentials are invalid, THE system SHALL reject the login attempt.

WHEN a user requests to change their password, THE system SHALL require authentication with their current password.

THE system SHALL allow users to change their password at any time through account settings.

WHEN a new password is set, THE system SHALL require confirmation of the new password.

IF the new password and confirmation do not match, THE system SHALL reject the password change request.

THE system SHALL invalidate all existing sessions when a password is changed.

### Account Deletion and Consequences

WHEN a user requests account deletion, THE system SHALL require confirmation of the action.

THE system SHALL permanently remove the user's account upon confirmation.

WHEN an account is deleted, THE system SHALL also delete all posts created by the user.

WHEN an account is deleted, THE system SHALL also delete all comments created by the user.

THE system SHALL remove the user from all community subscriptions.

THE system SHALL remove all votes cast by the user from posts and comments.

WHEN a user's content is deleted, THE system SHALL remove references to the deleted username.

THE system SHALL display the original author as "deleted user" in historical content references.

THE system SHALL prevent account recovery after deletion is confirmed.

### Profile Editing and Ownership

WHEN a user views their profile settings, THE system SHALL allow editing of their display name.

THE system SHALL allow users to update their bio text at any time.

THE system SHALL allow users to upload or change their avatar image.

THE system SHALL restrict profile editing to the profile owner only.

IF a user attempts to edit another user's profile, THE system SHALL reject the request.

WHEN a user edits their profile, THE system SHALL validate the display name is not empty.

THE system SHALL validate the bio text does not exceed maximum length limits.

THE system SHALL validate avatar images meet file size and format requirements.

### Profile Viewing and Access

THE system SHALL allow any user to view any other user's public profile.

THE system SHALL allow guests to view user profiles without authentication.

WHEN a user profile is viewed, THE system SHALL display the display name.

WHEN a user profile is viewed, THE system SHALL display the bio text.

WHEN a user profile is viewed, THE system SHALL display the avatar image.

WHEN a user profile is viewed, THE system SHALL display the total karma score.

WHEN a user profile is viewed, THE system SHALL display a list of posts created by the user.

WHEN a user profile is viewed, THE system SHALL display a list of comments created by the user.

THE system SHALL paginate the post and comment lists when viewing a profile.

### Karma Score Calculation and Display

THE system SHALL maintain a single karma score for each user.

WHEN a user receives an upvote on a post, THE system SHALL increase their karma by 1.

WHEN a user receives a downvote on a post, THE system SHALL decrease their karma by 1.

WHEN a user receives an upvote on a comment, THE system SHALL increase their karma by 1.

WHEN a user receives a downvote on a comment, THE system SHALL decrease their karma by 1.

WHEN a user removes their vote, THE system SHALL adjust the karma score accordingly.

THE system SHALL allow karma scores to be negative.

WHEN a user's content is deleted, THE system SHALL recalculate their karma score.

WHEN a user's profile is viewed, THE system SHALL display their current karma score.

THE system SHALL update karma scores in real-time when votes are cast or removed.

### Account Ownership and Access Control

### Account Ownership and Authentication

THE system SHALL establish the user who creates an account as the account owner.

THE system SHALL require authentication for all account management operations.

WHEN a user logs in with valid credentials, THE system SHALL establish an authenticated session.

WHEN a session expires, THE system SHALL require re-authentication for protected operations.

THE system SHALL prevent unauthorized access to another user's account settings.

IF a user attempts to access another user's account data, THE system SHALL reject the request.

THE system SHALL display account ownership indicators in user interfaces.

WHEN displaying user-generated content, THE system SHALL show the username of the creator.

THE system SHALL ensure deleted accounts cannot be reactivated with the same username.

## Community Rules

Any registered user can create a new community on the platform. When creating a community, the user provides a unique name, description text, and icon image. The community name must be unique across all communities and cannot be changed after creation. The user who creates a community automatically becomes its owner with highest authority. Communities display their description, icon, and current subscriber count to all users. All users can browse a list of all communities on the platform. Users can search for communities by name to find specific communities. The owner can add moderators to help manage the community. The owner can remove moderators from the community. Moderators cannot remove the owner or other moderators.

### Community Creation Process

WHEN a user creates a community, THE system SHALL require a unique community name.

WHEN a user creates a community, THE system SHALL require description text.

WHEN a user creates a community, THE system SHALL allow an optional icon image.

THE system SHALL ensure community names are unique across all communities on the platform.

THE system SHALL prevent community names from being changed after creation.

WHEN a community is created, THE system SHALL automatically assign the creator as the owner.

THE owner SHALL have the highest authority level in the community.

IF a user attempts to create a community with a duplicate name, THE system SHALL reject the request.

IF the community name is missing or empty, THE system SHALL reject the creation request.

IF the description text is missing, THE system SHALL reject the creation request.

### Owner Authority and Moderator Management

THE owner SHALL have the authority to add moderators to the community.

THE owner SHALL have the authority to remove moderators from the community.

Moderators SHALL have the right to add other moderators to the community.

Moderators SHALL NOT have the right to remove the community owner.

Moderators SHALL NOT have the right to remove other moderators.

WHEN the owner adds a moderator, THE system SHALL grant moderator privileges for that community.

WHEN the owner removes a moderator, THE system SHALL revoke all moderator privileges for that community.

WHEN a moderator adds another moderator, THE system SHALL grant moderator privileges to the new moderator.

IF a moderator attempts to remove the owner, THE system SHALL reject the action.

IF a moderator attempts to remove another moderator, THE system SHALL reject the action.

### Community Discovery and Browsing

ALL users SHALL be able to browse a list of all communities on the platform.

THE system SHALL display the subscriber count for each community in the browse list.

Users SHALL be able to search for communities by name.

THE system SHALL return communities matching the search query.

THE system SHALL display community descriptions in search results.

THE system SHALL display community icons in search results.

WHEN a user browses communities, THE system SHALL show all available communities.

WHEN a user searches for communities, THE system SHALL filter results by name match.

IF no communities match the search query, THE system SHALL return an empty result set.

IF the community list is empty, THE system SHALL display a message indicating no communities exist.

### Community Profile Display

THE system SHALL display the community description to all users viewing the community.

THE system SHALL display the community icon to all users viewing the community.

THE system SHALL update the subscriber count when users subscribe to the community.

THE system SHALL update the subscriber count when users unsubscribe from the community.

THE subscriber count SHALL reflect the total number of active subscribers.

WHEN a user views a community, THE system SHALL display the current subscriber count.

WHEN a user subscribes to a community, THE system SHALL increment the subscriber count.

WHEN a user unsubscribes from a community, THE system SHALL decrement the subscriber count.

IF the icon image is not provided, THE system SHALL display a default placeholder icon.

IF the description text is empty, THE system SHALL display no description text.

## Post Rules

Users can create posts only in communities they have subscribed to. Every post requires a title as a mandatory field. Posts must be one of three types: text posts with content, link posts with a URL, or image posts with an uploaded image. Text posts contain written content that can be displayed in full or previewed. Link posts contain a URL and display the domain name in post lists. Image posts contain an uploaded image and show a thumbnail in post lists. Users can edit their own posts after creation. Users can delete their own posts at any time. When viewing a single post, users see the title, full content, author username, community name, vote score, comment count, and creation timestamp. Moderators can delete any post in their community regardless of ownership.

### Subscription Requirement for Posting

WHEN a user attempts to create a post in a community, THE system SHALL verify that the user has an active subscription to that community.

WHEN a user is not subscribed to a community, THE system SHALL prevent post creation in that community.

WHEN a user subscribes to a community, THE system SHALL enable post creation privileges for that community.

WHEN a user unsubscribes from a community, THE system SHALL revoke post creation privileges for that community.

WHEN a user is banned from a community, THE system SHALL prevent post creation in that community regardless of subscription status.

WHEN checking subscription status for post creation, THE system SHALL consider only active subscriptions.

IF the user has no subscription to the target community, THE system SHALL reject the post creation request.

IF the user's subscription has been removed, THE system SHALL reject the post creation request.

IF the user is banned from the community, THE system SHALL reject the post creation request even if subscribed.

### Post Title Requirements

WHEN a user creates a post, THE system SHALL require a title field to be present.

WHEN a user creates a post, THE system SHALL reject the request if the title is empty or contains only whitespace.

WHEN a user edits a post, THE system SHALL require the title to remain present.

WHEN a user edits a post, THE system SHALL reject the request if the title becomes empty or whitespace-only.

WHEN displaying a post in any feed, THE system SHALL show the post title.

WHEN viewing a single post, THE system SHALL display the post title prominently.

IF the title field is missing during post creation, THE system SHALL return an error indicating the title is required.

IF the title field is missing during post editing, THE system SHALL return an error indicating the title is required.

### Post Type Selection and Content Rules

WHEN a user creates a post, THE system SHALL require the user to select exactly one post type from: text post, link post, or image post.

WHEN a user creates a text post, THE system SHALL require text content to be provided.

WHEN a user creates a link post, THE system SHALL require a URL to be provided.

WHEN a user creates an image post, THE system SHALL require an image file to be uploaded.

WHEN a user creates a text post, THE system SHALL allow the content to be displayed in full when viewing the single post.

WHEN displaying a text post in a feed list, THE system SHALL show the first 200 characters of the content as a preview.

WHEN displaying a link post in a feed list, THE system SHALL show the domain name extracted from the URL.

WHEN displaying an image post in a feed list, THE system SHALL show a thumbnail of the uploaded image.

WHEN viewing a single link post, THE system SHALL display the full URL.

WHEN viewing a single image post, THE system SHALL display the full image.

IF the user selects text post type without providing content, THE system SHALL reject the post creation request.

IF the user selects link post type without providing a URL, THE system SHALL reject the post creation request.

IF the user selects image post type without uploading an image, THE system SHALL reject the post creation request.

IF the user provides content for multiple post types simultaneously, THE system SHALL accept only the content matching the selected type.

### Post Editing and Deletion Permissions

WHEN a user attempts to edit a post, THE system SHALL verify that the user is the post author.

WHEN the post author is not the user attempting to edit, THE system SHALL reject the edit request.

WHEN a user edits their own post, THE system SHALL allow updates to the title and content.

WHEN a user edits their own post, THE system SHALL preserve the post type unless explicitly changed.

WHEN a user attempts to delete a post, THE system SHALL verify that the user is the post author.

WHEN the post author is not the user attempting to delete, THE system SHALL reject the delete request.

WHEN a user deletes their own post, THE system SHALL permanently remove the post and all associated votes.

WHEN a user deletes their own post, THE system SHALL remove all comments associated with the post.

IF the user does not own the post, THE system SHALL return an error indicating insufficient permissions for editing.

IF the user does not own the post, THE system SHALL return an error indicating insufficient permissions for deletion.

### Moderator Post Deletion Rights

WHEN a moderator attempts to delete a post in their community, THE system SHALL verify that the user has moderator or owner status for that community.

WHEN a moderator with appropriate permissions deletes a post, THE system SHALL allow deletion regardless of post ownership.

WHEN a moderator deletes a post, THE system SHALL permanently remove the post and all associated votes.

WHEN a moderator deletes a post, THE system SHALL remove all comments associated with the post.

WHEN a moderator without appropriate permissions attempts to delete a post, THE system SHALL reject the deletion request.

IF the user is not a moderator or owner of the community, THE system SHALL return an error indicating insufficient permissions for moderator deletion.

IF the post does not exist in the community, THE system SHALL return an error indicating the post was not found.

### Post View Information Display

WHEN a user views a single post, THE system SHALL display the post title.

WHEN a user views a single post, THE system SHALL display the full post content based on post type.

WHEN a user views a single post, THE system SHALL display the author's username.

WHEN a user views a single post, THE system SHALL display the community name where the post was created.

WHEN a user views a single post, THE system SHALL display the current vote score.

WHEN a user views a single post, THE system SHALL display the total comment count.

WHEN a user views a single post, THE system SHALL display the creation timestamp as time elapsed (e.g., "3 hours ago").

WHEN displaying a single text post, THE system SHALL show the complete text content.

WHEN displaying a single link post, THE system SHALL show the full URL.

WHEN displaying a single image post, THE system SHALL show the uploaded image.

IF the post does not exist, THE system SHALL return an error indicating the post was not found.

IF the user lacks permission to view the post, THE system SHALL return an error indicating insufficient access.

## Comment Rules

Users can write comments on any post regardless of subscription status. Users can reply to any existing comment on a post. Replies can have nested replies with no depth limit on nesting. Each comment contains text content and displays the author username. Users can edit their own comments after creation. Users can delete their own comments at any time. When a user deletes a comment, all nested replies remain visible. Comments display the author, content, vote score, and timestamp. Comments show nested replies in a hierarchical structure. Moderators can delete any comment in their community regardless of ownership. Comment sorting options include best by score, newest first, and controversial with many votes near zero score.

### Comment Creation Permissions

WHEN a user views a post, THE system SHALL allow them to create a comment.

WHEN a user is not subscribed to a community, THE system SHALL still allow them to comment on posts in that community.

WHEN a guest user attempts to create a comment, THE system SHALL require authentication before allowing comment creation.

WHEN a user is banned from a community, THE system SHALL prevent them from creating new comments in that community.

WHEN a user is banned from a community, THE system SHALL allow them to view existing comments in that community.

THE system SHALL require a user account to create comments.

THE system SHALL validate that the target post exists before allowing comment creation.

WHEN the target post does not exist, THE system SHALL reject the comment creation request.

WHEN the target post belongs to a community where the user is banned, THE system SHALL reject the comment creation request.

### Comment Reply Nesting Rules

WHEN a user creates a comment, THE system SHALL allow them to reply to any existing comment on the same post.

WHEN a user replies to a comment, THE system SHALL allow other users to reply to that reply.

THE system SHALL support unlimited nesting depth for comment replies.

THE system SHALL display nested replies in a hierarchical structure under the parent comment.

WHEN viewing a comment thread, THE system SHALL show all levels of nested replies.

THE system SHALL maintain the parent-child relationship between comments and their replies.

WHEN a parent comment is deleted, THE system SHALL preserve all nested replies in the thread.

THE system SHALL display the nesting level visually to indicate reply depth.

### Comment Editing and Deletion Rights

WHEN a user creates a comment, THE system SHALL allow them to edit their own comment at any time.

THE system SHALL NOT allow users to edit comments created by other users.

WHEN a user edits their comment, THE system SHALL update the displayed content immediately.

WHEN a user creates a comment, THE system SHALL allow them to delete their own comment at any time.

THE system SHALL NOT allow users to delete comments created by other users.

WHEN a user deletes their comment, THE system SHALL preserve all nested replies in the comment thread.

WHEN a comment is deleted, THE system SHALL display a deletion indicator in place of the original content.

THE system SHALL maintain the comment thread structure after a comment is deleted.

WHEN a deleted comment has replies, THE system SHALL indicate that the parent comment was deleted.

### Moderator Comment Management

WHEN a user is a moderator of a community, THE system SHALL allow them to delete any comment in that community.

THE system SHALL NOT require comment ownership for moderator deletion actions.

WHEN a moderator deletes a comment, THE system SHALL record the deletion in the community moderation log.

WHEN a moderator deletes a comment, THE system SHALL preserve all nested replies in the thread.

THE owner of a community SHALL have all moderator privileges for comments in that community.

WHEN a user is banned from a community, THE system SHALL prevent them from creating new comments in that community.

WHEN a user is banned from a community, THE system SHALL allow moderators to view their existing comments.

### Comment Display and Sorting Options

THE system SHALL display the author username on each comment.

THE system SHALL display the comment content on each comment.

THE system SHALL display the vote score on each comment.

THE system SHALL display the timestamp of when the comment was created.

THE system SHALL display nested replies under each parent comment.

WHEN viewing comments on a post, THE system SHALL support sorting by best (highest vote score first).

WHEN viewing comments on a post, THE system SHALL support sorting by new (most recent first).

WHEN viewing comments on a post, THE system SHALL support sorting by controversial (many votes but score close to zero first).

THE system SHALL display the time since posting (e.g., "3 hours ago") for each comment.

THE system SHALL display the vote score as total upvotes minus total downvotes.

THE system SHALL indicate when a user has voted on a comment.

THE system SHALL allow users to change their vote on a comment.

THE system SHALL allow users to remove their vote from a comment.

## Vote Rules

Users can upvote posts and comments, which adds 1 to the vote score. Users can downvote posts and comments, which subtracts 1 from the vote score. Each user can only cast one vote per post or comment at any time. Users can change their vote from upvote to downvote or from downvote to upvote. Users can remove their vote entirely, which adjusts the score accordingly. Vote score equals total upvotes minus total downvotes. Vote changes immediately update the visible vote score. When a vote is removed, the score adjusts by removing that vote's contribution. Votes on posts also affect the author's karma score. Votes on comments also affect the author's karma score. Vote records are tracked with timestamps for audit purposes.

### Vote Score Calculation

WHEN a user upvotes a post, THE system SHALL increase the post's vote score by 1.

WHEN a user upvotes a comment, THE system SHALL increase the comment's vote score by 1.

WHEN a user downvotes a post, THE system SHALL decrease the post's vote score by 1.

WHEN a user downvotes a comment, THE system SHALL decrease the comment's vote score by 1.

THE system SHALL calculate the vote score as the total number of upvotes minus the total number of downvotes.

WHEN the vote score is calculated, THE system SHALL display it immediately to all users viewing the content.

THE system SHALL allow the vote score to be zero, positive, or negative.

WHEN a vote is cast, THE system SHALL update the visible vote score within 1 second of the vote action.

### Vote Management Rules

WHEN a user casts a vote on a post or comment, THE system SHALL allow only one active vote per user per item.

WHEN a user who has already upvoted a post attempts to upvote again, THE system SHALL reject the duplicate vote request.

WHEN a user who has already downvoted a post attempts to downvote again, THE system SHALL reject the duplicate vote request.

WHEN a user changes their vote from upvote to downvote on a post, THE system SHALL decrease the vote score by 2.

WHEN a user changes their vote from downvote to upvote on a post, THE system SHALL increase the vote score by 2.

WHEN a user changes their vote from upvote to downvote on a comment, THE system SHALL decrease the vote score by 2.

WHEN a user changes their vote from downvote to upvote on a comment, THE system SHALL increase the vote score by 2.

WHEN a user removes their vote from a post, THE system SHALL adjust the vote score by removing that vote's contribution.

WHEN a user removes their vote from a comment, THE system SHALL adjust the vote score by removing that vote's contribution.

WHEN a vote is reversed or removed, THE system SHALL immediately update the visible vote score to reflect the change.

### Karma Score Adjustment

WHEN a user receives an upvote on their post, THE system SHALL increase their karma score by 1.

WHEN a user receives an upvote on their comment, THE system SHALL increase their karma score by 1.

WHEN a user receives a downvote on their post, THE system SHALL decrease their karma score by 1.

WHEN a user receives a downvote on their comment, THE system SHALL decrease their karma score by 1.

WHEN a user changes their vote from upvote to downvote on another user's content, THE system SHALL decrease the author's karma by 2.

WHEN a user changes their vote from downvote to upvote on another user's content, THE system SHALL increase the author's karma by 2.

WHEN a user removes their vote from another user's content, THE system SHALL adjust the author's karma to remove that vote's contribution.

THE system SHALL allow a user's karma score to be zero, positive, or negative.

WHEN a user's karma score changes, THE system SHALL update the visible karma on their profile immediately.

### Vote Tracking and Visibility

WHEN a vote is cast, THE system SHALL record the timestamp of the vote action.

WHEN a vote is changed, THE system SHALL update the timestamp to reflect the time of the change.

WHEN a vote is removed, THE system SHALL record the timestamp of the removal.

THE system SHALL maintain vote records for audit purposes with accurate timestamps.

THE system SHALL NOT display individual user votes to other users.

WHEN viewing a post or comment, THE system SHALL display only the aggregate vote score, not individual votes.

WHEN a user views their own vote on a post or comment, THE system SHALL indicate their current vote choice (upvoted, downvoted, or no vote).

THE system SHALL prevent users from seeing which other users voted on specific content.

WHEN a user accesses vote-related data, THE system SHALL only expose data that user is authorized to view.

## Report Rules

Users can report any post or comment they find inappropriate. When reporting content, users must provide a text reason explaining the issue. Reports are submitted to moderators of the community where the content exists. Moderators can view all pending reports for their community. Each report displays the reported content, the user who reported it, and the reason provided. Moderators can approve a report, which deletes the reported content. Moderators can dismiss a report, which keeps the content visible. Dismissed reports are removed from the moderator report list. Approved reports result in permanent deletion of the reported content. Users can report the same content multiple times but each report is tracked separately. Moderators cannot report content in communities they do not moderate.

### Report Creation Requirements

WHEN a user reports a post or comment, THE system SHALL require a text reason explaining the issue.

WHEN a user submits a report, THE system SHALL:
1. Associate the report with the reported content (post or comment)
2. Record the user who submitted the report
3. Record the community where the content exists
4. Set the report status to pending

IF the report reason is missing, THE system SHALL reject the report submission.

IF the report reason exceeds the maximum allowed length, THE system SHALL reject the report submission.

WHEN a report is successfully submitted, THE system SHALL confirm the submission to the user.

Users can report the same content multiple times, and each report is tracked as a separate record.

### Moderator Report Access

WHEN a moderator views reports, THE system SHALL display only reports for communities they moderate.

WHEN a report is displayed to a moderator, THE system SHALL show:
1. The reported content (post title or comment text)
2. The username of the user who reported the content
3. The reason provided by the reporting user
4. The timestamp when the report was submitted
5. The current status of the report (pending, approved, or dismissed)

IF a user does not moderate any community, THE system SHALL not provide access to the report review interface.

Moderators cannot view reports for communities where they do not have moderator privileges.

### Report Review Actions

WHEN a moderator approves a report, THE system SHALL permanently delete the reported content.

WHEN a moderator dismisses a report, THE system SHALL:
1. Keep the reported content visible to users
2. Mark the report status as dismissed
3. Remove the report from the pending reports list

Approved reports result in immediate and permanent deletion of the reported content.

Dismissed reports are removed from the moderator report list and cannot be re-opened.

WHEN content is deleted due to report approval, THE system SHALL notify the content owner that their content was removed.

### Duplicate Report Handling

Users can submit multiple reports for the same post or comment.

WHEN multiple reports exist for the same content, THE system SHALL maintain each report as a separate record.

WHEN a moderator reviews reports, THE system SHALL display all pending reports for the same content separately.

WHEN a report is approved and content is deleted, THE system SHALL mark all remaining pending reports for that content as resolved.

WHEN a report is dismissed, THE system SHALL allow other users to submit new reports for the same content.

## Subscription Rules

Users can subscribe to any community on the platform. Users can unsubscribe from any community they are subscribed to. Users can view a list of all communities they are currently subscribed to. Subscribing to a community is required before creating posts in that community. Subscribing does not grant any moderation privileges. Unsubscribing prevents a user from creating new posts in that community. Unsubscribing does not delete existing posts or comments the user made in that community. Users can resubscribe to a community they previously unsubscribed from. Community owners automatically subscribe to their own communities when created. The subscriber count updates immediately when users subscribe or unsubscribe.

### Posting Subscription Requirement

WHEN a user attempts to create a post in a community, THE system SHALL verify that the user is subscribed to that community.

IF the user is not subscribed to the community, THE system SHALL reject the post creation request.

IF the user is subscribed to the community, THE system SHALL allow the post creation to proceed.

WHEN a user creates a community, THE system SHALL automatically subscribe the owner to that community.

THE system SHALL count the community owner as a subscriber for the subscriber count.

THE system SHALL prevent users who are banned from a community from creating posts in that community, regardless of subscription status.

### Unsubscribe Permissions

WHEN a user unsubscribes from a community, THE system SHALL remove their subscription relationship.

WHEN a user unsubscribes from a community, THE system SHALL prevent them from creating new posts in that community.

WHEN a user unsubscribes from a community, THE system SHALL allow them to view the community content.

WHEN a user unsubscribes from a community, THE system SHALL allow them to resubscribe at any time.

THE system SHALL NOT delete existing posts made by the user in that community when they unsubscribe.

THE system SHALL NOT delete existing comments made by the user in that community when they unsubscribe.

THE system SHALL update the subscriber count immediately when a user unsubscribes.

### Subscribed Communities List

WHEN a user requests to view their subscribed communities, THE system SHALL return a list of all communities they are currently subscribed to.

THE system SHALL include the community name in the subscribed communities list.

THE system SHALL include the subscriber count for each community in the list.

THE system SHALL include the community icon image for each community in the list.

THE system SHALL allow the user to navigate to any community from their subscribed communities list.

THE system SHALL allow the user to unsubscribe from any community directly from their subscribed communities list.

### Subscription Timing Rules

WHEN a user subscribes to a community, THE system SHALL record the subscription immediately.

WHEN a user subscribes to a community, THE system SHALL update the subscriber count immediately.

WHEN a user subscribes to a community, THE system SHALL allow them to create posts in that community immediately.

WHEN a user creates a community, THE system SHALL automatically subscribe the owner at the time of creation.

THE system SHALL maintain subscription status continuously until the user explicitly unsubscribes.

THE system SHALL track the timestamp when each subscription was created.

### Subscription Privilege Limits

THE system SHALL NOT grant moderation privileges to users based on subscription alone.

THE system SHALL NOT allow subscribers to delete posts or comments in a community they do not own.

THE system SHALL NOT allow subscribers to ban users from a community they do not moderate.

THE system SHALL NOT allow subscribers to view or manage reports for a community they do not moderate.

THE system SHALL treat all subscribers equally regardless of when they subscribed.

THE system SHALL require explicit moderator assignment for any moderation privileges.

### Resubscription Capabilities

WHEN a user resubscribes to a community they previously unsubscribed from, THE system SHALL restore their subscription relationship.

WHEN a user resubscribes to a community, THE system SHALL update the subscriber count immediately.

WHEN a user resubscribes to a community, THE system SHALL allow them to create posts in that community immediately.

THE system SHALL allow unlimited resubscriptions to any community.

THE system SHALL NOT penalize users for resubscribing to communities they previously left.

### Owner Auto-Subscription

WHEN a user creates a community, THE system SHALL automatically subscribe the owner to that community.

THE system SHALL count the community owner as the first subscriber.

THE system SHALL display the owner in the subscriber list for the community.

THE system SHALL allow the owner to unsubscribe from their own community like any other subscriber.

IF the owner unsubscribes from their own community, THE system SHALL NOT remove their ownership status.

IF the owner unsubscribes from their own community, THE system SHALL allow them to resubscribe at any time.

### Subscriber Count Updates

WHEN a user subscribes to a community, THE system SHALL increment the subscriber count immediately.

WHEN a user unsubscribes from a community, THE system SHALL decrement the subscriber count immediately.

THE system SHALL display the current subscriber count on the community page.

THE system SHALL ensure the subscriber count accurately reflects active subscriptions.

THE system SHALL NOT count duplicate subscriptions toward the subscriber count.

THE system SHALL NOT count banned users toward the subscriber count if they cannot interact with the community.

### Existing Content Retention

WHEN a user unsubscribes from a community, THE system SHALL retain all posts they created in that community.

WHEN a user unsubscribes from a community, THE system SHALL retain all comments they created in that community.

THE system SHALL display the user's posts and comments in the community after they unsubscribe.

THE system SHALL attribute posts and comments to the original author even after unsubscription.

THE system SHALL allow other users to view and interact with content from users who have unsubscribed.

THE system SHALL NOT modify or hide content based on the author's current subscription status.

### Subscription Status Tracking

THE system SHALL track each user's subscription status for every community.

THE system SHALL maintain subscription status as a binary state: subscribed or not subscribed.

THE system SHALL update subscription status immediately when subscription actions occur.

THE system SHALL allow querying subscription status for any user-community pair.

THE system SHALL prevent duplicate active subscriptions for the same user-community pair.

THE system SHALL handle subscription status changes atomically to prevent race conditions.

# Detailed Validation Rules

Detailed validation rules with boundary values and format requirements.

## User Validation Rules

User registration requires a unique username that no other active account has claimed. Email addresses must be unique across all active user accounts to prevent duplicate registrations. Passwords must meet security requirements including minimum complexity standards. Email addresses must follow standard email format with valid domain structure. Usernames cannot contain special characters that would cause display or search issues. Account deletion removes all user-generated content including posts and comments from the platform. Password changes require verification of the current password before accepting a new one. Display names for profiles can be changed freely without uniqueness requirements. Bio text in user profiles has length limits to maintain readable profile pages. Avatar images must meet size and format requirements for consistent display across the platform.

### Username Validation Rules

WHEN a user registers for an account, THE system SHALL require a unique username that no other active account has claimed.

WHEN a user attempts to claim a username, THE system SHALL verify that no existing user has already registered that username.

WHEN a username contains special characters that would cause display or search issues, THE system SHALL reject the registration request.

WHEN a user attempts to use a username with uppercase letters, THE system SHALL normalize it to lowercase for storage and comparison.

WHEN a username is shorter than the minimum length requirement, THE system SHALL reject the registration request.

WHEN a username is longer than the maximum length requirement, THE system SHALL reject the registration request.

IF the desired username is already taken by another user, THE system SHALL inform the user and request a different username.

IF the desired username contains prohibited characters, THE system SHALL inform the user of the allowed character set.

THE system SHALL allow usernames to contain letters, numbers, underscores, and hyphens only.

### Email Format and Uniqueness Rules

WHEN a user registers for an account, THE system SHALL require an email address in valid format with proper domain structure.

WHEN a user provides an email address during registration, THE system SHALL verify it follows standard email format with valid domain structure.

WHEN a user attempts to register with an email address already associated with an active account, THE system SHALL reject the registration request.

WHEN a user attempts to change their email address, THE system SHALL verify the new email is not already in use by another active account.

IF the email address format is invalid, THE system SHALL reject the request and inform the user of the required format.

IF the email address is already registered to another account, THE system SHALL inform the user that the email is already in use.

THE system SHALL prevent duplicate email registrations across all active user accounts.

### Password Complexity and Change Rules

WHEN a user sets or changes their password, THE system SHALL require it to meet minimum complexity standards.

WHEN a user provides a password during registration, THE system SHALL verify it meets the established complexity requirements.

WHEN a user changes their password, THE system SHALL require verification of the current password before accepting the new password.

WHEN a user provides an incorrect current password during a password change request, THE system SHALL reject the request.

WHEN a user attempts to use a password that does not meet complexity standards, THE system SHALL reject the request and inform the user of the requirements.

IF the new password matches the current password, THE system SHALL reject the password change request.

THE system SHALL store passwords as secure hash values, not in plain text.

### Profile Information Validation Rules

WHEN a user updates their profile display name, THE system SHALL allow the change without requiring uniqueness validation.

WHEN a user provides a display name for their profile, THE system SHALL accept any text value without uniqueness requirements.

WHEN a user updates their bio text, THE system SHALL enforce length limits to maintain readable profile pages.

WHEN a user provides a bio that exceeds the maximum length limit, THE system SHALL reject the update request.

WHEN a user uploads an avatar image, THE system SHALL verify it meets size and format requirements for consistent display.

WHEN a user uploads an avatar image that exceeds the maximum file size, THE system SHALL reject the upload.

WHEN a user uploads an avatar image in an unsupported format, THE system SHALL reject the upload and inform the user of accepted formats.

IF the display name is left empty, THE system SHALL use the username as the default display name.

THE system SHALL allow users to freely change their display name without restrictions.

### Account Deletion Consequences

WHEN a user requests account deletion, THE system SHALL remove all posts created by that user from the platform.

WHEN a user requests account deletion, THE system SHALL remove all comments created by that user from the platform.

WHEN a user requests account deletion, THE system SHALL remove the user account and all associated data.

WHEN a user requests account deletion, THE system SHALL remove all votes cast by that user from posts and comments.

WHEN a user requests account deletion, THE system SHALL remove all subscriptions the user has to communities.

WHEN a user requests account deletion, THE system SHALL remove all reports created by that user.

IF the user has active posts or comments, THE system SHALL delete them along with the account.

IF the user is a community owner, THE system SHALL transfer ownership or require resolution before deletion.

THE system SHALL make account deletion permanent and irreversible.

THE system SHALL require confirmation before processing account deletion to prevent accidental data loss.

## Community Validation Rules

Community names must be unique across the entire platform to ensure clear identification. Community names cannot contain special characters that would cause URL or search issues. Community descriptions have length limits to maintain readable community pages. Icon images for communities must meet size and format requirements for consistent display. Community creation requires the user to have a valid active account. Community names cannot be modified after creation to maintain consistent references. Description text should be meaningful and relevant to the community's purpose. Icon images are optional but recommended for community recognition. Community names are case-insensitive when checking for duplicates. Empty or whitespace-only community names are not permitted during creation.

### Community Name Validation

### Community Name Uniqueness

WHEN a user creates a community, THE system SHALL verify that the community name is unique across the entire platform.

WHEN checking for duplicate community names, THE system SHALL perform case-insensitive matching to prevent variations like "TechHub" and "techhub" from coexisting.

IF the community name already exists (case-insensitive), THE system SHALL reject the creation request and inform the user that the name is unavailable.

IF the community name is empty or contains only whitespace, THE system SHALL reject the creation request.

### Community Name Character Rules

WHEN a user provides a community name, THE system SHALL validate that it contains only allowed characters.

THE system SHALL permit alphanumeric characters (a-z, A-Z, 0-9) and underscores in community names.

THE system SHALL reject community names containing special characters that would cause URL or search issues (such as spaces, @, #, $, %, &, *, etc.).

IF the community name contains disallowed special characters, THE system SHALL reject the creation request and specify which characters are invalid.

### Community Name Immutability

WHEN a community is created, THE system SHALL prevent any modification to the community name.

THE system SHALL NOT allow users (including owners and moderators) to change the community name after creation.

IF a user attempts to modify the community name, THE system SHALL reject the update request and inform the user that community names are permanent.

### Community Name Length Validation

WHEN a user creates a community, THE system SHALL validate that the community name meets minimum and maximum length requirements.

THE system SHALL reject community names that are too short to be meaningful (less than 3 characters).

THE system SHALL reject community names that exceed reasonable length limits (more than 50 characters).

IF the community name does not meet length requirements, THE system SHALL reject the request and specify the valid length range.

### Community Description Validation

### Community Description Length Limits

WHEN a user creates or updates a community, THE system SHALL validate the description text length.

THE system SHALL require a community description to be provided during community creation.

THE system SHALL reject descriptions that are too short to be meaningful (less than 10 characters).

THE system SHALL reject descriptions that exceed the maximum allowed length (500 characters).

IF the description does not meet length requirements, THE system SHALL reject the request and specify the valid length range.

### Meaningful Description Requirements

WHEN a user provides a community description, THE system SHALL validate that the content is meaningful and relevant.

THE system SHALL reject descriptions that contain only whitespace or repetitive characters.

THE system SHALL reject descriptions that appear to be spam, promotional content, or irrelevant to the community's purpose.

IF the description fails content validation, THE system SHALL reject the request and prompt the user to provide a more appropriate description.

### Community Icon Validation

### Community Icon Format Requirements

WHEN a user uploads a community icon image, THE system SHALL validate the file format.

THE system SHALL accept common image formats including JPEG, PNG, and GIF.

THE system SHALL reject files that are not valid image files or have unsupported formats.

IF the uploaded file has an invalid format, THE system SHALL reject the upload and specify the accepted formats.

### Community Icon Size Requirements

WHEN a user uploads a community icon image, THE system SHALL validate the file size.

THE system SHALL enforce a maximum file size limit of 5MB for community icons.

THE system SHALL reject files that exceed the size limit.

IF the uploaded file exceeds the size limit, THE system SHALL reject the upload and inform the user of the maximum allowed size.

### Community Icon Dimension Requirements

WHEN a user uploads a community icon image, THE system SHALL validate the image dimensions.

THE system SHALL require icons to have minimum dimensions of 100x100 pixels for consistent display quality.

THE system SHALL accept square or rectangular images, but recommend square aspect ratios for optimal display.

IF the uploaded image has insufficient dimensions, THE system SHALL reject the upload and specify the minimum required dimensions.

### Community Icon Optional Status

WHEN a user creates a community, THE system SHALL allow the icon image to be optional.

THE system SHALL permit community creation without an icon image, using a default placeholder instead.

THE system SHALL allow users to add or update the community icon after initial creation.

### Community Creation Prerequisites

### Account Status Prerequisites

WHEN a user attempts to create a community, THE system SHALL verify that the user has a valid active account.

THE system SHALL reject community creation requests from users who have deleted their accounts.

THE system SHALL reject community creation requests from users whose accounts are suspended or banned from the platform.

IF the user's account status does not permit community creation, THE system SHALL reject the request and inform the user of the account status issue.

### Authentication Prerequisites

WHEN a user attempts to create a community, THE system SHALL verify that the user is authenticated.

THE system SHALL reject community creation requests from unauthenticated (guest) users.

IF the user is not logged in, THE system SHALL redirect to the login page or reject the request with an authentication error.

### Community Creation Frequency Limits

WHEN a user creates communities, THE system SHALL track the number of communities created by each user.

THE system SHALL prevent users from creating an excessive number of communities within a short time period to prevent abuse.

IF a user exceeds the community creation rate limit, THE system SHALL temporarily block further community creation requests and inform the user of the restriction.

## Post Validation Rules

Post titles are required for all post types and cannot be empty or whitespace-only. Text posts must contain meaningful content beyond the title to be valid. Link posts require a valid URL that points to an accessible external resource. Image posts require a valid image file that meets upload requirements. All post types have length limits on their content to maintain platform performance. Post titles have maximum length restrictions to ensure proper display in feeds. Link URLs must include the protocol scheme for proper navigation. Image files must meet size and format requirements for consistent rendering. Post content cannot contain malicious code or harmful links. Users can edit their posts but must maintain required fields during editing.

### Post Title Requirements

WHEN a user creates a post, THE system SHALL require a title for all post types.

WHEN a user creates a post, THE system SHALL reject the request if the title is empty or contains only whitespace.

WHEN a user edits a post, THE system SHALL maintain the title requirement.

WHEN a user edits a post, THE system SHALL reject the request if the title becomes empty or whitespace-only.

THE system SHALL enforce title length restrictions to ensure proper display in feeds.

THE system SHALL reject post creation when the title exceeds the maximum allowed length.

THE system SHALL reject post editing when the updated title exceeds the maximum allowed length.

THE system SHALL display an appropriate error message when title validation fails.

### Text Post Content Validation

WHEN a user creates a text post, THE system SHALL require meaningful content beyond the title.

WHEN a user creates a text post, THE system SHALL reject the request if the content is empty or contains only whitespace.

WHEN a user edits a text post, THE system SHALL maintain the content requirement.

WHEN a user edits a text post, THE system SHALL reject the request if the content becomes empty or whitespace-only.

THE system SHALL enforce content length limits on text posts to maintain platform performance.

THE system SHALL reject text post creation when the content exceeds the maximum allowed length.

THE system SHALL reject text post editing when the updated content exceeds the maximum allowed length.

THE system SHALL display an appropriate error message when text post content validation fails.

### Link Post URL Validation

WHEN a user creates a link post, THE system SHALL require a valid URL.

WHEN a user creates a link post, THE system SHALL reject the request if the URL does not include the protocol scheme.

WHEN a user creates a link post, THE system SHALL validate that the URL format is correct.

WHEN a user edits a link post, THE system SHALL maintain the URL requirement.

WHEN a user edits a link post, THE system SHALL reject the request if the URL becomes invalid or missing the protocol scheme.

THE system SHALL enforce URL length limits to maintain platform performance.

THE system SHALL reject link post creation when the URL exceeds the maximum allowed length.

THE system SHALL reject link post editing when the updated URL exceeds the maximum allowed length.

THE system SHALL display an appropriate error message when link post URL validation fails.

### Image Post File Validation

WHEN a user creates an image post, THE system SHALL require a valid image file.

WHEN a user creates an image post, THE system SHALL validate that the file meets image format requirements.

WHEN a user creates an image post, THE system SHALL validate that the file meets size requirements.

WHEN a user edits an image post, THE system SHALL maintain the image file requirement.

WHEN a user edits an image post, THE system SHALL validate that any new image file meets format and size requirements.

THE system SHALL reject image post creation when the file does not meet format requirements.

THE system SHALL reject image post creation when the file exceeds size limits.

THE system SHALL display an appropriate error message when image post file validation fails.

### Post Content Length Limits

WHEN a user creates any post type, THE system SHALL enforce content length limits to maintain platform performance.

WHEN a user creates a post, THE system SHALL reject the request if the content exceeds maximum length limits.

WHEN a user edits a post, THE system SHALL enforce content length limits on the updated content.

WHEN a user edits a post, THE system SHALL reject the request if the updated content exceeds maximum length limits.

THE system SHALL apply length limits consistently across all post types.

THE system SHALL display an appropriate error message when content length validation fails.

### Malicious Content Prevention

WHEN a user creates any post type, THE system SHALL validate that the content does not contain malicious code.

WHEN a user creates any post type, THE system SHALL validate that the content does not contain harmful links.

WHEN a user creates a link post, THE system SHALL validate that the URL does not point to malicious resources.

WHEN a user edits a post, THE system SHALL validate that the updated content does not contain malicious code.

WHEN a user edits a post, THE system SHALL validate that the updated content does not contain harmful links.

THE system SHALL reject post creation when malicious or harmful content is detected.

THE system SHALL reject post editing when malicious or harmful content is detected in the update.

THE system SHALL display an appropriate error message when malicious content prevention validation fails.

### Post Editing Validation

WHEN a user edits a post, THE system SHALL maintain all required fields for the post type.

WHEN a user edits a text post, THE system SHALL require content to remain non-empty.

WHEN a user edits a link post, THE system SHALL require a valid URL with protocol scheme.

WHEN a user edits an image post, THE system SHALL require a valid image file if changed.

WHEN a user edits a post, THE system SHALL enforce title requirements on the updated title.

WHEN a user edits a post, THE system SHALL enforce content length limits on all updated fields.

WHEN a user edits a post, THE system SHALL validate that the content does not contain malicious code.

WHEN a user edits a post, THE system SHALL validate that the content does not contain harmful links.

THE system SHALL reject post editing when any validation rule fails.

THE system SHALL display an appropriate error message indicating which validation rule failed.

## Comment Validation Rules

Comment content must contain meaningful text and cannot be empty or whitespace-only. Comments have length limits to maintain readable discussion threads. Comment replies follow the same validation rules as top-level comments. Users can edit their comments but must maintain valid content during editing. Comment content cannot contain malicious code or harmful links. Very short comments may be flagged for review depending on community rules. Comment edits are tracked to maintain content history. Deleted comments are removed from all threads and reply chains. Comment content should be relevant to the post being discussed. Multiple consecutive comments from the same user may be rate-limited to prevent spam.

### Comment Content Validation

WHEN a user creates a comment, THE system SHALL:
1. Require meaningful text content that is not empty
2. Reject whitespace-only content
3. Enforce a minimum length of 10 characters for top-level comments
4. Enforce a minimum length of 5 characters for reply comments
5. Enforce a maximum length of 10,000 characters for all comments

WHEN a comment content is submitted, THE system SHALL:
1. Trim leading and trailing whitespace before validation
2. Count actual character content after trimming
3. Reject comments that do not meet minimum length requirements
4. Reject comments that exceed maximum length limits

IF a comment is shorter than the minimum length, THE system SHALL return an error indicating the minimum required length.
IF a comment exceeds the maximum length, THE system SHALL return an error indicating the maximum allowed length.

WHEN a user creates a reply to a comment, THE system SHALL:
1. Apply the same validation rules as top-level comments
2. Accept the same content formats as parent comments
3. Validate content independently of parent comment content

Comment content validation rules are defined in this section and apply uniformly to all comment types regardless of nesting depth.

### Comment Editing Requirements

WHEN a user edits their own comment, THE system SHALL:
1. Allow editing only by the comment creator
2. Apply the same content validation rules as comment creation
3. Require the edited content to meet minimum length requirements
4. Reject edits that result in empty or whitespace-only content
5. Preserve the original creation timestamp
6. Update the edit timestamp to reflect when the edit occurred

WHILE a comment is being edited, THE system SHALL:
1. Prevent other users from modifying the comment
2. Queue any concurrent edit attempts with an error message
3. Validate the new content before saving changes

IF the user attempts to edit a comment they do not own, THE system SHALL reject the request with an access denied error.
IF the edited content fails validation, THE system SHALL reject the edit and preserve the original content.

Comment edit tracking is defined in the Comment Edit Tracking section.

### Comment Edit Tracking

THE system SHALL maintain an edit history for each comment that has been modified.

WHEN a comment is edited, THE system SHALL:
1. Record the timestamp of the edit
2. Track the total number of edits made to the comment
3. Store the edit history for moderator review purposes
4. Display an "edited" indicator on the comment interface

WHEN users view a comment with edit history, THE system SHALL:
1. Show that the comment has been edited (without revealing specific changes)
2. Display the timestamp of the most recent edit
3. Allow moderators to view the complete edit history

THE system SHALL NOT expose the actual content changes to regular users.
THE system SHALL retain edit history for as long as the comment exists.

Edit tracking requirements complement comment editing requirements defined in the Comment Editing Requirements section.

### Content Safety and Moderation

WHEN a comment is submitted, THE system SHALL:
1. Scan content for malicious code patterns
2. Detect and block harmful links to known malicious domains
3. Flag comments containing suspicious patterns for moderator review
4. Reject comments with embedded executable code

WHEN a comment is very short (under 20 characters), THE system SHALL:
1. Flag the comment for potential review depending on community rules
2. Allow the comment to be posted but mark it internally
3. Enable moderators to filter flagged comments in their review queue

WHEN a comment contains content that may be irrelevant to the post, THE system SHALL:
1. Allow the comment to be posted (content relevance is a community guideline, not a hard rule)
2. Enable moderators to remove irrelevant comments using their moderation powers
3. Allow users to report irrelevant content for moderator review

IF a comment contains malicious content, THE system SHALL reject the submission immediately.
IF a comment contains suspicious patterns, THE system SHALL allow posting but flag for review.

Content relevance guidelines are community-specific and enforced through moderator actions, not automated validation.

### Deleted Comment Handling

WHEN a user deletes their own comment, THE system SHALL:
1. Remove the comment content from all display locations
2. Remove the comment from the comment thread and reply chain
3. Preserve the comment structure to maintain reply thread integrity
4. Update the parent comment's reply count
5. Remove all votes associated with the deleted comment
6. Remove all reports associated with the deleted comment

WHEN a moderator deletes a comment, THE system SHALL:
1. Remove the comment content from all display locations
2. Remove the comment from the comment thread and reply chain
3. Record the deletion in the moderation log with the moderator's identity
4. Preserve the deletion record for audit purposes

WHILE a comment is deleted, THE system SHALL:
1. Display a placeholder indicating the comment was deleted
2. Maintain the nested reply structure for remaining comments
3. Prevent any further voting or editing on the deleted comment
4. Remove the deleted comment from user profile comment lists

Deleted comments are permanently removed from all public views but may be retained in moderation logs for audit purposes.

### Spam Prevention and Rate Limiting

WHEN a user submits multiple comments in a short time period, THE system SHALL:
1. Track the number of comments posted by each user within a time window
2. Apply rate limiting when the threshold is exceeded
3. Temporarily block further comment submissions when rate limited
4. Provide clear feedback to users about the rate limit

THE system SHALL enforce the following rate limits:
1. Maximum 10 comments per minute per user
2. Maximum 50 comments per hour per user
3. Maximum 200 comments per day per user

WHEN a user is rate limited, THE system SHALL:
1. Return an error indicating the rate limit has been exceeded
2. Specify when the user can submit comments again
3. Apply the rate limit uniformly across all communities
4. Allow moderators to adjust rate limits for specific users

WHEN a user's comment pattern appears spam-like, THE system SHALL:
1. Flag the user's account for additional review
2. Optionally require additional verification before allowing more comments
3. Notify moderators of potential spam activity

Rate limiting rules apply to all comment submissions regardless of community or content type.

## Vote Validation Rules

Votes can only be upvotes or downvotes with no other vote types permitted. Each user can cast only one vote per post at any given time. Users can change their vote from upvote to downvote or vice versa. Users can remove their vote entirely to return the post to its original score. Vote changes are processed immediately and update the post score in real-time. Vote removal adjusts the post score by removing the previous vote impact. Vote records are maintained to prevent duplicate voting by the same user. Votes cannot be cast on posts by the same user who created them. Vote scores can be negative when downvotes exceed upvotes. Vote timestamps are recorded for audit and analytics purposes.

### Vote Type Validation

WHEN a user casts a vote on a post or comment, THE system SHALL:
1. Accept only two vote types: upvote or downvote
2. Reject any vote type that is not upvote or downvote
3. Record the vote type with the vote timestamp

IF a user attempts to cast a vote with an invalid type, THE system SHALL reject the request and display an error indicating only upvotes and downvotes are permitted.

THE system SHALL maintain vote type integrity by not allowing any modification to the vote type enum after creation.

### Single Vote Enforcement and Duplicate Prevention

WHEN a user attempts to vote on a post or comment, THE system SHALL:
1. Verify the user has not already cast a vote on that specific post or comment
2. Allow the vote to be recorded if no prior vote exists
3. Block duplicate votes from the same user on the same content

IF the user has already voted on the post or comment, THE system SHALL reject the request and indicate that a vote already exists.

WHEN the system detects a duplicate vote attempt, THE system SHALL:
1. Check the existing vote record for that user-content pair
2. Prevent creation of a new vote record
3. Return an error indicating the user has already voted

THE system SHALL enforce this restriction for both posts and comments equally.

### Vote Change and Removal Processing

WHEN a user changes their vote from upvote to downvote or vice versa, THE system SHALL:
1. Update the existing vote record with the new vote type
2. Adjust the post or comment score immediately to reflect the change
3. Maintain the original vote timestamp for audit purposes

WHEN a user removes their vote entirely, THE system SHALL:
1. Mark the vote as removed in the vote record
2. Adjust the post or comment score by removing the impact of the previous vote
3. Preserve the vote record to maintain voting history

IF the vote change or removal is requested, THE system SHALL:
1. Verify the user owns the vote record being modified
2. Process the change immediately and update the score in real-time
3. Confirm the score adjustment to the user

THE system SHALL ensure vote changes are atomic to prevent score inconsistencies during concurrent modifications.

### Vote Score Calculation and Recording

WHEN calculating vote scores for posts or comments, THE system SHALL:
1. Count all active upvotes as positive points
2. Count all active downvotes as negative points
3. Subtract total downvotes from total upvotes to determine the final score
4. Allow vote scores to be negative when downvotes exceed upvotes

WHILE a post or comment exists, THE system SHALL:
1. Display the current vote score to all users
2. Update the score immediately when votes are cast, changed, or removed
3. Handle negative scores without restriction or minimum threshold

WHEN recording a vote, THE system SHALL:
1. Capture the exact timestamp of the vote action
2. Store the timestamp for audit and analytics purposes
3. Maintain vote records to track voting history over time

IF a vote is removed, THE system SHALL:
1. Adjust the score by reversing the previous vote impact
2. Maintain the vote record with removal status for historical tracking
3. Update the score calculation to exclude removed votes

THE system SHALL prevent users from voting on their own posts or comments by checking the vote creator against the content creator before allowing vote submission.

## Report Validation Rules

Report reasons must contain meaningful text explaining why the content violates community guidelines. Report reasons cannot be empty or consist only of whitespace. Reports can be submitted for both posts and comments with the same validation rules. Report reasons have length limits to maintain readable moderator review queues. Reports are submitted anonymously to protect the reporting user's identity. Multiple reports for the same content are tracked but not duplicated in the review queue. Report reasons should reference specific guideline violations when possible. Vague or incomplete report reasons may be dismissed by moderators. Report submissions require the user to have an active account. Reported content remains visible until a moderator takes action on the report.

### Report Reason Validation

WHEN a user submits a report on a post or comment, THE system SHALL require a report reason containing meaningful text.

WHEN a user submits a report, THE system SHALL validate that the report reason is not empty.

WHEN a user submits a report, THE system SHALL validate that the report reason is not whitespace only.

WHEN a user submits a report, THE system SHALL enforce a minimum length of 10 characters for the report reason.

WHEN a user submits a report, THE system SHALL enforce a maximum length of 500 characters for the report reason.

WHEN a user submits a report, THE system SHALL accept report reasons that reference specific community guideline violations.

WHEN a user submits a report, THE system SHALL accept report reasons that describe observed behavior or content.

IF a report reason is shorter than 10 characters, THE system SHALL reject the report submission.

IF a report reason exceeds 500 characters, THE system SHALL reject the report submission.

IF a report reason contains only whitespace, THE system SHALL reject the report submission.

IF a report reason is empty, THE system SHALL reject the report submission.

### Anonymous Reporting Rules

WHEN a user submits a report, THE system SHALL anonymize the reporting user's identity from the reported content.

WHEN a moderator views a report, THE system SHALL display the reporting user's identity to the moderator only.

WHEN a moderator views a report, THE system SHALL NOT display the reporting user's identity to the reported content author.

WHEN a report is created, THE system SHALL store the reporting user reference internally for audit purposes.

IF a user attempts to report content anonymously as a guest, THE system SHALL reject the report submission.

IF a user account is deleted, THE system SHALL retain the report record but remove the user identity reference.

THE system SHALL protect anonymous user identity from disclosure to community members.

THE system SHALL protect anonymous user identity from disclosure to community moderators outside their own reports.

### Duplicate Report Handling

WHEN a user submits a report on content, THE system SHALL check for existing pending reports from the same user on the same content.

WHEN a duplicate report is detected from the same user on the same content, THE system SHALL reject the new report submission.

WHEN multiple users report the same content, THE system SHALL create separate report entries for each reporting user.

WHEN a report is approved, THE system SHALL mark all pending reports on the same content as resolved.

WHEN a report is dismissed, THE system SHALL NOT automatically dismiss other reports on the same content.

THE system SHALL maintain a count of total reports per content item for moderator priority assessment.

THE system SHALL track report duplicates to prevent spam from individual users.

### Report Submission Prerequisites

WHEN a user attempts to submit a report, THE system SHALL verify the user has an active account.

WHEN a user attempts to submit a report, THE system SHALL verify the user is logged in.

WHEN a user attempts to submit a report on a post, THE system SHALL verify the post exists.

WHEN a user attempts to submit a report on a comment, THE system SHALL verify the comment exists.

IF a user account is banned from the platform, THE system SHALL reject report submissions from that user.

IF the reported content does not exist, THE system SHALL reject the report submission.

IF the user is not authenticated, THE system SHALL reject the report submission.

THE system SHALL require authentication before allowing report submissions.

### Report Queue Management

WHEN a report is submitted, THE system SHALL add it to the pending reports queue for the relevant community.

WHEN a moderator views reports, THE system SHALL display reports sorted by submission timestamp (newest first).

WHEN a moderator views reports, THE system SHALL display reports filtered by status (pending, approved, dismissed).

WHEN a moderator approves a report, THE system SHALL remove the report from the pending queue.

WHEN a moderator dismisses a report, THE system SHALL remove the report from the pending queue.

WHEN a report queue exceeds 100 pending reports, THE system SHALL flag the community for priority review.

THE system SHALL provide moderators with a count of pending reports for each community they moderate.

THE system SHALL maintain report history for moderator audit trails.

### Pending Content Visibility Rules

WHEN a report is pending review, THE system SHALL keep the reported content visible to all users.

WHEN a report is approved by a moderator, THE system SHALL delete the reported content.

WHEN a report is dismissed by a moderator, THE system SHALL keep the reported content visible.

WHEN content is deleted due to an approved report, THE system SHALL notify the content author of the deletion.

WHEN content is deleted due to an approved report, THE system SHALL NOT disclose the reporting user identity to the content author.

IF a report remains pending for more than 7 days, THE system SHALL notify community moderators of the backlog.

THE system SHALL ensure reported content remains accessible during the review process.

THE system SHALL prevent content deletion until a moderator explicitly approves the report.

## Subscription Validation Rules

Users can only subscribe to communities that exist on the platform. Users cannot subscribe to the same community more than once. Users can unsubscribe from any community they are currently subscribed to. Subscription requires the user to have an active account in good standing. Banned users cannot subscribe to the community that banned them. Subscription status is checked before allowing post creation in a community. Unsubscribing removes the user from the community feed immediately. Users can view their subscription list to manage their community following. Subscription counts are updated in real-time when users subscribe or unsubscribe. Subscription records are maintained to track community membership history.

### Community Existence Validation

WHEN a user attempts to subscribe to a community, THE system SHALL verify that the community exists on the platform.

IF the community does not exist, THE system SHALL reject the subscription request.

IF the community has been deleted, THE system SHALL reject the subscription request.

THE system SHALL validate the community identifier before processing any subscription operation.

THE system SHALL provide clear feedback when a community cannot be found.

### Duplicate Subscription Prevention

WHEN a user attempts to subscribe to a community, THE system SHALL check for existing subscription records.

IF the user already has an active subscription to the community, THE system SHALL reject the duplicate subscription request.

THE system SHALL prevent users from creating multiple subscription records for the same community.

IF a subscription record exists but is inactive (unsubscribed), THE system SHALL allow re-subscription.

THE system SHALL return a clear error when a duplicate subscription is attempted.

### Subscription Removal Rules

WHEN a user unsubscribes from a community, THE system SHALL remove the subscription record.

THE system SHALL allow users to unsubscribe from any community they are currently subscribed to.

IF a user unsubscribes, THE system SHALL immediately remove them from the community subscriber list.

THE system SHALL NOT require a reason for unsubscribing from a community.

IF a user unsubscribes, THE system SHALL prevent their posts from appearing in their home feed from that community.

THE system SHALL allow users to re-subscribe to a community after unsubscribing.

### Account Status Requirements

WHEN a user attempts to subscribe to a community, THE system SHALL verify the user account is active.

IF the user account has been deleted, THE system SHALL reject the subscription request.

IF the user account is in good standing, THE system SHALL allow the subscription.

THE system SHALL validate account status before processing any subscription operation.

IF the user account has been suspended, THE system SHALL reject the subscription request.

### Ban Status Subscription Restrictions

WHEN a user is banned from a community, THE system SHALL prevent them from subscribing to that community.

IF a banned user attempts to subscribe, THE system SHALL reject the subscription request.

WHEN a ban is lifted, THE system SHALL allow the user to subscribe to the community again.

THE system SHALL maintain ban records to enforce subscription restrictions.

IF a user subscribes and is later banned, THE system SHALL automatically remove their subscription.

THE system SHALL prevent banned users from appearing in the community subscriber list.

### Subscription Prerequisite Checks

WHEN a user attempts to create a post in a community, THE system SHALL verify subscription status.

IF the user is not subscribed to the community, THE system SHALL reject the post creation request.

THE system SHALL check subscription status before allowing any post creation in a community.

IF the user is subscribed, THE system SHALL allow post creation in that community.

THE system SHALL provide clear feedback when a subscription is required to post.

IF a user unsubscribes after creating posts, THE system SHALL NOT remove their existing posts.

### Subscription Feed Updates

WHEN a user subscribes to a community, THE system SHALL update their home feed immediately.

WHEN a user unsubscribes from a community, THE system SHALL remove posts from that community from their home feed.

THE system SHALL ensure the home feed reflects current subscription status at all times.

IF subscription status changes, THE system SHALL update feed visibility within the same session.

THE system SHALL NOT display posts from unsubscribed communities in the home feed.

### Subscription List Management

WHEN a user views their profile, THE system SHALL display a list of all communities they are subscribed to.

THE system SHALL allow users to access their subscription list from their profile page.

IF the subscription list is empty, THE system SHALL display an appropriate message.

THE system SHALL allow users to unsubscribe directly from their subscription list.

THE system SHALL display the subscription count for each community in the list.

THE system SHALL allow users to sort their subscription list by community name or subscription date.

### Real-Time Count Updates

WHEN a user subscribes to a community, THE system SHALL increment the subscriber count immediately.

WHEN a user unsubscribes from a community, THE system SHALL decrement the subscriber count immediately.

THE system SHALL display the current subscriber count on the community page.

IF the subscriber count changes, THE system SHALL update it in real-time for all viewers.

THE system SHALL ensure subscriber count accuracy across all community views.

THE system SHALL prevent subscriber count from displaying negative values.

### Subscription History Tracking

THE system SHALL maintain a record of all subscription and unsubscription events.

THE system SHALL track the timestamp when a user subscribes to a community.

THE system SHALL track the timestamp when a user unsubscribes from a community.

THE system SHALL allow moderators to view subscription history for analytics purposes.

THE system SHALL retain subscription history for community membership analysis.

THE system SHALL NOT expose individual subscription history to regular users.

THE system SHALL ensure subscription history is maintained even after account deletion.

# Filtering, Sorting, and Pagination

List query specifications for filtering, sorting, and pagination.

## List Query Specifications

Define filtering, sorting, and pagination rules for list operations.

### Feed Filtering Rules

WHEN a user requests the Home Feed, THE system SHALL return posts only from communities the user is subscribed to.

WHEN a guest user requests the Home Feed, THE system SHALL reject the request.

WHEN a user requests the Popular Feed, THE system SHALL return posts from all communities across the platform.

WHEN a user requests the Community Feed for a specific community, THE system SHALL return posts from that community only.

WHEN a user requests posts from a community they are banned from, THE system SHALL still return the posts in the feed (banned users can view content).

WHEN filtering posts by community, THE system SHALL include all posts regardless of the viewer's subscription status.

IF the requested community does not exist, THE system SHALL return an empty feed.

IF the user is not subscribed to any communities, THE system SHALL return an empty Home Feed.

### Sorting Options

WHEN a user requests posts with Hot sorting, THE system SHALL order posts by recency combined with upvote count, with recent posts having many upvotes appearing first.

WHEN a user requests posts with New sorting, THE system SHALL order posts by creation timestamp, with most recently created posts appearing first.

WHEN a user requests posts with Top sorting, THE system SHALL order posts by vote score in descending order.

WHEN a user requests posts with Top sorting and specifies a time filter, THE system SHALL include only posts created within the specified time period (today, this week, this month, this year, or all time).

WHEN a user requests posts with Controversial sorting, THE system SHALL order posts by vote volume with scores close to zero appearing first.

WHEN sorting comments on a post with Best sorting, THE system SHALL order comments by vote score in descending order.

WHEN sorting comments on a post with New sorting, THE system SHALL order comments by creation timestamp, with most recent first.

WHEN sorting comments on a post with Controversial sorting, THE system SHALL order comments by vote volume with scores close to zero appearing first.

IF an invalid sort option is requested, THE system SHALL return an error.

IF an invalid time filter is requested with Top sorting, THE system SHALL return an error.

### Pagination Rules

WHEN a user requests a feed, THE system SHALL return a paginated list of posts.

WHEN paginating through feeds, THE system SHALL use cursor-based pagination to ensure consistent results.

WHEN a user requests the next page of results, THE system SHALL use the cursor from the previous response to fetch the subsequent page.

WHEN a user requests the first page, THE system SHALL return the initial set of results without requiring a cursor.

WHEN pagination reaches the end of available results, THE system SHALL indicate that no more results are available.

WHEN sorting or filtering criteria change, THE system SHALL reset the pagination cursor to the beginning.

IF a cursor is invalid or expired, THE system SHALL return an error and indicate the user should start from the first page.

WHEN displaying posts in a feed, THE system SHALL show the title, author username, community name, vote score, comment count, time since posted, and content preview (first 200 characters for text posts, thumbnail for image posts, domain name for link posts).

### Query Parameters

WHEN querying feeds, THE system SHALL accept a sort parameter to specify the sorting method (hot, new, top, controversial).

WHEN querying feeds with Top sorting, THE system SHALL accept a time filter parameter (today, this week, this month, this year, all time).

WHEN querying feeds, THE system SHALL accept a cursor parameter for pagination.

WHEN querying feeds, THE system SHALL accept a limit parameter to specify the number of results per page.

WHEN querying a specific community feed, THE system SHALL accept a community identifier parameter.

WHEN querying comments on a post, THE system SHALL accept a sort parameter (best, new, controversial).

WHEN querying comments on a post, THE system SHALL accept a cursor parameter for pagination.

WHEN querying comments on a post, THE system SHALL accept a limit parameter to specify the number of results per page.

IF required query parameters are missing, THE system SHALL return an error.

IF query parameters contain invalid values, THE system SHALL return an error with a description of the invalid parameter.

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### Authentication and Account Errors

WHEN a user attempts to register with an email that already exists, THE system SHALL reject the registration request.

WHEN a user attempts to register with a username that already exists, THE system SHALL reject the registration request.

WHEN a user attempts to log in with incorrect credentials, THE system SHALL reject the login attempt.

WHEN a user attempts to log in with an unverified email, THE system SHALL reject the login attempt.

WHEN a user attempts to change their password without providing the current password, THE system SHALL reject the password change request.

WHEN a user attempts to change their password to the same password, THE system SHALL reject the password change request.

WHEN a user attempts to delete their account while having active subscriptions, THE system SHALL proceed with deletion after removing all subscriptions.

IF a user's session expires during an authenticated operation, THE system SHALL reject the operation and require re-authentication.

IF a user attempts to access another user's private profile data, THE system SHALL deny access and display only public information.

### Community and Subscription Errors

WHEN a user attempts to create a community with a name that already exists, THE system SHALL reject the community creation request.

WHEN a user attempts to create a community with an empty name, THE system SHALL reject the community creation request.

WHEN a user attempts to create a community with an invalid name format, THE system SHALL reject the community creation request.

WHEN a non-owner attempts to remove the community owner, THE system SHALL reject the removal request.

WHEN a moderator attempts to remove another moderator, THE system SHALL reject the removal request.

WHEN a user attempts to subscribe to a community that does not exist, THE system SHALL reject the subscription request.

WHEN a user attempts to unsubscribe from a community they are not subscribed to, THE system SHALL reject the unsubscribe request.

WHEN a banned user attempts to subscribe to the community that banned them, THE system SHALL reject the subscription request.

WHEN a user attempts to view a community that does not exist, THE system SHALL display a not found error.

### Post Creation and Management Errors

WHEN a user attempts to create a post in a community they are not subscribed to, THE system SHALL reject the post creation request.

WHEN a user attempts to create a post without a title, THE system SHALL reject the post creation request.

WHEN a user attempts to create a text post without content, THE system SHALL reject the post creation request.

WHEN a user attempts to create a link post without a valid URL, THE system SHALL reject the post creation request.

WHEN a user attempts to create an image post without an image file, THE system SHALL reject the post creation request.

WHEN a banned user attempts to create a post in the community that banned them, THE system SHALL reject the post creation request.

WHEN a user attempts to edit a post they do not own, THE system SHALL reject the edit request.

WHEN a user attempts to delete a post they do not own, THE system SHALL reject the deletion request.

WHEN a user attempts to view a post that does not exist, THE system SHALL display a not found error.

WHEN a user attempts to access a post in a community that has been deleted, THE system SHALL display an error indicating the content is unavailable.

### Comment Creation and Management Errors

WHEN a user attempts to create a comment without content, THE system SHALL reject the comment creation request.

WHEN a banned user attempts to create a comment in the community that banned them, THE system SHALL reject the comment creation request.

WHEN a user attempts to edit a comment they do not own, THE system SHALL reject the edit request.

WHEN a user attempts to delete a comment they do not own, THE system SHALL reject the deletion request.

WHEN a user attempts to reply to a deleted comment, THE system SHALL reject the reply request.

WHEN a user attempts to view a comment that does not exist, THE system SHALL display a not found error.

WHEN a comment chain becomes too deep and causes performance issues, THE system SHALL truncate the display while maintaining data integrity.

### Voting and Karma Errors

WHEN a user attempts to vote on a post they have already voted on, THE system SHALL update their existing vote instead of creating a duplicate.

WHEN a user attempts to vote on a post that does not exist, THE system SHALL reject the vote request.

WHEN a user attempts to vote on a post in a community that has been deleted, THE system SHALL reject the vote request.

WHEN a user attempts to change their vote from upvote to downvote, THE system SHALL adjust the karma score by 2 points.

WHEN a user attempts to change their vote from downvote to upvote, THE system SHALL adjust the karma score by 2 points.

WHEN a user attempts to remove their vote, THE system SHALL adjust the karma score accordingly.

WHEN a vote is cast on a deleted post or comment, THE system SHALL remove the vote and adjust karma scores.

IF multiple votes are cast simultaneously on the same content, THE system SHALL process them sequentially to maintain score accuracy.

### Reporting and Moderation Errors

WHEN a user attempts to report a post without providing a reason, THE system SHALL reject the report submission.

WHEN a user attempts to report a post that does not exist, THE system SHALL reject the report submission.

WHEN a user attempts to report content in a community where they are banned, THE system SHALL reject the report submission.

WHEN a moderator attempts to approve a report for content that does not exist, THE system SHALL reject the approval action.

WHEN a moderator attempts to approve a report for content they do not have authority over, THE system SHALL reject the approval action.

WHEN a moderator attempts to dismiss a report that has already been resolved, THE system SHALL reject the dismissal action.

WHEN a user attempts to view reports for a community they do not moderate, THE system SHALL deny access.

WHEN a report is approved and the content is deleted, THE system SHALL mark the report as approved and remove the reported content.

IF a reported post has multiple reports, THE system SHALL process each report independently and display all reports to moderators.

### Feed and Query Errors

WHEN a user attempts to access the home feed while not logged in, THE system SHALL redirect them to the popular feed.

WHEN a user attempts to view a feed with an invalid sort option, THE system SHALL default to the 'hot' sort option.

WHEN a user requests a pagination page that exceeds available content, THE system SHALL return the last available page.

WHEN a user requests pagination with an invalid page number, THE system SHALL return the first page.

WHEN a search query returns no results for communities, THE system SHALL display an empty results message.

WHEN a feed request times out due to high load, THE system SHALL display a retry option to the user.

WHEN a user attempts to filter by a date range that produces no results, THE system SHALL display an empty results message.

IF a community feed contains no posts, THE system SHALL display a message indicating no posts are available.

# File Validation Rules

Validation rules and policies for file uploads and storage.

## File Validation and Policies

Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.

### File Upload Validation

WHEN a user uploads an avatar image, THE system SHALL validate that the file size does not exceed 5MB.
WHEN a user uploads a community icon, THE system SHALL validate that the file size does not exceed 2MB.
WHEN a user uploads a post image, THE system SHALL validate that the file size does not exceed 10MB.

IF the uploaded file exceeds the size limit for its type, THE system SHALL reject the upload and display an error message indicating the maximum allowed size.
IF the upload process fails due to network interruption, THE system SHALL allow the user to retry the upload.

THE system SHALL validate that uploaded files are complete and not corrupted before storing them.

### Virus Scanning Requirements

WHEN a file is uploaded to the system, THE system SHALL scan it for malware before making it accessible to users.
WHEN a virus or malware is detected in an uploaded file, THE system SHALL quarantine the file and prevent it from being displayed.

IF a file fails the virus scan, THE system SHALL notify the uploader that the upload was rejected due to security concerns.
IF a file is flagged as suspicious but not confirmed malicious, THE system SHALL hold it for manual review by moderators.

THE system SHALL log all virus scan results for audit purposes, including the file identifier, scan timestamp, and result.

### Content-Type Restrictions

WHEN a user uploads an avatar image, THE system SHALL accept only JPEG, PNG, or GIF file formats.
WHEN a user uploads a community icon, THE system SHALL accept only JPEG, PNG, or SVG file formats.
WHEN a user uploads a post image, THE system SHALL accept only JPEG, PNG, GIF, or WebP file formats.

IF a user attempts to upload a file with an unsupported content type, THE system SHALL reject the upload and display an error message listing the accepted formats.
THE system SHALL verify the actual file content matches the declared content type to prevent format spoofing.

WHEN displaying uploaded images, THE system SHALL serve them with the appropriate content-type header for browser rendering.

### File Retention Policies

THE system SHALL retain user avatar images for as long as the user account exists.
THE system SHALL retain community icon images for as long as the community exists.
THE system SHALL retain post images for as long as the post exists.

WHEN a user deletes their account, THE system SHALL permanently delete all their uploaded avatar images within 30 days.
WHEN a community is deleted, THE system SHALL permanently delete the community icon within 30 days.
WHEN a post is deleted, THE system SHALL permanently delete its associated image within 30 days.

IF an uploaded file has not been accessed for 12 months and its parent entity (user, community, or post) has been deleted, THE system SHALL automatically purge the file from storage.

THE system SHALL maintain a backup of deleted files for 7 days before permanent removal to allow for recovery in case of accidental deletion.