## Business Rules for Political Discussion Board

This document defines the enforceable business rules that govern content behavior and system interactions within the political discussion board. These rules are not technical specifications—they are the non-negotiable business conditions the backend system must enforce to ensure consistent, fair, and predictable user experience.

---

### Content Creation Rules

WHEN a citizen attempts to create a new post, THE system SHALL require the post to contain at least 10 characters of text.

THE system SHALL NOT allow a citizen to create a post if their account is suspended or deactivated.

WHEN a citizen submits a post, THE system SHALL automatically assign it a "pending" state if the content contains keywords flagged by the moderation system (e.g., hate speech, threats, illegal activity).

WHILE a post is in "pending" state, THE system SHALL NOT display it publicly to any user except moderators and the original poster.

THE system SHALL allow only one new post per citizen every 60 seconds to prevent spam.

---

### Content Editing Rules

WHEN a citizen edits their own post, THE system SHALL permit editing only if the post was created less than 24 hours ago.

IF a post was created more than 24 hours ago, THEN THE system SHALL NOT allow the citizen to edit it, and SHALL display the message: "This post can no longer be edited. Please contact a moderator for corrections."

THE system SHALL preserve the original post history when a post is edited and log the edit time under the user's account for moderation transparency.

WHEN a citizen attempts to edit a post belonging to another user, THE system SHALL deny the request with the message: "You may only edit your own posts."

---

### Commenting Rules

WHEN a citizen attempts to submit a comment, THE system SHALL require the comment text to contain at least 5 characters.

WHEN a citizen attempts to submit a comment on a post, THE system SHALL NOT allow the comment if the target post has been locked by a moderator.

THE system SHALL limit each citizen to 5 comments per minute on the same thread to prevent flooding.

THE system SHALL allow comments on all posts unless the post author has disabled comments explicitly.

WHEN a moderator locks a post, THE system SHALL prevent all subsequent comments and edits by citizens, and notify the post author via internal system message: "This post has been locked by a moderator. No further comments are allowed."

---

### Attachment Rules

WHEN a citizen uploads a file or image with a post, THE system SHALL allow a maximum of 3 attachments per post.

THE system SHALL only accept the following file types for upload: .jpg, .jpeg, .png, .gif, .pdf, .txt, .doc, .docx.

WHEN an attachment is uploaded, THE system SHALL enforce a maximum file size of 10 MB per file.

IF a user attempts to upload a file with an unsupported extension, THEN THE system SHALL reject it and display the message: "Unsupported file type. Only images and documents (.jpg, .jpeg, .png, .gif, .pdf, .txt, .doc, .docx) are allowed."

IF a user attempts to upload a file larger than 10 MB, THEN THE system SHALL reject it and display the message: "File exceeds 10 MB limit. Please compress or split your file."

WHEN a post with attachments is edited within the 24-hour window, THE system SHALL allow the citizen to remove or replace existing attachments, but NOT to add new ones beyond the 3-attachment limit.

THE system SHALL NOT allow any attachments on comments—only on initial posts.

---

### Moderation Rules

WHEN a moderator deletes a post, THE system SHALL mark the post as "deleted" in the database and hide it from all public views, but retain its metadata and attachments for 30 days for audit purposes.

WHEN a moderator locks a thread, THE system SHALL prevent all subsequent comments and edits by citizens, and display a banner: "This thread has been locked by a moderator. No further interaction is allowed."

WHEN a moderator marks a post as verified, THE system SHALL display a badge next to the post titled "Verified by moderator".

THE system SHALL allow a moderator to delete any post or comment, regardless of ownership or age.

THE system SHALL allow a moderator to lock any thread, regardless of its age or state.

THE system SHALL allow a moderator to mark any post as verified, regardless of its content.

IF a moderator attempts to delete another moderator's post, THEN THE system SHALL deny the action and show: "You cannot delete posts by other moderators."

---

### Validation Requirements

WHEN a post is submitted, THE system SHALL validate:
- Text content is not empty (minimum 10 characters)
- Post title (if present) is not longer than 200 characters
- No prohibited terms are detected (configurable moderation list)
- User has not exceeded the 1-post-per-minute limit

WHEN a comment is submitted, THE system SHALL validate:
- Comment content is not empty (minimum 5 characters)
- User has not exceeded the 5-comments-per-minute limit
- Target post is not locked

WHEN an attachment is uploaded, THE system SHALL validate:
- Total number of attachments does not exceed 3
- File extension is in allowed list (.jpg, .jpeg, .png, .gif, .pdf, .txt, .doc, .docx)
- File size does not exceed 10 MB

WHEN a post is edited, THE system SHALL validate:
- Post is less than 24 hours old
- User is the original author
- Any new attachments comply with attachment rules

WHEN a moderator action is performed (delete, lock, verify), THE system SHALL validate:
- User ID has moderator role
- Action is not attempted on another moderator's content (for delete)
- Action is contextually valid (e.g., cannot lock an already locked post)

THE system SHALL validate each action against the above rules before permitting the operation, and return an appropriate human-readable error message in all rejection cases.

WHILE the system is online, THE system SHALL enforce these rules in real-time for all authenticated and guest user actions.

THE system SHALL NOT permit any bypass of these rules—even under administrative interface, unless explicitly designed for emergency override (which is out of scope for this system).