### Table of Contents

**communityPlatform** is a backend service with the following actors and domain entities.

**Actors**: guest, member, admin
**Entities**: User, Profile, Community, Subscription, Post, Comment, PostVote, CommentVote, Report, CommunityBan, CommunityModerator

---

**Scope**

- **User** — has one Profile, creates Communities, subscribes to Communities, creates Posts, writes Comments, casts Votes on Posts and Comments, submits Reports, may hold community-specific owner or moderator role within a Community, may be banned from a Community
- **Profile** — belongs to one User
- **Community** — created by one User as community owner, has many subscribers through Subscription, contains many Posts, has many community moderators drawn from Users, has many banned Users, has many Reports related to content in the community
- **Subscription** — links one User to one Community
- **Post** — created by one User, published in one Community, has many Comments, has many PostVotes, can be the subject of Reports
- **Comment** — written by one User, belongs to one Post, may reply to one parent Comment, may have many child Comments, has many CommentVotes, can be the subject of Reports
- **PostVote** — made by one User on one Post
- **CommentVote** — made by one User on one Comment
- **Report** — submitted by one User, targets either one Post or one Comment, reviewed by a moderator within the related Community
- **CommunityBan** — applies to one User in one Community, managed by community owner or moderators
- **CommunityModerator** — assigns one User as an owner or moderator within one Community

- **guest** (guest)
- **member** (member)
- **admin** (admin)

---

**Document Map**

| File | Role | Downstream |
|------|------|------------|
| [00-toc.md](./00-toc.md) | Project summary, scope, glossary, and assumptions | project-setup |
| [01-actors-and-auth.md](./01-actors-and-auth.md) | Actor definitions, permission matrix, authentication, session, account lifecycle | auth-middleware |
| [02-domain-model.md](./02-domain-model.md) | Business concepts, relationships, and states from user perspective | database-design |
| [03-functional-requirements.md](./03-functional-requirements.md) | What operations users can perform, use cases, business workflows | interface-design |
| [04-business-rules.md](./04-business-rules.md) | Business rules, validation constraints, data browsing expectations, error scenarios | service-layer |
| [05-non-functional.md](./05-non-functional.md) | Data ownership, privacy, retention, and recovery policies | test-infra |

**Section Navigation**

<!-- Load sections by ID: `process({ request: { type: "getAnalysisSections", sectionIds: [ID, ...] } })` -->

**[01-actors-and-auth.md](./01-actors-and-auth.md)**
- [Actor Definitions](./01-actors-and-auth.md#actor-definitions)
  - [1] [guest Actor](./01-actors-and-auth.md#guest-actor) — Define the guest actor's identity, permissions, and access boundaries. Do NOT describe specific operations (03), data isolation policies (05), or domain concepts (02).
  - [2] [member Actor](./01-actors-and-auth.md#member-actor) — Define the member actor's identity, permissions, and access boundaries. Do NOT describe specific operations (03), data isolation policies (05), or domain concepts (02).
  - [3] [admin Actor](./01-actors-and-auth.md#admin-actor) — Define the admin actor's identity, permissions, and access boundaries. Do NOT describe specific operations (03), data isolation policies (05), or domain concepts (02).
- [Authentication Flows](./01-actors-and-auth.md#authentication-flows)
  - [4] [Registration and Login](./01-actors-and-auth.md#registration-and-login) — Define user registration and login flows including validation and error handling.
  - [5] [Session and Logout](./01-actors-and-auth.md#session-and-logout) — Define session behavior and logout from a user perspective.
- [Account Lifecycle](./01-actors-and-auth.md#account-lifecycle)
  - [6] [Account Management](./01-actors-and-auth.md#account-management) — Define how users create accounts, delete accounts, and change passwords.

**[02-domain-model.md](./02-domain-model.md)**
- [Domain Concepts](./02-domain-model.md#domain-concepts)
  - [7] [User Concept](./02-domain-model.md#user-concept) — Describe what User represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [8] [Profile Concept](./02-domain-model.md#profile-concept) — Describe what Profile represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [9] [Community Concept](./02-domain-model.md#community-concept) — Describe what Community represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [10] [Subscription Concept](./02-domain-model.md#subscription-concept) — Describe what Subscription represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [11] [Post Concept](./02-domain-model.md#post-concept) — Describe what Post represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [12] [Comment Concept](./02-domain-model.md#comment-concept) — Describe what Comment represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [13] [PostVote Concept](./02-domain-model.md#postvote-concept) — Describe what PostVote represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [14] [CommentVote Concept](./02-domain-model.md#commentvote-concept) — Describe what CommentVote represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [15] [Report Concept](./02-domain-model.md#report-concept) — Describe what Report represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [16] [CommunityBan Concept](./02-domain-model.md#communityban-concept) — Describe what CommunityBan represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [17] [CommunityModerator Concept](./02-domain-model.md#communitymoderator-concept) — Describe what CommunityModerator represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
- [Domain Relationships](./02-domain-model.md#domain-relationships)
  - [18] [Conceptual Relationships](./02-domain-model.md#conceptual-relationships) — Describe how concepts relate to each other in business terms.
  - [19] [Lifecycle and Retention](./02-domain-model.md#lifecycle-and-retention) — Describe concept lifecycle states and transitions only. Detailed retention/recovery policies belong in 05-non-functional. Operation details belong in 03-functional-requirements.
- [Business Categories and State Flows](./02-domain-model.md#business-categories-and-state-flows)
  - [20] [Business Category Definitions](./02-domain-model.md#business-category-definitions) — Define all business category classifications with their allowed values and descriptions.
  - [21] [State Transitions](./02-domain-model.md#state-transitions) — Define valid state transition paths for stateful concepts.

**[03-functional-requirements.md](./03-functional-requirements.md)**
- [Core Business Operations](./03-functional-requirements.md#core-business-operations)
  - [22] [User Operations](./03-functional-requirements.md#user-operations) — Define business operations for User: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [23] [Profile Operations](./03-functional-requirements.md#profile-operations) — Define business operations for Profile: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [24] [Community Operations](./03-functional-requirements.md#community-operations) — Define business operations for Community: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [25] [Subscription Operations](./03-functional-requirements.md#subscription-operations) — Define business operations for Subscription: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [26] [Post Operations](./03-functional-requirements.md#post-operations) — Define business operations for Post: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [27] [Comment Operations](./03-functional-requirements.md#comment-operations) — Define business operations for Comment: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [28] [PostVote Operations](./03-functional-requirements.md#postvote-operations) — Define business operations for PostVote: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [29] [CommentVote Operations](./03-functional-requirements.md#commentvote-operations) — Define business operations for CommentVote: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [30] [Report Operations](./03-functional-requirements.md#report-operations) — Define business operations for Report: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [31] [CommunityBan Operations](./03-functional-requirements.md#communityban-operations) — Define business operations for CommunityBan: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [32] [CommunityModerator Operations](./03-functional-requirements.md#communitymoderator-operations) — Define business operations for CommunityModerator: what create, read, update, delete, and list operations must accomplish from a business perspective.
- [Error Scenarios and Edge Cases](./03-functional-requirements.md#error-scenarios-and-edge-cases)
  - [33] [User Error Scenarios](./03-functional-requirements.md#user-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all User operations.
  - [34] [Profile Error Scenarios](./03-functional-requirements.md#profile-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Profile operations.
  - [35] [Community Error Scenarios](./03-functional-requirements.md#community-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Community operations.
  - [36] [Subscription Error Scenarios](./03-functional-requirements.md#subscription-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Subscription operations.
  - [37] [Post Error Scenarios](./03-functional-requirements.md#post-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Post operations.
  - [38] [Comment Error Scenarios](./03-functional-requirements.md#comment-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Comment operations.
  - [39] [PostVote Error Scenarios](./03-functional-requirements.md#postvote-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all PostVote operations.
  - [40] [CommentVote Error Scenarios](./03-functional-requirements.md#commentvote-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all CommentVote operations.
  - [41] [Report Error Scenarios](./03-functional-requirements.md#report-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Report operations.
  - [42] [CommunityBan Error Scenarios](./03-functional-requirements.md#communityban-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all CommunityBan operations.
  - [43] [CommunityModerator Error Scenarios](./03-functional-requirements.md#communitymoderator-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all CommunityModerator operations.
- [End-to-End User Scenarios](./03-functional-requirements.md#end-to-end-user-scenarios)
  - [44] [Cross-Domain User Scenarios](./03-functional-requirements.md#cross-domain-user-scenarios) — Define end-to-end user scenarios that span multiple concepts, describing complete user journeys from start to finish.
- [File Storage](./03-functional-requirements.md#file-storage)
  - [45] [File Upload and Management](./03-functional-requirements.md#file-upload-and-management) — Define file upload capabilities, supported formats, processing requirements, and access control for stored files.

**[04-business-rules.md](./04-business-rules.md)**
- [Domain Business Rules](./04-business-rules.md#domain-business-rules)
  - [46] [User Rules](./04-business-rules.md#user-rules) — Define validation rules and domain constraints for User. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [47] [Profile Rules](./04-business-rules.md#profile-rules) — Define validation rules and domain constraints for Profile. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [48] [Community Rules](./04-business-rules.md#community-rules) — Define validation rules and domain constraints for Community. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [49] [Subscription Rules](./04-business-rules.md#subscription-rules) — Define validation rules and domain constraints for Subscription. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [50] [Post Rules](./04-business-rules.md#post-rules) — Define validation rules and domain constraints for Post. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [51] [Comment Rules](./04-business-rules.md#comment-rules) — Define validation rules and domain constraints for Comment. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [52] [PostVote Rules](./04-business-rules.md#postvote-rules) — Define validation rules and domain constraints for PostVote. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [53] [CommentVote Rules](./04-business-rules.md#commentvote-rules) — Define validation rules and domain constraints for CommentVote. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [54] [Report Rules](./04-business-rules.md#report-rules) — Define validation rules and domain constraints for Report. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [55] [CommunityBan Rules](./04-business-rules.md#communityban-rules) — Define validation rules and domain constraints for CommunityBan. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [56] [CommunityModerator Rules](./04-business-rules.md#communitymoderator-rules) — Define validation rules and domain constraints for CommunityModerator. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
- [Data Browsing Expectations](./04-business-rules.md#data-browsing-expectations)
  - [57] [List Browsing Expectations](./04-business-rules.md#list-browsing-expectations) — Define business expectations for how users find, filter, and browse lists.
- [Error Conditions](./04-business-rules.md#error-conditions)
  - [58] [Error Scenarios](./04-business-rules.md#error-scenarios) — Describe error conditions and expected system responses in natural language.
- [File Validation Rules](./04-business-rules.md#file-validation-rules)
  - [59] [File Validation and Policies](./04-business-rules.md#file-validation-and-policies) — Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.

**[05-non-functional.md](./05-non-functional.md)**
- [Data Policies](./05-non-functional.md#data-policies)
  - [60] [Data Ownership and Privacy](./05-non-functional.md#data-ownership-and-privacy) — Define who owns what data, who can access it, and privacy boundaries between users.
  - [61] [Data Retention and Recovery](./05-non-functional.md#data-retention-and-recovery) — Define what happens to deleted data, how long it is retained, and how users can recover it.
- [Storage Capacity](./05-non-functional.md#storage-capacity)
  - [62] [Storage Capacity Requirements](./05-non-functional.md#storage-capacity-requirements) — Define storage requirements and capacity planning for file storage.

---

**Canonical Sources**

Each type of information has one authoritative location. Other files should reference these canonical sources.

| Information Type | Canonical File |
|------------------|---------------|
| Domain concepts | [02-domain-model.md](./02-domain-model.md) |
| Error conditions | [04-business-rules.md](./04-business-rules.md) |
| Permissions | [01-actors-and-auth.md](./01-actors-and-auth.md) |
| Actor definitions | [01-actors-and-auth.md](./01-actors-and-auth.md) |
| Filtering/pagination rules | [04-business-rules.md](./04-business-rules.md) |
| Data retention/recovery | [05-non-functional.md](./05-non-functional.md) |

---

**Glossary**

- **User** — has one Profile, creates Communities, subscribes to Communities, creates Posts, writes Comments, casts Votes on Posts and Comments, submits Reports, may hold community-specific owner or moderator role within a Community, may be banned from a Community
- **Profile** — belongs to one User
- **Community** — created by one User as community owner, has many subscribers through Subscription, contains many Posts, has many community moderators drawn from Users, has many banned Users, has many Reports related to content in the community
- **Subscription** — links one User to one Community
- **Post** — created by one User, published in one Community, has many Comments, has many PostVotes, can be the subject of Reports
- **Comment** — written by one User, belongs to one Post, may reply to one parent Comment, may have many child Comments, has many CommentVotes, can be the subject of Reports
- **PostVote** — made by one User on one Post
- **CommentVote** — made by one User on one Comment
- **Report** — submitted by one User, targets either one Post or one Comment, reviewed by a moderator within the related Community
- **CommunityBan** — applies to one User in one Community, managed by community owner or moderators
- **CommunityModerator** — assigns one User as an owner or moderator within one Community

---

**Constraints**

- File scope: Project summary, scope, glossary, and assumptions
- Downstream phase: project-setup
- File scope: Actor definitions, permission matrix, authentication, session, account lifecycle
- Downstream phase: auth-middleware
- File scope: Business concepts, relationships, and states from user perspective
- Downstream phase: database-design
- File scope: What operations users can perform, use cases, business workflows
- Downstream phase: interface-design
- File scope: Business rules, validation constraints, data browsing expectations, error scenarios
- Downstream phase: service-layer
- File scope: Data ownership, privacy, retention, and recovery policies
- Downstream phase: test-infra

**Active Features**

- file-storage