# User Flow Documentation for Reddit-like Community Platform

## User Registration Flow

```mermaid
flowchart LR
    A["User visits registration page"] --> B["User enters username, email, and password"]
    B --> C["User submits registration form"]
    C --> D{"System validates input"}
    D -->|Valid| E["System creates user account"]
    D -->|Invalid| F["System shows error message"]
    F --> B
    E --> G["User receives confirmation email"]
    G --> H["User clicks confirmation link"]
    H --> I["System activates user account"]
    I --> J["User logged in automatically"]
```

## Community Creation Flow

```mermaid
flowchart LR
    A["User navigates to create community page"] --> B["User enters community name, description, and rules"]
    B --> C["User submits community creation form"]
    C --> D{"System validates input"}
    D -->|Valid| E["System creates community"]
    D -->|Invalid| F["System shows error message"]
    F --> B
    E --> G["User becomes community moderator"]
    G --> H["User can manage community settings"]
```

## Content Posting Flow

```mermaid
flowchart LR
    A["User navigates to community page"] --> B["User clicks 'Create Post' button"]
    B --> C["User selects post type (text, link, image)"]
    C --> D["User enters title and content"]
    D --> E["User submits post"]
    E --> F{"System validates input"}
    F -->|Valid| G["System publishes post"]
    F -->|Invalid| H["System shows error message"]
    H --> D
    G --> I["User sees post in community feed"]
```

## Voting Flow

```mermaid
flowchart LR
    A["User views post or comment"] --> B["User clicks upvote or downvote button"]
    B --> C{"System checks user's vote status"}
    C -->|New Vote| D["System records vote"]
    C -->|Existing Vote| E["System updates vote"]
    D --> F["System updates vote count"]
    E --> F
    F --> G["User sees updated vote count"]
```

## Commenting Flow

```mermaid
flowchart LR
    A["User views post"] --> B["User enters comment"]
    B --> C["User submits comment"]
    C --> D{"System validates input"}
    D -->|Valid| E["System publishes comment"]
    D -->|Invalid| F["System shows error message"]
    F --> B
    E --> G["User sees comment under post"]
    G --> H["User can reply to comment"]
```

## Karma System Flow

```mermaid
flowchart LR
    A["User performs action (post, comment, vote)"] --> B{"System determines action type"}
    B -->|Post| C["System awards 10 karma points"]
    B -->|Comment| D["System awards 5 karma points"]
    B -->|Vote| E["System awards 1 karma point"]
    C --> F["System updates user's karma"]
    D --> F
    E --> F
    F --> G["User sees updated karma"]
```

## Content Sorting Flow

```mermaid
flowchart LR
    A["User views community page"] --> B["User selects sorting option (hot, new, top, controversial)"]
    B --> C{"System applies sorting algorithm"}
    C -->|Hot| D["System sorts by engagement and recency"]
    C -->|New| E["System sorts by post creation time"]
    C -->|Top| F["System sorts by vote count"]
    C -->|Controversial| G["System sorts by vote balance"]
    D --> H["User sees sorted posts"]
    E --> H
    F --> H
    G --> H
```

## Subscriptions Flow

```mermaid
flowchart LR
    A["User views community page"] --> B["User clicks 'Subscribe' button"]
    B --> C["System adds community to user's subscriptions"]
    C --> D["User sees community in subscriptions list"]
    D --> E["User can unsubscribe from community"]
```

## User Profiles Flow

```mermaid
flowchart LR
    A["User navigates to profile page"] --> B["User views profile information"]
    B --> C["User can edit profile details"]
    C --> D["User submits profile updates"]
    D --> E{"System validates input"}
    E -->|Valid| F["System updates profile"]
    E -->|Invalid| G["System shows error message"]
    G --> C
    F --> H["User sees updated profile"]
    H --> I["User views posts and comments"]
```

## Reporting Flow

```mermaid
flowchart LR
    A["User views post or comment"] --> B["User clicks 'Report' button"]
    B --> C["User selects report reason"]
    C --> D["User submits report"]
    D --> E{"System validates input"}
    E -->|Valid| F["System forwards report to moderators"]
    E -->|Invalid| G["System shows error message"]
    G --> C
    F --> H["Moderators review report"]
    H --> I["Moderators take action (remove, warn, ignore)"]
```