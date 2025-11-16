## 1. Purpose and Scope

The purpose of this document is to outline the requirements for file attachments in the discussion board system, focusing on images and files.

## 2. User Actors

The following user actors have been identified for this system:

- Guest: Unauthenticated users who can view public articles and discussions.
- Member: Authenticated users who can create, edit, and delete their own articles and comments.
- Admin: System administrators who can manage all articles, comments, and user accounts.

## 3. File Attachment Requirements

### 3.1 File Types

- The system SHALL support the following file types for attachments:
  - Images: JPEG, PNG, GIF, BMP
  - Documents: PDF, DOCX, DOC, TXT
- The system MAY support additional file types as deemed necessary by the administrators.

### 3.2 File Size Limits

- The maximum file size for any single attachment SHALL be 5 MB.
- The system MAY enforce different size limits for different types of files (e.g., images vs. documents).

### 3.3 File Upload Process

- Users SHALL be able to upload file attachments when creating or editing articles and comments.
- The system SHALL provide a clear indication of the file types and size limits supported.
- The system SHALL validate file types and sizes before accepting uploads.
- Users SHALL be notified if their file upload exceeds the size limit or if the file type is not supported.

### 3.4 Image Requirements

- Images SHALL be displayed directly within the article or comment.
- The system SHALL support basic image editing features (e.g., resizing, cropping).

### 3.5 Security Requirements

- All file attachments SHALL be scanned for viruses and malware before being accepted.
- File attachments SHALL be stored securely to prevent unauthorized access.