# Attachment Management Specification

## Overview & Scope

This document defines the complete requirements for managing image and file attachments within the discussion board platform. Attachments can be added to articles and comments, enabling users to share visual content and reference materials with the community. The attachment system must balance user convenience, security, storage efficiency, and performance.

**Scope of This Document:**
- File upload and storage procedures
- Supported file types and formats
- Size limitations and validation
- Image processing and display
- Security and access control
- Error handling from user perspective
- Performance expectations

## Supported File Types

### Image Files (Always Supported)

THE attachment system SHALL support the following image formats:

- **JPG/JPEG** (.jpg, .jpeg) - Standard compressed photography format
- **PNG** (.png) - Lossless compression with transparency support
- **WebP** (.webp) - Modern efficient format for web delivery
- **GIF** (.gif) - Animated and static images

**Total Image Formats: 4 types**

### Document Files (Always Supported)

THE attachment system SHALL support the following document formats:

- **PDF** (.pdf) - Portable document format for universal compatibility
- **Microsoft Office** (.doc, .docx, .xls, .xlsx, .ppt, .pptx) - Standard business documents (6 formats)
- **OpenDocument** (.odt, .ods, .odp) - Open-source document formats (3 formats)
- **Text Files** (.txt) - Plain text documents
- **CSV** (.csv) - Comma-separated data files
- **Rich Text** (.rtf) - Rich text format documents

**Total Document Formats: 13 types**

### Archive Files (Always Supported)

THE attachment system SHALL support compressed archive formats:

- **ZIP** (.zip) - Standard compression format
- **RAR** (.rar) - Compressed archive format

**Total Archive Formats: 2 types**

**Grand Total Supported Formats: 19 file types**

### File Types NOT Supported

THE attachment system SHALL REJECT the following file types:

- Executable files (.exe, .com, .bat, .cmd, .scr, .vbs, .js, .jar, .app, .dmg, .msi)
- Script files that could execute on server (.sh, .bash, .py, .rb, .php, .asp, .jsp)
- System files (.sys, .dll, .so, .dylib, .o)
- Web files (.html, .htm, .js, .xml) - prevent XSS and injection attacks
- Any file without a recognized extension
- Any file with double extensions (e.g., .pdf.exe)

**WHEN a user attempts to upload an unsupported file type, THE system SHALL reject the upload and display an error message indicating the file type is not allowed and listing accepted formats.**

## File Size Limits & Constraints

### Individual File Size Limits

THE attachment system SHALL enforce the following size restrictions per file:

**For Images:**
- Maximum individual image file: **10 MB** (10,485,760 bytes)
- Recommended size for optimal performance: 2-5 MB
- IF a user attempts to upload image exceeding this limit, THE system SHALL reject the upload with error message: "Image file size exceeds maximum limit of 10 MB. Your file size: [X] MB. Please choose a smaller image."

**For Documents:**
- Maximum individual document file: **20 MB** (20,971,520 bytes)
- PDF files: same 20 MB limit
- Office documents: limited to 20 MB each
- IF a user attempts to upload document exceeding this limit, THE system SHALL reject the upload with error message: "Document file size exceeds maximum limit of 20 MB. Your file size: [X] MB."

**For Archive Files:**
- Maximum individual archive file: **50 MB** (52,428,800 bytes)
- Archives must unzip to reasonable size

### Upload Session & Batch Limits

**WHEN a user creates an article, THE system SHALL enforce:**
- Maximum total attachments per article: **10 files**
- Maximum combined attachment size per article: **100 MB total**

**WHEN a user creates a comment, THE system SHALL enforce:**
- Maximum total attachments per comment: **5 files**
- Maximum combined attachment size per comment: **50 MB total**

**IF a user attempts to attach files exceeding these limits, THE system SHALL display specific error messages:**
- "Too many files selected. Maximum: [X] files allowed for this content type."
- "Total attachment size exceeds limit of [X] MB. Your selection: [Y] MB."

### Storage Constraints

**WHILE the system is operating, THE attachment storage:**
- Shall maintain attachments indefinitely while associated article/comment exists
- Shall delete attachments when associated article/comment is deleted
- Shall count toward platform storage limits
- Shall track total storage used and report to administrators

## Image Handling & Display

### Image Processing Requirements

**WHEN a member uploads an image, THE system SHALL:**

1. Validate the image file format using binary file signature (magic bytes), not just extension
2. Strip all EXIF metadata that could reveal location or privacy information
3. Generate thumbnail version at 200x200 pixels for preview displays
4. Generate medium version at 600x600 pixels for article display
5. Keep original image at full resolution for download
6. Validate image dimensions and detect decompression bombs

**Image Optimization:**
- Thumbnails shall be compressed to reduce bandwidth (target under 50 KB)
- Medium versions shall optimize for web viewing (target under 300 KB)
- Original images stored unmodified for maximum quality
- Animated GIFs shall preserve animation in all versions

### Image Display Requirements

**Inline Display in Articles:**
- Images SHALL be displayed inline within article content at full width of text container
- Images SHALL scale responsively to container width (maximum 600 pixels on desktop)
- Images SHALL maintain aspect ratio during scaling
- Image SHALL be clickable to expand to full size in lightbox/modal view
- Caption or filename SHALL display below image if provided

**Inline Display in Comments:**
- Images SHALL be displayed inline within comment text
- Maximum display width: 400 pixels
- Images SHALL be clickable to expand to full size in lightbox view
- Thumbnails SHALL load quickly to support fast comment display

**Image Gallery (Optional):**
- IF an article contains multiple images (3+), THE system MAY provide gallery view
- Gallery SHALL show thumbnail strip of all images
- Clicking thumbnail SHALL display full image in main viewing area
- Gallery SHALL support keyboard navigation (arrow keys for prev/next)

### Image Metadata Capture

**WHEN an image is uploaded, THE system SHALL capture and store:**
- Original filename (user-provided or sanitized)
- Upload timestamp in ISO 8601 format
- Uploader user ID
- Image dimensions in pixels (width and height)
- File size in bytes
- Image format/MIME type
- **NOT stored**: EXIF location data, camera information, timestamps embedded in image

**THE system SHALL strip EXIF metadata before storing to protect user privacy.**

## File Upload Process

### Upload Flow - Step by Step

**Step 1: User Selects Files**
- User browses their file system and selects one or more files
- File picker SHALL filter by supported types (optional, user can override)
- System displays selected files with names and sizes before upload begins
- User can remove individual files from selection before uploading

**Step 2: Pre-Upload Validation**
- **WHEN files are selected, THE system SHALL validate:**
  - Each file size against individual limits (image: 10 MB, document: 20 MB, archive: 50 MB)
  - Each file type against supported formats list
  - Total combined size against session limits
  - Total file count against limits
  - No duplicate files with same name

- **IF validation fails, THE system SHALL display specific error with:**
  - Which file(s) failed validation
  - Specific reason for failure (too large, unsupported type, exceeds count limit)
  - Suggested action (remove file, choose different file, reduce file size)

**Step 3: User Confirmation**
- THE system SHALL display validation results to user
- IF validation passes, show "Upload" button to proceed
- IF validation fails, display specific error messages preventing upload
- User can remove files and select different ones before confirming

**Step 4: Upload Initiation**
- **WHEN user confirms, THE system SHALL:**
  - Display upload progress indicator showing percentage complete
  - Show estimated time remaining (for large files)
  - Allow user to cancel upload while in progress
  - Disable form submission until upload completes
  - Display individual file progress if uploading multiple files

**Step 5: Upload Processing**
- Files shall upload to temporary staging area first (not directly to permanent storage)
- System performs virus/malware scan on each file before moving to permanent storage
- System performs content validation (verify file actually matches declared type)
- System processes images (generate thumbnails, optimize, strip EXIF data)
- System moves validated files to permanent storage
- System creates metadata records linking files to article/comment

**Step 6: Completion & Confirmation**
- **WHEN all files successfully upload, THE system SHALL:**
  - Display success message with file count
  - Show list of uploaded files with preview thumbnails for images
  - Allow user to add file descriptions/captions (optional)
  - Display total size of attachments
  - Show remaining attachment capacity
  - Attach files to article/comment when user submits content

**IF upload fails at any stage, THE system SHALL:**
- Halt processing immediately
- Display specific error message explaining what failed
- Preserve successfully uploaded files for retry with failed files only
- Allow user to retry upload for failed files
- Clean up partial/temporary files after 24 hours if not retried

### Resume and Recovery

**THE system SHALL support resumable uploads for large files:**
- IF connection drops during upload, user can resume from where they stopped
- System remembers which file chunks uploaded successfully
- User need not re-upload completed chunks
- Incomplete uploads remain in temporary storage for up to 24 hours for resume attempts
- IF resume window expires, files deleted and user must restart upload

## Attachment Storage & Management

### File Organization & Storage

**THE attachment system SHALL organize files as follows:**

```
/attachments/
├── /articles/
│   ├── {articleId}/
│   │   ├── {fileId}-original.{ext}
│   │   ├── {fileId}-medium.jpg (if image)
│   │   ├── {fileId}-thumbnail.jpg (if image)
│   │   └── {fileId}-metadata.json
│   └── {otherArticleId}/
├── /comments/
│   ├── {commentId}/
│   │   ├── {fileId}-original.{ext}
│   │   ├── {fileId}-medium.jpg (if image)
│   │   ├── {fileId}-thumbnail.jpg (if image)
│   │   └── {fileId}-metadata.json
│   └── {otherCommentId}/
└── /temp/
    └── {uploadSessionId}/{files}
```

**Storage Organization Strategy:**
- All attachments stored in centralized attachment directory
- Organized by content type (articles vs comments) for logical grouping
- Further organized by specific article/comment ID for easy association
- Temporary files in separate directory cleaned up after 24 hours
- Each file has unique ID (UUID) to prevent filename collisions
- Original filename preserved in metadata for display purposes

### File Deletion & Cleanup

**WHEN an article is deleted, THE system SHALL:**
- Delete all attachments associated with that article
- Free up storage space immediately
- Remove corresponding records from attachment registry
- Log deletion action for audit trail

**WHEN a comment is deleted, THE system SHALL:**
- Delete all attachments associated with that comment
- Free up storage space immediately
- Remove corresponding records from attachment registry

**WHEN a member removes an attachment from an article during editing, THE system SHALL:**
- Delete the specific attachment file from storage
- Free up storage space
- Update attachment registry
- NOT affect other attachments on the same article

**Orphan File Cleanup:**
- System SHALL daily scan for orphaned files (files not referenced by any article/comment)
- Orphaned files SHALL be deleted automatically after 7 days
- Attachment metadata database SHALL be reconciled with actual files on disk weekly
- Administrators notified if discrepancies found

### File Access & Serving

**THE attachment system SHALL serve files through secure endpoints:**
- Files NOT directly accessible via URL path (no direct file:// access)
- All file access goes through API endpoint that validates permissions
- System verifies requesting user has permission to access file (public vs restricted)
- System logs all file downloads for audit trail
- Files served with appropriate MIME types for browser handling
- Image files served with MIME type image/jpeg, image/png, etc. for inline display
- Document files served with Content-Disposition: attachment header to trigger download
- Proper Cache-Control headers set to optimize performance

## Security & Validation Requirements

### Virus & Malware Scanning

**WHEN an attachment is uploaded, THE system SHALL:**

1. Scan file with antivirus/malware detection service before storing permanently
2. Use established scanning service (ClamAV, VirusTotal API, or equivalent)
3. Block and reject files detected as malicious
4. Log all malware detections for security review
5. Notify system administrator of detected threats
6. Prevent user from attempting to re-upload same infected file
7. Quarantine infected files separately if needed

**IF malware is detected, THE system SHALL display:** "File failed security scan and could not be uploaded. Please verify the file is clean and try again."

### File Content Validation

**WHEN an attachment is uploaded, THE system SHALL:**

- Verify file content matches declared file type using binary signatures (magic bytes)
- Reject files with misleading extensions (e.g., .exe renamed as .jpg)
- Read file magic bytes to confirm actual format:
  - JPEG: FFD8FF
  - PNG: 89504E47
  - GIF: 474946
  - PDF: 25504446
  - ZIP: 504B0304
- Prevent upload of files that claim one type but contain another
- Validate file structure integrity before acceptance

### File Name Sanitization

**THE system SHALL sanitize all uploaded file names:**

- Remove or replace special characters that could cause issues (only allow: letters, numbers, hyphens, underscores, periods)
- Remove path traversal sequences (../, ..\\, ~/, etc.) that could cause security issues
- Preserve original filename in metadata for display to users
- Store files with safe, unique identifiers internally (UUID)
- Prevent directory traversal attacks via malicious filenames
- Limit filename length to 255 characters (standard filesystem limit)

### Archive File Security

**WHEN a user uploads an archive file (ZIP, RAR), THE system SHALL:**

- NOT automatically extract contents
- Store archive as regular file like any other document
- IF user wants to extract contents, provide manual extraction through UI
- Validate extracted files against same rules as direct uploads
- Scan extracted files for malware before making available
- Limit extraction to safe location with no path traversal allowed
- Prevent zip bombs (archives that expand to massive size)
- Restrict extraction to reasonable number of files (maximum 1000 files per archive)

### Image File Security

**WHEN an image is processed, THE system SHALL:**

- Strip all EXIF metadata that could contain location/privacy information (GPS, timestamps, camera model)
- Validate image dimensions and detect decompression bombs
- Reject images with invalid or corrupted headers
- Re-encode images to ensure no embedded code or malicious content hidden in image data
- Verify image file integrity before storage
- Validate image doesn't exceed reasonable dimensions (maximum 10000 x 10000 pixels)

### Encryption at Rest

**WHILE attachments are stored, THE system:**

- MAY encrypt attachment files on disk for additional security (implementation choice)
- SHALL protect encryption keys separately from application code
- SHALL ensure only authorized processes can decrypt files
- SHALL implement file-level encryption or full-disk encryption per security requirements

### HTTPS/TLS Transport

**THE system SHALL:**

- Require HTTPS for all file uploads and downloads
- Reject unencrypted HTTP file transfer requests
- Support TLS 1.2 or higher for secure communications
- Use secure, validated SSL certificates
- Implement certificate pinning for high-security environments (optional)

## Attachment Permissions by User Role

### Guest User Permissions

**WHEN a guest user accesses the discussion board, THE system SHALL:**

- Allow viewing and downloading attachments on published articles and comments
- Prevent uploading any attachments with error: "You must be logged in to upload files."
- Prevent deleting any attachments with error: "You must be logged in to manage files."
- Show attachments but restrict interaction to viewing and downloading only
- Display full resolution images and files for download

### Member User Permissions

**WHEN a member user uploads attachments, THE system SHALL:**

- Allow member to upload attachments to their own articles
- Allow member to upload attachments to their own comments
- Allow member to delete their own attachments before publishing article/comment
- Allow member to edit attachment descriptions/captions on their own content
- Allow member to delete attachments from their own published articles and comments
- Allow member to download any publicly visible attachment
- Prevent member from deleting other users' attachments with error: "You can only delete attachments you uploaded."
- Prevent member from modifying other users' attachments with error: "You can only modify your own attachments."
- Prevent member from uploading prohibited file types with clear error message

**WHEN member creates content with attachments, THE system SHALL:**
- Verify attachments are valid before publishing article/comment
- Reject publication if any attached file is malware or invalid
- Allow member to remove problematic attachments and retry

### Moderator Permissions

**WHEN a moderator manages attachments, THE system SHALL:**

- Allow moderator to view all attachments including on moderation queue
- Allow moderator to delete inappropriate attachments from any article/comment
- Allow moderator to flag attachments as problematic without deleting
- Allow moderator to download any attachment for review purposes
- Allow moderator to view attachment metadata and upload history
- Provide moderators with audit log of all attachment deletions by moderators
- Allow moderator to restore deleted attachments (if soft-delete with archive)
- Allow moderator to restrict specific file types site-wide

### Permission Matrix

| Action | Guest | Member | Moderator |
|--------|-------|--------|-----------|
| View attachment | ✅ (public only) | ✅ (all) | ✅ (all) |
| Download attachment | ✅ (public only) | ✅ (all) | ✅ (all) |
| Preview image inline | ✅ (public only) | ✅ (all) | ✅ (all) |
| Upload attachment | ❌ | ✅ (own content) | ✅ (all) |
| Delete own attachment | ❌ | ✅ | ✅ |
| Delete others' attachment | ❌ | ❌ | ✅ |
| Edit attachment metadata | ❌ | ✅ (own) | ✅ (all) |
| View upload history | ❌ | ✅ (own) | ✅ (all) |
| Restore deleted attachment | ❌ | ❌ | ✅ |
| Restrict file types | ❌ | ❌ | ✅ |

## Error Handling & Recovery

### File Type Validation Errors

**IF user selects unsupported file type, THE system SHALL:**
- Display error message: "File type not supported. Allowed types: JPEG, PNG, GIF, WebP (images); PDF, DOC, DOCX, XLS, XLSX, TXT, ZIP (documents)."
- Prevent file from being added to upload queue
- Show list of allowed formats in error message
- Allow user to select different file

### File Size Errors - Individual File

**IF user selects file exceeding individual size limit, THE system SHALL:**
- Display error: "[Filename] exceeds maximum size limit. Maximum: [X MB] - Your file: [Y MB]"
- Prevent file from being added to upload queue
- Suggest user compress file using common tools (WinZip, 7-Zip, etc.)
- Provide option to continue with other files

### File Size Errors - Total Upload

**IF total selected files exceed session limit, THE system SHALL:**
- Display error: "Total files exceed maximum size. Maximum: [X MB] - Your selection: [Y MB]"
- Identify which files can be included within limit
- Suggest removing specific files to stay within limit
- Allow partial upload of subset of files that fits within limit

### File Count Limit

**IF user selects more files than permitted, THE system SHALL:**
- Display error: "Too many files selected. Maximum: [X] files allowed. You selected [Y] files."
- Show count of selected files and limit
- Allow user to remove specific files and retry

### Malware Detection

**IF uploaded file detected as malicious, THE system SHALL:**
- Quarantine the file immediately
- Display message: "File failed security scan and could not be uploaded"
- NOT reveal technical details of malware to user (security principle)
- Log incident for administrator review
- Prevent user from attempting to re-upload same file without waiting period (24 hours minimum)
- Send notification to site administrator

### Corrupt File Detection

**IF uploaded file is corrupt or invalid, THE system SHALL:**
- Display error: "File appears damaged or invalid. Please verify the file and try again."
- NOT accept the corrupted file
- Suggest user:
  - Download original file again from source
  - Use different version of file if available
  - Contact support if persistent issues
- Allow user to retry upload

### Connection/Network Errors

**IF upload connection is interrupted, THE system SHALL:**
- Pause upload immediately
- Notify user: "Connection interrupted. Upload paused."
- Offer option to resume from current position
- Offer option to retry upload from beginning
- Automatically resume if using resumable upload protocol
- Preserve uploaded chunks for up to 24 hours for resume capability
- Allow user to see which files uploaded successfully and which failed

### Storage Full Error

**IF system attachment storage is full, THE system SHALL:**
- Display message: "Unable to upload - system storage is full. Please try again later."
- Alert system administrators to storage situation
- Prevent any new uploads until storage freed or expanded
- NOT delete user files without explicit administrator action

### Processing Error

**IF attachment processing fails during optimization (thumbnail generation, etc.), THE system SHALL:**
- Store original file successfully
- Log processing error for administrator review
- Notify user: "File uploaded successfully but optimization failed. Original file available for download."
- Allow article/comment to be published with original file unoptimized

### Virus Scan Timeout

**IF virus scanning takes too long and times out, THE system SHALL:**
- Display error: "Security scan for file took too long. Please try again."
- Allow user to retry upload
- NOT accept file if scan cannot complete within reasonable time (30 seconds)
- Log timeout event for security review

## Performance Requirements

### Upload Performance

**THE attachment system SHALL meet these performance targets:**

- **Upload Speed**: Files should upload at near-maximum network bandwidth of user's connection
- **Multiple Files**: System SHALL support uploading multiple files in parallel (minimum 3 simultaneous uploads)
- **Chunked Uploads**: Large files SHALL upload in chunks to support reliable resume capability
- **Progress Reporting**: Upload progress SHALL be updated at least once per second
- **Time to Complete**: User should see files completely uploaded within 5-30 seconds for typical files (varies with file size and connection speed)
- **Small File Upload** (< 1 MB): SHALL complete within 2 seconds
- **Medium File Upload** (1-5 MB): SHALL complete within 5 seconds
- **Large File Upload** (5-20 MB): SHALL complete within 15 seconds

### Download Performance

- **Download Speed**: Files served at full network bandwidth available to user
- **Response Time**: File download should begin within 2 seconds of user clicking download
- **Streaming**: Large files SHALL stream to user rather than loading entirely in memory
- **Parallel Downloads**: Support multiple concurrent downloads from same user

### Image Processing

- **Thumbnail Generation**: Thumbnails generated within 2 seconds of upload
- **Medium Version Generation**: Medium versions generated within 5 seconds
- **Display Ready**: Images ready to display in article within 10 seconds of upload completion
- **Thumbnail Size**: Thumbnail images SHALL be under 50 KB each
- **Medium Versions**: Medium images SHALL be under 300 KB each

### Storage Efficiency

- **Archive**: Archived files remain at original size (no unnecessary compression)
- **Storage Optimization**: System SHALL monitor storage usage and report efficiency metrics

### Concurrent Uploads

- **Multiple Users**: System SHALL support at least 10 simultaneous file uploads from different users without degradation
- **Scalability**: Performance should not degrade significantly as number of concurrent uploads increases to 100+

## Performance & Capacity Planning

### System Load Capacity

THE attachment system SHALL support:
- Minimum 100 concurrent users uploading files simultaneously
- Minimum 50 MB total upload bandwidth per second (aggregate)
- Minimum 100 simultaneous downloads without performance degradation
- Recovery from peak loads within 5 minutes of load reduction

### Storage Growth Projections

Based on platform growth targets:
- Year 1: Approximately 5-10 TB of total attachments (estimated 10,000 articles with 1-2 MB average size)
- Year 2: Approximately 25-50 TB of total attachments
- Year 3: Approximately 100-200 TB of total attachments
- Scaling strategy must accommodate projected growth

---

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, file storage infrastructure, virus scanning integration, encryption methods, chunk upload protocols, etc.) are at the discretion of the development team.*