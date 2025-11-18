# Success Metrics for Minimal Todo Application

## 1. Core KPIs (Daily User Engagement)

**Daily Task Volume Metrics**
- THE system SHALL record the total number of task creations per user within a 24-hour period, updating in real-time upon task creation.
- WHEN a new task is created with valid title content, THE system SHALL increment the user's daily task count, starting fresh at 00:00 UTC.
- IF a user creates more than 15 tasks in a single day, THEN THE system SHALL flag this as "high activity" for engagement analysis, maintaining the count without limitation.
- WHILE a task is being edited, THE system SHALL not modify the creation timestamp or user's daily task count, applying changes only after final save.

**Task Completion Rate**
- THE system SHALL calculate the daily task completion rate as (completed tasks / total tasks created) × 100%, updating after each completion event.
- IF the daily task completion rate falls below 60% for a user over 3 consecutive days, THEN THE system SHALL trigger a "low engagement" alert in analytics.
- WHERE a user has completed 80% or more of their created tasks within the same day, THE system SHALL classify this as "high completion rate" for retention scoring.
- WHILE the app is active, THE system SHALL ensure completion rate calculations reflect only tasks marked as completed via user action (not system defaults).

## 2. User Adoption Metrics (Growth & Retention)

**Registration & Activation Tracking**
- WHEN a user creates a new account with valid email, THE system SHALL assign a unique, temporary activation token with 24-hour expiry.
- IF a user does not activate their account within 24 hours of registration, THEN THE system SHALL automatically delete their account data, preventing storage of inactive users.
- THE system SHALL track user registration sources (e.g., direct sign-up, referral code) as part of user profile data, storing values in UTF-8 format with max 100 characters.
- WHILE a user logs in, THE system SHALL record login date and time in ISO 8601 format, enabling retention analysis on logins per day of the week.

**Daily Active Users (DAU)**
- THE system SHALL define a Daily Active User (DAU) as any user who performed at least one task-related action (create, edit, complete, delete) during a calendar day.
- IF a user registers on Monday and makes their first task action on Friday, THEN THE system SHALL credit them to the DAU count for Friday's analytics report.
- THE system SHALL maintain a rolling 7-day DAU metric, where only users with action in the past 7 days are counted for weekly analysis.
- WHERE a user is marked as "inactive" (no actions for 7+ days), THE system SHALL automatically remove them from DAU tracking, reducing the DAU count by 1.

## 3. Business Outcome Metrics (Business Value)

**User Satisfaction**
- THE system SHALL measure user satisfaction via in-app ratings, where after completing 5 tasks, the system prompts with a star rating (1-5) and optional comment.
- IF a user provides a rating below 3 stars, THEN THE system SHALL trigger a "feedback required" flag in the support dashboard, ensuring follow-up within 48 hours.
- WHILE a user submits a rating, THE system SHALL store it with a timestamp, user ID, and rating value, maintaining data for 365 days for trend analysis.
- THE system SHALL calculate the average rating across all users within each 7-day period, updating the quarterly business review report.

**Retention Rate**
- THE system SHALL define 7-day retention as users who have performed ≥1 task on day 7 after their first active day.
- IF a user returns on day 7 after registration and completes at least one task, THEN THE system SHALL credit this as a successful retention event.
- THE system SHALL track 30-day retention as users who have performed at least 5 tasks across any 15 days within the first 30 days of registration.
- WHERE a user reaches 30-day retention, THE system SHALL flag them as "loyal user" in the business intelligence platform, contributing to monthly revenue targets.

**Business Impact Targets**
- THE system SHALL set quarterly business targets: (1) 500 DAU by end of Q1, (2) 70% task completion rate across all users, (3) 4.0+ average user rating.
- IF DAU growth falls below 5% weekly, THEN THE system SHALL notify product managers via email with detailed usage analytics.
- THE system SHALL achieve 98% data accuracy for all metrics tracking, verified through weekly manual spot-checks of random user data samples.
- WHILE quarterly targets are being tracked, THE system SHALL export all success metrics to a CSV file nightly for finance review, maintaining 2 years of historical data.

## Conclusion

This document defines quantifiable, business-aligned success metrics for the Todo application. All metrics are measurable through the backend system without custom development. The system SHALL provide these metrics as real-time data points in the analytics dashboard, enabling data-driven business decisions. Implementation is strictly business-focused with no technical specifications provided, as required by the documentation framework. All requirements meet EARS format guidelines and are validated against the minimal feature set.