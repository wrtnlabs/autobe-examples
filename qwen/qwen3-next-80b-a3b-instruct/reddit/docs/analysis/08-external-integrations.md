# External Integrations Document

## Image Hosting Integration

### Purpose
THE system SHALL integrate with a third-party image hosting service to store and serve user-uploaded images in posts and comments.

### Functional Requirements
- WHEN a user uploads an image in a post or comment, THE system SHALL accept JPEG, PNG, or WebP formats up to 5MB in size
- THE system SHALL generate a unique, non-guessable URL for each uploaded image
- WHEN an image is uploaded, THE system SHALL store the image on the external hosting service and record the URL in the database
- THE system SHALL serve the image through a CDN for optimal page load performance
- WHILE the image is being uploaded, THE system SHALL show a loading indicator to the user
- IF the image upload fails, THEN THE system SHALL display an error message: "Image upload failed. Please try again or use a different file."
- IF the image file exceeds 5MB, THEN THE system SHALL reject the upload and display: "Image too large. Maximum size is 5MB."
- IF the image format is unsupported, THEN THE system SHALL reject the upload and display: "Unsupported file format. Please use JPG, PNG, or WebP."

### Integration Requirements
- THE system SHALL use Cloudinary as the default image hosting provider
- THE system SHALL store Cloudinary API keys as encrypted environment variables
- THE system SHALL retain original images and generate processed versions (thumbnail, medium, large) auto-magically via Cloudinary transformations
- THE system SHALL use signed URLs for secure access to images with a 7-day expiration
- WHERE a Community is marked as "NSFW," THE system SHALL apply Cloudinary content safety filters to block explicit imagery

### Failure Handling
- IF the Cloudinary service is unavailable, THEN THE system SHALL attempt to retry the upload up to 3 times with 5-second intervals
- IF all retry attempts fail, THEN THE system SHALL store the image temporarily in local disk storage and queue it for re-processing when the service is restored
- THE system SHALL log all Cloudinary API failures with timestamps and error codes for monitoring
- WHERE Cloudinary is unavailable and local retry fails, THE system SHALL notify the user: "We're experiencing temporary issues with image uploads. Your post has been saved without the image. Please try again later."

### Alternatives
- IF Cloudinary is disabled by system administrator, THE system SHALL fall back to Amazon S3 with same file handling logic
- IF S3 is unavailable, THE system SHALL disable image uploads entirely and notify users: "Image uploads are temporarily unavailable."

## Email Service Provider

### Purpose
THE system SHALL use an email delivery service to send account verification, password reset, and notification emails to users.

### Functional Requirements
- WHEN a new user registers, THE system SHALL send a verification email with a unique token link
- WHEN a user requests password reset, THE system SHALL send a password reset email with a 15-minute expiry token
- WHEN a user receives a reply to their comment, THE system SHALL send a notification email if the user has email notifications enabled
- WHEN a report is approved or rejected, THE system SHALL notify the reporting user via email
- THE system SHALL include an unsubscribe link in all marketing and notification emails

### Integration Requirements
- THE system SHALL use SendGrid as the primary email service provider
- THE system SHALL use a dedicated subdomain (e.g., notifications.communityplatform.io) with SPF, DKIM, and DMARC configured
- THE system SHALL maintain an email activity log with delivery statuses (delivered, opened, bounced, clicked)
- THE system SHALL honor unsubscribe requests by immediately removing the user from mailing lists
- WHERE a user has not verified their email, THE system SHALL block all email notifications until verification is complete

### Failure Handling
- IF SendGrid API returns a 4xx error, THEN THE system SHALL log the error and prevent further sends to that email address for 24 hours
- IF SendGrid API returns a 5xx error, THEN THE system SHALL queue the email for retry up to 5 times over 72 hours
- WHERE all retries fail, THEN THE system SHALL mark the user's email as invalid and disable notifications for that address
- THE system SHALL notify admins via slack if more than 100 emails fail consecutively within 5 minutes

## Password Reset and 2FA Services

### Purpose
THE system SHALL provide secure password reset and optional two-factor authentication (2FA) for user accounts.

### Functional Requirements
- WHEN a user requests password reset, THE system SHALL generate a time-limited reset token sent via email
- WHEN a user enters a valid reset token, THE system SHALL allow them to set a new password of at least 12 characters
- THE system SHALL allow users to enable TOTP-based 2FA via Google Authenticator or Authy
- WHILE 2FA is enabled, THE system SHALL require a 6-digit code for all login attempts
- IF a user enters an incorrect 2FA code 5 times consecutively, THEN THE system SHALL lock the account for 30 minutes
- WHERE 2FA is enabled, THE system SHALL require the user to store at least one backup code during setup

### Integration Requirements
- THE system SHALL use Auth0 for centralized identity management (password reset, 2FA token generation, session control)
- THE system SHALL handle the user-facing 2FA QR code generation and validation using RFC 6238 compliant TOTP implementation
- THE system SHALL store 2FA secret keys encrypted at rest
- THE system SHALL log all 2FA attempts and flag 3+ failed attempts per 10 minutes as potential brute-force behavior

### Failure Handling
- IF Auth0 authentication service is unreachable, THEN THE system SHALL disable 2FA enrollment and password reset until service is restored
- IF a 2FA code fails validation, THEN THE system SHALL display: "Invalid verification code. Please check your authenticator app and try again."
- IF a user loses 2FA access and has no backup codes, THEN THE system SHALL allow account recovery via email verification + admin approval
- THE system SHALL send an alert to user's registered email when a new 2FA device is registered

## Analytics and Tracking Tools

### Purpose
THE system SHALL collect user behavior data for feature improvement and engagement analysis.

### Functional Requirements
- WHEN a user views a community, THE system SHALL record the community ID and timestamp
- WHEN a user clicks a post, THE system SHALL record the post ID, community ID, and user ID
- WHEN a user votes on a post or comment, THE system SHALL record the action type (upvote/downvote), target ID, and timestamp
- WHEN a user subscribes to a community, THE system SHALL record the subscription event
- WHEN a user visits their profile, THE system SHALL record the profile view event
- THE system SHALL NOT collect any personally identifiable information (PII) beyond user ID
- THE system SHALL NOT track users during anonymous (guest) visits

### Integration Requirements
- THE system SHALL use Amplitude as the primary analytics service
- THE system SHALL send events via Amplitude's REST API with batch processing (max 100 events per batch)
- THE system SHALL include all sessions in the "communityPlatform" project with consistent event naming (e.g., "post_viewed", "comment_replied")
- THE system SHALL mask IP addresses before sending them to Amplitude
- WHERE a user has opted out of analytics, THE system SHALL NOT send any events

### Opt-out Requirements
- THE system SHALL display an analytics consent banner during first login
- WHERE user declines analytics consent, THE system SHALL store their preference in local storage and suppress all future tracking
- THE system SHALL include a clear "Manage Tracking Preferences" link in the user settings page

## Abuse Detection or AI Moderation APIs

### Purpose
THE system SHALL employ AI-powered content moderation to detect and flag hate speech, harassment, spam, and inappropriate content.

### Functional Requirements
- WHEN a user submits a post or comment, THE system SHALL send the text content to an AI moderation service for analysis
- IF the AI service detects hate speech or harassment, THEN THE system SHALL flag the content and place it in a pending review queue for moderators
- IF the AI service detects spam (identical or near-identical content), THEN THE system SHALL reject the submission and display: "This content appears to be spam. Please submit original content."
- IF the AI service detects high-risk content with 95%+ confidence, THEN THE system SHALL auto-hide the content and notify moderators
- THE system SHALL disclose to users: "Your submission was reviewed by automated tools to ensure community safety."

### Integration Requirements
- THE system SHALL use Perspective API by Google as the primary content moderation provider
- THE system SHALL send text content only (not metadata or user ID), stripped of all HTML and markdown
- THE system SHALL score content using the following toxicity thresholds:
  - 0.65–0.79: Flagged for review
  - 0.80+: Auto-hidden with admin notification
- THE system SHALL cache moderation results with 4-hour TTL to prevent redundant API calls for identical content
- THE system SHALL limit API calls to 5 per user per minute to prevent abuse

### Failure Handling
- IF Perspective API is unavailable, THEN THE system SHALL allow the post/comment to be published without moderation
- THE system SHALL log all failed API calls and notify admins if more than 10% of requests fail over 10 minutes
- WHERE AI moderation fails, THE system SHALL not inform the user of the failure to prevent exploitation

## Social Login Providers

### Purpose
THE system SHALL allow users to register or login via third-party social identity providers.

### Functional Requirements
- WHEN a user selects social login, THE system SHALL redirect to the selected provider
- THE system SHALL accept OAuth2 login from Google, Apple, Microsoft, and Twitter
- WHEN a user logs in via social, THE system SHALL create a new account if not already exists
- THE system SHALL bind social account to existing local account if user requests link
- WHERE a user logs in via Google, THE system SHALL use only the verified email to populate the account
- THE system SHALL NOT request additional permissions beyond email and name

### Integration Requirements
- THE system SHALL use Auth0 to normalize all social provider tokens to a consistent schema
- THE system SHALL follow OAuth2 PKCE flow for native mobile and desktop clients
- THE system SHALL store external provider ID and provider name for each user (e.g., "google_123456789")
- THE system SHALL enforce email uniqueness across all login providers
- THE system SHALL display provider-specific icons for each social login option

### Failure Handling
- IF a social provider's OAuth endpoint is unreachable, THE system SHALL display: "Unable to contact [Provider]. Please try again or use email login."
- IF email from provider is missing or invalid, THEN THE system SHALL prompt user to enter a valid email manually
- IF multiple accounts are detected with the same email from different providers, THEN THE system SHALL request user to merge accounts

## Payment Processing (if monetized)

### Purpose
THE system SHALL support optional paid features including community boosting, custom themes, and premium memberships.

### Functional Requirements
- WHEN a user subscribes to Premium, THE system SHALL charge recurring monthly fee via credit card or PayPal
- WHEN a user purchases a community boost, THE system SHALL charge a one-time fee and mark the community as "boosted" for 30 days
- THE system SHALL provide invoices for all transactions
- THE system SHALL support tax compliance for EU, US, and CA jurisdictions
- IF a payment fails, THEN THE system SHALL retry once after 3 days
- IF payment fails after retry, THEN THE system SHALL downgrade the user's subscription and notify them

### Integration Requirements
- THE system SHALL use Stripe as the exclusive payment processor
- THE system SHALL store only Stripe customer and payment method IDs, never card numbers
- THE system SHALL support webhooks for payment success, failure, subscription renewal, and cancellation
- THE system SHALL provide a user-facing portal for viewing transaction history and managing subscriptions
- THE system SHALL comply with PCI DSS Level 1 security standards

### Failure Handling
- IF Stripe returns payment declined (code 2000–2999), THEN THE system SHALL notify: "Your payment was declined. Please check your card details or try another method."
- IF Stripe service is down, THEN THE system SHALL prevent all new subscription purchases and display: "Payment system is temporarily unavailable. Please try again later."
- THE system SHALL immediately revoke premium features if payment fails and user is not in a grace period

## Notification Services

### Purpose
THE system SHALL deliver real-time and asynchronous notifications to users via push, email, and in-app alerts.

### Functional Requirements
- WHEN a user receives a reply, THE system SHALL send an in-app notification
- WHEN a user is mentioned (@username), THE system SHALL send an in-app and email notification
- WHEN a post a user subscribed to gains 10+ upvotes, THE system SHALL send a digest notification
- WHEN a moderator deletes a user's post, THE system SHALL send a notification explaining the reason (if provided)
- WHEN a user's karma increases by 100+, THE system SHALL send a badge notification

### Integration Requirements
- THE system SHALL use Firebase Cloud Messaging (FCM) for mobile push notifications (Android/iOS)
- THE system SHALL use Amazon Simple Notification Service (SNS) for web push notifications
- THE system SHALL store device tokens and subscription topics encrypted at rest
- THE system SHALL allow users to mute notification types individually in settings
- THE system SHALL throttle notifications to maximum 5 per hour from the same source to prevent spam

### Failure Handling
- IF FCM/SNS delivery fails, THE system SHALL queue the notification for retry up to 48 hours
- IF device token becomes invalid, THE system SHALL remove it from the notification system
- IF server fails to send notifications for 15+ minutes, THE system SHALL trigger an alert to devops

## CDN for Static Assets

### Purpose
THE system SHALL use a Content Delivery Network to serve static assets (CSS, JS, images, fonts) for optimal global performance.

### Functional Requirements
- WHEN a user accesses a community page, THE system SHALL serve all static assets from CDN
- THE system SHALL cache assets with 1-year expiration headers
- THE system SHALL update asset versions on every deployment using content hashes (e.g., style.7a8f2d.css)
- THE system SHALL serve uncompressed assets from CDN only when requested by legacy browsers
- WHEN a user changes theme, THE system SHALL load theme-specific CSS from CDN

### Integration Requirements
- THE system SHALL use Cloudflare as the primary CDN
- THE system SHALL deploy static files to Cloudflare via API on every git push to production
- THE system SHALL configure CDN to gzip compress text-based assets (HTML, CSS, JS)
- THE system SHALL enable HTTP/3 and Brotli compression
- THE system SHALL purge CDN cache immediately after deployments

### Failure Handling
- IF Cloudflare is unreachable, THE system SHALL fall back to serving assets directly from the application server
- IF a static asset fails to load (404), THE system SHALL log the event and serve a minimal fallback version of the page

## Logging and Monitoring Services

### Purpose
THE system SHALL collect, store, and analyze system logs and metrics for performance, security, and debugging.

### Functional Requirements
- WHEN a request is received, THE system SHALL log: HTTP status code, endpoint, response time, user ID (if authenticated)
- WHEN a server error occurs, THE system SHALL log stack trace and request payload
- WHEN an external integration fails, THE system SHALL log the service name, error code, and retry attempts
- WHEN a user logs in or logs out, THE system SHALL log the event with IP address and device type
- WHEN rate limiting is triggered, THE system SHALL log the user ID, endpoint, and count

### Integration Requirements
- THE system SHALL use Datadog for centralized log aggregation and metric monitoring
- THE system SHALL send application logs via HTTP/3 over TLS using structured JSON format
- THE system SHALL tag all logs with: environment (prod/staging), service (communityPlatform), user_role
- THE system SHALL create custom dashboards for: average response time, error rate, unique users/day, notifications sent, image upload success rate
- THE system SHALL set up alerts for:
  - Error rate > 5% for 5 minutes
  - Response time > 2s for 80% of requests
  - Auth failures > 500 events in 10 minutes

### Failure Handling
- IF Datadog ingestion endpoint becomes unreachable, THE system SHALL buffer logs locally on disk with size limit of 10GB and retry every 15 seconds
- IF local disk fills, THE system SHALL drop logs temporarily until space is freed, but continue accepting user requests
- THE system SHALL send email alert to devops team if logs are cycling for over 3 hours

### Retention Policy
- The system SHALL retain transaction logs for 90 days
- The system SHALL retain security logs (login attempts, violations) for 1 year
- The system SHALL automatically delete logs older than retention limits