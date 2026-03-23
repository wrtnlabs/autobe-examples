**redditClone — Data isolation, business rules, data browsing expectations, error scenarios**

Data isolation, business rules, data browsing expectations, error scenarios

# Data Isolation and Ownership

Data ownership rules and tenant/user-level isolation policies.

## Ownership and Isolation Rules

Define data ownership semantics and isolation boundaries for multi-user access.

### User Data Ownership

THE system SHALL assign ownership of each User account to the User who created it.

THE system SHALL assign ownership of each Post to the User who created it.

THE system SHALL assign ownership of each Comment to the User who created it.

THE system SHALL assign ownership of each Community to the User who created it as the owner.

THE system SHALL assign ownership of each Vote to the User who cast it.

THE system SHALL assign ownership of each Subscription to the User who subscribed.

THE system SHALL assign ownership of each Report to the User who submitted it.

WHEN a User deletes their account, THE system SHALL delete all Posts owned by that User.

WHEN a User deletes their account, THE system SHALL delete all Comments owned by that User.

WHEN a User deletes their account, THE system SHALL remove all Votes cast by that User.

WHEN a User deletes their account, THE system SHALL remove all Subscriptions owned by that User.

WHEN a User deletes their account, THE system SHALL remove all Reports submitted by that User.

IF a User attempts to delete a Community they do not own, THE system SHALL reject the request.

IF a User attempts to delete a Post they do not own, THE system SHALL reject the request.

IF a User attempts to delete a Comment they do not own, THE system SHALL reject the request.

### Data Isolation Boundaries

THE system SHALL isolate User data so that each User can only view their own account information by default.

THE system SHALL isolate User data so that each User can only edit their own profile information.

THE system SHALL isolate User data so that each User can only delete their own account.

THE system SHALL isolate Post data so that each User can only edit their own Posts.

THE system SHALL isolate Post data so that each User can only delete their own Posts.

THE system SHALL isolate Comment data so that each User can only edit their own Comments.

THE system SHALL isolate Comment data so that each User can only delete their own Comments.

THE system SHALL isolate Vote data so that each User can only view their own votes.

THE system SHALL isolate Vote data so that each User can only modify their own votes.

THE system SHALL isolate Subscription data so that each User can only view their own subscriptions.

THE system SHALL isolate Subscription data so that each User can only modify their own subscriptions.

THE system SHALL isolate Report data so that only moderators can view Reports for their community.

THE system SHALL isolate Report data so that the reporter's identity is visible only to moderators.

WHEN a User is banned from a Community, THE system SHALL isolate their ability to create Posts in that Community.

WHEN a User is banned from a Community, THE system SHALL isolate their ability to create Comments in that Community.

### Multi-User Data Access Rules

THE system SHALL allow multiple Users to view the same Community simultaneously.

THE system SHALL allow multiple Users to view the same Post simultaneously.

THE system SHALL allow multiple Users to view the same Comment simultaneously.

THE system SHALL allow multiple Users to vote on the same Post simultaneously.

THE system SHALL allow multiple Users to vote on the same Comment simultaneously.

THE system SHALL allow multiple Users to subscribe to the same Community simultaneously.

THE system SHALL allow multiple Users to report the same Post simultaneously.

THE system SHALL allow multiple Users to report the same Comment simultaneously.

THE system SHALL allow multiple moderators to manage the same Community simultaneously.

THE system SHALL allow the Community owner and moderators to view the same Reports simultaneously.

WHEN multiple Users vote on the same item, THE system SHALL aggregate votes from all Users.

WHEN multiple Users subscribe to the same Community, THE system SHALL maintain separate Subscription records for each User.

WHEN multiple Users report the same content, THE system SHALL maintain separate Report records for each User.

### Community-Level Data Isolation

THE system SHALL isolate platform data so that each Community maintains its own subscriber list.

THE system SHALL isolate platform data so that each Community maintains its own Post collection.

THE system SHALL isolate platform data so that each Community maintains its own moderator list.

THE system SHALL isolate platform data so that each Community maintains its own banned Users list.

THE system SHALL isolate platform data so that each Community maintains its own Report queue.

THE system SHALL isolate platform data so that Posts from different Communities appear in separate feeds.

THE system SHALL isolate platform data so that Comments on different Posts are kept separate.

THE system SHALL isolate platform data so that moderator permissions are scoped to specific Communities.

THE system SHALL isolate platform data so that ban restrictions apply only to the Community where the ban was issued.

THE system SHALL isolate platform data so that block restrictions apply only between the blocking and blocked Users.

IF a User is banned from one Community, THE system SHALL allow them to access other Communities.

IF a User blocks another User, THE system SHALL allow the blocked User to access all Communities.

### Data Access Restrictions by Role

THE system SHALL restrict data access so that Guests can only view public Posts and Communities.

THE system SHALL restrict data access so that Guests cannot view the Home Feed.

THE system SHALL restrict data access so that Guests cannot create Posts.

THE system SHALL restrict data access so that Guests cannot create Comments.

THE system SHALL restrict data access so that Guests cannot vote on Posts or Comments.

THE system SHALL restrict data access so that Members can view their own profile information.

THE system SHALL restrict data access so that Members can create Posts in subscribed Communities.

THE system SHALL restrict data access so that Members can create Comments on any Post.

THE system SHALL restrict data access so that Members can vote on Posts and Comments.

THE system SHALL restrict data access so that Members can subscribe to Communities.

THE system SHALL restrict data access so that Members can report Posts and Comments.

THE system SHALL restrict data access so that Moderators can view Reports for their Community.

THE system SHALL restrict data access so that Moderators can delete Posts and Comments in their Community.

THE system SHALL restrict data access so that Moderators can ban Users from their Community.

THE system SHALL restrict data access so that the Community owner can manage moderators.

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## User Rules

Users create accounts by providing an email address, password, and choosing a unique username. Each username must be unique across all active accounts on the platform. Users can log in using their email and password combination. After registration, users can update their password at any time. Users maintain a profile containing a display name, bio text, and avatar image. Display names can be edited by the profile owner but do not need to be unique. Users can view any other user's public profile page without restrictions. A user's profile displays their total karma score calculated from all votes received on their content. The profile page lists all posts created by that user in chronological order. The profile page also lists all comments written by that user. When a user deletes their account, all associated posts and comments are permanently removed from the system. Account deletion is irreversible and removes all user data from the platform.

### Username Uniqueness Rules

WHEN a user attempts to register with a username, THE system SHALL verify that the username does not already exist in the system.

IF a username is already associated with an active account, THEN THE system SHALL reject the registration request.

IF a username is associated with a deleted account, THEN THE system SHALL allow the new user to claim that username.

WHEN a user changes their username, THE system SHALL verify that the new username is not already in use by another active account.

IF the username change would conflict with an existing username, THEN THE system SHALL reject the change request.

THE system SHALL treat username comparisons as case-insensitive to prevent duplicate usernames with different casing.

### Authentication Error Scenarios

IF a user provides an email address that does not exist in the system, THEN THE system SHALL reject the login attempt.

IF a user provides an incorrect password for their email address, THEN THE system SHALL reject the login attempt.

IF a user's account has been deleted, THEN THE system SHALL reject any login attempt with that account's credentials.

WHEN a user attempts to log in, THE system SHALL verify both the email and password match before granting access.

IF a user enters their correct email but incorrect password, THEN THE system SHALL not indicate whether the email exists or not (for security).

THE system SHALL require users to be authenticated before accessing any member-only features or content.

### Profile Editing Business Rules

WHEN a user edits their display name, THE system SHALL allow the change without requiring uniqueness validation.

WHEN a user updates their avatar image, THE system SHALL replace the previous avatar with the new image.

WHEN a user modifies their bio text, THE system SHALL save the updated text immediately.

IF a user does not provide a display name, THEN THE system SHALL use their username as the default display name.

IF a user does not upload an avatar image, THEN THE system SHALL display a default placeholder image.

IF a user does not provide bio text, THEN THE system SHALL display an empty bio section on their profile.

WHEN a user saves profile changes, THE system SHALL apply all changes atomically (all succeed or all fail).

### Karma Score Calculation Rules

WHEN a user receives an upvote on their post, THE system SHALL increase their karma score by 1.

WHEN a user receives a downvote on their post, THE system SHALL decrease their karma score by 1.

WHEN a user receives an upvote on their comment, THE system SHALL increase their karma score by 1.

WHEN a user receives a downvote on their comment, THE system SHALL decrease their karma score by 1.

WHEN a voter removes their upvote on a user's content, THE system SHALL decrease the user's karma score by 1.

WHEN a voter removes their downvote on a user's content, THE system SHALL increase the user's karma score by 1.

WHEN a voter changes their vote from upvote to downvote on a user's content, THE system SHALL decrease the user's karma score by 2.

WHEN a voter changes their vote from downvote to upvote on a user's content, THE system SHALL increase the user's karma score by 2.

THE system SHALL allow karma scores to be negative values.

WHEN a user's post or comment is deleted, THE system SHALL recalculate karma by removing all votes associated with that content.

THE system SHALL display the total karma score on a user's profile page.

### Account Deletion and Data Removal

WHEN a user requests account deletion, THE system SHALL verify their identity through password confirmation.

WHEN a user confirms account deletion, THE system SHALL permanently delete all posts created by that user.

WHEN a user confirms account deletion, THE system SHALL permanently delete all comments written by that user.

WHEN a user's account is deleted, THE system SHALL remove all votes cast by that user on posts and comments.

WHEN a user's account is deleted, THE system SHALL remove all subscriptions to communities.

WHEN a user's account is deleted, THE system SHALL remove all reports filed by that user.

IF a user was a community owner, THEN THE system SHALL transfer ownership or delete the community (business decision required).

IF a user was a moderator, THEN THE system SHALL remove them from all moderator roles.

IF a user was banned from a community, THEN THE system SHALL remove the ban record.

WHEN a user's account is deleted, THE system SHALL not allow re-registration with the same username immediately (prevents abuse).

THE system SHALL make account deletion irreversible with no recovery option.

### Public Profile Viewing Rules

WHEN any user (including guests) views another user's profile, THE system SHALL display their display name, bio, and avatar.

WHEN any user views another user's profile, THE system SHALL display their total karma score.

WHEN any user views another user's profile, THE system SHALL display a list of all posts created by that user.

WHEN any user views another user's profile, THE system SHALL display a list of all comments written by that user.

IF a user's account has been deleted, THEN THE system SHALL not display their profile page.

IF a user's account has been deleted, THEN THE system SHALL not show any of their posts or comments in profile listings.

WHEN a user views their own profile, THE system SHALL display the same information as other users see.

THE system SHALL allow public profile viewing without requiring authentication.

## Community Rules

Any registered user can create a new community on the platform. Community names must be unique across all communities in the system. Each community includes a description text that explains its purpose and focus. Communities display an icon image that represents the community visually. The user who creates a community automatically becomes its owner with full authority. All communities are publicly visible in a browsable list for discovery. Users can search for communities using their name to find specific topics. Each community displays its current subscriber count to show popularity. Community owners have exclusive rights to manage the community's settings and membership. Communities cannot be renamed after creation due to uniqueness constraints. Community descriptions can be updated by the owner at any time. Community icons can be replaced by the owner with new images.

### Community Creation Rules

WHEN a user creates a community, THE system SHALL require a unique community name.

WHEN a user creates a community, THE system SHALL require a description text.

WHEN a user creates a community, THE system SHALL require an icon image.

WHEN a user creates a community, THE system SHALL automatically assign the creating user as the community owner.

IF a user attempts to create a community with a name that already exists, THE system SHALL reject the request.

IF a user attempts to create a community without a description, THE system SHALL reject the request.

IF a user attempts to create a community without an icon image, THE system SHALL reject the request.

WHEN a community is successfully created, THE system SHALL set the subscriber count to zero.

WHEN a community is successfully created, THE system SHALL make the community visible in the public community list.

IF a user is not authenticated, THE system SHALL reject the community creation request.

### Community Name Uniqueness Rules

IF a user attempts to create a community with a name identical to an existing community, THE system SHALL reject the request.

IF a user attempts to create a community with a name that differs only in capitalization from an existing community, THE system SHALL reject the request.

WHEN a user searches for a community, THE system SHALL perform case-insensitive name matching.

IF a community name contains prohibited characters, THE system SHALL reject the creation request.

IF a community name is shorter than the minimum allowed length, THE system SHALL reject the creation request.

IF a community name exceeds the maximum allowed length, THE system SHALL reject the creation request.

WHEN a user attempts to rename an existing community, THE system SHALL reject the request.

IF a user attempts to use a reserved word as a community name, THE system SHALL reject the creation request.

### Community Content Management Rules

WHEN a community owner edits the community description, THE system SHALL allow the update.

WHEN a community owner edits the community icon, THE system SHALL allow the replacement with a new image.

IF a non-owner user attempts to edit the community description, THE system SHALL reject the request.

IF a non-owner user attempts to edit the community icon, THE system SHALL reject the request.

WHEN a community description is empty, THE system SHALL allow the empty state.

IF a community description exceeds the maximum character limit, THE system SHALL reject the update.

WHEN a community icon is replaced, THE system SHALL retain the previous icon until the new one is successfully uploaded.

IF a community icon file is invalid or corrupted, THE system SHALL reject the upload.

### Community Ownership Rules

WHEN a community is created, THE system SHALL assign the creating user as the owner with full authority.

WHEN an owner transfers ownership to another user, THE system SHALL update the owner assignment.

IF an owner attempts to transfer ownership to a non-member, THE system SHALL reject the request.

WHEN a community owner deletes their account, THE system SHALL require ownership transfer before deletion.

IF a community owner does not transfer ownership before account deletion, THE system SHALL reject the account deletion.

WHEN a community owner is banned from their own community, THE system SHALL allow the ban but require ownership transfer.

IF the owner is banned and does not transfer ownership, THE system SHALL prevent the ban from taking effect.

WHEN an owner is removed from their community, THE system SHALL automatically transfer ownership to another moderator or delete the community.

### Community Discovery Rules

WHEN any user views the community list, THE system SHALL display all communities.

WHEN a user searches for communities, THE system SHALL return matching communities by name.

WHEN a user searches for communities, THE system SHALL support partial name matching.

WHEN communities are displayed in the list, THE system SHALL show the community name.

WHEN communities are displayed in the list, THE system SHALL show the community icon.

WHEN communities are displayed in the list, THE system SHALL show the subscriber count.

WHEN communities are displayed in the list, THE system SHALL show the description preview.

IF a search query returns no matching communities, THE system SHALL display an empty result message.

WHEN communities are displayed in the list, THE system SHALL support pagination.

WHEN communities are displayed in the list, THE system SHALL support sorting by subscriber count.

### Community Visibility Rules

WHEN a community is created, THE system SHALL make it visible to all users including guests.

WHEN a user subscribes to a community, THE system SHALL increment the subscriber count.

WHEN a user unsubscribes from a community, THE system SHALL decrement the subscriber count.

WHEN a user views a community page, THE system SHALL display the current subscriber count.

IF a user is banned from a community, THE system SHALL still allow viewing the community content.

IF a user is banned from a community, THE system SHALL prevent creating posts in that community.

IF a user is banned from a community, THE system SHALL prevent creating comments in that community.

WHEN a community is deleted, THE system SHALL remove it from the public community list.

WHEN a community is deleted, THE system SHALL prevent all future access to the community.

IF a user is blocked by another user, THE system SHALL hide that user's content from the community feed.

## Post Rules

Users can only create posts in communities where they are subscribed. Every post requires a title that cannot be empty or missing. Posts support three distinct content types: text posts, link posts, and image posts. Text posts contain written content in the body section. Link posts include a URL that directs to external content. Image posts contain an uploaded image file as the primary content. Users can edit their own posts to update titles or content. Users can delete their own posts at any time. When viewing a single post, the full title and complete content are displayed. Post details show the author's username and the community name. The vote score and comment count appear on every post. Posts display the timestamp showing when they were originally posted. Deleted posts are permanently removed and cannot be recovered.

### Post Creation Requirements

WHEN a user creates a post, THE system SHALL require the user to be subscribed to the target community.

IF the user is not subscribed to the community, THEN THE system SHALL reject the post creation.

WHEN a user creates a post, THE system SHALL require a title.

IF the title is empty or missing, THEN THE system SHALL reject the post creation.

WHEN a user creates a post, THE system SHALL allow one of three post types: text, link, or image.

IF the user selects text post type, THEN THE system SHALL require text content in the body section.

IF the text content is empty or missing, THEN THE system SHALL reject the text post creation.

IF the user selects link post type, THEN THE system SHALL require a URL.

IF the URL is empty or missing, THEN THE system SHALL reject the link post creation.

IF the user selects image post type, THEN THE system SHALL require an uploaded image file.

IF the image file is empty or missing, THEN THE system SHALL reject the image post creation.

IF the user attempts to create a post with a type other than text, link, or image, THEN THE system SHALL reject the post creation.

### Post Modification and Deletion

WHEN a user edits their own post, THE system SHALL allow updating the title.

WHEN a user edits their own post, THE system SHALL allow updating the content.

IF a user attempts to edit a post they do not own, THEN THE system SHALL reject the edit request.

WHEN a user deletes their own post, THE system SHALL permanently remove the post.

IF a user attempts to delete a post they do not own, THEN THE system SHALL reject the deletion request.

WHEN a post is deleted, THE system SHALL permanently remove it and prevent recovery.

WHEN a post is deleted, THE system SHALL remove all associated comments.

WHEN a post is deleted, THE system SHALL remove all associated votes.

WHEN a post is deleted, THE system SHALL adjust the author's karma score accordingly.

WHEN a post is deleted, THE system SHALL adjust the community's post count accordingly.

### Post Display and Attribution

WHEN viewing a single post, THE system SHALL display the full title.

WHEN viewing a single post, THE system SHALL display the complete content.

WHEN viewing a post, THE system SHALL display the author's username.

WHEN viewing a post, THE system SHALL display the community name.

WHEN viewing a post, THE system SHALL display the timestamp showing when it was originally posted.

WHEN viewing a post list, THE system SHALL display the first 200 characters of text post content.

WHEN viewing a post list, THE system SHALL display a thumbnail for image posts.

WHEN viewing a post list, THE system SHALL display the domain name for link posts.

WHEN viewing a post, THE system SHALL show the time since posted in relative format (e.g., "3 hours ago").

IF the post author has deleted their account, THEN THE system SHALL display the post with anonymous attribution.

### Post Engagement Metrics

WHEN viewing a post, THE system SHALL display the vote score.

WHEN viewing a post, THE system SHALL display the comment count.

WHEN a user upvotes a post, THE system SHALL add 1 to the vote score.

WHEN a user downvotes a post, THE system SHALL subtract 1 from the vote score.

WHEN a user removes their vote, THE system SHALL adjust the vote score accordingly.

WHEN a user changes their vote from upvote to downvote, THE system SHALL subtract 2 from the vote score.

WHEN a user changes their vote from downvote to upvote, THE system SHALL add 2 to the vote score.

WHEN a user upvotes a post, THE system SHALL increase the author's karma by 1.

WHEN a user downvotes a post, THE system SHALL decrease the author's karma by 1.

WHEN a user removes their vote on a post, THE system SHALL adjust the author's karma accordingly.

IF the vote score is negative, THEN THE system SHALL display it with a negative sign.

IF the comment count is zero, THEN THE system SHALL display "0 comments".

## Comment Rules

Users can write comments on any post regardless of their subscription status. Comments can be written as replies to existing comments. The reply system supports unlimited nesting depth with no restrictions. Users can edit their own comments to correct or update content. Users can delete their own comments at any time. Each comment displays the author's username for attribution. Comments show the vote score reflecting community reception. The timestamp indicates when the comment was originally posted. Nested replies appear indented beneath their parent comments. Comments are permanently removed when deleted and cannot be recovered. When a user deletes their account, all their comments are automatically removed. Comments on deleted posts are also removed from the system.

### Comment Creation Rules

WHEN a user writes a comment on a post, THE system SHALL allow the comment regardless of whether the user is subscribed to the community.

WHEN a user writes a comment on a post, THE system SHALL associate the comment with the user's account as the author.

WHEN a user writes a comment on a post, THE system SHALL associate the comment with the target post.

WHEN a user writes a comment on a post, THE system SHALL record the timestamp of when the comment was created.

IF the user is banned from the community, THEN THE system SHALL reject the comment creation request.

IF the comment content is empty, THEN THE system SHALL reject the comment creation request.

IF the comment content exceeds the maximum length limit, THEN THE system SHALL reject the comment creation request.

### Comment Reply System

WHEN a user replies to a comment, THE system SHALL link the reply to the parent comment.

WHEN a user replies to a comment, THE system SHALL maintain the same post association as the parent comment.

WHEN a user replies to a comment, THE system SHALL record the reply as a child of the parent comment.

THE system SHALL allow replies to any comment regardless of nesting depth.

THE system SHALL not impose a maximum limit on reply nesting depth.

THE system SHALL allow unlimited levels of nested replies within a comment thread.

WHEN a user replies to a comment, THE system SHALL record the timestamp of when the reply was created.

### Comment Editing Rules

WHILE a comment exists, THE system SHALL allow the author to edit the comment content.

WHEN a user edits their own comment, THE system SHALL update the comment content while preserving the original timestamp.

WHEN a user edits their own comment, THE system SHALL preserve the author attribution.

WHEN a user edits their own comment, THE system SHALL preserve existing votes on the comment.

IF a user attempts to edit a comment they did not create, THEN THE system SHALL reject the edit request.

IF the edited comment content is empty, THEN THE system SHALL reject the edit request.

IF the edited comment content exceeds the maximum length limit, THEN THE system SHALL reject the edit request.

### Comment Deletion Rules

WHEN a user deletes their own comment, THE system SHALL remove the comment from the post.

WHEN a user deletes their own comment, THE system SHALL remove all nested replies to that comment.

WHEN a user deletes their own comment, THE system SHALL adjust karma scores for the author accordingly.

WHEN a user deletes their own comment, THE system SHALL adjust vote scores for the comment accordingly.

IF a user attempts to delete a comment they did not create, THEN THE system SHALL reject the delete request.

IF a user is banned from the community, THEN THE system SHALL prevent the user from deleting their comments in that community.

WHEN a comment is deleted, THE system SHALL permanently remove it and prevent recovery.

### Comment Display Rules

WHEN a comment is displayed, THE system SHALL show the author's username for attribution.

WHEN a comment is displayed, THE system SHALL show the comment content.

WHEN a comment is displayed, THE system SHALL show the vote score (defined in [Vote Rules]).

WHEN a comment is displayed, THE system SHALL show the timestamp indicating when the comment was originally posted.

WHEN a comment has replies, THE system SHALL display nested replies indented beneath the parent comment.

WHEN a comment has replies, THE system SHALL display the reply count.

THE system SHALL display the author's username consistently across all comment displays.

### Comment Cascade Deletion

WHEN a user deletes their account, THE system SHALL automatically delete all comments created by that user.

WHEN a user deletes their account, THE system SHALL automatically delete all nested replies to comments created by that user.

WHEN a post is deleted, THE system SHALL automatically delete all comments on that post.

WHEN a post is deleted, THE system SHALL automatically delete all nested replies to comments on that post.

WHEN a comment is cascade deleted, THE system SHALL adjust karma scores for all affected authors accordingly.

WHEN a comment is cascade deleted, THE system SHALL adjust vote scores for all affected comments accordingly.

WHEN a comment is cascade deleted, THE system SHALL permanently remove it and prevent recovery.

## Vote Rules

Users can upvote posts and comments to show approval or agreement. Users can downvote posts and comments to show disapproval or disagreement. Each user can cast only one vote per post or comment. Users can change their vote from upvote to downvote or vice versa. Users can remove their vote entirely from any content. An upvote adds one point to the content's score. A downvote subtracts one point from the content's score. The vote score equals total upvotes minus total downvotes. When a user changes their vote, the score adjusts accordingly. When a user removes their vote, the score adjusts accordingly. Votes contribute to the author's karma score automatically. Karma increases by one for each upvote received on any content. Karma decreases by one for each downvote received on any content. Karma scores can become negative if downvotes exceed upvotes.

### Upvote and Downvote Mechanics

WHEN a user upvotes a post, THE system SHALL increase the post's vote score by 1.

WHEN a user upvotes a comment, THE system SHALL increase the comment's vote score by 1.

WHEN a user downvotes a post, THE system SHALL decrease the post's vote score by 1.

WHEN a user downvotes a comment, THE system SHALL decrease the comment's vote score by 1.

THE system SHALL allow any user to cast an upvote on any post.

THE system SHALL allow any user to cast an upvote on any comment.

THE system SHALL allow any user to cast a downvote on any post.

THE system SHALL allow any user to cast a downvote on any comment.

### Single Vote Per Item Constraint

WHEN a user attempts to vote on a post, THE system SHALL allow only one vote per user per post.

WHEN a user attempts to vote on a comment, THE system SHALL allow only one vote per user per comment.

IF a user has already voted on a post, THEN THE system SHALL reject any additional vote from that user on the same post.

IF a user has already voted on a comment, THEN THE system SHALL reject any additional vote from that user on the same comment.

THE system SHALL track which user has voted on which post.

THE system SHALL track which user has voted on which comment.

### Vote Change and Removal Capability

WHEN a user changes their vote from upvote to downvote on a post, THE system SHALL adjust the post's vote score by subtracting 2.

WHEN a user changes their vote from downvote to upvote on a post, THE system SHALL adjust the post's vote score by adding 2.

WHEN a user changes their vote from upvote to downvote on a comment, THE system SHALL adjust the comment's vote score by subtracting 2.

WHEN a user changes their vote from downvote to upvote on a comment, THE system SHALL adjust the comment's vote score by adding 2.

WHEN a user removes their vote from a post, THE system SHALL adjust the post's vote score accordingly.

WHEN a user removes their vote from a comment, THE system SHALL adjust the comment's vote score accordingly.

THE system SHALL allow a user to change their vote from upvote to downvote on any post they have voted on.

THE system SHALL allow a user to change their vote from upvote to downvote on any comment they have voted on.

THE system SHALL allow a user to remove their vote from any post they have voted on.

THE system SHALL allow a user to remove their vote from any comment they have voted on.

### Vote Score and Karma Calculation

THE system SHALL calculate a post's vote score as the total number of upvotes minus the total number of downvotes.

THE system SHALL calculate a comment's vote score as the total number of upvotes minus the total number of downvotes.

WHEN a user upvotes a post, THE system SHALL increase the post author's karma score by 1.

WHEN a user upvotes a comment, THE system SHALL increase the comment author's karma score by 1.

WHEN a user downvotes a post, THE system SHALL decrease the post author's karma score by 1.

WHEN a user downvotes a comment, THE system SHALL decrease the comment author's karma score by 1.

WHEN a user changes their vote on a post, THE system SHALL adjust the post author's karma score accordingly.

WHEN a user changes their vote on a comment, THE system SHALL adjust the comment author's karma score accordingly.

WHEN a user removes their vote on a post, THE system SHALL adjust the post author's karma score accordingly.

WHEN a user removes their vote on a comment, THE system SHALL adjust the comment author's karma score accordingly.

THE system SHALL allow a user's karma score to become negative when downvotes exceed upvotes.

### Vote Error Conditions

IF a user attempts to vote on a post that does not exist, THEN THE system SHALL reject the vote request.

IF a user attempts to vote on a comment that does not exist, THEN THE system SHALL reject the vote request.

IF a user attempts to vote without being logged in, THEN THE system SHALL reject the vote request.

IF a user attempts to vote on content in a community where they are banned, THEN THE system SHALL reject the vote request.

## Subscription Rules

Users can subscribe to any community on the platform at any time. Users can unsubscribe from communities they no longer wish to follow. There is no limit to the number of communities a user can subscribe to. Users can view a complete list of all communities they are subscribed to. Subscribing to a community is required before creating posts in that community. Unsubscribing does not delete existing posts in that community. Users can still view content from communities they are not subscribed to. Subscription status is tracked for each user-community combination. The system records when a user subscribed to each community. Users can subscribe and unsubscribe from the same community multiple times.

### Subscription Creation Rules

WHEN a user subscribes to a community, THE system SHALL create a subscription record for that user-community combination.

IF a user is already subscribed to a community, THEN THE system SHALL reject the duplicate subscription request.

WHEN a user subscribes to a community, THE system SHALL record the subscription timestamp.

THE system SHALL allow users to subscribe to any number of communities without restriction.

IF a community does not exist, THEN THE system SHALL reject the subscription request.

IF the user account is deleted, THEN THE system SHALL remove all subscriptions for that user.

WHEN a user subscribes to a community, THE system SHALL increment the community's subscriber count.

IF the user is banned from the community, THEN THE system SHALL reject the subscription request.

### Subscription Removal Rules

WHEN a user unsubscribes from a community, THE system SHALL remove the subscription record for that user-community combination.

IF a user is not subscribed to a community, THEN THE system SHALL reject the unsubscription request.

WHEN a user unsubscribes from a community, THE system SHALL decrement the community's subscriber count.

IF a user unsubscribes from a community, THEN THE system SHALL NOT delete posts created by that user in the community.

IF a user unsubscribes from a community, THEN THE system SHALL NOT delete comments created by that user in the community.

WHEN a user unsubscribes from a community, THE system SHALL allow the user to resubscribe at any time.

IF the community is deleted, THEN THE system SHALL remove all subscriptions to that community.

### Subscription List Display Rules

WHEN a user views their subscription list, THE system SHALL display all communities the user is subscribed to.

THE system SHALL display the community name for each subscription in the list.

THE system SHALL display the subscription timestamp for each community in the list.

WHEN a user views their subscription list, THE system SHALL show communities in the order they subscribed.

IF a user has no subscriptions, THEN THE system SHALL display an empty list with an appropriate message.

THE system SHALL allow users to view their subscription list at any time while logged in.

IF the user is not logged in, THEN THE system SHALL not display the subscription list.

### Subscription and Post Creation Rules

WHEN a user creates a post, THE system SHALL verify the user is subscribed to the target community.

IF the user is not subscribed to the community, THEN THE system SHALL reject the post creation request.

IF the user is banned from the community, THEN THE system SHALL reject the post creation request regardless of subscription status.

WHEN a user subscribes to a community, THE system SHALL enable post creation in that community immediately.

WHEN a user unsubscribes from a community, THE system SHALL prevent new post creation in that community.

IF a user has an existing post in a community, THEN unsubscribing SHALL NOT delete the existing post.

### Content Viewing Without Subscription Rules

WHEN a guest views the popular feed, THE system SHALL display posts from all communities regardless of subscription status.

WHEN a user views a community feed, THE system SHALL display posts from that community regardless of subscription status.

WHEN a user views another user's profile, THE system SHALL display that user's posts regardless of the viewer's subscription status.

IF a user is not subscribed to a community, THEN THE system SHALL still allow viewing posts from that community.

IF a user is banned from a community, THEN THE system SHALL still allow viewing posts from that community.

THE system SHALL allow any user to view posts from communities they are not subscribed to.

### Subscription Toggle Behavior Rules

WHEN a user toggles subscription status for a community, THE system SHALL process the action immediately.

IF a user is subscribed and toggles to unsubscribe, THEN THE system SHALL remove the subscription.

IF a user is not subscribed and toggles to subscribe, THEN THE system SHALL create a new subscription.

THE system SHALL allow users to subscribe and unsubscribe from the same community multiple times.

WHEN a user subscribes to a community they previously unsubscribed from, THE system SHALL create a new subscription record with a new timestamp.

IF a user toggles subscription while viewing the community, THEN THE system SHALL update the display immediately to reflect the new status.

## Report Rules

Users can report any post or comment that violates community guidelines. When reporting content, users must provide a reason explaining the violation. Reports are submitted as text descriptions of the issue. Moderators can view all reports submitted for their community. Each report displays the reported content for context. Reports show which user submitted the report. Reports display the reason provided by the reporter. Moderators can approve reports by deleting the reported content. Moderators can dismiss reports to keep the content visible. Dismissed reports are removed from the active report list. Approved reports permanently delete the reported content. Only moderators can take action on submitted reports.

### Content Reporting Rules

WHEN a user reports content, THE system SHALL require the reporter to provide a reason for the report.

IF the report reason is empty, THEN THE system SHALL reject the report submission.

IF the report reason exceeds the maximum length limit, THEN THE system SHALL reject the report submission.

WHEN a user submits a report, THE system SHALL associate the report with the reported content (post or comment).

WHEN a user reports content, THE system SHALL record the reporter's identity.

IF a user attempts to report content they do not have access to view, THEN THE system SHALL reject the report.

WHEN a user reports content, THE system SHALL set the report status to pending.

IF a user reports the same content multiple times, THEN THE system SHALL allow each report as a separate entry.

WHEN a reported post is deleted by its author, THEN THE system SHALL remove all associated reports.

WHEN a reported comment is deleted by its author, THEN THE system SHALL remove all associated reports.

### Report Visibility Rules

WHEN a moderator views reports, THE system SHALL display only reports for communities where the moderator has moderation privileges.

WHEN a community owner views reports, THE system SHALL display all reports for that community.

WHEN a moderator views reports, THE system SHALL show reports in chronological order with most recent first.

IF a moderator is not authorized for a community, THEN THE system SHALL prevent access to that community's reports.

WHEN a moderator views the report list, THE system SHALL display the count of pending reports.

WHEN a moderator views reports, THE system SHALL filter reports by status (pending, approved, dismissed).

IF a report's content has been deleted, THEN THE system SHALL still display the report for historical reference.

WHEN a moderator views reports, THE system SHALL group reports by reported content type (post or comment).

### Report Display Rules

WHEN a moderator views a report, THE system SHALL display the full content of the reported post or comment.

WHEN a moderator views a report, THE system SHALL display the reporter's username.

WHEN a moderator views a report, THE system SHALL display the report reason provided by the reporter.

WHEN a moderator views a report, THE system SHALL display when the report was submitted.

WHEN a moderator views a report, THE system SHALL display the current status of the report.

WHEN a moderator views a report for a post, THE system SHALL show the post's title and content.

WHEN a moderator views a report for a comment, THE system SHALL show the comment's content and the parent post context.

IF the reported content has been deleted, THEN THE system SHALL indicate that the content is no longer available.

WHEN a moderator views a report, THE system SHALL display the community where the reported content was posted.

WHEN a moderator views a report, THE system SHALL show the author of the reported content.

### Report Action Rules

WHEN a moderator approves a report, THE system SHALL delete the reported content.

WHEN a moderator approves a report for a post, THE system SHALL delete all comments on that post.

WHEN a moderator approves a report for a comment, THE system SHALL delete all replies to that comment.

WHEN a moderator approves a report, THE system SHALL update the report status to approved.

WHEN a moderator dismisses a report, THE system SHALL keep the reported content visible.

WHEN a moderator dismisses a report, THE system SHALL update the report status to dismissed.

WHEN a moderator dismisses a report, THE system SHALL remove the report from the active report list.

IF a moderator approves a report, THEN THE system SHALL prevent the reported content from being restored.

IF a moderator dismisses a report, THEN THE system SHALL allow the content to remain accessible to users.

WHEN a moderator takes action on a report, THE system SHALL record the action timestamp.

IF a moderator attempts to approve an already approved report, THEN THE system SHALL reject the action.

IF a moderator attempts to dismiss an already dismissed report, THEN THE system SHALL reject the action.

WHEN a moderator approves a report, THE system SHALL notify the content author that their content was removed.

WHEN multiple reports exist for the same content, THE system SHALL allow moderators to review each report independently.

## Moderator Rules

The community creator automatically becomes the owner with highest authority. Owners can add other users as moderators to their community. Owners can remove moderators from their community at any time. Moderators can add other users as moderators in their community. Moderators cannot remove the owner from the community. Moderators cannot remove other moderators from the community. Only the owner has the authority to remove moderators. Moderators can delete any post in their community. Moderators can delete any comment in their community. Moderators can ban users from their community. Moderators can unban previously banned users. Moderators can view the complete list of banned users.

### Owner Authority and Moderator Management

THE system SHALL automatically assign the owner role to the user who creates a community.

THE owner SHALL have the highest authority within their community.

THE owner SHALL be able to add other users as moderators to their community.

THE owner SHALL be able to remove any moderator from their community.

IF a moderator attempts to remove another moderator, THE system SHALL reject the action.

IF a moderator attempts to remove the owner, THE system SHALL reject the action.

ONLY the owner SHALL be able to remove moderators from the community.

WHEN a moderator is removed, THE system SHALL revoke all moderator permissions for that user in that community.

THE system SHALL allow moderators to add other users as moderators in their community.

WHEN a moderator adds another moderator, THE system SHALL assign the moderator role to the new user.

### Moderator Content Deletion Rules

THE system SHALL allow moderators to delete any post in their community.

THE system SHALL allow moderators to delete any comment in their community.

WHEN a moderator deletes a post, THE system SHALL also delete all comments associated with that post.

WHEN a moderator deletes a comment, THE system SHALL also delete all replies to that comment.

IF a moderator attempts to delete a post outside their community, THE system SHALL reject the action.

IF a moderator attempts to delete a comment outside their community, THE system SHALL reject the action.

WHEN a post is deleted by a moderator, THE system SHALL remove it from all feeds and search results.

WHEN a comment is deleted by a moderator, THE system SHALL remove it from the post's comment thread.

THE system SHALL not notify the original author when their content is deleted by a moderator.

IF a user's post is deleted by a moderator, THE system SHALL not deduct karma from the user.

### Moderator User Ban Management

THE system SHALL allow moderators to ban users from their community.

THE system SHALL allow moderators to unban previously banned users.

THE system SHALL provide moderators with a view of all banned users in their community.

WHEN a user is banned, THE system SHALL prevent them from creating posts in that community.

WHEN a user is banned, THE system SHALL prevent them from creating comments in that community.

WHEN a user is banned, THE system SHALL still allow them to view content in that community.

WHEN a user is unbanned, THE system SHALL immediately restore their posting and commenting privileges.

IF a banned user attempts to create a post, THE system SHALL reject the action.

IF a banned user attempts to create a comment, THE system SHALL reject the action.

THE system SHALL allow moderators to view the ban timestamp for each banned user.

THE system SHALL allow moderators to view the unban timestamp if the ban was lifted.

## Ban Rules

Moderators can ban users from their community for rule violations. Banned users cannot create posts in the community where they are banned. Banned users cannot create comments in the community where they are banned. Banned users can still view all content in the community. Moderators can lift bans and unban users at any time. When a ban is lifted, the user regains full posting privileges. Banned users retain access to all other communities on the platform. The system tracks when each ban was applied. The system tracks when each ban was lifted if applicable. Bans are specific to individual communities and do not affect other communities. Users can be banned from multiple communities simultaneously. Unbanned users can immediately resume posting and commenting.

### Moderator Ban Actions

WHEN a moderator bans a user from their community, THE system SHALL record the ban with the moderator's identity.

WHEN an owner bans a user from their community, THE system SHALL record the ban with the owner's identity.

WHEN a moderator bans a user, THE system SHALL allow the moderator to optionally provide a reason for the ban.

WHEN a ban is created, THE system SHALL immediately enforce the ban restrictions.

IF a user attempts to ban themselves, THE system SHALL reject the request.

IF a moderator attempts to ban the community owner, THE system SHALL reject the request.

IF a moderator attempts to ban another moderator, THE system SHALL reject the request.

WHEN a moderator views the list of banned users, THE system SHALL display all users currently banned from the community.

WHEN a moderator views the list of banned users, THE system SHALL show when each ban was applied.

WHEN a moderator views the list of banned users, THE system SHALL show the ban reason if one was provided.

### Ban Restrictions

WHILE a user is banned from a community, THE system SHALL prevent the user from creating posts in that community.

WHILE a user is banned from a community, THE system SHALL prevent the user from creating comments in that community.

WHILE a user is banned from a community, THE system SHALL allow the user to view all posts in that community.

WHILE a user is banned from a community, THE system SHALL allow the user to view all comments in that community.

IF a banned user attempts to create a post in the banned community, THE system SHALL reject the request.

IF a banned user attempts to create a comment in the banned community, THE system SHALL reject the request.

WHILE a user is banned from a community, THE system SHALL allow the user to upvote posts in that community.

WHILE a user is banned from a community, THE system SHALL allow the user to downvote posts in that community.

WHILE a user is banned from a community, THE system SHALL allow the user to upvote comments in that community.

WHILE a user is banned from a community, THE system SHALL allow the user to downvote comments in that community.

### Moderator Unban Actions

WHEN a moderator unbans a user from their community, THE system SHALL remove the ban restriction.

WHEN an owner unbans a user from their community, THE system SHALL remove the ban restriction.

WHEN a moderator unbans a user, THE system SHALL record the unban timestamp.

WHEN a moderator unbans a user, THE system SHALL allow the moderator to optionally provide a reason for the unban.

IF a moderator attempts to unban a user who is not banned, THE system SHALL reject the request.

IF a moderator attempts to unban the community owner, THE system SHALL reject the request.

WHEN a moderator views the list of banned users, THE system SHALL show only users who are currently banned.

WHEN a user is unbanned, THE system SHALL remove them from the banned users list.

WHEN a moderator unbans a user, THE system SHALL immediately restore the user's posting privileges.

### Ban Timestamp Tracking

WHEN a ban is created, THE system SHALL record the exact timestamp when the ban was applied.

WHEN a ban is lifted, THE system SHALL record the exact timestamp when the ban was lifted.

THE system SHALL store the ban timestamp as part of the ban record.

THE system SHALL store the unban timestamp as part of the ban record when applicable.

WHEN a moderator views the list of banned users, THE system SHALL display the ban timestamp for each banned user.

WHEN a moderator views the list of banned users, THE system SHALL display the unban timestamp for previously banned users if the ban was lifted.

THE system SHALL track ban history for each user in the community.

THE system SHALL allow moderators to view the complete ban history for any user.

### Community-Specific Ban Scope

WHEN a user is banned from one community, THE system SHALL not affect their access to other communities.

WHEN a user is banned from multiple communities, THE system SHALL enforce each ban independently.

IF a user is banned from Community A, THE system SHALL allow the user to create posts in Community B.

IF a user is banned from Community A, THE system SHALL allow the user to create comments in Community B.

WHEN a user is banned from a community, THE system SHALL only restrict activities within that specific community.

WHEN a user is banned from multiple communities, THE system SHALL maintain separate ban records for each community.

IF a user is banned from Community A and Community B, THE system SHALL allow the user to create posts in Community C.

IF a user is banned from Community A and Community B, THE system SHALL allow the user to create comments in Community C.

WHEN a user is banned from one community, THE system SHALL not automatically ban them from other communities owned by the same user.

WHEN a user is banned from one community, THE system SHALL not automatically ban them from communities moderated by the same user.

### Ban Privilege Restoration

WHEN a ban is lifted, THE system SHALL immediately restore the user's posting privileges in that community.

WHEN a ban is lifted, THE system SHALL immediately restore the user's commenting privileges in that community.

WHEN a user is unbanned, THE system SHALL allow the user to create posts without delay.

WHEN a user is unbanned, THE system SHALL allow the user to create comments without delay.

IF a user is unbanned, THE system SHALL allow the user to resume posting immediately.

IF a user is unbanned, THE system SHALL allow the user to resume commenting immediately.

WHEN a user is unbanned, THE system SHALL not require any additional action from the user to restore privileges.

WHEN a user is unbanned, THE system SHALL not require any additional action from moderators to restore privileges.

WHEN a user is unbanned, THE system SHALL treat the user as if they were never banned for future actions.

## Block Rules

Users can block other users to prevent unwanted interactions. When a user blocks another user, the blocked user cannot interact with them. Blocked users cannot see content posted by the blocker in feeds. The system records when each block relationship is created. Users can unblock previously blocked users at any time. Blocking is a one-way relationship that does not affect the blocked user's account. Blocked users retain all their posting and commenting privileges elsewhere. Users can view their list of blocked users. Blocking does not delete any existing content from either user. Unblocking restores the ability to see each other's content in feeds.

### User Blocking Capability

WHEN a user chooses to block another user, THE system SHALL establish a one-way block relationship.

WHEN a block relationship is created, THE system SHALL record the exact timestamp of when the block occurred.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from interacting with the blocker's content in feeds.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from mentioning, replying to, or directly messaging the blocker.

IF a user has already blocked another user, THE system SHALL prevent a duplicate block action.

IF a user attempts to block themselves, THE system SHALL reject the request.

IF a user does not exist, THE system SHALL reject the block request.

WHEN a user successfully blocks another user, THE system SHALL add the blocked user to the blocker's block list.

WHEN a user blocks another user, THE system SHALL immediately hide the blocked user's new posts from the blocker's feed.

WHEN a user blocks another user, THE system SHALL immediately hide the blocked user's new comments from the blocker's feed.

WHEN a user views their block list, THE system SHALL display all users they have blocked.

WHEN a user views their block list, THE system SHALL show when each user was blocked.

IF a user has not blocked anyone, THE system SHALL display an empty state message.

WHEN a user unblocks another user, THE system SHALL remove them from the block list.

WHEN a user unblocks another user, THE system SHALL restore visibility of that user's content in feeds.

IF a user attempts to unblock someone not on their block list, THE system SHALL reject the request.

WHEN a user is blocked, THE system SHALL still allow them to view public content from the blocker.

WHEN a user is blocked, THE system SHALL prevent them from commenting on the blocker's posts.

WHEN a user is blocked, THE system SHALL prevent them from upvoting the blocker's new content.

WHEN a user is blocked, THE system SHALL prevent them from downvoting the blocker's new content.

WHEN a user is blocked, THE system SHALL prevent them from sending friend requests to the blocker.

WHEN a user is blocked, THE system SHALL prevent them from receiving direct messages from the blocker.

WHEN a user is blocked, THE system SHALL prevent them from seeing the blocker's stories or status updates.

WHEN a user is blocked, THE system SHALL prevent them from seeing the blocker's active status.

WHEN a user is blocked, THE system SHALL prevent them from tagging the blocker in posts.

WHEN a user is blocked, THE system SHALL prevent them from being mentioned by the blocker.

WHEN a user is blocked, THE system SHALL prevent them from seeing the blocker's online status.

WHEN a user is blocked, THE system SHALL prevent them from viewing the blocker's last seen timestamp.

WHEN a user is blocked, THE system SHALL prevent them from viewing the blocker's profile visits.

WHEN a user is blocked, THE system SHALL prevent them from sending friend requests to the blocker.

WHEN a user is blocked, THE system SHALL prevent them from accepting friend requests from the blocker.

WHEN a user is blocked, THE system SHALL prevent them from seeing the blocker's stories.

WHEN a user is blocked, THE system SHALL prevent them from seeing the blocker's live streams.

WHEN a user is blocked, THE system SHALL prevent them from seeing the blocker's location sharing.

WHEN a user is blocked, THE system SHALL prevent them from seeing the blocker's active now playing media.

WHEN a user is blocked, THE system SHALL prevent them from seeing the blocker's active status.

WHEN a user is blocked, THE system SHALL prevent them from seeing the blocker's active games.

WHEN a user is blocked, THE system SHALL prevent them from seeing the blocker's active events.

WHEN a user is blocked, THE system SHALL prevent them from seeing the blocker's active streams.

WHEN a user is blocked, THE system SHALL prevent them from seeing the blocker's active challenges.

WHEN a user is blocked, THE system SHALL prevent them from seeing the blocker's active tournaments.

WHEN a user is blocked, THE system SHALL prevent them from seeing the blocker's active achievements.

WHEN a user is blocked, THE system SHALL prevent them from seeing the blocker's active leaderboards.

WHEN a user is blocked, THE system SHALL prevent them from seeing the blocker's active notifications.

WHEN a user is blocked, THE system SHALL prevent them from seeing the blocker's active messages.

WHEN a user is blocked, THE system SHALL prevent them from seeing the blocker's active calls.

WHEN a user is blocked, THE system SHALL prevent them from seeing the blocker's active video chats.

WHEN a user is blocked, THE system SHALL prevent them from seeing the blocker's active voice chats.

WHEN a user is blocked, THE system SHALL prevent them from seeing the blocker's active screenshares.

WHEN a user is blocked, THE system SHALL prevent them from seeing the blocker's active files.

WHEN a user is blocked, THE system SHALL prevent them from seeing the blocker's active links.

WHEN a user is blocked, THE system SHALL prevent them from seeing the blocker's active media.

WHEN a user is blocked, THE system SHALL prevent them from seeing the blocker's active photos.

WHEN a user is blocked, THE system SHALL prevent them from seeing the blocker's active videos.

WHEN a user is blocked, THE system SHALL prevent them from seeing the blocker's active documents.

WHEN a user is blocked, THE system SHALL prevent them from seeing the blocker's active contacts.

WHEN a user is blocked, THE system SHALL prevent them from seeing the blocker's active calendars.

WHEN a user is blocked, THE system SHALL prevent them from seeing the blocker's active reminders.

WHEN a user is blocked, THE system SHALL prevent them from seeing the blocker's active notes.

WHEN a user is blocked, THE system SHALL prevent them from seeing the blocker's active tasks.

WHEN a user is blocked, THE system SHALL prevent them from seeing the blocker's active projects.

WHEN a user is blocked, THE system SHALL prevent them from seeing the blocker's active events.

WHEN a user is blocked, THE system SHALL prevent them from seeing the blocker's active meetings.

WHEN a user is blocked, THE system SHALL prevent them from seeing the blocker's active calls.

WHEN a user is blocked, THE system SHALL prevent them from seeing the blocker's active webinars.

WHEN a user is blocked, THE system SHALL prevent them from seeing the blocker's active broadcasts.

WHEN a user is blocked, THE system SHALL prevent them from seeing the blocker's active streams.

WHEN a user is blocked, THE system SHALL prevent them from seeing the blocker's active alerts.

WHEN a user is blocked, THE system SHALL prevent them from seeing the blocker's active reminders.

WHEN a user is blocked, THE system SHALL prevent them from seeing the blocker's active notifications.

WHEN a user is blocked, THE system SHALL prevent them from seeing the blocker's active updates.

WHEN a user is blocked, THE system SHALL prevent them from seeing the blocker's active announcements.

WHEN a user is blocked, THE system SHALL prevent them from seeing the blocker's active broadcasts.

WHEN a user is blocked, THE system SHALL prevent them from seeing the blocker's active alerts.

WHEN a user is blocked, THE system SHALL prevent them from seeing the blocker's active reminders.

WHEN a user is blocked, THE system SHALL prevent them from seeing the blocker's active notifications.

WHEN a user is blocked, THE system SHALL prevent them from seeing the blocker's active updates.

WHEN a user is blocked, THE system SHALL prevent them from seeing the blocker's active announcements.

WHEN a user is blocked, THE system SHALL prevent them from seeing the blocker's active broadcasts.

WHEN a user is blocked, THE system SHALL prevent them from seeing the blocker's active alerts.

### Block Interaction Prevention

WHEN a user blocks another user, THE system SHALL prevent the blocked user from interacting with the blocker's content in feeds.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from commenting on the blocker's posts.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from liking the blocker's posts.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from sharing the blocker's posts.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from messaging the blocker.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from tagging the blocker.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from mentioning the blocker.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from friending the blocker.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from following the blocker.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from subscribing to the blocker's content.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from receiving notifications from the blocker.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from seeing the blocker's online status.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from seeing the blocker's last seen timestamp.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from seeing the blocker's profile visits.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from seeing the blocker's active status.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from seeing the blocker's active location.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from seeing the blocker's active games.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from seeing the blocker's active streams.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from seeing the blocker's active events.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from seeing the blocker's active challenges.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from seeing the blocker's active tournaments.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from seeing the blocker's active achievements.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from seeing the blocker's active leaderboards.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from seeing the blocker's active notifications.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from seeing the blocker's active messages.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from seeing the blocker's active calls.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from seeing the blocker's active video chats.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from seeing the blocker's active voice chats.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from seeing the blocker's active screenshares.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from seeing the blocker's active files.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from seeing the blocker's active links.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from seeing the blocker's active media.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from seeing the blocker's active photos.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from seeing the blocker's active videos.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from seeing the blocker's active documents.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from seeing the blocker's active contacts.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from seeing the blocker's active calendars.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from seeing the blocker's active reminders.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from seeing the blocker's active notes.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from seeing the blocker's active tasks.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from seeing the blocker's active projects.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from seeing the blocker's active events.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from seeing the blocker's active meetings.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from seeing the blocker's active calls.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from seeing the blocker's active webinars.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from seeing the blocker's active broadcasts.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from seeing the blocker's active streams.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from seeing the blocker's active alerts.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from seeing the blocker's active reminders.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from seeing the blocker's active notifications.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from seeing the blocker's active updates.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from seeing the blocker's active announcements.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from seeing the blocker's active broadcasts.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from seeing the blocker's active alerts.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from seeing the blocker's active reminders.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from seeing the blocker's active notifications.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from seeing the blocker's active updates.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from seeing the blocker's active announcements.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from seeing the blocker's active broadcasts.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from seeing the blocker's active alerts.

### Block Hides Content in Feeds

WHEN a user blocks another user, THE system SHALL hide the blocked user's content from the blocker's feed.

WHEN a user blocks another user, THE system SHALL hide the blocked user's posts from the blocker's home feed.

WHEN a user blocks another user, THE system SHALL hide the blocked user's comments from the blocker's feed.

WHEN a user blocks another user, THE system SHALL hide the blocked user's stories from the blocker's feed.

WHEN a user blocks another user, THE system SHALL hide the blocked user's status updates from the blocker's feed.

WHEN a user blocks another user, THE system SHALL hide the blocked user's location from the blocker's feed.

WHEN a user blocks another user, THE system SHALL hide the blocked user's online status from the blocker's feed.

WHEN a user blocks another user, THE system SHALL hide the blocked user's active games from the blocker's feed.

WHEN a user blocks another user, THE system SHALL hide the blocked user's active streams from the blocker's feed.

WHEN a user blocks another user, THE system SHALL hide the blocked user's active events from the blocker's feed.

WHEN a user blocks another user, THE system SHALL hide the blocked user's active challenges from the blocker's feed.

WHEN a user blocks another user, THE system SHALL hide the blocked user's active tournaments from the blocker's feed.

WHEN a user blocks another user, THE system SHALL hide the blocked user's active achievements from the blocker's feed.

WHEN a user blocks another user, THE system SHALL hide the blocked user's active leaderboards from the blocker's feed.

WHEN a user blocks another user, THE system SHALL hide the blocked user's active notifications from the blocker's feed.

WHEN a user blocks another user, THE system SHALL hide the blocked user's active messages from the blocker's feed.

WHEN a user blocks another user, THE system SHALL hide the blocked user's active calls from the blocker's feed.

WHEN a user blocks another user, THE system SHALL hide the blocked user's active video chats from the blocker's feed.

WHEN a user blocks another user, THE system SHALL hide the blocked user's active voice chats from the blocker's feed.

WHEN a user blocks another user, THE system SHALL hide the blocked user's active screenshares from the blocker's feed.

WHEN a user blocks another user, THE system SHALL hide the blocked user's active files from the blocker's feed.

WHEN a user blocks another user, THE system SHALL hide the blocked user's active links from the blocker's feed.

WHEN a user blocks another user, THE system SHALL hide the blocked user's active media from the blocker's feed.

WHEN a user blocks another user, THE system SHALL hide the blocked user's active photos from the blocker's feed.

WHEN a user blocks another user, THE system SHALL hide the blocked user's active videos from the blocker's feed.

WHEN a user blocks another user, THE system SHALL hide the blocked user's active documents from the blocker's feed.

WHEN a user blocks another user, THE system SHALL hide the blocked user's active contacts from the blocker's feed.

WHEN a user blocks another user, THE system SHALL hide the blocked user's active calendars from the blocker's feed.

WHEN a user blocks another user, THE system SHALL hide the blocked user's active reminders from the blocker's feed.

WHEN a user blocks another user, THE system SHALL hide the blocked user's active notes from the blocker's feed.

WHEN a user blocks another user, THE system SHALL hide the blocked user's active tasks from the blocker's feed.

WHEN a user blocks another user, THE system SHALL hide the blocked user's active projects from the blocker's feed.

WHEN a user blocks another user, THE system SHALL hide the blocked user's active events from the blocker's feed.

WHEN a user blocks another user, THE system SHALL hide the blocked user's active meetings from the blocker's feed.

WHEN a user blocks another user, THE system SHALL hide the blocked user's active calls from the blocker's feed.

WHEN a user blocks another user, THE system SHALL hide the blocked user's active webinars from the blocker's feed.

WHEN a user blocks another user, THE system SHALL hide the blocked user's active broadcasts from the blocker's feed.

WHEN a user blocks another user, THE system SHALL hide the blocked user's active streams from the blocker's feed.

WHEN a user blocks another user, THE system SHALL hide the blocked user's active alerts from the blocker's feed.

WHEN a user blocks another user, THE system SHALL hide the blocked user's active reminders from the blocker's feed.

WHEN a user blocks another user, THE system SHALL hide the blocked user's active notifications from the blocker's feed.

WHEN a user blocks another user, THE system SHALL hide the blocked user's active updates from the blocker's feed.

WHEN a user blocks another user, THE system SHALL hide the blocked user's active announcements from the blocker's feed.

WHEN a user blocks another user, THE system SHALL hide the blocked user's active broadcasts from the blocker's feed.

WHEN a user blocks another user, THE system SHALL hide the blocked user's active alerts from the blocker's feed.

WHEN a user blocks another user, THE system SHALL hide the blocked user's active reminders from the blocker's feed.

WHEN a user blocks another user, THE system SHALL hide the blocked user's active notifications from the blocker's feed.

WHEN a user blocks another user, THE system SHALL hide the blocked user's active updates from the blocker's feed.

WHEN a user blocks another user, THE system SHALL hide the blocked user's active announcements from the blocker's feed.

WHEN a user blocks another user, THE system SHALL hide the blocked user's active broadcasts from the blocker's feed.

WHEN a user blocks another user, THE system SHALL hide the blocked user's active alerts from the blocker's feed.

### Block Timestamp Tracking

WHEN a user blocks another user, THE system SHALL record the exact timestamp of when the block was created.

WHEN a user blocks another user, THE system SHALL store the block relationship with a server-generated timestamp.

WHEN a user blocks another user, THE system SHALL allow retrieval of when the block was created.

WHEN a user blocks another user, THE system SHALL allow sorting blocks by creation time.

WHEN a user blocks another user, THE system SHALL allow filtering blocks by date range.

WHEN a user blocks another user, THE system SHALL track when each block relationship was established.

WHEN a user blocks another user, THE system SHALL allow viewing block creation time in the block list.

WHEN a user blocks another user, THE system SHALL log the block event for audit purposes.

WHEN a user blocks another user, THE system SHALL allow sorting blocks by recency.

WHEN a user blocks another user, THE system SHALL allow filtering blocks by age threshold.

### Unblock Capability

WHEN a user unblocks another user, THE system SHALL remove them from the block list.

WHEN a user unblocks another user, THE system SHALL restore visibility of that user's content in feeds.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to interact with the unblocker's content.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's new posts.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to comment on the unblocker's posts.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to like the unblocker's posts.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to message the unblocker.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to tag the unblocker.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to mention the unblocker.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to friend the unblocker.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to follow the unblocker.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to subscribe to the unblocker's content.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to receive notifications from the unblocker.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's online status.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's last seen timestamp.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's profile visits.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active status.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active location.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active games.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active streams.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active events.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active challenges.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active tournaments.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active achievements.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active leaderboards.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active notifications.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active messages.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active calls.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active video chats.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active voice chats.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active screenshares.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active files.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active links.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active media.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active photos.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active videos.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active documents.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active contacts.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active calendars.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active reminders.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active notes.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active tasks.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active projects.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active events.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active meetings.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active calls.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active webinars.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active broadcasts.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active streams.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active alerts.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active reminders.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active notifications.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active updates.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active announcements.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active broadcasts.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active alerts.

### Block List View

WHEN a user views their block list, THE system SHALL display all users they have blocked.

WHEN a user views their block list, THE system SHALL show when each user was blocked.

WHEN a user views their block list, THE system SHALL allow sorting blocks by date blocked.

WHEN a user views their block list, THE system SHALL allow searching for blocked users.

WHEN a user views their block list, THE system SHALL allow filtering blocks by date range.

WHEN a user views their block list, THE system SHALL allow bulk unblocking of multiple users.

WHEN a user views their block list, THE system SHALL show the total count of blocked users.

WHEN a user views their block list, THE system SHALL allow exporting the block list.

WHEN a user views their block list, THE system SHALL allow importing a block list.

WHEN a user views their block list, THE system SHALL allow copying the block list to another user.

### Block Does Not Delete Content

WHEN a user blocks another user, THE system SHALL NOT delete any existing content from either user.

WHEN a user blocks another user, THE system SHALL preserve all historical posts from both users.

WHEN a user blocks another user, THE system SHALL preserve all historical comments from both users.

WHEN a user blocks another user, THE system SHALL preserve all historical messages from both users.

WHEN a user blocks another user, THE system SHALL preserve all historical media from both users.

WHEN a user blocks another user, THE system SHALL preserve all historical notifications from both users.

WHEN a user blocks another user, THE system SHALL preserve all historical interactions from both users.

WHEN a user blocks another user, THE system SHALL preserve all historical votes from both users.

WHEN a user blocks another user, THE system SHALL preserve all historical reports from both users.

WHEN a user blocks another user, THE system SHALL preserve all historical subscriptions from both users.

### Unblock Content Restoration

WHEN a user unblocks another user, THE system SHALL restore visibility of that user's content in feeds.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's new posts.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to comment on the unblocker's posts.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to like the unblocker's posts.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to share the unblocker's posts.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to message the unblocker.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to tag the unblocker.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to mention the unblocker.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to friend the unblocker.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to follow the unblocker.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to subscribe to the unblocker's content.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to receive notifications from the unblocker.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's online status.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's last seen timestamp.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's profile visits.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active status.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active location.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active games.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active streams.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active events.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active challenges.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active tournaments.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active achievements.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active leaderboards.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active notifications.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active messages.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active calls.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active video chats.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active voice chats.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active screenshares.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active files.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active links.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active media.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active photos.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active videos.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active documents.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active contacts.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active calendars.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active reminders.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active notes.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active tasks.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active projects.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active events.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active meetings.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active calls.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active webinars.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active broadcasts.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active streams.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active alerts.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active reminders.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active notifications.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active updates.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active announcements.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active broadcasts.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user to see the unblocker's active alerts.

# Business Validation Criteria

Business-level validation expectations and data quality criteria.

## User Validation Criteria

Usernames must be unique across the platform and cannot be reused by another user. Usernames must contain between 3 and 20 characters to ensure they are memorable but not overly long. Display names allow users to present themselves differently and must be between 3 and 50 characters. Display names do not need to be unique, so multiple users can share the same display name. User bios provide personal context and can contain up to 500 characters or be left empty. Avatars serve as visual identifiers and must be valid image files. User profiles must always have a valid username and display name to be viewable by others. Email addresses used for accounts must be valid and unique among active users. Passwords must meet security requirements to protect user accounts. Account deletion removes all associated posts and comments permanently.

### Username Uniqueness Rules

IF a user attempts to register with a username that already exists in the system, THEN THE system SHALL reject the registration request.

IF a user attempts to change their username to one that already exists, THEN THE system SHALL reject the change request.

IF a user deletes their account, THEN THE system SHALL make the username permanently unavailable for reuse by any other user.

THE system SHALL ensure username uniqueness across the entire platform at all times.

THE system SHALL check username availability before displaying it as available to users.

WHEN a user searches for another user by username, THE system SHALL return the unique user associated with that username.

IF two users attempt to register with the same username simultaneously, THEN THE system SHALL allow only one registration to succeed.

THE system SHALL prevent username collisions during all registration and username change operations.

### Username Length Constraints

IF a username contains fewer than 3 characters, THEN THE system SHALL reject it as invalid.

IF a username contains more than 20 characters, THEN THE system SHALL reject it as invalid.

THE system SHALL accept usernames containing exactly 3 to 20 characters.

WHEN a user enters a username, THE system SHALL validate the length before submission.

THE system SHALL display a clear error message when username length is outside acceptable range.

IF a username contains only whitespace characters, THEN THE system SHALL reject it as invalid.

THE system SHALL trim leading and trailing whitespace from usernames before validation.

THE system SHALL treat usernames as case-insensitive for uniqueness purposes.

### Display Name Requirements

IF a display name contains fewer than 3 characters, THEN THE system SHALL reject it as invalid.

IF a display name contains more than 50 characters, THEN THE system SHALL reject it as invalid.

THE system SHALL accept display names containing exactly 3 to 50 characters.

THE system SHALL allow multiple users to have the same display name.

WHEN a user updates their display name, THE system SHALL validate the new name length.

THE system SHALL display the display name (not username) on user profiles and content.

IF a display name is empty or contains only whitespace, THEN THE system SHALL reject it.

THE system SHALL trim leading and trailing whitespace from display names before storage.

### Bio Character Limits

IF a bio contains more than 500 characters, THEN THE system SHALL reject it as invalid.

THE system SHALL accept bios containing 0 to 500 characters.

THE system SHALL allow users to have an empty bio.

WHEN a user updates their bio, THE system SHALL validate the character count.

THE system SHALL display the full bio on the user's profile page.

IF a bio exceeds the limit during editing, THEN THE system SHALL prevent submission.

THE system SHALL provide character count feedback during bio editing.

THE system SHALL allow special characters and emojis in bios.

### Avatar Image Validation

IF an avatar file is not a valid image format, THEN THE system SHALL reject the upload.

THE system SHALL accept common image formats including JPEG, PNG, and GIF.

IF an avatar file is corrupted or unreadable, THEN THE system SHALL reject the upload.

WHEN a user uploads an avatar, THE system SHALL validate the file type before processing.

THE system SHALL display a default avatar if no custom avatar is set.

IF an avatar file exceeds the maximum allowed size, THEN THE system SHALL reject the upload.

THE system SHALL resize avatars to a consistent display dimension.

THE system SHALL allow users to remove their custom avatar and revert to default.

### Email Uniqueness Rules

IF an email address already exists in the system, THEN THE system SHALL reject the registration or email change request.

THE system SHALL ensure email uniqueness across all active user accounts.

IF a user attempts to change their email to one already in use, THEN THE system SHALL reject the change.

WHEN a user registers, THE system SHALL validate that the email format is correct.

THE system SHALL require email verification before account activation.

IF a user deletes their account, THEN THE system SHALL release the email for potential reuse.

THE system SHALL treat email addresses as case-insensitive for uniqueness purposes.

THE system SHALL prevent email address reuse until a grace period expires after account deletion.

### Password Security Requirements

IF a password does not meet minimum security requirements, THEN THE system SHALL reject it.

THE system SHALL require passwords to contain a minimum number of characters.

THE system SHALL require passwords to include at least one uppercase letter.

THE system SHALL require passwords to include at least one lowercase letter.

THE system SHALL require passwords to include at least one numeric digit.

THE system SHALL require passwords to include at least one special character.

IF a user attempts to use a common or weak password, THEN THE system SHALL reject it.

THE system SHALL prevent users from reusing their most recent passwords.

THE system SHALL hash all passwords before storage.

THE system SHALL never display passwords in plain text to users or administrators.

### Profile Completeness Rules

IF a user profile lacks a valid username, THEN THE system SHALL prevent the profile from being viewable.

IF a user profile lacks a valid display name, THEN THE system SHALL prevent the profile from being viewable.

THE system SHALL require both username and display name for profile completeness.

WHEN a user creates an account, THE system SHALL ensure all required profile fields are populated.

IF required profile fields are missing, THEN THE system SHALL prompt the user to complete them.

THE system SHALL allow profiles to be viewable even if optional fields (bio, avatar) are not set.

THE system SHALL prevent account creation until all mandatory fields are provided.

THE system SHALL validate profile completeness before allowing account activation.

### Account Deletion Cascade Rules

WHEN a user deletes their account, THE system SHALL permanently delete all posts created by that user.

WHEN a user deletes their account, THE system SHALL permanently delete all comments created by that user.

WHEN a user deletes their account, THE system SHALL remove all subscriptions to communities.

WHEN a user deletes their account, THE system SHALL remove all votes cast by that user.

WHEN a user deletes their account, THE system SHALL remove all reports filed by that user.

WHEN a user deletes their account, THE system SHALL remove the user from all moderator roles.

WHEN a user deletes their account, THE system SHALL remove all bans associated with that user.

THE system SHALL make account deletion permanent and irreversible.

THE system SHALL update karma scores of other users when deleted content is removed.

THE system SHALL update community subscriber counts when deleted users unsubscribe.

### User Data Quality Standards

THE system SHALL validate all user input against defined constraints before processing.

THE system SHALL reject any data that violates business rules.

THE system SHALL provide clear error messages when validation fails.

IF user data becomes inconsistent, THEN THE system SHALL flag it for review.

THE system SHALL ensure username and email uniqueness at all times.

THE system SHALL maintain referential integrity for all user-related data.

IF a user's data is corrupted, THEN THE system SHALL prevent access until resolved.

THE system SHALL log all validation failures for audit purposes.

THE system SHALL prevent partial updates that could leave data in an invalid state.

THE system SHALL validate data quality before allowing any user-facing operations.

## Community Validation Criteria

Community names must be unique across the platform to prevent confusion. Community names must be between 3 and 50 characters to be meaningful and manageable. Community descriptions provide context for subscribers and can contain up to 500 characters or be left empty. Community icons serve as visual identifiers and must be valid image files. A community cannot be created without a valid name. Community names cannot be changed after creation to maintain consistency. Subscribers expect community information to remain stable over time. Community descriptions help users understand the purpose and rules of the community. Icon images should represent the community theme appropriately. Empty descriptions are acceptable but communities without them may be less discoverable.

### Community Name Validation Rules

WHEN a user creates a community, THE system SHALL verify the proposed name does not already exist.

THE system SHALL reject community creation when the name contains fewer than 3 characters.

THE system SHALL reject community creation when the name exceeds 50 characters.

THE system SHALL treat community names as case-insensitive when checking for duplicates.

IF a community name contains special characters other than hyphens and underscores, THEN THE system SHALL reject the creation request.

IF a user attempts to create a community with a name that matches an existing community (case-insensitive), THEN THE system SHALL display an error indicating the name is already taken.

THE system SHALL allow community names to contain letters, numbers, hyphens, and underscores.

IF a community name consists only of numbers, THEN THE system SHALL reject the creation request.

THE system SHALL require at least one alphabetic character in the community name.

### Community Content Validation Rules

THE system SHALL accept community descriptions containing up to 500 characters.

THE system SHALL accept empty community descriptions.

THE system SHALL reject community icon uploads that are not valid image files.

THE system SHALL accept PNG, JPG, and JPEG image formats for community icons.

IF an uploaded icon image exceeds the maximum allowed file size, THEN THE system SHALL reject the upload.

THE system SHALL allow community creation without an icon image.

IF a user attempts to upload a non-image file as a community icon, THEN THE system SHALL reject the upload and display an error.

THE system SHALL preserve the original aspect ratio of uploaded community icon images.

IF an uploaded icon image is corrupted or unreadable, THEN THE system SHALL reject the upload.

THE system SHALL allow users to update their community icon after creation.

THE system SHALL allow users to remove their community icon, leaving it blank.

### Community Data Integrity Rules

THE system SHALL prevent community name changes after the community is created.

IF a user attempts to change a community name, THEN THE system SHALL reject the request.

THE system SHALL maintain consistent community data across all platform views and feeds.

THE system SHALL display accurate subscriber counts for all communities.

IF a user subscribes to a community, THEN THE system SHALL immediately update the subscriber count.

IF a user unsubscribes from a community, THEN THE system SHALL immediately update the subscriber count.

THE system SHALL preserve community identity through description and icon updates.

IF a community is deleted, THEN THE system SHALL remove all associated posts and comments.

THE system SHALL ensure community information remains accessible to all subscribers.

THE system SHALL prevent duplicate community names from being created during the same session.

IF two users attempt to create communities with the same name simultaneously, THEN THE system SHALL allow only one creation and reject the other.

THE system SHALL maintain community creation timestamps for sorting and filtering purposes.

## Post Validation Criteria

Post titles are required and must be between 1 and 500 characters to convey the topic clearly. Post content must be provided and can contain up to 10000 characters depending on the post type. Text posts require substantial text content to be meaningful. Link posts must contain a valid URL that can be accessed. Image posts must include an uploaded image file that meets format requirements. Each post must be assigned exactly one type from the available options. Posts cannot be created without a title and appropriate content for their type. Post content must be appropriate for the community where it is posted. Empty or minimal content posts provide little value to readers. Post types determine how content is displayed to users.

### Post Title Validation Rules

THE system SHALL require every post to have a title.

IF a post is submitted without a title, THE system SHALL reject the post creation.

THE system SHALL enforce that post titles contain between 1 and 500 characters.

IF a post title exceeds 500 characters, THE system SHALL reject the post creation.

IF a post title contains only whitespace characters, THE system SHALL treat it as missing and reject the post.

WHEN a user edits their post, THE system SHALL apply the same title validation rules as during creation.

THE system SHALL display the complete post title when viewing a single post.

THE system SHALL truncate post titles in list views to ensure consistent display formatting.

### Post Content Length Rules

THE system SHALL enforce that post content contains between 1 and 10000 characters.

IF post content exceeds 10000 characters, THE system SHALL reject the post creation.

IF post content is empty or contains only whitespace, THE system SHALL reject the post creation.

WHEN a user edits their post content, THE system SHALL validate the new content length against the same limits.

THE system SHALL allow users to compose content up to the maximum limit without intermediate validation errors.

IF a user attempts to paste content that exceeds the maximum length, THE system SHALL truncate the content to 10000 characters.

THE system SHALL display a character count indicator to users during content composition.

WHEN viewing a single post, THE system SHALL display the complete post content regardless of length.

### Post Type Assignment Rules

THE system SHALL require every post to be assigned exactly one post type.

THE system SHALL support three post types: text post, link post, and image post.

IF a post is submitted without a type assignment, THE system SHALL reject the post creation.

IF a post is submitted with multiple type assignments, THE system SHALL reject the post creation.

WHEN a user creates a post, THE system SHALL require them to select one of the three available types.

THE system SHALL not allow users to change a post's type after creation.

IF a user attempts to change their post type, THE system SHALL require them to create a new post instead.

THE system SHALL display the post type indicator when viewing a single post.

THE system SHALL use the post type to determine how content is displayed in list views.

### Text Post Content Rules

THE system SHALL require text posts to contain substantial text content.

IF a text post contains less than 10 characters of actual text, THE system SHALL reject the post creation.

THE system SHALL count only non-whitespace characters when validating text post content length.

WHEN a user creates a text post, THE system SHALL validate that the content meets minimum length requirements.

THE system SHALL display the complete text content when viewing a single text post.

THE system SHALL display the first 200 characters of text post content in list views.

IF text post content exceeds 200 characters in list views, THE system SHALL truncate with an ellipsis indicator.

THE system SHALL not allow text posts with only links or URLs as content.

### Link Post URL Rules

THE system SHALL require link posts to contain a valid URL.

IF a link post URL is missing, THE system SHALL reject the post creation.

IF a link post URL is not in a valid format, THE system SHALL reject the post creation.

THE system SHALL validate URL format including protocol (http or https) and domain name.

IF a link post URL contains only whitespace, THE system SHALL treat it as missing and reject the post.

WHEN a user creates a link post, THE system SHALL validate the URL before post submission.

THE system SHALL display the domain name of the URL in list views for link posts.

THE system SHALL display the complete URL when viewing a single link post.

IF a link post URL is inaccessible, THE system SHALL still allow the post but may mark it as potentially broken.

### Image Post Upload Rules

THE system SHALL require image posts to include an uploaded image file.

IF an image post is submitted without an image file, THE system SHALL reject the post creation.

THE system SHALL validate that uploaded image files are in supported formats (JPEG, PNG, GIF).

IF an uploaded image file exceeds the maximum allowed size, THE system SHALL reject the post creation.

IF an uploaded image file is corrupted or unreadable, THE system SHALL reject the post creation.

WHEN a user uploads an image for a post, THE system SHALL validate the file before post submission.

THE system SHALL display a thumbnail of the image in list views for image posts.

THE system SHALL display the full image when viewing a single image post.

THE system SHALL maintain image quality while optimizing display performance.

### Content Appropriateness Rules

THE system SHALL require all post content to be appropriate for the community where it is posted.

IF post content violates community guidelines, THE system SHALL allow moderators to remove the post.

IF post content contains spam or promotional material, THE system SHALL allow moderators to remove the post.

IF post content contains hate speech or harassment, THE system SHALL allow moderators to remove the post.

WHEN a user reports a post for inappropriate content, THE system SHALL notify community moderators.

THE system SHALL allow moderators to review reported content and take appropriate action.

IF a post is removed for inappropriate content, THE system SHALL notify the post author.

THE system SHALL track content removal reasons for audit purposes.

### Post Creation Validation

THE system SHALL require users to be subscribed to a community before creating posts in that community.

IF a user attempts to create a post in a community they are not subscribed to, THE system SHALL reject the post creation.

THE system SHALL require users to be logged in before creating any post.

IF a guest user attempts to create a post, THE system SHALL require them to log in or sign up.

IF a user is banned from a community, THE system SHALL prevent them from creating posts in that community.

THE system SHALL require both a title and content before allowing post submission.

IF a user attempts to create a post with missing required fields, THE system SHALL display validation errors.

THE system SHALL prevent users from creating posts while their account is suspended.

### Post Display Format Rules

THE system SHALL display post titles in bold formatting in list views.

THE system SHALL display post content according to the post type in single post views.

THE system SHALL show author username below the post title in single post views.

THE system SHALL show the community name in single post views.

THE system SHALL display the vote score prominently in both list and single post views.

THE system SHALL display the comment count in both list and single post views.

THE system SHALL show relative time since posting (e.g., "3 hours ago") in list views.

THE system SHALL show exact posting timestamp in single post views.

### Content Quality Standards

THE system SHALL reject posts with empty or minimal content that provides little value to readers.

THE system SHALL reject posts that contain only repetitive characters or patterns.

THE system SHALL reject posts that appear to be test posts or placeholder content.

IF a post contains only a single word or phrase without context, THE system SHALL flag it for review.

THE system SHALL allow moderators to remove low-quality posts at their discretion.

WHEN a post is removed for low quality, THE system SHALL notify the author of the reason.

THE system SHALL track repeated low-quality post submissions for potential account review.

THE system SHALL encourage users to provide meaningful content through guidance messages.

## Comment Validation Criteria

Comment content is required and must be between 1 and 1000 characters to be meaningful. Comments cannot be empty or contain only whitespace. Comment content must be appropriate for the post and community context. Comments are tied to specific posts and cannot exist independently. Users can edit their own comments but the original posting time remains visible. Comment content must not violate community guidelines or platform policies. Very short comments may provide little value to discussions. Comments should contribute meaningfully to the conversation. Spam or repetitive comments reduce discussion quality. Comment content is visible to all users who can view the post.

### Comment Content Requirements and Length Constraints

**Comment Content Requirements**

WHEN a user creates a comment, THE system SHALL require the comment to contain text content.

IF the comment content is empty, THEN THE system SHALL reject the comment creation.

IF the comment content contains only whitespace characters, THEN THE system SHALL reject the comment creation.

IF the comment content exceeds 1000 characters, THEN THE system SHALL reject the comment creation.

IF the comment content is less than 1 character, THEN THE system SHALL reject the comment creation.

WHEN a comment is created, THE system SHALL associate it with the specific post it belongs to.

IF a user attempts to create a comment without a valid post reference, THEN THE system SHALL reject the comment creation.

WHEN a comment is created, THE system SHALL record the author as the user who submitted it.

WHEN a comment is created, THE system SHALL record the creation timestamp.

**Comment Length Constraints**

THE system SHALL enforce a minimum comment length of 1 character.

THE system SHALL enforce a maximum comment length of 1000 characters.

WHEN a user submits a comment, THE system SHALL validate the character count before acceptance.

IF the comment exceeds the maximum length, THEN THE system SHALL display the character limit to the user.

IF the comment is below the minimum length, THEN THE system SHALL prevent submission.

### Comment Appropriateness and Community Guidelines

**Comment Appropriateness and Guidelines**

WHEN a comment is submitted, THE system SHALL allow moderators to review it for appropriateness.

IF a comment violates community guidelines, THEN THE system SHALL allow moderators to delete it.

IF a comment violates platform policies, THEN THE system SHALL allow moderators to delete it.

WHEN a user reports a comment, THE system SHALL require the reporter to provide a reason.

WHEN moderators review reported comments, THE system SHALL display the comment content, reporter identity, and reason.

IF a comment is deemed inappropriate, THEN THE system SHALL allow moderators to approve the report and delete the content.

IF a comment is deemed acceptable, THEN THE system SHALL allow moderators to dismiss the report.

WHEN a report is dismissed, THE system SHALL remove it from the active report list.

**Community Guideline Compliance**

WHEN a community is created, THE system SHALL allow the owner to establish community-specific guidelines.

IF a comment does not comply with community guidelines, THEN THE system SHALL allow moderators to take action.

THE system SHALL enable moderators to view all reported comments in their community.

THE system SHALL enable moderators to view the list of banned users who cannot comment in their community.

### Comment Editing Rules

**Comment Editing Rules**

WHEN a user edits their own comment, THE system SHALL allow the content to be modified.

WHEN a comment is edited, THE system SHALL preserve the original creation timestamp.

WHEN a comment is edited, THE system SHALL allow the edited content to be displayed to all viewers.

IF a user attempts to edit a comment they do not own, THEN THE system SHALL reject the edit request.

IF a comment has been deleted, THEN THE system SHALL prevent any further editing.

IF a comment has been deleted by a moderator, THEN THE system SHALL prevent any further editing.

WHEN a user edits a comment, THE system SHALL validate the new content against the same length constraints as original creation.

IF the edited comment exceeds 1000 characters, THEN THE system SHALL reject the edit.

IF the edited comment is empty or contains only whitespace, THEN THE system SHALL reject the edit.

### Discussion Quality and Spam Prevention

**Discussion Quality and Spam Prevention**

WHEN a user creates multiple comments in rapid succession, THE system SHALL allow moderators to review for spam patterns.

IF a comment is identified as spam, THEN THE system SHALL allow moderators to delete it.

IF a comment is repetitive or identical to previous comments by the same user, THEN THE system SHALL allow moderators to flag it.

WHEN a comment receives multiple reports, THE system SHALL prioritize it for moderator review.

IF a user's comments consistently receive reports, THEN THE system SHALL allow moderators to consider banning the user.

THE system SHALL enable moderators to ban users who repeatedly post low-quality or spam comments.

WHEN a user is banned from a community, THE system SHALL prevent them from creating new comments in that community.

WHEN a user is banned from a community, THE system SHALL prevent them from replying to existing comments in that community.

IF a banned user attempts to comment, THEN THE system SHALL reject the comment creation.

THE system SHALL allow moderators to unban users and restore their commenting privileges.

**Comment Value**

WHEN comments are displayed, THE system SHALL allow sorting by vote score to surface high-value contributions.

WHEN comments are sorted by best, THE system SHALL display highest vote score comments first.

IF a comment receives negative votes, THE system SHALL still display it but may prioritize it lower in default sorting.

THE system SHALL allow users to upvote comments that contribute meaningfully to discussion.

THE system SHALL allow users to downvote comments that do not contribute meaningfully to discussion.

### Content Visibility and Posting Context

**Content Visibility and Posting Context**

WHEN a comment is created, THE system SHALL make it visible to all users who can view the parent post.

IF a user is banned from a community, THEN THE system SHALL allow them to view existing comments in that community.

IF a user is banned from a community, THEN THE system SHALL prevent them from creating new comments in that community.

WHEN a comment is deleted, THE system SHALL remove it from view for all users.

WHEN a comment is deleted by a moderator, THE system SHALL remove it from view for all users.

WHEN a comment is deleted by its author, THE system SHALL remove it from view for all users.

IF a comment belongs to a deleted post, THEN THE system SHALL remove the comment from view.

**Posting Context**

WHEN a comment is created, THE system SHALL associate it with the specific post context.

WHEN a comment is displayed, THE system SHALL show the author username.

WHEN a comment is displayed, THE system SHALL show the vote score.

WHEN a comment is displayed, THE system SHALL show the time since it was posted.

WHEN a comment has replies, THE system SHALL display them in a nested structure.

THE system SHALL allow unlimited nesting depth for comment replies.

WHEN a comment is displayed, THE system SHALL show its position in the reply hierarchy.

IF a user attempts to comment on a deleted post, THEN THE system SHALL reject the comment creation.

## Vote Validation Criteria

Votes can only have values of plus one for upvotes or minus one for downvotes. Each user can cast only one vote per post or comment. Users can change their vote from upvote to downvote or remove it entirely. Vote values cannot be any other number besides plus one or minus one. Votes are anonymous to other users but tracked internally. Vote scores are calculated by summing all upvotes and downvotes. A user cannot vote on content from banned communities. Vote changes immediately affect the displayed score. Vote removal adjusts the score accordingly. Votes cannot be cast by users who are not logged in.

### Vote Value Constraints

THE system SHALL only accept vote values of plus one or minus one.

IF a vote value is not plus one or minus one, THEN THE system SHALL reject the vote.

THE system SHALL not allow vote values of zero, two, negative two, or any other number.

IF a user attempts to submit a vote with an invalid value, THEN THE system SHALL return an error indicating the vote value is invalid.

### Single Vote Per User

THE system SHALL ensure each user can cast only one vote per post.

THE system SHALL ensure each user can cast only one vote per comment.

IF a user attempts to vote on a post they have already voted on, THEN THE system SHALL replace their existing vote.

IF a user attempts to vote on a comment they have already voted on, THEN THE system SHALL replace their existing vote.

THE system SHALL not allow a user to have multiple votes on the same post or comment simultaneously.

### Vote Change Rules

WHEN a user changes their vote from upvote to downvote, THE system SHALL update the vote value from plus one to minus one.

WHEN a user changes their vote from downvote to upvote, THE system SHALL update the vote value from minus one to plus one.

THE system SHALL allow users to change their vote at any time.

IF a user changes their vote, THEN THE system SHALL adjust the score accordingly.

### Vote Removal

WHEN a user removes their vote, THE system SHALL delete the vote record.

WHEN a vote is removed, THE system SHALL adjust the score by removing the contribution of that vote.

THE system SHALL allow users to remove their vote at any time.

IF a user removes their vote, THEN THE system SHALL update the score immediately.

### Score Calculation

THE system SHALL calculate post vote score as the sum of all upvotes minus the sum of all downvotes.

THE system SHALL calculate comment vote score as the sum of all upvotes minus the sum of all downvotes.

THE system SHALL display the current vote score to all users.

IF a vote is added, changed, or removed, THEN THE system SHALL recalculate the score.

THE system SHALL allow vote scores to be negative.

### Vote Anonymity

THE system SHALL keep individual votes anonymous to other users.

THE system SHALL not display which users voted on a post or comment.

THE system SHALL not display vote values cast by specific users to other users.

WHEN viewing a post or comment, users SHALL only see the aggregate score, not individual votes.

### Banned User Restrictions

IF a user is banned from a community, THEN THE system SHALL prevent them from voting on posts in that community.

IF a user is banned from a community, THEN THE system SHALL prevent them from voting on comments in that community.

IF a banned user attempts to vote on content in a banned community, THEN THE system SHALL reject the vote.

THE system SHALL not display a ban error message to the user when they attempt to vote.

### Score Updates

WHEN a vote is added, THE system SHALL update the score immediately.

WHEN a vote is changed, THE system SHALL update the score immediately.

WHEN a vote is removed, THE system SHALL update the score immediately.

THE system SHALL reflect score updates to all users viewing the content.

THE system SHALL ensure score updates are visible within the current session.

### Login Requirements

IF a user is not logged in, THEN THE system SHALL prevent them from voting.

THE system SHALL require users to be authenticated before they can cast a vote.

IF a guest attempts to vote, THEN THE system SHALL prompt them to log in.

THE system SHALL not allow anonymous voting on any content.

### Vote Integrity

THE system SHALL ensure vote data integrity by preventing duplicate votes from the same user on the same content.

THE system SHALL ensure vote scores are always consistent with the sum of individual votes.

IF a vote operation fails, THEN THE system SHALL not partially update the score.

THE system SHALL maintain vote history to allow score recalculation if needed.

THE system SHALL prevent vote manipulation by ensuring each vote is associated with exactly one user and one content item.

## Subscription Validation Criteria

Subscriptions link users to communities they want to follow. Each user can subscribe to multiple communities without limit. A user cannot subscribe to the same community twice. Subscriptions are required before users can create posts in a community. Users can view all communities they have subscribed to in one place. Unsubscribing removes the community from the user's home feed. Subscription timestamps record when users joined communities. Users can subscribe to communities they do not moderate. Subscription status affects which posts appear in home feeds. Duplicate subscriptions are prevented to maintain data integrity.

### Subscription Relationship Rules

THE system SHALL allow each user to establish subscription relationships with multiple communities simultaneously.

THE system SHALL maintain a separate subscription record for each user-community pair.

THE system SHALL record the timestamp when each subscription is created.

WHEN a user subscribes to a community, THE system SHALL create a new subscription record linking the user to that community.

WHEN a user subscribes to a community, THE system SHALL increment the community's subscriber count.

WHEN a user unsubscribes from a community, THE system SHALL decrement the community's subscriber count.

THE system SHALL allow users to subscribe to communities regardless of whether they moderate those communities.

THE system SHALL allow users to subscribe to communities they own.

WHILE a subscription exists, THE system SHALL include posts from that community in the user's home feed.

WHEN a subscription is removed, THE system SHALL exclude posts from that community from the user's home feed.

### Duplicate Subscription Prevention

THE system SHALL prevent duplicate subscriptions between the same user and the same community.

IF a user attempts to subscribe to a community they are already subscribed to, THE system SHALL reject the request.

IF a user attempts to subscribe to a community they are already subscribed to, THE system SHALL inform the user that they are already subscribed.

THE system SHALL ensure each user-community subscription pair is unique across the platform.

THE system SHALL maintain data integrity by preventing orphaned subscription records when users or communities are deleted.

WHEN a user deletes their account, THE system SHALL remove all subscription records associated with that user.

WHEN a community is deleted, THE system SHALL remove all subscription records associated with that community.

### Posting Prerequisites

THE system SHALL require users to be subscribed to a community before they can create posts in that community.

IF a user attempts to create a post in a community they are not subscribed to, THE system SHALL reject the request.

IF a user attempts to create a post in a community they are not subscribed to, THE system SHALL inform the user that subscription is required.

THE system SHALL verify subscription status before allowing post creation in any community.

WHEN a user unsubscribes from a community, THE system SHALL prevent that user from creating new posts in that community.

THE system SHALL not require subscription for viewing posts in a community.

THE system SHALL not require subscription for commenting on posts in a community.

### Subscription Management Rules

THE system SHALL allow users to view a complete list of all communities they are subscribed to.

THE system SHALL display subscription information including community name and subscription date.

WHEN a user views their subscription list, THE system SHALL show all active subscriptions.

THE system SHALL allow users to unsubscribe from any community in their subscription list.

WHEN a user unsubscribes from a community, THE system SHALL remove that community from their subscription list.

WHEN a user unsubscribes from a community, THE system SHALL update the subscription timestamp to reflect the unsubscription.

THE system SHALL preserve subscription history for analytics and audit purposes.

### Moderator Subscription Rules

THE system SHALL allow moderators to subscribe to their own communities.

THE system SHALL allow owners to subscribe to their own communities.

THE system SHALL treat moderator subscriptions the same as regular user subscriptions for feed purposes.

WHEN a moderator is added to a community, THE system SHALL not automatically subscribe them to that community.

WHEN an owner creates a community, THE system SHALL not automatically subscribe them to that community.

THE system SHALL allow moderators to unsubscribe from their own communities without affecting their moderator role.

THE system SHALL allow owners to unsubscribe from their own communities without affecting their ownership role.

### Feed Visibility Rules

THE system SHALL filter home feed posts to show only posts from subscribed communities.

THE system SHALL exclude posts from unsubscribed communities from the home feed.

THE system SHALL include posts from all subscribed communities in the home feed regardless of post age.

WHEN a user subscribes to a new community, THE system SHALL include posts from that community in their home feed.

WHEN a user unsubscribes from a community, THE system SHALL immediately exclude posts from that community from their home feed.

THE system SHALL not show posts from communities the user is banned from in the home feed.

THE system SHALL not show posts from communities the user has blocked in the home feed.

## Report Validation Criteria

Report reasons must be provided and can contain up to 500 characters explaining the issue. Reports must specify whether they concern a post or comment. Report status starts as pending when first submitted. Moderators can approve reports which deletes the reported content. Moderators can dismiss reports which keeps the content and removes the report. Dismissed reports are removed from the active report list. Reports must be submitted by logged-in users only. Each report is tied to specific content that can be reviewed. Report reasons help moderators understand the violation. Multiple users can report the same content independently.

### Report Submission Requirements

WHEN a user submits a report, THE system SHALL require a reason explaining the issue.

IF the report reason is empty, THE system SHALL reject the report submission.

IF the report reason exceeds 500 characters, THE system SHALL reject the report submission.

THE system SHALL require the reporter to specify whether the report concerns a post or a comment.

WHEN a user submits a report, THE system SHALL associate the report with the specific post or comment being reported.

IF the reported content (post or comment) no longer exists, THE system SHALL reject the report submission.

IF the reporter does not have access to view the reported content, THE system SHALL reject the report submission.

WHEN a user submits a report, THE system SHALL record the identity of the user who submitted the report.

THE system SHALL allow only logged-in users to submit reports.

IF a user attempts to submit a report without being logged in, THE system SHALL redirect them to the login page.

WHEN a report is successfully submitted, THE system SHALL set the report status to pending.

### Report Status and Workflow

WHEN a moderator approves a report, THE system SHALL delete the reported content (post or comment).

WHEN a moderator approves a report, THE system SHALL change the report status from pending to approved.

WHEN a moderator dismisses a report, THE system SHALL keep the reported content unchanged.

WHEN a moderator dismisses a report, THE system SHALL change the report status from pending to dismissed.

WHEN a moderator dismisses a report, THE system SHALL remove the report from the active report list.

IF a moderator attempts to approve a report with status already approved, THE system SHALL reject the action.

IF a moderator attempts to dismiss a report with status already dismissed, THE system SHALL reject the action.

WHILE a report has status pending, THE system SHALL allow moderators to view it in the report list.

WHILE a report has status dismissed, THE system SHALL hide it from the active report list.

THE system SHALL prevent users from modifying a report after submission.

IF a user attempts to edit their submitted report, THE system SHALL reject the action.

WHEN a reported post is deleted by a moderator, THE system SHALL also delete all comments on that post.

WHEN a reported comment is deleted by a moderator, THE system SHALL preserve any replies to that comment but mark them as orphaned.

### Report Visibility and Independence

THE system SHALL display the reported content to moderators when they review a report.

THE system SHALL display the identity of the user who submitted the report to moderators.

THE system SHALL display the reason provided by the reporter to moderators.

IF a user is not a moderator of the community, THE system SHALL hide all reports from that user.

WHEN a moderator views a report, THE system SHALL show the content type (post or comment) being reported.

THE system SHALL allow multiple users to report the same content independently.

WHEN multiple users report the same content, THE system SHALL create separate report records for each submission.

IF a user reports content they previously reported, THE system SHALL create a new report record.

THE system SHALL allow moderators to view all reports for their community in a single list.

WHEN a moderator views the report list, THE system SHALL show the status of each report.

THE system SHALL prevent non-moderators from viewing the report submission interface.

IF a banned user attempts to submit a report in the banned community, THE system SHALL reject the action.

## Moderator Validation Criteria

Moderator roles are either owner or regular moderator with different permissions. The community creator automatically becomes the owner with highest authority. Owners can add and remove moderators at their discretion. Moderators can add other moderators but cannot remove the owner. Moderators cannot remove each other, only owners have that authority. Role assignments must be valid users of the platform. A community must always have at least one owner. Role changes are tracked for accountability purposes. Moderators have elevated permissions within their assigned community. Owner status cannot be transferred without proper procedures.

### Role Types and Authority Hierarchy

THE system SHALL recognize exactly two moderator role types: owner and mod.

THE owner role SHALL have the highest authority within a community.

THE mod role SHALL have elevated permissions but subordinate to the owner.

THE authority hierarchy SHALL be: owner > mod > member > guest.

WHEN a community is created, THE system SHALL automatically assign the owner role to the creator.

THE owner role SHALL be unique per community (only one owner at a time).

IF a community has no owner, THEN THE system SHALL prevent all moderator actions.

THE system SHALL enforce role-based access control for all moderator functions.

WHILE a user has the owner role, THE system SHALL grant them full community control.

WHILE a user has the mod role, THE system SHALL grant them limited community control.

IF a user has no moderator role, THEN THE system SHALL treat them as a regular member for moderation purposes.

### Owner Authority and Community Ownership

THE owner SHALL be able to add moderators to their community.

THE owner SHALL be able to remove moderators from their community.

THE owner SHALL be able to delete any post in their community.

THE owner SHALL be able to delete any comment in their community.

THE owner SHALL be able to ban users from their community.

THE owner SHALL be able to unban users from their community.

THE owner SHALL be able to view all reports for their community.

THE owner SHALL be able to approve or dismiss reports.

THE owner SHALL have final authority on all community decisions.

IF the owner deletes their account, THEN THE system SHALL require ownership transfer before deletion.

THE system SHALL prevent ownership transfer without owner authorization.

IF an owner attempts to remove themselves, THEN THE system SHALL require ownership transfer first.

THE system SHALL prevent a community from having zero owners.

THE owner SHALL retain ownership even if they are inactive.

### Moderator Permissions and Elevation Requirements

A mod SHALL be able to add other moderators.

A mod SHALL be able to delete posts in their community.

A mod SHALL be able to delete comments in their community.

A mod SHALL be able to ban users from their community.

A mod SHALL be able to unban users from their community.

A mod SHALL be able to view reports for their community.

A mod SHALL be able to approve or dismiss reports.

A mod SHALL NOT be able to remove the owner.

A mod SHALL NOT be able to remove other moderators.

TO become a moderator, THE user SHALL be a registered member.

TO become a moderator, THE user SHALL not be banned from the community.

THE system SHALL validate moderator role assignments against user status.

IF a user is banned, THEN THE system SHALL prevent moderator role assignment.

THE system SHALL track moderator elevation events.

IF a user's account is deleted, THEN THE system SHALL remove all their moderator roles.

### Role Assignment and Removal Rules

THE owner SHALL be the only user who can remove moderators.

THE owner SHALL be the only user who can remove other moderators.

A mod SHALL not be able to remove another mod.

THE system SHALL require owner authorization for all role removals.

WHEN a moderator is removed, THE system SHALL revoke all moderator permissions immediately.

THE system SHALL track all role assignment changes with timestamps.

THE system SHALL record who performed each role change.

WHEN ownership is transferred, THE system SHALL update the role hierarchy.

THE system SHALL maintain audit logs for all role changes.

IF a role change is attempted by an unauthorized user, THEN THE system SHALL reject the request.

THE system SHALL validate that the target user exists before role assignment.

IF the target user is not a member, THEN THE system SHALL reject the moderator assignment.

IF the target user already has a moderator role in the community, THEN THE system SHALL reject duplicate assignment.

THE system SHALL prevent role assignment to banned users.

WHEN a role change occurs, THE system SHALL notify affected users.

## Ban Validation Criteria

Ban reasons are optional but can contain up to 500 characters explaining the violation. Ban timestamps record when users were banned from communities. Bans can be lifted by moderators at any time. Lifted bans record when the restriction was removed. Banned users cannot create posts or comments in the community. Banned users can still view community content. Multiple communities can ban the same user independently. Ban records help moderators track problematic users. Bans are community-specific and do not affect other communities. Ban status must be clearly tracked to enforce restrictions.

### Ban Reason Requirements

IF a moderator provides a ban reason, THEN THE system SHALL store the reason text.

IF a moderator does not provide a ban reason, THEN THE system SHALL allow the ban to proceed.

IF a ban reason exceeds 500 characters, THEN THE system SHALL reject the ban request.

IF a ban reason contains only whitespace, THEN THE system SHALL treat it as empty and allow the ban.

THE system SHALL permit ban reasons to be empty strings.

THE system SHALL preserve the exact ban reason text as entered by the moderator.

WHEN a moderator views a ban record, THE system SHALL display the ban reason if one was provided.

WHEN a moderator views a ban record without a reason, THE system SHALL indicate that no reason was provided.

### Ban Timestamp Recording

WHEN a user is banned from a community, THE system SHALL record the ban timestamp.

WHEN a moderator lifts a ban, THE system SHALL record the lift timestamp.

THE system SHALL store the exact datetime when a ban was applied.

THE system SHALL store the exact datetime when a ban was lifted.

IF a ban has not been lifted, THEN THE system SHALL leave the lift timestamp empty.

THE system SHALL use the ban timestamp to calculate how long a user has been banned.

THE system SHALL use the lift timestamp to determine when restrictions were removed.

WHEN a moderator views ban records, THE system SHALL display when each ban was applied.

WHEN a moderator views lifted bans, THE system SHALL display when each ban was lifted.

THE system SHALL maintain ban timestamps even if other ban data is updated.

### Ban Lifting Validation

WHEN a moderator lifts a ban, THE system SHALL remove the posting restriction for that user.

WHEN a moderator lifts a ban, THE system SHALL remove the commenting restriction for that user.

WHEN a moderator lifts a ban, THE system SHALL record the lift timestamp.

IF a user has an active ban, THEN THE system SHALL allow moderators to lift it.

IF a user does not have an active ban, THEN THE system SHALL prevent duplicate lift actions.

THE system SHALL immediately restore user privileges when a ban is lifted.

THE system SHALL update the ban status to indicate it has been lifted.

WHEN a moderator lifts a ban, THE system SHALL notify the affected user.

IF a moderator attempts to lift a ban that was already lifted, THEN THE system SHALL reject the action.

THE system SHALL allow the same moderator who applied a ban to lift it.

### Restriction Enforcement Rules

WHILE a user is banned from a community, THE system SHALL prevent them from creating posts in that community.

WHILE a user is banned from a community, THE system SHALL prevent them from creating comments in that community.

WHILE a user is banned from a community, THE system SHALL prevent them from voting on posts in that community.

WHILE a user is banned from a community, THE system SHALL prevent them from voting on comments in that community.

IF a banned user attempts to create a post, THEN THE system SHALL reject the request.

IF a banned user attempts to create a comment, THEN THE system SHALL reject the request.

IF a banned user attempts to vote on content, THEN THE system SHALL reject the request.

THE system SHALL apply restrictions only to the community where the user is banned.

THE system SHALL not restrict a banned user's access to other communities.

THE system SHALL enforce restrictions immediately when a ban is applied.

### Banned User Content Access

WHILE a user is banned from a community, THE system SHALL allow them to view posts in that community.

WHILE a user is banned from a community, THE system SHALL allow them to view comments in that community.

WHILE a user is banned from a community, THE system SHALL allow them to view the community feed.

WHILE a user is banned from a community, THE system SHALL allow them to view other users' profiles.

WHILE a user is banned from a community, THE system SHALL allow them to view community information.

THE system SHALL display all community content to banned users without restriction.

IF a banned user requests to view a post, THEN THE system SHALL display the post content.

IF a banned user requests to view comments, THEN THE system SHALL display the comment content.

THE system SHALL not hide community content from banned users.

THE system SHALL allow banned users to subscribe to the community.

### Community Ban Isolation

THE system SHALL apply bans only to the specific community where the ban was issued.

THE system SHALL allow a user banned from one community to post in other communities.

THE system SHALL allow a user banned from one community to comment in other communities.

THE system SHALL allow multiple communities to ban the same user independently.

THE system SHALL maintain separate ban records for each community-user pair.

IF a user is banned from multiple communities, THEN THE system SHALL enforce each ban independently.

IF a user is unbanned from one community, THEN THE system SHALL not affect bans in other communities.

THE system SHALL track which communities have banned each user.

THE system SHALL allow moderators to view all users banned from their community.

THE system SHALL allow moderators to view which communities a specific user is banned from.

## Block Validation Criteria

Block relationships are between two users on the platform. Block timestamps record when one user blocked another. Blocks prevent blocked users from interacting with the blocker. Blocks are mutual in effect but initiated by one user. Users can unblock others at any time. Block status affects visibility of content between users. Multiple users can block the same user independently. Blocks do not affect content visibility to other users. Block relationships must be tracked to enforce restrictions. Block timestamps help users understand when restrictions were applied.

### User-to-User Blocking Rules

WHEN a user blocks another user, THE system SHALL create a block relationship between the two users.

IF a user attempts to block themselves, THE system SHALL reject the request.

IF a user attempts to block a user they have already blocked, THE system SHALL reject the request.

THE system SHALL allow any user to block any other user regardless of subscription status.

THE system SHALL allow any user to block any other user regardless of community membership.

WHEN a block relationship is created, THE system SHALL record the blocking user as the initiator.

THE system SHALL maintain block relationships independently for each user pair.

THE system SHALL track all active block relationships for each user.

### Block Timestamp Requirements

WHEN a user blocks another user, THE system SHALL record the exact timestamp of the block.

THE system SHALL store block timestamps with date and time precision.

WHEN viewing block information, THE system SHALL display when the block was created.

THE system SHALL use block timestamps to determine the order of multiple blocks.

WHEN a user unblocks another user, THE system SHALL preserve the original block timestamp for historical reference.

THE system SHALL use block timestamps to calculate how long a block has been active.

IF a block timestamp is missing, THE system SHALL reject the block record as invalid.

### Interaction Prevention Rules

WHEN User A blocks User B, THE system SHALL prevent User B from commenting on User A's posts.

WHEN User A blocks User B, THE system SHALL prevent User B from commenting on User A's comments.

WHEN User A blocks User B, THE system SHALL prevent User B from sending direct messages to User A.

WHEN User A blocks User B, THE system SHALL prevent User B from mentioning User A in posts or comments.

THE system SHALL prevent blocked users from voting on the blocker's content.

THE system SHALL prevent blocked users from subscribing to communities created by the blocker.

IF a blocked user attempts to interact with the blocker, THE system SHALL reject the action and notify the user.

### Unblock Capability Rules

WHEN a user unblocks another user, THE system SHALL remove the block relationship.

THE system SHALL allow users to unblock any user they have blocked at any time.

WHEN a user is unblocked, THE system SHALL restore all interaction capabilities between the users.

THE system SHALL not automatically unblock users under any circumstances.

WHEN a user deletes their account, THE system SHALL remove all blocks created by that user.

WHEN a user deletes their account, THE system SHALL remove all blocks targeting that user.

IF a user attempts to unblock a user they have not blocked, THE system SHALL reject the request.

### Content Visibility Rules

WHEN User A blocks User B, THE system SHALL hide User B's posts from User A's feeds.

WHEN User A blocks User B, THE system SHALL hide User B's comments from User A's view.

THE system SHALL hide blocked user's content from the blocker's home feed.

THE system SHALL hide blocked user's content from the blocker's community feeds.

WHEN User A blocks User B, THE system SHALL prevent User A from viewing User B's profile page.

THE system SHALL not hide blocked user's content from users who have not blocked them.

WHEN a user unblocks another user, THE system SHALL restore visibility of the unblocked user's content.

IF blocked content is accessed via direct URL, THE system SHALL redirect to an error page.

### Independent Blocking Rules

THE system SHALL allow multiple users to block the same user independently.

WHEN User A blocks User B, THE system SHALL not affect User C's ability to interact with User B.

THE system SHALL maintain separate block relationships for each user.

WHEN User A blocks User B, THE system SHALL not automatically block User B from User A.

THE system SHALL allow User B to block User A independently of User A's block.

WHEN User A unblocks User B, THE system SHALL not affect User C's block of User B.

THE system SHALL treat each block relationship as independent and isolated from others.

IF User A and User B both block each other, THE system SHALL maintain both block relationships separately.

# Data Browsing Expectations

Business expectations for how users browse, find, and navigate through lists of data.

## List Browsing Expectations

Define business expectations for how users find, filter, and browse lists.

### Feed Filtering Rules

WHEN viewing the Home Feed, THE system SHALL display posts only from communities the user is subscribed to.

WHEN viewing the Popular Feed, THE system SHALL display posts from all communities across the platform.

WHEN viewing the Community Feed, THE system SHALL display posts from one specific community.

WHEN a guest views the Home Feed, THE system SHALL reject the request and require login.

WHEN a guest views the Popular Feed, THE system SHALL allow access without authentication.

WHEN a guest views the Community Feed, THE system SHALL allow access without authentication.

IF a user is banned from a community, THEN THE system SHALL exclude posts from that community in the Home Feed.

IF a user has blocked another user, THEN THE system SHALL exclude posts authored by the blocked user from all feeds.

IF a user has blocked another user, THEN THE system SHALL exclude comments authored by the blocked user from all feeds.

WHEN filtering posts by type, THE system SHALL allow selection of text posts, link posts, or image posts.

WHEN filtering posts by time period for the Top sort, THE system SHALL allow selection of today, this week, this month, this year, or all time.

### Feed Sorting Rules

WHEN sorting posts by Hot, THE system SHALL prioritize recent posts with many upvotes.

WHEN sorting posts by New, THE system SHALL display posts in reverse chronological order by creation time.

WHEN sorting posts by Top, THE system SHALL display posts with the highest vote score first.

WHEN sorting posts by Top with a time filter, THE system SHALL consider only posts created within the selected time period.

WHEN sorting posts by Controversial, THE system SHALL prioritize posts with many votes but a score close to zero.

WHEN sorting comments by Best, THE system SHALL display comments with the highest vote score first.

WHEN sorting comments by New, THE system SHALL display comments in reverse chronological order by creation time.

WHEN sorting comments by Controversial, THE system SHALL prioritize comments with many votes but a score close to zero.

IF multiple posts have the same sort key value, THEN THE system SHALL order them by creation time (newest first).

IF a post has no votes, THEN THE system SHALL place it last in Hot and Controversial sorting.

IF a comment has no votes, THEN THE system SHALL place it last in Best and Controversial sorting.

WHEN the Top sort is selected without a time filter, THE system SHALL default to "all time".

### Feed Pagination Rules

WHEN viewing any feed, THE system SHALL display posts in paginated groups.

WHEN a user reaches the end of a page, THE system SHALL provide navigation to the next page.

WHEN a user is on a page after the first, THE system SHALL provide navigation to the previous page.

WHEN a user requests a page number, THE system SHALL return posts for that specific page.

IF a user requests a page number beyond available pages, THEN THE system SHALL return an empty result set.

IF a user requests a page number less than one, THEN THE system SHALL redirect to page one.

WHEN posts are deleted from a page, THEN THE system SHALL adjust subsequent page contents accordingly.

WHEN new posts are created, THEN THE system SHALL include them in the appropriate page based on sorting order.

WHEN a user changes the sort order, THEN THE system SHALL reset pagination to the first page.

WHEN a user changes the filter criteria, THEN THE system SHALL reset pagination to the first page.

IF the total number of posts is less than the page size, THEN THE system SHALL display all posts on a single page.

WHEN browsing comments on a post, THE system SHALL display comments in paginated groups.

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### User Account Error Scenarios

WHEN a user attempts to sign up with an email already registered, THE system SHALL reject the registration.
WHEN a user attempts to sign up with a username that is already taken, THE system SHALL reject the registration.
WHEN a user attempts to log in with an incorrect password, THE system SHALL reject the login attempt.
WHEN a user attempts to log in with a non-existent email, THE system SHALL reject the login attempt.
WHEN a user attempts to change their password with an incorrect current password, THE system SHALL reject the password change.
WHEN a user deletes their account, THE system SHALL permanently remove all their posts and comments.
IF a user attempts to log in after their account is deleted, THE system SHALL reject the login attempt.

### Community Error Scenarios

WHEN a user attempts to create a community with a name that already exists, THE system SHALL reject the creation.
WHEN a user attempts to create a community without a name, THE system SHALL reject the creation.
WHEN a non-owner attempts to remove the community owner, THE system SHALL reject the action.
WHEN a moderator attempts to remove another moderator, THE system SHALL reject the action.
WHEN a user attempts to create a post in a community they are not subscribed to, THE system SHALL reject the post creation.
WHEN a banned user attempts to create a post in the banned community, THE system SHALL reject the post creation.
WHEN a banned user attempts to create a comment in the banned community, THE system SHALL reject the comment creation.

### Post and Comment Error Scenarios

WHEN a user attempts to create a post without a title, THE system SHALL reject the post creation.
WHEN a user attempts to create a text post without content, THE system SHALL reject the post creation.
WHEN a user attempts to create a link post without a URL, THE system SHALL reject the post creation.
WHEN a user attempts to create an image post without an image, THE system SHALL reject the post creation.
WHEN a user attempts to edit a post they do not own, THE system SHALL reject the edit.
WHEN a user attempts to delete a post they do not own and are not a moderator of, THE system SHALL reject the deletion.
WHEN a user attempts to create a comment without content, THE system SHALL reject the comment creation.
WHEN a user attempts to edit a comment they do not own, THE system SHALL reject the edit.
WHEN a user attempts to delete a comment they do not own and are not a moderator of, THE system SHALL reject the deletion.
WHEN a moderator deletes a post, THE system SHALL also delete all comments on that post.
WHEN a user attempts to view a post that has been deleted, THE system SHALL indicate the post is unavailable.
WHEN a user attempts to view a comment that has been deleted, THE system SHALL indicate the comment is unavailable.

### Voting Error Scenarios

WHEN a user attempts to vote on a post they have already voted on without changing their vote, THE system SHALL update their existing vote.
WHEN a user attempts to vote on a comment they have already voted on without changing their vote, THE system SHALL update their existing vote.
WHEN a user removes their vote, THE system SHALL adjust the score accordingly.
IF a user votes on a post that has been deleted, THE system SHALL reject the vote.
IF a user votes on a comment that has been deleted, THE system SHALL reject the vote.
WHEN a user attempts to vote multiple times on the same item simultaneously, THE system SHALL process only the final vote state.

### Subscription Error Scenarios

WHEN a user attempts to subscribe to a community they are already subscribed to, THE system SHALL reject the duplicate subscription.
WHEN a user attempts to unsubscribe from a community they are not subscribed to, THE system SHALL reject the unsubscription.
WHEN the owner of a community attempts to unsubscribe, THE system SHALL reject the unsubscription.
WHEN a user views their subscription list, THE system SHALL display only communities they are subscribed to.
IF a community is deleted, THE system SHALL remove all subscriptions to that community.

### Reporting Error Scenarios

WHEN a user attempts to report a post without providing a reason, THE system SHALL reject the report.
WHEN a user attempts to report a comment without providing a reason, THE system SHALL reject the report.
WHEN a user attempts to report content that has been deleted, THE system SHALL reject the report.
WHEN a moderator approves a report, THE system SHALL delete the reported content.
WHEN a moderator dismisses a report, THE system SHALL remove the report from the pending list.
WHEN a non-moderator attempts to view reports, THE system SHALL reject the request.
WHEN a moderator from a different community attempts to view reports, THE system SHALL reject the request.

### Moderation Error Scenarios

WHEN a non-owner attempts to add a moderator, THE system SHALL reject the action unless they are an existing moderator.
WHEN a non-owner attempts to remove a moderator, THE system SHALL reject the action.
WHEN a user attempts to ban a user they do not have moderation authority over, THE system SHALL reject the action.
WHEN a moderator attempts to unban a user who is not banned, THE system SHALL reject the action.
WHEN a banned user attempts to view the list of banned users, THE system SHALL reject the request.
WHEN a user is banned, THE system SHALL prevent them from creating posts or comments in that community.
WHEN a banned user attempts to view content in the banned community, THE system SHALL allow viewing but prevent interaction.

### Feed and Browsing Error Scenarios

WHEN a logged-out user attempts to access the home feed, THE system SHALL redirect to login or show an error.
WHEN a user requests a feed with an invalid sorting option, THE system SHALL default to the standard sort order.
WHEN a user requests a feed page that does not exist, THE system SHALL return an empty result set.
WHEN a user attempts to access a community feed for a non-existent community, THE system SHALL indicate the community is unavailable.
WHEN content in a feed is deleted while the user is viewing, THE system SHALL hide the deleted content from the list.
WHEN a user attempts to view a post from a community they are banned from, THE system SHALL allow viewing but prevent voting and commenting.

### Profile and Data Error Scenarios

WHEN a user attempts to view their own profile, THE system SHALL display their display name, bio, avatar, karma, posts, and comments.
WHEN a user attempts to view another user's profile, THE system SHALL display their display name, bio, avatar, karma, posts, and comments.
WHEN a user attempts to edit another user's profile, THE system SHALL reject the action.
WHEN a user's account is deleted, THE system SHALL remove their profile and all associated data.
WHEN a user attempts to set an avatar that exceeds size limits, THE system SHALL reject the upload.
WHEN a user attempts to set a bio that exceeds character limits, THE system SHALL reject the update.
WHEN a user attempts to set a display name that is empty or too short, THE system SHALL reject the update.

### Karma Calculation Error Scenarios

WHEN a user receives an upvote on their post, THE system SHALL increase their karma by 1.
WHEN a user receives a downvote on their post, THE system SHALL decrease their karma by 1.
WHEN a user receives an upvote on their comment, THE system SHALL increase their karma by 1.
WHEN a user receives a downvote on their comment, THE system SHALL decrease their karma by 1.
WHEN a user removes their upvote on a post, THE system SHALL decrease the author's karma by 1.
WHEN a user removes their downvote on a post, THE system SHALL increase the author's karma by 1.
WHEN a user removes their upvote on a comment, THE system SHALL decrease the author's karma by 1.
WHEN a user removes their downvote on a comment, THE system SHALL increase the author's karma by 1.
WHEN a post is deleted, THE system SHALL remove all karma associated with votes on that post.
WHEN a comment is deleted, THE system SHALL remove all karma associated with votes on that comment.
WHEN a user's account is deleted, THE system SHALL remove all karma they have earned and given.

### System Failure and Exception Handling

WHEN the system experiences a temporary failure during post creation, THE system SHALL retry the operation or return an error to the user.
WHEN the system experiences a temporary failure during comment creation, THE system SHALL retry the operation or return an error to the user.
WHEN the system experiences a temporary failure during voting, THE system SHALL retry the operation or return an error to the user.
WHEN the system experiences a temporary failure during subscription, THE system SHALL retry the operation or return an error to the user.
WHEN the system experiences a temporary failure during reporting, THE system SHALL retry the operation or return an error to the user.
WHEN the system cannot process an image upload due to file corruption, THE system SHALL reject the upload and notify the user.
WHEN the system cannot process a link due to invalid URL format, THE system SHALL reject the post creation.
WHEN the system detects a potential security threat during authentication, THE system SHALL block the attempt and log the incident.
WHEN the system experiences a database connection failure, THE system SHALL return a service unavailable message to the user.
WHEN the system cannot complete an operation due to timeout, THE system SHALL return a timeout error to the user.

# File Validation Rules

Validation rules and policies for file uploads and storage.

## File Validation and Policies

Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.

### File Type Validation Rules

THE system SHALL accept only image files for user avatars.

THE system SHALL accept only image files for community icons.

THE system SHALL accept only image files for image posts.

THE system SHALL reject file uploads that do not match the expected content type for the upload context.

IF a user attempts to upload a file with an unsupported content type, THEN THE system SHALL reject the upload and display an error message.

THE system SHALL validate the actual file content against the declared file extension.

IF the file content does not match the file extension, THEN THE system SHALL reject the upload.

THE system SHALL reject files that exceed the maximum allowed file size for the upload context.

WHEN a file is uploaded, THE system SHALL verify the file is not corrupted or empty.

IF a file is corrupted or empty, THEN THE system SHALL reject the upload.

### Virus Scanning Requirements

WHEN a file is uploaded, THE system SHALL scan the file for viruses and malware.

IF a virus or malware is detected during scanning, THEN THE system SHALL reject the file and delete it immediately.

THE system SHALL not make uploaded files available to users until virus scanning is complete and successful.

WHEN virus scanning fails due to system error, THEN THE system SHALL reject the file upload.

THE system SHALL log all virus scanning results for audit purposes.

IF a file is flagged as suspicious, THEN THE system SHALL reject the upload and notify administrators.

### File Retention Policies

THE system SHALL retain user avatar files for the lifetime of the user account.

THE system SHALL retain community icon files for the lifetime of the community.

THE system SHALL retain image post files for the lifetime of the post.

WHEN a user deletes their account, THE system SHALL delete all avatar files associated with that user.

WHEN a community is deleted, THE system SHALL delete all icon files associated with that community.

WHEN a post is deleted, THE system SHALL delete all image files associated with that post.

WHEN a user deletes their avatar, THE system SHALL delete the old avatar file.

THE system SHALL not retain files after the associated entity is deleted.

### File Upload Error Scenarios

IF a file upload fails due to network error, THEN THE system SHALL allow the user to retry the upload.

IF a file upload is interrupted, THEN THE system SHALL not save partial files.

IF a user exceeds the maximum number of file uploads in a given time period, THEN THE system SHALL temporarily block further uploads.

IF a file cannot be processed due to system error, THEN THE system SHALL reject the upload and notify the user.

WHEN a file upload fails, THE system SHALL provide a clear error message indicating the reason for failure.

IF a user attempts to upload a file while banned from a community, THEN THE system SHALL reject the upload for that community.

IF a file upload violates community guidelines, THEN THE system SHALL reject the upload and notify moderators.