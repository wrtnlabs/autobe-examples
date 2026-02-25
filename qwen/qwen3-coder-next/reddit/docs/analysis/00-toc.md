# Table of Contents

## 01. Service Overview

A comprehensive overview of the Reddit-like community platform, including vision, core features, target audience, business model, and success metrics.

### Service Vision

The platform enables communities to share content, discuss topics, and build connections through posts, comments, and voting. Users create accounts, join communities of interest, and participate in discussions while earning karma based on contribution quality.

### Core Features

- **User Accounts**: Email/password registration with username selection, profile management, and karma tracking
- **Communities**: Create and join topic-based communities with subscription management
- **Post System**: Text, link, and image posts with voting, editing, and deletion
- **Comment System**: Nested comment threads with reply chains and voting
- **Voting System**: Upvote/downvote functionality with karma calculation
- **Feed System**: Multiple feed types (Home, Popular, Community) with sorting options
- **Moderation**: Community owners and moderators with content management and user banning capabilities
- **Reporting**: Content flagging system with moderator review and resolution

### Target Audience

- Community members seeking to share content and participate in discussions
- Community creators and owners looking to build topic-focused groups
- Content consumers wanting personalized feeds and discovery
- Moderators managing community standards and quality

### Business Model

The platform generates value through community engagement metrics, user growth, and content volume. Success is measured by active users, content creation rates, community growth, and engagement levels.

### Success Metrics

- Total user registrations and active user retention
- Number of communities created and subscribed
- Post creation volume and comment activity
- Average karma scores and engagement metrics
- Moderator activity and report resolution rates

---

## 02. Functional Requirements

Detailed functional requirements for all core system components including user account management, community management, post system, comment system, voting system, feed system, moderation system, and reporting system.

### User Account Management

#### Registration

- Users register with email address and password
- Users select a unique username during registration
- Email must be unique across the system
- Username must be unique and follow platform naming conventions
- Password meets minimum security requirements
- Registration confirms account creation with authentication credentials

#### Authentication

- Users log in with email and password credentials
- Successful authentication provides session token
- Session management maintains user login state
- Logout invalidates current session token

#### Account Management

- Users can change their password
- Users can delete their account (cascading deletion)
- Account deletion removes all user posts and comments
- Deleted content is permanently removed from the system

### Community Management

#### Community Creation

- Any registered user can create a community
- Community requires unique name and description
- Community creator becomes the owner
- Community creation establishes ownership relationship

#### Community Browsing

- Users can view all communities in a list
- Communities display subscriber count
- Users can search communities by name
- Search returns matching communities with basic information

#### Subscription Management

- Users can subscribe to any community
- Users can unsubscribe from any community
- Subscribing is required to create posts in that community
- Users can view list of all communities they are subscribed to

### Post System

#### Post Creation

- Users can create posts in communities they are subscribed to
- Posts must have a title
- Posts must be one of three types:
  - Text post: contains text content
  - Link post: contains a URL
  - Image post: contains an uploaded image file
- Post creation associates content with user and community

#### Post Editing and Deletion

- Users can edit their own posts
- Users can delete their own posts
- Deletion is permanent and cannot be recovered

#### Post Display

- Post view shows: title, full content, author, community, vote score, comment count, posting time
- Post list display shows: title, author username, community name, vote score, comment count, time since posted
- Text posts show first 200 characters in list view
- Image posts show thumbnail in list view
- Link posts show domain name in list view

### Comment System

#### Comment Creation

- Users can write comments on any post
- Comments can reply to other comments (nested structure)
- Reply chains have no depth limit
- Comment creation associates content with user and post

#### Comment Editing and Deletion

- Users can edit their own comments
- Users can delete their own comments
- Deletion is permanent and cannot be recovered

#### Comment Display

- Comments show: author, content, vote score, time since posted, nested replies
- Comment sorting options: Best (highest score), New (most recent), Controversial (many votes, score near zero)

### Voting System

#### Vote Mechanics

- Users can upvote posts (adds 1 to score)
- Users can downvote posts (subtracts 1 from score)
- Each user can only vote once per post
- Users can change vote from upvote to downvote or vice versa
- Users can remove their vote entirely
- Vote score = total upvotes minus total downvotes

#### Karma Calculation

- Every user has a single karma score
- Upvotes on user's posts/comments increase karma by 1
- Downvotes on user's posts/comments decrease karma by 1
- Vote removal adjusts karma accordingly
- Karma can be negative

### Feed System

#### Feed Types

**Home Feed**
- Shows posts only from communities the user is subscribed to
- Available only to logged-in users
- Required authentication for access

**Popular Feed**
- Shows posts from all communities across the platform
- Available to everyone (including logged-out users)
- Public access endpoint

**Community Feed**
- Shows posts from one specific community
- Available to everyone
- Community-specific endpoint

#### Sorting Options

All feeds support the same sorting options:

**Hot**
- Recent posts with many upvotes appear first
- Time-weighted popularity algorithm
- Post freshness and engagement weighted

**New**
- Most recently created posts appear first
- Simple chronological ordering
- Most recent posts at top

**Top**
- Highest vote score first
- Time filter options: today, this week, this month, this year, all time
- Results filtered by selected time period

**Controversial**
- Posts with many votes but score close to zero appear first
- Measures engagement diversity
- High volume with low consensus posts

#### Pagination

- All feeds support pagination
- Consistent pagination across feed types
- Standard page size and offset parameters

### Moderation System

#### Moderator Roles

**Ownership Hierarchy**
- Community creator is the owner (highest authority)
- Owner can add moderators to their community
- Owner can remove moderators from their community
- Moderator cannot remove the owner
- Moderators cannot remove each other (only owner can remove moderators)

#### Moderator Permissions

**Content Management**
- Moderators can delete any post in their community
- Moderators can delete any comment in their community
- Deletion is permanent and cannot be recovered

**User Management**
- Moderators can ban users from their community
- Moderators can unban users from their community
- Moderators can view list of banned users
- Banned users cannot create posts or comments in that community
- Banned users can still view content in the community

### Reporting System

#### Reporting Process

- Users can report any post or comment
- Reporting requires providing a reason (text field)
- Report creation captures reporter information
- Reports are associated with specific content

#### Report Viewing

- Moderators can view all reports for their community
- Each report shows: reported content, who reported it, and the reason
- Reports display associated metadata and content preview

#### Moderator Review Actions

**Report Resolution**
- Moderators can approve a report (deletes the content)
- Moderators can dismiss a report (keeps the content)
- Dismissed reports are removed from the report list
- Report history may be maintained for audit purposes

---

## 03. User Actors

Complete user actor definitions with permissions and capabilities for authentication and authorization.

### Guest Actor

**Description**: Unauthenticated users who can access public content but cannot interact with the system.

**Permissions**:
- View public posts in Popular Feed
- View public community information
- View community posts in Community Feeds
- View public user profiles

**Capabilities**:
- Browse public content anonymously
- Search communities by name
- View community lists with subscriber counts
- Read publicly available information

**Restrictions**:
- Cannot create accounts
- Cannot vote on posts or comments
- Cannot create posts or comments
- Cannot access Home Feed
- Cannot view private user information

### Member Actor

**Description**: Authenticated users with standard account privileges.

**Permissions**:
- All Guest permissions
- Create and manage own posts
- Create and manage own comments
- Vote on posts and comments
- Subscribe to and unsubscribe from communities
- Edit own profile information
- Change own password
- Delete own account

**Capabilities**:
- Create text, link, and image posts
- Comment on and reply to posts
- Upvote and downvote content
- View Home Feed from subscribed communities
- Access personalized feeds
- Manage own profile and display settings
- Create new communities

**Restrictions**:
- Cannot moderate content in other users' communities
- Cannot access moderator-only features
- Cannot ban or remove other users
- Cannot view moderator dashboards

### Moderator Actor

**Description**: Community moderators with content management and user oversight capabilities.

**Permissions**:
- All Member permissions
- Delete any post in their community
- Delete any comment in their community
- Ban and unban users from their community
- View and resolve community reports
- Manage community moderator list
- View banned user list

**Capabilities**:
- Delete inappropriate content
- Manage community standards
- Enforce community rules
- Review reported content
- Approve or dismiss reports
- Add other moderators to community
- Manage moderator permissions

**Restrictions**:
- Cannot remove community owner
- Cannot remove other moderators (only owner can)
- Cannot access other communities' moderation tools
- Cannot manage communities they don't moderate

### Owner Actor

**Description**: Community owners with highest authority in their communities.

**Permissions**:
- All Moderator permissions
- Add and remove moderators
- Transfer community ownership
- Manage community settings
- View all community data

**Capabilities**:
- Create new communities
- Assign moderator roles
- Remove moderator permissions
- Delete entire community
- Configure community settings
- Manage community icon and description

**Restrictions**:
- Cannot be removed by moderators
- Cannot be banned by moderators
- Maintains ultimate authority in community

---

## 04. Authentication

Complete authentication system specification including registration, login, session management, and password recovery.

### Registration Flow

**Step 1: Account Creation Request**
- User submits registration form with email, password, and chosen username
- System validates email format and uniqueness
- System validates username format and uniqueness
- System validates password strength requirements
- Validation errors are returned if any requirements fail

**Step 2: Account Creation**
- Valid registration creates new user account
- User profile is initialized with display name (username), empty bio, and default avatar
- Karma score is initialized to 0
- Authentication credentials are securely stored
- Registration confirmation is provided

**Step 3: Post-Registration**
- User receives registration completion notification
- User can immediately log in with credentials
- User profile is accessible to other users

### Login Flow

**Step 1: Authentication Request**
- User submits login credentials (email and password)
- System validates credentials against stored user data
- Invalid credentials return appropriate error messages

**Step 2: Session Creation**
- Valid credentials generate authentication session
- Session token is created and returned
- User is authenticated for subsequent requests
- Session management tracks active connections

**Step 3: Post-Login**
- User accesses authenticated features
- Session token is used for authorization
- Session expires after configured timeout
- User must re-authenticate after expiration

### Session Management

**Session Lifecycle**
- Sessions are created on successful login
- Sessions persist until explicit logout or timeout
- Session tokens are validated for each authenticated request
- Expired sessions require re-authentication

**Security Requirements**
- Session tokens use secure storage and transmission
- Session tokens are invalidated on logout
- Multiple concurrent sessions may be supported
- Session activity is tracked for security monitoring

### Password Management

**Password Change**
- Authenticated users can change their password
- Current password must be provided for verification
- New password must meet security requirements
- Password change is permanently applied
- Active sessions may be invalidated for security

**Password Recovery**
- Users who forget password can initiate recovery
- Recovery process validates identity through email
- Recovery link or temporary password is provided
- User must set new password after recovery

---

## 05. User Scenarios

Primary user journeys and success scenarios for common user workflows including new user onboarding, creating first post, joining community, browsing feeds, and engaging with content.

### Scenario 1: New User Onboarding

**Objective**: Help new users create accounts and begin participating in the community

**Steps**:
1. User visits the platform homepage
2. User clicks "Sign Up" button
3. User fills registration form with email, password, and username
4. System validates input and creates account
5. User receives confirmation of successful registration
6. User logs in with new credentials
7. User completes profile setup (display name, bio, avatar)
8. User begins exploring communities

**Success Criteria**:
- User completes registration within 5 minutes
- User logs in successfully on first attempt
- User accesses Home Feed after subscribing to communities
- User creates first post or comment within first session

### Scenario 2: Creating First Post

**Objective**: Guide users through creating and sharing their first content

**Steps**:
1. User navigates to community selection screen
2. User selects or searches for desired community
3. User clicks "Create Post" button
4. User chooses post type (text, link, or image)
5. User enters post title and content
6. System validates and publishes post
7. User sees post appear in community feed
8. User receives notification of initial engagement

**Success Criteria**:
- Post creation completes within 2 minutes
- Post displays correctly in community feed
- User can view post on their profile
- Voting system activates immediately

### Scenario 3: Joining Community

**Objective**: Enable users to find and subscribe to communities of interest

**Steps**:
1. User browses community directory or searches for topic
2. User selects community to explore
3. User views community details (description, subscriber count)
4. User clicks "Subscribe" button
5. System confirms subscription
6. User can now create posts in that community
7. User sees community posts in Home Feed

**Success Criteria**:
- Community discovery completes within 3 minutes
- Subscription action works on first attempt
- Community posts appear in Home Feed immediately
- Subscription list updates correctly

### Scenario 4: Browsing Feeds

**Objective**: Demonstrate feed navigation and content discovery

**Steps**:
1. User navigates to feed selection screen
2. User chooses feed type (Home, Popular, or Community)
3. User selects sorting option (Hot, New, Top, or Controversial)
4. User browses paginated post list
5. User clicks on interesting posts for details
6. User views post content and engagement metrics
7. User votes on posts of interest

**Success Criteria**:
- Feed loads within 3 seconds
- Sorting changes apply immediately
- Pagination displays correct number of items
- Content metrics update in real-time

### Scenario 5: Engaging with Content

**Objective**: Show complete engagement workflow from comment to vote

**Steps**:
1. User views post with comment thread
2. User reads post content and comments
3. User decides to vote on post or comment
4. User clicks upvote or downvote button
5. System updates vote and score display
6. User writes and submits comment or reply
7. Comment appears in thread
8. Other users engage with user's content

**Success Criteria**:
- Voting updates immediately with no delay
- Comment submission completes within 5 seconds
- Comment threads display correctly nested
- Engagement metrics update in real-time

---

## 06. Post System

Detailed post system requirements including creation, types, editing, and deletion.

### Post Creation Process

**Prerequisites**:
- User must be authenticated
- User must be subscribed to the target community
- User must provide required post fields

**Step 1: Post Type Selection**
- User chooses post type from available options
- Text post: User enters text content
- Link post: User enters URL
- Image post: User uploads image file

**Step 2: Post Metadata Entry**
- User provides post title (required field)
- System validates title length and format
- System requires at least one post type field

**Step 3: Community Association**
- User selects community from subscribed list
- System validates community access permissions
- System confirms user can post in selected community

**Step 4: Post Publication**
- System creates post record with all metadata
- System associates post with user and community
- System initializes vote score to 0
- System creates post timestamp
- System confirms successful creation

### Post Types

#### Text Post

**Characteristics**:
- Contains plain text content
- No external URL or image file required
- Displayed directly in feed

**Requirements**:
- Text content must be provided
- Minimum length requirements apply
- Maximum length constraints enforced

#### Link Post

**Characteristics**:
- Contains URL reference
- No text content required
- Domain name displayed in list view

**Requirements**:
- Valid URL must be provided
- System may validate URL format
- Domain extraction for display purposes

#### Image Post

**Characteristics**:
- Contains uploaded image file
- No text content required
- Thumbnail displayed in list view

**Requirements**:
- Valid image file must be uploaded
- File format restrictions apply
- File size limits enforced

### Post Editing and Deletion

**Editing Process**:
- User selects post for editing
- User modifies any editable fields
- System validates changes
- System updates post record
- System refreshes post display

**Deletion Process**:
- User selects post for deletion
- System confirms deletion intent
- System permanently removes post
- System removes associated comments
- System updates community post count

### Post View Requirements

**Single Post View**:
- Title display
- Full content rendering
- Author information
- Community association
- Vote score display
- Comment count
- Timestamp with relative time

**List View**:
- Title and author username
- Community name
- Vote score and comment count
- Relative time since posting
- Content preview for text posts
- Image thumbnail for image posts
- Domain name for link posts

### Community Integration

**Post-Community Relationship**:
- Posts must belong to subscribed community
- Community feeds display related posts
- Community creation restricts post eligibility
- Subscription status affects post visibility

---

## 07. Comment System

Complete comment system requirements including nested replies and voting.

### Comment Creation

**Prerequisites**:
- User must be authenticated
- User must have access to the post
- Comment must be associated with post

**Step 1: Comment Location Selection**
- User selects target post for comment
- User decides between comment or reply
- Comment creates new thread; reply joins existing thread

**Step 2: Content Entry**
- User enters comment text
- System validates content length
- System enforces content guidelines

**Step 3: Comment Publication**
- System creates comment record
- System associates comment with post and user
- System initializes vote score to 0
- System creates timestamp
- System confirms successful creation

### Nested Reply Structure

**Thread Management**:
- Comments can have multiple replies
- Replies can have their own replies
- Reply chains form discussion threads
- No depth limit on nesting

**Navigation**:
- Comment tree displays hierarchy
- Indentation shows reply relationships
- Thread view shows complete discussion
- Collapse/expand functionality for long threads

### Comment Editing and Deletion

**Editing Process**:
- User selects comment for editing
- User modifies comment content
- System validates changes
- System updates comment record
- System refreshes comment display

**Deletion Process**:
- User selects comment for deletion
- System confirms deletion intent
- System permanently removes comment
- System removes nested replies (cascading deletion)
- System updates comment count

### Comment Display

**Comment Card**:
- Author username and profile link
- Content text display
- Vote score (upvotes - downvotes)
- Relative time since posting
- Edit and delete options (for owner)
- Reply button for direct response

**Thread Organization**:
- Comments sorted by selected algorithm
- Reply threads maintain hierarchy
- Visual indentation for depth levels
- Navigation between comment levels

### Reply Chain Management

**Chain Navigation**:
- Jump to parent comment functionality
- Thread navigation breadcrumbs
- Reply chain depth indicators
- Collapse long reply chains

**Performance Considerations**:
- Efficient database queries for nested data
- Lazy loading for deep threads
- Tree structure optimization
- Caching strategies for popular threads

---

## 08. Voting System

Comprehensive voting system requirements for posts and comments including vote mechanics and karma calculation.

### Vote Mechanics

**Post Voting**:
- Users can upvote posts (adds 1 to score)
- Users can downvote posts (subtracts 1 from score)
- Each user can only vote once per post
- Users can change vote direction
- Users can remove vote entirely
- Vote score = upvotes - downvotes

**Comment Voting**:
- Same mechanics as post voting
- Users can upvote/downvote comments
- One vote per user per comment
- Vote changes and removal supported

**Vote Restrictions**:
- Only authenticated users can vote
- Self-voting is prohibited
- Vote verification on each action
- Vote tracking database records

### Karma Calculation

**Karma Principles**:
- Every user has single karma score
- Upvotes on user content increase karma
- Downvotes on user content decrease karma
- Vote removal adjusts karma accordingly
- Karma can be negative

**Karma Updates**:
- When user's post receives upvote: karma +1
- When user's post receives downvote: karma -1
- When user's comment receives upvote: karma +1
- When user's comment receives downvote: karma -1
- Vote removal reverses karma adjustment
- Real-time karma updates for visibility

### Vote Changes and Removal

**Vote Modification**:
- User can change upvote to downvote
- User can change downvote to upvote
- User can remove vote entirely
- Score updates reflect vote changes
- Previous vote is replaced, not added

**Vote Tracking**:
- User vote state tracked per content item
- Vote record includes timestamp
- Vote history maintained for moderation
- Vote integrity validated on updates

### Vote Display Requirements

**Score Presentation**:
- Vote score displayed as number
- Upvote/downvote buttons visible
- Vote count shows net score
- Color coding for positive/negative

**User Vote Status**:
- Visual indication of user's vote
- Upvote/downvote state displayed
- Vote changed feedback provided
- Current vote score highlight

---

## 09. Feed System

Detailed feed system requirements for different post views (Home, Popular, Community) and sorting options (Hot, New, Top, Controversial).

### Home Feed

**Content Scope**:
- Posts only from subscribed communities
- Excludes content from unsubscribed communities
- Personalized for each user
- Requires authentication

**Access Control**:
- Login required for feed access
- Subscriptions determine content
- Private communities filtered appropriately
- Community membership verified

### Popular Feed

**Content Scope**:
- Posts from all platform communities
- Public content across entire system
- Available to guest and authenticated users
- Global content discovery

**Public Access**:
- No authentication required
- Available to all visitors
- Community visibility control
- Content filtering applied

### Community Feed

**Content Scope**:
- Posts from specific community only
- Community-specific endpoint
- Available to guest and authenticated users
- Public community content

**Community Context**:
- Community identification parameter
- Community name and description displayed
- Subscribe functionality available
- Community statistics shown

### Sorting Options

**Hot Sorting**:
- Algorithm: Time-weighted popularity
- Recent posts weighted by engagement
- New posts with high engagement appear first
- Popularity decay over time
- Freshness and engagement combination

**New Sorting**:
- Chronological ordering
- Most recent posts at top
- Simple timestamp-based sorting
- No popularity decay
- Complete chronological listing

**Top Sorting**:
- Score-based ordering
- Highest vote scores first
- Time filter options: today, week, month, year, all time
- Filtered results by time period
- Historical ranking display

**Controversial Sorting**:
- Engagement diversity metric
- Posts with many votes but low scores
- High vote count, score near zero
- controversial = votes * (1 - |score| / votes)
- Engagement breadth indicator

### Pagination Requirements

**Standard Pagination**:
- Page size configuration
- Offset-based or cursor-based
- Next/previous navigation
- Page number indicators

**Performance Optimization**:
- Database query optimization
- Indexing for sorting efficiency
- Caching strategies for feeds
- Lazy loading support

### Feed Display

**Post List Items**:
- Title and author information
- Community name and link
- Vote score and comment count
- Relative time display
- Content preview based on post type

**Visual Elements**:
- Thumbnail images for image posts
- Domain names for link posts
- Text content excerpt for text posts
- Score color coding
- Visual indicators for vote state

---

## 10. Moderation System

Moderation system requirements including roles, permissions, and moderation actions including bans and community management.

### Moderator Roles

**Ownership Hierarchy**:
- Community creator is owner (highest authority)
- Owner can add moderators to community
- Owner can remove moderators from community
- Moderators cannot remove owner
- Moderators cannot remove each other

**Permission Levels**:
- Owner: All moderation permissions
- Moderator: Content and user management
- Member: Standard user permissions
- Guest: No moderation permissions

**Role Assignment**:
- Automatic assignment on community creation
- Manual assignment by owner
- Permission verification on all actions
- Role inheritance for access control

### Permission Hierarchy

**Access Control Matrix**:
- Owner: Full access to moderation tools
- Moderator: Content deletion and user bans
- Member: No moderation capabilities
- Guest: No moderation capabilities

**Permission Verification**:
- Action permission checked before execution
- Role hierarchy enforced
- Owner protection from moderator actions
- Security validation on all operations

### Moderation Actions

**Content Management**:
- Delete posts in community
- Delete comments in community
- Content removal notification
- Removal reason tracking

**User Management**:
- Ban users from community
- Unban users from community
- View banned user list
- Ban reason documentation

**Report Management**:
- View community reports
- Approve reports (delete content)
- Dismiss reports (keep content)
- Report resolution tracking

### Ban System

**Ban Creation**:
- Moderator or owner can ban users
- Ban reason must be provided
- Ban applies to all community interactions
- Banned user notification

**Ban Effects**:
- Cannot create posts in banned community
- Cannot create comments in banned community
- Can still view community content
- Cannot vote on banned community content
- Cannot subscribe to banned community

**Ban Removal**:
- Moderator or owner can unban users
- Unban reason may be provided
- User permissions restored
- Ban history maintained

### Community Settings

**Moderator Management**:
- Add new moderators
- Remove existing moderators
- Transfer community ownership
- Moderator permission assignment

**Community Configuration**:
- Community name and description
- Community icon upload
- Privacy settings
- Posting requirements

---

## 11. Reporting System

Reporting system requirements for content flagging and moderator review including reporting process and resolution workflow.

### Reporting Process

**Report Creation**:
- Authenticated users can report any post or comment
- Reporting requires providing reason text
- Report captures reporter identity
- Report associates with content and timestamp

**Report Information**:
- Reported content details
- Reporter username and ID
- Reason text provided by reporter
- Content type (post or comment)
- Reporting timestamp

**Report Validation**:
- Report acceptance confirmation
- Duplicate prevention
- Invalid content filtering
- Report integrity verification

### Report Viewing

**Moderator Access**:
- Moderators can view reports for their communities
- Report list shows all community reports
- Report details include content preview
- Sorting and filtering options available

**Report Information Display**:
- Reported content preview
- Reporter information
- Reason text
- Report timestamp
- Content type and location

**Report Management**:
- Report list organization
- Unread report indicators
- Report priority flags
- Report status tracking

### Moderator Review Actions

**Approve Report**:
- Moderator confirms report validity
- Content deletion executed
- Notification to reporter
- Report marked resolved
- Deletion reason recorded

**Dismiss Report**:
- Moderator determines report invalid
- Content preserved
- Notification to reporter
- Report marked dismissed
- Dismissal reason recorded

**Report Resolution**:
- All reports require resolution
- Unresolved reports remain visible
- Resolution tracking system
- Audit trail maintained

### Report Resolution

**Resolution Workflow**:
- Reports marked pending on creation
- Moderators review pending reports
- Resolution action taken by moderator
- Report status updated to resolved

**Resolution Tracking**:
- Report history maintained
- Resolution timestamps recorded
- Moderator accountability
- Report statistics collection

### Report History

**Audit Trail**:
- Complete report history maintained
- Action history for each report
- Moderator actions logged
- Resolution statistics tracked

**Data Retention**:
- Report history preserved
- Dismissed reports archived
- Report analytics collected
- Privacy compliance maintained

---

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*
