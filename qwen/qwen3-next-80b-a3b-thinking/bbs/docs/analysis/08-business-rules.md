# Business Rules for Economic BBS Discussion Board

## Content Validation Rules

WHEN a member submits an article title, THE system SHALL validate it contains between 5 and 200 characters.
WHEN the title is shorter than 5 characters, THE system SHALL reject the submission and return: "Title must be at least 5 characters long."
WHEN the title exceeds 200 characters, THE system SHALL reject it and return: "Title must be under 200 characters."

WHEN a member submits article content, THE system SHALL ensure it contains a minimum of 20 characters and maximum of 10,000 characters.
WHEN the content is less than 20 characters, THE system SHALL return: "Content must be at least 20 characters long."
WHEN content exceeds 10,000 characters, THE system SHALL return: "Content must be under 10,000 characters."

WHEN an article contains hate speech, personal attacks, or misinformation, THE system SHALL reject the submission.
THE system SHALL block articles containing any of these keywords: 'hate', 'racism', 'sexism', 'bullying', 'assault', 'violence', 'terrorism', 'weapons', 'insult', or 'threat'.
WHEN prohibited content is detected during validation, THE system SHALL return: "Your submission contains prohibited content. Please revise and try again."

## Attachment Size Limits

WHEN a member uploads an image attachment for an article, THE system SHALL only accept files with these extensions: .jpg, .jpeg, .png, .gif.
WHEN a non-image file is uploaded (e.g., .pdf, .docx), THE system SHALL reject it immediately and display: "Unsupported file type. Only image files (JPG, PNG, GIF) are allowed."

WHEN uploading an image file, THE system SHALL ensure it does not exceed 5 MB in size.
WHEN the file size is larger than 5 MB, THE system SHALL reject it and show: "File size must be under 5MB."
WHEN uploading multiple files, THE system SHALL only permit one image attachment per article.

## User Permission Rules

GUEST users SHALL only be able to view and read published articles.
WHEN a guest attempts to create an article, THE system SHALL redirect them to the login page with: "Please log in to post or comment."
WHEN a guest attempts to comment on an article, THE system SHALL display: "You must be logged in to comment."
GUEST users SHALL have no permission to edit, delete, or upload images.

AUTHENTICATED members SHALL have these permissions:
- Create new articles with one image attachment
- Comment on existing articles
- Edit their own articles within 24 hours of creation
- Delete their own articles at any time

THE system SHALL prevent members from:
- Editing or deleting other members' articles
- Uploading more than one image per article
- Posting comment content longer than 500 characters

### Permission Matrix Table

| Action | Guest | Member |
|--------|-------|--------|
| View Articles | ✅ | ✅ |
| Create Article | ❌ | ✅ |
| Comment on Articles | ❌ | ✅ |
| Edit Own Articles | ❌ | ✅ (within 24 hours) |
| Delete Own Articles | ❌ | ✅ |
| Edit Others' Articles | ❌ | ❌ |
| Delete Others' Articles | ❌ | ❌ |
| Upload Images | ❌ | ✅ (max 1 file, 5MB) |

## Post Editing Restrictions

WHEN a member creates an article, THE system SHALL start a 24-hour editing window from the time of publication.
WHILE within this 24-hour window, THE member SHALL be permitted to edit both title and content of their article.
AFTER the 24-hour period expires, THE system SHALL block all edit attempts and return: "Editing is no longer allowed. This article can only be edited within 24 hours of creation."
WHEN a member attempts to delete their own article, THE system SHALL permanently remove it from public view immediately.

## Error Handling Scenarios

WHEN validation fails for any business rule, THE system SHALL return a clear, user-friendly error message.
WHEN an error occurs during upload or submission, THE system SHALL display specific guidance without revealing technical details.
THE system SHALL NOT show error messages that include: "database error", "server failure", or any internal system names.
WHEN a user attempts prohibited actions (e.g., editing others' posts), THE system SHALL return generic permission errors like: "You do not have permission to perform this action."