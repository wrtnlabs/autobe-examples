## Todo App Service Overview

This document provides the foundational overview of the Todo App service, establishing its purpose, scope, and value proposition. This is a single-user, minimalist personal productivity tool designed to help individuals track and manage their personal tasks without unnecessary complexity. The system does not support collaboration, sharing, team features, or guest access. Every todo item is strictly private and isolated to the authenticated user who created it.

### Service Overview

The Todo App exists to provide an intuitive, reliable, and distraction-free way for individuals to capture, organize, and complete personal tasks. In a world overloaded with digital clutter and feature-rich productivity apps, this application strips away all non-essential functionality to focus solely on a single, fundamental need: remembering and completing personal tasks. The goal is not to replace paper notebooks, but to offer a digital equivalent that is fast, reliable, and always available — without the distraction of notifications, sharing features, calendars, or reminders.

Users come to this application with a simple intent: to write down something they need to do, check it off when done, and move on. There is no agenda, no templates, no categories, no colors, no grouping, and no hierarchies. The system does not presume any particular workflow — it simply records what the user enters and stores it securely until the user chooses to update or delete it.

The application is designed for individual use only. No feature allows users to share, assign, comment on, or view each other’s tasks. Even if two users have identical task lists, their data is entirely separated at the system level. Authentication is required to access any data — guest access, anonymous use, and public lists are explicitly excluded.

### User Actors and Roles

The system defines two distinct user actors, each with clearly bounded responsibilities and access rights:

- **user** (Role: member) — This is the end-user. An authenticated individual who creates, reads, updates, and deletes their own todo items. The user may log in with an email and password and interact only with their own data. Every todo item is owned by and visible only to the authenticated user. The system does not allow the user to view, modify, or interact with any other user’s data. This actor has no administrative, configuration, or management privileges.

- **admin** (Role: admin) — This is a backend-only system administrator. This actor has full access to view, modify, or delete any user’s todo items and user account records. This role is accessible only to the system owner via secure backend channels — it is not exposed through any user interface, API endpoint, or front-end component. End users cannot interact with or become this actor. No feature in the application allows a normal user to escalate privileges or assume admin capabilities.

Access control is enforced at the data level. All queries from a user actor are automatically filtered by user ID. Admin access is mediated only through secure, internal tooling not available to end users. There is no role hierarchy beyond these two actors.

### Functional Scope

The Todo App contains exactly four core functional capabilities, each mechanically simple and directly tied to the lifecycle of a personal todo item:

1. **Todo Item Creation** — A user can create a new todo item by entering a text-based title.
2. **Todo Item Retrieval** — A user can view a list of all their todo items, sorted by creation time (newest first).
3. **Todo Item Update** — A user can edit the title of any of their todo items at any time.
4. **Todo Item Deletion** — A user can permanently delete any of their todo items.
5. **Todo Item Completion Tracking** — A user can toggle a todo item between incomplete and complete states. This is a binary state switch — not a task progress tracker, not a percentage, not a priority level.
6. **User Authentication** — A user can register with a unique email address and password, then log in to access their todo data. Registration requires email verification before any todo items can be created.
7. **Session Management** — Upon successful login, a user receives a short-lived access token (15 minutes) and a long-lived refresh token (30 days). The refresh token allows the user to obtain new access tokens without re-entering credentials. The user can log out, terminating both tokens immediately.

All operations are performed on a per-user basis. The system never returns data belonging to another user — even if an attacker attempts to manipulate URLs, IDs, or tokens, the backend enforces strict ownership isolation.

### Business Model

#### Why This Service Exists

Individuals need a simple, trustworthy place to store personal tasks. Paper notebooks are unreliable, lost, or forgotten. Most digital task apps are bloated — filled with timers, recurring rules, dependencies, tags, shared workspaces, reminders, and notifications that distract from the core act of remembering what to do.

This service exists to solve the problem of mental overload by removing complexity. Users need to know they can open the app, type a task, mark it done, and trust that it will be there the next time they need it — without being bombarded by features that don’t help them think clearly.

Unlike competitive tools like Todoist, Microsoft To Do, or Apple Reminders, this application does not attempt to manage life — it only helps users remember one thing at a time. It does not automate. It does not predict. It does not remind. It simply records.

There is no competing product that offers *this level of minimalism* with *this level of reliability*. By removing every non-essential feature, the application becomes the most reliable digital notepad for personal tasks.

#### Revenue Strategy

The service will be offered for free indefinitely to all individual users. There is no subscription tier, no premium feature, and no upgrade path. Revenue generation is not the primary goal — reliability, simplicity, and user retention are.

If the service grows to serve 100K+ active users, a minimal, non-intrusive donation button may be added to the profile page, allowing users to contribute voluntarily to server costs. No promotional banners, ads, or data sales will ever be implemented.

#### Growth Plan

Growth is expected to occur organically through word of mouth among individuals who value simplicity. There will be no marketing campaigns, no social media advertising, no app store optimization, and no partnerships. Growth is measured purely by user retention, not acquisition.

The system seeks users who have tried other productivity tools and found them overwhelming — users who miss the simplicity of a paper checklist. The ideal user is someone who uses the app daily, rarely edits or deletes items, and depends on it to stay grounded.

#### Success Metrics

The application's success will be measured by the following key indicators:

- **Daily Active Users (DAU)** — Target: 10,000 users logging in and viewing their todo lists daily
- **Monthly Active Users (MAU)** — Target: 50,000 users with at least one login per month
- **User Retention Rate** — Target: 70% of new users remain active after 30 days
- **Items Created per User** — Target: Average of 3-5 todo items created per user per week
- **Items Completed per User** — Target: 60% of created items are marked complete within 48 hours
- **Session Duration** — Target: Average session length of 45 seconds — indicating a quick, focused interaction
- **Error Rate** — Target: Less than 0.1% of user actions result in a recoverable error

These metrics measure not popularity, but *reliability of use*. A user who opens the app daily and completes a few tasks is more valuable than a thousand users who install it once and never return.

### Non-functional Requirements

The Todo App is designed with the following performance, security, and usability expectations:

- **Authentication Response Time** — Login and registration responses must complete within 1 second over a standard mobile network.
- **Todo List Load Time** — When a user opens their list, all items must appear within 1.5 seconds, even if they have 5,000 items.
- **Todo Item Creation Response Time** — Creating a new todo must feel instantaneous — completion within 500 milliseconds.
- **Todo Update/Delete Response Time** — Editing or deleting a todo must complete within 750 milliseconds.
- **Mobile Network Performance** — The application must function reliably on 3G networks with intermittent connectivity.
- **Offline Experience** — If the device loses connectivity, the user may still view already-loaded lists, but cannot create, update, or delete items until connectivity is restored.
- **Data Storage Security** — All todo items are stored encrypted at rest using AES-256. User passwords are never stored — only bcrypt-hashed and salted credentials.
- **Data Privacy Constraint** — No user data is ever shared with third parties, advertisers, or analytics services. All data is stored exclusively in South Korea.
- **Session Expiration Policy** — Access tokens expire after 15 minutes of inactivity. Refresh tokens expire after 30 days. Once expired, the user must re-authenticate.
- **Data Deletion** — Users may permanently delete their account and all associated data. Upon deletion, all data is irreversibly removed from all systems within 72 hours.

### Future Expansion Boundaries

The following features are explicitly excluded from the Todo App, now and forever:

- Collaboration features: sharing, assigning, commenting, or viewing other users’ todos
- Team or group functionality: multiple users on one list, shared boards, team calendars
- Recurring tasks: daily, weekly, monthly reminders
- Notifications: email, push, or SMS alerts for due items
- Labels, categories, tags, color-coding, or filtering by metadata
- Priority levels: low, medium, high — or any hierarchical ranking
- Calendar integration or syncing
- File attachments or notes within todo items
- Search functionality beyond full-text matching on the todo title
- Mobile apps: the system is web-only, accessible via any modern browser
- Biometric or social login: only email/password registration is supported
- Dark mode, themes, or UI customization

These restrictions are not temporary — they are architectural principles. The system will never become a general-purpose productivity suite. It will remain a tool for remembering what to do tomorrow — nothing more, nothing less.

### Link to Requirements

For detailed functional definitions using EARS format, please refer to the [Functional Requirements Document](./01-functional-requirements.md).

### Link to User Scenarios

To understand the complete user journey from login to item completion, see the [User Scenarios Document](./02-user-scenarios.md).

### Link to Business Rules

For validation rules, state transitions, and operational constraints, refer to the [Business Rules Document](./03-business-rules.md).

### Link to Error Handling

For user-facing error conditions and recovery behaviors, consult the [Error Handling Document](./04-error-handling.md).

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.