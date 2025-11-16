# User Journey Documentation

This document provides a complete, step-by-step mapping of user interactions across the entire platform workflow. Each journey is defined from the perspective of the user actor, detailing their actions, decisions, and system responses. This is not a UI specification but a business process map for backend developers to implement.

### Guest User Journey (Browsing)

Guest users are unauthenticated visitors who can explore the platform without creating an account. Their journey is defined entirely by passive consumption behavior.

WHEN a guest visits the platform homepage, THE system SHALL display a feed of trending communities sorted by "hot" score.

WHEN a guest clicks on any community name, THE system SHALL display the community's front page with its top 50 posts sorted by "hot".

WHEN a guest clicks on any post, THE system SHALL display the full post details, including title, author (anonymous), embedded content (text, link, or image), vote count, and all top-level comments.

WHEN a guest scrolls down a post's comment thread, THE system SHALL load additional comments in batches of 10, ordered by "top" score.

WHEN a guest attempts to upvote, downvote, or comment on any content, THE system SHALL display a message: "You must be logged in to vote or comment. Sign up to join the conversation."

WHEN a guest clicks "Subscribe" on a community, THE system SHALL display a message: "You must be logged in to subscribe to communities. Create an account to follow your favorite topics."

WHEN a guest clicks "Create Community", THE system SHALL redirect them to the registration page.

WHEN a guest clicks "Profile" or a username, THE system SHALL display a generic placeholder page with message: "View profile" - "This account belongs to a registered member. Sign in to see their activity."

WHEN a guest clicks "Report", THE system SHALL display a message: "You must be logged in to report content. Log in or create an account to flag inappropriate posts or comments."

### Registration Journey

This journey begins when a user takes their first action requiring authentication and ends with their first fully functional session.

WHEN a guest selects "Sign Up", THE system SHALL display a registration form requesting email address and password.

WHEN a user submits a valid email and password (minimum 8 characters), THE system SHALL create an unverified account and send a verification email.

WHEN a user submits an email already registered, THE system SHALL display an error: "This email is already in use. Did you mean to log in?"

WHEN a user submits a password shorter than 8 characters, THE system SHALL display an error: "Password must be at least 8 characters long."

WHEN a user clicks the verification link in the email, THE system SHALL update their account status to "verified" and automatically log them in as a member.

WHEN a user closes the browser before verifying their email, THE system SHALL retain their unverified account indefinitely until they attempt to log in again.

WHEN a user attempts to log in with an unverified email, THE system SHALL display: "Your email address has not been verified. Check your inbox for the verification email or request a new one."

WHEN a user requests a new verification email, THE system SHALL resend the verification link to their registered email address.

### Login Journey

This journey begins when an authenticated user attempts to re-access the system after a session expires or logs out.

WHEN a member selects "Log In", THE system SHALL display a form requesting email and password.

WHEN a member submits correct credentials, THE system SHALL issue a JWT access token (15-minute expiration) and refresh token (7-day expiration), redirect to homepage, and set HTTP cookies for session persistence.

WHEN a member submits an incorrect email or password, THE system SHALL display: "Invalid email or password. Please try again." without specifying which field was wrong.

WHEN a member attempts to log in with a suspended or banned account, THE system SHALL display: "Your account has been suspended. Contact support if you believe this is an error."

WHEN a member clicks "Forgot Password", THE system SHALL prompt for email address.

WHEN a member submits a valid email for password reset, THE system SHALL send a unique reset link valid for one hour.

WHEN a member clicks the password reset link, THE system SHALL display a form to enter a new password.

WHEN a member submits a new password (minimum 8 characters), THE system SHALL update their password, invalidate all active sessions, and redirect to login.

WHEN a member attempts to log out, THE system SHALL delete the access token, remove authentication cookies, and redirect to the home page.

### Creating a Community

This journey begins when a member initiates the creation of a new community or subreddit.

WHEN a member clicks "Create Community", THE system SHALL display a creation form with fields: community name, description, and optional icon.

WHEN a member submits a community name that already exists, THE system SHALL display: "A community with this name already exists. Try a different name."

WHEN a member submits a community name containing prohibited characters (spaces, special symbols), THE system SHALL automatically normalize it to lowercase alphanumeric with hyphens only and display: "Community name has been converted to: [normalized-name]."

WHEN a member submits a community name less than 3 characters, THE system SHALL display: "Community name must be at least 3 characters long."

WHEN a member submits a description longer than 500 characters, THE system SHALL truncate to 500 and display: "Description has been shortened to 500 characters."

WHEN a member submits the form with valid data, THE system SHALL create the community, set the member as its first moderator, and redirect to the new community's front page.

WHEN a member creates a community, THE system SHALL automatically subscribe them to it.

### Posting Content (Text, Link, Image)

This journey begins when a member shares content within a community.

WHEN a member clicks "Create Post" on a community page, THE system SHALL display a posting form with four options: Text, Link, Image, and Poll (poll option excluded in Phase 1).

WHEN a member selects "Text", THE system SHALL display a text area for content entry with a 2,000-character limit.

WHEN a member selects "Link", THE system SHALL display a URL field with preview validation: "Valid URL formats: http://, https://"

WHEN a member selects "Image", THE system SHALL display a file upload button supporting JPG, PNG, GIF (< 5MB).

WHEN a member uploads an image larger than 5MB, THE system SHALL display: "Image file must be under 5MB. Compress and try again."

WHEN a member uploads a non-image file (PDF, ZIP, etc.), THE system SHALL display: "Only JPG, PNG, and GIF files are allowed."

WHEN a member submits a post without any content in any field, THE system SHALL display: "Please enter text, a URL, or upload an image."

WHEN a member submits a link that is invalid or unreachable, THE system SHALL still accept the post but display a warning: "The link provided could not be validated. Others may see an error when accessing it."

WHEN a member submits a post, THE system SHALL assign it a unique ID, set the author as the member, timestamp it, set initial vote count to 0, publish it in the selected community, and redirect to the post detail page.

WHEN a member submits a post in a community they do not belong to, THE system SHALL still allow it - membership is not required to post.

### Voting on a Post

This journey begins when a member expresses approval or disapproval of a post or comment.

WHEN a member clicks "upvote" on a post, THE system SHALL increment the upvote counter by one, decrement the downvote counter by one if previously downvoted, and toggle the member’s vote status to "upvoted."

WHEN a member clicks "downvote" on a post, THE system SHALL increment the downvote counter by one, decrement the upvote counter by one if previously upvoted, and toggle the member’s vote status to "downvoted."

WHEN a member clicks "upvote" while already upvoted, THE system SHALL remove the vote and decrement the upvote counter by one, setting vote status to "none."

WHEN a member clicks "downvote" while already downvoted, THE system SHALL remove the vote and decrement the downvote counter by one, setting vote status to "none."

WHEN a member attempts to vote on their own post, THE system SHALL display: "You cannot vote on your own posts."

WHEN a member attempts to vote on a post belonging to a suspended or banned user, THE system SHALL allow the vote but hide the author’s identity.

WHEN a post’s vote score drops below -5, THE system SHALL apply a "shadow flag" (visible to moderators only) to indicate potential spam or abuse.

WHEN a vote is cast, THE system SHALL update the post's "hot" score instantly in the background calculation for sorting.

### Creating a Comment

This journey begins when a member responds to a post.

WHEN a member clicks "Comment", THE system SHALL display a text field for comment entry with a 500-character limit.

WHEN a member submits an empty comment, THE system SHALL display: "Your comment cannot be empty."

WHEN a member submits a comment longer than 500 characters, THE system SHALL truncate it and display: "Comment has been shortened to 500 characters."

WHEN a member submits a comment on a post, THE system SHALL create the comment as a top-level comment, assign timestamp and author, set initial vote count to 0, and immediately appear in the comment thread.

WHEN a member submits a comment with blocked keywords (e.g., known spam phrases), THE system SHALL mark it as "review pending," hide it from public view, and notify the community moderator.

WHEN a comment is posted on a post, THE system SHALL notify the post author via in-app notification regardless of subscription status.

### Receiving Comment Replies

This journey begins when a member is engaged in threaded discussion.

WHEN a member clicks "reply" on any comment, THE system SHALL display a text field beneath that comment with same 500-character limit.

WHEN a member submits a reply to a comment, THE system SHALL create a nested comment under the parent comment, preserve threading structure, and set hierarchy level to +1.

WHEN a comment has 5 or more replies, THE system SHALL collapse the replies by default with state: "X replies" and an expand button.

WHEN a comment’s reply chain reaches depth of 8 levels, THE system SHALL prevent additional replies to threads beyond that depth and display: "Maximum discussion depth reached."

WHEN a comment is deleted by its author or moderator, THE system SHALL preserve replies under "[Comment deleted]" with no author attribution.

WHEN a comment receives an upvote, THE system SHALL elevate its position in the comment thread according to the "top" sort order.

### Subscribing to a Community

This journey begins when a member chooses to follow a community.

WHEN a member clicks "Subscribe" on a community page, THE system SHALL add the community to their list of subscribed communities and update their homepage feed to include posts from this community.

WHEN a member clicks "Subscribe" while already subscribed, THE system SHALL display: "You are already subscribed to this community."

WHEN a member unsubscribes, THE system SHALL remove the community from their subscription list and stop including its posts in their feed.

WHEN a member subscribes to a community they previously banned or muted, THE system SHALL display: "You cannot subscribe to a community you’ve been banned from."

WHEN a subscribed community is archived or deleted, THE system SHALL automatically unsubscribe the member and display: "This community is no longer active."

WHEN a member browses their "Subscriptions" page, THE system SHALL display a list of all subscribed communities sorted alphabetically.

### Viewing Personal Profile

This journey begins when a member views their public profile or others' profiles.

WHEN a member clicks "Profile" in the top navigation, THE system SHALL display their personal profile page.

WHEN a member views their own profile, THE system SHALL display: total posts, total comments, karma score, joined date, and list of subscribed communities.

WHEN a member views another member’s profile, THE system SHALL display: total posts, total comments, karma score, joined date, and list of subscribed communities - all visible to all users.

WHEN a member views a profile and their own account is suspended, THE system SHALL display: "Profile not available - account suspended."

WHEN a profile has no posts or comments, THE system SHALL display: "This user has not posted or commented yet."

WHEN a member clicks "Posts" tab on their profile, THE system SHALL display all their posts sorted by newest first.

WHEN a member clicks "Comments" tab on their profile, THE system SHALL display all their comments sorted by newest first.

WHEN a member posts content that was deleted by moderator, THE system SHALL still display the post on their profile with title: "[Deleted by moderator]" and no content.

WHEN a user's karma score is under 10, THE system SHALL display: "New Member - Karma: [score]" as a badge.

### Reporting Content

This journey begins when a member flags inappropriate content.

WHEN a member clicks "Report" on any post or comment, THE system SHALL display a modal with options: "Spam", "Harassment", "Nudity", "Copyright Infringement", "Other."

WHEN a member selects "Other" and enters a reason, THE system SHALL accept up to 500 characters.

WHEN a member submits a report, THE system SHALL create a confidential report ticket, assign it to the community moderator (if any), or escalate to system admin if no moderator exists.

WHEN a member reports their own content, THE system SHALL allow it and display: "Your report has been submitted. Your content may be removed if it violates community guidelines."

WHEN a report is submitted for a post that was already marked as "review pending," THE system SHALL increment a report counter but not duplicate the ticket.

WHEN a post receives 3 or more reports, THE system SHALL automatically hide it from public view and notify moderators.

WHEN a comment receives 5 or more reports, THE system SHALL automatically hide it from public view and notify moderators.

WHEN a moderator approves or removes reported content, THE system SHALL mark the report as resolved and notify the reporter with: "Thank you for your report. The content has been [removed/kept]."

### Moderator Review Workflow

This journey begins when a community moderator acts on flagged content.

WHEN a moderator logs in, THE system SHALL display a "Moderation Dashboard" showing reported content in their community.

WHEN a moderator clicks on a reported post or comment, THE system SHALL display full context including reporter ID (anonymized), reason, and timestamp.

WHEN a moderator selects "Remove Content", THE system SHALL permanently hide the content from all users and apply a "Moderator Removed" label.

WHEN a moderator selects "Ignore Report", THE system SHALL dismiss the report and restore content visibility if hidden.

WHEN a moderator selects "Warn User", THE system SHALL send an in-app notification: "Your recent content was removed for violating community guidelines. Repeated violations may result in suspension."

WHEN a moderator selects "Ban User", THE system SHALL remove the user from the community and prevent them from posting, commenting, or subscribing to it. They may still browse.

WHEN a moderator bans a user, THE system SHALL log the event and notify the user: "You have been banned from [community]. You may no longer post, comment, or subscribe here."

WHEN a moderator does nothing for 7 days after a report is submitted, THE system SHALL escalate the report to system admin.

### Admin Management Workflow

This journey begins when a system administrator takes action on platform-level issues.

WHEN an admin logs in, THE system SHALL display an "Admin Dashboard" with system-wide stats: total users, active communities, reports pending, and flagged content.

WHEN an admin views reported content, THE system SHALL see all reports across all communities, regardless of moderator status.

WHEN an admin removes any post or comment, THE system SHALL immediately delete it from all data stores and log the action with admin ID.

WHEN an admin suspends a user, THE system SHALL immediately disable all their account functions and notify them: "Your account has been suspended by an administrator. Contact [support email] for details."

WHEN an admin suspends a user, THE system SHALL remove them from all communities and revoke all subscriptions.

WHEN an admin unbans a user, THE system SHALL restore their account and notify them: "Your account suspension has been lifted. Welcome back."

WHEN an admin adds a moderator to a community, THE system SHALL update the community’s moderator list and notify the new moderator: "You have been promoted to moderator of [community]. You can now manage posts, comments, and users."

WHEN an admin removes a moderator, THE system SHALL downgrade their permissions to member and notify: "You have been removed as moderator of [community]."

WHEN an admin sees a community with 500+ reports in 7 days, THE system SHALL auto-archive it and notify: "This community has been disabled due to excessive violations."

WHEN an admin deletes a community, THE system SHALL permanently remove all posts, comments, and subscriptions for that community.

WHEN an admin exports user data for legal compliance, THE system SHALL provide a downloadable archive of all user activity per GDPR/CCPA request.

WHEN an admin clicks "Reset Karma", THE system SHALL reset a user’s karma score to 0 and notify: "Your karma score has been reset by an administrator."


> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*