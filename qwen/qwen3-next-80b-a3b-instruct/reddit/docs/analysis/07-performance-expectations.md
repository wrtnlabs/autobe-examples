# Reddit-like Community Platform Requirements

## Service Overview

This is a social community platform designed to support user-generated content organized into topic-based communities. Users can create, share, and discuss content in a structured environment with reputation-based moderation and engagement mechanics.

## Business Model

The platform enables user-driven content curation and engagement without direct advertising. Long-term monetization may involve premium features or sponsored communities, but core functionality remains free and ad-free to maximize user participation and authenticity. Value is derived from network effects and user engagement metrics.

## User Actors

### Guest User

- Can browse public posts and communities
- Can view user profiles
- Can read comments
- Cannot create posts or comments
- Cannot vote or subscribe
- Cannot create accounts

### Member User

- Can perform all Guest actions
- Can register and create an account
- Can create and manage private communities
- Can submit text, link, and image posts
- Can upvote and downvote posts and comments
- Can comment on posts with nested replies
- Can subscribe and unsubscribe from communities
- Can view and manage their own profile and activity
- Can report inappropriate content
- Can view their karma score

### Admin User

- Can perform all Member actions
- Can delete any post or comment
- Can ban users from the platform
- Can remove or modify any community
- Can override voting systems in extreme cases
- Can access moderation audit logs
- Can manage system-wide content rules
- Can adjust system-wide performance settings

## Authentication System

### Registration Flow

- WHEN a user clicks "Sign Up", THE system SHALL display a registration form with email, username, and password fields.
- WHEN a user submits the registration form, THE system SHALL validate that:
  - Email is in valid format
  - Username is 3-20 characters and alphanumeric
  - Password is at least 8 characters
  - Username and email are not already in use
- WHEN validation passes, THE system SHALL create a new user account with default karma of 10.
- WHEN account is created, THE system SHALL send a confirmation email with verification link.
- WHEN user clicks the verification link, THE system SHALL activate account and log them in.
- WHERE email verification fails or times out, THE system SHALL allow user to request a new verification link.

### Login Flow

- WHEN a user clicks "Log In", THE system SHALL display a login form with email/username and password.
- WHEN user submits credentials, THE system SHALL validate against stored account data.
- WHEN credentials are valid, THE system SHALL generate a secure JWT token with 7-day expiration.
- WHEN token is generated, THE system SHALL store it in HttpOnly cookie and redirect to homepage.
- WHEN credentials are invalid, THE system SHALL display error message "Invalid email/username or password."
- WHERE account is unverified, THE system SHALL display "Please verify your email before logging in."
- WHERE account is banned, THE system SHALL display "Your account has been suspended." and prevent login.

### Session Management

- WHEN a user logs in, THE system SHALL maintain their session via HttpOnly cookie
- WHEN cookie expires (7 days), THE system SHALL require re-authentication
- WHEN user logs out, THE system SHALL invalidate the cookie immediately
- WHEN browser is closed, THE system SHALL NOT automatically log user in
- WHERE a user logs in from a new device, THE system SHALL log a security event
- WHEN multiple concurrent sessions exist, THE system SHALL allow all to remain active unless manually logged out

### Password Recovery

- WHEN a user clicks "Forgot Password", THE system SHALL display a form requesting email or username.
- WHEN submitted, THE system SHALL validate that the account exists.
- WHEN valid, THE system SHALL send a time-limited reset link (15-minute expiration).
- WHEN user clicks the link, THE system SHALL display password reset form.
- WHEN new password is submitted, THE system SHALL validate strength (min 8 chars) and update account.
- WHEN password is updated, THE system SHALL invalidate all existing sessions.
- WHERE reset link expires, THE system SHALL display "Link expired. Request a new one."

## Core Functional Requirements

### Community Creation and Management

- WHEN a Member User clicks "Create Community", THE system SHALL display a form with title, description, and topic category.
- WHEN form is submitted, THE system SHALL validate:
  - Title is 2-30 characters
  - Description is up to 200 characters
  - Community name is unique
  - User has not created more than 5 communities in the last 30 days
- WHEN validation passes, THE system SHALL create the community with creator as admin.
- WHEN community is created, THE system SHALL automatically subscribe the creator.
- WHEN a community creator deletes their own community, THE system SHALL:
  - Archive all posts and comments
  - Notify all subscribers
  - Remove the community from public listings
- WHERE an admin suspends a community, THE system SHALL:
  - Hide all content from public view
  - Notify subscribers
  - Prevent new posts or comments

### Post Creation and Types

- WHEN a Member User creates a post, THE system SHALL allow three content types: Text, Link, Image.
- WHEN selecting "Text", THE system SHALL require:
  - Title (max 300 characters)
  - Body (max 10,000 characters)
- WHEN selecting "Link", THE system SHALL require:
  - Title (max 300 characters)
  - Valid URL (http/https) with domain validation
- WHEN selecting "Image", THE system SHALL require:
  - Title (max 300 characters)
  - Image file (PNG, JPG, GIF up to 10MB)
- WHEN a post is submitted, THE system SHALL store it in the target community.
- WHEN a post is created, THE system SHALL assign it a unique ID and initial score of 0.
- WHERE a post violates community rules, THE system SHALL flag it for moderation.
- WHERE a post contains invalid content (malformed URL, unsupported image), THE system SHALL reject it with error.
- WHEN a user edits their own post, THE system SHALL preserve original timestamp and add "[Edited]" marker.
- WHEN a user deletes their own post, THE system SHALL:
  - Remove the post from public feed
  - Retain data for moderation purposes
  - Notify community admins

### Upvote/Downvote System

- WHEN a Member User upvotes a post, THE system SHALL:
  - Increase the post's score by 1
  - Record the vote against their user ID
  - Prevent duplicate votes
  - If user previously downvoted, revert that downvote and apply upvote (net +2)
- WHEN a Member User downvotes a post, THE system SHALL:
  - Decrease the post's score by 1
  - Record the vote against their user ID
  - Prevent duplicate votes
  - If user previously upvoted, revert that upvote and apply downvote (net -2)
- WHEN a user attempts to vote on own content, THE system SHALL block the action and display "You cannot vote on your own posts."
- WHEN a post reaches a score of 100+, THE system SHALL label it as "Popular".
- WHEN a post reaches a score of -100+, THE system SHALL label it as "Neglected".
- WHEN a user revokes their vote, THE system SHALL immediately adjust the post score and remove their vote record.
- WHEN a vote is recorded, THE system SHALL update the post's total score and voting indicator visually within 200 milliseconds.

### Commenting and Nested Replies

- WHEN a Member User clicks "Comment" on a post, THE system SHALL display comment input field.
- WHEN comment is submitted, THE system SHALL:
  - Attach it to the post
  - Assign it an author ID and timestamp
  - Set parent ID to the post ID
  - Assign initial score of 0
- WHEN a user replies to a comment, THE system SHALL:
  - Set the child comment's parent ID to the target comment ID
  - Maintain thread structure
  - Support up to 5 levels of nesting
- WHEN a comment is deleted, THE system SHALL:
  - Mark it as "[Deleted]" for non-admins
  - Hide replies from non-admins unless they are still visible
  - Retain data for moderation logs
- WHEN a comment is edited, THE system SHALL:
  - Preserve original timestamp
  - Append "[Edited]" marker
  - Save edit history for admins
- WHERE a comment violates community rules, THE system SHALL allow admins to hide it without deletion.
- WHEN a user replies to a deleted comment, THE system SHALL allow the reply and display "[Comment deleted]" as parent.

### Karma System

- WHEN a user registers, THE system SHALL assign initial karma of 10.
- WHEN a user receives an upvote on a post, THE system SHALL add 1 karma point.
- WHEN a user receives a downvote on a post, THE system SHALL subtract 1 karma point.
- WHEN a user receives an upvote on a comment, THE system SHALL add 1 karma point.
- WHEN a user receives a downvote on a comment, THE system SHALL subtract 1 karma point.
- WHEN a user's post or comment is deleted by mod, THE system SHALL NOT affect karma.
- WHERE a user reports content and it is confirmed as violation, THE system SHALL add 5 karma points to their score.
- WHEN any karma change occurs, THE system SHALL update the user's display score in real-time.
- WHEN a user's total karma reaches 1000, THE system SHALL award "Trusted Contributor" badge.
- WHEN a user's total karma reaches 5000, THE system SHALL award "Community Leader" badge.
- WHEN a user's total karma drops below 0, THE system SHALL display "Karma: -x" but allow continued participation.
- WHERE a user engages in vote farming, THE system SHALL flag for review but not automatically penalize.

### Post Sorting

- WHEN user selects "New", THE system SHALL sort posts by creation timestamp descending.
- WHEN user selects "Top", THE system SHALL sort posts by total score descending.
- WHEN user selects "Hot", THE system SHALL sort posts by a weighted algorithm combining:
  - Score (70% weight)
  - Time since creation (30% weight, decayed exponentially)
  - Number of active comments (bonus boost)
- WHEN user selects "Controversial", THE system SHALL sort by:
  - Ratio of upvotes to downvotes
  - Absolute vote count (minimum 50 votes required)
  - Highest difference between up and down votes
- WHEN sorting changes, THE system SHALL reload the community feed with new order within 500 milliseconds.
- WHERE a user's sort preference is unset, THE system SHALL default to "Hot".
- WHEN a user switches communities, THE system SHALL retain their personal sort preference.

### Subscription System

- WHEN a Member User clicks "Subscribe" on a community, THE system SHALL:
  - Add user to community subscriber list
  - Display "Subscribed" button state
  - Add the community to user's subscribed feed
- WHEN a Member User clicks "Unsubscribe" on a community, THE system SHALL:
  - Remove user from community subscriber list
  - Display "Subscribe" button state
  - Remove the community from user's subscribed feed
- WHEN a user visits a community, THE system SHALL show their subscription status.
- WHEN a user views their profile, THE system SHALL display a list of all subscribed communities.
- WHEN a subscribed community has new posts, THE system SHALL show a notification indicator.
- WHERE a community is archived or deleted, THE system SHALL auto-unsubscribe all users and notify them.

### User Profiles

- WHEN a user visits any profile page, THE system SHALL display:
  - Username and avatar
  - Join date
  - Total karma score
  - Badges earned
  - Tab: "Posts" showing all posts by user (sorted by newest)
  - Tab: "Comments" showing all comments by user (sorted by newest)
  - Tab: "Subscribed Community" showing communities the user follows
- WHEN a user clicks on their own post in their profile, THE system SHALL navigate directly to the post.
- WHEN a user clicks on their own comment, THE system SHALL navigate to the parent post with that comment highlighted.
- WHERE another user has blocked this user, THE system SHALL hide their content from display.
- WHERE a user's account is banned, THE system SHALL display "Account suspended" and hide all content.
- WHEN a user edits their bio in profile settings, THE system SHALL update displayed text immediately.

### Content Reporting

- WHEN a user clicks "Report" on a post or comment, THE system SHALL display modal with reason options:
  - Spam
  - Harassment
  - Inaccurate information
  - Hate speech
  - Nudity or sexual content
  - Violent content
  - Other (text field)
- WHEN report is submitted, THE system SHALL:
  - Record report with timestamp and user ID
  - Mark content as "Under Review"
  - Notify mod team
  - Add 1 to report count for that content
- WHEN a report reaches threshold of 5 from unique accounts, THE system SHALL trigger automatic content review.
- WHEN an admin reviews content, THE system SHALL allow admin to:
  - Dismiss report
  - Remove content
  - Suspend user
  - Add moderator note
- WHEN a content report is dismissed, THE system SHALL clear "Under Review" status.
- WHEN content is removed, THE system SHALL notify reporter that action was taken.
- WHERE a user submits 5 false reports within 30 days, THE system SHALL temporarily lock reporting privileges.

## User Scenarios

### New User Journey

- WHEN a new user visits the platform, THE system SHALL display homepage with trending communities.
- WHEN user clicks "Sign Up", THE system SHALL present registration form.
- WHEN user completes registration, THE system SHALL send verification email.
- WHEN user verifies email, THE system SHALL automatically log them in.
- WHEN user views first community, THE system SHALL show top posts.
- WHEN user upvotes a post, THE system SHALL visually highlight vote and increase their karma by 1.
- WHEN user comments for first time, THE system SHALL display success message "Your comment has been posted!"
- WHERE user tries to post without being registered, THE system SHALL redirect to registration.

### Active Member Journey

- WHEN member logs in, THE system SHALL display personalized feed based on subscribed communities.
- WHEN member discovers new community, THE system SHALL allow one-click subscription.
- WHEN member sees controversial content, THE system SHALL apply "Controversial" sorting and show vote ratio.
- WHEN member creates post, THE system SHALL prompt selection of content type (Text/Link/Image).
- WHEN member receives upvotes on a post, THE system SHALL update karma and badge status if threshold is met.
- WHEN member replies to nested comments, THE system SHALL maintain conversation threading.
- WHEN member reports content, THE system SHALL guide through reason selection and confirm submission.
- WHEN member edits a post, THE system SHALL preserve original content while marking edit.

### Admin Moderation Journey

- WHEN admin logs in, THE system SHALL display moderator dashboard with pending reports.
- WHEN admin views flagged content, THE system SHALL show history of reports and timestamps.
- WHEN admin removes a post, THE system SHALL hide it from public view and notify affected users.
- WHEN admin bans a user, THE system SHALL revoke all sessions and archive content.
- WHEN admin changes community rules, THE system SHALL notify subscribers of update.
- WHEN admin dismisses a report, THE system SHALL record reason and clear flag.

### Community Creation Journey

- WHEN user decides to create community, THE system SHALL display creation wizard.
- WHEN user enters title "r/photography", THE system SHALL check for uniqueness.
- WHEN user adds description "A place for sharing and discussing photography techniques.", THE system SHALL validate length.
- WHEN user selects category "Arts", THE system SHALL assign correct taxonomy.
- WHEN community is created, THE system SHALL auto-subscribe the creator.
- WHEN first post is made, THE system SHALL notify the creator of initial engagement.

### Content Reporting Journey

- WHEN user finds inappropriate comment, THE system SHALL display red "Report" button.
- WHEN user clicks "Report", THE system SHALL show reason options.
- WHEN user selects "Hate speech" and submits, THE system SHALL record report and show confirmation.
- WHEN report count reaches 5, THE system SHALL move content to moderation queue.
- WHEN admin reviews and removes content, THE system SHALL notify reporter and clear flag.
- WHERE report is false, THE system SHALL notify user "Your report was not upheld."

## Performance Expectations

### Page Load Times

- WHEN a user navigates to the homepage, THE system SHALL render the initial page content within 1.5 seconds.
- WHEN a user navigates to a specific community page, THE system SHALL render the community's main feed within 2.0 seconds.
- WHEN a user visits a user profile page, THE system SHALL render the profile information and activity feed within 2.5 seconds.
- WHILE a user waits for page content to load, THE system SHALL display a placeholder skeleton UI with progressive content loading indicators.
- WHERE a user has a slow internet connection (3G or slower), THE system SHALL still load core content within 3.5 seconds by prioritizing text over images.

### Content Delivery Speed

- WHEN a user scrolls through a post feed, THE system SHALL serve the next batch of 15 posts within 500 milliseconds of reaching the end of the current content.
- WHEN a user clicks to load more comments on a post with nested replies, THE system SHALL display the next level of replies within 400 milliseconds.
- WHEN a user opens a post containing an image, THE system SHALL display the image thumbnail within 1.8 seconds of the post rendering.
- WHILE a user is viewing a page, THE system SHALL continue to serve additional content as requested without introducing noticeable pauses or delays.
- WHERE a resource fails to load (image, script, stylesheet), THE system SHALL still render the surrounding content and display an appropriate placeholder indicator.

### User Interaction Responses

- WHEN a user upvotes or downvotes a post, THE system SHALL provide visual feedback (like color change or icon update) within 200 milliseconds.
- WHEN a user clicks the comment button on a post, THE system SHALL reveal the comment input field within 300 milliseconds.
- WHEN a user submits a comment, THE system SHALL display the new comment in the thread within 1.2 seconds.
- WHEN a user clicks on a community name to subscribe or unsubscribe, THE system SHALL update the subscription state visually within 500 milliseconds.
- WHEN a user searches for a community or post using the global search, THE system SHALL display the first results within 1.0 second of typing.

### Search Performance

- WHEN a user performs a direct search for a community name or post title, THE system SHALL return results for exact matches instantly (within 400 milliseconds on average).
- WHEN a user performs a partial search with 3 or more characters, THE system SHALL show type-ahead suggestions within 600 milliseconds.
- WHEN a user applies filters to search results (e.g., sort by top, new, recent), THE system SHALL re-render the results within 800 milliseconds.
- WHILE a search is in progress, THE system SHALL display a "searching..." indicator to prevent duplicate submissions.
- WHERE a search query returns no results, THE system SHALL display a helpful suggestion message within 1.2 seconds.

### Edit and Update Latency

- WHEN a user edits their own post or comment, THE system SHALL save the changes and reflect the updated content in the feed within 1.5 seconds.
- WHEN a user deletes their own post or comment, THE system SHALL remove it from all views within 2.0 seconds.
- WHEN an admin edits or removes content (post, comment, community), THE system SHALL propagate the update across all cached views within 3.5 seconds.
- WHILE a user is editing content in a form field, THE system SHALL save auto-drafts every 30 seconds without interrupting user input.

### Upload Processing Times

- WHEN a user uploads an image file (PNG, JPG under 10MB), THE system SHALL begin displaying the preview within 2.5 seconds of file selection.
- WHILE an image is uploading, THE system SHALL display a progress bar with realistic percentage estimation.
- WHEN an image upload completes, THE system SHALL generate and store all required thumbnails and variants within 10 seconds.
- WHERE a user uploads a file that exceeds size limits or has unsupported format, THE system SHALL reject it immediately with clear feedback before any processing begins.
- WHEN a user attempts to upload multiple images at once (batch upload), THE system SHALL process each file independently and report individual success/failure status within 15 seconds for a batch of 5 images.

### Core System Performance

- WHILE the system is actively processing user requests, THE system SHALL maintain a response rate of at least 1,000 concurrent requests per second across all endpoints.
- WHEN multiple users perform concurrent actions (e.g., 500 users upvoting simultaneously), THE system SHALL ensure each individual action completes without introducing latency beyond the specified thresholds above.
- WHEN the system is under peak load (e.g., trending posts with 10,000+ concurrent viewers), THE system SHALL maintain functional integrity and continue serving content as defined in the requirements above.
- WHILE a background job (e.g., Karma recalculations, reporting processing) is running, THE system SHALL not impact any of the user-facing performance thresholds.
- WHERE a critical system service becomes unavailable, THE system SHALL continue serving cached content to maintain availability of core features until normal operation resumes.

### User Experience Consistency

- THE system SHALL provide a consistent perception of speed and responsiveness across all supported devices (desktop, tablet, mobile).
- WHEN a feature requires network communication, THE system SHALL prioritize user feedback over network roundtrip time—visual feedback must precede server confirmation.
- WHERE a user performs an action with multiple expected outcomes (e.g., upvote + comment), THE system SHALL sequence feedback intelligently to avoid overwhelming the user.
- WHILE a user navigates between pages or features, THE system SHALL reuse cached assets to minimize repeated requests and maintain perceived performance.
- THE system SHALL never introduce latency spikes that cause users to experience delays greater than 5 seconds for any interaction.

## Error Handling

### Authentication Errors

- WHEN login credentials are invalid, THE system SHALL display "Invalid email/username or password."
- WHEN registration email is invalid, THE system SHALL display "Enter a valid email address."
- WHEN username is taken, THE system SHALL display "This username is already in use."
- WHEN email is taken, THE system SHALL display "An account with this email already exists."
- WHEN password is too short, THE system SHALL display "Password must be at least 8 characters."
- WHEN an unverified user attempts login, THE system SHALL display "Please verify your email before logging in."
- WHEN a banned user attempts login, THE system SHALL display "Your account has been suspended."

### Content Validation Errors

- WHEN post title is too long, THE system SHALL display "Title must be 300 characters or less."
- WHEN comment body is too long, THE system SHALL display "Comment must be 5,000 characters or less."
- WHEN URL is malformed, THE system SHALL display "Please enter a valid URL starting with http:// or https://."
- WHEN image file exceeds size limit, THE system SHALL display "Image must be under 10MB."
- WHEN image format is unsupported, THE system SHALL display "Only JPG, PNG, and GIF files are allowed."
- WHEN community title is too short, THE system SHALL display "Community name must be at least 2 characters."
- WHEN community description is too long, THE system SHALL display "Description must be 200 characters or less."
- WHEN community name contains invalid characters, THE system SHALL display "Community names can only contain letters, numbers, and underscores."

### Rate Limiting

- WHEN a user submits more than 5 posts in 1 minute, THE system SHALL display "You are posting too quickly. Please wait before trying again."
- WHEN a user submits more than 10 comments in 1 minute, THE system SHALL display "You are commenting too quickly. Please wait before trying again."
- WHEN a user upvotes/downvotes more than 5 actions in 30 seconds, THE system SHALL display "You are voting too quickly. Please wait before trying again."
- WHEN a user submits 10 reports within 10 minutes, THE system SHALL display "You have reported too recently. Please wait before submitting another report."
- WHEN a user fails to log in 10 times within 15 minutes, THE system SHALL temporarily lock account for 1 hour.

### System Failures

- WHEN the database fails to respond, THE system SHALL display "We're currently experiencing technical difficulties. Please try again later."
- WHEN the image processing service is down, THE system SHALL allow text and link posts only, and display "Image uploads temporarily unavailable."
- WHEN the search service is unavailable, THE system SHALL display "Search is temporarily unavailable. You can still browse communities."
- WHEN the moderation queue is overloaded, THE system SHALL continue accepting reports and display "All reports are being reviewed. We appreciate your patience."

### Conflict Resolution

- WHEN two users edit the same post simultaneously, THE system SHALL:
  - Save the second edit
  - Notify the user "This post has been modified by someone else. Your changes have been saved as a new version."
  - Preserve both versions in edit history for admin review
- WHEN two users upvote the same post within the same millisecond, THE system SHALL ensure atomic increment.
- WHEN a user is banned while posting a comment, THE system SHALL still save the comment as "[User suspended]" and flag for moderation.

### Recovery Procedures

- WHEN a user loses internet while editing, THE system SHALL save draft locally (browser storage).
- WHEN user reconnects, THE system SHALL restore draft and offer "Resume editing" button.
- WHEN a user deletes a post by accident, THE system SHALL allow recovery for 1 hour (via profile undo button).
- WHEN a comment is accidentally deleted, THE system SHALL restore it if within 5 minutes (admin only).
- WHEN user's karma disappears due to system bug, THE system SHALL automatically fix and notify user.

## Security and Compliance

### Data Privacy

- THE system SHALL not collect any PII beyond email address, username, and password salt.
- THE system SHALL store passwords encrypted with bcrypt.
- THE system SHALL not share user data with third parties unless legally required.
- THE system SHALL allow users to export their data in JSON format.
- THE system SHALL allow users to delete their account and permanently remove all associated data.
- THE system SHALL not use cookies for tracking beyond authentication.
- WHERE a user requests deletion, THE system SHALL anonymize all associated posts and comments in public view.

### Content Moderation

- THE system SHALL implement automated keyword filtering for hate speech and prohibited terms.
- THE system SHALL allow users to privately report content without exposing identity to the content creator.
- THE system SHALL allow admins to view all report history with timestamps and user IDs.
- THE system SHALL prohibit automated moderation decisions that result in permanent bans without human review.
- THE system SHALL log all content changes by admins with reason and timestamp.
- THE system SHALL display moderation notes to users in flagged content.

### Access Control

- THE system SHALL enforce role-based access using actor-based permissions.
- THE system SHALL deny access to all admin functions for non-admin users.
- THE system SHALL prevent users from viewing reports of any kind unless logged in.
- THE system SHALL ensure only post owner or admin can delete content.
- THE system SHALL prevent guest users from accessing any API endpoints that require authentication.
- THE system SHALL validate all API requests against user authentication context.

### Audit Logging

- THE system SHALL maintain immutable logs for all moderation actions.
- THE system SHALL log all user account changes (registration, login, deletion).
- THE system SHALL log all post and comment creation, editing, and deletion.
- THE system SHALL log all reports received and their status (pending/reviewed/dismissed/removed).
- THE system SHALL log all changes to community rules or settings.
- THE system SHALL allow admins to search audit logs by user, date, or action type.
- THE system SHALL restrict audit log access to admin users only.

### Regulatory Compliance

- THE system SHALL comply with GDPR by providing:
  - Data access and portability
  - Account deletion
  - Clear privacy policy
  - Consent for data collection
- THE system SHALL comply with COPPA by blocking users under 13 from registration (age verification via email)
- THE system SHALL comply with DMCA by providing a copyright claim form for takedown requests
- THE system SHALL comply with CCPA by providing "Do Not Sell My Info" option

## Business Rules and Constraints

### Content Rules

- SHALL prohibit: 
  - Threats, violence, or incitement
  - Hate speech targeting protected characteristics
  - Nudity or pornography
  - Harassment or doxxing
  - Impersonation of others
  - Copyright infringement
  - Spam or automated content
- SHALL require:
  - Community-specific rules to be visible to users
  - All reports to include a reason
  - User reports to be anonymous from content creators
- SHALL allow:
  - Satire and opinion
  - Controversial discussion
  - Nudity in educational/artistic context (with explicit warning)

### Karma Rules

- SHALL award +1 karma for upvotes on posts or comments
- SHALL deduct -1 karma for downvotes on posts or comments
- SHALL award +5 karma to users who submit reports that lead to content removal
- SHALL not change karma for deleted content
- SHALL cap karma changes per user per day at +50 from upvotes and -50 from downvotes
- SHALL prevent karma from being manipulated by user-controlled bots
- SHALL apply karma changes only after content has been successfully saved

### Community Rules

- SHALL limit community creation to 5 per user per 30 days
- SHALL require community names to be lowercase, alphanumeric, hyphen/underscore only
- SHALL prevent community names matching existing platform keywords ("home", "top", "new", "admin")
- SHALL require community description to be non-empty
- SHALL allow community owners to:
  - Set custom rules
  - Add co-admins
  - Customize theme color
  - Pin posts
  - Hide comments
- SHALL prohibit:
  - Hiding comments without moderator approval
  - Banning users without cause
  - Selling community access

### Reporting Rules

- SHALL require 5 unique user reports to trigger auto-review
- SHALL limit each user to 5 reports per 24 hours
- SHALL prevent users from reporting their own content
- SHALL allow users to withdraw reports within 1 hour
- SHALL allow only admin users to dismiss reports
- SHALL notify reporter when report is handled
- SHALL track false report patterns and temporarily suspend reporting privileges

### System Limits

- SHALL limit image uploads to 10MB maximum
- SHALL limit post title to 300 characters
- SHALL limit post body to 10,000 characters
- SHALL limit comment body to 5,000 characters
- SHALL limit community title to 30 characters
- SHALL limit community description to 200 characters
- SHALL restrict comment nesting to 5 levels deep
- SHALL process a maximum of 10 images per upload batch
- SHALL allow a maximum of 500 community subscriptions per user

> *Developer Note: This document defines complete business requirements and workflows. All technical implementation details (database schema, endpoints, architecture patterns) are derived from this specification by downstream pipeline agents. This document is the single source of truth for backend development.*