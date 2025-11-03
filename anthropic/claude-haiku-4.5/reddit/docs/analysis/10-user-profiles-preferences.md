# User Profiles & Preferences Requirements

## 1. User Profile Information

### 1.1 Core Profile Data
THE user profile system SHALL capture and maintain the following core information for each authenticated member:

- **User ID**: Unique system identifier (automatically assigned at registration)
- **Username**: Unique identifier chosen by user at registration, 3-20 alphanumeric characters
- **Email Address**: Primary contact email (verified during registration)
- **Account Created Date**: Timestamp of account creation (automatically recorded)
- **Last Active Timestamp**: Most recent user activity timestamp (automatically updated)
- **Account Status**: Current state (active, suspended, banned)

### 1.2 Profile Enhancement Data
WHEN a member completes profile setup, THE system SHALL allow storage of optional profile enrichment information:

- **Display Name**: Full name or pseudonym (up to 50 characters, can differ from username)
- **Bio/About Me**: User-written description (up to 500 characters)
- **Avatar Image**: User's profile picture (supported formats: JPEG, PNG; max size 5MB)
- **Banner Image**: Profile header background image (supported formats: JPEG, PNG; max size 10MB)
- **Location**: User's geographic location or city (optional, up to 100 characters)
- **Website URL**: Personal or professional website link (optional, up to 255 characters, must be valid URL format)
- **Interests/Interests Tags**: User-defined interest categories (up to 10 tags, each max 50 characters)

### 1.3 Profile Verification & Badges
THE system SHALL track and display user verification status and badges on profiles:

- **Email Verified**: Boolean indicating whether email verification is complete
- **Phone Verified**: Boolean indicating optional phone verification completion
- **Account Age Badge**: Automatically awarded badges based on account tenure (e.g., "90-Day Member", "1-Year Member")
- **Moderator Badge**: Displayed when user is community moderator
- **Admin Badge**: Displayed for platform administrators

### 1.4 Profile Data Integrity Requirements
WHEN storing profile data, THE system SHALL enforce these constraints:

- Username cannot be changed after initial selection (immutable after registration)
- Email address can be changed but requires re-verification of new email address
- Account creation date is immutable and cannot be edited
- Last active timestamp is automatically updated on every user action (cannot be manually set)
- Account status changes must be logged with timestamp and reason
- Profile data must be consistent across all system components within 5 seconds of update

---

## 2. Profile Customization Options

### 2.1 Avatar & Banner Customization
WHEN a member uploads an avatar or banner image, THE system SHALL:

- Accept JPEG and PNG formats only
- Limit avatar file size to 5MB
- Limit banner file size to 10MB
- Automatically resize and optimize images for web display
- Store original and thumbnail versions for performance
- Allow image cropping and repositioning before final upload
- Display the uploaded image immediately on the user's profile
- Provide ability to remove/reset to default avatar or banner
- Store upload date and allow version history (optional feature)

### 2.2 Profile Theme & Color Customization
WHERE a member has profile customization enabled, THE system SHALL allow:

- Light mode or dark mode preference selection
- Primary accent color choice from predefined palette (10 standard colors)
- Custom background image upload (optional, max 10MB)
- Theme preference shall be applied across all views of their profile
- Theme preference shall be remembered across sessions
- Theme customization visible only to profile owner and administrators
- Override by system admins to enforce dark mode for accessibility if needed

### 2.3 Display Name & Bio Management
WHEN a member updates their display name or bio, THE system SHALL:

- Allow display name changes up to 50 characters
- Support Unicode characters in display names
- Allow bio text up to 500 characters
- Support basic text formatting in bio (bold, italic, links)
- Store edit history for moderation purposes (but display current version only)
- Validate that display name does not impersonate other users or contain offensive terms
- Show "Last Updated" timestamp for bio section
- Limit display name updates to once per 7 days to prevent impersonation abuse
- Allow moderators to flag display names that violate policies

### 2.4 Profile Sections & Content Organization
THE user profile SHALL display content in the following organized sections:

- **About Section**: Bio, location, website, interests, join date, account status badges
- **Posts Section**: User's recent posts in reverse chronological order (paginated, 20 per page)
- **Comments Section**: User's recent comments in reverse chronological order (paginated, 20 per page)
- **Communities Section**: List of communities user moderates and subscribes to
- **Saved Section**: User's bookmarked posts and comments (visible only to self and moderators)
- **Statistics Section**: Karma breakdown, post/comment counts, most active communities
- **Badges Section**: All earned badges with descriptions and unlock dates
- **Activity Graph**: Visual representation of posting activity over time (last 6 months)

### 2.5 Profile Preview & Appearance
WHEN viewing a profile, THE system SHALL:

- Display a preview card with basic info (avatar, name, karma, member since)
- Show full profile page with all sections on dedicated profile URL
- Display profile header with banner, avatar, and key statistics
- Show verification badges and moderator status prominently
- Display user status indicator (online, away, offline) if user has enabled sharing
- Show "View Profile" link accessible from user's posts and comments
- Support profile sharing with unique profile URL (e.g., /user/john_doe)

---

## 3. User Preference Settings

### 3.1 Notification Preferences
WHEN a member accesses their notification settings, THE system SHALL provide granular control over:

- **Post/Comment Replies**: Email notification when someone replies to user's post or comment (options: none, email, in-app, both)
- **Mention Notifications**: When another user mentions them using "@username" (options: none, email, in-app, both)
- **Community Posts**: New posts in subscribed communities (options: none, email digest, in-app notification, all posts real-time)
- **Saved Post Updates**: When posts they saved receive significant engagement
- **Comment Upvotes**: Milestone notifications when comments reach 10, 50, 100+ upvotes
- **Post Upvotes**: Milestone notifications when posts reach 25, 100, 500+ upvotes
- **Private Messages**: Direct communication notification preferences
- **Moderation Alerts**: For moderators, notifications of reports in their communities
- **System Announcements**: Important platform-wide announcements (cannot be disabled)
- **Notification Frequency**: Digest frequency options (real-time, daily digest, weekly digest)
- **Quiet Hours**: Time windows (e.g., 9 PM - 9 AM) when non-urgent notifications are suppressed
- **Do Not Disturb**: Toggle to disable all notifications except system-critical alerts

### 3.2 Content Display Preferences
THE system SHALL allow members to customize content display behavior:

- **Posts Per Page**: Select 10, 20, 50, or 100 posts per feed page (default: 20)
- **Comment Nesting Depth**: Display comment nesting up to 3, 5, 8, or unlimited levels (default: 8)
- **Show Thumbnails**: Toggle image/video thumbnail display in feeds (default: enabled)
- **Content Warnings**: Show or hide content flagged with content warnings (default: show)
- **NSFW Content**: Show or hide Not Safe For Work content by default (default: hide)
- **Sponsored Content**: Show or hide sponsored/promoted posts (default: show)
- **Autoplay Videos**: Toggle automatic video playback in feeds (default: disabled for bandwidth)
- **Infinite Scroll**: Enable or disable infinite scroll vs. pagination (default: pagination)
- **Sort Order Defaults**: Set preferred default sorting for each feed type (Hot, New, Top, Controversial)
- **Expand Media**: Auto-expand images/videos or require click to view (default: require click)

### 3.3 Interface & Theme Preferences
WHERE a member customizes their interface, THE system SHALL support:

- **Color Theme**: Light mode, dark mode, or system default (default: system default)
- **Compact Mode**: Condensed layout with reduced spacing (boolean toggle)
- **Font Size**: Small, normal, large, or extra-large (default: normal)
- **Language/Locale**: User's preferred language from available options (default: en-US)
- **Date Format**: MM/DD/YYYY, DD/MM/YYYY, or YYYY-MM-DD (default: based on locale)
- **Time Format**: 12-hour or 24-hour display (default: based on locale)
- **Timezone**: User's timezone for timestamp display (default: detected from browser)
- **Reduce Motion**: Disable animations and transitions for accessibility (default: enabled)
- **High Contrast**: Enable high contrast mode for accessibility (default: disabled)
- **Font Styling**: Toggle serif/sans-serif font preference (default: sans-serif)

### 3.4 Privacy Default Preferences
THE system SHALL allow members to set default privacy levels for new content:

- **Default Post Visibility**: Public or communities-only (default: public)
- **Default Comment Visibility**: Public or followers-only (default: public)
- **Allow Direct Messages**: From anyone, followers only, or nobody (default: from anyone)
- **Allow Profile Browsing**: Everyone, registered members only, or nobody (default: everyone)
- **Show Activity Status**: Display when user is online (boolean, default: enabled)
- **Show Last Active Time**: Display exact last active time or just "active today" (default: hidden)
- **Profile Discovery**: Allow appearing in search and recommendations (boolean, default: enabled)
- **Email Marketing**: Receive promotional emails and newsletters (boolean, default: disabled)

### 3.5 Advanced Preference Options
THE system SHALL provide advanced customization for power users:

- **Custom Filters**: Create saved feed filters combining multiple criteria (e.g., "technology + unread")
- **Keyword Muting**: Mute posts/comments containing specific keywords (max 50 muted keywords)
- **Flair Filtering**: Filter by user flair or community-specific badges
- **Older Posts Threshold**: Don't show posts older than N days (customizable, 1-365 days)
- **Content Type Filtering**: Filter by post type (text, link, image) in feeds
- **Community Exclusions**: Exclude specific communities from all feeds (blacklist up to 50)
- **Community Prioritization**: Promote posts from specific communities (whitelist up to 20)

---

## 4. Privacy & Visibility Controls

### 4.1 Profile Visibility Levels
THE system SHALL support three profile visibility settings:

**1. Public Profile** (Default):
- Visible to guest and member users
- All posts and comments visible unless individually marked private
- Profile statistics visible to all
- Can appear in community member lists
- Can be discovered through search and user recommendations
- Email address hidden from non-authenticated users
- Website link visible and clickable

**2. Private Profile**:
- Visible only to followers/friends (if friend system exists)
- Posts and comments hidden from non-followers
- Profile statistics hidden from public view
- Cannot appear in public community member lists
- Cannot be discovered through search by non-followers
- Email address completely hidden
- Website link visible but with privacy notice

**3. Anonymous Profile**:
- No profile page displayed or minimal information
- Posts and comments visible but not attributed to profile
- Profile statistics not displayed
- Cannot appear in any member lists
- Not discoverable through search
- Cannot be followed or messaged
- Display as "Anonymous User" or pseudonym only

### 4.2 Activity History Visibility
WHEN a member configures activity history settings, THE system SHALL support:

- **Post History Visibility**: Show all, only recent (last 30 days), or hide entirely
- **Comment History Visibility**: Show all, only recent (last 30 days), or hide entirely
- **Voting History Visibility**: Show votes to public, followers only, or hide (default: hide)
- **Community Membership Display**: Show subscribed communities, moderator communities only, or hide entirely
- **Last Active Display**: Show exact time, show "within 24 hours", or hide (default: hide for privacy)
- **Saved Content Visibility**: Show saved collection to self only, or optionally share with followers
- **Statistics Visibility**: Show karma/stats to all, members only, or self only

### 4.3 Content Visibility Filtering
WHEN a user visits a member's profile, THE system SHALL apply visibility rules:

- IF the profile owner has post history visibility set to "hide entirely", THEN no posts section shall be displayed
- IF a post is marked private/deleted, THEN it shall not appear on profile even if user has view permission
- IF viewing user is profile owner, THEN all content shall be visible regardless of visibility settings
- IF viewing user is community moderator, THEN deleted/removed content shall be visible with removal reason
- IF viewing user is platform admin, THEN all content including deleted/archived shall be visible with complete history
- IF viewing user is blocked, THEN profile shall not be accessible and return "profile not found" message
- IF viewing user is muted, THEN profile is accessible but their comments/votes are not shown to profile owner

### 4.4 Blocking & Muting Functionality
THE system SHALL provide user interaction controls:

- **Block User**: Prevent blocked user from viewing profile, messaging, or interacting with content
  - Blocked user cannot see any posts or comments by blocker
  - Blocked user cannot vote on blocker's content
  - Block is one-way: blocker can still view blocked user's public content
  - Blocker can manage blocked users list privately
  - Block can be removed at any time by blocker

- **Mute User**: Hide posts and comments from muted user but maintain ability to view their profile
  - Posts and comments by muted user don't appear in blocker's feeds
  - Muted user can still message blocker (if messaging enabled)
  - Muted user doesn't know they've been muted
  - Mute can be managed from user's feed or profile

- **Report User**: Flag user account for inappropriate behavior (reported to moderators and admins)
  - Report includes reason and optional evidence
  - Reported user is not notified of report
  - Multiple reports trigger escalated review

- **Blocked Users List**: Members can view and manage their blocked users (visible only to self)
- **Muted Users List**: Members can view and manage their muted users (visible only to self)

### 4.5 Data Export & Account Management
WHERE a member requests data export, THE system SHALL support:

- **Export User Data**: Download complete user data in portable format (JSON or CSV)
  - All posts and comments with timestamps and metadata
  - All profile information and customization settings
  - All settings and preferences
  - Account history including login timestamps
  - Voting history and saved content list
  - Report history (reports submitted by user)
  - Export file must be secure and only accessible via authenticated link

- **Delete Account**: Permanent account deletion with 30-day grace period before actual deletion
  - User data marked for deletion but retained for 30 days
  - User receives confirmation email
  - Can restore account within 30-day window by logging in
  - After 30 days, all personal data permanently deleted
  - Posts and comments anonymized but retained for community continuity
  - No recovery possible after 30-day window

- **Download Profile Archive**: One-click download of all user-created content
  - Includes all posts, comments, and saved items
  - Structured export in ZIP file with organized folders
  - Includes metadata for each item (timestamps, karma, responses)

---

## 5. User Activity History

### 5.1 Activity Timeline & Chronological Display
THE user profile SHALL display activity in reverse chronological order with the following tracked events:

- **Posts Created**: Each post with title, community, timestamp, upvote count, comment count
- **Comments Created**: Each comment with parent post/comment link, timestamp, upvote count
- **Communities Joined**: Timeline of community subscriptions with join date and member count context
- **Communities Moderated**: Timeline of moderation role assignments with role type
- **Achievements Unlocked**: Timeline of badge awards, milestone reached, and tier changes
- **Account Milestones**: Account anniversary dates and tenure badges
- **Voting Activity**: Optional display of upvotes and downvotes if voting history is public
- **Saved Content**: Timeline of bookmarked posts and comments (if sharing is enabled)
- **Profile Changes**: When display name, bio, or avatar changed (with before/after if public)

### 5.2 Saved Content Management
WHEN a member saves posts or comments, THE system SHALL:

- Store saved content in user's "Saved" collection
- Allow members to organize saved content by custom collection/folder (e.g., "Reading List", "To Investigate")
- Display saved content in reverse chronological order by save date
- Allow unsaving content with single action or batch unsaving
- Show total count of saved items in profile statistics
- Let users export their saved content collection in multiple formats
- Preserve saved items even if original post is deleted (show deletion notice)
- Support tagging saved items with custom labels
- Enable searching within saved collections
- Allow sharing specific saved collections with public link (optional)

### 5.3 Voting History Management
WHERE a member has voting history visibility enabled, THE system SHALL:

- Display all posts and comments user has upvoted (separate from overall voting history)
- Display all posts and comments user has downvoted (separate section)
- Show voting date and current vote count
- Allow users to change vote at any time (upvote → downvote or vice versa)
- Show karma contribution from votes (how many upvotes on user's content came from this member)
- Provide voting activity statistics (total upvotes given, total downvotes given)
- Display voting pattern analysis (most voted communities, types of content voted on)

### 5.4 Community Participation Tracking
THE system SHALL track and display community participation:

- **Communities Subscribed**: List of all communities user follows with join date
- **Communities Moderated**: Communities where user has moderator role with role type
- **Most Active Communities**: Top 5 communities by user post/comment count with contribution percentage
- **Community Contribution Stats**: For each community: post count, comment count, karma earned, member rank
- **Community Badges**: Special badges for high-volume contributors in specific communities
- **Community Role History**: Timeline of when roles were assumed and removed
- **Community Ban/Restriction Status**: Show if user is banned or restricted in any communities

### 5.5 Activity Statistics & Trends
THE system SHALL calculate and provide activity insights:

- **Daily Activity Heatmap**: Visual representation showing posting activity by day of week and hour of day
- **Activity Trend**: Chart showing monthly post/comment volume over past 12 months
- **Engagement Trend**: Chart showing average upvotes received per post over time (identifies increasing/decreasing engagement)
- **Karma Velocity**: Rate of karma accumulation over time (karma per month, per week)
- **Most Active Period**: Identify when user is most active (best times for community engagement)

---

## 6. Profile Statistics & Analytics

### 6.1 Karma Display & Breakdown
THE user profile SHALL prominently display karma with detailed breakdown:

- **Total Karma**: Sum of all karma sources with large, prominent display
  - Displayed in header section where highly visible
  - Updated in real-time as votes are received
  - Links to karma explanation/help documentation

- **Post Karma**: Total karma from posts (upvotes - downvotes)
  - Shows net karma contribution from post creation
  - Percentage of total karma from posts

- **Comment Karma**: Total karma from comments (upvotes - downvotes)
  - Shows net karma contribution from commenting
  - Percentage of total karma from comments

- **Community Karma**: Separate karma scores for each community where user has participated (if enabled)
  - Shows user's expertise in specific communities
  - Sorted by highest karma first
  - Shows percentage of total karma earned in that community

- **Karma Breakdown Chart**: Visual representation of karma sources over time
  - Stacked chart showing posts vs. comments contribution
  - Trend line showing karma growth over past 6 months
  - Pie chart showing community breakdown (if applicable)

- **Karma Rank**: User's rank compared to all platform users (e.g., "Top 5%", "Top 1000")
  - Percentile ranking
  - Comparative stats (e.g., "better than 95% of users")
  - Trend (improving/stable/declining over past month)

- **Recent Karma Activity**: List of recent posts/comments that earned significant karma
  - Shows last 5 posts/comments with karma received
  - Links to each item for context

### 6.2 Contribution Statistics
THE profile statistics section SHALL display:

- **Total Posts**: Count of all posts created by user with activity trend
- **Total Comments**: Count of all comments created by user with activity trend
- **Average Post Length**: Mean character count of user's posts
- **Average Comment Length**: Mean character count of user's comments
- **Most Upvoted Post**: Link to user's highest-voted post with karma count
- **Most Upvoted Comment**: Link to user's highest-voted comment with karma count
- **Total Upvotes Received**: Cumulative upvotes on all user's posts and comments
- **Total Downvotes Received**: Cumulative downvotes on all user's posts and comments
- **Upvote Ratio**: Percentage of votes that are upvotes (e.g., "87% upvotes")
- **Post Success Rate**: Percentage of posts with positive karma (more upvotes than downvotes)
- **Average Engagement**: Average upvotes per post and per comment
- **Most Active Communities**: Top 3 communities by post/comment count

### 6.3 Participation Metrics
THE system SHALL calculate and display community participation:

- **Member Since**: Display account creation date in user-friendly format (e.g., "Joined 2 years ago")
- **Days Active**: Count of unique days user has posted or commented
- **Posts Per Week**: Average number of posts created per week (calculated over past month)
- **Comments Per Week**: Average number of comments created per week (calculated over past month)
- **Comment-to-Post Ratio**: Percentage split between commenting and posting activity
- **Participation Trend**: Chart showing activity levels over months (last 6 months)
- **Peak Activity Days**: Show which days of week user is most active
- **Peak Activity Hours**: Show which hours of day user is most active
- **Engagement Consistency**: Measure of how consistent user's participation is (daily/weekly/sporadic)

### 6.4 Badge & Achievement Display
THE profile SHALL display all earned badges and achievements:

- **Account Age Badges**: "30-Day Member", "1-Year Member", "5-Year Member", "10-Year Member", etc.
- **Contribution Badges**: "100 Posts", "500 Comments", "10K Karma", "100K Karma", etc.
- **Community Badges**: "Top Contributor in [Community]", "Community Veteran", etc.
- **Moderation Badges**: "Community Moderator", "Platform Administrator"
- **Special Achievement Badges**: One-time accomplishments (e.g., "First Post", "Gilded Content")
- **Verification Badges**: "Email Verified", "Phone Verified"
- **Badge Display**: Each badge shows icon, name, description, and date earned
- **Badge Timeline**: Optional chronological list of when badges were earned
- **Badge Categories**: Organize badges by type (longevity, contribution, moderation, achievements)
- **Hidden Badges**: Some badges may be hidden until earned (progress indicators optional)

### 6.5 Reputation Tier Display
THE system SHALL prominently display user's reputation tier:

- **Tier Level**: Display current tier (Bronze, Silver, Gold, Platinum, Diamond)
- **Tier Badge**: Visual representation of tier with icon and color
- **Progress to Next Tier**: Show karma progress toward next tier (e.g., "850/1000 to Silver")
- **Tier History**: Timeline of when user achieved each tier
- **Tier Privileges**: Show what features/capabilities are unlocked at current tier
- **Tier Comparison**: How user's tier compares to platform average

---

## 7. User Settings Management

### 7.1 Settings Update Workflows
WHEN a member updates any preference or profile setting, THE system SHALL:

- Save changes immediately upon submission
- Display success confirmation message with details of what changed
- Persist settings across browser sessions and devices
- Apply changes in real-time across all active user sessions
- Create audit log entry for sensitive changes (email, password)
- Send confirmation email for major account changes (email, password, account deletion)
- Revert changes if user clicks undo within 30 seconds of change
- Display all recent changes on settings page with ability to revert individually

### 7.2 Preference Inheritance & Defaults
THE system SHALL implement the following preference defaults:

- **New Account Defaults**: When account created, apply sensible defaults:
  - Light/system theme enabled
  - Notifications for replies and mentions enabled
  - Public profile visibility
  - NSFW content hidden
  - Standard 20 posts per page
  - Real-time notifications disabled (digest preferred)

- **Preference Inheritance**: Where applicable, community-specific preferences inherit from user defaults
- **Reset to Defaults**: Members can reset any preference category to system defaults with single button
- **Import/Export Preferences**: Users can export preferences to backup and import on new device

### 7.3 Settings Validation & Limits
WHEN validating user settings, THE system SHALL enforce:

- **URL Validation**: Website URLs must be valid HTTP/HTTPS format
- **Email Validation**: Email addresses must be valid format and verified
- **Image Size Validation**: Uploaded images must not exceed size limits
- **Text Length Validation**: Bio, display name, and text fields must not exceed character limits
- **Tag Validation**: Interest tags must be non-empty and properly formatted
- **Color Validation**: Custom color choices must be from approved palette
- **Rate Limiting**: Prevent excessive preference changes (max 10 changes per minute per user)
- **Timezone Validation**: Must be valid IANA timezone string
- **Font Size Validation**: Must be within acceptable range (small to extra-large)
- **Number Range Validation**: Posts per page, nesting depth must be in allowed range

### 7.4 Account Security Preferences
THE system SHALL provide account security settings:

- **Password Management**: Allow password change with current password verification
  - New password must meet complexity requirements
  - Old password required to prevent unauthorized changes
  - Password change confirmation email sent immediately
  - Require re-authentication after password change

- **Two-Factor Authentication (2FA)**: Enable/disable 2FA for account
  - Generate QR code for authenticator app pairing
  - Support TOTP (Time-based One-Time Password) via authenticator apps
  - Generate backup codes for account recovery if 2FA device lost
  - Require 2FA code on login attempts from new devices

- **Active Sessions**: View all active login sessions with device info and IP address
  - Show device type (mobile, desktop, tablet)
  - Show operating system and browser
  - Show IP address and geolocation
  - Show last activity timestamp for each session
  - Allow terminating specific sessions remotely

- **Remote Logout**: Force logout of specific sessions or all other sessions
  - Immediate effect without requiring user to visit those devices
  - Notification sent to terminated sessions
  - Useful for security after potential compromise

- **Login Notifications**: Email notification when account accessed from new device/location
  - Defines what constitutes "new" (new IP, new device type, etc.)
  - Can disable notifications if too frequent
  - Includes device details and login timestamp

- **Password Reset Email**: Change email address used for password recovery
  - Alternative email for password reset if primary email compromised
  - Must verify ownership of alternative email

- **Security Questions**: Optional security questions for additional account recovery
  - User sets own questions and answers
  - Questions stored securely and used for account verification
  - Can be changed at any time

### 7.5 Data Management Options
WHERE a member manages their account data, THE system SHALL support:

- **Account Deactivation**: Temporarily disable account without deletion
  - All posts remain visible but marked as from "deactivated user"
  - Cannot login during deactivation period (flexible duration: 1 day to 1 year)
  - Can reactivate by logging in within 1 year
  - Profile hidden from searches and recommendations during deactivation
  - Communities can still be managed if user is moderator

- **Permanent Deletion**: Permanently delete all account data (non-reversible after 30 days)
  - Posts and comments retained for community preservation but author anonymized
  - Profile information deleted
  - Personal data purged after 30 days grace period
  - Display as "[Deleted User]" on all content
  - Cannot create new account with same email for 6 months

- **Data Portability**: Export all user data in machine-readable format
  - JSON and CSV export options
  - Includes all posts, comments, profile data, preferences
  - Includes timestamps, karma, engagement metrics
  - Downloadable as single archive file
  - Can be imported to compatible platforms (if supported)

- **GDPR Compliance**: Right to be forgotten process for applicable jurisdictions
  - Immediate deletion of personal data upon request (with verification)
  - Data retention exceptions for legal/compliance purposes clearly documented
  - Confirmation of deletion provided to user
  - No recovery option after right to be forgotten is exercised

---

## 8. Functional Requirements in EARS Format

### 8.1 Profile Viewing Requirements

WHEN a guest user views a public member profile, THE system SHALL display:
- Username, display name, and avatar
- Profile bio and customization information
- Account age and verification badges
- Public activity statistics (karma, post count, comment count)
- Recent public posts and comments (last 20)
- List of public community memberships
- Moderator status in communities (if applicable)

WHEN a member views another member's profile, THE system SHALL:
- Apply all privacy visibility settings of the viewed profile
- Display profile actions (message, follow, block, mute, report) if applicable
- Show mutual community memberships if applicable
- Indicate if viewing user has blocked or muted the profile owner
- Show relative karma comparison (if both users' stats are public)

WHEN a member views their own profile, THE system SHALL:
- Display all profile information including private sections
- Show edit button for all customizable elements
- Display all preference and setting options
- Show complete activity history regardless of visibility settings
- Provide access to account settings and data management
- Show draft posts and archived content (if applicable)
- Display notifications about profile updates or changes

### 8.2 Profile Update Requirements

WHEN a member updates their profile information, THE system SHALL:
- Validate all input according to specified constraints
- Save changes to the database immediately
- Return success response with updated data
- Create audit log of the change
- Apply changes visible immediately on profile page
- Show confirmation message specifying what changed

IF a member attempts to use an already-claimed username, THEN THE system SHALL:
- Reject the change and return error message: "Username already taken"
- Suggest alternative usernames (via algorithm)
- Require user to choose different username

IF a member uploads an image exceeding size limits, THEN THE system SHALL:
- Reject the upload
- Display error message with file size limit: "Image must be less than 5MB"
- Allow user to resize/compress image before retry
- Provide link to image compression tool or guidance

IF a member enters invalid data (malformed URL, too long bio), THEN THE system SHALL:
- Reject the update without applying partial changes
- Display specific error message indicating which field failed
- Highlight the problematic field in the form
- Provide guidance on how to fix the issue

### 8.3 Preference Update Requirements

WHEN a member updates their notification preferences, THE system SHALL:
- Save preference changes immediately
- Apply new preferences to all future notifications
- Display confirmation of which preferences were changed
- Allow granular control for each notification type
- Show preview of how the change will affect notifications

WHEN a member enables two-factor authentication, THE system SHALL:
- Generate QR code for authenticator app scanning
- Display setup instructions clearly
- Verify 2FA code from user's app before activation (test code)
- Store 2FA configuration securely with encryption
- Generate and provide backup codes (10-16 codes)
- Require 2FA on next login attempt
- Send confirmation email that 2FA has been enabled

WHEN a member changes their password, THE system SHALL:
- Require current password for verification
- Validate new password meets complexity requirements
- Hash new password before storage
- Invalidate all existing sessions except current one
- Send email confirmation of password change
- Optionally notify about login from current device
- Log password change in audit trail

### 8.4 Activity History Requirements

WHEN a member views their saved posts collection, THE system SHALL:
- Display all saved posts in reverse chronological order by save date
- Show original post metadata (title, community, timestamp, current karma)
- Highlight posts that have been deleted (with deletion notice)
- Allow removing posts from saved collection with single action
- Support filtering by community or date range
- Show total count of saved items
- Allow searching within saved content by keywords

WHEN displaying a member's post history, THE system SHALL:
- Show posts in reverse chronological order
- Display pagination controls (default 20 per page)
- Show post title, community, creation date, and current karma
- Allow filtering by community or date range
- Include search functionality within history
- Show deleted posts with "[Deleted by author]" marker (to self only)
- Provide link to each post for viewing or editing

WHEN a member accesses their voting history, THE system SHALL:
- Display chronological list of upvoted posts/comments
- Display chronological list of downvoted posts/comments
- Show voting date and current karma count
- Link directly to each voted-on item
- Allow filtering by vote type (up/down) or date range
- Show total upvotes given and downvotes given

### 8.5 Privacy Control Requirements

WHEN a member sets profile to private, THE system SHALL:
- Restrict profile viewing to approved followers only
- Hide profile from public search results
- Remove profile from community member listings
- Change visibility of all existing posts to private unless individually set
- Notify followers that profile is now private
- Prevent new followers unless approved
- Show profile owner's public communities but hide member list

WHEN a member blocks another user, THE system SHALL:
- Prevent blocked user from viewing their profile (return "Not found" message)
- Remove any existing direct messages (history retained but not visible)
- Prevent blocked user from upvoting/downvoting their content
- Prevent blocked user from commenting on their posts
- Hide all content by the blocked user from the blocker's feeds (if enabled)
- Notify both parties if block notifications are enabled
- Block is persistent until explicitly unblocked

WHEN a member reports a user, THE system SHALL:
- Capture report reason and description
- Create report record with timestamp and evidence
- Notify platform admins of the report
- Add report to user's moderation history
- Send confirmation to reporter that report was received
- Do not notify reported user of the report (unless escalated)

---

## 9. Business Rules & Validation

### 9.1 Profile Data Constraints

- Username must be 3-20 characters, alphanumeric only, no spaces
- Username must be unique across entire platform (case-insensitive)
- Username cannot contain offensive terms (validated against blocklist)
- Display name can be 0-50 characters, supports Unicode and emoji
- Bio must be 0-500 characters
- Email must be unique and verified before profile completion
- Email verification must occur within 24 hours of registration
- Avatar and banner images must be JPEG or PNG format only
- Avatar max size: 5MB; Banner max size: 10MB; Custom background: 10MB
- Location field must be 0-100 characters, no special characters
- Website URL must be valid HTTP/HTTPS URL format
- Website URL must be from publicly resolvable domain (no localhost, internal IPs)
- URL must not be malware/phishing URL (checked against blocklists)
- Interest tags: max 10 tags, each 50 characters max
- Interest tags must be non-empty and consist of valid characters
- No user can have two accounts active simultaneously
- Duplicate accounts (same email, similar username) require admin review
- Account must be 24 hours old before moderator role can be assigned
- Account must have minimum 100 karma before becoming moderator
- Profile customization (theme, layout) limited to 10 active preferences per user

### 9.2 Preference Constraints

- Users can have maximum 10 interest tags
- Each interest tag maximum 50 characters
- Notification preferences changes apply within 1 second
- Theme preference must be from approved list (light, dark, system, custom)
- Custom color must be from approved 10-color palette
- Timezone must be valid IANA timezone string
- Posts per page can only be 10, 20, 50, or 100
- Comment nesting depth can only be 3, 5, 8, or unlimited
- Quiet hours must be valid time range (no overlapping periods)
- Muted keywords limit: 50 keywords maximum per user
- Community exclusion list limit: 50 communities maximum per user
- Community prioritization list limit: 20 communities maximum per user
- Older posts threshold: 1-365 days valid range

### 9.3 Privacy Rules

- Private profiles still allow moderators and admins to view content for moderation purposes
- Blocked users can still view public community posts but not interact with blocker's content
- Blocked users cannot see blocker's profile, posts, or comments in any context
- Muted users' content is hidden from feeds but user can still message muter (if messaging enabled)
- Deleted accounts mark all posts/comments as "deleted by user" or anonymized within 24 hours
- Moderators can view private/hidden content for moderation purposes
- Platform admins can view all content regardless of privacy settings
- Blocking is one-way: blocker can still see blocked user's public content
- Muting is one-way: muted user doesn't know they've been muted
- Posts from blocked users do not appear in blocker's search results

### 9.4 Activity History Rules

- User activity visible to public based on privacy settings only
- Saved content remains associated with user even if original post deleted
- Saved content limit: 10,000 items per user (oldest cycle out when exceeded)
- Voting history not visible unless user explicitly enables it in preferences
- Account creation date cannot be changed or hidden (immutable)
- Last active timestamp updates only if user has taken action (posting, commenting, voting)
- Last active timestamp visible only if user has enabled "show activity status" setting
- Activity timeline displays only non-deleted content (deletions removed from timeline)
- Activity timeline searchable within past 12 months only (older activity archived)

### 9.5 Karma Display Rules

- Total karma displayed prominently on all profiles
- Community-specific karma only shown if that community enables it
- Karma never goes below zero (negative karma possible but displayed as 0 in some contexts)
- Karma calculations update in real-time when votes received (within 5 seconds)
- Deleted posts/comments retain karma visibility but show deletion notice
- Moderation actions may adjust karma (removing rule-violating post reduces karma by vote count)
- Moderators can not override karma calculations arbitrarily (only upon content removal)
- Karma decay applied for old contributions (optional, if implemented)

---

## 10. Error Handling & Edge Cases

### 10.1 Profile Access Errors

WHEN a guest attempts to view a private member profile, THE system SHALL:
- Display profile not accessible message: "This profile is private"
- Show public profile owner information only (if available)
- Offer option to follow/subscribe for access if applicable
- Provide link to send message to profile owner (if messaging enabled)

WHEN a user attempts to view a suspended or banned account profile, THE system SHALL:
- Display account suspended notice: "This account has been suspended"
- Show limited public information only (username, join date)
- Notify viewing user that this profile has been suspended
- Provide link to appeal process if applicable

WHEN a user's profile record is corrupted or missing, THE system SHALL:
- Return 500 error with system administrator notification
- Display generic "profile unavailable" message to user
- Log error with user ID and timestamp for investigation
- Attempt automatic data recovery from backup
- Create support ticket for manual recovery if automated recovery fails

WHEN a user attempts to access profile with invalid user ID, THE system SHALL:
- Return 404 "User not found" response
- Not reveal whether user exists (prevent user enumeration)
- Suggest user search or directory to find profile
- Log suspicious access patterns

### 10.2 Settings Conflict Errors

IF a user has contradictory settings (e.g., private profile but posts public visibility), THE system SHALL:
- Apply the most restrictive setting (private profile takes precedence)
- Display warning to user about conflicting preferences
- Suggest making settings consistent
- Allow user to override if intentional

IF a user attempts to save settings with invalid values, THE system SHALL:
- Reject the update without applying partial changes
- Return specific error message indicating which field failed validation
- Restore previous valid settings (no partial updates)
- Allow user to correct and retry
- Highlight problematic field in UI

IF a user's timezone conflicts with daylight saving time settings, THE system SHALL:
- Use timezone's automatic DST adjustment (not manual override)
- Display warning if manual adjustment differs from timezone DST
- Recommend using timezone instead of manual adjustment
- Apply most recent timezone setting

### 10.3 Data Consistency Errors

IF a member's karma count becomes inconsistent with actual votes, THE system SHALL:
- Run daily reconciliation process
- Automatically correct karma to accurate count
- Log discrepancy for investigation
- Notify user if correction resulted in significant change (>100 karma points)
- Preserve audit trail of correction

IF a profile image fails to upload after validation passed, THE system SHALL:
- Preserve user's previous image
- Display error message indicating upload failure: "Image upload failed. Please try again."
- Offer retry option with link to upload again
- Log technical error for investigation
- If failure persists, escalate to support team

IF a user's email becomes unverified (e.g., bounced verification email), THE system SHALL:
- Display notification: "Email verification expired. Please re-verify to continue posting."
- Offer resend verification link button
- Limit account functionality until re-verified
- Track verification failure attempts

### 10.4 Concurrent Update Conflicts

WHEN two requests attempt to update same profile setting simultaneously, THE system SHALL:
- Use optimistic locking to detect conflicts
- Return error on second request: "Settings were updated by another session"
- Display current values and allow user to refresh and retry
- For non-critical settings, use last-write-wins strategy
- For security settings (password, 2FA), require re-authentication

WHEN a user deletes their account while edits are in progress, THE system SHALL:
- Cancel pending updates
- Proceed with account deletion
- Return deletion confirmation to user
- Ignore any settings updates that were in queue
- Log cancelled operations for audit trail

WHEN a user updates profile on multiple devices simultaneously, THE system SHALL:
- Accept updates from all devices independently
- Sync changes across devices within 5 seconds
- Last update wins for conflict resolution (with timestamp)
- Notify user if conflicting changes detected
- Preserve edit history for review

### 10.5 Privacy Violation Prevention

IF a member attempts to directly access another user's private data via API, THE system SHALL:
- Deny the request with 403 Forbidden response
- Log the access attempt with IP address and user agent
- Not reveal whether the profile exists (prevent user enumeration)
- Notify platform admins of potential attack attempt if pattern detected
- Trigger security alert if multiple attempts from same IP

IF blocked user attempts to view blocker's profile through alternate means, THE system SHALL:
- Deny access consistently across all endpoints
- Return 403 Forbidden (not 404 to avoid partial enumeration)
- Log the blocked access attempt
- Trigger security alert if excessive blocked attempts detected (10+ in 1 hour)
- Potentially apply rate limiting to the blocked user's IP

IF a user attempts to bypass privacy settings through URL manipulation, THE system SHALL:
- Reject the bypass attempt with appropriate error
- Log security violation attempt
- Notify user that privacy settings are enforced
- Report to admins if pattern of attempts detected
- Potentially apply temporary access restrictions

---

## Integration with Other Systems

### User Profiles Integration Points
- **Authentication System** (02-user-actors-authentication.md): Profile linked to user account and authentication
- **Karma & Reputation System** (07-karma-reputation-system.md): Profile displays karma and tier information
- **Moderation & Reporting System** (09-moderation-reporting.md): User reports and moderation history visible to admins on profiles
- **Content Creation** (05-content-creation-posting.md): User profiles show all user's created posts and comments
- **Community Management** (04-community-management.md): Profile shows user's community memberships and moderation roles

---

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, storage strategy, etc.) are at the discretion of the development team.*