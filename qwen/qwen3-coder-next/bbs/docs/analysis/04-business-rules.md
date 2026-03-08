**discussionBoard — Data isolation, business rules, filtering/sorting/pagination, error catalog**

Data isolation, business rules, filtering/sorting/pagination, error catalog

# Data Isolation and Ownership

Data ownership rules and tenant/user-level isolation policies.

## Ownership and Isolation Rules

Define data ownership semantics and isolation boundaries for multi-user access.

### User Data Ownership

### User Data Ownership

WHEN a user creates an article, THE system SHALL assign ownership of that article to the creating user.

WHEN a user creates a comment, THE system SHALL assign ownership of that comment to the creating user.

WHEN a user uploads a file attachment to an article, THE system SHALL associate the file with the article and the user who uploaded it.

WHEN a user's account is deleted, THE system SHALL:
1. Remove the user's profile information
2. Delete all articles created by the user
3. Delete all comments created by the user
4. Remove all file attachments associated with the user's content
5. Remove the user's ban status
6. Preserve article content for historical reference (article text remains visible with deleted author attribution)

### Multi-User Data Isolation

### Multi-User Data Isolation

WHEN a user views articles, THE system SHALL only display articles from sections the user has permission to access.

WHEN a user views other users' profiles, THE system SHALL only display publicly available information:
1. Display name
2. Bio text
3. List of articles (with article title, section, and date)
4. List of comments (with article title and comment content)

WHILE a user is banned, THE system SHALL:
1. Prevent the user from logging in to the platform
2. Preserve all existing articles and comments created by the user
3. Continue to display the banned user's content as visible content
4. Restrict the banned user from creating new articles or comments
5. Restrict the banned user from editing or deleting existing content
6. Allow administrators to view the ban reason for the user

WHEN a super administrator views the list of banned users, THE system SHALL:
1. Display each banned user's display name
2. Display the ban reason
3. Display when the ban was applied
4. Provide the ability to unban users

WHEN a user searches articles, THE system SHALL only return results from articles they have permission to view based on section access and user ban status.

### Section-Based Data Access Control

### Section-Based Data Access Control

WHEN a user accesses a specific section, THE system SHALL:
1. Verify the section exists and is accessible
2. Filter articles to only show those in the requested section
3. Apply user-specific filters based on ban status
4. Apply role-based filters based on section permissions

WHILE a user browses articles within a section, THE system SHALL:
1. Include only articles from that section
2. Exclude articles from deleted sections
3. Include only articles the user has permission to view
4. Apply sorting preferences (newest/oldest first)

WHEN a user searches articles by title or content, THE system SHALL:
1. Only search articles the user has permission to view
2. Filter results based on user's section access permissions
3. Exclude content from banned users from search results if appropriate per business policy
4. Return paginated results with search terms highlighted where applicable

WHERE a user has administrator privileges, THE system SHALL grant access to:
1. All sections regardless of section-level restrictions
2. All articles across all sections
3. All comments across all sections
4. Full user lists and ban management interfaces

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## User Rules

Users must provide a unique email address during registration that is not already associated with an active account. Passwords must meet minimum security requirements and cannot be left blank during login attempts. Users can update their display name and bio at any time, with display names limited to 100 characters. Account deletion is permanent and results in the removal of all articles and comments created by the user. Users can only edit their own profile information and cannot view or modify other users' profiles. Banned users are prevented from logging in but retain visibility of their existing content. Each user account must have exactly one display name and one bio field. Email addresses are case-insensitive for uniqueness checks. Users can change their password as often as needed, but new passwords must meet current security standards.

### User Registration

WHEN a new user registers, THE system SHALL require an email address and password.

WHEN a new user registers, THE system SHALL create a user account with the role of 'member'.

WHEN a user submits registration information, THE system SHALL record the registration timestamp.

WHILE a user account exists, THE system SHALL associate it with exactly one email address and one display name.

### Email Uniqueness

THE system SHALL reject registration or email change requests when the email address is already associated with an active account.

THE system SHALL perform case-insensitive comparison when checking email uniqueness.

WHILE a user account is active, THE system SHALL ensure its email address remains unique across the platform.

IF a user attempts to register with an email already in use, THE system SHALL provide an error message indicating the email is already registered.

### Password Requirements

WHEN a user creates an account, THE system SHALL require a password that cannot be empty.

WHEN a user creates an account, THE system SHALL store the password in encrypted form.

WHEN a user logs in, THE system SHALL validate the provided password against the stored encrypted password.

WHEN a user changes their password, THE system SHALL require authentication with the current password.

WHEN a user changes their password, THE system SHALL require the new password to be different from the current password.

### Profile Editing

WHEN a user edits their profile, THE system SHALL allow updating their display name and bio.

WHEN a user edits their profile, THE system SHALL record the update timestamp.

WHILE a user profile exists, THE system SHALL allow only the owner to edit their display name and bio.

WHEN a user attempts to edit another user's profile, THE system SHALL reject the request and provide an error message.

### Account Deletion

WHEN a user deletes their account, THE system SHALL permanently remove their account.

WHEN a user deletes their account, THE system SHALL delete all articles created by that user.

WHEN a user deletes their account, THE system SHALL delete all comments created by that user.

WHEN a user deletes their account, THE system SHALL also delete all ban records associated with that user.

WHEN a user deletes their account, THE system SHALL verify user authentication before processing the deletion.

### User Banning

WHEN an administrator bans a user, THE system SHALL record the ban with a reason and timestamp.

WHEN an administrator bans a user, THE system SHALL update the banned user's role to 'banned'.

WHEN an administrator bans a user, THE system SHALL preserve all existing articles and comments by that user.

WHEN a user is banned, THE system SHALL allow administrators to view the ban reason.

WHEN a user is banned, THE system SHALL prevent the user from logging in with their credentials.

### Display Name Constraints

WHEN a user registers or updates their profile, THE system SHALL require a display name between 1 and 100 characters.

WHEN a user registers or updates their profile, THE system SHALL require the display name to be non-empty.

WHILE a user profile exists, THE system SHALL require the display name to be exactly one value.

WHEN a user attempts to set a display name exceeding 100 characters, THE system SHALL reject the request and provide an error message.

### Bio Editing

WHEN a user edits their profile, THE system SHALL allow optional bio text updates.

WHEN a user edits their profile, THE system SHALL allow the bio to be empty or contain up to 10,000 characters.

WHILE a user profile exists, THE system SHALL allow bio text to be updated at any time by the user.

WHEN a user attempts to set a bio exceeding the character limit, THE system SHALL reject the request and provide an error message.

### Banned User Restrictions

WHEN a banned user attempts to log in, THE system SHALL reject the login request.

WHILE a user is banned, THE system SHALL prevent them from creating new articles.

WHILE a user is banned, THE system SHALL prevent them from creating new comments.

WHILE a user is banned, THE system SHALL prevent them from editing their profile information.

WHILE a user is banned, THE system SHALL retain visibility of their existing articles and comments.

WHEN an administrator unbans a user, THE system SHALL restore the user's ability to log in.

## Section Rules

Sections can only be created, edited, or deleted by users with administrator privileges. Each section must have a unique name within the platform, and the name cannot be changed after creation if articles exist in that section. Section descriptions provide context about the topics covered and must not be empty. Users can view all available sections but cannot create new ones without authorization. Sections serve as containers for articles and cannot exist independently of articles. A section's name must remain consistent across all user-facing interfaces. Administrators can see all sections and their associated article counts. Sections cannot be deleted if they contain articles unless all articles are moved or deleted first.

### Section Creation Rules

WHEN an administrator creates a section, THE system SHALL:
1. Require a unique name (1-100 characters)
2. Require a non-empty description
3. Assign the creating administrator as the section owner
4. Initialize the section with zero articles

IF the section name already exists, THE system SHALL reject the request.
IF the section name is empty or exceeds 100 characters, THE system SHALL reject the request.
IF the description is empty, THE system SHALL reject the request.
IF the user lacks administrator privileges, THE system SHALL reject the request.

### Section Uniqueness

THE system SHALL enforce unique section names across the entire platform.
THE system SHALL prevent two sections from having identical names.
THE system SHALL reject any request to rename a section to an existing section name.
THE system SHALL maintain a global registry of all section names for uniqueness validation.

### Article Containment

WHEN an article is created, THE system SHALL require assignment to exactly one section.
THE system SHALL not allow articles to exist outside of a section.
WHEN a section is deleted, THE system SHALL require all articles in that section to be moved or deleted first.
IF an attempt is made to delete a section containing articles, THE system SHALL reject the request and provide the article count.

### Section Deletion Rules

THE system SHALL prevent deletion of sections that contain articles.
WHEN a section has zero articles, THE system SHALL allow its deletion by administrators.
IF an administrator attempts to delete a section with articles, THE system SHALL reject the request and specify the article count.
THE system SHALL log the deletion time and the administrator who performed the deletion.

### Description Requirements

WHEN creating or editing a section, THE system SHALL require a non-empty description.
THE system SHALL not allow section descriptions to be empty strings or whitespace-only.
IF an attempt is made to set an invalid description, THE system SHALL reject the request.
Section descriptions may contain any text but must have content length greater than zero.

### Section Visibility

WHEN a user browses sections, THE system SHALL display all available sections.
GUESTS and MEMBERS can view the section list and section details.
ADMINISTRATORS and SUPER ADMINISTRATORS can view all sections with article counts.
Section visibility is unrestricted and all authenticated users can access section information.

### Article Count Tracking

WHEN articles are added to a section, THE system SHALL increment the section's article count.
WHEN articles are deleted from a section, THE system SHALL decrement the section's article count.
THE system SHALL maintain accurate article counts for each section.
Section views shall include the current article count for that section.

### Immutable Section Names

WHEN a section has articles, THE system SHALL prevent changes to the section name.
IF a section has no articles, THE system SHALL allow administrators to rename the section.
WHEN renaming a section, THE system SHALL validate the new name is unique.
IF a section name is currently in use by another section, THE system SHALL reject the rename request.

## Article Rules

Users can create articles only in sections they can access, with each article requiring exactly one section assignment. Articles must have both a title and content, with neither field left empty or whitespace-only. Users can attach multiple files and images to a single article, with each attachment having distinct metadata. Tags added to articles must be unique within that article and cannot duplicate existing tags. Users can edit their own articles at any time after creation, modifying title, content, attachments, and tags. Article deletion is permanent and immediate, with no recovery option available. Articles cannot be created with expired or invalid section references. Each article is associated with exactly one author who retains ownership permissions. When an article's author is deleted, the article remains but is marked as authored by a removed user.

### Article Creation

WHEN a user creates an article, THE system SHALL:
1. Require a non-empty title
2. Require non-empty content
3. Require selection of exactly one existing section
4. Automatically record the creation timestamp
5. Associate the article with the creating user as its author

IF the title is empty or whitespace-only, THE system SHALL reject the request.
IF the content is empty or whitespace-only, THE system SHALL reject the request.
IF the selected section does not exist, THE system SHALL reject the request.

Article title length is limited to 500 characters (defined in [Module 3 > Article Validation Rules]).
Article content has no length limit but must not be empty.

### Section Assignment

WHEN an article is created or edited, THE system SHALL:
1. Assign exactly one section to the article
2. Validate that the assigned section exists and is active
3. Preserve the section assignment when editing other article fields
4. Prevent removal of the section assignment entirely

WHILE an article exists, THE system SHALL:
1. Always have exactly one associated section
2. Not allow the section to be changed to a non-existent or inactive section
3. Prevent section deletion if articles are associated with it

The section field is required and immutable unless the new section also exists and is accessible to the user.

### Required Fields

WHEN an article is created, THE system SHALL require:
- Title: non-empty text, maximum 500 characters
- Content: non-empty text, no maximum length
- Section: exactly one existing section

IF the title is missing, empty, or whitespace-only, THE system SHALL reject the request.
IF the content is missing, empty, or whitespace-only, THE system SHALL reject the request.
IF the section is missing or invalid, THE system SHALL reject the request.

### File Attachments

WHEN a user attaches a file to an article, THE system SHALL:
1. Accept one or more file attachments per article
2. Store file metadata including file name, file URL, file size, file type, and upload timestamp
3. Associate the attachment with the article
4. Allow users to download attached files

THE system SHALL:
1. Require a valid file URL for each attachment
2. Require positive file size values
3. Record the upload timestamp automatically
4. Preserve attachments when editing article content or metadata

WHEN an article is deleted, THE system SHALL remove all associated file attachments.

### Image Uploads

WHEN a user uploads images to an article, THE system SHALL:
1. Accept image files as attachments alongside other file types
2. Store image-specific metadata (file name, file URL, file size, file type, upload timestamp)
3. Allow multiple images to be attached to a single article
4. Enable image download functionality

THE system SHALL:
1. Validate that uploaded files are valid image types
2. Store image metadata separately from article content
3. Preserve image attachments when the article is edited

Image uploads follow the same attachment rules as other file types (defined in [Module 2 > FileAttachment Rules]).

### Tag Uniqueness

WHEN a user adds tags to an article, THE system SHALL:
1. Allow multiple tags per article
2. Ensure tag names are unique within the context of a single article
3. Prevent duplicate tag assignments to the same article
4. Associate each tag with an article through an ArticleTag relationship

WHILE an article exists, THE system SHALL:
1. Not allow duplicate tags to be added to the same article
2. Maintain the one-to-many relationship between articles and tags
3. Preserve tag associations when editing other article fields

Tag uniqueness is enforced per-article, not globally across the platform.

### Article Editing

WHEN a user edits their own article, THE system SHALL:
1. Allow modification of title, content, attachments, and tags
2. Automatically update the last modification timestamp
3. Preserve the original creation timestamp and author association
4. Maintain the section assignment unless changed to another valid section

IF the user is not the article's author, THE system SHALL reject the edit request.
IF the section is changed to a non-existent section, THE system SHALL reject the request.

THE system SHALL:
1. Allow emptying of title or content only during editing (not during creation)
2. Permit removal of all attachments, leaving no file attachments
3. Allow removal of all tags, leaving no tag associations

### Article Deletion

WHEN a user deletes their own article, THE system SHALL:
1. Permanently remove the article record
2. Remove all associated comments
3. Remove all associated file attachments
4. Remove all associated tag relationships
5. Immediately make the article inaccessible

THE system SHALL:
1. Not maintain a soft-delete record or recovery option
2. Not cascade deletion to the author's user record
3. Not affect sections, tags, or other articles

When an administrator deletes an article, THE system SHALL:
1. Follow the same deletion process as author-initiated deletion
2. Record the administrative deletion action for audit purposes
3. Preserve the original deletion timestamp for historical tracking

### Author Ownership

WHEN an article is created, THE system SHALL:
1. Associate the creating user as the article's author
2. Record the author's user ID in the article record
3. Grant the author permission to edit and delete the article
4. Preserve author ownership even when other article fields are modified

WHILE an article exists, THE system SHALL:
1. Maintain the association between author and article
2. Prevent other users from editing or deleting the article unless they are administrators
3. Allow the author to view, edit, and delete their own content

Article authorship is immutable after creation and cannot be transferred to another user.

### Deleted Author Handling

WHEN an author's account is deleted, THE system SHALL:
1. Preserve the article record with all associated content
2. Mark the article as having a removed author
3. Maintain the original creation timestamp and content
4. Keep all file attachments, tags, and comments intact

WHILE an article with a removed author exists, THE system SHALL:
1. Prevent the article from being edited or deleted by other users
2. Allow administrators to continue managing the article
3. Display the article as having a removed author in user interfaces
4. Preserve the article in section listings and search results

The article remains accessible and viewable, but its author field is marked as removed rather than associated with a specific user.

## Comment Rules

Comments are single-level only, with no support for nested replies or threaded discussions. Users can comment only on articles that exist and are visible to them. Each comment must contain non-empty content and cannot be left blank. Users can edit their own comments any number of times but cannot edit comments belonging to others. Comment deletion is immediate and permanent for the author. Comments are sorted chronologically with oldest appearing first on article pages. When a user is banned, their comments remain visible to maintain discussion continuity. Comments cannot be created for deleted articles. Each comment must reference exactly one article and cannot exist independently.

### Comment Structure and Scope

### Comment Structure and Scope

THE system SHALL ensure comments are single-level only, with no support for nested replies or threaded discussions.
WHEN a user attempts to create a reply to an existing comment, THE system SHALL reject the request.
WHERE a comment exists, THE system SHALL associate it with exactly one article and no other entity.

Comments cannot exist independently of articles. Each comment MUST reference exactly one existing article. IF a comment is created for an article that does not exist, THE system SHALL reject the request.

### Article Commenting Permissions

### Article Commenting Permissions

WHEN a user creates a comment, THE system SHALL require the comment to be associated with an existing article.
WHEN a user attempts to comment on an article, THE system SHALL verify the article is visible to them.
IF the target article does not exist, THE system SHALL reject the request.
IF the target article exists but is deleted, THE system SHALL reject the request.

Guests cannot create comments.
Members can create comments on visible articles.

### Comment Content Requirements

### Comment Content Requirements

WHEN a user creates or updates a comment, THE system SHALL require non-empty content.
IF the comment content is empty or contains only whitespace, THE system SHALL reject the request.
WHERE comment content is provided, THE system SHALL accept text content of any length without impose a character limit.

Comment content cannot be modified to become empty after initial creation.

### Comment Editing Permissions

### Comment Editing Permissions

WHEN a user attempts to edit a comment, THE system SHALL verify the user is the original author.
IF a user attempts to edit a comment created by another user, THE system SHALL reject the request.
WHILE a comment exists and is visible, THE system SHALL allow its author to update the content.
WHEN a comment is updated, THE system SHALL record the updated timestamp.

Comments can be edited any number of times by their author.

### Comment Deletion

### Comment Deletion

WHEN a user deletes their own comment, THE system SHALL immediately and permanently remove the comment.
WHEN a comment is deleted, THE system SHALL update any associated metadata such as comment counts on articles.
WHERE a comment is deleted, THE system SHALL preserve no trace of its content for recovery purposes.

Only the original author can delete their own comments. Administrators can also delete any comment.

### Chronological Sorting

### Chronological Sorting

WHEN a user views comments on an article, THE system SHALL sort comments by creation time.
WHERE multiple comments exist, THE system SHALL display the oldest comment first and newest last.
WHEN new comments are created, THE system SHALL automatically place them at the end of the sorted list.

The creation timestamp is immutable and determines the sort order permanently.

### Banned User Comments

### Banned User Comments

WHEN a user is banned, THE system SHALL preserve their existing comments and keep them visible.
WHERE a comment was created by a banned user, THE system SHALL still display the comment content.
WHEN displaying a comment from a banned user, THE system SHALL indicate the user is banned.

Banning does not delete or hide existing comments to maintain discussion continuity.

### Article Existence Validation

### Article Existence Validation

WHEN a comment is created, THE system SHALL verify the target article exists.
IF the target article does not exist, THE system SHALL reject the comment creation request.
WHEN an article is deleted, THE system SHALL prevent new comments on that article.
WHERE an article is in the process of being deleted, THE system SHALL reject comment creation attempts.

### Comment Ownership

### Comment Ownership

WHEN a comment is created, THE system SHALL associate it with the creating user as its author.
WHERE a comment exists, THE system SHALL identify the author as the owner.
WHEN a user attempts to edit a comment, THE system SHALL verify they are the owner.
WHEN a user attempts to delete a comment, THE system SHALL verify they are the owner or an administrator.

Comment ownership is permanent and cannot be transferred to another user.

### Comment Visibility

### Comment Visibility

WHERE a comment exists and its associated article is visible, THE system SHALL make the comment visible.
WHEN a comment is associated with a deleted article, THE system SHALL prevent its creation but preserve existing comments when an article is deleted.
WHERE an article is visible, THE system SHALL display all comments on that article including those from banned users.

Comment visibility is tied to article visibility, but comments remain visible even when their author is banned.

## FileAttachment Rules

Files can only be attached to articles, not to comments or profiles. Each file must have a valid name and download URL provided at upload. File size is tracked for administrative purposes but imposes no explicit limit in the requirements. Users can attach multiple files to a single article without restriction on quantity. File attachments are preserved when articles are edited but removed only during explicit deletion. Users can download any attached file using its URL. Files cannot be attached to multiple articles; each attachment references exactly one article. When an article is deleted, all associated files are also deleted from the system.

### Article-Only Attachments

WHEN a file is uploaded, THE system SHALL associate it with exactly one article.
IF a file is uploaded without an article reference, THE system SHALL reject the upload.
WHILE a file is attached to an article, THE system SHALL NOT allow it to be attached to a comment or profile.

### File Metadata Requirements

WHEN a file is attached, THE system SHALL record the file name, file URL, file size, file type, and upload timestamp.
THE system SHALL reject the attachment if the file name is missing or empty.
THE system SHALL reject the attachment if the file URL is invalid or inaccessible.

### Download Access

WHEN a user requests to download an attached file, THE system SHALL provide access to the file.
Guests can download files from publicly accessible articles.
Members can download files from any article they can view.
Administrators can download files from any article regardless of visibility.

### Multiple Attachments Per Article

WHEN an article is created or updated, THE system SHALL allow multiple file attachments.
THE system SHALL enforce no artificial limit on the number of files per article.
WHEN an article is deleted, all associated files are also deleted from the system.

### Attachment Preservation

WHEN an article is edited, THE system SHALL preserve all existing file attachments unless explicitly removed.
WHEN an article is moved to a different section, THE system SHALL retain all file attachments.
IF a file is removed from an article, THE system SHALL delete the file from the system.

### Attachment Deletion

WHEN a user deletes their own article, THE system SHALL delete all associated file attachments.
WHEN an administrator deletes an article, THE system SHALL delete all associated file attachments.
WHEN an article attachment is explicitly removed, THE system SHALL delete the file from storage.

### File Association Integrity

THE system SHALL maintain referential integrity between articles and file attachments.
IF an article reference is invalid, THE system SHALL reject attachment operations.
WHEN a file is deleted, THE system SHALL ensure it is no longer referenced by any article.

### Attachment Ownership

WHEN a user attaches a file to an article, THE system SHALL associate the file with the user as the original uploader.
The original uploader retains ownership but cannot delete files attached by other users unless authorized.
Administrators can remove any file attachment from any article.

## Tag Rules

Tags must have a unique name within the scope of each article they're applied to. Tag names are free text but cannot exceed 50 characters in length. Users can create new tags dynamically when assigning them to articles without requiring pre-approval. Tags are case-sensitive in their storage but treated consistently across searches. Each tag must be associated with exactly one article through an ArticleTag relationship. Tags cannot be edited after creation; users must remove and re-add them for changes. A tag cannot exist without being linked to at least one article via ArticleTag. Multiple articles can share the same tag name, enabling cross-article filtering.

### Tag Uniqueness Within Articles

WHEN a user assigns a tag to an article, THE system SHALL ensure that the same tag name is not assigned to that article more than once.

IF a user attempts to assign a tag that already exists on the article, THE system SHALL reject the duplicate assignment.

Tag uniqueness is enforced at the article level, meaning the same tag name can exist on different articles without conflict.

### Tag Name Character Limits

WHEN a user creates or assigns a tag, THE system SHALL require the tag name to be between 1 and 50 characters in length.

IF a tag name exceeds 50 characters, THE system SHALL reject the request.

IF a tag name is empty (0 characters), THE system SHALL reject the request.

Tag names may contain any characters within the length constraint; no character restrictions beyond length are imposed.

### Dynamic Tag Creation

WHEN a user assigns a tag to an article, THE system SHALL automatically create a new tag if one with that name does not already exist.

Tag creation does not require administrator approval or pre-registration.

Users can create new tags on-the-fly by using new tag names when assigning tags to articles.

The system SHALL preserve tag names exactly as created by users when storing tags.

### Case Sensitivity Policy

Tag names are stored and compared exactly as provided by users, maintaining case sensitivity throughout the system.

WHEN a user searches or filters by tags, THE system SHALL match tags using exact case-sensitive comparison.

IF a user creates a tag "Economy" and another creates a tag "economy", THE system SHALL treat these as two distinct tags.

Tag display to users shall preserve the original case of the tag name as stored in the system.

### Article-Tag Relationship Requirements

WHEN a tag is created, THE system SHALL require it to be associated with at least one article through an ArticleTag relationship.

A tag cannot exist in the system without being linked to at least one article.

WHEN the last ArticleTag relationship for a tag is removed, THE system SHALL automatically delete the tag.

Each ArticleTag relationship shall record the timestamp when the tag was assigned to the article.

### Tag Editing Restrictions

WHEN a user attempts to edit a tag name after creation, THE system SHALL reject the edit request.

Tags are immutable once created; users cannot modify tag names.

IF a user wants to change a tag's name, THE system SHALL require them to remove the existing tag and create a new one with the desired name.

Tag removal and recreation is the only supported method for changing tag names.

### Tag Existence Requirement

THE system SHALL ensure that no tag exists without being associated with at least one article through an ArticleTag relationship.

IF all ArticleTag associations for a tag are deleted or removed, THE system SHALL automatically delete the orphaned tag.

Tag deletion occurs automatically when the tag has zero remaining article associations.

The system SHALL prevent manual deletion of tags that still have active article associations.

### Cross-Article Tagging

WHEN a user assigns a tag to an article, THE system SHALL allow the same tag name to be used across multiple articles without conflict.

The same tag name may appear on many different articles simultaneously, enabling cross-article filtering and discovery.

Each article maintains its own independent set of tag associations, with no cross-article uniqueness constraints beyond the single-article uniqueness rule.

## ArticleTag Rules

ArticleTag creates the relationship between articles and tags, linking exactly one article to one tag per record. Each ArticleTag record must include the timestamp when the association was created. Users can create new ArticleTag records by adding tags to an article during creation or editing. ArticleTag records are deleted automatically when either the associated article or tag is removed. A single article can have multiple ArticleTag records, one for each associated tag. ArticleTag records cannot be updated after creation; they must be deleted and recreated for changes. Each ArticleTag must reference valid article and tag identifiers that exist in the system. The ArticleTag records are used to filter and display articles with specific tags.

### Article-Tag Relationship

THE system SHALL create exactly one ArticleTag record for each article-tag pair.

WHEN a user adds a tag to an article, THE system SHALL create a new ArticleTag record linking that article to that tag.

WHEN an article and tag already have a valid ArticleTag record, THE system SHALL NOT create a duplicate record.

THE system SHALL associate each ArticleTag record with exactly one article and exactly one tag.

### Association Timestamp

WHEN a new ArticleTag record is created, THE system SHALL automatically set the assignedAt timestamp to the current UTC datetime.

THE system SHALL NOT allow manual modification of the assignedAt timestamp.

WHEN viewing ArticleTag records, THE system SHALL display the assignedAt timestamp.

THE assignedAt timestamp SHALL be used to determine the order of tag associations for display purposes.

### Dynamic Creation

WHEN a user creates or edits an article and specifies one or more tags, THE system SHALL create ArticleTag records for each new tag association.

WHEN a user adds a tag to an existing article, THE system SHALL create a new ArticleTag record for that article-tag pair.

THE system SHALL allow dynamic creation of ArticleTag records during article creation or editing operations.

### Automatic Deletion

WHEN an article is deleted, THE system SHALL automatically delete all ArticleTag records associated with that article.

WHEN a tag is deleted, THE system SHALL automatically delete all ArticleTag records associated with that tag.

ArticleTag deletion due to article or tag deletion SHALL occur without explicit user action.

### One-to-Many Relationship

A single article MAY have multiple ArticleTag records, one for each tag associated with that article.

A single tag MAY be associated with multiple articles through ArticleTag records.

THE system SHALL support the one-to-many relationship where one article connects to many ArticleTag records.

### Immutable Records

WHEN an ArticleTag record is created, THE system SHALL NOT allow subsequent updates to that record.

IF a user needs to change a tag association, THE system SHALL require deletion of the existing ArticleTag record followed by creation of a new record.

### Reference Validation

WHEN creating an ArticleTag record, THE system SHALL validate that the referenced article exists.

WHEN creating an ArticleTag record, THE system SHALL validate that the referenced tag exists.

THE system SHALL reject ArticleTag creation requests where either the article or tag reference is invalid or non-existent.

### Tag-Based Filtering

WHEN filtering articles by tag, THE system SHALL use ArticleTag records to identify articles associated with that tag.

THE system SHALL return only articles that have valid ArticleTag records linking them to the requested tag.

ArticleTag records are the authoritative source for tag-to-article relationships in filtering operations.

## AdministratorRequest Rules

Any user can submit one administrator request at a time, with additional requests pending resolution of the current one. Each request must include a reason field containing non-empty text explaining the user's qualification. Requests start in pending status and cannot be modified once submitted. Super administrators can view all pending, approved, and rejected requests. Approved requests result in the user becoming a regular administrator with full moderation capabilities. Rejected requests do not grant any administrative privileges and allow resubmission after modification. The system records the timestamp when each request is submitted. A request cannot be approved or rejected by the user who submitted it.

### Request Submission Rules

WHEN a user submits an administrator request, THE system SHALL:
1. Require the user to provide a non-empty reason text explaining their qualification
2. Set the request status to "pending"
3. Automatically record the submission timestamp in UTC
4. Prevent the user from submitting another request while an existing request is pending

IF the reason field is empty or contains only whitespace, THE system SHALL reject the request.
IF the user already has a pending, approved, or rejected request, THE system SHALL reject the new request.

### Single Active Request Constraint

WHILE a user has a pending administrator request, THE system SHALL:
1. Block the user from submitting additional administrator requests
2. Show the existing request details when the user navigates to the request page

A user may have only one active administrator request at any time, where "active" includes pending, approved, or rejected statuses.

IF a user attempts to submit a new request while an existing request exists, THE system SHALL display an error message.

### Reason Field Requirements

WHEN a user creates an administrator request, THE system SHALL:
1. Require the reason field to contain non-empty text
2. Reject the request if the reason contains only whitespace
3. Preserve the exact text provided by the user without modification

The reason field must explain the user's qualification and motivation for becoming an administrator.

IF the reason field is missing or empty, THE system SHALL reject the request with a validation error.

### Status Workflow

WHEN a super administrator processes an administrator request, THE system SHALL:
1. Allow status transitions from "pending" to either "approved" or "rejected"
2. Record the processing timestamp when status changes
3. Update the rejection reason field when status changes to "rejected"

A request status follows this workflow:
- Initial state: "pending"
- From "pending", may transition to "approved" or "rejected"
- Once "approved" or "rejected", status cannot be changed

WHEN a request is approved, THE system SHALL automatically promote the user to regular administrator role.

WHEN a request is rejected, THE system SHALL NOT modify the user's role.

### Super Administrator Access

A super administrator SHALL be able to view:
1. A list of all administrator requests (pending, approved, and rejected)
2. Full details of each request including reason text and timestamps
3. The current status and processing history of each request

SUPER administrators have read access to all administrator requests regardless of who submitted them.

### Permission Granting

WHEN a super administrator approves an administrator request, THE system SHALL:
1. Change the user's role from "member" to "admin"
2. Update the request status to "approved"
3. Record the approval timestamp
4. Grant the user full administrator privileges including section management, article deletion, comment deletion, and user banning capabilities

The permission grant occurs atomically with the status update—no intermediate states.

### Request Rejection Handling

WHEN a super administrator rejects an administrator request, THE system SHALL:
1. Record the rejection reason provided by the super administrator
2. Update the request status to "rejected"
3. Record the rejection timestamp
4. NOT change the user's role or grant any administrator privileges

A rejected request does not prevent the user from submitting a new request after making modifications.

IF a user wishes to resubmit after rejection, THE system SHALL allow a new request with updated information.

### Timestamp Tracking

WHEN an administrator request is created, THE system SHALL automatically:
1. Record the submission timestamp in UTC
2. Set the status to "pending"
3. Initialize the processedAt field as null

WHEN a super administrator processes a request, THE system SHALL:
1. Record the processing timestamp when approval or rejection occurs
2. Update the rejectionReason field if the request is rejected

All timestamps are immutable and cannot be modified after creation.

### Conflict of Interest Prevention

A user SHALL NOT be able to approve or reject their own administrator request.

WHEN a super administrator attempts to process their own administrator request, THE system SHALL reject the operation and display an error message.

This rule applies regardless of the request status or the administrator's permissions.

## BanRecord Rules

A user can be banned only by an administrator with appropriate privileges, and the ban requires a recorded reason. Once banned, the user cannot log into the platform but their existing content remains accessible. Ban records must include the date and time the ban was issued and the reason for the ban. Administrators can unban users at any time, which records the unbanning timestamp and removes login restrictions. Banned users' content visibility is not affected by the ban status. Each ban record must reference exactly one user and cannot exist independently. Administrators can view the list of all banned users along with their ban reasons. A user cannot have multiple active ban records simultaneously.

### Administrator Ban Authority

THE system SHALL only allow administrators with appropriate privileges to create ban records.
WHEN an administrator attempts to ban a user, THE system SHALL verify they have the necessary permission level.
IF a non-administrator user attempts to create a ban record, THE system SHALL reject the request.
IF an administrator without proper authorization attempts to ban a user, THE system SHALL reject the request.

### Login Restriction

WHEN a banned user attempts to log in, THE system SHALL reject the authentication request.
THE system SHALL prevent banned users from establishing new sessions.
WHILE a user is banned, THE system SHALL NOT allow them to access authenticated areas of the platform.
IF an administrator unbans a user, THE system SHALL restore their login capability immediately.

### Content Preservation

WHEN a user is banned, THE system SHALL preserve all their existing articles.
WHEN a user is banned, THE system SHALL preserve all their existing comments.
THE system SHALL maintain the visibility of banned users' content for other users.
IF a banned user's article or comment is edited by another user, THE system SHALL allow the edit to proceed normally.

### Reason Requirement

WHEN an administrator creates a ban record, THE system SHALL require a reason to be provided.
IF a ban record is created without a reason, THE system SHALL reject the request.
THE system SHALL store the ban reason as part of the ban record.
WHEN an administrator views a banned user's record, THE system SHALL display the recorded ban reason.

### Timestamp Recording

WHEN a user is banned, THE system SHALL record the timestamp of the ban.
THE system SHALL store the exact date and time when the ban record was created.
WHEN an administrator unbans a user, THE system SHALL record the unban timestamp.
THE system SHALL maintain the chronological order of ban and unban events.

### Unban Functionality

WHEN an administrator unbans a user, THE system SHALL mark the ban record as resolved.
WHEN a user is unbanned, THE system SHALL remove all login restrictions on that user.
THE system SHALL allow administrators to view the unban timestamp for each ban record.
IF a user has been unbanned, THE system SHALL NOT consider previous ban records when evaluating current status.

### Visibility Maintenance

THE system SHALL maintain the visibility of banned users' content regardless of their ban status.
WHEN viewing articles or comments, THE system SHALL display content from banned users.
THE system SHALL NOT hide or filter content based solely on the author's ban status.
IF a banned user's content is searched, THE system SHALL include it in search results normally.

### User Association

WHEN a ban record is created, THE system SHALL associate it with exactly one user.
THE system SHALL prevent ban records from existing without a valid user association.
IF a user account is deleted, THE system SHALL maintain the ban record history for audit purposes.
WHEN viewing a user's profile, THE system SHALL display any active ban status.

### Single Active Ban

THE system SHALL prevent a user from having multiple active ban records simultaneously.
WHEN an administrator creates a new ban for a user who is already banned, THE system SHALL reject the request.
IF an administrator unbans a user, THE system SHALL mark the existing ban record as inactive before allowing a new ban.
THE system SHALL only allow one active ban per user at any given time.

## General Domain Constraints

All users must pass email verification before gaining full platform access, with unverified accounts subject to automatic removal after a period. Articles and comments maintain ownership links that persist even when authors are banned or deleted. Administrator privileges cascade to allow all regular user capabilities plus additional moderation tools. User banning is reversible and does not delete content, preserving historical discussion context. The platform supports two administrator grades with different promotion capabilities. Article and comment editing windows have no explicit time limits in the requirements. File uploads are tied exclusively to articles and cannot be shared across entities. Section naming must remain consistent once articles exist in that section to prevent disambiguation issues.

### Email Verification Prerequisite

WHEN a user registers, THE system SHALL require email verification before granting full platform access.
WHILE a user's account is unverified, THE system SHALL restrict the user from creating articles, comments, or file attachments.
THE system SHALL automatically remove unverified accounts after a period defined by platform policy (details in 05-non-functional.md).

## User Permissions and Access Control

Regular users can create, edit, and delete only their own content, with no administrative capabilities. Administrators can perform all user actions plus moderation functions like section management and user banning. Super administrators have all administrative privileges plus the ability to promote and demote other administrators. Users cannot view or edit content created by other users except through administrator-imposed overrides. Banned users retain read-only access to existing content but cannot log in or create new content. Permission checks occur at every content modification attempt, with violations resulting in access denial. Users can view all public content regardless of authorship unless banned. Content ownership is established at creation and cannot be transferred to another user.

### User Content Permissions

WHEN a member attempts to create an article, THE system SHALL:
1. Verify the user is authenticated
2. Require selection of one existing section
3. Require a title and content
4. Associate the article with the creating user

WHEN a member attempts to edit their own article, THE system SHALL:
1. Allow updates to title, content, and attachments
2. Allow updates to tags
3. Ensure the article belongs to the current user

WHEN a member attempts to delete their own article, THE system SHALL:
1. Verify the article belongs to the current user
2. Delete the article and its associated tags and attachments

WHEN a member attempts to edit or delete another user's article, THE system SHALL reject the request.

WHEN a member attempts to create a comment, THE system SHALL:
1. Require content for the comment
2. Ensure the comment is associated with a valid article
3. Associate the comment with the creating user

WHEN a member attempts to edit their own comment, THE system SHALL:
1. Allow updates to the comment content
2. Ensure the comment belongs to the current user

WHEN a member attempts to delete their own comment, THE system SHALL:
1. Verify the comment belongs to the current user
2. Delete the comment

WHEN a member attempts to edit or delete another user's comment, THE system SHALL reject the request.

### Administrator Privileges

WHEN an administrator creates a new section, THE system SHALL:
1. Require a unique section name
2. Require a section description
3. Record the creating administrator

WHEN an administrator edits an existing section, THE system SHALL:
1. Ensure the section exists
2. Allow updates to the section name and description

WHEN an administrator deletes a section, THE system SHALL:
1. Ensure the section has no articles
2. Delete the section and its metadata

WHEN an administrator deletes any article, THE system SHALL:
1. Allow deletion regardless of authorship
2. Cascade deletion to associated tags and attachments

WHEN an administrator deletes any comment, THE system SHALL:
1. Allow deletion regardless of authorship
2. Preserve the deleted comment record for audit purposes

WHEN an administrator bans a user, THE system SHALL:
1. Require a ban reason
2. Record the banning administrator
3. Set the user's status to banned
4. Preserve the user's existing articles and comments

WHEN an administrator unbans a user, THE system SHALL:
1. Require an unban reason
2. Remove the user's banned status
3. Restore the user's ability to log in

### Super Administrator Capabilities

WHEN a super administrator submits an administrator request, THE system SHALL:
1. Allow the request to be created
2. Associate the request with the super administrator user
3. Set the request status to pending

WHEN a super administrator views pending administrator requests, THE system SHALL:
1. Display all pending requests with their reasons
2. Filter requests by status
3. Include submitting user information

WHEN a super administrator approves an administrator request, THE system SHALL:
1. Update the request status to approved
2. Promote the requesting user to regular administrator
3. Record the approval timestamp

WHEN a super administrator rejects an administrator request, THE system SHALL:
1. Update the request status to rejected
2. Record the rejection timestamp and rejection reason
3. Not modify the requesting user's role

WHEN a super administrator promotes a regular administrator to super administrator, THE system SHALL:
1. Verify the target user is currently a regular administrator
2. Update the user's role to super administrator
3. Record the promoting administrator

WHEN a super administrator demotes another super administrator to regular administrator, THE system SHALL:
1. Verify the target user is currently a super administrator
2. Update the user's role to regular administrator
3. Record the promoting administrator

WHEN a super administrator attempts to demote themselves, THE system SHALL reject the request.

### Content Visibility

WHEN a guest or member views the list of sections, THE system SHALL:
1. Display all sections with their names and descriptions
2. Not require authentication

WHEN a guest or member views articles in a section, THE system SHALL:
1. Display paginated article list
2. Show article title, author, tags, comment count, and time posted
3. Not display full article content
4. Allow sorting by newest first or oldest first

WHEN a guest or member views a single article, THE system SHALL:
1. Display full article content
2. Show article title, author, content, attachments, tags, and time posted
3. Allow file and image downloads

WHEN a guest or member views a user's profile, THE system SHALL:
1. Display the display name and bio
2. Show a list of all articles the user has written
3. Show a list of all comments the user has written
4. Preserve content even if the user is banned

WHEN a banned user views content, THE system SHALL:
1. Allow viewing of all public content
2. Prevent login attempts
3. Prevent creation of new articles or comments

WHEN an administrator views banned users, THE system SHALL:
1. Display the list of banned users
2. Show the ban reason for each banned user
3. Allow unban functionality

### Ban Restrictions

WHEN a banned user attempts to log in, THE system SHALL reject the login attempt.

WHEN a banned user attempts to create an article, THE system SHALL reject the request.

WHEN a banned user attempts to create a comment, THE system SHALL reject the request.

WHEN a banned user attempts to edit their own article, THE system SHALL reject the request.

WHEN a banned user attempts to delete their own article, THE system SHALL reject the request.

WHEN a banned user attempts to edit their own comment, THE system SHALL reject the request.

WHEN a banned user attempts to delete their own comment, THE system SHALL reject the request.

WHEN an administrator views the list of banned users, THE system SHALL:
1. Include the user's display name and email
2. Include the ban reason
3. Include the ban timestamp
4. Include the unbanned status and unban timestamp where applicable

### Permission Enforcement

WHEN any user attempts to modify content, THE system SHALL:
1. Verify the user's role and permissions
2. Ensure the content belongs to the user unless the user is an administrator
3. Allow administrators to modify any content
4. Allow super administrators to modify any content

WHEN an unauthorized user attempts to perform a restricted action, THE system SHALL:
1. Reject the request
2. Return a clear error message indicating insufficient permissions

WHEN an administrator attempts to ban a user, THE system SHALL:
1. Require a ban reason to be provided
2. Prevent banning themselves

WHEN an administrator attempts to unban a user, THE system SHALL:
1. Require an unban reason to be provided
2. Only allow unbanning of currently banned users

WHEN a user attempts to view another user's profile, THE system SHALL:
1. Allow viewing of all publicly accessible profile information
2. Not require authentication for public profiles

WHEN a guest attempts to view protected content, THE system SHALL:
1. Redirect to the login page
2. Display an appropriate error message

### Content Ownership Transfer Restrictions

WHEN an article is created, THE system SHALL:
1. Permanently associate the article with the creating user
2. Prevent transfer of authorship to another user

WHEN a comment is created, THE system SHALL:
1. Permanently associate the comment with the creating user
2. Prevent transfer of authorship to another user

WHEN an administrator deletes a user's article, THE system SHALL:
1. Remove the article from public view
2. Preserve the article's content for audit purposes
3. Not transfer ownership to another user

WHEN an administrator deletes a user's comment, THE system SHALL:
1. Remove the comment from public view
2. Preserve the comment's content for audit purposes
3. Not transfer ownership to another user

WHEN a user attempts to change the author of their article, THE system SHALL reject the request.

WHEN a user attempts to change the author of their comment, THE system SHALL reject the request.

WHEN an administrator attempts to change the author of any article, THE system SHALL reject the request.

WHEN an administrator attempts to change the author of any comment, THE system SHALL reject the request.

## Content Lifecycle Rules

Articles exist in a single active state and can be deleted permanently without recovery option. Comments can be edited until the author account is deleted, after which edits are no longer possible. File attachments are automatically removed when their parent article is deleted. Tags persist in the system even after all articles using them are deleted, enabling tag discovery. Section deletion requires emptying the section first, preventing accidental data loss. Administrator requests remain in the system after approval or rejection for audit purposes. Ban records persist indefinitely even after unbanning for historical tracking. All timestamps are recorded in UTC format but displayed in the user's timezone context.

### Article Deletion Behavior

WHEN a user deletes their own article, THE system SHALL:
1. Mark the article as permanently deleted
2. Remove the article from all article lists and views
3. Automatically delete all file attachments associated with the article
4. Preserve the article record for audit purposes in a soft-deleted state

WHILE an article is in soft-deleted state, THE system SHALL:
1. Prevent access to the article by any user
2. Prevent creation of new comments on the article
3. Preserve all associated data including comments, tags, and attachments

THE system SHALL permanently remove the article record and all associated data (comments, tags, attachments) after 30 days from the deletion date.

When an administrator deletes an article, THE system SHALL:
1. Follow the same deletion process as user-initiated deletion
2. Record the administrator who performed the deletion
3. Record the deletion reason in the audit log

### Comment Editability Rules

WHEN a user attempts to edit their own comment, THE system SHALL:
1. Allow editing of comment content
2. Update the updatedAt timestamp
3. Validate that the comment still belongs to an existing article

IF the user's account has been deleted since the comment was created, THE system SHALL:
1. Prevent any further edits to the comment
2. Preserve the comment content in its last-edited state

WHEN a comment is viewed, THE system SHALL:
1. Display the author as "Deleted User" if the original author account no longer exists
2. Show the last edit timestamp when the comment has been modified
3. Preserve the original creation timestamp regardless of edits

### File Cleanup Logic

WHEN an article is deleted, THE system SHALL automatically:
1. Mark all associated file attachments as deleted
2. Remove file attachments from display in article views
3. Schedule the physical file removal after 30 days for audit compliance

WHEN a user uploads a file that fails to attach to an article due to an error, THE system SHALL:
1. Mark the file as orphaned
2. Schedule the orphaned file for deletion after 24 hours
3. Prevent orphaned files from being accessed by any user

WHEN an article is restored from the soft-deleted state, THE system SHALL:
1. Restore all file attachments that were not yet physically deleted
2. Restore file attachment visibility in the article view

### Tag Persistence Policy

THE system SHALL preserve tag records indefinitely, even after all articles associated with the tag have been deleted.

WHEN a user searches for tags, THE system SHALL:
1. Include tags that have no associated articles
2. Show usage statistics for tags that currently have articles
3. Display the count of articles using each tag

WHEN an article is permanently deleted, THE system SHALL:
1. Remove the association between the article and its tags
2. Preserve all tag records for future use
3. Not delete or archive tags that become unused

### Section Emptiness Requirement

WHEN an administrator attempts to delete a section that contains articles, THE system SHALL:
1. Reject the deletion request
2. Return a validation error indicating the section contains articles
3. List the count of articles in the section

WHEN a section has no articles, THE system SHALL:
1. Allow administrators to delete the section
2. Remove the section from all section lists
3. Preserve section metadata in an archive table for audit purposes

WHEN the last article in a section is deleted or moved, THE system SHALL automatically:
1. Mark the section as empty
2. Allow administrators to delete the section without further validation

### Administrator Request Archival

WHEN an administrator request is approved or rejected, THE system SHALL:
1. Update the request status to approved or rejected
2. Record the processing administrator and timestamp
3. Preserve the request record indefinitely for audit purposes

WHEN a super administrator views the list of administrator requests, THE system SHALL:
1. Show all pending requests first
2. Include the history of approved and rejected requests
3. Display the reason for rejection when applicable

WHEN a user submits a new administrator request, THE system SHALL:
1. Check if the user already has a pending request
2. Reject duplicate requests with a validation error
3. Allow only one pending request per user at a time

### Ban Record Retention Policy

THE system SHALL preserve ban records indefinitely, even after a user is unbanned.

WHEN a user is banned, THE system SHALL:
1. Record the ban reason provided by the administrator
2. Prevent the user from logging in
3. Preserve all existing articles and comments for public view
4. Not delete or hide the user's content

WHEN an administrator views the list of banned users, THE system SHALL:
1. Show all currently banned users
2. Show all past ban records with their unbanned status
3. Display the original ban reason and unban reason when available

WHEN a user is unbanned, THE system SHALL:
1. Record the unban reason and the administrator who performed the action
2. Allow the user to log in again
3. Preserve the ban record history for audit purposes

### Timestamp Management Rules

THE system SHALL record all timestamps in UTC format.

WHEN displaying timestamps to users, THE system SHALL:
1. Convert UTC timestamps to the user's local timezone (based on browser or account settings)
2. Show relative time for recent items (e.g., "2 hours ago")
3. Show full date and time for older items

WHEN content is created or updated, THE system SHALL:
1. Record the createdAt timestamp as immutable
2. Update the updatedAt timestamp on each modification
3. Preserve the original creation timestamp even after deletion

WHEN an administrator request is submitted, THE system SHALL:
1. Automatically set the submittedAt timestamp
2. Update the processedAt timestamp only when the request is approved or rejected

### Content Cleanup Schedule

WHEN content enters a delete state (article, comment, file attachment), THE system SHALL:
1. Mark it as soft-deleted rather than immediately removing it
2. Schedule it for permanent deletion after the retention period expires
3. Make it inaccessible to all users

The retention periods are as follows:
- Articles: 30 days after deletion
- File attachments: 30 days after article deletion
- Orphaned files: 24 hours after upload failure
- Comments: No cleanup schedule (preserved with articles or retained separately)

WHEN the retention period for any soft-deleted content expires, THE system SHALL:
1. Permanently delete the content and all related data
2. Remove references from all queries and lists
3. Log the cleanup action for audit purposes

## Search and Discovery Rules

Users can search articles by matching against both title and content fields. Search results are paginated and sorted according to user-selected criteria (newest or oldest first). Tags can be used to filter articles, with results limited to those containing all specified tags. Section browsing shows only articles assigned to that specific section. Users cannot search or filter by author name directly; only article-level metadata is searchable. Search results do not include full article content, only title and metadata for performance. Pagination ensures consistent result ordering within each page. Tag-based filtering supports multiple simultaneous tag selections with intersection logic.

### Title and Content Search

### Article Title and Content Search

WHEN a user searches for articles, THE system SHALL:
1. Match search terms against both title and content fields
2. Perform case-insensitive matching
3. Include partial matches within words
4. Return articles where any search term appears in title OR content

WHERE a user enters multiple search terms, THE system SHALL:
1. Treat each term independently
2. Return articles matching any of the search terms (OR logic between terms)

WHEN a user searches with empty query, THE system SHALL:
1. Return no results rather than all articles
2. Clear any previous search results

### Search Behavior

WHEN a user performs a search, THE system SHALL:
1. Return only published articles (not drafts)
2. Include articles from all sections unless section-filtered
3. Exclude articles the user has no permission to view

WHILE a search is in progress, THE system SHALL:
1. Prevent duplicate concurrent searches for the same query
2. Show loading state to the user

## Administrator Operations Rules

Administrators can create, edit, and delete sections with full authority over section naming and description. Administrators can delete any article regardless of authorship, with the deletion being immediate and permanent. Administrators can delete any comment across all articles, overriding user edit permissions. User banning requires specifying a reason and immediately prevents login while preserving existing content. Unbanning restores user login access but does not reinstate deleted content. Super administrators can promote regular administrators and demote any administrator including other super administrators. Super administrators cannot demote themselves to maintain system integrity. All administrative actions are logged with timestamp and operator identity for audit trails.

### Section Management Rules

Administrators have full authority over section naming and descriptions.

WHEN an administrator creates a section, THE system SHALL:
1. Require a unique name (1-100 characters)
2. Require a description
3. Reject the request if the name is already in use

WHEN an administrator edits a section, THE system SHALL:
1. Allow updates to the name and description
2. Enforce uniqueness of the section name
3. Preserve existing articles associated with the section

WHEN an administrator deletes a section, THE system SHALL:
1. Verify the section has no articles
2. Reject the deletion request if articles exist
3. Record the deletion with timestamp and operator identity

IF a non-administrator attempts to manage a section, THE system SHALL reject the request.

### Article Deletion Authority

Administrators can delete any article regardless of authorship.

WHEN an administrator deletes an article, THE system SHALL:
1. Immediately remove the article from public view
2. Preserve all associated comments, attachments, and tags for audit purposes
3. Record the deletion timestamp and operator identity
4. Not delete the author's user account or profile

WHILE an article exists, THE system SHALL:
1. Allow administrators to delete it even after the original author has deleted their account
2. Show the article was deleted by an administrator to other administrators

IF an administrator attempts to delete a non-existent article, THE system SHALL reject the request.

IF a non-administrator attempts to delete an article they do not own, THE system SHALL reject the request.

### Comment Deletion

Administrators can delete any comment across all articles, overriding user edit permissions.

WHEN an administrator deletes a comment, THE system SHALL:
1. Immediately remove the comment from public view
2. Preserve the comment content and authorship for audit purposes
3. Record the deletion timestamp and operator identity
4. Not affect the article the comment was attached to

WHILE a comment exists, THE system SHALL:
1. Allow administrators to delete it even after the original author has deleted their account
2. Show the comment was deleted by an administrator to other administrators

IF an administrator attempts to delete a non-existent comment, THE system SHALL reject the request.

IF a non-administrator attempts to delete a comment they do not own, THE system SHALL reject the request.

### User Banning with Reason

User banning requires specifying a reason and immediately prevents login while preserving existing content.

WHEN an administrator bans a user, THE system SHALL:
1. Require a ban reason (text field)
2. Immediately prevent the banned user from logging in
3. Preserve all existing articles and comments written by the banned user
4. Record the ban timestamp and operator identity
5. Store the ban reason in the BanRecord for future reference

WHILE a user is banned, THE system SHALL:
1. Reject any login attempts from the banned user
2. Continue to show the user's articles and comments as visible content
3. Record any attempted access by the banned user

IF an administrator attempts to ban a non-existent user, THE system SHALL reject the request.

IF an administrator attempts to ban themselves, THE system SHALL reject the request.

### Unban Functionality

Unbanning restores user login access but does not reinstate deleted content.

WHEN an administrator unbans a user, THE system SHALL:
1. Remove the ban restriction from the user's account
2. Restore the user's ability to log in to the platform
3. Preserve all articles and comments that existed before the ban
4. Record the unban timestamp and operator identity
5. Preserve the ban record for audit purposes

WHILE a user is not banned, THE system SHALL:
1. Allow normal login and platform access
2. Not automatically restore any content that was deleted during the ban period

IF an administrator attempts to unban a user who is not banned, THE system SHALL reject the request.

### Administrator Promotion

Super administrators can promote regular administrators and demote any administrator including other super administrators.

WHEN a super administrator promotes a regular administrator, THE system SHALL:
1. Change the user's role from "admin" to "super admin"
2. Record the promotion timestamp and operator identity
3. Preserve all existing administrator permissions and capabilities

WHILE a user is a regular administrator, THE system SHALL:
1. Allow them to perform all administrator operations
2. Prevent them from promoting other users to administrator roles
3. Prevent them from demoting other administrators

IF a super administrator attempts to promote a non-existent user, THE system SHALL reject the request.

IF a regular administrator attempts to promote another user, THE system SHALL reject the request.

### Super Administrator Demotion

Super administrators can demote other super administrators to regular administrator.

WHEN a super administrator demotes another super administrator, THE system SHALL:
1. Change the target user's role from "super admin" to "admin"
2. Record the demotion timestamp and operator identity
3. Preserve all existing administrator permissions and capabilities

WHILE a user is a regular administrator, THE system SHALL:
1. Allow them to perform all administrator operations
2. Prevent them from performing super administrator operations
3. Prevent them from managing other administrator roles

IF a super administrator attempts to demote a non-existent user, THE system SHALL reject the request.

IF a regular administrator attempts to demote another user, THE system SHALL reject the request.

### Self-Demotion Restriction

Super administrators cannot demote themselves to maintain system integrity.

WHEN a super administrator attempts to demote themselves, THE system SHALL:
1. Reject the demotion request
2. Return an error indicating self-demotion is not allowed
3. Preserve the user's current role and permissions

WHILE a user is a super administrator, THE system SHALL:
1. Prevent any self-demotion operation from succeeding
2. Maintain the user's super administrator privileges

IF a super administrator attempts to edit their own role to a lower grade, THE system SHALL reject the request.

IF the system has only one super administrator and they attempt to demote themselves, THE system SHALL reject the request and require at least one super administrator.

### Audit Logging

All administrative actions are logged with timestamp and operator identity for audit trails.

THE system SHALL log the following administrative actions with timestamp and operator identity:
1. Section creation, modification, and deletion
2. Article deletion by administrator
3. Comment deletion by administrator
4. User banning and unbanning
5. Administrator role promotion and demotion
6. Administrator request approval and rejection

WHEN an administrator views an audit trail, THE system SHALL:
1. Display the action taken, timestamp, operator identity, and affected entities
2. Preserve audit logs even if affected users or content are deleted
3. Allow filtering of audit logs by date range and operator

THE system SHALL:
1. Store audit logs for a minimum of 7 years
2. Prevent deletion or modification of audit logs by any user
3. Make audit logs available to super administrators only

IF a user attempts to access audit logs without super administrator privileges, THE system SHALL reject the request.

### Operational Integrity

Administrative operations must maintain system integrity and prevent invalid state transitions.

WHEN an administrator attempts an operation that violates system integrity, THE system SHALL:
1. Reject the operation
2. Preserve existing data in its current state
3. Record the failed operation in audit logs

THE system SHALL enforce the following operational constraints:
1. Section deletion only when no articles are associated with the section
2. No user can be banned and unbanned simultaneously
3. No user can have multiple active administrator requests
4. Super administrator count must never be zero
5. Administrator cannot demote themselves or demote the last super administrator

WHEN an administrator operation fails due to integrity constraints, THE system SHALL:
1. Provide a clear error message explaining the constraint violation
2. Preserve all existing data and permissions
3. Record the failure for audit purposes

IF a bulk administrative operation (e.g., mass banning) fails partway through, THE system SHALL:
1. Roll back all changes made during the operation
2. Preserve existing data in its pre-operation state
3. Record the partial failure in audit logs

## Profile and User Experience Rules

User profiles display all articles and comments created by that user, providing a complete content history. Display names are shown alongside all content and cannot be changed to match another active user's name. Bio fields support free-form text with no explicit length limit beyond practical considerations. Users can view any other user's profile but cannot access administrative information about other users. Profile pages are static representations showing content at a point in time. Profile visibility is consistent regardless of user relationship or permission level. When a user is banned, their profile remains accessible but login access is blocked. Profile content cannot be modified after the account is deleted.

### Profile Content Display

### Profile Content Display

WHEN a user views another user's profile, THE system SHALL display:
1. The displayed name of the profile owner
2. The bio text of the profile owner
3. A list of all articles written by the profile owner
4. A list of all comments written by the profile owner

THE system SHALL include the title of each article, the author name, the section it belongs to, the number of comments, and the time posted.

WHILE viewing a profile, THE system SHALL NOT display administrative information about the profile owner such as email address, password status, or administrative privileges.

### Display Name Consistency

### Display Name Consistency

THE system SHALL ensure that each active user's display name is unique across all profiles.

WHEN a user attempts to change their display name, THE system SHALL reject the change if the new display name is already in use by another active user.

THE system SHALL allow a previously used display name to be reused only after the user who held it has been banned or deleted.

IF a user's display name is changed, THE system SHALL update all existing articles and comments to reflect the new display name.

### Bio Presentation

### Bio Presentation

WHEN a user's profile is displayed, THE system SHALL show the bio text exactly as entered by the user without truncation or modification.

THE system SHALL preserve line breaks and formatting in the bio text for display purposes.

WHEN displaying a bio, THE system SHALL NOT apply any character limits or filtering beyond what is necessary for security (e.g., XSS prevention).

### User Profile Visibility

### User Profile Visibility

WHEN any user (including guests) requests to view a profile, THE system SHALL provide access to the profile page.

THE system SHALL NOT restrict profile visibility based on user relationship, permission level, or account status of the viewer.

WHILE viewing a profile, THE system SHALL display content consistently regardless of the viewer's role or permissions.

### Profile Static Representation

### Profile Static Representation

WHEN a profile page is accessed, THE system SHALL display content as it existed at that moment in time.

THE system SHALL NOT automatically refresh or update profile content after initial display without a new page request.

WHEN content is edited or deleted after a profile page is viewed, THE system SHALL NOT retroactively alter the displayed content of previously viewed profile pages.

### Banned Profile Access

### Banned Profile Access

WHEN a banned user's profile is accessed by any user, THE system SHALL display the profile page with all original content intact.

THE system SHALL include a visual indicator that the profile owner is banned.

WHEN attempting to log in, THE system SHALL reject the login request if the user account has an active ban record.

WHILE a user is banned, THE system SHALL maintain the visibility of all their articles and comments.

### Profile Permanence

### Profile Permanence

WHEN a user account is deleted, THE system SHALL preserve the profile content including all articles and comments.

THE system SHALL retain the display name and bio in archived form for historical reference.

WHEN a user is banned, THE system SHALL preserve the profile content permanently as part of the system's content history.

THE system SHALL NOT delete profile content when a user account is banned.

### Content History Display

### Content History Display

WHEN a user views another user's profile, THE system SHALL display a complete history of all articles written by that user.

THE system SHALL include all comments the user has posted on any article.

WHEN displaying content history, THE system SHALL show items sorted chronologically with the oldest content appearing first.

THE system SHALL maintain content history integrity even when individual articles or comments are edited or deleted.

## Error Handling and Validation Rules

Duplicate email registration attempts are rejected with a clear message to the user. Invalid section references during article creation result in validation errors. Empty or whitespace-only content in required fields triggers immediate validation failure. Attempting to comment on deleted articles returns a visible error to the user. File uploads that fail server validation are rejected without partial creation. Tag creation duplicates within an article are prevented automatically. Attempting to ban an already banned user adds a new ban record rather than modifying existing ones. Administrator promotion of inactive accounts is blocked with appropriate feedback. All error responses include human-readable messages explaining the issue and resolution path.

### Duplicate Email Handling

WHEN a user attempts to register with an email address that already exists in the system, THE system SHALL reject the registration request.

WHEN the system detects a duplicate email during registration, THE system SHALL provide a clear error message indicating that the email is already in use.

WHEN a user attempts to change their email address to one that already exists in the system, THE system SHALL reject the email change request.

WHEN the system detects a duplicate email during profile update, THE system SHALL provide a clear error message indicating that the email is already in use by another account.

WHERE email verification is required, THE system SHALL consider unverified emails as available for registration until the verification period expires.

### Section Validation

WHEN a user attempts to create an article in a section that does not exist, THE system SHALL reject the article creation request.

WHEN the system detects a reference to a non-existent section during article creation, THE system SHALL provide a clear error message indicating that the selected section is invalid.

WHERE administrators create or edit sections, THE system SHALL require that the section name is unique across all sections.

WHERE administrators create or edit sections, THE system SHALL require that the section name is not empty and contains only valid characters.

WHEN a user attempts to browse a section that has been deleted, THE system SHALL redirect the user to the main section list with an appropriate message.

### Content Validation

WHEN a user creates an article without a title, THE system SHALL reject the request.

WHEN a user creates an article with a title that is empty or contains only whitespace, THE system SHALL reject the request.

WHEN a user creates an article without content, THE system SHALL reject the request.

WHEN a user creates an article with content that is empty or contains only whitespace, THE system SHALL reject the request.

WHEN a user attempts to post a comment without content, THE system SHALL reject the comment creation request.

WHEN a user attempts to post a comment with content that is empty or contains only whitespace, THE system SHALL reject the comment creation request.

WHERE users edit their display name, THE system SHALL reject requests where the display name is empty or contains only whitespace.

### Deleted Article Commenting

WHEN a user attempts to comment on an article that has been deleted, THE system SHALL reject the comment creation request.

WHEN the system detects that an article has been deleted, THE system SHALL prevent any new comments from being added to that article.

WHERE a user views an article page, THE system SHALL indicate if the article has been deleted and is no longer accepting comments.

WHERE a user attempts to edit their comment on a deleted article, THE system SHALL reject the edit request.

WHERE a user attempts to delete their comment on a deleted article, THE system SHALL allow the deletion to proceed.

### File Upload Errors

WHEN a user attempts to attach a file to an article and the file upload fails server validation, THE system SHALL reject the attachment without creating any partial records.

WHERE file validation fails due to file type restrictions, THE system SHALL provide a clear error message indicating the acceptable file types.

WHERE file validation fails due to size limitations, THE system SHALL provide a clear error message indicating the maximum allowed file size.

WHEN multiple files are uploaded and one or more fail validation, THE system SHALL reject the entire attachment request without partial processing.

WHERE a user attempts to download a file that has been removed or is inaccessible, THE system SHALL provide a clear error message indicating the file is no longer available.

### Tag Duplication Prevention

WHEN a user attempts to add a tag to an article that is already assigned to that article, THE system SHALL reject the duplicate tag assignment.

WHERE tags are assigned to articles, THE system SHALL ensure that each tag can only be assigned once per article.

WHERE a user edits an article and re-adds existing tags, THE system SHALL ignore duplicate tag assignments without creating new records.

WHERE the system detects duplicate tag assignments during article creation or editing, THE system SHALL provide a clear error message indicating that the tag is already assigned.

### Repeated Ban Handling

WHEN an administrator attempts to ban a user who is already banned, THE system SHALL create a new ban record rather than modifying the existing one.

WHERE a new ban record is created for an already banned user, THE system SHALL record the new ban reason and timestamp separately from the original ban.

WHERE a user has multiple ban records, THE system SHALL treat the user as banned if any active ban record exists.

WHERE an administrator unbans a user, THE system SHALL record the unban action as a new record while preserving the history of previous bans.

### Inactive Promotion Prevention

WHEN a super administrator attempts to promote a user to administrator who has not verified their email address, THE system SHALL reject the promotion request.

WHERE a user's account has been banned, THE system SHALL prevent any administrator promotion actions for that user.

WHERE a user has not logged in for an extended period (as defined by business policy), THE system SHALL require additional verification before promoting to administrator.

WHEN an administrator promotion is rejected due to account status, THE system SHALL provide a clear error message explaining the reason for rejection.

### User-Friendly Error Messages

WHEN any validation error occurs during user actions, THE system SHALL provide a human-readable error message explaining the issue and how to resolve it.

WHERE an error message is displayed, THE system SHALL avoid technical error codes and use plain language understandable to end users.

WHEN a user attempts an action not permitted by their role, THE system SHALL provide a clear error message explaining the required permissions.

WHERE an error occurs due to missing information, THE system SHALL indicate specifically what information is missing or invalid.

WHERE an error occurs due to business rule violations (e.g., duplicate email, deleted article), THE system SHALL explain the rule that was violated and provide possible resolution steps.

## Data Consistency Rules

All articles must reference a valid section that exists at creation time. Comments cannot be created for articles that have been deleted. File attachments must reference valid articles and cannot be orphaned. Tag associations are maintained through ArticleTag records ensuring referential integrity. Administrator requests maintain status consistency with the granted permissions. Ban records track user status changes without creating inconsistencies in user records. Content ownership references remain valid even when authors are banned or deleted. Section naming consistency is enforced across all user interfaces and API responses. Timestamps are stored in UTC and converted to user timezone for display only.

### Referential Integrity

WHEN a user creates an article, THE system SHALL ensure the referenced section exists in the system.

WHEN a user creates a comment, THE system SHALL verify the associated article exists and has not been deleted.

WHEN a file attachment is created, THE system SHALL verify the associated article exists.

WHEN an administrator request is processed, THE system SHALL verify the requesting administrator has appropriate permissions.

WHEN a user is banned, THE system SHALL preserve the user's account record with updated status rather than deleting it.

WHEN a section is deleted, THE system SHALL prevent deletion if articles still reference it.

WHEN an article is deleted, THE system SHALL automatically remove all associated file attachments and comment references.

WHEN a tag is deleted, THE system SHALL automatically remove all associated ArticleTag relationship records.

THE system SHALL prevent the creation of orphaned records by validating foreign key references before data persistence.

THE system SHALL prevent invalid state transitions by ensuring all referential integrity constraints are satisfied before completing operations.

### Section Validation

WHEN a section is created, THE system SHALL require a unique name not exceeding 100 characters.

WHEN a section is created, THE system SHALL require a description field.

WHEN a section is updated, THE system SHALL verify the new name does not conflict with existing sections.

WHEN a section is used for an article, THE system SHALL verify the section exists and is active.

WHEN an administrator attempts to create a section with a duplicate name, THE system SHALL reject the request.

WHEN a section name is modified, THE system SHALL update all references to maintain consistency across the system.

THE system SHALL enforce case-insensitive uniqueness for section names to prevent duplicates.

THE system SHALL prevent deletion of a section that contains active articles.

### Content Availability Check

WHEN a user attempts to view an article, THE system SHALL verify the article exists and has not been deleted.

WHEN a user attempts to view comments for an article, THE system SHALL verify the article exists before returning comment data.

WHEN a user attempts to comment on an article, THE system SHALL verify the article exists and has not been deleted.

WHEN a user attempts to edit their article, THE system SHALL verify the article still exists and belongs to them.

WHEN a user attempts to delete their article, THE system SHALL verify the article exists and belongs to them.

WHEN an administrator attempts to delete an article, THE system SHALL verify the article exists before performing deletion.

THE system SHALL return appropriate error responses when content availability checks fail.

THE system SHALL preserve visibility of articles and comments even when the associated user account is banned.

### File Orphan Prevention

WHEN an article is created with file attachments, THE system SHALL ensure all file references are properly associated with the article.

WHEN an article is updated and file attachments are modified, THE system SHALL remove any orphaned file references not associated with the updated article.

WHEN an article is deleted, THE system SHALL automatically remove all associated file attachment records.

WHEN a file attachment is added to an article, THE system SHALL verify the article exists before storing the attachment.

WHEN a user downloads a file attachment, THE system SHALL verify the attachment is still associated with an existing article.

THE system SHALL prevent creation of file attachments without valid article references.

THE system SHALL maintain file metadata (fileName, fileUrl, fileSize, fileType) for all active attachments.

THE system SHALL preserve file attachments when articles are moved between sections rather than deleting them.

### Tag Association Integrity

WHEN an article is tagged, THE system SHALL create an ArticleTag record linking the article and tag.

WHEN an article is updated and tags are modified, THE system SHALL update the ArticleTag records accordingly.

WHEN an article is deleted, THE system SHALL automatically remove all associated ArticleTag records.

WHEN a tag is deleted, THE system SHALL automatically remove all associated ArticleTag records.

WHEN a tag name is updated, THE system SHALL update all ArticleTag records that reference this tag.

WHEN a user searches by tags, THE system SHALL return articles through the ArticleTag relationship records.

THE system SHALL ensure each ArticleTag record contains an assignment timestamp.

THE system SHALL prevent creation of ArticleTag records without valid article and tag references.

### Request Permission Sync

WHEN a user submits an administrator request, THE system SHALL set the request status to pending.

WHEN a super administrator approves an administrator request, THE system SHALL update the user's role to administrator and set the request status to approved.

WHEN a super administrator rejects an administrator request, THE system SHALL set the request status to rejected with a rejection reason.

WHEN an administrator request is processed, THE system SHALL record the processing timestamp and the processing administrator.

WHEN a user already has a pending administrator request, THE system SHALL prevent creation of a new request until the existing one is resolved.

WHEN a user becomes an administrator through request approval, THE system SHALL grant appropriate administrative capabilities.

WHEN a user's administrator role is revoked, THE system SHALL update their role to member and create a new administrator request if they reapply.

THE system SHALL maintain consistency between user roles and administrator request statuses.

### Ban Status Consistency

WHEN a user is banned, THE system SHALL update their role to banned and record the ban reason.

WHEN a banned user attempts to log in, THE system SHALL prevent authentication and return appropriate error.

WHEN a user is unbanned, THE system SHALL restore their member role and record the unban timestamp and reason.

WHEN a user is banned, THE system SHALL preserve all existing articles and comments created by that user.

WHEN a banned user's content is viewed, THE system SHALL display the content normally with the original author information.

WHEN an administrator views the list of banned users, THE system SHALL show the ban reason for each user.

THE system SHALL allow administrators to update ban reasons for existing ban records.

THE system SHALL maintain a complete audit trail of ban/unban actions with timestamps and responsible administrators.

### Ownership Persistence

WHEN a user is banned, THE system SHALL preserve all articles and comments created by that user.

WHEN an article is deleted, THE system SHALL preserve the historical record of the author at the time of deletion.

WHEN a comment is deleted, THE system SHALL preserve the historical record of the author at the time of deletion.

WHEN a user's display name is changed, THE system SHALL maintain previous authorship attribution for existing content.

WHEN a user account is deleted, THE system SHALL anonymize or remove user references in existing content according to business policy.

THE system SHALL ensure author information remains consistent even when user accounts change status (banned/deleted).

THE system SHALL maintain content ownership relationships for reporting and administrative purposes regardless of user status changes.

### Timezone Conversion

WHEN timestamps are stored in the database, THE system SHALL convert all dates to UTC.

WHEN timestamps are displayed to users, THE system SHALL convert from UTC to the user's local timezone (Asia/Seoul by default).

WHEN an article is created, THE system SHALL record createdAt timestamp in UTC.

WHEN content is edited, THE system SHALL update the updatedAt timestamp in UTC.

WHEN ban records are created, THE system SHALL record bannedAt timestamp in UTC.

WHEN administrator requests are submitted, THE system SHALL record submittedAt timestamp in UTC.

WHEN displaying time information to users, THE system SHALL show converted local time while preserving UTC for internal operations.

THE system SHALL ensure all timestamp conversions maintain accuracy during daylight saving time transitions.

## Content Display and Presentation Rules

Article lists show only title, author, tags, comment count, and post time—not full content. Comment threads show author, content, and post time in chronological order with oldest first. File downloads use original filenames preserved from upload. Profile pages display all user content in reverse chronological order by creation time. Search results display article metadata with pagination controls visible. Tags on articles are displayed as clickable links for filtering. Section names appear alongside articles to indicate context. Deleted articles remain referenced by their original metadata unless fully purged. Banned user content maintains original author attribution with ban status indicated.

### Article List Display

### Article List Display

WHEN a user views the article list in a section, THE system SHALL:
1. Show only article metadata (title, author, tags, comment count, time posted)
2. Hide the full article content in the list view
3. Display articles in the order specified by the user's sort preference
4. Show pagination controls when there are more articles than the page size
5. Limit each page to 10 articles

WHERE an article is published, THE system SHALL display:
- The article title as a clickable link to the full article
- The author's display name (not their email)
- Tags as comma-separated labels
- The number of comments on the article
- The original posting time in the user's timezone

IF no articles exist in a section, THE system SHALL display a message indicating no articles are available.

WHILE a user sorts articles, THE system SHALL:
- Allow sorting by "newest first" (default)
- Allow sorting by "oldest first"
- Maintain the sort order across page navigation

### Comment Thread Ordering

### Comment Thread Ordering

WHEN a user views comments on an article, THE system SHALL:
1. Display comments in chronological order with oldest first
2. Show each comment's author, content, and posting time
3. Display comments in a single flat thread (no nesting)
4. Show a maximum of 20 comments per page
5. Show pagination controls when there are more comments than the page size

WHERE a comment is displayed, THE system SHALL include:
- The author's display name (not their email)
- The comment content as plain text
- The original posting time in the user's timezone
- Edit and delete controls only for comments authored by the current user

IF a comment has been edited, THE system SHALL display an "edited" indicator next to the posting time.

WHILE a user views an article, THE system SHALL:
- Show all comments on that article regardless of the article's status (draft, published, deleted)
- Update the comment count in real-time when comments are added or removed

### File Download Handling

### File Download Handling

WHEN a user downloads an attached file from an article, THE system SHALL:
1. Preserve the original filename as stored in the file metadata
2. Provide a direct download link for the file
3. Record the download event for audit purposes
4. Allow users to download all attached files from an article

WHERE a file attachment is displayed, THE system SHALL:
- Show the original filename (not the internal storage path)
- Display the file size in human-readable format (e.g., KB, MB)
- Show the file type indicator based on the file extension or MIME type
- Enable download for all attached files regardless of the user's role

WHEN an article with attachments is viewed, THE system SHALL:
- Show all attached files in a separate section below the article content
- Allow users to download each file individually
- Display the total number of attached files

IF a file attachment is deleted, THE system SHALL:
- Remove the attachment from the article view
- Return an error when attempting to download the deleted file
- Maintain the file record in storage for potential recovery

### Profile Content Display

### Profile Content Display

WHEN a user views another user's profile, THE system SHALL:
1. Display the profile owner's display name and bio text
2. List all articles written by the profile owner in reverse chronological order (newest first)
3. List all comments written by the profile owner in reverse chronological order (newest first)
4. Show a pagination control for both articles and comments when there are more than 10 items
5. Display the article/comment count for each listing

WHERE an article is listed on a profile page, THE system SHALL show:
- The article title as a clickable link to the full article
- The section name where the article was posted
- The posting time in the viewer's timezone
- The comment count for that article
- The tags associated with the article

WHERE a comment is listed on a profile page, THE system SHALL show:
- A snippet of the comment content (up to 100 characters)
- The title of the article the comment was posted on
- The posting time in the viewer's timezone

WHILE a user views their own profile, THE system SHALL:
- Allow them to edit their display name and bio
- Display their account status (active, banned, etc.)
- Show a profile completion indicator based on filled fields

### Search Result Formatting

### Search Result Formatting

WHEN a user searches articles, THE system SHALL:
1. Display search results with pagination controls visible
2. Show each article's title, author, section name, tags, and comment count
3. Highlight matching search terms in the title and content snippet
4. Limit each page to 10 search results
5. Show a message when no matching articles are found

WHERE an article appears in search results, THE system SHALL:
- Display the title with highlighted search terms
- Show the author's display name
- Show the section name where the article was posted
- Show tags as comma-separated labels
- Show the number of comments on the article
- Show a content snippet containing the search term context

WHEN a user filters search results by tags, THE system SHALL:
- Show only articles that have the specified tag(s)
- Combine tag filtering with full-text search when both are applied
- Maintain pagination across filtered results

IF a user searches without entering terms, THE system SHALL:
- Return all articles (not just search results)
- Sort by default (newest first) unless otherwise specified
- Display the standard article list format

### Tag Linking

### Tag Linking

WHERE tags appear on articles, THE system SHALL:
1. Display tags as clickable links for filtering
2. Link each tag to a filtered view of articles with that tag
3. Show tags as comma-separated labels on article lists
4. Preserve the original case of tags as entered by the user

WHEN a user clicks on a tag link, THE system SHALL:
1. Navigate to a dedicated tag page showing all articles with that tag
2. Display the tag name as the page title
3. Show articles filtered by that tag in reverse chronological order
4. Provide a way to return to the previous view

WHERE tags appear on search results, THE system SHALL:
- Show tags as clickable links that add the tag as a filter condition
- Allow users to combine tag filtering with other search criteria
- Maintain existing search terms when navigating tag-filtered results

WHILE a user views an article, THE system SHALL:
- Show all associated tags as clickable links
- Allow users to click any tag to see related articles
- Display the count of articles associated with each tag in parentheses

### Section Context Display

### Section Context Display

WHERE an article appears in any listing, THE system SHALL:
1. Display the section name alongside the article metadata
2. Link the section name to the section's main page
3. Show the section description on the section's main page
4. Display section names consistently across all views

WHEN a user views articles within a section, THE system SHALL:
- Show the section name as the page header
- Display the section description below the header
- List all articles belonging to that section
- Show articles in the section in the selected sort order

WHERE an article's section context is displayed, THE system SHALL:
- Show the section name as a clickable link to the section page
- Display the section name before or alongside the article title
- Maintain section context in search results and tag-filtered views

WHILE navigating between sections, THE system SHALL:
- Preserve the user's sort preference across section views
- Show section navigation links in a consistent location
- Display the current section in the page title

IF a section is deleted, THE system SHALL:
- Show a message that the section no longer exists
- Redirect users to a default section or home page
- Maintain articles in their original section until moved

### Deleted Article Metadata

### Deleted Article Metadata

WHEN a user views a deleted article, THE system SHALL:
1. Show the original article title with a "Deleted" indicator
2. Display the author's display name with a "Deleted" indicator
3. Show the original posting time
4. Show all tags associated with the deleted article
5. Show a message that the article content is no longer available

WHERE comments exist on a deleted article, THE system SHALL:
1. Preserve the comment thread on the deleted article page
2. Display comments in chronological order with oldest first
3. Show each comment with its author and content
4. Allow administrators to delete the comment thread
5. Maintain comment author attribution

WHEN an article is restored from deletion, THE system SHALL:
1. Restore the article with all original metadata
2. Restore the article's comment thread
3. Restore the article's attachment list
4. Restore the article's tag associations
5. Set the article status to published

IF a user attempts to comment on a deleted article, THE system SHALL:
1. Prevent new comments from being added
2. Show an error message explaining that comments are disabled
3. Allow administrators to enable commenting if desired
4. Maintain the existing comment thread visibility

### Banned Content Attribution

### Banned Content Attribution

WHERE a banned user's content appears, THE system SHALL:
1. Display the author's display name with a "[Banned]" indicator
2. Show the content as originally posted (articles remain visible)
3. Show the comment content with the "[Banned]" indicator
4. Prevent the banned user from editing or deleting their content
5. Show the ban reason to administrators viewing the content

WHEN a banned user's article is viewed, THE system SHALL:
1. Show the article title with "[Banned]" indicator
2. Display the article content as originally posted
3. Show the section context with "[Banned]" indicator
4. Allow administrators to delete the article
5. Maintain comment thread visibility and attribution

WHERE a banned user's comment appears, THE system SHALL:
1. Show the comment content with "[Banned]" indicator
2. Display the comment author as "[Banned User]"
3. Prevent the banned user from editing or deleting the comment
4. Allow administrators to delete the comment
5. Maintain the comment's original posting time

WHILE a user views a profile of a banned user, THE system SHALL:
1. Show a "[Banned]" indicator on the profile header
2. Display the ban reason to administrators
3. Show all existing articles and comments with "[Banned]" indicators
4. Prevent the banned user from logging in
5. Maintain the profile page structure for content preservation

## Time and Date Rules

All timestamps are recorded in UTC format for consistency across timezones. Content display converts timestamps to the user's local timezone for readability. Article and comment creation times are immutable and cannot be modified after initial posting. Editing timestamps track the most recent modification but do not change the original creation time. Ban records record both ban initiation and unbanning times for duration tracking. File attachment timestamps reflect upload time rather than article creation time. Administrator request timestamps capture submission time with status change timestamps. Time-based filtering in search uses consistent timezone conversion for all users.

### UTC Timestamping Requirements

WHEN any system event occurs, THE system SHALL record the timestamp in UTC format for consistency across timezones.

THE system SHALL store all creation timestamps (article, comment, ban record) in UTC format.

THE system SHALL store all modification timestamps (editing timestamps) in UTC format.

THE system SHALL store all file upload timestamps in UTC format.

THE system SHALL store all administrator request submission timestamps in UTC format.

THE system SHALL store all ban record timestamps (ban initiation, unbanning) in UTC format.

WHERE a timestamp is created automatically, THE system SHALL use the current UTC time at the moment of the event.

### Timezone Conversion Rules

WHEN displaying timestamps to users, THE system SHALL convert UTC timestamps to the user's local timezone.

THE system SHALL convert article creation time, comment posting time, and file upload time to the viewing user's local timezone for display.

WHERE a user views another user's profile, THE system SHALL convert all timestamps to the viewer's local timezone.

THE system SHALL preserve the original UTC timestamps internally while only converting for display purposes.

WHERE a user views a banned user's profile, THE system SHALL still convert ban timestamps to the viewer's local timezone.

WHERE a user views administrator request status, THE system SHALL convert submission and processing timestamps to the viewer's local timezone.

### Immutable Creation Time Constraints

WHEN an article is created, THE system SHALL record the creation timestamp and prevent any future modification to this timestamp.

WHEN a comment is created, THE system SHALL record the creation timestamp and prevent any future modification to this timestamp.

WHEN a ban record is created, THE system SHALL record the banning timestamp and prevent any future modification to this timestamp.

WHEN an administrator request is submitted, THE system SHALL record the submission timestamp and prevent any future modification to this timestamp.

WHEN a file is attached to an article, THE system SHALL record the upload timestamp and prevent any future modification to this timestamp.

THE system SHALL reject any attempt by users or administrators to modify creation timestamps.

WHERE a user attempts to edit an article, THE system SHALL retain the original creation timestamp unchanged.

### Editing Timestamp Tracking Rules

WHEN an article is edited, THE system SHALL update the editing timestamp to the current UTC time.

WHEN a comment is edited, THE system SHALL update the editing timestamp to the current UTC time.

THE system SHALL maintain separate tracking for creation timestamps and editing timestamps.

WHERE an article is edited multiple times, THE system SHALL update the editing timestamp to reflect the most recent modification.

WHERE an article is viewed, THE system SHALL display both the original creation time and the last modification time.

WHERE a comment is viewed, THE system SHALL display both the original posting time and the last modification time.

### Ban Duration Time Tracking

WHEN a user is banned, THE system SHALL record the ban initiation timestamp in UTC format.

WHEN a user is unbanned, THE system SHALL record the unbanning timestamp in UTC format.

THE system SHALL calculate ban duration by measuring the difference between ban initiation and unbanning timestamps.

WHERE a banned user's profile is viewed by an administrator, THE system SHALL display the ban duration and remaining time (if applicable).

WHERE a user is banned indefinitely, THE system SHALL record the ban initiation timestamp but leave the unbanning timestamp as null.

THE system SHALL preserve ban timestamps even after content deletion by the banned user.

### File Upload Time Recording

WHEN a user uploads a file attachment to an article, THE system SHALL record the upload timestamp in UTC format.

THE system SHALL record file upload timestamps independently of article creation timestamps.

WHERE multiple files are attached to a single article, THE system SHALL record separate upload timestamps for each file.

WHERE a file is viewed or downloaded, THE system SHALL display the file upload time converted to the user's local timezone.

THE system SHALL retain file upload timestamps even if the associated article is deleted.

### Administrator Request Timestamp Management

WHEN a user submits an administrator request, THE system SHALL record the submission timestamp in UTC format.

WHEN a super administrator processes an administrator request (approve or reject), THE system SHALL record the processing timestamp in UTC format.

THE system SHALL maintain separate tracking for submission timestamps and processing timestamps.

WHERE a user views administrator request status, THE system SHALL display both submission and processing times converted to the user's local timezone.

WHERE an administrator views pending requests, THE system SHALL sort requests by submission timestamp in UTC format for consistency.

### Timezone Consistency Requirements

WHEN filtering or sorting articles by time, THE system SHALL use UTC timestamps consistently across all users regardless of their local timezones.

WHERE a user searches articles by date range, THE system SHALL convert the user's input time range to UTC for database queries.

THE system SHALL maintain timezone consistency in all background operations, never mixing UTC and local time in calculations.

WHERE a user views time-based statistics (most recent articles, activity timelines), THE system SHALL ensure all time comparisons use UTC timestamps.

WHERE multiple users view the same article list sorted by time, THE system SHALL produce identical sorting order regardless of viewers' timezones.

## Access Pattern Rules

Users can create articles without limit but must complete email verification before publishing. Comment creation is unrestricted but requires a valid article reference. File attachment limits are determined by server capacity rather than explicit user rules. Tag creation allows unlimited tags per article but enforces uniqueness within each article. Section browsing supports unlimited scrolling through paginated results. Search queries are not rate-limited in the requirements but return consistent pagination. Administrator request submission allows one pending request per user at a time. User login attempts are not explicitly rate-limited but may be subject to system security measures.

### Article Creation Constraints

WHEN a user creates an article, THE system SHALL:
1. Allow creation without a fixed daily or monthly limit
2. Require the user to have completed email verification
3. Require a title (1-500 characters)
4. Require content text
5. Require selection of one existing section

WHILE email verification is incomplete, THE system SHALL reject article creation attempts with an appropriate error message.

THE system SHALL automatically associate the creating user as the article author.

WHERE multiple attachments are needed, THE system SHALL allow simultaneous file and image uploads (up to server capacity).

### Comment Creation Validation

WHEN a user creates a comment, THE system SHALL:
1. Require a valid article reference
2. Require comment content text
3. Validate the article exists and is not deleted
4. Assign a creation timestamp in UTC

IF the referenced article does not exist, THE system SHALL reject the comment creation.

WHILE the referenced article is deleted, THE system SHALL reject new comment submissions.

THE system SHALL record the creating user as the comment author.

WHERE a user attempts to create multiple comments, THE system SHALL allow unlimited comment creation as long as each complies with validation rules.

### File Attachment Capacity Rules

WHEN a user uploads files to an article, THE system SHALL:
1. Accept multiple file attachments per article
2. Store file metadata (name, URL, size, type, upload time)
3. Validate file size is positive
4. Reject files that exceed server capacity limits

THE system SHALL prevent orphaned file records when articles are deleted.

WHERE a user uploads an image, THE system SHALL treat it identically to other files with the same metadata requirements.

WHEN server capacity is exceeded, THE system SHALL reject new attachments with an appropriate error message.

### Tag Uniqueness Enforcement

WHEN a user adds tags to an article, THE system SHALL:
1. Allow unlimited tag additions per article
2. Enforce uniqueness of tags within each article
3. Prevent duplicate tag assignments to the same article
4. Accept free text input for tag names

WHERE a tag name already exists in the system, THE system SHALL reuse the existing tag rather than creating a duplicate.

WHERE a tag name is new, THE system SHALL create it automatically.

THE system SHALL enforce tag name length limits of 1-50 characters.

WHEN tag names differ only in case, THE system SHALL treat them as distinct tags (case sensitivity preserved).

### Pagination Support

WHEN users view article lists, THE system SHALL:
1. Support pagination for article browsing within sections
2. Support pagination for search results
3. Default to a reasonable page size
4. Allow navigation through pages sequentially

WHERE users request article lists, THE system SHALL display only title, author, tags, comment count, and posting time—never full content.

THE system SHALL support unlimited scrolling through paginated results without artificial limits on total pages.

WHEN requesting the next page of results, THE system SHALL return consistent pagination across requests.

### Search Availability

WHEN users search articles, THE system SHALL:
1. Search by article title
2. Search by article content
3. Filter results by tags
4. Paginate results
5. Display matching results with title, author, tags, comment count, and posting time

WHERE search returns no results, THE system SHALL return an empty list rather than an error.

THE system SHALL not rate-limit search queries by design.

WHERE users search with multiple conditions, THE system SHALL apply all filters (title/content, tags, section) as combined criteria.

WHEN search terms match multiple articles, THE system SHALL return all matching results in paginated format.

### Administrator Request Limit

WHEN a user submits an administrator request, THE system SHALL:
1. Allow only one pending request per user at a time
2. Require a reason text for the request
3. Record submission timestamp in UTC
4. Set initial status to 'pending'

WHILE a user already has a pending administrator request, THE system SHALL reject new requests.

WHERE a user's pending request is approved or rejected, THE system SHALL allow submission of a new request.

THE system SHALL store rejection reasons when super administrators reject requests.

WHERE a user submits multiple requests without completing the approval workflow, THE system SHALL enforce the single-active-request constraint.

### Access Pattern Policies

WHERE unban actions occur, THE system SHALL restore the user's login capability.

# Detailed Validation Rules

Detailed validation rules with boundary values and format requirements.

## User Validation Rules

Users register with an email address that must follow standard email format (containing @ and domain). Email addresses must be unique across active accounts. Passwords must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number. Display names must be between 1 and 100 characters and cannot be empty or consist only of whitespace. Bio text has no length limit. Users cannot register with an email that already belongs to an active account.

### Email Validation

WHEN a user registers or updates their email, THE system SHALL:
1. Require an email address
2. Validate that the email contains exactly one '@' symbol
3. Validate that the domain portion contains at least one '.' character
4. Reject the request if the email format does not conform to standard email format

THE system SHALL reject the request when the email address already belongs to an active account.

WHERE the email format is invalid, THE system SHALL return a validation error.

### Password Validation

WHEN a user registers or changes their password, THE system SHALL:
1. Require a password
2. Enforce a minimum length of 8 characters
3. Require at least one uppercase letter (A-Z)
4. Require at least one lowercase letter (a-z)
5. Require at least one numeric digit (0-9)
6. Reject the request if the password does not meet all complexity requirements

IF the password does not meet minimum length requirements, THE system SHALL reject the request.
IF the password lacks uppercase letters, THE system SHALL reject the request.
IF the password lacks lowercase letters, THE system SHALL reject the request.
IF the password lacks numeric digits, THE system SHALL reject the request.

### Display Name Validation

WHEN a user registers or updates their display name, THE system SHALL:
1. Require a display name
2. Enforce a length between 1 and 100 characters
3. Reject the request if the display name is empty or consists only of whitespace
4. Reject the request if the display name exceeds 100 characters

IF the display name is missing, THE system SHALL reject the request.
IF the display name contains only whitespace characters, THE system SHALL reject the request.
IF the display name exceeds 100 characters, THE system SHALL reject the request.

### Username Sanitization

WHEN a user's display name is processed, THE system SHALL:
1. Trim leading and trailing whitespace from the display name
2. Reject the request if the trimmed display name is empty
3. Reject the request if the trimmed display name consists only of whitespace characters

WHERE a display name is submitted with excessive whitespace, THE system SHALL trim and validate the sanitized value.

### Bio Text Field

WHEN a user registers or updates their bio, THE system SHALL:
1. Allow an optional bio text field
2. Accept bio text of any length without artificial character limits
3. Preserve the full bio content as submitted

WHERE a user does not provide a bio, THE system SHALL accept the empty value.

THE system SHALL NOT impose a maximum length limit on bio text.

## Section Validation Rules

Section names must be between 1 and 100 characters and cannot be empty or consist only of whitespace. Each section must have a description field. Descriptions can be empty or contain any text content. Section names must be unique across all sections. Administrators can only create sections with valid names and descriptions that meet these requirements.

### Section Name Validation

### Section Name Requirements

WHEN a user creates or updates a section, THE system SHALL:
1. Require the section name to be between 1 and 100 characters in length
2. Reject section names that consist only of whitespace characters
3. Reject section names that are empty or null
4. Validate the section name against existing section names for uniqueness

IF the section name exceeds 100 characters, THE system SHALL reject the request.
IF the section name is less than 1 character, THE system SHALL reject the request.
IF the section name contains only whitespace characters, THE system SHALL reject the request.
IF the section name already exists in another section, THE system SHALL reject the request with an error indicating the name is already in use.

WHERE a section name is updated, THE system SHALL verify the new name is unique among all sections, including the current section's previous name.

### Description Field Validation

### Section Description Requirements

WHEN a user creates or updates a section, THE system SHALL:
1. Allow the description field to be empty or contain any text content
2. Allow the description to contain any valid Unicode characters
3. Allow unlimited text length for the description field

WHERE a section description is updated, THE system SHALL accept any text input including empty strings without validation constraints.

### Unique Section Name Constraint

### Unique Section Name Enforcement

WHEN a section is created, THE system SHALL:
1. Query all existing sections to verify the proposed name is unique
2. Reject the creation request if a section with the same name already exists

WHEN a section is updated with a new name, THE system SHALL:
1. Verify the new name does not conflict with other existing sections
2. Reject the update request if the new name matches another section

IF two sections are attempted to be created with identical names simultaneously, THE system SHALL ensure only one succeeds based on first-come-first-served principles.

### Section Naming Rules

### Section Naming Format Requirements

WHEN a user submits a section name, THE system SHALL:
1. Trim leading and trailing whitespace from the section name before validation
2. Reject section names that become empty after trimming
3. Reject section names that contain control characters (ASCII 0-31 and 127)
4. Reject section names that contain carriage returns, line feeds, or other line-breaking characters

WHERE section names are displayed in lists or UI elements, THE system SHALL:
1. Preserve the original formatting as entered by the administrator
2. Truncate names exceeding display limits with ellipsis rather than modifying stored data

### Admin-Only Section Creation

### Administrator-Only Section Operations

WHEN a non-administrator attempts to create a section, THE system SHALL reject the request with an error indicating insufficient permissions.

WHEN a regular administrator attempts to create a section, THE system SHALL allow the creation provided all validation rules are met.

WHEN a super administrator attempts to create a section, THE system SHALL allow the creation provided all validation rules are met.

IF a user without administrator privileges attempts to edit or delete a section, THE system SHALL reject the request.

WHERE section name validation occurs during creation or update, THE system SHALL apply the same rules (1-100 character limit, uniqueness, non-whitespace-only) regardless of administrator grade.

## Article Validation Rules

Article titles must be between 1 and 500 characters and cannot be empty or consist only of whitespace. Article content is required and can contain any text content with no length limit. Each article must be assigned to exactly one valid section. Articles must include at least one tag when created. Article tags must be selected from valid tag names that already exist on the platform.

### Article Title Validation

### Article Title Length Constraint

WHEN a user creates or edits an article, THE system SHALL:
1. Require the title to be provided
2. Enforce a minimum length of 1 character
3. Enforce a maximum length of 500 characters
4. Reject the title if it consists only of whitespace characters
5. Trim leading and trailing whitespace before validation

IF the title is missing, THE system SHALL reject the request.
IF the title exceeds 500 characters, THE system SHALL reject the request.
IF the title is empty or whitespace-only after trimming, THE system SHALL reject the request.

### Article Title Display Requirements

WHEN displaying an article in a list, THE system SHALL:
1. Show the title exactly as stored (without trimming)
2. Truncate titles longer than 100 characters with ellipsis (...) for list displays
3. Preserve the original title format when displaying on article detail pages

## Comment Validation Rules

Comments must contain content text that is required and cannot be empty or consist only of whitespace. Comments are linked to a specific article and cannot exist without one. The createdAt timestamp is automatically set when a comment is created and cannot be modified. Comments can be edited by their author, which updates the updatedAt timestamp. Users can only comment on articles within sections they have access to.

### Comment Content Validation

WHEN a user creates or edits a comment, THE system SHALL:
1. Require non-empty content text
2. Reject content that consists only of whitespace
3. Reject content that is null or undefined
4. Store the original content when first created

THE system SHALL reject any comment request where the content field is missing or invalid.

WHILE editing a comment, THE system SHALL preserve the original content while updating only the changed portion.

### Article Association Requirement

WHEN a user creates a comment, THE system SHALL:
1. Require a valid article identifier
2. Reject the request if the referenced article does not exist
3. Reject the request if the user attempts to comment on a deleted article

WHEN viewing a comment, THE system SHALL:
1. Display the comment along with its associated article
2. Reject the comment if its parent article is no longer accessible

IF an article is deleted, THE system SHALL:
1. Preserve the comment record for audit purposes
2. Maintain the association between the comment and its original article context.

### Timestamp Handling Rules

WHEN a comment is created, THE system SHALL:
1. Automatically set the createdAt timestamp to the current system time
2. Set the updatedAt timestamp to match the createdAt value initially
3. Prevent users from specifying or modifying the createdAt timestamp

WHEN a comment is edited, THE system SHALL:
1. Update the updatedAt timestamp to reflect the modification time
2. Preserve the original createdAt timestamp unchanged
3. Store both timestamps in UTC format for consistency

THE system SHALL:
1. Reject any request attempting to manually set or modify the createdAt timestamp
2. Ensure all timestamps are recorded with millisecond precision

## FileAttachment Validation Rules

Each file attachment must include a file name that cannot be empty or consist only of whitespace. The file URL must point to a valid location where the file can be accessed. File sizes must be positive numbers and cannot exceed platform limits. Multiple files can be attached to a single article. Files are deleted when their parent article is deleted.

### File Name Validation

WHEN a user attaches a file to an article, THE system SHALL:
1. Require a non-empty file name
2. Reject files where the file name consists only of whitespace
3. Store the file name exactly as provided by the user

IF the file name is empty or whitespace-only, THE system SHALL reject the attachment request.

### Valid File URL Requirement

WHEN a file is attached to an article, THE system SHALL:
1. Require a valid file URL that points to an accessible location
2. Validate that the file URL format is properly structured
3. Store the file URL as provided for file retrieval purposes

IF the file URL is invalid or cannot be accessed, THE system SHALL reject the attachment request.

### Positive File Size Constraint

WHEN a file is attached to an article, THE system SHALL:
1. Require a positive file size value
2. Reject files with zero or negative file sizes
3. Store the file size as a positive number for tracking purposes

IF the file size is zero or negative, THE system SHALL reject the attachment request.

### Multiple File Support

WHEN a user creates or edits an article, THE system SHALL:
1. Allow multiple files to be attached to a single article
2. Support unlimited attachment count within system capacity limits
3. Store each file attachment as a separate record linked to the article
4. Maintain individual file metadata for each attachment

WHEN the article is displayed, THE system SHALL:
1. List all attached files for user access
2. Allow users to download each file independently

## Tag Validation Rules

Tag names must be between 1 and 50 characters and cannot be empty or consist only of whitespace. Tag names must be unique across the platform. Tags are created by the system when first used in an article. Free text input for tags allows users to create new tags dynamically when posting articles.

### Tag Name Length Limit

WHEN a tag is created, THE system SHALL:
1. Enforce a minimum length of 1 character
2. Enforce a maximum length of 50 characters
3. Reject empty or whitespace-only tag names

IF the tag name exceeds 50 characters, THE system SHALL reject the request.
IF the tag name is empty or contains only whitespace, THE system SHALL reject the request.

### Unique Tag Constraint

THE system SHALL ensure that each tag name is unique across the platform.
WHEN a duplicate tag name is attempted, THE system SHALL reject the creation request.
Tag uniqueness is case-sensitive, meaning 'Economy' and 'economy' are treated as different tags.

IF a tag with the same name already exists, THE system SHALL return the existing tag instead of creating a duplicate.

### Dynamic Tag Creation

WHEN a user creates an article with tags, THE system SHALL:
1. Create new tags for any tag names that don't already exist
2. Link the new tags to the article through ArticleTag associations
3. Accept free text input for tags without predefined options

WHEN a tag is used for the first time, THE system SHALL create the tag automatically.
WHEN a tag is used again, THE system SHALL reference the existing tag.

### Tag Naming Rules

Tag names MUST NOT contain any of the following characters: comma (,), semicolon (;), pipe (|), or backslash (\\).
Tag names MUST NOT start or end with whitespace.
Tag names are trimmed of leading and trailing whitespace before validation.

IF a tag name contains invalid characters, THE system SHALL reject the request.
IF a tag name contains only whitespace after trimming, THE system SHALL reject the request.

### Tag Auto-Generation

WHEN an article is created with tags, THE system SHALL automatically generate the necessary Tag and ArticleTag records.
WHEN an article is updated with new tags, THE system SHALL automatically create any missing tags and update ArticleTag associations.
WHEN an article is deleted, THE system SHALL preserve all associated Tag records.

WHEN a tag has no remaining article associations, THE system SHALL retain the tag for potential future use.
WHEN a tag is referenced in a comment or other user-generated content, THE system SHALL create the tag automatically.

## ArticleTag Validation Rules

Each ArticleTag record must link a valid article to a valid tag. The assignedAt timestamp is automatically set when a tag is associated with an article. ArticleTag records are created automatically when users assign tags to articles during posting or editing. Multiple tags can be associated with a single article.

### Article-Tag Relationship Constraint

WHEN a user assigns a tag to an article, THE system SHALL ensure that:
1. The article exists and has not been deleted
2. The tag exists in the system (either pre-existing or created dynamically)
3. The same tag is not assigned multiple times to the same article

THE system SHALL reject the assignment IF the article has been deleted.
THE system SHALL reject the assignment IF the tag name is empty or exceeds 50 characters.

WHERE multiple tags are assigned simultaneously, THE system SHALL process each tag independently.

### Automatic Association Timestamp

WHEN a tag is successfully assigned to an article, THE system SHALL:
1. Automatically set the assignedAt timestamp to the current UTC time
2. Store the timestamp with millisecond precision
3. Ensure the timestamp is immutable after creation

WHERE an article is updated with existing tags, THE system SHALL NOT modify the assignedAt timestamp for previously assigned tags.

### Tag Assignment Validation

WHEN a user assigns tags to an article, THE system SHALL:
1. Validate that each tag name contains no spaces or special characters (only alphanumeric, hyphens, and underscores allowed)
2. Normalize tag names to lowercase before comparison and storage
3. Reject any tag name that is a duplicate of an existing tag (case-insensitive)
4. Prevent assignment of tags when the article is in a deleted state

IF any tag fails validation, THE system SHALL reject the entire tag assignment request and return the specific validation errors for each invalid tag.

### Many-to-Many Relationship Handling

WHEN articles are retrieved, THE system SHALL include all associated tags through ArticleTag records.
WHEN tags are retrieved, THE system SHALL include all associated articles through ArticleTag records.

WHEN an article is deleted, THE system SHALL automatically remove all related ArticleTag records.
WHEN a tag is deleted, THE system SHALL automatically remove all related ArticleTag records.

THE system SHALL enforce referential integrity such that:
- An ArticleTag record cannot reference a non-existent article
- An ArticleTag record cannot reference a non-existent tag
- ArticleTag records are deleted when their parent article or tag is deleted

## AdministratorRequest Validation Rules

Administrator requests must include a reason text field that is required and cannot be empty or consist only of whitespace. Requests start with a pending status when submitted. The submittedAt timestamp is automatically set when the request is created. Super administrators can update the request status to approved or rejected, but regular administrators cannot modify requests. Approved requests automatically grant administrator privileges.

### Administrator Request Creation

WHEN a member submits an administrator request, THE system SHALL:
1. Require a non-empty reason text field
2. Reject requests where the reason consists only of whitespace
3. Automatically set the submittedAt timestamp to the current time
4. Set the initial status to 'pending'

IF the reason field is missing or invalid, THE system SHALL reject the request.

### Administrator Request Status Transitions

WHEN a super administrator processes an administrator request, THE system SHALL:
1. Allow status to transition from 'pending' to 'approved' or 'rejected'
2. Require a rejection reason when transitioning to 'rejected'
3. Automatically set the processedAt timestamp to the current time
4. Prohibit regular administrators from modifying request status

IF the request is not in 'pending' status, THE system SHALL reject the request.
IF a regular administrator attempts to process the request, THE system SHALL reject the request.

### Administrator Role Assignment

WHEN a super administrator approves an administrator request, THE system SHALL:
1. Automatically grant the requesting user administrator role
2. Maintain the user's existing content (articles and comments)
3. Preserve the request record with 'approved' status

WHILE the request is 'pending', THE system SHALL:
1. Prevent the user from having administrator privileges
2. Prevent the user from performing administrator-only actions

WHEN a user has an existing pending request, THE system SHALL:
1. Reject any additional administrator request submissions from that user

### Super Administrator Approval Authority

ONLY super administrators MAY:
1. View the list of all pending administrator requests
2. Approve administrator requests to grant administrator privileges
3. Reject administrator requests with a recorded rejection reason
4. View all administrator requests with full details including rejection reasons

IF a regular administrator attempts to approve or reject a request, THE system SHALL reject the request.
IF a user attempts to view another user's administrator request details without approval authority, THE system SHALL reject the request.

### Request Visibility and Access Control

WHEN a user views their own administrator request, THE system SHALL:
1. Show the request details including status and submission time
2. Show approval or rejection reason (if applicable)

WHEN a user views administrator requests created by others, THE system SHALL:
1. Show only the request status and submission time
2. Hide sensitive processing details including rejection reasons

WHEN a super administrator views any administrator request, THE system SHALL:
1. Show all details including processing history and rejection reasons
2. Allow full access to approval workflow controls

## BanRecord Validation Rules

Each ban record must include a ban reason text field that is required and cannot be empty or consist only of whitespace. The bannedAt timestamp is automatically set when a user is banned. Banned users retain visibility of their existing content. Unbanning is optional and when done, sets the unbannedAt timestamp. Administrators can view ban reasons for all banned users.

### Ban Reason Requirement

WHEN an administrator bans a user, THE system SHALL require a ban reason text field.

THE ban reason SHALL NOT be empty or consist only of whitespace.

IF the ban reason is missing, empty, or whitespace-only, THE system SHALL reject the ban request.

THE system SHALL store the ban reason in a persistent data field accessible to administrators.

### Automatic Banning Timestamp

WHEN a user is successfully banned, THE system SHALL automatically set the bannedAt timestamp to the current system datetime.

THE bannedAt timestamp SHALL NOT be editable by users or administrators.

THE bannedAt timestamp SHALL be recorded in UTC format for consistency across timezones.

### Content Visibility Preservation

WHEN a user is banned, THE system SHALL ensure their existing articles remain publicly visible.

WHEN a user is banned, THE system SHALL ensure their existing comments remain publicly visible.

WHILE a user is banned, THE system SHALL NOT hide, remove, or alter their previously created content.

Banned users' content SHALL maintain their original author attribution.

### Unban Timestamp Handling

WHEN an administrator unbans a user, THE system SHALL set the unbannedAt timestamp to the current system datetime.

THE unbannedAt timestamp field SHALL be optional; it SHALL remain null while the user is banned.

WHEN unbanning, THE system SHALL allow an optional unban reason to be recorded.

IF no unban reason is provided during unbanning, THE system SHALL leave the unbanReason field as null.

### Admin Ban Reason Access

WHEN an administrator views the list of banned users, THE system SHALL display the ban reason for each banned user.

WHEN an administrator views a specific banned user's profile, THE system SHALL show the ban reason.

Administrators SHALL be able to view ban reasons for all currently and previously banned users.

Banned users SHALL NOT be able to view their own ban reason through user-facing interfaces.

# Filtering, Sorting, and Pagination

List query specifications for filtering, sorting, and pagination.

## List Query Specifications

Define filtering, sorting, and pagination rules for list operations.

### Article List Filtering

### Section-Based Filtering

WHEN a user requests articles in a specific section, THE system SHALL:
1. Filter articles to include only those belonging to the selected section
2. Return articles sorted according to the specified sort parameter
3. Apply pagination to the filtered results

WHEN a user requests articles with tag filters, THE system SHALL:
1. Filter articles to include only those associated with the specified tags
2. Support filtering by multiple tags (AND logic across tags)
3. Apply pagination to the filtered results

### Search-Based Filtering

WHEN a user searches articles by title or content, THE system SHALL:
1. Match the search term against article titles and content
2. Support partial matching (substring search)
3. Be case-insensitive
4. Apply pagination to the search results

### Combined Filtering

WHEN a user applies multiple filters simultaneously, THE system SHALL:
1. Apply all filters with AND logic (articles must match ALL specified criteria)
2. Support filtering by section AND tags simultaneously
3. Support filtering by section AND search term simultaneously
4. Support filtering by tags AND search term simultaneously
5. Support all three filter types (section, tags, search) together

### Article List Sorting

### Sort Direction Options

WHEN a user requests article list sorting, THE system SHALL support:
1. Newest first (default sort direction)
2. Oldest first

### Sort Behavior Specification

WHEN sorting by newest first, THE system SHALL:
1. Order articles with the most recent creation timestamp first
2. For articles with identical timestamps, maintain consistent ordering

WHEN sorting by oldest first, THE system SHALL:
1. Order articles with the oldest creation timestamp first
2. For articles with identical timestamps, maintain consistent ordering

### Sort Parameter Handling

WHERE a sort parameter is provided in the query, THE system SHALL:
1. Accept 'newest' as a valid sort value
2. Accept 'oldest' as a valid sort value
3. Default to 'newest' when no sort parameter is provided
4. Reject requests with invalid sort values

### Pagination Controls

### Pagination Parameters

WHEN a user requests a paginated list, THE system SHALL:
1. Support an optional 'limit' parameter to specify page size
2. Support an optional 'offset' parameter to specify the starting position
3. Accept 'limit' values between 1 and 50
4. Default to a limit of 20 when no limit is specified
5. Default to an offset of 0 when no offset is specified

### Pagination Response Format

WHEN returning paginated results, THE system SHALL:
1. Include the current page number in the response metadata
2. Include the total count of matching articles
3. Include the total number of pages available
4. Include a flag indicating if more pages are available
5. Include the actual list of articles for the current page

### Pagination Error Handling

IF the limit parameter is less than 1 or greater than 50, THE system SHALL:
1. Reject the request
2. Return an appropriate error message

IF the offset parameter is negative, THE system SHALL:
1. Reject the request
2. Return an appropriate error message

### Cursor-Based Navigation

### Cursor Definition

WHEN cursor-based pagination is used, THE system SHALL:
1. Generate a cursor for each article based on its creation timestamp and unique identifier
2. Encode the cursor in a format that can be passed as a string parameter
3. Allow navigation to the next page using the cursor from the last item

### Cursor Parameters

WHEN a user requests articles using cursor pagination, THE system SHALL:
1. Accept an optional 'cursor' parameter containing a navigation token
2. Accept an optional 'direction' parameter ('next' or 'previous')
3. Default to 'next' direction when no direction is specified
4. Return articles that come after/before the provided cursor
5. Include a new cursor in the response for subsequent pagination

### Cursor Implementation Requirements

THE system SHALL:
1. Generate cursors that are stable across requests
2. Ensure cursors work correctly even when new articles are added
3. Support bidirectional cursor navigation (forward and backward)
4. Return an empty cursor when no further pages exist in that direction

### Query Parameter Specification

### Query Parameter Syntax

WHEN a user constructs a query for article lists, THE system SHALL support:
1. Section ID parameter (integer or UUID)
2. Tag parameter (string, can be repeated for multiple tags)
3. Search parameter (string for title/content matching)
4. Sort parameter (string: 'newest' or 'oldest')
5. Limit parameter (integer: 1-50)
6. Offset parameter (integer: 0 or positive)
7. Cursor parameter (string: opaque token)
8. Direction parameter (string: 'next' or 'previous')

### Query Parameter Validation

IF a query contains invalid parameter values, THE system SHALL:
1. Reject the entire request
2. Return a descriptive error message indicating which parameters are invalid
3. Include guidance on acceptable parameter formats and value ranges

### Combined Query Handling

WHEN processing a query with multiple parameter types, THE system SHALL:
1. Apply filtering first (section, tags, search)
2. Apply sorting after filtering
3. Apply pagination to the sorted results
4. Return the properly paginated, filtered, and sorted article list

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### Authentication and Authorization Failures

WHEN a user attempts to log in with an invalid email address, THE system SHALL reject the request.

WHEN a user attempts to log in with an incorrect password, THE system SHALL reject the request.

WHEN a user attempts to log in after being banned, THE system SHALL reject the request.

WHEN an unauthenticated user attempts to perform an action requiring authentication, THE system SHALL reject the request.

WHEN a user attempts to change their password without providing the correct current password, THE system SHALL reject the request.

WHEN a super administrator attempts to demote themselves, THE system SHALL reject the request.

WHEN a user attempts to submit a second administrator request while an existing request is pending, THE system SHALL reject the request.

WHEN an administrator attempts to perform an action requiring super administrator privileges without holding that role, THE system SHALL reject the request.

### Data Validation and Constraint Errors

WHEN a user registers with an email address that does not meet format requirements, THE system SHALL reject the request.

WHEN a user registers with a password that does not meet complexity requirements, THE system SHALL reject the request.

WHEN a user attempts to set a display name exceeding 100 characters, THE system SHALL reject the request.

WHEN a section name exceeds 100 characters, THE system SHALL reject the section creation request.

WHEN a tag name exceeds 50 characters, THE system SHALL reject the tag assignment.

WHEN a user attempts to create an article without a title, THE system SHALL reject the request.

WHEN a user attempts to create an article without content, THE system SHALL reject the request.

WHEN a user attempts to assign an article to a non-existent section, THE system SHALL reject the request.

WHEN a user attempts to create an article with no tags, THE system SHALL reject the request.

### Permission and Access Control Errors

WHEN a user attempts to edit an article they did not author, THE system SHALL reject the request.

WHEN a user attempts to delete an article they did not author, THE system SHALL reject the request.

WHEN a user attempts to edit a comment they did not author, THE system SHALL reject the request.

WHEN a user attempts to delete a comment they did not author, THE system SHALL reject the request.

WHEN a user attempts to view a banned user's profile, THE system SHALL reject the request.

WHEN a user attempts to access an article attachment they do not have permission to view, THE system SHALL reject the request.

WHEN a user attempts to edit a section without administrator privileges, THE system SHALL reject the request.

WHEN a user attempts to delete a section without administrator privileges, THE system SHALL reject the request.

### Resource Not Found Errors

WHEN a user attempts to view an article that does not exist, THE system SHALL reject the request.

WHEN a user attempts to view a comment that does not exist, THE system SHALL reject the request.

WHEN a user attempts to view a section that does not exist, THE system SHALL reject the request.

WHEN a user attempts to view a profile for a user that does not exist, THE system SHALL reject the request.

WHEN a user attempts to view an administrator request that does not exist, THE system SHALL reject the request.

WHEN a user attempts to view a banned user record that does not exist, THE system SHALL reject the request.

WHEN a user attempts to download a file attachment that does not exist, THE system SHALL reject the request.

### Duplicate and Conflict Errors

WHEN a user attempts to register with an email address already in use, THE system SHALL reject the request.

WHEN an administrator attempts to create a section with a name that already exists, THE system SHALL reject the request.

WHEN an administrator attempts to create a tag with a name that already exists, THE system SHALL reject the request.

WHEN a user attempts to attach a duplicate file to an article, THE system SHALL reject the request.

WHEN a user attempts to edit an article that has been deleted, THE system SHALL reject the request.

WHEN a user attempts to comment on an article that has been deleted, THE system SHALL reject the request.

### Business Logic Constraint Violations

WHEN a user attempts to change their email to one that is already in use, THE system SHALL reject the request.

WHEN a user attempts to delete their account while logged in as an administrator, THE system SHALL reject the request.

WHEN a user attempts to delete an article while it still has comments, THE system SHALL reject the request.

WHEN a user attempts to delete a section that contains articles, THE system SHALL reject the request.

WHEN a user attempts to create an article with a file attachment exceeding maximum file size, THE system SHALL reject the request.

WHEN a user attempts to create an article with more than the maximum number of attachments allowed, THE system SHALL reject the request.

WHEN a user attempts to delete a file attachment that does not belong to an existing article, THE system SHALL reject the request.

WHEN a user attempts to delete a tag that is still associated with articles, THE system SHALL reject the request.

# File Validation Rules

Validation rules and policies for file uploads and storage.

## File Validation and Policies

Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.

### File Type Validation

WHEN a user uploads a file attachment, THE system SHALL validate the file type against an approved list.

THE system SHALL accept only the following file types:
1. Documents: PDF, DOC, DOCX, RTF, TXT
2. Images: JPG, JPEG, PNG, GIF, BMP
3. Spreadsheets: XLS, XLSX
4. Presentations: PPT, PPTX

IF the uploaded file type is not in the approved list, THE system SHALL reject the upload and provide an error message.

WHEN a user uploads an image file, THE system SHALL verify the file is a valid image by checking its header signature.

IF an image file has an invalid header signature, THE system SHALL reject the upload and provide an error message.

### File Size and Quantity Limits

WHEN a user uploads a file attachment, THE system SHALL enforce a maximum file size of 10MB per file.

THE system SHALL reject any file exceeding 10MB with an appropriate error message.

WHEN a user uploads files to an article, THE system SHALL enforce a maximum of 5 file attachments per article.

IF the user attempts to upload more than 5 files to an article, THE system SHALL reject the upload and provide an error message.

WHEN a user uploads a file, THE system SHALL validate that the file size is a positive number greater than zero.

IF the file size is zero or negative, THE system SHALL reject the upload with an error message.

### Virus Scanning Requirements

WHEN a file attachment is uploaded, THE system SHALL perform virus scanning using an updated antivirus engine.

IF the virus scan detects malware in the uploaded file, THE system SHALL:
1. Reject the file upload
2. Log the security incident
3. Notify the uploading user with a security-related error message

WHEN a virus scan completes successfully, THE system SHALL store the scan result and timestamp.

THE system SHALL re-scan all uploaded files at least once every 24 hours using the latest virus definitions.

IF a re-scan detects malware in previously approved files, THE system SHALL:
1. Quarantine the affected files
2. Disable file download functionality
3. Notify administrators of the security incident