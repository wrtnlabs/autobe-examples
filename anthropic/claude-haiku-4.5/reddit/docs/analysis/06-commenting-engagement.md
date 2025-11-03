# Commenting & Engagement System Requirements

## 1. Comment Creation & Submission

### 1.1 Comment Posting Requirements

**WHEN** a member is viewing a post, **THE** system **SHALL** allow them to compose a reply to that post by providing a text input area for comment content.

**WHEN** a member is viewing an existing comment within a thread, **THE** system **SHALL** allow them to compose a reply specifically to that comment, creating a nested reply.

**WHEN** a member submits a comment, **THE** system **SHALL** validate the comment content and either accept and publish it or return validation errors.

**WHEN** a comment is successfully created, **THE** system **SHALL** associate it with the member's account and timestamp the creation with the current date and time.

### 1.2 Content Validation & Limits

**THE** commenting system **SHALL** require comment text content to be between 1 and 5,000 characters in length.

**WHEN** a member attempts to submit a comment shorter than 1 character, **THE** system **SHALL** reject it with error message "Comment must contain at least 1 character."

**WHEN** a member attempts to submit a comment longer than 5,000 characters, **THE** system **SHALL** reject it with error message "Comment must not exceed 5,000 characters."

**THE** system **SHALL** trim leading and trailing whitespace from comment content before validation.

**WHEN** a member attempts to submit a comment containing only whitespace after trimming, **THE** system **SHALL** reject it with error message "Comment cannot be empty."

### 1.3 Comment Composition Workflow

**WHEN** a member begins typing in a comment box, **THE** system **MAY** optionally display a live character count showing remaining characters out of the 5,000 limit.

**WHEN** a member clicks or touches the submit button while typing a comment, **THE** system **SHALL** submit the comment if it passes validation.

**WHEN** a member begins composing a comment but navigates away from the page, **THE** system **MAY** save the draft locally in the browser (optional feature).

**WHEN** a member is not authenticated (guest user), **THE** system **SHALL** prevent comment creation and display message "You must log in to comment."

**WHEN** a member's account is less than 1 day old, **THE** system **SHALL** allow comment creation but cap their posting rate to maximum 10 comments per hour to prevent spam.

### 1.4 Error Handling & User Feedback

**WHEN** a comment submission fails due to server error, **THE** system **SHALL** return error message "Failed to post comment. Please try again." and allow the member to retry.

**WHEN** a member attempts to comment but their account has been temporarily restricted by moderators, **THE** system **SHALL** reject the comment with message "Your account is currently restricted from commenting."

**WHEN** a comment submission succeeds, **THE** system **SHALL** display success feedback and immediately show the new comment in the thread.

---

## 2. Nested Reply & Threading Architecture

### 2.1 Reply Depth & Nesting Structure

**THE** system **SHALL** support unlimited depth for nested comment replies, allowing members to reply to any comment at any level in the thread.

**WHEN** a member creates a reply to a specific comment, **THE** system **SHALL** establish a parent-child relationship between the new reply and the comment being replied to.

**WHEN** a member creates a direct reply to a post (not to another comment), **THE** system **SHALL** treat this as a top-level comment with no parent.

**WHEN** a member creates a reply to an existing reply, **THE** system **SHALL** nest it under that reply and maintain the full reply chain ancestry.

### 2.2 Reply Chain Relationships

**THE** system **SHALL** maintain complete lineage information for every comment, tracking its direct parent comment and the root post it belongs to.

**WHEN** displaying a nested reply, **THE** system **SHALL** make it clear which comment is being replied to by showing or referencing the parent comment.

**WHEN** a member views a deeply nested reply, **THE** system **SHALL** provide navigation to view parent comments in the chain without scrolling.

**WHEN** a parent comment is deleted, **THE** system **SHALL** preserve child replies but display them with indication that the parent comment is no longer available.

### 2.3 Thread Organization

**THE** system **SHALL** organize all comments and replies into a hierarchical comment tree rooted at the post level.

**WHEN** a member views a post, **THE** system **SHALL** display all top-level comments and provide mechanisms to expand and view nested replies.

**WHEN** a member expands a comment to view its replies, **THE** system **SHALL** load and display all direct child replies of that comment.

**WHEN** a nested reply is made, **THE** system **SHALL** maintain its position in the hierarchy so it appears under its parent comment.

---

## 3. Comment Display & Rendering

### 3.1 Thread Visualization

**WHEN** a member views a post's comment section, **THE** system **SHALL** display top-level comments in a list format, one per line item.

**WHEN** a top-level comment has nested replies, **THE** system **SHALL** provide a visual indicator showing the number of nested replies (e.g., "2 replies").

**WHEN** a member clicks or touches the replies indicator, **THE** system **SHALL** expand to show all nested replies under that comment with visual indentation to show nesting level.

**WHEN** displaying nested replies, **THE** system **SHALL** use indentation, threading lines, or similar visual hierarchy to show the reply structure clearly.

### 3.2 Comment Ordering Options

**WHEN** displaying comments on a post, **THE** system **SHALL** display them in the member's selected sort order (see Section 8 for sort options).

**WHEN** displaying nested replies within a comment thread, **THE** system **SHALL** apply the same sort order to replies as configured by the member or post default.

**WHEN** displaying a comment thread for the first time to a new visitor, **THE** system **SHALL** apply default sort order of "best" (highest voted first).

### 3.3 Indentation & Visual Hierarchy

**WHEN** displaying nested replies, **THE** system **SHALL** increase visual indentation with each nesting level to clearly show reply depth.

**WHEN** a comment reaches deep nesting levels (8+ levels), **THE** system **MAY** reduce visual indentation or collapse threads to prevent excessive horizontal scrolling.

**WHEN** displaying replies to replies, **THE** system **SHALL** maintain clear visual connection between parent and child comments.

### 3.4 Collapsed & Expanded States

**WHEN** a member collapses a comment thread to hide nested replies, **THE** system **SHALL** store this preference and maintain the collapsed state as the member navigates within that post.

**WHEN** a member expands a collapsed thread, **THE** system **SHALL** load and display all nested replies immediately.

**THE** system **MAY** automatically collapse comment threads with very low engagement or low vote scores to reduce initial page content.

### 3.5 Performance Considerations

**WHEN** a post has more than 50 top-level comments, **THE** system **SHALL** use pagination or lazy loading to avoid displaying all comments simultaneously.

**WHEN** a member scrolls to load additional comment pages, **THE** system **SHALL** load the next batch of comments in the sorted order.

**WHEN** displaying a nested comment thread with 100+ replies, **THE** system **MAY** apply pagination within the nested thread as well.

---

## 4. Comment Lifecycle Management

### 4.1 Comment Editing Capabilities

**WHEN** a member views their own comment, **THE** system **SHALL** display an edit button or similar control allowing them to modify the comment.

**WHEN** a member clicks the edit button on their own comment, **THE** system **SHALL** open an edit mode allowing them to modify the comment text.

**THE** member's editing window extends for 24 hours after the comment was originally posted.

**WHEN** a member attempts to edit a comment posted more than 24 hours ago, **THE** system **SHALL** deny the edit request and display message "Comments can only be edited within 24 hours of posting."

**WHEN** a member successfully edits a comment, **THE** system **SHALL** save the updated text and display an edit indicator (e.g., "edited 5 minutes ago") so other members know the comment was modified.

**WHEN** a member edits a comment, **THE** system **SHALL** preserve the original comment content in audit logs for moderation purposes.

### 4.2 Comment Deletion

**WHEN** a member views their own comment, **THE** system **SHALL** display a delete button or similar control allowing them to remove the comment.

**WHEN** a member clicks the delete button on their own comment, **THE** system **SHALL** prompt for confirmation before deletion.

**WHEN** a member confirms deletion, **THE** system **SHALL** perform soft deletion: mark the comment as deleted but preserve it in storage for audit purposes.

**WHEN** displaying a soft-deleted comment, **THE** system **SHALL** show "[deleted by author]" or similar placeholder instead of the comment content.

**WHEN** a soft-deleted comment has nested replies, **THE** system **SHALL** preserve the replies but make clear that the parent comment was deleted.

**WHEN** a community moderator or platform admin removes a comment for violating rules, **THE** system **SHALL** perform soft deletion and may display "[removed by moderator]" message.

**WHEN** a member views their deleted comment in their own profile history, **THE** system **MAY** show the original content with deletion status.

### 4.3 Comment Visibility Changes

**IF** a comment's parent post is deleted, **THEN** **THE** system **SHALL** preserve the comment but mark it as orphaned and prevent access from the post view.

**IF** a comment's parent post is archived by the system, **THEN** **THE** system **SHALL** make the comment read-only and prevent new replies to it.

**WHEN** a community is deleted or made private, **THE** system **SHALL** apply appropriate visibility restrictions to all comments within that community.

### 4.4 User Notification on Changes

**WHEN** a member's comment receives a reply, **THE** system **SHALL** create a notification for that member.

**WHEN** a member's comment is edited by another member (if allowed by system design), **THE** system **MAY** notify followers or commenters in the thread.

**WHEN** a moderator removes a member's comment, **THE** system **SHALL** notify the member with the removal reason if available.

---

## 5. Voting Mechanics for Comments

### 5.1 Upvote Functionality

**WHEN** a member views a comment posted by another member, **THE** system **SHALL** display an upvote button or control.

**WHEN** a member clicks the upvote button on a comment, **THE** system **SHALL** record their upvote if they haven't already voted on that comment.

**WHEN** a member upvotes a comment, **THE** system **SHALL** increment the comment's score by 1 point.

**WHEN** a member upvotes a comment, **THE** system **SHALL** award 1 karma point to the comment author's account.

**THE** member cannot upvote their own comments.

**WHEN** a member attempts to upvote their own comment, **THE** system **SHALL** reject the vote and display message "You cannot vote on your own comments."

**WHEN** a member upvotes a comment, **THE** system **SHALL** create a record of that vote linked to the member's account for later use (e.g., vote history, preventing duplicate votes).

### 5.2 Downvote Functionality

**WHEN** a member views a comment posted by another member, **THE** system **SHALL** display a downvote button or control.

**WHEN** a member clicks the downvote button on a comment, **THE** system **SHALL** record their downvote if they haven't already voted on that comment.

**WHEN** a member downvotes a comment, **THE** system **SHALL** decrement the comment's score by 1 point.

**WHEN** a member downvotes a comment, **THE** system **SHALL** decrement 1 karma point from the comment author's account (comment author loses karma).

**THE** member cannot downvote their own comments.

**WHEN** a member attempts to downvote their own comment, **THE** system **SHALL** reject the vote and display message "You cannot vote on your own comments."

**WHEN** a member downvotes a comment, **THE** system **SHALL** create a record of that downvote linked to the member's account.

### 5.3 Vote State Management

**WHEN** a member has already upvoted a comment and clicks the upvote button again, **THE** system **SHALL** interpret this as a vote reversal, removing their upvote.

**WHEN** a member removes an upvote, **THE** system **SHALL** decrement the comment's score by 1 point and deduct 1 karma from the author.

**WHEN** a member has already downvoted a comment and clicks the downvote button again, **THE** system **SHALL** interpret this as a vote reversal, removing their downvote.

**WHEN** a member removes a downvote, **THE** system **SHALL** increment the comment's score by 1 point and restore 1 karma to the author.

**WHEN** a member has upvoted a comment and then clicks the downvote button, **THE** system **SHALL** change their vote from upvote to downvote, adjusting the score and karma by 2 points (removing +1 upvote and adding -1 downvote).

**WHEN** a member has downvoted a comment and then clicks the upvote button, **THE** system **SHALL** change their vote from downvote to upvote, adjusting the score and karma by 2 points (removing -1 downvote and adding +1 upvote).

**WHEN** a comment is edited after receiving votes, **THE** system **SHALL** NOT reset vote counts or allow revoting.

### 5.4 Vote Count Calculations

**THE** system **SHALL** calculate each comment's total score as the number of upvotes minus the number of downvotes.

**THE** system **SHALL** update comment scores in real-time as votes are cast and removed.

**IF** a comment receives many downvotes and its score becomes very negative (below -10), **THEN** **THE** system **MAY** automatically collapse the comment to reduce visibility of low-quality content.

**WHEN** calculating karma for a user from comment votes, **THE** system **SHALL** sum all karma gained from upvotes and all karma lost from downvotes on that user's comments.

---

## 6. Vote Display & Updates

### 6.1 Vote Count Visibility

**WHEN** a member views a comment, **THE** system **SHALL** display the current vote score (upvotes minus downvotes) prominently near the voting controls.

**THE** vote score **SHALL** be displayed as a single number (e.g., "+42" for 42 net upvotes or "-3" for 3 net downvotes).

**WHEN** a member hovers over or clicks on the vote score, **THE** system **MAY** display a tooltip or popup showing separate upvote and downvote counts if this information should be public.

**WHEN** a comment's score is 0, **THE** system **SHALL** display "0" or a neutral indicator.

**WHEN** a newly posted comment has not yet received any votes, **THE** system **SHALL** display the score as "0."

### 6.2 Real-Time Vote Updates

**WHEN** a member casts a vote on a comment, **THE** system **SHALL** update the vote score display immediately on their screen.

**WHEN** OTHER members viewing the same comment receive new votes, **THE** system **SHALL** push the updated score to their screens in real-time or refresh it when they next interact with the page.

**IF** the system experiences high load and cannot update scores in real-time, **THEN** **THE** system **SHALL** update scores within 5 seconds.

### 6.3 Vote History & Transparency

**WHEN** a member views their own profile, **THE** system **MAY** display a history of comments they've voted on (optional feature).

**WHEN** a member views their own profile's vote history, **THE** system **SHALL** show which comments they've voted on and whether they upvoted or downvoted.

**THE** voting history of members **SHALL** be private and not visible to other users.

**WHEN** a moderator reviews a reported comment, **THE** system **MAY** show the moderator the vote history and distribution to help assess comment quality.

### 6.4 User's Own Vote State Display

**WHEN** a member has upvoted a comment, **THE** system **SHALL** highlight or visually distinguish the upvote button to show they've voted.

**WHEN** a member has downvoted a comment, **THE** system **SHALL** highlight or visually distinguish the downvote button to show they've voted.

**WHEN** a member has not voted on a comment, **THE** system **SHALL** display both upvote and downvote buttons in their neutral state without highlighting.

**WHEN** a member's vote state changes (e.g., they remove an upvote), **THE** system **SHALL** immediately update the button highlighting to reflect the new state.

---

## 7. Comment Sorting Options

### 7.1 Available Sort Orders

**THE** system **SHALL** provide members with the following sort options for comments on a post:

1. **Best** (default): Comments sorted by score quality algorithm considering votes, recency, and engagement
2. **Top**: Comments sorted by highest vote score first, descending
3. **Newest**: Comments sorted by creation time, newest first
4. **Oldest**: Comments sorted by creation time, oldest first
5. **Most Replies**: Comments sorted by number of nested replies, most active threads first

### 7.2 Sort Application

**WHEN** a member views a post for the first time, **THE** system **SHALL** display comments in the "Best" sort order by default.

**WHEN** a member changes the sort order from the default, **THE** system **SHALL** immediately re-sort and re-display all comments in the new order.

**WHEN** a member applies a sort order, **THE** system **SHALL** remember their preference within that post's comment section for their entire session.

**THE** member's sort preference **MAY** be persisted to their account and applied by default across all posts they visit (optional feature).

### 7.3 Nested Reply Sorting

**WHEN** displaying nested replies within a parent comment, **THE** system **SHALL** apply the same sort order to nested replies as selected for top-level comments.

**WHEN** a member changes the sort order, nested replies **SHALL** also be re-sorted according to the new order.

**IF** a nested reply thread has a different sort order than the parent, **THEN** replies **SHALL** still respect the user's current sort selection.

### 7.4 "Best" Algorithm Details

**THE** "Best" sort algorithm **SHALL** consider:
- Comment score (upvotes minus downvotes)
- Comment creation time (more recent comments weighted slightly higher for equal scores)
- Number of replies to the comment (higher engagement weighted as higher quality)
- Comment length (moderate length weighted higher than very short or very long comments)

**WHEN** calculating the "Best" sort order, **THE** system **SHALL** use a scoring formula that balances these factors to promote high-quality, engaging comments while preventing old comments from being permanently buried.

**WHEN** a comment is very new (less than 1 hour old), **THE** system **SHALL** apply a small recency bonus to the score calculation so new comments can gain visibility.

### 7.5 User Preference Persistence

**WHEN** a member selects a sort order for a post's comments, **THE** system **SHALL** remember this choice within that browsing session.

**WHEN** the member navigates away from the post and returns, **THE** system **MAY** reset to the default sort order or restore their previous selection (implementation choice).

**WHEN** a member is logged in, **THE** system **MAY** store their most commonly used sort preference in their account settings and apply it by default.

---

## 8. Engagement Metrics & Analytics

### 8.1 Reply Count Tracking

**THE** system **SHALL** track the total number of direct replies to each comment.

**WHEN** a member creates a new reply to a comment, **THE** system **SHALL** increment the comment's reply count by 1.

**WHEN** a reply to a comment is deleted, **THE** system **SHALL** decrement the comment's reply count by 1.

**WHEN** displaying a comment, **THE** system **SHALL** show the reply count in a clear manner (e.g., "4 replies").

**WHEN** a comment has zero replies, **THE** system **MAY** display nothing or show "0 replies" depending on design choice.

### 8.2 Vote Count Aggregation

**THE** system **SHALL** aggregate vote counts for each comment and update them in real-time as new votes are cast.

**WHEN** calculating overall engagement metrics for a post, **THE** system **SHALL** sum the total votes across all comments on that post.

**WHEN** calculating overall engagement metrics for a member, **THE** system **SHALL** sum votes received on all of their comments.

### 8.3 Comment Visibility Impact

**WHEN** a comment receives a very high vote score (over +100 votes), **THE** system **MAY** promote it visually or highlight it as a top comment.

**WHEN** a comment receives a very low vote score (below -10 votes), **THE** system **MAY** collapse or hide it to reduce visibility of low-quality content.

**WHEN** a comment is collapsed due to low score, **THE** system **SHALL** still allow members to expand it if they choose.

---

## 9. Error Handling & Edge Cases

### 9.1 Validation Errors

**WHEN** a member submits a comment and validation fails, **THE** system **SHALL** display the specific validation error that occurred.

**WHEN** displaying validation errors, **THE** system **SHALL** preserve the comment text so the member can edit and resubmit without losing their work.

**WHEN** multiple validation errors occur (e.g., empty AND over character limit), **THE** system **SHALL** display all errors so the member can fix them together.

### 9.2 Concurrency Handling

**WHEN** multiple members vote on the same comment simultaneously, **THE** system **SHALL** ensure votes are counted correctly without data loss.

**WHEN** multiple members post replies to the same comment simultaneously, **THE** system **SHALL** ensure both replies are created with correct parent relationships.

**WHEN** a member attempts to vote on a comment that was just deleted, **THE** system **SHALL** return error "This comment is no longer available."

### 9.3 Permission Denial Scenarios

**WHEN** a member attempts to edit another member's comment, **THE** system **SHALL** deny the request and display message "You can only edit your own comments."

**WHEN** a member attempts to delete another member's comment, **THE** system **SHALL** deny the request and display message "You can only delete your own comments."

**WHEN** a member with low karma attempts to comment in a restricted community, **THE** system **SHALL** deny the comment posting and display the minimum karma requirement.

### 9.4 Network Failure Recovery

**WHEN** a member posts a comment but the network connection fails before receiving confirmation, **THE** system **MAY** save the draft locally and prompt to retry.

**WHEN** a member attempts to vote on a comment and the network fails, **THE** system **SHALL** display error "Vote failed. Please try again." and allow retry.

**WHEN** connection is restored after a failed vote attempt, **THE** system **MAY** attempt to automatically retry the vote if the member permits.

### 9.5 Rate Limiting

**WHEN** a member posts comments at an unusually high rate (more than 1 comment per 5 seconds), **THE** system **MAY** apply rate limiting.

**IF** a member exceeds rate limits, **THEN** **THE** system **SHALL** deny the next comment and display message "You're commenting too quickly. Please wait before posting again."

**WHEN** a member's account is brand new (less than 1 day old), **THE** system **SHALL** apply stricter rate limits to prevent spam and abuse.

---

## 10. Summary of EARS-Formatted Requirements

### Comment Creation
- **UBIQUITOUS**: THE commenting system **SHALL** validate all comments to ensure they meet content standards (1-5,000 characters).
- **EVENT**: WHEN a member submits a comment, THE system **SHALL** timestamp it and associate it with the author's account.
- **EVENT**: WHEN a non-authenticated guest attempts to comment, THE system **SHALL** deny access and show login prompt.
- **CONDITIONAL**: WHERE a member's account is less than 1 day old, THE system **SHALL** limit comments to 10 per hour.

### Nested Replies
- **UBIQUITOUS**: THE system **SHALL** support unlimited nesting depth for comment replies.
- **EVENT**: WHEN a member replies to a specific comment, THE system **SHALL** create a parent-child relationship.
- **EVENT**: WHEN a parent comment is deleted, THE system **SHALL** preserve child replies with deletion indicator.

### Voting
- **UBIQUITOUS**: THE member cannot vote on their own comments.
- **EVENT**: WHEN a member upvotes a comment, THE system **SHALL** increment the score by 1 and award 1 karma to the author.
- **EVENT**: WHEN a member downvotes a comment, THE system **SHALL** decrement the score by 1 and subtract 1 karma from the author.
- **EVENT**: WHEN a member votes a second time on the same comment, THE system **SHALL** reverse their previous vote.
- **STATE**: WHILE viewing a comment with their vote active, THE system **SHALL** highlight the vote button.

### Editing & Deletion
- **TEMPORAL**: WHILE within 24 hours of posting, THE member **SHALL** be able to edit their comment.
- **EVENT**: WHEN a member deletes a comment, THE system **SHALL** perform soft deletion and show "[deleted by author]."
- **STATE**: WHILE a comment is soft-deleted, THE system **SHALL** preserve it for audit purposes.

### Sorting & Display
- **UBIQUITOUS**: THE system **SHALL** display comments in one of five sort orders: Best, Top, Newest, Oldest, or Most Replies.
- **UBIQUITOUS**: THE system **SHALL** apply the selected sort order to both top-level comments and nested replies.
- **DEFAULT**: WHERE no sort order is specified, THE system **SHALL** default to "Best" sort.

### Engagement
- **UBIQUITOUS**: THE system **SHALL** track vote counts and reply counts for every comment.
- **CONDITIONAL**: WHERE a comment's score falls below -10, THE system **MAY** automatically collapse it.
- **CONDITIONAL**: WHERE a comment's score exceeds +100, THE system **MAY** highlight it as a top comment.

---

## 11. Definitions & Terminology

- **Comment**: A text message posted by a member in response to a post or another comment
- **Top-level comment**: A comment posted directly to a post with no parent comment
- **Nested reply**: A comment posted as a reply to another comment
- **Thread**: A hierarchical tree of comments and replies rooted at a post
- **Parent comment**: The comment that a nested reply is replying to
- **Score**: The net count of upvotes minus downvotes on a comment
- **Soft deletion**: Marking content as deleted while preserving it in storage for audit purposes
- **Karma**: Reputation points awarded/deducted based on community votes on a user's posts and comments
- **Vote reversal**: Removing a previous vote by clicking the same vote button again
- **Edit window**: The 24-hour period after posting during which a member can edit their comment
- **Sort order**: The method by which comments are arranged for display (Best, Top, Newest, Oldest, Most Replies)

---

## 12. Implementation Notes for Developers

### Key Considerations

1. **Concurrency**: Comment voting and posting must handle concurrent requests correctly without lost updates

2. **Performance**: Deep comment threads and high-volume voting require efficient database queries and caching strategies

3. **Real-time Updates**: Vote count changes should be visible to all viewing members quickly (preferably real-time)

4. **Data Preservation**: Soft deletion ensures comment history is preserved for audit and moderation purposes

5. **Spam Prevention**: Rate limiting on new accounts and comment frequency prevents abuse

6. **User Experience**: Smart defaults (Best sort, pagination) ensure readable comment sections even on high-engagement posts

7. **Karma Integration**: Comment voting directly impacts user karma, which affects system-wide privileges and restrictions

---

*Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, caching strategy, real-time mechanisms, etc.) are at the discretion of the development team. This document describes WHAT the comment system should do from a business perspective, not HOW to build it technically.*
