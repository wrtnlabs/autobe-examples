# Community Platform Requirements Analysis

## Service Summary

### Service Vision
The Community Platform aims to create a decentralized, user-controlled environment for niche interest communities to thrive through authentic engagement rather than algorithmic manipulation. Unlike centralized social media platforms that prioritize engagement at the cost of community health, this platform empowers users to create, moderate, and govern their own communities, fostering meaningful interaction over passive consumption.

### Target Audience
- Casual internet users seeking meaningful community engagement
- Niche interest groups requiring specialized discussion spaces
- Content creators wanting to build dedicated audiences
- Moderators seeking tools to manage community health
- Community leaders administering niche interests
- Privacy-conscious users avoiding corporate surveillance

### Core Purpose
Provide an open platform for users to form, participate in, and moderate topic-based communities with:
- User-controlled content moderation
- Karma-based reputation system
- Community-driven content ranking
- Transparent governance
- Decentralized ownership

### Unique Value Proposition
- Users own their communities and content
- No algorithmic manipulation of content visibility
- Transparent moderation and reporting systems
- Revenue-sharing opportunities for community creators
- Zero advertising on user timelines (premium option)
- Open, non-corporate ethos

## Business Model

### Revenue Model

The CommunityPlatform will generate revenue through a multi-stream monetization strategy designed to preserve community integrity while enabling sustainable growth.

#### Advertising
THE system SHALL enable targeted display advertising within community feeds and sidebars.

WHEN a member views a community feed, THE system SHALL display one non-intrusive banner advertisement per 20 posts.

WHERE a community has more than 10,000 active members, THE system SHALL allow community moderators to opt into higher-revenue advertising formats, including native-sponsored posts labeled as "Sponsored by [Brand]".

WHILE advertising is active, THE system SHALL NOT display advertisements on posts or comments marked as "NSFW" or "Adult Content".

WHERE an admin has enabled premium advertising for a community, THE system SHALL permit brands to target audiences based on community interests, karma levels, and posting frequency.

#### Premium Membership

WHEN a member subscribes to Premium membership, THE system SHALL remove all advertisements from their view and provide exclusive features.

THE system SHALL offer a monthly Premium subscription for $4.99 with annual billing at $49.99 (20% discount).

WHEN a member subscribes to Premium, THE system SHALL unlock the following benefits:
- Ability to create up to 5 additional communities (standard limit is 1)
- Enhanced profile customization with custom badges and themes
- Priority content moderation response for reported posts they create
- Access to advanced analytics on post engagement and audience demographics
- Early access to new features before public rollout

WHILE a Premium subscription is active, THE system SHALL display a badge next to the member's username indicating "Premium Member".

THE system SHALL NOT offer free trials for Premium membership.

#### Community Monetization

WHEN a community reaches 5,000+ monthly active members and has been active for 90+ days, THE system SHALL enable the community owner to apply for direct revenue sharing.

WHERE a community is approved for revenue sharing, THE system SHALL distribute 70% of advertising revenue generated from that community directly to its moderators and community contributors.

WHILE a community earns revenue, THE system SHALL display a "Revenue Share Enabled" badge on the community banner.

THE system SHALL cap individual community revenue shares at $2,000 per month until the platform's infrastructure scales to support higher tiers.

### User Acquisition Strategy

THE system SHALL attract initial users by leveraging the following organic growth mechanisms:

WHEN a user creates a community, THE system SHALL automatically invite their existing contacts (via email or social connections) to join and participate.

WHILE a user actively posts or comments in 3+ communities, THE system SHALL generate personalized "You're being followed" notifications inviting other users to subscribe.

WHERE a user creates a community about a trending topic (determined by real-time keyword analysis), THE system SHALL promote that community on the "Hot Communities" homepage section.

WHEN a user refers a friend who registers and creates at least one post, THE system SHALL grant both users 500 karma points.

THE system SHALL partner with influencers and niche content creators in subcultures (e.g., retro gaming, indie music, local history) to seed 50 high-quality communities in the first 6 months.

WHILE a community gains 100+ subscribers within 7 days of creation, THE system SHALL grant the creator "Founding Member" status and a special badge.

### Growth Plan

THE system SHALL achieve sustainable growth through the following strategic levers:

WHEN a user subscribes to a community, THE system SHALL immediately notify them of new posts via push notification or email (user-configurable).

WHILE a member has been active for 30+ days, THE system SHALL automatically suggest 5 additional communities based on their posting history, voting patterns, and subscription behavior.

THE system SHALL implement a "Community of the Week" spotlight program that features a high-quality community across email newsletters and social media channels.

WHERE a community achieves 5,000+ members and maintains 90%+ content moderation compliance rate for 60 days, THE system SHALL offer the community creators an invite to a private developer forum for platform feedback and early feature access.

WHEN a user reports 5+ pieces of inappropriate content that are successfully removed, THE system SHALL award them "Helpful Reporter" status and bonus karma.

THE system SHALL introduce monthly "Community Awards" recognizing categories like "Most Innovative", "Best Discussion", and "Most Welcoming", which are voted on by members and accompanied by promotional content.

WHILE the platform grows beyond 1M users, THE system SHALL roll out localized language communities (e.g., "r/japanese" or "r/france") based on user language preferences to expand international adoption.

### Success Metrics

THE system SHALL measure success using the following key performance indicators:

WHEN a new user registers, THE system SHALL capture their source (e.g., referral, organic search, social media) and associate it with their account.

WHILE a user is active, THE system SHALL track:
- Number of communities subscribed to
- Daily posts and comments created
- Total upvotes received
- Average time spent per session

THE system SHALL report the following weekly KPIs:

| Metric | Target (Month 1) | Target (Year 1) | Target (Year 3) |
|--------|------------------|------------------|------------------|
| Monthly Active Users (MAU) | 50,000 | 500,000 | 10,000,000 |
| Average Session Duration | 8 minutes | 12 minutes | 15 minutes |
| Posts per Active User | 0.5 | 1.2 | 2.5 |
| Community Creation Rate | 100/week | 800/week | 5,000/week |
| Premium Conversion Rate | 1.5% | 3.5% | 5.0% |
| Revenue per MAU | $0.01 | $0.10 | $0.35 |
| Retention (Day 30) | 25% | 40% | 50% |

THE system SHALL calculate Community Health Score as:

"Community Health Score" = (Active Members / Total Members) × 0.4 + (Upvote-to-Downvote Ratio) × 0.3 + (Content Reported / Total Posts) × 0.2 + (New Subscribers / Total Subscribers) × 0.1

THE system SHALL flag communities with a Health Score below 0.3 for moderator review.

THE system SHALL generate a quarterly "Platform Impact Report" that includes:
- Total content created
- Total user reports resolved
- Revenue distributed to communities
- Most engaged topic clusters
- Growth by geographic region

WHEN a community achieves 10,000+ members, THE system SHALL automatically generate a public "Success Story" case study using anonymized user data and distribute it via blog and social channels.

WHILE revenue shares are distributed to community creators, THE system SHALL calculate and display the "Total Money Made by Community" next to the revenue share badge.

THE system SHALL consider the platform successful if:

- MAU exceeds 1M within 18 months
- Premium revenue exceeds $200K annually by Year 2
- Top 100 communities earn over $500 each per month from revenue sharing
- 70% of users have created at least one community or post
- Retention rate reaches 45% at 90 days

All metrics SHALL be displayed in real-time dashboards available to platform administrators and investors.

## User Actors

### Guest User

The guest user represents unauthenticated visitors to the platform who can observe public content but cannot interact with the community system or create content. This is the initial state for all users before registration.

- THE system SHALL allow guests to view all public community pages and posts.
- THE system SHALL allow guests to view member profiles and their post/comment history.
- THE system SHALL allow guests to view search results for community content.
- WHEN a guest attempts to create a post, THE system SHALL deny the request and display a prompt to register or login.
- WHEN a guest attempts to comment on a post, THE system SHALL deny the request and display a prompt to register or login.
- WHEN a guest attempts to upvote or downvote a post or comment, THE system SHALL deny the request and display a prompt to register or login.
- WHEN a guest attempts to subscribe to a community, THE system SHALL deny the request and display a prompt to register or login.
- WHEN a guest attempts to report inappropriate content, THE system SHALL display a prompt to register or login with explanation that reporting requires an account.
- WHILE a guest is viewing content, THE system SHALL NOT display any action buttons for posting, commenting, voting, or subscribing.
- WHEN a guest navigates to their profile URL, THE system SHALL redirect to the registration/login page.
- WHEN a guest attempts to access community creation functionality, THE system SHALL deny access and display a message: "Create communities requires a registered account. Please register or login."
- IF a guest has not been active on the site for 30 days, THE system SHALL still allow re-visit but maintain guest status until registration.
- WHERE a community has restricted access (private community), THE system SHALL deny access to guests even if they discover the URL.
- WHERE a post has age restrictions, THE system SHALL hide the content from guests and display a message: "This content requires account verification to view."
- THE system SHALL offer a clear path for guests to register through prominent call-to-action buttons on all public pages.

### Member User

The member user is an authenticated user who has completed registration and email verification. Members have full participation rights in the community system with capabilities to create, share, and engage with content.

- WHEN a user successfully registers and verifies their email, THE system SHALL promote them to member status.
- THE system SHALL allow members to create new communities.
- WHEN a member creates a community, THE system SHALL assign them as the initial moderator of that community.
- THE system SHALL allow members to post text, link, or image content to communities.
- THE system SHALL allow members to upvote or downvote any post in any community.
- THE system SHALL allow members to upvote or downvote any comment on any post.
- WHEN a member upvotes a post, THE system SHALL increment the post's upvote count and display the updated score.
- WHEN a member downvotes a post, THE system SHALL increment the post's downvote count and display the updated score.
- WHEN a member upvotes a comment, THE system SHALL increment the comment's upvote count and display the updated score.
- WHEN a member downvotes a comment, THE system SHALL increment the comment's downvote count and display the updated score.
- THE system SHALL allow members to comment on any post in any community.
- WHEN a member comments on a post, THE system SHALL allow nested replies to that comment up to 5 levels deep.
- WHEN a member replies to a comment, THE system SHALL display the reply nested beneath the parent comment.
- THE system SHALL display a karma score for each member based on their engagement history.
- WHEN a member upvotes a post or comment, THE system SHALL increment their karma by 1.
- WHEN a member downvotes a post or comment, THE system SHALL decrement their karma by 0.5.
- WHEN a comment receives an upvote, THE system SHALL increment the original author's karma by 2.
- WHEN a post receives an upvote, THE system SHALL increment the author's karma by 5.
- WHEN a member receives a downvote on their content, THE system SHALL decrement their karma by 1 for each downvote.
- THE system SHALL allow members to subscribe to communities of interest.
- WHEN a member subscribes to a community, THE system SHALL add that community to their "Subscribed Communities" list and show it in their feed.
- THE system SHALL allow members to view their own profile page containing their posts, comments, karma score, and subscribed communities.
- WHEN a member views their profile, THE system SHALL display their 10 most recent posts and comments.
- THE system SHALL allow members to report inappropriate content.
- WHEN a member reports inappropriate content, THE system SHALL log the report and notify administrative team.
- WHILE a member is logged in, THE system SHALL display access to all member features including posting, commenting, voting, subscription, and reporting.
- WHERE a member has been previously banned from a community, THE system SHALL prevent them from posting or commenting in that specific community.
- THE system SHALL prevent members from creating communities if their account has been flagged for abuse in the last 30 days.

### Admin User

The admin user is a system administrator with elevated privileges to maintain platform integrity, moderate content, and manage user behavior. Admin privileges are granted by system oversight and are not attainable through normal user progression.

- WHEN a user is promoted to admin status by system administrators, THE system SHALL grant them all administrative privileges.
- THE system SHALL allow admins to view all user reports, regardless of community or user.
- THE system SHALL allow admins to review all reported content, including posts, comments, and community descriptions.
- WHEN an admin reviews reported content, THE system SHALL permit them to take actions: approve, delete, or flag for review.
- THE system SHALL allow admins to delete any post or comment on any community regardless of the author.
- WHEN an admin deletes content, THE system SHALL log the deletion with admin ID, timestamp, and reason.
- THE system SHALL allow admins to ban any user from the entire platform.
- WHEN a user is banned from the platform, THE system SHALL remove all their content from public display and prevent any future access.
- THE system SHALL allow admins to unban previously banned users.
- WHEN a user is unbanned, THE system SHALL restore their account status but maintain their existing karma and content (unless deleted).
- THE system SHALL allow admins to temporarily suspend users from posting or commenting on the platform while retaining account access.
- THE system SHALL allow admins to permanently remove a user's karma history.
- THE system SHALL allow admins to adjust any user's karma score up or down.
- THE system SHALL allow admins to create new communities on behalf of the platform.
- THE system SHALL allow admins to promote any member to moderator role for a specific community.
- THE system SHALL allow admins to demote moderators back to regular member status.
- THE system SHALL allow admins to change community settings: make public communities private, and private communities public.
- THE system SHALL allow admins to rename any community.
- THE system SHALL allow admins to merge two communities.
- THE system SHALL allow admins to delete and archive communities.
- THE system SHALL allow admins to view detailed analytics for any community: engagement rates, growth trends, reporting statistics.
- WHEN an admin makes any system-level change to user status or data, THE system SHALL generate an audit log entry.
- WHILE an admin is performing moderation actions, THE system SHALL display warnings for permanent actions like delete and ban.
- WHERE a community has no active moderators, THE system SHALL notify the admin team automatically.
- WHERE a user has multiple reports in a 24-hour period, THE system SHALL auto-flag for admin review.
- THE system SHALL allow admins to set global community rules that override individual community moderation policies.

## Authentication System

### Core Authentication Functions

- **Registration**: Users can register with email and password
- **Login**: Users can log in to access their account
- **Logout**: Users can log out to end their session
- **Session Management**: System maintains secure user sessions across devices
- **Email Verification**: Users must verify their email address to activate their account
- **Password Recovery**: Users can reset forgotten passwords through email verification
- **Password Change**: Users can change their password at any time
- **Device Management**: Users can revoke access from all devices
- **Two-factor Authentication**: Optional 2FA support using TOTP (Time-based One-Time Password)

### Authentication Flow

1. **Registration**:
   - User provides "email", "password", and "username"
   - System validates email format and username uniqueness
   - System verifies password meets minimum security requirements (8+ characters, at least one number)
   - System creates user record with "status: pending-email-verification" 
   - System sends verification email with unique token
   - User must click verification link to activate account
   - After email verification, user status changes to "active"

2. **Login**:
   - User enters email and password
   - System verifies email exists and password matches
   - System checks user status is "active"
   - System creates JWT access token (expiration: 30 minutes) and refresh token (expiration: 14 days)
   - Access token stored in memory (not persistently)
   - Refresh token stored in httpOnly cookie
   - System returns user information to client (excluding sensitive data)

3. **Token Refresh**:
   - When access token expires, client sends refresh token in httpOnly cookie
   - System validates refresh token is active and not revoked
   - System generates new access token and refresh token (new refresh token rotated)
   - Old refresh token is invalidated
   - New access token returned to client
   - New refresh token stored in httpOnly cookie

4. **Password Reset**:
   - User requests password reset by providing email
   - System checks if email exists and account is active
   - System generates time-limited reset token (expiration: 1 hour)
   - System sends reset email with token link
   - User clicks link and enters new password
   - System validates new password meets security requirements
   - System updates password hash and invalidates all tokens
   - System sends confirmation email

### Authentication Tokens

**Token Type**: JWT (JSON Web Tokens) exclusively

**Access Token**: 
- Expiration: 30 minutes
- Size: 512-768 bytes
- Structure:
  - iss: "community-platform.io" 
  - sub: "user-uuid-here"
  - iat: timestamp
  - exp: timestamp (30 minutes from iat)
  - role: "member" or "admin"
  - permissions: ["create-post", "upvote", "comment", "edit-post", "report-content", "subscribe", "view-profile", "view-community"]
  - communityPermissions: {
    - "gaming": ["create-post", "upvote", "comment", "vote", "edit-post"],
    - "cooking": ["create-post", "upvote", "comment", "vote", "edit-post", "moderate"]
  }
  - karma: 2156

**Refresh Token**:
- Expiration: 14 days
- Stored in httpOnly, Secure, SameSite=Strict cookie
- Stored in user record with revocation flag (active: true/false)
- Rotation: Each refresh creates new refresh token and invalidates previous one
- Revocation: When user logs out or changes password, all refresh tokens are immediately invalidated

## Core Functional Requirements

### Community Creation and Management

- THE system SHALL allow members to create communities with a unique name.
- WHEN a member attempts to create a community, THE system SHALL validate that the community name:
  - Contains only alphanumeric characters or underscores
  - Has a minimum length of 3 characters
  - Has a maximum length of 21 characters
  - Does not duplicate an existing community name
  - Does not match standard system community names ("all", "popular", "random", "home")
- THE system SHALL assign a unique UUID identifier to each community upon creation.
- WHEN a community is created, THE system SHALL automatically assign the creator as the first moderator.
- THE system SHALL show communities sorted by the number of subscribers in descending order by default.
- THE system SHALL allow members to submit membership requests to private communities.
- WHEN a member submits a membership request to a private community, THE system SHALL notify the community moderators.
- THE system SHALL allow moderators to approve or deny membership requests.
- WHEN a membership request is approved, THE system SHALL automatically add the member to the community.
- WHEN a membership request is denied, THE system SHALL notify the requesting member.
- THE system SHALL allow community moderators to change community settings:
  - Public/private status
  - Title and description
  - Custom community rules
  - Content type restrictions (text-only, link-only, image-only, mixed)
  - Comment moderation requirements
- WHEN a community is set to private, THE system SHALL require membership approval before viewing posts or comments.
- WHEN a community becomes private, THE system SHALL display a message to non-members attempting to access it.
- WHEN a community becomes public, THE system SHALL grant access to all users.

### Post Creation and Types

- WHEN a member attempts to create a post, THE system SHALL require:
  - Selection of an existing community
  - A title with minimum 5 characters and maximum 100 characters
  - At least one content type: text, link, or image
- THE system SHALL allow posts to contain only one of the following types of content:
  - Text only (5,000 character maximum)
  - Link only (URL with 2,000 character maximum)
  - Image only (single image with 10MB maximum size)
  - Image with explanatory caption (1,000 character maximum)
- WHERE a member selects "text" content, THE system SHALL render the post text in Markdown format with limited allowed tags (bold, italic, lists, blockquotes, code, headers).
- WHERE a member selects "link" content, THE system SHALL validate the URL format (RFC 3986 compliant) and extract preview information (title, description, image) from Open Graph protocol if available.
- WHERE a member selects "image" content, THE system SHALL:
  - Accept only JPG, PNG, GIF, and WebP formats
  - Resize images to 2,000px maximum width while preserving aspect ratio
  - Compress images to maximum 10MB file size
  - Extract and store EXIF metadata (if available)
  - Generate and store thumbnails in multiple sizes (150px, 300px, 600px, 900px)
- THE system SHALL generate a unique slug for each post based on its title and community.
- THE system SHALL automatically timestamp all posts with UTC timezone.
- WHERE a post contains a link, THE system SHALL display "open in new tab" indicator.
- THE system SHALL limit users to 5 posts per minute on average and 10 posts per 10 seconds as a hard cap.
- WHEN a user's post fails validation due to rate limiting, THE system SHALL display: "You've posted too frequently. Please wait 10 seconds before posting again."
- WHEN a user's image fails validation due to size or format, THE system SHALL display: "Unsupported image format. Please use JPG, PNG, GIF, or WebP under 10MB."
- WHEN a user's text content exceeds 5,000 characters, THE system SHALL display: "Text posts are limited to 5,000 characters. Please shorten your post or split it into multiple posts."
- WHEN a user's title is less than 5 characters, THE system SHALL display: "Post titles must be at least 5 characters long."
- WHEN a user's title exceeds 100 characters, THE system SHALL display: "Post titles cannot exceed 100 characters."
- WHEN a user's link is malformed, THE system SHALL display: "Please enter a valid URL beginning with http:// or https://."

### Upvote/Downvote System

- WHEN a user clicks the upvote button on a post, THE system SHALL:
  - Add +1 to the post's upvote count
  - Subtract -1 from the post's downvote count if previously downvoted
  - Add the vote to the user's vote history
  - Apply karma change: +1 to poster's karma
  - Return updated votes count in real-time
- WHEN a user clicks the downvote button on a post, THE system SHALL:
  - Add +1 to the post's downvote count
  - Subtract -1 from the post's upvote count if previously upvoted
  - Add the vote to the user's vote history
  - Apply karma change: -1 to poster's karma
  - Return updated votes count in real-time
- WHEN a user clicks the upvote button on a comment, THE system SHALL:
  - Add +1 to the comment's upvote count
  - Subtract -1 from the comment's downvote count if previously downvoted
  - Add the vote to the user's vote history
  - Apply karma change: +1 to comment author's karma
  - Return updated votes count in real-time
- WHEN a user clicks the downvote button on a comment, THE system SHALL:
  - Add +1 to the comment's downvote count
  - Subtract -1 from the comment's upvote count if previously upvoted
  - Add the vote to the user's vote history
  - Apply karma change: -1 to comment author's karma
  - Return updated votes count in real-time
- THE system SHALL prevent users from voting on their own posts or comments.
- THE system SHALL prevent users from voting more than once on the same content (post or comment).
- THE system SHALL record all votes with associated user ID and timestamp.
- THE system SHALL allow up to 5 vote changes per second per user.
- WHEN a user attempts to change their vote more than 5 times per second, THE system SHALL display: "Vote changes are rate limited. Please wait before voting again."
- THE system SHALL display "upvoted" or "downvoted" state visually to the user immediately after voting.
- WHEN a user attempts to vote using an unauthenticated session, THE system SHALL display: "You must be logged in to vote."

### Commenting and Nested Replies

- WHEN a member clicks the "reply" button on a post, THE system SHALL create a comment tied to that post with depth level 0.
- WHEN a member clicks the "reply" button on a comment, THE system SHALL create a reply comment with depth level = parent depth + 1.
- THE system SHALL enforce a maximum comment depth of 10 levels.
- WHEN a user attempts to create a comment at depth level 11, THE system SHALL display: "Comment responses are limited to 10 levels deep. Please reply to a comment at a shallower level."
- THE system SHALL allow comments to contain up to 500 characters.
- WHERE a user attempts to submit a comment with more than 500 characters, THE system SHALL display: "Comments are limited to 500 characters. Please shorten your comment."
- THE system SHALL allow comments to contain Markdown formatting (bold, italic, lists).
- WHEN a user posts a comment, THE system SHALL show an indicator that "replying to [username]".
- THE system SHALL store each comment with its parent ID, depth level, and thread ID.
- THE system SHALL render nested comments with visual indentation corresponding to depth level.
- THE system SHALL limit users to 3 comments per 10 seconds as a hard cap.
- WHEN a user tries to make more than 3 comments in 10 seconds, THE system SHALL display: "You're commenting too quickly. Please wait 10 seconds before commenting again."
- THE system SHALL preserve the comment hierarchy when sorting and displaying content.
- WHEN a comment is deleted, THE system SHALL hide it from view but preserve the comment tree structure for reply connections.
- WHEN a comment is edited, THE system SHALL update the content but retain the edit history and display "[edited]" indicator.
- WHERE a user attempts to delete their own comment, THE system SHALL allow deletion only if no replies have been made to that comment.
- WHEN a user attempts to delete a comment with replies, THE system SHALL display: "You cannot delete a comment that has replies. You may edit the comment instead."

### Karma System

- THE system SHALL assign every member a karma score that starts at 1 and is visible only to the user upon account creation.
- THE system SHALL increase a user's karma score by +1 when their post or comment receives an upvote.
- THE system SHALL decrease a user's karma score by -1 when their post or comment receives a downvote.
- THE system SHALL prevent users from influencing their own karma score by voting on their own posts or comments.
- THE system SHALL implement a cap: no user can increase their karma score above 10,000 from posts/comments in a 24-hour period.
- WHERE a user accumulates more than 10,000 karma points in 24 hours, THE system SHALL temporarily stop applying karma changes for that user until 24 hours have passed.
- WHEN a member's account is flagged for manipulation, THE system SHALL allow admins to manually adjust karma scores.
- THE system SHALL allow users to hide their personal karma score from all other users.
- WHEN a user hides their karma score, THE system SHALL display "[hidden]" instead of the actual value to all other users.
- THE system SHALL rank users by karma score in user profiles and the "top users" leaderboard (visible only to logged-in members).
- THE system SHALL award a "Karma Champion" badge to any user with 10,000 karma points.
- THE system SHALL automatically generate karma-related achievements and badges:
  - "First Post" (1 karma)
  - "First Comment" (1 karma)
  - "Community Helper" (500 karma)
  - "Top Contributor" (1,000 karma)
  - "Karma Master" (5,000 karma)
  - "Karma Champion" (10,000 karma)
- THE system SHALL display karma-related badges in user profiles.
- THE system SHALL display karma score in user profiles with "Karma: [value]" text.
- WHERE a user's karma score is hidden, THE system SHALL display: "Karma: [hidden]" in all public views.

### Post Sorting

- WHEN a user selects "top" sort option, THE system SHALL sort posts by a weighted score calculated as:
  - score = log(max(1, |upvotes - downvotes|)) + (upvotes - downvotes) * 0.0001 / timestamp
  - where timestamp is hours since post creation
  - where upvotes and downvotes are counts
  - where max(1, |upvotes - downvotes|) prevents log of 0
  - where 0.0001 coefficient gives more weight to newer content
- WHEN a user selects "hot" sort option, THE system SHALL sort posts by a formula:
  - hot_score = (upvotes - downvotes) * (1 + log10(max(2, comment_count))) / ((hours_since_posted + 2)^1.8)
  - where comment_count is total comments on post
  - where hours_since_posted is calculated as current UTC time minus post creation time, in hours
  - where 1.8 exponent slows popularity decline
- WHEN a user selects "new" sort option, THE system SHALL sort posts by creation timestamp in descending order (most recent first).
- WHEN a user selects "controversial" sort option, THE system SHALL sort posts by:
  - controversy_ratio = (upvotes + downvotes) / max(1, |upvotes - downvotes|)
  - only posts with minimum 5 total votes qualify
  - sort by controversy_ratio in descending order
  - among equal controversy ratios, sort by total votes in descending order
- THE system SHALL refresh sort order every 5 minutes for cached results.
- WHERE a post has equal voting scores in "top" sort, THE system SHALL use creation timestamp as tiebreaker (newer first).
- WHERE a post has equal hot scores, THE system SHALL use total votes as tiebreaker (more votes first).
- WHERE a post has equal controversy ratios, THE system SHALL use total votes as tiebreaker (more votes first).
- THE system SHALL display the sorting option selected with a visual indicator on the post listing.
- THE system SHALL remember the user's last selected sort preference per community and apply it upon next visit.

### Subscription System

- WHEN a user clicks the "subscribe" button on a community, THE system SHALL:
  - Add the community to the user's "subscribed communities" list
  - Increase the community's subscriber count by 1
  - Store the subscription relationship in the user's profile
- WHEN a user clicks the "unsubscribe" button on a community, THE system SHALL:
  - Remove the community from the user's "subscribed communities" list
  - Decrease the community's subscriber count by 1
  - Delete the subscription relationship from the user's profile
- THE system SHALL display a "Subscribed" or "Subscribe" button based on user's subscription status.
- THE system SHALL show subscribed communities in "My Communities" section of user profile.
- WHEN a community is subscribed to, THE system SHALL display a "New posts from subscribed communities" notification on the user's feed.
- THE system SHALL allow users to reorder subscribed communities in their personal "My Communities" list.
- WHEN a user requests to subscribe to a private community, THE system SHALL send a request to the community moderators.
- WHEN a community is created, THE system SHALL automatically subscribe the creator to that community.
- WHEN a user is removed from a community by a moderator, THE system SHALL automatically unsubscribe them from that community.
- WHEN a user's account is banned by an admin, THE system SHALL automatically unsubscribe them from all communities.
- THE system SHALL allow users to filter feed to show only posts from subscribed communities.

### User Profiles

- THE system SHALL display a user profile page that includes:
  - Username
  - Karma score (visible or hidden based on user preference)
  - Bio text (max 500 characters)
  - Membership dates
  - Account badges (earned badges)
  - Subscription list (communities subscribed to)
  - User posts (with post titles, community names, upvote counts, and timestamps)
  - User comments (with post titles, comment text, upvote counts, and timestamps)
- WHEN viewing another user's profile, THE system SHALL not display information that the user has hidden:
  - Karma score becomes "[hidden]" if user chose to hide it
  - Personal bio becomes "This user has not filled out their bio." if empty or hidden
- THE system SHALL limit profile post and comment listings to 100 items per page.
- WHEN a profile has more than 100 posts, THE system SHALL display pagination controls.
- WHEN browsing a user's profile, THE system SHALL allow sorting of posts and comments by:
  - Newest first
  - Oldest first
  - Highest score
  - Most commented
- THE system SHALL show "No posts yet" or "No comments yet" if the user has no content.
- WHEN a user edits their own profile, THE system SHALL allow updates to:
  - Bio text
  - Karma visibility preference
  - Notification preferences
- THE system SHALL prevent users from changing their username after account creation.
- THE system SHALL display "[member since: MM/YYYY]" in user profile.

### Content Reporting

- WHEN a user encounters inappropriate content, THE system SHALL provide a button labeled "Report".
- WHEN a user clicks "Report", THE system SHALL display a modal with:
  - Dropdown: "Reason for report"
    - Spam
    - Harassment
    - Illegal content
    - Impersonation
    - Inaccurate information
    - Nudity or sexual content
    - Violent or graphic content
    - Other
  - Text area: "Optional explanation"
  - Button: "Submit Report"
- WHEN a report is submitted, THE system SHALL:
  - Log the report with user ID, content ID, type, and optional description
  - Increment the report counter on the reported content
  - Notify the relevant moderators for the community
  - Notify platform administrators if report type is "illegal content"
  - Automatically hide the content from public view if it receives 3+ reports
- THE system SHALL allow moderators to review reports and take action:
  - Dismiss report (content is acceptable)
  - Remove content permanently
  - Issue warning to user
  - Temporarily ban user from community
  - Permanently ban user from community
- WHEN multiple users report the same content, THE system SHALL aggregate reports to identify patterns of abuse.
- THE system SHALL show "X reports" next to content that has been reported, visible to all users.
- WHEN a report is dismissed, THE system SHALL reduce the report counter by 1.
- THE system SHALL not reveal the identity of reporters to the content creator.
- WHEN a user submits multiple false reports on content that is not abusive, THE system SHALL reduce their karma score: -5 per fraudulent report.
- WHEN a user accumulates 5+ fraudulent reports, THE system SHALL temporarily restrict their ability to report content.
- THE system SHALL provide a "Dispute Report" feature for users whose content was removed:
  - Display explanation of removal
  - Allow 7-day response window
  - If user responds within time limit, content is restored if dispute is accepted
  - If user doesn't respond, removal stands
- THE system SHALL maintain a log of all report actions taken by moderators.

## User Scenarios

### New User Journey

1. Guest navigates to main page
2. Guest sees featured and popular communities
3. Guest clicks "Join" button on a community
4. System prompts: "You need an account to join this community."
5. Guest clicks "Sign Up"
6. System displays registration form with email, password, username fields
7. Guest enters email: "user@example.com", password: "pass1234", username: "newuser123"
8. System validates:
   - Email format
   - Password strength
   - Username uniqueness
9. System displays: "Verification email sent. Check your inbox."
10. Guest checks inbox and clicks verification link
11. System redirects to login page: "Your account is active. Login now."
12. Guest logs in with email/password
13. System creates session and redirects to homepage
14. System displays: "Welcome to your new Community Platform account!"
15. System highlights "Recommended Communities" based on user interests
16. Guest subscribes to 3 communities
17. Guest sees posts in "Feed" with "My Communities" filter enabled
18. Guest sees opportunity to create first post

### Active Member Journey

1. Member logs in to account
2. System loads feed sorted by "hot" for subscribed communities
3. Member sees new posts (8 in feed)
4. Member upvotes one post
5. System shows green arrow and +1 to upvote count
6. Member downvotes one other post
7. System shows red arrow and -1 to downvote count
8. Member clicks "Comments" on a post
9. System loads comment thread with 15 replies
10. Member replies to post with text: "Great point!"
11. System displays "Replying to [authorname]" text
12. Member replies to a reply: "That's exactly what I was thinking."
13. System renders comment at depth level 2
14. Member finds an inappropriate comment
15. Member clicks "Report" button on comment
16. System displays report modal
17. Member selects: "Harassment" and submits
18. System displays: "Thank you for reporting this. Moderators will review."
19. Member creates new post
20. System prompts for community selection, title, and content
21. Member selects community: "photography" and uploads image
22. System shows preview of resized image
23. Member adds title: "Sunset over the mountains"
24. Member submits post
25. System displays "Post created successfully!"
26. Member checks profile page
27. System shows new post with 3 upvotes
28. Member sees karma score: "Karma: 2,143"

### Admin Moderation Journey

1. Admin logs in with elevated privileges
2. System displays admin dashboard with: "Moderation Queue", "User Reports", "Activity Alerts"
3. Admin views "Moderation Queue" which shows 28 pending reports
4. Admin clicks report: "Nudity" on post in community "nature"
5. System displays original content: photo of hiking trail with partial nudity
6. Admin reviews: "This violates community guidelines on nudity."
7. Admin selects: "Remove content" and "Issue warning to user"
8. System removes content, hides from public view
9. System sends email to user: "Your post was removed because it contained nudity."
10. Admin views "User Reports" dashboard
11. System highlights user "troll42" with 12 reports in last 48 hours
12. Admin clicks user profile
13. System shows: "Karma: 38,204", "Subscribed to 21 communities", "1,048 posts", "2,490 comments"
14. Admin sees top posts: "I don't care about your opinion", "Everyone is wrong"
15. Admin selects: "Permanently ban user from platform"
16. System confirms: "This will remove all content and ban user permanently."
17. Admin confirms
18. System removes all posts/comments from user, invalidates sessions
19. System displays: "User troll42 banned successfully"
20. Admin views system analytics
21. System shows: 14% increase in report volume in last month
22. Admin creates new community policy: "No links to external sites in nature community"
23. System updates community rules, notifies moderators

### Community Creation Journey

1. Member views main page with community directory
2. Member clicks "Create Community" button
3. System displays form: "Community Name", "Description", "Type (Public/Private)", "Content rules"
4. Member enters: "retro-gaming"
5. Member enters description: "Discussion about classic 80s and 90s video games"
6. Member selects: "Public"
7. Member selects: "Any content type allowed"
8. Member clicks "Create"
9. System validates name: "retro-gaming" is available
10. System generates community ID: "c-9a3b1c2d"
11. System displays: "Community created! You are now its first moderator."
12. Member views newly created community
13. System shows: "Welcome to retro-gaming! Be the first to post something."
14. Member creates first post: "What's your favorite NES game?"
15. System displays post in "retro-gaming" with 0 upvotes
16. Member invites friends via direct link
17. System displays: "Share this link: communityplatform.io/c/retro-gaming"
18. First friend joins and subscribes
19. System updates subscriber count: "1 subscriber" → "2 subscribers"
20. Community grows to 25 members within 24 hours

### Content Reporting Journey

1. User sees post: "My favorite food is rocks"
2. User sees "12 reports" indicator and "Report" button
3. User clicks "Report"
4. System displays report modal with reasons
5. User selects: "Inaccurate information"
6. User adds note: "This is clearly nonsense and harmful"
7. User clicks "Submit"
8. System adds report: "Inaccurate information: This is clearly nonsense and harmful"
9. System increments report count to 13
10. System sends notification to moderators
11. Moderator receives alert: "Post: 'My favorite food is rocks' - 13 reports"
12. Moderator reviews post
13. Moderator determines: "This is clearly satire, not harmful misinformation"
14. Moderator clicks: "Dismiss Report"
15. System reduces report count to 12
16. System sends auto-reply to reporting user: "Your report has been reviewed and dismissed."

## Performance Expectations

- WHEN a user loads the main page, THE system SHALL display content within 1.5 seconds.
- WHEN a user clicks on a community, THE system SHALL load the community posts within 1.8 seconds.
- WHEN a user opens a post to view comments, THE system SHALL load the full comment thread with up to 100 replies within 2.0 seconds.
- WHEN a user clicks "upvote", THE system SHALL update the vote count visually within 100 milliseconds.
- WHEN a user submits a comment, THE system SHALL display the comment in the thread within 150 milliseconds.
- WHEN a user searches for a community, THE system SHALL return results as they type (instantly) for queries of 3+ characters.
- WHEN a user uploads an image, THE system SHALL show upload progress bar and complete the upload within 10 seconds for 10MB images on average connections.
- WHEN a user views a profile with 50 posts, THE system SHALL render all visible posts within 1.0 seconds.
- WHEN a user changes sorting option, THE system SHALL refresh content within 500 milliseconds for cached results.
- WHEN a user loads a page with 20 posts, THE system SHALL prefetch the next 5 posts into cache.

## Error Handling

- IF a user tries to create a community with a name already taken, THEN THE system SHALL display: "This community name is already in use. Please choose another one."
- IF a user tries to post a link that is malformed, THEN THE system SHALL display: "Please enter a valid URL beginning with http:// or https://."
- IF a user tries to post an image larger than 10MB, THEN THE system SHALL display: "Image files must be under 10MB. Please shrink your image or upload a different one."
- IF a user tries to post a text content longer than 5,000 characters, THEN THE system SHALL display: "Text posts are limited to 5,000 characters. Please shorten your post or split it into multiple posts."
- IF a user tries to comment with more than 500 characters, THEN THE system SHALL display: "Comments are limited to 500 characters. Please shorten your comment."
- IF a user tries to create a comment at depth level 11, THEN THE system SHALL display: "Comment responses are limited to 10 levels deep. Please reply to a comment at a shallower level."
- IF a user attempts to vote on their own content, THEN THE system SHALL display: "You cannot vote on your own posts or comments."
- IF a user tries to vote more than 5 times per second, THEN THE system SHALL display: "Vote changes are rate limited. Please wait before voting again."
- IF a user tries to comment more than 3 times in 10 seconds, THEN THE system SHALL display: "You're commenting too quickly. Please wait 10 seconds before commenting again."
- IF a user tries to post more than 10 times in 10 seconds, THEN THE system SHALL display: "You've posted too frequently. Please wait 10 seconds before posting again."
- IF a user tries to access a private community without membership, THEN THE system SHALL display: "This community is private. You must request membership to view content."
- IF a user tries to report inappropriate content and is not logged in, THEN THE system SHALL display: "You must be logged in to report content."
- IF an admin tries to ban a user who doesn't exist, THEN THE system SHALL display: "User not found. Please check the username and try again."
- IF the system encounters unexpected database failure, THEN THE system SHALL display: "There was a problem processing your request. Please try again later."
- IF a user loses internet connection while posting, THEN THE system SHALL save draft to local storage and display: "Draft saved locally. Reconnect to submit."

## Security and Compliance

- THE system SHALL encrypt all user passwords using bcrypt with salt.
- THE system SHALL require all communications to happen over HTTPS.
- THE system SHALL store user passwords in a form that cannot be decrypted or retrieved.
- THE system SHALL not store any personal information beyond what is required.
- THE system SHALL not share user email addresses with third parties.
- THE system SHALL implement rate limiting to prevent spam and brute force attacks (max 10 login attempts per minute per IP).
- THE system SHALL log all admin actions (moderation, bans, settings changes) for audit purposes.
- THE system SHALL use JWT with secure signing keys for authentication.
- THE system SHALL set HTTPOnly and Secure flags on all authentication cookies.
- THE system SHALL sanitize all user input to prevent XSS attacks.
- THE system SHALL validate all external links to prevent open redirects.
- THE system SHALL implement CSRF protection on all state-changing operations.
- THE system SHALL enforce minimum password strength: 8+ characters, at least one number.
- THE system SHALL provide option for users to request export of their personal data (GDPR compliant).
- THE system SHALL provide option for users to request deletion of their account (GDPR compliant).
- THE system SHALL comply with COPPA requirements by not collecting data from users under 13 years old.
- THE system SHALL not track or log user behavior for advertising purposes beyond what is required for functionality.
- THE system SHALL display privacy policy link in footer and during registration.
- THE system SHALL allow users to view and manage their privacy settings.

## Business Rules and Constraints

### Content Rules

- Posts and comments SHALL NOT contain hate speech, targeted harassment, or discriminatory language based on race, religion, gender, sexual orientation, disability, age, or nationality.
- Posts and comments SHALL NOT contain pornographic or sexually explicit content.
- Posts and comments SHALL NOT promote violence, self-harm, or dangerous behavior.
- Posts and comments SHALL NOT contain threats of physical or legal action.
- Posts and comments SHALL NOT contain illegal content.
- Posts and comments SHALL NOT impersonate other users or organizations.
- Links SHALL NOT lead to phishing sites, malware distribution sites, or illegal content.
- Images SHALL NOT contain child exploitation material.
- Images SHALL NOT contain non-consensual intimate imagery.
- THE system SHALL automatically flag images with suspected nudity with AI detection.
- THE system SHALL not allow anonymous posting.
- Users SHALL NOT create multiple accounts to manipulate voting or evade bans.
- Users SHALL NOT flood communities with repetitive or spam content.
- Users SHALL NOT create communities intended primarily for spam or promotion.

### Karma Rules

- Karma score SHALL start at 1 for new users.
- Karma SHALL increase or decrease by ±1 for each upvote or downvote received on posts/comments.
- Karma SHALL NOT change for votes on own content.
- Karma SHALL have a 24-hour cap of 10,000 points earned from upvotes.
- Admins SHALL have ability to manually adjust karma scores for users who violate rules.
- Karma SHALL be visible to the user at all times.
- User SHALL have option to hide their karma score from all other users.
- Karma scores SHALL be included in user profile display.
- Karma scores SHALL be included in "Top Users" leaderboard.

### Community Rules

- Each community SHALL be named using alphanumeric characters or underscores only.
- Community names SHALL be 3-21 characters in length.
- Community names SHALL NOT duplicate existing system community names ("all", "popular", "random", "home").
- Each community SHALL have a description of up to 500 characters.
- Each community SHALL have a moderator team (minimum 1).
- Administrators SHALL be able to create "Featured Communities".
- Communities SHALL be able to be public or private.
- Private communities SHALL require approval to join.
- Community moderators SHALL have authority to remove posts, ban users, and manage rules.
- Community rules SHALL be displayed when users view the community.
- Community owners SHALL be able to transfer ownership to another member.
- Each community SHALL have up to 20 moderators.

### Reporting Rules

- Users SHALL report content only for legitimate violations of community standards.
- Users SHALL NOT use the report system as a form of harassment.
- Users SHALL NOT submit multiple reports on the same content without new justification.
- Reporters SHALL remain anonymous to content creators.
- Reported content SHALL be reviewed by moderators within 8 hours.
- Reported content SHALL be hidden from public view upon receiving 3 reports.
- Reporting user SHALL not receive karma changes from reports.

### System Limits

- Maximum post title length: 100 characters.
- Maximum post text length: 5,000 characters.
- Maximum comment length: 500 characters.
- Maximum comment depth: 10 levels.
- Maximum image size: 10MB.
- Maximum image dimensions: 2,000px width.
- Accepted image formats: JPG, PNG, GIF, WebP.
- Maximum links per post: 1.
- Maximum posts per minute per user: 5.
- Maximum posts per 10 seconds per user: 10.
- Maximum comments per 10 seconds per user: 3.
- Maximum votes per second per user: 5.
- Maximum communities per user: unlimited.
- Maximum subscribers per community: unlimited.
- Maximum upload attempts per minute: 5.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team