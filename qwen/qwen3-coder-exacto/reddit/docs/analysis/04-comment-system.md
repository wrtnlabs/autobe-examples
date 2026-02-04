# Comment System Requirements

## 1. Comment Creation

WHEN a user is authenticated and viewing a post, THE system SHALL allow them to create a new comment with text content.

WHEN a user submits a comment with empty text content, THE system SHALL reject the submission and display an error message indicating that comment text is required.

WHEN a user attempts to create a comment on a post while not authenticated, THE system SHALL deny access and prompt the user to log in.

WHEN a user successfully creates a comment, THE system SHALL immediately display the comment in the appropriate position within the post's comment thread with the author's username, timestamp, and initial vote score of 0.

## 2. Comment Structure and Nesting

THE system SHALL support nested comments with unlimited depth, allowing users to reply to any existing comment.

THE system SHALL organize comments in a hierarchical tree structure where each comment can have multiple child comments.

WHEN a user replies to a comment, THE system SHALL create a new comment as a child of the comment being replied to.

WHEN displaying nested comments, THE system SHALL visually distinguish different nesting levels to improve readability.

THE system SHALL maintain the relationship between parent and child comments even when comments are deleted, marking deleted parent comments as "[deleted]" while preserving their child comments.

WHEN a parent comment is deleted, THE system SHALL continue to display its child comments with appropriate indentation to maintain conversation context.

## 3. Comment Display

WHEN displaying a comment, THE system SHALL show the following information:

- Author's username
- Comment content text
- Timestamp indicating when the comment was posted
- Current vote score (total upvotes minus downvotes)
- Reply functionality
- Edit and delete options (for the comment author)
- Visual indication of nesting level within the comment thread

WHEN a user views a post detail page, THE system SHALL load comments in batches of 20 to optimize performance with pagination controls for additional comments.

WHEN displaying comments with deeply nested structures, THE system SHALL provide "collapse/expand" functionality to improve readability.

## 4. Comment Editing and Deletion

WHEN the author of a comment accesses their comment, THE system SHALL provide options to edit or delete the comment.

WHEN a user edits their comment, THE system SHALL preserve the original posting timestamp but indicate that the comment has been edited.

WHEN a user attempts to edit a comment they did not author, THE system SHALL deny access and display an appropriate error message.

WHEN a user deletes their comment, THE system SHALL mark the comment as deleted but preserve it to maintain conversation context, displaying "[deleted]" as the content.

WHEN a user deletes a comment that has replies, THE system SHALL preserve the deleted comment as a placeholder to maintain thread structure.

WHEN a user attempts to delete a comment they did not author, THE system SHALL deny access and display an appropriate error message.

## 5. Comment Voting System

WHEN an authenticated user views a comment, THE system SHALL display upvote and downvote options.

WHEN a user upvotes a comment, THE system SHALL increase the comment's vote score by 1 and increase the comment author's karma score by 1.

WHEN a user downvotes a comment, THE system SHALL decrease the comment's vote score by 1 and decrease the comment author's karma score by 1.

WHEN a user changes their vote from upvote to downvote, THE system SHALL decrease the comment's vote score by 2 and adjust the comment author's karma score accordingly (decrease by 2).

WHEN a user removes their vote entirely, THE system SHALL adjust the comment's vote score and the author's karma score to reflect the removal of the original vote.

WHEN a user attempts to vote on their own comment, THE system SHALL prevent self-voting and display a message indicating that users cannot vote on their own content.

WHEN a user attempts to vote on a comment while not authenticated, THE system SHALL prompt them to log in before allowing the vote.

WHEN a user votes on a comment, THE system SHALL update the vote score immediately without requiring a page refresh.

## 6. Comment Sorting

THE system SHALL provide sorting options for comments on a post, including:

- Best: Comments sorted by highest vote score first
- New: Comments sorted by most recently posted first
- Controversial: Comments with many votes but score close to zero, sorted first

WHEN a user accesses a post, THE system SHALL default to displaying comments sorted by "Best" unless the user has selected a different sorting preference.

WHEN a user changes the comment sorting method, THE system SHALL reorganize all displayed comments according to the selected sorting algorithm without requiring a full page reload.

WHEN displaying comments sorted by "Best", THE system SHALL prioritize comments with higher positive vote scores.

WHEN displaying comments sorted by "Controversial", THE system SHALL prioritize comments with a high number of total votes but with vote scores close to zero (indicating roughly equal upvotes and downvotes).