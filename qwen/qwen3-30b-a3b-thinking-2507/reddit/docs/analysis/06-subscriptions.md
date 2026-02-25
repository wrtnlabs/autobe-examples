# Reddit-like Community Platform Requirements Specification

## 1. Service Overview

The Reddit-like Community Platform enables users to create, subscribe to, and engage with communities through posts, comments, and voting systems. All interactions are governed by a robust karma scoring system designed to promote quality content and active community participation.

## 2. User Account Requirements

### Core Account Management

WHEN a new user registers the system, THE system SHALL validate email format and password strength (minimum 8 characters, containing one uppercase, one lowercase, and one special character).

WHEN a user logs in, THE system SHALL generate a JWT token valid for 24 hours with refresh token support.

WHEN a user changes their password, THE system SHALL immediately invalidate all active sessions.

IF a user attempts to reset password with an unregistered email, THEN THE system SHALL display 'No account found with that email' within 2 seconds.

### Account Management Workflows

#### User Registration Workflow

1. User enters valid email and password (with confirmation)
2. System validates email format and password strength
3. System sends confirmation email with verification link
4. User clicks verification link
5. System activates account and redirects to login

The system SHALL send a welcome email with platform tour instructions within 1 minute of registration.

#### Account Deletion

WHEN a user deletes their account through profile settings, THE system SHALL:
- Archive all posts and comments
- Remove user from all community subscriptions
- Update karma calculations to reflect deletion
- Confirm deletion via email notification

The system SHALL require 30-second confirmation period before final deletion, displaying 'Account will be permanently deleted in 30 seconds'.