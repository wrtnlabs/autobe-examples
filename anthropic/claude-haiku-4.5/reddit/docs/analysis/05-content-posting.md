# Content Posting System

## Overview

The content posting system enables authenticated users to create and manage text, link, and image posts within communities. Posts are the primary mechanism through which members engage with communities, build reputation through voting, and participate in discussions via comments. This document specifies all requirements for post creation, management, validation, and lifecycle.

The scope covers:
- User registration and account creation workflow
- User authentication and login processes
- User profile management and customization
- The karma (reputation) system that tracks user contributions
- User preferences and settings management
- Account security and protection mechanisms
- User account lifecycle management

This document focuses on business requirements for how users interact with their accounts and build reputation. All user-facing behaviors and business logic are detailed here for backend developers to implement.

---

## Post Types and Creation

### Supported Post Types

THE community platform SHALL support three distinct post types:

1. **Text Posts** - User-generated written content with optional markdown formatting
2. **Link Posts** - External URLs with automatic metadata extraction and preview
3. **Image Posts** - Visual content with multiple image support per post

WHEN a member selects a post type during creation, THE system SHALL present type-specific fields and validation rules.

### Post Creation Workflow

WHEN a member initiates post creation in a community, THE system SHALL:

1. Verify the member is subscribed to the target community (optional, but recommended UX)
2. Validate the member has posting permissions in that community
3. Display the appropriate form for the selected post type
4. Accept post content and metadata
5. Validate all content against community and platform rules
6. Calculate initial metadata (word count, character count, image count)
7. Store the post in draft or published state based on user action
8. Generate searchable indices for content discovery
9. Return the created post with unique identifier and timestamp
10. Notify community moderators if content requires review

### Universal Post Requirements

WHEN a member creates any post type, THE system SHALL require:

- **Post Title** (mandatory, 1-300 characters)
  - Used as primary identifier in feeds and search results
  - Must contain at least one alphanumeric character
  - HTML tags SHALL be automatically stripped
  - URLs SHALL be converted to text links if present in title

- **Community Selection** (mandatory)
  - Member SHALL select target community at creation time
  - Community MUST exist and member MUST have posting privileges
  - Post SHALL appear in community feed only

- **Content** (mandatory, type-specific)
  - Text posts: 1-40,000 characters
  - Link posts: valid URL (1-2,048 characters)
  - Image posts: at least one image (up to 10 images per post)

- **Visibility** (optional, defaults to public)
  - Public posts appear in community feeds
  - Archived posts appear only in user history and direct links
  - Only post creator and moderators can change visibility

- **NSFW Flag** (optional, defaults to false)
  - Marks content as Not Safe For Work
  - Requires explicit user confirmation when toggled
  - Applies to entire post across all post types

- **Spoiler Warning** (optional, defaults to false)
  - Marks post content as containing spoilers
  - Content preview SHALL be hidden until user clicks to reveal
  - Text, link titles, and image thumbnails SHALL be obscured

### Permission Requirements

- **Guest Users** (kind: guest) SHALL NOT create posts
  - System SHALL return HTTP 401 Unauthorized with message "Must be logged in to post"
  
- **Members** (kind: member) SHALL create posts in subscribed communities
  - IF member has NOT subscribed to community, THEN system SHALL display subscription prompt before allowing post creation
  - Members can create unlimited posts (subject to rate limiting per section below)

- **Moderators** (kind: admin) SHALL create posts with additional capabilities
  - Can create posts in any community they moderate
  - Can immediately pin/sticky posts they create
  - Can mark own posts as moderator announcements

- **Administrators** (kind: admin) SHALL create posts in any community
  - Can create system-wide announcement posts
  - Posts SHALL be marked with administrator badge

## Text Posts

### Text Post Requirements

WHEN a member creates a text post, THE system SHALL accept:

- **Main Content** (mandatory, 1-40,000 characters)
  - Plain text and markdown formatting supported
  - HTML SHALL be stripped and escaped to prevent XSS
  - URLs SHALL be automatically converted to clickable links
  - Line breaks and formatting SHALL be preserved

- **Markdown Support**
  - Bold: `**text**` or `__text__`
  - Italic: `*text*` or `_text_`
  - Headers: `# Header 1` through `###### Header 6`
  - Code blocks: ` ```code``` ` for multi-line, ` `code` ` for inline
  - Links: `[text](url)` format
  - Lists: `- item` for unordered, `1. item` for ordered
  - Blockquotes: `> quote`
  - Horizontal rule: `---` or `***` or `___`

### Text Post Validation

- IF post contains fewer than 1 character, THEN system SHALL return validation error "Post content is required"
- IF post exceeds 40,000 characters, THEN system SHALL return validation error "Post exceeds maximum length of 40,000 characters"
- IF post contains ONLY whitespace, THEN system SHALL return validation error "Post content cannot be empty"
- IF post contains JavaScript, iframes, or executable scripts, THEN system SHALL sanitize by escaping HTML entities

### Text Post Processing

WHEN a text post is created, THE system SHALL:

1. Strip HTML tags and escape special characters
2. Process markdown formatting into rich text representation
3. Extract plain text preview (first 500 characters)
4. Count total words and characters
5. Generate URL links for any detected URLs in content
6. Calculate content hash for duplicate detection
7. Index content for full-text search
8. Store processed content and original raw content

### Text Preview Display

THE system SHALL generate automatic previews for text posts:
- Display first 500 characters or 3 lines, whichever comes first
- Show "..." indicator if content is truncated
- Include plain text version (markdown stripped) for preview
- Preserve line breaks in preview display

## Link Posts

### Link Post Requirements

WHEN a member creates a link post, THE system SHALL:

1. Accept a URL (required, 1-2,048 characters)
2. Validate URL format and accessibility
3. Attempt to extract Open Graph metadata
4. Generate link preview with title and thumbnail
5. Detect and flag suspicious domains
6. Check for duplicate links in community

### URL Validation

- IF URL is malformed or invalid, THEN system SHALL return HTTP 400 error "Invalid URL format"
- IF URL uses unsupported protocol (not http/https), THEN system SHALL return error "Only HTTP and HTTPS URLs are supported"
- IF URL is blacklisted or flagged as malicious, THEN system SHALL prevent post creation and alert user
- IF URL resolves to local network address (127.0.0.1, localhost, private IP ranges), THEN system SHALL block and return error "Cannot post local network URLs"
- IF URL contains data: scheme or javascript: scheme, THEN system SHALL block immediately

### Open Graph Metadata Extraction

WHEN a link post is created, THE system SHALL attempt to:

1. Fetch the target URL with 5-second timeout
2. Parse Open Graph meta tags from page HTML
3. Extract metadata fields:
   - `og:title` - Primary title for link preview
   - `og:description` - Description text (max 500 characters)
   - `og:image` - Preview image URL
   - `og:type` - Content type indicator
4. Fall back to page title and meta description if OG tags missing
5. Extract the domain name for display
6. Cache extracted metadata for 7 days to prevent re-fetching

### Link Preview Generation

THE system SHALL display link previews with:

- **Link Title** (from og:title or page title, max 300 characters)
  - Displayed prominently in post preview
  - Clickable and links to original URL
  
- **Domain Name** (extracted from URL)
  - Displayed below title for context
  - Example: "reddit.com" for link to reddit.com/r/...
  
- **Description** (from og:description or meta description, max 500 characters)
  - Shows preview of linked page content
  - Truncated with "..." if longer than 500 characters
  
- **Thumbnail Image** (from og:image)
  - Resized to 300x200 pixels or smaller
  - Displayed on left side of preview
  - IF no image available, THEN show domain icon or generic link icon

### Duplicate Link Detection

WHEN a member attempts to create a link post, THE system SHALL:

1. Normalize URL (remove trailing slashes, convert to lowercase, remove parameters if applicable)
2. Check if identical URL exists in same community
3. IF duplicate found, THEN notify user: "This link has already been posted to this community" with link to original post
4. Allow user to proceed anyway (may create duplicate intentionally for different discussion)

### Link Post Spam Prevention

- IF same URL is posted to same community more than 3 times, THEN flag for moderator review
- IF same URL is posted by member to more than 5 communities in 1 hour, THEN rate limit and block further link post creation for 1 hour
- IF URL domain is in spam blacklist, THEN block post creation immediately

## Image Posts

### Image Post Requirements

WHEN a member creates an image post, THE system SHALL accept:

- **Image Files** (mandatory, 1-10 images per post)
  - Supported formats: JPEG, PNG, WebP, GIF
  - Each image must be between 100 bytes and 20 MB
  - Minimum dimensions: 100x100 pixels
  - Maximum dimensions: 10,000x10,000 pixels

- **Image Upload Process**
  - Accept multipart/form-data request
  - Validate file headers (magic bytes) match declared format
  - Reject files where extension doesn't match actual format
  - Scan for malicious embedded content
  - Process images in order submitted

### Image Format Specifications

| Format | MIME Type | Max Size | Quality | Notes |
|--------|-----------|----------|---------|----------|
| JPEG | image/jpeg | 20 MB | Lossy | Best for photos |
| PNG | image/png | 20 MB | Lossless | Best for graphics |
| WebP | image/webp | 20 MB | Lossy/Lossless | Modern format, better compression |
| GIF | image/gif | 20 MB | Lossless | Supports animation |

### Image Validation

- IF image file size exceeds 20 MB, THEN return error "Image exceeds maximum size of 20 MB"
- IF image dimensions smaller than 100x100 pixels, THEN return error "Image must be at least 100x100 pixels"
- IF image dimensions exceed 10,000x10,000 pixels, THEN return error "Image exceeds maximum dimensions"
- IF image format not supported, THEN return error "Format not supported. Use JPEG, PNG, WebP, or GIF"
- IF image file header (magic bytes) doesn't match extension, THEN return error "File format mismatch. Uploaded file does not match declared format"
- IF image appears to contain malicious embedded content, THEN block upload and alert administrators

### Image Processing and Storage

WHEN an image post is created, THE system SHALL:

1. Generate unique identifier for each image
2. Store original image in cloud storage with public URL
3. Generate 3 derivative versions:
   - **Thumbnail** (300x300px) - For feed display
   - **Medium** (800x800px) - For detail page
   - **Full** (original size, max 10,000x10,000) - For full-res viewing
4. Preserve image metadata (EXIF data stripped for privacy)
5. Generate blurhash string for progressive loading
6. Index image for content-based search
7. Store file hashes to detect duplicate uploads
8. Create CDN-optimized URLs for fast delivery

### Image Metadata Handling

- EXIF data SHALL be stripped from all uploaded images (prevents location leakage)
- Alt text for accessibility SHALL be optional, encouraged for images
- Image descriptions SHALL support Markdown formatting
- Image captions SHALL be displayed below each image

### Multiple Image Display

WHEN post contains multiple images, THE system SHALL:

1. Display images as gallery in creation order
2. Show navigation controls (previous/next arrows)
3. Display current position indicator (Image 1 of 5)
4. Support keyboard navigation (arrow keys in detail view)
5. Support swipe navigation on mobile
6. Generate gallery layout:
   - Single image: full width up to 800px
   - 2-10 images: grid layout, 2 columns on desktop, 1 on mobile
   - Images maintain aspect ratio with uniform grid sizing

### Image Spam and Safety

- IF image is detected as duplicate of recently posted image (same hash), THEN notify user
- IF image appears to contain nudity or explicit content, THEN flag for moderation review
- IF member posts more than 10 images in 1 hour, THEN rate limit further image uploads

## Post Metadata and Organization

### Post Metadata Fields

EVERY post SHALL store and maintain the following metadata:

- **Post ID** (system-generated UUID)
  - Unique identifier for post
  - Used in URLs and API references

- **Creator ID** (user ID)
  - Member who created the post
  - Used for attribution and permissions

- **Community ID** (community identifier)
  - Community where post was created
  - Determines which feed post appears in

- **Title** (required, 1-300 characters)
  - Post headline/subject
  - Stripped of HTML tags
  - Searchable and indexable

- **Created Timestamp** (UTC datetime)
  - When post was published
  - Used for sorting and chronological feeds
  - Immutable after creation

- **Updated Timestamp** (UTC datetime)
  - When post was last edited
  - NULL if never edited
  - Used to show "edited" indicator to users

- **Post Type** (text | link | image)
  - Determines which content field is populated
  - Immutable after creation

- **Content** (type-specific)
  - Text: markdown and plain text
  - Link: URL and extracted metadata
  - Image: image URLs and metadata array

- **Vote Score** (initially 0)
  - Sum of upvotes minus downvotes
  - Starts at 0 (creator's auto-upvote handled separately in voting system)
  - Updated in real-time as votes arrive

- **Comment Count** (initially 0)
  - Total number of comments on post
  - Updated when comments created or deleted

- **Visibility Status** (public | archived | deleted)
  - public: visible in feeds and search
  - archived: hidden from feeds, accessible via direct link and user history
  - deleted: soft-deleted, accessible to mods/admins only

- **NSFW Flag** (true | false, default false)
  - Marks content as adult/explicit
  - Content filtered from feeds based on user settings

- **Spoiler Flag** (true | false, default false)
  - Hides preview and summary until user clicks
  - Used for movie, game, book spoilers

- **Pinned Status** (false | by_moderator | by_community)
  - false: normal post
  - by_moderator: pinned by moderator (appears at top of community)
  - by_community: featured by community (rare, moderator-only)

- **Locked Status** (true | false, default false)
  - true: no further comments can be created
  - Typically set by moderators for sensitive topics or after extended discussion

### NSFW Content Handling

- THE system SHALL filter NSFW posts from default feeds
- WHEN a user enables "Show NSFW content" in preferences, THEN NSFW posts SHALL be displayed
- WHEN a post is created, IF member marks it NSFW, THEN system SHALL not display to users with NSFW disabled (default)
- IF member fails to mark clearly adult content as NSFW, THEN moderators may add flag and notify creator

### Spoiler Content Handling

- THE system SHALL hide spoiler post previews by default
- WHEN user hovers over spoiler tag, THE system SHALL show tooltip "Click to reveal spoiler"
- WHEN user clicks spoiler content, THEN full content SHALL be displayed
- Spoiler flag applies to:
  - Post title preview (show only number of characters)
  - Thumbnail images (blurred)
  - Link description (hidden)
  - Post type indicator only shown

### Post Locking

- WHEN a moderator locks a post, THE system SHALL prevent new comment creation
- Existing comments SHALL remain visible and readable
- THE system SHALL display lock indicator on locked posts: "Locked - No new comments accepted"
- Moderators can unlock posts to re-enable commenting

## Post Editing and Deletion

### Post Editing

WHEN a member edits a post, THE system SHALL:

1. Verify member is original creator or moderator
2. Allow editing of:
   - Post title
   - Post content (text, link, or image descriptions)
   - NSFW flag
   - Spoiler flag
   - Visibility status
3. Prevent editing of:
   - Post type (once created as text/link/image, cannot change)
   - Creation timestamp
   - Original creator

### Edit History and Versioning

- THE system SHALL track all post edits
- WHEN post is edited, THE system SHALL store:
  - Edit timestamp (UTC datetime)
  - Previous version of content
  - User who made edit (creator or moderator)
  - Edit reason/note (optional)
- WHEN post has been edited, THE system SHALL display "edited" indicator with timestamp
  - Format: "edited 2 hours ago"
  - Clicking indicator shows full edit history to authenticated users
- THE system SHALL retain full edit history for minimum 90 days
- Moderators SHALL view edit history of any post

### Edit Time Windows

- WHEN post is created, member has unlimited time to edit own posts
- THE system SHALL NOT enforce time limits on editing (can edit post from months ago)
- IF post is deleted, member CANNOT restore or edit (see deletion section)
- IF post is locked by moderator, member CANNOT edit (moderator can unlock to allow edit)

### Edit Validation

- ALL edit validation rules SHALL match original creation validation
- IF edit violates rules (exceeds character limit, wrong format), THEN system SHALL return validation error and not apply changes
- EDITS SHALL NOT reset vote counts or comment counts

### Post Deletion

WHEN a member or moderator deletes a post, THE system SHALL:

1. Verify deleter is original creator OR moderator/admin
2. Perform soft-delete (not hard-delete):
   - Set visibility status to "deleted"
   - Remove post from all feeds and search results
   - Hide post from community feeds
   - Remove from user's post history (except for user's own view)
3. Preserve post in database for integrity and audit:
   - Keep all vote data intact
   - Keep comment references intact
   - Retain edit history
   - Retain creator information
4. Display "[deleted]" placeholder in comments that reference deleted post
5. If post had comments, comments remain visible but show parent post as deleted

### Soft-Delete Behavior

- WHEN post is deleted, THE system SHALL:
  - Hide post from public feeds immediately
  - Hide post from community feeds immediately
  - Hide post from search results
  - Hide post from user's profile activity (when viewed by others)
  - Original post creator can still view own deleted posts in profile
  - Moderators and administrators can view deleted posts
  
- DELETED posts remain in database with visibility="deleted"
  - All vote data preserved
  - All comment relationships preserved
  - Complete edit history retained
  - Creator information retained
  
- WHEN user with direct link to deleted post attempts access, THEN:
  - IF user is original creator: show post with "deleted" indicator
  - IF user is moderator: show post with deletion reason and date
  - IF user is other authenticated user: return HTTP 404 "Post not found"
  - IF user is guest: return HTTP 404 "Post not found"

### Post Restoration

- THE system SHALL NOT support permanent restoration of deleted posts
- MODERATORS can un-delete posts by changing visibility back to "public"
- WHEN post is restored, post reappears in feeds and user profiles
- Full edit history remains intact

### Creator Deletion Impact

- WHEN a member account is deleted, all their posts SHALL be soft-deleted
- Community still retains post structure for comment integrity
- Comments on deleted user's posts show creator as "[deleted account]"
- Vote data preserved for community analytics

## Post Sorting and Feed Integration

### Feed Composition

WHEN a user views a community feed, THE system SHALL display posts in order determined by:

1. Selected sort algorithm (hot, new, top, controversial)
2. Time-based decay (posts older than 6 months deprioritized)
3. Vote activity and comment engagement
4. User subscription status

### Sorting Integration

THE community platform supports four post sort types (detailed in 08-post-sorting-discovery.md):

- **Hot** - Default sort combining recency and engagement
- **New** - Reverse chronological order
- **Top** - Highest vote score
- **Controversial** - Largest ratio of upvotes to downvotes

Each sort type uses mathematical scoring algorithms detailed in dedicated sorting requirements document.

## Spam Detection and Validation

### Content Validation Rules

WHEN post is submitted, THE system SHALL validate:

- **Title Requirements**
  - Must contain at least 1 alphanumeric character
  - Cannot be purely whitespace
  - Cannot exceed 300 characters
  - Cannot be empty

- **Content Requirements**
  - Text posts: 1-40,000 characters minimum and maximum
  - Link posts: valid URL format
  - Image posts: at least one image, maximum 10 images
  - Cannot be purely whitespace or empty

- **Keyword Filtering**
  - IF post contains excessive profanity, THEN flag for moderation
  - IF post contains spam keywords/phrases, THEN flag for automated review
  - System maintains configurable spam keyword list

### Duplicate Detection

- THE system SHALL detect and handle duplicate posts:
  
  **Exact Duplicates:**
  - IF same title + content submitted to same community within 1 hour by same user, THEN prevent and show error "You already posted this recently"
  - IF same link already posted to same community, THEN notify user of original post
  - IF same image content hash already posted, THEN notify user

  **Similar Duplicates:**
  - IF post is highly similar to recent post in same community (>80% title match), THEN alert user but allow creation
  - Similarity check ignores case and punctuation

### Rate Limiting for Post Creation

- WHEN member creates post, THE system SHALL enforce rate limits:

  **Per-User Limits:**
  - Member can create maximum 10 posts per hour
  - Member can create maximum 50 posts per day
  - IF limit exceeded, THEN return error "You're posting too fast. Please wait before posting again"
  - Rate limit applies per user, not per IP address

  **Per-Community Limits:**
  - Community can limit max posts per user per day (configured by moderators)
  - Default limit: no limit
  - If enforced, shows remaining quota to user

  **Global Limits:**
  - New accounts (< 1 day old) limited to 3 posts per hour
  - New accounts (1-7 days old) limited to 5 posts per hour
  - Limits prevent spam from new accounts

### Spam Flagging

WHEN post is created, THE system SHALL automatically flag for review IF:

- Post contains multiple external links (>3 links)
- Post title or content contains all caps text (>50% of text)
- Post is extremely short with multiple links (suspicious pattern)
- Post mentions promotional URLs repeatedly
- Post contains common spam phrases from spam database
- Post is created by new account with suspicious pattern

**Flagged posts:**
- Still published to community
- Added to moderation queue for review
- Visible to moderators in moderation dashboard
- Can be removed by moderators if confirmed spam

### Automated Content Moderation

- THE system SHALL use automated scanning for content violations:
  - Illegal content detection
  - Harassment or hate speech detection
  - Spam pattern detection
  - Copyright infringement detection (image matching)
  - Malware/phishing link detection

- IF automated system detects potential violation, THEN:
  - Flag post for human review
  - Hide post temporarily pending review (for serious violations)
  - Notify moderators of flagged post
  - Community members see "This content is being reviewed" message

### URL Validation for All Posts

- THE system SHALL validate any URLs appearing in posts:
  - Extract and validate all URLs from text post content
  - Validate link post primary URL
  - Check URLs against malware/phishing databases
  - Block shortened URLs that resolve to dangerous sites
  - Flag suspicious domains

- IF URL is detected as malicious, THEN:
  - Block post creation entirely for critical threats
  - Flag for moderation for suspected threats
  - Warn user of potential danger

## Post Metadata Indexing

### Search Indexing

WHEN post is created or edited, THE system SHALL:

1. Extract searchable fields:
   - Title (high weight in search)
   - Content (medium weight)
   - Community name (medium weight)
   - Creator username (low weight)

2. Index for full-text search:
   - Support word boundary matching
   - Support stemming (matching word variations)
   - Support phrase searching
   - Create inverted index for fast retrieval

3. Generate search tags:
   - Extract significant keywords from title
   - Extract hashtags if present in content
   - Determine content category/tags

### Database Indexing Strategy

THE system SHALL maintain indices for:

- Primary: `posts.id` (unique, fast lookup)
- Community: `posts.community_id` (for community feeds)
- Creator: `posts.creator_id` (for user profiles)
- Timestamp: `posts.created_at DESC` (for chronological sorting)
- Visibility: `posts.visibility` (hide deleted posts from queries)
- Vote Score: `posts.vote_score DESC` (for top posts sorting)
- Compound: `(community_id, created_at DESC)` (community feeds)
- Compound: `(creator_id, created_at DESC)` (user post history)
- Full-text: Search index on title + content

## Post Performance Considerations

### Feed Query Performance

- COMMUNITY feeds SHALL return paginated results (20-100 posts per page)
- QUERIES SHALL use indexed fields to return results in <500ms
- VOTE score calculations SHALL be cached and updated asynchronously
- COMMENT counts SHALL be cached and updated in real-time

### Caching Strategy

- RECENTLY created posts (< 1 day) are cached in memory for fast sorting
- POPULAR posts (>1000 votes) cached for 1 hour
- FEED queries cached for 5 minutes per user
- INVALID cache when post is edited or votes exceed thresholds

### Pagination

- DEFAULT page size: 25 posts
- MAXIMUM page size: 100 posts
- PAGINATION uses "keyset" pagination (not offset) for better performance with large datasets
- Users can navigate: next page, previous page
- Deep pagination (page 500+) may have degraded performance

---

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team. The team has full autonomy to choose the technology stack, architectural patterns, and deployment infrastructure that best serve the platform's needs.*
