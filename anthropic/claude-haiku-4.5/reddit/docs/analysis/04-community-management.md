# Community Management and Governance Specification

## Overview

The community management system enables users to create, configure, and govern communities where content sharing and discussions occur. Communities are the fundamental organizational structure of the platform, allowing users to form groups around shared interests. This specification defines how communities are created, managed, configured, and governed through moderator and administrative actions.

## 1. Community Creation and Initialization

### 1.1 Who Can Create Communities

WHEN a member-level user initiates community creation, THE system SHALL display the community creation form and accept all required inputs.

WHEN a guest user attempts to create a community, THE system SHALL deny the request with HTTP 401 Unauthorized and prompt the user to register or login.

WHEN a moderator or administrator initiates community creation, THE system SHALL apply the same permission checks as member users, granting them the ability to create communities with identical capabilities.

THE system SHALL require new community creators to have at least 1 karma score earned through platform activity (creating posts, receiving upvotes, or participating in communities) before allowing community creation.

### 1.2 Community Creation Requirements

Community creation requires the following mandatory information:

**Community Display Name**
- User-readable name of the community (e.g., "Technology Trends", "Photography Tips", "Local News")
- Length: Minimum 3 characters, maximum 100 characters
- May include spaces, numbers, and special characters
- NOT required to be globally unique (multiple communities can have same name)
- Must contain at least one alphanumeric character
- HTML tags are automatically stripped from the input

**Community Identifier (Handle)**
- Unique, URL-safe identifier for the community (e.g., "tech_trends", "photography_tips", "local_news")
- Format: Lowercase letters (a-z), numbers (0-9), and underscores (_) only
- Length: Minimum 3 characters, maximum 32 characters
- MUST be globally unique across entire platform
- Used in URLs: `communityplatform.com/r/[identifier]`
- Cannot be changed after community creation (permanent identifier)

**Community Description**
- Detailed explanation of the community's purpose, scope, and culture
- Length: Minimum 10 characters recommended, maximum 500 characters
- Optional field but highly recommended for community discovery
- Supports basic text formatting (plain text preferred)
- Used in community search and discovery feeds
- Should explain what topics are welcome and what the community values

**Community Category**
- Primary topic classification for the community
- Mandatory field; users must select from predefined list
- Available categories:
  - Technology, Business, Finance, Investing
  - Entertainment, Movies, Television, Music, Gaming
  - Sports, Health & Fitness, Lifestyle
  - News & Politics, Science, Education
  - Travel, Food & Cooking, Home & Garden
  - Hobbies & Crafts, Pets & Animals, Cars & Vehicles
  - Community & Culture, Other
- Category used for community discovery, trending lists, and content recommendations
- Can be changed by community creator at any time after creation

**Optional Community Fields**

THE system SHALL allow specification of optional fields at community creation time:

- **Community Rules**: Initial set of community-specific guidelines
  - Presented as numbered list
  - Each rule up to 200 characters
  - Maximum 10 rules per community
  - Editable after creation
  - Displayed to all community members on community page

- **Community Icon/Avatar**: Optional image representing the community
  - Accepted formats: JPEG, PNG, WebP
  - Maximum file size: 2 MB
  - Minimum dimensions: 100x100 pixels
  - Recommended: Square aspect ratio (1:1)
  - Displayed next to community name throughout platform

- **Community Banner Image**: Optional large background image
  - Accepted formats: JPEG, PNG, WebP
  - Maximum file size: 5 MB
  - Recommended dimensions: 1200x300 pixels (aspect ratio 4:1)
  - Displayed at top of community page
  - Optional; platform provides default if not specified

### 1.3 Community Creation Validation and Duplicate Prevention

WHEN a user submits a community creation request, THE system SHALL validate all required fields are present and properly formatted:

- IF community identifier format is invalid (contains uppercase, special characters, or spaces), THEN THE system SHALL return HTTP 400 Bad Request with message "Community identifier must contain only lowercase letters, numbers, and underscores, and be 3-32 characters long"

- IF community identifier is already taken, THEN THE system SHALL return HTTP 409 Conflict with message "This community identifier is not available" and suggest up to 5 similar available alternatives (e.g., if "tech_news" taken, suggest "tech_news2", "tech_news_daily", etc.)

- IF display name is too short (< 3 characters) or too long (> 100 characters), THEN THE system SHALL return HTTP 400 Bad Request specifying character count requirements

- IF description exceeds 500 characters, THEN THE system SHALL return HTTP 400 Bad Request "Description must not exceed 500 characters"

- IF community creator's karma is below 1, THEN THE system SHALL return HTTP 403 Forbidden "You need at least 1 karma to create a community. Earn karma by posting and receiving upvotes"

THE system SHALL check for near-duplicate community identifiers within the same category:

- IF a community with >80% name similarity exists in the same category created within last 30 days by different user, THEN THE system SHALL display a warning "A similar community already exists: r/[existing_community]. Please verify this is a new community you want to create" but allow creation to proceed

### 1.4 Community Creation Completion and Creator Assignment

WHEN community creation is successfully completed, THE system SHALL:

1. Create new community record with:
   - Unique community ID (system-generated UUID)
   - Display name as provided
   - Identifier as provided
   - Description as provided
   - Category selection
   - Creation timestamp (UTC)
   - Creator user ID
   - Status: "active"
   - Default settings (public community, all members can post, no approval required)

2. Assign creator role:
   - THE creator is automatically assigned the "Community Creator" moderator role
   - THE creator has all moderator permissions with no restriction
   - THE creator can transfer ownership to another member at any time

3. Update creator stats:
   - Increment creator's karma by 10 points (reward for creating community)
   - Increment creator's "communities created" count
   - Add community to creator's moderated communities list

4. Initialize default community settings:
   - Visibility: Public (posts visible to all users)
   - Post creation: Open to all members
   - Moderation: No approval required for posts
   - Comment policy: Open to all community members
   - Voting: Enabled for all members

5. Perform initialization tasks:
   - Automatically subscribe creator to their new community
   - Create moderation queue for the community
   - Initialize community audit trail
   - Store community creation in platform-wide audit log
   - Send confirmation email to creator with community URL and moderator tips

6. Return HTTP 201 Created with:
   - Community ID
   - Community URL (e.g., "https://communityplatform.com/r/community_identifier")
   - Confirmation message "Community created successfully"
   - Link to community page and settings

THE system SHALL record the community creation timestamp, creator user ID, and all initial settings in an immutable audit trail that cannot be modified or deleted.

## 2. Community Settings and Configuration

### 2.1 Visibility and Access Control

Communities can be configured with different visibility and access levels:

**Public Communities**

THE public community configuration means:
- THE community and its content are visible to all users (guests, members, moderators, administrators)
- THE community appears in community search results and discovery feeds
- THE community's posts and comments are readable by all users without subscription requirement
- THE community's posts and comments may be indexed by search engines
- Guests can view public posts and comments without authentication
- Guests cannot create posts, comments, or vote (must register first)

WHEN a guest user visits a public community, THE system SHALL:
- Display community page with posts and comments
- Show "Subscribe" button to join community
- Show login/registration prompts encouraging participation
- Allow viewing of all public posts and comments without authentication

**Private Communities**

THE private community configuration means:
- THE community is only visible to subscribed members
- THE community does NOT appear in search results or discovery feeds
- THE community's posts and comments are NOT readable by non-members or guests
- THE community requires explicit approval for new member access
- Only members can view community content and participate

WHEN a guest or non-member user attempts to access a private community, THE system SHALL:
- Deny access and return HTTP 403 Forbidden
- Display message "This community is private. To join, request membership or ask the community creator for an invitation"
- Provide option to request membership (if community allows requests)
- NOT reveal existence of private community to non-members (404 behavior optional)

WHEN a member attempts to join a private community, THE system SHALL:
- Create membership request if auto-approval is not enabled
- Require moderator approval before access is granted
- Display "Pending" status while request is under review
- Notify moderators of pending membership requests

### 2.2 Community Member Posting Permissions

Communities can restrict who is allowed to create posts through multiple permission levels. Community creators configure this setting in community settings:

**Open to All Members** (Most permissive)
- THE community allows all subscribed members to create posts
- All post types (text, link, image) are allowed
- No approval or karma requirements
- Members can post immediately upon subscription
- Default setting for new communities

**Restricted - Moderators Only**
- THE community restricts post creation to moderators only
- Regular members CAN comment on existing posts
- Regular members CANNOT create new posts
- Moderators retain full posting privileges
- Useful for curated news or educational communities

**Restricted - Approved Members Only**
- THE community restricts post creation to explicitly approved members
- WHEN a member attempts to create a post, THE system SHALL queue the post for moderator approval
- THE post is NOT visible to other members until approved
- THE member receives notification when post is approved or rejected
- Approved members may create multiple posts
- Useful for preventing spam or low-quality posts

**Restricted - Karma or Account Age Requirement**
- THE community enforces minimum user karma (e.g., 100 points) OR minimum account age (e.g., 30 days)
- Community creator can select either karma OR account age OR both
- WHEN a member who does not meet requirement attempts to post, THE system SHALL:
  - Display error message "You must have [100 karma] to post in this community"
  - Show current user karma and remaining requirement
  - Suggest ways to earn karma (posting, receiving upvotes)
  - Reject post creation and return HTTP 403 Forbidden
- Helpful for preventing spam from new accounts while encouraging community participation

### 2.3 Community Content Restrictions

Communities can restrict the types of content allowed to maintain community quality and focus:

**Post Type Restrictions**

Community creators configure allowed post types from these options:
- **All Types Allowed** (default): Text posts, link posts, and image posts all permitted
- **Text Only**: Prohibits links and images; members can only create text-based posts
- **Text and Images**: Allows text and images but prohibits external links
- **Text and Links**: Allows text and external links but prohibits embedded images
- **Images Only**: Prohibits text and links; members can only post images with captions

WHEN a member attempts to create a post type that is not allowed, THE system SHALL:
- Reject the post with HTTP 400 Bad Request
- Display error message "This community only allows [text and images] posts. [Image posts are not permitted]. Please revise your post type"
- Return to post creation form with user's content preserved

**External Link Domain Restrictions** (Advanced feature)

WHERE community settings enable this, THE system SHALL restrict external links to specific domains:
- Community creator can specify allowed domains (e.g., github.com, youtube.com)
- Links to other domains are filtered or flagged
- Useful for tech communities wanting only GitHub links, or video communities wanting only YouTube links

WHEN a member attempts to post a link to a restricted domain, THE system SHALL:
- IF domain is in allowlist, allow post normally
- IF domain is NOT in allowlist, flag post for moderator review or reject based on community settings

**Hashtag Requirements**

WHERE community settings require tagging, THE system SHALL:
- Require all posts include at least one tag from community-defined tag list
- Display tag selection interface when creating post
- Examples: #announcement, #discussion, #help, #howto, #news

WHEN a member submits post without required tags, THE system SHALL:
- Display error "Please add at least one tag to categorize your post"
- Prevent post submission until tags are added

### 2.4 Community Moderation Settings

Communities can configure how moderation is performed:

**Post Approval Workflow**

WHERE post approval is enabled, THE system SHALL:
- Require moderator approval before new posts are visible
- Display posts only to post creator and moderators while pending review
- Notify moderators of pending posts requiring review
- Show "Pending Approval" indicator to post creator
- Allow moderator to approve (publish immediately) or reject (permanently delete)

WHEN a moderator rejects a pending post, THE system SHALL:
- Notify member of rejection with optional reason message
- Allow member to revise and resubmit post if desired
- Log rejection in community moderation records

**Comment Moderation Settings**

Community creators can configure comment moderation:
- **Allow All Comments**: Comments immediately visible (default)
- **Approve All Comments**: All comments require moderator approval
- **Smart Approval**: Auto-approve comments from high-karma members; flag others for review
- **Strict Mode**: Aggressively filter comments for toxicity and spam

WHERE smart approval is configured, THE system SHALL:
- Auto-approve comments from members with karma above threshold (configured by creator)
- Flag comments from lower-karma members for moderator review
- Display flagged comments only to post creator and moderators

**Toxicity and Spam Auto-flagging**

THE system SHALL automatically flag content for human review if:
- Post/comment contains excessive profanity or slurs
- Post/comment contains suspicious external links or shortened URLs
- Post/comment matches spam pattern signatures (repeated content, keyword stuffing)
- Post/comment exhibits harassment patterns (aggressive tone, personal attacks)

WHEN content is auto-flagged, THE system SHALL:
- Display to moderators in moderation queue
- Remain visible to users while under review (unless community requires pre-approval)
- Allow moderator quick-action buttons: Approve, Remove, or Warn User

### 2.5 Community Display and Default Sorting

**Default Post Sort Order**

WHEN members visit the community, THE system displays posts sorted by the community's configured default:
- **Hot** (default): Shows trending posts combining engagement and recency
- **New**: Shows most recently created posts first
- **Top**: Shows highest-voted posts
- **Controversial**: Shows most polarizing posts

THE community creator or senior moderators can change default sort at any time. THE change applies only to future visits; users can always override default for their session.

**Post Archival and Visibility Timeline**

Community creator can configure post visibility timeline:
- Posts remain prominently visible for 6 months (default, configurable 1-12 months)
- After timeline expires, posts are archived but remain accessible via search and user history
- Archived posts appear in "Old Posts" section with reduced visibility
- Archived posts can still receive votes and comments
- Useful for keeping community feed focused on recent discussions

### 2.6 Community Settings Modification and Access Control

**Who Can Modify Community Settings**

THE community creator SHALL have full authority to modify any community settings at any time:
- Can change community name, description, category, rules
- Can change visibility (public/private)
- Can change post creation permissions
- Can enable/disable post and comment approval
- Can transfer ownership to another member
- Can delete the community

THE senior moderator SHALL have authority to modify certain community settings:
- Can change community description and rules
- Can enable/disable post/comment approval and toxicity filtering
- CANNOT change community visibility (public/private) - creator only
- CANNOT change core posting permissions - creator only
- CANNOT delete community - creator only

THE junior moderator SHALL NOT modify community settings

THE platform administrator SHALL have authority to modify any community settings if needed for:
- Policy enforcement
- Compliance with regulations
- Emergency intervention (security threats, illegal content)
- Administrator modifications trigger notifications to community creator explaining the change

**Setting Change Recording and Audit**

WHEN a community setting is modified, THE system SHALL:
- Record the change in immutable audit trail with:
  - Timestamp (UTC)
  - User ID who made change
  - Setting name and previous value
  - New value
  - Moderator role of user making change
- Notify all senior moderators of setting changes made by community creator or admins
- Log change in platform-wide audit log for administrator review

**Cascading Effects of Settings Changes**

WHEN certain settings are changed, THE system SHALL apply cascading effects:

- IF visibility changes from private to public:
  - All existing posts become visible to public
  - Community becomes searchable
  - Existing members remain subscribed
  - Notification sent to all members about visibility change

- IF visibility changes from public to private:
  - Posts become hidden from public view
  - Community removed from search results
  - Existing members remain subscribed
  - New members cannot join unless approved
  - Notification sent to all members

- IF post creation changes from "all members" to "moderators only":
  - Existing member posts remain visible
  - New posts from members are rejected
  - Notification sent to members
  - Posts queued for member creation are rejected

- IF approval workflow is disabled:
  - Pending posts are immediately published
  - Members are notified of approval of pending posts

## 3. Community Membership and Subscription

### 3.1 Subscribe to Communities

WHEN a member clicks the "Subscribe" button on a public community page, THE system SHALL:
- Immediately create subscription relationship between member and community
- Add community to member's subscribed communities list
- Increment community's subscriber count by one
- Display "Unsubscribe" button going forward
- Send confirmation message "You have subscribed to r/[community_name]"

WHEN a member subscribes to a community, THE system SHALL:
- Add community's posts to member's personalized home feed
- Display community in member's "My Communities" sidebar
- Enable post and comment creation in that community (subject to community posting restrictions)
- Allow member to configure notification preferences for that community

WHEN a guest user attempts to subscribe, THE system SHALL:
- Deny request and return HTTP 401 Unauthorized
- Display message "You must be logged in to subscribe to communities"
- Provide login and registration links

THE system SHALL track subscription relationships for analytics:
- Display subscriber count on community page
- Track new subscription rate for growth metrics
- Identify trending communities by subscription velocity

### 3.2 Private Community Subscription and Membership Approval

FOR private communities, THE subscription process includes approval:

WHEN a member requests to join a private community, THE system SHALL:
- Display "Request Membership" button instead of "Subscribe"
- Create membership request when member clicks button
- Queue request for moderator review

**Membership Request Submission**

THE membership request form SHALL allow:
- Optional message from requester (up to 200 characters) explaining why they want to join
- Display of requester's: username, join date, karma score, recent activity

WHEN moderator receives membership request, THE system SHALL display:
- Requester's full profile information
- Join date and account age
- Karma score and breakdown (post karma, comment karma)
- Recent posts and comments (last 5)
- Community rules they would be joining
- Quick-action buttons: Approve or Deny

**Membership Approval Workflow**

WHEN moderator clicks "Approve", THE system SHALL:
- Complete subscription immediately
- Notify member "Your membership request to r/[community] was approved"
- Remove request from queue
- Member can now view, post, and comment in community

WHEN moderator clicks "Deny", THE system SHALL:
- Reject membership request
- Notify member "Your membership request to r/[community] was denied"
- Allow member to reapply after 30 days
- Log denial reason (optional moderator note, not shown to member)

**Auto-Approval Configuration**

COMMUNITY creators can configure auto-approval criteria:
- Auto-approve members with karma above threshold (e.g., auto-approve karma > 500)
- Auto-approve accounts older than specified days (e.g., auto-approve > 30 days old)
- Auto-approve members following specific rules (e.g., auto-approve if account is 60+ days old AND karma > 100)

WHERE auto-approval is configured, THE system SHALL:
- Immediately approve requests matching criteria
- Notify member "Your membership request was approved automatically"
- Queue requests NOT matching criteria for manual review
- Display auto-approval status in community settings

**Membership Request Management**

WHEN membership requests accumulate, THE system SHALL:
- Display pending request count in moderator queue
- Sort by oldest first (fairness) or newest first (recent interest)
- Allow batch approval/denial for efficiency
- Show response rate analytics (percentage of requests approved/denied)

### 3.3 Community Subscriber Management Interface

**Subscriber List Access and Display**

THE community creator and senior moderators SHALL access subscriber list through community management interface:
- Display total subscriber count prominently
- List all current subscribers with:
  - Username (clickable link to profile)
  - Join date (when they subscribed to community)
  - Karma score (overall platform karma)
  - Role (member, banned, etc.)

**Subscriber Search and Filtering**

THE system SHALL support searching and filtering subscriber list:
- **Search by username**: Find specific subscriber
- **Filter by join date**: Find recent or long-time members
- **Filter by karma**: Find high-karma or low-karma members
- **Filter by role**: Show only moderators, only members, etc.
- **Sort options**: By join date, by karma, alphabetical

**Member Removal and Banning**

WHEN moderator selects subscriber to remove, THE system SHALL present options:
- **Remove (without ban)**: Member is removed from community but can rejoin
- **Ban (temporary)**: Member cannot access for specified duration (1 day - 6 months)
- **Ban (permanent)**: Member is permanently removed and cannot rejoin

WHEN member is removed, THE system SHALL:
- Remove them from subscriber list immediately
- Remove community from their subscribed communities list
- Delete any draft posts or pending actions in community
- IF temporary ban, set expiration date for ban
- Notify removed member with reason (optional)
- Log action in community audit trail

### 3.4 Unsubscribe from Communities

WHEN a subscribed member clicks "Unsubscribe" on community page, THE system SHALL:
- Display confirmation dialog "Are you sure you want to unsubscribe from r/[community]? Your posts and comments will remain."
- Upon confirmation, remove community from member's subscribed list
- Decrement community subscriber count
- Remove community's posts from member's home feed
- Member can resubscribe at any time

WHEN member unsubscribes, THE system SHALL:
- Preserve their post and comment history in community (not deleted)
- Remove community from "My Communities" list
- Stop sending community notifications to member
- Allow member to view community publicly if public community
- Allow member to view their posts/comments in community history

### 3.5 Subscriber Count and Community Metrics

THE system SHALL maintain accurate subscriber count updated in real-time:
- Increment when member subscribes
- Decrement when member unsubscribes or is removed
- Display on community page prominently
- Use in community ranking and trending algorithms

**Community Activity Metrics**

THE system SHALL calculate and display:
- **Total Subscribers**: Current count of members
- **Monthly Active Subscribers**: Members with activity (post, comment, vote) in past 30 days
- **New Subscribers**: Members who subscribed in past 7 days
- **Subscriber Growth Rate**: Percentage change in subscribers week-over-week
- **Member Retention Rate**: Percentage of members from 30 days ago still subscribed

WHERE community moderators access analytics, THE system SHALL display:
- Visual chart of subscriber growth over time
- Breakdown of new members by source (search, recommendations, direct)
- Activity levels of members (active, inactive, dormant)
- Churn rate and reasons members leave (if available)

## 4. Moderator Roles and Permissions

### 4.1 Moderator Hierarchy and Roles

The communityPlatform implements a three-tier moderator hierarchy for each community. Each tier has distinct permissions and responsibilities:

**Tier 1: Community Creator (Founder)**

THE community creator is the user who established the community and holds supreme authority.

**Creator Responsibilities:**
- Establish community vision, culture, and rules
- Manage other moderators (appoint, remove, promote, demote)
- Approve or reject major community direction changes
- Handle appeals of moderator decisions
- Manage community deletion and transfers

**Creator Permissions:**
- ALL permissions available to Senior Moderators
- Appoint new senior moderators
- Remove or demote any moderator (senior or junior)
- Change community visibility (public/private)
- Change community category and core settings
- Delete the entire community
- Transfer community ownership to another member
- Access complete audit trail of all moderator actions
- Override moderator decisions on content removal or user bans
- Manage community monetization and revenue (if enabled)

**Creator Permanence:**
- Creator role is permanently tied to the user unless voluntarily transferred
- Creator status retained even if account is inactive
- Creator status NOT revoked even if account is suspended (can still access community via admin interface)

**Tier 2: Senior Moderator**

THE senior moderator is appointed by the community creator and has broad operational authority.

**Senior Moderator Responsibilities:**
- Review and resolve reports daily
- Enforce community rules consistently
- Manage junior moderators
- Approve new members (for private communities)
- Review appeal requests from users
- Maintain moderation queue and handle urgent issues
- Contribute to community rule enforcement strategy

**Senior Moderator Permissions:**
- Remove posts and comments for policy violations
- Suspend members from 1 day to 30 days
- Warn members with visible warning message
- Appoint and remove junior moderators
- Modify community rules and descriptions (with creator approval)
- Enable/disable post approval and comment filtering
- Access community audit trail (can see junior moderator actions)
- Pin/feature high-quality posts
- Lock posts and comments (disable replies)
- Review and act on user reports in moderation queue
- Change community default sorting and display settings
- View community member analytics and activity levels

**Senior Moderator Restrictions:**
- CANNOT remove the community creator or other senior moderators
- CANNOT permanently ban members (can suspend up to 30 days)
- CANNOT change community visibility or category
- CANNOT delete community
- CANNOT access moderator actions of other senior moderators (privacy boundary)

**Senior Moderator Deactivation:**
- Community creator can remove or demote senior moderators at any time
- Creator provides optional reason (logged in audit trail)
- Senior moderator loses all permissions immediately upon removal
- Moderation actions taken by removed moderator remain recorded

**Tier 3: Junior Moderator**

THE junior moderator is appointed by senior moderators or the creator and has limited operational authority.

**Junior Moderator Responsibilities:**
- Monitor community for policy violations
- Flag problematic content for senior review
- Warn users about minor violations
- Assist with basic moderation tasks
- Contribute to community culture through modeling good behavior

**Junior Moderator Permissions:**
- Remove posts and comments (with automatic notification to senior moderator)
- Warn members (visible warning on profile)
- Flag content for senior moderator review
- Mark content as spam or off-topic
- Provide feedback on community rule effectiveness

**Junior Moderator Restrictions:**
- CANNOT suspend or permanently ban members
- CANNOT appoint other moderators
- CANNOT modify community settings or rules
- CANNOT override decisions of senior moderators or creators
- CANNOT access full moderation audit trail
- Can only see their own actions

**Junior Moderator Deactivation:**
- Senior moderators can remove junior moderators
- Creator can remove any junior moderator
- Junior moderators lose all permissions immediately upon removal
- ALL previous actions by junior moderator remain in audit trail

### 4.2 Moderator Appointment, Demotion, and Removal

**Appointing New Moderators**

WHEN community creator or senior moderator chooses to appoint a moderator, THE system SHALL:

1. Display list of eligible members (accounts in good standing, active in community)
2. Allow selector to choose moderator tier (Senior or Junior)
3. Send appointment invitation to selected member
4. Display message: "You are invited to moderate r/[community]. As [Senior/Junior] Moderator, you will [responsibilities]. Do you accept?"

WHEN selected member accepts invitation, THE system SHALL:
- Grant appropriate permissions immediately
- Add them to moderator list
- Send confirmation to appointing moderator
- Notify community creator of new moderator
- Display moderator badge on member's profile
- Include new moderator in moderation team announcements
- Grant access to moderation dashboard and queue

WHEN selected member declines invitation, THE system SHALL:
- Inform appointing moderator of declination
- Allow appointing moderator to select alternative candidate
- Remove invitation (not stored as rejection)

**Moderator Demotion**

WHEN senior moderator requests demotion from senior to junior, THE system SHALL:
- Accept request immediately
- Reduce permissions from senior to junior level
- Notify community creator of voluntary demotion
- Preserve complete moderation history

WHEN creator or senior demotes another senior moderator to junior, THE system SHALL:
- Reduce permissions immediately
- Notify affected moderator of demotion
- Log demotion in audit trail with reason
- Preserve all previous moderation actions in history

**Moderator Removal**

WHEN community creator removes a moderator, THE system SHALL:
- Immediately revoke all moderator permissions
- Remove from moderator list and moderation dashboard access
- Remove moderator badge from profile
- Notify removed moderator of removal and reason (optional)
- Preserve all actions taken by moderator in audit trail
- Allow moderator to be reappointed later

WHEN senior moderator removes a junior moderator, THE system SHALL:
- Follow same process as creator removal
- Senior cannot remove other senior moderators (only creator can)

WHEN moderator voluntarily steps down, THE system SHALL:
- Display resignation confirmation form asking for optional reason
- Process resignation immediately
- Notify community creator of resignation
- Preserve moderator's contribution to community history

### 4.3 Platform Moderator vs Community Moderator

**Platform Moderator/Administrator Authority**

THE platform administrator holds system-wide authority superseding community-level moderation:
- Can take moderation actions in ANY community regardless of appointment
- Not required to be subscribed to community
- Actions are logged as "Platform Administrator" not "Community Moderator"
- Can override community moderator decisions
- Can modify community settings regardless of moderator permissions
- Can remove communities for policy violations
- Can remove moderators from communities

WHEN platform administrator takes action in a community, THE system SHALL:
- Notify affected community (if content removal or user action)
- Log action in platform-wide audit trail
- Send notice to community creator explaining administrative action

**Community Moderator Scope**

WHEN community moderator takes action, THE system SHALL:
- Scope action to ONLY their assigned community
- NOT allow action in other communities even if they're moderators there
- Log action in community-specific audit trail
- Label action with moderator's community role

### 4.4 Moderator Action Audit Trail

EVERY moderator action SHALL be recorded in an immutable audit trail capturing:

**Audit Trail Content**

- **Action Type**: Specific action taken (remove_post, remove_comment, suspend_user, warn_user, etc.)
- **Actor**: User ID and username of moderator who took action
- **Actor Role**: Moderator tier (Community Creator, Senior Moderator, Junior Moderator) of person who took action
- **Target**: Object affected (post_id, comment_id, user_id with full context)
- **Timestamp**: UTC datetime of action
- **Reason**: Explanation provided by moderator (required, minimum 5 characters)
- **Details**: Specific details about action:
  - For removal: What rule was violated, visibility change
  - For suspension: Duration, expiration date
  - For warning: Type of violation, warning count for that user
- **Previous State**: Full content or status before action (for reversal purposes)
- **New State**: Content or status after action
- **IP Address**: Of moderator taking action (for security)

**Audit Trail Access Levels**

- **Community Creator**: Can view all moderator actions in their community with full details
- **Senior Moderator**: Can view all junior moderator actions; can see summary (not details) of other senior actions
- **Junior Moderator**: Can only view their own actions
- **Platform Administrator**: Can view all moderator actions in all communities
- **Affected User**: Can view moderator actions affecting their content (what was removed, why)

**Audit Trail Retention**

- THE system SHALL retain moderator action audit trails indefinitely
- Audit trails are preserved even if community is deleted
- Audit trails used for moderator quality assurance and user appeals
- Audit trails provided to legal/compliance teams upon request

**Moderator Performance Metrics**

WHERE community creator reviews moderator performance, THE system SHALL display:
- Number of actions taken per moderator per time period
- Breakdown of action types (removals, suspensions, warnings)
- Average resolution time for reports
- Appeal reversal rate (percentage of moderator decisions overturned on appeal)
- User feedback on moderator fairness (if review system is implemented)

### 4.5 Moderator Permissions Matrix

The following matrix defines which operations each moderator tier and user actor can perform:

| Action | Member | Creator | Senior | Junior | Admin |
|--------|:------:|:-------:|:------:|:------:|:-----:|
| **Content Moderation** | | | | | |
| Remove posts | ❌ | ✅ | ✅ | ✅ | ✅ |
| Remove comments | ❌ | ✅ | ✅ | ✅ | ✅ |
| Lock posts (disable comments) | ❌ | ✅ | ✅ | ❌ | ✅ |
| Pin/feature posts | ❌ | ✅ | ✅ | ❌ | ✅ |
| Restore removed content | ❌ | ✅ | ✅ | ❌ | ✅ |
| **Member Management** | | | | | |
| Warn members | ❌ | ✅ | ✅ | ✅ | ✅ |
| Suspend members (temporary) | ❌ | ✅ | ✅ | ❌ | ✅ |
| Ban members (permanent) | ❌ | ✅ | ❌ | ❌ | ✅ |
| Remove member from community | ❌ | ✅ | ✅ | ❌ | ✅ |
| View member moderation history | ❌ | ✅ | ✅ | ❌ | ✅ |
| **Moderator Management** | | | | | |
| Appoint senior moderators | ❌ | ✅ | ❌ | ❌ | ✅ |
| Appoint junior moderators | ❌ | ✅ | ✅ | ❌ | ✅ |
| Remove/demote senior moderators | ❌ | ✅ | ❌ | ❌ | ✅ |
| Remove junior moderators | ❌ | ✅ | ✅ | ❌ | ✅ |
| Access moderation dashboard | ❌ | ✅ | ✅ | ✅ | ✅ |
| View audit trail (full) | ❌ | ✅ | Partial | Own only | ✅ |
| **Community Settings** | | | | | |
| Modify community description | ❌ | ✅ | ✅ | ❌ | ✅ |
| Modify community rules | ❌ | ✅ | ✅ | ❌ | ✅ |
| Enable/disable post approval | ❌ | ✅ | ✅ | ❌ | ✅ |
| Enable/disable comment approval | ❌ | ✅ | ✅ | ❌ | ✅ |
| Change post type restrictions | ❌ | ✅ | ✅ | ❌ | ✅ |
| Change default sorting | ❌ | ✅ | ✅ | ❌ | ✅ |
| Change visibility (public/private) | ❌ | ✅ | ❌ | ❌ | ✅ |
| Change community category | ❌ | ✅ | ❌ | ❌ | ✅ |
| Delete community | ❌ | ✅ | ❌ | ❌ | ✅ |
| Transfer ownership | ❌ | ✅ | ❌ | ❌ | ✅ |
| View analytics | ❌ | ✅ | ✅ | ❌ | ✅ |
| Manage community monetization | ❌ | ✅ | ❌ | ❌ | ✅ |

**Legend**:
- ✅ = Full permission
- ❌ = No permission
- Partial = Limited access (can see junior mod actions, not senior mod actions)
- Own only = Can only access their own actions

## 5. Community Rules and Governance

### 5.1 Community Rules Definition and Publication

WHEN a community is created or rules are edited, THE system SHALL:
- Accept up to 15 numbered rules
- Store each rule as plain text (up to 200 characters per rule)
- Display rules prominently on community page in numbered format
- Show rules on sidebar of all community pages
- Display rules to new members upon subscription with acknowledgment checkbox

**Rule Examples by Community Type**

Different community types typically have different rules:
- Tech communities: Focus on on-topic discussion, no spam links, be respectful
- News communities: No misleading titles, cite sources, no duplicate posts
- Entertainment communities: No spoilers without warning, respect artists' work
- Education communities: No cheating/homework solutions, be helpful, cite sources
- Gaming communities: No harassment, spoilers require warning, no self-promotion

THE system SHALL suggest rule templates based on community category when creating a community.

### 5.2 Rule Violation Handling and Moderation Actions

WHEN a moderator identifies content violating community rules, THE system SHALL provide graduated enforcement options:

**Option 1: Issue Warning (Non-removal)**

WHEN moderator chooses to warn member, THE system SHALL:
- Not remove the content
- Display warning message to member: "This post violates community rule #3: [rule text]. Please revise or remove."
- Record warning in member's community moderation history
- NOT visible to other community members
- Optional: Moderator can send private message to member explaining violation
- Track warning count for member in that community

**Option 2: Remove Content**

WHEN moderator removes post or comment, THE system SHALL:
- Soft-delete content (remove from public view)
- Display removal notice to community: "[Post/Comment] removed by moderators - violated rule #X: [rule text]"
- Allow original author to view removed content and understand why
- Notify member of removal with reason message
- Log removal action in audit trail
- Send email to member explaining removal

**Option 3: Remove and Warn Member**

WHEN moderator chooses to remove content AND warn member, THE system SHALL:
- Follow removal process above
- Also increment warning count for member
- Display warning badge on member's profile in that community
- After 3 warnings in same community, escalate to senior moderator for potential suspension

**Option 4: Suspend Member from Community**

WHEN moderator (senior+) suspends member, THE system SHALL:
- Specify suspension duration: 1 day, 3 days, 7 days, 30 days, or custom
- Prevent member from posting, commenting, voting in that community
- Allow member to view community content (read-only)
- Display suspension notice to member: "You are suspended from r/[community] until [date] for violating rule #X: [rule text]"
- Send email with suspension details and appeal instructions
- Display "Suspended" badge on member's profile in that community
- Automatic unsuspension when duration expires
- Log action in audit trail

**Option 5: Permanently Ban Member from Community**

WHEN community creator bans member permanently, THE system SHALL:
- Prevent member from ever accessing community again
- Member cannot view posts, create posts, or participate
- Remove member from subscriber list
- Display "Banned" indicator on member's profile
- Allow member to appeal ban through formal appeal process
- Log permanent ban in audit trail with detailed reason
- Send email to member with ban reason and appeal instructions

### 5.3 User Appeal Process for Moderation Decisions

WHEN a member receives a warning, removal, suspension, or ban, THE system SHALL provide appeal option.

**Appeal Submission**

WHEN member selects "Appeal This Decision", THE system SHALL display:
- Original moderation action and stated reason
- Appeal submission form with fields:
  - "Why do you believe this action was unjust?" (required, 50-500 characters)
  - Supporting evidence or clarification (optional)
  - "I have read the community rules and understand why my content may have violated them" (checkbox)
- Submit appeal button

WHEN member submits appeal, THE system SHALL:
- Create appeal record with timestamp
- Queue for review by senior moderator or creator
- Notify member: "Your appeal has been received and will be reviewed"
- Send moderator notification of pending appeal

**Appeal Review Workflow**

WHEN reviewing appeal, moderator/creator SHALL:
- Re-examine original content (if removed)
- Consider member's explanation in appeal
- Review member's history in community and on platform
- Make independent decision on appeal (not rubber-stamping)

**Appeal Outcomes**

MODERATOR can select from outcomes:

1. **Appeal Denied**
   - Original action stands
   - Member notified: "Your appeal has been reviewed and the original action is upheld"
   - Can view original moderator's reason and appeal decision

2. **Appeal Approved - Action Reversed**
   - Content removed? Content is restored and published
   - Suspension? Member is immediately unsuspended, expiration cancelled
   - Ban? Member ban is lifted, can rejoin
   - Warning? Warning is removed from record
   - Member notified: "Your appeal was successful and the action has been reversed"

3. **Appeal Approved - Action Reduced**
   - Suspension shortened (e.g., from 30 days to 7 days)
   - Ban converted to suspension
   - Warning removed (more lenient)
   - Member notified with new status

4. **Appeal Denied - with Explanation**
   - Original action stands
   - Moderator provides detailed explanation of why appeal was denied
   - Member can read explanation in appeal history
   - No further appeal possible for same action

**Appeal Limitations and Fairness**

- THE system allows only ONE appeal per moderation action
- Appeals must be submitted within 60 days of action
- Members cannot spam appeal system
- IF member submits 5+ appeals in 30 days, account may be flagged for review
- Platform administrator can override community moderator appeals if needed

**Appeal Timeline**

- Community moderators have 7 days to review appeal
- IF 7 days pass without review, appeal automatically escalates to creator/admin
- IF still no response after 14 days, appeal is automatically approved
- Emergency appeals (bans) may be expedited

### 5.4 Automated Rule Enforcement System

THE system provides automated tools to help enforce community rules:

**Spam Detection**

THE system automatically detects and flags:
- Repeated identical content from same member
- High-frequency posting suggesting bots
- Posts with excessive external links (>5 links)
- Common spam phrases from database
- Suspicious shortened URL patterns

WHEN spam is detected:
- Content is flagged (not removed)
- Added to moderation queue
- Moderators see confidence score
- Moderators can quick-action: Approve, Remove, or Warn

**Profanity and Toxicity Filtering**

THE system flags content containing:
- Severe profanity or slurs (can be configured per community)
- Harassment patterns (aggressive personal attacks)
- Threats or violent language
- Hate speech targeting protected groups

FLAGGED content:
- Can be configured to auto-remove or flag for review
- Hidden from community while under review (if configured)
- Moderators see context and reason for flag
- Community can customize sensitivity level

**Link Validation**

THE system validates external links in posts:
- Checks against malware databases
- Detects shortened URLs that may hide dangerous links
- Flags suspicious domains
- Prevents posting to known phishing sites

WHEN suspicious link detected:
- Post is either blocked (critical threat) or flagged (potential threat)
- Moderators can allow or remove

**Community-Specific Automation**

COMMUNITY creators can configure automation rules:
- Auto-remove posts without tags (if tagging is required)
- Auto-flag posts that aren't from subscribed members (private community security)
- Auto-filter words/phrases specific to community
- Auto-approve posts from high-karma members
- Auto-reject posts from new accounts (set age threshold)

## 6. Community Discovery and Lifecycle Management

### 6.1 Community Directory and Discovery

**Community Discovery Methods**

THE system provides multiple mechanisms for discovering communities:

**Community Directory**

THE community directory displays all public communities with options to browse by:
- **Category**: Browse communities by topic (Technology, Entertainment, Sports, etc.)
- **Trending**: Communities with fastest growth in subscribers (last week)
- **Popular**: Communities with largest total subscriber counts
- **New**: Recently created communities (last 7 days)
- **Activity**: Communities with most posts/comments in last 24 hours

For each community in directory, display:
- Community name and icon
- Brief description (first 100 characters)
- Subscriber count
- Average daily activity (posts/comments)
- Category tags
- "Subscribe" button

**Search Functionality**

THE system allows users to search for communities by:
- **Community Name**: Exact and partial matches
- **Community Identifier**: Search by "r/[identifier]"
- **Description**: Keyword search in community descriptions
- **Category**: Filter search by topic category
- **Subscriber Range**: Find communities with similar size (small/medium/large)
- **Activity Level**: Find active or quiet communities

Search results sorted by:
- Relevance (name match highest)
- Subscriber count (more popular first)
- Activity level (most active first)

**Recommendation System**

THE system provides personalized community recommendations based on:
- Communities similar to ones member is subscribed to
- Communities popular with members following similar topics
- Communities relevant to member's post/comment history
- Trending communities in member's favorite categories
- Communities with content similar to member's liked posts

Recommendations displayed on:
- Home feed sidebar
- Profile page
- "Discover Communities" tab

### 6.2 Community Metadata and Rankings

**Community Visibility on Platform**

WHEN a community is public, THE system displays:
- In search results and directory
- In trending/popular lists
- In recommendations
- Posts may be indexed by search engines
- Appears in member's recommended communities

WHEN a community is private, THE system:
- Does NOT appear in search results or directory
- Does NOT appear in public listings
- Appears only to subscribed members
- NOT indexed by search engines

**Community Ranking Algorithms**

THE system ranks communities in displays based on:

1. **Trending Score** (last 7 days):
   - Formula: (New_Subscribers / Total_Subscribers) × 0.4 + (Weekly_Posts / 1000) × 0.3 + (Weekly_Comments / 5000) × 0.3
   - Identifies communities with rapid growth and activity

2. **Popularity Score**:
   - Formula: Subscriber_Count with weighted boost for active communities
   - Identifies established, popular communities

3. **Relevance Score** (for search):
   - Formula: Name_Match_Score + Description_Match_Score + Category_Match_Score
   - Based on user's search query

4. **Activity Score**:
   - Formula: (Posts_Per_Day + Comments_Per_Day/10) / Age_In_Days
   - Identifies highly engaged communities

### 6.3 Community Ownership Transfer and Deletion

**Community Ownership Transfer**

WHEN community creator chooses to transfer ownership, THE system SHALL:
1. Display list of eligible members (senior moderators or high-karma members)
2. Require creator to confirm transfer
3. Send invitation to new owner: "You have been invited to own r/[community]. As owner, you will have full authority over the community. Do you accept?"

WHEN new owner accepts:
- All creator permissions transfer to new owner
- Original creator optionally becomes senior moderator
- Transfer is recorded in audit trail
- Both users receive confirmation emails
- Community settings remain unchanged

WHEN new owner declines:
- Invitation is cancelled
- Creator can select another member
- No rejection record created

**Community Deletion**

WHEN creator chooses to delete their community, THE system SHALL:
1. Display warning: "Deleting this community is permanent. All posts and comments will be deleted. This cannot be undone."
2. Require confirmation and password entry
3. Provide 30-day grace period to recover deleted community
4. After confirmation, immediately:
   - Hide community from search and directory
   - Remove from member subscribed lists
   - Stop accepting new posts and comments
   - Display "This community has been deleted" message
   - Preserve all content in secure archive (for 30 days)

**30-Day Recovery Window**

DURING 30-day grace period after deletion, THE system:
- Allows creator to restore community (recover from archive)
- Preserves all posts, comments, subscribers, and settings
- Displays count-down "Community will be permanently deleted in X days"

AFTER 30-day period expires:
- All community content is permanently deleted
- Community cannot be recovered
- Creator receives final confirmation email
- All subscribers are notified community has been permanently deleted

**Community Deletion by Administrators**

WHEN platform administrator deletes community (for policy violations), THE system SHALL:
- Immediately disable all access to community
- Remove from directory and search
- Archive content for investigation (retained per legal hold)
- Notify community creator of deletion and reason
- Log deletion in platform audit trail
- No recovery option for administrative deletion

### 6.4 Dormant Community Management

**Dormancy Detection**

THE system identifies dormant communities:
- No posts created in 6 months
- No moderator actions in 6 months
- Monthly active subscribers dropped to zero or near-zero
- Marked as "dormant" in admin interface

**Dormancy Notifications**

WHEN community is detected as dormant, THE system SHALL:
1. Attempt to contact community creator
   - Email notification: "r/[community] has been inactive for 6 months. If you want to keep this community, please log in by [date]"
   - Deadline: 30 days to respond

2. IF creator doesn't respond within 30 days:
   - Notify all senior moderators
   - Offer moderators to claim ownership
   - Allow moderators to reactivate community

3. IF no moderator responds within 30 days:
   - Notify all members
   - Offer highest-karma member to claim ownership
   - Allow reactivation

4. IF no one responds within 60 days total:
   - Community is archived (moved to readonly status)
   - Can be restored only by creator within 1 year
   - After 1 year, can be restored only by admin

**Community Reactivation**

WHEN member reactivates dormant community, THE system SHALL:
- Restore to active status
- Re-enable post and comment creation
- Return to search and directory
- Notify previous subscribers community is active
- Allow reactivator to assume ownership if different from creator

### 6.5 Community Archival and Historical Access

**Community Archival**

WHEN a community reaches 5+ years old and has minimal activity, THE system MAY:
- Move community to "archived" status (read-only)
- Preserve all posts and comments in full
- Allow members to view archived community content
- Prevent new posts and comments
- Display "Archived" badge on community

ARCHIVED communities:
- Remain searchable and discoverable
- Do NOT appear in "active communities" lists
- Receive reduced feature set
- Can be reactivated by creator/owner anytime

---

## Summary and Integration Points

The community management system forms the organizational backbone of the platform. Communities provide:
- Primary structure for content organization
- Foundation for user engagement and participation
- Venue for community-driven governance through moderators
- Scope for permission boundaries and access control
- Context for post visibility and recommendation algorithms

The community system integrates with:
- **User Accounts** (user profiles, karma accumulation)
- **Content Creation** (posts, comments created within communities)
- **Voting System** (votes determine community trends)
- **Moderation System** (community-level and platform-level enforcement)
- **User Profiles** (display moderator roles and community participation)
- **Post Sorting** (hot/new/top/controversial applied per community)

---

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*