# Community Platform Requirements Analysis Document

## Service Summary

The Reddit-like community platform is designed to provide a decentralized, user-controlled environment for niche-interest communities to thrive. Unlike centralized platforms that prioritize engagement through algorithmic manipulation, this system empowers users to create, moderate, and govern their own communities, fostering authentic, meaningful interactions. The platform addresses a growing demand for digital spaces that reward quality contributions and community health rather than viral outrage.

## Business Model

### Purpose and Vision

The core purpose is to create a sustainable, ethical alternative to algorithm-driven social platforms. By decentralizing community governance and incentivizing valuable contributions through a karma-based reputation system, the platform aims to cultivate healthier online discourse.

### Economic Foundation

The platform implements a balanced monetization strategy designed to preserve user experience while ensuring financial sustainability:

1. **Non-intrusive Advertising**: Targeted banner ads appear exclusively on post listings—not in comments or private messages—with strict content filtering to prevent inappropriate ads. Revenue targets at $10-15 CPM based on community-specific targeting.
2. **Premium Membership**: A $4.99/month subscription offering:
   - Ad-free experience across all communities
   - Advanced content filtering options
   - Customizable profile themes and badges
   - Increased post and comment length limits (10,000 characters)
   - Priority support and community support privileges
3. **Community Sponsorships**: Businesses can financially support communities aligned with their brand values, with complete transparency to users.
4. **Affiliate Marketing**: Integration with approved affiliate programs for products relevant to specific community interests (e.g., books in literature communities, gear in outdoor communities).

### Success Metrics

- **Active Users**: 50,000 MAU within 12 months, 200,000 MAU within 24 months
- **Community Growth**: 500+ active communities within 12 months, 2,000+ within 24 months
- **Engagement**: Average 45 minutes per user per week
- **Content Volume**: 50,000+ daily posts, 250,000+ daily comments
- **Community Health**: <0.5% of posts flagged for moderation, <0.2% of content removed
- **Premium Conversion**: 8% of users convert to premium within first 6 months
- **Retention**: 65% of users still active after 90 days
- **Karma Distribution**: 70% of users have karma scores between 100-5,000
- **Report Resolution**: 95% of reports resolved within 4 hours

### Growth Strategy

The growth follows a "seed community" model:

1. **Initial Community Onboarding**: Recruit 100 high-quality niche communities (e.g., "retro-gaming", "urban-farming", "classical-music-analysis") before public launch
2. **Community Referrals**: Implement referral system where existing members receive premium credits for inviting others to join specific communities they value
3. **Content Cross-Promotion**: Develop algorithms that identify related communities and recommend them to users based on engagement patterns
4. **Moderator Recognition**: Feature "Top Community Mod" monthly awards with visibility to the entire platform
5. **Partnerships**: Collaborate with subreddits, Discord servers, and independent forums to migrate established communities

## User Actors

### Guest

A non-authenticated user who interacts with the platform without a personal account. Guests can:

- View public community listings
- Browse public posts within any community
- View post details and comments
- See upvote/downvote counts
- See author karma levels
- Search for communities and posts

Guests cannot:

- Create accounts
- Post content
- Comment on posts
- Vote on posts or comments
- Subscribe to communities
- Access user profiles
- Report content
- Receive notifications
- See any personalization or recommendations
- Access premium features

### Member

An authenticated user who has completed registration. Members can do everything guests can do, plus:

- Register with email and password
- Log in to their account
- Create new communities
- Post text, link, or image content to any public community
- Upvote or downvote posts
- Upvote or downvote comments
- Comment on posts with nested replies up to 10 levels deep
- View their own profile showing all posts and comments
- Subscribe to and unsubscribe from communities
- Edit their own posts and comments within 24 hours of creation
- Receive notifications about community activity
- Change visibility of their own content from public to private
- Set their own karma visibility preferences
- Report inappropriate content
- Create private community membership requests
- Receive community-specific badges for achievements
- Use advanced content filtering

### Admin

Platform administrators with elevated privileges. Admins can do everything members can do, plus:

- View all content across all communities (regardless of privacy settings)
- Remove any post or comment from any community
- Ban users from specific communities or from the entire platform
- Reset user karma scores
- Transfer community ownership to other users
- Create "featured" communities visible to all users
- Disable comment sections on specific posts
- Adjust voting weight for specific users (in cases of suspected manipulation)
- Access detailed analytics: community growth trends, content moderation statistics, user engagement metrics
- View flagged content and report histories
- Lock communities for maintenance or review
- Create and enforce platform-wide content policies
- Create system announcements visible to all users
- Create and manage internal moderation teams
- Create system alerts and warnings for users
- Review report disputes
- Create emergency moderation tools for crisis situations
- Modify platform-wide settings and rules

## Authentication System

### Core Functions

- **Registration**: Users register with email and password
- **Login**: Users authenticate to access their account
- **Logout**: Users terminate their session
- **Session Management**: Secure user sessions maintained across devices
- **Email Verification**: Mandatory verification to activate accounts
- **Password Recovery**: Email-based password reset
- **Password Change**: Users can change passwords anytime
- **Device Management**: Users can revoke access from all devices
- **Two-factor Authentication**: Optional TOTP (Time-based One-Time Password)

### Authentication Flow

#### Registration

1. User provides "email", "password", and "username"
2. System validates:
   - Email format
   - Username uniqueness
   - Password meets minimum security: 8+ characters, includes at least one number
3. System creates user record with "status: pending-email-verification"
4. System sends verification email with unique token
5. User clicks verification link to activate account
6. System changes user status to "active"

#### Login

1. User enters email and password
2. System verifies:
   - Email exists and password matches
   - User status is "active"
3. System creates:
   - JWT access token (expiration: 30 minutes)
   - Refresh token (expiration: 14 days) stored in httpOnly cookie
4. Access token stored in memory (not durable)
5. System returns user information excluding sensitive data

#### Token Refresh

1. When access token expires, client sends refresh token in httpOnly cookie
2. System validates refresh token is active and not revoked
3. System generates:
   - New access token
   - New refresh token (previous one invalidated)
4. New refresh token stored in httpOnly cookie

#### Password Reset

1. User requests password reset via email
2. System verifies:
   - Email exists and account is active
3. System generates time-limited reset token (expiration: 1 hour)
4. System sends reset email with token link
5. User clicks link and enters new password
6. System validates new password meets security requirements
7. System updates password hash and invalidates all tokens
8. System sends confirmation email

### Authentication Tokens

#### Access Token (JWT)

- Expiration: 30 minutes
- Size: 512-768 bytes
- Structure:
  - `iss`: "community-platform.io"
  - `sub`: user-UUID
  - `iat`: timestamp
  - `exp`: 30 minutes from iat
  - `role`: "member" or "admin"
  - `permissions`: ["create-post", "upvote", "comment", "edit-post", "report-content", "subscribe", "view-profile", "view-community"]
  - `communityPermissions`: {
    - "gaming": ["create-post", "upvote", "comment", "vote", "edit-post"],
    - "cooking": ["create-post", "upvote", "comment", "vote", "edit-post", "moderate"]
  }
  - `karma`: 2156

#### Refresh Token

- Expiration: 14 days
- Storage: httpOnly, Secure, SameSite=Strict cookie
- Revocation: Every refresh generates a new token; previous token invalidated
- Invalidated when: User logs out or changes password

### Permission Matrix

| Action | Guest | Member | Admin |
|--------|-------|--------|-------|
| View Public Communities | ✅ | ✅ | ✅ |
| View Public Posts | ✅ | ✅ | ✅ |
| View Post Details | ✅ | ✅ | ✅ |
| View Comment Threads | ✅ | ✅ | ✅ |
| View Upvote/Downvote Counts | ✅ | ✅ | ✅ |
| View Author Karma | ✅ | ✅ | ✅ |
| Search Communities | ✅ | ✅ | ✅ |
| Search Posts | ✅ | ✅ | ✅ |
| Register Account | ❌ | ✅ | ✅ |
| Login | ❌ | ✅ | ✅ |
| Logout | ❌ | ✅ | ✅ |
| Create Community | ❌ | ✅ | ✅ |
| Post Text Content | ❌ | ✅ | ✅ |
| Post Link Content | ❌ | ✅ | ✅ |
| Post Image Content | ❌ | ✅ | ✅ |
| Vote on Posts | ❌ | ✅ | ✅ |
| Vote on Comments | ❌ | ✅ | ✅ |
| Comment on Posts | ❌ | ✅ | ✅ |
| Nested Replies (up to 10 levels) | ❌ | ✅ | ✅ |
| View Own Profile | ❌ | ✅ | ✅ |
| Subscribe to Community | ❌ | ✅ | ✅ |
| Unsubscribe from Community | ❌ | ✅ | ✅ |
| Edit Own Posts (within 24 hours) | ❌ | ✅ | ✅ |
| Edit Own Comments (within 24 hours) | ❌ | ✅ | ✅ |
| Report Inappropriate Content | ❌ | ✅ | ✅ |
| See Notifications | ❌ | ✅ | ✅ |
| Manage Account Settings | ❌ | ✅ | ✅ |
| View All Content | ❌ | ❌ | ✅ |
| Remove Any Post | ❌ | ❌ | ✅ |
| Remove Any Comment | ❌ | ❌ | ✅ |
| Ban User from Community | ❌ | ❌ | ✅ |
| Ban User from Platform | ❌ | ❌ | ✅ |
| Reset Karma | ❌ | ❌ | ✅ |
| Transfer Ownership | ❌ | ❌ | ✅ |
| Create Featured Community | ❌ | ❌ | ✅ |
| Disable Comment Sections | ❌ | ❌ | ✅ |
| Adjust Voting Weight | ❌ | ❌ | ✅ |
| Access Analytics | ❌ | ❌ | ✅ |
| Create Platform-Wide Policies | ❌ | ❌ | ✅ |
| Modify Platform Settings | ❌ | ❌ | ✅ |
| Create System Announcements | ❌ | ❌ | ✅ |
| Create Internal Moderation Teams | ❌ | ❌ | ✅ |
| Review Report Disputes | ❌ | ❌ | ✅ |
| Create Emergency Moderation Tools | ❌ | ❌ | ✅ |

## Core Functional Requirements

### Community Creation and Management

- THE system SHALL allow members to create communities with a unique name.
- WHEN a member attempts to create a community, THE system SHALL validate that the community name:
  - Contains only alphanumeric characters or underscores
  - Has a minimum length of 3 characters
  - Has a maximum length of 21 characters
  - Does not duplicate an existing community name
  - Does not match system-reserved names ("all", "popular", "random", "home")
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