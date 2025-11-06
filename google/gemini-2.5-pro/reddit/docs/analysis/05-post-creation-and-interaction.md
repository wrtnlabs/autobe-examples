
# 05. Post Creation and Interaction

This document outlines the functional requirements for creating, managing, and interacting with posts. It defines the business logic that governs posts, which are the core content unit of the community platform. This document is intended for backend developers and provides explicit, testable requirements to guide implementation.

## 1. Creating Posts

Authenticated `member` role users can create posts within a specific community. The system must support three distinct types of posts: text posts, link posts, and image posts. Each post is uniquely tied to one author and one community.

### 1.1. Post Creation Flow

The following diagram illustrates the server-side validation and creation process for a new post.

```mermaid
graph TD
    A["Start: Member Submits Post Data"] --> B{Validate Request: Has Permission in Community?};
    B --> |"No (Forbidden)"| B_ERR["End: Respond with HTTP 403 Forbidden"];
    B --> |"Yes"| C{Validate Post Fields (Title, Type, etc.)};
    C --> |"Invalid (e.g., Title too long)"| C_ERR["End: Respond with HTTP 400 Bad Request"];
    C --> |"Valid"| D{Determine Post Type};
    D --> |"Text"| E_TXT["Validate Text Body"];
    D --> |"Link"| E_LNK["Validate URL Format"];
    D --> |"Image"| E_IMG["Validate Image File (Size, Type)"];
    E_TXT --> |"Invalid"| C_ERR;
    E_LNK --> |"Invalid"| C_ERR;
    E_IMG --> |"Invalid"| C_ERR;
    E_TXT --> |"Valid"| F["Create Post and Text Body Records in Database"];
    E_LNK --> |"Valid"| G["Create Post and Link URL Records in Database"];
    E_IMG --> |"Valid"| H["Upload Image to Storage & Create Post Record"];
    F --> I["Initialize Post Score (1) and Author Upvote"];
    G --> I;
    H --> I;
    I --> J["End: Respond with HTTP 201 Created & Post Data"];
```

### 1.2. Functional Requirements for Post Creation

- **PCI-1**: THE system SHALL assign a globally unique, non-sequential identifier (e.g., UUID) to every new post upon creation.
- **PCI-2**: WHEN a post is created, THE system SHALL permanently record the author's user ID and the creation timestamp.
- **PCI-3**: IF a `member` attempts to post in a community they do not have permission for (e.g., a private community they are not a member of), THEN THE system SHALL reject the request with an `HTTP 403 Forbidden` status.

#### 1.2.1. Text Posts
- **PCI-4**: WHERE the post type is "Text Post", THE system SHALL require a non-empty `title` and a `body`.

#### 1.2.2. Link Posts
- **PCI-5**: WHERE the post type is "Link Post", THE system SHALL require a non-empty `title` and a `url`.
- **PCI-6**: WHEN a link post is submitted, THE system SHALL validate that the `url` field contains a well-formed absolute URL. IF the `url` is invalid, THEN THE system SHALL reject the submission with an `HTTP 400 Bad Request` status.

#### 1.2.3. Image Posts
- **PCI-7**: WHERE the post type is "Image Post", THE system SHALL require a non-empty `title` and an uploaded image file.
- **PCI-8**: THE system SHALL only accept image files in `JPEG`, `PNG`, and `GIF` formats, and enforce a maximum file size of 20MB. IF an uploaded file violates these constraints, THEN THE system SHALL reject the submission with an `HTTP 400 Bad Request` status.

## 2. Post Content Rules

To ensure data consistency, prevent abuse, and maintain a clean user interface, the system must enforce the following content rules.

- **PCI-9**: THE system SHALL enforce a minimum character length of 1 and a maximum character length of 300 for all post titles. This ensures titles are concise and fit well in list views.
- **PCI-10**: THE system SHALL enforce a maximum character length of 40,000 characters for the `body` of a text post.
- **PCI-11**: IF a submission violates any content length rules, THEN THE system SHALL reject it with an `HTTP 400 Bad Request` status and an error message specifying the violated constraint.

## 3. Editing and Deleting Posts

Users can manage their own posts, and administrators retain override capabilities for moderation.

### 3.1. Editing Posts
- **PCI-12**: WHERE the requesting user is the author of a post, THE system SHALL allow them to edit the post's content (the `body` of a text post or the `url` of a link post).
- **PCI-13**: THE system SHALL NOT allow a user to edit the `title` of a post after creation to prevent "bait-and-switch" edits and to preserve the integrity of any potential URL slugs based on the title.
- **PCI-14**: THE system SHALL NOT allow a user to change a post's type (e.g., from a text post to a link post) after it has been created.
- **PCI-15**: WHEN a post is successfully edited, THE system SHALL update a "last edited" timestamp for the post.

### 3.2. Deleting Posts
- **PCI-16**: WHERE the user is the author of a post, THE system SHALL allow them to delete their own post.
- **PCI-17**: WHERE the user is an `admin`, THE system SHALL allow them to delete any post for moderation purposes.
- **PCI-18**: WHEN a post is deleted by its author, THE system SHALL perform a soft deletion:
    - The author's username associated with the post SHALL be replaced with `"[deleted]"`.
    - The post content (body, link, etc.) SHALL be replaced with `"[deleted]"`.
    - The post SHALL no longer appear on user profiles, community feeds, or search results.
- **PCI-19**: WHEN a post is removed by an `admin`, THE system SHALL perform a soft deletion similar to author deletion, but the content fields SHALL be replaced with `"[removed by admin]"` to distinguish it.
- **PCI-20**: WHEN a post is deleted, THE system SHALL decrement the author's karma by the total karma score the post had accumulated. This prevents users from deleting downvoted posts to hide karma loss.

## 4. Upvoting and Downvoting Posts

Authenticated members can vote on posts to signal quality and relevance. This is a core mechanic for content sorting and user karma.

- **PCI-21**: THE system SHALL allow a `member` to cast one vote (an upvote or a downvote) on any post they did not author.
- **PCI-22**: IF a user attempts to vote on their own post, THEN THE system SHALL ignore the request.
- **PCI-23**: WHEN a post is created, THE system SHALL initialize its score to 1. This represents an automatic, non-revocable upvote from the author, which SHALL NOT contribute to the author's karma score.

### 4.1. Voting Mechanics

The voting logic follows a state machine where a user can change or retract their vote.

- **PCI-24**: **No Vote -> Upvote**: WHEN a `member` who has not voted on a post casts an upvote, THE system SHALL increment the post's score by 1 and record the user's vote state as `UP`.
- **PCI-25**: **No Vote -> Downvote**: WHEN a `member` who has not voted on a post casts a downvote, THE system SHALL decrement the post's score by 1 and record the user's vote state as `DOWN`.
- **PCI-26**: **Upvote -> No Vote**: WHEN a `member` who has already upvoted a post casts an upvote again, THE system SHALL decrement the post's score by 1 and change the user's vote state to `NONE`.
- **PCI-27**: **Downvote -> No Vote**: WHEN a `member` who has already downvoted a post casts a downvote again, THE system SHALL increment the post's score by 1 and change the user's vote state to `NONE`.
- **PCI-28**: **Upvote -> Downvote**: WHEN a `member` who has already upvoted a post casts a downvote, THE system SHALL decrement the post's score by 2 and change the user's vote state to `DOWN`.
- **PCI-29**: **Downvote -> Upvote**: WHEN a `member` who has already downvoted a post casts an upvote, THE system SHALL increment the post's score by 2 and change the user's vote state to `UP`.

### 4.2. Vote Score

- **PCI-30**: THE system SHALL calculate and store a post's `score` as the total number of upvotes minus the total number of downvotes.

## 5. Post Visibility

Post visibility depends on the community's privacy settings, the post's status, and the viewing user's permissions.

- **PCI-31**: THE system SHALL make all posts in `Public` communities visible to all users, including unauthenticated guests.
- **PCI-32**: IF a community is `Restricted`, THEN an `admin` or a community moderator must approve a `member` for them to be able to see the posts.
- **PCI-33**: IF a community is `Private`, THEN only approved members of that community SHALL be able to view its posts.
- **PCI-34**: IF a post has been deleted by its author or removed by an `admin`, THEN THE system SHALL prevent it from appearing in any feed, search result, or user profile, except for a direct-link view which will show the `"[deleted]"` or `"[removed by admin]"` status.
- **PCI-35**: IF a user's account has been suspended, THEN THE system SHALL continue to display their posts and comments normally.
- **PCI-36**: IF a user's account has been permanently deleted, THEN THE system SHALL treat all their posts as if they were individually deleted by the author, replacing author and content with `"[deleted]"`.
