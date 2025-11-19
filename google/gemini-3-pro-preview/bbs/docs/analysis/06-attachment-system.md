# Attachment System Requirements

## 1. Overview
This document outlines the business requirements for the file and image attachment system within the **ecoPoliDiscuss** platform. As an economic and political discussion board, the ability to share visual data (charts, graphs) and reference materials (reports, documents) is essential for high-quality discourse. This system follows the project's core philosophy of simplicity and minimalism.

## 2. Supported File Definitions

### 2.1. Image Attachments
To support economic charts and political infographics, the system must handle standard web images.

- **Supported Formats**: JPG, JPEG, PNG, GIF.
- **Business Goal**: Allow users to visually represent data within their discussions.
- **Maximum Size**: 5MB per image (sufficient for high-quality charts but prevents server overload).

### 2.2. Document Attachments
To share reports, policy documents, or datasets.

- **Supported Formats**: PDF (documents), XLSX/CSV (economic data), DOCX (text documents).
- **Business Goal**: Allow users to provide source material and detailed data analysis.
- **Maximum Size**: 10MB per file.

### 2.3. Quantity Limits
To maintain the "simple" nature of the board and prevent spam:
- **Limit**: Maximum of **5 attachments** total per single discussion thread.

## 3. Functional Requirements (EARS)

### 3.1. File Uploading
- **WHEN** a `generalUser` creates or edits a discussion thread, **THE** system **SHALL** provide an option to select files from their local device.
- **IF** a selected file type is not in the allowed list, **THEN THE** system **SHALL** reject the file and display a specific error message.
- **IF** a selected file exceeds the defined size limit, **THEN THE** system **SHALL** prevent the upload and notify the user.
- **WHILE** a file is uploading, **THE** system **SHALL** indicate progress to the user to prevent duplicate submission attempts.
- **WHERE** a post already has the maximum number of attachments (5), **THE** system **SHALL** disable the upload function for that post.

### 3.2. Attachment Display
- **WHEN** a discussion thread containing images is viewed, **THE** system **SHALL** render the images directly within the post view (responsive to screen size).
- **WHEN** a discussion thread containing document files is viewed, **THE** system **SHALL** display them as a list of downloadable links with file names and sizes.
- **THE** system **SHALL** associate all uploaded files strictly with the `discussion thread` ID they belong to.

### 3.3. File Management
- **WHEN** a `generalUser` is editing their own post, **THE** system **SHALL** allow the removal of existing attachments.
- **WHEN** a `boardAdmin` deletes a discussion thread, **THE** system **SHALL** mark associated files for deletion/cleanup.

## 4. User Workflows

### 4.1. Uploading an Economic Chart
1.  User starts a new thread about "Inflation Trends".
2.  User writes text content.
3.  User clicks "Attach File".
4.  User selects `inflation_chart_2024.png`.
5.  System validates standard PNG format and size < 5MB.
6.  System confirms upload success.
7.  User submits thread.

### 4.2. Sharing a Policy PDF
1.  User replies to a thread or creates a new one.
2.  User attaches `policy_draft_v1.pdf`.
3.  System validates PDF format.
4.  Upon publication, a download link "policy_draft_v1.pdf (2.4MB)" appears at the bottom of the post.

## 5. Security & Validation Rules

### 5.1. Permission Control
- **IF** a user is a `visitor` (unauthenticated), **THEN THE** system **SHALL** restrict all upload capabilities (Read Only).
- **THE** system **SHALL** allow `visitor` actors to view images and download document attachments without logging in.
- **THE** system **SHALL** require `generalUser` authentication for any file upload action.

### 5.2. Content Safety
- **THE** system **SHALL** sanitize original filenames to prevent path traversal or script injection attacks before storage.
- **THE** system **SHALL** validate the file extension against the actual file MIME type to prevent spoofing (e.g., renaming an .exe to .jpg).

## 6. Error Handling Scenarios

### 6.1. User-Facing Errors
| Scenario | System Response |
| :--- | :--- |
| User tries to upload `.exe` file | "Invalid file type. Only Images/PDF/Docs allowed." |
| User tries to upload 50MB video | "File too large. Maximum limit is 5MB for images, 10MB for docs." |
| Upload interrupted by network | "Upload failed. Please check your connection and try again." |
| User tries to upload 6th file | "Maximum attachment limit (5) reached for this post." |

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, object storage selection, etc.) are at the discretion of the development team.*