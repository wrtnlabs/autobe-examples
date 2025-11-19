# User Actors and Authentication Requirements

## Overview
This document outlines the user actors, their capabilities, and the authentication mechanisms for the simple economic/political discussion board.

## User Actors

### 1. Registered User
- Can create, edit, and delete their own articles
- Can comment on articles
- Has a unique username and email

### 2. Moderator
- Can manage all content (articles and comments)
- Can moderate discussions
- Can handle user reports
- Has elevated permissions to maintain community standards

### 3. Guest User
- Can view public content
- Can read articles and comments
- Cannot create or edit content

## Authentication Requirements

1. **Registration Process**:
   - Users can register with email and password
   - Email verification required
   - Username must be unique

2. **Login Process**:
   - Users can log in with email/username and password
   - Password recovery mechanism available

3. **Session Management**:
   - Sessions should be maintained securely
   - Timeout for inactive sessions

## Authorization Rules

1. **Content Ownership**:
   - Registered users can manage their own content
   - Moderators can manage all content

2. **Permission Matrix**:

| Action | Registered User | Moderator | Guest |
|--------|-----------------|-----------|-------|
| Create Article | ✅ | ✅ | ❌ |
| Edit Article | ✅ (own) | ✅ (all) | ❌ |
| Delete Article | ✅ (own) | ✅ (all) | ❌ |
| Comment on Article | ✅ | ✅ | ❌ |
| View Article | ✅ | ✅ | ✅ |

## Security Considerations
- Passwords must be stored securely (hashed)
- Email verification required for registration
- Secure session management practices
