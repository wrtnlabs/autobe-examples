# Functional Requirements Specification for Community Platform

## User Registration and Login

WHEN a guest navigates to the registration page, THE system SHALL display a form requiring email address and password.

WHEN a guest submits a registration form, THE system SHALL validate:
- email address format matches standard email regex pattern
- password is at least 8 characters long
- email address is not already registered

IF the validation fails, THEN THE system SHALL return an appropriate error message for each invalid field and prevent account creation.

WHEN all validation passes, THE system SHALL create a new member account with default karma value of 0, send a verification email, and set account status to "unverified".

WHEN a member clicks the verification link in the email, THE system SHALL update the account status to "verified" and allow full member functionality.

WHEN a verified member attempts to log in with valid credentials, THE system SHALL generate a JWT access token and refresh token, set access token to expire in 15 minutes, and set refresh token to expire in 7 days.

WHEN a member submits login credentials and authentication fails, THE system SHALL return HTTP 401 with error code AUTH_INVALID_CREDENTIALS and increment failed login counter.

WHEN a member exceeds 5 failed login attempts within 10 minutes, THE system SHALL lock the account for 30 minutes and send a notification email.

WHEN a verified member requests password reset, THE system SHALL generate a time-limited reset token (15-minute expiry) and send it via email.

WHEN a member submits a new password using a valid reset token, THE system SHALL update the password hash and invalidate all active sessions.

WHEN a member logs out, THE system SHALL invalidate the current access token but preserve the refresh token until expiry.

WHERE a member uses a mobile device, THE system SHALL offer biometric authentication as optional login method.

## Community Management

WHEN a member attempts to create a new community, THE system SHALL require a unique name (alphanumeric and underscore only, 3-24 characters) and a display name (up to 50 characters).

WHEN a member submits a community creation request, THE system SHALL check if the community name is already in use.

IF the community name is already in use, THEN THE system SHALL return error code COMMUNITY_NAME_TAKEN.

WHEN a community is created successfully, THE system SHALL:
- assign the creating member as the first moderator
- set community status to "active"
- create default rules: "No spam, no harassment, no self-promotion without permission"
- initialize subscriber count to 1

WHEN a member visits a community page, THE system SHALL display:
- community name and description
- subscriber count
- current moderator list
- community rules
- recent posts

WHEN a moderator deletes a community, THE system SHALL:
- change community status to "deleted"
- archive all posts and comments
- notify all subscribers of deletion
- prevent any new posts or comments
- retain data for moderation audit trails

WHERE a community has 10,000+ subscribers, THE system SHALL allow applications for additional moderators.

## Post Creation and Management

WHEN a member creates a new post, THE system SHALL allow submission of one of three types: text-only, link, or image.

WHEN a member submits a text post, THE system SHALL enforce:
- title length between 5 and 300 characters
- body content up to 10,000 characters
- no HTML or script tags allowed

WHEN a member submits a link post, THE system SHALL:
- validate the URL format
- extract and store the domain name
- fetch and cache the page title (fallback to submitted title if failed)
- extract and store the first 200 characters of text content for preview

WHEN a member submits an image post, THE system SHALL:
- accept .jpg, .jpeg, .png, .gif, .webp formats only
- limit file size to 10MB
- generate and store thumbnail (300px wide)
- convert image to WebP format for delivery

WHEN a post is created, THE system SHALL:
- assign the post to the selected community
- set initial upvote and downvote counts to 0
- set author ID and creation timestamp
- generate a unique post identifier (UUID)
- set post status to "active"

WHEN a member edits their own post, THE system SHALL allow edits within 24 hours of creation.

WHEN a member changes a post type (e.g., text to link), THE system SHALL treat it as a new post creation and reset voting history.

WHEN a post is deleted by an admin, THE system SHALL:
- set post status to "deleted"
- anonymize the author field
- retain post content for moderation records
- preserve comments linked to the post

WHILE a post status is "deleted", THE system SHALL NOT display it in any public feed, search, or follower view.

WHEN a post is removed from a community due to rule violation, THE system SHALL notify the author with reason and timestamp.

## Voting System

WHEN a member upvotes a post, THE system SHALL:
- increase the post’s upvote count by 1
- if the member previously downvoted the same post, decrease downvote count by 1
- if the member previously upvoted, remove the upvote and decrease upvote count by 1
- add a record to the voting history table

WHEN a member downvotes a post, THE system SHALL:
- increase the post’s downvote count by 1
- if the member previously upvoted, decrease upvote count by 1
- if the member previously downvoted, remove the downvote and decrease downvote count by 1
- add a record to the voting history table

WHEN a member attempts to vote on a post they do not have access to, THE system SHALL return HTTP 403.

WHEN a member attempts to vote on their own post, THE system SHALL return error code CANNOT_VOTE_ON_OWN_POST.

WHEN a member upvotes a comment, THE system SHALL apply the same logic as for posts.

WHEN a member downvotes a comment, THE system SHALL apply the same logic as for posts.

WHERE a post or comment is under review for spam, THE system SHALL temporarily suspend voting until review concludes.

## Commenting and Replies

WHEN a member comments on a post, THE system SHALL:
- allow up to 2,000 characters of text
- disallow HTML tags
- require the comment to not be empty
- assign the comment to the post and the author
- set timestamp and initial vote count to 0

WHEN a member replies to a comment, THE system SHALL:
- allow the reply to be nested under the original comment
- maintain hierarchical structure up to 5 levels deep
- enforce same text length limit as parent comment

WHEN a member edits their own comment, THE system SHALL allow edits within 15 minutes of creation.

WHEN a comment is edited, THE system SHALL:
- append "[Edited]" tag with timestamp
- preserve original content for moderation audit
- not reset vote counts
- not notify recipients

WHEN a member deletes their own comment, THE system SHALL:
- set comment status to "deleted"
- replace text with "[Deleted by author]"
- preserve voting history and reply structure

WHEN a moderator deletes a comment, THE system SHALL:
- set comment status to "deleted"
- replace text with "[Deleted by moderator]"
- log moderator ID and reason if provided
- preserve voting history

WHILE a comment is in moderation review, THE system SHALL hide it from public view and notify the author.

## Karma System

WHEN a member receives an upvote on a post, THE system SHALL increase their karma by 1.

WHEN a member receives a downvote on a post, THE system SHALL decrease their karma by 1.

WHEN a member receives an upvote on a comment, THE system SHALL increase their karma by 1.

WHEN a member receives a downvote on a comment, THE system SHALL decrease their karma by 1.

WHEN a member’s post or comment is deleted, THE system SHALL revert all karma gained from that post or comment.

WHEN a member receives a report on their content and the report is upheld, THE system SHALL decrease their karma by 5 and notify them with reason.

WHEN a member completes their first post, THE system SHALL award +10 karma as a bonus.

WHEN a member creates their first community, THE system SHALL award +25 karma as a bonus.

WHERE a member’s karma exceeds 1000, THE system SHALL label their profile with "Karma Master" badge.

WHEN a member reaches 100,000 karma, THE system SHALL issue a "Legend" badge.

WHEN a member’s karma falls below 0, THE system SHALL display negative value without restriction.

IF a member uses automated voting, THE system SHALL reduce all karma earned from automated votes by 50% and may suspend privileges.

## Post Sorting and Ranking

WHEN a member views a community feed with sort option "hot", THE system SHALL display posts ordered by:
- 7-day weighted score combining upvotes, downvotes, and age
- newer posts with high engagement appear higher than old trending posts
- hidden algorithm prevents spam or cookie-stuffed posts from dominating

WHEN a member selects sort option "new", THE system SHALL display posts in reverse chronological order by creation time.

WHEN a member selects sort option "top", THE system SHALL display posts ordered by total net votes (upvotes minus downvotes) across all time.

WHEN a member selects sort option "controversial", THE system SHALL display posts with the highest ratio of upvotes to downvotes and significant total vote count.

WHEN a member views the "top" feed of a specific community, THE system SHALL compute ranking only among posts within that community.

WHEN a user searches for posts, THE system SHALL include both post title and text content in search index.

WHEN a search query returns results, THE system SHALL order by relevance score based on keyword matching and post score.

IF multiple posts have identical scores, THE system SHALL use creation time as secondary sort criterion.

## Subscription System

WHEN a member subscribes to a community, THE system SHALL:
- add the community to their list of subscriptions
- increment the community’s subscriber count by 1
- send a welcome notification to the member
- include the community in their personalized feed

WHEN a member unsubscribes from a community, THE system SHALL:
- remove the community from their list of subscriptions
- decrement the community’s subscriber count by 1
- hide the community from their personalized feed

WHERE a member is not subscribed to a community, THE system SHALL still allow them to view posts within that community.

WHEN a community reaches 100 subscribers, THE system SHALL suggest the community to users with similar interests.

WHEN a community is marked as "moderated note: critical content", THE system SHALL place it in a filtered queue for subscription approval.

WHEN a member subscribes to 5 or more communities, THE system SHALL offer a "Favorites" folder feature.

## User Profiles

WHEN a member views their own profile, THE system SHALL display:
- username and avatar
- total karma
- join date
- list of communities created
- list of recent posts
- list of recent comments
- badges earned
- subscription count

WHEN a member views another member’s profile, THE system SHALL display:
- username and avatar
- total karma
- join date
- public list of communities created
- public list of recent posts (from active communities)
- public list of recent comments (from active posts)
- badges earned

WHERE a member has their profile set to private, THE system SHALL only display username and join date to non-friends.

WHEN another member clicks on a profile name from a post or comment, THE system SHALL navigate to that user’s public profile.

WHEN a member edits their profile, THE system SHALL allow:
- username change once every 6 months
- avatar upload (max 5MB, PNG/JPG format)
- bio text up to 500 characters
- public/private toggle

WHEN a member changes their username, THE system SHALL:
- update all references to the username in posts and comments
- retain old username in audit log
- send email confirmation to registered email

## Content Reporting

WHEN a member reports a post, THE system SHALL require selection of one or more reasons from:
- Spam or self-promotion
- Harassment or hate speech
- Sexual content or nudity
- Personal information disclosure
- Violation of community rules
- Other (with comment)

WHEN a member reports a comment, THE system SHALL require selection of the same reasons as for posts.

WHEN a report is submitted, THE system SHALL:
- assign the report to the moderation queue
- anonymize the reporter’s identity from the content owner
- record the post/comment ID, reason, timestamp, and reporter ID
- apply a temporary flag to the content

IF a post or comment receives 3 or more reports from different users within 24 hours, THE system SHALL automatically hide it from public view and notify a moderator.

WHEN an admin reviews a flagged post or comment, THE system SHALL display:
- full content
- report details
- author info
- voting history
- comment history
- related reports

WHEN an admin removes reported content, THE system SHALL:
- set status to "removed"
- notify author with reason
- apply karma penalty if violation confirmed
- log moderator action and timestamp

WHEN a report is dismissed, THE system SHALL:
- remove the flag
- notify reporter that action was not taken
- record reason for dismissal
- increase suspicion score for reporter if pattern detected

WHERE a member reports content 5 or more times without any content being removed, THE system SHALL reduce their reporting privileges for 30 days.

## Performance Expectations

WHEN a member loads a community feed, THE system SHALL render the page and display initial posts within 1.5 seconds.

WHEN a member clicks "Load More", THE system SHALL load the next 20 posts and append them within 1 second.

WHEN a member submits a post, THE system SHALL confirm success and display the post in the feed within 2 seconds.

WHEN a member votes on a post or comment, THE system SHALL update the vote count visibly within 500 milliseconds.

WHEN a member submits a comment, THE system SHALL display the comment immediately and update total comment count within 1 second.

WHEN a member navigates between "hot", "new", "top", and "controversial" views, THE system SHALL refresh the feed instantly without full page reload.

WHEN a user searches for content, THE system SHALL display results as they type for queries over 3 characters and return full results within 1 second.

WHEN a member loads their profile, THE system SHALL display posts and comments within 2 seconds, even with high activity.

WHEN a report is submitted, THE system SHALL confirm receipt and queue processing within 500 milliseconds.

WHEN a post is re-ranked due to new votes, THE system SHALL appear in new position on hot feed within 60 seconds.

## Error Handling

IF a member attempts to create a post with no content and no link or image, THEN THE system SHALL return error code POST_EMPTY_CONTENT.

IF a member attempts to create a community with name containing special characters, THEN THE system SHALL return error code COMMUNITY_NAME_INVALID_FORMAT.

IF a member attempts to comment on a deleted post, THEN THE system SHALL return error code COMMENT_ON_DELETED_POST.

IF a member attempts to vote on a post after logging out, THEN THE system SHALL return error code AUTH_REQUIRED_FOR_VOTING.

IF a member attempts to edit their post after 24 hours, THEN THE system SHALL return error code EDIT_WINDOW_EXPIRED.

IF a member attempts to reply to a comment beyond 5 levels deep, THEN THE system SHALL return error code COMMENT_DEPTH_LIMIT_EXCEEDED.

IF a member attempts to upvote or downvote more than 10 times in 10 seconds, THEN THE system SHALL temporarily lock voting privileges for 1 minute.

IF a member attempts to submit an image larger than 10MB, THEN THE system SHALL return error code IMAGE_TOO_LARGE.

IF a member attempts to register with an invalid email format, THEN THE system SHALL return error code EMAIL_INVALID_FORMAT.

IF a member attempts to log in with unverified email, THEN THE system SHALL return error code EMAIL_UNVERIFIED.

IF a member attempts to perform moderation actions without admin privileges, THEN THE system SHALL return error code INSUFFICIENT_PERMISSIONS.

IF the system database encounters an internal error during post creation, THEN THE system SHALL return error code SYSTEM_UNAVAILABLE and notify administrators.

IF a member’s session expires while editing a post, THEN THE system SHALL save draft locally and redirect to login with prompt to restore draft.

IF a report is submitted with no reason selected, THEN THE system SHALL display validation error and require at least one reason.

IF a member attempts to delete their account, THEN THE system SHALL require password confirmation and mark account for scheduled deletion in 7 days.

IF the server receives conflicting voting events for the same user-post pair within 100ms, THEN THE system SHALL use timestamp as tiebreaker and route to idempotent event queue.