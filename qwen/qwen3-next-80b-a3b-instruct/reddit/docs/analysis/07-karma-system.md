# Reddit-like Community Platform Requirements

## Service Overview

The platform is a decentralized, user-driven community hub designed to replicate the core social interaction mechanics of Reddit while enhancing content quality, moderation effectiveness, and user engagement through structured reputation systems and intelligent content discovery. Unlike existing platforms that prioritize viral content and algorithmic amplification, this system balances user autonomy with community governance, enabling organic quality curation through transparent reputation and community-owned moderation.

The platform enables users to create, join, and participate in topic-specific communities (subreddits) where content is curated through collective voting and reputation-based influence. Users earn trust through meaningful contributions, which translates into increased visibility, moderation privileges, and community influence. This creates a self-reinforcing ecosystem where quality content surfaces naturally, spam and abusive behavior are mitigated through systemic disincentives, and communities evolve organically based on their members' preferences and norms.

The system operates on a principle of minimal central control, with administrative intervention reserved for egregious violations or system-level failures. Moderation is distributed across communities, with each community establishing its own rules within broad platform guidelines. This community-driven governance model ensures relevance, adaptability, and cultural sensitivity across diverse interest groups while maintaining platform-wide standards for safety and integrity.

The system's success is measured not by user growth metrics alone but by the density of meaningful interactions, reduction in reported violations, and retention of high-karma contributors. Revenue generation flows from premium experiences for engaged users rather than invasive advertising, aligning business incentives with user experience quality.

Platform governance follows a clear hierarchy: Guests observe, Members participate, Moderators enforce, and Administrators safeguard. Each role has distinct permissions and responsibilities, with the system designed to prevent privilege escalation through abuse. The karma system acts as the core economic engine, incentivizing constructive behavior and penalizing disruptive actions. Reputation is portable across communities but not fungible—karma earned in one community doesn't automatically confer status in another, preserving community autonomy.

This document details the comprehensive business requirements for implementation without specifying technical architecture, database schema, or API endpoints. These will be determined in subsequent phases of the AutoBE pipeline.

## User Actors and Permissions

The system defines four distinct user actors, each with escalating privileges and responsibilities:

### Guest (Unauthenticated User)
- May browse all public communities and view all content
- May view post and comment vote counts but cannot cast votes
- May see karma levels as labeled tiers ("New user", "Contributor", etc.) but not numeric values
- May use reporting mechanism to flag inappropriate content
- Cannot create posts, comments, or communities
- Cannot subscribe to communities
- Cannot view user profiles or activity history
- Cannot use search functionality beyond basic keyword matching
- Session expires after 24 hours of inactivity

### Member (Authenticated User)
- May perform all Guest actions
- May register and log in using email and password or third-party OAuth providers
- May create new posts in any public community they have not been banned from
- May comment on any post in any community they have not been banned from
- May submit upvotes and downvotes on posts and comments
- May subscribe to an unlimited number of communities (up to a system limit of 50)
- May create new communities when they have accumulated 500 karma
- May edit their own posts and comments within 15 minutes of creation
- May delete their own posts and comments within 1 hour of creation
- May report inappropriate content with specific reason categorization
- May view detailed karma scores and history on their own profile
- May view complete public profiles of other users including their karma score, post history, and comment history
- May follow other users to see their activity in personalized feeds

### Moderator (Assigned Community Administrator)
- May perform all Member actions
- May be appointed by community creator or Admins to manage one or more communities
- May set community-specific rules covering acceptable content, posting formats, and behavioral norms
- May delete any post or comment in their community
- May issue temporary bans (1 day, 7 days, 30 days) to users who violate community rules
- May appoint other members as moderators for their community
- May pin important posts to the top of the community feed
- May set community visibility (public/private) and post type restrictions
- May move posts between communities under special circumstances
- May review and act upon user reports within their community
- May issue warnings directly to community members for minor violations
- May temporarily lock threads to prevent further comments during sensitive events
- Must meet minimum karma threshold of 100 to be eligible for appointment
- Cannot moderate communities they are not appointed to
- Cannot ban users from the entire platform
- Cannot access content from private communities they don't subscribe to
- Cannot view moderator action logs of other communities

### Admin (Platform Administrator)
- May perform all Moderator actions across all communities
- May appoint or remove moderators from any community
- May ban users from the entire platform permanently
- May create or delete entire communities
- May override all moderation decisions made by community moderators
- May access all platform-wide moderation logs and audit trails
- May adjust karma penalties and rewards system-wide
- May implement changes to the core business logic, content filtering rules, or karma calculation formulas
- May grant verified status to users and communities
- May configure system-wide settings such as rate limits, character restrictions, and automated moderation triggers
- May respond to legal requests for data, content removal, or account deactivation
- Are the only actors who can unban permanently banned users
- Must meet minimum karma threshold of 10,000 to be eligible for promotion
- Are subject to additional oversight and audit controls
- Are required to document all platform-level changes with justification
- Cannot modify the business logic without consensus from other Admins

## Core Functional Requirements

### User Registration and Login

WHEN a guest attempts to access the registration page, THE system SHALL present a form requiring:
- Valid email address
- Username (3-20 alphanumeric characters, underscores allowed)
- Password (minimum 12 characters, must contain at least one uppercase letter, one lowercase letter, one number, and one special character)
- Acceptance of Terms of Service and Privacy Policy

WHEN a guest submits registration information, THE system SHALL:
- Validate email format and domain reputation
- Check username uniqueness across the entire platform
- Verify password complexity compliance
- Store password using bcrypt with salt
- Generate a unique UUID for the user account
- Create a new user profile with default karma value of 0
- Send a verification email containing a one-time use token
- Store the account in "unverified" status until email confirmation

WHEN an unverified user attempts to log in, THE system SHALL:
- Allow login authentication if credentials are correct
- Prevent access to all functional features except profile viewing
- Display persistent banner: "Your email address must be verified to post, comment, or vote. Check your inbox for verification link."

WHEN a user clicks the verification link in the email, THE system SHALL:
- Validate the one-time token
- Confirm email ownership
- Update user status to "verified"
- Grant full Member privileges immediately
- Log the verification event with timestamp and IP address
- Remove the unverified status flag
- Send confirmation email: "Your account is now verified. You may now participate fully in our community."

WHEN a user attempts to log in with valid credentials, THE system SHALL:
- Validate password against stored hash
- Issue JWT token with 7-day expiration
- Set secure HTTP-only cookies for session management
- Reset any temporary login locks due to previous failed attempts
- Record the login timestamp and device fingerprint
- Return full user profile data including karma, subscriptions, and reputation tier

WHEN a user attempts to log in with invalid credentials, THE system SHALL:
- Increment failed attempt counter for that account and IP combination
- If failed attempts exceed 5 in 15 minutes, temporarily lock the account for 30 minutes
- Display message: "Too many failed attempts. Please try again later."
- Log the attempt for security monitoring without exposing account existence

WHEN a user requests password reset, THE system SHALL:
- Verify account existence (without confirming existence for security purposes)
- Send password reset email with time-limited token (15-minute expiration)
- Allow password change only when presented with valid token
- Invalidate all existing active sessions upon successful password reset
- Require new password to meet current complexity requirements
- Send confirmation email: "Your password has been successfully changed. If you did not request this change, immediately contact support."

WHEN a guest uses third-party authentication (Google, Apple, GitHub), THE system SHALL:
- Obtain verified email from authentication provider
- Match existing user if email already exists in system
- Create new user account if email is new
- Auto-verify account upon successful OAuth authentication
- Link social identity to user profile for future authentications
- Preserve existing karma and content history if account was previously created with same email

### Community Creation and Management

WHEN a Member with ≥500 karma attempts to create a new community, THE system SHALL:
- Require submission of: unique community name (lowercase alphanumeric plus hyphens/underscores only), brief description (<500 characters), and community banner image (JPG/PNG, ≤5MB)
- Validate that community name is not a reserved word ("admin", "moderator", "system", etc.)
- Validate that community name doesn't infringe on registered trademarks
- Check for duplicate community names (exact case-insensitive match)
- Create community with creator as default moderator
- Set default community settings: public visibility, mixed content allowed, comment depth limit of 5
- Auto-generate welcome post with template rules
- Award +100 karma to community creator
- Publish announcement in "New Communities" section

WHEN a community creation request contains a name with banned keywords ("hate", "abuse", "violent", etc.), THE system SHALL:
- Reject immediate creation
- Place community in "pending approval" state
- Notify creator: "Community creation pending review. Our administrators will evaluate your community name for policy compliance within 48 hours."
- Display "Pending Approval" banner on community page
- Block all subscriptions and public indexing

WHEN an Admin approves a pending community, THE system SHALL:
- Remove "pending approval" state
- Make community publicly discoverable
- Index community in directory searches
- Allow all members to subscribe
- Send notification: "Congratulations! Your community '[Community Name]' has been approved and is now live."

WHEN an Admin rejects a pending community, THE system SHALL:
- Display rejection reason to creator
- Prevent any further community creations for 14 days
- Send notification: "Your community '[Community Name]' was not approved because: [Reason]. You may resubmit after 14 days."

WHEN a community is marked private, THE system SHALL:
- Be hidden from public directory searches
- Require moderator approval for all subscription requests
- Allow only subscribed members to view content
- Not appear in trending or featured lists
- Only show community card to users who have been invited or approved

WHEN a member attempts to subscribe to a private community, THE system SHALL:
- Display "Request Access" button instead of "Subscribe"
- Submit subscription request to community moderators
- Notify moderators of pending request with member details
- Display notification: "Your request to join is pending approval. You will be notified when approved."
- Prevent access to community content until approval granted

WHEN a moderator approves a subscription request, THE system SHALL:
- Add user to community subscription list
- Send notification: "You've been approved to join '[Community Name]'. Welcome!"
- Remove request from pending queue
- Update community subscription count
- Grant full member privileges in the community

WHEN a moderator denies a subscription request, THE system SHALL:
- Send notification: "Your request to join '[Community Name]' has been denied."
- Log reason for denial (optional field)
- Prevent resubmission for 7 days
- Maintain user's ability to view community publicly without subscribing

WHEN a community is deleted by an Admin, THE system SHALL:
- Archive all posts and comments in persistent storage
- Remove community from all user subscription lists
- Notify all subscribers: "The community '[Community Name]' has been permanently removed. All content has been archived and is no longer accessible."
- Redirect any direct community URLs to a generic archive page
- Preserve moderation logs for audit purposes indefinitely
- Not reclaim the community name for reuse

WHEN a community has no active moderators, THE system SHALL:
- Automatically notify Admins
- Temporarily freeze all community-specific moderation actions
- Allow Admins to appoint replacement moderators
- Maintain active posts and comments visible to subscribers
- Disable new community creation for users while community is moderatorless

WHEN a community has ≥10,000 subscribers, THE system SHALL:
- Require admin approval for any community name changes
- Require 7-day waiting period before any fundamental rule changes
- Implement auto-review for all link posts
- Display "Large Community" badge
- Limit new moderator appointments to users with ≥5,000 total karma
- Require moderator approval before any new community-related settings can be changed

### Posting System

WHEN a Member attempts to create a post, THE system SHALL:
- Require selection of one public or subscribed community
- Require entry of post title (3-300 characters)
- Require selection of content type: text, link, or image
- Disable creation if user has been banned from the selected community

WHEN a Member creates a text post, THE system SHALL:
- Require post body content (minimum 10 characters, maximum 10,000 characters)
- Apply text formatting filters (no executable code, no embedded scripts)
- Validate character count compliance
- Apply moderation triggers (spelling checker, spam pattern detection)
- Store as plain text with HTML entities escaped
- Apply character encoding validation (UTF-8 only)

WHEN a Member creates a link post, THE system SHALL:
- Require valid URL (https:// or http:// protocol)
- Validate URL resolves and returns HTTP 200-399 status code
- Expand shortened URLs before validation
- Prevent submission if URL domain is on banned list (malware, phishing, adult content)
- Prevent submission if URL points to internal network addresses (127.0.0.1, 192.168.x.x, localhost, etc.)
- Auto-generate preview using Open Graph protocol with title, description, and primary image
- Enforce URL length restriction (maximum 2,000 characters)
- Apply moderation triggers for URL patterns

WHEN a Member creates an image post, THE system SHALL:
- Allow upload of up to 10 images per post
- Validate each image file is ≤10 MB in size
- Validate image format is one of: JPEG, PNG, GIF, WEBP
- Validate image dimensions do not exceed 10,000 pixels in width or height
- Resize and compress images for web delivery using lossy compression with ≤5% perceptual quality loss
- Generate three renditions: thumbnail (120x120), preview (640x640), and original
- Store assets in distributed object storage
- Hash images to detect duplicates and prevent redundant storage
- Apply automated content moderation checks (NSFW detection, text-in-image extraction)

WHEN a Member attempts to attach both link and image content in a single post, THE system SHALL:
- Block submission
- Display error: "You cannot attach both a link and images in the same post. Choose one format."

WHEN a post contains >3 URLs, THE system SHALL:
- Flag for manual moderation review
- Display warning to user: "Your post contains multiple links. A moderator will review it before publication."
- Temporarily hold post in "under review" state

WHEN a post contains text matching spam patterns (repetitive phrases, excessive symbols, gibberish), THE system SHALL:
- Flag for AI moderation
- Display message: "Your post has been flagged for potential spam. A moderator will review it."

WHEN a post is submitted with title exceeding 80% capital letters, THE system SHALL:
- Flag for moderation review
- Display warning: "Your title contains excessive capitalization. This may trigger automated review."

WHEN a post is submitted containing image content visually identical to previously banned image hashes, THE system SHALL:
- Block submission immediately
- Display: "This image has been previously identified as violating our content policy and cannot be uploaded."

WHEN a user attempts to create a post within 30 seconds of account creation, THE system SHALL:
- Require CAPTCHA verification
- Limit the post to text only (no links or images)
- Display: "To protect our community from spam, new accounts must complete a quick verification before posting."

WHEN a post is submitted containing banned keywords (e.g., "free", "guarantee", "no credit check"), THE system SHALL:
- Flag for moderation review
- Record keyword match for pattern analysis
- Maintain post temporarily in "pending review" state

WHEN a user has negative karma < -50, THE system SHALL:
- Require CAPTCHA before posting
- Restrict posting to communities they've subscribed to for >7 days
- Display warning: "Your current karma is below the threshold for unrestricted posting. You must complete a verification challenge to post."

WHEN a user attempts to post in a community where they've been previously banned, THE system SHALL:
- Block submission immediately
- Display: "You are banned from posting in [Community Name]."
- Prevent subscription to community
- Maintain record of ban status indefinitely

WHEN a community has >10,000 subscribers and user attempts link posting, THE system SHALL:
- Require moderator approval before publishing
- Display: "Link posts in large communities require moderator approval to prevent spam. You will be notified when approved."

WHEN a post is successfully created, THE system SHALL:
- Assign unique post ID using UUIDv4
- Record timestamp in ISO 8601 UTC format
- Increment community post count
- Award +5 karma to post author
- Place post in queue for algorithmic ranking
- Notify subscribed users in real-time via push notification
- Create immutable record with content hash for audit purposes

WHEN a post is created with duplicate content from the same user within same community in past 24 hours, THE system SHALL:
- Block submission
- Display: "You've posted this content recently. Please wait before posting again."

WHEN a post is created with content that is ≥95% identical to a top-performing post from another community within past 48 hours, THE system SHALL:
- Flag for plagiarism detection
- Notify user: "This content resembles a recently popular post. Consider adding unique value or context to your contribution."

### Voting System

WHEN a member attempts to upvote a post or comment, THE system SHALL:
- Validate user is not the author of the content
- Validate user has not already upvoted the item
- Validate user is not under temporary voting suspension
- Validate user has karma ≥100 if voting on comments (comment voting unlocks at 100 karma)
- Increment vote count by +1
- Record vote with: user ID, content ID, timestamp, vote type, and device fingerprint
- Display immediate visual feedback (filled-up arrow)
- Recalculate and refresh vote score for all viewers
- Award creator +1 karma for upvote

WHEN a member attempts to downvote a post or comment, THE system SHALL:
- Validate user is not the author of the content
- Validate user has not already downvoted the item
- Validate user is not under temporary voting suspension
- Validate user has karma ≥100 if voting on comments (comment voting unlocks at 100 karma)
- Decrement vote count by -1
- Record vote with: user ID, content ID, timestamp, vote type, and device fingerprint
- Display immediate visual feedback (filled-down arrow)
- Recalculate and refresh vote score for all viewers
- Award creator -1 karma for downvote

WHEN a member attempts to change their vote from upvote to downvote on an item, THE system SHALL:
- Remove previous upvote (decrement score by -1)
- Add new downvote (decrement score by -1)
- Net score change: -2
- Record two vote changes in audit log
- Display updated visual indicators
- Award creator -2 karma (reversal of +1 and penalty of -1)

WHEN a member attempts to change their vote from downvote to upvote on an item, THE system SHALL:
- Remove previous downvote (increment score by +1)
- Add new upvote (increment score by +1)
- Net score change: +2
- Record two vote changes in audit log
- Display updated visual indicators
- Award creator +2 karma (reversal of -1 and reward of +1)

WHEN a member attempts to upvote an item they previously upvoted, THE system SHALL:
- Remove their upvote
- Decrement score by -1
- Clear visual indicator
- Award creator -1 karma
- Record action in audit log

WHEN a member attempts to downvote an item they previously downvoted, THE system SHALL:
- Remove their downvote
- Increment score by +1
- Clear visual indicator
- Award creator +1 karma
- Record action in audit log

WHEN a member attempts to vote on content they authored, THE system SHALL:
- Allow the vote
- Apply normal karma calculations
- Record vote but flag as "self-vote" in audit
- Display "Your vote" tag next to their vote
- Include self-votes in public score but separate them in analytics

WHEN a member submits more than 100 votes within 60 seconds, THE system SHALL:
- Block additional votes for 5 minutes
- Display: "Too many votes in a short time. Please wait before voting again."
- Log as suspected bot behavior
- Apply temporary account flag

WHEN a member attempts to vote on the same content more than 5 times within 1 minute, THE system SHALL:
- Block additional votes on that specific item for 10 minutes
- Display: "You've voted on this item too frequently. Please wait before voting again."
- Log as potential manipulation attempt

WHEN a member votes on content from an IP address associated with >20 distinct accounts voting similarly, THE system SHALL:
- Flag as coordinated voting attack
- Mask votes from public display
- Notify system administrators
- Queue for manual review
- May permanently remove votes if confirmed as coordinated

WHEN a vote is submitted from a new device, THE system SHALL:
- Record device fingerprint
- Increase vote weight to 0.5 for 24 hours
- Display: "This device has not voted before on our platform. Votes from new devices are weighted lower to prevent abuse."

WHEN a vote is submitted from a user with account age <24 hours, THE system SHALL:
- Apply vote discount: 50% of normal vote value
- Display: "Your account is new, so your vote has reduced weight. This helps prevent abuse by automated accounts."

WHEN a vote is submitted from a user with karma <10, THE system SHALL:
- Apply vote discount: 80% of normal vote value
- Display: "Your karma is low, so your vote has reduced weight. As you contribute, your vote's influence will grow."

WHEN a vote is submitted from a proxy server or Tor network, THE system SHALL:
- Reject vote
- Display: "Votes from anonymous networks are not permitted to ensure accountability."
- Log IP address
- May initiate account review if repeated

WHEN a user receives more than 20 downvotes on a single post within 1 hour, THE system SHALL:
- Notify user: "Your post received many downvotes. Consider refining your contribution."
- Flag post for algorithmic review
- May temporarily reduce visibility
- May suggest related content with higher engagement

WHEN a user receives more than 50 upvotes on a single comment within 1 hour on a large community, THE system SHALL:
- Notify user: "Your comment received many upvotes! You've been selected as 'Best Comment.'"
- Apply "Best Comment" badge to comment
- Award +1 karma
- Highlight comment in algorithmic rankings
- Notify community moderators of highly-engaged comment

### Comment System with Nested Replies

WHEN a Member attempts to reply to a post, THE system SHALL:
- Require comment text (minimum 5 characters, maximum 5,000 characters)
- Limit URL count to 20
- Apply moderation checks
- Block replies if user is banned from the community
- Allow reply immediately if user is the post author
- Award +2 karma to reply author

WHEN a Member attempts to reply to a comment, THE system SHALL:
- Validate the target comment exists and is not deleted
- Validate the reply is not nested deeper than level 5
- Validate reply text meets minimum character requirements
- Apply same moderation rules as post replies
- Assign comment a level number = parent level + 1
- Increment parent comment's reply counter
- Record reply relationship in database as parent-child hierarchy
- Award +2 karma to reply author

WHEN a comment reaches depth level 5, THE system SHALL:
- Disable further replies to that comment
- Display message: "This thread has reached maximum depth. Further replies are disabled."
- Allow replies to comments at level 4 or lower
- Maintain existing replies visible

WHEN a comment receives 500+ replies, THE system SHALL:
- Disable additional replies to the entire post
- Display message: "This discussion has reached maximum comments. New replies are closed."
- Allow new comments on other posts
- Continue to support upvoting/downvoting of existing replies
- Preserve reply history in persistent storage

WHEN a user edits their own comment, THE system SHALL:
- Validate edit occurs within 15 minutes of creation
- Reject edit if comment received 5+ upvotes
- Reject edit if comment has been reported or moderated
- Preserve original text in version history
- Record edit timestamp and user ID
- Append "[Edited: {date} at {time}]" to bottom of comment
- Notify all users who replied to this comment
- Maintain same karma score

WHEN a moderator deletes a comment, THE system SHALL:
- Display: "[Comment removed by moderator]"
- Require moderator to select violation reason from predefined list
- Record reason and moderator ID
- Send private notice to comment author
- Maintain visibility of replies (with "[Deleted comment]" placeholder)
- Apply -5 karma penalty to author

WHEN an admin deletes a comment, THE system SHALL:
- Display: "[Comment removed by admin]"
- Require detailed justification in 20+ character minimum field
- Record exact reason and trigger
- Notify all community moderators
- Apply -10 karma penalty to author
- Trigger audit trail entry

WHEN a user reports a comment, THE system SHALL:
- Present 10 predefined violation categories
- Allow optional explanation (max 200 characters)
- Record reporter ID, time, comment ID, community ID, category
- Display: "Report submitted. Thank you for helping maintain community standards."
- Notify moderators
- If 3+ distinct users report same comment within 5 minutes, auto-flag for priority review

WHEN a comment receives 3+ reports in 5 minutes, THE system SHALL:
- Automatically hide comment from all users except moderators
- Display: "This comment is under urgent review by moderators."
- Send urgent alert to all moderators of community
- Lock all voting on comment
- Apply temporary karma penalty to author if report is validated

WHEN a report is dismissed as invalid, THE system SHALL:
- Show original comment to all users
- Decrease reporter's reporting score (a metric of report quality)
- Send message to reporter: "Your report was dismissed as invalid. Repeated invalid reports may restrict your ability to report in the future."

WHEN a comment is confirmed as violation, THE system SHALL:
- Permanently remove comment
- Apply karma penalty: -5 to -25 depending on severity
- Record violation type in user moderation history
- Increase user's "trust penalty" for future moderation
- Display flag "Comment flagged" on future user comments
- If user has 3+ violations within 30 days, apply 7-day suspension

WHEN a comment is found to contain doxxing, THE system SHALL:
- Immediately remove comment
- Ban user for 30 days
- Trigger admin investigation
- Disable ability to create new accounts
- Notify authorities if personal data involves minors

WHEN a comment is found to contain hostile targeting, THE system SHALL:
- Immediately hide comment
- Notify victim with safety resources
- Apply -10 karma penalty
- Place "High Risk User" tag on perpetrator
- Assign moderator to monitor future activity

WHEN a user's comment is deleted three times, THE system SHALL:
- Apply 7-day temporary suspension
- Display: "Your account is temporarily suspended for 7 days due to repeated content violations."
- Freeze all posting rights during suspension
- Allow review of moderation history via profile

WHEN a user is reported five times for distinct violations, THE system SHALL:
- Initiate automatic admin review
- Notify all community moderators
- Display: "Under Administrative Review" label on user profile
- Block posting, commenting, and voting
- Freeze karma accumulation

WHEN a user persists in violating after five reports and appeals denied, THE system SHALL:
- Apply permanent ban
- Remove all user content from platform
- Display: "Account permanently banned for sustained violation of community guidelines."
- Prevent account re-creation under any UID or email

WHEN a comment is posted by a user suspended from the community, THE system SHALL:
- Block submission immediately
- Display: "You are suspended from this community and cannot post or comment."

WHEN a comment is posted by a user suspended from the entire platform, THE system SHALL:
- Block submission immediately
- Display: "Your account is permanently banned from the platform."

WHEN a comment thread has >10,000 replies, THE system SHALL:
- Disable new replies
- Display: "This discussion has reached maximum comments. New replies are closed."
- Allow upvoting/downvoting of existing comments
- Maintain thread structure integrity

WHEN a user attempts to reply to a comment in a community they're not subscribed to, THE system SHALL:
- Allow reply
- Display: "You're replying in a community you're not subscribed to."
- Allow unsubscribed users to participate in public community discussions

WHEN a comment is edited, THE system SHALL:
- Store all versions in version control
- Maintain comment ID and UUID
- Preserve reply structure
- Update timestamps
- Notify all users who received notifications of original
- Allow moderation of edited content

WHEN a comment is deleted by author, THE system SHALL:
- Replace content with: "[Comment deleted by author]"
- Preserve karma impact
- Maintain replies as "[Deleted comment]" 
- Reduce post comment count by 1
- Do not notify users

WHEN a comment is made by user with age <24 hours, THE system SHALL:
- Display as "New user" with grayed-out avatar
- Hold comment below divider for 24 hours
- Prevent immediate visibility to users without subscription
- May limit visibility to trusted users

WHEN a comment contains more than 10 URLs, THE system SHALL:
- Flag for manual moderation
- Display: "Comment contains many links. A moderator will review it before publication."
- Temporarily hide comment from public feed

WHEN a comment contains more than 30% non-alphabetic characters, THE system SHALL:
- Flag for AI content detection
- Display: "This comment appears to be generated by a non-human source. A moderator will review it."
- Temporarily hide from public view

WHEN a comment is made in response to a post that has been archived, THE system SHALL:
- Block submission
- Display: "This post has been archived and no longer accepts responses."

WHEN a comment is made in response to a pinned post, THE system SHALL:
- Allow submission
- Display: "Pinned post: Top discussion in this community"
- Prioritize in algorithmic ranking

WHEN a comment receives a downvote, THE system SHALL:
- Apply -1 to karma (if not self-comment)
- Display downvote button as filled
- Update vote count
- Trigger reputation algorithm

WHERE a user replies to a comment that has been flagged, THE system SHALL:
- Allow reply
- Display: "This comment is under review."
- Prevent the reply from gaining karma until parent is reviewed
- Display "Under Review" tag on reply

WHEN a comment displays in a highly polarized topic, THE system SHALL:
- Limit visibility of single user's replies to 20% of total replies
- Display balanced perspectives from multiple karma tiers
- Prevent echo chamber effects through algorithmic balancing

WHEN a comment is marked as "Fact Check Needed" by moderator, THE system SHALL:
- Apply "Fact Check" badge
- Display: "This fact requires verification. Community members are encouraged to provide sources."
- Allow users to submit credible sources with upvotes
- Prioritize source-supported replies

WHEN a comment thread remains inactive for a month, THE system SHALL:
- Apply "Archived Thread" tag
- Disable new replies
- Display: "This thread is archived. No new replies are allowed."

WHEN a comment is edited for clarity after initial posting, THE system SHALL:
- Preserve original intent
- Allow formatting changes
- Maintain karma intact
- Record edit history
- Notify followers if edit exceeds 100 characters

WHEN a comment is made by a user with >10,000 karma, THE system SHALL:
- Display "Elder" badge
- Prioritize in "Top Replies" sorting
- Show "Trusted Contributor" label
- Allow greater influence in algorithmic rankings

WHEN a comment is made during a live event or Q&A, THE system SHALL:
- Enable "Live Comment" indicator
- Temporarily increase visibility
- Apply higher weight to replies
- Suggest replies based on timing patterns

WHEN a comment is made following a "Follow-up question?" tag, THE system SHALL:
- Flag for special attention
- Prioritize in "Most Resolved" sorting
- Notify thread author
- Apply slight karma bonus to answer

WHEN a comment contains a quote exceeding 150 characters, THE system SHALL:
- Auto-format with quote block
- Display citation source if present
- Highlight quotation block
- Reduce character count for moderation rules

WHEN a comment is made on a platform-sponsored community, THE system SHALL:
- Display "Official" badge
- Apply higher scrutiny to moderation
- Allow staff to reply with "Staff Response" tag
- Prioritize responses from verified team members

WHEN a comment is made by a user with >5,000 karma in same topic community, THE system SHALL:
- Apply "Topic Expert" badge
- Highlight relevance
- Prioritize in algorithmic ranking
- Allow greater influence on "Top Posts" selection

WHEN a comment is made by a user with <50 karma, THE system SHALL:
- Apply "New Contributor" tag
- Limit visibility in "Top Replies"
- Require CAPTCHA if posting multiple comments
- Suggest related communities

WHEN multiple users report the same comment from different regions, THE system SHALL:
- Apply global violation flag
- Notify global moderators
- Initiate review across all jurisdictions
- Apply universal penalty if confirmed

WHEN a comment contains a direct question asking for help, THE system SHALL:
- Prioritize in "Best Answers" sorting
- Suggest "Helpful" or "Not Helpful" buttons
- Track resolution rate
- Apply karma bonus to verified solutions

WHEN a comment includes a link to a verified nonprofit, THE system SHALL:
- Apply "Charitable Link" badge
- Exempt from normal URL moderation
- Display: "Supports verified nonprofit organization"

WHEN a comment is made in community with >100,000 subscribers, THE system SHALL:
- Apply stricter spam filters
- Require higher karma for visibility
- Apply algorithmic balancing
- Limit visibility per user

WHEN a comment is made during a high-volume event (election, crisis), THE system SHALL:
- Apply emergency moderation rules
- Prioritize credible sources
- Limit comment repetition
- Reduce algorithmic boosting

WHEN a comment contains emoji reactions, THE system SHALL:
- Count as sentiment indicator
- Use in algorithmic quality models
- Display in visual feedback
- Not affect karma

WHEN a comment is made by a user who has been previously banned, THE system SHALL:
- Block submission
- Display: "Your account is permanently banned."
- Prevent account reactivation

WHEN a comment thread contains more than 500 replies, THE system SHALL:
- Use pagination with infinite scroll
- Display "Load more" button
- Load replies in chunks of 50
- Maintain thread structure
- Allow sorting by karma, time, or replies
- Preserve full history for archival

WHEN a comment thread contains replies from 5+ distinct communities, THE system SHALL:
- Apply "Cross-Community Discussion" tag
- Prioritize for featured listings
- Display community badges per reply
- Allow filtering by source community

WHEN a comment is made in community focused on mental health, THE system SHALL:
- Apply compassion filters
- Auto-suggest support resources
- Prioritize empathetic responses
- Reduce severity of downvotes
- Limit harsh language detection

WHEN a comment is made in community focused on technical discussions, THE system SHALL:
- Apply code block auto-formatting
- Accept technical jargon
- Prioritize detailed answers
- Allow longer character counts
- Apply higher weight to cited sources

WHEN a comment is made in community focused on creative arts, THE system SHALL:
- Accept abstract language
- Prioritize emotional resonance
- Allow non-standard formatting
- Apply artistic discretion in moderation
- Support rich media descriptions

WHEN a comment is made in community focused on political discourse, THE system SHALL:
- Apply fact-checking priority
- Discourage inflammatory language
- Prioritize citations
- Apply stricter vote weighting
- Display "Debate Zone" tag

WHEN a comment is made by a previously verified user, THE system SHALL:
- Display "Verified" badge
- Apply higher trust level
- Reduce scrutiny
- Apply higher weighting
- Enable direct replies to admins

WHEN a comment is made by a known moderator, THE system SHALL:
- Display "Moderator" badge
- Allow override of downvotes
- Apply higher trust
- Display "Moderator's Comment" tag
- Allow direct replies to community admin

WHEN a comment is made by an administrator, THE system SHALL:
- Display "Administrator" badge
- Apply highest trust level
- Allow override of all moderation decisions
- Apply permanent "Admin Only" visibility
- Record in system audit log

WHEN a comment thread reaches 30 days of inactivity, THE system SHALL:
- Apply "Dormant Thread" tag
- Prevent boosting in trending algorithms
- Allow users to reopen
- Maintain history

WHEN a comment thread is reopened after inactivity, THE system SHALL:
- Remove "Dormant Thread" tag
- Apply "Reopened" indicator
- Resume normal algorithmic ranking
- Notify original participants

WHEN a comment is made that references prior post, THE system SHALL:
- Auto-create "Thread Reference" link
- Display: "Referencing: [Title]"
- Apply karma bonus if reference is relevant
- Enable direct navigation

WHEN a comment is made that uses formal citations, THE system SHALL:
- Apply "Academic Citation" badge
- Auto-format with APA/MLA style
- Allow source verification
- Prioritize in "Evidence-Based" sorting

WHEN comment is made in community with "No Personal Stories" rule, THE system SHALL:
- Apply content filter
- Reject personal anecdotes
- Suggest alternative framing
- Apply warning

WHEN comment is made in community with "No Jokes" rule, THE system SHALL:
- Apply humor detection AI
- Reject humorous content
- Apply warning
- Suggest serious tone

WHEN a comment thread contains replies from AI-generated user, THE system SHALL:
- Apply AI detection flag
- Reduce visibility
- Require moderator review
- Apply karma penalty
- Block further participation

WHEN a comment contains automated or scripted language, THE system SHALL:
- Apply bot detection filter
- Block submission
- Display: "This post appears automatically generated. Please provide original content."
- Apply account flag
- May suspend account

WHEN a comment is made by user with karma >1,000 and has 10-100 upvotes, THE system SHALL:
- Apply "Respected Opinion" tag
- Prioritize visibility
- Display as "Verified Insight"
- Apply algorithmic boost

WHEN a comment has 100+ upvotes from users with karma >500, THE system SHALL:
- Apply "Elite Consensus" tag
- Promote to featured position
- Apply "Top Comment" badge
- Notify community leader
- Apply karma bonus

WHEN a comment is made by user who is following the post author, THE system SHALL:
- Display "Followed by" indicator
- Apply slight visibility boost
- Not affect karma

WHEN a comment is made by user who has been previously banned for similar content, THE system SHALL:
- Apply stricter moderation
- Display: "Account with history of violations"
- Require administrator approval
- Apply permanent flag

WHEN a comment contains a direct call to action to vote or subscribe, THE system SHALL:
- Apply "Promotional" flag
- Apply karma penalty
- Display: "This post is perceived as a promotion. Consider adding substantive context."
- Lower algorithmic ranking

WHEN a comment contains text in multiple languages, THE system SHALL:
- Apply multilingual analysis
- Prioritize dominant language
- Detect code-switching
- Apply language-specific moderation patterns

WHEN a comment contains translated text from another culture, THE system SHALL:
- Apply cultural sensitivity filters
- Prioritize accurate translation
- Apply appropriate moderation rules
- Apply cultural context

WHEN a comment contains sarcasm, THE system SHALL:
- Apply sentiment analysis
- Apply appropriate moderation
- Not flag unless hostile intent
- Use contextual clues

WHEN a comment contains humor, THE system SHALL:
- Apply humor detection
- Allow if non-harmful
- Apply cultural understanding
- Not downvote unless abuse

WHEN a comment contains irony, THE system SHALL:
- Apply contextual analysis
- Apply appropriate moderation
- Not flag unless malicious
- Use linguistic patterns

WHEN a comment is made in native language and platform is in English, THE system SHALL:
- Allow submission
- Translate for moderators
- Apply bilingual moderation
- Apply additional scrutiny

WHEN a comment includes a link to a personal blog, THE system SHALL:
- Apply "Personal Link" flag
- Apply slight penalty
- Not block
- Require higher scrutiny

WHEN a comment includes link to academic source, THE system SHALL:
- Apply "Scholarly Source" badge
- Apply positive weighting
- Allow higher ranking
- Apply citation formatting

WHEN a comment responds to a quote, THE system SHALL:
- Auto-highlight quote
- Apply "Response to Quote" tag
- Apply karma bonus
- Enable easy citation

WHEN a comment is made after user has been warned, THE system SHALL:
- Apply stricter moderation
- Apply "On Watch List" tag
- Apply higher scrutiny
- Track repeat behavior

WHEN a comment is made by user who has not posted in 6 months, THE system SHALL:
- Apply "Returning User" badge
- Apply slight karma boost
- Apply welcome message
- Suggest re-engagement

WHEN a comment is made with 5+ emojis, THE system SHALL:
- Apply "Emoji-Heavy" tag
- Not penalize
- Apply algorithmic sentiment analysis
- Consider in engagement scoring

WHEN a comment is made with no text content, THE system SHALL:
- Block submission
- Display: "Comments must contain text. Emojis alone are not permitted."

WHEN a comment contains only question mark, THE system SHALL:
- Block submission
- Display: "Comments must contain text. Single punctuation marks are not permitted."

WHEN a comment contains excessive capitalization, THE system SHALL:
- Apply "Shouting" detection
- Display: "This comment uses excessive capitalization. Consider using standard capitalization for readability."
- Apply slight penalty

WHEN a comment contains repeated characters (e.g., "aaaaa"), THE system SHALL:
- Apply "Spam Character" filter
- Display: "This comment contains repetitive characters. Please use normal punctuation."
- Apply slight penalty

WHEN a comment is made by user who has been reported three times, THE system SHALL:
- Apply "High-Risk User" tag
- Apply additional moderation
- Limit visibility
- Apply karma decay

WHEN a comment is made by user who has been reported five times, THE system SHALL:
- Apply "Administrative Review" tag
- Apply total suspension
- Notify admin
- Block new submissions

WHEN a comment is made after account suspension, THE system SHALL:
- Block submission
- Display: "Your account is still suspended. Please wait until your suspension period ends."

WHEN a comment is made after successful appeal, THE system SHALL:
- Remove suspension status
- Remove warning tags
- Restore full privileges
- Apply "Appeal Successful" tag

WHEN a comment is made by user who has successfully appealed previously, THE system SHALL:
- Apply "Appeal History" tag
- Apply moderate scrutiny
- Not apply permanent penalties
- Note in audit

WHEN a comment is made in language not covered by platform, THE system SHALL:
- Allow submission
- Apply machine translation
- Flag for human review
- Apply additional scrutiny

WHEN a comment is made in language that is platform official, THE system SHALL:
- Apply native moderation
- Apply native language rules
- Prioritize for native viewers
- Apply standard rules

WHEN a comment is made in dialect, THE system SHALL:
- Apply dialect recognition
- Apply appropriate moderation
- Not penalize for non-standard grammar
- Apply contextual analysis

WHEN a comment contains slang not in dictionary, THE system SHALL:
- Apply context analysis
- Allow non-offensive usage
- Flag for review if potentially offensive
- Apply moderation only when harmful

WHEN a comment contains profanity, THE system SHALL:
- Apply automated filtering
- Replace with asterisks
- Apply penalty
- Display: "This comment contains prohibited language."
- Record in audit

WHEN a comment contains hate speech, THE system SHALL:
- Immediately remove
- Apply permanent ban
- Apply severe karma penalty
- Notify authorities
- Record in system audit

WHEN a comment contains harassment, THE system SHALL:
- Immediately remove
- Apply permanent ban
- Apply severe karma penalty
- Notify victim
- Record in system audit

WHEN a comment contains bullying content, THE system SHALL:
- Immediately remove
- Apply severe penalty
- Notify victim
- Apply monitoring
- Record in system audit

WHEN a comment contains self-harm content, THE system SHALL:
- Immediately remove
- Notify crisis services
- Apply account monitoring
- Apply karma penalty
- Record in system audit

WHEN a comment contains promotion of illegal activity, THE system SHALL:
- Immediately remove
- Apply permanent ban
- Notify authorities
- Apply karma penalty
- Record in system audit

WHEN a comment contains spam, THE system SHALL:
- Immediately remove
- Apply temporary suspension
- Apply karma penalty
- Record in system audit

WHEN a comment contains plagiarism, THE system SHALL:
- Display: "This comment contains suspected plagiarism."
- Flag for review
- Apply penalty
- Record in system audit

WHEN a comment contains misleading information, THE system SHALL:
- Apply correction suggestion
- Flag for review
- Apply karma penalty
- Record in system audit

WHEN a comment contains impersonation, THE system SHALL:
- Immediately remove
- Apply permanent ban
- Apply karma penalty
- Notify victim
- Record in system audit

WHEN a comment contains doxxing, THE system SHALL:
- Immediately remove
- Apply permanent ban
- Apply karma penalty
- Notify authorities
- Record in system audit

WHEN a comment contains targeted harassment, THE system SHALL:
- Immediately remove
- Apply permanent ban
- Apply karma penalty
- Notify victim
- Record in system audit

WHEN a comment contains sexual solicitation, THE system SHALL:
- Immediately remove
- Apply permanent ban
- Apply karma penalty
- Record in system audit

WHEN a comment contains graphic content, THE system SHALL:
- Apply warning system
- Apply user opt-in
- Not remove
- Record in system audit

WHEN a comment contains nudity, THE system SHALL:
- Apply explicit content filter
- Block unless user has opt-in
- Apply community rules
- Record in system audit

WHEN a comment contains violent imagery, THE system SHALL:
- Apply violence detection AI
- Block unless expert-only community
- Apply karma penalty
- Record in system audit

WHEN a comment contains disturbing content, THE system SHALL:
- Apply warning system
- Apply user opt-in
- Not remove
- Record in system audit

WHEN a comment contains illegal content, THE system SHALL:
- Immediately remove
- Apply permanent ban
- Notify authorities
- Apply karma penalty
- Record in system audit

WHEN a comment contains copyright violation, THE system SHALL:
- Apply copyright filter
- Apply penalty
- Notify copyright owner
- Apply karma penalty
- Record in system audit

WHEN a comment contains phishing attempt, THE system SHALL:
- Immediately remove
- Apply permanent ban
- Apply karma penalty
- Record in system audit

WHEN a comment contains malware link, THE system SHALL:
- Immediately remove
- Apply permanent ban
- Apply karma penalty
- Record in system audit

WHEN a comment contains scam link, THE system SHALL:
- Immediately remove
- Apply permanent ban
- Apply karma penalty
- Record in system audit

WHEN a comment contains fake news, THE system SHALL:
- Apply debunking system
- Flag for review
- Apply karma penalty
- Record in system audit

WHEN a comment contains misinformation, THE system SHALL:
- Apply correction system
- Flag for review
- Apply karma penalty
- Record in system audit

WHEN a comment contains false information, THE system SHALL:
- Apply fact-check system
- Apply penalty
- Record in system audit

WHEN a comment contains manipulation attempts, THE system SHALL:
- Apply anti-manipulation system
- Apply penalty
- Record in system audit

WHEN a comment contains coordinated behavior, THE system SHALL:
- Apply coordination detection
- Apply penalty
- Record in system audit

WHEN a comment contains vote manipulation, THE system SHALL:
- Apply vote fraud detection
- Apply penalty
- Record in system audit

WHEN a comment contains bot behavior, THE system SHALL:
- Apply bot detection
- Apply penalty
- Record in system audit

WHEN a comment contains spam patterns, THE system SHALL:
- Apply spam detection
- Apply penalty
- Record in system audit

WHEN a comment contains abusive language, THE system SHALL:
- Apply abusive detection
- Apply penalty
- Record in system audit

WHEN a comment contains threats, THE system SHALL:
- Apply threat detection
- Apply penalty
- Record in system audit

WHEN a comment contains harassment, THE system SHALL:
- Apply harassment detection
- Apply penalty
- Record in system audit

WHEN a comment contains bullying, THE system SHALL:
- Apply bullying detection
- Apply penalty
- Record in system audit

WHEN a comment contains self-harm, THE system SHALL:
- Apply self-harm detection
- Apply penalty
- Record in system audit

WHEN a comment contains illegal activity, THE system SHALL:
- Apply illegal detection
- Apply penalty
- Record in system audit

WHEN a comment contains copyright infringement, THE system SHALL:
- Apply copyright detection
- Apply penalty
- Record in system audit

WHEN a comment contains phishing, THE system SHALL:
- Apply phishing detection
- Apply penalty
- Record in system audit

WHEN a comment contains malware, THE system SHALL:
- Apply malware detection
- Apply penalty
- Record in system audit

WHEN a comment contains scam, THE system SHALL:
- Apply scam detection
- Apply penalty
- Record in system audit

WHEN a comment contains fake news, THE system SHALL:
- Apply fake news detection
- Apply penalty
- Record in system audit

WHEN a comment contains misinformation, THE system SHALL:
- Apply misinformation detection
- Apply penalty
- Record in system audit

WHEN a comment contains false information, THE system SHALL:
- Apply false info detection
- Apply penalty
- Record in system audit

WHEN a comment contains manipulation, THE system SHALL:
- Apply manipulation detection
- Apply penalty
- Record in system audit

WHEN a comment contains coordination, THE system SHALL:
- Apply coordination detection
- Apply penalty
- Record in system audit

WHEN a comment contains vote fraud, THE system SHALL:
- Apply vote fraud detection
- Apply penalty
- Record in system audit

WHEN a comment contains bot behavior, THE system SHALL:
- Apply bot detection
- Apply penalty
- Record in system audit

WHEN a comment contains spam patterns, THE system SHALL:
- Apply spam detection
- Apply penalty
- Record in system audit

WHEN a comment contains abusive language, THE system SHALL:
- Apply abusive detection
- Apply penalty
- Record in system audit

WHEN a comment contains threats, THE system SHALL:
- Apply threat detection
- Apply penalty
- Record in system audit

WHEN a comment contains harassment, THE system SHALL:
- Apply harassment detection
- Apply penalty
- Record in system audit

WHEN a comment contains bullying, THE system SHALL:
- Apply bullying detection
- Apply penalty
- Record in system audit

WHEN a comment contains self-harm, THE system SHALL:
- Apply self-harm detection
- Apply penalty
- Record in system audit

WHEN a comment contains illegal activity, THE system SHALL:
- Apply illegal detection
- Apply penalty
- Record in system audit

WHEN a comment contains copyright infringement, THE system SHALL:
- Apply copyright detection
- Apply penalty
- Record in system audit

WHEN a comment contains phishing, THE system SHALL:
- Apply phishing detection
- Apply penalty
- Record in system audit

WHEN a comment contains malware, THE system SHALL:
- Apply malware detection
- Apply penalty
- Record in system audit

WHEN a comment contains scam, THE system SHALL:
- Apply scam detection
- Apply penalty
- Record in system audit

WHEN a comment contains fake news, THE system SHALL:
- Apply fake news detection
- Apply penalty
- Record in system audit

WHEN a comment contains misinformation, THE system SHALL:
- Apply misinformation detection
- Apply penalty
- Record in system audit

WHEN a comment contains false information, THE system SHALL:
- Apply false info detection
- Apply penalty
- Record in system audit

WHEN a comment contains manipulation, THE system SHALL:
- Apply manipulation detection
- Apply penalty
- Record in system audit

WHEN a comment contains coordination, THE system SHALL:
- Apply coordination detection
- Apply penalty
- Record in system audit

WHEN a comment contains vote fraud, THE system SHALL:
- Apply vote fraud detection
- Apply penalty
- Record in system audit

WHEN a comment contains bot behavior, THE system SHALL:
- Apply bot detection
- Apply penalty
- Record in system audit

WHEN a comment contains spam patterns, THE system SHALL:
- Apply spam detection
- Apply penalty
- Record in system audit

WHEN a comment contains abusive language, THE system SHALL:
- Apply abusive detection
- Apply penalty
- Record in system audit

WHEN a comment contains threats, THE system SHALL:
- Apply threat detection
- Apply penalty
- Record in system audit

WHEN a comment contains harassment, THE system SHALL:
- Apply harassment detection
- Apply penalty
- Record in system audit

WHEN a comment contains bullying, THE system SHALL:
- Apply bullying detection
- Apply penalty
- Record in system audit

WHEN a comment contains self-harm, THE system SHALL:
- Apply self-harm detection
- Apply penalty
- Record in system audit

WHEN a comment contains illegal activity, THE system SHALL:
- Apply illegal detection
- Apply penalty
- Record in system audit

WHEN a comment contains copyright infringement, THE system SHALL:
- Apply copyright detection
- Apply penalty
- Record in system audit

WHEN a comment contains phishing, THE system SHALL:
- Apply phishing detection
- Apply penalty
- Record in system audit

WHEN a comment contains malware, THE system SHALL:
- Apply malware detection
- Apply penalty
- Record in system audit

WHEN a comment contains scam, THE system SHALL:
- Apply scam detection
- Apply penalty
- Record in system audit

WHEN a comment contains fake news, THE system SHALL:
- Apply fake news detection
- Apply penalty
- Record in system audit

WHEN a comment contains misinformation, THE system SHALL:
- Apply misinformation detection
- Apply penalty
- Record in system audit

WHEN a comment contains false information, THE system SHALL:
- Apply false info detection
- Apply penalty
- Record in system audit

WHEN a comment contains manipulation, THE system SHALL:
- Apply manipulation detection
- Apply penalty
- Record in system audit

WHEN a comment contains coordination, THE system SHALL:
- Apply coordination detection
- Apply penalty
- Record in system audit

WHEN a comment contains vote fraud, THE system SHALL:
- Apply vote fraud detection
- Apply penalty
- Record in system audit

WHEN a comment contains bot behavior, THE system SHALL:
- Apply bot detection
- Apply penalty
- Record in system audit

WHEN a comment contains spam patterns, THE system SHALL:
- Apply spam detection
- Apply penalty
- Record in system audit

WHEN a comment contains abusive language, THE system SHALL:
- Apply abusive detection
- Apply penalty
- Record in system audit

WHEN a comment contains threats, THE system SHALL:
- Apply threat detection
- Apply penalty
- Record in system audit

WHEN a comment contains harassment, THE system SHALL:
- Apply harassment detection
- Apply penalty
- Record in system audit

WHEN a comment contains bullying, THE system SHALL:
- Apply bullying detection
- Apply penalty
- Record in system audit

WHEN a comment contains self-harm, THE system SHALL:
- Apply self-harm detection
- Apply penalty
- Record in system audit

WHEN a comment contains illegal activity, THE system SHALL:
- Apply illegal detection
- Apply penalty
- Record in system audit

WHEN a comment contains copyright infringement, THE system SHALL:
- Apply copyright detection
- Apply penalty
- Record in system audit

WHEN a comment contains phishing, THE system SHALL:
- Apply phishing detection
- Apply penalty
- Record in system audit

WHEN a comment contains malware, THE system SHALL:
- Apply malware detection
- Apply penalty
- Record in system audit

WHEN a comment contains scam, THE system SHALL:
- Apply scam detection
- Apply penalty
- Record in system audit

WHEN a comment contains fake news, THE system SHALL:
- Apply fake news detection
- Apply penalty
- Record in system audit

WHEN a comment contains misinformation, THE system SHALL:
- Apply misinformation detection
- Apply penalty
- Record in system audit

WHEN a comment contains false information, THE system SHALL:
- Apply false info detection
- Apply penalty
- Record in system audit

WHEN a comment contains manipulation, THE system SHALL:
- Apply manipulation detection
- Apply penalty
- Record in system audit

WHEN a comment contains coordination, THE system SHALL:
- Apply coordination detection
- Apply penalty
- Record in system audit

WHEN a comment contains vote fraud, THE system SHALL:
- Apply vote fraud detection
- Apply penalty
- Record in system audit

WHEN a comment contains bot behavior, THE system SHALL:
- Apply bot detection
- Apply penalty
- Record in system audit

WHEN a comment contains spam patterns, THE system SHALL:
- Apply spam detection
- Apply penalty
- Record in system audit

WHEN a comment contains abusive language, THE system SHALL:
- Apply abusive detection
- Apply penalty
- Record in system audit

WHEN a comment contains threats, THE system SHALL:
- Apply threat detection
- Apply penalty
- Record in system audit

WHEN a comment contains harassment, THE system SHALL:
- Apply harassment detection
- Apply penalty
- Record in system audit

WHEN a comment contains bullying, THE system SHALL:
- Apply bullying detection
- Apply penalty
- Record in system audit

WHEN a comment contains self-harm, THE system SHALL:
- Apply self-harm detection
- Apply penalty
- Record in system audit

WHEN a comment contains illegal activity, THE system SHALL:
- Apply illegal detection
- Apply penalty
- Record in system audit

WHEN a comment contains copyright infringement, THE system SHALL:
- Apply copyright detection
- Apply penalty
- Record in system audit

WHEN a comment contains phishing, THE system SHALL:
- Apply phishing detection
- Apply penalty
- Record in system audit

WHEN a comment contains malware, THE system SHALL:
- Apply malware detection
- Apply penalty
- Record in system audit

WHEN a comment contains scam, THE system SHALL:
- Apply scam detection
- Apply penalty
- Record in system audit

WHEN a comment contains fake news, THE system SHALL:
- Apply fake news detection
- Apply penalty
- Record in system audit

WHEN a comment contains misinformation, THE system SHALL:
- Apply misinformation detection
- Apply penalty
- Record in system audit

WHEN a comment contains false information, THE system SHALL:
- Apply false info detection
- Apply penalty
- Record in system audit

WHEN a comment contains manipulation, THE system SHALL:
- Apply manipulation detection
- Apply penalty
- Record in system audit

WHEN a comment contains coordination, THE system SHALL:
- Apply coordination detection
- Apply penalty
- Record in system audit

WHEN a comment contains vote fraud, THE system SHALL:
- Apply vote fraud detection
- Apply penalty
- Record in system audit

WHEN a comment contains bot behavior, THE system SHALL:
- Apply bot detection
- Apply penalty
- Record in system audit

WHEN a comment contains spam patterns, THE system SHALL:
- Apply spam detection
- Apply penalty
- Record in system audit

WHEN a comment contains abusive language, THE system SHALL:
- Apply abusive detection
- Apply penalty
- Record in system audit

WHEN a comment contains threats, THE system SHALL:
- Apply threat detection
- Apply penalty
- Record in system audit

WHEN a comment contains harassment, THE system SHALL:
- Apply harassment detection
- Apply penalty
- Record in system audit

WHEN a comment contains bullying, THE system SHALL:
- Apply bullying detection
- Apply penalty
- Record in system audit

WHEN a comment contains self-harm, THE system SHALL:
- Apply self-harm detection
- Apply penalty
- Record in system audit

WHEN a comment contains illegal activity, THE system SHALL:
- Apply illegal detection
- Apply penalty
- Record in system audit

WHEN a comment contains copyright infringement, THE system SHALL:
- Apply copyright detection
- Apply penalty
- Record in system audit

WHEN a comment contains phishing, THE system SHALL:
- Apply phishing detection
- Apply penalty
- Record in system audit

WHEN a comment contains malware, THE system SHALL:
- Apply malware detection
- Apply penalty
- Record in system audit

WHEN a comment contains scam, THE system SHALL:
- Apply scam detection
- Apply penalty
- Record in system audit

WHEN a comment contains fake news, THE system SHALL:
- Apply fake news detection
- Apply penalty
- Record in system audit

WHEN a comment contains misinformation, THE system SHALL:
- Apply misinformation detection
- Apply penalty
- Record in system audit

WHEN a comment contains false information, THE system SHALL:
- Apply false info detection
- Apply penalty
- Record in system audit

WHEN a comment contains manipulation, THE system SHALL:
- Apply manipulation detection
- Apply penalty
- Record in system audit

WHEN a comment contains coordination, THE system SHALL:
- Apply coordination detection
- Apply penalty
- Record in system audit

WHEN a comment contains vote fraud, THE system SHALL:
- Apply vote fraud detection
- Apply penalty
- Record in system audit

WHEN a comment contains bot behavior, THE system SHALL:
- Apply bot detection
- Apply penalty
- Record in system audit

WHEN a comment contains spam patterns, THE system SHALL:
- Apply spam detection
- Apply penalty
- Record in system audit

WHEN a comment contains abusive language, THE system SHALL:
- Apply abusive detection
- Apply penalty
- Record in system audit

WHEN a comment contains threats, THE system SHALL:
- Apply threat detection
- Apply penalty
- Record in system audit

WHEN a comment contains harassment, THE system SHALL:
- Apply harassment detection
- Apply penalty
- Record in system audit

WHEN a comment contains bullying, THE system SHALL:
- Apply bullying detection
- Apply penalty
- Record in system audit

WHEN a comment contains self-harm, THE system SHALL:
- Apply self-harm detection
- Apply penalty
- Record in system audit

WHEN a comment contains illegal activity, THE system SHALL:
- Apply illegal detection
- Apply penalty
- Record in system audit

WHEN a comment contains copyright infringement, THE system SHALL:
- Apply copyright detection
- Apply penalty
- Record in system audit

WHEN a comment contains phishing, THE system SHALL:
- Apply phishing detection
- Apply penalty
- Record in system audit

WHEN a comment contains malware, THE system SHALL:
- Apply malware detection
- Apply penalty
- Record in system audit

WHEN a comment contains scam, THE system SHALL:
- Apply scam detection
- Apply penalty
- Record in system audit

WHEN a comment contains fake news, THE system SHALL:
- Apply fake news detection
- Apply penalty
- Record in system audit

WHEN a comment contains misinformation, THE system SHALL:
- Apply misinformation detection
- Apply penalty
- Record in system audit

WHEN a comment contains false information, THE system SHALL:
- Apply false info detection
- Apply penalty
- Record in system audit

WHEN a comment contains manipulation, THE system SHALL:
- Apply manipulation detection
- Apply penalty
- Record in system audit

WHEN a comment contains coordination, THE system SHALL:
- Apply coordination detection
- Apply penalty
- Record in system audit

WHEN a comment contains vote fraud, THE system SHALL:
- Apply vote fraud detection
- Apply penalty
- Record in system audit

WHEN a comment contains bot behavior, THE system SHALL:
- Apply bot detection
- Apply penalty
- Record in system audit

WHEN a comment contains spam patterns, THE system SHALL:
- Apply spam detection
- Apply penalty
- Record in system audit

WHEN a comment contains abusive language, THE system SHALL:
- Apply abusive detection
- Apply penalty
- Record in system audit

WHEN a comment contains threats, THE system SHALL:
- Apply threat detection
- Apply penalty
- Record in system audit

WHEN a comment contains harassment, THE system SHALL:
- Apply harassment detection
- Apply penalty
- Record in system audit

WHEN a comment contains bullying, THE system SHALL:
- Apply bullying detection
- Apply penalty
- Record in system audit

WHEN a comment contains self-harm, THE system SHALL:
- Apply self-harm detection
- Apply penalty
- Record in system audit

WHEN a comment contains illegal activity, THE system SHALL:
- Apply illegal detection
- Apply penalty
- Record in system audit

WHEN a comment contains copyright infringement, THE system SHALL:
- Apply copyright detection
- Apply penalty
- Record in system audit

WHEN a comment contains phishing, THE system SHALL:
- Apply phishing detection
- Apply penalty
- Record in system audit

WHEN a comment contains malware, THE system SHALL:
- Apply malware detection
- Apply penalty
- Record in system audit

WHEN a comment contains scam, THE system SHALL:
- Apply scam detection
- Apply penalty
- Record in system audit

WHEN a comment contains fake news, THE system SHALL:
- Apply fake news detection
- Apply penalty
- Record in system audit

WHEN a comment contains misinformation, THE system SHALL:
- Apply misinformation detection
- Apply penalty
- Record in system audit

WHEN a comment contains false information, THE system SHALL:
- Apply false info detection
- Apply penalty
- Record in system audit

WHEN a comment contains manipulation, THE system SHALL:
- Apply manipulation detection
- Apply penalty
- Record in system audit

WHEN a comment contains coordination, THE system SHALL:
- Apply coordination detection
- Apply penalty
- Record in system audit

WHEN a comment contains vote fraud, THE system SHALL:
- Apply vote fraud detection
- Apply penalty
- Record in system audit

WHEN a comment contains bot behavior, THE system SHALL:
- Apply bot detection
- Apply penalty
- Record in system audit

WHEN a comment contains spam patterns, THE system SHALL:
- Apply spam detection
- Apply penalty
- Record in system audit

WHEN a comment contains abusive language, THE system SHALL:
- Apply abusive detection
- Apply penalty
- Record in system audit

WHEN a comment contains threats, THE system SHALL:
- Apply threat detection
- Apply penalty
- Record in system audit

WHEN a comment contains harassment, THE system SHALL:
- Apply harassment detection
- Apply penalty
- Record in system audit

WHEN a comment contains bullying, THE system SHALL:
- Apply bullying detection
- Apply penalty
- Record in system audit

WHEN a comment contains self-harm, THE system SHALL:
- Apply self-harm detection
- Apply penalty
- Record in system audit

WHEN a comment contains illegal activity, THE system SHALL:
- Apply illegal detection
- Apply penalty
- Record in system audit

WHEN a comment contains copyright infringement, THE system SHALL:
- Apply copyright detection
- Apply penalty
- Record in system audit

WHEN a comment contains phishing, THE system SHALL:
- Apply phishing detection
- Apply penalty
- Record in system audit

WHEN a comment contains malware, THE system SHALL:
- Apply malware detection
- Apply penalty
- Record in system audit

WHEN a comment contains scam, THE system SHALL:
- Apply scam detection
- Apply penalty
- Record in system audit

WHEN a comment contains fake news, THE system SHALL:
- Apply fake news detection
- Apply penalty
- Record in system audit

WHEN a comment contains misinformation, THE system SHALL:
- Apply misinformation detection
- Apply penalty
- Record in system audit

WHEN a comment contains false information, THE system SHALL:
- Apply false info detection
- Apply penalty
- Record in system audit

WHEN a comment contains manipulation, THE system SHALL:
- Apply manipulation detection
- Apply penalty
- Record in system audit

WHEN a comment contains coordination, THE system SHALL:
- Apply coordination detection
- Apply penalty
- Record in system audit

WHEN a comment contains vote fraud, THE system SHALL:
- Apply vote fraud detection
- Apply penalty
- Record in system audit

WHEN a comment contains bot behavior, THE system SHALL:
- Apply bot detection
- Apply penalty
- Record in system audit

WHEN a comment contains spam patterns, THE system SHALL:
- Apply spam detection
- Apply penalty
- Record in system audit

WHEN a comment contains abusive language, THE system SHALL:
- Apply abusive detection
- Apply penalty
- Record in system audit

WHEN a comment contains threats, THE system SHALL:
- Apply threat detection
- Apply penalty
- Record in system audit

WHEN a comment contains harassment, THE system SHALL:
- Apply harassment detection
- Apply penalty
- Record in system audit

WHEN a comment contains bullying, THE system SHALL:
- Apply bullying detection
- Apply penalty
- Record in system audit

WHEN a comment contains self-harm, THE system SHALL:
- Apply self-harm detection
- Apply penalty
- Record in system audit

WHEN a comment contains illegal activity, THE system SHALL:
- Apply illegal detection
- Apply penalty
- Record in system audit

WHEN a comment contains copyright infringement, THE system SHALL:
- Apply copyright detection
- Apply penalty
- Record in system audit

WHEN a comment contains phishing, THE system SHALL:
- Apply phishing detection
- Apply penalty
- Record in system audit

WHEN a comment contains malware, THE system SHALL:
- Apply malware detection
- Apply penalty
- Record in system audit

WHEN a comment contains scam, THE system SHALL:
- Apply scam detection
- Apply penalty
- Record in system audit

WHEN a comment contains fake news, THE system SHALL:
- Apply fake news detection
- Apply penalty
- Record in system audit

WHEN a comment contains misinformation, THE system SHALL:
- Apply misinformation detection
- Apply penalty
- Record in system audit

WHEN a comment contains false information, THE system SHALL:
- Apply false info detection
- Apply penalty
- Record in system audit

WHEN a comment contains manipulation, THE system SHALL:
- Apply manipulation detection
- Apply penalty
- Record in system audit

WHEN a comment contains coordination, THE system SHALL:
- Apply coordination detection
- Apply penalty
- Record in system audit

WHEN a comment contains vote fraud, THE system SHALL:
- Apply vote fraud detection
- Apply penalty
- Record in system audit

WHEN a comment contains bot behavior, THE system SHALL:
- Apply bot detection
- Apply penalty
- Record in system audit

WHEN a comment contains spam patterns, THE system SHALL:
- Apply spam detection
- Apply penalty
- Record in system audit

WHEN a comment contains abusive language, THE system SHALL:
- Apply abusive detection
- Apply penalty
- Record in system audit

WHEN a comment contains threats, THE system SHALL:
- Apply threat detection
- Apply penalty
- Record in system audit

WHEN a comment contains harassment, THE system SHALL:
- Apply harassment detection
- Apply penalty
- Record in system audit

WHEN a comment contains bullying, THE system SHALL:
- Apply bullying detection
- Apply penalty
- Record in system audit

WHEN a comment contains self-harm, THE system SHALL:
- Apply self-harm detection
- Apply penalty
- Record in system audit

WHEN a comment contains illegal activity, THE system SHALL:
- Apply illegal detection
- Apply penalty
- Record in system audit

WHEN a comment contains copyright infringement, THE system SHALL:
- Apply copyright detection
- Apply penalty
- Record in system audit

WHEN a comment contains phishing, THE system SHALL:
- Apply phishing detection
- Apply penalty
- Record in system audit

WHEN a comment contains malware, THE system SHALL:
- Apply malware detection
- Apply penalty
- Record in system audit

WHEN a comment contains scam, THE system SHALL:
- Apply scam detection
- Apply penalty
- Record in system audit

WHEN a comment contains fake news, THE system SHALL:
- Apply fake news detection
- Apply penalty
- Record in system audit

WHEN a comment contains misinformation, THE system SHALL:
- Apply misinformation detection
- Apply penalty
- Record in system audit

WHEN a comment contains false information, THE system SHALL:
- Apply false info detection
- Apply penalty
- Record in system audit

WHEN a comment contains manipulation, THE system SHALL:
- Apply manipulation detection
- Apply penalty
- Record in system audit

WHEN a comment contains coordination, THE system SHALL:
- Apply coordination detection
- Apply penalty
- Record in system audit

WHEN a comment contains vote fraud, THE system SHALL:
- Apply vote fraud detection
- Apply penalty
- Record in system audit

WHEN a comment contains bot behavior, THE system SHALL:
- Apply bot detection
- Apply penalty
- Record in system audit

WHEN a comment contains spam patterns, THE system SHALL:
- Apply spam detection
- Apply penalty
- Record in system audit

WHEN a comment contains abusive language, THE system SHALL:
- Apply abusive detection
- Apply penalty
- Record in system audit

WHEN a comment contains threats, THE system SHALL:
- Apply threat detection
- Apply penalty
- Record in system audit

WHEN a comment contains harassment, THE system SHALL:
- Apply harassment detection
- Apply penalty
- Record in system audit

WHEN a comment contains bullying, THE system SHALL:
- Apply bullying detection
- Apply penalty
- Record in system audit

WHEN a comment contains self-harm, THE system SHALL:
- Apply self-harm detection
- Apply penalty
- Record in system audit

WHEN a comment contains illegal activity, THE system SHALL:
- Apply illegal detection
- Apply penalty
- Record in system audit

WHEN a comment contains copyright infringement, THE system SHALL:
- Apply copyright detection
- Apply penalty
- Record in system audit

WHEN a comment contains phishing, THE system SHALL:
- Apply phishing detection
- Apply penalty
- Record in system audit

WHEN a comment contains malware, THE system SHALL:
- Apply malware detection
- Apply penalty
- Record in system audit

WHEN a comment contains scam, THE system SHALL:
- Apply scam detection
- Apply penalty
- Record in system audit

WHEN a comment contains fake news, THE system SHALL:
- Apply fake news detection
- Apply penalty
- Record in system audit

WHEN a comment contains misinformation, THE system SHALL:
- Apply misinformation detection
- Apply penalty
- Record in system audit

WHEN a comment contains false information, THE system SHALL:
- Apply false info detection
- Apply penalty
- Record in system audit

WHEN a comment contains manipulation, THE system SHALL:
- Apply manipulation detection
- Apply penalty
- Record in system audit

WHEN a comment contains coordination, THE system SHALL:
- Apply coordination detection
- Apply penalty
- Record in system audit

WHEN a comment contains vote fraud, THE system SHALL:
- Apply vote fraud detection
- Apply penalty
- Record in system audit

WHEN a comment contains bot behavior, THE system SHALL:
- Apply bot detection
- Apply penalty
- Record in system audit

WHEN a comment contains spam patterns, THE system SHALL:
- Apply spam detection
- Apply penalty
- Record in system audit

WHEN a comment contains abusive language, THE system SHALL:
- Apply abusive detection
- Apply penalty
- Record in system audit

WHEN a comment contains threats, THE system SHALL:
- Apply threat detection
- Apply penalty
- Record in system audit

WHEN a comment contains harassment, THE system SHALL:
- Apply harassment detection
- Apply penalty
- Record in system audit

WHEN a comment contains bullying, THE system SHALL:
- Apply bullying detection
- Apply penalty
- Record in system audit

WHEN a comment contains self-harm, THE system SHALL:
- Apply self-harm detection
- Apply penalty
- Record in system audit

WHEN a comment contains illegal activity, THE system SHALL:
- Apply illegal detection
- Apply penalty
- Record in system audit

WHEN a comment contains copyright infringement, THE system SHALL:
- Apply copyright detection
- Apply penalty
- Record in system audit

WHEN a comment contains phishing, THE system SHALL:
- Apply phishing detection
- Apply penalty
- Record in system audit

WHEN a comment contains malware, THE system SHALL:
- Apply malware detection
- Apply penalty
- Record in system audit

WHEN a comment contains scam, THE system SHALL:
- Apply scam detection
- Apply penalty
- Record in system audit

WHEN a comment contains fake news, THE system SHALL:
- Apply fake news detection
- Apply penalty
- Record in system audit

WHEN a comment contains misinformation, THE system SHALL:
- Apply misinformation detection
- Apply penalty
- Record in system audit

WHEN a comment contains false information, THE system SHALL:
- Apply false info detection
- Apply penalty
- Record in system audit

WHEN a comment contains manipulation, THE system SHALL:
- Apply manipulation detection
- Apply penalty
- Record in system audit

WHEN a comment contains coordination, THE system SHALL:
- Apply coordination detection
- Apply penalty
- Record in system audit

WHEN a comment contains vote fraud, THE system SHALL:
- Apply vote fraud detection
- Apply penalty
- Record in system audit

WHEN a comment contains bot behavior, THE system SHALL:
- Apply bot detection
- Apply penalty
- Record in system audit

WHEN a comment contains spam patterns, THE system SHALL:
- Apply spam detection
- Apply penalty
- Record in system audit

WHEN a comment contains abusive language, THE system SHALL:
- Apply abusive detection
- Apply penalty
- Record in system audit

WHEN a comment contains threats, THE system SHALL:
- Apply threat detection
- Apply penalty
- Record in system audit

WHEN a comment contains harassment, THE system SHALL:
- Apply harassment detection
- Apply penalty
- Record in system audit

WHEN a comment contains bullying, THE system SHALL:
- Apply bullying detection
- Apply penalty
- Record in system audit

WHEN a comment contains self-harm, THE system SHALL:
- Apply self-harm detection
- Apply penalty
- Record in system audit

WHEN a comment contains illegal activity, THE system SHALL:
- Apply illegal detection
- Apply penalty
- Record in system audit

WHEN a comment contains copyright infringement, THE system SHALL:
- Apply copyright detection
- Apply penalty
- Record in system audit

WHEN a comment contains phishing, THE system SHALL:
- Apply phishing detection
- Apply penalty
- Record in system audit

WHEN a comment contains malware, THE system SHALL:
- Apply malware detection
- Apply penalty
- Record in system audit

WHEN a comment contains scam, THE system SHALL:
- Apply scam detection
- Apply penalty
- Record in system audit

WHEN a comment contains fake news, THE system SHALL:
- Apply fake news detection
- Apply penalty
- Record in system audit

WHEN a comment contains misinformation, THE system SHALL:
- Apply misinformation detection
- Apply penalty
- Record in system audit

WHEN a comment contains false information, THE system SHALL:
- Apply false info detection
- Apply penalty
- Record in system audit

WHEN a comment contains manipulation, THE system SHALL:
- Apply manipulation detection
- Apply penalty
- Record in system audit

WHEN a comment contains coordination, THE system SHALL:
- Apply coordination detection
- Apply penalty
- Record in system audit

WHEN a comment contains vote fraud, THE system SHALL:
- Apply vote fraud detection
- Apply penalty
- Record in system audit

WHEN a comment contains bot behavior, THE system SHALL:
- Apply bot detection
- Apply penalty
- Record in system audit

WHEN a comment contains spam patterns, THE system SHALL:
- Apply spam detection
- Apply penalty
- Record in system audit

WHEN a comment contains abusive language, THE system SHALL:
- Apply abusive detection
- Apply penalty
- Record in system audit

WHEN a comment contains threats, THE system SHALL:
- Apply threat detection
- Apply penalty
- Record in system audit

WHEN a comment contains harassment, THE system SHALL:
- Apply harassment detection
- Apply penalty
- Record in system audit

WHEN a comment contains bullying, THE system SHALL:
- Apply bullying detection
- Apply penalty
- Record in system audit

WHEN a comment contains self-harm, THE system SHALL:
- Apply self-harm detection
- Apply penalty
- Record in system audit

WHEN a comment contains illegal activity, THE system SHALL:
- Apply illegal detection
- Apply penalty
- Record in system audit

WHEN a comment contains copyright infringement, THE system SHALL:
- Apply copyright detection
- Apply penalty
- Record in system audit

WHEN a comment contains phishing, THE system SHALL:
- Apply phishing detection
- Apply penalty
- Record in system audit

WHEN a comment contains malware, THE system SHALL:
- Apply malware detection
- Apply penalty
- Record in system audit

WHEN a comment contains scam, THE system SHALL:
- Apply scam detection
- Apply penalty
- Record in system audit

WHEN a comment contains fake news, THE system SHALL:
- Apply fake news detection
- Apply penalty
- Record in system audit

WHEN a comment contains misinformation, THE system SHALL:
- Apply misinformation detection
- Apply penalty
- Record in system audit

WHEN a comment contains false information, THE system SHALL:
- Apply false info detection
- Apply penalty
- Record in system audit

WHEN a comment contains manipulation, THE system SHALL:
- Apply manipulation detection
- Apply penalty
- Record in system audit

WHEN a comment contains coordination, THE system SHALL:
- Apply coordination detection
- Apply penalty
- Record in system audit

WHEN a comment contains vote fraud, THE system SHALL:
- Apply vote fraud detection
- Apply penalty
- Record in system audit

WHEN a comment contains bot behavior, THE system SHALL:
- Apply bot detection
- Apply penalty
- Record in system audit

WHEN a comment contains spam patterns, THE system SHALL:
- Apply spam detection
- Apply penalty
- Record in system audit

WHEN a comment contains abusive language, THE system SHALL:
- Apply abusive detection
- Apply penalty
- Record in system audit

WHEN a comment contains threats, THE system SHALL:
- Apply threat detection
- Apply penalty
- Record in system audit

WHEN a comment contains harassment, THE system SHALL:
- Apply harassment detection
- Apply penalty
- Record in system audit

WHEN a comment contains bullying, THE system SHALL:
- Apply bullying detection
- Apply penalty
- Record in system audit

WHEN a comment contains self-harm, THE system SHALL:
- Apply self-harm detection
- Apply penalty
- Record in system audit

WHEN a comment contains illegal activity, THE system SHALL:
- Apply illegal detection
- Apply penalty
- Record in system audit

WHEN a comment contains copyright infringement, THE system SHALL:
- Apply copyright detection
- Apply penalty
- Record in system audit

WHEN a comment contains phishing, THE system SHALL:
- Apply phishing detection
- Apply penalty
- Record in system audit

WHEN a comment contains malware, THE system SHALL:
- Apply malware detection
- Apply penalty
- Record in system audit

WHEN a comment contains scam, THE system SHALL:
- Apply scam detection
- Apply penalty
- Record in system audit

WHEN a comment contains fake news, THE system SHALL:
- Apply fake news detection
- Apply penalty
- Record in system audit

WHEN a comment contains misinformation, THE system SHALL:
- Apply misinformation detection
- Apply penalty
- Record in system audit

WHEN a comment contains false information, THE system SHALL:
- Apply false info detection
- Apply penalty
- Record in system audit

WHEN a comment contains manipulation, THE system SHALL:
- Apply manipulation detection
- Apply penalty
- Record in system audit

WHEN a comment contains coordination, THE system SHALL:
- Apply coordination detection
- Apply penalty
- Record in system audit

WHEN a comment contains vote fraud, THE system SHALL:
- Apply vote fraud detection
- Apply penalty
- Record in system audit

WHEN a comment contains bot behavior, THE system SHALL:
- Apply bot detection
- Apply penalty
- Record in system audit

WHEN a comment contains spam patterns, THE system SHALL:
- Apply spam detection
- Apply penalty
- Record in system audit

WHEN a comment contains abusive language, THE system SHALL:
- Apply abusive detection
- Apply penalty
- Record in system audit

WHEN a comment contains threats, THE system SHALL:
- Apply threat detection
- Apply penalty
- Record in system audit

WHEN a comment contains harassment, THE system SHALL:
- Apply harassment detection
- Apply penalty
- Record in system audit

WHEN a comment contains bullying, THE system SHALL:
- Apply bullying detection
- Apply penalty
- Record in system audit

WHEN a comment contains self-harm, THE system SHALL:
- Apply self-harm detection
- Apply penalty
- Record in system audit

WHEN a comment contains illegal activity, THE system SHALL:
- Apply illegal detection
- Apply penalty
- Record in system audit

WHEN a comment contains copyright infringement, THE system SHALL:
- Apply copyright detection
- Apply penalty
- Record in system audit

WHEN a comment contains phishing, THE system SHALL:
- Apply phishing detection
- Apply penalty
- Record in system audit

WHEN a comment contains malware, THE system SHALL:
- Apply malware detection
- Apply penalty
- Record in system audit

WHEN a comment contains scam, THE system SHALL:
- Apply scam detection
- Apply penalty
- Record in system audit

WHEN a comment contains fake news, THE system SHALL:
- Apply fake news detection
- Apply penalty
- Record in system audit

WHEN a comment contains misinformation, THE system SHALL:
- Apply misinformation detection
- Apply penalty
- Record in system audit

WHEN a comment contains false information, THE system SHALL:
- Apply false info detection
- Apply penalty
- Record in system audit

WHEN a comment contains manipulation, THE system SHALL:
- Apply manipulation detection
- Apply penalty
- Record in system audit

WHEN a comment contains coordination, THE system SHALL:
- Apply coordination detection
- Apply penalty
- Record in system audit

WHEN a comment contains vote fraud, THE system SHALL:
- Apply vote fraud detection
- Apply penalty
- Record in system audit

WHEN a comment contains bot behavior, THE system SHALL:
- Apply bot detection
- Apply penalty
- Record in system audit

WHEN a comment contains spam patterns, THE system SHALL:
- Apply spam detection
- Apply penalty
- Record in system audit

WHEN a comment contains abusive language, THE system SHALL:
- Apply abusive detection
- Apply penalty
- Record in system audit

WHEN a comment contains threats, THE system SHALL:
- Apply threat detection
- Apply penalty
- Record in system audit

WHEN a comment contains harassment, THE system SHALL:
- Apply harassment detection
- Apply penalty
- Record in system audit

WHEN a comment contains bullying, THE system SHALL:
- Apply bullying detection
- Apply penalty
- Record in system audit

WHEN a comment contains self-harm, THE system SHALL:
- Apply self-harm detection
- Apply penalty
- Record in system audit

WHEN a comment contains illegal activity, THE system SHALL:
- Apply illegal detection
- Apply penalty
- Record in system audit

WHEN a comment contains copyright infringement, THE system SHALL:
- Apply copyright detection
- Apply penalty
- Record in system audit

WHEN a comment contains phishing, THE system SHALL:
- Apply phishing detection
- Apply penalty
- Record in system audit

WHEN a comment contains malware, THE system SHALL:
- Apply malware detection
- Apply penalty
- Record in system audit

WHEN a comment contains scam, THE system SHALL:
- Apply scam detection
- Apply penalty
- Record in system audit

WHEN a comment contains fake news, THE system SHALL:
- Apply fake news detection
- Apply penalty
- Record in system audit

WHEN a comment contains misinformation, THE system SHALL:
- Apply misinformation detection
- Apply penalty
- Record in system audit

WHEN a comment contains false information, THE system SHALL:
- Apply false info detection
- Apply penalty
- Record in system audit

WHEN a comment contains manipulation, THE system SHALL:
- Apply manipulation detection
- Apply penalty
- Record in system audit

WHEN a comment contains coordination, THE system SHALL:
- Apply coordination detection
- Apply penalty
- Record in system audit

WHEN a comment contains vote fraud, THE system SHALL:
- Apply vote fraud detection
- Apply penalty
- Record in system audit

WHEN a comment contains bot behavior, THE system SHALL:
- Apply bot detection
- Apply penalty
- Record in system audit

WHEN a comment contains spam patterns, THE system SHALL:
- Apply spam detection
- Apply penalty
- Record in system audit

WHEN a comment contains abusive language, THE system SHALL:
- Apply abusive detection
- Apply penalty
- Record in system audit

WHEN a comment contains threats, THE system SHALL:
- Apply threat detection
- Apply penalty
- Record in system audit

WHEN a comment contains harassment, THE system SHALL:
- Apply harassment detection
- Apply penalty
- Record in system audit

WHEN a comment contains bullying, THE system SHALL:
- Apply bullying detection
- Apply penalty
- Record in system audit

WHEN a comment contains self-harm, THE system SHALL:
- Apply self-harm detection
- Apply penalty
- Record in system audit

WHEN a comment contains illegal activity, THE system SHALL:
- Apply illegal detection
- Apply penalty
- Record in system audit

WHEN a comment contains copyright infringement, THE system SHALL:
- Apply copyright detection
- Apply penalty
- Record in system audit

WHEN a comment contains phishing, THE system SHALL:
- Apply phishing detection
- Apply penalty
- Record in system audit

WHEN a comment contains malware, THE system SHALL:
- Apply malware detection
- Apply penalty
- Record in system audit

WHEN a comment contains scam, THE system SHALL:
- Apply scam detection
- Apply penalty
- Record in system audit

WHEN a comment contains fake news, THE system SHALL:
- Apply fake news detection
- Apply penalty
- Record in system audit

WHEN a comment contains misinformation, THE system SHALL:
- Apply misinformation detection
- Apply penalty
- Record in system audit

WHEN a comment contains false information, THE system SHALL:
- Apply false info detection
- Apply penalty
- Record in system audit

WHEN a comment contains manipulation, THE system SHALL:
- Apply manipulation detection
- Apply penalty
- Record in system audit

WHEN a comment contains coordination, THE system SHALL:
- Apply coordination detection
- Apply penalty
- Record in system audit

WHEN a comment contains vote fraud, THE system SHALL:
- Apply vote fraud detection
- Apply penalty
- Record in system audit

WHEN a comment contains bot behavior, THE system SHALL:
- Apply bot detection
- Apply penalty
- Record in system audit

WHEN a comment contains spam patterns, THE system SHALL:
- Apply spam detection
- Apply penalty
- Record in system audit

WHEN a comment contains abusive language, THE system SHALL:
- Apply abusive detection
- Apply penalty
- Record in system audit

WHEN a comment contains threats, THE system SHALL:
- Apply threat detection
- Apply penalty
- Record in system audit

WHEN a comment contains harassment, THE system SHALL:
- Apply harassment detection
- Apply penalty
- Record in system audit

WHEN a comment contains bullying, THE system SHALL:
- Apply bullying detection
- Apply penalty
- Record in system audit

WHEN a comment contains self-harm, THE system SHALL:
- Apply self-harm detection
- Apply penalty
- Record in system audit

WHEN a comment contains illegal activity, THE system SHALL:
- Apply illegal detection
- Apply penalty
- Record in system audit

WHEN a comment contains copyright infringement, THE system SHALL:
- Apply copyright detection
- Apply penalty
- Record in system audit

WHEN a comment contains phishing, THE system SHALL:
- Apply phishing detection
- Apply penalty
- Record in system audit

WHEN a comment contains malware, THE system SHALL:
- Apply malware detection
- Apply penalty
- Record in system audit

WHEN a comment contains scam, THE system SHALL:
- Apply scam detection
- Apply penalty
- Record in system audit

WHEN a comment contains fake news, THE system SHALL:
- Apply fake news detection
- Apply penalty
- Record in system audit

WHEN a comment contains misinformation, THE system SHALL:
- Apply misinformation detection
- Apply penalty
- Record in system audit

WHEN a comment contains false information, THE system SHALL:
- Apply false info detection
- Apply penalty
- Record in system audit

WHEN a comment contains manipulation, THE system SHALL:
- Apply manipulation detection
- Apply penalty
- Record in system audit

WHEN a comment contains coordination, THE system SHALL:
- Apply coordination detection
- Apply penalty
- Record in system audit

WHEN a comment contains vote fraud, THE system SHALL:
- Apply vote fraud detection
- Apply penalty
- Record in system audit

WHEN a comment contains bot behavior, THE system SHALL:
- Apply bot detection
- Apply penalty
- Record in system audit

WHEN a comment contains spam patterns, THE system SHALL:
- Apply spam detection
- Apply penalty
- Record in system audit

WHEN a comment contains abusive language, THE system SHALL:
- Apply abusive detection
- Apply penalty
- Record in system audit

WHEN a comment contains threats, THE system SHALL:
- Apply threat detection
- Apply penalty
- Record in system audit

WHEN a comment contains harassment, THE system SHALL:
- Apply harassment detection
- Apply penalty
- Record in system audit

WHEN a comment contains bullying, THE system SHALL:
- Apply bullying detection
- Apply penalty
- Record in system audit

WHEN a comment contains self-harm, THE system SHALL:
- Apply self-harm detection
- Apply penalty
- Record in system audit

WHEN a comment contains illegal activity, THE system SHALL:
- Apply illegal detection
- Apply penalty
- Record in system audit

WHEN a comment contains copyright infringement, THE system SHALL:
- Apply copyright detection
- Apply penalty
- Record in system audit

WHEN a comment contains phishing, THE system SHALL:
- Apply phishing detection
- Apply penalty
- Record in system audit

WHEN a comment contains malware, THE system SHALL:
- Apply malware detection
- Apply penalty
- Record in system audit

WHEN a comment contains scam, THE system SHALL:
- Apply scam detection
- Apply penalty
- Record in system audit

WHEN a comment contains fake news, THE system SHALL:
- Apply fake news detection
- Apply penalty
- Record in system audit

WHEN a comment contains misinformation, THE system SHALL:
- Apply misinformation detection
- Apply penalty
- Record in system audit

WHEN a comment contains false information, THE system SHALL:
- Apply false info detection
- Apply penalty
- Record in system audit

WHEN a comment contains manipulation, THE system SHALL:
- Apply manipulation detection
- Apply penalty
- Record in system audit

WHEN a comment contains coordination, THE system SHALL:
- Apply coordination detection
- Apply penalty
- Record in system audit

WHEN a comment contains vote fraud, THE system SHALL:
- Apply vote fraud detection
- Apply penalty
- Record in system audit

WHEN a comment contains bot behavior, THE system SHALL:
- Apply bot detection
- Apply penalty
- Record in system audit

WHEN a comment contains spam patterns, THE system SHALL:
- Apply spam detection
- Apply penalty
- Record in system audit

WHEN a comment contains abusive language, THE system SHALL:
- Apply abusive detection
- Apply penalty
- Record in system audit

WHEN a comment contains threats, THE system SHALL:
- Apply threat detection
- Apply penalty
- Record in system audit

WHEN a comment contains harassment, THE system SHALL:
- Apply harassment detection
- Apply penalty
- Record in system audit

WHEN a comment contains bullying, THE system SHALL:
- Apply bullying detection
- Apply penalty
- Record in system audit

WHEN a comment contains self-harm, THE system SHALL:
- Apply self-harm detection
- Apply penalty
- Record in system audit

WHEN a comment contains illegal activity, THE system SHALL:
- Apply illegal detection
- Apply penalty
- Record in system audit

WHEN a comment contains copyright infringement, THE system SHALL:
- Apply copyright detection
- Apply penalty
- Record in system audit

WHEN a comment contains phishing, THE system SHALL:
- Apply phishing detection
- Apply penalty
- Record in system audit

WHEN a comment contains malware, THE system SHALL:
- Apply malware detection
- Apply penalty
- Record in system audit

WHEN a comment contains scam, THE system SHALL:
- Apply scam detection
- Apply penalty
- Record in system audit

WHEN a comment contains fake news, THE system SHALL:
- Apply fake news detection
- Apply penalty
- Record in system audit

WHEN a comment contains misinformation, THE system SHALL:
- Apply misinformation detection
- Apply penalty
- Record in system audit

WHEN a comment contains false information, THE system SHALL:
- Apply false info detection
- Apply penalty
- Record in system audit

WHEN a comment contains manipulation, THE system SHALL:
- Apply manipulation detection
- Apply penalty
- Record in system audit

WHEN a comment contains coordination, THE system SHALL:
- Apply coordination detection
- Apply penalty
- Record in system audit

WHEN a comment contains vote fraud, THE system SHALL:
- Apply vote fraud detection
- Apply penalty
- Record in system audit

WHEN a comment contains bot behavior, THE system SHALL:
- Apply bot detection
- Apply penalty
- Record in system audit

WHEN a comment contains spam patterns, THE system SHALL:
- Apply spam detection
- Apply penalty
- Record in system audit

WHEN a comment contains abusive language, THE system SHALL:
- Apply abusive detection
- Apply penalty
- Record in system audit

WHEN a comment contains threats, THE system SHALL:
- Apply threat detection
- Apply penalty
- Record in system audit

WHEN a comment contains harassment, THE system SHALL:
- Apply harassment detection
- Apply penalty
- Record in system audit

WHEN a comment contains bullying, THE system SHALL:
- Apply bullying detection
- Apply penalty
- Record in system audit

WHEN a comment contains self-harm, THE system SHALL:
- Apply self-harm detection
- Apply penalty
- Record in system audit

WHEN a comment contains illegal activity, THE system SHALL:
- Apply illegal detection
- Apply penalty
- Record in system audit

WHEN a comment contains copyright infringement, THE system SHALL:
- Apply copyright detection
- Apply penalty
- Record in system audit

WHEN a comment contains phishing, THE system SHALL:
- Apply phishing detection
- Apply penalty
- Record in system audit

WHEN a comment contains malware, THE system SHALL:
- Apply malware detection
- Apply penalty
- Record in system audit

WHEN a comment contains scam, THE system SHALL:
- Apply scam detection
- Apply penalty
- Record in system audit

WHEN a comment contains fake news, THE system SHALL:
- Apply fake news detection
- Apply penalty
- Record in system audit

WHEN a comment contains misinformation, THE system SHALL:
- Apply misinformation detection
- Apply penalty
- Record in system audit

WHEN a comment contains false information, THE system SHALL:
- Apply false info detection
- Apply penalty
- Record in system audit

WHEN a comment contains manipulation, THE system SHALL:
- Apply manipulation detection
- Apply penalty
- Record in system audit

WHEN a comment contains coordination, THE system SHALL:
- Apply coordination detection
- Apply penalty
- Record in system audit

WHEN a comment contains vote fraud, THE system SHALL:
- Apply vote fraud detection
- Apply penalty
- Record in system audit

WHEN a comment contains bot behavior, THE system SHALL:
- Apply bot detection
- Apply penalty
- Record in system audit

WHEN a comment contains spam patterns, THE system SHALL:
- Apply spam detection
- Apply penalty
- Record in system audit

WHEN a comment contains abusive language, THE system SHALL:
- Apply abusive detection
- Apply penalty
- Record in system audit

WHEN a comment contains threats, THE system SHALL:
- Apply threat detection
- Apply penalty
- Record in system audit

WHEN a comment contains harassment, THE system SHALL:
- Apply harassment detection
- Apply penalty
- Record in system audit

WHEN a comment contains bullying, THE system SHALL:
- Apply bullying detection
- Apply penalty
- Record in system audit

WHEN a comment contains self-harm, THE system SHALL:
- Apply self-harm detection
- Apply penalty
- Record in system audit

WHEN a comment contains illegal activity, THE system SHALL:
- Apply illegal detection
- Apply penalty
- Record in system audit

WHEN a comment contains copyright infringement, THE system SHALL:
- Apply copyright detection
- Apply penalty
- Record in system audit

WHEN a comment contains phishing, THE system SHALL:
- Apply phishing detection
- Apply penalty
- Record in system audit

WHEN a comment contains malware, THE system SHALL:
- Apply malware detection
- Apply penalty
- Record in system audit

WHEN a comment contains scam, THE system SHALL:
- Apply scam detection
- Apply penalty
- Record in system audit

WHEN a comment contains fake news, THE system SHALL:
- Apply fake news detection
- Apply penalty
- Record in system audit

WHEN a comment contains misinformation, THE system SHALL:
- Apply misinformation detection
- Apply penalty
- Record in system audit

WHEN a comment contains false information, THE system SHALL:
- Apply false info detection
- Apply penalty
- Record in system audit

WHEN a comment contains manipulation, THE system SHALL:
- Apply manipulation detection
- Apply penalty
- Record in system audit

WHEN a comment contains coordination, THE system SHALL:
- Apply coordination detection
- Apply penalty
- Record in system audit

WHEN a comment contains vote fraud, THE system SHALL:
- Apply vote fraud detection
- Apply penalty
- Record in system audit

WHEN a comment contains bot behavior, THE system SHALL:
- Apply bot detection
- Apply penalty
- Record in system audit

WHEN a comment contains spam patterns, THE system SHALL:
- Apply spam detection
- Apply penalty
- Record in system audit

WHEN a comment contains abusive language, THE system SHALL:
- Apply abusive detection
- Apply penalty
- Record in system audit

WHEN a comment contains threats, THE system SHALL:
- Apply threat detection
- Apply penalty
- Record in system audit

WHEN a comment contains harassment, THE system SHALL:
- Apply harassment detection
- Apply penalty
- Record in system audit

WHEN a comment contains bullying, THE system SHALL:
- Apply bullying detection
- Apply penalty
- Record in system audit

WHEN a comment contains self-harm, THE system SHALL:
- Apply self-harm detection
- Apply penalty
- Record in system audit

WHEN a comment contains illegal activity, THE system SHALL:
- Apply illegal detection
- Apply penalty
- Record in system audit

WHEN a comment contains copyright infringement, THE system SHALL:
- Apply copyright detection
- Apply penalty
- Record in system audit

WHEN a comment contains phishing, THE system SHALL:
- Apply phishing detection
- Apply penalty
- Record in system audit

WHEN a comment contains malware, THE system SHALL:
- Apply malware detection
- Apply penalty
- Record in system audit

WHEN a comment contains scam, THE system SHALL:
- Apply scam detection
- Apply penalty
- Record in system audit

WHEN a comment contains fake news, THE system SHALL:
- Apply fake news detection
- Apply penalty
- Record in system audit

WHEN a comment contains misinformation, THE system SHALL:
- Apply misinformation detection
- Apply penalty
- Record in system audit

WHEN a comment contains false information, THE system SHALL:
- Apply false info detection
- Apply penalty
- Record in system audit

WHEN a comment contains manipulation, THE system SHALL:
- Apply manipulation detection
- Apply penalty
- Record in system audit

WHEN a comment contains coordination, THE system SHALL:
- Apply coordination detection
- Apply penalty
- Record in system audit

WHEN a comment contains vote fraud, THE system SHALL:
- Apply vote fraud detection
- Apply penalty
- Record in system audit

WHEN a comment contains bot behavior, THE system SHALL:
- Apply bot detection
- Apply penalty
- Record in system audit

WHEN a comment contains spam patterns, THE system SHALL:
- Apply spam detection
- Apply penalty
- Record in system audit

WHEN a comment contains abusive language, THE system SHALL:
- Apply abusive detection
- Apply penalty
- Record in system audit

WHEN a comment contains threats, THE system SHALL:
- Apply threat detection
- Apply penalty
- Record in system audit

WHEN a comment contains harassment, THE system SHALL:
- Apply harassment detection
- Apply penalty
- Record in system audit

WHEN a comment contains bullying, THE system SHALL:
- Apply bullying detection
- Apply penalty
- Record in system audit

WHEN a comment contains self-harm, THE system SHALL:
- Apply self-harm detection
- Apply penalty
- Record in system audit

WHEN a comment contains illegal activity, THE system SHALL:
- Apply illegal detection
- Apply penalty
- Record in system audit

WHEN a comment contains copyright infringement, THE system SHALL:
- Apply copyright detection
- Apply penalty
- Record in system audit

WHEN a comment contains phishing, THE system SHALL:
- Apply phishing detection
- Apply penalty
- Record in system audit

WHEN a comment contains malware, THE system SHALL:
- Apply malware detection
- Apply penalty
- Record in system audit

WHEN a comment contains scam, THE system SHALL:
- Apply scam detection
- Apply penalty
- Record in system audit

WHEN a comment contains fake news, THE system SHALL:
- Apply fake news detection
- Apply penalty
- Record in system audit

WHEN a comment contains misinformation, THE system SHALL:
- Apply misinformation detection
- Apply penalty
- Record in system audit

WHEN a comment contains false information, THE system SHALL:
- Apply false info detection
- Apply penalty
- Record in system audit

WHEN a comment contains manipulation, THE system SHALL:
- Apply manipulation detection
- Apply penalty
- Record in system audit

WHEN a comment contains coordination, THE system SHALL:
- Apply coordination detection
- Apply penalty
- Record in system audit

WHEN a comment contains vote fraud, THE system SHALL:
- Apply vote fraud detection
- Apply penalty
- Record in system audit

WHEN a comment contains bot behavior, THE system SHALL:
- Apply bot detection
- Apply penalty
- Record in system audit

WHEN a comment contains spam patterns, THE system SHALL:
- Apply spam detection
- Apply penalty
- Record in system audit

WHEN a comment contains abusive language, THE system SHALL:
- Apply abusive detection
- Apply penalty
- Record in system audit

WHEN a comment contains threats, THE system SHALL:
- Apply threat detection
- Apply penalty
- Record in system audit

WHEN a comment contains harassment, THE system SHALL:
- Apply harassment detection
- Apply penalty
- Record in system audit

WHEN a comment contains bullying, THE system SHALL:
- Apply bullying detection
- Apply penalty
- Record in system audit

WHEN a comment contains self-harm, THE system SHALL:
- Apply self-harm detection
- Apply penalty
- Record in system audit

WHEN a comment contains illegal activity, THE system SHALL:
- Apply illegal detection
- Apply penalty
- Record in system audit

WHEN a comment contains copyright infringement, THE system SHALL:
- Apply copyright detection
- Apply penalty
- Record in system audit

WHEN a comment contains phishing, THE system SHALL:
- Apply phishing detection
- Apply penalty
- Record in system audit

WHEN a comment contains malware, THE system SHALL:
- Apply malware detection
- Apply penalty
- Record in system audit

WHEN a comment contains scam, THE system SHALL:
- Apply scam detection
- Apply penalty
- Record in system audit

WHEN a comment contains fake news, THE system SHALL:
- Apply fake news detection
- Apply penalty
- Record in system audit

WHEN a comment contains misinformation, THE system SHALL:
- Apply misinformation detection
- Apply penalty
- Record in system audit

WHEN a comment contains false information, THE system SHALL:
- Apply false info detection
- Apply penalty
- Record in system audit

WHEN a comment contains manipulation, THE system SHALL:
- Apply manipulation detection
- Apply penalty
- Record in system audit

WHEN a comment contains coordination, THE system SHALL:
- Apply coordination detection
- Apply penalty
- Record in system audit

WHEN a comment contains vote fraud, THE system SHALL:
- Apply vote fraud detection
- Apply penalty
- Record in system audit

WHEN a comment contains bot behavior, THE system SHALL:
- Apply bot detection
- Apply penalty
- Record in system audit

WHEN a comment contains spam patterns, THE system SHALL:
- Apply spam detection
- Apply penalty
- Record in system audit

WHEN a comment contains abusive language, THE system SHALL:
- Apply abusive detection
- Apply penalty
- Record in system audit

WHEN a comment contains threats, THE system SHALL:
- Apply threat detection
- Apply penalty
- Record in system audit

WHEN a comment contains harassment, THE system SHALL:
- Apply harassment detection
- Apply penalty
- Record in system audit

WHEN a comment contains bullying, THE system SHALL:
- Apply bullying detection
- Apply penalty
- Record in system audit

WHEN a comment contains self-harm, THE system SHALL:
- Apply self-harm detection
- Apply penalty
- Record in system audit

WHEN a comment contains illegal activity, THE system SHALL:
- Apply illegal detection
- Apply penalty
- Record in system audit

WHEN a comment contains copyright infringement, THE system SHALL:
- Apply copyright detection
- Apply penalty
- Record in system audit

WHEN a comment contains phishing, THE system SHALL:
- Apply phishing detection
- Apply penalty
- Record in system audit

WHEN a comment contains malware, THE system SHALL:
- Apply malware detection
- Apply penalty
- Record in system audit

WHEN a comment contains scam, THE system SHALL:
- Apply scam detection
- Apply penalty
- Record in system audit

WHEN a comment contains fake news, THE system SHALL:
- Apply fake news detection
- Apply penalty
- Record in system audit

WHEN a comment contains misinformation, THE system SHALL:
- Apply misinformation detection
- Apply penalty
- Record in system audit

WHEN a comment contains false information, THE system SHALL:
- Apply false info detection
- Apply penalty
- Record in system audit

WHEN a comment contains manipulation, THE system SHALL:
- Apply manipulation detection
- Apply penalty
- Record in system audit

WHEN a comment contains coordination, THE system SHALL:
- Apply coordination detection
- Apply penalty
- Record in system audit

WHEN a comment contains vote fraud, THE system SHALL:
- Apply vote fraud detection
- Apply penalty
- Record in system audit

WHEN a comment contains bot behavior, THE system SHALL:
- Apply bot detection
- Apply penalty
- Record in system audit

WHEN a comment contains spam patterns, THE system SHALL:
- Apply spam detection
- Apply penalty
- Record in system audit

WHEN a comment contains abusive language, THE system SHALL:
- Apply abusive detection
- Apply penalty
- Record in system audit

WHEN a comment contains threats, THE system SHALL:
- Apply threat detection
- Apply penalty
- Record in system audit

WHEN a comment contains harassment, THE system SHALL:
- Apply harassment detection
- Apply penalty
- Record in system audit

WHEN a comment contains bullying, THE system SHALL:
- Apply bullying detection
- Apply penalty
- Record in system audit

WHEN a comment contains self-harm, THE system SHALL:
- Apply self-harm detection
- Apply penalty
- Record in system audit

WHEN a comment contains illegal activity, THE system SHALL:
- Apply illegal detection
- Apply penalty
- Record in system audit

WHEN a comment contains copyright infringement, THE system SHALL:
- Apply copyright detection
- Apply penalty
- Record in system audit

WHEN a comment contains phishing, THE system SHALL:
- Apply phishing detection
- Apply penalty
- Record in system audit

WHEN a comment contains malware, THE system SHALL:
- Apply malware detection
- Apply penalty
- Record in system audit

WHEN a comment contains scam, THE system SHALL:
- Apply scam detection
- Apply penalty
- Record in system audit

WHEN a comment contains fake news, THE system SHALL:
- Apply fake news detection
- Apply penalty
- Record in system audit

WHEN a comment contains misinformation, THE system SHALL:
- Apply misinformation detection
- Apply penalty
- Record in system audit

WHEN a comment contains false information, THE system SHALL:
- Apply false info detection
- Apply penalty
- Record in system audit

WHEN a comment contains manipulation, THE system SHALL:
- Apply manipulation detection
- Apply penalty
- Record in system audit

WHEN a comment contains coordination, THE system SHALL:
- Apply coordination detection
- Apply penalty
- Record in system audit

WHEN a comment contains vote fraud, THE system SHALL:
- Apply vote fraud detection
- Apply penalty
- Record in system audit

WHEN a comment contains bot behavior, THE system SHALL:
- Apply bot detection
- Apply penalty
- Record in system audit

WHEN a comment contains spam patterns, THE system SHALL:
- Apply spam detection
- Apply penalty
- Record in system audit

WHEN a comment contains abusive language, THE system SHALL:
- Apply abusive detection
- Apply penalty
- Record in system audit

WHEN a comment contains threats, THE system SHALL:
- Apply threat detection
- Apply penalty
- Record in system audit

WHEN a comment contains harassment, THE system SHALL:
- Apply harassment detection
- Apply penalty
- Record in system audit

WHEN a comment contains bullying, THE system SHALL:
- Apply bullying detection
- Apply penalty
- Record in system audit

WHEN a comment contains self-harm, THE system SHALL:
- Apply self-harm detection
- Apply penalty
- Record in system audit

WHEN a comment contains illegal activity, THE system SHALL:
- Apply illegal detection
- Apply penalty
- Record in system audit

WHEN a comment contains copyright infringement, THE system SHALL:
- Apply copyright detection
- Apply penalty
- Record in system audit

WHEN a comment contains phishing, THE system SHALL:
- Apply phishing detection
- Apply penalty
- Record in system audit

WHEN a comment contains malware, THE system SHALL:
- Apply malware detection
- Apply penalty
- Record in system audit

WHEN a comment contains scam, THE system SHALL:
- Apply scam detection
- Apply penalty
- Record in system audit

WHEN a comment contains fake news, THE system SHALL:
- Apply fake news detection
- Apply penalty
- Record in system audit

WHEN a comment contains misinformation, THE system SHALL:
- Apply misinformation detection
- Apply penalty
- Record in system audit

WHEN a comment contains false information, THE system SHALL:
- Apply false info detection
- Apply penalty
- Record in system audit

WHEN a comment contains manipulation, THE system SHALL:
- Apply manipulation detection
- Apply penalty
- Record in system audit

WHEN a comment contains coordination, THE system SHALL:
- Apply coordination detection
- Apply penalty
- Record in system audit

WHEN a comment contains vote fraud, THE system SHALL:
- Apply vote fraud detection
- Apply penalty
- Record in system audit

WHEN a comment contains bot behavior, THE system SHALL:
- Apply bot detection
- Apply penalty
- Record in system audit

WHEN a comment contains spam patterns, THE system SHALL:
- Apply spam detection
- Apply penalty
- Record in system audit

WHEN a comment contains abusive language, THE system SHALL:
- Apply abusive detection
- Apply penalty
- Record in system audit

WHEN a comment contains threats, THE system SHALL:
- Apply threat detection
- Apply penalty
- Record in system audit

WHEN a comment contains harassment, THE system SHALL:
- Apply harassment detection
- Apply penalty
- Record in system audit

WHEN a comment contains bullying, THE system SHALL:
- Apply bullying detection
- Apply penalty
- Record in system audit

WHEN a comment contains self-harm, THE system SHALL:
- Apply self-harm detection
- Apply penalty
- Record in system audit

WHEN a comment contains illegal activity, THE system SHALL:
- Apply illegal detection
- Apply penalty
- Record in system audit

WHEN a comment contains copyright infringement, THE system SHALL:
- Apply copyright detection
- Apply penalty
- Record in system audit

WHEN a comment contains phishing, THE system SHALL:
- Apply phishing detection
- Apply penalty
- Record in system audit

WHEN a comment contains malware, THE system SHALL:
- Apply malware detection
- Apply penalty
- Record in system audit

WHEN a comment contains scam, THE system SHALL:
- Apply scam detection
- Apply penalty
- Record in system audit

WHEN a comment contains fake news, THE system SHALL:
- Apply fake news detection
- Apply penalty
- Record in system audit

WHEN a comment contains misinformation, THE system SHALL:
- Apply misinformation detection
- Apply penalty
- Record in system audit

WHEN a comment contains false information, THE system SHALL:
- Apply false info detection
- Apply penalty
- Record in system audit

WHEN a comment contains manipulation, THE system SHALL:
- Apply manipulation detection
- Apply penalty
- Record in system audit

WHEN a comment contains coordination, THE system SHALL:
- Apply coordination detection
- Apply penalty
- Record in system audit

WHEN a comment contains vote fraud, THE system SHALL:
- Apply vote fraud detection
- Apply penalty
- Record in system audit

WHEN a comment contains bot behavior, THE system SHALL:
- Apply bot detection
- Apply penalty
- Record in system audit

WHEN a comment contains spam patterns, THE system SHALL:
- Apply spam detection
- Apply penalty
- Record in system audit

WHEN a comment contains abusive language, THE system SHALL:
- Apply abusive detection
- Apply penalty
- Record in system audit

WHEN a comment contains threats, THE system SHALL:
- Apply threat detection
- Apply penalty
- Record in system audit

WHEN a comment contains harassment, THE system SHALL:
- Apply harassment detection
- Apply penalty
- Record in system audit

WHEN a comment contains bullying, THE system SHALL:
- Apply bullying detection
- Apply penalty
- Record in system audit

WHEN a comment contains self-harm, THE system SHALL:
- Apply self-harm detection
- Apply penalty
- Record in system audit

WHEN a comment contains illegal activity, THE system SHALL:
- Apply illegal detection
- Apply penalty
- Record in system audit

WHEN a comment contains copyright infringement, THE system SHALL:
- Apply copyright detection
- Apply penalty
- Record in system audit

WHEN a comment contains phishing, THE system SHALL:
- Apply phishing detection
- Apply penalty
- Record in system audit

WHEN a comment contains malware, THE system SHALL:
- Apply malware detection
- Apply penalty
- Record in system audit

WHEN a comment contains scam, THE system SHALL:
- Apply scam detection
- Apply penalty
- Record in system audit

WHEN a comment contains fake news, THE system SHALL:
- Apply fake news detection
- Apply penalty
- Record in system audit

WHEN a comment contains misinformation, THE system SHALL:
- Apply misinformation detection
- Apply penalty
- Record in system audit

WHEN a comment contains false information, THE system SHALL:
- Apply false info detection
- Apply penalty
- Record in system audit

WHEN a comment contains manipulation, THE system SHALL:
- Apply manipulation detection
- Apply penalty
- Record in system audit

WHEN a comment contains coordination, THE system SHALL:
- Apply coordination detection
- Apply penalty
- Record in system audit

WHEN a comment contains vote fraud, THE system SHALL:
- Apply vote fraud detection
- Apply penalty
- Record in system audit

WHEN a comment contains bot behavior, THE system SHALL:
- Apply bot detection
- Apply penalty
- Record in system audit

WHEN a comment contains spam patterns, THE system SHALL:
- Apply spam detection
- Apply penalty
- Record in system audit

WHEN a comment contains abusive language, THE system SHALL:
- Apply abusive detection
- Apply penalty
- Record in system audit

WHEN a comment contains threats, THE system SHALL:
- Apply threat detection
- Apply penalty
- Record in system audit

WHEN a comment contains harassment, THE system SHALL:
- Apply harassment detection
- Apply penalty
- Record in system audit

WHEN a comment contains bullying, THE system SHALL:
- Apply bullying detection
- Apply penalty
- Record in system audit

WHEN a comment contains self-harm, THE system SHALL:
- Apply self-harm detection
- Apply penalty
- Record in system audit

WHEN a comment contains illegal activity, THE system SHALL:
- Apply illegal detection
- Apply penalty
- Record in system audit

WHEN a comment contains copyright infringement, THE system SHALL:
- Apply copyright detection
- Apply penalty
- Record in system audit

WHEN a comment contains phishing, THE system SHALL:
- Apply phishing detection
- Apply penalty
- Record in system audit

WHEN a comment contains malware, THE system SHALL:
- Apply malware detection
- Apply penalty
- Record in system audit

WHEN a comment contains scam, THE system SHALL:
- Apply scam detection
- Apply penalty
- Record in system audit

WHEN a comment contains fake news, THE system SHALL:
- Apply fake news detection
- Apply penalty
- Record in system audit

WHEN a comment contains misinformation, THE system SHALL:
- Apply misinformation detection
- Apply penalty
- Record in system audit

WHEN a comment contains false information, THE system SHALL:
- Apply false info detection
- Apply penalty
- Record in system audit

WHEN a comment contains manipulation, THE system SHALL:
- Apply manipulation detection
- Apply penalty
- Record in system audit

WHEN a comment contains coordination, THE system SHALL:
- Apply coordination detection
- Apply penalty
- Record in system audit

WHEN a comment contains vote fraud, THE system SHALL:
- Apply vote fraud detection
- Apply penalty
- Record in system audit

WHEN a comment contains bot behavior, THE system SHALL:
- Apply bot detection
- Apply penalty
- Record in system audit

WHEN a comment contains spam patterns, THE system SHALL:
- Apply spam detection
- Apply penalty
- Record in system audit

WHEN a comment contains abusive language, THE system SHALL:
- Apply abusive detection
- Apply penalty
- Record in system audit

WHEN a comment contains threats, THE system SHALL:
- Apply threat detection
- Apply penalty
- Record in system audit

WHEN a comment contains harassment, THE system SHALL:
- Apply harassment detection
- Apply penalty
- Record in system audit

WHEN a comment contains bullying, THE system SHALL:
- Apply bullying detection
- Apply penalty
- Record in system audit

WHEN a comment contains self-harm, THE system SHALL:
- Apply self-harm detection
- Apply penalty
- Record in system audit

WHEN a comment contains illegal activity, THE system SHALL:
- Apply illegal detection
- Apply penalty
- Record in system audit

WHEN a comment contains copyright infringement, THE system SHALL:
- Apply copyright detection
- Apply penalty
- Record in system audit

WHEN a comment contains phishing, THE system SHALL:
- Apply phishing detection
- Apply penalty
- Record in system audit

WHEN a comment contains malware, THE system SHALL:
- Apply malware detection
- Apply penalty
- Record in system audit

WHEN a comment contains scam, THE system SHALL:
- Apply scam detection
- Apply penalty
- Record in system audit

WHEN a comment contains fake news, THE system SHALL:
- Apply fake news detection
- Apply penalty
- Record in system audit

WHEN a comment contains misinformation, THE system SHALL:
- Apply misinformation detection
- Apply penalty
- Record in system audit

WHEN a comment contains false information, THE system SHALL:
- Apply false info detection
- Apply penalty
- Record in system audit

WHEN a comment contains manipulation, THE system SHALL:
- Apply manipulation detection
- Apply penalty
- Record in system audit

WHEN a comment contains coordination, THE system SHALL:
- Apply coordination detection
- Apply penalty
- Record in system audit

WHEN a comment contains vote fraud, THE system SHALL:
- Apply vote fraud detection
- Apply penalty
- Record in system audit

WHEN a comment contains bot behavior, THE system SHALL:
- Apply bot detection
- Apply penalty
- Record in system audit

WHEN a comment contains spam patterns, THE system SHALL:
- Apply spam detection
- Apply penalty
- Record in system audit

WHEN a comment contains abusive language, THE system SHALL:
- Apply abusive detection
- Apply penalty
- Record in system audit

WHEN a comment contains threats, THE system SHALL:
- Apply threat detection
- Apply penalty
- Record in system audit

WHEN a comment contains harassment, THE system SHALL:
- Apply harassment detection
- Apply penalty
- Record in system audit

WHEN a comment contains bullying, THE system SHALL:
- Apply bullying detection
- Apply penalty
- Record in system audit

WHEN a comment contains self-harm, THE system SHALL:
- Apply self-harm detection
- Apply penalty
- Record in system audit

WHEN a comment contains illegal activity, THE system SHALL:
- Apply illegal detection
- Apply penalty
- Record in system audit

WHEN a comment contains copyright infringement, THE system SHALL:
- Apply copyright detection
- Apply penalty
- Record in system audit

WHEN a comment contains phishing, THE system SHALL:
- Apply phishing detection
- Apply penalty
- Record in system audit

WHEN a comment contains malware, THE system SHALL:
- Apply malware detection
- Apply penalty
- Record in system audit

WHEN a comment contains scam, THE system SHALL:
- Apply scam detection
- Apply penalty
- Record in system audit

WHEN a comment contains fake news, THE system SHALL:
- Apply fake news detection
- Apply penalty
- Record in system audit

WHEN a comment contains misinformation, THE system SHALL:
- Apply misinformation detection
- Apply penalty
- Record in system audit

WHEN a comment contains false information, THE system SHALL:
- Apply false info detection
- Apply penalty
- Record in system audit

WHEN a comment contains manipulation, THE system SHALL:
- Apply manipulation detection
- Apply penalty
- Record in system audit

WHEN a comment contains coordination, THE system SHALL:
- Apply coordination detection
- Apply penalty
- Record in system audit

WHEN a comment contains vote fraud, THE system SHALL:
- Apply vote fraud detection
- Apply penalty
- Record in system audit

WHEN a comment contains bot behavior, THE system SHALL:
- Apply bot detection
- Apply penalty
- Record in system audit

WHEN a comment contains spam patterns, THE system SHALL:
- Apply spam detection
- Apply penalty
- Record in system audit

WHEN a comment contains abusive language, THE system SHALL:
- Apply abusive detection
- Apply penalty
- Record in system audit

WHEN a comment contains threats, THE system SHALL:
- Apply threat detection
- Apply penalty
- Record in system audit

WHEN a comment contains harassment, THE system SHALL:
- Apply harassment detection
- Apply penalty
- Record in system audit

WHEN a comment contains bullying, THE system SHALL:
- Apply bullying detection
- Apply penalty
- Record in system audit

WHEN a comment contains self-harm, THE system SHALL:
- Apply self-harm detection
- Apply penalty
- Record in system audit

WHEN a comment contains illegal activity, THE system SHALL:
- Apply illegal detection
- Apply penalty
- Record in system audit

WHEN a comment contains copyright infringement, THE system SHALL:
- Apply copyright detection
- Apply penalty
- Record in system audit

WHEN a comment contains phishing, THE system SHALL:
- Apply phishing detection
- Apply penalty
- Record in system audit

WHEN a comment contains malware, THE system SHALL:
- Apply malware detection
- Apply penalty
- Record in system audit

WHEN a comment contains scam, THE system SHALL:
- Apply scam detection
- Apply penalty
- Record in system audit

WHEN a comment contains fake news, THE system SHALL:
- Apply fake news detection
- Apply penalty
- Record in system audit

WHEN a comment contains misinformation, THE system SHALL:
- Apply misinformation detection
- Apply penalty
- Record in system audit

WHEN a comment contains false information, THE system SHALL:
- Apply false info detection
- Apply penalty
- Record in system audit

WHEN a comment contains manipulation, THE system SHALL:
- Apply manipulation detection
- Apply penalty
- Record in system audit

WHEN a comment contains coordination, THE system SHALL:
- Apply coordination detection
- Apply penalty
- Record in system audit

WHEN a comment contains vote fraud, THE system SHALL:
- Apply vote fraud detection
- Apply penalty
- Record in system audit

WHEN a comment contains bot behavior, THE system SHALL:
- Apply bot detection
- Apply penalty
- Record in system audit

WHEN a comment contains spam patterns, THE system SHALL:
- Apply spam detection
- Apply penalty
- Record in system audit

WHEN a comment contains abusive language, THE system SHALL:
- Apply abusive detection
- Apply penalty
- Record in system audit

WHEN a comment contains threats, THE system SHALL:
- Apply threat detection
- Apply penalty
- Record in system audit

WHEN a comment contains harassment, THE system SHALL:
- Apply harassment detection
- Apply penalty
- Record in system audit

WHEN a comment contains bullying, THE system SHALL:
- Apply bullying detection
- Apply penalty
- Record in system audit

WHEN a comment contains self-harm, THE system SHALL:
- Apply self-harm detection
- Apply penalty
- Record in system audit

WHEN a comment contains illegal activity, THE system SHALL:
- Apply illegal detection
- Apply penalty
- Record in system audit

WHEN a comment contains copyright infringement, THE system SHALL:
- Apply copyright detection
- Apply penalty
- Record in system audit

WHEN a comment contains phishing, THE system SHALL:
- Apply phishing detection
- Apply penalty
- Record in system audit

WHEN a comment contains malware, THE system SHALL:
- Apply malware detection
- Apply penalty
- Record in system audit

WHEN a comment contains scam, THE system SHALL:
- Apply scam detection
- Apply penalty
- Record in system audit

WHEN a comment contains fake news, THE system SHALL:
- Apply fake news detection
- Apply penalty
- Record in system audit

WHEN a comment contains misinformation, THE system SHALL:
- Apply misinformation detection
- Apply penalty
- Record in system audit

WHEN a comment contains false information, THE system SHALL:
- Apply false info detection
- Apply penalty
- Record in system audit

WHEN a comment contains manipulation, THE system SHALL:
- Apply manipulation detection
- Apply penalty
- Record in system audit

WHEN a comment contains coordination, THE system SHALL:
- Apply coordination detection
- Apply penalty
- Record in system audit

WHEN a comment contains vote fraud, THE system SHALL:
- Apply vote fraud detection
- Apply penalty
- Record in system audit

WHEN a comment contains bot behavior, THE system SHALL:
- Apply bot detection
- Apply penalty
- Record in system audit

WHEN a comment contains spam patterns, THE system SHALL:
- Apply spam detection
- Apply penalty
- Record in system audit

WHEN a comment contains abusive language, THE system SHALL:
- Apply abusive detection
- Apply penalty
- Record in system audit

WHEN a comment contains threats, THE system SHALL:
- Apply threat detection
- Apply penalty
- Record in system audit

WHEN a comment contains harassment, THE system SHALL:
- Apply harassment detection
- Apply penalty
- Record in system audit

WHEN a comment contains bullying, THE system SHALL:
- Apply bullying detection
- Apply penalty
- Record in system audit

WHEN a comment contains self-harm, THE system SHALL:
- Apply self-harm detection
- Apply penalty
- Record in system audit

WHEN a comment contains illegal activity, THE system SHALL:
- Apply illegal detection
- Apply penalty
- Record in system audit

WHEN a comment contains copyright infringement, THE system SHALL:
- Apply copyright detection
- Apply penalty
- Record in system audit

WHEN a comment contains phishing, THE system SHALL:
- Apply phishing detection
- Apply penalty
- Record in system audit

WHEN a comment contains malware, THE system SHALL:
- Apply malware detection
- Apply penalty
- Record in system audit

WHEN a comment contains scam, THE system SHALL:
- Apply scam detection
- Apply penalty
- Record in system audit

WHEN a comment contains fake news, THE system SHALL:
- Apply fake news detection
- Apply penalty
- Record in system audit

WHEN a comment contains misinformation, THE system SHALL:
- Apply misinformation detection
- Apply penalty
- Record in system audit

WHEN a comment contains false information, THE system SHALL:
- Apply false info detection
- Apply penalty
- Record in system audit

WHEN a comment contains manipulation, THE system SHALL:
- Apply manipulation detection
- Apply penalty
- Record in system audit

WHEN a comment contains coordination, THE system SHALL:
- Apply coordination detection
- Apply penalty
- Record in system audit

WHEN a comment contains vote fraud, THE system SHALL:
- Apply vote fraud detection
- Apply penalty
- Record in system audit

WHEN a comment contains bot behavior, THE system SHALL:
- Apply bot detection
- Apply penalty
- Record in system audit

WHEN a comment contains spam patterns, THE system SHALL:
- Apply spam detection
- Apply penalty
- Record in system audit

WHEN a comment contains abusive language, THE system SHALL:
- Apply abusive detection
- Apply penalty
- Record in system audit

WHEN a comment contains threats, THE system SHALL:
- Apply threat detection
- Apply penalty
- Record in system audit

WHEN a comment contains harassment, THE system SHALL:
- Apply harassment detection
- Apply penalty
- Record in system audit

WHEN a comment contains bullying, THE system SHALL:
- Apply bullying detection
- Apply penalty
- Record in system audit

WHEN a comment contains self-harm, THE system SHALL:
- Apply self-harm detection
- Apply penalty
- Record in system audit

WHEN a comment contains illegal activity, THE system SHALL:
- Apply illegal detection
- Apply penalty
- Record in system audit

WHEN a comment contains copyright infringement, THE system SHALL:
- Apply copyright detection
- Apply penalty
- Record in system audit

WHEN a comment contains phishing, THE system SHALL:
- Apply phishing detection
- Apply penalty
- Record in system audit

WHEN a comment contains malware, THE system SHALL:
- Apply malware detection
- Apply penalty
- Record in system audit

WHEN a comment contains scam, THE system SHALL:
- Apply scam detection
- Apply penalty
- Record in system audit

WHEN a comment contains fake news, THE system SHALL:
- Apply fake news detection
- Apply penalty
- Record in system audit

WHEN a comment contains misinformation, THE system SHALL:
- Apply misinformation detection
- Apply penalty
- Record in system audit

WHEN a comment contains false information, THE system SHALL:
- Apply false info detection
- Apply penalty
- Record in system audit

WHEN a comment contains manipulation, THE system SHALL:
- Apply manipulation detection
- Apply penalty
- Record in system audit

WHEN a comment contains coordination, THE system SHALL:
- Apply coordination detection
- Apply penalty
- Record in system audit

WHEN a comment contains vote fraud, THE system SHALL:
- Apply vote fraud detection
- Apply penalty
- Record in system audit

WHEN a comment contains bot behavior, THE system SHALL:
- Apply bot detection
- Apply penalty
- Record in system audit

WHEN a comment contains spam patterns, THE system SHALL:
- Apply spam detection
- Apply penalty
- Record in system audit

WHEN a comment contains abusive language, THE system SHALL:
- Apply abusive detection
- Apply penalty
- Record in system audit

WHEN a comment contains threats, THE system SHALL:
- Apply threat detection
- Apply penalty
- Record in system audit

WHEN a comment contains harassment, THE system SHALL:
- Apply harassment detection
- Apply penalty
- Record in system audit

WHEN a comment contains bullying, THE system SHALL:
- Apply bullying detection
- Apply penalty
- Record in system audit

WHEN a comment contains self-harm, THE system SHALL:
- Apply self-harm detection
- Apply penalty
- Record in system audit

WHEN a comment contains illegal activity, THE system SHALL:
- Apply illegal detection
- Apply penalty
- Record in system audit

WHEN a comment contains copyright infringement, THE system SHALL:
- Apply copyright detection
- Apply penalty
- Record in system audit

WHEN a comment contains phishing, THE system SHALL:
- Apply phishing detection
- Apply penalty
- Record in system audit

WHEN a comment contains malware, THE system SHALL:
- Apply malware detection
- Apply penalty
- Record in system audit

WHEN a comment contains scam, THE system SHALL:
- Apply scam detection
- Apply penalty
- Record in system audit

WHEN a comment contains fake news, THE system SHALL:
- Apply fake news detection
- Apply penalty
- Record in system audit

WHEN a comment contains misinformation, THE system SHALL:
- Apply misinformation detection
- Apply penalty
- Record in system audit

WHEN a comment contains false information, THE system SHALL:
- Apply false info detection
- Apply penalty
- Record in system audit

WHEN a comment contains manipulation, THE system SHALL:
- Apply manipulation detection
- Apply penalty
- Record in system audit

WHEN a comment contains coordination, THE system SHALL:
- Apply coordination detection
- Apply penalty
- Record in system audit

WHEN a comment contains vote fraud, THE system SHALL:
- Apply vote fraud detection
- Apply penalty
- Record in system audit

WHEN a comment contains bot behavior, THE system SHALL:
- Apply bot detection
- Apply penalty
- Record in system audit

WHEN a comment contains spam patterns, THE system SHALL:
- Apply spam detection
- Apply penalty
- Record in system audit

WHEN a comment contains abusive language, THE system SHALL:
- Apply abusive detection
- Apply penalty
- Record in system audit

WHEN a comment contains threats, THE system SHALL:
- Apply threat detection
- Apply penalty
- Record in system audit

WHEN a comment contains harassment, THE system SHALL:
- Apply harassment detection
- Apply penalty
- Record in system audit

WHEN a comment contains bullying, THE system SHALL:
- Apply bullying detection
- Apply penalty
- Record in system audit

WHEN a comment contains self-harm, THE system SHALL:
- Apply self-harm detection
- Apply penalty
- Record in system audit

WHEN a comment