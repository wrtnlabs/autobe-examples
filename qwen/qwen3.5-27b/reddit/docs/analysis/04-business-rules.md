**redditClone — Business rules, validation constraints, data browsing expectations, error scenarios**

Business rules, validation constraints, data browsing expectations, error scenarios

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## User Rules

Users must sign up with a valid email and password, and choose a unique username that no other user has. Each user has a single karma score that starts at zero and can become negative. When users upvote another user's post or comment, the author's karma increases by one point. When users downvote content, the author's karma decreases by one point. Karma adjusts automatically when votes are changed or removed. Users can update their display name, bio text, and avatar image at any time. When a user deletes their account, all posts and comments they created are permanently removed from the system. The username must be unique across the entire platform and cannot be changed after account creation. Users can view any other user's profile page to see their display information and content history.

### User Signup Validation

WHEN a user registers for an account, THE system SHALL require a valid email address and password. THE system SHALL reject registration if the email format is invalid. THE system SHALL require a unique username during registration that no other user currently possesses. THE system SHALL reject registration if the chosen username is already in use by another user.

### Username Uniqueness Constraint

THE username must be unique across the entire platform at all times. IF a user attempts to register with a username that already exists, THEN THE system SHALL reject the registration request. THE username cannot be changed after account creation. THE system SHALL prevent any modification of the username once the account is created.

### Karma Score Calculation

THE system SHALL maintain a single karma score for each user that starts at zero. THE karma score can be negative. WHEN a user receives an upvote on their post, THE system SHALL increase their karma score by one point. WHEN a user receives an upvote on their comment, THE system SHALL increase their karma score by one point. WHEN a user receives a downvote on their post, THE system SHALL decrease their karma score by one point. WHEN a user receives a downvote on their comment, THE system SHALL decrease their karma score by one point. WHEN a user removes their vote on another user's post or comment, THE system SHALL adjust the karma score accordingly. WHEN a user changes their vote from upvote to downvote, THE system SHALL adjust the karma score by subtracting two points. WHEN a user changes their vote from downvote to upvote, THE system SHALL adjust the karma score by adding two points.

### Profile Display Name Editing

THE system SHALL allow users to update their display name at any time. THE display name can be changed multiple times throughout the account lifecycle. THE display name is separate from the username and can be different from it.

### Profile Bio Editing

THE system SHALL allow users to update their bio text at any time. THE bio text can be modified multiple times throughout the account lifecycle. THE bio text is optional and can be left empty.

### Profile Avatar Editing

THE system SHALL allow users to update their avatar image at any time. THE avatar image can be replaced multiple times throughout the account lifecycle. THE avatar image is optional and users may choose not to have one.

### Account Deletion Cascades

WHEN a user deletes their account, THE system SHALL mark all posts they created as deleted. WHEN a user deletes their account, THE system SHALL mark all comments they created as deleted. WHEN a user deletes their account, THE system SHALL mark all their subscriptions to communities as deleted. WHEN a user deletes their account, THE system SHALL mark all their votes on posts and comments as deleted. WHEN a user deletes their account, THE system SHALL mark all their reports as deleted.

### User Profile Viewing

THE system SHALL allow any user to view any other user's profile page. THE system SHALL allow guests to view user profile pages. WHEN viewing a user's profile, THE system SHALL display their display name, bio text, and avatar image. WHEN viewing a user's profile, THE system SHALL display their total karma score. WHEN viewing a user's profile, THE system SHALL display a list of all posts they have created. WHEN viewing a user's profile, THE system SHALL display a list of all comments they have written.

## Community Rules

Any registered user can create a new community on the platform. Each community must have a unique name that no other community uses. The community creator automatically becomes the owner with highest authority over that community. Communities require a description text and an icon image to be displayed. The system tracks and displays the total subscriber count for each community. Community names must be unique across the entire platform. The owner has full control over community settings and can assign moderator roles to other users. Communities can be browsed in a list view and searched by name. All community content is visible to everyone, whether logged in or not.

### Community Creation Validation

THE system SHALL allow any registered user to create a new community.

WHEN a user creates a community, THE system SHALL require a unique community name.

WHEN a user creates a community, THE system SHALL require a description text.

WHEN a user creates a community, THE system SHALL require an icon image.

IF the community name already exists on the platform, THEN THE system SHALL reject the community creation request.

IF the description text is missing or empty, THEN THE system SHALL reject the community creation request.

IF the icon image is missing or invalid, THEN THE system SHALL reject the community creation request.

### Community Ownership

WHEN a user creates a community, THE system SHALL automatically assign the creator as the owner of that community.

THE owner of a community SHALL have the highest authority over that community.

### Community Discovery

THE system SHALL allow users to search for communities by name.

THE system SHALL make all community content visible to everyone, including users who are not logged in.

THE system SHALL update the subscriber count whenever a user subscribes to a community.

THE system SHALL update the subscriber count whenever a user unsubscribes from a community.

## Post Rules

Users can only create posts in communities they are subscribed to. Every post must have a title, which is required and cannot be empty. Posts must be one of three types: text posts with content, link posts with a URL, or image posts with an uploaded image. Users can edit their own posts at any time after creation. Users can delete their own posts permanently. When viewing a single post, the system displays the title, full content, author, community, vote score, comment count, and posting time. Text posts show the first 200 characters in list views. Image posts display a thumbnail in list views. Link posts show the domain name of the URL in list views.

### Post Creation Validation

THE system SHALL reject post creation if the user is not subscribed to the target community.

THE system SHALL reject post creation if the title is missing or empty.

THE system SHALL reject post creation if no post type is selected.

THE system SHALL reject post creation if the selected post type does not have its required content.

A post must be one of three types: text post with text content, link post with a URL, or image post with an uploaded image.

Text posts require text content to be provided at creation.

Link posts require a valid URL to be provided at creation.

Image posts require an image file to be uploaded at creation.

### Post Editing and Deletion Rules

Users can edit their own posts at any time after creation.

Users can delete their own posts; deleted posts are permanently removed from the system.

THE system SHALL allow the post owner to modify the title of their post.

THE system SHALL allow the post owner to modify the content of their post based on the post type.

THE system SHALL permanently delete the post when deleted by its owner, removing all data from the system.

IF a user attempts to edit a post they do not own, THEN THE system SHALL reject the request.

IF a user attempts to delete a post they do not own, THEN THE system SHALL reject the request.

### Post List Display Rules

In list views, text posts display the first 200 characters of content.

In list views, image posts display a thumbnail of the image.

In list views, link posts display the domain name of the URL.

In list views, all posts display the title, author username, community name, vote score, comment count, and time since posted.

THE system SHALL truncate text post content to 200 characters in list views.

THE system SHALL generate and display a thumbnail for image posts in list views.

THE system SHALL extract and display the domain name from URLs for link posts in list views.

### Post Single View Display Rules

When viewing a single post, the system displays the title, full content, author, community, vote score, comment count, and posting time.

THE system SHALL display the complete text content for text posts in single view.

THE system SHALL display the full URL for link posts in single view.

THE system SHALL display the full image for image posts in single view.

THE system SHALL show the author's username for the post.

THE system SHALL show the community name where the post was created.

THE system SHALL show the current vote score for the post.

THE system SHALL show the total number of comments on the post.

THE system SHALL show when the post was created.

## Comment Rules

Users can write comments on any post in the system. Users can reply to any existing comment, creating nested discussion threads. There is no depth limit on comment replies, allowing unlimited nesting. Users can edit their own comments after posting. Users can delete their own comments permanently. Each comment displays the author, content, vote score, time since posting, and any nested replies. Comments can be sorted by best, new, or controversial order. The best sort shows highest vote score first. The new sort shows most recent comments first. The controversial sort shows comments with many votes but scores close to zero.

### Comment Creation Rules

THE system SHALL allow users to create comments on any post.

IF a comment content is empty or missing, THEN THE system SHALL reject the comment creation request.

IF the target post does not exist, THEN THE system SHALL reject the comment creation request.

IF the user is banned from the community containing the post, THEN THE system SHALL reject the comment creation request.

THE system SHALL automatically associate a created comment with the creating user.

THE system SHALL automatically associate a created comment with the target post.

THE system SHALL record the comment creation time for sorting and display purposes.

### Comment Reply Rules

THE system SHALL allow users to reply to any existing comment.

THE system SHALL treat a reply as a comment that references another comment as its parent.

THE system SHALL allow unlimited nesting depth for comment replies.

THE system SHALL allow replies to have replies, creating nested discussion threads.

THE system SHALL associate a reply with both the original post and the parent comment.

IF the parent comment does not exist, THEN THE system SHALL reject the reply creation request.

IF the parent comment has been deleted, THEN THE system SHALL reject the reply creation request.

IF the user is banned from the community containing the post, THEN THE system SHALL reject the reply creation request.

THE system SHALL display nested replies hierarchically, showing parent-child relationships.

### Comment Editing and Deletion Rules

THE system SHALL allow users to edit comments they have created.

THE system SHALL allow users to edit their comments at any time after creation.

THE system SHALL preserve the original creation time when a comment is edited.

THE system SHALL allow users to delete comments they have created.

THE system SHALL permanently delete a comment when requested by its owner.

THE system SHALL permanently delete all replies to a comment when that comment is deleted.

IF a user attempts to edit a comment they do not own, THEN THE system SHALL reject the request.

IF a user attempts to delete a comment they do not own, THEN THE system SHALL reject the request.

IF a user attempts to edit or delete a comment that does not exist, THEN THE system SHALL reject the request.

THE system SHALL NOT allow recovery or restoration of deleted comments.

THE system SHALL allow moderators to delete any comment in their community regardless of ownership.

### Comment Display Rules

THE system SHALL display the username of the user who created each comment.

THE system SHALL display the full text content of each comment.

THE system SHALL display the current vote score for each comment.

THE system SHALL display the time elapsed since each comment was posted.

THE system SHALL display nested replies in a hierarchical structure for each comment.

IF a comment has been deleted, THEN THE system SHALL not display it in any view.

THE system SHALL calculate the vote score as total upvotes minus total downvotes.

THE system SHALL display time as relative time from the current moment.

THE system SHALL display comments without replies without any nested content area.

### Comment Sorting Rules

THE system SHALL allow sorting comments by best, new, or controversial order.

THE system SHALL display comments with the highest vote score first when sorting by best.

THE system SHALL display the most recently created comments first when sorting by new.

THE system SHALL display comments with many votes but scores close to zero first when sorting by controversial.

THE system SHALL place comments with higher vote scores before comments with lower vote scores in best sort order.

THE system SHALL place comments created more recently before older comments in new sort order.

THE system SHALL place comments with high total vote count but low net score first in controversial sort order.

THE system SHALL use best as the default sort order for comments.

THE system SHALL allow users to change the sort order at any time while viewing comments.

THE system SHALL apply the same sort order to nested replies as their parent comment level.

## Vote Rules

Users can upvote or downvote any post or comment in the system. An upvote adds one point to the item's vote score. A downvote subtracts one point from the item's vote score. Each user can only vote once per post or comment. Users can change their vote from upvote to downvote or vice versa. Users can remove their vote entirely, which adjusts the score accordingly. The vote score equals total upvotes minus total downvotes. When votes are added, changed, or removed, the author's karma adjusts automatically. Karma increases by one for each upvote on their content. Karma decreases by one for each downvote on their content.

### Vote Mechanics

An upvote on a post or comment adds one point to that item's vote score. A downvote on a post or comment subtracts one point from that item's vote score. Users can upvote or downvote any post in the system. Users can upvote or downvote any comment in the system.

### Vote Constraints

Each user can only cast one vote per post. Each user can only cast one vote per comment. If a user attempts to vote on a post they have already voted on, their previous vote is replaced with the new vote. If a user attempts to vote on a comment they have already voted on, their previous vote is replaced with the new vote.

### Vote Modification

Users can change their vote from an upvote to a downvote on any post or comment. Users can change their vote from a downvote to an upvote on any post or comment. Users can remove their vote entirely from any post or comment. When a user removes their vote, the item's vote score adjusts accordingly.

### Vote Score Calculation

The vote score of a post or comment equals the total number of upvotes minus the total number of downvotes. The vote score is calculated in real time as votes are added, changed, or removed. Vote scores can be negative when downvotes exceed upvotes.

### Karma Impact from Votes

When a vote is added, changed, or removed on a user's post or comment, that user's karma score adjusts automatically. When someone upvotes a user's post or comment, that user's karma increases by one point. When someone downvotes a user's post or comment, that user's karma decreases by one point. When someone removes their vote on a user's post or comment, the user's karma adjusts by the opposite amount. A user's karma can be negative if their content receives more downvotes than upvotes.

### Vote Applicability

Votes can be cast on posts regardless of the post type (text, link, or image). Votes can be cast on comments regardless of the comment's position in the reply hierarchy. Users can vote on posts and comments in communities they are subscribed to. Users can vote on posts and comments in communities they are not subscribed to. Guests can vote on posts and comments in the popular feed and community feeds.

## Subscription Rules

Users can subscribe to any community on the platform. Users can unsubscribe from any community they are currently subscribed to. Users can view a complete list of all communities they are subscribed to. Subscribing to a community is required before creating posts in that community. The home feed only shows posts from communities the user is subscribed to. The home feed is only available to logged-in users. Users can subscribe to multiple communities simultaneously. There is no limit on the number of communities a user can subscribe to. Subscription status determines post creation permissions in each community.

### Subscription Creation Rules

WHEN a user subscribes to a community, THE system SHALL create a subscription record linking the user to that community.

WHEN a user subscribes to a community they are already subscribed to, THE system SHALL reject the request without creating a duplicate subscription.

WHEN a user subscribes to a community, THE system SHALL immediately grant them permission to create posts in that community.

IF the requested community does not exist, THEN THE system SHALL reject the subscription request.

IF the user is not logged in, THEN THE system SHALL reject the subscription request.

### Subscription Removal Rules

WHEN a user unsubscribes from a community, THE system SHALL remove the subscription record linking the user to that community.

WHEN a user unsubscribes from a community, THE system SHALL immediately revoke their permission to create new posts in that community.

WHEN a user unsubscribes from a community, THE system SHALL preserve all posts and comments the user previously created in that community.

WHEN a user unsubscribes from a community they are not subscribed to, THE system SHALL reject the request without error.

IF the requested community does not exist, THEN THE system SHALL reject the unsubscription request.

IF the user has no active subscription to the community, THEN THE system SHALL reject the unsubscription request.

IF the user is not logged in, THEN THE system SHALL reject the unsubscription request.

### Subscription List Viewing Rules

WHEN a user views their subscribed communities list, THE system SHALL display all communities the user is currently subscribed to.

WHEN a user views their subscribed communities list, THE system SHALL show the community name, description, icon, and subscriber count for each community.

WHEN a user views their subscribed communities list, THE system SHALL order communities by most recently subscribed first.

WHEN a user views their subscribed communities list, THE system SHALL paginate the results if the list exceeds the display limit.

IF the user has no subscriptions, THEN THE system SHALL display an empty list with appropriate messaging.

IF the user is not logged in, THEN THE system SHALL not display the subscribed communities list.

### Posting Permission Rules

WHEN a user attempts to create a post in a community, THE system SHALL verify the user is subscribed to that community.

IF the user is not subscribed to the community, THEN THE system SHALL reject the post creation request.

IF the user is subscribed to the community, THEN THE system SHALL allow the post creation request to proceed.

IF the user is banned from the community, THEN THE system SHALL reject the post creation request regardless of subscription status.

IF the user's account is deactivated, THEN THE system SHALL prevent any post creation in all communities.

WHEN a user unsubscribes from a community, THE system SHALL prevent them from creating new posts in that community while preserving their existing posts.

### Home Feed Access Rules

WHEN a logged-in user accesses the home feed, THE system SHALL display only posts from communities the user is subscribed to.

WHEN a logged-in user accesses the home feed, THE system SHALL exclude posts from communities the user is not subscribed to.

WHEN a logged-in user accesses the home feed, THE system SHALL apply the selected sorting option to order posts.

WHEN a logged-in user accesses the home feed, THE system SHALL paginate the results if posts exceed the display limit.

IF the user is not logged in, THEN THE system SHALL not provide access to the home feed.

IF the user is not subscribed to any communities, THEN THE system SHALL display an empty home feed with appropriate messaging.

IF a subscribed community is deactivated, THEN THE system SHALL exclude posts from that community in the home feed.

### Subscription Capacity Rules

WHEN a user subscribes to communities, THE system SHALL allow multiple simultaneous subscriptions to different communities.

WHEN a user subscribes to communities, THE system SHALL not impose a maximum limit on the number of communities the user can subscribe to.

WHEN a user subscribes to communities, THE system SHALL maintain each subscription independently without affecting other subscriptions.

WHEN a user subscribes to a community, THE system SHALL not automatically subscribe to related or recommended communities.

WHEN a user unsubscribes from a community, THE system SHALL not affect the user's subscriptions to other communities.

## Moderation Rules

The community creator is automatically the owner with highest authority. The owner can add other users as moderators in their community. The owner can remove moderators from their community at any time. Moderators can add other moderators to the community. Moderators cannot remove the owner from the community. Moderators cannot remove other moderators, only the owner can do this. Moderators can delete any post in their community. Moderators can delete any comment in their community. Moderators can ban users from their community. Moderators can unban previously banned users. Moderators can view the list of all banned users in their community.

### Owner Authority and Creation

WHEN a user creates a community, THE system SHALL automatically assign the owner role to that user.

THE owner of a community SHALL have the highest authority in that community.

IF a moderator attempts to remove the owner, THEN THE system SHALL reject the request.

IF a user who is not the owner attempts to remove a moderator, THEN THE system SHALL reject the request.

### Moderator Assignment Rules

THE owner SHALL be able to add other users as moderators to their community.

THE owner SHALL be able to remove moderators from their community at any time.

A moderator SHALL be able to add other users as moderators in their community.

IF a moderator attempts to remove another moderator, THEN THE system SHALL reject the request.

IF a user who is not a moderator or owner attempts to add a moderator, THEN THE system SHALL reject the request.

IF a user is already a moderator in a community, THEN THE system SHALL prevent duplicate moderator assignments.

### Content Moderation Actions

A moderator SHALL be able to delete any post in their community regardless of who created it.

A moderator SHALL be able to delete any comment in their community regardless of who created it.

IF a user who is not a moderator or owner attempts to delete another user's post, THEN THE system SHALL reject the request.

IF a user who is not a moderator or owner attempts to delete another user's comment, THEN THE system SHALL reject the request.

IF a moderator attempts to delete content from a community where they do not have moderator privileges, THEN THE system SHALL reject the request.

WHEN content is deleted, THE system SHALL permanently remove it from the system.

### Ban Management Authority

A moderator SHALL be able to ban any user from their community.

A moderator SHALL be able to unban any previously banned user in their community.

A moderator SHALL be able to view the complete list of banned users in their community.

IF a user who is not a moderator or owner attempts to ban another user, THEN THE system SHALL reject the request.

IF a user who is not a moderator or owner attempts to unban a user, THEN THE system SHALL reject the request.

IF a user attempts to ban themselves, THEN THE system SHALL reject the request.

## Ban Rules

Moderators can ban users from their community. Banned users cannot create posts in the banned community. Banned users cannot create comments in the banned community. Banned users can still view all content in the banned community. Moderators can unban users to restore their posting privileges. Moderators can view the complete list of banned users in their community. Ban status is specific to each community and does not affect other communities. Banned users retain their account and can use other communities normally. The ban only restricts participation in the specific community where the ban was applied.

### Moderator Ban Actions

WHEN a moderator wants to ban a user from their community, THE system SHALL allow the moderator to ban that user.

WHEN a moderator wants to unban a user from their community, THE system SHALL allow the moderator to restore the user's posting privileges.

IF a user is not banned from the community, THEN THE system SHALL reject the unban request.

IF the user attempting to ban is not a moderator of the community, THEN THE system SHALL reject the ban request.

IF the user attempting to unban is not a moderator of the community, THEN THE system SHALL reject the unban request.

WHEN a moderator bans a user, THE system SHALL record which moderator performed the ban and when the ban was applied.

### Banned User Participation Restrictions

WHILE a user is banned from a community, THE system SHALL prevent the user from creating posts in that community.

WHILE a user is banned from a community, THE system SHALL prevent the user from creating comments in that community.

WHILE a user is banned from a community, THE system SHALL allow the user to view all posts in that community.

WHILE a user is banned from a community, THE system SHALL allow the user to view all comments in that community.

WHILE a user is banned from a community, THE system SHALL allow the user to view the community page and its content.

WHEN a banned user attempts to create a post in the banned community, THE system SHALL reject the request.

WHEN a banned user attempts to create a comment in the banned community, THE system SHALL reject the request.

### Ban Scope and Account Impact

WHILE a user is banned from one community, THE system SHALL allow the user to participate in all other communities normally.

WHILE a user is banned from a community, THE system SHALL retain the user's account and all account data.

WHILE a user is banned from a community, THE system SHALL allow the user to log in and access the platform.

WHILE a user is banned from a community, THE system SHALL allow the user to create posts in communities where they are not banned.

WHILE a user is banned from a community, THE system SHALL allow the user to create comments in communities where they are not banned.

WHILE a user is banned from a community, THE system SHALL allow the user to view their profile and activity in other communities.

A ban applies only to the specific community where it was issued and does not extend to other communities on the platform.

### Banned Users List

WHEN a moderator views the banned users list for their community, THE system SHALL display all users currently banned from that community.

WHEN a moderator views the banned users list, THE system SHALL show which user was banned.

WHEN a moderator views the banned users list, THE system SHALL show which moderator banned each user.

WHEN a moderator views the banned users list, THE system SHALL show when each ban was applied.

IF a user is not banned from the community, THEN THE system SHALL not display them in the banned users list.

IF the user viewing the list is not a moderator of the community, THEN THE system SHALL not allow access to the banned users list.

## Report Rules

Users can report any post or comment they find problematic. When reporting content, users must provide a reason in text format. Moderators can view all reports for their community. Each report shows the reported content, who reported it, and the reason provided. Moderators can approve a report, which deletes the reported content. Moderators can dismiss a report, which keeps the content visible. Dismissed reports are removed from the report list. Reports help moderators identify and handle problematic content. The reporting system allows community members to flag content for review.

### Report Creation Rules

Users can report any post they find problematic. Users can report any comment they find problematic. When reporting content, users must provide a reason in text format. The reason text is required and cannot be empty. Reports can only be submitted by logged-in users. Each report is associated with the community where the reported content exists. Users cannot report content in communities where they are banned.

### Report Information Display

Each report displays the reported content (post or comment). Each report displays the username of the user who submitted the report. Each report displays the reason text provided by the reporter. Moderators can view all reports for their community. Only moderators of a community can view reports for that community. Reports show the date and time when the report was submitted.

### Report Resolution Rules

Moderators can approve a report, which marks the reported content as deleted. When a report is approved, the associated post or comment is hard-deleted and no longer visible to users. Moderators can dismiss a report, which keeps the reported content visible. When a report is dismissed, the content remains unchanged and accessible. Dismissed reports are automatically removed from the report list. Only moderators can approve or dismiss reports. Once a report is resolved (approved or dismissed), it cannot be changed.

### Report Error Conditions

If a user attempts to report without providing a reason, the report is rejected. If a user attempts to report content that does not exist, the report is rejected. If a user attempts to report content in a community where they are banned, the report is rejected. If a non-moderator attempts to view reports, access is denied. If a moderator attempts to view reports for a community they do not moderate, access is denied. If a moderator attempts to approve or dismiss a report that has already been resolved, the action is rejected.

# Data Browsing Expectations

Business expectations for how users browse, find, and navigate through lists of data.

## List Browsing Expectations

Define business expectations for how users find, filter, and browse lists.

### Filtering Rules

WHEN a user searches for communities, THE system SHALL filter and display communities matching the search term by name.

WHEN viewing the Home Feed, THE system SHALL filter to show only posts from communities the user is subscribed to.

WHEN viewing the Popular Feed, THE system SHALL filter to show posts from all communities across the platform.

WHEN viewing the Community Feed, THE system SHALL filter to show only posts from the specified community.

WHEN a banned user attempts to create a post in a community, THE system SHALL reject the request.

WHEN a banned user attempts to create a comment in a community, THE system SHALL reject the request.

WHEN a banned user attempts to view content in a community, THE system SHALL allow the request.

### Sorting Rules

WHEN sorting posts by Hot, THE system SHALL display recent posts with many upvotes first.

WHEN sorting posts by New, THE system SHALL display the most recently created posts first.

WHEN sorting posts by Top, THE system SHALL display posts with the highest vote score first.

WHEN sorting posts by Top with a time filter, THE system SHALL apply the time filter: today, this week, this month, this year, or all time.

WHEN sorting posts by Controversial, THE system SHALL display posts with many votes but a score close to zero first.

WHEN sorting comments by Best, THE system SHALL display comments with the highest vote score first.

WHEN sorting comments by New, THE system SHALL display the most recent comments first.

WHEN sorting comments by Controversial, THE system SHALL display comments with many votes but a score close to zero first.

### Pagination Rules

WHEN viewing any post feed, THE system SHALL display posts in paginated pages.

WHEN a user navigates through pages, THE system SHALL display the next set of posts.

WHEN viewing the Home Feed, THE system SHALL paginate the posts.

WHEN viewing the Popular Feed, THE system SHALL paginate the posts.

WHEN viewing the Community Feed, THE system SHALL paginate the posts.

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### User Account Error Scenarios

WHEN a user attempts to sign up with a username that already exists, THE system SHALL reject the registration request and display an error message indicating the username is taken.

WHEN a user attempts to sign up with an email address that is already registered, THE system SHALL reject the registration request and display an error message indicating the email is already in use.

WHEN a user attempts to log in with an incorrect password, THE system SHALL reject the login attempt and display an error message.

WHEN a user attempts to change their password with an incorrect current password, THE system SHALL reject the password change request and display an error message.

WHEN a user deletes their account, THE system SHALL hard delete the account and all associated posts and comments, permanently removing the data from the system.

### Community Error Scenarios

WHEN a user attempts to create a community with a name that already exists, THE system SHALL reject the community creation request and display an error message indicating the name is taken.

WHEN a user attempts to create a community without providing a description, THE system SHALL reject the request and display an error message.

WHEN a user attempts to create a community without uploading an icon image, THE system SHALL reject the request and display an error message.

WHEN a moderator attempts to remove the community owner, THE system SHALL reject the request and display an error message indicating only the owner can remove moderators.

WHEN a moderator attempts to remove another moderator, THE system SHALL reject the request and display an error message indicating only the owner can remove moderators.

### Post Error Scenarios

WHEN a user attempts to create a post in a community they are not subscribed to, THE system SHALL reject the post creation request and display an error message.

WHEN a user attempts to create a post without providing a title, THE system SHALL reject the request and display an error message.

WHEN a user attempts to create a text post without providing text content, THE system SHALL reject the request and display an error message.

WHEN a user attempts to create a link post without providing a URL, THE system SHALL reject the request and display an error message.

WHEN a user attempts to create an image post without uploading an image, THE system SHALL reject the request and display an error message.

WHEN a banned user attempts to create a post in the community where they are banned, THE system SHALL reject the request and display an error message.

WHEN a user attempts to edit a post they did not create, THE system SHALL reject the request and display an error message.

WHEN a user attempts to delete a post they did not create, THE system SHALL reject the request and display an error message.

WHEN a moderator attempts to delete a post in a community where they are not a moderator, THE system SHALL reject the request and display an error message.

### Comment Error Scenarios

WHEN a user attempts to write a comment on a post that has been deleted, THE system SHALL reject the request and display an error message.

WHEN a user attempts to reply to a comment that has been deleted, THE system SHALL reject the request and display an error message.

WHEN a banned user attempts to write a comment in the community where they are banned, THE system SHALL reject the request and display an error message.

WHEN a user attempts to edit a comment they did not create, THE system SHALL reject the request and display an error message.

WHEN a user attempts to delete a comment they did not create, THE system SHALL reject the request and display an error message.

WHEN a moderator attempts to delete a comment in a community where they are not a moderator, THE system SHALL reject the request and display an error message.

### Vote Error Scenarios

WHEN a user attempts to vote on a post that has been deleted, THE system SHALL reject the request and display an error message.

WHEN a user attempts to vote on a comment that has been deleted, THE system SHALL reject the request and display an error message.

WHEN a user attempts to cast multiple votes on the same post, THE system SHALL reject the additional vote and only retain the most recent vote.

WHEN a user attempts to cast multiple votes on the same comment, THE system SHALL reject the additional vote and only retain the most recent vote.

WHEN a banned user attempts to vote on content in the community where they are banned, THE system SHALL reject the request and display an error message.

### Feed Access Error Scenarios

WHEN a logged-out user attempts to access the home feed, THE system SHALL reject the request and redirect them to the login page.

WHEN a user requests a feed with an invalid sorting option, THE system SHALL reject the request and display an error message.

WHEN a user requests a feed page number that does not exist, THE system SHALL return an empty result set without displaying an error message.

WHEN a user requests a community feed for a community that does not exist, THE system SHALL display an error message indicating the community cannot be found.

### Report Error Scenarios

WHEN a user attempts to report a post without providing a reason, THE system SHALL reject the report request and display an error message.

WHEN a user attempts to report a comment without providing a reason, THE system SHALL reject the report request and display an error message.

WHEN a user attempts to report a post that has been deleted, THE system SHALL reject the request and display an error message.

WHEN a user attempts to report a comment that has been deleted, THE system SHALL reject the request and display an error message.

WHEN a moderator attempts to view reports for a community where they are not a moderator, THE system SHALL reject the request and display an error message.

WHEN a moderator attempts to approve or dismiss a report that has already been handled, THE system SHALL reject the request and display an error message.

# File Validation Rules

Validation rules and policies for file uploads and storage.

## File Validation and Policies

Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.

### File Validation Rules

The system accepts image files for user avatars, community icons, and image posts.

When a user uploads an avatar image, the system validates that the file is a valid image.

When a user uploads a community icon, the system validates that the file is a valid image.

When a user uploads an image for a post, the system validates that the file is a valid image.

If the uploaded file is not a valid image, the upload is rejected and the user is notified.

If the uploaded file is corrupted or cannot be read, the upload is rejected and the user is notified.

If the upload fails due to a system error, the user is notified and the file is not saved.

### Content Type Validation

The system validates that uploaded files are image content types.

When uploading an avatar, the system verifies the file is an image type.

When uploading a community icon, the system verifies the file is an image type.

When uploading a post image, the system verifies the file is an image type.

If the file content type does not match an image type, the upload is rejected and the user is notified.

### Image File Retention

Uploaded images are retained as long as the associated content exists.

When a user deletes their avatar, the associated image file is removed from the system.

When a community is deleted, the associated icon image is removed from the system.

When a user deletes their account, all their avatar images are removed from the system.

When a post is deleted, the associated image file is removed from the system.

When a user deletes their account, all their image posts and associated images are removed from the system.

Deletion of content and associated image files is permanent and cannot be recovered.