## User Registration and Authentication

### Registration Process

WHEN a guest attempts to create a new account, THE system SHALL provide a registration form requiring email address and password creation.

IF the email address is already in use, THEN THE system SHALL display an error message indicating that the email is already registered.

IF the password is less than 8 characters, THEN THE system SHALL display an error message requiring a minimum of 8 characters.

IF the password contains fewer than 3 of the following: uppercase letters, lowercase letters, numbers, or special characters, THEN THE system SHALL display an error message requiring greater password complexity.

IF the registration form is submitted with valid data, THEN THE system SHALL create a new user account with a pending status.

WHEN a new account is created, THE system SHALL send a verification email to the provided address containing a unique confirmation link.

### Account Verification

WHEN a user clicks the verification link in the email, THE system SHALL validate the confirmation token.

IF the confirmation token is valid and not expired, THEN THE system SHALL update the user account status to 'verified' and log the user in automatically.

IF the confirmation token is invalid or expired, THEN THE system SHALL display a message indicating the token is no longer valid and prompt the user to request a new verification email.

### Login Process

WHEN a user attempts to log in with valid credentials, THE system SHALL authenticate the account by verifying the email and password against the stored credentials.

IF the credentials are valid, THEN THE system SHALL generate a JSON Web Token (JWT) and set an HTTP-only secure cookie containing the token.

IF the user selects 'Remember me', THEN THE system SHALL set the JWT cookie to expire in 30 days.

IF the user does not select 'Remember me', THEN THE system SHALL set the JWT cookie to expire in 15 minutes.

WHEN a login attempt fails due to incorrect credentials, THEN THE system SHALL display an error message stating 'Invalid email or password' and increment a failed login counter.

IF the failed login counter exceeds 5 attempts within 10 minutes, THEN THE system SHALL temporarily lock the account for 15 minutes.

### Session Management

WHEN a user is authenticated, THE system SHALL maintain their session by verifying the JWT on each subsequent request.

IF the JWT is missing or invalid, THEN THE system SHALL return HTTP 401 Unauthorized response.

WHEN a user requests to log out, THE system SHALL invalidate the current session by removing the authentication token from the server-side session store.

### Password Reset

WHEN a user requests a password reset, THE system SHALL verify the email address exists in the system.

IF the email address exists, THEN THE system SHALL generate a password reset token and send it to the user's email address with a link to reset their password.

IF the email address does not exist, THEN THE system SHALL return a success message indicating that an email has been sent (to prevent email enumeration).

WHEN a user accesses the password reset link, THE system SHALL verify the reset token.

IF the token is valid and not expired, THEN THE system SHALL display a password reset form where the user can create a new password.

IF the token is invalid or expired, THEN THE system SHALL display a message indicating the link is no longer valid and prompt the user to request a new reset link.

## Thread Creation and Management

### Thread Creation Process

WHEN a member attempts to create a new thread, THE system SHALL display a form with the following fields: thread title, content, and category selection.

IF the thread title is empty, THEN THE system SHALL display an error message requiring a title.

IF the thread title is longer than 200 characters, THEN THE system SHALL display an error message requiring a shorter title.

IF the thread content is empty, THEN THE system SHALL display an error message requiring content.

IF the category is not selected, THEN THE system SHALL display an error message requiring a category selection.

IF the thread creation form is submitted with valid data, THEN THE system SHALL create a new thread with the following properties:

- The thread's author is set to the current user
- The thread status is set to 'active'
- The created timestamp is set to the current time
- The thread is assigned to the selected category
- The thread is initially visible to all members
- The thread receives a default score of 0

WHEN a new thread is created, THE system SHALL send a notification to the moderators indicating that a new thread requires review.

### Thread Visibility and Approval

WHEN a new thread is submitted by a member, THE system SHALL set its status to 'pending_review' until approved by a moderator.

IF a thread is submitted without proper category selection, THEN THE system SHALL automatically assign it to a default category and flag it for review.

WHEN a moderator reviews a pending thread, THE system SHALL allow two options: approve or reject.

IF the thread is approved, THEN THE system SHALL change its status to 'active' and make it visible to all members.

IF the thread is rejected, THEN THE system SHALL change its status to 'rejected', provide a rejection reason to the author, and send a notification to the author.

### Thread Editing

WHEN a member attempts to edit their own thread, THE system SHALL verify they are the original author.

IF the user is the author, THEN THE system SHALL allow editing of the thread title and content.

IF the user is not the author, THEN THE system SHALL deny access and display a message stating 'You are not authorized to edit this thread'.

IF a thread was previously approved and is being edited, THEN THE system SHALL create a version history record showing the changes made.

IF a thread is being edited within 24 hours of creation, THEN THE system SHALL allow unlimited edits.

IF a thread is being edited more than 24 hours after creation, THEN THE system SHALL limit edits to the thread title only.

### Thread Deletion

WHEN a member attempts to delete their own thread, THE system SHALL verify they are the original author.

IF the user is the author, THEN THE system SHALL set the thread status to 'deleted' and remove it from public view.

IF the thread has received any replies, THEN THE system SHALL prevent deletion and display a message stating 'Threads with replies cannot be deleted'.

WHEN a thread is deleted, THE system SHALL send a notification to the moderators informing them of the deletion.

### Thread Display

THE system SHALL display all threads in a chronological order, with newest threads first.

THE system SHALL paginate results in pages of 20 threads.

THE system SHALL display the thread title, creation date, author, category, and current upvote/downvote score.

THE system SHALL display a count of replies for each thread, but not the actual replies.

## Post and Reply Operations

### Posting Content

WHEN a member attempts to post a reply to a thread, THE system SHALL display a form with content input field.

IF the reply content is empty, THEN THE system SHALL display an error message requiring content.

IF the reply content is longer than 2000 characters, THEN THE system SHALL display an error message requiring shorter content.

IF the reply is submitted with valid data, THEN THE system SHALL create a new post with the following properties:

- The post author is set to the current user
- The post status is set to 'active'
- The created timestamp is set to the current time
- The post is assigned to the parent thread
- The post is initially visible to all members

WHEN a new post is created, THE system SHALL update the parent thread's reply count and last activity timestamp.

### Post Editing

WHEN a member attempts to edit their own post, THE system SHALL verify they are the original author.

IF the user is the author, THEN THE system SHALL allow editing of the post content.

IF the user is not the author, THEN THE system SHALL deny access and display a message stating 'You are not authorized to edit this post'.

IF a post is being edited within 24 hours of creation, THEN THE system SHALL allow unlimited edits.

IF a post is being edited more than 24 hours after creation, THEN THE system SHALL limit edits to the content only.

IF a post is edited, THEN THE system SHALL create a version history record showing the changes made and timestamp of the edit.

### Post Deletion

WHEN a member attempts to delete their own post, THE system SHALL verify they are the original author.

IF the user is the author, THEN THE system SHALL set the post status to 'deleted' and remove it from public view.

IF the post is the first reply in a thread, THEN THE system SHALL prevent deletion and display a message stating 'The first reply cannot be deleted'.

WHEN a post is deleted, THE system SHALL update the parent thread's reply count and last activity timestamp.

### Nested Replies

WHEN a member replies to an existing post, THE system SHALL create a new post as a child of the parent post.

THE system SHALL allow up to 5 levels of nesting for replies.

THE system SHALL display replies with appropriate indentation to indicate their nesting level.

THE system SHALL display a 'reply' button for each post to allow users to continue the conversation.

## Upvoting and Downvoting System

### Voting Process

WHEN a member attempts to upvote a post, THE system SHALL verify they have not already voted on the same post.

IF the member has not voted, THEN THE system SHALL increment the post's upvote count and update their vote record.

IF the member has already upvoted, THEN THE system SHALL remove their upvote and decrement the upvote count.

WHEN a member attempts to downvote a post, THE system SHALL verify they have not already voted on the same post.

IF the member has not voted, THEN THE system SHALL increment the post's downvote count and update their vote record.

IF the member has already downvoted, THEN THE system SHALL remove their downvote and decrement the downvote count.

### Vote Visibility

THE system SHALL display the net score of each post, calculated as (upvotes - downvotes).

THE system SHALL display the number of upvotes and downvotes separately.

THE system SHALL show which vote type (upvote or downvote) the current user has cast on a post, if applicable.

### Voting Limits

THE system SHALL allow each member to vote on a post only once (upvote or downvote).

THE system SHALL not allow members to vote on their own posts.

THE system SHALL allow members to change their vote at any time.

### Score Calculation

THE system SHALL calculate the post score as (total_upvotes - total_downvotes).

THE system SHALL display the score in real-time as users interact with the voting buttons.

THE system SHALL update the score calculation when votes are added, removed, or changed.

### Voting User Interface

THE system SHALL display upvote and downvote buttons as large, clearly visible icons next to each post.

THE system SHALL change the button color when a user has cast a vote on a post (e.g., blue for upvote, red for downvote).

THE system SHALL show the vote count next to each button.

THE system SHALL animate the vote count change when a user votes.

## Reporting Inappropriate Content

### Reporting Process

WHEN a member identifies a post or reply that violates community guidelines, THE system SHALL display a 'Report' button below the post.

WHEN a member clicks the report button, THE system SHALL display a form with the following options: report reason, additional comments, and authorization confirmation.

IF the user has not authenticated, THEN THE system SHALL prompt them to log in before submitting a report.

IF the user is authenticated but has a history of false reports, THEN THE system SHALL require additional verification before submitting the report.

IF the report form is submitted with valid data, THEN THE system SHALL create a new report with the following properties:

- The report creator is set to the current user
- The report target is the post or thread being reported
- The report reason is the selected category
- The report status is set to 'pending review'
- The created timestamp is set to the current time

WHEN a report is submitted, THE system SHALL send an immediate notification to the moderators.

### Moderation of Reports

WHEN a moderator receives a report, THE system SHALL display it in their moderation dashboard with the full details.

IF the moderator determines the content is appropriate, THEN THE system SHALL mark the report as 'resolved' and close it.

IF the moderator determines the content violates community guidelines, THEN THE system SHALL take one or more actions based on severity:

- For minor violations: Remove the post and send a warning message to the author
- For moderate violations: Remove the post and suspend the author's ability to post for 7 days
- For severe violations: Remove the post, ban the author from the system permanently, and notify all moderators

WHEN a report is resolved, THE system SHALL send a notification to the reporting user indicating the outcome.

### Report Statistics

THE system SHALL maintain a report statistics dashboard accessible only to administrators.

THE system SHALL track the following metrics:
- Total reports received
- Reports resolved by moderator
- Reports pending review
- False report rate (reports that were incorrect)
- Most common report reasons

THE system SHALL generate monthly report summaries and send them to moderation team leads.

## Search and Discovery Features

### Search Functionality

WHEN a member enters search terms in the search bar, THE system SHALL query the system's searchable index.

THE system SHALL search across all thread titles, thread content, and post content.

THE system SHALL return results in order of relevance, which is determined by:

- Keyword frequency in content
- Content recency (newer content ranks higher)
- Number of upvotes (more upvoted content ranks higher)
- Thread popularity (more replies ranks higher)

THE system SHALL display search results in pages of 15 items.

THE system SHALL display the thread title, first few lines of content, author, creation date, and upvote/downvote score for each result.

### Search Filters

WHEN a user accesses the search interface, THE system SHALL provide filter options including:

- Category filters (select one or more categories)
- Date range filters (latest 24 hours, past 7 days, past 30 days, all time)
- Author filters (search by username)
- Sorting options (relevance, date posted, upvote score, reply count)

IF a user applies filters, THEN THE system SHALL update the search results to reflect the filtered criteria.

### Discovery Features

THE system SHALL display a 'Trending' section showing threads that are currently receiving high engagement.

THE trending section shall be based on:
- Rapid increase in upvotes
- High number of replies in a short time
- High view count for recent threads

THE system SHALL refresh the trending list every 15 minutes.

THE system SHALL display a 'Recently Active' section showing threads with recent activity.

THE recently active section shall be based on:
- Most recent reply within the last 24 hours
- Most recent upvotes within the last 12 hours
- Most recent edits within the last 6 hours

THE system SHALL update the recently active list every 10 minutes.

## Content Moderation Functions

### Moderator Dashboard

WHEN a moderator accesses the moderation interface, THE system SHALL display a dashboard with:

- A list of pending review items (new threads and reported content)
- A summary of current moderation tasks
- A statistics panel showing report volume and resolution rate
- A quick actions panel for common moderation tasks

### Review Workflow

WHEN a moderator reviews a pending thread, THE system SHALL display:

- Thread title and content
- Category and author information
- Any draft status or previous rejection notes
- A decision panel with 'Approve', 'Reject', and 'Request Changes' options

IF the moderator selects 'Approve', THEN THE system SHALL change the thread status to 'active' and publish it.

IF the moderator selects 'Reject', THEN THE system SHALL change the thread status to 'rejected' and display a rejection reason field.

IF the moderator selects 'Request Changes', THEN THE system SHALL change the thread status to 'needs_revision' and send a message to the author with feedback.

### Report Review Process

WHEN a moderator accesses a report, THE system SHALL display:

- The content being reported
- The report reason and comments
- The reporting user's information (username only)
- The post's upvote/downvote count
- The author's account status

IF the moderator has sufficient evidence, THEN THEY SHALL take appropriate action based on severity.

IF the moderator needs more information, THEN THEY SHALL send a message to the reporting user requesting clarification.

### Moderation Actions

THE system SHALL log all moderator actions in a permanent audit trail with:

- Timestamp of the action
- Moderator username
- Action type (approve/reject/censor/delete)
- Target content (thread/post ID)
- Reason for the action
- Any additional comments

THE system SHALL send notifications to:
- The author when their content is removed or modified
- The reporting user when a report is resolved
- All moderators when a severe violation is detected

## User Profile Management

### Profile Views

WHEN a member views another user's profile, THE system SHALL display:

- Username and profile picture (if available)
- Account creation date
- Total upvotes received
- Total downvotes received
- Total posts created
- Total replies posted
- Badge system status (if applicable)
- Most popular topic categories

THE system SHALL display this information in a clean, organized layout.

### Profile Edits

WHEN a member accesses their own profile, THE system SHALL display an 'Edit Profile' button.

IF the member clicks 'Edit Profile', THEN THE system SHALL display a form with:

- Username (read-only unless specified)
- Profile picture upload
- Bio text (max 500 characters)
- Website URL (optional)
- Location (optional)
- Interests (select one or more from predefined list)

IF the profile edit form is submitted with valid data, THEN THE system SHALL update the user's profile information.

IF the bio text is longer than 500 characters, THEN THE system SHALL display an error message requiring shorter text.

IF the profile picture is not in a supported format (PNG, JPEG, GIF), THEN THE system SHALL display an error message requiring a valid image format.

IF the profile picture is too large (over 5MB), THEN THE system SHALL display an error message requiring a smaller file.

### Privacy Settings

THE system SHALL allow users to set their profile visibility preferences:

- Public (visible to all members)
- Private (visible only to friends/followers)
- Hidden (not visible in search results)

IF a user sets their profile to private, THEN THE system SHALL prevent their profile from appearing in search results and discovery features.

IF a user sets their profile to hidden, THEN THE system SHALL hide their profile from all other users except those they have explicitly authorized.

THE system SHALL set the default profile visibility to 'public'.

### Profile Activity

THE system SHALL track and display the following activity timeline for each user:

- When their account was created
- When they last logged in
- When they last edited their profile
- When they posted new content
- When they last voted on content
- When they reported inappropriate content

THE system SHALL refresh this activity stream every 5 minutes.

## Mermaid Diagrams

### User Authentication Flow
```mermaid
graph LR
    A[