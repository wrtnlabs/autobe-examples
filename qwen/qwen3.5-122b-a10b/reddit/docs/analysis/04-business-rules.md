**redditLike — Business rules, validation constraints, data browsing expectations, error scenarios**

Business rules, validation constraints, data browsing expectations, error scenarios

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## User Rules

Users sign up with email and password, choosing a unique username that cannot be duplicated across the platform. Users log in with their email and password credentials to access the system. Users can change their password at any time to maintain account security. Users can delete their account, which also removes all their posts and comments from the platform. Each user has a profile containing a display name, bio text, and avatar image that others can view. Users can edit their own display name, bio, and avatar to update their public information. Users can view any other user's profile to see their public information. A user's profile page shows their display name, bio, avatar, total karma score, and lists of posts and comments they have created. Every user has a single karma score represented as one number. When someone upvotes a user's post or comment, their karma increases by 1. When someone downvotes a user's post or comment, their karma decreases by 1. When someone removes their vote, the user's karma adjusts accordingly. Karma can be negative if a user receives more downvotes than upvotes.

### Account Registration

Users can create an account by providing an email address and password. The email address must be unique across the platform. Users must also choose a username, which must be unique and cannot duplicate any existing username on the platform.

If the email address is already registered, the account creation request is rejected.

If the username is already taken, the account creation request is rejected.

If the email address or password is missing, the account creation request is rejected.

If the username is missing, the account creation request is rejected.

### Account Login

Users can log in to their account using their registered email address and password.

If the email address is not registered, the login request is rejected.

If the password does not match the registered credentials, the login request is rejected.

If the email address or password is missing, the login request is rejected.

### Password Change

Users can change their password at any time while logged in. The user must provide their current password for verification, and then provide a new password.

If the current password does not match, the password change request is rejected.

If the new password is missing or empty, the password change request is rejected.

### Account Deletion and Data Cascade

Users can delete their own account. When an account is deleted, all posts created by that user are also deleted from the platform. All comments written by that user are also deleted from the platform.

This deletion is permanent and cannot be undone.

### Profile Management

Each user has a profile that displays their display name, bio text, and avatar image. These profile fields are visible to all users, including those who are not logged in.

Users can edit their own display name, bio text, and avatar image. Users cannot edit another user's profile.

If a user attempts to edit a profile that does not belong to them, the request is rejected.

### Profile Viewing

Any user can view another user's profile page. The profile page displays the user's display name, bio text, avatar image, and total karma score.

The profile page also shows a list of all posts the user has created across all communities.

The profile page also shows a list of all comments the user has written across all posts.

### Karma Score Definition

Every user has a single karma score represented as one number. This karma score is displayed on the user's profile page.

When another user upvotes a user's post, the post author's karma increases by 1.

When another user downvotes a user's post, the post author's karma decreases by 1.

When another user upvotes a user's comment, the comment author's karma increases by 1.

When another user downvotes a user's comment, the comment author's karma decreases by 1.

### Vote Removal and Change Karma Adjustment

When a user removes their vote from a post or comment, the karma score adjusts accordingly. If the user had upvoted, the author's karma decreases by 1. If the user had downvoted, the author's karma increases by 1.

When a user changes their vote from upvote to downvote on a post or comment, the author's karma decreases by 2 (removes +1, adds -1).

When a user changes their vote from downvote to upvote on a post or comment, the author's karma increases by 2 (removes -1, adds +1).

### Negative Karma Allowance

A user's karma score can be negative if they receive more downvotes than upvotes on their posts and comments combined. There is no lower or upper bound on the karma score.

## Community Rules

Any user can create a community on the platform. A community has a unique name that cannot be duplicated across the platform. A community has a description text that explains its purpose. A community has an icon image that represents it visually. The user who creates a community becomes its owner with the highest authority. Users can browse all communities in a list to discover available communities. Users can search for communities by name to find specific communities. Each community shows its subscriber count so users know its size. The community owner has special privileges including adding and removing moderators. Only the community owner can remove moderators from their community. Moderators cannot remove the owner or other moderators from the community.

### Community Creation Rules

Any user can create a community on the platform.

When creating a community, the user must provide a unique name that cannot be duplicated by any other community on the platform. If a duplicate name is attempted, the request is rejected.

The user must provide a description text that explains the purpose of the community.

The user must provide an icon image that visually represents the community.

The user who creates a community automatically becomes its owner with the highest authority over that community.

The newly created community starts with zero subscribers.

### Community Discovery and Browsing

All users, including guests, can browse a list of all communities on the platform.

All users, including guests, can search for communities by name to find specific communities.

When browsing or searching communities, each community entry displays its subscriber count so users can see the size of the community.

If no communities match the search criteria, an empty list is returned.

If the community list is empty, the browse view shows no communities.

### Moderator Management Authority

The community owner has the highest authority over their community and cannot be removed from the community by any other user.

The community owner can add moderators to their community.

The community owner can remove moderators from their community.

Moderators cannot remove the community owner from the community.

Moderators cannot remove other moderators from the community; only the owner can remove moderators.

Moderators can add other moderators to the community, but cannot remove the owner or other moderators.

## Post Rules

Users can create a post in any community they are subscribed to. Subscribing to a community is required before creating posts in that community. Every post has a title that is required and cannot be empty. A post must be one of three types: text post, link post, or image post. Text posts have text content that users can read. Link posts have a URL that users can click to visit. Image posts have an uploaded image that users can view. Users can edit their own posts to update the content. Users can delete their own posts to remove them from the community. When viewing a single post, users see the title, full content, author, community, vote score, comment count, and when it was posted. Text posts display the first 200 characters of content in post lists. Image posts display a thumbnail of the image in post lists. Link posts display the domain name of the URL in post lists.

### Post Creation Requirements

Users can create a post only in communities they have subscribed to. If a user attempts to create a post in a community they are not subscribed to, the request is rejected.

Every post must have a title. If the title is missing or empty, the post creation is rejected.

A post must be exactly one of three types: text post, link post, or image post. A post cannot have multiple types simultaneously.

### Post Type Validation

Text posts must contain text content. The content cannot be empty for text posts.

Link posts must contain a valid URL. The URL must be a properly formatted web address that users can access.

Image posts must contain an uploaded image file. The image must be a valid image format that can be displayed in the platform.

### Post Modification Rules

Users can edit their own posts after creation. Users cannot edit posts created by other users.

Users can delete their own posts at any time. When a post is deleted, it is removed from the community feed and the post list.

Moderators can delete any post in their community regardless of author. This is a moderator action defined in the community moderation rules.

### Post View Full Details

When viewing a single post, users see the following information:

- The post title
- The full content of the post (text content for text posts, image for image posts, or link for link posts)
- The author's username
- The community name where the post was created
- The vote score (total upvotes minus total downvotes)
- The comment count (total number of comments and replies on the post)
- The timestamp showing when the post was created

The vote score reflects the current state of all votes on the post.

### Post List Preview Rules

In post lists and feeds, each post displays a preview based on its type:

- Text posts: The first 200 characters of the content are shown as a preview
- Image posts: A thumbnail image is displayed
- Link posts: The domain name of the URL is shown (for example, "youtube.com")

All posts in lists also display:
- Title
- Author username
- Community name
- Vote score
- Comment count
- Time since posted (for example, "3 hours ago")

## Comment Rules

Users can write a comment on any post in the platform. Users can reply to any comment on a post. Replies can have replies with no depth limit, allowing nested discussions. Users can edit their own comments to update their content. Users can delete their own comments to remove them from the post. Each comment shows the author who wrote it. Each comment shows the content of the comment. Each comment shows the vote score for the comment. Each comment shows the time since it was posted. Each comment shows nested replies below it. Comment editing is restricted to the comment author only. Comment deletion is restricted to the comment author only. Users cannot edit or delete comments written by others.

### Comment Creation and Nesting

Users can write a comment on any post in the platform. Users can reply to any comment on a post. Replies can have replies with no depth limit, allowing nested discussions of unlimited depth.

When creating a comment, the comment is automatically associated with the posting user. The comment becomes visible immediately after creation.

If a user attempts to comment on a post that does not exist, the request is rejected.

If a user attempts to reply to a comment that does not exist, the request is rejected.

### Comment Editing and Deletion

Users can edit their own comments to update the content. Users can delete their own comments to remove them from the post.

Comment editing is restricted to the comment author only. Users cannot edit comments written by others.

Comment deletion is restricted to the comment author only. Users cannot delete comments written by others.

When a comment is edited, the updated content replaces the original content. The edit does not change the original posting time.

When a comment is deleted, the comment content is removed from display. Any replies to the deleted comment remain visible.

If a user attempts to edit a comment they do not own, the request is rejected.

If a user attempts to delete a comment they do not own, the request is rejected.

### Comment Display

Each comment displays the author username who wrote it. Each comment displays the content of the comment. Each comment displays the vote score for the comment.

Each comment displays the time since it was posted (e.g., "3 hours ago"). Each comment displays nested replies below it.

For nested replies, replies are shown indented below their parent comment. Replies can themselves have replies, creating a nested thread structure.

The vote score shown for a comment reflects the current total of upvotes minus downvotes (defined in Vote Rules).

## Vote Rules

Users can upvote a post which adds 1 to the vote score. Users can downvote a post which subtracts 1 from the vote score. Each user can only vote once per post, preventing multiple votes from the same user. Users can change their vote from upvote to downvote or vice versa. Users can remove their vote entirely from a post. Vote score equals total upvotes minus total downvotes. The same voting rules apply to comments as they do to posts. Users can upvote a comment which adds 1 to the comment vote score. Users can downvote a comment which subtracts 1 from the comment vote score. Each user can only vote once per comment. Users can change their vote on a comment or remove their vote entirely. Vote score calculation for comments follows the same formula as posts.

### Post Voting Rules

When a user upvotes a post, the post's vote score increases by 1.

When a user downvotes a post, the post's vote score decreases by 1.

Each user may cast only one vote per post. A user cannot vote multiple times on the same post.

Users can change their vote on a post from upvote to downvote or from downvote to upvote. When a vote is changed, the vote score adjusts accordingly.

Users can remove their vote from a post entirely. When a vote is removed, the vote score decreases by 1 if the user had upvoted, or increases by 1 if the user had downvoted.

The vote score for a post equals the total number of upvotes minus the total number of downvotes.

If a user attempts to vote on a post they have already voted on, their new vote replaces their previous vote.

Vote scores can be negative when downvotes exceed upvotes.

### Comment Voting Rules

When a user upvotes a comment, the comment's vote score increases by 1.

When a user downvotes a comment, the comment's vote score decreases by 1.

Each user may cast only one vote per comment. A user cannot vote multiple times on the same comment.

Users can change their vote on a comment from upvote to downvote or from downvote to upvote. When a vote is changed, the vote score adjusts accordingly.

Users can remove their vote from a comment entirely. When a vote is removed, the vote score decreases by 1 if the user had upvoted, or increases by 1 if the user had downvoted.

The vote score for a comment equals the total number of upvotes minus the total number of downvotes.

If a user attempts to vote on a comment they have already voted on, their new vote replaces their previous vote.

Vote scores can be negative when downvotes exceed upvotes.

### Vote Score Display

Vote scores are displayed on post lists in all feeds (home, popular, and community feeds).

Vote scores are displayed on individual post detail pages.

Vote scores are displayed on comment lists within post threads.

Vote scores are displayed on individual comment views.

Vote scores are shown as numeric values that can be positive, negative, or zero.

## Report Rules

Users can report any post on the platform. Users can report any comment on the platform. When reporting, users must provide a reason as text explaining why they are reporting the content. Moderators can view all reports for their community. Each report shows the reported content so moderators can review it. Each report shows who reported the content. Each report shows the reason provided by the reporter. Moderators can approve a report which deletes the reported content. Moderators can dismiss a report which keeps the content and removes the report from the list. Dismissed reports are removed from the report list permanently. Only moderators and owners can approve or dismiss reports in their community. Users cannot approve or dismiss reports themselves.

### Report Submission Rules

Users can report any post on the platform, regardless of which community it belongs to. Users can report any comment on the platform, regardless of which post it appears on. When submitting a report, the user must provide a reason as text explaining why the content violates community standards or platform rules. If the reason text is missing or empty, the report submission is rejected. A user can submit multiple reports on different content, but the system does not prevent duplicate reports on the same content by the same user.

### Report Visibility and Display

Moderators can view all reports submitted for content in their community. The report list shows the reported content so moderators can review what was reported. The report list shows the identity of the user who submitted the report. The report list shows the reason text provided by the reporter. Only moderators and owners of the community can access the report list for that community. Regular users cannot view reports, even for content they created.

### Report Resolution Actions

Moderators can approve a report, which results in the deletion of the reported content (post or comment). Moderators can dismiss a report, which keeps the reported content and removes the report from the active report list. Dismissed reports are removed from the report list permanently and cannot be restored. Only the community owner and moderators can approve or dismiss reports. Regular users cannot approve reports. Regular users cannot dismiss reports. When content is deleted due to report approval, the deletion follows the same rules as if the content owner deleted it (comments on deleted posts remain visible but show deleted status).

### Report Error Conditions

If a user attempts to report non-existent content, the request is rejected. If a user attempts to submit a report without providing a reason, the request is rejected. If a moderator attempts to approve or dismiss a report for a community they do not moderate, the request is rejected. If a moderator attempts to approve or dismiss a report in a community where they are not a moderator or owner, the request is rejected. If a regular user attempts to view the report list, the request is rejected. If a regular user attempts to approve or dismiss a report, the request is rejected. If a banned user attempts to report content in the community they are banned from, the request is rejected (banned users cannot interact with content in that community).

# Data Browsing Expectations

Business expectations for how users browse, find, and navigate through lists of data.

## List Browsing Expectations

Define business expectations for how users find, filter, and browse lists.

### Feed and Comment Sorting

Posts can be sorted using four different methods across all feeds:

**Hot**: Posts that are recent and have many upvotes appear first. This balances recency with popularity.

**New**: Posts are ordered by creation time, with the most recently created posts appearing first.

**Top**: Posts are ordered by vote score (highest first). When using this sort, users must select a time filter: today, this week, this month, this year, or all time.

**Controversial**: Posts with many total votes but a vote score close to zero appear first. This surfaces content that has generated significant debate.

Comment lists on a post can be sorted using three methods:

**Best**: Comments are ordered by vote score, with highest scoring comments appearing first.

**New**: Comments are ordered by creation time, with most recent comments appearing first.

**Controversial**: Comments with many votes but a score close to zero appear first.

### Feed Filtering and Display Rules

Users can search for communities by entering a name or partial name. The search returns communities whose names match the search term.

The home feed automatically filters to show posts only from communities the user is subscribed to. This feed is available only to logged-in users.

The popular feed shows posts from all communities across the platform without filtering by subscription. This feed is available to everyone, including logged-out users.

The community feed shows posts from one specific community. This feed is available to everyone, including logged-out users.

When viewing a post in any feed, the following information is displayed:
- Title
- Author username
- Community name
- Vote score
- Comment count
- Time since posted (e.g., "3 hours ago")

For text posts, the first 200 characters of content are shown.
For image posts, a thumbnail of the image is shown.
For link posts, the domain name of the URL is shown (e.g., "youtube.com").

### Feed Pagination

All post feeds (home, popular, and community feeds) support pagination. When a feed contains more posts than can be displayed on one page, users can navigate through additional pages.

Pagination applies to all sorting options and all feed types. The system determines how many posts appear per page.

### Feed Access and Error Conditions

If a user attempts to access the home feed while not logged in, access is denied. The home feed requires authentication.

If a user attempts to create a post in a community they are not subscribed to, the request is rejected. Subscription is required before posting.

If a banned user attempts to create a post or comment in the community where they are banned, the request is rejected. Banned users can still view content but cannot create new content.

If a search for communities returns no matches, an empty list is displayed with no error.

If a feed has no posts to display (e.g., a new community with no posts), an empty list is displayed with no error.

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### Account and Authentication Errors

When a user attempts to sign up with an email address that is already registered, the registration request is rejected.

When a user attempts to sign up with a username that is already taken, the registration request is rejected.

When a user attempts to log in with incorrect email or password, the login request is rejected.

When a user attempts to change their password without providing valid current credentials, the password change request is rejected.

When a user attempts to delete an account that has already been deleted, the deletion request is rejected.

### Community Access Errors

When a user attempts to create a community with a name that already exists, the community creation request is rejected.

When a user attempts to view a community that does not exist, the request is rejected.

When a user attempts to subscribe to a community they are already subscribed to, the subscription request is rejected.

When a user attempts to unsubscribe from a community they are not subscribed to, the unsubscription request is rejected.

When a user attempts to view a list of communities they are subscribed to but has no subscriptions, an empty list is returned.

### Post Operation Errors

When a user attempts to create a post in a community they are not subscribed to, the post creation request is rejected.

When a user attempts to create a post without providing a title, the post creation request is rejected.

When a user attempts to create a post in a community that does not exist, the post creation request is rejected.

When a user attempts to create a post of an invalid type (not text, link, or image), the post creation request is rejected.

When a user attempts to edit a post they do not own, the edit request is rejected.

When a user attempts to delete a post they do not own, the deletion request is rejected.

When a user attempts to view a post that does not exist, the request is rejected.

### Comment Operation Errors

When a user attempts to write a comment on a post that does not exist, the comment creation request is rejected.

When a user attempts to reply to a comment that does not exist, the reply request is rejected.

When a user attempts to edit a comment they do not own, the edit request is rejected.

When a user attempts to delete a comment they do not own, the deletion request is rejected.

When a user attempts to view a comment that does not exist, the request is rejected.

### Voting Errors

When a user attempts to vote on a post they have already voted on, their previous vote is replaced with the new vote.

When a user attempts to vote on a post that does not exist, the vote request is rejected.

When a user attempts to vote on a comment that does not exist, the vote request is rejected.

When a user attempts to remove their vote from a post they have not voted on, the vote removal request is rejected.

When a user attempts to remove their vote from a comment they have not voted on, the vote removal request is rejected.

### Reporting and Access Errors

When a user attempts to report a post or comment that does not exist, the report request is rejected.

When a user attempts to report content without providing a reason, the report request is rejected.

When a banned user attempts to create a post in a community where they are banned, the post creation request is rejected.

When a banned user attempts to create a comment in a community where they are banned, the comment creation request is rejected.

When a user attempts to access the home feed without being logged in, access is denied.

### Moderation Permission Errors

When a non-moderator attempts to delete a post in a community, the deletion request is rejected.

When a non-moderator attempts to delete a comment in a community, the deletion request is rejected.

When a non-moderator attempts to ban a user from a community, the ban request is rejected.

When a non-moderator attempts to unban a user from a community, the unban request is rejected.

When a non-moderator attempts to view the list of reports for a community, the request is rejected.

When a moderator attempts to remove the community owner, the removal request is rejected.

When a moderator attempts to remove another moderator, the removal request is rejected.

When a moderator attempts to approve or dismiss a report that does not exist, the request is rejected.

# File Validation Rules

Validation rules and policies for file uploads and storage.

## File Validation and Policies

Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.

### Image File Validation

Avatar images, community icons, and post images are uploaded files that must be validated before storage.

Uploaded images must be in a valid image format. The system accepts image files suitable for avatars, icons, and post content.

Image files are processed to generate thumbnails for display in post lists. The thumbnail is a reduced-size version of the original image.

When an image file fails validation, the upload is rejected and the user is notified of the failure.

### File Retention and Deletion

Uploaded files including avatar images, community icons, and post images are retained for the duration of the user's account or community existence.

Community icons are optional during community creation. When a community icon is uploaded, it is stored and validated according to the image file validation rules.

When a user deletes their account, all associated uploaded files are removed, including avatar images and any images in their posts and comments.

When a community is deleted, its icon image is removed.

When a post or comment is deleted, any associated image files are removed.

### Post Creation File Types

Posts can be created with three content types: text posts, link posts, and image posts.

Text posts contain written content that members can compose and submit to communities.

Link posts contain URLs that members share with the community.

Image posts contain uploaded image files that members share with the community.

All three post types are available to members when creating posts in communities.

### Comment Nesting

Comments on posts can be nested to form threaded discussions.

There is no depth limit on comment nesting. Members can reply to any comment, creating nested reply chains of unlimited depth.

This allows for detailed threaded conversations where members can respond to specific points in a discussion.