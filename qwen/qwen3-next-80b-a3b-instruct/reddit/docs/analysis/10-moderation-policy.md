# Reddit-Like Community Platform Requirements

## Service Overview

This system is a Reddit-like community platform where users can create and join interest-based communities, share content, engage in discussions, and build reputation through community interactions. The platform enables decentralized moderation, user-driven content discovery, and reputation-based privileges. Built with enterprise-grade scalability and security in mind, the system supports concurrent users, real-time engagement, and comprehensive content governance.

## User Actors and Authentication

### Actor Definitions

- **Guest**: Unauthenticated user with read-only access to public content. Can view posts and comments but cannot interact with content, join communities, or create accounts.
- **Member**: Authenticated user with full interaction privileges. Can post content, comment, vote, subscribe to communities, earn karma, and report content.
- **Moderator**: Assigned Member with elevated privileges within a specific community. Can remove content, ban users, approve posts, and manage community settings. Cannot access other communities' content unless also a member.
- **Admin**: System-level operator with global administrative rights. Can access all communities, modify system-wide settings, reset user accounts, review moderator actions, and ban users from the entire system.

### Authentication Flow

WHEN a user visits the platform, THE system SHALL identify them as a Guest by default.

WHEN a Guest attempts to perform an action that requires authentication, THE system SHALL redirect them to the login/signup interface.

WHEN a user selects "Sign Up", THE system SHALL require:
- A unique username (alphanumeric, 3-20 characters)
- A valid email address (verified via confirmation link)
- A password (minimum 12 characters, containing at least one uppercase letter, one lowercase letter, one number, and one special character)

WHEN a user submits the registration form, THE system SHALL:
- Validate all input fields against format requirements
- Check username and email for uniqueness
- Encrypt the password using bcrypt with a cost factor of 12
- Generate a UUID-based confirmation token
- Store the user record in pending-verification state
- Send a personalized email with a time-limited (24-hour) verification URL
- Log the registration attempt with IP address and timestamp

WHEN a user clicks the verification link, THE system SHALL:
- Validate the token exists and is not expired
- Update the user record to active status
- Issue a JWT refresh token (expires in 30 days)
- Issue a JWT access token (expires in 15 minutes)
- Redirect the user to their profile

WHEN a user selects "Log In", THE system SHALL require:
- Username or email
- Password

WHEN credentials are submitted, THE system SHALL:
- Look up the user by username/email
- Verify the password hash matches
- Check account status is active
- Issue JWT refresh and access tokens
- Log successful login with device fingerprint

WHEN a user's access token expires, THE system SHALL:
- Accept the refresh token in an HTTP Authorization header
- Validate token signature and expiration
- Issue a new access token (15-minute expiry)
- Renew the refresh token if less than 7 days remain on its life

WHEN a user logs out, THE system SHALL:
- Invalidate the current refresh token
- Remove the JWT from client storage
- Clear session cookies

WHEN a user attempts to access a protected resource with an invalid or expired token, THE system SHALL:
- Return HTTP 401 Unauthorized
- Include WWW-Authenticate header with "Bearer error=invalid_token"

WHEN a user fails password login five times within 15 minutes, THE system SHALL:
- Lock the account for 30 minutes
- Send an alert email to the registered email address
- Record the attempted login with IP and timestamp

## Functional Requirements

### User Registration and Login

WHEN a new user attempts to register, THE system SHALL enforce:
- Username uniqueness across the platform
- Email address uniqueness and domain validation
- Password strength requirements (minimum 12 characters with complexity)
- Rate-limiting of registration attempts (5 attempts per IP per hour)
- CAPTCHA validation for suspicious patterns

WHEN a user attempts to log in, THE system SHALL permit authentication via:
- Username (case-insensitive)
- Email address (case-insensitive)

WHEN a user forgets their password, THE system SHALL provide a "Forgot Password" flow:
- User enters email address
- System validates email exists and is verified
- System generates one-time password reset token (UUID, 4-hour expiry)
- System sends reset link to user's email
- User clicks link and enters new password
- System validates new password meets strength requirements
- System updates password hash and invalidates all existing sessions

WHEN a user successfully logs in, THE system SHALL:
- Set HTTP-only, Secure, SameSite=Strict cookies for refresh token
- Store access token in client-side memory (not localStorage)
- Redirect to user's feed

WHEN a user's session times out, THE system SHALL:
- Automatically redirect to login page
- Preserve the target URL in query parameters for redirection after login

### Community System

WHEN a Member requests to create a community, THE system SHALL:
- Require a unique community name (alphanumeric and hyphens only, 3-50 characters)
- Require a description (minimum 50 characters, maximum 500)
- Require a title (maximum 100 characters)
- Automatically assign the creator as the first moderator
- Create a default set of community rules ("Be respectful", "Follow subreddit rules")
- Create a subscription record linking the creator to the community
- Generate a unique community ID in format: r/{community_name}

WHEN a Member attempts to subscribe to a community, THE system SHALL:
- Verify the community exists and is active
- Check that the user is not already subscribed
- Create a subscription record with timestamp
- Add the community to the user's list of subscribed communities
- Increase the community's subscriber count by one

WHEN a Member attempts to unsubscribe from a community, THE system SHALL:
- Verify the user is subscribed
- Delete the subscription record
- Decrease the community's subscriber count by one
- Clear any saved user preferences for that community

WHEN a Moderator attempts to change community settings, THE system SHALL permit:
- Editing community name, title, description, and rules
- Setting community visibility: public, restricted, or private
- Enabling/disabling post approval required for new users
- Enabling/disabling cross-posting from other communities
- Setting minimum karma threshold for posting
- Setting minimum karma threshold for commenting
- Selecting whether the community supports NSFW content
- Assigning additional moderators
- Removing moderators (but not the original creator)

WHEN a community is set to private, THE system SHALL:
- Hide the community from search results and discovery feeds
- Require explicit invitation from a moderator to join
- Allow only subscribers to view or interact with content

WHEN a community is set to restricted, THE system SHALL:
- Allow search visibility
- Require moderator approval for new subscriptions
- Allow all subscribers to view and interact with content

WHEN a community is set to public, THE system SHALL:
- Appear in search results and discovery feeds
- Allow any member to subscribe without approval
- Allow all subscribers to view and interact with content

WHEN a community has more than 10,000 subscribers, THE system SHALL automatically:
- Enable community analytics dashboard for moderators
- Allow custom emoji creation
- Enable advanced reporting analytics
- Recommend the community for "Featured Communities" listing

WHEN a community has been inactive for 6 months (no posts or comments), THE system SHALL:
- Mark the community as "archived"
- Hide it from most search and discovery surfaces
- Allow moderators to unarchive with one click
- Preserve all content and history

WHEN an Admin deactivates a community, THE system SHALL:
- Remove the community from all search and discovery indexes
- Prevent new subscriptions
- Retain all existing content
- Notify all subscribers with an email
- Allow the community to be reactivated within 30 days
- Permanently delete the community if not reactivated after 30 days

### Posting System

WHEN a Member creates a post, THE system SHALL permit:
- Text posts (minimum 20 characters, maximum 50,000)
- Link posts (URL must be valid, http/https)
- Image posts (JPG, PNG, GIF, WebP; maximum 20MB per image)
- Multiple images in a single post (maximum 5)

WHEN a user submits a text post, THE system SHALL:
- Validate minimum length (20 characters)
- Validate maximum length (50,000 characters)
- Parse and sanitize HTML (allow only basic formatting)
- Apply automatic link detection and preview generation

WHEN a user submits a link post, THE system SHALL:
- Validate URL format using RFC 3986
- Extract domain name and validate against known spam domains
- Attempt to fetch metadata (title, description, image) using Open Graph protocol
- If metadata fetch fails, show "Link preview unavailable"
- Prevent posting of URLs from blacklisted domains

WHEN a user submits an image post, THE system SHALL:
- Validate file type against allowed MIME types
- Validate file size (<= 20MB)
- Validate number of images (<= 5)
- Generate thumbnails at 300px, 800px, and 2000px widths
- Store original and thumbnails in cloud storage
- Apply image moderation scanning for explicit content using ML model
- Generate unique file paths using UUID

WHEN a user submits a post with both text and images, THE system SHALL:
- Ensure the text meets minimum length requirements
- Validate all images meet format and size requirements
- Associate each image with the post via reference IDs

WHEN a post contains more than 3 links, THE system SHALL:
- Mark the post with "Potential Spam" tag visible to moderators
- Reduce the post's initial karma score by 20%
- Require moderator approval before the post appears on the front page

WHEN a user attempts to post in a community with a minimum karma threshold, THE system SHALL:
- Verify the user's karma is equal to or exceeds the threshold
- Show an error message stating required karma level if threshold is not met

WHEN a post is submitted, THE system SHALL:
- Assign a unique post ID
- Set creation timestamp
- Set initial vote score to 0
- Set comment count to 0
- Record the author's user ID
- Record the target community ID
- Store the post content
- Apply immediate text moderation filters for profanity
- Queue for content moderation review
- Make visible to the community immediately if no moderation flag is raised

WHEN a post is flagged as potentially violating guidelines based on content analysis, THE system SHALL:
- Mark the post as "Under Review"
- Hide it from public view except for author and moderators
- Send a notification to community moderators
- Send a notification to system administrators if community has no active moderators

### Voting System

WHEN a Member votes on a post, THE system SHALL:
- Allow upvote or downvote only
- Allow one vote per user per content item
- Prevent users from voting on their own content
- Record vote type (up/down) and timestamp
- Immediately update the post's net vote score
- Record the vote in user voting history

WHEN a Member changes their vote on a post, THE system SHALL:
- Replace the existing vote with the new one
- Adjust the post's net vote score by 2x the previous vote value
- Update the timestamp on the vote record

WHEN a Member attempts to vote on a content item with an invalid vote direction or on non-existent content, THE system SHALL:
- Return HTTP 400 Bad Request
- Log the invalid attempt

WHEN a Member attempts to vote more than 50 times in 1 minute, THE system SHALL:
- Temporarily block voting privileges for 15 minutes
- Send a warning message: "You're voting too fast. Please slow down."
- Log the attempted behavior

WHEN a post receives more than 100 votes total, THE system SHALL begin applying vote manipulation detection algorithms:
- Identify clusters of identical vote patterns across multiple users
- Detect coordinated upvoting/downvoting from same IP ranges
- Flag suspicious votes for moderator review
- Apply manual review queue for posts with detected manipulation
- Calculate confidence score for manipulation detection
- If confidence > 85%, reverse all affected votes

WHEN a post's total votes exceed 1,000 and the ratio of upvotes/downvotes is > 0.95, THE system SHALL:
- Display a "Most Upvoted" badge on the post
- Automatically elevate the post to top of community and front page
- Allow community administrators to manually override this status

WHEN a post's total votes exceed 1,000 and the ratio of upvotes/downvotes is < 0.05, THE system SHALL:
- Display a "Most Downvoted" badge on the post
- Automatically hide the post from community view
- Apply additional moderation review
- Notify the author with explanation

WHEN a user upvotes a post by a community they subscribe to, THE system SHALL:
- Increase their karma by 1 point

WHEN a user downvotes a post by a community they subscribe to, THE system SHALL:
- Decrease their karma by 1 point

WHEN a user upvotes a comment by a community they subscribe to, THE system SHALL:
- Increase their karma by 0.5 points

WHEN a user downvotes a comment by a community they subscribe to, THE system SHALL:
- Decrease their karma by 0.5 points

THROUGHOUT, THE system SHALL:
- Never allow a user to vote on content they authored
- Never allow anonymous votes
- Never allow multiple votes from same user
- Never allow vote manipulation

### Comment System

WHEN a Member leaves a comment on a post, THE system SHALL:
- Allow text comments (minimum 1 character, maximum 10,000 characters)
- Allow nested replies (up to 5 levels deep)
- Allow comment edits for 5 minutes after creation
- Allow comment deletions at any time
- Allow images in comments (same format and size restrictions as post images)
- Apply the same moderation filters as posts

WHEN a user leaves a comment, THE system SHALL:
- Assign a unique comment ID
- Record the comment text
- Record the timestamp
- Record the parent post ID
- Record the author's user ID
- Set initial vote score to 0
- Set depth level to 1
- Calculate comment thread ID based on parent

WHEN a user replies to a comment, THE system SHALL:
- Only allow replies to comments that are at depth < 5
- Set the new comment's depth to parent_depth + 1
- Set the parent thread ID to the original post's thread
- Update the parent comment's reply count
- Increment the post's comment count

WHEN a user edits a comment, THE system SHALL:
- Allow edits only within 5 minutes of creation
- Record the edit history with timestamp and original content
- Append "[Edited]" tag to the comment
- Preserve original timestamp as immutable
- Notify followers if the comment was already replied to

WHEN a user deletes a comment, THE system SHALL:
- Soft-delete the comment content (replace with "[Deleted]")
- Preserve metadata (ID, timestamp, parent, etc.)
- Reduce parent comment's reply count
- Reduce post's total comment count
- Update comment tree structure
- Preserve visibility to moderators

WHEN a comment receives more than 50 replies, THE system SHALL:
- Implement lazy-load pagination in the UI
- Automatically collapse threads with > 100 replies
- Display "View All Replies" button

WHEN a comment is flagged as potentially violating guidelines, THE system SHALL:
- Mark the comment as "Under Review"
- Hide it from public view except for author and moderators
- Send notification to moderators
- Escalate to administrators if community has no active moderators

WHEN a comment is deleted by a moderator, THE system SHALL:
- Record the moderator ID
- Record the reason for deletion
- Preserve the user's comment history
- Notify the user via email with explanation

WHEN a user's comment receives 5 or more downvotes within 30 minutes, THE system SHALL:
- Automatically hide the comment from public view
- Mark it as "Hidden by Community"
- Display "Hidden by community" instead of comment text
- Notify user that their comment was hidden and explain why
- Preserve the comment for moderator review

WHEN a comment is hidden due to downvotes, THE owner may unhide it by:
- Editing the comment to improve quality
- Clicking "Appeal Visibility" button
- System re-evaluates based on new content and recent voting patterns
- If approval threshold reached, comment is restored

### Karma System

WHEN a user is created, THE system SHALL assign them an initial karma of 0.

WHEN a comment or post earns an upvote, THE system SHALL:
- Increase the author's karma by +1 for post upvotes
- Increase the author's karma by +0.5 for comment upvotes

WHEN a comment or post receives a downvote, THE system SHALL:
- Decrease the author's karma by -1 for post downvotes
- Decrease the author's karma by -0.5 for comment downvotes

WHEN a post is deleted, THE system SHALL:
- Subtract the karma earned from all votes on that post
- Add back the karma if the post was upvoted by the user

WHEN a comment is deleted, THE system SHALL:
- Subtract the karma earned from all votes on that comment
- Add back the karma if the comment was upvoted by the user

WHEN a user receives a penalty for violating guidelines, THE system SHALL:
- Reduce their karma by a multiplier based on penalty tier:
  - Tier 1: -10 points
  - Tier 2: -50 points
  - Tier 3: -100 points and reset to 0
  - Tier 4: -1000 points and reset to 0

WHEN a user exceeds 500 karma, THE system SHALL:
- Unlock ability to create communities
- Add an "Experienced Contributor" badge to their profile

WHEN a user exceeds 1,000 karma, THE system SHALL:
- Unlock ability to suggest new communities for platform feature
- Add an "Elite Contributor" badge to their profile

WHEN a user exceeds 5,000 karma, THE system SHALL:
- Become eligible for moderator nomination in any community
- Add a "Veteran Member" badge to their profile

WHEN a user exceeds 10,000 karma, THE system SHALL:
- Qualify for platform-level "Trusted Community Member" status
- Receive automated invitation to join moderation team
- Add a "Legendary Contributor" badge to their profile

WHEN a user's karma drops below 0, THE system SHALL:
- Apply a "Negative Reputation" flag
- Display warning message: "Your karma is negative. Avoid violations to restore your standing."

WHEN a user's karma remains negative for 30 days, THE system SHALL:
- Temporarily revoke posting privileges until karma is restored to positive
- Send a reminder email

WHEN a user's karma increases over time, THE system SHALL:
- Calculate daily karma growth rate
- Recommend communities with similar interests based on karma sources
- Suggest moderation opportunities as karma increases

### Content Discovery and Sorting

WHEN a user opens a community feed, THE system SHALL provide four sorting options:

#### Hot

WHEN sorted by "Hot", THE system SHALL calculate a post's score using:

- Base score = upvotes - downvotes
- Age penalty = (current_time - post_time) / 3600
- Engagement multiplier = 3x comment count / (log10(upvotes + downvotes) + 1)
- Final score = base_score * exp(age_penalty) * engagement_multiplier
- Sort posts descending by final score

WHEN a post is newer than 1 hour, THE system SHALL apply no age penalty

WHEN a post receives its first 10 votes, THE system SHALL receive an artificial boost multiplier of 1.5

WHEN a post has received more than 1,000 votes, THE system SHALL reduce the impact of engagement multiplier by 50%

#### New

WHEN sorted by "New", THE system SHALL:
- Sort posts by creation timestamp descending
- Ignore vote counts completely

#### Top

WHEN sorted by "Top", THE system SHALL:
- Sort posts by total upvotes descending
- Use 24-hour, 7-day, 30-day, and all-time filters
- For each time window, calculate total upvotes within period
- Display top posts according to selected time window

#### Controversial

WHEN sorted by "Controversial", THE system SHALL calculate:

- Controversy score = max(upvotes, downvotes) / (upvotes + downvotes + 1)
- Filter for posts with at least 50 total votes
- Sort descending by controversy score

WHEN a post has a controversy score > 0.9 (e.g., 49 upvotes, 51 downvotes), THE system SHALL:
- Display a "Highly Controversial" badge
- Auto-hide content by default with "Show Content" button
- Require users to click "Show" to view

WHEN a user selects "Top" with time filter of "All Time", THE system SHALL:
- Limit results to top 100 posts per community
- Cache the results for 2 hours
- Re-calculate only when post reaches thresholds (10,000+ votes)

WHEN a user searches within a community, THE system SHALL:
- Index post titles and content (plaintext)
- Apply tokenization and stemming
- Match partial words
- Sort results by relevance (TF-IDF weighted)
- Include posts from subscribed communities if in global search

WHEN a user views the homepage, THE system SHALL:
- Show a personalized feed of posts from subscribed communities
- Order posts by "Hot" ranking
- Prioritize active communities (updated in last 4 hours)
- Apply community weighting (popularity × engagement)
- Randomize posts from low-engagement communities to increase exposure

WHEN a user navigates to the "Trending" page, THE system SHALL:
- Calculate trending score for each community:
  - Posts per hour × average upvote rate
  - New subscribers per day
  - Comment activity (replies/comments per hour)
- Show top 20 communities by trending score
- Update every 5 minutes

### User Profiles

WHEN a user views their own profile, THE system SHALL display:

- Username
- Karma score
- Badges earned
- Total posts
- Total comments
- Date joined
- List of subscribed communities
- List of recent posts and comments (by creation date)
- List of received upvotes and downvotes in past 30 days
- Link to notification preferences

WHEN a user views another user's profile, THE system SHALL display:

- Username
- Karma score
- Badges earned
- Total posts
- Total comments
- Date joined
- List of subscribed communities
- List of recent posts and comments (by creation date)
- If karma < 0, show "[Negative Karma]" warning
- If user is blocked or banned, show "[Account Suspended]"
- Hide exact posting history if user has privacy settings enabled

WHEN a user has over 100 total posts, THE system SHALL:
- Display a "Top Communities" section listing their top 5 most active communities
- Show distribution chart of posts by community
- Calculate post ratio per community

WHEN a user has received over 1,000 votes total, THE system SHALL:
- Display "Most Liked Content" section
- List top 3 posts and comments by total upvotes

WHEN a user has received over 500 downvotes total, THE system SHALL:
- Display "Least Liked Content" section
- List bottom 3 posts and comments by downvote ratio

WHEN a user has moderated a community, THE system SHALL:
- Display "Moderator of" section with link to community
- Show moderation actions summary (posts removed, bans issued)
- Show percentage of their moderated posts that were appealed and overturned

WHEN a user is banned from a community, THE system SHALL:
- Display "Banned from: [community name]" on their profile
- Hide all their contributions from that community in public view

WHEN a user is system-banned, THE system SHALL:
- Show "Account Permanently Banned" on their profile
- Hide all posts and comments
- Prevent access to their profile except by Admin

### Moderation and Reporting

WHEN a user identifies content that violates community guidelines, THE system SHALL provide a prominent "Report" button on all posts and comments.

WHEN a user clicks the "Report" button, THE system SHALL open a modal with predefined violation categories and an optional free-form comment field.

THE system SHALL allow users to select only ONE primary violation category from defined options.

WHEN a report is submitted, THE system SHALL timestamp the report and assign it a unique identifier.

THE system SHALL immediately hide the reported content from public view for all users except the reporter and moderators.

WHILE content is under review, THE system SHALL display a banner saying "This content is under moderation review" to all non-moderator users.

THE system SHALL send an email notification to all moderators of the community where the content was posted.

THE system SHALL route the report to the first available moderator in the community's moderator list.

IF a community has no active moderators, THEN THE system SHALL escalate the report to system administrators.

WHERE a user submits five or more reports within one hour, THEN THE system SHALL temporarily lock their reporting privileges for 24 hours.

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

WHEN a user's content is determined to violate guidelines, THE system SHALL apply penalties based on the severity and frequency of violations:

### Tier 1: First-time minor violation (e.g., spam, one-time inappropriate comment)
- THE system SHALL remove the violating content
- THE system SHALL issue a warning message to the user with a link to community guidelines
- THE system SHALL place the user on a 24-hour temporary suspension from posting and commenting

### Tier 2: Repeated minor violations or single moderate violation (e.g., harassment, misinformation)
- THE system SHALL remove the violating content
- THE system SHALL issue a permanent ban from posting in one specific community
- THE system SHALL place the user on a 7-day temporary suspension from all posting and commenting
- THE system SHALL reduce the user's karma by 50 points

### Tier 3: Severe or repeated violations (e.g., hate speech, threats, doxxing)
- THE system SHALL remove the violating content
- THE system SHALL permanently ban the user from all communities
- THE system SHALL apply a 30-day system-wide suspension from all activity
- THE system SHALL reduce the user's karma to zero
- THE system SHALL notify law enforcement if illegal activity is detected

### Tier 4: System-level abuse (e.g., automated bots, mass reporting abuse)
- THE system SHALL permanently ban the user account
- THE system SHALL ban associated IP addresses and device fingerprints
- THE system SHALL initiate legal investigation procedures
- THE system SHALL delete all content created by the user
- THE system SHALL permanently prevent account re-registration under any identifier

WHEN a user receives a penalty, THE system SHALL record the penalty type, date, duration, and reason in their account history.

WHEN a user is suspended, THE system SHALL ensure the suspension applies to all devices and authentication methods.

THE system SHALL notify suspended users via email with details of the suspension, duration, and appeal rights.

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


## System Integrity and Non-Functional Requirements

WHEN a user performs any action, THE system SHALL record a detailed audit log:
- User ID
- Action type
- Target ID
- IP address
- Timestamp
- Device fingerprint
- Session ID
- Any relevant metadata

WHEN a user's data is modified or deleted, THE system SHALL maintain immutable historical records.

WHEN a post or comment is deleted, THE system SHALL never truly delete the data from storage, only mark it as soft-deleted.

WHEN a report, penalty, or moderation action occurs, THE system SHALL make its record permanently immutable.

WHEN any action modifies karma, THE system SHALL recalculate the entire history and log the delta.

WHEN any data is accessed, THE system SHALL log who accessed it for audit purposes.

THE system SHALL prevent any direct database edits by administrators without full audit trail.

THE system SHALL enable automatic data export for law enforcement requests.

WHEN a user requests the deletion of their account, THE system SHALL:
- Delete personal identifying information (email, username, profile picture)
- Anonymize all history and content (replace with "[deleted]" username)
- Retain audit logs and moderation records for legal compliance
- Remove from all subscription lists
- Permanently invalidate all JWT tokens
- Send confirmation email

WHEN any data processing occurs, THE system SHALL comply with international privacy laws including GDPR and CCPA.

WHEN the system detects unusual traffic patterns, THE system SHALL activate DDoS protection.

WHEN the system is under attack, THE system SHALL prioritize core functionality over analytics.

THE system SHALL have 99.95% uptime SLA.

THE system SHALL support 10,000 concurrent users without degradation.

THE system SHALL respond to content requests in under 200ms 95% of the time.

THE system SHALL have automated failover for all database instances.

WHEN an email is sent to a user, THE system SHALL validate their email preference settings before delivery.

WHEN a scheduled task runs, THE system SHALL log success or failure with stack trace on error.

WHEN any system component fails, THE system SHALL notify admins via email with error details.

THE system SHALL provide a status page showing uptime, recent incidents, and scheduled maintenance.

THE system SHALL have automated daily backups with 7-day retention.

WHEN a new version of the system is deployed, THE system SHALL perform zero-downtime deployment with rollback capability.

WHEN a user submits content, THE system SHALL apply spam filters and ML-based content moderation before approval.

WHEN a moderator takes action, THE system SHALL require justification that is stored as immutable metadata.

THE system SHALL ensure all data at rest is encrypted.

THE system SHALL ensure all data in transit is encrypted via TLS 1.3.

THE system SHALL provide audit trails for all data access, modification, and deletion operations.

THE system SHALL permit users to download their complete data history in JSON format.

THE system SHALL comply with all applicable local, state, and federal regulations regarding online platforms and user-generated content.

