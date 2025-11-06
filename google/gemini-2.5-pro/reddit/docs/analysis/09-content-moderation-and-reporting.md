# 09. Content Moderation and Reporting

## 1. Introduction

This document outlines the business and functional requirements for the content moderation and reporting system of the community platform. Its purpose is to ensure a safe and positive environment for all users by providing robust mechanisms to report harmful or inappropriate content and empowering administrators to effectively manage these reports. The system is designed to be transparent and fair, providing feedback to both reporters and content creators when action is taken. 

The requirements defined herein are based on the user roles specified in the [User Actors and Permissions](./02-user-actors-and-permissions.md) document and serve as the definitive guide for backend implementation.

## 2. Reporting Posts and Comments

This section details the functionality enabling `members` to report content they believe violates the platform's rules. This is the first line of defense in community-driven moderation.

### 2.1. Functional Requirements

-   **EARS-MOD-01**: WHEN a `member` views a post or a comment, **THE** system **SHALL** provide a user interface option to report the content.
-   **EARS-MOD-02**: **IF** a user who is not an authenticated `member` (i.e., a `guest`) attempts to report content, **THEN THE** system **SHALL** prevent the action and prompt them to log in.
-   **EARS-MOD-03**: WHEN a `member` initiates a report, **THE** system **SHALL** present a form containing a mandatory list of predefined reasons for the report.
-   **EARS-MOD-04**: **THE** report reason list **SHALL** consist of the following options: `Spam`, `Harassment`, `Hate Speech`, `Misinformation`, `Violates Community Rules`, and `Other`.
-   **EARS-MOD-05**: **IF** the reporting `member` selects the `Other` reason, **THEN THE** system **SHALL** require them to provide a custom text description of the violation, with a minimum length of 10 characters and a maximum length of 500 characters.
-   **EARS-MOD-06**: **WHEN** a report is submitted, **THE** system **SHALL** create a unique, immutable report record containing the reporter's ID, the ID of the reported content, the content's author ID, the selected reason, the custom description (if any), a `Pending` status, and a submission timestamp.
-   **EARS-MOD-07**: **THE** system **SHALL** prevent a `member` from submitting more than one report for the same piece of content.
-   **EARS-MOD-08**: **IF** a `member` attempts to report content that has already been deleted or removed, **THEN THE** system **SHALL** return an error message indicating the content is no longer available for reporting.

### 2.2. Reporting Workflow

The following diagram illustrates the user's workflow when reporting a piece of content.

```mermaid
graph LR
  A['Member views a post or comment'] --> B{"Finds content to be inappropriate"};
  B -->|'Yes'| C['Selects "Report" option'];
  C --> D['Presented with a mandatory list of report reasons'];
  D --> E{"Selects 'Other'?"};
  E -->|'Yes'| F['Enters custom reason (max 500 chars)'];
  F --> G['Submits Report'];
  E -->|'No'| H['Selects a predefined reason'];
  H --> G;
  G --> I['System validates and creates report record'];
  I --> J['Report added to Admin Moderation Queue'];
  G --> K['Display confirmation: "Report Submitted"'];
```

## 3. Moderation Queue for Admins

This section describes the centralized interface for administrators to manage and review all reported content. This is the command center for platform safety.

### 3.1. Functional Requirements

-   **EARS-MOD-09**: **THE** system **SHALL** provide a moderation queue interface accessible only to users with the `admin` role.
-   **EARS-MOD-10**: **THE** moderation queue **SHALL** display a list of all content items that have one or more reports with a `Pending` status.
-   **EARS-MOD-11**: **WHERE** an item has multiple reports, **THE** system **SHALL** group them under a single entry and display the total number of reports.
-   **EARS-MOD-12**: **THE** moderation queue listing **SHALL** display a summary for each reported item, including:
    *   A preview snippet of the reported content.
    *   A direct link to the content in its original context.
    *   The username of the content's author and a link to their profile.
    *   The total count of pending reports for the item.
    *   The date and time of the first report.
-   **EARS-MOD-13**: **THE** system **SHALL** allow an `admin` to sort and filter the moderation queue by the following criteria: report date (newest/oldest) and number of reports (highest/lowest).

## 4. Review Process for Reported Content

This section details the workflow for an administrator reviewing a specific report to make an informed decision.

### 4.1. Functional Requirements

-   **EARS-MOD-14**: WHEN an `admin` selects an item from the moderation queue, **THE** system **SHALL** display a detailed review screen.
-   **EARS-MOD-15**: **THE** review screen **SHALL** present the following information:
    *   The full content of the reported post or comment.
    *   The author's username, their total karma, and account age.
    *   A chronological list of all associated reports, including the username of each reporter, the reason they cited, any custom text, and the timestamp.
-   **EARS-MOD-16**: **THE** system **SHALL** provide the `admin` with a clear set of actions for each reported item: `Dismiss Reports`, `Remove Content`, and `Ban Author`.

### 4.2. Review Workflow

The diagram below outlines the decision-making process for an administrator.

```mermaid
graph LR
    A['Admin selects a reported item'] --> B['System displays detailed review screen'];
    B --> C{"Admin reviews content and all report reasons"};
    C --> D{"Does the content violate rules?"};
    D -->|'No'| E['Admin chooses "Dismiss Reports"'];
    E --> F['All related reports' status changed to "Dismissed"'];
    F --> G['Content remains visible, no action on author'];
    D -->|'Yes'| H['Admin chooses an enforcement action'];
    H --> I{"Select action type"};
    I -->|'Remove Content'| J['Content is soft-deleted, status becomes "Removed"'];
    I -->|'Ban Author'| L['Author's account is suspended'];
    J --> M['All related reports' status changed to "Action Taken"'];
    L --> M;
    M --> N['Notifications are dispatched to involved users'];
```

## 5. Actions on Inappropriate Content

This section defines the specific outcomes of the enforcement actions an administrator can take on reported content.

### 5.1. Functional Requirements

-   **EARS-MOD-17**: **IF** an `admin` chooses the `Dismiss Reports` action, **THEN THE** system **SHALL** update the status of all pending reports for that content to `Resolved-Dismissed` and take no action against the content or its author.
-   **EARS-MOD-18**: **IF** an `admin` chooses the `Remove Content` action, **THEN THE** system **SHALL** soft-delete the targeted post or comment, making it invisible to all non-admin users. The content must be retained in the database for archival purposes, marked with a `Removed` status.
-   **EARS-MOD-19**: **IF** an `admin` opts to `Ban Author`, **THEN THE** system **SHALL** present the admin with ban duration options.
-   **EARS-MOD-20**: The ban duration options **SHALL** include: `1 Day`, `3 Days`, `7 Days`, `30 Days`, and `Permanent`.
-   **EARS-MOD-21**: **WHILE** a user is banned, **THE** system **SHALL** prevent them from performing any write actions, including creating posts, commenting, voting, or creating communities.
-   **EARS-MOD-22**: **WHEN** an `admin` applies a sanction (removal or ban), **THE** system **SHALL** log an immutable moderation event record containing the `admin`'s ID, the action taken, the target user ID, the related content ID, and a timestamp.

## 6. User Notification on Report Status

This section specifies the automated communication that users receive throughout the moderation process to ensure transparency.

### 6.1. Functional Requirements

-   **EARS-MOD-23**: **WHEN** an `admin` resolves a report (either by dismissal or enforcement), **THE** system **SHALL** send a notification to the `member`(s) who originally reported the content.
-   **EARS-MOD-24**: The notification sent to a reporter **SHALL** confirm that their report has been reviewed and that action has been taken, but it **SHALL NOT** reveal the specific action taken (e.g., whether it was a removal or a ban) to protect privacy.
-   **EARS-MOD-25**: **WHEN** a `member`'s content is removed as a result of a report, **THE** system **SHALL** send them a notification that clearly states which content was removed and which platform rule it violated.
-   **EARS-MOD-26**: **WHEN** a `member` receives a ban, **THE** system **SHALL** send them a notification detailing the reason for the ban and its specific duration.

## 7. Consolidated Business Rules

| Category | Rule | Specification |
|---|---|---|
| **Reporting** | Reportable Roles | `member` only. `guest` cannot report. |
| | Report Reasons | `Spam`, `Harassment`, `Hate Speech`, `Misinformation`, `Violates Community Rules`, `Other`. |
| | Custom Reason Length | Min: 10 chars, Max: 500 chars. |
| | Report Statuses | `Pending`, `Resolved-ActionTaken`, `Resolved-Dismissed`. |
| **Moderation** | Moderator Role | `admin` only. |
| | Admin Actions | `Dismiss Reports`, `Remove Content`, `Ban Author`. |
| | Ban Durations | `1 Day`, `3 Days`, `7 Days`, `30 Days`, `Permanent`. |
| **Content** | Removed Content | Becomes invisible to non-admins; soft-deleted in database. |
| **Notifications**| Reporter Privacy | Specific enforcement action is not disclosed to reporters. |
|