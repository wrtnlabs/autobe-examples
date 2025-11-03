# Discussion Board User Actors

### 1. User Actor Definition

#### Major User Categories Defined in This Service

This discussion board service defines only one primary user category that aligns with minimal requirements:

| User Actor | Description | Business Purpose |
|------------|-------------|------------------|
| **Guest** | Unregistered users who can access the discussion board and post content immediately without registration | To enable open, frictionless participation for casual users while minimizing barriers to entry |

*All users are automatically classified as Guest until they register (but registration is not required for posting).*

### 2. Permission Structure

#### Granted Permissions for Each User Actor

**Guest** (All users begin as this actor type):

- THE guest SHALL be allowed to create new discussion posts with title, content, and multimedia attachments
- THE guest SHALL be allowed to view other posts in the public discussion feed
- THE guest SHALL be allowed to upload image files (JPEG, PNG) and PDF documents as attachments
- THE guest SHALL NOT be allowed to edit or delete posts created by other guests
- THE guest SHALL NOT be allowed to access comment management or moderation tools

### 3. Authentication Requirements

#### System-Wide User Authentication Flow

- WHEN a participant arrives at the discussion board, THE system SHALL allow them to begin creating content immediately without authentication
- WHEN a guest creates a post, THE system SHALL log the IP address and visitor identifier for content tracking
- THE system SHALL NOT require any account registration for basic post creation
- THE system SHALL provide a basic "Guest Posting" indicator for all content created without registration

*Note: There are no specific authentication requirements for account management since we're keeping the system minimal as requested. All users are treated as guests by default.*

### 4. Authorization Scenarios

#### Business-First User Interaction Scenarios

#### Scenario 1: Guest User Creates a New Post

WHEN a new visitor accesses the discussion board, THE system SHALL present a simple post creation form without requiring login.

THE guest SHALL be able to enter a post title, compose content, and attach images or PDF files.

THE system SHALL confirm the post was submitted and display it in the general public feed immediately.

#### Scenario 2: Guest User Views Public Discussion

WHEN a user opens the discussion page, THE system SHALL display the latest posts sorted by creation time.

THE system SHALL show each post including title, content snippet, and any attached multimedia.

THE guest SHALL be able to view all posts without authentication.

#### Scenario 3: Content Creation with Attachment

WHEN a guest selects "Attach File" during post creation, THE system SHALL accept image files (.jpg, .jpeg, .png) and PDF documents (.pdf).

THE system SHALL display the filename and size for each attachment.

THE system SHALL reject formats outside of permitted file types.

#### Scenario 4: Content Validation

WHEN a guest submits a post, THE system SHALL verify:

- Title must be 1-255 characters
- Content must be at least 10 characters
- Attachments must be within size limit of 10MB

IF any validation fails, THEN THE system SHALL display a specific error message to the guest.

### 5. Access Control Matrix

#### Permission Specifications by Actor Type

| Permission | Guest | Admin | SuperAdmin |
|------------|-------|-------|------------|
| Create new posts | ✅ | ✅ | ✅ |
| View all posts | ✅ | ✅ | ✅ |
| Edit their own posts | ❌ | ✅ | ✅ |
| Delete their own posts | ❌ | ✅ | ✅ |
| Manage comments | ❌ | ❌ | ✅ |
| Moderate content | ❌ | ❌ | ✅ |

*Note: This matrix is simplified to reflect the minimal scope requested. The primary actor is Guest, with no administrative roles required for basic functionality as per user's minimal setup preference.*

### Revenue Model Consideration

This is a simple discussion board with a basic business model:

- Primary revenue source: Advertising shown on the public discussion page
- Value proposition: Easy access for both poster and viewer without registration barriers
- Monetization strategy: Focus on ad revenue rather than user subscription

### Success Metrics

- Target: 100 daily active guests within the first 3 months
- Primary success metric: Number of daily new posts created
- Secondary metric: Engagement rate on public post views

### Error Handling from User Perspective

- WHEN a guest tries to upload a non-allowed file type, THEN THE system SHALL display: "Sorry, this file type is not permitted. Only images (JPG, PNG) and PDF documents are allowed."

- WHEN a guest creates a post with title longer than 255 characters, THEN THE system SHALL display: "Title is too long. Please limit to 255 characters."

- WHEN a guest's post content is less than 10 characters, THEN THE system SHALL display: "Post content must be at least 10 characters."

### System Behavior Constraints

- SYSTEM SHALL NOT implement any user account database
- SYSTEM SHALL NOT require email validation or passwords
- SYSTEM SHALL NOT track individual user history beyond IP address linkage
- SYSTEM SHALL NOT retain personal information from unregistered users

### User Journey Summary

The discussion board uses a single-user journey through the guest process, which is completely self-contained:

```mermaid
graph LR
  A[Guest Arrives at Board] --> B[Reads Public Content]
  B --> C[Creates New Post]
  C --> D[Attaches File if Needed]
  D --> E[Submits Post]
  E --> F[Post Appears Publicly]
  F --> G[Other Guests See Post]
```

This flow demonstrates the complete minimal journey - no registration barriers, no account management, just simple publishing and viewing.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*