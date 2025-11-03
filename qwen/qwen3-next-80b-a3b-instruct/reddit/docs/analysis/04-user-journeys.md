# User Journeys and Interaction Flows

This document defines the complete end-to-end user journeys for all core interactions on the community platform. Each journey maps step-by-step behaviors from the user's perspective to ensure backend developers understand exactly how the system must respond to user actions. All interactions are anchored to the defined user actors: Guest, Member, and Admin. No technical implementation details are included—only business logic, system responses, and user experiences.

## Guest to Member: Registration Journey

This journey describes how an unauthenticated user becomes a registered Member.

1. The Guest visits the platform homepage and clicks the "Sign Up" button.
2. THE system SHALL display a registration form with fields for email address and password.
3. THE Guest SHALL enter a valid email address (format: local-part@domain) and a password of at least 8 characters.
4. THE Guest SHALL confirm the password by re-entering it identically.
5. THE Guest SHALL accept the terms of service and privacy policy.
6. THE Guest SHALL click the "Create Account" button.
7. WHEN the system receives a valid registration request, THE system SHALL create a new Member account with pending email verification status.
8. THE system SHALL immediately send a verification email to the provided address containing a unique link.
9. THE system SHALL display a message: "Your account has been created. Please check your email to verify your address."
10. WHILE the Member's email is unverified, THE system SHALL restrict access to all posting, commenting, voting, and subscribing functions.
11. IF the Member clicks the verification link in the email, THE system SHALL update the account status to "email verified" and grant full Member privileges.
12. IF the verification link expires (after 48 hours), THE system SHALL allow the Member to request a new verification email.
13. IF the email address is already registered, THE system SHALL display an error: "This email address is already in use. Please log in or use a different email."
14. IF the password does not meet the 8-character minimum, THE system SHALL display an error: "Password must be at least 8 characters long."
15. IF the password confirmation does not match, THE system SHALL display an error: "Passwords do not match. Please try again."

## Member: Creating a New Community

This journey describes how a Member establishes a new community (subreddit).

1. The Member navigates to the "Explore" section and clicks the "Create Community" button.
2. THE system SHALL display a creation form requiring: community name (unique), description (up to 500 characters), and optional icon (image file).
3. THE Member SHALL enter a unique community name (letters, numbers, underscores only, no spaces or special characters).
4. THE Member SHALL write a brief description of the community's purpose.
5. THE Member SHALL optionally upload an image file (PNG, JPG, GIF) under 5 MB.
6. THE Member SHALL click the "Create" button.
7. WHEN the system receives a valid community creation request, THE system SHALL create a new community with the Member as the initial moderator.
8. THE system SHALL assign the community a unique URL identifier based on the given name.
9. THE system SHALL add the Member to the community's moderator list with full permissions.
10. THE system SHALL redirect the Member to the new community's homepage.
11. THE system SHALL display a notification: "Your community 'name' has been created!"
12. IF the community name is already taken, THE system SHALL display an error: "This community name is already in use. Choose a different name."
13. IF the community name contains invalid characters, THE system SHALL display an error: "Community names may only contain letters, numbers, and underscores."
14. IF the image file exceeds 5 MB, THE system SHALL display an error: "Image file must be under 5 MB."
15. IF the description exceeds 500 characters, THE system SHALL display an error: "Description cannot exceed 500 characters."

## Member: Posting Content (Text, Link, Image)

This journey describes how a Member submits a content post to a community.

1. The Member navigates to a community they are a Member of (or have joined).
2. THE Member SHALL click the "Create Post" button.
3. THE system SHALL display a post creation form with three modes: Text, Link, Image.
4. THE Member SHALL choose one mode:
   - For Text: Enter title and body (up to 10,000 characters)
   - For Link: Enter title and URL (must be a valid HTTP/HTTPS address)
   - For Image: Enter title and upload a file (PNG, JPG, GIF, under 10 MB)
5. THE Member SHALL select the community where the post will be published.
6. THE Member SHALL click the "Post" button.
7. WHEN a valid text, link, or image post is submitted, THE system SHALL create a new post record with the Member as author.
8. THE system SHALL assign the post a unique identifier and timestamp.
9. THE system SHALL count the new post toward the Member's total posts and update karma.
10. THE system SHALL display the new post on the community feed immediately.
11. THE system SHALL notify the community's moderators of the new post.
12. IF the URL provided for a link post is invalid, THE system SHALL display an error: "Please enter a valid web address (e.g., https://example.com)."
13. IF the image file exceeds 10 MB, THE system SHALL display an error: "Image file must be under 10 MB."
14. IF the post title is empty, THE system SHALL display an error: "Title cannot be empty."
15. IF the text body exceeds 10,000 characters, THE system SHALL display an error: "Text post cannot exceed 10,000 characters."
16. IF the Member has been banned from the community, THE system SHALL display an error: "You are banned from posting in this community."
17. WHERE the Member is flagged for spam activity, THE system SHALL temporarily restrict posting and show: "Your posting privileges are limited due to recent activity. Please wait 1 hour before posting again."

## Member: Voting on a Post or Comment

This journey describes how a Member upvotes or downvotes content.

1. The Member views a post or comment in any community they have access to.
2. THE Member SHALL click "Upvote" or "Downvote" button next to the content.
3. WHEN the Member clicks "Upvote" on content they have not voted on, THE system SHALL increase the content's score by 1 and record the vote.
4. WHEN the Member clicks "Downvote" on content they have not voted on, THE system SHALL decrease the content's score by 1 and record the vote.
5. WHEN the Member clicks the same vote button they previously used, THE system SHALL remove their previous vote and restore the score to its original value.
6. WHEN the Member clicks the opposite vote button from their previous vote, THE system SHALL reverse their vote (e.g., from +1 to -1) by adjusting the score by 2 total points.
7. THE system SHALL immediately update the displayed score in real time.
8. THE system SHALL update the Member's karma by +1 for an upvote, -1 for a downvote, based on the content they voted on.
9. IF the Member tries to vote on content they created, THE system SHALL display an error: "You cannot vote on your own posts or comments."
10. IF the Member attempts to vote while unauthenticated, THE system SHALL redirect to login and display: "You must be logged in to vote."
11. IF the Member has been flagged for vote manipulation, THE system SHALL temporarily block voting and show: "Your voting privileges are restricted due to suspicious activity."
12. WHERE a post or comment is locked by a moderator, THE system SHALL disable voting buttons and display: "Voting is disabled on this content."

## Member: Writing a Comment with Nested Replies

This journey describes how a Member writes a comment and replies to other comments.

1. The Member views a post and clicks the "Comment" button.
2. THE system SHALL display a comment input field and a "Submit" button.
3. THE Member SHALL enter text (up to 2,000 characters).
4. THE Member SHALL click "Submit".
5. WHEN a valid comment is submitted, THE system SHALL create a top-level comment and attach it to the post.
6. THE system SHALL increment the post's comment count.
7. THE system SHALL assign the comment a unique identifier, timestamp, and depth level of 0.
8. THE Member SHALL see their comment appear immediately beneath the post.
9. THE Member SHALL click "Reply" on any existing comment (top-level or nested).
10. THE system SHALL display a nested comment input field below the selected comment.
11. THE Member SHALL enter text (up to 2,000 characters) and click "Submit".
12. WHEN a reply is submitted, THE system SHALL create a new comment with depth level = parent depth + 1.
13. THE system SHALL establish a parent-child relationship between the reply and its target comment.
14. THE system SHALL increment the target comment's reply count.
15. THE system SHALL display the reply beneath the parent comment.
16. IF the comment text is empty, THE system SHALL display an error: "Comment cannot be empty."
17. IF the comment exceeds 2,000 characters, THE system SHALL display an error: "Comment cannot exceed 2,000 characters."
18. IF the Member tries to reply more than 3 levels deep, THE system SHALL display: "Replies are limited to 3 levels deep."
19. IF the post or comment has been locked by a moderator, THE system SHALL disable commenting and display: "Comments are disabled on this content."
20. WHERE the Member has been banned from the community, THE system SHALL display: "You are banned from commenting in this community."

## Member: Subscribing to a Community

This journey describes how a Member follows a community to see its posts in their feed.

1. The Member navigates to a community page they are not yet subscribed to.
2. THE Member SHALL click the "Subscribe" button.
3. WHEN the Member subscribes to a community, THE system SHALL add the community to the Member's subscribed list.
4. THE system SHALL increment the community's subscriber count.
5. THE system SHALL update the button text to "Subscribed" and change its color to indicate active subscription.
6. THE system SHALL begin including the community's new posts in the Member's personalized feed.
7. IF the Member is not authenticated, THE system SHALL redirect to login and display: "You must be logged in to subscribe to communities."
8. IF the Member tries to subscribe to a community they already follow, THE system SHALL display: "You are already subscribed to this community."
9. IF the community has been banned or removed, THE system SHALL display: "This community is no longer available."
10. IF the Member has been restricted from subscribing by system moderators, THE system SHALL display: "Your subscription privileges are temporarily disabled."

## Member: Viewing Own Profile and Activity History

This journey describes how a Member accesses their personal profile page.

1. The Member clicks their username in the top navigation bar.
2. THE system SHALL navigate to the Member's profile page.
3. THE system SHALL display the Member's username, join date, and total karma.
4. THE system SHALL display tabs: "Posts," "Comments," and "Subscriptions."
5. WHEN the Member clicks "Posts," THE system SHALL list up to 20 of their most recent posts, sorted by date descending.
6. WHEN the Member clicks "Comments," THE system SHALL list up to 20 of their most recent comments, sorted by date descending.
7. WHEN the Member clicks "Subscriptions," THE system SHALL list all communities they actively subscribe to.
8. IF the Member has no posts or comments, THE system SHALL display: "You have not yet posted or commented." in the respective tab.
9. IF the Member has been banned from a community, THE system SHALL hide posts/comments from that community in their profile (but retain the data for moderation purposes).
10. WHERE another user searches for the Member’s username, THE system SHALL allow that user to view the profile without restrictions (unless the Member has privacy settings enabled).
11. IF the Member's account is suspended, THE system SHALL display: "This account is currently suspended." and hide all content.

## Member: Reporting Inappropriate Content

This journey describes how a Member flags content for moderator review.

1. The Member views a post or comment they believe violates community guidelines.
2. THE Member SHALL click the "Report" button on the content.
3. THE system SHALL display a modal with reason options: Spam, Harassment, NSFW (no warning), Illegal Content, Other.
4. THE Member SHALL select one reason and may optionally add a comment.
5. THE Member SHALL click "Submit Report."
6. WHEN a report is submitted, THE system SHALL create a report record with timestamp, reporter ID, target ID, reason, and optional comment.
7. THE system SHALL notify the community moderators and system administrators of the report.
8. THE system SHALL display a confirmation: "Thank you for reporting this content. Moderators will review it."
9. IF the Member has already reported the same content within the last hour, THE system SHALL display: "You have already reported this content. Please wait one hour before reporting again."
10. IF the Member tries to report their own post or comment, THE system SHALL display: "You cannot report your own content."
11. IF the reported content has already been removed by a moderator, THE system SHALL display: "This content has already been reviewed and removed."
12. IF the Member has been flagged for false reporting, THE system SHALL display: "Your reporting privileges are limited due to frequent false reports."

## Admin: Moderating Reported Content

This journey describes how an Admin reviews and acts on reported content.

1. The Admin receives a notification of new reported content in their moderation dashboard.
2. THE Admin SHALL click the report to view details: reporter, target content, reason, comment.
3. THE Admin SHALL review the actual post or comment in context.
4. THE Admin SHALL choose one action: Confirm & Remove, Ignore, Warn User, Ban User, Add to Watchlist.
5. WHEN the Admin selects "Confirm & Remove," THE system SHALL:
   - Hide the reported content from all users
   - Remove all votes and comments
   - Add a system-generated note: "Removed by moderator"
   - Record the action in audit logs
   - Notify the content author: "Your post/comment was removed for violating community guidelines."
6. WHEN the Admin selects "Ignore," THE system SHALL mark the report as resolved and archive it.
7. WHEN the Admin selects "Warn User," THE system SHALL:
   - Send a system message: "Your recent content has been reported for violating guidelines. Please review our rules."
   - Add a warning flag to the user's profile
   - Mark the report as resolved
8. WHEN the Admin selects "Ban User," THE system SHALL:
   - Immediately ban the user from all communities
   - Hide all their content and posts
   - Send message: "You have been permanently banned from this platform for severe violations."
   - Log the ban in system audit logs
9. WHEN the Admin selects "Add to Watchlist," THE system SHALL:
   - Flag the user’s future activity for closer review
   - Notify moderators of all future submissions from that user
   - Mark the report as resolved
10. IF the Admin acts faster than the report is processed, THE system SHALL still allow action and update the report status.
11. IF the content has already been automatically removed by system filters, THE system SHALL display: "Automatically removed by system rules."

## Admin: Managing Community Settings

This journey describes how an Admin changes the governance of any community.

1. The Admin navigates to the community's main page and clicks "Manage Community."
2. THE system SHALL display a moderation panel with tabs: "General," "Moderators," "Settings," "Reports."
3. THE Admin SHALL update one or more settings:
   - Community title
   - Description
   - Public/Private status
   - Posting permissions (Members only, Moderators only)
   - Comment permissions
   - Minimum karma required to post
   - Minimum karma required to comment
4. WHEN the Admin changes the community status to "Private," THE system SHALL:
   - Hide the community from public discovery feeds
   - Allow access only to subscribed members and moderators
   - Block new subscription requests
5. WHEN the Admin adds or removes a moderator, THE system SHALL:
   - Add/remove their name from the moderator list
   - Log the change
   - Notify the user of their new status
6. WHEN the Admin changes the minimum karma threshold, THE system SHALL apply the new rule to all future posts and comments.
7. WHEN the Admin deletes a community, THE system SHALL:
   - Hide all content from all users
   - Archive all data for legal retention
   - Send a notification: "This community has been deleted by an administrator."
8. IF the Admin attempts to delete a community with more than 1000 subscribers, THE system SHALL require a secondary confirmation: "This community has 1000+ subscribers. Are you sure you want to permanently delete it?"
9. IF the Admin tries to make a community public while it contains banned content, THE system SHALL prevent change and notify: "This community contains unmoderated content. Clean all reports before making public."

## System: Daily Karma Updates and Post Ranking

This journey describes how background system processes maintain reputation and content visibility.

1. THE system SHALL run a daily karma calculation job at 02:00 UTC.
2. WHILe processing karma, THE system SHALL:
   - Calculate total upvotes received by each member's posts and comments
   - Subtract total downvotes received
   - Calculate Submission Ratio: (upvotes - downvotes) / total content submissions
   - Apply decay: karma = base_karma + (0.7 * recent_contribution_factor) - (0.2 * recent_report_count)
   - Store updated karma value in user profile
3. THE system SHALL update all user profiles with new karma scores by 03:00 UTC.
4. THE system SHALL trigger a daily post ranking job every 10 minutes.
5. WHILe ranking posts, THE system SHALL use the following formula:
   Score = log10(Upvotes + 1) + (AgeHours / 8)
   WHERE the post is younger than 24 hours, add 1 point per hour
   WHERE the post is older than 24 hours, subtract 0.5 points per hour
   WHERE the post has more than 500 votes, add bonus multiplier: 1.05
   WHERE the post has more than 15 comments, add bonus multiplier: 1.03
6. THE system SHALL sort all active posts by Score for "Hot" feed.
7. THE system SHALL sort all posts by CreationTimestamp for "New" feed.
8. THE system SHALL sort all posts by TotalUpvotes for "Top" feed.
9. THE system SHALL sort all posts by (Upvotes - Downvotes) for "Controversial" feed.
10. WHEN a post has more than 10 reports, THE system SHALL temporarily flag it as "Under Review" and remove it from "Hot" feed.
11. WHEN a user’s karma drops below 5, THE system SHALL restrict their ability to create new communities until karma exceeds 10.
12. WHERE a post is locked by a moderator, THE system SHALL override ranking and fix its position regardless of score.
13. IF a post has no votes and is older than 72 hours, THE system SHALL archive it from public feeds.

## System: Processing Private Messages and Notifications

This journey describes how the system handles private communications between users.

1. THE system SHALL monitor user actions for event triggers: new comments, replies, upvotes, follows, reports, bans.
2. WHEN an event occurs, THE system SHALL generate a notification for the affected users.
3. THE notification SHALL be saved to their notification inbox and marked unread.
4. THE system SHALL send an email notification for:
   - Email verification (once)
   - Account suspension/ban
   - Moderator action on their content
   - New reply to their comment or post, if they have email notifications enabled
5. THE system SHALL display in-app notification bell icon with red badge for unread alerts.
6. WHEN the Member clicks the notification bell, THE system SHALL show a scrollable list of notifications, with newest first.
7. WHEN the Member clicks a notification, THE system SHALL navigate to the relevant content and mark it as read.
8. WHEN a Member sends a private message, THE system SHALL:
   - Validate recipient is a Member and not banned
   - Limit message to 10,000 characters
   - Store message in secure private box
   - Send notification to recipient
   - Prevent spam: no more than 10 messages per hour per user
   - Show error: "You cannot send messages to this user (blocked or not a Member)" if invalid
9. IF a user receives 5+ complaints about their messages, THE system SHALL temporarily lock their messaging and notify: "Your messaging privileges are restricted due to complaints from other users."
10. WHERE a message contains prohibited terms (identified by system filters), THE system SHALL:
   - Block delivery
   - Log the attempted message
   - Notify sender: "Your message was blocked for containing inappropriate content."

