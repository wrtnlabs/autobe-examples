# Attachment Management Requirements Document

## 1. Overview

The discussion board system must support robust attachment handling for both articles and comments, enabling users to enrich their discussions with visual content (images) and supplementary files (documents, PDFs, etc.). This document specifies all requirements for attachment creation, management, storage, and access control.

### 1.1 Business Context
Attachments significantly enhance user engagement by allowing rich content expression. Users expect to attach images to illustrate points in political or economic discussions and documents to provide supporting evidence. The system must balance usability with security and performance constraints.

### 1.2 Scope
This document covers:
- File types supported for attachments
- Upload process with validation
- Download and streaming functionality
- Quantity and size limits
- Storage architecture requirements
- Security measures for attachment handling

## 2. Attachment Types

### 2.1 Supported File Types

**WHEN users attach files to articles or comments, THE system SHALL accept images and documents.**

**THE system SHALL support the following image file types:**
- JPEG/JPG (`.jpg`, `.jpeg`)
- PNG (`.png`)
- GIF (`.gif`)
- WebP (`.webp`)
- BMP (`.bmp`)

**THE system SHALL support the following document file types:**
- PDF (`.pdf`)
- Microsoft Word (`.doc`, `.docx`)
- Microsoft Excel (`.xls`, `.xlsx`)
- Microsoft PowerPoint (`.ppt`, `.pptx`)
- Plain text (`.txt`)
- Markdown (`.md`)
- ZIP archives (`.zip`, `.rar`, `.7z`)

**IF a user attempts to upload a file with an unsupported extension, THEN THE system SHALL reject the upload and return an appropriate error message.**

**THE system SHALL support files up to 100 MB in size.**

**WHILE an attachment upload is in progress, THE system SHALL display upload progress to the user.**

### 2.2 File Type Detection

**THE system SHALL validate file types using both filename extension and MIME type inspection.**

**IF the file extension and MIME type do not match, THEN THE system SHALL log the discrepancy and potentially reject the file.**

## 3. Upload Process

### 3.1 Authentication and Authorization

**WHEN a user attempts to attach a file to an article or comment, THE system SHALL require authentication.**

**IF a non-authenticated user attempts to upload an attachment, THEN THE system SHALL deny the request and return HTTP 401 Unauthorized.**

### 3.2 Single vs Multiple Attachments

**WHILE uploading attachments, THE system SHALL allow multiple files in a single request.**

**THE system SHALL accept up to 10 attachments per article or comment.**

**WHEN a user uploads more than 10 attachments, THEN THE system SHALL reject the request and return HTTP 400 Bad Request with error code ATTACHMENT_LIMIT_EXCEEDED.**

### 3.3 Upload Validation

**THE system SHALL validate the following properties for each uploaded file:**
- File extension matches allowed types (see Section 2.1)
- MIME type matches allowed types
- File size does not exceed 100 MB
- Total request size does not exceed 500 MB

**IF any validation fails, THEN THE system SHALL return HTTP 400 Bad Request with specific error codes for each validation failure.**

### 3.4 Upload Processing

**WHEN a valid attachment upload request is received, THE system SHALL:**
1. Generate a unique identifier for the attachment
2. Validate file content against declared type
3. Store the file using the determined storage strategy
4. Create a database record with metadata
5. Return the attachment reference to the client

**THE system SHALL process uploads synchronously for requests under 10 MB and asynchronously for larger files.**

## 4. Download/View Process

### 4.1 Access Control

**WHEN a user attempts to download or view an attachment, THE system SHALL verify that:**
- The user is authenticated (if the article/comment is not public)
- The user has permission to access the parent article/comment
- The attachment is not deleted

**IF a user attempts to access a deleted or restricted attachment, THEN THE system SHALL return HTTP 404 Not Found.**

### 4.2 File Delivery Methods

**THE system SHALL support the following file delivery methods:**
- Direct file streaming for images (served from CDN when applicable)
- Direct file streaming for documents (served from CDN when applicable)
- Download links for all attachment types
- Preview generation for supported document types (PDF, Word, Excel, PowerPoint)

**WHEN serving image attachments, THE system SHALL optimize delivery by:**
- Serving appropriately sized thumbnails for article previews
- Implementing lazy loading for full-size images
- Providing WebP variants when supported by the browser

### 4.3 Download Flow

**WHEN a user clicks on an attachment link, THE system SHALL:**
1. Validate user permissions for the parent article/comment
2. Check attachment availability and status
3. Generate a temporary signed URL if using cloud storage
4. Stream the file directly or redirect to the signed URL
5. Log the access event

**THE system SHALL support resumable downloads for files over 10 MB.**

### 4.4 Embedded Image Display

**WHEN displaying articles with embedded images, THE system SHALL:**
- Render images directly in the content view
- Maintain aspect ratio for all images
- Provide alt text based on file name or user-provided description
- Implement lightbox functionality for full-size viewing

**THE system SHALL support the following image display modes:**
- Inline (embedded in article content)
- Gallery view (when multiple images are attached)
- Thumbnail view (in article lists)

## 5. Attachment Limits

### 5.1 Quantity Limits

**THE system SHALL enforce the following attachment limits:**
- Maximum 10 attachments per article
- Maximum 5 attachments per comment
- Maximum 20 attachments per user per day (daily cap)

**WHEN a user exceeds their daily attachment limit, THEN THE system SHALL return HTTP 429 Too Many Requests with error code ATTACHMENT_DAILY_LIMIT_EXCEEDED.**

### 5.2 Size Limits

**THE system SHALL enforce the following size limits:**
- Maximum file size: 100 MB per attachment
- Maximum total upload size per request: 500 MB
- Maximum storage per user: 500 MB

**IF a user's total storage exceeds their limit, THEN THE system SHALL deny new uploads and return HTTP 403 Forbidden with error code STORAGE_LIMIT_EXCEEDED.**

### 5.3 Frequency Limits

**THE system SHALL enforce the following rate limits:**
- Maximum 100 MB/minute upload rate per user
- Maximum 10 file deletion requests per minute per user
- Maximum 1000 attachment view requests per hour per user

**WHEN rate limits are exceeded, THEN THE system SHALL return HTTP 429 Too Many Requests with appropriate error codes.**

## 6. Storage Requirements

### 6.1 Storage Architecture

**THE system SHALL use a hybrid storage approach:**
- Image attachments: Store in object storage (e.g., AWS S3, Google Cloud Storage)
- Document attachments: Store in object storage with CDN delivery
- Metadata: Store in PostgreSQL database

**WHEN attachments are created, THE system SHALL:**
1. Generate unique filenames using UUIDv4
2. Organize files in year/month/day directory structure
3. Store metadata in the attachments table

**THE system SHALL support the following storage configurations:**
- Local filesystem (development)
- Object storage service (production)
- CDN integration for public assets

### 6.2 File Naming and Organization

**THE system SHALL generate attachment filenames using the format:**
```
{uuid}.{original_extension}
```

**EXAMPLE:** `a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg`

**THE system SHALL organize uploaded files using the path structure:**
```
attachments/{entity_type}/{entity_id}/{year}/{month}/{day}/{filename}
```

**EXAMPLE for article attachment:** `attachments/article/123/2024/03/15/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg`

**EXAMPLE for comment attachment:** `attachments/comment/456/2024/03/15/b2c3d4e5-f6a7-8901-bcde-f12345678901.png`

### 6.3 Database Schema Requirements

**THE system SHALL store the following attachment metadata in the database:**
- Unique identifier (UUID)
- Entity type (article or comment)
- Entity ID
- File name (original)
- Stored filename (UUID)
- File size
- MIME type
- File extension
- Upload timestamp
- User ID (owner)
- Deletion timestamp (soft delete)

**WHEN an attachment is deleted, THE system SHALL set the deletion timestamp rather than immediately removing the file from storage.**

### 6.4 Backup and Recovery

**THE system SHALL:**
- Backup attachment storage daily
- Retain backups for 30 days
- Support point-in-time recovery
- Test backup restoration weekly

**WHEN a storage failure occurs, THEN THE system SHALL activate the disaster recovery plan.**

## 7. Error Handling and Recovery

### 7.1 Upload Errors

**WHEN an upload fails due to validation errors, THEN THE system SHALL return HTTP 400 Bad Request with specific error codes:**
- `ATTACHMENT_INVALID_TYPE`: File type not supported
- `ATTACHMENT_TOO_LARGE`: File exceeds size limit
- `ATTACHMENT_EXTENSION_MISMATCH`: Extension doesn't match content

**WHEN an upload fails due to authentication errors, THEN THE system SHALL return HTTP 401 Unauthorized.**

**WHEN an upload fails due to storage errors, THEN THE system SHALL return HTTP 500 Internal Server Error.**

### 7.2 Download Errors

**WHEN a download fails due to permission errors, THEN THE system SHALL return HTTP 403 Forbidden.**

**WHEN a download fails because the attachment doesn't exist, THEN THE system SHALL return HTTP 404 Not Found.**

**WHEN a download fails due to storage unavailability, THEN THE system SHALL return HTTP 503 Service Unavailable.**

### 7.3 Error Recovery

**THE system SHALL:**
- Implement automatic retry for transient failures
- Queue failed uploads for later processing
- Log all errors with sufficient context for debugging
- Provide user-friendly error messages

## 8. Performance and Scalability Considerations

### 8.1 Response Time Requirements

**THE system SHALL meet the following performance requirements:**
- Upload initiation: Response within 100ms
- File transfer: Throughput of at least 10 MB/s per connection
- File serving: Response within 200ms for cached files
- Thumbnail generation: Complete within 1 second

**WHEN serving attachments, THE system SHALL:**
- Cache frequently accessed files in CDN
- Implement HTTP range requests for partial content
- Support gzip compression for text-based files
- Use efficient compression algorithms for documents

### 8.2 Bandwidth Optimization

**THE system SHALL:**
- Compress images above 2MB before storage
- Generate responsive image sizes for different devices
- Implement cache headers for static assets
- Use efficient compression algorithms for documents

### 8.3 Concurrency Requirements

**THE system SHALL support:**
- Minimum 1000 concurrent upload connections
- Minimum 5000 concurrent download connections
- Minimum 100 attachment transfers per second

## 9. Security Requirements

### 9.1 File Content Security

**THE system SHALL:**
- Scan all uploaded files for malware using antivirus software
- Strip metadata from image files (EXIF data)
- Validate file content against declared MIME type
- Prevent executable content execution

**IF malware is detected in an uploaded file, THEN THE system SHALL immediately quarantine the file and notify administrators.**

### 9.2 Access Security

**THE system SHALL:**
- Generate time-limited signed URLs for private attachments
- Implement CORS policies for cross-origin requests
- Enforce Content-Type headers for all file deliveries
- Prevent directory traversal attacks

**WHEN serving attachments, THE system SHALL set security headers:**
- `Content-Disposition: attachment` for downloads
- `Content-Security-Policy` with restrictive policies
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`

### 9.3 Data Privacy

**THE system SHALL:**
- Encrypt attachments at rest using AES-256
- Encrypt attachments in transit using TLS 1.3+
- Implement access logging and audit trails
- Support GDPR-compliant data deletion

**WHEN a user requests account deletion, THEN THE system SHALL:**
1. Mark all user's attachments as deleted
2. Schedule physical removal from storage
3. Delete database records
4. Return deletion confirmation

## 10. Integration Points

### 10.1 Article Integration

**WHEN an article is created, THE system SHALL:**
- Accept attachment references in the request payload
- Validate all attachment references before article creation
- Associate attachments with the new article ID
- Return complete article data with attachment information

**WHEN an article is updated, THE system SHALL:**
- Accept new attachment references
- Handle attachment removal requests
- Update the article's attachment count
- Return updated article data

**WHEN an article is deleted, THE system SHALL:**
- Soft-delete all associated attachments
- Schedule physical removal of attachment files
- Update user storage usage counters

### 10.2 Comment Integration

**WHEN a comment is created, THE system SHALL:**
- Accept attachment references in the request payload
- Validate all attachment references before comment creation
- Associate attachments with the new comment ID
- Return complete comment data with attachment information

**WHEN a comment is deleted, THE system SHALL:**
- Soft-delete all associated attachments
- Schedule physical removal of attachment files
- Update user storage usage counters

### 10.3 User Integration

**THE system SHALL:**
- Track attachment storage usage per user
- Enforce user storage limits
- Calculate storage usage in real-time
- Notify users when approaching limits

**WHEN a user's storage exceeds 80% of their limit, THEN THE system SHALL return a warning in API responses.**

**WHEN a user's storage exceeds 100% of their limit, THEN THE system SHALL deny new uploads and return HTTP 403 Forbidden.**

## 11. Implementation Notes for Developers

**This document provides business requirements only. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.**