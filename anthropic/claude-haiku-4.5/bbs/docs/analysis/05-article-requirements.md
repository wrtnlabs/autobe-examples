# Article Requirements Specification

## 1. Overview

This document specifies all requirements for article functionality in the discussion board platform. Articles are the primary content units where members initiate discussions on economic and political topics. This specification covers creation, management, discovery, and display of articles, including support for image and file attachments.

## 2. Article Structure & Metadata

### 2.1 Required Article Fields

Every article MUST contain the following information:

| Field | Type | Requirements |
|-------|------|--------------:|
| Article ID | Unique Identifier | System-generated unique identifier |
| Title | Text | 3 to 200 characters, required for all articles |
| Content | Text | 10 to 50,000 characters, the main article body |
| Author | User Reference | References the member who created the article, required |
| Created Date | Timestamp | System-generated timestamp when article is published |
| Last Modified Date | Timestamp | System-generated, updated when article is edited |
| Status | Enumeration | One of: "published", "draft", "archived" |
| Category | Selection | Article belongs to one category: "economics" or "politics" |
| Attachments | Array | Zero or more attached files/images |
| View Count | Integer | Tracks number of times article has been viewed |
| Revision Number | Integer | Tracks edit count and version history |

### 2.2 Article Metadata Details

**Title Requirements**:
- THE article title SHALL be between 3 and 200 characters in length
- THE title SHALL be required for all articles
- THE title SHALL be displayable plaintext without formatting
- THE title SHALL be searchable for discovery purposes
- WHEN a title is edited, THE original title SHALL be preserved in revision history

**Content Requirements**:
- THE article content SHALL be between 10 and 50,000 characters in length
- THE content SHALL support plaintext and basic markdown formatting (bold, italic, lists, links)
- THE content is required for all articles
- THE content field SHALL allow for comprehensive discussion and detailed arguments
- WHEN content is edited, THE previous version SHALL be available for comparison

**Category Assignment**:
- WHEN creating an article, THE member SHALL select exactly one category from: "economics" or "politics"
- THE category SHALL be immutable after article creation (cannot be changed after publishing)
- THE category is required and cannot be empty
- THE category SHALL be used for content filtering and discovery

**Status Field**:
- THE article status SHALL be "published" by default when created by members
- THE article status MAY be "draft" for articles saved but not yet published (future enhancement)
- THE article status MAY be changed to "archived" by moderators to hide articles from public view
- THE article status value SHALL be one of: "published", "draft", "archived"
- WHEN status changes, THE timestamp of status change SHALL be recorded

### 2.3 View Tracking & Engagement Metrics

- THE system SHALL increment the view count each time a unique user views the full article
- THE author viewing their own article SHALL increment the view count
- THE view count SHALL be displayed to all users viewing the article
- THE system SHALL track view history for analytics (optional: heatmaps, engagement metrics)
- WHEN calculating view count, THE system SHALL deduplicate multiple views from same user within 24-hour window (anti-spam measure)

### 2.4 Article Revision History

- THE system SHALL maintain revision history of article edits for audit and recovery purposes
- EACH revision SHALL record: original content, modified content, editor (moderator if applicable), timestamp of edit
- WHEN an article is edited, THE system SHALL create a new revision record without deleting the previous version
- THE system SHALL display "Edited" indicator with timestamp on article view
- MODERATORS SHALL be able to view revision history and revert to previous versions if needed

---

## 3. Article Creation Flow

### 3.1 Who Can Create Articles

- WHEN a guest user attempts to create an article, THE system SHALL deny the request and direct them to login or register
- WHEN a member is authenticated, THE member SHALL have permission to create new articles
- WHEN a moderator is authenticated, THE moderator SHALL have permission to create articles with the same capabilities as members
- THE system SHALL enforce rate limiting: maximum 10 articles per hour per member

### 3.2 Article Creation Process

**Creation Requirements**:
- THE member SHALL provide a title (3-200 characters)
- THE member SHALL provide article content (10-50,000 characters)
- THE member SHALL select a category ("economics" or "politics")
- THE member MAY attach zero or more image files (PNG, JPG, GIF format, see attachment specification)
- THE member MAY attach zero or more document files (PDF, DOCX, TXT format, see attachment specification)
- THE system SHALL require all mandatory fields before allowing publication

**Article Submission**:
- WHEN the member completes the article form and submits, THE system SHALL validate all required fields
- WHEN validation passes, THE system SHALL immediately publish the article with status "published"
- WHEN the article is published, THE system SHALL set the created date to current timestamp
- WHEN the article is published, THE system SHALL assign the authenticated member as the author
- WHEN the article is published, THE system SHALL initialize view count to 0
- WHEN the article is published, THE system SHALL initialize revision number to 0
- WHEN the article is successfully published, THE system SHALL display a success message and redirect to the published article

**Draft Saving (Future Enhancement)**:
- IF member chooses to save as draft instead of publish, THE system SHALL store article with status "draft"
- WHEN an article is in draft status, THE system SHALL not display it to other users
- THE member SHALL be able to continue editing a draft article at any time
- THE member SHALL be able to publish a draft article at any time

### 3.3 Article Creation Timing & Performance

- THE article creation process SHALL respond to the user within 2 seconds
- WHEN an article contains attachments, THE upload and processing SHALL complete before article is created
- WHEN there is a file upload failure, THE article creation SHALL be aborted and the user notified
- IF article creation fails midway, THE system SHALL clean up any uploaded attachments from temporary storage
- THE system SHALL prevent duplicate article creation through accidental double-submission by validating request tokens

---

## 4. Article Editing & Deletion

### 4.1 Edit Permissions

- WHEN a member views their own article, THE member SHALL see an edit option
- WHEN a member views another member's article, THE member SHALL NOT see the edit option for that article
- WHEN a moderator views any article, THE moderator SHALL see an edit option for that article
- WHEN a guest user views any article, THE guest SHALL NOT see edit options

### 4.2 Edit Capabilities

**Editable Fields**:
- THE member SHALL be able to edit the article title
- THE member SHALL be able to edit the article content
- THE member SHALL NOT be able to change the article category after creation
- THE member SHALL be able to add new attachments to an existing article
- THE member SHALL be able to remove existing attachments from an article
- THE member SHALL NOT be able to change the author or creation date
- THE member SHALL be able to edit an article for up to 30 days after creation (or indefinitely with edit history tracking)

**Edit Process**:
- WHEN a member opens the edit interface for their article, THE system SHALL display all current article information
- WHEN the member modifies content and saves, THE system SHALL validate the changes
- WHEN validation passes, THE system SHALL update the article and set last modified date to current timestamp
- WHEN the article is updated, THE system SHALL increment the revision number
- WHEN the article is updated, THE system SHALL create a revision record preserving the previous version
- WHEN the article is updated, THE system SHALL display a success message
- WHEN a member edits an article, THE original creation date SHALL remain unchanged
- WHEN multiple users edit simultaneously, THE system SHALL use "last write wins" strategy with conflict notification

### 4.3 Delete Permissions

- WHEN a member views their own article, THE member SHALL see a delete option
- WHEN a member views another member's article, THE member SHALL NOT be able to delete that article
- WHEN a moderator views any article, THE moderator SHALL see a delete option
- WHEN a guest user views any article, THE guest SHALL NOT see delete options

### 4.4 Delete Process

- WHEN a member selects delete on their own article, THE system SHALL display a confirmation dialog with specific warning: "Delete this article? All [X] comments will also be deleted. This cannot be undone. Type 'DELETE' to confirm."
- WHEN the member confirms deletion with explicit confirmation, THE article and all associated comments SHALL be permanently removed
- WHEN the article is deleted, all attached files SHALL be removed from storage
- WHEN deletion is complete, THE system SHALL redirect the user to the article list with message "Article deleted successfully"
- WHEN a moderator deletes an article, the same deletion process SHALL apply, but THE system SHALL log the moderator action
- WHEN an article is deleted, THE system SHALL remove associated notification subscriptions

### 4.5 Soft Delete vs Hard Delete Strategy

- THE system MAY implement soft delete (marking as deleted) instead of hard delete for audit trail purposes
- IF soft delete is implemented, deleted articles SHALL not be visible to users but SHALL be recoverable by moderators for 30 days
- IF soft delete is implemented, THE system SHALL permanently remove soft-deleted articles after 90 days if not recovered

---

## 5. Article Discovery & Display

### 5.1 Article Listing

**Article List View**:
- THE system SHALL display articles in reverse chronological order (newest first) by default
- THE article list SHALL show the most recent 20 articles per page
- THE system SHALL support pagination to view older articles
- FOR each article in the list, THE system SHALL display:
  - Article title (clickable to view full article)
  - Author name
  - Publication date
  - Category badge (economics or politics)
  - Preview of first 150-200 characters of content
  - Number of comments
  - Number of views
  - "Time ago" indicator (e.g., "Posted 2 hours ago")
- THE system SHALL format dates consistently (ISO 8601 format in storage, localized display to users)

**Visibility Rules**:
- WHEN a guest views the article list, THE guest SHALL see all published articles
- WHEN a member views the article list, THE member SHALL see all published articles
- WHEN a moderator views the article list, THE moderator SHALL see all articles including archived ones
- ARCHIVED articles (status = "archived") SHALL NOT be visible to guests or members
- ARCHIVED articles SHALL only be visible to moderators with edit/deletion interface

### 5.2 Category Filtering

- THE system SHALL display a category filter showing "economics" and "politics" options
- THE system SHALL provide an "All Categories" option to reset filtering
- WHEN a user selects a category, THE article list SHALL update to show only articles in that category
- WHEN a user selects "all categories", THE article list SHALL show articles from all categories
- THE selected filter SHALL remain active as the user navigates through pages
- WHEN a user filters by category, THE system SHALL display count: "Showing [X] articles in [Category]"

### 5.3 Search Functionality

**Basic Search**:
- THE system SHALL provide a search box to search for articles by title or content
- WHEN a user enters search terms, THE system SHALL search across all published article titles and content
- WHEN a user performs a search, THE results SHALL update instantly or within 2 seconds showing matching articles
- WHEN search results are empty, THE system SHALL display a "no articles found" message with suggestions
- SEARCH results SHALL respect the same visibility rules (guests and members see only published articles, moderators see all)
- THE system SHALL highlight search terms in results for quick visual scanning

**Search Algorithm**:
- THE system SHALL use keyword matching with stemming (e.g., "discuss", "discussing", "discussion" all match)
- THE system SHALL rank results by relevance: matches in title weighted higher than matches in content
- THE system SHALL support multiple keyword searches with AND logic (all keywords must match)
- THE system SHALL support phrase searches using quotation marks ("exact phrase")
- THE system SHALL display result count and search execution time (if processing takes >1 second)
- THE system SHALL cache frequently-searched terms for performance

### 5.4 Article Detail View

**Article Display**:
- WHEN a user clicks on an article from the list, THE system SHALL display the full article detail page
- THE detail page SHALL display:
  - Complete article title
  - Author name with profile link
  - Publication date and last modified date (if different from creation date)
  - Category badge
  - Full article content with formatting preserved
  - View count
  - All attached images displayed inline
  - All attached files listed with download links
  - All comments and replies on the article
  - Comment submission form (for authenticated members only)
  - Related articles section showing other articles in same category (optional enhancement)

**View Count Increment**:
- WHEN a user loads an article detail page, THE system SHALL increment the view count by 1
- THE updated view count SHALL be immediately visible to the user
- THE system SHALL use client-side timestamp to prevent counting the same user multiple times within 24 hours
- THE view increment SHALL be idempotent (refreshing page multiple times should not overflow view count)

**Author Information**:
- THE author name on any article SHALL be clickable
- WHEN a user clicks the author name, THE system SHALL navigate to the author's profile page
- THE author profile SHALL show articles created by that member with statistics
- THE system SHALL display author's join date, total articles created, total comments

### 5.5 Mobile & Responsive Display

- THE article listing page SHALL be responsive and display correctly on mobile devices (< 768px width)
- ON mobile, THE article preview SHALL be optimized to show: title, author, date, category
- ON mobile, THE full article display SHALL have readable font size (minimum 16px for body text)
- ON mobile, THE attachments shall be responsive with appropriate scaling for smaller screens

---

## 6. Attachment Handling

### 6.1 Image Attachments

**Supported Image Formats**:
- THE system SHALL accept image attachments in the following formats: PNG, JPG/JPEG, GIF, WebP
- THE system SHALL reject images in any other format with specific error message

**Image Size Limits**:
- THE maximum file size for a single image attachment is 10 MB
- THE recommended optimal size for images is 2-5 MB for performance
- IF a user attempts to upload an image larger than 10 MB, THE system SHALL display error: "[filename] exceeds maximum file size of 10 MB. Please use a smaller image."

**Image Display**:
- WHEN images are attached to an article, THE images SHALL be displayed inline within the article content
- THE images SHALL be displayed at 100% width of the article container, with responsive resizing for smaller screens
- THE image filenames SHALL be preserved and displayed below each image (or as caption if user provided one)
- WHEN a user clicks an image, THE system SHALL display the image in a larger view/lightbox
- IMAGES in comments SHALL display at reduced size (400px max) with expand-on-click functionality
- THE system SHALL display image alt text for accessibility

**Image Storage**:
- THE system SHALL store image files securely on the server
- THE system SHALL generate unique filenames to prevent conflicts
- THE original filename SHALL be stored as metadata for display purposes
- THE system SHALL generate optimized versions (thumbnail ~200px, medium ~600px) for efficient loading
- ANIMATED GIFs SHALL preserve animation in all versions

### 6.2 File Attachments

**Supported File Types**:
- THE system SHALL accept document attachments in the following formats: PDF, DOCX, XLSX, PPTX, TXT, ODP, ODT, ODS, CSV
- THE system SHALL accept archive formats: ZIP, RAR, 7Z
- THE system SHALL reject files in any other format with specific error message

**File Size Limits**:
- THE maximum file size for a single document attachment is 50 MB
- IF a user attempts to upload a file larger than 50 MB, THE system SHALL display error: "[filename] exceeds maximum file size of 50 MB. Please use a smaller file."

**File Display & Download**:
- WHEN files are attached to an article, THE files SHALL be listed in an "Attachments" section
- EACH file SHALL display:
  - Original filename
  - File size in human-readable format (e.g., "2.5 MB")
  - File type icon
  - Download link
- WHEN a user clicks the download link, THE system SHALL serve the file for download with the original filename
- THE system SHALL track file downloads in audit logs for analytics

**File Storage**:
- THE system SHALL store document files securely on the server
- THE system SHALL generate unique internal filenames to prevent conflicts
- THE original filename SHALL be preserved for download
- THE system SHALL implement access controls ensuring only authorized users can download files

### 6.3 Attachment Limits Per Content

**Per Article**:
- EACH article MAY have a maximum of 10 total attachments (images + files combined)
- IF a user attempts to attach more than 10 files, THE system SHALL display error: "Maximum 10 attachments per article reached. Current: [X] of 10."
- THE system SHALL display a count of current attachments (e.g., "3 of 10 attachments")

**Per Comment**:
- EACH comment MAY have a maximum of 3 total attachments
- IF a user attempts to attach more than 3 files, THE system SHALL display error: "Maximum 3 attachments per comment allowed."

**Total Size Limits**:
- TOTAL attachments per article SHALL NOT exceed 100 MB combined
- TOTAL attachments per comment SHALL NOT exceed 50 MB combined
- THE system SHALL validate and enforce these cumulative limits

### 6.4 Attachment Management

**Adding Attachments**:
- WHEN creating a new article, THE member SHALL be able to attach files by:
  - Clicking an "Add Attachment" button
  - Selecting files from their computer
  - Dragging and dropping files into the attachment area
- THE system SHALL display upload progress for each file being uploaded with percentage complete
- WHEN upload completes, THE file SHALL appear in the attachments list with preview thumbnail (for images)
- THE member SHALL be able to add multiple attachments before publishing the article
- THE system SHALL support batch upload of multiple files simultaneously

**Removing Attachments**:
- WHEN editing an article, THE member SHALL see each attachment with a delete button
- WHEN the member clicks delete next to an attachment, THE attachment SHALL be removed
- THE file SHALL be immediately deleted from the server storage
- THE system SHALL remove the attachment from the article but preserve other attachments

**Adding Attachments to Existing Articles**:
- WHEN a member edits an existing article, THE member SHALL be able to add new attachments
- WHEN a member adds attachments to an existing article, THE new attachments SHALL be added without affecting existing attachments
- THE total attachment limit of 10 SHALL still apply

**Attachment Descriptions**:
- THE system MAY allow users to add descriptions/captions to attachments (optional enhancement)
- CAPTIONS SHALL display below images or beside file listings

---

## 7. Article Permissions & Access Control

### 7.1 Complete Permission Matrix

| Action | Guest | Member | Moderator |
|--------|-------|--------|-----------:|
| View Published Articles | ✅ | ✅ | ✅ |
| View Archived Articles | ❌ | ❌ | ✅ |
| Create Articles | ❌ | ✅ | ✅ |
| Edit Own Articles | ❌ | ✅ | ✅ |
| Edit Others' Articles | ❌ | ❌ | ✅ |
| Delete Own Articles | ❌ | ✅ | ✅ |
| Delete Others' Articles | ❌ | ❌ | ✅ |
| Archive Articles | ❌ | ❌ | ✅ |
| View Draft Articles | Author | Author + Mods | ✅ |
| View Revision History | ❌ | Author Only | ✅ |
| Restore Previous Version | ❌ | ❌ | ✅ |
| Add Attachments | ❌ | Own Content | ✅ |
| Delete Attachments | ❌ | Own Content | ✅ |
| Export Article | ✅ | ✅ | ✅ |
| Share Article | ✅ | ✅ | ✅ |

### 7.2 Detailed Permission Rules

**Member Self-Service**:
- WHEN a member attempts to edit an article they did not create, THE system SHALL deny the request and display "Permission denied: You can only edit articles you have created."
- WHEN a member attempts to delete an article they did not create, THE system SHALL deny the request and display "Permission denied: You can only delete articles you have created."
- WHEN a member accesses their own article through edit, THE system SHALL allow full editing capabilities
- THE system SHALL track edit history and preserve authorship even after modifications

**Moderator Authority**:
- WHEN a moderator accesses any article for editing, THE system SHALL allow modification of all fields except creation date and original author (audit trail preservation)
- WHEN a moderator deletes an article, THE deletion SHALL proceed with confirmation (moderator action with consequences)
- WHEN a moderator archives an article, THE article status SHALL change to "archived" and become hidden from non-moderators
- WHEN a moderator edits an article, THE system SHALL log the edit with moderator ID for audit trail
- THE system SHALL allow moderators to restore archived articles

**Guest Limitations**:
- WHEN a guest attempts to create an article, THE system SHALL redirect to login page with message "Please login to create articles"
- WHEN a guest attempts to delete or edit any article, THE system SHALL deny the request and show "Please login to perform this action"
- WHEN a guest attempts to view draft articles, THE system SHALL deny access

### 7.3 Rate Limiting for Article Creation

- THE system SHALL limit each member to maximum 10 articles per hour
- WHEN a member attempts to create an 11th article within an hour, THE system SHALL reject with: "Article creation limit reached. You can create [X] more articles in [Y] minutes."
- WHEN a member approaches the limit (e.g., at 9/10), THE system SHALL display warning message
- THE system SHALL track article creation attempts per user with sliding window algorithm
- MODERATORS SHALL NOT be subject to rate limiting

---

## 8. Article Validation & Business Rules

### 8.1 Content Validation

**Title Validation**:
- THE title SHALL NOT be empty
- THE title SHALL be between 3 and 200 characters
- THE title SHALL not contain only whitespace
- THE title SHALL not contain only special characters
- IF title validation fails, THE system SHALL display specific error: "Title must be between 3 and 200 characters and contain meaningful text"
- THE system SHALL trim leading/trailing whitespace from titles

**Content Validation**:
- THE content SHALL NOT be empty
- THE content SHALL be between 10 and 50,000 characters
- THE content SHALL not contain only whitespace
- THE content SHALL not contain only special characters
- IF content validation fails, THE system SHALL display "Content must be between 10 and 50,000 characters of meaningful text"
- THE system SHALL accept and preserve markdown formatting

**Category Validation**:
- THE category MUST be selected before publishing
- THE category MUST be one of: "economics" or "politics"
- IF category is not selected, THE system SHALL display "Please select a category (Economics or Politics)"
- THE category selection SHALL be required and cannot be skipped

### 8.2 Attachment Validation

**Format Validation**:
- WHEN a file is uploaded, THE system SHALL validate the file type
- IF the file type is not allowed, THE system SHALL display "File type not supported. Allowed types: [list of types]"
- THE system SHALL validate file content matches declared type (magic bytes validation, not just extension)

**Size Validation**:
- WHEN a file is uploaded, THE system SHALL validate the file size
- IF the file exceeds the size limit, THE system SHALL display "[Filename] exceeds maximum file size of [limit]. Please use a smaller file."
- THE system SHALL show file size in human-readable format (MB, GB)

**Attachment Count Validation**:
- IF a user attempts to attach more than 10 files, THE system SHALL display "Maximum 10 attachments allowed. Current: [number]"
- THE system SHALL prevent exceeding limits at upload time, not after submission

**Cumulative Size Validation**:
- IF total attachments exceed cumulative size limit, THE system SHALL display "Total attachments exceed [limit] MB. Current: [used] MB"

### 8.3 Business Rules

**Immutable Fields After Creation**:
- ONCE an article is created, THE author SHALL NOT be changeable
- ONCE an article is created, THE creation date SHALL NOT be changeable
- ONCE an article is created, THE category SHALL NOT be changeable
- THESE constraints ensure data integrity and audit trail accuracy

**One Author Per Article**:
- EACH article SHALL have exactly one author
- THE author SHALL be the member who created the article
- WHEN a member creates an article, THE author field SHALL be automatically populated with the creating member's ID
- THE author cannot be reassigned or changed by any user including moderators

**Timestamp Management**:
- THE creation date SHALL be set once when the article is first published
- THE last modified date SHALL be updated each time the article is edited
- IF an article has never been edited, THE last modified date MAY be blank or equal to creation date
- ALL timestamps SHALL be stored in UTC and displayed in user's local timezone

**Ordering and Display**:
- THE articles in lists SHALL be ordered by creation date, newest first
- WHEN articles share the same creation date, THE system SHALL order by ID or maintain insertion order
- THE view count SHALL not affect article ordering (view count is metric, not sort criteria)
- THE system SHALL provide sorting options: newest, oldest, most commented, most viewed

### 8.4 Content Quality Rules

**Duplicate Detection**:
- WHEN a member creates a new article, THE system SHALL check for near-duplicates created in the last 24 hours
- IF a near-duplicate is detected, THE system SHALL warn the user: "An article with similar content was posted recently. Consider reviewing [link] or adding new insights."
- THE user may proceed despite the warning
- MODERATORS can merge discussions if duplicates are confirmed

**Spam Prevention**:
- THE system SHALL limit articles with excessive external links (maximum 5 links per article)
- IF an article contains more than 5 external links, THE system SHALL warn: "This article contains many external links. Please ensure they are relevant to your discussion."
- THE system SHALL detect and flag obvious spam patterns (repetitive keywords, commercial content in non-commercial forum)

---

## 9. Error Scenarios & Recovery

### 9.1 Validation Error Scenarios

**Missing Required Fields**:
- WHEN a user attempts to create an article without a title, THE system SHALL display "Title is required"
- WHEN a user attempts to create an article without content, THE system SHALL display "Content is required"
- WHEN a user attempts to create an article without selecting a category, THE system SHALL display "Category is required"
- THE system SHALL NOT publish the article until all required fields are provided
- THE system SHALL highlight which fields are missing

**Text Length Errors**:
- WHEN a user enters a title that is too short (less than 3 characters), THE system SHALL display "Title must be at least 3 characters"
- WHEN a user enters a title that is too long (more than 200 characters), THE system SHALL display "Title must not exceed 200 characters. Current: [X]"
- WHEN a user enters content that is too short (less than 10 characters), THE system SHALL display "Content must be at least 10 characters"
- WHEN a user enters content that is too long (more than 50,000 characters), THE system SHALL display "Content must not exceed 50,000 characters. Current: [X]"
- THE system SHALL provide character counters to help users understand length constraints

### 9.2 Attachment Error Scenarios

**Unsupported File Type**:
- WHEN a user attempts to upload a file with an unsupported extension, THE system SHALL display "File type not supported. Allowed types: PNG, JPG, GIF (images); PDF, DOCX, TXT (documents)"
- THE file SHALL NOT be added to the attachment list
- THE system SHALL provide list of supported formats

**File Size Exceeded**:
- WHEN an image file exceeds 10 MB, THE system SHALL display "[Filename] is too large (10 MB maximum for images). Your file: [X] MB"
- WHEN a document file exceeds 50 MB, THE system SHALL display "[Filename] is too large (50 MB maximum for documents). Your file: [X] MB"
- THE file SHALL NOT be added to the attachment list
- THE system SHALL suggest compression tools

**Attachment Limit Exceeded**:
- WHEN a user attempts to attach more than 10 files to a single article, THE system SHALL display "Maximum of 10 attachments per article reached. Current: [number]"
- THE additional file SHALL NOT be added to the attachment list
- THE system SHALL show count of remaining attachment slots

**Upload Failure**:
- IF a file upload fails due to network error or server issue, THE system SHALL display "Upload failed. Please try again."
- THE user SHALL be able to retry the upload
- WHEN retry succeeds, THE file SHALL be added to the attachment list
- THE system SHALL preserve failed uploads for up to 24 hours for automatic retry

**Upload Cancellation**:
- WHEN a user cancels an upload, THE system SHALL stop the upload process
- THE system SHALL remove any partially uploaded chunks
- THE user SHALL be able to restart the upload from the beginning

### 9.3 Permission Error Scenarios

**Unauthorized Edit Attempt**:
- WHEN a member attempts to edit another member's article, THE system SHALL display "You do not have permission to edit this article"
- THE edit interface SHALL NOT be displayed
- THE system SHALL log the unauthorized access attempt

**Unauthorized Delete Attempt**:
- WHEN a member attempts to delete another member's article, THE system SHALL display "You do not have permission to delete this article"
- THE delete action SHALL NOT proceed
- THE system SHALL log the unauthorized access attempt

**Guest Action Attempt**:
- WHEN a guest attempts to create an article, THE system SHALL display "Please login to create articles" and redirect to login
- WHEN a guest attempts to edit any article, THE system SHALL display "Please login to edit articles"
- WHEN a guest attempts to delete any article, THE system SHALL display "Please login to delete articles"

### 9.4 System Error Scenarios

**Database Error During Creation**:
- IF a database error occurs while saving an article, THE system SHALL display "An error occurred while saving your article. Please try again."
- THE article creation SHALL be rolled back and no article SHALL be created
- THE user's input SHALL be preserved so they can retry

**Database Error During Edit**:
- IF a database error occurs while updating an article, THE system SHALL display "An error occurred while saving your changes. Please try again."
- THE article changes SHALL NOT be saved
- THE user's changes SHALL be preserved so they can retry

**File Storage Error**:
- IF a file cannot be stored due to storage space or permission issues, THE system SHALL display "An error occurred while uploading the file. Please try again later."
- THE article creation MAY be allowed to continue without the attachment, OR the entire operation SHALL be rolled back based on implementation choice

**Concurrent Edit Conflict**:
- IF two users attempt to edit the same article simultaneously, THE system SHALL implement "last write wins" strategy
- THE second user SHALL be notified: "This article was modified by another user while you were editing. Your changes have not been saved. Please refresh and try again."
- THE user's changes SHALL be preserved for manual merge if needed

### 9.5 Recovery Mechanisms

**User Guidance**:
- ALL error messages SHALL be displayed in clear language that explains what went wrong
- ALL error messages SHALL include suggestions for how to fix the problem when applicable
- WHEN a required field is missing, THE system SHALL highlight the field that needs attention with visual indicator

**Session Preservation**:
- WHEN an error occurs during article creation, THE system SHALL preserve the user's typed content in browser cache
- WHEN the user corrects the error and resubmits, THE system SHALL use the preserved content
- THE user SHALL NOT need to retype their entire article due to a validation error
- THE system MAY auto-save draft versions periodically to prevent data loss

**Automatic Draft Recovery**:
- IF a user's session is interrupted during article editing, THE system SHALL preserve the draft
- WHEN the user returns to the site, THE system SHALL notify: "You have an unsaved draft from [time]. Would you like to continue editing?"
- THE user can choose to recover the draft or discard it

---

## 10. Performance & Practical Limits

### 10.1 Response Time Requirements

**Article Operations**:
- ARTICLE creation (without attachments) SHALL respond within 2 seconds
- ARTICLE updates SHALL respond within 2 seconds
- ARTICLE deletion SHALL respond within 2 seconds
- ARTICLE list retrieval (20 articles) SHALL respond within 1 second
- ARTICLE search SHALL return results within 2-3 seconds
- ARTICLE detail page load SHALL respond within 2 seconds

**Attachment Operations**:
- FILE uploads up to 25 MB SHALL complete within 30 seconds (varies by network speed)
- FILE downloads SHALL begin within 2 seconds
- IMAGE display SHALL render inline immediately once the page loads
- THUMBNAIL generation SHALL complete within 5 seconds of upload

**Concurrent Operations**:
- SYSTEM SHALL handle 100 concurrent article views without degradation
- SYSTEM SHALL handle 10 concurrent article creations without data loss
- SYSTEM SHALL handle 50 concurrent file uploads without performance degradation

### 10.2 Practical Limits

| Constraint | Limit | Rationale |
|-----------|-------|---------:|
| Max article title length | 200 characters | Prevents excessively long titles |
| Min article title length | 3 characters | Ensures meaningful titles |
| Max article content length | 50,000 characters | Approximately 8,000-10,000 words; prevents memory issues |
| Min article content length | 10 characters | Ensures substantive content |
| Max image file size | 10 MB | Balances quality with page load performance |
| Max document file size | 50 MB | Allows substantial documents while managing storage |
| Max attachments per article | 10 | Prevents excessive attachment bloat |
| Max article list page size | 20 articles | Provides good browsing without excessive load times |
| Max search results | 100 results | Limits query performance impact |
| Rate limit (articles per hour) | 10 | Prevents spam and abuse |
| View count deduplication window | 24 hours | Prevents inflated view counts |
| Revision history retention | Indefinite | Preserves audit trail |

### 10.3 Scalability Expectations

- THE system SHALL handle up to 100,000 published articles without performance degradation in search
- THE system SHALL handle up to 500,000 article views per day
- THE system SHALL handle up to 10,000 simultaneous article views
- THE system SHALL maintain sub-2-second response times with appropriate indexing and caching
- THE system SHALL auto-scale storage as article database grows
- THE system SHALL implement database indexes on: author, creation_date, category, status for query optimization

### 10.4 Caching Strategy

- THE recent articles list (first 100) SHALL be cached and refreshed every 5 minutes
- INDIVIDUAL article content SHALL be cached until modified (cache invalidation on edit)
- USER profiles (for author display) SHALL be cached for 1 hour
- SEARCH results SHALL be cached for 10 minutes per search query
- CATEGORY article lists SHALL be cached and refreshed every 10 minutes

---

## 11. Accessibility & Responsive Design

### 11.1 Accessibility Requirements

- ALL articles SHALL include descriptive alt text for images for screen reader compatibility
- THE article interface SHALL meet WCAG 2.1 AA accessibility standards
- ALL form labels SHALL be clearly associated with input fields
- THE system SHALL provide keyboard navigation throughout article interface
- ARTICLE content SHALL be marked up with appropriate semantic HTML (headings, paragraphs, lists)

### 11.2 Mobile Responsiveness

- THE article listing page SHALL be responsive for screens from 320px to 4K width
- THE article detail page SHALL have readable font sizes on mobile (minimum 16px)
- THE attachments section SHALL display appropriately on mobile with touch-friendly download buttons
- THE comment section SHALL be scrollable and usable on mobile devices
- RESPONSIVE images SHALL load appropriate sizes for device (mobile gets smaller versions)

---

## Summary

This comprehensive specification defines all requirements for article functionality in the discussion board platform, including creation, editing, deletion, discovery, attachment handling, permissions, validation, error handling, and performance expectations. All requirements are expressed in EARS format with specific testability and clear business logic.

---

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, authentication mechanisms, file storage systems, caching strategies, etc.) are at the discretion of the development team. Developers have full autonomy over technology choices, system architecture, and implementation details. This documentation describes WHAT the system should do, not HOW to build it.*