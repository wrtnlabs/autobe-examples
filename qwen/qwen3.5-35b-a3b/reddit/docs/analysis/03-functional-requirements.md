**redditCommunity — What operations users can perform, use cases, business workflows**

What operations users can perform, use cases, business workflows

# Core Business Operations

What the system must do for each business concept.

## Unit 1: User Operations

Users can sign up by providing an email address, password, and choosing a unique username. Once registered, users log in using their email and password to access the platform. Users may change their password at any time through their account settings. Users can delete their entire account, which removes all their posts, comments, and profile data permanently. Each user maintains a profile page containing a display name, bio text, and avatar image. Users can edit their own display name, bio, and avatar to keep their profile current. Any user on the platform can view another user's public profile page. A user's profile displays their total karma score earned through votes on their content. The profile page lists all posts created by that user for public viewing. The profile page also shows all comments written by that user across the platform.

### User Registration

Any person may create an account by providing an email address, password, and choosing a unique username. The email address must be valid and is used for authentication. The password must meet minimum security requirements. The username must be unique across the platform and cannot be reused by another account. The email address cannot already be associated with an existing account. The username cannot already be in use. During registration, the user creates their profile with an initial display name, bio text, and avatar image.

### User Authentication

Registered users may log in by providing their email address and password. The system validates the credentials and creates an active session for authenticated users. Authenticated users can access the full platform features. Unauthenticated users (guests) have limited access to the platform.

### Password Management

Users may change their password at any time through their account settings. To change a password, the user must provide their current password and a new password. The new password must meet the minimum security requirements. The current password must be correct for the password change to succeed. After successfully changing their password, the user remains logged in.

### Account Deletion

Users may delete their own account at any time. When a user deletes their account, their profile, all posts, all comments, and all karma are permanently removed from the system. The deletion is irreversible. When an account is deleted, any subscriptions that user had to communities are also removed. Other users will no longer see deleted content in feeds or profiles. The username becomes available for reuse by another account after deletion.

### Profile Display Name

Users may edit their own display name through their profile settings. The display name is what appears publicly on the user's profile and on their content (posts and comments). Users can update their display name as often as they wish. The display name change takes effect immediately for all existing content.

### Profile Bio

Users may edit their own bio text through their profile settings. The bio appears on the user's public profile page and provides information about the user. Users can update their bio as often as they wish. The bio text change takes effect immediately for the user's profile.

### Profile Avatar

Users may upload an avatar image for their profile through their profile settings. The avatar appears on the user's public profile and on their content (posts and comments). Users can update their avatar as often as they wish. The avatar image change takes effect immediately for all existing content.

### Viewing User Profiles

Any user on the platform may view the public profile of any other user. A user's profile displays their display name, bio text, and avatar image. The profile shows the user's total karma score earned through votes on their content. The profile lists all posts created by that user. The profile also lists all comments written by that user. Users cannot view another user's private settings or account information.

### User's Posts

A user's profile displays a complete list of all posts they have created on the platform. Each post listing shows the post title, community name, vote score, comment count, and time since posted. Users can view their own posts list by accessing their profile page. The posts list is sorted with most recent posts appearing first. Users can navigate through paginated results if they have many posts.

### User's Comments

A user's profile displays a complete list of all comments they have written across the platform. Each comment listing shows the comment content, the post it belongs to, vote score, and time since posted. Users can view their own comments list by accessing their profile page. The comments list is sorted with most recent comments appearing first. Users can navigate through paginated results if they have many comments.

## Unit 2: Community Operations

Any registered user can create a new community on the platform. When creating a community, the user provides a unique name, description text, and uploads an icon image. The user who creates a community automatically becomes its owner with full administrative authority. Users can browse a complete list of all communities available on the platform. Users can search for communities by entering their name in the search interface. Each community displays its current subscriber count to show community popularity. Community owners can update their community's name, description, and icon image at any time. The system ensures community names remain unique across the entire platform. Users who are banned from a community cannot create posts or comments but can still view community content.

### Community Creation

Any registered user can create a new community on the platform. When creating a community, the user provides a unique name, description text, and uploads an icon image. The user who creates a community automatically becomes its owner with full administrative authority over that community.

The community name must be unique across the entire platform. If the requested name is already taken, the request is rejected.

A community description is required and can contain any text. The icon image is required and must be uploaded at the time of creation.

Once created, a community starts with zero subscribers.

### Community Ownership

The user who creates a community becomes its owner with the highest level of authority. The owner has exclusive rights to add and remove moderators from the community.

The owner can add moderators to help manage the community. The owner can remove any moderator, including the owner's own moderator privileges.

Moderators can add other moderators to the community. However, moderators cannot remove the owner or remove each other. Only the owner can remove moderators.

The owner cannot be removed from their own community by any other user or moderator. Owner status is permanent unless the owner voluntarily deletes the community.

### Community Discovery

Users can browse a complete list of all communities available on the platform. The list shows community names and subscriber counts for each community.

Users can search for communities by entering a name in the search interface. The search returns communities whose names match the search term.

Both browsing and searching are available to all users, including those who are not logged in.

When viewing the community list or search results, each community entry displays its name and current subscriber count.

### Community Information Display

Each community displays its current subscriber count to show community popularity. The subscriber count updates whenever users subscribe or unsubscribe from the community.

Viewing a community shows the community name, description text, and icon image. The viewer can see how many users are subscribed to the community.

Banned users from a community can still view the community information, including the subscriber count. However, banned users cannot create posts or comments in that community.

The subscriber count is visible to all users, regardless of whether they are logged in or subscribed to the community.

### Community Management

Community owners can update their community's name, description text, and icon image at any time. Only the owner has the ability to modify these details.

When updating the community name, the new name must be unique across the entire platform. If the new name is already taken, the request is rejected.

The community description can be updated to any new text. The icon image can be replaced with a new uploaded image.

Updates to community details are immediately visible to all users viewing the community.

### Community Ban Management

Moderators can ban users from their community. Banned users cannot create posts or comments in that community.

Banned users can still view content in the community, including posts, comments, and community information. Banning only restricts posting and commenting abilities.

Moderators can unban previously banned users, restoring their ability to create posts and comments in the community.

Moderators can view a list of all users who are currently banned from their community. The list shows each banned user's information.

Only moderators of a specific community can ban or unban users from that community. The ban is specific to the community and does not affect the user's ability to post in other communities.

## Unit 3: Subscription Operations

Users can subscribe to any community to follow its content and participate. Users can unsubscribe from any community they are currently subscribed to. Users can view a complete list of all communities they have subscribed to. Subscribing to a community is a prerequisite for creating posts in that community. Users must subscribe to a community before they can create posts or comments within it. Subscription status determines which posts appear in a user's home feed. Users can manage their subscriptions through the community page interface. The system updates the subscriber count for each community when users subscribe or unsubscribe. Subscription management is available for all registered users on the platform.

### Subscribe to Community

Users can subscribe to any community to follow its content. When a user subscribes to a community, they become a subscriber and can create posts and comments within that community. The subscription is optional for viewing community content, but required for creating posts or comments in that community. Users can subscribe to multiple communities without restriction.

### Unsubscribe from Community

Users can unsubscribe from any community they are currently subscribed to. Unsubscribing removes the user from the community's subscriber list and prevents them from creating new posts or comments in that community. Unsubscribing does not affect any posts or comments the user has already created in the community. Previously created posts and comments remain visible and maintain their existing vote scores.

### View Subscribed Communities List

Users can view a complete list of all communities they are currently subscribed to. The list displays each community's name, icon image, and current subscriber count. Users can access this list from their profile page or a dedicated subscriptions section. The list is available only to logged-in users. Subscribers can navigate from this list to individual community pages.

### Subscription Prerequisite for Posting

Users must be subscribed to a community before they can create posts in that community. The system validates subscription status before accepting a post creation request. If a user attempts to create a post in a community they are not subscribed to, the request is rejected. Users can subscribe to a community and immediately begin creating posts. Moderators of a community are considered automatically subscribed and can create posts without explicitly subscribing.

### Home Feed Based on Subscriptions

The home feed displays posts only from communities the user is currently subscribed to. Users who are not subscribed to any communities will see an empty home feed. The home feed is available only to logged-in users. The system aggregates posts from all subscribed communities and displays them according to the selected sorting option (hot, new, top, or controversial). Users can view their home feed at any time without restriction. Posts from unsubscribed communities do not appear in the home feed.

### Manage Subscriptions Interface

Users can manage their subscriptions through the community page interface. Each community page displays a subscribe or unsubscribe button based on the user's current subscription status. The interface shows the current subscriber count for each community. Users can view their complete list of subscribed communities from a dedicated subscriptions page. The system provides visual feedback when a user successfully subscribes or unsubscribes. Subscription changes are applied immediately and reflected in real-time.

### Subscriber Count Updates

The system automatically updates the subscriber count for each community when users subscribe or unsubscribe. The count increases by one when a user subscribes and decreases by one when a user unsubscribes. The subscriber count is displayed on all community pages and in the subscribed communities list. The count is visible to all users, including logged-out users. The count reflects the current total number of active subscribers in real-time.

## Unit 4: Post Operations

Users can create a post in any community they are subscribed to. Every post requires a title that serves as the main identifier. Posts can be one of three types: text posts with content, link posts with a URL, or image posts with an uploaded image. Users can edit their own posts to update the title and content at any time. Users can delete their own posts from the platform permanently. When viewing a single post, users see the title, full content, author information, community, vote score, comment count, and posting timestamp. The post list display shows the title, author username, community name, vote score, comment count, time since posted, and a preview based on post type. For text posts, the preview shows the first 200 characters of content. For image posts, the preview displays a thumbnail of the image. For link posts, the preview shows the domain name of the URL.

### Post Creation

Users can create a post in any community to which they are subscribed. A post requires a title that serves as the main identifier. The title must be provided when creating the post. If the title is missing, the post creation request is rejected. Users must be logged in to create posts. Users can create posts only in communities they are subscribed to; post creation in unsubscribed communities is rejected.

### Post Types - Text Post

Posts can be text posts that contain text content. The text content is entered when creating the text post. Text content is optional when creating a post. Users can view the full text content when viewing a post. In post list previews, the first 200 characters of text content are displayed as a preview.

### Post Types - Link Post

Posts can be link posts that contain a URL. The URL is entered when creating the link post. A link post requires a URL to be provided. If no URL is provided, the link post creation request is rejected. Users can view the URL when viewing a post. In post list previews, the domain name of the URL is displayed (for example, youtube.com).

### Post Types - Image Post

Posts can be image posts that contain an uploaded image. Users upload an image when creating an image post. An image post requires an image to be uploaded. If no image is uploaded, the image post creation request is rejected. Users can view the full image when viewing a post. In post list previews, a thumbnail of the image is displayed.

### Edit Post

Users can edit their own posts at any time after creation. Users can update the title and content of their own posts. Only the author of a post can edit that post. If a user attempts to edit a post they did not create, the edit request is rejected.

### Delete Post

Users can delete their own posts from the platform. When a post is deleted, it is removed permanently from the system. Only the author of a post can delete that post. If a user attempts to delete a post they did not create, the delete request is rejected.

### View Post Details

When viewing a single post, users see the post title, full content, author information, community information, vote score, comment count, and the time when the post was created. Users can view post details without being logged in. Users can view details of posts in any community, regardless of subscription status.

### Post List Display - Text Preview

When viewing any feed, each post in the list shows the post title, author username, community name, vote score, comment count, and time since posted. For text posts, the first 200 characters of content are shown as a preview. If the text content is shorter than 200 characters, the entire content is shown.

### Post List Display - Image Preview

When viewing any feed, each post in the list shows the post title, author username, community name, vote score, comment count, and time since posted. For image posts, a thumbnail of the image is displayed as the preview.

### Post List Display - Link Preview

When viewing any feed, each post in the list shows the post title, author username, community name, vote score, comment count, and time since posted. For link posts, the domain name of the URL is shown as the preview (for example, youtube.com).

## Unit 5: Comment Operations

Users can write a comment on any post in the platform. Users can reply to any existing comment to continue the discussion. Replies can themselves have replies with no limit on the depth of conversation threads. Users can edit their own comments to update the content at any time. Users can delete their own comments from the platform. Each comment displays the author name, content text, vote score, time since posted, and any nested replies. Comments on a post can be sorted by best, new, or controversial criteria. The comment system supports unlimited depth for threaded discussions. Users can view all comments on a post in a single discussion thread.

### Comment Creation

Users can write a comment on any post in the platform. When creating a comment, users must provide the comment content text. Users must be logged in to create a comment. The comment is automatically associated with the creating user and the target post. If the user is not logged in, the request to create a comment is rejected. If the comment content is empty, the request is rejected. When a comment is created, the associated post's comment count is incremented.

### Comment Replies

Users can reply to any existing comment on a post. A reply is itself a comment that is nested under the original comment. Users can reply to any comment regardless of whether they authored the original post. Users must be logged in to reply to a comment. A reply can be made to a top-level comment or to a nested reply, creating deeper levels of conversation. The reply is automatically associated with the creating user and the parent comment. If the parent comment does not exist, the request is rejected.

### Nested Reply Threads

Replies can have replies, with no limit on the depth of conversation threads. The system supports unlimited nesting of comments within comments. When viewing a comment, users see the full thread of nested replies. The display shows the hierarchy of replies with appropriate indentation. Each level of nesting maintains the relationship between parent and child comments. The comment count on the post includes all comments and nested replies.

### Comment Editing

Users can edit their own comments to update the content at any time. When a user edits a comment, only their own comment can be modified. Users cannot edit comments they did not author. If a user attempts to edit a comment they do not own, the request is rejected. The edited comment retains its original timestamp for reference purposes. Editing a comment updates the visible content text. Deleted comments cannot be edited.

### Comment Deletion

Users can delete their own comments from the platform. When a user deletes a comment, it is permanently removed from the system. Users cannot delete comments they did not author. If a user attempts to delete a comment they do not own, the request is rejected. When a comment is deleted, all nested replies under that comment are also deleted. The associated post's comment count is decremented when a comment is deleted. Banned users cannot create or delete comments in the banned community.

### Viewing Comment Threads

Users can view all comments on a post in a single discussion thread. Each comment displays the author display name, content text, vote score, and time since posted. The view shows the hierarchical structure of nested replies. Users can expand and collapse comment threads to manage the display. When a comment is deleted, it is removed from the thread view. Users must be logged in to view comment threads in private communities.

## Unit 6: Vote Operations

Users can upvote a post or comment to support its content. Each upvote adds 1 to the vote score of the post or comment. Users can downvote a post or comment to express disagreement. Each downvote subtracts 1 from the vote score of the post or comment. Each user can only vote once per post or comment at any time. Users can change their vote from upvote to downvote or vice versa. Users can remove their vote entirely to reset their voting on that content. The vote score equals the total number of upvotes minus the total number of downvotes. Karma scores increase when others upvote the user's posts or comments and decrease when others downvote them. Vote removal adjusts the vote score and karma accordingly.

### Upvote Operation

Users can upvote a post to express support for its content. Each upvote adds 1 to the post's vote score. Users can upvote a comment to express support for that comment. Each upvote adds 1 to the comment's vote score. Each user can only have one active vote on any given post or comment at a time. Attempting to upvote content that has already been upvoted by the same user has no effect. The vote operation requires the user to be logged in. Guests cannot upvote content.

### Downvote Operation

Users can downvote a post to express disagreement with its content. Each downvote subtracts 1 from the post's vote score. Users can downvote a comment to express disagreement with that comment. Each downvote subtracts 1 from the comment's vote score. Each user can only have one active vote on any given post or comment at a time. Attempting to downvote content that has already been downvoted by the same user has no effect. The downvote operation requires the user to be logged in. Guests cannot downvote content. When a user downvotes content, their karma decreases by 1 if they are the author of that content.

### Vote Direction Change

Users can change their vote from upvote to downvote or from downvote to upvote on any post or comment. When a vote direction changes, the vote score updates by 2 points (either adding 2 or subtracting 2). For example, changing from an upvote to a downvote subtracts 2 from the vote score. If a user who upvoted a post downvotes it, their karma decreases by 2 points. The vote direction change operation requires the user to be logged in. The change must be immediate and visible to all users viewing the content.

### Vote Removal

Users can remove their vote entirely from any post or comment. When a vote is removed, the vote score decreases by 1 if the vote was an upvote, or increases by 1 if the vote was a downvote. Removing a vote restores the vote score to what it would be if no vote had been cast. If a user who removed their vote later votes again, they start fresh with a new vote. The vote removal operation requires the user to be logged in. When a post or comment is deleted, all votes on that content are also removed and the vote score adjusts accordingly.

### Vote Score Calculation

The vote score equals the total number of upvotes minus the total number of downvotes. Only votes from users who are currently logged in count toward the vote score. Votes are calculated in real time and the score is displayed on each post and comment. The vote score can be positive, negative, or zero. A post with 10 upvotes and 3 downvotes has a score of 7. A comment with 2 upvotes and 8 downvotes has a score of negative 6. Vote scores are always shown as whole numbers, never fractions. The system displays vote scores next to each post and comment in feeds and on individual content pages.

### Karma Adjustment on Upvote

When any user upvotes a member's post, that member's karma score increases by 1. When any user upvotes a member's comment, that member's karma score increases by 1. A single vote can contribute to multiple karma adjustments if the user has both a post and a comment that receive upvotes. Karma is calculated as the sum of all upvotes received minus all downvotes received across all posts and comments. Users can see their total karma score on their profile page. Karma increases are immediate and visible in real time when the upvote is cast. Users cannot see which specific posts or comments contributed to their karma score, only the total.

### Karma Adjustment on Downvote

When any user downvotes a member's post, that member's karma score decreases by 1. When any user downvotes a member's comment, that member's karma score decreases by 1. A single downvote only reduces karma once per piece of content, regardless of how many times the downvoting user interacts with that content. Karma can be negative if a user has received more downvotes than upvotes. A user's karma is displayed as a single number on their profile page, without showing positive or negative breakdown. When a user's post or comment is deleted, the karma adjustments from votes on that content are also removed.

### Karma Adjustment on Vote Removal

When a vote is removed from a user's post or comment, the karma score adjusts by 1 point in the opposite direction of the removed vote. Removing an upvote decreases karma by 1. Removing a downvote increases karma by 1. The karma adjustment occurs immediately when the vote is removed. If a user votes on a post that is later deleted, the karma adjustment is also removed. The system maintains karma as a running total that reflects all current votes on all content owned by the user. Users cannot manually adjust their own karma through the interface.

## Unit 7: Report Operations

Users can report any post or comment they believe violates community guidelines. When reporting, users must provide a text reason explaining why they are reporting the content. Moderators can view all reports for their community through a dedicated moderation interface. Each report displays the reported content, the user who made the report, and the reason provided. Moderators can approve a report, which results in the reported content being deleted. Moderators can dismiss a report, which keeps the content and removes the report from the list. Dismissed reports are permanently removed from the moderator report list. Banned users cannot create posts or comments but retain the ability to view content. Report moderation helps maintain community quality and safety standards.

### Post Reporting

Any user can report a post they believe violates community guidelines.
When creating a report, the user must provide a text reason explaining why they are reporting the post.
The report is associated with the reported post, the user who made the report, and the reason text.
The reporter cannot see the moderation outcome of their report.
A single post can have multiple reports from different users.
Reports are submitted to the community where the post belongs.

### Comment Reporting

Any user can report a comment they believe violates community guidelines.
When creating a report, the user must provide a text reason explaining why they are reporting the comment.
The report is associated with the reported comment, the user who made the report, and the reason text.
The reporter cannot see the moderation outcome of their report.
A single comment can have multiple reports from different users.
Reports are submitted to the community where the comment's post belongs.

### Moderator Report View

Moderators can access a dedicated moderation interface to view all reports for their community.
The report list shows each report with the reported content (post or comment), the user who made the report, and the reason text.
Reports are filtered to show only content within the moderator's community.
Moderators can view the timestamp when each report was submitted.
Moderators can see the current vote score of reported content.
Banned users cannot create new reports in the community.

### Report Approval and Dismissal

Moderators can approve a report, which results in the reported content being deleted from the community.
Approved reports are marked as resolved and the content is permanently removed.
Moderators can dismiss a report, which keeps the content and marks the report as resolved.
Dismissed reports are removed from the active report list and are no longer visible to moderators.
When content is deleted through report approval, all nested comments on that post are also deleted.
When a comment is deleted through report approval, all replies to that comment are also deleted.
The system notifies moderators when reports are approved or dismissed for their tracking.

## Unit 8: Feed Operations

The home feed shows posts only from communities the user is subscribed to. Home feed is available only to logged-in users on the platform. The popular feed shows posts from all communities across the entire platform. The popular feed is available to everyone, including users who are not logged in. The community feed shows posts from one specific community at a time. All three feeds support pagination to display posts in manageable chunks. Users can navigate through multiple pages of posts within each feed. The home feed personalizes content based on user subscriptions. The popular feed surfaces trending content from the entire platform. The community feed focuses on content from a single community context.

### Home Feed Access

WHEN a logged-in member accesses the home feed, THE system SHALL display posts from communities the member has subscribed to.

WHEN a guest user attempts to access the home feed, THE system SHALL reject the request and require authentication.

The home feed personalizes content based on each member's subscriptions. Members with no subscriptions see an empty home feed with a message indicating they should subscribe to communities.

### Popular Feed Access

WHEN any user including logged-out guests accesses the popular feed, THE system SHALL display posts from all communities across the platform.

The popular feed surfaces trending content from the entire platform regardless of user subscriptions or authentication status.

WHEN a logged-in member accesses the popular feed, THE system SHALL display the same popular posts as guests see. Member subscriptions do not filter the popular feed.

### Community Feed Access

WHEN any user including logged-out guests accesses a community feed, THE system SHALL display posts from that specific community only.

WHEN a user accesses a community feed for a community they are not subscribed to, THE system SHALL display all posts from that community without requiring subscription.

WHEN a user accesses a community feed for a banned community, THE system SHALL restrict access according to ban status. Banned users cannot view content in the banned community.

### Feed Pagination

WHEN viewing any feed, THE system SHALL paginate results to display posts in manageable chunks.

WHEN viewing a paginated feed, THE system SHALL provide navigation controls to access additional pages of posts.

Members can navigate through multiple pages of posts within each feed type. The system SHALL display a page indicator showing current page and total pages available.

### Home Feed Personalization

WHEN a member views the home feed, THE system SHALL dynamically update content as the member subscribes to new communities.

New subscriptions appear in the home feed within the current feed view without requiring manual refresh.

WHEN a member unsubscribes from a community, THE system SHALL remove posts from that community from the home feed view.

### Popular Feed Trending

WHEN viewing the popular feed, THE system SHALL display posts ranked by overall platform engagement and recency.

The popular feed surfaces content with high engagement across all communities. Trending posts appear at the top of the popular feed based on vote velocity and recency.

WHEN no posts meet trending thresholds, THE system SHALL display all available posts ordered by recency.

### Community Feed Focus

WHEN viewing a community feed, THE system SHALL display only posts from that specific community context.

The community feed header displays the community name, icon, and subscriber count to provide context.

WHEN viewing a community feed, THE system SHALL show the member's subscription status for that community.

### Feed Sorting Integration

WHEN viewing any feed, THE system SHALL apply sorting options to order posts.

Sort options available on all feeds include hot, new, top with time filters, and controversial.

WHEN a member selects a sort option, THE system SHALL reorder all posts in the current feed view according to the selected criteria.

### Feed Display Format

WHEN viewing any feed, THE system SHALL display each post with title, author username, community name, vote score, comment count, and time since posted.

For text posts, THE system SHALL display the first 200 characters of content in the feed list.

For image posts, THE system SHALL display a thumbnail of the image in the feed list.

For link posts, THE system SHALL display the domain name of the URL in the feed list.

## Unit 9: Sorting Operations

All three feeds support sorting options to help users find relevant content. The hot sort displays recent posts with many upvotes first. The new sort displays the most recently created posts first. The top sort displays posts by highest vote score with time filter options. Time filters for top sort include today, this week, this month, this year, and all time. The controversial sort displays posts with many votes but a score close to zero. Comments on a post can be sorted by best, new, or controversial criteria. The best comment sort displays comments with the highest vote score first. The new comment sort displays the most recent comments first. The controversial comment sort displays highly voted comments with scores near zero. Sorting helps users prioritize content based on their viewing preferences.

### Post Sorting - Hot

Users can sort posts by hot to display recent posts with many upvotes first.
The hot sort algorithm prioritizes posts that have both recency and vote activity.
Newer posts with fewer votes may rank lower than older posts with more votes.
This sorting option is available in all feed types: home feed, popular feed, and community feed.

### Post Sorting - New

Users can sort posts by new to display the most recently created posts first.
The new sort orders posts strictly by creation time, regardless of vote count.
Newest posts always appear at the top of the list.
This sorting option is available in all feed types: home feed, popular feed, and community feed.

### Post Sorting - Top

Users can sort posts by top to display posts with the highest vote scores first.
The top sort can be combined with time filters to narrow the comparison window.
Without a time filter, all posts are compared regardless of when they were created.
The top sort is available in all feed types: home feed, popular feed, and community feed.

### Top Time Filter - All Time

When sorting by top with all time filter, all posts are compared regardless of creation date.
The highest vote scores from the entire history of the community appear first.
This provides a comprehensive view of the best-performing content over time.
This filter is available in all feed types: home feed, popular feed, and community feed.

### Top Time Filter - This Year

When sorting by top with this year filter, only posts created in the current year are compared.
Posts older than one year from the current date are excluded from the ranking.
This shows the best content from the most recent year of the platform.

### Top Time Filter - This Month

When sorting by top with this month filter, only posts created in the current month are compared.
Posts from previous months are excluded from the ranking.
This highlights the best performing content from the most recent calendar month.

### Top Time Filter - This Week

When sorting by top with this week filter, only posts created in the current week are compared.
Posts from previous weeks are excluded from the ranking.
This shows trending content from the most recent seven-day period.

### Top Time Filter - Today

When sorting by top with today filter, only posts created on the current day are compared.
Posts from previous days are excluded from the ranking.
This displays the best content from the most recent 24-hour period.

### Post Sorting - Controversial

Users can sort posts by controversial to display posts with many votes but scores close to zero.
Controversial posts have significant upvote and downvote activity that nearly cancel out.
High vote count with neutral scores indicate content that divides community opinion.
This sorting option is available in all feed types: home feed, popular feed, and community feed.

### Comment Sorting - Best

Users can sort comments by best to display comments with the highest vote scores first.
Comments with more upvotes appear above comments with fewer upvotes.
This sorting helps users find the most valuable or agreed-upon responses quickly.
This sorting option is available when viewing comments on any post.

### Comment Sorting - New

Users can sort comments by new to display the most recently created comments first.
The new sort orders comments strictly by creation time, regardless of vote count.
Newest comments always appear at the top of the list.
This sorting option is available when viewing comments on any post.

### Comment Sorting - Controversial

Users can sort comments by controversial to display comments with many votes but scores close to zero.
Controversial comments have significant upvote and downvote activity that nearly cancel out.
This sorting option is available when viewing comments on any post.

# Error Scenarios and Edge Cases

Business-level error scenarios, edge case coverage, and expected system behaviors for exceptional conditions.

## User Error Scenarios

Users attempting to sign up with an email that is already registered will be prevented from creating a duplicate account. The system rejects signup requests when the chosen username is already taken, requiring users to select a different username. Password change requests fail if the new password matches the current password, requiring users to choose a different password. When users attempt to delete their account, all associated posts and comments are permanently removed as part of the deletion process. Users cannot access their profile features without logging in first. Login attempts with incorrect email or password credentials are rejected. Account deletion is irreversible, and all user-generated content including posts, comments, karma, and subscription history is removed immediately.

### Duplicate Email Registration Prevention

Users attempting to sign up with an email address that is already registered will be prevented from creating a duplicate account. The system identifies the email as already in use and displays an error message instructing the user to try a different email or log in with existing credentials. This validation occurs at the moment of registration submission. The error prevents the creation of multiple accounts under the same email address.

### Username Uniqueness Validation

The system rejects signup requests when the chosen username is already taken by another user. Users must select a different unique username to complete registration. The validation checks the entire username against all existing usernames in the system. The error message indicates the username is unavailable and suggests trying an alternative. Username uniqueness is enforced at the time of account creation only.

### Password Change Validation Rules

Password change requests fail if the new password matches the current password. Users must choose a different password to update their account credentials. The system compares the new password against the existing password and rejects the change if they are identical. Users are prompted to enter a new password that differs from their current one. This validation ensures users cannot set the same password they already have.

### Account Deletion Irreversibility

Account deletion is irreversible, and all user-generated content including posts, comments, karma, and subscription history is removed immediately upon confirmation. Users must confirm they understand the permanent nature of account deletion before it proceeds. Once deletion is confirmed, the user cannot recover their account or any associated content. The system does not provide a recovery mechanism or grace period for deleted accounts. Users are warned that this action cannot be undone before final confirmation.

### Authentication Required for Profile Access

Users cannot access their profile features without logging in first. Guest users viewing a profile page cannot edit any profile information. The system blocks attempts to modify display name, bio, or avatar from unauthenticated sessions. Users must log in to view their own profile editing capabilities. Profile viewing by others remains available to guests, but profile modification requires authentication.

### Login Credential Validation Errors

Login attempts with incorrect email or password credentials are rejected. The system does not reveal whether the email or password is incorrect, displaying a generic error message. Users are instructed to verify their credentials and try again. The system checks both email and password against registered account data. If either credential is invalid, access is denied. Multiple failed login attempts do not lock accounts, but users must re-enter correct credentials each time.

### Permanent Content Removal on Account Deletion

When users attempt to delete their account, all associated posts and comments are permanently removed as part of the deletion process. This includes all posts and comments authored by the user across all communities. Karma score is reset to zero and cannot be recovered. Community subscriptions are removed. The content is deleted at the same time as the account, with no separate deletion process. Moderators cannot restore deleted content after account deletion.

## Community Error Scenarios

Users attempting to create a community with a name that already exists will be prevented from creating a duplicate community. The system rejects community creation when the name contains reserved terms or special characters that violate naming conventions. Community owners cannot remove other moderators once they are added, only the owner themselves can remove any moderator. When viewing a community, users see the subscriber count, which may not update immediately after subscription actions. Moderators cannot delete posts or comments from communities they do not moderate, regardless of their status in other communities.

### Duplicate Community Name Prevention

When a user attempts to create a new community, the system checks if the proposed community name already exists in the platform.

THE system SHALL reject community creation if a community with the same name already exists.

Users SHALL NOT be able to create communities with duplicate names, even across different time periods.

The system SHALL display an error message indicating that the community name is already taken.

Users SHALL be required to choose a different name before the community creation request can proceed.

### Community Naming Restrictions

When users create a community, the system validates the proposed community name against naming rules.

THE system SHALL reject community creation when the name contains reserved keywords.

THE system SHALL reject community creation when the name contains special characters that violate naming conventions.

Names SHALL be validated for length requirements before submission.

THE system SHALL provide clear error messaging when the name violates naming rules, indicating what restrictions apply.

Community names SHALL be case-sensitive, meaning "Tech" and "tech" are considered different names.

### Moderator Removal Authority

The ownership and moderator roles in a community have specific removal authorities that cannot be overridden.

WHEN an owner attempts to add a moderator, THE system SHALL record this authority grant.

ONCE a moderator is added, other moderators SHALL NOT have the ability to remove that moderator.

ONLY the community owner SHALL have the authority to remove any moderator from the community.

Moderators SHALL NOT be able to remove moderators, regardless of their own moderator status.

The system SHALL enforce this removal authority restriction at the time of the removal action request.

The owner's removal action SHALL take immediate effect once completed.

### Subscriber Count Visibility

Community subscriber information is displayed to all users viewing a community.

WHEN a user views a community page, THE system SHALL display the current subscriber count.

The subscriber count SHALL reflect the total number of active subscriptions to that community.

AFTER a user subscribes to a community, the subscriber count SHALL update to reflect this change.

THE subscriber count update may occur with a short delay after subscription actions.

Users SHALL see the subscriber count on the community browsing and search results.

The subscriber count SHALL be a non-negative number that can only increase with new subscriptions.

### Moderator Cross-Community Scope

Moderator permissions are scoped to specific communities where they hold that role.

THE system SHALL restrict moderators to performing actions only in communities where they have moderator authority.

WHEN a moderator attempts to delete content from a community they do not moderate, THE system SHALL reject the request.

Moderators SHALL NOT be able to delete posts or comments from communities outside their scope.

A moderator's status in one community SHALL NOT grant them any special privileges in other communities.

The system SHALL validate moderator scope for each moderation action request.

Users SHALL NOT be able to bypass these scope limitations through any method.

## Subscription Error Scenarios

Users attempting to subscribe to a community they are already subscribed to are prevented from creating duplicate subscriptions. Users cannot create posts in communities they have not subscribed to, and the system blocks post creation in unsubscribed communities. Users attempting to unsubscribe from a community may still be able to view that community's public content. Subscribed users must be logged in to view their list of subscribed communities. Unsubscribe actions do not affect existing posts or comments the user has already made in that community.

### Duplicate Subscription Prevention

A user cannot subscribe to a community if they are already subscribed to that community. When a subscription attempt is made on a community the user is already subscribed to, the request is rejected and the existing subscription remains unchanged.

### Post Creation Subscription Requirement

A user can only create a post in a community if they are subscribed to that community. When a user attempts to create a post in a community they are not subscribed to, the post creation request is rejected. The user must subscribe to the community before creating a post.

### Unsubscribed Community Viewing

A user can view the content of any community, even if they are not subscribed to that community. This includes viewing community details, post lists, and individual posts. Subscribers have access to all the same viewing capabilities as non-subscribers, with subscription only affecting the ability to create content.

### Subscription List Authentication

A user must be logged in to view their list of subscribed communities. Logged-out users cannot access their subscription list. When a logged-out user attempts to view subscribed communities, the request is rejected with an authentication requirement.

### Unsubscribe Content Preservation

When a user unsubscribes from a community, all posts and comments they have already created in that community remain visible and accessible. Unsubscribing does not delete or hide any existing content the user has contributed. The user retains full access to their historical contributions in the community.

## Post Error Scenarios

Users attempting to create a post without entering a title are prevented from posting, as title is required. Users cannot create posts in communities where they are not subscribed, and the system blocks this action. Post editing is limited to the original author, and other users cannot modify someone else's post. Users cannot delete posts they do not own, regardless of their role in the community. When a post is deleted, all associated comments are removed, and the comment count updates to reflect the deletion. Moderators can delete any post in their community, including posts owned by other users.

### Post Title Validation

Users can create a post only when they enter a title. If the title field is empty, the system rejects the post creation request.

The system validates that the title is not empty before accepting a post. An empty title prevents post creation.

When post creation is attempted with an empty title, the request fails and no post is created.

### Subscription Requirement for Posting

Users can create posts only in communities to which they are subscribed.

If a user attempts to create a post in a community where they are not subscribed, the system blocks the action.

Subscriptions must be confirmed before a user can post content in that community. The system checks subscription status before allowing post creation.

### Post Editing Permissions

Users can edit only their own posts. Other users cannot modify posts they did not create.

The system validates that the user editing a post is the original author before allowing the edit.

If a user attempts to edit another user's post, the system rejects the edit request. Only the post author can modify post content.

### Post Deletion Ownership

Users can delete only their own posts. Other users cannot delete posts they do not own.

The system validates ownership before allowing post deletion. Users attempting to delete posts they do not own are blocked.

If a non-owner attempts to delete a post, the deletion request is rejected. Ownership is required to remove content.

### Comment Cascade on Post Deletion

When a post is deleted, all comments associated with that post are also removed.

The system performs cascade deletion, ensuring no orphaned comments remain after post deletion.

The comment count on the post reflects the complete removal of all comments when the post is deleted.

### Moderator Post Deletion Authority

Moderators can delete any post within their community, regardless of who created the post.

This moderator authority extends beyond post ownership, allowing moderators to remove content from any user.

When a moderator deletes a post, the cascade deletion rule applies, removing all associated comments as well.

## Comment Error Scenarios

Users attempting to write a comment must be logged in, and the system blocks anonymous comment creation. Users cannot edit comments that were written by other users, regardless of their relationship to the post or author. Users cannot delete comments that do not belong to them, even if they are the post owner. When a user deletes their comment, all replies nested under that comment are also removed. Comment replies have no depth limit, allowing unlimited nesting of responses. Users cannot reply to comments that have been deleted.

### Comment Creation Authentication

Only logged-in users can write comments on posts. Anonymous users and guests are blocked from creating comments. When an unauthenticated user attempts to write a comment, the system displays an error message and does not allow the action. The system requires user authentication before accepting any comment submission request. Users must be logged in to submit comments, reply to existing comments, or participate in any comment-related activity.

### Comment Editing Ownership

Users can only edit comments that they themselves have written. A user cannot modify comments created by other users, even if they are the post owner or a moderator. When a user attempts to edit a comment they do not own, the system rejects the request and displays an appropriate error message. The system verifies comment ownership before allowing any edit operation to proceed. Only the original author has permission to modify the content of their comment.

### Comment Deletion Ownership

Users can only delete comments that they themselves have written. Users cannot delete comments created by other users, even if they are the post owner or a moderator. When a user attempts to delete a comment they do not own, the system rejects the request and displays an appropriate error message. The system verifies ownership before allowing any delete operation. Each user maintains exclusive deletion rights over their own comments.

### Nested Reply Deletion

When a user deletes a comment, all replies nested under that comment are automatically deleted as well. This cascade deletion removes the entire reply thread attached to the deleted comment. The system processes this deletion automatically without requiring additional actions from users. All nested replies are removed from the system when their parent comment is deleted. This ensures no orphaned replies remain in the comment structure.

### Unlimited Reply Nesting

Comment replies can be nested to unlimited depth, with no restrictions on how many levels of replies are allowed. A reply can itself have replies, and those replies can have further replies without any depth limit. The system supports infinite nesting of comment threads. Users can continue replying to replies indefinitely. The comment structure allows for arbitrary levels of conversation depth without system-imposed restrictions.

### Replies to Deleted Comments

Users cannot write replies to comments that have been deleted. When a comment is deleted, it is no longer available for new replies to be added. The system prevents any attempt to reply to a deleted comment and displays an appropriate error message. This restriction ensures the comment thread remains consistent after deletion. Users can only reply to comments that currently exist and have not been removed.

## Vote Error Scenarios

Users can only vote once per post or comment, and attempting to vote again requires removing the existing vote first. Users cannot vote on content from communities they have been banned from, and the system blocks voting actions in banned communities. Vote changes from upvote to downvote or vice versa automatically adjust the score accordingly. Users attempting to remove their vote from content that was already deleted cannot perform this action. Vote score calculation excludes votes that have been removed by the voter. Karma adjustments from votes occur immediately upon voting action, including negative karma when downvoted.

### Single Vote Per Content Restriction

Each member may cast only one vote on any given post or comment.

Once a member has voted on content, they cannot cast another vote without first removing their existing vote.

If a member attempts to vote on content they have already voted on, the request is rejected until the existing vote is removed.

The system tracks each member's voting history to enforce this restriction.

A member cannot simultaneously have both an upvote and a downvote on the same post or comment.

### Voting Blocked in Banned Communities

Members who have been banned from a community cannot vote on posts or comments within that community.

When a member attempts to vote on content from a community they are banned from, the voting action is blocked and an error is returned.

Banned members are prevented from both upvoting and downvoting in the banned community.

The ban status is checked before any voting action is permitted.

Banned members retain the ability to view posts and comments in the banned community, but voting actions are restricted.

Once a ban is lifted by a moderator, the member may resume voting in that community.

### Vote Direction Change Mechanics

Members may change their vote direction from upvote to downvote or from downvote to upvote.

When a member changes their vote direction, the vote score is automatically adjusted by the appropriate amount.

Changing from an upvote to a downvote decreases the score by 2 points.

Changing from a downvote to an upvote increases the score by 2 points.

The member's karma is adjusted accordingly when changing vote direction.

The system removes the previous vote and replaces it with the new vote direction.

A member cannot change their vote to a direction that matches their existing vote.

### Vote Removal on Deleted Content

Members may remove their vote from content that still exists in the system.

When content is deleted by its author or a moderator, any existing votes on that content are automatically removed.

Members cannot remove votes from content that has already been deleted.

If a member attempts to remove a vote from content that was deleted, the action is rejected.

Votes are removed automatically when the content they were cast upon no longer exists.

The vote score is recalculated to exclude all removed votes.

### Score Calculation Excludes Removed Votes

The vote score is calculated as the total number of upvotes minus the total number of downvotes.

When a member removes their vote, the vote score is immediately recalculated.

Removed votes are excluded from the score calculation entirely.

The updated score reflects the state of all remaining votes only.

Score calculations are performed in real-time whenever votes are added, removed, or changed.

The system does not retain removed votes in any score calculation.

### Immediate Karma Adjustment on Voting

When a member votes on content, their karma score is adjusted immediately.

Upvoting another member's post or comment increases the recipient's karma by 1 point.

Downvoting another member's post or comment decreases the recipient's karma by 1 point.

When a member removes their vote, the recipient's karma is adjusted back by the corresponding amount.

Karma adjustments occur at the moment the voting action is completed.

Karma scores may be negative when a member has received more downvotes than upvotes.

## Report Error Scenarios

Users must provide a reason when reporting any post or comment, and the system rejects report submissions without a reason. Moderators cannot approve or dismiss reports for content outside their community's scope. Users cannot report their own content through the reporting system. When a report is approved, the reported content is deleted, and the reporter may be notified depending on system settings. Dismissed reports are removed from the report list immediately and are no longer visible to moderators. Moderators can view the complete report history including who reported, what was reported, and the reason provided.

### Report Reason Required

Users must provide a reason when reporting any post or comment.
The system rejects report submissions where the reason field is empty or contains only whitespace.
The reason text field has a maximum length of 500 characters.
If the reason is too long, the user is prompted to shorten their text before submission.

### Moderator Report Scope Limitation

Moderators can only view and manage reports for posts and comments within their own community.
A moderator cannot approve or dismiss reports for content belonging to a different community.
The system prevents moderators from taking action on reports outside their authorized scope.
When a moderator attempts to act on out-of-scope content, the request is rejected with an appropriate message.

### Self-Reporting Prohibited

Users cannot report their own posts through the reporting system.
Users cannot report their own comments through the reporting system.
The system validates that the reporter is not the author of the content being reported.
If a user attempts to report their own content, the request is rejected.

### Report Approval Content Deletion

When a moderator approves a report, the reported content (post or comment) is permanently deleted.
The deleted content is no longer visible to any users, including the original author.
The reporter's submission triggers deletion, not the report status alone.
Approved reports remain in the moderator's report history for audit purposes, but the associated content is removed.

### Dismissed Report Removal

When a moderator dismisses a report, the report is immediately removed from the moderator's report view.
Dismissed reports are no longer visible to any moderators for action.
Dismissed reports do not remain in the active report list.
The original content remains unchanged and visible after dismissal.
Dismissed reports are not permanently erased from the system but are excluded from active moderator workflows.

### Report History Visibility

Moderators can view a complete list of all reports submitted for their community.
Each report entry shows the reported content (title or content preview), the reporter's username, and the reason text provided.
Moderators can access reports regardless of their current status (pending, approved, or dismissed).
Users cannot view the list of reports they have submitted or the status of their reports.

## Feed Error Scenarios

The home feed is only available to logged-in users, and anonymous users are redirected to the popular feed. Popular feed is accessible to all users, including those who are not logged in. Community feed is accessible to everyone regardless of subscription status. When viewing feeds, posts from banned communities are excluded from all feed types for banned users. Empty feeds occur when a user has no subscriptions, and the system shows a message indicating no posts available. Feed content is paginated, and users must navigate through pages to view older posts.

### Home Feed Access Requirement

The home feed is exclusively available to logged-in members. Anonymous users attempting to access the home feed are automatically redirected to the popular feed. A user must be authenticated before viewing personalized content from subscribed communities. The system verifies authentication status before displaying home feed content.

### Popular Feed Public Access

The popular feed is accessible to all users, including those who are not logged in. Anonymous users can browse the popular feed without authentication. The popular feed displays posts from all communities across the platform, regardless of user subscriptions. Post details including title, author, community, vote score, and comment count are visible to all users.

### Community Feed Unrestricted Access

The community feed is accessible to all users regardless of subscription status. Users can view posts from any community without requiring membership. However, users cannot create posts in a community they are not subscribed to, even when viewing its feed. The feed displays post information including title, author, community name, vote score, and comment count for all users.

### Banned User Feed Exclusion

Users who have been banned from a community cannot view content from that banned community in any feed type. Banned users are excluded from seeing posts and comments from communities where they are banned. Banned users retain the ability to view content from other communities they are not banned from. When a user is banned, their access to that specific community's feed is immediately restricted.

### Empty Subscription Feed Handling

When a user has no subscribed communities, the home feed displays a message indicating no posts are available. Users with zero subscriptions see an empty state with a clear indication that they need to subscribe to communities to view content. The empty state message states that the user has not subscribed to any communities and cannot view posts in the home feed until subscriptions are added. Users are prompted to browse and subscribe to communities to populate their home feed.

### Feed Pagination Navigation

All feed types support pagination for browsing posts. Users must navigate through multiple pages to view older posts beyond the initial page. The system displays a limit of posts per page, and users use navigation controls to load additional posts. Pagination ensures consistent loading performance and prevents overwhelming the user with excessive content on a single page. Users can navigate to previous and next pages to browse the complete feed history.

## Sorting Error Scenarios

All feed types support the same sorting options: hot, new, top, and controversial. The top sorting option includes time filters: today, this week, this month, this year, and all time. When no posts match the sorting criteria, the feed shows empty results with no errors. Controversial sorting displays posts with many votes but scores close to zero. Sorting does not change the actual vote scores, only the order in which posts appear. Switching between sort options immediately refreshes the feed with the new order.

### Sorting Options Availability

All feed types support the same four sorting options: hot, new, top, and controversial.

The hot sorting option ranks posts by recency combined with vote count. Recently posted posts with more upvotes appear at the top of the feed.

The new sorting option ranks posts strictly by creation time. Most recently created posts appear at the top of the feed.

The top sorting option ranks posts by vote score. Highest vote scores appear at the top of the feed.

The controversial sorting option ranks posts by vote count regardless of direction. Posts with many votes but a score close to zero appear at the top of the feed.

Each sorting option applies consistently across home feed, popular feed, and community feed.

### Top Time Filter Options

The top sorting option includes time filter selections that limit which posts are included in the ranking.

Available time filter options are: today, this week, this month, this year, and all time.

The today filter includes only posts created within the current calendar day.

The this week filter includes only posts created within the current week.

The this month filter includes only posts created within the current calendar month.

The this year filter includes only posts created within the current calendar year.

The all time filter includes all posts regardless of creation date.

When no posts exist for a selected time filter, the feed displays empty results.

### Empty Result Handling

When a sorting query returns no matching posts, the feed displays empty results without showing errors.

An empty feed displays a message indicating that no posts match the current criteria.

Empty feeds may occur when no posts exist for a selected time filter in top sorting.

Empty feeds may occur when no posts exist in communities the user is subscribed to for home feed sorting.

Empty feeds may occur when a community has no posts yet for community feed sorting.

The system does not attempt alternative sorting when empty results are returned.

Users can change the sort option or time filter to view different posts.

### Controversial Score Definition

Controversial sorting identifies posts with many votes but a score close to zero.

A controversial post has received both upvotes and downvotes from different users.

The controversial score is determined by the balance between upvotes and downvotes.

Posts with a score between negative one and positive one are considered controversial.

The controversial sorting requires a minimum total vote count to qualify for display.

Posts with only upvotes or only downvotes do not appear in controversial sorting.

The controversy threshold applies equally to all feed types.

### Sorting Does Not Modify Scores

Sorting operations only affect the order in which posts appear in feeds.

Sorting does not change the actual vote score of any post.

Sorting does not affect the karma score of the post author.

Sorting does not modify the total comment count of any post.

Sorting is a display-only operation with no side effects on data.

Changing the sort option does not trigger vote recalculations.

The vote score remains constant regardless of which sort option is selected.

### Sort Refresh Behavior

Switching between sort options immediately refreshes the feed with the new ordering.

The refresh happens automatically when a user selects a different sort option.

The system loads posts according to the new sort order without requiring a manual page reload.

During the refresh, the feed displays a loading state while new posts are retrieved.

The previously selected sort option is retained until the user explicitly changes it.

Pagination continues from the current position when the sort order changes.

The sort option persists across feed page navigation until changed.

# End-to-End User Scenarios

Cross-domain user scenarios that span multiple concepts, describing complete user journeys.

## Cross-Domain User Scenarios

Define end-to-end user scenarios that span multiple concepts, describing complete user journeys from start to finish.

### Community Creation and Management Journey

Any registered user can create a new community by providing a unique name, description text, and icon image.

The user who creates a community automatically becomes its owner with full moderation authority.

The owner can add other users as moderators to the community.

The owner can remove moderators from the community at any time.

Moderators added by the owner can also add other moderators to the community.

Moderators cannot remove the owner from the community.

Moderators cannot remove each other from the community - only the owner can remove moderators.

When viewing a community, users can see the subscriber count displayed on the community page.

Users can browse a list of all communities available on the platform.

Users can search for communities by name to find specific communities.

A community name must be unique across the entire platform.

The owner is the only user who can remove other moderators from the community.

Users who are banned from a community cannot create posts or comments in that community.

Banned users can still view content in the banned community.

Unsubscribing from a community does not affect any posts or comments the user has already created.

The community owner can view the list of all moderators in their community.

Only subscribers to a community can create posts in that community.

Any user can subscribe to any community without approval.

Any user can unsubscribe from any community they are subscribed to.

Users can view a list of all communities they are currently subscribed to.

The owner automatically has all moderation permissions from the moment the community is created.

Moderator permissions allow deleting posts and comments, banning users, and viewing reports for that community.

When a moderator approves a report, the reported content is deleted from the community.

When a moderator dismisses a report, the report is removed from the report list and content is kept.

Reports show the reported content, the user who reported it, and the reason for the report.

Moderators can only see reports for communities they have moderation authority in.


### Post Creation and Engagement Journey

Users can create a post in any community they are subscribed to.

Every post must have a title that cannot be empty.

A post must be one of three types: text post, link post, or image post.

Text posts contain text content entered by the user.

Link posts contain a URL that users can visit.

Image posts contain an uploaded image file.

Users can edit their own posts after creating them.

Users can delete their own posts at any time.

When a post is deleted, all comments on that post are also deleted.

Users cannot edit posts created by other users.

Users cannot delete posts created by other users.

When viewing a single post, users see the title, full content, author, community, vote score, comment count, and when it was posted.

The post author is displayed as the username of the user who created the post.

The post community is displayed as the name of the community where the post was created.

Users can see how many comments exist on a post from the post list view.

Text posts in the post list show the first 200 characters of the content.

Image posts in the post list show a thumbnail of the image.

Link posts in the post list show the domain name of the URL.

Users must be logged in to create posts in communities.

Guests can view posts in popular and community feeds but cannot create posts.

The vote score for a post is calculated as total upvotes minus total downvotes.

Users can change their vote on a post from upvote to downvote or vice versa.

Users can remove their vote from a post entirely.

Each user can only have one vote per post at any time.

Voting on a post updates the author's karma score accordingly.

When a post is deleted, the votes on that post no longer affect karma scores.


### Comment Thread Participation Journey

Users can write a comment on any post in the platform.

Users can reply to any existing comment on a post.

Replies can have their own replies, creating nested threads.

There is no limit to how deep the comment reply nesting can go.

Users can edit their own comments after posting them.

Users can delete their own comments at any time.

When a comment is deleted, all replies to that comment are also deleted.

Users cannot edit comments created by other users.

Users cannot delete comments created by other users.

Each comment shows the author's username, comment content, vote score, time since posted, and nested replies.

Users must be logged in to write comments on posts.

Guests can view comments but cannot create them.

Comments on a post can be sorted by best, new, or controversial.

Best sorting shows comments with the highest vote score first.

New sorting shows the most recently created comments first.

Controversial sorting shows comments with many votes but a score close to zero.

Users can vote on comments just like they vote on posts.

Users can upvote or downvote any comment they see.

Each user can only have one vote per comment at any time.

Users can change their vote on a comment from upvote to downvote or vice versa.

Users can remove their vote from a comment entirely.

The comment score is calculated as total upvotes minus total downvotes.

When a post is deleted, all comments on that post including nested replies are deleted.

Comment deletion cascades to all direct and nested replies under that comment.

The time since posted shows relative time like "3 hours ago" for comments.


### Vote Management Across Content Journey

Users can upvote posts to increase their vote score by one.

Users can downvote posts to decrease their vote score by one.

Users can upvote comments to increase their vote score by one.

Users can downvote comments to decrease their vote score by one.

Each user can only vote once per post at any time.

Each user can only vote once per comment at any time.

Users can change their vote from upvote to downvote.

Users can change their vote from downvote to upvote.

Users can remove their vote from any post entirely.

Users can remove their vote from any comment entirely.

When a user removes their vote, the vote score adjusts by one in the opposite direction.

Vote score equals total upvotes minus total downvotes for any content.

When a post or comment is deleted, votes on that content no longer count.

Deleting content removes it from all feeds where it appears.

Votes on deleted content are removed from the score calculation.

User karma changes based on votes received on their posts and comments.

Each upvote on a user's post or comment increases their karma by one.

Each downvote on a user's post or comment decreases their karma by one.

Karma can be a negative number if a user receives more downvotes than upvotes.

When a user removes their vote, the content author's karma adjusts accordingly.

Users can see the vote score on any post or comment they view.

Users can only vote on content in communities they are not banned from.

Users banned from a community cannot vote on posts or comments in that community.

Guest users cannot vote on any posts or comments.

Voting on content updates the user's karma score immediately.


### Reporting and Moderation Workflow

Users can report any post on the platform.

Users can report any comment on the platform.

When reporting content, users must provide a reason as text.

The reason for reporting is required and cannot be empty.

Users cannot report their own content.

Users cannot report themselves.

Moderators can view all reports for communities they moderate.

Each report shows the reported content, the user who reported it, and the reason.

Moderators can approve a report to delete the reported content.

When a report is approved, the reported post or comment is deleted.

Moderators can dismiss a report to keep the reported content.

When a report is dismissed, it is removed from the report list.

Moderators can view reports across all posts and comments in their community.

Users who submit reports can see the status of their reports through the report list.

Only moderators have access to view the list of reports.

Regular users cannot see reports submitted by other users.

Approved reports result in permanent deletion of the reported content.

Dismissed reports leave the content visible to all users.

Moderators cannot take actions on reports in communities where they do not have authority.

Reports are tied to specific posts or comments and persist until action is taken.

Report approval or dismissal is recorded with moderator information.


### Feed Exploration and Discovery Journey

Users can view the home feed which shows posts from communities they are subscribed to.

The home feed is only available to logged-in users.

Guest users cannot access the home feed.

Users can view the popular feed which shows posts from all communities across the platform.

The popular feed is available to all users including those who are not logged in.

Users can view the community feed for any specific community.

The community feed shows all posts from that single community.

The community feed is available to everyone regardless of login status.

All three feeds can be sorted by hot, new, top, or controversial.

Hot sorting shows recent posts with many upvotes appearing first.

New sorting shows the most recently created posts appearing first.

Top sorting shows posts with the highest vote score first.

The top sort option includes time filters: today, this week, this month, this year, and all time.

Controversial sorting shows posts with many votes but a score close to zero.

All feeds are paginated to display posts in chunks.

Users can navigate through pages of posts in any feed.

When a post is deleted, it is removed from all feeds immediately.

The home feed updates to reflect new subscriptions and unsubscriptions.

Posts in the feed list show title, author username, community name, vote score, comment count, and time since posted.

Text posts in feeds show the first 200 characters of content.

Image posts in feeds show a thumbnail image.

Link posts in feeds show the domain name of the URL.


### Profile and Karma Tracking Journey

Each user has a profile page accessible to all users.

A user's profile shows their display name, bio text, and avatar image.

Users can view any other user's profile in the platform.

Users can edit their own display name.

Users can edit their own bio text.

Users can upload or change their own avatar image.

A user's profile displays their total karma score.

The karma score can be positive, negative, or zero.

A user's profile shows a list of all posts they have created.

A user's profile shows a list of all comments they have written.

Users can see when their posts were created in their profile.

Users can see when their comments were written in their profile.

Deleting a post removes it from the user's profile post list.

Deleting a comment removes it from the user's profile comment list.

The profile displays the community name for each post created by the user.

The profile displays the post title for each post in the list.

Guest users can view any profile but cannot edit profiles.

Only the profile owner can edit their own profile information.

Users cannot view or edit another user's profile.

Karma changes are reflected immediately in the user's karma score.

When a user's posts are deleted by a moderator, the karma is adjusted.


### Account Lifecycle and Security Journey

Users can sign up for an account using their email address and password.

During signup, users choose a unique username for their account.

Email addresses must be unique across all users.

Usernames must be unique across all users on the platform.

Users can log in using their email address and password.

Users can change their password at any time from their account settings.

Users can delete their account from their account settings.

When a user deletes their account, all their posts are also deleted.

When a user deletes their account, all their comments are also deleted.

Account deletion is irreversible - all data is permanently removed.

Users must provide their current password to change their password.

Users must be logged in to access account settings.

Guest users cannot change their password or delete their account.

Duplicate email addresses are rejected during account creation.

Duplicate usernames are rejected during account creation.

A user's karma score is associated with their account.

When an account is deleted, the karma score is no longer accessible.

The account owner is the only user who can delete their own account.

Account deletion removes the user from all communities they own.

Users who have created communities become owners of those communities.

When an owner account is deleted, the communities may become ownerless.


### Moderation Actions and Authority Journey

The community creator becomes the owner with the highest authority.

The owner has full control over all moderation actions in their community.

The owner can ban users from the community.

The owner can unban users who were previously banned.

The owner can delete any post in their community.

The owner can delete any comment in their community.

Moderators added to a community can delete any post in that community.

Moderators added to a community can delete any comment in that community.

Moderators added to a community can ban users from that community.

Moderators added to a community can unban users from that community.

Moderators cannot remove the owner from the community.

Moderators cannot remove other moderators from the community.

Only the owner can remove moderators from the community.

Banned users cannot create posts in the banned community.

Banned users cannot create comments in the banned community.

Banned users can still view posts in the banned community.

Banned users can still view comments in the banned community.

Users can view the list of banned users for a community.

Only moderators can view the list of banned users for their community.

Moderator actions are recorded with moderator information.

The owner can add any user as a moderator to their community.

When a community owner is banned, the community may need a new owner.


# File Storage

File upload capabilities, media processing, and storage requirements.

## File Upload and Management

Define file upload capabilities, supported formats, processing requirements, and access control for stored files.

### Image Upload for Posts

Users can upload an image when creating an image post in a community.

To create an image post, users select the image post type and provide a title for the post.
The user uploads an image file that will be displayed as the post content.
The uploaded image becomes the visual content associated with the post.
When viewing the post, other users see the uploaded image along with the post title.
The image is stored and displayed in the feed where it appears as a thumbnail.
The original image is accessible when users view the full post.

If the user does not provide a title, the request to create the image post is rejected.
If the user is not subscribed to the target community, the request to create the image post is rejected.

### Supported Media Types

The system supports image uploads for image posts.

Three post types are available on the platform:

- Text post: contains text content entered by the author
- Link post: contains a URL that users can navigate to
- Image post: contains an uploaded image file

Each post type displays differently in feeds:
- Text posts show the first 200 characters of content in the post list
- Link posts show the domain name of the URL in the post list
- Image posts show a thumbnail of the uploaded image in the post list

When viewing a single post in full view:
- Text posts display the complete text content
- Link posts display the full URL that users can access
- Image posts display the full uploaded image