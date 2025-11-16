## Functional Requirements

This document defines all functional requirements for the community platform in natural language using EARS format. Every requirement is specific, measurable, and implementation-ready. Technical implementation details are intentionally excluded to preserve developer autonomy.

### Core Authentication

#### Registration
- WHEN a guest attempts to register, THE system SHALL require a valid email address and a password of at least 8 characters.
- WHEN a guest submits a registration request, THE system SHALL send a verification email to the provided email address.
- WHEN a guest clicks the verification link in the email, THE system SHALL activate the account and redirect to the login page.
- IF a guest attempts to register with an email address already in use, THEN THE system SHALL show an error message stating the email is already registered.
- IF a guest submits a registration form with an invalid email format, THEN THE system SHALL show an error message stating the email is not valid.
- IF a guest submits a registration form with a password less than 8 characters, THEN THE system SHALL show an error message stating the password must be at least 8 characters long.
- WHILE a registration email is pending verification, THE system SHALL prevent the user from logging in.

#### Login
- WHEN a member enters valid email and password credentials, THE system SHALL authenticate the user and generate a JSON Web Token (JWT) with a 15-minute expiration.
- WHEN a member attempts to log in with incorrect credentials, THE system SHALL return a 401 Unauthorized error with the message "Invalid email or password."
- WHEN a member attempts to log in with an unverified email address, THE system SHALL display an error message stating "Please verify your email before logging in."
- WHEN a member submits an empty email field during login, THE system SHALL show an error message stating "Email is required."
- WHEN a member submits an empty password field during login, THE system SHALL show an error message stating "Password is required."
- IF a member attempts to log in from a new device, THE system SHALL notify the user via email of the new login attempt.

#### Session Management
- WHILE a member is logged in, THE system SHALL keep the session active for 30 minutes of inactivity.
- WHEN a member clicks "Log out," THE system SHALL immediately invalidate the JWT token and clear session cookies.
- WHEN a JWT token expires, THE system SHALL redirect the user to the login page and require re-authentication.
- WHEN a member changes their password, THE system SHALL invalidate all existing JWT tokens for that user.

#### Password Recovery
- WHEN a user requests a password reset by entering their email address, THE system SHALL send a time-limited reset link valid for 1 hour.
- WHEN a user clicks a valid password reset link, THE system SHALL display a form to enter a new password.
- WHEN a user submits a new password through the reset form, THE system SHALL update the password and redirect to the login page with a success message.
- IF a user submits a new password less than 8 characters during reset, THEN THE system SHALL show an error message stating "Password must be at least 8 characters."
- IF a password reset link is accessed after expiration, THEN THE system SHALL display an error message stating "This reset link has expired. Please request a new one."

### Community Management

#### Community Creation
- WHEN a member clicks "Create Community," THE system SHALL display a form requiring a unique community name and a description.
- WHEN a member submits a community creation request, THE system SHALL create the community and assign the creator as its first moderator.
- IF a member attempts to create a community with a name already in use, THEN THE system SHALL show an error message stating "A community with this name already exists."
- IF a member attempts to create a community with a name containing special characters other than hyphens and underscores, THEN THE system SHALL show an error message stating "Community names may only contain letters, numbers, hyphens, and underscores."
- IF a member attempts to create a community with a name shorter than 3 characters, THEN THE system SHALL show an error message stating "Community name must be at least 3 characters long."
- IF a member attempts to create a community with a description longer than 500 characters, THEN THE system SHALL show an error message stating "Community description cannot exceed 500 characters."
- WHERE a community is created, THE system SHALL automatically assign it a unique identifier in the format "t3_" followed by a base36 number.

#### Community Moderation
- WHEN a moderator removes a post from their community, THE system SHALL hide the post from public view but retain it in the database for potential review.
- WHEN a moderator bans a user from their community, THE system SHALL prevent that user from creating new posts or comments in that community.
- WHEN a moderator edits a community's rules or description, THE system SHALL update the information immediately and notify all subscribers.
- WHEN a moderator attempts to ban a system administrator, THE system SHALL show an error message stating "Administrators cannot be banned from communities."
- WHEN a member reports a post in a community, THE system SHALL notify the community's moderators of the report.
- WHERE a community is marked as "NSFW," THE system SHALL require users to opt-in before viewing its content.

### Post Creation and Management

#### Content Submission
- WHEN a member creates a new post, THE system SHALL require selection of a community to post in.
- WHEN a member creates a text post, THE system SHALL accept up to 10,000 characters of content.
- WHEN a member creates a link post, THE system SHALL validate the URL format and ensure it begins with "http://" or "https://."
- WHEN a member uploads an image post, THE system SHALL accept JPEG, PNG, GIF, and WEBP formats up to 10MB in size.
- WHEN a member submits a post with an invalid URL, THE system SHALL show an error message stating "Please enter a valid URL starting with http:// or https://."
- WHEN a member uploads an image file larger than 10MB, THE system SHALL show an error message stating "Image files cannot exceed 10MB in size."
- WHEN a member uploads a file with an unsupported format, THE system SHALL show an error message stating "Only JPEG, PNG, GIF, and WEBP formats are accepted."
- IF a member attempts to create a post in a community they are banned from, THEN THE system SHALL show an error message stating "You are banned from posting in this community."

#### Post Editing
- WHEN a member edits their own post within 24 hours of creation, THE system SHALL update the post content and preserve the original timestamp with an "edited" indicator.
- WHEN a member edits their post after 24 hours, THE system SHALL still update the content but display a "Last edited" timestamp without the "edited" indicator.
- WHEN a moderator edits any post, THE system SHALL update the content regardless of age and display a "Moderator edited" indicator.
- IF a member attempts to edit a post they did not create, THEN THE system SHALL show an error message stating "You can only edit your own posts."

#### Post Deletion
- WHEN a member deletes their own post, THE system SHALL remove the post from public view but retain it in the database for 7 days.
- WHEN a moderator deletes a post, THE system SHALL permanently remove the post from the database.
- WHEN an administrator deletes a post, THE system SHALL permanently remove the post from the database and log the deletion for audit purposes.
- IF a user attempts to delete a post after it has received 10 or more upvotes, THE system SHALL still allow deletion but show a confirmation warning: "This post has received many upvotes. Are you sure you want to delete it?"
- WHERE a post is deleted by the creator, THE system SHALL anonymize the post content by replacing it with "[Deleted by user]" and set the author field to "[Deleted User]".

### Voting System

#### Post Voting
- WHEN a member upvotes a post, THE system SHALL increment the post's upvote count by 1 and decrement the downvote count by 1 if previously downvoted.
- WHEN a member downvotes a post, THE system SHALL increment the post's downvote count by 1 and decrement the upvote count by 1 if previously upvoted.
- WHEN a member removes their upvote from a post, THE system SHALL decrease the upvote count by 1.
- WHEN a member removes their downvote from a post, THE system SHALL decrease the downvote count by 1.
- IF a member attempts to vote on a post they created, THEN THE system SHALL allow the vote (no self-vote restriction).
- IF a guest attempts to vote on any content, THEN THE system SHALL show an error message stating "You must be logged in to vote."
- WHERE a post is deleted, THE system SHALL erase all associated votes from the database.

#### Comment Voting
- WHEN a member upvotes a comment, THE system SHALL increment the comment's upvote count by 1 and decrement the downvote count by 1 if previously downvoted.
- WHEN a member downvotes a comment, THE system SHALL increment the comment's downvote count by 1 and decrement the upvote count by 1 if previously upvoted.
- WHEN a member removes their upvote from a comment, THE system SHALL decrease the upvote count by 1.
- WHEN a member removes their downvote from a comment, THE system SHALL decrease the downvote count by 1.
- IF a member attempts to vote on their own comment, THE system SHALL allow the vote.
- IF a guest attempts to vote on a comment, THE system SHALL show an error message stating "You must be logged in to vote."
- WHERE a comment is deleted, THE system SHALL erase all associated votes from the database.

### Comment System

#### Comment Creation
- WHEN a member replies to a post, THE system SHALL allow creation of a comment up to 1,000 characters in length.
- WHEN a member replies to a comment, THE system SHALL allow creation of a nested reply up to 1,000 characters in length.
- WHEN a member submits a comment with more than 1,000 characters, THE system SHALL show an error message stating "Comments cannot exceed 1,000 characters."
- WHEN a member submits an empty comment, THE system SHALL show an error message stating "Comments cannot be empty."
- IF a member attempts to comment on a post in a community they are banned from, THEN THE system SHALL show an error message stating "You are banned from commenting in this community."
- IF a post is locked by a moderator, THE system SHALL prevent any new comments from being added.

#### Comment Nesting
- WHEN a member replies to a comment, THE system SHALL create a nested reply at one level deeper than the original comment.
- WHEN a comment has more than 5 nested replies, THE system SHALL automatically collapse the thread after the 5th level and provide a "View more replies" option.
- WHERE a comment is deleted, THE system SHALL remove it from the thread and adjust the nesting structure by promoting its child replies to the same level as the parent.

#### Comment Editing
- WHEN a member edits their own comment within 24 hours of posting, THE system SHALL update the content and add an "edited" indicator.
- WHEN a member edits their comment after 24 hours, THE system SHALL update the content but display a "Last edited" timestamp.
- WHEN a moderator edits any comment, THE system SHALL update the content and display a "Moderator edited" indicator.
- IF a member attempts to edit a comment they did not create, THEN THE system SHALL show an error message stating "You can only edit your own comments."

#### Comment Deletion
- WHEN a member deletes their own comment, THE system SHALL remove it from public view but retain it in the database for 7 days.
- WHEN a moderator deletes a comment, THE system SHALL permanently remove the comment from the database.
- WHEN an administrator deletes a comment, THE system SHALL permanently remove the comment from the database and log the deletion for audit purposes.
- IF a comment has replies, THE system SHALL show a confirmation message: "This comment has replies. Deleting it will remove all nested replies as well. Are you sure?"
- WHERE a comment is deleted by the creator, THE system SHALL replace its content with "[Deleted by user]" and set the author to "[Deleted User]."

### Karma System

#### Karma Calculation
- WHEN a member creates a post that receives an upvote, THE system SHALL increase their post karma by 1.
- WHEN a member creates a post that receives a downvote, THE system SHALL decrease their post karma by 1.
- WHEN a member creates a comment that receives an upvote, THE system SHALL increase their comment karma by 1.
- WHEN a member creates a comment that receives a downvote, THE system SHALL decrease their comment karma by 1.
- WHEN a member deletes their own post, THE system SHALL subtract the net karma gained from that post (upvotes minus downvotes) from their total.
- WHEN a member deletes their own comment, THE system SHALL subtract the net karma gained from that comment (upvotes minus downvotes) from their total.
- WHERE a post or comment is deleted by a moderator or administrator, THE system SHALL leave the creator's karma unchanged.
- WHERE user karma is displayed, THE system SHALL show two separate values: "post karma" and "comment karma."
- IF a user's karma falls below zero, THE system SHALL display a negative number with a minus sign.

### Content Sorting

#### Post Sorting Algorithms
- WHEN displaying posts sorted by "new," THE system SHALL order posts by creation timestamp in descending order (most recent first).
- WHEN displaying posts sorted by "hot," THE system SHALL calculate a composite score using the formula: (upvotes - downvotes) / ((age_in_hours + 2) ^ 1.5), then sort in descending order.
- WHEN displaying posts sorted by "top," THE system SHALL order posts by total upvotes minus downvotes (net votes) in descending order.
- WHEN displaying posts sorted by "controversial," THE system SHALL calculate a ratio using the formula: (upvotes * downvotes) / (upvotes + downvotes + 1), then sort in descending order.
- WHEN a user selects "controversial," THE system SHALL require a minimum of 5 total votes (upvotes + downvotes) for a post to appear.
- WHERE a post has fewer than 10 total votes, THE system SHALL NOT include it in the "controversial" sort.
- WHERE post sorting occurs, THE system SHALL include a "Local" tab that shows posts from subscribed communities only.

### Subscription System

#### Community Subscriptions
- WHEN a member subscribes to a community, THE system SHALL add that community to their list of subscriptions and display its posts in their home feed when sorted by "hot" or "new."
- WHEN a member unsubscribes from a community, THE system SHALL remove it from their subscription list and hide its posts from their home feed.
- WHERE a member is subscribed to a community, THE system SHALL show a "Subscribed" label on the community's homepage.
- WHEN a member creates a new community, THE system SHALL automatically subscribe them to it.
- IF a member attempts to subscribe to a community they are banned from, THEN THE system SHALL show an error message stating "You cannot subscribe to communities you are banned from."

### User Profiles

#### Profile Display
- WHEN a member views their own profile, THE system SHALL display a summary including their username, post karma, comment karma, join date, and a list of their recent posts and comments.
- WHEN a member views another user's profile, THE system SHALL display the same information except for email address and IP history.
- WHEN a member views a profile with no posts or comments, THE system SHALL display "This user has not created any content yet."
- WHERE a user is banned from one or more communities, THE system SHALL indicate "Banned from: [List of communities]" on the profile.
- WHEN a user's account is suspended by an administrator, THE system SHALL show "Account suspended" on the profile and prevent access to all features.
- WHERE a user has been deleted by moderator or administrator, THE system SHALL display "[Deleted User]" as the username and remove all content references.

### Content Reporting

#### Reporting Workflow
- WHEN a member reports a post or comment, THE system SHALL send a notification to the relevant community moderators.
- WHEN a member reports a post or comment, THE system SHALL log the report with: reporter ID, target ID, type (post/comment), reason selected, and timestamp.
- WHEN a member clicks the report button, THE system SHALL present a set of pre-defined reasons: "Spam," "Harassment," "Nudity or sexual content," "Violence or dangerous content," "Hate speech or symbols," "Misinformation," "Other."
- IF a member reports a post or comment they created, THE system SHALL show a warning message: "You cannot report your own content."
- WHEN a moderator reviews a report, THE system SHALL allow them to take one of three actions: "Take no action," "Remove content," "Issue warning to reporter."
- WHEN a moderator removes content based on a report, THE system SHALL notify the reporter with: "Content has been removed based on your report."
- WHEN a moderator takes no action on a report, THE system SHALL notify the reporter with: "After review, no action was taken on your report."
- WHEN a report triggers an automatic escalation (5+ reports on same content within 24 hours), THE system SHALL notify system administrators in addition to community moderators.

### Performance Requirements

- WHEN a user loads the home feed, THE system SHALL display the first 20 posts within 1.5 seconds from request initiation.
- WHEN a user scrolls to the bottom of the feed, THE system SHALL load the next 20 posts within 1 second.
- WHEN a user upvotes or downvotes a post or comment, THE system SHALL update the vote count visually within 500 milliseconds.
- WHEN a user posts content (text, link, or image), THE system SHALL confirm successful submission within 2 seconds.
- WHEN a user loads a community page, THE system SHALL display the list of posts within 2 seconds.
- WHEN a user opens a post's comment thread with 100+ comments, THE system SHALL load the first 25 comments within 1 second.
- WHEN a user switches between sorting methods (new, hot, top, controversial), THE system SHALL refresh the list within 1.5 seconds.
- WHEN a user searches for a community by name, THE system SHALL return suggestions within 800 milliseconds.
- WHEN a user visits a user profile with 50+ posts, THE system SHALL load the first 10 posts within 1 second.

### Error Handling

- WHEN a user attempts a restricted action without authentication, THE system SHALL display a modal prompting them to log in before continuing.
- WHEN a user exceeds rate limits (50 actions per minute), THE system SHALL show a temporary lockout message: "Too many actions. Please wait 60 seconds before trying again."
- WHEN a user submits malformed JSON in an API call, THE system SHALL return HTTP 400 with message "Invalid request format."
- WHEN a database connection fails, THE system SHALL show a universally friendly message: "The server is temporarily unavailable. Please try again in a few moments."
- WHEN a media upload fails due to storage exhaustion, THE system SHALL display: "Storage capacity exceeded. Please try again later."
- WHEN a post or comment is found to contain blocked keywords (as defined in moderation policy), THE system SHALL quarantine the content pending moderator review and notify the user: "Your content is under review for policy compliance."
- WHEN a notification email fails to send, THE system SHALL retry at least 3 times before logging the error and showing: "We couldn't send your verification email. Please try again later."
- WHEN a JWT token is malformed or tampered with, THE system SHALL reject it and redirect to login with: "Your session has expired. Please log in again."

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*