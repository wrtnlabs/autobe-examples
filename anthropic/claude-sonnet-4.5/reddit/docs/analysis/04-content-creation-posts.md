# Content Creation and Posts

## Document Overview

This document defines the complete business requirements for the content creation and post management system within the community platform. Posts are the primary content type that drives user engagement and community discussions. The platform supports three distinct post types: text posts, link posts, and image posts. Each post type serves different user needs while sharing common functionality for metadata, validation, editing, and deletion.

This document specifies WHAT the post system should do from a business perspective, describing user interactions, business rules, workflows, and validation requirements. All technical implementation decisions (architecture, APIs, database design) are at the discretion of the development team.

## Post System Overview

### Purpose and Scope

The post system enables community members to create, share, and manage content within communities. Posts serve as the foundation for community discussions, content sharing, and user engagement. Every post belongs to exactly one community and is created by an authenticated member.

### Post Types

The platform supports three distinct post types, each designed for different content sharing needs:

1. **Text Posts**: Long-form written content, discussions, questions, and stories
2. **Link Posts**: Sharing external URLs with titles and optional descriptions
3. **Image Posts**: Visual content uploaded directly to the platform with titles and captions

All post types share common attributes (title, author, community, timestamps, vote counts) while having type-specific content requirements.

### Post Lifecycle

Posts follow a defined lifecycle from creation through potential editing and eventual deletion:

1. **Creation**: Member creates post in a community they have access to
2. **Active**: Post is visible, can be viewed, voted on, and commented on
3. **Edited** (optional): Original author modifies post content within allowed timeframe
4. **Deleted**: Post is removed by author, moderator, or site admin (soft delete preserves history)

## Post Types Detailed Specification

### Text Posts

Text posts allow members to share long-form written content within communities.

#### Text Post Requirements

**WHEN a member creates a text post, THE system SHALL require a title and allow optional body text.**

**THE text post title SHALL be between 5 and 300 characters in length.**

**THE text post body SHALL support up to 40,000 characters.**

**THE system SHALL allow text post body to be empty, enabling title-only posts.**

**THE text post body SHALL preserve line breaks and paragraph formatting.**

**THE system SHALL display text post content using plain text with preserved whitespace.**

#### Text Post Content Rules

**THE system SHALL trim leading and trailing whitespace from text post titles.**

**THE system SHALL preserve internal whitespace and formatting in text post bodies.**

**WHEN a text post body contains URLs, THE system SHALL display them as plain text without automatic hyperlinking.**

**THE system SHALL reject text posts with titles containing only whitespace.**

### Link Posts

Link posts enable members to share external URLs with the community, such as articles, videos, or web resources.

#### Link Post Requirements

**WHEN a member creates a link post, THE system SHALL require both a title and a URL.**

**THE link post title SHALL be between 5 and 300 characters in length.**

**THE link post URL SHALL be a valid HTTP or HTTPS URL.**

**THE system SHALL validate URL format before accepting link post submission.**

**THE system SHALL allow an optional description field for link posts, supporting up to 2,000 characters.**

**THE link post URL SHALL be stored exactly as provided by the user.**

#### Link Post Validation Rules

**WHEN a user submits a link post URL, THE system SHALL verify it starts with http:// or https://.**

**IF a link post URL is invalid or malformed, THEN THE system SHALL reject the submission with a clear error message.**

**THE system SHALL allow the same URL to be posted multiple times across different communities.**

**THE system SHALL allow the same URL to be posted multiple times within the same community by different users.**

#### Link Post Display Requirements

**THE system SHALL display the link post URL as a clickable hyperlink.**

**THE system SHALL indicate that links direct to external websites.**

**WHEN users click link post URLs, THE system SHALL open them in a new browser tab or window.**

### Image Posts

Image posts allow members to share visual content by uploading images directly to the platform.

#### Image Post Requirements

**WHEN a member creates an image post, THE system SHALL require a title and an uploaded image file.**

**THE image post title SHALL be between 5 and 300 characters in length.**

**THE system SHALL allow an optional caption field for image posts, supporting up to 2,000 characters.**

**THE system SHALL accept image uploads in JPEG, PNG, GIF, and WebP formats.**

**THE system SHALL enforce a maximum file size of 20 MB per image upload.**

**THE system SHALL enforce minimum image dimensions of 100x100 pixels.**

**THE system SHALL enforce maximum image dimensions of 8000x8000 pixels.**

#### Image Upload Validation

**WHEN a user uploads an image file, THE system SHALL verify the file format matches accepted types.**

**IF an uploaded file exceeds the maximum file size, THEN THE system SHALL reject the upload with an error message indicating the size limit.**

**IF an uploaded image has dimensions outside the allowed range, THEN THE system SHALL reject the upload with an error message specifying dimension requirements.**

**THE system SHALL scan uploaded images for file corruption and reject corrupted files.**

**THE system SHALL generate a secure, unique identifier for each uploaded image.**

#### Image Storage and Display

**THE system SHALL store uploaded images securely with access controls.**

**THE system SHALL serve images with appropriate content-type headers.**

**THE system SHALL display image posts with the full image visible in the post detail view.**

**THE system SHALL display image posts with thumbnail previews in feed views.**

**THE system SHALL preserve original image quality for uploads within size and dimension limits.**

## Post Creation Workflow

### Pre-Creation Requirements

**WHEN a user attempts to create a post, THE system SHALL verify the user is authenticated as a member.**

**WHEN a user attempts to create a post in a community, THE system SHALL verify the community exists.**

**WHEN a user attempts to create a post in a private community, THE system SHALL verify the user is subscribed to that community.**

**IF a user is not authenticated, THEN THE system SHALL deny post creation and redirect to login.**

**IF a user attempts to post in a non-existent community, THEN THE system SHALL return an error message indicating the community cannot be found.**

### Post Creation Process

**WHEN a member initiates post creation, THE system SHALL prompt the user to select the post type (text, link, or image).**

**WHEN a member selects a post type, THE system SHALL present a creation form appropriate for that post type.**

**THE post creation form SHALL include a title field for all post types.**

**THE post creation form SHALL include type-specific content fields (body text for text posts, URL for link posts, image upload for image posts).**

**THE post creation form SHALL include a community selector showing communities the user can post to.**

**WHEN a member submits a post creation form, THE system SHALL validate all required fields are present.**

**WHEN a member submits a post creation form, THE system SHALL validate all fields meet their respective validation rules.**

**IF post validation fails, THEN THE system SHALL display specific error messages for each validation failure.**

**IF post validation fails, THEN THE system SHALL preserve user input so they can correct errors without re-entering all data.**

### Post Creation Success

**WHEN a valid post is submitted, THE system SHALL create the post immediately.**

**WHEN a post is created, THE system SHALL record the creation timestamp.**

**WHEN a post is created, THE system SHALL associate it with the authenticated member as the author.**

**WHEN a post is created, THE system SHALL associate it with the selected community.**

**WHEN a post is created, THE system SHALL initialize the vote score to 0.**

**WHEN a post is created, THE system SHALL initialize the comment count to 0.**

**WHEN a post is created, THE system SHALL redirect the user to the newly created post detail view.**

**WHEN a post is created, THE system SHALL display a success confirmation to the user.**

## Post Editing Capabilities

### Edit Permissions

**THE system SHALL allow members to edit their own posts.**

**THE system SHALL allow members to edit their posts within 24 hours of creation.**

**WHEN 24 hours have passed since post creation, THE system SHALL prevent the original author from editing the post.**

**THE system SHALL not allow moderators to edit posts created by other users.**

**THE system SHALL not allow site administrators to edit posts created by other users.**

### Editable Content by Post Type

**WHEN editing a text post, THE system SHALL allow modification of the post title and body text.**

**WHEN editing a link post, THE system SHALL allow modification of the post title and description.**

**WHEN editing a link post, THE system SHALL not allow modification of the URL.**

**WHEN editing an image post, THE system SHALL allow modification of the post title and caption.**

**WHEN editing an image post, THE system SHALL not allow replacing or removing the uploaded image.**

### Edit Workflow

**WHEN a member views their own post within the 24-hour edit window, THE system SHALL display an edit option.**

**WHEN a member selects the edit option, THE system SHALL present an edit form pre-filled with current post content.**

**WHEN a member submits post edits, THE system SHALL validate all fields using the same validation rules as post creation.**

**IF edit validation fails, THEN THE system SHALL display specific error messages and preserve the user's edits.**

**WHEN valid edits are submitted, THE system SHALL update the post content immediately.**

**WHEN a post is edited, THE system SHALL record the edit timestamp.**

**WHEN a post is edited, THE system SHALL display an "edited" indicator on the post showing when it was last modified.**

### Edit Restrictions

**THE system SHALL not allow editing of deleted posts.**

**THE system SHALL not reset vote counts or comment counts when a post is edited.**

**THE system SHALL not change post creation timestamp when a post is edited.**

**THE system SHALL not change post author when a post is edited.**

**THE system SHALL not allow moving a post to a different community through editing.**

## Post Deletion and Removal

### Deletion Permissions

**THE system SHALL allow members to delete their own posts at any time.**

**THE system SHALL allow community moderators to remove posts from communities they moderate.**

**THE system SHALL allow site administrators to remove any post from the platform.**

### User-Initiated Deletion

**WHEN a member views their own post, THE system SHALL display a delete option.**

**WHEN a member selects the delete option, THE system SHALL prompt for confirmation before proceeding.**

**WHEN a member confirms deletion, THE system SHALL mark the post as deleted by the author.**

**WHEN a member deletes their post, THE system SHALL record the deletion timestamp.**

### Moderator Removal

**WHEN a moderator views a post in a community they moderate, THE system SHALL display a remove option.**

**WHEN a moderator removes a post, THE system SHALL prompt for an optional removal reason.**

**WHEN a moderator removes a post, THE system SHALL mark the post as removed by moderator.**

**WHEN a moderator removes a post, THE system SHALL record which moderator performed the removal and when.**

**WHEN a moderator removes a post, THE system SHALL optionally record the removal reason if provided.**

### Site Admin Removal

**WHEN a site administrator views any post, THE system SHALL display a remove option.**

**WHEN a site admin removes a post, THE system SHALL prompt for an optional removal reason.**

**WHEN a site admin removes a post, THE system SHALL mark the post as removed by site admin.**

**WHEN a site admin removes a post, THE system SHALL record which admin performed the removal and when.**

### Soft Delete Behavior

**THE system SHALL implement soft deletion, preserving deleted post data in the system.**

**WHEN a post is deleted or removed, THE system SHALL hide the post from public feeds and community views.**

**WHEN a post is deleted by the author, THE system SHALL display a placeholder indicating the post was deleted by the author.**

**WHEN a post is removed by a moderator, THE system SHALL display a placeholder indicating the post was removed.**

**WHEN a post is removed by a site admin, THE system SHALL display a placeholder indicating the post was removed.**

**THE system SHALL preserve comments on deleted posts, allowing users to view the discussion context.**

**THE system SHALL prevent voting on deleted or removed posts.**

**THE system SHALL prevent commenting on deleted or removed posts.**

**WHEN a post is deleted or removed, THE system SHALL not reduce the author's karma from votes that post received.**

### Deletion Restrictions

**THE system SHALL not allow undeleting posts through the user interface.**

**THE system SHALL not permanently remove post data without explicit administrative action.**

## Post Metadata and Attributes

### Required Metadata

Every post, regardless of type, SHALL have the following metadata:

**THE system SHALL store a unique post identifier for each post.**

**THE system SHALL store the post title.**

**THE system SHALL store the post type (text, link, or image).**

**THE system SHALL store the author's user identifier.**

**THE system SHALL store the community identifier where the post was created.**

**THE system SHALL store the post creation timestamp with timezone information.**

**THE system SHALL store the current vote score (upvotes minus downvotes).**

**THE system SHALL store the total number of comments on the post.**

**THE system SHALL store post status (active, deleted by author, removed by moderator, removed by admin).**

### Optional Metadata

**THE system SHALL store the edit timestamp when a post has been edited.**

**THE system SHALL store the deletion timestamp when a post is deleted or removed.**

**THE system SHALL store the moderator or admin identifier when a post is removed by staff.**

**THE system SHALL store the removal reason when provided by moderators or admins.**

### Type-Specific Content Storage

**For text posts, THE system SHALL store the body text content.**

**For link posts, THE system SHALL store the URL and optional description.**

**For image posts, THE system SHALL store the image file identifier, file size, dimensions, and optional caption.**

## Post Validation Rules

### Title Validation

**THE system SHALL require titles for all post types.**

**THE system SHALL enforce title length between 5 and 300 characters.**

**THE system SHALL reject titles consisting only of whitespace.**

**THE system SHALL trim leading and trailing whitespace from titles before storage.**

**THE system SHALL reject titles containing null bytes or control characters.**

### Content Validation by Type

**For text posts, THE system SHALL allow body text up to 40,000 characters.**

**For text posts, THE system SHALL allow empty body text, creating title-only posts.**

**For link posts, THE system SHALL require a valid HTTP or HTTPS URL.**

**For link posts, THE system SHALL reject URLs longer than 2,000 characters.**

**For link posts, THE system SHALL allow optional descriptions up to 2,000 characters.**

**For image posts, THE system SHALL require an uploaded image file.**

**For image posts, THE system SHALL validate file format is JPEG, PNG, GIF, or WebP.**

**For image posts, THE system SHALL validate file size does not exceed 20 MB.**

**For image posts, THE system SHALL validate image dimensions are between 100x100 and 8000x8000 pixels.**

**For image posts, THE system SHALL allow optional captions up to 2,000 characters.**

### Community Validation

**THE system SHALL verify the target community exists before allowing post creation.**

**THE system SHALL verify the user has permission to post in the target community.**

**For private communities, THE system SHALL verify the user is subscribed before allowing post creation.**

### Author Validation

**THE system SHALL verify the user is authenticated before allowing post creation.**

**THE system SHALL verify the user account is active and not banned.**

**THE system SHALL verify the user is not banned from the target community.**

## Post Display and Rendering

### Feed View Display

**WHEN displaying posts in feeds, THE system SHALL show the post title.**

**WHEN displaying posts in feeds, THE system SHALL show the author username.**

**WHEN displaying posts in feeds, THE system SHALL show the community name.**

**WHEN displaying posts in feeds, THE system SHALL show the post creation time in relative format (e.g., "2 hours ago").**

**WHEN displaying posts in feeds, THE system SHALL show the current vote score.**

**WHEN displaying posts in feeds, THE system SHALL show the total comment count.**

**WHEN displaying posts in feeds, THE system SHALL show an edited indicator if the post was modified.**

**For text posts in feeds, THE system SHALL show a preview of the body text (first 300 characters).**

**For link posts in feeds, THE system SHALL show the URL domain and optional description preview.**

**For image posts in feeds, THE system SHALL show a thumbnail preview of the image.**

### Detail View Display

**WHEN displaying a post in detail view, THE system SHALL show all post metadata (title, author, community, timestamps, scores).**

**For text posts in detail view, THE system SHALL show the complete body text with preserved formatting.**

**For link posts in detail view, THE system SHALL show the clickable URL and complete description if provided.**

**For image posts in detail view, THE system SHALL show the full-resolution image and complete caption if provided.**

**WHEN displaying a post in detail view, THE system SHALL show voting controls (upvote and downvote buttons).**

**WHEN displaying a post in detail view, THE system SHALL show the comment section below the post content.**

**WHEN displaying an edited post, THE system SHALL show the edit timestamp near the post metadata.**

### Deleted Post Display

**WHEN a post is deleted by the author, THE system SHALL display "[deleted]" in place of the author username.**

**WHEN a post is deleted by the author, THE system SHALL display "[deleted by user]" in place of post content.**

**WHEN a post is removed by a moderator, THE system SHALL display "[removed by moderator]" in place of post content.**

**WHEN a post is removed by a site admin, THE system SHALL display "[removed]" in place of post content.**

**WHEN displaying a deleted or removed post, THE system SHALL preserve and display the comment section.**

**WHEN displaying a deleted or removed post, THE system SHALL disable voting controls.**

## Post Permissions and Access Control

### Creation Permissions

**THE system SHALL allow any authenticated member to create posts.**

**THE system SHALL restrict post creation to members who are not banned from the platform.**

**THE system SHALL restrict post creation in specific communities to members who are not banned from those communities.**

**For public communities, THE system SHALL allow any member to create posts without requiring subscription.**

**For private communities, THE system SHALL require subscription before allowing post creation.**

### Viewing Permissions

**THE system SHALL allow anyone (including non-authenticated users) to view posts in public communities.**

**For private communities, THE system SHALL restrict post viewing to subscribed members only.**

**THE system SHALL allow viewing deleted or removed posts' comment sections while hiding the original content.**

### Editing Permissions

**THE system SHALL allow post editing only by the original author.**

**THE system SHALL allow post editing only within 24 hours of creation.**

**THE system SHALL prevent editing after the 24-hour window expires.**

**THE system SHALL prevent editing by moderators and admins who are not the original author.**

### Deletion and Removal Permissions

**THE system SHALL allow post deletion by the original author at any time.**

**THE system SHALL allow post removal by moderators of the community where the post was created.**

**THE system SHALL allow post removal by site administrators for any post.**

**THE system SHALL not allow regular members to remove posts created by others.**

## Error Scenarios and Edge Cases

### Validation Failures

**WHEN a user submits a post with a title shorter than 5 characters, THE system SHALL reject the submission with the message "Title must be at least 5 characters long".**

**WHEN a user submits a post with a title longer than 300 characters, THE system SHALL reject the submission with the message "Title cannot exceed 300 characters".**

**WHEN a user submits a text post with body text longer than 40,000 characters, THE system SHALL reject the submission with the message "Post content cannot exceed 40,000 characters".**

**WHEN a user submits a link post with an invalid URL, THE system SHALL reject the submission with the message "Please provide a valid HTTP or HTTPS URL".**

**WHEN a user submits an image post with a file exceeding 20 MB, THE system SHALL reject the submission with the message "Image file size cannot exceed 20 MB".**

**WHEN a user submits an image post with unsupported format, THE system SHALL reject the submission with the message "Please upload a JPEG, PNG, GIF, or WebP image".**

**WHEN a user submits an image post with dimensions outside allowed range, THE system SHALL reject the submission with the message "Image dimensions must be between 100x100 and 8000x8000 pixels".**

### Permission Failures

**WHEN a non-authenticated user attempts to create a post, THE system SHALL redirect to the login page with a message "Please log in to create a post".**

**WHEN a user attempts to create a post in a non-existent community, THE system SHALL display an error message "Community not found".**

**WHEN a user attempts to create a post in a private community they're not subscribed to, THE system SHALL display an error message "You must subscribe to this community to post".**

**WHEN a banned user attempts to create a post, THE system SHALL display an error message "Your account has been restricted from posting".**

**WHEN a user attempts to edit another user's post, THE system SHALL display an error message "You can only edit your own posts".**

**WHEN a user attempts to edit a post after 24 hours, THE system SHALL display an error message "Posts can only be edited within 24 hours of creation".**

### System Failures

**IF image upload processing fails, THEN THE system SHALL display an error message "Image upload failed. Please try again".**

**IF post creation fails due to a system error, THEN THE system SHALL display an error message "Unable to create post. Please try again later" and preserve user input.**

**IF post editing fails due to a system error, THEN THE system SHALL display an error message "Unable to save changes. Please try again" and preserve the user's edits.**

### Edge Cases

**WHEN a user deletes a post that has active comments, THE system SHALL preserve all comments and display them with the deleted post placeholder.**

**WHEN a moderator is removed from a community, THE system SHALL preserve posts they previously removed.**

**WHEN a user account is deleted, THE system SHALL preserve their posts but display the author as "[deleted]".**

**WHEN a community is deleted, THE system SHALL preserve all posts created in that community with a marker indicating the community no longer exists.**

**WHEN multiple users simultaneously vote on a post, THE system SHALL process votes accurately without conflicts.**

**WHEN a user edits a post at exactly the 24-hour mark, THE system SHALL accept the edit if initiated before the deadline, even if processing completes after.**

## Performance Expectations

### Post Creation Performance

**WHEN a user submits a valid text or link post, THE system SHALL create the post and redirect to the post detail view within 2 seconds.**

**WHEN a user uploads an image post, THE system SHALL process the upload and create the post within 5 seconds for files up to 20 MB.**

### Post Loading Performance

**WHEN a user views a post detail page, THE system SHALL load and display the post content within 1 second.**

**WHEN a user scrolls through a feed of posts, THE system SHALL load post previews smoothly without noticeable delay.**

**For image posts, THE system SHALL load thumbnail previews in feeds within 500 milliseconds.**

### Edit and Delete Performance

**WHEN a user saves post edits, THE system SHALL update the post and refresh the display within 2 seconds.**

**WHEN a user deletes a post, THE system SHALL process the deletion and update the display within 1 second.**

## Success Criteria

The post creation and management system is successful when:

1. **Content Creation**: Members can easily create all three post types with clear guidance and validation
2. **Content Quality**: Validation rules ensure post content meets minimum quality standards
3. **User Control**: Authors can edit and delete their own posts within defined constraints
4. **Moderation**: Moderators and admins can effectively manage community content
5. **Performance**: Post creation, editing, and viewing operations feel instant to users
6. **Data Integrity**: Deleted posts preserve discussion context while removing problematic content
7. **Access Control**: Permission rules are consistently enforced across all post operations

## Future Considerations

While not part of the current requirements, future enhancements may include:

- Video post type with upload and streaming support
- Poll post type with voting options and result visualization
- Scheduled posting for future publication
- Draft posts that can be saved and published later
- Post templates for recurring content types
- Crossposting to multiple communities simultaneously
- Post flairs or tags for categorization within communities
- Rich text formatting (bold, italic, lists, quotes) for text posts
- Image galleries with multiple images in a single post
- Automatic link preview generation with thumbnails and metadata extraction