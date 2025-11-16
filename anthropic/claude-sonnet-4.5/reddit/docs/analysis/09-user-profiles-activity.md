# User Profiles and Activity System Requirements

## 1. Introduction and System Context

### 1.1 Document Purpose and Scope

User profiles serve as the central identity and reputation hub for all platform members. The profile system aggregates user contributions (posts and comments), displays reputation metrics (karma scores), enables identity customization (avatars and bios), and provides comprehensive activity history for transparency and community trust.

This document defines complete business requirements for the user profile system, covering profile data structure, public visibility rules, activity aggregation mechanisms, customization options, account management features, privacy controls, and performance expectations. All requirements focus on business logic and user experience, leaving technical implementation decisions to the development team.

### 1.2 Profile System Business Value

The profile system delivers critical platform value:

- **User Identity**: Establishes persistent identity across communities and content contributions
- **Reputation Transparency**: Public karma scores and activity history build trust in community interactions
- **Content Attribution**: Links all posts and comments to their authors for accountability
- **Personalization**: Customizable profiles allow self-expression within community norms
- **Discovery Mechanism**: Profiles enable finding quality contributors and understanding user expertise
- **Moderation Support**: Activity history helps moderators assess user patterns and behavior
- **Engagement Incentive**: Visible reputation and contribution counts motivate quality participation

### 1.3 Integration with Platform Systems

The profile system integrates deeply with:

- **Authentication System** ([User Actors and Authentication](./02-user-actors-authentication.md)): Profile access tied to authentication state; members can edit own profiles
- **Karma System** ([Voting and Karma System](./05-voting-karma-system.md)): Profiles display real-time karma calculated from vote aggregation
- **Content System** ([Content Creation and Posts](./04-content-creation-posts.md), [Comments and Discussions](./06-comments-discussions.md)): Profiles aggregate and display all user posts and comments
- **Community System** ([Community Management](./03-community-management.md)): Profiles show moderated communities and subscription lists

### 1.4 Actor Permissions for Profile Access

**Profile Viewing Permissions**:

| Actor | View Own Profile | View Others' Profiles | Edit Profile | Access Settings |
|-------|------------------|----------------------|--------------|-----------------|
| Guest | ❌ N/A | ✅ Public profiles | ❌ No | ❌ No |
| Member | ✅ Yes | ✅ Public profiles | ✅ Own only | ✅ Own only |
| Moderator | ✅ Yes | ✅ Public profiles | ✅ Own only | ✅ Own only |

WHEN a guest user accesses a profile URL, THE system SHALL display all public profile information without requiring authentication.

WHEN an authenticated member accesses their own profile, THE system SHALL display additional management options including "Edit Profile" and "Account Settings" buttons.

WHEN an authenticated member accesses another user's profile, THE system SHALL display public information only without edit capabilities.

## 2. Core Profile Data Model

### 2.1 Required Profile Properties

THE system SHALL store the following required properties for every user profile:

**Identity Properties**:
- User ID: Unique identifier (UUID format, immutable)
- Username: Unique display name (3-20 characters, alphanumeric and underscores only, immutable after registration)
- Email: Account email address (validated format, unique, private - not displayed on public profile)
- Account creation timestamp: Exact date and time of registration (immutable)

**Reputation Properties**:
- Post karma: Integer sum of net upvotes on user's posts (real-time calculated)
- Comment karma: Integer sum of net upvotes on user's comments (real-time calculated)
- Total karma: Integer sum of post karma and comment karma (real-time calculated)

**Activity Metrics**:
- Total posts created: Integer count of all posts by user
- Total comments created: Integer count of all comments by user
- Last activity timestamp: Most recent post, comment, or vote action

**Profile Status**:
- Account status: Active, suspended, or deleted (affects profile visibility)
- Email verification status: Boolean indicating verified email

### 2.2 Optional Profile Properties

THE system SHALL support the following optional, user-customizable profile properties:

**Customization Properties**:
- Bio/About text: User-written description (maximum 500 characters, supports basic markdown)
- Avatar image URL: Reference to uploaded profile image (JPEG, PNG, GIF, WebP formats)
- Display name: Optional alternative to username for display purposes (maximum 50 characters, defaults to username if not set)

**Privacy Settings**:
- Show online status: Boolean controlling visibility of "last seen" timestamp (default: false/hidden)
- Show subscribed communities: Boolean controlling public visibility of subscription list (default: false/hidden)
- Show activity feed: Boolean controlling public visibility of posts and comments (default: true/visible)

### 2.3 Computed Profile Properties

THE system SHALL calculate the following properties dynamically when displaying profiles:

**Tenure Metrics**:
- Account age: Human-readable time since registration (e.g., "Member for 2 years, 3 months")
- Cake day indicator: Boolean indicating if today is the anniversary of account creation

**Activity Patterns**:
- Posts per month: Average post creation rate calculated from total posts divided by account age in months
- Comments per month: Average comment creation rate
- Most active communities: List of top 5 communities by user's post and comment count

**Ranking Metrics**:
- Platform-wide karma ranking: User's karma percentile among all users
- Karma milestone badges: Visual indicators for reaching 1K, 10K, 100K, 1M karma thresholds

### 2.4 Profile Data Validation Rules

**Username Validation**:

WHEN a user registers, THE system SHALL validate username meets these requirements:
- Length: 3-20 characters exactly
- Characters: Alphanumeric (a-z, A-Z, 0-9) and underscores (_) only
- Pattern: Must start with alphanumeric character (not underscore)
- Uniqueness: Case-insensitive unique across all users
- Reserved words: Cannot match system reserved words (admin, moderator, redditCommunity, etc.)

IF username validation fails, THEN THE system SHALL return specific error code and message indicating which rule was violated.

**Bio Text Validation**:

WHEN a user saves bio text, THE system SHALL validate:
- Maximum length: 500 characters (multibyte characters count as single character)
- HTML sanitization: Strip all HTML tags and JavaScript
- Markdown support: Allow basic markdown (bold, italic, links, lists) only
- Link validation: Verify URLs are properly formatted HTTP/HTTPS links

**Avatar Image Validation**:

WHEN a user uploads an avatar image, THE system SHALL validate:
- File format: JPEG, PNG, GIF, or WebP only
- File size: Maximum 5 MB
- Image dimensions: Minimum 100x100 pixels, maximum 2000x2000 pixels
- Content type verification: Validate actual file content matches declared MIME type
- Aspect ratio recommendation: Square images (1:1 ratio) recommended but not enforced

IF image validation fails, THEN THE system SHALL return specific error message indicating the validation failure reason and acceptable parameters.

## 3. Public Profile Display Requirements

### 3.1 Profile URL Structure and Routing

THE system SHALL provide clean, user-friendly profile URLs using the pattern `/u/{username}` or `/user/{username}`.

WHEN a user navigates to `/u/johndoe`, THE system SHALL display johndoe's public profile page.

THE system SHALL support tab-based navigation through URL patterns:
- `/u/{username}` or `/u/{username}/overview` - Combined posts and comments feed
- `/u/{username}/posts` - Posts-only activity view
- `/u/{username}/comments` - Comments-only activity view

WHEN a profile URL contains an invalid or non-existent username, THE system SHALL return HTTP 404 status with a "User not found" message.

THE system SHALL preserve URL query parameters for sorting and pagination (e.g., `/u/{username}/posts?sort=top&page=2`).

### 3.2 Profile Header Section Layout

THE profile page header SHALL display prominently at the top containing:

**Primary Information** (always visible):
- Avatar image: 120x120 pixels, circular crop, default placeholder if not set
- Username: Large, bold text as primary identifier
- Account age: "Redditor for X years, Y months" or "Cake day: [date]" on anniversaries
- Total karma: Prominently displayed number with formatting (e.g., "45,234 karma")

**Secondary Information** (below primary):
- Post karma: Labeled value (e.g., "Post Karma: 30,120")
- Comment karma: Labeled value (e.g., "Comment Karma: 15,114")
- Bio/About section: Full bio text if user has configured one, with markdown rendering

**Moderation Information** (if applicable):
- Moderator badge: Displayed if user moderates any communities
- Moderated communities list: Names of communities with links, showing top 5 if more than 5, with "and X more" indicator

**Action Buttons** (context-dependent):
- "Edit Profile" button: Visible only when viewing own profile
- "Account Settings" button: Visible only when viewing own profile
- "Send Message" button: Visible when viewing others' profiles (future feature placeholder)

### 3.3 Profile Visibility Rules by Actor

**Guest User Profile View**:

WHEN a guest accesses a profile, THE system SHALL display:
- All public profile information (username, karma, bio, avatar)
- Public activity feed (posts and comments if not hidden by privacy settings)
- Moderated communities list
- Account age and karma scores

THE system SHALL NOT display:
- Email address
- "Last seen" timestamp (even if user has enabled it)
- Private activity (if user disabled public activity feed)
- Edit or settings buttons

**Member Viewing Own Profile**:

WHEN a member accesses their own profile, THE system SHALL additionally display:
- "Edit Profile" button in header
- "Account Settings" link
- Private activity statistics (posts and comments they deleted)
- Complete subscription list (if not publicly visible)
- All content including posts/comments removed by moderators (marked as [removed])

**Member Viewing Another Member's Profile**:

WHEN a member accesses another member's profile, THE system SHALL display the same content as guest view with these additions:
- "Send Message" button (future feature)
- Ability to vote on posts/comments visible in activity feed
- Subscription/follow functionality (future feature)

### 3.4 Profile Activity Statistics Display

THE profile SHALL display aggregate activity counts prominently:

**Activity Counters**:
- Total posts: "X posts" with formatting for large numbers
- Total comments: "Y comments" with formatting
- Karma breakdown: "Post Karma: A | Comment Karma: B | Total: C"

**Activity Timeline Indicators**:
- Recent activity: "Active in the last 24 hours" or "Last active 3 days ago" (if privacy setting allows)
- Activity trends: "X posts this month" or "Y comments this week" (optional display)

**Achievement Badges** (visual indicators):
- Karma milestones: Badges for 1K, 10K, 100K, 1M karma
- Tenure milestones: Badges for 1 year, 5 years, 10 years membership
- Cake day indicator: Special icon displayed on account anniversary

WHEN displaying large numbers, THE system SHALL format with comma separators (e.g., "1,234,567 karma" not "1234567 karma").

## 4. Posts Activity History Requirements

### 4.1 Posts Tab Display and Organization

THE profile posts tab SHALL display all posts created by the user in reverse chronological order (newest first by default).

WHEN a user navigates to `/u/{username}/posts`, THE system SHALL display a paginated list of posts with the following information per post:

**Post List Item Display**:
- Post title: Clickable link to full post (maximum 300 characters, truncated with ellipsis if needed)
- Community name: Clickable link to community (e.g., "in r/technology")
- Post type indicator: Visual badge or icon for text/link/image posts
- Vote score: Net upvotes displayed prominently (e.g., "↑ 1,234")
- Comment count: Number of comments (e.g., "567 comments")
- Timestamp: Relative time for recent posts ("5 hours ago"), absolute date for older posts
- Post preview: First 200 characters of text posts, thumbnail for image posts, domain for link posts

**Visual Layout**:
- Compact list format optimizing for quick scanning
- Clear visual hierarchy with title most prominent
- Metadata (score, comments, time) in secondary styling
- Thumbnails (64x64 pixels) for image and link posts on the left

### 4.2 Posts Sorting Options

THE posts tab SHALL support the following sorting methods:

**Sorting Options**:
- **New** (default): Reverse chronological order by creation timestamp
- **Top**: Highest vote score first, with time filter options:
  - All Time: All posts sorted by score
  - Past Year: Posts from last 365 days sorted by score
  - Past Month: Posts from last 30 days sorted by score
  - Past Week: Posts from last 7 days sorted by score
- **Controversial**: Posts with high vote counts but close to 50% upvote ratio

WHEN a user selects a sorting option, THE system SHALL update the URL to reflect the selection (e.g., `/u/{username}/posts?sort=top&time=year`).

THE system SHALL remember the user's sorting preference within their session.

### 4.3 Posts Pagination and Performance

**Pagination Requirements**:

THE system SHALL paginate posts displaying 25 posts per page.

WHEN there are more than 25 posts, THE system SHALL display "Next Page" and "Previous Page" navigation controls.

THE system SHALL update the URL to reflect current page number (e.g., `/u/{username}/posts?page=2`).

**Performance Requirements**:

WHEN loading a profile posts tab, THE system SHALL display the first page of posts within 2 seconds under normal network conditions.

THE system SHALL implement efficient database queries using indexed lookups on user ID and creation timestamp.

WHERE a user has thousands of posts, THE system SHALL maintain consistent performance through pagination and query optimization.

### 4.4 Removed Posts Visibility

**Viewing Own Removed Posts**:

WHEN a member views their own profile posts tab, THE system SHALL display posts they created that were removed by moderators.

THE removed posts SHALL be marked with a "[removed by moderator]" indicator in red or orange.

WHEN clicking a removed post, THE system SHALL navigate to the post page where the user can see their original content with removal notice.

**Viewing Others' Removed Posts**:

WHEN any user views another member's profile posts tab, THE system SHALL hide posts that were removed by moderators.

THE system SHALL NOT display any indication that posts were removed (count reduction only).

**Deleted Posts Visibility**:

WHEN a user deletes their own post, THE system SHALL immediately remove it from their profile posts tab.

THE system SHALL update the total post count to reflect the deletion.

### 4.5 Posts Tab Empty States

WHEN a user has created zero posts, THE profile posts tab SHALL display a message:
- For own profile: "You haven't posted anything yet. Start by creating your first post!"
- For others' profile: "[Username] hasn't posted anything yet."

WHERE privacy settings hide posts from public view, THE system SHALL display: "This user has chosen to keep their posts private."

## 5. Comments Activity History Requirements

### 5.1 Comments Tab Display and Organization

THE profile comments tab SHALL display all comments created by the user in reverse chronological order (newest first by default).

WHEN a user navigates to `/u/{username}/comments`, THE system SHALL display a paginated list of comments with the following information per comment:

**Comment List Item Display**:
- Comment text: First 300 characters, with "...read more" if truncated
- Parent post title: "on [Post Title]" as clickable link
- Community name: "in r/[community]" as clickable link
- Vote score: Net upvotes (e.g., "↑ 42")
- Timestamp: Relative or absolute time
- Reply depth indicator: "↳" symbols or indentation showing if nested reply
- Context link: "View in context" link to comment in full thread

**Visual Layout**:
- Comment text emphasized for readability
- Post context shown as secondary information
- Markdown rendered for formatted comments
- Clear separation between individual comments

### 5.2 Comment Context and Navigation

**Context Display Requirements**:

WHEN displaying a comment that is a reply (not top-level), THE system SHALL show the parent comment author's username (e.g., "Replying to @parentuser").

WHERE space allows, THE system SHALL show a brief excerpt of the parent comment being replied to (maximum 100 characters).

**Navigation to Full Thread**:

WHEN a user clicks on a comment in the profile view, THE system SHALL navigate to `/r/{community}/posts/{postId}` with the specific comment highlighted and scrolled into view.

THE system SHALL use URL fragment or query parameter to identify the target comment (e.g., `#comment-{commentId}` or `?comment={commentId}`).

WHEN navigating to comment context, THE system SHALL display the full comment thread showing parent comments and replies for complete context.

### 5.3 Comments Sorting Options

THE comments tab SHALL support the following sorting methods:

**Sorting Options**:
- **New** (default): Reverse chronological order by creation timestamp
- **Top**: Highest vote score first (across all time)
- **Controversial**: Comments with high engagement but divided votes

WHEN a user selects a sorting option, THE system SHALL update the URL and re-render the comments list.

THE system SHALL preserve the selected sorting preference within the user's session.

### 5.4 Comments Pagination and Performance

**Pagination Requirements**:

THE system SHALL paginate comments displaying 50 comments per page (higher than posts due to smaller display footprint).

WHEN there are more than 50 comments, THE system SHALL provide pagination controls.

THE system SHALL update the URL to reflect the current page.

**Performance Requirements**:

WHEN loading the profile comments tab, THE system SHALL display the first page within 2 seconds.

THE system SHALL efficiently query comments using indexed lookups on user ID and timestamp.

WHERE a user has tens of thousands of comments, THE system SHALL maintain performance through pagination and query optimization.

### 5.5 Removed Comments Visibility

**Viewing Own Removed Comments**:

WHEN a member views their own profile comments tab, THE system SHALL display comments removed by moderators.

THE removed comments SHALL show full original text with a "[removed by moderator]" label.

**Viewing Others' Removed Comments**:

WHEN any user views another member's profile comments tab, THE system SHALL hide comments removed by moderators.

THE system SHALL NOT display placeholders or indicators for removed comments in the profile view.

**Deleted Comments Visibility**:

WHEN a user deletes their own comment, THE system SHALL immediately remove it from their profile comments tab.

IF the deleted comment had nested replies, THE system SHALL show placeholder "[deleted]" in the full thread context but NOT in the profile comments tab.

### 5.6 Comments Tab Empty States

WHEN a user has created zero comments, THE profile comments tab SHALL display:
- For own profile: "You haven't commented yet. Join a discussion to get started!"
- For others' profile: "[Username] hasn't commented yet."

WHERE privacy settings hide comments from public view, THE system SHALL display: "This user has chosen to keep their comments private."

## 6. Combined Overview Feed Requirements

### 6.1 Overview Tab Display

THE profile SHALL provide an "Overview" tab as the default view showing a chronologically merged feed of both posts and comments.

WHEN a user navigates to `/u/{username}` or `/u/{username}/overview`, THE system SHALL display a mixed activity feed sorted by creation timestamp (newest first).

**Feed Item Display**:

THE system SHALL visually distinguish posts from comments through:
- Type indicator: "POST" or "COMMENT" label or icon
- Different card backgrounds or borders
- Visual hierarchy emphasizing content type

FOR posts in overview:
- Display full post title
- Show post preview (text snippet, image thumbnail, or link domain)
- Display community, vote score, comment count, timestamp

FOR comments in overview:
- Display comment text (up to 300 characters)
- Show parent post title as context
- Display community, vote score, timestamp
- Include "View in context" link

### 6.2 Overview Feed Sorting

THE overview tab SHALL support sorting by:
- **New** (default): Chronological merge of all posts and comments by creation time
- **Top**: All content sorted by vote score regardless of type
- **Controversial**: All content sorted by controversial algorithm

WHEN sorting by Top or Controversial, THE system SHALL rank posts and comments together in a unified list based on their respective vote scores.

### 6.3 Overview Feed Pagination

THE system SHALL paginate the overview feed displaying 25 items per page (mixed posts and comments).

WHEN paginating, THE system SHALL maintain chronological or score-based ordering across page boundaries.

THE system SHALL update the URL to reflect page number and sorting.

### 6.4 Overview Performance Requirements

WHEN loading the overview tab, THE system SHALL display the first page within 2 seconds.

THE system SHALL efficiently merge posts and comments through a unified query or parallel queries with merge logic.

WHERE users have extensive activity, THE system SHALL use indexed queries on user ID and timestamp for optimal performance.

## 7. Karma Display and Calculation

### 7.1 Karma Score Display Requirements

THE profile header SHALL prominently display three karma values:

**Karma Display Components**:
- **Total Karma**: Sum of post karma and comment karma, displayed as large prominent number
- **Post Karma**: Labeled value showing reputation from posts
- **Comment Karma**: Labeled value showing reputation from comments

**Formatting Requirements**:

WHEN karma values exceed 999, THE system SHALL format with comma separators (e.g., "45,234").

WHEN karma is negative, THE system SHALL display with minus sign (e.g., "-42 karma").

WHEN karma reaches milestone thresholds, THE system SHALL display badge indicators:
- 1,000 karma: Bronze badge
- 10,000 karma: Silver badge
- 100,000 karma: Gold badge
- 1,000,000 karma: Platinum badge

### 7.2 Real-Time Karma Calculation

THE karma values displayed on profiles SHALL be calculated in real-time from current vote data.

**Calculation Formula**:

Post Karma = SUM(upvotes - downvotes) for all posts by user
Comment Karma = SUM(upvotes - downvotes) for all comments by user
Total Karma = Post Karma + Comment Karma

**Update Frequency**:

WHEN a user's post or comment receives a vote, THE system SHALL recalculate karma values immediately.

WHEN a profile page is loaded, THE system SHALL query current vote totals to compute up-to-date karma.

THE system SHALL cache karma calculations for performance, with cache invalidation on vote events affecting the user's content.

### 7.3 Karma Persistence for Deleted Content

WHEN a user deletes a post, THE system SHALL retain the karma earned from that post in their total karma.

WHEN a moderator removes content, THE system SHALL continue counting karma from removed content.

THE system SHALL NOT reverse karma when content is deleted or removed, as karma represents historical community reception.

### 7.4 Karma Display Edge Cases

WHEN a newly registered user has zero posts and comments, THE system SHALL display "0 karma" for all values.

WHERE a user has negative karma (more downvotes than upvotes), THE system SHALL display the negative value honestly without floor limits.

WHEN calculating karma for users with hundreds of thousands of posts/comments, THE system SHALL use efficient aggregation queries to prevent performance degradation.

## 8. Profile Customization System

### 8.1 Edit Profile Access and Interface

WHEN a member views their own profile, THE system SHALL display an "Edit Profile" button in the profile header.

WHEN clicking "Edit Profile", THE system SHALL navigate to `/settings/profile` or display an edit modal overlay.

THE edit profile interface SHALL provide form fields for:
- Avatar image upload
- Bio/About text editor
- Display name input (optional alternative to username)

### 8.2 Avatar Image Upload Workflow

**Upload Interface Requirements**:

THE edit profile form SHALL provide an avatar upload section with:
- Current avatar preview (120x120 pixels circular crop)
- "Change Avatar" or "Upload Image" button
- File size and format requirements displayed (5 MB max, JPEG/PNG/GIF/WebP)
- Recommended dimensions guidance (square, minimum 100x100 px)

**Upload Process**:

WHEN a user clicks "Upload Image", THE system SHALL open a file picker allowing image selection.

WHEN a user selects an image file, THE system SHALL:
1. Validate file format and size before upload
2. Display upload progress indicator
3. Show preview of selected image
4. Provide "Crop" tool for square aspect ratio adjustment (optional)
5. Display "Save" and "Cancel" buttons

**Validation and Error Handling**:

IF selected file exceeds 5 MB, THEN THE system SHALL display error: "Image must be smaller than 5 MB. Please choose a smaller file or compress your image."

IF selected file is not JPEG/PNG/GIF/WebP, THEN THE system SHALL display error: "Unsupported format. Please upload a JPEG, PNG, GIF, or WebP image."

IF image dimensions are below 100x100 pixels, THEN THE system SHALL display warning: "Image is very small and may appear blurry. Recommended minimum size is 100x100 pixels."

**Save and Apply**:

WHEN a user saves a new avatar, THE system SHALL:
1. Upload image to storage service
2. Generate image URL
3. Update user profile record with new avatar URL
4. Invalidate cached profile images
5. Display confirmation message: "Avatar updated successfully"
6. Immediately show new avatar in profile header

**Default Avatar Handling**:

WHEN a user has not uploaded an avatar, THE system SHALL display a default placeholder based on username initials or randomly generated pattern.

THE system SHALL provide a "Remove Avatar" option to revert to default after uploading.

### 8.3 Bio/About Text Editor

**Editor Interface**:

THE edit profile form SHALL provide a bio text area with:
- Multi-line text input supporting up to 500 characters
- Character counter displaying remaining characters (e.g., "245 / 500")
- Markdown formatting toolbar for bold, italic, links, lists
- Preview pane showing rendered markdown

**Markdown Support**:

THE bio editor SHALL support the following markdown syntax:
- **Bold**: `**text**` or `__text__`
- *Italic*: `*text*` or `_text_`
- Links: `[text](url)`
- Unordered lists: `- item` or `* item`
- Ordered lists: `1. item`
- Line breaks: Two spaces at end of line or blank line for paragraph

**Validation Requirements**:

WHEN a user types in the bio field, THE system SHALL update the character counter in real-time.

IF bio text exceeds 500 characters, THEN THE system SHALL:
- Highlight the character counter in red
- Prevent saving until count is reduced
- Display error message: "Bio is too long. Maximum 500 characters."

WHEN saving bio text, THE system SHALL:
- Strip HTML tags and JavaScript for security
- Preserve valid markdown syntax
- Validate all URLs in markdown links
- Remove excessive consecutive line breaks (max 2 blank lines)

**Save and Display**:

WHEN a user saves bio changes, THE system SHALL:
- Update profile record immediately
- Invalidate profile cache
- Render markdown to HTML for public display
- Show confirmation: "Profile updated successfully"

### 8.4 Display Name Customization

THE edit profile form SHALL provide an optional display name field separate from username.

**Display Name Requirements**:

- Maximum length: 50 characters
- Allowed characters: Any Unicode characters including spaces, emoji, accented characters
- NOT required to be unique (multiple users can have same display name)
- Defaults to username if not set

WHEN a user sets a display name, THE system SHALL display it in place of username in profile header and throughout platform.

THE system SHALL still show the unique username in a secondary position (e.g., "@username" below display name).

### 8.5 Profile Edit Confirmation and Error Handling

**Save Success**:

WHEN all profile edits are saved successfully, THE system SHALL:
- Display success message: "Profile updated successfully"
- Redirect to public profile view showing updated information
- Send confirmation email if email address was changed

**Save Failure Scenarios**:

IF network error occurs during save, THEN THE system SHALL:
- Preserve user's entered data in form
- Display error: "Unable to save changes. Please check your connection and try again."
- Provide "Retry" button

IF validation fails on server side, THEN THE system SHALL:
- Display specific field errors next to respective inputs
- Keep form open with data preserved
- Highlight fields requiring correction

**Unsaved Changes Warning**:

WHEN a user has modified profile fields but not saved, AND attempts to navigate away, THEN THE system SHALL display confirmation dialog: "You have unsaved changes. Are you sure you want to leave?"

## 9. Account Settings and Preferences

### 9.1 Settings Access and Organization

WHEN a member views their own profile, THE system SHALL provide an "Account Settings" link in the profile header or navigation menu.

WHEN clicking "Account Settings", THE system SHALL navigate to `/settings` showing categorized settings sections:

**Settings Categories**:
- Account: Email, password, account deletion
- Privacy: Activity visibility, online status, data sharing
- Notifications: Email preferences, notification types
- Content: Default sorting, feed preferences, NSFW content
- Blocked: Blocked users and communities

### 9.2 Account Management Settings

**Email Address Management**:

THE account settings SHALL display current email address with "Change Email" option.

WHEN a user changes email, THE system SHALL:
1. Require current password verification
2. Send verification email to new address
3. Keep old email active until new email is verified
4. Display pending verification status
5. Complete email change after verification link is clicked

**Password Change**:

THE account settings SHALL provide "Change Password" section requiring:
- Current password input
- New password input (minimum 8 characters, complexity requirements)
- Confirm new password input

WHEN changing password, THE system SHALL:
- Validate current password is correct
- Verify new password meets strength requirements
- Confirm new password matches confirmation
- Update password hash in database
- Invalidate all existing sessions except current one
- Send email confirmation of password change
- Display success message

**Account Deletion**:

THE account settings SHALL provide "Delete Account" option with prominent warning.

WHEN a user initiates account deletion, THE system SHALL:
1. Display warning: "This will permanently delete your account. Your posts and comments will remain but show as [deleted]. This cannot be undone."
2. Require password re-entry for confirmation
3. Require typing username exactly to confirm
4. Display final confirmation dialog
5. Upon confirmation, mark account as deleted
6. Replace username with "[deleted]" on all content
7. Log user out immediately
8. Send confirmation email to registered address

### 9.3 Privacy Control Settings

**Activity Visibility**:

THE privacy settings SHALL provide toggle options for:
- **Show activity feed publicly**: Controls if posts and comments appear on public profile (default: ON)
- **Show online status**: Controls if "last seen" timestamp is visible (default: OFF)
- **Show subscribed communities**: Controls if subscription list is public (default: OFF)

WHEN a user toggles privacy settings, THE system SHALL apply changes immediately to their public profile.

**Data Sharing and Analytics**:

THE privacy settings SHALL provide options to:
- **Allow usage analytics**: Controls anonymous usage data collection (default: ON)
- **Personalized content**: Controls algorithm-based feed personalization (default: ON)

### 9.4 Notification Preferences

THE notification settings SHALL allow granular control over notification types:

**Email Notification Options**:
- Reply to post: Send email when someone comments on your post
- Reply to comment: Send email when someone replies to your comment
- Post upvote milestones: Send email when post reaches 10, 100, 1000 upvotes
- Private messages: Send email for new direct messages (future feature)
- Moderation alerts: Send email for moderation actions on your content
- Newsletter: Receive platform updates and featured content (opt-in)

WHEN a user disables a notification type, THE system SHALL stop sending emails for that event.

THE system SHALL provide "Unsubscribe from all emails" option with warning that important account security emails will still be sent.

**In-App Notification Options**:

THE notification settings SHALL provide toggles for in-platform notifications (notification bell) for same event types.

### 9.5 Content Display Preferences

**Default Feed Sorting**:

THE content preferences SHALL allow setting default sorting for different feed contexts:
- Homepage feed: Hot, New, Top (with time filter)
- Community feeds: Hot, New, Top, Controversial
- User profile feeds: New, Top

**Feed Display Options**:
- **Post thumbnail display**: Show/hide image thumbnails in feeds (default: Show)
- **Compact view**: Use compact or card layout (default: Card)
- **Comments per page**: 25, 50, 100 (default: 50)
- **Auto-expand media**: Automatically expand images and videos (default: OFF)

**NSFW Content Handling**:

THE content preferences SHALL provide "Show NSFW content" toggle (default: OFF).

WHEN enabled, THE system SHALL display NSFW-tagged posts and communities without blur.

WHEN disabled, THE system SHALL blur NSFW content and require click-through to view.

### 9.6 Blocked Users and Communities

**Block Management Interface**:

THE settings SHALL provide "Blocked" section listing:
- Blocked users: Usernames of blocked users with "Unblock" buttons
- Blocked communities: Community names with "Unblock" buttons

WHEN a user blocks another user:
- Posts and comments from blocked user are hidden across platform
- Blocked user cannot send direct messages (future feature)
- Block is one-directional (blocked user doesn't know)

WHEN a user blocks a community:
- Posts from blocked community don't appear in feeds
- Community doesn't appear in search results for blocker
- User can still manually navigate to community URL if needed

**Adding Blocks**:

THE blocked settings SHALL provide "Add blocked user" and "Add blocked community" forms accepting username or community name.

WHEN adding a block, THE system SHALL validate the username/community exists and confirm block creation.

### 9.7 Settings Save and Synchronization

WHEN a user changes any setting, THE system SHALL:
- Save changes immediately to database
- Display success confirmation message
- Synchronize changes across all user's active sessions
- Update UI immediately to reflect new settings

IF save fails, THEN THE system SHALL display error message and preserve user's selection for retry.

## 10. Profile Performance and Optimization

### 10.1 Profile Load Performance Requirements

WHEN a user navigates to any profile page, THE system SHALL load and display:
- Profile header: Within 1 second
- Activity feed (first page): Within 2 seconds
- Complete page render: Within 2.5 seconds

THE system SHALL achieve these performance targets under normal network conditions (broadband, 4G mobile).

### 10.2 Database Query Optimization

**Indexed Queries**:

THE system SHALL use database indexes on:
- User ID (primary key, clustered index)
- Username (unique index for lookups)
- Email (unique index for authentication)
- Creation timestamp (for sorting posts/comments by date)
- Vote aggregations (materialized views or cached values for karma)

**Efficient Activity Queries**:

WHEN fetching user posts, THE system SHALL use indexed query: `SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC LIMIT 25 OFFSET ?`

WHEN fetching user comments, THE system SHALL use indexed query: `SELECT * FROM comments WHERE user_id = ? ORDER BY created_at DESC LIMIT 50 OFFSET ?`

WHERE users have tens of thousands of posts/comments, THE system SHALL maintain sub-second query response through proper indexing and pagination.

### 10.3 Caching Strategy

**Profile Data Caching**:

THE system SHALL cache profile header data (username, karma, bio, avatar) with:
- Cache duration: 5 minutes
- Cache invalidation: On profile edit, vote changes affecting karma
- Cache key: User ID

**Activity Feed Caching**:

THE system SHALL cache activity feed pages with:
- Cache duration: 2 minutes for first page, 10 minutes for subsequent pages
- Cache invalidation: On new post/comment creation by user
- Separate cache keys for different tabs and sorting options

**Avatar Image Caching**:

THE system SHALL serve avatar images with HTTP cache headers:
- Cache-Control: max-age=86400 (24 hours)
- ETag for change detection
- Immutable URLs (URL change on avatar update)

### 10.4 Large Account Handling

**Pagination Optimization**:

WHERE users have more than 1,000 posts or comments, THE system SHALL:
- Use cursor-based pagination for consistent performance across deep pages
- Limit maximum page depth to 100 pages (2,500 posts or 5,000 comments)
- Provide search functionality for finding older content beyond pagination limits

**Karma Calculation Optimization**:

WHERE users have accumulated hundreds of thousands of votes, THE system SHALL:
- Pre-calculate and cache karma values
- Update karma incrementally on new votes rather than recalculating from scratch
- Use database triggers or asynchronous jobs for karma aggregation

### 10.5 Mobile Performance Optimization

THE system SHALL optimize profile pages for mobile devices by:
- Lazy-loading images below the fold
- Reducing initial payload through code splitting
- Serving responsive images at appropriate resolutions
- Minimizing JavaScript execution for faster interactivity

WHEN accessing profile on mobile network (3G), THE system SHALL achieve profile header load within 3 seconds.

## 11. Profile URL Routing and Navigation

### 11.1 Primary Profile URL Patterns

THE system SHALL support the following URL patterns for profile access:

**Base Profile URLs**:
- `/u/{username}` - Primary profile URL pattern (Reddit-style)
- `/user/{username}` - Alternative profile URL pattern (alias)
- Both patterns SHALL resolve to identical profile page

**Tab-Based URLs**:
- `/u/{username}/overview` - Combined activity feed (default)
- `/u/{username}/posts` - Posts-only view
- `/u/{username}/comments` - Comments-only view

**URL Query Parameters**:
- `?sort=new|top|controversial` - Sorting selection
- `?time=hour|day|week|month|year|all` - Time filter for top sorting
- `?page=N` - Pagination

**Example Complete URLs**:
- `/u/johndoe/posts?sort=top&time=year&page=2`
- `/user/janedoe/comments?sort=controversial`

### 11.2 URL Canonicalization

WHEN a user accesses `/user/{username}`, THE system SHALL serve content but include canonical meta tag pointing to `/u/{username}` for SEO.

WHEN a user accesses profile without specifying tab, THE system SHALL default to overview tab but not redirect (URL stays as `/u/{username}`).

### 11.3 Username Link Generation

WHEN rendering username anywhere in the platform (posts, comments, community lists), THE system SHALL generate hyperlinks to `/u/{username}`.

THE system SHALL make usernames clickable in:
- Post author bylines
- Comment author bylines
- Moderator lists on community pages
- User search results
- Notification messages

### 11.4 Invalid Username Handling

WHEN a user navigates to a profile URL with non-existent username, THE system SHALL:
- Return HTTP 404 status code
- Display user-friendly error page: "User not found"
- Provide search box: "Looking for someone? Try searching"
- Suggest returning to homepage or browsing communities

WHEN a username contains invalid characters in URL, THE system SHALL:
- Return HTTP 400 Bad Request
- Display error: "Invalid username format"

### 11.5 Profile Navigation Elements

**Tab Navigation**:

THE profile page SHALL display horizontal tab navigation with three tabs:
- Overview (default, highlighted when active)
- Posts
- Comments

WHEN a user clicks a tab, THE system SHALL:
- Update URL to reflect selected tab
- Fetch and display content for that tab
- Maintain sorting and filter selections where applicable
- Update browser history for back button functionality

**Breadcrumb Navigation**:

THE profile page MAY display breadcrumb navigation:
- Home > Users > {username}

**Back to Top Button**:

WHERE activity feeds extend beyond one screen height, THE system SHALL display a "Back to Top" button for quick navigation.

## 12. Profile Search and Discovery

### 12.1 Username Search Functionality

THE platform SHALL provide username search accessible from main navigation or dedicated search page.

WHEN a user enters a search query in username search, THE system SHALL:
- Search for usernames containing the query string (case-insensitive partial match)
- Return results ranked by karma score (higher karma first)
- Display results showing: username, avatar, total karma, account age
- Limit results to top 25 matches
- Provide "View Profile" link for each result

**Search Performance**:

THE username search SHALL return results within 1 second for queries on database with millions of users.

THE system SHALL use indexed search on username field with prefix matching optimization.

### 12.2 Profile Discovery Mechanisms

**High Karma Users Leaderboard**:

THE platform MAY provide a leaderboard page showing top users by karma:
- Top 100 users by total karma
- Top 100 users by post karma
- Top 100 users by comment karma
- Filterable by time period (this month, this year, all time)

**Active Contributors in Communities**:

WHEN viewing a community, THE system MAY display "Top Contributors" sidebar showing:
- Users with most posts in community (last 30 days)
- Users with most comments in community (last 30 days)
- Users with highest karma from community content

**Author Discovery in Feeds**:

WHEN displaying posts and comments in feeds, THE system SHALL make author usernames prominently clickable for profile access.

### 12.3 Profile Sharing and Linking

**Social Sharing**:

THE profile page SHALL provide share buttons for:
- Copy profile URL to clipboard
- Share to Twitter/X
- Share to Facebook
- Share via email

**Open Graph Meta Tags**:

THE profile page HTML SHALL include Open Graph meta tags for rich social previews:
- og:title: "{Username}'s Profile - redditCommunity"
- og:description: "{Bio text or default description}"
- og:image: "{Avatar URL}"
- og:url: "{Profile URL}"

WHEN shared on social media, THE profile link SHALL display rich preview with avatar and bio.

## 13. Profile Data Export and Compliance

### 13.1 GDPR Data Export

THE account settings SHALL provide "Download My Data" option for GDPR compliance.

WHEN a user requests data export, THE system SHALL:
1. Generate comprehensive archive containing:
   - Profile information (username, email, bio, settings)
   - All posts created (title, content, timestamps, vote counts)
   - All comments created (text, timestamps, vote counts)
   - Voting history (all upvotes and downvotes cast)
   - Subscription list
   - Moderation actions taken (if moderator)
2. Format data as JSON or CSV for machine readability
3. Send download link via email within 24 hours
4. Expire download link after 7 days for security

**Export Performance**:

WHERE users have extensive activity (100K+ posts/comments), THE system SHALL process export asynchronously as background job.

THE system SHALL limit data exports to one per user per 30 days to prevent abuse.

### 13.2 Data Retention and Deletion

**Account Deletion Data Retention**:

WHEN a user deletes their account, THE system SHALL:
- Retain all posts and comments with author shown as "[deleted]"
- Permanently delete email address and bio immediately
- Anonymize user record (clear personal data, keep activity for platform integrity)
- Retain karma scores for deleted content
- Prevent username reuse for 6 months

**Right to be Forgotten**:

WHERE legally required (GDPR), THE system SHALL provide "Full Data Deletion" option that:
- Removes all posts and comments (destructive to discussions)
- Deletes account record completely
- Requires manual approval by platform administrators
- Only available in jurisdictions legally requiring it

## 14. Accessibility and Responsive Design

### 14.1 Screen Reader Support

THE profile page SHALL be fully accessible to screen reader users through:
- Semantic HTML structure (header, main, nav, section elements)
- ARIA labels for interactive elements
- Alt text for avatar images (e.g., "{Username}'s avatar")
- Proper heading hierarchy (h1 for username, h2 for sections)
- Keyboard navigation support for all interactive elements

**Screen Reader Announcements**:

WHEN a tab is selected, THE system SHALL announce to screen readers: "{Tab name} tab selected, showing {content count} items"

WHEN pagination changes, THE system SHALL announce: "Page {N} loaded"

### 14.2 Keyboard Navigation

THE profile interface SHALL support complete keyboard navigation:
- Tab key: Navigate between interactive elements (tabs, links, buttons)
- Enter/Space: Activate links and buttons
- Arrow keys: Navigate within tab bar
- Escape: Close modals (edit profile, settings)

THE system SHALL display visible focus indicators on all focusable elements meeting WCAG 2.1 standards.

### 14.3 Responsive Design Breakpoints

THE profile page SHALL adapt to different screen sizes:

**Desktop (≥1200px)**:
- Full three-column layout: sidebar, main content, info column
- Large avatar (120x120px)
- Horizontal tab navigation

**Tablet (768px - 1199px)**:
- Two-column layout: main content and sidebar
- Medium avatar (100x100px)
- Horizontal tab navigation

**Mobile (≤767px)**:
- Single column layout
- Small avatar (80x80px)
- Horizontal swipeable tabs or stacked vertical navigation
- Hamburger menu for settings access
- Optimized touch targets (minimum 44x44px)

### 14.4 Color Contrast and Visual Accessibility

THE profile page SHALL meet WCAG 2.1 AA standards for color contrast:
- Text on background: minimum 4.5:1 ratio
- Large text (18pt+): minimum 3:1 ratio
- Interactive elements: minimum 3:1 ratio

THE system SHALL NOT rely on color alone to convey information (e.g., karma badges use both color and icon shape).

### 14.5 Performance on Low-End Devices

THE profile page SHALL remain functional on low-end mobile devices:
- Initial render within 5 seconds on 3G connection
- Smooth scrolling maintained on devices with 2GB RAM
- Image optimization for bandwidth-constrained users
- Progressive enhancement approach (core content loads first, enhancements load progressively)

## 15. Error Handling and Edge Cases

### 15.1 Profile Access Errors

**User Not Found**:

WHEN accessing `/u/nonexistentuser`, THE system SHALL:
- Return HTTP 404 status
- Display: "User not found. This account may not exist or has been deleted."
- Provide search box for finding similar usernames
- Offer link to return to homepage

**Deleted Account Access**:

WHEN accessing profile of deleted account, THE system SHALL:
- Return HTTP 410 Gone status
- Display: "This account has been deleted."
- NOT display any historical activity or information

**Suspended Account Access**:

WHEN accessing profile of suspended account, THE system SHALL:
- Return HTTP 403 Forbidden status
- Display: "This account has been suspended for violating platform policies."
- NOT display activity or profile information

### 15.2 Profile Edit Errors

**Avatar Upload Failures**:

IF avatar upload fails due to network error, THEN THE system SHALL:
- Preserve existing avatar
- Display error: "Upload failed. Please try again."
- Provide retry button
- Keep edit modal open with other unsaved changes preserved

IF avatar processing fails server-side, THEN THE system SHALL:
- Log error details for debugging
- Display user-friendly message: "Unable to process image. Please try a different file."
- Revert to previous avatar

**Bio Save Conflicts**:

IF bio contains malicious content detected by server-side validation, THEN THE system SHALL:
- Reject save operation
- Display: "Bio contains prohibited content. Please remove harmful links or scripts."
- Highlight problematic content in editor

**Concurrent Edit Conflicts**:

IF user edits profile simultaneously in multiple browser tabs, THEN THE system SHALL:
- Use "last write wins" strategy
- Display warning: "Profile was updated in another tab. Please review changes."
- Allow user to choose which version to keep

### 15.3 Activity Feed Errors

**Empty Activity States**:

WHEN user has no posts/comments and views their own profile, THE system SHALL display encouraging message: "Start participating! Create your first post or join a discussion."

WHEN user has no posts/comments and others view their profile, THE system SHALL display: "{Username} hasn't posted or commented yet."

**Load Failures**:

IF activity feed fails to load due to database error, THEN THE system SHALL:
- Display error message: "Unable to load activity. Please refresh the page."
- Provide refresh button
- Log error details for investigation
- Show cached data if available

**Pagination Errors**:

IF user navigates to invalid page number (e.g., page 9999 when only 50 pages exist), THEN THE system SHALL:
- Redirect to last valid page
- Display message: "That page doesn't exist. Showing most recent content."

### 15.4 Karma Calculation Errors

**Negative Karma Display**:

WHEN user has net negative karma, THE system SHALL display accurate negative value (e.g., "-1,234 karma") without floor limits.

**Extremely High Karma**:

WHERE users reach millions of karma, THE system SHALL:
- Format with appropriate units (e.g., "1.2M karma" for 1,200,000)
- Maintain accuracy in detailed views
- Prevent integer overflow through proper data types

### 15.5 Settings Update Errors

**Email Change Conflicts**:

IF user attempts to change email to address already in use, THEN THE system SHALL:
- Prevent change
- Display: "This email is already associated with another account."
- Keep existing email unchanged

**Password Change Security**:

IF current password verification fails, THEN THE system SHALL:
- Prevent password change
- Display: "Current password is incorrect."
- Limit failed attempts to 5 within 15 minutes (rate limiting)

**Setting Synchronization Failures**:

IF settings fail to save due to network error, THEN THE system SHALL:
- Display error notification
- Preserve user's selections in form
- Provide retry mechanism
- Prevent navigation away from settings until saved or explicitly canceled

## 16. Integration Points and Dependencies

### 16.1 Authentication System Integration

THE profile system SHALL integrate with authentication system to:
- Verify user identity for profile editing access
- Enforce "edit own profile only" permissions
- Invalidate profile caches on logout
- Synchronize session state with settings changes

WHEN a user logs in, THE system SHALL redirect to their profile page if login was initiated from profile context.

### 16.2 Karma System Integration

THE profile system SHALL integrate with karma calculation system to:
- Query real-time karma totals for display
- Subscribe to karma update events for cache invalidation
- Display separate post and comment karma breakdowns
- Calculate karma milestone achievements

THE system SHALL use efficient aggregation queries or materialized views for karma calculation rather than real-time summation on every profile page load.

### 16.3 Content System Integration

THE profile activity feeds SHALL integrate with post and comment systems to:
- Fetch all posts created by user with filters and sorting
- Fetch all comments created by user with parent post context
- Display vote scores from voting system
- Handle removed/deleted content visibility appropriately
- Provide links to full post and comment pages

### 16.4 Community System Integration

THE profile system SHALL integrate with community management to:
- Display list of communities user moderates
- Show user's subscription list (if privacy allows)
- Link community names to community pages
- Display community context for posts and comments

### 16.5 Notification System Integration

THE profile and settings systems SHALL integrate with notification system to:
- Send email confirmations for profile changes
- Deliver password reset emails
- Send account deletion confirmations
- Respect notification preferences set in settings
- Trigger notifications for profile mentions (future feature)

## 17. Success Metrics and Acceptance Criteria

### 17.1 Performance Success Criteria

- Profile page load time: <2 seconds (95th percentile)
- Profile edit save time: <1 second (95th percentile)
- Avatar upload completion: <5 seconds for 5MB file (95th percentile)
- Search response time: <1 second for username search
- Cache hit rate: >80% for profile header data

### 17.2 Functionality Success Criteria

- All profile fields editable and saveable without errors
- Activity feeds display accurate content with proper sorting
- Karma scores update within 5 seconds of vote changes
- Privacy settings apply immediately to public profile view
- Pagination works correctly for users with 10K+ posts/comments

### 17.3 User Experience Success Criteria

- Mobile responsive layout works on screens 320px+ width
- Keyboard navigation covers all interactive elements
- Screen readers announce all content and state changes
- Error messages provide actionable guidance
- Settings changes provide clear confirmation feedback

### 17.4 Business Success Criteria

- 80% of registered users complete profile (avatar OR bio)
- Average profile page views per user: 5+ per month
- Profile edit completion rate: >90% (saves vs. cancels)
- Data export requests processed within 24 hours: 100%
- GDPR compliance audit: Pass all requirements

---

**Document Version**: 1.0  
**Last Updated**: 2025-11-14  
**Related Documents**:
- [User Actors and Authentication](./02-user-actors-authentication.md)
- [Voting and Karma System](./05-voting-karma-system.md)
- [Content Creation and Posts](./04-content-creation-posts.md)
- [Comments and Discussions](./06-comments-discussions.md)
- [Community Management](./03-community-management.md)