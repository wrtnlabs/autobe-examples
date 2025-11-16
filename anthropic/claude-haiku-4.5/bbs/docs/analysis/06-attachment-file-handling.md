# Attachment and File Handling Requirements

## Overview

The discussion board system supports image and file attachments on both articles and comments to enable users to share visual content, documents, and supporting materials during economic and political discussions. This document specifies how attachments are handled throughout their lifecycle, from upload validation through retrieval and deletion.

The attachment system must be straightforward and reliable, with clear constraints that prevent abuse while remaining user-friendly. All attachments are treated as user-generated content subject to moderation requirements.

## Supported File Types

THE system SHALL accept only the following file types for attachment uploads:

### Image Formats
- **JPEG/JPG**: `.jpg`, `.jpeg` (MIME type: `image/jpeg`)
- **PNG**: `.png` (MIME type: `image/png`)
- **GIF**: `.gif` (MIME type: `image/gif`)
- **WebP**: `.webp` (MIME type: `image/webp`)

### Document Formats
- **PDF**: `.pdf` (MIME type: `application/pdf`)
- **Word Documents**: `.doc`, `.docx` (MIME types: `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`)
- **Text Files**: `.txt` (MIME type: `text/plain`)
- **Excel Spreadsheets**: `.xls`, `.xlsx` (MIME types: `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`)
- **Markdown**: `.md` (MIME type: `text/markdown`)

### Archive Formats
- **ZIP Archives**: `.zip` (MIME type: `application/zip`)

### Explicitly Prohibited File Types

THE system SHALL reject the following file types and extensions:
- Executable files (`.exe`, `.bat`, `.cmd`, `.sh`, `.bin`, `.com`, `.scr`)
- Scripts (`.js`, `.py`, `.php`, `.rb`, `.java`, `.pl`, `.asp`, `.jsp`)
- System files (`.dll`, `.sys`, `.config`, `.ini`, `.plist`, `.reg`)
- Compiled code (`.class`, `.o`, `.so`, `.dylib`, `.lib`)
- Compressed archives except ZIP (`.rar`, `.7z`, `.tar`, `.gz`, `.bz2`)
- ActiveX controls (`.cab`, `.ocx`, `.msi`)
- Macro-enabled documents (`.xlsm`, `.docm`, `.pptm`)
- Any file without a recognized extension
- Files with double extensions (e.g., `.pdf.exe`, `.jpg.scr`)
- Files with null bytes or special path characters

**Validation Method**: THE system SHALL validate file types using magic number verification (file header inspection), not solely by file extension, to prevent spoofing attacks where attackers rename executables to appear as documents.

**Implementation Detail**: THE system SHALL read the first 512 bytes of every uploaded file and compare the magic number against known safe file signatures before accepting the file.

## File Size Limits

### Per-Attachment Limits
- **Individual image file**: Maximum 10 MB
- **Individual document file**: Maximum 20 MB
- **Individual archive file (ZIP)**: Maximum 50 MB

### Per-Article Limits
- **Total attachments per article**: Maximum 5 files
- **Total attachment size per article**: Maximum 100 MB

### Per-Comment Limits
- **Total attachments per comment**: Maximum 2 files
- **Total attachment size per comment**: Maximum 30 MB

### Size Validation Rules

**Upload Validation**: WHEN a user attempts to upload a file, THE system SHALL validate both individual file size and accumulated attachment size before accepting the upload.

**Size Exceeded Handling**: IF a file exceeds the size limit, THEN THE system SHALL reject the upload and display a clear error message indicating the specific limit that was exceeded and the file's actual size.

**Remaining Space Indicator**: WHEN a user is uploading attachments, THE system SHOULD display the remaining available space for that article or comment, helping users understand how many more files they can add.

**Progressive Accumulation**: WHEN calculating total attachment size for an article or comment, THE system SHALL include all attachments that have been uploaded, even if they are awaiting approval.

## Image Handling & Processing

### Image Format Support & Dimensions

WHEN a user uploads an image file, THE system SHALL accept images in any of the supported image formats: JPEG, PNG, GIF, or WebP.

THE system SHALL validate image dimensions fall within acceptable ranges:
- **Minimum dimensions**: 100 x 100 pixels (images smaller than this are too small to be useful)
- **Maximum dimensions**: 8000 x 8000 pixels (images larger are extremely high resolution)

**Dimension Validation Errors**: IF an image exceeds the maximum dimensions, THEN THE system SHALL reject the upload and display: "Image dimensions exceed maximum of 8000x8000 pixels. Your image is [WIDTH]x[HEIGHT]. Please resize and try again."

**Undersized Image Handling**: IF an image is smaller than 100x100 pixels, THEN THE system SHALL reject and display: "Image is too small (minimum 100x100 pixels). Your image is [WIDTH]x[HEIGHT]."

### Image Processing Pipeline

WHEN a user uploads an image file, THE system SHALL perform the following processing steps in order:

1. **Format Validation**: Verify the file is a valid image format by reading magic numbers and file headers
2. **Dimension Verification**: Confirm image dimensions are between 100x100 and 8000x8000 pixels
3. **Corruption Check**: Attempt to open and validate the image can be properly decoded
4. **EXIF Data Stripping**: Remove all metadata including location data, camera information, and timestamps
5. **Thumbnail Generation**: Create a compressed thumbnail (maximum 400x400 pixels) for display
6. **Optimization**: Compress the original image to reduce storage without significantly degrading quality
7. **Security Scanning**: Scan image for embedded malicious content or signatures

**Compression Standards**: THE system SHOULD compress images using appropriate quality settings:
- JPEG images: 85% quality (good balance between quality and file size)
- PNG images: 8-bit or 24-bit depth depending on content
- GIF images: Retain original color palette if reasonable
- WebP images: 80% quality (WebP provides better compression than JPEG)

### EXIF Data Removal & Privacy Protection

WHEN processing an image, THE system SHALL completely remove all EXIF metadata including:
- Camera make, model, and settings
- GPS location coordinates and altitude
- Timestamp of photo capture
- Copyright and attribution information
- Any other metadata embedded in the image file

**User Privacy Assurance**: THE system SHALL document in user-facing messaging that location data in photos will be removed, protecting user privacy: "Images will be processed to remove location data and other metadata."

**Verification**: THE system SHALL verify that no EXIF data remains in the processed image by re-reading the image headers after processing.

### Thumbnail Generation & Display

WHEN processing an image, THE system SHALL automatically generate a compressed thumbnail for rapid display:
- **Thumbnail maximum dimensions**: 400x400 pixels
- **Thumbnail file format**: Same as original (JPEG stays JPEG, PNG stays PNG)
- **Thumbnail quality**: Sufficient to visually identify the image while being significantly smaller than original

**Storage**: THE system SHALL store both the original image and the thumbnail version for use in different contexts (thumbnail in article list, full image in detail view).

**Usage**: WHERE thumbnails are used (article listings, comment preview), THE system SHALL display the thumbnail version for fast page loading.

## File Storage Requirements

### Storage Organization & Directory Structure

THE system SHALL organize attachment files using the following logical structure:

```
/attachments/
  /articles/
    /{articleId}/
      image_1_{hash}.jpg
      image_2_{hash}.png
      document_1_{hash}.pdf
  /comments/
    /{commentId}/
      image_1_{hash}.jpg
      file_1_{hash}.pdf
  /thumbnails/
    /{articleId}_img1_thumb.jpg
    /{commentId}_img1_thumb.jpg
```

This structure ensures:
- Attachments are logically organized by parent content
- File names are unique (preventing collisions)
- Retrieval is efficient (predictable paths)
- Cleanup is straightforward (delete directory when article/comment is deleted)

### File Naming Strategy & Security

WHEN a file is uploaded, THE system SHALL:
1. Generate a unique identifier for the file (UUID or hash-based)
2. Preserve the original filename in the database for user reference
3. Create a system filename using the pattern: `{timestamp}_{randomHash}_{originalName}`
4. Use URL-safe characters only (alphanumeric, hyphens, underscores)
5. Replace spaces and special characters in the filename with underscores or hyphens

**Example**: Original file "My Research Paper.pdf" becomes "20241201_a7f3k2m1_My_Research_Paper.pdf"

**Benefits of This Approach**:
- Prevents directory traversal attacks (no path separators allowed)
- Ensures filename uniqueness (prevents overwrites)
- Maintains readability (original name preserved in filename)
- Enables audit trails (timestamp in filename)

### Storage Medium & Infrastructure

THE system MAY use either:
- **Local file system storage**: Files stored on the application server's disk
- **Cloud storage service**: AWS S3, Google Cloud Storage, Azure Blob Storage, or similar
- **Content Delivery Network (CDN)**: Files cached geographically for fast delivery

**Development Team Discretion**: The development team has autonomy in choosing the storage mechanism based on:
- Infrastructure preferences and capabilities
- Scalability requirements (local storage scales differently than cloud)
- Cost considerations (cloud vs. on-premise)
- Geographic distribution needs (CDN benefits if serving global users)

**Regardless of storage choice**, the following requirements apply:
- Files must be protected from unauthorized access
- Files must be retrievable via the application (not directly from storage)
- Files must support deletion when content is removed
- Files must be backed up as part of disaster recovery

### File Retention & Lifecycle

THE system SHALL retain attachment files for the duration that their associated article or comment exists.

WHEN an article or comment is deleted, THE system SHALL delete all associated attachment files within 24 hours.

**Background Cleanup Job**: THE system SHOULD implement a scheduled background job that runs daily to:
- Identify articles/comments deleted more than 24 hours ago
- Locate and delete their associated attachments
- Log cleanup operations for audit purposes
- Handle any errors gracefully (retry, notify administrators)

**Orphaned Files**: THE system SHALL periodically scan storage for orphaned files (files without corresponding articles or comments) and remove them.

**Deleted Content Policy**: Files from deleted content SHALL NOT be recoverable by end users, though moderators MAY retain access to deleted content for moderation audit purposes for up to 30 days.

## Attachment Validation Process

### Multi-Layer Validation Architecture

THE system SHALL validate all attachments using the following multi-layer process that occurs in order:

**Layer 1: File Type Validation**
- WHEN a file is submitted, THE system SHALL verify the file's magic number (file header bytes) matches the declared file extension
- THE system SHALL reject files where the extension doesn't match the actual file format
- Example: A file named "image.jpg" must actually be a JPEG file (starts with `FFD8FF` bytes)

**Layer 2: File Size Validation**
- WHEN a file is submitted, THE system SHALL verify the file size is within the specified limit before processing
- THE system SHALL check both individual file size and total attachment size for the article/comment
- IF either check fails, THE system SHALL reject the entire submission before uploading

**Layer 3: File Integrity Validation**
- WHEN a file is submitted, THE system SHALL verify the file is not corrupted and can be properly opened
- For images: THE system SHALL attempt to decode the image to ensure it's valid
- For documents: THE system SHALL perform basic structural validation
- IF a file cannot be opened or read, THE system SHALL reject it

**Layer 4: Security Scanning**
- WHEN a file is submitted, THE system SHALL scan the file for known malware signatures using antivirus definition files or a malware scanning service
- IF malware is detected, THE system SHALL reject the file and log the incident for moderator review
- THE system SHALL NEVER serve potentially infected files to users under any circumstances

**Layer 5: Attachment Count & Size Limits**
- WHEN a file is submitted, THE system SHALL verify adding this file would not exceed per-article or per-comment limits
- IF adding the file would exceed limits, THE system SHALL reject the file and inform the user of the remaining available space

### Comprehensive Validation Error Responses

IF any validation check fails, THEN THE system SHALL:
1. Reject the upload immediately (do not store partial/invalid files)
2. Provide a specific, user-friendly error message explaining the validation failure
3. Log the validation failure for security auditing
4. NOT store any part of the rejected file
5. Allow the user to correct the issue and retry

**Complete Error Message Catalog**:

| Validation Failure | Error Message |
|---|---|
| File type not allowed | "File type not allowed. Please upload an image (JPG, PNG, GIF, WebP) or document (PDF, DOCX, TXT, XLSX, ZIP)." |
| Individual file too large | "File size exceeds the [10/20/50] MB limit. Your file is [X] MB. Please choose a smaller file." |
| Total attachment size exceeded | "Total attachment size would exceed [100/30] MB limit. You can upload [X] more MB. Remove some files first or choose smaller files." |
| Attachment count limit exceeded | "This [article/comment] already has [5/2] attachments (maximum allowed). Remove one to add another." |
| File appears corrupted | "The file appears to be corrupted and cannot be opened. Please try uploading again." |
| Image dimensions invalid | "Image dimensions are invalid. Images must be between 100x100 and 8000x8000 pixels. Your image is [WIDTH]x[HEIGHT]." |
| Malware detected | "File appears to contain malware and was rejected for security. If you believe this is incorrect, contact support." |
| Invalid archive (ZIP) | "ZIP archive is invalid or corrupted. Please verify the file and try again." |
| Double extension detected | "File has a suspicious name pattern ([filename]). Please rename the file and try again." |
| File has no extension | "File must have a valid extension (e.g., .pdf, .jpg). Your file has no extension." |

### File Format Validation Examples

**Example 1: Valid JPEG Image**
- User uploads file named "chart.jpg"
- System checks magic numbers: `FF D8 FF` (JPEG header) ✓
- System checks MIME type: `image/jpeg` ✓
- System checks file size: 3.2 MB < 10 MB limit ✓
- System checks dimensions: 1200 x 800 pixels (within 100-8000 range) ✓
- **Result**: File accepted ✓

**Example 2: Spoofed Executable**
- User uploads file named "document.pdf"
- System checks magic numbers: `4D 5A 90 00` (Windows executable header) ✗
- Extension says PDF, but file is actually executable
- **Result**: File rejected with error "File type not allowed" ✓

**Example 3: Valid PDF Document**
- User uploads file named "research.pdf"
- System checks magic numbers: `25 50 44 46` (PDF header) ✓
- System checks file size: 15 MB < 20 MB limit ✓
- System scans for malware: No threats detected ✓
- **Result**: File accepted ✓

## Attachment Retrieval and Display

### Viewing Attachments on Articles

THE system SHALL display attachment information on articles as follows:

**Article Attachments Display Format**:
1. Below the article body text, display a section titled "Attachments" or "Files & Images"
2. Display image attachments as embedded thumbnails in a gallery format
3. Display document attachments as downloadable file links with metadata
4. For each attachment, show:
   - For images: Thumbnail preview, ability to click for full-size view
   - For documents: File icon, original filename, file size, download button

**Example Layout**:
```
Article Content Here...

─────────────────────────
Attachments (2)

Images:
[Thumbnail] [Thumbnail]

Files:
📄 research_data.pdf (2.3 MB) [Download]
📄 supplementary_notes.docx (450 KB) [Download]
```

### Viewing Attachments on Comments

THE system SHALL display comment attachments inline with the comment:

1. Display comment text
2. Below comment text, display attachments
3. For images: Show inline thumbnails
4. For documents: Show as downloadable links
5. Keep attachment display compact to maintain readability in comment threads

**Attachment Count Indicator**: THE system SHALL display the number of attachments on each comment (e.g., "Comment (2 attachments)") to give users context about the comment's content.

### Image Display & Responsive Design

Images SHALL be displayed inline in articles and comments at the following responsive dimensions:
- **Maximum display width**: 100% of container (responsive to screen size)
- **Maximum display height**: 600 pixels on desktop, 400 pixels on mobile
- **Aspect ratio**: Preserved (no distortion)
- Larger images SHALL be clickable to view at full resolution in a modal or lightbox viewer

**Mobile Optimization**: On small screens, THE system SHOULD limit image display width to prevent layout breaking.

### Document Download Mechanism

WHEN a user clicks to download an attachment, THE system SHALL:

1. **Verify Access**: Verify the user has permission to access the article/comment containing the attachment
2. **Verify Existence**: Verify the file still exists in storage
3. **Serve with Headers**: Serve the file with appropriate HTTP headers:
   - `Content-Disposition: attachment; filename="original_filename.pdf"`
   - `Content-Type: application/pdf` (appropriate MIME type)
   - `Content-Length: [file size in bytes]`
4. **Log Download**: Log the download for audit purposes (user, file, timestamp)
5. **Stream File**: Send the file to the user

**Access Control**: THE system SHALL NOT allow direct URL access to files. All file access SHALL be mediated through the application to enforce permission checks.

### Download Rate Limiting

THE system SHALL implement rate limiting to prevent abuse:
- **Per-user limit**: Maximum 100 downloads per user per hour
- **Per-file limit**: Maximum 1000 downloads per file per hour
- **Large file throttling**: Bandwidth throttling for files >50 MB

**Rate Limit Exceeded**: IF a user exceeds download rate limits, THEN THE system SHALL temporarily restrict further downloads and inform the user: "You've reached the download limit. Please wait before downloading more files."

### PDF Inline Viewing (Optional)

THE system MAY optionally display PDF files inline using a PDF viewer library, allowing users to view PDFs directly in the browser without downloading.

**Note**: This is optional; document downloads are the minimum requirement.

## Security Considerations & Best Practices

### Malware & Virus Protection

WHEN a file is uploaded, THE system SHALL:

1. **Scan for Malware**: Use established antivirus/malware scanning (ClamAV, VirusTotal API, or cloud provider scanning)
2. **Reject Infected Files**: NEVER store or serve files with detected malware
3. **Log Suspected Malware**: Log suspected malware uploads for moderator investigation
4. **Alert Administrators**: Send alerts to system administrators if malware is detected

**Scanning Tool**: Development team SHALL use an established antivirus/malware scanning library or service:
- **Open Source**: ClamAV with regular definition updates
- **Commercial**: VirusTotal API or similar service
- **Cloud Provider**: AWS Rekognition for image scanning, built-in malware detection

**False Positive Handling**: IF a legitimate file is incorrectly flagged, THE system SHALL provide an appeal mechanism for users to report the error.

### File Path Traversal Prevention

THE system SHALL prevent directory traversal attacks by:

1. **Never Using User Filenames Directly**: Do not construct file paths using user-provided filenames
2. **Use System-Generated Names**: Always use the system-generated filename pattern (timestamp + hash + original name)
3. **Validate Paths**: Validate all file path operations to ensure they stay within the attachment directory
4. **No Path Separators**: Reject any filename containing path separators (`/`, `\`, `..`, null bytes)
5. **Canonicalization**: Convert all file paths to absolute form and verify they are within the attachment directory

**Example of Blocked Attack**:
- User uploads file named "../../etc/passwd"
- System strips path separators: "etc_passwd"
- OR system rejects filename containing path separators
- Attack prevented ✓

### Secure File Serving

WHEN serving files for download, THE system SHALL:

1. **Set Security Headers**: Include appropriate HTTP security headers:
   - `Content-Disposition: attachment; filename="safe_filename.pdf"` (forces download, not display)
   - `X-Content-Type-Options: nosniff` (prevents MIME type sniffing)
   - `Content-Security-Policy: default-src 'none'` (prevents script execution)
2. **Never Expose Paths**: Don't reveal internal file paths in HTTP responses or error messages
3. **Validate Authentication**: Check user is authenticated and has access to the article/comment
4. **Use HTTPS**: All file transfers SHALL occur over HTTPS/TLS encryption
5. **Log Access**: Log all file downloads for security auditing

### Access Control & Permissions

THE system SHALL enforce strict access control for attachments:

- **Article Attachments**: Accessible to any user who can view the article (guests, members, moderators)
- **Comment Attachments**: Accessible to any user who can view the comment (guests, members, moderators)
- **Authentication Required**: Users must be authenticated to download files (or files must be on published content)
- **Deleted Content Access**: Moderators MAY access attachments from deleted articles/comments for up to 30 days for audit purposes; after 30 days, files are permanently removed

**Implementation**: THE system SHALL verify access permissions at the application layer before serving any file.

### Secure File Storage

THE system SHALL store attachment files securely:

1. **Outside Web Root**: Store files outside the publicly accessible web directory or behind access control
2. **Restricted Permissions**: Set restrictive file permissions (e.g., 0600 for files, 0700 for directories)
3. **Encrypted Transport**: Use HTTPS for all file transfers
4. **Encryption at Rest** (Optional): Encrypt files using encryption keys managed separately from the application

### Temporary File Cleanup

THE system SHALL automatically clean up temporary files created during upload and processing:

- **Temporary Upload Files**: Delete after successful processing
- **Failed Upload Artifacts**: Remove temporary files from failed uploads
- **Malware Scan Artifacts**: Clean files created during antivirus scanning
- **Cleanup Schedule**: Cleanup job runs daily to remove orphaned temporary files older than 24 hours
- **Manual Cleanup**: Administrators can manually trigger cleanup if needed

## Error Handling and Recovery

### Upload Failure Scenarios & Recovery

**Scenario 1: Upload Interrupted Mid-Transfer**
- WHEN an upload is interrupted before completion, THE system SHALL not store a partial file
- THE system SHALL clean up temporary files
- THE user SHALL be informed: "Upload interrupted. Please try again."
- THE user CAN retry the upload

**Scenario 2: Storage Space Exhausted**
- IF the system runs out of storage space, THEN THE system SHALL reject the upload
- THE user SHALL see: "Server storage is full. Please try again later."
- THE system SHALL alert administrators to expand storage capacity
- THE system SHALL maintain stability (not crash or become unstable)

**Scenario 3: Malware Scanning Timeout**
- IF malware scanning exceeds 30 seconds, THEN THE system SHALL timeout the scan
- THE file SHALL be rejected as a precaution
- THE system SHALL log the scanning timeout for investigation

**Scenario 4: File Corruption Detection**
- IF a file's content doesn't match its declared type, THE system SHALL reject the upload
- Example: File named "image.jpg" that is actually a ZIP archive
- THE user SHALL see: "File type does not match the file extension"

**Scenario 5: Database Error During Upload**
- IF a database error occurs while recording attachment metadata, THEN THE file SHALL NOT be served to users
- THE system SHALL log the error and alert administrators
- THE user SHALL see: "An error occurred while saving your file. Please try again."

### User Feedback on Errors

WHEN an upload fails, THE system SHALL:

1. **Provide Specific Error Message**: Indicate exactly what went wrong
2. **Preserve User Content**: Keep the article/comment text the user entered
3. **Allow Retry**: Enable the user to fix and retry without re-entering everything
4. **Display Prominently**: Show error messages in a visible location (not hidden)

**Error Message Examples**:
- ✓ "File size exceeds 10 MB limit. Your file is 15 MB."
- ✓ "File type not supported. Allowed types: PDF, DOCX, TXT."
- ✗ "Upload failed" (too vague)
- ✗ "Error: ENOSPC on /var/upload" (too technical)

### Logging and Monitoring

THE system SHALL log all upload activities for security and debugging:

**Logging Requirements**:
- **Successful uploads**: File type, size, user, timestamp, content type
- **Failed uploads**: Reason for failure, file type, user, timestamp
- **Malware detections**: Filename, user, timestamp, threat details
- **Rate limiting events**: User, limit exceeded, timestamp
- **Access logs**: File downloads (user, file, timestamp)

**Log Retention**: Maintain logs for at least 90 days for audit and investigation purposes.

**Monitoring**: Implement alerts for:
- Multiple malware detections in short time
- Storage space usage exceeding 80%
- High rate-limiting events
- Unusual file upload patterns

## Performance Requirements

### Upload Performance Standards

WHEN a user uploads a file:
- THE system SHALL begin processing within 1 second of completion
- Antivirus scanning SHALL complete within 30 seconds for most files (up to 50 MB)
- File storage operations SHALL complete within 5 seconds
- Users SHALL receive confirmation of successful upload within 10 seconds

### Download Performance Standards

WHEN a user downloads a file:
- THE system SHALL serve the file within 2 seconds
- For large files (>10 MB), THE system SHALL begin streaming within 1 second
- Progress indication SHALL be shown for files >5 MB

### Concurrent Upload Handling

THE system SHALL support multiple concurrent uploads:
- **Minimum concurrent uploads**: 10 simultaneous uploads per user
- **Performance impact**: Upload queue SHALL NOT block other system operations
- **Storage operations**: SHALL NOT cause delays to article/comment creation

### Thumbnail Generation Performance

THE system SHALL generate thumbnails efficiently:
- **Generation time**: Thumbnails SHALL be generated within 5 seconds of image upload
- **Non-blocking**: Thumbnail generation SHALL not block the user from completing article/comment submission
- **Caching**: Generated thumbnails SHALL be cached for fast retrieval

### Caching Strategy

THE system SHOULD implement caching to improve performance:
- **Thumbnail caching**: Thumbnails cached in memory or CDN for fast delivery
- **Frequent downloads**: Popular files cached for faster delivery
- **Cache invalidation**: When files are deleted, cache entries are immediately invalidated
- **Conditional requests**: Support ETag and Last-Modified headers to reduce bandwidth

## Data Validation Rules Summary

A comprehensive reference of all validation rules:

| Validation Rule | Requirement | Enforcement |
|---|---|---|
| File Type | Only approved formats allowed | Reject with type not supported message |
| Individual Image Size | Under 10 MB | Reject if exceeded, show size limit |
| Individual Document Size | Under 20 MB | Reject if exceeded, show size limit |
| Individual Archive Size | Under 50 MB | Reject if exceeded, show size limit |
| Article Attachment Count | Max 5 files | Prevent upload, show count limit |
| Article Total Size | Max 100 MB | Reject if would exceed, show remaining space |
| Comment Attachment Count | Max 2 files | Prevent upload, show count limit |
| Comment Total Size | Max 30 MB | Reject if would exceed, show remaining space |
| Image Dimensions | 100-8000 pixels | Reject if outside range, show dimensions |
| File Integrity | Valid, uncorrupted file | Reject corrupted files, log incident |
| Malware Scanning | No malicious content | Reject infected files, alert moderators |
| Filename Safety | No path separators | Reject unsafe filenames, use safe names |
| Path Traversal | No directory traversal | Block path traversal attempts |

## Storage Examples and Calculations

### Example 1: Article with Multiple Attachments

**Scenario**: Member creates article with mixed attachments

- Article contains: 3 images (2 MB, 3 MB, 4 MB) and 1 PDF (5 MB)
- Total attachment size: 14 MB (within 100 MB article limit) ✓
- File count: 4 files (within 5 file limit) ✓
- Image sizes: All under 10 MB limit ✓
- PDF size: 5 MB < 20 MB limit ✓

**Result**: All files accepted and article published ✓

### Example 2: Approaching Article Limits

**Scenario**: Member attempting to add another file to article near capacity limit

- Article currently has: 80 MB of attachments (4 files: 20+25+20+15 MB)
- Member attempts to upload: 25 MB PDF file
- Total would be: 105 MB (exceeds 100 MB article limit)
- System rejection: "Adding this file would exceed your 100 MB limit. You have 20 MB of space remaining. Please upload a smaller file or remove existing attachments."

**Result**: Upload rejected, remaining space communicated to user ✓

### Example 3: Comment with Image Attachments

**Scenario**: Member posting comment with images

- Comment contains: 2 images (8 MB, 6 MB)
- Total attachment size: 14 MB (within 30 MB comment limit) ✓
- File count: 2 files (at maximum 2 file limit for comments) ✓
- Member attempts to add 3rd image (7 MB)
- System rejection: "Comments can have maximum 2 attachments. Remove one file to add another."

**Result**: Upload prevented, user informed of attachment limit ✓

### Example 4: Storage Growth Projection

**Scenario**: Planning storage requirements for system growth

- Target: 1,000 published articles per month
- Average attachments per article: 2 files
- Average file sizes: 1 image (2 MB) + 1 document (3 MB) = 5 MB per article
- Monthly growth: 1,000 articles × 5 MB = 5 GB per month
- Annual growth: 5 GB × 12 months = 60 GB per year
- With 3 years history: ~180 GB + backups (doubling to 360 GB)

**Storage planning**: Recommend starting with 100 GB, scaling to 500 GB within 2 years

---

## Developer Implementation Notes

**Scope**: This document specifies **business requirements only**. All technical implementations are at the discretion of the development team, including:
- Choice of file storage backend (local filesystem, AWS S3, Azure Blob, Google Cloud Storage)
- Image processing libraries (ImageMagick, Sharp, Pillow)
- Antivirus solutions (ClamAV, VirusTotal, proprietary scanning)
- Thumbnail generation frameworks and caching strategies
- CDN implementation and cache invalidation logic
- Database schema for storing attachment metadata
- API design for file upload endpoints
- Frontend file upload widget and UX implementation

All technical decisions should be documented separately in architectural and design documentation, not in these business requirements.

---

> *This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*