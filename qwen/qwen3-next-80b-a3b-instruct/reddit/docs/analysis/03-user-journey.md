# CommunityBbs User Journey

## Registration Journey

WHEN a guest visits the platform for the first time, THE system SHALL display a landing page with clear options to register or log in.

WHEN a guest clicks "Register", THE system SHALL present a form requiring only email address and password.

WHEN a guest submits registration information, THE system SHALL validate the email format and password strength (minimum 8 characters, including number and symbol).

IF password does not meet strength requirements, THEN THE system SHALL display validation error: "Password must be at least 8 characters with one number and one symbol".

IF email is already registered, THEN THE system SHALL display validation error: "This email is already in use. Did you forget your password?".

WHEN registration is successful, THE system SHALL send a verification email to the provided address with a unique activation link.

WHILE user has not verified email, THE system SHALL restrict all posting, commenting, and voting functionality.

WHEN user clicks verification link, THE system SHALL activate the account and redirect to the communities feed.

WHEN registration fails due to system error, THE system SHALL display generic message: "Registration failed. Please try again later." and log error for admin review.

## First-Time Posting

WHEN a verified member visits the communities feed, THE system SHALL display a "Create Post" button in the top toolbar.

WHEN member clicks "Create Post", THE system SHALL open a modal with three content type options: Text, Link, Image.

WHEN member selects "Text", THE system SHALL display a text editor with 5000 character limit.

WHEN member selects "Link", THE system SHALL require URL field and optional title field.

WHEN member submits link, THE system SHALL validate URL format and fetch meta title and description from the website.

WHEN member selects "Image", THE system SHALL open file picker with allowed formats: JPG, PNG, GIF (max 10MB).

WHEN image exceeds 10MB, THEN THE system SHALL display error: "Images must be under 10MB in size".

WHEN member submits any post type, THE system SHALL assign recipient community based on selected subreddit (default: "all")

WHEN post is submitted, THE system SHALL create a new post record with status "pending" if post contains keywords flagged by moderation system.

IF post contains UPPERCASE TITLE, THEN THE system SHALL display warning: "Your post title is in all uppercase. Consider using normal capitalization." but allow submission.

IF post contains 10+ links, THEN THE system SHALL flag post for human moderation.

WHEN post is approved, THE system SHALL display success message: "Your post has been published!" and show post in feed.

WHEN post is rejected, THE system SHALL notify user: "Your post has been removed for violating community guidelines. You can appeal this decision."

## Discovering Communities

WHEN a member navigates to the "Browse Communities" section, THE system SHALL display trending communities sorted by subscriber count.

WHEN member searches for community, THE system SHALL return results matching community name or description, ranked by relevance.

WHILE browsing communities, THE system SHALL display each community's subscriber count, activity level, and adherence score (1-100).

WHEN member clicks on community, THE system SHALL show the community's front page with rules, moderators, and recent posts.

WHEN member clicks "Join" on community, THE system SHALL add community to member's subscription list.

IF member attempts to join community with more than 5000 members, THEN THE system SHALL display message: "This community has reached maximum capacity. You can still view content but cannot comment or post."

WHEN member joins first community, THE system SHALL show 5 recommended related communities.

WHEN member has joined 5 communities, THE system SHALL begin recommending communities based on post engagement patterns.

IF member attempts to create community with name already taken, THEN THE system SHALL display error: "This community name is already in use. Try a different name."

WHEN member creates new community, THE system SHALL auto-assign member as first moderator.

## Engaging with Content

WHEN a member views a post in feed, THE system SHALL display voting buttons (upvote/downvote) and comment count.

WHEN member clicks upvote, THE system SHALL increment post's vote count by 1 and disable further voting on that post.

WHEN member clicks downvote, THE system SHALL decrement post's vote count by 1 and disable further voting on that post.

WHEN member changes vote from up to down (or vice versa), THE system SHALL reverse previous vote and apply new vote.

WHILE post score is between -5 and 5, THE system SHALL display normal vote count.

WHEN post score exceeds 100, THE system SHALL display "🔥" next to vote count.

WHEN post score is below -10, THE system SHALL display "🔴 Reported" and hide in default feeds.

WHEN member clicks comment count, THE system SHALL load all direct comments on the post.

WHEN member clicks "Reply" under comment, THE system SHALL open text field for nested reply.

WHILE reply depth is below 7 levels, THE system SHALL allow new replies.

WHEN reply depth reaches 7, THE system SHALL hide additional reply buttons and display: "Maximum comment depth reached."

WHEN user submits comment, THE system SHALL validate text length (max 2000 characters).

IF comment exceeds 2000 characters, THEN THE system SHALL truncate and display warning: "Comment has been truncated to 2000 characters."

WHEN comment contains suspected spam URL, THE system SHALL flag for review and delay public display.

WHEN comment contains 3+ consecutive emojis, THE system SHALL display warning: "Comments with excessive emojis may be removed. Use sparingly." but allow submission.

## Building Reputation

WHEN member receives upvote on post, THE system SHALL award +1 karma.

WHEN member receives downvote on post, THE system SHALL deduct -1 karma.

WHEN member receives upvote on comment, THE system SHALL award +0.5 karma.

WHEN member receives downvote on comment, THE system SHALL deduct -0.5 karma.

WHEN member balances karma over time (e.g. more upvotes than downvotes), THE system SHALL award bonus karma: +1 for every 20 net positive karma points.

WHEN member has > 100 karma, THE system SHALL display "Karma: 100+" next to username.

WHEN member has > 500 karma, THE system SHALL display blue badge: "Active Member".

WHEN member has > 1000 karma, THE system SHALL display gold badge: "Community Contributor".

WHEN member has > 1500 karma, THE system SHALL display crystal badge: "Veteran Member".

WHEN member has > 5000 karma, THE system SHALL display platinum badge: "Legendary Contributor".

WHILE member's karma is between 0 and 99, THE system SHALL restrict ability to create new communities.

WHEN member's karma is below 0, THE system SHALL display warning: "Your karma is below zero. Avoid low-quality content to rebuild your reputation."

WHEN member's karma dips below -100 for three consecutive days, THE system SHALL disable posting privileges for 7 days.

## Becoming a Moderator

WHEN admin assigns moderator to community, THE system SHALL notify member: "You've been appointed moderator of [Community Name]."

WHEN member receives moderator rights, THE system SHALL display "Moderator" badge next to username.

WHEN moderator clicks "Moderation Tools", THE system SHALL display: Remove Post, Remove Comment, Ban User, Rename Community, Set Rules, Approve Post.

WHEN moderator removes post, THE system SHALL notify user: "Your post has been removed by a moderator for violating [Rule Name]."

WHEN moderator bans user, THE system SHALL notify user: "You have been banned from [Community Name] for [Reason]. Upload appeal request via support."

WHEN moderator approves pending post, THE system SHALL change status to "published" and notify submitter.

WHEN member has hosted active community for 30+ days with 100+ members, THE system SHALL suggest member for admin review.

WHEN member has received 3+ admin-appointed moderator roles across different communities, THE system SHALL override karma requirement and offer admin review.

WHEN member is reviewed by admin for elevated privileges, THE system SHALL conduct background check: post history, comment quality, response to moderation, doctoring participation.

WHEN member is promoted to admin, THE system SHALL send encrypted notification and grant "Admin Access" panel.

WHEN admin reaches platform limit (10), THE system SHALL lock admin creation and require board approval.

## Edge Cases and Error States

IF system detects multiple registrations from same IP address within 5 minutes, THEN THE system SHALL trigger CAPTCHA for all subsequent registrations from that IP.

IF member changes email address, THE system SHALL require re-verification and temporarily suspend all posting privileges for 24 hours.

IF user is banned from 3+ communities, THE system SHALL automatically suspend account for 30 days.

IF member reports 5+ items incorrectly within 24 hours, THE system SHALL lock reporting privileges for 48 hours.

WHEN system detects automated voting behavior (100+ votes in 1 minute), THE system SHALL reverse votes and mark account for review.

WHEN member attempts to join community while banned from same community, THE system SHALL display: "You are banned from this community. Contact moderators for appeal."

WHWhen member's password is compromised (based on external breach databases), THE system SHALL force password reset and notify user via email.

WHEN user leaves community after being assigned elder moderator, THE system SHALL keep moderator permissions active but reduce authority scores by 50%.

WHEN a community has no active moderators for 90 days, THE system SHALL reassign moderator privileges to top karma user in that community.

WHEN multiple admin accounts exist within same organization, THE system SHALL require two-factor authentication for all admin actions.

WHEN user has submitted 10+ posts in less than 10 minutes, THE system SHALL temporarily limit to 1 post per 30 minutes.

WHEN user's comment contains multiple flagged keywords, THE system SHALL auto-remove comment and issue first warning.

WHEN a post is reported by 5+ users within 1 hour, THE system SHALL auto-hide it and notify all moderators of associated community.

WHEN a member has negative karma for 14+ consecutive days, THE system SHALL display: "Your account is inactive. Log in and contribute to revive your account."

WHEN community is flagged for violation, THE system SHALL disable posting unless all pending reports are resolved within 72 hours.

WHEN search returns zero results, THE system SHALL display: "No communities found. Try different keywords or browse popular communities." with recommended communities.

WHEN user tries to upvote their own content, THE system SHALL display: "You cannot vote on your own posts or comments."

WHEN user tries to create community with profanity in name, THE system SHALL block creation and note: "Community names cannot contain profanity."

WHEN user attempts to report a post while logged out, THE system SHALL redirect to login page with error: "You must be logged in to report content."

WHEN user has unused account for 90 days, THE system SHALL flag for potential deletion and notify user via email.

WHEN moderator modifies post, THE system SHALL append "[Modified by moderator] " to original text with timestamp.

WHEN post is deleted by moderator, THEN THE system SHALL keep record internally and notify admin.

WHEN comment is edited, THE system SHALL display "Edited " with original timestamp.

WHEN user tries to create community with name already taken but with different capitalization, THE system SHALL treat it as duplicate and reject.

WHEN system detects payment fraud attempt (wallet linking outside platform), THE system SHALL block account and notify legal team.

WHEN user activates timezone-based posting schedule, THE system SHALL recommend optimal posting times based on community activity patterns.

WHEN a community has been shadow-banned by 10+ members, THE system SHALL initiate community review by admin.

WHEN member's profile has never posted or commented for 180 days, THE system SHALL mark as "Inactive."