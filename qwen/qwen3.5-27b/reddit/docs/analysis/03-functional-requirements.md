**redditClone — What operations users can perform, use cases, business workflows**

What operations users can perform, use cases, business workflows

# Core Business Operations

What the system must do for each business concept.

## User Operations

Users create accounts by providing email, password, and a unique username. Each user can log in using their email and password credentials. Users can update their password at any time to maintain account security. Users can view their own profile displaying their display name, bio, avatar, and karma score. Users can view any other user's public profile with their display information and activity. Users can edit their own display name, bio text, and avatar image. Each user profile shows their total karma score calculated from all votes on their posts and comments. Users can view a list of all posts they have created across communities. Users can view a list of all comments they have written on posts. Users can delete their account permanently, which removes all their posts and comments from the platform.

### Account Creation

WHEN a user registers for an account, THE system SHALL require an email address.
WHEN a user registers for an account, THE system SHALL require a password.
WHEN a user registers for an account, THE system SHALL require a unique username.
WHEN a user registers for an account, THE system SHALL validate that the username is not already in use by another user.
IF the username is already taken, THE system SHALL reject the registration request.
WHEN a user successfully registers, THE system SHALL create a new user account with the provided credentials.
WHEN a user successfully registers, THE system SHALL initialize the user's karma score to zero.
WHEN a user successfully registers, THE system SHALL create an empty profile for the user.

### Email Password Login

WHEN a user attempts to log in, THE system SHALL require an email address.
WHEN a user attempts to log in, THE system SHALL require a password.
WHEN a user provides valid email and password credentials, THE system SHALL authenticate the user and establish a session.
IF the email address does not exist in the system, THE system SHALL reject the login attempt.
IF the password is incorrect, THE system SHALL reject the login attempt.
WHEN a user successfully logs in, THE system SHALL grant access to member-only features.
WHEN a user logs out, THE system SHALL terminate the user's session.

### Password Change

WHEN a logged-in user requests to change their password, THE system SHALL require the current password.
WHEN a logged-in user requests to change their password, THE system SHALL require a new password.
WHEN a user successfully changes their password, THE system SHALL update the password in the system.
WHEN a user successfully changes their password, THE system SHALL require the new password for subsequent login attempts.
IF the current password is incorrect, THE system SHALL reject the password change request.

### Profile Viewing

WHEN a user views their own profile, THE system SHALL display their display name.
WHEN a user views their own profile, THE system SHALL display their bio text.
WHEN a user views their own profile, THE system SHALL display their avatar image.
WHEN a user views their own profile, THE system SHALL display their total karma score.
WHEN a user views another user's profile, THE system SHALL display that user's display name.
WHEN a user views another user's profile, THE system SHALL display that user's bio text.
WHEN a user views another user's profile, THE system SHALL display that user's avatar image.
WHEN a user views another user's profile, THE system SHALL display that user's total karma score.
WHEN any user views a profile, THE system SHALL display the profile publicly without requiring authentication.

### Profile Editing

WHEN a logged-in user edits their profile, THE system SHALL allow updating the display name.
WHEN a logged-in user edits their profile, THE system SHALL allow updating the bio text.
WHEN a logged-in user edits their profile, THE system SHALL allow updating the avatar image.
WHEN a user updates their display name, THE system SHALL save the new display name.
WHEN a user updates their bio text, THE system SHALL save the new bio text.
WHEN a user updates their avatar image, THE system SHALL save the new avatar image.
WHEN a user updates their profile, THE system SHALL reflect the changes immediately on their profile page.

### Karma Display

WHEN a user views any profile, THE system SHALL calculate and display the user's total karma score.
WHEN a user receives an upvote on their post, THE system SHALL increase their karma score by one.
WHEN a user receives a downvote on their post, THE system SHALL decrease their karma score by one.
WHEN a user receives an upvote on their comment, THE system SHALL increase their karma score by one.
WHEN a user receives a downvote on their comment, THE system SHALL decrease their karma score by one.
WHEN a vote is removed from a user's post or comment, THE system SHALL adjust the karma score accordingly.
THE system SHALL allow karma scores to be negative.
THE system SHALL maintain a single karma score for each user across all posts and comments.

### User Post History

WHEN a user views their own profile, THE system SHALL display a list of all posts they have created.
WHEN a user views another user's profile, THE system SHALL display a list of all posts that user has created.
WHEN viewing a user's post history, THE system SHALL show posts from all communities the user has posted in.
WHEN viewing a user's post history, THE system SHALL include deleted posts only if the user's account has not been deleted.
WHEN a user deletes their account, THE system SHALL remove all their posts from the post history.

### User Comment History

WHEN a user views their own profile, THE system SHALL display a list of all comments they have written.
WHEN a user views another user's profile, THE system SHALL display a list of all comments that user has written.
WHEN viewing a user's comment history, THE system SHALL show comments from all posts the user has commented on.
WHEN viewing a user's comment history, THE system SHALL include nested replies as part of the comment list.
WHEN a user deletes their account, THE system SHALL remove all their comments from the comment history.

### Account Deletion

WHEN a logged-in user requests to delete their account, THE system SHALL confirm the deletion action.
WHEN a user deletes their account, THE system SHALL permanently remove the user account.
WHEN a user deletes their account, THE system SHALL delete all posts created by that user.
WHEN a user deletes their account, THE system SHALL delete all comments written by that user.
WHEN a user deletes their account, THE system SHALL remove all votes cast by that user.
WHEN a user deletes their account, THE system SHALL adjust karma scores of other users affected by the deleted votes.
WHEN a user deletes their account, THE system SHALL remove all subscriptions to communities.
WHEN a user deletes their account, THE system SHALL prevent the user from logging in again with the same credentials.

## Community Operations

Any registered user can create a new community with a unique name, description text, and icon image. The user who creates a community automatically becomes its owner with full authority. Users can browse all communities on the platform in a comprehensive list view. Users can search for communities by their name to find specific topics. Each community displays its current subscriber count publicly. Community owners can view and manage their community settings. Users can view any community's details including name, description, icon, and subscriber count. Communities serve as containers for posts and discussions on specific topics. Each community maintains its own independent content and moderation team. Community names must be unique across the entire platform.

### Community Creation

WHEN a registered user creates a community, THE system SHALL require a unique name.
WHEN a registered user creates a community, THE system SHALL allow an optional description text.
WHEN a registered user creates a community, THE system SHALL allow an optional icon image.
WHEN a registered user creates a community, THE system SHALL assign the creating user as the owner.
WHEN a community is created, THE system SHALL initialize the subscriber count to zero.
WHEN a community name already exists, THE system SHALL reject the creation request.
WHEN a community is created, THE system SHALL make it immediately visible to all users.
WHEN a community is created, THE system SHALL allow the owner to edit the description and icon.
WHEN a community is created, THE system SHALL establish the owner with full authority over the community.
WHEN a community is created, THE system SHALL enable the owner to add moderators.

### Community Browsing and Search

WHEN a user views the community list, THE system SHALL display all communities on the platform.
WHEN a user searches for communities, THE system SHALL allow search by community name.
WHEN a user searches for communities, THE system SHALL show matching results based on the search term.
WHEN a user views a community in the list, THE system SHALL display the subscriber count.
WHEN a user views a community in the list, THE system SHALL display the community name.
WHEN a user views a community in the list, THE system SHALL display the community icon.
WHEN a user views a community in the list, THE system SHALL allow navigation to the community details page.
WHEN a user searches for communities, THE system SHALL support partial name matching.
WHEN a user views the community list, THE system SHALL paginate the results.
WHEN a user searches for communities, THE system SHALL return results even if no exact match exists.

### Community Details Viewing

WHEN a user views a community's details, THE system SHALL display the community name.
WHEN a user views a community's details, THE system SHALL display the community description.
WHEN a user views a community's details, THE system SHALL display the community icon.
WHEN a user views a community's details, THE system SHALL display the subscriber count.
WHEN a user views a community's details, THE system SHALL display the community creation date.
WHEN a user views a community's details, THE system SHALL show posts from that community.
WHEN a user views a community's details, THE system SHALL allow subscribed users to create posts.
WHEN a user views a community's details, THE system SHALL indicate whether the user is subscribed.
WHEN a user views a community's details, THE system SHALL allow non-subscribed users to subscribe.
WHEN a user views a community's details, THE system SHALL allow subscribed users to unsubscribe.

### Owner Authority

WHEN a community owner views their community, THE system SHALL grant full management permissions.
WHEN a community owner manages their community, THE system SHALL allow editing of the community name.
WHEN a community owner manages their community, THE system SHALL allow editing of the description.
WHEN a community owner manages their community, THE system SHALL allow changing the icon image.
WHEN a community owner manages their community, THE system SHALL allow adding moderators.
WHEN a community owner manages their community, THE system SHALL allow removing moderators.
WHEN a community owner manages their community, THE system SHALL allow deleting any post in the community.
WHEN a community owner manages their community, THE system SHALL allow deleting any comment in the community.
WHEN a community owner manages their community, THE system SHALL allow banning users from the community.
WHEN a community owner manages their community, THE system SHALL allow unbanning users from the community.
WHEN a community owner manages their community, THE system SHALL allow viewing all reports for the community.
WHEN a community owner manages their community, THE system SHALL allow approving or dismissing reports.
WHEN a community owner manages their community, THE system SHALL prevent the owner from being removed as owner.
WHEN a community owner manages their community, THE system SHALL allow the owner to view the list of banned users.
WHEN a community owner manages their community, THE system SHALL allow the owner to view the list of moderators.

## Post Operations

Users can create posts only in communities they are subscribed to. Every post requires a title and must be one of three types: text post with content, link post with URL, or image post with uploaded image. Users can edit their own posts to update title or content. Users can delete their own posts at any time. When viewing a single post, users see the title, full content, author username, community name, vote score, comment count, and posting time. Posts display differently based on type: text shows content preview, images show thumbnails, links show domain names. Users can view posts from multiple feeds: home feed for subscribed communities, popular feed for all communities, and community feed for specific communities. Posts support multiple sorting options including hot, new, top, and controversial. All post feeds are paginated to handle large volumes of content.

### Post Creation

WHEN a member creates a post, THE system SHALL require the member to select a community.

IF the member is not subscribed to the selected community, THEN THE system SHALL reject the post creation.

WHEN a member creates a post, THE system SHALL require a title for the post.

IF the title is missing or empty, THEN THE system SHALL reject the post creation.

WHEN a member creates a post, THE system SHALL require the member to select one post type: text, link, or image.

WHEN a member creates a text post, THE system SHALL require text content.

IF the text content is missing or empty, THEN THE system SHALL reject the text post creation.

WHEN a member creates a link post, THE system SHALL require a URL.

IF the URL is invalid or missing, THEN THE system SHALL reject the link post creation.

WHEN a member creates an image post, THE system SHALL require an image upload.

IF the image upload fails or is missing, THEN THE system SHALL reject the image post creation.

WHEN a member successfully creates a post, THE system SHALL associate the post with the creating member as the author.

WHEN a member successfully creates a post, THE system SHALL associate the post with the selected community.

WHEN a member successfully creates a post, THE system SHALL record the creation timestamp.

WHEN a member successfully creates a post, THE system SHALL initialize the post vote score to zero.

WHEN a member successfully creates a post, THE system SHALL initialize the post comment count to zero.

### Post Types and Content

WHEN a member creates a text post, THE system SHALL store the text content with the post.

WHEN viewing a text post in a feed list, THE system SHALL display the first 200 characters of the text content.

WHEN viewing a text post in detail view, THE system SHALL display the full text content.

WHEN a member creates a link post, THE system SHALL store the URL with the post.

WHEN viewing a link post in a feed list, THE system SHALL display the domain name extracted from the URL.

WHEN viewing a link post in detail view, THE system SHALL display the full URL.

WHEN a member creates an image post, THE system SHALL store the uploaded image with the post.

WHEN viewing an image post in a feed list, THE system SHALL display a thumbnail of the uploaded image.

WHEN viewing an image post in detail view, THE system SHALL display the full uploaded image.

IF a member attempts to create a post without selecting a type, THEN THE system SHALL reject the post creation.

IF a member attempts to create a text post without content, THEN THE system SHALL reject the post creation.

IF a member attempts to create a link post without a URL, THEN THE system SHALL reject the post creation.

IF a member attempts to create an image post without an image, THEN THE system SHALL reject the post creation.

WHEN a member views any post in detail, THE system SHALL display the post type indicator.

### Post Editing and Deletion

WHEN the post author edits their own post, THE system SHALL allow updating the post title.

WHEN the post author edits their own post, THE system SHALL allow updating the post content based on the post type.

IF a non-author member attempts to edit a post, THEN THE system SHALL reject the edit request.

WHEN the post author edits a text post, THE system SHALL allow updating the text content.

WHEN the post author edits a link post, THE system SHALL allow updating the URL.

WHEN the post author edits an image post, THE system SHALL allow updating the uploaded image.

WHEN the post author edits a post, THE system SHALL preserve the original creation timestamp.

WHEN the post author deletes their own post, THE system SHALL remove the post from all feeds.

WHEN the post author deletes their own post, THE system SHALL remove all associated comments.

WHEN the post author deletes their own post, THE system SHALL remove all votes on the post.

IF a non-author member attempts to delete a post, THEN THE system SHALL reject the delete request.

WHEN a post is deleted, THE system SHALL adjust the author's karma score to remove karma gained from that post.

WHEN a post is deleted, THE system SHALL adjust the author's karma score to remove karma gained from all comments on that post.

WHEN a moderator deletes a post in their community, THE system SHALL remove the post from all feeds.

WHEN a moderator deletes a post in their community, THE system SHALL remove all associated comments.

WHEN a moderator deletes a post in their community, THE system SHALL remove all votes on the post.

### Post Viewing

WHEN a user views a single post in detail, THE system SHALL display the post title.

WHEN a user views a single post in detail, THE system SHALL display the full post content.

WHEN a user views a single post in detail, THE system SHALL display the author's username.

WHEN a user views a single post in detail, THE system SHALL display the community name.

WHEN a user views a single post in detail, THE system SHALL display the current vote score.

WHEN a user views a single post in detail, THE system SHALL display the total comment count.

WHEN a user views a single post in detail, THE system SHALL display when the post was created.

WHEN a user views a post in a feed list, THE system SHALL display the post title.

WHEN a user views a post in a feed list, THE system SHALL display the author's username.

WHEN a user views a post in a feed list, THE system SHALL display the community name.

WHEN a user views a post in a feed list, THE system SHALL display the current vote score.

WHEN a user views a post in a feed list, THE system SHALL display the total comment count.

WHEN a user views a post in a feed list, THE system SHALL display the time elapsed since posting.

WHEN a user views a deleted post, THEN THE system SHALL reject the view request.

WHEN a user views a post from a community where they are banned, THEN THE system SHALL allow viewing the post content.

WHEN a user views a post from a community where they are blocked from the author, THEN THE system SHALL hide the post from their feeds.

### Post Feeds and Sorting

WHEN a logged-in member views the home feed, THE system SHALL show posts only from communities the member is subscribed to.

WHEN a guest views the home feed, THEN THE system SHALL reject the access request.

WHEN any user views the popular feed, THE system SHALL show posts from all communities across the platform.

WHEN any user views a community feed, THE system SHALL show posts only from that specific community.

WHEN any user views a community feed for a deleted community, THEN THE system SHALL reject the access request.

WHEN any user applies the hot sorting option, THE system SHALL prioritize recent posts with many upvotes.

WHEN any user applies the new sorting option, THE system SHALL display posts in reverse chronological order.

WHEN any user applies the top sorting option, THE system SHALL display posts by highest vote score first.

WHEN any user applies the top sorting option, THE system SHALL allow filtering by time period: today, this week, this month, this year, or all time.

WHEN any user applies the controversial sorting option, THE system SHALL prioritize posts with many votes but scores close to zero.

WHEN any user views any feed, THE system SHALL paginate the results.

WHEN any user navigates to the next page of a feed, THE system SHALL maintain the same sorting option.

WHEN any user changes the sorting option, THE system SHALL reset to the first page.

WHEN a member views the home feed, THE system SHALL exclude posts from communities where the member is banned.

WHEN a member views any feed, THE system SHALL exclude posts from communities where the member is blocked from the author.

## Comment Operations

Users can write comments on any post they can view. Users can reply to any existing comment, creating threaded discussions. Comments support unlimited nesting depth for replies within replies. Users can edit their own comments to update the content. Users can delete their own comments at any time. Each comment displays the author username, content text, vote score, posting time, and any nested replies. Comments are visible to all users who can view the parent post. Users can view all comments on a post with different sorting options. Comment sorting includes best by vote score, new by recency, and controversial by vote distribution. Comments contribute to the overall comment count displayed on posts.

### Comment Creation

WHEN a user creates a comment on a post, THE system SHALL require comment content text.

WHEN a user creates a comment, THE system SHALL associate the comment with the user who created it.

WHEN a user creates a comment, THE system SHALL associate the comment with the target post.

WHEN a user creates a comment, THE system SHALL record the creation timestamp.

WHEN a user creates a comment, THE system SHALL initialize the comment vote score to zero.

IF the comment content is empty, THEN THE system SHALL reject the comment creation.

IF the user is banned from the community, THEN THE system SHALL prevent comment creation in that community.

IF the post has been deleted, THEN THE system SHALL prevent comment creation on that post.

IF the user does not have permission to view the post, THEN THE system SHALL prevent comment creation.

### Comment Replies and Nested Discussions

WHEN a user replies to an existing comment, THE system SHALL create a new comment with the parent comment reference.

WHEN a user replies to a comment, THE system SHALL nest the reply under the parent comment in the thread.

WHEN a user creates a reply, THE system SHALL allow unlimited nesting depth for replies within replies.

WHEN a user views a comment with replies, THE system SHALL display nested replies in a threaded structure.

WHEN a user replies to a comment, THE system SHALL maintain the hierarchical relationship between parent and child comments.

WHEN a user deletes a parent comment, THE system SHALL preserve child replies in the thread structure.

WHEN a user views a threaded discussion, THE system SHALL show the full conversation hierarchy.

IF the target comment does not exist, THEN THE system SHALL prevent the reply creation.

IF the user cannot view the parent comment, THEN THE system SHALL prevent reply creation.

### Comment Editing and Deletion

WHEN a user edits their own comment, THE system SHALL update the comment content text.

WHEN a user edits their own comment, THE system SHALL preserve the original creation timestamp.

WHEN a user edits their own comment, THE system SHALL preserve existing vote scores.

WHEN a user edits their own comment, THE system SHALL preserve the comment's position in the thread.

IF the user is not the comment author, THEN THE system SHALL prevent comment editing.

IF the comment has been deleted, THEN THE system SHALL prevent comment editing.

IF the edited content is empty, THEN THE system SHALL reject the edit operation.

### Comment Viewing and Author Display

WHEN a user deletes their own comment, THE system SHALL remove the comment from the thread.

WHEN a user deletes their own comment, THE system SHALL preserve child replies in the thread structure.

WHEN a user deletes their own comment, THE system SHALL adjust the vote score of the author's karma.

WHEN a user deletes their own comment, THE system SHALL remove associated votes.

IF the user is not the comment author, THEN THE system SHALL prevent comment deletion.

IF a moderator deletes a comment, THE system SHALL remove the comment from the thread.

IF a moderator deletes a comment, THE system SHALL adjust the vote score of the author's karma.

WHEN a user views a post, THE system SHALL display the total comment count.

WHEN a user views a comment, THE system SHALL show the comment content text.

WHEN a user views a comment, THE system SHALL display the author's username.

WHEN a user views a comment, THE system SHALL show the vote score.

WHEN a user views a comment, THE system SHALL display the time since the comment was posted.

WHEN a user views a comment, THE system SHALL show any nested replies.

IF the comment has been deleted, THEN THE system SHALL not display the comment content.

IF the user cannot view the parent post, THEN THE system SHALL not display the comment.

### Comment Voting

WHEN a user upvotes a comment, THE system SHALL add 1 to the comment vote score.

WHEN a user upvotes a comment, THE system SHALL increase the comment author's karma by 1.

WHEN a user downvotes a comment, THE system SHALL subtract 1 from the comment vote score.

WHEN a user downvotes a comment, THE system SHALL decrease the comment author's karma by 1.

WHEN a user removes their vote on a comment, THE system SHALL adjust the comment vote score accordingly.

WHEN a user removes their vote on a comment, THE system SHALL adjust the comment author's karma accordingly.

WHEN a user changes their vote from upvote to downvote, THE system SHALL adjust the comment vote score by 2.

WHEN a user changes their vote from upvote to downvote, THE system SHALL adjust the comment author's karma by 2.

WHEN a user changes their vote from downvote to upvote, THE system SHALL adjust the comment vote score by 2.

WHEN a user changes their vote from downvote to upvote, THE system SHALL adjust the comment author's karma by 2.

IF a user has already voted on a comment, THEN THE system SHALL allow only one vote per user per comment.

IF the comment has been deleted, THEN THE system SHALL prevent voting on that comment.

IF the user is banned from the community, THEN THE system SHALL prevent voting on comments in that community.

### Comment Sorting

WHEN a user views comments on a post, THE system SHALL allow sorting by best (highest vote score first).

WHEN a user views comments on a post, THE system SHALL allow sorting by new (most recent first).

WHEN a user views comments on a post, THE system SHALL allow sorting by controversial (many votes but score close to zero).

WHEN a user selects best sorting, THE system SHALL display comments ordered by vote score in descending order.

WHEN a user selects new sorting, THE system SHALL display comments ordered by creation timestamp in descending order.

WHEN a user selects controversial sorting, THE system SHALL display comments with many votes but near-zero scores first.

WHEN a user changes the sort option, THE system SHALL re-sort all visible comments immediately.

WHEN a user views sorted comments, THE system SHALL maintain the threaded structure regardless of sort order.

IF no comments exist on a post, THEN THE system SHALL display an empty comment list.

## Vote Operations

Users can upvote any post or comment they view, adding one point to its score. Users can downvote any post or comment they view, subtracting one point from its score. Each user can only cast one vote per post or comment at any time. Users can change their vote from upvote to downvote or vice versa. Users can remove their vote entirely, returning the content to an unvoted state. Vote score equals total upvotes minus total downvotes for each piece of content. Votes on posts and comments contribute to the user's karma score. Karma increases by one for each upvote received and decreases by one for each downvote. Karma can become negative if a user receives more downvotes than upvotes. Vote changes immediately adjust both content score and user karma accordingly.

### Upvoting and Downvoting Content

WHEN a user views a post, THE system SHALL allow the user to upvote the post.

WHEN a user views a post, THE system SHALL allow the user to downvote the post.

WHEN a user views a comment, THE system SHALL allow the user to upvote the comment.

WHEN a user views a comment, THE system SHALL allow the user to downvote the comment.

WHEN a user upvotes content, THE system SHALL add one point to the content's vote score.

WHEN a user downvotes content, THE system SHALL subtract one point from the content's vote score.

WHEN a user upvotes a post, THE system SHALL increase the post author's karma by one point.

WHEN a user upvotes a comment, THE system SHALL increase the comment author's karma by one point.

WHEN a user downvotes a post, THE system SHALL decrease the post author's karma by one point.

WHEN a user downvotes a comment, THE system SHALL decrease the comment author's karma by one point.

THE system SHALL allow guests to vote on posts in the popular feed.

THE system SHALL allow guests to vote on posts in community feeds.

THE system SHALL allow guests to vote on comments in the popular feed.

THE system SHALL allow guests to vote on comments in community feeds.

### Vote Constraints and Modifications

THE system SHALL limit each user to one vote per post.

THE system SHALL limit each user to one vote per comment.

WHEN a user has upvoted content and attempts to upvote again, THE system SHALL maintain the existing upvote.

WHEN a user has downvoted content and attempts to downvote again, THE system SHALL maintain the existing downvote.

WHEN a user who has upvoted content clicks downvote, THE system SHALL change the vote from upvote to downvote.

WHEN a user who has downvoted content clicks upvote, THE system SHALL change the vote from downvote to upvote.

WHEN a user who has voted on content clicks to remove their vote, THE system SHALL remove the vote entirely.

WHEN a user removes their upvote from content, THE system SHALL subtract one point from the content's vote score.

WHEN a user removes their downvote from content, THE system SHALL add one point to the content's vote score.

WHEN a user changes their vote from upvote to downvote on a post, THE system SHALL decrease the post's vote score by two points.

WHEN a user changes their vote from downvote to upvote on a post, THE system SHALL increase the post's vote score by two points.

WHEN a user changes their vote from upvote to downvote on a comment, THE system SHALL decrease the comment's vote score by two points.

WHEN a user changes their vote from downvote to upvote on a comment, THE system SHALL increase the comment's vote score by two points.

WHEN a user removes their upvote from a post, THE system SHALL decrease the post author's karma by one point.

WHEN a user removes their upvote from a comment, THE system SHALL decrease the comment author's karma by one point.

WHEN a user removes their downvote from a post, THE system SHALL increase the post author's karma by one point.

WHEN a user removes their downvote from a comment, THE system SHALL increase the comment author's karma by one point.

### Vote Score Calculation

THE system SHALL calculate each post's vote score as the total number of upvotes minus the total number of downvotes.

THE system SHALL calculate each comment's vote score as the total number of upvotes minus the total number of downvotes.

THE system SHALL display the vote score for each post in feed listings.

THE system SHALL display the vote score for each comment in comment threads.

THE system SHALL display a vote score of zero when a piece of content has no votes.

THE system SHALL display negative vote scores when downvotes exceed upvotes.

WHEN votes are added or removed, THE system SHALL update the displayed vote score immediately.

WHEN a post's vote score changes, THE system SHALL recalculate the post's position in sorted feeds.

WHEN a comment's vote score changes, THE system SHALL recalculate the comment's position in sorted comment lists.

THE system SHALL allow vote scores to be any integer value, positive or negative.

### Karma Impact from Votes

THE system SHALL maintain a single karma score for each user.

THE system SHALL calculate a user's karma as the sum of all votes received on their posts and comments.

WHEN a user receives an upvote on any content, THE system SHALL increase their karma by one point.

WHEN a user receives a downvote on any content, THE system SHALL decrease their karma by one point.

WHEN a vote on a user's content is removed, THE system SHALL adjust their karma accordingly.

WHEN a vote on a user's content is changed from upvote to downvote, THE system SHALL decrease their karma by two points.

WHEN a vote on a user's content is changed from downvote to upvote, THE system SHALL increase their karma by two points.

THE system SHALL allow karma scores to become negative when downvotes exceed upvotes.

THE system SHALL display each user's karma score on their profile page.

THE system SHALL update karma scores immediately when votes are cast, changed, or removed.

WHEN a user's post is deleted, THE system SHALL remove all votes from that post and adjust karma accordingly.

WHEN a user's comment is deleted, THE system SHALL remove all votes from that comment and adjust karma accordingly.

WHEN a user deletes their account, THE system SHALL remove all their karma and associated votes.

## Subscription Operations

Users can subscribe to any community on the platform to follow its content. Users can unsubscribe from any community they are currently following. Users can view a complete list of all communities they are subscribed to. Subscribing to a community is required before creating posts in that community. Subscribed communities appear in the user's home feed with their posts. The home feed shows posts only from subscribed communities and is available only to logged-in users. Users can manage their subscriptions at any time to control their content feed. Subscription status is tracked for each user-community combination. Community subscriber counts reflect the total number of active subscriptions.

### Community Subscription

WHEN a user subscribes to a community, THE system SHALL:
1. Record the subscription with the current timestamp
2. Add the user to the community's subscriber list
3. Increment the community's subscriber count by one
4. Include the community's posts in the user's home feed
5. Enable the user to create posts in that community

IF the user is already subscribed to the community, THE system SHALL:
1. Treat the subscription request as a no-operation
2. Maintain the existing subscription timestamp
3. Not increment the subscriber count again

IF the community does not exist, THE system SHALL:
1. Reject the subscription request
2. Display an error message indicating the community cannot be found

IF the community has been deleted, THE system SHALL:
1. Reject the subscription request
2. Display an error message indicating the community is unavailable

WHEN a user subscribes to a community, THE system SHALL allow the subscription regardless of whether the user is banned from that community, but the ban restrictions still apply to posting and commenting.

### Community Unsubscription

WHEN a user unsubscribes from a community, THE system SHALL:
1. Remove the subscription from the user's subscription list
2. Decrement the community's subscriber count by one
3. Remove the community's posts from the user's home feed
4. Prevent the user from creating new posts in that community
5. Allow the user to continue viewing existing posts in that community

IF the user is not subscribed to the community, THE system SHALL:
1. Treat the unsubscription request as a no-operation
2. Not decrement the subscriber count
3. Not display an error message

IF the community does not exist, THE system SHALL:
1. Treat the unsubscription request as a no-operation
2. Not display an error message

WHEN a user unsubscribes from a community, THE system SHALL:
1. Preserve all posts the user created in that community
2. Preserve all comments the user wrote in that community
3. Allow the user to resubscribe at any time
4. Maintain the user's voting history on content in that community

IF a user is banned from a community, THE system SHALL:
1. Allow the user to unsubscribe from the community
2. Maintain the ban status after unsubscription

### Subscription List Viewing

WHEN a user views their subscription list, THE system SHALL:
1. Display all communities the user is currently subscribed to
2. Show the community name, description, and icon for each subscription
3. Display the subscriber count for each community
4. Show the date when the user subscribed to each community
5. Allow the user to navigate to any community from the list

WHEN a user views their subscription list, THE system SHALL:
1. Sort communities by most recently subscribed first
2. Display the total number of communities the user follows
3. Allow filtering by community name
4. Show communities in which the user is a moderator separately

IF the user has no subscriptions, THE system SHALL:
1. Display an empty state message
2. Provide a link to browse all communities
3. Suggest popular communities to subscribe to

IF a community in the user's subscription list has been deleted, THE system SHALL:
1. Automatically remove it from the subscription list
2. Not display an error when viewing the list

### Subscription Requirement for Posting

WHEN a user attempts to create a post in a community, THE system SHALL:
1. Check if the user is subscribed to that community
2. Allow the post creation if the user is subscribed
3. Reject the post creation if the user is not subscribed
4. Display an error message prompting the user to subscribe first

IF a user is subscribed to a community, THE system SHALL:
1. Allow the user to create posts of any type (text, link, image)
2. Associate the post with the community and the user
3. Make the post visible in the community feed
4. Include the post in the user's home feed

IF a user is banned from a community, THE system SHALL:
1. Reject the post creation regardless of subscription status
2. Display an error message indicating the user is banned
3. Not allow the user to create posts even if subscribed

WHEN a user subscribes to a community, THE system SHALL:
1. Immediately enable post creation capability
2. Not require any additional approval or waiting period
3. Allow the user to create multiple posts in the same community

### Home Feed Content Filtering

WHEN a logged-in user views the home feed, THE system SHALL:
1. Display posts only from communities the user is subscribed to
2. Exclude posts from communities the user has not subscribed to
3. Exclude posts from communities the user has unsubscribed from
4. Include posts from all subscribed communities in a single feed
5. Apply the selected sorting option to the filtered results

WHEN a logged-in user views the home feed, THE system SHALL:
1. Show posts from communities where the user is a moderator
2. Show posts from communities where the user is banned (viewing only)
3. Not show posts from deleted communities
4. Apply the user's blocking preferences to filter content

IF a user has unsubscribed from all communities, THE system SHALL:
1. Display an empty home feed
2. Show a message encouraging the user to subscribe to communities
3. Provide quick links to popular communities

WHEN posts are removed from subscribed communities (deleted or reported and approved), THE system SHALL:
1. Automatically exclude them from the home feed
2. Not display error messages for missing content
3. Update the feed without requiring user action

### Logged-In Feed Access

IF a guest (logged-out user) attempts to access the home feed, THE system SHALL:
1. Redirect the user to the login page
2. Display a message explaining that login is required for the home feed
3. Preserve the intended destination after successful login

IF a guest attempts to access the home feed, THE system SHALL:
1. Not display any personalized content
2. Not show any posts from subscribed communities
3. Offer the popular feed as an alternative for guests

WHEN a user logs in, THE system SHALL:
1. Make the home feed immediately available
2. Load the user's subscription list
3. Display posts from all subscribed communities
4. Apply the user's preferred sorting option

IF a user's session expires while viewing the home feed, THE system SHALL:
1. Redirect to the login page
2. Preserve the feed state for restoration after login
3. Not display personalized content after session expiration

### Subscription Management

WHEN a user manages their subscriptions, THE system SHALL:
1. Allow subscribing to any community on the platform
2. Allow unsubscribing from any subscribed community
3. Allow viewing the complete list of subscriptions at any time
4. Allow multiple subscription changes in a single session
5. Immediately reflect subscription changes in the home feed

WHEN a user manages their subscriptions, THE system SHALL:
1. Not limit the number of communities a user can subscribe to
2. Allow subscribing and unsubscribing repeatedly
3. Maintain subscription history for analytics purposes
4. Allow bulk subscription management actions

IF a user subscribes to a community they previously unsubscribed from, THE system SHALL:
1. Create a new subscription record with the current timestamp
2. Increment the community's subscriber count
3. Restore the community's posts to the user's home feed
4. Re-enable post creation in that community

WHEN a user changes their subscription preferences, THE system SHALL:
1. Update the home feed within seconds
2. Not require page refresh to see changes
3. Maintain the user's position in the feed during updates

### Subscriber Count Tracking

WHEN a community displays its subscriber count, THE system SHALL:
1. Show the total number of users currently subscribed
2. Update the count immediately when a user subscribes
3. Update the count immediately when a user unsubscribes
4. Display the count on the community's main page
5. Display the count in community browsing lists

WHEN a community displays its subscriber count, THE system SHALL:
1. Show the count to all users (guests and members)
2. Not include the community owner in the count separately
3. Not include moderators separately in the count
4. Reflect real-time changes in subscriber numbers

IF a community has no subscribers, THE system SHALL:
1. Display a subscriber count of zero
2. Still allow users to subscribe to the community
3. Not hide the community from browsing lists

IF multiple users subscribe or unsubscribe simultaneously, THE system SHALL:
1. Process each subscription change independently
2. Ensure the final subscriber count is accurate
3. Not lose any subscription changes due to concurrency

### Content Feed Personalization

WHEN a user follows communities, THE system SHALL:
1. Add those communities to the user's personalized content feed
2. Prioritize content from followed communities in the home feed
3. Allow the user to control which communities appear in their feed
4. Enable the user to discover new content from followed communities

WHEN a user follows communities, THE system SHALL:
1. Allow the user to follow communities without any restrictions
2. Allow the user to unfollow communities at any time
3. Update the feed content based on current subscriptions
4. Not limit the diversity of content in the feed

IF a user follows communities with different content types, THE system SHALL:
1. Mix content from all followed communities in the feed
2. Apply sorting rules consistently across all content
3. Not favor one community over another based on subscription date
4. Allow the user to see content from all followed communities

WHEN a user controls their content feed through subscriptions, THE system SHALL:
1. Respect the user's choice of which communities to follow
2. Not force content from non-subscribed communities into the feed
3. Allow complete customization of the feed through subscription choices
4. Provide clear indicators of which communities are followed

### Follow Communities Workflow

WHEN a user chooses to follow communities, THE system SHALL:
1. Present communities in a browsable list
2. Allow searching for communities by name
3. Show community details before subscription
4. Display the subscriber count to help users decide
5. Allow immediate subscription after viewing community details

WHEN a user follows communities, THE system SHALL:
1. Show a confirmation that the subscription was successful
2. Update the user's subscription count
3. Add the community to the user's subscription list
4. Begin including the community's posts in the home feed

IF a user wants to follow a community, THE system SHALL:
1. Allow the user to subscribe without creating an account first (for viewing)
2. Require login only for posting in the community
3. Allow guests to browse community content
4. Encourage guests to subscribe and log in for full features

WHEN a user follows multiple communities, THE system SHALL:
1. Organize the home feed to show content from all followed communities
2. Apply consistent sorting rules across all communities
3. Not limit the number of communities a user can follow
4. Allow the user to manage all subscriptions from one location

## Report Operations

Users can report any post or comment they believe violates community guidelines. When reporting content, users must provide a text reason explaining their concern. Moderators can view all reports submitted for their community. Each report displays the reported content, the user who reported it, and the provided reason. Moderators can approve a report, which deletes the reported content from the platform. Moderators can dismiss a report, keeping the content visible. Dismissed reports are removed from the active report list. Reports help moderators identify problematic content for review. Only moderators can view and act on reports within their community.

### Content Reporting

WHEN a user reports a post, THE system SHALL require the user to provide a text reason explaining the concern.

WHEN a user reports a comment, THE system SHALL require the user to provide a text reason explaining the concern.

WHEN a user submits a report, THE system SHALL associate the report with the reporting user's account.

WHEN a user submits a report, THE system SHALL associate the report with the reported content (post or comment).

WHEN a user submits a report, THE system SHALL record the timestamp of when the report was created.

WHEN a report is submitted, THE system SHALL set the report status to pending.

WHEN a user reports content, THE system SHALL make the report visible to moderators of the community where the content exists.

IF a user attempts to report content without providing a reason, THEN THE system SHALL reject the report submission.

IF a user attempts to report content from a community where they are banned, THEN THE system SHALL reject the report submission.

IF a user attempts to report content that no longer exists, THEN THE system SHALL reject the report submission.

### Report Viewing

WHEN a moderator views reports for their community, THE system SHALL display all pending reports for that community.

WHEN a moderator views a report, THE system SHALL display the reported content (post or comment).

WHEN a moderator views a report, THE system SHALL display the username of the user who submitted the report.

WHEN a moderator views a report, THE system SHALL display the reason provided by the reporting user.

WHEN a moderator views a report, THE system SHALL display the current status of the report.

WHEN a moderator views reports, THE system SHALL show the timestamp of when each report was submitted.

WHILE a report status is pending, THE system SHALL include the report in the moderator's review queue.

IF a moderator is not assigned to the community, THEN THE system SHALL prevent them from viewing reports for that community.

IF a report has been resolved (approved or dismissed), THEN THE system SHALL exclude it from the pending reports list.

WHEN multiple reports exist for the same content, THE system SHALL allow moderators to view all reports associated with that content.

### Report Resolution

WHEN a moderator approves a report, THE system SHALL change the report status from pending to approved.

WHEN a moderator dismisses a report, THE system SHALL change the report status from pending to dismissed.

WHEN a moderator approves a report, THE system SHALL delete the reported content from the platform.

WHEN a moderator dismisses a report, THE system SHALL keep the reported content visible on the platform.

WHEN a moderator dismisses a report, THE system SHALL remove the report from the active report list.

WHEN a moderator takes action on a report, THE system SHALL record the timestamp of the moderator's action.

WHEN a moderator approves a report on a post, THE system SHALL also delete all comments on that post.

WHEN a moderator approves a report on a comment, THE system SHALL delete only that specific comment and its replies.

IF a moderator attempts to approve a report for content that has already been deleted, THEN THE system SHALL reject the approval action.

IF a moderator attempts to dismiss a report that has already been resolved, THEN THE system SHALL reject the dismissal action.

### Content Deletion

WHEN a moderator deletes content through report approval, THE system SHALL remove the content from all feeds and views.

WHEN a moderator deletes content through report approval, THE system SHALL prevent the content from being recovered.

WHEN content is deleted due to report approval, THE system SHALL adjust karma scores for users who voted on that content.

WHEN content is deleted due to report approval, THE system SHALL remove the content from the author's profile page.

WHEN a post is deleted due to report approval, THE system SHALL remove the post from the community feed.

WHEN a comment is deleted due to report approval, THE system SHALL remove the comment from the post's comment thread.

WHEN content is deleted, THE system SHALL preserve the report record for audit purposes.

WHEN a user's content is deleted, THE system SHALL notify the user that their content was removed.

IF content has been deleted, THEN THE system SHALL prevent users from viewing or interacting with that content.

IF content has been deleted, THEN THE system SHALL prevent users from voting on that content.

## Moderator Operations

The community creator becomes the owner with highest authority in that community. The owner can add other users as moderators to help manage the community. The owner can remove moderators from their community at any time. Moderators can add other moderators to expand the moderation team. Moderators cannot remove the community owner under any circumstances. Moderators cannot remove other moderators from the team. Moderators have the ability to delete any post in their community. Moderators can delete any comment in their community. Moderators can ban users from posting or commenting in their community. Moderators can unban previously banned users to restore their access.

### Community Owner Authority

THE system SHALL recognize the community creator as the owner with highest authority in that community.

THE owner SHALL have the ability to add other users as moderators to help manage the community.

THE owner SHALL have the ability to remove moderators from their community at any time.

THE owner SHALL not be removable from the community by any moderator under any circumstances.

THE owner SHALL retain all moderator permissions in addition to owner-specific permissions.

WHEN a community is created, THE system SHALL automatically assign the creator as the owner.

WHEN an owner attempts to remove themselves from the community, THE system SHALL prevent this action.

IF a moderator attempts to remove the owner, THE system SHALL reject the request.

THE owner SHALL be able to view all moderation actions taken in their community.

THE owner SHALL be able to override any moderation decision made by other moderators.

### Moderator Team Management

WHEN an owner adds a user as moderator, THE system SHALL assign the moderator role to that user for the community.

WHEN a moderator adds another user as moderator, THE system SHALL assign the moderator role to that user for the community.

WHEN an owner removes a moderator, THE system SHALL revoke the moderator role from that user for the community.

IF a moderator attempts to remove another moderator, THE system SHALL reject the request.

THE system SHALL allow only the owner to remove moderators from the community.

WHEN a moderator is removed, THE system SHALL revoke all moderation permissions for that community.

THE system SHALL maintain a list of all moderators for each community.

THE system SHALL allow the owner to view the complete list of moderators in their community.

THE system SHALL allow moderators to view the list of other moderators in the community.

IF a user is both a moderator and a subscriber, THE system SHALL maintain both roles independently.

WHEN a moderator is removed, THE system SHALL preserve their subscription status to the community.

THE system SHALL prevent a user from being added as a moderator if they are already the owner.

### Moderator Permissions and Actions

WHEN a moderator deletes a post in their community, THE system SHALL remove the post and all associated comments.

WHEN a moderator deletes a comment in their community, THE system SHALL remove the comment and all nested replies.

WHEN a moderator bans a user from their community, THE system SHALL prevent that user from creating posts in the community.

WHEN a moderator bans a user from their community, THE system SHALL prevent that user from creating comments in the community.

WHEN a moderator unbans a user, THE system SHALL restore the user's ability to post and comment in the community.

THE system SHALL allow moderators to view the list of banned users in their community.

THE system SHALL allow moderators to view all reports submitted for content in their community.

WHEN a moderator approves a report, THE system SHALL delete the reported content.

WHEN a moderator dismisses a report, THE system SHALL remove the report from the active report list.

THE system SHALL allow moderators to view the reason provided when content was reported.

THE system SHALL allow moderators to view who reported specific content.

WHEN a moderator performs a moderation action, THE system SHALL record the action for audit purposes.

THE system SHALL prevent moderators from deleting posts or comments in communities where they are not moderators.

THE system SHALL prevent moderators from banning users in communities where they are not moderators.

WHEN a moderator deletes content, THE system SHALL adjust karma scores for affected users accordingly.

## Ban Operations

Moderators can ban users from their community for violating rules. Banned users cannot create posts in the banned community. Banned users cannot write comments on posts in the banned community. Banned users can still view all content in the community including posts and comments. Moderators can unban users to restore their posting and commenting privileges. Moderators can view a list of all currently banned users in their community. Each ban can include an optional reason text explaining the action. Bans are tracked with timestamps showing when the ban was applied. Unbanning removes the restriction and allows full participation again. Banned users retain access to view community content.

### User Banning

WHEN a moderator bans a user from their community, THE system SHALL:
1. Record the ban with the current timestamp
2. Associate the ban with the banning moderator
3. Allow an optional reason text (0-500 characters)
4. Prevent the banned user from creating posts in that community
5. Prevent the banned user from writing comments in that community
6. Allow the banned user to continue viewing all community content

IF the user attempting to ban is the community owner, THE system SHALL allow the ban action.

IF the user attempting to ban is a moderator, THE system SHALL allow the ban action.

IF the user attempting to ban is not a moderator or owner, THE system SHALL reject the ban action.

IF the target user is already banned from the community, THE system SHALL reject the duplicate ban.

IF the target user is the community owner, THE system SHALL reject the ban attempt.

WHEN a ban is created, THE system SHALL immediately enforce all posting and commenting restrictions.

WHEN a ban reason is provided, THE system SHALL store it for moderator reference.

WHEN a ban reason is not provided, THE system SHALL still create the ban successfully.

### User Unbanning

WHEN a moderator unbans a user from their community, THE system SHALL:
1. Remove the ban restriction immediately
2. Restore the user's ability to create posts in that community
3. Restore the user's ability to write comments in that community
4. Remove the ban from the banned user list
5. Record the unbanning action with a timestamp

IF the user attempting to unban is the community owner, THE system SHALL allow the unban action.

IF the user attempting to unban is a moderator, THE system SHALL allow the unban action.

IF the user attempting to unban is not a moderator or owner, THE system SHALL reject the unban action.

IF the target user is not currently banned, THE system SHALL reject the unban attempt.

WHEN a user is unbanned, THE system SHALL restore all posting and commenting privileges immediately.

WHEN a user is unbanned, THE system SHALL allow them to participate in the community without restrictions.

WHEN a user is unbanned, THE system SHALL retain the historical ban record for audit purposes.

### Banned User List

WHEN a moderator views the banned user list for their community, THE system SHALL:
1. Display all currently banned users
2. Show the username of each banned user
3. Show when each ban was applied (ban timestamp)
4. Show the ban reason if one was provided
5. Allow filtering by ban date range
6. Allow searching by username

IF the user viewing the list is the community owner, THE system SHALL display all banned users.

IF the user viewing the list is a moderator, THE system SHALL display all banned users.

IF the user viewing the list is not a moderator or owner, THE system SHALL reject the access request.

WHEN the banned user list is empty, THE system SHALL display an appropriate message.

WHEN a user is unbanned, THE system SHALL immediately remove them from the active banned user list.

WHEN a user is banned, THE system SHALL immediately add them to the banned user list.

WHEN viewing the banned user list, THE system SHALL show the total count of banned users.

### Ban Restrictions

WHILE a user is banned from a community, THE system SHALL:
1. Prevent the user from creating new posts in that community
2. Prevent the user from writing new comments on posts in that community
3. Prevent the user from replying to existing comments in that community
4. Allow the user to view all posts in that community
5. Allow the user to view all comments in that community
6. Allow the user to view the community page and information
7. Allow the user to subscribe or unsubscribe from the community
8. Allow the user to view the community feed

IF a banned user attempts to create a post, THE system SHALL reject the action with an appropriate message.

IF a banned user attempts to write a comment, THE system SHALL reject the action with an appropriate message.

IF a banned user attempts to reply to a comment, THE system SHALL reject the action with an appropriate message.

WHEN a banned user views community content, THE system SHALL display all posts and comments normally.

WHEN a banned user attempts to vote on content in the banned community, THE system SHALL allow the vote.

WHEN a banned user attempts to report content in the banned community, THE system SHALL allow the report.

WHEN a banned user attempts to subscribe to the community, THE system SHALL allow the subscription.

WHEN a banned user attempts to unsubscribe from the community, THE system SHALL allow the unsubscription.

## Block Operations

Users can block other users to prevent unwanted interactions. When a user blocks another user, blocked content becomes hidden from their view. Blocking prevents the blocked user's posts and comments from appearing in feeds. Users can unblock previously blocked users to restore normal visibility. Blocked users cannot see each other's content in their respective views. Blocking is a user-controlled feature for managing their experience. Users can manage their block list to control who they interact with. Blocking does not notify the blocked user of the action. Block status is tracked with timestamps for when blocks were created.

### Block User Operations

WHEN a user blocks another user, THE system SHALL create a block record with the current timestamp.

WHEN a user blocks another user, THE system SHALL prevent the blocked user's posts from appearing in the blocker's feeds.

WHEN a user blocks another user, THE system SHALL prevent the blocked user's comments from appearing in the blocker's feeds.

WHEN a user blocks another user, THE system SHALL prevent the blocked user's profile from being viewed by the blocker.

WHEN a user blocks another user, THE system SHALL NOT notify the blocked user of the blocking action.

WHEN a user attempts to block themselves, THE system SHALL reject the request.

WHEN a user blocks another user who is already blocked, THE system SHALL update the existing block record without creating a duplicate.

WHEN a user blocks another user, THE system SHALL record the timestamp when the block was created.

WHEN a blocked user creates a new post, THE system SHALL exclude that post from the blocker's home feed.

WHEN a blocked user creates a new comment, THE system SHALL exclude that comment from the blocker's view.

WHEN a user views a post, THE system SHALL hide all comments from blocked users.

WHEN a user views a comment thread, THE system SHALL hide replies from blocked users.

WHEN a blocked user attempts to interact with the blocker's content, THE system SHALL allow the interaction but hide the result from the blocker.

WHEN a user blocks another user, THE system SHALL apply the block across all communities on the platform.

WHEN a user blocks another user, THE system SHALL prevent the blocked user from appearing in the blocker's direct interactions.

### Unblock User Operations

WHEN a user unblocks another user, THE system SHALL remove the block record between the users.

WHEN a user unblocks another user, THE system SHALL restore visibility of the previously blocked user's content in feeds.

WHEN a user unblocks another user, THE system SHALL allow the user to view the previously blocked user's profile.

WHEN a user unblocks another user, THE system SHALL NOT notify the unblocked user of the action.

WHEN a user unblocks another user, THE system SHALL preserve all historical posts and comments from the unblocked user.

WHEN a user unblocks another user, THE system SHALL allow normal interactions between the two users to resume.

WHEN a user unblocks another user, THE system SHALL remove the block timestamp from the block record.

WHEN a user unblocks another user, THE system SHALL allow the unblocked user's new content to appear in the user's feeds.

WHEN a user unblocks another user, THE system SHALL update the block list to remove the unblocked user.

WHEN a user unblocks another user, THE system SHALL restore the ability to view comments from the unblocked user.

### Block List Management

WHEN a user requests their block list, THE system SHALL display all users they have blocked.

WHEN a user views their block list, THE system SHALL show the username of each blocked user.

WHEN a user views their block list, THE system SHALL show the timestamp when each user was blocked.

WHEN a user views their block list, THE system SHALL provide an option to unblock each user.

WHEN a user views their block list, THE system SHALL display the total count of blocked users.

WHEN a user blocks a new user, THE system SHALL add that user to the block list immediately.

WHEN a user unblocks a user, THE system SHALL remove that user from the block list immediately.

WHEN a user deletes their account, THE system SHALL remove all block records associated with that user.

WHEN a user views their block list, THE system SHALL allow sorting by block timestamp.

WHEN a user views their block list, THE system SHALL paginate the list if it exceeds display limits.

WHEN a user views their block list, THE system SHALL show the most recently blocked users first by default.

WHEN a user views their block list, THE system SHALL provide a search function to find specific blocked users.

WHEN a user views their block list, THE system SHALL display the block status as active for all listed users.

### Content Hiding and Feed Filtering

WHEN a user views any feed, THE system SHALL filter out all posts from blocked users.

WHEN a user views any feed, THE system SHALL filter out all comments from blocked users.

WHEN a user views the home feed, THE system SHALL exclude content from blocked users regardless of community subscription.

WHEN a user views the popular feed, THE system SHALL exclude content from blocked users.

WHEN a user views a community feed, THE system SHALL exclude content from blocked users in that community.

WHEN a user searches for content, THE system SHALL exclude results from blocked users.

WHEN a user views a post page, THE system SHALL hide all comments from blocked users.

WHEN a user views a comment thread, THE system SHALL collapse or hide branches containing blocked users' comments.

WHEN a blocked user's content is filtered, THE system SHALL NOT display any indication that the user is blocked.

WHEN a user views a feed, THE system SHALL apply block filtering before applying other sort criteria.

WHEN a user views a feed, THE system SHALL maintain consistent pagination despite blocked content removal.

WHEN a user views a feed, THE system SHALL not include blocked users' content in vote score calculations visible to the user.

WHEN a user views a feed, THE system SHALL hide blocked users' usernames from all visible content.

WHEN a user views a feed, THE system SHALL prevent blocked users from appearing in "top contributors" or similar lists.

WHEN a user views a feed, THE system SHALL ensure blocked content does not affect the user's karma calculations.

# Business Actions and Workflows

Business actions and workflows beyond basic CRUD.

## User Actions

Users create accounts by providing email and choosing a unique username. During registration, users must select a password that meets security requirements. After signing up, users verify their email address to activate their account. Users log in using their email and password credentials. Account owners can update their password at any time through account settings. Users can modify their display name, bio text, and avatar image on their profile. When users delete their account, all their posts and comments are permanently removed from the platform. Account deletion is irreversible and requires confirmation. Users can view any other user's public profile information. Profile pages display the user's karma score and content history.

### Account Registration

WHEN a user registers for a new account, THE system SHALL require an email address.

WHEN a user registers for a new account, THE system SHALL require a unique username.

WHEN a user registers for a new account, THE system SHALL require a password.

WHEN a user submits registration information, THE system SHALL validate that the email address format is valid.

WHEN a user submits registration information, THE system SHALL validate that the username is unique across all registered users.

WHEN a user submits registration information, THE system SHALL validate that the password meets security requirements.

WHEN registration is successful, THE system SHALL create a new User account with the provided information.

WHEN registration is successful, THE system SHALL initialize the user's karma score to zero.

WHEN registration is successful, THE system SHALL send a verification email to the provided email address.

IF the email address is already registered, THEN THE system SHALL reject the registration request.

IF the username is already taken, THEN THE system SHALL reject the registration request.

IF the password does not meet security requirements, THEN THE system SHALL reject the registration request.

### Email Verification

WHEN a user registers, THE system SHALL send an email verification link to the provided email address.

WHEN a user clicks the email verification link, THE system SHALL verify the email address.

WHEN a user verifies their email address, THE system SHALL mark the account as verified.

WHEN a user verifies their email address, THE system SHALL activate full account functionality.

WHILE a user's email is unverified, THE system SHALL restrict certain account features.

WHEN a user requests a new verification email, THE system SHALL send a new verification link.

IF the verification link has expired, THEN THE system SHALL require a new verification email.

IF the verification link is invalid, THEN THE system SHALL display an error message.

### Password Management

WHEN a logged-in user requests to change their password, THE system SHALL require the current password.

WHEN a logged-in user requests to change their password, THE system SHALL require a new password.

WHEN a user submits a new password, THE system SHALL validate that the new password meets security requirements.

WHEN a user successfully changes their password, THE system SHALL update the password in the system.

WHEN a user successfully changes their password, THE system SHALL invalidate all existing sessions for that user.

WHEN a user logs in after a password change, THE system SHALL require the new password.

IF the current password provided is incorrect, THEN THE system SHALL reject the password change request.

IF the new password meets security requirements, THEN THE system SHALL accept the password change.

### Profile Customization

WHEN a user accesses their profile settings, THE system SHALL display their current display name.

WHEN a user accesses their profile settings, THE system SHALL display their current bio text.

WHEN a user accesses their profile settings, THE system SHALL display their current avatar image.

WHEN a user updates their display name, THE system SHALL save the new display name.

WHEN a user updates their bio text, THE system SHALL save the new bio text.

WHEN a user updates their avatar image, THE system SHALL save the new avatar image.

WHEN a user updates their profile information, THE system SHALL make the changes visible to other users.

WHEN a user deletes their avatar image, THE system SHALL replace it with a default avatar.

IF the display name is empty, THEN THE system SHALL reject the profile update.

IF the bio text exceeds the maximum length, THEN THE system SHALL reject the profile update.

### Account Deletion

WHEN a user requests to delete their account, THE system SHALL require confirmation of the deletion.

WHEN a user confirms account deletion, THE system SHALL permanently delete all posts created by the user.

WHEN a user confirms account deletion, THE system SHALL permanently delete all comments written by the user.

WHEN a user confirms account deletion, THE system SHALL permanently delete the user account.

WHEN a user confirms account deletion, THE system SHALL remove all subscriptions associated with the user.

WHEN a user confirms account deletion, THE system SHALL remove all votes cast by the user.

WHEN a user confirms account deletion, THE system SHALL adjust karma scores of affected content accordingly.

WHEN a user confirms account deletion, THE system SHALL invalidate all active sessions for that user.

IF a user attempts to log in after account deletion, THEN THE system SHALL reject the login attempt.

IF account deletion is confirmed, THEN THE system SHALL make the deletion irreversible.

### Login Workflow

WHEN a user attempts to log in, THE system SHALL require an email address.

WHEN a user attempts to log in, THE system SHALL require a password.

WHEN a user submits login credentials, THE system SHALL validate the email address exists.

WHEN a user submits login credentials, THE system SHALL validate the password matches the account.

WHEN login credentials are valid, THE system SHALL create an authenticated session.

WHEN login credentials are valid, THE system SHALL redirect the user to their home feed.

WHEN a user logs out, THE system SHALL terminate the authenticated session.

IF the email address does not exist, THEN THE system SHALL reject the login attempt.

IF the password is incorrect, THEN THE system SHALL reject the login attempt.

IF the account is deleted, THEN THE system SHALL reject the login attempt.

### User Profile Viewing

WHEN a user views another user's profile, THE system SHALL display the user's display name.

WHEN a user views another user's profile, THE system SHALL display the user's bio text.

WHEN a user views another user's profile, THE system SHALL display the user's avatar image.

WHEN a user views another user's profile, THE system SHALL display the user's total karma score.

WHEN a user views another user's profile, THE system SHALL display a list of all posts created by that user.

WHEN a user views another user's profile, THE system SHALL display a list of all comments written by that user.

WHEN a guest views a user's profile, THE system SHALL display the same public information as for logged-in users.

WHEN a user views their own profile, THE system SHALL display the same information as other users see.

IF the user's account has been deleted, THEN THE system SHALL not display the profile.

IF the user has no posts, THEN THE system SHALL display an empty posts list.

### Content Ownership

WHEN a user creates a post, THE system SHALL associate the post with the user as the author.

WHEN a user creates a comment, THE system SHALL associate the comment with the user as the author.

WHEN a user's post is displayed, THE system SHALL show the user's username as the author.

WHEN a user's comment is displayed, THE system SHALL show the user's username as the author.

WHEN a user's post receives an upvote, THE system SHALL increase the user's karma by one.

WHEN a user's post receives a downvote, THE system SHALL decrease the user's karma by one.

WHEN a user's comment receives an upvote, THE system SHALL increase the user's karma by one.

WHEN a user's comment receives a downvote, THE system SHALL decrease the user's karma by one.

WHEN a user deletes their account, THE system SHALL remove all content ownership associations.

WHEN a user's content is deleted by a moderator, THE system SHALL maintain the ownership record for moderation purposes.

## Community Actions

Any registered user can create a new community on the platform. Community creators provide a unique name, description text, and icon image during setup. The user who creates a community automatically becomes its owner with full control. Users can browse all available communities in a searchable list. Community search allows users to find communities by name. Each community displays its current subscriber count publicly. Community owners can view and manage their community settings. Users can access any community's public content without subscribing. Community information remains visible to all platform users.

### Community Creation

WHEN a registered user creates a community, THE system SHALL require a unique community name.

WHEN a registered user creates a community, THE system SHALL allow an optional description text.

WHEN a registered user creates a community, THE system SHALL allow an optional icon image.

WHEN a user creates a community, THE system SHALL automatically assign the creator as the community owner.

WHEN a community is created, THE system SHALL initialize the subscriber count to zero.

WHEN a community is created, THE system SHALL record the creation timestamp.

IF the proposed community name already exists, THE system SHALL reject the community creation request.

IF the proposed community name is empty or too short, THE system SHALL reject the community creation request.

IF the proposed community name exceeds the maximum length, THE system SHALL reject the community creation request.

IF the description text exceeds the maximum allowed length, THE system SHALL reject the community creation request.

IF the icon image is in an unsupported format, THE system SHALL reject the community creation request.

IF the icon image exceeds the maximum allowed size, THE system SHALL reject the community creation request.

WHEN a community creation request is successful, THE system SHALL make the community immediately visible to all users.

WHEN a community creation request is successful, THE system SHALL allow the owner to configure community settings.

### Community Ownership

WHEN a user creates a community, THE system SHALL grant the creator owner role with full authority.

WHEN a community owner views their community, THE system SHALL display their owner status.

WHEN a community owner adds a moderator, THE system SHALL assign the moderator role to the selected user.

WHEN a community owner removes a moderator, THE system SHALL revoke the moderator role from the selected user.

WHEN a community owner deletes a post, THE system SHALL remove the post from the community.

WHEN a community owner deletes a comment, THE system SHALL remove the comment from the community.

WHEN a community owner bans a user, THE system SHALL prevent the banned user from posting or commenting in the community.

WHEN a community owner unbans a user, THE system SHALL restore the user's posting and commenting privileges.

WHEN a community owner views reports, THE system SHALL display all pending reports for their community.

WHEN a community owner approves a report, THE system SHALL delete the reported content.

WHEN a community owner dismisses a report, THE system SHALL remove the report from the pending list.

IF a moderator attempts to remove the owner, THE system SHALL reject the request.

IF a moderator attempts to remove another moderator, THE system SHALL reject the request.

WHEN a community owner transfers ownership, THE system SHALL reassign all owner privileges to the new owner.

WHEN a community owner leaves the community, THE system SHALL require ownership transfer to another user.

### Community Browsing

WHEN a user views the community list, THE system SHALL display all communities on the platform.

WHEN a user views the community list, THE system SHALL show each community's name and description.

WHEN a user views the community list, THE system SHALL display the subscriber count for each community.

WHEN a user views the community list, THE system SHALL show the community icon if available.

WHEN a user views the community list, THE system SHALL display the creation date for each community.

WHEN a user clicks on a community, THE system SHALL navigate to the community's main page.

WHEN a user views a community's main page, THE system SHALL display the community name and description.

WHEN a user views a community's main page, THE system SHALL show the current subscriber count.

WHEN a user views a community's main page, THE system SHALL display the community icon if available.

WHEN a user views a community's main page, THE system SHALL show posts from that community.

WHEN a user views a community's main page, THE system SHALL display the owner's username.

WHEN a user views a community's main page, THE system SHALL show moderator usernames if any exist.

IF a community has been deleted, THE system SHALL exclude it from the community list.

WHEN the community list is paginated, THE system SHALL allow users to navigate between pages.

WHEN a user views the community list, THE system SHALL sort communities by creation date by default.

### Community Search

WHEN a user searches for communities, THE system SHALL allow search by community name.

WHEN a user searches for communities, THE system SHALL return communities matching the search term.

WHEN a user searches for communities, THE system SHALL perform case-insensitive matching.

WHEN a user searches for communities, THE system SHALL support partial name matching.

WHEN a user searches for communities, THE system SHALL display matching results in a list.

WHEN a user searches for communities, THE system SHALL show the subscriber count for each result.

WHEN a user searches for communities, THE system SHALL display the community icon for each result.

WHEN a user searches for communities, THE system SHALL display the community description for each result.

IF no communities match the search term, THE system SHALL display a no results message.

IF the search term is empty, THE system SHALL display all communities.

IF the search term contains special characters, THE system SHALL handle them safely.

WHEN search results are displayed, THE system SHALL sort by relevance to the search term.

WHEN search results are paginated, THE system SHALL allow navigation between result pages.

WHEN a user clicks on a search result, THE system SHALL navigate to that community's page.

WHEN a user searches for communities, THE system SHALL include communities the user is subscribed to in results.

### Subscriber Count Display

WHEN a community is displayed, THE system SHALL show the current subscriber count.

WHEN a user subscribes to a community, THE system SHALL increment the subscriber count by one.

WHEN a user unsubscribes from a community, THE system SHALL decrement the subscriber count by one.

WHEN a user views the community list, THE system SHALL display the subscriber count for each community.

WHEN a user views a community's main page, THE system SHALL display the current subscriber count.

WHEN a user views a community's main page, THE system SHALL show the subscriber count prominently.

WHEN a community is created, THE system SHALL initialize the subscriber count to zero.

WHEN a user is banned from a community, THE system SHALL NOT change the subscriber count.

WHEN a user is unbanned from a community, THE system SHALL NOT change the subscriber count.

WHEN a community's subscriber count is displayed, THE system SHALL show it as a whole number.

WHEN a user views the community list, THE system SHALL sort communities by subscriber count if requested.

WHEN a user views a community's main page, THE system SHALL update the subscriber count in real time.

IF a subscriber count cannot be calculated, THE system SHALL display zero.

WHEN a user views their subscription list, THE system SHALL show subscriber counts for each community.

WHEN a community's subscriber count is displayed, THE system SHALL include the current user if subscribed.

### Community Settings

WHEN a community owner views settings, THE system SHALL display community configuration options.

WHEN a community owner edits the community name, THE system SHALL require a unique name.

WHEN a community owner edits the community description, THE system SHALL allow text input.

WHEN a community owner edits the community icon, THE system SHALL allow image upload.

WHEN a community owner manages moderators, THE system SHALL display the current moderator list.

WHEN a community owner adds a moderator, THE system SHALL require selecting an existing user.

WHEN a community owner removes a moderator, THE system SHALL require selecting a moderator to remove.

WHEN a community owner views banned users, THE system SHALL display the list of banned users.

WHEN a community owner unbans a user, THE system SHALL require selecting a banned user.

WHEN a community owner views reports, THE system SHALL display all pending reports.

WHEN a community owner approves a report, THE system SHALL delete the reported content.

WHEN a community owner dismisses a report, THE system SHALL remove it from the pending list.

WHEN a community owner changes settings, THE system SHALL save changes immediately.

IF a community name change conflicts with an existing community, THE system SHALL reject the change.

IF a moderator is removed, THE system SHALL revoke all moderation privileges immediately.

### Public Community Access

WHEN a guest views a community, THE system SHALL display the community name and description.

WHEN a guest views a community, THE system SHALL show the subscriber count.

WHEN a guest views a community, THE system SHALL display posts from that community.

WHEN a guest views a community, THE system SHALL show the community icon if available.

WHEN a guest views a community, THE system SHALL allow viewing all public content.

WHEN a guest views a community, THE system SHALL display post titles and content.

WHEN a guest views a community, THE system SHALL show comment threads on posts.

WHEN a guest views a community, THE system SHALL display vote scores on posts and comments.

WHEN a guest views a community, THE system SHALL show author usernames for posts and comments.

WHEN a guest views a community, THE system SHALL display timestamps for all content.

IF a guest attempts to subscribe to a community, THE system SHALL require login.

IF a guest attempts to create a post, THE system SHALL require login.

IF a guest attempts to comment, THE system SHALL require login.

IF a guest attempts to vote, THE system SHALL require login.

WHEN a guest views a community, THE system SHALL provide login prompts for restricted actions.

### Community Management

WHEN a community owner manages the community, THE system SHALL display all management options.

WHEN a community owner manages moderators, THE system SHALL allow adding new moderators.

WHEN a community owner manages moderators, THE system SHALL allow removing existing moderators.

WHEN a community owner manages content, THE system SHALL allow deleting any post.

WHEN a community owner manages content, THE system SHALL allow deleting any comment.

WHEN a community owner manages users, THE system SHALL allow banning users from the community.

WHEN a community owner manages users, THE system SHALL allow unbanning previously banned users.

WHEN a community owner manages reports, THE system SHALL display all pending reports.

WHEN a community owner manages reports, THE system SHALL allow approving reports to delete content.

WHEN a community owner manages reports, THE system SHALL allow dismissing reports to keep content.

WHEN a moderator manages content, THE system SHALL allow deleting posts in their community.

WHEN a moderator manages content, THE system SHALL allow deleting comments in their community.

WHEN a moderator manages users, THE system SHALL allow banning users from the community.

WHEN a moderator manages users, THE system SHALL allow unbanning previously banned users.

WHEN a moderator manages reports, THE system SHALL display all pending reports.

WHEN a moderator manages reports, THE system SHALL allow approving or dismissing reports.

IF a moderator attempts to remove the owner, THE system SHALL reject the request.

IF a moderator attempts to remove another moderator, THE system SHALL reject the request.

WHEN a community owner transfers ownership, THE system SHALL reassign all management privileges.

WHEN a community owner leaves without transfer, THE system SHALL require ownership transfer.

## Post Actions

Users can create posts only in communities they have subscribed to. Each post requires a title and must be one of three content types. Text posts contain written content up to a specified length limit. Link posts include a URL that directs to external content. Image posts feature uploaded images as the primary content. Post authors can edit their own posts at any time. Users can delete their own posts when no longer needed. When viewing a post, users see the title, full content, and author information. Posts display the community name and posting timestamp. Vote scores and comment counts appear on each post. Post list views show content previews based on post type.

### Post Creation Workflow

WHEN a user initiates post creation, THE system SHALL verify the user is subscribed to the target community.

WHEN a user creates a post, THE system SHALL require a title.

WHEN a user creates a post, THE system SHALL require the user to select one post type from available options.

WHEN a user creates a post, THE system SHALL associate the post with the creating user as the author.

WHEN a user creates a post, THE system SHALL associate the post with the target community.

WHEN a user creates a post, THE system SHALL record the creation timestamp.

WHEN a user creates a post, THE system SHALL initialize the vote score to zero.

WHEN a user creates a post, THE system SHALL initialize the comment count to zero.

IF the user is not subscribed to the community, THEN THE system SHALL prevent post creation.

IF the title is missing or empty, THEN THE system SHALL prevent post creation.

IF no post type is selected, THEN THE system SHALL prevent post creation.

WHEN a post is successfully created, THE system SHALL make the post visible in the community feed.

WHEN a post is successfully created, THE system SHALL make the post visible in the user's home feed.

### Post Type Selection

WHEN a user selects text post type, THE system SHALL require text content to be provided.

WHEN a user selects link post type, THE system SHALL require a URL to be provided.

WHEN a user selects image post type, THE system SHALL require an image to be uploaded.

WHEN a user creates a text post, THE system SHALL store the text content as the post body.

WHEN a user creates a link post, THE system SHALL store the URL as the post target.

WHEN a user creates an image post, THE system SHALL store the uploaded image as the post content.

WHEN a user changes the post type during creation, THE system SHALL update the required content fields accordingly.

WHEN a user creates a link post, THE system SHALL extract and store the domain name from the URL.

WHEN a user creates an image post, THE system SHALL generate a thumbnail for list display.

WHEN a user creates a text post, THE system SHALL generate a preview from the first 200 characters of content.

### Post Editing

WHEN a post author initiates editing, THE system SHALL allow modification of the post title.

WHEN a post author initiates editing, THE system SHALL allow modification of the post content.

WHEN a post author edits a text post, THE system SHALL allow changes to the text content.

WHEN a post author edits a link post, THE system SHALL allow changes to the URL.

WHEN a post author edits an image post, THE system SHALL allow replacement of the uploaded image.

WHEN a post author edits a post, THE system SHALL preserve the original creation timestamp.

WHEN a post author edits a post, THE system SHALL preserve existing votes on the post.

WHEN a post author edits a post, THE system SHALL preserve existing comments on the post.

WHEN a post author edits a link post, THE system SHALL update the extracted domain name.

WHEN a post author edits an image post, THE system SHALL regenerate the thumbnail for list display.

WHEN a post author edits a text post, THE system SHALL regenerate the preview from the first 200 characters.

WHEN a post is edited, THE system SHALL update the post display with the new content immediately.

### Post Deletion

WHEN a post author initiates deletion, THE system SHALL allow deletion of the post.

WHEN a post is deleted, THE system SHALL remove the post from all community feeds.

WHEN a post is deleted, THE system SHALL remove the post from the user's home feed.

WHEN a post is deleted, THE system SHALL remove the post from the user's profile post list.

WHEN a post is deleted, THE system SHALL remove all associated comments from the post.

WHEN a post is deleted, THE system SHALL remove all votes on the post.

WHEN a post is deleted, THE system SHALL adjust the author's karma score by removing points from deleted votes.

WHEN a post is deleted, THE system SHALL remove any pending reports on the post.

WHEN a post is deleted, THE system SHALL prevent further access to the post by all users.

WHEN a post is deleted, THE system SHALL prevent further commenting on the post.

WHEN a post is deleted, THE system SHALL prevent further voting on the post.

### Post Viewing

WHEN a user views a post, THE system SHALL display the post title.

WHEN a user views a post, THE system SHALL display the full post content.

WHEN a user views a post, THE system SHALL display the author's username.

WHEN a user views a post, THE system SHALL display the community name.

WHEN a user views a post, THE system SHALL display the current vote score.

WHEN a user views a post, THE system SHALL display the total comment count.

WHEN a user views a post, THE system SHALL display the time since the post was created.

WHEN a user views a post, THE system SHALL display the post type indicator.

WHEN a logged-in user views a post, THE system SHALL display the user's current vote on the post.

WHEN a guest views a post, THE system SHALL display the post without voting capability.

WHEN a user views a link post, THE system SHALL provide a clickable URL to the external content.

WHEN a user views an image post, THE system SHALL display the full-size uploaded image.

### Post Content Display

WHEN a post appears in a list view, THE system SHALL display the post title.

WHEN a post appears in a list view, THE system SHALL display the author's username.

WHEN a post appears in a list view, THE system SHALL display the community name.

WHEN a post appears in a list view, THE system SHALL display the current vote score.

WHEN a post appears in a list view, THE system SHALL display the comment count.

WHEN a post appears in a list view, THE system SHALL display the time since posting.

WHEN a text post appears in a list view, THE system SHALL display the first 200 characters of content.

WHEN an image post appears in a list view, THE system SHALL display a thumbnail of the image.

WHEN a link post appears in a list view, THE system SHALL display the domain name of the URL.

WHEN a post appears in a list view, THE system SHALL provide a link to view the full post.

WHEN a user hovers over a post in list view, THE system SHALL highlight the post for interaction.

WHEN a post appears in a list view, THE system SHALL display upvote and downvote buttons.

## Comment Actions

Users can write comments on any post they can view. Comments support unlimited reply depth for threaded discussions. Each comment shows the author, content, and posting time. Users can edit their own comments after posting. Comment authors can delete their comments at any time. Replies appear nested under their parent comments. Comments display vote scores alongside content. Users can reply to any existing comment in a thread. Comment content must meet minimum length requirements. All comments are visible to users viewing the parent post.

### Comment Creation

WHEN a user creates a comment on a post, THE system SHALL associate the comment with the logged-in user as the author.

WHEN a user creates a comment on a post, THE system SHALL record the timestamp of when the comment was created.

WHEN a user creates a comment, THE system SHALL require the comment to contain text content.

WHEN a user creates a comment on a post, THE system SHALL make the comment visible to all users who can view that post.

WHEN a user creates a comment, THE system SHALL initialize the comment vote score to zero.

WHEN a user creates a comment, THE system SHALL make the comment available for other users to reply to.

IF a user is banned from the community containing the post, THEN THE system SHALL prevent the user from creating comments on that post.

IF the post has been deleted, THEN THE system SHALL prevent users from creating comments on that post.

### Comment Replies

WHEN a user replies to an existing comment, THE system SHALL associate the reply with the parent comment.

WHEN a user replies to a comment, THE system SHALL maintain the hierarchical relationship between the parent comment and the reply.

WHEN a user replies to a comment, THE system SHALL allow unlimited nesting depth for replies within a thread.

WHEN a user replies to a comment, THE system SHALL display the reply nested beneath its parent comment.

WHEN a user replies to a comment, THE system SHALL record the reply as a separate comment with its own author and timestamp.

WHEN a user replies to a comment, THE system SHALL allow other users to reply to that reply.

IF the parent comment has been deleted, THEN THE system SHALL prevent users from replying to that comment.

IF a user is banned from the community, THEN THE system SHALL prevent the user from replying to comments in that community's posts.

### Comment Editing

WHEN a comment author edits their own comment, THE system SHALL update the comment content with the new text.

WHEN a comment author edits their own comment, THE system SHALL preserve the original creation timestamp.

WHEN a comment author edits their own comment, THE system SHALL retain all existing votes on the comment.

WHEN a comment author edits their own comment, THE system SHALL maintain the comment's position in the reply thread.

WHEN a comment author edits their own comment, THE system SHALL keep all replies to that comment intact.

WHEN a comment author edits their own comment, THE system SHALL allow the edited comment to remain visible to all users who can view the post.

IF a user attempts to edit a comment they did not create, THEN THE system SHALL reject the edit request.

IF a comment has been deleted, THEN THE system SHALL prevent any edits to that comment.

### Comment Deletion

WHEN a comment author deletes their own comment, THE system SHALL remove the comment from view for all users.

WHEN a comment author deletes their own comment, THE system SHALL remove all replies to that comment from view.

WHEN a comment author deletes their own comment, THE system SHALL adjust the karma score by removing the karma from votes on the deleted comment.

WHEN a comment author deletes their own comment, THE system SHALL prevent the deleted comment from appearing in any feed or post view.

WHEN a comment author deletes their own comment, THE system SHALL prevent other users from replying to the deleted comment.

WHEN a comment author deletes their own comment, THE system SHALL prevent other users from voting on the deleted comment.

IF a user attempts to delete a comment they did not create, THEN THE system SHALL reject the deletion request.

IF a comment has already been deleted, THEN THE system SHALL prevent further deletion attempts.

### Threaded Discussions

THE system SHALL support nested comment threads with unlimited depth.

THE system SHALL display replies nested beneath their parent comments in a hierarchical structure.

THE system SHALL maintain the parent-child relationship between comments and their replies.

THE system SHALL allow users to navigate through nested comment threads.

THE system SHALL display the full thread structure when viewing a post with comments.

THE system SHALL preserve thread structure when comments are edited.

WHEN a parent comment is deleted, THE system SHALL hide all nested replies from that parent.

WHEN a user views a comment thread, THE system SHALL show the depth level of each comment in the thread.

### Comment Viewing

WHEN a user views a comment, THE system SHALL display the comment content.

WHEN a user views a comment, THE system SHALL display the comment author's username.

WHEN a user views a comment, THE system SHALL display the time since the comment was posted.

WHEN a user views a comment, THE system SHALL display the comment's vote score.

WHEN a user views a comment, THE system SHALL display any replies nested beneath the comment.

WHEN a user views a comment, THE system SHALL show the comment in the context of the parent post.

WHEN a user views a comment, THE system SHALL display the comment in the appropriate sorting order based on the selected sort option.

IF a comment has been deleted, THEN THE system SHALL not display the comment to any user.

### Comment Authorship

THE system SHALL associate each comment with the user who created it as the author.

THE system SHALL display the author's username alongside each comment.

THE system SHALL allow users to view the author's profile from a comment.

THE system SHALL track which user created each comment for karma calculation purposes.

THE system SHALL allow only the comment author to edit their own comment.

THE system SHALL allow only the comment author to delete their own comment.

THE system SHALL attribute karma changes from comment votes to the comment's author.

WHEN a user creates a comment, THE system SHALL record the user as the permanent author of that comment.

### Comment Voting

WHEN a user upvotes a comment, THE system SHALL increase the comment's vote score by one.

WHEN a user upvotes a comment, THE system SHALL increase the comment author's karma by one.

WHEN a user downvotes a comment, THE system SHALL decrease the comment's vote score by one.

WHEN a user downvotes a comment, THE system SHALL decrease the comment author's karma by one.

WHEN a user changes their vote from upvote to downvote on a comment, THE system SHALL adjust the comment's vote score by two points.

WHEN a user changes their vote from downvote to upvote on a comment, THE system SHALL adjust the comment's vote score by two points.

WHEN a user removes their vote from a comment, THE system SHALL adjust the comment's vote score accordingly.

WHEN a user removes their vote from a comment, THE system SHALL adjust the comment author's karma accordingly.

THE system SHALL allow each user to cast only one vote per comment.

THE system SHALL allow users to change their existing vote on a comment.

THE system SHALL allow users to remove their vote from a comment entirely.

IF a user is banned from the community, THEN THE system SHALL prevent the user from voting on comments in that community's posts.

## Vote Actions

Users can upvote or downvote any post or comment they encounter. Each user can cast only one vote per post or comment. Vote values increase scores by one for upvotes and decrease by one for downvotes. Users can change their vote from upvote to downvote or vice versa. Vote removal adjusts the score accordingly without penalty. Vote scores equal total upvotes minus total downvotes. Voting affects the author's karma score immediately. Users can vote on content without being subscribed to the community. Vote changes are tracked to prevent multiple votes. Vote history is maintained for each user and content item.

### Upvote Workflow

WHEN a user upvotes a post, THE system SHALL increase the post's vote score by 1.

WHEN a user upvotes a comment, THE system SHALL increase the comment's vote score by 1.

WHEN a user upvotes content, THE system SHALL increase the content author's karma score by 1.

WHEN a user upvotes content for the first time, THE system SHALL record the vote as an upvote.

WHEN a user upvotes content they have not previously voted on, THE system SHALL allow the upvote without restriction.

WHEN a user upvotes content, THE system SHALL immediately reflect the vote score change.

WHEN a user upvotes content, THE system SHALL immediately reflect the karma change.

WHEN a guest views content, THE system SHALL display the current vote score without requiring login.

WHEN a logged-in user views content, THE system SHALL display their current vote status if they have voted.

WHEN a user upvotes content in a community they are not subscribed to, THE system SHALL allow the upvote.

WHEN a user upvotes content from a banned user in a community, THE system SHALL allow the upvote.

WHEN a user upvotes content, THE system SHALL prevent the same user from upvoting again without first changing or removing their vote.

### Downvote Workflow

WHEN a user downvotes a post, THE system SHALL decrease the post's vote score by 1.

WHEN a user downvotes a comment, THE system SHALL decrease the comment's vote score by 1.

WHEN a user downvotes content, THE system SHALL decrease the content author's karma score by 1.

WHEN a user downvotes content for the first time, THE system SHALL record the vote as a downvote.

WHEN a user downvotes content they have not previously voted on, THE system SHALL allow the downvote without restriction.

WHEN a user downvotes content, THE system SHALL immediately reflect the vote score change.

WHEN a user downvotes content, THE system SHALL immediately reflect the karma change.

WHEN a user downvotes content, THE system SHALL allow the downvote regardless of community subscription status.

WHEN a user downvotes content, THE system SHALL prevent the same user from downvoting again without first changing or removing their vote.

WHEN a user downvotes content, THE system SHALL track the vote for future modification or removal.

### Vote Modification

WHEN a user changes their vote from upvote to downvote on a post, THE system SHALL decrease the post's vote score by 2.

WHEN a user changes their vote from upvote to downvote on a comment, THE system SHALL decrease the comment's vote score by 2.

WHEN a user changes their vote from upvote to downvote, THE system SHALL decrease the content author's karma score by 2.

WHEN a user changes their vote from downvote to upvote on a post, THE system SHALL increase the post's vote score by 2.

WHEN a user changes their vote from downvote to upvote on a comment, THE system SHALL increase the comment's vote score by 2.

WHEN a user changes their vote from downvote to upvote, THE system SHALL increase the content author's karma score by 2.

WHEN a user modifies their vote, THE system SHALL update the vote record to reflect the new vote value.

WHEN a user modifies their vote, THE system SHALL immediately reflect all score and karma changes.

WHEN a user modifies their vote, THE system SHALL replace the previous vote rather than creating a new vote record.

WHEN a user modifies their vote on content, THE system SHALL maintain vote tracking for the content item.

### Vote Removal

WHEN a user removes their upvote from a post, THE system SHALL decrease the post's vote score by 1.

WHEN a user removes their upvote from a comment, THE system SHALL decrease the comment's vote score by 1.

WHEN a user removes their upvote, THE system SHALL decrease the content author's karma score by 1.

WHEN a user removes their downvote from a post, THE system SHALL increase the post's vote score by 1.

WHEN a user removes their downvote from a comment, THE system SHALL increase the comment's vote score by 1.

WHEN a user removes their downvote, THE system SHALL increase the content author's karma score by 1.

WHEN a user removes their vote, THE system SHALL delete the vote record for that user and content item.

WHEN a user removes their vote, THE system SHALL immediately reflect all score and karma changes.

WHEN a user removes their vote, THE system SHALL allow the user to vote again on the same content.

WHEN a user removes their vote, THE system SHALL not apply any penalty to the user or content author.

### Karma Impact

WHEN a user upvotes content, THE system SHALL increase the content author's karma score by 1.

WHEN a user downvotes content, THE system SHALL decrease the content author's karma score by 1.

WHEN a user removes their upvote, THE system SHALL decrease the content author's karma score by 1.

WHEN a user removes their downvote, THE system SHALL increase the content author's karma score by 1.

WHEN a user changes their vote from upvote to downvote, THE system SHALL decrease the content author's karma score by 2.

WHEN a user changes their vote from downvote to upvote, THE system SHALL increase the content author's karma score by 2.

WHEN karma changes occur, THE system SHALL update the karma score immediately.

WHEN karma changes occur, THE system SHALL allow the karma score to become negative.

WHEN a user views their own profile, THE system SHALL display their current total karma score.

WHEN a user views another user's profile, THE system SHALL display that user's current total karma score.

WHEN a user's karma score changes, THE system SHALL reflect the change on all profile views immediately.

### Vote Tracking

WHEN a user casts a vote, THE system SHALL record the voter's identity.

WHEN a user casts a vote, THE system SHALL record the target content item (post or comment).

WHEN a user casts a vote, THE system SHALL record the vote value (upvote or downvote).

WHEN a user casts a vote, THE system SHALL record the timestamp of the vote.

WHEN a user modifies their vote, THE system SHALL update the existing vote record.

WHEN a user removes their vote, THE system SHALL delete the vote record.

WHEN the system tracks votes, THE system SHALL maintain one vote record per user per content item.

WHEN the system tracks votes, THE system SHALL prevent multiple vote records for the same user and content item.

WHEN vote tracking occurs, THE system SHALL enable accurate score calculation.

WHEN vote tracking occurs, THE system SHALL enable accurate karma calculation.

WHEN vote tracking occurs, THE system SHALL enable vote status display to logged-in users.

### Score Calculation

WHEN the system calculates a post's vote score, THE system SHALL compute total upvotes minus total downvotes.

WHEN the system calculates a comment's vote score, THE system SHALL compute total upvotes minus total downvotes.

WHEN the system calculates a vote score, THE system SHALL use the current vote records only.

WHEN the system calculates a vote score, THE system SHALL reflect all active votes from all users.

WHEN the system calculates a vote score, THE system SHALL allow the score to be negative.

WHEN the system calculates a vote score, THE system SHALL allow the score to be zero.

WHEN the system calculates a vote score, THE system SHALL update the score immediately when votes change.

WHEN a user views content, THE system SHALL display the current calculated vote score.

WHEN content is sorted by vote score, THE system SHALL use the calculated vote score for ordering.

WHEN the system calculates vote scores, THE system SHALL not apply any weighting or decay factors.

### Single Vote Rule

WHEN a user attempts to vote on content, THE system SHALL check if the user has already voted on that content.

WHEN a user has already voted on content, THE system SHALL prevent a second vote without modification or removal.

WHEN a user has not voted on content, THE system SHALL allow the user to cast a vote.

WHEN a user votes on a post, THE system SHALL allow only one vote from that user on that post.

WHEN a user votes on a comment, THE system SHALL allow only one vote from that user on that comment.

WHEN a user changes their vote, THE system SHALL replace the existing vote rather than creating a new vote.

WHEN a user removes their vote, THE system SHALL allow the user to vote again on the same content.

WHEN the single vote rule is enforced, THE system SHALL maintain data integrity for score calculation.

WHEN the single vote rule is enforced, THE system SHALL maintain data integrity for karma calculation.

WHEN the single vote rule is enforced, THE system SHALL prevent vote manipulation through multiple votes.

## Subscription Actions

Users can subscribe to any community on the platform. Subscription requires no approval or payment. Users can unsubscribe from communities at any time. Subscribed communities appear in a user's subscription list. Subscription is mandatory before creating posts in a community. Users can view all communities they have subscribed to. Subscription status is tracked per user and community. Subscribers receive content in their home feed. Unsubscribing removes content from the home feed. Subscription counts are visible on community pages.

### Community Subscription

WHEN a member subscribes to a community, THE system SHALL:
1. Record the subscription with the current timestamp
2. Add the community to the member's subscription list
3. Increment the community's subscriber count by one
4. Include posts from this community in the member's home feed

IF a member is already subscribed to a community, THEN THE system SHALL:
- Treat the subscription request as a no-op
- Not increment the subscriber count again
- Not create a duplicate subscription record

IF the community does not exist, THEN THE system SHALL:
- Reject the subscription request
- Display an appropriate error message

IF the community has been deleted, THEN THE system SHALL:
- Reject the subscription request
- Display an appropriate error message

### Community Unsubscription

WHEN a member unsubscribes from a community, THE system SHALL:
1. Remove the subscription record for that member and community
2. Remove the community from the member's subscription list
3. Decrement the community's subscriber count by one
4. Exclude posts from this community from the member's home feed

IF a member is not subscribed to the community, THEN THE system SHALL:
- Treat the unsubscription request as a no-op
- Not decrement the subscriber count below zero
- Not create a negative subscription record

IF the community does not exist, THEN THE system SHALL:
- Reject the unsubscription request
- Display an appropriate error message

IF the community has been deleted, THEN THE system SHALL:
- Treat the unsubscription request as a no-op
- Not attempt to decrement the subscriber count

### Subscription List Viewing

WHEN a member views their subscription list, THE system SHALL:
1. Display all communities the member is subscribed to
2. Show the community name for each subscription
3. Show the community icon for each subscription
4. Show the subscriber count for each community
5. Sort subscriptions by most recently subscribed first

IF the member has no subscriptions, THEN THE system SHALL:
- Display an empty state message
- Not show any community cards

IF a subscribed community has been deleted, THEN THE system SHALL:
- Remove it from the subscription list
- Not display deleted communities

### Subscription Requirement

WHEN a member attempts to create a post in a community, THE system SHALL:
1. Verify the member is subscribed to that community
2. Allow post creation only if the member is subscribed
3. Reject post creation if the member is not subscribed

IF the member is not subscribed to the community, THEN THE system SHALL:
- Display an error message indicating subscription is required
- Provide an option to subscribe to the community
- Not allow the post to be created

IF the member is subscribed to the community, THEN THE system SHALL:
- Proceed with post creation workflow
- Not require any additional subscription verification

### Home Feed Inclusion

WHEN a member views their home feed, THE system SHALL:
1. Display posts only from communities the member is subscribed to
2. Exclude posts from communities the member is not subscribed to
3. Include posts from all subscribed communities in a single feed
4. Sort posts according to the selected sorting option

IF the member has no subscriptions, THEN THE system SHALL:
- Display an empty home feed
- Show a message encouraging community subscription
- Not display any posts

IF a member subscribes to a new community, THEN THE system SHALL:
- Include posts from that community in the home feed
- Apply the same sorting rules as other subscribed communities

IF a member unsubscribes from a community, THEN THE system SHALL:
- Remove posts from that community from the home feed
- Not display future posts from that community

### Subscription Tracking

WHEN a member subscribes to a community, THE system SHALL:
1. Create a subscription record linking the member and community
2. Store the subscription timestamp
3. Track the subscription status as active

WHEN a member unsubscribes from a community, THE system SHALL:
1. Remove or mark the subscription record as inactive
2. Preserve the historical subscription data
3. Update the subscription status accordingly

THE system SHALL:
- Maintain accurate subscription status for each member-community pair
- Ensure only one active subscription exists per member per community
- Track subscription changes for analytics purposes

### Subscriber Count

WHEN any user views a community page, THE system SHALL:
1. Display the current subscriber count
2. Show the subscriber count prominently on the community header
3. Update the count in real-time when subscriptions change

THE system SHALL:
- Calculate subscriber count as the total number of active subscriptions
- Include all members who have subscribed to the community
- Exclude members who have unsubscribed from the count
- Display the count as a whole number without decimal places

IF the community has zero subscribers, THEN THE system SHALL:
- Display "0 subscribers" or equivalent messaging
- Not hide the subscriber count display

IF the community has been deleted, THEN THE system SHALL:
- Not display the subscriber count
- Not show the community page

### Subscription Management

WHEN a member manages their subscriptions, THE system SHALL:
1. Allow viewing all subscribed communities at any time
2. Allow unsubscribing from any subscribed community
3. Provide clear subscription status for each community
4. Show when each subscription was created

THE system SHALL:
- Allow subscription changes without time restrictions
- Process subscription changes immediately
- Reflect subscription changes across all system features
- Maintain subscription history for audit purposes

IF a member deletes their account, THEN THE system SHALL:
- Remove all subscription records for that member
- Decrement subscriber counts for all affected communities
- Clean up subscription-related data

## Report Actions

Users can report any post or comment they find problematic. Reporting requires users to provide a text reason for the report. Reports are submitted to community moderators for review. Moderators can view all reports for their communities. Each report displays the reported content and reporter information. Reports include the reason provided by the reporting user. Moderators can approve reports to delete the content. Moderators can dismiss reports to keep the content visible. Dismissed reports are removed from the active report list. Report status tracks whether pending, approved, or dismissed.

### Content Reporting

WHEN a user finds a post problematic, THE system SHALL allow them to submit a report for that post.

WHEN a user finds a comment problematic, THE system SHALL allow them to submit a report for that comment.

WHEN a user submits a report, THE system SHALL associate the report with the reporting user's account.

WHEN a user submits a report, THE system SHALL associate the report with the reported post or comment.

WHEN a user submits a report, THE system SHALL record the date and time of report submission.

WHEN a user submits a report, THE system SHALL set the initial report status to pending.

IF a user attempts to report their own post, THE system SHALL reject the report submission.

IF a user attempts to report their own comment, THE system SHALL reject the report submission.

IF the reported post has been deleted, THE system SHALL reject the report submission.

IF the reported comment has been deleted, THE system SHALL reject the report submission.

WHEN a user submits a report, THE system SHALL notify the moderators of the community containing the reported content.

### Report Reason Requirement

WHEN a user submits a report, THE system SHALL require them to provide a text reason for the report.

IF the report reason is empty, THE system SHALL reject the report submission.

IF the report reason exceeds 500 characters, THE system SHALL truncate it to 500 characters.

WHEN a user submits a report, THE system SHALL store the reason provided by the reporting user.

WHEN a moderator views a report, THE system SHALL display the reason provided by the reporting user.

IF a user attempts to submit a report without providing a reason, THE system SHALL prompt them to enter a reason.

### Moderator Review Process

WHEN a moderator logs into the system, THE system SHALL allow them to view all pending reports for their moderated communities.

WHEN a moderator views a report, THE system SHALL display the reported post or comment content.

WHEN a moderator views a report, THE system SHALL display the username of the user who submitted the report.

WHEN a moderator views a report, THE system SHALL display the reason provided by the reporting user.

WHEN a moderator views a report, THE system SHALL display the community where the reported content exists.

WHEN a moderator views a report, THE system SHALL display the date and time when the report was submitted.

WHEN a moderator views a report, THE system SHALL display the current status of the report.

IF a moderator is not authorized for the community, THE system SHALL prevent them from viewing reports for that community.

WHEN a moderator views reports, THE system SHALL allow them to filter reports by status.

WHEN a moderator views reports, THE system SHALL allow them to sort reports by submission date.

### Report Approval Workflow

WHEN a moderator approves a report, THE system SHALL delete the reported post or comment.

WHEN a moderator approves a report, THE system SHALL update the report status to approved.

WHEN a moderator approves a report, THE system SHALL remove the report from the pending reports list.

IF the reported content has already been deleted, THE system SHALL prevent the moderator from approving the report.

WHEN a moderator approves a report for a post, THE system SHALL also delete all comments on that post.

WHEN a moderator approves a report for a comment, THE system SHALL also delete all replies to that comment.

WHEN a moderator approves a report, THE system SHALL record the approval action with a timestamp.

IF a moderator attempts to approve a report they are not authorized to review, THE system SHALL reject the approval action.

### Report Dismissal Workflow

WHEN a moderator dismisses a report, THE system SHALL keep the reported post or comment visible.

WHEN a moderator dismisses a report, THE system SHALL update the report status to dismissed.

WHEN a moderator dismisses a report, THE system SHALL remove the report from the active report list.

IF the reported content has already been deleted, THE system SHALL prevent the moderator from dismissing the report.

WHEN a moderator dismisses a report, THE system SHALL record the dismissal action with a timestamp.

IF a moderator attempts to dismiss a report they are not authorized to review, THE system SHALL reject the dismissal action.

WHEN a moderator dismisses a report, THE system SHALL prevent the same user from submitting another report for the same content.

### Report Status Tracking

WHEN a report is created, THE system SHALL track its status as pending.

WHEN a moderator approves a report, THE system SHALL update the status to approved.

WHEN a moderator dismisses a report, THE system SHALL update the status to dismissed.

WHEN a moderator views reports, THE system SHALL display the current status of each report.

WHEN a moderator filters reports, THE system SHALL allow filtering by status (pending, approved, dismissed).

IF a report status is pending, THE system SHALL include it in the active report list.

IF a report status is approved or dismissed, THE system SHALL exclude it from the active report list.

WHEN a moderator views their moderation history, THE system SHALL display all reports they have reviewed regardless of status.

## Moderator Actions

Community owners can add other users as moderators. Moderators can add additional moderators to the team. Only the owner can remove moderators from their community. Moderators can delete any post within their community. Moderators can delete any comment within their community. Moderators can view all reports submitted for their community. Moderators can approve or dismiss reports as needed. Moderator actions are logged for accountability. Moderators cannot remove the community owner. Moderator permissions are limited to their assigned communities.

### Moderator Appointment

WHEN a community owner adds a user as a moderator, THE system SHALL:
1. Require the owner to specify the user to be appointed
2. Verify the user exists and is not already a moderator
3. Assign the moderator role to the specified user
4. Grant the user moderator permissions for that community
5. Record the appointment in the moderation log

WHEN a moderator adds another user as a moderator, THE system SHALL:
1. Require the moderator to specify the user to be appointed
2. Verify the user exists and is not already a moderator
3. Assign the moderator role to the specified user
4. Grant the user moderator permissions for that community
5. Record the appointment in the moderation log

IF the specified user does not exist, THEN THE system SHALL reject the appointment request.
IF the specified user is already a moderator, THEN THE system SHALL reject the appointment request.
IF the specified user is the community owner, THEN THE system SHALL reject the appointment request.

### Moderator Removal

WHEN a community owner removes a moderator, THE system SHALL:
1. Require the owner to specify the moderator to be removed
2. Verify the specified user is currently a moderator
3. Remove the moderator role from the specified user
4. Revoke all moderator permissions for that community
5. Record the removal in the moderation log

IF the specified user is not a moderator, THEN THE system SHALL reject the removal request.
IF the specified user is the community owner, THEN THE system SHALL reject the removal request.

WHEN a moderator attempts to remove another moderator, THE system SHALL:
1. Reject the removal request
2. Inform the moderator that only the owner can remove moderators

### Post Deletion Authority

WHEN a moderator deletes a post in their community, THE system SHALL:
1. Remove the post from the community feed
2. Remove the post from all user feeds
3. Delete all comments on the post
4. Adjust karma scores for affected users
5. Record the deletion in the moderation log

WHEN a moderator deletes a post, THE system SHALL:
1. Verify the post belongs to the moderator's community
2. Verify the moderator has deletion authority
3. Permanently remove the post content
4. Notify the post author of the deletion

IF the post does not belong to the moderator's community, THEN THE system SHALL reject the deletion request.
IF the post has already been deleted, THEN THE system SHALL reject the deletion request.

### Comment Deletion Authority

WHEN a moderator deletes a comment in their community, THE system SHALL:
1. Remove the comment from the post
2. Delete all replies to the comment
3. Adjust karma scores for affected users
4. Record the deletion in the moderation log

WHEN a moderator deletes a comment, THE system SHALL:
1. Verify the comment belongs to a post in the moderator's community
2. Verify the moderator has deletion authority
3. Permanently remove the comment content
4. Notify the comment author of the deletion

IF the comment does not belong to the moderator's community, THEN THE system SHALL reject the deletion request.
IF the comment has already been deleted, THEN THE system SHALL reject the deletion request.

### Report Management

WHEN a moderator views reports for their community, THE system SHALL:
1. Display all pending reports for that community
2. Show the reported content (post or comment)
3. Show who reported the content
4. Show the reason provided for the report
5. Show when the report was submitted

WHEN a moderator approves a report, THE system SHALL:
1. Delete the reported content
2. Mark the report as approved
3. Remove the report from the pending list
4. Adjust karma scores for affected users
5. Record the approval in the moderation log

WHEN a moderator dismisses a report, THE system SHALL:
1. Keep the reported content active
2. Mark the report as dismissed
3. Remove the report from the pending list
4. Record the dismissal in the moderation log

IF the report has already been processed, THEN THE system SHALL reject the action request.
IF the reported content does not belong to the moderator's community, THEN THE system SHALL reject the action request.

### Moderator Permissions

WHEN a moderator performs actions in their community, THE system SHALL:
1. Verify the moderator is assigned to that community
2. Allow the moderator to delete posts in that community
3. Allow the moderator to delete comments in that community
4. Allow the moderator to view and process reports for that community
5. Allow the moderator to ban users from that community
6. Allow the moderator to unban users from that community
7. Allow the moderator to add other moderators to that community

WHEN a moderator attempts actions outside their community, THE system SHALL:
1. Reject the action request
2. Inform the moderator they lack permission for that community

Moderators cannot remove the community owner.
Moderators cannot remove other moderators.
Moderators cannot change community settings.
Moderators cannot delete the community itself.

### Community Ownership

WHEN a user creates a community, THE system SHALL:
1. Assign the creator as the community owner
2. Grant the owner full administrative authority
3. Allow the owner to add moderators
4. Allow the owner to remove moderators
5. Allow the owner to delete any content in the community
6. Allow the owner to ban any user from the community
7. Allow the owner to change community settings
8. Allow the owner to delete the community

WHEN the community owner is deleted, THE system SHALL:
1. Transfer ownership to another moderator if available
2. Or mark the community as orphaned if no moderators exist

The community owner cannot be removed as owner by any other user.
The community owner has authority over all moderator actions.
The community owner can override any moderator decision.

### Moderation Logging

WHEN a moderator performs any action, THE system SHALL:
1. Record the action type (appointment, removal, deletion, ban, etc.)
2. Record the moderator who performed the action
3. Record the target of the action (user, post, comment, report)
4. Record the timestamp of the action
5. Store the log entry for accountability

WHEN a moderator views the moderation log, THE system SHALL:
1. Display all actions performed in the community
2. Show which moderator performed each action
3. Show what was affected by each action
4. Show when each action occurred
5. Filter actions by moderator if requested

The moderation log is permanent and cannot be deleted.
The moderation log is visible to all current and former moderators.
The moderation log includes both successful and rejected actions.

## Ban Actions

Moderators can ban users from their communities. Banned users cannot create posts in the banned community. Banned users cannot write comments in the banned community. Banned users can still view community content. Moderators can unban users to restore their posting privileges. Banned user lists are visible to moderators. Ban actions include optional reason text. Ban timestamps are recorded for tracking. Unbanning removes the ban restriction immediately. Ban status is tracked per user and community.

### User Banning

WHEN a moderator bans a user from a community, THE system SHALL prevent that user from creating posts in that community.

WHEN a moderator bans a user from a community, THE system SHALL prevent that user from writing comments in that community.

WHEN a moderator bans a user from a community, THE system SHALL allow that user to continue viewing community content.

WHEN a moderator bans a user from a community, THE system SHALL immediately apply the ban restriction.

WHEN a moderator bans a user from a community, THE system SHALL record the ban action for tracking purposes.

IF a user is already banned from a community, THEN THE system SHALL handle the duplicate ban request according to business rules.

WHEN an owner bans a user from their community, THE system SHALL apply the ban with owner authority.

WHEN a moderator attempts to ban the community owner, THEN THE system SHALL prevent this action.

WHEN a moderator attempts to ban another moderator, THEN THE system SHALL prevent this action.

WHEN a moderator bans a user, THE system SHALL associate the ban with the specific community.

WHEN a user is banned from a community, THE system SHALL maintain the ban until a moderator or owner unbans them.

### User Unbanning

WHEN a moderator unbans a user from a community, THE system SHALL restore that user's ability to create posts in that community.

WHEN a moderator unbans a user from a community, THE system SHALL restore that user's ability to write comments in that community.

WHEN a moderator unbans a user from a community, THE system SHALL immediately remove the ban restriction.

WHEN a moderator unbans a user from a community, THE system SHALL record the unban action for tracking purposes.

WHEN an owner unbans a user from their community, THE system SHALL apply the unban with owner authority.

IF a user is not currently banned from a community, THEN THE system SHALL handle the unban request according to business rules.

WHEN a user is unbanned, THE system SHALL update the ban status to reflect the removal.

WHEN a moderator unbans a user, THE system SHALL maintain the user's existing posts and comments in that community.

WHEN a user is unbanned, THE system SHALL allow immediate participation without additional approval.

WHEN an owner unbans a user, THE system SHALL remove the ban regardless of who originally imposed it.

### Ban Reason Recording

WHEN a moderator bans a user, THE system SHALL allow the moderator to provide an optional reason for the ban.

WHEN a moderator bans a user with a reason, THE system SHALL store the reason text for reference.

WHEN a moderator bans a user without a reason, THE system SHALL record the ban with an empty reason.

WHEN a moderator views a banned user's record, THE system SHALL display the ban reason if one was provided.

WHEN a moderator unbans a user, THE system SHALL preserve the original ban reason in the ban history.

IF a moderator provides a ban reason, THEN THE system SHALL store it as text for future reference.

WHEN a ban reason is recorded, THE system SHALL associate it with the specific ban action.

WHEN a moderator views the banned user list, THE system SHALL show ban reasons alongside each banned user.

WHEN a ban is recorded, THE system SHALL capture the reason provided at the time of banning.

WHEN a moderator updates a ban reason, THE system SHALL preserve the original reason for audit purposes.

### Ban List Viewing

WHEN a moderator views the banned user list, THE system SHALL display all users currently banned from that community.

WHEN a moderator views the banned user list, THE system SHALL show each banned user's username.

WHEN a moderator views the banned user list, THE system SHALL show when each user was banned.

WHEN a moderator views the banned user list, THE system SHALL show the ban reason for each banned user if provided.

WHEN a moderator views the banned user list, THE system SHALL indicate who imposed each ban.

WHEN a moderator views the banned user list, THE system SHALL allow filtering or searching through banned users.

WHEN an owner views the banned user list, THE system SHALL display all banned users with full details.

WHEN a moderator views the banned user list, THE system SHALL show only users banned from their moderated community.

WHEN a banned user list is viewed, THE system SHALL exclude users who have been unbanned.

WHEN a moderator views the banned user list, THE system SHALL provide an option to unban users directly from the list.

### Ban Restriction Enforcement

WHILE a user is banned from a community, THE system SHALL prevent that user from creating new posts in that community.

WHILE a user is banned from a community, THE system SHALL prevent that user from writing new comments in that community.

WHILE a user is banned from a community, THE system SHALL allow that user to view posts in that community.

WHILE a user is banned from a community, THE system SHALL allow that user to view comments in that community.

WHILE a user is banned from a community, THE system SHALL allow that user to view the community page.

WHILE a user is banned from a community, THE system SHALL allow that user to subscribe to the community.

WHILE a user is banned from a community, THE system SHALL allow that user to unsubscribe from the community.

WHILE a user is banned from a community, THE system SHALL allow that user to upvote posts in that community.

WHILE a user is banned from a community, THE system SHALL allow that user to downvote posts in that community.

WHILE a user is banned from a community, THE system SHALL allow that user to upvote comments in that community.

WHILE a user is banned from a community, THE system SHALL allow that user to downvote comments in that community.

WHILE a user is banned from a community, THE system SHALL display an appropriate message when the user attempts to create a post.

WHILE a user is banned from a community, THE system SHALL display an appropriate message when the user attempts to write a comment.

WHILE a user is banned from multiple communities, THE system SHALL enforce ban restrictions independently for each community.

WHILE a user is banned from a community, THE system SHALL maintain the user's existing posts in that community.

### Ban Timestamp Tracking

WHEN a user is banned from a community, THE system SHALL record the exact date and time of the ban.

WHEN a user is unbanned from a community, THE system SHALL record the exact date and time of the unban.

WHEN a moderator views a banned user's record, THE system SHALL display when the ban was imposed.

WHEN a moderator views the banned user list, THE system SHALL show ban timestamps for each banned user.

WHEN a ban is recorded, THE system SHALL store the timestamp in a consistent format.

WHEN a ban timestamp is recorded, THE system SHALL use the platform's standard time format.

WHEN a user is unbanned, THE system SHALL preserve the original ban timestamp for historical reference.

WHEN a moderator views ban history, THE system SHALL show both ban and unban timestamps.

WHEN a ban is imposed, THE system SHALL capture the timestamp at the moment of ban creation.

WHEN a moderator tracks ban duration, THE system SHALL provide both ban and unban timestamps for calculation.

### Ban Status Management

THE system SHALL maintain a ban status for each user-community pair.

THE system SHALL track whether a user is currently banned or unbanned from each community.

THE system SHALL update ban status immediately when a ban is imposed.

THE system SHALL update ban status immediately when a ban is removed.

THE system SHALL reflect ban status in all relevant user actions and permissions.

THE system SHALL allow a user to be banned from one community while remaining active in others.

THE system SHALL allow a user to be unbanned from one community while remaining banned in others.

THE system SHALL maintain ban status independently for each community.

THE system SHALL check ban status before allowing post creation in a community.

THE system SHALL check ban status before allowing comment creation in a community.

THE system SHALL update ban status when a moderator or owner performs ban or unban actions.

THE system SHALL preserve ban status across user sessions and platform restarts.

THE system SHALL provide accurate ban status information to moderators viewing the banned user list.

### Community-Specific Bans

THE system SHALL enforce bans on a per-community basis.

THE system SHALL allow a user to be banned from one community while remaining active in all other communities.

THE system SHALL allow a user to be banned from multiple communities independently.

THE system SHALL track ban status separately for each community.

THE system SHALL enforce ban restrictions only within the community where the ban was imposed.

THE system SHALL allow a banned user to create posts in communities where they are not banned.

THE system SHALL allow a banned user to write comments in communities where they are not banned.

THE system SHALL allow a banned user to view content in all communities including the one where they are banned.

THE system SHALL allow a moderator to ban a user from their community without affecting other communities.

THE system SHALL allow an owner to ban a user from their community without affecting other communities.

WHEN a user is banned from a community, THE system SHALL not automatically ban them from related or sister communities.

WHEN a user is unbanned from a community, THE system SHALL not affect their ban status in other communities.

THE system SHALL maintain separate ban records for each user-community combination.

THE system SHALL allow the same user to have different ban statuses across different communities.

## Block Actions

The platform supports user blocking functionality. Users can block other users to prevent interactions. Blocking prevents blocked users from certain platform features. Block timestamps are recorded when users block each other. Blocking is tracked between user pairs. The blocking feature helps users manage unwanted interactions. Blocked users cannot interact with the blocking user's content. Block status is maintained in the system. Users can manage their block lists through settings. Blocking provides user control over platform experience.

### User Blocking Actions

WHEN a user blocks another user, THE system SHALL:
1. Record the block with a timestamp
2. Prevent the blocked user from viewing the blocking user's posts
3. Prevent the blocked user from viewing the blocking user's comments
4. Prevent the blocked user from voting on the blocking user's content
5. Prevent the blocked user from commenting on the blocking user's posts
6. Hide the blocking user's content from the blocked user's feeds

WHEN a user unblocks another user, THE system SHALL:
1. Remove the block relationship
2. Restore the blocked user's ability to view the unblocking user's content
3. Restore the blocked user's ability to interact with the unblocking user's content

IF a user attempts to block themselves, THE system SHALL reject the request.

IF a user attempts to block a user they have already blocked, THE system SHALL reject the request.

IF a user attempts to unblock a user they have not blocked, THE system SHALL reject the request.

### Block List Management

WHEN a user views their block list, THE system SHALL:
1. Display all users they have blocked
2. Show the timestamp when each block was created
3. Allow the user to unblock any user from the list

WHEN a user manages their block list, THE system SHALL:
1. Allow bulk unblocking of multiple users
2. Provide search functionality to find blocked users
3. Display the total count of blocked users

THE system SHALL maintain block status for each user pair.

THE system SHALL track when blocks are created and removed.

### Interaction Prevention

WHEN a user is blocked by another user, THE system SHALL:
1. Prevent the blocked user from seeing the blocking user's posts in any feed
2. Prevent the blocked user from seeing the blocking user's comments on posts
3. Prevent the blocked user from voting on the blocking user's content
4. Prevent the blocked user from replying to the blocking user's comments
5. Prevent the blocked user from viewing the blocking user's profile

WHILE a block relationship exists between two users, THE system SHALL:
1. Hide all content from the blocking user from the blocked user's view
2. Prevent any interaction between the blocked user and the blocking user's content
3. Maintain the block status until explicitly removed

THE system SHALL prevent blocked users from interacting with the blocking user's posts and comments.

### Block Status and Timestamps

WHEN a block is created, THE system SHALL:
1. Record the exact timestamp of the block
2. Store the block status as active
3. Associate the block with both users involved

WHEN a block is removed, THE system SHALL:
1. Update the block status to inactive
2. Remove the block from the block list
3. Restore normal interaction capabilities between users

THE system SHALL track block status for all user pairs.

THE system SHALL maintain block timestamps for audit purposes.

THE system SHALL provide users control over who they interact with on the platform.

# Error Scenarios and Edge Cases

Business-level error scenarios, edge case coverage, and expected system behaviors for exceptional conditions.

## User Error Scenarios

Users cannot register with an email address that already exists in the system. Duplicate username attempts during registration are rejected with a clear error message. Passwords that fail to meet security requirements are not accepted during account creation. Login attempts with incorrect credentials are denied and may be rate-limited after repeated failures. Users cannot delete their account if they have pending reports that require their response. Email verification links that have expired cannot be used to activate accounts. Users attempting to verify with an already verified email receive an appropriate error message. Account recovery attempts require proper ownership verification before password reset is allowed. Users cannot change their password while logged out of their account. Profile updates with invalid character combinations in display names are rejected.

### Duplicate Email Registration

WHEN a user attempts to register with an email address that already exists in the system, THE system SHALL reject the registration request.

IF the email address provided during registration matches an existing user account, THEN THE system SHALL display an error message indicating the email is already in use.

WHEN a duplicate email registration is detected, THE system SHALL prevent the creation of a new user account.

IF a user tries to register with an email that belongs to another account, THEN THE system SHALL not send a new verification email to that address.

WHEN the system detects duplicate email during registration, THE system SHALL allow the user to either log in with existing credentials or choose a different email address.

### Username Already Taken

WHEN a user attempts to register with a username that is already taken, THE system SHALL reject the registration request.

IF the chosen username matches an existing user's username, THEN THE system SHALL display an error message indicating the username is unavailable.

WHEN a username availability check fails during registration, THE system SHALL require the user to select a different username.

IF a user tries to register with a username that was previously deleted, THEN THE system SHALL prevent reuse of that username.

WHEN duplicate username is detected, THE system SHALL suggest alternative usernames or allow the user to modify their choice.

### Password Security Requirements

WHEN a user submits a password during registration that fails to meet security requirements, THE system SHALL reject the account creation.

IF the password length is insufficient, THEN THE system SHALL display an error message indicating the minimum length requirement.

WHEN a password lacks required character types, THE system SHALL inform the user of specific requirements not met.

IF a user attempts to use a password that is too simple or commonly used, THEN THE system SHALL require a stronger password.

WHEN password validation fails during registration, THE system SHALL allow the user to retry with a different password.

IF the password confirmation does not match the original password, THEN THE system SHALL reject the registration and prompt for correction.

### Login Credential Failures

WHEN a user attempts to log in with incorrect credentials, THE system SHALL deny access to the account.

IF the email address does not exist in the system, THEN THE system SHALL display a generic error message without revealing account existence.

WHEN the password entered does not match the stored password, THEN THE system SHALL reject the login attempt.

IF a user makes multiple failed login attempts in a short period, THEN THE system SHALL implement rate limiting to prevent brute force attacks.

WHEN login credential failures exceed the threshold, THE system SHALL temporarily lock the account or require additional verification.

IF the account is locked due to failed attempts, THEN THE system SHALL provide instructions for account recovery.

### Account Deletion Restrictions

WHEN a user attempts to delete their account while having pending reports that require their response, THE system SHALL prevent account deletion.

IF the user is involved in an active report as the reporter, THEN THE system SHALL require the report to be resolved before allowing deletion.

WHEN account deletion is requested with unresolved moderation actions, THE system SHALL display a message explaining the restriction.

IF a user has pending reports against their content, THEN THE system SHALL allow deletion only after reports are processed.

WHEN account deletion is blocked due to pending reports, THE system SHALL provide the user with information about the pending items.

IF all pending reports are resolved, THEN THE system SHALL allow the user to proceed with account deletion.

### Expired Verification Links

WHEN a user attempts to verify their email with an expired verification link, THE system SHALL reject the verification attempt.

IF the verification link has exceeded its validity period, THEN THE system SHALL display an error message indicating the link has expired.

WHEN an expired verification link is detected, THE system SHALL offer to send a new verification email.

IF a user clicks an old verification link after already verifying their email, THEN THE system SHALL inform them that the link is no longer valid.

WHEN email verification fails due to expiration, THE system SHALL provide clear instructions for obtaining a new verification link.

### Already Verified Email

WHEN a user attempts to verify an email address that is already verified, THE system SHALL display an appropriate error message.

IF the verification link is used after the email is already confirmed, THEN THE system SHALL inform the user that verification is complete.

WHEN duplicate verification is attempted, THE system SHALL not create duplicate verification records.

IF a user clicks a verification link multiple times, THEN THE system SHALL process only the first successful verification.

WHEN an already verified email receives a new verification attempt, THE system SHALL acknowledge the existing verified status.

### Account Ownership Verification

WHEN a user attempts to recover their account without proper ownership verification, THE system SHALL deny the password reset request.

IF the account recovery attempt cannot verify the user's identity, THEN THE system SHALL require additional verification steps.

WHEN password reset is requested, THE system SHALL verify ownership through email confirmation or other authentication methods.

IF the recovery email does not match the registered email, THEN THE system SHALL reject the password reset attempt.

WHEN account ownership cannot be verified, THE system SHALL provide alternative recovery options or contact support instructions.

IF multiple failed recovery attempts occur, THEN THE system SHALL implement additional security measures to protect the account.

### Logged Out Password Changes

WHEN a user attempts to change their password while logged out of their account, THE system SHALL reject the password change request.

IF the user is not authenticated, THEN THE system SHALL require login before allowing password modification.

WHEN password change is attempted without valid session, THE system SHALL redirect the user to the login page.

IF a logged out user tries to access password settings, THEN THE system SHALL display an authentication requirement message.

WHEN the user is authenticated, THE system SHALL allow password changes with proper verification of the current password.

### Invalid Display Name Characters

WHEN a user attempts to update their display name with invalid character combinations, THE system SHALL reject the profile update.

IF the display name contains prohibited special characters, THEN THE system SHALL display an error message indicating invalid characters.

WHEN display name validation fails due to character restrictions, THE system SHALL inform the user of acceptable character types.

IF a user tries to use reserved words or system terms in their display name, THEN THE system SHALL prevent the update.

WHEN invalid characters are detected in display name, THE system SHALL allow the user to modify their choice before saving.

IF the display name length exceeds limits, THEN THE system SHALL reject the update and indicate the maximum allowed length.

## Community Error Scenarios

Community names must be unique across the entire platform and cannot duplicate existing community names. Users cannot create a community with a name that matches reserved system terms. Community descriptions exceeding the maximum length are truncated or rejected during creation. Users cannot delete a community that has active subscribers without warning. Community icon uploads that fail validation cannot be set as the community icon. Users cannot subscribe to a community they have already joined. Unsubscribing from a community that does not exist returns an appropriate error message. Community searches with empty or invalid query strings return no results. Users cannot view communities that have been deleted from the system. Community owner transfer requires both parties to confirm the action.

### Duplicate Community Name Handling

IF a user attempts to create a community with a name that already exists, THE system SHALL reject the creation request.

IF a community name matches an existing community name exactly (case-insensitive), THE system SHALL indicate the name is unavailable.

WHEN a user submits a duplicate community name, THE system SHALL display an error message stating the name is already in use.

IF two users attempt to create communities with the same name simultaneously, THE system SHALL allow only one creation and reject the other.

THE system SHALL maintain a global index of all community names to prevent duplicates across the platform.

WHEN checking for duplicate community names, THE system SHALL compare against both active and recently deleted communities.

IF a community name is modified to match an existing community name, THE system SHALL reject the modification.

### Reserved Community Names

IF a user attempts to create a community with a reserved system term as the name, THE system SHALL reject the creation request.

IF a community name matches a reserved keyword such as "admin", "moderator", "system", "official", or "redditClone", THE system SHALL prevent the creation.

WHEN a user enters a reserved term as a community name, THE system SHALL display a message indicating the name is not allowed.

THE system SHALL maintain a list of reserved community names that cannot be used by any user.

IF a user attempts to rename an existing community to a reserved term, THE system SHALL reject the rename operation.

WHEN validating community names, THE system SHALL check against the reserved terms list before allowing creation.

### Community Description Validation

IF a community description exceeds the maximum allowed length, THE system SHALL reject the community creation.

IF a community description is longer than 500 characters, THE system SHALL truncate or reject the input.

WHEN a user provides an empty description for a community, THE system SHALL allow the creation with an empty description.

IF a community description contains only whitespace, THE system SHALL treat it as empty and allow creation.

THE system SHALL display the character count as the user types the community description.

WHEN editing a community description, THE system SHALL enforce the same length limits as during creation.

IF a user attempts to paste content exceeding the description limit, THE system SHALL truncate to the maximum allowed length.

### Community Deletion with Subscribers

IF a community owner attempts to delete a community with active subscribers, THE system SHALL display a warning before proceeding.

IF a community has one or more subscribers, THE system SHALL require confirmation before allowing deletion.

WHEN a community with subscribers is deleted, THE system SHALL notify all subscribers that the community no longer exists.

IF a user attempts to delete a community without confirming the subscriber impact, THE system SHALL prevent the deletion.

THE system SHALL display the current subscriber count when a deletion warning is shown.

WHEN a community is deleted with subscribers, THE system SHALL automatically remove all subscription records for that community.

IF a subscriber attempts to access a deleted community, THE system SHALL redirect them to the community search page.

### Community Icon Upload Validation

IF a user uploads an invalid image format for a community icon, THE system SHALL reject the upload.

IF a community icon file exceeds the maximum allowed file size, THE system SHALL reject the upload.

WHEN a user attempts to set a non-image file as a community icon, THE system SHALL display an error message.

IF a community icon upload fails due to corruption or incomplete transfer, THE system SHALL allow the user to retry.

THE system SHALL accept only standard image formats (JPEG, PNG, GIF) for community icons.

WHEN a community icon cannot be processed, THE system SHALL display a generic placeholder icon.

IF a user attempts to change a community icon with an invalid file, THE system SHALL reject the change and retain the existing icon.

### Subscription Deduplication

IF a user attempts to subscribe to a community they are already subscribed to, THE system SHALL ignore the duplicate subscription request.

IF a user clicks subscribe multiple times on the same community, THE system SHALL process only the first subscription.

WHEN a user tries to subscribe to an already joined community, THE system SHALL display a message indicating they are already subscribed.

THE system SHALL prevent duplicate subscription records for the same user-community pair.

IF a duplicate subscription attempt is detected, THE system SHALL not increment the subscriber count.

WHEN checking subscription status, THE system SHALL verify existing subscriptions before creating new ones.

### Unsubscribe from Non-Existent Community

IF a user attempts to unsubscribe from a community that does not exist, THE system SHALL display an error message.

IF a user tries to unsubscribe from a deleted community, THE system SHALL indicate the community is no longer available.

WHEN an unsubscribe request targets a non-existent community ID, THE system SHALL reject the operation.

IF a user clicks unsubscribe on a community that has been removed, THE system SHALL redirect them to the community list.

THE system SHALL validate community existence before processing any unsubscribe request.

WHEN a community is deleted, THE system SHALL automatically remove all subscription records for that community.

### Community Search Query Validation

IF a user submits an empty search query for communities, THE system SHALL return no results.

IF a user searches for communities with only whitespace, THE system SHALL treat it as an empty query.

WHEN a user enters a search query with fewer than the minimum required characters, THE system SHALL not perform the search.

IF a community search query contains only special characters, THE system SHALL return no results.

THE system SHALL display a message indicating no communities match the search criteria for empty queries.

WHEN a user clears their search query, THE system SHALL reset the search results to the default community list.

### Deleted Community Access

IF a user attempts to view a community that has been deleted, THE system SHALL display a message that the community no longer exists.

IF a user clicks a link to a deleted community, THE system SHALL redirect them to the community search page.

WHEN a deleted community URL is accessed, THE system SHALL not display any community content.

IF a subscriber attempts to access their subscription list containing a deleted community, THE system SHALL exclude the deleted community.

THE system SHALL remove all references to deleted communities from user subscription lists.

WHEN a community is deleted, THE system SHALL make the community name available for future use after a retention period.

### Community Ownership Transfer

IF a community owner initiates an ownership transfer, THE system SHALL require confirmation from the current owner.

IF a community ownership transfer is initiated, THE system SHALL require confirmation from the new owner.

WHEN both parties confirm the ownership transfer, THE system SHALL complete the transfer and update the community owner.

IF either party does not confirm the ownership transfer within the specified time, THE system SHALL cancel the transfer request.

THE system SHALL notify both the current owner and the new owner when a transfer is initiated.

IF a user attempts to transfer ownership to themselves, THE system SHALL reject the transfer.

WHEN ownership is transferred, THE system SHALL update all moderator permissions and ownership records.

## Post Error Scenarios

Users cannot create posts in communities they are not subscribed to. Posts with empty or missing titles are rejected during submission. Text posts without content body cannot be created successfully. Link posts with invalid or unreachable URLs are flagged or rejected. Image posts with unsupported file formats cannot be uploaded. Users cannot edit posts that were created by other users. Deleting a post removes all associated comments and votes permanently. Users cannot vote on posts from communities where they are banned. Posts in deleted communities become inaccessible to all users. Editing a post after it has been reported may trigger additional review.

### Post Creation Error Scenarios

WHEN a user attempts to create a post, THE system SHALL verify the user is subscribed to the target community.

IF the user is not subscribed to the community, THE system SHALL reject the post creation request.

WHEN a user submits a post without a title, THE system SHALL reject the request.

IF a text post is created without content body, THE system SHALL reject the request.

WHEN a user submits a link post with an invalid URL format, THE system SHALL reject the request.

WHEN a user uploads an image for an image post with an unsupported file format, THE system SHALL reject the upload.

IF a user tries to create a post in a community where they are banned, THE system SHALL reject the request.

WHEN a user attempts to create a post in a deleted community, THE system SHALL reject the request.

IF a user exceeds the maximum allowed post length, THE system SHALL reject the request.

WHEN a user tries to create a post in a community that no longer exists, THE system SHALL reject the request.

### Post Management Error Scenarios

WHEN a user attempts to edit a post they did not create, THE system SHALL reject the request.

IF a user attempts to edit a post that has been deleted, THE system SHALL reject the request.

WHEN a user deletes their own post, THE system SHALL permanently delete all associated comments.

WHEN a user deletes their own post, THE system SHALL permanently delete all votes on that post.

IF a post is deleted, THE system SHALL make the post inaccessible to all users.

WHEN a user tries to edit a post that belongs to another user, THE system SHALL reject the request.

IF a post has been reported, editing it may trigger additional review processes.

WHEN a user deletes a post with active comments, THE system SHALL delete all nested replies as well.

IF a user attempts to modify a post after it has been removed, THE system SHALL reject the request.

WHEN a user tries to edit a post in a community where they have been banned, THE system SHALL reject the request.

### Post Interaction Error Scenarios

WHEN a user attempts to vote on a post in a community where they are banned, THE system SHALL reject the vote.

IF a user is banned from a community, THE system SHALL prevent them from voting on any content in that community.

WHEN a user tries to vote on a post from a deleted community, THE system SHALL reject the request.

IF a user attempts to vote multiple times on the same post, THE system SHALL only allow one active vote per user.

WHEN a user tries to view a post from a deleted community, THE system SHALL return an error.

IF a post has been deleted, THE system SHALL prevent any further voting actions.

WHEN a user attempts to edit a post that has been reported, THE system SHALL log this action for moderator review.

IF a user tries to interact with content in a community where they are banned, THE system SHALL block the action.

WHEN a user attempts to access a post from a community that has been deleted, THE system SHALL reject the request.

IF a user tries to view content they have been banned from, THE system SHALL restrict access appropriately.

## Comment Error Scenarios

Users cannot comment on posts that have been deleted by moderators or authors. Comments with empty content are rejected during submission. Users cannot reply to comments that no longer exist in the system. Editing comments after they have been reported may trigger additional review. Users cannot delete comments that were written by other users. Comments on posts from banned communities are not accessible to banned users. Reply chains that exceed system depth limits are truncated or rejected. Users cannot edit comments after they have been deleted by moderators. Comment content exceeding maximum length is truncated or rejected.

### Commenting on Deleted Posts

WHEN a user attempts to comment on a post that has been deleted, THE system SHALL reject the comment submission.

IF the post no longer exists in the system, THEN THE system SHALL prevent any new comment creation for that post.

IF a user navigates directly to a deleted post's comment section, THEN THE system SHALL display an appropriate error message indicating the post is unavailable.

WHEN a moderator deletes a post, THE system SHALL prevent all future comment submissions on that post.

IF a comment was already written on a post before deletion, THEN THE system SHALL make that comment inaccessible to all users.

### Empty Comment Content Validation

WHEN a user submits a comment, THE system SHALL require that the comment contains at least one character of content.

IF the comment content is empty or contains only whitespace, THEN THE system SHALL reject the submission.

IF the comment content contains only whitespace characters, THEN THE system SHALL treat it as empty and reject it.

WHEN a user attempts to reply to a comment with empty content, THEN THE system SHALL reject the reply submission.

IF a user tries to edit their comment to empty content, THEN THE system SHALL prevent the edit and maintain the original content.

### Replying to Non-Existent Comments

WHEN a user attempts to reply to a comment that has been deleted, THE system SHALL reject the reply submission.

IF the parent comment no longer exists in the system, THEN THE system SHALL prevent the reply from being created.

IF a user navigates to a reply form for a deleted comment, THEN THE system SHALL display an error indicating the comment is unavailable.

WHEN a moderator deletes a comment, THE system SHALL prevent any future replies to that comment.

IF a comment has replies that are subsequently deleted, THEN THE system SHALL maintain the remaining replies in the thread structure.

### Editing Reported Comments

WHEN a user attempts to edit a comment that has been reported, THE system SHALL allow the edit but flag it for moderator review.

IF a comment is under active investigation due to a report, THEN THE system SHALL notify moderators of any edit attempts.

WHEN a user edits a reported comment, THE system SHALL preserve the original content for moderator reference.

IF a comment has been approved for deletion by a moderator, THEN THE system SHALL prevent any further edits.

WHEN a moderator dismisses a report on a comment, THEN THE system SHALL allow normal editing by the comment author.

### Deleting Comments by Others

WHEN a user attempts to delete a comment written by another user, THE system SHALL reject the deletion request.

IF a user does not own the comment, THEN THE system SHALL prevent deletion unless the user has moderator authority.

WHEN a moderator attempts to delete any comment in their community, THE system SHALL allow the deletion regardless of authorship.

IF a user tries to delete a comment through a direct URL, THEN THE system SHALL verify ownership before allowing deletion.

WHEN a comment is deleted by its author, THE system SHALL remove it from all views and threads.

### Commenting from Banned Users

WHEN a banned user attempts to comment in a community, THE system SHALL reject the comment submission.

IF a user is banned from a community, THEN THE system SHALL prevent all comment creation in that community.

WHEN a banned user attempts to reply to existing comments, THE system SHALL reject the reply submission.

IF a user is banned after commenting in a community, THEN THE system SHALL retain their existing comments but prevent new ones.

WHEN a moderator lifts a ban, THE system SHALL restore the user's ability to comment in that community.

### Reply Chain Depth Limits

WHEN a user attempts to create a reply chain that exceeds the maximum depth limit, THE system SHALL reject the reply submission.

IF a comment thread reaches the maximum nesting level, THEN THE system SHALL prevent further replies at that depth.

WHEN a user views deeply nested comments, THE system SHALL display them up to the configured depth limit.

IF a reply is deleted from the middle of a chain, THEN THE system SHALL maintain the remaining replies in the thread.

WHEN the system encounters an extremely deep reply chain, THE system SHALL handle it without performance degradation.

### Moderator-Deleted Comments

WHEN a moderator deletes a comment, THE system SHALL remove it from all views and threads.

IF a comment has replies when deleted by a moderator, THEN THE system SHALL also remove all nested replies.

WHEN a user attempts to view a moderator-deleted comment, THE system SHALL display it as unavailable.

IF a moderator deletes a comment that was reported, THEN THE system SHALL mark the report as approved.

WHEN a comment is deleted by a moderator, THE system SHALL adjust karma scores for all votes on that comment.

### Comment Content Length Limits

WHEN a user submits a comment exceeding the maximum character limit, THE system SHALL reject the submission.

IF the comment content is longer than allowed, THEN THE system SHALL display an error indicating the length restriction.

WHEN a user attempts to edit a comment to exceed the maximum length, THEN THE system SHALL reject the edit.

IF a comment is at the maximum length, THEN THE system SHALL prevent adding more characters.

WHEN the system receives a comment that exceeds the limit, THE system SHALL not truncate it automatically but reject it instead.

## Vote Error Scenarios

Users cannot vote multiple times on the same post or comment. Vote attempts on deleted content return appropriate error messages. Users cannot vote on content from communities where they are banned. Changing a vote from upvote to downvote adjusts karma accordingly. Removing a vote reverses the karma change from the original vote. Vote attempts by banned users in a community are silently ignored. Vote score calculations must account for vote removals and changes. Users cannot vote on their own posts or comments. Vote attempts on content from deleted communities fail gracefully.

### Multiple Vote Attempts

WHEN a user attempts to vote on a post they have already voted on, THE system SHALL reject the duplicate vote attempt.

WHEN a user attempts to vote on a comment they have already voted on, THE system SHALL reject the duplicate vote attempt.

IF a user has already upvoted a post and attempts to upvote again, THE system SHALL return an error indicating they have already voted.

IF a user has already downvoted a post and attempts to downvote again, THE system SHALL return an error indicating they have already voted.

IF a user has already upvoted a comment and attempts to upvote again, THE system SHALL return an error indicating they have already voted.

IF a user has already downvoted a comment and attempts to downvote again, THE system SHALL return an error indicating they have already voted.

WHEN a user attempts to vote multiple times in rapid succession on the same content, THE system SHALL process only the first valid vote and ignore subsequent attempts.

### Deleted Content Voting

WHEN a user attempts to vote on a deleted post, THE system SHALL reject the vote and return an error indicating the content does not exist.

WHEN a user attempts to vote on a deleted comment, THE system SHALL reject the vote and return an error indicating the content does not exist.

IF a post has been deleted by its author, THE system SHALL prevent any voting operations on that post.

IF a comment has been deleted by its author, THE system SHALL prevent any voting operations on that comment.

IF a post has been deleted by a moderator, THE system SHALL prevent any voting operations on that post.

IF a comment has been deleted by a moderator, THE system SHALL prevent any voting operations on that comment.

WHEN a user attempts to vote on content that no longer exists, THE system SHALL display a message indicating the content is unavailable.

### Banned Community Voting

WHEN a user is banned from a community, THE system SHALL prevent them from voting on posts in that community.

WHEN a user is banned from a community, THE system SHALL prevent them from voting on comments in that community.

IF a user attempts to upvote a post in a community where they are banned, THE system SHALL reject the vote.

IF a user attempts to downvote a post in a community where they are banned, THE system SHALL reject the vote.

IF a user attempts to upvote a comment in a community where they are banned, THE system SHALL reject the vote.

IF a user attempts to downvote a comment in a community where they are banned, THE system SHALL reject the vote.

WHEN a banned user attempts to vote in their banned community, THE system SHALL return an error indicating they do not have permission to vote.

### Vote Change Karma Adjustment

WHEN a user changes their vote from upvote to downvote on a post, THE system SHALL decrease the author's karma by 2.

WHEN a user changes their vote from downvote to upvote on a post, THE system SHALL increase the author's karma by 2.

WHEN a user changes their vote from upvote to downvote on a comment, THE system SHALL decrease the author's karma by 2.

WHEN a user changes their vote from downvote to upvote on a comment, THE system SHALL increase the author's karma by 2.

IF a user changes their vote on their own content, THE system SHALL not adjust karma.

WHEN a user changes their vote, THE system SHALL update the karma score immediately and reflect the change to the content author.

### Vote Removal Karma Reversal

WHEN a user removes their upvote from a post, THE system SHALL decrease the author's karma by 1.

WHEN a user removes their downvote from a post, THE system SHALL increase the author's karma by 1.

WHEN a user removes their upvote from a comment, THE system SHALL decrease the author's karma by 1.

WHEN a user removes their downvote from a comment, THE system SHALL increase the author's karma by 1.

IF a user removes a vote they previously cast, THE system SHALL reverse the karma impact of that vote.

WHEN a user removes their vote, THE system SHALL update the karma score immediately and reflect the change to the content author.

### Banned User Vote Attempts

WHEN a banned user attempts to vote on content in their banned community, THE system SHALL silently ignore the vote attempt.

IF a user is banned from a community and attempts to upvote content in that community, THE system SHALL not record the vote.

IF a user is banned from a community and attempts to downvote content in that community, THE system SHALL not record the vote.

WHEN a banned user attempts to change their vote in a banned community, THE system SHALL reject the operation.

WHEN a banned user attempts to remove their vote in a banned community, THE system SHALL reject the operation.

IF a user is banned after casting a vote, THE system SHALL remove their vote from the content.

### Vote Score Calculations

WHEN calculating a post's vote score, THE system SHALL subtract total downvotes from total upvotes.

WHEN calculating a comment's vote score, THE system SHALL subtract total downvotes from total upvotes.

IF a post has 10 upvotes and 3 downvotes, THE system SHALL display a score of 7.

IF a comment has 5 upvotes and 8 downvotes, THE system SHALL display a score of -3.

WHEN a vote is removed, THE system SHALL recalculate the vote score to reflect the removal.

WHEN a vote is changed from upvote to downvote, THE system SHALL recalculate the vote score to reflect the change.

WHEN a vote is changed from downvote to upvote, THE system SHALL recalculate the vote score to reflect the change.

IF all votes on a post are removed, THE system SHALL display a score of 0.

IF all votes on a comment are removed, THE system SHALL display a score of 0.

### Self-Vote Restrictions

WHEN a user attempts to vote on their own post, THE system SHALL reject the vote.

WHEN a user attempts to vote on their own comment, THE system SHALL reject the vote.

IF a user attempts to upvote their own post, THE system SHALL return an error indicating self-voting is not allowed.

IF a user attempts to downvote their own post, THE system SHALL return an error indicating self-voting is not allowed.

IF a user attempts to upvote their own comment, THE system SHALL return an error indicating self-voting is not allowed.

IF a user attempts to downvote their own comment, THE system SHALL return an error indicating self-voting is not allowed.

WHEN a user attempts to vote on content they authored, THE system SHALL display a message explaining self-voting restrictions.

### Deleted Community Voting

WHEN a user attempts to vote on a post in a deleted community, THE system SHALL reject the vote.

WHEN a user attempts to vote on a comment in a deleted community, THE system SHALL reject the vote.

IF a community has been deleted, THE system SHALL prevent any voting operations on posts within that community.

IF a community has been deleted, THE system SHALL prevent any voting operations on comments within that community.

WHEN a user attempts to vote on content from a deleted community, THE system SHALL return an error indicating the community no longer exists.

IF a post's community is deleted, THE system SHALL remove all votes on that post.

## Subscription Error Scenarios

Users cannot subscribe to communities that have been deleted from the system. Duplicate subscription attempts to the same community are handled gracefully. Users cannot unsubscribe from communities they are not subscribed to. Subscription attempts to communities with maximum subscriber limits are rejected. Users cannot view subscription lists for communities they are not subscribed to. Subscribing to a community requires the user to have an active account. Subscription status changes are reflected immediately across all feeds. Users cannot subscribe to communities where they are banned.

### Deleted Community Subscription Attempts

WHEN a user attempts to subscribe to a deleted community, THE system SHALL reject the subscription request.

IF the target community has been deleted from the system, THEN THE system SHALL prevent any new subscription attempts.

THE system SHALL display an appropriate error message when a user tries to subscribe to a non-existent community.

IF a user clicks a link to subscribe to a deleted community, THEN THE system SHALL inform the user that the community no longer exists.

THE system SHALL not allow users to view subscription options for deleted communities.

### Duplicate Subscription Handling

WHEN a user attempts to subscribe to a community they are already subscribed to, THE system SHALL handle the duplicate gracefully.

IF a duplicate subscription request is received, THEN THE system SHALL recognize the existing subscription.

THE system SHALL not create duplicate subscription records for the same user and community.

IF a user clicks the subscribe button while already subscribed, THEN THE system SHALL maintain the existing subscription status.

THE system SHALL provide feedback to the user indicating they are already subscribed to the community.

### Non-existent Unsubscribe Operations

WHEN a user attempts to unsubscribe from a community they are not subscribed to, THE system SHALL reject the request.

IF a user tries to unsubscribe from a community with no existing subscription, THEN THE system SHALL inform the user they are not subscribed.

THE system SHALL not create negative or invalid subscription states from unsubscribe attempts.

IF an unsubscribe request is made for a non-existent subscription, THEN THE system SHALL return an appropriate error message.

THE system SHALL maintain subscription list accuracy after failed unsubscribe attempts.

### Subscriber Limit Rejections

WHEN a user attempts to subscribe to a community that has reached its maximum subscriber limit, THE system SHALL reject the subscription.

IF a community has a defined subscriber capacity, THEN THE system SHALL prevent subscriptions once the limit is reached.

THE system SHALL inform users when a community has reached its maximum subscriber count.

IF the subscriber limit is reached, THEN THE system SHALL display a message indicating the community is full.

THE system SHALL not allow subscription requests to exceed the defined community capacity.

### Unsubscribed Feed Access

WHEN a user attempts to access a community feed without being subscribed, THE system SHALL determine appropriate access based on feed type.

IF a user is not subscribed to a community, THEN THE system SHALL allow viewing of the community feed for public access.

THE system SHALL restrict home feed access to subscribed communities only.

IF a user tries to view the home feed without any subscriptions, THEN THE system SHALL display an empty or guidance message.

THE system SHALL not show posts from unsubscribed communities in the home feed.

### Inactive Account Subscription Attempts

WHEN a user with an inactive account attempts to subscribe to a community, THE system SHALL reject the subscription.

IF a user's account is suspended or deactivated, THEN THE system SHALL prevent new subscription actions.

THE system SHALL require an active account status for all subscription operations.

IF an account becomes inactive after subscription, THEN THE system SHALL maintain the existing subscription but prevent new ones.

THE system SHALL inform users that account activation is required before subscribing to communities.

### Subscription Status Propagation

WHEN a user's subscription status changes, THE system SHALL propagate the change immediately across all relevant feeds.

IF a user subscribes to a community, THEN THE system SHALL include that community's posts in the home feed without delay.

THE system SHALL remove posts from unsubscribed communities from the home feed immediately after unsubscription.

IF a user subscribes to multiple communities, THEN THE system SHALL reflect all subscriptions in the home feed simultaneously.

THE system SHALL update the subscriber count display within the same session as the subscription change.

### Banned Community Subscription Attempts

WHEN a banned user attempts to subscribe to the community where they are banned, THE system SHALL reject the subscription.

IF a user is banned from a community, THEN THE system SHALL prevent them from subscribing to that community.

THE system SHALL not allow banned users to regain subscription status while the ban is active.

IF a user's ban is lifted, THEN THE system SHALL allow subscription attempts to the previously banned community.

THE system SHALL inform users that they cannot subscribe to communities where they are currently banned.

## Report Error Scenarios

Users cannot report their own posts or comments in the system. Reports on deleted content are automatically dismissed or ignored. Users must provide a valid reason when submitting a report. Reports without sufficient detail may be flagged for additional review. Moderators cannot approve reports on content that no longer exists. Dismissed reports are removed from the moderator queue permanently. Users cannot report content from communities where they are banned. Multiple reports on the same content are consolidated for moderator review. Report status changes require moderator authorization.

### Self-Content Reporting Restrictions

WHEN a user attempts to report their own post, THE system SHALL reject the request.

WHEN a user attempts to report their own comment, THE system SHALL reject the request.

IF a user tries to report content they authored, THE system SHALL display an appropriate error message.

WHEN a user views the report form for their own content, THE system SHALL hide the report option.

IF a user has moderator privileges, THE system SHALL still prevent them from reporting their own content.

### Deleted Content Report Handling

WHEN a user reports content that has already been deleted, THE system SHALL automatically dismiss the report.

WHEN a moderator reviews a report on deleted content, THE system SHALL show the report status as automatically dismissed.

IF a user attempts to report a post that no longer exists, THE system SHALL reject the report submission.

IF a user attempts to report a comment that no longer exists, THE system SHALL reject the report submission.

WHEN content is deleted after a report is submitted, THE system SHALL preserve the report for moderator review.

IF a report was submitted before content deletion, THE system SHALL retain the report in the queue for the original author's review.

### Empty Report Reason Validation

WHEN a user submits a report, THE system SHALL require a reason text.

IF the report reason field is empty, THE system SHALL reject the submission.

IF the report reason contains only whitespace, THE system SHALL reject the submission.

WHEN a user provides a report reason below the minimum length, THE system SHALL display a validation error.

IF a user attempts to submit multiple reports with identical empty reasons, THE system SHALL reject all submissions.

WHEN a moderator reviews a report with insufficient reason detail, THE system SHALL flag it for additional review.

### Insufficient Report Detail Handling

WHEN a user submits a report with minimal detail, THE system SHALL flag it for additional moderator review.

IF a report reason is below a minimum character threshold, THE system SHALL require additional context.

WHEN a moderator reviews a report, THE system SHALL display the full reason text provided by the reporter.

IF a report lacks sufficient detail for moderator action, THE system SHALL allow the moderator to request more information.

WHEN a report is flagged for insufficient detail, THE system SHALL prioritize it for moderator attention.

### Non-Existent Content Approval

WHEN a moderator attempts to approve a report on deleted content, THE system SHALL prevent the approval action.

IF a post or comment no longer exists, THE system SHALL automatically mark the report as dismissed.

WHEN content is deleted before moderator review, THE system SHALL update the report status to pending review.

IF a moderator tries to delete content through report approval and the content is already gone, THE system SHALL dismiss the report.

WHEN a report targets non-existent content, THE system SHALL remove it from the active moderation queue.

### Dismissed Report Removal

WHEN a moderator dismisses a report, THE system SHALL permanently remove it from the moderation queue.

IF a report is dismissed by a moderator, THE system SHALL archive the report for audit purposes.

WHEN a user views dismissed reports, THE system SHALL show the report was dismissed and when.

IF a report was dismissed in error, THE system SHALL prevent reactivation.

WHEN all reports on a piece of content are dismissed, THE system SHALL consider that content cleared of abuse.

### Banned Community Reporting

WHEN a user is banned from a community, THE system SHALL prevent them from reporting content in that community.

IF a banned user attempts to report a post in the community, THE system SHALL reject the report.

WHEN a user is active in the community, THE system SHALL allow them to report inappropriate content.

IF a user was banned after submitting a report, THE system SHALL preserve the report for moderator review.

WHEN a banned user views reported content, THE system SHALL still hide the report option.

### Duplicate Report Consolidation

WHEN multiple users report the same content, THE system SHALL consolidate all reports into a single moderation item.

IF the same user submits multiple reports on the same content, THE system SHALL ignore duplicate reports.

WHEN a moderator reviews consolidated reports, THE system SHALL show the total count of users who reported.

IF a report is a duplicate of an existing report, THE system SHALL reference the original report.

WHEN all reports on content are reviewed, THE system SHALL archive the consolidated report thread.

### Report Status Authorization

WHEN a report status changes, THE system SHALL require moderator authorization.

IF a user attempts to change a report status, THE system SHALL reject the request.

WHEN a moderator approves a report, THE system SHALL log the moderator's action.

IF a report status is changed without authorization, THE system SHALL trigger an audit alert.

WHEN a report moves from pending to approved, THE system SHALL notify the original reporter.

## Moderator Error Scenarios

Moderators cannot remove the community owner from their role. Moderators cannot remove other moderators from the community. Only the owner can add or remove moderator roles. Users cannot moderate communities where they are not assigned a moderator role. Moderator actions on deleted content return appropriate error messages. Moderators cannot ban users who are already banned from the community. Moderator role changes require owner confirmation for safety. Moderators cannot delete posts or comments from other communities. Moderator access to reports is limited to their assigned communities.

### Owner Removal Restrictions

IF a moderator attempts to remove the community owner from their role, THEN THE system SHALL reject the request.

IF a moderator attempts to transfer ownership to themselves, THEN THE system SHALL reject the request.

IF a moderator attempts to demote the owner to a regular moderator role, THEN THE system SHALL reject the request.

IF a moderator attempts to delete the owner's moderator status, THEN THE system SHALL reject the request.

IF the owner is the only moderator in the community, THEN THE system SHALL prevent any attempt to remove their role.

WHEN a moderator submits a request to remove the owner, THE system SHALL display an error message indicating insufficient permissions.

IF a moderator attempts to ban the community owner, THEN THE system SHALL reject the request.

IF a moderator attempts to delete content created by the owner without owner permission, THEN THE system SHALL reject the request.

IF a moderator attempts to restrict the owner's access to community features, THEN THE system SHALL reject the request.

IF the owner account is deleted, THEN THE system SHALL require another moderator to assume ownership before the community can continue.

### Moderator Removal Restrictions

IF a moderator attempts to remove another moderator from the community, THEN THE system SHALL reject the request.

IF a moderator attempts to demote another moderator to a regular member, THEN THE system SHALL reject the request.

IF a moderator attempts to change another moderator's permissions, THEN THE system SHALL reject the request.

IF a moderator attempts to ban another moderator from the community, THEN THE system SHALL reject the request.

IF a moderator attempts to delete content created by another moderator, THEN THE system SHALL reject the request.

WHEN a moderator submits a request to remove another moderator, THE system SHALL display an error message indicating only the owner can perform this action.

IF multiple moderators attempt to remove each other simultaneously, THEN THE system SHALL reject all removal requests.

IF a moderator attempts to remove themselves from their moderator role, THEN THE system SHALL reject the request.

IF a moderator attempts to transfer their moderator role to another user, THEN THE system SHALL reject the request.

IF a moderator attempts to modify another moderator's ban status, THEN THE system SHALL reject the request.

### Role Assignment Permissions

IF a non-moderator attempts to assign moderator roles to other users, THEN THE system SHALL reject the request.

IF a moderator attempts to assign the owner role to another user, THEN THE system SHALL reject the request.

IF a user who is not subscribed to the community attempts to be assigned a moderator role, THEN THE system SHALL reject the request.

IF a banned user attempts to be assigned a moderator role, THEN THE system SHALL reject the request.

IF a moderator attempts to assign moderator roles in a community where they are not a moderator, THEN THE system SHALL reject the request.

WHEN the owner assigns a moderator role, THE system SHALL record the assignment timestamp and the assigning owner.

IF a moderator attempts to assign moderator roles without owner authorization, THEN THE system SHALL reject the request.

IF a user attempts to self-assign a moderator role, THEN THE system SHALL reject the request.

IF a moderator attempts to assign multiple users as moderators in a single operation, THEN THE system SHALL process each assignment individually.

IF a moderator attempts to assign a moderator role to a user who already has that role, THEN THE system SHALL reject the request.

### Unauthorized Moderation Attempts

IF a user who is not a moderator attempts to delete a post in a community, THEN THE system SHALL reject the request.

IF a user who is not a moderator attempts to delete a comment in a community, THEN THE system SHALL reject the request.

IF a user who is not a moderator attempts to ban a user from a community, THEN THE system SHALL reject the request.

IF a user who is not a moderator attempts to view community reports, THEN THE system SHALL reject the request.

IF a user who is not a moderator attempts to approve or dismiss reports, THEN THE system SHALL reject the request.

WHEN a non-moderator attempts unauthorized moderation actions, THE system SHALL display an error message indicating insufficient permissions.

IF a moderator attempts to moderate content in a community where they do not have moderator status, THEN THE system SHALL reject the request.

IF a moderator's role is removed, THEN THE system SHALL immediately revoke their moderation permissions.

IF a moderator attempts to moderate while their session is expired, THEN THE system SHALL reject the request.

IF a moderator attempts to moderate after being banned from the community, THEN THE system SHALL reject the request.

### Deleted Content Moderation

IF a moderator attempts to delete a post that has already been deleted, THEN THE system SHALL reject the request.

IF a moderator attempts to delete a comment that has already been deleted, THEN THE system SHALL reject the request.

IF a moderator attempts to moderate content from a community that no longer exists, THEN THE system SHALL reject the request.

IF a moderator attempts to ban a user who has already deleted their account, THEN THE system SHALL reject the request.

IF a moderator attempts to approve a report for content that no longer exists, THEN THE system SHALL reject the request.

WHEN a moderator attempts to moderate deleted content, THE system SHALL display an error message indicating the content is no longer available.

IF a moderator attempts to view reports for deleted content, THEN THE system SHALL filter out those reports from the list.

IF a moderator attempts to unban a user from a community that has been deleted, THEN THE system SHALL reject the request.

IF a moderator attempts to delete content that was already deleted by another moderator, THEN THE system SHALL reject the request.

IF a moderator attempts to moderate content while it is in the process of being deleted, THEN THE system SHALL reject the request.

### Duplicate Ban Attempts

IF a moderator attempts to ban a user who is already banned from the community, THEN THE system SHALL reject the request.

IF a moderator attempts to ban a user with a duplicate ban reason, THEN THE system SHALL update the existing ban record.

IF a moderator attempts to unban a user who is not currently banned, THEN THE system SHALL reject the request.

IF a moderator attempts to modify a ban that was created by another moderator, THEN THE system SHALL reject the request.

IF a moderator attempts to ban a user who is the community owner, THEN THE system SHALL reject the request.

WHEN a moderator attempts to ban an already-banned user, THE system SHALL display an error message indicating the user is already banned.

IF a moderator attempts to ban a user multiple times with different reasons, THEN THE system SHALL retain the original ban record.

IF a moderator attempts to lift a ban that has already been lifted, THEN THE system SHALL reject the request.

IF a moderator attempts to ban a user who has already been unbanned, THEN THE system SHALL create a new ban record.

IF a moderator attempts to ban a user who is also a moderator, THEN THE system SHALL reject the request.

### Role Change Confirmation

IF a moderator attempts to remove another moderator without owner confirmation, THEN THE system SHALL reject the request.

IF a moderator attempts to transfer ownership without owner confirmation, THEN THE system SHALL reject the request.

IF the owner attempts to remove a moderator, THEN THE system SHALL require explicit confirmation.

IF the owner attempts to transfer ownership, THEN THE system SHALL require explicit confirmation.

IF a moderator role change is initiated, THEN THE system SHALL log the change with confirmation details.

WHEN a moderator role change requires confirmation, THE system SHALL present a confirmation dialog to the user.

IF the owner does not confirm a moderator role change within a specified time, THEN THE system SHALL cancel the pending change.

IF a moderator attempts to escalate their own role without owner confirmation, THEN THE system SHALL reject the request.

IF a moderator role change is attempted during a system maintenance window, THEN THE system SHALL queue the request for later processing.

IF a moderator role change conflicts with another pending change, THEN THE system SHALL reject the request.

### Cross-Community Moderation

IF a moderator attempts to delete a post from a community where they are not a moderator, THEN THE system SHALL reject the request.

IF a moderator attempts to delete a comment from a community where they are not a moderator, THEN THE system SHALL reject the request.

IF a moderator attempts to ban a user from a community where they are not a moderator, THEN THE system SHALL reject the request.

IF a moderator attempts to view reports from a community where they are not a moderator, THEN THE system SHALL reject the request.

IF a moderator attempts to approve reports from a community where they are not a moderator, THEN THE system SHALL reject the request.

WHEN a moderator attempts cross-community moderation, THE system SHALL display an error message indicating they only have authority in their assigned communities.

IF a moderator has roles in multiple communities, THEN THE system SHALL restrict their actions to only those communities.

IF a moderator attempts to moderate content in a community they are subscribed to but not moderating, THEN THE system SHALL reject the request.

IF a moderator attempts to view moderation statistics from a community where they are not a moderator, THEN THE system SHALL reject the request.

IF a moderator attempts to transfer their moderator role to another community, THEN THE system SHALL reject the request.

### Report Access Limitations

IF a moderator attempts to view reports from a community where they are not a moderator, THEN THE system SHALL reject the request.

IF a moderator attempts to approve reports from a community where they are not a moderator, THEN THE system SHALL reject the request.

IF a moderator attempts to dismiss reports from a community where they are not a moderator, THEN THE system SHALL reject the request.

IF a moderator attempts to view the full report history of a community where they are not a moderator, THEN THE system SHALL reject the request.

IF a moderator attempts to export report data from a community where they are not a moderator, THEN THE system SHALL reject the request.

WHEN a moderator accesses the report list, THE system SHALL filter reports to only show those from their assigned communities.

IF a moderator is removed from a community, THEN THE system SHALL immediately revoke their access to that community's reports.

IF a moderator attempts to view reports while their session is expired, THEN THE system SHALL reject the request.

IF a moderator attempts to view reports for a community that has been deleted, THEN THE system SHALL reject the request.

IF a moderator attempts to view reports they have already approved or dismissed, THEN THE system SHALL exclude them from the pending reports list.

## Ban Error Scenarios

Moderators cannot ban the community owner from their own community. Banning users who are already banned returns an appropriate message. Users cannot be banned from communities where they are moderators. Ban reasons exceeding maximum length are truncated during submission. Unbanning users who are not banned returns an error message. Banned users cannot create posts or comments in the banned community. Banned users can still view content in the banned community. Ban status changes are reflected immediately across the platform. Temporary bans expire automatically after the specified duration.

### Owner Ban Restrictions

IF a moderator attempts to ban the community owner, THE system SHALL reject the request and display an error message indicating that the owner cannot be banned.

WHEN the community owner attempts to ban themselves, THE system SHALL prevent the action and display an appropriate error message.

IF a user who is the only moderator attempts to ban themselves, THE system SHALL reject the request and require them to appoint another moderator first.

WHEN a moderator attempts to ban another moderator, THE system SHALL reject the request and indicate that only the owner can remove moderators.

IF the community owner is the only user with moderation privileges, THE system SHALL prevent them from banning themselves without first appointing a new moderator.

### Duplicate Ban Handling

IF a moderator attempts to ban a user who is already banned from the community, THE system SHALL reject the request and display a message indicating the user is already banned.

WHEN a duplicate ban request is submitted for the same user in the same community, THE system SHALL recognize the existing ban and prevent creation of a duplicate record.

IF a user is banned multiple times by different moderators before the system processes the first ban, THE system SHALL retain only one active ban record.

WHEN a moderator views the banned users list, THE system SHALL display each banned user only once, regardless of how many ban attempts were made.

IF a ban is attempted on a user with an existing pending ban, THE system SHALL update the existing ban record rather than creating a new one.

### Moderator Ban Restrictions

IF a moderator attempts to ban another moderator, THE system SHALL reject the request and indicate that moderators cannot ban each other.

WHEN a non-moderator user attempts to ban someone from a community, THE system SHALL reject the request and display a message indicating insufficient permissions.

IF a moderator from a different community attempts to ban a user from their community, THE system SHALL reject the request and indicate they lack authority in that community.

WHEN a user who was recently removed as a moderator attempts to ban someone, THE system SHALL reject the request and indicate they no longer have moderation privileges.

IF a moderator attempts to ban a user without providing a reason, THE system SHALL require a ban reason before proceeding.

### Ban Reason Length Limits

IF a moderator enters a ban reason exceeding the maximum allowed length, THE system SHALL truncate the reason to the maximum length before saving.

WHEN a ban reason is submitted, THE system SHALL accept reasons up to the defined maximum character limit.

IF a ban reason contains only whitespace characters, THE system SHALL reject the ban request and require a valid reason.

WHEN a moderator edits an existing ban reason, THE system SHALL apply the same length restrictions as the original ban.

IF the ban reason field is left empty during ban creation, THE system SHALL allow the ban to proceed with a default or empty reason as permitted by community settings.

### Non-Banned User Unban

IF a moderator attempts to unban a user who is not currently banned, THE system SHALL reject the request and display a message indicating the user is not banned.

WHEN a user is unbanned, THE system SHALL remove their ban record and restore their ability to participate in the community.

IF a moderator attempts to unban the community owner, THE system SHALL reject the request and indicate the owner cannot be banned.

WHEN an unban is performed on a user, THE system SHALL update their ban status immediately across all community views.

IF a user who was previously banned attempts to unban themselves, THE system SHALL reject the request and indicate only moderators can lift bans.

### Banned User Posting

IF a banned user attempts to create a post in the community where they are banned, THE system SHALL reject the request and display a message indicating they are banned from that community.

WHEN a banned user attempts to comment on any post in their banned community, THE system SHALL prevent the action and notify them of their ban status.

IF a banned user attempts to reply to an existing comment in the banned community, THE system SHALL reject the request and indicate they are banned.

WHEN a banned user tries to upvote or downvote content in their banned community, THE system SHALL prevent the voting action.

IF a banned user attempts to report content in the banned community, THE system SHALL reject the request and indicate they are banned from participating.

### Banned User Viewing

WHEN a banned user accesses a community where they are banned, THE system SHALL allow them to view posts and comments in that community.

IF a banned user navigates to a post in their banned community, THE system SHALL display the full post content and all associated comments.

WHEN a banned user searches for content within their banned community, THE system SHALL include results from that community in their search results.

IF a banned user views another user's profile, THE system SHALL display posts and comments from the banned community as part of that user's activity history.

WHEN a banned user accesses the community feed, THE system SHALL display all posts from that community without restriction.

### Ban Status Propagation

WHEN a user is banned from a community, THE system SHALL update their ban status immediately across all platform interfaces.

IF a banned user logs in from a different device or browser, THE system SHALL enforce their ban status on the new session.

WHEN a ban is lifted, THE system SHALL update the user's status immediately and restore their participation privileges.

IF a moderator views the banned users list after a new ban is issued, THE system SHALL display the newly banned user without requiring a page refresh.

WHEN a user's ban status changes, THE system SHALL ensure all cached data reflecting their previous status is invalidated.

### Temporary Ban Expiration

WHEN a temporary ban reaches its expiration date, THE system SHALL automatically lift the ban and restore the user's participation privileges.

IF a temporary ban is set with an expiration date, THE system SHALL track the expiration and automatically remove the ban at the specified time.

WHEN a user's temporary ban expires, THE system SHALL update their status from banned to active without requiring moderator intervention.

IF a moderator views the banned users list after a temporary ban expires, THE system SHALL no longer display that user in the list.

WHEN a temporary ban is about to expire, THE system SHALL ensure the ban remains active until the exact expiration moment.

## Block Error Scenarios

Users cannot block themselves from viewing their own content. Blocking users who are already blocked returns an appropriate message. Blocked users cannot see each others posts in their feeds. Blocked users can still view each others public profiles. Blocking does not prevent users from commenting on shared posts. Users cannot block community moderators from their communities. Block status changes are reflected immediately in feed displays. Blocked user content may still appear in search results. Unblocking users restores normal feed visibility.

### Self-Block Restrictions

IF a user attempts to block themselves, THE system SHALL reject the request.

WHEN a user tries to block their own account, THE system SHALL display an appropriate error message.

IF a user attempts to block themselves through the block list interface, THE system SHALL prevent the action.

THE system SHALL validate that the target user is different from the requesting user before processing any block request.

WHEN a self-block attempt is detected, THE system SHALL not create a Block record.

### Duplicate Block Handling

WHEN a user attempts to block a user they have already blocked, THE system SHALL return an appropriate message indicating the user is already blocked.

IF a duplicate block request is submitted, THE system SHALL not create a new Block record.

THE system SHALL maintain only one active Block record per user-community pair.

WHEN a duplicate block is detected, THE system SHALL not update the blockedAt timestamp.

IF a user tries to block the same user multiple times in rapid succession, THE system SHALL process only the first request and ignore subsequent duplicates.

### Blocked Feed Visibility

WHEN a user blocks another user, THE system SHALL hide all posts from the blocked user in the blocking user's feeds.

IF a blocked user creates a new post, THE system SHALL not display it in the blocking user's home feed.

IF a blocked user creates a new post, THE system SHALL not display it in the blocking user's popular feed.

IF a blocked user creates a new post, THE system SHALL not display it in the blocking user's community feeds.

WHEN viewing a community feed, THE system SHALL filter out posts authored by blocked users.

WHEN viewing the home feed, THE system SHALL filter out posts from blocked users across all subscribed communities.

IF a blocked user's post appears in search results, THE system SHALL still hide it from the blocking user's feed views.

### Blocked Profile Access

WHEN a user blocks another user, THE system SHALL still allow the blocking user to view the blocked user's public profile.

IF a blocked user attempts to access the blocking user's profile, THE system SHALL allow access to public profile information.

THE system SHALL display the blocked user's display name, bio, and avatar on their profile page.

THE system SHALL display the blocked user's total karma score on their profile page.

THE system SHALL display the blocked user's post history on their profile page.

THE system SHALL display the blocked user's comment history on their profile page.

WHEN viewing a blocked user's profile, THE system SHALL not prevent access to publicly available information.

### Blocked Comment Interactions

WHEN two blocked users are viewing the same post, THE system SHALL allow both users to comment on that post.

IF a blocked user writes a comment on a shared post, THE system SHALL not hide that comment from the blocking user.

IF a blocking user writes a comment on a shared post, THE system SHALL not hide that comment from the blocked user.

THE system SHALL not prevent blocked users from replying to each other's comments on shared posts.

WHEN blocked users interact on the same post, THE system SHALL display all comments regardless of block status.

IF a blocked user votes on a comment by the blocking user, THE system SHALL process the vote normally.

THE system SHALL not filter comment interactions based on block relationships.

### Moderator Block Restrictions

IF a user attempts to block a community moderator, THE system SHALL reject the request.

WHEN a user tries to block a moderator of a community they both belong to, THE system SHALL display an appropriate error message.

THE system SHALL validate moderator status before processing block requests within shared communities.

IF a moderator is promoted after a user has blocked them, THE system SHALL maintain the existing block.

WHEN a user blocks a non-moderator who later becomes a moderator, THE system SHALL not automatically remove the block.

THE system SHALL prevent blocking only for active moderators in communities where both users are members.

### Block Status Propagation

WHEN a user blocks another user, THE system SHALL immediately update feed displays to reflect the block status.

IF a block is created, THE system SHALL filter blocked user content from feeds without requiring a page refresh.

WHEN a user unblocks another user, THE system SHALL immediately restore blocked user content in feeds.

IF a block status changes, THE system SHALL update the block list display immediately.

THE system SHALL propagate block status changes to all relevant feed views within the user's session.

WHEN multiple users are viewing the same feed, THE system SHALL apply block filtering based on each user's individual block list.

### Blocked Search Results

WHEN a user searches for content, THE system SHALL still include posts from blocked users in search results.

IF a blocked user's post matches search criteria, THE system SHALL display it in search results.

THE system SHALL not filter search results based on block relationships.

WHEN a blocked user's profile matches search criteria, THE system SHALL include it in user search results.

IF a blocked user's comment matches search criteria, THE system SHALL include it in comment search results.

THE system SHALL maintain search functionality independent of block status.

WHEN viewing search results, THE system SHALL not hide content from blocked users.

### Unblock Feed Restoration

WHEN a user unblocks another user, THE system SHALL restore the unblocked user's posts in all feeds.

IF a user unblocks someone, THE system SHALL include that user's existing posts in the home feed.

IF a user unblocks someone, THE system SHALL include that user's existing posts in community feeds.

WHEN unblocking occurs, THE system SHALL restore visibility of the unblocked user's content without requiring a new post.

THE system SHALL update the block list immediately when a user is unblocked.

IF a user unblocks and then re-blocks the same user, THE system SHALL reapply all block filtering rules.

WHEN unblocking a user, THE system SHALL not delete any historical Block records.

# End-to-End User Scenarios

Cross-domain user scenarios, multi-step business flows, and end-to-end use cases.

## User User Scenarios

New users register with email and password, receiving a verification link to activate their account. After verification, users can log in and customize their profile with a display name, bio, and avatar image. Users can view their own profile to see their karma score, post history, and comment history. When users log in, the system displays their personalized home feed with posts from subscribed communities. Users can update their display name, bio, and avatar at any time from their profile settings. When a user deletes their account, all their posts and comments are permanently removed from the system. The system prevents duplicate usernames during registration. If a user forgets their password, they can request a reset link sent to their email. Users can view their activity history to track their posts and comments across the platform.

### User Registration Flow

WHEN a new user registers for an account, THE system SHALL require email and password as mandatory fields.

WHEN a new user registers for an account, THE system SHALL require a unique username.

WHEN a new user submits registration information, THE system SHALL create a pending account awaiting email verification.

WHEN a new user completes registration, THE system SHALL send a verification email to the provided email address.

WHEN a user clicks the verification link in their email, THE system SHALL activate their account.

WHEN a user's account is activated, THE system SHALL allow the user to log in with their credentials.

IF a user attempts to register with an email already associated with an existing account, THE system SHALL reject the registration request.

IF a user attempts to register with a username that already exists, THE system SHALL reject the registration request.

WHEN a user successfully registers, THE system SHALL initialize the user's karma score to zero.

WHEN a user successfully registers, THE system SHALL create an empty profile for the user.

### Email Verification Process

WHEN a user registers with an email address, THE system SHALL generate a unique verification link.

WHEN the system generates a verification link, THE system SHALL send it to the user's email address.

WHEN a user receives the verification email, THE system SHALL allow the user to activate their account by clicking the link.

WHEN a user clicks their verification link, THE system SHALL mark their account as verified and active.

WHEN a user's account is verified, THE system SHALL enable full platform access including login and content creation.

IF a user attempts to log in with an unverified account, THE system SHALL prompt the user to verify their email address.

IF a user's verification link expires, THE system SHALL allow the user to request a new verification email.

WHEN a user requests a new verification email, THE system SHALL send a fresh verification link to their registered email address.

WHEN a user verifies their email, THE system SHALL invalidate any previous verification links for that account.

IF a user attempts to use an already-used verification link, THE system SHALL inform the user that their account is already verified.

### Profile Customization

WHEN a user wants to customize their profile, THE system SHALL allow them to set a display name.

WHEN a user wants to customize their profile, THE system SHALL allow them to add a bio text.

WHEN a user wants to customize their profile, THE system SHALL allow them to upload an avatar image.

WHEN a user updates their display name, THE system SHALL save the new display name and display it on their profile page.

WHEN a user updates their bio, THE system SHALL save the new bio text and display it on their profile page.

WHEN a user uploads an avatar image, THE system SHALL save the image and display it on their profile page.

WHEN a user views their own profile, THE system SHALL display their display name, bio, and avatar.

WHEN a user views another user's profile, THE system SHALL display that user's display name, bio, and avatar.

WHEN a user updates their profile information, THE system SHALL make the changes visible immediately to all users.

WHEN a user leaves their bio empty, THE system SHALL allow the profile to remain without bio text.

### Account Deletion

WHEN a user requests to delete their account, THE system SHALL require confirmation before proceeding.

WHEN a user confirms account deletion, THE system SHALL permanently delete all posts created by that user.

WHEN a user confirms account deletion, THE system SHALL permanently delete all comments written by that user.

WHEN a user's account is deleted, THE system SHALL remove all votes cast by that user.

WHEN a user's account is deleted, THE system SHALL remove all subscriptions held by that user.

WHEN a user's account is deleted, THE system SHALL remove the user from all moderator roles.

WHEN a user's account is deleted, THE system SHALL invalidate any active sessions for that user.

WHEN a user's account is deleted, THE system SHALL prevent the user from logging in again.

WHEN a user's account is deleted, THE system SHALL release their username for future use.

WHEN a user's account is deleted, THE system SHALL remove any reports submitted by that user.

### Login Authentication

WHEN a user attempts to log in, THE system SHALL require their email and password.

WHEN a user provides correct email and password, THE system SHALL authenticate the user and create a session.

WHEN a user is authenticated, THE system SHALL redirect them to their personalized home feed.

WHEN a user logs in, THE system SHALL display their username in the interface.

WHEN a user logs in, THE system SHALL load their profile information for display.

WHEN a user logs in, THE system SHALL display their current karma score.

IF a user provides an incorrect password, THE system SHALL reject the login attempt.

IF a user provides an email not associated with any account, THE system SHALL reject the login attempt.

IF a user's account is not verified, THE system SHALL prompt them to verify their email before allowing login.

WHEN a user logs out, THE system SHALL terminate their active session.

### Password Recovery

WHEN a user forgets their password, THE system SHALL allow them to request a password reset.

WHEN a user requests a password reset, THE system SHALL require their registered email address.

WHEN a user provides their email for password recovery, THE system SHALL send a password reset link to that email.

WHEN a user clicks the password reset link, THE system SHALL allow them to set a new password.

WHEN a user sets a new password, THE system SHALL update their account with the new password.

WHEN a user's password is changed, THE system SHALL invalidate all existing sessions for that account.

WHEN a user changes their password, THE system SHALL require them to log in with the new password.

IF a user attempts to use an expired password reset link, THE system SHALL allow them to request a new link.

IF a user attempts to use an already-used password reset link, THE system SHALL inform them the link is no longer valid.

WHEN a user successfully resets their password, THE system SHALL confirm the password change.

### Username Uniqueness

WHEN a user registers with a username, THE system SHALL check if the username already exists.

WHEN a user attempts to use a username that exists, THE system SHALL reject the registration.

WHEN a user provides a unique username, THE system SHALL reserve that username for their account.

WHEN a user's account is deleted, THE system SHALL make their username available for new registrations.

WHEN a user views another user's profile, THE system SHALL display their unique username.

WHEN a user creates a post, THE system SHALL associate the post with their unique username.

WHEN a user writes a comment, THE system SHALL associate the comment with their unique username.

WHEN a user's username is displayed in any context, THE system SHALL ensure it uniquely identifies that user.

IF a user attempts to change their username to one that already exists, THE system SHALL reject the change.

WHEN a user searches for another user, THE system SHALL allow lookup by their unique username.

### Karma Tracking

WHEN a user's post receives an upvote, THE system SHALL increase the user's karma by 1.

WHEN a user's post receives a downvote, THE system SHALL decrease the user's karma by 1.

WHEN a user's comment receives an upvote, THE system SHALL increase the user's karma by 1.

WHEN a user's comment receives a downvote, THE system SHALL decrease the user's karma by 1.

WHEN a user removes their upvote from a post, THE system SHALL decrease the post author's karma by 1.

WHEN a user removes their upvote from a comment, THE system SHALL decrease the comment author's karma by 1.

WHEN a user removes their downvote from a post, THE system SHALL increase the post author's karma by 1.

WHEN a user removes their downvote from a comment, THE system SHALL increase the comment author's karma by 1.

WHEN a user changes their vote from upvote to downvote, THE system SHALL decrease the author's karma by 2.

WHEN a user changes their vote from downvote to upvote, THE system SHALL increase the author's karma by 2.

WHEN a user views their own profile, THE system SHALL display their total karma score.

WHEN a user views another user's profile, THE system SHALL display that user's total karma score.

WHEN a user's karma becomes negative, THE system SHALL continue tracking the negative value.

WHEN a post or comment is deleted, THE system SHALL adjust karma to remove the impact of votes on that content.

### Activity History

WHEN a user views their profile, THE system SHALL display a list of all posts they have created.

WHEN a user views their profile, THE system SHALL display a list of all comments they have written.

WHEN a user views their activity history, THE system SHALL show posts in chronological order.

WHEN a user views their activity history, THE system SHALL show comments in chronological order.

WHEN a user views their post history, THE system SHALL display the title, community, and vote score for each post.

WHEN a user views their comment history, THE system SHALL display the comment content, post title, and vote score.

WHEN a user's post is deleted, THE system SHALL remove it from their activity history.

WHEN a user's comment is deleted, THE system SHALL remove it from their activity history.

WHEN a user views their activity history, THE system SHALL show when each post or comment was created.

WHEN a user navigates to their activity history, THE system SHALL paginate the results for large histories.

### Account Settings Management

WHEN a user accesses account settings, THE system SHALL allow them to update their display name.

WHEN a user accesses account settings, THE system SHALL allow them to update their bio.

WHEN a user accesses account settings, THE system SHALL allow them to update their avatar image.

WHEN a user accesses account settings, THE system SHALL allow them to change their password.

WHEN a user accesses account settings, THE system SHALL allow them to delete their account.

WHEN a user updates their password, THE system SHALL require their current password for verification.

WHEN a user updates their password, THE system SHALL require a new password that meets security requirements.

WHEN a user changes their settings, THE system SHALL save the changes immediately.

WHEN a user views their account settings, THE system SHALL display their current profile information.

WHEN a user wants to delete their account, THE system SHALL warn them about permanent data loss.

## Community User Scenarios

Users browse the public directory to discover new communities matching their interests. When users find a community, they can view its description, subscriber count, and recent activity. Users can subscribe to any community with a single action, adding it to their personalized home feed. Subscribers can create posts in their subscribed communities. Users can unsubscribe at any time, which stops showing that community's posts in their home feed. When searching for communities, users can filter by name to find specific topics. New community creators automatically become owners with full moderation privileges. Users can view all communities they own or moderate from a dedicated management interface.

### Community Discovery and Browsing

WHEN a user accesses the community directory, THE system SHALL display a list of all available communities.

WHEN a user views a community listing, THE system SHALL show each community's name, description, and icon.

WHEN a user views a community, THE system SHALL display the current subscriber count.

WHEN a user views a community, THE system SHALL show recent post activity.

THE system SHALL allow guests to browse all communities without authentication.

THE system SHALL allow members to browse all communities.

WHEN a user clicks on a community, THE system SHALL navigate to the community detail page.

WHEN a user views a community detail page, THE system SHALL display the community name, description, icon, and subscriber count.

WHEN a user views a community detail page, THE system SHALL show posts from that community.

IF a community has no subscribers, THE system SHALL still display it in the community directory.

IF a community has no posts, THE system SHALL display the community with zero post count.

WHEN a user browses communities, THE system SHALL load communities in paginated batches.

### Community Search and Filtering

WHEN a user enters search text in the community search field, THE system SHALL filter communities by name.

WHEN a user searches for communities, THE system SHALL return communities whose names match the search term.

WHEN a user searches for communities, THE system SHALL display matching results in a list format.

WHEN a user searches for communities, THE system SHALL show each result's name, description, and subscriber count.

IF no communities match the search term, THE system SHALL display a message indicating no results found.

IF multiple communities match the search term, THE system SHALL display all matching communities.

WHEN a user searches for communities, THE system SHALL perform case-insensitive name matching.

WHEN a user clears the search field, THE system SHALL restore the full community list.

WHEN a user searches for communities, THE system SHALL prioritize communities with exact name matches.

WHEN a user searches for communities, THE system SHALL limit results to a reasonable page size.

WHEN a user searches for communities, THE system SHALL allow them to select from the search results.

### Subscription and Feed Management

WHEN a user subscribes to a community, THE system SHALL add the community to their subscription list.

WHEN a user subscribes to a community, THE system SHALL include that community's posts in their home feed.

WHEN a user unsubscribes from a community, THE system SHALL remove the community from their subscription list.

WHEN a user unsubscribes from a community, THE system SHALL exclude that community's posts from their home feed.

WHEN a user views their subscription list, THE system SHALL display all communities they are subscribed to.

WHEN a user subscribes to a community, THE system SHALL enable them to create posts in that community.

WHEN a user subscribes to a community, THE system SHALL increment the community's subscriber count.

WHEN a user unsubscribes from a community, THE system SHALL decrement the community's subscriber count.

WHEN a user views their home feed, THE system SHALL show posts only from subscribed communities.

WHEN a user subscribes to multiple communities, THE system SHALL combine posts from all subscribed communities in their home feed.

WHEN a user subscribes to a community, THE system SHALL record the subscription timestamp.

IF a user is already subscribed to a community, THE system SHALL recognize the existing subscription without creating a duplicate.

IF a user attempts to unsubscribe from a community they are not subscribed to, THE system SHALL handle the request gracefully.

WHEN a user subscribes to a community, THE system SHALL allow them to immediately create posts in that community.

WHEN a user unsubscribes from a community, THE system SHALL prevent them from creating new posts in that community.

### Community Creation and Ownership

WHEN a user creates a community, THE system SHALL assign them as the owner of that community.

WHEN a user creates a community, THE system SHALL grant them full moderation privileges.

WHEN a user creates a community, THE system SHALL require a unique community name.

WHEN a user creates a community, THE system SHALL allow them to provide a description.

WHEN a user creates a community, THE system SHALL allow them to upload an icon image.

WHEN a user creates a community, THE system SHALL automatically subscribe them to their own community.

WHEN a user creates a community, THE system SHALL initialize the subscriber count to one (the owner).

WHEN a user views their management interface, THE system SHALL show all communities they own or moderate.

WHEN a user creates a community, THE system SHALL enable them to add moderators to that community.

WHEN a user creates a community, THE system SHALL enable them to remove moderators from that community.

WHEN a user creates a community, THE system SHALL enable them to delete posts in that community.

WHEN a user creates a community, THE system SHALL enable them to delete comments in that community.

WHEN a user creates a community, THE system SHALL enable them to ban users from that community.

WHEN a user creates a community, THE system SHALL enable them to unban users from that community.

WHEN a user creates a community, THE system SHALL enable them to view reports for that community.

### Subscriber Count and Activity Tracking

WHEN a user subscribes to a community, THE system SHALL increment the community's subscriber count by one.

WHEN a user unsubscribes from a community, THE system SHALL decrement the community's subscriber count by one.

WHEN a user views a community, THE system SHALL display the current accurate subscriber count.

WHEN a user views a community, THE system SHALL show recent post activity.

WHEN a community is displayed in a list, THE system SHALL show the subscriber count alongside the community name.

WHEN a user creates a community, THE system SHALL initialize the subscriber count to one.

WHEN a user subscribes to a community, THE system SHALL update the subscriber count immediately.

WHEN a user unsubscribes from a community, THE system SHALL update the subscriber count immediately.

WHEN multiple users subscribe simultaneously, THE system SHALL maintain accurate subscriber count.

WHEN multiple users unsubscribe simultaneously, THE system SHALL maintain accurate subscriber count.

WHEN a user views the community directory, THE system SHALL display subscriber counts for all communities.

WHEN a user searches for communities, THE system SHALL display subscriber counts for matching communities.

WHEN a user views their subscription list, THE system SHALL display subscriber counts for each community.

WHEN a user views a community feed, THE system SHALL display the community's subscriber count.

IF a community has zero subscribers, THE system SHALL display zero as the subscriber count.

## Post User Scenarios

Users can create three types of posts in communities they follow: text posts with up to 10,000 characters, link posts with external URLs, or image posts with uploaded media. When creating a post, users must provide a title and select the post type. After publishing, posts appear in the community feed and the author's profile. Users can edit their own posts at any time, and changes are reflected immediately for all viewers. When users delete their posts, all associated comments are also removed. The system tracks when each post was created to support time-based sorting options. Users can view their post's performance through visible vote scores and comment counts.

### Text Post Creation

WHEN a member creates a text post, THE system SHALL require the member to provide a title.

WHEN a member creates a text post, THE system SHALL require the member to provide text content.

WHEN a member creates a text post, THE system SHALL require the member to select a community they are subscribed to.

WHEN a member creates a text post, THE system SHALL associate the post with the creating member as the author.

WHEN a member creates a text post, THE system SHALL record the creation timestamp.

WHEN a member creates a text post, THE system SHALL set the initial vote score to zero.

WHEN a member creates a text post, THE system SHALL make the post visible in the community feed immediately after creation.

WHEN a member creates a text post, THE system SHALL make the post visible on the member's profile page.

IF the member is not subscribed to the selected community, THE system SHALL reject the text post creation.

IF the title is empty or missing, THE system SHALL reject the text post creation.

IF the text content is empty or missing, THE system SHALL reject the text post creation.

IF the member is banned from the selected community, THE system SHALL reject the text post creation.

### Link Post Creation

WHEN a member creates a link post, THE system SHALL require the member to provide a title.

WHEN a member creates a link post, THE system SHALL require the member to provide a URL.

WHEN a member creates a link post, THE system SHALL require the member to select a community they are subscribed to.

WHEN a member creates a link post, THE system SHALL associate the post with the creating member as the author.

WHEN a member creates a link post, THE system SHALL record the creation timestamp.

WHEN a member creates a link post, THE system SHALL set the initial vote score to zero.

WHEN a member creates a link post, THE system SHALL make the post visible in the community feed immediately after creation.

WHEN a member creates a link post, THE system SHALL make the post visible on the member's profile page.

IF the member is not subscribed to the selected community, THE system SHALL reject the link post creation.

IF the title is empty or missing, THE system SHALL reject the link post creation.

IF the URL is empty or missing, THE system SHALL reject the link post creation.

IF the member is banned from the selected community, THE system SHALL reject the link post creation.

### Image Post Creation

WHEN a member creates an image post, THE system SHALL require the member to provide a title.

WHEN a member creates an image post, THE system SHALL require the member to upload an image file.

WHEN a member creates an image post, THE system SHALL require the member to select a community they are subscribed to.

WHEN a member creates an image post, THE system SHALL associate the post with the creating member as the author.

WHEN a member creates an image post, THE system SHALL record the creation timestamp.

WHEN a member creates an image post, THE system SHALL set the initial vote score to zero.

WHEN a member creates an image post, THE system SHALL make the post visible in the community feed immediately after creation.

WHEN a member creates an image post, THE system SHALL make the post visible on the member's profile page.

IF the member is not subscribed to the selected community, THE system SHALL reject the image post creation.

IF the title is empty or missing, THE system SHALL reject the image post creation.

IF the image file is not uploaded, THE system SHALL reject the image post creation.

IF the member is banned from the selected community, THE system SHALL reject the image post creation.

### Post Editing

WHEN a member edits their own post, THE system SHALL allow the member to modify the title.

WHEN a member edits their own post, THE system SHALL allow the member to modify the content.

WHEN a member edits their own text post, THE system SHALL allow the member to modify the text content.

WHEN a member edits their own link post, THE system SHALL allow the member to modify the URL.

WHEN a member edits their own image post, THE system SHALL allow the member to upload a new image.

WHEN a member edits their post, THE system SHALL preserve the original creation timestamp.

WHEN a member edits their post, THE system SHALL immediately reflect the changes for all viewers.

WHEN a member edits their post, THE system SHALL preserve existing votes and vote score.

WHEN a member edits their post, THE system SHALL preserve existing comments.

IF the member is not the author of the post, THE system SHALL reject the edit request.

IF the post has been deleted, THE system SHALL reject the edit request.

### Post Deletion

WHEN a member deletes their own post, THE system SHALL remove the post from all feeds.

WHEN a member deletes their own post, THE system SHALL remove the post from the member's profile.

WHEN a member deletes their own post, THE system SHALL remove all comments associated with the post.

WHEN a member deletes their own post, THE system SHALL adjust the member's karma score by removing the post's vote contribution.

WHEN a moderator deletes a post in their community, THE system SHALL remove the post from all feeds.

WHEN a moderator deletes a post in their community, THE system SHALL remove all comments associated with the post.

WHEN a moderator deletes a post in their community, THE system SHALL adjust the author's karma score by removing the post's vote contribution.

WHEN a post is deleted, THE system SHALL prevent any new comments on the deleted post.

WHEN a post is deleted, THE system SHALL prevent any new votes on the deleted post.

IF the member is not the author of the post, THE system SHALL reject the delete request.

IF the member is not a moderator of the community, THE system SHALL reject the delete request for posts they do not own.

### Post Performance Tracking

WHEN a member views their post, THE system SHALL display the current vote score.

WHEN a member views their post, THE system SHALL display the total comment count.

WHEN a member views their post, THE system SHALL display the time since the post was created.

WHEN any user views a post, THE system SHALL display the author's username.

WHEN any user views a post, THE system SHALL display the community name.

WHEN any user views a post, THE system SHALL display the post title.

WHEN any user views a text post, THE system SHALL display the full text content.

WHEN any user views an image post, THE system SHALL display the uploaded image.

WHEN any user views a link post, THE system SHALL display the URL.

WHEN a post receives an upvote, THE system SHALL increase the vote score by one.

WHEN a post receives a downvote, THE system SHALL decrease the vote score by one.

WHEN a post receives a new comment, THE system SHALL increment the comment count.

WHEN a comment is deleted from a post, THE system SHALL decrement the comment count.

### Media Upload

WHEN a member uploads an image for an image post, THE system SHALL store the image file.

WHEN a member uploads an image for an image post, THE system SHALL associate the image with the post.

WHEN a member uploads an image for an image post, THE system SHALL generate a thumbnail for list views.

WHEN a member edits an image post, THE system SHALL allow the member to replace the uploaded image.

WHEN a member edits an image post with a new image, THE system SHALL replace the previous image.

WHEN a member edits an image post with a new image, THE system SHALL generate a new thumbnail.

WHEN an image post is deleted, THE system SHALL remove the associated image file.

WHEN any user views an image post in a list, THE system SHALL display the image thumbnail.

WHEN any user views an image post in detail, THE system SHALL display the full image.

IF the image file format is not supported, THE system SHALL reject the upload.

### Post Visibility

WHEN a member creates a post in a community, THE system SHALL make the post visible in that community's feed.

WHEN a member creates a post, THE system SHALL make the post visible on the member's profile page.

WHEN a member creates a post in a subscribed community, THE system SHALL make the post visible in the member's home feed.

WHEN any user views the popular feed, THE system SHALL include posts from all communities.

WHEN any user views a community feed, THE system SHALL include posts from that specific community.

WHEN a logged-in member views the home feed, THE system SHALL include posts only from subscribed communities.

WHEN a guest views the home feed, THE system SHALL prevent access to the home feed.

WHEN a post is deleted, THE system SHALL remove the post from all feeds.

WHEN a post is deleted, THE system SHALL remove the post from the author's profile.

WHEN a user is blocked from a community, THE system SHALL hide posts from that community in the user's feeds.

WHEN a user is banned from a community, THE system SHALL hide posts from that community in the user's feeds.

WHEN any user views a post, THE system SHALL display the post regardless of the user's subscription status to the community.

## Comment User Scenarios

Users can write comments on any visible post to start discussions. When replying to another comment, the system creates a threaded conversation structure. Users can edit their own comments to fix typos or update information. Deleting a comment also removes all its nested replies. The system displays when each comment was posted and shows the author's username. Users can view their comment history to track their participation. Deeply nested replies are supported with no depth limits, allowing complex discussion threads.

### Comment Creation

WHEN a user views a post, THE system SHALL allow the user to write a comment on that post.

WHEN a user submits a comment, THE system SHALL associate the comment with the post being commented on.

WHEN a user submits a comment, THE system SHALL associate the comment with the user who created it.

WHEN a user submits a comment, THE system SHALL require the comment to contain content.

IF a user attempts to submit an empty comment, THE system SHALL reject the submission.

WHEN a user successfully submits a comment, THE system SHALL make the comment visible to other users viewing the post.

WHEN a user successfully submits a comment, THE system SHALL increment the comment count for the associated post.

WHILE a user is composing a comment, THE system SHALL allow the user to edit the comment content before submission.

IF a user is banned from a community, THE system SHALL prevent the user from creating comments in posts within that community.

IF a user is blocked from a community, THE system SHALL prevent the user from creating comments in posts within that community.

### Reply Threading

WHEN a user replies to a comment, THE system SHALL create a nested relationship between the reply and the parent comment.

WHEN a user views a comment with replies, THE system SHALL display the replies nested under the parent comment.

WHEN a user replies to a reply, THE system SHALL create another level of nesting in the thread.

WHEN a user views a threaded comment structure, THE system SHALL visually indicate the hierarchy of comments and replies.

WHEN a user replies to a comment, THE system SHALL preserve the existing thread structure.

IF a parent comment is deleted, THE system SHALL remove all nested replies from the thread.

WHEN a user views a deeply nested comment, THE system SHALL display the full thread path to that comment.

WHEN a user replies to a comment, THE system SHALL associate the reply with the same post as the parent comment.

WHEN a user replies to a comment, THE system SHALL associate the reply with the user who created it.

IF a user attempts to reply to a deleted comment, THE system SHALL reject the reply.

### Comment Editing

WHEN a user views their own comment, THE system SHALL allow the user to edit the comment content.

WHEN a user edits their comment, THE system SHALL update the comment content while preserving the comment's identity.

WHEN a user edits their comment, THE system SHALL preserve the original timestamp of when the comment was first posted.

WHEN a user edits their comment, THE system SHALL preserve any replies to the edited comment.

WHEN a user edits their comment, THE system SHALL preserve the comment's position in the thread.

WHEN a user edits their comment, THE system SHALL preserve the comment's vote score.

IF a user attempts to edit another user's comment, THE system SHALL reject the edit.

WHEN a user edits their comment, THE system SHALL make the updated content visible to all users viewing the post.

WHEN a user edits their comment, THE system SHALL maintain the comment's association with the post.

IF a user edits a comment that has been reported, THE system SHALL preserve the report status.

### Comment Deletion

WHEN a user deletes their own comment, THE system SHALL remove the comment from the post.

WHEN a user deletes their own comment, THE system SHALL remove all nested replies to that comment.

WHEN a user deletes their own comment, THE system SHALL decrement the comment count for the associated post.

WHEN a user deletes their own comment, THE system SHALL adjust karma scores for all votes on the deleted comment.

WHEN a user deletes their own comment, THE system SHALL adjust karma scores for all votes on deleted nested replies.

WHEN a user deletes their own comment, THE system SHALL remove the comment from the user's comment history.

IF a user attempts to delete another user's comment, THE system SHALL reject the deletion.

IF a moderator deletes a comment, THE system SHALL remove the comment from the post.

IF a moderator deletes a comment, THE system SHALL remove all nested replies to that comment.

IF a user deletes their account, THE system SHALL delete all comments created by that user.

### Comment History

WHEN a user views their profile, THE system SHALL display a list of all comments the user has created.

WHEN a user views their comment history, THE system SHALL show the comment content.

WHEN a user views their comment history, THE system SHALL show the post title where each comment was posted.

WHEN a user views their comment history, THE system SHALL show the community name for each comment.

WHEN a user views their comment history, THE system SHALL show the vote score for each comment.

WHEN a user views their comment history, THE system SHALL show when each comment was posted.

WHEN a user views their comment history, THE system SHALL exclude deleted comments from the list.

WHEN a user views their comment history, THE system SHALL display comments in reverse chronological order by default.

WHEN a user views their comment history, THE system SHALL allow the user to navigate to the post containing each comment.

IF a user deletes their account, THE system SHALL remove all entries from their comment history.

### Nested Discussions

WHEN a user creates a reply to a reply, THE system SHALL support unlimited nesting depth.

WHEN a user views a deeply nested discussion, THE system SHALL display all levels of the thread.

WHEN a user creates a reply at any depth, THE system SHALL maintain the thread structure.

WHEN a user views a nested discussion, THE system SHALL allow the user to expand or collapse reply branches.

WHEN a user replies to a deeply nested comment, THE system SHALL add the reply at the appropriate nesting level.

WHEN a user views a nested discussion, THE system SHALL indicate the depth level of each comment.

WHEN a user deletes a comment in a nested discussion, THE system SHALL remove the entire branch of replies under that comment.

WHEN a user edits a comment in a nested discussion, THE system SHALL preserve all nested replies.

WHEN a user votes on a deeply nested comment, THE system SHALL process the vote identically to top-level comments.

WHEN a user reports a deeply nested comment, THE system SHALL process the report identically to top-level comments.

### Author Attribution

WHEN a user views a comment, THE system SHALL display the username of the comment's author.

WHEN a user views a comment, THE system SHALL allow the user to navigate to the author's profile.

WHEN a user views a comment, THE system SHALL display the author's avatar image.

WHEN a user views a comment, THE system SHALL display the author's karma score.

WHEN a user views a comment by a banned user, THE system SHALL still display the author's username.

WHEN a user views a comment by a blocked user, THE system SHALL hide the comment from the user's view.

WHEN a user views a comment by a deleted account, THE system SHALL display a placeholder for the author.

WHEN a user views a comment, THE system SHALL display the author's username consistently across all comment views.

WHEN a user changes their username, THE system SHALL update the displayed author name on all existing comments.

WHEN a user views a comment, THE system SHALL allow the user to identify the author through the displayed username.

### Timestamp Tracking

WHEN a user views a comment, THE system SHALL display when the comment was posted.

WHEN a user views a comment, THE system SHALL display the timestamp in a relative format (e.g., "3 hours ago").

WHEN a user views a comment, THE system SHALL update the relative timestamp as time passes.

WHEN a user views a comment, THE system SHALL preserve the original posting timestamp even if the comment is edited.

WHEN a user views a comment, THE system SHALL display timestamps consistently across all comment views.

WHEN a user views a threaded discussion, THE system SHALL display timestamps for each comment in the thread.

WHEN a user views a comment history, THE system SHALL use timestamps to sort comments chronologically.

WHEN a user views a comment, THE system SHALL display the timestamp in the user's local timezone.

WHEN a user views a comment, THE system SHALL allow the user to see the exact posting time on hover or focus.

WHEN a user views a comment, THE system SHALL maintain timestamp accuracy across all views and feeds.

## Vote User Scenarios

Users can upvote or downvote any post or comment they encounter. When a user votes, their previous vote on that content is replaced. Users can change their mind and reverse their vote from upvote to downvote or remove it entirely. The system calculates the final score by adding upvotes and subtracting downvotes. Each user can only vote once per piece of content. Vote changes are reflected immediately in the public score display. Users can see the current score while browsing feeds.

### Upvoting Content Scenario

WHEN a user views a post, THE system SHALL display the current vote score.

WHEN a user views a comment, THE system SHALL display the current vote score.

WHEN a user clicks the upvote button on a post, THE system SHALL record an upvote from that user on that post.

WHEN a user clicks the upvote button on a comment, THE system SHALL record an upvote from that user on that comment.

WHEN a user upvotes a post, THE system SHALL increase the post's score by 1.

WHEN a user upvotes a comment, THE system SHALL increase the comment's score by 1.

WHEN a user upvotes content, THE system SHALL increase the content author's karma by 1.

IF a user has not previously voted on a post, THEN THE system SHALL allow the user to upvote that post.

IF a user has not previously voted on a comment, THEN THE system SHALL allow the user to upvote that comment.

WHEN a user upvotes content, THE system SHALL visually indicate the user's upvote selection.

WHEN a user upvotes content, THE system SHALL immediately reflect the new score in the user interface.

IF the user is not logged in, THEN THE system SHALL prevent the user from upvoting any content.

IF the content has been deleted, THEN THE system SHALL prevent the user from upvoting that content.

IF the user is banned from the community containing the content, THEN THE system SHALL prevent the user from upvoting that content.

WHEN a guest views content, THE system SHALL display the vote score without allowing voting actions.

### Downvoting Content Scenario

WHEN a user views a post, THE system SHALL display the current vote score.

WHEN a user views a comment, THE system SHALL display the current vote score.

WHEN a user clicks the downvote button on a post, THE system SHALL record a downvote from that user on that post.

WHEN a user clicks the downvote button on a comment, THE system SHALL record a downvote from that user on that comment.

WHEN a user downvotes a post, THE system SHALL decrease the post's score by 1.

WHEN a user downvotes a comment, THE system SHALL decrease the comment's score by 1.

WHEN a user downvotes content, THE system SHALL decrease the content author's karma by 1.

IF a user has not previously voted on a post, THEN THE system SHALL allow the user to downvote that post.

IF a user has not previously voted on a comment, THEN THE system SHALL allow the user to downvote that comment.

WHEN a user downvotes content, THE system SHALL visually indicate the user's downvote selection.

WHEN a user downvotes content, THE system SHALL immediately reflect the new score in the user interface.

IF the user is not logged in, THEN THE system SHALL prevent the user from downvoting any content.

IF the content has been deleted, THEN THE system SHALL prevent the user from downvoting that content.

IF the user is banned from the community containing the content, THEN THE system SHALL prevent the user from downvoting that content.

WHEN a guest views content, THE system SHALL display the vote score without allowing voting actions.

### Vote Modification Scenario

WHEN a user has previously upvoted a post, THEN THE system SHALL allow the user to change their vote to a downvote.

WHEN a user has previously downvoted a post, THEN THE system SHALL allow the user to change their vote to an upvote.

WHEN a user has previously upvoted a comment, THEN THE system SHALL allow the user to change their vote to a downvote.

WHEN a user has previously downvoted a comment, THEN THE system SHALL allow the user to change their vote to an upvote.

WHEN a user changes their vote from upvote to downvote on a post, THE system SHALL decrease the post's score by 2.

WHEN a user changes their vote from downvote to upvote on a post, THE system SHALL increase the post's score by 2.

WHEN a user changes their vote from upvote to downvote on a comment, THE system SHALL decrease the comment's score by 2.

WHEN a user changes their vote from downvote to upvote on a comment, THE system SHALL increase the comment's score by 2.

WHEN a user changes their vote from upvote to downvote, THE system SHALL decrease the content author's karma by 2.

WHEN a user changes their vote from downvote to upvote, THE system SHALL increase the content author's karma by 2.

WHEN a user modifies their vote, THE system SHALL replace their previous vote with the new vote.

WHEN a user modifies their vote, THE system SHALL immediately reflect the updated score in the user interface.

WHEN a user modifies their vote, THE system SHALL visually indicate the user's new vote selection.

IF the content has been deleted, THEN THE system SHALL prevent the user from modifying their vote on that content.

IF the user is banned from the community containing the content, THEN THE system SHALL prevent the user from modifying their vote on that content.

### Vote Removal Scenario

WHEN a user has previously voted on a post, THEN THE system SHALL allow the user to remove their vote.

WHEN a user has previously voted on a comment, THEN THE system SHALL allow the user to remove their vote.

WHEN a user removes their upvote from a post, THE system SHALL decrease the post's score by 1.

WHEN a user removes their downvote from a post, THE system SHALL increase the post's score by 1.

WHEN a user removes their upvote from a comment, THE system SHALL decrease the comment's score by 1.

WHEN a user removes their downvote from a comment, THE system SHALL increase the comment's score by 1.

WHEN a user removes their upvote, THE system SHALL decrease the content author's karma by 1.

WHEN a user removes their downvote, THE system SHALL increase the content author's karma by 1.

WHEN a user removes their vote, THE system SHALL clear their vote record for that content.

WHEN a user removes their vote, THE system SHALL immediately reflect the updated score in the user interface.

WHEN a user removes their vote, THE system SHALL visually indicate that the user has no active vote.

IF the content has been deleted, THEN THE system SHALL prevent the user from removing their vote on that content.

IF the user is banned from the community containing the content, THEN THE system SHALL prevent the user from removing their vote on that content.

### Score Calculation Scenario

THE system SHALL calculate a post's score as the sum of all upvotes minus the sum of all downvotes.

THE system SHALL calculate a comment's score as the sum of all upvotes minus the sum of all downvotes.

THE system SHALL calculate a user's karma as the sum of all scores from their posts and comments.

WHEN a vote is added, THE system SHALL recalculate the affected content's score.

WHEN a vote is modified, THE system SHALL recalculate the affected content's score.

WHEN a vote is removed, THE system SHALL recalculate the affected content's score.

WHEN a content score changes, THE system SHALL recalculate the content author's karma.

THE system SHALL allow scores to be negative when downvotes exceed upvotes.

THE system SHALL allow karma to be negative when the sum of content scores is negative.

WHEN content is deleted, THE system SHALL remove all votes on that content from score calculations.

WHEN content is deleted, THE system SHALL recalculate the content author's karma without the deleted content's contribution.

THE system SHALL maintain score accuracy across all voting operations.

THE system SHALL display the calculated score to all users viewing the content.

### Single Vote Policy Scenario

THE system SHALL allow each user to cast only one vote per post.

THE system SHALL allow each user to cast only one vote per comment.

WHEN a user attempts to vote on content they have already voted on, THE system SHALL replace their existing vote with the new vote.

WHEN a user attempts to upvote content they have already upvoted, THE system SHALL prevent duplicate upvotes.

WHEN a user attempts to downvote content they have already downvoted, THE system SHALL prevent duplicate downvotes.

THE system SHALL track each user's vote on each piece of content.

THE system SHALL prevent a user from having both an upvote and a downvote on the same content simultaneously.

WHEN a user's vote is tracked, THE system SHALL use that vote in score calculations.

WHEN a user's vote is removed, THE system SHALL no longer use that vote in score calculations.

IF a user attempts to vote multiple times on the same content, THEN THE system SHALL only record the most recent vote.

THE system SHALL ensure that each user's contribution to a content's score is limited to a single vote.

THE system SHALL prevent vote manipulation through multiple accounts by enforcing the single vote policy per user account.

### Real-Time Score Updates Scenario

WHEN a user performs a voting action, THE system SHALL update the displayed score immediately.

WHEN a user views content after voting, THE system SHALL show the updated score reflecting their vote.

WHEN a user views content after another user votes, THE system SHALL show the updated score reflecting all votes.

WHEN a user modifies their vote, THE system SHALL immediately display the new score.

WHEN a user removes their vote, THE system SHALL immediately display the updated score.

WHEN multiple users vote simultaneously, THE system SHALL ensure all score updates are reflected accurately.

THE system SHALL display the current vote score in all post list views.

THE system SHALL display the current vote score in all comment list views.

THE system SHALL display the current vote score in individual post view pages.

THE system SHALL display the current vote score in individual comment view contexts.

WHEN a user refreshes the page, THE system SHALL display the most current vote score.

THE system SHALL ensure score consistency across all users viewing the same content.

WHEN karma changes due to voting, THE system SHALL update the user's displayed karma score.

## Subscription User Scenarios

Users can subscribe to communities they are interested in following. After subscribing, that community's posts appear in their personalized home feed. Users can view their complete list of subscribed communities from their profile. Unsubscribing removes the community from their feed but preserves the subscription history. Users must be subscribed to a community before they can create posts there. The system tracks when users subscribed for analytics purposes. Users can manage all their subscriptions from one centralized location.

### Community Subscription

WHEN a user subscribes to a community, THE system SHALL:
1. Record the subscription with the current timestamp
2. Add the community to the user's subscription list
3. Include posts from that community in the user's home feed
4. Increment the community's subscriber count

WHEN a user views a community they are not subscribed to, THE system SHALL:
1. Display a subscribe option
2. Show the current subscriber count
3. Allow the user to view community posts without subscribing

WHEN a subscribed user views a community, THE system SHALL:
1. Display an unsubscribe option
2. Show that the user is currently subscribed
3. Allow the user to create posts in that community

IF a user attempts to subscribe to a community they are already subscribed to, THE system SHALL:
1. Recognize the existing subscription
2. Not create a duplicate subscription
3. Maintain the original subscription timestamp

WHEN a user subscribes to a community, THE system SHALL:
1. Enable post creation in that community
2. Include the community in the home feed
3. Track the subscription for analytics purposes

### Feed Personalization

WHEN a logged-in user views their home feed, THE system SHALL:
1. Display posts only from subscribed communities
2. Exclude posts from communities the user is not subscribed to
3. Apply the selected sorting method to the filtered posts

WHEN a guest user views the popular feed, THE system SHALL:
1. Display posts from all communities
2. Apply the selected sorting method
3. Not require subscription to view posts

WHEN a user views a specific community feed, THE system SHALL:
1. Display posts from that community only
2. Allow viewing without subscription
3. Apply the selected sorting method

WHEN posts appear in a user's home feed, THE system SHALL:
1. Include the post title
2. Show the author's username
3. Display the community name
4. Show the vote score
5. Display the comment count
6. Show time since posting
7. Preview content based on post type (first 200 characters for text, thumbnail for image, domain for link)

WHEN a user subscribes to a new community, THE system SHALL:
1. Include posts from that community in the home feed
2. Apply the same sorting rules as other subscribed communities
3. Update the feed immediately or on next refresh

WHEN a user unsubscribes from a community, THE system SHALL:
1. Remove posts from that community from the home feed
2. Maintain the ability to view the community directly
3. Continue allowing access to posts already viewed or bookmarked

### Subscription Management

WHEN a user views their subscription list, THE system SHALL:
1. Display all communities they are subscribed to
2. Show the subscription date for each community
3. Allow navigation to each subscribed community
4. Display the subscriber count for each community

WHEN a user accesses the centralized subscription management page, THE system SHALL:
1. Show all subscribed communities in one location
2. Allow unsubscribing from any community
3. Display subscription details for each community
4. Provide sorting options for the subscription list

WHEN a user manages subscriptions from their profile, THE system SHALL:
1. Display the subscription list on the profile page
2. Allow quick navigation to subscribed communities
3. Show total number of subscribed communities
4. Enable unsubscribing from the profile view

WHEN a user subscribes to multiple communities, THE system SHALL:
1. Track each subscription separately
2. Maintain individual subscription timestamps
3. Allow independent management of each subscription
4. Include all subscribed communities in the home feed

### Unsubscribing Process

WHEN a user unsubscribes from a community, THE system SHALL:
1. Remove the community from their subscription list
2. Exclude posts from that community from the home feed
3. Decrement the community's subscriber count
4. Preserve the subscription record in history

WHEN a user views their subscription history after unsubscribing, THE system SHALL:
1. Show the community in their historical subscription list
2. Display when they subscribed and unsubscribed
3. Maintain the record for analytics purposes

WHEN a user attempts to create a post after unsubscribing, THE system SHALL:
1. Require re-subscription before allowing post creation
2. Display a message indicating subscription is required
3. Provide an option to resubscribe

WHEN a user unsubscribes from a community, THE system SHALL:
1. Remove the community from the home feed
2. Maintain access to view the community directly
3. Allow the user to resubscribe at any time
4. Preserve any posts or comments the user created in that community

### Feed Filtering

WHEN a user views their home feed, THE system SHALL:
1. Filter posts to show only subscribed communities
2. Exclude posts from unsubscribed communities
3. Apply the selected sorting method to filtered results

WHEN a user applies a sorting method to their home feed, THE system SHALL:
1. Sort posts from subscribed communities only
2. Apply the sorting criteria (hot, new, top, controversial)
3. Maintain pagination for the filtered results

WHEN a user views a community feed, THE system SHALL:
1. Filter posts to show only that community
2. Allow viewing regardless of subscription status
3. Apply the selected sorting method

WHEN posts are filtered for the home feed, THE system SHALL:
1. Include only posts from subscribed communities
2. Apply time-based filters for top posts (today, this week, this month, this year, all time)
3. Calculate hot scores based on recency and vote score
4. Rank controversial posts by vote activity with low net score

WHEN a user changes their subscription status, THE system SHALL:
1. Update feed filtering immediately or on next refresh
2. Remove posts from unsubscribed communities
3. Add posts from newly subscribed communities

### Subscription History

WHEN a user views their subscription history, THE system SHALL:
1. Display all communities they have ever subscribed to
2. Show subscription and unsubscription timestamps
3. Distinguish between active and past subscriptions
4. Maintain the history indefinitely

WHEN a user subscribes to a community, THE system SHALL:
1. Record the subscription timestamp
2. Add the subscription to the active subscription list
3. Track the subscription for historical purposes

WHEN a user unsubscribes from a community, THE system SHALL:
1. Move the subscription from active to history
2. Preserve the original subscription timestamp
3. Record the unsubscription timestamp
4. Maintain the record for analytics

WHEN the system tracks subscription history, THE system SHALL:
1. Store subscription events for each community
2. Record when users subscribed and unsubscribed
3. Enable analytics on subscription patterns
4. Maintain data for platform insights

### Centralized Management

WHEN a user accesses the centralized subscription management page, THE system SHALL:
1. Display all subscribed communities in one location
2. Allow viewing subscription details for each community
3. Enable unsubscribing from any community
4. Provide options to navigate to each community

WHEN a user views their profile, THE system SHALL:
1. Display a section showing subscribed communities
2. Show the total count of subscribed communities
3. Allow navigation to the full subscription list
4. Enable management of subscriptions from the profile

WHEN a user manages subscriptions centrally, THE system SHALL:
1. Allow bulk viewing of all subscriptions
2. Enable individual unsubscription actions
3. Display subscription metadata for each community
4. Provide sorting and filtering options for the subscription list

WHEN a user views the centralized subscription list, THE system SHALL:
1. Show community name and description
2. Display subscription date
3. Show subscriber count for each community
4. Allow quick navigation to each community
5. Enable unsubscribing with a single action

## Report User Scenarios

Users can report any post or comment they find problematic. When submitting a report, users must provide a text reason explaining the concern. Moderators receive notifications of new reports in their communities. The report includes the original content, reporter identity, and the reason provided. Moderators can approve reports by removing the content or dismiss them if unfounded. Once dismissed, reports are removed from the active queue. Users can track the status of their submitted reports.

### Content Reporting

WHEN a user views a post, THE system SHALL provide an option to report the post.

WHEN a user views a comment, THE system SHALL provide an option to report the comment.

WHEN a user selects to report content, THE system SHALL present a report submission form.

WHEN a user submits a report, THE system SHALL require the user to provide a text reason explaining the concern.

WHEN a user submits a report, THE system SHALL record the reporter's identity.

WHEN a user submits a report, THE system SHALL associate the report with the reported content.

WHEN a user submits a report, THE system SHALL set the report status to pending.

WHEN a user submits a report, THE system SHALL timestamp the report submission.

IF a user attempts to report their own content, THEN THE system SHALL prevent the report.

IF a user attempts to report deleted content, THEN THE system SHALL prevent the report.

IF the report reason is empty, THEN THE system SHALL reject the report submission.

### Abuse Reporting

WHEN a user submits a report, THE system SHALL validate that the reason text is provided.

WHEN a user submits a report, THE system SHALL ensure the reason contains sufficient detail.

WHEN a user submits a report, THE system SHALL store the reason for moderator review.

WHEN a user submits a report, THE system SHALL create a new report record.

WHEN a user submits multiple reports, THE system SHALL allow each report to be tracked separately.

IF the report reason is too brief, THEN THE system SHALL prompt the user to provide more detail.

IF the user does not have permission to view the content, THEN THE system SHALL prevent the report.

### Moderator Notification

WHEN a new report is submitted, THE system SHALL make the report visible to moderators of the relevant community.

WHEN a moderator views their community, THE system SHALL provide access to the report queue.

WHEN a moderator views the report queue, THE system SHALL display all pending reports.

WHEN a moderator views the report queue, THE system SHALL show reports sorted by submission time.

WHEN a report is created, THE system SHALL include the reported content in the report view.

WHEN a report is created, THE system SHALL include the reporter's identity in the report view.

WHEN a report is created, THE system SHALL include the reason text in the report view.

WHEN a moderator views a report, THE system SHALL show the current report status.

WHEN multiple reports exist, THE system SHALL allow moderators to filter by status.

IF a user is not a moderator of the community, THEN THE system SHALL hide the report queue.

### Report Review

WHEN a moderator views a pending report, THE system SHALL display the full reported content.

WHEN a moderator views a pending report, THE system SHALL display the reporter's username.

WHEN a moderator views a pending report, THE system SHALL display the reason provided.

WHEN a moderator views a pending report, THE system SHALL display the report submission timestamp.

WHEN a moderator reviews a report, THE system SHALL provide options to approve or dismiss.

WHEN a moderator reviews a report, THE system SHALL show the current status as pending.

WHEN a moderator clicks to review a report, THE system SHALL load all report details.

IF the reported content no longer exists, THEN THE system SHALL indicate the content is unavailable.

IF the reporter's account is deleted, THEN THE system SHALL show the reporter as anonymous.

### Report Dismissal

WHEN a moderator dismisses a report, THE system SHALL change the report status to dismissed.

WHEN a moderator dismisses a report, THE system SHALL preserve the reported content.

WHEN a moderator dismisses a report, THE system SHALL remove the report from the active report queue.

WHEN a moderator dismisses a report, THE system SHALL timestamp the dismissal action.

WHEN a moderator dismisses a report, THE system SHALL record which moderator dismissed it.

WHEN a moderator dismisses a report, THE system SHALL prevent further action on that report.

IF a report has already been approved, THEN THE system SHALL prevent dismissal.

IF a report has already been dismissed, THEN THE system SHALL prevent re-dismissal.

### Content Removal

WHEN a moderator approves a report, THE system SHALL delete the reported content.

WHEN a moderator approves a report, THE system SHALL change the report status to approved.

WHEN a moderator approves a report, THE system SHALL remove the content from all feeds.

WHEN a moderator approves a report, THE system SHALL timestamp the approval action.

WHEN a moderator approves a report, THE system SHALL record which moderator approved it.

WHEN a moderator approves a report on a post, THE system SHALL delete all comments on that post.

WHEN a moderator approves a report on a comment, THE system SHALL preserve other comments on the post.

WHEN a moderator approves a report, THE system SHALL prevent further action on that report.

IF the content has already been deleted, THEN THE system SHALL prevent approval.

IF the content has already been approved for removal, THEN THE system SHALL prevent duplicate approval.

### Reporter Feedback

WHEN a user submits a report, THE system SHALL allow the user to view their submitted reports.

WHEN a user views their reports, THE system SHALL display the status of each report.

WHEN a user views their reports, THE system SHALL show the reported content reference.

WHEN a user views their reports, THE system SHALL show the submission timestamp.

WHEN a report status changes, THE system SHALL update the status visible to the reporter.

WHEN a report is approved, THE system SHALL indicate the content has been removed.

WHEN a report is dismissed, THE system SHALL indicate the report was not actioned.

IF a user views a report for deleted content, THEN THE system SHALL show the content as unavailable.

IF a user views a report for content they no longer have access to, THEN THE system SHALL hide the content details.

## Moderator User Scenarios

Community owners can add moderators to help manage their communities. Moderators can delete inappropriate posts or comments from their community. When a moderator deletes content, it is immediately hidden from all users. Moderators can ban users who violate community guidelines. Banned users cannot post or comment but can still read content. Owners can remove moderator privileges at any time. Moderators can view all reports submitted against their community content.

### Moderator Appointment

WHEN a community owner adds a moderator, THE system SHALL:
1. Assign the moderator role to the specified user
2. Grant the user moderation privileges for that community
3. Record the appointment timestamp

WHEN a moderator adds another moderator, THE system SHALL:
1. Assign the moderator role to the specified user
2. Grant the user moderation privileges for that community
3. Record the appointment timestamp

IF the user being added is already a moderator, THE system SHALL reject the request.

IF the user being added is banned from the community, THE system SHALL reject the request.

IF the requester is not the owner or an existing moderator, THE system SHALL reject the request.

WHILE a user has moderator privileges, THE system SHALL:
1. Allow them to delete posts in the community
2. Allow them to delete comments in the community
3. Allow them to ban users from the community
4. Allow them to unban users from the community
5. Allow them to view and manage reports
6. Allow them to add other moderators

### Content Moderation

WHEN a moderator deletes a post, THE system SHALL:
1. Immediately hide the post from all users
2. Remove all votes on the post
3. Remove all comments on the post
4. Adjust karma scores for affected users
5. Record the deletion action

WHEN a moderator deletes a comment, THE system SHALL:
1. Immediately hide the comment from all users
2. Remove all votes on the comment
3. Remove all replies to the comment
4. Adjust karma scores for affected users
5. Record the deletion action

IF the content being deleted no longer exists, THE system SHALL reject the request.

IF the requester is not a moderator of that community, THE system SHALL reject the request.

IF the content is not in the moderator's community, THE system SHALL reject the request.

WHEN content is deleted by a moderator, THE system SHALL:
1. Prevent the original author from restoring it
2. Prevent other moderators from viewing it
3. Remove it from all feeds and search results

### User Banning

WHEN a moderator bans a user, THE system SHALL:
1. Prevent the user from creating posts in the community
2. Prevent the user from creating comments in the community
3. Allow the user to view content in the community
4. Record the ban with timestamp and reason
5. Add the user to the banned users list

WHEN a moderator unbans a user, THE system SHALL:
1. Restore the user's ability to post in the community
2. Restore the user's ability to comment in the community
3. Remove the ban record
4. Remove the user from the banned users list

IF the user is already banned, THE system SHALL reject the ban request.

IF the user is not banned, THE system SHALL reject the unban request.

IF the requester is not a moderator of that community, THE system SHALL reject the request.

WHEN viewing the banned users list, THE system SHALL:
1. Show all currently banned users
2. Display ban reasons and timestamps
3. Allow moderators to unban users from the list

### Moderator Removal

WHEN a community owner removes a moderator, THE system SHALL:
1. Revoke all moderation privileges from that user
2. Remove them from the moderator list
3. Record the removal action

IF the user being removed is the owner, THE system SHALL reject the request.

IF the requester is not the owner, THE system SHALL reject the request.

IF the user being removed is not a moderator, THE system SHALL reject the request.

WHEN a moderator attempts to remove another moderator, THE system SHALL reject the request.

WHEN a moderator is removed, THE system SHALL:
1. Prevent them from performing moderation actions
2. Remove their access to moderation tools
3. Preserve their ability to post and comment as a regular member

### Report Management

WHEN a moderator views reports, THE system SHALL:
1. Display all pending reports for the community
2. Show the reported content
3. Show who reported it
4. Show the report reason
5. Show when the report was submitted

WHEN a moderator approves a report, THE system SHALL:
1. Delete the reported content
2. Remove the report from the pending list
3. Record the approval action
4. Notify the reporting user if configured

WHEN a moderator dismisses a report, THE system SHALL:
1. Keep the reported content visible
2. Remove the report from the list
3. Record the dismissal action

IF the reported content no longer exists, THE system SHALL automatically dismiss the report.

IF the requester is not a moderator of that community, THE system SHALL reject the request.

WHEN viewing reports, THE system SHALL:
1. Show only reports for the moderator's community
2. Display reports in chronological order
3. Separate pending from resolved reports

## Ban User Scenarios

When a user is banned from a community, they lose posting and commenting privileges there. Banned users can still view all content but cannot participate actively. Moderators can lift bans at any time, restoring full privileges. The system tracks when bans were imposed and when they were lifted. Banned users receive no special notification when their ban is lifted. Users can view the list of all currently banned users in their community.

### User Banning Process

WHEN a moderator initiates a ban on a user in their community, THE system SHALL require the moderator to provide a reason for the ban.

WHEN a moderator confirms the ban action, THE system SHALL immediately revoke the user's posting privileges in that community.

WHEN a moderator confirms the ban action, THE system SHALL immediately revoke the user's commenting privileges in that community.

WHEN a user is banned from a community, THE system SHALL record the exact timestamp when the ban was imposed.

WHEN a moderator bans a user, THE system SHALL associate the ban with the specific community where the violation occurred.

IF a user is already banned from a community, THEN THE system SHALL prevent duplicate ban actions on that user.

WHEN a user is banned, THE system SHALL retain all existing content created by that user in the community.

WHEN a moderator enforces a ban, THE system SHALL apply the restriction immediately without requiring user action.

WHEN a user attempts to create a post in a community where they are banned, THE system SHALL reject the request.

WHEN a user attempts to create a comment in a community where they are banned, THE system SHALL reject the request.

### Privilege Revocation and Restricted Participation

WHEN a user is banned from a community, THE system SHALL prevent them from creating new posts in that community.

WHEN a user is banned from a community, THE system SHALL prevent them from creating new comments in that community.

WHEN a user is banned from a community, THE system SHALL still allow them to view all posts in that community.

WHEN a user is banned from a community, THE system SHALL still allow them to view all comments in that community.

WHEN a user is banned from a community, THE system SHALL still allow them to view the community's subscriber list.

WHEN a user is banned from a community, THE system SHALL still allow them to subscribe or unsubscribe from that community.

WHEN a user is banned from a community, THE system SHALL still allow them to upvote or downvote posts in that community.

WHEN a user is banned from a community, THE system SHALL still allow them to upvote or downvote comments in that community.

WHEN a user is banned from a community, THE system SHALL still allow them to report posts or comments in that community.

IF a banned user attempts to post in their banned community, THEN THE system SHALL display a message indicating they are banned from participating.

### Ban Lifting Process

WHEN a moderator lifts a ban on a user, THE system SHALL immediately restore the user's posting privileges in that community.

WHEN a moderator lifts a ban on a user, THE system SHALL immediately restore the user's commenting privileges in that community.

WHEN a moderator lifts a ban, THE system SHALL record the exact timestamp when the ban was lifted.

WHEN a ban is lifted, THE system SHALL retain the historical record of when the ban was originally imposed.

WHEN a ban is lifted, THE system SHALL update the user's status in the banned users list to reflect the unban.

IF a user's ban is lifted, THEN THE system SHALL NOT send any notification to the user about the ban being lifted.

WHEN a moderator lifts a ban, THE system SHALL allow the user to immediately create posts in that community.

WHEN a moderator lifts a ban, THE system SHALL allow the user to immediately create comments in that community.

WHEN a ban is lifted, THE system SHALL maintain all content created by the user before and after the ban period.

IF a user attempts to post immediately after their ban is lifted, THEN THE system SHALL allow the post creation without delay.

### Banned Users List and Ban History

WHEN a moderator views the banned users list, THE system SHALL display all users currently banned from that community.

WHEN a moderator views the banned users list, THE system SHALL show the username of each banned user.

WHEN a moderator views the banned users list, THE system SHALL show when each user was banned.

WHEN a moderator views the banned users list, THE system SHALL show the reason for each ban.

WHEN a moderator views the banned users list, THE system SHALL indicate which users have had their bans lifted.

WHEN a user is unbanned, THE system SHALL remove them from the active banned users list.

WHEN a user is unbanned, THE system SHALL retain their ban record in the historical ban list.

WHEN a moderator views the ban history, THE system SHALL display all past bans regardless of current status.

WHEN a moderator views the ban history, THE system SHALL show both the ban date and the unban date for lifted bans.

WHEN a moderator views the ban history, THE system SHALL allow filtering by current status (active or lifted).

## Block User Scenarios

Users can block other users to prevent their own content from appearing in the blocker's view. When blocking someone, their future posts and comments become invisible to the blocker. Blocked users are not notified of the block action. Users can unblock others at any time from their settings. The system remembers all active blocks to filter content dynamically. Users can view their current block list to manage who they're avoiding.

### User Blocking Flow

WHEN a logged-in user blocks another user, THE system SHALL:
1. Record the block relationship between the blocker and the blocked user
2. Prevent the blocked user's posts from appearing in the blocker's feeds
3. Prevent the blocked user's comments from appearing in the blocker's view
4. Hide the blocked user's profile from the blocker's search results
5. Not notify the blocked user about being blocked

IF a user attempts to block themselves, THEN THE system SHALL reject the request.

IF a user attempts to block someone they have already blocked, THEN THE system SHALL maintain the existing block without creating a duplicate.

WHEN a user blocks another user, THE system SHALL timestamp the block action for audit purposes.

### Content Filtering Behavior

WHILE a user is blocked by another user, THE system SHALL:
1. Filter out all posts created by the blocked user from the blocker's home feed
2. Filter out all posts created by the blocked user from the blocker's community feeds
3. Filter out all comments created by the blocked user from the blocker's view
4. Prevent the blocked user's content from appearing in search results viewed by the blocker

WHEN the blocker views a post that was created by a blocked user, THE system SHALL:
1. Hide the post from the feed listing
2. Hide any comments from the blocked user within that post

WHEN the blocker views a comment thread, THE system SHALL:
1. Hide all top-level comments from blocked users
2. Hide all nested replies from blocked users
3. Display the remaining visible content without gaps indicating hidden content

### Block List Management

WHEN a logged-in user views their block list, THE system SHALL:
1. Display all users that the logged-in user has blocked
2. Show the username of each blocked user
3. Show when each user was blocked
4. Provide an option to unblock each user

WHEN a user accesses their block list, THE system SHALL:
1. Require the user to be logged in
2. Display the block list in chronological order (most recent first)
3. Allow pagination if the block list exceeds display limits

IF a user has no blocked users, THEN THE system SHALL display an empty state message.

### Unblocking Process

WHEN a logged-in user unblocks another user, THE system SHALL:
1. Remove the block relationship between the users
2. Allow the previously blocked user's content to appear in the blocker's feeds
3. Allow the previously blocked user's profile to appear in search results
4. Not notify the unblocked user about being unblocked

IF a user attempts to unblock someone they have not blocked, THEN THE system SHALL reject the request.

WHEN a user unblocks another user, THE system SHALL:
1. Record the unblock timestamp
2. Maintain the block history for audit purposes
3. Allow the user to block the same user again in the future if needed

### Selective Visibility Rules

WHEN a user blocks another user, THE system SHALL:
1. Hide the blocked user's posts from the blocker's view
2. Hide the blocked user's comments from the blocker's view
3. Hide the blocked user's profile from the blocker's search results
4. Allow the blocked user to still view the blocker's public content
5. Allow the blocked user to still interact with the blocker's content (vote, comment)

WHEN content is filtered due to a block, THE system SHALL:
1. Not display any indication that content was hidden
2. Not show placeholder text or gaps where blocked content would appear
3. Continue to display other content normally

IF a blocked user's content is the only content in a community, THEN THE system SHALL:
1. Show the community as empty to the blocker
2. Not display error messages about missing content

### Privacy and Harassment Prevention

WHEN a user blocks another user, THE system SHALL:
1. Keep the block action private from the blocked user
2. Keep the block action private from other users
3. Not display block relationships in any public view
4. Not include block information in user profiles

WHEN handling harassment prevention through blocking, THE system SHALL:
1. Allow users to block others without providing a reason
2. Allow users to block others without moderator approval
3. Allow users to unblock others at any time
4. Ensure blocking takes effect immediately

IF a user is blocked by multiple users, THEN THE system SHALL:
1. Maintain each block relationship independently
2. Apply filtering for each blocker individually
3. Not aggregate or display block counts publicly

# File Storage

File upload capabilities, media processing, and storage requirements.

## File Upload and Management

Define file upload capabilities, supported formats, processing requirements, and access control for stored files.

### User Avatar Upload

WHEN a user uploads an avatar image, THE system SHALL:
1. Accept the image file for storage
2. Associate the uploaded image with the user's profile
3. Display the uploaded image on the user's profile page

WHEN a user replaces their avatar, THE system SHALL:
1. Accept the new image file
2. Replace the previous avatar with the new image
3. Display the updated image on the user's profile page

WHEN a user deletes their account, THE system SHALL:
1. Remove the user's avatar image from storage
2. Ensure the avatar is no longer accessible

IF a user attempts to upload an unsupported image format, THE system SHALL reject the upload.

IF a user attempts to upload an image file that exceeds the size limit, THE system SHALL reject the upload.

### Community Icon Upload

WHEN a user creates a community with an icon, THE system SHALL:
1. Accept the icon image file for storage
2. Associate the uploaded icon with the community
3. Display the icon on the community page

WHEN a community owner uploads a new icon, THE system SHALL:
1. Accept the new image file
2. Replace the previous icon with the new image
3. Display the updated icon on the community page

WHEN a community is deleted, THE system SHALL:
1. Remove the community's icon image from storage
2. Ensure the icon is no longer accessible

IF a community owner attempts to upload an unsupported image format, THE system SHALL reject the upload.

IF a community owner attempts to upload an icon file that exceeds the size limit, THE system SHALL reject the upload.

### Image Post Upload

WHEN a user creates an image post, THE system SHALL:
1. Accept the image file for storage
2. Associate the uploaded image with the post
3. Display the image as the post content

WHEN a user edits an image post, THE system SHALL:
1. Allow the user to replace the existing image
2. Accept the new image file for storage
3. Display the updated image as the post content

WHEN a user deletes an image post, THE system SHALL:
1. Remove the post's image from storage
2. Ensure the image is no longer accessible

IF a user attempts to upload an image for a post that exceeds the size limit, THE system SHALL reject the upload.

IF a user attempts to upload an unsupported image format for a post, THE system SHALL reject the upload.

### File Storage and Access Control

WHEN a file is uploaded by any user, THE system SHALL:
1. Store the file in a secure location
2. Generate a unique identifier for the file
3. Track the file's association with the uploading user and content

WHEN a user views content with an uploaded image, THE system SHALL:
1. Retrieve the stored image file
2. Display the image to the user

WHEN content containing an uploaded file is deleted, THE system SHALL:
1. Remove the associated file from storage
2. Ensure the file is no longer accessible to any user

IF a user attempts to access a file that has been deleted, THE system SHALL prevent access.

IF a user attempts to access a file that does not belong to visible content, THE system SHALL prevent access.

THE system SHALL ensure that uploaded files are only accessible through their associated content.

THE system SHALL maintain file integrity during storage and retrieval operations.