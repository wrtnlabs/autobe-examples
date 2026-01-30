# Reddit-Like Community Platform Requirements

## Introduction

### Business Justification

The modern internet lacks true community-driven platforms where users earn reputation through meaningful contribution rather than engagement with viral content. Existing platforms prioritize algorithmic amplification of outrage and sensationalism over genuine discussion and knowledge exchange. The Reddit-like community platform addresses this gap by creating a space where user reputation (karma) is earned through high-quality contributions and constructive engagement, not through clickbait or manipulation.

This platform empowers users to build lasting credibility through their contributions, creating trust and quality that transcends individual posts. The business model revolves around creating an ecosystem where authentic voices are rewarded, leading to higher user retention and more valuable community interactions.

### Market Opportunity

The market for community platforms remains underserved despite high internet usage. Existing platforms suffer from:

- Low user trust due to anonymous behavior
- Algorithmic manipulation that rewards outrage
- Ineffective moderation systems
- Lack of meaningful reputation systems

This platform targets users who value:

- Genuine discussion over viral content
- Community-driven curation
- Transparency in moderation
- Meaningful reputation systems
- Privacy and anonymity where appropriate

### Unique Value Proposition

Unlike existing platforms, this community system features:

1. **Karma as Trust Currency** - Reputation is earned through value creation, not just engagement
2. **Multi-Tiered Moderation** - Community moderators empowered with clear authority and accountability
3. **Context-Sensitive Content Visibility** - Posts rise based on quality signals, not just popularity
4. **Anonymous Voting** - Votes cannot be traced to individuals, preventing intimidation and coercion
5. **Community Autonomy** - Each community can set its own specific rules while adhering to platform-wide standards

### Core Features Overview

The platform delivers:

- User registration and secure authentication
- Creation of independent communities (subreddits)
- Posting of text, links, and images within communities
- Upvote/downvote system for posts and comments
- Nested comment threading with depth limits
- Reputation system (karma) based on community feedback
- Multi-dimensional post sorting: hot, new, top, controversial
- User subscription to communities
- Comprehensive user profiles with contribution history
- Robust reporting and moderation system
- Transparent moderation policies and appeal process
- Anti-manipulation systems to prevent voting fraud and karma farming

### Success Metrics

Success will be measured by:

#### User Engagement

- 70% of registered users create at least one post within 7 days of registration
- Average 15 minutes of daily engagement per active user
- 40% of users return daily
- Average 3 comments per post
- 85% of users use voting to participate

#### Content Quality

- 80% of posts originate from users with 100+ karma
- Average karma score per user: 500+ within 30 days
- 95% of posts with >50 votes have positive karma balance
- Less than 1% of posts are flagged as inappropriate
- 60% of users report at least one piece of content per month

#### Moderation Effectiveness

- 95% of reports evaluated within 24 hours
- Less than 5% of appeals successfully granted
- 80% of users agree moderation is "fair and consistent"
- Less than 2% of users suspended for violations
- 90% of users feel community rules are clearly enforced

#### System Performance

- 99.95% uptime
- Comment system latency < 500ms for 99% of requests
- Post sorting algorithm response time < 200ms
- Database queries for top 10,000 most active users execute under 100ms
- System handles 10,000 concurrent users with 95% success rate

### Future Roadmap

#### Short-Term (3 months)

- Implement full comment threading with depth limits
- Deploy initial moderation interface
- Launch basic notification system
- Complete karma calculation engine
- Enable community creation with 5 moderator slots
- Develop user profile pages

#### Medium-Term (6 months)

- Implement algorithm-driven content discovery
- Create community-specific moderation policies
- Add reputation-based features (post visibility, reporting power)
- Develop mobile applications
- Launch API for third-party integrations
- Implement detailed analytics dashboard

#### Long-Term (12+ months)

- Add community governance systems (voting on rule changes)
- Develop verified user verification program
- Implement end-to-end encrypted direct messaging
- Launch marketplace for community-driven products
- Partner with educational institutions for knowledge communities
- Develop AI-assisted moderation tools
- Introduce cross-platform reputation portability

## User Actors

The platform defines four distinct user types with progressively increasing privileges and responsibilities:

### Guest

Actors who are not logged in. Guests can:

- Browse public communities and posts
- Read comments and votes
- View user profiles and karma levels
- Discover communities through search

Guests cannot:

- Create accounts
- Post content
- Comment on posts
- Vote on posts or comments
- Subscribe to communities
- Report content
- Create communities
- Access private communities

### Member

Registered and authenticated users who have completed the signup process. Members can:

- Create posts in communities
- Comment on posts
- Upvote and downvote posts and comments
- Subscribe to communities
- Build reputation (karma)
- Report inappropriate content
- Edit their own posts and comments within time limits
- Delete their own posts and comments within time limits
- Access their own profile
- Follow user profiles
- Receive notifications

Members are granted privileges based on karma thresholds:

- 10 karma: Can create posts
- 50 karma: Can comment
- 100 karma: Can vote on comments
- 200 karma: Can join private communities
- 500 karma: Can create communities
- 1,000 karma: Can recommend communities to featured status
- 5,000 karma: Can review user reports
- 10,000 karma: Can nominate users as moderators

### Moderator

Members who have been appointed to manage specific communities. Moderators inherit all member privileges and gain additional authority:

- Remove posted content
- Remove comments
- Issue temporary bans for disruptive behavior
- Apply community-specific rules (within platform guidelines)
- Respond to user reports
- Pin important posts
- Lock threads
- Approve or deny user requests to join private communities

Moderator privileges scale with karma:

- 500 karma: Can remove comments
- 1,000 karma: Can remove posts
- 2,500 karma: Can issue temporary bans (up to 7 days)
- 5,000 karma: Can issue permanent bans
- 10,000 karma: Can appoint new moderators

### Admin

Platform staff with full administrative control over all communities. Admins inherit all moderator privileges and gain system-wide authority:

- Manage all communities
- Overrule any moderator decision
- Issue system-wide bans
- Manage the moderation team
- Update platform-wide policies
- Access all moderation logs
- View any user's private information under legal circumstances
- Manage server resources
- Approve or deny community creation requests
- Handle appeals of permanent bans

Admins have no unique privileges based on karma, but their karma score is visible to all users as a transparency measure.

## User Journey

### Registration Journey

WHEN a user accesses the platform without an existing account, THE system SHALL:

- Display a prominent "Sign Up" button on the landing page
- Present a registration form requiring:
  - Email address (with domain validation)
  - Username (between 3-20 characters, alphanumeric and underscores only)
  - Password (minimum 10 characters, containing uppercase, lowercase, and special characters)
  - Agreement to Terms of Service
  - Agreement to Community Guidelines

WHEN the user submits the registration form, THE system SHALL:

- Validate all inputs for correctness
- Check if the email is already registered
- Check if the username is already in use
- Generate a unique user ID using UUIDv4
- Create a new user record in the database
- Send a verification email to the provided email address
- Set the user account status to "unverified"
- Set initial karma to 0

WHEN the user clicks the verification link in the email, THE system SHALL:

- Validate the verification token
- Change user account status to "active"
- Award +50 karma for completing verification
- Redirect to the homepage
- Display a welcome message
- Suggest 3 communities based on user interests

IF the verification link expires (after 7 days), THE system SHALL:

- Allow user to request a new verification email
- Display a warning that excessive verification requests may trigger fraud prevention

### First-Time Posting

WHEN a verified user accesses the platform for the first time, THE system SHALL:

- Welcome them with a guided tour
- Highlight "Create Post" button prominently
- Provide a post creation wizard

WHEN a user clicks "Create Post", THE system SHALL:

- Open the post creation modal
- Present options for:
  - Text post (minimal 10 words recommended)
  - Link post (must include valid URL)
  - Image post (JPG, PNG, GIF; max 10MB)

WHEN a user selects content type, THE system SHALL:

- Display appropriate field for that content type
- Provide guidance on posting etiquette
- Show word count and character limit indicators
- Display community selection dropdown (default: popular community)
- Show sample of high-quality posts in selected community

WHEN a user submits a post, THE system SHALL:

- Validate that user has 10+ karma
- Check if the post contains banned domains
- Check for text repetition (duplicate across multiple communities)
- If an image post, validate the image format and size
- If a link post, check if URL resolves and isn't malicious
- Validate that community isn't archived or closed
- Generate a unique post ID
- Assign post to selected community
- Record user ID, timestamp, and IP address
- Set initial vote count to 0
- Create audit log entry
- Increment post count on user profile

WHEN a post is created, THE system SHALL:

- Display confirmation message: "Your post has been published!"
- Redirect to the newly created post
- Add the post to the community feed
- Notify users subscribed to the community
- Award +5 karma to user for successful post

### Discovering Communities

WHEN a user navigates to the home page, THE system SHALL:

- Display trending communities based on:
  - Recent activity
  - New subscribers
  - Reputation of moderators
  - Content quality indicators
- Show "Explore All" button linking to full community directory
- Display search bar with auto-complete for community names
- Highlight communities the user has subscribed to
- Recommend communities based on user activity and karma

WHEN a user searches for a community, THE system SHALL:

- Return results based on:
  - Exact name match (highest priority)
  - Partial name match
  - Keywords in description
  - Member count
  - Moderation quality score
- Display number of active members
- Display moderator count and reputation
- Show last active timestamp
- Display average karma of top contributors

WHEN a user visits a community, THE system SHALL:

- Show community banner and description
- Display current number of subscribers
- Show moderation team with profile pictures and karma levels
- Display recent trending posts
- Show community rules summary
- Display subscription button

WHEN a user subscribes to a community, THE system SHALL:

- Add community to user's subscription list
- Increase community subscriber count
- Trigger notification for the community's moderator
- Display "Subscribed" status on the community page
- Start including community posts in the user's personalized feed

### Engaging with Content

WHEN a user views a post, THE system SHALL:

- Display:
  - Post title
  - Username of poster with karma level
  - Community badge
  - Timestamp
  - Upvote/downvote buttons (highlighted if user has voted)
  - Vote count (e.g., "247 upvotes")
  - Media (image, link preview)
  - Post content (text)
  - "Comment" button
  - "Share" button
  - "Report" button

WHEN a user votes on a post, THE system SHALL:

- Validate that user has 100+ karma
- Validate that user hasn't voted on this post within the last 5 minutes
- Validate that user is not the post author (self-voting prevention)
- Validate that user has not exceeded 100 votes in the past minute
- If user has previously upvoted and clicks upvote again:
  - Remove previous upvote
  - Decrease vote count by 1
  - Clear highlighting
- If user has previously downvoted and clicks downvote again:
  - Remove previous downvote
  - Increase vote count by 1
  - Clear highlighting
- If user has upvoted and clicks downvote:
  - Remove upvote
  - Add downvote
  - Decrease vote count by 2
  - Highlight downvote button
- If user has downvoted and clicks upvote:
  - Remove downvote
  - Add upvote
  - Increase vote count by 2
  - Highlight upvote button
- If user has not voted and clicks upvote:
  - Add upvote
  - Increase vote count by 1
  - Highlight upvote button
- If user has not voted and clicks downvote:
  - Add downvote
  - Decrease vote count by 1
  - Highlight downvote button
- Update vote count in real-time
- Award +2 karma to the post's author

WHEN a user comments on a post, THE system SHALL:

- Validate that user has 50+ karma
- Ensure comment text is between 5-5,000 characters
- Validate that comment doesn't contain more than 20 URLs
- Check for moderation trigger words
- Store comment with:
  - Unique comment ID
  - Parent post ID
  - User ID
  - Timestamp
  - Text content
  - Initial vote count: 0
- Record parent comment if replying to existing comment
- Increment post's comment count
- Add comment to the comment thread
- Award +2 karma to user
- Display comment after successful submission

WHEN a user replies to a comment, THE system SHALL:

- Create a new comment with parent-child relationship
- Record reply depth level
- Increment parent comment's reply count
- Record same community and post associations
- Maintain thread hierarchy
- Award +2 karma to user
- Display reply immediately below parent comment

WHEN a user reports content, THE system SHALL:

- Open reporting modal with predefined violation categories:
  - Harassment
  - Hate speech
  - Sexual content
  - Illegal content
  - Impersonation
  - Spam
  - Misinformation
  - Copyright infringement
  - Doxxing
- Require selection of ONE primary category
- Allow optional free-text explanation
- Submit report with:
  - Timestamp
  - Reporter's user ID
  - Reported content ID
  - Violation category
- Immediately hide reported content from non-moderators
- Notify moderators of the community
- Record in audit log
- Provide confirmation: "Thank you for reporting. Our moderators will review this."

### Building Reputation

WHEN a user creates high-quality content, THE system SHALL:

- Increase their karma through:
  - +1 for each upvote on post
  - -1 for each downvote on post
  - +1 for each upvote on comment
  - -1 for each downvote on comment
  - +2 for being selected as "Top Post" by algorithm
  - +1 for being selected as "Best Comment" by algorithm
- Display karma growth over time
- Award karma badges as thresholds are crossed
- Show karma ranking among peers
- Trigger community recognition when reputation reaches key milestones

WHEN a user's karma increases to a new threshold, THE system SHALL:

- Apply new privileges:
  - 10: Unlocks post creation
  - 50: Unlocks commenting
  - 100: Unlocks commenting voting
  - 200: Unlocks private community access
  - 500: Unlocks community creation
  - 1,000: Unlocks community promotion
  - 5,000: Unlocks report review
  - 10,000: Unlocks moderator nomination
- Display achievement badges on user profile
- Send notification: "Congratulations! You've reached [Karma Level]!
- Increase visibility of their content in algorithm ranking
- Grant additional benefits:
  - Higher upload limits
  - Reduced rate limits
  - Priority in community recommendations

WHEN a user violates community guidelines, THE system SHALL:

- Apply penalties to karma:
  - 5 points: Angle bracket spam
  - 5 points: Inflammatory language
  - 5 points: Posting identical content across >10 communities in 24 hours
  - 10 points: Posting links to known malware or phishing sites
  - 10 points: Sexual solicitation or inappropriate content
  - 15 points: Hateful speech or targeted harassment
  - 20 points: Attempting to manipulate karma
  - 50 points: Attempting to impersonate mods/admins
- Restrict privileges based on karma levels
- Issue temporary suspensions
- Display penalty notifications
- Record in user's moderation history

WHEN a user receives a karma penalty, THE system SHALL:

- Calculate new karma total (minimum: 0)
- Notify user with reason: "Your karma was reduced by X for [reason]"
- Display penalty in moderation history
- Update user's privileges based on new karma level
- Increase moderation scrutiny on future content

### Becoming a Moderator

WHEN a user reaches 10,000 karma, THE system SHALL:

- Display notification: "You've reached the karma threshold to nominate moderators!"
- Enable "Nominate Moderator" button on user profiles
- Allow user to nominate other users with 1,000+ karma
- Require justification for nomination
- Submit nomination to community for consideration

WHEN a community member is nominated for moderator role, THE system SHALL:

- Notify the nominated user
- Create a moderation election page for the community
- Allow community members to vote on candidate
- Require minimum 10% of community members to vote
- Require 75% approval for election
- Display candidate's karma, post history, and comment history

WHEN a user is elected as moderator, THE system SHALL:

- Grant moderator privileges immediately
- Add user to community's moderator list
- Grant additional karma: +500
- Notify community members: "[Username] has been elected as moderator!"
- Display moderator badge on their profile
- Create moderation dashboard
- Allow user to manage community settings
- Add user to moderation training program

WHEN a moderator is appointed, THE system SHALL:

- Assign moderation authority based on karma:
  - 500: Can remove comments
  - 1,000: Can remove posts
  - 2,500: Can issue 7-day temporary bans
  - 5,000: Can issue permanent bans
  - 10,000: Can appoint other moderators
- Allow access to moderation logs
- Provide access to moderation tools
- Require two-step confirmation for major actions

## Posting System

### Post Creation

WHEN a user decides to create a post, THE system SHALL:

- Verify user has 10+ karma
- Confirm user is not currently on a temporary suspension
- Ensure user account is active and verified
- Clear any prior draft content
- Present clean creation interface

WHEN a user clicks "Create Post", THE system SHALL:

- Open post creation dialog with three content options:
  - Text post
  - Link post
  - Image post
- Display character count, word count, and content type
- Show community selection dropdown
- Provide sample of high-quality posts for reference
- Display posting guidelines

WHEN a user submits a text post, THE system SHALL:

- Validate that content is at least 10 characters long
- Validate that content does not exceed 10,000 characters
- Check for prohibited words in moderation dictionary
- Validate that the post is not a duplicate of recent posts
- Check for excessive punctuation or repetition
- Validate community selection is active

WHEN a user submits a link post, THE system SHALL:

- Validate that URL format is correct
- Verify that domain is not on banned domains list
- Check domain reputation score
- Extract meta title if available
- Extract preview image if available
- Validate that link is not to a known malware site
- Ensure the URL resolves within 3 seconds
- Check that the target website is not under maintenance

WHEN a user submits an image post, THE system SHALL:

- Validate file format: JPG, PNG, GIF only
- Validate file size: maximum 10MB
- Validate image dimensions: maximum 8192x8192 pixels
- Extract image metadata if provided
- Generate thumbnail versions:
  - Small (300px width)
  - Medium (800px width)
  - Large (1500px width)
- Verify image doesn't contain prohibited content using AI filters
- Store original and scaled versions in object storage

WHEN a user submits any post, THE system SHALL:

- Generate UUIDv4 for the post
- Assign to selected community
- Record user as creator
- Record creation timestamp in UTC
- Record IP address
- Record content type
- Assign initial vote count of 0
- Store in database
- Create audit log entry
- Trigger notification to subscribed users
- Award +5 karma to creator

### Content Types

#### Text Posts

TEXT POSTS SHALL:

- Contain only plain text content
- Allow markdown formatting: bold, italic, lists, code blocks
- Limit to 10,000 characters
- Encourage original content over reposts
- Promote thoughtful commentary
- Allow formatting but no embedded media

The system SHALL NOT:

- Allow HTML tags
- Allow JavaScript execution
- Permit embedded videos
- Allow external CSS
- Support rich text editors

#### Link Posts

LINK POSTS SHALL:

- Contain only a valid URL
- Automatically fetch and display:
  - Metadata title
  - Preview image
  - Short description
  - Site icon
- Display original link below the preview
- Provide link in "Original" button

The system SHALL:

- Verify link is active and not broken
- Maintain original metadata
- Allow users to see the link with a single click

The system SHALL NOT:

- Allow link hiding via URL shorteners
- Accept URLs that redirect to malicious domains
- Support JavaScript redirects
- Permit links to dark web addresses

#### Image Posts

IMAGE POSTS SHALL:

- Contain only image content (JPG, PNG, GIF format)
- Display full-resolution image on click
- Show thumbnail in feed
- Allow zoom-in functionality
- Include text caption if provided
- Support GIF playback
- Allow image downloads

The system SHALL:

- Store original image
- Generate optimized thumbnails
- Compress large images where possible
- Maintain aspect ratio during display

The system SHALL NOT:

- Allow animated images larger than 5MB
- Embed scripts in image metadata
- Support WebP format
- Permit non-image files with image extensions

### Media Upload

WHEN a user uploads media, THE system SHALL:

- Accept only: JPG, PNG, GIF formats
- Reject all other file types
- Limit total file size to 10MB
- Limit resolution to 8192×8192 pixels
- Validate MIME type matches file extension
- Generate three thumbnail variants:
  - Small (300px wide)
  - Medium (800px wide)
  - Large (1500px wide)
- Store originals in encrypted object storage
- Create database record for media file
- Set content ID as foreign key to post
- Store file paths and metadata

WHEN an image is uploaded, THE system SHALL:

- Run AI-based content moderation:
  - Detect nudity
  - Detect violence
  - Detect hate symbols
  - Detect text that violates policy
- If automated detection flags content:
  - Hide from public view
  - Notify moderators
  - Record in audit log
- If content clears moderation:
  - Display normally to users
  - Assign to user's media library
  - Record upload count

WHEN a user uploads multiple images, THE system SHALL:

- Allow up to 10 images per post
- Display gallery view
- Allow individual image comments
- Provide swipe navigation
- Store files with sequential numbering
- Allow users to reorder images

### Character Limits

WHEN a user enters text in any post or comment, THE system SHALL:

- Display real-time character counter
- Show word count
- Set hard upper limit:
  - Text posts: 10,000 characters
  - Comments: 5,000 characters
  - Caption (image posts): 1,000 characters

WHEN a user exceeds character limits, THE system SHALL:

- Display warning message: "Maximum character limit reached"
- Disable post/comment submission button
- Allow trimming or editing of existing text
- Prevent automatic truncation

WHEN a user attempts to submit content below minimum threshold, THE system SHALL:

- Display warning:
  - Text post: "Your post must contain at least 10 characters"
  - Comment: "Comments must contain at least 5 characters"
- Disable submission button
- Allow user to continue typing

### Link Validation

WHEN a user adds a URL to a link post, THE system SHALL:

- Validate URL format with regex:
  - Must start with http:// or https://
  - Must have valid domain
  - Must not end with invalid characters
- Extract domain name
- Query domain reputation APIs
- Check against banned domains list
- Verify domain resolves within 3 seconds
- Extract meta information:
  - Title
  - Description
  - Image
- Validate target is not:
  - Shortened URLs (bit.ly, t.co, etc.)
  - Malware domains
  - Phishing sites
  - Adult content sites
  - Dark web addresses (.onion)
  - Known spam domains

WHEN a URL passes validation, THE system SHALL:

- Generate preview using metadata
- Display clean, readable version
- Store original URL for reference
- Add to link history

WHEN a URL fails validation, THE system SHALL:

- Display error: "The website you're trying to link to is restricted by our policy"
- Display reason: "Malware detected", "Phishing site", "Adult content", etc.
- Prevent submission
- Record failed attempt for fraud detection

### Content Moderation Triggers

WHEN a post is submitted, THE system SHALL:

- Analyze content with NLP engine for:
  - Harassment terms
  - Hate speech
  - Threats
  - Sexual solicitation
  - Doxxing indicators
  - Illegal activity references
  - Spam patterns
- Compare against moderation dictionary of 5,000+ flagged terms
- Check for repetitive content across multiple communities
- Evaluate text length and structure for low-effort content
- Compare against known spam patterns
- Analyze user's historical pattern

IF content matches any trigger:

- Place in "held for review" status
- Notify moderators of relevant community
- Hide from public display
- Send alert to system admin
- Record violation details
- Assign moderation priority score
- Prevent voting until review completed

IF content is deemed valid:

- Display publicly
- Enable voting
- Add to feed

## Voting System

### Vote Types

#### Upvotes

WHEN a member votes on a post or comment, THE system SHALL allow upvote actions. An upvote indicates the user finds the content valuable, informative, or entertaining. When a member casts an upvote, THE system SHALL increment the post's or comment's vote score by one.

WHEN a member votes on an existing post, THE system SHALL immediately update the visible vote count in real-time (within 500 milliseconds) for all viewers of that post.

WHEN a member votes on an existing comment, THE system SHALL immediately update the visible vote count in real-time (within 500 milliseconds) for all viewers of that comment.

#### Downvotes

WHEN a member votes on a post or comment, THE system SHALL allow downvote actions. A downvote indicates the user finds the content misleading, low-quality, or inappropriate. When a member casts a downvote, THE system SHALL decrement the post's or comment's vote score by one.

WHEN a member votes on an existing post, THE system SHALL immediately update the visible vote count in real-time (within 500 milliseconds) for all viewers of that post.

WHEN a member votes on an existing comment, THE system SHALL immediately update the visible vote count in real-time (within 500 milliseconds) for all viewers of that comment.

#### Vote Reversal

WHEN a member has already cast an upvote on a post or comment and casts another upvote, THE system SHALL remove the previous upvote and decrement the vote score by one.

WHEN a member has already cast a downvote on a post or comment and casts another downvote, THE system SHALL remove the previous downvote and increment the vote score by one.

WHEN a member has cast an upvote on a post or comment and casts a downvote, THE system SHALL remove the upvote and add a downvote, resulting in a net change of -2 to the vote score.

WHEN a member has cast a downvote on a post or comment and casts an upvote, THE system SHALL remove the downvote and add an upvote, resulting in a net change of +2 to the vote score.

### Vote Restrictions

#### User Type Restrictions

IF a guest attempts to vote on a post or comment, THEN THE system SHALL deny the request and display a message: "You must be a registered member to vote. Please sign up or log in."

IF a guest attempts to view individual vote information (such as "who voted"), THEN THE system SHALL hide all voter identities and show only aggregate vote counts.

#### Rate Limiting

WHILE a member is active, THE system SHALL permit a maximum of 100 votes per minute to prevent automated bot behavior.

WHEN a member exceeds 100 votes within a 60-second window, THEN THE system SHALL temporarily block further voting for 5 minutes and display a message: "Too many votes in a short time. Please wait before voting again."

IF a member attempts to vote on the same post or comment more than 5 times within 1 minute, THEN THE system SHALL block additional votes on that specific item for 10 minutes and display a message: "You've voted on this item too frequently. Please wait before voting again."

#### Vote Position Restrictions

WHEN a user tries to vote on a post they authored, THE system SHALL allow the vote and apply it normally.

WHEN a user tries to vote on a comment they authored, THE system SHALL allow the vote and apply it normally.

### Vote Display Logic

#### Vote Count Visibility

THE system SHALL display the net vote score (upvotes minus downvotes) for every post and comment.

THE system SHALL display the vote count as an integer: "+12" for 12 net upvotes, "-5" for 5 net downvotes, and "0" for even.

WHEN a post or comment has 0 votes, THE system SHALL display "0" not "No votes yet."

#### Vote Direction Indicators

WHEN a member has upvoted a post or comment, THE system SHALL display a filled-up arrow and highlight the upvote button.

WHEN a member has downvoted a post or comment, THE system SHALL display a filled-down arrow and highlight the downvote button.

WHEN a member has not voted on a post or comment, THE system SHALL display hollow-up and hollow-down arrows with no button highlighting.

WHEN a moderator or admin has voted on a post or comment, THE system SHALL display a small "mod" tag next to the vote direction indicator.

#### Vote Ratio Indicators

WHEN the ratio of upvotes to total votes exceeds 90%, THE system SHALL display a "Highly Upvoted" badge next to the vote count.

WHEN the ratio of downvotes to total votes exceeds 60%, THE system SHALL display a "Controversial" badge next to the vote count.

WHEN the ratio of upvotes to total votes is between 40% and 60%, THE system SHALL display a "Balanced" badge next to the vote count.

### Vote Manipulation Prevention

#### Vote Fraud Detection

THE system SHALL use electrical, network, and behavioral analysis to detect automated or coordinated voting patterns designed to artificially inflate or deflate scores.

WHEN the system detects a coordinated voting pattern (multiple accounts voting identically within 1 second on the same content across different communities), THEN THE system SHALL flag those votes as suspicious and temporarily mask those votes from public display. The votes shall be reviewed by an admin within 24 hours.

WHEN an admin reviews and confirms a coordinated voting attack, THEN THE system SHALL permanently remove the fraudulent votes and may impose penalties on the involved accounts per the moderation policy.

### Vote Anonymity

THE system SHALL prohibit any user from seeing who voted on a specific post or comment, including moderators and administrators.

WHEN a user attempts to access individual voting data (such as "Who upvoted this?"), THEN THE system SHALL respond with: "Voting is anonymous to protect user privacy."

THE system SHALL store vote information securely with no personally identifiable links between voting accounts and specific posts/comments beyond the necessary authentication linkage.

THE system SHALL not log voter IP addresses for the purpose of identifying voting patterns.

## Comment System

### Comment Creation

WHEN a member submits a comment on a post, THE system SHALL validate that:

- The user is authenticated (not a guest)
- The post is not archived or closed
- The comment text is not empty
- The comment text does not exceed 5,000 characters
- The comment text does not contain more than 20 URLs
- The comment text complies with the platform's content moderation rules

WHEN a comment is submitted, THE system SHALL:

- Generate a unique comment ID using UUIDv4
- Assign the comment to the parent post
- Record the user ID of the commenter
- Record the timestamp of creation in ISO 8601 format
- Increment the post's comment count
- Award +2 karma to the commenter

IF the comment contains text that matches any active moderation trigger term (defined in 10-moderation-policy.md), THEN THE system SHALL:

- Place the comment in "held for review" status
- Notify moderators of the post's community
- Prevent initial display to non-moderators
- Record the violation type and flagged keywords

### Nested Replies

WHEN a user replies to a comment, THE system SHALL:

- Establish a parent-child relationship between the parent comment and new reply
- Assign the reply to the same post as the parent comment
- Record the reply's depth level in the thread
- Increment the parent comment's reply count

WHILE a comment has active replies, THE system SHALL:

- Maintain the hierarchical relationship in the database
- Allow all replies to be sorted by the same criteria as the parent comment
- Preserve the entire thread structure regardless of moderation status

WHERE a user clicks "Reply" on a comment, THE system SHALL:

- Display a reply input field with the original comment embedded
- Show the username of the comment being replied to
- Include a "Cancel" option to abort without submission

### Reply Depth

IF a comment has reached a depth of 5 levels, THEN THE system SHALL:

- Prevent further replies to that comment
- Display a message: "This thread has reached maximum depth. Further replies are disabled."
- Allow replies to comments at depth 4 or lower

WHILE a user is composing a reply, THE system SHALL:

- Show the current depth level of the conversation
- Highlight when the reply will reach depth limit (depth 4)
- Display the "Maximum depth reached" warning for comments at depth 5

WHERE a post has an active comment thread exceeding 10,000 total replies, THE system SHALL:

- Disable new replies to that specific post
- Display a message: "This discussion has reached maximum comments. New replies are closed."
- Allow users to still upvote/downvote existing comments
- Keep existing discussion visible in its entirety

### Comment Editing

WHEN a member attempts to edit a comment, THE system SHALL:

- Validate that the user is the original author of the comment
- Check that the edit occurs within 15 minutes of the original comment creation
- Prevent editing if the comment has been moderated or reported
- Prevent editing if the comment has received more than 5 upvotes

WHEN an edit is approved, THE system SHALL:

- Preserve the original comment text in version history
- Record the edit timestamp and user ID
- Display "Edited" label next to the comment
- Append the edit history: "[Edited: {date} at {time}]" at the bottom of the comment
- Maintain the same karma score and vote count
- Notify all users who replied to the comment (if edits change meaning)

IF a comment was posted by a user who has been permanently banned, THEN THE system SHALL:

- Prevent any edits to that comment
- Show: "This comment was posted by a banned user and cannot be edited"
- Keep the original content visible

### Comment Deletion

WHEN a member deletes their own comment, THE system SHALL:

- Allow deletion within 1 hour of the comment's creation
- Hide the comment content for all users
- Replace the content with: "[Comment deleted by author]"
- Preserve the comment's karma impact on the author
- Maintain the comment's reply hierarchy (replies remain but show "[Deleted comment]")
- Decrement the post's comment count

WHEN a moderator deletes a comment, THE system SHALL:

- Allow deletion at any time regardless of age or karma
- Replace the content with: "[Comment removed by moderator]"
- Record the moderator's ID and reason for removal
- Record the violation category from 10-moderation-policy.md
- Notify the comment author via system message
- Preserve the comment's vote count and reply structure in the database
- Maintain the comment's position in the thread

WHEN an admin deletes a comment, THE system SHALL:

- Alternate between "[Comment removed by moderator]" and "[Comment removed by admin]" based on the role
- Trigger an audit log entry with full context
- Send a notification to all moderators of the community
- If the comment violated community rules, append: "Violation: {Title}"

IF a comment is deleted due to a successful appeal, THEN THE system SHALL:

- Restore the original comment content
- Remove the "removed" message
- Restore any previously hidden replies
- Send notification to user: "Your comment has been restored"

### Comment Moderation

WHEN a user reports a comment, THE system SHALL:

- Allow reporters to select one violation category (from 10-moderation-policy.md)
- Record the reporter's user ID and timestamp
- Record the comment ID and post ID
- Display "Reported" status to all non-moderators
- Queue the comment for review by any moderator of that community
- Prevent the reporter from seeing the reason for moderation decisions

WHEN a moderator reviews a reported comment, THE system SHALL:

- Validate the reported violation against moderation guidelines
- Determine if the comment violates community rules
- Take one of four actions: Confirm report and remove, Dismiss report, Issue warning to author, Notify user of appeal rights
- Record the moderator's decision, reason, and action taken
- Notify the commenter of the result via system message
- If removed, record the reason categories for future pattern analysis

WHEN a moderator deletes a comment, THE system SHALL:

- Show a dropdown form for community-specific violation categories
- Require a 20-character minimum justification
- Prevent the use of vague language like "inappropriate" without specifics
- Provide resistance during deletion of comments with >10 upvotes
- All edit history preserved in the audit log

WHILE a comment remains held for review, THE system SHALL:

- Display a grayed-out version to all users
- Show: "This comment is under review by moderators"
- Prevent downvotes and replies to the comment
- Allow upvotes to continue
- Display a count of reports against this comment

WHERE a comment receives 3 or more reports from distinct users within 5 minutes, THE system SHALL:

- Automatically flag the comment for priority review
- Notify all active moderators of the post's community
- Hide the comment from all users except moderators
- Send a system alert tag: "URGENT: 3+ reports within 5m"

IF a comment is confirmed as a violation, THE system SHALL:

- Remove the comment and all nested replies
- Apply a negative karma penalty of -5 to the originator
- Record the reason in the user's moderation history
- Increase the user's "trust score penalty" for future moderation
- Place a "Comment flagged" tag on all future comments from this user

IF a comment is dismissed as a false report, THE system SHALL:

- Remove the "Reported" label
- Restore visibility to all users
- Decrease the reporter's "report score" (a metric for report quality)
- Display a message to the reporter: "Your report was dismissed as invalid. Repeated invalid reports may restrict your ability to report."

WHEN a moderator views comments for moderation, THE system SHALL:

- Sort comments by: Latest first, Highest reported, Highest karma, Highest replies
- Filter by: Report count, Age, Post community, Comment depth
- Show one-click actions: Approve, Remove, Issue Warning, Ban User
- Display full audit trail: Original text, Edit history, Report logs, User karma

IF a user's comment is removed three times, THEN THE system SHALL:

- Place the user on 7-day temporary suspension
- Display a message: "Your account is temporarily suspended for 7 days due to repeated content violations."
- Freeze all posting rights during suspension
- Allow members to review their moderation history via profile

IF a user is reported five times for distinct comment violations, THEN THE system SHALL:

- Initiate automatic review by an admin
- Notify all moderators of the user's community
- Display a label on the user's profile: "Under Administrative Review"
- Block core features including posting, commenting, and voting

IF the user responds with a pattern of abusive comments after appeal is denied, THEN THE system SHALL:

- Permanently ban the user
- Remove all their content from the platform
- Display: "Account permanently banned for sustained violation of community guidelines"
- Prevent account re-creation under any UID or email

IF a comment is flagged as a "doxxing" violation (as defined in 10-moderation-policy.md), THEN THE system SHALL:

- Immediately remove the comment
- Ban the user for 30 days
- Trigger an admin investigation
- Disable the user's ability to create new accounts
- Notify authorities if personal data involves minors

IF a comment is flagged as a "hostile targeting" violation (as defined in 10-moderation-policy.md), THEN THE system SHALL:

- Immediately hide the comment from all users
- Notify the victim with safety resources
- Increase the severity of karma deduction to -10
- Place a "High Risk User" tag on the perpetrator's profile
- Assign a moderator to monitor all future activity

## Karma System

### Karma Calculation

The core karma system formula is:

> Karma = (∑ Upvotes Received) - (∑ Downvotes Received) + (∑ Reply Upvotes) - (∑ Reply Downvotes) - (Penalty Points)

Every karma change is recorded and auditable, but the detailed calculation is internal and not exposed to users.

The base calculation uses:

- +1 points for receiving an upvote on a post
- -1 points for receiving a downvote on a post
- +1 points for receiving an upvote on a comment
- -1 points for receiving a downvote on a comment
- +2 points for a post being selected as "Top Post" by algorithm
- +1 point for a comment being selected as "Best Comment" by algorithm

#### Penalty Points

Penalty points are applied for violations of community standards:

- 5 points: Angle bracket spam (e.g., "<This> <Is> <Spam>")
- 5 points: Inflammatory language flagged by NLP filters
- 5 points: Posting identical content across >10 communities in 24 hours
- 10 points: Posting links to known malware or phishing sites
- 10 points: Sexual solicitation or inappropriate content
- 15 points: Hateful speech or targeted harassment
- 20 points: Attempting to manipulate karma (self-voting, botting, vote rings)
- 50 points: Attempting to impersonate mods/admins

#### Additional Rules

- Karma cannot go below 0
- Karma decimals are not tracked - only integers are used
- Karma resets do not exist - history is permanent
- Karma calculation occurs after voting cooldown
- Karma is immediately recalculated when votes are changed
- Upvote/downvote votes from users with karma < 10 do not count

### Karma Sources

#### Earned Through Quality Contributions

1. **Posting Engaging Content** - Posts that receive upvotes from active members
2. **Writing In-Depth Comments** - Comments that receive upvotes, especially in threads with high engagement
3. **Creating Popular Communities** - New communities with rapid growth and activity gain karma bonuses
4. **Receiving "Best Comment"** - Algorithmic selection of top replies in a thread
5. **Receiving "Top Post"** - Algorithmic selection of most engaging posts on a community
6. **Helping Moderators** - Correctly reporting content that leads to valid removal
7. **Completing Community Guidelines Quiz** - First-time users who learn platform rules earn +50 karma

#### Not Earned Through

1. **Time Spent** - Logging in, browsing, or passively consuming content
2. **Posting Frequency** - Multiple low-effort posts or comments in rapid succession
3. **Community Size** - Joining large communities does not directly award karma
4. **Self-Promotion** - Direct advertising or link-only postings
5. **Voting Others** - Giving upvotes/downvotes does not change karma
6. **Leveling Up Features** - Unlocks are based on karma amount, not action count

### Karma Display

#### On User Profiles

- Total karma score is shown prominently on the user's public profile
- Avatar badge shows karma tier:
  - 0: "New user" (gray)
  - 10: "Contributor" (green)
  - 100: "Active member" (blue)
  - 500: "Respected user" (violet)
  - 1,000: "Veteran" (gold)
  - 5,000: "Community pillar" (platinum)
  - 10,000+: "Elder" (diamond)
- Karma history graph (total karma vs time) is visible to user and moderators
- Karma ranking among peers (position in community/user base) is shown as "Top 5% of users"
- Karma earned by category (posts, comments, moderation) is shown in "Karma Breakdown" section

#### In Content Streams

- Below every post and comment display, show user's karma as: "1.2K karma"
- In comment threads, karma appears on the user's name line
- Leaderboards show top 10 karma earners in each community
- Communities display "Top Contributors" with karma rank

#### For Guests

- Only see labeled tiers (e.g., "Veteran Member") without numeric score
- View aggregated karma levels visually (color-coded badges)
- See that high-karma users have "trusted contributor" status

### Karma Impact

Karma directly impacts user privileges in the platform:

#### Access Control

- 10: Can create a post (post creation unlock)
- 50: Can create a comment (comment creation unlock)
- 100: Can upvote or downvote comments (voting unlock)
- 200: Can join private communities
- 500: Can create new community
- 1,000: Can promote community to "Featured" status
- 5,000: Can review and validate user reports
- 10,000: Can nominate users as moderators

#### Visibility and Influence

- Posts from users with karma > 500 appear higher in "Hot" and "Top" rankings
- Comments from users with karma > 1,000 are prioritized in "Top Replies"
- Threads with opinions from users carrying karma > 2,000 are deemed "higher confidence" by algorithm
- Users with karma > 5,000 have "trusted analyst" badge visible on all interactions

#### Moderation Authority

- Users with karma >= 1,000 can report content
- Users with karma >= 5,000 can:
  - Participate in moderation review panels
  - View reports from lower-karma users first
  - Overrule moderator decisions (with admin confirmation)
- Admins consider karma level in: 
  - Who to appoint as moderators
  - Whose reports are escalated first
- Additional system restriction: 1.4% of all user reports must come from users with karma < 100 — prevents censoring by high-karma users

#### Social Recognition

- High-karma users receive:
  - "Contributor of the Week" badge
  - Auto-tags on their posts ("Top Poster", "Top Commenter")
  - Invitation to exclusive AMA sessions with admins
  - Ability to recommend new features for voting
- Bandwidth improvements:
  - Higher-karma users have reduced rate limits
  - Larger image uploads allowed
  - Toggle to disable ads for users with karma > 10,000

### Karma Decay Algorithm

To prevent "karma hoarding" and ensure reputation stays relevant:

- After a user goes 6 months without posting or commenting, 15% of karma decays
- After 12 months of inactivity, 30% of karma decays
- After 24 months of inactivity, 50% of karma decays
- Decay only affects total karma, not redeemable features (if karma drops below threshold, privileges are revoked)
- Decay does not apply to:
  - Users with karma >= 10,000 (elite status)
  - Active moderators regardless of visibility
  - Admins
- Decay is not retroactive - if a user returns after 1.5 years, they lose 30% of current karma, but do not lose privileges earned prior to decay
- Users are notified before decay:
  - First notification: 2 months before 6-month checkpoint
  - Second notification: 1 month before cutoff
- Karma decay success metric: 12% reduction in "zombie accounts" with >1,000 karma

## Community System

### Community Creation

WHEN a user decides to create a community, THE system SHALL:

- Verify user has 500+ karma
- Confirm user is not suspended or banned
- Check if the community name is available
- Display community creation wizard

WHEN a user requests to create a community, THE system SHALL:

- Require:
  - Community name (3-25 characters, alphanumeric + underscore)
  - Display name (up to 50 characters)
  - Description (max 200 characters)
  - Community type (public, private, locked)
  - Rules summary (max 500 characters)
  - Language preference
- Validate that community name doesn't match reserved keywords
- Check community name against existing similar names to prevent confusion
- Confirm legal compliance
- Assign default moderator team: creator + 4 additional moderators
- Generate unique community ID
- Set creation timestamp
- Initialize subscriber count to 1 (creator)
- Record audit log entry

WHEN a community is successfully created, THE system SHALL:

- Display confirmation: "Community created successfully!"
- Redirect to community page
- Add community to user's created communities list
- Award +500 karma to creator
- Notify all registered users of the new community
- Display community in "New Communities" section

### Subscription Method

WHEN a user wants to subscribe to a community, THE system SHALL:

- Verify user has 10+ karma
- Check if user is already subscribed
- Verify community is not archived or blocked

WHEN a user subscribes to a community, THE system SHALL:

- Add community to user's subscription list (database record with timestamp)
- Increase community's subscriber count by 1
- Mark user as a member with "subscriber" status
- Record event in audit log
- Trigger notification to all moderators
- Display confirmation: "You're now subscribed to [Community Name]"
- Update user's personalized feed to include community posts
- If community is private or locked, initiate approval process

WHEN a user unsubscribes from a community, THE system SHALL:

- Remove community from user's subscription list
- Decrease community's subscriber count by 1
- Stop including community posts in user's personalized feed
- Record event in audit log
- Display confirmation: "You've left [Community Name]"
- Preserve user's karma and content history from community

### Community Settings

WHEN community moderators or admins access community settings, THE system SHALL:

- Display configurable options:
  - Community name and display name
  - Description
  - Rules
  - Image banner
  - Language
  - Type: public/private/locked
  - Content filters
  - Moderation settings
  - Subscription requirements
  - Post sorting defaults
  - Karma requirements
  - Auto-archiving settings
  - User permissions
- Allow bulk changes
- Require confirmation for critical changes
- Record all changes with timestamp and executor identity

### Moderator Assignment

WHEN a community has an open moderator position, THE system SHALL:

- Allow users with 1,000+ karma to nominate themselves
- Allow any user with 10,000+ karma to nominate others
- Display nominations with:
  - User profile
  - Karma total
  - Post history
  - Comment history
  - Moderation report history (if any)
- Allow community members to vote on nominations
- Require 75% approval for appointment
- Notify appointed moderator
- Add to moderator list with permissions
- Grant moderator badge

WHEN a moderator is removed, THE system SHALL:

- Remove from moderator list
- Revoke moderator privileges
- Notify community members
- Record removal reason in audit log
- Keep moderation history for accountability

### Community Approval

WHEN a community is created as "private" or "locked", THE system SHALL:

- Require administrator approval before becoming active
- Present application to admin review team
- Include:
  - Community name and description
  - Proposed rules
  - Creator's karma and history
  - Initial moderator team
- Admin can:
  - Approve
  - Reject with reason
  - Request changes
- If approved:
  - Mark community as active
  - Notify community creator
  - Publish community
- If rejected:
  - Notify creator with reason
  - Enable appeal process

### Featured Communities

WHEN a community meets specific quality criteria, THE system SHALL:

- Consider for "Featured Community" status:
  - 1,000+ subscribers
  - 10+ active moderators
  - 30% of posts with 50+ upvotes
  - Karma-based quality score of 80+
  - Low rate of reports
  - Regular activity (at least 1 post per day)
  - Positive user feedback
- Admin team reviews finalists
- Selected communities appear on:
  - Homepage
  - Search results
  - New user recommendations
- Featured status increases visibility and subscriber growth
- Communities can lose featured status if quality declines

## Content Discovery

### Sorting Algorithms

#### Hot

The "Hot" algorithm rewards content that receives a high volume of activity within a short period of time. The algorithm considers:

1. Time-adjusted vote count
2. Upvote/downvote ratio
3. Number of replies
4. Comment karma scores
5. Recency of activity
6. Community activity level

WHEN sorting posts by "Hot", THE system SHALL:

- Calculate score using formula: `score = log10(upvotes + 1) + (replies * 0.4) + (karmaWeight) + (timeDecay)`
- Give higher weight to recent activity
- Apply exponential decay for older posts
- Adjust for community size
- Prevent spam by limiting artificial inflation
- Limit visibility of new posts from low-karma users

#### New

The "New" algorithm displays posts in reverse chronological order with no algorithmic manipulation.

WHEN sorting posts by "New", THE system SHALL:

- Order posts by creation timestamp descending
- Display oldest post on bottom
- Include all posts from all communities
- Apply time-based pagination
- Maintain strict chronological ordering
- Allow users to filter by time scope (last hour, day, week, etc.)

#### Top

The "Top" algorithm identifies posts with the highest overall popularity over time.

WHEN sorting posts by "Top", THE system SHALL:

- Order posts by total vote count descending
- Only include posts older than 24 hours
- Apply quality weighting based on reputation of voters
- Penalize posts with high downvote ratios
- Exclude posts with low engagement (below 3 votes and 1 comment)
- Limit results to posts from communities with positive quality scores

#### Controversial

The "Controversial" algorithm identifies posts that generate strong opposing opinions.

WHEN sorting posts by "Controversial", THE system SHALL:

- Calculate controversy score: `score = max(upvotes, downvotes) / min(1, min(upvotes, downvotes))`
- Filter out posts with fewer than 10 votes
- Prioritize posts with more balanced voting ratios (approaching 50/50)
- Apply time-weighting to ensure recency
- Filter out posts from highly polarized communities
- Exclude posts from users with karma < 50

### Time Scopes

WHEN a user selects a time scope, THE system SHALL:

- Adjust content filtering based on selected range:
  - "Now": Only posts from last hour
  - "Today": Posts from last 24 hours
  - "This week": Posts from last 7 days
  - "This month": Posts from last 30 days
  - "This year": Posts from last 365 days
  - "All time": All posts in system
- Apply scope consistently across "Hot", "Top", "New", and "Controversial" sorting
- Update URL parameters to enable sharing
- Adjust load limits based on time scope scope
- Display scope indicator clearly

### Search Functionality

WHEN a user performs a search, THE system SHALL:

- Support searching across:
  - Post titles
  - Post content
  - Comment text
  - Community names
  - User usernames
- Index content for fast retrieval
- Apply relevance ranking:
  - Exact matches (highest)
  - Partial matches in title
  - Partial matches in body
  - Match in comment
  - Match in community
- Consider user engagement metrics
- Filter results based on user's subscription status
- Show preview snippet with keywords highlighted
- Display results sorted by:
  - Relevance
  - Popularity
  - Recency
- Allow filtering by:
  - Community
  - Post type
  - Time range
  - User

### Trending Content

WHEN identifying trending content, THE system SHALL:

- Monitor for:
  - Sudden spikes in activity
  - Rapid increases in vote count
  - Fast comment growth
  - Multiple reports on the same post
- Analyze sharing patterns
- Track cross-community popularity
- Identify artificial inflation patterns
- Flag content that reaches "trending" thresholds
- Display trending content in:
  - Homepage sidebar
  - Community overview pages
  - Notifications
  - Recommended content

### Recommended Communities

WHEN suggesting communities to users, THE system SHALL:

- Analyze user's:
  - Subscribed communities
  - Posting history
  - Vote history
  - Comment history
  - Content moderation reports
- Compare with similar users
- Find communities with:
  - Similar topics
  - Similar activity levels
  - Similar moderation styles
  - Similar reputation scores
- Recommend communities based on:
  - Content affinity
  - Community quality
  - User engagement likelihood
  - Moderation effectiveness
- Display recommendations in:
  - User homepage
  - Onboarding flow
  - Community explore section
  - Search suggestions

## Moderation Policy

### Reporting Workflow

WHEN a user identifies content that violates community guidelines, THE system SHALL provide a prominent "Report" button on all posts and comments.

WHEN a user clicks the "Report" button, THE system SHALL open a modal with predefined violation categories and an optional free-form comment field.

THE system SHALL allow users to select only ONE primary violation category from defined options.

WHEN a report is submitted, THE system SHALL timestamp the report and assign it a unique identifier.

THE system SHALL immediately hide the reported content from public view for all users except the reporter and moderators.

WHILE content is under review, THE system SHALL display a banner saying "This content is under moderation review" to all non-moderator users.

THE system SHALL send an email notification to all moderators of the community where the content was posted.

THE system SHALL route the report to the first available moderator in the community's moderator list.

IF a community has no active moderators, THEN THE system SHALL escalate the report to system administrators.

WHERE a user submits five or more reports within one hour, THE system SHALL temporarily lock their reporting privileges for 24 hours.

### Content Violations

WHEN content is reported, THE system SHALL classify it according to the following violation categories:

1. Harassment: Targeted abuse, threats, or intimidation directed at specific users
2. Hate Speech: Content that attacks or demeans individuals or groups based on race, religion, gender, sexual orientation, or disability
3. Sexual Content: Explicit nudity, sexually suggestive material, or solicitation
4. Illegal Content: Material promoting or depicting illegal activities
5. Impersonation: Falsely representing oneself as another person or entity
6. Spam: Repetitive, irrelevant, or automated content posted to multiple communities
7. Misinformation: Deliberately false information presented as fact in areas where accuracy is critical
8. Copyright Infringement: Unauthorized use of copyrighted material without permission
9. Doxxing: Publishing private personal information about individuals without consent

THE system SHALL reject any report that does not clearly match one of these nine categories.

IF a report is submitted without selecting a violation category, THEN THE system SHALL return an error requiring the user to select a valid category.

WHEN a moderator reviews reported content, THE system SHALL automatically display the original post or comment alongside the report details and reporter information.

WHEN multiple users report the same content with the same violation category, THE system SHALL increase the priority of the review queue proportionally to the number of reports.

WHEN a post receives three or more reports of the same category within one hour, THE system SHALL automatically prevent new comments on the post.

### User Penalties

WHEN a user's content is determined to violate guidelines, THE system SHALL apply penalties based on the severity and frequency of violations:

#### Tier 1: First-time minor violation (e.g., spam, one-time inappropriate comment)

- THE system SHALL remove the violating content
- THE system SHALL issue a warning message to the user with a link to community guidelines
- THE system SHALL place the user on a 24-hour temporary suspension from posting and commenting

#### Tier 2: Repeated minor violations or single moderate violation (e.g., harassment, misinformation)

- THE system SHALL remove the violating content
- THE system SHALL issue a permanent ban from posting in one specific community
- THE system SHALL place the user on a 7-day temporary suspension from all posting and commenting
- THE system SHALL reduce the user's karma by 50 points

#### Tier 3: Severe or repeated violations (e.g., hate speech, threats, doxxing)

- THE system SHALL remove the violating content
- THE system SHALL permanently ban the user from all communities
- THE system SHALL apply a 30-day system-wide suspension from all activity
- THE system SHALL reduce the user's karma to zero
- THE system SHALL notify law enforcement if illegal activity is detected

#### Tier 4: System-level abuse (e.g., automated bots, mass reporting abuse)

- THE system SHALL permanently ban the user account
- THE system SHALL ban associated IP addresses and device fingerprints
- THE system SHALL initiate legal investigation procedures
- THE system SHALL delete all content created by the user
- THE system SHALL permanently prevent account re-registration under any identifier

WHEN a user receives a penalty, THE system SHALL record the penalty type, date, duration, and reason in their account history.

WHEN a user is suspended, THE system SHALL ensure the suspension applies to all devices and authentication methods.

THE system SHALL notify suspended users via email with details of the suspension, duration, and appeal rights.

### Appeal Process

WHEN a user receives a penalty, THE system SHALL provide an "Appeal" button in the notification email and their profile settings.

WHEN a user submits an appeal, THE system SHALL require the user to provide a written explanation of why they believe the penalty was incorrect.

THE system SHALL assign each appeal to an administrative review team separate from the original moderator who issued the penalty.

WHILE an appeal is under review, THE system SHALL maintain the penalty status unchanged.

THE system SHALL complete all appeals within 72 hours of submission.

IF an appeal is approved, THE system SHALL:

- Remove the penalty
- Restore visibility of all previously removed content
- Restore the user's karma to its pre-penalty value
- Remove any community restrictions
- Notify the user via email with detailed explanation

IF an appeal is denied, THE system SHALL:

- Maintain the original penalty
- Notify the user via email with detailed explanation of the reasoning
- Allow the user to submit one additional appeal after 30 days has elapsed

WHERE a user has received three or more penalties within a 12-month period, THEN THE system SHALL automatically deny any future appeals.

THE system SHALL provide a transparent decision summary for each appeal outcome.

### Moderator Guidelines

WHILE moderating content, THE system SHALL require moderators to:

1. Review the original content in context before taking action
2. Check the user's historical behavior and past penalties
3. Consider the community's specific guidelines if they exist
4. Apply penalties consistently across similar cases
5. Never use moderators' personal opinions to determine violations
6. Maintain strict confidentiality regarding reporter identity
7. Base all decisions on the defined violation categories
8. Document every action taken with timestamped notes

WHEN a moderator applies a penalty, THE system SHALL require them to select one of the predefined violation categories and enter a brief justification.

IF a moderator applies a penalty that is actively appealed by a user, THEN THE system SHALL freeze the penalty's effects until the appeal process is completed.

THE system SHALL automatically flag any moderator who applies more than 10 penalties in a single hour for review by administrators.

WHOEVER is a moderator of a community SHALL not be able to moderate their own content.

THE system SHALL provide moderators with an "escalate to admin" option for complex or controversial cases.

### Transparency Requirements

THE system SHALL provide a public transparency report updated quarterly that includes:

- Total number of reports received
- Number of reports confirmed as violations
- Number of reports dismissed as false
- Distribution of violations by category
- Total number of warnings issued
- Total number of suspensions by duration
- Total number of permanent bans
- Number of appeals submitted
- Number of appeals approved
- Average time to process appeals

THE system SHALL display specific moderation actions taken on each user's profile with timestamped logs (without exposing reporter identity).

THE system SHALL provide a public dashboard showing moderation statistics for each community.

WHEN a user is permanently banned, THE system SHALL display a notice on their profile stating "This account has been permanently banned for violating community guidelines" without disclosing the specific reason.

THE system SHALL set all moderation-related data to be non-deletable and permanently archived.

WHERE users have received multiple penalties, THE system SHALL display an aggregate warning on their profile visible only to moderators.

THE system SHALL provide a public process guide "How Moderation Works" available to all registered users.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*

## Authentication

### Login Flow

WHEN a user attempts to access a protected feature, THE system SHALL:

- Check for active authenticated session
- If session is valid and not expired:
  - Allow access without prompt
- If session is expired or non-existent:
  - Redirect to login page
- If user is not registered:
  - Provide "Sign Up" option

WHEN a user attempts to log in, THE system SHALL:

- Accept credentials:
  - Email address (case-insensitive matching)
  - Password
- Authenticate against storage
- Generate JWT token with expiration (7 days)
- Store token in secure HTTP-only cookie
- Set refresh token in secure, same-site cookie
- Record login timestamp in user history
- If successful:
  - Redirect to requested page
  - Display welcome message
  - Update user activity status
- If failed:
  - Display error message
  - Record attempt in security log
  - Apply exponential delay for repeated failures

WHEN a user logs out, THE system SHALL:

- Delete JWT token from client
- Invalidate refresh token
- Remove authentication cookies
- Redirect to homepage
- Clear session state

### Session Management

THE system SHALL:

- Generate secure JWT with HS256 algorithm
- Include claims: user ID, email, role, creation timestamp, expiration timestamp
- Set expiration: 7 days for access token, 30 days for refresh token
- Use refresh token rotation
- Verify signature on every protected request
- Renew access token automatically on expiration if refresh token is valid
- Limit concurrent sessions per user (5 maximum)
- Allow users to view active sessions and revoke individually
- Implement server-side session revocation
- Store session state in cache database
- Log all authentication events

### Access Control

THE system SHALL implement role-based access control based on user actor type:

| Feature | Guest | Member | Moderator | Admin |
|---------|-------|--------|-----------|-------|
| Browse communities | ✓ | ✓ | ✓ | ✓ |
| View posts | ✓ | ✓ | ✓ | ✓ |
| View comments | ✓ | ✓ | ✓ | ✓ |
| View profiles | ✓ | ✓ | ✓ | ✓ |
| Search content | ✓ | ✓ | ✓ | ✓ |
| Create account | ❌ | ✳️ | ✳️ | ✳️ |
| Login | ❌ | ✓ | ✓ | ✓ |
| Logout | ❌ | ✓ | ✓ | ✓ |
| Create post | ❌ | ✓ (10+ karma) | ✓ | ✓ |
| Edit post | ❌ | ✓ (within 15 min) | ✓ | ✓ |
| Delete post | ❌ | ✓ (within 1 hr) | ✓ | ✓ |
| Comment | ❌ | ✓ (50+ karma) | ✓ | ✓ |
| Edit comment | ❌ | ✓ (within 15 min, <5 upvotes) | ✓ | ✓ |
| Delete comment | ❌ | ✓ (within 1 hr) | ✓ | ✓ |
| Upvote/downvote posts | ❌ | ✓ (100+ karma) | ✓ | ✓ |
| Upvote/downvote comments | ❌ | ✓ (100+ karma) | ✓ | ✓ |
| Report content | ❌ | ✓ | ✓ | ✓ |
| Subscribe to community | ❌ | ✓ | ✓ | ✓ |
| Create community | ❌ | ✓ (500+ karma) | ✓ | ✓ |
| Review reports | ❌ | ✓ (5,000+ karma) | ✓ | ✓ |
| Nominate moderators | ❌ | ✓ (10,000+ karma) | ✓ | ✓ |
| Remove content | ❌ | ❌ | ✓ | ✓ |
| Issue bans | ❌ | ❌ | ✓ (7 days, 2,500+ karma) | ✓ |
| Permanent ban | ❌ | ❌ | ✓ (10,000+ karma) | ✓ |
| Manage moderators | ❌ | ❌ | ❌ | ✓ |
| Manage system settings | ❌ | ❌ | ❌ | ✓ |

> *Key: ✓ = allowed, ❌ = forbidden, ✳️ = registration required*

## Success Metrics

### User Engagement

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Daily Active Users | 100K | Login tracking within 24 hours |
| Registration Conversion | 45% | Users who complete signup after landing |
| Time Spent Per Session | 15 minutes | Server-side session tracking |
| Posts Per Active User | 3 per week | Post creation logging |
| Comments Per Post | 3 | Comment count analytics |
| Voting Participation | 85% of users | Vote tracking against active users |
| Community Subscription Rate | 80% | Subscribe/unsubscribe tracking |
| Report Submission Rate | 1 per user per month | Report logging |
| Content Creation by High-Karma Users | 80% | Karma threshold (100+) analysis |
| Post-to-Comment Ratio | 1:2 | Post vs comment count correlation |

### Content Quality

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Average Karma Per Active User | 500+ | Karma calculation system |
| Posts from High-Karma Users | 90% | Threshold (100+ karma) analysis |
| Ratio of Upvotes to Downvotes | 5:1 | Vote ratio calculation |
| Downvotes per 100 posts | < 5 | Downvote count tracking |
| Reported Content Rate | < 1% | Reports vs total content volume |
| Approved Reports | 85% | Validation of reported content |
| Time to Resolve Report | < 24 hours | Report to action time tracking |
| Comment Spam Rate | < 2% | Duplicate content detection |
| Moderation Accuracy Rate | 95% | Appeals success rate analysis |
| User Satisfaction with Moderation | 80% | In-app survey responses |

### Moderation Effectiveness

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Reports Processed | > 95% | Track reports to resolution |
| Appeals Granted | < 5% | Appeal review outcomes |
| Moderator Response Time | < 4 hours | Time from report to action |
| Repeat Offenders | < 2% | User ban recurrence tracking |
| Mod Abuse Reports | < 0.5% | Reports against moderators |
| Community Compliance Score | 100% | Audit against community rules |
| Moderator Coverage | 1 moderator per 10K users | Moderator-to-user ratio |
| Moderation Consistency | > 90% | Cross-community policy enforcement |
| False Positive Rate | < 1% | Validated false reports |
| Recovery Rate (Appeals) | 2.5% | Approved appeals vs total appeals |

### System Performance

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Uptime | 99.95% | System monitoring tools |
| Post Creation Latency | < 500ms | Server response timing |
| Comment Loading | < 500ms | Page load testing |
| Voting Response | < 300ms | API response metrics |
| Search Results | < 500ms | Internal search service timing |
| Database Query Performance | < 100ms | Query analyzer tools |
| Concurrent Users Support | 10,000 | Load testing with simulation |
| Error Rate | < 0.1% | Error logging and monitoring |
| API Availability | 99.9% | Monitoring service checks |
| Backup Integrity | Daily | Automated backup verification |

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*