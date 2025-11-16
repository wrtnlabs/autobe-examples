# User Profiles and Analytics

## 1. User Profile Page Structure

### 1.1 Public Profile Information

User profiles are the public face of community members. Each user profile displays comprehensive information about their account and contributions to the platform.

#### Profile Header Section

THE user profile SHALL display the following header information:

- **Username**: The user's unique identifier, displayed prominently (maximum 50 characters, alphanumeric with hyphens and underscores)
- **Join Date**: When the user account was created (formatted as "Joined [MONTH] [YEAR]", e.g., "Joined November 2024"). Immutable after account creation.
- **Total Karma**: Aggregated karma score from all posts and comments. Calculated as (Post Karma + Comment Karma). Updated in real-time. Minimum value: 0 (karma cannot go negative).
- **Verified Badge**: Visual indicator if the user has verified their email address (applies to members, moderators, and administrators). Only shown when email_verified status is true.
- **Moderator Badge**: Visual indicator showing communities where the user is a moderator. Lists up to 5 most recently assigned communities. Only displayed if user has moderator role in at least one community.
- **Administrator Badge**: Platform-wide badge displayed for administrator-level users only. Shows "Platform Administrator" text.

#### Profile Bio and Customization

THE member users (authenticated users with role = "member", "moderator", or "administrator") SHALL be able to customize the following profile fields:

- **Bio/Description**: Up to 500 characters of plain text describing the user. Markdown formatting supported (bold, italic, links). HTML tags automatically stripped and escaped to prevent XSS. Defaults to empty string if not provided.
- **Profile Picture**: User can upload a custom image (see Image Upload Requirements in Section 1.3). Displayed as square (1:1 aspect ratio). Defaults to auto-generated avatar based on username if not provided.
- **Theme Preference**: User can select between light and dark interface themes. Options: "light" or "dark". Defaults to "light". Applies only to current user's session.

WHERE a user is a guest, THE system SHALL display only the publicly available profile information without customization options. Guest users cannot access settings or customization interfaces.

#### User Status Indicators

WHEN a user visits another user's profile, THE system SHALL display the following status:

- **Account Status**: Active, Suspended, or Deleted (for administrative transparency when applicable). Only visible to moderators and administrators; regular members and guests see "Active" regardless of true status unless account is deleted (then profile is hidden entirely).
- **Last Active**: When the user was last active on the platform (displayed using relative time format: "Active now" if within 5 minutes, "Active [X] minutes ago" for 5-60 minutes, "Active [X] hours ago" for 1-24 hours, "Active [X] days ago" for older activity, "Active [X] months ago" for 30+ days). Updated in real-time with 5-minute granularity. IF user has disabled activity status visibility in privacy settings, display only to self and administrators.

### 1.2 Profile Data Fields and Accessibility Matrix

THE following data SHALL be stored and displayed on user profiles according to the accessibility matrix below:

| Field | Data Type | Display to Guest | Display to Member | Display to Self | Editable | Updatable | Notes |
|-------|-----------|------------------|-------------------|-----------------|----------|-----------|-------|
| Username | String (3-50 chars) | Yes | Yes | Yes | No | No | Unique, immutable after creation |
| Join Date | DateTime | Yes | Yes | Yes | No | No | ISO 8601 format, immutable |
| Bio/Description | String (0-500 chars) | Yes | Yes | Yes | Yes | Yes | Markdown supported, HTML stripped |
| Profile Picture | Image URL | Yes | Yes | Yes | Yes | Yes | Square format 100x100 to 400x400px |
| Total Karma | Number (≥0) | Yes | Yes | Yes | No | No | Calculated: Post Karma + Comment Karma |
| Post Karma | Number (≥0) | Yes | Yes | Yes | No | No | Sum of votes on user's posts |
| Comment Karma | Number (≥0) | Yes | Yes | Yes | No | No | Sum of votes on user's comments |
| Posts Created | Number (≥0) | Yes | Yes | Yes | No | No | Count of non-deleted posts |
| Comments Created | Number (≥0) | Yes | Yes | Yes | No | No | Count of non-deleted comments |
| Communities Joined | Number (≥0) | Yes | Yes | Yes | No | No | Count of subscribed communities |
| Communities Moderated | Array[Community] | Yes | Yes | Yes | No | No | Up to 5 most recent communities |
| Email Address | String (email format) | No | No | Yes | No | Yes | With verification required for changes |
| Theme Preference | Enum: "light"/"dark" | No | No | Yes | No | Yes | User interface appearance setting |
| Notification Settings | Object | No | No | Yes | No | Yes | Email preferences, notification frequency |
| Saved Items Count | Number (≥0) | No | No | Yes | No | No | Count of saved posts/comments |
| Account Status | Enum: Active/Suspended/Deleted | No* | No* | Yes | No | Admin only | *Admins/Mods see actual status |
| Last Active | DateTime | Yes** | Yes** | Yes | No | No | **Hidden if user disabled visibility |
| Moderator Roles | Array[Role] | Yes | Yes | Yes | No | No | Creator, Senior, Junior per community |

### 1.3 Image Upload Requirements for Profile Pictures

WHEN a user uploads a profile picture, THE system SHALL enforce the following constraints:

- **Allowed Formats**: JPEG, PNG, WebP, GIF (validate by MIME type and magic bytes, not just file extension)
- **Maximum File Size**: 5 MB (5,242,880 bytes). Reject larger files with error message "Image exceeds maximum size of 5 MB. Please compress and retry."
- **Minimum Dimensions**: 100x100 pixels. Reject smaller images with error message "Image must be at least 100x100 pixels."
- **Recommended Dimensions**: 200x200 pixels or larger for best quality. Images larger than 400x400 are automatically downscaled.
- **Aspect Ratio**: Any aspect ratio supported by upload interface. System SHALL auto-crop to square (1:1 ratio) for profile picture display by:
  1. Detecting if image is portrait (height > width) or landscape (width > height)
  2. Cropping to center square region (min(width, height) × min(width, height))
  3. Resizing to 200x200px for storage

IF a user uploads an image that exceeds size or dimension limits, THE system SHALL return an HTTP 400 error with validation error message specifying the constraint violation and providing guidance for resizing.

WHEN a user updates their profile picture, THE system SHALL:
- Validate the new image using the constraints above
- Generate multiple thumbnail sizes for efficient serving:
  - Small: 100x100px (for list displays, user mentions in comments)
  - Medium: 200x200px (for profile header, user cards)
  - Large: 400x400px (for profile page detail view, optionally downloadable at full resolution)
- All sizes generated in WebP format with JPEG fallback for older browsers
- Store images in cloud object storage with public read access (CDN-served)
- Replace the previous profile picture immediately
- Delete old image from storage after 24-hour grace period (in case of rollback needed)
- Update all references throughout the platform to reflect the new image URL
- Propagate update to all pages displaying user profile within 60 seconds

IF image validation fails (corrupted file, format mismatch), THE system SHALL return HTTP 400 with specific error explaining the failure and suggest re-uploading.

### 1.4 Badge System and Role Indicators

THE following badges SHALL be displayed on user profiles to indicate achievements, roles, and status:

**Verified Email Badge**

- Display condition: When a member has completed email verification (email_verified = true)
- Visual element: Blue checkmark icon or "✓ Email Verified" text
- Tooltip: "This user has verified their email address"
- Only visible if user has completed email verification
- Appears in profile header and in user mention displays

**Moderator Badge(s)**

- Display condition: User has moderator role in one or more communities
- Visual element: Badge icon + community name, linked to community page
- Format: "Moderator of r/[community_name]" (for each moderated community)
- Shows up to 5 most recently assigned communities on main profile
- Full list accessible in "Moderated Communities" section if more than 5
- Clicking badge links to the community page
- For senior moderators: Display "Senior Moderator" prefix
- For junior moderators: Display "Moderator" without prefix

**Administrator Badge**

- Display condition: User has administrator role (role = "administrator")
- Visual element: Admin icon or "🛡️ Platform Administrator" text
- Tooltip: "This user is a platform administrator"
- Visible globally on all profile displays
- Does not show specific communities (applies platform-wide)
- Only one administrator badge possible per user

**Karma Milestone Badges** (optional, implementation at development team discretion)

- **1K Karma**: Displayed when user reaches 1,000+ total karma
- **10K Karma**: Displayed when user reaches 10,000+ total karma
- **100K Karma**: Displayed when user reaches 100,000+ total karma
- **Account Age Badges**: 
  - Bronze (1+ year): Displayed if account created 365+ days ago
  - Silver (2+ years): Displayed if account created 730+ days ago
  - Gold (3+ years): Displayed if account created 1095+ days ago
- Visually distinct from role badges (different colors/styles)
- Achievement-based rather than role-based

## 2. Post and Comment History

### 2.1 User Posts Archive

THE user profile SHALL display a "Posts" tab showing all posts created by that user, organized with the following features:

#### Posts Listing Display

WHEN viewing the Posts tab, THE system SHALL display each post with:

- **Post Title**: The original title of the post (up to 300 characters, truncated with ellipsis if longer). Clickable link to post.
- **Community**: Which community the post was published in (displayed as "r/community_name" with link to community page). Shows community with highest visibility in list.
- **Post Type**: Indicator showing if post is text (📝 icon), link (🔗 icon), or image (🖼️ icon) type. Displayed as icon only or text label.
- **Creation Date**: When post was created (relative format: "1 day ago", "3 hours ago", "2 weeks ago", etc.). Updates dynamically every 5 minutes. Hover shows exact timestamp (ISO 8601).
- **Vote Count**: Current upvote/downvote score displayed as single number (e.g., "234" or "-12"). Color-coded: green for positive, red for negative, gray for zero. Updated in real-time with vote changes.
- **Comment Count**: Number of comments on the post displayed with comment icon (💬 234 comments). Updated in real-time.
- **Deletion Status**: Visual indicator if post has been removed or deleted:
  - Deleted by user: Shows "[deleted by user]" with grayed-out appearance, but post remains in list with visibility restrictions
  - Removed by moderator: Shows "[removed by moderator]" with grayed-out appearance and lock icon
  - Shows reason if available from moderator

#### Posts Sorting Options

THE system SHALL support the following sorting options for user posts, selectable via dropdown menu with instant refresh:

- **New First**: Posts sorted by creation date (created_at DESC), newest first. Default sort order.
- **Hot**: Posts sorted by current engagement level using formula: (upvotes - downvotes) × (1 / (1 + hours_since_created/24)). Re-calculated every 5 minutes. Favors recent, highly-voted posts.
- **Top This Year**: Posts sorted by total upvotes received in the last 365 days, highest first. Excludes posts with downvotes. Min. 1 upvote to appear.
- **Top This Month**: Posts sorted by total upvotes received in last 30 days (created_at ≥ NOW() - interval '30 days'), highest first. Only includes posts from exactly 30 days ago to now.
- **Top This Week**: Posts sorted by total upvotes in last 7 days, highest first.
- **Top All Time**: Posts sorted by total upvotes across entire post lifetime, highest first. No time-based filtering.

WHERE a user is viewing their own profile in authenticated session, THE system SHALL additionally display sorting options for moderator/admin actions:

- **Deleted**: Filter to show only deleted posts by user or moderator (soft-deleted; visible only to post author and administrators). Shows how many deleted posts exist (e.g., "5 deleted posts").
- **Removed**: Filter to show only removed posts by moderators (visible only to post author and administrators). Shows removal reason and date.

WHEN switching between sorts, THE system SHALL:
- Maintain pagination position (return to page 1)
- Show selected sort option with visual highlight
- Preserve user's sort preference in browser localStorage for next visit

#### Posts Pagination and Performance

THE system SHALL paginate user posts in groups of 25 items per page, implementing the following pagination features:

- **Pagination Controls**: Display page numbers 1, 2, 3... up to last page
- **Previous/Next Buttons**: Navigate between pages sequentially
- **Page Size Options**: Allow users to select 10, 25, 50, or 100 posts per page (remembered in preferences)
- **Load More Button**: Alternative to pagination - "Load More" button appends next 25 posts to current list without page refresh
- **Total Count**: Display "Showing 1-25 of [total posts]" indicator
- **Performance**: Load complete page within 500ms for all sorts; use indexed queries and caching
- **Deep Pagination**: For users with 1000+ posts, older pages may have slightly slower load times (1-2 seconds acceptable)

WHEN user has 0 posts, THE system SHALL display message: "This user hasn't posted yet. They may be new to the community!"

### 2.2 User Comments Archive

THE user profile SHALL display a "Comments" tab showing all comments created by that user, organized with the following features:

#### Comments Listing Display

WHEN viewing the Comments tab, THE system SHALL display each comment with:

- **Comment Text Preview**: First 200 characters of the comment, truncated with ellipsis if longer (e.g., "This is a really interesting perspective on the topic. I would argue that..."). If comment contains markdown formatting, render it in preview (bold, italic, links). Clicking preview expands to full comment.
- **Parent Post**: Title of the post the comment was posted on (up to 100 characters, truncated with ellipsis), displayed with link to parent post. Format: "Commenting on: [post title]"
- **Community**: Which community the parent post is in (displayed as "r/community_name" with link). Shows community context.
- **Creation Date**: When comment was created (relative format: "3 hours ago", "5 days ago"). Hover shows exact timestamp.
- **Vote Count**: Current upvote/downvote score for the comment. Display as single number with color coding (green positive, red negative, gray zero).
- **Reply Count**: Number of direct replies to this comment. Format: "5 replies" or "No replies yet".
- **Comment Status**: Indicator if comment has been deleted or removed (same format as posts).

#### Comments Sorting Options

THE system SHALL support the following sorting options for user comments:

- **New First**: Comments sorted by creation date (created_at DESC), newest first. Default sort order.
- **Hot**: Comments sorted by engagement using formula: (upvotes - downvotes) × comment_replies_count × (1 / (1 + hours_since_created/6)). Re-calculated every 5 minutes. Favors recent, high-engagement comments.
- **Top**: Comments sorted by total upvotes (upvotes DESC), highest first. Ignores downvotes in sorting.
- **Controversial**: Comments sorted by vote polarization. Formula: MIN(upvotes, downvotes) where both > 5. Shows comments with high engagement but disagreement. Only comments with MIN(upvotes, downvotes) ≥ 5 are included.

WHERE a user is viewing their own profile, THE system SHALL additionally display:

- **Deleted**: Filter to show only deleted comments (soft-deleted; visible only to author and administrators)
- **Removed**: Filter to show only removed comments by moderators (visible only to author and administrators)

#### Comments Pagination

THE system SHALL paginate user comments in groups of 25 items per page with same pagination controls as posts (page numbers, previous/next, load more).

WHEN user has 0 comments, THE system SHALL display message: "This user hasn't commented yet. Maybe they're still getting a feel for the community."

### 2.3 Saved Content Archive

WHEN a member user saves a post or comment, THE system SHALL store this relationship in the user's "Saved" section with timestamp.

THE user profile SHALL display a "Saved" tab (private to the user) showing:

- All posts and comments the user has explicitly saved (by clicking "Save" button or star icon)
- Mixed timeline of saved posts and comments displayed in single list
- Sorted by save date, most recently saved first (user can change to sort by: oldest saved first, post/comment creation date, or original post's current popularity)
- Each item shows: saved date, original creation date, post/comment type, community, vote count, and option to unsave
- Deletion status shown if original content was removed (grayed out with "[deleted]" or "[removed]" indicator)
- Option to view all saved items or filter by: posts only, comments only, by specific community, or by date range

WHERE a guest or other authenticated user attempts to view the "Saved" tab of another user, THE system SHALL deny access and display a message: "This user's saved items are private. You can only view your own saved content."

WHERE a user deletes or removes a saved item, THE system SHALL:
- Keep the saved relationship in database but mark as deleted
- Display a recovery option ("This item was deleted. Undo?" for 30 days)
- After 30 days, permanently remove the saved relationship

### 2.4 Post/Comment Visibility Rules and Moderation Status

WHERE a user views another user's post or comment history, THE system SHALL apply the following visibility rules:

**IF the viewing user is a guest:**
- Display all publicly available posts and comments (not deleted or removed)
- Hide all deleted content (show count: "User has deleted X posts/comments")
- Hide all removed content (show count: "User has X removed posts/comments")
- Cannot view Saved tab

**IF the viewing user is the profile owner (viewing own profile):**
- Show all content including deleted and removed (for completeness)
- Show "Deleted by user" posts in separate filtered view
- Show "Removed by moderator" posts with removal reason and appeals link
- Access to Saved tab with full functionality
- Shows private activity timeline if set to private

**IF the viewing user is a moderator or administrator:**
- Show all content including deleted and removed
- Display removal/deletion reason and who performed action
- Show appeal status if content was appealed
- Display moderation action audit trail (timestamp, moderator, reason)
- Can reverse deletions/removals if needed

WHERE a user's post or comment has been removed by a moderator, THE system SHALL:
- Display placeholder message to non-moderators: "[removed by moderator]" with removal reason (e.g., "Violated Rule 5: Be respectful")
- Allow the original author, all moderators, and administrators to see the original content
- Log the removal action with timestamp, moderator name, and reason
- Keep full content in database for audit purposes
- Display to author: "Your comment was removed by moderator for: [reason]. You can appeal this decision."

WHERE a user or administrator has deleted their own content (not removed by moderator), THE system SHALL:
- Display placeholder message to all users: "[deleted by user]"
- Hide the content from all users except administrators
- Preserve the deletion timestamp in database for record-keeping
- Show to author: "You deleted this [post/comment] on [date]. Permanently delete after [7 days remaining]?"
- Allow author to restore within 7 days; after 7 days, move to archive/purge

## 3. User Statistics and Metrics

### 3.1 Karma Score Display and Breakdown

THE user profile SHALL prominently display the user's karma score in the profile header with the following breakdown:

#### Total Karma Display

THE total karma score SHALL be displayed as a large, prominent number on the profile header (e.g., "⭐ 15,234 Karma" with large font size). Format uses thousand separators for readability (1,000+).

THE total karma calculation formula SHALL be: **Total Karma = Post Karma + Comment Karma**

THE total karma is updated in real-time as votes are cast or removed (within 5 seconds). Users receive immediate feedback when their karma changes.

#### Post Karma Component

**Post Karma**: Cumulative karma earned from all posts user has created

- Calculation: Sum of all votes received on posts (each upvote = +1 karma, each downvote = -1 karma)
- Formula: Post Karma = SUM(votes on user's posts where vote_type = 'upvote') - SUM(votes on user's posts where vote_type = 'downvote')
- Display format: Integer with thousand separators (e.g., "15,234")
- Updated in real-time within 5 seconds when votes are cast/changed
- Stored in user's karma_posts field
- Displayed in profile header as separate component: "📝 Post Karma: 12,500"

#### Comment Karma Component

**Comment Karma**: Cumulative karma earned from all comments user has created

- Calculation: Sum of all votes received on comments
- Formula: Comment Karma = SUM(votes on user's comments where vote_type = 'upvote') - SUM(votes on user's comments where vote_type = 'downvote')
- Display format: Integer with thousand separators (e.g., "42,891")
- Updated in real-time within 5 seconds when votes change
- Stored in user's karma_comments field
- Displayed in profile header as separate component: "💬 Comment Karma: 42,891"

#### Karma Minimum Floor Enforcement

THE system SHALL enforce that karma cannot go below zero (0) minimum value.

WHEN a user's karma calculation would result in a negative number (e.g., -15 karma), THE system SHALL:
- Set the user's karma to exactly 0 (floor enforcement)
- Log the karma floor violation for analysis
- Not display negative karma values anywhere in system

Example: User with 20 post karma and 10 comment karma (total 30) receives 50 downvotes on one post. Calculation: 30 - 50 = -20. System enforces: karma = 0 (not -20).

#### Karma Display Threshold and Rounding

WHERE a user has less than 1 karma from a category (impossible due to integer calculations, but specified for clarity):
- The system SHALL display "0" for that category
- Display includes formatting: "📝 Post Karma: 0" (not hidden, shows explicitly)

#### Karma Percentile Display (optional advanced feature)

WHERE the system implements advanced analytics, THE profile MAY display:
- User's karma percentile (e.g., "Top 15% of users by karma")
- Calculated as: (users with less karma / total users) × 100
- Only displayed if user has opted into public analytics
- Recalculated weekly to account for new users

### 3.2 User Activity Metrics

THE user profile SHALL display the following activity statistics in a distinct "Statistics" section on the profile:

| Metric | Display Format | Calculation | Visibility | Freshness |
|--------|---|---|---|---|
| Total Posts Created | Integer (e.g., "247") | COUNT(posts WHERE user_id = target_user AND deleted = false) | Guest, Member, Self | Real-time |
| Total Comments Created | Integer (e.g., "3,891") | COUNT(comments WHERE user_id = target_user AND deleted = false) | Guest, Member, Self | Real-time |
| Total Communities Joined | Integer (e.g., "42") | COUNT(subscriptions WHERE user_id = target_user AND unsubscribed = false) | Guest, Member, Self | Real-time |
| Communities Moderated | List (e.g., "r/programming, r/gaming, r/movies") | Array of communities where user has role IN (Creator, Senior Moderator, Junior Moderator), up to 5 most recent | Guest, Member, Self | Real-time |
| Average Post Score | Decimal (e.g., "12.3") | SUM(votes on posts) / COUNT(posts) | Member only (hidden from guests) | Updated hourly |
| Average Comment Score | Decimal (e.g., "4.7") | SUM(votes on comments) / COUNT(comments) | Member only (hidden from guests) | Updated hourly |
| Join Date | Text (e.g., "Joined November 2024") | User's account creation timestamp | Guest, Member, Self | Immutable |
| Last Active | Relative text (e.g., "1 hour ago") | Most recent user activity timestamp (post, comment, vote, login) | Varies by privacy setting | Updated every 5 minutes |
| Account Age | Text (e.g., "892 days old") | Difference between NOW() and join_date | Member only (hidden from guests) | Calculated daily |

WHEN displaying these statistics to guests, THE system SHALL:
- Show all public metrics (total posts, comments, communities, moderated communities, join date)
- Hide member-only metrics (average scores, account age) with message "Sign in to see more stats"
- Show Last Active only if user has not disabled activity visibility in privacy settings

WHERE user has set Last Active to private in privacy settings, THE system SHALL:
- Hide last active time from all users except self and administrators
- Display message "This user has hidden their activity status" to other users

### 3.3 Community Participation Metrics

WHERE a user views another user's profile, THE system SHALL display the top communities where the user is most active.

THE profile SHALL display the following community participation information:

- **Top 3 Communities by Activity**: Display the 3 communities where user has posted or commented most frequently
  - Calculation: COUNT(posts + comments) per community, sorted descending
  - If user has fewer than 3 communities with activity, display all active communities
  - If user has no activity in any community, display message "This user hasn't posted in any communities yet"

- **For Each Community Displayed**: Show:
  - Community name (r/community_name format) as clickable link
  - Post count in that community (e.g., "23 posts")
  - Comment count in that community (e.g., "156 comments")
  - User's karma earned in that community specifically (if tracked separately - optional feature)
  - Last activity date in that community (relative format: "1 week ago")

- **Community Links**: Each community name is clickable and links directly to the community page

**Example Display Format:**
```
Most Active In:
• r/programming (23 posts, 156 comments) - Active 3 days ago
• r/gaming (12 posts, 89 comments) - Active 1 week ago  
• r/movies (8 posts, 34 comments) - Active 2 weeks ago
```

WHERE user has community-specific karma (tracked per community):
- Display as "23 posts, 156 comments, 1,200 karma" in that community
- Allows seeing user's influence/standing in specific communities

WHERE user is viewing their own profile, THE system SHALL additionally display:
- **Subscribed Communities**: List of all communities (beyond top 3) user is subscribed to with subscriber count and join date

### 3.4 Account Age and Seniority Indicators

THE user profile SHALL display:

- **Join Date**: Formatted as "Joined [MONTH] [YEAR]" (e.g., "Joined November 2024"). Uses full month name and 4-digit year. Immutable timestamp from account creation.

- **Account Age**: For moderators and administrators, display the number of days the account has existed in format "Account age: [X] days" or "Veteran member since [DATE]". Calculated as: floor(NOW() - join_date / 86400). Updated daily at midnight UTC.

  Example displays:
  - Account age: 892 days
  - Veteran member since November 2022
  - Long-time contributor (1000+ days old)

- **Seniority Badge** (optional feature, implementation at development team discretion):
  
  Display visual indicators for account longevity:
  - Bronze Badge: 365+ days of membership (1+ year)
  - Silver Badge: 730+ days of membership (2+ years)
  - Gold Badge: 1095+ days of membership (3+ years)
  - Platinum Badge: 1825+ days of membership (5+ years)

  Formula for eligibility: 
  ```
  IF (NOW() - join_date) ≥ 365 days THEN award Bronze Badge
  IF (NOW() - join_date) ≥ 730 days THEN award Silver Badge
  IF (NOW() - join_date) ≥ 1095 days THEN award Gold Badge
  IF (NOW() - join_date) ≥ 1825 days THEN award Platinum Badge
  ```

  WHERE user qualifies for multiple badges, display only the highest tier earned.

  Badges displayed next to username with tooltip: "Account active for [X] years"

## 4. Follow/Following System

### 4.1 Follow Relationships and Bidirectional Design

THE system SHALL support following relationships between users, allowing users to discover and track activity from community members they find valuable or interesting.

#### Core Follow Mechanics

THE member users (role = "member", "moderator", "administrator") SHALL be able to follow other member users. WHERE a member user clicks the "Follow" button on another user's profile, THE system SHALL:

- Create a follow relationship record in database: (follower_id, following_id, created_at timestamp)
- Validate that user is not attempting to follow themselves (deny with message "You cannot follow yourself")
- Validate that follower and following users both exist and are not banned/deleted (deny if target is deleted)
- Display "Following" on the button with updated state, offering option to unfollow (button changes to "Unfollow" text)
- Update the followed user's follower count (increment by 1)
- Increment the follower's following count (increment by 1)
- Create notification for followed user (if notifications enabled): "[User] started following you"
- Log the follow action in user activity audit trail
- Return HTTP 200 with success message "Now following [username]"

WHERE a member user clicks "Unfollow", THE system SHALL:

- Delete the follow relationship record from database
- Change button display back to "Follow" (from "Unfollow")
- Decrement the followed user's follower count by 1
- Decrement the follower's following count by 1
- Send notification to unfollowed user (optional): "[User] unfollowed you"
- Log unfollow action in activity audit
- Return HTTP 200 with success message "Unfollowed [username]"

WHERE a guest user or unauthenticated visitor views any user's profile, THE follow functionality SHALL be completely unavailable/hidden. Display message "Sign in to follow users" where follow button would be.

WHERE a member views another member's profile and already follows that user, THE system SHALL:
- Display "Following ✓" in place of "Follow" button
- Show unfollow option on click
- Display with visual indication (checkmark icon, different color) that relationship exists

#### Follow Relationship Constraints and Validation

THE system SHALL enforce the following rules:
- Users cannot follow themselves (validation on client and server)
- Cannot follow deleted/banned users (server validation)
- Cannot double-follow (following same user twice creates only one record)
- IF follow relationship already exists and user clicks Follow again, THE system SHALL idempotently return success without creating duplicate

### 4.2 Follow Lists Display and Pagination

THE user profile SHALL display two separate tabs for follow relationships:

#### Followers List Tab

THE "Followers" tab SHALL display:

- **Followers Count**: Display total count of followers in tab header (e.g., "Followers (1,234)")
- **List of Followers**: Display users who are following this user
  - Paginated in groups of 20 users per page
  - Can navigate with pagination controls (page 1, 2, 3... next/previous)
  - Search within followers (search box to find specific follower by username)

- **For Each Follower**: Display:
  - Profile picture (100x100px thumbnail)
  - Username (clickable link to profile)
  - Join date (e.g., "Joined November 2024")
  - Total karma score with color-coded badge (green for high, neutral for medium, gray for low)
  - Mutual follow indicator (if viewing user is also following them, show "Follows you back ↔️")
  - Quick follow/unfollow button for each listed follower

- **Sorting Options**: Sort followers by:
  - Most recent (followers who followed most recently first)
  - Oldest (followers from earliest dates first)
  - Highest karma (followers with most karma first)

WHERE a user views another user's followers list, THE system SHALL display followers. 

However, IF the profile owner has set followers list to private via privacy settings, THE system SHALL:
- Hide the followers list entirely
- Display message: "This user has disabled follower visibility. You cannot see their followers."
- Still show followers count if enabled (optional)
- Allow profile owner and administrators to see full list regardless

#### Following List Tab

THE "Following" tab SHALL display:

- **Following Count**: Display total count of users being followed in tab header (e.g., "Following (342)")
- **List of Following**: Display users this user is following
  - Paginated in groups of 20 users per page
  - Pagination controls for navigation
  - Search within following list

- **For Each Following User**: Display same information as followers list:
  - Profile picture, username, join date, karma score
  - Mutual follow indicator
  - Unfollow button for each user

- **Sorting Options**: Same sort options as followers list

WHERE a user views another user's following list, THE system SHALL display the list.

However, IF the profile owner has set following list to private, THE system SHALL:
- Hide the following list entirely
- Display message: "This user has hidden their following list."
- Allow owner and administrators to see full list

### 4.3 Follow Preferences and Privacy Controls

THE member users SHALL have comprehensive privacy controls for follow relationships, accessible in account settings under "Privacy & Social":

WHEN a member user navigates to their account settings, THE system SHALL present the following toggles with clear descriptions:

**1. Allow Others to Follow Me**
- Default: ON (enabled)
- When ON: Users can follow this account freely by clicking Follow button
- When OFF: New follow requests are blocked with message "This user does not accept new followers"
- Existing followers are NOT removed when toggled OFF (retroactive unfollowing optional)
- Allows current followers to continue seeing activity
- Users attempting to follow receive message: "[Username] is not accepting new followers at this time"

**2. Show My Followers**
- Default: ON (enabled)
- When ON: Followers list is visible to all users (public)
- When OFF: Followers list is hidden from everyone except self and administrators
- Non-owners see: "This user has hidden their follower list"
- Still shows followers count (optional to hide)

**3. Show My Following**
- Default: ON (enabled)
- When ON: Following list is visible to all users (public)
- When OFF: Following list is hidden from everyone except self and administrators
- Non-owners see: "This user has hidden their following list"
- Still shows following count (optional to hide)

**4. Notify Me When Users Follow/Unfollow**
- Default: ON (enabled)
- When ON: Receive notifications when users follow or unfollow
- When OFF: Silent notifications (no email, no dashboard alert)
- Notifications only for follows, not unfollows (unless explicitly enabled)

WHEN a member disables "Allow Others to Follow Me" AND a user attempts to follow, THE system SHALL:
- Prevent the follow action on server side
- Return HTTP 403 (Forbidden) with message: "This user is not accepting followers"
- Display to requesting user: "[Username] is not accepting new followers at this time"
- Offer alternative: "You can still view their public posts and comments"

WHERE a follow preference is changed, THE system SHALL:
- Apply changes immediately to new actions
- Retroactively apply visibility changes to existing relationships (if applicable)
- Provide clear warning about implications before confirming changes
- Example: "Making your following list private will hide it from [count] current followers"

### 4.4 Follow-Based Notifications and Activity

WHEN a user you are following creates a new post, THE system SHALL optionally notify the follower according to notification preferences.

WHERE a member has enabled "Notify me about followed users' activity" in notifications settings, THE following notifications SHALL be triggered:

- **New post by followed user** in any community: Send notification "[User] posted in r/[community]"
  - Includes post title in notification
  - Clickable link to post
  - Frequency: Immediate or digest (configurable)

- **New comment by followed user** on a public post: Send notification "[User] commented on a post"
  - Includes comment preview (first 100 characters)
  - Clickable link to comment
  - Optional: only notify if comment receives high engagement (>10 upvotes)

- **User achievement**: When followed user reaches karma milestones or gets moderator role
  - "[User] reached 10K Karma!"
  - "[User] became a moderator of r/[community]"

THE follower SHALL be able to disable notifications for specific followed users:
- Right-click follow button to see options
- Select "Mute notifications from this user" (still followed, but silent)
- Select "Unfollow" to remove relationship entirely

THE system SHALL provide a notification setting with options:
- **All activity**: Notify about posts, comments, and achievements from followed users
- **Posts only**: Notify only about new posts, ignore comments
- **Achievements only**: Notify only about karma milestones and role changes
- **Disabled**: No notifications from followed users (default if not enabled)

WHERE a user has disabled general notifications, THE system SHALL not send follow-based notifications regardless of specific settings.

## 5. User Activity Timeline

### 5.1 Activity Feed Generation and Display

THE user profile SHALL display an "Activity" tab showing a chronological timeline of the user's contributions (posts and comments) to the platform.

#### Activity Timeline Display Format

WHEN viewing the Activity tab, THE system SHALL include the following elements for each activity:

- **Activity Type Icon**: Visual indicator showing activity type:
  - 📝 icon for "Posted" (text, link, or image post)
  - 💬 icon for "Commented" 
  - 🔁 icon for "Replied to comment" (if nested reply feature tracked separately)

- **Activity Type Label**: Text label next to icon: "Posted" or "Commented"

- **Community**: Name of the community where activity occurred (e.g., "r/programming") displayed with community icon. Clickable link to community page.

- **Content Title/Preview**:
  - For posts: Post title (up to 80 characters, truncated with ellipsis if longer)
  - For comments: First 150 characters of comment text, truncated with ellipsis if longer. If comment contains markdown, render formatting (bold, italic).
  - Both displayed as clickable links to the post/comment

- **Timestamp**: Relative time format (e.g., "3 days ago", "5 hours ago", "1 month ago"). 
  - Hover interaction shows exact timestamp: "Posted on November 15, 2024 at 3:45 PM UTC"
  - Updates dynamically every 5 minutes for recent activities (less than 1 hour old)

- **Engagement Metrics**:
  - For posts: Vote count (e.g., "↑ 234 upvotes") and comment count (e.g., "💬 12 comments")
  - For comments: Vote count only (e.g., "↑ 34") and reply count (e.g., "↪️ 2 replies")
  - Display as secondary text in smaller font
  - Color-coded: green for positive scores, red for negative, gray for zero
  - Updated in real-time with 5-minute batching

- **Content Status**: If applicable:
  - "[deleted by user]" badge if user deleted content
  - "[removed by moderator]" badge if moderator removed (with tooltip showing reason)
  - "Locked" badge if comments disabled on post

#### Activity Timeline Sorting and Filtering

WHEN user first loads Activity tab, THE system SHALL display timeline sorted by "Most Recent" by default.

THE activity timeline SHALL support the following sort options (selectable via dropdown), with instant refresh:

- **Most Recent First**: Activities sorted by creation date (created_at DESC), newest first. Default sort.
- **Most Popular**: Activities sorted by vote count (upvotes - downvotes DESC), highest score first
- **Most Commented**: For posts, sort by comment count (comment_count DESC). For comments, sort by reply count. Mixed timeline prioritizes posts by comment count.
- **Oldest First**: Activities sorted by creation date (created_at ASC), oldest first. Useful for viewing early activities.

THE activity timeline SHALL support the following filter options:

- **Show All**: Display all posts and comments from user (default)
- **Posts Only**: Display only posts created by user (hide comments)
- **Comments Only**: Display only comments created by user (hide posts)
- **By Community**: Dropdown to filter activities from specific community only
  - Shows list of communities user has posted/commented in
  - Select to filter
  - Option to select multiple communities (hold Ctrl/Cmd)
  - Shows "Showing activities from [X] communities" when multiple selected

- **By Date Range** (optional advanced filter):
  - Allow selection of custom date range
  - Predefined ranges: Past week, past month, past year, all time
  - Custom: "From [date] to [date]"

WHERE filters are applied, THE system SHALL:
- Display "Filtering by: [criteria]" indicator
- Update timeline to show only matching activities
- Show "[X] activities match your filters" count
- Provide "Clear filters" button to reset

### 5.2 Activity Timeline Pagination and Loading

THE system SHALL paginate activity timeline in groups of 20 items per page.

**Pagination Implementation:**

- **Page-based pagination**: Display page numbers (1, 2, 3...), previous/next buttons
- **Alternative: Infinite scroll/Load More**: When user scrolls to bottom of page, automatically load next batch of 20 activities with loading indicator
- **User preference**: Remember pagination preference (page-based vs scroll) per user
- **Page size options**: Allow 10, 20, 50 items per page (default 20)

WHEN a user reaches the end of a page or infinite scroll, THE system SHALL:
- Display "Loading more activities..." indicator briefly
- Load next page of 20 items in background
- Append to timeline without full page reload
- Maintain sort/filter selections
- Preserve scroll position (for infinite scroll) or show "Page X of Y"

WHEN loading completes, THE system SHALL:
- Remove loading indicator
- Display newly loaded activities
- Update count: "Showing 1-20 of 342 activities"
- Enable pagination controls for next page

WHERE user has no activities (0 posts and 0 comments), THE system SHALL display message: "No activities yet. [User] hasn't posted or commented."

### 5.3 Real-Time Activity Updates

WHEN a user is actively viewing another user's profile activity timeline, AND that user creates a new post or comment, THE system SHALL:

- Display the new activity at the top of the timeline within 5 seconds (using polling or websocket)
- Show "(new)" badge or highlight to indicate fresh content
- Optionally refresh the engagement metrics (vote counts) for visible activities every 30 seconds if enabled in user preferences
- Maintain user's scroll position (don't auto-jump to top unless user has "auto-scroll" enabled)

WHERE user prefers auto-refresh disabled, THE system SHALL:
- Not automatically load new activities
- Display "New activities available" button at top if activities exist
- User can click to refresh timeline
- Prevents disruption while reading

WHERE user navigates away from Activity tab and returns, THE system SHALL:
- Refresh timeline to show latest activities
- Maintain sort/filter selections
- Return to page 1 or top of timeline

### 5.4 Activity Privacy Controls and Visibility

THE member users SHALL control the visibility of their activity timeline through comprehensive privacy controls:

WHEN a member navigates to their account settings under "Privacy", THE system SHALL present:

**Activity Timeline Visibility** setting with three options:

1. **Public** (Default):
   - All users (guests and members) can see activity timeline
   - Displayed on public profile accessible to anyone
   - Activity included in search results and user discovery
   - Comments visible on posts show user's recent activity when hovering

2. **Members Only**:
   - Only authenticated members can view activity timeline
   - Guests see message: "Sign in to see this user's activity"
   - Moderators and administrators always have access
   - Activity not indexed by search engines

3. **Private**:
   - Only the user themselves can view their activity timeline
   - Other authenticated users see message: "This user's activity is private"
   - Moderators and administrators can view with "Private" indicator
   - Activity completely hidden from search and discovery

WHEN a user changes activity visibility setting, THE system SHALL:
- Apply change immediately
- Notify user of change with confirmation
- Show warning about implications: "Making activity private will hide your posts and comments from search results"
- Allow user to revert within 24 hours if they change mind
- Preserve activity in database (change is view permission, not deletion)

WHERE an administrator is reviewing a user's profile (for moderation), THE system SHALL always display the activity timeline regardless of privacy settings, with indicator "[Admin view - content is private]"

### 5.5 Activity Deletion and Moderation Status

WHEN a user deletes a post or comment, THE system SHALL:

- Remove it from their activity timeline immediately (soft delete)
- Display in separate "Deleted" view (visible to user only)
- Show count: "User has deleted X posts and Y comments"
- Allow user to view deleted activities for 7 days before permanent removal
- Update activity count: "Total posts created: 45 (3 deleted)"

WHERE content is removed by a moderator, THE system SHALL:

- Display in activity timeline with "[removed by moderator]" indicator
- Show removal reason in tooltip/hover (e.g., "Violated Rule 5: Be respectful")
- Display to user and administrators only; hidden from other viewers
- Show "Appeal" link for user to dispute removal
- Include date and moderator name if user hovers over badge

WHEN moderator removes activity, THE system SHALL:
- Keep content in database but mark as removed (soft delete)
- Preserve reason and moderator information in audit trail
- Display to original author: "Your [post/comment] was removed by r/[community] moderators for: [reason]. You can appeal within 30 days."

WHEN displaying user profile to other members after content removal, THE system SHALL:
- Hide removed activities from timeline
- Show count of removed content: "This user has [X] removed posts/comments"
- Do NOT hint at what content was removed (privacy for user)

## 6. Cross-Platform Profile Consistency

### 6.1 Profile Information Synchronization

THE user profile information displayed on user profile pages SHALL remain consistent with profile information displayed elsewhere in the system through automatic syncing:

**Profile Information Consistency Requirements:**

- User mention displays in comments and posts (username, profile picture, link to profile) SHALL reflect current profile picture and username
- Author display on posts (profile picture, username, karma badge, join date) SHALL match profile page
- Author display on comments (profile picture, username, karma) SHALL be consistent
- Moderator listings in communities (profile picture, username, role badge) SHALL link to updated profile
- User search results showing user cards (picture, username, karma, bio snippet) SHALL be current
- Notifications referring to users SHALL display current picture and username

WHERE a user updates their profile picture or bio, THE system SHALL:
- Update in primary profile database immediately
- Propagate update to all cached references within 60 seconds
- Update cached user cards/summaries within 60 seconds
- CDN cache invalidates immediately (cache key includes version number)
- Downstream services (search index, notification service) sync within 60-90 seconds

WHEN synchronization completes, THE system SHALL:
- All references across platform show updated information
- No stale profile data visible anywhere
- No manual cache invalidation required (automatic)

### 6.2 Profile Display Rules by User Type and Authentication

THE profile pages SHALL follow these visibility and accessibility rules based on user type:

#### Guest User (Unauthenticated) Viewing Any User's Profile

THE guest user SHALL see:
- ✅ Username
- ✅ Join date
- ✅ Total karma (Post Karma + Comment Karma sum)
- ✅ Verified email badge (if applicable)
- ✅ Moderator badges with community links (if applicable)
- ✅ Bio/description
- ✅ Profile picture
- ✅ Posts archive (public posts only, sorted by hot/new/top/etc.)
- ✅ Comments archive (public comments only, sorted)
- ✅ Top communities by activity
- ✅ Activity timeline (if set to Public)
- ✅ Followers/Following counts (if not hidden)
- ✅ Account age badge (if visible)
- ✅ Karma milestone badges (if visible)

THE guest user SHALL NOT see:
- ❌ Email address
- ❌ Theme preferences
- ❌ Notification settings
- ❌ Saved content
- ❌ Private activity timeline (see: "Sign in to see this user's activity")
- ❌ Hidden followers/following lists (see: "Sign in to view followers")
- ❌ Last active time (if user disabled visibility)
- ❌ Follow button (see: "Sign in to follow users")
- ❌ Account suspension status
- ❌ Deleted posts/comments
- ❌ Removed posts/comments with moderation reasons

WHERE guest attempts to access private sections, THE system SHALL display login/registration prompt encouraging them to create account.

#### Member User Viewing Another Member's Profile

THE member user SHALL see all information visible to guests, PLUS:
- ✅ Average post score
- ✅ Average comment score
- ✅ Account age (if moderator/admin)
- ✅ Last active time (if not disabled by profile owner)
- ✅ Communities moderated (with links)
- ✅ Follow button (if target allows followers)
- ✅ Follower/following counts and lists (if not hidden)
- ✅ Public follower/following lists (if not hidden by profile owner)

THE member user SHALL NOT see:
- ❌ Email address
- ❌ Theme preferences
- ❌ Notification settings
- ❌ Saved content of other users
- ❌ Private activity timeline (see: "This user's activity is private")
- ❌ Hidden followers/following lists (see: "This user has hidden their follower list")
- ❌ Password or security settings
- ❌ Account suspension or ban status
- ❌ Deleted posts/comments
- ❌ Removed content with moderator reasons

WHERE member attempts to follow a user who disabled followers, THE system SHALL show: "[User] is not accepting new followers"

#### Member User Viewing Their Own Profile (Self)

THE member user viewing their own profile SHALL see all information listed above for other members, PLUS:
- ✅ Email address (with option to verify if unverified)
- ✅ Theme preferences and all settings
- ✅ Notification settings with toggles
- ✅ Saved content list (private section)
- ✅ Private activity timeline (even if set to private, user sees it)
- ✅ All followers/following lists with options to manage
- ✅ Deleted and removed posts/comments
- ✅ Password management and account security options
- ✅ Privacy settings and controls
- ✅ Account suspension or warning status (if applicable)
- ✅ Login history and active sessions
- ✅ Data download and deletion options
- ✅ Edit/update buttons for all customizable fields

WHERE user has not verified email, THE system SHALL display prompt: "Verify your email to unlock all features" with resend verification button

#### Moderator or Administrator Viewing Any User Profile

THE moderator/administrator SHALL see:
- ✅ All information visible to members
- ✅ Account status (Active, Suspended, Banned, etc.)
- ✅ Admin-only metrics (if administrator):
  - Account flags or warnings
  - Suspension/ban history with reasons
  - Report history (reports filed by this user)
  - Moderation actions taken against this user
- ✅ Email address (administrators only)
- ✅ Account creation details and metadata
- ✅ All activities including deleted/removed content
- ✅ Moderation audit trail (history of mod actions on this user)
- ✅ Access to moderation actions (if applicable):
  - Suspend/ban buttons (visible for non-admin users, disabled for other admins)
  - Restore removed content button
  - View reports against this user

WHERE moderator views user profile in their community:
- ✅ Can see community-specific moderation history
- ✅ Can see warnings/suspensions in that community
- ✅ Can take moderation actions (within their permission level)

WHERE administrator views any user profile:
- ✅ Can see all information
- ✅ Can take any moderation action (suspend, ban, etc.)
- ✅ Can access user's email, IP history, device information
- ✅ Can download user's complete data
- ✅ All actions logged in audit trail

## 7. Performance and Optimization

### 7.1 Profile Loading Performance Requirements

THE system SHALL retrieve and display complete user profile pages within defined time targets:

- **Profile header and basic info**: Load within 200ms (p95)
- **Profile with history tabs**: Load within 500ms (p95) for first page
- **Complete profile with all data**: Load within 2 seconds (p95)
- **Pagination/page transitions**: Load additional pages within 500ms (p95)

WHEN user profile has extensive history (1,000+ posts), THE system SHALL implement smart loading and caching:
- **Initial load**: Load profile summary and first page (25 items) only
- **Subsequent pages**: Load on-demand when user navigates or scrolls
- **Caching**: Cache profile summary for 5 minutes; cache post/comment pages for 1 minute
- **Database indexes**: Index on (user_id, created_at DESC) for efficient history queries
- **Pagination optimization**: Use keyset pagination (not offset-based) to maintain performance on deep pagination

WHEN system approaches performance targets, THE system SHALL:
- Use lazy loading for history (load as user scrolls)
- Implement virtual scrolling for extremely long lists
- Pre-cache frequently accessed pages (page 1-3)
- Archive or compress very old histories (>2 years)

### 7.2 Activity Timeline Caching Strategy

THE system SHALL cache user activity timeline data with the following caching strategy:

- **Most recent 50 activities**: Cache for 1 minute in Redis
  - Key: `user:activity:{user_id}:recent`
  - Invalidated when user creates new post/comment
- **Older activities (beyond 50)**: Cache for 5 minutes
  - Key: `user:activity:{user_id}:page:{page_num}`
  - Invalidated less frequently
- **User profile summary**: Cache for 5 minutes
  - Key: `user:profile:{user_id}:summary`
  - Includes karma scores, stats, join date
  - Invalidated when user updates profile or votes change

WHEN cache is invalidated:
- Delete specific cache key(s) that are affected
- Keep other cache entries intact
- For vote changes, invalidate activity cache (may affect scores) but keep summary if karma unchanged

WHEN cache miss occurs:
- Query database for fresh data
- Store in cache with appropriate TTL
- Return to user within performance SLA

### 7.3 Image Optimization and Delivery

THE system SHALL optimize all profile picture displays for performance:

- **Serve appropriate image size** based on context:
  - Thumbnails: 100x100px (for lists, user mentions in comments)
  - Profile header: 200x200px
  - Full resolution (optional): 400x400px
- **Use modern image formats**:
  - Primary: WebP format (superior compression)
  - Fallback: JPEG for older browsers
  - Lazy load thumbnail before serving larger sizes
- **Implement lazy loading**:
  - For profile pictures in lists, load only when visible in viewport
  - Use `loading="lazy"` HTML attribute
  - Show placeholder/blurred image while loading
- **Use CDN for delivery**:
  - Serve images from geographic CDN closest to user
  - Response time target: <200ms from user location
  - Cache images at edge for 7 days
- **Filename strategy**:
  - Include version number in URL: `/avatars/user123_v2.webp`
  - Allows cache busting when image updated

### 7.4 Database Query Optimization for Profiles

THE system SHALL maintain database indexes to support profile operations efficiently:

**Required Indexes:**
- `CREATE INDEX idx_users_created_at ON users(created_at DESC)` - For user discovery/sorting
- `CREATE INDEX idx_posts_user_created ON posts(user_id, created_at DESC)` - For user post history
- `CREATE INDEX idx_comments_user_created ON comments(user_id, created_at DESC)` - For user comment history
- `CREATE INDEX idx_follows_follower ON follows(follower_id)` - For follower lookups
- `CREATE INDEX idx_follows_following ON follows(following_id)` - For following lookups
- `CREATE INDEX idx_votes_user_post ON votes(user_id, post_id UNIQUE)` - Prevent double voting
- `CREATE INDEX idx_votes_user_comment ON votes(user_id, comment_id UNIQUE)` - Prevent double voting on comments
- `CREATE INDEX idx_karma_scores_user ON users(id, karma_posts, karma_comments)` - For karma display

**Query Optimization Strategies:**
- Use LIMIT/OFFSET or keyset pagination for history queries
- Fetch user summary in single query (avoid N+1 queries)
- Use EXPLAIN to verify indexes are being used
- Monitor slow query log; any query >200ms is optimized
- Cache frequently accessed profiles to reduce database load
- For community participation metrics, use materialized view updated hourly

### 7.5 Client-Side Caching and Performance

THE system frontend (not within this spec but relevant for context) SHALL implement:

- **Browser cache**: Store user's own profile data in localStorage
- **Service worker**: Cache profile pages for offline viewing (where applicable)
- **Request debouncing**: Don't refetch profile data if already loaded within last 30 seconds
- **Lazy loading**: Load tabs only when clicked (don't load all history on initial page load)
- **Virtual scrolling**: For very long lists of posts/comments, render only visible items

---

## Summary of Complete Requirements

This specification defines comprehensive user profile functionality for the community platform. All requirements use EARS format for precise implementation, specify data types and limits, define access control per user type, and establish performance targets. The system balances user privacy (private activity timelines, hidden followers lists) with transparency (public profiles, activity feeds) while providing efficient querying and display of user-generated content across multiple views.

---

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, caching mechanisms, algorithms for sorting/ranking, etc.) are at the discretion of the development team.*