# Reddit-like Community Platform Requirements Analysis

## Service Overview

### Business Justification

The internet is saturated with social platforms that prioritize engagement over quality, leading to echo chambers, misinformation, toxic discourse, and low-value content. Traditional forums lack the discoverability and community-driven curation of modern platforms, while existing Reddit-like services have become overrun with spam, bots, and algorithmic manipulation.

This platform addresses these issues by implementing a balanced, transparent, and community-governed system that:
- Rewards meaningful contribution through reputation (karma)
- Empowers communities to self-moderate with transparent rules
- Prevents manipulation through anti-gaming algorithms
- Encourages high-quality discussions through intelligent content discovery
- Prioritizes privacy by keeping voting anonymous
- Protects users from abuse while preserving freedom of expression

The platform's uniqueness lies in its combination of:
- Granular community autonomy
- Transparent moderation with appeal processes
- Anti-gaming karma and voting systems
- Content discovery based on engagement quality, not just quantity
- Complete anonymity of voting behavior

### Target Audience

The platform serves three primary user groups:
- **Casual Users**: Individuals seeking quality discussion, entertainment, and information on niche topics
- **Active Contributors**: Users who frequently post, comment, and engage with content to build reputation and influence
- **Community Moderators**: Trusted users appointed to maintain quality and enforce rules within specific communities

The platform also serves **Administrators** responsible for platform-wide policy, handling edge cases, and ensuring system integrity.

### Unique Value Proposition

Unlike existing platforms that primarily reward volume (posts/comments) or popularity (upvotes), this platform rewards:
- **Quality** - well-reasoned, thoughtful contributions
- **Consistency** - sustained positive engagement over time
- **Community Contribution** - helping maintain healthy discussion
- **Reputation Integrity** - earned through genuine interaction, not manipulation

The platform prevents:
- Karma farming through automated voting schemes
- Bot-driven content generation
- Coordinated vote brigading
- Spammy or low-effort posting
- Toxic moderation practices

### Success Metrics

The platform will measure success by:

1. **User Growth**: 50,000+ registered users within first 6 months
2. **Engagement Quality**: 85%+ of posts come from users with karma > 100
3. **Community Health**: 90%+ of communities maintain active moderation with <5% reported content
4. **Karma Integrity**: <1% of karma changes result from fraud detection
5. **User Retention**: 40%+ of users remain active after 90 days
6. **Report Accuracy**: >85% of user reports result in valid moderation actions
7. **Content Diversity**: 70%+ of content originates from users outside top 10 communities

### Future Roadmap

- **Phase 2**: Live audio/video posts with community Q&A
- **Phase 3**: Community-specific token economies and rewards
- **Phase 4**: Decentralized moderation via blockchain-based reputation
- **Phase 5**: Integrated knowledge graph linking related posts across communities
- **Phase 6**: API access for third-party moderation tools

## User Actors

### Guest

Guests are unauthenticated users who can:
- Browse all public communities
- View all posts and comments
- See aggregate vote counts (but not individual votes)
- View user karma levels as color-coded badges (e.g., "Veteran", "Active Member")
- Click through to sign up or log in

Guests cannot:
- Create posts or comments
- Vote on content
- Subscribe to communities
- Report content
- View user profiles in detail
- Edit or delete content
- Access moderation tools

### Member

Members are authenticated users who can:
- Create posts (text, link, or image) in any public community or their subscribed private communities
- Comment on any post
- Vote on posts and comments (upvote/downvote)
- Subscribe to unlimited communities (up to 50)
- View their own karma score and history
- View other users' karma scores and public profile information
- Report inappropriate content
- Edit their own posts and comments within 15 minutes of creation
- Delete their own posts and comments within 1 hour of creation
- Receive notifications for replies to their content
- Join private communities (upon moderator approval)

Members cannot:
- Modify other users' content
- Ban other users
- Modify community rules
- Assign moderators
- Override moderation decisions
- Access admin tools

### Moderator

Moderators are members appointed by community creators or administrators with additional permissions:

- All permissions of a Member
- Remove any post or comment from their community
- Issue warnings to users for policy violations
- Temporarily suspend users from their community (up to 30 days)
- Approve or reject member requests for private communities
- Pin important posts to the top of the community
- Set community-specific rules (post types, depth limits, etc.)
- Review reports submitted by members
- View detailed moderation logs

Moderators cannot:
- Ban users from the entire platform
- Modify community settings for communities they don't moderate
- Assign other users as moderators (unless Admin)
- Override admin decisions

Moderators are selected based on:
- Minimum karma of 500
- Proven history of constructive engagement
- No history of moderation abuse
- Community trust (member votes)

### Admin

Admins have platform-wide authority:

- All permissions of Moderator
- Ban users from the entire platform permanently
- Remove any content regardless of community rules
- Assign or remove moderators from any community
- Overrule any moderation decision
- Approve or reject community creation requests
- Feature communities on the homepage
- Access system-wide audit logs
- Modify platform-wide policies
- Reset karma in exceptional circumstances

Admins cannot:
- Access individual user private data without legal warrant
- Change the core algorithms without transparency
- Ignore community autonomy on matters of content policy

### Authentication Flow

#### Guest to Member

WHEN a guest attempts to create a post, THE system SHALL redirect them to the registration/login page.

WHEN a guest selects "Sign Up", THE system SHALL require:
- A unique username (3-30 characters, alphanumeric and underscore only)
- A valid email address for verification
- A password (minimum 12 characters)
- Agreement to Community Guidelines and Privacy Policy
- Completion of CAPTCHA

WHEN the registration form is submitted, THE system SHALL:
- Validate email format
- Check username uniqueness
- Verify password strength
- Generate a verification token
- Send a verification email with expiration period of 24 hours
- Create a temporary account with karma=0 and status="UNVERIFIED"

WHEN a guest clicks the verification link in their email, THE system SHALL:
- Validate the token
- Change account status to "VERIFIED"
- Award +50 karma for verification completion
- Redirect to the homepage

WHEN an unverified user attempts to log in, THE system SHALL display: "Your email has not been verified. Check your inbox for a verification link or request a new one."

WHEN an account remains unverified for 7 days, THE system SHALL automatically delete the account and all associated draft content.

#### Authentication Persistence

WHEN a user logs in, THE system SHALL generate a JWT token with:
- User ID
- Role (member/moderator/admin)
- Issued timestamp
- Expiration (7 days)

WHEN a token expires, THE system SHALL require re-authentication.

WHEN a user logs out, THE system SHALL invalidate the current token.

WHEN a user changes their password, THE system SHALL invalidate ALL existing tokens.

WHEN a user's account is suspended or banned, THE system SHALL immediately invalidate ALL their tokens.

WHEN a user's role changes (promotion/demotion), THE system SHALL update the token's role claim on next login.

## Core Functional Requirements

### User Registration and Login

#### Registration Flow

WHEN a guest attempts to register, THE system SHALL enforce the following rules:

- Usernames must be 3-30 characters, containing only alphanumeric characters and underscores
- Usernames cannot match existing usernames (case-insensitive)
- Usernames cannot contain profanity or system-reserved words (e.g., "admin", "moderator", "help")
- Email addresses must be valid and not already registered
- Passwords must be minimum 12 characters and contain at least:
  - One uppercase letter
  - One lowercase letter
  - One number
  - One special character
- Passwords cannot match common compromised passwords (checked against haveibeenpwned.com API)
- CAPTCHA must be solved successfully
- Terms of service and privacy policy must be accepted
- Account creation must occur with IP address logging for fraud prevention

WHEN a user successfully registers, THE system SHALL:

- Send a verification email within 5 seconds
- Display: "Registration successful! Please check your email to verify your account."
- Create a profile with default avatar and no biography
- Set karma to 0
- Record creation timestamp

WHEN a user attempts to register with a disposable email domain (e.g., 10minutemail.com), THE system SHALL return: "We don't accept temporary email addresses. Please use a legitimate email address."

WHEN a user attempts to register from a VPN/proxy detected by IP reputation service, THE system SHALL require additional identity verification via SMS or document upload.

WHEN a user creates multiple accounts from the same device/IP within 10 minutes, THE system SHALL require CAPTCHA for every additional attempt and log the attempt as potential sock puppet behavior.

#### Login Flow

WHEN a user attempts to log in, THE system SHALL:

- Accept username or email as identifier
- Accept password of minimum 12 characters
- Validate the password against the stored hash
- Check account status (active, suspended, banned)
- If account is suspended, display: "Your account has been temporarily suspended. Contact support for details."
- If account is banned, display: "Your account has been permanently banned for violating our community guidelines."
- If login is successful, generate JWT token and redirect to homepage
- If login fails, display: "Invalid username/email or password. Please try again."

WHEN a user enters an incorrect password 5 times in 5 minutes, THE system SHALL:

- Lock the account for 15 minutes
- Display: "Too many login attempts. Your account has been temporarily locked. Try again in 15 minutes."
- Log the event as potential brute force attack

WHEN a user successfully logs in from an unrecognized device, THE system SHALL:

- Send a security notification to their registered email
- Require 2FA verification (code sent via email) for the first login
- Allow user to "Trust this device" to skip 2FA on future logins from the same device

WHEN a user attempts to log in after their account was deleted, THE system SHALL return: "This account no longer exists. Please register a new account."

### Create Communities (Subreddits)

WHEN a member attempts to create a community, THE system SHALL:

- Require a unique name (3-30 characters, alphanumeric and underscore only)
- Require a description (50-500 characters)
- Check against banned words list (e.g., "hate", "abuse", "illegal")
- Verify user has karma ≥ 500
- Verify user has created fewer than 5 communities
- Display a preview of the new community URL

WHEN a community name is already taken, THE system SHALL display: "The community name '{name}' is already taken. Please choose another name."

WHEN a community name contains disallowed characters, THE system SHALL display: "Community names can only contain letters, numbers, and underscores."

WHEN a community creation is successful, THE system SHALL:

- Create a new community with status="ACTIVE"
- Assign the creator as the first moderator
- Create default rules post with template text: "Welcome to {name}! This is your community's official rules section. Edit this post to define your guidelines."
- Award +100 karma to the creator
- Send notification: "Your community {name} has been created! You're now a moderator."
- Add the community to the member's subscribed list
- Record creation time, IP address, and member ID

WHEN a community is created with a name containing trademarked terms, THE system SHALL:

- Place the community in "PENDING_APPROVAL" status
- Send notification: "Your community name triggers a trademark review. Our team will contact you within 48 hours."
- Block all subscriptions and discovery until approval
- Notify admin team of pending review

WHEN a community is rejected during approval, THE system SHALL:

- Change status to "REJECTED"
- Notify creator with specific reason
- Deduct 100 karma from the creator
- Restrict the creator from creating another community for 14 days

WHEN a community is approved, THE system SHALL:

- Change status to "ACTIVE"
- Remove "PENDING_APPROVAL" tags
- Allow subscriptions and discovery
- Send notification: "Congratulations! Your community {name} has been approved and is now public."

WHEN a community is set to private, THE system SHALL:

- Require moderator approval for all subscription requests
- Hide from public discovery listings
- Allow only subscribers to view content

### Post Creation (Text, Links, Images)

WHEN a member attempts to create a post, THE system SHALL:

- Require selection of a community (public or subscribed private)
- Require selection of post type: text, link, or image
- Prevent selection of both image and link types simultaneously
- Validate that the community is not closed for new posts
- If the community is closed to new posts, display: "This community is currently closed to new posts."

WHEN a user creates a text post, THE system SHALL:

- Require a title (minimum 3 characters, maximum 300 characters)
- Require content (minimum 10 characters, maximum 10,000 characters)
- Prevent submission if title is empty or whitespace-only
- Prevent submission if content is empty or whitespace-only
- Flag content with >20% non-alphabetic characters for automated moderation

WHEN a user creates a link post, THE system SHALL:

- Require a title (minimum 3 characters, maximum 300 characters)
- Require a valid URL (HTTP/HTTPS protocol)
- Automatically extract link metadata: title, description, and first image
- Validate URL resolves to valid domain (DNS resolution successful)
- Validate destination returns HTTP status 200-399
- Reject URLs pointing to banned domains (malware, phishing, adult content)
- Reject internal/local network addresses (127.0.0.1, 192.168.x.x, 10.x.x.x, fe80::/10, localhost)
- Expand shortened URLs (bit.ly, t.co, etc.) to final destination before validation
- Flag posts containing more than three URLs for moderation review

WHEN a user creates an image post, THE system SHALL:

- Require a title (minimum 3 characters, maximum 300 characters)
- Require at least one image file
- Accept only JPEG, PNG, GIF, or WEBP formats
- Validate each image ≤ 10 MB
- Validate each image dimensions ≤ 10,000 pixels in width or height
- Allow up to 10 images per post
- Compress and optimize images for web delivery
- Generate three renditions: thumbnail (120×120), preview (640×640), original resolution
- Store all media in distributed object storage (not database)
- Re-use existing media assets if same hash already exists
- Prevent uploading of executable files or binary content
- Prevent uploading of filetypes other than allowed formats

WHEN a user uploads an image exceeding 10 MB, THE system SHALL:

- Display: "Image exceeds 10 MB limit. Please compress or reduce resolution."
- Abandon upload
- Return user to image selection

WHEN a user uploads an image exceeding 10,000 pixels in any dimension, THE system SHALL:

- Display: "Images must be under 10,000 pixels in width and height."
- Abandon upload
- Return user to image selection

WHEN a user uploads more than 10 images in a single post, THE system SHALL:

- Display: "You can only upload up to 10 images per post."
- Keep the first 10 images
- Discard extras with warning

WHEN a user attempts to create a duplicate of their own prior post within the same community within 24 hours, THE system SHALL:

- Analyze title and content similarity
- If similarity exceeds 95% (text-based) or visual hash (image-based), display: "You've already posted this content recently. Please wait before posting again."
- Block submission

WHEN a post contains a spammy title (e.g., >80% capital letters, repetitive word patterns), THE system SHALL:

- Flag for automated review
- Display: "Your post title has been flagged for potential spam." while allowing submission
- Log as potential spam attempt

WHEN a post contains more than 10 URLs, THE system SHALL:

- Flag for manual moderation review
- Display: "This post contains many links. Our moderators may review it for spam."

WHEN a post contains links to known malicious domains (based on real-time threat intelligence), THE system SHALL:

- Block submission immediately
- Display: "This domain is restricted on our platform."

WHEN a post contains self-referential URLs from the same domain, THE system SHALL:

- Allow submission but flag for additional automated review

WHEN a post is created by a user with negative karma < -50, THE system SHALL:

- Require CAPTCHA before submission
- Add warning: "Your recent participation has resulted in a negative reputation. Please ensure your post adds value to the community."

WHEN a post is created within 30 seconds of account creation, THE system SHALL:

- Require implicit trust check (CAPTCHA)
- Limit post visibility to author until 24 hours pass
- Add tag: "New user post - content not yet verified"

WHEN a community has over 10,000 subscribers, THE system SHALL:

- Require all link posts to be manually approved by a moderator before appearing in feed
- Display: "This community has over 10,000 subscribers. All link posts require manual approval to maintain quality."

WHEN a post violates content moderation rules (based on keyword detection, spam patterns, AI-generation metrics), THE system SHALL:

- Flag as "Held for Review"
- Hide from public feed
- Notify community moderators
- Notify admin team
- Log: "AI/Spam detection triggered: {rule_id}"

WHEN a post is flagged but not blocked, THE system SHALL:

- Display: "Your post has been flagged for review. It will appear after approval."
- Allow user to appeal later
- Record content hash for future reference

WHEN a user edits a post after its initial submission, THE system SHALL:

- Allow editing within 15 minutes of creation
- Display "[Edited]" label on the post
- Preserve original version in version history
- Notify all commenters of significant changes (if character count changes by >100)

WHEN a user deletes a post, THE system SHALL:

- Allow deletion within 1 hour of creation
- Replace content with: "[Post deleted by author]"
- Decrement post count on community
- Preserve votes, karma impact, and comments (they remain)

WHEN an admin or moderator deletes a post, THE system SHALL:

- Remove all content and associated comments
- Replace with: "[Post removed by administrator]"
- Record reason from moderation policy
- Notify user
- Reduce karma by 5 points for each deletion

### Upvote/Downvote Posts and Comments

WHEN a member tries to upvote a post, THE system SHALL:

- Check if user is authenticated (member)
- If guest, display: "You must be a member to vote. Sign up or log in."
- If already voted up, remove vote and decrease score by 1
- If already voted down, switch vote and increase score by 2 (down → up: -1 → +1 = net +2)
- If not voted, add upvote and increase score by 1
- Update display in real-time (within 500ms)
- Record vote metadata (post_id, user_id, vote_type, timestamp)
- Award +1 karma to post author

WHEN a member tries to downvote a post, THE system SHALL:

- Check if user is authenticated (member)
- If guest, display: "You must be a member to vote. Sign up or log in."
- If already voted down, remove vote and increase score by 1
- If already voted up, switch vote and decrease score by 2 (up → down: +1 → -1 = net -2)
- If not voted, add downvote and decrease score by 1
- Update display in real-time (within 500ms)
- Record vote metadata (post_id, user_id, vote_type, timestamp)
- Award -1 karma (reduction) to post author

WHEN a member tries to upvote a comment, THE system SHALL:

- Check if user is authenticated (member, karma ≥ 100)
- If member karma < 100, display: "You need at least 100 karma to vote on comments."
- If already voted up, remove vote and decrease score by 1
- If already voted down, switch vote and increase score by 2
- If not voted, add upvote and increase score by 1
- Update display in real-time (within 500ms)
- Record vote metadata (comment_id, user_id, vote_type, timestamp)
- Award +1 karma to comment author

WHEN a member tries to downvote a comment, THE system SHALL:

- Check if user is authenticated (member, karma ≥ 100)
- If member karma < 100, display: "You need at least 100 karma to vote on comments."
- If already voted down, remove vote and increase score by 1
- If already voted up, switch vote and decrease score by 2
- If not voted, add downvote and decrease score by 1
- Update display in real-time (within 500ms)
- Record vote metadata (comment_id, user_id, vote_type, timestamp)
- Award -1 karma (reduction) to comment author

WHEN a user votes on their own content, THE system SHALL:

- Allow the vote to be cast
- Apply vote changes normally (upvote/downvote)
- Record the internal vote
- Do NOT award karma to self
- Flag in audit trail: "Self-vote recorded"
- Allow moderation override

WHEN any user attempts to vote more than 100 times per minute, THE system SHALL:

- Block further voting
- Display: "Too many votes in a short time. Please wait five minutes before voting again."
- Temporarily disable vote functionality for 5 minutes
- Log as potential bot behavior

WHEN any user attempts to vote more than 5 times on the same post/comment within 1 minute, THE system SHALL:

- Block additional votes on this item
- Display: "You've voted on this item too frequently. Please wait ten minutes before voting again."
- Lock further voting for 10 minutes on this specific item
- Log behavior

WHEN voting from a previously banned IP address or device fingerprint, THE system SHALL:

- Block vote
- Log: "Vote blocked from banned device/IP"
- Display: "Your voting privileges are suspended."

WHEN a user attempts to vote on a post that is already deleted, THE system SHALL:

- Display: "This post has been removed."
- Block vote

WHEN a user attempts to vote on a comment that is already deleted, THE system SHALL:

- Display: "This comment has been removed."
- Block vote

WHEN a vote is recorded, THE system SHALL:

- Record user_id and post/comment_id as foreign keys
- Store vote_type as "upvote" or "downvote"
- Store timestamp in UTC
- Do NOT store IP address or device fingerprint
- Do NOT link vote to individual identity in any public interface
- Maintain vote data forever for audit purposes even if content is deleted

WHEN a user changes their vote, THE system SHALL:

- Recalculate total score immediately (remove old, add new)
- Recalculate karma impact for author if applicable
- Recalculate hot score for post
- Update display in real-time
- Log vote change in audit trail

### Comment on Posts with Nested Replies

WHEN a member attempts to comment on a post, THE system SHALL:

- Require text content ≥ 5 characters
- Prevent content with >5,000 characters
- Prevent content with >20 URLs
- Prevent content identical to previous comment from same user in last 30 seconds
- Validate content against moderation triggers
- Award +2 karma to commenter

WHEN a user attempts to reply to a comment, THE system SHALL:

- Display reply box with embedded quote of target comment (first 300 characters)
- Allow reply to any comment regardless of depth
- Prevent direct replies to comments at depth 5
- Add "Level 1" to replies directly under a post, "Level 2", "Level 3" etc. for nested replies

WHEN a comment reaches depth 5, THE system SHALL:

- Prevent any further replies to that comment
- Display: "This thread has reached maximum depth. Further replies are disabled."
- Allow replies to comments at depth 4 or less

WHEN a post has more than 10,000 comments total, THE system SHALL:

- Disable new replies on the entire post
- Display: "This discussion has reached maximum comments. New replies are closed."
- Allow upvotes/downvotes on existing comments
- Keep existing comments visible

WHEN a comment is edited, THE system SHALL:

- Allow edits within 15 minutes of creation
- Only if original comment has <5 upvotes
- Allow edit only if comment has not been moderated
- Display "[Edited]" label
- Preserve original text in version history
- Append edit history: "[Edited: {date} at {time}]"
- Notify all direct responders

WHEN a user deletes their own comment, THE system SHALL:

- Allow deletion within 1 hour of creation
- Replace with: "[Comment deleted by author]"
- Preserve karma impact on author
- Preserve reply structure
- Decrement post's comment count

WHEN a moderator deletes a comment, THE system SHALL:

- Replace with: "[Comment removed by moderator]" + reason
- Record moderator ID and moderation reason
- Notify commenter via system message
- Preserve karma impact and reply structure
- Record in audit log

WHEN an admin deletes a comment, THE system SHALL:

- Replace with: "[Comment removed by admin]" + reason
- Record admin ID and moderation reason
- Notify commenter via system message
- Preserve karma impact and reply structure
- Record in secure audit log
- Trigger system notification to community moderators

WHEN a user reports a comment, THE system SHALL:

- Allow selection of violation category (from 10-moderation-policy.md)
- Record reporter ID and timestamp
- Record comment ID and post ID
- Flag comment as "Reported" to non-moderators
- Queue for review by community moderators
- Display: "Your report has been submitted for review."

WHEN a comment receives 3+ reports from distinct users within 5 minutes, THE system SHALL:

- Automatically flag for priority review
- Hide comment from all users except moderators
- Notify all active moderators of the community
- Send system alert: "URGENT: 3+ reports within 5m"
- Lock replies on the comment

WHEN a comment is approved after report, THE system SHALL:

- Display original content to all users
- Remove "Reported" label
- Decrease reporter's "report quality score"
- Notify reporter: "Your report was dismissed as invalid."

WHEN a comment is removed after report, THE system SHALL:

- Remove comment and all nested replies
- Apply -5 karma penalty to author
- Record reason in moderation history
- Notify author
- Increase "trust score penalty" for future moderation

WHEN a user is reported three times on comments, THE system SHALL:

- Impose 7-day temporary suspension
- Notify: "Your account is temporarily suspended for 7 days due to repeated content violations."
- Freeze posting and commenting on all communities
- Allow viewing and voting only
- Allow appeal process

WHEN a user is reported five times across distinct violations, THE system SHALL:

- Trigger automatic admin review
- Notify all community moderators
- Place "Under Administrative Review" tag on profile
- Block posting, commenting, and voting

WHEN a user is permanently banned for comment violation, THE system SHALL:

- Remove all their content from platform
- Display: "Account permanently banned for sustained violation of community guidelines"
- Prevent re-registration under any email or username
- Record in global moderation audit

WHEN a user attempts to reply to a comment in a non-subscribed community, THE system SHALL:

- Prevent reply
- Display: "You're not subscribed to this community. Subscribe to participate in discussions."

WHEN a user attempts to reply to a comment of a banned user, THE system SHALL:

- Allow reply
- Display: "[User is banned]" next to comment author
- Display: "[Reply]" next to reply
- Keep comment visible for context

WHEN a user attempts to comment on a post that is archived, THE system SHALL:

- Prevent comment
- Display: "This discussion is archived. No further comments allowed."

WHEN a new user (account < 24 hours) creates first comment, THE system SHALL:

- Require CAPTCHA
- Display: "New users must complete a quick verification to prevent spam."
- Show comment "below the fold" until 24 hours pass
- Flag as "New user comment"

WHEN a comment is flagged as doxxing (personal information), THE system SHALL:

- Immediately remove comment
- Ban user for 30 days
- Trigger admin investigation
- Disable all account re-creation
- Notify authorities if minor's data is involved

WHEN a comment is flagged as hostile targeting (directed harassment), THE system SHALL:

- Immediately hide from non-moderators
- Notify victim with safety resources
- Apply -10 karma penalty
- Place "High Risk User" tag on perpetrator
- Assign moderator to monitor future activity

### User Karma System

#### Karma Calculation

Karma is calculated using the following formula:

Karma = (∑ Upvotes Received) - (∑ Downvotes Received) + (∑ Reply Upvotes) - (∑ Reply Downvotes) - (Penalty Points)

Where:
- +1 for upvote on post
- -1 for downvote on post
- +1 for upvote on comment
- -1 for downvote on comment
- +2 for post selected as "Top Post" by algorithm
- +1 for comment selected as "Best Comment" by algorithm
- -5 for spam text
- -5 for inflammatory language
- -5 for cross-posting identical content in >10 communities
- -10 for links to malware/phishing
- -10 for sexual solicitation
- -15 for hateful speech
- -20 for karma manipulation (self-voting, botting, vote rings)
- -50 for attempting to impersonate mods/admins

Karma cannot go below 0.

Karma is updated immediately when votes change.

Votes from users with karma < 10 do not count toward karma calculation.

#### Karma Display

Karma scores are displayed as:

- On user profile: "{karma} karma"
- On posts/comments: "{karma} karma" next to username
- Badge tiers:
  - 0: "New user" (gray)
  - 10: "Contributor" (green)
  - 100: "Active member" (blue)
  - 500: "Respected user" (violet)
  - 1,000: "Veteran" (gold)
  - 5,000: "Community pillar" (platinum)
  - 10,000+: "Elder" (diamond)

Karma history graph (total karma vs time) visible to user and moderators.

Karma ranking among peers ("Top 5% of users") shown on profile.

#### Karma Impact

Karma enables privileges:

- 10: Can create posts
- 50: Can comment
- 100: Can vote on comments
- 200: Can join private communities
- 500: Can create communities
- 1,000: Can recommend communities to homepage
- 5,000: Can review and validate user reports
- 10,000: Can nominate users as moderators

Karma also affects visibility:

- Posts from users with karma > 500 appear higher in "Hot" rankings
- Comments from users with karma > 1,000 are prioritized in "Top Replies"
- Threads with opinions from users carrying karma > 2,000 are deemed "higher confidence" by algorithm
- Users with karma > 5,000 have "trusted analyst" badge on all interactions

#### Karma Decay Algorithm

After 6 months inactivity: -15% karma

After 12 months inactivity: -30% karma

After 24 months inactivity: -50% karma

No decay for:
- Karma ≥ 10,000
- Active moderators
- Admins

Users are notified:
- First notification: 2 months before 6-month checkpoint
- Second notification: 1 month before cutoff

#### Karma Fraud Prevention

- User cannot vote on their own content (except for karma calculation)
- User can vote only once per item
- Voting restricted after 5 seconds of viewing
- Voting limited to 100 votes/minute
- No votes from users < 24h old
- Duplicate vote detection
- Coordinated voting pattern detection
- Automated review of >500 karma changes in 24h

### Sort Posts by Hot, New, Top, Controversial

WHEN a user selects "New", THE system SHALL sort posts by creation timestamp descending (most recent first).

WHEN a user selects "Top", THE system SHALL sort posts by net votes (upvotes - downvotes) descending.

WHEN a user selects "Controversial", THE system SHALL sort posts by: (upvotes * downvotes) / (upvotes + downvotes + 1)

WHEN a user selects "Hot", THE system SHALL calculate a dynamic score every 5 minutes using:

hot_score = log_10(absolute_upvotes + 1) + (hours_since_posted * 0.1) - (hours_since_posted * 0.1 * votes_score)

Where:
- absolute_upvotes = (upvotes - downvotes) + 1
- votes_score = if (upvotes + downvotes) > 0 then (|upvotes - downvotes| / (upvotes + downvotes)) else 0

Time scopes for Top and Controversial:

- "All Time": includes all posts regardless of creation date
- "Today": includes posts created within last 24 hours
- "This Week": includes posts created within last 7 days
- "This Month": includes posts created within last 30 days
- "This Year": includes posts created within last 365 days

"Hot" sort is always based on All Time.

### Subscribe to Communities

WHEN a member visits a community, THE system SHALL display "Subscribe" if not already subscribed.

WHEN a member clicks "Subscribe", THE system SHALL:

- Add community to user's subscription list
- Increase subscription count
- Notify: "You've subscribed to {community_name}"
- If community is NSFW, require confirmation: "I am over 18"

WHEN a member clicks "Unsubscribe", THE system SHALL:

- Remove community from user's subscription list
- Decrease subscription count
- Notify: "You've unsubscribed from {community_name}"

WHEN a member attempts to subscribe to >50 communities, THE system SHALL:

- Display: "You've reached the maximum limit of 50 subscribed communities. Unsubscribe from one to join another."
- Block additional subscriptions

WHEN a community is private, THE system SHALL:

- Allow subscription only after approval by moderator
- Display: "This community requires approval to join."
- Queue request

WHEN a member attempts to subscribe to a community with a banned name, THE system SHALL:

- Block subscription
- Display: "This community is not available for subscription."

WHEN a community is marked as "NSFW", THE system SHALL:

- Require age verification ("I am over 18" checkbox)
- Flag in community listing
- Apply content filtering for underage users

### User Profiles Showing Their Posts and Comments

WHEN a user views their own profile, THE system SHALL display:

- Username
- Karma score and tier badge
- Join date
- Number of posts
- Number of comments
- Number of subscriptions
- Number of communities moderated
- Activity graph (posts/comments over time)
- Reputation breakdown (posts, comments, moderation)
- Recent posts (last 10, with links)
- Recent comments (last 10, with links)
- Subscribed communities (last 20)
- Communities moderated (last 10)
- Account status (active/banned)

WHEN a user views another user's profile, THE system SHALL display:

- Username
- Karma score and tier badge
- Join date
- Number of posts
- Number of comments
- Number of subscriptions
- Number of communities moderated
- Recent posts (last 5)
- Recent comments (last 5)
- Subscribed communities (last 10)
- Communities moderated (last 5)
- Account status (active/banned)

WHEN a user views a profile of a banned user, THE system SHALL display:

- "[Banned User]" instead of username
- "User banned" status
- No posts or comments shown
- No subscription data
- Option to report if suspected of violation

WHEN a user views a profile of a suspended user, THE system SHALL display:

- "Suspended" status
- "Account temporarily suspended" message
- No posts or comments shown
- No subscription data
- No moderator status visible

WHEN a profile contains more than 100 posts, THE system SHALL:

- Implement pagination (50 per page)
- Allow sorting by: new, top
- Allow filtering by community

WHEN a profile contains more than 500 comments, THE system SHALL:

- Implement pagination (100 per page)
- Allow sorting by: new, top
- Allow filtering by community

WHEN a user's profile is viewed by a guest, THE system SHALL display:

- Username
- Karma tier badge (e.g., "Veteran")
- Join date
- Total posts
- Total comments
- No individual posts or comments visible

WHEN a user's profile is viewed by a member, the system SHALL display:

- All visible data as above
- No private moderation history
- No karma breakdown

WHEN a moderator views another user's profile, THE system SHALL display:

- All data visible to members
- Moderation history (number of reports, actions taken)
- IP address history (last 3 locations)

WHEN an admin views another user's profile, THE system SHALL display:

- All data visible to moderators
- Full moderation history
- All device fingerprints
- Complete account creation history

WHEN a user requests data export, THE system SHALL:

- Provide ZIP file containing:
  - All posts (with content, votes, timestamps)
  - All comments (with content, votes, timestamps)
  - Subscription list
  - Community moderator history
  - Karma history
  - IP login history
  - Moderation reports made
- All data anonymized with user's unique ID
- Export must be downloadable within 72 hours

### Report Inappropriate Content

WHEN a member reports content, THE system SHALL:

- Provide dropdown of violation categories:
  - Spam
  - Hateful speech
  - Harassment
  - Sexual content
  - Doxxing
  - Impersonation
  - Copyright infringement
  - False information
  - Other
- Require a reason (minimum 20 characters)
- Record reporter ID and timestamp
- Record content ID and type (post/comment)
- Record community ID
- Record IP address and device fingerprint for internal audit
- Hide content from non-moderators
- Queue review
- Display: "Your report has been submitted. Our moderators will review it."

WHEN a moderator reviews a report, THE system SHALL:

- Access full context: content, history, user karma, previous reports
- Validate trigger against moderation policy
- Choose one action:
  - Confirm and remove
  - Dismiss and notify reporter (reason)
  - Issue warning to user (log in profile)
  - Suspend user (temporary)
  - Ban user (permanent)
- Record decision, reason, and action
- Notify reporter
- Notify user
- Log in system audit trail

WHEN a report is valid and content removed, THE system SHALL:

- Apply karma penalty to user
- Record violation type in user's moderation history
- Mark user's future content for higher scrutiny
- Update reputation weight

WHEN a report is dismissed, THE system SHALL:

- Remove "Reported" flag
- Restore visibility
- Decrease reporter's "report score"
- Notify reporter: "Your report was dismissed as invalid. Repeated invalid reports may restrict your ability to report."

WHEN a user receives five reports across different content types, THE system SHALL:

- Trigger automatic administrative review
- Display: "Under Administrative Review" on profile
- Block all posting, commenting, and voting
- Notify all moderators in subscribed communities

WHEN a user is banned for violating guidelines, THE system SHALL:

- Remove all their content
- Display: "Account permanently banned for sustained violation of community guidelines"
- Prohibit re-registration
- Record in global moderation audit

WHEN a moderator removes a report (false positive), THE system SHALL:

- Remove from system
- Decrease reporter's report reliability score
- Send warning if pattern detected

WHEN a user appeals a moderation decision, THE system SHALL:

- Provide form to submit appeal (up to 1,000 words)
- Assign to independent moderator panel
- Review within 72 hours
- Notify of outcome
- Restore content if appeal accepted
- Document decision and rationale

WHEN a post is removed due to "impersonation", THE system SHALL:

- Notify all users who engaged (subscribers, voters, commenters)
- Block the user from creating any more communities
- Issue 30-day suspension
- Record in public moderation log

WHEN a post is removed due to "false information", THE system SHALL:

- Tag associated content with: "Content flagged as false information"
- Link to authoritative sources if available
- Reduce karma of creator by 15
- Notify user of correction
- Flag for future algorithmic review

WHEN a comment is removed for "harassment", THE system SHALL:

- Notify victim user with support resources
- Apply -10 karma to violator
- Place "High Risk User" tag on violator
- Assign moderator to monitor future community participation

WHEN a report is made about a post from a community with low-quality content (high percentage of removed posts), THE system SHALL:

- Notify community moderators
- Increase scrutiny on all future posts from the community
- Add "Quality Concern" marker on community listing
- Recommend moderator review for community governance

WHEN a report is made about a post from a high-karma user, THE system SHALL:

- Apply higher scrutiny (double-check against patterns)
- Require two moderator confirmations for removal
- Notify if removal is made
- Notify if claim is invalid
- Do NOT discount based on karma

WHEN a report is made about a comment that is already flagged for deletion, THE system SHALL:

- Do NOT add another report
- Display: "This comment is already under review."

## Business Process Workflows

### User Onboarding Journey

WHEN a guest visits the platform for the first time, THE system SHALL:

- Display homepage with trending communities
- Offer option to sign up or log in
- Display platform overview on landing

WHEN a guest signs up, THE system SHALL:

- Require email verification
- Award +50 karma on verification
- Display "Welcome to {platform}" modal with quick tour
- Recommend 3 communities based on common interests
- Enable immediate posting after verification

WHEN a user first creates a post, THE system SHALL:

- Display: "Your first post! Share your thoughts with the community."
- Suggest formatting tips
- Enable community subscription
- Provide feedback loop: "This community values thoughtful responses."

WHEN a user first comments, THE system SHALL:

- Display: "Welcome to the discussion! Your voice matters."
- Explain upvote/downvote mechanics
- Recommend engaging with others" comments
- Encourage following contributors

WHEN a user first votes, THE system SHALL:

- Display: "Your vote helps curate quality content."
- Explain anonymity of voting
- Encourage moderation of bad content
- Suggest reporting spam

WHEN a user first subscribes to a community, THE system SHALL:

- Display: "You're now part of {community}! New content will appear here."
- Suggest browsing existing posts
- Recommend contributing
- Notify of community rules

WHEN a user achieves 100 karma, THE system SHALL:

- Display badge: "Active member! You can now vote on comments."
- Suggest engaging more
- Encourage reading high-karma comments

WHEN a user achieves 500 karma, THE system SHALL:

- Display badge: "Respected user! You can now create your own community."
- Suggest starting own community
- Provide step-by-step creation guide

WHEN a user achieves 10,000 karma, THE system SHALL:

- Display badge: "Elder! You're eligible for moderator nomination." 
- Offer nomination process
- Suggest mentoring new users
- Notify of special privileges

### Content Lifecycle

WHEN a post is created:

1. User writes and submits
2. System validates constraints
3. System calculates initial score
4. System assigns post to community
5. System notifies subscribers
6. System displays in feed

WHEN a post receives votes:

1. User upvotes/downvotes
2. System recalculate score immediately
3. System calculate new hot score
4. System update karma for author
5. System update ranking
6. System update feed position

WHEN a comment is appended:

1. User replies to post
2. System validates constraints
3. System assigns parent-child relationship
4. System increase comment count
5. System award karma to commenter
6. System notify post author

WHEN a comment receives votes:

1. User upvotes/downvotes
2. System recalculate score immediately
3. System update karma for commenter
4. System update comment rank in thread
5. System notify commenter

WHEN a post is flagged:

1. User reports
2. System flag for moderation
3. System hide from non-moderators
4. System notify community mods
5. System log action
6. System track report frequency
7. System auto-flag if 3+ reports in 5m

WHEN a post is deleted:

1. User deletes
2. System replace with "[Deleted by author]"
3. System preserve votes and comments
4. System decrease post count

WHEN a moderator removes:

1. Moderator selects "remove"
2. System replace with "[Removed by moderator]"
3. System log: moderator ID, reason
4. System notify poster
5. System apply karma penalty
6. System log moderation history

### Moderation and Appeal Workflow

WHEN a report is submitted:

1. User selects violation type
2. User writes reason
3. System submits report
4. System hide content from public
5. System queue for review
6. System notify moderators

WHEN moderator reviews:

1. Moderator logs in
2. Moderator accesses review panel
3. Moderator views content context
4. Moderator consults moderation rules
5. Moderator selects action:
   - Approve and allow
   - Remove and warn
   - Remove and suspend user
   - Remove and ban
6. Moderator writes justification
7. System record decision
8. System notify reporter and creator
9. System update moderation history

WHEN user appeals:

1. User clicks "Appeal decision"
2. User writes appeal reason (1000 chars max)
3. System submit appeal to independent panel
4. System notify user: "Appeal received, processing in 72 hours."
5. Independent panel review (mod+admin)
6. Panel decides:
   - Uphold decision
   - Reverse decision
7. System notify user of outcome
8. If reversed:
   - Restore content
   - Remove moderation history
   - Notify community
9. If upheld:
   - Update appeal count
   - Send "Appeal Denied" notice

WHEN a moderator exceeds limits:

1. User reports moderator
2. System detect potential abuse
3. System notify admin
4. Admin reviews moderation history
5. Admin decides:
   - Remove moderator privileges
   - Issue warning
   - Suspend moderator
6. System notify moderators and affected community

### Karma Accumulation and Decay

WHEN a user consistently creates quality content:

1. Posts get upvotes
2. Comments get upvotes
3. Posts selected as "Top Post" → +2
4. Comments selected as "Best Comment" → +1
5. Karma increases daily
6. User reaches "Active Member" → 100
7. User reaches "Respected User" → 500
8. User reaches "Veteran" → 1,000

WHEN a user participates in moderation:

1. User reports spam
2. Report confirmed → +1 karma
3. User becomes moderator → karma preserved
4. User gains influence

WHEN a user is in a community for months:

1. User posts weekly
2. User comments daily
3. Content is upvoted regularly
4. Karma steadily increases
5. User reaches "Community Pillar" → 5,000

WHEN a user is inactive for 6 months:

1. System detect 180 days without login, posting, comment, or vote
2. System calculate 15% karma decay
3. System display: "You haven't been active for 6 months. Your karma will decrease 15% in 30 days unless you engage."
4. User logs back in
5. System cancel decay

WHEN a user is inactive for 24 months:

1. System detect 730 days without engagement
2. System calculate 50% karma decay
3. System display: "You haven't been active for 2 years. Your karma will decrease 50%."
4. User returns
5. System reduce karma by 50%
6. System notify: "Your karma has been reduced to reflect inactivity."

### Community Governance

WHEN a new community is created:

1. Member requests creation
2. System validate: karma ≥ 500, valid name
3. System create community with creator as moderator
4. System assign "Rules" post
5. System notify: "Your community is live!"

WHEN a community grows to 1,000 subscribers:

1. System display: "Your community has reached 1,000 members!"
2. System suggest: "Consider appointing additional moderators."
3. System open nomination process

WHEN a moderator resigns:

1. Moderator initiates resignation
2. System require selection of replacement
3. System notify: "Please select a new moderator."
4. System block resignation until replacement selected

WHEN a community receives 10 reports in a day:

1. System notify: "This community has received 10 reports today."
2. System flag for review
3. System limit posting to moderators only
4. System display: "Community under temporary review."

WHEN a community is featured:

1. Admin selects community
2. System verify: ≥100 subscribers, recent activity
3. System get moderator approval
4. System add to homepage carousel
5. System notify: "Your community has been featured!"

## Non-functional Requirements

### Performance Requirements

- Page load time: < 1.5s for 95% of users
- Vote processing: < 500ms real-time update
- Comment rendering: < 1s for 500-reply threads
- Search results: < 800ms for 100+ results
- Image upload: < 15s for 10 images
- API response time: < 200ms for 99% of requests
- Data throughput: 10,000 votes/minute, 5,000 comments/minute
- Concurrent users: 50,000

### Security and Privacy

- Data encryption at rest (AES-256)
- Data encryption in transit (TLS 1.3)
- JWT with 7-day expiration
- No personal data storage beyond account info
- Karma calculations use anonymous voting data
- Votes cannot be traced to users (even by admin)
- IP addresses stored only for fraud detection
- User email not exposed publicly
- No social graph data collection
- No ad tracking
- GDPR-ready data deletion

### Accessibility

- WCAG 2.1 Level AA compliance
- Keyboard navigation for all controls
- Screen reader compatibility
- Color contrast ratio ≥ 4.5:1
- Font size ≥ 16px
- Alt text for all images
- ARIA labels on interactive elements
- No reliance on color alone for meaning

### Scalability

- Horizontal scaling of service layers
- Vertical scaling of databases
- Connection pooling for PostgreSQL
- Redis caching for post/comment vote scores
- CDN for media assets
- Rate limiting to prevent DDoS
- Queue system for moderation reports
- Sharded user communities
- Database partitioning by time

## System Constraints

### Technical Limitations

- Maximum 10 images per post
- Maximum 100,000 characters in a post
- Maximum 10,000 comments per post
- Maximum 10,000 votes per post
- Maximum 10,000 karma per user
- Maximum 50 community subscriptions
- Maximum 5 communities per user (except admins)
- Maximum 5 levels of nested comments
- Maximum 100 votes per minute
- Maximum 20 URLs per post
- Maximum 30 characters in community name
- Maximum 300 characters in post title
- Maximum 10,000 characters in post content
- Maximum 5,000 characters in comment

### Compliance Requirements

- GDPR: Data Subject Access Requests processed within 72 hours
- COPPA: No data collection from users under 13
- CCPA: California user data rights enforced
- DMCA: Copyright takedown process implemented
- Section 230: Platform operates as distributor, not publisher
- No tracking identifiers (Google Analytics, Facebook Pixel)
- No behavioral advertising

### Data Retention Policies

- Posts: Retain indefinitely unless requested for deletion
- Comments: Retain indefinitely unless requested for deletion
- Votes: Retain indefinitely (even if content deleted)
- Moderation logs: Retain for 7 years
- User IP addresses: Retain for 30 days
- Account deletion: Immediate purge of all data
- Data export: User-requested, full dataset within 72 hours
- Audit trails: Immutable append-only storage

The system has been designed to ensure complete autonomy for communities, privacy for users, and integrity for the entire platform while remaining accessible, scalable, and compliant with international standards.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, API design, database schema, etc.) are at the discretion of the development team.*