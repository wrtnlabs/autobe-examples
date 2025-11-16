# Article Management Requirements

## Overview

Articles are the primary content unit in the discussion board system. An article represents a discussion thread about economic or political topics that members can create, comment on, and engage with. Articles are the core mechanism through which discussions occur on the platform.

This document specifies all requirements for article creation, management, and lifecycle, including how articles are authored, published, displayed, edited, and deleted within the discussion board.

## Article Overview

### Purpose and Role

Articles serve as the foundational discussion unit in the discussion board. Each article initiates a topic or question for community discussion on economic and political matters. Articles support collaborative discussion through comments and provide rich content through text, images, and file attachments.

Articles follow a simple publication model:
- **Members** can create and submit articles
- **Moderators** review and approve articles before publication
- **Guests** can view published articles
- **Members** can comment on published articles

### Article Lifecycle States

THE discussion board SHALL maintain articles in one of the following states:

1. **Draft** - Article created by member but not yet submitted for review
2. **Pending Review** - Article submitted for moderation approval, awaiting moderator decision
3. **Published** - Article approved by moderator and visible to all users
4. **Rejected** - Article rejected by moderator and visible only to original author
5. **Archived** - Article archived by moderator (no longer visible to general users, but retained in system)

---

## Article Creation Requirements

### Member-Only Creation

WHEN a guest user attempts to create an article, THE system SHALL deny access and display an appropriate message indicating that account creation or login is required.

WHEN a member user accesses the article creation interface, THE system SHALL provide a form to submit a new article.

### Article Submission Process

THE member SHALL provide the following information when creating an article:

1. **Article Title** - Required field (see validation rules section)
2. **Article Content/Body** - Required field (see validation rules section)
3. **Category** - Required field selecting from predefined categories
4. **Image Attachments** - Optional (up to 5 images per article)
5. **File Attachments** - Optional (up to 3 files per article)

WHEN a member completes the article creation form with all required fields, THE system SHALL create the article in **Draft** status.

WHEN a member clicks the submit/publish button, THE system SHALL transition the article to **Pending Review** status and immediately notify moderators that a new article awaits approval.

---

## Article Attributes & Fields

### Core Article Fields

Each article SHALL contain the following attributes:

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| Article ID | UUID | Yes | Unique identifier for the article, system-generated |
| Title | String (3-200 characters) | Yes | The article headline or discussion topic title |
| Content | String (10-50,000 characters) | Yes | The main article text body |
| Author ID | UUID | Yes | Reference to the member who created the article |
| Author Name | String | Yes | Display name of the article creator |
| Category | String (enum) | Yes | Topic category: "Economics", "Politics", "Economic Policy", "Political Analysis", "Other" |
| Status | String (enum) | Yes | Current publication state: "Draft", "Pending Review", "Published", "Rejected", "Archived" |
| Created At | ISO 8601 DateTime | Yes | Timestamp when article was initially created, system-generated |
| Updated At | ISO 8601 DateTime | Yes | Timestamp of last modification, system-generated |
| Published At | ISO 8601 DateTime | No | Timestamp when article was approved and published (null if not published) |
| Rejection Reason | String (0-500 characters) | No | Text explanation if article was rejected by moderator (null if not rejected) |
| View Count | Integer | Yes | Number of times the article has been viewed (initialized to 0) |
| Comment Count | Integer | Yes | Number of approved comments on the article (calculated, updated automatically) |

### Image Attachments in Articles

THE article SHALL support attachment of images. Images are linked to the entire article, not to specific text within the article.

THE system SHALL store the following information for each image attachment:

- **Image ID** - Unique identifier for the image
- **File Name** - Original filename provided by uploader
- **File Size** - Size in bytes
- **Image URL** - Path to access the uploaded image
- **Upload Time** - ISO 8601 timestamp of upload
- **Display Order** - Integer indicating position in article's image gallery (1, 2, 3, etc.)

### File Attachments in Articles

THE article SHALL support attachment of file documents. Files are linked to the entire article and available for download.

THE system SHALL store the following information for each file attachment:

- **File ID** - Unique identifier for the file
- **File Name** - Original filename provided by uploader
- **File Size** - Size in bytes
- **File Type** - MIME type (e.g., application/pdf, application/msword)
- **Download URL** - Path to download the file
- **Upload Time** - ISO 8601 timestamp of upload

---

## Article Status & Publication Workflow

### Draft State

WHEN a member creates an article, THE system SHALL initialize it in **Draft** status.

WHILE an article is in Draft status, ONLY the article author AND moderators SHALL be able to view the article.

WHILE an article is in Draft status, THE author SHALL be able to edit all article fields and add/remove attachments.

WHEN the author clicks "Submit for Review", THE system SHALL transition the article to **Pending Review** status.

### Pending Review State

WHILE an article is in Pending Review status, THE article SHALL be visible ONLY to moderators for review (not visible to other members or guests).

WHILE an article is in Pending Review status, THE article SHALL NOT be editable by the author (preventing changes during review).

WHEN a moderator approves the article, THE system SHALL transition it to **Published** status, set the "Published At" timestamp to current time, and make it visible to all users.

WHEN a moderator rejects the article, THE system SHALL transition it to **Rejected** status, require the moderator to provide a rejection reason (100-500 characters), and notify the author via the system.

### Published State

WHILE an article is in Published status, THE article SHALL be visible to all users (guests, members, and moderators).

WHILE an article is in Published status, THE article author SHALL NOT be able to modify the title or main content (preventing retroactive changes to published discussions).

WHILE an article is in Published status, THE article author MAY edit only non-content metadata such as category reassignment.

WHILE an article is in Published status, THE article SHALL accept new comments from members and display existing comments.

WHILE an article is in Published status, THE system SHALL track and display the view count each time any user views the article.

### Rejected State

WHILE an article is in Rejected status, THE article SHALL be visible ONLY to the original author and moderators.

WHILE an article is in Rejected status, THE article author SHALL be able to edit the article content and submit it again for review.

WHILE an article is in Rejected status, THE article SHALL NOT accept comments and SHALL NOT be visible to other members.

### Archived State

WHEN a moderator archives an article, THE system SHALL transition it to **Archived** status.

WHILE an article is in Archived status, THE article SHALL NOT be visible in normal browsing or search results.

WHILE an article is in Archived status, THE article SHALL remain accessible to moderators and the original author if they have a direct link.

---

## Image & File Attachment Requirements

### Attachment Limits per Article

THE system SHALL enforce the following attachment limits:

- **Maximum 5 images per article** - WHEN a member attempts to add a 6th image to an article, THE system SHALL reject the upload with appropriate error message
- **Maximum 3 file attachments per article** - WHEN a member attempts to add a 4th file to an article, THE system SHALL reject the upload with appropriate error message
- **Combined maximum 8 total attachments** (images + files) - WHEN total attachments would exceed 8, THE system SHALL reject with error message

### Supported Image Formats

THE system SHALL support the following image file formats:
- JPEG (.jpg, .jpeg) - maximum file size 5 MB per image
- PNG (.png) - maximum file size 5 MB per image
- GIF (.gif) - maximum file size 3 MB per image
- WebP (.webp) - maximum file size 5 MB per image

WHEN a member uploads an image file, THE system SHALL validate the file extension and MIME type to ensure it matches one of the supported formats.

IF a file extension does not match its MIME type, THE system SHALL reject the upload with error message "Invalid image format".

### Supported File Formats

THE system SHALL support the following document file formats:
- PDF (.pdf) - maximum file size 25 MB
- Microsoft Word (.doc, .docx) - maximum file size 15 MB
- Microsoft Excel (.xls, .xlsx) - maximum file size 15 MB
- Microsoft PowerPoint (.ppt, .pptx) - maximum file size 15 MB
- Plain Text (.txt) - maximum file size 10 MB
- OpenDocument (.odt, .ods, .odp) - maximum file size 15 MB
- Comma Separated Values (.csv) - maximum file size 10 MB

WHEN a member uploads a file, THE system SHALL validate the file extension and MIME type against the supported formats list.

IF a file format is not supported, THE system SHALL reject the upload with error message "File type not supported".

### Attachment Upload Process

WHEN a member selects an image or file to attach to an article, THE system SHALL immediately validate:
1. File size does not exceed maximum for that format
2. File format is in the supported list
3. Adding this file would not exceed per-article attachment limits

IF validation passes, THE system SHALL:
1. Store the file securely (see [Attachment File Handling](./06-attachment-file-handling.md) for storage details)
2. Generate a unique file ID and access URL
3. Display the attachment in the article editor with removal capability
4. Display the file name, size, and upload timestamp to the user

IF validation fails, THE system SHALL display specific error message indicating which validation rule was violated.

### Attachment Removal

WHILE an article is in Draft or Rejected status, THE author SHALL be able to remove any attachment by clicking a delete/remove button.

WHEN an attachment is removed from an article, THE system SHALL immediately delete it from storage and remove the reference from the article.

WHILE an article is in Published status, THE author SHALL NOT be able to remove attachments (preventing removal of content users may be referencing).

---

## Article Editing & Deletion

### Draft and Rejected Articles

WHILE an article is in Draft status, THE original author SHALL be able to edit:
- Article title
- Article content/body
- Category
- Image attachments (add/remove)
- File attachments (add/remove)

WHILE an article is in Rejected status, THE original author SHALL be able to edit all fields and resubmit for review.

WHEN the author saves edits to a Draft article, THE system SHALL update the "Updated At" timestamp.

### Published Articles - Limited Editing

WHILE an article is in Published status, THE original author SHALL be able to edit ONLY:
- Category (for organizational purposes)
- Author notes or disclaimers (if applicable)

WHILE an article is in Published status, THE author SHALL NOT be able to edit:
- Article title
- Article body/content
- Image attachments (cannot add or remove)
- File attachments (cannot add or remove)

WHEN edits are saved to a Published article, THE system SHALL update the "Updated At" timestamp but NOT change the "Published At" timestamp.

### Article Deletion

WHEN an article author clicks the delete button on their own article, THE system SHALL:
- IF article is in Draft status: Immediately delete the article and all associated attachments
- IF article is in Rejected status: Immediately delete the article and all associated attachments
- IF article is in Published status: Display a warning message that "Published articles cannot be deleted. Contact a moderator if you need to remove this article."

WHEN a moderator deletes an article, THE system SHALL transition it to Archived status (not permanently delete) to preserve system integrity and audit trail.

IF an article author attempts to delete a Published article, THE system SHALL prevent deletion and suggest contacting a moderator for assistance.

---

## Article Display & Retrieval

### Article Detail View

WHEN any user (guest or member) opens a published article, THE system SHALL display:
- Article title
- Author name
- Creation date and time
- Category tag
- Full article content/body
- All attached images displayed in gallery format below the content
- All attached files listed with download links below the images
- Comment count
- View count
- All published comments on the article

WHEN a published article is viewed, THE system SHALL increment the article's view count by 1.

### Article List/Feed Display

WHEN a user browses the article feed, THE system SHALL display articles in the following format:
- Article title (clickable link to detail view)
- Author name
- Category tag
- First 150 characters of article content (excerpt/preview)
- Publication date
- Comment count
- View count
- Thumbnail of first image (if article has images)

THE system SHALL display articles in **reverse chronological order** (newest published articles first).

WHEN a user filters by category, THE system SHALL display ONLY articles in that category in reverse chronological order.

### Access Control for Article Views

WHEN a guest user views the article list, THE system SHALL display ONLY articles with **Published** status.

WHEN a member views the article list, THE system SHALL display:
- All Published articles
- Their own Draft articles
- Their own Rejected articles

WHEN a moderator views the article list, THE system SHALL display:
- All articles in all statuses (Published, Draft, Pending Review, Rejected, Archived) with status indicators
- All author information
- Approval/rejection status with timestamps
- Links to approve or reject Pending Review articles

### Article Search Results

WHEN a user searches for articles by keyword, THE system SHALL return results matching articles with **Published** status only (for non-moderators).

WHEN a moderator searches articles, THE system SHALL return results from all statuses with clear status indicators.

THE search SHALL match keywords in:
- Article title
- Article content/body
- Category

---

## Validation Rules

### Title Validation

THE article title SHALL meet the following requirements:

- **Minimum length**: 3 characters - IF title has fewer than 3 characters, THE system SHALL reject with message "Title must be at least 3 characters long"
- **Maximum length**: 200 characters - IF title exceeds 200 characters, THE system SHALL reject with message "Title cannot exceed 200 characters"
- **Required field**: Title cannot be empty or null - IF title is empty, THE system SHALL reject with message "Title is required"
- **No HTML/Script tags**: THE system SHALL strip or reject any HTML tags, script tags, or SQL injection attempts
- **Whitespace handling**: THE system SHALL trim leading/trailing whitespace and collapse multiple spaces to single spaces

### Content Body Validation

THE article content/body SHALL meet the following requirements:

- **Minimum length**: 10 characters - IF content has fewer than 10 characters, THE system SHALL reject with message "Article content must be at least 10 characters long"
- **Maximum length**: 50,000 characters - IF content exceeds 50,000 characters, THE system SHALL reject with message "Article content cannot exceed 50,000 characters"
- **Required field**: Content cannot be empty or null - IF content is empty, THE system SHALL reject with message "Article content is required"
- **No executable scripts**: THE system SHALL remove or escape any JavaScript code, SQL queries, or other executable content
- **Plain text or basic markdown**: THE system SHALL support basic text formatting (line breaks, paragraphs) but reject advanced HTML or embedding attempts

### Category Validation

THE article category field SHALL be validated as follows:

- **Required field**: Category must be selected - IF no category is selected, THE system SHALL reject with message "Category is required"
- **Valid enum value**: Category MUST be one of the predefined values: "Economics", "Politics", "Economic Policy", "Political Analysis", "Other"
- IF an invalid category is submitted, THE system SHALL reject with message "Invalid category selection"

### Duplicate Title Prevention

THE system SHALL prevent articles with identical titles within a short timeframe to reduce spam:

WHEN a member submits an article for review, THE system SHALL check if an identical title exists in Published articles created within the last 30 days.

IF an identical title is found, THE system SHALL display a warning: "An article with this exact title already exists. Are you sure you want to continue?" and allow the user to proceed or edit the title.

---

## Business Rules for Articles

### Author Attribution

THE system SHALL always display the member's **display name** (not raw username) as the article author in all public views.

THE system SHALL maintain the author ID as metadata for permission checking but not display it publicly.

### Article Permanence

Published articles SHALL NOT be deleted by authors (only archived by moderators). This policy maintains discussion integrity and prevents retroactive changes to community discussions.

### Rejection Feedback

WHEN an article is rejected by a moderator, THE system SHALL notify the author and provide the rejection reason so they can improve and resubmit.

THE rejection reason SHALL be visible to the author and SHALL help them understand moderation standards.

### Category Organization

THE system SHALL organize all published articles by category to help users discover discussions by topic area.

THE category system SHALL use predefined values only (no custom categories) to ensure clean organization and prevent misuse.

### Comment Moderation

Articles in Published status SHALL accept comments, and comments SHALL follow their own moderation requirements (see [Comments and Discussion Requirements](./04-comments-and-discussion-requirements.md)).

The article's comment count SHALL reflect only approved comments, not pending or rejected comments.

---

## Article Categories & Organization

### Predefined Category List

THE system SHALL maintain the following fixed article categories:

1. **Economics** - General economic topics, theories, market analysis, and economic trends
2. **Politics** - General political topics, elections, legislation, and political events
3. **Economic Policy** - Discussion of economic policies, regulations, and government economic actions
4. **Political Analysis** - In-depth analysis of political events, decisions, and their implications
5. **Other** - Topics related to discussion board itself or miscellaneous discussions

WHEN creating or editing an article, THE member SHALL select exactly one category from this list.

THE system SHALL NOT allow custom category creation or free-form category entry.

### Category-Based Filtering

WHEN a user selects a category filter in the article list, THE system SHALL display ONLY published articles in that category.

WHEN viewing a category, THE system SHALL display the category name and article count for that category.

THE system SHALL maintain article counts per category that update automatically as articles are published or archived.

---

## Article Creation Example Scenarios

### Scenario 1: Successful Article Creation and Approval

1. Member navigates to "Create Article" page
2. Member enters title: "Impact of Federal Reserve Policy on Inflation"
3. Member selects category: "Economics"
4. Member writes detailed article content (800 characters)
5. Member attaches a PDF chart showing historical inflation data (2 MB)
6. Member clicks "Submit for Review"
7. System validates all fields and creates article in "Draft" status
8. Article transitions to "Pending Review" status
9. System notifies all moderators
10. Moderator reviews article and approves it
11. Article status becomes "Published"
12. Article appears on homepage and in search results
13. Other members can view and comment on the article
14. Member receives notification: "Your article has been approved and published"

### Scenario 2: Article Rejection and Resubmission

1. Member submits article with title "Check out my new product!" and promotional content
2. Moderator reviews and identifies it as spam/off-topic
3. Moderator rejects article with reason: "Commercial content not allowed"
4. System transitions article to "Rejected" status
5. Member receives notification with rejection reason
6. Member navigates to "My Articles" and sees rejected article
7. Member clicks "Edit" on rejected article
8. Member revises content to focus on legitimate economic discussion
9. Member changes title to "Economic Analysis of Market Competition"
10. Member resubmits for review
11. Different moderator reviews revised article and approves
12. Article is published and visible to all users

### Scenario 3: Published Article Edit Restrictions

1. Member creates article about political policy (title: "Analysis of Tax Reform")
2. Article is approved and published with 15 comments
3. Member tries to edit the article title to "Why Tax Reform Failed"
4. System prevents editing and displays message: "Published articles cannot be edited. Contact a moderator if you need major revisions."
5. Member can edit category or notes, but not the main content
6. If member wants to substantially change the article, they must delete it and create a new one

---

## Summary

The article management system provides a straightforward publication workflow where members create and submit articles, moderators review and approve them before publication, and guests/members can read and comment on published content. Articles support rich media through images and file attachments, are organized by category, and can be edited in draft state but not after publication to maintain discussion integrity. This model balances member participation with community moderation to ensure quality discussions.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*