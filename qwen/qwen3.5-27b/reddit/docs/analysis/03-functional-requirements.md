**redditClone — What operations users can perform, use cases, business workflows**

What operations users can perform, use cases, business workflows

# Core Business Operations

What the system must do for each business concept.

## User Operations

Users sign up with email and password, and choose a unique username. Users log in with email and password to access the platform. Users can change their password at any time to maintain account security. Users can delete their account, and when they do, all their posts and comments are also deleted. Each user has a profile with display name, bio text, and avatar image. Users can edit their own display name, bio, and avatar. Users can view any other user's profile page. A user's profile page shows their display name, bio, and avatar. The profile also displays their total karma score. The profile shows a list of all posts they have created. The profile shows a list of all comments they have written.

### User Account Creation

THE system SHALL allow users to create an account by providing an email address, a password, and a username.

THE system SHALL associate the provided email address, password, and username with the newly created user account.

THE system SHALL make the user account available for authentication after successful creation.

### User Authentication

THE system SHALL allow users to log in by providing their registered email address and password.

THE system SHALL verify the provided email and password against registered user accounts.

THE system SHALL grant access to the platform when valid credentials are provided.

THE system SHALL maintain the user's authenticated session after successful login.

IF the user is a guest, THEN THE system SHALL NOT allow the user to vote on posts or comments.

### Password Management

THE system SHALL allow logged-in users to change their password.

THE system SHALL require users to provide their current password and a new password when changing their password.

THE system SHALL update the user's password upon successful validation.

THE system SHALL use the updated password for subsequent authentication attempts.

### Account Deletion

THE system SHALL allow users to delete their account.

THE system SHALL permanently delete all posts created by the user when their account is deleted.

THE system SHALL permanently delete all comments written by the user when their account is deleted.

THE system SHALL permanently remove the user account and all associated content upon account deletion.

THE system SHALL not allow recovery of deleted accounts, posts, or comments.

### Profile Information Management

THE system SHALL allow users to view and edit their own profile information.

THE system SHALL allow users to update their display name.

THE system SHALL allow users to update their bio text.

THE system SHALL save the updated profile information and make it visible to other users.

### User Profile Viewing

THE system SHALL allow any user to view another user's profile page.

THE system SHALL display the user's display name on their profile page.

THE system SHALL display the user's bio text on their profile page.

THE system SHALL display a list of all posts created by the user on their profile page.

THE system SHALL display a list of all comments written by the user on their profile page.

## Community Operations

Any user can create a community on the platform. A community has a unique name, description text, and icon image. The user who creates a community becomes its owner. Users can browse all communities in a list view. Users can search for communities by name to find specific ones. Each community displays its subscriber count to show popularity. Community names must be unique across the entire platform. The owner maintains highest authority over the community.

### Community Creation

THE system SHALL allow any user to create a new community.

THE system SHALL require the community name, description text, and icon image when creating a community.

THE system SHALL ensure the community name is unique across the entire platform.

THE system SHALL assign the creating user as the owner of the new community.

THE system SHALL make the newly created community immediately visible in the community browsing list.

IF the community name already exists, THEN THE system SHALL reject the community creation request.

IF any required field is missing, THEN THE system SHALL reject the community creation request.

### Community Browsing

THE system SHALL display a list of all communities to all users.

THE system SHALL show the community name, description, icon, and subscriber count for each community in the list.

THE system SHALL allow users to search for communities by name.

THE system SHALL return communities whose names contain the search terms.

IF no communities match the search query, THEN THE system SHALL display an empty result.

THE system SHALL update the subscriber count to reflect the total number of subscribed users for each community.

### Community Ownership

THE system SHALL designate the user who creates a community as its permanent owner.

THE system SHALL grant the owner the highest authority in the community.

THE system SHALL prevent ownership transfer to another user.

THE system SHALL prevent any user from removing the owner from the community.

THE system SHALL allow only the owner to remove moderators from the community.

WHEN the owner deletes their account, THE system SHALL permanently delete the community and all its content with no recovery possible.

## Post Operations

Users can create a post in any community they are subscribed to. Every post has a title, which is required. A post must be one of three types: text post with text content, link post with a URL, or image post with an uploaded image. Users can edit their own posts to update content. Users can delete their own posts when desired. When viewing a single post, users see the title and full content. Users also see the author username and community name. The post displays vote score and comment count. The post shows when it was posted.

### Post Creation

THE system SHALL allow users to create posts only in communities they are subscribed to.

THE system SHALL require a title for every post created.

THE system SHALL support three post types: text posts with text content, link posts with a URL, and image posts with an uploaded image.

THE system SHALL associate each post with the user who created it.

THE system SHALL associate each post with the community where it was created.

THE system SHALL record when each post was created.

### Post Editing

THE system SHALL allow users to edit their own posts.

THE system SHALL allow users to update the title of their posts.

THE system SHALL allow users to update the content of their posts.

THE system SHALL preserve the original creation timestamp when a post is edited.

### Post Deletion

THE system SHALL allow users to delete their own posts.

THE system SHALL remove all votes on a deleted post.

THE system SHALL remove all comments on a deleted post.

THE system SHALL remove all reports on a deleted post.

THE system SHALL adjust karma scores when a post is deleted.

### Post Viewing

THE system SHALL display the title of a post when viewing it.

THE system SHALL display the full content of a post when viewing it.

THE system SHALL display the author's username when viewing a post.

THE system SHALL display the community name when viewing a post.

THE system SHALL display the vote score when viewing a post.

THE system SHALL display the comment count when viewing a post.

THE system SHALL display when the post was created when viewing it.

## Comment Operations

Users can write a comment on any post in the platform. Users can reply to any existing comment to continue discussions. Replies can have replies, with no depth limit on nesting. Users can edit their own comments to update content. Users can delete their own comments when needed. Each comment shows the author username and comment content. Comments display vote score and time since posted. Comments show nested replies in a threaded structure.

### Comment Creation on Posts

THE system SHALL allow authenticated users (members and moderators) to create a comment on any post in the platform.

IF a guest attempts to create a comment, THE system SHALL reject the request.

WHEN a user creates a comment, THE system SHALL require the comment to contain text content.

WHEN a user creates a comment, THE system SHALL automatically associate the comment with the user who created it.

WHEN a user creates a comment, THE system SHALL record when the comment was created.

WHEN a user creates a comment, THE system SHALL make the comment immediately visible to other users.

### Comment Reply Capability

THE system SHALL allow authenticated users (members and moderators) to reply to any existing comment to continue discussions.

IF a guest attempts to reply to a comment, THE system SHALL reject the request.

WHEN a user replies to a comment, THE system SHALL associate the reply with the parent comment.

THE system SHALL allow replies to have replies, with no depth limit on nesting.

WHEN a user creates a reply, THE system SHALL preserve the hierarchical relationship between the reply and its parent comment.

### Comment Editing

THE system SHALL allow users to edit their own comments to update the content.

WHEN a user edits a comment, THE system SHALL replace the previous content with the updated content.

WHEN a user edits a comment, THE system SHALL maintain the original creation time of the comment.

IF a user attempts to edit a comment created by another user, THE system SHALL reject the edit request.

### Comment Deletion

THE system SHALL allow users to delete their own comments when needed.

WHEN a user deletes a comment, THE system SHALL also delete all replies to that comment.

WHEN a comment is deleted, THE system SHALL remove the comment from all views.

IF a user attempts to delete a comment created by another user, THE system SHALL reject the deletion request.

### Comment Display Information

THE system SHALL display the author username for each comment.

THE system SHALL display the full comment content for each comment.

THE system SHALL display the vote score for each comment.

THE system SHALL display the time since the comment was posted for each comment.

### Threaded Comment Viewing

THE system SHALL display comments with nested replies in a threaded structure.

THE system SHALL display replies indented under their parent comment.

THE system SHALL allow users to view the complete thread of a comment and all its replies.

THE system SHALL preserve the hierarchical relationship between comments at any nesting depth in the threaded view.

THE system SHALL allow users to navigate through the threaded comments to follow discussion branches.

## Vote Operations

Users can upvote a post, which adds one to the score. Users can downvote a post, which subtracts one from the score. Each user can only vote once per post. Users can change their vote from upvote to downvote or vice versa. Users can remove their vote entirely. Vote score equals total upvotes minus total downvotes. When someone upvotes a post or comment, the author's karma increases by one. When someone downvotes, karma decreases by one. When someone removes their vote, karma adjusts accordingly.

### Post Voting Operations

THE system SHALL allow members to upvote any post they can view, which adds one to the post's vote score.

THE system SHALL allow members to downvote any post they can view, which subtracts one from the post's vote score.

THE system SHALL allow each member to cast only one vote per post at any given time.

THE system SHALL allow members to change their existing vote on a post from upvote to downvote or from downvote to upvote.

THE system SHALL allow members to remove their vote entirely from a post, leaving the post without their vote.

WHEN a member changes their vote from upvote to downvote, THE system SHALL decrease the post's vote score by two.

WHEN a member changes their vote from downvote to upvote, THE system SHALL increase the post's vote score by two.

WHEN a member removes their upvote, THE system SHALL decrease the post's vote score by one.

WHEN a member removes their downvote, THE system SHALL increase the post's vote score by one.

IF a guest attempts to cast a vote on a post, THEN THE system SHALL prevent the vote.

THE system SHALL allow guests to view vote scores on posts without logging in.

### Comment Voting Operations

THE system SHALL allow members to upvote any comment they can view, which adds one to the comment's vote score.

THE system SHALL allow members to downvote any comment they can view, which subtracts one from the comment's vote score.

THE system SHALL allow each member to cast only one vote per comment at any given time.

THE system SHALL allow members to change their existing vote on a comment from upvote to downvote or from downvote to upvote.

THE system SHALL allow members to remove their vote entirely from a comment, leaving the comment without their vote.

WHEN a member changes their vote from upvote to downvote, THE system SHALL decrease the comment's vote score by two.

WHEN a member changes their vote from downvote to upvote, THE system SHALL increase the comment's vote score by two.

WHEN a member removes their upvote, THE system SHALL decrease the comment's vote score by one.

WHEN a member removes their downvote, THE system SHALL increase the comment's vote score by one.

IF a guest attempts to cast a vote on a comment, THEN THE system SHALL prevent the vote.

THE system SHALL allow guests to view vote scores on comments without logging in.

### Vote Score Calculation

THE system SHALL calculate the vote score for a post as the total number of upvotes minus the total number of downvotes.

THE system SHALL calculate the vote score for a comment as the total number of upvotes minus the total number of downvotes.

THE system SHALL allow vote scores to be positive, negative, or zero.

WHEN a vote is cast, THE system SHALL update the vote score immediately to reflect the new total.

WHEN a vote is changed, THE system SHALL update the vote score immediately to reflect the change.

WHEN a vote is removed, THE system SHALL update the vote score immediately to reflect the removal.

THE system SHALL maintain vote scores for all posts and comments, regardless of whether they have received any votes.

### Karma Impact from Votes

WHEN a member upvotes another user's post, THE system SHALL increase that user's karma score by one.

WHEN a member downvotes another user's post, THE system SHALL decrease that user's karma score by one.

WHEN a member upvotes another user's comment, THE system SHALL increase that user's karma score by one.

WHEN a member downvotes another user's comment, THE system SHALL decrease that user's karma score by one.

WHEN a member removes their upvote on another user's post, THE system SHALL decrease that user's karma score by one.

WHEN a member removes their downvote on another user's post, THE system SHALL increase that user's karma score by one.

WHEN a member removes their upvote on another user's comment, THE system SHALL decrease that user's karma score by one.

WHEN a member removes their downvote on another user's comment, THE system SHALL increase that user's karma score by one.

WHEN a member changes their vote from upvote to downvote on another user's post or comment, THE system SHALL decrease that user's karma score by two.

WHEN a member changes their vote from downvote to upvote on another user's post or comment, THE system SHALL increase that user's karma score by two.

THE system SHALL allow karma scores to be positive, negative, or zero.

THE system SHALL maintain a single karma score for each user that aggregates all votes received on their posts and comments.

### Vote Score Display

THE system SHALL display the current vote score for each post in a post list.

THE system SHALL display the current vote score for a post when viewing a single post.

THE system SHALL display the current vote score for a comment when viewing the comment.

THE system SHALL display the total karma score when viewing a user profile.

THE system SHALL make vote scores visible to all users, including guests who are not logged in.

THE system SHALL display vote scores as whole numbers without decimal places.

## Subscription Operations

Users can subscribe to any community on the platform. Users can unsubscribe from any community they are subscribed to. Users can view a list of all communities they are subscribed to. Subscribing is required before users can create posts in that community. The system tracks when users subscribe to communities. Users can access their subscribed communities to view posts from all of them. Subscription status determines whether users can participate in community posting.

### Community Subscription Creation

THE system SHALL allow any user to subscribe to any community on the platform.

THE system SHALL record the time when a user subscribes to a community.

THE system SHALL prevent duplicate subscriptions to the same community by the same user.

WHEN a user subscribes to a community, THE system SHALL add that community to the user's subscribed communities list.

WHEN a user subscribes to a community, THE system SHALL update the community's subscriber count.

### Community Unsubscription

THE system SHALL allow any user to unsubscribe from any community they are subscribed to.

WHEN a user unsubscribes from a community, THE system SHALL remove that community from the user's subscribed communities list.

WHEN a user unsubscribes from a community, THE system SHALL update the community's subscriber count.

WHEN a user attempts to unsubscribe from a community they are not subscribed to, THE system SHALL reject the request.

### Subscribed Communities List

THE system SHALL allow users to view a list of all communities they are subscribed to.

THE system SHALL display each subscribed community with its name, description, and icon.

THE system SHALL display the subscriber count for each community in the list.

WHEN a user has no subscribed communities, THE system SHALL display an empty list.

### Subscription Requirement for Posting

THE system SHALL require users to be subscribed to a community before they can create posts in that community.

WHEN a user attempts to create a post in a community they are not subscribed to, THE system SHALL reject the request.

THE system SHALL check subscription status before allowing post creation in any community.

WHEN a user is banned from a community, THE system SHALL prevent them from creating posts regardless of subscription status.

### Home Feed Subscription Filtering

THE system SHALL show posts only from communities the user is subscribed to in the home feed.

THE system SHALL make the home feed available only to logged-in users.

WHEN a user has no subscribed communities, THE system SHALL display an empty home feed.

THE system SHALL apply the same sorting options to the home feed as other feeds: hot, new, top, and controversial.

THE system SHALL paginate the home feed results.

## Moderation Operations

The community creator is the owner with highest authority. The owner can add moderators to help manage the community. The owner can remove moderators when needed. Moderators can add other moderators to expand the team. Moderators cannot remove the owner under any circumstances. Moderators cannot remove other moderators from the team. Moderators can delete any post in their community. Moderators can delete any comment in their community. Moderators can view all reports submitted for their community.

### Moderation Role Hierarchy

THE system SHALL designate the user who creates a community as its owner with the highest authority level.

THE owner SHALL be able to add other users as moderators to the community.

THE owner SHALL be able to permanently remove moderators from the community at any time with no possibility of recovery.

A moderator SHALL be able to add other users as moderators to the community.

THE system SHALL prevent any moderator from removing the owner from the community.

THE system SHALL prevent any moderator from removing other moderators from the community.

THE system SHALL ensure that only the owner can permanently remove moderators from the community.

THE owner SHALL retain full control over the community regardless of moderator actions.

THE system SHALL permanently remove a moderator from the community when the owner removes them, with no possibility of recovery.

### Content Moderation Actions

A moderator SHALL be able to permanently delete any post in their community regardless of who created it.

A moderator SHALL be able to permanently delete any comment in their community regardless of who created it.

THE system SHALL permanently remove the deleted post from all community feeds and views with no possibility of recovery.

THE system SHALL permanently remove the deleted comment from the post thread and all views with no possibility of recovery.

### Report Review Process

A moderator SHALL be able to view all reports submitted for their community.

THE system SHALL display the reported content to the moderator when viewing a report.

THE system SHALL show which user submitted each report.

THE system SHALL display the reason provided by the user when they reported the content.

A moderator SHALL be able to approve a report, which results in permanent deletion of the reported content with no possibility of recovery.

A moderator SHALL be able to dismiss a report, which keeps the reported content active.

THE system SHALL remove dismissed reports from the report list after dismissal.

## Ban Operations

Moderators can ban users from their community to prevent participation. Moderators can unban users to restore their participation rights. Moderators can view the list of banned users in their community. Banned users cannot create posts in that community. Banned users cannot create comments in that community. Banned users can still view content in the community. The ban applies only to the specific community that issued it.

### Banning Users

WHEN a moderator identifies a user violating community rules, THE system SHALL allow the moderator to ban that user from the community.

THE system SHALL record which moderator issued the ban.

THE system SHALL record when the ban was issued.

THE system SHALL allow the community owner to ban any user in their community.

THE system SHALL allow moderators to ban users in communities where they have moderator privileges.

### Unbanning Users

WHEN a moderator decides to restore a user's participation rights, THE system SHALL allow the moderator to unban that user from the community.

THE system SHALL record which moderator removed the ban.

THE system SHALL record when the ban was removed.

THE system SHALL allow the community owner to unban any user in their community.

THE system SHALL allow moderators to unban users in communities where they have moderator privileges.

### Viewing Banned Users

WHEN a moderator needs to review banned users, THE system SHALL display a list of all users currently banned from the community.

THE system SHALL show the username of each banned user.

THE system SHALL show when each user was banned.

THE system SHALL show which moderator banned each user.

THE system SHALL allow moderators to view the banned users list in communities where they have moderator privileges.

THE system SHALL allow the community owner to view the banned users list for their community.

THE system SHALL not show banned users list to regular community members.

### Banned User Restrictions

WHILE a user is banned from a community, THE system SHALL prevent that user from creating posts in that community.

WHILE a user is banned from a community, THE system SHALL prevent that user from creating comments in that community.

WHILE a user is banned from a community, THE system SHALL allow that user to view posts in that community.

WHILE a user is banned from a community, THE system SHALL allow that user to view comments in that community.

### Ban Scope and Enforcement

THE system SHALL apply each ban only to the specific community that issued it.

THE system SHALL allow a banned user to participate in other communities where they are not banned.

THE system SHALL enforce ban restrictions immediately when the ban is issued.

THE system SHALL remove ban restrictions immediately when the ban is removed.

THE system SHALL maintain ban status across user sessions.

## Report Operations

Users can report any post they believe violates guidelines. Users can report any comment they believe violates guidelines. When reporting, users must provide a reason as text. Moderators can view all reports for their community. Each report shows the reported content and who reported it. Each report displays the reason provided by the reporter. Moderators can approve a report, which deletes the content. Moderators can dismiss a report, which keeps the content. Dismissed reports are removed from the report list.

### Report Creation

Members can report any post they believe violates community guidelines.

Members can report any comment they believe violates community guidelines.

When reporting content, members must provide a reason as text explaining why they are reporting it.

The report is automatically associated with the reporting member.

The report is automatically associated with the reported content (post or comment).

The report is automatically associated with the community where the reported content exists.

### Report Viewing

Moderators can view all reports for their community.

Each report displays the reported content (post or comment).

Each report shows who reported the content.

Each report displays the reason provided by the reporter.

Reports are only visible to moderators of the community where the reported content exists.

### Report Resolution

Moderators can approve a report, which permanently deletes the reported post or comment.

Moderators can dismiss a report, which keeps the reported content unchanged.

Dismissed reports are removed from the report list and are no longer visible to moderators.

# Error Scenarios and Edge Cases

Business-level error scenarios, edge case coverage, and expected system behaviors for exceptional conditions.

## User Error Scenarios

When users sign up, the system rejects requests if the email is already registered or the username is not unique. Login attempts fail when the email or password is incorrect, and the system prevents account creation with missing email or password fields. Users cannot change their password without providing a valid current password. When a user deletes their account, all their posts and comments are automatically deleted, and the system prevents account deletion if the user is the only owner of a community. Users can only edit their own profile information, and attempting to edit another user's profile is rejected. The system prevents users from using reserved usernames that conflict with system functionality.

### Registration Validation Errors

WHEN a user attempts to register with an email address that is already associated with an existing account, THE system SHALL reject the registration request and display an error indicating the email is already in use.

WHEN a user attempts to register with a username that is already taken by another user, THE system SHALL reject the registration request and display an error indicating the username is not available.

IF a registration request is missing the email field, THEN THE system SHALL reject the request and indicate that email is required.

IF a registration request is missing the password field, THEN THE system SHALL reject the request and indicate that password is required.

IF a registration request is missing the username field, THEN THE system SHALL reject the request and indicate that username is required.

### Authentication Failure Scenarios

WHEN a user attempts to log in with an email address that does not match any registered account, THE system SHALL reject the login attempt and display an authentication error.

WHEN a user attempts to log in with an incorrect password, THE system SHALL reject the login attempt and display an authentication error.

WHEN a user attempts to log in with both an incorrect email and password, THE system SHALL reject the login attempt and display an authentication error.

### Password Change Validation Errors

WHEN a user attempts to change their password without providing their current password, THE system SHALL reject the password change request.

WHEN a user provides an incorrect current password during a password change attempt, THE system SHALL reject the password change request and indicate the current password is invalid.

WHEN a user attempts to change their password while not logged in, THE system SHALL reject the request and require authentication first.

### Account Deletion Constraints

WHEN a user deletes their account, THE system SHALL automatically delete all posts created by that user.

WHEN a user deletes their account, THE system SHALL automatically delete all comments created by that user.

WHEN a user who is the only owner of a community attempts to delete their account, THE system SHALL prevent the account deletion and require the user to transfer or delete the community first.

### Profile Access and Modification Errors

WHEN a user attempts to view a profile for a user that does not exist, THE system SHALL display a user not found error.

WHEN a user attempts to view a profile for a user whose account has been deleted, THE system SHALL display a user not found error.

WHEN a user attempts to edit another user's profile information, THE system SHALL reject the request and indicate insufficient permissions.

WHEN a user attempts to edit their own profile while not logged in, THE system SHALL reject the request and require authentication first.

## Community Error Scenarios

Community creation fails when the community name already exists on the platform, and the system requires a unique name for each community. Users cannot create a community without providing a name, and the system validates that all required fields are present. When browsing communities, the system handles cases where no communities exist or search returns no results. Users can only view communities they have permission to access, and private community access errors are handled appropriately. The subscriber count displays correctly even when zero users are subscribed, and the system handles communities with very large subscriber counts without performance issues.

### Community Creation Validation Errors

WHEN a user attempts to create a community with a name that already exists on the platform, THE system SHALL reject the creation and display an error indicating the name is already in use.

WHEN a user attempts to create a community without providing a name, THE system SHALL reject the creation and require a name to be entered.

WHEN a user attempts to create a community with missing required fields, THE system SHALL reject the creation and indicate which fields are required.

WHEN a user submits a community creation request that fails validation, THE system SHALL reject the entire request and prevent the community from being created.

WHEN a user attempts to create a community with an empty or blank name, THE system SHALL treat this as a missing name and reject the creation.

### Community Browsing and Search Errors

WHEN the system displays the list of all communities and no communities exist on the platform, THE system SHALL show an empty state message indicating no communities are available.

WHEN a user searches for communities by name and no communities match the search criteria, THE system SHALL display a message indicating no matching communities were found.

WHEN a user searches for communities using a name that does not match any existing community, THE system SHALL return zero results and display an appropriate message.

WHEN browsing communities, THE system SHALL handle the case where the community list is empty without causing errors or crashes.

WHEN searching communities, THE system SHALL handle partial or misspelled search terms gracefully by returning zero results rather than errors.

### Community Access and Navigation Errors

WHEN a user attempts to access a community that does not exist, THE system SHALL display an error indicating the community cannot be found.

WHEN a user attempts to navigate to a community using an invalid or non-existent community identifier, THE system SHALL reject the request and show a not found error.

WHEN a user attempts to view a community feed for a community that has been deleted or never existed, THE system SHALL display an appropriate error message.

WHEN a user follows a link to a community that no longer exists, THE system SHALL handle the missing community gracefully and inform the user.

WHEN a user attempts to access community-specific features for a non-existent community, THE system SHALL prevent the action and display an error.

### Community Display Edge Cases

WHEN a community has zero subscribers, THE system SHALL display the subscriber count as zero without errors or special handling.

WHEN a community has a very large number of subscribers, THE system SHALL display the count correctly without performance degradation or display issues.

WHEN displaying subscriber counts for communities with varying sizes from zero to thousands, THE system SHALL render the numbers accurately and consistently.

WHEN a newly created community has no subscribers yet, THE system SHALL show zero subscribers until the first user subscribes.

WHEN a community's subscriber count changes due to subscriptions or unsubscriptions, THE system SHALL update the displayed count to reflect the current number.

## Post Error Scenarios

Post creation is rejected when the user is not subscribed to the community where they want to post. The system requires a title for every post and rejects posts with empty or missing titles. Users can only edit or delete their own posts, and attempts to modify another user's post are denied. When a user deletes their account, all their posts are automatically removed from all communities. Posts must be one of the three valid types: text, link, or image, and the system rejects posts with invalid content types. The system handles edge cases where a post has no votes or no comments, displaying appropriate default values.

### Subscription Required for Posting

WHEN a user attempts to create a post in a community, THE system SHALL verify the user is subscribed to that community. IF the user is not subscribed to the community, THEN THE system SHALL reject the post creation request. The system displays an error message indicating subscription is required before posting in that community. Users must subscribe to a community before they can create posts there.

### Missing Post Title Validation

WHEN a user attempts to create a post, THE system SHALL require a title. IF the title is empty or missing, THEN THE system SHALL reject the post creation request. The system displays an error message indicating a title is required. Posts cannot be created without a title, regardless of post type (text, link, or image).

### Post Edit Permission Denied

WHEN a user attempts to edit a post, THE system SHALL verify the user is the post author. IF the user is not the author of the post, THEN THE system SHALL deny the edit request. Only the user who created a post can edit it. Moderators and community owners cannot edit posts created by other users.

### Post Delete Permission Denied

WHEN a user attempts to delete a post, THE system SHALL verify the user is the post author. IF the user is not the author of the post, THEN THE system SHALL deny the delete request. Only the user who created a post can delete it. Users cannot delete posts created by other users, even if they have moderator privileges in that community.

### Account Deletion Cascade Posts

WHEN a user deletes their account, THE system SHALL automatically delete all posts created by that user. All posts across all communities are removed when the account is deleted. The deletion is permanent and cannot be undone. Posts deleted due to account deletion are removed from all community feeds and the user's profile.

### Invalid Post Type Rejection

WHEN a user attempts to create a post, THE system SHALL validate the post type. IF the post type is not one of the three valid types (text, link, or image), THEN THE system SHALL reject the post creation request. Text posts must contain text content. Link posts must contain a URL. Image posts must contain an uploaded image. Posts with invalid or missing content for their type are rejected.

### No Votes Default Display

WHEN a post has no votes, THE system SHALL display a vote score of zero. The post shows zero as the vote score when neither upvotes nor downvotes have been cast. Posts without votes are displayed normally in feeds with a score of zero. The vote score updates automatically when votes are added or removed.

### No Comments Default Display

WHEN a post has no comments, THE system SHALL display a comment count of zero. The post shows zero comments when no one has commented on it. Posts without comments are displayed normally in feeds. The comment count updates automatically when comments are added or deleted.

### Post Not Found Error

WHEN a user attempts to view a post, THE system SHALL verify the post exists. IF the post does not exist, THEN THE system SHALL display an error indicating the post cannot be found. Posts that have been deleted are not accessible. Users cannot view, vote on, or comment on posts that no longer exist.

### Community Subscription Check Failure

WHEN a user attempts to create a post, THE system SHALL check if the user is subscribed to the target community. IF the subscription check fails because the user is not subscribed, THEN THE system SHALL reject the post creation request. The system prevents posting in communities where the user has no active subscription. Users receive a clear message that they must subscribe before posting.

## Comment Error Scenarios

Users cannot comment on posts that have been deleted or do not exist, and the system validates post existence before allowing comments. Banned users are prevented from creating comments in the community where they are banned, but can still view existing content. Users can only edit or delete their own comments, and attempts to modify another user's comment are rejected. When a user deletes their account, all their comments are automatically removed from all posts. The system handles deeply nested reply chains without depth limitations, and displays appropriate messages when a comment has no replies. Comment creation fails when the associated post has been deleted by a moderator or the post author.

### Comment on Deleted Post Error

When a user attempts to create a comment on a post that has been deleted, the system rejects the request and displays an error message indicating the post is no longer available. This occurs whether the post was deleted by the author, removed by a moderator, or deleted due to account deletion. The system validates post existence before allowing any comment creation. Users cannot comment on posts that do not exist in the system. If a post is deleted while a user is composing a comment, the submission fails with a post not found error.

### Comment Edit Permission Denied

Users can only edit comments they created themselves. When a user attempts to edit another user's comment, the system rejects the request and displays a permission denied error. Moderators cannot edit comments created by other users, even in communities they moderate. The system validates comment ownership before allowing any edits. If a user attempts to edit a comment that has been deleted, the system rejects the request with a comment not found error. Comment editing is only available for the comment author.

### Comment Delete Permission Denied

Users can only delete comments they created themselves. When a user attempts to delete another user's comment, the system rejects the request and displays a permission denied error. Only the comment author has permission to delete their own comments. Moderators cannot delete comments they did not create; they must use the moderator delete action instead. The system validates comment ownership before allowing deletion. If a user attempts to delete a comment that no longer exists, the system rejects the request with a comment not found error.

### Account Deletion Cascade Comments

When a user deletes their account, all comments they created are automatically removed from all posts across all communities. This cascade deletion occurs immediately upon account deletion confirmation. Comments deleted due to account removal cannot be recovered. If a deleted user's comment had replies, those replies remain visible but the parent comment is removed. The system processes all comment deletions as part of the account deletion workflow. Other users cannot view or reference comments from deleted accounts.

### Comment Display Edge Cases

When a comment has no replies, the system displays the comment without a reply section or indicates no replies exist. For deeply nested reply chains, the system displays all levels without depth limitations, allowing unlimited nesting. When viewing a comment with many nested replies, the system loads and displays the complete reply tree. If a reply's parent comment is deleted, the reply remains visible but the parent reference is removed. The system handles deeply nested structures without performance degradation or display issues.

### Comment Not Found Error

When a user attempts to view, edit, or delete a comment that does not exist, the system displays a comment not found error. This occurs when the comment was deleted, the ID is invalid, or the comment was removed due to account deletion. Users cannot access comments that have been deleted by the author or moderators. If a user navigates directly to a deleted comment's URL, the system shows an appropriate error message. The system validates comment existence for all comment operations before processing requests.

### Banned User Comment Restriction

Users banned from a community cannot create comments on any posts within that community. The system checks ban status before allowing comment creation in a specific community. Banned users receive an error message indicating they are not permitted to comment in that community. Banned users can still view existing comments in the community but cannot add new ones. The ban restriction applies to all posts in the banned community regardless of who created the post. Unbanning a user restores their ability to comment in that community.

### Post Not Found for Comment

When a comment references a post that no longer exists, the system handles the orphaned comment appropriately. If the post was deleted after the comment was created, the comment becomes orphaned. Users cannot view orphaned comments in the normal comment feed. The system may display orphaned comments with a notice that the parent post is no longer available. Moderators can delete orphaned comments when reviewing community content. Comment operations on posts that no longer exist are rejected with a post not found error.

## Vote Error Scenarios

Each user can only cast one vote per post or comment, and the system prevents duplicate voting on the same content. When a user changes their vote from upvote to downvote, the karma score adjusts by subtracting 2 points total. Vote removal properly adjusts karma scores by removing the previous vote's effect. Users cannot vote on content that has been deleted or does not exist. The system handles vote switching scenarios where a user changes their vote multiple times, ensuring karma is calculated correctly each time. Vote operations on content from communities where the user is banned are rejected appropriately.

### Duplicate Vote Prevention

THE system SHALL prevent users from casting multiple votes on the same post or comment. When a user attempts to vote on content they have already voted on, THE system SHALL reject the request and display an error indicating a vote already exists. THE system SHALL allow the user to change their existing vote or remove it, but not create a duplicate vote.

### Vote Change Karma Adjustment

WHEN a user changes their vote from upvote to downvote on a post or comment, THE system SHALL adjust the author's karma by subtracting 2 points total. WHEN a user changes their vote from downvote to upvote on a post or comment, THE system SHALL adjust the author's karma by adding 2 points total. THE system SHALL ensure karma adjustments are calculated correctly when vote types are changed.

### Vote Removal Karma Adjustment

WHEN a user removes their upvote from a post or comment, THE system SHALL decrease the author's karma by 1 point. WHEN a user removes their downvote from a post or comment, THE system SHALL increase the author's karma by 1 point. THE system SHALL properly reverse the karma effect of the removed vote.

### Vote on Deleted Content Error

IF a user attempts to vote on a post or comment that has been deleted, THEN THE system SHALL reject the request. THE system SHALL display an error message indicating the content is no longer available for voting. Deleted posts and comments cannot receive new votes or have existing votes modified.

### Vote Switching Karma Calculation

WHEN a user changes their vote multiple times on the same post or comment, THE system SHALL ensure karma is calculated correctly after each change. THE system SHALL track the current vote state and apply appropriate karma adjustments for each vote transition. Multiple consecutive vote changes must result in accurate final karma values.

### Banned User Vote Restriction

IF a user is banned from a community, THEN THE system SHALL prevent them from voting on any posts or comments within that community. THE system SHALL reject vote attempts from banned users and display an appropriate error message. Banned users cannot upvote, downvote, or remove existing votes on content in communities where they are banned.

### Content Not Found Vote Error

IF a user attempts to vote on a post or comment that does not exist, THEN THE system SHALL reject the request. THE system SHALL display an error indicating the requested content cannot be found. Invalid or non-existent content identifiers must be handled gracefully without system errors.

### Vote Already Cast Error

WHEN a user attempts to cast a new vote on content where they already have an active vote, THE system SHALL reject the duplicate vote request. THE system SHALL inform the user that they have already voted on this content. THE system SHALL provide options to change or remove their existing vote instead of creating a duplicate.

### Karma Negative Value Handling

THE system SHALL allow user karma scores to become negative when downvotes exceed upvotes. THE system SHALL display negative karma values correctly on user profiles. Negative karma does not restrict user actions or account functionality.

### Vote Type Change Validation

WHEN a user changes their vote type, THE system SHALL validate that the new vote type is valid (upvote or downvote). THE system SHALL reject vote changes with invalid vote types. THE system SHALL ensure vote type changes are processed atomically to prevent inconsistent karma calculations.

## Subscription Error Scenarios

The system prevents users from subscribing to a community they are already subscribed to, handling duplicate subscription attempts gracefully. Users can only unsubscribe from communities they are currently subscribed to, and attempts to unsubscribe from non-subscribed communities are rejected. When a user subscribes to a community, they immediately gain the ability to create posts in that community. The subscription list displays correctly even when a user has no subscriptions, showing an empty state message. Users cannot view subscription lists of other users, maintaining privacy of subscription data. The system handles edge cases where a community is deleted while users are still subscribed to it.

### Duplicate Subscription Prevention

WHEN a user attempts to subscribe to a community they are already subscribed to, THE system SHALL reject the duplicate subscription request.

IF a duplicate subscription attempt is detected, THEN THE system SHALL not create a duplicate subscription record for the same user-community pair.

WHEN a duplicate subscription is rejected, THE system SHALL provide feedback to the user indicating they are already subscribed to the community.

### Unsubscribe from Non-Subscribed Community

WHEN a user attempts to unsubscribe from a community they are not subscribed to, THE system SHALL reject the unsubscription request.

IF a subscription does not exist for the user-community pair, THEN THE system SHALL validate the subscription existence before processing the unsubscription.

WHEN an invalid unsubscription request is received, THE system SHALL provide feedback to the user indicating they are not subscribed to the specified community.

### Subscription Grants Posting Ability

WHEN a user subscribes to a community, THE system SHALL immediately grant the ability to create posts in that community.

IF a user is not subscribed to a community, THEN THE system SHALL prevent them from creating posts in that community.

WHEN a user attempts to create a post, THE system SHALL validate subscription status before allowing post creation.

### Empty Subscription List Display

WHEN a user has no subscriptions, THE system SHALL display an empty state message in the subscription list.

IF the subscription list is empty, THEN THE system SHALL inform users that they are not subscribed to any communities.

WHEN an empty subscription list is displayed, THE system SHALL still allow users to browse all communities.

### Subscription Privacy Protection

THE system SHALL allow users to view only their own subscription list.

IF a user attempts to view another user's subscription list, THEN THE system SHALL deny access to that subscription data.

WHEN subscription data is requested, THE system SHALL restrict access to the account owner only.

### Deleted Community Subscription Handling

WHEN a community is deleted, THE system SHALL automatically remove all subscriptions to that community.

IF a community no longer exists, THEN THE system SHALL prevent users from subscribing to that community.

WHEN a community is deleted, THE system SHALL update all affected users' subscription lists to remove the deleted community.

### Subscription Not Found Error

WHEN a subscription record cannot be found for a user-community pair, THE system SHALL return a subscription not found error.

IF a subscription validation is performed, THEN THE system SHALL verify the subscription record exists before performing subscription-related operations.

WHEN a subscription record is missing, THE system SHALL provide appropriate feedback to the user.

### Community Not Found Subscription Error

WHEN a user attempts to subscribe to a community that does not exist, THE system SHALL reject the subscription request.

IF a community validation is performed, THEN THE system SHALL verify the community exists before processing subscription requests.

WHEN a community is not found, THE system SHALL provide feedback to the user indicating the community was not found.

### Subscription List Access Denied

IF a user attempts to access another user's subscription list, THEN THE system SHALL deny access to that subscription list.

WHEN subscription list access is requested, THE system SHALL restrict access to the account owner only.

THE system SHALL prevent users from viewing subscription lists of other users.

### Subscription Status Check Failure

WHEN the system cannot determine a user's subscription status due to technical issues, THE system SHALL reject the operation.

IF a subscription status check fails, THEN THE system SHALL handle the failure gracefully.

WHEN subscription status cannot be verified, THE system SHALL provide appropriate feedback to the user.

## Moderation Error Scenarios

Only the community owner can remove moderators, and attempts by moderators to remove other moderators are rejected. Moderators cannot remove the community owner under any circumstances, protecting the highest authority role. The owner can add moderators to the community, but cannot add themselves as a moderator since they are already the owner. Moderators can only perform moderation actions within their assigned community, and cross-community moderation attempts are denied. When the community owner deletes their account, the system handles the transfer of ownership or community deletion appropriately. Moderators cannot delete posts or comments from communities where they do not have moderation privileges.

### Moderator Removal Restrictions

WHEN a moderator attempts to remove another moderator from a community, THE system SHALL reject the request and inform the user that only the community owner can remove moderators.

WHEN any user attempts to remove the community owner from the community, THE system SHALL reject the request and inform the user that the owner cannot be removed.

WHEN a non-owner user attempts to remove a moderator, THE system SHALL reject the request regardless of the requesting user's role in that community.

WHEN the community owner attempts to remove a moderator, THE system SHALL allow the removal and update the moderator list accordingly.

### Moderator Assignment Errors

WHEN the community owner attempts to add themselves as a moderator, THE system SHALL reject the request and inform the user that they are already the owner.

WHEN a user attempts to assign moderator role to a user who does not exist, THE system SHALL reject the request and inform the user that the specified user cannot be found.

WHEN a user attempts to assign moderator role to a user who is already a moderator in that community, THE system SHALL reject the request and inform the user that the user already has moderator privileges.

WHEN a non-owner user who is not a moderator attempts to add a new moderator, THE system SHALL reject the request and inform the user that they do not have permission to assign moderator roles.

### Cross-Community Moderation Errors

WHEN a moderator attempts to delete a post from a community where they do not have moderation privileges, THE system SHALL reject the request and inform the user that they do not have permission to moderate in that community.

WHEN a moderator attempts to delete a comment from a community where they do not have moderation privileges, THE system SHALL reject the request and inform the user that they do not have permission to moderate in that community.

WHEN a moderator attempts to ban a user from a community where they do not have moderation privileges, THE system SHALL reject the request and inform the user that they do not have permission to ban users in that community.

WHEN a moderator attempts to unban a user from a community where they do not have moderation privileges, THE system SHALL reject the request and inform the user that they do not have permission to manage bans in that community.

WHEN a moderator attempts to view reports from a community where they do not have moderation privileges, THE system SHALL reject the request and inform the user that they do not have access to reports in that community.

### Owner Account Deletion Scenarios

WHEN the community owner deletes their account, THE system SHALL handle the community appropriately by either transferring ownership or deleting the community.

WHEN the community owner deletes their account and the community has other moderators, THE system SHALL transfer ownership to one of the existing moderators.

WHEN the community owner deletes their account and the community has no other moderators, THE system SHALL delete the community along with all its posts and comments.

WHEN the community owner's account is deleted, THE system SHALL remove all posts and comments created by that user from all communities.

### Moderation Action Permission Errors

WHEN a user who is not a moderator or owner attempts to delete a post in a community, THE system SHALL reject the request and inform the user that they do not have permission to delete posts.

WHEN a user who is not a moderator or owner attempts to delete a comment in a community, THE system SHALL reject the request and inform the user that they do not have permission to delete comments.

WHEN a user who is not a moderator or owner attempts to ban another user from a community, THE system SHALL reject the request and inform the user that they do not have permission to ban users.

WHEN a user who is not a moderator or owner attempts to unban a user from a community, THE system SHALL reject the request and inform the user that they do not have permission to manage bans.

WHEN a user who is not a moderator or owner attempts to view the list of reports for a community, THE system SHALL reject the request and inform the user that they do not have access to community reports.

WHEN a user who is not a moderator or owner attempts to approve or dismiss a report, THE system SHALL reject the request and inform the user that they do not have permission to handle reports.

## Ban Error Scenarios

Banned users cannot create posts or comments in the community where they are banned, but can still view all content in that community. Only moderators and the owner can ban users from their community, and regular users cannot ban anyone. Moderators can unban users they or other moderators have banned, restoring full posting privileges. The banned users list is only visible to moderators and the owner of the community. When a banned user attempts to post or comment, the system rejects the action with an appropriate error message. The system handles cases where a banned user is also a moderator, requiring special handling of role conflicts.

### Banned User Posting Restriction

WHEN a user is banned from a community, THE system SHALL prevent them from creating new posts in that community.

IF a banned user attempts to create a post in their banned community, THEN THE system SHALL reject the action and display an appropriate error message.

The posting restriction applies to all post types including text posts, link posts, and image posts.

The restriction remains in effect until the user is unbanned by a moderator or the owner of that community.

### Banned User Commenting Restriction

WHEN a user is banned from a community, THE system SHALL prevent them from creating comments on any post within that community.

IF a banned user attempts to write a comment on a post in their banned community, THEN THE system SHALL reject the action and display an appropriate error message.

IF a banned user attempts to reply to an existing comment in their banned community, THEN THE system SHALL reject the action and display an appropriate error message.

The commenting restriction applies to all levels of comment nesting within the community.

The restriction remains in effect until the user is unbanned by a moderator or the owner of that community.

### Banned User Viewing Permission

WHEN a user is banned from a community, THE system SHALL allow them to view all posts and comments in that community.

Banned users can browse the community feed and view individual posts without restriction.

Banned users can view all comments on posts within their banned community.

Banned users can view the community information including name, description, and subscriber count.

Banned users can view the list of moderators and the owner of the community.

Viewing permissions are not affected by the ban status.

### Non-Moderator Ban Attempt

IF a regular user who is not a moderator attempts to ban another user from a community, THEN THE system SHALL reject the action.

IF a regular user who is not a moderator attempts to unban a user from a community, THEN THE system SHALL reject the action.

IF a regular user who is not a moderator attempts to view the banned users list, THEN THE system SHALL reject the action.

Only users with moderator role or owner role in a community can perform ban-related actions.

The system SHALL display an appropriate error message indicating insufficient permissions when a non-moderator attempts ban actions.

### Unban Permission Validation

WHEN a moderator attempts to unban a user, THE system SHALL verify that the moderator has permission to perform the action.

A moderator can unban any user who is currently banned from their community, regardless of which moderator or the owner originally banned them.

IF a moderator attempts to unban a user who is not currently banned, THEN THE system SHALL reject the action and display an appropriate error message.

The owner can unban any user from their community at any time.

Only moderators and the owner of a community can unban users from that community.

### Banned List Access Control

IF a regular user who is not a moderator attempts to view the list of banned users, THEN THE system SHALL reject the action.

IF a moderator attempts to view the banned users list of a community where they are not a moderator, THEN THE system SHALL reject the action.

The banned users list is only visible to moderators and the owner of the community.

When viewing the banned users list, moderators can see the username of each banned user and when they were banned.

The banned users list is not accessible to guests or logged-out users.

### Banned User Action Rejection

WHEN a banned user attempts to create a post in their banned community, THE system SHALL reject the action immediately.

WHEN a banned user attempts to create a comment in their banned community, THE system SHALL reject the action immediately.

WHEN a banned user attempts to reply to a comment in their banned community, THE system SHALL reject the action immediately.

The system SHALL display a clear error message indicating that the user is banned from the community.

The error message SHALL inform the user that they cannot create content in that community due to their ban status.

The system SHALL log the rejected action for moderator review if needed.

### Banned Moderator Role Conflict

IF a user who is a moderator in a community is banned from that same community, THEN THE system SHALL handle the role conflict appropriately.

WHEN a moderator is banned from their own community, THE system SHALL maintain their moderator role but prevent them from posting or commenting.

A banned moderator cannot perform moderation actions such as banning other users or deleting posts in their banned community.

The owner can unban a moderator, restoring their ability to perform moderation actions.

The system SHALL display the banned moderator in the banned users list while maintaining their moderator designation.

If a moderator is banned, they cannot add or remove other moderators from the community.

### Ban Not Found Error

IF a moderator attempts to unban a user who is not currently banned from the community, THEN THE system SHALL reject the action.

IF a moderator attempts to view details about a ban that does not exist, THEN THE system SHALL reject the action.

The system SHALL display an appropriate error message indicating that no ban record was found for the specified user.

When unbanning a user who is not banned, the system SHALL inform the moderator that the user is not currently banned.

The system SHALL not create a ban record when attempting to unban a non-banned user.

### Already Banned User Error

IF a moderator attempts to ban a user who is already banned from the community, THEN THE system SHALL reject the action.

The system SHALL display an appropriate error message indicating that the user is already banned from the community.

The system SHALL not create a duplicate ban record for a user who is already banned.

IF a moderator attempts to ban a user who is already banned, THE system SHALL inform them of the existing ban status.

The existing ban record SHALL remain unchanged when a duplicate ban attempt is made.

## Report Error Scenarios

Users must provide a reason when reporting content, and the system rejects reports without a valid reason text. Users can report any post or comment, but cannot report content that has already been deleted. Moderators can view all reports for their community, but cannot view reports from other communities they do not moderate. When a moderator approves a report, the reported content is deleted and the report is removed from the active list. Dismissed reports are automatically removed from the report list, and moderators cannot re-review dismissed reports. The system prevents users from reporting content multiple times, handling duplicate report attempts appropriately.

### Missing Report Reason Validation

When a user submits a report, the system requires a reason text to be provided. If the user attempts to submit a report without entering a reason, the system rejects the report submission. The system displays an error message indicating that a reason is required before the report can be submitted. Users must provide at least some text in the reason field to complete the report submission process.

### Report Deleted Content Rejection

Users can only report posts and comments that currently exist in the system. If a user attempts to report a post that has already been deleted, the system rejects the report. If a user attempts to report a comment that has already been deleted, the system rejects the report. The system prevents reporting of content that is no longer accessible to users.

### Moderator Report Scope Limitation

Moderators can only view reports for posts and comments within their moderated communities. Moderators cannot view reports about content in communities they do not moderate. The system filters the report list to show only reports from communities where the user has moderator access. Each moderator's report view is limited to their specific community responsibilities.

### Report Approval Content Deletion

When a moderator approves a report, the system automatically deletes the reported content. If the report is about a post, the post is deleted from the community. If the report is about a comment, the comment is deleted from the post. The reported content is permanently removed and cannot be recovered after approval. The approving moderator's action triggers immediate deletion of the content.

### Dismissed Report Removal

When a moderator dismisses a report, the system automatically removes it from the active report list. Dismissed reports are no longer visible to moderators in the report queue. Moderators cannot re-review reports that have been dismissed. The system permanently removes dismissed reports from the moderation workflow.

### Duplicate Report Prevention

The system prevents users from reporting the same content multiple times. If a user has already reported a specific post or comment, they cannot submit another report for that same content. The system tracks which users have reported which content to prevent duplicate reports. Users receive an error message if they attempt to report content they have already reported.

### Report Not Found Error

If a moderator attempts to view a report that does not exist, the system displays an error. If a moderator attempts to approve or dismiss a report that has already been processed, the system rejects the action. The system validates that reports exist before allowing moderators to take action on them. Non-existent report IDs result in access denial.

### Report Status Change Restriction

Once a moderator approves a report, the status cannot be changed back to pending. Once a moderator dismisses a report, the status cannot be changed back to pending. Only moderators can change the status of reports from pending to approved or dismissed. Users who submitted reports cannot change the status of their own reports.

# End-to-End User Scenarios

Cross-domain user scenarios that span multiple concepts, describing complete user journeys.

## Cross-Domain User Scenarios

Define end-to-end user scenarios that span multiple concepts, describing complete user journeys from start to finish.

### New User Onboarding Journey

When a new user joins the platform, they can complete the following end-to-end journey:

1. User signs up with email and password, selecting a unique username
2. After successful registration, user logs in with their email and password
3. User can update their profile with display name, bio text, and avatar image
4. User browses the list of all available communities
5. User searches for communities by name to find topics of interest
6. User subscribes to communities they want to follow
7. User views their list of subscribed communities
8. User creates their first post in a subscribed community with a title and content
9. Other users view the post and cast votes
10. User's karma score updates based on votes received on their post
11. User views their profile page to see their updated karma score and post history

This multi-step journey allows a new user to go from registration to active participation in the community platform.

### Community Engagement Journey

An active member can participate in community discussions through the following end-to-end flow:

1. User logs in and navigates to their home feed showing posts from subscribed communities
2. User applies sorting options (hot, new, top, or controversial) to view posts
3. User clicks on a post to view its full details including title, content, author, and vote score
4. User reads existing comments on the post and their nested replies
5. User writes a new comment on the post
6. Other users read the comment and cast upvotes or downvotes
7. Other users reply to the comment, creating nested discussion threads
8. User's karma score updates based on votes received on their comment
9. User views the updated comment with their vote score and nested replies
10. User can sort comments by best, new, or controversial to view different perspectives

This journey demonstrates how users engage with content and build discussions within communities.

### Content Moderation Journey

When inappropriate content is reported, the following end-to-end moderation flow occurs:

1. User views a post or comment they believe violates community guidelines
2. User reports the content and provides a reason explaining the violation
3. The report is submitted and stored with the reporter's identity and reason
4. A moderator of the community views all reports for their community
5. Moderator reviews the reported content, who reported it, and the reason provided
6. If the moderator approves the report, the content (post or comment) is deleted
7. If the moderator dismisses the report, the content remains visible
8. Dismissed reports are removed from the moderator's report list
9. If a post is deleted, all its comments are also removed from view
10. If a comment is deleted, its nested replies are also removed from view

This multi-step process ensures community standards are maintained through user reporting and moderator action.

### Community Management Journey

A community owner can manage their community through the following end-to-end workflow:

1. User creates a new community with a unique name, description, and icon image
2. The user becomes the owner of the community with highest authority
3. Owner adds another user as a moderator to help manage the community
4. The new moderator can add additional moderators to the team
5. Owner can remove moderators from the community at any time
6. Moderators cannot remove the owner or other moderators
7. When a user posts inappropriate content, a moderator deletes the post
8. When a user comments inappropriately, a moderator deletes the comment
9. Moderator bans a user who repeatedly violates community rules
10. Banned user can still view community content but cannot post or comment
11. Moderator views the list of all banned users in the community
12. Moderator can unban a user, restoring their ability to post and comment

This journey shows how community ownership and moderation responsibilities are distributed and executed.

### Account Lifecycle Journey

A user's complete account lifecycle on the platform follows this end-to-end path:

1. User registers with email, password, and unique username
2. User builds their profile with display name, bio, and avatar
3. User subscribes to multiple communities of interest
4. User creates posts across different communities
5. User writes comments on posts in various communities
6. User receives karma from upvotes and downvotes on their content
7. User changes their password for account security
8. User decides to leave the platform and deletes their account
9. Upon account deletion, all posts created by the user are removed
10. All comments written by the user are removed from the platform
11. All subscriptions to communities are terminated
12. All votes cast by the user are removed and karma scores adjust accordingly
13. All reports created by the user are removed
14. The user can no longer access the platform with their credentials

This multi-step journey demonstrates the complete lifecycle from registration through account deletion, ensuring all user-created content is properly cleaned up.

# File Storage

File upload capabilities, media processing, and storage requirements.

## File Upload and Management

Define file upload capabilities, supported formats, processing requirements, and access control for stored files.

### User Profile Avatar Upload

Users can upload an avatar image to their profile.

Users can replace their existing avatar with a new image.

Users can view their own avatar image on their profile page.

Users can view other users' avatar images on their profile pages.

The avatar image is displayed alongside the user's display name and bio text on the profile page.

### Community Icon Upload

Community creators can upload an icon image when creating a community.

Community owners can update the community icon image.

Users can view community icons when browsing the community list.

Users can view community icons on individual community pages.

The community icon is displayed alongside the community name and description.

### Image Post Upload

Users can upload images when creating image posts in communities they are subscribed to.

Users can view uploaded images in the full post view.

Users can view thumbnail previews of image posts in feed listings.

Image posts display the uploaded image as the primary content of the post.

Users can view image posts from any community, regardless of subscription status.

### Media Storage and Access

All uploaded media (avatars, community icons, image posts) are stored and associated with their respective entities.

Users can view media belonging to users they have access to view.

Users can view media belonging to communities they have access to view.

When a user deletes their account, all their uploaded avatars are removed.

When a community owner deletes their account, the community and its icon are removed.

When a user deletes their post, the associated image is removed.

When a moderator deletes a post, the associated image is removed.

Media files remain accessible as long as their parent entity exists.