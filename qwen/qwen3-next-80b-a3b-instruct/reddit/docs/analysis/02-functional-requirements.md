# Functional Requirements Specification for communityPlatform

## Core Functionality Overview

The communityPlatform is a text-based community platform that enables users to create, join, and engage with interest-based communities. The system supports user-generated content in the form of posts and comments, with a reputation-driven interaction model that rewards quality contributions. The platform is designed for scalable, real-time user engagement with a focus on community self-moderation supported by algorithmic content ranking and clear reporting workflows.

The system must enable users to discover, join, and participate in communities based on shared interests. Users create and curate content through posting, commenting, voting, and moderating. The platform’s success depends on the quality and relevance of user-generated content, incentivized by a karma-based reputation system and intelligently sorted content listings.

## Authentication and Registration Requirements

### Core User Authentication Functions

THE system SHALL allow users to register an account with a valid email address and password.

THE system SHALL allow users to log in to their account using their email and password.

THE system SHALL allow users to log out of their account, terminating their session.

THE system SHALL enable users to reset their password if forgotten.

THE system SHALL require users to verify their email address before activating their account.

THE system SHALL remember logged-in users across sessions using secure, time-limited JWT refresh tokens.

THE system SHALL prevent multiple simultaneous active sessions for the same user unless explicitly permitted.

### Registration Requirements

WHEN a guest attempts to register an account, THE system SHALL collect the user’s email address and password.

WHEN a guest submits registration details, THE system SHALL validate the email address format (RFC 5322 compliant).

WHEN a guest submits registration details, THE system SHALL validate that the password is at least 8 characters long.

WHEN a guest submits registration details, THE system SHALL ensure the email address is not already registered.

WHEN a guest submits registration details, THE system SHALL send a verification email containing a unique, time-limited verification link.

WHEN a user clicks the verification link in the email, THE system SHALL activate their account and transition them from guest to member status.

WHEN a user attempts to register with an invalid email format, THE system SHALL display a clear error message: "Please enter a valid email address."

WHEN a user attempts to register with a password shorter than 8 characters, THE system SHALL display a clear error message: "Password must be at least 8 characters long."

WHEN a user attempts to register with an email already in use, THE system SHALL display a clear error message: "An account with this email already exists."

WHEN a user does not verify their email within 7 days of registration, THE system SHALL automatically delete their unverified account.

WHEN a user requests a password reset, THE system SHALL send a time-limited reset link to their verified email address.

WHEN a user clicks a valid password reset link, THE system SHALL allow them to enter and confirm a new password.

WHEN a user submits a new password during reset, THE system SHALL validate that the new password is at least 8 characters.

WHEN a user submits a new password during reset, THE system SHALL update their password hash securely.

WHEN a user attempts to reset a password with an unverified email address, THE system SHALL deny the request and display a message: "Your email address must be verified before resetting your password."

WHEN a user attempts to log in with incorrect credentials, THE system SHALL increase the failed attempt counter for that email.

WHEN a user exceeds 5 consecutive failed login attempts, THE system SHALL temporarily lock their account for 15 minutes.

WHEN a user’s account is locked due to failed attempts, THE system SHALL display a message: "Too many failed attempts. Try again in 15 minutes."

WHEN a user successfully logs in after a lockout, THE system SHALL reset their failed attempt counter.

## Community Management Requirements

### Community Creation and Management

WHEN a member attempts to create a new community, THE system SHALL require the member to provide a unique name (slug) and a display name.

WHEN a member submits a community creation request, THE system SHALL validate that the community name contains only alphanumeric characters, underscores, and hyphens.

WHEN a member submits a community creation request, THE system SHALL validate that the community name is not already in use.

WHEN a member submits a community creation request, THE system SHALL validate that the display name is between 1 and 100 characters.

WHEN a member submits a community creation request, THE system SHALL assign the member as the initial moderator of the community.

WHEN a member submits a community creation request, THE system SHALL create the community in a "pending approval" state.

WHEN a community is in "pending approval" state, THE system SHALL notify all administrators.

WHEN an administrator reviews a pending community, THE system SHALL approve or reject it.

WHEN an administrator approves a community, THE system SHALL set its status to "active" and make it visible to all users.

WHEN an administrator rejects a community, THE system SHALL notify the creator with the reason for rejection and delete the community record.

WHEN a community is active, THE system SHALL allow members to subscribe to it.

WHEN a community is active, THE system SHALL allow members to post content to it.

WHEN a community is active, THE system SHALL allow moderators to manage posts and comments within it.

WHEN a moderator attempts to edit a community’s name or description, THE system SHALL require approval from an administrator.

WHEN an administrator suspends a community, THE system SHALL set its status to "suspended" and prevent new posts and subscriptions.

WHEN a community is suspended, THE system SHALL display a banner: "This community has been suspended by an administrator."

WHEN an administrator permanently deletes a community, THE system SHALL archive all associated posts and comments.

## Post Creation and Management Requirements

### Post Creation and Validation

WHEN a member attempts to create a post, THE system SHALL allow them to submit one of the following content types: text, link, or image.

WHEN a member submits a text post, THE system SHALL require the post title to be between 1 and 300 characters.

WHEN a member submits a text post, THE system SHALL allow the body text to be up to 10,000 characters.

WHEN a member submits a link post, THE system SHALL require the post title to be between 1 and 300 characters.

WHEN a member submits a link post, THE system SHALL validate that the URL is in a valid format (https:// or http://).

WHEN a member submits a link post, THE system SHALL ensure the URL is not already posted in the same community within the last 24 hours.

WHEN a member submits an image post, THE system SHALL require the post title to be between 1 and 300 characters.

WHEN a member submits an image post, THE system SHALL accept only images in JPG, PNG, or WEBP formats.

WHEN a member submits an image post, THE system SHALL limit the file size to 10MB.

WHEN a member submits an image post, THE system SHALL generate a thumbnail and store the original image for retrieval.

WHEN a member submits a post, THE system SHALL associate the post with the community they selected.

WHEN a member submits a post, THE system SHALL set the post’s author to the current member.

WHEN a member submits a post, THE system SHALL set the post timestamp to the current server time (Asia/Seoul).

WHEN a member submits a post, THE system SHALL assign the post an initial score of 0 (net votes).

WHEN a member submits a post, THE system SHALL assign the post an initial comment count of 0.

WHEN a member submits a post with a missing or empty title, THE system SHALL display an error: "Title is required and must be between 1 and 300 characters."

WHEN a member submits a link post with an invalid URL, THE system SHALL display an error: "Please enter a valid web address (beginning with http:// or https://)."

WHEN a member submits an image post with an unsupported file type, THE system SHALL display an error: "Only JPG, PNG, and WEBP images are allowed."

WHEN a member submits an image post exceeding 10MB, THE system SHALL display an error: "Image file must be 10MB or smaller."

WHEN a member submits a duplicate link within the same community in 24 hours, THE system SHALL display an error: "This link has already been posted in this community within the last 24 hours."

### Post Moderation

WHEN a member reports a post, THE system SHALL record the report and notify moderators of the community.

WHEN a moderator reviews a reported post, THE system SHALL allow them to approve, remove, or ignore the report.

WHEN a moderator removes a post, THE system SHALL mark it as "removed" and display a placeholder message: "This post has been removed by a moderator." 

WHEN a post is removed, THE system SHALL preserve the metadata for audit purposes but hide it from public view.

WHEN a post is removed, THE system SHALL not affect the karma of the original author.

WHEN an administrator removes a post, THE system SHALL notify the author via in-app message and email.

WHEN a post receives 5 or more reports from different users, THE system SHALL automatically flag it for moderator review.

WHEN a post is flagged for review, THE system SHALL prioritize it for moderator action.

WHEN a post remains flagged for longer than 48 hours, THE system SHALL notify an administrator.

WHEN a post is deleted by an administrator, THE system SHALL remove all associated comments and votes for audit purposes.

WHEN a user attempts to edit their own post, THE system SHALL allow editing only within 24 hours after posting.

WHEN a user attempts to edit a post after 24 hours, THE system SHALL display a message: "You can only edit your post within 24 hours of publishing it."

WHEN a user edits a post, THE system SHALL create a revision history entry but keep the original displayed publicly.

WHEN a user deletes their own post, THE system SHALL mark it as "deleted" and display: "This post has been deleted by the author."

WHEN a user deletes their own post, THE system SHALL retain the post metadata for karma and reporting audit trails.

## Voting System Requirements

### Voting Mechanics

WHEN a member upvotes a post, THE system SHALL increase the post’s net vote score by 1.

WHEN a member downvotes a post, THE system SHALL decrease the post’s net vote score by 1.

WHEN a member upvotes a comment, THE system SHALL increase the comment’s net vote score by 1.

WHEN a member downvotes a comment, THE system SHALL decrease the comment’s net vote score by 1.

WHEN a member attempts to vote on a post or comment, THE system SHALL validate they are authenticated.

WHEN a member attempts to vote on a post or comment, THE system SHALL prevent duplicate voting from the same user.

WHEN a member attempts to upvote a post they previously downvoted, THE system SHALL reverse their vote (net +2).

WHEN a member attempts to downvote a post they previously upvoted, THE system SHALL reverse their vote (net -2).

WHEN a member attempts to vote on their own post or comment, THE system SHALL deny the vote and display a message: "You cannot vote on your own content."

WHEN a guest attempts to vote, THE system SHALL redirect them to the login page with a message: "Login required to vote."

WHEN a post or comment receives more than 10,000 votes, THE system SHALL store the vote count as a 64-bit integer to prevent overflow.

WHEN a vote is cast, THE system SHALL update the vote count in real time for all viewers.

WHEN a vote is cast, THE system SHALL record the vote as an immutable event in the audit log.

### Vote Display

THE system SHALL display the net vote count (upvotes minus downvotes) for every post and comment.

THE system SHALL display upvote and downvote buttons as color-coded icons (green for upvote, red for downvote).

WHEN a member has upvoted a post or comment, THE system SHALL highlight the upvote button.

WHEN a member has downvoted a post or comment, THE system SHALL highlight the downvote button.

WHEN a member has not voted on a post or comment, THE system SHALL display neutral icons for vote buttons.

## Comment and Nested Reply System Requirements

### Comment Posting Rules

WHEN a member attempts to comment on a post, THE system SHALL require the comment to be between 1 and 500 characters.

WHEN a member attempts to comment on a post, THE system SHALL allow the comment to be submitted in plain text only.

WHEN a member submits a comment, THE system SHALL associate the comment with the parent post.

WHEN a member submits a comment, THE system SHALL set the comment’s author to the current member.

WHEN a member submits a comment, THE system SHALL set the comment timestamp to the current server time (Asia/Seoul).

WHEN a member submits a comment, THE system SHALL assign the comment an initial vote score of 0.

WHEN a member submits a comment with fewer than 1 character, THE system SHALL display an error: "Comment cannot be empty."

WHEN a member submits a comment with more than 500 characters, THE system SHALL display an error: "Comments are limited to 500 characters."

WHEN a member submits a comment, THE system SHALL notify the author of the post if the comment is not their own.

### Nested Reply Rules

WHEN a member attempts to reply to a comment, THE system SHALL create a reply as a child of the target comment.

WHEN a member replies to a comment, THE system SHALL ensure the reply complies with the same length limit (1–500 characters).

WHEN a reply is created, THE system SHALL maintain a hierarchical relationship between parent and child comments.

WHEN a reply is created, THE system SHALL limit nesting to a maximum depth of 5 levels.

WHEN a user attempts to reply to a comment that is already 5 levels deep, THE system SHALL display a message: "Replies are limited to 5 levels deep."

WHEN a user views a thread, THE system SHALL render nested replies with visual indentation to reflect hierarchy.

WHEN a user clicks "Reply", THE system SHALL scroll to and highlight the comment reply form.

WHEN a comment is edited, THE system SHALL preserve the original content for audit and preserve the reply structure.

WHEN a comment is removed, THE system SHALL hide the comment and display: "This comment has been removed by a moderator."

WHEN a comment is removed, THE system SHALL hide all its direct replies, but maintain their existence in the database.

WHEN a parent comment is deleted by the author, THE system SHALL display: "This comment has been deleted by the author." and hide all direct replies.

WHEN a post is deactivated, THE system SHALL prevent new comments.

WHEN a post is removed by a moderator, THE system SHALL hide all associated comments.

WHEN a comment receives 5 or more reports, THE system SHALL flag it for moderator review.

WHEN a comment is flagged for review, THE system SHALL prioritize it for moderator action.

WHEN a comment remains flagged for longer than 48 hours, THE system SHALL notify an administrator.

## Karma System Requirements

### Karma Earning Rules

WHEN a member’s post receives an upvote, THE system SHALL grant the member +1 karma point.

WHEN a member’s comment receives an upvote, THE system SHALL grant the member +1 karma point.

WHEN a member’s post receives a downvote, THE system SHALL deduct -1 karma point from the member.

WHEN a member’s comment receives a downvote, THE system SHALL deduct -1 karma point from the member.

WHEN a member creates a community that is approved by an administrator, THE system SHALL grant the member +10 karma points.

WHEN a member’s post is selected as "Top Post of the Week" by an administrator on a community basis, THE system SHALL grant the member +50 karma points.

### Karma Losing Rules

WHEN a member’s post is removed by a moderator, THE system SHALL deduct -5 karma points from the member.

WHEN a member’s comment is removed by a moderator, THE system SHALL deduct -3 karma points from the member.

WHEN a member attempts to circumvent karma rules by creating fake accounts, THE system SHALL freeze the karma of the associated accounts and notify an administrator.

### Karma Display Rules

THE system SHALL display the total karma score of every member on their profile page.

THE system SHALL display karma points as a whole number with no decimal places.

THE system SHALL display karma next to the member’s display name on all posts and comments.

WHEN a member’s karma score reaches 1000, THE system SHALL display a "Karma Master" badge next to their name.

WHEN a member’s karma score reaches 5000, THE system SHALL display a "Community Legend" badge next to their name.

### Karma Threshold Effects

WHERE a member’s karma is greater than 100, THE system SHALL allow them to create custom community themes.

WHERE a member’s karma is greater than 500, THE system SHALL allow them to pin one comment per post.

WHERE a member’s karma is greater than 1000, THE system SHALL allow them to moderate low-traffic communities without administrator oversight.

### Karma Decay Policy

WHILE a user is inactive for more than 90 days, THE system SHALL decrease their karma by 5% per month.

WHILE a user is inactive for more than 180 days, THE system SHALL remove all badge privileges, but retain the karma value.

WHEN a user logs in after a 90-day inactivity period, THE system SHALL recalculate their karma based on the decay formula.

### Karma Fraud Prevention

IF a user’s post or comment receives more than 100 upvotes in less than 5 minutes from users with <10 karma, THEN THE system SHALL flag the post for review.

IF a user’s account receives more than 50 upvotes from the same IP address in 24 hours, THEN THE system SHALL pause their karma collection and notify an administrator.

IF a user requests to buy or sell karma, THEN THE system SHALL ban the account and notify an administrator.

## Post Sorting Requirements

### New Sorting

WHEN posts are sorted by "New", THE system SHALL order them by creation timestamp in descending order (most recent first).

WHEN posts are sorted by "New", THE system SHALL include only posts created within the last 14 days.

WHEN posts are sorted by "New", THE system SHALL ignore vote scores entirely.

### Top Sorting

WHEN posts are sorted by "Top", THE system SHALL order them by net vote score (upvotes - downvotes) in descending order.

WHEN posts are sorted by "Top", THE system SHALL include only posts created within the last 365 days.

WHEN posts are sorted by "Top", THE system SHALL ignore time decay and prioritize volume of votes.

### Hot Sorting

WHEN posts are sorted by "Hot", THE system SHALL calculate a score using the formula: score = log10(upvotes + 1) * (1 + (upvotes - downvotes) / 10) / hours_since_posted^(1.2)

WHEN posts are sorted by "Hot", THE system SHALL apply a minimum threshold of 10 total votes for a post to appear in hot listings.

WHEN posts are sorted by "Hot", THE system SHALL refresh the rankings every 30 seconds.

WHEN posts are sorted by "Hot", THE system SHALL apply time decay to post age (older posts lose ranking rapidly).

### Controversial Sorting

WHEN posts are sorted by "Controversial", THE system SHALL calculate a score using the formula: score = sqrt(upvotes * downvotes).

WHEN posts are sorted by "Controversial", THE system SHALL prioritize posts with high upvotes paired with high downvotes.

WHEN posts are sorted by "Controversial", THE system SHALL require a minimum of 20 total votes for a post to appear.

### General Sorting Rules

WHEN a user selects a sorting method, THE system SHALL apply that sort to all posts in the currently viewed community.

WHEN a user selects a sorting method, THE system SHALL apply the same sort to the front page if the user is viewing the global feed.

WHEN no sorting method is selected, THE system SHALL default to "Hot" sorting.

WHEN a post is edited after publication, THE system SHALL recalculate its ranking based on the new vote count and timestamp.

WHEN an administrator pins a post, THE system SHALL force it to appear at the top of the "Hot" and "New" views regardless of score.

WHEN a post is archived or deleted, THE system SHALL immediately remove it from all sorting lists.

## Subscription Management Requirements

### Subscription Actions

WHEN a member visits a community, THE system SHALL display a "Subscribe" button if they are not already subscribed.

WHEN a member clicks "Subscribe", THE system SHALL add the community to their subscription list.

WHEN a member is subscribed to a community, THE system SHALL display a "Unsubscribe" button.

WHEN a member clicks "Unsubscribe", THE system SHALL remove the community from their subscription list.

WHEN a member unsubscribes from a community, THE system SHALL continue to show their past posts and comments in that community.

WHEN a member unsubscribes from a community, THE system SHALL stop showing posts from that community in their front page feed.

### Subscription Display

THE system SHALL show a list of all subscribed communities on the user’s profile and settings page.

THE system SHALL display the count of subscribers for each community next to its name.

WHEN a user subscribes to a community, THE system SHALL notify them of any new posts from that community via email and in-app notification.

WHEN a user unsubscribes from a community, THE system SHALL immediately stop sending email notifications for that community.

WHEN a user joins a community, THE system SHALL show a welcome message: "Welcome to [community_name]! You’ll now see new posts here."

WHEN a community is suspended, THE system SHALL retain the user’s subscription status but hide the community from their feed.

WHEN a community is permanently deleted, THE system SHALL automatically unsubscribe the user and remove the community from their list.

## User Profile Requirements

### Profile Data Composition

THE system SHALL display a user’s display name, karma score, and join date on their profile.

THE system SHALL display a user’s avatar, if uploaded.

THE system SHALL display a banner image, if uploaded.

THE system SHALL display a bio field up to 500 characters, with markdown formatting allowed.

### Activity Display

THE system SHALL display all posts created by the user in their profile, ordered by creation date (newest first), in groups of 20.

THE system SHALL display all comments created by the user in their profile, ordered by creation date (newest first), in groups of 20.

THE system SHALL allow users to toggle between viewing only their posts, only their comments, or all activity.

WHEN a user’s post or comment has been removed, THE system SHALL display a message: "[Removed by moderator]" instead of the content.

WHEN a user’s post or comment has been deleted, THE system SHALL display a message: "[Deleted by author]" instead of the content.

WHEN a user has created no posts or comments, THE system SHALL display: "This user has not created any content yet."

### Privacy and Visibility

THE system SHALL display the user’s profile to all website visitors.

THE system SHALL prevent non-authenticated users from viewing user email addresses.

THE system SHALL prevent non-authenticated users from viewing the exact join date of a user.

THE system SHALL allow users to opt out of appearing in public user directories.

THE system SHALL display "Private Profile" in place of activity history if user privacy setting is enabled.

### Personalization Limits

WHEN a user attempts to change their display name, THE system SHALL allow reassignment only once every 90 days.

WHEN a user attempts to change their display name, THE system SHALL validate that it contains no special characters except spaces, hyphens, underscores, and apostrophes.

WHEN a user attempts to change their display name, THE system SHALL ensure it is not already in use by another user.

WHEN a user uploads an avatar, THE system SHALL limit it to 5MB in JPG, PNG, or WEBP format.

WHEN a user uploads a banner, THE system SHALL limit it to 10MB in JPG, PNG, or WEBP format.

## Reporting System Requirements

### Reporting Trigger Conditions

WHEN a post contains hate speech, threats, nudity, or illegal content, THE system SHALL allow users to report it.

WHEN a comment contains abuse, spam, harassment, or off-topic content, THE system SHALL allow users to report it.

WHEN a user profile contains impersonation, misleading information, or fake authorship, THE system SHALL allow users to report it.

WHEN a community promotes hate, violence, or lawbreaking, THE system SHALL allow users to report it.

### Reporting Workflow

WHEN a user reports a post, THE system SHALL present them with the following categories: "Spam", "Hate Speech", "Harassment", "Nudity or Sexual Content", "Illegal Content", "Other".

WHEN a user reports a comment, THE system SHALL present them with the same categories as for posts.

WHEN a user reports a community, THE system SHALL present them with the same categories as for posts.

WHEN a user reports a profile, THE system SHALL present them with: "Impersonation", "Misleading Info", "Suspicious Behavior", "Other".

WHEN a user submits a report, THE system SHALL collect the category, optional description, and timestamp.

WHEN a user submits a report, THE system SHALL prevent further reports on the same item from the same user within 24 hours.

WHEN a user submits a report, THE system SHALL increment the report counter for that item.

WHEN an item reaches 5 reports, THE system SHALL notify the relevant community moderator.

WHEN an item reaches 20 reports, THE system SHALL notify an administrator.

WHEN a moderator reviews a report, THE system SHALL allow them to: "Approve", "Remove", or "Dismiss".

WHEN a moderator removes a post, comment, or community, THE system SHALL log the action and notify the user who created the item.

WHEN a moderator dismisses a report, THE system SHALL log the dismissal and prevent future alerts from the same reporter on the same item for 7 days.

WHEN an administrator takes action on a reported item, THE system SHALL notify the reporter of the outcome.

WHEN an administrator disables a user account due to reports, THE system SHALL notify the user via email and in-app message.

### Report Transparency

WHEN a report is processed, THE system SHALL show an audit trail accessible to administrators only.

WHEN a user is banned due to reports, THE system SHALL allow them to submit an appeal within 30 days.

WHEN a user submits an appeal, THE system SHALL forward it to a senior administrator for review.

WHEN an appeal is accepted, THE system SHALL reinstate the user’s account and remove all flags.

WHEN an appeal is denied, THE system SHALL notify the user and provide the reason for denial.

### System Accountability

THE system SHALL store all reports and actions in an immutable audit log with timestamps, user IDs, and actor roles.

THE system SHALL allow administrators to export complete report histories for legal or compliance purposes.

THE system SHALL anonymize user data in audit logs if required by law.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.