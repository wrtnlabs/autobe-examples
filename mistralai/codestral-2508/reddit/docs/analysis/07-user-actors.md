# User Actors and Permissions for Reddit-like Community Platform

## User Actors

### User

- **Description**: Authenticated users who can create communities, post content, vote, comment, and manage their profiles.
- **Characteristics**:
   - Can create and join communities
   - Can post text, links, or images
   - Can upvote/downvote posts and comments
   - Can comment on posts with nested replies
   - Can view and edit their profiles
   - Can subscribe to communities
   - Can report inappropriate content

### Moderator

- **Description**: Administrators who can manage communities, moderate content, and handle reports.
- **Characteristics**:
   - Can create and manage communities
   - Can moderate posts and comments
   - Can handle reports of inappropriate content
   - Can assign and manage other moderators

## Permissions

### User Permissions

- **Create Communities**: Users can create new communities.
- **Post Content**: Users can post text, links, or images in communities.
- **Vote**: Users can upvote or downvote posts and comments.
- **Comment**: Users can comment on posts with nested replies.
- **View and Edit Profiles**: Users can view and edit their profiles.
- **Subscribe to Communities**: Users can subscribe to communities.
- **Report Content**: Users can report inappropriate content.

### Moderator Permissions

- **Manage Communities**: Moderators can create and manage communities.
- **Moderate Content**: Moderators can moderate posts and comments.
- **Handle Reports**: Moderators can handle reports of inappropriate content.
- **Manage Moderators**: Moderators can assign and manage other moderators.

## Authentication Requirements

### Core Authentication Functions

- Users can register with email and password
- Users can log in to access their account
- Users can log out to end their session
- System maintains user sessions securely
- Users can verify their email address
- Users can reset forgotten passwords
- Users can change their password
- Users can revoke access from all devices

## User Actor Structure

### User

- **Description**: Authenticated users who can create communities, post content, vote, comment, and manage their profiles.
- **Permissions**:
   - Create communities
   - Post content
   - Vote on posts and comments
   - Comment on posts
   - View and edit profiles
   - Subscribe to communities
   - Report inappropriate content

### Moderator

- **Description**: Administrators who can manage communities, moderate content, and handle reports.
- **Permissions**:
   - Manage communities
   - Moderate posts and comments
   - Handle reports of inappropriate content
   - Assign and manage other moderators

## Token Management

- **Token Type**: JWT (JSON Web Tokens)
- **Access Token Expiration**: 15 minutes
- **Refresh Token Expiration**: 7 days
- **Token Storage**: httpOnly cookie
- **JWT Payload**:
   - userId
   - role
   - permissions array
- **JWT Secret Key Management**: Securely stored and rotated periodically

## Permission Matrix

| Action | User | Moderator |
|--------|------|-----------|
| Create Communities | ✅ | ✅ |
| Post Content | ✅ | ✅ |
| Vote | ✅ | ✅ |
| Comment | ✅ | ✅ |
| View and Edit Profiles | ✅ | ✅ |
| Subscribe to Communities | ✅ | ✅ |
| Report Content | ✅ | ✅ |
| Manage Communities | ❌ | ✅ |
| Moderate Content | ❌ | ✅ |
| Handle Reports | ❌ | ✅ |
| Manage Moderators | ❌ | ✅ |

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*