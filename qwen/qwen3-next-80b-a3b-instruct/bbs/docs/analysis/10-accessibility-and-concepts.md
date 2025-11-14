# Accessibility and Concepts Guide

## Terminology

- **Citizen**: An authenticated user of the platform who can create posts, attach files, and comment on others’ content. Cannot moderate, edit others’ content, or access administrative tools. Mirrors real-world civic participation.
- **Moderator**: A trusted user with elevated permissions to enforce community standards. Can delete posts, lock threads, and mark content as verified. Cannot modify system settings or delete other moderators.
- **Post**: A user-submitted article or collection of text representing an opinion, question, or statement on economic or political topics. May include attachments.
- **Attachment**: A file or image uploaded alongside a post. Must be either an image (JPG, PNG, GIF) or a document (PDF, TXT). Limited to one attachment per post.
- **Comment**: A reply to a post or another comment. No attachments allowed. Max 1500 characters.
- **Edit Window**: A 24-hour period after posting during which the original author can modify their post. After this period, edits are prohibited.
- **Thread**: The chain of a post and all its direct and nested comments.
- **Verification**: A moderator’s label indicating a post contains verifiable facts, authoritative sourcing, or qualifies as high-quality discourse. Does not imply endorsement.
- **Locking**: A moderator action that prevents further comments or replies on a thread. The original post remains visible.

## Accessibility Considerations

When designing backend systems, consider that users may access the forum through assistive technologies (screen readers, voice navigation, keyboard-only interfaces). While UI implementation is outside this document, backend behavior must support these use cases:

- THE system SHALL include metadata in posts and comments that distinguishes between text and file attachments.
- WHEN a post contains an image attachment, THE system SHALL store and return a text description field provided by the user during upload.
- IF a user attempts to upload a file larger than 10MB, THEN THE system SHALL reject the upload and display a user-friendly message: "File too large. Maximum allowed size is 10MB."
- WHILE a thread is locked, THE system SHALL continue to serve the post and comments for readability but SHALL not accept new responses.
- WHERE a comment replies to another comment, THE system SHALL preserve the threading hierarchy for assistive navigation.
- THE system SHALL not encode user content (post or comment text) with invisible Unicode characters or non-standard spacing that disrupts screen reader functionality.

## Core Concepts

### Content is User-Driven

The forum operates on the principle of open civic dialogue — users control the content, and moderators enforce basic standards of civility and accuracy. The system does not curate, algorithmically rank, or promote any posts.

- WHEN a citizen creates a post, THE system SHALL assign it a timestamp, a unique numeric ID, and a default "unverified" state.
- THE system SHALL not notify users when a post appears in the feed.
- IF a user submits a post with no text content and only an attachment, THEN THE system SHALL reject it with message: "Posts must include text. Attachments are supplementary."
- WHERE the system detects that a post was edited after 24 hours, THEN THE system SHALL log the attempt but SHALL not allow the change.
- THE system SHALL preserve the exact text of all posts and comments, including typos and grammatical errors. No auto-correction or "cleaning" is permitted.

### Moderation is Reactive, Not Proactive

Moderators only intervene when a post or comment violates community standards. The system does not pre-screen or filter content.

- WHILE a post is visible, THE system SHALL allow any citizen to report it. 
- WHEN a post is reported five times, THEN THE system SHALL flag it for moderator review.
- IF a moderator deletes a post, THEN THE system SHALL record the deletion reason and notify the author via their registered email (message template: "Your post was removed for violating community guidelines: [reason].")
- THE system SHALL not automatically remove posts based on keywords, sentiment, or topics.

### Attachment Handling is Strict and Simple

Attachments are optional and tightly controlled.

- WHEN a citizen uploads an attachment, THE system SHALL allow only these file types: JPG, PNG, GIF, PDF, TXT.
- IF a user uploads a .exe, .zip, .mp4, or .docx file, THEN THE system SHALL block the upload with message: "Uploaded file type is not supported. Only images (JPG, PNG, GIF) and documents (PDF, TXT) are allowed."
- THE system SHALL limit attachments to one per post.
- WHERE a post contains an image, THE system SHALL display a thumbnail in the feed. File attachments (PDF, TXT) shall show only a link icon.
- THE system SHALL not generate previews or thumbnails for non-image files.

### Session and Token Management

- THE system SHALL use JWT tokens for authentication.
- WHEN a citizen logs in, THE system SHALL issue a 30-minute access token and a 14-day refresh token.
- THE system SHALL include only these claims in the JWT payload: `userId`, `role` ("citizen" or "moderator"), `permissions` (array of strings).
- WHERE a user’s token expires, THE system SHALL require re-authentication via login form.
- WHILE a user is logged in, THE system SHALL not terminate the session due to inactivity.

## Frequently Asked Questions

**Q: Can citizens delete their own posts?**
A: No. Only moderators can delete posts. Citizens may edit their own posts within 24 hours and then cease interaction. This prevents spam deletion and removal of evidence.

**Q: Can citizens comment on their own posts?**
A: Yes. This supports follow-up clarification or correction.

**Q: What happens if a moderator deletes a post and the user later tries to edit it?**
A: If the post has been deleted, the system SHALL not allow editing and SHALL return a 404 when the user attempts to access the now-deleted content.

**Q: Can moderators edit posts?**
A: No. Even moderators cannot alter text content. They may only delete, lock, or verify.

**Q: Is there a limit on the number of comments per thread?**
A: No. Threads may grow indefinitely. The system SHALL not implement pagination on comment listings for simplicity.

**Q: Is there an area for private messages?**
A: No. This system is public-only. Any private communication must occur outside the platform.

**Q: Must posts be political or economic?**
A: Yes. The system SHALL reject any post with topic tags or content unrelated to politics, economy, public policy, governance, or civic rights. A post misclassified under "travel" or "cooking" shall be automatically flagged for review.

**Q: How are topics assigned?**
A: Users do not assign topics. Any reference to topics in the content is treated as natural language. The system does not tag, categorize, or index topics.

## Future Extensions (Optional)

These features were discussed informally as potential future improvements but are not required for MVP:

- A simple reporting system to allow users to flag offensive content (already implemented through the 5-report flag).
- A user bio or profile page with optional self-description.
- Ability to follow other users’ posts.
- Email digest notifications for replies to one’s own comments.
