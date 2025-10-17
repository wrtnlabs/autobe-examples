## Post Creation Process

### Post Creation Overview

The post creation system enables users to create and publish content within communities. This system supports three content types: text posts, link posts, and image posts. The process must be consistent across all user roles with appropriate permission checks.

All posts must be associated with a community and follow strict validation rules for content integrity. The system tracks the origin, editing history, and reputation influence of each post.

#### User Roles and Permissions

- **Guest**: Cannot create posts
- **Member**: Can create text, link, and image posts in subscribed communities
- **Moderator**: Can create posts in any community they moderate, with enhanced content control
- **Admin**: Can create posts in any community, with global content override capabilities

THE system SHALL enforce these role-based permissions at every stage of the post creation process.

### Posting Text

The text posting functionality allows users to create posts containing textual content. The system must support rich text formatting while ensuring content integrity.

WHEN a user creates a text post, THE system SHALL:
- Accept up to 10,000 characters of text content
- Process text with Markdown formatting (bold, italic, headers, lists)
- Sanitize text to remove dangerous HTML or JavaScript code
- Generate a preview of the formatted text before submission
- Display a character counter showing remaining characters

THE system SHALL limit text post content to 10,000 characters. IF content exceeds this limit, THEN THE system SHALL display an error message and prevent submission.

THE system SHALL implement the following validation rules for text posts:
- Remove any script tags, event handlers, or embedded JavaScript
- Convert special characters to HTML entities to prevent XSS attacks
- Limit URL mentions to 5 links per post
- Prevent the post from containing offensive language as defined by the system's content filter

#### Text Post Formatting

A text post can use the following formatting features:
- Bold text: **bold content**
- Italic text: *italic content*
- Headers: # Level 1, ## Level 2, ### Level 3
- Bulleted lists: - item 1, - item 2
- Numbered lists: 1. item 1, 2. item 2

WHEN a user applies text formatting, THE system SHALL render the formatted content in the post preview immediately.

THE system SHALL display a maximum of 500 characters from the text post in the community feed preview.

#### Text Post Example Workflow

```mermaid
graph LR
  A[