# Economic/Political Discussion Board

## User Account

WHEN a visitor wants to use the discussion board THE system SHALL allow them to register a user account using their email and password.

WHEN a user attempts to log in THE system SHALL authenticate the user by validating their email and password.

IF the provided email or password is invalid THEN THE system SHALL deny access and provide an appropriate error message.

WHEN a user successfully logs in THE system SHALL establish an authenticated session.

WHEN a logged-in user requests to change their password THE system SHALL verify the current password before applying the change.

WHEN a logged-in user requests to delete their account THE system SHALL delete the user account along with all articles and comments authored by that user permanently.

## User Profile

EVERY user SHALL have a profile with the following attributes:
- Display name
- Bio text

WHEN a user requests to view their own profile THE system SHALL display their display name, bio, list of all articles they have written, and list of all comments they have authored.

WHEN a user requests to view another user's profile THE system SHALL display that user's display name, bio, list of their articles, and list of their comments.

WHEN a user requests to edit their profile THE system SHALL allow them to update their display name and bio.

## Sections

WHEN an administrator creates a section THE system SHALL require the section to have a name and description.

WHEN a user requests the list of all sections THE system SHALL provide a list including each section's name and description.

WHEN a user requests to browse articles within a specific section THE system SHALL provide access to the list of articles belonging to that section.

WHEN an administrator edits a section THE system SHALL allow updating the section's name and description.

WHEN an administrator deletes a section THE system SHALL remove it and all related data accordingly.

## Articles

WHEN a registered user creates an article THE system SHALL require the article to have a title, content (text), be associated with exactly one section.

WHEN a user attaches files or images to an article THE system SHALL allow uploading multiple files and multiple images per article.

WHEN a user adds tags to an article THE system SHALL allow multiple free text tags to be added.

WHEN a user edits their own article THE system SHALL allow updating the title, content, attachments, and tags.

WHEN a user deletes their own article THE system SHALL delete the article.

WHEN an administrator deletes any article THE system SHALL delete the article.

## Article List

WHEN a user requests to view the list of articles in a section THE system SHALL provide a paginated list.

WHEN a user requests sorting the article list THE system SHALL support sorting articles by newest first or oldest first.

THE paginated article list SHALL include for each article: title, author, tags, comment count, and posting time.

The article list SHALL NOT include the full content of articles, only the title.

## Viewing an Article

WHEN a user views an article THE system SHALL display the article's full title, author name, content, all attachments (files and images), tags, and time posted.

WHEN a user downloads attachments THE system SHALL allow downloading of files and images attached to an article.

## Searching Articles

WHEN a user searches articles by title or content THE system SHALL return a paginated list of articles matching the query.

WHEN a user filters search results by tags THE system SHALL return only articles that include the specified tags.

## Comments

WHEN a registered user writes a comment on an article THE system SHALL allow creating a single-level comment (no nested replies).

WHEN a user views comments on an article THE system SHALL display all comments sorted by oldest first.

WHEN a user views a comment THE system SHALL display the author name, content, and time posted.

WHEN a user edits their own comment THE system SHALL allow updating the content.

WHEN a user deletes their own comment THE system SHALL delete the comment.

WHEN an administrator deletes any comment THE system SHALL delete the comment.

## Administrator System

### Becoming an Administrator

WHEN a registered user submits a request to become an administrator THE system SHALL accept the request with a reason.

WHEN a super administrator views pending administrator requests THE system SHALL provide a list of all requests with their submitted reasons.

WHEN a super administrator approves a request THE system SHALL assign regular administrator privileges to the user.

WHEN a super administrator rejects a request THE system SHALL deny the request.

### Administrator Grades

THERE SHALL be two grades of administrators: regular and super administrator.

WHEN a super administrator promotes a regular administrator THE system SHALL update the administrator's grade to super administrator.

WHEN a super administrator demotes another super administrator THE system SHALL update the administrator's grade to regular administrator.

WHEN a super administrator attempts to demote themselves THE system SHALL deny the action.

### Administrator Capabilities

Administrators SHALL have all capabilities of regular users.

Administrators SHALL be able to create, edit, and delete sections.

Administrators SHALL be able to delete any article and any comment.

Administrators SHALL be able to ban and unban users.

Administrators SHALL be able to view the list of banned users.

## Banning

WHEN a user is banned THE system SHALL prevent that user from logging in.

Ban reasons SHALL be recorded and visible to administrators.

A banned user's existing articles and comments SHALL remain visible.

WHEN an administrator unbans a user THE system SHALL restore the user's login capability.
