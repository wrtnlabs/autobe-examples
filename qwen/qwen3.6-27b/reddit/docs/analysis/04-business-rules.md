**redditLikeCommunity — Business rules, validation constraints, data browsing expectations, error scenarios**

Business rules, validation constraints, data browsing expectations, error scenarios

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## User Rules

A user is identified by a required email address and a unique username. A password is required for sign-up and login, supporting later changes and deletion. Each user has one karma score that accumulates and is decremented by votes cast on their posts and comments. Negative karma is fully permitted and tracks actual voting performance. Only the user themselves can modify their own profile display name, bio text, and avatar image.

### Required Email and Username (required-email-username)

THE system SHALL require a unique email address and a unique username for every user at account creation. WHEN a user signs up, THE system SHALL collect their email address, password, and a chosen username. IF a user signs up without providing an email address, THEN THE system SHALL reject the registration. IF a user signs up without choosing a username, THEN THE system SHALL reject the registration. IF the provided email address is already in use by another account, THEN THE system SHALL reject the registration. Users log in using their email and password; IF the email or password is incorrect, THEN THE system SHALL deny access.

### Unique Username Constraint (unique-username-constraint)

THE system SHALL enforce uniqueness of usernames across the entire platform. IF a user attempts to sign up with a username that is already taken, THEN THE system SHALL reject the registration. IF a user attempts to change their username to one that is already in use, THEN THE system SHALL reject the change.

### Karma Score Calculation (karma-score-calculation)

A user has exactly one karma score, which is a single numeric value. WHEN a user upvotes a post or comment, THE system SHALL increase the score by 1. WHEN a user downvotes a post or comment, THE system SHALL decrease the score by 1. WHEN a user removes their vote, THE system SHALL adjust the score accordingly. WHEN a user changes their vote from upvote to downvote, THE system SHALL apply a net decrease of 2. WHEN a user changes their vote from downvote to upvote, THE system SHALL apply a net increase of 2. The karma score is the algebraic sum of all positive and negative impacts from votes cast on the user's content.

### Negative Karma Permitted (negative-karma-allowed)

THE system SHALL allow karma scores to take negative values. THERE SHALL be no minimum floor for karma scores. IF a user's posts and comments receive more downvotes than upvotes, THEN THE system SHALL display the resulting negative karma value. Negative karma does NOT prevent the user from continuing to participate in the platform.

### Only Owner Modifies Profile (only-user-modifies-profile)

Only the account owner may modify their own profile information. IF a user attempts to edit another user's profile, THEN THE system SHALL reject the modification. The editable fields on a user profile include the display name, bio text, and avatar image. IF the user updates valid profile data, THEN THE system SHALL save the changes and reflect them on the profile page.

### Display Name, Bio, and Avatar Editable (display-name-bio-avatar-editable)

THE system SHALL allow a user to edit their display name, bio text, and avatar image. The display name is a customizable public name shown on the user's profile. The bio text is a free-form description the user provides about themselves. The avatar image is a user-supplied image that represents them visually. When any of these fields is updated, THE system SHALL persist the new values and display them on the user's profile page.

### Karma Affected by Votes (karma-affected-by-votes)

A user's karma score is directly affected by votes others cast on their posts and comments. WHEN someone upvotes a post or comment authored by a user, THE system SHALL increase that user's karma by 1. WHEN someone downvotes a post or comment authored by a user, THE system SHALL decrease that user's karma by 1. WHEN someone removes their vote on a user's content, THE system SHALL adjust that user's karma accordingly. Karma changes take effect immediately upon vote submission, change, or removal. IF vote processing fails, THEN THE system SHALL not alter the karma score.

## Profile Rules

A user profile contains a display name, bio text, and an avatar image. The display name is customizable and shown publicly on every post and comment. The bio is optional text describing the user. The avatar is a single image asset uploaded by the user. These fields are editable only by the profile owner. A profile is always associated with a single user account and reflects the user's total karma score.

### Profile Field Constraints

WHEN a user creates or edits their profile, THE display name field SHALL contain a non-empty value.

WHEN a user creates or edits their profile, THE bio text field SHALL be allowed to remain empty or contain descriptive text.

WHEN a user uploads an avatar, THE system SHALL accept only a single image. If a new image is uploaded, it replaces the previously set avatar.

### Profile Visibility

THE profile of every user SHALL be publicly visible to all users and guests on the platform. The visible content includes the display name, bio text, and avatar image.

### Profile Account Binding

WHEN a user account is created, THE system SHALL associate exactly one profile with that account. A user account cannot have multiple profiles.

WHEN any user views the profile page of another user, THE system SHALL display that user's total karma score on the profile.

## Community Rules

A community requires a unique name and may include optional description text and an icon image. Only the creator becomes the owner, holding the highest authority within that community. The owner may appoint other users as moderators. A unique name is strictly required to distinguish one community from all others. Subscriber counts are tracked per community and visible publicly.

### Community Identity and Creation

A community must have a unique name that serves as its primary distinction from all other communities on the platform.
WHEN a user creates a community, THE community name SHALL be unique across the entire platform.
IF a user attempts to create a community with a name that is already in use, THE creation request SHALL be rejected.
A user MAY provide an optional description text when creating a community.
A user MAY upload an optional icon image when creating a community.

### Community Ownership

WHEN a user successfully creates a community, THAT user SHALL automatically become the owner of the community.
THE community owner SHALL hold the highest authority within the community, overriding all other roles.
ONLY the community owner SHALL have the authority to appoint other users as moderators.
WHEN the owner appoints a user as a moderator, THE system SHALL grant that user moderator privileges within that community.

### Subscriber Count Tracking

THE community system SHALL track the total number of users currently subscribed to each community.
WHEN a new user subscribes to a community, THE subscriber count SHALL increase by one.
WHEN a user unsubscribes from a community, THE subscriber count SHALL decrease by one.
IF a user who is already subscribed to a community attempts to subscribe again, THE subscriber count SHALL remain unchanged.

## Subscription Rules

Users can subscribe to any community at any time and unsubscribe at will. Subscribing is a strict prerequisite to creating posts within that specific community. A single subscription links one user to one community. Subscribed communities are always visible in the user's list of subscribed communities. There is no limit on the number of communities a user can subscribe to.

### Subscribing to Communities

- THE system SHALL allow any logged-in user to subscribe to any existing community at any time.
- WHEN a user submits a subscription request, THE system SHALL create a new subscription record linking the user to the target community.
- THE system SHALL impose no limit on the total number of communities a user may subscribe to.
- IF a user attempts to subscribe to a community they are already subscribed to, THEN THE system SHALL reject the subscription request.

### Unsubscribing from Communities

- THE system SHALL allow any user to unsubscribe from any community they are currently subscribed to at will.
- WHEN a user removes their subscription from a community, THE system SHALL immediately delete the subscription link between that user and the community.
- IF a user attempts to unsubscribe from a community they are not subscribed to, THEN THE system SHALL reject the unsubscription request.
- THE system SHALL accurately adjust the community's subscriber count whenever a user subscribes or unsubscribes.

### Subscription Prerequisite for Posting

- WHEN a user attempts to create a new post within a community, THE system SHALL verify that an active subscription exists between that user and the community.
- IF no valid subscription is found, THEN THE system SHALL reject the post creation request.
- THE system SHALL restrict post creation exclusively to users who are subscribed to the target community.
- THE system SHALL permit users to browse posts in a community regardless of subscription status.

### Subscribed Community List Visibility

- THE system SHALL maintain a dedicated list displaying all communities to which a user is currently subscribed.
- WHEN a user successfully subscribes to a community, THE system SHALL immediately add that community to the user's subscribed community list.
- WHEN a user successfully unsubscribes from a community, THE system SHALL immediately remove that community from the user's subscribed community list.
- THE system SHALL reflect the real-time subscription state in the user's subscribed community list.

### User-Community Pairing Constraints

- THE system SHALL bind a single subscription strictly to exactly one user and exactly one community.
- WHEN a subscription is established, THE system SHALL record the specific user-community pairing to prevent ambiguity.
- IF a system operation attempts to associate a subscription with a different user or community, THEN THE system SHALL reject the invalid pairing modification.
- THE system SHALL preserve the original user-community pairing link for the duration of the active subscription.

## Post Rules

Every post requires a title and must be categorized as one of three fixed types: text, link, or image. Text posts require body text content. Link posts require a URL destination. Image posts require an uploaded image only. Only users subscribed to a community are permitted to create posts within it. Users can edit or delete only their own posts, never another user's post.

### Title Requirement

Every post must have a title. When creating a post without providing a title, the request is rejected. When the title is an empty string or contains only whitespace, the request is rejected.

### Post Type Constraints

Every post must be classified into exactly one of three types: text, link, or image. When creating a post without specifying a type, the request is rejected. When a type outside the allowed three types is assigned, the request is rejected.

### Content Requirements by Post Type

Each post type carries distinct content requirements that must be fulfilled at creation.

Text posts require body text content. When a text post is created without body text, the request is rejected.

Link posts require a destination URL. When a link post is created without a URL, the request is rejected.

Image posts require an uploaded image. When an image post is created without an uploaded image, the request is rejected.

### Subscription Prerequisite

An active subscription to the community is required before creating a post in that community. When a user without a subscription attempts to create a post, the request is rejected. Guest users without an account cannot create posts.

### Authorship and Modification Control

The user who creates a post is its permanent author. Authorship is established at creation and cannot be transferred to another user.

Only the author of a post may edit it. When a non-author attempts to edit a post, the request is rejected.

Only the author of a post may delete it. When a non-author attempts to delete a post, the request is rejected.

## Comment Rules

Comments are tied to a specific post and may have unlimited nested replies without depth restrictions. A comment body text is required to submit. Comments are editable and deletable exclusively by their author. Each comment contributes directly to the parent post's total comment count displayed in the feed.

### Comment Association Rules

A comment SHALL always be tied to a specific parent post.
IF a comment creation request does not specify a parent post, THEN the request SHALL be rejected as invalid.
IF the specified parent post does not exist, THEN the comment creation SHALL be rejected.

### Comment Content Validation

WHEN a user creates a comment, THE comment body text SHALL be provided.
IF the comment body text is empty or missing, THEN the system SHALL reject the comment submission.

### Comment Nesting Structure Rules

A comment MAY be structured as a reply to another existing comment.
THE system SHALL support unlimited nesting depth for comment replies.
THERE SHALL be no maximum limit on the depth of reply chains within any post's comment thread.

### Comment Ownership and Modification Rules

ONLY the author of a comment SHALL have permission to edit that comment's text content.
IF a user attempts to edit a comment authored by another user, THEN the system SHALL reject the edit request.
ONLY the author of a comment SHALL have permission to delete that comment.
IF a user attempts to delete a comment authored by another user, THEN the system SHALL reject the delete request.

### Comment Count Rules

WHEN a comment is successfully created and persisted, THE system SHALL increment the parent post's comment count by one.
WHEN a comment is successfully deleted, THE system SHALL decrement the parent post's comment count by one.

## Vote Rules

Each user can cast exactly one vote per post or comment. Votes can be either an upvote or a downvote, affecting the recipient author's karma by exactly one point. Votes can be changed or removed entirely at any time. Vote scores are calculated as total upvotes minus total downvotes. Karma accumulates permanently across the platform and may decrease below zero if downvoted heavily.

### Voting Constraints

WHEN a user votes on a post or comment, THE system SHALL record the vote direction as either an upvote or a downvote.

A user can cast exactly one vote per post or comment at any given time.

WHEN a user attempts to vote again on the same post or comment, THE system SHALL replace the existing vote with the new direction.

WHEN a user removes their vote on a post or comment, THE system SHALL delete the vote record from that item.

### Karma Impact Rules

WHEN a user upvotes a post or comment, THE system SHALL increase the author's karma score by 1 point.

WHEN a user downvotes a post or comment, THE system SHALL decrease the author's karma score by 1 point.

WHEN a vote is changed or removed, THE system SHALL adjust the author's karma score accordingly.

Karma adjustments are applied automatically when votes are cast, changed, or removed.

Karma points accumulate permanently on the author's account and remain visible across the platform.

Karma scores may decrease below zero if a user's content receives more downvotes than upvotes.

THE system SHALL allow and display negative karma scores.

### Score Computation

THE vote score for any post or comment SHALL equal the total number of upvotes minus the total number of downvotes.

Vote scores update automatically whenever votes are cast, changed, or removed.

Karma is accrued solely by the author of the voted content; the user casting the vote does not gain or lose karma.

## Moderator Rules

The community owner holds the highest authority and alone can appoint or remove moderators. Moderators cannot remove the owner or remove each other under any circumstances. Moderators are permitted to delete any post or comment within their assigned community. Moderators are permitted to ban or unban users within their community.

### Authority Hierarchy

- THE system SHALL designate the community creator as the owner with highest authority

- WHEN a user adds a moderator in a community, THE system SHALL verify that the user is the owner of that community

- WHEN a user removes a moderator in a community, THE system SHALL verify that the user is the owner of that community

- IF a moderator attempts to remove the owner, THEN THE system SHALL reject the request

- IF a moderator attempts to remove another moderator, THEN THE system SHALL reject the request

- IF a non-modifier attempts to view the banned users list for a community, THEN THE system SHALL reject the request

### Content and Action Scope

- WHEN a moderator attempts to delete a post, THE system SHALL verify the post belongs to a community where the user is a moderator

- WHEN a moderator attempts to delete a comment, THE system SHALL verify the comment belongs to a community where the user is a moderator

- IF a moderator attempts to delete a post outside their assigned community, THEN THE system SHALL reject the request

- IF a moderator attempts to delete a comment outside their assigned community, THEN THE system SHALL reject the request

- IF a user who is not a moderator attempts to delete another user's post or comment, THEN THE system SHALL reject the request

- IF a moderator attempts to ban a user in a community where they are not a moderator, THEN THE system SHALL reject the request

- Banned users SHALL be able to view content in the community but SHALL NOT be able to create posts or comments in that community (defined in Ban Rules)

## Ban Rules

Bans apply strictly at the individual community level. Moderators must issue bans with a recorded reason text. Banned users immediately lose the ability to post or comment in that specific community. Banned users retain full viewing rights to all content. Only moderators can lift a ban by unbanning the user. The list of banned users is visible exclusively to community moderators.

### Community-Level Scope

Bans apply at the individual community level. A ban issued in one community does not affect a user's ability to post or comment in other communities where they are not banned. When a user is banned from a community, the restriction applies only to that specific community. If a user is banned from multiple communities, each ban operates independently. Banned users retain full posting and commenting rights in any community where no ban exists.

### Ban Reason Requirement

WHEN a moderator issues a ban, THE system SHALL require the moderator to provide a reason text. IF the reason text is missing, THEN THE system SHALL reject the ban request. Each ban record must include the reason text provided by the moderator at the time of the ban. The reason text is visible to moderators when viewing the ban list.

### Posting and Commenting Restrictions

WHILE a user is banned from a community, THE system SHALL prevent the user from creating posts in that community. WHEN a banned user attempts to create a post in the banned community, THE system SHALL reject the request. WHILE a user is banned from a community, THE system SHALL prevent the user from writing comments on posts in that community. WHEN a banned user attempts to reply to a comment in the banned community, THE system SHALL reject the request.

### Viewing Permissions for Banned Users

Banned users retain full viewing rights to all content within the banned community. Banned users can view all posts in the community. Banned users can view all comments on posts in the community. Banned users can view the community feed listing. Banned users can view the community profile and details. View access is not restricted by ban status.

### Moderator Authority Over Bans

ONLY community moderators SHALL have the ability to ban users from their community. WHEN a non-moderator attempts to ban a user, THE system SHALL reject the request. ONLY community moderators SHALL have the ability to unban users from their community. WHEN a non-moderator attempts to unban a user, THE system SHALL reject the request. Regular subscribed users cannot ban or unban other users.

### Ban List Visibility

Community moderators can view a complete list of users banned from their community. The ban list shows each banned user's identity along with the reason for the ban. The ban list is accessible exclusively to moderators of the community. Non-moderator users cannot view the ban list. The ban list is available for review by any current moderator of the community regardless of whether they issued the ban.

### Permanent Duration and Lifting

Bans remain in effect permanently until a moderator explicitly lifts the ban by unbanning the user. Bans do not expire automatically. Bans do not have a set duration or time limit. WHEN a moderator removes the ban, THEN THE user's posting and commenting privileges are immediately restored in that community. The ban record reflects the original ban reason and the time when the ban was issued.

## Report Rules

Users can report any post or comment on the platform. A text reason is strictly required when filing a report. Reports are visible exclusively to moderators of the relevant community. Moderators can either approve or dismiss each report. Approving a report automatically deletes the reported content permanently. Dismissing a report retains the content and removes the report from the active list.

### Report Creation Requirements

WHEN a post or comment is reported, THE system SHALL require the reporting user to provide a reason in text form.

IF the reason text is empty or not provided, THEN THE system SHALL reject the report submission.

The system SHALL allow any user to report any post or any comment on the platform.

IF a user attempts to report content that has already been deleted, THEN THE system SHALL reject the report.

The system SHALL record which user submitted each report.

The system SHALL associate each report with the specific post or comment being reported.

### Report Visibility and Community Scope

Reports SHALL be visible only to moderators of the community where the reported post or comment belongs.

The system SHALL not display reports to non-moderator users, including the original poster and the reporter.

Each report SHALL be tied to the community where the reported content resides, ensuring moderators can only view and act on reports within their own community.

WHEN a moderator views a report, THE system SHALL display the reported content, the identity of the user who filed the report, and the reason provided.

### Report Resolution Actions

WHEN a moderator approves a report, THE system SHALL delete the reported content permanently.

IF the reported content was a post, THEN THE system SHALL also delete all comments nested under that post.

IF the reported content was a comment, THEN THE system SHALL also delete all replies nested under that comment.

WHEN a moderator dismisses a report, THE system SHALL retain the reported content and remove the report from the active report list.

Moderators SHALL be able to either approve or dismiss each pending report, with no other resolution options available.

The system SHALL reflect karma score adjustments for any votes that were cast on content deleted by approved reports.

# Data Browsing Expectations

Business expectations for how users browse, find, and navigate through lists of data.

## List Browsing Expectations

Define business expectations for how users find, filter, and browse lists.

### Filtering Rules

WHEN users search for communities, THE system SHALL filter results by community name.
WHEN users view the home feed, THE system SHALL filter posts to include only those from communities the user is subscribed to.
WHEN users view a community feed, THE system SHALL filter posts to include only those from that specific community.
WHEN users view the popular feed, THE system SHALL filter posts to include content from all communities across the platform.
WHEN the top sorting method is selected, THE system SHALL provide time-based filtering options.
WHERE time-based filtering is used with top sorting, THE system SHALL restrict results to the selected time range: today, this week, this month, this year, or all time.

### Sorting Rules

THE system SHALL support four sorting options for post feeds: hot, new, top, and controversial.
WHEN users select hot sorting for post feeds, THE system SHALL prioritize recent posts with many upvotes first.
WHEN users select new sorting for post feeds, THE system SHALL display the most recently created posts first.
WHEN users select top sorting for post feeds, THE system SHALL display posts with the highest vote score first.
WHEN users select controversial sorting for post feeds, THE system SHALL prioritize posts with many votes but a score close to zero first.
THE system SHALL support three sorting options for comments on a post: best, new, and controversial.
WHEN users select best sorting for comments, THE system SHALL prioritize comments with the highest vote score first.
WHEN users select new sorting for comments, THE system SHALL display the most recent comments first.
WHEN users select controversial sorting for comments, THE system SHALL prioritize comments with many votes but a score close to zero first.

### Pagination Rules

THE system SHALL paginate all post feeds: home feed, popular feed, and community feed.
WHEN users browse paginated feeds, THE system SHALL allow navigation through multiple pages of content.
WHEN viewing any paginated post feed, THE system SHALL display each post listing with the following information: title, author username, community name, vote score, comment count, time since posted, and content preview.
WHERE the content preview is displayed for text posts, THE system SHALL show the first 200 characters.
WHERE the content preview is displayed for image posts, THE system SHALL show a thumbnail of the image.
WHERE the content preview is displayed for link posts, THE system SHALL show the domain name of the URL.
WHEN displaying time since posted, THE system SHALL express it as a relative time (for example, hours ago).

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### Subscription Error Scenarios

If a user attempts to subscribe to a community where they are already subscribed, the action is rejected.

If a user attempts to unsubscribe from a community where they do not have an active subscription, the action is rejected.

When a banned user attempts to subscribe to a community where they are banned, the subscription is rejected.

If a user attempts to post without subscribing to the community, the post creation is rejected and informs the user that subscription is required.

If a user attempts to edit a post in a community where they are no longer subscribed, the edit request is rejected.

When a community is deleted, all associated subscriptions are invalidated and the affected users can no longer access subscription status for that community.

If a user attempts to view the subscribed community list while not logged in, the request is rejected.

When a user deletes their account, their subscriptions are removed and they can no longer view subscribed community lists.

If a subscription request is made concurrently by the same user, only one subscription is processed.

When a user attempts to subscribe to a community without a name, the subscription fails because the community does not exist.

### Post Type Validation Errors

If a user creates a text post but provides a URL as content, the post creation is rejected.

When a user creates a link post but provides text content instead of a URL, the post creation is rejected.

If a user creates an image post but provides text content instead of an image, the post creation is rejected.

When a text post content exceeds the maximum allowed length, the creation is rejected.

If a link post contains an invalid URL format, the post creation is rejected.

When an image post upload fails due to unsupported file format, the creation is rejected.

If a user attempts to create a post without selecting a valid community, the creation is rejected.

When a link post URL is missing a protocol (http/https), the post creation is rejected.

If an image post file is empty or corrupted, the upload fails and post creation is rejected.

When a user tries to edit their post to change its content type, the edit request is rejected.

### Comment Reply Error Scenarios

If a user replies to a comment that has been deleted, the reply request is rejected.

When a user replies to a post that has been deleted, the comment request is rejected.

If a user replies in a community where they are banned, the reply is rejected.

When a reply target comment belongs to a different post than the current post, the reply is rejected.

If a reply chain exceeds the maximum allowed nesting depth, the reply is rejected.

When a banned user attempts to reply to a comment, the action is rejected.

If a user replies with empty or whitespace-only content, the reply is rejected.

When a comment is quoted but the quote source is no longer accessible, the reply proceeds but the quote reference becomes invalid.

If a reply target is actually a post rather than a comment, the reply is rejected.

When a user replies while disconnected, the reply fails unless connection is restored during processing.

### Feed Browsing Validation Failures

If a user requests posts from a non-existent community, the feed request is rejected.

When an invalid sorting option is provided (not hot, new, top, or controversial), the feed is rejected.

If a time filter is requested without the 'Top' sorting option, the filter is rejected.

When pagination parameters are invalid (negative page size or non-positive page number), the feed request is rejected.

If a user requests the Home Feed without being logged in, the request is rejected.

When sorting by 'Controversial' on an empty dataset, the feed returns no posts without error.

If invalid sort duration parameters are provided for 'Top' sorting, the request is rejected.

When pagination size exceeds the maximum allowed value, the request is rejected.

If a community feed requests access to a banned community, the feed is rejected.

When multiple conflicting sorting options are simultaneously requested, the request is rejected.

### Moderation Action Rejections

If a moderator attempts to ban themselves from their own community, the ban action is rejected.

When a moderator tries to unban a user who is not currently banned, the action is rejected.

If a ban action is performed without providing a reason, the ban is rejected.

When a moderator attempts to ban a user who is the community owner, the action is rejected.

If a moderator tries to delete their own post using moderator authority, the action succeeds via author authority but not moderator authority.

When a moderator attempts to delete another moderator's content, the deletion is rejected.

If a moderator tries to report their own content, the report is rejected.

When a moderator assigns the 'owner' role to another user, the action is rejected.

If a moderator attempts to view reports outside their moderated communities, the request is rejected.

When multiple moderators simultaneously act on the same report, only the first action succeeds.

### Reporting Target Errors

If a user reports content that has already been deleted, the report submission is rejected.

When a user reports a post in a community where they are banned, the report is rejected.

If a report is submitted for non-existent content, the report creation is rejected.

When a user attempts to report themselves as the reporter, the report is rejected.

If a duplicate report exists from the same user for the same content, the new submission is rejected.

When a moderator acts on a report that has been processed by another moderator, the action is rejected.

If a report reason exceeds the maximum allowed length, the submission is rejected.

When a user reports content without specifying a valid reason category, the report is rejected.

If a moderator dismisses a report that is currently under review by another moderator, the action is rejected.

When reporting content becomes impossible after the content creator deletes their account, the report is rejected.

### Moderation Management Exceptions

If a regular user attempts to add a moderator, the moderator addition is rejected.

When a moderator tries to appoint another moderator, the action is rejected.

If a moderator attempts to remove themselves, the request is rejected.

When the owner tries to remove all moderators from a community, the first removal succeeds but subsequent removals of remaining moderators follow normal rules.

If a moderator addition request targets a non-existent user, the addition is rejected.

When a moderator tries to assign moderator role to a banned user, the assignment is rejected.

If a moderator role change conflicts with the user's current community access level, the change is rejected.

When multiple moderators are appointed to the same community simultaneously, all appointments succeed.

If a moderator attempts to view moderation logs for communities they do not moderate, access is rejected.

When a moderator tries to escalate their authority beyond moderator level, the attempt is rejected.

### Banned User Action Exceptions

If a banned user attempts to vote on posts in the banned community, the vote is rejected.

When a banned user tries to vote on comments in the banned community, the vote is rejected.

If a banned user attempts to subscribe to the banned community, the subscription is rejected.

When a banned user tries to create polls or events in the banned community, the action is rejected.

If a banned user attempts to view moderator-only information in the banned community, access is rejected.

When a banned user tries to contact other users through the banned community, the communication is rejected.

If a user is banned from multiple communities, the ban applies independently to each community.

When a banned user's existing comments are moderated, the ban status does not override other moderation actions.

If a temporarily banned user attempts access before the ban period expires, the access is rejected.

When a banned user tries to appeal their ban through the platform, the appeal mechanism follows community-specific rules.

### Profile Update Validation Failures

If a user attempts to update another user's profile, the update request is rejected.

When a display name update conflicts with an existing username, the update is rejected.

If a profile bio exceeds the maximum character limit, the update is rejected.

When an avatar upload fails due to unsupported file format, the update is rejected.

If a user attempts to change their username to one that already exists, the change is rejected.

When a profile update includes invalid character encoding, the update is rejected.

If a user's display name update makes it identical to their email address, the update is rejected.

When an avatar image file is too large for system constraints, the upload is rejected.

If a user attempts to remove their avatar without providing a replacement, the update is rejected.

When profile information update fails due to database constraints, the user is notified of the failure.

### Vote Consistency Error Scenarios

If a user attempts to vote on their own post, the vote is rejected.

When a user votes on their own comment, the vote is rejected.

If a vote is cast on content that no longer exists, the vote is rejected.

When a user tries to vote on content from a community they cannot access, the vote is rejected.

If a vote submission is made for a post type that doesn't support voting, the vote is rejected.

When a user's voting behavior triggers rate limiting, subsequent votes are rejected.

If a vote is attempted during a temporary system maintenance window, the vote is queued for later processing.

When multiple vote requests arrive simultaneously with conflicting directions, only one vote state is retained.

If a user attempts to vote on archived or locked content, the vote is rejected.

When vote calculations result in overflow conditions, the vote is adjusted to maximum allowed values.

# File Validation Rules

Validation rules and policies for file uploads and storage.

## File Validation and Policies

Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.

### Image File Validation

Users can upload image files for avatar images on their profiles. Users can upload image files for community icon images when creating communities. Users can upload image files as content when creating image posts. WHEN a user uploads a file for an avatar, community icon, or image post, THE system SHALL validate that the file is a valid image format. IF a user uploads a file that is not a valid image format, THEN the system SHALL reject the upload.

### Content Type Validation

Every post must be categorized as one of three types: text post, link post, or image post. WHERE a post is a text post, THE system SHALL require text content. WHERE a post is a link post, THE system SHALL require a URL as the content. WHERE a post is an image post, THE system SHALL require an uploaded image as the content. WHEN viewing a post list, FOR text posts, THE system SHALL display only the first 200 characters of the content. WHEN viewing a post list, FOR link posts, THE system SHALL display the domain name of the URL. WHEN viewing a post list, FOR image posts, THE system SHALL display a thumbnail of the image.