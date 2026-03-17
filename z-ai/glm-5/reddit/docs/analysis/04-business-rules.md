**communityPlatform — Business rules, validation constraints, data browsing expectations, error scenarios**

Business rules, validation constraints, data browsing expectations, error scenarios

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## User Rules

Users must sign up with a valid email address and a password, and they must choose a username that is unique across the platform. The email address must be unique, meaning no two users can register with the same email. The username is also unique and serves as the user's identifier for logging in and being referenced by others. Users log in using their email and password combination. Users can change their password at any time after logging in. Users can delete their account, and when they do, all posts and comments they have created are permanently removed from the system. Each user has a profile containing a display name, bio text, and avatar image, all of which can be edited by the user. Users can view any other user's profile, including their display name, bio, avatar, total karma score, list of all posts created, and list of all comments written.

### User Registration Validation

THE system SHALL require each user to provide an email address during registration.
THE system SHALL require each user to provide a password during registration.
THE system SHALL require each user to choose a username during registration.
THE system SHALL enforce that each email address is unique across all registered users.
WHEN a user attempts to register with an email address that already exists in the system, THE system SHALL reject the registration request.
THE system SHALL enforce that each username is unique across all registered users.
WHEN a user attempts to register with a username that already exists in the system, THE system SHALL reject the registration request.
THE system SHALL use the email address and password combination for user authentication.
THE system SHALL use the username as the user's identifier for login and being referenced by others.

### User Authentication Rules

THE system SHALL authenticate users using their email address and password.
WHEN a user provides correct email and password credentials, THE system SHALL grant the user access to their account.
WHEN a user provides incorrect email or password credentials, THE system SHALL reject the login attempt.
THE system SHALL NOT allow unauthenticated users to access features that require login.

### Password Management

THE system SHALL allow authenticated users to change their password.
WHEN a user changes their password, THE system SHALL update their credentials.
THE system SHALL require the user to be logged in before allowing a password change.

### Account Deletion Rules

THE system SHALL allow authenticated users to delete their own account.
WHEN a user deletes their account, THE system SHALL permanently remove all posts created by that user.
WHEN a user deletes their account, THE system SHALL permanently remove all comments created by that user.
WHEN a user deletes their account, THE system SHALL permanently remove the user's account information.

### Profile Editing Rules

THE system SHALL allow each user to edit their own display name.
THE system SHALL allow each user to edit their own bio text.
THE system SHALL allow each user to edit their own avatar image.
THE system SHALL NOT allow users to edit other users' profiles.
WHEN a user updates their profile, THE system SHALL save the changes immediately.

### Profile Viewing Rules

THE system SHALL allow any user to view any other user's profile.
THE system SHALL display the user's display name on their profile.
THE system SHALL display the user's bio text on their profile.
THE system SHALL display the user's avatar image on their profile.
THE system SHALL display the user's total karma score on their profile.
THE system SHALL display a list of all posts created by the user on their profile.
THE system SHALL display a list of all comments written by the user on their profile.

## Community Rules

Any user can create a community by providing a unique name, description text, and optionally an icon image. The community name must be unique across the entire platform, ensuring no two communities share the same name. The user who creates a community automatically becomes its owner, holding the highest authority within that community. Communities display their subscriber count to all users. Users can browse all communities in a list and search for communities by name. The description text provides information about the community's purpose and topics. The icon image helps visually identify the community in listings and feeds.

### Community Name Uniqueness

THE system SHALL require each community to have a name that is unique across the entire platform.

WHEN a user attempts to create a community with a name that already exists, THE system SHALL reject the creation request.

IF a community name is already taken, THE system SHALL inform the user that the name is unavailable.

THE system SHALL treat community names as exact matches when determining uniqueness.

### Community Creation

THE system SHALL permit any user with an account to create a new community.

WHEN a user creates a community, THE system SHALL require a unique community name.

THE system SHALL allow an optional description text that explains the community's purpose and topics.

THE system SHALL allow an optional icon image to visually identify the community in listings and feeds.

WHEN a community is successfully created, THE system SHALL automatically designate the creator as the community owner.

### Community Discovery

THE system SHALL provide all users, including guests, with the ability to browse a list of all communities.

THE system SHALL allow users to search for communities by community name.

THE system SHALL display the subscriber count for each community to all users.

WHEN browsing or searching communities, THE system SHALL display each community's name, description text, and icon image.

## Post Rules

Users can only create posts in communities they are subscribed to. Every post must have a title, which is required and cannot be empty. A post must be exactly one of three types: text post, link post, or image post. Text posts contain text content as the body. Link posts contain a URL as the content. Image posts contain an uploaded image file as the content. Users can edit their own posts after creation, allowing them to modify the title or content. Users can delete their own posts, which removes the post from the system. When viewing a single post, users see the title, full content, author, community name, vote score, comment count, and when it was posted. The vote score represents the total upvotes minus total downvotes.

### Post Creation Validation

THE system SHALL require a post to have a title that is not empty.

IF a user attempts to create a post without a title or with an empty title, THEN THE system SHALL reject the request.

THE system SHALL require a post to have exactly one content type: text, link, or image.

IF a user attempts to create a post with more than one content type, THEN THE system SHALL reject the request.

THE system SHALL require a text post to contain text content as the body.

THE system SHALL require a link post to contain a valid URL as the content.

THE system SHALL require an image post to contain an uploaded image file as the content.

IF a text post is submitted without text content, THEN THE system SHALL reject the request.

IF a link post is submitted without a URL, THEN THE system SHALL reject the request.

IF an image post is submitted without an image file, THEN THE system SHALL reject the request.

### Post Ownership Constraints

THE system SHALL allow only the author of a post to edit that post.

IF a user attempts to edit a post authored by another user, THEN THE system SHALL reject the request.

THE system SHALL allow only the author of a post to delete that post.

IF a user attempts to delete a post authored by another user, THEN THE system SHALL reject the request.

Note: Community moderators have separate authority to delete posts within their communities, which is defined in the Moderator Rules section.

### Post Display Attributes

WHEN a user views a single post, THE system SHALL display the following information:

- The post title
- The full content of the post
- The author's username
- The community name where the post was created
- The vote score (total upvotes minus total downvotes)
- The comment count
- The timestamp indicating when the post was created

WHEN a user views a post in a feed list, THE system SHALL display:

- The post title
- The author's username
- The community name
- The vote score
- The comment count
- The time elapsed since the post was created (e.g., "3 hours ago")
- For text posts: the first 200 characters of the content
- For image posts: a thumbnail of the image
- For link posts: the domain name extracted from the URL

## Comment Rules

Users can write comments on any post without needing to subscribe to the community. Users can reply to any comment, creating nested conversations. Replies can have further replies with no depth limit, allowing for deeply threaded discussions. Each comment must contain content text. Users can edit their own comments after writing them. Users can delete their own comments, which removes them from the discussion. Each comment displays the author, content text, vote score, time since it was posted, and any nested replies underneath it. Comments on a post can be sorted by best (highest vote score), new (most recent first), or controversial (many votes but score close to zero).

### Comment Content Validation

THE system SHALL require comment content text to be provided when creating a comment.

WHEN a user submits a comment without content text, THE system SHALL reject the request.

THE system SHALL preserve the original formatting of comment content text.

WHEN a user edits a comment, THE system SHALL require the updated content text to be provided.

WHEN a user edits a comment to have empty content text, THE system SHALL reject the request.

### Comment Creation Rules

THE system SHALL allow users to write comments on any post without requiring community subscription.

THE system SHALL allow users to reply to any comment regardless of the comment's depth level.

WHEN a user creates a comment, THE system SHALL associate the comment with the user as the author.

WHEN a user creates a comment, THE system SHALL record the current timestamp as the creation time.

WHEN a user creates a reply to a comment, THE system SHALL link the reply to the parent comment.

WHEN a user creates a comment, THE system SHALL initialize the vote score to zero.

THE system SHALL allow comments on posts in any community, regardless of the user's subscription status to that community.

### Nested Reply Rules

THE system SHALL support nested replies where each comment can have replies.

THE system SHALL impose no maximum depth limit on nested comment replies.

WHEN a user views a comment with nested replies, THE system SHALL display all nested replies in a threaded structure.

THE system SHALL maintain the parent-child relationship between comments and their replies.

WHEN a comment has multiple replies, THE system SHALL display the replies in the order determined by the selected sorting option.

THE system SHALL allow users to reply to comments at any depth level within a conversation thread.

### Comment Ownership Rules

THE system SHALL allow users to edit only their own comments.

WHEN a user attempts to edit a comment they did not author, THE system SHALL reject the request.

THE system SHALL allow users to delete only their own comments.

WHEN a user attempts to delete a comment they did not author, THE system SHALL reject the request.

WHEN a user deletes their comment, THE system SHALL remove the comment content from display.

WHEN a user deletes a comment that has replies, THE system SHALL preserve the nested reply structure while removing the deleted comment's content.

Moderators (defined in 01-actors-and-auth.md) can delete any comment in their community, as specified in Moderator Rules.

### Comment Display Attributes

WHEN displaying a comment, THE system SHALL show the author's username.

WHEN displaying a comment, THE system SHALL show the comment's vote score (total upvotes minus total downvotes).

WHEN displaying a comment, THE system SHALL show the time elapsed since the comment was posted (e.g., "3 hours ago").

WHEN displaying a comment, THE system SHALL show the comment content text.

WHEN displaying a comment that has replies, THE system SHALL show the nested replies beneath the comment.

WHEN a comment has been deleted by its author, THE system SHALL indicate the comment was deleted while preserving the thread structure for any replies.

### Comment Sorting Rules

THE system SHALL support three sorting options for comments on a post: Best, New, and Controversial.

WHEN "Best" sorting is selected, THE system SHALL display comments ordered by highest vote score first.

WHEN "New" sorting is selected, THE system SHALL display comments ordered by most recent creation time first.

WHEN "Controversial" sorting is selected, THE system SHALL display comments with many total votes but a vote score close to zero appearing first.

THE system SHALL apply the selected sorting option to all comments and their nested replies.

WHEN no sorting option is explicitly selected, THE system SHALL default to "Best" sorting.

The vote score calculation for sorting purposes equals total upvotes minus total downvotes (as defined in Vote Rules).

## Vote Rules

Users can upvote or downvote any post or comment on the platform. Each user can cast only one vote per post or comment, meaning a user cannot upvote the same item multiple times. Users can change their vote from upvote to downvote or vice versa at any time. Users can also remove their vote entirely, leaving them with no vote on that item. The vote score for any post or comment equals the total number of upvotes minus the total number of downvotes. Karma is a user-specific score that reflects the total votes their content has received. When someone upvotes a user's post or comment, that user's karma increases by one. When someone downvotes a user's post or comment, that user's karma decreases by one. When someone removes their vote, the affected user's karma adjusts accordingly. Karma can be negative if a user receives more downvotes than upvotes on their content.

### Vote Uniqueness

THE SYSTEM SHALL allow each user to cast at most one vote per post.

THE SYSTEM SHALL allow each user to cast at most one vote per comment.

IF a user has already voted on a post or comment, THE SYSTEM SHALL prevent the user from casting an additional vote on that same item.

THE SYSTEM SHALL track each user's vote status for every post and comment to enforce the one-vote-per-item constraint.

### Vote Score Calculation

WHEN a user upvotes a post or comment, THE SYSTEM SHALL increase the vote score by one.

WHEN a user downvotes a post or comment, THE SYSTEM SHALL decrease the vote score by one.

THE SYSTEM SHALL calculate the vote score as the total number of upvotes minus the total number of downvotes.

IF a post or comment has no votes, THE SYSTEM SHALL display a vote score of zero.

### Vote Modification

THE SYSTEM SHALL allow users to change their existing vote from upvote to downvote.

THE SYSTEM SHALL allow users to change their existing vote from downvote to upvote.

THE SYSTEM SHALL allow users to remove their vote entirely, leaving no vote on that item.

WHEN a user changes their vote, THE SYSTEM SHALL update the vote score to reflect the new vote type.

WHEN a user removes their vote, THE SYSTEM SHALL update the vote score as if the vote had never been cast.

### Karma Impact

WHEN a user's post or comment receives an upvote, THE SYSTEM SHALL increase the author's karma by one.

WHEN a user's post or comment receives a downvote, THE SYSTEM SHALL decrease the author's karma by one.

WHEN a vote is removed from a post or comment, THE SYSTEM SHALL adjust the author's karma by reversing the original vote's impact.

THE SYSTEM SHALL allow a user's karma to be negative when the total downvotes on their content exceed the total upvotes.

THE SYSTEM SHALL calculate a user's karma as the sum of all votes received on all of their posts and comments.

THE SYSTEM SHALL maintain a single karma score per user that reflects the aggregate voting activity on all their content.

### Vote Target Scope

THE SYSTEM SHALL allow users to vote on posts.

THE SYSTEM SHALL allow users to vote on comments.

THE SYSTEM SHALL apply the same voting rules to both posts and comments, including one vote per user, vote modification, and score calculation.

THE SYSTEM SHALL track votes for posts and comments independently, allowing a user to vote on a post and also vote on comments within that same post.

## Subscription Rules

Users can subscribe to any community on the platform. Users can unsubscribe from any community they are currently subscribed to. Subscribing to a community is required before a user can create posts in that community. Users can view a list of all communities they are subscribed to. The home feed shows posts only from communities the user is subscribed to, and this feed is only available to logged-in users. Subscribing is not required to view content in a community or to comment on posts. Each subscription records when the user subscribed to that community.

### Subscription Creation

Any logged-in user can subscribe to any community on the platform.

WHEN a user subscribes to a community, THE system SHALL record the timestamp of when the subscription occurred.

IF a user attempts to subscribe to a community they are already subscribed to, THE system SHALL reject the request.

WHEN a user successfully subscribes to a community, THE system SHALL increment the subscriber count of that community by one.

### Subscription Removal

Users can unsubscribe from any community they are currently subscribed to.

IF a user attempts to unsubscribe from a community they are not subscribed to, THE system SHALL reject the request.

WHEN a user successfully unsubscribes from a community, THE system SHALL decrement the subscriber count of that community by one.

### Subscription Requirement for Posting

Subscription to a community is required before a user can create posts in that community.

WHEN a user attempts to create a post in a community, THE system SHALL verify that the user is subscribed to that community.

IF the user is not subscribed to the community, THE system SHALL reject the post creation request.

### Viewing Subscribed Communities

Users can view a list of all communities they are subscribed to.

THE system SHALL display each subscribed community's name and the date when the user subscribed.

The list of subscribed communities is only available to logged-in users.

### Home Feed Availability

The home feed shows posts only from communities the user is subscribed to.

The home feed is available only to logged-in users.

IF a guest user attempts to access the home feed, THE system SHALL deny access.

### Subscription Not Required for Viewing and Commenting

Subscription to a community is not required to view content within that community.

Subscription to a community is not required to comment on posts within that community.

Guests and users who are not subscribed to a community can still view all posts and comments in that community.

## Moderator Rules

The user who creates a community becomes its owner and holds the highest authority. The owner can add moderators to help manage the community. The owner can remove moderators from the community. Moderators can add other moderators to the community. Moderators cannot remove the owner from their position. Moderators cannot remove other moderators; only the owner can remove moderators. Moderators can delete any post within their community. Moderators can delete any comment within their community. Moderators can ban users from the community. Moderators can unban users who were previously banned. Moderators can view the list of all banned users in their community. The owner role is permanent unless the owner deletes their account or transfers ownership.

### Owner Assignment and Authority

The user who creates a community automatically becomes the community owner. The owner role is permanent and cannot be transferred to another user through normal moderation actions. The owner holds the highest authority within the community and has capabilities that moderators do not possess.

The owner can only lose their role if they delete their account, in which case the community ownership rules follow standard deletion cascades.

The owner authority supersedes all moderator actions and decisions within the community.

### Moderator Addition Rules

The community owner can add any user as a moderator to the community. Existing moderators can also add other users as moderators to the community.

When a user is added as a moderator, they gain moderation privileges within that community immediately. There is no limit on the number of moderators a community can have.

A user cannot be added as a moderator if they are already banned from the community. The ban must be removed before moderator privileges can be granted.

### Moderator Removal Rules

Only the community owner can remove moderators from their position. Moderators cannot remove other moderators from the community.

Moderators cannot remove the owner from their position under any circumstances. The owner role can only be lost through account deletion.

If a moderator attempts to remove another moderator, the action is rejected. If a moderator attempts to remove the owner, the action is rejected.

These removal restrictions ensure clear authority hierarchy and prevent moderation disputes from escalating.

### Content Moderation Authority

Moderators can delete any post within their community regardless of who authored the post. When a moderator deletes a post, all comments on that post are also deleted.

Moderators can delete any comment within their community regardless of who authored the comment. Deleting a comment does not delete its replies; nested replies remain visible.

Moderators can delete content created by other moderators. Moderators can delete content created by the owner.

These content moderation powers apply only within the community where the user holds moderator status. A moderator in one community has no moderation authority in other communities.

### Ban Management Authority

Moderators can ban any user from their community. When banning a user, a reason must be provided (as defined in Ban Rules). Banned users cannot create posts or comments in that community but can still view content.

Moderators can unban users who were previously banned from the community. Unbanning immediately restores the user's ability to create posts and comments in the community.

Moderators can view the complete list of all banned users in their community. This list shows each banned user and the reason for their ban.

Moderators can ban other moderators from the community. Moderators can ban the community owner (though this would not remove owner authority or moderator privileges).

## Ban Rules

Moderators can ban users from their community. When banning a user, the moderator must provide a reason for the ban. Banned users cannot create posts in that community. Banned users cannot create comments in that community. Banned users can still view content within the community, including posts and comments. Moderators can unban users who were previously banned. Each ban records when the user was banned and the reason provided. Moderators can view the list of all banned users for their community. A user can be banned from multiple communities independently, meaning a ban in one community does not affect their access to other communities.

### Ban Creation Rules

WHEN a moderator bans a user from their community, THE system SHALL record the ban with the timestamp of when the ban occurred.

WHEN a moderator bans a user from their community, THE system SHALL require the moderator to provide a reason for the ban.

IF a moderator attempts to ban a user without providing a reason, THEN THE system SHALL reject the ban request.

WHEN a user is banned from a community, THE system SHALL store the reason provided by the moderator.

THE system SHALL allow moderators to ban users from their community.

### Ban Scope and Independence

THE system SHALL treat bans as community-specific, meaning a ban in one community does not affect the user's access to other communities.

WHEN a user is banned from one community, THE system SHALL NOT restrict that user's access to any other communities.

THE system SHALL allow a single user to be banned from multiple communities independently.

THE system SHALL maintain separate ban records for each community, such that banning, unbanning, or viewing bans in one community has no effect on bans in other communities.

### Banned User Restrictions

WHILE a user is banned from a community, THE system SHALL prevent that user from creating posts in that community.

WHILE a user is banned from a community, THE system SHALL prevent that user from creating comments in that community.

WHILE a user is banned from a community, THE system SHALL still allow that user to view posts and comments within that community.

IF a banned user attempts to create a post or comment in the community they are banned from, THEN THE system SHALL reject the request.

THE system SHALL NOT prevent banned users from viewing any content within the community, including posts, comments, and community information.

### Ban Management

THE system SHALL allow moderators to unban users who were previously banned from their community.

WHEN a moderator unbans a user, THE system SHALL remove the ban record and restore the user's ability to create posts and comments in that community.

THE system SHALL allow moderators to view a list of all banned users for their community.

THE list of banned users SHALL display each banned user along with the reason for their ban and when they were banned.

IF a user has never been banned from a community, THEN THE system SHALL NOT display that user in the banned users list for that community.

## Report Rules

Users can report any post or comment on the platform. When reporting content, the user must provide a reason explaining why the content is being reported. Each report captures the content being reported, the user who submitted the report, and the reason provided. Moderators can view all reports submitted for their community. Each report has a status that indicates whether it is pending, approved, or dismissed. Moderators can approve a report, which results in the reported content being deleted from the system. Moderators can dismiss a report, which keeps the content and removes the report from the pending list. Reports start in pending status when first submitted. Only moderators of the community where the content was posted can handle reports for that content.

### Report Creation Rules

THE system SHALL allow users to report any post or comment on the platform. WHEN a user submits a report, THE system SHALL require the user to provide a reason explaining why the content is being reported. IF a report is submitted without a reason, THEN THE system SHALL reject the report request. THE system SHALL allow users to report content in any community, regardless of their subscription status to that community.

### Report Data Capture

WHEN a report is created, THE system SHALL capture the following information: the content being reported (post or comment), the user who submitted the report, and the reason provided by the reporter. THE system SHALL record the timestamp when the report was submitted. THE system SHALL associate each report with the community where the reported content was posted.

### Report Status Lifecycle

WHEN a report is first submitted, THE system SHALL assign it a status of pending. THE system SHALL maintain the pending status until a moderator takes action on the report. THE system SHALL allow reports to transition from pending to approved status when a moderator approves the report. THE system SHALL allow reports to transition from pending to dismissed status when a moderator dismisses the report.

### Report Approval and Dismissal

WHEN a moderator approves a report, THE system SHALL delete the reported content from the platform. WHEN a moderator dismisses a report, THE system SHALL keep the reported content on the platform and SHALL remove the report from the pending reports list. THE system SHALL not allow moderators to approve or dismiss reports that have already been resolved. WHEN content is deleted due to an approved report, THE system SHALL preserve the report record for audit purposes.

### Moderator Report Access

THE system SHALL only allow moderators of a community to view reports for that community. THE system SHALL not allow users to view reports for communities where they are not moderators. THE system SHALL not allow users to view their own reports after submission. THE system SHALL only allow community moderators to approve or dismiss reports for their community. WHEN a moderator views the report list, THE system SHALL show only reports with pending status, excluding dismissed reports.

# Data Browsing Expectations

Business expectations for how users browse, find, and navigate through lists of data.

## List Browsing Expectations

Define business expectations for how users find, filter, and browse lists.

### Filtering

### Community Search Filtering

WHEN a user searches for communities by name, THE SYSTEM SHALL display all communities whose names contain the search term.

THE SYSTEM SHALL allow users to search for communities by name from the community list.

### Time-Based Filtering for Posts

WHEN a user selects the Top sorting option for posts, THE SYSTEM SHALL provide time filter options including today, this week, this month, this year, and all time.

WHEN a time filter is selected, THE SYSTEM SHALL only include posts created within that time period in the results.

THE SYSTEM SHALL default to all time if no time filter is explicitly selected.

### Sorting

### Post Feed Sorting Options

THE SYSTEM SHALL support four sorting options for all post feeds: Hot, New, Top, and Controversial.

WHEN sorting by Hot, THE SYSTEM SHALL display posts with recent creation times and many upvotes earlier in the list.

WHEN sorting by New, THE SYSTEM SHALL display posts in descending order by creation time (most recently created posts appear first).

WHEN sorting by Top, THE SYSTEM SHALL display posts in descending order by vote score (highest vote score first).

WHEN sorting by Controversial, THE SYSTEM SHALL display posts with many votes but a score close to zero earlier in the list.

### Comment Sorting Options

THE SYSTEM SHALL support three sorting options for comments on a post: Best, New, and Controversial.

WHEN sorting comments by Best, THE SYSTEM SHALL display comments in descending order by vote score (highest vote score first).

WHEN sorting comments by New, THE SYSTEM SHALL display comments in descending order by creation time (most recent first).

WHEN sorting comments by Controversial, THE SYSTEM SHALL display comments with many votes but a score close to zero earlier in the list.

### Pagination

THE SYSTEM SHALL paginate all post feeds including the Home Feed, Popular Feed, and Community Feed.

THE SYSTEM SHALL display a limited number of posts per page in each feed.

THE SYSTEM SHALL allow users to navigate to the next page of results when additional posts exist.

THE SYSTEM SHALL allow users to navigate to the previous page of results when not on the first page.

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### Authentication Errors

When a user attempts to sign up with an email address already registered in the system, the request is rejected and the user is informed that the email is already in use.

When a user attempts to sign up with a username that already exists, the request is rejected and the user is informed that the username is taken.

When a user attempts to log in with an email address that does not exist in the system, the request is rejected and the user is informed that the credentials are invalid.

When a user attempts to log in with a correct email but incorrect password, the request is rejected and the user is informed that the credentials are invalid.

When a user attempts to change their password but provides an incorrect current password, the request is rejected.

When a guest attempts to access features that require login (such as viewing the home feed, creating posts, voting, or subscribing to communities), the request is rejected and the user is informed that login is required.

### Authorization and Permission Errors

When a user attempts to create a post in a community they are not subscribed to, the request is rejected and the user is informed that subscription to the community is required.

When a banned user attempts to create a post in a community they are banned from, the request is rejected and the user is informed that they are banned from that community.

When a banned user attempts to create a comment in a community they are banned from, the request is rejected and the user is informed that they are banned from that community.

When a user attempts to edit a post they did not create, the request is rejected and the user is informed that they can only edit their own posts.

When a user attempts to delete a post they did not create and are not a moderator of, the request is rejected.

When a user attempts to edit a comment they did not write, the request is rejected and the user is informed that they can only edit their own comments.

When a user attempts to delete a comment they did not write and are not a moderator of, the request is rejected.

When a moderator attempts to remove the community owner, the request is rejected and the moderator is informed that only the owner can be removed by themselves or the action is not permitted.

When a moderator attempts to remove another moderator, the request is rejected and the moderator is informed that only the community owner can remove moderators.

When a user who is not a moderator attempts to perform moderation actions (such as deleting posts, deleting comments, banning users, or viewing reports), the request is rejected and the user is informed that moderator privileges are required.

### Content Validation Errors

When a user attempts to create a post without providing a title, the request is rejected and the user is informed that a title is required.

When a user attempts to create a text post without providing any text content, the request is rejected.

When a user attempts to create a link post without providing a URL, the request is rejected.

When a user attempts to create an image post without uploading an image, the request is rejected.

When a user attempts to create a comment without providing any content, the request is rejected and the user is informed that comment content is required.

When a user attempts to create a community without providing a name, the request is rejected.

When a user attempts to create a community with a name that already exists, the request is rejected and the user is informed that the community name is already taken.

When a user attempts to report a post or comment without providing a reason, the request is rejected and the user is informed that a reason is required.

When a user attempts to ban another user from a community without providing a reason, the request is rejected and the moderator is informed that a ban reason is required.

### Resource Not Found Errors

When a user attempts to view, edit, or delete a post that does not exist, the request is rejected and the user is informed that the post was not found.

When a user attempts to view, edit, or delete a comment that does not exist, the request is rejected and the user is informed that the comment was not found.

When a user attempts to view, subscribe to, or create a post in a community that does not exist, the request is rejected and the user is informed that the community was not found.

When a user attempts to view a profile of a user that does not exist, the request is rejected and the user is informed that the user was not found.

When a user attempts to reply to a comment that has been deleted, the request is rejected.

When a moderator attempts to view reports for a community that does not exist, the request is rejected.

When a moderator attempts to dismiss or approve a report that does not exist, the request is rejected.

### Subscription and Voting Errors

When a user attempts to subscribe to a community they are already subscribed to, the request is rejected or the action is treated as a no-op.

When a user attempts to unsubscribe from a community they are not subscribed to, the request is rejected or the action is treated as a no-op.

When a user attempts to vote on a post or comment they have already voted on without changing or removing the vote, the request is rejected or treated as a no-op.

When a user attempts to remove a vote that they never cast, the request is rejected or treated as a no-op.

### Account Deletion Errors

When a user attempts to delete an account that does not exist, the request is rejected.

When a user attempts to delete their account but authentication fails (incorrect password or session expired), the request is rejected and the user is informed that authentication is required.

When account deletion is requested, all posts and comments created by the user are permanently deleted along with the account, and this action cannot be undone.

# File Validation Rules

Validation rules and policies for file uploads and storage.

## File Validation and Policies

Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.

### File Retention Policy

The user requirements do not specify file retention duration or automatic deletion policies for uploaded files.

Files are deleted when:

- A user deletes their account: all their posts and comments are deleted (this includes image posts created by that user)
- A user deletes their own post: the post content is removed
- A moderator deletes a post or comment: the content is removed
- A moderator approves a report: the reported content is deleted

The requirements do not specify how long deleted files are retained in backup storage or whether files are permanently purged after deletion.