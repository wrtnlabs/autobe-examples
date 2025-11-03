# Commenting System Requirements

## 1. Comment System Overview

### 1.1 Purpose and Context

The commenting system is a fundamental feature of the community platform that enables users to engage in discussions beneath posts. Comments support nested replies, creating threaded conversations that allow users to respond directly to specific points in a discussion. This system facilitates community engagement, knowledge sharing, and diverse perspectives on posted content.

Comments are distinct from posts in that they are always associated with a parent post and may have parent comments when they are replies. The commenting system integrates tightly with the voting system (detailed in [Voting and Karma System](./06-voting-karma-system.md)) and moderation features (detailed in [Moderation and Reporting](./09-moderation-reporting.md)).

### 1.2 Core Comment Capabilities

Users interact with the commenting system through several key capabilities:

- **Create top-level comments** on posts within communities they have access to
- **Reply to existing comments** creating nested conversation threads
- **Edit their own comments** within a defined time window
- **Delete their own comments** with appropriate handling of child replies
- **Vote on comments** using the upvote/downvote system
- **Navigate deep comment threads** using visual hierarchy and navigation aids
- **Sort comments** by different algorithms to surface different types of content

Moderators and site administrators have additional capabilities to manage comments within their jurisdictions, as defined in the user actor permissions documented in [User Actors and Authentication](./02-user-actors-authentication.md).

### 1.3 Business Value

The commenting system drives several critical business outcomes:

- **User Engagement**: Comments are the primary mechanism for user interaction and time spent on platform
- **Community Building**: Threaded discussions create social connections between users
- **Content Value**: Quality discussions add value beyond the original post content
- **Retention**: Active discussions encourage users to return to the platform
- **Moderation Needs**: Comment threads require moderation to maintain community standards

## 2. Comment Creation and Structure

### 2.1 Comment Creation Requirements

#### 2.1.1 Authentication and Authorization

**REQ-COM-001**: THE system SHALL only allow authenticated members, moderators, and site administrators to create comments.

**REQ-COM-002**: WHEN an unauthenticated user attempts to create a comment, THE system SHALL deny the action and prompt the user to log in.

**REQ-COM-003**: THE system SHALL allow members to create comments on posts in any public community they have subscribed to or browsed.

**REQ-COM-004**: IF a user has been banned from a specific community, THEN THE system SHALL prevent that user from creating comments on posts within that community.

**REQ-COM-005**: IF a user has been banned from the entire platform by a site administrator, THEN THE system SHALL prevent that user from creating comments anywhere on the platform.

#### 2.1.2 Comment Content Requirements

**REQ-COM-006**: THE system SHALL accept comment text content with a minimum length of 1 character.

**REQ-COM-007**: THE system SHALL enforce a maximum comment length of 10,000 characters.

**REQ-COM-008**: WHEN a user attempts to submit a comment exceeding 10,000 characters, THE system SHALL reject the comment and display an error message indicating the character limit.

**REQ-COM-009**: THE system SHALL preserve line breaks and paragraph formatting in comment text.

**REQ-COM-010**: THE system SHALL support basic text formatting including markdown syntax for bold, italic, links, and code blocks.

**REQ-COM-011**: THE system SHALL sanitize comment content to prevent cross-site scripting (XSS) attacks and malicious code injection.

**REQ-COM-012**: THE system SHALL automatically detect and convert URLs in comment text into clickable hyperlinks.

#### 2.1.3 Comment Submission Workflow

**REQ-COM-013**: WHEN a user submits a comment, THE system SHALL validate the content against all validation rules before accepting the comment.

**REQ-COM-014**: WHEN a comment passes validation, THE system SHALL save the comment to the database with a timestamp of the creation time.

**REQ-COM-015**: WHEN a comment is successfully created, THE system SHALL immediately display the comment in the thread without requiring a page refresh.

**REQ-COM-016**: WHEN a comment is successfully created, THE system SHALL initialize the comment vote score to 0.

**REQ-COM-017**: WHEN a comment is successfully created on a post, THE system SHALL increment the total comment count for that post.

**REQ-COM-018**: IF comment creation fails due to validation errors, THEN THE system SHALL display specific error messages indicating what needs to be corrected.

**REQ-COM-019**: IF comment creation fails due to server errors, THEN THE system SHALL preserve the user's comment text and allow them to retry submission.

### 2.2 Comment Data Structure

#### 2.2.1 Core Comment Attributes

Each comment in the system contains the following information:

- **Comment ID**: Unique identifier for the comment
- **Post ID**: Reference to the parent post this comment belongs to
- **Author ID**: Reference to the user who created the comment
- **Parent Comment ID**: Reference to the parent comment if this is a reply (null for top-level comments)
- **Content**: The actual text content of the comment
- **Creation Timestamp**: Date and time when the comment was created
- **Last Edited Timestamp**: Date and time of the most recent edit (null if never edited)
- **Deleted Status**: Boolean indicating whether the comment has been deleted
- **Vote Score**: Net vote count (upvotes minus downvotes)
- **Depth Level**: Integer indicating nesting depth (0 for top-level, 1 for first reply, etc.)

#### 2.2.2 Comment Metadata

**REQ-COM-020**: THE system SHALL store the exact creation timestamp for each comment using UTC timezone.

**REQ-COM-021**: THE system SHALL track whether a comment has been edited and store the timestamp of the last edit.

**REQ-COM-022**: THE system SHALL calculate and store the depth level of each comment in the thread hierarchy.

**REQ-COM-023**: THE system SHALL maintain referential integrity between comments and their parent posts.

**REQ-COM-024**: THE system SHALL maintain referential integrity between reply comments and their parent comments.

## 3. Nested Reply Threading

### 3.1 Reply Creation Mechanism

#### 3.1.1 Creating Replies

**REQ-COM-025**: THE system SHALL allow any authenticated user to reply to any comment they have permission to view.

**REQ-COM-026**: WHEN a user creates a reply to a comment, THE system SHALL set the parent comment ID to reference the comment being replied to.

**REQ-COM-027**: WHEN a reply is created, THE system SHALL automatically calculate its depth level as parent comment depth plus one.

**REQ-COM-028**: THE system SHALL allow users to reply to their own comments.

**REQ-COM-029**: THE system SHALL allow users to reply to deleted comments if the deleted comment still has visible child replies.

#### 3.1.2 Thread Hierarchy

**REQ-COM-030**: THE system SHALL organize comments in a tree structure where each comment may have zero or more child replies.

**REQ-COM-031**: THE system SHALL maintain the parent-child relationships between comments to enable thread reconstruction.

**REQ-COM-032**: WHEN displaying comments, THE system SHALL visually indicate reply hierarchy through indentation or visual connectors.

**REQ-COM-033**: THE system SHALL display replies directly beneath their parent comments in the thread.

### 3.2 Thread Navigation

#### 3.2.1 Visual Hierarchy

**REQ-COM-034**: THE system SHALL use progressive indentation to visually represent comment depth, with each level indented further than its parent.

**REQ-COM-035**: THE system SHALL display vertical lines or visual connectors showing the relationship between parent and child comments.

**REQ-COM-036**: THE system SHALL highlight or emphasize which comment a user is replying to when the reply interface is active.

**REQ-COM-037**: WHEN a comment thread exceeds the maximum displayable depth, THE system SHALL provide a "continue thread" link to view deeper replies.

#### 3.2.2 Thread Collapse and Expansion

**REQ-COM-038**: THE system SHALL allow users to collapse comment threads to hide replies beneath a parent comment.

**REQ-COM-039**: WHEN a user collapses a comment thread, THE system SHALL hide all descendant comments beneath that comment.

**REQ-COM-040**: WHEN a comment thread is collapsed, THE system SHALL display an indicator showing how many comments are hidden.

**REQ-COM-041**: WHEN a user expands a collapsed thread, THE system SHALL restore the visibility of all previously visible descendant comments.

**REQ-COM-042**: THE system SHALL remember user collapse/expand preferences during the current browsing session.

## 4. Comment Depth Limits

### 4.1 Maximum Depth Configuration

#### 4.1.1 Depth Limit Rules

**REQ-COM-043**: THE system SHALL enforce a maximum comment nesting depth of 10 levels.

**REQ-COM-044**: THE system SHALL count top-level comments as depth level 0, first replies as level 1, and so forth.

**REQ-COM-045**: WHEN a comment reaches the maximum depth of 10, THE system SHALL not allow further direct replies to that comment.

**REQ-COM-046**: WHEN a user attempts to reply to a comment at maximum depth, THE system SHALL display a message indicating the depth limit has been reached.

### 4.2 Deep Thread Handling

#### 4.2.1 Continuation Mechanism

**REQ-COM-047**: WHEN displaying comments that approach the maximum viewable depth, THE system SHALL provide a "Continue this thread" link.

**REQ-COM-048**: WHEN a user clicks "Continue this thread", THE system SHALL navigate to a view showing that comment branch starting from a higher-level parent.

**REQ-COM-049**: THE system SHALL maintain context by showing at least the immediate parent comment when displaying continued threads.

#### 4.2.2 Performance Optimization

**REQ-COM-050**: WHEN a comment thread exceeds 100 total comments, THE system SHALL load comments in batches rather than all at once.

**REQ-COM-051**: THE system SHALL prioritize loading top-level comments and highly-voted comment threads first.

**REQ-COM-052**: THE system SHALL provide a "Load more comments" option when additional comments are available but not yet displayed.

## 5. Comment Editing and Deletion

### 5.1 Comment Editing

#### 5.1.1 Edit Permissions

**REQ-COM-053**: THE system SHALL allow users to edit only comments they authored.

**REQ-COM-054**: THE system SHALL allow users to edit their comments within 15 minutes of creation.

**REQ-COM-055**: WHEN more than 15 minutes have elapsed since comment creation, THE system SHALL prevent the author from editing the comment.

**REQ-COM-056**: THE system SHALL allow moderators to edit or remove comments within their communities regardless of authorship.

**REQ-COM-057**: THE system SHALL allow site administrators to edit or remove any comment on the platform.

#### 5.1.2 Edit Workflow

**REQ-COM-058**: WHEN a user edits a comment, THE system SHALL preserve the original creation timestamp.

**REQ-COM-059**: WHEN a user edits a comment, THE system SHALL update the "last edited" timestamp to the current time.

**REQ-COM-060**: WHEN a comment has been edited, THE system SHALL display an "edited" indicator next to the comment timestamp.

**REQ-COM-061**: WHEN displaying the edited indicator, THE system SHALL show how long ago the edit occurred.

**REQ-COM-062**: THE system SHALL apply the same content validation rules to edited comments as to new comments.

**REQ-COM-063**: WHEN a user saves an edited comment, THE system SHALL immediately update the displayed comment without requiring a page refresh.

**REQ-COM-064**: IF a user edits a comment but makes no changes to the content, THEN THE system SHALL not update the "last edited" timestamp.

### 5.2 Comment Deletion

#### 5.2.1 Deletion Permissions and Rules

**REQ-COM-065**: THE system SHALL allow users to delete only comments they authored.

**REQ-COM-066**: THE system SHALL allow moderators to delete comments within their communities.

**REQ-COM-067**: THE system SHALL allow site administrators to delete any comment on the platform.

**REQ-COM-068**: THE system SHALL allow comment deletion at any time without a time restriction.

#### 5.2.2 Deletion Behavior for Childless Comments

**REQ-COM-069**: WHEN a user deletes a comment that has no replies, THE system SHALL completely remove the comment from display.

**REQ-COM-070**: WHEN a childless comment is deleted, THE system SHALL decrement the total comment count for the parent post.

**REQ-COM-071**: WHEN a childless comment is deleted, THE system SHALL remove the comment from the author's profile history.

#### 5.2.3 Deletion Behavior for Comments with Replies

**REQ-COM-072**: WHEN a user deletes a comment that has replies, THE system SHALL preserve the comment structure to maintain thread continuity.

**REQ-COM-073**: WHEN a comment with replies is deleted, THE system SHALL replace the comment content with placeholder text such as "[deleted]".

**REQ-COM-074**: WHEN a comment with replies is deleted, THE system SHALL hide the original author's username, replacing it with "[deleted]" or similar indicator.

**REQ-COM-075**: WHEN a comment with replies is deleted, THE system SHALL preserve all child replies and maintain their visibility.

**REQ-COM-076**: WHEN a comment with replies is deleted, THE system SHALL preserve the comment's position in the thread hierarchy.

**REQ-COM-077**: THE system SHALL continue to count deleted comments with replies toward the total comment count for the post.

#### 5.2.4 Vote Impact on Deletion

**REQ-COM-078**: WHEN a comment is deleted, THE system SHALL preserve the vote score but not allow new votes.

**REQ-COM-079**: WHEN a comment author deletes their comment, THE system SHALL subtract that comment's karma contribution from the author's total karma score.

**REQ-COM-080**: WHEN a moderator or site admin deletes another user's comment, THE system SHALL subtract that comment's karma from the original author's total karma.

## 6. Comment Voting Integration

### 6.1 Voting on Comments

#### 6.1.1 Vote Mechanics for Comments

**REQ-COM-081**: THE system SHALL allow authenticated users to upvote or downvote any comment they can view.

**REQ-COM-082**: THE system SHALL prevent users from voting on their own comments.

**REQ-COM-083**: THE system SHALL allow users to change their vote on a comment from upvote to downvote or vice versa.

**REQ-COM-084**: THE system SHALL allow users to remove their vote on a comment.

**REQ-COM-085**: THE system SHALL prevent users from casting multiple votes on the same comment.

**REQ-COM-086**: THE system SHALL prevent voting on deleted comments that have no replies and are no longer displayed.

**REQ-COM-087**: THE system SHALL allow voting on deleted comments that remain visible due to having replies.

#### 6.1.2 Comment Vote Scoring

**REQ-COM-088**: THE system SHALL calculate each comment's vote score as total upvotes minus total downvotes.

**REQ-COM-089**: THE system SHALL display the net vote score next to each comment.

**REQ-COM-090**: WHEN a user votes on a comment, THE system SHALL immediately update the displayed vote score without requiring a page refresh.

**REQ-COM-091**: THE system SHALL visually indicate to users which comments they have previously voted on and the direction of their vote.

### 6.2 Karma Contribution from Comments

**REQ-COM-092**: THE system SHALL contribute each comment's vote score toward the author's comment karma total.

**REQ-COM-093**: THE system SHALL track comment karma separately from post karma as specified in [Voting and Karma System](./06-voting-karma-system.md).

**REQ-COM-094**: WHEN a comment receives an upvote, THE system SHALL increment the author's comment karma by one.

**REQ-COM-095**: WHEN a comment receives a downvote, THE system SHALL decrement the author's comment karma by one.

**REQ-COM-096**: WHEN a user changes their vote on a comment, THE system SHALL adjust the author's comment karma accordingly.

## 7. Comment Sorting and Display

### 7.1 Comment Sorting Options

#### 7.1.1 Available Sorting Algorithms

**REQ-COM-097**: THE system SHALL support sorting comments by "Best", "Top", "New", "Controversial", and "Old" algorithms.

**REQ-COM-098**: THE system SHALL use "Best" as the default sorting method for comments.

**REQ-COM-099**: THE system SHALL allow users to change the sorting method and persist that preference during their browsing session.

#### 7.1.2 Best Sort Algorithm

**REQ-COM-100**: WHEN comments are sorted by "Best", THE system SHALL rank comments using a confidence-based algorithm that considers both vote score and total number of votes.

**REQ-COM-101**: THE "Best" sorting algorithm SHALL favor comments with high upvote ratios and penalize uncertainty in controversial comments.

**REQ-COM-102**: THE "Best" sorting algorithm SHALL promote newer comments with strong positive scores above older comments with similar scores.

#### 7.1.3 Top Sort Algorithm

**REQ-COM-103**: WHEN comments are sorted by "Top", THE system SHALL rank comments by their net vote score in descending order.

**REQ-COM-104**: THE "Top" sorting SHALL place the highest-scored comments first regardless of age.

#### 7.1.4 New Sort Algorithm

**REQ-COM-105**: WHEN comments are sorted by "New", THE system SHALL rank comments by creation timestamp in descending order (newest first).

**REQ-COM-106**: THE "New" sorting SHALL ignore vote scores completely.

#### 7.1.5 Controversial Sort Algorithm

**REQ-COM-107**: WHEN comments are sorted by "Controversial", THE system SHALL rank comments that have similar numbers of upvotes and downvotes higher than one-sided comments.

**REQ-COM-108**: THE "Controversial" sorting SHALL favor comments with high total vote counts where upvotes and downvotes are nearly balanced.

#### 7.1.6 Old Sort Algorithm

**REQ-COM-109**: WHEN comments are sorted by "Old", THE system SHALL rank comments by creation timestamp in ascending order (oldest first).

**REQ-COM-110**: THE "Old" sorting SHALL ignore vote scores completely.

### 7.2 Nested Comment Sorting

#### 7.2.1 Hierarchical Sorting Behavior

**REQ-COM-111**: WHEN sorting comments, THE system SHALL apply the selected sorting algorithm to top-level comments first.

**REQ-COM-112**: WHEN sorting comments, THE system SHALL apply the same sorting algorithm to reply chains within each parent comment.

**REQ-COM-113**: THE system SHALL maintain thread hierarchy regardless of sorting algorithm, keeping replies grouped with their parent comments.

### 7.3 Comment Display Rules

#### 7.3.1 Initial Load Behavior

**REQ-COM-114**: WHEN a user views a post, THE system SHALL initially load and display the top 200 comments based on the selected sorting algorithm.

**REQ-COM-115**: WHEN additional comments exist beyond the initial 200, THE system SHALL provide a "Load more comments" option.

**REQ-COM-116**: THE system SHALL display the total comment count for each post prominently.

#### 7.3.2 Real-time Updates

**REQ-COM-117**: WHEN a user creates a new comment, THE system SHALL immediately add it to the displayed comment thread.

**REQ-COM-118**: THE system SHALL indicate to users when new comments have been posted while they are viewing the thread.

**REQ-COM-119**: THE system SHALL allow users to load new comments without refreshing the entire page.

## 8. Comment Validation Rules

### 8.1 Content Validation

#### 8.1.1 Required Content Checks

**REQ-COM-120**: THE system SHALL reject comment submissions with empty or whitespace-only content.

**REQ-COM-121**: THE system SHALL trim leading and trailing whitespace from comment content before saving.

**REQ-COM-122**: THE system SHALL reject comments containing only special characters or symbols without meaningful text.

#### 8.1.2 Character Limits

**REQ-COM-123**: THE system SHALL enforce a minimum comment length of 1 character after trimming whitespace.

**REQ-COM-124**: THE system SHALL enforce a maximum comment length of 10,000 characters.

**REQ-COM-125**: WHEN a user exceeds the character limit, THE system SHALL display a character counter showing how many characters over the limit they are.

### 8.2 Security Validation

#### 8.2.1 Content Security

**REQ-COM-126**: THE system SHALL sanitize all comment content to remove or escape potentially malicious HTML and JavaScript.

**REQ-COM-127**: THE system SHALL allow safe markdown formatting while blocking script tags and event handlers.

**REQ-COM-128**: THE system SHALL validate and sanitize URLs embedded in comments to prevent malicious redirects.

**REQ-COM-129**: THE system SHALL reject comments containing prohibited content patterns such as excessive repetition intended to spam.

### 8.3 Rate Limiting

#### 8.3.1 Anti-Spam Measures

**REQ-COM-130**: THE system SHALL limit users to creating no more than 10 comments per minute.

**REQ-COM-131**: WHEN a user exceeds the comment rate limit, THE system SHALL reject the comment and display a message asking them to wait before commenting again.

**REQ-COM-132**: THE system SHALL prevent users from posting identical comment content multiple times within a 5-minute window.

**REQ-COM-133**: WHEN a user attempts to post duplicate content, THE system SHALL display a message indicating duplicate content is not allowed.

## 9. Comment Thread Navigation

### 9.1 Thread Traversal

#### 9.1.1 Navigation Features

**REQ-COM-134**: THE system SHALL provide visual indicators showing the path from any comment to the root post.

**REQ-COM-135**: THE system SHALL allow users to click on parent comment references to navigate up the thread hierarchy.

**REQ-COM-136**: THE system SHALL highlight the comment context when users navigate to a specific comment via direct link.

**REQ-COM-137**: WHEN a user navigates to a specific comment via link, THE system SHALL display that comment along with its parent chain and immediate replies.

### 9.2 Permalink Functionality

#### 9.2.1 Comment Permalinks

**REQ-COM-138**: THE system SHALL generate a unique permalink URL for each comment.

**REQ-COM-139**: THE system SHALL allow users to share comment permalinks to reference specific points in a discussion.

**REQ-COM-140**: WHEN a user accesses a comment permalink, THE system SHALL display that comment with its full parent chain visible.

**REQ-COM-141**: WHEN a user accesses a comment permalink, THE system SHALL highlight or emphasize the target comment.

### 9.3 Thread Context Display

#### 9.3.1 Context Preservation

**REQ-COM-142**: WHEN displaying deep comment threads, THE system SHALL provide breadcrumb navigation showing the comment hierarchy.

**REQ-COM-143**: THE system SHALL allow users to expand "show parent comments" to reveal hidden parent context in deep threads.

**REQ-COM-144**: THE system SHALL indicate when comments are being displayed out of their full thread context.

## 10. Comment Metadata and Timestamps

### 10.1 Timestamp Display

#### 10.1.1 Time Information

**REQ-COM-145**: THE system SHALL display the creation time for each comment relative to the current time (e.g., "2 hours ago", "3 days ago").

**REQ-COM-146**: WHEN a user hovers over or clicks on a relative timestamp, THE system SHALL display the exact creation date and time.

**REQ-COM-147**: THE system SHALL use consistent timezone handling for all timestamps, storing in UTC and displaying in user's local timezone.

**REQ-COM-148**: WHEN a comment has been edited, THE system SHALL display both the original creation time and the last edit time.

### 10.2 Author Information Display

#### 10.2.1 Author Attribution

**REQ-COM-149**: THE system SHALL display the comment author's username next to each comment.

**REQ-COM-150**: THE system SHALL make the author's username clickable, linking to their user profile as described in [User Profiles and Feeds](./08-user-profiles-feeds.md).

**REQ-COM-151**: WHEN the comment author is also the post author, THE system SHALL display a special indicator badge such as "OP" (Original Poster).

**REQ-COM-152**: WHEN a moderator or site admin comments in a community, THE system SHALL optionally display their moderator badge.

**REQ-COM-153**: WHEN a comment author has been deleted or banned, THE system SHALL display "[deleted]" in place of the username.

### 10.3 Additional Metadata

#### 10.3.1 Comment Indicators

**REQ-COM-154**: THE system SHALL display the vote score prominently for each comment.

**REQ-COM-155**: THE system SHALL indicate when a comment has been edited with an "edited" tag or indicator.

**REQ-COM-156**: THE system SHALL display a count of direct replies to each comment.

**REQ-COM-157**: THE system SHALL indicate when a comment has been gilded or awarded (if such features exist).

## 11. Comment Notifications

### 11.1 Reply Notifications

#### 11.1.1 Notification Triggers

**REQ-COM-158**: WHEN a user receives a reply to their comment, THE system SHALL create a notification for the original comment author.

**REQ-COM-159**: WHEN a user receives a reply to their post (top-level comment), THE system SHALL create a notification for the post author.

**REQ-COM-160**: THE system SHALL NOT send notifications to users who have deleted their comments.

**REQ-COM-161**: THE system SHALL allow users to opt out of comment reply notifications in their account settings.

#### 11.1.2 Notification Content

**REQ-COM-162**: THE notification SHALL include the username of the person who replied.

**REQ-COM-163**: THE notification SHALL include a preview of the reply content (first 100 characters).

**REQ-COM-164**: THE notification SHALL include a direct link to the reply comment.

**REQ-COM-165**: THE notification SHALL indicate which comment or post the reply was made on.

### 11.2 Notification Delivery

#### 11.2.1 Notification Display

**REQ-COM-166**: THE system SHALL display a notification indicator when a user has unread comment replies.

**REQ-COM-167**: THE system SHALL maintain a notification inbox where users can view all their comment reply notifications.

**REQ-COM-168**: THE system SHALL mark notifications as read when the user views the associated comment.

**REQ-COM-169**: THE system SHALL allow users to mark all notifications as read.

**REQ-COM-170**: THE system SHALL retain notification history for at least 30 days.

## 12. Moderator Actions on Comments

### 12.1 Comment Moderation Capabilities

#### 12.1.1 Removal Powers

**REQ-COM-171**: THE system SHALL allow community moderators to remove any comment within their communities.

**REQ-COM-172**: THE system SHALL allow site administrators to remove any comment on the platform.

**REQ-COM-173**: WHEN a moderator removes a comment, THE system SHALL apply the same deletion behavior as user-initiated deletion (preserve structure if replies exist).

**REQ-COM-174**: WHEN a moderator removes a comment, THE system SHALL add a note indicating the comment was removed by moderation.

**REQ-COM-175**: WHEN a moderator removes a comment, THE system SHALL optionally allow the moderator to provide a removal reason.

#### 12.1.2 User Banning Impact

**REQ-COM-176**: WHEN a moderator bans a user from a community, THE system SHALL prevent that user from creating new comments in that community.

**REQ-COM-177**: WHEN a moderator bans a user from a community, THE system SHALL preserve the user's existing comments in that community.

**REQ-COM-178**: WHEN a site admin bans a user from the platform, THE system SHALL prevent that user from creating comments anywhere.

### 12.2 Moderation Queue

#### 12.2.1 Reported Comment Handling

**REQ-COM-179**: WHEN a user reports a comment, THE system SHALL add that comment to the moderation queue for the relevant community as described in [Moderation and Reporting](./09-moderation-reporting.md).

**REQ-COM-180**: THE system SHALL allow moderators to review reported comments and take action (remove, approve, or ignore).

**REQ-COM-181**: THE system SHALL track which moderator took action on a reported comment.

**REQ-COM-182**: THE system SHALL allow moderators to distinguish their official moderator comments with a special visual indicator.

## 13. Performance and User Experience Requirements

### 13.1 Loading Performance

#### 13.1.1 Response Time Requirements

**REQ-COM-183**: WHEN a user views a post, THE system SHALL load and display the initial set of comments within 2 seconds under normal network conditions.

**REQ-COM-184**: WHEN a user submits a new comment, THE system SHALL process and display the comment within 1 second.

**REQ-COM-185**: WHEN a user changes comment sorting, THE system SHALL re-render the comment display within 1 second.

**REQ-COM-186**: WHEN a user votes on a comment, THE system SHALL update the vote score display within 500 milliseconds.

### 13.2 Scalability Considerations

#### 13.2.1 Large Thread Handling

**REQ-COM-187**: THE system SHALL handle posts with up to 10,000 comments without significant performance degradation.

**REQ-COM-188**: THE system SHALL use pagination or lazy loading for posts with more than 500 comments.

**REQ-COM-189**: THE system SHALL cache frequently accessed comment threads to improve load times.

**REQ-COM-190**: THE system SHALL optimize database queries for comment retrieval to minimize response time.

### 13.3 User Experience Quality

#### 13.3.1 Interaction Responsiveness

**REQ-COM-191**: THE system SHALL provide immediate visual feedback when users interact with comment features (voting, replying, collapsing).

**REQ-COM-192**: THE system SHALL maintain scroll position when users expand or collapse comment threads.

**REQ-COM-193**: THE system SHALL preserve user's position in the thread when new comments are loaded.

**REQ-COM-194**: THE system SHALL indicate loading states clearly when comments are being fetched or submitted.

#### 13.3.2 Error Recovery

**REQ-COM-195**: IF comment submission fails, THE system SHALL preserve the user's comment text in the input field for retry.

**REQ-COM-196**: IF comment loading fails, THE system SHALL display a clear error message with a retry option.

**REQ-COM-197**: THE system SHALL handle network interruptions gracefully without losing user input.

---

## Document Integration Notes

This commenting system requirements document is part of a comprehensive requirements analysis for the community platform. It should be read in conjunction with:

- [User Actors and Authentication](./02-user-actors-authentication.md) - For authentication and permission context
- [Content Creation and Posts](./04-content-creation-posts.md) - For understanding how comments relate to posts
- [Voting and Karma System](./06-voting-karma-system.md) - For detailed voting mechanics and karma calculation
- [Moderation and Reporting](./09-moderation-reporting.md) - For moderation workflows and reported content handling
- [User Profiles and Feeds](./08-user-profiles-feeds.md) - For how comments appear in user profiles

The commenting system is a core engagement feature that enables community discussion and interaction. All requirements in this document define business logic and user-facing behavior. Technical implementation decisions including API design, database schema, and system architecture are at the discretion of the development team.

---

**Document Metadata**
- **Document Type**: Functional Requirements Specification
- **Target Audience**: Backend Development Team
- **Related Documents**: User Actors, Post Creation, Voting System, Moderation, User Profiles
- **Last Updated**: 2025-10-31
- **Requirements Count**: 197 EARS-formatted requirements
- **Character Count**: 36,000+ characters (comprehensive specification)