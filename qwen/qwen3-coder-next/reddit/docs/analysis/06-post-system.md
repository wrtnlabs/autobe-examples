# Post System Requirements

## Business Overview

The post system forms the core content layer of the Reddit-like community platform. Users create, view, and interact with posts through a sophisticated ecosystem of content types, community integration, and comprehensive management capabilities. This document details all business requirements for post creation, management, and interaction.

## Business Model Context

Posts drive engagement and community growth by providing the primary content format for user interaction. The success of this platform depends on the quality and variety of posts users create, making the post system critical to the overall business strategy.

## User Actors and Post Capabilities

### Guest Actors
- Can view posts from all public feeds
- Can view individual post details
- CANNOT create, vote, or interact with posts

### Member Actors  
- Can create posts in communities they subscribe to
- Can view all posts in accessible feeds
- Can vote on posts and comments
- Can edit and delete their own posts
- Cannot edit or delete others' posts

### Moderator Actors
- Can view all posts in their assigned communities
- Can delete any post in their community
- Can view post author information for moderation purposes
- CANNOT edit others' posts (only delete)

### Owner Actors
- Have all Moderator capabilities plus
- Can view all posts across their community
- Can view detailed post analytics for moderation

## Post Creation Requirements

### Basic Post Information
WHEN a member creates a post, THE system SHALL require a title field that:
- MUST be between 1-300 characters
- CANNOT be empty or whitespace-only
- SHOULD be meaningful and descriptive

WHEN a member creates a post, THE system SHALL require the member to select one of three post types:
- Text post
- Link post
- Image post

### Text Post Requirements
WHEN a member selects text post type, THE system SHALL require:
- Text content field that MAY be between 0-100,000 characters
- Text content CANNOT exceed the maximum length
- Empty text content MAY be allowed (minimal text posts)

### Link Post Requirements
WHEN a member selects link post type, THE system SHALL require:
- URL field that MUST be a valid HTTP or HTTPS URL
- URL field MUST pass basic URL format validation
- URL field SHOULD point to a legitimate web resource
- URL field MUST be between 1-2,000 characters

### Image Post Requirements  
WHEN a member selects image post type, THE system SHALL require:
- Image upload field that accepts valid image files (JPEG, PNG, GIF, WebP)
- Image file size MUST NOT exceed 10MB per image
- Image dimensions SHOULD be reasonable for web display
- The system SHALL generate and store a thumbnail version

### Community Selection Requirements
WHEN a member creates a post, THE system SHALL require:
- Community selection from subscribed communities only
- The member MUST be currently subscribed to the selected community
- The system SHALL validate community subscription before allowing post creation
- The system SHALL prevent posts in communities the user has unsubscribed from

### Community Access Control
IF a member attempts to create a post in a community they are not subscribed to, THEN THE system SHALL:
- Return an appropriate error message
- Prevent the post creation operation
- Allow the user to subscribe to the community first

## Post Type Display Requirements

### Text Post Display
WHEN displaying a text post list view, THE system SHALL:
- Show first 200 characters of content (truncated)
- Display an ellipsis indicator for truncated content
- Show the full content when viewing the individual post
- Format text with proper line breaks and basic styling

### Link Post Display
WHEN displaying a link post list view, THE system SHALL:
- Show the domain name of the URL (e.g., "youtube.com")
- Extract domain name from the URL automatically
- Display the domain name in a consistent format
- Show a link icon or similar visual indicator

### Image Post Display
WHEN displaying an image post list view, THE system SHALL:
- Show a thumbnail image of the uploaded image
- Generate thumbnail dimensions (e.g., 150x150 pixels)
- Maintain aspect ratio for thumbnails
- Show an image icon or similar visual indicator

## Post Metadata and Display Information

### Core Post Information
WHEN viewing a post, THE system SHALL display:
- Title of the post
- Author's username
- Community name where the post was created
- Vote score (upvotes minus downvotes)
- Comment count for the post
- Time since posted (e.g., "3 hours ago", "2 days ago")
- Post type indicator (text, link, or image)

### Voting Score Display
THE system SHALL calculate vote score as:
- Total upvotes minus total downvotes
- Score CAN be negative if downvotes exceed upvotes
- Score is updated immediately when votes change

### Time Display Format
THE system SHALL display time information as:
- "X seconds ago" for posts less than 60 seconds old
- "X minutes ago" for posts less than 1 hour old
- "X hours ago" for posts less than 24 hours old  
- "X days ago" for posts less than 7 days old
- "X weeks ago" for posts less than 30 days old
- "X months ago" for posts less than 365 days old
- "X years ago" for posts older than 365 days

### Post Author Information
THE system SHALL display author information as:
- Author's username (NOT display name)
- Link to author's profile page
- Optional display of author's karma score next to username

## Post Editing Requirements

### Edit Permission Rules
IF a member attempts to edit a post, THEN THE system SHALL:
- Check that the member is the original author of the post
- Allow editing ONLY if the member is the post author
- Deny editing requests for posts owned by other users

### Editable Fields
WHEN a post author edits their post, THE system SHALL allow:
- Title field updates (1-300 characters)
- Content field updates (for text posts, 0-100,000 characters)
- URL field updates (for link posts, 1-2,000 characters)
- New image upload (for image posts, replacing previous image)

### Non-Editable Fields
WHEN a post is edited, THE system SHALL preserve:
- Original author information
- Original community association
- Original creation timestamp
- Vote counts and score (user votes remain unchanged)
- Comment count
- Any existing reports on the post

### Edit Validation
THE system SHALL validate all edited fields:
- Title length (1-300 characters)
- Text content length (0-100,000 characters)
- URL format and length (1-2,000 characters)
- Image file size (max 10MB)

IF validation fails, THEN THE system SHALL:
- Return specific error messages for each validation failure
- Maintain the post in its current state
- Allow the user to correct validation errors

## Post Deletion Requirements

### Delete Permission Rules
IF a member attempts to delete a post, THEN THE system SHALL:
- Check that the member is the original author of the post
- Check that the member is a moderator of the community
- Check that the member is the owner of the community
- Allow deletion if ANY of these conditions are met
- Deny deletion requests otherwise

### Cascading Deletion Effects
WHEN a post is deleted, THE system SHALL:
- Delete ALL comments associated with the post
- Remove ALL votes on the post and associated comments
- Update karma scores for the author (reversing vote impacts)
- Update community post count (decrement)
- Update author's post count

### User Experience Requirements
WHEN a post is deleted, THE system SHALL:
- Display an appropriate message confirming deletion
- Redirect the user to the appropriate feed or profile
- Remove the post from all feeds immediately

## Community Integration Requirements

### Community Association
WHEN a post is created, THE system SHALL:
- Associate the post with exactly one community
- Store the community ID for fast querying
- Maintain the community relationship permanently

### Community Post Count
WHILE a post exists, THE system SHALL:
- Maintain a running count of posts per community
- Increment count when a post is created
- Decrement count when a post is deleted
- Display the post count on community pages

### Community Access Control
IF a user attempts to view posts in a community, THEN THE system SHALL:
- Show all posts in that community (public access)
- Include posts from all users, regardless of subscription status
- Display community-specific content appropriately

### Unsubscription Impact
WHEN a user unsubscribes from a community, THE system SHALL:
- Allow the user to still see their existing posts in that community
- Continue showing the user's posts in community feeds
- Not prevent posts from appearing in community feeds
- Remove the user from Home Feed (subscribed communities only)

## Post View Requirements

### Individual Post View
WHEN a user views an individual post, THE system SHALL display:
- Complete post title
- Author's username and profile link
- Full content for text posts
- Full URL for link posts with click-through capability
- Full image for image posts with viewing options
- Vote score and voting controls
- Comment section with nested replies
- Time since posted
- Community name with link

### Post Content Rendering
THE system SHALL render post content as:
- Text posts: Formatted text with basic HTML support or Markdown
- Link posts: Working URL that opens in new tab
- Image posts: Full-size image with zoom capability

### Content Sanitization
THE system SHALL sanitize all user content to prevent:
- XSS attacks through HTML/JavaScript injection
- Malicious URLs or scripts
- Inappropriate content that violates community standards
- Data exfiltration attempts

## Post Query and Search Requirements

### Community-Specific Queries
WHEN viewing a community feed, THE system SHALL:
- Retrieve posts from the specific community
- Include posts from all authors in that community
- Return posts sorted according to selected criteria
- Support pagination for large result sets

### Post Count Retrieval
WHEN displaying feed or community pages, THE system SHALL:
- Retrieve total post count for pagination
- Calculate number of pages based on page size
- Support efficient count queries without retrieving all data

## Performance Requirements

### List View Performance
WHEN loading a feed with multiple posts, THE system SHALL:
- Display first page of posts within 2 seconds
- Preload necessary data (author info, community info)
- Lazy load images and heavy content
- Use efficient database queries to minimize load times

### Individual Post Performance
WHEN loading an individual post, THE system SHALL:
- Display the post and basic metadata within 1 second
- Load comments in batches to avoid overwhelming the user
- Cache frequently accessed data for faster retrieval

## Error Handling Requirements

### Post Creation Errors
IF post creation fails, THEN THE system SHALL:
- Return specific error codes for each failure mode
- Provide user-friendly error messages
- Preserve entered data for retry
- Log errors for debugging purposes

### Common Error Scenarios:
1. **Validation Errors**:
   - Title too short or too long
   - Content exceeds character limits
   - Invalid URL format
   - Image file too large
   - Invalid image format

2. **Authorization Errors**:
   - Not subscribed to community
   - User is banned from community
   - Attempting to create post as guest

3. **System Errors**:
   - Server error during image upload
   - Database connection failure
   - Community no longer exists

### Error Response Format
THE system SHALL return errors in the following format:
- HTTP status code matching error type
- Error code string for programmatic handling
- Human-readable error message
- Field-specific errors when applicable

## Business Rules and Constraints

### One Post, One Community
A post MUST belong to exactly one community.
A post CANNOT be moved between communities after creation.

### Author Ownership
A post's author CANNOT be changed after creation.
Only the author, moderators, and owners can modify/delete posts.

### Community Subscription Requirement
Members MUST be subscribed to a community to create posts there.
Members CAN still view community feeds without subscription.

### Karma Impact
Each post vote impacts the author's karma score:
- Upvote adds 1 to author's karma
- Downvote subtracts 1 from author's karma
- Vote removal reverses the karma adjustment
- Total karma reflects all post and comment votes

### Content Permanence
Posts CANNOT be "soft deleted" - deletion must be permanent.
Deleted posts CANNOT be recovered after deletion.
Moderator deletions ARE tracked for audit purposes.

## User Journey Integration

### New User Creating First Post
1. User registers and logs in as Member
2. User browses communities and subscribes to interest areas
3. User clicks "Create Post" button
4. User selects post type (text, link, or image)
5. User fills in title and relevant content fields
6. User selects community from subscribed list
7. User submits post
8. System validates and creates post
9. Post appears in relevant feeds
10. User receives confirmation of successful creation

### Experienced User Modifying Post
1. User navigates to their post
2. User clicks "Edit" button
3. System validates user is the post author
4. User modifies title or content fields
5. User submits changes
6. System validates changes meet requirements
7. System updates post with new data
8. User receives confirmation of successful edit

### Moderator Managing Content
1. Moderator views community posts
2. User reports a post for policy violation
3. Moderator views report details
4. Moderator decides whether to approve or dismiss report
5. If approved, Moderator deletes the post
6. System removes post and associated comments
7. System updates karma scores accordingly

## Success Criteria

A successful post system implementation will:
- Allow 100% of registered members to create posts successfully
- Display posts with correct metadata and formatting
- Enable proper editing and deletion permissions
- Handle all post types (text, link, image) correctly
- Maintain accurate vote scores and karma calculations
- Provide fast, responsive post loading and display
- Prevent unauthorized post creation, modification, or deletion
- Support all required feeds and sorting options

## Acceptance Criteria

### Post Creation Acceptance Criteria
- [ ] Members can create text posts with content up to 100,000 characters
- [ ] Members can create link posts with valid URLs up to 2,000 characters
- [ ] Members can create image posts with files up to 10MB
- [ ] Posts appear only in communities where the member is subscribed
- [ ] Title validation works for length requirements (1-300 characters)
- [ ] System returns appropriate errors for validation failures

### Post Editing Acceptance Criteria
- [ ] Post authors can edit their own posts
- [ ] Moderators and owners can view all edits (for moderation)
- [ ] Edited posts maintain original metadata (author, timestamp, community)
- [ ] Vote scores remain unchanged during editing
- [ ] Original comments remain associated with edited posts

### Post Deletion Acceptance Criteria
- [ ] Post authors can delete their own posts
- [ ] Moderators can delete any post in their community
- [ ] Community owners can delete any post in their community
- [ ] Deleted posts are permanently removed from the system
- [ ] Associated comments are also deleted
- [ ] Karma scores are updated when votes are removed

### Post Display Acceptance Criteria
- [ ] Text posts show first 200 characters in list views
- [ ] Link posts show domain names in list views
- [ ] Image posts show thumbnails in list views
- [ ] Individual post views show complete content
- [ ] Vote scores display correctly (upvotes minus downvotes)
- [ ] Comment counts display accurately
- [ ] Time displays show relative time ("X ago" format)

### Community Integration Acceptance Criteria
- [ ] Posts appear in community-specific feeds
- [ ] Community post counts update correctly
- [ ] Unsubscribed members can view community posts
- [ ] Subscription requirement enforced for post creation
- [ ] Community association is permanent once set
