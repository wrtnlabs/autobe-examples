**redditCommunity — Business rules, validation constraints, data browsing expectations, error scenarios**

Business rules, validation constraints, data browsing expectations, error scenarios

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## User Rules

Users must sign up with an email address and password, and choose a username that is unique across the platform. The username cannot be changed after account creation and must remain unique. Each user has a profile containing a display name, bio text, and avatar image, all of which can be edited by the user at any time. Users can change their password through the account settings. When a user deletes their account, all posts and comments they created are also permanently deleted from the platform. Email and password are required for both signup and login operations. The display name, bio, and avatar are optional profile fields that other users can view on the profile page.

### Username Uniqueness

The username chosen during signup must be unique across all users on the platform. If a username is already taken by another user, the signup request is rejected. When viewing posts and comments, the author's username is displayed to identify the content creator.

### Account Authentication

Users must provide both email and password to sign up for an account. Users must provide both email and password to log in to an existing account. If the email address is not associated with any account, the login request is rejected. If the password does not match the email address, the login request is rejected. Both email and password are required fields during signup; if either is missing, the request is rejected. Guests cannot access features that require authentication, such as creating posts, commenting, voting, or subscribing to communities.

### Password Management

Users can change their password through the account settings. When changing a password, the user must provide their current password for verification. If the current password is incorrect, the password change request is rejected. After a successful password change, the user can log in using the new password. The old password becomes invalid immediately after the change. Users must log in again if their password is changed while they have an active session.

### Profile Editing

Users can edit their own display name at any time. Users can edit their own bio text at any time. Users can edit their own avatar image at any time. Other users can view any user's profile, including their display name, bio, and avatar. If a user has not set a display name, bio, or avatar, the profile shows empty or default values for those fields. Users cannot edit another user's profile information.

### Account Deletion

Users can delete their own account at any time. When a user deletes their account, all posts created by that user are permanently deleted from the platform. When a user deletes their account, all comments written by that user are permanently deleted from the platform. The deletion of posts and comments happens automatically as part of the account deletion process. Once an account is deleted, it cannot be recovered. The username becomes available for other users to choose after the account is deleted. Deleted posts and comments are removed from all community feeds and post views.

## Community Rules

Any user can create a community, and the community name must be unique across the platform. When a community is created, the creator automatically becomes the owner with the highest authority. A community requires a name, description text, and icon image to be established. The community name cannot be duplicated by another community. Each community tracks and displays its subscriber count, which updates as users subscribe or unsubscribe. The owner role cannot be removed or transferred through normal operations. Community description and icon can be updated by the owner or moderators.

### Community Name Uniqueness

Each community has a name that identifies it on the platform. The community name is used to distinguish one community from another. When creating a community, the user provides a name for the community.

### Community Creation Requirements

Any user can create a community. To create a community, the user provides a name, description text, and icon image. Upon successful creation, the user who created the community becomes the owner of that community.

### Subscriber Count Tracking

Each community tracks its total subscriber count. The subscriber count increases when a user subscribes to the community. The subscriber count decreases when a user unsubscribes from the community. The count updates as subscription changes occur. The subscriber count is visible to all users viewing the community, including guests who are not logged in.

### Owner Authority and Role Permanence

The community owner holds the highest authority within that community. The owner can add moderators to the community. The owner can remove moderators from the community. The owner is the user who created the community.

### Community Search and Discovery

Users can search for communities by name. The search function matches community names against the search query. Search results display matching communities with their name, description, icon, and subscriber count. Users can browse all communities in a list view. The community list displays each community's name, description, icon, and subscriber count. Both search and browsing are available to all users, including guests who are not logged in.

## Post Rules

Every post must have a title, which is required and cannot be empty. A post must be one of three types: text post with content, link post with a URL, or image post with an uploaded image. Users can only create posts in communities where they are subscribed. The post author retains the ability to edit or delete their own posts at any time. Each post is associated with exactly one community and one author. Post type cannot be changed after creation. The title, content, author, community, vote score, comment count, and creation time are all displayed when viewing a single post.

### Post Creation Requirements

Every post must have a title, which is required and cannot be empty. A post must be one of three types: text post with content, link post with a URL, or image post with an uploaded image. Users can only create posts in communities where they are subscribed. Each post belongs to exactly one community.

Text posts require content text. Link posts require a URL. Image posts require an uploaded image. If the title is missing or empty, the request is rejected. If the user is not subscribed to the community, the request is rejected. If the post type is not one of the three valid types, the request is rejected. If a text post has no content, the request is rejected. If a link post has no URL, the request is rejected. If an image post has no image, the request is rejected.

### Post Modification Rules

The post author can edit their own posts. The post author can delete their own posts.

If a user attempts to edit a post they did not author, the request is rejected. If a user attempts to delete a post they did not author, the request is rejected.

### Post Display Attributes

Each post displays its vote score. Each post displays its comment count. When viewing a single post, users see the title, full content, author, community, vote score, comment count, and when it was posted.

Vote score is calculated as total upvotes minus total downvotes. Comment count includes all comments and replies on the post. The vote score and comment count are visible to all users viewing the post.

## Comment Rules

Users can write comments on any post, and each comment must have content. Comments can reply to other comments, creating a nested structure with no depth limit. The comment author can edit or delete their own comments at any time. Each comment is associated with exactly one post and optionally with a parent comment if it is a reply. Comments display the author, content, vote score, time since posted, and any nested replies. Comment content cannot be empty when created. The nested reply structure allows unlimited depth for conversation threads.

### Comment Content Requirements

Every comment must have content text when created. If the comment content is empty, the request is rejected. The content field is required. Users can edit their comment content after creation, but the edited content must also be non-empty. If a user attempts to save an edit with empty content, the request is rejected.

### Comment Reply Structure

Comments can be posted as replies to other comments, creating a nested conversation structure. A comment may optionally reference a parent comment when it is a reply. Comments that are not replies have no parent comment reference. The nested reply structure supports unlimited depth, meaning a reply can have its own reply indefinitely. This allows conversation threads to grow as deep as users need. There is no system-imposed limit on how many levels of nested replies can exist within a comment thread.

### Comment Author Permissions

The user who creates a comment can edit their own comment at any time. The user who creates a comment can delete their own comment at any time. When a comment is deleted by its author, the comment content is removed from view. Other users cannot edit or delete comments they did not create. Moderators can delete any comment in their community regardless of authorship (defined in Ban Rules).

### Comment Association Rules

Every comment is associated with exactly one post. A comment cannot exist without being linked to a post. When a comment is a reply, it is associated with both the post and its parent comment. The post association cannot be changed after the comment is created.

### Comment Display Information

Each comment displays the author username, the comment content, the current vote score, and the time since the comment was posted. The vote score reflects the net result of upvotes minus downvotes. The time display shows relative time such as "2 hours ago" or "1 day ago". If the comment has nested replies, those replies are displayed beneath the parent comment. The display format is consistent across all comment views regardless of sorting method.

## Vote Rules

Each user can only cast one vote per post or comment at any time. Users can upvote to add one to the score or downvote to subtract one from the score. Users can change their vote from upvote to downvote or vice versa, and the score adjusts accordingly. Users can remove their vote entirely, which reverses the previous vote's effect on the score. Vote score is calculated as total upvotes minus total downvotes. When a user upvotes a post or comment, the author's karma increases by one. When a user downvotes, the author's karma decreases by one. Karma can be negative and adjusts when votes are removed or changed.

### Single Vote Per Target

A user can cast only one vote on any single post or comment at a time. If a user attempts to vote on a post or comment where they have already cast a vote, the system rejects the request. A user cannot simultaneously upvote and downvote the same target. When a user has already voted on a target, they must either change their existing vote or remove it before casting a new vote direction. This constraint applies to both posts and comments equally. If the target post or comment does not exist, the vote request is rejected. If the user is not logged in, the vote request is rejected.

### Vote Direction and Score Impact

When a user upvotes a post or comment, the vote score of that target increases by one. When a user downvotes a post or comment, the vote score of that target decreases by one. An upvote represents a positive direction and contributes positively to the vote score. A downvote represents a negative direction and contributes negatively to the vote score. The score impact is applied immediately upon successful vote submission. If the vote direction is neither upvote nor downvote, the request is rejected.

### Vote Modification

A user can change their vote from upvote to downvote on the same post or comment. A user can change their vote from downvote to upvote on the same post or comment. When a vote is changed from upvote to downvote, the vote score decreases by two. When a vote is changed from downvote to upvote, the vote score increases by two. A user can remove their vote entirely from any post or comment they have voted on. When a vote is removed, the vote score adjusts by reversing the previous vote's effect. If an upvote is removed, the score decreases by one. If a downvote is removed, the score increases by one. After vote removal, the user has no active vote on that target and can cast a new vote if desired.

### Vote Score Calculation

The vote score of a post or comment is calculated as the total number of upvotes minus the total number of downvotes. Each upvote contributes positive one to the score. Each downvote contributes negative one to the score. The vote score can be positive, zero, or negative. The vote score is recalculated whenever a vote is cast, changed, or removed. The displayed vote score reflects the current state of all votes on that target. Vote score calculation does not consider the timing of votes, only the current direction of each active vote.

### Karma Impact

When a user's post or comment receives an upvote, the author's karma score increases by one. When a user's post or comment receives a downvote, the author's karma score decreases by one. A user's karma score can be negative. When a vote on a user's content is changed, the author's karma adjusts accordingly. If a vote changes from upvote to downvote, the author's karma decreases by two. If a vote changes from downvote to upvote, the author's karma increases by two. When a vote is removed from a user's content, the author's karma reverses the previous effect. If an upvote is removed, the author's karma decreases by one. If a downvote is removed, the author's karma increases by one. When a post or comment is deleted, all karma effects from votes on that content are reversed for the author. Each user has a single karma score that aggregates votes across all their posts and comments.

## Report Rules

Users can report any post or comment in the platform. When submitting a report, users must provide a reason as text, which is required. Each report is associated with the reported content, the reporter, and the reason provided. Reports can target either posts or comments but not other content types. Moderators can view all reports for their community and take action on them. Moderators can approve a report, which deletes the reported content, or dismiss it, which keeps the content. When a report is dismissed, it is removed from the report list and no longer visible to moderators.

### Report Submission

Users can report any post or comment on the platform. When submitting a report, the user must provide a reason as text. The system automatically identifies and records the user who submitted the report. The report is associated with the specific post or comment being reported. Reports can only target posts or comments, not other content types.

### Report Moderation

Moderators can view all reports for their community. Moderators can approve a report, which results in the deletion of the reported content. Moderators can dismiss a report, which keeps the content visible and accessible. When a report is dismissed, it is removed from the report list and is no longer visible to moderators.

### Report Scope

Reports are scoped to the community where the reported content exists. Moderators can only view and act on reports for communities where they have moderator permissions. Reports for posts or comments in a community are only visible to moderators of that community. The community owner and all moderators of a community can view reports for that community.

## Ban Rules

Moderators can ban users from their community, preventing them from creating posts or comments. Banned users can still view all content in the community but cannot participate. Moderators can unban previously banned users, restoring their ability to post and comment. Each ban is associated with a specific user, community, and the moderator who issued it. Only the community owner can remove moderators from their role. Moderators cannot remove other moderators, only the owner has this authority. Moderators cannot ban or remove the community owner under any circumstances.

### Ban Creation and Scope

Moderators can ban any user from their community. Each ban is scoped to a single community, meaning a user banned from one community can still participate in other communities. The system records which moderator issued each ban. When a moderator bans a user, the ban takes effect immediately. A user can only be banned from a community once at a time; attempting to ban an already banned user has no effect.

### Banned User Restrictions

When a user is banned from a community, they cannot create new posts in that community. When a user is banned from a community, they cannot create new comments in that community. If a banned user attempts to create a post in the banned community, the request is rejected. If a banned user attempts to create a comment in the banned community, the request is rejected. Banned users can still view all content in the community, including posts and comments. Banned users can still vote on posts and comments in the community. Banned users can still subscribe or unsubscribe from the community.

### Unban Process

Moderators can unban any user they previously banned from their community. When a user is unbanned, their ability to create posts and comments in the community is immediately restored. The system removes the ban record when a user is unbanned. Only moderators who have ban authority in the community can unban users. A user who has never been banned from a community cannot be unbanned from it.

### Owner and Moderator Protection

Only the community owner can remove moderators from their role. Moderators cannot remove other moderators from their role. Moderators cannot remove the community owner from their role.

## Subscription Rules

Users can subscribe to any community on the platform without restriction. Users can unsubscribe from any community they are currently subscribed to at any time. Subscribing to a community is required before a user can create posts in that community. Each subscription links a user to a community and records the subscription time. Users can view a list of all communities they are subscribed to. A user cannot have duplicate subscriptions to the same community. Subscription status determines access to post creation features within a community.

### Subscription Creation Rules

A user can subscribe to any community on the platform without restriction. WHEN a user subscribes to a community, THE system SHALL record the subscription time. IF a user attempts to subscribe to a community they are already subscribed to, THEN THE system SHALL reject the request to prevent duplicate subscriptions. Each subscription creates a unique link between a user and a community. THE system SHALL ensure that each user can have only one active subscription per community at any time.

### Subscription Removal Rules

A user can unsubscribe from any community they are currently subscribed to at any time. WHEN a user unsubscribes from a community, THE system SHALL remove the subscription link immediately. IF a user attempts to unsubscribe from a community they are not subscribed to, THEN THE system SHALL reject the request. Unsubscribing does not affect the user's ability to view the community or its content. Unsubscribing removes the user's ability to create posts in that community.

### Subscription-Based Posting Access

A user must be subscribed to a community before creating posts in that community. WHEN a user attempts to create a post in a community, THE system SHALL verify the user's subscription status to that community. IF the user is not subscribed to the community, THEN THE system SHALL reject the post creation request. IF the user is banned from the community, THEN THE system SHALL reject the post creation request regardless of subscription status. THE system SHALL check subscription status as a gate for post creation permission. This subscription requirement applies only to post creation, not to viewing posts or comments.

### Subscription List Access

A user can view a list of all communities they are subscribed to. THE system SHALL display each subscribed community with its name, description, and subscriber count. WHEN a user requests their subscription list, THE system SHALL retrieve all active subscriptions for that user. The subscription list SHALL be sorted by subscription time, with the most recently subscribed communities appearing first. IF a user has no subscriptions, THEN THE system SHALL display an empty list with an appropriate message. The subscription list is accessible only to the authenticated user for their own subscriptions.

# Data Browsing Expectations

Business expectations for how users browse, find, and navigate through lists of data.

## List Browsing Expectations

Define business expectations for how users find, filter, and browse lists.

### Filtering Rules

WHEN a user searches for communities, THE system SHALL filter communities by matching the search text against community names.

WHEN a logged-in user views the home feed, THE system SHALL filter posts to show only posts from communities the user is subscribed to.

WHEN any user views the popular feed, THE system SHALL include posts from all communities across the platform.

WHEN a user views a community feed, THE system SHALL filter posts to show only posts belonging to that specific community.

WHEN a moderator views reports, THE system SHALL filter reports to show only reports for posts and comments within the moderator's community.

WHEN a user views their subscription list, THE system SHALL filter communities to show only communities the user is subscribed to.

IF a search query matches no communities, THEN THE system SHALL return an empty list.

IF a user is not subscribed to any communities, THEN THE system SHALL return an empty home feed.

### Sorting Rules

WHEN a user views any post feed, THE system SHALL support sorting by Hot, New, Top, or Controversial.

WHEN sorting by Hot, THE system SHALL order posts with recent creation time and high upvote counts first.

WHEN sorting by New, THE system SHALL order posts by most recently created first.

WHEN sorting by Top, THE system SHALL order posts by highest vote score first.

WHEN sorting by Top, THE system SHALL allow the user to select a time filter: today, this week, this month, this year, or all time.

WHEN sorting by Controversial, THE system SHALL order posts that have many votes but a vote score close to zero first.

WHEN a user views comments on a post, THE system SHALL support sorting by Best, New, or Controversial.

WHEN sorting comments by Best, THE system SHALL order comments by highest vote score first.

WHEN sorting comments by New, THE system SHALL order comments by most recent first.

WHEN sorting comments by Controversial, THE system SHALL order comments that have many votes but a vote score close to zero first.

IF no sort option is selected, THEN THE system SHALL apply a default sort order of Hot for post feeds and Best for comments.

### Pagination Rules

WHEN a user views any post feed, THE system SHALL present posts in paginated form.

WHEN a user views the community list, THE system SHALL present communities in paginated form.

WHEN a user views comments on a post, THE system SHALL present comments in paginated form.

WHEN a user requests the next page, THE system SHALL load the next set of items according to the current sort order.

WHEN a user requests the previous page, THE system SHALL load the previous set of items according to the current sort order.

IF a user reaches the last page of results, THEN THE system SHALL indicate that no more items are available.

IF a feed contains no items, THEN THE system SHALL display an empty state message.

WHEN the underlying data changes, THE system SHALL not automatically refresh the current page to avoid disrupting the user's browsing experience.

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### Authentication and Account Errors

If the email address is already registered, the signup request is rejected.
If the chosen username is not unique, the signup request is rejected.
If the email or password does not match any account, the login request is rejected.
If the user attempts to change their password without proper authentication, the request is rejected.
If the user attempts to delete their account without proper authentication, the request is rejected.

### Content Validation Errors

If a post is created without a title, the request is rejected.
If a post type is not one of the three valid types (text, link, or image), the request is rejected.
If a text post is created without text content, the request is rejected.
If a link post is created without a URL, the request is rejected.
If an image post is created without an uploaded image, the request is rejected.
If a comment is created without content, the request is rejected.
If a report is submitted without a reason, the request is rejected.

### Permission and Authorization Errors

If a user attempts to edit another user's post, the request is rejected.
If a user attempts to delete another user's post, the request is rejected.
If a user attempts to edit another user's comment, the request is rejected.
If a user attempts to delete another user's comment, the request is rejected.
If a user attempts to vote on a post or comment they have already voted on without changing their vote, the request is rejected.
If a moderator attempts to remove the community owner, the request is rejected.
If a moderator attempts to remove another moderator, the request is rejected.

### Community Access Errors

If a user attempts to create a post in a community they are not subscribed to, the request is rejected.
If a banned user attempts to create a post in the community where they are banned, the request is rejected.
If a banned user attempts to create a comment in the community where they are banned, the request is rejected.
If a community name is not unique, the community creation request is rejected.
If a user attempts to view a post that does not exist, the request is rejected.
If a user attempts to view a comment that does not exist, the request is rejected.
If a user attempts to view a community that does not exist, the request is rejected.

### Moderation and Report Errors

If a user who is not a moderator attempts to view reports for a community, the request is rejected.
If a user who is not a moderator attempts to approve or dismiss a report, the request is rejected.
If a user who is not a moderator attempts to ban a user from a community, the request is rejected.
If a user who is not a moderator attempts to unban a user from a community, the request is rejected.
If a user who is not a moderator attempts to view the list of banned users, the request is rejected.
If a moderator attempts to approve or dismiss a report for a community they do not moderate, the request is rejected.

# File Validation Rules

Validation rules and policies for file uploads and storage.

## File Validation and Policies

Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.

### File Type Validation

Only image files are accepted for user avatars, community icons, and image posts.

Uploaded files must be valid image files. If a file is not a valid image, the upload is rejected.

The system validates that uploaded files are images before accepting them. Non-image files are rejected during the upload process.

### File Upload Processing

Files uploaded for avatars, community icons, and image posts are processed by the system.

Upload requests are validated to ensure files meet the platform requirements.

Files that pass validation are stored and made available for use in profiles, communities, or posts.

### Content Type Restrictions

User avatars must be image files.

Community icons must be image files.

Image posts must contain uploaded image files.

Text posts and link posts do not accept file uploads.

Each upload location accepts only image content types appropriate to its purpose.

### File Retention

Uploaded files are retained as long as the associated content exists.

When a user deletes their account, all their uploaded files (avatar, posts, comments) are deleted.

When a post is deleted, any image files attached to that post are deleted.

Files have no independent existence separate from the content they belong to.