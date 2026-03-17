**redditCommunity — Business rules, validation constraints, data browsing expectations, error scenarios**

Business rules, validation constraints, data browsing expectations, error scenarios

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## User Rules

Users create accounts by providing an email address, password, and choosing a unique username that no other user has claimed. The email and password are required during sign-up. Users can update their password at any time through the account settings. When a user chooses to delete their account, all posts and comments they have created are permanently removed from the system. Each user maintains a profile containing a display name, bio text, and avatar image that can be edited by the profile owner. Users can view the profile pages of any other users on the platform. A user's profile displays their display name, bio, avatar, total karma score, all posts they have created, and all comments they have written. The system ensures usernames remain unique across all users.

### Account Creation and Registration

Users create an account by providing an email address, password, and username. The email address and password are required fields during sign-up. The username must be unique across all users in the system. Users must choose a username that no other user has already claimed. If a username is already taken, the registration request is rejected. The system validates that all required fields are provided before creating an account. Users cannot create multiple accounts with the same email address. Each account is uniquely identified by its email address and password combination.

### Username Uniqueness Validation

When a user attempts to register, the system checks if the chosen username is already in use. If the username exists in the system, the registration fails with an error message indicating the username is taken. The username must be provided during initial account creation and cannot be left blank. New users cannot select a username that matches an existing user's username, regardless of case sensitivity. The system enforces username uniqueness at all times to prevent account confusion. When username uniqueness is violated, the registration process is halted and the user is prompted to choose a different username.

### Password Management

Users can change their password at any time through the account settings interface. Password changes require authentication with the current password before the new password is applied. Users must provide both the current password and the new password when updating credentials. If the current password is incorrect, the password change request is rejected. The new password must meet minimum security requirements. Users can update their password without affecting their username or email address. After a successful password change, the user must use the new password for future logins.

### Account Deletion and Content Removal

Users can request to delete their account through the account settings. When a user deletes their account, all posts they have created are permanently removed from the system. All comments written by the deleted user are also permanently removed. The user's profile information including display name, bio, and avatar are deleted. The username becomes available for registration by a different user after account deletion. The email address associated with the deleted account becomes available for new registrations. All karma score data associated with the deleted user is removed. Deletion is permanent and cannot be undone.

### Profile Editing Permissions

Users can edit their own profile information at any time. Only the profile owner can modify their display name, bio text, and avatar image. Other users cannot edit another user's profile information. Users must be logged in to edit their profile. When editing a profile, users can update any or all of the editable fields independently. Changes to the profile are saved immediately upon submission. If a user is not logged in, profile editing requests are rejected.

### Profile Viewing Access

Any user on the platform can view another user's profile page. No authentication is required to view public profile information. Profile information is visible to both logged-in members and guests. Users can search for and navigate to any other user's profile by username. The profile view displays the user's display name, bio text, avatar image, karma score, posts, and comments. Users cannot restrict who views their profile page. All profile information is considered public information.

### Profile Display Elements

A user profile displays the display name prominently at the top of the page. The bio text appears below the display name if it has been set by the user. The avatar image is shown alongside the profile information. If no avatar has been set, a default avatar is displayed. The bio text may be blank if the user has not provided one. The avatar image represents the user visually on the platform. Display name, bio text, and avatar image are the three primary identity elements shown on profiles.

### Karma Score Display and Visibility

Each user has a karma score that is displayed on their profile page. The karma score shows the net total of upvotes minus downvotes received on all posts and comments. Karma score is visible to all users viewing the profile. The karma score can be a positive number, zero, or negative number. The karma score updates automatically when votes are cast on the user's content. Users cannot manually set or modify their karma score. The karma score reflects community reception of the user's contributions.

### User Posts List Display

A user's profile page shows a complete list of all posts they have created. The posts list displays posts in reverse chronological order by default. Each post entry shows the post title, community name, vote score, and comment count. Users can view posts from any community they have participated in. The posts list is paginated if the user has created many posts. Users can navigate through pages of their posts history. Posts created after account deletion are not displayed. Archived or deleted posts by the user do not appear in the list.

### User Comments List Display

A user's profile page shows a complete list of all comments they have written. The comments list displays comments in reverse chronological order by default. Each comment entry shows the comment content preview, the post it was written on, vote score, and timestamp. Users can view comments across all posts they have participated in. The comments list is paginated if the user has written many comments. Users can navigate through pages of their comments history. Comments deleted by moderators or authors do not appear in the list. Comments on deleted posts do not appear in the list.

### Account Creation Validation Rules

Email address must be provided during account creation and must be in valid email format. Password must be provided during account creation and meets minimum complexity requirements. Username must be provided during account creation and cannot be empty. All three fields (email, password, username) are required to create an account. If any required field is missing or invalid, the account creation request is rejected. The system returns specific error messages for each validation failure. Users cannot proceed with registration until all validation errors are resolved. Partial registration with missing fields is not permitted.

### Profile Edit Validation Rules

Display name must be provided when editing a profile and cannot be left blank. Bio text is optional when editing a profile and may be empty. Avatar image upload is optional when editing a profile and may not be provided. If avatar image is uploaded, it must meet file size and format requirements. Users cannot edit another user's profile regardless of their relationship. Profile edits are saved without requiring re-authentication for each field change. Invalid input in any field prevents the profile from being saved. Validation errors are displayed before profile changes are applied.

### Account Deletion Confirmation Rules

Users must confirm their intent to delete their account before deletion proceeds. The system warns users that all their content will be permanently removed. Account deletion cannot be cancelled after confirmation is given. Users must be logged in to initiate account deletion. The deletion process begins immediately after confirmation. All user-generated content is marked for deletion synchronously. Users receive confirmation that their account has been deleted. Customer support cannot restore a deleted account after the process completes.

## Community Rules

Any user on the platform can create a new community by providing a unique name, description text, and an icon image. The community creator automatically becomes the owner of that community with highest authority. Community names must be unique across the platform and cannot be duplicated by other communities. Users can browse all communities in a list view to discover available communities. Users can search for communities by entering a name query to find specific communities. Each community displays its subscriber count to users viewing the community. The owner has special privileges including adding and removing moderators.

### Community Creation

Any user on the platform can create a new community by providing a unique name, description text, and an icon image.
The user who creates the community automatically becomes the owner of that community with highest authority.
Community names must be unique across the entire platform.
Two communities cannot share the same name.
The community creation request is rejected if a community with the same name already exists.
If the community name is missing, the request is rejected.
If the description text is missing, the request is rejected.
If no icon image is provided, the request is rejected.

### Community Description and Icon

Each community must have a description text that describes the purpose or topic of the community.
The description text is required when creating a community.
The description text can be empty when viewing an existing community.
Each community must have an icon image.
The icon image is required when creating a community.
The icon image helps users identify the community visually.
Only the owner can update the community description text.
Only the owner can update the community icon image.

### Community Discovery

Users can browse all communities in a list view to discover available communities.
The list of all communities shows each community's name and subscriber count.
Users can search for communities by entering a name query.
The search returns communities whose names match the search query.
If no communities match the search query, an empty result is returned.
Guests and logged-in users can both browse and search communities.
Community names are displayed in alphabetical order in search results.

### Community Display

Each community displays its subscriber count to all users viewing the community.
The subscriber count shows the total number of users subscribed to that community.
Communities are visible to all users, including guests and logged-in users.
Guests can view community information but cannot interact with the community.
Logged-in users can interact with communities if they are subscribed.
The community name is displayed prominently on the community page.
The community description is displayed on the community page.
The community icon is displayed on the community page.

### Owner Authority Privileges

The owner of a community has the highest level of authority.
The owner can add moderators to the community.
The owner can remove moderators from the community.
Only the owner can remove other moderators.
Only the owner can remove themselves as owner.
Moderators cannot remove the owner.
Moderators cannot remove other moderators.
Only the owner can transfer ownership to another user.
The owner has full control over all community settings.

## Subscription Rules

Users can subscribe to any community they want to follow and receive its posts. Users can unsubscribe from any community at any time to stop following it. Before creating a post in a community, a user must first subscribe to that community. This subscription requirement prevents posting in communities the user is not following. Users can view a list showing all communities they are currently subscribed to. The system tracks which communities each user has subscribed to for feed generation. Users must be logged in to subscribe or unsubscribe from communities.

### Subscription Actions

Users can subscribe to any community to follow it and receive its posts in their feeds. Users can unsubscribe from any community at any time to stop following it and remove it from their subscribed communities list. Both subscribe and unsubscribe actions require the user to be logged in. Attempting to subscribe or unsubscribe without being logged in is rejected. A user cannot subscribe to the same community twice. If a user is already subscribed to a community and attempts to subscribe again, the request is rejected. Similarly, if a user tries to unsubscribe from a community they are not subscribed to, the request is rejected. The system maintains an active record of which communities each user has subscribed to.

### Posting Subscription Requirement

Before creating a post in any community, a user must first subscribe to that community. This subscription requirement prevents users from posting in communities they are not following. When attempting to create a post, the system validates that the user is subscribed to the target community. If the user is not subscribed to the community, the post creation request is rejected. The validation occurs before the post is created. Once a user subscribes to a community, they immediately gain the ability to create posts in that community. Posts can be created in any community the user is subscribed to, regardless of when the subscription was made.

### Viewing Subscribed Communities

Users can view a list showing all communities they are currently subscribed to. This list displays the community name, description, icon, and subscriber count for each subscribed community. The list can be browsed by the user to see all communities they follow. The system maintains the subscription relationship to enable this view. Each community in the list shows whether the user is subscribed, though this should always show as subscribed since the list only includes subscribed communities. The list updates in real-time as the user subscribes or unsubscribes from communities. Users can access this list at any time, even when logged out (but cannot modify subscriptions without logging in).

### Feed Eligibility

Subscription determines which communities' posts appear in a user's home feed. Only posts from communities the user is subscribed to are shown in their home feed. Posts from unsubscribed communities do not appear in the home feed. This subscription-based filtering ensures users only see content from communities they have chosen to follow. The home feed aggregates posts from all subscribed communities and displays them according to sorting options. Popular feed and community feed are not affected by subscription status and are available to all users regardless of subscriptions. The system uses the subscription list to populate the home feed with eligible posts from subscribed communities only.

### Community Following Rules

Users can follow any community on the platform to receive updates in their home feed. Following a community is done through the subscribe action. Users may follow multiple communities without limit. A community can have any number of followers. Following does not grant any special permissions beyond seeing posts in the home feed and the ability to create posts in the community. The subscriber count for a community updates automatically when users subscribe or unsubscribe. The system tracks all following relationships to enable feed generation and post eligibility checks. Following is a one-way relationship where the user receives content from the community but does not affect the community's structure or moderation.

## Post Rules

Users can create a post in any community they have subscribed to. Every post requires a title that cannot be empty. Posts come in three distinct types: text posts with text content, link posts with a URL, and image posts with an uploaded image. The post type determines which additional content fields are required. Users can edit their own posts at any time after creation. Users can delete their own posts permanently from the platform. When viewing an individual post, users see the title, full content, author information, community name, vote score, comment count, and posting timestamp. Only the post creator can edit or delete their post.

### Post Creation Requirements

Users can create a post in any community they are subscribed to. Users must be members of the community to create a post there.

Every post requires a title. The title field cannot be empty.

The system validates that the user is subscribed to the target community before allowing post creation. If the user is not subscribed, the post creation request is rejected.

The system validates that the title is not empty before allowing post creation. If the title is missing or empty, the post creation request is rejected.

### Post Type Requirements

Posts come in three distinct types: text posts, link posts, and image posts.

Text posts must have text content. The text content field is required for text posts.

Link posts must have a URL. The URL field is required for link posts.

Image posts must have an uploaded image. The image file is required for image posts.

Each post type requires its corresponding content field. The post type determines which additional content field is mandatory.

### Post Editing Permissions

Users can edit their own posts after creation.

Only the original post author can edit a post. Users cannot edit posts created by other users.

The system validates ownership before allowing a post edit. If the requesting user is not the post author, the edit request is rejected.

The system validates that the user is authenticated before allowing a post edit. Unauthenticated users cannot edit posts.

### Post Deletion Permissions

Users can delete their own posts.

Only the original post author can delete a post. Users cannot delete posts created by other users.

The system validates ownership before allowing a post deletion. If the requesting user is not the post author, the deletion request is rejected.

The system validates that the user is authenticated before allowing a post deletion. Unauthenticated users cannot delete posts.

When a post is deleted, it is permanently removed from the platform.

### Post View Display

When viewing a single post, users see the post title.

When viewing a single post, users see the full post content based on type.

When viewing a single post, users see the post author's username.

When viewing a single post, users see the community name.

When viewing a single post, users see the vote score.

When viewing a single post, users see the comment count.

When viewing a single post, users see when the post was created.

All posts are displayed with their complete content when viewed individually.

## Comment Rules

Users can write a comment on any post they can view. Users can reply to any comment, creating a threaded conversation structure. Replies can themselves have replies with no depth limit on nesting. Users can edit their own comments to update the content. Users can delete their own comments permanently from the system. Each comment displays the author's username, the comment content, vote score, time since posted, and any nested replies. Only the comment author can edit or delete their comment. Comments are displayed in nested threads when viewing a post.

### Writing Comments and Replies

Users can write a comment on any post they have permission to view.
When writing a comment, users must provide comment content.
Comment content must not be empty.
Users can reply to any existing comment, creating a threaded conversation structure.
Replies can themselves have replies, forming a nested comment hierarchy.
There is no depth limit on how deeply comments can be nested.
Nested replies maintain their relationship to parent comments for display purposes.
The system preserves the complete thread structure when displaying comments.
Each comment and reply is uniquely identified within the comment hierarchy.
Users can write comments and replies regardless of their account age or karma score.

### Editing Comments

Users can edit their own comments to update the content.
Only the user who created a comment can edit that comment.
Users cannot edit comments created by other users.
When a comment is edited, the updated content replaces the previous version.
The edit history is not preserved; only the current content is visible.
Editing is available for comments at any depth in the reply hierarchy.
Users must have access to the post to edit comments on that post.
Editing a comment does not change its position in the thread or its timestamp.

### Deleting Comments

Users can delete their own comments permanently from the system.
Only the user who created a comment can delete that comment.
Users cannot delete comments created by other users.
When a comment is deleted, it is removed from all display contexts.
Deleted comments do not appear in any feed, thread, or user profile.
Deleting a comment does not affect replies to that comment.
Replies to deleted comments remain visible but show the parent as deleted.
Deleting a comment is a permanent action with no undo capability.
Users must have access to the post to delete comments on that post.
Deleted comments do not affect vote scores or other statistics.

### Comment Display Information

When displaying a comment, the system shows the author's username.
The system displays the full comment content in the comment card.
The comment displays its current vote score as a number.
The comment shows the time elapsed since it was posted (e.g., "5 minutes ago").
If a comment has replies, the nested reply structure is displayed beneath it.
Replies are indented and visually connected to their parent comment.
Deleted comments show a "content removed" indicator instead of content.
The author's username links to their profile page.
Votes are shown as a number, not as upvote/downvote indicators.
The timestamp updates as time passes from the original post time.

## Vote Rules

Users can upvote posts or comments to increase their vote score by 1 point. Users can downvote posts or comments to decrease their vote score by 1 point. Each user can only cast one vote per post or comment at any given time. Users can change their existing vote from upvote to downvote or vice versa. Users can remove their vote entirely to cancel their vote on an item. The vote score equals the total number of upvotes minus the total number of downvotes. Karma increases by 1 when someone upvotes your post or comment. Karma decreases by 1 when someone downvotes your post or comment. Karma changes when votes are removed and adjusts accordingly. Karma scores can be negative if there are more downvotes than upvotes.

### Upvote and Downvote Actions

Users can upvote a post or comment to increase its vote score by 1 point. Users can downvote a post or comment to decrease its vote score by 1 point. Each vote action must be performed on a specific post or comment that exists in the system. If the post or comment does not exist, the vote action is rejected.

### Single Vote Per User Per Item

Each user can only cast one vote per post at any given time. Each user can only cast one vote per comment at any given time. A user cannot simultaneously have multiple votes on the same post or comment. If a user attempts to cast a second vote on a post or comment they have already voted on, only the most recent vote is recorded.

### Vote Changes

Users can change their existing vote from upvote to downvote on a post or comment. Users can change their existing vote from downvote to upvote on a post or comment. When a vote is changed, the vote score is updated to reflect the new vote direction. The previous vote is removed and replaced with the new vote. The karma score is adjusted accordingly based on the change in vote direction.

### Remove Vote

Users can remove their vote entirely from a post or comment. When a vote is removed, the vote score is adjusted by reversing the effect of that vote. The user no longer has any vote recorded on that post or comment. The user is free to cast a new vote after removing their vote. If no vote exists for a user on a post or comment, attempting to remove the vote is rejected.

### Vote Score Calculation

The vote score equals the total number of upvotes minus the total number of downvotes for a post or comment. Only votes from users who have voted are counted in the calculation. When any vote is added, changed, or removed, the vote score is recalculated. The vote score is displayed to all users viewing the post or comment.

### Karma Impact from Voting

When someone upvotes your post, your karma score increases by 1. When someone upvotes your comment, your karma score increases by 1. When someone downvotes your post, your karma score decreases by 1. When someone downvotes your comment, your karma score decreases by 1. When a user removes their upvote from your post or comment, your karma score decreases by 1. When a user removes their downvote from your post or comment, your karma score increases by 1. Your karma score can be negative if there are more downvotes than upvotes.

## Report Rules

Users can report any post or comment they encounter on the platform. When reporting content, users must provide a reason text explaining why they are reporting it. Moderators can view all reports for posts and comments in their community. Each report displays the reported content, the username of the person who reported it, and the reason text provided. Moderators can approve a report which results in the reported content being deleted. Moderators can dismiss a report which keeps the content and removes it from the report list. Dismissed reports are no longer visible in the moderator report view. Only moderators can take action on reports.

### Report Creation

Users can report any post or comment they encounter on the platform. When creating a report, users must provide a reason text field explaining why they are reporting the content. The reason text is required and cannot be empty. Users can report posts and comments created by other users or themselves.

### Report Display Information

Each report displays three pieces of information: the full content of the reported post or comment, the username of the user who submitted the report, and the reason text provided by the reporter. This information is visible only to moderators of the community where the reported content exists. The reported content is displayed exactly as it appeared when the report was submitted.

### Moderator Report View

Only moderators of a community can view reports for posts and comments within their community. Moderators can view a complete list of all active reports for their community. Each report in the list shows the reported content, the reporter's username, and the reason text. Moderators cannot view reports for communities where they are not moderators.

### Report Approval

Moderators can approve a report, which results in the reported content being permanently deleted from the platform. When a report is approved, the post or comment is removed and all associated votes and replies are also removed. The approved report is then marked as completed and removed from the active report list. Once approved, the action cannot be undone.

### Report Dismissal

Moderators can dismiss a report, which keeps the reported content visible on the platform. When a report is dismissed, it is removed from the active report list and is no longer visible in the moderator report view. Dismissed reports cannot be viewed again by moderators. The reported content remains unchanged and continues to function normally.

## Feed Rules

There are three distinct feed types available to users: home feed, popular feed, and community feed. The home feed shows posts only from communities the user has subscribed to and is only available to logged-in users. The popular feed shows posts from all communities across the platform and is available to everyone including logged-out users. The community feed shows posts from one specific community and is available to everyone. All three feeds are paginated to display posts in manageable chunks. Users must be logged in to access the home feed. Popular feed and community feed work without requiring login.

### Feed Type Definitions

The platform provides three distinct feed types for viewing posts: home feed, popular feed, and community feed. Each feed type serves a different purpose and has different access requirements and content filtering rules.

The home feed displays posts only from communities the current user has subscribed to. This feed is personalized to each user based on their subscriptions.

The popular feed displays posts from all communities across the entire platform, regardless of user subscriptions. This feed shows trending content from the whole community.

The community feed displays posts from a single specific community. This feed shows all content published within one community.

All three feed types support the same set of sorting options: hot, new, top, and controversial. Each feed can be paginated to display posts in manageable chunks.

### Home Feed Access and Content

The home feed is available only to logged-in users. Guests cannot access the home feed.

The home feed displays posts exclusively from communities the user has subscribed to. Posts from unsubscribed communities do not appear in the home feed.

If a user has not subscribed to any communities, the home feed shows no posts.

Subscribed users can view their home feed without restriction.

When a user subscribes to a new community, posts from that community become available in their home feed immediately.

When a user unsubscribes from a community, posts from that community are removed from their home feed.

The home feed is the personalized experience for registered members, showing content from their chosen communities only.

### Popular Feed Access and Content

The popular feed is available to all users, including guests and logged-in users.

The popular feed displays posts from all communities across the platform, regardless of subscription status.

Guests viewing the popular feed see the same content as logged-in users.

Subscriptions do not affect which posts appear in the popular feed.

The popular feed shows trending and high-engagement posts from the entire platform.

The popular feed is the primary way for users to discover content from communities they have not subscribed to.

All posts from all communities are eligible to appear in the popular feed, subject to sorting rules.

### Community Feed Access and Content

The community feed is available to all users, including guests and logged-in users.

The community feed displays posts from one specific community only.

Guests can view any community feed without restriction.

Logged-in users can view any community feed without restriction.

A community feed shows all posts published within that community, regardless of whether the viewer is a member of the community.

The community feed is the default feed when browsing a specific community page.

Each community has its own unique feed showing only posts from that community.

Community feed access does not require membership or subscription to that community.

### Feed Pagination Rules

All three feed types are paginated to display posts in manageable chunks.

Posts in each feed are displayed in groups, with the ability to load more posts.

Pagination allows users to browse through large numbers of posts without loading all content at once.

The same pagination behavior applies to home feed, popular feed, and community feed.

Users can navigate through paginated results to view older posts.

Each page of feed results contains a consistent number of posts.

Pagination does not filter posts further than the feed type already defines.

## Sorting Rules

All feeds support the same sorting options: hot, new, top, and controversial. Hot sorting shows recent posts with many upvotes first. New sorting shows most recently created posts first. Top sorting shows highest vote score first with time filter options. The time filter for top sorting includes: today, this week, this month, this year, and all time. Controversial sorting shows posts with many votes but a score close to zero first. Comments on a post can also be sorted by best, new, or controversial. Best sorting shows highest vote score first for comments. Comments sorting options are best, new, and controversial (without time filter).

### Feed Sorting Options Overview

All feeds support four sorting options: hot, new, top, and controversial. The available sorting options apply to both post feeds and comments. Users can select any sorting option when viewing a feed or comments. The system applies the selected sorting option immediately to display results. Users cannot mix multiple sorting options simultaneously.

### Hot Sorting Rules

Hot sorting displays recent posts with many upvotes first. The sorting algorithm considers both the recency of the post and the vote count. Posts with higher vote scores appearing more recently rank higher. Posts with fewer votes appear lower in the list regardless of recency. The hot sorting algorithm prioritizes engagement over age. This sorting option is available on all feed types (home, popular, community).

### New Sorting Rules

New sorting displays the most recently created posts first. Posts are ordered strictly by their creation timestamp in descending order. The most recently posted item always appears at the top of the list. The vote score has no impact on new sorting. All posts with the same creation timestamp may appear in any order. This sorting option is available on all feed types (home, popular, community).

### Top Sorting with Time Filter

Top sorting displays the highest vote score posts first. Users can apply a time filter to limit the scope of the top sorting. The time filter restricts which posts are considered for the top ranking. Without a time filter, all posts are included in the ranking. With a time filter, only posts within that time period are ranked. The default time filter is all time. Users can change the time filter at any time when using top sorting.

### Time Filter Options

The time filter for top sorting includes five options: today, this week, this month, this year, and all time. Today includes posts from the current calendar day. This week includes posts from the current week starting from the beginning of the week. This month includes posts from the current calendar month. This year includes posts from the current calendar year. All time includes all posts regardless of when they were created. The time filter only applies to top sorting and not to other sorting options.

### Top Sorting Today Time Filter

When today is selected as the time filter, only posts from the current day are ranked. Posts created before the current day are excluded from the top ranking. The ranking includes only posts from midnight to now of the current day. The time filter resets automatically when the day changes. All posts from today with vote scores are ranked by score descending. Posts without votes appear at the bottom of the list.

### Top Sorting This Week Time Filter

When this week is selected as the time filter, only posts from the current week are ranked. The week begins on the first day of the current week. Posts created before the current week start are excluded from the ranking. The ranking includes posts from the beginning of the week until now. The time filter updates automatically when a new week begins. This week includes posts with any vote score. Posts without votes appear at the bottom of the list.

### Top Sorting This Month Time Filter

When this month is selected as the time filter, only posts from the current calendar month are ranked. The month begins on the first day of the current month. Posts created before the current month start are excluded from the ranking. The ranking includes posts from the first of the month until now. The time filter updates automatically when a new month begins. This month includes posts with any vote score. Posts without votes appear at the bottom of the list.

### Top Sorting This Year Time Filter

When this year is selected as the time filter, only posts from the current calendar year are ranked. The year begins on the first day of the current year. Posts created before the current year start are excluded from the ranking. The ranking includes posts from January 1st until now. The time filter updates automatically when a new year begins. This year includes posts with any vote score. Posts without votes appear at the bottom of the list.

### Top Sorting All Time Filter

When all time is selected as the time filter, all posts are ranked regardless of creation date. This is the default time filter for top sorting. Posts from any date in the system are included in the ranking. The ranking is based entirely on vote score in descending order. Older posts with high vote scores appear at the top. Posts without votes appear at the bottom of the list. This filter does not change based on time periods.

### Controversial Sorting Rules

Controversial sorting displays posts with many votes but a score close to zero first. Posts with high vote counts and low net scores rank higher. The algorithm prioritizes the total number of votes over the net score. Posts with equal total votes but different scores may be sorted by recency. Posts with low total vote counts appear at the bottom regardless of score. This sorting option is available on all feed types (home, popular, community).

### Comments Sorting Options

Comments on a post can be sorted by three options: best, new, and controversial. The available sorting options for comments are distinct from feed sorting options. Best sorting is available for comments in addition to hot, new, and controversial. The controversial option for comments does not include time filter. Users can change the sorting option for comments at any time. The default sorting for comments is best.

### Comments Best Sorting

Best sorting displays comments with the highest vote score first. Comments are ranked by their net vote score in descending order. Comments with higher vote scores appear above comments with lower scores. Comments with the same vote score may be sorted by recency. Comments without votes appear at the bottom of the list. This sorting option is available for comments on any post. Best sorting does not consider time for ranking purposes.

### Comments New Sorting

New sorting displays comments in order of their creation time with most recent first. Comments are ordered strictly by their creation timestamp. The most recently commented item appears at the top of the list. The vote score has no impact on new sorting for comments. All comments from any date are included in the ranking. This sorting option is available for comments on any post.

### Comments Controversial Sorting

Comments controversial sorting displays comments with many votes but a score close to zero first. Comments with high vote counts and low net scores rank higher than comments with low total votes. The algorithm prioritizes the total number of votes over the net score. Comments with equal total votes but different scores may be sorted by recency. Comments without votes appear at the bottom of the list. This sorting option is available for comments on any post.

# Data Browsing Expectations

Business expectations for how users browse, find, and navigate through lists of data.

## List Browsing Expectations

Define business expectations for how users find, filter, and browse lists.

### Feed Sorting Rules

The platform supports four sorting options for feeds: hot, new, top, and controversial.

**Hot Sorting**: Recent posts with many upvotes appear first. New posts receive a visibility boost, while older posts gradually descend in the list unless they maintain strong engagement.

**New Sorting**: Most recently created posts appear first, regardless of vote score or engagement.

**Top Sorting**: Posts are ordered by highest vote score. Users can apply time filters to limit the scoring window: today, this week, this month, this year, or all time. When no time filter is selected, all time is used by default.

**Controversial Sorting**: Posts with many total votes but a score close to zero appear first. This surface posts that received both significant upvotes and downvotes, indicating divisive content.

### Comment Sorting Rules

Comments on a post can be sorted using three options: best, new, and controversial.

**Best Sorting**: Comments with the highest vote scores appear first, placing the most community-endorsed comments at the top.

**New Sorting**: Most recently created comments appear first, regardless of vote score.

**Controversial Sorting**: Comments with many total votes but a score close to zero appear first, highlighting divisive comments that received significant disagreement.

The default sorting for comments is best.

### Feed Filtering by Community

The Home Feed displays posts only from communities the user is subscribed to. Posts from unsubscribed communities do not appear in the Home Feed.

The Popular Feed displays posts from all communities across the platform, regardless of subscription status.

The Community Feed displays posts from one specific community selected by the user. Only posts belonging to that community appear in this feed.

Guest users (not logged in) can only access the Popular Feed and Community Feed. The Home Feed requires a logged-in user account.

### Pagination Rules

All feeds use pagination to display posts. Only a limited number of posts appear at a time (typically 20 per page).

Users can navigate to additional pages of posts using previous and next controls.

Each page of results is independent and does not depend on the previous page for calculation.

The total number of available pages is not disclosed to users.

When sorting changes, pagination resets to the first page.

### Feed Access Rules

The Home Feed is available only to logged-in members. Guest users cannot access the Home Feed.

The Popular Feed is available to all users, including guests. No authentication is required.

The Community Feed is available to all users, including guests. No authentication is required.

When a guest user attempts to access the Home Feed, the request is rejected and the user is prompted to log in or create an account.

A logged-in member can switch between any feed type at any time.

### Time Filter Availability

Time filters (today, this week, this month, this year, all time) are only available when using Top sorting on feeds.

Time filters are not available when using Hot, New, or Controversial sorting.

When selecting a time filter, only posts created within that time range are considered for Top ranking.

The current time is used to calculate relative dates (e.g., "today" means the current calendar day in the user's timezone).

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### User Account Validation Errors

When creating a new account, if the email address is already registered, the registration request is rejected. If the chosen username is already taken, the registration request is rejected. If the password does not meet minimum length requirements, the registration request is rejected. If the email format is invalid, the registration request is rejected.

When logging in, if the email address is not found in the system, the login request is rejected. If the password does not match the stored credentials, the login request is rejected. If the account has been deleted, the login request is rejected.

When changing a password, if the current password is incorrect, the request is rejected. If the new password is the same as the current password, the request is rejected. If the new password does not meet minimum requirements, the request is rejected.

When deleting an account, all posts created by the user are permanently deleted. All comments written by the user are permanently deleted. This deletion is irreversible.

If the user account does not exist, any account-related operation is rejected.

### Community Creation Errors

When creating a community, if the community name is already in use by another community, the creation request is rejected. If the community name is empty, the creation request is rejected. If the community name contains only whitespace characters, the creation request is rejected.

The user who creates a community automatically becomes its owner. The owner cannot be removed from the community by any other user.

If the user does not have an active account, the community creation request is rejected.

### Post Creation Validation Errors

When creating a post, if the post title is empty or contains only whitespace, the post creation request is rejected. If the user is not subscribed to the target community, the post creation request is rejected.

For text posts, if the text content is empty, the post creation request is rejected. For link posts, if the URL is empty or not in valid URL format, the post creation request is rejected. For image posts, if no image file is provided, the post creation request is rejected.

When viewing a post, if the post does not exist in the system, the request is rejected. If the post was deleted, the request is rejected.

When creating a post in a community where the user has been banned, the post creation request is rejected.

### Post Editing and Deletion Errors

When editing a post, if the post does not belong to the requesting user, the edit request is rejected. If the post has been deleted, the edit request is rejected. If the new title is empty or invalid, the edit request is rejected.

When deleting a post, if the post does not belong to the requesting user and the user is not a moderator of the community, the deletion request is rejected. If the post has already been deleted, the deletion request is rejected.

When moderating a post, if the user is not a moderator of the community, the delete post request is rejected. If the post does not exist, the delete request is rejected.

When changing a post type from one format to another, if the new content is invalid for the target type, the edit request is rejected.

### Post Voting Validation Errors

When voting on a post, if the post does not exist, the vote request is rejected. When changing a vote, the previous vote is replaced with the new vote direction.

Users can only vote on posts they can view. When a user removes their vote, the vote score is adjusted by removing that user's contribution.

When viewing a post, the vote score reflects the total upvotes minus total downvotes from all users.

If the user has already voted on a post and attempts to vote again without removing their previous vote, the system updates the vote to the new direction instead of rejecting the request.

### Comment Creation and Validation Errors

When creating a comment on a post, if the post does not exist, the comment creation request is rejected. If the comment content is empty or contains only whitespace, the comment creation request is rejected.

Users can reply to any comment, including replies to replies, with no depth limit on nesting.

When viewing a comment, if the comment does not exist, the request is rejected. If the comment was deleted, the request is rejected.

When creating a comment in a community where the user has been banned, the comment creation request is rejected.

Users can only write comments on posts they can view.

### Comment Editing and Deletion Errors

When editing a comment, if the comment does not belong to the requesting user, the edit request is rejected. If the comment has already been deleted, the edit request is rejected. If the new content is empty, the edit request is rejected.

When deleting a comment, if the comment does not belong to the requesting user and the user is not a moderator of the community, the deletion request is rejected. If the comment has already been deleted, the deletion request is rejected.

When moderating a comment, if the user is not a moderator of the community, the delete comment request is rejected. If the comment does not exist, the delete request is rejected.

When viewing nested replies, deleted comments are not displayed in the reply tree.

### Comment Voting Validation Errors

When voting on a comment, if the comment does not exist, the vote request is rejected. Users can only vote on comments they can view.

Each user can only have one vote per comment. When changing a vote from upvote to downvote or vice versa, the vote score is updated accordingly. When a user removes their vote, the comment score is adjusted.

The vote score for each comment reflects the total upvotes minus total downvotes from all users.

If a user attempts to vote on a comment without having an active account, the vote request is rejected.

### Community Subscription Errors

When subscribing to a community, if the user does not have an active account, the subscription request is rejected. If the community does not exist, the subscription request is rejected.

When unsubscribing from a community, if the user is not subscribed to the community, the request is rejected. If the user does not have an active account, the request is rejected.

When viewing a list of subscribed communities, only communities the user is actively subscribed to are shown. Subscribers are only counted if they are active users.

A user must be subscribed to a community before they can create posts in that community. Attempting to post without subscription results in rejection.

### Community Moderation Authorization Errors

When adding a moderator, if the user is not the owner of the community, the request is rejected. If the user being added does not exist, the request is rejected. If the user is already a moderator, the request is rejected.

When removing a moderator, if the user is not the owner of the community, the request is rejected. If the moderator does not exist, the request is rejected. If the user being removed is the owner, the request is rejected.

Moderators cannot remove other moderators. Only the owner can remove moderators.

When moderating, if the user is not a moderator or owner of the community, the action is rejected. Banned users cannot perform any moderation actions.

### User Ban and Unban Errors

When banning a user, if the banning user is not a moderator or owner of the community, the ban request is rejected. If the user being banned does not exist, the request is rejected. If the user is already banned, the request is rejected.

When unbanning a user, if the unbanning user is not a moderator or owner of the community, the request is rejected. If the user is not currently banned, the request is rejected.

When a user is banned from a community, they cannot create new posts or comments in that community. They can still view posts and comments in the community.

Banned users are excluded from subscriber counts in their banned communities.

### Report Validation and Processing Errors

When reporting a post or comment, if the user does not have an active account, the report request is rejected. If the reported content does not exist, the request is rejected. If the report reason is empty or contains only whitespace, the request is rejected.

Each report must include a reason text explaining why the content is being reported.

When viewing reports, if the user is not a moderator of the community where the reported content exists, the request is rejected.

When approving a report, if the reported content has already been deleted, the approval request is rejected. If the user is not a moderator of the community, the approval request is rejected.

When dismissing a report, if the report has already been dismissed, the request is rejected. If the report has already been approved, the request is rejected. If the user is not a moderator of the community, the dismissal request is rejected.

Dismissed reports are removed from the report list and cannot be recovered.

### Feed Access and Browsing Errors

When viewing the home feed, if the user is not logged in, the request is rejected. The home feed only shows posts from communities the user is subscribed to.

When viewing the popular feed, the feed is available to all users, including those not logged in. All posts from all communities are shown.

When viewing the community feed, if the community does not exist, the request is rejected. The community feed is available to all users, including those not logged in.

When sorting posts in any feed, if the sort option is not recognized (hot, new, top, or controversial), the request is rejected.

When using the top sort with time filter, if the time filter option is not recognized (today, this week, this month, this year, all time), the request is rejected.

### Comment Sorting Validation Errors

When sorting comments on a post, if the sort option is not recognized (best, new, or controversial), the comment sorting request is rejected.

When viewing comments, if the post does not exist, the comment list request is rejected. If the post has been deleted, the comment list request is rejected.

Nested replies are displayed in the comment thread regardless of sort order, but deleted comments do not appear in the thread.

When viewing comments, only comments the user can see based on their account status are displayed.

### Pagination and List Browsing Errors

When viewing any list of posts or comments, if the pagination parameters are invalid (such as negative page numbers or page numbers exceeding available results), the request is rejected.

If the requested page size is invalid, the system uses a default page size instead of rejecting the request.

When requesting pages that exceed available data, an empty list is returned instead of an error.

When browsing communities by search, if the search term is empty, no communities are returned and no error is shown.

When browsing communities by search, if the search term contains only whitespace, the search returns no results.

### Karma Calculation and Display Errors

When a user votes on a post or comment, the voter's karma is adjusted by +1 for upvote or -1 for downvote.

When a user removes their vote, the voter's karma is adjusted back to remove the previous effect.

When a post or comment is deleted, the karma changes from votes on that content are not reversed.

If the user account does not exist, karma calculation requests are rejected.

The karma score is always visible on user profiles, even when the score is negative or zero.

### Content Deletion Cascade Rules

When a user account is deleted, all posts created by that user are permanently deleted. All comments written by that user are permanently deleted.

When a community is deleted, all posts and comments within that community are permanently deleted.

When a post is deleted, all comments on that post are permanently deleted along with the post.

When a comment is deleted, all nested replies to that comment are permanently deleted.

Deleted content cannot be recovered after permanent deletion.

When viewing a list of user content, deleted items do not appear in the list.

# File Validation Rules

Validation rules and policies for file uploads and storage.

## File Validation and Policies

Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.

### File Upload Validation

Users may upload avatar images when creating their account.

Users may upload images for image-type posts.

Community owners may upload icon images when creating a community.

Only image files are accepted for avatar uploads, post image uploads, and community icon uploads.

The system validates that uploaded files are valid image files before accepting them.

Uploaded images must not exceed the maximum file size limit.

If the uploaded file is not a valid image, the request is rejected.

If the uploaded file exceeds the maximum size, the request is rejected.

If the file format is not supported, the request is rejected.

### Content-Type Validation

Avatars must be image files only.

Post images must be image files only.

Community icons must be image files only.

Text posts and link posts do not support file uploads.

Only the following image file types are accepted: JPEG, PNG, GIF, WebP.

Other file types are rejected when attempting to upload as avatar, post image, or community icon.

The system determines the file type from the file content, not the file extension.

If the file content does not match a valid image format, the upload is rejected.

If the file is corrupted or unreadable, the upload is rejected.

### File Storage and Retention

Uploaded images are stored permanently while the associated entity exists.

Avatar images are deleted when the user account is deleted.

Post images are deleted when the post is deleted.

Community icon images are deleted when the community is deleted.

When a post is deleted, all associated comments and the post image are also deleted.

When a user deletes their account, all their posts and their avatar image are deleted.

When a community is deleted, all posts in the community and community icon are deleted.

Orphaned images (images without an associated entity) are automatically removed from storage.

The system maintains at least one copy of each uploaded image at all times while the entity exists.

Uploaded images remain available to all users who have permission to view the associated content.

### Image Processing

Uploaded images are automatically resized to fit display requirements.

Thumbnail images are generated for post lists and community feeds.

Full-size images are available when viewing a post detail page.

Avatar images are sized for display in user profile and comment headers.

Community icon images are sized for display in community lists and post headers.

Image processing is performed during upload.

Corrupted or malformed images that cannot be processed result in a failed upload.

The system does not allow re-uploading the same image file for a different purpose (e.g., using a community icon as an avatar).

### Upload Error Handling

If the user is not logged in, avatar upload is rejected.

If the user is not the post author, editing a post with an image is rejected.

If the user does not own the community, editing community icon is rejected.

If the storage system is unavailable, the upload is rejected with an appropriate error.

If the temporary upload storage is full, new uploads are rejected until space is available.

If the image file is too large to process, the upload is rejected.

If the image format is not supported, the upload is rejected.

If the image exceeds maximum dimensions, the upload is rejected.

Users cannot upload the same image file multiple times in rapid succession.